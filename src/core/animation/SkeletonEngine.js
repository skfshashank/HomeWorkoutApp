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
const perp = (a, b, offset) => {
  const angle = ang(a, b) + Math.PI / 2;
  return [Math.cos(angle) * offset, Math.sin(angle) * offset];
};

// Color palette - athletic human figure
const BG_1 = '#0F172A';
const BG_2 = '#1E293B';
const SKIN = '#D4A574';
const SKIN_DK = '#B8885C';
const SKIN_LT = '#E8C49A';
const SHIRT = '#1E40AF';
const SHIRT_LT = '#3B82F6';
const SHIRT_DK = '#1E3A5F';
const SHORTS = '#1F2937';
const SHORTS_LT = '#374151';
const HAIR = '#1C1917';
const SHOE = '#111827';
const SHOE_ACCENT = '#374151';
const GLOW_COL = 'rgba(59,130,246,0.15)';

// Draw a tapered limb (wider at start, thinner at end) with muscle curve
function drawTaperedLimb(ctx, a, b, wStart, wEnd, curveDir = 0) {
  if (!a || !b) return;
  const angle = ang(a, b);
  const perpAngle = angle + Math.PI / 2;
  const len = dist(a, b);
  const midPt = mid(a, b);

  // Muscle bulge offset at midpoint
  const bulgeX = Math.cos(perpAngle) * curveDir;
  const bulgeY = Math.sin(perpAngle) * curveDir;
  const cp = [midPt[0] + bulgeX, midPt[1] + bulgeY];

  // Build the outline as a filled shape
  const cosP = Math.cos(perpAngle);
  const sinP = Math.sin(perpAngle);

  ctx.beginPath();
  ctx.moveTo(a[0] + cosP * wStart / 2, a[1] + sinP * wStart / 2);
  ctx.quadraticCurveTo(
    cp[0] + cosP * (wStart + wEnd) / 3.5,
    cp[1] + sinP * (wStart + wEnd) / 3.5,
    b[0] + cosP * wEnd / 2, b[1] + sinP * wEnd / 2
  );
  ctx.lineTo(b[0] - cosP * wEnd / 2, b[1] - sinP * wEnd / 2);
  ctx.quadraticCurveTo(
    cp[0] - cosP * (wStart + wEnd) / 3.5,
    cp[1] - sinP * (wStart + wEnd) / 3.5,
    a[0] - cosP * wStart / 2, a[1] - sinP * wStart / 2
  );
  ctx.closePath();
  ctx.fill();
}

