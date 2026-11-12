"""Fine-tunes Intyoza's own answer model: AfriqueQwen3.5-4B-Instruct (McGill NLP, CC-BY-4.0) + a LoRA adapter
trained on Intyoza's data (QLoRA: the base model in 4-bit, so it trains on a free Colab T4).

The model learns the jobs it does in answer_engine.py and crisis.py, with exactly the prompts it gets there:
  talk         a turn of a whole conversation (history, the young person's profile, sources) -> one of SEVERAL good
               replies written for that situation (Conversations tab, Approved rows): short by default, long when
               asked, listening first, ending with a question. Not the approved answer copied: the old "write"
               target was the approved answer itself, so the model learned to give the same words to everyone
               (chrF 56.4 -> 99.7). The approved answers stay as the SOURCES the facts must come from.
  crisis       the crisis turns of those conversations, with crisis.py's prompt and the approved help texts
               -> a warm reply for that person that always gives the approved safety numbers exactly
  not covered  question + sources that do NOT answer it -> NOT_COVERED (no guessing)
  check        question + sources + an answer -> is it the answer to THIS question? are its facts in the sources?
               Wrong answers are the answers of the closest OTHER questions (the "nearest answer" mistake) and
               answers with a changed number.
  understand   message (with conversation) -> the full question in Kinyarwanda and English, search words, and
               whether it is SRH, wellbeing or off topic

Only the training split is used for training. The test split (ways of asking never seen in training) measures
the base model and the fine-tuned model on the same examples.

    examples = build_examples(bot, docs, ex, split="train")
    gen = load_model()                       # base model (4-bit on GPU)
    before = evaluate(gen, bot, test_examples)
    train(gen, examples, out_dir="models/intyoza_writer")
    after = evaluate(gen, bot, test_examples)
"""
import json
import math
import os
import random
import re
import time
from collections import Counter

import numpy as np

import answer_engine as ae
from intyoza_core import normalize

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = ae.WRITER_DIR
AGES = ["10-14", "15-19", "20-24"]
K_APPROVED, K_DOCS, K_DEMO_TRAIN, DOC_WORDS = 3, 1, 1, 90   # sources per training example (short: fits and trains fast)
WELLBEING_TOPICS = {"Emotional wellbeing", "Alcohol and drugs"}

OFF_TOPIC = [  # messages Intyoza should politely decline (scope off_topic)
    "Who won the football match yesterday?", "Ninde watsinze umukino w'umupira ejo?", "APR yatsinze Rayon?",
    "Mbwira uko bateka ibishyimbo", "How do I cook rice?", "Nteka nte isombe?", "What is the capital of France?",
    "Umurwa mukuru wa Kenya ni uwuhe?", "Solve 2x + 5 = 11", "Mfasha gukora umukoro w'imibare", "Explain photosynthesis",
    "Sobanura uko ibimera bikora ibiryo", "Write me a poem about the sea", "Nyandikira indirimbo y'urukundo",
    "Who is the best singer in Rwanda?", "Ni nde muhanzi ukunzwe cyane mu Rwanda?", "How much is a phone in Kigali?",
    "Telefoni ya iPhone igura angahe?", "How do I make money online?", "Nabona akazi nte?", "What is Bitcoin?",
    "Mbwira inkuru isekeje", "Tell me a joke", "What time is it?", "Ni saa ngahe?", "How do I fix my laptop?",
    "Mudasobwa yanjye yanze kwaka", "Which university is best in Rwanda?", "Kaminuza nziza mu Rwanda ni iyihe?",
    "Translate 'good morning' into French", "Hindura 'mwaramutse' mu Cyongereza", "How do I learn to drive?",
    "Uruhushya rwo gutwara imodoka barubona bate?", "What is the weather in Musanze?", "Ikirere kimeze gute i Huye?",
    "Who is the president of the USA?", "How do I start a business?", "Natangira nte ubucuruzi?", "Recommend a movie",
    "Mbwira filime nziza", "How do I install WhatsApp?", "Ese Messi aruta Ronaldo?", "How many planets are there?",
]
CONTINUATIONS = ["Murakoze. Ikindi kibazo:", "Ok. Ndashaka no kumenya:", "Thanks. Another question:", ""]

# Made-up account details for training, so the model learns to use a profile without depending on it.
DISTRICTS = ["Gasabo", "Kicukiro", "Nyarugenge", "Musanze", "Huye", "Rubavu", "Nyagatare", "Rusizi", "Muhanga",
             "Kayonza", "Karongi", "Bugesera", "Rwamagana", "Nyamagabe", "Gicumbi"]
TOPICS = ["periods", "puberty", "contraception", "pregnancy", "STIs", "HIV", "relationships", "consent", "feelings",
          "alcohol"]
CONVERSATIONS_FILE = "Intyoza_Training_Conversations.xlsx"


def random_profile(rng, lang):
    """A made-up profile; about a third of the examples have none, as when the backend sends nothing."""
    if rng.random() < 0.33:
        return None
    return {"ageBand": rng.choice(["AGE_10_14", "AGE_15_19", "AGE_20_24", "UNKNOWN"]),
            "gender": rng.choice(["female", "male", "not given"]), "district": rng.choice(DISTRICTS),
            "language": "Kinyarwanda" if lang == "rw" else "English",
            "pastTopics": rng.sample(TOPICS, rng.randint(0, 3))}


