import { analyzeCookie, NESTLE_TOLL_HOUSE } from './scienceEngine.js';

const EMPTY_RECIPE = {
  ...NESTLE_TOLL_HOUSE,
  flour_g: 0,
  butter_g: 0,
  shortening_g: 0,
  oil_g: 0,
  white_sugar_g: 0,
  light_brown_sugar_g: 0,
  dark_brown_sugar_g: 0,
  egg_g: 0,
  egg_yolk_g: 0,
  baking_soda_g: 0,
  baking_powder_g: 0,
  cornstarch_g: 0,
  chocolate_g: 0,
};

const CUP_WEIGHTS = {
  flour_g: 125,
  butter_g: 226,
  shortening_g: 205,
  oil_g: 218,
  white_sugar_g: 200,
  light_brown_sugar_g: 220,
  baking_soda_g: 220.8,
  baking_powder_g: 192,
  cornstarch_g: 128,
  chocolate_g: 170,
};

const FRACTIONS = {
  '¼': '1/4',
  '½': '1/2',
  '¾': '3/4',
  '⅓': '1/3',
  '⅔': '2/3',
  '⅛': '1/8',
  '⅜': '3/8',
  '⅝': '5/8',
  '⅞': '7/8',
};

const UNIT_ALIASES = {
  cup: 'cup', cups: 'cup', c: 'cup',
  tablespoon: 'tbsp', tablespoons: 'tbsp', tbsp: 'tbsp', tbs: 'tbsp',
  teaspoon: 'tsp', teaspoons: 'tsp', tsp: 'tsp',
  gram: 'g', grams: 'g', g: 'g', kilogram: 'kg', kilograms: 'kg', kg: 'kg',
  ounce: 'oz', ounces: 'oz', oz: 'oz', pound: 'lb', pounds: 'lb', lb: 'lb', lbs: 'lb',
  milliliter: 'ml', milliliters: 'ml', ml: 'ml', stick: 'stick', sticks: 'stick',
};

const normalizeFractions = (text) => {
  let normalized = text.replaceAll('\u00a0', ' ').replaceAll('⁄', '/');
  Object.entries(FRACTIONS).forEach(([glyph, fraction]) => {
    normalized = normalized.replace(new RegExp(`(\\d)${glyph}`, 'g'), `$1 ${fraction}`);
    normalized = normalized.replaceAll(glyph, fraction);
  });
  return normalized;
};

const parseNumber = (text) => text.trim().split(/\s+/).reduce((total, part) => {
  if (!part.includes('/')) return total + Number(part);
  const [numerator, denominator] = part.split('/').map(Number);
  return total + numerator / denominator;
}, 0);

const quantityAndUnit = (line) => {
  const match = line.match(/^\s*(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)\s*(.*)$/i);
  if (!match) return null;
  const quantity = parseNumber(match[1]);
  const remainder = match[2].trim();
  const packageMatch = remainder.match(/^\(?\s*(\d+(?:\.\d+)?)\s*[- ]?\s*(ounce|ounces|oz|g|grams?)\s*\)?\s+(.*)$/i);
  if (packageMatch) {
    return [quantity * Number(packageMatch[1]), UNIT_ALIASES[packageMatch[2].toLowerCase()], packageMatch[3].trim()];
  }
  const unitMatch = remainder.match(/^([a-zA-Z]+)\.?\b\s*(.*)$/);
  if (unitMatch && UNIT_ALIASES[unitMatch[1].toLowerCase()]) {
    return [quantity, UNIT_ALIASES[unitMatch[1].toLowerCase()], unitMatch[2].trim()];
  }
  return [quantity, 'count', remainder];
};

const ingredientKey = (line) => {
  const value = line.toLowerCase();
  if (/\bbaking\s+soda\b|\bbicarbonate\s+of\s+soda\b/.test(value)) return 'baking_soda_g';
  if (/\bbaking\s+powder\b/.test(value)) return 'baking_powder_g';
  if (/\bcorn\s*starch\b|\bcornflour\b/.test(value)) return 'cornstarch_g';
  if (/\b(chocolate\s+chips?|chocolate\s+morsels?|chopped\s+chocolate)\b/.test(value)) return 'chocolate_g';
  if (/\begg\s+yolks?\b|\byolks?\b/.test(value)) return 'egg_yolk_g';
  if (/\beggs?\b/.test(value)) return 'egg_g';
  if (/\b(light|dark)?\s*brown\s+sugar\b/.test(value)) return 'light_brown_sugar_g';
  if (/\b(granulated|white|caster|superfine)\s+sugar\b/.test(value)) return 'white_sugar_g';
  if (/\bshortening\b/.test(value)) return 'shortening_g';
  if (/\b(vegetable|canola|coconut)?\s*oil\b/.test(value)) return 'oil_g';
  if (/\bbutter\b/.test(value)) return 'butter_g';
  if (/\b(all[- ]purpose|plain)?\s*flour\b/.test(value)) return 'flour_g';
  if (/\bsugar\b/.test(value) && !value.includes('brown')) return 'white_sugar_g';
  return null;
};

