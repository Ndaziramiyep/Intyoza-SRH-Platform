"""Intyoza answer engine: Intyoza's own model reads the trusted sources, then writes an answer to the question
actually asked (retrieval-augmented generation). Everything runs on Intyoza's own machine: no message is sent to
an outside AI company.

    llm = make_llm()                                    # Intyoza's answer model (models/intyoza_writer), local
    engine = AnswerEngine(bot, llm, docs=docs)          # bot = intyoza_core.load_bot(...), docs = DocEngine (optional)
    r = engine.answer("Ese umuhungu nawe yajya mu mihango?", history=[], age_group="15-19", lang="rw")
    r["reply"], r["status"], r["sources"], r["checks"]

The answer model is AfriqueQwen3.5-4B-Instruct (McGill NLP, CC-BY-4.0, trained on Kinyarwanda) fine-tuned on
Intyoza's own data with writer_training.py (4_Train_Answer_Model_Colab.ipynb).

How one question is answered
  1. Understand: the model reads the message with the conversation and writes the full question (follow-ups like
     "naho ku bahungu?" become complete), the same question in English (the documents are in English), and search
     words. It also says whether the question is about SRH or wellbeing, or off topic.
  2. Read: the knowledge is searched with all of these readings, by meaning (the trained matcher) and by words
     (BM25), and the two rankings are merged. Knowledge = the 289 approved Intyoza answers (reviewed, most current,
     in Kinyarwanda and English) + every passage of the trusted documents (Rwanda MoH/RBC, WHO, UNFPA, UNESCO).
  3. Write: the model writes the answer to the exact question, using ONLY those sources, in Kinyarwanda (or
     English), for the young person's age group. If the sources don't answer it, it says so (NOT_COVERED).
  4. Check: rules that need no model (no number, age, law number or phone number that is not in the sources; no
     medicine doses; the right language), then a second, separate reading by the model: does it answer the
     question that was asked (not a nearby one), is every fact in the sources, is it safe and kind. A failed answer
     is rewritten once with the problems listed; if it still fails, Intyoza does not guess.
  5. Honest when not covered: "I don't have reliable information on this" + where to ask (health centre, 114),
     and the question is saved to intyoza_unanswered.csv for the health team.

Safety (help for danger, approved help texts) and everyday conversation stay in chatbot.py, before this engine.
"""
import json
import math
import os
import re
import time
from collections import Counter

import numpy as np

from intyoza_core import normalize

HERE = os.path.dirname(os.path.abspath(__file__))
DOSE = re.compile(r"\b\d+(\.\d+)?\s?(mg|ml|g|mcg|µg|iu)\b|\b\d+\s?(tablets?|pills?|ibinini)\b", re.I)


# ===================================================================== language model (local only)
WRITER_DIR = os.path.join(HERE, "models", "intyoza_writer")      # Intyoza's fine-tuned answer model (LoRA adapter)


class LLM:
    """One interface for the language model: chat(system, user) -> text."""
    name = "none"
    ok = False

    def chat(self, system, user, max_tokens=700, temperature=0.0, base=False, start=""):
        """start: the beginning of the reply, given to the model to continue. base=True: the model without Intyoza's fine-tuning (for jobs it was not trained on, e.g. crisis.py)."""
        raise NotImplementedError


class LocalLLM(LLM):
    """Intyoza's own answer model, on this machine (a GPU is needed for usable speed).
    adapter: folder of the fine-tuned adapter (default models/intyoza_writer); without it, the base model is used."""
    def __init__(self, generator=None, adapter=WRITER_DIR, base_ids=None, four_bit=False):
        if generator is None:
            from chatbot import Generator
            generator = Generator(model_ids=base_ids, max_new_tokens=500, adapter=adapter, four_bit=four_bit)
        self.gen = generator
        self.ok = bool(getattr(generator, "ok", False))
        self.fine_tuned = bool(getattr(generator, "adapter_loaded", False))
        self.name = f"{getattr(generator, 'model_id', None)}" + (" + Intyoza fine-tuning" if self.fine_tuned else " (base, not fine-tuned)")

    def chat(self, system, user, max_tokens=700, temperature=0.0, base=False, start=""):
        return self.gen.chat(system, user, max_new_tokens=max_tokens, temperature=temperature, base=base,
                             start=start)


def make_llm(adapter=WRITER_DIR, base_ids=None, four_bit=False, verbose=True):
    """Loads Intyoza's answer model. INTYOZA_LLM=none switches it off (approved answers to clear matches only)."""
    choice = (os.environ.get("INTYOZA_LLM") or "").lower()
    if choice == "none":
        return None
    import torch
    if not torch.cuda.is_available() and choice != "cpu":
        if verbose:
            print("Answer model: not loaded (no GPU; a 4B model on a CPU is too slow for chat). INTYOZA_LLM=cpu forces it.")
        return None
    llm = LocalLLM(adapter=adapter, base_ids=base_ids, four_bit=four_bit)
    if verbose:
        print("Answer model:", llm.name if llm.ok else "NOT available (no GPU, or it did not load)")
    return llm if llm.ok else None


# ===================================================================== knowledge
def _words(text):
    return re.findall(r"[a-zà-ÿ0-9']+", (text or "").lower())


class BM25:
    """Word search (Okapi BM25): finds exact terms such as 'PEP', '026/2025' or 'Isange' that meaning search can miss."""
    def __init__(self, docs, k1=1.4, b=0.75):
        self.k1, self.b = k1, b
        self.tf = [Counter(_words(d)) for d in docs]
        self.len = np.array([sum(t.values()) for t in self.tf], dtype=np.float32)
        self.avg = float(self.len.mean()) if len(self.len) else 1.0
        df = Counter(w for t in self.tf for w in t)
        n = len(docs)
        self.idf = {w: math.log(1 + (n - c + 0.5) / (c + 0.5)) for w, c in df.items()}
        self.post = {}
        for i, t in enumerate(self.tf):
            for w in t:
                self.post.setdefault(w, []).append(i)

    def scores(self, query):
        s = np.zeros(len(self.tf), dtype=np.float32)
        for w in set(_words(query)):
            if w not in self.idf:
                continue
            for i in self.post[w]:
                f = self.tf[i][w]
                s[i] += self.idf[w] * f * (self.k1 + 1) / (f + self.k1 * (1 - self.b + self.b * self.len[i] / self.avg))
        return s


def load_source_notes(doc_dir=None):
    """documents/SOURCES.json: title, publisher, year and a note (e.g. 'written before Law N° 026/2025') per file."""
    path = os.path.join(doc_dir or os.path.join(HERE, "documents"), "SOURCES.json")
    if not os.path.exists(path):
        return {}
    with open(path, encoding="utf-8") as f:
        items = json.load(f)
    from doc_engine import title_of
    return {title_of(it["file"]): it for it in items}


