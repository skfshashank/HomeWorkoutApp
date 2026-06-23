import { STANDING_FRONT } from './exerciseKeyframes.js';

const CONNECTIONS = [
  [13, 0], [1, 13], [2, 13], [1, 3], [3, 5], [2, 4], [4, 6],
  [13, 14], [7, 14], [8, 14], [7, 9], [9, 11], [8, 10], [10, 12], [11, 15], [12, 16]
];

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const round = (v) => Number(v.toFixed(3));
const clonePose = (pose) => pose.map(([x, y]) => [round(x), round(y)]);
const lerp = (a, b, t) => a + (b - a) * t;
const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const ang = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);

// Professional color palette
const SKIN = '#F2C4A0';
const SKIN_LT = '#F8D8BA';
const SKIN_DK = '#D4956A';
const SHIRT_1 = '#FF6B35';
const SHIRT_2 = '#E54E1B';
const SHIRT_3 = '#C23D12';
const SHORTS_1 = '#1E293B';
const SHORTS_2 = '#0F172A';
const SHOE_1 = '#374151';
const SHOE_2 = '#6366F1';
const SHOE_3 = '#818CF8';
const HAIR_1 = '#3B2316';
const HAIR_2 = '#5C3A28';
const EYE = '#2D1B11';

// Smooth tapered limb with bezier contour
function drawTaperedLimb(ctx, start, end, wStart, wEnd, color, highlightColor) {
  const a = ang(start, end);
  const px = Math.cos(a + Math.PI / 2);
  const py = Math.sin(a + Math.PI / 2);
  const len = dist(start, end);
  const midPt = mid(start, end);
  // Slight bulge at muscle belly (1/3 from start)
  const bulge = Math.min(wStart * 1.15, wStart + 3);
  const bulgeX = lerp(start[0], end[0], 0.35);
  const bulgeY = lerp(start[1], end[1], 0.35);

  ctx.save();
  // Main fill with gradient
  const grad = ctx.createLinearGradient(
    start[0] - px * wStart, start[1] - py * wStart,
    start[0] + px * wStart, start[1] + py * wStart
  );
  grad.addColorStop(0, highlightColor || color);
  grad.addColorStop(0.4, color);
  grad.addColorStop(1, highlightColor || color);
  ctx.fillStyle = grad;

  ctx.beginPath();
  ctx.moveTo(start[0] + px * wStart, start[1] + py * wStart);
  ctx.quadraticCurveTo(
    bulgeX + px * bulge, bulgeY + py * bulge,
    end[0] + px * wEnd, end[1] + py * wEnd
  );
  ctx.lineTo(end[0] - px * wEnd, end[1] - py * wEnd);
  ctx.quadraticCurveTo(
    bulgeX - px * bulge, bulgeY - py * bulge,
    start[0] - px * wStart, start[1] - py * wStart
  );
  ctx.closePath();
  ctx.fill();

  // Highlight streak
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  const hlOff = wStart * 0.3;
  ctx.moveTo(start[0] - px * hlOff, start[1] - py * hlOff);
  ctx.quadraticCurveTo(
    midPt[0] - px * hlOff * 0.8, midPt[1] - py * hlOff * 0.8,
    end[0] - px * hlOff * 0.5, end[1] - py * hlOff * 0.5
  );
  ctx.lineTo(end[0] - px * wEnd * 0.1, end[1] - py * wEnd * 0.1);
  ctx.quadraticCurveTo(
    midPt[0] - px * hlOff * 0.3, midPt[1] - py * hlOff * 0.3,
    start[0] - px * hlOff * 0.5, start[1] - py * hlOff * 0.5
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Joint sphere
function drawJoint(ctx, point, radius, color) {
  if (!point) return;
  const grad = ctx.createRadialGradient(
    point[0] - radius * 0.3, point[1] - radius * 0.3, 0,
    point[0], point[1], radius
  );
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.3, color);
  grad.addColorStop(1, color);
  ctx.save();
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(point[0], point[1], radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
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
    // Soft radial gradient background
    const grad = ctx.createRadialGradient(
      this.width / 2, this.height * 0.4, 0,
      this.width / 2, this.height * 0.4, this.width * 0.7
    );
    grad.addColorStop(0, '#FAFAFA');
    grad.addColorStop(0.7, '#F0F0F0');
    grad.addColorStop(1, '#E5E7EB');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);

    // Subtle floor line
    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.width * 0.15, this.height * 0.93);
    ctx.lineTo(this.width * 0.85, this.height * 0.93);
    ctx.stroke();
    ctx.restore();
  }

  drawShadow(points) {
    const lf = points[15] || points[11];
    const rf = points[16] || points[12];
    const cx = ((lf?.[0] || this.width * 0.45) + (rf?.[0] || this.width * 0.55)) / 2;
    const cy = this.height * 0.935;
    const spread = Math.abs((lf?.[0] || 0) - (rf?.[0] || 0)) * 0.5 + 35;

    const ctx = this.ctx;
    ctx.save();
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, spread);
    grad.addColorStop(0, 'rgba(0,0,0,0.15)');
    grad.addColorStop(0.6, 'rgba(0,0,0,0.06)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, spread, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawShoe(ctx, ankle, foot, isRight) {
    if (!foot) return;
    const dir = isRight ? 1 : -1;
    ctx.save();
    // Shoe body
    const grad = ctx.createLinearGradient(foot[0] - 16, foot[1], foot[0] + 16, foot[1]);
    grad.addColorStop(0, SHOE_1);
    grad.addColorStop(0.5, SHOE_1);
    grad.addColorStop(1, '#4B5563');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(foot[0] - 10, foot[1] - 7);
    ctx.quadraticCurveTo(foot[0] + 14 * dir, foot[1] - 8, foot[0] + 16 * dir, foot[1] - 2);
    ctx.quadraticCurveTo(foot[0] + 17 * dir, foot[1] + 4, foot[0] + 10 * dir, foot[1] + 5);
    ctx.lineTo(foot[0] - 12, foot[1] + 5);
    ctx.quadraticCurveTo(foot[0] - 14, foot[1] - 2, foot[0] - 10, foot[1] - 7);
    ctx.closePath();
    ctx.fill();

    // Shoe accent stripe
    ctx.fillStyle = SHOE_2;
    ctx.beginPath();
    ctx.moveTo(foot[0] - 4, foot[1] - 6);
    ctx.quadraticCurveTo(foot[0] + 6 * dir, foot[1] - 7, foot[0] + 10 * dir, foot[1] - 3);
    ctx.lineTo(foot[0] + 6 * dir, foot[1] - 1);
    ctx.quadraticCurveTo(foot[0] + 2 * dir, foot[1] - 4, foot[0] - 4, foot[1] - 4);
    ctx.closePath();
    ctx.fill();

    // Sole
    ctx.fillStyle = '#1F2937';
    ctx.fillRect(foot[0] - 11, foot[1] + 4, 22 + 4 * dir, 3);
    ctx.restore();
  }

  drawLeg(ctx, hip, knee, ankle, foot, isFront) {
    if (!hip || !knee) return;
    const alpha = isFront ? 1 : 0.85;
    ctx.save();
    ctx.globalAlpha = alpha;

    // Upper leg (shorts)
    drawTaperedLimb(ctx, hip, knee, 16, 13, SHORTS_1, SHORTS_2);
    // Knee joint
    drawJoint(ctx, knee, 8, SKIN);

    // Lower leg (skin with calf shape)
    if (knee && ankle) {
      drawTaperedLimb(ctx, knee, ankle, 12, 9, SKIN, SKIN_LT);
    }
    ctx.restore();

    // Shoe
    if (foot) this.drawShoe(ctx, ankle, foot, isFront);
  }

  drawTorso(points) {
    const ctx = this.ctx;
    const ls = points[1], rs = points[2], lh = points[7], rh = points[8], neck = points[13];
    if (!ls || !rs || !lh || !rh) return;

    const shoulderW = dist(ls, rs);
    const hipW = dist(lh, rh);

    // Torso shape with bezier curves (tapered waist)
    ctx.save();
    const grad = ctx.createLinearGradient(ls[0], ls[1], rs[0], rs[1]);
    grad.addColorStop(0, SHIRT_1);
    grad.addColorStop(0.3, SHIRT_1);
    grad.addColorStop(0.7, SHIRT_2);
    grad.addColorStop(1, SHIRT_3);
    ctx.fillStyle = grad;

    const waistL = lerp(ls[0], lh[0], 0.55) + 2;
    const waistR = lerp(rs[0], rh[0], 0.55) - 2;
    const waistY = lerp(ls[1], lh[1], 0.55);

    ctx.beginPath();
    ctx.moveTo(ls[0] - 8, ls[1]);
    ctx.lineTo(rs[0] + 8, rs[1]);
    // Right side curves in at waist
    ctx.quadraticCurveTo(rs[0] + 5, waistY, waistR, waistY);
    ctx.quadraticCurveTo(rh[0] + 2, rh[1] - 5, rh[0] + 4, rh[1]);
    ctx.lineTo(lh[0] - 4, lh[1]);
    // Left side curves in at waist
    ctx.quadraticCurveTo(lh[0] - 2, lh[1] - 5, waistL, waistY);
    ctx.quadraticCurveTo(ls[0] - 5, waistY, ls[0] - 8, ls[1]);
    ctx.closePath();
    ctx.fill();

    // Shirt collar / V-neck
    if (neck) {
      ctx.fillStyle = SKIN;
      ctx.beginPath();
      ctx.moveTo(ls[0] + 4, ls[1] - 2);
      ctx.quadraticCurveTo(neck[0], neck[1] + 16, rs[0] - 4, rs[1] - 2);
      ctx.lineTo(rs[0] - 8, rs[1] + 4);
      ctx.quadraticCurveTo(neck[0], neck[1] + 22, ls[0] + 8, ls[1] + 4);
      ctx.closePath();
      ctx.fill();
    }

    // Shirt highlight
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(ls[0] - 4, ls[1] + 3);
    ctx.quadraticCurveTo(waistL + 8, waistY, lh[0] + 6, lh[1] - 4);
    ctx.lineTo(lh[0] - 2, lh[1] - 4);
    ctx.quadraticCurveTo(waistL, waistY, ls[0] - 6, ls[1] + 3);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // Shoulder caps
    ctx.save();
    ctx.fillStyle = SHIRT_1;
    [ls, rs].forEach((s) => {
      ctx.beginPath();
      ctx.arc(s[0], s[1], 10, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  drawArm(ctx, shoulder, elbow, wrist, isFront) {
    if (!shoulder || !elbow) return;
    const alpha = isFront ? 1 : 0.8;
    const skinC = isFront ? SKIN : SKIN_DK;
    const hlC = isFront ? SKIN_LT : SKIN;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Upper arm
    drawTaperedLimb(ctx, shoulder, elbow, 14, 11, skinC, hlC);
    // Elbow joint
    drawJoint(ctx, elbow, 7, skinC);

    // Forearm
    if (elbow && wrist) {
      drawTaperedLimb(ctx, elbow, wrist, 11, 8, skinC, hlC);
    }
    ctx.restore();

    // Hand
    if (wrist) {
      ctx.save();
      ctx.globalAlpha = alpha;
      const grad = ctx.createRadialGradient(
        wrist[0] - 2, wrist[1] - 2, 0,
        wrist[0], wrist[1], 9
      );
      grad.addColorStop(0, SKIN_LT);
      grad.addColorStop(1, skinC);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(wrist[0], wrist[1], 8, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      // Finger hints
      ctx.fillStyle = skinC;
      ctx.globalAlpha = alpha * 0.6;
      const fa = elbow && wrist ? ang(elbow, wrist) : Math.PI / 2;
      for (let i = -1; i <= 1; i++) {
        const fx = wrist[0] + Math.cos(fa) * 8 + Math.cos(fa + Math.PI / 2) * i * 3;
        const fy = wrist[1] + Math.sin(fa) * 8 + Math.sin(fa + Math.PI / 2) * i * 3;
        ctx.beginPath();
        ctx.arc(fx, fy, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  drawHead(nose, neck) {
    const ctx = this.ctx;
    if (!nose || !neck) return;
    const r = Math.max(20, Math.min(28, dist(nose, neck) * 1.5));

    // Neck
    ctx.save();
    ctx.fillStyle = SKIN;
    const neckW = 9;
    ctx.beginPath();
    ctx.moveTo(neck[0] - neckW, neck[1]);
    ctx.lineTo(nose[0] - neckW * 0.7, nose[1] + r * 0.7);
    ctx.lineTo(nose[0] + neckW * 0.7, nose[1] + r * 0.7);
    ctx.lineTo(neck[0] + neckW, neck[1]);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Head shape with gradient
    ctx.save();
    const headGrad = ctx.createRadialGradient(
      nose[0] - r * 0.2, nose[1] - r * 0.2, 0,
      nose[0], nose[1], r
    );
    headGrad.addColorStop(0, SKIN_LT);
    headGrad.addColorStop(0.6, SKIN);
    headGrad.addColorStop(1, SKIN_DK);
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.arc(nose[0], nose[1], r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Hair with volume
    ctx.save();
    const hairGrad = ctx.createRadialGradient(
      nose[0], nose[1] - r * 0.5, r * 0.2,
      nose[0], nose[1] - r * 0.3, r * 1.1
    );
    hairGrad.addColorStop(0, HAIR_2);
    hairGrad.addColorStop(1, HAIR_1);
    ctx.fillStyle = hairGrad;
    ctx.beginPath();
    ctx.arc(nose[0], nose[1] - r * 0.15, r * 1.02, Math.PI * 1.05, Math.PI * 1.95);
    ctx.quadraticCurveTo(nose[0] + r * 1.05, nose[1] - r * 0.1, nose[0] + r * 0.7, nose[1] + r * 0.15);
    ctx.quadraticCurveTo(nose[0] + r * 0.3, nose[1] - r * 0.6, nose[0] - r * 0.3, nose[1] - r * 0.6);
    ctx.quadraticCurveTo(nose[0] - r * 1.05, nose[1] - r * 0.1, nose[0] - r * 0.7, nose[1] + r * 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Ear (right side hint)
    ctx.save();
    ctx.fillStyle = SKIN_DK;
    ctx.beginPath();
    ctx.ellipse(nose[0] + r * 0.9, nose[1] + r * 0.05, 4, 7, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Eyes
    ctx.save();
    ctx.fillStyle = EYE;
    const eyeY = nose[1] - r * 0.05;
    const eyeSpread = r * 0.3;
    ctx.beginPath();
    ctx.ellipse(nose[0] - eyeSpread, eyeY, 3, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(nose[0] + eyeSpread, eyeY, 3, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Eye highlights
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(nose[0] - eyeSpread + 1, eyeY - 1, 1.2, 0, Math.PI * 2);
    ctx.arc(nose[0] + eyeSpread + 1, eyeY - 1, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Subtle smile
    ctx.save();
    ctx.strokeStyle = SKIN_DK;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(nose[0], nose[1] + r * 0.2, r * 0.2, 0.2, Math.PI - 0.2);
    ctx.stroke();
    ctx.restore();
  }

  drawMotionTrail(points, prevPoints) {
    if (!prevPoints) return;
    const ctx = this.ctx;
    // Show trails on fast-moving extremities (hands, feet)
    const trailPts = [5, 6, 15, 16];
    ctx.save();
    ctx.lineCap = 'round';
    trailPts.forEach((i) => {
      const curr = points[i], prev = prevPoints[i];
      if (!curr || !prev) return;
      const d = dist(curr, prev);
      if (d < 8) return; // Only show trail for significant movement
      ctx.strokeStyle = `rgba(99,102,241,${Math.min(0.3, d / 80)})`;
      ctx.lineWidth = Math.min(6, d / 8);
      ctx.beginPath();
      ctx.moveTo(prev[0], prev[1]);
      ctx.lineTo(curr[0], curr[1]);
      ctx.stroke();
    });
    ctx.restore();
  }

  drawFrame(pose) {
    const W = this.width, H = this.height;
    const points = pose.map(([x, y]) => [x * W, y * H]);
    const prevPoints = this.prevPose ? this.prevPose.map(([x, y]) => [x * W, y * H]) : null;

    this.clear();
    this.drawBackground();
    this.drawShadow(points);
    this.drawMotionTrail(points, prevPoints);

    const ctx = this.ctx;

    // Back leg (left = further away)
    this.drawLeg(ctx, points[7], points[9], points[11], points[15], false);
    // Back arm (left)
    this.drawArm(ctx, points[1], points[3], points[5], false);

    // Torso
    this.drawTorso(points);

    // Front leg (right = closer)
    this.drawLeg(ctx, points[8], points[10], points[12], points[16], true);
    // Front arm (right)
    this.drawArm(ctx, points[2], points[4], points[6], true);

    // Head
    if (points[0] && points[13]) this.drawHead(points[0], points[13]);

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

