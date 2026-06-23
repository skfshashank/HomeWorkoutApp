import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXERCISE_KEYFRAMES } from './exerciseKeyframes.js';

const FR = 30, OP = 60, W = 400, H = 400;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'animations');

// STYLE: Clean line-art outline — black strokes, white fill
// Like professional exercise illustration cards
const STROKE_W = 3.5;
const STROKE_COLOR = [0.15, 0.15, 0.15];
const FILL_COLOR = [1, 1, 1];
const FILL_GRAY = [0.93, 0.93, 0.93];  // slight gray for back limbs
const BG_COLOR = '#ffffff';

const SEG = { upperArm: 52, forearm: 48, thigh: 62, calf: 58, foot: 24 };

const round = (v, d = 1) => Number(v.toFixed(d));
const toPx = ([x, y]) => [round(x * W), round(y * H)];
const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const ang = (a, b) => round((Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI);
const normA = (a) => { while (a > 180) a -= 360; while (a < -180) a += 360; return round(a); };

const sK = (v) => ({ a: 0, k: v });
const aK = (frames, key) => {
  const vals = frames.map(f => ({ t: f.frame, s: f[key] }));
  if (vals.every(v => JSON.stringify(v.s) === JSON.stringify(vals[0].s))) return sK(vals[0].s);
  const kf = vals.map(v => ({ t: v.t, s: v.s, i: { x: 0.42, y: 1 }, o: { x: 0.58, y: 0 } }));
  kf[kf.length - 1].h = 1;
  return { a: 1, k: kf };
};

// Stroke + Fill (the outline style)
function stroke(width = STROKE_W) {
  return { ty: 'st', c: { a: 0, k: [...STROKE_COLOR, 1] }, o: { a: 0, k: 100 }, w: { a: 0, k: width }, lc: 2, lj: 2 };
}
function fill(color = FILL_COLOR, opacity = 100) {
  return { ty: 'fl', c: { a: 0, k: [...color, 1] }, o: { a: 0, k: opacity } };
}
function tr(pos = [0,0]) {
  return { ty: 'tr', p: { a: 0, k: pos }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } };
}

// Capsule/pill shape — perfect for limbs with outline style
function capsule(length, thickness, fillC = FILL_COLOR) {
  const r = thickness / 2;
  const k = r * 0.552;
  const l = length;
  return { ty: 'gr', it: [
    { ty: 'sh', ks: { a: 0, k: {
      v: [[0, -r], [l, -r], [l + r, 0], [l, r], [0, r], [-r, 0]],
      i: [[0, 0], [0, 0], [0, -k], [k, 0], [0, 0], [0, k]],
      o: [[0, 0], [k, 0], [0, k], [0, 0], [-k, 0], [0, -k]],
      c: true
    }}},
    fill(fillC),
    stroke(),
    tr()
  ]};
}

// Circle (for joints and head)
function circle(radius, fillC = FILL_COLOR) {
  return { ty: 'gr', it: [
    { ty: 'el', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [radius*2, radius*2] } },
    fill(fillC),
    stroke(),
    tr()
  ]};
}

// Rounded rect (for torso, shorts)
function roundedRect(w, h, r, fillC = FILL_COLOR, pos = [0, 0]) {
  return { ty: 'gr', it: [
    { ty: 'rc', p: { a: 0, k: pos }, s: { a: 0, k: [w, h] }, r: { a: 0, k: r } },
    fill(fillC),
    stroke(),
    tr()
  ]};
}

// --- Body part factories ---
function headShapes() {
  return [
    circle(18),  // Head circle with outline
    // Hair line on top
    { ty: 'gr', it: [
      { ty: 'sh', ks: { a: 0, k: {
        v: [[-12, -8], [-8, -16], [0, -19], [8, -16], [12, -8]],
        i: [[0, 0], [-2, 0], [-2, 0], [2, 0], [0, 0]],
        o: [[2, 0], [2, 0], [2, 0], [-2, 0], [-2, 0]],
        c: false
      }}},
      stroke(2.5),
      tr()
    ]}
  ];
}

function torsoShapes() {
  return [
    // Main torso — tapered rounded shape
    { ty: 'gr', it: [
      { ty: 'sh', ks: { a: 0, k: {
        v: [[-24, 0], [24, 0], [20, 32], [18, 60], [16, 95], [-16, 95], [-18, 60], [-20, 32]],
        i: [[0, 0], [0, 0], [2, -4], [1, -3], [0, 0], [0, 0], [-1, -3], [-2, -4]],
        o: [[0, 0], [0, 0], [-2, 4], [-1, 3], [0, 0], [0, 0], [1, 3], [2, 4]],
        c: true
      }}},
      fill(),
      stroke(),
      tr()
    ]},
    // Shoulder line detail
    { ty: 'gr', it: [
      { ty: 'sh', ks: { a: 0, k: {
        v: [[-24, 2], [0, 5], [24, 2]],
        i: [[0, 0], [-6, 0], [0, 0]],
        o: [[6, 0], [6, 0], [0, 0]],
        c: false
      }}},
      stroke(1.5),
      tr()
    ]}
  ];
}

