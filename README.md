# Cookie Lab

Cookie Lab is an interactive chocolate chip cookie prediction project that combines
baking science, recipe data, statistical analysis, and machine learning.

The application is designed to answer a practical question:

> How is a change to a cookie recipe likely to affect the finished cookie?

Users can run controlled recipe experiments, paste a recipe for analysis, or describe
their preferred cookie phenotype and receive baseline-derived recommendations. The
predictions are directional estimates intended to support a bake test—not replace one.

## What the application does

### Simulate a Cookie

The simulator begins with a Toll House-style control recipe and lets the user change one
ingredient or process variable at a time. Each experiment is sent to the Python backend
and compared with the unchanged baseline.

The interface reports:

- baseline and modified phenotype scores;
- the predicted difference for every texture trait;
- confidence, warnings, and scientific explanations;
- recipe and process values used in the analysis.

### Analyze a Recipe

The recipe analyzer accepts plain-text chocolate chip cookie recipes. A deterministic,
rule-based parser extracts supported ingredients, converts common measurements to grams,
detects preparation instructions, and produces the normalized dictionary expected by the
prediction engine.

V1 supports common weights and volumes, Unicode fractions, butter sticks, whole eggs and
yolks, butter state, mixing method, chilling, Fahrenheit/Celsius temperatures, bake time,
and gram-based cookie portions. Unsupported or defaulted values are returned as warnings.

### Design a Cookie

The design flow asks four phenotype questions about bite, center, shape, and internal
moisture. A rule-based recommendation layer modifies the same Toll House-style baseline;
it does not invent unrelated recipes.

The backend generates and analyzes three candidates:

1. **Science Match** — conservative adjustments supported by familiar baking mechanisms.
2. **Cookie Lab Recommended** — the adjustment intensity with the best science-engine
   target match.
3. **Experimental** — a more assertive version that pushes the requested phenotype.

Every recommendation includes its ingredient changes, full formula, process, seven-trait
prediction, confidence score, explanation, and engine-derived match rank.

### Methodology and Project Background

The website includes a plain-language Methodology page explaining the hybrid prediction
system, confidence calculation, score interpretation, dataset, and scientific knowledge
base. The About page documents why the project was built, the development process,
limitations, future directions, and technical stack.

## Prediction architecture

```text
Normalized recipe
      ↓
Feature engineering / Cookie DNA
      ↓
Recipe validity checks
      ↓
Science-based prediction rules
      ↓
Ingredient interaction rules
      ↓
Machine learning classification
      ↓
Science + ML confidence calculation
      ↓
Warnings, explanations, and API response
```

The main entry point is `analyze_cookie(recipe)` in `src/main.py`. The original prediction
engine remains separate from the API, text parser, recommendation layer, and React UI.

### 1. Feature engineering

`src/feature_engineering.py` converts raw recipe values into comparable features such as:

- fat-to-flour and sugar-to-flour ratios;
- brown- and white-sugar fractions;
- egg, yolk, leavener, cornstarch, and chocolate ratios;
- fat source and butter state;
- mixing, chilling, temperature, time, and cookie size indicators.

### 2. Science model

`src/science_engine.py` applies interpretable baking rules compiled from controlled baking
experiments and food-science references. Relationships are assigned weak, moderate, or
strong effect weights. Examples include melted butter increasing spread, brown sugar
supporting softness and chewiness, and chilling reducing spread.

The science model returns 0–100 intensity scores for:

- spread;
- thickness;
- chewiness;
- softness;
- crispness;
- cakiness;
- browning.

These scores describe predicted texture intensity. They are not probabilities or physical
measurements.

### 3. Interaction layer

`src/interactions.py` handles combinations that are not well represented by independent
ingredient effects, including high-fat/high-sugar formulas, melted butter with a high
brown-sugar share, and high egg with baking powder.

### 4. Machine learning model

`src/ml_model.py` loads four saved Random Forest classifiers from `models/`:

- chewy;
- structural crispy;
- soft;
- thick.

The classifiers return category predictions and probabilities. These ML probabilities are
different from the science model's 0–100 phenotype intensity scores.

### 5. Confidence and explanations

`src/confidence_engine.py` combines scientific evidence, normal recipe ranges, warnings,
ML certainty, and science/ML agreement. `src/explanation_engine.py` translates the most
important recipe conditions into short user-facing explanations.

## Baseline recipe

