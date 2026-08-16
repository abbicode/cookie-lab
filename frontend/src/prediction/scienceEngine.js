import predictionData from './predictionData.json' with { type: 'json' };

const TRAITS = Object.freeze([
  'spread',
  'thickness',
  'chewiness',
  'softness',
  'crispness',
  'cakiness',
  'browning',
  'flavor_depth',
]);

const STRENGTH = Object.freeze({ weak: 3, moderate: 6, strong: 12 });

export const NESTLE_TOLL_HOUSE = Object.freeze({
  flour_g: 280,
  butter_g: 113,
  shortening_g: 0,
  oil_g: 0,
  white_sugar_g: 150,
  light_brown_sugar_g: 150,
  dark_brown_sugar_g: 0,
  egg_g: 50,
  egg_yolk_g: 0,
  baking_soda_g: 4.6,
  baking_powder_g: 0,
  cornstarch_g: 0,
  chocolate_g: 170,
  butter_state: 'softened',
  flour_type: 'ap',
  mixing_method: 'creamed',
  chill_hours: 0,
  dough_temperature: 'room',
  bake_temp_f: 350,
  bake_time_min: 10,
  cookie_size_g: 30,
});

const numberValue = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const safeDivide = (numerator, denominator) => (
  denominator === 0 || denominator == null ? 0 : numerator / denominator
);

const clamp = (value, minimum = 0, maximum = 100) => (
  Math.min(maximum, Math.max(minimum, value))
);

const roundedProbability = (value) => Math.round(clamp(value, 0.02, 0.98) * 1000) / 1000;

export function normalizeRecipe(recipe, process = {}) {
  if (Object.hasOwn(recipe, 'flour_g')) {
    const merged = { ...NESTLE_TOLL_HOUSE, ...recipe };
    return {
      ...merged,
      dough_temperature: numberValue(merged.chill_hours) > 0 ? 'chilled' : 'room',
    };
  }

  return {
    flour_g: numberValue(recipe.flour),
    butter_g: numberValue(recipe.butter),
    shortening_g: numberValue(recipe.shortening),
    oil_g: numberValue(recipe.oil),
    white_sugar_g: numberValue(recipe.granulatedSugar),
    light_brown_sugar_g: numberValue(recipe.brownSugar),
    dark_brown_sugar_g: 0,
    egg_g: numberValue(recipe.eggs) * 50,
    egg_yolk_g: numberValue(recipe.eggYolks) * 18,
    baking_soda_g: numberValue(recipe.bakingSoda),
    baking_powder_g: numberValue(recipe.bakingPowder),
    cornstarch_g: numberValue(recipe.cornstarch),
    chocolate_g: numberValue(recipe.chocolateChips),
    butter_state: process.butterPreparation || 'softened',
    flour_type: recipe.flourType || 'ap',
    mixing_method: process.mixingMethod || 'creamed',
    chill_hours: numberValue(process.chillTime),
    dough_temperature: numberValue(process.chillTime) > 0 ? 'chilled' : 'room',
    bake_temp_f: numberValue(process.ovenTemp, 350),
    bake_time_min: numberValue(process.bakeTime, 10),
    cookie_size_g: numberValue(process.cookieSize, 30),
  };
}

