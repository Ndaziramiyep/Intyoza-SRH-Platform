"""Intyoza data preprocessing.

1. normalize(text): the same cleaning for training data and for every message in chat
   (unicode, apostrophes, case, spaces, repeated letters, common texting and spelling variants).
2. clean_examples(examples): checks and cleans the training phrasings
   (empty, too short, duplicates, conflicting labels, test phrasings leaking into training).
3. clean_pages(pages): cleans PDF text before it is split into passages
   (headers, footers, page numbers, tables of contents, reference lists, broken lines).
"""
import collections
import re
import unicodedata

# Texting shortcuts and common spelling variants -> one standard form (whole words only)
VARIANTS = {
    # English texting
    "u": "you", "ur": "your", "r": "are", "pls": "please", "plz": "please", "pliz": "please", "bf": "boyfriend",
    "gf": "girlfriend", "preg": "pregnant", "prego": "pregnant", "dnt": "dont", "cnt": "cant", "wat": "what",
    "wht": "what", "hw": "how", "abt": "about", "coz": "because", "cuz": "because", "bcoz": "because",
    "im": "i am", "ive": "i have", "idk": "i dont know", "thx": "thanks", "tnx": "thanks",
    # Kinyarwanda spelling variants
    "ntago": "ntabwo", "ntibyo": "ntabwo ari byo", "nge": "njye", "ngewe": "njyewe", "jye": "njye",
    "kondomu": "agakingirizo", "kondom": "agakingirizo", "kotegisi": "cotex", "kotex": "cotex",
    # question words written as one word ("kwikinisha niki" -> "kwikinisha ni iki")
    "niki": "ni iki", "nik": "ni iki", "nibiki": "ni ibiki", "nibihe": "ni ibihe", "nizihe": "ni izihe",
    "niyihe": "ni iyihe", "nubuhe": "ni ubuhe", "nukuhe": "ni ukuhe",
}
_WORD = re.compile(r"[a-z0-9']+|[^a-z0-9'\s]")


def normalize(text):
    """Standard form of a message. Used the same way in training and in chat."""
    if not text:
        return ""
    t = unicodedata.normalize("NFKC", str(text))
    t = t.replace("’", "'").replace("‘", "'").replace("`", "'").replace("´", "'")
    t = t.lower()
    t = re.sub(r"(https?://\S+|www\.\S+)", " ", t)                    # links
    t = re.sub(r"([a-z])\1{2,}", r"\1\1", t)                           # "pleaseeee" -> "pleasee"
    t = re.sub(r"([!?.,])\1+", r"\1", t)                                # "??" -> "?"
    words = [VARIANTS.get(w, w) for w in _WORD.findall(t)]
    t = " ".join(words)
    t = re.sub(r"\s+([?.!,])", r"\1", t)
    return re.sub(r"\s+", " ", t).strip()


def clean_examples(examples, verbose=True):
    """Normalise and check the training phrasings. Returns the cleaned list and a report."""
    report = collections.Counter()
    seen = {}
    out = []
    for e in examples:
        e = dict(e)
        e["raw"] = e["text"]
        e["text"] = normalize(e["text"])
        if len([c for c in e["text"] if c.isalpha()]) < 2:
            report["removed: empty or too short"] += 1
            continue
        key = e["text"]
        label = (e.get("qa_id"), e.get("intent"))
        if key in seen:
            first = seen[key]
            if (first.get("qa_id"), first.get("intent")) != label:
                report["conflict: same text, different labels (kept first)"] += 1
                if verbose and report["conflict: same text, different labels (kept first)"] <= 10:
                    print(f"  conflict: '{e['raw']}' -> {first.get('qa_id') or first.get('intent')} and "
                          f"{e.get('qa_id') or e.get('intent')}")
            elif first["split"] == "train" and e["split"] == "test":
                report["removed: test phrasing identical to a training phrasing (leak)"] += 1
            else:
                report["removed: duplicate"] += 1
            if first["split"] == "test" and e["split"] == "train":
                first["split"] = "train"             # keep the test set clean of training text
                report["moved to train: test phrasing also used in training"] += 1
            continue
        seen[key] = e
        out.append(e)
    # every question should have at least one test phrasing so accuracy can be measured
    by_q = collections.defaultdict(list)
    for e in out:
        if e.get("qa_id"):
            by_q[e["qa_id"]].append(e)
    no_test = [q for q, lst in by_q.items() if not any(x["split"] == "test" for x in lst)]
    for q in no_test:
        lst = by_q[q]
        if len(lst) >= 4:
            lst[-1]["split"] = "test"
            report["moved to test: question had no test phrasing"] += 1
    report["kept"] = len(out)
    if verbose:
        print("Preprocessing report (training phrasings):")
        for k, v in sorted(report.items()):
            print(f"  {k}: {v}")
        langs = collections.Counter((e["lang"], e["split"]) for e in out)
        print("  by language and split:", dict(langs))
        thin = [q for q, lst in by_q.items() if sum(x["split"] == "train" for x in lst) < 5]
        if thin:
            print(f"  questions with fewer than 5 training phrasings: {len(thin)} (add more in the workbook)")
    return out, report