const toGrams = (key, quantity, unit) => {
  if (unit === 'g') return quantity;
  if (unit === 'kg') return quantity * 1000;
  if (unit === 'oz') return quantity * 28.3495;
  if (unit === 'lb') return quantity * 453.592;
  if (key === 'egg_g' && unit === 'count') return quantity * 50;
  if (key === 'egg_yolk_g' && unit === 'count') return quantity * 18;
  if (key === 'butter_g' && unit === 'stick') return quantity * 113;
  const cupWeight = CUP_WEIGHTS[key];
  if (!cupWeight) return null;
  if (unit === 'cup') return quantity * cupWeight;
  if (unit === 'tbsp') return quantity * cupWeight / 16;
  if (unit === 'tsp') return quantity * cupWeight / 48;
  if (unit === 'ml') return quantity * cupWeight / 236.588;
  return null;
};

const detectButterState = (text) => {
  const value = text.toLowerCase();
  if (/\bbrown(?:ed)?\s+butter\b|\bbutter[^\n,.]{0,24}\bbrown(?:ed)?\b/.test(value)) return ['browned', true];
  if (/\bmelted\s+butter\b|\bbutter[^\n,.]{0,24}\bmelted\b/.test(value)) return ['melted', true];
  if (/\b(cold|chilled|frozen)\s+butter\b|\bbutter[^\n,.]{0,24}\b(cold|chilled|frozen)\b/.test(value)) return ['cold', true];
  if (/\bsoftened\s+butter\b|\bbutter[^\n,.]{0,24}\b(softened|room temperature)\b/.test(value)) return ['softened', true];
  return ['softened', false];
};

const detectMixing = (text, butterState) => {
  const value = text.toLowerCase();
  if (/\bcream(?:ed|ing)?\b|\bbeat[^.\n]{0,60}\bbutter\b[^.\n]{0,60}\bsugar/.test(value)) return ['creamed', true];
  if (/\b(stir|stirred|whisk|whisked|mix|mixed)\b/.test(value)) return ['stirred', true];
  return [['melted', 'browned'].includes(butterState) ? 'stirred' : 'creamed', false];
};

const detectChill = (text) => {
  const value = text.toLowerCase();
  if (/\b(no|without)\s+chill/.test(value)) return [0, true];
  if (/\b(chill|refrigerat\w*)[^.\n]{0,50}\bovernight\b/.test(value)) return [12, true];
  const match = value.match(/\b(?:chill|refrigerat\w*)[^.\n]{0,50}?(\d+(?:\.\d+)?|\d+\/\d+)\s*(hours?|hrs?|minutes?|mins?)\b/);
  if (!match) return [0, false];
  const duration = parseNumber(match[1]) / (match[2].startsWith('min') ? 60 : 1);
  return [Math.round(duration * 100) / 100, true];
};

const detectTemperature = (text) => {
  const match = text.toLowerCase().match(/\b(?:preheat|oven|bake)[^.\n]{0,60}?(\d{2,3})\s*°?\s*([fc])\b/)
    || text.toLowerCase().match(/\b(\d{2,3})\s*°\s*([fc])\b/);
  if (!match) return [350, false];
  const temperature = match[2] === 'c' ? Number(match[1]) * 9 / 5 + 32 : Number(match[1]);
  return [Math.round(temperature), true];
};