class KnowledgeBase:
    """Approved answers + document passages, searched by meaning and by words."""
    RRF = 60

    def __init__(self, bot, docs=None, doc_dir=None, demo=None):
        """demo: demo Q&A items (demo_data.py), or None. Without demo, demo documents (DEMO_*) are left out too."""
        self.bot, self.docs = bot, docs
        self.ids = list(bot.qa)
        self.approved_text = [self._approved_blob(bot.qa[i]) for i in self.ids]
        self.bm_approved = BM25(self.approved_text)
        self.use_demo = bool(demo)
        self.passages = docs.passages if docs is not None else []
        self.doc_ok = np.array([self.use_demo or not str(p.get("source", "")).startswith("DEMO") for p in self.passages], bool)
        self.bm_docs = BM25([p["text"] for p in self.passages]) if self.passages else None
        self.notes = load_source_notes(doc_dir)
        self.demo = list(demo or [])
        if self.demo:                          # one vector per demo item: the mean of its ways of asking
            texts, owner = [], []
            for n, it in enumerate(self.demo):
                qs = it["questions_en"][:6] + it.get("questions_rw", [])[:2]
                texts += [normalize(q) for q in qs]
                owner += [n] * len(qs)
            v = np.asarray(bot.enc.encode(texts, normalize_embeddings=True, batch_size=64), dtype=np.float32)
            self.demo_vecs = np.zeros((len(self.demo), v.shape[1]), np.float32)
            np.add.at(self.demo_vecs, np.array(owner), v)
            self.demo_vecs /= np.linalg.norm(self.demo_vecs, axis=1, keepdims=True) + 1e-9
            self.bm_demo = BM25([" ".join(it["questions_en"] + it.get("questions_rw", []) + [it["answer_en"]])
                                 for it in self.demo])

    @staticmethod
    def _approved_blob(q):
        a = q["answers"]["default"]
        return " ".join(x for x in (q["q_en"], q.get("q_rw", ""), a.get("en", ""), a.get("rw", "")) if x)

    def _fuse(self, rankings, n):
        score = {}
        for ranking in rankings:
            for r, i in enumerate(ranking):
                score[i] = score.get(i, 0.0) + 1.0 / (self.RRF + r + 1)
        return sorted(score, key=lambda i: -score[i])[:n]

    def search(self, queries, k_approved=5, k_docs=6, depth=25):
        queries = [q for q in dict.fromkeys(q.strip() for q in queries if q and q.strip())]
        b, rank_a, rank_d, best_a, best_d = self.bot, [], [], {}, {}
        for q in queries:
            hits = b.index.search(normalize(q), k=depth)                    # meaning: approved questions
            for qid, sc in hits:
                best_a[qid] = max(best_a.get(qid, -1), sc)
            rank_a.append([qid for qid, _ in hits])
            s = self.bm_approved.scores(q)                                   # words: approved questions + answers
            rank_a.append([self.ids[i] for i in np.argsort(-s)[:depth] if s[i] > 0])
            if self.passages and k_docs:
                hits = [(p, sc) for p, sc in self.docs.search(q, k=depth * 2)
                        if self.use_demo or not str(p.get("source", "")).startswith("DEMO")][:depth]
                for p, sc in hits:                                           # meaning: documents
                    best_d[id(p)] = max(best_d.get(id(p), -1), sc)
                rank_d.append([id(p) for p, _ in hits])
                s = self.bm_docs.scores(q) * self.doc_ok                     # words: documents
                rank_d.append([id(self.passages[i]) for i in np.argsort(-s)[:depth] if s[i] > 0])
        approved = [(qid, best_a.get(qid, 0.0)) for qid in self._fuse(rank_a, k_approved)]
        by_id = {id(p): p for p in self.passages}
        docs = [(by_id[i], best_d.get(i, 0.0)) for i in self._fuse(rank_d, k_docs)] if self.passages else []
        return approved, docs

    def search_demo(self, queries, k=2, depth=25):
        """Demo Q&A items (public data, not reviewed by Intyoza) for the queries: [(item, score)]."""
        if not self.demo or not k:
            return []
        queries = [q for q in dict.fromkeys(q.strip() for q in queries if q and q.strip())]
        ranks, best = [], {}
        qv = np.asarray(self.bot.enc.encode([normalize(q) for q in queries], normalize_embeddings=True))
        for n, q in enumerate(queries):
            sim = self.demo_vecs @ qv[n]
            top = np.argsort(-sim)[:depth]
            for i in top:
                best[i] = max(best.get(i, -1), float(sim[i]))
            ranks.append(list(top))
            s = self.bm_demo.scores(q)
            ranks.append([i for i in np.argsort(-s)[:depth] if s[i] > 0])
        return [(self.demo[i], best.get(i, 0.0)) for i in self._fuse(ranks, k)]

    def note_for(self, source):
        it = self.notes.get(source, {})
        return it.get("note", ""), it.get("year", "")


# ===================================================================== prompts
SYSTEM_UNDERSTAND = """You read messages that young people in Rwanda send to Intyoza, a sexual and reproductive health (SRH) educator.
Using the conversation, return ONLY a JSON object:
{"question_rw": "the message as one complete question in Kinyarwanda (resolve follow-ups like 'naho ku bahungu?' or 'nakibona he?' using the conversation)",
 "question_en": "the same complete question in English",
 "searches": ["2 to 4 short English search queries with the medical words a health document would use"],
 "scope": "srh" or "wellbeing" or "off_topic",
 "danger": true or false}
scope "srh": body, puberty, periods, sex, sexuality, relationships, consent, contraception, pregnancy, abortion and the law, HIV, STIs, violence, health services and laws in Rwanda.
scope "wellbeing": feelings, stress, mental health, alcohol and drugs, pressure from family, school or friends.
scope "off_topic": anything else (sport, homework, cooking, politics...).
danger: true only if the person describes being in danger now (violence, abuse, wanting to die, heavy bleeding, severe pain)."""

SYSTEM_WRITE = """You are Intyoza, a warm, accurate sexual and reproductive health educator for young people in Rwanda.
The young person is in the age group {age}. Answer their QUESTION using ONLY the SOURCES below.

Rules:
1. Answer exactly the question that was asked, not a nearby question. Start with the direct answer (for a yes/no question start with "Yego." or "Oya."; in English "Yes." or "No."), then explain simply in 2 to 6 short sentences a teenager understands.
2. Every health fact, number, age, law and phone number must come from the SOURCES. Do not add facts from your own knowledge. Simple everyday reasoning that follows directly from the sources is fine (for example, sources that say periods come from the uterus mean boys, who have no uterus, do not have periods).
3. Sources marked APPROVED were reviewed by Intyoza's health team and are the most current, especially on Rwandan laws, ages and services. If a document or a DEMO SOURCE disagrees with an APPROVED source, follow the APPROVED source. Documents marked as written before a newer law may be out of date on that point. DEMO SOURCES come from other countries' public data: never use them for Rwandan laws, ages, services or phone numbers.
4. If the SOURCES do not contain enough to answer this question correctly, reply with exactly: NOT_COVERED
5. Never give medicine doses or tell someone how much medicine to take; say a health worker will explain.
6. Be kind and non-judgemental; do not lecture or shame. For 10-14 keep it very simple.
7. Write in {language}, the natural, simple {language} spoken in Rwanda. {language_note}
8. After the answer, on a new line, list the sources you used, like: SOURCES: S1, S3
Output only the answer and the SOURCES line."""

# ===================================================================== talking with young people (2026-11-09)
# The fine-tuned writer (SYSTEM_WRITE, writer_training.py) learned to copy approved answers and to say NOT_COVERED
# too easily, wrote the same length whatever was asked, and never asked back (conversation tests, 2026-11-09:
# 52/73 then 6/87 with the engagement check). Live answers are now written with TALK below by the base model
# (INTYOZA_WRITER=trained switches back to the fine-tuned writer). Understanding and checking still use the
# fine-tuned model, and every rule check still applies: facts and numbers only from the sources.
TALK = """You are Intyoza, chatting with a young person in Rwanda (age group {age}) about their body, relationships,
sexual and reproductive health and how they feel. Write in {language}. {language_note}
1. Use ONLY facts from the SOURCES. Numbers, ages, laws and phone numbers only if they are in the SOURCES. Medicine
   names exactly as the SOURCES write them, never mixed up. No medicine doses. Sources marked APPROVED are reviewed by Intyoza's health team: follow them when sources disagree. DEMO
   sources are from other countries: never use them for Rwandan laws, ages, services or phone numbers.
2. LISTEN FIRST. If a good answer depends on their own situation and the conversation does not tell you yet (a late
   period: have they had sex, how late is it; a symptom: what exactly, since when; a relationship: how do they feel),
   say one short helpful thing and ask ONE simple question to understand. Do not send them to a doctor before you
   understand. If the conversation already tells you, use it.
3. LENGTH: {depth}
4. Say it in your own simple words, like a trusted older sibling or a youth-corner peer: no lecture, no judging, no
   headings, no copying a source paragraph. Do not open with a formula such as "Thank you for asking", "Great
   question", "I understand" or "That sounds". Never joke about their worries, no slang like "bro". Do not invent
   things about them (for example that they take pills) that they did not say.
5. End with ONE question that fits their situation, or a short offer to explain more about THIS topic (an offer
   that makes sense for what you just said).
6. If the SOURCES cover only part of the question, answer that part and say honestly what you are not sure about,
   and that a health worker at the youth corner can help with the rest. Write only NOT_COVERED when nothing in the
   SOURCES is about the question.
7. After the reply, on a new line, list the sources you used, like: SOURCES: S1, S3"""

