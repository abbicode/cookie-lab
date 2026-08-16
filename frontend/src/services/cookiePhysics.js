// UI control metadata. Prediction behavior lives in src/prediction/.
export const INGREDIENT_CONTROLS = Object.freeze([
  { key: 'flour', label: 'All-purpose flour', baseline: 280, min: 100, max: 450, step: 5, unit: 'g' },
  { key: 'bakingSoda', label: 'Baking soda', baseline: 4.6, min: 0, max: 12, step: 0.1, unit: 'g' },
  { key: 'chocolateChips', label: 'Chocolate chips', baseline: 170, min: 0, max: 500, step: 5, unit: 'g' },
  { key: 'butter', label: 'Butter', baseline: 113, min: 0, max: 350, step: 5, unit: 'g' },
  { key: 'granulatedSugar', label: 'Granulated sugar', baseline: 150, min: 0, max: 300, step: 5, unit: 'g' },
  { key: 'vanilla', label: 'Vanilla extract', baseline: 5, min: 0, max: 20, step: 0.5, unit: 'ml' },
  { key: 'eggs', label: 'Whole eggs', baseline: 1, min: 0, max: 4, step: 1, unit: 'eggs' },
  { key: 'brownSugar', label: 'Brown sugar', baseline: 150, min: 0, max: 300, step: 5, unit: 'g' },
  { key: 'bakingPowder', label: 'Baking powder', baseline: 0, min: 0, max: 10, step: 0.1, unit: 'g' },
  { key: 'shortening', label: 'Shortening', baseline: 0, min: 0, max: 250, step: 5, unit: 'g' },
  { key: 'salt', label: 'Salt', baseline: 6, min: 0, max: 12, step: 0.5, unit: 'g' },
]);

export const PROCESS_CONTROLS = Object.freeze([
  { key: 'chillTime', label: 'Dough chill', baseline: 0, min: 0, max: 48, step: 1, unit: 'hr' },
  { key: 'ovenTemp', label: 'Oven temperature', baseline: 350, min: 300, max: 425, step: 5, unit: '°F' },
  { key: 'bakeTime', label: 'Bake time', baseline: 10, min: 6, max: 18, step: 1, unit: 'min' },
  { key: 'cookieSize', label: 'Cookie size', baseline: 30, min: 20, max: 100, step: 5, unit: 'g' },
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

export const BASELINE_RECIPE = Object.freeze(Object.fromEntries(
  INGREDIENT_CONTROLS.map((ingredient) => [ingredient.key, ingredient.baseline]),
));

export const BASELINE_PROCESS = Object.freeze({
  ...Object.fromEntries(PROCESS_CONTROLS.map((control) => [control.key, control.baseline])),
  butterPreparation: 'softened',
  mixingMethod: 'creamed',
});

export const PHENOTYPE_ORDER = Object.freeze([
  'Spread',
  'Thickness',
  'Chewiness',
  'Softness',
  'Crispness',
  'Cakiness',
  'Browning',
  'Flavor depth',
]);
