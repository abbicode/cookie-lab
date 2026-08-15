import React, { useEffect, useRef, useState } from 'react';
import './App.css';

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

const specimenTraits = [
  { label: 'Chewiness', score: 84 },
  { label: 'Softness', score: 72 },
  { label: 'Spread', score: 67 },
  { label: 'Moisture', score: 76 },
];

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

function CookieSpecimen() {
  return (
    <aside className="specimen" aria-label="Cookie specimen 0345 texture analysis">
      <div className="specimen-id">
        <span>Specimen</span>
        <strong>0345</strong>
      </div>

      <svg
        className="cookie-sketch"
        viewBox="0 0 360 286"
        role="img"
        aria-labelledby="cookie-specimen-title"
      >
        <title id="cookie-specimen-title">Unidentified cookie specimen</title>
        <path
          className="specimen-orbit"
          d="M67 145C67 76 116 31 183 31c72 0 120 47 120 116 0 65-50 111-119 111-65 0-117-46-117-113Z"
        />
        <text className="mystery-cookie-question" x="184" y="153" textAnchor="middle" dominantBaseline="middle">?</text>
      </svg>

      <div className="specimen-traits">
        {specimenTraits.map((trait) => (
          <div className="trait" key={trait.label}>
            <span>{trait.label}</span>
            <span className="trait-scale" aria-hidden="true">
              <span className="trait-fill" style={{ width: `${trait.score}%` }} />
            </span>
            <strong>{trait.score}</strong>
          </div>
        ))}
      </div>
    </aside>
  );
}

const tollHouseIngredients = [
  { key: 'flour', label: 'All-purpose flour', baseline: 281, min: 0, max: 450, step: 5, unit: 'g' },
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
];

const baselineRecipe = Object.fromEntries(
  tollHouseIngredients.map((ingredient) => [ingredient.key, ingredient.baseline]),
);

const processControls = [
  { key: 'chillTime', label: 'Dough chill', baseline: 0, min: 0, max: 48, step: 1, unit: 'hr' },
  { key: 'ovenTemp', label: 'Oven temperature', baseline: 375, min: 300, max: 425, step: 5, unit: '°F' },
  { key: 'bakeTime', label: 'Bake time', baseline: 10, min: 6, max: 18, step: 1, unit: 'min' },
  { key: 'servings', label: 'Serving size', baseline: 60, min: 12, max: 120, step: 12, unit: 'cookies' },
];

const baselineProcess = Object.fromEntries(
  processControls.map((control) => [control.key, control.baseline]),
);

const clampScore = (value) => Math.round(Math.min(98, Math.max(4, value)));

const relativeChange = (value, baseline) => (value - baseline) / baseline;

const calculateTexture = (recipe, process) => {
  const flour = relativeChange(recipe.flour, 281);
  const butter = relativeChange(recipe.butter, 226);
  const whiteSugar = relativeChange(recipe.granulatedSugar, 150);
  const brownSugar = relativeChange(recipe.brownSugar, 165);
  const eggs = relativeChange(recipe.eggs, 2);
  const soda = relativeChange(recipe.bakingSoda, 4.6);
  const chocolate = relativeChange(recipe.chocolateChips, 340);
  const bakingPowder = recipe.bakingPowder / 10;
  const shortening = recipe.shortening / 250;
  const chill = Math.min(process.chillTime / 24, 2);
  const temperature = (process.ovenTemp - 375) / 75;
  const bakeTime = (process.bakeTime - 10) / 8;

  return [
    {
      label: 'Chewiness',
      score: clampScore(74 + brownSugar * 22 + butter * 7 + eggs * 9 - flour * 20 - whiteSugar * 8 - bakingPowder * 10 + chill * 4 - temperature * 8 - bakeTime * 12),
    },
    {
      label: 'Softness',
      score: clampScore(67 + brownSugar * 15 + eggs * 12 + shortening * 20 + bakingPowder * 8 - flour * 14 - whiteSugar * 7 + chill * 3 - temperature * 10 - bakeTime * 15),
    },
    {
      label: 'Spread',
      score: clampScore(64 + butter * 23 + whiteSugar * 17 + soda * 9 - flour * 28 - bakingPowder * 14 - shortening * 8 - chocolate * 5 - chill * 16 - temperature * 10 - bakeTime * 3),
    },
    {
      label: 'Moisture',
      score: clampScore(70 + brownSugar * 22 + butter * 8 + eggs * 14 + shortening * 7 - flour * 19 - whiteSugar * 5 + chill * 2 - temperature * 16 - bakeTime * 18),
    },
  ];
};

