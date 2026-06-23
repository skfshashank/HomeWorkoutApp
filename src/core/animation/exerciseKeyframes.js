const LOOP_FRAMES = 60;

const LEFT_RIGHT_SWAP = {
  1: 2,
  2: 1,
  3: 4,
  4: 3,
  5: 6,
  6: 5,
  7: 8,
  8: 7,
  9: 10,
  10: 9,
  11: 12,
  12: 11,
  15: 16,
  16: 15
};

const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const round = (value) => Number(value.toFixed(3));
const normalizePoint = ([x, y]) => [round(clamp(x)), round(clamp(y))];
const clonePose = (pose) => pose.map((point) => normalizePoint(point));
const shiftPose = (pose, dx = 0, dy = 0) => pose.map(([x, y]) => normalizePoint([x + dx, y + dy]));

const updatePose = (pose, updates = {}) => {
  const next = clonePose(pose);
  Object.entries(updates).forEach(([index, point]) => {
    next[Number(index)] = normalizePoint(point);
  });
  return next;
};

const mirrorPose = (pose) => {
  const next = Array.from({ length: pose.length }, () => [0.5, 0.5]);
  pose.forEach(([x, y], index) => {
    const target = LEFT_RIGHT_SWAP[index] ?? index;
    next[target] = normalizePoint([1 - x, y]);
  });
  return next;
};

const keyframesFrom = (...poses) => {
  const safePoses = poses.length >= 2 ? poses : [poses[0], poses[0]];
  const steps = safePoses.length - 1 || 1;
  return safePoses.map((pose, index) => ({
    frame: index === safePoses.length - 1 ? LOOP_FRAMES : Math.round((LOOP_FRAMES / steps) * index),
    pose: clonePose(pose)
  }));
};

const def = (view, ...poses) => ({ view, keyframes: keyframesFrom(...poses) });

export const STANDING_FRONT = [
  [0.50, 0.15],
  [0.42, 0.28],
  [0.58, 0.28],
  [0.38, 0.42],
  [0.62, 0.42],
  [0.36, 0.55],
  [0.64, 0.55],
  [0.44, 0.55],
  [0.56, 0.55],
  [0.44, 0.72],
  [0.56, 0.72],
  [0.44, 0.88],
  [0.56, 0.88],
  [0.50, 0.28],
  [0.50, 0.55],
  [0.43, 0.92],
  [0.57, 0.92]
];

export const STANDING_SIDE = [
  [0.50, 0.15],
  [0.48, 0.28],
  [0.52, 0.28],
  [0.46, 0.42],
  [0.54, 0.42],
  [0.44, 0.55],
  [0.56, 0.55],
  [0.48, 0.55],
  [0.52, 0.55],
  [0.48, 0.72],
  [0.52, 0.72],
  [0.48, 0.88],
  [0.52, 0.88],
  [0.50, 0.28],
  [0.50, 0.55],
  [0.47, 0.92],
  [0.53, 0.92]
];

const WIDE_STANCE_FRONT = updatePose(STANDING_FRONT, {
  7: [0.42, 0.56],
  8: [0.58, 0.56],
  9: [0.36, 0.72],
  10: [0.64, 0.72],
  11: [0.32, 0.88],
  12: [0.68, 0.88],
  15: [0.28, 0.92],
  16: [0.72, 0.92]
});

const SEATED_FRONT = [
  [0.50, 0.23],
  [0.44, 0.36],
  [0.56, 0.36],
  [0.40, 0.48],
  [0.60, 0.48],
  [0.38, 0.58],
  [0.62, 0.58],
  [0.46, 0.60],
  [0.54, 0.60],
  [0.40, 0.75],
  [0.60, 0.75],
  [0.35, 0.88],
  [0.65, 0.88],
  [0.50, 0.36],
  [0.50, 0.60],
  [0.32, 0.90],
  [0.68, 0.90]
];

const SEATED_SIDE = [
  [0.44, 0.24],
  [0.43, 0.36],
  [0.47, 0.36],
  [0.42, 0.48],
  [0.50, 0.48],
  [0.40, 0.58],
  [0.54, 0.58],
  [0.45, 0.61],
  [0.49, 0.61],
  [0.60, 0.70],
  [0.64, 0.70],
  [0.74, 0.79],
  [0.78, 0.79],
  [0.45, 0.36],
  [0.47, 0.61],
  [0.80, 0.83],
  [0.84, 0.83]
];

const V_SEAT = updatePose(SEATED_FRONT, {
  0: [0.50, 0.20],
  1: [0.44, 0.32],
  2: [0.56, 0.32],
  3: [0.38, 0.40],
  4: [0.62, 0.40],
  5: [0.34, 0.46],
  6: [0.66, 0.46],
  7: [0.46, 0.60],
  8: [0.54, 0.60],
  9: [0.40, 0.48],
  10: [0.60, 0.48],
  11: [0.33, 0.36],
  12: [0.67, 0.36],
  15: [0.29, 0.33],
  16: [0.71, 0.33]
});

const LYING_BACK = [
  [0.18, 0.70],
  [0.30, 0.66],
  [0.30, 0.74],
  [0.40, 0.64],
  [0.40, 0.76],
  [0.50, 0.62],
  [0.50, 0.78],
  [0.54, 0.68],
  [0.54, 0.76],
  [0.72, 0.68],
  [0.72, 0.76],
  [0.88, 0.68],
  [0.88, 0.76],
  [0.28, 0.70],
  [0.54, 0.72],
  [0.93, 0.66],
  [0.93, 0.78]
];

const LYING_BACK_KNEES_UP = updatePose(LYING_BACK, {
  9: [0.67, 0.58],
  10: [0.67, 0.86],
  11: [0.78, 0.46],
  12: [0.78, 0.98],
  15: [0.82, 0.42],
  16: [0.82, 1.0]
});

const LEGS_UP = updatePose(LYING_BACK, {
  9: [0.68, 0.54],
  10: [0.68, 0.90],
  11: [0.68, 0.32],
  12: [0.68, 0.98],
  15: [0.68, 0.24],
  16: [0.68, 1.02]
});

const PRONE_FLAT = [
  [0.18, 0.74],
  [0.31, 0.70],
  [0.31, 0.78],
  [0.42, 0.66],
  [0.42, 0.82],
  [0.54, 0.62],
  [0.54, 0.86],
  [0.58, 0.72],
  [0.58, 0.80],
  [0.74, 0.72],
  [0.74, 0.80],
  [0.90, 0.72],
  [0.90, 0.80],
  [0.29, 0.74],
  [0.58, 0.76],
  [0.95, 0.70],
  [0.95, 0.82]
];

const PLANK_SIDE = [
  [0.79, 0.42],
  [0.63, 0.46],
  [0.61, 0.44],
  [0.50, 0.58],
  [0.48, 0.56],
  [0.40, 0.70],
  [0.38, 0.68],
  [0.54, 0.56],
  [0.52, 0.54],
  [0.38, 0.72],
  [0.36, 0.70],
  [0.24, 0.88],
  [0.22, 0.86],
  [0.62, 0.45],
  [0.53, 0.55],
  [0.18, 0.92],
  [0.16, 0.90]
];

const PLANK_FRONT = [
  [0.50, 0.45],
  [0.43, 0.46],
  [0.57, 0.46],
  [0.38, 0.58],
  [0.62, 0.58],
  [0.36, 0.72],
  [0.64, 0.72],
  [0.45, 0.56],
  [0.55, 0.56],
  [0.45, 0.72],
  [0.55, 0.72],
  [0.44, 0.88],
  [0.56, 0.88],
  [0.50, 0.46],
  [0.50, 0.56],
  [0.43, 0.92],
  [0.57, 0.92]
];

const SIDE_PLANK = [
  [0.56, 0.26],
  [0.52, 0.38],
  [0.54, 0.34],
  [0.45, 0.52],
  [0.60, 0.20],
  [0.38, 0.68],
  [0.66, 0.08],
  [0.46, 0.56],
  [0.48, 0.52],
  [0.36, 0.70],
  [0.38, 0.66],
  [0.24, 0.86],
  [0.26, 0.82],
  [0.53, 0.36],
  [0.47, 0.54],
  [0.18, 0.90],
  [0.20, 0.86]
];

const HANDS_KNEES = [
  [0.76, 0.38],
  [0.64, 0.44],
  [0.60, 0.42],
  [0.52, 0.56],
  [0.48, 0.54],
  [0.44, 0.70],
  [0.40, 0.68],
  [0.56, 0.56],
  [0.52, 0.54],
  [0.42, 0.72],
  [0.38, 0.70],
  [0.34, 0.88],
  [0.30, 0.86],
  [0.62, 0.43],
  [0.54, 0.55],
  [0.34, 0.92],
  [0.30, 0.90]
];

const KNEELING_SIDE = [
  [0.48, 0.18],
  [0.46, 0.30],
  [0.50, 0.30],
  [0.44, 0.42],
  [0.54, 0.42],
  [0.42, 0.54],
  [0.56, 0.54],
  [0.47, 0.56],
  [0.51, 0.56],
  [0.54, 0.76],
  [0.58, 0.76],
  [0.46, 0.90],
  [0.50, 0.90],
  [0.48, 0.30],
  [0.49, 0.56],
  [0.44, 0.92],
  [0.48, 0.92]
];

const VAJRASANA = [
  [0.50, 0.20],
  [0.45, 0.32],
  [0.55, 0.32],
  [0.44, 0.45],
  [0.56, 0.45],
  [0.46, 0.58],
  [0.54, 0.58],
  [0.47, 0.58],
  [0.53, 0.58],
  [0.47, 0.75],
  [0.53, 0.75],
  [0.44, 0.89],
  [0.56, 0.89],
  [0.50, 0.32],
  [0.50, 0.58],
  [0.44, 0.92],
  [0.56, 0.92]
];

