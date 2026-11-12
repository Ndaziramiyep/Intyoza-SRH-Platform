"""Intyoza evaluation: dataset analysis, model metrics, charts and the model card.

Used by 1_Train.ipynb. Every function works on the same structures as intyoza_core:
  qa: {question_id: question record}       ex: list of phrasing records (text, qa_id, risk, intent, lang, split)
"""
import collections
import datetime
import hashlib
import json
import os
import platform

import numpy as np
import pandas as pd

RISK_ORDER = ["None", "Low", "High", "Emergency"]
LANG_NAME = {"rw": "Kinyarwanda", "en": "English"}


def _plt():
    import matplotlib.pyplot as plt
    return plt


# ------------------------------------------------------------------ 1. dataset analysis
def dataset_overview(qa, ex):
    """Tables that describe the dataset. Returns a dict of DataFrames."""
    q = pd.DataFrame([{"id": v["id"], "topic": v["topic"], "risk": v["risk"],
                       "has_rw_question": bool(v.get("q_rw")), "has_rw_answer": bool(v["answers"]["default"].get("rw")),
                       "age_specific_answers": len(v["answers"]) - 1} for v in qa.values()])
    e = pd.DataFrame(ex)
    e["words"] = e["text"].str.split().str.len()
    per_q = e[e["qa_id"].notna() & (e["split"] == "train")].groupby("qa_id").size()
    per_q = per_q.reindex(list(qa), fill_value=0)
    out = {
        "questions_by_topic_and_risk": pd.crosstab(q["topic"], q["risk"], margins=True, margins_name="Total")
                                         .reindex(columns=[c for c in RISK_ORDER + ["Total"] if c in
                                                           set(q["risk"]) | {"Total"}]),
        "phrasings_by_language_and_split": pd.crosstab(e["lang"].map(LANG_NAME).fillna(e["lang"]), e["split"],
                                                       margins=True, margins_name="Total"),
        "phrasings_by_kind": e.assign(kind=np.where(e["qa_id"].notna(), "linked to a question",
                                                    "risk/intent only (" + e["intent"] + ")"))
                              .groupby("kind").size().rename("phrasings").to_frame(),
        "training_phrasings_per_question": per_q.describe().round(1).rename("value").to_frame(),
        "translation_coverage": pd.DataFrame({
            "questions": [len(q)], "with Kinyarwanda question": [int(q["has_rw_question"].sum())],
            "with Kinyarwanda answer": [int(q["has_rw_answer"].sum())],
            "with age-specific answers": [int((q["age_specific_answers"] > 0).sum())]}),
        "thin_questions": per_q[per_q < 5].sort_values().rename("training phrasings").to_frame(),
    }
    return out


def plot_dataset(qa, ex):
    """Four charts: questions per topic, risk levels, phrasings per language/split, message length."""
    plt = _plt()
    q = pd.DataFrame([{"topic": v["topic"], "risk": v["risk"]} for v in qa.values()])
    e = pd.DataFrame(ex)
    e["words"] = e["text"].str.split().str.len()
    fig, ax = plt.subplots(2, 2, figsize=(14, 9))
    q["topic"].value_counts().sort_values().plot.barh(ax=ax[0, 0], color="#4C72B0")
    ax[0, 0].set_title("Approved questions per topic"); ax[0, 0].set_xlabel("questions")
    q["risk"].value_counts().reindex(RISK_ORDER).fillna(0).plot.bar(ax=ax[0, 1], color=["#55A868", "#C4AD66", "#DD8452", "#C44E52"])
    ax[0, 1].set_title("Questions by risk level"); ax[0, 1].set_ylabel("questions"); ax[0, 1].tick_params(axis="x", rotation=0)
    pd.crosstab(e["lang"].map(LANG_NAME).fillna(e["lang"]), e["split"]).plot.bar(ax=ax[1, 0], color=["#8172B3", "#64B5CD"])
    ax[1, 0].set_title("Phrasings by language and split"); ax[1, 0].set_ylabel("phrasings"); ax[1, 0].tick_params(axis="x", rotation=0)
    for lang, g in e.groupby("lang"):
        g["words"].clip(upper=40).plot.hist(ax=ax[1, 1], bins=range(0, 42), alpha=0.6, label=LANG_NAME.get(lang, lang))
    ax[1, 1].set_title("Message length (words, capped at 40)"); ax[1, 1].set_xlabel("words"); ax[1, 1].legend()
    fig.tight_layout()
    plt.show()