Simulation and recommendation comparisons use a Toll House-style normalized baseline:

| Variable | Value |
| --- | ---: |
| All-purpose flour | 280 g |
| Butter | 113 g |
| White sugar | 150 g |
| Light brown sugar | 150 g |
| Whole egg | 50 g |
| Baking soda | 4.6 g |
| Chocolate | 170 g |
| Butter state | Softened |
| Mixing method | Creamed |
| Chill time | 0 hours |
| Oven temperature | 350°F |
| Bake time | 10 minutes |
| Cookie size | 30 g |

Shortening, oil, egg yolk, baking powder, and cornstarch begin at zero.

## Data and model development

The project began with the Food.com Recipes and Reviews dataset distributed through
Kaggle. The source data contained more than 500,000 recipes and 1.4 million reviews. The
data audit identified a focused chocolate chip cookie subset for cleaning, feature
engineering, statistical testing, and model development.

Texture labels were derived from recipe descriptions and review language. This made it
possible to study user-described phenotypes such as chewy, crispy, soft, thick, thin,
flat, spreading, moist, and cakey.

The modeling work compares two complementary approaches:

- **Logistic regression** provides an interpretable baseline and relationship direction.
- **Random Forest** captures nonlinear relationships, thresholds, and feature interactions.

The runtime application uses the saved Random Forest models alongside the separate
science-rule engine.

## Notebooks

The canonical analysis is organized into four notebooks:

| Notebook | Purpose |
| --- | --- |
| `01_data_audit.ipynb` | Audits the original Food.com data, identifies chocolate chip cookie recipes, examines review coverage, cleans records, and establishes texture-label feasibility. |
| `02_texture_analysis.ipynb` | Performs exploratory ingredient and texture analysis, comparing ingredient prevalence and recipe characteristics across cookie phenotypes. |
| `03_cookie_prediction_model.ipynb` | Runs statistical tests, engineers modeling features, investigates texture relationships, and develops logistic regression and Random Forest models. |
| `04_model_eval.ipynb` | Compares model performance, discusses class imbalance and label quality, documents limitations, and outlines improvements for future data collection. |

The notebooks are the research record. Production prediction code lives in `src/`, where
the logic can be tested and called consistently by the API.

## Repository structure

```text
cookie-lab/
├── data/
│   └── cookie_science_rules.csv       # structured baking evidence
├── models/
│   ├── chewy_random_forest.pkl
│   ├── soft_random_forest.pkl
│   ├── structural_crispy_random_forest.pkl
│   └── thick_random_forest.pkl
├── notebooks/
│   ├── 01_data_audit.ipynb
│   ├── 02_texture_analysis.ipynb
│   ├── 03_cookie_prediction_model.ipynb
│   └── 04_model_eval.ipynb
├── src/
│   ├── main.py                        # hybrid prediction pipeline
│   ├── feature_engineering.py
│   ├── science_engine.py
│   ├── interactions.py
│   ├── ml_model.py
│   ├── confidence_engine.py
│   ├── explanation_engine.py
│   ├── validation_checker.py
│   ├── recipe_parser.py
│   ├── recommendation_engine.py
│   ├── api.py                         # FastAPI adapter
│   ├── data_processing/
│   ├── analysis/
│   └── models/
├── frontend/
│   ├── src/App.jsx
│   ├── src/App.css
│   ├── src/services/
│   └── firebase.json
├── requirements.txt
└── README.md
```

## Technical stack

| Area | Technologies and methods |
| --- | --- |
| Frontend | React, JavaScript, HTML/CSS, Vite |
| Backend & API | Python, FastAPI, API development, REST API architecture |
| Data Science & Machine Learning | pandas, NumPy, scikit-learn, Random Forest models, regression models, feature engineering, data cleaning and preprocessing |
| Data & Analysis | Jupyter Notebook, Exploratory Data Analysis, statistical analysis |
| Database & Cloud Infrastructure | Firebase, cloud-based data storage and hosting infrastructure |
| Development Tools | Git/GitHub, VS Code, Python virtual environments |
| Data Sources | Kaggle recipe dataset and a baking experiment research database compiled from baking sources |

## Local development

### Prerequisites

- Python 3
- Node.js and npm
- The model files in `models/`

### 1. Install the backend

From the repository root:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

On Windows PowerShell, activate the environment with:

```powershell
.venv\Scripts\Activate.ps1
```

### 2. Configure local environment values

