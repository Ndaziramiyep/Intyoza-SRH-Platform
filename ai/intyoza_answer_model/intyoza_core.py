"""Intyoza core: data loading, matcher index, risk/intent/language models, chat logic. Works offline."""
import csv, hashlib, json, os, random, re
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import make_pipeline
from sklearn.metrics import classification_report

from preprocess import normalize

SEED = 42
random.seed(SEED)
np.random.seed(SEED)

# ---------- base model ----------
# multilingual-e5-large-instruct (Microsoft, MIT licence, arXiv:2402.05672). On an independent Kinyarwanda benchmark
# (KinyaEmbed, arXiv:2608.26941) it scores 0.60 / 0.55 on sentence similarity and 0.98 on retrieval, against
# 0.45 / 0.22 and 0.59 for LaBSE. It reads every text with a short instruction in front of it:
BASE_MODEL_ID = "intfloat/multilingual-e5-large-instruct"
BASE_MODEL_DIR = "e5-large-instruct"           # local copy in base_model/ (download_model.py)
MATCH_PROMPT = ("Instruct: Given a young person's question about sexual and reproductive health, "
                "retrieve the question with the same meaning\nQuery: ")
DOC_QUERY_PROMPT = ("Instruct: Given a question about sexual and reproductive health, "
                    "retrieve passages that answer it\nQuery: ")


def set_prompts(model):
    """Give an instruction model its prompts. They are saved with the model, so every later encode() of a
    message or question uses MATCH_PROMPT automatically (passages use none, see prompt_kwargs)."""
    model.prompts = {"match": MATCH_PROMPT, "doc_query": DOC_QUERY_PROMPT}
    model.default_prompt_name = "match"
    return model


def prompt_kwargs(encoder, name):
    """Arguments for encoder.encode(): a named prompt, or no prompt for document passages.
    Models without prompts (LaBSE, test encoders) get no extra arguments."""
    prompts = getattr(encoder, "prompts", None) or {}
    if not prompts:
        return {}
    if name == "passage":
        return {"prompt": ""}
    return {"prompt_name": name} if name in prompts else {}

RISKS = ["None", "Low", "High", "Emergency"]
INTENTS = ["health", "greeting", "goodbye", "other"]

# Last-resort backstop only. The trained risk model does the real work.
# Called with every unanswered question (review_queue.install() adds the review sheet).
UNANSWERED_HOOKS = []


def private_row(row):
    """An unanswered-question row without personal details, for the local log (intyoza_unanswered.csv):
    names, numbers, e-mails, links and places removed; a crisis message is not kept, only marked."""
    try:
        from review_queue import clean, is_crisis
    except Exception:
        return {**row, "text": "[not saved]"}
    out = dict(row)
    text = str(row.get("text", ""))
    out["text"] = "[crisis message, not saved]" if is_crisis(text) else clean(text)
    return out

BACKSTOP = ["raped", "kill myself", "want to die", "end my life", "suicide", "kwiyahura"]

# Words that show the young person is asking to learn ("Kwikinisha ni iki?", "Ndashaka kumenya...", "What is...").
LEARN_CUE = re.compile(r"\b(ni iki|ni ibiki|ni ibihe|ni izihe|ni iyihe|ni ubuhe|bisobanura iki|isobanura iki|"
                       r"bivuze iki|ndashaka kumenya|nifuza kumenya|nsobanurira|sobanura|mbwira ku|"
                       r"what is|what are|what does|what do|meaning of|explain|tell me about|how does|how do)\b")


def expand_compact(d):
    """The Drive file is stored compactly; turn it into full records."""
    qa = []
    for row in d["qa"]:
        i, t, a, q, ans, r, ref, s = row[:8]
        q_rw, a_rw = (row[8], row[9]) if len(row) > 9 else ("", "")
        qa.append({"id": i, "topic": t, "age": a, "q_en": q, "q_rw": q_rw,
                   "answers": {"default": {"en": ans, "rw": a_rw}}, "risk": r, "referral": ref, "sources": s})
    for q in qa:   # answers written for a specific age group (10-14, 20-24)
        for age, block in d.get("age_answers", {}).get(q["id"], {}).items():
            q["answers"][age] = dict(block)
    risk_of = {q["id"]: q["risk"] for q in qa}
    ex = []
    for block, lang in ((d.get("ex", {}), "en"), (d.get("ex_rw", {}), "rw")):
        for key, texts in block.items():
            for t in texts:
                split = "test" if t.startswith("*") else "train"
                t = t.lstrip("*")
                if key.startswith("@"):
                    e = {"qa_id": None, "risk": key[1:], "intent": "health", "lang": lang}
                elif key.startswith("#"):
                    intent, klang = key[1:].split("/")
                    e = {"qa_id": None, "risk": "None", "intent": intent, "lang": klang}
                else:
                    e = {"qa_id": key, "risk": risk_of[key], "intent": "health", "lang": lang}
                if "|" in t:
                    t, e["risk"] = t.rsplit("|", 1)
                e.update(text=t, split=split)
                ex.append(e)
    d["qa"] = qa
    return qa, ex


def add_kinyarwanda(d, rw):
    """Merge the Kinyarwanda file into the compact English data."""
    for row in d["qa"]:
        q_rw, a_rw = rw["qa"].get(row[0], ["", ""])
        del row[8:]
        row += [q_rw, a_rw]
    for k, v in rw["help_now"].items():
        d["help_now"][k]["rw"] = v
    for k, v in rw["replies"].items():
        d["replies"][k]["rw"] = v
    d["ex_rw"] = rw["ex"]


def load_data(json_path, rw_path=None):
    with open(json_path, encoding="utf-8") as f:
        d = json.load(f)
    if rw_path:
        with open(rw_path, encoding="utf-8") as f:
            add_kinyarwanda(d, json.load(f))
    if str(d.get("format", "")).startswith("compact"):
        qa_list, ex = expand_compact(d)
        qa = {q["id"]: q for q in qa_list}
    else:
        qa = {q["id"]: q for q in d["qa"]}
        ex = [dict(zip(d["example_fields"], e)) for e in d["examples"]]
    # questions where either answer is correct ("Is there a cure for HIV?" and the myth "HIV can be cured")
    for group in d.get("equivalents", []):
        for qid in group:
            if qid in qa:
                qa[qid]["equivalent"] = list(group)
    return d, qa, ex


def canonical_text(q):
    """The text that stands for an approved question (normalised the same way as chat messages)."""
    return normalize(q["q_en"] + " " + q["answers"]["default"]["en"])


def matcher_pairs(qa, ex):
    """(how a young person asked, the approved question it belongs to) pairs for training."""
    return [(e["text"], canonical_text(qa[e["qa_id"]])) for e in ex
            if e["split"] == "train" and e["qa_id"] in qa]