def data_fingerprint(qa, ex):
    """Short hash of the data used for training, recorded in the model card."""
    blob = json.dumps([sorted(qa), [(e["text"], e["qa_id"], e["risk"], e["split"]) for e in ex]], ensure_ascii=False)
    return hashlib.sha256(blob.encode("utf-8")).hexdigest()[:16]


# ------------------------------------------------------------------ 2. question matching
def rank_test_set(index, ex, qa, k=10):
    """Rank all approved questions for every held-out phrasing in one batch.
    Returns one row per test phrasing with the expected question, the rank it got and the top score."""
    te = [e for e in ex if e["split"] == "test" and (e["qa_id"] in qa or e["intent"] == "other")]
    X = np.asarray(index.enc.encode([e["text"] for e in te], normalize_embeddings=True, batch_size=64))
    sims = X @ index.vecs.T
    order = np.argsort(-sims, axis=1)[:, :k]
    pos = {qid: i for i, qid in enumerate(index.ids)}
    rows = []
    for n, e in enumerate(te):
        top = [index.ids[j] for j in order[n]]
        expected = e["qa_id"] if e["qa_id"] in qa else None
        hit = [j for j, qid in enumerate(top) if expected and index.correct(expected, qid)]
        rank = hit[0] + 1 if hit else None          # an equivalent question counts as correct
        rows.append({"text": e["text"], "lang": e["lang"], "expected": expected,
                     "topic": qa[expected]["topic"] if expected else "(off-topic)",
                     "got": top[0], "top_score": float(sims[n, order[n, 0]]),
                     "expected_score": float(sims[n, pos[expected]]) if expected else None,
                     "rank": rank, "top3": top[:3]})
    return pd.DataFrame(rows)


def retrieval_metrics(ranked):
    """Top-1, top-3 accuracy and mean reciprocal rank (MRR@10) on in-scope test phrasings."""
    r = ranked[ranked["expected"].notna()]
    if r.empty:
        return {"n": 0, "top1": 0.0, "top3": 0.0, "mrr": 0.0}
    rr = r["rank"].apply(lambda x: 1.0 / x if pd.notna(x) and x else 0.0)   # not in the top 10 counts as 0
    return {"n": int(len(r)), "top1": round(float((r["rank"] == 1).mean()), 4),
            "top3": round(float((r["rank"].fillna(99) <= 3).mean()), 4), "mrr": round(float(rr.mean()), 4)}


def metrics_by(ranked, column):
    """Retrieval metrics per language or per topic."""
    r = ranked[ranked["expected"].notna()]
    rows = []
    for key, g in r.groupby(column):
        m = retrieval_metrics(g)
        rows.append({column: LANG_NAME.get(key, key) if column == "lang" else key, **m})
    return pd.DataFrame(rows).sort_values("top1").reset_index(drop=True)


def compare(results):
    """{'Baseline (LaBSE)': metrics, 'Fine-tuned': metrics} -> table with the improvement."""
    df = pd.DataFrame(results).T[["n", "top1", "top3", "mrr"]]
    if len(df) == 2:
        df.loc["Change"] = df.iloc[1] - df.iloc[0]
        df.loc["Change", "n"] = np.nan
    return df


