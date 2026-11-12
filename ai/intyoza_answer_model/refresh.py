"""Retrain the small models (risk, intent, language, safety) after changes to the data, keeping the trained
matcher. No GPU needed: about 5 to 10 minutes on a laptop. Same as step 19 of 1_Train.ipynb.
Usage:  conda activate intyoza   then   python refresh.py"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from intyoza_core import refresh_small_models  # noqa: E402

if __name__ == "__main__":
    if not os.path.exists(os.path.join(HERE, "models", "intyoza_matcher")):
        sys.exit("No trained matcher in models\\intyoza_matcher. Unzip intyoza_models.zip here first.")
    refresh_small_models(HERE)
