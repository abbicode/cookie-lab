"""Reliable, rule-based parsing for chocolate chip cookie recipes.

The parser intentionally supports a narrow ingredient vocabulary and common US
baking measurements. It does not infer novel ingredients or call external APIs.
"""

from __future__ import annotations

from dataclasses import dataclass
from fractions import Fraction
import re


DEFAULT_RECIPE = {
    "flour_g": 0.0,
    "butter_g": 0.0,
    "shortening_g": 0.0,
    "oil_g": 0.0,
    "white_sugar_g": 0.0,
    "light_brown_sugar_g": 0.0,
    "egg_g": 0.0,
    "egg_yolk_g": 0.0,
    "baking_soda_g": 0.0,
    "baking_powder_g": 0.0,
    "cornstarch_g": 0.0,
    "chocolate_g": 0.0,
    "butter_state": "softened",
    "mixing_method": "creamed",
    "chill_hours": 0.0,
    "bake_temp_f": 350.0,
    "bake_time_min": 10.0,
    "cookie_size_g": 30.0,
}


# Ingredient-specific cup weights. Tablespoon, teaspoon, and milliliter
# conversions are derived from one US cup = 16 tbsp = 48 tsp = 236.588 ml.
CUP_WEIGHTS_G = {
    "flour_g": 125.0,
    "butter_g": 226.0,
    "shortening_g": 205.0,
    "oil_g": 218.0,
    "white_sugar_g": 200.0,
    "light_brown_sugar_g": 220.0,
    "baking_soda_g": 220.8,  # 4.6 g per teaspoon
    "baking_powder_g": 192.0,  # 4 g per teaspoon
    "cornstarch_g": 128.0,
    "chocolate_g": 170.0,
}


UNICODE_FRACTIONS = {
    "¼": "1/4",
    "½": "1/2",
    "¾": "3/4",
    "⅓": "1/3",
    "⅔": "2/3",
    "⅛": "1/8",
    "⅜": "3/8",
    "⅝": "5/8",
    "⅞": "7/8",
}


UNIT_ALIASES = {
    "cup": "cup",
    "cups": "cup",
    "c": "cup",
    "tablespoon": "tbsp",
    "tablespoons": "tbsp",
    "tbsp": "tbsp",
    "tbs": "tbsp",
    "teaspoon": "tsp",
    "teaspoons": "tsp",
    "tsp": "tsp",
    "gram": "g",
    "grams": "g",
    "g": "g",
    "kilogram": "kg",
    "kilograms": "kg",
    "kg": "kg",
    "ounce": "oz",
    "ounces": "oz",
    "oz": "oz",
    "pound": "lb",
    "pounds": "lb",
    "lb": "lb",
    "lbs": "lb",
    "milliliter": "ml",
    "milliliters": "ml",
    "ml": "ml",
    "stick": "stick",
    "sticks": "stick",
}


@dataclass(frozen=True)
class ParsedCookieRecipe:
    recipe: dict
    warnings: list[str]
    unparsed_lines: list[str]


def _normalize_fractions(text: str) -> str:
    normalized = text.replace("\u00a0", " ").replace("⁄", "/")
    for glyph, fraction in UNICODE_FRACTIONS.items():
        normalized = re.sub(rf"(?<=\d){re.escape(glyph)}", f" {fraction}", normalized)
        normalized = normalized.replace(glyph, fraction)
    return normalized


def _parse_number(value: str) -> float:
    parts = value.strip().split()
    total = 0.0
    for part in parts:
        if "/" in part:
            total += float(Fraction(part))
        else:
            total += float(part)
    return total


def _quantity_and_unit(line: str):
    match = re.match(
        r"^\s*(\d+\s+\d+/\d+|\d+/\d+|\d+(?:\.\d+)?)\s*(.*)$",
        line,
        flags=re.IGNORECASE,
    )
    if not match:
        return None

    quantity = _parse_number(match.group(1))
    remainder = match.group(2).strip()

    # Support package notation such as "1 (12-ounce) bag chocolate chips".
    package_weight = re.match(
        r"^\(?\s*(\d+(?:\.\d+)?)\s*[- ]?\s*(ounce|ounces|oz|g|grams?)\s*\)?\s+",
        remainder,
        flags=re.IGNORECASE,
    )
    if package_weight:
        package_quantity = float(package_weight.group(1))
        package_unit = UNIT_ALIASES[package_weight.group(2).lower()]
        return quantity * package_quantity, package_unit, remainder[package_weight.end():].strip()

    unit_match = re.match(r"^([a-zA-Z]+)\.?\b\s*(.*)$", remainder)
    if unit_match:
        unit_text = unit_match.group(1).lower()
        if unit_text in UNIT_ALIASES:
            return quantity, UNIT_ALIASES[unit_text], unit_match.group(2).strip()

    return quantity, "count", remainder