function shortsShapes() {
  return [
    { ty: 'gr', it: [
      { ty: 'sh', ks: { a: 0, k: {
        v: [[-22, 0], [22, 0], [20, 12], [16, 30], [5, 30], [2, 14], [-2, 14], [-5, 30], [-16, 30], [-20, 12]],
        i: [[0, 0], [0, 0], [1, -2], [0, 0], [1, 0], [0, -2], [0, -2], [-1, 0], [0, 0], [-1, -2]],
        o: [[0, 0], [0, 0], [-1, 2], [0, 0], [-1, 0], [0, 2], [0, 2], [1, 0], [0, 0], [1, 2]],
        c: true
      }}},
      fill(FILL_GRAY),
      stroke(),
      tr()
    ]}
  ];
}

function upperArmShapes(fillC) { return [capsule(SEG.upperArm, 14, fillC)]; }
function forearmShapes(fillC) { return [capsule(SEG.forearm, 11, fillC)]; }
function handShapes(fillC) { return [circle(6, fillC)]; }
function thighShapes(fillC) { return [capsule(SEG.thigh, 16, fillC)]; }
function calfShapes(fillC) { return [capsule(SEG.calf, 13, fillC)]; }
function footShapes() {
  return [{ ty: 'gr', it: [
    { ty: 'sh', ks: { a: 0, k: {
      v: [[-2, -5], [8, -6], [18, -4], [22, 0], [20, 4], [8, 6], [-2, 5]],
      i: [[0, 0], [-2, 0], [-2, 0], [0, -2], [2, 0], [2, 0], [0, 1]],
      o: [[2, 0], [2, 0], [2, 0], [0, 2], [-2, 0], [-2, 0], [0, -1]],
      c: true
    }}},
    fill(),
    stroke(2.5),
    tr()
  ]}];
}

function shadowShapes() {
  return [{ ty: 'gr', it: [
    { ty: 'el', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [70, 8] } },
    fill([0.7, 0.7, 0.7], 40),
    tr()
  ]}];
}

// --- Frame calculators ---
function segF(kf, si, ei, base) {
  return kf.map(({ frame, pose }) => {
    const s = toPx(pose[si]), e = toPx(pose[ei]);
    const l = Math.max(10, dist(s, e));
    return { frame, position: [s[0], s[1], 0], rotation: [ang(s, e)], scale: [round((l/base)*100), 100, 100] };
  });
}
function childF(kf, si, ei, psi, pei, base, ax) {
  return kf.map(({ frame, pose }) => {
    const s = toPx(pose[si]), e = toPx(pose[ei]);
    const ps = toPx(pose[psi]), pe = toPx(pose[pei]);
    const l = Math.max(10, dist(s, e));
    return { frame, position: [ax, 0, 0], rotation: [normA(ang(s, e) - ang(ps, pe))], scale: [round((l/base)*100), 100, 100] };
  });
}
function footF(kf, ai, fi, psi, pei) {
  return kf.map(({ frame, pose }) => {
    const a = toPx(pose[ai]), f = toPx(pose[fi]);
    const ps = toPx(pose[psi]), pe = toPx(pose[pei]);
    return { frame, position: [SEG.calf, 0, 0], rotation: [normA(ang(a, f) - ang(ps, pe))], scale: [round((Math.max(10, dist(a, f))/SEG.foot)*100), 100, 100] };
  });
}
function handF(kf, ax) { return kf.map(({ frame }) => ({ frame, position: [ax, 0, 0], rotation: [0], scale: [100, 100, 100] })); }
function torsoF(kf) {
  return kf.map(({ frame, pose }) => {
    const n = toPx(pose[13]), p = toPx(pose[14]);
    return { frame, position: [n[0], n[1], 0], rotation: [round(ang(n, p) - 90)], scale: [100, round((Math.max(40, dist(n, p))/95)*100), 100] };
  });
}
function shortsF(kf) {
  return kf.map(({ frame, pose }) => {
    const n = toPx(pose[13]), p = toPx(pose[14]);
    const mx = round(n[0]*0.3 + p[0]*0.7), my = round(n[1]*0.3 + p[1]*0.7);
    return { frame, position: [mx, my, 0], rotation: [round(ang(n, p) - 90)], scale: [100, round((Math.max(40, dist(n, p))/95)*100), 100] };
  });
}
function headF(kf) {
  return kf.map(({ frame, pose }) => {
    const nose = toPx(pose[0]), neck = toPx(pose[13]);
    const l = Math.max(16, dist(nose, neck));
    const sc = round(Math.min(115, Math.max(85, (l/28)*100)));
    return { frame, position: [neck[0], neck[1], 0], rotation: [round(ang(neck, nose) + 90)], scale: [sc, sc, 100] };
  });
}
function shadowF(kf) {
  return kf.map(({ frame, pose }) => {
    const lf = toPx(pose[15]), rf = toPx(pose[16]);
    const cx = round((lf[0]+rf[0])/2), cy = round(Math.min(H-14, Math.max(lf[1], rf[1]) + 8));
    return { frame, position: [cx, cy, 0], rotation: [0], scale: [round((Math.max(40, dist(lf, rf))/70)*100), 100, 100] };
  });
}