export function engineerCookieFeatures(rawRecipe) {
  const recipe = normalizeRecipe(rawRecipe);
  const totalFat = recipe.butter_g + recipe.shortening_g + recipe.oil_g;
  const totalBrownSugar = recipe.light_brown_sugar_g + recipe.dark_brown_sugar_g;
  const totalSugar = recipe.white_sugar_g + totalBrownSugar;
  const totalLeavener = recipe.baking_soda_g + recipe.baking_powder_g;

  return {
    ...recipe,
    total_fat_g: totalFat,
    total_sugar_g: totalSugar,
    total_brown_sugar_g: totalBrownSugar,
    total_leavener_g: totalLeavener,
    fat_flour_ratio: safeDivide(totalFat, recipe.flour_g),
    butter_flour_ratio: safeDivide(recipe.butter_g, recipe.flour_g),
    sugar_flour_ratio: safeDivide(totalSugar, recipe.flour_g),
    brown_sugar_fraction: safeDivide(totalBrownSugar, totalSugar),
    white_sugar_fraction: safeDivide(recipe.white_sugar_g, totalSugar),
    egg_flour_ratio: safeDivide(recipe.egg_g, recipe.flour_g),
    yolk_flour_ratio: safeDivide(recipe.egg_yolk_g, recipe.flour_g),
    soda_flour_ratio: safeDivide(recipe.baking_soda_g, recipe.flour_g),
    powder_flour_ratio: safeDivide(recipe.baking_powder_g, recipe.flour_g),
    cornstarch_flour_ratio: safeDivide(recipe.cornstarch_g, recipe.flour_g),
    chocolate_flour_ratio: safeDivide(recipe.chocolate_g, recipe.flour_g),
    leavener_flour_ratio: safeDivide(totalLeavener, recipe.flour_g),
    has_shortening: recipe.shortening_g > 0,
    has_oil: recipe.oil_g > 0,
    has_butter: recipe.butter_g > 0,
    has_baking_soda: recipe.baking_soda_g > 0,
    has_baking_powder: recipe.baking_powder_g > 0,
    uses_both_leaveners: recipe.baking_soda_g > 0 && recipe.baking_powder_g > 0,
    is_chilled: recipe.chill_hours > 0,
    is_melted_butter: recipe.butter_state === 'melted',
    is_browned_butter: recipe.butter_state === 'browned',
    is_creamed: recipe.mixing_method === 'creamed',
  };
}

export function validateCookie(features) {
  const failures = [];
  const warnings = [];

  if (features.flour_g <= 0) failures.push('No flour detected: cookie lacks structure.');
  if (features.total_fat_g <= 0) failures.push('No fat detected: cookie lacks richness and texture.');
  if (features.total_sugar_g <= 0) failures.push('No sugar detected: cookie chemistry is outside normal range.');

  if (features.flour_g < 100) warnings.push('Very low flour amount.');
  if (features.sugar_flour_ratio < 0.2) warnings.push('Very low sugar-to-flour ratio.');
  if (features.sugar_flour_ratio > 1.5) warnings.push('Very high sugar-to-flour ratio: cookie may spread excessively.');
  if (features.fat_flour_ratio > 1) warnings.push('Very high fat-to-flour ratio: possible excessive spreading.');
  if (features.fat_flour_ratio < 0.2) warnings.push('Very low fat-to-flour ratio: cookie may be dry.');
  if (features.egg_g === 0) warnings.push('No egg detected: cookie may be crumbly.');
  if (features.total_leavener_g === 0) warnings.push('No leavening detected: cookie may be dense.');

  return { valid: failures.length === 0, failures, warnings };
}

const neutralScores = () => Object.fromEntries(TRAITS.map((trait) => [trait, 50]));

