export const INGREDIENT_CONTROLS = Object.freeze([
  { key: 'flour', label: 'All-purpose flour', baseline: 281, min: 100, max: 450, step: 5, unit: 'g' },
  { key: 'bakingSoda', label: 'Baking soda', baseline: 4.6, min: 0, max: 12, step: 0.1, unit: 'g' },
  { key: 'chocolateChips', label: 'Chocolate chips', baseline: 340, min: 0, max: 500, step: 5, unit: 'g' },
  { key: 'butter', label: 'Butter', baseline: 226, min: 0, max: 350, step: 5, unit: 'g' },
  { key: 'granulatedSugar', label: 'Granulated sugar', baseline: 150, min: 0, max: 300, step: 5, unit: 'g' },
  { key: 'vanilla', label: 'Vanilla extract', baseline: 5, min: 0, max: 20, step: 0.5, unit: 'ml' },
  { key: 'eggs', label: 'Whole eggs', baseline: 2, min: 0, max: 4, step: 1, unit: 'eggs' },
  { key: 'brownSugar', label: 'Brown sugar', baseline: 165, min: 0, max: 300, step: 5, unit: 'g' },
  { key: 'bakingPowder', label: 'Baking powder', baseline: 0, min: 0, max: 10, step: 0.1, unit: 'g' },
  { key: 'shortening', label: 'Shortening', baseline: 0, min: 0, max: 250, step: 5, unit: 'g' },
  { key: 'salt', label: 'Salt', baseline: 6, min: 0, max: 12, step: 0.5, unit: 'g' },
]);

export const PROCESS_CONTROLS = Object.freeze([
  { key: 'chillTime', label: 'Dough chill', baseline: 0, min: 0, max: 48, step: 1, unit: 'hr' },
  { key: 'ovenTemp', label: 'Oven temperature', baseline: 375, min: 300, max: 425, step: 5, unit: '°F' },
  { key: 'bakeTime', label: 'Bake time', baseline: 10, min: 6, max: 18, step: 1, unit: 'min' },
  { key: 'cookieSize', label: 'Cookie size', baseline: 20, min: 20, max: 100, step: 5, unit: 'g' },
]);

export const BUTTER_PREPARATIONS = Object.freeze([
  { value: 'cold', label: 'Cold' },
  { value: 'softened', label: 'Softened' },
  { value: 'melted', label: 'Melted' },
  { value: 'browned', label: 'Browned' },
]);

export const MIXING_METHODS = Object.freeze([
  { value: 'creamed', label: 'Creamed' },
  { value: 'stirred', label: 'Stirred' },
]);

// Gram equivalents of the Original Nestlé Toll House Chocolate Chip Cookie recipe:
// 2¼ cups flour, 1 tsp soda, 1 tsp salt, 1 cup butter, ¾ cup of each sugar,
// 1 tsp vanilla, 2 eggs, and one 12 oz bag of semi-sweet morsels.
export const TOLL_HOUSE_BASELINE_RECIPE = Object.freeze(Object.fromEntries(
  INGREDIENT_CONTROLS.map((ingredient) => [ingredient.key, ingredient.baseline]),
));

export const TOLL_HOUSE_BASELINE_PROCESS = Object.freeze({
  ...Object.fromEntries(PROCESS_CONTROLS.map((control) => [control.key, control.baseline])),
  butterPreparation: 'softened',
  mixingMethod: 'creamed',
});

export const BASELINE_RECIPE = TOLL_HOUSE_BASELINE_RECIPE;
export const BASELINE_PROCESS = TOLL_HOUSE_BASELINE_PROCESS;

export const PHENOTYPE_ORDER = Object.freeze([
  'Spread',
  'Thickness',
  'Chewiness',
  'Softness',
  'Crispness',
  'Cakiness',
  'Browning',
]);