const WALL_SIT = updatePose(STANDING_SIDE, {
  0: [0.46, 0.20],
  1: [0.45, 0.32],
  2: [0.49, 0.32],
  3: [0.44, 0.46],
  4: [0.52, 0.46],
  5: [0.42, 0.60],
  6: [0.54, 0.60],
  7: [0.48, 0.56],
  8: [0.52, 0.56],
  9: [0.60, 0.72],
  10: [0.64, 0.72],
  11: [0.60, 0.89],
  12: [0.64, 0.89],
  14: [0.50, 0.56],
  15: [0.58, 0.92],
  16: [0.66, 0.92]
});

const DESK_PUSHUP = updatePose(PLANK_SIDE, {
  0: [0.72, 0.34],
  1: [0.60, 0.38],
  2: [0.62, 0.36],
  3: [0.52, 0.50],
  4: [0.54, 0.48],
  5: [0.44, 0.62],
  6: [0.46, 0.60],
  7: [0.54, 0.50],
  8: [0.56, 0.48],
  9: [0.40, 0.66],
  10: [0.42, 0.64],
  11: [0.28, 0.84],
  12: [0.30, 0.82],
  15: [0.24, 0.88],
  16: [0.26, 0.86]
});

const armsOverhead = updatePose(STANDING_FRONT, {
  3: [0.42, 0.18],
  4: [0.58, 0.18],
  5: [0.45, 0.08],
  6: [0.55, 0.08]
});

const armsT = updatePose(STANDING_FRONT, {
  3: [0.30, 0.28],
  4: [0.70, 0.28],
  5: [0.18, 0.28],
  6: [0.82, 0.28]
});

const armsBack = updatePose(STANDING_FRONT, {
  3: [0.34, 0.36],
  4: [0.66, 0.36],
  5: [0.28, 0.48],
  6: [0.72, 0.48]
});

const squatMid = updatePose(STANDING_FRONT, {
  1: [0.43, 0.31],
  2: [0.57, 0.31],
  3: [0.38, 0.44],
  4: [0.62, 0.44],
  5: [0.34, 0.50],
  6: [0.66, 0.50],
  7: [0.44, 0.60],
  8: [0.56, 0.60],
  9: [0.41, 0.76],
  10: [0.59, 0.76],
  11: [0.40, 0.88],
  12: [0.60, 0.88],
  15: [0.38, 0.92],
  16: [0.62, 0.92]
});

const squatDeep = updatePose(squatMid, {
  0: [0.50, 0.18],
  3: [0.34, 0.42],
  4: [0.66, 0.42],
  5: [0.30, 0.44],
  6: [0.70, 0.44],
  7: [0.44, 0.66],
  8: [0.56, 0.66],
  9: [0.38, 0.82],
  10: [0.62, 0.82],
  11: [0.36, 0.90],
  12: [0.64, 0.90],
  15: [0.34, 0.92],
  16: [0.66, 0.92]
});

const jumpReach = updatePose(STANDING_FRONT, {
  0: [0.50, 0.12],
  3: [0.38, 0.18],
  4: [0.62, 0.18],
  5: [0.40, 0.06],
  6: [0.60, 0.06],
  7: [0.44, 0.52],
  8: [0.56, 0.52],
  9: [0.40, 0.66],
  10: [0.60, 0.66],
  11: [0.36, 0.82],
  12: [0.64, 0.82],
  15: [0.34, 0.86],
  16: [0.66, 0.86]
});

const jumpingJackMid = updatePose(STANDING_FRONT, {
  3: [0.32, 0.28],
  4: [0.68, 0.28],
  5: [0.24, 0.20],
  6: [0.76, 0.20],
  9: [0.38, 0.72],
  10: [0.62, 0.72],
  11: [0.33, 0.88],
  12: [0.67, 0.88],
  15: [0.28, 0.92],
  16: [0.72, 0.92]
});

const jumpingJackPeak = updatePose(STANDING_FRONT, {
  3: [0.40, 0.18],
  4: [0.60, 0.18],
  5: [0.44, 0.08],
  6: [0.56, 0.08],
  7: [0.42, 0.56],
  8: [0.58, 0.56],
  9: [0.34, 0.72],
  10: [0.66, 0.72],
  11: [0.27, 0.87],
  12: [0.73, 0.87],
  15: [0.22, 0.91],
  16: [0.78, 0.91]
});

const lungeForward = updatePose(STANDING_SIDE, {
  0: [0.47, 0.16],
  7: [0.48, 0.57],
  8: [0.52, 0.57],
  9: [0.60, 0.72],
  10: [0.54, 0.70],
  11: [0.68, 0.88],
  12: [0.44, 0.88],
  15: [0.72, 0.92],
  16: [0.40, 0.92]
});

const lungeDeep = updatePose(lungeForward, {
  1: [0.46, 0.32],
  2: [0.50, 0.32],
  3: [0.44, 0.44],
  4: [0.54, 0.44],
  5: [0.42, 0.55],
  6: [0.56, 0.55],
  7: [0.48, 0.62],
  8: [0.52, 0.62],
  9: [0.62, 0.77],
  10: [0.50, 0.76],
  11: [0.72, 0.90],
  12: [0.42, 0.90]
});

const lungeArmsUp = updatePose(lungeDeep, {
  3: [0.47, 0.18],
  4: [0.53, 0.18],
  5: [0.49, 0.06],
  6: [0.55, 0.06]
});

const foldForward = updatePose(STANDING_FRONT, {
  0: [0.50, 0.46],
  1: [0.42, 0.52],
  2: [0.58, 0.52],
  3: [0.38, 0.64],
  4: [0.62, 0.64],
  5: [0.36, 0.82],
  6: [0.64, 0.82],
  13: [0.50, 0.52],
  14: [0.50, 0.58]
});

const trianglePose = updatePose(WIDE_STANCE_FRONT, {
  0: [0.38, 0.34],
  1: [0.34, 0.42],
  2: [0.58, 0.26],
  3: [0.30, 0.58],
  4: [0.68, 0.20],
  5: [0.28, 0.76],
  6: [0.78, 0.18],
  7: [0.40, 0.58],
  8: [0.60, 0.56],
  13: [0.46, 0.34],
  14: [0.50, 0.57]
});

const downwardDog = updatePose(PLANK_SIDE, {
  0: [0.36, 0.68],
  1: [0.44, 0.58],
  2: [0.46, 0.56],
  3: [0.34, 0.70],
  4: [0.38, 0.66],
  5: [0.26, 0.84],
  6: [0.30, 0.80],
  7: [0.56, 0.48],
  8: [0.58, 0.46],
  9: [0.66, 0.66],
  10: [0.68, 0.64],
  11: [0.72, 0.88],
  12: [0.74, 0.86],
  13: [0.45, 0.57],
  14: [0.57, 0.47],
  15: [0.74, 0.92],
  16: [0.76, 0.90]
});

const cobraHigh = updatePose(PRONE_FLAT, {
  0: [0.42, 0.52],
  1: [0.44, 0.60],
  2: [0.44, 0.68],
  3: [0.50, 0.64],
  4: [0.50, 0.74],
  5: [0.56, 0.72],
  6: [0.56, 0.82],
  13: [0.43, 0.64]
});

const bowPose = updatePose(PRONE_FLAT, {
  0: [0.46, 0.56],
  1: [0.50, 0.62],
  2: [0.50, 0.70],
  3: [0.60, 0.58],
  4: [0.60, 0.74],
  5: [0.74, 0.60],
  6: [0.74, 0.72],
  7: [0.56, 0.70],
  8: [0.56, 0.78],
  9: [0.68, 0.58],
  10: [0.68, 0.90],
  11: [0.78, 0.46],
  12: [0.78, 1.00],
  15: [0.74, 0.58],
  16: [0.74, 0.72]
});

const bridgeHigh = updatePose(LYING_BACK_KNEES_UP, {
  0: [0.20, 0.76],
  1: [0.32, 0.74],
  2: [0.32, 0.82],
  7: [0.54, 0.58],
  8: [0.54, 0.66],
  13: [0.30, 0.78],
  14: [0.54, 0.62]
});

const childPose = updatePose(KNEELING_SIDE, {
  0: [0.64, 0.70],
  1: [0.56, 0.60],
  2: [0.60, 0.62],
  3: [0.46, 0.64],
  4: [0.50, 0.66],
  5: [0.34, 0.70],
  6: [0.38, 0.72],
  7: [0.52, 0.68],
  8: [0.56, 0.68],
  13: [0.58, 0.62],
  14: [0.54, 0.68]
});

const camelPose = updatePose(KNEELING_SIDE, {
  0: [0.56, 0.14],
  1: [0.50, 0.28],
  2: [0.54, 0.28],
  3: [0.56, 0.42],
  4: [0.60, 0.42],
  5: [0.58, 0.62],
  6: [0.62, 0.62],
  7: [0.47, 0.58],
  8: [0.51, 0.58],
  13: [0.52, 0.28]
});

const seatedFold = updatePose(SEATED_FRONT, {
  0: [0.40, 0.56],
  1: [0.40, 0.58],
  2: [0.48, 0.58],
  3: [0.44, 0.66],
  4: [0.54, 0.66],
  5: [0.36, 0.84],
  6: [0.60, 0.84],
  13: [0.44, 0.58]
});

const plowPose = updatePose(LYING_BACK, {
  0: [0.34, 0.78],
  1: [0.44, 0.74],
  2: [0.44, 0.82],
  7: [0.56, 0.66],
  8: [0.56, 0.74],
  9: [0.48, 0.54],
  10: [0.48, 0.86],
  11: [0.34, 0.34],
  12: [0.34, 1.02],
  15: [0.28, 0.24],
  16: [0.28, 1.08]
});

