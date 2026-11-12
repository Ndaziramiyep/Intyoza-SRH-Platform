"""Questions the AI could not answer -> a private Google Sheet the health team reviews.

    import review_queue; review_queue.install()      # done by public_service.start() and server.py

Off unless both are set (Kaggle secrets or environment):
    INTYOZA_REVIEW_SHEET_ID   the ID of a PRIVATE Google Sheet (never the link-shared dataset)
    GOOGLE_SERVICE_ACCOUNT    the service account's JSON key; share the sheet with its e-mail as Editor

Safety rules (applied before anything leaves the service):
  - personal details are removed: names, phone numbers, e-mails, links, @handles, long numbers, names of people
    and places; no user id, chat id or time is stored, only the date
  - crisis messages (self-harm, abuse, rape, emergencies) are never written: only counted per day
  - the same question asked again adds to "Times asked" instead of a new row
  - rows not asked again for KEEP_DAYS days are deleted
The sheet gets two tabs by itself: "Unanswered" (for review) and "Counts" (per day: added, crisis not saved).
"""
import json
import os
import re
import threading
import time

SHEET_ENV, CRED_ENV = "INTYOZA_REVIEW_SHEET_ID", "GOOGLE_SERVICE_ACCOUNT"
TAB, COUNTS = "Unanswered", "Counts"
HEADER = ["Key", "First asked", "Last asked", "Times asked", "Language", "Question (personal details removed)",
          "Reviewer action", "Question ID", "Reviewer notes"]
ACTIONS = ["Add as new question", "Add as another way of asking", "Already answered", "Ignore"]
COUNT_HEADER = ["Date", "Questions added", "Crisis messages (not saved)"]
KEEP_DAYS = 90
FLUSH_SECONDS = 120
API = "https://sheets.googleapis.com/v4/spreadsheets"

# ------------------------------------------------------------------ removing personal details
_KEEP_CAPS = {"intyoza", "isange", "rbc", "hiv", "sida", "aids", "prep", "pep", "iud", "sti", "stis", "rwanda",
              "imana", "god", "yesu", "jesus", "mutuelle", "covid", "i", "ok", "who", "unfpa", "moh"}
