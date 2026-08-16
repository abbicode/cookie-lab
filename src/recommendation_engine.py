"""Rule-based recipe recommendations for the Cookie Lab design flow.

Every candidate begins with the Toll House-style reference formula. Preference
rules make controlled changes, and the existing prediction pipeline evaluates
how closely each candidate matches the requested phenotype.
"""

from copy import deepcopy
from statistics import mean

from baseline_recipes import NESTLE_TOLL_HOUSE
from main import analyze_cookie


PHENOTYPE_KEYS = (
    "spread",
    "thickness",
    "chewiness",
    "softness",
    "crispness",
    "cakiness",
    "browning",
)

REQUIRED_PREFERENCES = ("bite", "center", "shape", "inside")

PREFERENCE_RULES = {
    "bite": {
        "crisp_snappy": {
            "label": "Crisp + Snappy",
            "adjust": {
                "white_sugar_g": 75,
                "light_brown_sugar_g": -75,
                "bake_time_min": 2,
            },
            "targets": {"crispness": 82, "chewiness": 28, "softness": 34},
            "mechanism": "a higher white-sugar share and a slightly longer bake for a drier, crisper bite",
        },
        "balanced": {
            "label": "Balanced",
            "adjust": {},
            "targets": {"crispness": 54, "chewiness": 56},
            "mechanism": "the baseline sugar balance for an even crisp-to-chewy bite",
        },
        "deeply_chewy": {
            "label": "Deeply Chewy",
            "adjust": {
                "white_sugar_g": -75,
                "light_brown_sugar_g": 75,
                "egg_yolk_g": 24,
                "chill_hours": 24,
            },
            "targets": {"chewiness": 86, "softness": 68, "crispness": 30},
            "mechanism": "more brown sugar, egg yolk, and resting time to retain moisture and build chew",
        },
    },
    "center": {
        "fully_baked": {
            "label": "Fully Baked",
            "adjust": {"bake_time_min": 2},
            "targets": {"softness": 34, "crispness": 72},
            "mechanism": "a longer bake to set the center and remove more moisture",
        },
        "soft_set": {
            "label": "Soft Set",
            "adjust": {"light_brown_sugar_g": 15, "bake_time_min": -1},
            "targets": {"softness": 66, "crispness": 44},
            "mechanism": "a touch more brown sugar and a shorter bake for a soft-set center",
        },
        "pillow_soft": {
            "label": "Pillow Soft",
            "adjust": {
                "egg_g": 50,
                "light_brown_sugar_g": 55,
                "cornstarch_g": 16,
                "bake_time_min": -1,
            },
            "targets": {"softness": 88, "thickness": 67, "crispness": 28},
            "mechanism": "extra egg, brown sugar, and cornstarch for moisture and a tender crumb",
        },
    },
    "shape": {
        "thick_tall": {
            "label": "Thick + Tall",
            "adjust": {"flour_g": 55, "chill_hours": 12},
            "set": {"butter_state": "softened", "mixing_method": "creamed"},
            "targets": {"thickness": 86, "spread": 28},
            "mechanism": "more flour, softened butter, creaming, and chilling to help the dough hold its shape",
        },
        "classic_round": {
            "label": "Classic Round",
            "adjust": {},
            "targets": {"thickness": 55, "spread": 54},
            "mechanism": "the reference flour-to-fat ratio for a classic round shape",
        },
        "thin_wide": {
            "label": "Thin + Wide",
            "adjust": {"flour_g": -60, "white_sugar_g": 35},
            "set": {
                "butter_state": "melted",
                "mixing_method": "stirred",
                "chill_hours": 0,
                "dough_temperature": "room",
            },
            "targets": {"spread": 88, "thickness": 24},
            "mechanism": "melted butter, less flour, and no chilling so the dough can spread freely",
        },
    },
    "inside": {
        "light_cakey": {
            "label": "Light + Cakey",
            "adjust": {
                "flour_g": 35,
                "egg_g": 50,
                "baking_soda_g": -4.6,
                "baking_powder_g": 4.6,
            },
            "targets": {"cakiness": 86, "thickness": 68, "softness": 60},
            "mechanism": "more egg and flour with baking powder for lift and a lighter crumb",
        },
        "moist_tender": {
            "label": "Moist + Tender",
            "adjust": {"light_brown_sugar_g": 20, "bake_time_min": -1},
            "targets": {"softness": 70, "chewiness": 60, "cakiness": 46},
            "mechanism": "a modest brown-sugar increase and shorter bake to preserve tenderness",
        },
        "rich_gooey": {
            "label": "Rich + Gooey",
            "adjust": {
                "light_brown_sugar_g": 55,
                "egg_yolk_g": 24,
                "chocolate_g": 55,
                "bake_time_min": -2,
            },
            "targets": {"softness": 90, "chewiness": 76, "crispness": 24},
            "mechanism": "more brown sugar, yolk, and chocolate with less bake time for a rich, gooey center",
        },
    },
}

