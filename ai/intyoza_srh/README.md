# intyoza_srh: offline SRH chatbot package

A self-contained chatbot that answers sexual and reproductive health (SRH) questions for young people in Rwanda, in English. It runs fully offline and does not call any external AI service.

> **Safety first.** All answers are marked `reviewed = pending`. Before real young people use this, a qualified SRH professional must review every answer. Then set `INTYOZA_REQUIRE_REVIEWED=1` so only reviewed answers are shown.

## What is inside

```
intyoza_srh/
├── model/intyoza_srh_model.h5   the trained Keras model + vocabulary, labels, answers, replies, settings
├── model/labels.json, config.json   readable copies (not needed to run)
├── chatbot.py                   IntyozaChatbot: safety rules -> model -> confidence gate -> answer
├── featurizer.py                text -> TF-IDF features (pure NumPy)
├── safety.py                    crisis keyword rules + refusal rule (doses, ending a pregnancy)
├── server.py                    web server (standard library only) + JSON API
└── web/index.html               chat interface
```

The `.h5` file holds everything the model needs. You can load it with Keras
(`tf.keras.models.load_model(path, compile=False)`) or with NumPy + h5py and no TensorFlow at all.

## Install

```bash
pip install -r intyoza_srh/requirements.txt        # numpy + h5py (TensorFlow is optional)
```

## Use it

**1. As a chat website**

```bash
python -m intyoza_srh                 # open http://localhost:8000
python -m intyoza_srh --host 0.0.0.0 --port 9000
```

**2. From Python**

```python
from intyoza_srh import IntyozaChatbot

bot = IntyozaChatbot()                      # or IntyozaChatbot("path/to/intyoza_srh_model.h5")
r = bot.ask("can i get pregnant the first time?")
print(r["type"])        # answer | not_sure | safe | refuse | off_topic | small_talk
print(r["answer"])      # text to show the user
print(r["disclaimer"])  # always show this under the answer
print(r["suggestions"]) # related questions you can show as buttons
```

**3. From another app, using the HTTP API**

```
POST /api/chat     {"message": "what is PrEP"}
  -> {"type": "answer", "title": "PrEP", "answer": "...", "disclaimer": "...", "suggestions": [...], "source": "..."}
POST /api/chat     {"title": "HIV testing"}      (when the user taps a suggestion)
GET  /api/topics   {"hiv": ["PrEP", ...], ...}
GET  /api/health
```

To call the API from a web page on another domain, set `INTYOZA_CORS_ORIGIN=https://your-site.example`.
The chat page can also talk to a server elsewhere: `index.html?api=https://your-server.example`.

## How a reply is chosen

1. **Small talk** (hello, thanks, bye, who are you) gets a friendly fixed reply.
2. **Safety keyword rules** catch self-harm, abuse and emergencies, and always win. They return a fixed reply with Rwandan helplines (112, 114, 116, 3512, 3029).
3. **Refusal rule**: requests for medicine doses or ways to end a pregnancy are declined politely, with a referral.
4. **Intent head** of the model: crisis, diagnosis and off-topic messages get the matching fixed reply.
5. **Answer head**: picks one of the knowledge-base answers. If the model is not confident enough, it says "I am not sure", suggests close matches and refers to a health worker.

The model never writes new health facts. It only picks from written answers.

## Settings (environment variables)

| Variable | Meaning |
|---|---|
| `INTYOZA_MODEL` | path to another `.h5` file |
| `INTYOZA_REQUIRE_REVIEWED=1` | show only answers marked `reviewed = yes` (use this at launch) |
| `INTYOZA_CORS_ORIGIN` | allow browser calls from this origin |

Privacy: the server keeps no database and writes no logs of questions.
