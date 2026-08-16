import React, { useEffect, useRef, useState } from 'react';
import './App.css';
import {
  BASELINE_PROCESS,
  BASELINE_RECIPE,
  BUTTER_PREPARATIONS,
  INGREDIENT_CONTROLS,
  MIXING_METHODS,
  PHENOTYPE_ORDER,
  PROCESS_CONTROLS,
} from './services/cookiePhysics.js';
import {
  COOKIE_API_URL,
  analyzeCookie,
  analyzeRecipeText as analyzeRecipeTextWithApi,
  generateCookieRecommendations,
} from './services/predictionApi.js';

const hexPoints = (cx, cy, r) => {
  const points = [];
  for (let i = 0; i < 6; i += 1) {
    const angle = ((Math.PI / 180) * 60 * i) - Math.PI / 6;
    points.push(`${cx + Math.cos(angle) * r},${cy + Math.sin(angle) * r}`);
  }
  return points.join(' ');
};

const seeded = (value) => {
  const s = Math.sin(value * 12.9898) * 43758.5453;
  return s - Math.floor(s);
};

const makeNodes = (count) => {
  const clusterCenters = [
    { x: 18, y: 22 },
    { x: 82, y: 22 },
    { x: 18, y: 78 },
    { x: 82, y: 78 },
    { x: 30, y: 12 }, // top-left cluster
    { x: 70, y: 12 }, // top-center-right cluster
    { x: 88, y: 12 }, // top-right cluster (added)
    { x: 50, y: 84 }, // bottom-center
  ];
  const clusterSizes = [3, 2, 3, 2, 3, 2, 3, 2];
  const nodes = [];

  clusterCenters.forEach((center, cluster) => {
    const clusterSize = clusterSizes[cluster];
    for (let member = 0; member < clusterSize && nodes.length < count; member += 1) {
      const i = nodes.length;
      const angle = (Math.PI * 2 * member) / clusterSize + seeded(cluster + 21) * 0.5;
      const distance = 2.8 + seeded(i + 15) * 2.2;
      const homeX = center.x + Math.cos(angle) * distance;
      const homeY = center.y + Math.sin(angle) * distance;

      nodes.push({
        id: i,
        cluster,
        x: homeX,
        y: homeY,
        r: 1.4 + seeded(i + 5) * 0.9,
        vx: (seeded(i + 9) - 0.5) * 0.004,
        vy: (seeded(i + 12) - 0.5) * 0.004,
        homeX,
        homeY,
      });
    }
  });

  return nodes;
};

function MoleculeBackground() {
  const mouse = useRef({ x: -9999, y: -9999 });
  // use a small number of nodes: ~2-3 per cluster (now ~7 clusters -> 20 nodes)
  const nodesRef = useRef(makeNodes(20));
  const [, setTickIdx] = useState(0); // force occasional re-render for React-driven SVG

  useEffect(() => {
    let frameId;
    let counter = 0;

    const tick = () => {
      // update nodes in-place on the ref for maximum continuity
      nodesRef.current.forEach((node) => {
        node.x += node.vx;
        node.y += node.vy;

        // enforce a safe insets so nodes never go off-screen even when SVG scales
        if (node.x < 5 || node.x > 95) {
          node.vx *= -1;
          node.x = Math.min(95, Math.max(5, node.x));
        }
        if (node.y < 5 || node.y > 95) {
          node.vy *= -1;
          node.y = Math.min(95, Math.max(5, node.y));
        }

        const dx = mouse.current.x - node.x;
        const dy = mouse.current.y - node.y;
        const distanceSq = dx * dx + dy * dy;
        // very gentle, short-range mouse attraction so it doesn't pull clusters apart
        if (distanceSq > 0 && distanceSq < 100) {
          const strength = 0.01;
          node.vx -= (dx / Math.sqrt(distanceSq)) * strength;
          node.vy -= (dy / Math.sqrt(distanceSq)) * strength;
        }

        // tiny random drift but kept very small so nodes don't wander
        const drift = 0.0002;
        node.vx += (seeded(node.id + 7) - 0.5) * drift;
        node.vy += (seeded(node.id + 11) - 0.5) * drift;

        // spring toward home so each node stays generally near its cluster
        const hx = node.homeX || 50;
        const hy = node.homeY || 50;
        const dxH = hx - node.x;
        const dyH = hy - node.y;
        const homeStrength = 0.0025; // stronger so nodes remain localized to cluster
        node.vx += dxH * homeStrength;
        node.vy += dyH * homeStrength;

        // damping to keep motions gentle
        node.vx *= 0.992;
        node.vy *= 0.992;

        const clamp = 0.02;
        node.vx = Math.max(-clamp, Math.min(clamp, node.vx));
        node.vy = Math.max(-clamp, Math.min(clamp, node.vy));

        // hard limit: nodes shouldn't stray more than maxOffset from their home
        const maxOffset = 4;
        const distFromHome = Math.sqrt((node.x - hx) ** 2 + (node.y - hy) ** 2);
        if (distFromHome > maxOffset) {
          const nx = hx + ((node.x - hx) / distFromHome) * maxOffset;
          const ny = hy + ((node.y - hy) / distFromHome) * maxOffset;
          node.x = nx;
          node.y = ny;
          // damp velocities when hitting the boundary so they bounce mildly
          node.vx *= -0.2;
          node.vy *= -0.2;
        }
      });

      // occasional React re-render so the SVG updates without doing heavy work every frame
      counter += 1;
      if (counter % 8 === 0) setTickIdx((t) => t + 1);
      frameId = requestAnimationFrame(tick);
    };

    // start the loop
    frameId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frameId);
    };
  }, []);

  // compute bonds from the current node positions every render
  const bonds = (() => {
    const nodes = nodesRef.current;
    const list = [];
    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (a.cluster === b.cluster && distance < 12) {
          list.push({ a: i, b: j, distance, opacity: 1 - distance / 12 });
        }
      }
    }
    return list;
  })();

  return (
    <div className="molecule-bg" aria-hidden="true">
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        {bonds.map((bond) => {
          const a = nodesRef.current[bond.a];
          const b = nodesRef.current[bond.b];
          return (
            <line
              key={`${bond.a}-${bond.b}`}
              className="bond"
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              opacity={Math.max(0.06, bond.opacity)}
            />
          );
        })}
        {nodesRef.current.map((node) => (
          <polygon
            key={node.id}
            className="node"
            points={hexPoints(node.x, node.y, node.r)}
          />
        ))}
      </svg>
    </div>
  );
}

const cards = [
  {
    id: 'simulate',
    title: 'Simulate a cookie',
    text: 'Model dough behavior, texture shifts, and bake outcomes before you ever turn on the oven.',
  },
  {
    id: 'analyze',
    title: 'Analyze a recipe',
    text: 'Break down ingredient ratios, sugar balance, and baking conditions to uncover the why behind texture.',
  },
  {
    id: 'design',
    title: 'Design your perfect cookie',
    text: 'Tune the formula for chew, spread, softness, and structure to hit the exact texture you want.',
  },
];

/* Main home-page hexagon illustration. Intentionally disabled for launch.
function HeroHexagonCluster() {
  return (
    <div className="hero-hex-cluster" aria-hidden="true">
      <svg viewBox="0 0 300 280">
        <line className="hero-hex-bond hero-hex-bond-one" x1="112" y1="94" x2="190" y2="137" />
        <line className="hero-hex-bond hero-hex-bond-two" x1="190" y1="137" x2="128" y2="202" />
        <polygon className="hero-hex hero-hex-one" points={hexPoints(112, 94, 32)} />
        <polygon className="hero-hex hero-hex-two" points={hexPoints(190, 137, 23)} />
        <polygon className="hero-hex hero-hex-three" points={hexPoints(128, 202, 17)} />
      </svg>
    </div>
  );
}
*/

const formatIngredientAmount = (value, unit) => {
  const amount = Number.isInteger(value) ? value : value.toFixed(1);
  if (unit === 'eggs') return `${amount} ${value === 1 ? 'egg' : 'eggs'}`;
  return `${amount} ${unit}`;
};

const formatProcessAmount = (value, unit) => {
  if (unit === '°F') return `${value}°F`;
  if (unit === 'hr') return `${value} ${value === 1 ? 'hour' : 'hours'}`;
  if (unit === 'min') return `${value} min`;
  return `${value} g`;
};

const ingredientControlByKey = Object.fromEntries(
  INGREDIENT_CONTROLS.map((control) => [control.key, control]),
);
const processControlByKey = Object.fromEntries(
  PROCESS_CONTROLS.map((control) => [control.key, control]),
);

