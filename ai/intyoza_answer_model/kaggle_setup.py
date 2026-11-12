"""Prepares a Kaggle notebook for Intyoza in one call:

    import kaggle_setup; FOLDER = kaggle_setup.setup()

Kaggle inputs are read-only, so everything is copied into a work folder (/tmp/Intyoza), in this order
(later ones win):
  1. code + matcher models  : the dataset that contains intyoza_core.py (e.g. "intyoza")
  2. trained results        : the training notebook's output folder "intyoza_outputs" (answer model, document index)
  3. latest code            : a folder "intyoza_code" (e.g. dataset "intyoza-code" from intyoza_code.zip)
  4. NEW DATA               : the "intyoza-data" dataset:
       Intyoza_Dataset.xlsx  -> knowledge/  (questions, answers, ways of asking: edit this file to add data)
       documents/*.pdf|txt   -> documents/  (new trusted documents; list them in documents/SOURCES.json)
       SOURCES.json          -> documents/
No uploads needed when these Kaggle secrets are set (they replace steps 3 and 4):
  INTYOZA_REPO      owner/repo on GitHub: the latest code of ai/intyoza_answer_model is downloaded on every run
  INTYOZA_BRANCH    branch to use (default: main)
  GITHUB_TOKEN      only for a private repo: a read-only token for that repo
  INTYOZA_SHEET_ID  the Google Sheet with the data (shared "Anyone with the link: Viewer"): downloaded on every run
It also reads the Kaggle secrets INTYOZA_API_KEY, NGROK_AUTHTOKEN and NGROK_DOMAIN (Add-ons > Secrets) into the
environment when they exist. Works outside Kaggle too (does nothing and returns the current folder).
"""
import glob
import os
import shutil

WORK = "/tmp/Intyoza"
SECRETS = ("INTYOZA_API_KEY", "NGROK_AUTHTOKEN", "NGROK_DOMAIN",
           "INTYOZA_REPO", "INTYOZA_BRANCH", "GITHUB_TOKEN", "INTYOZA_SHEET_ID",
           "INTYOZA_REVIEW_SHEET_ID", "GOOGLE_SERVICE_ACCOUNT", "INTYOZA_VARIETY")
CODE_PATH = "ai/intyoza_answer_model"
DATA_FILE = "Intyoza_Dataset.xlsx"


def _find(pattern, root):
    return sorted(glob.glob(os.path.join(root, "**", pattern), recursive=True))


def read_secrets():
    """Kaggle secrets -> environment variables (only the ones that exist). Returns their names."""
    found = []
    try:
        from kaggle_secrets import UserSecretsClient
        client = UserSecretsClient()
    except Exception:
        return found
    for name in SECRETS:
        if os.environ.get(name):
            found.append(name)
            continue
        try:
            value = client.get_secret(name)
        except Exception:
            value = None
        if value:
            os.environ[name] = value.strip()
            found.append(name)
    return found


def copy_new_data(root, work, verbose=True):
    """Copies the editable data (workbook, new documents, SOURCES.json) from the inputs into the work folder.
    Returns a short report."""
    report = {"workbook": None, "documents": []}
    def in_code(p):          # the copy that ships inside a code folder is not "new data"
        d = os.path.dirname(p)
        return any(os.path.exists(os.path.join(x, "intyoza_core.py")) for x in (d, os.path.dirname(d)))
    books = [p for p in _find(DATA_FILE, root) if not in_code(p)]
    if books:
        os.makedirs(os.path.join(work, "knowledge"), exist_ok=True)
        shutil.copy(books[0], os.path.join(work, "knowledge", DATA_FILE))
        report["workbook"] = books[0]
    for d in _find("documents", root):
        if not os.path.isdir(d) or os.path.exists(os.path.join(os.path.dirname(d), "intyoza_core.py")) \
                or os.path.basename(os.path.dirname(d)) == "intyoza_outputs":
            continue
        for f in glob.glob(os.path.join(d, "*")):
            if f.lower().endswith((".pdf", ".txt", ".md", ".json")):
                os.makedirs(os.path.join(work, "documents"), exist_ok=True)
                shutil.copy(f, os.path.join(work, "documents", os.path.basename(f)))
                report["documents"].append(os.path.basename(f))
    if verbose:
        print("New data:", report["workbook"] or "none (using the data inside the code)")
        if report["documents"]:
            print("New documents:", ", ".join(report["documents"]))
    return report


def code_from_github(work, verbose=True):
    """Latest code from GitHub (INTYOZA_REPO, INTYOZA_BRANCH, GITHUB_TOKEN) over the work folder.
    Trained models and data are not in git, so they are kept. Returns True when it worked."""
    import subprocess
    import tempfile
    repo = os.environ.get("INTYOZA_REPO", "").strip().strip("/")
    if not repo:
        return False
    branch = os.environ.get("INTYOZA_BRANCH", "").strip() or "main"
    token = os.environ.get("GITHUB_TOKEN", "").strip()
    url = f"https://{'x-access-token:' + token + '@' if token else ''}github.com/{repo}.git"
    tmp = tempfile.mkdtemp()
    r = subprocess.run(["git", "clone", "-q", "--depth", "1", "-b", branch, url, tmp], capture_output=True, text=True)
    src = os.path.join(tmp, CODE_PATH)
    if r.returncode != 0 or not os.path.exists(os.path.join(src, "chatbot.py")):
        err = (r.stderr or "").replace(token, "***") if token else (r.stderr or "")
        print(f"Code from GitHub failed ({repo} @ {branch}): {err.strip()[-200:] or CODE_PATH + ' not found'}")
        shutil.rmtree(tmp, ignore_errors=True)
        return False
    shutil.copytree(src, work, dirs_exist_ok=True, ignore=shutil.ignore_patterns(".git", "venv", "__pycache__"))
    shutil.rmtree(tmp, ignore_errors=True)
    if verbose:
        print(f"Latest code from GitHub: {repo} @ {branch}")
    return True


