from feature_engineering import engineer_cookie_features
# Tests for Cookie Lab feature engineering
#
# This file checks that feature_engineering.py correctly converts
# raw cookie recipe ingredients into Cookie DNA features.
#
# It tests:
# - Ingredient ratios are calculated correctly
# - Brown vs. white sugar fractions are correct
# - Process features like chilling and creaming are detected correctly
# - Missing or zero values do not cause errors
#
# These tests make sure the Cookie DNA is reliable before it is
# passed into the cookie science prediction engine.

def test_basic_recipe():
    recipe = {
        "flour_g": 280,
        "butter_g": 170,
        "shortening_g": 0,
        "oil_g": 0,
        "white_sugar_g": 100,
        "light_brown_sugar_g": 150,
        "dark_brown_sugar_g": 0,
        "egg_g": 68,
        "egg_yolk_g": 0,
        "baking_soda_g": 4.6,
        "baking_powder_g": 0,
        "cornstarch_g": 0,
        "chocolate_g": 180,
        "butter_state": "softened",
        "flour_type": "ap",
        "mixing_method": "creamed",
        "chill_hours": 2,
        "dough_temperature": "chilled",
        "bake_temp_f": 350,
        "bake_time_min": 12,
        "cookie_size_g": 55
    }

    features = engineer_cookie_features(recipe)

    assert round(features["fat_flour_ratio"], 3) == 0.607
    assert round(features["sugar_flour_ratio"], 3) == 0.893
    assert features["brown_sugar_fraction"] == 0.6
    assert features["white_sugar_fraction"] == 0.4

    assert features["is_chilled"] is True
    assert features["is_melted_butter"] is False
    assert features["is_creamed"] is True

    print("Basic recipe test passed.")


def test_zero_flour():
    recipe = {
        "flour_g": 0,
        "butter_g": 100,
        "white_sugar_g": 100
    }

    features = engineer_cookie_features(recipe)

    assert features["fat_flour_ratio"] == 0.0
    assert features["sugar_flour_ratio"] == 0.0

    print("Zero-flour safety test passed.")


if __name__ == "__main__":
    test_basic_recipe()
    test_zero_flour()
    print("All feature engineering tests passed.")


