export const defaultRecipe = {
  butter: 110,
  shortening: 30,
  brownSugar: 90,
  granulatedSugar: 70,
  egg: 1,
  cornstarch: 0,
  bakingSoda: 1.5,
  bakingPowder: 0.5,
  vanilla: 2,
  chilled: 1,
  rested: 1,
  butterMelted: 0,
  butterCreamed: 1,
  bakeTime: 10,
  ovenTemp: 350,
};

export async function predictCookie(recipe) {
  await new Promise((resolve) => setTimeout(resolve, 500));

  const chewyScore = Math.min(
    99,
    Math.max(
      15,
      55 +
        recipe.brownSugar / 10 -
        recipe.bakeTime * 1.2 +
        recipe.cornstarch * 12 +
        recipe.chilled * 8 -
        recipe.ovenTemp / 20,
    ),
  );

  const crispyScore = Math.min(
    98,
    Math.max(
      10,
      48 +
        recipe.bakeTime * 2.1 +
        recipe.ovenTemp / 12 +
        recipe.butterMelted * 9 -
        recipe.brownSugar / 12,
    ),
  );

  const softScore = Math.min(
    96,
    Math.max(
      8,
      42 +
        recipe.brownSugar / 11 +
        recipe.cornstarch * 16 -
        recipe.bakeTime * 1.6 +
        recipe.rested * 10,
    ),
  );

  const thickScore = Math.min(
    94,
    Math.max(
      6,
      35 +
        recipe.bakingPowder * 9 +
        recipe.butterCreamed * 8 +
        recipe.brownSugar / 9 -
        recipe.bakeTime * 0.8,
    ),
  );

  const prediction = {
    chewy: Math.round(chewyScore),
    crispy: Math.round(crispyScore),
    soft: Math.round(softScore),
    thick: Math.round(thickScore),
    confidence: 88,
    primaryTexture: 'Chewy',
    secondaryTexture: 'Soft',
    explanation:
      'The current model suggests a moderately chewy cookie with balanced moisture retention and a mild soft finish.',
  };

  if (prediction.crispy > prediction.chewy && prediction.crispy > prediction.soft) {
    prediction.primaryTexture = 'Crispy';
    prediction.secondaryTexture = 'Thin';
    prediction.explanation =
      'Higher bake time and oven temperature push moisture out more quickly, indicating a crisper result.';
  } else if (prediction.soft > prediction.chewy && prediction.soft > prediction.crispy) {
    prediction.primaryTexture = 'Soft';
    prediction.secondaryTexture = 'Chewy';
    prediction.explanation =
      'This profile keeps moisture high and suggests a softer bite with strong tenderness.';
  }

  return prediction;
}
