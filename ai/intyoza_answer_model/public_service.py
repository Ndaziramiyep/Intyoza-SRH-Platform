"""Runs the Intyoza AI service from a notebook (Colab) and gives it a public address, so the platform's backend
can call it during the demo.

    url, key = public_service.start(chat)        # chat = the IntyozaChat already loaded in the notebook

It prints the two lines the backend needs in backend/.env:
    AI_SERVICE_URL=https://<random-name>.trycloudflare.com
    AI_SERVICE_KEY=<the key>

The key is made once and kept in .intyoza_service_key (not in git), so it stays the same every time. The address
is a free Cloudflare quick tunnel: it changes each time Colab restarts, so send the new one to the backend.
For the live platform, run `python server.py` on a server with a fixed address instead.
"""
import os
import re
import secrets
import subprocess
import threading
import time

HERE = os.path.dirname(os.path.abspath(__file__))
KEY_FILE = os.path.join(HERE, ".intyoza_service_key")
CLOUDFLARED = "/tmp/cloudflared"
CLOUDFLARED_URL = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64"


def service_key():
    """The key the backend sends as X-API-Key. A fixed key from INTYOZA_API_KEY (Kaggle: Add-ons > Secrets) is
    used when set; otherwise one is made once and kept in .intyoza_service_key."""
    if os.environ.get("INTYOZA_API_KEY"):
        return os.environ["INTYOZA_API_KEY"].strip()
    if os.path.exists(KEY_FILE):
        k = open(KEY_FILE).read().strip()
        if k:
            return k
    k = secrets.token_urlsafe(24)
    with open(KEY_FILE, "w") as f:
        f.write(k)
    return k


def _serve(app, port):
    import uvicorn
    server = uvicorn.Server(uvicorn.Config(app, host="0.0.0.0", port=port, log_level="warning"))
    threading.Thread(target=server.run, daemon=True).start()
    import requests
    for _ in range(60):
        try:
            if requests.get(f"http://127.0.0.1:{port}/health", timeout=2).ok:
                return server
        except Exception:
            pass
        time.sleep(1)
    raise RuntimeError("The AI service did not start")