const formatIngredientAmount = (value, unit) => {
  const amount = Number.isInteger(value) ? value : value.toFixed(1);
  if (unit === 'eggs') return `${amount} ${value === 1 ? 'egg' : 'eggs'}`;
  return `${amount} ${unit}`;
};

const formatProcessAmount = (value, unit) => {
  if (unit === '°F') return `${value}°F`;
  if (unit === 'hr') return `${value} ${value === 1 ? 'hour' : 'hours'}`;
  if (unit === 'min') return `${value} min`;
  return `${value} cookies`;
};

const analyzeRecipeText = (ingredients, instructions) => {
  const ingredientText = ingredients.toLowerCase();
  const instructionText = instructions.toLowerCase();
  const fullText = `${ingredientText} ${instructionText}`;
  const scores = {
    Chewiness: 58,
    Softness: 56,
    Spread: 58,
    Moisture: 57,
  };

  const adjust = (trait, amount) => {
    scores[trait] += amount;
  };

  if (ingredientText.includes('brown sugar')) {
    adjust('Chewiness', 15);
    adjust('Moisture', 13);
  }
  if (/granulated sugar|white sugar/.test(ingredientText)) {
    adjust('Spread', 9);
    adjust('Moisture', -5);
  }
  if (ingredientText.includes('butter')) {
    adjust('Spread', 8);
    adjust('Chewiness', 3);
  }
  if (ingredientText.includes('shortening')) {
    adjust('Softness', 13);
    adjust('Spread', -7);
  }
  if (ingredientText.includes('cornstarch')) {
    adjust('Softness', 14);
    adjust('Spread', -9);
  }
  if (ingredientText.includes('baking powder')) {
    adjust('Softness', 9);
    adjust('Spread', -9);
  }
  if (/baking soda|bicarbonate of soda/.test(ingredientText)) {
    adjust('Spread', 8);
  }
  if (/melted butter|melt the butter/.test(fullText)) {
    adjust('Chewiness', 7);
    adjust('Spread', 10);
  }
  if (/chill|refrigerat|rest the dough/.test(instructionText)) {
    adjust('Chewiness', 6);
    adjust('Spread', -14);
    adjust('Moisture', 4);
  }

  const temperatureMatch = instructionText.match(/(\d{3})\s*°?\s*f/);
  const ovenTemperature = temperatureMatch ? Number(temperatureMatch[1]) : null;
  if (ovenTemperature && ovenTemperature >= 375) {
    adjust('Softness', -6);
    adjust('Moisture', -8);
  } else if (ovenTemperature && ovenTemperature <= 325) {
    adjust('Softness', 6);
    adjust('Moisture', 5);
  }

  const timeMatch = instructionText.match(/(\d{1,2})\s*(?:-|to)?\s*(?:\d{1,2}\s*)?minutes?/);
  const bakeTime = timeMatch ? Number(timeMatch[1]) : null;
  if (bakeTime && bakeTime >= 13) {
    adjust('Softness', -9);
    adjust('Moisture', -12);
  } else if (bakeTime && bakeTime <= 9) {
    adjust('Softness', 7);
    adjust('Moisture', 8);
  }

  const traits = Object.entries(scores).map(([label, score]) => ({
    label,
    score: clampScore(score),
  }));
  const primary = traits.reduce((best, trait) => (trait.score > best.score ? trait : best));
  const spread = traits.find((trait) => trait.label === 'Spread').score;
  const moisture = traits.find((trait) => trait.label === 'Moisture').score;
  const spreadDescription = spread >= 70 ? 'generous' : spread <= 45 ? 'limited' : 'moderate';
  const moistureDescription = moisture >= 70 ? 'high moisture retention' : moisture <= 45 ? 'a drier finish' : 'balanced moisture';

  return {
    traits,
    primary,
    ovenTemperature,
    bakeTime,
    summary: `Likely ${primary.label.toLowerCase()}, with ${spreadDescription} spread and ${moistureDescription}.`,
  };
};