def model_fingerprint(encoder):
    """Changes whenever the matcher is retrained (used to know when saved vectors are out of date)."""
    v = encoder.encode(["intyoza fingerprint: ubuzima bw'imyororokere"], normalize_embeddings=True)[0]
    return hashlib.md5(np.round(np.asarray(v, dtype=np.float32), 4).tobytes()).hexdigest()


class Index:
    """Each approved question is represented by the average of its own text and its training phrasings.

    cache: optional .npz path. The vectors are saved there and reused at the next start as long as the
    data and the matcher have not changed, so chat starts in seconds instead of minutes on a laptop."""
    def __init__(self, encoder, qa, ex, cache=None):
        self.enc, self.ids = encoder, list(qa)
        self.same = {i: set(qa[i].get("equivalent", [])) | {i} for i in self.ids}
        groups = {i: [canonical_text(qa[i]), normalize(qa[i]["q_en"])]
                  + ([normalize(qa[i]["q_rw"])] if qa[i].get("q_rw") else []) for i in self.ids}
        for e in ex:
            if e["split"] == "train" and e["qa_id"] in groups:
                groups[e["qa_id"]].append(e["text"])
        key = None
        if cache:
            key = hashlib.md5(json.dumps([self.ids, [groups[i] for i in self.ids]], ensure_ascii=False)
                              .encode("utf-8")).hexdigest() + model_fingerprint(encoder)
            if os.path.exists(cache):
                try:
                    z = np.load(cache, allow_pickle=False)
                    if str(z["key"]) == key:
                        self.vecs = z["vecs"]
                        return
                except Exception:
                    pass                      # damaged or old cache: rebuild below
        texts, owner = [], []
        for n, i in enumerate(self.ids):
            texts += groups[i]
            owner += [n] * len(groups[i])
        allv = np.asarray(self.enc.encode(texts, normalize_embeddings=True, batch_size=64), dtype=np.float32)
        owner = np.array(owner)
        vecs = np.zeros((len(self.ids), allv.shape[1]), dtype=np.float32)
        np.add.at(vecs, owner, allv)
        vecs /= np.linalg.norm(vecs, axis=1, keepdims=True)
        self.vecs = vecs
        if cache:
            os.makedirs(os.path.dirname(os.path.abspath(cache)), exist_ok=True)
            np.savez(cache, vecs=vecs, key=np.array(key))

    def search(self, text, k=3):
        q = self.enc.encode([text], normalize_embeddings=True)[0]
        s = self.vecs @ q
        top = np.argsort(-s)[:k]
        return [(self.ids[i], float(s[i])) for i in top]

    def correct(self, expected, got):
        """True when `got` is the expected question or an equivalent one."""
        return got in self.same.get(expected, {expected})


def train_heads(encoder, ex, C=4):
    """Risk and intent classifiers on matcher embeddings (training split only, balanced class weights)."""
    tr = [e for e in ex if e["split"] == "train"]
    X = encoder.encode([e["text"] for e in tr], normalize_embeddings=True, batch_size=64)
    risk = LogisticRegression(max_iter=3000, class_weight="balanced", C=C).fit(X, [e["risk"] for e in tr])
    intent = LogisticRegression(max_iter=3000, class_weight="balanced", C=C).fit(X, [e["intent"] for e in tr])
    return risk, intent


def risk_level(prob_by_label, threshold=0.5):
    hi = prob_by_label.get("High", 0) + prob_by_label.get("Emergency", 0)
    if hi >= threshold:
        return "Emergency" if prob_by_label.get("Emergency", 0) >= prob_by_label.get("High", 0) else "High"
    return max(prob_by_label, key=prob_by_label.get)


def evaluate(index, risk_clf, intent_clf, encoder, ex, lo, hi, risk_threshold=0.5):
    te = [e for e in ex if e["split"] == "test"]
    X = encoder.encode([e["text"] for e in te], normalize_embeddings=True)
    # matching
    in_scope = [e for e in te if e["qa_id"]]
    top1 = top3 = 0
    for e in in_scope:
        res = index.search(e["text"], k=3)
        top1 += index.correct(e["qa_id"], res[0][0])
        top3 += any(index.correct(e["qa_id"], r[0]) for r in res)
    out_scope = [e for e in te if e["intent"] == "other"]
    rejected = sum(index.search(e["text"], 1)[0][1] < lo for e in out_scope)
    print(f"Question matching on {len(in_scope)} unseen phrasings:")
    print(f"  correct first match: {top1 / len(in_scope):.0%}   correct in top 3: {top3 / len(in_scope):.0%}")
    print(f"  off-topic messages correctly not answered: {rejected}/{len(out_scope)}")
    # risk
    probs = risk_clf.predict_proba(X)
    pred = [risk_level(dict(zip(risk_clf.classes_, p)), risk_threshold) for p in probs]
    true = [e["risk"] for e in te]
    print("\nRisk:")
    print(classification_report(true, pred, labels=RISKS, zero_division=0))
    risky = [i for i, t in enumerate(true) if t in ("High", "Emergency")]
    caught = sum(pred[i] in ("High", "Emergency") for i in risky)
    false_alarm = sum(pred[i] in ("High", "Emergency") for i, t in enumerate(true) if t in ("None", "Low"))
    print(f"  risky messages caught: {caught}/{len(risky)}   false alarms: {false_alarm}/{len(true) - len(risky)}")
    # intent
    ip = intent_clf.predict(X)
    print("\nIntent:")
    print(classification_report([e["intent"] for e in te], ip, labels=INTENTS, zero_division=0))


def tune_thresholds(index, ex):
    """Pick the 'answer' and 'ask to clarify' cut-offs from held-out data."""
    te = [e for e in ex if e["split"] == "test" and (e["qa_id"] or e["intent"] == "other")]
    X = np.asarray(index.enc.encode([e["text"] for e in te], normalize_embeddings=True, batch_size=64))
    sims = X @ index.vecs.T
    best = sims.argmax(axis=1)
    right, wrong, off = [], [], []
    for n, e in enumerate(te):
        qid, s = index.ids[best[n]], float(sims[n, best[n]])
        if e["qa_id"]:
            (right if index.correct(e["qa_id"], qid) else wrong).append(s)
        else:
            off.append(s)
    hi = float(np.percentile(wrong + off, 90)) if (wrong + off) else 0.6
    lo = float(np.percentile(off, 50)) if off else hi - 0.1
    lo = min(lo, hi - 0.02)
    return round(lo, 3), round(hi, 3)


# ---------- safety: three trained signals combined ----------
RISKY = ("High", "Emergency")


def train_char_risk(ex, C=4):
    """Risk model on character patterns (catches spellings and words the embedding model smooths over)."""
    tr = [e for e in ex if e["split"] == "train"]
    model = make_pipeline(TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 5), sublinear_tf=True, min_df=1),
                          LogisticRegression(max_iter=3000, class_weight="balanced", C=C))
    return model.fit([e["text"] for e in tr], [e["risk"] for e in tr])