const fishPose = updatePose(LYING_BACK, {
  0: [0.24, 0.64],
  1: [0.34, 0.66],
  2: [0.34, 0.74],
  7: [0.56, 0.64],
  8: [0.56, 0.72],
  13: [0.32, 0.70],
  14: [0.56, 0.68]
});

const catPose = updatePose(HANDS_KNEES, {
  0: [0.76, 0.44],
  7: [0.57, 0.50],
  8: [0.53, 0.48],
  13: [0.62, 0.44],
  14: [0.55, 0.49]
});

const cowPose = updatePose(HANDS_KNEES, {
  0: [0.76, 0.34],
  7: [0.56, 0.60],
  8: [0.52, 0.58],
  13: [0.62, 0.40],
  14: [0.54, 0.59]
});

const lotusPose = updatePose(SEATED_FRONT, {
  9: [0.43, 0.74],
  10: [0.57, 0.74],
  11: [0.35, 0.82],
  12: [0.65, 0.82],
  15: [0.45, 0.78],
  16: [0.55, 0.78],
  5: [0.42, 0.56],
  6: [0.58, 0.56]
});

const chairPose = updatePose(squatDeep, {
  3: [0.40, 0.26],
  4: [0.60, 0.26],
  5: [0.42, 0.12],
  6: [0.58, 0.12]
});

const warrior2 = updatePose(WIDE_STANCE_FRONT, {
  0: [0.42, 0.20],
  1: [0.40, 0.32],
  2: [0.52, 0.32],
  3: [0.28, 0.32],
  4: [0.66, 0.32],
  5: [0.14, 0.32],
  6: [0.82, 0.32],
  7: [0.42, 0.56],
  8: [0.58, 0.56],
  9: [0.34, 0.74],
  10: [0.66, 0.72]
});

const nostrilLeft = updatePose(SEATED_FRONT, {
  3: [0.44, 0.46],
  4: [0.55, 0.34],
  5: [0.42, 0.56],
  6: [0.51, 0.22]
});

const nostrilRight = mirrorPose(nostrilLeft);

const earsCovered = updatePose(SEATED_FRONT, {
  3: [0.44, 0.34],
  4: [0.56, 0.34],
  5: [0.45, 0.26],
  6: [0.55, 0.26]
});

const shrugHigh = updatePose(SEATED_FRONT, {
  1: [0.45, 0.33],
  2: [0.55, 0.33],
  13: [0.50, 0.33]
});

const wristCircleLeft = updatePose(SEATED_FRONT, {
  3: [0.40, 0.44],
  4: [0.60, 0.44],
  5: [0.34, 0.48],
  6: [0.66, 0.48]
});

const wristCircleRight = updatePose(SEATED_FRONT, {
  3: [0.40, 0.44],
  4: [0.60, 0.44],
  5: [0.38, 0.56],
  6: [0.62, 0.56]
});

const pushupTop = clonePose(PLANK_SIDE);
const pushupBottom = updatePose(PLANK_SIDE, {
  0: [0.68, 0.50],
  1: [0.55, 0.54],
  2: [0.57, 0.52],
  3: [0.48, 0.64],
  4: [0.50, 0.62],
  5: [0.40, 0.74],
  6: [0.42, 0.72],
  7: [0.53, 0.58],
  8: [0.55, 0.56]
});

const kneePushupTop = updatePose(PLANK_SIDE, {
  9: [0.40, 0.74],
  10: [0.42, 0.72],
  11: [0.36, 0.88],
  12: [0.38, 0.86],
  15: [0.36, 0.92],
  16: [0.38, 0.90]
});

const kneePushupBottom = updatePose(kneePushupTop, {
  0: [0.68, 0.50],
  1: [0.55, 0.54],
  2: [0.57, 0.52],
  3: [0.48, 0.64],
  4: [0.50, 0.62],
  5: [0.40, 0.74],
  6: [0.42, 0.72]
});

const widePushupTop = updatePose(PLANK_FRONT, {
  3: [0.30, 0.58],
  4: [0.70, 0.58],
  5: [0.24, 0.72],
  6: [0.76, 0.72]
});

const widePushupBottom = updatePose(widePushupTop, {
  0: [0.50, 0.52],
  1: [0.43, 0.54],
  2: [0.57, 0.54],
  7: [0.45, 0.60],
  8: [0.55, 0.60]
});

const diamondPushupTop = updatePose(PLANK_FRONT, {
  5: [0.46, 0.72],
  6: [0.54, 0.72]
});

const diamondPushupBottom = updatePose(diamondPushupTop, {
  0: [0.50, 0.52],
  1: [0.46, 0.54],
  2: [0.54, 0.54],
  7: [0.46, 0.60],
  8: [0.54, 0.60]
});

const pikeTop = updatePose(downwardDog, {
  0: [0.38, 0.66],
  5: [0.28, 0.82],
  6: [0.32, 0.78]
});

const pikeBottom = updatePose(downwardDog, {
  0: [0.44, 0.60],
  1: [0.48, 0.56],
  2: [0.50, 0.54],
  3: [0.36, 0.68],
  4: [0.40, 0.64]
});

const dipTop = updatePose(SEATED_SIDE, {
  0: [0.56, 0.34],
  1: [0.54, 0.44],
  2: [0.58, 0.44],
  3: [0.44, 0.58],
  4: [0.48, 0.58],
  5: [0.36, 0.72],
  6: [0.40, 0.72],
  7: [0.52, 0.62],
  8: [0.56, 0.62]
});

const dipBottom = updatePose(dipTop, {
  0: [0.56, 0.42],
  1: [0.54, 0.50],
  2: [0.58, 0.50],
  7: [0.52, 0.68],
  8: [0.56, 0.68]
});

const supermanHigh = updatePose(PRONE_FLAT, {
  0: [0.18, 0.68],
  3: [0.40, 0.58],
  4: [0.40, 0.90],
  5: [0.52, 0.50],
  6: [0.52, 0.98],
  9: [0.72, 0.62],
  10: [0.72, 0.90],
  11: [0.88, 0.58],
  12: [0.88, 0.94],
  15: [0.94, 0.56],
  16: [0.94, 0.96]
});

const snowAngelWide = updatePose(PRONE_FLAT, {
  3: [0.36, 0.58],
  4: [0.36, 0.90],
  5: [0.26, 0.52],
  6: [0.26, 0.96]
});

const snowAngelOverhead = updatePose(PRONE_FLAT, {
  3: [0.24, 0.60],
  4: [0.24, 0.88],
  5: [0.14, 0.56],
  6: [0.14, 0.92]
});

const calfRaiseTop = updatePose(STANDING_SIDE, {
  11: [0.50, 0.84],
  12: [0.54, 0.84],
  15: [0.52, 0.90],
  16: [0.56, 0.90]
});

const sideLegRaise = updatePose(STANDING_FRONT, {
  10: [0.68, 0.62],
  12: [0.78, 0.56],
  16: [0.82, 0.56],
  4: [0.64, 0.38],
  6: [0.66, 0.52]
});

const donkeyKickRight = updatePose(HANDS_KNEES, {
  10: [0.50, 0.42],
  12: [0.54, 0.24],
  16: [0.56, 0.16]
});

const fireHydrantRight = updatePose(HANDS_KNEES, {
  10: [0.58, 0.56],
  12: [0.72, 0.52],
  16: [0.80, 0.52]
});

const birdDogRight = updatePose(HANDS_KNEES, {
  4: [0.54, 0.34],
  6: [0.64, 0.22],
  10: [0.56, 0.48],
  12: [0.72, 0.34],
  16: [0.80, 0.30]
});

const hollowHold = updatePose(LYING_BACK, {
  0: [0.18, 0.66],
  3: [0.34, 0.58],
  4: [0.34, 0.82],
  5: [0.46, 0.54],
  6: [0.46, 0.86],
  9: [0.72, 0.62],
  10: [0.72, 0.82],
  11: [0.88, 0.58],
  12: [0.88, 0.86],
  15: [0.94, 0.56],
  16: [0.94, 0.88]
});

const rolloutExtended = updatePose(KNEELING_SIDE, {
  0: [0.68, 0.52],
  1: [0.60, 0.52],
  2: [0.64, 0.52],
  3: [0.48, 0.60],
  4: [0.52, 0.60],
  5: [0.34, 0.70],
  6: [0.38, 0.70],
  7: [0.46, 0.62],
  8: [0.50, 0.62],
  13: [0.62, 0.52],
  14: [0.48, 0.62]
});

const neckLeft = updatePose(STANDING_FRONT, { 0: [0.46, 0.15] });
const neckRight = updatePose(STANDING_FRONT, { 0: [0.54, 0.15] });

const shoulderStretchLeft = updatePose(STANDING_FRONT, {
  3: [0.52, 0.34],
  5: [0.62, 0.30],
  4: [0.64, 0.38],
  6: [0.36, 0.32]
});

const chestOpen = updatePose(STANDING_FRONT, {
  3: [0.34, 0.34],
  4: [0.66, 0.34],
  5: [0.24, 0.42],
  6: [0.76, 0.42]
});

const quadStretch = updatePose(STANDING_SIDE, {
  10: [0.52, 0.66],
  12: [0.46, 0.56],
  16: [0.44, 0.56],
  4: [0.52, 0.48],
  6: [0.46, 0.56]
});

const standingFold = updatePose(STANDING_SIDE, {
  0: [0.60, 0.44],
  1: [0.56, 0.48],
  2: [0.60, 0.48],
  3: [0.66, 0.64],
  4: [0.70, 0.64],
  5: [0.76, 0.82],
  6: [0.80, 0.82],
  13: [0.58, 0.48]
});

const hipFlexorStretch = updatePose(lungeDeep, {
  3: [0.42, 0.38],
  4: [0.56, 0.38],
  5: [0.38, 0.48],
  6: [0.60, 0.48]
});

