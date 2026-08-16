"""
Confidence engine for Cookie Lab.

Combines:
- scientific rule confidence
- recipe validity
- ML model certainty
- agreement between science engine and ML model
"""


def calculate_confidence(
    features,
    prediction,
    warnings,
    ml_prediction
):

    score = 50
    reasons = []


    # -------------------------
    # Scientific evidence
    # -------------------------

    evidence_count = 0


    # Butter state

    butter_state = features.get(
        "butter_state",
        "unknown"
    )


    if butter_state in [
        "melted",
        "softened",
        "cold",
        "browned"
    ]:

        evidence_count += 1

        reasons.append(
            "Butter state has experimental support."
        )


    # Sugar balance

    brown_fraction = features.get(
        "brown_sugar_fraction",
        0
    )

    white_fraction = features.get(
        "white_sugar_fraction",
        0
    )


    if brown_fraction != white_fraction:

        evidence_count += 1

        reasons.append(
            "Sugar composition has experimental support."
        )


    # Chilling

    if features.get(
        "chill_hours",
        0
    ) > 0:

        evidence_count += 1

        reasons.append(
            "Dough chilling has experimental support."
        )


    # Flour range

    flour = features.get(
        "flour_g",
        0
    )


    if 200 <= flour <= 400:

        evidence_count += 1

        reasons.append(
            "Flour amount is within tested range."
        )


    if evidence_count >= 3:
        score += 20

    elif evidence_count == 2:
        score += 10



    # -------------------------
    # Recipe chemistry
    # -------------------------

    fat_ratio = features.get(
        "fat_flour_ratio",
        0
    )


    sugar_ratio = features.get(
        "sugar_flour_ratio",
        0
    )


    if 0.3 <= fat_ratio <= 0.8:

        score += 10

        reasons.append(
            "Fat ratio is within normal cookie range."
        )

    else:

        score -= 10

        reasons.append(
            "Fat ratio is unusual."
        )



    if 0.5 <= sugar_ratio <= 1.2:

        score += 10

        reasons.append(
            "Sugar ratio is within normal cookie range."
        )

    else:

        score -= 10

        reasons.append(
            "Sugar ratio is unusual."
        )



    # -------------------------
    # Unusual ingredient combos
    # -------------------------

    if (
        features.get("has_oil", False)
        and
        features.get("has_shortening", False)
    ):

        score -= 10

        reasons.append(
            "Multiple fat sources reduce confidence."
        )



    # -------------------------
    # ML model confidence
    # -------------------------

    ml_support = 0


    for texture, result in ml_prediction.items():

        probability = result["probability"]


        # Very confident ML prediction

        if probability >= 0.65:

            ml_support += 10

            reasons.append(
                f"ML strongly predicts {texture} texture."
            )


        # Moderate confidence

        elif probability >= 0.65:

            ml_support += 5

            reasons.append(
                f"ML moderately predicts {texture} texture."
            )


        # Model uncertain

        elif 0.45 <= probability <= 0.55:

            ml_support -= 5

            reasons.append(
                f"ML is uncertain about {texture} texture."
            )


    score += ml_support



    # -------------------------
    # Science + ML agreement
    # -------------------------

    agreement = 0


    # Chewy comparison

    science_chewy = prediction.get(
        "chewiness",
        0
    )

    ml_chewy = ml_prediction["chewy"]["probability"]


    if science_chewy >= 60 and ml_chewy >= 0.5:

        agreement += 5

        reasons.append(
            "Science and ML agree on chewiness."
        )


    elif science_chewy >= 60 and ml_chewy < 0.3:

        agreement -= 10

        reasons.append(
            "Science and ML disagree on chewiness."
        )



    # Crispy comparison

    science_crispy = prediction.get(
        "crispness",
        0
    )

    ml_crispy = ml_prediction["crispy"]["probability"]


    if science_crispy >= 60 and ml_crispy >= 0.5:

        agreement += 5

        reasons.append(
            "Science and ML agree on crispiness."
        )


    elif science_crispy >= 60 and ml_crispy < 0.3:

        agreement -= 10

        reasons.append(
            "Science and ML disagree on crispiness."
        )


    score += agreement



    # -------------------------
    # Warnings
    # -------------------------

    if len(warnings) > 0:

        score -= len(warnings) * 10

        reasons.append(
            f"{len(warnings)} warning(s) reduced confidence."
        )



    # -------------------------
    # Final score
    # -------------------------

    score = max(
        0,
        min(score,100)
    )


    if score >= 90:

        label = "Very High"

    elif score >= 75:

        label = "High"

    elif score >= 55:

        label = "Medium"

    else:

        label = "Low"



    return {

        "confidence": label,

        "score": score,

        "reason": reasons

    }