def load_conversations(folder=HERE, include_drafts=None):
    """The training conversations: the "Conversations" tab of the dataset workbook (the Google Sheet, downloaded by
    kaggle_setup) or knowledge/Intyoza_Training_Conversations.xlsx. Only rows with Review status "Approved" are used
    (INTYOZA_INCLUDE_DRAFTS=1 also uses Draft rows, for testing). Several rows with the same Conversation ID, Turn and
    Language are several good replies to the same situation.
    -> [{"id", "skill", "lang", "turns": [{"say", "replies": [...], "sources": [ids]}]}]"""
    import pandas as pd
    include_drafts = os.environ.get("INTYOZA_INCLUDE_DRAFTS") == "1" if include_drafts is None else include_drafts
    table = None
    for path, sheet in ((os.path.join(folder, "knowledge", "Intyoza_Dataset.xlsx"), "Conversations"),
                        (os.path.join(folder, "knowledge", CONVERSATIONS_FILE), "Conversations")):
        if os.path.exists(path):
            try:
                table = pd.read_excel(path, sheet_name=sheet)
                break
            except ValueError:            # no such tab
                continue
    if table is None:
        return []
    table = table.rename(columns=lambda c: str(c).strip())
    ok = {"approved"} | ({"draft"} if include_drafts else set())
    table = table[table["Review status"].astype(str).str.strip().str.lower().isin(ok)]
    convs = {}
    for _, r in table.iterrows():
        if pd.isna(r["Conversation ID"]) or pd.isna(r["Turn"]) or pd.isna(r["Intyoza (the reply we want)"]):
            continue                      # an empty row (e.g. a Review status copied down past the last row)
        key = (str(r["Conversation ID"]).strip(), str(r.get("Language") or "en").strip().lower())
        c = convs.setdefault(key, {"id": key[0], "skill": str(r.get("Skill") or ""), "lang": key[1], "turns": {}})
        t = c["turns"].setdefault(int(r["Turn"]), {"say": str(r["Young person"]).strip(), "replies": [], "sources": []})
        t["replies"].append(str(r["Intyoza (the reply we want)"]).strip())
        t["sources"] += [x.strip() for x in str(r.get("Sources (approved IDs)") or "").replace(",", ";").split(";")
                         if x.strip() and x.strip().lower() != "nan" and x.strip() not in t["sources"]]
    out = []
    for c in convs.values():
        c["turns"] = [c["turns"][k] for k in sorted(c["turns"])]
        out.append(c)
    return sorted(out, key=lambda c: (c["id"], c["lang"]))


# The approved answers that make a turn a crisis turn (when its words alone don't say it: "he touches my breasts...")
CRISIS_SOURCES = {"EMO-002": "selfharm", "EMO-012": "selfharm", "GBV-001": "violence", "GBV-002": "violence",
                  "REL-008": "violence", "DRG-004": "medical"}


def _split_of(conv_id, test_share=0.15):
    """A conversation is in the test split or the training split as a whole (stable: by its id)."""
    import zlib
    return "test" if zlib.crc32(conv_id.encode()) % 100 < test_share * 100 else "train"


def build_conversation_examples(bot, kb, convs, split="train", seed=0, profiles_per_reply=1):
    """talk and crisis examples from whole conversations (only the conversations of this split)."""
    import crisis
    rng = random.Random(seed + 11)
    out = []
    for c in convs:
        if _split_of(c["id"]) != split:
            continue
        lang, history = c["lang"], []
        for n, t in enumerate(c["turns"]):
            age = rng.choice(AGES[:2] if "puberty" in c["skill"] else AGES)
            u = {"question_rw": t["say"], "question_en": t["say"], "searches": [t["say"]]}
            ids = [i for i in t["sources"] if i in bot.qa]
            # conversations from phrasings (many, one reply each) get one profile; hand-written ones get profiles_per_reply
            per_reply = 1 if c["skill"].startswith("from phrasing") else profiles_per_reply
            for reply in t["replies"]:
                for _ in range(per_reply):
                    profile = random_profile(rng, lang)
                    src = _sources(kb, bot, [t["say"]] + [bot.qa[i]["q_en"] for i in ids], age, rng=rng, lang=lang,
                                   exclude=set(ids))
                    for i in ids:                       # the approved answers the reply is built on, at random places
                        src.insert(rng.randrange(len(src) + 1), ae.approved_source(bot.qa[i], age, lang=lang))
                    pos = [k + 1 for k, s in enumerate(src) if s.get("id") in ids]
                    system, user = ae.talk_prompt(t["say"], u, src, age, lang, ae.depth_of(t["say"]), history,
                                                  profile=profile)
                    target = reply + (f"\nSOURCES: {', '.join(f'S{p}' for p in pos)}" if pos else "")
                    out.append({"task": "talk", "qa_id": ids[0] if ids else None, "lang": lang, "system": system,
                                "user": user, "target": target, "message": t["say"], "age": age, "conv": c["id"],
                                "sources_text": " ".join(s["text"] for s in src)})
                    kind = (crisis.word_kind(t["say"] + " " + " ".join(x for _, x in history[-2:]))
                            or next((CRISIS_SOURCES[i] for i in t["sources"] if i in CRISIS_SOURCES), None))
                    if kind and re.search(r"\b(112|114|116|3029)\b", reply) and not crisis.required_problems(reply, kind):
                        # (a crisis reply that misses an approved safety number is not used for the crisis job, so the
                        # model never learns to leave one out)
                        # a crisis reply (it gives help): also learned with crisis.py's own prompt
                        help_txt = crisis.help_text(bot, kind, lang)
                        fill = {"age": age, "language": crisis.LANG.get(lang, "English"), "details": t["say"][:160],
                                "situation": crisis.SITUATION[kind], "required": crisis.REQUIRED_TEXT.get(kind, "")}
                        system, user = crisis.crisis_prompt(crisis.SYSTEM_CRISIS.format(**fill), t["say"], history,
                                                            help_txt, profile)
                        out.append({"task": "crisis", "qa_id": None, "lang": lang, "system": system, "user": user,
                                    "target": reply, "message": t["say"], "age": age, "conv": c["id"], "kind": kind,
                                    "sources_text": help_txt})
            history = history + [("user", t["say"]), ("bot", rng.choice(t["replies"]))]   # varied history too
    rng.shuffle(out)
    return out


