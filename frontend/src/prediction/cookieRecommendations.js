import { analyzeCookie, NESTLE_TOLL_HOUSE } from './scienceEngine.js';

const PHENOTYPE_KEYS = [
  'spread',
  'thickness',
  'chewiness',
  'softness',
  'crispness',
  'cakiness',
  'browning',
  'flavor_depth',
];

const REQUIRED_PREFERENCES = ['texture', 'spread', 'flavor'];

export const DESIGN_PREFERENCE_RULES = Object.freeze({
  texture: {
    chewy: {
      label: 'Chewy',
      adjust: { white_sugar_g: -70, light_brown_sugar_g: 70, egg_yolk_g: 24, chill_hours: 12 },
      targets: { chewiness: 86, softness: 68, crispness: 30 },
      mechanism: 'more brown sugar, egg yolk, and resting time to retain moisture and build chew',
    },
    crispy: {
      label: 'Crispy',
      adjust: { white_sugar_g: 70, light_brown_sugar_g: -70, bake_time_min: 2 },
      targets: { crispness: 84, softness: 32, chewiness: 30 },
      mechanism: 'a higher white-sugar share and a longer bake for a drier, snappier bite',
    },
    soft: {
      label: 'Soft',
      adjust: { light_brown_sugar_g: 50, cornstarch_g: 16, bake_time_min: -1 },
      targets: { softness: 88, crispness: 28, chewiness: 62 },
      mechanism: 'brown sugar, cornstarch, and a shorter bake to preserve a tender center',
    },
    thick: {
      label: 'Thick',
      adjust: { flour_g: 55, chill_hours: 12 },
      set: { butter_state: 'softened', mixing_method: 'creamed' },
      targets: { thickness: 86, spread: 28 },
      mechanism: 'more flour, softened butter, creaming, and chilling to help the dough hold height',
    },
  },
  spread: {
    thin: {
      label: 'Thin + Wide',
      adjust: { flour_g: -55, white_sugar_g: 35 },
      set: { butter_state: 'melted', mixing_method: 'stirred', chill_hours: 0 },
      targets: { spread: 88, thickness: 24 },
      mechanism: 'melted butter, less flour, and no chilling so the dough can spread freely',
    },
    medium: {
      label: 'Medium + Classic',
      adjust: {},
      targets: { spread: 56, thickness: 54 },
      mechanism: 'the reference flour-to-fat ratio for a classic round cookie',
    },
    thick: {
      label: 'Thick + Tall',
      adjust: { flour_g: 45, chill_hours: 12 },
      set: { butter_state: 'softened', mixing_method: 'creamed' },
      targets: { thickness: 84, spread: 30 },
      mechanism: 'extra flour and chilled, creamed dough to set structure before the fat can spread',
    },
  },
  flavor: {
    caramel_molasses: {
      label: 'Caramel + Molasses',
      adjust: { white_sugar_g: -40, light_brown_sugar_g: 65, chill_hours: 24 },
      set: { butter_state: 'browned', mixing_method: 'stirred' },
      targets: { flavor_depth: 86, browning: 74, chewiness: 68 },
      mechanism: 'brown sugar, browned butter, and a long rest for deeper molasses and toasted notes',
    },
    classic: {
      label: 'Classic',
      adjust: {},
      targets: { flavor_depth: 52, browning: 60 },
      mechanism: 'the familiar Toll House balance of butter, white sugar, brown sugar, and chocolate',
    },
    buttery: {
      label: 'Buttery',
      adjust: { butter_g: 35, white_sugar_g: -15, chocolate_g: -20 },
      set: { butter_state: 'softened', mixing_method: 'creamed' },
      targets: { flavor_depth: 60, softness: 60, browning: 58 },
      mechanism: 'more softened butter with slightly less chocolate so the butter flavor stays forward',
    },
  },
});

const INGREDIENT_LABELS = {
  flour_g: 'all-purpose flour',
  butter_g: 'unsalted butter',
  shortening_g: 'shortening',
  oil_g: 'oil',
  white_sugar_g: 'white sugar',
  light_brown_sugar_g: 'light brown sugar',
  dark_brown_sugar_g: 'dark brown sugar',
  egg_g: 'whole egg',
  egg_yolk_g: 'egg yolk',
  baking_soda_g: 'baking soda',
  baking_powder_g: 'baking powder',
  cornstarch_g: 'cornstarch',
  chocolate_g: 'chocolate chips',
};

const INGREDIENT_ORDER = Object.keys(INGREDIENT_LABELS);

const VALUE_LIMITS = {
  flour_g: [180, 420],
  butter_g: [60, 220],
  white_sugar_g: [25, 260],
  light_brown_sugar_g: [25, 250],
  egg_g: [25, 140],
  egg_yolk_g: [0, 54],
  baking_soda_g: [0, 8],
  baking_powder_g: [0, 8],
  cornstarch_g: [0, 30],
  chocolate_g: [80, 300],
  chill_hours: [0, 36],
  bake_time_min: [8, 16],
};