class Safety:
    def __init__(self, risk_emb, risk_char, threshold=0.5, inherit=True):
        self.risk_emb, self.risk_char, self.threshold, self.inherit = risk_emb, risk_char, threshold, inherit

    def signals(self, x, text):
        pe = dict(zip(self.risk_emb.classes_, self.risk_emb.predict_proba(x)[0]))
        pc = dict(zip(self.risk_char.classes_, self.risk_char.predict_proba([text])[0]))
        return pe, pc

    def p_risky(self, pe, pc):
        return max(sum(pe.get(k, 0) for k in RISKY), sum(pc.get(k, 0) for k in RISKY))

    def level(self, pe, pc, match_risk, match_score, lo):
        p_risky = max(sum(pe.get(k, 0) for k in RISKY), sum(pc.get(k, 0) for k in RISKY))
        inherited = self.inherit and match_score >= lo and match_risk in RISKY
        if p_risky >= self.threshold or inherited:
            e = pe.get("Emergency", 0) + pc.get("Emergency", 0)
            h = pe.get("High", 0) + pc.get("High", 0)
            if inherited and p_risky < self.threshold:
                return match_risk
            return "Emergency" if e >= h else "High"
        none = pe.get("None", 0) + pc.get("None", 0)
        low = pe.get("Low", 0) + pc.get("Low", 0)
        return "None" if none >= low else "Low"


def safety_levels(safety, index, encoder, ex, qa, lo):
    """Risk level the safety layer gives each held-out message (used for tuning and for the confusion matrix)."""
    te = [e for e in ex if e["split"] == "test"]
    texts = [e["text"] for e in te]
    X = np.asarray(encoder.encode(texts, normalize_embeddings=True))
    pe_all = safety.risk_emb.predict_proba(X)
    pc_all = safety.risk_char.predict_proba(texts)
    sims = X @ index.vecs.T
    best = sims.argmax(axis=1)
    matches = [(index.ids[j], float(sims[i, j])) for i, j in enumerate(best)]
    return te, pe_all, pc_all, matches


def tune_safety(index, risk_emb, risk_char, encoder, ex, qa, lo, max_false_alarm=0.05, verbose=True):
    """Learning first: choose the setting that flags at most `max_false_alarm` of normal held-out messages
    as risky, and among those, catches the most risky messages. The full table is kept as .table."""
    te, pe_all, pc_all, matches = safety_levels(Safety(risk_emb, risk_char), index, encoder, ex, qa, lo)
    risky = [e["risk"] in RISKY for e in te]
    n_r, n_n = sum(risky), len(te) - sum(risky)
    rows = []
    for inherit in (False, True):
        for t in [round(0.15 + 0.05 * i, 2) for i in range(17)]:          # 0.15 to 0.95
            s = Safety(risk_emb, risk_char, t, inherit)
            pred = [s.level(dict(zip(risk_emb.classes_, a)), dict(zip(risk_char.classes_, b)),
                            qa[m[0]]["risk"], m[1], lo) in RISKY for a, b, m in zip(pe_all, pc_all, matches)]
            caught = sum(p and r for p, r in zip(pred, risky))
            fa = sum(p and not r for p, r in zip(pred, risky))
            rows.append((t, inherit, caught, fa))
    table = pd.DataFrame(rows, columns=["threshold", "use_matched_risk", "risky_caught", "false_alarms"])
    table["recall"] = (table["risky_caught"] / max(1, n_r)).round(3)
    table["false_alarm_rate"] = (table["false_alarms"] / max(1, n_n)).round(3)
    ok = [r for r in rows if r[3] / max(1, n_n) <= max_false_alarm]
    best = max(ok, key=lambda r: (r[2], -r[3])) if ok else min(rows, key=lambda r: (r[3], -r[2]))
    if verbose:
        print(f"threshold  use-match  risky caught (of {n_r})  false alarms (of {n_n})")
        for t, inh, c, fa in rows:
            print(f"   {t:.2f}      {str(inh):5}      {c:3d}  ({c / max(1, n_r):.0%})          {fa:3d}  ({fa / max(1, n_n):.0%})")
        print(f"\nChosen: threshold {best[0]}, use matched question's risk = {best[1]}: "
              f"catches {best[2]}/{n_r} risky messages, {best[3]}/{n_n} false alarms")
    s = Safety(risk_emb, risk_char, best[0], best[1])
    s.table, s.max_false_alarm = table, max_false_alarm
    s.recall, s.false_alarm_rate = best[2] / max(1, n_r), best[3] / max(1, n_n)
    return s