_RULES = [
    (re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+"), "[email]"),
    (re.compile(r"(https?://|www\.)\S+", re.I), "[link]"),
    (re.compile(r"(?<!\w)@\w+"), "[handle]"),
    (re.compile(r"\+?\d[\d\s().-]{6,}\d"), "[number]"),              # phone, ID and account numbers
    (re.compile(r"\b\d{5,}\b"), "[number]"),
    (re.compile(r"\b(nitwa|niitwa|izina ryanjye ni|my name is|call me)\s+[^\W\d_][\w'-]*", re.I), r"\1 [name]"),
    (re.compile(r"\b((?i:ndi|i am|i'm|im)\s+)[A-Z][\w'-]+"), r"\1[name]"),
]


def clean(text, limit=300):
    """The question without personal details (see the rules above)."""
    t = " ".join(str(text or "").split())
    for rx, rep in _RULES:
        t = rx.sub(rep, t)
    words = t.split(" ")
    for i, w in enumerate(words):                 # capitalised words inside a sentence: names of people or places
        core = re.sub(r"[^\w'-]", "", w)
        start = i == 0 or words[i - 1].endswith((".", "!", "?", ":"))
        if (core and core[0].isupper() and not start and core.lower() not in _KEEP_CAPS
                and not (core.isupper() and len(core) <= 6)):
            words[i] = w.replace(core, "[name]")
    t = " ".join(words)
    t = re.sub(r"(\[name\]\s*){2,}", "[name] ", t).strip()
    return t[:limit]


def key_of(text):
    return re.sub(r"\s+", " ", re.sub(r"[^\w\[\] ]", " ", text.lower())).strip()


def is_crisis(text):
    """Self-harm, abuse, rape or an emergency: never stored, only counted."""
    try:
        from chatbot import DANGER
        from intyoza_core import BACKSTOP, normalize
        norm = normalize(text)
        return bool(DANGER.search(norm)) or any(k in norm for k in BACKSTOP)
    except Exception:
        return bool(re.search(r"kwiyahur|ku ngufu|gufat\w* ku ngufu|kubit|rape|suicide|kill|abuse", str(text).lower()))


def today():
    return time.strftime("%Y-%m-%d", time.gmtime(time.time() + 2 * 3600))     # Rwanda date (UTC+2)


# ------------------------------------------------------------------ the queue
class ReviewQueue:
    def __init__(self, sheet_id, credentials_json, session=None):
        self.sheet_id = sheet_id
        self.info = json.loads(credentials_json) if isinstance(credentials_json, str) else credentials_json
        self.http = session
        self.lock = threading.Lock()
        self.pending, self.crisis = {}, {}
        self.ready, self.error, self.sent = False, None, 0
        self._creds = None

    # what the chatbot calls (fast: only memory; the sheet is written in the background)
    def add(self, text, lang="rw"):
        if not str(text or "").strip():
            return
        day = today()
        with self.lock:
            if is_crisis(text):
                self.crisis[day] = self.crisis.get(day, 0) + 1
                return
            q = clean(text)
            k = key_of(q)
            if not k:
                return
            row = self.pending.setdefault(k, {"first": day, "last": day, "count": 0, "lang": lang, "text": q})
            row["last"], row["count"] = day, row["count"] + 1

    def status(self):
        return {"enabled": True, "ready": self.ready, "waiting": len(self.pending), "sent": self.sent,
                "error": self.error}

    # ---- Google Sheets
    def _session(self):
        if self.http is None:
            import requests
            self.http = requests.Session()
        return self.http

    def _token(self):
        from google.auth.transport.requests import Request
        from google.oauth2 import service_account
        if self._creds is None:
            self._creds = service_account.Credentials.from_service_account_info(
                self.info, scopes=["https://www.googleapis.com/auth/spreadsheets"])
        if not self._creds.valid:
            self._creds.refresh(Request())
        return self._creds.token

    def _call(self, method, path, **kw):
        r = self._session().request(method, f"{API}/{self.sheet_id}{path}",
                                    headers={"Authorization": f"Bearer {self._token()}"}, timeout=60, **kw)
        if r.status_code >= 400:
            raise RuntimeError(f"Google Sheets {r.status_code}: {r.text[:200]}")
        return r.json() if r.text else {}

    def _get(self, rng):
        return self._call("GET", f"/values/{rng}").get("values", [])

    def _prepare(self):
        """Creates the two tabs, headers, the Reviewer action list, and hides the Key column (once)."""
        meta = self._call("GET", "", params={"fields": "sheets.properties"})
        tabs = {s["properties"]["title"]: s["properties"]["sheetId"] for s in meta.get("sheets", [])}
        new = [t for t in (TAB, COUNTS) if t not in tabs]
        if new:
            out = self._call("POST", ":batchUpdate", json={"requests": [{"addSheet": {"properties": {"title": t}}}
                                                                        for t in new]})
            for rep in out.get("replies", []):
                p = rep["addSheet"]["properties"]
                tabs[p["title"]] = p["sheetId"]
        self.tab_id = tabs[TAB]
        if not self._get(f"{TAB}!A1:I1"):
            self._call("PUT", f"/values/{TAB}!A1:I1", params={"valueInputOption": "RAW"}, json={"values": [HEADER]})
            self._call("POST", ":batchUpdate", json={"requests": [
                {"setDataValidation": {"range": {"sheetId": self.tab_id, "startRowIndex": 1, "startColumnIndex": 6,
                                                 "endColumnIndex": 7},
                                       "rule": {"condition": {"type": "ONE_OF_LIST",
                                                              "values": [{"userEnteredValue": a} for a in ACTIONS]},
                                                "showCustomUi": True, "strict": True}}},
                {"updateDimensionProperties": {"range": {"sheetId": self.tab_id, "dimension": "COLUMNS",
                                                         "startIndex": 0, "endIndex": 1},
                                               "properties": {"hiddenByUser": True}, "fields": "hiddenByUser"}},
                {"updateSheetProperties": {"properties": {"sheetId": self.tab_id,
                                                          "gridProperties": {"frozenRowCount": 1}},
                                           "fields": "gridProperties.frozenRowCount"}}]})
        if not self._get(f"{COUNTS}!A1:C1"):
            self._call("PUT", f"/values/{COUNTS}!A1:C1", params={"valueInputOption": "RAW"},
                       json={"values": [COUNT_HEADER]})
        self.ready = True

    def flush(self):
        """Writes what is waiting to the sheet. On failure everything stays waiting for the next try."""
        with self.lock:
            pending, crisis = dict(self.pending), dict(self.crisis)
        if not pending and not crisis:
            return 0
        try:
            if not self.ready:
                self._prepare()
            rows = self._get(f"{TAB}!A2:J")
            fixed = []
            for i, r in enumerate(rows):   # a row shifted one column right by the first version: move it back
                if r and not r[0] and len(r) > 1 and r[1] and not re.match(r"\d{4}-\d\d-\d\d$", r[1]):
                    rows[i] = r[1:] + [""]
                    fixed.append({"range": f"{TAB}!A{i + 2}:J{i + 2}", "values": [(r[1:] + [""] * 10)[:10]]})
            if fixed:
                self._call("POST", "/values:batchUpdate", json={"valueInputOption": "RAW", "data": fixed})
            rows = [r[:9] for r in rows]
            where = {r[0]: i + 2 for i, r in enumerate(rows) if r}
            updates, append, added = [], [], {}
            for k, p in pending.items():
                if k in where:
                    old = rows[where[k] - 2]
                    count = int(old[3]) if len(old) > 3 and str(old[3]).isdigit() else 0
                    updates.append({"range": f"{TAB}!C{where[k]}:D{where[k]}", "values": [[p["last"], count + p["count"]]]})
                else:
                    append.append([k, p["first"], p["last"], p["count"], p["lang"], p["text"], "", "", ""])
                    added[p["first"]] = added.get(p["first"], 0) + 1
            if updates:
                self._call("POST", "/values:batchUpdate", json={"valueInputOption": "RAW", "data": updates})
            if append:                     # written at an exact position (append can shift the columns)
                first = len(rows) + 2
                self._call("PUT", f"/values/{TAB}!A{first}:I{first + len(append) - 1}",
                           params={"valueInputOption": "RAW"}, json={"values": append})
            self._count(added, crisis)
            self._expire(rows)
            with self.lock:
                for k, p in pending.items():
                    cur = self.pending.get(k)
                    if cur and cur["count"] == p["count"]:
                        del self.pending[k]
                    elif cur:
                        cur["count"] -= p["count"]
                for d, n in crisis.items():
                    self.crisis[d] = self.crisis.get(d, 0) - n
                    if self.crisis[d] <= 0:
                        del self.crisis[d]
            self.sent += len(pending)
            self.error = None
            return len(pending)
        except Exception as e:
            self.error = f"{type(e).__name__}: {str(e)[:200]}"
            return 0

    def _count(self, added, crisis):
        days = sorted(set(added) | set(crisis))
        if not days:
            return
        rows = self._get(f"{COUNTS}!A2:C")
        where = {r[0]: i + 2 for i, r in enumerate(rows) if r}
        updates, append = [], []
        for d in days:
            if d in where:
                old = rows[where[d] - 2] + ["0", "0", "0"]
                a = int(old[1] or 0) + added.get(d, 0)
                c = int(old[2] or 0) + crisis.get(d, 0)
                updates.append({"range": f"{COUNTS}!B{where[d]}:C{where[d]}", "values": [[a, c]]})
            else:
                append.append([d, added.get(d, 0), crisis.get(d, 0)])
        if updates:
            self._call("POST", "/values:batchUpdate", json={"valueInputOption": "RAW", "data": updates})
        if append:
            first = len(rows) + 2
            self._call("PUT", f"/values/{COUNTS}!A{first}:C{first + len(append) - 1}",
                       params={"valueInputOption": "RAW"}, json={"values": append})

    def _expire(self, rows):
        """Deletes rows not asked again for KEEP_DAYS days."""
        limit = time.strftime("%Y-%m-%d", time.gmtime(time.time() + 2 * 3600 - KEEP_DAYS * 86400))
        old = [i + 1 for i, r in enumerate(rows) if len(r) > 2 and r[2] and r[2] < limit]
        if old:
            self._call("POST", ":batchUpdate", json={"requests": [
                {"deleteDimension": {"range": {"sheetId": self.tab_id, "dimension": "ROWS",
                                               "startIndex": i, "endIndex": i + 1}}} for i in sorted(old, reverse=True)]})


# ------------------------------------------------------------------ wiring
QUEUE = None


def status():
    return QUEUE.status() if QUEUE else {"enabled": False}


def install(verbose=True):
    """Starts sending unanswered questions to the review sheet, if it is configured. Safe to call twice."""
    global QUEUE
    if QUEUE is not None:
        return QUEUE
    sheet, cred = os.environ.get(SHEET_ENV, "").strip(), os.environ.get(CRED_ENV, "").strip()
    if not sheet or not cred:
        if verbose:
            print("Review sheet: off (set INTYOZA_REVIEW_SHEET_ID and GOOGLE_SERVICE_ACCOUNT to turn it on)")
        return None
    try:
        QUEUE = ReviewQueue(sheet, cred)
    except Exception as e:
        print("Review sheet: off, the service account key could not be read:", type(e).__name__)
        return None
    import intyoza_core
    intyoza_core.UNANSWERED_HOOKS.append(lambda row: QUEUE.add(row.get("text", ""), row.get("lang", "rw")))

    def loop():
        while True:
            time.sleep(FLUSH_SECONDS)
            QUEUE.flush()
    threading.Thread(target=loop, daemon=True).start()
    if verbose:
        print(f"Review sheet: on (unanswered questions are added every {FLUSH_SECONDS // 60} minutes, "
              "without personal details; crisis messages are only counted)")
    return QUEUE
