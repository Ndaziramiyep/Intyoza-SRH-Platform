"""DEMO DATA: public SRH data found online, to make the demo answer more questions.

    NOT for the live platform. When Intyoza goes live, switch it off (INTYOZA_DEMO=0, or USE_DEMO_DATA = False in
    the notebooks) and use approved answers and approved documents only.

Every item keeps its source and licence, and the answer model sees it marked "DEMO SOURCE (not reviewed by
Intyoza)", below the approved answers in priority.

Sources (downloaded in Colab; the files are not put in git):
  hash_sti     HASH STI Question and Answer Crowdsourced Dataset v1 (Infectious Diseases Institute, Makerere
               University, Uganda). 2,502 questions from the public in 109 groups, answered by doctors.
               Harvard Dataverse doi:10.7910/DVN/5SWM5U. Licence CC BY-NC 4.0 (non-commercial use only).
  menstrual    (OFF by default since the first training run showed vague answers and off-topic questions)
               Menstrual Health Education bot data (github.com/gjyotk/Menstrual-Health-Education-bot), about 545
               questions and short answers on periods. No licence stated and the answers are not reviewed by
               health workers: lowest priority, demo only.
  who          WHO fact sheets and Q&A pages on adolescent SRH, contraception, STIs, HIV, cervical cancer, violence,
               abortion, adolescent mental health. Licence CC BY-NC-SA 3.0 IGO. Saved as documents (.txt).

Kinyarwanda: the answer model reads these English sources and writes the answer in Kinyarwanda. To also teach it
Kinyarwanda ways of asking these questions, translate_questions() translates a sample of the questions with the
answer model itself (the translations are machine-made: demo only).
"""
import hashlib
import html
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
DEMO_DIR = os.path.join(HERE, "demo_data")
DEMO_QA = os.path.join(DEMO_DIR, "demo_qa.json")
DEMO_DOC_PREFIX = "DEMO_"

HASH_FILE = {"url": "https://dataverse.harvard.edu/api/access/datafile/13436948", "md5": "feefd3a26a0cdc32c5a6da9bb5fa5350",
             "name": "hash_sti_qa.xlsx"}
MENSTRUAL_FILES = [
    "https://raw.githubusercontent.com/gjyotk/Menstrual-Health-Education-bot/main/Fine-tuned-Models/Flan-T5-base-FineTuning/LLM-train-data.csv",
    "https://raw.githubusercontent.com/gjyotk/Menstrual-Health-Education-bot/main/Fine-tuned-Models/Flan-T5-base-FineTuning/LLM-test-data.csv",
]
WHO_PAGES = {
    "adolescent-sexual-and-reproductive-health-QA": "https://www.who.int/news-room/questions-and-answers/item/adolescent-sexual-and-reproductive-health",
    "adolescent-pregnancy": "https://www.who.int/news-room/fact-sheets/detail/adolescent-pregnancy",
    "family-planning-contraception": "https://www.who.int/news-room/fact-sheets/detail/family-planning-contraception",
    "emergency-contraception": "https://www.who.int/news-room/fact-sheets/detail/emergency-contraception",
    "sexually-transmitted-infections": "https://www.who.int/news-room/fact-sheets/detail/sexually-transmitted-infections-(stis)",
    "hiv-aids": "https://www.who.int/news-room/fact-sheets/detail/hiv-aids",
    "cervical-cancer": "https://www.who.int/news-room/fact-sheets/detail/cervical-cancer",
    "violence-against-women": "https://www.who.int/news-room/fact-sheets/detail/violence-against-women",
    "abortion": "https://www.who.int/news-room/fact-sheets/detail/abortion",
    "infertility": "https://www.who.int/news-room/fact-sheets/detail/infertility",
    "adolescent-mental-health": "https://www.who.int/news-room/fact-sheets/detail/adolescent-mental-health",
    "adolescents-health-risks-and-solutions": "https://www.who.int/news-room/fact-sheets/detail/adolescents-health-risks-and-solutions",
}
SOURCE_INFO = {
    "hash_sti": {"title": "HASH STI Q&A crowdsourced dataset (Uganda, answers by doctors)", "licence": "CC BY-NC 4.0",
                 "priority": 1},
    "menstrual": {"title": "Menstrual Health Education bot data (not reviewed, no licence stated)", "licence": "none stated",
                  "priority": 2},
}
# HASH sheet names -> Intyoza topics
TOPIC_OF = [(r"hiv|aids", "STIs and HIV"), (r"preg", "Pregnancy"), (r"contracep|family", "Contraception"),
            (r"menstru|period", "Menstruation and puberty")]
UA = {"User-Agent": "Mozilla/5.0 (Intyoza demo data download)"}


# ===================================================================== download (Colab)
def _get(url, timeout=120):
    import requests
    r = requests.get(url, headers=UA, timeout=timeout)
    r.raise_for_status()
    return r


