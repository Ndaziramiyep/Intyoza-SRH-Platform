"""Intyoza document engine: learn from SRH documents (PDF, TXT, MD) and answer questions that are
not in the approved Q&A.

Steps, all offline after the one-time download:
  1. build_documents.py reads every file in documents/ and splits it into short passages.
  2. The trained matcher (LaBSE) finds the passages closest to the young person's question,
     in any language.
  3. A small language model (Qwen2.5 1.5B Instruct) writes a short answer in English using ONLY
     those passages, or says it has no answer.
  4. NLLB translates the answer into Kinyarwanda.
Approved Q&A answers and the safety checks always come first; this engine is only a fallback.
"""
import json
import os
import re

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
DOC_DIR = os.path.join(HERE, "documents")
INDEX_DIR = os.path.join(HERE, "models", "doc_index")
LLM_DIR = os.path.join(HERE, "base_model", "qwen")
LLM_FILE = "qwen2.5-1.5b-instruct-q4_k_m.gguf"
LLM_REPO = "Qwen/Qwen2.5-1.5B-Instruct-GGUF"
NLLB_DIR = os.path.join(HERE, "base_model", "nllb")
NLLB_REPO = "facebook/nllb-200-distilled-600M"
LLM_HF_REPO = "Qwen/Qwen2.5-1.5B-Instruct"     # used online (Colab GPU) instead of the GGUF file

SYSTEM = ("You are Intyoza, a sexual and reproductive health educator for young people in Rwanda. "
          "Answer the QUESTION using ONLY the facts in CONTEXT. If CONTEXT does not answer the question, "
          "reply with exactly: NO_ANSWER. Write 2 to 4 short, simple sentences for a teenager. "
          "Be kind and non-judgemental. Do not give medicine doses. Do not add facts that are not in CONTEXT.")


# ---------------- 1. reading documents ----------------
def _clean(text):
    text = re.sub(r"-\n(\w)", r"\1", text)          # join words split at line ends
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{2,}", "\n\n", text)
    return text.strip()


def read_raw(path):
    """Text of every page as extracted, before cleaning: list of (page_number, text)."""
    ext = os.path.splitext(path)[1].lower()
    if ext == ".pdf":
        from pypdf import PdfReader
        reader = PdfReader(path)
        return [(i + 1, p.extract_text() or "") for i, p in enumerate(reader.pages)]
    with open(path, encoding="utf-8", errors="ignore") as f:
        return [(1, f.read())]


def read_document(path, raw=None):
    """Cleaned text: list of (page_number, text). PDFs go through preprocess.clean_pages
    (headers, footers, page numbers, contents lines, reference pages, tables of numbers)."""
    raw = raw if raw is not None else read_raw(path)
    if path.lower().endswith(".pdf"):
        from preprocess import clean_pages
        return clean_pages(raw)
    return [(p, _clean(t)) for p, t in raw if t.strip()]


def chunk_pages(pages, words=140, overlap=30):
    """Split pages into overlapping passages of about `words` words.
    The overlap keeps a sentence that crosses a passage boundary readable in at least one passage."""
    out = []
    for page, text in pages:
        tokens = text.split()
        if len(tokens) < 25:
            continue
        step = max(1, words - overlap)
        for start in range(0, len(tokens), step):
            piece = tokens[start:start + words]
            if len(piece) < 25:
                break
            out.append({"page": page, "text": " ".join(piece)})
    return out


PASSAGE_TOKENS = 256      # the matcher reads up to this many tokens of each passage (about 140 words fit)
CHUNK_WORDS, CHUNK_OVERLAP = 140, 30


def list_documents(doc_dir=DOC_DIR):
    """The PDF, TXT and MD files to learn from (instruction files like SOURCES.txt are left out)."""
    return [f for f in sorted(os.listdir(doc_dir)) if f.lower().endswith((".pdf", ".txt", ".md"))
            and not f.upper().startswith(("PUT_PDFS_HERE", "README", "SOURCES"))]


def title_of(filename):
    return os.path.splitext(filename)[0].replace("_", " ")