INGREDIENT_LABELS = {
    "flour_g": "all-purpose flour",
    "butter_g": "unsalted butter",
    "shortening_g": "shortening",
    "oil_g": "oil",
    "white_sugar_g": "white sugar",
    "light_brown_sugar_g": "light brown sugar",
    "dark_brown_sugar_g": "dark brown sugar",
    "egg_g": "whole egg",
    "egg_yolk_g": "egg yolk",
    "baking_soda_g": "baking soda",
    "baking_powder_g": "baking powder",
    "cornstarch_g": "cornstarch",
    "chocolate_g": "chocolate chips",
}

INGREDIENT_ORDER = tuple(INGREDIENT_LABELS)
PROCESS_ORDER = (
    "butter_state",
    "mixing_method",
    "chill_hours",
    "bake_temp_f",
    "bake_time_min",
    "cookie_size_g",
)

VALUE_LIMITS = {
    "flour_g": (180, 420),
    "butter_g": (60, 220),
    "white_sugar_g": (25, 260),
    "light_brown_sugar_g": (25, 250),
    "egg_g": (25, 140),
    "egg_yolk_g": (0, 54),
    "baking_soda_g": (0, 8),
    "baking_powder_g": (0, 8),
    "cornstarch_g": (0, 30),
    "chocolate_g": (80, 300),
    "chill_hours": (0, 36),
    "bake_time_min": (8, 16),
}

# When preferences reinforce the same ingredient, keep the combined change in a
# recognizable chocolate-chip-cookie range before profile intensity is applied.
COMBINED_ADJUSTMENT_LIMITS = {
    "flour_g": (-70, 70),
    "white_sugar_g": (-90, 90),
    "light_brown_sugar_g": (-90, 100),
    "egg_g": (-25, 60),
    "egg_yolk_g": (0, 36),
    "baking_soda_g": (-4.6, 3),
    "baking_powder_g": (0, 5),
    "cornstarch_g": (0, 20),
    "chocolate_g": (-50, 80),
    "chill_hours": (-24, 24),
    "bake_time_min": (-2, 4),
}

PROFILE_SETTINGS = {
    "science": {
        "name": "Science Match",
        "description": "Conservative adjustments with strong, familiar baking mechanisms.",
        "intensity": 0.75,
    },
    "recommended": {
        "name": "Cookie Lab Recommended",
        "description": "The adjustment level that best matches your targets in the science engine.",
        "intensity": 1.0,
    },
    "experimental": {
        "name": "Experimental",
        "description": "A more assertive version that pushes the requested phenotype.",
        "intensity": 1.35,
    },
}


def _slug(value):
    return (
        str(value)
        .strip()
        .lower()
        .replace("+", " ")
        .replace("&", " ")
        .replace("-", " ")
        .replace("_", " ")
    )


def _normalize_preferences(user_preferences):
    if not isinstance(user_preferences, dict):
        raise ValueError("user_preferences must be a dictionary.")

    normalized = {}
    labels = {}

    for question in REQUIRED_PREFERENCES:
        if question not in user_preferences:
            raise ValueError(f"Missing preference: {question}.")

        requested = " ".join(_slug(user_preferences[question]).split())
        options = PREFERENCE_RULES[question]
        match = next(
            (
                key
                for key, rule in options.items()
                if requested in {
                    " ".join(_slug(key).split()),
                    " ".join(_slug(rule["label"]).split()),
                }
            ),
            None,
        )

        if match is None:
            valid = ", ".join(rule["label"] for rule in options.values())
            raise ValueError(f"Invalid {question} preference. Choose one of: {valid}.")

        normalized[question] = match
        labels[question] = options[match]["label"]

    return normalized, labels


