from __future__ import annotations

import pandas as pd


def describe_target_distribution(df: pd.DataFrame, target: str) -> pd.Series:
    return df[target].value_counts(normalize=True).sort_index()


def print_texture_summary(df: pd.DataFrame) -> None:
    print("Target distributions:")
    for target in ["chewy", "crispy", "soft", "thick", "structural_crispy"]:
        if target in df.columns:
            print(f"\n{target}:\n{describe_target_distribution(df, target)}")
