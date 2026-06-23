import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { EXERCISE_KEYFRAMES } from './exerciseKeyframes.js';

const FRAME_RATE = 30;
const TOTAL_FRAMES = 60;
const CANVAS = 400;
const HALF = CANVAS / 2;
const EASE_IN = { x: 0.5, y: 1 };
const EASE_OUT = { x: 0.5, y: 0 };
const rgb = (r, g, b, a = 1) => [r / 255, g / 255, b / 255, a];

const COLORS = {
  skin: rgb(226, 189, 159),
  skinShadow: rgb(213, 160, 116),
  shirt: rgb(214, 98, 39),
  shirtDark: rgb(180, 61, 38),
  shorts: rgb(22, 18, 19),
  hair: rgb(74, 35, 15),
  shoes: rgb(22, 18, 19),
  sole: rgb(60, 60, 60),
  shadow: rgb(38, 34, 36)
};

const SEGMENT_LENGTHS = {
  upperArm: 58,
  forearm: 54,
  hand: 14,
  thigh: 74,
  calf: 68,
  foot: 28,
  torso: 110,
  shorts: 40,
  head: 34
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

function smoothTangents(vertices, factor = 0.2, closed = true) {
  return vertices.map((vertex, index) => {
    const prev = closed ? vertices[(index - 1 + vertices.length) % vertices.length] : (vertices[index - 1] ?? vertex);
    const next = closed ? vertices[(index + 1) % vertices.length] : (vertices[index + 1] ?? vertex);

    return {
      i: [round((prev[0] - vertex[0]) * factor), round((prev[1] - vertex[1]) * factor)],
      o: [round((next[0] - vertex[0]) * factor), round((next[1] - vertex[1]) * factor)]
    };
  });
}

function makeSmoothPath(vertices, factor = 0.2, closed = true) {
  const tangents = smoothTangents(vertices, factor, closed);
  return makePath(
    vertices,
    tangents.map((tangent) => tangent.i),
    tangents.map((tangent) => tangent.o),
    closed
  );
}

function fill(color, opacity = 100) {
  return {
    ty: 'fl',
    c: { a: 0, k: color },
    o: { a: 0, k: opacity }
  };
}

function stroke(color, width, opacity = 100) {
  return {
    ty: 'st',
    c: { a: 0, k: color },
    o: { a: 0, k: opacity },
    w: { a: 0, k: width },
    lc: 2,
    lj: 2
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
  return { ty: 'gr', nm: name, it: [...items, shapeTransform()] };
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
  const armShadow = COLORS.skinShadow;
  return [
    group('upper-arm-base', [
      makeSmoothPath([[0, -11], [8, -13], [18, -12], [30, -10], [42, -8], [52, -6], [58, -4], [57, 6], [46, 9], [28, 11], [12, 10], [0, 12]], 0.22),
      fill(color)
    ]),
    group('upper-arm-shadow', [
      makeSmoothPath([[20, -10], [34, -9], [48, -7], [58, -4], [57, 5], [49, 7], [37, 9], [25, 10], [22, 2]], 0.18),
      fill(armShadow, 32)
    ]),
    group('deltoid-cap', [
      makeSmoothPath([[-2, -10], [5, -14], [12, -13], [16, -8], [14, 0], [7, 5], [0, 3], [-4, -2]], 0.28),
      fill(color)
    ]),
    group('shoulder-joint', [
      ellipse([16, 16], [4, 0]),
      fill(color)
    ]),
    group('elbow-joint', [
      ellipse([14, 14], [58, 1]),
      fill(armShadow, 85)
    ])
  ];
}

function makeForearmShape(color) {
  const armShadow = COLORS.skinShadow;
  return [
    group('forearm-base', [
      makeSmoothPath([[0, -8], [10, -9], [22, -8], [34, -7], [44, -6], [52, -4], [54, -2], [53, 3], [46, 5], [34, 7], [20, 8], [8, 7], [0, 8]], 0.22),
      fill(color)
    ]),
    group('forearm-shadow', [
      makeSmoothPath([[18, -7], [31, -6], [44, -5], [54, -2], [52, 3], [42, 5], [28, 6], [18, 6], [15, 0]], 0.18),
      fill(armShadow, 34)
    ]),
    group('elbow-cover', [
      ellipse([14, 14], [2, 0]),
      fill(color)
    ]),
    group('wrist-joint', [
      ellipse([12, 12], [54, 1]),
      fill(armShadow, 85)
    ])
  ];
}

function makeHandShape(color) {
  return [
    group('hand-palm', [
      makeSmoothPath([[-1, -5], [5, -8], [11, -7], [14, -4], [14, 1], [11, 5], [5, 7], [0, 5], [-2, 1]], 0.26),
      fill(color)
    ]),
    group('hand-fingers', [
      makeSmoothPath([[5, -7], [10, -9], [14, -7], [15, -2], [13, 4], [9, 6], [6, 4], [8, 0], [6, -3]], 0.24),
      fill(COLORS.skinShadow, 28)
    ]),
    group('thumb', [
      makeSmoothPath([[0, -1], [4, -4], [7, -3], [8, 1], [5, 4], [1, 3], [-1, 1]], 0.24),
      fill(color)
    ])
  ];
}

function makeThighShape(color) {
  const legShadow = COLORS.skinShadow;
  return [
    group('thigh-base', [
      makeSmoothPath([[0, -11], [10, -12], [22, -12], [36, -11], [50, -10], [63, -8], [72, -5], [74, 4], [71, 8], [60, 11], [44, 13], [28, 13], [12, 12], [0, 12]], 0.22),
      fill(color)
    ]),
    group('shorts-overlap', [
      makeSmoothPath([[-1, -11], [18, -12], [38, -11], [56, -9], [69, -6], [71, 1], [56, 2], [38, 3], [18, 3], [0, 2]], 0.2),
      fill(COLORS.shorts)
    ]),
    group('thigh-shadow', [
      makeSmoothPath([[26, -10], [44, -9], [61, -7], [73, -4], [72, 5], [62, 8], [48, 10], [34, 11], [26, 5]], 0.18),
      fill(legShadow, 28)
    ]),
    group('hip-joint', [
      ellipse([16, 16], [5, 0]),
      fill(color)
    ]),
    group('knee-joint', [
      ellipse([14, 14], [74, 2]),
      fill(legShadow, 85)
    ])
  ];
}

function makeCalfShape(color) {
  const legShadow = COLORS.skinShadow;
  return [
    group('calf-base', [
      makeSmoothPath([[0, -8], [10, -9], [22, -8], [34, -6], [46, -4], [58, -3], [67, -2], [68, 3], [62, 6], [52, 9], [40, 10], [28, 9], [14, 8], [0, 8]], 0.22),
      fill(color)
    ]),
    group('calf-muscle', [
      makeSmoothPath([[18, -7], [30, -6], [42, -4], [54, -2], [66, -1], [61, 5], [50, 8], [38, 8], [26, 6]], 0.18),
      fill(legShadow, 30)
    ]),
    group('knee-cover', [
      ellipse([14, 14], [2, 0]),
      fill(color)
    ]),
    group('ankle-joint', [
      ellipse([12, 12], [68, 1]),
      fill(legShadow, 85)
    ])
  ];
}

function makeFootShape() {
  return [
    group('shoe-upper', [
      makeSmoothPath([[-2, -5], [5, -7], [14, -7], [22, -5], [27, -1], [28, 3], [24, 6], [16, 8], [6, 8], [-1, 5], [-2, 1]], 0.24),
      fill(COLORS.shoes)
    ]),
    group('shoe-sole', [
      makeSmoothPath([[0, 4], [7, 6], [16, 6], [24, 5], [28, 4], [27, 7], [20, 9], [11, 10], [3, 9], [-1, 7]], 0.18),
      fill(COLORS.sole)
    ])
  ];
}

function makeTorsoShape() {
  return [
    group('tank-top-main', [
      makeSmoothPath([[-42, 4], [-38, 0], [-28, 2], [-20, 8], [-12, 18], [-8, 34], [-6, 52], [-6, 72], [-10, 90], [-16, 106], [16, 106], [10, 90], [6, 72], [6, 52], [8, 34], [12, 18], [20, 8], [28, 2], [38, 0], [42, 4]], 0.18),
      fill(COLORS.shirt),
    ]),
    group('tank-top-left-panel', [
      makeSmoothPath([[-30, 6], [-20, 10], [-14, 24], [-12, 46], [-14, 70], [-18, 92], [-10, 100], [-4, 72], [-4, 44], [-8, 20]], 0.18),
      fill(COLORS.shirtDark, 82)
    ]),
    group('tank-top-right-panel', [
      makeSmoothPath([[30, 6], [20, 10], [14, 24], [12, 46], [14, 70], [18, 92], [10, 100], [4, 72], [4, 44], [8, 20]], 0.18),
      fill(COLORS.shirtDark, 62)
    ]),
    group('collar-v', [
      makeSmoothPath([[-15, 6], [-8, 8], [-2, 18], [0, 24], [2, 18], [8, 8], [15, 6]], 0.2, false),
      stroke(COLORS.shirtDark, 3, 88)
    ]),
    group('torso-shadow', [
      makeSmoothPath([[8, 8], [20, 10], [30, 18], [28, 56], [22, 92], [10, 104], [5, 78], [6, 42]], 0.18),
      fill(COLORS.shirtDark, 42)
    ]),
    group('left-deltoid', [
      ellipse([18, 18], [-34, 14]),
      fill(COLORS.skin)
    ]),
    group('right-deltoid', [
      ellipse([18, 18], [34, 14]),
      fill(COLORS.skinShadow, 90)
    ])
  ];
}

function makeShortsShape() {
  return [
    group('shorts-main', [
      makeSmoothPath([[-30, 0], [-28, 10], [-24, 22], [-18, 34], [-8, 38], [-1, 18], [1, 18], [8, 38], [18, 34], [24, 22], [28, 10], [30, 0], [18, -6], [0, -2], [-18, -6]], 0.2),
      fill(COLORS.shorts)
    ]),
    group('shorts-inner-shadow', [
      makeSmoothPath([[-2, 16], [0, 8], [2, 16], [2, 32], [0, 36], [-2, 32]], 0.24),
      fill(COLORS.sole, 55)
    ])
  ];
}

function makeHeadShape() {
  return [
    group('neck', [
      makeSmoothPath([[-6, 0], [6, 0], [6, -12], [3, -17], [-3, -17], [-6, -12]], 0.24),
      fill(COLORS.skin),
    ]),
    group('neck-shadow', [
      makeSmoothPath([[1, 0], [6, 0], [6, -11], [3, -17], [1, -14]], 0.22),
      fill(COLORS.skinShadow, 55)
    ]),
    group('ear', [
      ellipse([8, 11], [17, -29]),
      fill(COLORS.skin)
    ]),
    group('face', [
      makeSmoothPath([[-3, -8], [7, -10], [14, -16], [18, -25], [19, -35], [16, -45], [10, -52], [2, -56], [-8, -54], [-16, -47], [-20, -37], [-20, -26], [-16, -16], [-10, -10]], 0.2),
      fill(COLORS.skin)
    ]),
    group('face-shadow', [
      makeSmoothPath([[2, -10], [11, -12], [17, -18], [20, -28], [20, -38], [17, -47], [10, -52], [3, -53], [1, -40], [2, -24]], 0.18),
      fill(COLORS.skinShadow, 36)
    ]),
    group('hair', [
      makeSmoothPath([[-16, -28], [-18, -41], [-11, -51], [-1, -57], [10, -55], [17, -49], [20, -39], [18, -29], [10, -22], [0, -20], [-9, -21]], 0.22),
      fill(COLORS.hair)
    ])
  ];
}

function makeShadowShape() {
  return [
    group('ground-shadow', [
      ellipse([168, 34], [0, 0]),
      fill(COLORS.shadow, 18)
    ])
  ];
}

function buildBackgroundLayer() {
  return {
    ty: 1,
    nm: 'bg',
    sw: CANVAS,
    sh: CANVAS,
    sc: '#f5f5f5',
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
    v: '5.12.2',
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