class Intyoza:
    def __init__(self, data, qa, index, encoder, risk_clf, intent_clf, lo, hi, detect_lang,
                 age_group="15-19", risk_threshold=0.5, log=None, safety=None, reply_lang="rw", log_path=None):
        self.d, self.qa, self.index, self.enc = data, qa, index, encoder
        self.risk_clf, self.intent_clf = risk_clf, intent_clf
        self.lo, self.hi, self.detect_lang = lo, hi, detect_lang
        self.age_group, self.risk_threshold = age_group, risk_threshold
        self.safety = safety
        self.reply_lang = reply_lang    # "rw" = always answer in Kinyarwanda; "auto" = follow the user's language
        self.lang = "rw"             # Kinyarwanda first
        self.seen, self.topics = [], {}
        self.pending = []           # options offered after "did you mean"
        self.pending_mode = "questions"
        self.crisis = None          # kind of crisis already answered in this conversation
        self.unanswered = log if log is not None else []
        self.log_path = log_path      # unanswered questions are written here at once, so none are lost
        self.debug = False
        self.docs = None
        self.greeted = self.followed_up = False
        self.current_topic = None

    AGE_GROUPS = ("10-14", "15-19", "20-24")

    def reset(self):
        """Start a new conversation (keeps the models, the age group and the unanswered log)."""
        self.seen, self.topics, self.pending, self.pending_mode = [], {}, [], "questions"
        self.crisis, self.greeted, self.followed_up, self.current_topic = None, False, False, None

    def _log_unanswered(self, row):
        for hook in UNANSWERED_HOOKS:   # e.g. review_queue: the health team's review sheet (cleans the text itself)
            try:
                hook(row)
            except Exception:
                pass
        row = private_row(row)          # the local list and file keep no personal details either
        self.unanswered.append(row)
        if not self.log_path:
            return
        try:
            new = not os.path.exists(self.log_path)
            with open(self.log_path, "a", newline="", encoding="utf-8") as f:
                w = csv.DictWriter(f, fieldnames=list(row))
                if new:
                    w.writeheader()
                w.writerow(row)
        except OSError:
            pass                       # file open in Excel, etc.: keep chatting

    def _t(self, block):
        """Text in the user's language, or English with a note if no approved translation exists."""
        if self.lang == "rw" and block.get("rw"):
            return block["rw"]
        if self.lang == "rw":
            return self.d["replies"]["en_only"]["en"] + "\n\n" + block["en"]
        return block["en"]

    def assess(self, text):
        """Read a message without changing the conversation: language, intent, closest questions and risk.
        Used by reply() and by the chatbot to compare several readings of a follow-up message."""
        norm = normalize(text)
        lang = self.detect_lang(norm, self.lang) if self.reply_lang == "auto" else self.reply_lang
        x = self.enc.encode([norm], normalize_embeddings=True)
        ip = dict(zip(self.intent_clf.classes_, self.intent_clf.predict_proba(x)[0]))
        intent = max(ip, key=ip.get)
        res = self.index.search(norm, k=3)
        best_id, best = res[0]
        strength = 0.0                       # how sure the risk models are that the message is about danger
        if self.safety:
            pe, pc = self.safety.signals(x, norm)
            strength = self.safety.p_risky(pe, pc)
            level = self.safety.level(pe, pc, self.qa[best_id]["risk"], best, self.lo)
            # A clear greeting, thanks or small talk is not a crisis unless the risk signal is strong
            if level in RISKY and intent != "health" and ip[intent] >= 0.5 and strength < self.STRONG_RISK:
                level = "None"
        else:
            rp = dict(zip(self.risk_clf.classes_, self.risk_clf.predict_proba(x)[0]))
            level = risk_level(rp, self.risk_threshold)
            strength = rp.get("High", 0) + rp.get("Emergency", 0)
        if any(k in norm.lower() for k in BACKSTOP):
            level, strength = "Emergency", 1.0
        return {"text": norm, "lang": lang, "intent": intent, "intent_p": ip[intent], "res": res,
                "best_id": best_id, "best": best, "level": level, "strength": strength,
                "learning_cue": bool(LEARN_CUE.search(norm))}

    def reply(self, text):
        raw = text
        if len([ch for ch in normalize(text) if ch.isalpha()]) <= 2:      # "b", "?", "ok": too short to understand
            return self._topic_menu("clarify", kind="clarify")
        a = self.assess(text)
        self.lang = a["lang"]
        text, intent, ip_intent, res = a["text"], a["intent"], a["intent_p"], a["res"]
        best_id, best, level, strength = a["best_id"], a["best"], a["level"], a["strength"]
        if self.debug:
            print(f"   [lang={self.lang} intent={intent} {ip_intent:.2f} risk={level} strength={strength:.2f} "
                  f"match={best_id} {best:.3f}]")

        # 1. LEARNING FIRST: a clear match to a learning question always gets its answer.
        #    If the message also looks risky, help contacts are added: a short line under the answer,
        #    or the full help message above it when the danger is very clear ("I was raped, can I get pregnant?").
        if best >= self.hi and self.qa[best_id]["risk"] in ("None", "Low"):
            r = self.answer(best_id, risk=level)
            if level in RISKY and strength >= self.VERY_STRONG_RISK:
                kind = self._crisis_kind(text)
                r["text"] = self._help(kind, level) + "\n\n" + r["text"]
                r["type"], r["help"] = "answer_with_help", "full"
                self.crisis = kind
            elif level in RISKY and strength >= self.STRONG_RISK:
                r["text"] += "\n\n" + self._t(self.d["replies"]["help_short"])
                r["help"] = "short"
            return r

        # 1b. A message phrased as a learning question ("ndashaka kumenya kwikinisha ni iki?") that points to a
        #     learning question is never answered with help alone: offer the closest questions. Help contacts
        #     are added only if it also contains a very clear danger word.
        if (LEARN_CUE.search(text) and best >= self.lo and self.qa[best_id]["risk"] in ("None", "Low")
                and not any(k in text.lower() for k in BACKSTOP)):
            self.pending, self.pending_mode = self._distinct(text, res), "questions"
            return {"type": "did_you_mean", "text": self._t(self.d["replies"]["did_you_mean"]),
                    "options": [self._q(i) for i in self.pending]}

        # 2. SAFETY: a message about danger that is not a learning question gets help
        if level in RISKY:
            kind = self._crisis_kind(text)
            if best >= self.lo and self.qa[best_id]["risk"] in RISKY:      # an urgent question we have an answer for
                r = self.answer(best_id, risk=level)
                # Add the right help contacts unless the matched answer is itself an emergency answer
                if level == "Emergency" and self.qa[best_id]["risk"] != "Emergency":
                    r["text"] = self._help(kind, level) + "\n\n" + r["text"]
                r["type"], r["help"] = "answer_with_help", "full"
                self.crisis = kind
                return r
            if self.crisis:             # help already given: stay with the person, don't repeat the list
                kind = self.crisis
                key = kind if not self.followed_up else "general"
                self.followed_up = True
                ups = [i for i in self.SUPPORT.get(kind, self.SUPPORT["general"]) if i in self.qa]
                self.pending, self.pending_mode = ups, "questions"
                return {"type": "crisis_followup", "risk": level, "help": "followup",
                        "text": self._t(self.d["help_followup"][key]), "options": [self._q(i) for i in ups]}
            self.crisis = kind
            return {"type": "help_now", "risk": level, "help": "full", "text": self._help(kind, level), "options": []}
        # 2. greetings and thanks: the intent model's top guess, unless the message clearly matches a question
        if intent in ("greeting", "goodbye") and best < self.hi:
            if intent == "goodbye":
                return {"type": "goodbye", "text": self._t(self.d["replies"]["goodbye"]), "options": []}
            key = "greeting_again" if getattr(self, "greeted", False) and "greeting_again" in self.d["replies"] else "greeting"
            self.greeted = True
            return self._topic_menu(key, kind="greeting")
        # 3. approved answers
        if best >= self.hi:
            return self.answer(best_id, risk=level)
        if best >= self.lo:
            self.pending, self.pending_mode = self._distinct(text, res), "questions"
            return {"type": "did_you_mean", "text": self._t(self.d["replies"]["did_you_mean"]),
                    "options": [self._q(i) for i in self.pending]}
        # 4. small talk is not a missing health answer: invite a question, don't log it
        if intent != "health":
            key = "greeting_again" if getattr(self, "greeted", False) else "greeting"
            self.greeted = True
            return self._topic_menu(key, kind="chat")
        doc = self._from_documents(text)
        self._log_unanswered({"text": raw, "lang": self.lang, "best_match": best_id, "score": round(best, 3),
                              "answered_from_documents": bool(doc)})
        if doc:
            return doc
        return self._topic_menu()

    def _distinct(self, text, res, n=3):
        """Up to n closest questions for 'did you mean', leaving out equivalents of a question already listed."""
        out = []
        for qid, _ in res + self.index.search(text, k=8):
            if not any(qid in self.index.same.get(o, {o}) for o in out):
                out.append(qid)
            if len(out) == n:
                break
        return out

    def _from_documents(self, text):
        """Fallback: answer from trusted documents when no approved answer matches."""
        if self.docs is None:
            return None
        try:
            r = self.docs.answer(text, self.lang)
        except Exception as e:
            if self.debug:
                print("   [documents error]", e)
            return None
        if not r:
            return None
        src = "; ".join(r["sources"][:2])
        if self.lang == "rw" and r.get("text_rw"):
            body = r["text_rw"] + f"\n\n(Iki gisubizo gikomoka mu nyandiko: {src}. Ntikiremezwa n'abaganga.)"
        elif self.lang == "rw":
            body = self.d["replies"]["en_only"]["rw"] + "\n\n" + r["text_en"] + f"\n\n(Source: {src})"
        else:
            body = r["text_en"] + f"\n\n(From documents: {src}. Not yet reviewed by our health team.)"
        if self.debug:
            print(f"   [document answer, passage score {r['score']:.3f}]")
        return {"type": "document_answer", "text": body, "options": self._offer(["__topics__"], "questions")}

    # ---------- helpers for safety and menus ----------
    KIND_BY_TOPIC = {"Emotional wellbeing": "selfharm", "GBV and safety": "violence", "Consent and relationships": "violence",
                     "Pregnancy": "medical", "Menstruation and puberty": "medical", "STIs and HIV": "medical",
                     "Contraception": "medical", "Boys' health": "medical", "Alcohol and drugs": "medical"}

    STRONG_RISK = 0.6          # risk signal strong enough to add help contacts under a learning answer
    VERY_STRONG_RISK = 0.85    # clear danger: full help message above the answer

    SUPPORT = {"selfharm": ["EMO-013", "SRV-004", "EMO-001", "EMO-008"],
               "violence": ["GBV-017", "GBV-005", "GBV-004", "SRV-004"],
               "medical": ["PRG-010", "SRV-004", "SRV-003"],
               "general": ["SRV-004", "EMO-013", "SRV-003"]}

    def _crisis_kind(self, text):
        """Type of crisis (self-harm, violence, medical) from the closest urgent question."""
        for qid, score in self.index.search(text, k=40):
            if self.qa[qid]["risk"] in ("High", "Emergency"):
                # Only trust the type when the match is reasonable; otherwise give the general list (covers all)
                return self._kind(qid) if score >= self.lo else "general"
        return "general"

    def _kind(self, qid):
        return self.KIND_BY_TOPIC.get(self.qa[qid]["topic"], "general")

    def _help(self, kind, level):
        kinds = self.d.get("help_kinds")
        if not kinds:
            return self._t(self.d["help_now"][level])
        if kind == "violence":
            return self._t(self.d["help_now"][level])
        return self._t(kinds.get(kind, kinds["general"]))

    def _topics(self):
        out = []
        for q in self.qa.values():
            if q["topic"] not in out:
                out.append(q["topic"])
        return out

    def _topic_name(self, t):
        if self.lang == "rw":
            return self.d.get("topic_names", {}).get(t, t)
        return t

    def _label(self, item):
        labels = self.d["replies"].get("menu_labels", {})
        if item == "__quiz__":
            return self._t(labels.get("quiz", {"en": "Quiz", "rw": "Umukino"}))
        if item == "__topics__":
            return self._t(labels.get("topics", {"en": "Other topics", "rw": "Izindi ngingo"}))
        if item in self.qa:
            return self._q(item)
        return self._topic_name(item)

    def _offer(self, items, mode):
        self.pending, self.pending_mode = items, mode
        return [self._label(i) for i in items]

    def _topic_menu(self, key="clarify", kind="clarify"):
        learning = self.d.get("learning")
        topics = list(learning["menu"]) if learning else self._topics()
        items = topics + (["__quiz__"] if learning else [])
        text = self._t(self.d["replies"].get(key, self.d["replies"]["clarify"]))
        return {"type": kind, "text": text, "options": self._offer(items, "topics")}

    def _path(self, topic):
        learning = self.d.get("learning")
        if learning and topic in learning["paths"]:
            return [i for i in learning["paths"][topic] if i in self.qa]
        return [q["id"] for q in self.qa.values() if q["topic"] == topic and q["risk"] in ("None", "Low")]

    def _topic_questions(self, topic, n=5):
        ids = [i for i in self._path(topic) if i not in self.seen][:n]
        if not ids:
            return self._topic_menu("path_done", kind="topic_done")
        self.current_topic = topic
        return {"type": "topic_list", "text": self._t(self.d["replies"]["topic_list"]),
                "options": self._offer(ids + ["__topics__"], "questions")}

    def choose(self, n):
        """User picked option n (1-based) from 'did you mean' or follow-ups."""
        if 1 <= n <= len(self.pending):
            item = self.pending[n - 1]
            if item == "__quiz__":
                return {"type": "quiz", "text": "", "options": []}
            if item == "__topics__":
                return self._topic_menu("greeting_again", kind="topics")
            if self.pending_mode == "topics":
                return self._topic_questions(item)
            return self.answer(item)
        msg = "Hitamo imwe mu mibare yerekanwe." if self.lang == "rw" else "Please pick one of the numbers shown."
        return {"type": "error", "text": msg, "options": []}

    def answer(self, qid, risk="None"):
        q = self.qa[qid]
        block = q["answers"].get(self.age_group) or q["answers"]["default"]
        if not block.get(self.lang):
            block = q["answers"]["default"]
        self.seen.append(qid)
        self.topics[q["topic"]] = self.topics.get(q["topic"], 0) + 1
        path = self._path(q["topic"])
        if qid in path and q["risk"] in ("None", "Low") and qid not in self.d.get("followups", {}):
            after = path[path.index(qid) + 1:] + path[:path.index(qid)]
            ups = [i for i in after if i not in self.seen][:2] + ["__topics__"]
        else:
            ups = self._follow_ups(qid)
        self.pending, self.pending_mode = ups, "questions"
        text = self._t(block)
        if q.get("referral"):
            ref = q["referral"]
            if self.lang == "rw":
                tr = self.d.get("referral_rw", {})
                ref = "; ".join(tr.get(p.strip(), p.strip()) for p in ref.split(";") if p.strip())
            text += f"\n\n{'Aho wajya' if self.lang == 'rw' else 'Where to go'}: {ref}"
        return {"type": "answer", "qa_id": qid, "risk": risk, "text": text,
                "options": [self._label(i) for i in ups], "sources": q.get("sources", ""),
                "approved": q.get("status", "") == "Approved"}

    def _q(self, qid):
        q = self.qa[qid]
        return q["q_rw"] if self.lang == "rw" and q.get("q_rw") else q["q_en"]

    def _follow_ups(self, qid, n=3):
        fixed = self.d.get("followups", {}).get(qid)
        if fixed:
            return [i for i in fixed if i in self.qa and i != qid][:4]
        i = self.index.ids.index(qid)
        s = self.index.vecs @ self.index.vecs[i]
        out = []
        for j in np.argsort(-s):
            cand = self.index.ids[j]
            if cand != qid and cand not in self.seen and self.qa[cand]["risk"] in ("None", "Low"):
                out.append(cand)
            if len(out) == n:
                break
        return out

    def _starters(self):
        pool = [i for i in self.index.ids if self.qa[i]["risk"] == "None" and i not in self.seen]
        self.pending, self.pending_mode = random.sample(pool, min(3, len(pool))), "questions"
        return [self._q(i) for i in self.pending]

    @staticmethod
    def _split_verdict(answer):
        """'Myth. Condoms do not have holes. More text.' -> ('Condoms do not have holes.', 'More text.')"""
        parts = [p.strip() for p in re.split(r"(?<=[.!?])\s+", answer.strip()) if p.strip()]
        if len(parts) >= 2 and len(parts[0].split()) <= 4 and len(parts[1]) >= 20:
            return parts[1], " ".join(parts[2:])
        return None, None

    def myth_quiz(self, n=5):
        """Myth-or-fact game. About half the items show the myth, half show the true fact from the answer,
        so answering 'myth' every time does not win."""
        myths = [q for q in self.qa.values() if q["topic"] == "Myths and misconceptions"]
        out = []
        for k, q in enumerate(random.sample(myths, min(n, len(myths)))):
            ans = q["answers"]["default"]["en"]
            low = ans.lower()
            truth = "Fact" if low.startswith(("fact", "true")) else ("Partly true" if low.startswith("partly") else "Myth")
            block = q["answers"]["default"]
            statement, explain = self._q(q["id"]), self._t(block)
            if truth == "Myth" and (k % 2 == 1 or random.random() < 0.2):
                fact, rest = self._split_verdict(block.get(self.lang) or block["en"])
                if fact:
                    statement, truth = fact, "Fact"
                    explain = ("Ni ukuri. " if self.lang == "rw" else "Fact. ") + (rest or fact)
            out.append({"statement": statement, "truth": truth, "explain": explain})
        return out

    def memory(self):
        """What to keep on the phone (if the user turned memory on): topics only, no message text."""
        return {"age_group": self.age_group, "lang": self.lang, "topics": self.topics, "seen": self.seen[-10:]}


