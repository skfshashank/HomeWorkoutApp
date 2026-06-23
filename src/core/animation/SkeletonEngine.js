import { STANDING_FRONT } from './exerciseKeyframes.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

const CONNECTIONS = [
  [13, 0], [1, 13], [2, 13], [1, 3], [3, 5], [2, 4], [4, 6],
  [13, 14], [7, 14], [8, 14], [7, 9], [9, 11], [8, 10], [10, 12], [11, 15], [12, 16]
];

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const round = (value) => Number(value.toFixed(3));
const clonePose = (pose) => pose.map(([x, y]) => [round(x), round(y)]);
const lerp = (a, b, t) => a + (b - a) * t;
const lerpPt = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const ang = (a, b) => Math.atan2(b[1] - a[1], b[0] - a[0]);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const midpoint = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const avgPoint = (points) => {
  const valid = points.filter(Boolean);
  if (!valid.length) return [0, 0];
  const total = valid.reduce((acc, [x, y]) => [acc[0] + x, acc[1] + y], [0, 0]);
  return [total[0] / valid.length, total[1] / valid.length];
};
const radToDeg = (radians) => radians * (180 / Math.PI);

const BG = '#111827';
const SKIN = '#D4A574';
const SKIN_SHADOW = '#C49A6C';
const SKIN_HIGHLIGHT = '#E8C49A';
const SHIRT = '#3B82F6';
const SHIRT_SHADOW = '#2563EB';
const SHIRT_HIGHLIGHT = '#60A5FA';
const SHORTS = '#374151';
const SHORTS_SHADOW = '#1F2937';
const HAIR = '#292524';
const HAIR_HIGHLIGHT = '#44403C';
const SHOE = '#1F2937';
const SHOE_HIGHLIGHT = '#4B5563';

const BASE_LENGTHS = {
  neck: 18,
  upperArm: 60,
  forearm: 55,
  hand: 16,
  thigh: 70,
  calf: 65,
  foot: 25,
  torsoHeight: 100,
  torsoWidth: 62,
  shortsHeight: 40,
  head: 30
};

