import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { EXERCISE_KEYFRAMES } from '../src/core/animation/exerciseKeyframes.js';

const FRAME_RATE = 30;
const TOTAL_FRAMES = 60;
const CANVAS = 400;
const HALF = CANVAS / 2;
const EASE_IN = { x: 0.5, y: 1 };
const EASE_OUT = { x: 0.5, y: 0 };

const COLORS = {
  skin: [0.83, 0.65, 0.45, 1],
  skinShadow: [0.77, 0.6, 0.42, 1],
  shirt: [0.23, 0.51, 0.96, 1],
  shirtDark: [0.15, 0.39, 0.92, 1],
  shorts: [0.22, 0.26, 0.32, 1],
  hair: [0.16, 0.15, 0.14, 1],
  shoes: [0.12, 0.16, 0.22, 1],
  shadow: [0.02, 0.03, 0.05, 1]
};

const SEGMENT_LENGTHS = {
  upperArm: 55,
  forearm: 50,
  hand: 10,
  thigh: 65,
  calf: 60,
  foot: 22,
  torso: 95,
  shorts: 35,
  head: 30
};
const MAX_SOURCE_KEYFRAMES = 4;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', 'animations');

const round = (value, digits = 0) => Number(value.toFixed(digits));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerpPoint = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const avgPoint = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const angleDeg = (a, b) => round((Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI);
const toPx = ([x, y]) => [Math.round(x * CANVAS), Math.round(y * CANVAS)];
const withAlpha = (rgba, alpha) => [rgba[0], rgba[1], rgba[2], alpha];
const normalizeAngle = (value) => {
  let angle = value;
  while (angle > 180) angle -= 360;
  while (angle < -180) angle += 360;
  return angle;
};

const shapeTransform = () => ({
  ty: 'tr',
  p: { a: 0, k: [0, 0] },
  a: { a: 0, k: [0, 0] },
  s: { a: 0, k: [100, 100] },
  r: { a: 0, k: 0 },
  o: { a: 0, k: 100 }
});

function makePath(vertices, inTangents, outTangents, closed = true) {
  return {
    ty: 'sh',
    ks: {
      a: 0,
      k: {
        i: inTangents,
        o: outTangents,
        v: vertices,
        c: closed
      }
    }
  };
}

function fill(color, opacity = 100) {
  return {
    ty: 'fl',
    c: { a: 0, k: color },
    o: { a: 0, k: opacity }
  };
}

function ellipse(size, position = [0, 0]) {
  return {
    ty: 'el',
    p: { a: 0, k: position },
    s: { a: 0, k: size }
  };
}

function group(name, items) {
  return { ty: 'gr', it: [...items, shapeTransform()] };
}

function basicKeyframe(t, s) {
  return { t, s, i: EASE_IN, o: EASE_OUT };
}

function animatedProp(values) {
  const keyframes = values.map((value) => basicKeyframe(value.t, value.s));
  const last = keyframes[keyframes.length - 1];
  last.h = 1;
  return { a: 1, k: keyframes };
}

function staticProp(value) {
  return { a: 0, k: value };
}

function propFromFrames(frames, key) {
  const values = frames.map((frame) => ({ t: frame.frame, s: frame[key] }));
  const first = JSON.stringify(values[0]?.s);
  const allSame = values.every((value) => JSON.stringify(value.s) === first);
  return allSame ? staticProp(values[0].s) : animatedProp(values);
}

function segmentFrames(keyframes, startIndex, endIndex, baseLength, scaleY = 100) {
  return keyframes.map(({ frame, pose }) => {
    const start = toPx(pose[startIndex]);
    const end = toPx(pose[endIndex]);
    const length = Math.max(6, dist(start, end));

    return {
      frame,
      position: [start[0], start[1], 0],
      rotation: [angleDeg(start, end)],
      scale: [round((length / baseLength) * 100), scaleY, 100]
    };
  });
}

function childSegmentFrames(keyframes, startIndex, endIndex, parentStartIndex, parentEndIndex, baseLength, attachX, scaleY = 100) {
  return keyframes.map(({ frame, pose }) => {
    const start = toPx(pose[startIndex]);
    const end = toPx(pose[endIndex]);
    const parentStart = toPx(pose[parentStartIndex]);
    const parentEnd = toPx(pose[parentEndIndex]);
    const length = Math.max(6, dist(start, end));
    const childAngle = angleDeg(start, end);
    const parentAngle = angleDeg(parentStart, parentEnd);

    return {
      frame,
      position: [attachX, 0, 0],
      rotation: [normalizeAngle(childAngle - parentAngle)],
      scale: [round((length / baseLength) * 100), scaleY, 100]
    };
  });
}

function childPointFrames(keyframes, attachX) {
  return keyframes.map(({ frame }) => ({
    frame,
    position: [attachX, 0, 0],
    rotation: [0],
    scale: [100, 100, 100]
  }));
}

function footFrames(keyframes, ankleIndex, footIndex, parentStartIndex, parentEndIndex) {
  return keyframes.map(({ frame, pose }) => {
    const ankle = toPx(pose[ankleIndex]);
    const foot = toPx(pose[footIndex]);
    const parentStart = toPx(pose[parentStartIndex]);
    const parentEnd = toPx(pose[parentEndIndex]);
    const footAngle = angleDeg(ankle, foot);
    const parentAngle = angleDeg(parentStart, parentEnd);
    const footLength = Math.max(10, dist(ankle, foot));

    return {
      frame,
      position: [SEGMENT_LENGTHS.calf, 0, 0],
      rotation: [normalizeAngle(footAngle - parentAngle)],
      scale: [round((footLength / SEGMENT_LENGTHS.foot) * 100), 100, 100]
    };
  });
}

function torsoFrames(keyframes) {
  return keyframes.map(({ frame, pose }) => {
    const neck = toPx(pose[13]);
    const pelvis = toPx(pose[14]);
    const leftShoulder = toPx(pose[1]);
    const rightShoulder = toPx(pose[2]);
    const leftHip = toPx(pose[7]);
    const rightHip = toPx(pose[8]);
    const bodyLength = Math.max(40, dist(neck, pelvis));
    const shoulderWidth = Math.max(28, dist(leftShoulder, rightShoulder));
    const hipWidth = Math.max(24, dist(leftHip, rightHip));
    const widthScale = round((((shoulderWidth / 60) + (hipWidth / 50)) / 2) * 100);

    return {
      frame,
      position: [neck[0], neck[1], 0],
      rotation: [round(angleDeg(neck, pelvis) - 90)],
      scale: [widthScale, round((bodyLength / SEGMENT_LENGTHS.torso) * 100), 100]
    };
  });
}

function shortsFrames(keyframes) {
  return keyframes.map(({ frame, pose }) => {
    const neck = toPx(pose[13]);
    const pelvis = toPx(pose[14]);
    const leftHip = toPx(pose[7]);
    const rightHip = toPx(pose[8]);
    const hipWidth = Math.max(24, dist(leftHip, rightHip));
    const bodyLength = Math.max(40, dist(neck, pelvis));
    const shortsTop = lerpPoint(neck, pelvis, 0.68);

    return {
      frame,
      position: [Math.round(shortsTop[0]), Math.round(shortsTop[1]), 0],
      rotation: [round(angleDeg(neck, pelvis) - 90)],
      scale: [round((hipWidth / 50) * 100), round((bodyLength / SEGMENT_LENGTHS.torso) * 100), 100]
    };
  });
}

function headFrames(keyframes) {
  return keyframes.map(({ frame, pose }) => {
    const nose = toPx(pose[0]);
    const neck = toPx(pose[13]);
    const leftShoulder = toPx(pose[1]);
    const rightShoulder = toPx(pose[2]);
    const shoulderWidth = Math.max(30, dist(leftShoulder, rightShoulder));
    const faceLength = Math.max(16, dist(nose, neck));
    const scale = clamp((((faceLength / SEGMENT_LENGTHS.head) + (shoulderWidth / 72)) / 2) * 100, 75, 135);

    return {
      frame,
      position: [neck[0], neck[1], 0],
      rotation: [round(angleDeg(neck, nose) + 90)],
      scale: [round(scale), round(scale), 100]
    };
  });
}

function shadowFrames(keyframes) {
  return keyframes.map(({ frame, pose }) => {
    const leftFoot = toPx(pose[15]);
    const rightFoot = toPx(pose[16]);
    const pelvis = toPx(pose[14]);
    const center = avgPoint(leftFoot, rightFoot);
    const footSpread = Math.max(36, dist(leftFoot, rightFoot));
    const pelvisHeight = clamp((pelvis[1] - 180) / 160, 0.72, 1.12);

    return {
      frame,
      position: [Math.round(center[0]), Math.round(Math.min(CANVAS - 30, center[1] + 18)), 0],
      rotation: [0],
      scale: [round((footSpread / 120) * 100), round(pelvisHeight * 100), 100]
    };
  });
}

function buildAnimatedLayer(nm, shapes, frames, { opacity = 100, ind, parent } = {}) {
  const layer = {
    ty: 4,
    nm,
    ks: {
      o: staticProp(opacity),
      r: propFromFrames(frames, 'rotation'),
      p: propFromFrames(frames, 'position'),
      a: staticProp([0, 0, 0]),
      s: propFromFrames(frames, 'scale')
    },
    shapes,
    ip: 0,
    op: TOTAL_FRAMES,
    st: 0,
    bm: 0
  };

  if (typeof ind === 'number') layer.ind = ind;
  if (typeof parent === 'number') layer.parent = parent;

  return layer;
}

function makeUpperArmShape(color) {
  return [
    group('upper-arm', [
      makePath(
        [[0, -7], [18, -6], [36, -5.6], [55, -5], [55, 5], [36, 5.6], [18, 6], [0, 7]],
        [[0, 0], [-3, 0], [-3, 0], [0, -1.6], [0, 0], [3, 0], [3, 0], [0, 1.6]],
        [[3, 0], [3, 0], [3, 0], [0, 1.6], [0, 0], [-3, 0], [-3, 0], [0, -1.6]]
      ),
      fill(color)
    ])
  ];
}

function makeForearmShape(color) {
  return [
    group('forearm', [
      makePath(
        [[0, -5], [18, -4.5], [34, -4.1], [50, -3.5], [50, 3.5], [34, 4.1], [18, 4.5], [0, 5]],
        [[0, 0], [-2, 0], [-2, 0], [0, -1.2], [0, 0], [2, 0], [2, 0], [0, 1.2]],
        [[2, 0], [2, 0], [2, 0], [0, 1.2], [0, 0], [-2, 0], [-2, 0], [0, -1.2]]
      ),
      fill(color)
    ])
  ];
}

function makeHandShape(color) {
  return [
    group('hand', [
      ellipse([10, 10], [4, 0]),
      fill(color)
    ])
  ];
}

function makeThighShape(color) {
  return [
    group('thigh', [
      makePath(
        [[0, -9], [20, -8], [42, -7.4], [65, -6.5], [65, 6.5], [42, 7.4], [20, 8], [0, 9]],
        [[0, 0], [-3, 0], [-3, 0], [0, -1.8], [0, 0], [3, 0], [3, 0], [0, 1.8]],
        [[3, 0], [3, 0], [3, 0], [0, 1.8], [0, 0], [-3, 0], [-3, 0], [0, -1.8]]
      ),
      fill(color)
    ])
  ];
}

function makeCalfShape(color) {
  return [
    group('calf', [
      makePath(
        [[0, -6.5], [20, -6.2], [40, -5.2], [60, -4], [60, 4], [40, 5.2], [20, 6.2], [0, 6.5]],
        [[0, 0], [-2, 0], [-2, 0], [0, -1.4], [0, 0], [2, 0], [2, 0], [0, 1.4]],
        [[2, 0], [2, 0], [2, 0], [0, 1.4], [0, 0], [-2, 0], [-2, 0], [0, -1.4]]
      ),
      fill(color)
    ])
  ];
}

function makeFootShape() {
  return [
    group('shoe', [
      makePath(
        [[-2, -4], [10, -4], [18, -2], [22, 1], [18, 4], [8, 5], [0, 5], [-2, 2]],
        [[0, 0], [-2, 0], [-2, 0], [0, -1.5], [0, 0], [2, 0], [2, 0], [0, 1]],
        [[2, 0], [2, 0], [2, 0], [0, 1.5], [0, 0], [-2, 0], [-2, 0], [0, -1]]
      ),
      fill(COLORS.shoes)
    ])
  ];
}

function makeTorsoShape() {
  return [
    group('torso', [
      makePath(
        [[-30, 0], [30, 0], [25, 38], [20, 68], [18, 95], [-18, 95], [-20, 68], [-25, 38]],
        [[0, 0], [0, 0], [3, -4], [2, -2], [0, 0], [0, 0], [-2, -2], [-3, -4]],
        [[0, 0], [0, 0], [-3, 4], [-2, 2], [0, 0], [0, 0], [2, 2], [3, 4]]
      ),
      fill(COLORS.shirt),
      makePath(
        [[-30, 0], [-10, 10], [0, 26], [10, 10], [30, 0], [16, 0], [0, 14], [-16, 0]],
        [[0, 0], [-3, 0], [-2, -2], [2, -2], [0, 0], [2, 0], [0, -2], [-2, 0]],
        [[3, 0], [3, 0], [2, 2], [-2, 2], [0, 0], [-2, 0], [0, 2], [2, 0]]
      ),
      fill(COLORS.shirtDark)
    ])
  ];
}

function makeShortsShape() {
  return [
    group('shorts', [
      makePath(
        [[-26, 0], [26, 0], [22, 16], [18, 35], [6, 35], [2, 16], [-2, 35], [-18, 35], [-22, 16]],
        [[0, 0], [0, 0], [2, -2], [0, 0], [1, 0], [0, -2], [0, 2], [-1, 0], [-2, -2]],
        [[0, 0], [0, 0], [-2, 2], [0, 0], [-1, 0], [0, 2], [0, -2], [1, 0], [2, 2]]
      ),
      fill(COLORS.shorts)
    ])
  ];
}

function makeHeadShape() {
  return [
    group('head', [
      makePath(
        [[-4, 0], [4, 0], [4, -12], [-4, -12]],
        [[0, 0], [0, 0], [0, 0], [0, 0]],
        [[0, 0], [0, 0], [0, 0], [0, 0]]
      ),
      fill(COLORS.skin),
      ellipse([28, 34], [0, -26]),
      fill(COLORS.skin),
      makePath(
        [[-14, -30], [-10, -40], [0, -44], [11, -40], [14, -28], [10, -18], [0, -16], [-11, -18]],
        [[0, 0], [-1, 0], [-2, 0], [2, -1], [0, 0], [1, 2], [0, 0], [-1, 2]],
        [[1, 0], [1, 0], [2, 0], [-2, 1], [0, 0], [-1, -2], [0, 0], [1, -2]]
      ),
      fill(COLORS.hair)
    ])
  ];
}

function makeShadowShape() {
  return [
    group('ground-shadow', [
      ellipse([120, 26], [0, 0]),
      fill(withAlpha(COLORS.shadow, 0.28), 100)
    ])
  ];
}

function buildBackgroundLayer() {
  return {
    ty: 1,
    nm: 'bg',
    sw: CANVAS,
    sh: CANVAS,
    sc: '#111827',
    ks: {
      o: staticProp(100),
      r: staticProp(0),
      p: staticProp([HALF, HALF, 0]),
      a: staticProp([HALF, HALF, 0]),
      s: staticProp([100, 100, 100])
    },
    ip: 0,
    op: TOTAL_FRAMES,
    st: 0,
    bm: 0
  };
}

function buildCharacterLayers(keyframes) {
  const backSkin = COLORS.skinShadow;
  const frontSkin = COLORS.skin;
  const ids = {
    shadow: 1,
    leftThigh: 2,
    leftCalf: 3,
    leftFoot: 4,
    leftUpperArm: 5,
    leftForearm: 6,
    leftHand: 7,
    shorts: 8,
    torso: 9,
    rightThigh: 10,
    rightCalf: 11,
    rightFoot: 12,
    rightUpperArm: 13,
    rightForearm: 14,
    rightHand: 15,
    head: 16
  };

  // Lottie layer order: first in array = rendered on top
  // Order: head > front arm > front leg > torso > shorts > back arm > back leg > shadow
  return [
    buildAnimatedLayer('head', makeHeadShape(), headFrames(keyframes), { opacity: 100, ind: ids.head }),
    buildAnimatedLayer('front hand', makeHandShape(frontSkin), childPointFrames(keyframes, SEGMENT_LENGTHS.forearm), {
      opacity: 100,
      ind: ids.rightHand,
      parent: ids.rightForearm
    }),
    buildAnimatedLayer(
      'front forearm',
      makeForearmShape(frontSkin),
      childSegmentFrames(keyframes, 4, 6, 2, 4, SEGMENT_LENGTHS.forearm, SEGMENT_LENGTHS.upperArm),
      { opacity: 100, ind: ids.rightForearm, parent: ids.rightUpperArm }
    ),
    buildAnimatedLayer('front upper arm', makeUpperArmShape(frontSkin), segmentFrames(keyframes, 2, 4, SEGMENT_LENGTHS.upperArm), { opacity: 100, ind: ids.rightUpperArm }),
    buildAnimatedLayer(
      'front foot',
      makeFootShape(),
      footFrames(keyframes, 12, 16, 10, 12),
      { opacity: 100, ind: ids.rightFoot, parent: ids.rightCalf }
    ),
    buildAnimatedLayer(
      'front calf',
      makeCalfShape(frontSkin),
      childSegmentFrames(keyframes, 10, 12, 8, 10, SEGMENT_LENGTHS.calf, SEGMENT_LENGTHS.thigh),
      { opacity: 100, ind: ids.rightCalf, parent: ids.rightThigh }
    ),
    buildAnimatedLayer('front thigh', makeThighShape(frontSkin), segmentFrames(keyframes, 8, 10, SEGMENT_LENGTHS.thigh), { opacity: 100, ind: ids.rightThigh }),
    buildAnimatedLayer('torso', makeTorsoShape(), torsoFrames(keyframes), { opacity: 100, ind: ids.torso }),
    buildAnimatedLayer('shorts', makeShortsShape(), shortsFrames(keyframes), { opacity: 100, ind: ids.shorts }),
    buildAnimatedLayer('back hand', makeHandShape(backSkin), childPointFrames(keyframes, SEGMENT_LENGTHS.forearm), {
      opacity: 80,
      ind: ids.leftHand,
      parent: ids.leftForearm
    }),
    buildAnimatedLayer(
      'back forearm',
      makeForearmShape(backSkin),
      childSegmentFrames(keyframes, 3, 5, 1, 3, SEGMENT_LENGTHS.forearm, SEGMENT_LENGTHS.upperArm),
      { opacity: 80, ind: ids.leftForearm, parent: ids.leftUpperArm }
    ),
    buildAnimatedLayer('back upper arm', makeUpperArmShape(backSkin), segmentFrames(keyframes, 1, 3, SEGMENT_LENGTHS.upperArm), { opacity: 80, ind: ids.leftUpperArm }),
    buildAnimatedLayer(
      'back foot',
      makeFootShape(),
      footFrames(keyframes, 11, 15, 9, 11),
      { opacity: 80, ind: ids.leftFoot, parent: ids.leftCalf }
    ),
    buildAnimatedLayer(
      'back calf',
      makeCalfShape(backSkin),
      childSegmentFrames(keyframes, 9, 11, 7, 9, SEGMENT_LENGTHS.calf, SEGMENT_LENGTHS.thigh),
      { opacity: 80, ind: ids.leftCalf, parent: ids.leftThigh }
    ),
    buildAnimatedLayer('back thigh', makeThighShape(backSkin), segmentFrames(keyframes, 7, 9, SEGMENT_LENGTHS.thigh), { opacity: 80, ind: ids.leftThigh }),
    buildAnimatedLayer('shadow', makeShadowShape(), shadowFrames(keyframes), { opacity: 100, ind: ids.shadow }),
  ];
}

function buildLottie(exerciseId, definition) {
  const keyframes = compactKeyframes(definition.keyframes);

  return {
    v: '5.7.4',
    fr: FRAME_RATE,
    ip: 0,
    op: TOTAL_FRAMES,
    w: CANVAS,
    h: CANVAS,
    nm: exerciseId,
    assets: [],
    layers: [...buildCharacterLayers(keyframes), buildBackgroundLayer()]
  };
}

function compactKeyframes(keyframes) {
  if (keyframes.length <= MAX_SOURCE_KEYFRAMES) {
    return keyframes;
  }

  const indexSet = new Set(
    Array.from({ length: MAX_SOURCE_KEYFRAMES }, (_, index) =>
      Math.round((index * (keyframes.length - 1)) / (MAX_SOURCE_KEYFRAMES - 1))
    )
  );

  return [...indexSet]
    .sort((a, b) => a - b)
    .map((index) => keyframes[index]);
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const entries = Object.entries(EXERCISE_KEYFRAMES).sort(([a], [b]) => a.localeCompare(b));

  for (const [index, [exerciseId, definition]] of entries.entries()) {
    const lottie = buildLottie(exerciseId, definition);
    const filePath = path.join(OUTPUT_DIR, `${exerciseId}.json`);
    const json = JSON.stringify(lottie);

    await fs.writeFile(filePath, json);

    const sizeKb = round(Buffer.byteLength(json) / 1024, 1);
    console.log(`[${index + 1}/${entries.length}] ${exerciseId}.json ${sizeKb}KB`);
  }

  console.log(`Generated ${entries.length} Lottie files in ${OUTPUT_DIR}`);
}

main().catch((error) => {
  console.error('Failed to generate Lottie animations.');
  console.error(error);
  process.exitCode = 1;
});