const EXPERIMENT_VARIABLES = [
  { ...ingredientControlByKey.flour, id: 'flour', stateGroup: 'recipe', type: 'range' },
  { ...ingredientControlByKey.butter, id: 'butter', stateGroup: 'recipe', type: 'range' },
  { ...ingredientControlByKey.shortening, id: 'shortening', stateGroup: 'recipe', type: 'range' },
  { ...ingredientControlByKey.brownSugar, id: 'brownSugar', stateGroup: 'recipe', type: 'range' },
  {
    ...ingredientControlByKey.granulatedSugar,
    id: 'granulatedSugar',
    label: 'White sugar',
    stateGroup: 'recipe',
    type: 'range',
  },
  { ...ingredientControlByKey.eggs, id: 'eggs', stateGroup: 'recipe', type: 'range' },
  { ...ingredientControlByKey.chocolateChips, id: 'chocolateChips', stateGroup: 'recipe', type: 'range' },
  { ...ingredientControlByKey.bakingSoda, id: 'bakingSoda', stateGroup: 'recipe', type: 'range' },
  { ...ingredientControlByKey.bakingPowder, id: 'bakingPowder', stateGroup: 'recipe', type: 'range' },
  {
    id: 'butterPreparation',
    key: 'butterPreparation',
    label: 'Butter preparation',
    stateGroup: 'process',
    type: 'choice',
    options: BUTTER_PREPARATIONS,
  },
  {
    id: 'mixingMethod',
    key: 'mixingMethod',
    label: 'Mixing method',
    stateGroup: 'process',
    type: 'choice',
    options: MIXING_METHODS,
  },
  { ...processControlByKey.chillTime, id: 'chillTime', stateGroup: 'process', type: 'range' },
  { ...processControlByKey.ovenTemp, id: 'ovenTemp', stateGroup: 'process', type: 'range' },
  { ...processControlByKey.bakeTime, id: 'bakeTime', stateGroup: 'process', type: 'range' },
  { ...processControlByKey.cookieSize, id: 'cookieSize', stateGroup: 'process', type: 'range' },
];

const getVariableValue = (variable, recipe, process) => (
  variable.stateGroup === 'recipe' ? recipe[variable.key] : process[variable.key]
);

const formatVariableValue = (variable, value) => {
  if (variable.type === 'choice') {
    return variable.options.find((option) => option.value === value)?.label || value;
  }
  if (variable.stateGroup === 'recipe') return formatIngredientAmount(Number(value), variable.unit);
  return formatProcessAmount(Number(value), variable.unit);
};

const describeExperiment = (variable, baselineValue, nextValue) => {
  if (variable.type === 'choice') {
    return `You changed ${variable.label.toLowerCase()} from ${formatVariableValue(variable, baselineValue)} to ${formatVariableValue(variable, nextValue)}.`;
  }

  const difference = Number(nextValue) - Number(baselineValue);
  const direction = difference > 0 ? 'increased' : 'decreased';
  return `You ${direction} ${variable.label.toLowerCase()} by ${formatVariableValue(variable, Math.abs(difference))}.`;
};

const predictionTraits = (result) => PHENOTYPE_ORDER.map((label) => ({
  label,
  score: Math.round(Number(result?.prediction?.[label.toLowerCase()] ?? 0)),
}));

const PARSED_RECIPE_LABELS = {
  flour_g: 'Flour',
  butter_g: 'Butter',
  shortening_g: 'Shortening',
  oil_g: 'Oil',
  white_sugar_g: 'White sugar',
  light_brown_sugar_g: 'Brown sugar',
  egg_g: 'Whole egg',
  egg_yolk_g: 'Egg yolk',
  baking_soda_g: 'Baking soda',
  baking_powder_g: 'Baking powder',
  cornstarch_g: 'Cornstarch',
  chocolate_g: 'Chocolate',
  butter_state: 'Butter state',
  mixing_method: 'Mixing method',
  chill_hours: 'Dough chill',
  bake_temp_f: 'Oven temperature',
  bake_time_min: 'Bake time',
  cookie_size_g: 'Cookie size',
};

const formatParsedRecipeValue = (key, value) => {
  if (key.endsWith('_g')) return `${Number(value).toFixed(Number(value) % 1 ? 1 : 0)} g`;
  if (key === 'chill_hours') return `${value} hr`;
  if (key === 'bake_temp_f') return `${value}°F`;
  if (key === 'bake_time_min') return `${value} min`;
  return String(value).replaceAll('_', ' ');
};

const designQuestions = [
  {
    key: 'bite',
    question: 'What kind of bite do you prefer?',
    options: [
      { label: 'Crisp + Snappy', value: 'crisp_snappy' },
      { label: 'Balanced', value: 'balanced' },
      { label: 'Deeply Chewy', value: 'deeply_chewy' },
    ],
  },
  {
    key: 'center',
    question: 'How should the center feel?',
    options: [
      { label: 'Fully Baked', value: 'fully_baked' },
      { label: 'Soft Set', value: 'soft_set' },
      { label: 'Pillow Soft', value: 'pillow_soft' },
    ],
  },
  {
    key: 'shape',
    question: 'What shape should it bake into?',
    options: [
      { label: 'Thick + Tall', value: 'thick_tall' },
      { label: 'Classic Round', value: 'classic_round' },
      { label: 'Thin + Wide', value: 'thin_wide' },
    ],
  },
  {
    key: 'inside',
    question: 'How moist should the inside be?',
    options: [
      { label: 'Light + Cakey', value: 'light_cakey' },
      { label: 'Moist + Tender', value: 'moist_tender' },
      { label: 'Rich + Gooey', value: 'rich_gooey' },
    ],
  },
];

function DesignFlaskAnimation() {
  return (
    <div className="design-lab-animation mixing" role="img" aria-label="Cookie formula mixing in laboratory flasks">
      <svg viewBox="0 0 520 230" aria-hidden="true">
        <path className="design-transfer" d="M151 123c38-33 61-40 87-27M369 123c-38-33-61-40-87-27" />

        <g className="design-flask design-flask-left">
          <path d="M91 42h31M98 42v47l-40 72c-7 13 2 28 17 28h64c15 0 24-15 17-28l-40-72V42" />
          <path className="design-liquid" d="M73 154c19 7 46-7 68 1l7 13c3 6-1 12-9 12H75c-8 0-12-7-8-13Z" />
          <circle className="design-bubble design-bubble-side-one" cx="99" cy="153" r="4" />
          <circle className="design-bubble design-bubble-side-two" cx="120" cy="165" r="3" />
        </g>

        <g className="design-flask design-flask-right">
          <path d="M398 42h31M405 42v47l-40 72c-7 13 2 28 17 28h64c15 0 24-15 17-28l-40-72V42" />
          <path className="design-liquid design-liquid-alt" d="M380 154c19 7 46-7 68 1l7 13c3 6-1 12-9 12h-64c-8 0-12-7-8-13Z" />
          <circle className="design-bubble design-bubble-side-one" cx="408" cy="162" r="3" />
          <circle className="design-bubble design-bubble-side-two" cx="429" cy="150" r="4" />
        </g>

        <g className="design-flask design-flask-center">
          <path d="M244 28h32M251 28v65l-55 82c-9 14 1 31 18 31h92c17 0 27-17 18-31l-55-82V28" />
          <path className="design-liquid design-liquid-center" d="M214 165c25-10 63 8 91-2l14 21c5 8-1 15-13 15h-92c-12 0-18-8-12-16Z" />
          <circle className="design-bubble design-bubble-one" cx="239" cy="169" r="5" />
          <circle className="design-bubble design-bubble-two" cx="275" cy="178" r="4" />
          <circle className="design-bubble design-bubble-three" cx="261" cy="154" r="3" />
          <g className="design-formula-mark">
            <circle cx="260" cy="125" r="12" />
            <path d="M254 125h12M260 119v12" />
          </g>
        </g>

        <circle className="design-drop design-drop-one" cx="207" cy="88" r="5" />
        <circle className="design-drop design-drop-two" cx="313" cy="88" r="5" />
      </svg>
      <p aria-live="polite">Evaluating recipe candidates…</p>
    </div>
  );
}

const recommendationTraitOrder = [
  'spread',
  'thickness',
  'chewiness',
  'softness',
  'crispness',
  'cakiness',
  'browning',
];

const formatTraitLabel = (trait) => trait.charAt(0).toUpperCase() + trait.slice(1);

