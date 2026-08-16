"""
Checks whether a recipe is physically capable of forming
a chocolate chip cookie.
"""


def check_cookie_validity(features):

    failures = []
    warnings = []


    flour = features.get("flour_g", 0)
    sugar = features.get("total_sugar_g", 0)
    fat = features.get("total_fat_g", 0)
    egg = features.get("egg_g", 0)
    leavener = features.get("total_leavener_g", 0)

    fat_ratio = features.get("fat_flour_ratio", 0)
    sugar_ratio = features.get("sugar_flour_ratio", 0)


    # Hard failures

    if flour <= 0:
        failures.append(
            "No flour detected: cookie lacks structure."
        )


    if fat <= 0:
        failures.append(
            "No fat detected: cookie lacks richness and texture."
        )


    if sugar <= 0:
        failures.append(
            "No sugar detected: cookie chemistry is outside normal range."
        )


    # Warnings

    if flour < 100:
        warnings.append(
            "Very low flour amount."
        )


    if sugar_ratio < 0.2:
        warnings.append(
            "Very low sugar-to-flour ratio."
        )


    if sugar_ratio > 1.5:
        warnings.append(
            "Very high sugar-to-flour ratio: cookie may spread excessively."
        )


    if fat_ratio > 1:
        warnings.append(
            "Very high fat-to-flour ratio: possible excessive spreading."
        )


    if fat_ratio < 0.2:
        warnings.append(
            "Very low fat-to-flour ratio: cookie may be dry."
        )


    if egg == 0:
        warnings.append(
            "No egg detected: cookie may be crumbly."
        )


    if leavener == 0:
        warnings.append(
            "No leavening detected: cookie may be dense."
        )


    return {
        "valid": len(failures) == 0,
        "failures": failures,
        "warnings": warnings
    }