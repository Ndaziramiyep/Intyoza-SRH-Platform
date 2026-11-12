# Voice input: what the backend and frontend need (proposal, not applied)

The AI service now turns a recorded question into text with Intyoza's own Kinyarwanda speech model
(NVIDIA NeMo `stt_rw_conformer_transducer_large`, CC-BY-4.0). No voice is sent to Google or any other company.

    POST {AI_SERVICE_URL}/api/transcribe?lang=rw      (lang=en also works)
    body: the recorded audio as it is (webm/opus from the browser, wav, mp3, ogg, m4a), max 10 MB, first 60 s used
    ->   {"text": "ese umuhungu nawe yatwita", "language": "rw", "seconds": 3.4}

Today the mic button in `AskPage.tsx` uses the browser's SpeechRecognition. In Chrome that sends the voice to
Google, and Kinyarwanda (`rw-RW`) is not supported by most browsers.

## Backend (one new route, Express)

```js
// backend/src/routes/ai.js
import express from 'express';
aiRouter.post('/transcribe', authRequired, express.raw({ type: 'audio/*', limit: '10mb' }), async (req, res, next) => {
  try {
    const lang = req.query.lang === 'en' ? 'en' : 'rw';
    const r = await fetch(`${config.aiServiceUrl}/api/transcribe?lang=${lang}`, {
      method: 'POST',
      headers: { 'Content-Type': req.get('Content-Type') || 'application/octet-stream' },
      body: req.body,
      signal: AbortSignal.timeout(60_000),
    });
    if (!r.ok) return res.status(r.status === 422 ? 422 : 503).json({ error: { code: 'TRANSCRIBE_FAILED' } });
    res.json(await r.json());   // { text, language, seconds }
  } catch (err) { next(err); }
});
```

## Frontend (mic button: record, then put the text in the input box)

```ts
const rec = new MediaRecorder(await navigator.mediaDevices.getUserMedia({ audio: true }))
const chunks: Blob[] = []
rec.ondataavailable = (e) => chunks.push(e.data)
rec.onstop = async () => {
  const audio = new Blob(chunks, { type: rec.mimeType })          // usually audio/webm
  const res = await fetch(`/api/v1/ai/transcribe?lang=${lang === 'rw' ? 'rw' : 'en'}`, {
    method: 'POST', headers: { 'Content-Type': audio.type, Authorization: `Bearer ${token}` }, body: audio,
  })
  if (res.ok) setDraft((await res.json()).text)                    // the person checks it, then presses send
}
rec.start()   // ... rec.stop() when the mic button is pressed again (or after ~30 s)
```

Show the text in the input box before sending, so the person can fix a wrong word. Keep the browser
SpeechRecognition only as a fallback when the AI service is off.