export function predictScience(features) {
  const scores = neutralScores();

  if (features.butter_state === 'melted') {
    scores.spread += STRENGTH.strong;
    scores.thickness -= STRENGTH.strong;
    scores.softness += STRENGTH.moderate;
    scores.crispness += STRENGTH.moderate;
    scores.cakiness -= STRENGTH.moderate;
  } else if (features.butter_state === 'cold') {
    scores.spread -= STRENGTH.strong;
    scores.thickness += STRENGTH.strong;
    scores.softness += STRENGTH.weak;
  }

  if (features.flour_g >= 320) {
    scores.spread -= STRENGTH.strong;
    scores.thickness += STRENGTH.strong;
    scores.softness -= STRENGTH.moderate;
    scores.cakiness += STRENGTH.moderate;
  } else if (features.flour_g <= 230) {
    scores.spread += STRENGTH.strong;
    scores.thickness -= STRENGTH.strong;
    scores.crispness += STRENGTH.moderate;
  }

  if (features.egg_flour_ratio >= 0.35) {
    scores.thickness += STRENGTH.moderate;
    scores.softness += STRENGTH.moderate;
    scores.cakiness += STRENGTH.strong;
    scores.crispness -= STRENGTH.moderate;
  } else if (features.egg_flour_ratio <= 0.1) {
    scores.chewiness -= STRENGTH.moderate;
    scores.softness -= STRENGTH.moderate;
    scores.crispness += STRENGTH.moderate;
  }

  if (features.has_baking_powder && !features.has_baking_soda) {
    scores.thickness += STRENGTH.strong;
    scores.cakiness += STRENGTH.strong;
    scores.spread -= STRENGTH.moderate;
  } else if (features.has_baking_soda && !features.has_baking_powder) {
    scores.spread += STRENGTH.weak;
    scores.browning += STRENGTH.moderate;
    scores.crispness += STRENGTH.moderate;
  } else if (features.uses_both_leaveners) {
    scores.spread += STRENGTH.weak;
    scores.thickness += STRENGTH.weak;
    scores.softness += STRENGTH.weak;
  }

  if (features.has_shortening) {
    scores.spread -= STRENGTH.moderate;
    scores.thickness += STRENGTH.moderate;
    scores.softness += STRENGTH.weak;
  }
  if (features.has_oil) {
    scores.spread += STRENGTH.strong;
    scores.thickness -= STRENGTH.moderate;
    scores.softness += STRENGTH.moderate;
  }

  if (features.sugar_flour_ratio >= 1) {
    scores.spread += STRENGTH.moderate;
    scores.crispness += STRENGTH.moderate;
    scores.browning += STRENGTH.moderate;
  } else if (features.sugar_flour_ratio <= 0.5) {
    scores.spread -= STRENGTH.moderate;
    scores.crispness -= STRENGTH.moderate;
    scores.browning -= STRENGTH.weak;
  }

  if (features.flour_type === 'bread') {
    scores.chewiness += STRENGTH.moderate;
    scores.softness -= STRENGTH.weak;
  } else if (features.flour_type === 'cake') {
    scores.softness += STRENGTH.moderate;
    scores.chewiness -= STRENGTH.weak;
    scores.cakiness += STRENGTH.weak;
  }

  if (features.mixing_method === 'creamed') {
    scores.cakiness += STRENGTH.weak;
    scores.thickness += STRENGTH.weak;
  } else if (features.mixing_method === 'stirred') {
    scores.softness += STRENGTH.moderate;
    scores.cakiness -= STRENGTH.weak;
  }

  if (features.bake_time_min >= 14) {
    scores.crispness += STRENGTH.strong;
    scores.softness -= STRENGTH.moderate;
  } else if (features.bake_time_min <= 8) {
    scores.softness += STRENGTH.moderate;
    scores.crispness -= STRENGTH.moderate;
  }

  if (features.bake_temp_f >= 400) {
    scores.browning += STRENGTH.moderate;
    scores.crispness += STRENGTH.moderate;
  } else if (features.bake_temp_f <= 325) {
    scores.softness += STRENGTH.weak;
  }

  if (features.chocolate_flour_ratio >= 0.75) {
    scores.softness += STRENGTH.weak;
    scores.flavor_depth += STRENGTH.moderate;
  }
  if (features.cookie_size_g >= 70) {
    scores.softness += STRENGTH.moderate;
    scores.thickness += STRENGTH.moderate;
  } else if (features.cookie_size_g <= 25) {
    scores.crispness += STRENGTH.moderate;
  }

  if (features.chill_hours >= 24) {
    scores.spread -= 12;
    scores.thickness += 12;
    scores.chewiness += 6;
    scores.flavor_depth += 6;
  } else if (features.chill_hours >= 2) {
    scores.spread -= 6;
    scores.thickness += 6;
  } else if (features.chill_hours === 0) {
    scores.spread += 3;
  }

  if (features.white_sugar_fraction >= 0.75) {
    scores.spread += STRENGTH.moderate;
    scores.crispness += STRENGTH.strong;
    scores.softness -= STRENGTH.moderate;
    scores.chewiness -= STRENGTH.weak;
    scores.browning -= STRENGTH.weak;
  } else if (features.brown_sugar_fraction >= 0.75) {
    scores.softness += STRENGTH.strong;
    scores.chewiness += STRENGTH.strong;
    scores.crispness -= STRENGTH.moderate;
    scores.spread -= STRENGTH.weak;
    scores.browning += STRENGTH.moderate;
    scores.flavor_depth += STRENGTH.moderate;
  } else if (features.brown_sugar_fraction >= 0.4 && features.brown_sugar_fraction <= 0.6) {
    scores.softness += STRENGTH.weak;
    scores.chewiness += STRENGTH.weak;
    scores.crispness += STRENGTH.weak;
  }

  if (features.butter_state === 'browned') {
    scores.browning += STRENGTH.moderate;
    scores.softness -= STRENGTH.weak;
    scores.flavor_depth += STRENGTH.strong;
  }
  if (features.yolk_flour_ratio >= 0.08) {
    scores.chewiness += STRENGTH.moderate;
    scores.softness += STRENGTH.moderate;
    scores.cakiness -= STRENGTH.weak;
  }
  if (features.cornstarch_flour_ratio >= 0.05) {
    scores.softness += STRENGTH.moderate;
    scores.thickness += STRENGTH.weak;
    scores.chewiness -= STRENGTH.weak;
  }

  Object.keys(scores).forEach((trait) => {
    scores[trait] = clamp(scores[trait]);
  });

  if (features.fat_flour_ratio > 0.7 && features.sugar_flour_ratio > 0.8) {
    scores.spread += 8;
    scores.thickness -= 8;
  }
  if (features.butter_state === 'melted' && features.brown_sugar_fraction > 0.6) {
    scores.chewiness += 8;
    scores.softness += 8;
  }
  if (features.egg_flour_ratio > 0.3 && features.has_baking_powder) {
    scores.cakiness += 12;
  }

  Object.keys(scores).forEach((trait) => {
    scores[trait] = Math.round(clamp(scores[trait]) * 10) / 10;
  });
  return scores;
}