def _ingredient_key(line: str):
    lowered = line.lower()

    if re.search(r"\bbaking\s+soda\b|\bbicarbonate\s+of\s+soda\b", lowered):
        return "baking_soda_g"
    if re.search(r"\bbaking\s+powder\b", lowered):
        return "baking_powder_g"
    if re.search(r"\bcorn\s*starch\b|\bcornflour\b", lowered):
        return "cornstarch_g"
    if re.search(r"\b(chocolate\s+chips?|chocolate\s+morsels?|chopped\s+chocolate)\b", lowered):
        return "chocolate_g"
    if re.search(r"\begg\s+yolks?\b|\byolks?\b", lowered):
        return "egg_yolk_g"
    if re.search(r"\beggs?\b", lowered):
        return "egg_g"
    if re.search(r"\b(light|dark)?\s*brown\s+sugar\b", lowered):
        return "light_brown_sugar_g"
    if re.search(r"\b(granulated|white|caster|superfine)\s+sugar\b", lowered):
        return "white_sugar_g"
    if re.search(r"\bshortening\b", lowered):
        return "shortening_g"
    if re.search(r"\b(vegetable|canola|coconut)?\s*oil\b", lowered):
        return "oil_g"
    if re.search(r"\bbutter\b", lowered):
        return "butter_g"
    if re.search(r"\b(all[- ]purpose|plain)?\s*flour\b", lowered):
        return "flour_g"
    if re.search(r"\bsugar\b", lowered) and "brown" not in lowered:
        return "white_sugar_g"
    return None


def _convert_to_grams(ingredient_key: str, quantity: float, unit: str):
    if unit == "g":
        return quantity
    if unit == "kg":
        return quantity * 1000
    if unit == "oz":
        return quantity * 28.3495
    if unit == "lb":
        return quantity * 453.592

    if ingredient_key == "egg_g" and unit == "count":
        return quantity * 50
    if ingredient_key == "egg_yolk_g" and unit == "count":
        return quantity * 18
    if ingredient_key == "butter_g" and unit == "stick":
        return quantity * 113

    cup_weight = CUP_WEIGHTS_G.get(ingredient_key)
    if cup_weight is None:
        return None
    if unit == "cup":
        return quantity * cup_weight
    if unit == "tbsp":
        return quantity * cup_weight / 16
    if unit == "tsp":
        return quantity * cup_weight / 48
    if unit == "ml":
        return quantity * cup_weight / 236.588
    return None


def _butter_state(text: str):
    lowered = text.lower()
    if re.search(r"\bbrown(?:ed)?\s+butter\b|\bbutter[^\n,.]{0,24}\bbrown(?:ed)?\b", lowered):
        return "browned", True
    if re.search(r"\bmelted\s+butter\b|\bbutter[^\n,.]{0,24}\bmelted\b", lowered):
        return "melted", True
    if re.search(r"\b(cold|chilled|frozen)\s+butter\b|\bbutter[^\n,.]{0,24}\b(cold|chilled|frozen)\b", lowered):
        return "cold", True
    if re.search(r"\bsoftened\s+butter\b|\bbutter[^\n,.]{0,24}\b(softened|room temperature)\b", lowered):
        return "softened", True
    return "softened", False


def _mixing_method(text: str, butter_state: str):
    lowered = text.lower()
    if re.search(r"\bcream(?:ed|ing)?\b|\bbeat[^.\n]{0,60}\bbutter\b[^.\n]{0,60}\bsugar", lowered):
        return "creamed", True
    if re.search(r"\b(stir|stirred|whisk|whisked|mix|mixed)\b", lowered):
        return "stirred", True
    return ("stirred" if butter_state in {"melted", "browned"} else "creamed"), False


def _chill_hours(text: str):
    lowered = text.lower()
    if re.search(r"\b(no|without)\s+chill", lowered):
        return 0.0, True
    if re.search(r"\b(chill|refrigerat\w*)[^.\n]{0,50}\bovernight\b", lowered):
        return 12.0, True

    match = re.search(
        r"\b(?:chill|refrigerat\w*)[^.\n]{0,50}?(\d+(?:\.\d+)?|\d+/\d+)\s*(hours?|hrs?|minutes?|mins?)\b",
        lowered,
    )
    if not match:
        return 0.0, False
    duration = _parse_number(match.group(1))
    if match.group(2).startswith(("minute", "min")):
        duration /= 60
    return round(duration, 2), True


def _bake_temperature(text: str):
    lowered = text.lower()
    match = re.search(
        r"\b(?:preheat|oven|bake)[^.\n]{0,60}?(\d{2,3})\s*°?\s*([fc])\b",
        lowered,
    )
    if not match:
        match = re.search(r"\b(\d{2,3})\s*°\s*([fc])\b", lowered)
    if not match:
        return 350.0, False

    temperature = float(match.group(1))
    if match.group(2) == "c":
        temperature = temperature * 9 / 5 + 32
    return round(temperature), True