def download(demo_dir=DEMO_DIR, doc_dir=None, verbose=True):
    """Downloads every demo source. Files already present are kept. Returns {source: status}."""
    os.makedirs(demo_dir, exist_ok=True)
    status = {}
    path = os.path.join(demo_dir, HASH_FILE["name"])
    try:
        if not (os.path.exists(path) and hashlib.md5(open(path, "rb").read()).hexdigest() == HASH_FILE["md5"]):
            data = _get(HASH_FILE["url"]).content
            if hashlib.md5(data).hexdigest() != HASH_FILE["md5"]:
                raise ValueError("the file on Dataverse changed (checksum differs)")
            open(path, "wb").write(data)
        status["hash_sti"] = "ok"
    except Exception as e:
        status["hash_sti"] = f"FAILED: {type(e).__name__}: {str(e)[:150]}"
    try:
        for i, url in enumerate(MENSTRUAL_FILES):
            p = os.path.join(demo_dir, f"menstrual_{i}.csv")
            if not os.path.exists(p):
                open(p, "wb").write(_get(url).content)
        status["menstrual"] = "ok"
    except Exception as e:
        status["menstrual"] = f"FAILED: {type(e).__name__}: {str(e)[:150]}"
    doc_dir = doc_dir or os.path.join(HERE, "documents")
    ok = 0
    for name, url in WHO_PAGES.items():
        p = os.path.join(doc_dir, f"{DEMO_DOC_PREFIX}WHO_{name}.txt")
        if os.path.exists(p):
            ok += 1
            continue
        try:
            text = html_to_text(_get(url).text)
            if len(text.split()) < 150:
                raise ValueError("page has too little text")
            open(p, "w", encoding="utf-8").write(f"WHO fact sheet: {name} ({url}). Licence CC BY-NC-SA 3.0 IGO.\n\n{text}")
            ok += 1
        except Exception as e:
            status[f"who/{name}"] = f"FAILED: {type(e).__name__}: {str(e)[:100]}"
    status["who"] = f"{ok}/{len(WHO_PAGES)} pages"
    if verbose:
        for k, v in status.items():
            print(f"  {k}: {v}")
    return status


def html_to_text(page):
    """Main text of a WHO page (headings, paragraphs and list items), without menus and scripts."""
    page = re.sub(r"(?is)<(script|style|nav|header|footer|noscript)\b.*?</\1>", " ", page)
    m = re.search(r'(?is)<(main|article)\b.*?</\1>', page)
    page = m.group() if m else page
    parts = re.findall(r"(?is)<(h[1-4]|p|li)\b[^>]*>(.*?)</\1>", page)
    lines = []
    for tag, inner in parts:
        t = html.unescape(re.sub(r"(?s)<[^>]+>", " ", inner))
        t = " ".join(t.split())
        if len(t) < 3:
            continue
        lines.append(("\n## " + t) if tag.lower().startswith("h") else ("- " + t if tag.lower() == "li" else t))
    return "\n".join(lines).strip()


# ===================================================================== reading
def _clean(x):
    import pandas as pd
    if x is None or (isinstance(x, float) and pd.isna(x)):
        return ""
    return " ".join(str(x).replace("\xa0", " ").split())


def _topic(sheet):
    for pat, topic in TOPIC_OF:
        if re.search(pat, sheet, re.I):
            return topic
    return "STIs and HIV"


def read_hash(path):
    """One item per question group: all the ways the public asked it + the doctors' short answer.
    Like the original authors' cleaning: the group label is only on a group's first row, and groups labelled just
    Yes/No, or with no answer at all, belong to the group above them."""
    import pandas as pd
    blocks = []
    for sheet, df in pd.read_excel(path, sheet_name=None).items():
        if df.shape[1] < 6:
            continue
        df = df.iloc[:, :6].copy()
        df.columns = ["intent", "unused", "q1", "q2", "simple", "long"]
        sheet_blocks = []
        for _, r in df.iterrows():
            label = _clean(r["intent"])
            if label or not sheet_blocks:
                sheet_blocks.append({"intent": label or "?", "questions": [], "answers": [], "long": [], "sheet": sheet})
            b = sheet_blocks[-1]
            for c in ("q1", "q2"):
                for q in re.split(r"\n+", str(r[c])) if _clean(r[c]) else []:
                    q = _clean(q)
                    if len(q) > 5 and q not in b["questions"]:
                        b["questions"].append(q)
            if _clean(r["simple"]):
                b["answers"].append(_clean(r["simple"]))
            if _clean(r["long"]):
                b["long"].append(_clean(r["long"]))
        merged = []
        for b in sheet_blocks:
            no_answer = not (b["answers"] or b["long"])
            if merged and (b["intent"].lower() in ("yes", "no") or no_answer):
                m = merged[-1]
                m["questions"] += [q for q in b["questions"] if q not in m["questions"]]
                m["answers"] += b["answers"]
                m["long"] += b["long"]
            else:
                merged.append(b)
        blocks += merged
    out = []
    for it in blocks:
        if not it["questions"] or not (it["answers"] or it["long"]):
            continue
        ans = it["answers"][0] if it["answers"] else it["long"][0]
        out.append({"id": f"DEMO-HASH-{len(out) + 1:03d}", "source": "hash_sti", "topic": _topic(it["sheet"]),
                    "q_en": it["questions"][0], "questions_en": it["questions"], "answer_en": ans,
                    "group": f"{it['sheet']}: {it['intent']}"})
    return out


