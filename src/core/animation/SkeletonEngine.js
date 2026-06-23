import { STANDING_FRONT } from './exerciseKeyframes.js';

const CONNECTIONS = [
  [13, 0], [1, 13], [2, 13], [1, 3], [3, 5], [2, 4], [4, 6],
  [13, 14], [7, 14], [8, 14], [7, 9], [9, 11], [8, 10], [10, 12], [11, 15], [12, 16]
];

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const round = (v) => Number(v.toFixed(3));
const clonePose = (pose) => pose.map(([x, y]) => [round(x), round(y)]);
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const ang = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);
const lerpPt = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

// Color palette
const BG_1 = '#0F172A';
const BG_2 = '#1E293B';
const SKIN = '#C8956C';
const SKIN_DK = '#A67B52';
const SKIN_LT = '#DEBB96';
const SHIRT = '#2563EB';
const SHIRT_LT = '#3B82F6';
const SHIRT_DK = '#1D4ED8';
const SHORTS = '#1E293B';
const SHORTS_DK = '#111827';
const HAIR = '#1C1917';
const SHOE = '#1F2937';
const SHOE_SOLE = '#0F172A';

// Tapered limb segment with muscle bulge
function limb(ctx, a, b, wA, wB, bulge = 0) {
  if (!a || !b || dist(a, b) < 1) return;
  const angle = ang(a, b);
  const px = Math.cos(angle + Math.PI / 2);
  const py = Math.sin(angle + Math.PI / 2);
  const mx = (a[0] + b[0]) / 2 + px * bulge;
  const my = (a[1] + b[1]) / 2 + py * bulge;

  ctx.beginPath();
  ctx.moveTo(a[0] + px * wA / 2, a[1] + py * wA / 2);
  ctx.quadraticCurveTo(mx + px * (wA + wB) / 3.5, my + py * (wA + wB) / 3.5,
    b[0] + px * wB / 2, b[1] + py * wB / 2);
  ctx.lineTo(b[0] - px * wB / 2, b[1] - py * wB / 2);
  ctx.quadraticCurveTo(mx - px * (wA + wB) / 3.5, my - py * (wA + wB) / 3.5,
    a[0] - px * wA / 2, a[1] - py * wA / 2);
  ctx.closePath();
  ctx.fill();
}

// Circle at a joint (fills gaps between limb segments)
function joint(ctx, pt, r) {
  if (!pt) return;
  ctx.beginPath();
  ctx.arc(pt[0], pt[1], r, 0, Math.PI * 2);
  ctx.fill();
}

export class SkeletonEngine {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = options.width || 400;
    this.height = options.height || 400;
    this.fps = options.fps || 30;
    this.keyframes = [];
    this.currentFrame = 0;
    this.totalFrames = options.totalFrames || 60;
    this.playing = false;
    this.speed = 1;
    this.animationId = null;
    this.lastTick = 0;
    this.frameDuration = 1000 / this.fps;
    this.boundTick = (time) => this.tick(time);
    this.prevPose = null;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  loadExercise(keyframes = []) {
    this.keyframes = [...keyframes]
      .map((f) => ({ frame: Number(f.frame || 0), pose: clonePose(f.pose || STANDING_FRONT) }))
      .sort((a, b) => a.frame - b.frame);
    this.currentFrame = 0;
    this.prevPose = null;
    this.drawFrame(this.interpolate(0));
  }

  interpolate(frame) {
    if (!this.keyframes.length) return clonePose(STANDING_FRONT);
    if (this.keyframes.length === 1) return clonePose(this.keyframes[0].pose);
    const wrapped = ((frame % this.totalFrames) + this.totalFrames) % this.totalFrames;
    const kfs = this.keyframes.map((k) => ({
      frame: k.frame >= this.totalFrames ? this.totalFrames : k.frame, pose: k.pose
    }));
    let prev = kfs[0], next = kfs[kfs.length - 1];
    for (let i = 0; i < kfs.length; i++) {
      if (kfs[i].frame <= wrapped) prev = kfs[i];
      if (kfs[i].frame >= wrapped) { next = kfs[i]; break; }
    }
    if (next.frame < prev.frame || wrapped > kfs[kfs.length - 1].frame) {
      next = { frame: kfs[0].frame + this.totalFrames, pose: kfs[0].pose };
    }
    const local = wrapped < prev.frame ? wrapped + this.totalFrames : wrapped;
    const span = Math.max(next.frame - prev.frame, 1);
    const t = easeInOut((local - prev.frame) / span);
    return prev.pose.map(([px, py], i) => {
      const [nx, ny] = next.pose[i] || [px, py];
      return [round(px + (nx - px) * t), round(py + (ny - py) * t)];
    });
  }

