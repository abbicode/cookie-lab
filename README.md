# Cookie Lab

## Live Demo
🔗 Website: https://cookie-lab-ceaae.web.app/ 

Cookie Lab is an interactive chocolate chip cookie prediction project that combines food
science, recipe data, statistical analysis, and machine learning. It turns ingredient and
process choices into directional predictions for spread, thickness, chewiness, softness,
crispness, cakiness, browning, and flavor depth.

The production website is a fully static React application. Recipe parsing, feature
engineering, science rules, ML-derived reference scoring, confidence, warnings,
explanations, and recipe recommendations all run in the browser. Firebase Hosting serves
the built files; there is no production server or paid compute requirement.

> Cookie Lab is designed to answer “How will this change likely affect my cookie?” Its
> scores are informed estimates, not substitutes for a physical bake test.

## Product experiences

### Simulate a Cookie

The simulator starts from a Nestlé Toll House-style control formula. A user chooses one
ingredient or process variable, changes it, and tests that single change against the
preserved baseline.

The result includes:

- baseline and experimental phenotype scores;
- the delta for each predicted trait;
- confidence and recipe-range warnings;
- concise science explanations;
- the exact ingredient and process values tested.

Because the calculation runs locally, baseline reset and new experiments work on the
deployed site without a network request.

### Analyze a Recipe

The analyzer accepts plain-text chocolate chip cookie recipes. Its deterministic parser:

1. identifies supported ingredients;
2. understands common weights, volumes, fractions, butter sticks, eggs, and yolks;
3. converts quantities to grams;
4. detects butter state, mixing, chilling, oven temperature, bake time, and portion size;
5. reports assumptions for anything it could not identify;
6. evaluates the normalized recipe with the same frontend prediction engine.

The V1 parser is deliberately rule-based and chocolate-chip-cookie focused. It does not
send recipe text to an LLM or another service.

### Design a Cookie

The designer asks for three preferences:

- primary texture: chewy, crispy, soft, or thick;
- spread: thin, medium, or thick;
- flavor direction: caramel/molasses, classic, or buttery.

Rules convert those choices into bounded changes to the same Toll House-style baseline.
Cookie Lab evaluates several candidates, ranks their target match, and returns:

1. **Science Match** — conservative changes with familiar baking mechanisms.
2. **Cookie Lab Recommended** — the adjustment strength with the best target match.
3. **Experimental** — a stronger version that pushes the requested phenotype.

Each result shows its changes, full formula, process, predicted phenotype, confidence,
warnings, and a short explanation. The system modifies a known baseline rather than
inventing unrelated recipes.

## Production architecture

```text
React interface
      ↓
Normalized recipe input
      ↓
Frontend feature engineering (“Cookie DNA”)
      ↓
Validity checks + science rules + ingredient interactions
      ↓
Static ML-derived knowledge base
      ↓
Phenotype scores + confidence + warnings + explanations
```

The implementation is split into reusable browser modules:

- `frontend/src/prediction/scienceEngine.js` — recipe normalization, feature engineering,
  validation, the ported science rules, ingredient interactions, ML-reference scoring,
  confidence, and explanations;
- `frontend/src/prediction/cookieRecommendations.js` — preference rules, candidate
  generation, target scoring, and recommendation ranking;
- `frontend/src/prediction/recipeParser.js` — deterministic recipe-text parsing and unit
  conversion;
- `frontend/src/prediction/predictionData.json` — static relationships distilled from the
  model-development work.

The original Python implementation remains in `src/` as the research and model-development
reference. Production does not load Python, pickle files, or scikit-learn in the browser.

## How prediction works

### 1. Feature engineering

Raw values are transformed into comparable recipe features, including:

- total fat, sugar, brown sugar, and leavener;
- fat-to-flour, sugar-to-flour, egg-to-flour, and chocolate-to-flour ratios;
- brown- and white-sugar fractions;
- yolk, cornstarch, soda, and baking-powder ratios;
- butter state, fat source, mixing method, chill time, bake conditions, and cookie size.

These features form the recipe’s “Cookie DNA” and let the engine reason about composition,
not just isolated ingredient amounts.

### 2. Science model

The science layer starts each trait at a neutral 50 and applies interpretable weak,
moderate, or strong effects. Examples include:

- melted butter increases spread and reduces thickness;
- additional flour increases structure and limits spread;
- brown sugar supports moisture retention, chewiness, softness, and flavor depth;
- white sugar favors spread and crispness;
- chilling reduces spread and can increase thickness and flavor development;
- yolk supports richness and chewiness;
- baking powder and higher egg ratios can push a cookie toward cakiness.

The interaction layer also handles combinations such as high fat with high sugar, melted
butter with a high brown-sugar share, and high egg with baking powder.

### 3. ML-derived knowledge

During development, logistic regression and Random Forest models were trained and compared
using engineered recipe features. The deployed site does not run those estimators. Instead,
`predictionData.json` stores the most useful lightweight findings:

- model feature importances;
- baseline reference scores;
- directional ingredient and process effects;
- phenotype relationships;
- evidence and confidence levels.

This preserves the data-science contribution while keeping the website static, fast, and
inexpensive to host. The browser’s ML-reference scores indicate similarity to learned
phenotype patterns; they are not physical texture measurements.

### 4. Confidence, warnings, and explanations

Confidence considers experimental support, whether ingredient ratios are within familiar
cookie ranges, ML-derived evidence, agreement between evidence layers, and validation
warnings. Explanations then translate the strongest recipe conditions into plain language.

## Predicted outputs

Science outputs are 0–100 intensity scores:

