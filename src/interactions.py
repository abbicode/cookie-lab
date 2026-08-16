"""
Handles cases where ingredients interact.
Cookie behavior is not purely additive.
"""


def apply_interactions(scores, features):


    fat_ratio = features.get(
        "fat_flour_ratio", 0
    )

    sugar_ratio = features.get(
        "sugar_flour_ratio", 0
    )

    brown_fraction = features.get(
        "brown_sugar_fraction", 0
    )

    butter_state = features.get(
        "butter_state",
        ""
    )


    # High fat + high sugar
    # Extreme spread risk

    if fat_ratio > 0.7 and sugar_ratio > 0.8:

        scores["spread"] += 8
        scores["thickness"] -= 8


    # Melted butter + brown sugar
    # Classic chewy cookie combination

    if (
        butter_state == "melted"
        and brown_fraction > 0.6
    ):

        scores["chewiness"] += 8
        scores["softness"] += 8


    # High egg + baking powder
    # Cake cookie risk

    if (
        features.get("egg_flour_ratio",0) > .3
        and features.get("has_baking_powder",False)
    ):

        scores["cakiness"] += 12


    return scores