# ---------------- documents ----------------
_TOC = re.compile(r"\.{4,}\s*\d+\s*$")                    # "Contraception ........ 12"
_PAGE_NUM = re.compile(r"^\s*(page\s*)?(\d{1,4}|[ivxlc]{1,7})\s*(of\s*\d+)?\s*$", re.I)
_LEAD_ROMAN = re.compile(r"^[ivxlc]{1,7}(?=[A-Z])")      # "xixCollaborating" -> "Collaborating"
_BULLET = re.compile(r"^\s*[y•▪◦·●■–]\s+(?=[A-Z0-9])")   # bullet symbols ("y" is a Wingdings bullet in some PDFs)
_REF_START = re.compile(r"^\s*(references|bibliography)\b", re.I)
_CITE = re.compile(r"(et al\.|doi:|https?://|\(\d{4}\)|\b(19|20)\d{2}[;:,]\s*\d+"
                   r"|\b[A-Z][a-z]+, [A-Z]\.|\b(19|20)\d{2}\. [A-Z])")      # "Wight, D. 2011. The ..."


def clean_pages(pages):
    """Remove repeated headers/footers, page numbers, table-of-contents lines and reference lists."""
    lines_per_page = [(p, [l.strip() for l in t.split("\n")]) for p, t in pages]
    counts = collections.Counter()
    for _, lines in lines_per_page:
        for l in set(lines):
            if 0 < len(l) < 90:
                counts[l] += 1
    n = max(1, len(pages))
    repeated = {l for l, c in counts.items() if n >= 4 and c / n > 0.3}
    out = []
    for p, lines in lines_per_page:
        keep = []
        in_refs = False                      # judged page by page, so a contents line can't wipe the rest
        for l in lines:
            l = _BULLET.sub("", _LEAD_ROMAN.sub("", l))
            if not l or l in repeated or _PAGE_NUM.match(l) or _TOC.search(l):
                continue
            if _REF_START.match(l) and len(l) < 25 and not re.search(r"\d", l):   # a real "References" heading
                in_refs = True
            if in_refs:
                continue
            keep.append(l)
        text = " ".join(keep)
        if len(_CITE.findall(text)) > max(8, len(text) / 250):   # page that is mostly citations
            continue
        # hyphenated words broken across lines keep their hyphen ("second- trimester" -> "second-trimester");
        # "first- or second-trimester" keeps its space
        text = re.sub(r"(\w)- (?!(?:or|and|to)\b)(\w)", r"\1-\2", text)
        text = re.sub(r"\s+", " ", text).strip()
        alpha = sum(c.isalpha() for c in text) / max(1, len(text))
        if len(text) > 80 and alpha > 0.6:                    # skip tables of numbers and empty pages
            out.append((p, text))
    return out


def dedupe_passages(passages):
    seen, out = set(), []
    for p in passages:
        key = re.sub(r"\W+", "", p["text"].lower())[:300]
        if key in seen:
            continue
        seen.add(key)
        out.append(p)
    return out
