"""Intyoza AI service: the chatbot as a web service for the Intyoza backend.

Implements backend/docs/ai-integration-contract.md:
    POST /generate   {userId, language, history, message, ageBand, profile?}  ->  {reply, escalate, escalateReason, sources, suggestions, kind}
    GET  /health     {status, questions, languageModel, documents}
Also speaks the ai/intyoza_srh contract, so the backend's existing AI_PROVIDER=intyoza works unchanged:
    POST /api/chat   {message} or {title}  ->  {type, intent, title, topic, answer, disclaimer, suggestions, source, ...}
Voice (speech.py, Intyoza's own speech model, nothing sent outside):
    POST /api/transcribe?lang=rw|en   body = the recorded audio (webm, wav, mp3, ogg, m4a)  ->  {text, language, seconds}
Draft translations for the admin (translator.py, the same answer model; a person checks every draft):
    POST /translate   {source: "EN", target: "RW", fields: {name: text}}  ->  {drafts: {name: {text, warnings}}, model, note}
Community moderation (moderation.py: crisis and risk rules, the risk model and a checker that learns from moderators):
    POST /moderate    {text, spaceStrict, authorPosts, isReply}  ->  {decision: ok|check|crisis, reasons, crisisKind, help, shadow}

Run:   python server.py                 (http://0.0.0.0:8000; models must be in ./models)
       python server.py --no-llm        without the answer model (approved answers to clear matches only)
Env:   INTYOZA_API_KEY   if set, /generate requires the header  X-API-Key: <value>
       INTYOZA_OPEN_CHAT=0  also require the key on /api/chat (the backend's intyoza provider sends no key,
                         so /api/chat is open by default)
       PORT              default 8000
       INTYOZA_4BIT=1    load the answer model in 4-bit (GPUs with 6 to 8 GB)
       INTYOZA_LLM=none  no answer model: only clear matches to approved questions are answered
       INTYOZA_DEMO=0    do not use the DEMO data (demo_data/demo_qa.json, DEMO_* documents): set this when live
The answer model (models/intyoza_writer, Intyoza's own fine-tuned model) runs on this server: no message is sent
to an outside AI service.
"""
import os
import sys
import uuid

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from typing import Dict, List, Optional  # noqa: E402

from fastapi import FastAPI, Header, HTTPException, Request  # noqa: E402
from pydantic import BaseModel, Field  # noqa: E402


class Turn(BaseModel):
    role: str
    content: str = ""


class GenerateIn(BaseModel):
    userId: str = "anonymous"
    language: str = "RW"
    history: List[Turn] = Field(default_factory=list)
    message: str
    ageBand: Optional[str] = "UNKNOWN"
    # Optional account details, to choose the words of a reply: {"gender", "district", "language", "pastTopics"}.
    # Only these keys are read (answer_engine.profile_text); the service keeps nothing after the conversation.
    profile: Optional[Dict[str, object]] = None


class ChatIn(BaseModel):          # the ai/intyoza_srh contract used by backend/src/lib/ai/intyoza.js
    message: str = ""
    title: str = ""


# escalateReason of this service -> intent names the frontend knows from the intyoza_srh bot
CHAT_INTENT = {"self_harm": "self_harm", "violence": "abuse_disclosure", "medical": "medical_emergency",
               "emergency": "medical_emergency"}


def to_chat_reply(out):
    """/generate output -> the reply shape of ai/intyoza_srh's POST /api/chat."""
    if out["escalate"]:
        kind, intent = "safe", CHAT_INTENT.get(out.get("escalateReason") or "", "high_risk")
    elif out["kind"] in ("not_covered", "clarify"):
        kind, intent = "not_sure", "srh_question"
    elif out["kind"] == "off_topic":
        kind, intent = "off_topic", "off_topic"
    elif out["kind"] in ("greeting", "small_talk", "thanks", "goodbye", "empty", "ack", "ask", "how_are_you"):
        kind, intent = "small_talk", "small_talk"
    else:
        kind, intent = "answer", "srh_question"
    sources = out.get("sources") or []
    return {"type": kind, "intent": intent, "title": None, "topic": None, "answer": out["reply"],
            "disclaimer": None, "suggestions": out.get("suggestions") or [],
            "source": "; ".join(sources) if sources else None, "reviewed": None, "confidence": None,
            "best_guess": False}


