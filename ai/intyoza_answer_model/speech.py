"""Speech to text for Intyoza, on Intyoza's own machine (no voice is sent to an outside company).

    import speech
    stt = speech.SpeechToText()            # loads nothing yet
    text = stt.transcribe(audio_bytes)     # any format ffmpeg reads (webm/opus from a browser, wav, mp3, m4a, ogg)

Models (NVIDIA NeMo, CC-BY-4.0, loaded the first time a language is used):
  rw  nvidia/stt_rw_conformer_transducer_large   Kinyarwanda, trained on ~2,000 h of Mozilla Common Voice (WER ~16 %)
  en  nvidia/stt_en_fastconformer_transducer_large   English
Needs:  pip install "nemo_toolkit[asr]"   and ffmpeg (both available on Kaggle).
INTYOZA_SPEECH=0 switches voice off.
"""
import os
import subprocess
import tempfile
import threading

MODELS = {"rw": "nvidia/stt_rw_conformer_transducer_large",
          "en": "nvidia/stt_en_fastconformer_transducer_large"}
MAX_SECONDS = 60          # longer recordings are cut: a spoken question is short
MAX_BYTES = 10_000_000


class SpeechError(Exception):
    """A problem the caller can show (bad audio, voice off, model not available)."""


def enabled():
    return os.environ.get("INTYOZA_SPEECH", "1") != "0"


def to_wav(audio, seconds=MAX_SECONDS):
    """Any audio -> 16 kHz mono WAV file path (temporary; the caller deletes it). Returns (path, duration_s)."""
    if not audio:
        raise SpeechError("empty audio")
    if len(audio) > MAX_BYTES:
        raise SpeechError("audio too large (max 10 MB)")
    src = tempfile.NamedTemporaryFile(delete=False, suffix=".audio")
    src.write(audio)
    src.close()
    dst = src.name + ".wav"
    try:
        r = subprocess.run(["ffmpeg", "-nostdin", "-loglevel", "error", "-y", "-i", src.name, "-t", str(seconds),
                            "-ac", "1", "-ar", "16000", "-f", "wav", dst], capture_output=True, timeout=60)
    except FileNotFoundError:
        raise SpeechError("ffmpeg is not installed")
    finally:
        os.unlink(src.name)
    if r.returncode != 0 or not os.path.exists(dst) or os.path.getsize(dst) <= 44:
        if os.path.exists(dst):
            os.unlink(dst)
        raise SpeechError("could not read the audio")
    duration = (os.path.getsize(dst) - 44) / (16000 * 2)
    return dst, duration


class SpeechToText:
    def __init__(self, models=None, device=None):
        self.models_ids = dict(models or MODELS)
        self.device = device
        self.models, self.errors = {}, {}
        self.lock = threading.Lock()          # one transcription at a time on the GPU

    def status(self):
        return {"enabled": enabled(), "loaded": sorted(self.models), "errors": self.errors,
                "preparing": bool(getattr(self, "_preparing", False))}

    def prepare(self, lang="rw"):
        """Loads the model in the background (installs NeMo first if needed), so the service starts at once and
        the first voice request does not wait for the download."""
        def work():
            self._preparing = True
            try:
                with self.lock:
                    self.load(lang)
            except SpeechError:
                pass
            finally:
                self._preparing = False
        threading.Thread(target=work, daemon=True).start()

    def _ensure_nemo(self):
        """Installs NeMo once if it is missing (checked in a separate process, so nothing is imported here)."""
        import subprocess
        import sys
        ok = subprocess.run([sys.executable, "-c", "import nemo.collections.asr"], capture_output=True, timeout=600)
        if ok.returncode == 0:
            return
        if os.environ.get("INTYOZA_SPEECH_INSTALL", "1") == "0":
            raise SpeechError("NeMo is not installed (pip install 'nemo_toolkit[asr]')")
        r = subprocess.run([sys.executable, "-m", "pip", "install", "-q", "nemo_toolkit[asr]"],
                           capture_output=True, text=True, timeout=1800)
        if r.returncode != 0:
            raise SpeechError("installing NeMo failed: " + (r.stderr or "")[-300:])

    def load(self, lang="rw"):
        """Starts the speech model for this language in its own process (downloads it the first time)."""
        if lang in self.models and self.models[lang].poll() is None:
            return self.models[lang]
        if lang not in self.models_ids:
            raise SpeechError(f"no speech model for language '{lang}'")
        import subprocess
        import sys
        try:
            if self.models_ids[lang] != "fake":
                self._ensure_nemo()
            env = dict(os.environ)
            try:                                  # a second GPU (Kaggle T4 x2) keeps speech off the answer model's GPU
                import torch
                if torch.cuda.device_count() > 1 and "CUDA_VISIBLE_DEVICES" not in env:
                    env["CUDA_VISIBLE_DEVICES"] = "1"
            except Exception:
                pass
            worker = os.path.join(os.path.dirname(os.path.abspath(__file__)), "speech_worker.py")
            log = open(os.path.join(tempfile.gettempdir(), f"intyoza_speech_{lang}.log"), "a")
            proc = subprocess.Popen([sys.executable, worker, self.models_ids[lang]], stdin=subprocess.PIPE,
                                    stdout=subprocess.PIPE, stderr=log, text=True, bufsize=1, env=env)
            msg = self._read(proc, timeout=1800)
            if not msg.get("ready"):
                proc.kill()
                raise SpeechError(msg.get("error") or "the speech model did not start")
        except SpeechError as e:
            self.errors[lang] = str(e)[:400]
            raise SpeechError(f"speech model for '{lang}' not available: {self.errors[lang]}")
        except Exception as e:
            self.errors[lang] = f"{type(e).__name__}: {str(e)[:300]}"
            raise SpeechError(f"speech model for '{lang}' not available: {self.errors[lang]}")
        self.models[lang] = proc
        self.errors.pop(lang, None)
        return proc

    @staticmethod
    def _read(proc, timeout=120):
        """Next protocol line from the worker (NeMo's own output lines are skipped)."""
        import json
        import queue
        q = queue.Queue()

        def reader():
            for line in proc.stdout:
                if line.startswith("@@INTYOZA "):
                    q.put(json.loads(line[len("@@INTYOZA "):]))
                    return
            q.put({"error": "the speech model stopped"})
        threading.Thread(target=reader, daemon=True).start()
        try:
            return q.get(timeout=timeout)
        except queue.Empty:
            return {"error": "the speech model did not answer in time"}

    def _run(self, proc, wav):
        import json
        proc.stdin.write(json.dumps({"wav": wav}) + "\n")
        proc.stdin.flush()
        msg = self._read(proc, timeout=120)
        if "error" in msg:
            raise SpeechError("speech model error: " + msg["error"])
        return msg.get("text", "").strip()

    def transcribe(self, audio, lang="rw"):
        """Audio bytes -> {"text", "language", "seconds"}."""
        if not enabled():
            raise SpeechError("voice input is switched off")
        lang = (lang or "rw").lower()[:2]
        wav, duration = to_wav(audio)
        try:
            with self.lock:
                model = self.load(lang)
                text = self._run(model, wav)
        finally:
            os.unlink(wav)
        return {"text": text, "language": lang, "seconds": round(duration, 1)}