# ===================================================================== training examples
def target_answer(bot, q, lang, age):
    """The approved answer as Intyoza gives it (age group version, referral line), like Bot.answer()."""
    block = q["answers"].get(age) or q["answers"]["default"]
    text = block.get(lang) or q["answers"]["default"].get(lang) or block.get("en", "")
    if q.get("referral"):
        ref = q["referral"]
        if lang == "rw":
            tr = bot.d.get("referral_rw", {})
            ref = "; ".join(tr.get(p.strip(), p.strip()) for p in ref.split(";") if p.strip())
        text += f"\n\n{'Aho wajya' if lang == 'rw' else 'Where to go'}: {ref}"
    return text


def _sources(kb, bot, queries, age, include=None, exclude=(), rng=None, include_demo=None, exclude_demo=(), lang=None):
    """Approved answers + demo items (when the knowledge has demo data) + short document passages, in the same
    order as the engine. `include` / `include_demo` are put at a random place among their kind."""
    approved, docs = kb.search(queries, k_approved=K_APPROVED + 3, k_docs=K_DOCS)
    ids = [qid for qid, _ in approved if qid not in exclude and qid != include][:K_APPROVED - (1 if include else 0)]
    if include:
        ids.insert(rng.randrange(len(ids) + 1), include)
    src = [ae.approved_source(bot.qa[i], age, lang=lang) for i in ids]
    if kb.demo:
        k = max(K_DEMO_TRAIN, 1 if include_demo else 0)
        demo = [it for it, _ in kb.search_demo(queries, k=k + 3)
                if it["id"] not in exclude_demo and (not include_demo or it["id"] != include_demo["id"])][:k - (1 if include_demo else 0)]
        if include_demo:
            demo.insert(rng.randrange(len(demo) + 1), include_demo)
        src += [ae.demo_source(it) for it in demo]
    for p, _ in docs:
        note, year = kb.note_for(p["source"])
        src.append(ae.document_source(p, note, year, max_words=DOC_WORDS))
    return src


def build_demo_examples(bot, kb, n_write=120, n_check=60, n_understand=60, split="train", seed=0):
    """Examples from the demo data (English questions and answers; Kinyarwanda questions where translated).
    The demo items are split 85/15 by item, so test items are never seen in training."""
    rng = random.Random(seed + 7)
    items = sorted(kb.demo, key=lambda it: it["id"])
    random.Random(1).shuffle(items)
    cut = int(len(items) * 0.85)
    items = items[:cut] if split == "train" else items[cut:]
    if not items:
        return []
    out = []
    u_for = lambda it: {"question_rw": (it.get("questions_rw") or [it["q_en"]])[0], "question_en": it["q_en"],
                        "searches": [it["q_en"]]}
    for n in range(n_write):
        it = items[n % len(items)]
        msg = rng.choice(it["questions_en"])
        age, u = rng.choice(AGES[1:]), u_for(it)
        src = _sources(kb, bot, [msg, it["q_en"]], age, include_demo=it, rng=rng, lang="en")
        pos = next(i for i, x in enumerate(src) if x.get("demo_id") == it["id"])
        system, user = ae.write_prompt(msg, u, src, age, "en")
        out.append({"task": "write", "qa_id": None, "demo_id": it["id"], "lang": "en", "system": system, "user": user,
                    "target": f"{it['answer_en']}\nSOURCES: S{pos + 1}", "source_pos": pos, "message": msg, "age": age})
    for n in range(n_check):
        it = items[(n * 7) % len(items)]
        msg = rng.choice(it["questions_en"])
        age = rng.choice(AGES[1:])
        src = _sources(kb, bot, [msg, it["q_en"]], age, include_demo=it, rng=rng, lang="en")
        others = [x for x in src if x.get("demo_id") and x["demo_id"] != it["id"]]
        if n % 2 and others:
            other = next(o for o in kb.demo if o["id"] == others[0]["demo_id"])
            reply, kind = other["answer_en"], "nearby"
            label = ae.check_json(answers_question=False, problems=f"It answers a different question: {other['q_en']}")
        else:
            reply, kind, label = it["answer_en"], "right", ae.check_json()
        system, user = ae.check_prompt(reply, src, it["q_en"], age, "en")
        out.append({"task": "check", "check_kind": kind, "qa_id": None, "lang": "en", "system": system, "user": user,
                    "target": label, "message": msg, "age": age})
    translated = [it for it in items if it.get("questions_rw")]
    for n in range(min(n_understand, len(translated))):
        it = translated[n]
        msg = it["questions_rw"][0]
        system, user = ae.understand_prompt(msg, [])
        out.append({"task": "understand", "qa_id": None, "lang": "rw", "system": system, "user": user,
                    "target": ae.understanding_json(msg, it["q_en"], [it["q_en"]], "srh", False), "message": msg})
    return out


def _change_number(text, rng):
    nums = list(re.finditer(r"\b\d+\b", text))
    if not nums:
        return None, None
    m = rng.choice(nums)
    new = str(int(m.group()) + rng.choice([1, 2, 3, 5, 10]))
    return text[:m.start()] + new + text[m.end():], new