// --- Layer builder ---
function layer(nm, shapes, frames, opts = {}) {
  const l = { ty: 4, nm, ip: 0, op: OP, st: 0, bm: 0, ks: { o: sK(opts.opacity || 100), r: aK(frames, 'rotation'), p: aK(frames, 'position'), a: sK([0, 0, 0]), s: aK(frames, 'scale') }, shapes };
  if (opts.ind != null) l.ind = opts.ind;
  if (opts.parent != null) l.parent = opts.parent;
  return l;
}

function buildLottie(id, def) {
  const kf = compact(def.keyframes);
  const I = { shadow:1, bT:2, bC:3, bF:4, bUA:5, bFA:6, bH:7, shorts:8, torso:9, fT:10, fC:11, fF:12, fUA:13, fFA:14, fH:15, head:16 };
  const fc = FILL_COLOR, bc = FILL_GRAY;

  return { v:'5.7.4', fr:FR, ip:0, op:OP, w:W, h:H, nm:id, assets:[], layers: [
    layer('head', headShapes(), headF(kf), { ind:I.head }),
    layer('front hand', handShapes(fc), handF(kf, SEG.forearm), { ind:I.fH, parent:I.fFA }),
    layer('front forearm', forearmShapes(fc), childF(kf, 4,6, 2,4, SEG.forearm, SEG.upperArm), { ind:I.fFA, parent:I.fUA }),
    layer('front upper arm', upperArmShapes(fc), segF(kf, 2,4, SEG.upperArm), { ind:I.fUA }),
    layer('front foot', footShapes(), footF(kf, 12,16, 10,12), { ind:I.fF, parent:I.fC }),
    layer('front calf', calfShapes(fc), childF(kf, 10,12, 8,10, SEG.calf, SEG.thigh), { ind:I.fC, parent:I.fT }),
    layer('front thigh', thighShapes(fc), segF(kf, 8,10, SEG.thigh), { ind:I.fT }),
    layer('torso', torsoShapes(), torsoF(kf), { ind:I.torso }),
    layer('shorts', shortsShapes(), shortsF(kf), { ind:I.shorts }),
    layer('back hand', handShapes(bc), handF(kf, SEG.forearm), { ind:I.bH, parent:I.bFA, opacity:75 }),
    layer('back forearm', forearmShapes(bc), childF(kf, 3,5, 1,3, SEG.forearm, SEG.upperArm), { ind:I.bFA, parent:I.bUA, opacity:75 }),
    layer('back upper arm', upperArmShapes(bc), segF(kf, 1,3, SEG.upperArm), { ind:I.bUA, opacity:75 }),
    layer('back foot', footShapes(), footF(kf, 11,15, 9,11), { ind:I.bF, parent:I.bC, opacity:75 }),
    layer('back calf', calfShapes(bc), childF(kf, 9,11, 7,9, SEG.calf, SEG.thigh), { ind:I.bC, parent:I.bT, opacity:75 }),
    layer('back thigh', thighShapes(bc), segF(kf, 7,9, SEG.thigh), { ind:I.bT, opacity:75 }),
    layer('shadow', shadowShapes(), shadowF(kf), { ind:I.shadow }),
    // Background last (rendered behind everything)
    { ty: 1, nm: 'bg', sw: W, sh: H, sc: BG_COLOR, ip: 0, op: OP, st: 0, bm: 0, ks: { o: sK(100), r: sK(0), p: sK([W/2, H/2, 0]), a: sK([W/2, H/2, 0]), s: sK([100, 100, 100]) } }
  ]};
}

function compact(keyframes) {
  if (keyframes.length <= 4) return keyframes;
  const idx = new Set(Array.from({length:4}, (_,i) => Math.round(i*(keyframes.length-1)/3)));
  return [...idx].sort((a,b)=>a-b).map(i => keyframes[i]);
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const entries = Object.entries(EXERCISE_KEYFRAMES).sort(([a],[b])=>a.localeCompare(b));
  for (const [i,[id,def]] of entries.entries()) {
    const json = JSON.stringify(buildLottie(id, def));
    await fs.writeFile(path.join(OUT, `${id}.json`), json);
    if ((i+1) % 20 === 0 || i === entries.length-1) console.log(`[${i+1}/${entries.length}] ${id} ${round(Buffer.byteLength(json)/1024)}KB`);
  }
  console.log(`Done: ${entries.length} files`);
}

main().catch(e => { console.error(e); process.exitCode = 1; });