def prepare_corpus(doc_dir=DOC_DIR, words=CHUNK_WORDS, overlap=CHUNK_OVERLAP, verbose=True):
    """Read, clean, chunk and de-duplicate every document.
    Returns (passages, report) where report is a DataFrame with one row per document:
    pages in the file, pages with extractable text, pages kept after cleaning, words kept, passages."""
    import pandas as pd
    from preprocess import dedupe_passages
    files = list_documents(doc_dir)
    if not files:
        raise SystemExit(f"No documents found. Put PDF files in {doc_dir}")
    passages, rows = [], []
    for f in files:
        path = os.path.join(doc_dir, f)
        try:
            raw = read_raw(path)
            pages = read_document(path, raw)
        except Exception as e:
            print(f"  skipped {f}: {e}")
            rows.append({"document": f, "status": f"error: {e}"})
            continue
        chunks = chunk_pages(pages, words, overlap)
        for c in chunks:
            c["source"] = title_of(f)
        passages += chunks
        with_text = sum(len(t.strip()) > 50 for _, t in raw)
        status = "ok" if chunks else ("scanned (no text): type it into a .txt file" if with_text == 0 else "no usable text")
        rows.append({"document": f, "size_MB": round(os.path.getsize(path) / 1e6, 1), "pages": len(raw),
                     "pages_with_text": with_text, "pages_kept": len(pages),
                     "words_kept": sum(len(t.split()) for _, t in pages), "passages": len(chunks), "status": status})
        if verbose:
            print(f"  {f}: {len(pages)}/{len(raw)} pages kept, {len(chunks)} passages")
    before = len(passages)
    passages = dedupe_passages(passages)
    if verbose and before != len(passages):
        print(f"  removed {before - len(passages)} duplicate passages")
    report = pd.DataFrame(rows)
    return passages, report


def encode_passages(encoder, passages, batch_size=32):
    """Embed passages with the matcher. The matcher was trained on short questions (128 tokens);
    passages are longer, so it reads up to PASSAGE_TOKENS tokens here and the setting is put back after."""
    old_len = getattr(encoder, "max_seq_length", None)
    if old_len is not None:
        encoder.max_seq_length = max(old_len, PASSAGE_TOKENS)
    try:
        from intyoza_core import prompt_kwargs
        vecs = encoder.encode([p["text"] for p in passages], normalize_embeddings=True,
                              batch_size=batch_size, show_progress_bar=True, **prompt_kwargs(encoder, "passage"))
    finally:
        if old_len is not None:
            encoder.max_seq_length = old_len
    return np.asarray(vecs, dtype=np.float32)


def save_index(vecs, passages, index_dir=INDEX_DIR, report=None):
    os.makedirs(index_dir, exist_ok=True)
    np.save(os.path.join(index_dir, "vectors.npy"), vecs)
    with open(os.path.join(index_dir, "passages.json"), "w", encoding="utf-8") as f:
        json.dump(passages, f, ensure_ascii=False)
    if report is not None:
        report.to_csv(os.path.join(index_dir, "corpus_report.csv"), index=False)


def build_index(encoder, doc_dir=DOC_DIR, index_dir=INDEX_DIR):
    """All steps in one call (used by build_documents.py): read, clean, chunk, embed, save."""
    passages, report = prepare_corpus(doc_dir)
    if not passages:
        raise SystemExit("No readable text found (scanned PDFs need their text typed into a .txt file).")
    save_index(encode_passages(encoder, passages), passages, index_dir, report)
    print(f"Indexed {len(passages)} passages from {int((report['passages'] > 0).sum())} documents.")
    return len(passages)


def save_settings(index_dir=INDEX_DIR, **values):
    """Store calibrated settings (e.g. min_score) next to the index, so chat uses them."""
    path = os.path.join(index_dir, "settings.json")
    cur = load_settings(index_dir)
    cur.update(values)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(cur, f, indent=2)


def load_settings(index_dir=INDEX_DIR):
    path = os.path.join(index_dir, "settings.json")
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    return {}


