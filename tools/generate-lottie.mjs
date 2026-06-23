import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXERCISE_KEYFRAMES } from './exerciseKeyframes.js';

const FR = 30, OP = 60, W = 400, H = 400;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'animations');

// STYLE: Solid silhouette — no outlines, single color fills
// Joint circles overlap limb ends to create seamless connections
// Like Nike Training Club / Samsung Health exercise guides

const BODY = [0.2, 0.25, 0.32];       // dark blue-gray body
const BODY_BACK = [0.32, 0.37, 0.43];  // lighter for back limbs (depth)
const SHORTS_C = [0.13, 0.15, 0.18];   // darker shorts
const HEAD_C = [0.2, 0.25, 0.32];      // same as body
const BG = '#ffffff';

const SEG = { upperArm: 52, forearm: 48, thigh: 62, calf: 58, foot: 24 };
// Joint radii — oversized to hide gaps
const JOINT = { shoulder: 11, elbow: 8, wrist: 7, hip: 13, knee: 9, ankle: 8 };

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

function tr(pos = [0,0]) {
  return { ty: 'tr', p: { a: 0, k: pos }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } };
}
function solidFill(color) {
  return { ty: 'fl', c: { a: 0, k: [...color, 1] }, o: { a: 0, k: 100 } };
}

// Rounded rectangle pill (no stroke — just solid fill)
function pill(length, thickness, color) {
  const r = thickness / 2;
  const k = r * 0.552;
  return { ty: 'gr', it: [
    { ty: 'sh', ks: { a: 0, k: {
      v: [[0, -r], [length, -r], [length + r, 0], [length, r], [0, r], [-r, 0]],
      i: [[0, 0], [0, 0], [0, -k], [k, 0], [0, 0], [0, k]],
      o: [[0, 0], [k, 0], [0, k], [0, 0], [-k, 0], [0, -k]],
      c: true
    }}},
    solidFill(color),
    tr()
  ]};
}

// Solid circle (joint overlay)
function dot(radius, color) {
  return { ty: 'gr', it: [
    { ty: 'el', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [radius*2, radius*2] } },
    solidFill(color),
    tr()
  ]};
}

// --- Body parts ---
function headShapes() {
  return [dot(19, HEAD_C)];  // Simple circle head
}

function torsoShapes() {
  return [
    // Torso body — wide shoulders tapering to waist
    { ty: 'gr', it: [
      { ty: 'sh', ks: { a: 0, k: {
        v: [[-26, 0], [26, 0], [22, 25], [19, 50], [17, 75], [15, 95], [-15, 95], [-17, 75], [-19, 50], [-22, 25]],
        i: [[0,0],[0,0],[2,-3],[1,-3],[1,-2],[0,0],[0,0],[-1,-2],[-1,-3],[-2,-3]],
        o: [[0,0],[0,0],[-2,3],[-1,3],[-1,2],[0,0],[0,0],[1,2],[1,3],[2,3]],
        c: true
      }}},
      solidFill(BODY),
      tr()
    ]},
    // Shoulder circles to blend into arms
    dot(JOINT.shoulder, BODY),
  ];
}

function shortsShapes() {
  return [
    { ty: 'gr', it: [
      { ty: 'rc', p: { a: 0, k: [0, 15] }, s: { a: 0, k: [34, 32] }, r: { a: 0, k: 6 } },
      solidFill(SHORTS_C),
      tr()
    ]}
  ];
}

function upperArm(c) { return [pill(SEG.upperArm, 14, c), dot(JOINT.shoulder, c)]; }
function forearm(c) { return [pill(SEG.forearm, 11, c), dot(JOINT.elbow, c)]; }
function hand(c) { return [dot(JOINT.wrist, c)]; }
function thigh(c) { return [pill(SEG.thigh, 17, c), dot(JOINT.hip, c)]; }
function calf(c) { return [pill(SEG.calf, 13, c), dot(JOINT.knee, c)]; }
function foot(c) {
  return [{ ty: 'gr', it: [
    { ty: 'rc', p: { a: 0, k: [10, 0] }, s: { a: 0, k: [24, 10] }, r: { a: 0, k: 5 } },
    solidFill(SHORTS_C),
    tr()
  ]}];
}

function shadowShapes() {
  return [{ ty: 'gr', it: [
    { ty: 'el', p: { a: 0, k: [0, 0] }, s: { a: 0, k: [60, 8] } },
    { ty: 'fl', c: { a: 0, k: [0.6, 0.62, 0.65, 1] }, o: { a: 0, k: 30 } },
    tr()
  ]}];
}