def plot_scores(ranked, lo, hi):
    """Distribution of the top score for correct matches, wrong matches and off-topic messages,
    with the two cut-offs: below LO the bot does not answer, between LO and HI it asks 'did you mean'."""
    plt = _plt()
    right = ranked[(ranked["expected"].notna()) & (ranked["rank"] == 1)]["top_score"]
    wrong = ranked[(ranked["expected"].notna()) & (ranked["rank"] != 1)]["top_score"]
    off = ranked[ranked["expected"].isna()]["top_score"]
    fig, ax = plt.subplots(figsize=(11, 4.5))
    bins = np.linspace(min(ranked["top_score"].min(), lo) - 0.02, 1, 50)
    for s, label, c in ((wrong, "wrong first match", "#C44E52"), (right, "correct first match", "#55A868"),
                        (off, "off-topic message", "#8172B3")):
        if len(s):
            ax.hist(s, bins=bins, alpha=0.55, label=f"{label} ({len(s)})", color=c)
    ax.axvline(lo, color="black", linestyle="--"); ax.text(lo, ax.get_ylim()[1] * 0.92, f" LO={lo}", fontsize=9)
    ax.axvline(hi, color="black"); ax.text(hi, ax.get_ylim()[1] * 0.82, f" HI={hi}", fontsize=9)
    ax.set_title("Top match score on held-out messages"); ax.set_xlabel("similarity"); ax.set_ylabel("messages")
    ax.legend()
    plt.show()


def decision_outcomes(ranked, lo, hi):
    """What the bot would do with each held-out message under the chosen cut-offs."""
    def outcome(r):
        if r["top_score"] >= hi:
            act = "answers directly"
        elif r["top_score"] >= lo:
            act = "asks 'did you mean'"
        else:
            act = "does not answer (menu / documents)"
        if r["expected"] is None or pd.isna(r["expected"]):
            ok = "off-topic"
        elif act == "answers directly":
            ok = "right answer" if r["rank"] == 1 else "WRONG answer"
        elif act.startswith("asks"):
            ok = "right one offered" if r["rank"] and r["rank"] <= 3 else "right one not offered"
        else:
            ok = "missed"
        return pd.Series({"action": act, "result": ok})
    t = ranked.apply(outcome, axis=1)
    return pd.crosstab(t["action"], t["result"], margins=True, margins_name="Total")


def confused_pairs(ranked, qa, n=15):
    """Most frequent (expected -> got) mistakes."""
    r = ranked[(ranked["expected"].notna()) & (ranked["rank"] != 1)]
    c = collections.Counter(zip(r["expected"], r["got"]))
    return pd.DataFrame([{"expected": a, "got": b, "times": k,
                          "expected question": qa[a]["q_en"][:60], "got question": qa[b]["q_en"][:60]}
                         for (a, b), k in c.most_common(n)])


def mistakes(ranked, qa):
    """Every wrong first match, for the error_report.csv file."""
    r = ranked[(ranked["expected"].notna()) & (ranked["rank"] != 1)].copy()
    r["expected_question"] = r["expected"].map(lambda i: qa[i]["q_rw"] or qa[i]["q_en"])
    r["got_question"] = r["got"].map(lambda i: qa[i]["q_rw"] or qa[i]["q_en"])
    r["language"] = r["lang"].map(LANG_NAME)
    r["right_answer_in_top3"] = r["rank"].fillna(99) <= 3
    return r[["language", "text", "expected", "expected_question", "got", "got_question", "top_score",
              "right_answer_in_top3"]].rename(columns={"text": "message"})


# ------------------------------------------------------------------ 3. classifiers
def classification_table(y_true, y_pred, labels):
    """Precision, recall, F1 and support per class as a DataFrame."""
    from sklearn.metrics import precision_recall_fscore_support
    p, r, f, s = precision_recall_fscore_support(y_true, y_pred, labels=labels, zero_division=0)
    df = pd.DataFrame({"precision": p, "recall": r, "f1": f, "support": s}, index=labels).round(3)
    return df[df["support"] > 0]