  clear() { this.ctx.clearRect(0, 0, this.width, this.height); }

  drawBackground() {
    const ctx = this.ctx, W = this.width, H = this.height;
    const g = ctx.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.5, W * 0.8);
    g.addColorStop(0, BG_2); g.addColorStop(1, BG_1);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  drawShadow(p) {
    const lf = p[15] || p[11], rf = p[16] || p[12];
    if (!lf && !rf) return;
    const cx = ((lf?.[0] || this.width * 0.45) + (rf?.[0] || this.width * 0.55)) / 2;
    const cy = this.height * 0.95;
    const spread = Math.abs((lf?.[0] || 0) - (rf?.[0] || 0)) * 0.25 + 20;
    const ctx = this.ctx;
    ctx.save(); ctx.globalAlpha = 0.3;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, spread);
    g.addColorStop(0, 'rgba(0,0,0,0.4)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(cx, cy, spread, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // Draw one full arm: shoulder->elbow->wrist with joint fillers
  drawArm(ctx, shoulder, elbow, wrist, side) {
    if (!shoulder || !elbow) return;
    const b = side === 'back' ? -1.5 : 1.5;

    // Joint circles first (fill seams between segments)
    ctx.fillStyle = SKIN;
    joint(ctx, shoulder, 7);
    joint(ctx, elbow, 5.5);

    // Upper arm (bicep)
    const ug = ctx.createLinearGradient(shoulder[0], shoulder[1], elbow[0], elbow[1]);
    ug.addColorStop(0, SKIN_LT); ug.addColorStop(0.5, SKIN); ug.addColorStop(1, SKIN_DK);
    ctx.fillStyle = ug;
    limb(ctx, shoulder, elbow, 13, 10, b);

    // Forearm
    if (wrist) {
      ctx.fillStyle = SKIN;
      joint(ctx, wrist, 4);
      const fg = ctx.createLinearGradient(elbow[0], elbow[1], wrist[0], wrist[1]);
      fg.addColorStop(0, SKIN); fg.addColorStop(0.6, SKIN_LT); fg.addColorStop(1, SKIN_DK);
      ctx.fillStyle = fg;
      limb(ctx, elbow, wrist, 10, 7, b * 0.5);
      // Hand
      ctx.fillStyle = SKIN;
      joint(ctx, wrist, 5);
    }
  }

  // Draw one full leg: hip->knee->ankle with joint fillers
  drawFullLeg(ctx, hip, knee, ankle, foot, side) {
    if (!hip || !knee) return;
    const b = side === 'back' ? -2.5 : 2.5;

    // Joint fillers
    ctx.fillStyle = SKIN;
    joint(ctx, hip, 9);
    joint(ctx, knee, 7);

    // Full thigh (hip to knee)
    const tg = ctx.createLinearGradient(hip[0], hip[1], knee[0], knee[1]);
    tg.addColorStop(0, SKIN); tg.addColorStop(0.4, SKIN_LT); tg.addColorStop(1, SKIN);
    ctx.fillStyle = tg;
    limb(ctx, hip, knee, 17, 12, b);

    // Calf (knee to ankle)
    if (ankle) {
      ctx.fillStyle = SKIN;
      joint(ctx, ankle, 4.5);
      const cg = ctx.createLinearGradient(knee[0], knee[1], ankle[0], ankle[1]);
      cg.addColorStop(0, SKIN); cg.addColorStop(0.3, SKIN_LT); cg.addColorStop(1, SKIN_DK);
      ctx.fillStyle = cg;
      limb(ctx, knee, ankle, 12, 8, b * 0.5);

      // Shoe
      if (foot) this.drawShoe(ctx, ankle, foot);
    }
  }

  drawShoe(ctx, ankle, foot) {
    if (!ankle || !foot) return;
    const a = ang(ankle, foot);
    const len = Math.max(dist(ankle, foot), 14);
    ctx.save();
    ctx.translate(ankle[0], ankle[1]);
    ctx.rotate(a);
    ctx.fillStyle = SHOE;
    ctx.beginPath();
    ctx.moveTo(-3, -5); ctx.lineTo(len * 0.85, -4);
    ctx.quadraticCurveTo(len + 3, 0, len * 0.85, 5);
    ctx.lineTo(-3, 5); ctx.quadraticCurveTo(-5, 0, -3, -5);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = SHOE_SOLE;
    ctx.beginPath();
    ctx.moveTo(0, 4); ctx.lineTo(len * 0.85, 4.5);
    ctx.lineTo(len * 0.88, 7); ctx.lineTo(-1, 6.5);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  drawTorso(ctx, neck, ls, rs, lh, rh, pelvis) {
    if (!neck || !ls || !rs || !lh || !rh) return;

    // Waist narrows for V-taper
    const waistY = lerp((ls[1] + rs[1]) / 2, (lh[1] + rh[1]) / 2, 0.55);
    const lW = [lerp(ls[0], lh[0], 0.5) + 4, waistY];
    const rW = [lerp(rs[0], rh[0], 0.5) - 4, waistY];

    const sg = ctx.createLinearGradient(ls[0] - 6, ls[1], rs[0] + 6, rh[1]);
    sg.addColorStop(0, SHIRT_DK); sg.addColorStop(0.3, SHIRT);
    sg.addColorStop(0.7, SHIRT_LT); sg.addColorStop(1, SHIRT_DK);
    ctx.fillStyle = sg;

    ctx.beginPath();
    ctx.moveTo(ls[0] - 5, ls[1]);
    ctx.quadraticCurveTo(neck[0], neck[1] + 5, rs[0] + 5, rs[1]);
    ctx.quadraticCurveTo(rs[0] + 4, lerp(rs[1], rW[1], 0.5), rW[0], rW[1]);
    ctx.quadraticCurveTo(rh[0] + 2, lerp(rW[1], rh[1], 0.5), rh[0] + 4, rh[1] + 2);
    ctx.lineTo(lh[0] - 4, lh[1] + 2);
    ctx.quadraticCurveTo(lh[0] - 2, lerp(lW[1], lh[1], 0.5), lW[0], lW[1]);
    ctx.quadraticCurveTo(ls[0] - 4, lerp(ls[1], lW[1], 0.5), ls[0] - 5, ls[1]);
    ctx.closePath();
    ctx.fill();

    // Sleeve caps (cover shoulder-arm junction perfectly)
    ctx.fillStyle = SHIRT;
    joint(ctx, ls, 8);
    joint(ctx, rs, 8);

    // Subtle center line
    ctx.save(); ctx.globalAlpha = 0.1; ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(neck[0], neck[1] + 6);
    ctx.lineTo(pelvis ? pelvis[0] : neck[0], waistY);
    ctx.stroke(); ctx.restore();
  }

  drawShorts(ctx, lh, rh, lk, rk) {
    if (!lh || !rh || !lk || !rk) return;
    ctx.fillStyle = SHORTS;

    // Left short leg
    const lEnd = lerpPt(lh, lk, 0.42);
    limb(ctx, lh, lEnd, 20, 16, 1.5);
    // Right short leg
    const rEnd = lerpPt(rh, rk, 0.42);
    limb(ctx, rh, rEnd, 20, 16, -1.5);

    // Crotch area fill
    ctx.beginPath();
    ctx.moveTo(lh[0] - 7, lh[1] - 1);
    ctx.lineTo(rh[0] + 7, rh[1] - 1);
    ctx.lineTo(rh[0] + 3, rh[1] + 8);
    ctx.lineTo(lh[0] - 3, lh[1] + 8);
    ctx.closePath(); ctx.fill();

    // Waistband
    ctx.fillStyle = SHORTS_DK;
    ctx.beginPath();
    ctx.moveTo(lh[0] - 8, lh[1] - 3);
    ctx.lineTo(rh[0] + 8, rh[1] - 3);
    ctx.lineTo(rh[0] + 7, rh[1] + 2);
    ctx.lineTo(lh[0] - 7, lh[1] + 2);
    ctx.closePath(); ctx.fill();
  }

  drawNeck(ctx, neck, nose) {
    if (!neck || !nose) return;
    ctx.fillStyle = SKIN;
    joint(ctx, neck, 6);
    limb(ctx, neck, lerpPt(neck, nose, 0.25), 11, 9, 0);
  }

  drawHead(ctx, nose, neck) {
    if (!nose) return;
    const R = 17;
    const ha = neck ? ang(neck, nose) : -Math.PI / 2;
    ctx.save();
    ctx.translate(nose[0], nose[1]);
    ctx.rotate(ha + Math.PI / 2);

    // Hair back
    ctx.fillStyle = HAIR;
    ctx.beginPath(); ctx.ellipse(0, -1, R * 0.88, R + 1, 0, Math.PI, 0); ctx.fill();

    // Face
    const hg = ctx.createRadialGradient(-2, -1, 0, 0, 0, R);
    hg.addColorStop(0, SKIN_LT); hg.addColorStop(0.55, SKIN); hg.addColorStop(1, SKIN_DK);
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.ellipse(0, 0, R * 0.8, R, 0, 0, Math.PI * 2); ctx.fill();

    // Hair top
    ctx.fillStyle = HAIR;
    ctx.beginPath(); ctx.ellipse(0, -R * 0.48, R * 0.72, R * 0.55, 0, Math.PI, 0, true); ctx.fill();

    // Ear
    ctx.fillStyle = SKIN_DK;
    ctx.beginPath(); ctx.ellipse(R * 0.7, 1, 3, 4, 0, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
  }

  drawBody(p) {
    const ctx = this.ctx;
    const nose = p[0], neck = p[13], pelvis = p[14];
    const ls = p[1], rs = p[2], le = p[3], re = p[4], lw = p[5], rw = p[6];
    const lh = p[7], rh = p[8], lk = p[9], rk = p[10], la = p[11], ra = p[12];
    const lf = p[15], rf = p[16];

    // === BACK LIMBS (slightly dimmed for depth) ===
    ctx.save(); ctx.globalAlpha = 0.72;
    this.drawFullLeg(ctx, lh, lk, la, lf, 'back');
    this.drawArm(ctx, ls, le, lw, 'back');
    ctx.restore();

    // === CLOTHING (on top of skin, hides hip/shoulder joints) ===
    this.drawShorts(ctx, lh, rh, lk, rk);
    this.drawTorso(ctx, neck, ls, rs, lh, rh, pelvis);

    // === FRONT LIMBS ===
    this.drawFullLeg(ctx, rh, rk, ra, rf, 'front');
    this.drawArm(ctx, rs, re, rw, 'front');

    // === NECK + HEAD ===
    this.drawNeck(ctx, neck, nose);
    this.drawHead(ctx, nose, neck);
  }

  drawFrame(pose) {
    const p = pose.map(([x, y]) => [x * this.width, y * this.height]);
    this.clear();
    this.drawBackground();
    this.drawShadow(p);
    this.drawBody(p);
    this.prevPose = pose;
  }

  tick(timestamp) {
    if (!this.playing) return;
    if (!this.lastTick) this.lastTick = timestamp;
    const delta = timestamp - this.lastTick;
    if (delta >= this.frameDuration) {
      const step = (delta / this.frameDuration) * this.speed;
      this.currentFrame = (this.currentFrame + step) % this.totalFrames;
      this.drawFrame(this.interpolate(this.currentFrame));
      this.lastTick = timestamp;
    }
    this.animationId = window.requestAnimationFrame(this.boundTick);
  }

  play() {
    if (this.playing) return;
    this.playing = true; this.lastTick = 0;
    this.animationId = window.requestAnimationFrame(this.boundTick);
  }

  pause() {
    this.playing = false;
    if (this.animationId) { window.cancelAnimationFrame(this.animationId); this.animationId = null; }
  }

  setSpeed(speed = 1) { this.speed = Math.max(0.1, Number(speed) || 1); }

  destroy() { this.pause(); this.keyframes = []; this.prevPose = null; this.clear(); }
}

export { CONNECTIONS, easeInOut };