DEPTH = {
    "short": "2 to 4 short sentences, at most 70 words, like a chat message.",
    "brief": "They asked for it short: 1 or 2 sentences, at most 40 words.",
    "long": "They asked for a full explanation: 120 to 230 words, in clear parts, still simple, no headings.",
    "more": "They asked to hear more about what you just told them: 60 to 150 words with new details from the SOURCES "
            "(do not repeat what you already said), still simple, no headings.",
}
LONG_ASK = re.compile(r"\b(explain|describe|tell me (more|everything)|more about|in detail|details?|in long|fully|"
                      r"everything about|elaborate|how does .* work|sobanura|nsobanurira|ndasobanurira|"
                      r"mbwira byinshi|birambuye|byose)\b", re.I)
BRIEF_ASK = re.compile(r"\b(briefly|brief|in short|short answer|quick(ly)?|summar|muri make|mu magambo make|"
                       r"mu ncamake)\b", re.I)
# A follow-up that means nothing without the conversation before it.
BARE_FOLLOW_UP = re.compile(r"^\W*(are you sure|really|why|how|how so|explain how|and then|so|what do you mean|"
                            r"ni byo koko|koko|kuki|gute|bite)\W*$", re.I)
STOCK_OPENING = re.compile(r"^\W*(urakoze (ku|kubi|kubimbwira|kubaza)|nabyumvise|nishimiye|ndakumva|"
                           r"thank you for (asking|telling|sharing)|great question|good question|i understand|"
                           r"that sounds|it sounds like|i'?m (really |so )?(glad|sorry))", re.I)
OFFER = re.compile(r"(want me to|would you like|do you want|shall i|i can (also )?(explain|tell|help)|"
                   r"ushaka ko|wifuza ko|nagufasha|nakubwira|nagusobanurira)", re.I)


# Problems of style only: after the last try, a reply with only these is used (the facts passed every check).
SOFT = ("only ", "ends without a question", "opens with a stock phrase", "has headings", "repeats the approved answer")
OFFER_LINE = {"en": "Want me to explain more?", "rw": "Wifuza ko nagusobanurira birambuye?"}


PROFILE_FIELDS = (("ageBand", "age group"), ("gender", "gender"), ("district", "district"),
                  ("language", "language"), ("pastTopics", "topics asked about before"))


def profile_text(profile):
    """The young person's account details as one line for the prompt ("" when there are none). Only these fields
    are used; nothing else from the account is ever put in a prompt."""
    if not profile:
        return ""
    parts = []
    for key, label in PROFILE_FIELDS:
        v = profile.get(key)
        if isinstance(v, (list, tuple)):
            v = ", ".join(map(str, v[:5]))
        if v not in (None, "", "UNKNOWN"):
            parts.append(f"{label}: {v}")
    return "; ".join(parts)


def trained_jobs(adapter=None):
    """The jobs Intyoza's fine-tuning was trained for (intyoza_writer.json "jobs"). A reply type whose job is not in
    it ("talk", "crisis") is written by the base model with the adapter switched off."""
    path = os.path.join(adapter or WRITER_DIR, "intyoza_writer.json")
    try:
        with open(path, encoding="utf-8") as f:
            return set(json.load(f).get("jobs") or [])
    except (OSError, ValueError):
        return set()


def depth_of(message):
    """short (default), brief or long: how much the young person asked for."""
    if BRIEF_ASK.search(message or ""):
        return "brief"
    if LONG_ASK.search(message or ""):
        return "long"
    return "short"


def talk_prompt(question, u, sources, age_group, lang, depth, history=(), feedback=None, profile=None):
    language = "Kinyarwanda" if lang == "rw" else "English"
    task = TALK.format(age=age_group, language=language, language_note=KIN_NOTE if lang == "rw" else "",
                       depth=DEPTH[depth])
    conv = history_text(history)
    # The base model follows a task in the message better than one only in the system prompt (Kaggle, 2026-11-09).
    about = profile_text(profile)
    user = (f"YOUR TASK:\n{task}\n\nSOURCES:\n{_context(sources)}\n\n"
            + (f"ABOUT THEM (from their account: use it to choose your words; never assume what happened from it, "
               f"never repeat it back to them, and it is not a source of facts): {about}\n\n" if about else "")
            + (f"CONVERSATION SO FAR:\n{conv}\n\n" if conv else "")
            + f"THE YOUNG PERSON SAID: {question}\n(Meaning: {u['question_en']})")
    if feedback:
        user += f"\n\nYour previous reply had these problems, fix them:\n{feedback}"
    return "You are Intyoza, a warm and accurate SRH chat for young people in Rwanda.", user + "\n\nWrite your reply now."


def talk_problems(reply, sources, depth):
    """Checks for the conversational replies, on top of rule_problems."""
    out = []
    words = len(reply.split())
    limit = {"brief": 50, "short": 95, "long": 280, "more": 180}[depth]
    if words > limit:
        out.append(f"only {limit} words wanted, {words} written: too long for what they asked ({DEPTH[depth]})")
    if depth == "long" and words < 90:
        out.append(f"only {words} words: they asked for a full explanation ({DEPTH['long']})")
    if depth == "more" and words < 45:
        out.append(f"only {words} words: they asked to hear more ({DEPTH['more']})")
    end = " ".join(re.split(r"(?<=[.!?])\s+", reply.strip())[-2:])
    if "?" not in end and not OFFER.search(end):
        out.append("ends without a question or an offer to explain more")
    if STOCK_OPENING.search(reply):
        out.append("opens with a stock phrase; start with what they asked")
    if re.search(r"^\s*#", reply, re.M):
        out.append("has headings")
    r_words = re.findall(r"\w+", reply.lower())
    for s in sources:                    # pasted the approved answer (test 2026-11-10: "my period is late" got the
        if s.get("kind") != "approved":  # whole cycle paragraph with "Where to go:" instead of a question back)
            continue
        a = re.findall(r"\w+", s["text"].split("Answer:", 1)[-1].lower())
        grams = {" ".join(a[i:i + 18]) for i in range(max(0, len(a) - 17))}
        if any(" ".join(r_words[i:i + 18]) in grams for i in range(max(0, len(r_words) - 17))):
            out.append("repeats the approved answer word for word: use its facts, but talk to this person in your own "
                       "words, as short as they asked")
            break
    for s in sources:                    # copied a document paragraph (12 words in a row)
        if s.get("kind") == "approved":
            continue
        w = s["text"].lower().split()
        grams = {" ".join(w[i:i + 12]) for i in range(max(0, len(w) - 11))}
        r = reply.lower().split()
        if any(" ".join(r[i:i + 12]) in grams for i in range(max(0, len(r) - 11))):
            out.append("copies a source word for word; say it in your own simple words")
            break
    return out


KIN_NOTE = ("Use the usual words: imihango, ubwangavu, ubugimbi, agakingirizo, kuboneza urubyaro, virusi itera SIDA, "
            "indwara zandurira mu mibonano mpuzabitsina, ikigo nderabuzima, serivisi z'urubyiruko, intanga ngabo, "
            "intanga ngore, nyababyeyi. Do not mix in English sentences.")

SYSTEM_CHECK = """You review an answer that Intyoza (an SRH educator for young people in Rwanda, age group {age}) wrote from SOURCES.
Return ONLY a JSON object:
{{"answers_question": true/false, "supported": true/false, "unsupported": ["each claim not found in the SOURCES"], "safe": true/false, "language_ok": true/false, "problems": "short description, or empty"}}
answers_question: it directly answers the QUESTION that was asked (false if it answers a different, nearby question or avoids it).
supported: every health fact, number, age, law and phone number in the ANSWER is in the SOURCES or follows directly from them. Friendly wording and advice to visit a health centre are fine.
safe: no medicine doses, nothing harmful, kind and non-judgemental, suitable for the age group.
language_ok: written in {language} (Rwandan {language}, not mixed with another language)."""