# ---------- language detection (trained on your own English and Kinyarwanda examples, no internet) ----------
def train_lang_model(ex):
    """Kinyarwanda / English identification from character patterns (trained on the training split only)."""
    tr = [e for e in ex if e["split"] == "train"]
    texts = [e["text"] for e in tr]
    langs = [e["lang"] for e in tr]
    model = make_pipeline(TfidfVectorizer(analyzer="char_wb", ngram_range=(1, 4), sublinear_tf=True),
                          LogisticRegression(max_iter=2000, class_weight="balanced"))
    return model.fit(texts, langs)


def make_detector(lang_model):
    known = {}
    try:   # exact words and phrases seen in training decide immediately
        known = {t.lower(): l for t, l in getattr(lang_model, "known_", {}).items()}
    except Exception:
        pass

    def detect_lang(text, previous="rw"):
        key = text.lower().strip(" .,!?")
        if key in known:
            return known[key]
        p = dict(zip(lang_model.classes_, lang_model.predict_proba([text])[0]))
        best = max(p, key=p.get)
        if len(text.split()) <= 1 and p[best] < 0.6:
            return previous          # one unclear word: keep the conversation's language
        return best
    return detect_lang


def data_paths(folder):
    """Use the all-in-one data file if present, otherwise the older two-file set."""
    for name in ("intyoza_data.json", "intyoza_data_v3.json"):   # older copies used the _v3 name
        p = os.path.join(folder, name)
        if os.path.exists(p):
            return p, None
    old = os.path.join(folder, "intyoza_training_data.json")
    if not os.path.exists(old):
        raise FileNotFoundError(f"intyoza_data.json not found in {folder}. Open the notebook from the Intyoza folder.")
    return old, os.path.join(folder, "intyoza_kinyarwanda.json")