def confusion(y_true, y_pred, labels):
    from sklearn.metrics import confusion_matrix
    present = [l for l in labels if l in set(y_true) | set(y_pred)]
    cm = confusion_matrix(y_true, y_pred, labels=present)
    return pd.DataFrame(cm, index=[f"true {l}" for l in present], columns=[f"pred {l}" for l in present])


def plot_confusion(cm, title):
    plt = _plt()
    fig, ax = plt.subplots(figsize=(1.3 * len(cm.columns) + 2.5, 1.0 * len(cm) + 1.8))
    im = ax.imshow(cm.values, cmap="Blues")
    ax.set_xticks(range(len(cm.columns))); ax.set_xticklabels(cm.columns, rotation=30, ha="right")
    ax.set_yticks(range(len(cm.index))); ax.set_yticklabels(cm.index)
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            v = cm.values[i, j]
            ax.text(j, i, str(v), ha="center", va="center", color="white" if v > cm.values.max() / 2 else "black")
    ax.set_title(title)
    fig.colorbar(im, ax=ax, fraction=0.046)
    fig.tight_layout()
    plt.show()


def risk_predictions_single(risk_clf, encoder, ex, threshold=0.5):
    """Risk level from the embedding risk model alone (before the safety layer combines signals)."""
    from intyoza_core import risk_level
    te = [e for e in ex if e["split"] == "test"]
    X = encoder.encode([e["text"] for e in te], normalize_embeddings=True)
    probs = risk_clf.predict_proba(X)
    pred = [risk_level(dict(zip(risk_clf.classes_, p)), threshold) for p in probs]
    return [e["risk"] for e in te], pred


def risk_predictions_safety(safety, index, encoder, ex, qa, lo):
    """Risk level from the full safety layer (both risk models + the matched question)."""
    from intyoza_core import safety_levels
    te, pe_all, pc_all, matches = safety_levels(safety, index, encoder, ex, qa, lo)
    pred = [safety.level(dict(zip(safety.risk_emb.classes_, a)), dict(zip(safety.risk_char.classes_, b)),
                         qa[m[0]]["risk"], m[1], lo) for a, b, m in zip(pe_all, pc_all, matches)]
    return [e["risk"] for e in te], pred, te


def risky_misses(y_true, y_pred, te):
    """Held-out risky messages the safety layer did not flag (each one deserves a new training phrasing)."""
    rows = [{"message": e["text"], "language": LANG_NAME.get(e["lang"], e["lang"]), "true": t, "predicted": p}
            for t, p, e in zip(y_true, y_pred, te) if t in ("High", "Emergency") and p not in ("High", "Emergency")]
    return pd.DataFrame(rows)


def plot_safety(table, max_false_alarm, chosen):
    """Recall on risky messages against the false-alarm rate, for every threshold tried.
    Learning first: the chosen setting stays left of the false-alarm limit."""
    plt = _plt()
    fig, ax = plt.subplots(figsize=(8, 5))
    for inherit, g in table.groupby("use_matched_risk"):
        ax.plot(g["false_alarm_rate"], g["recall"], marker="o",
                label=f"use matched question's risk = {inherit}")
        for _, r in (g.iterrows() if not inherit else []):      # label one line only, the two overlap
            ax.annotate(f"{r['threshold']:.2f}", (r["false_alarm_rate"], r["recall"]), fontsize=7,
                        xytext=(3, 3), textcoords="offset points")
    ax.axvline(max_false_alarm, color="grey", linestyle="--", label=f"false-alarm limit {max_false_alarm:.0%}")
    ax.scatter([chosen[1]], [chosen[0]], s=180, facecolors="none", edgecolors="red", linewidths=2, label="chosen")
    ax.set_xlabel("false alarm rate (normal messages flagged)"); ax.set_ylabel("recall (risky messages caught)")
    ax.set_title("Safety calibration on held-out messages"); ax.legend(fontsize=8); ax.grid(alpha=0.3)
    plt.show()