# ---------------- retrieval evaluation ----------------
# Questions a young person might ask, with the document(s) that should answer them.
# A hit means one of the expected documents appears in the top k passages.
RETRIEVAL_TESTS = [
    {"query": "How long does a copper IUD last?", "lang": "en", "expect": ["Family Planning"]},
    {"query": "IUD imara igihe kingana iki?", "lang": "rw", "expect": ["Family Planning"]},
    {"query": "What are the side effects of the contraceptive implant?", "lang": "en", "expect": ["Family Planning", "Contraception"]},
    {"query": "Agapira ko mu kuboko kagira izihe ngaruka?", "lang": "rw", "expect": ["Family Planning", "Contraception"]},
    {"query": "How often do you get the contraceptive injection?", "lang": "en", "expect": ["Family Planning", "Contraception"]},
    {"query": "Urushinge rwo kuboneza urubyaro ruterwa kangahe?", "lang": "rw", "expect": ["Family Planning", "Contraception"]},
    {"query": "Do emergency contraceptive pills cause an abortion?", "lang": "en", "expect": ["Family Planning", "Contraception", "SRHR"]},
    {"query": "How do you use a female condom?", "lang": "en", "expect": ["Family Planning", "CSE"]},
    {"query": "Can breastfeeding prevent pregnancy?", "lang": "en", "expect": ["Family Planning"]},
    {"query": "Who can take PrEP to prevent HIV?", "lang": "en", "expect": ["HIV", "Family Planning"]},
    {"query": "Ni bande bashobora gufata PrEP?", "lang": "rw", "expect": ["HIV", "Family Planning"]},
    {"query": "When should a person with HIV start treatment?", "lang": "en", "expect": ["HIV"]},
    {"query": "What is viral load and how often is it tested?", "lang": "en", "expect": ["HIV"]},
    {"query": "How is HIV passed from a mother to her baby?", "lang": "en", "expect": ["HIV", "Family Planning", "CSE"]},
    {"query": "Virusi itera SIDA yandura ite ku mwana?", "lang": "rw", "expect": ["HIV", "Family Planning", "CSE"]},
    {"query": "What should someone do after being raped to prevent HIV?", "lang": "en", "expect": ["HIV", "SRHR", "Family Planning"]},
    {"query": "How can I say no to peer pressure?", "lang": "en", "expect": ["CSE", "Sexuality Education"]},
    {"query": "Nakwanga nte igitutu cy'urungano?", "lang": "rw", "expect": ["CSE", "Sexuality Education"]},
    {"query": "What are gender roles and stereotypes?", "lang": "en", "expect": ["CSE", "Sexuality Education"]},
    {"query": "What changes happen to boys and girls during puberty?", "lang": "en", "expect": ["CSE", "Sexuality Education", "Menstrual"]},
    {"query": "What topics should sexuality education cover for 9 to 12 year olds?", "lang": "en", "expect": ["Sexuality Education", "CSE"]},
    {"query": "How can child marriage be prevented?", "lang": "en", "expect": ["SRHR", "Sexuality Education", "CSE"]},
    {"query": "What contraception is recommended for adolescents?", "lang": "en", "expect": ["Contraception", "Family Planning", "SRHR"]},
    {"query": "How often should I change my sanitary pad?", "lang": "en", "expect": ["Menstrual"]},
    {"query": "Ni kangahe nkwiye guhindura cotex?", "lang": "rw", "expect": ["Menstrual"]},
    {"query": "Is it safe to bathe during my period?", "lang": "en", "expect": ["Menstrual", "CSE"]},
    {"query": "How many days does a period last?", "lang": "en", "expect": ["Menstrual", "CSE"]},
    {"query": "Imihango imara iminsi ingahe?", "lang": "rw", "expect": ["Menstrual", "CSE"]},
]
# Messages the documents should NOT answer (used to check the minimum score).
OUT_OF_SCOPE = ["Who won the football match yesterday?", "How do I cook rice?", "Which smartphone should I buy?",
                "Ni iyihe kipe yatsinze umukino w'ejo?", "Bateka bate ibishyimbo?", "Igiciro cya lisansi ni angahe?",
                "Write me a poem about the sea", "What is the capital of Japan?"]


def evaluate_retrieval(engine, tests=None, k=3):
    """Hit@1 / hit@k per test question. Returns (table, summary)."""
    import pandas as pd
    tests = tests or RETRIEVAL_TESTS
    rows = []
    for t in tests:
        hits = engine.search(t["query"], k=k)
        srcs = [p["source"] for p, _ in hits]
        ok = [any(e.lower() in s.lower() for e in t["expect"]) for s in srcs]
        rows.append({"query": t["query"], "lang": t["lang"], "top_source": srcs[0], "page": hits[0][0]["page"],
                     "score": round(hits[0][1], 3), "hit@1": ok[0], f"hit@{k}": any(ok)})
    df = pd.DataFrame(rows)
    summary = df.groupby("lang")[["hit@1", f"hit@{k}"]].mean().round(3)
    summary.loc["all"] = df[["hit@1", f"hit@{k}"]].mean().round(3)
    return df, summary


