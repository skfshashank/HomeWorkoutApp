const ease = "calcMode='spline' keySplines='.45 0 .2 1;.45 0 .2 1' keyTimes='0;0.5;1'";

const wrap = (body, label = '') => `<svg viewBox='0 0 200 160' xmlns='http://www.w3.org/2000/svg' aria-hidden='true' class='exercise-svg-anim'>
  <defs>
    <linearGradient id='bg-grad' x1='0%' y1='0%' x2='0%' y2='100%'><stop offset='0%' stop-color='#1e293b'/><stop offset='100%' stop-color='#0f172a'/></linearGradient>
    <linearGradient id='body-grad' x1='0%' y1='0%' x2='0%' y2='100%'><stop offset='0%' stop-color='#14b8a6'/><stop offset='100%' stop-color='#0d9488'/></linearGradient>
    <linearGradient id='limb-grad' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='#5eead4'/><stop offset='100%' stop-color='#14b8a6'/></linearGradient>
    <radialGradient id='muscle-glow' cx='50%' cy='50%' r='50%'><stop offset='0%' stop-color='#99f6e4' stop-opacity='.95'/><stop offset='100%' stop-color='#2dd4bf' stop-opacity='0'/></radialGradient>
    <filter id='soft-glow' x='-50%' y='-50%' width='200%' height='200%'><feGaussianBlur stdDeviation='5'/></filter>
  </defs>
  <rect width='200' height='160' rx='16' fill='url(#bg-grad)'/>
  <rect x='10' y='10' width='180' height='140' rx='14' fill='none' stroke='rgba(148,163,184,.16)'/>
  <ellipse cx='100' cy='138' rx='74' ry='8' fill='rgba(15,23,42,.42)'/>
  <line x1='20' y1='140' x2='180' y2='140' stroke='#334155' stroke-width='1'/>
  ${body}
  ${label ? `<text x='100' y='152' text-anchor='middle' fill='#94a3b8' font-size='8' font-family='system-ui, sans-serif'>${label}</text>` : ''}
</svg>`;

const capsule = (x, y, w, h, fill = 'url(#limb-grad)', extra = '') => `<rect x='${x}' y='${y}' width='${w}' height='${h}' rx='${Math.min(w, h) / 2}' fill='${fill}' ${extra}/>`;
const head = (cx, cy, r = 9) => `<circle cx='${cx}' cy='${cy}' r='${r}' fill='url(#body-grad)'/>`;
const torso = (x, y, w = 22, h = 36) => `${capsule(x, y, w, h, 'url(#body-grad)')}${capsule(x + 1, y + h - 5, w - 2, 12, 'url(#body-grad)')}`;
const limb = (x, y, len, thick, from, to, dur = '2.4s', begin = '0s', fill = 'url(#limb-grad)') => `<g transform='rotate(${from} ${x} ${y})'>${capsule(x - thick / 2, y, thick, len, fill)}<animateTransform attributeName='transform' type='rotate' values='${from} ${x} ${y};${to} ${x} ${y};${from} ${x} ${y}' dur='${dur}' begin='${begin}' repeatCount='indefinite' ${ease}/></g>`;
const swing = (x, y, len, thick, from, to, dur = '2.4s', begin = '0s', fill = 'url(#limb-grad)') => `<g transform='rotate(${from} ${x} ${y})'>${capsule(x, y - thick / 2, len, thick, fill)}<animateTransform attributeName='transform' type='rotate' values='${from} ${x} ${y};${to} ${x} ${y};${from} ${x} ${y}' dur='${dur}' begin='${begin}' repeatCount='indefinite' ${ease}/></g>`;
const glow = (x, y, rx, ry, dur = '2.4s', begin = '0s') => `<g filter='url(#soft-glow)'><ellipse cx='${x}' cy='${y}' rx='${rx}' ry='${ry}' fill='url(#muscle-glow)' opacity='.45'><animate attributeName='rx' values='${(rx * 0.82).toFixed(1)};${rx};${(rx * 0.82).toFixed(1)}' dur='${dur}' begin='${begin}' repeatCount='indefinite' ${ease}/><animate attributeName='ry' values='${(ry * 0.82).toFixed(1)};${ry};${(ry * 0.82).toFixed(1)}' dur='${dur}' begin='${begin}' repeatCount='indefinite' ${ease}/><animate attributeName='opacity' values='.18;.62;.18' dur='${dur}' begin='${begin}' repeatCount='indefinite' ${ease}/></ellipse></g>`;
const arc = (d, dur = '2.4s', begin = '0s') => `<path d='${d}' fill='none' stroke='#5eead4' stroke-width='2' stroke-linecap='round' stroke-dasharray='6 7' opacity='.12'><animate attributeName='opacity' values='.06;.24;.06' dur='${dur}' begin='${begin}' repeatCount='indefinite' ${ease}/></path>`;

