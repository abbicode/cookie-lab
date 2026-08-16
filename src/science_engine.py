"""
Cookie Lab Science Engine

This engine converts Cookie DNA features into predicted cookie
characteristics using experimental baking evidence stored in:

data/cookie_science_rules.csv

The CSV contains controlled experiments, comparisons, mechanisms,
and confidence levels collected from baking science sources.
Outputs:
- Spread
- Thickness
- Chewiness
- Softness
- Crispness
- Cakiness
- Browning

Scores are relative (0-100), not physical measurements.
"""




from pyexpat import features

import pandas as pd
from feature_engineering import engineer_cookie_features


# --------------------------------------------------
# Science weighting system
# --------------------------------------------------

# Qualitative evidence strength → numerical effect size
#
# Weak effect:
#   small evidence or observational result
#
# Moderate effect:
#   repeated evidence or reasonable mechanism
#
# Strong effect:
#   controlled experiments or strong agreement
#
# These are model weights, not physical measurements.

STRENGTH_WEIGHTS = {
    "weak": 3,
    "moderate": 6,
    "strong": 12,
}


# --------------------------------------------------
# Load science rules
# --------------------------------------------------

def load_science_rules(filepath="data/cookie_science_rules.csv"):
    """
    Load baking experiment rules from CSV.
    """
    rules = pd.read_csv(filepath)
    return rules



# --------------------------------------------------
# Create baseline cookie phenotype
# --------------------------------------------------

def create_baseline_scores():
    """
    Start every cookie at a neutral midpoint.

    50 = average/reference cookie.
    Effects from ingredients and processes adjust scores.
    """

    return {
        "spread": 50.0,
        "thickness": 50.0,
        "chewiness": 50.0,
        "softness": 50.0,
        "crispness": 50.0,
        "cakiness": 50.0,
        "browning": 50.0,
        "flavor_depth": 50.0
    }



# --------------------------------------------------
# Keep scores between 0 and 100
# --------------------------------------------------

def clamp_score(value):
    return max(0, min(100, value))



# --------------------------------------------------
# Apply effects
# --------------------------------------------------

def apply_butter_effects(scores, features):
    """
    Apply butter state effects from baking experiments.

    Melted butter:
    - increases spread
    - decreases thickness
    - creates denser/fudgier cookies

    Cold butter:
    - reduces spread
    - increases thickness

    Softened butter:
    - reference condition
    """

    butter_state = features.get("butter_state", "unknown")


    if butter_state == "melted":

        scores["spread"] += STRENGTH_WEIGHTS["strong"]
        scores["thickness"] -= STRENGTH_WEIGHTS["strong"]

        scores["softness"] += STRENGTH_WEIGHTS["moderate"]
        scores["crispness"] += STRENGTH_WEIGHTS["moderate"]

        scores["cakiness"] -= STRENGTH_WEIGHTS["moderate"]


    elif butter_state == "cold":

        scores["spread"] -= STRENGTH_WEIGHTS["strong"]
        scores["thickness"] += STRENGTH_WEIGHTS["strong"]

        scores["softness"] += STRENGTH_WEIGHTS["weak"]


    return scores


def apply_sugar_effects(scores, features):
    """
    Apply sugar composition effects.

    White sugar:
    - less moisture
    - more spread
    - more crispness
    - less softness

    Brown sugar:
    - more moisture from molasses
    - softer and chewier
    - less crisp
    - slightly less spread
    """

    brown_fraction = features.get("brown_sugar_fraction", 0)
    white_fraction = features.get("white_sugar_fraction", 0)


    # Mostly white sugar
    if white_fraction >= 0.75:

        scores["spread"] += STRENGTH_WEIGHTS["moderate"]
        scores["crispness"] += STRENGTH_WEIGHTS["strong"]

        scores["softness"] -= STRENGTH_WEIGHTS["moderate"]
        scores["chewiness"] -= STRENGTH_WEIGHTS["weak"]

        scores["browning"] -= STRENGTH_WEIGHTS["weak"]


    # Mostly brown sugar
    elif brown_fraction >= 0.75:

        scores["softness"] += STRENGTH_WEIGHTS["strong"]
        scores["chewiness"] += STRENGTH_WEIGHTS["strong"]

        scores["crispness"] -= STRENGTH_WEIGHTS["moderate"]

        scores["spread"] -= STRENGTH_WEIGHTS["weak"]

        scores["browning"] += STRENGTH_WEIGHTS["moderate"]
        scores["flavor_depth"] += STRENGTH_WEIGHTS["moderate"]

    # Balanced brown + white sugar
    elif 0.4 <= brown_fraction <= 0.6:

        scores["softness"] += STRENGTH_WEIGHTS["weak"]
        scores["chewiness"] += STRENGTH_WEIGHTS["weak"]

        scores["crispness"] += STRENGTH_WEIGHTS["weak"]


    return scores