const designTraits = [
  { key: 'chewiness', label: 'Chewiness', low: 'Tender', high: 'Very chewy' },
  { key: 'softness', label: 'Softness', low: 'Crisp', high: 'Pillow soft' },
  { key: 'spread', label: 'Spread', low: 'Thick', high: 'Wide' },
  { key: 'moisture', label: 'Moisture', low: 'Dry', high: 'Gooey' },
];

const initialDesign = {
  chewiness: 72,
  softness: 68,
  spread: 58,
  moisture: 70,
};

const designQuestions = [
  {
    key: 'bite',
    preference: 'chewiness',
    question: 'What kind of bite do you prefer?',
    options: [
      { label: 'Crisp + snappy', value: 22 },
      { label: 'Balanced', value: 55 },
      { label: 'Deeply chewy', value: 88 },
    ],
  },
  {
    key: 'center',
    preference: 'softness',
    question: 'How should the center feel?',
    options: [
      { label: 'Fully baked', value: 28 },
      { label: 'Soft-set', value: 68 },
      { label: 'Pillow soft', value: 90 },
    ],
  },
  {
    key: 'shape',
    preference: 'spread',
    question: 'What shape should it bake into?',
    options: [
      { label: 'Thick + tall', value: 24 },
      { label: 'Classic round', value: 55 },
      { label: 'Thin + wide', value: 88 },
    ],
  },
  {
    key: 'inside',
    preference: 'moisture',
    question: 'How moist should the inside be?',
    options: [
      { label: 'Light + cakey', value: 30 },
      { label: 'Moist + tender', value: 68 },
      { label: 'Rich + gooey', value: 92 },
    ],
  },
];

const formulateCookie = (preferences) => {
  const brownSugar = Math.round(105 + preferences.chewiness * 0.75 + preferences.moisture * 0.35);
  const granulatedSugar = Math.round(205 - preferences.chewiness * 0.55 + preferences.spread * 0.35);
  const butter = Math.round(165 + preferences.spread * 0.55 + preferences.moisture * 0.2);
  const flour = Math.round(315 - preferences.spread * 0.55 + (100 - preferences.softness) * 0.15);
  const cornstarch = preferences.softness >= 65 ? Math.round((preferences.softness - 50) * 0.24) : 0;
  const chillHours = Math.max(0, Math.round((75 - preferences.spread) / 12));
  const bakeTime = Math.max(8, Math.round(13 - preferences.moisture / 24 - preferences.softness / 40));

  return {
    id: String(4000 + Math.round(
      preferences.chewiness * 3
      + preferences.softness * 2
      + preferences.spread
      + preferences.moisture
    )).padStart(4, '0'),
    name: preferences.chewiness >= 70
      ? 'Brown Sugar Chew'
      : preferences.softness >= 70
        ? 'Soft-Center Cloud'
        : preferences.spread >= 70
          ? 'Golden-Edge Spread'
          : 'Balanced Lab Cookie',
    ingredients: [
      `${flour} g all-purpose flour`,
      `${butter} g unsalted butter, softened`,
      `${brownSugar} g brown sugar`,
      `${granulatedSugar} g granulated sugar`,
      '1 large egg + 1 egg yolk',
      '2 tsp vanilla extract',
      `${preferences.spread >= 62 ? '¾' : '½'} tsp baking soda`,
      ...(cornstarch ? [`${cornstarch} g cornstarch`] : []),
      '¾ tsp fine salt',
      '225 g chocolate chips',
    ],
    steps: [
      'Cream the butter and sugars, then mix in the egg, yolk, and vanilla.',
      'Fold in the dry ingredients and chocolate chips just until combined.',
      chillHours ? `Chill the dough for ${chillHours} hour${chillHours === 1 ? '' : 's'}.` : 'Bake the dough without chilling for maximum spread.',
      `Portion into 24 cookies and bake at 350°F for ${bakeTime}–${bakeTime + 2} minutes.`,
    ],
  };
};

