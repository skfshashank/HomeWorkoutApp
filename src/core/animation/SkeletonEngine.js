import { getExerciseAnimation } from './exerciseKeyframes.js';
import { PHOTO_EXERCISES } from './demoManifest.js';

const LOOP_FRAMES = 60;
const CYCLE_SECONDS = 2.4;   // one full figure-animation loop at 1x speed
const PHOTO_HOLD_MS = 1300;  // how long each demo photo (start/end) is held at 1x

// Joint indices (see exerciseKeyframes.js pose layout)
const HEAD = 0;
const L_SHOULDER = 1, R_SHOULDER = 2;
const L_ELBOW = 3, R_ELBOW = 4;
const L_WRIST = 5, R_WRIST = 6;
const L_HIP = 7, R_HIP = 8;
const L_KNEE = 9, R_KNEE = 10;
const L_ANKLE = 11, R_ANKLE = 12;
const NECK = 13, PELVIS = 14;
const L_FOOT = 15, R_FOOT = 16;

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const smoothstep = (t) => t * t * (3 - 2 * t);
const normalizeId = (id) => String(id || '').toLowerCase().replace(/_/g, '-');

/**
 * Fill the convex hull of two circles (a tapered capsule with different end
 * radii) -> smooth, anatomically tapered limbs.
 */