def apply_chill_effects(scores, features):
    chill_hours = features.get("chill_hours", 0)

    if chill_hours >= 24:
        scores["spread"] -= 12
        scores["thickness"] += 12
        scores["chewiness"] += 6
        scores["flavor_depth"] += 6

    elif chill_hours >= 2:
        scores["spread"] -= 6
        scores["thickness"] += 6

    elif chill_hours == 0:
        scores["spread"] += 3

    return scores

def apply_flour_effects(scores, features):
    """
    More flour increases structure and reduces spread.

    Evidence:
    - Handle the Heat: large flour increase created thick,
      low-spread, crumbly cookies.
    - Kitchen Sanctuary: +15% flour reduced spread and softness.
    """

    flour_g = features.get("flour_g", 0)

    # Approximate based on Toll House baseline (~280g)
    if flour_g >= 320:
        scores["spread"] -= STRENGTH_WEIGHTS["strong"]
        scores["thickness"] += STRENGTH_WEIGHTS["strong"]
        scores["softness"] -= STRENGTH_WEIGHTS["moderate"]
        scores["cakiness"] += STRENGTH_WEIGHTS["moderate"]


    elif flour_g <= 230:
        scores["spread"] += STRENGTH_WEIGHTS["strong"]
        scores["thickness"] -= STRENGTH_WEIGHTS["strong"]
        scores["crispness"] += STRENGTH_WEIGHTS["moderate"]


    return scores

def apply_egg_effects(scores, features):
    """
    Eggs provide water, protein, fat, and emulsification.

    More egg:
    - increases structure
    - increases softness
    - can push cookies toward cake-like texture

    Too little egg:
    - reduces cohesion
    - creates crumbly cookies
    """

    egg_ratio = features.get("egg_flour_ratio", 0)


    # Too much egg
    if egg_ratio >= 0.35:
        scores["thickness"] += STRENGTH_WEIGHTS["moderate"]
        scores["softness"] += STRENGTH_WEIGHTS["moderate"]
        scores["cakiness"] += STRENGTH_WEIGHTS["strong"]
        scores["crispness"] -= STRENGTH_WEIGHTS["moderate"]


    # Too little egg
    elif egg_ratio <= 0.1:
        scores["chewiness"] -= STRENGTH_WEIGHTS["moderate"]
        scores["softness"] -= STRENGTH_WEIGHTS["moderate"]
        scores["crispness"] += STRENGTH_WEIGHTS["moderate"]


    return scores

def apply_leavener_effects(scores, features):
    """
    Baking powder creates lift.
    Baking soda encourages spread and browning.
    """

    soda = features.get("has_baking_soda", False)
    powder = features.get("has_baking_powder", False)


    if powder and not soda:
        scores["thickness"] += STRENGTH_WEIGHTS["strong"]
        scores["cakiness"] += STRENGTH_WEIGHTS["strong"]
        scores["spread"] -= STRENGTH_WEIGHTS["moderate"]


    elif soda and not powder:
        scores["spread"] += STRENGTH_WEIGHTS["weak"]
        scores["browning"] += STRENGTH_WEIGHTS["moderate"]
        scores["crispness"] += STRENGTH_WEIGHTS["moderate"]


    elif soda and powder:
        scores["spread"] += STRENGTH_WEIGHTS["weak"]
        scores["thickness"] += STRENGTH_WEIGHTS["weak"]
        scores["softness"] += STRENGTH_WEIGHTS["weak"]


    return scores

def apply_fat_type_effects(scores, features):
    """
    Different fats change melting behavior and water content.

    Butter:
    - lower melting point
    - more spread
    - more flavor

    Shortening:
    - higher melting point
    - better structure

    Oil:
    - already liquid
    - increases spread
    """

    has_shortening = features.get("has_shortening", False)
    has_oil = features.get("has_oil", False)


    if has_shortening:
        scores["spread"] -= STRENGTH_WEIGHTS["moderate"]
        scores["thickness"] += STRENGTH_WEIGHTS["moderate"]
        scores["softness"] += STRENGTH_WEIGHTS["weak"]


    if has_oil:
        scores["spread"] += STRENGTH_WEIGHTS["strong"]
        scores["thickness"] -= STRENGTH_WEIGHTS["moderate"]
        scores["softness"] += STRENGTH_WEIGHTS["moderate"]


    return scores

