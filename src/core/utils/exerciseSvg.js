const wrap = (body) => `<svg viewBox='0 0 120 80' fill='none' stroke-width='4' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><g stroke='#64748b'><path d='M8 62h104'/></g><g stroke='#22c55e'>${body}</g></svg>`;

const svgs = {
  pushup: wrap("<circle cx='82' cy='32' r='6'/><path d='M76 38 60 46 34 46 18 62M60 46 56 62M34 46 28 62'/>"),
  squat: wrap("<circle cx='60' cy='18' r='6'/><path d='M60 24v18l-16 12m16-12 16 12M44 54l-8 8m40-8 8 8'/>"),
  plank: wrap("<circle cx='80' cy='30' r='6'/><path d='M74 36 56 42 26 42 16 58M56 42 50 58M34 42 28 58'/>"),
  lunge: wrap("<circle cx='60' cy='16' r='6'/><path d='M60 22v20l-16 12m16-12 20 2M44 54l-10 8m46-18-4 18'/>"),
  burpee: wrap("<circle cx='72' cy='20' r='6'/><path d='M66 26 54 40 34 46 20 56M54 40l10 14m-30-8 4 16'/>"),
  'jumping-jack': wrap("<circle cx='60' cy='16' r='6'/><path d='M60 22v20M60 30 38 18M60 30 82 18M60 42 40 60M60 42 80 60'/>"),
  'mountain-climber': wrap("<circle cx='78' cy='28' r='6'/><path d='M72 34 56 42 28 42 18 58M56 42l-6 16m-14-16 18 8'/>"),
  crunch: wrap("<circle cx='34' cy='36' r='6'/><path d='M40 40c10 12 20 14 34 12M74 52l16-6M52 50l-10 10'/>"),
  'leg-raise': wrap("<circle cx='26' cy='40' r='6'/><path d='M32 44h28M60 44l20-20M60 44l20 20'/>"),
  'bicycle-crunch': wrap("<circle cx='34' cy='30' r='6'/><path d='M40 34 56 44l18-10M56 44l-8 16m26-6 16 6'/>"),
  'russian-twist': wrap("<circle cx='54' cy='28' r='6'/><path d='M60 32 72 44 52 52 34 44M52 52l-10 10m20-10 10 10'/>"),
  'surya-namaskar': wrap("<circle cx='60' cy='16' r='6'/><path d='M60 22v22M60 26 44 10M60 26 76 10M60 44 46 60M60 44 74 60'/>"),
  'warrior-pose': wrap("<circle cx='56' cy='16' r='6'/><path d='M56 22v20M56 30H30m26 0h26M56 42 40 58M56 42 82 44'/>"),
  'tree-pose': wrap("<circle cx='60' cy='16' r='6'/><path d='M60 22v24M60 26 48 12M60 26 72 12M60 46 46 60m14-14 14-6'/>"),
  'cobra-pose': wrap("<circle cx='78' cy='26' r='6'/><path d='M18 54c18 0 28-4 40-14 8-6 12-8 20-8M38 54l-6 8M54 44l2 18'/>"),
  'child-pose': wrap("<circle cx='72' cy='42' r='6'/><path d='M18 54c14 0 22-10 34-10h14M46 44 38 58M54 44l8 14'/>"),
  'high-knees': wrap("<circle cx='60' cy='16' r='6'/><path d='M60 22v18M60 28 46 36M60 28 74 22M60 40 44 30M60 40 76 58'/>"),
  'butt-kicks': wrap("<circle cx='60' cy='16' r='6'/><path d='M60 22v18M60 28 46 36M60 28 74 22M60 40 46 58M60 40 78 32'/>"),
  'lateral-shuffle': wrap("<circle cx='60' cy='16' r='6'/><path d='M60 22v18M60 30 42 34M60 30 78 26M60 40 40 56M60 40 76 50'/>")
};

const aliases = {
  'push-ups': 'pushup',
  pushups: 'pushup',
  squats: 'squat',
  'plank-hold': 'plank',
  'plank-hold-core': 'plank',
  'plank-hip-dips': 'plank',
  'plank-shoulder-taps': 'plank',
  'plank-jacks': 'plank',
  'plank-walk': 'plank',
  lunges: 'lunge',
  burpees: 'burpee',
  'jumping-jacks': 'jumping-jack',
  'mountain-climbers': 'mountain-climber',
  crunches: 'crunch',
  'leg-raises': 'leg-raise',
  'bicycle-crunches': 'bicycle-crunch',
  'russian-twists': 'russian-twist',
  'virabhadrasana-i': 'warrior-pose',
  'virabhadrasana-ii': 'warrior-pose',
  vrikshasana: 'tree-pose',
  bhujangasana: 'cobra-pose',
  balasana: 'child-pose',
  'high-knees': 'high-knees',
  'butt-kicks': 'butt-kicks',
  'lateral-shuffles': 'lateral-shuffle'
};

function getGenericSvg(id = '') {
  const key = String(id).toLowerCase();
  if (key.includes('yoga') || key.includes('asana') || key.includes('pose')) return svgs['tree-pose'];
  if (key.includes('plank') || key.includes('climber')) return svgs.plank;
  if (key.includes('crunch') || key.includes('raise') || key.includes('twist')) return svgs.crunch;
  if (key.includes('squat') || key.includes('lunge')) return svgs.squat;
  if (key.includes('jump') || key.includes('knee') || key.includes('kick') || key.includes('shuffle')) return svgs['jumping-jack'];
  return wrap("<circle cx='60' cy='16' r='6'/><path d='M60 22v22M60 30 44 24M60 30 76 24M60 44 48 60M60 44 72 60'/>");
}

export function getExerciseSvg(exerciseId) {
  const normalizedId = String(exerciseId || '').toLowerCase().replace(/_/g, '-');
  const key = aliases[normalizedId] || normalizedId;
  const rootKey = aliases[normalizedId.split('-').slice(0, 2).join('-')] || normalizedId.split('-')[0];
  return svgs[key] || svgs[rootKey] || getGenericSvg(normalizedId);
}