function DesignOvenAnimation() {
  return (
    <div className="design-lab-animation baking" role="img" aria-label="Cookie specimen baking in an oven">
      <svg viewBox="0 0 300 230" aria-hidden="true">
        <g className="design-oven">
          <rect x="79" y="34" width="142" height="158" rx="4" />
          <circle cx="106" cy="58" r="6" />
          <circle cx="130" cy="58" r="6" />
          <path d="M95 80h110v88H95z" />
          <path className="design-oven-glow" d="M106 92h88v64h-88z" />
          <g className="design-baking-cookie">
            <circle cx="150" cy="126" r="29" />
            <circle cx="139" cy="117" r="3" />
            <circle cx="159" cy="113" r="3" />
            <circle cx="160" cy="135" r="3" />
            <circle cx="139" cy="139" r="2.5" />
          </g>
        </g>
        <g className="design-heat">
          <path d="M119 26c-6-7 6-11 0-18" />
          <path d="M150 26c-6-7 6-11 0-18" />
          <path d="M181 26c-6-7 6-11 0-18" />
        </g>
      </svg>
      <p aria-live="polite">Baking the specimen…</p>
    </div>
  );
}

function DesignedCookie({ recipe, preferences }) {
  return (
    <div className="designed-cookie-result">
      <aside className="designed-specimen" aria-label={`Cookie specimen ${recipe.id}`}>
        <div className="specimen-id">
          <span>Specimen</span>
          <strong>{recipe.id}</strong>
        </div>
        <svg className="designed-cookie-sketch" viewBox="0 0 280 250" role="img" aria-label={recipe.name}>
          <path
            className="designed-cookie-body"
            d="M54 125c-2-28 17-51 39-67 22-20 53-22 77-10 28-5 53 13 62 39 19 18 20 49 5 70-5 27-31 46-57 43-23 15-54 8-70-12-29-3-49-28-45-55-8-7-12-18-11-28Z"
          />
          <g className="designed-cookie-chips">
            <circle cx="104" cy="88" r="7" /><circle cx="155" cy="74" r="6" />
            <circle cx="196" cy="105" r="8" /><circle cx="139" cy="124" r="7" />
            <circle cx="92" cy="143" r="6" /><circle cx="179" cy="161" r="7" />
            <circle cx="128" cy="178" r="5" /><circle cx="213" cy="143" r="5" />
          </g>
        </svg>
        <strong className="designed-cookie-name">{recipe.name}</strong>
        <div className="designed-traits">
          {designTraits.map((trait) => (
            <span key={trait.key}>{trait.label} {preferences[trait.key]}</span>
          ))}
        </div>
      </aside>

      <div className="generated-recipe">
        <div className="panel-heading">
          <span>Your formula</span>
          <strong>24 cookies</strong>
        </div>
        <div className="generated-recipe-columns">
          <div>
            <h2>Ingredients</h2>
            <ul>{recipe.ingredients.map((ingredient) => <li key={ingredient}>{ingredient}</li>)}</ul>
          </div>
          <div>
            <h2>Method</h2>
            <ol>{recipe.steps.map((step) => <li key={step}>{step}</li>)}</ol>
          </div>
        </div>
        <p className="model-note">Prototype formula for the design flow. Your recipe library can replace this match later.</p>
      </div>
    </div>
  );
}