class TranslateIn(BaseModel):
    source: str = "EN"
    target: str = "RW"
    fields: Dict[str, str]


class ModerateIn(BaseModel):
    text: str
    spaceStrict: bool = False             # e.g. Survivors & Safety: every post and reply goes to a moderator
    authorPosts: Optional[int] = None     # approved posts by this alias so far (new authors are checked first)
    isReply: bool = False


class GenerateOut(BaseModel):
    reply: str
    escalate: bool
    escalateReason: Optional[str] = None
    sources: List[str] = Field(default_factory=list)
    suggestions: List[str] = Field(default_factory=list)
    kind: str


def create_app(adapter, info=None, stt=None):
    """Web app around a PlatformAdapter (chatbot.py). Separate from model loading so it can be tested.
    stt: a speech.SpeechToText for POST /api/transcribe (made on first use when not given)."""
    api = FastAPI(title="Intyoza AI service", version="1.0")
    voice = {"stt": stt}
    key = os.environ.get("INTYOZA_API_KEY")

    def check(x_api_key):
        if key and x_api_key != key:
            raise HTTPException(status_code=401, detail="Invalid API key")

    @api.get("/health")
    def health():
        out = {"status": "ok", **(info or {})}
        if voice["stt"] is not None:
            out["voice"] = voice["stt"].status()
        try:
            import review_queue
            out["review"] = review_queue.status()
        except Exception:
            pass
        try:
            import moderation
            out["moderation"] = moderation.status()
        except Exception:
            pass
        return out

    @api.post("/generate", response_model=GenerateOut)
    def generate(body: GenerateIn, x_api_key: Optional[str] = Header(default=None)):
        check(x_api_key)
        if not body.message.strip():
            raise HTTPException(status_code=400, detail="message is required")
        payload = body.model_dump() if hasattr(body, "model_dump") else body.dict()
        return adapter.generate(payload)

    @api.post("/api/chat")
    def chat(body: ChatIn, x_api_key: Optional[str] = Header(default=None),
             x_client_id: Optional[str] = Header(default=None)):
        if os.environ.get("INTYOZA_OPEN_CHAT", "1") == "0":
            check(x_api_key)
        text = (body.message or body.title or "").strip()[:500]
        if not text:
            raise HTTPException(status_code=400, detail="empty message")
        # The backend sends no user id or history here: each browser id keeps its own conversation,
        # otherwise every message is answered on its own (never mixed with another user's chat).
        user = f"client:{x_client_id}" if x_client_id else f"once:{uuid.uuid4()}"
        out = adapter.generate({"userId": user, "language": "AUTO", "history": [], "message": text})
        if user.startswith("once:"):
            adapter.forget(user)
        return to_chat_reply(out)

    @api.post("/translate")
    def translate(body: TranslateIn, x_api_key: Optional[str] = Header(default=None)):
        """Admin only (the backend sends the key): drafts a translation that a person checks before publishing."""
        check(x_api_key)
        import translator
        src, tgt = body.source.lower(), body.target.lower()
        if src not in translator.LANGS or tgt not in translator.LANGS or src == tgt:
            raise HTTPException(status_code=400, detail="source and target must be EN and RW (different)")
        if not body.fields or len(body.fields) > translator.MAX_FIELDS:
            raise HTTPException(status_code=400, detail=f"send 1 to {translator.MAX_FIELDS} fields")
        if any(len(t or "") > translator.MAX_CHARS for t in body.fields.values()):
            raise HTTPException(status_code=413, detail=f"each field must be at most {translator.MAX_CHARS} characters")
        chat = getattr(adapter, "chat", None)
        llm = getattr(getattr(chat, "engine", None), "llm", None)
        if llm is None or not getattr(llm, "ok", False):
            raise HTTPException(status_code=503, detail="The answer model is not running, so no draft can be made")
        detect = getattr(getattr(chat, "base", None), "detect_lang", None)
        drafts = translator.translate_fields(llm, body.fields, src, tgt, detect=detect)
        return {"drafts": drafts, "model": getattr(llm, "name", None),
                "note": "Draft only: a person must read and correct it before it is published."}

    @api.post("/moderate")
    def moderate(body: ModerateIn, x_api_key: Optional[str] = Header(default=None)):
        """Backend only (sends the key): ok = show now, check = moderator first, crisis = moderator now + help."""
        check(x_api_key)
        import moderation
        if len(body.text) > 5000:
            raise HTTPException(status_code=413, detail="text too long (max 5000 characters)")
        bot = getattr(getattr(adapter, "chat", None), "base", None)
        return moderation.moderate(body.text, bot=bot, space_strict=body.spaceStrict,
                                   author_posts=body.authorPosts, is_reply=body.isReply)

    @api.post("/api/transcribe")
    async def transcribe(request: Request, lang: str = "rw", x_api_key: Optional[str] = Header(default=None)):
        """Voice question -> text. The app shows the text so the person can check it before sending."""
        if os.environ.get("INTYOZA_OPEN_CHAT", "1") == "0":
            check(x_api_key)
        import speech
        audio = await request.body()
        if not audio:
            raise HTTPException(status_code=400, detail="send the recorded audio as the request body")
        if len(audio) > speech.MAX_BYTES:
            raise HTTPException(status_code=413, detail="audio too large (max 10 MB)")
        if voice["stt"] is None:
            voice["stt"] = speech.SpeechToText()
        try:
            from starlette.concurrency import run_in_threadpool
            return await run_in_threadpool(voice["stt"].transcribe, audio, lang)
        except speech.SpeechError as e:
            raise HTTPException(status_code=422 if "audio" in str(e) else 503, detail=str(e))

    return api


