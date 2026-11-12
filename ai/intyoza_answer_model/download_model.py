"""Run ONCE with internet, only for training or chatting offline on the laptop.
Saves the base model inside this folder (base_model/e5-large-instruct, about 2.2 GB):
multilingual-e5-large-instruct (Microsoft, MIT licence). Add --labse to also save LaBSE for comparison.
Usage:  conda activate intyoza   then   python download_model.py"""
import os
import sys

from sentence_transformers import SentenceTransformer

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from intyoza_core import BASE_MODEL_DIR, BASE_MODEL_ID  # noqa: E402

models = [(BASE_MODEL_ID, BASE_MODEL_DIR)] + ([("sentence-transformers/LaBSE", "LaBSE")] if "--labse" in sys.argv else [])
for repo, name in models:
    target = os.path.join(HERE, "base_model", name)
    if os.path.exists(os.path.join(target, "config.json")):
        print("Already downloaded:", target)
        continue
    print(f"Downloading {repo}, please wait...")
    SentenceTransformer(repo).save(target)
    print("Saved to", target)
print("Done. Training and chat can now run offline.")