const PART_SHAPES = {
  torso: `
    <path fill="url(#shirt-gradient)" d="M0 0 C-11 2 -23 6 -31 12 C-35 29 -33 57 -23 84 C-20 92 -16 98 -12 100 L12 100 C16 98 20 92 23 84 C33 57 35 29 31 12 C23 6 11 2 0 0 Z" />
    <path fill="url(#shirt-shadow-gradient)" d="M31 12 C35 29 33 57 23 84 C20 92 16 98 12 100 L2 100 C9 82 12 57 10 34 C9 22 14 15 31 12 Z" opacity="0.95" />
    <path fill="url(#shirt-highlight-gradient)" d="M-20 18 C-10 11 2 9 12 12 C6 21 2 36 3 54 C-7 52 -16 44 -20 18 Z" opacity="0.72" />
    <path fill="${SHIRT_SHADOW}" d="M-10 11 C-6 6 6 6 10 11 C8 15 -8 15 -10 11 Z" opacity="0.9" />
  `,
  neck: `
    <path fill="url(#skin-gradient)" d="M0 0 C3 -4 13 -4 18 0 C13 4 3 4 0 0 Z" />
    <path fill="url(#skin-highlight-gradient)" d="M2 -1 C6 -3 11 -3 15 -1 C11 1 6 2 2 -1 Z" opacity="0.6" />
  `,
  upperArm: `
    <path fill="url(#skin-gradient)" d="M0 0 C3 -7 18 -9 35 -8 C49 -7 58 -4 60 0 C58 4 49 7 35 8 C18 9 3 7 0 0 Z" />
    <path fill="url(#skin-highlight-gradient)" d="M5 -3 C17 -6 34 -6 50 -2 C34 1 18 2 5 -3 Z" opacity="0.52" />
  `,
  forearm: `
    <path fill="url(#skin-gradient)" d="M0 0 C3 -6 16 -7 31 -6 C44 -5 53 -2 55 0 C53 2 44 5 31 6 C16 7 3 6 0 0 Z" />
    <path fill="url(#skin-highlight-gradient)" d="M4 -2 C14 -5 27 -5 42 -2 C29 0 16 1 4 -2 Z" opacity="0.5" />
  `,
  hand: `
    <path fill="url(#skin-gradient)" d="M0 0 C4 -4 10 -5 14 -2 C16 0 15 3 11 5 C7 7 2 5 0 0 Z" />
    <path fill="url(#skin-highlight-gradient)" d="M3 -1 C6 -3 10 -2 12 0 C9 2 6 2 3 -1 Z" opacity="0.45" />
  `,
  thigh: `
    <path fill="url(#skin-gradient)" d="M0 0 C3 -9 19 -11 39 -10 C55 -9 67 -5 70 0 C67 5 55 9 39 10 C19 11 3 9 0 0 Z" />
    <path fill="url(#skin-highlight-gradient)" d="M6 -4 C20 -8 40 -7 57 -3 C41 0 23 1 6 -4 Z" opacity="0.5" />
  `,
  calf: `
    <path fill="url(#skin-gradient)" d="M0 0 C3 -7 16 -8 34 -7 C48 -6 61 -3 65 0 C61 3 48 6 34 7 C16 8 3 7 0 0 Z" />
    <path fill="url(#skin-highlight-gradient)" d="M5 -3 C17 -6 33 -6 50 -2 C36 0 20 1 5 -3 Z" opacity="0.48" />
  `,
  foot: `
    <path fill="url(#shoe-gradient)" d="M0 0 C6 -4 17 -4 24 -1 C26 0 26 3 22 6 C16 9 6 9 0 5 Z" />
    <path fill="${SHOE_HIGHLIGHT}" d="M8 3 C14 1 20 1 24 3 C21 6 13 7 8 3 Z" opacity="0.42" />
    <path fill="#9CA3AF" d="M1 4 C7 7 16 7 22 4 C20 7 12 9 3 7 Z" opacity="0.5" />
  `,
  shorts: `
    <path fill="url(#shorts-gradient)" d="M-25 -8 C-13 -14 13 -14 25 -8 L29 8 C25 19 20 29 15 36 L4 28 L0 16 L-4 28 L-15 36 C-20 29 -25 19 -29 8 Z" />
    <path fill="url(#shorts-shadow-gradient)" d="M7 -11 C16 -11 24 -10 25 -8 L29 8 C26 18 22 28 15 36 L4 28 C9 15 10 1 7 -11 Z" opacity="0.96" />
  `,
  head: `
    <path fill="url(#hair-gradient)" d="M-15 -6 C-14 -15 -6 -20 2 -19 C11 -18 18 -11 18 -1 C18 4 16 9 12 13 C8 6 1 2 -8 3 C-11 1 -15 -1 -15 -6 Z" />
    <path fill="url(#skin-gradient)" d="M0 -15 C10 -15 15 -8 15 1 C15 10 9 16 0 16 C-10 16 -15 10 -15 1 C-15 -8 -10 -15 0 -15 Z" />
    <path fill="url(#skin-highlight-gradient)" d="M-9 -5 C-4 -10 4 -10 9 -7 C5 -2 -1 1 -8 0 Z" opacity="0.62" />
    <path fill="url(#hair-gradient)" d="M-13 -6 C-10 -15 0 -18 10 -15 C13 -14 15 -11 15 -6 C11 -8 7 -9 2 -9 C-4 -9 -9 -8 -13 -6 Z" />
    <path fill="${HAIR_HIGHLIGHT}" d="M1 -15 C6 -15 10 -13 12 -10 C8 -11 4 -12 0 -12 Z" opacity="0.45" />
  `
};

function createSvg(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (value !== undefined && value !== null) node.setAttribute(key, String(value));
  });
  return node;
}