TEXT = {
    "not_covered": {
        "rw": "Mbabarira, ntabwo mfite amakuru yizewe ahagije yo gusubiza icyo kibazo neza, kandi sinshaka kukubwira "
              "ibitari ukuri. Ushobora kukibaza umukozi w'ubuzima muri serivisi z'urubyiruko ku kigo nderabuzima "
              "kikwegereye, cyangwa ugahamagara umurongo w'ubuzima 114 (ni ubuntu). Ikibazo cyawe nakibikiye itsinda "
              "ry'ubuzima rya Intyoza kugira ngo rigishakire igisubizo.",
        "en": "Sorry, I don't have reliable enough information to answer that well, and I don't want to tell you "
              "something that isn't true. You can ask a health worker at the youth corner of your nearest health "
              "centre, or call the free health line 114. I have saved your question for Intyoza's health team."},
    "off_topic": {
        "rw": "Ndi Intyoza: mfasha ku bibazo by'umubiri, ubwangavu n'imihango, urukundo n'imibanire, kuboneza "
              "urubyaro, virusi itera SIDA n'izindi ndwara, n'ubuzima bwo mu mutwe. Icyo kibazo ntabwo kiri mu byo "
              "nzi. Hari icyo wifuza kumenya kuri izi ngingo?",
        "en": "I'm Intyoza: I help with questions about your body, puberty and periods, relationships, family "
              "planning, HIV and other infections, and how you feel. That question is outside what I know. Is there "
              "something on these topics you'd like to know?"},
    "no_llm": {
        "rw": "Ntabwo nshobora kwandika igisubizo cy'icyo kibazo ubu.",
        "en": "I can't write an answer to that question right now."},
}


def _json(text):
    """The first JSON object in a model reply (models sometimes wrap it in ``` or add words)."""
    m = re.search(r"\{.*\}", text or "", re.S)
    if not m:
        return None
    try:
        return json.loads(m.group())
    except json.JSONDecodeError:
        try:
            return json.loads(re.sub(r",\s*}", "}", m.group().replace("\n", " ")))
        except json.JSONDecodeError:
            return None


def _numbers(text):
    return set(re.findall(r"\d+(?:[.,/]\d+)*", text or ""))


# ===================================================================== prompts as functions
# The engine and the fine-tuning (writer_training.py) build every prompt with these same functions, so the model
# is trained on exactly what it sees in use.
def history_text(history, n=6):
    return "\n".join(f"{'Young person' if r == 'user' else 'Intyoza'}: {t[:400]}" for r, t in list(history)[-n:])


def understand_prompt(message, history=()):
    conv = history_text(history)
    return SYSTEM_UNDERSTAND, (f"CONVERSATION SO FAR:\n{conv}\n\n" if conv else "") + f"NEW MESSAGE: {message}"


def parse_understanding(text, message):
    u = _json(text) or {}
    u = {k: v for k, v in u.items() if v not in (None, "")}
    u.setdefault("question_rw", message)
    u.setdefault("question_en", message)
    u["searches"] = [x for x in u.get("searches", []) if isinstance(x, str)][:4]
    u["scope"] = u.get("scope") if u.get("scope") in ("srh", "wellbeing", "off_topic") else "srh"
    u["danger"] = bool(u.get("danger"))
    return u


def understanding_json(question_rw, question_en, searches, scope="srh", danger=False):
    return json.dumps({"question_rw": question_rw, "question_en": question_en, "searches": searches,
                       "scope": scope, "danger": danger}, ensure_ascii=False)


def approved_source(q, age_group="15-19", score=0.0, lang=None):
    """lang: only the answer in the reply language (shorter prompts: faster, and fits the model's limit)."""
    block = q["answers"].get(age_group) or q["answers"]["default"]
    langs = [lang] if lang in ("rw", "en") and block.get(lang) else ["rw", "en"]
    ans = " | ".join(f"{l.upper()}: {block[l]}" for l in langs if block.get(l))
    ref = f" Where to go: {q['referral']}" if q.get("referral") else ""
    return {"label": f"Intyoza approved answer {q['id']}", "id": q["id"], "score": score, "kind": "approved",
            "text": f"APPROVED (Intyoza health team; based on {q.get('sources') or 'official sources'})\n"
                    f"Question: {q['q_en']} / {q.get('q_rw', '')}\nAnswer: {ans}{ref}"}


def demo_source(it, score=0.0):
    from demo_data import source_text
    return {"label": f"DEMO {it['id']} ({it['source']})", "id": None, "demo_id": it["id"], "score": score,
            "kind": "demo", "text": source_text(it)}


def document_source(p, note="", year="", score=0.0, max_words=None):
    head = f"DOCUMENT: {p['source']}" + (f" ({year})" if year else "") + f", page {p.get('page', '?')}"
    if note:
        head += f". NOTE: {note}"
    text = p["text"] if not max_words else " ".join(p["text"].split()[:max_words])
    return {"label": f"{p['source']}, p. {p.get('page', '?')}", "id": None, "score": score, "kind": "document",
            "text": f"{head}\n{text}"}


def _context(sources):
    return "\n\n".join(f"[S{i + 1}] {x['text']}" for i, x in enumerate(sources))


def write_prompt(question, u, sources, age_group, lang, feedback=None):
    language = "Kinyarwanda" if lang == "rw" else "English"
    system = SYSTEM_WRITE.format(age=age_group, language=language, language_note=KIN_NOTE if lang == "rw" else "")
    user = (f"SOURCES:\n{_context(sources)}\n\nTHE YOUNG PERSON ASKED: {question}\n"
            f"(In full: {u['question_rw']} / {u['question_en']})")
    if feedback:
        user += f"\n\nA reviewer found problems in your previous answer:\n{feedback}\nWrite a corrected answer."
    return system, user


def check_prompt(reply, sources, question_en, age_group, lang):
    language = "Kinyarwanda" if lang == "rw" else "English"
    return (SYSTEM_CHECK.format(age=age_group, language=language),
            f"SOURCES:\n{_context(sources)}\n\nQUESTION: {question_en}\n\nANSWER:\n{reply}")


def check_json(answers_question=True, supported=True, unsupported=(), safe=True, language_ok=True, problems=""):
    return json.dumps({"answers_question": answers_question, "supported": supported, "unsupported": list(unsupported),
                       "safe": safe, "language_ok": language_ok, "problems": problems}, ensure_ascii=False)


def parse_check(text):
    v = _json(text)
    if v is None:
        return ["the review could not be read"], {}
    problems = []
    if not v.get("answers_question", False):
        problems.append("does not answer the question that was asked")
    if not v.get("supported", False):
        problems.append("facts not in the sources: " + "; ".join(list(map(str, v.get("unsupported") or []))[:5]))
    if not v.get("safe", False):
        problems.append("not safe or not kind: " + str(v.get("problems", "")))
    if not v.get("language_ok", True):
        problems.append("language: " + str(v.get("problems", "")))
    return problems, v


def split_sources(text, sources):
    """'answer\nSOURCES: S1, S3' -> ('answer', [0, 2])"""
    m = re.search(r"\n?\s*SOURCES?\s*:\s*(.*)$", text, re.I | re.S)
    used = []
    if m:
        used = [int(n) - 1 for n in re.findall(r"S?(\d+)", m.group(1))]
        text = text[:m.start()]
    text = re.sub(r"\s*\[S\d+(?:\s*,\s*S?\d+)*\]", "", text).strip()
    used = [i for i in dict.fromkeys(used) if 0 <= i < len(sources)]
    return text, used


# Offers a chat cannot keep (test 2026-11-11: "Want me to draw it too?")
CANT_DO = re.compile(r"\b(draw|sketch|send (you )?(a |an |the )?(picture|photo|image|video|link|file|diagram)|show you "
                     r"(a |an |the )?(picture|photo|image|diagram|video)|call you|meet (you|up)|book (you|an "
                     r"appointment)|remind you|come (with you|to you)|kugushushanyiriza|kukoherereza|kuguhamagara)\b", re.I)


