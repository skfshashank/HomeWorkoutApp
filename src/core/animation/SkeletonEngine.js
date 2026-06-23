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

// Draw a smooth connected limb chain as thick round-cap strokes
function strokeChain(ctx, points, width) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i][0], points[i][1]);
  }
  ctx.stroke();
}

// Draw a tapered limb segment (wider at a, thinner at b)
function drawSegment(ctx, a, b, wA, wB) {
  if (!a || !b) return;
  const len = dist(a, b);
  if (len < 1) return;
  const angle = ang(a, b);
  const px = Math.cos(angle + Math.PI / 2);
  const py = Math.sin(angle + Math.PI / 2);

  ctx.beginPath();
  ctx.moveTo(a[0] + px * wA / 2, a[1] + py * wA / 2);
  ctx.lineTo(b[0] + px * wB / 2, b[1] + py * wB / 2);
  ctx.arc(b[0], b[1], wB / 2, angle + Math.PI / 2, angle - Math.PI / 2, true);
  ctx.lineTo(a[0] - px * wA / 2, a[1] - py * wA / 2);
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

  // === LAYER 1: Full skin skeleton (continuous, no gaps) ===
  drawSkinBase(ctx, p) {
    const neck = p[13], pelvis = p[14];
    const ls = p[1], rs = p[2], le = p[3], re = p[4], lw = p[5], rw = p[6];
    const lh = p[7], rh = p[8], lk = p[9], rk = p[10], la = p[11], ra = p[12];

    ctx.strokeStyle = SKIN;

    // Spine (neck → pelvis): thick core
    if (neck && pelvis) {
      ctx.lineWidth = 22;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(neck[0], neck[1]);
      ctx.lineTo(pelvis[0], pelvis[1]);
      ctx.stroke();
    }

    // Shoulder bar
    if (ls && rs) {
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(ls[0], ls[1]);
      ctx.lineTo(rs[0], rs[1]);
      ctx.stroke();
    }

    // Hip bar
    if (lh && rh) {
      ctx.lineWidth = 16;
      ctx.beginPath();
      ctx.moveTo(lh[0], lh[1]);
      ctx.lineTo(rh[0], rh[1]);
      ctx.stroke();
    }

    // Arms — connected chains (shoulder→elbow→wrist)
    // Back arm (left) - slightly dimmed
    ctx.save();
    ctx.globalAlpha = 0.75;
    ctx.strokeStyle = SKIN;
    if (ls && le) {
      const armPts = [ls, le];
      if (lw) armPts.push(lw);
      ctx.lineWidth = 10;
      strokeChain(ctx, armPts, 10);
    }
    ctx.restore();

    // Front arm (right)
    ctx.strokeStyle = SKIN;
    if (rs && re) {
      const armPts = [rs, re];
      if (rw) armPts.push(rw);
      strokeChain(ctx, armPts, 10);
    }

    // Legs — connected chains (hip→knee→ankle)
    // Back leg (left) - slightly dimmed
    ctx.save();
    ctx.globalAlpha = 0.75;
    ctx.strokeStyle = SKIN;
    if (lh && lk) {
      const legPts = [lh, lk];
      if (la) legPts.push(la);
      strokeChain(ctx, legPts, 13);
    }
    ctx.restore();

    // Front leg (right)
    ctx.strokeStyle = SKIN;
    if (rh && rk) {
      const legPts = [rh, rk];
      if (ra) legPts.push(ra);
      strokeChain(ctx, legPts, 13);
    }

    // Neck (connect to head area)
    const nose = p[0];
    if (neck && nose) {
      ctx.strokeStyle = SKIN;
      strokeChain(ctx, [neck, lerpPt(neck, nose, 0.3)], 11);
    }

    // Hands (circles at wrists)
    ctx.fillStyle = SKIN_DK;
    if (lw) { ctx.beginPath(); ctx.arc(lw[0], lw[1], 4, 0, Math.PI * 2); ctx.fill(); }
    if (rw) { ctx.beginPath(); ctx.arc(rw[0], rw[1], 4, 0, Math.PI * 2); ctx.fill(); }
  }

  // === LAYER 2: Clothing on top of skin ===
  drawShirt(ctx, p) {
    const neck = p[13], pelvis = p[14];
    const ls = p[1], rs = p[2], lh = p[7], rh = p[8];
    if (!neck || !ls || !rs || !lh || !rh) return;

    // Extended shoulder points (for sleeve coverage)
    const lsOut = [ls[0] - 3, ls[1] + 1];
    const rsOut = [rs[0] + 3, rs[1] + 1];

    // Waist (V-taper: narrower than shoulders)
    const waistY = lerp((ls[1] + rs[1]) / 2, (lh[1] + rh[1]) / 2, 0.55);
    const lWaist = [lerp(ls[0], lh[0], 0.5) + 4, waistY];
    const rWaist = [lerp(rs[0], rh[0], 0.5) - 4, waistY];

    const sg = ctx.createLinearGradient(lsOut[0], ls[1], rsOut[0], rh[1]);
    sg.addColorStop(0, SHIRT_DK);
    sg.addColorStop(0.3, SHIRT);
    sg.addColorStop(0.7, SHIRT_LT);
    sg.addColorStop(1, SHIRT_DK);
    ctx.fillStyle = sg;

    ctx.beginPath();
    // Neckline
    ctx.moveTo(lsOut[0], lsOut[1]);
    ctx.quadraticCurveTo(neck[0], neck[1] + 5, rsOut[0], rsOut[1]);
    // Right side down
    ctx.quadraticCurveTo(rsOut[0], lerp(rsOut[1], rWaist[1], 0.5), rWaist[0], rWaist[1]);
    ctx.quadraticCurveTo(rh[0] + 1, lerp(rWaist[1], rh[1], 0.5), rh[0] + 2, rh[1] + 2);
    // Bottom
    ctx.lineTo(lh[0] - 2, lh[1] + 2);
    // Left side up
    ctx.quadraticCurveTo(lh[0] - 1, lerp(lWaist[1], lh[1], 0.5), lWaist[0], lWaist[1]);
    ctx.quadraticCurveTo(lsOut[0], lerp(lsOut[1], lWaist[1], 0.5), lsOut[0], lsOut[1]);
    ctx.closePath();
    ctx.fill();

    // Sleeve caps (cover shoulder joints)
    const sleeveR = 9;
    ctx.fillStyle = SHIRT;
    ctx.beginPath(); ctx.arc(ls[0], ls[1], sleeveR, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(rs[0], rs[1], sleeveR, 0, Math.PI * 2); ctx.fill();

    // Subtle center line
    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(neck[0], neck[1] + 8);
    ctx.lineTo(pelvis ? pelvis[0] : neck[0], waistY);
    ctx.stroke();
    ctx.restore();
  }

  drawShorts(ctx, p) {
    const lh = p[7], rh = p[8], lk = p[9], rk = p[10];
    if (!lh || !rh || !lk || !rk) return;

    ctx.fillStyle = SHORTS;

    // Left short leg (covers hip→40% toward knee)
    const lEnd = lerpPt(lh, lk, 0.42);
    drawSegment(ctx, [lh[0], lh[1] - 2], lEnd, 20, 15);

    // Right short leg
    const rEnd = lerpPt(rh, rk, 0.42);
    drawSegment(ctx, [rh[0], rh[1] - 2], rEnd, 20, 15);

    // Crotch fill (connect the two leg pieces)
    const crotch = lerpPt(lh, rh, 0.5);
    crotch[1] += 6;
    ctx.beginPath();
    ctx.moveTo(lh[0] - 6, lh[1]);
    ctx.lineTo(rh[0] + 6, rh[1]);
    ctx.lineTo(rh[0] + 2, crotch[1]);
    ctx.lineTo(lh[0] - 2, crotch[1]);
    ctx.closePath();
    ctx.fill();

    // Waistband
    ctx.fillStyle = SHORTS_DK;
    ctx.beginPath();
    ctx.moveTo(lh[0] - 8, lh[1] - 3);
    ctx.lineTo(rh[0] + 8, rh[1] - 3);
    ctx.lineTo(rh[0] + 7, rh[1] + 2);
    ctx.lineTo(lh[0] - 7, lh[1] + 2);
    ctx.closePath();
    ctx.fill();
  }

  // === LAYER 3: Shoes ===
  drawShoes(ctx, p) {
    const la = p[11], ra = p[12], lf = p[15], rf = p[16];

    const drawShoe = (ankle, foot) => {
      if (!ankle || !foot) return;
      const shoeAngle = ang(ankle, foot);
      const shoeLen = Math.max(dist(ankle, foot), 14);

      ctx.save();
      ctx.translate(ankle[0], ankle[1]);
      ctx.rotate(shoeAngle);

      // Shoe body
      ctx.fillStyle = SHOE;
      ctx.beginPath();
      ctx.moveTo(-3, -5);
      ctx.lineTo(shoeLen * 0.85, -4);
      ctx.quadraticCurveTo(shoeLen + 3, 0, shoeLen * 0.85, 5);
      ctx.lineTo(-3, 5);
      ctx.quadraticCurveTo(-5, 0, -3, -5);
      ctx.closePath();
      ctx.fill();

      // Sole
      ctx.fillStyle = SHOE_SOLE;
      ctx.beginPath();
      ctx.moveTo(0, 4);
      ctx.lineTo(shoeLen * 0.8, 4);
      ctx.lineTo(shoeLen * 0.85, 6);
      ctx.lineTo(-1, 6);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    };

    // Back foot first (dimmed)
    ctx.save();
    ctx.globalAlpha = 0.75;
    drawShoe(la, lf);
    ctx.restore();
    // Front foot
    drawShoe(ra, rf);
  }

  // === LAYER 4: Head ===
  drawHead(ctx, nose, neck) {
    if (!nose) return;
    const headR = 17;
    const headAngle = neck ? ang(neck, nose) : -Math.PI / 2;

    ctx.save();
    ctx.translate(nose[0], nose[1]);
    ctx.rotate(headAngle + Math.PI / 2);

    // Hair (back)
    ctx.fillStyle = HAIR;
    ctx.beginPath();
    ctx.ellipse(0, -1, headR * 0.88, headR + 1, 0, Math.PI, 0);
    ctx.fill();

    // Head shape
    const hg = ctx.createRadialGradient(-2, -1, 0, 0, 0, headR);
    hg.addColorStop(0, SKIN_LT);
    hg.addColorStop(0.55, SKIN);
    hg.addColorStop(1, SKIN_DK);
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.ellipse(0, 0, headR * 0.8, headR, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hair top
    ctx.fillStyle = HAIR;
    ctx.beginPath();
    ctx.ellipse(0, -headR * 0.5, headR * 0.72, headR * 0.52, 0, Math.PI, 0, true);
    ctx.fill();

    // Ear
    ctx.fillStyle = SKIN_DK;
    ctx.beginPath();
    ctx.ellipse(headR * 0.7, 1, 3, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // === MAIN DRAW: layered approach ===
  drawBody(p) {
    const ctx = this.ctx;

    // Layer 1: Continuous skin skeleton (no gaps at joints)
    this.drawSkinBase(ctx, p);

    // Layer 2: Clothing painted ON TOP of skin
    this.drawShorts(ctx, p);
    this.drawShirt(ctx, p);

    // Layer 3: Shoes
    this.drawShoes(ctx, p);

    // Layer 4: Head (always on top)
    this.drawHead(ctx, p[0], p[13]);
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