def apply_total_sugar_effects(scores, features):
    """
    Total sugar affects spread, browning, and crispness.

    More sugar:
    - increases spread
    - increases browning
    - increases crispness
    """

    sugar_ratio = features.get("sugar_flour_ratio", 0)


    # High sugar relative to flour
    if sugar_ratio >= 1.0:
        scores["spread"] += STRENGTH_WEIGHTS["moderate"]
        scores["crispness"] += STRENGTH_WEIGHTS["moderate"]
        scores["browning"] += STRENGTH_WEIGHTS["moderate"]


    # Low sugar relative to flour
    elif sugar_ratio <= 0.5:
        scores["spread"] -= STRENGTH_WEIGHTS["moderate"]
        scores["crispness"] -= STRENGTH_WEIGHTS["moderate"]
        scores["browning"] -= STRENGTH_WEIGHTS["weak"]


    return scores

def apply_brown_butter_effects(scores, features):
    """
    Brown butter removes water and adds nutty/toffee flavors.

    Effects:
    - increases browning/flavor
    - can reduce softness if water is not replaced
    """

    butter_state = features.get("butter_state", "unknown")

    if butter_state == "browned":

        scores["browning"] += STRENGTH_WEIGHTS["moderate"]
        scores["softness"] -= STRENGTH_WEIGHTS["weak"]
        scores["flavor_depth"] += STRENGTH_WEIGHTS["strong"]


    return scores


def apply_yolk_effects(scores, features):
    """
    Egg yolks add fat and emulsifiers.

    Effects:
    - richer
    - chewier
    - softer
    - less cakey
    """

    yolk_ratio = features.get("yolk_flour_ratio", 0)


    if yolk_ratio >= 0.08:

        scores["chewiness"] += STRENGTH_WEIGHTS["moderate"]
        scores["softness"] += STRENGTH_WEIGHTS["moderate"]
        scores["cakiness"] -= STRENGTH_WEIGHTS["weak"]


    return scores

def apply_cornstarch_effects(scores, features):
    """
    Cornstarch reduces gluten formation.

    Effects:
    - softer
    - more tender
    - slightly thicker
    """

    cornstarch_ratio = features.get("cornstarch_flour_ratio", 0)


    if cornstarch_ratio >= 0.05:

        scores["softness"] += STRENGTH_WEIGHTS["moderate"]
        scores["thickness"] += STRENGTH_WEIGHTS["weak"]
        scores["chewiness"] -= STRENGTH_WEIGHTS["weak"]


    return scores

def apply_flour_type_effects(scores, features):
    """
    Flour protein affects gluten development.

    Bread flour:
    - more protein
    - potentially more chew

    Cake flour:
    - less protein
    - softer/more delicate
    """

    flour_type = features.get("flour_type", "unknown")


    if flour_type == "bread":

        scores["chewiness"] += STRENGTH_WEIGHTS["moderate"]
        scores["softness"] -= STRENGTH_WEIGHTS["weak"]


    elif flour_type == "cake":

        scores["softness"] += STRENGTH_WEIGHTS["moderate"]
        scores["chewiness"] -= STRENGTH_WEIGHTS["weak"]
        scores["cakiness"] += STRENGTH_WEIGHTS["weak"]


    return scores

def apply_mixing_effects(scores, features):
    """
    Creaming incorporates air.

    Melted/stirred dough:
    - denser
    - fudgier
    """

    mixing = features.get("mixing_method", "unknown")


    if mixing == "creamed":

        scores["cakiness"] += STRENGTH_WEIGHTS["weak"]
        scores["thickness"] += STRENGTH_WEIGHTS["weak"]


    elif mixing == "stirred":

        scores["softness"] += STRENGTH_WEIGHTS["moderate"]
        scores["cakiness"] -= STRENGTH_WEIGHTS["weak"]


    return scores

def apply_bake_time_effects(scores, features):
    """
    Longer baking removes moisture.

    Longer bake:
    - crispier
    - less soft
    """

    bake_time = features.get("bake_time_min", 0)


    if bake_time >= 14:

        scores["crispness"] += STRENGTH_WEIGHTS["strong"]
        scores["softness"] -= STRENGTH_WEIGHTS["moderate"]


    elif bake_time <= 8:

        scores["softness"] += STRENGTH_WEIGHTS["moderate"]
        scores["crispness"] -= STRENGTH_WEIGHTS["moderate"]


    return scores

def apply_bake_temperature_effects(scores, features):

    temp = features.get("bake_temp_f", 0)


    if temp >= 400:

        scores["browning"] += STRENGTH_WEIGHTS["moderate"]
        scores["crispness"] += STRENGTH_WEIGHTS["moderate"]


    elif temp <= 325:

        scores["softness"] += STRENGTH_WEIGHTS["weak"]


    return scores

def apply_chocolate_effects(scores, features):

    chocolate_ratio = features.get("chocolate_flour_ratio", 0)


    if chocolate_ratio >= 0.75:

        scores["softness"] += STRENGTH_WEIGHTS["weak"]
        scores["flavor_depth"] += STRENGTH_WEIGHTS["moderate"]


    return scores