const ruleContribution = (features, rule) => {
  const value = features[rule.feature];
  if (rule.type === 'boolean') {
    const reference = rule.reference === true;
    return ((value ? 1 : 0) - (reference ? 1 : 0)) * rule.effect;
  }
  if (rule.type === 'category') return value === rule.value ? rule.effect : 0;
  if (rule.type === 'delta') {
    const normalized = safeDivide(numberValue(value) - rule.reference, rule.scale || 1);
    return clamp(normalized, -1, 1) * rule.effect;
  }
  return 0;
};

export function predictMlReference(features) {
  return Object.fromEntries(Object.entries(predictionData.mlReferenceModels).map(([texture, model]) => {
    const probability = model.rules.reduce(
      (current, rule) => current + ruleContribution(features, rule),
      model.baselineProbability,
    );
    const rounded = roundedProbability(probability);
    return [texture, { prediction: rounded >= 0.5, probability: rounded }];
  }));
}

export function calculateConfidence(features, prediction, warnings, mlPrediction) {
  let score = 50;
  const reasons = [];
  let evidenceCount = 0;

  if (['melted', 'softened', 'cold', 'browned'].includes(features.butter_state)) {
    evidenceCount += 1;
    reasons.push('Butter state has experimental support.');
  }
  if (features.brown_sugar_fraction !== features.white_sugar_fraction) {
    evidenceCount += 1;
    reasons.push('Sugar composition has experimental support.');
  }
  if (features.chill_hours > 0) {
    evidenceCount += 1;
    reasons.push('Dough chilling has experimental support.');
  }
  if (features.flour_g >= 200 && features.flour_g <= 400) {
    evidenceCount += 1;
    reasons.push('Flour amount is within tested range.');
  }

  if (evidenceCount >= 3) score += 20;
  else if (evidenceCount === 2) score += 10;

  if (features.fat_flour_ratio >= 0.3 && features.fat_flour_ratio <= 0.8) {
    score += 10;
    reasons.push('Fat ratio is within normal cookie range.');
  } else {
    score -= 10;
    reasons.push('Fat ratio is unusual.');
  }

  if (features.sugar_flour_ratio >= 0.5 && features.sugar_flour_ratio <= 1.2) {
    score += 10;
    reasons.push('Sugar ratio is within normal cookie range.');
  } else {
    score -= 10;
    reasons.push('Sugar ratio is unusual.');
  }

  if (features.has_oil && features.has_shortening) {
    score -= 10;
    reasons.push('Multiple fat sources reduce confidence.');
  }

  Object.entries(mlPrediction).forEach(([texture, result]) => {
    if (result.probability >= 0.65) {
      score += 10;
      reasons.push(`ML-derived evidence strongly supports ${texture} texture.`);
    } else if (result.probability >= 0.55) {
      score += 5;
      reasons.push(`ML-derived evidence moderately supports ${texture} texture.`);
    } else if (result.probability >= 0.45 && result.probability <= 0.55) {
      score -= 5;
      reasons.push(`ML-derived evidence is uncertain about ${texture} texture.`);
    }
  });

  const agreementChecks = [
    ['chewiness', 'chewy'],
    ['crispness', 'crispy'],
    ['softness', 'soft'],
    ['thickness', 'thick'],
  ];
  agreementChecks.forEach(([scienceTrait, mlTrait]) => {
    if (prediction[scienceTrait] >= 60 && mlPrediction[mlTrait].probability >= 0.5) {
      score += 5;
      reasons.push(`Science and ML-derived evidence agree on ${scienceTrait}.`);
    } else if (prediction[scienceTrait] >= 60 && mlPrediction[mlTrait].probability < 0.3) {
      score -= 10;
      reasons.push(`Science and ML-derived evidence disagree on ${scienceTrait}.`);
    }
  });

  if (warnings.length > 0) {
    score -= warnings.length * 10;
    reasons.push(`${warnings.length} warning(s) reduced confidence.`);
  }

  score = Math.round(clamp(score));
  const thresholds = predictionData.confidenceLevels;
  const label = score >= thresholds.veryHigh
    ? 'Very High'
    : score >= thresholds.high
      ? 'High'
      : score >= thresholds.medium
        ? 'Medium'
        : 'Low';

  return { confidence: label, score, reason: reasons };
}

