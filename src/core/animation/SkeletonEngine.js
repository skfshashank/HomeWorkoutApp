import { STANDING_FRONT } from './exerciseKeyframes.js';

const CONNECTIONS = [
  [13, 0],
  [1, 13],
  [2, 13],
  [1, 3],
  [3, 5],
  [2, 4],
  [4, 6],
  [13, 14],
  [7, 14],
  [8, 14],
  [7, 9],
  [9, 11],
  [8, 10],
  [10, 12],
  [11, 15],
  [12, 16]
];

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const round = (value) => Number(value.toFixed(3));
const clonePose = (pose) => pose.map(([x, y]) => [round(x), round(y)]);

// Colors for illustrated character
const SKIN = '#e8b88a';
const SKIN_SHADOW = '#d4a07a';
const SHIRT = '#e85d2f';
const SHIRT_DARK = '#c44a22';
const SHORTS = '#2a2a2a';
const SHORTS_SHADOW = '#1a1a1a';
const SHOE = '#333333';
const SHOE_ACCENT = '#555555';
const HAIR = '#4a3728';
const BG_LIGHT = '#f0f0f0';
const BG_GRADIENT = '#e8e8e8';

function midpoint(a, b) {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

function dist(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function angle(a, b) {
  return Math.atan2(b[1] - a[1], b[0] - a[0]);
}

function drawLimb(ctx, start, end, widthStart, widthEnd, color, shadowColor) {
  const a = angle(start, end);
  const perpX = Math.cos(a + Math.PI / 2);
  const perpY = Math.sin(a + Math.PI / 2);

  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(start[0] + perpX * widthStart, start[1] + perpY * widthStart);
  ctx.lineTo(end[0] + perpX * widthEnd, end[1] + perpY * widthEnd);
  ctx.lineTo(end[0] - perpX * widthEnd, end[1] - perpY * widthEnd);
  ctx.lineTo(start[0] - perpX * widthStart, start[1] - perpY * widthStart);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Shadow edge
  ctx.save();
  ctx.fillStyle = shadowColor || color;
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.moveTo(start[0] + perpX * widthStart, start[1] + perpY * widthStart);
  ctx.lineTo(end[0] + perpX * widthEnd, end[1] + perpY * widthEnd);
  ctx.lineTo(end[0] + perpX * widthEnd * 0.3, end[1] + perpY * widthEnd * 0.3);
  ctx.lineTo(start[0] + perpX * widthStart * 0.3, start[1] + perpY * widthStart * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawRoundedLimb(ctx, start, end, width, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(start[0], start[1]);
  ctx.lineTo(end[0], end[1]);
  ctx.stroke();
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

    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  loadExercise(keyframes = []) {
    this.keyframes = [...keyframes]
      .map((frame) => ({ frame: Number(frame.frame || 0), pose: clonePose(frame.pose || STANDING_FRONT) }))
      .sort((left, right) => left.frame - right.frame);
    this.currentFrame = 0;
    this.drawFrame(this.interpolate(0));
  }

  interpolate(frame) {
    if (!this.keyframes.length) return clonePose(STANDING_FRONT);
    if (this.keyframes.length === 1) return clonePose(this.keyframes[0].pose);

    const wrappedFrame = ((frame % this.totalFrames) + this.totalFrames) % this.totalFrames;
    const normalizedKeyframes = this.keyframes.map((keyframe) => ({
      frame: keyframe.frame >= this.totalFrames ? this.totalFrames : keyframe.frame,
      pose: keyframe.pose
    }));

    let previous = normalizedKeyframes[0];
    let next = normalizedKeyframes[normalizedKeyframes.length - 1];

    for (let index = 0; index < normalizedKeyframes.length; index += 1) {
      const current = normalizedKeyframes[index];
      if (current.frame <= wrappedFrame) previous = current;
      if (current.frame >= wrappedFrame) {
        next = current;
        break;
      }
    }

    if (next.frame < previous.frame || wrappedFrame > normalizedKeyframes[normalizedKeyframes.length - 1].frame) {
      next = {
        frame: normalizedKeyframes[0].frame + this.totalFrames,
        pose: normalizedKeyframes[0].pose
      };
    }

    const localFrame = wrappedFrame < previous.frame ? wrappedFrame + this.totalFrames : wrappedFrame;
    const span = Math.max(next.frame - previous.frame, 1);
    const eased = easeInOut((localFrame - previous.frame) / span);

    return previous.pose.map(([px, py], index) => {
      const [nx, ny] = next.pose[index] || previous.pose[index];
      return [
        round(px + (nx - px) * eased),
        round(py + (ny - py) * eased)
      ];
    });
  }

  clear() {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  drawBackground() {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, BG_LIGHT);
    gradient.addColorStop(1, BG_GRADIENT);
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  drawShadow(points) {
    const leftFoot = points[15] || points[11];
    const rightFoot = points[16] || points[12];
    const cx = ((leftFoot?.[0] || this.width * 0.45) + (rightFoot?.[0] || this.width * 0.55)) / 2;
    const cy = this.height * 0.94;
    const spread = Math.abs((leftFoot?.[0] || 0) - (rightFoot?.[0] || 0)) * 0.6 + 30;

    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    this.ctx.beginPath();
    this.ctx.ellipse(cx, cy, spread, 8, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  drawShoes(points) {
    const ctx = this.ctx;
    [points[15], points[16]].forEach((foot) => {
      if (!foot) return;
      ctx.save();
      ctx.fillStyle = SHOE;
      ctx.beginPath();
      ctx.ellipse(foot[0] + 4, foot[1], 14, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      // Shoe detail
      ctx.fillStyle = SHOE_ACCENT;
      ctx.beginPath();
      ctx.ellipse(foot[0] + 6, foot[1] - 2, 8, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  drawLegs(points) {
    const ctx = this.ctx;
    // Left leg
    if (points[7] && points[9]) {
      // Upper leg (shorts)
      drawLimb(ctx, points[7], points[9], 14, 12, SHORTS, SHORTS_SHADOW);
    }
    if (points[9] && points[11]) {
      // Lower leg (skin)
      drawLimb(ctx, points[9], points[11], 11, 9, SKIN, SKIN_SHADOW);
    }
    // Right leg
    if (points[8] && points[10]) {
      drawLimb(ctx, points[8], points[10], 14, 12, SHORTS, SHORTS_SHADOW);
    }
    if (points[10] && points[12]) {
      drawLimb(ctx, points[10], points[12], 11, 9, SKIN, SKIN_SHADOW);
    }
  }

  drawTorso(points) {
    const ctx = this.ctx;
    const lShoulder = points[1];
    const rShoulder = points[2];
    const lHip = points[7];
    const rHip = points[8];
    if (!lShoulder || !rShoulder || !lHip || !rHip) return;

    // Tank top body
    ctx.save();
    ctx.fillStyle = SHIRT;
    ctx.beginPath();
    ctx.moveTo(lShoulder[0] - 6, lShoulder[1]);
    ctx.lineTo(rShoulder[0] + 6, rShoulder[1]);
    ctx.lineTo(rHip[0] + 4, rHip[1]);
    ctx.lineTo(lHip[0] - 4, lHip[1]);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Shirt shadow (right side)
    ctx.save();
    ctx.fillStyle = SHIRT_DARK;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    const mx = (rShoulder[0] + rHip[0]) / 2;
    ctx.moveTo(mx, lShoulder[1]);
    ctx.lineTo(rShoulder[0] + 6, rShoulder[1]);
    ctx.lineTo(rHip[0] + 4, rHip[1]);
    ctx.lineTo(mx, rHip[1]);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Neckline
    const neck = points[13];
    if (neck) {
      ctx.save();
      ctx.fillStyle = SKIN;
      ctx.beginPath();
      ctx.ellipse(neck[0], neck[1] + 4, 12, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawArms(points) {
    const ctx = this.ctx;
    // Left arm
    if (points[1] && points[3]) {
      drawRoundedLimb(ctx, points[1], points[3], 16, SKIN);
    }
    if (points[3] && points[5]) {
      drawRoundedLimb(ctx, points[3], points[5], 14, SKIN);
    }
    // Right arm
    if (points[2] && points[4]) {
      drawRoundedLimb(ctx, points[2], points[4], 16, SKIN);
    }
    if (points[4] && points[6]) {
      drawRoundedLimb(ctx, points[4], points[6], 14, SKIN);
    }
    // Hands
    [points[5], points[6]].forEach((hand) => {
      if (!hand) return;
      ctx.save();
      ctx.fillStyle = SKIN_SHADOW;
      ctx.beginPath();
      ctx.arc(hand[0], hand[1], 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  drawHead(nose, neck) {
    const ctx = this.ctx;
    if (!nose || !neck) return;
    const headRadius = Math.max(18, Math.min(26, dist(nose, neck) * 1.4));

    // Head shape
    ctx.save();
    ctx.fillStyle = SKIN;
    ctx.beginPath();
    ctx.arc(nose[0], nose[1], headRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Hair
    ctx.save();
    ctx.fillStyle = HAIR;
    ctx.beginPath();
    ctx.arc(nose[0], nose[1] - headRadius * 0.3, headRadius * 0.95, Math.PI, Math.PI * 2);
    ctx.fill();
    // Hair sides
    ctx.beginPath();
    ctx.ellipse(nose[0], nose[1] - headRadius * 0.15, headRadius * 0.9, headRadius * 0.65, 0, Math.PI * 1.15, Math.PI * 1.85);
    ctx.fill();
    ctx.restore();

    // Face features (subtle)
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    // Eyes region
    ctx.beginPath();
    ctx.arc(nose[0] - 6, nose[1] - 3, 2.5, 0, Math.PI * 2);
    ctx.arc(nose[0] + 6, nose[1] - 3, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawFrame(pose) {
    const points = pose.map(([x, y]) => [x * this.width, y * this.height]);
    this.clear();
    this.drawBackground();
    this.drawShadow(points);

    // Draw back arm first (left arm for front view)
    const ctx = this.ctx;
    if (points[1] && points[3]) {
      drawRoundedLimb(ctx, points[1], points[3], 16, SKIN_SHADOW);
    }
    if (points[3] && points[5]) {
      drawRoundedLimb(ctx, points[3], points[5], 14, SKIN_SHADOW);
      if (points[5]) {
        ctx.save();
        ctx.fillStyle = SKIN_SHADOW;
        ctx.beginPath();
        ctx.arc(points[5][0], points[5][1], 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // Legs (behind torso)
    this.drawLegs(points);
    this.drawShoes(points);

    // Torso
    this.drawTorso(points);

    // Front arm (right)
    if (points[2] && points[4]) {
      drawRoundedLimb(ctx, points[2], points[4], 16, SKIN);
    }
    if (points[4] && points[6]) {
      drawRoundedLimb(ctx, points[4], points[6], 14, SKIN);
      if (points[6]) {
        ctx.save();
        ctx.fillStyle = SKIN_SHADOW;
        ctx.beginPath();
        ctx.arc(points[6][0], points[6][1], 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // Head on top
    if (points[0] && points[13]) this.drawHead(points[0], points[13]);
  }

  tick(timestamp) {
    if (!this.playing) return;

    if (!this.lastTick) this.lastTick = timestamp;
    const delta = timestamp - this.lastTick;

    if (delta >= this.frameDuration) {
      const frameStep = (delta / this.frameDuration) * this.speed;
      this.currentFrame = (this.currentFrame + frameStep) % this.totalFrames;
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

  setSpeed(speed = 1) {
    this.speed = Math.max(0.1, Number(speed) || 1);
  }

  destroy() {
    this.pause();
    this.keyframes = [];
    this.clear();
  }
}

export { CONNECTIONS, easeInOut };