def _collect_rules(preferences):
    numeric_adjustments = {}
    fixed_values = {}
    target_values = {}
    mechanisms = []

    for question in REQUIRED_PREFERENCES:
        rule = PREFERENCE_RULES[question][preferences[question]]

        for key, value in rule.get("adjust", {}).items():
            numeric_adjustments[key] = numeric_adjustments.get(key, 0) + value

        fixed_values.update(rule.get("set", {}))
        mechanisms.append({
            "text": rule["mechanism"],
            "priority": len(rule.get("adjust", {})) + len(rule.get("set", {})),
        })

        for trait, target in rule["targets"].items():
            target_values.setdefault(trait, []).append(target)

    phenotype_targets = {
        trait: round(mean(values), 1)
        for trait, values in target_values.items()
    }

    for key, value in numeric_adjustments.items():
        if key in COMBINED_ADJUSTMENT_LIMITS:
            minimum, maximum = COMBINED_ADJUSTMENT_LIMITS[key]
            numeric_adjustments[key] = max(minimum, min(maximum, value))

    mechanisms.sort(key=lambda item: item["priority"], reverse=True)
    return numeric_adjustments, fixed_values, phenotype_targets, mechanisms


def _round_recipe_value(key, value):
    if key in {"baking_soda_g", "baking_powder_g"}:
        return round(value, 1)
    if key == "bake_time_min":
        return round(value * 2) / 2
    if key == "chill_hours":
        return round(value)
    return round(value)


def _build_recipe(numeric_adjustments, fixed_values, intensity):
    recipe = deepcopy(NESTLE_TOLL_HOUSE)

    for key, delta in numeric_adjustments.items():
        next_value = recipe[key] + delta * intensity
        if key in VALUE_LIMITS:
            minimum, maximum = VALUE_LIMITS[key]
            next_value = max(minimum, min(maximum, next_value))
        recipe[key] = _round_recipe_value(key, next_value)

    recipe.update(fixed_values)
    recipe["dough_temperature"] = "chilled" if recipe["chill_hours"] > 0 else "room"
    return recipe


def _match_score(prediction, targets, warning_count=0):
    differences = [
        abs(float(prediction.get(trait, 50)) - target)
        for trait, target in targets.items()
    ]
    score = 100 - mean(differences) - warning_count * 2
    return round(max(0, min(100, score)), 1)


def _format_number(value):
    number = float(value)
    return str(int(number)) if number.is_integer() else f"{number:.1f}"


def _ingredient_list(recipe):
    ingredients = []
    for key in INGREDIENT_ORDER:
        amount = recipe.get(key, 0)
        if amount <= 0:
            continue
        display = f"{_format_number(amount)} g {INGREDIENT_LABELS[key]}"
        if key == "egg_g":
            display += f" (about {_format_number(amount / 50)} large egg{'s' if amount != 50 else ''})"
        elif key == "egg_yolk_g":
            display += f" (about {_format_number(amount / 18)} yolk{'s' if amount != 18 else ''})"

        ingredients.append({
            "key": key,
            "name": INGREDIENT_LABELS[key],
            "amount_g": amount,
            "display": display,
        })
    return ingredients


def _process_list(recipe):
    chill = recipe["chill_hours"]
    return [
        f"Butter: {recipe['butter_state']}",
        f"Mixing method: {recipe['mixing_method']}",
        f"Dough chill: {_format_number(chill)} hour{'s' if chill != 1 else ''}",
        f"Bake at {_format_number(recipe['bake_temp_f'])}°F for {_format_number(recipe['bake_time_min'])} minutes",
        f"Portion size: {_format_number(recipe['cookie_size_g'])} g",
    ]


