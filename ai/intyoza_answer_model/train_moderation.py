"""The moderation learning loop: learns from moderators' decisions, automatically.

Every time the AI service starts (public_service.start / server.py), moderation.auto_learn() runs this with the
backend export, so the moderators' latest decisions are learned without anyone doing anything:

    INTYOZA_MODERATION_EXPORT_URL   the backend admin export, e.g. https://<backend>/api/v1/admin/moderation/export
    INTYOZA_MODERATION_EXPORT_KEY   sent as  X-API-Key  (a key for this export only, set as a Kaggle secret)

It can also be run by hand:   python train_moderation.py moderation_export.json   (or .csv, or --from-url URL)

The export: one row per post the AI read
    text               the post (names, numbers, e-mails and links are removed again here before learning)
    aiDecision         what /moderate said: ok | check | crisis
    moderatorDecision  APPROVED (= ok), HIDDEN or BLOCKED (= check), CRISIS (= crisis)

Steps:
  1. Shadow-mode report: how often the AI agreed with moderators, and every crisis it missed.
  2. Learns from the decisions by MEANING, with Intyoza's own matcher (multilingual-e5, fine-tuned on Intyoza
     data), so new wordings of a harmful post are recognised too. Without the matcher it learns from spelling.
  3. Tests on posts it never saw: rules + checker must miss NO crisis and make no more mistakes than the rules
     alone. Only then it is saved to models/moderation_clf.joblib; otherwise the current version stays.
Returns 0 (saved), 1 (not better, nothing saved) or 2 (not enough decisions yet).
"""
import argparse
import csv
import io
import json
import os
import random
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import moderation  # noqa: E402

LABEL = {"approved": "ok", "ok": "ok", "allowed": "ok", "published": "ok",
         "hidden": "check", "blocked": "check", "removed": "check", "rejected": "check", "check": "check",
         "crisis": "crisis", "urgent": "crisis"}
MIN_ROWS = 200        # fewer decisions than this: not enough to learn from
MIN_CRISIS = 10       # and at least this many crisis posts, so the crisis test means something
MATCHER = os.path.join(HERE, "models", "intyoza_matcher")
LAST = {}             # the last run's numbers, shown in GET /health


def parse(raw, csv_text=False):
    if csv_text:
        rows = list(csv.DictReader(io.StringIO(raw)))
    else:
        data = json.loads(raw)
        rows = data.get("decisions", data) if isinstance(data, dict) else data
    out = []
    for r in rows:
        text = r.get("text") or ""
        mod = LABEL.get(str(r.get("moderatorDecision") or r.get("moderator_decision") or "").strip().lower())
        ai = str(r.get("aiDecision") or r.get("ai_decision") or "").strip().lower() or None
        if text.strip() and mod:
            out.append({"text": text, "label": mod, "ai": ai})
    return out


def load(path):
    with open(path, encoding="utf-8-sig") as f:
        return parse(f.read(), csv_text=path.lower().endswith(".csv"))


def fetch(url):
    import requests
    headers = {"X-API-Key": os.environ.get("INTYOZA_MODERATION_EXPORT_KEY", "")}
    r = requests.get(url, headers=headers, timeout=60)
    r.raise_for_status()
    return parse(r.text)


def private(text):
    """The same cleaning as the review sheet: names, numbers, e-mails, links removed."""
    try:
        from review_queue import clean
        return clean(text, limit=1000)
    except Exception:
        return text


def norm(text):
    try:
        from intyoza_core import normalize
        return normalize(text)
    except Exception:
        return text.lower()


def load_encoder(path=MATCHER):
    """Intyoza's matcher, to read posts by meaning. None if it is not here (then spelling is used)."""
    if not os.path.isdir(path):
        return None
    try:
        from sentence_transformers import SentenceTransformer
        return SentenceTransformer(path)
    except Exception:
        return None


def shadow_report(rows):
    """How the AI's live decisions compare with the moderators' (only rows that have an aiDecision)."""
    have = [r for r in rows if r["ai"] in ("ok", "check", "crisis")]
    if not have:
        return {"rows": 0}
    agree = sum(r["ai"] == r["label"] for r in have)
    return {"rows": len(have), "agreement": round(agree / len(have), 3),
            "crisisMissed": sum(r["label"] == "crisis" and r["ai"] != "crisis" for r in have),
            "harmfulLetThrough": sum(r["label"] != "ok" and r["ai"] == "ok" for r in have),
            "heldNeedlessly": sum(r["label"] == "ok" and r["ai"] != "ok" for r in have)}


