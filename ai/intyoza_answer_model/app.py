"""Intyoza chat window (Gradio): a chat page in the browser to test Intyoza like a real chatbot.

In Colab:   from app import launch_app; launch_app(chat)          (gives a public link to open on a phone)
On laptop:  conda activate intyoza   then   python app.py           (opens http://127.0.0.1:7860)
            python app.py --no-llm   without the answer model (laptops without a GPU)
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

N_BUTTONS = 8
INTRO = ("### Intyoza\nBaza ikibazo cyose ku buzima bw'imyororokere. Ibiganiro ni ibanga. "
         "Niba uri mu kaga, hamagara **112**; umurongo w'ubuzima **114**; abana **116**; Isange **3029**.")


def _chatbot_component(gr):
    try:
        return gr.Chatbot(type="messages", height=520, label="Intyoza")
    except TypeError:                     # Gradio 6: messages are the only format
        return gr.Chatbot(height=520, label="Intyoza")


def _buttons(gr, suggestions):
    s = list(suggestions or [])[:N_BUTTONS]
    return [gr.Button(value=s[i], visible=True) if i < len(s) else gr.Button(value="", visible=False)
            for i in range(N_BUTTONS)]


def _format(out):
    text = out["reply"]
    if out.get("kind") in ("answer", "answer_with_help", "document_answer") and out.get("sources"):
        text += f"\n\n<sub>Inkomoko: {'; '.join(out['sources'])}</sub>"
    return text


def build_app(chat, title="Intyoza"):
    """Build the chat page around an IntyozaChat object (chatbot.py)."""
    import gradio as gr

    def start(age):
        sid = chat.new_session(age_group=age)
        out = chat.respond(sid, "muraho")
        history = [{"role": "assistant", "content": _format(out)}]
        return [sid, history, ""] + _buttons(gr, out["suggestions"])

    def send(text, history, sid, age, show_why):
        text = (text or "").strip()
        if not text:                      # nothing typed: leave everything as it is
            keep = getattr(gr, "skip", None) or gr.update
            return [sid, history, "", keep()] + [keep() for _ in range(N_BUTTONS)]
        if not sid:
            sid = chat.new_session(age_group=age)
        out = chat.respond(sid, text, debug=True)
        history = list(history or []) + [{"role": "user", "content": text},
                                         {"role": "assistant", "content": _format(out)}]
        why = ""
        if show_why:
            d = out.get("debug", {})
            if "status" in d:             # answer engine: how the message was read, sources used, checks
                checks = "; ".join(f"try {c.get('attempt')}: " + (", ".join(c.get("problems", [])) or c.get("result", "passed"))
                                   for c in d.get("checks", []))
                why = (f"**type:** {out['kind']} | **understood as:** {d.get('read_as', '-')} | **sources used:** "
                       f"{'; '.join(d.get('sources_used', [])) or '-'} | **checks:** {checks or '-'} | "
                       f"**risk:** {d.get('original', {}).get('level', '-')} | **age:** {d.get('age', '-')}")
            else:
                why = (f"**type:** {out['kind']} | **question:** {out.get('qa_id') or '-'} | **read as:** {d.get('how', '-')} "
                       f"| **chosen because:** {d.get('why', '-')} | **answer:** {d.get('answer', '-')} | "
                       f"**risk:** {d.get('original', {}).get('level', '-')} | **age:** {d.get('age', '-')}")
        return [sid, history, "", why] + _buttons(gr, out["suggestions"])

    with gr.Blocks(title=title) as demo:
        sid = gr.State(None)
        gr.Markdown(INTRO)
        with gr.Row():
            age = gr.Dropdown(["10-14", "15-19", "20-24"], value="15-19", label="Imyaka / Age", scale=1)
            show_why = gr.Checkbox(value=False, label="Erekana impamvu (testing)", scale=1)
            new = gr.Button("Ikiganiro gishya / New chat", scale=1)
        chatbox = _chatbot_component(gr)
        with gr.Row():
            btns = [gr.Button(visible=False, size="sm") for _ in range(N_BUTTONS)]
        with gr.Row():
            box = gr.Textbox(placeholder="Andika ubutumwa hano... / Type your message...", show_label=False, scale=8)
            go = gr.Button("Ohereza", variant="primary", scale=1)
        why = gr.Markdown("")

        outs_start = [sid, chatbox, box] + btns
        outs_send = [sid, chatbox, box, why] + btns
        demo.load(start, inputs=[age], outputs=outs_start)
        new.click(start, inputs=[age], outputs=outs_start)
        age.change(start, inputs=[age], outputs=outs_start)
        go.click(send, inputs=[box, chatbox, sid, age, show_why], outputs=outs_send)
        box.submit(send, inputs=[box, chatbox, sid, age, show_why], outputs=outs_send)
        for b in btns:
            b.click(send, inputs=[b, chatbox, sid, age, show_why], outputs=outs_send)
    return demo


def launch_app(chat, share=None, **kw):
    """Start the chat page. share=None: a public link in Colab, local only on a laptop."""
    if share is None:
        share = "google.colab" in sys.modules
    demo = build_app(chat)
    demo.queue()
    return demo.launch(share=share, **kw)


if __name__ == "__main__":
    from chatbot import IntyozaChat
    from intyoza_core import load_bot
    models = os.path.join(HERE, "models")
    if not os.path.exists(os.path.join(models, "intyoza_heads.joblib")):
        sys.exit("No trained models yet. Run 1_Train.ipynb first (or unzip intyoza_models.zip here).")
    print("Loading Intyoza...")
    bot = load_bot(models, HERE, use_documents="--no-docs" not in sys.argv,
                   log_path=os.path.join(HERE, "intyoza_unanswered.csv"))
    from answer_engine import AnswerEngine, make_llm
    llm = make_llm() if "--no-llm" not in sys.argv else None      # Intyoza's own answer model (needs a GPU)
    import demo_data
    demo = demo_data.load() if demo_data.enabled() else None
    engine = AnswerEngine(bot, llm, docs=bot.docs, log_path=os.path.join(HERE, "intyoza_unanswered.csv"), demo=demo) if llm else None
    launch_app(IntyozaChat(bot, engine=engine), inbrowser=True)