const spinalTwistLeft = updatePose(LYING_BACK_KNEES_UP, {
  9: [0.66, 0.66],
  10: [0.66, 0.74],
  11: [0.72, 0.82],
  12: [0.72, 0.90],
  3: [0.42, 0.62],
  4: [0.42, 0.78]
});

const spinalTwistRight = mirrorPose(spinalTwistLeft);

const seatedTwistLeft = updatePose(SEATED_FRONT, {
  0: [0.46, 0.24],
  1: [0.42, 0.36],
  2: [0.52, 0.32],
  3: [0.40, 0.50],
  4: [0.56, 0.40],
  5: [0.40, 0.62],
  6: [0.60, 0.54],
  13: [0.47, 0.34]
});

const seatedTwistRight = mirrorPose(seatedTwistLeft);

const fastFeetLeft = updatePose(STANDING_FRONT, {
  9: [0.42, 0.68],
  10: [0.58, 0.76],
  11: [0.42, 0.84],
  12: [0.58, 0.90],
  15: [0.40, 0.88],
  16: [0.60, 0.94],
  3: [0.42, 0.38],
  4: [0.58, 0.46]
});

const fastFeetRight = mirrorPose(fastFeetLeft);

const highKneeLeft = updatePose(STANDING_FRONT, {
  3: [0.42, 0.36],
  4: [0.58, 0.44],
  5: [0.38, 0.48],
  6: [0.62, 0.56],
  9: [0.44, 0.56],
  11: [0.46, 0.38],
  15: [0.45, 0.30]
});

const buttKickLeft = updatePose(STANDING_FRONT, {
  3: [0.44, 0.40],
  4: [0.56, 0.36],
  5: [0.40, 0.52],
  6: [0.60, 0.48],
  10: [0.56, 0.68],
  12: [0.56, 0.56],
  16: [0.52, 0.48]
});

const skaterLeft = updatePose(STANDING_FRONT, {
  0: [0.44, 0.16],
  3: [0.34, 0.40],
  4: [0.54, 0.34],
  5: [0.26, 0.52],
  6: [0.62, 0.44],
  7: [0.40, 0.56],
  8: [0.52, 0.58],
  9: [0.34, 0.72],
  10: [0.52, 0.72],
  11: [0.30, 0.90],
  12: [0.60, 0.84],
  15: [0.24, 0.92],
  16: [0.52, 0.78]
});

const tuckJump = updatePose(jumpReach, {
  9: [0.42, 0.52],
  10: [0.58, 0.52],
  11: [0.44, 0.42],
  12: [0.56, 0.42],
  15: [0.44, 0.36],
  16: [0.56, 0.36]
});

const burpeeSquat = updatePose(STANDING_FRONT, {
  0: [0.50, 0.20],
  3: [0.38, 0.46],
  4: [0.62, 0.46],
  5: [0.34, 0.62],
  6: [0.66, 0.62],
  7: [0.44, 0.66],
  8: [0.56, 0.66],
  9: [0.40, 0.82],
  10: [0.60, 0.82],
  11: [0.36, 0.90],
  12: [0.64, 0.90]
});

const plankJackWide = updatePose(PLANK_FRONT, {
  11: [0.34, 0.88],
  12: [0.66, 0.88],
  15: [0.28, 0.92],
  16: [0.72, 0.92]
});

const shoulderTapLeft = updatePose(PLANK_FRONT, {
  3: [0.46, 0.52],
  5: [0.54, 0.48]
});

const plankKneeLeft = updatePose(PLANK_SIDE, {
  9: [0.50, 0.60],
  11: [0.60, 0.52],
  15: [0.64, 0.50]
});

const V_UP = updatePose(LYING_BACK, {
  0: [0.40, 0.56],
  1: [0.42, 0.56],
  2: [0.42, 0.64],
  3: [0.50, 0.50],
  4: [0.50, 0.70],
  5: [0.58, 0.42],
  6: [0.58, 0.78],
  7: [0.54, 0.68],
  8: [0.54, 0.76],
  9: [0.60, 0.56],
  10: [0.60, 0.88],
  11: [0.64, 0.38],
  12: [0.64, 1.02],
  15: [0.66, 0.30],
  16: [0.66, 1.08]
});

const deadBugRight = updatePose(LYING_BACK_KNEES_UP, {
  3: [0.40, 0.56],
  5: [0.52, 0.50],
  10: [0.66, 0.90],
  12: [0.86, 0.94],
  16: [0.92, 0.96]
});

const heelTapLeft = updatePose(LYING_BACK_KNEES_UP, {
  3: [0.40, 0.56],
  4: [0.40, 0.78],
  5: [0.68, 0.44],
  6: [0.50, 0.78],
  0: [0.26, 0.62]
});

const toeTouch = updatePose(LEGS_UP, {
  0: [0.30, 0.56],
  3: [0.42, 0.48],
  4: [0.42, 0.72],
  5: [0.62, 0.32],
  6: [0.62, 0.92]
});

const scissorLeft = updatePose(LYING_BACK, {
  9: [0.68, 0.60],
  10: [0.68, 0.84],
  11: [0.82, 0.50],
  12: [0.82, 0.92],
  15: [0.90, 0.44],
  16: [0.90, 0.98]
});

const boatReach = updatePose(V_SEAT, {
  3: [0.40, 0.34],
  4: [0.60, 0.34],
  5: [0.28, 0.34],
  6: [0.72, 0.34]
});

const reverseCrunchHigh = updatePose(LYING_BACK, {
  7: [0.50, 0.60],
  8: [0.50, 0.68],
  9: [0.56, 0.50],
  10: [0.56, 0.86],
  11: [0.44, 0.42],
  12: [0.44, 0.94],
  15: [0.40, 0.38],
  16: [0.40, 0.98]
});

const sideBendLeft = updatePose(SEATED_FRONT, {
  0: [0.44, 0.22],
  1: [0.40, 0.34],
  2: [0.52, 0.32],
  3: [0.34, 0.40],
  4: [0.58, 0.42],
  5: [0.30, 0.58],
  6: [0.62, 0.56],
  13: [0.46, 0.33]
});

const headNod = updatePose(SEATED_FRONT, { 0: [0.50, 0.24] });
const chestExpand = shiftPose(SEATED_FRONT, 0, -0.01);

const plankWalkForward = updatePose(PLANK_FRONT, {
  5: [0.32, 0.68],
  6: [0.60, 0.68]
});

const inchwormFold = standingFold;
const inchwormPlank = pushupTop;

const bearCrawlLeft = updatePose(HANDS_KNEES, {
  0: [0.70, 0.36],
  5: [0.40, 0.66],
  6: [0.48, 0.62],
  11: [0.30, 0.84],
  12: [0.38, 0.80]
});

const plankToPushupForearm = updatePose(PLANK_SIDE, {
  3: [0.54, 0.56],
  5: [0.48, 0.62]
});

const getupHalf = updatePose(LYING_BACK_KNEES_UP, {
  0: [0.36, 0.46],
  1: [0.40, 0.48],
  2: [0.44, 0.40],
  3: [0.42, 0.60],
  4: [0.52, 0.32],
  5: [0.46, 0.74],
  6: [0.58, 0.18],
  7: [0.52, 0.62],
  8: [0.54, 0.58]
});

const walkoutFold = standingFold;

const REQUIRED_EXERCISES = [
  'crunches',
  'bicycle-crunches',
  'reverse-crunches',
  'leg-raises',
  'flutter-kicks',
  'russian-twists',
  'plank-hold',
  'side-plank',
  'plank-hip-dips',
  'mountain-climbers',
  'v-ups',
  'dead-bug',
  'heel-taps',
  'toe-touches',
  'scissor-kicks',
  'plank-shoulder-taps',
  'knee-to-elbow-plank',
  'boat-hold',
  'plank-jacks',
  'burpees',
  'surya-namaskar',
  'tadasana',
  'utkatasana',
  'virabhadrasana-i',
  'virabhadrasana-ii',
  'trikonasana',
  'downward-dog',
  'bhujangasana',
  'dhanurasana',
  'naukasana',
  'setu-bandhasana',
  'balasana',
  'vajrasana',
  'paschimottanasana',
  'ustrasana',
  'halasana',
  'matsyasana',
  'cat-cow',
  'shavasana',
  'padmasana',
  'kapalbhati',
  'anulom-vilom',
  'bhramari',
  'ujjayi',
  'sheetali',
  'deep-belly-breathing',
  'jumping-jacks',
  'high-knees',
  'butt-kicks',
  'jump-squats-hiit',
  'star-jumps',
  'skaters',
  'tuck-jumps',
  'squat-thrusts',
  'plank-jacks-hiit',
  'burpees-hiit',
  'fast-feet',
  'lateral-shuffles',
  'push-ups-standard',
  'wide-push-ups',
  'diamond-push-ups',
  'pike-push-ups',
  'knee-push-ups',
  'tricep-dips-chair',
  'superman-hold',
  'arm-circles',
  'inchworms',
  'shoulder-taps-plank',
  'reverse-snow-angels',
  'wall-push-ups',
  'bodyweight-squats',
  'sumo-squats',
  'forward-lunges',
  'reverse-lunges',
  'jump-squats-lower',
  'wall-sit',
  'glute-bridges',
  'single-leg-bridges',
  'calf-raises',
  'donkey-kicks',
  'fire-hydrants',
  'side-leg-raises',
  'plank-hold-core',
  'side-plank-core',
  'dead-bug-core',
  'bird-dog',
  'hollow-hold',
  'superman-core',
  'plank-walk',
  'ab-rollout-towel',
  'neck-rolls',
  'shoulder-stretch',
  'chest-opener',
  'quad-stretch',
  'hamstring-stretch-standing',
  'hip-flexor-stretch',
  'cat-cow-stretch',
  'spinal-twist-lying',
  'desk-neck-rolls',
  'seated-shoulder-shrugs',
  'seated-spinal-twist',
  'wrist-circles',
  'desk-chair-squats',
  'standing-calf-raises',
  'desk-push-ups',
  'hip-flexor-stretch-standing',
  'squat-to-press',
  'inchworm',
  'bear-crawl',
  'plank-to-pushup',
  'squat-jumps',
  'turkish-getup-lite',
  'sprawl',
  'walk-out-pushup'
];

