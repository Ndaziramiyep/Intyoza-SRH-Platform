import { config } from '../../config.js';

// Voice question -> text, using the AI service's own speech model (POST /api/transcribe on AI_SERVICE_URL).
// The audio goes only to Intyoza's AI service; nothing is sent to an outside speech company.

const LANGS = new Set(['rw', 'en']);

function fail(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

/**
 * @param {{ audio: Buffer, contentType?: string, lang?: string }} input
 * @returns {Promise<{ text: string, language: string, seconds: number|null }>}
 */
export async function transcribeAudio({ audio, contentType, lang = 'rw' } = {}) {
  if (!audio || !audio.length) throw fail(400, 'INVALID_INPUT', 'Send the recorded audio as the request body');
  const language = LANGS.has(String(lang).toLowerCase()) ? String(lang).toLowerCase() : 'rw';
  let res;
  try {
    res = await fetch(`${config.aiServiceUrl}/api/transcribe?lang=${language}`, {
      method: 'POST',
      headers: { 'Content-Type': contentType || 'application/octet-stream' },
      body: audio,
      signal: AbortSignal.timeout(config.aiTimeoutMs),
    });
  } catch {
    throw fail(503, 'AI_UNAVAILABLE', 'The voice service is not reachable right now');
  }
  if (res.status === 422) throw fail(422, 'AUDIO_UNREADABLE', 'The recording could not be read. Please try again.');
  if (!res.ok) throw fail(503, 'AI_UNAVAILABLE', 'The voice service is not reachable right now');
  const data = await res.json();
  return { text: String(data.text || '').trim(), language: data.language || language, seconds: data.seconds ?? null };
}