```bash
cp .env.example .env
cp frontend/.env.example frontend/.env.local
```

The defaults support the local frontend and backend ports. Real `.env` files are ignored
by Git.

### 3. Start the API

```bash
python -m uvicorn api:app --app-dir src --env-file .env --reload --port 8000
```

Local API documentation is available at `http://127.0.0.1:8000/docs`.

### 4. Start the frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite, normally `http://127.0.0.1:5173`.

## API

### Health check

```http
GET /health
```

### Analyze a normalized recipe

```http
POST /analyze-cookie
Content-Type: application/json
```

```json
{
  "flour_g": 280,
  "butter_g": 113,
  "white_sugar_g": 150,
  "light_brown_sugar_g": 150,
  "egg_g": 50,
  "baking_soda_g": 4.6,
  "baking_powder_g": 0,
  "chocolate_g": 170,
  "butter_state": "softened",
  "mixing_method": "creamed",
  "chill_hours": 0,
  "bake_temp_f": 350,
  "bake_time_min": 10,
  "cookie_size_g": 30
}
```

Optional normalized fields default to zero or their documented reference values through
the API schema.

### Parse and analyze recipe text

```http
POST /analyze-recipe-text
Content-Type: application/json
```

```json
{
  "recipe_text": "2 cups flour\n1 cup softened butter\n3/4 cup brown sugar\n2 eggs\n1 tsp baking soda"
}
```

### Generate design recommendations

```http
POST /generate-cookie-recommendations
Content-Type: application/json
```

```json
{
  "bite": "deeply_chewy",
  "center": "soft_set",
  "shape": "thick_tall",
  "inside": "rich_gooey"
}
```

## Tests and verification

Run the deterministic parser and recommendation tests:

```bash
PYTHONPATH=src python -m unittest \
  src.test_recipe_parser \
  src.test_recommendation_engine
```

Run the feature-engineering checks:

```bash
PYTHONPATH=src python src/test_feature_engineering.py
```

Verify the frontend:

```bash
cd frontend
npm run lint
npm run build
```

## Security and deployment configuration

Cookie Lab keeps deployment configuration outside source control. Use `.env.example` and
`frontend/.env.example` as templates.

- `COOKIE_LAB_ALLOWED_ORIGINS` controls the exact browser origins allowed by CORS.
- `COOKIE_LAB_ALLOWED_HOSTS` restricts accepted API host headers.
- `COOKIE_LAB_ENV=production` disables Swagger, ReDoc, and the OpenAPI route.
- `VITE_API_BASE_URL` tells the public frontend where to find the API.

Never place secrets in a `VITE_*` variable. Vite embeds those values in the public browser
bundle. The API also returns defensive content-type, framing, referrer, and permissions
headers.

For production:

1. deploy the Python API to a Python-capable service;
2. set the real frontend origin and API hostname in the backend environment;
3. set `COOKIE_LAB_ENV=production`;
4. set `VITE_API_BASE_URL` before building the frontend;
5. configure HTTPS, request limits, and rate limiting at the hosting platform or reverse
   proxy;
6. load only trusted model files—Python pickle/joblib artifacts must never come from
   untrusted uploads.

The React build can be deployed with the included Firebase Hosting configuration:

```bash
cd frontend
npm run build
firebase deploy --only hosting
```

Firebase rewrites application routes to `index.html` so `/about`, `/methodology`, and the
interactive hash-based tools continue to work after deployment.

## Limitations

- Texture labels originate from human recipe descriptions and reviews, so terms such as
  “soft” and “chewy” are subjective.
- Online recipe data reflects publication and review bias.
- Important physical variables—including humidity, altitude, pan material, oven accuracy,
  ingredient temperature, and exact mixing time—are incomplete or absent.
- Some texture classes are imbalanced, making raw accuracy an incomplete performance
  measure.
- Science scores are directional model outputs, not laboratory measurements.
- ML probabilities describe similarity to learned texture categories, not guaranteed bake
  outcomes.

## Future directions

- collect structured user bake-test feedback;
- add controlled experimental results to the evidence database;
- improve texture labels and class balance;
- incorporate cookie image analysis;
- compare additional calibrated models and optimization strategies;
- connect production cloud storage for experiment history and model monitoring.

Cookie Lab is intentionally focused on chocolate chip cookies in V1 so its parsing,
science rules, features, and predictions can remain understandable and testable.
