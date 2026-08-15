from __future__ import annotations

import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split

from src.data_processing.load_data import load_cookie_data


FEATURES = [
    "butter",
    "shortening",
    "brown_sugar",
    "granulated_sugar",
    "egg",
    "cornstarch",
    "baking_soda",
    "baking_powder",
    "vanilla",
    "chilled",
    "rested",
    "butter_melted",
    "butter_creamed",
    "bake_time",
    "oven_temp",
    "fat_flour_ratio",
    "sugar_flour_ratio",
    "brown_sugar_fraction",
]


def prepare_features(df: pd.DataFrame, target: str) -> tuple[pd.DataFrame, pd.Series, pd.DataFrame, pd.DataFrame, pd.Series, pd.Series]:
    X = df[FEATURES].copy()
    X = X.fillna(X.median())
    X = X.astype(float)

    y = df[target]
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )
    return X, y, X_train, X_test, y_train, y_test


def evaluate_logistic_regression(X_train, X_test, y_train, y_test):
    model = LogisticRegression(max_iter=1000)
    model.fit(X_train, y_train)
    preds = model.predict(X_test)
    acc = accuracy_score(y_test, preds)
    print(f"Logistic Regression Accuracy: {acc:.4f}")
    print(classification_report(y_test, preds))
    return model, preds, acc


def evaluate_random_forest(X_train, X_test, y_train, y_test):
    model = RandomForestClassifier(random_state=42)
    model.fit(X_train, y_train)
    preds = model.predict(X_test)
    acc = accuracy_score(y_test, preds)
    print(f"Random Forest Accuracy: {acc:.4f}")
    print(classification_report(y_test, preds))
    return model, preds, acc


def main():
    df = load_cookie_data()
    X, y, X_train, X_test, y_train, y_test = prepare_features(df, target="chewy")
    evaluate_logistic_regression(X_train, X_test, y_train, y_test)
    evaluate_random_forest(X_train, X_test, y_train, y_test)


if __name__ == "__main__":
    main()
