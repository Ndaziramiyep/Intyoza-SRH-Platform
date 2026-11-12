"""Exports all of Intyoza's data to CSV files (UTF-8, open in Excel or Google Sheets).

    python export_csv.py                      (on the laptop: everything except the answer-model examples)
    export_csv.export_all(out_dir, bot, docs, kb)   (in a notebook after Intyoza is loaded: everything)

Files:
  intyoza_questions_answers.csv   approved questions and answers (EN, RW, age-group answers, referral, sources)
  intyoza_phrasings.csv           ways young people ask (text, language, question, risk, intent, train/test)
  intyoza_fixed_texts.csv         help messages, fixed replies, topic names, referral places (EN, RW)
  intyoza_learning_paths.csv      order of questions per topic, suggested follow-ups
  intyoza_documents.csv           trusted documents (publisher, year, licence note, link, passages)
  intyoza_document_passages.csv   every passage of the documents (source, page, text)
  intyoza_demo_qa.csv             DEMO data: public Q&A (HASH STI, Uganda), when downloaded
  intyoza_answer_model_examples.csv   training examples of the answer model (task, prompt, target); needs bot
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))


def _save(df, out_dir, name):
    path = os.path.join(out_dir, name)
    df.to_csv(path, index=False, encoding="utf-8-sig")
    print(f"  {name}: {len(df)} rows")
    return path


def export_data(out_dir, folder=HERE):
    import pandas as pd
    import intyoza_core as ic
    from intyoza_core import data_paths
    d, qa, ex = ic.load_data(*data_paths(folder))
    rows = []
    for q in qa.values():
        a = q["answers"]
        rows.append({"id": q["id"], "topic": q["topic"], "age_group": q["age"], "risk": q["risk"],
                     "question_en": q["q_en"], "answer_en": a["default"].get("en", ""),
                     "question_rw": q.get("q_rw", ""), "answer_rw": a["default"].get("rw", ""),
                     "referral": q.get("referral", ""), "sources": q.get("sources", ""),
                     "answer_10_14_en": a.get("10-14", {}).get("en", ""), "answer_10_14_rw": a.get("10-14", {}).get("rw", ""),
                     "answer_20_24_en": a.get("20-24", {}).get("en", ""), "answer_20_24_rw": a.get("20-24", {}).get("rw", ""),
                     "equivalent_ids": ";".join(i for i in q.get("equivalent", []) if i != q["id"]), "status": "approved"})
    _save(pd.DataFrame(rows), out_dir, "intyoza_questions_answers.csv")
    qtext = {q["id"]: q["q_en"] for q in qa.values()}
    _save(pd.DataFrame([{"text": e["text"], "language": e["lang"], "qa_id": e["qa_id"] or "",
                         "approved_question_en": qtext.get(e["qa_id"], ""), "risk": e["risk"], "intent": e["intent"],
                         "split": e["split"]} for e in ex]), out_dir, "intyoza_phrasings.csv")
    texts = []

    def add(kind, key, v):
        if isinstance(v, dict) and ("en" in v or "rw" in v):
            texts.append({"type": kind, "key": key, "text_en": v.get("en", ""), "text_rw": v.get("rw", "")})
        elif isinstance(v, dict):
            for k2, v2 in v.items():
                add(kind, f"{key}.{k2}", v2)
        else:
            texts.append({"type": kind, "key": key, "text_en": str(v), "text_rw": ""})
    for k in ("help_now", "help_kinds", "help_followup", "replies"):
        for key, v in d.get(k, {}).items():
            add(k, key, v)
    for en, rw in d.get("topic_names", {}).items():
        texts.append({"type": "topic_name", "key": en, "text_en": en, "text_rw": rw})
    for en, rw in d.get("referral_rw", {}).items():
        texts.append({"type": "referral", "key": en, "text_en": en, "text_rw": rw})
    _save(pd.DataFrame(texts), out_dir, "intyoza_fixed_texts.csv")
    paths = [{"topic": t, "order": i + 1, "qa_id": q} for t, ids in d.get("learning", {}).get("paths", {}).items()
             for i, q in enumerate(ids)]
    paths += [{"topic": f"(suggested after {q})", "order": i + 1, "qa_id": u}
              for q, ups in d.get("followups", {}).items() for i, u in enumerate(ups)]
    _save(pd.DataFrame(paths), out_dir, "intyoza_learning_paths.csv")


def export_documents(out_dir, folder=HERE, passages=None):
    import pandas as pd
    import doc_engine
    doc_dir = os.path.join(folder, "documents")
    if passages is None:
        passages, _ = doc_engine.prepare_corpus(doc_dir, verbose=False)
    df = pd.DataFrame([{"passage_id": n + 1, "source": p.get("source", ""), "page": p.get("page", ""),
                        "words": len(p["text"].split()), "text": p["text"]} for n, p in enumerate(passages)])
    _save(df, out_dir, "intyoza_document_passages.csv")
    src_path = os.path.join(doc_dir, "SOURCES.json")
    if os.path.exists(src_path):
        s = pd.DataFrame(json.load(open(src_path, encoding="utf-8")))
        s["in_folder"] = [os.path.exists(os.path.join(doc_dir, f)) for f in s.file]
        s["passages"] = [int((df.source == doc_engine.title_of(f)).sum()) for f in s.file]
        _save(s, out_dir, "intyoza_documents.csv")


def export_demo(out_dir):
    import pandas as pd
    import demo_data
    items = demo_data.load()
    if not items:
        print("  (no demo data downloaded here)")
        return
    _save(pd.DataFrame([{"id": it["id"], "source": it["source"], "topic": it["topic"], "group": it.get("group", ""),
                         "question_en": it["q_en"], "all_questions_en": " | ".join(it["questions_en"]),
                         "questions_rw": " | ".join(it.get("questions_rw", [])), "answer_en": it["answer_en"],
                         "licence": demo_data.SOURCE_INFO.get(it["source"], {}).get("licence", "")} for it in items]),
          out_dir, "intyoza_demo_qa.csv")


def export_answer_examples(out_dir, bot, docs, kb=None, folder=HERE):
    import pandas as pd
    import intyoza_core as ic
    import writer_training as wt
    ex = ic.load_all(folder, verbose=False)[2]
    rows = []
    for split in ("train", "test"):
        kw = {} if split == "train" else dict(n_write=25, n_not_covered=10, n_check=24, n_understand=15, seed=1)
        for e in wt.build_examples(bot, docs, ex, split, kb=kb, **kw):
            rows.append({"split": split, "task": e["task"], "check_kind": e.get("check_kind", ""),
                         "qa_id": e.get("qa_id") or "", "demo_id": e.get("demo_id", ""), "lang": e["lang"],
                         "message": e["message"], "system_prompt": e["system"], "user_prompt": e["user"],
                         "target": e["target"]})
    _save(pd.DataFrame(rows), out_dir, "intyoza_answer_model_examples.csv")


def export_all(out_dir, bot=None, docs=None, kb=None, folder=HERE):
    os.makedirs(out_dir, exist_ok=True)
    print("Exporting to", out_dir)
    export_data(out_dir, folder)
    export_documents(out_dir, folder, passages=docs.passages if docs is not None else None)
    export_demo(out_dir)
    if bot is not None:
        export_answer_examples(out_dir, bot, docs, kb, folder)


if __name__ == "__main__":
    export_all(os.path.join(HERE, "csv_export"))