const COMBINED_LIMITS = {
  flour_g: [-70, 70],
  butter_g: [-40, 55],
  white_sugar_g: [-90, 90],
  light_brown_sugar_g: [-90, 100],
  egg_g: [-25, 60],
  egg_yolk_g: [0, 36],
  baking_soda_g: [-4.6, 3],
  baking_powder_g: [0, 5],
  cornstarch_g: [0, 20],
  chocolate_g: [-50, 80],
  chill_hours: [-24, 24],
  bake_time_min: [-2, 4],
};

const PROFILE_SETTINGS = {
  science: {
    name: 'Science Match',
    description: 'Conservative adjustments with strong, familiar baking mechanisms.',
    intensity: 0.75,
  },
  recommended: {
    name: 'Cookie Lab Recommended',
    description: 'The adjustment level that best matches your targets in the frontend science engine.',
    intensity: 1,
  },
  experimental: {
    name: 'Experimental',
    description: 'A more assertive version that pushes the requested phenotype.',
    intensity: 1.35,
  },
};

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const mean = (values) => values.reduce((total, value) => total + value, 0) / values.length;
const formatNumber = (value) => Number.isInteger(Number(value)) ? String(Number(value)) : Number(value).toFixed(1);

const normalizePreferences = (preferences) => {
  const normalized = {};
  const labels = {};
  REQUIRED_PREFERENCES.forEach((question) => {
    const selected = preferences?.[question];
    const rule = DESIGN_PREFERENCE_RULES[question][selected];
    if (!rule) throw new Error(`Choose a valid ${question} preference.`);
    normalized[question] = selected;
    labels[question] = rule.label;
  });
  return { normalized, labels };
};

const collectRules = (preferences) => {
  const adjustments = {};
  const fixedValues = {};
  const targetValues = {};
  const mechanisms = [];

  REQUIRED_PREFERENCES.forEach((question) => {
    const rule = DESIGN_PREFERENCE_RULES[question][preferences[question]];
    Object.entries(rule.adjust || {}).forEach(([key, value]) => {
      adjustments[key] = (adjustments[key] || 0) + value;
    });
    Object.assign(fixedValues, rule.set || {});
    mechanisms.push({
      text: rule.mechanism,
      priority: Object.keys(rule.adjust || {}).length + Object.keys(rule.set || {}).length,
    });
    Object.entries(rule.targets).forEach(([trait, target]) => {
      targetValues[trait] = [...(targetValues[trait] || []), target];
    });
  });

  Object.entries(adjustments).forEach(([key, value]) => {
    if (COMBINED_LIMITS[key]) adjustments[key] = clamp(value, ...COMBINED_LIMITS[key]);
  });

  const targets = Object.fromEntries(Object.entries(targetValues).map(([trait, values]) => (
    [trait, Math.round(mean(values) * 10) / 10]
  )));
  mechanisms.sort((first, second) => second.priority - first.priority);
  return { adjustments, fixedValues, targets, mechanisms };
};

const roundRecipeValue = (key, value) => {
  if (['baking_soda_g', 'baking_powder_g'].includes(key)) return Math.round(value * 10) / 10;
  if (key === 'bake_time_min') return Math.round(value * 2) / 2;
  return Math.round(value);
};

const buildRecipe = (adjustments, fixedValues, intensity) => {
  const recipe = { ...NESTLE_TOLL_HOUSE };
  Object.entries(adjustments).forEach(([key, delta]) => {
    let nextValue = recipe[key] + delta * intensity;
    if (VALUE_LIMITS[key]) nextValue = clamp(nextValue, ...VALUE_LIMITS[key]);
    recipe[key] = roundRecipeValue(key, nextValue);
  });
  Object.assign(recipe, fixedValues);
  recipe.dough_temperature = recipe.chill_hours > 0 ? 'chilled' : 'room';
  return recipe;
};

const matchScore = (prediction, targets, warningCount) => {
  const differences = Object.entries(targets).map(([trait, target]) => (
    Math.abs(Number(prediction[trait] ?? 50) - target)
  ));
  return Math.round(clamp(100 - mean(differences) - warningCount * 2, 0, 100) * 10) / 10;
};

const ingredientList = (recipe) => INGREDIENT_ORDER.flatMap((key) => {
  const amount = recipe[key] || 0;
  if (amount <= 0) return [];
  let display = `${formatNumber(amount)} g ${INGREDIENT_LABELS[key]}`;
  if (key === 'egg_g') display += ` (about ${formatNumber(amount / 50)} large egg${amount === 50 ? '' : 's'})`;
  if (key === 'egg_yolk_g') display += ` (about ${formatNumber(amount / 18)} yolk${amount === 18 ? '' : 's'})`;
  return [{ key, name: INGREDIENT_LABELS[key], amount_g: amount, display }];
});