def drop_cant_do(reply, lang):
    """A last sentence offering something a chat cannot do becomes the usual offer line."""
    parts = re.split(r"(?<=[.!?])\s+", reply.strip())
    if parts and CANT_DO.search(parts[-1]):
        parts[-1] = OFFER_LINE.get(lang, OFFER_LINE["en"])
    return " ".join(parts)


def tidy_reply(reply, lang):
    """Removes source-format labels the model sometimes copies ("RW: ...", "| EN: ...") and puts the
    'where to go' line in the reply language."""
    reply = re.sub(r"^\s*(RW|EN)\s*:\s*", "", reply.strip())
    reply = re.split(r"\s*\|\s*(EN|RW)\s*:", reply)[0].strip()
    if lang == "rw":
        reply = re.sub(r"\bWhere to go\s*:", "Aho wajya:", reply)
    else:
        reply = re.sub(r"\bAho wajya\s*:", "Where to go:", reply)
    return reply


# Each help number belongs to one service (approved help texts). A reply that puts a service next to another
# number is wrong even when both numbers are in the sources (test 2026-11-10: "RIB is 116"; RIB is 166).
SERVICE_NUMBERS = [(re.compile(r"\bRIB\b|rwanda investigation", re.I), {"166", "3512"}),
                   (re.compile(r"child helpline|helpline for (children|under|anyone under)|umurongo wo gufasha abana",
                               re.I), {"116"}),
                   (re.compile(r"isange", re.I), {"3029"}),
                   (re.compile(r"\bGBV line|gender-based violence line|umurongo wo kurwanya ihohoterwa", re.I), {"3512"}),
                   (re.compile(r"health (call centre|call center|line)|\bRBC\b|umurongo w'ubuzima", re.I), {"114"})]
HELP_NUMBER = re.compile(r"\b(112|114|116|166|3029|3512)\b")


def service_number_problems(reply):
    """Every named service must go with its own number: in each part of a sentence (split at . ; , or and) the first
    help number after the name, or else the last one before it. Parts without a number are not judged."""
    out = []
    for part in re.split(r"[.;\n,]|\b(?:or|and|cyangwa|na)\b", reply or ""):
        if not part:
            continue
        nums = [(m.start(), m.group()) for m in HELP_NUMBER.finditer(part)]
        for name, own in SERVICE_NUMBERS:
            for m in name.finditer(part):
                after = [n for pos, n in nums if pos >= m.end()]
                before = [n for pos, n in nums if pos < m.start()]
                got = after[0] if after else (before[-1] if before else None)
                if got and got not in own:
                    out.append(f"wrong number for {m.group()}: {got} (it is {' or '.join(sorted(own))})")
    return out


# Hopeless words a reply must never state back as a fact (test 2026-11-10: "no one cares about me" was answered
# "No one cares about you.").
HOPELESS = re.compile(r"no ?one (cares|loves|likes|wants)|nobody (cares|loves|likes|wants)|(worthless|useless|"
                      r"a burden|not worth|no reason to live|hate (myself|yourself)|better off dead|ntawe "
                      r"(unkunda|ukunda|unyitayeho|unyitaho|ukwitayeho)|ntacyo (maze|umaze|bumaze)|nta gaciro)", re.I)
SOFTENED = re.compile(r"\b(feel|feels|felt|feeling|seem|seems|think|thought|believe|say|said|may|might|like|when|even|"
                      r"if|but|not|never|wumva|bisa|nubwo|ariko|si)\b|n't|\?", re.I)


# A short sentence that agrees with what they said (test 2026-11-11: "no one cares about me" got "No one really does.")
AGREES = re.compile(r"^\W*(you'?re right|that'?s (true|right)|it'?s true|true\b|ni byo|ni ukuri|ukuri|"
                    r"(no ?one|nobody|nothing|ntawe|ntacyo)\b(?=(\W+\w+){0,4}\W*$))", re.I)


# Intyoza is a chat: it has no life, family or memories (test 2026-11-11: "I saw that movie too.")
FAKE_SELF = re.compile(r"\bI(?:'ve| have)? (saw|seen|watched|went through|been through|felt the same|feel the same|"
                       r"had (that|the same|this))\b|\bwhen I was (young|little|your age|a|in)\b|\bme too\b|\bsame here\b|"
                       r"\bmy (mom|mum|mother|dad|father|sister|brother|friend|boyfriend|girlfriend|family|own)\b|"
                       r"\bnanjye (nar|nab|byam)|\bnarabibonye\b", re.I)


def _plain_words(text):
    return re.findall(r"\w+", (text or "").lower().replace("'", "").replace("\u2019", ""))


def echo_problems(reply, message):
    """A sentence that states the person's hopeless words as a fact or agrees with them, without 'it may feel
    like...' or a question; and a reply that repeats their own message as if Intyoza said it (test 2026-11-11:
    "I watched a movie about suicide and can't stop thinking about it." as the reply's first sentence)."""
    out = []
    if FAKE_SELF.search(reply or ""):
        out.append(f"talks as if Intyoza had a life (\"{FAKE_SELF.search(reply).group()}\"): you are a chat, speak about "
                   f"them")
    m, r = _plain_words(message), _plain_words(reply)
    if len(m) >= 6:
        grams = {" ".join(m[i:i + 6]) for i in range(len(m) - 5)}
        if any(" ".join(r[i:i + 6]) in grams for i in range(max(0, len(r) - 5))):
            out.append("repeats their message back as if you said it: answer them instead")
    if HOPELESS.search(message or ""):
        for sentence in re.split(r"(?<=[.!?])\s+", (reply or "").strip()):
            if (HOPELESS.search(sentence) or AGREES.search(sentence)) and not SOFTENED.search(sentence):
                out.append(f"states their hopeless words as a fact (\"{sentence[:60]}\"): never agree with them")
                break
    return out


# What each help number is for (approved help texts). "3029 for an abortion" was written (test 2026-11-11).
NUMBER_FOR = {"112": r"emergen|danger|police|kaga|byihutirwa|ubutabazi",
              "114": r"health|mental|medical|advice|question|ubuzima|inama",
              "116": r"child|under 18|young|abana|umwana|munsi y'imyaka",
              "166": r"rib|report|crime|police|investigat|kurega|icyaha",
              "3029": r"violen|rape|abuse|assault|gbv|isange|medical|psycholog|legal|help|care|support|counsel|"
                      r"ihohoterwa|ku ngufu|ubuvuzi|ubujyanama|amategeko|ubufasha",
              "3512": r"violen|gbv|abuse|rape|ihohoterwa|ku ngufu"}
ANY_NUMBER_FOR = r"free|toll|support|help|confidential|advice|anyone|everyone|all ages"
# Claims that are never true, whatever the sources (the model turned a fact around and the checker missed it).
NEVER_TRUE = [(re.compile(r"sterili[sz]ation[^.;]{0,60}\b(can|you can|could) (be )?(undo|undone|revers)", re.I),
               "sterilisation is permanent: it cannot be undone (test 2026-11-11)")]


def claim_problems(reply):
    """A help number said to be for something it is not for, and claims that are never true."""
    out = []
    for m in re.finditer(r"\b(112|114|116|166|3029|3512)\b,? (?:is )?for "
                         r"((?:(?!\b(?:112|114|116|166|3029|3512)\b)[^.;:\n]){1,60})", reply or ""):
        for piece in re.split(r",|\b(?:or|and|cyangwa|na)\b", m.group(2)):
            if (piece and piece.strip() and not re.search(NUMBER_FOR[m.group(1)] + "|" + ANY_NUMBER_FOR, piece, re.I)
                    and not any(name.search(piece) for name, _ in SERVICE_NUMBERS)):
                out.append(f"{m.group(1)} is not for \"{piece.strip()}\" (see the help texts)")
    out += [why for rx, why in NEVER_TRUE if rx.search(reply or "")]
    return out