def build_examples(bot, docs, ex, split="train", n_write=0, n_not_covered=60, n_check=300, n_understand=300,
                   seed=0, kb=None, demo_sizes=None, conversations=None, profiles_per_reply=None):
    """Training (or test) examples, from one split of the phrasings and of the conversations only.
    n_write: the old "copy the approved answer" task, 0 by default (it taught the same words for everyone).
    conversations: load_conversations() (default: loaded here). profiles_per_reply: how many made-up profiles each
    good reply is trained with (default 2 for training, 1 for test).
    demo_sizes: dict for build_demo_examples (n_write, n_check, n_understand) when kb has demo data."""
    rng = random.Random(seed)
    kb = kb or ae.KnowledgeBase(bot, docs)
    qa = bot.qa
    pool = [e for e in ex if e["split"] == split and e.get("qa_id") in qa and e["lang"] in ("rw", "en")]
    rng.shuffle(pool)
    out, cursor = [], [0]

    def pick(n):            # the next n phrasings (each task gets different ones)
        items = [pool[(cursor[0] + i) % len(pool)] for i in range(n)] if pool else []
        cursor[0] += n
        return items

    def u_for(q):
        return {"question_rw": q.get("q_rw") or q["q_en"], "question_en": q["q_en"], "searches": [q["q_en"]]}

    def age_for(q):
        return q["age"] if q.get("age") in AGES and rng.random() < 0.6 else rng.choice(AGES)

    same = bot.index.same
    # write: the right answer is among the sources
    for e in pick(n_write):
        q, lang = qa[e["qa_id"]], e["lang"]
        age, u = age_for(q), u_for(q)
        src = _sources(kb, bot, [e["text"], u["question_rw"], u["question_en"]], age, include=q["id"], lang=lang,
                       exclude=same.get(q["id"], {q["id"]}), rng=rng)
        pos = next(i for i, s in enumerate(src) if s["id"] == q["id"])
        system, user = ae.write_prompt(e["text"], u, src, age, lang)
        out.append({"task": "write", "qa_id": q["id"], "lang": lang, "system": system, "user": user,
                    "target": f"{target_answer(bot, q, lang, age)}\nSOURCES: S{pos + 1}", "source_pos": pos,
                    "message": e["text"], "age": age})
    # not covered: sources found for a question from another topic
    for e in pick(n_not_covered):
        q, lang = qa[e["qa_id"]], e["lang"]
        others = [o for o in qa.values() if o["topic"] != q["topic"] and o["id"] not in same.get(q["id"], {q["id"]})]
        other = rng.choice(others)
        age, u = age_for(q), u_for(q)
        src = _sources(kb, bot, [other["q_en"], other.get("q_rw", "")], age, rng=rng, lang=lang,
                       exclude={i for i in qa if qa[i]["topic"] == q["topic"]} | same.get(q["id"], {q["id"]}))
        system, user = ae.talk_prompt(e["text"], u, src, age, lang, ae.depth_of(e["text"]),
                                      profile=random_profile(rng, lang))
        out.append({"task": "not_covered", "qa_id": q["id"], "lang": lang, "system": system, "user": user,
                    "target": "NOT_COVERED", "message": e["text"], "age": age})
    # check: right answer / the answer of the closest OTHER question / a changed number
    for n, e in enumerate(pick(n_check)):
        q, lang = qa[e["qa_id"]], e["lang"]
        age, u = age_for(q), u_for(q)
        src = _sources(kb, bot, [e["text"], u["question_en"]], age, include=q["id"], lang=lang,
                       exclude=same.get(q["id"], {q["id"]}), rng=rng)
        right = target_answer(bot, q, lang, age)
        kind = ("right", "nearby", "number")[n % 3]
        if kind == "nearby":
            near = [s["id"] for s in src if s["id"] and s["id"] not in same.get(q["id"], {q["id"]})]
            if not near:
                kind = "right"
            else:
                other = qa[near[0]]
                reply = target_answer(bot, other, lang, age)
                label = ae.check_json(answers_question=False, problems=f"It answers a different question: {other['q_en']}")
        if kind == "number":
            reply, new = _change_number(right, rng)
            if reply is None:
                kind = "right"
            else:
                label = ae.check_json(supported=False, unsupported=[f"the number {new}"],
                                      problems=f"The number {new} is not in the sources.")
        if kind == "right":
            reply, label = right, ae.check_json()
        system, user = ae.check_prompt(reply, src, q["q_en"], age, lang)
        out.append({"task": "check", "check_kind": kind, "qa_id": q["id"], "lang": lang, "system": system,
                    "user": user, "target": label, "message": e["text"], "age": age})
    # understand: the full question in both languages; sometimes after an unrelated earlier exchange
    for e in pick(n_understand):
        q = qa[e["qa_id"]]
        history = []
        if rng.random() < 0.3:
            prev = rng.choice(list(qa.values()))
            history = [("user", prev.get("q_rw") or prev["q_en"]),
                       ("bot", target_answer(bot, prev, "rw", "15-19"))]
        msg = (rng.choice(CONTINUATIONS) + " " + e["text"]).strip() if history else e["text"]
        scope = "wellbeing" if q["topic"] in WELLBEING_TOPICS else "srh"
        system, user = ae.understand_prompt(msg, history)
        target = ae.understanding_json(q.get("q_rw") or q["q_en"], q["q_en"], [q["q_en"]], scope,
                                       e.get("risk") == "Emergency")
        out.append({"task": "understand", "qa_id": q["id"], "lang": e["lang"], "system": system, "user": user,
                    "target": target, "message": msg})
    offs = OFF_TOPIC[: len(OFF_TOPIC) * 3 // 4] if split == "train" else OFF_TOPIC[len(OFF_TOPIC) * 3 // 4:]
    for m in offs:
        system, user = ae.understand_prompt(m, [])
        out.append({"task": "understand", "qa_id": None, "lang": "rw", "system": system, "user": user,
                    "target": ae.understanding_json(m, m, [], "off_topic", False), "message": m})
    if kb.demo:
        sizes = demo_sizes or ({"n_write": 0} if split == "train" else {"n_write": 0, "n_check": 10, "n_understand": 10})
        out += build_demo_examples(bot, kb, split=split, seed=seed, **sizes)
    convs = load_conversations() if conversations is None else conversations
    conv_ex = build_conversation_examples(bot, kb, convs, split=split, seed=seed,
                                          profiles_per_reply=profiles_per_reply or (2 if split == "train" else 1))
    if split == "test":
        # the test keeps every crisis example and at most 40 talk examples, so the evaluation stays under an hour
        talk = [e for e in conv_ex if e["task"] == "talk"]
        random.Random(seed + 3).shuffle(talk)
        conv_ex = [e for e in conv_ex if e["task"] != "talk"] + talk[:40]
    out += conv_ex
    rng.shuffle(out)
    return out


def summary_of(examples):
    c = Counter(e["task"] + (f" ({e['check_kind']})" if e["task"] == "check" else "") for e in examples)
    return dict(sorted(c.items()))


# ===================================================================== model
def load_model(base_ids=None, four_bit=None, max_new_tokens=500):
    """The base answer model (4-bit on a GPU, so it can be trained on a T4)."""
    import torch
    from chatbot import Generator
    four_bit = torch.cuda.is_available() if four_bit is None else four_bit
    return Generator(model_ids=base_ids, max_new_tokens=max_new_tokens, four_bit=four_bit)


def _text_linear_layers(model):
    """Full names of the language model's linear layers (not the vision part, not the output layer)."""
    import torch
    names = [n for n, m in model.named_modules() if isinstance(m, torch.nn.Linear)
             and not re.search(r"visual|vision|lm_head|embed|merger|patch", n)]
    return names


def encode(gen, ex, max_len):
    p = gen.tok(gen.prompt(ex["system"], ex["user"]), add_special_tokens=False)["input_ids"]
    from chatbot import end_token
    t = gen.tok(ex["target"] + end_token(gen.tok), add_special_tokens=False)["input_ids"]
    if len(p) + len(t) > max_len:
        return None
    return p + t, [-100] * len(p) + t


def answer_loss(model, x, ids, labels, torch):
    """Loss on the answer tokens only, computing the output layer only for them (logits_to_keep). The full
    output layer over a 2,000-token prompt and a 250,000-word vocabulary needs about 2 GB more GPU memory."""
    n = sum(1 for l in labels if l != -100)          # answer tokens, at the end of the sequence
    try:
        logits = model(input_ids=x, logits_to_keep=n + 1).logits[:, :-1, :]
    except TypeError:                                  # older model code: compute all, keep the end
        logits = model(input_ids=x).logits[:, -(n + 1):-1, :]
    target = torch.tensor([ids[-n:]], device=x.device)
    return torch.nn.functional.cross_entropy(logits.float().reshape(-1, logits.shape[-1]), target.reshape(-1))


def train(gen, examples, out_dir=OUT_DIR, epochs=1, lr=2e-4, rank=16, alpha=32, dropout=0.05, grad_accum=8,
          max_len=2560, save_every=50, time_limit_min=None, resume=True, seed=0, log=print):
    """LoRA fine-tuning on the examples. Saves the adapter to out_dir (and a checkpoint every `save_every` steps
    to out_dir + '_checkpoint', so a Colab disconnect does not lose the work: run again to continue)."""
    import warnings
    import torch
    from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training, set_peft_model_state_dict
    model = gen.model
    cuda = torch.cuda.is_available() and next(model.parameters()).is_cuda
    if getattr(gen, "four_bit", False):
        model = prepare_model_for_kbit_training(model, use_gradient_checkpointing=True)
    elif cuda:
        model.gradient_checkpointing_enable()
    if hasattr(model, "enable_input_require_grads"):
        model.enable_input_require_grads()
    if not hasattr(model, "peft_config"):
        cfg = LoraConfig(r=rank, lora_alpha=alpha, lora_dropout=dropout, bias="none", task_type="CAUSAL_LM",
                         target_modules=_text_linear_layers(model))
        model = get_peft_model(model, cfg)
    ckpt = out_dir + "_checkpoint"
    done = 0
    if resume and os.path.exists(os.path.join(ckpt, "progress.json")):
        from safetensors.torch import load_file
        state = load_file(os.path.join(ckpt, "adapter_model.safetensors"))
        set_peft_model_state_dict(model, state)
        done = json.load(open(os.path.join(ckpt, "progress.json")))["step"]
        log(f"Continuing from the checkpoint: step {done}")
    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    total = sum(p.numel() for p in model.parameters())
    log(f"Trainable parameters: {trainable:,} of {total:,} ({100 * trainable / total:.2f}%)")

    enc = [(e["task"], encode(gen, e, max_len)) for e in examples]
    data = [x for _, x in enc if x]
    kept, dropped = Counter(t for t, x in enc if x), Counter(t for t, x in enc if not x)
    log(f"{len(data)} examples used, longest {max(len(i) for i, _ in data)} tokens. Per task (used / too long): "
        + ", ".join(f"{t} {kept[t]}/{dropped[t]}" for t in sorted(set(kept) | set(dropped))))
    if sum(dropped.values()) > 0.1 * len(examples):
        log("WARNING: more than 10% of the examples are too long for max_len: raise max_len or use fewer sources.")
    rng = random.Random(seed)
    order = [i for _ in range(epochs) for i in rng.sample(range(len(data)), len(data))]
    steps = math.ceil(len(order) / grad_accum)
    params = [p for p in model.parameters() if p.requires_grad]
    opt = torch.optim.AdamW(params, lr=lr, weight_decay=0.0)
    sched = torch.optim.lr_scheduler.LambdaLR(
        opt, lambda s: min(1.0, (s + 1) / max(1, steps // 20)) * max(0.0, (steps - s) / steps))
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        for _ in range(done):
            sched.step()
    scaler = torch.amp.GradScaler("cuda", enabled=cuda)
    device = next(p for p in model.parameters()).device
    model.train()
    start, losses, history, stopped_early, step = time.time(), [], [], False, done - 1
    for step in range(done, steps):
        for i in order[step * grad_accum:(step + 1) * grad_accum]:
            ids, labels = data[i]
            x = torch.tensor([ids], device=device)
            with torch.autocast("cuda", dtype=torch.float16, enabled=cuda):
                loss = answer_loss(model, x, ids, labels, torch) / grad_accum
            scaler.scale(loss).backward()
            losses.append(loss.item() * grad_accum)
        scaler.unscale_(opt)
        torch.nn.utils.clip_grad_norm_(params, 1.0)
        scaler.step(opt)
        scaler.update()
        opt.zero_grad(set_to_none=True)
        sched.step()
        if (step + 1) % 10 == 0 or step + 1 == steps:
            avg = float(np.mean(losses[-10 * grad_accum:]))
            history.append({"step": step + 1, "loss": round(avg, 4)})
            el = time.time() - start
            log(f"step {step + 1}/{steps}  loss {avg:.3f}  ({el / 60:.1f} min, about "
                f"{el / (step + 1 - done) * (steps - step - 1) / 60:.0f} min left)")
        if (step + 1) % save_every == 0 or step + 1 == steps:
            model.save_pretrained(ckpt)
            json.dump({"step": step + 1, "steps": steps}, open(os.path.join(ckpt, "progress.json"), "w"))
        if time_limit_min and (time.time() - start) / 60 > time_limit_min:
            log(f"Time limit reached at step {step + 1}/{steps}: the model trained so far is saved and used.")
            model.save_pretrained(ckpt)
            json.dump({"step": step + 1, "steps": steps}, open(os.path.join(ckpt, "progress.json"), "w"))
            stopped_early = True
            break
    model.eval()
    try:                                   # back to fast generation (cache on, no checkpointing)
        model.gradient_checkpointing_disable()
    except Exception:
        pass
    for m in (model, getattr(model, "base_model", None)):
        if getattr(m, "config", None) is not None:
            m.config.use_cache = True
    gen.model = model
    finished = step + 1 == steps
    if finished or stopped_early:
        save(gen, out_dir, examples, history, settings={"epochs": epochs, "lr": lr, "rank": rank, "alpha": alpha,
                                                         "grad_accum": grad_accum, "max_len": max_len})
        log(f"Saved Intyoza's answer model to {out_dir}")
    return history, finished


def save(gen, out_dir, examples=None, history=None, settings=None, metrics=None):
    os.makedirs(out_dir, exist_ok=True)
    gen.model.save_pretrained(out_dir)
    gen.adapter_loaded = True
    meta = {"base_model": gen.model_id, "licence": "base model CC-BY-4.0 (McGill-NLP AfriqueQwen); adapter: Intyoza",
            "created": time.strftime("%Y-%m-%d %H:%M"), "examples": summary_of(examples or []),
            "settings": settings or {}, "loss_history": history or [],
            # read by answer_engine.trained_jobs(): "talk" / "crisis" switch those replies to this fine-tuning
            "jobs": sorted({"write" if e["task"] == "write" else e["task"] for e in examples or []})}
    path = os.path.join(out_dir, "intyoza_writer.json")
    if os.path.exists(path) and metrics is None:
        metrics = json.load(open(path)).get("metrics")
    meta["metrics"] = metrics or {}
    json.dump(meta, open(path, "w"), indent=1)


# ===================================================================== evaluation
def chrf(hyp, ref, n=6, beta=2.0):
    """Character n-gram F-score (0-100). Used only to measure how SIMILAR replies to the same situation are (lower =
    more varied); it is no longer a target (closeness to the approved answer rewarded copying)."""
    def grams(t, k):
        t = re.sub(r"\s+", " ", t.lower().strip())
        return Counter(t[i:i + k] for i in range(len(t) - k + 1))
    ps, rs = [], []
    for k in range(1, n + 1):
        h, r = grams(hyp, k), grams(ref, k)
        if not h or not r:
            continue
        m = sum((h & r).values())
        ps.append(m / sum(h.values()))
        rs.append(m / sum(r.values()))
    if not ps:
        return 0.0
    p, r = np.mean(ps), np.mean(rs)
    return 0.0 if p + r == 0 else float(100 * (1 + beta ** 2) * p * r / (beta ** 2 * p + r))


def facts_ok(bot, reply, sources_text, message, lang):
    """No number, age, law number or phone number that is not in the sources; no dose; the right language."""
    allowed = ae._numbers(sources_text + " " + message + " " + bot.d["replies"]["help_short"]["en"])
    if ae._numbers(reply) - allowed:
        return False
    if ae.DOSE.search(reply) and not ae.DOSE.search(sources_text):
        return False
    return bot.detect_lang(normalize(reply), lang) == lang


def evaluate(gen, bot, examples, kb=None, limit=None, log=print, variety_samples=12):
    """Runs the model on test examples. Returns (metrics, table).
    variety_samples: for this many talk examples, two more replies are written to measure how much replies to the
    same situation differ (two young people asking the same thing should not get the same words)."""
    import crisis
    import pandas as pd
    kb = kb or ae.KnowledgeBase(bot, None)
    rows, varied = [], []
    for n, e in enumerate(examples[:limit] if limit else examples):
        temp = {"talk": 0.7, "crisis": 0.3}.get(e["task"], 0.0)
        out = gen.chat(e["system"], e["user"], max_new_tokens=450 if e["task"] in ("write", "talk", "crisis") else 260,
                       temperature=temp)
        if e["task"] in ("talk", "crisis"):
            reply, _ = ae.split_sources(out, [None] * 12)
            r = {"task": e["task"], "kind": e.get("kind", ""), "lang": e["lang"], "message": e["message"],
                 "output": out, "expected": e["target"]}
            refused = "NOT_COVERED" in out.upper()
            r["refused"] = refused
            if not refused:
                r["facts correct (no invented numbers, laws, phones)"] = facts_ok(bot, reply, e["sources_text"],
                                                                                   e["message"], e["lang"])
                end = " ".join(re.split(r"(?<=[.!?])\s+", reply.strip())[-2:])
                r["ends with a question or offer"] = "?" in end or bool(ae.OFFER.search(end))
                r["no stock opening"] = not ae.STOCK_OPENING.search(reply)
                if e["task"] == "crisis":
                    r["gives the approved safety numbers exactly"] = not crisis.required_problems(reply, e["kind"])
                if e["task"] == "talk" and len(varied) < variety_samples:
                    more = [ae.split_sources(gen.chat(e["system"], e["user"], max_new_tokens=450, temperature=0.7),
                                             [None] * 12)[0] for _ in range(2)]
                    replies = [reply] + more
                    sims = [chrf(a, b) for i, a in enumerate(replies) for b in replies[i + 1:]]
                    varied.append(float(np.mean(sims)))
            rows.append(r)
            continue
        r = {"task": e["task"], "kind": e.get("check_kind", ""), "lang": e["lang"], "message": e["message"],
             "output": out, "expected": e["target"]}
        if e["task"] in ("write", "not_covered"):
            refused = "NOT_COVERED" in out.upper()
            r["refused"] = refused
            if e["task"] == "write" and not refused:
                reply, used = ae.split_sources(out, [None] * 8)
                expected = e["target"].rsplit("\nSOURCES:", 1)[0]
                srcs = [{"text": e["user"]}]
                r["rules passed"] = not ae.rule_problems(bot, reply, srcs, e["message"], e["lang"])
                r["cites the right source"] = e["source_pos"] in used
                r["chrF"] = round(chrf(reply, expected), 1)
        elif e["task"] == "check":
            v = ae._json(out) or {}
            r["valid"] = bool(v)
            if e["check_kind"] == "nearby":
                r["correct"] = v.get("answers_question") is False
            elif e["check_kind"] == "number":
                r["correct"] = v.get("supported") is False
            else:
                r["correct"] = v.get("answers_question") is True and v.get("supported") is True
        else:
            u = ae.parse_understanding(out, e["message"])
            r["valid"] = ae._json(out) is not None
            want = json.loads(e["target"])
            r["scope correct"] = u["scope"] == want["scope"]
            if e["qa_id"]:
                raw = kb.search([e["message"]], k_approved=4, k_docs=0)[0]
                read = kb.search([e["message"], u["question_rw"], u["question_en"]] + u["searches"], k_approved=4, k_docs=0)[0]
                same = bot.index.same.get(e["qa_id"], {e["qa_id"]})
                r["search finds it (message only)"] = any(i in same for i, _ in raw)
                r["search finds it (understood)"] = any(i in same for i, _ in read)
        rows.append(r)
        if log and (n + 1) % 20 == 0:
            log(f"  {n + 1} done")
    t = pd.DataFrame(rows)

    def mean(mask, col):
        x = t.loc[mask, col].dropna() if col in t else []
        return round(float(x.astype(float).mean()), 3) if len(x) else None
    w, nc, ch, un, tk, cr = (t["task"] == k for k in ("write", "not_covered", "check", "understand", "talk", "crisis"))
    m = {"talk: answered (not refused)": round(1 - float(t.loc[tk, "refused"].mean()), 3) if tk.any() else None,
         "talk: facts correct (no invented numbers, laws, phones)": mean(tk, "facts correct (no invented numbers, laws, phones)"),
         "talk: ends with a question or offer": mean(tk, "ends with a question or offer"),
         "talk: no stock opening": mean(tk, "no stock opening"),
         "talk: similarity of replies to the same situation (chrF, lower = more varied)":
             round(float(np.mean(varied)), 1) if varied else None,
         "crisis: gives the approved safety numbers exactly": mean(cr, "gives the approved safety numbers exactly"),
         "crisis: facts correct": mean(cr, "facts correct (no invented numbers, laws, phones)"),
         "crisis: ends with a question": mean(cr, "ends with a question or offer"),
         "write (old task): answered (not refused)": round(1 - float(t.loc[w, "refused"].mean()), 3) if w.any() else None,
         "write (old task): rules passed": mean(w, "rules passed"),
         "not covered: correctly refused": mean(nc, "refused"),
         "check: correct verdicts": mean(ch, "correct"),
         "check: catches the answer of a nearby question": mean(ch & (t["kind"] == "nearby"), "correct"),
         "check: catches a changed number": mean(ch & (t["kind"] == "number"), "correct"),
         "check: accepts the right answer": mean(ch & (t["kind"] == "right"), "correct"),
         "understand: valid output": mean(un, "valid"),
         "understand: scope correct": mean(un, "scope correct"),
         "understand: search finds the question (message only)": mean(un, "search finds it (message only)"),
         "understand: search finds the question (understood)": mean(un, "search finds it (understood)")}
    return m, t


# ===================================================================== conversations from phrasings (2026-11-10)
# More training conversations, written by Intyoza's own model for the team to spot-check and approve:
#     rows = writer_training.conversations_from_phrasings(chat, folder=".", out_path="/kaggle/working/Intyoza_Conversations_From_Phrasings.xlsx",
#                                                n=1000, time_limit_h=5)
# The young person's messages are real ways of asking from the Phrasings tab (English, training split only, no crisis
# questions). Intyoza's replies are written by the running chat (the service's code and model, a made-up profile,
# more varied wording); only replies that pass every check are kept: facts from the sources, short, ending with a
# question or an offer, not a pasted approved answer. Some conversations get a second turn ("tell me more").
# The result has the columns of the Conversations tab (Review status: Draft) and a "Spot check" column marking a
# random 10% to read first. Progress is saved every 25 conversations.
FOLLOW_UP_MESSAGES = {"en": ["tell me more", "explain it more simply", "what should i do?", "where can i get help with that?",
                           "is that normal?", "how do i know?", "ok, and what else?", "why?"],
                    "rw": ["mbwira byinshi", "bisobanure mu buryo bworoshye", "nakora iki?", "nabona ubufasha he?",
                           "ese ni ibisanzwe?", "nabimenya nte?", "kuki?"]}
CONVERSATION_COLUMNS = ["Conversation ID", "Skill", "Turn", "Young person", "Intyoza (the reply we want)", "Sources (approved IDs)",
           "Language", "Review status", "Reviewer comment", "Spot check"]
AGE_BANDS = {"10-14": "AGE_10_14", "15-19": "AGE_15_19", "20-24": "AGE_20_24"}
QID_RE = re.compile(r"\b[A-Z]{2,4}-\d{3}\b")
FILLER_LINES = ("Want me to explain more?", "Where to go:")       # the fixed offer line and a pasted referral


def phrasings_for_conversations(folder=".", n=1000, per_question=None, seed=0):
    """Ways of asking each approved question (training split, not crisis), shuffled, at most n:
    per_question {language: how many}, default 2 in English and 1 in Kinyarwanda (the model has no Kinyarwanda
    conversations yet). -> [(question id, text, age group, language)]"""
    per_question = per_question or {"en": 2, "rw": 1}
    import pandas as pd
    path = os.path.join(folder, "knowledge", "Intyoza_Dataset.xlsx")
    ph = pd.read_excel(path, sheet_name="Phrasings")
    qs = pd.read_excel(path, sheet_name="Questions").set_index("ID")
    ph = ph[(ph["Language"].astype(str).str.lower().isin(list(per_question)))
            & (ph["Train/Test"].astype(str).str.lower() == "train")
            & (ph["Intent"].astype(str).str.lower() == "health")
            & (~ph["Risk"].astype(str).isin(["High", "Emergency"]))]
    calm = {i for i, r in qs["Risk"].items() if str(r) not in ("High", "Emergency")}
    ph = ph[ph["Question ID"].isin(calm)]
    rng = random.Random(seed)
    items = []
    for (qid, lang), group in ph.groupby(["Question ID", ph["Language"].astype(str).str.lower()]):
        texts = list(dict.fromkeys(str(t).strip() for t in group["How a young person might ask"] if str(t).strip()))
        rng.shuffle(texts)
        age = str(qs.at[qid, "Age group"]) if qid in qs.index else "15-19"
        items += [(qid, t, age, lang) for t in texts[:per_question.get(lang, 0)]]
    rng.shuffle(items)
    return items[:n]


def _copies_approved(reply, bot, ids, n=14, lang="en"):
    """The reply repeats n words in a row of one of its approved answers."""
    r = re.findall(r"\w+", reply.lower())
    for qid in ids:
        if qid not in bot.qa:
            continue
        a = re.findall(r"\w+", (bot.qa[qid]["answers"]["default"].get(lang) or "").lower())
        grams = {" ".join(a[i:i + n]) for i in range(max(0, len(a) - n + 1))}
        if any(" ".join(r[i:i + n]) in grams for i in range(max(0, len(r) - n + 1))):
            return True
    return False


def reply_fits_training(out, bot, lang="en"):
    """(ok, approved ids): a plain answer that passed the service's checks and sounds like a person."""
    reply = (out.get("reply") or "").strip()
    ids = list(dict.fromkeys(QID_RE.findall(" ".join(out.get("sources") or []))))
    if out.get("kind") != "answer" or out.get("escalate") or not reply:
        return False, ids
    if any(x in reply for x in FILLER_LINES) or len(reply.split()) > 110:
        return False, ids
    end = " ".join(re.split(r"(?<=[.!?])\s+", reply)[-2:])
    if "?" not in end:
        return False, ids
    if lang == "rw" and "Wifuza ko nagusobanurira birambuye?" in reply:
        return False, ids
    return not _copies_approved(reply, bot, ids, lang=lang), ids


def _save_conversation_rows(rows, out_path):
    import pandas as pd
    pd.DataFrame(rows, columns=CONVERSATION_COLUMNS).to_excel(out_path, sheet_name="Conversations", index=False)


def conversations_from_phrasings(chat, folder=".", out_path="Intyoza_Conversations_From_Phrasings.xlsx", n=1000, time_limit_h=5.0,
        two_turn_share=0.4, variety=0.9, seed=0, first_id=1, log=print):
    from chatbot import PlatformAdapter
    os.environ["INTYOZA_TALK_VARIETY"] = str(variety)      # more varied wording for training data
    adapter = PlatformAdapter(chat)
    bot = chat.base                                      # the approved answers (bot.qa)
    rng = random.Random(seed + 7)
    items = phrasings_for_conversations(folder, n, seed=seed)
    log(f"{len(items)} ways of asking picked; writing for at most {time_limit_h} h")
    rows, kept, tried, started = [], 0, 0, time.time()
    for qid, text, age, lang in items:
        if time.time() - started > time_limit_h * 3600:
            log("Time limit reached.")
            break
        tried += 1
        cid = f"CONV-P{first_id + kept:04d}"
        profile = random_profile(rng, lang)
        payload = {"userId": f"phrasing-{seed}-{tried}", "language": "RW" if lang == "rw" else "EN", "ageBand": AGE_BANDS.get(age, "AGE_15_19"),
                   "message": text, "history": [], **({"profile": profile} if profile else {})}
        try:
            out = adapter.generate(payload)
        except Exception as e:                      # one bad message never stops the run
            log(f"  error on {qid}: {str(e)[:120]}")
            continue
        ok, ids = reply_fits_training(out, bot, lang)
        if not ok:
            adapter.forget(payload["userId"])
            continue
        turns = [(text, out["reply"].strip(), ids)]
        if rng.random() < two_turn_share:
            follow = rng.choice(FOLLOW_UP_MESSAGES[lang])
            try:
                out2 = adapter.generate({**payload, "message": follow,
                                         "history": [{"role": "user", "content": text},
                                                     {"role": "assistant", "content": out["reply"]}]})
                ok2, ids2 = reply_fits_training(out2, bot, lang)
                if ok2:
                    turns.append((follow, out2["reply"].strip(), ids2 or ids))
            except Exception as e:
                log(f"  error on the follow-up of {qid}: {str(e)[:120]}")
        adapter.forget(payload["userId"])
        kept += 1
        spot = "yes" if rng.random() < 0.10 else ""
        for t, (say, reply, src) in enumerate(turns, 1):
            rows.append([cid, f"from phrasing {qid}", t, say, reply, "; ".join(src), lang, "Draft",
                         "", spot])
        if kept % 25 == 0:
            _save_conversation_rows(rows, out_path)
            mins = (time.time() - started) / 60
            log(f"  {kept} conversations kept of {tried} tried ({mins:.0f} min)")
    _save_conversation_rows(rows, out_path)
    log(f"Done: {kept} conversations ({len(rows)} replies) kept of {tried} tried -> {out_path}")
    return rows