def apply_workbook(qa, path, ex=None):
    """Use Intyoza_Dataset.xlsx as the source you edit offline.
    Questions sheet: edit answers, or add a new row with a new ID to add a question.
    Phrasings sheet: add rows to teach new ways of asking (Train/Test = train or test)."""
    sheet = pd.read_excel(path, sheet_name="Questions", keep_default_na=False)
    changed = added = 0
    drafts = os.environ.get("INTYOZA_INCLUDE_DRAFTS", "0") == "1"
    for _, r in sheet.iterrows():
        qid = str(r["ID"]).strip()
        if not qid:
            continue
        # New rows marked "Draft..." are not used until a reviewer changes their Review status
        # (INTYOZA_INCLUDE_DRAFTS=1 uses them anyway, for testing).
        if not drafts and qid not in qa and str(r.get("Review status", "")).strip().lower().startswith("draft"):
            continue
        q = qa.get(qid)
        if q is None:   # new question added in Excel
            if not str(r["Question (English)"]).strip() and not str(r["Question (Kinyarwanda)"]).strip():
                continue
            q = qa[qid] = {"id": qid, "topic": str(r["Topic"]).strip() or "Other", "age": str(r["Age group"]).strip() or "15-19",
                           "q_en": "", "q_rw": "", "answers": {"default": {"en": "", "rw": ""}},
                           "risk": "None", "referral": "", "sources": str(r["Sources"]).strip()}
            added += 1
        new = {"q_en": r["Question (English)"], "q_rw": r["Question (Kinyarwanda)"], "risk": r["Risk"],
               "referral": r["Where to go"], "topic": r["Topic"]}
        for k, v in new.items():
            v = str(v).strip()
            if v and v != str(q.get(k, "")):
                q[k] = v; changed += 1
        for lang, col in (("en", "Answer (English)"), ("rw", "Answer (Kinyarwanda)")):
            v = str(r[col]).strip()
            if v and v != q["answers"]["default"][lang]:
                q["answers"]["default"][lang] = v; changed += 1
        if not q["answers"]["default"]["en"]:
            q["answers"]["default"]["en"] = q["answers"]["default"]["rw"]
        if not q["q_en"]:
            q["q_en"] = q["q_rw"]
        q["status"] = r.get("Review status", "")
    new_ex = 0
    if ex is not None:
        seen = {(e["qa_id"], e["text"].strip().lower()) for e in ex}
        ph = pd.read_excel(path, sheet_name="Phrasings", keep_default_na=False)
        for _, r in ph.iterrows():
            text = str(r["How a young person might ask"]).strip()
            qid = str(r["Question ID"]).strip() or None
            if not text or (qid, text.lower()) in seen or (qid and qid not in qa):
                continue
            risk = str(r["Risk"]).strip() or (qa[qid]["risk"] if qid else "None")
            intent = str(r["Intent"]).strip() or "health"
            ex.append({"qa_id": qid, "text": text, "risk": risk, "intent": intent,
                       "lang": str(r["Language"]).strip() or "rw",
                       "split": "test" if str(r["Train/Test"]).strip().lower() == "test" else "train"})
            seen.add((qid, text.lower())); new_ex += 1
    return changed, added, new_ex


