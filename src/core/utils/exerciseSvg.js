const wrap = (body) => `<svg viewBox='0 0 120 80' fill='none' stroke-width='3.5' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><g stroke='#64748b' opacity='0.4'><path d='M8 68h104'/></g><g stroke='#22c55e' fill='none'>${body}</g></svg>`;

const svgs = {
  pushup: wrap(`
    <circle cx='80' cy='30' r='6'><animate attributeName='cy' values='30;38;30' dur='2s' repeatCount='indefinite'/></circle>
    <path d='M74 36 56 42 26 42 16 62'><animate attributeName='d' values='M74 36 56 42 26 42 16 62;M74 44 56 50 26 50 16 62;M74 36 56 42 26 42 16 62' dur='2s' repeatCount='indefinite'/></path>
    <path d='M56 42 52 62'><animate attributeName='d' values='M56 42 52 62;M56 50 52 62;M56 42 52 62' dur='2s' repeatCount='indefinite'/></path>
    <path d='M26 42 22 62'><animate attributeName='d' values='M26 42 22 62;M26 50 22 62;M26 42 22 62' dur='2s' repeatCount='indefinite'/></path>
  `),
  squat: wrap(`
    <circle cx='60' cy='18' r='6'><animate attributeName='cy' values='18;30;18' dur='2.5s' repeatCount='indefinite'/></circle>
    <path d='M60 24v18'><animate attributeName='d' values='M60 24 60 42;M60 36 60 46;M60 24 60 42' dur='2.5s' repeatCount='indefinite'/></path>
    <path d='M60 42 44 54'><animate attributeName='d' values='M60 42 44 54;M60 46 38 58;M60 42 44 54' dur='2.5s' repeatCount='indefinite'/></path>
    <path d='M60 42 76 54'><animate attributeName='d' values='M60 42 76 54;M60 46 82 58;M60 42 76 54' dur='2.5s' repeatCount='indefinite'/></path>
    <path d='M60 28 44 20'><animate attributeName='d' values='M60 28 44 20;M60 38 42 30;M60 28 44 20' dur='2.5s' repeatCount='indefinite'/></path>
    <path d='M60 28 76 20'><animate attributeName='d' values='M60 28 76 20;M60 38 78 30;M60 28 76 20' dur='2.5s' repeatCount='indefinite'/></path>
  `),
  plank: wrap(`
    <circle cx='80' cy='32' r='6'/>
    <path d='M74 38 56 44 26 44 16 62'/>
    <path d='M56 44 52 62'/>
    <path d='M26 44 22 62'/>
    <g opacity='0.6'><circle cx='80' cy='32' r='8' fill='none' stroke='#22c55e' stroke-width='1'>
      <animate attributeName='r' values='8;12;8' dur='2s' repeatCount='indefinite'/>
      <animate attributeName='opacity' values='0.6;0;0.6' dur='2s' repeatCount='indefinite'/>
    </circle></g>
  `),
  lunge: wrap(`
    <circle cx='60' cy='16' r='6'><animate attributeName='cy' values='16;24;16' dur='2.5s' repeatCount='indefinite'/></circle>
    <path d='M60 22v20'><animate attributeName='d' values='M60 22 60 42;M60 30 60 48;M60 22 60 42' dur='2.5s' repeatCount='indefinite'/></path>
    <path d='M60 42 44 56'><animate attributeName='d' values='M60 42 44 56;M60 48 40 62;M60 42 44 56' dur='2.5s' repeatCount='indefinite'/></path>
    <path d='M60 42 80 44'><animate attributeName='d' values='M60 42 80 44;M60 48 82 50;M60 42 80 44' dur='2.5s' repeatCount='indefinite'/></path>
  `),
  burpee: wrap(`
    <circle cx='60' cy='16' r='6'>
      <animate attributeName='cx' values='60;72;60' dur='3s' repeatCount='indefinite'/>
      <animate attributeName='cy' values='16;34;16' dur='3s' repeatCount='indefinite'/>
    </circle>
    <path d='M60 22 60 42 44 56'>
      <animate attributeName='d' values='M60 22 60 42 44 56;M66 40 54 48 28 48;M60 22 60 42 44 56' dur='3s' repeatCount='indefinite'/>
    </path>
    <path d='M60 42 76 56'>
      <animate attributeName='d' values='M60 42 76 56;M54 48 18 62;M60 42 76 56' dur='3s' repeatCount='indefinite'/>
    </path>
  `),
  'jumping-jack': wrap(`
    <circle cx='60' cy='16' r='6'><animate attributeName='cy' values='16;12;16' dur='1.5s' repeatCount='indefinite'/></circle>
    <path d='M60 22v20'><animate attributeName='d' values='M60 22 60 42;M60 18 60 38;M60 22 60 42' dur='1.5s' repeatCount='indefinite'/></path>
    <path d='M60 30 50 26'><animate attributeName='d' values='M60 30 50 26;M60 26 40 14;M60 30 50 26' dur='1.5s' repeatCount='indefinite'/></path>
    <path d='M60 30 70 26'><animate attributeName='d' values='M60 30 70 26;M60 26 80 14;M60 30 70 26' dur='1.5s' repeatCount='indefinite'/></path>
    <path d='M60 42 50 58'><animate attributeName='d' values='M60 42 50 58;M60 38 38 56;M60 42 50 58' dur='1.5s' repeatCount='indefinite'/></path>
    <path d='M60 42 70 58'><animate attributeName='d' values='M60 42 70 58;M60 38 82 56;M60 42 70 58' dur='1.5s' repeatCount='indefinite'/></path>
  `),
  'mountain-climber': wrap(`
    <circle cx='80' cy='30' r='6'/>
    <path d='M74 36 56 44 26 44 16 62'/>
    <path d='M56 44 52 62'><animate attributeName='d' values='M56 44 52 62;M56 44 44 36;M56 44 52 62' dur='1.2s' repeatCount='indefinite'/></path>
    <path d='M26 44 22 62'><animate attributeName='d' values='M26 44 22 62;M26 44 36 36;M26 44 22 62' dur='1.2s' repeatCount='indefinite' begin='0.6s'/></path>
  `),
  crunch: wrap(`
    <circle cx='34' cy='38' r='6'><animate attributeName='cx' values='34;44;34' dur='2s' repeatCount='indefinite'/><animate attributeName='cy' values='38;30;38' dur='2s' repeatCount='indefinite'/></circle>
    <path d='M38 42 60 52 80 52'>
      <animate attributeName='d' values='M38 42 60 52 80 52;M48 34 60 44 80 52;M38 42 60 52 80 52' dur='2s' repeatCount='indefinite'/>
    </path>
    <path d='M60 52 56 66'/>
    <path d='M80 52 86 66'/>
  `),
  'leg-raise': wrap(`
    <circle cx='26' cy='42' r='6'/>
    <path d='M32 44h28'/>
    <path d='M60 44 88 44'>
      <animate attributeName='d' values='M60 44 88 44;M60 44 80 20;M60 44 88 44' dur='2.5s' repeatCount='indefinite'/>
    </path>
  `),
  'bicycle-crunch': wrap(`
    <circle cx='36' cy='32' r='6'><animate attributeName='cx' values='36;42;36' dur='1.8s' repeatCount='indefinite'/></circle>
    <path d='M42 36 58 46'/>
    <path d='M58 46 48 62'><animate attributeName='d' values='M58 46 48 62;M58 46 68 62;M58 46 48 62' dur='1.8s' repeatCount='indefinite'/></path>
    <path d='M58 46 78 38'><animate attributeName='d' values='M58 46 78 38;M58 46 44 36;M58 46 78 38' dur='1.8s' repeatCount='indefinite'/></path>
  `),
  'russian-twist': wrap(`
    <circle cx='54' cy='28' r='6'/>
    <path d='M58 34 66 46'/>
    <path d='M66 46 52 54 38 46'/>
    <path d='M52 54 46 66'/>
    <path d='M38 46 32 66'/>
    <g stroke='#4ade80'>
      <circle cx='60' cy='30' r='4' fill='#4ade80' opacity='0.5'>
        <animate attributeName='cx' values='46;74;46' dur='1.8s' repeatCount='indefinite'/>
      </circle>
    </g>
  `),
  'surya-namaskar': wrap(`
    <circle cx='60' cy='16' r='6'>
      <animate attributeName='cy' values='16;14;16' dur='3s' repeatCount='indefinite'/>
    </circle>
    <path d='M60 22v22'/>
    <path d='M60 26 48 12'><animate attributeName='d' values='M60 26 48 12;M60 26 44 8;M60 26 48 12' dur='3s' repeatCount='indefinite'/></path>
    <path d='M60 26 72 12'><animate attributeName='d' values='M60 26 72 12;M60 26 76 8;M60 26 72 12' dur='3s' repeatCount='indefinite'/></path>
    <path d='M60 44 46 60'/>
    <path d='M60 44 74 60'/>
  `),
  'warrior-pose': wrap(`
    <circle cx='56' cy='16' r='6'/>
    <path d='M56 22v20'/>
    <path d='M56 30H30'><animate attributeName='d' values='M56 30 30 30;M56 30 28 26;M56 30 30 30' dur='3s' repeatCount='indefinite'/></path>
    <path d='M56 30h26'><animate attributeName='d' values='M56 30 82 30;M56 30 84 26;M56 30 82 30' dur='3s' repeatCount='indefinite'/></path>
    <path d='M56 42 40 58'/>
    <path d='M56 42 82 44'/>
  `),
  'tree-pose': wrap(`
    <circle cx='60' cy='16' r='6'/>
    <path d='M60 22v24'/>
    <path d='M60 26 48 12'><animate attributeName='d' values='M60 26 48 12;M60 26 46 10;M60 26 48 12' dur='3s' repeatCount='indefinite'/></path>
    <path d='M60 26 72 12'><animate attributeName='d' values='M60 26 72 12;M60 26 74 10;M60 26 72 12' dur='3s' repeatCount='indefinite'/></path>
    <path d='M60 46 48 62'/>
    <path d='M60 38 72 36'/>
    <g><animateTransform attributeName='transform' type='rotate' values='-1 60 46;1 60 46;-1 60 46' dur='4s' repeatCount='indefinite'/></g>
  `),
  'cobra-pose': wrap(`
    <circle cx='78' cy='28' r='6'>
      <animate attributeName='cy' values='28;24;28' dur='3s' repeatCount='indefinite'/>
    </circle>
    <path d='M18 56c18 0 28-4 40-14 8-6 12-8 20-10'>
      <animate attributeName='d' values='M18 56c18 0 28-4 40-14 8-6 12-8 20-10;M18 56c18 0 28-6 40-18 8-8 12-10 20-12;M18 56c18 0 28-4 40-14 8-6 12-8 20-10' dur='3s' repeatCount='indefinite'/>
    </path>
    <path d='M38 54l-4 10'/>
    <path d='M54 44l2 16'/>
  `),
  'child-pose': wrap(`
    <circle cx='72' cy='30' r='6'>
      <animate attributeName='cx' values='72;62;72' dur='3s' repeatCount='indefinite'/>
      <animate attributeName='cy' values='30;44;30' dur='3s' repeatCount='indefinite'/>
    </circle>
    <path d='M66 36 56 44 46 50 36 50'>
      <animate attributeName='d' values='M66 36 56 44 46 50 36 50;M56 48 46 54 36 56 26 56;M66 36 56 44 46 50 36 50' dur='3s' repeatCount='indefinite'/>
    </path>
    <path d='M46 50 42 62'>
      <animate attributeName='d' values='M46 50 42 62;M36 56 34 64;M46 50 42 62' dur='3s' repeatCount='indefinite'/>
    </path>
    <path d='M56 44 60 60'>
      <animate attributeName='d' values='M56 44 60 60;M46 54 50 64;M56 44 60 60' dur='3s' repeatCount='indefinite'/>
    </path>
    <path d='M72 36 86 30'>
      <animate attributeName='d' values='M72 36 86 30;M62 48 50 42;M72 36 86 30' dur='3s' repeatCount='indefinite'/>
    </path>
  `),
  'high-knees': wrap(`
    <circle cx='60' cy='14' r='6'><animate attributeName='cy' values='14;12;14' dur='0.8s' repeatCount='indefinite'/></circle>
    <path d='M60 20v18'/>
    <path d='M60 38 48 56'><animate attributeName='d' values='M60 38 48 56;M60 38 52 28;M60 38 48 56' dur='0.8s' repeatCount='indefinite'/></path>
    <path d='M60 38 72 56'><animate attributeName='d' values='M60 38 72 56;M60 38 68 28;M60 38 72 56' dur='0.8s' repeatCount='indefinite' begin='0.4s'/></path>
    <path d='M60 26 48 22'/>
    <path d='M60 26 72 22'/>
  `),
  'butt-kicks': wrap(`
    <circle cx='60' cy='16' r='6'/>
    <path d='M60 22v18'/>
    <path d='M60 40 48 56'><animate attributeName='d' values='M60 40 48 56;M60 40 52 30;M60 40 48 56' dur='0.9s' repeatCount='indefinite'/></path>
    <path d='M60 40 72 56'><animate attributeName='d' values='M60 40 72 56;M60 40 68 30;M60 40 72 56' dur='0.9s' repeatCount='indefinite' begin='0.45s'/></path>
    <path d='M60 28 48 22'/>
    <path d='M60 28 72 22'/>
  `),
  'lateral-shuffle': wrap(`
    <circle cx='60' cy='18' r='6'>
      <animate attributeName='cx' values='50;70;50' dur='1.5s' repeatCount='indefinite'/>
    </circle>
    <path d='M60 24v16'>
      <animate attributeName='d' values='M50 24 50 40;M70 24 70 40;M50 24 50 40' dur='1.5s' repeatCount='indefinite'/>
    </path>
    <path d='M60 40 48 56'><animate attributeName='d' values='M50 40 38 56;M70 40 58 56;M50 40 38 56' dur='1.5s' repeatCount='indefinite'/></path>
    <path d='M60 40 72 56'><animate attributeName='d' values='M50 40 62 56;M70 40 82 56;M50 40 62 56' dur='1.5s' repeatCount='indefinite'/></path>
  `)
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
  // Generic standing figure with gentle breathing animation
  return wrap(`<circle cx='60' cy='16' r='6'/><path d='M60 22v22'/><path d='M60 30 44 24'><animate attributeName='d' values='M60 30 44 24;M60 30 42 22;M60 30 44 24' dur='3s' repeatCount='indefinite'/></path><path d='M60 30 76 24'><animate attributeName='d' values='M60 30 76 24;M60 30 78 22;M60 30 76 24' dur='3s' repeatCount='indefinite'/></path><path d='M60 44 48 60'/><path d='M60 44 72 60'/>`);
}

export function getExerciseSvg(exerciseId) {
  const normalizedId = String(exerciseId || '').toLowerCase().replace(/_/g, '-');
  const key = aliases[normalizedId] || normalizedId;
  const rootKey = aliases[normalizedId.split('-').slice(0, 2).join('-')] || normalizedId.split('-')[0];
  return svgs[key] || svgs[rootKey] || getGenericSvg(normalizedId);
}
