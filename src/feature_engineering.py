"""
Feature engineering for Cookie Lab.

This module converts raw cookie recipe inputs into standardized
"Cookie DNA" features that can later be used by the science engine
and machine learning models.
"""


# Helper functions for feature engineering
def safe_divide(numerator, denominator):
    if denominator in (0, None):
        return 0.0
    return numerator / denominator



# Main feature engineering function
def engineer_cookie_features(recipe: dict) -> dict:

    # --------------------------------------------------
    # 1. Get raw ingredients
    # --------------------------------------------------

    flour_g = recipe.get("flour_g", 0)

    butter_g = recipe.get("butter_g", 0)
    shortening_g = recipe.get("shortening_g", 0)
    oil_g = recipe.get("oil_g", 0)

    white_sugar_g = recipe.get("white_sugar_g", 0)
    light_brown_sugar_g = recipe.get("light_brown_sugar_g", 0)
    dark_brown_sugar_g = recipe.get("dark_brown_sugar_g", 0)

    egg_g = recipe.get("egg_g", 0)
    egg_yolk_g = recipe.get("egg_yolk_g", 0)

    baking_soda_g = recipe.get("baking_soda_g", 0)
    baking_powder_g = recipe.get("baking_powder_g", 0)

    cornstarch_g = recipe.get("cornstarch_g", 0)
    chocolate_g = recipe.get("chocolate_g", 0)


    # --------------------------------------------------
    # 2. Calculate totals
    # --------------------------------------------------

    total_fat_g = (
        butter_g 
        + shortening_g 
        + oil_g
    )

    total_brown_sugar_g = (
        light_brown_sugar_g 
        + dark_brown_sugar_g
    )

    total_sugar_g = (
        white_sugar_g 
        + total_brown_sugar_g
    )

    total_leavener_g = (
        baking_soda_g 
        + baking_powder_g
    )


    # --------------------------------------------------
    # 3. Calculate ratios
    # --------------------------------------------------

    fat_flour_ratio = safe_divide(
        total_fat_g,
        flour_g
    )

    butter_flour_ratio = safe_divide(
        butter_g,
        flour_g
    )

    sugar_flour_ratio = safe_divide(
        total_sugar_g,
        flour_g
    )


    brown_sugar_fraction = safe_divide(
        total_brown_sugar_g,
        total_sugar_g
    )

    white_sugar_fraction = safe_divide(
        white_sugar_g,
        total_sugar_g
    )


    egg_flour_ratio = safe_divide(
        egg_g,
        flour_g
    )

    yolk_flour_ratio = safe_divide(
        egg_yolk_g,
        flour_g
    )


    soda_flour_ratio = safe_divide(
        baking_soda_g,
        flour_g
    )

    powder_flour_ratio = safe_divide(
        baking_powder_g,
        flour_g
    )


    cornstarch_flour_ratio = safe_divide(
        cornstarch_g,
        flour_g
    )

    chocolate_flour_ratio = safe_divide(
        chocolate_g,
        flour_g
    )


    leavener_flour_ratio = safe_divide(
        total_leavener_g,
        flour_g
    )


    # --------------------------------------------------
    # 4. Process features
    # --------------------------------------------------

    butter_state = recipe.get(
        "butter_state",
        "unknown"
    ).lower().strip()


    flour_type = recipe.get(
        "flour_type",
        "unknown"
    ).lower().strip()


    mixing_method = recipe.get(
        "mixing_method",
        "unknown"
    ).lower().strip()


    dough_temperature = recipe.get(
        "dough_temperature",
        "unknown"
    ).lower().strip()


    chill_hours = recipe.get(
        "chill_hours",
        0
    )

    bake_temp_f = recipe.get(
        "bake_temp_f",
        0
    )

    bake_time_min = recipe.get(
        "bake_time_min",
        0
    )

    cookie_size_g = recipe.get(
        "cookie_size_g",
        0
    )


    # Boolean features

    has_shortening = shortening_g > 0
    has_oil = oil_g > 0
    has_butter = butter_g > 0


    has_baking_soda = baking_soda_g > 0
    has_baking_powder = baking_powder_g > 0


    uses_both_leaveners = (
        has_baking_soda 
        and has_baking_powder
    )


    is_chilled = chill_hours > 0

    is_melted_butter = (
        butter_state == "melted"
    )

    is_browned_butter = (
        butter_state == "browned"
    )

    is_creamed = (
        mixing_method == "creamed"
    )


    # --------------------------------------------------
    # 5. Return Cookie DNA
    # --------------------------------------------------

    return {

        # ==========================
        # Raw ingredient values
        # ==========================

        "flour_g": flour_g,

        "butter_g": butter_g,
        "shortening_g": shortening_g,
        "oil_g": oil_g,

        "white_sugar_g": white_sugar_g,
        "light_brown_sugar_g": light_brown_sugar_g,
        "dark_brown_sugar_g": dark_brown_sugar_g,

        "egg_g": egg_g,
        "egg_yolk_g": egg_yolk_g,

        "baking_soda_g": baking_soda_g,
        "baking_powder_g": baking_powder_g,

        "cornstarch_g": cornstarch_g,
        "chocolate_g": chocolate_g,


        # ==========================
        # Calculated totals
        # ==========================

        "total_fat_g": total_fat_g,
        "total_sugar_g": total_sugar_g,
        "total_brown_sugar_g": total_brown_sugar_g,
        "total_leavener_g": total_leavener_g,


        # ==========================
        # Ratios
        # ==========================

        "fat_flour_ratio": fat_flour_ratio,
        "butter_flour_ratio": butter_flour_ratio,

        "sugar_flour_ratio": sugar_flour_ratio,

        "brown_sugar_fraction": brown_sugar_fraction,
        "white_sugar_fraction": white_sugar_fraction,

        "egg_flour_ratio": egg_flour_ratio,
        "yolk_flour_ratio": yolk_flour_ratio,

        "soda_flour_ratio": soda_flour_ratio,
        "powder_flour_ratio": powder_flour_ratio,

        "cornstarch_flour_ratio": cornstarch_flour_ratio,
        "chocolate_flour_ratio": chocolate_flour_ratio,

        "leavener_flour_ratio": leavener_flour_ratio,


        # ==========================
        # Process variables
        # ==========================

        "butter_state": butter_state,
        "flour_type": flour_type,
        "mixing_method": mixing_method,
        "dough_temperature": dough_temperature,

        "chill_hours": chill_hours,

        "bake_temp_f": bake_temp_f,
        "bake_time_min": bake_time_min,

        "cookie_size_g": cookie_size_g,


        # ==========================
        # Boolean features
        # ==========================

        "has_shortening": has_shortening,
        "has_oil": has_oil,
        "has_butter": has_butter,

        "has_baking_soda": has_baking_soda,
        "has_baking_powder": has_baking_powder,

        "uses_both_leaveners": uses_both_leaveners,

        "is_chilled": is_chilled,

        "is_melted_butter": is_melted_butter,
        "is_browned_butter": is_browned_butter,

        "is_creamed": is_creamed,
    }



# --------------------------------------------------
# Test
# --------------------------------------------------

if __name__ == "__main__":

    sample_recipe = {

        "flour_g": 280,

        "butter_g": 113,
        "shortening_g": 0,
        "oil_g": 0,

        "white_sugar_g": 150,
        "light_brown_sugar_g": 150,
        "dark_brown_sugar_g": 0,

        "egg_g": 68,
        "egg_yolk_g": 0,

        "baking_soda_g": 4.6,
        "baking_powder_g": 0,

        "cornstarch_g": 0,
        "chocolate_g": 170,


        "butter_state": "softened",
        "flour_type": "ap",
        "mixing_method": "creamed",

        "chill_hours": 0,
        "dough_temperature": "room",

        "bake_temp_f": 350,
        "bake_time_min": 10,

        "cookie_size_g": 30
    }


    features = engineer_cookie_features(sample_recipe)

    print(features)