def data_from_sheet(work, verbose=True):
    """Downloads the Google Sheet (INTYOZA_SHEET_ID) as knowledge/Intyoza_Dataset.xlsx. Returns True when it worked."""
    sheet = os.environ.get("INTYOZA_SHEET_ID", "").strip()
    if not sheet:
        return False
    import urllib.request
    url = f"https://docs.google.com/spreadsheets/d/{sheet}/export?format=xlsx"
    target = os.path.join(work, "knowledge", DATA_FILE)
    try:
        data = urllib.request.urlopen(url, timeout=120).read()
        if not data.startswith(b"PK"):          # not an xlsx: usually the sheet is not shared by link
            raise ValueError("the sheet is not shared as 'Anyone with the link: Viewer'")
        import io
        import openpyxl
        names = openpyxl.load_workbook(io.BytesIO(data), read_only=True).sheetnames
        if "Questions" not in names:
            raise ValueError(f"no 'Questions' tab (found: {names})")
    except Exception as e:
        print("Data from Google Sheet failed:", str(e)[:200], "- using the data from the inputs")
        return False
    os.makedirs(os.path.dirname(target), exist_ok=True)
    with open(target, "wb") as f:
        f.write(data)
    if verbose:
        print(f"Data from Google Sheet ({len(data) // 1024} KB)")
    return True


def remove_old_torchao(verbose=True):
    """Kaggle ships an old torchao; recent peft refuses to load a LoRA adapter while it is installed
    ("Found an incompatible version of torchao"). Intyoza does not use torchao, so it is removed."""
    import importlib.util
    import subprocess
    import sys
    if importlib.util.find_spec("torchao") is None:
        return
    subprocess.run([sys.executable, "-m", "pip", "uninstall", "-y", "-q", "torchao"], check=False)
    if verbose:
        print("Removed torchao (an old version blocks loading the fine-tuned model)")


def setup(root="/kaggle/input", work=WORK, verbose=True):
    if not os.path.exists(root):
        return os.getcwd()
    code = _find("intyoza_core.py", root)
    assert code, "Add the input dataset 'intyoza' (Add Input > Your Work > Datasets)."

    def rank(p):  # prefer the input with the most training done
        d = os.path.dirname(p)
        return (os.path.isdir(os.path.join(d, "models", "intyoza_writer")),
                os.path.isdir(os.path.join(d, "models", "intyoza_matcher")))
    if not os.path.exists(os.path.join(work, "intyoza_core.py")):
        shutil.copytree(os.path.dirname(max(code, key=rank)), work, dirs_exist_ok=True)
        for out in _find("intyoza_outputs", root):
            if os.path.isdir(out):
                shutil.copytree(out, work, dirs_exist_ok=True)
                if verbose:
                    print("Trained results from", out)
    for part in ("intyoza_matcher", "intyoza_writer", "doc_index"):    # models uploaded separately
        if not os.path.exists(os.path.join(work, "models", part)):
            found = [d for d in _find(part, root) if os.path.isdir(d)]
            if found:
                shutil.copytree(os.path.dirname(found[0]), os.path.join(work, "models"), dirs_exist_ok=True)
    # The trained answer model is saved by the training notebook as intyoza_writer.zip (its folder copy can be
    # empty): unzip the newest one over models/intyoza_writer, so the fine-tuned model is always used.
    zips = [z for z in _find("intyoza_writer.zip", root) if "intyoza_outputs" in z]
    marker = os.path.join(work, "models", "intyoza_writer", ".from_zip")
    if zips and not os.path.exists(marker):
        import zipfile
        z = max(zips, key=os.path.getmtime)
        target = os.path.join(work, "models", "intyoza_writer")
        shutil.rmtree(target, ignore_errors=True)
        with zipfile.ZipFile(z) as f:
            f.extractall(os.path.join(work, "models"))
        if os.path.exists(os.path.join(target, "adapter_config.json")):
            open(marker, "w").write(z)
            if verbose:
                print("Trained answer model from", z)
    secrets = read_secrets()
    if verbose and secrets:
        print("Secrets:", ", ".join(secrets))
    if not code_from_github(work, verbose):
        latest = [p for p in _find("chatbot.py", root) if os.path.basename(os.path.dirname(p)) == "intyoza_code"]
        if latest:
            shutil.copytree(os.path.dirname(latest[0]), work, dirs_exist_ok=True)
            if verbose:
                print("Latest code from", os.path.dirname(latest[0]))
    copy_new_data(root, work, verbose)
    data_from_sheet(work, verbose)          # the Google Sheet wins over the intyoza-data upload
    remove_old_torchao(verbose)
    os.chdir(work)
    import sys
    if work not in sys.path:
        sys.path.insert(0, work)
    return work
