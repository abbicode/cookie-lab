"""
Machine learning prediction layer for Cookie Lab.

Loads trained Random Forest models and predicts
texture probabilities from Cookie DNA features.

Models:
- chewy
- structural crispy
- soft
- thick
"""

import joblib
import pandas as pd
import os


# ----------------------------------
# Load models
# ----------------------------------

MODEL_PATH = "models"


chewy_model = joblib.load(
    os.path.join(
        MODEL_PATH,
        "chewy_random_forest.pkl"
    )
)


crispy_model = joblib.load(
    os.path.join(
        MODEL_PATH,
        "structural_crispy_random_forest.pkl"
    )
)


soft_model = joblib.load(
    os.path.join(
        MODEL_PATH,
        "soft_random_forest.pkl"
    )
)


thick_model = joblib.load(
    os.path.join(
        MODEL_PATH,
        "thick_random_forest.pkl"
    )
)



# ----------------------------------
# Feature order
# MUST match training
# ----------------------------------

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
    "oven_temp"
]



# ----------------------------------
# Convert Cookie Lab features
# into ML format
# ----------------------------------

def prepare_ml_features(features):
    """
    Convert engineered Cookie DNA
    into dataframe expected by models.
    """

    ml_features = {

        "butter": int(
            features.get(
                "has_butter",
                False
            )
        ),

        "shortening": int(
            features.get(
                "has_shortening",
                False
            )
        ),

        "brown_sugar": features.get(
            "total_brown_sugar_g",
            0
        ),

        "granulated_sugar": (
            features.get(
                "total_sugar_g",
                0
            )
            -
            features.get(
                "total_brown_sugar_g",
                0
            )
        ),

        "egg": int(
            features.get(
                "egg_flour_ratio",
                0
            ) > 0
        ),

        "cornstarch": int(
            features.get(
                "cornstarch_flour_ratio",
                0
            ) > 0
        ),

        "baking_soda": int(
            features.get(
                "has_baking_soda",
                False
            )
        ),

        "baking_powder": int(
            features.get(
                "has_baking_powder",
                False
            )
        ),

        "vanilla": int(
            features.get(
                "has_vanilla",
                False
            )
        ),

        "chilled": int(
            features.get(
                "is_chilled",
                False
            )
        ),

        "rested": int(
            features.get(
                "chill_hours",
                0
            ) > 0
        ),

        "butter_melted": int(
            features.get(
                "is_melted_butter",
                False
            )
        ),

        "butter_creamed": int(
            features.get(
                "is_creamed",
                False
            )
        ),

        "bake_time": features.get(
            "bake_time_min",
            10
        ),

        "oven_temp": features.get(
            "bake_temp_f",
            350
        )

    }


    df = pd.DataFrame(
        [ml_features]
    )


    return df[FEATURES]



# ----------------------------------
# Prediction function
# ----------------------------------

def predict_ml(features):
    """
    Run all ML models.

    Returns:
    - probability of each texture
    - predicted labels
    """

    X = prepare_ml_features(features)


    results = {}


    models = {
        "chewy": chewy_model,
        "crispy": crispy_model,
        "soft": soft_model,
        "thick": thick_model
    }


    for name, model in models.items():

        probability = model.predict_proba(X)[0][1]

        prediction = model.predict(X)[0]


        results[name] = {

            "prediction": bool(prediction),

            "probability": round(
                float(probability),
                3
            )

        }


    return results



# ----------------------------------
# Test
# ----------------------------------

if __name__ == "__main__":

    example_features = {

        "has_butter": True,
        "has_shortening": False,

        "total_brown_sugar_g": 150,
        "total_sugar_g": 300,

        "egg_flour_ratio": 0.2,

        "has_baking_soda": True,
        "has_baking_powder": False,

        "cornstarch_flour_ratio": 0,

        "is_chilled": True,
        "chill_hours": 24,

        "is_melted_butter": False,
        "is_creamed": True,

        "bake_time_min": 10,
        "bake_temp_f": 350

    }


    print(
        predict_ml(example_features)
    )