// --- Frames ---
function segF(kf, si, ei, base) {
  return kf.map(({ frame, pose }) => {
    const s = toPx(pose[si]), e = toPx(pose[ei]);
    return { frame, position: [s[0], s[1], 0], rotation: [ang(s, e)], scale: [round((Math.max(10, dist(s, e))/base)*100), 100, 100] };
  });
}
function childF(kf, si, ei, psi, pei, base, ax) {
  return kf.map(({ frame, pose }) => {
    const s = toPx(pose[si]), e = toPx(pose[ei]), ps = toPx(pose[psi]), pe = toPx(pose[pei]);
    return { frame, position: [ax, 0, 0], rotation: [normA(ang(s, e) - ang(ps, pe))], scale: [round((Math.max(10, dist(s, e))/base)*100), 100, 100] };
  });
}
function footF(kf, ai, fi, psi, pei) {
  return kf.map(({ frame, pose }) => {
    const a = toPx(pose[ai]), f = toPx(pose[fi]), ps = toPx(pose[psi]), pe = toPx(pose[pei]);
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
    return { frame, position: [round(n[0]*0.28+p[0]*0.72), round(n[1]*0.28+p[1]*0.72), 0], rotation: [round(ang(n, p) - 90)], scale: [100, round((Math.max(40, dist(n, p))/95)*100), 100] };
  });
}
function headF(kf) {
  return kf.map(({ frame, pose }) => {
    const nose = toPx(pose[0]), neck = toPx(pose[13]);
    const sc = round(Math.min(115, Math.max(85, (Math.max(16, dist(nose, neck))/28)*100)));
    return { frame, position: [neck[0], neck[1], 0], rotation: [round(ang(neck, nose) + 90)], scale: [sc, sc, 100] };
  });
}
function shadowF(kf) {
  return kf.map(({ frame, pose }) => {
    const lf = toPx(pose[15]), rf = toPx(pose[16]);
    return { frame, position: [round((lf[0]+rf[0])/2), round(Math.min(H-14, Math.max(lf[1], rf[1]) + 8)), 0], rotation: [0], scale: [round((Math.max(40, dist(lf, rf))/60)*100), 100, 100] };
  });
}

function layer(nm, shapes, frames, opts = {}) {
  const l = { ty: 4, nm, ip: 0, op: OP, st: 0, bm: 0, ks: { o: sK(opts.opacity || 100), r: aK(frames, 'rotation'), p: aK(frames, 'position'), a: sK([0, 0, 0]), s: aK(frames, 'scale') }, shapes };
  if (opts.ind != null) l.ind = opts.ind;
  if (opts.parent != null) l.parent = opts.parent;
  return l;
}

function buildLottie(id, def) {
  const kf = compact(def.keyframes);
  const I = { shadow:1, bT:2, bC:3, bF:4, bUA:5, bFA:6, bH:7, shorts:8, torso:9, fT:10, fC:11, fF:12, fUA:13, fFA:14, fH:15, head:16 };

  return { v:'5.7.4', fr:FR, ip:0, op:OP, w:W, h:H, nm:id, assets:[], layers: [
    layer('head', headShapes(), headF(kf), { ind:I.head }),
    layer('f-hand', hand(BODY), handF(kf, SEG.forearm), { ind:I.fH, parent:I.fFA }),
    layer('f-forearm', forearm(BODY), childF(kf, 4,6, 2,4, SEG.forearm, SEG.upperArm), { ind:I.fFA, parent:I.fUA }),
    layer('f-upper-arm', upperArm(BODY), segF(kf, 2,4, SEG.upperArm), { ind:I.fUA }),
    layer('f-foot', foot(BODY), footF(kf, 12,16, 10,12), { ind:I.fF, parent:I.fC }),
    layer('f-calf', calf(BODY), childF(kf, 10,12, 8,10, SEG.calf, SEG.thigh), { ind:I.fC, parent:I.fT }),
    layer('f-thigh', thigh(BODY), segF(kf, 8,10, SEG.thigh), { ind:I.fT }),
    layer('torso', torsoShapes(), torsoF(kf), { ind:I.torso }),
    layer('shorts', shortsShapes(), shortsF(kf), { ind:I.shorts }),
    layer('b-hand', hand(BODY_BACK), handF(kf, SEG.forearm), { ind:I.bH, parent:I.bFA, opacity:100 }),
    layer('b-forearm', forearm(BODY_BACK), childF(kf, 3,5, 1,3, SEG.forearm, SEG.upperArm), { ind:I.bFA, parent:I.bUA, opacity:100 }),
    layer('b-upper-arm', upperArm(BODY_BACK), segF(kf, 1,3, SEG.upperArm), { ind:I.bUA, opacity:100 }),
    layer('b-foot', foot(BODY_BACK), footF(kf, 11,15, 9,11), { ind:I.bF, parent:I.bC, opacity:100 }),
    layer('b-calf', calf(BODY_BACK), childF(kf, 9,11, 7,9, SEG.calf, SEG.thigh), { ind:I.bC, parent:I.bT, opacity:100 }),
    layer('b-thigh', thigh(BODY_BACK), segF(kf, 7,9, SEG.thigh), { ind:I.bT, opacity:100 }),
    layer('shadow', shadowShapes(), shadowF(kf), { ind:I.shadow }),
    { ty: 1, nm: 'bg', sw: W, sh: H, sc: BG, ip: 0, op: OP, st: 0, bm: 0, ks: { o: sK(100), r: sK(0), p: sK([W/2, H/2, 0]), a: sK([W/2, H/2, 0]), s: sK([100, 100, 100]) } }
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
  // Skip exercises that already have professional Lotties (>50KB = likely pro)
  let generated = 0, skipped = 0;
  for (const [i,[id,def]] of entries.entries()) {
    const outPath = path.join(OUT, `${id}.json`);
    try {
      const stat = await fs.stat(outPath);
      if (stat.size > 50000) { skipped++; continue; } // Keep pro animations
    } catch {}
    const json = JSON.stringify(buildLottie(id, def));
    await fs.writeFile(outPath, json);
    generated++;
  }
  console.log(`Generated: ${generated}, Kept pro: ${skipped}, Total: ${entries.length}`);
}

main().catch(e => { console.error(e); process.exitCode = 1; });