function fillCapsule(ctx, x1, y1, x2, y2, r1, r2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.001) {
    ctx.beginPath();
    ctx.arc(x1, y1, Math.max(r1, r2), 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  const phi = Math.atan2(dy, dx);
  const theta = Math.acos(clamp((r1 - r2) / dist, -1, 1));
  const STEPS = 14;
  ctx.beginPath();
  for (let i = 0; i <= STEPS; i++) {
    const a = phi + theta + (2 * Math.PI - 2 * theta) * (i / STEPS);
    const px = x1 + r1 * Math.cos(a);
    const py = y1 + r1 * Math.sin(a);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  for (let i = 0; i <= STEPS; i++) {
    const a = phi - theta + (2 * theta) * (i / STEPS);
    ctx.lineTo(x2 + r2 * Math.cos(a), y2 + r2 * Math.sin(a));
  }
  ctx.closePath();
  ctx.fill();
}

function fillCircle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

export class SkeletonEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.playing = false;
    this.speed = 1;
    this.exerciseId = null;

    this._mode = 'figure'; // 'figure' | 'photo'
    this._photo = null;    // { overlay, imgA, imgB, idx, timer }

    this.keyframes = null;
    this._frame = 0;
    this._lastTs = 0;
    this._raf = null;
    this._dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    this._w = 0;
    this._h = 0;

    this._tick = this._tick.bind(this);
    this._resize();

    if (typeof ResizeObserver !== 'undefined') {
      this._observer = new ResizeObserver(() => {
        this._resize();
        if (this._mode === 'figure' && !this.playing) this._drawFrame();
      });
      this._observer.observe(canvas);
    }
  }

  _resize() {
    const rect = this.canvas.getBoundingClientRect();
    const cssW = Math.round(rect.width) || this.canvas.width || 320;
    const cssH = Math.round(rect.height) || cssW;
    const dpr = this._dpr;
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this._w = cssW;
    this._h = cssH;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  loadExercise(_keyframes, exerciseId) {
    const id = normalizeId(exerciseId);
    this.exerciseId = id;
    const wasPlaying = this.playing;

    // Tear down whatever was previously active (without changing play intent).
    this._photoStop();
    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    }
    if (this._photo) {
      this._photo.overlay.remove();
      this._photo = null;
    }

    if (PHOTO_EXERCISES.has(id)) {
      this._mode = 'photo';
      this._buildPhoto(id);
      if (wasPlaying) this._photoStart();
    } else {
      this._mode = 'figure';
      const animation = getExerciseAnimation(id);
      this.keyframes = (animation && animation.keyframes) || null;
      this._frame = 0;
      if (this._w < 2) this._resize();
      this._drawFrame();
      if (wasPlaying) {
        this._lastTs = 0;
        this._raf = requestAnimationFrame(this._tick);
      }
    }
  }

  // ---------- Photo (real demonstration) mode ----------

  _buildPhoto(id) {
    // Keep the canvas in flow (it reserves the square box) but clear it; the
    // opaque photo overlay sits on top of the canvas region.
    if (this.ctx && this._w) this.ctx.clearRect(0, 0, this._w, this._h);
    const parent = this.canvas.parentNode;
    if (parent) parent.style.position = 'relative';

    const overlay = document.createElement('div');
    overlay.className = 'demo-photo';
    overlay.style.cssText =
      'position:absolute;top:0;left:0;width:100%;aspect-ratio:1;border-radius:inherit;' +
      'overflow:hidden;background:linear-gradient(180deg,#ffffff,#eef2f7);';

    const makeImg = (src, opacity) => {
      const img = document.createElement('img');
      img.src = src;
      img.alt = '';
      img.decoding = 'async';
      img.draggable = false;
      img.style.cssText =
        'position:absolute;inset:0;width:100%;height:100%;object-fit:contain;' +
        'opacity:' + opacity + ';';
      overlay.appendChild(img);
      return img;
    };

    const imgA = makeImg(`assets/exercises/${id}/0.jpg`, '1');
    const imgB = makeImg(`assets/exercises/${id}/1.jpg`, '0');

    if (parent) parent.insertBefore(overlay, this.canvas.nextSibling);
    this._photo = { overlay, imgA, imgB, idx: 0, timer: null };
  }

  _photoStart() {
    if (!this._photo) return;
    this._photoStop();
    const interval = Math.max(260, PHOTO_HOLD_MS / this.speed);
    this._photo.timer = setInterval(() => this._photoFlip(), interval);
  }

  _photoStop() {
    if (this._photo && this._photo.timer) {
      clearInterval(this._photo.timer);
      this._photo.timer = null;
    }
  }

  _photoFlip() {
    const p = this._photo;
    if (!p) return;
    p.idx ^= 1;
    p.imgA.style.opacity = p.idx === 0 ? '1' : '0';
    p.imgB.style.opacity = p.idx === 1 ? '1' : '0';
  }

  // ---------- Figure (humanoid rig) mode ----------

  _poseAt(frame) {
    const kfs = this.keyframes;
    if (!kfs || kfs.length === 0) return null;
    if (kfs.length === 1) return kfs[0].pose;

    let a = kfs[0];
    let b = kfs[kfs.length - 1];
    for (let i = 0; i < kfs.length - 1; i++) {
      if (frame >= kfs[i].frame && frame <= kfs[i + 1].frame) {
        a = kfs[i];
        b = kfs[i + 1];
        break;
      }
    }
    const span = (b.frame - a.frame) || 1;
    const t = smoothstep(clamp((frame - a.frame) / span, 0, 1));
    const pa = a.pose;
    const pb = b.pose;
    const out = new Array(pa.length);
    for (let j = 0; j < pa.length; j++) {
      out[j] = [
        pa[j][0] + (pb[j][0] - pa[j][0]) * t,
        pa[j][1] + (pb[j][1] - pa[j][1]) * t
      ];
    }
    return out;
  }

  _tick(ts) {
    if (!this.playing || this._mode !== 'figure') return;
    if (!this._lastTs) this._lastTs = ts;
    const dt = (ts - this._lastTs) / 1000;
    this._lastTs = ts;
    const framesPerSecond = (LOOP_FRAMES / CYCLE_SECONDS) * this.speed;
    this._frame = (this._frame + dt * framesPerSecond) % LOOP_FRAMES;
    this._drawFrame();
    this._raf = requestAnimationFrame(this._tick);
  }

  _drawFrame() {
    const ctx = this.ctx;
    if (!ctx) return;
    if (this._w < 2) this._resize();
    const w = this._w;
    const h = this._h;
    if (w < 2) return;

    ctx.clearRect(0, 0, w, h);
    this._drawStage(ctx, w, h);

    const pose = this._poseAt(this._frame);
    if (!pose) return;

    const size = Math.min(w, h);
    const pad = size * 0.1;
    const span = size - pad * 2;
    const offX = (w - size) / 2;
    const offY = (h - size) / 2;
    const X = (nx) => offX + pad + nx * span;
    const Y = (ny) => offY + pad + ny * span;
    const P = pose.map(([nx, ny]) => [X(nx), Y(ny)]);

    this._drawGroundShadow(ctx, P, size);
    this._drawFigure(ctx, P, size);
  }

  _drawStage(ctx, w, h) {
    const cx = w / 2;
    const cy = h * 0.46;
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.6);
    glow.addColorStop(0, 'rgba(45, 212, 191, 0.14)');
    glow.addColorStop(0.55, 'rgba(20, 184, 166, 0.05)');
    glow.addColorStop(1, 'rgba(15, 23, 42, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
  }

  _drawGroundShadow(ctx, P, s) {
    const feetY = Math.max(P[L_FOOT][1], P[R_FOOT][1], P[L_ANKLE][1], P[R_ANKLE][1]);
    const midX = (P[L_FOOT][0] + P[R_FOOT][0]) / 2;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.beginPath();
    ctx.ellipse(midX, feetY + s * 0.02, s * 0.18, s * 0.03, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _drawFigure(ctx, P, s) {
    const topY = Math.min(P[HEAD][1], P[L_WRIST][1], P[R_WRIST][1]) - s * 0.08;
    const botY = Math.max(P[L_FOOT][1], P[R_FOOT][1]) + s * 0.02;
    const grad = ctx.createLinearGradient(0, topY, 0, botY);
    grad.addColorStop(0, '#7ff0dd');
    grad.addColorStop(0.5, '#22d3ee');
    grad.addColorStop(1, '#0ea5e9');

    ctx.save();
    ctx.fillStyle = grad;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(2, 8, 23, 0.45)';
    ctx.shadowBlur = s * 0.025;
    ctx.shadowOffsetY = s * 0.012;

    const rUpperArm = [s * 0.052, s * 0.040];
    const rForearm = [s * 0.040, s * 0.030];
    const rThigh = [s * 0.074, s * 0.052];
    const rShin = [s * 0.052, s * 0.034];
    const rFoot = [s * 0.034, s * 0.026];
    const rHand = s * 0.036;

    fillCapsule(ctx, P[L_HIP][0], P[L_HIP][1], P[L_KNEE][0], P[L_KNEE][1], rThigh[0], rThigh[1]);
    fillCapsule(ctx, P[R_HIP][0], P[R_HIP][1], P[R_KNEE][0], P[R_KNEE][1], rThigh[0], rThigh[1]);
    fillCapsule(ctx, P[L_KNEE][0], P[L_KNEE][1], P[L_ANKLE][0], P[L_ANKLE][1], rShin[0], rShin[1]);
    fillCapsule(ctx, P[R_KNEE][0], P[R_KNEE][1], P[R_ANKLE][0], P[R_ANKLE][1], rShin[0], rShin[1]);
    fillCapsule(ctx, P[L_ANKLE][0], P[L_ANKLE][1], P[L_FOOT][0], P[L_FOOT][1], rFoot[0], rFoot[1]);
    fillCapsule(ctx, P[R_ANKLE][0], P[R_ANKLE][1], P[R_FOOT][0], P[R_FOOT][1], rFoot[0], rFoot[1]);

    this._drawTorso(ctx, P, s);

    fillCapsule(ctx, P[L_SHOULDER][0], P[L_SHOULDER][1], P[L_ELBOW][0], P[L_ELBOW][1], rUpperArm[0], rUpperArm[1]);
    fillCapsule(ctx, P[R_SHOULDER][0], P[R_SHOULDER][1], P[R_ELBOW][0], P[R_ELBOW][1], rUpperArm[0], rUpperArm[1]);
    fillCapsule(ctx, P[L_ELBOW][0], P[L_ELBOW][1], P[L_WRIST][0], P[L_WRIST][1], rForearm[0], rForearm[1]);
    fillCapsule(ctx, P[R_ELBOW][0], P[R_ELBOW][1], P[R_WRIST][0], P[R_WRIST][1], rForearm[0], rForearm[1]);
    fillCircle(ctx, P[L_WRIST][0], P[L_WRIST][1], rHand);
    fillCircle(ctx, P[R_WRIST][0], P[R_WRIST][1], rHand);

    fillCapsule(ctx, P[NECK][0], P[NECK][1], P[HEAD][0], P[HEAD][1], s * 0.05, s * 0.055);
    fillCircle(ctx, P[HEAD][0], P[HEAD][1], s * 0.078);

    ctx.restore();

    ctx.save();
    const hl = ctx.createRadialGradient(
      P[HEAD][0] - s * 0.025, P[HEAD][1] - s * 0.03, s * 0.005,
      P[HEAD][0], P[HEAD][1], s * 0.085
    );
    hl.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
    hl.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = hl;
    fillCircle(ctx, P[HEAD][0], P[HEAD][1], s * 0.078);
    ctx.restore();
  }

  _drawTorso(ctx, P, s) {
    fillCapsule(ctx, P[NECK][0], P[NECK][1], P[PELVIS][0], P[PELVIS][1], s * 0.09, s * 0.078);
    ctx.beginPath();
    ctx.moveTo(P[L_SHOULDER][0], P[L_SHOULDER][1]);
    ctx.lineTo(P[R_SHOULDER][0], P[R_SHOULDER][1]);
    ctx.lineTo(P[R_HIP][0], P[R_HIP][1]);
    ctx.lineTo(P[L_HIP][0], P[L_HIP][1]);
    ctx.closePath();
    ctx.lineWidth = s * 0.06;
    ctx.stroke();
    ctx.fill();
  }

  // ---------- Shared controls ----------

  play() {
    this.playing = true;
    if (this._mode === 'photo') {
      this._photoStart();
      return;
    }
    if (!this._raf) {
      this._lastTs = 0;
      this._raf = requestAnimationFrame(this._tick);
    }
  }

  pause() {
    this.playing = false;
    this._photoStop();
    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    }
  }

  setSpeed(speed = 1) {
    this.speed = Math.max(0.1, Number(speed) || 1);
    if (this._mode === 'photo' && this.playing) this._photoStart();
  }

  destroy() {
    this.pause();
    if (this._photo) {
      this._photo.overlay.remove();
      this._photo = null;
    }
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }
    if (this.ctx && this._w) this.ctx.clearRect(0, 0, this._w, this._h);
    this.keyframes = null;
  }
}
