"""HTTP API adapter for the Cookie Lab prediction engine."""

import os
from typing import Literal

from fastapi import FastAPI
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from pydantic import BaseModel, ConfigDict, Field

from main import analyze_cookie
from recommendation_engine import generate_cookie_recommendations
from recipe_parser import parse_cookie_recipe


def _environment_list(name: str, defaults: list[str]) -> list[str]:
    raw_value = os.getenv(name, "")
    if not raw_value.strip():
        return defaults
    return [value.strip() for value in raw_value.split(",") if value.strip()]


ALLOWED_ORIGINS = _environment_list(
    "COOKIE_LAB_ALLOWED_ORIGINS",
    [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
)

ALLOWED_HOSTS = _environment_list(
    "COOKIE_LAB_ALLOWED_HOSTS",
    ["localhost", "127.0.0.1", "testserver"],
)

IS_PRODUCTION = os.getenv("COOKIE_LAB_ENV", "development").lower() == "production"


class CookieRecipe(BaseModel):
    """Raw recipe and process values accepted by ``analyze_cookie``."""

    model_config = ConfigDict(extra="forbid")

    flour_g: float = Field(ge=0)
    butter_g: float = Field(ge=0)
    shortening_g: float = Field(default=0, ge=0)
    oil_g: float = Field(default=0, ge=0)

    white_sugar_g: float = Field(ge=0)
    light_brown_sugar_g: float = Field(ge=0)
    dark_brown_sugar_g: float = Field(default=0, ge=0)

    egg_g: float = Field(ge=0)
    egg_yolk_g: float = Field(default=0, ge=0)

    baking_soda_g: float = Field(ge=0)
    baking_powder_g: float = Field(ge=0)
    cornstarch_g: float = Field(default=0, ge=0)
    chocolate_g: float = Field(ge=0)

    butter_state: Literal["cold", "softened", "melted", "browned", "none"]
    flour_type: str = "ap"
    mixing_method: Literal["creamed", "stirred"]
    dough_temperature: Literal["room", "chilled"] = "room"

    chill_hours: float = Field(ge=0)
    bake_temp_f: float = Field(gt=0)
    bake_time_min: float = Field(gt=0)
    cookie_size_g: float = Field(gt=0)


class RecipeTextRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    recipe_text: str = Field(min_length=1, max_length=20_000)


class DesignPreferences(BaseModel):
    model_config = ConfigDict(extra="forbid")

    bite: Literal["crisp_snappy", "balanced", "deeply_chewy"]
    center: Literal["fully_baked", "soft_set", "pillow_soft"]
    shape: Literal["thick_tall", "classic_round", "thin_wide"]
    inside: Literal["light_cakey", "moist_tender", "rich_gooey"]


app = FastAPI(
    title="Cookie Lab API",
    version="1.0.0",
    description="API wrapper around the Cookie Lab science and ML prediction engine.",
    docs_url=None if IS_PRODUCTION else "/docs",
    redoc_url=None if IS_PRODUCTION else "/redoc",
    openapi_url=None if IS_PRODUCTION else "/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=ALLOWED_HOSTS,
)


@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    return response


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.post("/analyze-cookie")
def analyze_cookie_endpoint(recipe: CookieRecipe):
    result = analyze_cookie(recipe.model_dump())
    return jsonable_encoder(result)


@app.post("/analyze-recipe-text")
def analyze_recipe_text_endpoint(request: RecipeTextRequest):
    parsed = parse_cookie_recipe(request.recipe_text)
    analysis = analyze_cookie(parsed.recipe)

    warnings = list(parsed.warnings)
    warnings.extend(analysis.get("warnings", []))
    if analysis.get("cookie_failed"):
        warnings.extend(analysis.get("reason", []))

    return jsonable_encoder({
        "parsed_recipe": parsed.recipe,
        "prediction": analysis.get("prediction"),
        "confidence": analysis.get("confidence"),
        "warnings": list(dict.fromkeys(warnings)),
        "explanations": analysis.get("explanations", []),
    })


@app.post("/generate-cookie-recommendations")
def generate_cookie_recommendations_endpoint(preferences: DesignPreferences):
    result = generate_cookie_recommendations(preferences.model_dump())
    return jsonable_encoder(result)