def _tunnel(port, timeout=90):
    if not os.path.exists(CLOUDFLARED):
        import requests
        r = requests.get(CLOUDFLARED_URL, timeout=120)
        r.raise_for_status()
        with open(CLOUDFLARED, "wb") as f:
            f.write(r.content)
        os.chmod(CLOUDFLARED, 0o755)
    proc = subprocess.Popen([CLOUDFLARED, "tunnel", "--no-autoupdate", "--url", f"http://127.0.0.1:{port}"],
                            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    found, start = [], time.time()

    def read():
        for line in proc.stdout:              # keep reading, so the tunnel never blocks on a full pipe
            m = re.search(r"https://(?!api\.)[a-z0-9]+(?:-[a-z0-9]+)+\.trycloudflare\.com", line)
            if m and not found:
                found.append(m.group())
    threading.Thread(target=read, daemon=True).start()
    while not found and time.time() - start < timeout and proc.poll() is None:
        time.sleep(0.5)
    if not found:
        proc.terminate()
        raise RuntimeError("No public address from Cloudflare (check the internet connection and run again)")
    return found[0], proc


def _ngrok(port):
    """Fixed public address with ngrok when NGROK_AUTHTOKEN is set (free static domain in NGROK_DOMAIN)."""
    import subprocess as sp
    import sys
    sp.run([sys.executable, "-m", "pip", "-q", "install", "pyngrok"], check=True)
    from pyngrok import conf, ngrok
    conf.get_default().auth_token = os.environ["NGROK_AUTHTOKEN"].strip()
    domain = (os.environ.get("NGROK_DOMAIN") or "").strip().replace("https://", "").strip("/")
    tunnel = None
    if domain:   # newer ngrok agents take the fixed address as "url", older ones as "domain"
        for opts in ({"url": f"https://{domain}"}, {"domain": domain}):
            try:
                tunnel = ngrok.connect(port, **opts)
                break
            except Exception as e:
                print("  ngrok:", str(e).splitlines()[0][:160])
    if tunnel is None:
        tunnel = ngrok.connect(port, "http")
    return tunnel.public_url.replace("http://", "https://")


def _keep_ngrok(port, url, every=60):
    """The fixed ngrok address sometimes goes offline while the notebook still runs (ERR_NGROK_3200, 2026-11-09):
    checks the public address every minute and reconnects it when ngrok says it is offline."""
    import urllib.error
    import urllib.request
    while True:
        time.sleep(every)
        try:
            req = urllib.request.Request(url + "/health", headers={"ngrok-skip-browser-warning": "1"})
            urllib.request.urlopen(req, timeout=30).read(100)
            continue
        except urllib.error.HTTPError as e:
            if b"ERR_NGROK_3200" not in e.read(20000):
                continue                      # the service answered (with an error): the address works
        except Exception:
            continue                          # slow or busy: not a reason to drop the address
        try:
            from pyngrok import ngrok
            print("ngrok address was offline: reconnecting")
            ngrok.kill()
            _ngrok(port)
        except Exception as e:
            print("ngrok reconnect failed:", str(e).splitlines()[0][:160])


def start(chat, port=8000, public=True, info=None, stt=None):
    """Starts the AI service (the backend contract: POST /generate, GET /health) on `port`, with a public address.
    Returns (url, key)."""
    from chatbot import PlatformAdapter
    import server as server_module
    if os.environ.get("INTYOZA_API_KEY"):
        os.environ["INTYOZA_API_KEY_FROM_SECRET"] = "1"
    key = service_key()
    os.environ["INTYOZA_API_KEY"] = key
    eng = getattr(chat, "engine", None)
    info = info or {"questions": len(chat.base.qa),
                    "languageModel": eng.llm.name if eng is not None and eng.ready else None,
                    "demoData": len(eng.kb.demo) if eng is not None else 0}
    gen = getattr(getattr(eng, "llm", None), "gen", None)
    if gen is not None:          # shows in GET /health why the fine-tuning did or did not load
        d = getattr(gen, "adapter_dir", None)
        info["fineTuning"] = {"loaded": bool(getattr(gen, "adapter_loaded", False)), "folder": d,
                              "files": sorted(os.listdir(d)) if d and os.path.isdir(d) else [],
                              "error": getattr(gen, "adapter_error", None)}
    if stt is None:
        try:
            import speech
            if speech.enabled():
                stt = speech.SpeechToText()
                stt.prepare("rw")          # voice input: loads in the background, the chat starts now
        except Exception as e:
            print("Voice input not available:", e)
    try:                           # community moderation: learn from moderators' latest decisions (if set up)
        import moderation
        moderation.auto_learn(encoder=getattr(getattr(chat, "base", None), "enc", None))
    except Exception as e:
        print("Moderation learning skipped:", e)
    try:                           # unanswered questions -> the health team's private review sheet (if set up)
        import review_queue
        review_queue.install()
    except Exception as e:
        print("Review sheet not available:", e)
    _serve(server_module.create_app(PlatformAdapter(chat), info, stt=stt), port)
    url = f"http://127.0.0.1:{port}"
    fixed = bool(os.environ.get("NGROK_AUTHTOKEN"))
    if public:
        url = _ngrok(port) if fixed else _tunnel(port)[0]
        if fixed:
            threading.Thread(target=_keep_ngrok, args=(port, url), daemon=True).start()
    print("Intyoza AI service is running.\n")
    print("backend/.env (the backend as it is now, AI_PROVIDER=intyoza):\n")
    print("    AI_PROVIDER=intyoza")
    print(f"    AI_SERVICE_URL={url}")
    print("    AI_TIMEOUT_MS=120000\n")
    # The key is never printed: notebook output is saved with each version and is easy to share by mistake.
    print("Service key (for /generate, header X-API-Key):",
          "your Kaggle secret INTYOZA_API_KEY (not printed)" if os.environ.get("INTYOZA_API_KEY_FROM_SECRET")
          else f"saved in {KEY_FILE} (not printed; open that file to copy it)")
    print("Address:", "FIXED (ngrok): the same every run." if fixed else
          "temporary (Cloudflare): it changes every run. Add NGROK_AUTHTOKEN and NGROK_DOMAIN secrets for a fixed one.")
    print("Keep this notebook open: the service stops when the session stops.")
    return url, key


def test(url, key, message="Agakingirizo ni iki?"):
    """Calls the service like the backend does."""
    import requests
    r = requests.post(f"{url}/generate", headers={"X-API-Key": key}, timeout=180,
                      json={"userId": "test-user", "language": "RW", "history": [], "message": message,
                            "ageBand": "AGE_15_19"})
    r.raise_for_status()
    return r.json()