function setTransform(node, transform) {
  if (!node) return;
  node.setAttribute('transform', transform);
  node.style.willChange = 'transform';
}

function show(node, visible) {
  if (!node) return;
  node.style.display = visible ? 'inline' : 'none';
}

export class SkeletonEngine {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = null;
    this.width = options.width || Number(canvas?.getAttribute('width')) || canvas?.width || 400;
    this.height = options.height || Number(canvas?.getAttribute('height')) || canvas?.height || 400;
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
    if (this.canvas) {
      this.canvas.width = this.width;
      this.canvas.height = this.height;
    }

    this.svg = createSvg('svg', {
      viewBox: `0 0 ${this.width} ${this.height}`,
      width: this.width,
      height: this.height,
      preserveAspectRatio: 'xMidYMid meet',
      role: 'img',
      'aria-label': canvas?.getAttribute('aria-label') || 'Exercise animation'
    });
    this.svg.style.width = '100%';
    this.svg.style.height = '100%';
    this.svg.style.display = 'block';
    this.svg.style.overflow = 'visible';
    this.svg.dataset.renderer = 'svg-puppet';

    if (canvas?.id) this.svg.id = canvas.id;
    if (canvas?.className) this.svg.setAttribute('class', canvas.className);
    if (canvas?.style?.cssText) this.svg.style.cssText += `;${canvas.style.cssText}`;

    this.createScene();

