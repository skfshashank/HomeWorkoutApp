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
const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const lerpPt = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

// Color palette - clean athletic figure
const BG_1 = '#0F172A';
const BG_2 = '#1E293B';
const SKIN = '#C8956C';
const SKIN_DK = '#A67B52';
const SKIN_LT = '#DEBB96';
const SHIRT = '#2563EB';
const SHIRT_LT = '#60A5FA';
const SHIRT_DK = '#1D4ED8';
const SHORTS = '#1E293B';
const SHORTS_DK = '#0F172A';
const HAIR = '#1C1917';
const SHOE = '#1F2937';
const SHOE_SOLE = '#111827';

// Smooth limb with rounded ends and subtle muscle bulge
function drawLimb(ctx, a, b, wA, wB, bulge = 0) {
  if (!a || !b) return;
  const length = dist(a, b);
  if (length < 1) return;
  const angle = ang(a, b);
  const px = Math.cos(angle + Math.PI / 2);
  const py = Math.sin(angle + Math.PI / 2);
  const mx = (a[0] + b[0]) / 2 + px * bulge;
  const my = (a[1] + b[1]) / 2 + py * bulge;
  const wM = (wA + wB) / 2 + Math.abs(bulge) * 0.3;

  ctx.beginPath();
  // Right side
  ctx.moveTo(a[0] + px * wA / 2, a[1] + py * wA / 2);
  ctx.quadraticCurveTo(mx + px * wM / 2, my + py * wM / 2, b[0] + px * wB / 2, b[1] + py * wB / 2);
  // Round end cap
  ctx.arc(b[0], b[1], wB / 2, angle + Math.PI / 2, angle - Math.PI / 2, true);
  // Left side
  ctx.quadraticCurveTo(mx - px * wM / 2, my - py * wM / 2, a[0] - px * wA / 2, a[1] - py * wA / 2);
  // Round start cap
  ctx.arc(a[0], a[1], wA / 2, angle - Math.PI / 2, angle + Math.PI / 2, true);
  ctx.closePath();
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
    const g = ctx.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.5, W * 0.8);
    g.addColorStop(0, BG_2);
    g.addColorStop(1, BG_1);
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
    ctx.save();
    ctx.globalAlpha = 0.3;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, spread);
    g.addColorStop(0, 'rgba(0,0,0,0.4)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy, spread, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawHead(ctx, nose, neck) {
    if (!nose) return;
    const headR = 18;
    const headAngle = neck ? ang(neck, nose) : -Math.PI / 2;

    ctx.save();
    ctx.translate(nose[0], nose[1]);
    ctx.rotate(headAngle + Math.PI / 2);

    // Hair (back)
    ctx.fillStyle = HAIR;
    ctx.beginPath();
    ctx.ellipse(0, -2, headR * 0.9, headR + 2, 0, Math.PI, 0);
    ctx.fill();

    // Head - oval
    const hg = ctx.createRadialGradient(-3, -1, 0, 0, 0, headR);
    hg.addColorStop(0, SKIN_LT);
    hg.addColorStop(0.6, SKIN);
    hg.addColorStop(1, SKIN_DK);
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.ellipse(0, 0, headR * 0.82, headR, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hair top
    ctx.fillStyle = HAIR;
    ctx.beginPath();
    ctx.ellipse(0, -headR * 0.5, headR * 0.75, headR * 0.55, 0, Math.PI, 0, true);
    ctx.fill();

    // Ear
    ctx.fillStyle = SKIN_DK;
    ctx.beginPath();
    ctx.ellipse(headR * 0.72, 1, 3, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawNeck(ctx, neck, nose) {
    if (!neck || !nose) return;
    const neckW = 11;
    const neckPt = lerpPt(neck, nose, 0.15);
    ctx.fillStyle = SKIN;
    drawLimb(ctx, neck, neckPt, neckW, neckW - 2, 0);
  }

  drawTorso(ctx, neck, ls, rs, lh, rh) {
    if (!neck || !ls || !rs || !lh || !rh) return;

    // Shoulder width (slightly wider than actual shoulder points for deltoid look)
    const lsOuter = [ls[0] - 4, ls[1]];
    const rsOuter = [rs[0] + 4, rs[1]];

    // Waist inset (narrower than shoulders for V-taper)
    const waistY = lerp((ls[1] + rs[1]) / 2, (lh[1] + rh[1]) / 2, 0.55);
    const waistInset = 6;
    const lWaist = [lerp(ls[0], lh[0], 0.55) + waistInset, waistY];
    const rWaist = [lerp(rs[0], rh[0], 0.55) - waistInset, waistY];

    // Shirt gradient
    const sg = ctx.createLinearGradient(lsOuter[0], ls[1], rsOuter[0], rh[1]);
    sg.addColorStop(0, SHIRT_DK);
    sg.addColorStop(0.35, SHIRT);
    sg.addColorStop(0.65, SHIRT_LT);
    sg.addColorStop(1, SHIRT_DK);
    ctx.fillStyle = sg;

    ctx.beginPath();
    // Left shoulder → across top (slight dip for neckline)
    ctx.moveTo(lsOuter[0], lsOuter[1]);
    ctx.quadraticCurveTo(neck[0], neck[1] + 6, rsOuter[0], rsOuter[1]);
    // Right shoulder → right waist (inward curve for lat)
    ctx.quadraticCurveTo(rsOuter[0] - 1, lerp(rsOuter[1], rWaist[1], 0.5), rWaist[0], rWaist[1]);
    // Right waist → right hip
    ctx.quadraticCurveTo(rh[0] + 2, lerp(rWaist[1], rh[1], 0.5), rh[0] + 3, rh[1]);
    // Across bottom (hip to hip)
    ctx.lineTo(lh[0] - 3, lh[1]);
    // Left hip → left waist
    ctx.quadraticCurveTo(lh[0] - 2, lerp(lWaist[1], lh[1], 0.5), lWaist[0], lWaist[1]);
    // Left waist → left shoulder
    ctx.quadraticCurveTo(lsOuter[0] + 1, lerp(lsOuter[1], lWaist[1], 0.5), lsOuter[0], lsOuter[1]);
    ctx.closePath();
    ctx.fill();

    // Subtle center line (muscle definition)
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(neck[0], neck[1] + 8);
    ctx.lineTo(neck[0], waistY - 5);
    ctx.stroke();
    ctx.restore();

    // Deltoid caps on shoulders (smooth arm connection)
    ctx.fillStyle = SHIRT;
    ctx.beginPath();
    ctx.arc(lsOuter[0], lsOuter[1], 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(rsOuter[0], rsOuter[1], 8, 0, Math.PI * 2);
    ctx.fill();
  }

  drawShorts(ctx, lh, rh, lk, rk) {
    if (!lh || !rh || !lk || !rk) return;

    const sg = ctx.createLinearGradient(lh[0], lh[1], rh[0], lk[1]);
    sg.addColorStop(0, SHORTS);
    sg.addColorStop(0.5, SHORTS_DK);
    sg.addColorStop(1, SHORTS);
    ctx.fillStyle = sg;

    // Left short leg (hip to ~40% toward knee)
    const lEnd = lerpPt(lh, lk, 0.38);
    drawLimb(ctx, lh, lEnd, 19, 15, 1.5);

    // Right short leg
    const rEnd = lerpPt(rh, rk, 0.38);
    drawLimb(ctx, rh, rEnd, 19, 15, -1.5);

    // Waistband
    ctx.fillStyle = SHORTS_DK;
    ctx.beginPath();
    ctx.moveTo(lh[0] - 7, lh[1] - 2);
    ctx.lineTo(rh[0] + 7, rh[1] - 2);
    ctx.lineTo(rh[0] + 6, rh[1] + 3);
    ctx.lineTo(lh[0] - 6, lh[1] + 3);
    ctx.closePath();
    ctx.fill();
  }

  drawArm(ctx, shoulder, elbow, wrist, isBack) {
    if (!shoulder || !elbow) return;
    const bulge = isBack ? -1.5 : 1.5;

    // Upper arm
    const uGrad = ctx.createLinearGradient(shoulder[0], shoulder[1], elbow[0], elbow[1]);
    uGrad.addColorStop(0, SKIN);
    uGrad.addColorStop(0.4, SKIN_LT);
    uGrad.addColorStop(1, SKIN);
    ctx.fillStyle = uGrad;
    drawLimb(ctx, shoulder, elbow, 11, 9, bulge);

    // Forearm
    if (wrist) {
      const fGrad = ctx.createLinearGradient(elbow[0], elbow[1], wrist[0], wrist[1]);
      fGrad.addColorStop(0, SKIN);
      fGrad.addColorStop(0.5, SKIN_LT);
      fGrad.addColorStop(1, SKIN_DK);
      ctx.fillStyle = fGrad;
      drawLimb(ctx, elbow, wrist, 9, 6, bulge * 0.5);
    }
  }

  drawLeg(ctx, hip, knee, ankle, foot, isBack) {
    if (!hip || !knee) return;
    const bulge = isBack ? -2 : 2;

    // Thigh (from below shorts ~38%)
    const thighStart = lerpPt(hip, knee, 0.35);
    const tGrad = ctx.createLinearGradient(thighStart[0], thighStart[1], knee[0], knee[1]);
    tGrad.addColorStop(0, SKIN);
    tGrad.addColorStop(0.4, SKIN_LT);
    tGrad.addColorStop(1, SKIN);
    ctx.fillStyle = tGrad;
    drawLimb(ctx, thighStart, knee, 14, 11, bulge);

    // Calf
    if (ankle) {
      const cGrad = ctx.createLinearGradient(knee[0], knee[1], ankle[0], ankle[1]);
      cGrad.addColorStop(0, SKIN);
      cGrad.addColorStop(0.3, SKIN_LT);
      cGrad.addColorStop(1, SKIN_DK);
      ctx.fillStyle = cGrad;
      drawLimb(ctx, knee, ankle, 11, 7, bulge * 0.5);

      // Shoe
      if (foot) {
        this.drawShoe(ctx, ankle, foot);
      }
    }
  }

  drawShoe(ctx, ankle, foot) {
    if (!ankle || !foot) return;
    const shoeAngle = ang(ankle, foot);
    const shoeLen = Math.max(dist(ankle, foot), 14);

    ctx.save();
    ctx.translate(ankle[0], ankle[1]);
    ctx.rotate(shoeAngle);

    // Shoe body
    ctx.fillStyle = SHOE;
    ctx.beginPath();
    ctx.moveTo(-2, -5);
    ctx.lineTo(shoeLen * 0.85, -4);
    ctx.quadraticCurveTo(shoeLen + 3, 0, shoeLen * 0.85, 5);
    ctx.lineTo(-2, 5);
    ctx.quadraticCurveTo(-4, 0, -2, -5);
    ctx.closePath();
    ctx.fill();

    // Sole
    ctx.fillStyle = SHOE_SOLE;
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.lineTo(shoeLen * 0.8, 4);
    ctx.lineTo(shoeLen * 0.8, 6);
    ctx.lineTo(-1, 6);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  drawBody(p) {
    const ctx = this.ctx;
    const nose = p[0], neck = p[13];
    const ls = p[1], rs = p[2], le = p[3], re = p[4], lw = p[5], rw = p[6];
    const lh = p[7], rh = p[8], lk = p[9], rk = p[10], la = p[11], ra = p[12];
    const lf = p[15], rf = p[16];

    // --- BACK LIMBS (dimmed for depth) ---
    ctx.save();
    ctx.globalAlpha = 0.65;
    this.drawLeg(ctx, lh, lk, la, lf, true);
    this.drawArm(ctx, ls, le, lw, true);
    ctx.restore();

    // --- SHORTS (over legs) ---
    this.drawShorts(ctx, lh, rh, lk, rk);

    // --- TORSO ---
    this.drawTorso(ctx, neck, ls, rs, lh, rh);

    // --- NECK ---
    this.drawNeck(ctx, neck, nose);

    // --- FRONT LIMBS ---
    this.drawLeg(ctx, rh, rk, ra, rf, false);
    this.drawArm(ctx, rs, re, rw, false);

    // --- HEAD (always on top) ---
    this.drawHead(ctx, nose, neck);
  }

  drawFrame(pose) {
    const W = this.width, H = this.height;
    const p = pose.map(([x, y]) => [x * W, y * H]);

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
