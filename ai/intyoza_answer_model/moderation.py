"""Community moderation helper: reads a post and tells the backend whether it can appear now, must wait for a
moderator, or is a crisis. Moderators then see only the posts that need a person, most urgent first.

    r = moderate("Muraho, nafashwe ku ngufu", bot=chat.base, space_strict=False, author_posts=5)
    r["decision"]  ->  "crisis"        # "ok" (show now), "check" (moderator first) or "crisis" (moderator now + help)
    r["reasons"]   ->  ["abuse"]

How it decides (most serious first; when unsure, it holds the post):
  1. Crisis words (self-harm, abuse, rape, emergency) or the trained risk model at High/Emergency  -> crisis
  2. Signs of grooming or unsafe contact (asking for a number, WhatsApp, to meet, age or school, photos,
     offering money), personal details (phone, e-mail, links), insults, requests for sexual images  -> check
  3. Trust levels: a new author (fewer than NEW_AUTHOR_POSTS approved posts) or a strict space
     (e.g. Survivors & Safety: every post and reply reviewed)                                      -> check
  4. Anything else -> ok
If something fails while reading, the post goes to a moderator ("check"): nothing slips through.

SHADOW MODE (INTYOZA_MODERATION_SHADOW, on by default): every answer says "shadow": true, which tells the backend
to keep reviewing every post as it does today and only save the AI's decision next to the moderator's. Compare
the two for 2 to 4 weeks; switch it off (INTYOZA_MODERATION_SHADOW=0) only when no crisis post was missed.

LEARNING LOOP (automatic, see train_moderation.py):
  Moderators' decisions are the teacher. Each time the service starts it can fetch the latest decisions from the
  backend (INTYOZA_MODERATION_EXPORT_URL + INTYOZA_MODERATION_EXPORT_KEY), retrain a checker on them and test it.
  The checker reads posts by MEANING with Intyoza's own matcher (multilingual-e5, Kinyarwanda and English), so it
  also recognises new wordings of what moderators held before, not only the same words.
  It is used only if it missed no crisis on posts it never saw. It can hold a post or raise it to crisis, but it
  can only release a post held by the weak "possible_risk" signal alone: crisis words and trust levels always stand.

Nothing is stored here: the text is read and forgotten. The word lists below need checking by a Kinyarwanda speaker.
"""
import os
import re

NEW_AUTHOR_POSTS = 3

# Help shown to the young person at once when a post is a crisis (the moderator is alerted at the same time).
HELP = {
    "self_harm": [{"label": "Emergency", "number": "112"}, {"label": "Free health hotline (RBC)", "number": "114"}],
    "abuse": [{"label": "Isange One Stop Centre (free medical, emotional and legal help)", "number": "3029"},
              {"label": "RIB line for violence and abuse (free)", "number": "3512"},
              {"label": "Police emergency", "number": "112"}, {"label": "Child helpline", "number": "116"}],
    "emergency": [{"label": "Emergency", "number": "112"}, {"label": "Ambulance", "number": "912"}],
    # found by the risk model or the learned checker: the kind of danger is not known, so all the main lines
    "other": [{"label": "Emergency", "number": "112"}, {"label": "Free health hotline (RBC)", "number": "114"},
              {"label": "Isange One Stop Centre (free medical, emotional and legal help)", "number": "3029"},
              {"label": "Child helpline", "number": "116"}],
}

CRISIS_KIND = [
    ("self_harm", re.compile(r"kwiyahur|niyahur|nkwiyahur|ndashaka gupfa|kwikomeret|\b(suicide|kill myself|want to die|"
                             r"end my life|hurt myself|self[- ]harm)\b", re.I)),
    ("abuse", re.compile(r"ku ngufu|nafashwe|bamfashe|yamfashe|ampohoter|yampohoter|bampohoter|arankubit|barankubit|"
                         r"ndakubitwa|\b(rape|raped|abuse|abused|hits? me|beats? me|forced me|touched me)\b", re.I)),
    ("emergency", re.compile(r"amaraso menshi|ndava amaraso|nkomeretse|ndaribwa cyane|\b(bleeding a lot|can't breathe|"
                             r"overdose|poisoned)\b", re.I)),
]

# (reason, pattern): signs a moderator should look first. English and Kinyarwanda.
CHECK = [
    ("contact_request", re.compile(
        r"\b(whats ?app|telegram|snap(chat)?|insta(gram)?|inbox me|dm me|text me|call me|your number|my number|"
        r"phone number|meet (me|up)|let'?s meet|come to my|alone with|talk (in )?private(ly)?|"
        r"mpa (nimero|numero)|nimpe (nimero|numero)|nimero yawe|numero yawe|twandikirane|duhure|tuzahure|"
        r"uzaze iwanjye|ngwino iwanjye|tuvugane (mu )?ibanga)\b", re.I)),
    ("age_or_school", re.compile(
        r"\b(how old are you|your age|which school|what school|where do you (live|study)|ufite imyaka ingahe|"
        r"wiga he|wiga mu (kihe|wuhe)|utuye he|ishuri ryawe)\b", re.I)),
    ("money_or_gifts", re.compile(
        r"\b(i('ll| will) (give|send|pay) you|send you money|gift for you|nzaguha|nkoherereze amafaranga|"
        r"nguhe amafaranga|impano)\b", re.I)),
    ("sexual_images", re.compile(
        r"\b(send (me )?(nudes?|pics?|photos?|a picture)|nudes?|naked (pic|photo)|sex video|amafoto yambaye ubusa|"
        r"ifoto wambaye ubusa|nyoherereza ifoto)\b", re.I)),
    ("insult", re.compile(
        r"\b(stupid|idiot|whore|slut|bitch|fuck(ing)? you|ugly|ikigoryi|igicucu|indaya|imbwa we|uri imbwa|ikimara)\b", re.I)),
    ("personal_info", re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+|\+?\d[\d\s().-]{6,}\d|\b\d{5,}\b|(?<!\w)@\w+|"
                                 r"\b(nitwa|niitwa|izina ryanjye ni|my name is)\s+\w+", re.I)),
    ("link", re.compile(r"(https?://|www\.)\S+", re.I)),
]