def _change_list(recipe):
    changes = []

    for key in INGREDIENT_ORDER:
        baseline = NESTLE_TOLL_HOUSE.get(key, 0)
        current = recipe.get(key, 0)
        difference = round(current - baseline, 1)
        if difference == 0:
            continue

        label = INGREDIENT_LABELS[key]
        amount = _format_number(abs(difference))
        if key == "egg_yolk_g" and difference > 0:
            yolks = _format_number(difference / 18)
            changes.append(f"Added {amount} g egg yolk (about {yolks} yolks)")
        elif difference > 0:
            changes.append(f"Added {amount} g {label}")
        else:
            changes.append(f"Reduced {label} by {amount} g")

    if recipe["butter_state"] != NESTLE_TOLL_HOUSE["butter_state"]:
        changes.append(
            f"Used {recipe['butter_state']} butter instead of "
            f"{NESTLE_TOLL_HOUSE['butter_state']} butter"
        )

    if recipe["mixing_method"] != NESTLE_TOLL_HOUSE["mixing_method"]:
        changes.append(
            f"Used the {recipe['mixing_method']} method instead of "
            f"{NESTLE_TOLL_HOUSE['mixing_method']}"
        )

    if recipe["chill_hours"] != NESTLE_TOLL_HOUSE["chill_hours"]:
        changes.append(
            f"Chilled the dough for {_format_number(recipe['chill_hours'])} hours"
        )

    bake_difference = recipe["bake_time_min"] - NESTLE_TOLL_HOUSE["bake_time_min"]
    if bake_difference:
        direction = "Increased" if bake_difference > 0 else "Reduced"
        changes.append(
            f"{direction} bake time by {_format_number(abs(bake_difference))} minutes"
        )

    return changes or ["Kept the Toll House-style baseline unchanged"]


def _explanation(profile_key, mechanisms):
    prefix = {
        "science": "This conservative match uses",
        "recommended": "This engine-selected match uses",
        "experimental": "This more assertive match uses",
    }[profile_key]
    return f"{prefix} {mechanisms[0]['text']}; it also uses {mechanisms[1]['text']}."


def _evaluate_candidate(profile_key, intensity, numeric_adjustments, fixed_values, targets, mechanisms):
    recipe = _build_recipe(numeric_adjustments, fixed_values, intensity)
    analysis = analyze_cookie(recipe)

    if analysis.get("cookie_failed"):
        return None

    prediction = {
        trait: round(float(analysis["prediction"].get(trait, 50)), 1)
        for trait in PHENOTYPE_KEYS
    }
    warnings = list(analysis.get("warnings", []))
    confidence = analysis.get("confidence", {})
    profile = PROFILE_SETTINGS[profile_key]

    return {
        "name": profile["name"],
        "profile": profile_key,
        "profile_description": profile["description"],
        "intensity": intensity,
        "match_score": _match_score(prediction, targets, len(warnings)),
        "changes": _change_list(recipe),
        "recipe": recipe,
        "ingredients": _ingredient_list(recipe),
        "process": _process_list(recipe),
        "predicted_phenotype": prediction,
        "confidence_score": confidence.get("score", 0),
        "confidence_label": confidence.get("confidence", "Unknown"),
        "explanation": _explanation(profile_key, mechanisms),
        "warnings": warnings,
    }


def generate_cookie_recommendations(user_preferences):
    """Generate and rank three baseline-derived cookie recommendations."""

    preferences, preference_labels = _normalize_preferences(user_preferences)
    adjustments, fixed_values, targets, mechanisms = _collect_rules(preferences)

    science = _evaluate_candidate(
        "science",
        PROFILE_SETTINGS["science"]["intensity"],
        adjustments,
        fixed_values,
        targets,
        mechanisms,
    )

    recommended_options = [
        _evaluate_candidate(
            "recommended",
            intensity,
            adjustments,
            fixed_values,
            targets,
            mechanisms,
        )
        for intensity in (0.9, 1.0, 1.1, 1.2)
    ]
    recommended_options = [option for option in recommended_options if option]
    recommended = max(
        recommended_options,
        key=lambda option: option["match_score"] - abs(option["intensity"] - 1) * 0.5,
    )

    experimental = _evaluate_candidate(
        "experimental",
        PROFILE_SETTINGS["experimental"]["intensity"],
        adjustments,
        fixed_values,
        targets,
        mechanisms,
    )

    recommendations = [item for item in (science, recommended, experimental) if item]
    if len(recommendations) != 3:
        raise ValueError("The selected preferences produced an invalid cookie candidate.")

    ranked = sorted(recommendations, key=lambda item: item["match_score"], reverse=True)
    for rank, recommendation in enumerate(ranked, start=1):
        recommendation["rank"] = rank

    # Preserve the three requested recipe roles while exposing the engine-derived rank.
    role_order = {"science": 0, "recommended": 1, "experimental": 2}
    recommendations.sort(key=lambda item: role_order[item["profile"]])

    return {
        "baseline_recipe": deepcopy(NESTLE_TOLL_HOUSE),
        "preferences": preference_labels,
        "target_phenotype": targets,
        "recommendations": recommendations,
        "ranking": [item["name"] for item in ranked],
    }
