"""Chat with Intyoza in the terminal. Fully offline once the model is trained (1_Train.ipynb).
Usage:  conda activate intyoza   then   python chat.py
Options:
  --debug       show language, intent, risk and match scores for every message
  --bilingual   answer English messages in English (default: always Kinyarwanda)
  --no-docs     do not use the documents (faster start)
  --age 10-14   age group for the answers (10-14, 15-19 or 20-24; default 15-19)"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from intyoza_core import load_bot, run_chat  # noqa: E402


def arg_value(name, default):
    if name in sys.argv:
        i = sys.argv.index(name)
        if i + 1 < len(sys.argv):
            return sys.argv[i + 1]
    return default


if __name__ == "__main__":
    models = os.path.join(HERE, "models")
    if not os.path.exists(os.path.join(models, "intyoza_heads.joblib")):
        sys.exit("No trained models yet. Run 1_Train.ipynb first (or unzip intyoza_models.zip here).")
    age = arg_value("--age", "15-19")
    if age not in ("10-14", "15-19", "20-24"):
        sys.exit("--age must be 10-14, 15-19 or 20-24")
    print("Loading Intyoza...")
    bot = load_bot(models, HERE, age_group=age,
                   reply_lang="auto" if "--bilingual" in sys.argv else "rw",
                   use_documents="--no-docs" not in sys.argv)
    run_chat(bot, unanswered_csv=os.path.join(HERE, "intyoza_unanswered.csv"), debug="--debug" in sys.argv)