export function generateExplanations(recipe, prediction) {
  const explanations = [];
  const fatType = recipe.oil_g > 0 ? 'oil' : recipe.shortening_g > 0 ? 'shortening' : 'butter';
  const eggCount = recipe.egg_g === 0 ? 0 : recipe.egg_g >= 90 ? 2 : 1;

  if (fatType === 'oil') {
    explanations.push('Oil increases spread because it is fully liquid and cannot trap air during mixing like solid butter can.');
  } else if (fatType === 'shortening') {
    explanations.push('Shortening can create a thicker cookie because it remains solid during mixing and contains less water than butter.');
  } else if (recipe.butter_state === 'melted') {
    explanations.push('Melted butter increases spread because liquid fat cannot trap as much air during mixing, allowing the cookie to flatten more.');
  } else if (recipe.butter_state === 'browned') {
    explanations.push('Browned butter removes water while adding toasted, nutty flavor, increasing flavor depth and surface browning.');
  } else if (recipe.butter_state === 'softened') {
    explanations.push('Softened butter helps create structure by allowing air to be incorporated during mixing, supporting a thicker cookie.');
  }

  if (eggCount === 0) {
    explanations.push('Without eggs, the cookie has less binding and moisture, which can make the texture more crumbly and fragile.');
  } else if (eggCount >= 2) {
    explanations.push('Additional egg increases moisture and structure, which can create a softer and more cake-like texture.');
  }

  if (recipe.chill_hours >= 12) {
    explanations.push(`The dough was chilled for ${recipe.chill_hours} hours, reducing spread while giving flour more time to hydrate.`);
  } else if (recipe.chill_hours === 0) {
    explanations.push('Skipping chilling allows the dough to spread more easily because the butter melts before the cookie structure fully sets.');
  }

  if (prediction.spread >= 70) explanations.push('This cookie is predicted to spread significantly because the dough has lower resistance to flow during baking.');
  else if (prediction.spread <= 45) explanations.push('This cookie is predicted to stay compact because the dough has enough structure to resist spreading.');
  if (prediction.thickness >= 65) explanations.push('The dough is predicted to maintain a thicker shape because its structure resists spreading.');
  if (prediction.crispness >= 70) explanations.push('The recipe favors lower moisture and more sugar browning, creating a crisper cookie.');
  if (prediction.chewiness >= 60) explanations.push('The recipe is predicted to be chewier because it retains more moisture.');
  if (prediction.softness >= 60) explanations.push('The recipe supports moisture retention, producing a softer texture.');
  if (prediction.cakiness >= 65) explanations.push('Additional moisture and structure push the crumb toward a softer, cake-like texture.');
  if (prediction.flavor_depth >= 65) explanations.push('Molasses, browning, resting time, or chocolate concentration deepen the predicted flavor.');

  return [...new Set(explanations)].slice(0, 4);
}

export function analyzeCookie(recipe, process) {
  const normalizedRecipe = normalizeRecipe(recipe, process);
  const features = engineerCookieFeatures(normalizedRecipe);
  const validity = validateCookie(features);

  if (!validity.valid) {
    return {
      cookie_failed: true,
      reason: validity.failures,
      warnings: validity.warnings,
      features,
    };
  }

  const prediction = predictScience(features);
  const mlPrediction = predictMlReference(features);
  const confidence = calculateConfidence(features, prediction, validity.warnings, mlPrediction);

  return {
    cookie_failed: false,
    prediction,
    ml_prediction: mlPrediction,
    confidence,
    warnings: validity.warnings,
    explanations: generateExplanations(normalizedRecipe, prediction),
    features,
  };
}

export { predictionData };