def rule_problems(bot, reply, sources, question, lang):
    """Checks that need no model. Returns a list of problems (empty = passed)."""
    problems = []
    allowed = _numbers(" ".join(x["text"] for x in sources) + " " + question + " " + bot.d["replies"]["help_short"]["en"])
    extra = _numbers(reply) - allowed
    if extra:
        problems.append(f"numbers not in the sources: {', '.join(sorted(extra))}")
    if DOSE.search(reply) and not any(DOSE.search(x["text"]) for x in sources):
        problems.append("contains a medicine dose")
    written = bot.detect_lang(normalize(reply), lang)
    if lang == "rw" and written != "rw":
        problems.append("not written in Kinyarwanda")
    if lang == "en" and written != "en":
        problems.append("not written in English (the person asked in English)")
    if len(reply.split()) < 4:
        problems.append("too short")
    if len(reply.split()) > 260:
        problems.append("too long for a young person")
    problems += service_number_problems(reply)
    problems += claim_problems(reply)
    problems += echo_problems(reply, question)
    return problems


# A question that is not a yes/no question: where, why, how, what... (the approved answer may have been written for a
# yes/no way of asking: "nabona he inama z'amategeko" got "Yego. Buri karere...", test 2026-11-11)
WH_QUESTION = re.compile(r"\b(where|why|how|what|when|who|which|he|hehe|kuki|kubera iki|gute|iki|ki|ryari|nde|bite|"
                         r"ute|ihe|uhe|ubuhe)\b", re.I)


def drop_yes(text, message):
    """Removes a leading "Yes."/"Yego." when the message is not a yes/no question."""
    if message and WH_QUESTION.search(message):
        return re.sub(r"^\s*(yes|yego)\s*[.,!]\s*", "", text, flags=re.I)
    return text


def approved_reply(bot, qid, age_group, lang, message=""):
    """The reviewed approved answer as a reply (age group version, the referral in the reply language) and the
    offer line, as the chat gave it before (writer_training.target_answer)."""
    q = bot.qa[qid]
    block = q["answers"].get(age_group) or q["answers"]["default"]
    text = drop_yes(block.get(lang) or q["answers"]["default"].get(lang) or block.get("en", ""), message)
    if q.get("referral"):
        ref = q["referral"]
        if lang == "rw":
            tr = bot.d.get("referral_rw", {})
            ref = "; ".join(tr.get(p.strip(), p.strip()) for p in ref.split(";") if p.strip())
        text += f"\n\n{'Aho wajya' if lang == 'rw' else 'Where to go'}: {ref}"
    return text + "\n\n" + OFFER_LINE.get(lang, OFFER_LINE["en"])


def _drop_number_only(problems, verdict, reply, sources):
    """The checker sometimes calls a plain number "unsupported" when the rule check already found it in the sources
    (test 2026-11-10: "the number 1" refused "i think i have an sti"). Those complaints are dropped."""
    items = [str(x) for x in (verdict or {}).get("unsupported") or []]
    if not items or not all(re.fullmatch(r"(the )?(number )?\d+([.,]\d+)?", x.strip().lower()) for x in items):
        return problems
    allowed = _numbers(" ".join(x["text"] for x in sources))
    if all(re.sub(r"\D", "", x) in allowed or len(re.sub(r"\D", "", x)) == 1 for x in items):
        return [p for p in problems if not p.startswith("facts not in the sources")]
    return problems


