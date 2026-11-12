"""Draft translations for the admin: an admin writes content (for example a myth and its fact) in English, and
Intyoza's own answer model drafts the Kinyarwanda (or the other way round). Everything runs on Intyoza's machine.

A draft is never shown to young people as it is: a person reads and corrects it before it is published.
Each draft comes with warnings when a simple check fails (numbers changed, wrong language, empty), so the
admin knows where to look first.

    drafts = translate_fields(llm, {"myth": "...", "fact": "..."}, "en", "rw", detect=bot.detect_lang)
    drafts["fact"]  ->  {"text": "...", "warnings": []}
"""
import re
import threading

from answer_engine import KIN_NOTE, _numbers
from intyoza_core import normalize

LANGS = {"en": "English", "rw": "Kinyarwanda"}
MAX_FIELDS = 12
MAX_CHARS = 2000            # per field: a myth, a fact or a short explanation

SYSTEM = """You translate health education text for young people in Rwanda from {src} into {tgt}.
Rules:
1. Keep the meaning exactly. Do not add, remove or soften any fact.
2. Keep every number, age, phone number, law number and name exactly as written.
3. Write simple, natural {tgt} as young people in Rwanda speak and read it. {note}
4. Keep it about the same length. Do not explain the translation.
Return ONLY the {tgt} text."""

# One draft at a time: the model is shared with the chat, and drafts are rare (admins only).
_lock = threading.Lock()


def _tidy(text):
    text = re.sub(r"^\s*(RW|EN|Kinyarwanda|English)\s*:\s*", "", (text or "").strip(), flags=re.I)
    return text.strip().strip('"').strip()


def check_draft(source, draft, target, detect=None):
    """Simple checks that need no model. Returns warnings for the admin (empty = nothing found)."""
    warnings = []
    if not draft:
        return ["empty draft"]
    if _numbers(source) != _numbers(draft):
        warnings.append("numbers differ from the original")
    if detect is not None and len(draft.split()) > 2 and detect(normalize(draft), target) != target:
        warnings.append(f"may not be in {LANGS[target]}")
    ratio = len(draft) / max(1, len(source))
    if ratio < 0.4 or ratio > 2.5:
        warnings.append("length is very different from the original")
    return warnings


def translate_fields(llm, fields, source="en", target="rw", detect=None):
    """fields: {name: text}. Returns {name: {"text": draft, "warnings": [...]}}; empty fields stay empty."""
    system = SYSTEM.format(src=LANGS[source], tgt=LANGS[target], note=KIN_NOTE if target == "rw" else "")
    out = {}
    for name, text in fields.items():
        text = (text or "").strip()
        if not text:
            out[name] = {"text": "", "warnings": []}
            continue
        with _lock:
            draft = _tidy(llm.chat(system, text, max_tokens=min(900, 80 + len(text)), temperature=0.0))
        out[name] = {"text": draft, "warnings": check_draft(text, draft, target, detect)}
    return out
