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

// Clean flat-design palette
const BG = '#111827';
const SKIN = '#D4A574';
const SHIRT = '#3B82F6';
const SHORTS = '#374151';
const HAIR = '#292524';
const SHOE_COL = '#1F2937';

// Round-cap stroke between two points (seamless at shared joints)
function bone(ctx, a, b, w) {
  if (!a || !b || dist(a, b) < 0.5) return;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
}

// Filled circle
function dot(ctx, pt, r) {
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

  // Filled torso shape (shirt) — no seam issues since it's one path
  drawTorso(ctx, neck, ls, rs, lh, rh) {
    if (!neck || !ls || !rs || !lh || !rh) return;
    const waistY = lerp((ls[1] + rs[1]) / 2, (lh[1] + rh[1]) / 2, 0.5);
    const waistInset = 3;

    ctx.fillStyle = SHIRT;
    ctx.beginPath();
    // Shoulders (rounded top)
    ctx.moveTo(ls[0] - 6, ls[1]);
    ctx.quadraticCurveTo(neck[0], neck[1] + 3, rs[0] + 6, rs[1]);
    // Right side — V taper
    ctx.lineTo(rs[0] + 3, lerp(rs[1], waistY, 0.5));
    ctx.lineTo(rh[0] - waistInset, waistY);
    ctx.lineTo(rh[0] + 3, rh[1] + 2);
    // Bottom
    ctx.lineTo(lh[0] - 3, lh[1] + 2);
    // Left side
    ctx.lineTo(lh[0] + waistInset, waistY);
    ctx.lineTo(ls[0] - 3, lerp(ls[1], waistY, 0.5));
    ctx.closePath();
    ctx.fill();

    // Short sleeves (cover where arms meet shoulders)
    const lSlv = lerpPt(ls, lh, 0.08);
    bone(ctx, ls, lSlv, 14);
    const rSlv = lerpPt(rs, rh, 0.08);
    bone(ctx, rs, rSlv, 14);
    ctx.strokeStyle = SHIRT;
    bone(ctx, ls, lerpPt(ls, [ls[0] - 15, ls[1] + 5], 0.6), 13);
    bone(ctx, rs, lerpPt(rs, [rs[0] + 15, rs[1] + 5], 0.6), 13);
  }

  // Filled shorts shape
  drawShorts(ctx, lh, rh, lk, rk) {
    if (!lh || !rh || !lk || !rk) return;
    const lEnd = lerpPt(lh, lk, 0.4);
    const rEnd = lerpPt(rh, rk, 0.4);

    ctx.fillStyle = SHORTS;
    ctx.beginPath();
    ctx.moveTo(lh[0] - 6, lh[1] - 2);
    ctx.lineTo(rh[0] + 6, rh[1] - 2);
    ctx.lineTo(rEnd[0] + 6, rEnd[1]);
    ctx.quadraticCurveTo(rEnd[0], rEnd[1] + 3, rEnd[0] - 4, rEnd[1]);
    // Inner thigh — crotch
    const crotch = lerpPt(lh, rh, 0.5);
    ctx.lineTo(crotch[0] + 2, crotch[1] + 10);
    ctx.lineTo(crotch[0] - 2, crotch[1] + 10);
    ctx.lineTo(lEnd[0] + 4, lEnd[1]);
    ctx.quadraticCurveTo(lEnd[0], lEnd[1] + 3, lEnd[0] - 6, lEnd[1]);
    ctx.closePath();
    ctx.fill();
  }

  drawBody(p) {
    const ctx = this.ctx;
    const nose = p[0], neck = p[13], pelvis = p[14];
    const ls = p[1], rs = p[2], le = p[3], re = p[4], lw = p[5], rw = p[6];
    const lh = p[7], rh = p[8], lk = p[9], rk = p[10], la = p[11], ra = p[12];
    const lf = p[15], rf = p[16];

    // === SHADOW ===
    const fcx = (((lf || la)?.[0] || this.width * 0.4) + ((rf || ra)?.[0] || this.width * 0.5)) / 2;
    ctx.save(); ctx.globalAlpha = 0.2;
    const sg = ctx.createRadialGradient(fcx, this.height * 0.95, 0, fcx, this.height * 0.95, 35);
    sg.addColorStop(0, 'rgba(0,0,0,0.5)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.ellipse(fcx, this.height * 0.95, 35, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // === BACK LIMBS (dimmed) ===
    ctx.save(); ctx.globalAlpha = 0.55;
    // Back leg
    ctx.strokeStyle = SKIN;
    bone(ctx, lh, lk, 14);
    bone(ctx, lk, la, 11);
    if (lf) { ctx.strokeStyle = SHOE_COL; bone(ctx, la, lf, 10); }
    // Back arm
    ctx.strokeStyle = SKIN;
    bone(ctx, ls, le, 11);
    bone(ctx, le, lw, 9);
    ctx.fillStyle = SKIN; dot(ctx, lw, 4.5);
    ctx.restore();

    // === SHORTS (filled shape, over back leg) ===
    this.drawShorts(ctx, lh, rh, lk, rk);

    // === SHIRT/TORSO (filled shape, over everything) ===
    ctx.strokeStyle = SHIRT;
    this.drawTorso(ctx, neck, ls, rs, lh, rh);

    // === NECK ===
    ctx.strokeStyle = SKIN;
    bone(ctx, neck, lerpPt(neck, nose, 0.35), 9);

    // === FRONT LIMBS ===
    // Front leg
    ctx.strokeStyle = SKIN;
    bone(ctx, rh, rk, 14);
    bone(ctx, rk, ra, 11);
    if (rf) { ctx.strokeStyle = SHOE_COL; bone(ctx, ra, rf, 10); }
    // Front arm
    ctx.strokeStyle = SKIN;
    bone(ctx, rs, re, 11);
    bone(ctx, re, rw, 9);
    ctx.fillStyle = SKIN; dot(ctx, rw, 4.5);

    // === HEAD ===
    if (nose) {
      const R = 16;
      const ha = neck ? ang(neck, nose) : -Math.PI / 2;
      ctx.save();
      ctx.translate(nose[0], nose[1]);
      ctx.rotate(ha + Math.PI / 2);
      // Hair back
      ctx.fillStyle = HAIR;
      ctx.beginPath(); ctx.ellipse(0, -1, R * 0.85, R + 1, 0, Math.PI, 0); ctx.fill();
      // Face
      ctx.fillStyle = SKIN;
      ctx.beginPath(); ctx.ellipse(0, 0, R * 0.78, R * 0.95, 0, 0, Math.PI * 2); ctx.fill();
      // Hair top
      ctx.fillStyle = HAIR;
      ctx.beginPath(); ctx.ellipse(0, -R * 0.45, R * 0.7, R * 0.55, 0, Math.PI, 0, true); ctx.fill();
      ctx.restore();
    }
  }

  drawFrame(pose) {
    const p = pose.map(([x, y]) => [x * this.width, y * this.height]);
    this.clear();
    this.ctx.fillStyle = BG;
    this.ctx.fillRect(0, 0, this.width, this.height);
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