const svgs = {
  pushup: wrap(`${arc('M118 38q20 18 0 36')}<g><animateTransform attributeName='transform' type='translate' values='0 0;0 9;0 0' dur='2.4s' repeatCount='indefinite' ${ease}/>${glow(122, 58, 19, 10)}${capsule(88, 50, 58, 18, 'url(#body-grad)')}${head(154, 59, 8)}${limb(98, 60, 28, 8, 76, 94, '2.4s')}${limb(116, 60, 28, 8, 80, 96, '2.4s')}${limb(98, 60, 40, 9, 108, 118, '2.4s')}${limb(116, 60, 40, 9, 112, 120, '2.4s')}</g>`, 'Push-up'),
  squat: wrap(`${arc('M74 66q-12 18 2 35', '2.6s')}${arc('M126 66q12 18 -2 35', '2.6s')}<g><animateTransform attributeName='transform' type='translate' values='0 0;0 11;0 0' dur='2.6s' repeatCount='indefinite' ${ease}/>${glow(100, 98, 16, 10, '2.6s')}${head(100, 28)}${torso(89, 39, 22, 34)}${limb(95, 46, 28, 8, -62, -18, '2.6s')}${limb(105, 46, 28, 8, 54, 18, '2.6s')}${limb(96, 69, 42, 10, 10, 42, '2.6s')}${limb(104, 69, 42, 10, -10, -42, '2.6s')}</g>`, 'Squat'),
  plank: wrap(`${arc('M92 42q26 -10 54 2', '3s')}<g><animateTransform attributeName='transform' type='translate' values='0 0;0 2;0 0' dur='3s' repeatCount='indefinite' ${ease}/>${glow(114, 58, 18, 9, '3s')}${capsule(86, 50, 62, 18, 'url(#body-grad)')}${head(154, 58, 8)}${limb(98, 60, 30, 8, 88, 92, '3s')}${limb(118, 60, 30, 8, 90, 94, '3s')}${limb(98, 60, 40, 9, 110, 114, '3s')}${limb(118, 60, 40, 9, 114, 118, '3s')}</g>`, 'Plank'),
  lunge: wrap(`${arc('M120 64q22 12 10 30', '2.6s')}<g><animateTransform attributeName='transform' type='translate' values='0 0;0 8;0 0' dur='2.6s' repeatCount='indefinite' ${ease}/>${glow(118, 96, 15, 9, '2.6s')}${head(92, 30)}${torso(81, 41, 22, 34)}${limb(86, 47, 26, 8, -48, -12, '2.6s')}${limb(98, 47, 26, 8, 36, 12, '2.6s')}${limb(90, 71, 42, 10, 12, 32, '2.6s')}${limb(102, 71, 46, 10, -54, -74, '2.6s')}</g>`, 'Lunge'),
  burpee: wrap(`${arc('M92 36q-20 18 -4 44', '3s')}${arc('M118 38q20 18 0 38', '3s', '1.5s')}${glow(102, 84, 20, 11, '3s')}<g opacity='1'><animate attributeName='opacity' values='1;0;1' dur='3s' repeatCount='indefinite' ${ease}/>${head(100, 28)}${torso(89, 39, 22, 34)}${limb(95, 46, 28, 8, -58, 10, '3s')}${limb(105, 46, 28, 8, 58, -10, '3s')}${limb(96, 69, 40, 10, 12, 50, '3s')}${limb(104, 69, 40, 10, -12, -50, '3s')}</g><g opacity='0'><animate attributeName='opacity' values='0;1;0' dur='3s' repeatCount='indefinite' ${ease}/>${capsule(84, 52, 58, 18, 'url(#body-grad)')}${head(148, 59, 8)}${limb(94, 62, 26, 8, 80, 96, '3s')}${limb(112, 62, 26, 8, 84, 98, '3s')}${limb(94, 62, 38, 9, 108, 118, '3s')}${limb(112, 62, 38, 9, 112, 122, '3s')}</g>`, 'Burpee'),
  'jumping-jack': wrap(`${arc('M62 34q-20 18 -10 42', '2s')}${arc('M138 34q20 18 10 42', '2s')}<g>${glow(100, 60, 22, 12, '2s')}${head(100, 24)}${torso(89, 35, 22, 34)}${limb(95, 42, 30, 8, -34, -120, '2s')}${limb(105, 42, 30, 8, 34, 120, '2s')}${limb(96, 69, 42, 10, 14, 44, '2s')}${limb(104, 69, 42, 10, -14, -44, '2s')}</g>`, 'Jumping Jack'),
  'mountain-climber': wrap(`${arc('M102 50q-8 22 -24 30', '1.8s')}${arc('M126 50q-4 22 -28 34', '1.8s', '.9s')}${glow(112, 60, 18, 10, '1.8s')}${capsule(84, 50, 58, 18, 'url(#body-grad)')}${head(148, 58, 8)}${limb(94, 60, 28, 8, 84, 92, '1.8s')}${limb(112, 60, 28, 8, 86, 94, '1.8s')}${limb(94, 60, 40, 9, 108, 60, '1.8s')}${limb(112, 60, 40, 9, 116, 72, '1.8s', '.9s')}`, 'Mountain Climber'),
  crunch: wrap(`${arc('M62 62q16 -18 34 -8', '2.2s')}${glow(90, 82, 18, 10, '2.2s')}<g transform='rotate(0 88 88)'><animateTransform attributeName='transform' type='rotate' values='0 88 88;-24 88 88;0 88 88' dur='2.2s' repeatCount='indefinite' ${ease}/>${capsule(52, 74, 42, 18, 'url(#body-grad)')}${head(44, 83, 8)}${swing(54, 84, 20, 7, -10, -28, '2.2s')}${swing(54, 84, 20, 7, 10, 28, '2.2s')}</g>${limb(98, 82, 34, 9, 72, 72, '2.2s')}${limb(112, 82, 34, 9, 38, 38, '2.2s')}`, 'Crunch'),
  'leg-raise': wrap(`${arc('M118 52q18 -22 0 -44', '2.6s')}${glow(92, 82, 16, 10, '2.6s')}${capsule(48, 74, 46, 18, 'url(#body-grad)')}${head(40, 83, 8)}${swing(94, 82, 46, 10, 0, -82, '2.6s')}${swing(94, 82, 46, 10, 6, -76, '2.6s')}`, 'Leg Raise'),
  'bicycle-crunch': wrap(`${arc('M62 62q16 -16 30 -10', '1.8s')}${arc('M126 54q12 -10 18 -26', '1.8s', '.9s')}${glow(92, 78, 18, 10, '1.8s')}<g transform='rotate(0 88 86)'><animateTransform attributeName='transform' type='rotate' values='0 88 86;-18 88 86;0 88 86' dur='1.8s' repeatCount='indefinite' ${ease}/>${capsule(50, 72, 42, 18, 'url(#body-grad)')}${head(42, 82, 8)}${swing(54, 82, 18, 7, -18, -38, '1.8s')}${swing(54, 82, 18, 7, 18, 38, '1.8s')}</g>${limb(96, 80, 38, 9, 70, 44, '1.8s')}${limb(112, 80, 38, 9, 24, 56, '1.8s', '.9s')}`, 'Bicycle Crunch'),
  'russian-twist': wrap(`${arc('M76 56q-10 18 2 34', '2s')}${arc('M124 56q10 18 -2 34', '2s')}<g transform='rotate(-12 100 88)'><animateTransform attributeName='transform' type='rotate' values='-12 100 88;12 100 88;-12 100 88' dur='2s' repeatCount='indefinite' ${ease}/>${glow(100, 82, 16, 10, '2s')}${capsule(82, 62, 30, 18, 'url(#body-grad)')}${head(88, 52, 8)}${swing(96, 72, 20, 7, -10, -10, '2s')}${swing(96, 78, 26, 7, 0, 0, '2s')}<circle cx='126' cy='76' r='5' fill='#f59e0b'/></g>${limb(88, 80, 38, 9, 42, 42, '2s')}${limb(104, 80, 38, 9, 16, 16, '2s')}`, 'Russian Twist'),
  'surya-namaskar': wrap(`${arc('M100 28q-34 18 -18 54', '3s')}${glow(100, 74, 18, 12, '3s')}<g opacity='1'><animate attributeName='opacity' values='1;0;1' dur='3s' repeatCount='indefinite' ${ease}/>${head(100, 24)}${torso(89, 35, 22, 34)}${limb(95, 40, 34, 8, -20, -144, '3s')}${limb(105, 40, 34, 8, 20, 144, '3s')}${limb(96, 69, 42, 10, 10, 10, '3s')}${limb(104, 69, 42, 10, -10, -10, '3s')}</g><g opacity='0'><animate attributeName='opacity' values='0;1;0' dur='3s' repeatCount='indefinite' ${ease}/>${capsule(72, 64, 40, 18, 'url(#body-grad)')}${head(116, 72, 8)}${limb(78, 72, 28, 8, 82, 98, '3s')}${limb(94, 72, 28, 8, 90, 104, '3s')}${limb(76, 82, 34, 9, 30, 30, '3s')}${limb(96, 82, 34, 9, -18, -18, '3s')}</g>`, 'Surya Namaskar'),
  'warrior-pose': wrap(`${arc('M140 62q12 6 18 22', '3s')}<g><animateTransform attributeName='transform' type='translate' values='0 0;0 2;0 0' dur='3s' repeatCount='indefinite' ${ease}/>${glow(124, 96, 15, 9, '3s')}${head(86, 30)}${torso(75, 41, 22, 34)}${swing(64, 52, 28, 8, 180, 174, '3s')}${swing(96, 52, 30, 8, 0, 6, '3s')}${limb(84, 71, 42, 10, 20, 26, '3s')}${limb(96, 71, 48, 10, -58, -64, '3s')}</g>`, 'Warrior Pose'),
  'tree-pose': wrap(`${arc('M100 24q-10 18 0 38', '3.4s')}<g><animateTransform attributeName='transform' type='rotate' values='-2 100 88;2 100 88;-2 100 88' dur='3.4s' repeatCount='indefinite' ${ease}/>${glow(100, 76, 14, 10, '3.4s')}${head(100, 28)}${torso(89, 39, 22, 34)}${limb(95, 44, 28, 8, -46, -60, '3.4s')}${limb(105, 44, 28, 8, 46, 60, '3.4s')}${limb(96, 69, 42, 10, 6, 10, '3.4s')}${limb(104, 76, 26, 10, -64, -56, '3.4s')}</g>`, 'Tree Pose'),
  'cobra-pose': wrap(`${arc('M92 74q18 -34 54 -42', '3s')}<g><animateTransform attributeName='transform' type='translate' values='0 0;0 -6;0 0' dur='3s' repeatCount='indefinite' ${ease}/>${glow(104, 76, 17, 10, '3s')}${capsule(52, 82, 46, 16, 'url(#limb-grad)')}${capsule(84, 72, 40, 18, 'url(#body-grad)')}${head(134, 58, 8)}${limb(90, 80, 24, 8, 76, 96, '3s')}${limb(106, 80, 24, 8, 82, 102, '3s')}${swing(56, 90, 26, 8, 0, 0, '3s')}${swing(76, 90, 24, 8, 0, 0, '3s')}</g>`, 'Cobra Pose'),
  'child-pose': wrap(`${arc('M60 86q24 -18 54 -8', '3s')}<g><animateTransform attributeName='transform' type='translate' values='0 0;2 2;0 0' dur='3s' repeatCount='indefinite' ${ease}/>${glow(78, 84, 18, 10, '3s')}${capsule(68, 70, 42, 18, 'url(#body-grad)')}${head(118, 78, 8)}${swing(42, 88, 30, 8, 0, 0, '3s')}${swing(44, 96, 28, 8, 0, 0, '3s')}${limb(78, 82, 24, 9, 84, 88, '3s')}${limb(92, 82, 24, 9, 66, 70, '3s')}</g>`, 'Child Pose'),
  'downward-dog': wrap(`${arc('M96 46q-20 22 -32 54', '3s')}${arc('M108 44q20 24 30 56', '3s')}${glow(106, 58, 18, 10, '3s')}${head(66, 82, 8)}${swing(74, 74, 46, 18, -38, -30, '3s', '0s', 'url(#body-grad)')}${limb(84, 74, 36, 9, 116, 108, '3s')}${limb(98, 74, 36, 9, 98, 90, '3s')}${limb(108, 62, 42, 9, 22, 30, '3s')}${limb(120, 62, 42, 9, 6, 14, '3s')}`, 'Downward Dog'),
  'high-knees': wrap(`${arc('M84 68q-18 -10 -8 -36', '1.6s')}${arc('M116 68q18 -10 8 -36', '1.6s', '.8s')}${glow(100, 92, 16, 10, '1.6s')}${head(100, 26)}${torso(89, 37, 22, 34)}${limb(95, 44, 26, 8, -42, 18, '1.6s')}${limb(105, 44, 26, 8, 42, -18, '1.6s', '.8s')}${limb(96, 69, 40, 10, 12, -18, '1.6s')}${limb(104, 69, 40, 10, -12, -58, '1.6s', '.8s')}`, 'High Knees'),
  'butt-kicks': wrap(`${arc('M82 78q-10 -18 6 -42', '1.6s')}${arc('M118 78q10 -18 -6 -42', '1.6s', '.8s')}${glow(100, 100, 16, 10, '1.6s')}${head(100, 26)}${torso(89, 37, 22, 34)}${limb(95, 44, 26, 8, -34, 10, '1.6s')}${limb(105, 44, 26, 8, 34, -10, '1.6s', '.8s')}${limb(96, 69, 40, 10, 16, -26, '1.6s')}${limb(104, 69, 40, 10, -16, -74, '1.6s', '.8s')}`, 'Butt Kicks'),
  'lateral-shuffle': wrap(`${arc('M74 70q18 -14 42 0', '1.8s')}${glow(100, 98, 18, 10, '1.8s')}<g><animateTransform attributeName='transform' type='translate' values='-10 0;10 0;-10 0' dur='1.8s' repeatCount='indefinite' ${ease}/>${head(100, 28)}${torso(89, 39, 22, 34)}${limb(95, 46, 24, 8, -56, -10, '1.8s')}${limb(105, 46, 24, 8, 24, -24, '1.8s')}${limb(96, 69, 40, 10, 18, 34, '1.8s')}${limb(104, 69, 40, 10, -26, -42, '1.8s')}</g>`, 'Lateral Shuffle'),
  bridge: wrap(`${arc('M72 92q30 -34 62 -6', '2.6s')}${glow(96, 88, 18, 10, '2.6s')}<g><animateTransform attributeName='transform' type='translate' values='0 10;0 0;0 10' dur='2.6s' repeatCount='indefinite' ${ease}/>${capsule(52, 86, 44, 16, 'url(#body-grad)')}${head(42, 94, 8)}${capsule(90, 76, 34, 20, 'url(#body-grad)')}${limb(94, 92, 30, 9, 58, 46, '2.6s')}${limb(110, 92, 30, 9, 24, 12, '2.6s')}${swing(54, 96, 22, 7, 0, 0, '2.6s')}${swing(68, 96, 20, 7, 0, 0, '2.6s')}</g>`, 'Bridge')
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
  return wrap(`<g><animateTransform attributeName='transform' type='translate' values='0 0;0 2;0 0' dur='3s' repeatCount='indefinite' ${ease}/>${glow(100, 86, 15, 10, '3s')}${head(100, 28)}${torso(89, 39, 22, 34)}${limb(95, 46, 28, 8, -52, -42, '3s')}${limb(105, 46, 28, 8, 52, 42, '3s')}${limb(96, 69, 42, 10, 10, 14, '3s')}${limb(104, 69, 42, 10, -10, -14, '3s')}</g>`, 'Exercise');
}

export function getExerciseSvg(exerciseId) {
  const normalizedId = String(exerciseId || '').toLowerCase().replace(/_/g, '-');
  const key = aliases[normalizedId] || normalizedId;
  const rootKey = aliases[normalizedId.split('-').slice(0, 2).join('-')] || normalizedId.split('-')[0];
  return svgs[key] || svgs[rootKey] || getGenericSvg(normalizedId);
}