def _bake_time(text: str):
    lowered = text.lower().replace("–", "-").replace("—", "-")
    range_match = re.search(
        r"\bbake[^.\n]{0,90}?(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s*(?:minutes?|mins?)\b",
        lowered,
    )
    if range_match:
        low = float(range_match.group(1))
        high = float(range_match.group(2))
        return round((low + high) / 2, 2), True

    match = re.search(
        r"\bbake[^.\n]{0,90}?(\d+(?:\.\d+)?)\s*(?:minutes?|mins?)\b",
        lowered,
    )
    if match:
        return float(match.group(1)), True
    return 10.0, False


def _cookie_size(text: str):
    lowered = text.lower()
    patterns = [
        r"\b(?:portion|scoop|dough balls?|cookies?)[^.\n]{0,45}?(\d+(?:\.\d+)?)\s*g\b",
        r"\b(\d+(?:\.\d+)?)\s*g\s+(?:portions?|scoops?|dough balls?|cookies?)\b",
    ]
    for pattern in patterns:
        match = re.search(pattern, lowered)
        if match:
            return float(match.group(1)), True
    return 30.0, False


def parse_cookie_recipe(recipe_text: str) -> ParsedCookieRecipe:
    """Parse one chocolate-chip-cookie recipe into the engine's raw schema."""

    if not recipe_text or not recipe_text.strip():
        raise ValueError("Recipe text cannot be empty.")

    normalized_text = _normalize_fractions(recipe_text)
    recipe = dict(DEFAULT_RECIPE)
    warnings = []
    unparsed_lines = []

    raw_lines = re.split(r"[\n;]+", normalized_text)
    for raw_line in raw_lines:
        line = re.sub(r"^\s*[-*•]\s*", "", raw_line).strip()
        if not line:
            continue

        egg_combo = re.match(
            r"^\s*(\d+(?:\.\d+)?)\s+(?:large\s+)?eggs?\s*(?:\+|plus|and)\s*"
            r"(\d+(?:\.\d+)?)\s+(?:large\s+)?(?:egg\s+)?yolks?\b",
            line,
            flags=re.IGNORECASE,
        )
        if egg_combo:
            recipe["egg_g"] += float(egg_combo.group(1)) * 50
            recipe["egg_yolk_g"] += float(egg_combo.group(2)) * 18
            continue

        parsed_amount = _quantity_and_unit(line)
        if not parsed_amount:
            continue
        quantity, unit, remainder = parsed_amount
        ingredient_key = _ingredient_key(remainder)

        if ingredient_key is None:
            # Salt and vanilla do not map to the current prediction schema.
            if re.search(r"\b(salt|vanilla(?:\s+extract)?)\b", remainder.lower()):
                continue
            if unit != "count":
                unparsed_lines.append(raw_line.strip())
            continue

        grams = _convert_to_grams(ingredient_key, quantity, unit)
        if grams is None:
            unparsed_lines.append(raw_line.strip())
            continue
        recipe[ingredient_key] = round(recipe[ingredient_key] + grams, 2)

    recipe["butter_state"], butter_state_found = _butter_state(normalized_text)
    recipe["mixing_method"], mixing_method_found = _mixing_method(
        normalized_text,
        recipe["butter_state"],
    )
    recipe["chill_hours"], chill_found = _chill_hours(normalized_text)
    recipe["bake_temp_f"], temperature_found = _bake_temperature(normalized_text)
    recipe["bake_time_min"], bake_time_found = _bake_time(normalized_text)
    recipe["cookie_size_g"], cookie_size_found = _cookie_size(normalized_text)

    if recipe["flour_g"] == 0:
        warnings.append("No flour quantity could be parsed.")
    if recipe["butter_g"] + recipe["shortening_g"] + recipe["oil_g"] == 0:
        warnings.append("No butter, shortening, or oil quantity could be parsed.")
    if recipe["white_sugar_g"] + recipe["light_brown_sugar_g"] == 0:
        warnings.append("No white or brown sugar quantity could be parsed.")
    if recipe["chocolate_g"] == 0:
        warnings.append("No chocolate quantity was found; the prediction describes the base cookie dough.")
    if recipe["butter_g"] > 0 and not butter_state_found:
        warnings.append("No butter state was found; defaulted to softened butter.")
    if not mixing_method_found:
        warnings.append(f"No mixing method was found; defaulted to {recipe['mixing_method']} mixing.")
    if not chill_found:
        warnings.append("No chill instruction was found; defaulted to 0 hours.")
    if not temperature_found:
        warnings.append("No bake temperature was found; defaulted to 350°F.")
    if not bake_time_found:
        warnings.append("No bake time was found; defaulted to 10 minutes.")
    if not cookie_size_found:
        warnings.append("No cookie size was found; defaulted to 30 g.")
    if unparsed_lines:
        warnings.append(
            "Could not map these measured ingredient lines: " + "; ".join(unparsed_lines[:4])
        )

    return ParsedCookieRecipe(
        recipe=recipe,
        warnings=warnings,
        unparsed_lines=unparsed_lines,
    )