def read_menstrual(demo_dir):
    import pandas as pd
    frames = [pd.read_csv(os.path.join(demo_dir, f)) for f in sorted(os.listdir(demo_dir)) if f.startswith("menstrual_")]
    if not frames:
        return []
    df = pd.concat(frames, ignore_index=True)
    df = df.iloc[:, :2]
    df.columns = ["q", "a"]
    df = df.dropna().drop_duplicates("q")
    return [{"id": f"DEMO-MEN-{n + 1:03d}", "source": "menstrual", "topic": "Menstruation and puberty",
             "q_en": _clean(r.q), "questions_en": [_clean(r.q)], "answer_en": _clean(r.a), "group": "menstrual"}
            for n, r in enumerate(df.itertuples()) if len(_clean(r.a).split()) >= 6]


def build(demo_dir=DEMO_DIR, verbose=True, include_menstrual=False):
    """Reads the downloaded files into demo_data/demo_qa.json. Keeps translations already made."""
    items = []
    p = os.path.join(demo_dir, HASH_FILE["name"])
    if os.path.exists(p):
        items += read_hash(p)
    if include_menstrual:      # off by default: vague, unreviewed answers, many questions not relevant to Rwandan youth
        items += read_menstrual(demo_dir)
    old = {it["id"]: it for it in load()}
    for it in items:
        if it["id"] in old and old[it["id"]].get("questions_rw"):
            it["questions_rw"] = old[it["id"]]["questions_rw"]
    json.dump(items, open(DEMO_QA, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    if verbose:
        from collections import Counter
        print(f"Demo Q&A: {len(items)} items, {sum(len(i['questions_en']) for i in items)} questions",
              dict(Counter(i["source"] for i in items)))
    return items


def load(path=DEMO_QA):
    if not os.path.exists(path):
        return []
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def enabled():
    """Demo data is used unless INTYOZA_DEMO=0."""
    return os.environ.get("INTYOZA_DEMO", "1") != "0"


def source_text(it):
    info = SOURCE_INFO.get(it["source"], {"title": it["source"], "licence": "?"})
    return (f"DEMO SOURCE (not reviewed by Intyoza; {info['title']}; licence {info['licence']})\n"
            f"Question: {it['q_en']}\nAnswer: {it['answer_en']}")


# ===================================================================== Kinyarwanda questions (machine translation)
SYSTEM_TRANSLATE = ("Translate the young person's question into natural, simple Kinyarwanda as a young person in Rwanda "
                    "would type it. Keep the meaning exactly. Use the usual words (imihango, agakingirizo, virusi itera "
                    "SIDA, indwara zandurira mu mibonano mpuzabitsina, kuboneza urubyaro, gutwita). Output only the "
                    "Kinyarwanda question.")


def translate_questions(gen, items=None, n=300, per_item=1, seed=0, save=True, log=print, bot=None):
    """Translates up to n questions into Kinyarwanda with the answer model (machine translation: demo only).
    bot: if given, a translation is kept only when Intyoza's language model reads it as Kinyarwanda."""
    from intyoza_core import normalize
    import random
    items = items if items is not None else load()
    rng = random.Random(seed)
    todo = [it for it in items if not it.get("questions_rw")]
    rng.shuffle(todo)
    done = 0
    for it in todo:
        if done >= n:
            break
        qs = rng.sample(it["questions_en"], min(per_item, len(it["questions_en"])))
        out = []
        for q in qs:
            t = gen.chat(SYSTEM_TRANSLATE, q, max_new_tokens=80).split("\n")[0].strip().strip('"')
            letters = sum(ch.isalpha() or ch.isspace() or ch in "'?,." for ch in t) / max(1, len(t))
            if not (2 <= len(t.split()) <= 40) or letters < 0.95:
                continue
            if bot is not None and bot.detect_lang(normalize(t), "rw") != "rw":
                continue
            out.append(t)
        if out:
            it["questions_rw"] = out
            done += 1
        if out and done % 25 == 0:
            if save:                       # saved as it goes: a Colab disconnect does not lose the work
                json.dump(items, open(DEMO_QA, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
            if log:
                log(f"  {done} translated (saved)")
    if save:
        json.dump(items, open(DEMO_QA, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    return done
