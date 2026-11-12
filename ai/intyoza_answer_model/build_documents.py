"""Read every PDF/TXT/MD file in documents/ and build the search index. Offline.
Run again whenever you add or remove documents.
Usage:  conda activate intyoza   then   python build_documents.py"""
import os
import sys

os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from sentence_transformers import SentenceTransformer  # noqa: E402
from doc_engine import build_index, list_documents, DOC_DIR  # noqa: E402

if __name__ == "__main__":
    matcher = os.path.join(HERE, "models", "intyoza_matcher")
    if not os.path.exists(matcher):
        sys.exit("Train the model first (1_Train.ipynb), so models/intyoza_matcher exists.")
    print(len(list_documents(DOC_DIR)), "documents found. Reading them (large PDFs take a few minutes)...")
    build_index(SentenceTransformer(matcher))
    print("Now chat:  python chat.py   (documents are used when no approved answer matches)")