| Output | Interpretation |
| --- | --- |
| Spread | How much the dough is expected to flow outward |
| Thickness | How strongly the cookie is expected to hold height |
| Chewiness | Predicted resistance and moisture-supported chew |
| Softness | Expected tenderness and moisture retention |
| Crispness | Expected dry, brittle, or snappy texture |
| Cakiness | Expected lifted, soft crumb structure |
| Browning | Expected surface color and caramelized character |
| Flavor depth | Expected molasses, toasted, rested-dough, and chocolate depth |

A spread score of 80 means “high predicted spread,” not an 80% chance of spreading.

## Toll House-style baseline

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

Shortening, oil, egg yolk, baking powder, and cornstarch start at zero.

## Data and model development

The project began with the Food.com Recipes and Reviews dataset distributed through
Kaggle, containing more than 500,000 recipes and over one million reviews. The analysis
isolated chocolate chip cookie recipes, standardized ingredients, engineered recipe-level
features, and studied texture language in descriptions and reviews.

Two model families served complementary purposes:

- **Logistic regression** provided interpretable baselines and relationship direction.
- **Random Forest** represented nonlinear behavior, thresholds, and feature interactions.

Saved model artifacts in `models/` support reproducible research and evaluation. They are
not shipped as part of the production prediction path.

## Notebooks

The notebooks are the project’s research record:

| Notebook | Purpose |
| --- | --- |
| `01_data_audit.ipynb` | Audits the source data, isolates relevant recipes, examines review coverage, cleans records, and evaluates texture-label feasibility. |
| `02_texture_analysis.ipynb` | Explores ingredient prevalence and recipe characteristics across cookie phenotypes. |
| `03_cookie_prediction_model.ipynb` | Engineers modeling features, runs statistical tests, and develops regression and Random Forest models. |
| `04_model_eval.ipynb` | Compares performance, documents class imbalance and label limitations, and outlines future improvements. |

## Repository structure

```text
cookie-lab/
├── data/
│   └── cookie_science_rules.csv
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
├── src/                              # Python research/reference engine
│   ├── main.py
│   ├── feature_engineering.py
│   ├── science_engine.py
│   ├── interactions.py
│   ├── ml_model.py
│   ├── confidence_engine.py
│   ├── explanation_engine.py
│   ├── validation_checker.py
│   ├── recipe_parser.py
│   └── recommendation_engine.py
├── frontend/
│   ├── scripts/test-prediction.mjs
│   └── src/
│       ├── App.jsx
│       ├── App.css
│       └── prediction/
│           ├── scienceEngine.js
│           ├── cookieRecommendations.js
│           ├── recipeParser.js
│           └── predictionData.json
├── firebase.json                    # static Hosting configuration
├── requirements.txt                 # optional Python research environment
└── README.md
```

## Technical stack

| Area | Technologies and methods |
| --- | --- |
| Frontend | React, JavaScript, HTML/CSS, Vite |
| Frontend Prediction Engine | Browser-based JavaScript science model, static ML-derived JSON knowledge base, client-side feature engineering, rule-based recipe parsing |
| Data Science & Machine Learning | Python, pandas, NumPy, scikit-learn, Random Forest, regression, feature engineering, data cleaning and preprocessing |
| Data & Analysis | Jupyter Notebook, Exploratory Data Analysis (EDA), statistical analysis |
| Hosting & Deployment | Firebase Hosting, static site deployment |
| Development Tools | Git/GitHub, VS Code, Python virtual environments |
| Data Sources | Kaggle recipe dataset, baking experiment research database compiled from baking sources |

## Local development

Only Node.js and npm are required to run the website:

```bash
npm install --prefix frontend
npm --prefix frontend run dev
```

Open the local address printed by Vite, normally `http://localhost:5173`.

For optional notebook work or Python-model reproduction:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

## Tests and verification

Run the browser prediction checks, lint, and production build:

```bash
npm --prefix frontend run test:prediction
npm --prefix frontend run lint
npm --prefix frontend run build
```

The prediction check verifies the Toll House baseline plus representative science-rule and
interaction cases against the Python engine, a recipe parse, and all 36 Design preference
combinations.

The Python research tests can be run separately:

```bash
PYTHONPATH=src python -m unittest \
  src.test_recipe_parser \
  src.test_recommendation_engine
PYTHONPATH=src python src/test_feature_engineering.py
```

## Firebase deployment

The repository-level Firebase configuration publishes only static frontend files. Its
predeploy hook builds React automatically.

```bash
firebase login
firebase use cookie-lab-ceaae
firebase deploy --only hosting
```

All prediction assets are bundled with the site, so the deployed experiences work without
environment variables, secrets, a running Python process, or another origin.

## Security notes

- Local `.env` files, credentials, private keys, service-account files, virtual
  environments, generated builds, logs, and Firebase local state are ignored by Git.
- The browser bundle contains no secret keys. Anything bundled into frontend JavaScript is
  public by nature, so secrets should never be added there.
- Model pickle/joblib files are research artifacts and should only be loaded from trusted
  sources in local Python workflows.
- Recipe text is processed locally and is not uploaded by Cookie Lab.

## Limitations

- Texture words such as “soft” and “chewy” are subjective.
- Published recipes and reviews contain selection, popularity, and skill bias.
- Humidity, altitude, pan material, oven calibration, ingredient temperature, and exact
  mixing technique can materially change a physical bake.
- Some learned texture classes are imbalanced and derived from imperfect text labels.
- Static ML-derived rules preserve important relationships, but they do not reproduce every
  decision of the saved estimators.
- All scores are directional estimates, not laboratory measurements or guaranteed outcomes.

Cookie Lab intentionally focuses on chocolate chip cookies in V1 so its parsing, science
rules, engineered features, and predictions remain understandable and testable.