    if (canvas?.parentNode) {
      canvas.parentNode.replaceChild(this.svg, canvas);
    }
  }

  createScene() {
    this.svg.innerHTML = '';
    this.defs = createSvg('defs');
    this.defs.innerHTML = `
      <linearGradient id="skin-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${SKIN_HIGHLIGHT}" />
        <stop offset="45%" stop-color="${SKIN}" />
        <stop offset="100%" stop-color="${SKIN_SHADOW}" />
      </linearGradient>
      <linearGradient id="skin-highlight-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${SKIN_HIGHLIGHT}" stop-opacity="0.92" />
        <stop offset="100%" stop-color="${SKIN_HIGHLIGHT}" stop-opacity="0" />
      </linearGradient>
      <linearGradient id="shirt-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${SHIRT_HIGHLIGHT}" />
        <stop offset="48%" stop-color="${SHIRT}" />
        <stop offset="100%" stop-color="${SHIRT_SHADOW}" />
      </linearGradient>
      <linearGradient id="shirt-shadow-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="${SHIRT_SHADOW}" />
        <stop offset="100%" stop-color="#1D4ED8" />
      </linearGradient>
      <linearGradient id="shirt-highlight-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${SHIRT_HIGHLIGHT}" stop-opacity="0.9" />
        <stop offset="100%" stop-color="${SHIRT_HIGHLIGHT}" stop-opacity="0" />
      </linearGradient>
      <linearGradient id="shorts-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#4B5563" />
        <stop offset="45%" stop-color="${SHORTS}" />
        <stop offset="100%" stop-color="${SHORTS_SHADOW}" />
      </linearGradient>
      <linearGradient id="shorts-shadow-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="${SHORTS_SHADOW}" />
        <stop offset="100%" stop-color="#111827" />
      </linearGradient>
      <linearGradient id="hair-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${HAIR_HIGHLIGHT}" />
        <stop offset="45%" stop-color="${HAIR}" />
        <stop offset="100%" stop-color="#1C1917" />
      </linearGradient>
      <linearGradient id="shoe-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${SHOE_HIGHLIGHT}" />
        <stop offset="45%" stop-color="${SHOE}" />
        <stop offset="100%" stop-color="#030712" />
      </linearGradient>
      <radialGradient id="shadow-gradient" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#000000" stop-opacity="0.32" />
        <stop offset="100%" stop-color="#000000" stop-opacity="0" />
      </radialGradient>
    `;

    this.background = createSvg('rect', {
      x: 0,
      y: 0,
      width: this.width,
      height: this.height,
      fill: BG
    });

    this.shadow = createSvg('ellipse', {
      cx: this.width * 0.5,
      cy: this.height * 0.94,
      rx: 42,
      ry: 8,
      fill: 'url(#shadow-gradient)'
    });
    this.shadow.style.willChange = 'transform';

    this.figure = createSvg('g', { 'shape-rendering': 'geometricPrecision' });
    this.figure.style.willChange = 'transform';

    this.parts = {};
    this.createBodyParts();

    this.svg.append(this.defs, this.background, this.shadow, this.figure);
    this.clear();
  }

  createBodyParts() {
    this.layers = {
      backLeg: createSvg('g', { opacity: 0.78 }),
      backArm: createSvg('g', { opacity: 0.82 }),
      torso: createSvg('g'),
      shorts: createSvg('g'),
      frontLeg: createSvg('g'),
      frontArm: createSvg('g'),
      head: createSvg('g')
    };

    Object.values(this.layers).forEach((layer) => {
      layer.style.willChange = 'transform';
      this.figure.appendChild(layer);
    });

    const createPart = (key, parent, markup) => {
      const part = createSvg('g');
      part.innerHTML = markup;
      part.style.willChange = 'transform';
      parent.appendChild(part);
      this.parts[key] = part;
      return part;
    };

    createPart('backThigh', this.layers.backLeg, PART_SHAPES.thigh);
    createPart('backCalf', this.layers.backLeg, PART_SHAPES.calf);
    createPart('backFoot', this.layers.backLeg, PART_SHAPES.foot);
    createPart('backUpperArm', this.layers.backArm, PART_SHAPES.upperArm);
    createPart('backForearm', this.layers.backArm, PART_SHAPES.forearm);
    createPart('backHand', this.layers.backArm, PART_SHAPES.hand);
    createPart('torso', this.layers.torso, PART_SHAPES.torso);
    createPart('neck', this.layers.torso, PART_SHAPES.neck);
    createPart('shorts', this.layers.shorts, PART_SHAPES.shorts);
    createPart('frontThigh', this.layers.frontLeg, PART_SHAPES.thigh);
    createPart('frontCalf', this.layers.frontLeg, PART_SHAPES.calf);
    createPart('frontFoot', this.layers.frontLeg, PART_SHAPES.foot);
    createPart('frontUpperArm', this.layers.frontArm, PART_SHAPES.upperArm);
    createPart('frontForearm', this.layers.frontArm, PART_SHAPES.forearm);
    createPart('frontHand', this.layers.frontArm, PART_SHAPES.hand);
    createPart('head', this.layers.head, PART_SHAPES.head);
  }

  loadExercise(keyframes = []) {
    this.keyframes = [...keyframes]
      .map((frame) => ({ frame: Number(frame.frame || 0), pose: clonePose(frame.pose || STANDING_FRONT) }))
      .sort((a, b) => a.frame - b.frame);
    this.currentFrame = 0;
    this.prevPose = null;
    this.drawFrame(this.interpolate(0));
  }

  interpolate(frame) {
    if (!this.keyframes.length) return clonePose(STANDING_FRONT);
    if (this.keyframes.length === 1) return clonePose(this.keyframes[0].pose);

    const wrapped = ((frame % this.totalFrames) + this.totalFrames) % this.totalFrames;
    const keyframes = this.keyframes.map((entry) => ({
      frame: entry.frame >= this.totalFrames ? this.totalFrames : entry.frame,
      pose: entry.pose
    }));

    let previous = keyframes[0];
    let next = keyframes[keyframes.length - 1];

    for (let index = 0; index < keyframes.length; index += 1) {
      if (keyframes[index].frame <= wrapped) previous = keyframes[index];
      if (keyframes[index].frame >= wrapped) {
        next = keyframes[index];
        break;
      }
    }

    if (next.frame < previous.frame || wrapped > keyframes[keyframes.length - 1].frame) {
      next = { frame: keyframes[0].frame + this.totalFrames, pose: keyframes[0].pose };
    }

    const localFrame = wrapped < previous.frame ? wrapped + this.totalFrames : wrapped;
    const span = Math.max(next.frame - previous.frame, 1);
    const t = easeInOut((localFrame - previous.frame) / span);

    return previous.pose.map(([px, py], index) => {
      const [nx, ny] = next.pose[index] || [px, py];
      return [round(px + (nx - px) * t), round(py + (ny - py) * t)];
    });
  }

  clear() {
    Object.values(this.parts || {}).forEach((part) => show(part, false));
    if (this.shadow) this.shadow.setAttribute('opacity', '0');
  }

  pointToPixels(point) {
    return [point[0] * this.width, point[1] * this.height];
  }

  updateSegment(partKey, start, end, baseLength, options = {}) {
    const part = this.parts[partKey];
    if (!part || !start || !end) return show(part, false);

    const length = Math.max(dist(start, end), 2);
    const rotation = radToDeg(ang(start, end)) + (options.rotationOffset || 0);
    const scale = clamp((length / baseLength) * (options.scaleMultiplier || 1), options.minScale || 0.5, options.maxScale || 2.3);
    const scaleX = clamp(scale * (options.widthMultiplier || 1), options.minScaleX || 0.5, options.maxScaleX || 2.4);
    const scaleY = clamp(scale * (options.heightMultiplier || 1), options.minScaleY || 0.5, options.maxScaleY || 2.4);
    const offsetX = options.offsetX || 0;
    const offsetY = options.offsetY || 0;

    show(part, true);
    setTransform(
      part,
      `translate(${round(start[0] + offsetX)} ${round(start[1] + offsetY)}) rotate(${round(rotation)}) scale(${round(scaleX)} ${round(scaleY)})`
    );
  }

  updateTorso(neck, pelvis, leftShoulder, rightShoulder, leftHip, rightHip) {
    const torso = this.parts.torso;
    if (!torso || !neck || !pelvis || !leftShoulder || !rightShoulder || !leftHip || !rightHip) return show(torso, false);

    const torsoLength = Math.max(dist(neck, pelvis), 10);
    const shoulderSpan = Math.max(dist(leftShoulder, rightShoulder), 18);
    const hipSpan = Math.max(dist(leftHip, rightHip), 14);
    const widthScale = clamp(((shoulderSpan * 0.72) + (hipSpan * 0.28)) / BASE_LENGTHS.torsoWidth, 0.75, 1.45);
    const heightScale = clamp(torsoLength / BASE_LENGTHS.torsoHeight, 0.6, 1.9);
    const rotation = radToDeg(ang(neck, pelvis)) - 90;

    show(torso, true);
    setTransform(
      torso,
      `translate(${round(neck[0])} ${round(neck[1])}) rotate(${round(rotation)}) scale(${round(widthScale)} ${round(heightScale)})`
    );
  }

  updateShorts(pelvis, neck, leftHip, rightHip, backLeg, frontLeg) {
    const shorts = this.parts.shorts;
    if (!shorts || !pelvis || !neck || !leftHip || !rightHip) return show(shorts, false);

    const hipSpan = Math.max(dist(leftHip, rightHip), 16);
    const averageThigh = avgPoint([
      backLeg?.hip && backLeg?.knee ? [dist(backLeg.hip, backLeg.knee), 0] : null,
      frontLeg?.hip && frontLeg?.knee ? [dist(frontLeg.hip, frontLeg.knee), 0] : null
    ]);
    const legDepth = averageThigh[0] || Math.max(dist(neck, pelvis) * 0.55, 20);
    const rotation = radToDeg(ang(neck, pelvis)) - 90;
    const scaleX = clamp(hipSpan / 56, 0.78, 1.4);
    const scaleY = clamp(legDepth / BASE_LENGTHS.shortsHeight, 0.72, 1.35);
    const shortsTop = lerpPt(neck, pelvis, 0.92);

    show(shorts, true);
    setTransform(
      shorts,
      `translate(${round(shortsTop[0])} ${round(shortsTop[1])}) rotate(${round(rotation)}) scale(${round(scaleX)} ${round(scaleY)})`
    );
  }

  updateHead(nose, neck, shoulders) {
    const head = this.parts.head;
    if (!head || !nose) return show(head, false);

    const neckPoint = neck || [nose[0], nose[1] + BASE_LENGTHS.head];
    const shoulderSpan = shoulders?.length ? Math.max(dist(shoulders[0], shoulders[1]), 22) : 44;
    const headScale = clamp((shoulderSpan * 0.42) / BASE_LENGTHS.head, 0.85, 1.45);
    const rotation = radToDeg(ang(neckPoint, nose)) + 90;

    show(head, true);
    setTransform(
      head,
      `translate(${round(nose[0])} ${round(nose[1])}) rotate(${round(rotation)}) scale(${round(headScale)} ${round(headScale)})`
    );
  }

  updateShadow(points) {
    const groundPoints = points.filter(Boolean);
    if (!groundPoints.length) {
      this.shadow.setAttribute('opacity', '0');
      return;
    }

    const center = avgPoint(groundPoints);
    const xs = groundPoints.map(([x]) => x);
    const width = clamp((Math.max(...xs) - Math.min(...xs)) * 0.55, 28, 62);
    this.shadow.setAttribute('opacity', '1');
    this.shadow.setAttribute('cx', round(center[0]));
    this.shadow.setAttribute('rx', round(width));
    this.shadow.setAttribute('transform', `translate(0 ${round((Math.max(...groundPoints.map(([, y]) => y)) - this.height * 0.9) * 0.18)})`);
  }

  updatePose(pose) {
    const nose = pose[0];
    const leftShoulder = pose[1];
    const rightShoulder = pose[2];
    const leftElbow = pose[3];
    const rightElbow = pose[4];
    const leftWrist = pose[5];
    const rightWrist = pose[6];
    const leftHip = pose[7];
    const rightHip = pose[8];
    const leftKnee = pose[9];
    const rightKnee = pose[10];
    const leftAnkle = pose[11];
    const rightAnkle = pose[12];
    const neck = pose[13];
    const pelvis = pose[14];
    const leftFootTip = pose[15];
    const rightFootTip = pose[16];

    const leftDepth = (leftShoulder?.[0] || 0) + (leftHip?.[0] || 0);
    const rightDepth = (rightShoulder?.[0] || 0) + (rightHip?.[0] || 0);
    const leftIsBack = leftDepth <= rightDepth;

    const backArm = leftIsBack
      ? { shoulder: leftShoulder, elbow: leftElbow, wrist: leftWrist }
      : { shoulder: rightShoulder, elbow: rightElbow, wrist: rightWrist };
    const frontArm = leftIsBack
      ? { shoulder: rightShoulder, elbow: rightElbow, wrist: rightWrist }
      : { shoulder: leftShoulder, elbow: leftElbow, wrist: leftWrist };
    const backLeg = leftIsBack
      ? { hip: leftHip, knee: leftKnee, ankle: leftAnkle, foot: leftFootTip }
      : { hip: rightHip, knee: rightKnee, ankle: rightAnkle, foot: rightFootTip };
    const frontLeg = leftIsBack
      ? { hip: rightHip, knee: rightKnee, ankle: rightAnkle, foot: rightFootTip }
      : { hip: leftHip, knee: leftKnee, ankle: leftAnkle, foot: leftFootTip };

    this.updateSegment('backThigh', backLeg.hip, backLeg.knee, BASE_LENGTHS.thigh, {
      minScale: 0.55,
      maxScale: 2.2,
      widthMultiplier: 1.05
    });
    this.updateSegment('backCalf', backLeg.knee, backLeg.ankle, BASE_LENGTHS.calf, {
      minScale: 0.52,
      maxScale: 2.2,
      widthMultiplier: 0.98
    });
    this.updateSegment('backFoot', backLeg.ankle, backLeg.foot || lerpPt(backLeg.ankle || [0, 0], backLeg.knee || [0, 0], -0.25), BASE_LENGTHS.foot, {
      minScale: 0.8,
      maxScale: 1.55,
      widthMultiplier: 1,
      heightMultiplier: 1
    });

    this.updateSegment('backUpperArm', backArm.shoulder, backArm.elbow, BASE_LENGTHS.upperArm, {
      minScale: 0.55,
      maxScale: 1.85,
      widthMultiplier: 1.02
    });
    this.updateSegment('backForearm', backArm.elbow, backArm.wrist, BASE_LENGTHS.forearm, {
      minScale: 0.55,
      maxScale: 1.85,
      widthMultiplier: 0.95
    });
    this.updateSegment('backHand', backArm.wrist, backArm.wrist && backArm.elbow ? lerpPt(backArm.elbow, backArm.wrist, 1.25) : null, BASE_LENGTHS.hand, {
      minScale: 0.9,
      maxScale: 1.35
    });

    this.updateTorso(neck, pelvis, leftShoulder, rightShoulder, leftHip, rightHip);
    this.updateSegment('neck', neck, nose ? lerpPt(neck || [0, 0], nose, 0.42) : null, BASE_LENGTHS.neck, {
      minScale: 0.7,
      maxScale: 1.25,
      widthMultiplier: 1,
      heightMultiplier: 1
    });
    this.updateShorts(pelvis, neck, leftHip, rightHip, backLeg, frontLeg);

    this.updateSegment('frontThigh', frontLeg.hip, frontLeg.knee, BASE_LENGTHS.thigh, {
      minScale: 0.55,
      maxScale: 2.2,
      widthMultiplier: 1.05
    });
    this.updateSegment('frontCalf', frontLeg.knee, frontLeg.ankle, BASE_LENGTHS.calf, {
      minScale: 0.52,
      maxScale: 2.2,
      widthMultiplier: 0.98
    });
    this.updateSegment('frontFoot', frontLeg.ankle, frontLeg.foot || lerpPt(frontLeg.ankle || [0, 0], frontLeg.knee || [0, 0], -0.25), BASE_LENGTHS.foot, {
      minScale: 0.8,
      maxScale: 1.55
    });

    this.updateSegment('frontUpperArm', frontArm.shoulder, frontArm.elbow, BASE_LENGTHS.upperArm, {
      minScale: 0.55,
      maxScale: 1.85,
      widthMultiplier: 1.02
    });
    this.updateSegment('frontForearm', frontArm.elbow, frontArm.wrist, BASE_LENGTHS.forearm, {
      minScale: 0.55,
      maxScale: 1.85,
      widthMultiplier: 0.95
    });
    this.updateSegment('frontHand', frontArm.wrist, frontArm.wrist && frontArm.elbow ? lerpPt(frontArm.elbow, frontArm.wrist, 1.25) : null, BASE_LENGTHS.hand, {
      minScale: 0.9,
      maxScale: 1.35
    });

    this.updateHead(nose, neck, [leftShoulder, rightShoulder]);
    this.updateShadow([leftFootTip, rightFootTip, leftAnkle, rightAnkle].filter(Boolean));
  }

  drawFrame(pose) {
    const pixelPose = pose.map((point) => this.pointToPixels(point));
    this.updatePose(pixelPose);
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

  setSpeed(speed = 1) {
    this.speed = Math.max(0.1, Number(speed) || 1);
  }

  destroy() {
    this.pause();
    this.keyframes = [];
    this.prevPose = null;
    this.clear();
  }
}

export { CONNECTIONS, easeInOut };