def suggest_min_score(engine, tests=None, out_of_scope=None, min_kept=0.7):
    """Compare top scores for real SRH questions and for off-topic messages, and suggest MIN_SCORE.

    The suggestion is the threshold with the best balance: the share of SRH questions kept minus the
    share of off-topic messages let through (ties go to the higher, safer value). Off-topic messages
    that pass this first filter are still stopped by the language model, which must reply NO_ANSWER
    when the passages do not answer the question.
    Returns (score table, suggested value, share of SRH questions kept, share of off-topic let through)."""
    import pandas as pd
    tests = tests or RETRIEVAL_TESTS
    out_of_scope = out_of_scope or OUT_OF_SCOPE
    ins = np.array([engine.search(t["query"], k=1)[0][1] for t in tests])
    outs = np.array([engine.search(q, k=1)[0][1] for q in out_of_scope])
    best = None
    for t in sorted(set(np.round(np.concatenate([ins, outs]), 3))):
        kept, admitted = float((ins >= t).mean()), float((outs >= t).mean())
        key = (kept - admitted, t)
        if best is None or key > best[0]:
            best = (key, t, kept, admitted)
    _, suggested, kept, admitted = best
    table = pd.DataFrame({"messages": ["SRH questions", "off-topic"], "n": [len(ins), len(outs)],
                          "min score": [round(float(ins.min()), 3), round(float(outs.min()), 3)],
                          "median score": [round(float(np.median(ins)), 3), round(float(np.median(outs)), 3)],
                          "max score": [round(float(ins.max()), 3), round(float(outs.max()), 3)]})
    if kept < min_kept:
        print(f"Warning: at this value only {kept:.0%} of SRH questions reach the documents. "
              "The matcher does not separate SRH from off-topic text well; retrain it or add phrasings.")
    return table, float(suggested), kept, admitted


