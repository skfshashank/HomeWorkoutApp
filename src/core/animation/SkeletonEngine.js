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

const TORSO_CONNECTIONS = new Set(['13-14', '1-13', '2-13', '7-14', '8-14']);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const round = (value) => Number(value.toFixed(3));
const clonePose = (pose) => pose.map(([x, y]) => [round(x), round(y)]);

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
    gradient.addColorStop(0, '#0f172a');
    gradient.addColorStop(1, '#1a1a2e');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);

    const glow = this.ctx.createRadialGradient(this.width / 2, this.height * 0.2, 20, this.width / 2, this.height * 0.2, this.width * 0.6);
    glow.addColorStop(0, 'rgba(20,184,166,0.18)');
    glow.addColorStop(1, 'rgba(20,184,166,0)');
    this.ctx.fillStyle = glow;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  drawFloor(points) {
    const leftFoot = points[15] || points[11];
    const rightFoot = points[16] || points[12];
    const centerX = ((leftFoot?.[0] || this.width * 0.45) + (rightFoot?.[0] || this.width * 0.55)) / 2;
    const shadowY = this.height * 0.92;

    this.ctx.save();
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    this.ctx.shadowBlur = 20;
    this.ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
    this.ctx.beginPath();
    this.ctx.ellipse(centerX, shadowY, this.width * 0.18, this.height * 0.03, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();

    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(100, 116, 139, 0.55)';
    this.ctx.lineWidth = 2;
    this.ctx.shadowColor = 'rgba(20, 184, 166, 0.18)';
    this.ctx.shadowBlur = 12;
    this.ctx.beginPath();
    this.ctx.moveTo(this.width * 0.08, shadowY);
    this.ctx.lineTo(this.width * 0.92, shadowY);
    this.ctx.stroke();
    this.ctx.restore();
  }

  drawSegment(start, end, width, alpha = 1) {
    const gradient = this.ctx.createLinearGradient(start[0], start[1], end[0], end[1]);
    gradient.addColorStop(0, `rgba(20, 184, 166, ${alpha})`);
    gradient.addColorStop(1, `rgba(13, 148, 136, ${alpha})`);
    this.ctx.save();
    this.ctx.strokeStyle = gradient;
    this.ctx.lineWidth = width;
    this.ctx.lineCap = 'round';
    this.ctx.shadowColor = 'rgba(45, 212, 191, 0.28)';
    this.ctx.shadowBlur = 10;
    this.ctx.beginPath();
    this.ctx.moveTo(start[0], start[1]);
    this.ctx.lineTo(end[0], end[1]);
    this.ctx.stroke();
    this.ctx.restore();
  }

  drawJoint(point, radius = 4) {
    this.ctx.save();
    this.ctx.fillStyle = '#99f6e4';
    this.ctx.shadowColor = 'rgba(153, 246, 228, 0.4)';
    this.ctx.shadowBlur = 8;
    this.ctx.beginPath();
    this.ctx.arc(point[0], point[1], radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  drawHead(nose, neck) {
    const headRadius = Math.max(12, Math.min(20, Math.hypot(nose[0] - neck[0], nose[1] - neck[1]) * 1.3));
    const gradient = this.ctx.createRadialGradient(nose[0] - 4, nose[1] - 6, 3, nose[0], nose[1], headRadius);
    gradient.addColorStop(0, '#5eead4');
    gradient.addColorStop(1, '#0d9488');
    this.ctx.save();
    this.ctx.fillStyle = gradient;
    this.ctx.shadowColor = 'rgba(45, 212, 191, 0.32)';
    this.ctx.shadowBlur = 16;
    this.ctx.beginPath();
    this.ctx.arc(nose[0], nose[1], headRadius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  drawFrame(pose) {
    const points = pose.map(([x, y]) => [x * this.width, y * this.height]);
    this.clear();
    this.drawBackground();
    this.drawFloor(points);

    CONNECTIONS.forEach(([startIndex, endIndex]) => {
      const start = points[startIndex];
      const end = points[endIndex];
      if (!start || !end) return;
      const key = `${startIndex}-${endIndex}`;
      this.drawSegment(start, end, TORSO_CONNECTIONS.has(key) ? 12 : 8);
    });

    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].forEach((index) => {
      if (points[index]) this.drawJoint(points[index], index === 13 || index === 14 ? 5 : 4);
    });

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