const processList = (recipe) => [
  `Butter: ${recipe.butter_state}`,
  `Mixing method: ${recipe.mixing_method}`,
  `Dough chill: ${formatNumber(recipe.chill_hours)} hour${recipe.chill_hours === 1 ? '' : 's'}`,
  `Bake at ${formatNumber(recipe.bake_temp_f)}°F for ${formatNumber(recipe.bake_time_min)} minutes`,
  `Portion size: ${formatNumber(recipe.cookie_size_g)} g`,
];

const changeList = (recipe) => {
  const changes = [];
  INGREDIENT_ORDER.forEach((key) => {
    const difference = Math.round((recipe[key] - NESTLE_TOLL_HOUSE[key]) * 10) / 10;
    if (difference === 0) return;
    const amount = formatNumber(Math.abs(difference));
    if (key === 'egg_yolk_g' && difference > 0) {
      changes.push(`Added ${amount} g egg yolk (about ${formatNumber(difference / 18)} yolks)`);
    } else if (difference > 0) {
      changes.push(`Added ${amount} g ${INGREDIENT_LABELS[key]}`);
    } else {
      changes.push(`Reduced ${INGREDIENT_LABELS[key]} by ${amount} g`);
    }
  });

  if (recipe.butter_state !== NESTLE_TOLL_HOUSE.butter_state) {
    changes.push(`Used ${recipe.butter_state} butter instead of ${NESTLE_TOLL_HOUSE.butter_state} butter`);
  }
  if (recipe.mixing_method !== NESTLE_TOLL_HOUSE.mixing_method) {
    changes.push(`Used the ${recipe.mixing_method} method instead of ${NESTLE_TOLL_HOUSE.mixing_method}`);
  }
  if (recipe.chill_hours !== NESTLE_TOLL_HOUSE.chill_hours) {
    changes.push(`Chilled the dough for ${formatNumber(recipe.chill_hours)} hours`);
  }
  const bakeDifference = recipe.bake_time_min - NESTLE_TOLL_HOUSE.bake_time_min;
  if (bakeDifference !== 0) {
    changes.push(`${bakeDifference > 0 ? 'Increased' : 'Reduced'} bake time by ${formatNumber(Math.abs(bakeDifference))} minutes`);
  }
  return changes.length > 0 ? changes : ['Kept the Toll House-style baseline unchanged'];
};

const explanation = (profileKey, mechanisms) => {
  const prefix = {
    science: 'This conservative match uses',
    recommended: 'This engine-selected match uses',
    experimental: 'This more assertive match uses',
  }[profileKey];
  return `${prefix} ${mechanisms[0].text}; it also uses ${mechanisms[1].text}.`;
};

const evaluateCandidate = (profileKey, intensity, ruleSet) => {
  const recipe = buildRecipe(ruleSet.adjustments, ruleSet.fixedValues, intensity);
  const analysis = analyzeCookie(recipe);
  if (analysis.cookie_failed) return null;
  const predictedPhenotype = Object.fromEntries(PHENOTYPE_KEYS.map((trait) => (
    [trait, Math.round(Number(analysis.prediction[trait] ?? 50) * 10) / 10]
  )));
  const profile = PROFILE_SETTINGS[profileKey];
  return {
    name: profile.name,
    profile: profileKey,
    profile_description: profile.description,
    intensity,
    match_score: matchScore(predictedPhenotype, ruleSet.targets, analysis.warnings.length),
    changes: changeList(recipe),
    recipe,
    ingredients: ingredientList(recipe),
    process: processList(recipe),
    predicted_phenotype: predictedPhenotype,
    confidence_score: analysis.confidence.score,
    confidence_label: analysis.confidence.confidence,
    explanation: explanation(profileKey, ruleSet.mechanisms),
    warnings: analysis.warnings,
  };
};

export function generateCookieRecommendations(userPreferences) {
  const { normalized, labels } = normalizePreferences(userPreferences);
  const ruleSet = collectRules(normalized);
  const science = evaluateCandidate('science', PROFILE_SETTINGS.science.intensity, ruleSet);
  const recommendedOptions = [0.9, 1, 1.1, 1.2]
    .map((intensity) => evaluateCandidate('recommended', intensity, ruleSet))
    .filter(Boolean);
  const recommended = recommendedOptions.reduce((best, candidate) => {
    const candidateScore = candidate.match_score - Math.abs(candidate.intensity - 1) * 0.5;
    const bestScore = best.match_score - Math.abs(best.intensity - 1) * 0.5;
    return candidateScore > bestScore ? candidate : best;
  });
  const experimental = evaluateCandidate('experimental', PROFILE_SETTINGS.experimental.intensity, ruleSet);
  const recommendations = [science, recommended, experimental].filter(Boolean);
  if (recommendations.length !== 3) throw new Error('These preferences produced an invalid cookie candidate.');

  const ranked = [...recommendations].sort((first, second) => second.match_score - first.match_score);
  ranked.forEach((recommendation, index) => {
    recommendation.rank = index + 1;
  });

  return {
    baseline_recipe: { ...NESTLE_TOLL_HOUSE },
    preferences: labels,
    target_phenotype: ruleSet.targets,
    recommendations,
    ranking: ranked.map((recommendation) => recommendation.name),
  };
}
