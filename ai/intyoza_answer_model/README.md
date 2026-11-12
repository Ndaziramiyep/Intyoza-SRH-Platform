# Intyoza answer model (ai/intyoza_answer_model)

Intyoza's own AI for sexual and reproductive health questions from young people in Rwanda. It answers in
Kinyarwanda or English by reading trusted sources and writing an answer to the exact question asked.
It runs on Intyoza's own machine: no message is sent to an outside AI company.

The CPU bot in `ai/intyoza_srh` is a separate module (another team member's).

## How a question is answered (answer_engine.py)

1. Safety first: danger messages get the approved help message with Rwandan helplines (never generated).
2. Understand: the model reads the message with the conversation and writes out the full question.
3. Read: it searches the approved answers and the trusted documents (meaning + keywords).
4. Write: an answer to that question, in the user's language, only from those sources.
5. Check: no number, age, law, dose or phone number that is not in the sources; then the model's own check
   that the answer fits this question and its facts are in the sources.
6. Honest: if the sources do not cover it, it says so and where to ask (youth corner, 114). It never answers
   a different question instead.

## Models

| Part | Model | Licence |
|---|---|---|
| Understanding (matcher) | multilingual-e5-large-instruct, fine-tuned on Intyoza data (`1_Train.ipynb`) | MIT |
| Writing (answer model) | AfriqueQwen3.5-4B-Instruct + Intyoza QLoRA adapter (`4_Train_Answer_Model_Colab.ipynb`) | CC-BY-4.0 |

Results of the training run (base model -> fine-tuned, held-out examples): rules passed 0.55 -> 1.00,
cites the right source 0.23 -> 1.00, chrF 56.4 -> 99.7, says "not covered" correctly 0.00 -> 1.00.

Trained models are **not in git** (too large). Get them from:
- Kaggle: the training notebook's output `intyoza_outputs`, file `intyoza_writer.zip`
- Team Drive copy of `intyoza_writer.zip`

On Kaggle, `kaggle_setup.py` unzips `intyoza_writer.zip` by itself. On a server, unzip it into `models/` so you have
`models/intyoza_writer/adapter_model.safetensors`. The matcher (`models/intyoza_matcher`) and the document index
(`models/doc_index`) come from the Kaggle `intyoza` dataset.

## Folder

| File | What it does |
|---|---|
| `answer_engine.py` | understand, search, write, check, "not covered" |
| `chatbot.py` | conversation, safety rules, greetings, fallback to approved answers |
| `intyoza_core.py`, `preprocess.py` | approved Q&A, matcher, language handling |
| `doc_engine.py`, `get_documents.py`, `build_documents.py` | trusted documents: download, split, index, search |
| `writer_training.py` | training examples and QLoRA fine-tuning of the answer model |
| `evaluation.py` | tests and scores |
| `server.py` | web service for the backend: `POST /api/chat`, `POST /generate`, `GET /health` |
| `public_service.py` | runs the service from a notebook with a public address (fixed with ngrok) and key |
| `kaggle_setup.py` | prepares any Kaggle notebook: code, trained model (unzipped), new data, secrets, removes an old `torchao` |
| `speech.py` | voice input: Kinyarwanda/English speech to text (NeMo, on this service) |
| `review_queue.py` | unanswered questions to the health team's private review sheet (personal details removed) |
| `export_csv.py` | exports the data to CSV |
| `demo_data.py` | extra public data (not reviewed by Intyoza); off when going live |
| `intyoza_data.json` | approved questions and answers (Kinyarwanda + English), help messages, referrals |
| `knowledge/Intyoza_Dataset.xlsx` | **the data you edit**: questions, answers, ways of asking (319 questions) |
| `knowledge/` | knowledge base documents |
| `documents/` | trusted documents list (`SOURCES.json`); PDFs are kept out of git |
| `1_Train.ipynb` | train the matcher |
| `4_Train_Answer_Model_Colab.ipynb` | build the document index and train the answer model (Kaggle/Colab GPU) |
| `Intyoza_AI_Service.ipynb` | run the trained model on Kaggle and get the address + key for the backend |
| `2_Chat_Offline.ipynb`, `app.py`, `chat.py` | local chat for testing |

## Kaggle setup (once)

The answer model needs an NVIDIA GPU (about 10 GB; 6 GB with `INTYOZA_4BIT=1`). Kaggle's free T4 GPUs are used for
testing and training. Create these once in Kaggle (Your Work > Datasets > New Dataset):

| Kaggle dataset | What to upload | When to update |
|---|---|---|
| `intyoza` | already exists: code, matcher model, documents | never |
| `intyoza-data` | only a `documents/` folder with new PDFs | when you add documents |

The code comes from GitHub and the data from a Google Sheet on every run (secrets below), so there is no zip
to upload. Without those secrets, the old way still works: dataset `intyoza-code` (`intyoza_code.zip`) and
`Intyoza_Dataset.xlsx` in `intyoza-data`.

Secrets (any notebook > Add-ons > Secrets; tick them for each notebook that uses them):

| Secret | Value |
|---|---|
| `INTYOZA_API_KEY` | your fixed service key (make one: `python -c "import secrets; print(secrets.token_urlsafe(32))"`) |
| `NGROK_AUTHTOKEN` | from ngrok.com > Your Authtoken (free account) |
| `NGROK_DOMAIN` | from ngrok.com > Domains: the free address ngrok gives your account (e.g. `name.ngrok-free.dev`), without `https://` |
| `INTYOZA_REPO` | the GitHub repo, `owner/Intyoza-SRH-Platform` |
| `INTYOZA_BRANCH` | the branch with this folder (`main` once merged) |
| `GITHUB_TOKEN` | only if the repo is private: GitHub > Settings > Developer settings > Fine-grained token, this repo only, Contents: Read-only |
| `INTYOZA_SHEET_ID` | the data Google Sheet's ID (the part of its link between `/d/` and `/edit`); share the sheet as "Anyone with the link: Viewer" |

`kaggle_setup.py` does the rest in every notebook: copies the code, unzips the trained model, adds your data,
reads the secrets and removes Kaggle's old `torchao` (it blocks loading the fine-tuned model).

## Run it (testing): Kaggle

1. New notebook > File > Import Notebook > `Intyoza_AI_Service.ipynb` (once; then just open it).
2. Settings: **GPU T4 x2**, Internet **On**. Inputs: `intyoza`, `intyoza-code`, `intyoza-data`, and the training
   notebook's output. Secrets ticked.
3. **Run All** (about 5 to 10 minutes). It prints the address and answers two test questions.
4. Keep the tab open while testing: Kaggle stops the session after at most 12 hours, or soon after the tab is closed.
   The address stays the same on every run.

Check that it is running and uses the fine-tuned model: open `https://<your NGROK_DOMAIN>/health` (click
"Visit Site" on ngrok's notice). It should show `"status": "ok"`, `"questions": 319` and
`"fineTuning": {"loaded": true}`. If `loaded` is false, `"error"` says why.

`backend/.env` (the backend as it is now; set once with the fixed ngrok address):

```
AI_PROVIDER=intyoza
AI_SERVICE_URL=https://<your NGROK_DOMAIN>
AI_TIMEOUT_MS=120000
```

The service answers the backend on `POST /api/chat` (same requests as the `ai/intyoza_srh` bot), so the backend code
does not change. The backend sends no language there, so the service detects English or Kinyarwanda from each
message. The backend sends no key either, so `/api/chat` is open to anyone with the address (keep it private);
set `INTYOZA_OPEN_CHAT=0` to require the key once the backend sends it. `POST /generate` always requires the key.
An answer takes about 20 to 40 seconds, hence `AI_TIMEOUT_MS=120000`.

If the AI service is not running, the frontend falls back to its built-in offline guide (English only, limited).

## Voice input

`speech.py` turns a recorded question into text with Intyoza's own speech model, on the same GPU, so no voice leaves
the service: NVIDIA NeMo `stt_rw_conformer_transducer_large` (Kinyarwanda, about 2,000 h of Common Voice, ~16 % word
errors, CC-BY-4.0) and `stt_en_fastconformer_transducer_large` (English). The service loads it in the background when
it starts (it installs `nemo_toolkit[asr]` the first time, a few minutes); `/health` shows `"voice"`.
`INTYOZA_SPEECH=0` switches it off. The backend route and the frontend mic change are proposed in
`backend_integration/VOICE.md` (not applied).

## Add new data (no code changes, no uploads)

The data lives in one Google Sheet (`Intyoza_Dataset`, same tabs as `knowledge/Intyoza_Dataset.xlsx`).

1. Open the sheet in Google Drive:
   - **Questions** tab: add a row with a new ID (e.g. `CON-046`), topic, risk, question and answer in English
     and Kinyarwanda; or edit an existing answer.
   - **Phrasings** tab: add ways young people ask (Question ID, text, language `rw`/`en`, `train` or `test`).
   - New rows with *Review status* starting with `Draft` are **not used** until a reviewer changes the status
     (for example to `Approved`). `INTYOZA_INCLUDE_DRAFTS=1` uses them anyway, for testing.
2. **New answers only**: restart `Intyoza_AI_Service.ipynb` (Run All). It downloads the sheet, and the new
   questions are answered right away, no training.
3. **Better understanding and writing**: run `4_Train_Answer_Model_Colab.ipynb` with **Save & Run All**
   (about 4 to 5 hours); it also reads the sheet. Then use that notebook's output as the trained-model input of the
   service notebook.
4. New documents: upload the PDF to the `intyoza-data` dataset (`documents/`) and add it to `documents/SOURCES.json`.

Now and then, download the sheet as `.xlsx` into `knowledge/` and commit it, so git keeps a copy of the data.

## Review unanswered questions (health team)

Questions the AI could not answer go to a **private** Google Sheet ("Intyoza – Unanswered questions"), never to the
link-shared dataset. `review_queue.py` adds them every 2 minutes:

- personal details are removed first: names, phone numbers, e-mails, links, @handles, long numbers, names of people
  and places; no user id, chat id or time is stored, only the date
- crisis messages (self-harm, abuse, rape, emergencies) are never written, only counted (tab **Counts**)
- the same question asked again adds to **Times asked**; rows not asked for 90 days are deleted

The reviewer picks a **Reviewer action** for each row: *Add as new question* (write it in the Questions tab of the
dataset), *Add as another way of asking* (add it to Phrasings with the **Question ID**), *Already answered* or
*Ignore*. Approved rows are used in the next training.

Setup (once):
1. Google Cloud Console > new project > enable **Google Sheets API** > IAM > Service accounts > create one >
   Keys > Add key > JSON (downloads a key file).
2. Share the private sheet with the service account's e-mail (`...@...iam.gserviceaccount.com`) as **Editor**, and
   with each reviewer. Never "Anyone with the link".
3. Kaggle secrets: `INTYOZA_REVIEW_SHEET_ID` = the sheet's ID, `GOOGLE_SERVICE_ACCOUNT` = the whole JSON key file.
4. Run All. The output says `Review sheet: on`; `/health` shows `"review"`.

Before launch: tell users in the privacy notice that questions the bot cannot answer may be read, without personal
details, to improve it, and check consent rules for under-18s with someone who knows Rwanda's data protection law.

## Run it (live): GPU server

```bash
pip install -r requirements.txt
# models/ must contain intyoza_matcher, doc_index, intyoza_writer
INTYOZA_API_KEY=<key> INTYOZA_DEMO=0 PORT=8001 python server.py
```

Without a GPU: `python server.py --no-llm` (only clear matches to approved questions are answered).

## API

- `POST /api/chat` `{message}` or `{title}` -> `{type, intent, answer, suggestions, source, ...}` (backend `AI_PROVIDER=intyoza`)
- `POST /generate` header `X-API-Key`, `{userId, language, history, message}` -> `{reply, escalate, escalateReason, sources, suggestions, kind}`
  (keeps the conversation; `backend_integration/` shows a backend provider that uses it with the `ai/intyoza_srh` bot as fallback)
- `POST /api/transcribe?lang=rw|en`, body = recorded audio (webm/wav/mp3/ogg/m4a) -> `{text, language, seconds}`
- `GET /health` -> status, number of questions, model name, `fineTuning` (loaded, files, error)
- `POST /translate` header `X-API-Key`, `{source: "EN", target: "RW", fields: {myth: "...", fact: "..."}}`
  -> `{drafts: {myth: {text, warnings}, ...}, model, note}`. Admin drafts only (for example a new myth in English ->
  Kinyarwanda draft). Warnings flag changed numbers, the wrong language or a very different length. A person
  always checks the draft before it is published; drafts are never shown to young people as they are.
- `POST /moderate` header `X-API-Key`, `{text, spaceStrict, authorPosts, isReply}` -> `{decision, reasons, crisisKind, help, shadow}`.
  For community posts: `ok` = show now, `check` = a moderator looks first, `crisis` = alert a moderator now and show the
  young person `help` (numbers to call). Grooming signs (asking for a number, to meet, age or school, photos, money),
  personal details, links and insults are `check`; new authors (fewer than 3 approved posts) and strict spaces are
  always `check`. When unsure or on an error it answers `check`. `shadow: true` (default, `INTYOZA_MODERATION_SHADOW=1`)
  means: keep reviewing every post and save the AI decision next to the moderator's, to measure it before trusting it.
  Nothing is stored by the AI service. It learns from moderators' decisions (below). The built-in word lists in
  `moderation.py` need checking by a Kinyarwanda speaker.

## Community moderation: the learning loop

Moderators' decisions teach the AI, automatically:

1. **Shadow mode first** (default): moderators keep reviewing every post; the backend saves the AI decision
   (`decision`, `reasons`) and the moderator's decision on each post.
2. **Every start, it learns**: with the Kaggle secrets `INTYOZA_MODERATION_EXPORT_URL` (the backend admin export of
   `text`, `aiDecision`, `moderatorDecision`) and `INTYOZA_MODERATION_EXPORT_KEY` (sent as `X-API-Key`), the service
   fetches the latest decisions, retrains a checker and tests it before using it (`train_moderation.py`).
3. **Reads meaning, not only words**: the checker uses Intyoza's own matcher (multilingual-e5, Kinyarwanda and
   English), so a new wording of something moderators blocked before is recognised too.
4. **Only used if it is safe**: tested on posts it never saw, it must miss **no** crisis and make no more mistakes
   than the rules alone; otherwise the previous version stays. It needs at least 200 decisions with 10 crisis posts.
   The checker can hold a post or raise it to crisis, but never releases a post held by crisis words or trust levels.
5. **Watch it**: `GET /health` -> `moderation` shows the shadow-mode numbers of the last learning (agreement, crisis
   missed), when it learned and whether the new checker was used. Switch shadow mode off
   (`INTYOZA_MODERATION_SHADOW=0`) only when no crisis was missed.

By hand: `python train_moderation.py moderation_export.json` (or `--from-url URL`).

## Retrain from scratch

1. `1_Train.ipynb` (matcher, about 25 min, Colab or local; only needed if the matcher must change).
2. `4_Train_Answer_Model_Colab.ipynb` on Kaggle with **Save & Run All**.

## Troubleshooting

| Problem | Cause and fix |
|---|---|
| `/health` shows `"loaded": false` | read `"error"`; the trained model input (training notebook output) must be attached |
| ngrok error about `domain` | fixed in `public_service.py` (newer ngrok uses `url`); upload the latest `intyoza_code.zip` |
| Answers come from the offline guide | the Kaggle notebook is not running, or the backend cannot create users (see the backend's database setup) |
| English question answered in Kinyarwanda | use the latest code (GitHub secrets, or the latest `intyoza_code.zip`) |
| "Data from Google Sheet failed" | share the sheet as "Anyone with the link: Viewer" and check `INTYOZA_SHEET_ID` |
| "Code from GitHub failed" | check `INTYOZA_REPO`, `INTYOZA_BRANCH` and, for a private repo, `GITHUB_TOKEN` |
| A new question is not answered | its *Review status* still starts with `Draft` |
| A new document is not used | `get_documents.prepare()` adds new files to the existing index; check the notebook output for the file |

## Before going live

- A qualified health professional reviews the answers.
- `INTYOZA_DEMO=0` on the server, delete `demo_data/` and `documents/DEMO_*`, retrain without that data.
- Run on a GPU server with a fixed address; keep `INTYOZA_API_KEY` secret (never in git).
- `intyoza_unanswered.csv` (questions with no answer, personal details removed, date only) is still private: never commit it.
