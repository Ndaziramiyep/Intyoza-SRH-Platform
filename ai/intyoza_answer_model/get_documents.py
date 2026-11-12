"""Downloads the trusted Rwandan documents listed in documents/SOURCES.json (entries with a "url") into documents/.

    python get_documents.py            (or get_documents.download() from a notebook)

Only official publications are listed (Rwanda Ministry of Health, RBC, MIGEPROF; WHO, UNFPA, UNESCO, UNICEF).
Each file is checked to be a real PDF before it is kept. After downloading, rebuild the document index
(prepare() does both; 4_Train_Answer_Model_Colab.ipynb step 3 runs it)."""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
DOC_DIR = os.path.join(HERE, "documents")


def sources(doc_dir=DOC_DIR):
    with open(os.path.join(doc_dir, "SOURCES.json"), encoding="utf-8") as f:
        return json.load(f)


def download(doc_dir=DOC_DIR, verbose=True):
    """Returns a list of (file, status). Files already present are kept."""
    import requests
    out = []
    for it in sources(doc_dir):
        path = os.path.join(doc_dir, it["file"])
        if os.path.exists(path):
            out.append((it["file"], "already here"))
            continue
        if not it.get("url"):
            out.append((it["file"], "missing (no download link: add the file by hand)"))
            continue
        try:
            r = requests.get(it["url"], timeout=120, headers={"User-Agent": "Mozilla/5.0 (Intyoza document download)"})
            r.raise_for_status()
            if not r.content.startswith(b"%PDF"):
                raise ValueError("the link did not return a PDF")
            with open(path, "wb") as f:
                f.write(r.content)
            out.append((it["file"], f"downloaded ({len(r.content) / 1e6:.1f} MB)"))
        except Exception as e:
            out.append((it["file"], f"FAILED: {type(e).__name__}: {str(e)[:120]}. Download it by hand: {it['url']}"))
    if verbose:
        for f, st in out:
            print(f"  {f}: {st}")
    return out


def prepare(encoder, doc_dir=DOC_DIR, index_dir=None):
    """Downloads the listed documents, then (re)builds the document index when a document is not in it yet.
    Returns True when the index was rebuilt."""
    import doc_engine
    index_dir = index_dir or doc_engine.INDEX_DIR
    download(doc_dir)
    files = doc_engine.list_documents(doc_dir)
    indexed = set()
    if doc_engine.DocEngine.available(index_dir):
        with open(os.path.join(index_dir, "passages.json"), encoding="utf-8") as f:
            indexed = {p["source"] for p in json.load(f)}
    missing = [f for f in files if doc_engine.title_of(f) not in indexed]
    if not missing:
        print(f"Document index is up to date: {len(files)} documents.")
        return False
    if not indexed:                                   # no index yet: build it from every document
        print("Building the document index:", ", ".join(files))
        passages, report = doc_engine.prepare_corpus(doc_dir)
        doc_engine.save_index(doc_engine.encode_passages(encoder, passages), passages, index_dir, report)
        print(report.to_string(index=False))
        return True
    # An index exists: ADD the new documents to it. Documents already indexed stay, even when their file
    # is not in this folder (the PDFs are large and not always copied).
    import shutil
    import tempfile
    import numpy as np
    print("Adding to the document index:", ", ".join(missing))
    with tempfile.TemporaryDirectory() as tmp:
        for f in missing:
            shutil.copy(os.path.join(doc_dir, f), os.path.join(tmp, f))
        new, report = doc_engine.prepare_corpus(tmp)
    if not new:
        print("  no readable text in the new documents")
        return False
    old_vecs = np.load(os.path.join(index_dir, "vectors.npy"))
    with open(os.path.join(index_dir, "passages.json"), encoding="utf-8") as f:
        old = json.load(f)
    vecs = np.concatenate([old_vecs, doc_engine.encode_passages(encoder, new)])
    doc_engine.save_index(vecs, old + new, index_dir)
    print(report.to_string(index=False))
    print(f"Document index: {len(old)} + {len(new)} passages")
    return True


if __name__ == "__main__":
    download()
