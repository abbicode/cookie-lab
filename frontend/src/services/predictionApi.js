const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'
).replace(/\/$/, '');

export const COOKIE_API_URL = `${API_BASE_URL}/analyze-cookie`;
export const RECIPE_TEXT_API_URL = `${API_BASE_URL}/analyze-recipe-text`;
export const RECOMMENDATIONS_API_URL = `${API_BASE_URL}/generate-cookie-recommendations`;

export function toBackendRecipe(recipe, process) {
  return {
    flour_g: Number(recipe.flour),
    butter_g: Number(recipe.butter),
    shortening_g: Number(recipe.shortening || 0),
    oil_g: 0,
    white_sugar_g: Number(recipe.granulatedSugar),
    light_brown_sugar_g: Number(recipe.brownSugar),
    dark_brown_sugar_g: 0,
    egg_g: Number(recipe.eggs) * 50,
    egg_yolk_g: 0,
    baking_soda_g: Number(recipe.bakingSoda),
    baking_powder_g: Number(recipe.bakingPowder),
    cornstarch_g: 0,
    chocolate_g: Number(recipe.chocolateChips),
    butter_state: process.butterPreparation,
    flour_type: 'ap',
    mixing_method: process.mixingMethod,
    dough_temperature: Number(process.chillTime) > 0 ? 'chilled' : 'room',
    chill_hours: Number(process.chillTime),
    bake_temp_f: Number(process.ovenTemp),
    bake_time_min: Number(process.bakeTime),
    cookie_size_g: Number(process.cookieSize),
  };
}

const responseErrorMessage = (body, status) => {
  if (typeof body?.detail === 'string') return body.detail;
  if (Array.isArray(body?.detail)) {
    return body.detail.map((item) => item.msg).filter(Boolean).join(' ');
  }
  return `Cookie analysis failed with status ${status}.`;
};

export async function analyzeCookie(recipe, process, options = {}) {
  const response = await fetch(COOKIE_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toBackendRecipe(recipe, process)),
    signal: options.signal,
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(responseErrorMessage(body, response.status));
  }

  return body;
}

export async function analyzeRecipeText(recipeText, options = {}) {
  const response = await fetch(RECIPE_TEXT_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipe_text: recipeText }),
    signal: options.signal,
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(responseErrorMessage(body, response.status));
  }

  return body;
}

export async function generateCookieRecommendations(preferences, options = {}) {
  const response = await fetch(RECOMMENDATIONS_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(preferences),
    signal: options.signal,
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(responseErrorMessage(body, response.status));
  }

  return body;
}