const EXERCISE_BUILDERS = {
  'crunches': () => {
    const crunchPrep = updatePose(LYING_BACK, {
      0: [0.20, 0.66],
      3: [0.36, 0.62],
      4: [0.36, 0.78],
      5: [0.28, 0.58],
      6: [0.28, 0.82],
      13: [0.30, 0.69]
    });
    const crunchMid = updatePose(LYING_BACK, {
      0: [0.24, 0.61],
      1: [0.34, 0.62],
      2: [0.34, 0.74],
      3: [0.40, 0.58],
      4: [0.40, 0.78],
      5: [0.48, 0.54],
      6: [0.48, 0.82],
      13: [0.34, 0.66]
    });
    const crunchPeak = updatePose(LYING_BACK, {
      0: [0.30, 0.55],
      1: [0.36, 0.58],
      2: [0.36, 0.72],
      3: [0.42, 0.54],
      4: [0.42, 0.76],
      5: [0.50, 0.49],
      6: [0.50, 0.81],
      13: [0.38, 0.63]
    });
    return def('front', LYING_BACK, crunchPrep, crunchMid, crunchPeak, crunchMid, crunchPrep, LYING_BACK);
  },
  'bicycle-crunches': () => {
    const bicycleCenter = updatePose(LYING_BACK_KNEES_UP, {
      3: [0.38, 0.60],
      4: [0.38, 0.76],
      5: [0.28, 0.56],
      6: [0.28, 0.80]
    });
    const bicycleLeftPrep = updatePose(bicycleCenter, {
      0: [0.22, 0.62],
      1: [0.32, 0.64],
      2: [0.34, 0.74],
      3: [0.38, 0.58],
      5: [0.44, 0.52],
      9: [0.64, 0.64],
      11: [0.78, 0.54],
      15: [0.84, 0.46],
      13: [0.30, 0.68]
    });
    const bicycleLeftPeak = updatePose(bicycleCenter, {
      0: [0.28, 0.56],
      1: [0.36, 0.60],
      2: [0.36, 0.72],
      3: [0.40, 0.54],
      5: [0.50, 0.48],
      9: [0.62, 0.62],
      11: [0.74, 0.50],
      15: [0.80, 0.42],
      13: [0.36, 0.64]
    });
    return def(
      'front',
      bicycleCenter,
      bicycleLeftPrep,
      bicycleLeftPeak,
      bicycleCenter,
      mirrorPose(bicycleLeftPrep),
      mirrorPose(bicycleLeftPeak),
      bicycleCenter
    );
  },
  'reverse-crunches': () => def('front', LYING_BACK, LYING_BACK_KNEES_UP, reverseCrunchHigh, LYING_BACK_KNEES_UP, LYING_BACK),
  'leg-raises': () => {
    const lowRaise = updatePose(LYING_BACK, {
      9: [0.70, 0.62],
      10: [0.70, 0.82],
      11: [0.80, 0.54],
      12: [0.80, 0.94],
      15: [0.86, 0.48],
      16: [0.86, 1.0]
    });
    const midRaise = updatePose(LYING_BACK, {
      9: [0.70, 0.60],
      10: [0.70, 0.84],
      11: [0.76, 0.42],
      12: [0.76, 0.98],
      15: [0.80, 0.34],
      16: [0.80, 1.04]
    });
    const highRaise = updatePose(LEGS_UP, {
      7: [0.54, 0.66],
      8: [0.54, 0.74],
      14: [0.54, 0.70]
    });
    return def('front', LYING_BACK, lowRaise, midRaise, highRaise, midRaise, lowRaise, LYING_BACK);
  },
  'flutter-kicks': () => def('front', scissorLeft, mirrorPose(scissorLeft), scissorLeft),
  'russian-twists': () => {
    const twistCenter = boatReach;
    const twistLeftPrep = updatePose(twistCenter, {
      0: [0.48, 0.22],
      1: [0.42, 0.34],
      2: [0.54, 0.32],
      3: [0.38, 0.40],
      4: [0.60, 0.38],
      5: [0.34, 0.52],
      6: [0.64, 0.48],
      13: [0.49, 0.33]
    });
    const twistLeftPeak = updatePose(twistCenter, {
      0: [0.46, 0.22],
      1: [0.40, 0.34],
      2: [0.54, 0.30],
      3: [0.34, 0.40],
      4: [0.60, 0.36],
      5: [0.28, 0.58],
      6: [0.66, 0.46],
      13: [0.47, 0.32]
    });
    return def(
      'front',
      twistCenter,
      twistLeftPrep,
      twistLeftPeak,
      twistCenter,
      mirrorPose(twistLeftPrep),
      mirrorPose(twistLeftPeak),
      twistCenter
    );
  },
  'plank-hold': () => {
    const plankBrace = updatePose(PLANK_SIDE, {
      0: [0.78, 0.40],
      1: [0.62, 0.44],
      2: [0.60, 0.42],
      5: [0.38, 0.68],
      6: [0.36, 0.66],
      7: [0.54, 0.54],
      8: [0.52, 0.52],
      9: [0.38, 0.70],
      10: [0.36, 0.68],
      11: [0.22, 0.86],
      12: [0.20, 0.84],
      13: [0.61, 0.43],
      14: [0.53, 0.53]
    });
    const plankForward = updatePose(plankBrace, {
      1: [0.61, 0.45],
      2: [0.59, 0.43],
      3: [0.48, 0.57],
      4: [0.46, 0.55],
      5: [0.37, 0.66],
      6: [0.35, 0.64],
      7: [0.55, 0.55],
      8: [0.53, 0.53],
      9: [0.39, 0.71],
      10: [0.37, 0.69],
      11: [0.24, 0.87],
      12: [0.22, 0.85]
    });
    const plankSag = updatePose(PLANK_SIDE, {
      0: [0.81, 0.44],
      7: [0.56, 0.60],
      8: [0.54, 0.58],
      9: [0.40, 0.74],
      10: [0.38, 0.72],
      11: [0.26, 0.90],
      12: [0.24, 0.88],
      13: [0.63, 0.47],
      14: [0.55, 0.59]
    });
    return def('side', PLANK_SIDE, plankBrace, plankForward, plankBrace, PLANK_SIDE, plankSag, PLANK_SIDE);
  },
  'side-plank': () => def('side', SIDE_PLANK, shiftPose(SIDE_PLANK, 0, -0.01), SIDE_PLANK),
  'plank-hip-dips': () => def('front', updatePose(PLANK_FRONT, { 7: [0.44, 0.60], 8: [0.54, 0.56], 14: [0.49, 0.58] }), PLANK_FRONT, updatePose(PLANK_FRONT, { 7: [0.46, 0.56], 8: [0.56, 0.60], 14: [0.51, 0.58] }), PLANK_FRONT),
  'mountain-climbers': () => {
    const kneeDriveLeftMid = updatePose(PLANK_SIDE, {
      7: [0.53, 0.55],
      8: [0.51, 0.53],
      9: [0.44, 0.66],
      10: [0.36, 0.70],
      11: [0.52, 0.58],
      12: [0.22, 0.86],
      15: [0.56, 0.54],
      16: [0.16, 0.90]
    });
    const kneeDriveLeftPeak = updatePose(PLANK_SIDE, {
      0: [0.77, 0.44],
      7: [0.52, 0.56],
      8: [0.50, 0.54],
      9: [0.50, 0.60],
      10: [0.36, 0.70],
      11: [0.60, 0.50],
      12: [0.22, 0.86],
      15: [0.64, 0.46],
      16: [0.16, 0.90]
    });
    return def(
      'side',
      PLANK_SIDE,
      kneeDriveLeftMid,
      kneeDriveLeftPeak,
      PLANK_SIDE,
      mirrorPose(kneeDriveLeftMid),
      mirrorPose(kneeDriveLeftPeak),
      PLANK_SIDE
    );
  },
  'v-ups': () => def('front', LYING_BACK, updatePose(LYING_BACK, { 0: [0.28, 0.60], 5: [0.50, 0.48], 6: [0.50, 0.82], 11: [0.76, 0.44], 12: [0.76, 0.96], 15: [0.82, 0.34], 16: [0.82, 1.02] }), V_UP, updatePose(LYING_BACK, { 0: [0.28, 0.60], 5: [0.50, 0.48], 6: [0.50, 0.82], 11: [0.76, 0.44], 12: [0.76, 0.96], 15: [0.82, 0.34], 16: [0.82, 1.02] }), LYING_BACK),
  'dead-bug': () => def('front', LYING_BACK_KNEES_UP, deadBugRight, LYING_BACK_KNEES_UP, mirrorPose(deadBugRight), LYING_BACK_KNEES_UP),
  'heel-taps': () => def('front', LYING_BACK_KNEES_UP, heelTapLeft, LYING_BACK_KNEES_UP, mirrorPose(heelTapLeft), LYING_BACK_KNEES_UP),
  'toe-touches': () => def('front', LEGS_UP, toeTouch, LEGS_UP),
  'scissor-kicks': () => def('front', scissorLeft, mirrorPose(scissorLeft), scissorLeft),
  'plank-shoulder-taps': () => def('front', PLANK_FRONT, shoulderTapLeft, PLANK_FRONT, mirrorPose(shoulderTapLeft), PLANK_FRONT),
  'knee-to-elbow-plank': () => def('side', PLANK_SIDE, plankKneeLeft, PLANK_SIDE, mirrorPose(plankKneeLeft), PLANK_SIDE),
  'boat-hold': () => def('front', boatReach, shiftPose(boatReach, 0, -0.01), boatReach),
  'plank-jacks': () => def('front', PLANK_FRONT, plankJackWide, PLANK_FRONT),
  'burpees': () => def('front', STANDING_FRONT, burpeeSquat, PLANK_FRONT, jumpReach, STANDING_FRONT),
  'surya-namaskar': () => def('front', STANDING_FRONT, armsOverhead, foldForward, STANDING_FRONT),
  'tadasana': () => def('front', STANDING_FRONT, armsOverhead, STANDING_FRONT),
  'utkatasana': () => def('front', STANDING_FRONT, chairPose, STANDING_FRONT),
  'virabhadrasana-i': () => def('side', STANDING_SIDE, lungeArmsUp, STANDING_SIDE),
  'virabhadrasana-ii': () => {
    const wideArms = updatePose(WIDE_STANCE_FRONT, {
      0: [0.46, 0.18],
      1: [0.40, 0.32],
      2: [0.52, 0.32],
      3: [0.28, 0.32],
      4: [0.66, 0.32],
      5: [0.14, 0.32],
      6: [0.82, 0.32]
    });
    const warriorHalf = updatePose(warrior2, {
      0: [0.44, 0.20],
      7: [0.43, 0.57],
      8: [0.57, 0.56],
      9: [0.38, 0.73],
      10: [0.64, 0.72]
    });
    const warriorOpen = updatePose(warrior2, {
      0: [0.40, 0.18],
      1: [0.39, 0.31],
      2: [0.53, 0.31],
      13: [0.46, 0.31]
    });
    return def('front', wideArms, warriorHalf, warrior2, warriorOpen, warrior2, warriorHalf, wideArms);
  },
  'trikonasana': () => def('front', WIDE_STANCE_FRONT, trianglePose, WIDE_STANCE_FRONT),
  'downward-dog': () => {
    const dogTransition1 = updatePose(PLANK_SIDE, {
      0: [0.70, 0.46],
      1: [0.58, 0.48],
      2: [0.56, 0.46],
      3: [0.46, 0.58],
      4: [0.44, 0.56],
      5: [0.34, 0.70],
      6: [0.32, 0.68],
      7: [0.56, 0.52],
      8: [0.54, 0.50],
      9: [0.42, 0.72],
      10: [0.40, 0.70],
      13: [0.57, 0.47],
      14: [0.55, 0.51]
    });
    const dogTransition2 = updatePose(downwardDog, {
      0: [0.48, 0.60],
      1: [0.50, 0.54],
      2: [0.52, 0.52],
      3: [0.38, 0.66],
      4: [0.40, 0.62],
      5: [0.28, 0.78],
      6: [0.30, 0.74],
      9: [0.58, 0.68],
      10: [0.60, 0.66],
      11: [0.68, 0.86],
      12: [0.70, 0.84],
      13: [0.51, 0.53],
      14: [0.58, 0.49]
    });
    return def('side', PLANK_SIDE, dogTransition1, dogTransition2, downwardDog, dogTransition2, dogTransition1, PLANK_SIDE);
  },
  'bhujangasana': () => {
    const cobraPrep = updatePose(PRONE_FLAT, {
      0: [0.22, 0.72],
      3: [0.38, 0.64],
      4: [0.38, 0.84],
      5: [0.44, 0.68],
      6: [0.44, 0.88],
      13: [0.31, 0.74]
    });
    const cobraBaby = updatePose(PRONE_FLAT, {
      0: [0.30, 0.64],
      1: [0.36, 0.66],
      2: [0.36, 0.78],
      3: [0.42, 0.64],
      4: [0.42, 0.80],
      5: [0.50, 0.66],
      6: [0.50, 0.82],
      13: [0.35, 0.70]
    });
    const cobraMid = updatePose(PRONE_FLAT, {
      0: [0.36, 0.58],
      1: [0.40, 0.62],
      2: [0.40, 0.74],
      3: [0.46, 0.64],
      4: [0.46, 0.78],
      5: [0.54, 0.70],
      6: [0.54, 0.82],
      13: [0.39, 0.66]
    });
    return def('side', PRONE_FLAT, cobraPrep, cobraBaby, cobraMid, cobraHigh, cobraMid, PRONE_FLAT);
  },
  'dhanurasana': () => def('side', PRONE_FLAT, bowPose, PRONE_FLAT),
  'naukasana': () => def('front', V_SEAT, boatReach, V_SEAT),
  'setu-bandhasana': () => {
    const bridgeBrace = updatePose(LYING_BACK_KNEES_UP, {
      0: [0.18, 0.68],
      7: [0.54, 0.66],
      8: [0.54, 0.74],
      13: [0.28, 0.69],
      14: [0.54, 0.70]
    });
    const bridgeMid = updatePose(LYING_BACK_KNEES_UP, {
      0: [0.19, 0.72],
      1: [0.30, 0.70],
      2: [0.30, 0.78],
      7: [0.54, 0.62],
      8: [0.54, 0.70],
      13: [0.28, 0.74],
      14: [0.54, 0.66]
    });
    return def('side', LYING_BACK_KNEES_UP, bridgeBrace, bridgeMid, bridgeHigh, bridgeMid, bridgeBrace, LYING_BACK_KNEES_UP);
  },
  'balasana': () => def('side', VAJRASANA, childPose, VAJRASANA),
  'vajrasana': () => def('front', VAJRASANA, shiftPose(VAJRASANA, 0, -0.008), VAJRASANA),
  'paschimottanasana': () => def('front', SEATED_FRONT, seatedFold, SEATED_FRONT),
  'ustrasana': () => def('side', KNEELING_SIDE, camelPose, KNEELING_SIDE),
  'halasana': () => def('side', LYING_BACK, plowPose, LYING_BACK),
  'matsyasana': () => def('side', LYING_BACK, fishPose, LYING_BACK),
  'cat-cow': () => def('side', catPose, cowPose, catPose),
  'shavasana': () => def('side', LYING_BACK, shiftPose(LYING_BACK, 0, -0.004), LYING_BACK),
  'padmasana': () => def('front', lotusPose, shiftPose(lotusPose, 0, -0.008), lotusPose),
  'kapalbhati': () => def('front', SEATED_FRONT, shiftPose(SEATED_FRONT, 0, -0.006), SEATED_FRONT, shiftPose(SEATED_FRONT, 0, 0.004), SEATED_FRONT),
  'anulom-vilom': () => def('front', SEATED_FRONT, nostrilLeft, SEATED_FRONT, nostrilRight, SEATED_FRONT),
  'bhramari': () => def('front', SEATED_FRONT, earsCovered, SEATED_FRONT),
  'ujjayi': () => def('front', SEATED_FRONT, chestExpand, SEATED_FRONT),
  'sheetali': () => def('front', SEATED_FRONT, headNod, SEATED_FRONT),
  'deep-belly-breathing': () => {
    const handsOnKnees = updatePose(SEATED_FRONT, {
      3: [0.45, 0.56],
      4: [0.55, 0.56],
      5: [0.44, 0.72],
      6: [0.56, 0.72]
    });
    const armsRising = updatePose(handsOnKnees, {
      0: [0.50, 0.22],
      1: [0.43, 0.34],
      2: [0.57, 0.34],
      3: [0.38, 0.46],
      4: [0.62, 0.46],
      5: [0.36, 0.56],
      6: [0.64, 0.56],
      13: [0.50, 0.34]
    });
    const armsShoulderHeight = updatePose(handsOnKnees, {
      0: [0.50, 0.20],
      1: [0.42, 0.32],
      2: [0.58, 0.32],
      3: [0.32, 0.34],
      4: [0.68, 0.34],
      5: [0.22, 0.34],
      6: [0.78, 0.34],
      13: [0.50, 0.31],
      14: [0.50, 0.59]
    });
    const armsOverheadInhale = updatePose(handsOnKnees, {
      0: [0.50, 0.17],
      1: [0.42, 0.31],
      2: [0.58, 0.31],
      3: [0.40, 0.18],
      4: [0.60, 0.18],
      5: [0.43, 0.06],
      6: [0.57, 0.06],
      13: [0.50, 0.29],
      14: [0.50, 0.59]
    });
    return def(
      'front',
      handsOnKnees,
      armsRising,
      armsShoulderHeight,
      armsOverheadInhale,
      armsShoulderHeight,
      armsRising,
      handsOnKnees
    );
  },
  'jumping-jacks': () => {
    const jackQuarter = updatePose(STANDING_FRONT, {
      3: [0.36, 0.26],
      4: [0.64, 0.26],
      5: [0.30, 0.30],
      6: [0.70, 0.30],
      9: [0.41, 0.72],
      10: [0.59, 0.72],
      11: [0.38, 0.88],
      12: [0.62, 0.88],
      15: [0.35, 0.92],
      16: [0.65, 0.92]
    });
    const jackHalf = updatePose(jumpingJackMid, {
      3: [0.30, 0.24],
      4: [0.70, 0.24],
      5: [0.22, 0.16],
      6: [0.78, 0.16],
      7: [0.43, 0.56],
      8: [0.57, 0.56],
      9: [0.36, 0.72],
      10: [0.64, 0.72],
      11: [0.30, 0.88],
      12: [0.70, 0.88],
      15: [0.25, 0.92],
      16: [0.75, 0.92]
    });
    return def('front', STANDING_FRONT, jackQuarter, jackHalf, jumpingJackPeak, jackHalf, jackQuarter, STANDING_FRONT);
  },
  'high-knees': () => {
    const kneeDrivePrep = updatePose(STANDING_FRONT, {
      0: [0.48, 0.14],
      3: [0.40, 0.34],
      4: [0.60, 0.42],
      5: [0.36, 0.46],
      6: [0.64, 0.56],
      7: [0.44, 0.54],
      8: [0.56, 0.56],
      9: [0.44, 0.64],
      10: [0.58, 0.74],
      11: [0.46, 0.48],
      12: [0.58, 0.88],
      15: [0.46, 0.40]
    });
    const kneeDrivePeak = updatePose(STANDING_FRONT, {
      0: [0.46, 0.13],
      3: [0.38, 0.30],
      4: [0.62, 0.44],
      5: [0.34, 0.42],
      6: [0.66, 0.58],
      7: [0.44, 0.52],
      8: [0.56, 0.56],
      9: [0.44, 0.54],
      10: [0.58, 0.76],
      11: [0.46, 0.34],
      12: [0.58, 0.90],
      15: [0.46, 0.24],
      16: [0.59, 0.94]
    });
    const switchHop = updatePose(STANDING_FRONT, {
      0: [0.50, 0.13],
      3: [0.40, 0.36],
      4: [0.60, 0.36],
      5: [0.36, 0.48],
      6: [0.64, 0.48],
      7: [0.45, 0.53],
      8: [0.55, 0.53],
      9: [0.45, 0.68],
      10: [0.55, 0.68],
      11: [0.43, 0.84],
      12: [0.57, 0.84],
      15: [0.41, 0.88],
      16: [0.59, 0.88]
    });
    return def(
      'front',
      STANDING_FRONT,
      kneeDrivePrep,
      kneeDrivePeak,
      switchHop,
      mirrorPose(kneeDrivePeak),
      mirrorPose(kneeDrivePrep),
      STANDING_FRONT
    );
  },
  'butt-kicks': () => def('front', STANDING_FRONT, buttKickLeft, STANDING_FRONT, mirrorPose(buttKickLeft), STANDING_FRONT),
  'jump-squats-hiit': () => {
    const squatLoad = updatePose(STANDING_FRONT, {
      0: [0.50, 0.17],
      3: [0.38, 0.44],
      4: [0.62, 0.44],
      5: [0.34, 0.56],
      6: [0.66, 0.56],
      7: [0.44, 0.60],
      8: [0.56, 0.60],
      9: [0.40, 0.76],
      10: [0.60, 0.76],
      11: [0.38, 0.88],
      12: [0.62, 0.88]
    });
    const squatExplode = updatePose(STANDING_FRONT, {
      0: [0.49, 0.14],
      3: [0.40, 0.24],
      4: [0.60, 0.24],
      5: [0.38, 0.12],
      6: [0.62, 0.12],
      7: [0.44, 0.54],
      8: [0.56, 0.54],
      9: [0.42, 0.70],
      10: [0.58, 0.70],
      11: [0.40, 0.84],
      12: [0.60, 0.84],
      15: [0.38, 0.88],
      16: [0.62, 0.88]
    });
    return def('front', STANDING_FRONT, squatLoad, squatDeep, squatExplode, jumpReach, squatLoad, STANDING_FRONT);
  },
  'star-jumps': () => def('front', STANDING_FRONT, jumpingJackPeak, STANDING_FRONT),
  'skaters': () => def('front', skaterLeft, STANDING_FRONT, mirrorPose(skaterLeft), STANDING_FRONT),
  'tuck-jumps': () => def('front', STANDING_FRONT, squatMid, tuckJump, STANDING_FRONT),
  'squat-thrusts': () => def('front', STANDING_FRONT, burpeeSquat, PLANK_FRONT, burpeeSquat, STANDING_FRONT),
  'plank-jacks-hiit': () => def('front', PLANK_FRONT, plankJackWide, PLANK_FRONT),
  'burpees-hiit': () => {
    const burpeeLoad = updatePose(STANDING_FRONT, {
      0: [0.50, 0.18],
      3: [0.40, 0.40],
      4: [0.60, 0.40],
      5: [0.36, 0.54],
      6: [0.64, 0.54],
      7: [0.44, 0.60],
      8: [0.56, 0.60],
      9: [0.41, 0.78],
      10: [0.59, 0.78],
      11: [0.38, 0.89],
      12: [0.62, 0.89]
    });
    const burpeePushup = updatePose(PLANK_FRONT, {
      0: [0.50, 0.50],
      1: [0.44, 0.52],
      2: [0.56, 0.52],
      3: [0.40, 0.60],
      4: [0.60, 0.60],
      5: [0.38, 0.72],
      6: [0.62, 0.72],
      7: [0.45, 0.60],
      8: [0.55, 0.60]
    });
    return def('front', STANDING_FRONT, burpeeLoad, burpeeSquat, PLANK_FRONT, burpeePushup, burpeeSquat, jumpReach, STANDING_FRONT);
  },
  'fast-feet': () => def('front', fastFeetLeft, fastFeetRight, fastFeetLeft),
  'lateral-shuffles': () => def('front', shiftPose(STANDING_FRONT, -0.05, 0), shiftPose(STANDING_FRONT, 0.05, 0), shiftPose(STANDING_FRONT, -0.05, 0)),
  'push-ups-standard': () => {
    const pushupQuarter = updatePose(pushupTop, {
      0: [0.76, 0.45],
      1: [0.61, 0.49],
      2: [0.59, 0.47],
      3: [0.52, 0.60],
      4: [0.50, 0.58],
      5: [0.42, 0.70],
      6: [0.40, 0.68],
      7: [0.53, 0.56],
      8: [0.51, 0.54]
    });
    const pushupMid = updatePose(pushupTop, {
      0: [0.72, 0.48],
      1: [0.58, 0.52],
      2: [0.58, 0.50],
      3: [0.50, 0.62],
      4: [0.50, 0.60],
      5: [0.40, 0.72],
      6: [0.40, 0.70],
      7: [0.53, 0.57],
      8: [0.53, 0.55]
    });
    return def('side', pushupTop, pushupQuarter, pushupMid, pushupBottom, pushupMid, pushupQuarter, pushupTop);
  },
  'wide-push-ups': () => def('front', widePushupTop, widePushupBottom, widePushupTop),
  'diamond-push-ups': () => def('front', diamondPushupTop, diamondPushupBottom, diamondPushupTop),
  'pike-push-ups': () => def('side', pikeTop, pikeBottom, pikeTop),
  'knee-push-ups': () => def('side', kneePushupTop, kneePushupBottom, kneePushupTop),
  'tricep-dips-chair': () => def('side', dipTop, dipBottom, dipTop),
  'superman-hold': () => def('side', PRONE_FLAT, supermanHigh, PRONE_FLAT),
  'arm-circles': () => {
    const circleUp = updatePose(armsT, {
      3: [0.34, 0.22],
      4: [0.66, 0.22],
      5: [0.26, 0.14],
      6: [0.74, 0.14]
    });
    const circleFront = updatePose(STANDING_FRONT, {
      3: [0.38, 0.26],
      4: [0.62, 0.26],
      5: [0.36, 0.18],
      6: [0.64, 0.18]
    });
    const circleLowFront = updatePose(STANDING_FRONT, {
      3: [0.36, 0.40],
      4: [0.64, 0.40],
      5: [0.42, 0.54],
      6: [0.58, 0.54]
    });
    const circleDown = updatePose(armsT, {
      3: [0.34, 0.34],
      4: [0.66, 0.34],
      5: [0.24, 0.42],
      6: [0.76, 0.42]
    });
    return def('front', armsT, circleUp, armsOverhead, circleFront, circleLowFront, circleDown, armsBack, armsT);
  },
  'inchworms': () => def('side', STANDING_SIDE, inchwormFold, inchwormPlank, inchwormFold, STANDING_SIDE),
  'shoulder-taps-plank': () => def('front', PLANK_FRONT, shoulderTapLeft, PLANK_FRONT, mirrorPose(shoulderTapLeft), PLANK_FRONT),
  'reverse-snow-angels': () => def('side', PRONE_FLAT, snowAngelWide, snowAngelOverhead, snowAngelWide, PRONE_FLAT),
  'wall-push-ups': () => def('side', DESK_PUSHUP, updatePose(DESK_PUSHUP, { 0: [0.66, 0.40], 1: [0.56, 0.44], 2: [0.58, 0.42], 5: [0.46, 0.62], 6: [0.48, 0.60] }), DESK_PUSHUP),
  'bodyweight-squats': () => {
    const squatHinge = updatePose(STANDING_SIDE, {
      0: [0.52, 0.16],
      1: [0.49, 0.29],
      2: [0.53, 0.29],
      3: [0.46, 0.40],
      4: [0.56, 0.40],
      5: [0.42, 0.48],
      6: [0.60, 0.48],
      7: [0.48, 0.57],
      8: [0.52, 0.57],
      9: [0.50, 0.73],
      10: [0.54, 0.73],
      13: [0.51, 0.29],
      14: [0.50, 0.57]
    });
    const squatMidSide = updatePose(STANDING_SIDE, {
      0: [0.54, 0.18],
      1: [0.50, 0.32],
      2: [0.54, 0.32],
      3: [0.46, 0.46],
      4: [0.58, 0.46],
      5: [0.40, 0.60],
      6: [0.62, 0.60],
      7: [0.50, 0.60],
      8: [0.54, 0.60],
      9: [0.58, 0.74],
      10: [0.62, 0.74],
      11: [0.50, 0.88],
      12: [0.54, 0.88],
      15: [0.48, 0.92],
      16: [0.56, 0.92],
      13: [0.52, 0.32],
      14: [0.52, 0.60]
    });
    const squatDeepSide = updatePose(squatMidSide, {
      0: [0.56, 0.20],
      1: [0.51, 0.34],
      2: [0.55, 0.34],
      3: [0.48, 0.48],
      4: [0.60, 0.48],
      5: [0.42, 0.62],
      6: [0.64, 0.62],
      7: [0.52, 0.64],
      8: [0.56, 0.64],
      9: [0.64, 0.74],
      10: [0.68, 0.74],
      11: [0.56, 0.88],
      12: [0.60, 0.88],
      15: [0.54, 0.92],
      16: [0.62, 0.92],
      13: [0.53, 0.34],
      14: [0.54, 0.64]
    });
    return def('side', STANDING_SIDE, squatHinge, squatMidSide, squatDeepSide, squatMidSide, squatHinge, STANDING_SIDE);
  },
  'sumo-squats': () => def('front', WIDE_STANCE_FRONT, updatePose(WIDE_STANCE_FRONT, { 7: [0.42, 0.60], 8: [0.58, 0.60], 9: [0.34, 0.80], 10: [0.66, 0.80], 11: [0.32, 0.90], 12: [0.68, 0.90] }), WIDE_STANCE_FRONT),
  'forward-lunges': () => {
    const lungeStep = lungeForward;
    const lungeMid = updatePose(lungeForward, {
      0: [0.48, 0.17],
      1: [0.46, 0.30],
      2: [0.50, 0.30],
      3: [0.44, 0.42],
      4: [0.54, 0.42],
      5: [0.42, 0.54],
      6: [0.56, 0.54],
      7: [0.48, 0.60],
      8: [0.52, 0.60],
      9: [0.61, 0.75],
      10: [0.52, 0.73],
      11: [0.70, 0.89],
      12: [0.43, 0.89],
      13: [0.48, 0.30],
      14: [0.50, 0.60]
    });
    return def('side', STANDING_SIDE, lungeStep, lungeMid, lungeDeep, lungeMid, lungeStep, STANDING_SIDE);
  },
  'reverse-lunges': () => def('side', STANDING_SIDE, mirrorPose(lungeDeep), STANDING_SIDE),
  'jump-squats-lower': () => EXERCISE_BUILDERS['jump-squats-hiit'](),
  'wall-sit': () => def('side', WALL_SIT, shiftPose(WALL_SIT, 0, -0.008), WALL_SIT),
  'glute-bridges': () => {
    const bridgeBrace = updatePose(LYING_BACK_KNEES_UP, {
      0: [0.18, 0.68],
      7: [0.54, 0.66],
      8: [0.54, 0.74],
      13: [0.28, 0.69],
      14: [0.54, 0.70]
    });
    const bridgeMid = updatePose(LYING_BACK_KNEES_UP, {
      0: [0.19, 0.72],
      1: [0.30, 0.70],
      2: [0.30, 0.78],
      7: [0.54, 0.62],
      8: [0.54, 0.70],
      13: [0.28, 0.74],
      14: [0.54, 0.66]
    });
    return def('side', LYING_BACK_KNEES_UP, bridgeBrace, bridgeMid, bridgeHigh, bridgeMid, bridgeBrace, LYING_BACK_KNEES_UP);
  },
  'single-leg-bridges': () => def('side', updatePose(LYING_BACK_KNEES_UP, { 10: [0.68, 0.76], 12: [0.80, 0.58], 16: [0.86, 0.50] }), updatePose(bridgeHigh, { 10: [0.68, 0.76], 12: [0.80, 0.58], 16: [0.86, 0.50] }), updatePose(LYING_BACK_KNEES_UP, { 10: [0.68, 0.76], 12: [0.80, 0.58], 16: [0.86, 0.50] })),
  'calf-raises': () => def('side', STANDING_SIDE, calfRaiseTop, STANDING_SIDE),
  'donkey-kicks': () => def('side', HANDS_KNEES, donkeyKickRight, HANDS_KNEES, mirrorPose(donkeyKickRight), HANDS_KNEES),
  'fire-hydrants': () => def('side', HANDS_KNEES, fireHydrantRight, HANDS_KNEES, mirrorPose(fireHydrantRight), HANDS_KNEES),
  'side-leg-raises': () => def('front', STANDING_FRONT, sideLegRaise, STANDING_FRONT, mirrorPose(sideLegRaise), STANDING_FRONT),
  'plank-hold-core': () => EXERCISE_BUILDERS['plank-hold'](),
  'side-plank-core': () => def('side', SIDE_PLANK, shiftPose(SIDE_PLANK, 0, -0.01), SIDE_PLANK),
  'dead-bug-core': () => def('front', LYING_BACK_KNEES_UP, deadBugRight, LYING_BACK_KNEES_UP, mirrorPose(deadBugRight), LYING_BACK_KNEES_UP),
  'bird-dog': () => def('side', HANDS_KNEES, birdDogRight, HANDS_KNEES, mirrorPose(birdDogRight), HANDS_KNEES),
  'hollow-hold': () => def('side', LYING_BACK, hollowHold, LYING_BACK),
  'superman-core': () => def('side', PRONE_FLAT, supermanHigh, PRONE_FLAT),
  'plank-walk': () => def('front', PLANK_FRONT, plankWalkForward, PLANK_FRONT),
  'ab-rollout-towel': () => def('side', KNEELING_SIDE, rolloutExtended, KNEELING_SIDE),
  'neck-rolls': () => def('front', STANDING_FRONT, neckLeft, STANDING_FRONT, neckRight, STANDING_FRONT),
  'shoulder-stretch': () => def('front', STANDING_FRONT, shoulderStretchLeft, STANDING_FRONT, mirrorPose(shoulderStretchLeft), STANDING_FRONT),
  'chest-opener': () => def('front', STANDING_FRONT, chestOpen, STANDING_FRONT),
  'quad-stretch': () => def('side', STANDING_SIDE, quadStretch, STANDING_SIDE),
  'hamstring-stretch-standing': () => def('side', STANDING_SIDE, standingFold, STANDING_SIDE),
  'hip-flexor-stretch': () => def('side', STANDING_SIDE, hipFlexorStretch, STANDING_SIDE),
  'cat-cow-stretch': () => def('side', catPose, cowPose, catPose),
  'spinal-twist-lying': () => def('side', LYING_BACK_KNEES_UP, spinalTwistLeft, LYING_BACK_KNEES_UP, spinalTwistRight, LYING_BACK_KNEES_UP),
  'desk-neck-rolls': () => def('front', SEATED_FRONT, neckLeft, SEATED_FRONT, neckRight, SEATED_FRONT),
  'seated-shoulder-shrugs': () => def('front', SEATED_FRONT, shrugHigh, SEATED_FRONT),
  'seated-spinal-twist': () => def('front', SEATED_FRONT, seatedTwistLeft, SEATED_FRONT, seatedTwistRight, SEATED_FRONT),
  'wrist-circles': () => def('front', wristCircleLeft, SEATED_FRONT, wristCircleRight, SEATED_FRONT),
  'desk-chair-squats': () => def('side', SEATED_SIDE, STANDING_SIDE, SEATED_SIDE),
  'standing-calf-raises': () => def('side', STANDING_SIDE, calfRaiseTop, STANDING_SIDE),
  'desk-push-ups': () => def('side', DESK_PUSHUP, updatePose(DESK_PUSHUP, { 0: [0.66, 0.40], 1: [0.56, 0.44], 2: [0.58, 0.42], 5: [0.46, 0.62], 6: [0.48, 0.60] }), DESK_PUSHUP),
  'hip-flexor-stretch-standing': () => def('side', STANDING_SIDE, hipFlexorStretch, STANDING_SIDE),
  'squat-to-press': () => def('front', STANDING_FRONT, squatDeep, armsOverhead, STANDING_FRONT),
  'inchworm': () => def('side', STANDING_SIDE, inchwormFold, inchwormPlank, inchwormFold, STANDING_SIDE),
  'bear-crawl': () => def('side', HANDS_KNEES, bearCrawlLeft, HANDS_KNEES, mirrorPose(bearCrawlLeft), HANDS_KNEES),
  'plank-to-pushup': () => def('side', plankToPushupForearm, pushupTop, plankToPushupForearm),
  'squat-jumps': () => EXERCISE_BUILDERS['jump-squats-hiit'](),
  'turkish-getup-lite': () => def('side', LYING_BACK_KNEES_UP, getupHalf, KNEELING_SIDE, STANDING_SIDE),
  'sprawl': () => def('front', STANDING_FRONT, burpeeSquat, PLANK_FRONT, STANDING_FRONT),
  'walk-out-pushup': () => def('side', STANDING_SIDE, walkoutFold, pushupBottom, walkoutFold, STANDING_SIDE)
};

