import assert from 'node:assert/strict';
import { generateCookieRecommendations } from '../src/prediction/cookieRecommendations.js';
import { analyzeRecipeText } from '../src/prediction/recipeParser.js';
import { analyzeCookie, NESTLE_TOLL_HOUSE } from '../src/prediction/scienceEngine.js';

const baseline = analyzeCookie(NESTLE_TOLL_HOUSE);
assert.equal(baseline.cookie_failed, false);
assert.deepEqual(baseline.prediction, {
  spread: 62,
  thickness: 53,
  chewiness: 53,
  softness: 53,
  crispness: 65,
  cakiness: 53,
  browning: 62,
  flavor_depth: 50,
});
assert.equal(baseline.ml_prediction.soft.probability, 0.423);

const parityCases = {
  melted: {
    changes: { butter_state: 'melted', mixing_method: 'stirred' },
    prediction: { spread: 74, thickness: 38, chewiness: 53, softness: 65, crispness: 71, cakiness: 41, browning: 62, flavor_depth: 50 },
  },
  highFlour: {
    changes: { flour_g: 340 },
    prediction: { spread: 44, thickness: 65, chewiness: 53, softness: 47, crispness: 59, cakiness: 59, browning: 56, flavor_depth: 50 },
  },
  brownSugar: {
    changes: { white_sugar_g: 60, light_brown_sugar_g: 240 },
    prediction: { spread: 59, thickness: 53, chewiness: 62, softness: 62, crispness: 56, cakiness: 53, browning: 68, flavor_depth: 56 },
  },
  chilled: {
    changes: { chill_hours: 24 },
    prediction: { spread: 47, thickness: 65, chewiness: 59, softness: 53, crispness: 65, cakiness: 53, browning: 62, flavor_depth: 56 },
  },
  cakey: {
    changes: { egg_g: 100, baking_soda_g: 0, baking_powder_g: 5 },
    prediction: { spread: 53, thickness: 71, chewiness: 53, softness: 59, crispness: 53, cakiness: 89, browning: 56, flavor_depth: 50 },
  },
  interaction: {
    changes: { butter_g: 210, white_sugar_g: 80, light_brown_sugar_g: 240, butter_state: 'melted' },
    prediction: { spread: 79, thickness: 33, chewiness: 70, softness: 76, crispness: 62, cakiness: 47, browning: 68, flavor_depth: 56 },
  },
};

Object.entries(parityCases).forEach(([name, testCase]) => {
  const result = analyzeCookie({ ...NESTLE_TOLL_HOUSE, ...testCase.changes });
  assert.deepEqual(result.prediction, testCase.prediction, `${name} should match the Python science engine`);
});

const parsed = analyzeRecipeText(`
2 1/4 cups all-purpose flour
1 cup butter, softened
3/4 cup white sugar
3/4 cup brown sugar
2 eggs
1 tsp baking soda
2 cups chocolate chips
Cream the butter and sugars. Bake at 375°F for 9-11 minutes.
`);
assert.equal(parsed.cookie_failed, false);
assert.equal(parsed.parsed_recipe.flour_g, 281.25);
assert.equal(parsed.parsed_recipe.butter_g, 226);
assert.equal(parsed.parsed_recipe.bake_temp_f, 375);
assert.equal(parsed.parsed_recipe.bake_time_min, 10);

const textures = ['chewy', 'crispy', 'soft', 'thick'];
const spreads = ['thin', 'medium', 'thick'];
const flavors = ['caramel_molasses', 'classic', 'buttery'];
let preferenceCombinationCount = 0;

textures.forEach((texture) => {
  spreads.forEach((spread) => {
    flavors.forEach((flavor) => {
      const result = generateCookieRecommendations({ texture, spread, flavor });
      assert.equal(result.recommendations.length, 3);
      result.recommendations.forEach((recommendation) => {
        assert.ok(recommendation.match_score >= 0 && recommendation.match_score <= 100);
        assert.ok(recommendation.confidence_score >= 0 && recommendation.confidence_score <= 100);
      });
      preferenceCombinationCount += 1;
    });
  });
});

console.log(`Prediction checks passed: Python parity cases, recipe parsing, and ${preferenceCombinationCount} design combinations.`);