def train(rows, encoder=None):
    from sklearn.linear_model import LogisticRegression
    texts = [norm(r["clean"]) for r in rows]
    labels = [r["label"] for r in rows]
    if encoder is not None:
        clf = LogisticRegression(max_iter=3000, class_weight="balanced", C=4)
        clf.fit(encoder.encode(texts, normalize_embeddings=True), labels)
        return {"clf": clf, "features": "meaning"}
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.pipeline import make_pipeline
    clf = make_pipeline(TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 5), sublinear_tf=True),
                        LogisticRegression(max_iter=3000, class_weight="balanced", C=4))
    return {"clf": clf.fit(texts, labels), "features": "spelling"}


def mistakes(rows, learned, encoder=None):
    """Decisions of /moderate (rules, with or without the checker) against the moderators'."""
    wrong = missed = 0
    for r in rows:
        d = moderation.moderate(r["text"], learned=learned, encoder=encoder)["decision"]
        wrong += d != r["label"]
        missed += r["label"] == "crisis" and d != "crisis"
    return wrong, missed


def split(rows, test_share=0.25, seed=7):
    """Keeps the share of each kind of decision the same in both parts."""
    rnd = random.Random(seed)
    train_rows, test_rows = [], []
    for label in ("ok", "check", "crisis"):
        group = [r for r in rows if r["label"] == label]
        rnd.shuffle(group)
        k = max(1, round(len(group) * test_share)) if len(group) > 1 else 0
        test_rows += group[:k]
        train_rows += group[k:]
    return train_rows, test_rows


def main(argv=None, verbose=True, encoder="auto"):
    say = print if verbose else (lambda *a, **k: None)
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("export", nargs="?", help="moderation export from the backend (.json or .csv)")
    ap.add_argument("--from-url", help="fetch the export from the backend instead of a file")
    ap.add_argument("--out", default=moderation.MODEL_PATH)
    ap.add_argument("--min-rows", type=int, default=MIN_ROWS)
    ap.add_argument("--min-crisis", type=int, default=MIN_CRISIS)
    args = ap.parse_args(argv)
    if not args.export and not args.from_url:
        ap.error("give an export file or --from-url")

    rows = fetch(args.from_url) if args.from_url else load(args.export)
    for r in rows:
        r["clean"] = private(r["text"])
    counts = {k: sum(r["label"] == k for r in rows) for k in ("ok", "check", "crisis")}
    say(f"Moderators' decisions: {len(rows)}  {counts}")
    LAST.clear()
    LAST.update(date=time.strftime("%Y-%m-%d"), decisions=len(rows), shadowMode=shadow_report(rows))
    say("Shadow mode so far:", LAST["shadowMode"])

    if len(rows) < args.min_rows or counts["crisis"] < args.min_crisis or min(counts.values()) < 2:
        say(f"Not enough decisions yet to learn safely (need {args.min_rows} with at least {args.min_crisis} "
            f"crisis posts). Nothing was changed.")
        return 2

    enc = load_encoder() if encoder == "auto" else encoder
    train_rows, test_rows = split(rows)
    candidate = train(train_rows, enc)
    base_wrong, base_missed = mistakes(test_rows, None, enc)
    new_wrong, new_missed = mistakes(test_rows, candidate, enc)
    say(f"Test on {len(test_rows)} posts it never saw ({candidate['features']}): rules only -> {base_wrong} mistakes, "
        f"{base_missed} crisis missed; with the checker -> {new_wrong} mistakes, {new_missed} crisis missed")
    LAST["test"] = {"rows": len(test_rows), "mistakesBefore": base_wrong, "mistakesAfter": new_wrong, "crisisMissed": new_missed}
    if new_missed > 0 or new_wrong > base_wrong:
        say("The new checker is NOT better (it misses a crisis or makes more mistakes). Nothing was saved.")
        return 1

    final = train(rows, enc)                                # learn from every decision before saving
    final["info"] = {"trainedAt": time.strftime("%Y-%m-%d"), "features": final["features"], "rows": len(rows),
                     "counts": counts, "test": {"rows": len(test_rows), "mistakesBefore": base_wrong,
                                                "mistakesAfter": new_wrong, "crisisMissed": new_missed}}
    import joblib
    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    joblib.dump(final, args.out)
    say("Saved:", args.out, "->", final["info"])
    return 0


if __name__ == "__main__":
    sys.exit(main())
