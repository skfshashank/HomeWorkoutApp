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
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

// Color scheme
const BG_1 = '#0B1120';
const BG_2 = '#162032';
const ACCENT = [45, 212, 191]; // Teal RGB
const ACCENT_HEX = '#2DD4BF';
const ACCENT_DK = '#0D9488';
const ACCENT_LT = '#5EEAD4';
const GLOW_COL = 'rgba(45,212,191,0.3)';

// Smooth thick limb with round caps — the key building block
function drawLimb(ctx, a, b, w) {
  if (!a || !b) return;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
}

// Curved limb through a midpoint for natural bend
function drawCurvedLimb(ctx, a, cp, b, w) {
  if (!a || !b) return;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  if (cp) {
    ctx.quadraticCurveTo(cp[0], cp[1], b[0], b[1]);
  } else {
    ctx.lineTo(b[0], b[1]);
  }
  ctx.stroke();
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
      frame: k.frame >= this.totalFrames ? this.totalFrames : k.frame,
      pose: k.pose
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
    const ctx = this.ctx;
    const W = this.width, H = this.height;
    // Deep dark radial gradient
    const g = ctx.createRadialGradient(W / 2, H * 0.4, 0, W / 2, H * 0.5, W);
    g.addColorStop(0, BG_2);
    g.addColorStop(1, BG_1);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Floor glow
    const fg = ctx.createRadialGradient(W / 2, H * 0.95, 0, W / 2, H * 0.95, W * 0.35);
    fg.addColorStop(0, 'rgba(45,212,191,0.07)');
    fg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.ellipse(W / 2, H * 0.95, W * 0.35, 15, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  drawShadow(p) {
    const lf = p[15] || p[11], rf = p[16] || p[12];
    if (!lf && !rf) return;
    const cx = ((lf?.[0] || this.width * 0.45) + (rf?.[0] || this.width * 0.55)) / 2;
    const cy = this.height * 0.95;
    const spread = Math.abs((lf?.[0] || 0) - (rf?.[0] || 0)) * 0.35 + 30;
    const ctx = this.ctx;
    ctx.save();
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, spread);
    g.addColorStop(0, 'rgba(45,212,191,0.12)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy, spread, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawTrails(p, prev) {
    if (!prev) return;
    const ctx = this.ctx;
    ctx.save();
    const pts = [5, 6, 15, 16];
    pts.forEach((i) => {
      const c = p[i], pr = prev[i];
      if (!c || !pr) return;
      const d = dist(c, pr);
      if (d < 4) return;
      const alpha = Math.min(0.5, d / 30);
      const g = ctx.createLinearGradient(pr[0], pr[1], c[0], c[1]);
      g.addColorStop(0, `rgba(${ACCENT},0)`);
      g.addColorStop(1, `rgba(${ACCENT},${alpha})`);
      ctx.strokeStyle = g;
      ctx.lineWidth = Math.min(12, d / 3);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(pr[0], pr[1]);
      ctx.lineTo(c[0], c[1]);
      ctx.stroke();
    });
    ctx.restore();
  }

  makeBodyGradient(p) {
    const ys = p.filter(Boolean).map(pt => pt[1]);
    const minY = Math.min(...ys) - 15;
    const maxY = Math.max(...ys) + 10;
    const g = this.ctx.createLinearGradient(0, minY, 0, maxY);
    g.addColorStop(0, ACCENT_LT);
    g.addColorStop(0.4, ACCENT_HEX);
    g.addColorStop(1, ACCENT_DK);
    return g;
  }

  drawBody(p) {
    const ctx = this.ctx;

    // Two-pass: glow layer then body layer
    // Pass 1: Soft glow (bigger, blurred)
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.shadowColor = ACCENT_HEX;
    ctx.shadowBlur = 25;
    const glowStyle = ACCENT_HEX;
    ctx.strokeStyle = glowStyle;
    ctx.fillStyle = glowStyle;
    this.drawBodyParts(ctx, p, 1.4); // 40% wider for glow
    ctx.restore();

    // Pass 2: Crisp body
    ctx.save();
    const grad = this.makeBodyGradient(p);
    ctx.strokeStyle = grad;
    ctx.fillStyle = grad;
    ctx.shadowColor = GLOW_COL;
    ctx.shadowBlur = 12;
    this.drawBodyParts(ctx, p, 1.0);
    ctx.restore();
  }

  drawBodyParts(ctx, p, scale) {
    const s = scale;
    const nose = p[0], neck = p[13], pelvis = p[14];
    const ls = p[1], rs = p[2], le = p[3], re = p[4], lw = p[5], rw = p[6];
    const lh = p[7], rh = p[8], lk = p[9], rk = p[10], la = p[11], ra = p[12];
    const lf = p[15], rf = p[16];

    // --- BACK LIMBS (dimmed) ---
    ctx.globalAlpha = (scale > 1) ? ctx.globalAlpha : 0.55;

    // Left arm
    drawLimb(ctx, ls, le, 14 * s);
    drawLimb(ctx, le, lw, 12 * s);
    if (lw) { ctx.beginPath(); ctx.arc(lw[0], lw[1], 6 * s, 0, Math.PI * 2); ctx.fill(); }

    // Left leg
    drawLimb(ctx, lh, lk, 18 * s);
    drawLimb(ctx, lk, la, 15 * s);
    if (la && lf) drawLimb(ctx, la, lf, 12 * s);
    else if (la) { ctx.beginPath(); ctx.arc(la[0], la[1], 7 * s, 0, Math.PI * 2); ctx.fill(); }

    // --- TORSO (full opacity) ---
    ctx.globalAlpha = (scale > 1) ? ctx.globalAlpha : 1;

    // Torso: draw as thick lines connecting shoulders to hips through neck/pelvis
    if (neck && pelvis) {
      // Central spine
      drawLimb(ctx, neck, pelvis, 28 * s);
    }
    // Shoulder bar
    if (ls && rs) {
      drawLimb(ctx, ls, rs, 16 * s);
    }
    // Hip bar
    if (lh && rh) {
      drawLimb(ctx, lh, rh, 16 * s);
    }
    // Fill the torso area as a smooth shape on top
    if (ls && rs && lh && rh) {
      ctx.beginPath();
      ctx.moveTo(ls[0] - 4 * s, ls[1]);
      ctx.lineTo(rs[0] + 4 * s, rs[1]);
      ctx.quadraticCurveTo(
        rs[0] + 2 * s, lerp(rs[1], rh[1], 0.5),
        rh[0] + 2 * s, rh[1]
      );
      ctx.lineTo(lh[0] - 2 * s, lh[1]);
      ctx.quadraticCurveTo(
        ls[0] - 2 * s, lerp(ls[1], lh[1], 0.5),
        ls[0] - 4 * s, ls[1]
      );
      ctx.closePath();
      ctx.fill();
    }

    // Neck
    if (nose && neck) {
      drawLimb(ctx, neck, [nose[0], nose[1] + 10 * s], 12 * s);
    }

    // Head
    if (nose) {
      const hr = 18 * s;
      ctx.beginPath();
      ctx.arc(nose[0], nose[1], hr, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- FRONT LIMBS (full opacity) ---
    ctx.globalAlpha = (scale > 1) ? ctx.globalAlpha : 1;

    // Right arm
    drawLimb(ctx, rs, re, 14 * s);
    drawLimb(ctx, re, rw, 12 * s);
    if (rw) { ctx.beginPath(); ctx.arc(rw[0], rw[1], 6 * s, 0, Math.PI * 2); ctx.fill(); }

    // Right leg
    drawLimb(ctx, rh, rk, 18 * s);
    drawLimb(ctx, rk, ra, 15 * s);
    if (ra && rf) drawLimb(ctx, ra, rf, 12 * s);
    else if (ra) { ctx.beginPath(); ctx.arc(ra[0], ra[1], 7 * s, 0, Math.PI * 2); ctx.fill(); }
  }

  drawFrame(pose) {
    const W = this.width, H = this.height;
    const p = pose.map(([x, y]) => [x * W, y * H]);
    const prev = this.prevPose ? this.prevPose.map(([x, y]) => [x * W, y * H]) : null;

    this.clear();
    this.drawBackground();
    this.drawShadow(p);
    this.drawTrails(p, prev);
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
    this.playing = true;
    this.lastTick = 0;
    this.animationId = window.requestAnimationFrame(this.boundTick);
  }

  pause() {
    this.playing = false;
    if (this.animationId) {
      window.cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  setSpeed(speed = 1) { this.speed = Math.max(0.1, Number(speed) || 1); }

  destroy() {
    this.pause();
    this.keyframes = [];
    this.prevPose = null;
    this.clear();
  }
}

export { CONNECTIONS, easeInOut };