def apply_cookie_size_effects(scores, features):

    size = features.get("cookie_size_g", 0)


    if size >= 70:

        scores["softness"] += STRENGTH_WEIGHTS["moderate"]
        scores["thickness"] += STRENGTH_WEIGHTS["moderate"]


    elif size <= 25:

        scores["crispness"] += STRENGTH_WEIGHTS["moderate"]


    return scores
# --------------------------------------------------
# Cookie Validity / Failure Checks
# --------------------------------------------------

def check_cookie_validity(features):
    """
    Determines whether the recipe is within a reasonable
    chocolate chip cookie range.

    The science engine should not predict texture for recipes
    that are chemically unlikely to form a cookie.
    """

    failures = []


    flour = features.get("flour_g", 0)
    sugar = features.get("total_sugar_g", 0)
    fat = features.get("total_fat_g", 0)

    soda = features.get("has_baking_soda", False)
    powder = features.get("has_baking_powder", False)

    egg = features.get("egg_flour_ratio", 0)


    # Flour provides the main structure
    if flour <= 0:
        failures.append(
            "No flour detected: cookie lacks structural base."
        )

    elif flour < 50:
        failures.append(
            "Very little flour: recipe may not form a stable cookie."
        )


    # Sugar affects spread, sweetness, moisture retention
    if sugar <= 0:
        failures.append(
            "No sugar detected: cookie structure and browning may fail."
        )

    elif sugar / flour < 0.15:
        failures.append(
            "Extremely low sugar relative to flour."
        )


    # Fat helps create cookie texture
    if fat <= 0:
        failures.append(
            "No fat detected: cookie may become dry and bread-like."
        )


    # Eggs are optional, so don't fail without them.
    # But extreme amounts break assumptions.
    if egg > 0.6:
        failures.append(
            "Excessive egg: recipe may behave more like cake."
        )


    # Extremely low structure ingredients
    if flour > 0 and fat / flour > 2:
        failures.append(
            "Extreme fat-to-flour ratio: cookie may not hold shape."
        )


    valid = len(failures) == 0


    return {
        "valid": valid,
        "failures": failures
    }


# --------------------------------------------------
# Main prediction function
# --------------------------------------------------

def predict_cookie(features):

    validity = check_cookie_validity(features)

    if not validity["valid"]:
        return {
            "cookie_failed": True,
            "reason": validity["failures"]
        }


    scores = create_baseline_scores()

    scores = apply_butter_effects(scores, features)
    scores = apply_flour_effects(scores, features)
    scores = apply_egg_effects(scores, features)
    scores = apply_leavener_effects(scores, features)
    scores = apply_fat_type_effects(scores, features)
    scores = apply_total_sugar_effects(scores, features)
    scores = apply_flour_type_effects(scores, features)
    scores = apply_mixing_effects(scores, features)
    scores = apply_bake_time_effects(scores, features)
    scores = apply_bake_temperature_effects(scores, features)
    scores = apply_chocolate_effects(scores, features)
    scores = apply_cookie_size_effects(scores, features)
    scores = apply_chill_effects(scores, features)
    scores = apply_sugar_effects(scores, features)
    scores = apply_brown_butter_effects(scores, features)
    scores = apply_yolk_effects(scores, features)
    scores = apply_cornstarch_effects(scores, features)
    for trait in scores:
        scores[trait] = clamp_score(scores[trait])


    scores["cookie_failed"] = False

    return scores



# --------------------------------------------------
# Test
# --------------------------------------------------

if __name__ == "__main__":

    sample_recipe = {
        "flour_g": 280,
        "butter_g": 226,
        "shortening_g": 0,
        "oil_g": 0,

        "white_sugar_g": 150,
        "light_brown_sugar_g": 165,
        "dark_brown_sugar_g": 0,

        "egg_g": 100,
        "egg_yolk_g": 0,

        "baking_soda_g": 5,
        "baking_powder_g": 0,

        "cornstarch_g": 0,
        "chocolate_g": 340,

        "butter_state": "softened",
        "flour_type": "ap",
        "mixing_method": "creamed",

        "chill_hours": 0,
        "dough_temperature": "room_temp",

        "bake_temp_f": 375,
        "bake_time_min": 10,

        "cookie_size_g": 40
    }


    # Convert recipe → Cookie DNA
    features = engineer_cookie_features(sample_recipe)


    print("\nCOOKIE DNA:")
    print(features)


    # Cookie DNA → prediction
    prediction = predict_cookie(features)


    print("\nCOOKIE PREDICTION:")

    for trait, score in prediction.items():
        print(f"{trait}: {score}")