def learning_first_report(bot, ex, qa):
    """Send every held-out phrasing through the full chatbot (a fresh conversation each time) and check
    the two promises of a learning platform:
      - learning questions (risk None or Low) get their answer, not a crisis message
      - dangerous messages (High or Emergency) get help contacts
    Returns (summary table, learning questions that were sent to help instead, headline metrics)."""
    rows, wrongly_sent_to_help = [], []
    for e in ex:
        if e["split"] != "test" or e["qa_id"] not in qa:
            continue
        bot.reset()
        r = bot.reply(e["text"])
        learning = qa[e["qa_id"]]["risk"] in ("None", "Low")
        got_answer = r["type"] in ("answer", "answer_with_help") and bot.index.correct(e["qa_id"], r.get("qa_id"))
        offered = r["type"] == "did_you_mean" and any(bot.index.correct(e["qa_id"], p) for p in bot.pending)
        got_help = bool(r.get("help"))
        help_only = r["type"] in ("help_now", "crisis_followup")
        rows.append({"group": "learning question" if learning else "dangerous message",
                     "language": LANG_NAME.get(e["lang"], e["lang"]), "answered": got_answer,
                     "answer offered in 'did you mean'": offered, "help contacts shown": got_help,
                     "help instead of an answer": help_only})
        if learning and help_only:
            wrongly_sent_to_help.append({"message": e["text"], "expected question": qa[e["qa_id"]]["q_rw"]})
    bot.reset()
    df = pd.DataFrame(rows)
    summary = df.groupby(["group", "language"]).agg(
        messages=("answered", "size"), answered=("answered", "mean"),
        offered=("answer offered in 'did you mean'", "mean"), help_shown=("help contacts shown", "mean"),
        help_instead_of_answer=("help instead of an answer", "mean")).round(3)
    learn, danger = df[df["group"] == "learning question"], df[df["group"] == "dangerous message"]
    metrics = {
        "learning_answered": round(float(learn["answered"].mean()), 4) if len(learn) else None,
        "learning_answered_or_offered": round(float((learn["answered"] | learn["answer offered in 'did you mean'"]).mean()), 4)
        if len(learn) else None,
        "learning_sent_to_help": round(float(learn["help instead of an answer"].mean()), 4) if len(learn) else None,
        "danger_got_help": round(float(danger["help contacts shown"].mean()), 4) if len(danger) else None,
    }
    return summary, pd.DataFrame(wrongly_sent_to_help), metrics


def plot_training_loss(log_history):
    """Training loss per logging step, from trainer.state.log_history."""
    plt = _plt()
    pts = [(h["step"], h["loss"]) for h in log_history if "loss" in h]
    if not pts:
        print("No loss values were logged.")
        return
    s, l = zip(*pts)
    fig, ax = plt.subplots(figsize=(9, 4))
    ax.plot(s, l, marker=".", color="#4C72B0")
    ax.set_xlabel("training step"); ax.set_ylabel("loss (multiple negatives ranking)")
    ax.set_title("Matcher fine-tuning loss"); ax.grid(alpha=0.3)
    plt.show()


# ------------------------------------------------------------------ 4. model card
def library_versions():
    out = {"python": platform.python_version()}
    for name in ("torch", "transformers", "sentence_transformers", "sklearn", "numpy", "pandas"):
        try:
            out[name] = __import__(name).__version__
        except Exception:
            pass
    return out