const genericDefinition = (exerciseId) => {
  const id = String(exerciseId || '');
  if (id.includes('plank')) return def('front', PLANK_FRONT, shiftPose(PLANK_FRONT, 0, -0.01), PLANK_FRONT);
  if (id.includes('push')) return def('side', pushupTop, pushupBottom, pushupTop);
  if (id.includes('squat')) return def('front', STANDING_FRONT, squatDeep, STANDING_FRONT);
  if (id.includes('lunge')) return def('side', STANDING_SIDE, lungeDeep, STANDING_SIDE);
  if (id.includes('stretch') || id.includes('roll')) return def('front', STANDING_FRONT, shiftPose(STANDING_FRONT, 0, -0.01), STANDING_FRONT);
  return def('front', STANDING_FRONT, shiftPose(STANDING_FRONT, 0, -0.01), STANDING_FRONT);
};

export const EXERCISE_KEYFRAMES = Object.fromEntries(
  REQUIRED_EXERCISES.map((exerciseId) => {
    const builder = EXERCISE_BUILDERS[exerciseId];
    return [exerciseId, builder ? builder() : genericDefinition(exerciseId)];
  })
);

export function getKeyframesForExercise(exerciseId) {
  const normalizedId = String(exerciseId || '').toLowerCase().replace(/_/g, '-');
  return EXERCISE_KEYFRAMES[normalizedId]?.keyframes || genericDefinition(normalizedId).keyframes;
}

export function getExerciseAnimation(exerciseId) {
  const normalizedId = String(exerciseId || '').toLowerCase().replace(/_/g, '-');
  return EXERCISE_KEYFRAMES[normalizedId] || genericDefinition(normalizedId);
}