# ===================================================================== engine
class AnswerEngine:
    MAX_TRIES = 2          # first answer + one rewrite after the review
    K_APPROVED, K_DOCS, K_DEMO = 3, 3, 2

    def __init__(self, bot, llm, docs=None, doc_dir=None, review=True, log_path=None, demo=None):
        """demo: demo Q&A items from demo_data.load() (public data for the demo), or None for approved data only."""
        self.bot, self.llm, self.docs, self.review = bot, llm, docs, review
        self.kb = KnowledgeBase(bot, docs, doc_dir, demo=demo)
        self.log_path = log_path
        self.cache = {}
        self.stats = Counter()
        self.jobs = trained_jobs()

    @property
    def ready(self):
        return self.llm is not None and getattr(self.llm, "ok", False)

    def understand(self, message, history):
        system, user = understand_prompt(message, history)
        return parse_understanding(self.llm.chat(system, user, max_tokens=300), message)

    def sources_for(self, message, u, age_group, lang, prefer=None, depth="short", candidate=None, only_prefer=False):
        """prefer: the approved question Intyoza's matcher clearly matched (score >= hi). It goes first and only one
        other approved answer is added, so the reply is about THIS question (test 2026-11-09: "is abortion legal in
        rwanda" was answered from a contraception answer). Long answers get more material."""
        k_a, k_d = (self.K_APPROVED + 1, self.K_DOCS + 2) if depth in ("long", "more") else (self.K_APPROVED, self.K_DOCS)
        approved, docs = self.kb.search([message, u["question_rw"], u["question_en"]] + u["searches"],
                                        k_approved=k_a, k_docs=k_d)
        if prefer and prefer in self.bot.qa:
            approved = [(prefer, 1.0)] + ([] if only_prefer else [(q, s) for q, s in approved if q != prefer][:1])
        elif candidate and candidate in self.bot.qa and candidate not in [q for q, _ in approved]:
            approved = [(candidate, 0.5)] + approved[:max(0, k_a - 1)]
        src = [approved_source(self.bot.qa[qid], age_group, sc, lang) for qid, sc in approved]
        for it, sc in self.kb.search_demo([message, u["question_rw"], u["question_en"]] + u["searches"], k=self.K_DEMO):
            src.append(demo_source(it, sc))
        for p, sc in docs:
            note, year = self.kb.note_for(p["source"])
            src.append(document_source(p, note, year, sc))
        return src

    def _talk(self, question, u, sources, age_group, lang, depth, history, feedback=None, profile=None):
        # Sampling (0.7): two young people in the same situation get different words; the facts are fixed by the
        # sources and every check below. The fine-tuned adapter writes once it was trained on conversations
        # ("talk" in its jobs); before that, the base model writes with the adapter switched off.
        variety = float(os.environ.get("INTYOZA_TALK_VARIETY", "0.7"))
        return self.llm.chat(*talk_prompt(question, u, sources, age_group, lang, depth, history, feedback, profile),
                             max_tokens=600, temperature=variety, base="talk" not in self.jobs)

    def _write(self, question, u, sources, age_group, lang, feedback=None):
        # Answers are worded freshly each time (light sampling); understanding and checking stay exact.
        variety = float(os.environ.get("INTYOZA_VARIETY", "0.6"))
        return self.llm.chat(*write_prompt(question, u, sources, age_group, lang, feedback), max_tokens=700,
                             temperature=variety)

    def rule_checks(self, reply, sources, question, lang):
        return rule_problems(self.bot, reply, sources, question, lang)

    def model_check(self, reply, sources, question, age_group, lang):
        return parse_check(self.llm.chat(*check_prompt(reply, sources, question, age_group, lang), max_tokens=400))

    _split_sources = staticmethod(split_sources)

    # ---------- main ----------
    def answer(self, message, history=(), age_group="15-19", lang="rw", force_srh=False, prefer=None, profile=None,
               candidate=None, follow_up=False):
        """-> {status: answered | not_covered | off_topic | clarify | no_llm, reply, sources, approved_ids, understood,
        checks}. force_srh: answer even if the model reads it as off-topic (Intyoza's intent model says health).
        candidate: the approved question the matcher found (score >= lo, not sure enough for prefer): always among the
        sources, because the understand step can misread a message (test 2026-11-10: "why do i get hard all the time"
        was read as "I have a lot of sexual desire" and its approved answer was never shown to the model).
        follow_up: "tell me more" about the answer just given (prefer): only that approved answer, more of it."""
        history = list(history)
        if not history and BARE_FOLLOW_UP.match(message or ""):
            # "are you sure?" with nothing before it: ask what they mean instead of guessing an unrelated answer
            block = self.bot.d.get("replies", {}).get("clarify") or {}
            text = re.split(r",\s*(or|cyangwa)\b", block.get(lang) or block.get("en", ""))[0].rstrip(":, ") + "?"
            return {"status": "clarify", "reply": text, "sources": [], "approved_ids": [], "understood": {},
                    "checks": [], "related": []}
        # No cache for written replies: the same words for everyone in the same situation is what we are removing.
        if not self.ready:
            return {"status": "no_llm", "reply": TEXT["no_llm"][lang], "sources": [], "approved_ids": [],
                    "understood": {}, "checks": []}
        if prefer and not history:
            # The matcher clearly matched an approved question and there is no conversation to read: the
            # understand step would add nothing (one model call less per message, 2026-11-10).
            u = {"question_rw": message, "question_en": message, "searches": [message], "scope": "srh", "danger": False}
        else:
            u = self.understand(message, history)
        if follow_up and prefer in self.bot.qa:
            # "tell me more": search and check with the question it follows, so documents stay on that topic
            # (test 2026-11-10: "tell me more" after "what is a period" drifted to pregnancy)
            u = dict(u, searches=[self.bot.qa[prefer]["q_en"]] + list(u.get("searches") or []),
                     question_en=f"{self.bot.qa[prefer]['q_en']} - {message}")
        out = {"understood": u, "checks": [], "sources": [], "approved_ids": [], "related": []}
        if u["scope"] == "off_topic" and not force_srh:
            out.update(status="off_topic", reply=TEXT["off_topic"][lang])
            self.stats["off_topic"] += 1
            return out
        depth = "more" if follow_up else depth_of(message)
        sources = self.sources_for(message, u, age_group, lang, prefer=prefer, depth=depth, candidate=candidate,
                                   only_prefer=follow_up)
        out["related"] = [s["id"] for s in sources if s["id"]]
        question = message if not history else f"{message}  (meaning: {u['question_rw' if lang == 'rw' else 'question_en']})"
        # The checker judges the reply against the message as written AND as understood: a misread message must not
        # make a wrong-topic reply pass (test 2026-11-10: "why do i get hard all the time" got an answer on pain
        # during sex, "nareka nte ishyari" an answer on breaking up).
        asked = u["question_en"] if normalize(message) == normalize(u["question_en"]) else \
            f"{message} (understood as: {u['question_en']})"
        rescue = None        # the matcher's approved answer, once the checker confirmed it answers this question
        if lang == "rw" and not follow_up and os.environ.get("INTYOZA_RW_REPLIES", "approved") == "approved":
            # Kinyarwanda: the model had only a few Kinyarwanda conversations to learn from and invented words and
            # facts ("gukuramo inda birategetswe", test 2026-11-10). When an approved answer matches (the matcher is
            # sure, or the checker confirms the matcher's choice), the reviewed Kinyarwanda answer is the reply.
            # The model writes Kinyarwanda only when no approved answer fits. INTYOZA_RW_REPLIES=model switches it.
            qid = prefer if prefer in self.bot.qa else None
            if qid is None and candidate in self.bot.qa:
                a = self._approved_that_answers(sources, dict(u, question_en=asked), age_group, lang, candidate)
                rescue = a or False
                qid = candidate if a else None
            if qid:
                out.update(status="answered", reply=approved_reply(self.bot, qid, age_group, lang, message),
                           sources=[f"Intyoza approved answer {qid}"], approved_ids=[qid])
                self.stats["answered_approved_rw"] += 1
                return out
        talk = os.environ.get("INTYOZA_WRITER", "conversation") != "trained"
        feedback = None
        tries = self.MAX_TRIES
        attempt = 0
        while attempt < tries:
            raw = (self._talk(message, u, sources, age_group, lang, depth, history, feedback, profile) if talk
                   else self._write(question, u, sources, age_group, lang, feedback))
            if "NOT_COVERED" in raw.upper():
                out["checks"].append({"attempt": attempt + 1, "result": "the model said the sources do not cover it"})
                problems = ["NOT_COVERED"]
            else:
                reply, used = self._split_sources(raw, sources)
                reply = drop_cant_do(tidy_reply(reply, lang), lang)
                problems = self.rule_checks(reply, sources, message, lang)
                if talk:
                    problems += talk_problems(reply, sources, depth)
                used_ids = [sources[i]["id"] for i in used if sources[i].get("kind") == "approved"]
                if not problems and candidate and candidate not in used_ids:
                    # Answered from another approved answer than the matcher's, or from documents only. When the
                    # checker confirms the matcher's answers this question, the reply must come from it (test
                    # 2026-11-11: "why do i get hard all the time" was answered from the pain-during-sex answer,
                    # "kondomu ntizirinda SIDA" with pregnancy rates from a document, and the checker passed both).
                    if rescue is None:
                        rescue = self._approved_that_answers(sources, dict(u, question_en=asked), age_group, lang,
                                                             candidate) or False
                    if rescue:
                        n = next(i for i, x in enumerate(sources) if x is rescue) + 1
                        problems.append(f"answers from another approved answer; S{n} is the approved answer to this "
                                        f"question: answer from S{n}")
                verdict = {}
                if not problems and self.review:
                    problems, verdict = self.model_check(reply, sources, asked, age_group, lang)
                    problems = _drop_number_only(problems, verdict, reply, sources)
                    # (the "answers the question" check stays: without it, replies about a nearby topic got through,
                    # e.g. "methods zo kuboneza urubyaro" answered about the HPV vaccine, test 2026-11-09)
                out["checks"].append({"attempt": attempt + 1, "problems": problems, "review": verdict})
                if not problems:
                    used_src = [sources[i] for i in used] or sources[:1]
                    out.update(status="answered", reply=reply, sources=[s["label"] for s in used_src],
                               approved_ids=[s["id"] for s in used_src if s["id"]])
                    self.stats["answered" if attempt == 0 else "answered_after_rewrite"] += 1
                    return out
                if (talk and attempt == tries - 1 and all(p.startswith(SOFT) for p in problems)
                        and (not self.review or not self.model_check(reply, sources, asked, age_group, lang)[0])):
                    # Only the conversation style is off (length, no question at the end): the facts passed every
                    # check, so it is used rather than refusing (test 2026-11-09: "describe reproductive system" was
                    # refused because the long answer came out short). A missing question gets the offer line.
                    if any(p.startswith("ends without") for p in problems):
                        reply += "\n\n" + OFFER_LINE.get(lang, OFFER_LINE["en"])
                    used_src = [sources[i] for i in used] or sources[:1]
                    out.update(status="answered", reply=reply, sources=[s["label"] for s in used_src],
                               approved_ids=[s["id"] for s in used_src if s["id"]])
                    self.stats["answered_style_off"] += 1
                    return out
            attempt += 1
            if problems == ["NOT_COVERED"] or attempt == tries:
                # Refused, or the tries are used up. When the matcher's approved answer (not just any approved
                # source: test 2026-11-10, "he says real girlfriends do it" got the porn answer that way) is
                # confirmed by the checker to answer THIS question, one more try from it alone.
                if rescue is None:
                    rescue = self._approved_that_answers(sources, dict(u, question_en=asked), age_group, lang,
                                                         candidate) or False
                    if rescue:
                        sources = [rescue] + [x for x in sources if x is not rescue and x.get("kind") != "approved"]
                        feedback = ("- S1 is an APPROVED answer to this question, checked by Intyoza's health team. "
                                    "Answer from it, in your own words, as short as they asked.")
                        tries = attempt + 1
                        continue
                break
            feedback = "\n".join(f"- {p}" for p in problems)
        if rescue:
            # the checker confirmed this approved answer answers the question, but no reply was written from it:
            # the reviewed answer itself, rather than "I don't know"
            text = rescue["text"].split("Answer:", 1)[-1].strip()
            text = re.sub(r"^(EN|RW):\s*", "", text.split(" | ")[0]).strip()
            text = drop_yes(re.sub(r"\s*Where to go:.*$", "", text, flags=re.S).strip(), message)
            out.update(status="answered", reply=text + "\n\n" + OFFER_LINE.get(lang, OFFER_LINE["en"]),
                       sources=[rescue["label"]], approved_ids=[rescue["id"]])
            self.stats["answered_approved_after_refusal"] += 1
            return out
        out.update(status="not_covered", reply=TEXT["not_covered"][lang])
        self.stats["not_covered"] += 1
        self._log(message, u, out)
        return out

    def _approved_that_answers(self, sources, u, age_group, lang, candidate=None):
        """The matcher's approved answer (candidate) when the checker says it answers THIS question, or None (one
        model call). Only the matcher's own choice is tried: the first approved source can be a different topic."""
        if not candidate or not self.review:
            return None
        a = next((x for x in sources if x.get("kind") == "approved" and x.get("id") == candidate), None)
        if a is None:
            return None
        answer = re.sub(r"\s*Where to go:.*$", "", a["text"].split("Answer:", 1)[-1], flags=re.S).strip()
        problems, _ = self.model_check(answer, [a], u["question_en"], age_group, lang)
        return a if not problems else None

    def _log(self, message, u, out):
        import csv
        path = self.log_path or getattr(self.bot, "log_path", None)
        if not path:
            return
        # no personal details and no exact time: the same cleaning as the review sheet (review_queue.py)
        try:
            from review_queue import clean, is_crisis
            crisis = is_crisis(message)
            text = "[crisis message, not saved]" if crisis else clean(message)
            question_en = "" if crisis else clean(u.get("question_en", ""))
        except Exception:
            text, question_en = "[not saved]", ""
        row = {"date": time.strftime("%Y-%m-%d"), "text": text, "question_en": question_en,
               "reason": "" if text.startswith("[") and text.endswith("saved]") else
               json.dumps(out["checks"], ensure_ascii=False)[:500]}
        try:
            new = not os.path.exists(path)
            with open(path, "a", newline="", encoding="utf-8") as f:
                w = csv.DictWriter(f, fieldnames=list(row))
                if new:
                    w.writeheader()
                w.writerow(row)
        except OSError:
            pass


