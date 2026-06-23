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
const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

// Athletic color palette
const SKIN = '#F0BA8C';
const SKIN_LT = '#FADDCA';
const SKIN_DK = '#C88A5A';
const SHIRT_1 = '#FF6B35';
const SHIRT_2 = '#E8521A';
const SHIRT_3 = '#B83D0F';
const SHORTS_1 = '#1E293B';
const SHORTS_2 = '#0F172A';
const SHOE_1 = '#2D3748';
const SHOE_2 = '#6366F1';
const SHOE_3 = '#818CF8';
const HAIR_1 = '#2C1810';
const HAIR_2 = '#4A2E1F';
const EYE = '#1A0E08';
const SWEAT = 'rgba(120,200,255,0.5)';

// Spring physics for secondary motion
class SpringValue {
  constructor(target = 0, stiffness = 0.08, damping = 0.7) {
    this.value = target;
    this.target = target;
    this.velocity = 0;
    this.stiffness = stiffness;
    this.damping = damping;
  }
  update() {
    const force = (this.target - this.value) * this.stiffness;
    this.velocity = (this.velocity + force) * this.damping;
    this.value += this.velocity;
    return this.value;
  }
  set(t) { this.target = t; }
}

// Smooth tapered limb with bezier contour and muscle shape
function drawTaperedLimb(ctx, start, end, wStart, wEnd, color, highlightColor, bulgeAmt = 1.15) {
  const a = ang(start, end);
  const px = Math.cos(a + Math.PI / 2);
  const py = Math.sin(a + Math.PI / 2);
  const bulge = wStart * bulgeAmt;
  const bulgeX = lerp(start[0], end[0], 0.38);
  const bulgeY = lerp(start[1], end[1], 0.38);
  const midPt = mid(start, end);

  // Main body with gradient
  const grad = ctx.createLinearGradient(
    midPt[0] - px * wStart, midPt[1] - py * wStart,
    midPt[0] + px * wStart, midPt[1] + py * wStart
  );
  grad.addColorStop(0, highlightColor || color);
  grad.addColorStop(0.35, color);
  grad.addColorStop(0.65, color);
  grad.addColorStop(1, highlightColor || color);

  ctx.save();
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(start[0] + px * wStart, start[1] + py * wStart);
  ctx.bezierCurveTo(
    bulgeX + px * bulge, bulgeY + py * bulge,
    lerp(bulgeX, end[0], 0.5) + px * lerp(bulge, wEnd, 0.5), lerp(bulgeY, end[1], 0.5) + py * lerp(bulge, wEnd, 0.5),
    end[0] + px * wEnd, end[1] + py * wEnd
  );
  ctx.lineTo(end[0] - px * wEnd, end[1] - py * wEnd);
  ctx.bezierCurveTo(
    lerp(bulgeX, end[0], 0.5) - px * lerp(bulge, wEnd, 0.5), lerp(bulgeY, end[1], 0.5) - py * lerp(bulge, wEnd, 0.5),
    bulgeX - px * bulge, bulgeY - py * bulge,
    start[0] - px * wStart, start[1] - py * wStart
  );
  ctx.closePath();
  ctx.fill();

  // Specular highlight
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  const hlW = wStart * 0.25;
  ctx.moveTo(start[0] - px * hlW, start[1] - py * hlW);
  ctx.quadraticCurveTo(
    midPt[0] - px * hlW * 0.7, midPt[1] - py * hlW * 0.7,
    end[0] - px * wEnd * 0.2, end[1] - py * wEnd * 0.2
  );
  ctx.lineTo(end[0] - px * wEnd * 0.05, end[1] - py * wEnd * 0.05);
  ctx.quadraticCurveTo(
    midPt[0] - px * hlW * 0.2, midPt[1] - py * hlW * 0.2,
    start[0] - px * hlW * 0.3, start[1] - py * hlW * 0.3
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Joint with 3D sphere effect
function drawJoint(ctx, point, radius, color) {
  if (!point) return;
  ctx.save();
  const grad = ctx.createRadialGradient(
    point[0] - radius * 0.35, point[1] - radius * 0.35, 0,
    point[0], point[1], radius
  );
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.2, SKIN_LT);
  grad.addColorStop(0.7, color);
  grad.addColorStop(1, SKIN_DK);
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
    this.frameCount = 0;

    // Secondary motion
    this.hairBounce = new SpringValue(0, 0.06, 0.75);
    this.breathPhase = 0;

    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  loadExercise(keyframes = []) {
    this.keyframes = [...keyframes]
      .map((f) => ({ frame: Number(f.frame || 0), pose: clonePose(f.pose || STANDING_FRONT) }))
      .sort((a, b) => a.frame - b.frame);
    this.currentFrame = 0;
    this.prevPose = null;
    this.frameCount = 0;
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
    const grad = ctx.createRadialGradient(
      this.width / 2, this.height * 0.35, 0,
      this.width / 2, this.height * 0.5, this.width * 0.8
    );
    grad.addColorStop(0, '#FFFFFF');
    grad.addColorStop(0.5, '#F8FAFC');
    grad.addColorStop(1, '#E2E8F0');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);

    // Floor gradient
    ctx.save();
    const floorGrad = ctx.createLinearGradient(0, this.height * 0.92, 0, this.height);
    floorGrad.addColorStop(0, 'rgba(0,0,0,0)');
    floorGrad.addColorStop(1, 'rgba(0,0,0,0.03)');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, this.height * 0.92, this.width, this.height * 0.08);
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(this.width * 0.1, this.height * 0.935);
    ctx.lineTo(this.width * 0.9, this.height * 0.935);
    ctx.stroke();
    ctx.restore();
  }

  drawShadow(points) {
    const lf = points[15] || points[11];
    const rf = points[16] || points[12];
    const cx = ((lf?.[0] || this.width * 0.45) + (rf?.[0] || this.width * 0.55)) / 2;
    const cy = this.height * 0.935;
    const spread = Math.abs((lf?.[0] || 0) - (rf?.[0] || 0)) * 0.45 + 40;
    const headY = points[0]?.[1] || this.height * 0.2;
    const heightRatio = clamp(headY / (this.height * 0.9), 0.3, 1);

    const ctx = this.ctx;
    ctx.save();
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, spread);
    grad.addColorStop(0, `rgba(0,0,0,${0.18 * heightRatio})`);
    grad.addColorStop(0.5, `rgba(0,0,0,${0.07 * heightRatio})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, spread, 11 * heightRatio, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawShoe(ctx, ankle, foot, isRight) {
    if (!foot) return;
    const dir = isRight ? 1 : -1;
    ctx.save();
    const grad = ctx.createLinearGradient(foot[0] - 14, foot[1] - 8, foot[0] + 14, foot[1] + 6);
    grad.addColorStop(0, '#4B5563');
    grad.addColorStop(0.4, SHOE_1);
    grad.addColorStop(1, '#1F2937');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(foot[0] - 8, foot[1] - 8);
    ctx.bezierCurveTo(foot[0] + 4 * dir, foot[1] - 10, foot[0] + 14 * dir, foot[1] - 6, foot[0] + 18 * dir, foot[1] - 1);
    ctx.bezierCurveTo(foot[0] + 18 * dir, foot[1] + 4, foot[0] + 8 * dir, foot[1] + 6, foot[0] - 8, foot[1] + 6);
    ctx.bezierCurveTo(foot[0] - 14, foot[1] + 2, foot[0] - 12, foot[1] - 6, foot[0] - 8, foot[1] - 8);
    ctx.closePath();
    ctx.fill();

    // Accent swoosh
    ctx.fillStyle = SHOE_2;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(foot[0] - 2, foot[1] - 7);
    ctx.bezierCurveTo(foot[0] + 6 * dir, foot[1] - 8, foot[0] + 12 * dir, foot[1] - 4, foot[0] + 14 * dir, foot[1] - 1);
    ctx.lineTo(foot[0] + 10 * dir, foot[1]);
    ctx.bezierCurveTo(foot[0] + 6 * dir, foot[1] - 2, foot[0] + 2 * dir, foot[1] - 5, foot[0] - 2, foot[1] - 5);
    ctx.closePath();
    ctx.fill();

    // Sole
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.roundRect(foot[0] - 10, foot[1] + 5, 24 + 4 * dir, 4, 2);
    ctx.fill();

    // Top highlight
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(foot[0] + 2 * dir, foot[1] - 6, 7, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawLeg(ctx, hip, knee, ankle, foot, isFront) {
    if (!hip || !knee) return;
    const alpha = isFront ? 1 : 0.8;
    ctx.save();
    ctx.globalAlpha = alpha;

    // Upper leg (shorts)
    drawTaperedLimb(ctx, hip, knee, 14, 11, SHORTS_1, SHORTS_2, 1.08);
    drawJoint(ctx, knee, 7, SKIN);

    // Lower leg (calf muscle)
    if (knee && ankle) {
      drawTaperedLimb(ctx, knee, ankle, 10, 7, SKIN, SKIN_LT, 1.22);
    }
    ctx.restore();
    if (foot) this.drawShoe(ctx, ankle, foot, isFront);
  }

  drawTorso(points) {
    const ctx = this.ctx;
    const ls = points[1], rs = points[2], lh = points[7], rh = points[8], neck = points[13];
    if (!ls || !rs || !lh || !rh) return;

    const breathOff = Math.sin(this.breathPhase) * 2;
    const waistPinch = 0.55;
    const waistLX = lerp(ls[0], lh[0], waistPinch) + 3;
    const waistRX = lerp(rs[0], rh[0], waistPinch) - 3;
    const waistY = lerp(ls[1], lh[1], waistPinch);

    ctx.save();
    // 3-tone gradient for depth
    const grad = ctx.createLinearGradient(ls[0] - 10, ls[1], rs[0] + 10, rs[1]);
    grad.addColorStop(0, SHIRT_3);
    grad.addColorStop(0.2, SHIRT_1);
    grad.addColorStop(0.5, SHIRT_1);
    grad.addColorStop(0.8, SHIRT_2);
    grad.addColorStop(1, SHIRT_3);
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.moveTo(ls[0] - 10, ls[1] - breathOff);
    ctx.lineTo(rs[0] + 10, rs[1] - breathOff);
    ctx.bezierCurveTo(rs[0] + 8, lerp(rs[1], waistY, 0.3), waistRX + 2, waistY - 5, waistRX, waistY);
    ctx.bezierCurveTo(rh[0] + 1, lerp(waistY, rh[1], 0.5), rh[0] + 4, rh[1] - 3, rh[0] + 5, rh[1]);
    ctx.lineTo(lh[0] - 5, lh[1]);
    ctx.bezierCurveTo(lh[0] - 4, lh[1] - 3, lh[0] - 1, lerp(waistY, lh[1], 0.5), waistLX, waistY);
    ctx.bezierCurveTo(waistLX - 2, waistY - 5, ls[0] - 8, lerp(ls[1], waistY, 0.3), ls[0] - 10, ls[1] - breathOff);
    ctx.closePath();
    ctx.fill();

    // V-neck skin
    if (neck) {
      ctx.fillStyle = SKIN;
      ctx.beginPath();
      ctx.moveTo(ls[0] + 6, ls[1] - 3);
      ctx.quadraticCurveTo(neck[0], neck[1] + 18, rs[0] - 6, rs[1] - 3);
      ctx.lineTo(rs[0] - 10, rs[1] + 5);
      ctx.quadraticCurveTo(neck[0], neck[1] + 24, ls[0] + 10, ls[1] + 5);
      ctx.closePath();
      ctx.fill();
    }

    // Chest line (subtle depth)
    ctx.strokeStyle = SHIRT_3;
    ctx.globalAlpha = 0.12;
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';
    const chestY = lerp(ls[1], waistY, 0.35);
    ctx.beginPath();
    ctx.moveTo(lerp(ls[0], rs[0], 0.35), chestY);
    ctx.quadraticCurveTo(lerp(ls[0], rs[0], 0.5), chestY + 4, lerp(ls[0], rs[0], 0.65), chestY);
    ctx.stroke();

    // Specular on shirt
    ctx.globalAlpha = 0.09;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(lerp(ls[0], rs[0], 0.35), lerp(ls[1], waistY, 0.4), 11, 18, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Shoulder deltoids
    ctx.save();
    [ls, rs].forEach((s) => {
      const g = ctx.createRadialGradient(s[0], s[1] - 1, 0, s[0], s[1], 9);
      g.addColorStop(0, SHIRT_1);
      g.addColorStop(0.7, SHIRT_2);
      g.addColorStop(1, SHIRT_3);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(s[0], s[1], 9, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  drawArm(ctx, shoulder, elbow, wrist, isFront) {
    if (!shoulder || !elbow) return;
    const alpha = isFront ? 1 : 0.78;
    const skinC = isFront ? SKIN : SKIN_DK;
    const hlC = isFront ? SKIN_LT : SKIN;

    ctx.save();
    ctx.globalAlpha = alpha;
    drawTaperedLimb(ctx, shoulder, elbow, 11, 9, skinC, hlC, 1.18);
    drawJoint(ctx, elbow, 6, skinC);
    if (elbow && wrist) {
      drawTaperedLimb(ctx, elbow, wrist, 9, 6, skinC, hlC, 1.1);
    }
    ctx.restore();

    // Hand
    if (wrist) {
      ctx.save();
      ctx.globalAlpha = alpha;
      const hGrad = ctx.createRadialGradient(wrist[0] - 1, wrist[1] - 1, 0, wrist[0], wrist[1], 7);
      hGrad.addColorStop(0, SKIN_LT);
      hGrad.addColorStop(0.5, skinC);
      hGrad.addColorStop(1, SKIN_DK);
      ctx.fillStyle = hGrad;
      ctx.beginPath();
      ctx.ellipse(wrist[0], wrist[1], 6, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      // Fingers
      const fa = elbow ? ang(elbow, wrist) : Math.PI / 2;
      ctx.fillStyle = skinC;
      ctx.globalAlpha = alpha * 0.65;
      for (let i = -1.5; i <= 1.5; i += 1) {
        const fx = wrist[0] + Math.cos(fa) * 7 + Math.cos(fa + Math.PI / 2) * i * 2;
        const fy = wrist[1] + Math.sin(fa) * 7 + Math.sin(fa + Math.PI / 2) * i * 2;
        ctx.beginPath();
        ctx.ellipse(fx, fy, 1.5, 3, fa, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  drawHead(nose, neck) {
    const ctx = this.ctx;
    if (!nose || !neck) return;
    const r = Math.max(18, Math.min(24, dist(nose, neck) * 1.3));
    const hb = this.hairBounce.value;

    // Neck
    ctx.save();
    const nGrad = ctx.createLinearGradient(neck[0] - 10, neck[1], neck[0] + 10, neck[1]);
    nGrad.addColorStop(0, SKIN_DK);
    nGrad.addColorStop(0.5, SKIN);
    nGrad.addColorStop(1, SKIN_DK);
    ctx.fillStyle = nGrad;
    ctx.beginPath();
    ctx.moveTo(neck[0] - 10, neck[1]);
    ctx.bezierCurveTo(neck[0] - 8, neck[1] - 8, nose[0] - 8, nose[1] + r * 0.8, nose[0] - 7, nose[1] + r * 0.65);
    ctx.lineTo(nose[0] + 7, nose[1] + r * 0.65);
    ctx.bezierCurveTo(nose[0] + 8, nose[1] + r * 0.8, neck[0] + 8, neck[1] - 8, neck[0] + 10, neck[1]);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Head oval
    ctx.save();
    const hGrad = ctx.createRadialGradient(nose[0] - r * 0.25, nose[1] - r * 0.2, r * 0.1, nose[0], nose[1], r * 1.05);
    hGrad.addColorStop(0, SKIN_LT);
    hGrad.addColorStop(0.4, SKIN);
    hGrad.addColorStop(0.85, SKIN);
    hGrad.addColorStop(1, SKIN_DK);
    ctx.fillStyle = hGrad;
    ctx.beginPath();
    ctx.ellipse(nose[0], nose[1], r * 0.92, r, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Ear
    ctx.save();
    ctx.fillStyle = SKIN_DK;
    ctx.beginPath();
    ctx.ellipse(nose[0] + r * 0.88, nose[1] + r * 0.05, 3.5, 6, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = SKIN;
    ctx.beginPath();
    ctx.ellipse(nose[0] + r * 0.88, nose[1] + r * 0.05, 2, 4, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Hair with bounce
    ctx.save();
    const hairY = nose[1] - r * 0.15 + hb;
    const hairGrad = ctx.createRadialGradient(nose[0] - r * 0.2, hairY - r * 0.4, r * 0.1, nose[0], hairY, r * 1.1);
    hairGrad.addColorStop(0, HAIR_2);
    hairGrad.addColorStop(0.5, HAIR_1);
    hairGrad.addColorStop(1, '#1A0D07');
    ctx.fillStyle = hairGrad;
    ctx.beginPath();
    ctx.ellipse(nose[0], hairY - r * 0.15, r * 0.95, r * 0.72, 0, Math.PI * 0.97, Math.PI * 2.03);
    ctx.bezierCurveTo(nose[0] + r * 0.95, nose[1] - r * 0.05, nose[0] + r * 0.6, nose[1] + r * 0.2, nose[0] + r * 0.5, nose[1] + r * 0.12 + hb);
    ctx.lineTo(nose[0] - r * 0.5, nose[1] + r * 0.12 + hb);
    ctx.bezierCurveTo(nose[0] - r * 0.6, nose[1] + r * 0.2, nose[0] - r * 0.95, nose[1] - r * 0.05, nose[0] - r * 0.92, hairY - r * 0.2);
    ctx.closePath();
    ctx.fill();
    // Hair shine
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(nose[0] - r * 0.2, hairY - r * 0.35, r * 0.25, r * 0.12, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Eyes - small and subtle
    const eyeY = nose[1] + r * 0.02;
    const eyeSpread = r * 0.25;
    ctx.save();
    // Simple dot eyes (clean illustration style)
    ctx.fillStyle = EYE;
    ctx.beginPath();
    ctx.ellipse(nose[0] - eyeSpread, eyeY, 2.5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(nose[0] + eyeSpread, eyeY, 2.5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    // Tiny highlight
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.arc(nose[0] - eyeSpread + 0.8, eyeY - 1, 0.8, 0, Math.PI * 2);
    ctx.arc(nose[0] + eyeSpread + 0.8, eyeY - 1, 0.8, 0, Math.PI * 2);
    ctx.fill();
    // Eyebrows
    ctx.globalAlpha = 1;
    ctx.strokeStyle = HAIR_1;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(nose[0] - eyeSpread - 4, eyeY - 5);
    ctx.quadraticCurveTo(nose[0] - eyeSpread, eyeY - 7, nose[0] - eyeSpread + 4, eyeY - 5.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(nose[0] + eyeSpread - 4, eyeY - 5.5);
    ctx.quadraticCurveTo(nose[0] + eyeSpread, eyeY - 7, nose[0] + eyeSpread + 4, eyeY - 5);
    ctx.stroke();
    ctx.restore();

    // Nose (minimal)
    ctx.save();
    ctx.fillStyle = SKIN_DK;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.ellipse(nose[0], eyeY + 7, 2, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Subtle smile
    ctx.save();
    ctx.strokeStyle = SKIN_DK;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(nose[0], nose[1] + r * 0.3, r * 0.12, 0.3, Math.PI - 0.3);
    ctx.stroke();
    ctx.restore();
  }

  drawMotionTrail(points, prevPoints) {
    if (!prevPoints) return;
    const ctx = this.ctx;
    const trailPts = [5, 6, 15, 16];
    ctx.save();
    trailPts.forEach((i) => {
      const curr = points[i], prev = prevPoints[i];
      if (!curr || !prev) return;
      const d = dist(curr, prev);
      if (d < 6) return;
      const alpha = Math.min(0.35, d / 55);
      const grad = ctx.createLinearGradient(prev[0], prev[1], curr[0], curr[1]);
      grad.addColorStop(0, 'rgba(99,102,241,0)');
      grad.addColorStop(1, `rgba(99,102,241,${alpha})`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = Math.min(8, d / 5);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(prev[0], prev[1]);
      ctx.lineTo(curr[0], curr[1]);
      ctx.stroke();
    });
    ctx.restore();
  }

  updateSecondaryMotion(pose) {
    if (this.prevPose && pose[0]) {
      const headVelY = (pose[0][1] - this.prevPose[0][1]) * this.height;
      this.hairBounce.set(clamp(headVelY * 3, -5, 5));
    }
    this.hairBounce.update();
    this.breathPhase += 0.04;
  }

  drawFrame(pose) {
    const W = this.width, H = this.height;
    const points = pose.map(([x, y]) => [x * W, y * H]);
    const prevPoints = this.prevPose ? this.prevPose.map(([x, y]) => [x * W, y * H]) : null;

    this.updateSecondaryMotion(pose);
    this.clear();
    this.drawBackground();
    this.drawShadow(points);
    this.drawMotionTrail(points, prevPoints);

    const ctx = this.ctx;

    // Back limbs (dimmed for depth)
    this.drawLeg(ctx, points[7], points[9], points[11], points[15], false);
    this.drawArm(ctx, points[1], points[3], points[5], false);

    // Torso
    this.drawTorso(points);

    // Front limbs
    this.drawLeg(ctx, points[8], points[10], points[12], points[16], true);
    this.drawArm(ctx, points[2], points[4], points[6], true);

    // Head
    if (points[0] && points[13]) this.drawHead(points[0], points[13]);

    this.prevPose = pose;
    this.frameCount++;
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