WORKBOOK_PATHS = ("Intyoza_Dataset.xlsx", os.path.join("knowledge", "Intyoza_Dataset.xlsx"),
                  os.path.join("knowledge", "Intyoza_Dataset_v3.xlsx"))


def load_raw(folder, verbose=True):
    """Load the dataset as written (before preprocessing): the JSON data file, then the review
    workbook's edits (changed answers, new questions, new phrasings). Returns (data, qa, examples, info)."""
    data_file, rw_file = data_paths(folder)
    data, qa, ex = load_data(data_file, rw_file)
    info = {"data_file": os.path.basename(data_file), "workbook": None, "workbook_edits": 0,
            "workbook_new_questions": 0, "workbook_new_phrasings": 0}
    for rel in WORKBOOK_PATHS:
        p = os.path.join(folder, rel)
        if os.path.exists(p):
            n, added, new_ex = apply_workbook(qa, p, ex)
            info.update(workbook=rel, workbook_edits=n, workbook_new_questions=added, workbook_new_phrasings=new_ex)
            if verbose:
                print(f"From {rel}: {n} edits, {added} new questions, {new_ex} new phrasings")
            break
    for q in qa.values():          # the Kinyarwanda question itself is also a way of asking it
        if q.get("q_rw"):
            ex.append({"qa_id": q["id"], "text": q["q_rw"], "risk": q["risk"], "intent": "health",
                       "lang": "rw", "split": "train"})
    return data, qa, ex, info


def load_all(folder, verbose=True):
    """Load and preprocess the dataset (load_raw + preprocess.clean_examples)."""
    data, qa, ex, _ = load_raw(folder, verbose)
    from preprocess import clean_examples
    ex, _ = clean_examples(ex, verbose=verbose)
    return data, qa, ex


INDEX_CACHE = "index_cache.npz"


def save_heads(folder, risk_clf, intent_clf, lang_model, lo, hi, safety=None):
    """Save only the small models (no need to save the matcher again)."""
    import joblib
    os.makedirs(folder, exist_ok=True)
    joblib.dump({"risk": risk_clf, "intent": intent_clf, "lang": lang_model, "lo": lo, "hi": hi, "safety": safety},
                os.path.join(folder, "intyoza_heads.joblib"))


def save_all(folder, model, risk_clf, intent_clf, lang_model, lo, hi, safety=None):
    """Save the matcher and the small models."""
    os.makedirs(folder, exist_ok=True)
    model.save(os.path.join(folder, "intyoza_matcher"))
    save_heads(folder, risk_clf, intent_clf, lang_model, lo, hi, safety)


def train_small_models(model, qa, examples, folder=None, report_csv=None):
    """Everything after the matcher: index, risk, intent, language, thresholds, safety, accuracy report.
    Used by step 5 of 1_Train.ipynb and by the refresh step."""
    cache = os.path.join(folder, INDEX_CACHE) if folder else None
    index = Index(model, qa, examples, cache=cache)
    risk_clf, intent_clf = train_heads(model, examples)
    lang_model = train_lang_model(examples)
    lo, hi = tune_thresholds(index, examples)
    print(f"Answer cut-offs: ask 'did you mean' from {lo}, answer directly from {hi}\n")
    evaluate(index, risk_clf, intent_clf, model, examples, lo, hi)
    print()
    error_report(index, examples, qa, report_csv)
    print()
    risk_char = train_char_risk(examples)
    safety = tune_safety(index, risk_clf, risk_char, model, examples, qa, lo)
    return {"index": index, "risk": risk_clf, "intent": intent_clf, "lang": lang_model,
            "lo": lo, "hi": hi, "safety": safety}


def refresh_small_models(folder):
    """Keep the trained matcher; retrain the small models after dataset edits and save them."""
    os.environ["HF_HUB_OFFLINE"] = "1"
    os.environ["TRANSFORMERS_OFFLINE"] = "1"
    from sentence_transformers import SentenceTransformer
    models = os.path.join(folder, "models")
    if not os.path.exists(os.path.join(models, "intyoza_matcher")):
        raise FileNotFoundError("No trained matcher in models/intyoza_matcher. Run steps 1 to 6 first.")
    data, qa, examples = load_all(folder)
    model = SentenceTransformer(os.path.join(models, "intyoza_matcher"))
    m = train_small_models(model, qa, examples, models, os.path.join(folder, "error_report.csv"))
    save_heads(models, m["risk"], m["intent"], m["lang"], m["lo"], m["hi"], m["safety"])
    print("\nSaved. Now chat with:  python chat.py --debug")
    return m


def build_bot(data, qa, ex, model, heads, index=None, cache=None, age_group="15-19", reply_lang="rw",
              log_path=None):
    """Put the trained parts together into a chatbot (used by load_bot and by tests)."""
    index = index or Index(model, qa, ex, cache=cache)
    lang = heads["lang"]
    lang.known_ = {e["text"].lower().strip(" .,!?"): e["lang"] for e in ex}
    return Intyoza(data, qa, index, model, heads["risk"], heads["intent"], heads["lo"], heads["hi"],
                   make_detector(lang), age_group=age_group, safety=heads.get("safety"),
                   reply_lang=reply_lang, log_path=log_path)


def load_bot(folder, data_dir, age_group="15-19", reply_lang="rw", use_documents=True, online=False,
             log_path=None):
    """Load the trained models from disk. Needs no internet unless online=True (Colab)."""
    if not online:
        os.environ["HF_HUB_OFFLINE"] = "1"
        os.environ["TRANSFORMERS_OFFLINE"] = "1"
    import joblib
    from sentence_transformers import SentenceTransformer
    for need in ("intyoza_matcher", "intyoza_heads.joblib"):
        if not os.path.exists(os.path.join(folder, need)):
            raise FileNotFoundError(f"{need} not found in {folder}. Train first with 1_Train.ipynb.")
    data, qa, ex = load_all(data_dir, verbose=False)
    model = SentenceTransformer(os.path.join(folder, "intyoza_matcher"))
    heads = joblib.load(os.path.join(folder, "intyoza_heads.joblib"))
    cache = os.path.join(folder, INDEX_CACHE)
    if not os.path.exists(cache):
        print("Preparing the question index (only the first time, a few minutes on a laptop)...")
    bot = build_bot(data, qa, ex, model, heads, cache=cache, age_group=age_group, reply_lang=reply_lang,
                    log_path=log_path)
    if use_documents:
        try:
            from doc_engine import DocEngine
            if DocEngine.available(os.path.join(folder, "doc_index")):
                print("Loading documents and language models (first answer may take a while)...")
                bot.docs = DocEngine(model, os.path.join(folder, "doc_index"), online=online)
        except Exception as e:
            print("Documents not loaded:", e)
    return bot