// Draw a joint circle (knee, elbow)
function drawJoint(ctx, pt, r) {
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
    const g = ctx.createRadialGradient(W / 2, H * 0.4, 0, W / 2, H * 0.5, W * 0.9);
    g.addColorStop(0, BG_2);
    g.addColorStop(1, BG_1);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Subtle floor
    const fg = ctx.createRadialGradient(W / 2, H * 0.96, 0, W / 2, H * 0.96, W * 0.4);
    fg.addColorStop(0, 'rgba(100,116,139,0.08)');
    fg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.ellipse(W / 2, H * 0.96, W * 0.4, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  drawShadow(p) {
    const lf = p[15] || p[11], rf = p[16] || p[12];
    if (!lf && !rf) return;
    const cx = ((lf?.[0] || this.width * 0.45) + (rf?.[0] || this.width * 0.55)) / 2;
    const cy = this.height * 0.96;
    const spread = Math.abs((lf?.[0] || 0) - (rf?.[0] || 0)) * 0.3 + 25;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.4;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, spread);
    g.addColorStop(0, 'rgba(0,0,0,0.35)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy, spread, 5, 0, 0, Math.PI * 2);
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
      const alpha = Math.min(0.35, d / 40);
      const g = ctx.createLinearGradient(pr[0], pr[1], c[0], c[1]);
      g.addColorStop(0, `rgba(59,130,246,0)`);
      g.addColorStop(1, `rgba(59,130,246,${alpha})`);
      ctx.strokeStyle = g;
      ctx.lineWidth = Math.min(8, d / 4);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(pr[0], pr[1]);
      ctx.lineTo(c[0], c[1]);
      ctx.stroke();
    });
    ctx.restore();
  }

  drawHead(ctx, nose, neck) {
    if (!nose) return;
    const headR = 16;
    const headAngle = neck ? ang(neck, nose) : -Math.PI / 2;

    ctx.save();
    ctx.translate(nose[0], nose[1]);
    ctx.rotate(headAngle + Math.PI / 2);

    // Hair (back layer)
    ctx.fillStyle = HAIR;
    ctx.beginPath();
    ctx.ellipse(0, -2, headR + 1, headR + 3, 0, Math.PI, 0);
    ctx.fill();

    // Head shape - slightly oval
    const hg = ctx.createRadialGradient(-3, -2, 0, 0, 0, headR);
    hg.addColorStop(0, SKIN_LT);
    hg.addColorStop(0.7, SKIN);
    hg.addColorStop(1, SKIN_DK);
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.ellipse(0, 0, headR * 0.85, headR, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hair top
    ctx.fillStyle = HAIR;
    ctx.beginPath();
    ctx.ellipse(0, -headR * 0.55, headR * 0.8, headR * 0.5, 0, Math.PI, 0, true);
    ctx.fill();

    // Ear
    ctx.fillStyle = SKIN_DK;
    ctx.beginPath();
    ctx.ellipse(headR * 0.78, 0, 3, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawTorso(ctx, neck, ls, rs, lh, rh, pelvis) {
    if (!neck || !ls || !rs || !lh || !rh) return;

    // Shirt - athletic fit with muscle contour
    const shoulderW = dist(ls, rs);
    const hipW = dist(lh, rh);
    const waistX = (ls[0] + rs[0] + lh[0] + rh[0]) / 4;
    const waistY = lerp((ls[1] + rs[1]) / 2, (lh[1] + rh[1]) / 2, 0.6);
    const waistW = (shoulderW * 0.4 + hipW * 0.4);

    // Build torso shape
    const sg = ctx.createLinearGradient(ls[0], ls[1], rs[0], rh[1]);
    sg.addColorStop(0, SHIRT_DK);
    sg.addColorStop(0.3, SHIRT);
    sg.addColorStop(0.6, SHIRT_LT);
    sg.addColorStop(1, SHIRT_DK);
    ctx.fillStyle = sg;

    ctx.beginPath();
    // Start from left shoulder
    ctx.moveTo(ls[0] - 6, ls[1]);
    // Across shoulders (slight curve for traps)
    ctx.quadraticCurveTo(neck[0], neck[1] + 4, rs[0] + 6, rs[1]);
    // Down right side - chest to waist (inward curve)
    ctx.quadraticCurveTo(
      rs[0] + 4, lerp(rs[1], rh[1], 0.3),
      waistX + waistW * 0.3, waistY
    );
    // Waist to right hip (outward for hip)
    ctx.quadraticCurveTo(
      rh[0] + 3, lerp(waistY, rh[1], 0.6),
      rh[0] + 4, rh[1]
    );
    // Across hips
    ctx.lineTo(lh[0] - 4, lh[1]);
    // Left hip up to waist
    ctx.quadraticCurveTo(
      lh[0] - 3, lerp(waistY, lh[1], 0.6),
      waistX - waistW * 0.3, waistY
    );
    // Waist up to left shoulder
    ctx.quadraticCurveTo(
      ls[0] - 4, lerp(ls[1], lh[1], 0.3),
      ls[0] - 6, ls[1]
    );
    ctx.closePath();
    ctx.fill();

    // Muscle definition lines (subtle)
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    // Center line
    const chestMid = mid(neck, pelvis);
    ctx.beginPath();
    ctx.moveTo(neck[0], neck[1] + 8);
    ctx.lineTo(chestMid[0], chestMid[1]);
    ctx.stroke();
    ctx.restore();

    // Neck
    if (neck) {
      const neckW = 10;
      ctx.fillStyle = SKIN;
      const neckTop = [neck[0], neck[1] - 4];
      drawJoint(ctx, neckTop, neckW / 2);
      ctx.fillRect(neck[0] - neckW / 2, neck[1] - 4, neckW, 8);
    }
  }

  drawShorts(ctx, lh, rh, lk, rk, pelvis) {
    if (!lh || !rh || !lk || !rk) return;

    // Draw shorts as filled shapes on upper thighs
    const sg = ctx.createLinearGradient(lh[0], lh[1], rh[0], lk[1]);
    sg.addColorStop(0, SHORTS_LT);
    sg.addColorStop(0.5, SHORTS);
    sg.addColorStop(1, SHORTS_LT);
    ctx.fillStyle = sg;

    // Left short leg
    const lMid = [lerp(lh[0], lk[0], 0.45), lerp(lh[1], lk[1], 0.45)];
    drawTaperedLimb(ctx, lh, lMid, 20, 16, 2);

    // Right short leg
    const rMid = [lerp(rh[0], rk[0], 0.45), lerp(rh[1], rk[1], 0.45)];
    drawTaperedLimb(ctx, rh, rMid, 20, 16, -2);

    // Waistband
    ctx.fillStyle = SHORTS;
    ctx.beginPath();
    ctx.moveTo(lh[0] - 8, lh[1] - 2);
    ctx.lineTo(rh[0] + 8, rh[1] - 2);
    ctx.lineTo(rh[0] + 6, rh[1] + 4);
    ctx.lineTo(lh[0] - 6, lh[1] + 4);
    ctx.closePath();
    ctx.fill();
  }

  drawArm(ctx, shoulder, elbow, wrist, isBack) {
    if (!shoulder || !elbow) return;

    // Upper arm (bicep)
    const uaGrad = ctx.createLinearGradient(shoulder[0], shoulder[1], elbow[0], elbow[1]);
    uaGrad.addColorStop(0, SKIN);
    uaGrad.addColorStop(0.5, SKIN_LT);
    uaGrad.addColorStop(1, SKIN);
    ctx.fillStyle = uaGrad;

    // Bicep bulge direction (perpendicular to arm)
    const bulge = isBack ? -2 : 2;
    drawTaperedLimb(ctx, shoulder, elbow, 13, 10, bulge);

    // Elbow joint
    ctx.fillStyle = SKIN_DK;
    drawJoint(ctx, elbow, 5.5);

    // Forearm
    if (wrist) {
      const faGrad = ctx.createLinearGradient(elbow[0], elbow[1], wrist[0], wrist[1]);
      faGrad.addColorStop(0, SKIN);
      faGrad.addColorStop(0.5, SKIN_LT);
      faGrad.addColorStop(1, SKIN_DK);
      ctx.fillStyle = faGrad;
      drawTaperedLimb(ctx, elbow, wrist, 10, 7, bulge * 0.5);

      // Hand
      ctx.fillStyle = SKIN;
      drawJoint(ctx, wrist, 5);
    }
  }

  drawLeg(ctx, hip, knee, ankle, foot, isBack) {
    if (!hip || !knee) return;

    // Thigh (quadricep) — starts below shorts
    const thighStart = [lerp(hip[0], knee[0], 0.4), lerp(hip[1], knee[1], 0.4)];
    const tGrad = ctx.createLinearGradient(thighStart[0], thighStart[1], knee[0], knee[1]);
    tGrad.addColorStop(0, SKIN);
    tGrad.addColorStop(0.4, SKIN_LT);
    tGrad.addColorStop(1, SKIN);
    ctx.fillStyle = tGrad;
    const bulge = isBack ? -3 : 3;
    drawTaperedLimb(ctx, thighStart, knee, 16, 12, bulge);

    // Knee joint
    ctx.fillStyle = SKIN_DK;
    drawJoint(ctx, knee, 6.5);

    // Shin/calf
    if (ankle) {
      const sGrad = ctx.createLinearGradient(knee[0], knee[1], ankle[0], ankle[1]);
      sGrad.addColorStop(0, SKIN);
      sGrad.addColorStop(0.3, SKIN_LT);
      sGrad.addColorStop(1, SKIN_DK);
      ctx.fillStyle = sGrad;
      drawTaperedLimb(ctx, knee, ankle, 12, 8, bulge * 0.6);

      // Shoe
      if (foot) {
        this.drawShoe(ctx, ankle, foot);
      } else {
        ctx.fillStyle = SHOE;
        drawJoint(ctx, ankle, 6);
      }
    }
  }

  drawShoe(ctx, ankle, foot) {
    if (!ankle || !foot) return;
    const shoeAngle = ang(ankle, foot);
    const shoeLen = Math.max(dist(ankle, foot), 12);

    ctx.save();
    ctx.translate(ankle[0], ankle[1]);
    ctx.rotate(shoeAngle);

    // Shoe body
    const sg = ctx.createLinearGradient(0, -6, shoeLen, 6);
    sg.addColorStop(0, SHOE);
    sg.addColorStop(0.5, SHOE_ACCENT);
    sg.addColorStop(1, SHOE);
    ctx.fillStyle = sg;

    ctx.beginPath();
    ctx.moveTo(-3, -5);
    ctx.lineTo(shoeLen * 0.9, -4);
    ctx.quadraticCurveTo(shoeLen + 2, 0, shoeLen * 0.9, 4);
    ctx.lineTo(-3, 5);
    ctx.quadraticCurveTo(-5, 0, -3, -5);
    ctx.closePath();
    ctx.fill();

    // Sole line
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.lineTo(shoeLen * 0.8, 3.5);
    ctx.stroke();

    ctx.restore();
  }

  drawBody(p) {
    const ctx = this.ctx;
    const nose = p[0], neck = p[13], pelvis = p[14];
    const ls = p[1], rs = p[2], le = p[3], re = p[4], lw = p[5], rw = p[6];
    const lh = p[7], rh = p[8], lk = p[9], rk = p[10], la = p[11], ra = p[12];
    const lf = p[15], rf = p[16];

    // Outer glow pass
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.shadowColor = 'rgba(59,130,246,0.5)';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#3B82F6';
    // Simple silhouette for glow
    if (neck && pelvis) {
      ctx.beginPath();
      ctx.arc(neck[0], neck[1], 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(pelvis[0], pelvis[1], 25, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // --- BACK LIMBS (slightly dimmed) ---
    ctx.save();
    ctx.globalAlpha = 0.7;
    this.drawLeg(ctx, lh, lk, la, lf, true);
    this.drawArm(ctx, ls, le, lw, true);
    ctx.restore();

    // --- TORSO + SHORTS ---
    this.drawShorts(ctx, lh, rh, lk, rk, pelvis);
    this.drawTorso(ctx, neck, ls, rs, lh, rh, pelvis);

    // --- FRONT LIMBS ---
    this.drawLeg(ctx, rh, rk, ra, rf, false);
    this.drawArm(ctx, rs, re, rw, false);

    // --- HEAD (always on top) ---
    this.drawHead(ctx, nose, neck);
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