function DesignPage() {
  const [preferences, setPreferences] = useState({ ...initialDesign });
  const [answers, setAnswers] = useState({});
  const [stage, setStage] = useState('ready');
  const [recipe, setRecipe] = useState(null);
  const timers = useRef([]);
  const quizComplete = designQuestions.every((question) => answers[question.key]);

  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

  const chooseAnswer = (question, option) => {
    setAnswers((current) => ({ ...current, [question.key]: option.label }));
    setPreferences((current) => ({ ...current, [question.preference]: option.value }));
    setRecipe(null);
    setStage('ready');
  };

  const createCookie = () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    setRecipe(null);
    setStage('baking');
    timers.current = [
      window.setTimeout(() => {
        setRecipe(formulateCookie(preferences));
        setStage('complete');
      }, 2400),
    ];
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
          <p>Describe the texture you want. Cookie Lab will build a matching specimen and starter recipe.</p>
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
                          value={option.label}
                          checked={answers[question.key] === option.label}
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
                ? 'Creating specimen…'
                : quizComplete
                  ? recipe ? 'Create again' : 'Create my cookie'
                  : 'Answer all questions'}
            </button>
          </div>

          <div className="design-output" aria-live="polite">
            {stage === 'baking' ? (
              <DesignOvenAnimation />
            ) : recipe ? (
              <DesignedCookie recipe={recipe} preferences={preferences} />
            ) : (
              <div className="design-empty-state">
                <span aria-hidden="true">?</span>
                <p>Your cookie specimen and recipe will develop here.</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function AnalyzePage() {
  const [ingredients, setIngredients] = useState('');
  const [instructions, setInstructions] = useState('');
  const [result, setResult] = useState(null);
  const canAnalyze = ingredients.trim().length > 0 && instructions.trim().length > 0;

  const updateIngredients = (value) => {
    setIngredients(value);
    setResult(null);
  };

  const updateInstructions = (value) => {
    setInstructions(value);
    setResult(null);
  };

  const loadTextFile = async (file, updateText) => {
    if (!file) return;
    updateText(await file.text());
  };

  const submitRecipe = (event) => {
    event.preventDefault();
    if (!canAnalyze) return;
    setResult(analyzeRecipeText(ingredients, instructions));
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
            Paste or upload the ingredient list and baking instructions. The analysis workspace
            is ready to connect to your recipe dataset and prediction model.
          </p>
        </section>

        <form className="analyzer-workbench" onSubmit={submitRecipe}>
          <div className="recipe-text-inputs">
            <div className="panel-heading">
              <span>Recipe input</span>
              <strong>Plain text or .txt</strong>
            </div>

            <div className="recipe-text-field">
              <label className="recipe-field-heading" htmlFor="recipe-ingredients">
                <span>Ingredients</span>
                <strong>{ingredients.length} characters</strong>
              </label>
              <textarea
                id="recipe-ingredients"
                rows="12"
                value={ingredients}
                onChange={(event) => updateIngredients(event.target.value)}
                placeholder={'2 1/4 cups all-purpose flour\n1 teaspoon baking soda\n1 cup butter\n...'}
              />
              <input
                className="recipe-file-input"
                type="file"
                accept=".txt,text/plain"
                aria-label="Upload ingredients text file"
                onChange={(event) => loadTextFile(event.target.files?.[0], updateIngredients)}
              />
            </div>

            <div className="recipe-text-field">
              <label className="recipe-field-heading" htmlFor="recipe-instructions">
                <span>Instructions</span>
                <strong>{instructions.length} characters</strong>
              </label>
              <textarea
                id="recipe-instructions"
                rows="12"
                value={instructions}
                onChange={(event) => updateInstructions(event.target.value)}
                placeholder={'Preheat oven to 375°F. Cream butter and sugars.\nAdd eggs and vanilla, then mix in dry ingredients.\n...'}
              />
              <input
                className="recipe-file-input"
                type="file"
                accept=".txt,text/plain"
                aria-label="Upload instructions text file"
                onChange={(event) => loadTextFile(event.target.files?.[0], updateInstructions)}
              />
            </div>

            <button className="analyze-recipe-button" type="submit" disabled={!canAnalyze}>
              Analyze recipe
            </button>
          </div>

          <aside className="analysis-results" aria-live="polite" aria-label="Recipe analysis result">
            <div className="panel-heading">
              <span>Predicted outcome</span>
              <strong>{result ? 'Recipe parsed' : 'Awaiting recipe'}</strong>
            </div>

            {!result ? (
              <div className="analysis-empty-state">
                <span aria-hidden="true">?</span>
                <p>Add both parts of the recipe to reveal its predicted cookie phenotype.</p>
              </div>
            ) : (
              <div className="analysis-output">
                <div className="analysis-summary">
                  <span>Likely outcome</span>
                  <strong>{result.primary.label}</strong>
                  <p>{result.summary}</p>
                </div>

                <div className="texture-scales">
                  {result.traits.map((trait) => (
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

                <p className="analysis-detected">
                  {result.ovenTemperature ? `${result.ovenTemperature}°F detected` : 'No oven temperature detected'}
                  {' · '}
                  {result.bakeTime ? `${result.bakeTime} min detected` : 'No bake time detected'}
                </p>
              </div>
            )}

            <p className="model-note">
              This preview uses recipe-language signals. The result area is ready for your
              dataset-backed model response.
            </p>
          </aside>
        </form>
      </main>
    </div>
  );
}

function SimulatePage() {
  const [recipe, setRecipe] = useState({ ...baselineRecipe });
  const [process, setProcess] = useState({ ...baselineProcess });
  const texture = calculateTexture(recipe, process);
  const leadTexture = texture.reduce((best, item) => (item.score > best.score ? item : best));
  const batchScale = process.servings / baselineProcess.servings;
  const isBaseline = (
    tollHouseIngredients.every((ingredient) => recipe[ingredient.key] === ingredient.baseline)
    && processControls.every((control) => process[control.key] === control.baseline)
  );

  const updateIngredient = (key, value) => {
    setRecipe((current) => ({ ...current, [key]: Number(value) }));
  };

  const updateProcess = (key, value) => {
    setProcess((current) => ({ ...current, [key]: Number(value) }));
  };

  const resetBaseline = () => {
    setRecipe({ ...baselineRecipe });
    setProcess({ ...baselineProcess });
  };

  return (
    <div className="simulator-page">
      <header className="simulator-topbar">
        <a className="simulator-back" href="#home">← Cookie Lab</a>
        <span>Simulation 01 · Recipe model</span>
      </header>

      <main className="simulator-main">
        <section className="simulator-intro">
          <p>Classic Toll House-style baseline</p>
          <h1 className="page-display-title">Simulate a cookie.</h1>
          <div className="simulator-intro-row">
            <p>
              Adjust the formula and watch the predicted phenotype change. Baking powder and
              shortening begin at zero. The baseline makes 60 cookies at 375°F with no chill.
            </p>
            <button
              className="reset-recipe"
              type="button"
              onClick={resetBaseline}
              disabled={isBaseline}
            >
              Reset baseline
            </button>
          </div>
        </section>

        <section className="simulator-workbench" aria-label="Cookie recipe simulator">
          <div className="ingredient-controls">
            <div className="panel-heading">
              <span>Formula</span>
              <strong>{isBaseline ? 'Original baseline' : 'Modified recipe'}</strong>
            </div>

            <div className="process-controls" aria-label="Baking conditions and batch size">
              {processControls.map((control) => {
                const value = process[control.key];
                const position = ((value - control.min) / (control.max - control.min)) * 100;

                return (
                  <label className="process-control" key={control.key} htmlFor={control.key}>
                    <span className="process-meta">
                      <span>{control.label}</span>
                      <output htmlFor={control.key}>{formatProcessAmount(value, control.unit)}</output>
                    </span>
                    <input
                      id={control.key}
                      type="range"
                      min={control.min}
                      max={control.max}
                      step={control.step}
                      value={value}
                      aria-valuetext={formatProcessAmount(value, control.unit)}
                      onChange={(event) => updateProcess(control.key, event.target.value)}
                      style={{
                        background: `linear-gradient(to right, rgba(126, 88, 61, 0.72) 0%, rgba(126, 88, 61, 0.72) ${position}%, rgba(70, 77, 82, 0.16) ${position}%, rgba(70, 77, 82, 0.16) 100%)`,
                      }}
                    />
                  </label>
                );
              })}
            </div>

            <div className="ingredient-section-heading">
              <span>Ingredients</span>
              <strong>Scaled for {process.servings} cookies</strong>
            </div>

            <div className="ingredient-list">
              {tollHouseIngredients.map((ingredient) => {
                const value = recipe[ingredient.key];
                const position = ((value - ingredient.min) / (ingredient.max - ingredient.min)) * 100;
                const scaledValue = value * batchScale;
                const scaledMin = ingredient.min * batchScale;
                const scaledMax = ingredient.max * batchScale;
                const scaledStep = ingredient.step * batchScale;

                return (
                  <label className="ingredient-control" key={ingredient.key} htmlFor={ingredient.key}>
                    <span className="ingredient-meta">
                      <span>{ingredient.label}</span>
                      <output htmlFor={ingredient.key}>{formatIngredientAmount(scaledValue, ingredient.unit)}</output>
                    </span>
                    <input
                      id={ingredient.key}
                      type="range"
                      min={scaledMin}
                      max={scaledMax}
                      step={scaledStep}
                      value={scaledValue}
                      aria-valuetext={formatIngredientAmount(scaledValue, ingredient.unit)}
                      onChange={(event) => updateIngredient(
                        ingredient.key,
                        Number(event.target.value) / batchScale,
                      )}
                      style={{
                        background: `linear-gradient(to right, rgba(91, 116, 129, 0.78) 0%, rgba(91, 116, 129, 0.78) ${position}%, rgba(70, 77, 82, 0.16) ${position}%, rgba(70, 77, 82, 0.16) 100%)`,
                      }}
                    />
                    <span className="ingredient-limits" aria-hidden="true">
                      <span>{formatIngredientAmount(scaledMin, ingredient.unit)}</span>
                      <span>{formatIngredientAmount(scaledMax, ingredient.unit)}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <aside className="texture-readout" aria-label="Predicted cookie texture">
            <div className="panel-heading">
              <span>Predicted phenotype</span>
              <strong>Live estimate</strong>
            </div>

            <div className="texture-lead">
              <span>Dominant trait</span>
              <strong>{leadTexture.label}</strong>
              <p>{leadTexture.score}/100</p>
            </div>

            <div className="texture-scales">
              {texture.map((trait) => (
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

            <p className="model-note">
              Directional estimate based on ingredient ratios, chill time, oven temperature, and
              bake time. Serving size scales the batch without changing its texture ratios.
            </p>
          </aside>
        </section>
      </main>
    </div>
  );
}

function App() {
  const heroRef = useRef(null);
  const [activeView, setActiveView] = useState(() => (
    typeof window !== 'undefined' && window.location.hash === '#simulator'
      ? 'simulator'
      : typeof window !== 'undefined' && window.location.hash === '#analyzer'
        ? 'analyzer'
        : typeof window !== 'undefined' && window.location.hash === '#designer'
          ? 'designer'
          : 'home'
  ));

  useEffect(() => {
    const syncView = () => {
      const nextView = window.location.hash === '#simulator'
        ? 'simulator'
        : window.location.hash === '#analyzer'
          ? 'analyzer'
          : window.location.hash === '#designer'
            ? 'designer'
            : 'home';
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

  return (
    <div className="page-shell">
      <MoleculeBackground />

      <header className="topbar">
        <nav className="nav-links" aria-label="Main navigation">
          <a href="#simulator">Simulate</a>
          <a href="#analyzer">Analyze</a>
          <a href="#designer">Design</a>
        </nav>
      </header>

      <main className="hero-section" id="home">
        <div className="hero-copy">
          <h1 className="hero-title" id="hero-title">
            <span className="wordmark">Cookie Lab</span>
            <span className="tagline">Every cookie has a phenotype.</span>
          </h1>
        </div>

        <HeroHexagonCluster />

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

      <section className="specimen-section" aria-label="Cookie specimen analysis">
        <CookieSpecimen />
      </section>
    </div>
  );
}

export default App;