def build_adapter(llm="auto"):
    from answer_engine import AnswerEngine, make_llm
    from chatbot import IntyozaChat, PlatformAdapter
    from doc_engine import DocEngine
    from intyoza_core import load_bot
    models = os.path.join(HERE, "models")
    if not os.path.exists(os.path.join(models, "intyoza_heads.joblib")):
        sys.exit("No trained models in ./models. Unzip intyoza_models.zip from 1_Train.ipynb here.")
    log = os.path.join(HERE, "intyoza_unanswered.csv")
    bot = load_bot(models, HERE, use_documents=False, log_path=log)
    docs = None
    if DocEngine.available(os.path.join(models, "doc_index")):
        try:
            docs = DocEngine(bot.enc, os.path.join(models, "doc_index"), use_llm=False, use_translator=False)
        except ValueError as e:
            print("Documents not used:", e)
    if llm == "auto":
        llm = make_llm(four_bit=os.environ.get("INTYOZA_4BIT") == "1")
    elif llm == "none":
        llm = None
    import demo_data
    demo = demo_data.load() if demo_data.enabled() else None          # INTYOZA_DEMO=0 for the live platform
    engine = AnswerEngine(bot, llm, docs=docs, log_path=log, demo=demo) if llm else None
    chat = IntyozaChat(bot, docs=docs, engine=engine)
    info = {"demoData": len(demo or []) if llm else 0, "questions": len(bot.qa), "languageModel": llm.name if llm else None,
            "documents": len(docs.passages) if docs else 0}
    return PlatformAdapter(chat), info


if __name__ == "__main__":
    import uvicorn
    adapter, info = build_adapter("none" if "--no-llm" in sys.argv else "auto")
    import review_queue
    review_queue.install()
    import moderation
    moderation.auto_learn(encoder=getattr(adapter.chat.base, "enc", None))
    print("Intyoza AI service ready:", info)
    uvicorn.run(create_app(adapter, info), host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