class DocEngine:
    # Minimum similarity between the question and a passage. Raise it if document answers are off-topic,
    # lower it if good passages are ignored (chat.py --debug prints the score).
    MIN_SCORE = 0.40

    def __init__(self, encoder, index_dir=INDEX_DIR, min_score=None, use_llm=True, use_translator=True, online=False):
        self.enc, self.online = encoder, online
        if min_score is None:     # calibrated value, if it was saved with the index
            min_score = load_settings(index_dir).get("min_score", self.MIN_SCORE)
        self.min_score = min_score
        self.vecs = np.load(os.path.join(index_dir, "vectors.npy"))
        get_dim = getattr(encoder, "get_embedding_dimension", None) or getattr(encoder, "get_sentence_embedding_dimension", None)
        dim = get_dim() if get_dim else len(encoder.encode(["x"], normalize_embeddings=True)[0])
        if dim and self.vecs.shape[1] != dim:
            raise ValueError("The document index was built with a different model. Rebuild it: 4_Train_Answer_Model_Colab.ipynb step 3 "
                             "step 6, or python build_documents.py")
        with open(os.path.join(index_dir, "passages.json"), encoding="utf-8") as f:
            self.passages = json.load(f)
        self.llm = self._load_llm() if use_llm else None
        self.tr = self._load_translator() if use_translator else None

    @staticmethod
    def available(index_dir=INDEX_DIR):
        return os.path.exists(os.path.join(index_dir, "vectors.npy"))

    def _load_llm(self):
        path = os.path.join(LLM_DIR, LLM_FILE)
        if os.path.exists(path) and not self.online:
            try:
                from llama_cpp import Llama
                return ("gguf", Llama(model_path=path, n_ctx=2048, n_threads=max(1, (os.cpu_count() or 2) - 1), verbose=False))
            except Exception as e:
                print("  (language model not loaded, showing document passages instead):", e)
                return None
        if self.online:     # Colab: load from Hugging Face with transformers, on the GPU if there is one
            try:
                import torch
                from transformers import AutoModelForCausalLM, AutoTokenizer
                dev = "cuda" if torch.cuda.is_available() else "cpu"
                tok = AutoTokenizer.from_pretrained(LLM_HF_REPO)
                model = AutoModelForCausalLM.from_pretrained(
                    LLM_HF_REPO, torch_dtype=torch.float16 if dev == "cuda" else torch.float32).to(dev)
                return ("hf", (tok, model, dev))
            except Exception as e:
                print("  (language model not loaded):", e)
                return None
        print("  (no language model found: run python download_doc_models.py)")
        return None

    def _load_translator(self):
        src = NLLB_DIR if os.path.exists(os.path.join(NLLB_DIR, "config.json")) else (NLLB_REPO if self.online else None)
        if src is None:
            print("  (no translator found: run python download_doc_models.py)")
            return None
        try:
            import torch
            from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
            dev = "cuda" if (self.online and torch.cuda.is_available()) else "cpu"
            tok = AutoTokenizer.from_pretrained(src, src_lang="eng_Latn")
            model = AutoModelForSeq2SeqLM.from_pretrained(src).to(dev)
            return tok, model
        except Exception as e:
            print("  (translator not loaded, document answers will be in English):", e)
            return None

    def search(self, text, k=3, also=None):
        """Passages closest to the question. `also` = the same question in English (from the translator):
        each passage keeps its best score over both, which helps Kinyarwanda questions find English text."""
        queries = [text] + ([also] if also and also.strip().lower() != text.strip().lower() else [])
        from intyoza_core import prompt_kwargs
        q = np.asarray(self.enc.encode(queries, normalize_embeddings=True, **prompt_kwargs(self.enc, "doc_query")))
        s = (self.vecs @ q.T).max(axis=1)
        top = np.argsort(-s)[:k]
        return [(self.passages[i], float(s[i])) for i in top]

    def translate(self, text, src="eng_Latn", tgt="kin_Latn"):
        if not self.tr or not text:
            return None
        tok, model = self.tr
        tok.src_lang = src
        sentences = [s for s in re.split(r"(?<=[.!?])\s+", text.strip()) if s]
        out = []
        for s in sentences:
            enc = tok(s, return_tensors="pt", truncation=True, max_length=200).to(model.device)
            gen = model.generate(**enc, forced_bos_token_id=tok.convert_tokens_to_ids(tgt), max_new_tokens=200)
            out.append(tok.batch_decode(gen, skip_special_tokens=True)[0])
        return " ".join(out)

    def generate(self, question_en, passages):
        context = "\n\n".join(f"[{p['source']}, page {p['page']}]\n{p['text']}" for p, _ in passages)
        msgs = [{"role": "system", "content": SYSTEM},
                {"role": "user", "content": f"CONTEXT:\n{context}\n\nQUESTION: {question_en}"}]
        kind, engine = self.llm
        if kind == "gguf":
            out = engine.create_chat_completion(messages=msgs, max_tokens=180, temperature=0.2)
            return out["choices"][0]["message"]["content"].strip()
        tok, model, dev = engine
        prompt = tok.apply_chat_template(msgs, tokenize=False, add_generation_prompt=True)
        ids = tok(prompt, return_tensors="pt").to(dev)
        gen = model.generate(**ids, max_new_tokens=180, do_sample=False)
        return tok.decode(gen[0][ids["input_ids"].shape[1]:], skip_special_tokens=True).strip()

    def answer(self, text, lang="rw"):
        """Return dict(text_en, text_rw, sources) or None when the documents don't cover it."""
        question_en = text
        if lang == "rw" and self.tr:
            question_en = self.translate(text, src="kin_Latn", tgt="eng_Latn") or text
        hits = self.search(text, k=3, also=question_en)
        if not hits or hits[0][1] < self.min_score:
            return None
        good = [h for h in hits if h[1] >= self.min_score - 0.05]
        sources = sorted({f"{p['source']}, p. {p['page']}" for p, _ in good})
        if self.llm is None:    # no language model: show the best passage itself (shortened)
            ans_en = " ".join(good[0][0]["text"].split()[:70]) + " ..."
        else:
            ans_en = self.generate(question_en, good)
            if "NO_ANSWER" in ans_en.upper() or len(ans_en) < 15:
                return None
            if re.search(r"\b\d+\s?(mg|ml|tablets?)\b", ans_en, re.I):     # never give doses
                return None
        ans_rw = self.translate(ans_en) if lang == "rw" else None
        return {"text_en": ans_en, "text_rw": ans_rw, "sources": sources, "score": hits[0][1]}