# ---------- chat loop (used by the notebook and by chat.py) ----------
def _ask(prompt):
    """input() that treats Ctrl+C / Ctrl+Z / closed input as 'exit' instead of crashing."""
    try:
        return input(prompt)
    except (EOFError, KeyboardInterrupt):
        return "exit"


def run_chat(bot, unanswered_csv=None, debug=False):
    bot.debug = debug
    if unanswered_csv:
        bot.log_path = unanswered_csv
    start = len(bot.unanswered)

    def show(r):
        print("\nIntyoza:", r["text"])
        for i, o in enumerate(r.get("options", []), 1):
            print(f"   {i}. {o}")

    def play_quiz():
        score, answered, items = 0, 0, bot.myth_quiz(5)
        for i, it in enumerate(items, 1):
            print(f'\n{i}. "{it["statement"]}"')
            rw = bot.lang == "rw"
            g = _ask("   Ni ibihuha cyangwa ni ukuri? (b = ibihuha / u = ukuri): " if rw else "   Myth or fact? (m/f): ").strip().lower()
            if g == "exit":
                break
            guess = "Fact" if g.startswith("u" if rw else "f") else "Myth"
            ok = guess == it["truth"] or it["truth"] == "Partly true"
            score += ok
            answered += 1
            right, wrong = ("Wabikoze neza! ", "Wibeshye. ") if rw else ("Well done! ", "Not quite. ")
            print("   " + (right if ok else wrong) + it["explain"])
        if answered:
            print(f"\n{'Amanota' if bot.lang == 'rw' else 'Score'}: {score}/{answered}")

    print("Intyoza: Muraho! Mbaza ikintu cyose. Ask me anything.")
    print("(Andika umubare uhitemo, 'quiz' ku mukino w'ibihuha, 'exit' gusohoka. / Type a number to pick, 'quiz' for the game, 'exit' to stop.)")
    while True:
        msg = _ask("\nYou: ").strip()
        if not msg:
            continue
        low = msg.lower()
        if low in ("exit", "quit", "sohoka"):
            break
        try:
            if low == "quiz":
                play_quiz()
                show(bot._topic_menu("greeting_again", kind="topics")); continue
            if low.startswith("age "):
                age = low[4:].strip()
                if age in bot.AGE_GROUPS:
                    bot.age_group = age
                    print("Age group:", age)
                else:
                    print("Age group must be one of:", ", ".join(bot.AGE_GROUPS))
                continue
            if low.isdigit():
                r = bot.choose(int(low))
                if r["type"] == "quiz":
                    play_quiz()
                    show(bot._topic_menu("greeting_again", kind="topics")); continue
                show(r); continue
            show(bot.reply(msg))
        except Exception:          # one bad message must never end the conversation
            print("\nIntyoza: Mbabarira, habaye ikibazo. Ongera ugerageze. (Sorry, something went wrong.)")
            if debug:
                import traceback
                traceback.print_exc()
    n = len(bot.unanswered) - start
    if n and bot.log_path:
        print(f"{n} unanswered questions saved to {bot.log_path}")


# ---------- training helpers: hard negatives and error report ----------
def hard_negatives(encoder, qa, n=3):
    """For each question, the n most similar OTHER questions (by the base model). Training against them
    teaches the model to separate look-alike questions (emergency pill vs abortion pill, etc.)."""
    ids = list(qa)
    vecs = encoder.encode([canonical_text(qa[i]) for i in ids], normalize_embeddings=True)
    sims = vecs @ vecs.T
    np.fill_diagonal(sims, -1)
    return {ids[k]: [ids[j] for j in np.argsort(-sims[k])[:n]] for k in range(len(ids))}


def matcher_triplets(qa, ex, negs):
    """(how a young person asked, the right question, a look-alike wrong question).
    The look-alikes take turns, so each question is separated from all of its close neighbours."""
    out, turn = [], {}
    for e in ex:
        if e["split"] == "train" and e["qa_id"] in qa:
            qid = e["qa_id"]
            options = negs[qid] if isinstance(negs[qid], list) else [negs[qid]]
            k = turn.get(qid, 0)
            turn[qid] = k + 1
            out.append((e["text"], canonical_text(qa[qid]), canonical_text(qa[options[k % len(options)]])))
    return out


def error_report(index, ex, qa, path=None):
    """Accuracy per language, the most confused question pairs, and a CSV of every mistake."""
    import collections
    te = [e for e in ex if e["split"] == "test" and e["qa_id"] in qa]
    rows, by_lang, pairs = [], collections.defaultdict(lambda: [0, 0, 0]), collections.Counter()
    for e in te:
        res = index.search(e["text"], k=3)
        got, score = res[0]
        ok1, ok3 = index.correct(e["qa_id"], got), any(index.correct(e["qa_id"], r[0]) for r in res)
        s = by_lang[e["lang"]]; s[0] += 1; s[1] += ok1; s[2] += ok3
        if not ok1:
            pairs[(e["qa_id"], got)] += 1
            rows.append({"language": e["lang"], "message": e["text"], "expected_id": e["qa_id"],
                         "expected_question": qa[e["qa_id"]]["q_rw"] or qa[e["qa_id"]]["q_en"],
                         "got_id": got, "got_question": qa[got]["q_rw"] or qa[got]["q_en"],
                         "score": round(score, 3), "right_answer_in_top3": ok3})
    print("Accuracy by language (unseen messages):")
    for lang, (n, a1, a3) in sorted(by_lang.items()):
        name = {"rw": "Kinyarwanda", "en": "English"}.get(lang, lang)
        print(f"  {name:12s} first match {a1 / n:.0%}   in top 3 {a3 / n:.0%}   ({n} messages)")
    print("\nMost confused questions (expected -> got, times):")
    for (a, b), n in pairs.most_common(12):
        print(f"  {a} -> {b}  x{n}   | {qa[a]['q_en'][:45]}  ->  {qa[b]['q_en'][:45]}")
    if path:
        pd.DataFrame(rows).to_csv(path, index=False)
        print(f"\nAll {len(rows)} mistakes saved to {path}. Add phrasings for these questions in the workbook.")
    return rows
