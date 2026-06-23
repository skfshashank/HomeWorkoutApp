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

// Silhouette palette
const BODY_TOP = '#2DD4BF';     // Teal/mint gradient top
const BODY_BOT = '#0F766E';     // Darker teal bottom
const GLOW = 'rgba(45,212,191,0.25)';
const BG_1 = '#0F172A';         // Dark navy bg
const BG_2 = '#1E293B';
const SHADOW_COL = 'rgba(45,212,191,0.08)';
const TRAIL_COL = [45, 212, 191]; // RGB for trails

// Draw a tapered rounded limb (the core building block)
function limb(ctx, a, b, wA, wB) {
  if (!a || !b) return;
  const angle = ang(a, b);
  const px = Math.cos(angle + Math.PI / 2);
  const py = Math.sin(angle + Math.PI / 2);
  const mx = lerp(a[0], b[0], 0.4);
  const my = lerp(a[1], b[1], 0.4);
  const bulge = Math.max(wA, wB) * 1.1;

  ctx.beginPath();
  ctx.moveTo(a[0] + px * wA, a[1] + py * wA);
  ctx.quadraticCurveTo(mx + px * bulge, my + py * bulge, b[0] + px * wB, b[1] + py * wB);
  ctx.lineTo(b[0] - px * wB, b[1] - py * wB);
  ctx.quadraticCurveTo(mx - px * bulge, my - py * bulge, a[0] - px * wA, a[1] - py * wA);
  ctx.closePath();
  ctx.fill();
}

// Rounded joint connector
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
    // Dark gradient background
    const grad = ctx.createRadialGradient(W / 2, H * 0.4, 0, W / 2, H * 0.5, W * 0.85);
    grad.addColorStop(0, BG_2);
    grad.addColorStop(1, BG_1);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Subtle floor glow
    const floorGrad = ctx.createRadialGradient(W / 2, H * 0.94, 0, W / 2, H * 0.94, W * 0.4);
    floorGrad.addColorStop(0, 'rgba(45,212,191,0.06)');
    floorGrad.addColorStop(1, 'rgba(45,212,191,0)');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, H * 0.85, W, H * 0.15);
  }

  drawShadow(p) {
    const lf = p[15] || p[11], rf = p[16] || p[12];
    const cx = ((lf?.[0] || this.width * 0.45) + (rf?.[0] || this.width * 0.55)) / 2;
    const cy = this.height * 0.94;
    const spread = Math.abs((lf?.[0] || 0) - (rf?.[0] || 0)) * 0.4 + 35;

    const ctx = this.ctx;
    ctx.save();
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, spread);
    grad.addColorStop(0, SHADOW_COL);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, spread, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawTrails(p, prev) {
    if (!prev) return;
    const ctx = this.ctx;
    ctx.save();
    [5, 6, 15, 16].forEach((i) => {
      const c = p[i], pr = prev[i];
      if (!c || !pr) return;
      const d = dist(c, pr);
      if (d < 5) return;
      const alpha = Math.min(0.4, d / 40);
      const grad = ctx.createLinearGradient(pr[0], pr[1], c[0], c[1]);
      grad.addColorStop(0, `rgba(${TRAIL_COL},0)`);
      grad.addColorStop(1, `rgba(${TRAIL_COL},${alpha})`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = Math.min(10, d / 4);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(pr[0], pr[1]);
      ctx.lineTo(c[0], c[1]);
      ctx.stroke();
    });
    ctx.restore();
  }

  // Build the body gradient (top-to-bottom teal)
  bodyGradient(p) {
    const minY = Math.min(...p.filter(Boolean).map(pt => pt[1]));
    const maxY = Math.max(...p.filter(Boolean).map(pt => pt[1]));
    const grad = this.ctx.createLinearGradient(0, minY - 20, 0, maxY + 10);
    grad.addColorStop(0, BODY_TOP);
    grad.addColorStop(1, BODY_BOT);
    return grad;
  }

  drawBody(p) {
    const ctx = this.ctx;
    const grad = this.bodyGradient(p);

    // Outer glow
    ctx.save();
    ctx.shadowColor = GLOW;
    ctx.shadowBlur = 18;
    ctx.fillStyle = grad;

    // === HEAD ===
    const nose = p[0], neck = p[13];
    if (nose && neck) {
      const hr = Math.max(16, Math.min(22, dist(nose, neck) * 1.3));
      joint(ctx, nose, hr);
      // Neck connector
      limb(ctx, [nose[0], nose[1] + hr * 0.5], neck, 8, 10);
    }

    // === TORSO (shaped trapezoid) ===
    const ls = p[1], rs = p[2], lh = p[7], rh = p[8];
    if (ls && rs && lh && rh) {
      const waistY = lerp(ls[1], lh[1], 0.55);
      const waistL = lerp(ls[0], lh[0], 0.55) + 2;
      const waistR = lerp(rs[0], rh[0], 0.55) - 2;

      ctx.beginPath();
      ctx.moveTo(ls[0] - 8, ls[1]);
      ctx.lineTo(rs[0] + 8, rs[1]);
      ctx.bezierCurveTo(rs[0] + 6, waistY, waistR, waistY, rh[0] + 4, rh[1]);
      ctx.lineTo(lh[0] - 4, lh[1]);
      ctx.bezierCurveTo(waistL, waistY, ls[0] - 6, waistY, ls[0] - 8, ls[1]);
      ctx.closePath();
      ctx.fill();

      // Shoulder spheres
      joint(ctx, ls, 9);
      joint(ctx, rs, 9);
      // Hip spheres
      joint(ctx, lh, 8);
      joint(ctx, rh, 8);
    }

    // === ARMS ===
    // Left arm (back)
    ctx.globalAlpha = 0.7;
    if (p[1] && p[3]) { limb(ctx, p[1], p[3], 10, 8); joint(ctx, p[3], 6); }
    if (p[3] && p[5]) { limb(ctx, p[3], p[5], 8, 6); }
    if (p[5]) joint(ctx, p[5], 5); // hand
    ctx.globalAlpha = 1;
    // Right arm (front)
    if (p[2] && p[4]) { limb(ctx, p[2], p[4], 10, 8); joint(ctx, p[4], 6); }
    if (p[4] && p[6]) { limb(ctx, p[4], p[6], 8, 6); }
    if (p[6]) joint(ctx, p[6], 5); // hand

    // === LEGS ===
    // Left leg (back)
    ctx.globalAlpha = 0.75;
    if (p[7] && p[9]) { limb(ctx, p[7], p[9], 12, 10); joint(ctx, p[9], 7); }
    if (p[9] && p[11]) { limb(ctx, p[9], p[11], 10, 7); }
    if (p[11] && p[15]) { limb(ctx, p[11], p[15], 7, 10); } // foot
    else if (p[11]) joint(ctx, p[11], 6);
    ctx.globalAlpha = 1;
    // Right leg (front)
    if (p[8] && p[10]) { limb(ctx, p[8], p[10], 12, 10); joint(ctx, p[10], 7); }
    if (p[10] && p[12]) { limb(ctx, p[10], p[12], 10, 7); }
    if (p[12] && p[16]) { limb(ctx, p[12], p[16], 7, 10); } // foot
    else if (p[12]) joint(ctx, p[12], 6);

    ctx.restore(); // End glow shadow
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