# ===================================================================== open-question test
# Questions that are NOT in the approved list (checked against it), with the facts a good answer contains.
# "honest" = a NOT_COVERED reply is also acceptable, because the sources may not cover it.
OPEN_TESTS = [
    ("Ese umuhungu nawe yajya mu mihango?", "No. Boys do not have periods: periods come from the uterus, which boys do not have. Boys have other puberty changes (e.g. wet dreams, voice changes).", False),
    ("Ese umukobwa ashobora gutwita atarajya mu mihango bwa mbere?", "Yes, it is possible: an egg can be released before the first period, so sex can cause pregnancy.", True),
    ("Ese ni byiza kwinjiza isabune mu gitsina kugira ngo nisukure?", "No. The vagina cleans itself; wash only the outside with clean water; soap or products inside can cause irritation or infection.", True),
    ("Is it normal for one breast to be bigger than the other?", "Yes, it is common and normal, especially during puberty; see a health worker for a lump or pain.", True),
    ("Ese umukobwa wakingiwe HPV ashobora gutwita?", "Yes. The HPV vaccine protects against the virus that causes cervical cancer; it does not prevent pregnancy.", True),
    ("Ese PrEP irinda no gutwita?", "No. PrEP only prevents HIV; it does not prevent pregnancy or other STIs. Use condoms or a contraceptive method too.", False),
    ("Nakoze imibonano idakingiye hashize iminsi itanu, ese nafata PEP?", "PEP must be started as soon as possible and within 72 hours; after 5 days it is too late for PEP, go to a health centre for testing and advice.", False),
    ("How long can sperm live inside a woman's body?", "Up to about 5 days.", True),
    ("Ese umuntu ashobora kwandura virusi itera SIDA ku nshuro ya mbere akoze imibonano?", "Yes. HIV can be passed the first time if the partner has HIV and no condom is used.", False),
    ("Can a girl get pregnant if they have sex standing up?", "Yes. Pregnancy can happen in any position if sperm enters the vagina.", True),
    ("Can you get pregnant from a toilet seat or a swimming pool?", "No. Pregnancy only happens when sperm enters the vagina.", True),
    ("Kuki ijwi ry'abahungu rihinduka mu bugimbi?", "During puberty boys' voices get deeper because of growth/hormonal changes; it is normal.", True),
    ("Ese umugabo ufite virusi itera SIDA ashobora kubyara umwana udafite virusi?", "Yes, with HIV treatment that keeps the virus suppressed, the partner and baby can be protected; talk to a health worker.", True),
    ("Ese ingano y'igitsina cy'umuhungu ifite icyo ivuze ku bushobozi bwe?", "No. Penis size differs between people and does not decide fertility or ability; it is normal.", True),
    ("Kuki amabere y'umuhungu ashobora kubyimba mu bugimbi?", "It is common and usually temporary during puberty because of hormone changes; see a health worker if it is painful or does not go away.", True),
    ("Ese umugore utwite ashobora kujya mu mihango?", "No real periods during pregnancy; bleeding while pregnant needs a health worker to check.", True),
    ("Ese umuntu yakwandura imitezi inshuro ebyiri?", "Yes. Being treated does not protect you from getting gonorrhoea again; use condoms and get partners treated.", True),
    ("Is it safe to have sex during your period?", "Pregnancy and STIs are still possible during a period; use condoms.", True),
    ("Ese kwambara ikariso ifunze cyane byangiza intanga z'umuhungu?", "Probably not covered by the sources: an honest 'not covered' is the right reply; if answered, it must not invent facts.", True),
    ("Ese ni ibisanzwe ko imihango imara iminsi 9?", "Periods usually last about 2 to 7 days; periods longer than that should be checked by a health worker.", True),
    ("Ndi umuhungu w'imyaka 16, ese nakwipimisha virusi itera SIDA ntabwiye ababyeyi?", "Yes. In Rwanda, people aged 15 and above can consent to HIV testing and SRH services themselves (Law N° 026/2025); results are confidential.", False),
    ("Ese kunywa amazi menshi nyuma y'imibonano birinda gutwita?", "No. Drinking water does not prevent pregnancy; use contraception or the emergency pill.", True),
    ("Who won the football match yesterday?", "OFF_TOPIC: politely say Intyoza only helps with SRH and wellbeing.", False),
    ("Mbwira uko bateka ibishyimbo", "OFF_TOPIC: politely say Intyoza only helps with SRH and wellbeing.", False),
]

def evaluate_open(engine, tests=None, age_group="15-19"):
    """Runs every open question. Returns (summary, table) for HUMAN review: no outside AI grades Intyoza.
    'closeness to key facts' = meaning similarity (the matcher) between the answer and the key facts, a rough guide
    only. Fill in the 'human: correct?' column with a health worker; that is the real result."""
    import pandas as pd
    rows = []
    for q, facts, honest_ok in tests or OPEN_TESTS:
        lang = engine.bot.detect_lang(normalize(q), "rw")
        r = engine.answer(q, history=[], age_group=age_group, lang=lang)
        off = facts.startswith("OFF_TOPIC")
        if off:
            close = 1.0 if r["status"] == "off_topic" else 0.0
        elif r["status"] == "answered":
            v = np.asarray(engine.bot.enc.encode([normalize(r["reply"]), normalize(facts)], normalize_embeddings=True))
            close = float(v[0] @ v[1])
        else:
            close = None
        rows.append({"question": q, "status": r["status"], "answer": r["reply"], "sources": "; ".join(r["sources"]),
                     "key facts": facts, "closeness to key facts": None if close is None else round(close, 3),
                     "'not covered' acceptable": honest_ok, "human: correct? (yes/no)": ""})
    t = pd.DataFrame(rows)
    answered = t[t["status"] == "answered"]
    summary = {"questions": len(t),
               "answered": round((t["status"] == "answered").mean(), 3),
               "honest 'not covered'": round((t["status"] == "not_covered").mean(), 3),
               "'not covered' where an answer was expected": int(((t["status"] == "not_covered") & ~t["'not covered' acceptable"]).sum()),
               "off-topic handled": int(((t["status"] == "off_topic") & t["key facts"].str.startswith("OFF_TOPIC")).sum()),
               "mean closeness of answers to key facts": round(float(answered["closeness to key facts"].mean()), 3) if len(answered) else None}
    return summary, t
