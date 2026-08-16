"""
Test recipes for Cookie Lab.

Runs controlled baking experiments to check
whether the science engine responds correctly
to known ingredient changes.
"""

from main import analyze_cookie


# -----------------------------------
# Baseline Toll House-style cookie
# -----------------------------------

base_recipe = {

    "flour_g": 280,

    "butter_g": 113,
    "shortening_g": 0,
    "oil_g": 0,

    "white_sugar_g": 150,
    "light_brown_sugar_g": 150,
    "dark_brown_sugar_g": 0,

    "egg_g": 50,
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



# -----------------------------------
# Controlled experiments
# -----------------------------------

tests = {


    "Control": {
        **base_recipe,
    },


    # Melted butter
    "Melted Butter": {
        **base_recipe,
        "butter_state": "melted",
        "mixing_method": "stirred"
    },


    # Long chill
    "24 Hour Chill": {
        **base_recipe,
        "chill_hours": 24,
        "dough_temperature": "chilled"
    },


    # All brown sugar
    "All Brown Sugar": {
        **base_recipe,
        "white_sugar_g": 0,
        "light_brown_sugar_g": 300
    },


    # More flour
    "High Flour": {
        **base_recipe,
        "flour_g": 400
    },


    # All white sugar
    "All White Sugar": {
        **base_recipe,
        "white_sugar_g": 300,
        "light_brown_sugar_g": 0
    },


    # Baking powder
    "Baking Powder Only": {
        **base_recipe,
        "baking_soda_g": 0,
        "baking_powder_g": 5
    },


    # No egg
    "No Egg": {
        **base_recipe,
        "egg_g": 0,
        "egg_yolk_g": 0
    },


    # Double egg
    "Double Egg": {
        **base_recipe,
        "egg_g": 100,
        "egg_yolk_g": 0
    },


    # Replace butter with shortening
    "Shortening": {
        **base_recipe,
        "butter_g": 0,
        "shortening_g": 113,
        "oil_g": 0,
        "butter_state": "none"
    },


    # Replace butter with oil
    "Oil": {
        **base_recipe,
        "butter_g": 0,
        "shortening_g": 0,
        "oil_g": 113,
        "butter_state": "none"
    }

}



# -----------------------------------
# Run experiments
# -----------------------------------

for name, recipe in tests.items():

    print("\n================")
    print(name)
    print("================")


    result = analyze_cookie(recipe)


    print(
        "Brown sugar fraction:",
        result["features"]["brown_sugar_fraction"]
    )


    print(
        "White sugar fraction:",
        result["features"]["white_sugar_fraction"]
    )


    print(
        "Chill hours:",
        result["features"]["chill_hours"]
    )


    print(
        "Butter state:",
        result["features"]["butter_state"]
    )


    print("\nScience Prediction:")
    print(result["prediction"])


    print("\nML Prediction:")
    print(result["ml_prediction"])


    print("\nConfidence:")
    print(result["confidence"])


    print("\nWarnings:")
    print(result["warnings"])


    print("\nExplanations:")

    for explanation in result["explanations"]:
        print("-", explanation)