function RecommendationCard({ recommendation }) {
  return (
    <article className={`recommendation-card recommendation-${recommendation.profile}`}>
      <header className="recommendation-card-header">
        <div>
          <span>Match rank {String(recommendation.rank).padStart(2, '0')}</span>
          <h2>{recommendation.name}</h2>
          <p>{recommendation.profile_description}</p>
        </div>
        <div className="recommendation-scores" aria-label={`Target match score ${recommendation.match_score} out of 100`}>
          <div><strong>{Math.round(recommendation.match_score)}</strong><span>Target match</span></div>
          <div><strong>{Math.round(recommendation.confidence_score)}</strong><span>{recommendation.confidence_label} confidence</span></div>
        </div>
      </header>

      <p className="recommendation-explanation">{recommendation.explanation}</p>

      <div className="recommendation-card-body">
        <section className="recommendation-change-list" aria-label={`${recommendation.name} changes`}>
          <h3>Changes from baseline</h3>
          <ul>
            {recommendation.changes.map((change) => <li key={change}>{change}</li>)}
          </ul>
        </section>

        <section className="recommendation-phenotype" aria-label={`${recommendation.name} predicted phenotype`}>
          <h3>Predicted phenotype</h3>
          <div>
            {recommendationTraitOrder.map((trait) => {
              const score = Math.round(recommendation.predicted_phenotype[trait]);
              return (
                <p key={trait}>
                  <span>{formatTraitLabel(trait)}</span>
                  <i aria-hidden="true"><b style={{ width: `${score}%` }} /></i>
                  <strong>{score}</strong>
                </p>
              );
            })}
          </div>
        </section>
      </div>

      <details
        className="recommendation-formula"
        open={recommendation.profile === 'recommended' ? true : undefined}
      >
        <summary>
          Full baseline-derived formula
          <span>{recommendation.ingredients.length} ingredients</span>
        </summary>
        <div className="recommendation-formula-grid">
          <div>
            <h3>Ingredients</h3>
            <ul>
              {recommendation.ingredients.map((ingredient) => (
                <li key={ingredient.key}>{ingredient.display}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Process</h3>
            <ul>{recommendation.process.map((step) => <li key={step}>{step}</li>)}</ul>
          </div>
        </div>
        {recommendation.warnings.length > 0 && (
          <div className="recommendation-warning">
            <strong>Model note</strong>
            <ul>{recommendation.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
          </div>
        )}
      </details>
    </article>
  );
}

function RecommendationResults({ result }) {
  return (
    <div className="recommendation-results">
      <header className="recommendation-results-header">
        <div>
          <span>Baseline-derived recommendations</span>
          <h2>Three ways to reach your cookie.</h2>
        </div>
        <div className="recommendation-preferences">
          {Object.values(result.preferences).map((preference) => (
            <span key={preference}>{preference}</span>
          ))}
        </div>
      </header>

      <div className="recommendation-targets" aria-label="Desired phenotype targets">
        <span>Desired targets</span>
        <div>
          {Object.entries(result.target_phenotype).map(([trait, score]) => (
            <p key={trait}><span>{formatTraitLabel(trait)}</span><strong>{Math.round(score)}</strong></p>
          ))}
        </div>
      </div>

      <div className="recommendation-list">
        {result.recommendations.map((recommendation) => (
          <RecommendationCard recommendation={recommendation} key={recommendation.name} />
        ))}
      </div>
      <p className="recommendation-model-note">
        Every option begins with the same Toll House-style baseline. Cookie Lab changes only the
        listed ingredients and process variables, then evaluates the result with the existing
        science and ML pipeline.
      </p>
    </div>
  );
}

function DesignPage() {
  const [answers, setAnswers] = useState({});
  const [stage, setStage] = useState('ready');
  const [result, setResult] = useState(null);
  const [apiError, setApiError] = useState('');
  const quizComplete = designQuestions.every((question) => answers[question.key]);

  const chooseAnswer = (question, option) => {
    setAnswers((current) => ({ ...current, [question.key]: option.value }));
    setResult(null);
    setApiError('');
    setStage('ready');
  };

  const createCookie = async () => {
    if (!quizComplete || stage === 'baking') return;
    setResult(null);
    setApiError('');
    setStage('baking');
    try {
      setResult(await generateCookieRecommendations(answers));
      setStage('complete');
    } catch (error) {
      setApiError(`Recommendations could not be generated. ${error.message}`);
      setStage('error');
    }
  };

  return (
    <div className="designer-page">
      <header className="simulator-topbar">
        <a className="simulator-back" href="#home">← Cookie Lab</a>
        <span>Design 01 · Texture profile</span>
      </header>

      <main className="designer-main">
        <section className="designer-intro">
          <p>Preference-to-formula model</p>
          <h1 className="page-display-title">How do you like your cookie?</h1>
          <p>
            Describe the texture you want. Cookie Lab will modify its Toll House-style baseline,
            analyze each candidate, and return three ranked recommendations.
          </p>
        </section>

        <section className="designer-workbench" aria-label="Cookie preference designer">
          <div className="design-controls">
            <div className="panel-heading">
              <span>Desired phenotype</span>
              <strong>{Object.keys(answers).length} / {designQuestions.length} answered</strong>
            </div>
            <div className="design-question-list">
              {designQuestions.map((question, questionIndex) => (
                <fieldset className="design-question" key={question.key}>
                  <legend><span>{String(questionIndex + 1).padStart(2, '0')}</span>{question.question}</legend>
                  <div className="design-choices">
                    {question.options.map((option) => (
                      <label className="design-choice" key={option.label}>
                        <input
                          type="radio"
                          name={question.key}
                          value={option.value}
                          checked={answers[question.key] === option.value}
                          onChange={() => chooseAnswer(question, option)}
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
            <button
              className="create-cookie-button"
              type="button"
              onClick={createCookie}
              disabled={!quizComplete || stage === 'baking'}
            >
              {stage === 'baking'
                ? 'Evaluating recipes…'
                : quizComplete
                  ? result ? 'Generate again' : 'Design my cookie'
                  : 'Answer all questions'}
            </button>
            {apiError && <p className="design-api-error" role="alert">{apiError}</p>}
          </div>

          <div className="design-output" aria-live="polite">
            {stage === 'baking' ? (
              <DesignFlaskAnimation />
            ) : result ? (
              <RecommendationResults result={result} />
            ) : (
              <div className="design-empty-state">
                <span aria-hidden="true">?</span>
                <p>Your three analyzed recipe recommendations will develop here.</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function AnalyzePage() {
  const [recipeText, setRecipeText] = useState('');
  const [result, setResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [apiError, setApiError] = useState('');
  const canAnalyze = recipeText.trim().length > 0 && !isAnalyzing;
  const traits = result?.prediction ? predictionTraits(result) : [];
  const primary = traits.length > 0
    ? traits.reduce((best, trait) => (trait.score > best.score ? trait : best))
    : null;
  const parsedEntries = Object.entries(result?.parsed_recipe || {}).filter(([key, value]) => (
    PARSED_RECIPE_LABELS[key]
    && (typeof value !== 'number' || value > 0 || ['chill_hours'].includes(key))
  ));
  const confidence = result?.confidence;
  const confidenceStatus = confidence && typeof confidence === 'object'
    ? `${confidence.confidence || 'Model'} confidence · ${confidence.score ?? '—'}%`
    : result ? 'Recipe parsed' : 'Awaiting recipe';

  const updateRecipeText = (value) => {
    setRecipeText(value);
    setResult(null);
    setApiError('');
  };

  const loadTextFile = async (file) => {
    if (!file) return;
    updateRecipeText(await file.text());
  };

  const submitRecipe = async (event) => {
    event.preventDefault();
    if (!canAnalyze) return;
    setIsAnalyzing(true);
    setApiError('');
    try {
      setResult(await analyzeRecipeTextWithApi(recipeText));
    } catch (error) {
      setApiError(`The recipe could not be analyzed. ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="analyzer-page">
      <header className="simulator-topbar">
        <a className="simulator-back" href="#home">← Cookie Lab</a>
        <span>Analysis 01 · Recipe text</span>
      </header>

      <main className="analyzer-main">
        <section className="analyzer-intro">
          <p>Text-to-phenotype model</p>
          <h1 className="page-display-title">Analyze a recipe.</h1>
          <p>
            Paste a chocolate chip cookie recipe in plain text. Cookie Lab will identify supported
            ingredients, convert common baking measurements to grams, and run the normalized
            formula through the Python prediction engine.
          </p>
        </section>

        <form className="analyzer-workbench" onSubmit={submitRecipe}>
          <div className="recipe-text-inputs">
            <div className="panel-heading">
              <span>Recipe input</span>
              <strong>Chocolate chip cookies · V1 parser</strong>
            </div>

            <div className="recipe-text-field">
              <label className="recipe-field-heading" htmlFor="recipe-text">
                <span>Recipe text</span>
                <strong>{recipeText.length} characters</strong>
              </label>
              <textarea
                id="recipe-text"
                rows="22"
                value={recipeText}
                onChange={(event) => updateRecipeText(event.target.value)}
                placeholder={'2 1/4 cups all-purpose flour\n1 cup butter, softened\n3/4 cup granulated sugar\n3/4 cup brown sugar\n2 eggs\n1 tsp baking soda\n2 cups chocolate chips\n\nCream the butter and sugars. Bake at 375°F for 9–11 minutes.'}
              />
              <input
                className="recipe-file-input"
                type="file"
                accept=".txt,text/plain"
                aria-label="Upload recipe text file"
                onChange={(event) => loadTextFile(event.target.files?.[0])}
              />
            </div>

            <button className="analyze-recipe-button" type="submit" disabled={!canAnalyze}>
              {isAnalyzing ? 'Parsing + predicting…' : 'Analyze recipe'}
            </button>
          </div>

          <aside
            className="analysis-results"
            aria-live="polite"
            aria-label="Recipe analysis result"
            aria-busy={isAnalyzing}
          >
            <div className="panel-heading">
              <span>Predicted outcome</span>
              <strong>{isAnalyzing ? 'Parsing…' : apiError ? 'API unavailable' : confidenceStatus}</strong>
            </div>

            {apiError && <p className="api-error-banner" role="alert">{apiError}</p>}

            {!result ? (
              <div className="analysis-empty-state">
                <span aria-hidden="true">{isAnalyzing ? '···' : '?'}</span>
                <p>
                  {isAnalyzing
                    ? 'Converting the recipe to Cookie DNA and running the prediction engine…'
                    : 'Paste one complete recipe to reveal its parsed formula and predicted phenotype.'}
                </p>
              </div>
            ) : primary ? (
              <div className="analysis-output">
                <div className="analysis-summary">
                  <span>Dominant trait</span>
                  <strong>{primary.label}</strong>
                  <p>{primary.score}/100 · Python science engine</p>
                </div>

                <div className="texture-scales">
                  {traits.map((trait) => (
                    <div className="texture-scale" key={trait.label}>
                      <div>
                        <span>{trait.label}</span>
                        <output>{trait.score}</output>
                      </div>
                      <span className="texture-track" aria-hidden="true">
                        <span style={{ width: `${trait.score}%` }} />
                      </span>
                    </div>
                  ))}
                </div>

                <div className="parsed-recipe-readout">
                  <span>Parsed recipe</span>
                  <div>
                    {parsedEntries.map(([key, value]) => (
                      <p key={key}>
                        <span>{PARSED_RECIPE_LABELS[key]}</span>
                        <strong>{formatParsedRecipeValue(key, value)}</strong>
                      </p>
                    ))}
                  </div>
                </div>

                {result.explanations?.length > 0 && (
                  <div className="prediction-explanation">
                    <span>Why this outcome</span>
                    <ul>{result.explanations.map((item) => <li key={item}>{item}</li>)}</ul>
                  </div>
                )}

                {result.warnings?.length > 0 && (
                  <div className="parser-warnings">
                    <span>Parser assumptions + warnings</span>
                    <ul>{result.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="prediction-failure" role="alert">
                <span>Recipe could not form a valid cookie</span>
                <ul>{result.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
              </div>
            )}

            <p className="model-note">
              Rule-based parsing only. Measurements are normalized without an LLM or external
              recipe API, then passed unchanged into the existing prediction pipeline.
            </p>
          </aside>
        </form>
      </main>
    </div>
  );
}

function SimulatePage() {
  const [recipe, setRecipe] = useState({ ...BASELINE_RECIPE });
  const [process, setProcess] = useState({ ...BASELINE_PROCESS });
  const [selectedVariable, setSelectedVariable] = useState('flour');
  const [draftValue, setDraftValue] = useState(BASELINE_RECIPE.flour);
  const [baselineResult, setBaselineResult] = useState(null);
  const [result, setResult] = useState(null);
  const [lastChange, setLastChange] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [apiError, setApiError] = useState('');
  const [showMethodology, setShowMethodology] = useState(false);

  const activeVariable = EXPERIMENT_VARIABLES.find((variable) => (
    variable.id === selectedVariable
  ));
  const activeBaselineValue = getVariableValue(
    activeVariable,
    BASELINE_RECIPE,
    BASELINE_PROCESS,
  );
  const hasDraftChange = draftValue !== activeBaselineValue;
  const isBaseline = (
    INGREDIENT_CONTROLS.every((ingredient) => recipe[ingredient.key] === ingredient.baseline)
    && PROCESS_CONTROLS.every((control) => process[control.key] === control.baseline)
    && process.butterPreparation === BASELINE_PROCESS.butterPreparation
    && process.mixingMethod === BASELINE_PROCESS.mixingMethod
  );
  const traits = result && !result.cookie_failed ? predictionTraits(result) : [];
  const baselineTraits = baselineResult && !baselineResult.cookie_failed
    ? predictionTraits(baselineResult)
    : [];
  const dominantTrait = traits.length > 0
    ? traits.reduce((best, trait) => (trait.score > best.score ? trait : best))
    : null;
  const comparisons = traits.map((trait) => {
    const baselineTrait = baselineTraits.find((item) => item.label === trait.label);
    return {
      label: trait.label,
      baseline: baselineTrait?.score ?? null,
      current: trait.score,
      difference: baselineTrait ? trait.score - baselineTrait.score : null,
    };
  });
  const strongestChanges = comparisons
    .filter((item) => item.difference !== null && item.difference !== 0)
    .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference))
    .slice(0, 3);
  const confidence = result?.confidence;
  const confidenceStatus = confidence && typeof confidence === 'object'
    ? `${confidence.confidence || 'Model'} confidence · ${confidence.score ?? '—'}%`
    : 'Backend prediction';

  useEffect(() => {
    const controller = new AbortController();

    const loadBaseline = async () => {
      setIsAnalyzing(true);
      setApiError('');
      try {
        const baseline = await analyzeCookie(BASELINE_RECIPE, BASELINE_PROCESS, {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setBaselineResult(baseline);
        setResult(baseline);
      } catch (error) {
        if (error.name !== 'AbortError') {
          setApiError(`Could not reach the Cookie Lab API. ${error.message}`);
        }
      } finally {
        if (!controller.signal.aborted) setIsAnalyzing(false);
      }
    };

    loadBaseline();
    return () => controller.abort();
  }, []);

  const chooseVariable = (variableId) => {
    const nextVariable = EXPERIMENT_VARIABLES.find((variable) => variable.id === variableId);
    setSelectedVariable(variableId);
    setDraftValue(getVariableValue(nextVariable, BASELINE_RECIPE, BASELINE_PROCESS));
  };

  const resetBaseline = async () => {
    setRecipe({ ...BASELINE_RECIPE });
    setProcess({ ...BASELINE_PROCESS });
    setDraftValue(activeBaselineValue);
    setLastChange(null);
    setApiError('');

    if (baselineResult) {
      setResult(baselineResult);
      return;
    }

    setIsAnalyzing(true);
    try {
      const baseline = await analyzeCookie(BASELINE_RECIPE, BASELINE_PROCESS);
      setBaselineResult(baseline);
      setResult(baseline);
    } catch (error) {
      setApiError(`Could not reach the Cookie Lab API. ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const testChange = async () => {
    if (!hasDraftChange || isAnalyzing) return;

    const nextRecipe = { ...BASELINE_RECIPE };
    const nextProcess = { ...BASELINE_PROCESS };
    const nextValue = activeVariable.type === 'range' ? Number(draftValue) : draftValue;

    if (activeVariable.stateGroup === 'recipe') {
      nextRecipe[activeVariable.key] = nextValue;
    } else {
      nextProcess[activeVariable.key] = nextValue;
    }

    setIsAnalyzing(true);
    setApiError('');
    try {
      const nextResult = await analyzeCookie(nextRecipe, nextProcess);
      setRecipe(nextRecipe);
      setProcess(nextProcess);
      setResult(nextResult);
      setLastChange(describeExperiment(activeVariable, activeBaselineValue, nextValue));
    } catch (error) {
      setApiError(`The experiment could not be analyzed. ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="simulator-page">
      <header className="simulator-topbar">
        <a className="simulator-back" href="#home">← Cookie Lab</a>
        <span>Simulation 01 · Recipe model</span>
      </header>

      <main className="simulator-main">
        <section className="simulator-intro">
          <p>Original Nestlé Toll House baseline</p>
          <h1 className="page-display-title">Simulate a cookie.</h1>
          <div className="simulator-intro-row">
            <p>
              Choose one variable, test it against the original formula, and compare the Python
              engine’s prediction with the unchanged baseline. Each experiment isolates one
              ingredient or process change.
            </p>
            <button
              className="reset-recipe"
              type="button"
              onClick={resetBaseline}
            >
              Reset to Toll House
            </button>
          </div>
        </section>

        <section className="simulator-workbench" aria-label="Cookie recipe simulator">
          <div className="ingredient-controls">
            <div className="panel-heading">
              <span>Ingredient adjustment</span>
              <strong>{isBaseline ? 'Nestlé Toll House baseline' : 'One-variable experiment'}</strong>
            </div>

            <div className="experiment-builder">
              <label className="experiment-selector" htmlFor="experiment-variable">
                <span>Choose one variable to experiment with</span>
                <select
                  id="experiment-variable"
                  value={selectedVariable}
                  onChange={(event) => chooseVariable(event.target.value)}
                >
                  {EXPERIMENT_VARIABLES.map((variable) => (
                    <option key={variable.id} value={variable.id}>{variable.label}</option>
                  ))}
                </select>
              </label>

              <div className="active-experiment-card">
                <div className="experiment-variable-meta">
                  <span>{activeVariable.label}</span>
                  <strong>Baseline {formatVariableValue(activeVariable, activeBaselineValue)}</strong>
                </div>

                {activeVariable.type === 'choice' ? (
                  <div className={`segmented-control ${activeVariable.options.length > 2 ? 'segmented-control-butter' : ''}`}>
                    {activeVariable.options.map((option) => (
                      <label key={option.value}>
                        <input
                          type="radio"
                          name="experiment-value"
                          value={option.value}
                          checked={draftValue === option.value}
                          onChange={(event) => setDraftValue(event.target.value)}
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <label className="ingredient-control experiment-range" htmlFor="experiment-value">
                    <span className="ingredient-meta">
                      <span>Experimental value</span>
                      <output htmlFor="experiment-value">
                        {formatVariableValue(activeVariable, Number(draftValue))}
                      </output>
                    </span>
                    <input
                      id="experiment-value"
                      type="range"
                      min={activeVariable.min}
                      max={activeVariable.max}
                      step={activeVariable.step}
                      value={draftValue}
                      aria-valuetext={formatVariableValue(activeVariable, Number(draftValue))}
                      onChange={(event) => setDraftValue(Number(event.target.value))}
                      style={{
                        background: `linear-gradient(to right, rgba(91, 116, 129, 0.78) 0%, rgba(91, 116, 129, 0.78) ${((Number(draftValue) - activeVariable.min) / (activeVariable.max - activeVariable.min)) * 100}%, rgba(70, 77, 82, 0.16) ${((Number(draftValue) - activeVariable.min) / (activeVariable.max - activeVariable.min)) * 100}%, rgba(70, 77, 82, 0.16) 100%)`,
                      }}
                    />
                    <span className="ingredient-limits" aria-hidden="true">
                      <span>{formatVariableValue(activeVariable, activeVariable.min)}</span>
                      <span>{formatVariableValue(activeVariable, activeVariable.max)}</span>
                    </span>
                  </label>
                )}

                <button
                  className="test-change-button"
                  type="button"
                  onClick={testChange}
                  disabled={!hasDraftChange || isAnalyzing}
                >
                  {isAnalyzing ? 'Analyzing…' : hasDraftChange ? 'Test Change' : 'Choose a different value'}
                </button>
              </div>

              {lastChange && (
                <div className="experiment-result-summary" aria-live="polite">
                  <span>Latest experiment</span>
                  <p>{lastChange}</p>
                  {strongestChanges.length > 0 && (
                    <div className="experiment-deltas">
                      <strong>Predicted changes</strong>
                      <ul>
                        {strongestChanges.map((change) => (
                          <li key={change.label}>
                            <span>{change.difference > 0 ? '+' : ''}{change.difference}</span>
                            {' '}{change.label.toLowerCase()}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="ingredient-section-heading">
              <span>Test recipe</span>
              <strong>Original Nestlé Toll House + one change</strong>
            </div>

            <div className="baseline-formula-grid">
              {INGREDIENT_CONTROLS.map((ingredient) => {
                const value = recipe[ingredient.key];

                return (
                  <div
                    className={`baseline-ingredient ${value !== ingredient.baseline ? 'is-modified' : ''}`}
                    key={ingredient.key}
                  >
                    <span>{ingredient.label}</span>
                    <strong>{formatIngredientAmount(value, ingredient.unit)}</strong>
                  </div>
                );
              })}
            </div>

            <div className="baseline-process-summary" aria-label="Current process settings">
              <span>{formatVariableValue(EXPERIMENT_VARIABLES[9], process.butterPreparation)} butter</span>
              <span>{formatVariableValue(EXPERIMENT_VARIABLES[10], process.mixingMethod)} mixing</span>
              {PROCESS_CONTROLS.map((control) => (
                <span key={control.key}>{control.label}: {formatProcessAmount(process[control.key], control.unit)}</span>
              ))}
            </div>
          </div>

          <aside className="texture-readout" aria-label="Predicted cookie texture" aria-busy={isAnalyzing}>
            <div className="panel-heading">
              <span>Predicted phenotype</span>
              <strong>
                {isAnalyzing ? 'Analyzing…' : apiError ? 'API unavailable' : result ? confidenceStatus : 'Awaiting API'}
              </strong>
            </div>

            {apiError && <p className="api-error-banner" role="alert">{apiError}</p>}

            {!result && (
              <div className="prediction-loading-state">
                <span aria-hidden="true">{isAnalyzing ? '···' : '!'}</span>
                <p>
                  {isAnalyzing
                    ? 'Running the Toll House baseline through the Python engine…'
                    : 'Start the FastAPI backend, then reset the baseline to reconnect.'}
                </p>
              </div>
            )}

            {result?.cookie_failed && (
              <div className="prediction-failure" role="alert">
                <span>Recipe validation failed</span>
                <ul>{(result.reason || []).map((reason) => <li key={reason}>{reason}</li>)}</ul>
              </div>
            )}

            {dominantTrait && (
              <>
                <div className="texture-lead">
                  <span>Dominant trait</span>
                  <strong>{dominantTrait.label}</strong>
                  <p>{dominantTrait.score}/100 · Python science engine</p>
                </div>

                <div className="texture-scales">
                  {traits.map((trait) => (
                    <div className="texture-scale" key={trait.label}>
                      <div>
                        <span>{trait.label}</span>
                        <output>{trait.score}</output>
                      </div>
                      <span className="texture-track" aria-hidden="true">
                        <span style={{ width: `${trait.score}%` }} />
                      </span>
                    </div>
                  ))}
                </div>

                {!isBaseline && baselineTraits.length > 0 && (
                  <div className="phenotype-comparison">
                    <div className="comparison-title">
                      <span>Baseline comparison</span>
                      <strong>Engine delta</strong>
                    </div>
                    <div className="comparison-row comparison-header" aria-hidden="true">
                      <span>Trait</span><span>Baseline</span><span>New</span><span>Difference</span>
                    </div>
                    {comparisons.map((comparison) => (
                      <div className="comparison-row" key={comparison.label}>
                        <span>{comparison.label}</span>
                        <span>{comparison.baseline}</span>
                        <span>{comparison.current}</span>
                        <strong className={comparison.difference > 0 ? 'positive' : comparison.difference < 0 ? 'negative' : ''}>
                          {comparison.difference > 0 ? '+' : ''}{comparison.difference}
                        </strong>
                      </div>
                    ))}
                  </div>
                )}

                {result.explanations?.length > 0 && (
                  <div className="prediction-explanation" aria-live="polite">
                    <span>Why this outcome</span>
                    <ul>
                      {result.explanations.map((explanation) => (
                        <li key={explanation}>{explanation}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.warnings?.length > 0 && (
                  <div className="prediction-warnings">
                    <span>Model warnings</span>
                    <ul>{result.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
                  </div>
                )}
              </>
            )}

            <p className="model-note">
              Predictions are returned by the Python science + ML pipeline at {COOKIE_API_URL}.
              Each test changes one variable from the preserved baseline.
            </p>
          </aside>
        </section>

        <section className="methodology-section" aria-label="Prediction methodology">
          <button
            className="methodology-toggle"
            type="button"
            aria-expanded={showMethodology}
            aria-controls="cookie-methodology"
            onClick={() => setShowMethodology((isOpen) => !isOpen)}
          >
            <span>
              <small>Methodology notes</small>
              <strong>How does this work?</strong>
            </span>
            <span className="methodology-toggle-mark" aria-hidden="true">
              {showMethodology ? '−' : '+'}
            </span>
          </button>

          {showMethodology && (
            <div className="methodology-content" id="cookie-methodology">
              <header className="methodology-intro">
                <p>Prediction framework</p>
                <h2 id="methodology-title">How Cookie Lab Predicts Your Cookie</h2>
                <p>
                  Cookie Lab combines food-science observations with patterns learned from
                  cookie recipe data. Each approach contributes different evidence to the result.
                </p>
              </header>

              <div className="methodology-grid">
                <article className="methodology-card methodology-card-wide">
                  <div className="methodology-card-heading">
                    <span>01</span>
                    <h3>Science-based prediction</h3>
                  </div>
                  <p>
                    The science engine applies known baking principles and controlled-experiment
                    observations to estimate how a formula or process change shifts texture.
                  </p>
                  <div className="methodology-facts">
                    <div>
                      <strong>Butter state</strong>
                      <p>Softened butter can trap air during creaming, supporting structure. Melted butter traps less air and generally increases spread.</p>
                    </div>
                    <div>
                      <strong>Sugar composition</strong>
                      <p>Brown sugar supports moisture retention, chewiness, softness, and browning. White sugar favors spread and crispness.</p>
                    </div>
                    <div>
                      <strong>Flour</strong>
                      <p>Higher flour ratios build structure and thickness while limiting spread.</p>
                    </div>
                    <div>
                      <strong>Eggs</strong>
                      <p>More egg adds moisture and structure and can become cakey; too little can produce a drier, more fragile cookie.</p>
                    </div>
                  </div>
                  <p className="methodology-example">
                    <strong>Reading the scores</strong>
                    Spread 70/100 suggests significant spread; 30/100 suggests stronger shape
                    retention. These are texture-intensity scores, not probabilities.
                  </p>
                </article>

                <article className="methodology-card">
                  <div className="methodology-card-heading">
                    <span>02</span>
                    <h3>Machine learning</h3>
                  </div>
                  <p>
                    A model trained on cookie recipe data learns patterns across ingredient ratios,
                    recipe composition, preparation methods, and labeled cookie characteristics.
                  </p>
                  <ul>
                    <li>Chewy</li>
                    <li>Crispy</li>
                    <li>Soft</li>
                    <li>Thick</li>
                  </ul>
                  <p className="methodology-example">
                    <strong>Example</strong>
                    An 80% chewy probability means similar recipes have an 80% likelihood of
                    matching the chewy category. It is not an exact texture measurement.
                  </p>
                </article>

                <article className="methodology-card">
                  <div className="methodology-card-heading">
                    <span>03</span>
                    <h3>Combining both systems</h3>
                  </div>
                  <p>
                    Science contributes ingredient relationships and controlled observations.
                    Machine learning contributes patterns across many recipes, including
                    relationships that a fixed rule may not capture.
                  </p>
                  <p className="methodology-example">
                    <strong>Agreement raises confidence</strong>
                    If science expects melted butter to increase spread and similar recipes support
                    the same outcome, confidence rises. Disagreement lowers confidence.
                  </p>
                </article>

                <article className="methodology-card">
                  <div className="methodology-card-heading">
                    <span>04</span>
                    <h3>Confidence score</h3>
                  </div>
                  <p>The score summarizes how reliable the available evidence appears.</p>
                  <div className="methodology-confidence-list">
                    <p><strong>Experimental support</strong> Evidence for variables such as butter state, chilling, and sugar balance.</p>
                    <p><strong>Recipe similarity</strong> Whether flour, fat, and sugar ratios fall within normal cookie ranges.</p>
                    <p><strong>Model agreement</strong> Whether science and ML support the same outcome.</p>
                    <p><strong>Unusual formulas</strong> Extreme ratios or missing ingredients reduce confidence.</p>
                  </div>
                  <p className="methodology-example">
                    <strong>90 vs. 60</strong>
                    90/100 indicates a familiar, well-supported formula. 60/100 indicates unusual
                    ratios or evidence that is less certain.
                  </p>
                </article>

                <article className="methodology-card methodology-card-note">
                  <div className="methodology-card-heading">
                    <span>05</span>
                    <h3>Important note</h3>
                  </div>
                  <p>
                    Cookie Lab produces directional estimates: it answers how a recipe change is
                    likely to affect the cookie. It does not replace a physical bake test.
                  </p>
                  <p>
                    The goal is to combine baking science, experimental observations, and machine
                    learning into an informed prediction before the dough reaches the oven.
                  </p>
                </article>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function MethodologyPage() {
  const textureOutputs = [
    'Spread', 'Thickness', 'Chewiness', 'Softness',
    'Crispness', 'Cakiness', 'Browning', 'Flavor depth',
  ];

  return (
    <div className="methodology-page">
      <header className="simulator-topbar">
        <a className="simulator-back" href="/">← Cookie Lab</a>
        <span>Methodology 01 · Hybrid prediction</span>
      </header>

      <main className="methodology-main">
        <section className="methodology-page-intro">
          <p>Technical notes</p>
          <h1 className="page-display-title">Cookie Lab Methodology</h1>
          <p>
            How Cookie Lab combines baking science, experimental observations, statistical
            analysis, and machine learning to predict cookie outcomes.
          </p>
        </section>

        <section className="methodology-overview" aria-labelledby="methodology-overview-title">
          <div>
            <span>Overview</span>
            <h2 id="methodology-overview-title">One prediction, multiple forms of evidence.</h2>
            <p>
              Cookie Lab is a hybrid system. It combines scientific understanding with patterns
              learned from real recipes instead of relying on a single model.
            </p>
          </div>
          <div className="methodology-overview-lists">
            <div>
              <strong>Prediction inputs</strong>
              <ul>
                <li>Baking science principles</li>
                <li>Controlled ingredient experiments</li>
                <li>Large-scale recipe data</li>
                <li>Statistical analysis</li>
                <li>Machine learning models</li>
              </ul>
            </div>
            <div>
              <strong>Predicted outcomes</strong>
              <ul>{textureOutputs.map((output) => <li key={output}>{output}</li>)}</ul>
            </div>
          </div>
        </section>

        <div className="methodology-chapters">
          <section className="methodology-chapter" aria-labelledby="methodology-science-title">
            <div className="methodology-chapter-index"><span>01</span><p>Science model</p></div>
            <div className="methodology-chapter-content">
              <h2 id="methodology-science-title">Science Prediction Model</h2>
              <p>
                The science engine uses baking principles and experimental observations to
                estimate how ingredient and process changes affect the finished cookie.
              </p>

              <div className="evidence-scale" aria-label="Science evidence weights">
                <div><span>Weak</span><strong>3</strong><p>Limited observations or a smaller expected effect.</p></div>
                <div><span>Moderate</span><strong>6</strong><p>Repeated observations or a strong baking mechanism.</p></div>
                <div><span>Strong</span><strong>12</strong><p>Controlled experiments or consistent evidence.</p></div>
              </div>
              <p className="methodology-callout">
                These weights describe how strongly a variable influences the model. They are not
                physical measurements.
              </p>

              <div className="science-example-grid">
                <article>
                  <h3>Butter state</h3>
                  <p><strong>Softened:</strong> permits creaming and air incorporation, supporting structure and reducing spread.</p>
                  <p><strong>Melted:</strong> creates more fluid dough with less incorporated air, increasing spread.</p>
                </article>
                <article>
                  <h3>Sugar composition</h3>
                  <p><strong>Brown sugar:</strong> retains moisture and supports chewiness, softness, molasses flavor, and browning.</p>
                  <p><strong>White sugar:</strong> produces a drier texture and promotes crispness and spread.</p>
                </article>
                <article>
                  <h3>Flour + eggs</h3>
                  <p><strong>More flour:</strong> adds structure and thickness while reducing spread.</p>
                  <p><strong>More egg:</strong> adds moisture and protein structure, pushing texture softer and cakier. Less egg can be dry or fragile.</p>
                </article>
                <article>
                  <h3>Chilling</h3>
                  <p>Longer chilling keeps butter solid for longer, allows flour hydration, and generally reduces spread.</p>
                </article>
              </div>
            </div>
          </section>

          <section className="methodology-chapter" aria-labelledby="methodology-data-title">
            <div className="methodology-chapter-index"><span>02</span><p>Training data</p></div>
            <div className="methodology-chapter-content">
              <h2 id="methodology-data-title">Recipe Dataset</h2>
              <p>
                The machine learning layer was developed with the Kaggle Food.com Recipes and
                Reviews dataset, originally containing approximately 500,000+ recipes and more
                than one million reviews.
              </p>
              <div className="methodology-stat-row">
                <div><strong>500K+</strong><span>Recipes</span></div>
                <div><strong>1M+</strong><span>Reviews</span></div>
                <div><strong>1</strong><span>Focused cookie category</span></div>
              </div>
              <div className="methodology-two-column">
                <div>
                  <h3>Original fields</h3>
                  <ul><li>Ingredients and quantities</li><li>Instructions</li><li>Ratings and reviews</li><li>Recipe metadata</li></ul>
                </div>
                <div>
                  <h3>Chocolate-chip-cookie filter</h3>
                  <ul><li>Find relevant recipes</li><li>Remove unrelated recipes</li><li>Clean ingredient data</li><li>Standardize names</li><li>Build structured features</li></ul>
                </div>
              </div>
            </div>
          </section>

          <section className="methodology-chapter" aria-labelledby="methodology-features-title">
            <div className="methodology-chapter-index"><span>03</span><p>Representation</p></div>
            <div className="methodology-chapter-content">
              <h2 id="methodology-features-title">Feature Engineering</h2>
              <p>
                Recipe text is transformed into measurable Cookie DNA so models compare formula
                composition and process conditions rather than ingredient names alone.
              </p>
              <div className="methodology-three-column">
                <div><h3>Ingredient ratios</h3><ul><li>Flour amount</li><li>Butter-to-flour</li><li>Sugar-to-flour</li><li>Brown and white sugar share</li><li>Chocolate ratio</li></ul></div>
                <div><h3>Ingredient properties</h3><ul><li>Egg amount</li><li>Leavening agents</li><li>Fat source</li><li>Butter state</li></ul></div>
                <div><h3>Process variables</h3><ul><li>Mixing method</li><li>Chill time</li><li>Dough temperature</li><li>Bake temperature and time</li></ul></div>
              </div>
            </div>
          </section>

          <section className="methodology-chapter" aria-labelledby="methodology-statistics-title">
            <div className="methodology-chapter-index"><span>04</span><p>Data analysis</p></div>
            <div className="methodology-chapter-content">
              <h2 id="methodology-statistics-title">Statistical Analysis</h2>
              <p>
                Before training, feature distributions, correlations, ingredient comparisons, and
                texture relationships were examined to identify useful predictive signals.
              </p>
              <div className="relationship-list">
                <span>Brown sugar share → softness</span>
                <span>Flour ratio → thickness</span>
                <span>Fat ratio → spread</span>
                <span>Leavening → cakiness</span>
                <span>Ingredient combinations → texture</span>
              </div>
              <p className="methodology-callout">Features with stronger, more consistent relationships were prioritized for modeling.</p>
            </div>
          </section>

          <section className="methodology-chapter" aria-labelledby="methodology-ml-title">
            <div className="methodology-chapter-index"><span>05</span><p>Learned patterns</p></div>
            <div className="methodology-chapter-content">
              <h2 id="methodology-ml-title">Machine Learning Model</h2>
              <div className="model-comparison-grid">
                <article>
                  <span>Selected model</span>
                  <h3>Random Forest</h3>
                  <p>Cookie behavior is nonlinear. Random Forest can represent ingredient interactions, complex relationships, and threshold effects.</p>
                  <p className="methodology-callout">A flour increase may have little initial effect, then sharply increase thickness beyond a threshold.</p>
                </article>
                <article>
                  <span>Comparison model</span>
                  <h3>Regression</h3>
                  <p>Regression models help expose which ingredients influence outcomes, the direction and strength of relationships, and baseline performance.</p>
                  <p>Models were compared before combining learned predictions with the science engine.</p>
                </article>
              </div>
            </div>
          </section>

          <section className="methodology-chapter" aria-labelledby="methodology-hybrid-title">
            <div className="methodology-chapter-index"><span>06</span><p>Hybrid system</p></div>
            <div className="methodology-chapter-content">
              <h2 id="methodology-hybrid-title">Science + Machine Learning</h2>
              <div className="hybrid-comparison">
                <div><span>Science model</span><strong>Explains why</strong><p>Uses baking knowledge, experimental observations, and interpretable ingredient relationships.</p></div>
                <div className="hybrid-join" aria-hidden="true">+</div>
                <div><span>ML model</span><strong>Finds patterns</strong><p>Learns across many recipes and captures relationships that may not be obvious from fixed rules.</p></div>
              </div>
              <p className="methodology-callout">
                Agreement increases confidence. Disagreement lowers confidence because the
                available evidence is less consistent.
              </p>
            </div>
          </section>

          <section className="methodology-chapter" aria-labelledby="methodology-confidence-title">
            <div className="methodology-chapter-index"><span>07</span><p>Reliability</p></div>
            <div className="methodology-chapter-content">
              <h2 id="methodology-confidence-title">Confidence Score</h2>
              <p>The confidence score summarizes how reliable the prediction appears.</p>
              <div className="confidence-factor-grid">
                <article><span>Scientific support</span><p>Stronger evidence for variables such as butter state, sugar composition, and chill time raises confidence.</p></article>
                <article><span>Recipe similarity</span><p>Typical flour, fat, and sugar ratios have more comparable evidence. Unusual formulas reduce confidence.</p></article>
                <article><span>System agreement</span><p>Agreement between science and ML raises confidence; disagreement lowers it.</p></article>
              </div>
              <div className="confidence-scale-row">
                <span>Very high confidence</span><span>High confidence</span><span>Medium confidence</span><span>Low confidence</span>
              </div>
            </div>
          </section>

          <section className="methodology-chapter" aria-labelledby="methodology-numbers-title">
            <div className="methodology-chapter-index"><span>08</span><p>Interpretation</p></div>
            <div className="methodology-chapter-content">
              <h2 id="methodology-numbers-title">Understanding Prediction Numbers</h2>
              <div className="number-meaning-grid">
                <article><span>Texture intensity</span><strong>Spread 80/100</strong><p>The cookie is expected to spread significantly. Texture scores describe predicted intensity, not probability.</p></article>
                <article><span>ML probability</span><strong>Chewy 80%</strong><p>The model estimates that the recipe resembles previously observed chewy cookies. This probability is separate from texture intensity.</p></article>
              </div>
            </div>
          </section>
        </div>

        <section className="methodology-sources" aria-labelledby="methodology-sources-title">
          <div className="methodology-sources-copy">
            <span>Knowledge base</span>
            <h2 id="methodology-sources-title">Scientific Sources</h2>
            <p>
              The science layer was built by manually reviewing baking experiments, food-science
              explanations, and recipe comparisons. These sources did not directly train the
              model; I translated recurring relationships into structured rules with an evidence
              strength based on the quality and consistency of each observation.
            </p>
            <p className="methodology-sources-note">
              Each record tracks the source, changed variable, control, observed texture effect,
              explanation, and evidence strength.
            </p>
          </div>

          <details className="methodology-source-list">
            <summary>View source list <span>12 sources</span></summary>
            <div>
              <a href="https://handletheheat.com/the-ultimate-guide-to-chocolate-chip-cookies/" target="_blank" rel="noreferrer">Handle the Heat <span>Butter, sugar, flour, chilling, leavening</span></a>
              <a href="https://www.buzzfeed.com/jesseszewczyk/buzzfeed-foods-best-chocolate-chip-cookie-guide" target="_blank" rel="noreferrer">BuzzFeed Food <span>Ingredient comparisons and dough aging</span></a>
              <a href="https://www.kingarthurbaking.com/blog/2016/12/21/cookie-science" target="_blank" rel="noreferrer">King Arthur Baking <span>Cookie science and ingredient behavior</span></a>
              <a href="https://www.kingarthurbaking.com/blog/2023/03/31/butter-oil-shortening-which-fat-makes-the-best-chocolate-chip-cookies" target="_blank" rel="noreferrer">King Arthur Baking <span>Butter, oil, and shortening comparison</span></a>
              <a href="https://www.kitchensanctuary.com/perfect-chocolate-chip-cookies/" target="_blank" rel="noreferrer">Kitchen Sanctuary <span>Chill time, sugar, and butter state</span></a>
              <a href="https://www.melskitchencafe.com/the-best-chocolate-chip-cookies/" target="_blank" rel="noreferrer">Mel’s Kitchen Cafe <span>Butter temperature</span></a>
              <a href="https://bromabakery.com/best-chocolate-chip-cookies/" target="_blank" rel="noreferrer">Broma Bakery <span>Sugar type and ratio</span></a>
              <a href="https://www.thepalatablelife.com/" target="_blank" rel="noreferrer">The Palatable Life <span>Fat, eggs, and flour</span></a>
              <a href="https://www.ice.edu/blog/baking-science-cookies" target="_blank" rel="noreferrer">Institute of Culinary Education <span>Ingredient function and creaming</span></a>
              <a href="https://www.thespruceeats.com/" target="_blank" rel="noreferrer">The Spruce Eats <span>General baking science</span></a>
              <a href="https://ultimateomnoms.com/" target="_blank" rel="noreferrer">Ultimate Omnoms <span>Moisture, sugar, and butter state</span></a>
              <a href="https://enjoylifefoods.com/blogs/blog/" target="_blank" rel="noreferrer">Enjoy Life <span>Ingredient functions and ratios</span></a>
              <a href="https://www.thepancakeprincess.com/" target="_blank" rel="noreferrer">Pancake Princess <span>Recipe comparisons and texture preference</span></a>
            </div>
          </details>
        </section>

        <section className="methodology-summary">
          <span>Summary</span>
          <h2>Baking science + experiments + recipe data + statistics + machine learning</h2>
          <p>
            Cookie Lab brings these signals together to explain how recipe decisions are likely
            to influence cookie outcomes before baking. Predictions are directional estimates and
            do not replace a physical bake test.
          </p>
          <a href="/#simulator">Run a simulation →</a>
        </section>
      </main>
    </div>
  );
}

function BackgroundPage() {
  const projectStages = [
    {
      number: '01',
      title: 'Start with the baking questions',
      text: 'I began by studying how sugar chemistry, fat state, gluten, eggs, leavening, and dough temperature shape a cookie. The goal was not just to collect rules, but to understand which effects were dependable enough to model.',
    },
    {
      number: '02',
      title: 'Turn recipes into usable data',
      text: 'Real recipes are wonderfully inconsistent. Ingredient names, units, quantities, and instructions had to be cleaned and standardized before different formulas could be compared fairly.',
    },
    {
      number: '03',
      title: 'Describe the recipe as a system',
      text: 'Amounts became ratios, and preparation details became variables. That made it possible to study a formula as connected choices—fat, sugar, flour, mixing, chilling, and baking—not a loose ingredient list.',
    },
    {
      number: '04',
      title: 'Look for patterns',
      text: 'Statistical analysis helped reveal which relationships were consistent, which were weak, and where combinations mattered more than any single ingredient on its own.',
    },
    {
      number: '05',
      title: 'Build a hybrid predictor',
      text: 'The final direction combines interpretable baking science with patterns learned from recipe data. One side explains why a change matters; the other helps capture interactions that simple rules can miss.',
    },
  ];

  const limitations = [
    {
      title: 'Texture is subjective',
      text: 'One baker’s chewy may be another baker’s soft. Recipe descriptions and reviews do not use perfectly consistent language.',
    },
    {
      title: 'Reviews carry bias',
      text: 'Ratings reflect preference, popularity, and baking skill as much as the formula itself.',
    },
    {
      title: 'Kitchens are not controlled labs',
      text: 'Ovens, pans, humidity, altitude, ingredient quality, dough temperature, and mixing time can all change the result.',
    },
    {
      title: 'Published recipes are a partial sample',
      text: 'Online datasets leave out failed experiments, bakery formulas, and many family recipes that were never published.',
    },
  ];

  return (
    <div className="background-page">
      <header className="simulator-topbar">
        <a className="simulator-back" href="/">← Cookie Lab</a>
        <span>Project background · From question to model</span>
      </header>

      <main className="background-main">
        <section className="background-hero">
          <div>
            <p>Why I built Cookie Lab</p>
            <h1 className="page-display-title">The perfect cookie is personal.</h1>
          </div>
          <div className="background-hero-note">
            <span>Starting question</span>
            <p>
              Could a recipe tell us—before baking—whether a cookie will be chewy, crisp,
              thick, soft, or somewhere in between?
            </p>
          </div>
        </section>

        <section className="background-origin" aria-labelledby="background-origin-title">
          <div className="background-section-label">
            <span>01</span>
            <p>The curiosity</p>
          </div>
          <div className="background-origin-copy">
            <h2 id="background-origin-title">A baking question became a data-science project.</h2>
            <p className="background-lead">
              Everyone has an opinion about the perfect chocolate chip cookie: a chewy center,
              a crisp edge, a thick bakery-style bite, or a thin snap. I wanted to understand
              what creates those differences—and whether they could be predicted.
            </p>
            <p>
              I started with familiar questions. Why does brown sugar make a cookie feel softer?
              Why does melted butter change spread? How much can flour or chilling change the
              final shape? And which adjustments are meaningful enough to notice after baking?
            </p>
            <p>
              Baking science offered strong explanations, but a cookie recipe is an interacting
              system. Changing one variable can shift several outcomes at once. That complexity
              is what led me to combine food science with real recipe data.
            </p>
            <div className="background-question-row" aria-label="Questions behind Cookie Lab">
              <span>Sugar → moisture?</span>
              <span>Fat state → spread?</span>
              <span>Flour → structure?</span>
              <span>Chill time → shape?</span>
            </div>
          </div>
        </section>

        <section className="background-build" aria-labelledby="background-build-title">
          <div className="background-build-heading">
            <div className="background-section-label">
              <span>02</span>
              <p>The build</p>
            </div>
            <div>
              <h2 id="background-build-title">How the idea took shape</h2>
              <p>
                The work moved from curiosity to research, then from messy recipes to a model
                that can compare controlled changes.
              </p>
            </div>
          </div>

          <div className="background-stage-list">
            {projectStages.map((stage) => (
              <article key={stage.number}>
                <span>{stage.number}</span>
                <h3>{stage.title}</h3>
                <p>{stage.text}</p>
              </article>
            ))}
          </div>
          <p className="background-methodology-link">
            Looking for model architecture, evidence weights, and score definitions?{' '}
            <a href="/methodology">Read the methodology →</a>
          </p>
        </section>

        <section className="background-lessons" aria-labelledby="background-lessons-title">
          <div className="background-section-label">
            <span>03</span>
            <p>What I learned</p>
          </div>
          <div>
            <h2 id="background-lessons-title">The project became bigger than a cookie model.</h2>
            <p>
              Cookie Lab became a practical way to connect domain research, data analysis, model
              building, and product design. Each layer had to remain understandable to the next.
            </p>
            <div className="background-skill-grid">
              <article>
                <span>Data science</span>
                <h3>Make imperfect data useful</h3>
                <p>Cleaning recipe text, normalizing units, engineering ratios, and testing whether patterns hold up.</p>
              </article>
              <article>
                <span>Machine learning</span>
                <h3>Choose clarity with complexity</h3>
                <p>Comparing models, interpreting nonlinear interactions, and treating uncertainty as part of the result.</p>
              </article>
              <article>
                <span>Software</span>
                <h3>Turn analysis into a tool</h3>
                <p>Connecting a Python prediction engine to an interface where one recipe change becomes a visible experiment.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="background-limits" aria-labelledby="background-limits-title">
          <div className="background-limits-heading">
            <div className="background-section-label">
              <span>04</span>
              <p>Honest limits</p>
            </div>
            <div>
              <h2 id="background-limits-title">Prediction is useful because it is directional—not absolute.</h2>
              <p>
                Cookie Lab can organize evidence and estimate likely changes, but it cannot
                recreate every detail of a physical bake.
              </p>
            </div>
          </div>
          <div className="background-limit-grid">
            {limitations.map((limitation) => (
              <article key={limitation.title}>
                <h3>{limitation.title}</h3>
                <p>{limitation.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="background-future" aria-labelledby="background-future-title">
          <span>05 · What comes next</span>
          <h2 id="background-future-title">Build a better feedback loop between prediction and baking.</h2>
          <p>
            Future versions could learn from user bake tests, controlled experiments, clearer
            texture labels, and image analysis. The long-term goal is a system where food science,
            experimental evidence, and AI make recipes easier to understand—not more mysterious.
          </p>
          <div className="background-future-links">
            <a href="/#simulator">Experiment with a recipe →</a>
            <a href="/methodology">Explore the methodology →</a>
          </div>
        </section>

        <section className="background-tech" aria-labelledby="background-tech-title">
          <div>
            <span>06 · Built with</span>
            <h2 id="background-tech-title">Technical Stack</h2>
          </div>
          <div className="background-tech-grid">
            <article>
              <h3>Frontend</h3>
              <p>React</p>
              <p>JavaScript</p>
              <p>HTML/CSS</p>
            </article>
            <article>
              <h3>Backend &amp; API</h3>
              <p>Python</p>
              <p>API development</p>
              <p>REST API architecture</p>
            </article>
            <article>
              <h3>Data Science &amp; Machine Learning</h3>
              <p>pandas</p>
              <p>NumPy</p>
              <p>scikit-learn</p>
              <p>Random Forest models</p>
              <p>Regression models</p>
              <p>Feature engineering</p>
              <p>Data cleaning and preprocessing</p>
            </article>
            <article>
              <h3>Data &amp; Analysis</h3>
              <p>Jupyter Notebook</p>
              <p>Exploratory Data Analysis (EDA)</p>
              <p>Statistical analysis</p>
            </article>
            <article>
              <h3>Database &amp; Cloud Infrastructure</h3>
              <p>Firebase</p>
              <p>Cloud-based data storage</p>
            </article>
            <article>
              <h3>Development Tools</h3>
              <p>Git/GitHub</p>
              <p>VS Code</p>
              <p>Python virtual environments</p>
            </article>
            <article>
              <h3>Data Sources</h3>
              <p>Kaggle recipe dataset (500,000+ recipes)</p>
              <p>Baking experiment research database (compiled from baking sources)</p>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
}

const activeViewFromLocation = () => {
  if (typeof window === 'undefined') return 'home';
  const pathname = window.location.pathname.replace(/\/$/, '');
  if (pathname === '/methodology') return 'methodology';
  if (pathname === '/about') return 'background';
  if (window.location.hash === '#simulator') return 'simulator';
  if (window.location.hash === '#analyzer') return 'analyzer';
  if (window.location.hash === '#designer') return 'designer';
  return 'home';
};

function App() {
  const heroRef = useRef(null);
  const [activeView, setActiveView] = useState(activeViewFromLocation);

  useEffect(() => {
    const syncView = () => {
      const nextView = activeViewFromLocation();
      setActiveView((currentView) => {
        if (currentView !== nextView) {
          window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }));
        }
        return nextView;
      });
    };

    window.addEventListener('hashchange', syncView);
    return () => window.removeEventListener('hashchange', syncView);
  }, []);

  useEffect(() => {
    const el = heroRef.current || document.getElementById('hero-title');
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
          } else {
            entry.target.classList.remove('in-view');
          }
        });
      },
      { threshold: 0.12 }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [activeView]);

  if (activeView === 'simulator') {
    return (
      <div className="page-shell simulator-shell">
        <MoleculeBackground />
        <SimulatePage />
      </div>
    );
  }

  if (activeView === 'analyzer') {
    return (
      <div className="page-shell analyzer-shell">
        <MoleculeBackground />
        <AnalyzePage />
      </div>
    );
  }

  if (activeView === 'designer') {
    return (
      <div className="page-shell designer-shell">
        <MoleculeBackground />
        <DesignPage />
      </div>
    );
  }

  if (activeView === 'methodology') {
    return (
      <div className="page-shell methodology-shell">
        <MoleculeBackground />
        <MethodologyPage />
      </div>
    );
  }

  if (activeView === 'background') {
    return (
      <div className="page-shell background-shell">
        <MoleculeBackground />
        <BackgroundPage />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <MoleculeBackground />

      <header className="topbar">
        <nav className="nav-links" aria-label="Main navigation">
          <a href="/about">About</a>
          <a href="/methodology">Methodology</a>
        </nav>
      </header>

      <main className="hero-section" id="home">
        <div className="hero-copy">
          <h1 className="hero-title" id="hero-title">
            <span className="wordmark">Cookie Lab</span>
            <span className="tagline">Every cookie has a phenotype.</span>
          </h1>
        </div>

        {/* Main home-page hexagon animation intentionally hidden for launch.
        <HeroHexagonCluster />
        */}

      </main>

      <section className="feature-stack" id="experience">
        {cards.map((card) => (
          <article key={card.title} className="feature-card" id={card.id}>
            <div className="card-topline" />
            <h3>{card.title}</h3>
            <p>{card.text}</p>
            <a
              className="explore-link"
              href={card.id === 'simulate' ? '#simulator' : card.id === 'analyze' ? '#analyzer' : '#designer'}
            >
              Explore
            </a>
          </article>
        ))}
      </section>

      <section className="insight-section" id="predict">
        <div className="insight-copy">
          <p className="section-tag">Cookie phenotype</p>
          <h3>Ingredient chemistry. Thermal behavior. Structural outcome.</h3>
        </div>

        <div className="metric-grid">
          <div className="metric-card">
            <span>Texture</span>
            <strong>Chewy</strong>
          </div>
          <div className="metric-card">
            <span>Spread</span>
            <strong>Balanced</strong>
          </div>
          <div className="metric-card">
            <span>Moisture</span>
            <strong>High retention</strong>
          </div>
        </div>
      </section>

    </div>
  );
}

export default App;