ORDER = {"ok": 0, "check": 1, "crisis": 2}
HERE = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(HERE, "models", "moderation_clf.joblib")

_learned = {"entry": None, "loaded": False, "info": None, "lastRun": None}


def load_learned(path=MODEL_PATH):
    """The checker trained on moderators' decisions (train_moderation.py), if there is one."""
    _learned.update(entry=None, loaded=True, info=None)
    if os.path.exists(path):
        try:
            import joblib
            entry = joblib.load(path)
            _learned.update(entry=entry, info=entry.get("info"))
        except Exception as e:
            _learned["info"] = {"error": str(e)[:200]}
    return _learned["entry"]


def _entry():
    if not _learned["loaded"]:
        load_learned()
    return _learned["entry"]


def learned_proba(entry, norm, encoder=None):
    """{ok, check, crisis} probabilities from a trained checker, or None when it can't read the post here."""
    if entry["features"] == "meaning":
        if encoder is None:
            return None
        x = encoder.encode([norm], normalize_embeddings=True)
    else:
        x = [norm]
    clf = entry["clf"]
    return dict(zip(clf.classes_, clf.predict_proba(x)[0]))


def auto_learn(encoder=None, verbose=True):
    """At start: fetch moderators' latest decisions from the backend, retrain and test (train_moderation.py).
    encoder: the chatbot's matcher (bot.enc), so the checker learns with the same reader it uses later.
    Does nothing unless INTYOZA_MODERATION_EXPORT_URL is set; never stops the service."""
    url = os.environ.get("INTYOZA_MODERATION_EXPORT_URL")
    if not url:
        return None
    try:
        import train_moderation
        code = train_moderation.main(["--from-url", url], verbose=verbose, encoder=encoder if encoder is not None else "auto")
        _learned["lastRun"] = {"code": code, "result": {0: "new checker saved", 1: "new checker not better, kept the old one",
                                                        2: "not enough decisions yet"}.get(code, "error"),
                               **train_moderation.LAST}
    except Exception as e:
        _learned["lastRun"] = {"code": -1, "result": f"error: {str(e)[:200]}"}
    load_learned()
    if verbose:
        print("Moderation learning:", _learned["lastRun"]["result"])
    return _learned["lastRun"]


def status():
    """For GET /health: what the moderation is using."""
    _entry()
    return {"shadow": shadow_mode(), "learnedChecker": _learned["info"], "lastLearning": _learned["lastRun"]}


def shadow_mode():
    return os.environ.get("INTYOZA_MODERATION_SHADOW", "1") != "0"


def _model_level(bot, text):
    """The trained risk model (the one the chatbot uses): 'None', 'Low', 'High' or 'Emergency'."""
    a = bot.assess(text)
    return a["level"], float(a.get("strength", 0.0))


def moderate(text, bot=None, space_strict=False, author_posts=None, is_reply=False, learned="default", encoder=None):
    """learned: the checker to use ("default" = models/moderation_clf.joblib if present, None = rules only).
    encoder: the matcher that reads meaning (default: the chatbot's, bot.enc)."""
    text = " ".join(str(text or "").split())
    decision, reasons, kind = "ok", [], None

    def raise_to(level, reason):
        nonlocal decision
        if ORDER[level] > ORDER[decision]:
            decision = level
        if reason not in reasons:
            reasons.append(reason)

    if not text:
        return {"decision": "check", "reasons": ["empty"], "crisisKind": None, "help": [], "shadow": shadow_mode()}

    try:
        try:
            from intyoza_core import normalize
            norm = normalize(text)
        except Exception:
            norm = text.lower()
        for name, rx in CRISIS_KIND:
            if rx.search(text) or rx.search(norm):
                kind = kind or name
                raise_to("crisis", name)
        if bot is not None:
            level, strength = _model_level(bot, text)
            if level in ("High", "Emergency"):
                kind = kind or "other"
                raise_to("crisis", "risk_model")
            elif level == "Low" or strength >= 0.3:
                raise_to("check", "possible_risk")
        for name, rx in CHECK:
            if rx.search(text):
                raise_to("check", name)
        entry = _entry() if learned == "default" else learned
        p = learned_proba(entry, norm, encoder or getattr(bot, "enc", None)) if entry else None
        if p:
            if p.get("crisis", 0) >= 0.5:
                kind = kind or "other"
                raise_to("crisis", "learned")
            elif p.get("crisis", 0) + p.get("check", 0) >= 0.5:
                raise_to("check", "learned")
            elif decision == "check" and reasons == ["possible_risk"] and p.get("ok", 0) >= 0.8:
                decision, reasons = "ok", []                # moderators kept approving posts like this one
    except Exception:
        raise_to("check", "could_not_read")              # fail safe: a person looks at it

    # Trust levels (the backend sends these; without them nothing changes)
    if space_strict:
        raise_to("check", "strict_space")
    if author_posts is not None and author_posts < NEW_AUTHOR_POSTS:
        raise_to("check", "new_author")
    if is_reply and space_strict:
        raise_to("check", "reply_in_strict_space")

    if decision != "crisis":
        kind = None
    return {"decision": decision, "reasons": reasons, "crisisKind": kind, "help": HELP.get(kind, []) if kind else [],
            "shadow": shadow_mode()}