def write_model_card(folder, config, data_stats, metrics):
    """Record what was trained, on what data, with which settings and how well it performs.
    Writes model_card.json (for programs) and MODEL_CARD.md (for people) into the models folder."""
    os.makedirs(folder, exist_ok=True)
    card = {"model": "Intyoza SRH question matcher and safety layer",
            "trained_at": datetime.datetime.now().isoformat(timespec="seconds"),
            "config": config, "data": data_stats, "metrics": metrics, "environment": library_versions()}
    with open(os.path.join(folder, "model_card.json"), "w", encoding="utf-8") as f:
        json.dump(card, f, ensure_ascii=False, indent=2, default=str)

    def pct(x):
        return f"{x:.1%}" if isinstance(x, (int, float)) else str(x)
    m, d = metrics, data_stats
    lines = [
        "# Intyoza model card", "",
        f"Trained: {card['trained_at']}  ",
        f"Data fingerprint: `{d.get('fingerprint', '')}`", "",
        "## Purpose",
        "Answers sexual and reproductive health questions from young people in Rwanda (10 to 24 years) with",
        "approved answers in Kinyarwanda, detects messages that need urgent help, and refers to services.",
        "It is an education tool, not a diagnosis tool.", "",
        "## Components",
        f"- Question matcher: {config.get('base_model')} fine-tuned with MultipleNegativesRankingLoss and hard negatives",
        "- Risk models: logistic regression on matcher embeddings + character n-gram model, combined by the safety layer",
        "- Intent model (health / greeting / goodbye / other) and language identification", "",
        "## Data",
        f"- {d.get('questions')} approved questions in {d.get('topics')} topics",
        f"- {d.get('phrasings')} phrasings after preprocessing ({d.get('train')} train / {d.get('test')} held-out test)",
        f"- Kinyarwanda phrasings: {d.get('kinyarwanda')}", "",
        "## Results on held-out phrasings",
        "| Model | Top-1 | Top-3 | MRR |", "|---|---|---|---|"]
    for name in ("baseline", "fine_tuned"):
        if name in m:
            r = m[name]
            lines.append(f"| {name.replace('_', ' ')} | {pct(r['top1'])} | {pct(r['top3'])} | {r['mrr']:.3f} |")
    for lang, r in m.get("by_language", {}).items():
        lines.append(f"| fine-tuned, {lang} | {pct(r['top1'])} | {pct(r['top3'])} | {r['mrr']:.3f} |")
    s = m.get("safety", {})
    lines += ["", "## Safety",
              "Learning first: a clear learning question always gets its answer; help contacts are added",
              "under it when the message also looks risky. The safety layer is tuned to flag few normal messages.",
              f"- Normal messages flagged (false alarm rate): {pct(s.get('false_alarm_rate'))} "
              f"(limit {pct(s.get('max_false_alarm'))})",
              f"- Risky messages caught (recall): {pct(s.get('recall'))}",
              f"- Threshold {s.get('threshold')}, use matched question's risk: {s.get('use_matched_risk')}", "",
              *([f"- Learning questions answered or offered: {pct(m['learning_first']['learning_answered_or_offered'])}",
                 f"- Learning questions sent to help instead of an answer: {pct(m['learning_first']['learning_sent_to_help'])}",
                 f"- Dangerous messages that got help contacts: {pct(m['learning_first']['danger_got_help'])}"]
                if "learning_first" in m else []), "",
              "## Answer cut-offs",
              f"- LO = {m.get('lo')}: below this the bot does not answer from the approved list",
              f"- HI = {m.get('hi')}: from this score the bot answers directly; between LO and HI it asks 'did you mean'", "",
              "## Limitations",
              "- Kinyarwanda phrasings were written by the project team; real user messages will differ, so review",
              "  intyoza_unanswered.csv and error_report.csv regularly and add phrasings.",
              "- Approved answers need clinical review before public launch.",
              "- Document answers (from PDFs) are generated and machine-translated; they are marked as not reviewed.",
              "- Crisis detection is a safety net, not a replacement for trained counsellors.", "",
              "## Training configuration", "```", json.dumps(config, indent=2, default=str), "```", "",
              "## Environment", "```", json.dumps(card["environment"], indent=2), "```"]
    with open(os.path.join(folder, "MODEL_CARD.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    return card
