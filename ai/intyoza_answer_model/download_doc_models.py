"""Run ONCE with internet. Downloads the two models the document engine needs into base_model/:
  - Qwen2.5 1.5B Instruct (GGUF, about 1.1 GB): writes short answers from the documents
  - NLLB-200 distilled 600M (about 2.5 GB): translates between English and Kinyarwanda
Usage:  conda activate intyoza   then   python download_doc_models.py"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from huggingface_hub import hf_hub_download, snapshot_download
from doc_engine import LLM_DIR, LLM_FILE, LLM_REPO, NLLB_DIR, NLLB_REPO

os.makedirs(LLM_DIR, exist_ok=True)
if not os.path.exists(os.path.join(LLM_DIR, LLM_FILE)):
    print("Downloading the language model (about 1.1 GB)...")
    hf_hub_download(repo_id=LLM_REPO, filename=LLM_FILE, local_dir=LLM_DIR)
else:
    print("Language model already downloaded.")
if not os.path.exists(os.path.join(NLLB_DIR, "config.json")):
    print("Downloading the Kinyarwanda translator (about 2.5 GB)...")
    snapshot_download(repo_id=NLLB_REPO, local_dir=NLLB_DIR,
                      allow_patterns=["*.json", "*.model", "pytorch_model.bin", "*.safetensors"])
else:
    print("Translator already downloaded.")
print("Done. Next: put PDFs in the documents folder, then run  python build_documents.py")
