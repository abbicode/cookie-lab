"""
Cookie Lab Explanation Engine

Generates human-readable explanations
for science-based cookie predictions.
"""


def generate_explanations(recipe, science_prediction, ml_prediction):

    explanations = []


    # -----------------------------------
    # Extract recipe variables
    # -----------------------------------

    butter_state = recipe.get("butter_state", None)

    butter_g = recipe.get("butter_g", 0)
    shortening_g = recipe.get("shortening_g", 0)
    oil_g = recipe.get("oil_g", 0)

    egg_g = recipe.get("egg_g", 0)

    chill_hours = recipe.get("chill_hours", 0)


    # Determine fat type
    if oil_g > 0:
        fat_type = "oil"

    elif shortening_g > 0:
        fat_type = "shortening"

    else:
        fat_type = "butter"


    # Determine egg amount
    if egg_g == 0:
        egg_count = 0

    elif egg_g >= 90:
        egg_count = 2

    else:
        egg_count = 1



    # -----------------------------------
    # Prediction values
    # -----------------------------------

    spread = science_prediction.get("spread", 50)
    thickness = science_prediction.get("thickness", 50)
    chewiness = science_prediction.get("chewiness", 50)
    softness = science_prediction.get("softness", 50)
    crispness = science_prediction.get("crispness", 50)
    cakiness = science_prediction.get("cakiness", 50)



    # -----------------------------------
    # Fat explanations
    # -----------------------------------

    if fat_type == "oil":

        explanations.append(
            "Oil increases spread because it is fully liquid and cannot trap air during mixing like solid butter can."
        )


    elif fat_type == "shortening":

        explanations.append(
            "Shortening can create a thicker cookie because it remains solid during mixing and contains less water than butter."
        )


    elif butter_state == "melted":

        explanations.append(
            "Melted butter increases spread because liquid fat cannot trap as much air during mixing, allowing the cookie to flatten more."
        )


    elif butter_state == "softened":

        explanations.append(
            "Softened butter helps create structure by allowing air to be incorporated during mixing, supporting a thicker cookie."
        )



    # -----------------------------------
    # Egg explanations
    # -----------------------------------

    if egg_count == 0:

        explanations.append(
            "Without eggs, the cookie has less binding and moisture, which can make the texture more crumbly and fragile."
        )


    elif egg_count >= 2:

        explanations.append(
            "Additional egg increases moisture and structure, which can create a softer and more cake-like texture."
        )



    # -----------------------------------
    # Chilling explanations
    # -----------------------------------

    if chill_hours >= 12:

        explanations.append(
            f"The dough was chilled for {chill_hours} hours, which reduces spread because the butter stays solid longer and the flour has more time to hydrate."
        )


    elif chill_hours == 0:

        explanations.append(
            "Skipping chilling allows the dough to spread more easily because the butter melts before the cookie structure fully sets."
        )



    # -----------------------------------
    # Spread explanations
    # -----------------------------------

    if spread >= 70:

        explanations.append(
            "This cookie is predicted to spread significantly because the dough has a lower resistance to flow during baking."
        )


    elif spread <= 45:

        explanations.append(
            "This cookie is predicted to stay compact because the dough has enough structure to resist spreading."
        )



    # -----------------------------------
    # Thickness explanations
    # -----------------------------------

    if thickness >= 65:

        explanations.append(
            "The recipe is predicted to maintain a thicker shape because the dough structure resists spreading."
        )



    # -----------------------------------
    # Texture explanations
    # -----------------------------------

    if crispness >= 70:

        explanations.append(
            "The cookie is predicted to be crispier because the recipe favors lower moisture and more sugar browning."
        )


    if chewiness >= 60:

        explanations.append(
            "The cookie is predicted to be chewier because the recipe retains more moisture."
        )


    if softness >= 60:

        explanations.append(
            "The cookie is predicted to have a softer texture because the recipe supports moisture retention."
        )


    if cakiness >= 65:

        explanations.append(
            "The cookie is predicted to be more cakey because additional moisture and structure create a softer, thicker crumb."
        )



    # -----------------------------------
    # Remove duplicates
    # -----------------------------------

    cleaned = []

    for explanation in explanations:

        if explanation not in cleaned:
            cleaned.append(explanation)



    # Keep output concise
    return cleaned[:4]

def clean_explanations(explanations):
    """
    Remove duplicate explanations while keeping the strongest ones.
    """

    unique = []

    for exp in explanations:
        exp = exp.strip()

        # exact duplicate
        if exp in unique:
            continue

        # similar duplicate
        is_duplicate = False

        words = set(exp.lower().split())

        for existing in unique:
            existing_words = set(existing.lower().split())

            overlap = len(words & existing_words) / max(
                len(words),
                len(existing_words)
            )

            if overlap > 0.7:
                is_duplicate = True
                break

        if not is_duplicate:
            unique.append(exp)

    return unique