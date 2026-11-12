"""Runs a NeMo speech model in its own Python process (started by speech.py).

Installing NeMo inside the running AI service changes libraries that are already loaded there (e.g. `packaging`),
which breaks the import; a fresh process avoids that. Protocol on stdin/stdout, one JSON per line, prefixed with
MARK so NeMo's own log lines are ignored:
    -> {"wav": "/tmp/x.wav"}          <- MARK {"text": "..."}   or   MARK {"error": "..."}
On start it prints MARK {"ready": true} (or MARK {"error": ...}).
    python speech_worker.py nvidia/stt_rw_conformer_transducer_large
"""
import json
import sys

MARK = "@@INTYOZA "


def say(obj):
    sys.stdout.write(MARK + json.dumps(obj, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def load(model_id):
    if model_id == "fake":                 # used by the tests (no NeMo needed)
        return lambda wav: "ese umuhungu nawe yatwita"
    import torch
    from nemo.collections.asr.models import ASRModel
    model = ASRModel.from_pretrained(model_id)
    model = model.to("cuda" if torch.cuda.is_available() else "cpu").eval()

    def run(wav):
        out = model.transcribe([wav], batch_size=1, verbose=False)
        if isinstance(out, tuple):         # some NeMo versions return (best, all)
            out = out[0]
        first = out[0] if out else ""
        return (getattr(first, "text", first) or "").strip()
    return run


def main():
    try:
        run = load(sys.argv[1])
    except Exception as e:
        say({"error": f"{type(e).__name__}: {str(e)[:300]}"})
        return
    say({"ready": True})
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            say({"text": run(json.loads(line)["wav"])})
        except Exception as e:
            say({"error": f"{type(e).__name__}: {str(e)[:300]}"})


if __name__ == "__main__":
    main()
