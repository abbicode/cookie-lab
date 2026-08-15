from __future__ import annotations

from pathlib import Path

import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = PROJECT_ROOT / "data"


def load_cookie_data(path: str | Path | None = None) -> pd.DataFrame:
    """Load the main cookie dataset from a file path or project data directory."""
    if path is None:
        candidates = [
            PROJECT_ROOT / "cookie_model.pkl",
            DATA_DIR / "processed" / "cookie_model.pkl",
            DATA_DIR / "interim" / "cookie_model.pkl",
            DATA_DIR / "raw" / "cookie_model.pkl",
        ]
        for candidate in candidates:
            if candidate.exists():
                path = candidate
                break
        if path is None:
            raise FileNotFoundError(
                "No cookie dataset found. Put the pickle file in project root or under data/raw/interim/processed."
            )
    df = pd.read_pickle(path)
    return df


def save_processed_data(df: pd.DataFrame, name: str = "cookie_model.pkl") -> Path:
    """Save a processed DataFrame into the processed data directory."""
    out_dir = DATA_DIR / "processed"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / name
    df.to_pickle(out_path)
    return out_path