// V1 calibration lives here. Each coefficient is the number of phenotype points
// contributed by one normalized unit of the named recipe or process signal.
export const PHENOTYPE_WEIGHTS = Object.freeze({
  baseline: {
    Spread: 54,
    Thickness: 50,
    Chewiness: 56,
    Softness: 53,
    Crispness: 49,
    Cakiness: 45,
    Browning: 54,
  },
  fat_flour_ratio: {
    Spread: 16, Thickness: -13, Chewiness: 4, Softness: 6,
    Crispness: 4, Cakiness: -8, Browning: 2,
  },
  sugar_flour_ratio: {
    Spread: 18, Thickness: -8, Chewiness: 4, Softness: 2,
    Crispness: 15, Cakiness: -6, Browning: 18,
  },
  brown_sugar_fraction: {
    Spread: -2, Thickness: 1, Chewiness: 8, Softness: 8,
    Crispness: -7, Cakiness: 1, Browning: 5,
  },
  white_sugar_fraction: {
    Spread: 4, Thickness: -1, Chewiness: -6, Softness: -7,
    Crispness: 8, Cakiness: -1, Browning: 0,
  },
  egg_flour_ratio: {
    Spread: -3, Thickness: 5, Chewiness: 4, Softness: 10,
    Crispness: -8, Cakiness: 14, Browning: 2,
  },
  excess_egg: {
    Spread: -2, Thickness: 3, Chewiness: -4, Softness: 4,
    Crispness: -3, Cakiness: 12, Browning: 0,
  },
  soda_flour_ratio: {
    Spread: 8, Thickness: -4, Chewiness: 0, Softness: -1,
    Crispness: 2, Cakiness: -6, Browning: 12,
  },
  powder_flour_ratio: {
    Spread: -7, Thickness: 9, Chewiness: -2, Softness: 3,
    Crispness: -3, Cakiness: 12, Browning: 0,
  },
  shortening_fraction: {
    Spread: -14, Thickness: 13, Chewiness: 2, Softness: 8,
    Crispness: -4, Cakiness: 3, Browning: -3,
  },
  chocolate_flour_ratio: {
    Spread: -3, Thickness: 2, Chewiness: 0, Softness: 0,
    Crispness: 0, Cakiness: 0, Browning: 0,
  },
  chill: {
    Spread: -15, Thickness: 12, Chewiness: 5, Softness: 3,
    Crispness: -3, Cakiness: 2, Browning: 0,
  },
  oven_temperature: {
    Spread: -6, Thickness: 5, Chewiness: -2, Softness: -2,
    Crispness: 3, Cakiness: 2, Browning: 8,
  },
  bake_exposure: {
    Spread: -2, Thickness: 1, Chewiness: -10, Softness: -18,
    Crispness: 20, Cakiness: -2, Browning: 17,
  },
  hot_long_bake: {
    Spread: 0, Thickness: 0, Chewiness: -3, Softness: -5,
    Crispness: 6, Cakiness: -1, Browning: 8,
  },
  cookie_size: {
    Spread: -4, Thickness: 20, Chewiness: 5, Softness: 16,
    Crispness: -15, Cakiness: 0, Browning: -5,
  },
  butterPreparation: {
    cold: {
      Spread: -10, Thickness: 10, Chewiness: 0, Softness: -1,
      Crispness: -2, Cakiness: 2, Browning: -1,
    },
    softened: {},
    melted: {
      Spread: 12, Thickness: -10, Chewiness: 4, Softness: -2,
      Crispness: 7, Cakiness: -7, Browning: 3,
    },
    browned: {
      Spread: 10, Thickness: -11, Chewiness: 3, Softness: -5,
      Crispness: 8, Cakiness: -8, Browning: 12,
    },
  },
  mixingMethod: {
    creamed: {},
    stirred: {
      Spread: 3, Thickness: -5, Chewiness: 3, Softness: 1,
      Crispness: 2, Cakiness: -8, Browning: 0,
    },
  },
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const safeDivide = (numerator, denominator) => numerator / Math.max(denominator, 1);
const relativeDelta = (value, baseline, min = -1.5, max = 1.5) => (
  clamp((value - baseline) / Math.max(Math.abs(baseline), 0.0001), min, max)
);

export function calculateCookieDNA(recipe) {
  const flour = Math.max(Number(recipe.flour) || 0, 1);
  const butter = Math.max(Number(recipe.butter) || 0, 0);
  const shortening = Math.max(Number(recipe.shortening) || 0, 0);
  const oil = Math.max(Number(recipe.oil) || 0, 0);
  const granulatedSugar = Math.max(Number(recipe.granulatedSugar) || 0, 0);
  const brownSugar = Math.max(Number(recipe.brownSugar) || 0, 0);
  const totalSugar = granulatedSugar + brownSugar;
  const totalFat = butter + shortening + oil;
  const eggMass = Math.max(Number(recipe.eggs) || 0, 0) * 50;

  return {
    fat_flour_ratio: safeDivide(totalFat, flour),
    sugar_flour_ratio: safeDivide(totalSugar, flour),
    brown_sugar_fraction: safeDivide(brownSugar, totalSugar),
    white_sugar_fraction: safeDivide(granulatedSugar, totalSugar),
    egg_flour_ratio: safeDivide(eggMass, flour),
    soda_flour_ratio: safeDivide(Math.max(Number(recipe.bakingSoda) || 0, 0), flour),
    powder_flour_ratio: safeDivide(Math.max(Number(recipe.bakingPowder) || 0, 0), flour),
    chocolate_flour_ratio: safeDivide(Math.max(Number(recipe.chocolateChips) || 0, 0), flour),
    shortening_fat_fraction: safeDivide(shortening, totalFat),
    butter_fat_fraction: safeDivide(butter, totalFat),
    oil_fat_fraction: safeDivide(oil, totalFat),
  };
}

const BASELINE_DNA = Object.freeze(calculateCookieDNA(BASELINE_RECIPE));

const addWeightedSignal = (scores, signal, weights) => {
  PHENOTYPE_ORDER.forEach((phenotype) => {
    scores[phenotype] += signal * (weights[phenotype] || 0);
  });
};

const candidate = (items, magnitude, text) => {
  if (magnitude > 0 && text) items.push({ magnitude, text });
};

const buildExplanations = (signals, recipe, process) => {
  const items = [];

  if (Math.abs(signals.fat) > 0.08) {
    candidate(
      items,
      Math.abs(signals.fat) * 16,
      signals.fat > 0
        ? 'A high fat-to-flour ratio encourages spread and tenderness.'
        : 'A low fat-to-flour ratio limits spread and builds a thicker, drier structure.',
    );
  }

  if (Math.abs(signals.sugar) > 0.08) {
    candidate(
      items,
      Math.abs(signals.sugar) * 18,
      signals.sugar > 0
        ? 'A high sugar-to-flour ratio increases spread, crispness, and browning.'
        : 'A low sugar-to-flour ratio restrains spread, crispness, and surface browning.',
    );
  }

  if (Math.abs(signals.brownSugar) > 0.08) {
    candidate(
      items,
      Math.abs(signals.brownSugar) * 15,
      signals.brownSugar > 0
        ? 'High brown-sugar share increases moisture retention, softness, and chewiness.'
        : 'High white-sugar share favors wider spread and a crisper bite.',
    );
  }

  if (signals.shortening > 0.04) {
    candidate(items, signals.shortening * 14, 'Shortening improves shape retention, thickness, and tenderness.');
  }

  if (Math.abs(signals.egg) > 0.12) {
    candidate(
      items,
      Math.abs(signals.egg) * 14,
      signals.egg > 0
        ? 'A high egg-to-flour ratio adds structure and softness, with a cakier result at the upper end.'
        : 'A low egg-to-flour ratio reduces cohesion and shifts the bite toward dry and crunchy.',
    );
  }

  if (signals.powder > 0.08 && Number(recipe.bakingSoda) > 0) {
    candidate(items, signals.powder * 10, 'Using both leaveners balances soda-driven spread with powder-driven lift.');
  } else if (signals.powder > 0.08) {
    candidate(items, signals.powder * 12, 'A higher baking-powder ratio adds lift and cakiness while limiting spread.');
  } else if (Math.abs(signals.soda) > 0.12) {
    candidate(
      items,
      Math.abs(signals.soda) * 12,
      signals.soda > 0
        ? 'A higher baking-soda ratio promotes spread and browning with less puff.'
        : 'Less baking soda restrains spread and surface browning.',
    );
  }

  const butterPreparation = process.butterPreparation || 'softened';
  const butterReasons = {
    cold: 'Cold butter delays melting, reducing spread and preserving thickness.',
    melted: 'Melted butter pushes the dough toward greater spread and less aeration.',
    browned: 'Browned butter behaves like melted fat with less water, increasing spread, crispness, and browning.',
  };
  candidate(items, butterPreparation === 'softened' ? 0 : 18, butterReasons[butterPreparation]);

  if (process.mixingMethod === 'stirred') {
    candidate(items, 10, 'Stirring incorporates less air than creaming, producing a denser, less cakey cookie.');
  }

  if (signals.chill > 0.02) {
    candidate(
      items,
      signals.chill * 16,
      `A ${Number(process.chillTime)}-hour chill offsets spread by delaying fat melting.`,
    );
  }

  if (Math.abs(signals.bakeExposure) > 0.08) {
    candidate(
      items,
      Math.abs(signals.bakeExposure) * 20,
      signals.bakeExposure > 0
        ? 'Greater time-and-temperature exposure dries the crumb while increasing crispness and browning.'
        : 'Lower bake exposure preserves a softer center and limits browning.',
    );
  }

  if (Math.abs(signals.ovenTemperature) > 0.18) {
    candidate(
      items,
      Math.abs(signals.ovenTemperature) * 8,
      signals.ovenTemperature > 0
        ? 'Higher oven heat sets the structure sooner and accelerates surface browning.'
        : 'Lower oven heat extends the spread window and slows surface browning.',
    );
  }

  if (signals.cookieSize > 0.02) {
    candidate(
      items,
      signals.cookieSize * 20,
      `A ${Number(process.cookieSize)} g dough ball keeps a thicker, softer center with less edge-to-center crispness.`,
    );
  }

  if (Math.abs(signals.chocolate) > 0.15) {
    candidate(
      items,
      Math.abs(signals.chocolate) * 4,
      'Chocolate load mainly changes chocolate intensity and has only a small structural effect.',
    );
  }

  if (items.length === 0) {
    return [
      'Baseline fat, sugar, and flour ratios support balanced spread and structure.',
      'Softened, creamed butter provides moderate aeration without aggressively increasing spread.',
    ];
  }

  return items
    .sort((a, b) => b.magnitude - a.magnitude)
    .slice(0, 4)
    .map((item) => item.text);
};

export function predictCookiePhenotype(recipe, process) {
  const dna = calculateCookieDNA(recipe);
  const normalizedProcess = { ...BASELINE_PROCESS, ...process };
  const scores = { ...PHENOTYPE_WEIGHTS.baseline };

  const signals = {
    fat: relativeDelta(dna.fat_flour_ratio, BASELINE_DNA.fat_flour_ratio),
    sugar: relativeDelta(dna.sugar_flour_ratio, BASELINE_DNA.sugar_flour_ratio),
    brownSugar: clamp(
      (dna.brown_sugar_fraction - BASELINE_DNA.brown_sugar_fraction) / 0.3,
      -1.5,
      1.5,
    ),
    whiteSugar: clamp(
      (dna.white_sugar_fraction - BASELINE_DNA.white_sugar_fraction) / 0.3,
      -1.5,
      1.5,
    ),
    egg: relativeDelta(dna.egg_flour_ratio, BASELINE_DNA.egg_flour_ratio),
    soda: relativeDelta(dna.soda_flour_ratio, BASELINE_DNA.soda_flour_ratio),
    powder: clamp(dna.powder_flour_ratio / 0.012, 0, 2),
    shortening: clamp(dna.shortening_fat_fraction / 0.35, 0, 1.5),
    chocolate: relativeDelta(dna.chocolate_flour_ratio, BASELINE_DNA.chocolate_flour_ratio),
    chill: clamp(Math.log1p(Math.max(Number(normalizedProcess.chillTime), 0)) / Math.log(49), 0, 1),
    ovenTemperature: clamp((Number(normalizedProcess.ovenTemp) - 375) / 50, -1.5, 1),
    cookieSize: clamp((Number(normalizedProcess.cookieSize) - 20) / 80, 0, 1),
  };

  const thermalFactor = (
    (Number(normalizedProcess.bakeTime) / 10)
    * ((Number(normalizedProcess.ovenTemp) / 375) ** 2)
  );
  signals.bakeExposure = clamp(thermalFactor - 1, -0.6, 1.2);
  signals.hotLongBake = Math.max(0, signals.ovenTemperature) * Math.max(0, signals.bakeExposure);
  signals.excessEgg = Math.max(0, signals.egg - 0.35);

  addWeightedSignal(scores, signals.fat, PHENOTYPE_WEIGHTS.fat_flour_ratio);
  addWeightedSignal(scores, signals.sugar, PHENOTYPE_WEIGHTS.sugar_flour_ratio);
  addWeightedSignal(scores, signals.brownSugar, PHENOTYPE_WEIGHTS.brown_sugar_fraction);
  addWeightedSignal(scores, signals.whiteSugar, PHENOTYPE_WEIGHTS.white_sugar_fraction);
  addWeightedSignal(scores, signals.egg, PHENOTYPE_WEIGHTS.egg_flour_ratio);
  addWeightedSignal(scores, signals.excessEgg, PHENOTYPE_WEIGHTS.excess_egg);
  addWeightedSignal(scores, signals.soda, PHENOTYPE_WEIGHTS.soda_flour_ratio);
  addWeightedSignal(scores, signals.powder, PHENOTYPE_WEIGHTS.powder_flour_ratio);
  addWeightedSignal(scores, signals.shortening, PHENOTYPE_WEIGHTS.shortening_fraction);
  addWeightedSignal(scores, signals.chocolate, PHENOTYPE_WEIGHTS.chocolate_flour_ratio);
  addWeightedSignal(scores, signals.chill, PHENOTYPE_WEIGHTS.chill);
  addWeightedSignal(scores, signals.ovenTemperature, PHENOTYPE_WEIGHTS.oven_temperature);
  addWeightedSignal(scores, signals.bakeExposure, PHENOTYPE_WEIGHTS.bake_exposure);
  addWeightedSignal(scores, signals.hotLongBake, PHENOTYPE_WEIGHTS.hot_long_bake);
  addWeightedSignal(scores, signals.cookieSize, PHENOTYPE_WEIGHTS.cookie_size);
  addWeightedSignal(
    scores,
    1,
    PHENOTYPE_WEIGHTS.butterPreparation[normalizedProcess.butterPreparation]
      || PHENOTYPE_WEIGHTS.butterPreparation.softened,
  );
  addWeightedSignal(
    scores,
    1,
    PHENOTYPE_WEIGHTS.mixingMethod[normalizedProcess.mixingMethod]
      || PHENOTYPE_WEIGHTS.mixingMethod.creamed,
  );

  const phenotypes = PHENOTYPE_ORDER.map((label) => ({
    label,
    score: Math.round(clamp(scores[label], 0, 100)),
  }));
  const dominantTrait = phenotypes.reduce((best, phenotype) => (
    phenotype.score > best.score ? phenotype : best
  ));

  return {
    dna,
    phenotypes,
    dominantTrait,
    explanations: buildExplanations(signals, recipe, normalizedProcess),
  };
}