const detectBakeTime = (text) => {
  const value = text.toLowerCase().replace(/[–—]/g, '-');
  const range = value.match(/\bbake[^.\n]{0,90}?(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s*(?:minutes?|mins?)\b/);
  if (range) return [(Number(range[1]) + Number(range[2])) / 2, true];
  const match = value.match(/\bbake[^.\n]{0,90}?(\d+(?:\.\d+)?)\s*(?:minutes?|mins?)\b/);
  return match ? [Number(match[1]), true] : [10, false];
};

export function parseCookieRecipe(recipeText) {
  if (!recipeText?.trim()) throw new Error('Recipe text cannot be empty.');
  const normalizedText = normalizeFractions(recipeText);
  const recipe = { ...EMPTY_RECIPE };
  const warnings = [];
  const unparsedLines = [];

  normalizedText.split(/[\n;]+/).forEach((rawLine) => {
    const line = rawLine.replace(/^\s*[-*•]\s*/, '').trim();
    if (!line) return;
    const eggCombo = line.match(/^\s*(\d+(?:\.\d+)?)\s+(?:large\s+)?eggs?\s*(?:\+|plus|and)\s*(\d+(?:\.\d+)?)\s+(?:large\s+)?(?:egg\s+)?yolks?\b/i);
    if (eggCombo) {
      recipe.egg_g += Number(eggCombo[1]) * 50;
      recipe.egg_yolk_g += Number(eggCombo[2]) * 18;
      return;
    }
    const amount = quantityAndUnit(line);
    if (!amount) return;
    const [quantity, unit, remainder] = amount;
    const key = ingredientKey(remainder);
    if (!key) {
      if (!/\b(salt|vanilla(?:\s+extract)?)\b/i.test(remainder) && unit !== 'count') unparsedLines.push(rawLine.trim());
      return;
    }
    const grams = toGrams(key, quantity, unit);
    if (grams == null) unparsedLines.push(rawLine.trim());
    else recipe[key] = Math.round((recipe[key] + grams) * 100) / 100;
  });

  const [butterState, butterFound] = detectButterState(normalizedText);
  const [mixingMethod, mixingFound] = detectMixing(normalizedText, butterState);
  const [chillHours, chillFound] = detectChill(normalizedText);
  const [bakeTemp, temperatureFound] = detectTemperature(normalizedText);
  const [bakeTime, bakeTimeFound] = detectBakeTime(normalizedText);
  const sizeMatch = normalizedText.toLowerCase().match(/\b(?:portion|scoop|dough balls?|cookies?)[^.\n]{0,45}?(\d+(?:\.\d+)?)\s*g\b/);

  Object.assign(recipe, {
    butter_state: butterState,
    mixing_method: mixingMethod,
    chill_hours: chillHours,
    dough_temperature: chillHours > 0 ? 'chilled' : 'room',
    bake_temp_f: bakeTemp,
    bake_time_min: bakeTime,
    cookie_size_g: sizeMatch ? Number(sizeMatch[1]) : 30,
  });

  if (recipe.flour_g === 0) warnings.push('No flour quantity could be parsed.');
  if (recipe.butter_g + recipe.shortening_g + recipe.oil_g === 0) warnings.push('No butter, shortening, or oil quantity could be parsed.');
  if (recipe.white_sugar_g + recipe.light_brown_sugar_g === 0) warnings.push('No white or brown sugar quantity could be parsed.');
  if (recipe.chocolate_g === 0) warnings.push('No chocolate quantity was found; the prediction describes the base cookie dough.');
  if (recipe.butter_g > 0 && !butterFound) warnings.push('No butter state was found; defaulted to softened butter.');
  if (!mixingFound) warnings.push(`No mixing method was found; defaulted to ${recipe.mixing_method} mixing.`);
  if (!chillFound) warnings.push('No chill instruction was found; defaulted to 0 hours.');
  if (!temperatureFound) warnings.push('No bake temperature was found; defaulted to 350°F.');
  if (!bakeTimeFound) warnings.push('No bake time was found; defaulted to 10 minutes.');
  if (!sizeMatch) warnings.push('No cookie size was found; defaulted to 30 g.');
  if (unparsedLines.length > 0) warnings.push(`Could not map these measured ingredient lines: ${unparsedLines.slice(0, 4).join('; ')}`);

  return { recipe, warnings, unparsed_lines: unparsedLines };
}

export function analyzeRecipeText(recipeText) {
  const parsed = parseCookieRecipe(recipeText);
  const analysis = analyzeCookie(parsed.recipe);
  const warnings = [...new Set([
    ...parsed.warnings,
    ...(analysis.warnings || []),
    ...(analysis.cookie_failed ? analysis.reason || [] : []),
  ])];
  return {
    parsed_recipe: parsed.recipe,
    prediction: analysis.prediction,
    ml_prediction: analysis.ml_prediction,
    confidence: analysis.confidence,
    warnings,
    explanations: analysis.explanations || [],
    cookie_failed: analysis.cookie_failed,
  };
}
