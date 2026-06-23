import fs from 'node:fs';

const ROOT = 'D:\\HomeWorkoutApp';
const CATALOG_PATH = `${ROOT}\\assets\\plans\\exercise_catalog_v1.json`;
const OUTPUT_DIR = `${ROOT}\\assets\\lottie`;

const WIDTH = 400;
const HEIGHT = 400;
const FPS = 30;
const IN_POINT = 0;
const OUT_POINT = 60;

const EASE_IN = { x: [0.42], y: [1] };
const EASE_OUT = { x: [0.58], y: [0] };

const COLORS = {
  background: hex('#0f172a'),
  outline: hex('#0b4f49'),
  body: hex('#14b8a6'),
  bodyShadow: hex('#0d9488'),
  head: hex('#f1c7a6'),
  headShadow: hex('#dca985'),
  shadow: hex('#020617', 0.28)
};

const PART_SPECS = {
  shadow: { type: 'ellipse', size: [132, 24], color: COLORS.shadow, stroke: null, name: 'Shadow' },
  torso: { type: 'rect', size: [58, 92], roundness: 22, color: COLORS.body, stroke: COLORS.outline, name: 'Torso' },
  head: { type: 'head', size: [34, 34], color: COLORS.head, stroke: COLORS.headShadow, name: 'Head' },
  lUpperArm: { type: 'rect', size: [14, 48], roundness: 7, color: COLORS.body, stroke: COLORS.outline, name: 'Left Upper Arm' },
  lForearm: { type: 'rect', size: [12, 42], roundness: 6, color: COLORS.bodyShadow, stroke: COLORS.outline, name: 'Left Forearm' },
  rUpperArm: { type: 'rect', size: [14, 48], roundness: 7, color: COLORS.body, stroke: COLORS.outline, name: 'Right Upper Arm' },
  rForearm: { type: 'rect', size: [12, 42], roundness: 6, color: COLORS.bodyShadow, stroke: COLORS.outline, name: 'Right Forearm' },
  lUpperLeg: { type: 'rect', size: [18, 62], roundness: 9, color: COLORS.body, stroke: COLORS.outline, name: 'Left Upper Leg' },
  lLowerLeg: { type: 'rect', size: [16, 56], roundness: 8, color: COLORS.bodyShadow, stroke: COLORS.outline, name: 'Left Lower Leg' },
  rUpperLeg: { type: 'rect', size: [18, 62], roundness: 9, color: COLORS.body, stroke: COLORS.outline, name: 'Right Upper Leg' },
  rLowerLeg: { type: 'rect', size: [16, 56], roundness: 8, color: COLORS.bodyShadow, stroke: COLORS.outline, name: 'Right Lower Leg' }
};

const DEFAULT_POSE = {
  shadow: { p: [200, 336, 0], r: 0, s: [100, 100, 100], o: 100 },
  root: { p: [200, 84, 0], r: 0, s: [100, 100, 100], o: 100 },
  torso: { p: [0, 0, 0], r: 0, s: [100, 100, 100], o: 100 },
  head: { p: [0, -30, 0], r: 0, s: [100, 100, 100], o: 100 },
  lUpperArm: { p: [-30, 10, 0], r: -16, s: [100, 100, 100], o: 100 },
  lForearm: { p: [0, 48, 0], r: -8, s: [100, 100, 100], o: 100 },
  rUpperArm: { p: [30, 10, 0], r: 16, s: [100, 100, 100], o: 100 },
  rForearm: { p: [0, 48, 0], r: 8, s: [100, 100, 100], o: 100 },
  lUpperLeg: { p: [-17, 92, 0], r: 6, s: [100, 100, 100], o: 100 },
  lLowerLeg: { p: [0, 62, 0], r: 0, s: [100, 100, 100], o: 100 },
  rUpperLeg: { p: [17, 92, 0], r: -6, s: [100, 100, 100], o: 100 },
  rLowerLeg: { p: [0, 62, 0], r: 0, s: [100, 100, 100], o: 100 }
};

const POSES = {
  standing: createPose(DEFAULT_POSE),
  seated: createPose(DEFAULT_POSE, {
    root: { p: [200, 126, 0] },
    shadow: { p: [200, 338, 0], s: [110, 90, 100] },
    torso: { r: -6 },
    lUpperArm: { r: -28 },
    lForearm: { r: -18 },
    rUpperArm: { r: 28 },
    rForearm: { r: 18 },
    lUpperLeg: { r: 54 },
    lLowerLeg: { r: -34 },
    rUpperLeg: { r: -54 },
    rLowerLeg: { r: 34 }
  }),
  lying: createPose(DEFAULT_POSE, {
    root: { p: [126, 164, 0], r: 90 },
    shadow: { p: [202, 312, 0], s: [82, 72, 100], o: 70 },
    lUpperArm: { r: -78 },
    lForearm: { r: -12 },
    rUpperArm: { r: 78 },
    rForearm: { r: 12 }
  }),
  prone: createPose(DEFAULT_POSE, {
    root: { p: [126, 190, 0], r: 90 },
    shadow: { p: [202, 316, 0], s: [80, 70, 100], o: 65 },
    lUpperArm: { r: -100 },
    lForearm: { r: -10 },
    rUpperArm: { r: 100 },
    rForearm: { r: 10 }
  }),
  plank: createPose(DEFAULT_POSE, {
    root: { p: [122, 158, 0], r: 84 },
    shadow: { p: [208, 324, 0], s: [102, 82, 100], o: 72 },
    lUpperArm: { r: -34 },
    lForearm: { r: -24 },
    rUpperArm: { r: 34 },
    rForearm: { r: 24 },
    lUpperLeg: { r: 4 },
    rUpperLeg: { r: -4 }
  }),
  tabletop: createPose(DEFAULT_POSE, {
    root: { p: [136, 140, 0], r: 62 },
    shadow: { p: [205, 330, 0], s: [108, 82, 100], o: 72 },
    torso: { r: 4 },
    lUpperArm: { r: -4 },
    lForearm: { r: -88 },
    rUpperArm: { r: 4 },
    rForearm: { r: 88 },
    lUpperLeg: { r: 10 },
    lLowerLeg: { r: 82 },
    rUpperLeg: { r: -10 },
    rLowerLeg: { r: -82 }
  }),
  kneeling: createPose(DEFAULT_POSE, {
    root: { p: [200, 132, 0] },
    shadow: { p: [200, 336, 0], s: [106, 90, 100] },
    lUpperLeg: { r: 2 },
    lLowerLeg: { r: 84 },
    rUpperLeg: { r: -2 },
    rLowerLeg: { r: -84 }
  }),
  bridge: createPose(DEFAULT_POSE, {
    root: { p: [126, 214, 0], r: 90 },
    shadow: { p: [202, 326, 0], s: [88, 72, 100], o: 72 },
    torso: { r: 0 },
    lUpperArm: { r: -100 },
    lForearm: { r: -6 },
    rUpperArm: { r: 100 },
    rForearm: { r: 6 },
    lUpperLeg: { r: 46 },
    lLowerLeg: { r: 28 },
    rUpperLeg: { r: -46 },
    rLowerLeg: { r: -28 }
  }),
  wall: createPose(DEFAULT_POSE, {
    root: { p: [230, 88, 0] },
    shadow: { p: [214, 336, 0], s: [96, 80, 100] },
    torso: { r: 10 },
    lUpperArm: { r: -56 },
    lForearm: { r: -34 },
    rUpperArm: { r: 56 },
    rForearm: { r: 34 }
  }),
  chair: createPose(DEFAULT_POSE, {
    root: { p: [200, 134, 0] },
    shadow: { p: [200, 338, 0], s: [118, 90, 100] },
    torso: { r: -4 },
    lUpperArm: { r: -58 },
    lForearm: { r: 84 },
    rUpperArm: { r: 58 },
    rForearm: { r: -84 },
    lUpperLeg: { r: 78 },
    lLowerLeg: { r: -82 },
    rUpperLeg: { r: -78 },
    rLowerLeg: { r: 82 }
  })
};

const EXERCISES = Object.create(null);

register(
  ['kapalbhati', 'ujjayi'],
  breathingDef('padmasana', { pose: 'seated', torsoMidScale: [108, 104, 100], rootBob: [0, -2, 0], headBob: [0, -1, 0] })
);
register(
  ['deep-belly-breathing'],
  breathingDef('Deep Belly Breathing', { pose: 'lying', torsoMidScale: [110, 108, 100], rootBob: [0, -2, 0] })
);
register(
  ['anulom-vilom'],
  breathingDef('Anulom Vilom', {
    pose: 'seated',
    overrides: { rUpperArm: { r: 42 }, rForearm: { r: -62 }, lUpperArm: { r: -8 }, lForearm: { r: -18 } },
    torsoMidScale: [106, 103, 100],
    extraMotion: { rForearm: { r: alternating(-62, -48) } }
  })
);
register(
  ['bhramari'],
  breathingDef('Bhramari', {
    pose: 'seated',
    overrides: { lUpperArm: { r: -72 }, lForearm: { r: 24 }, rUpperArm: { r: 72 }, rForearm: { r: -24 } },
    torsoMidScale: [106, 103, 100]
  })
);
register(
  ['sheetali'],
  breathingDef('Sheetali', {
    pose: 'seated',
    overrides: { lUpperArm: { r: -24 }, lForearm: { r: -6 }, rUpperArm: { r: 24 }, rForearm: { r: 6 } },
    torsoMidScale: [106, 103, 100],
    headBob: [0, -2, 0]
  })
);

register(['crunches'], crunchDef('Crunches'));
register(['bicycle-crunches'], bicycleCrunchDef());
register(['reverse-crunches'], reverseCrunchDef());
register(['leg-raises'], legRaiseDef('Leg Raises', 0, -74));
register(['flutter-kicks'], flutterKickDef());
register(['russian-twists'], russianTwistDef());
register(['plank-hold', 'plank-hold-core'], plankHoldDef('Plank Hold'));
register(['side-plank', 'side-plank-core'], sidePlankDef('Side Plank'));
register(['plank-hip-dips'], sidePlankDipDef());
register(['mountain-climbers'], mountainClimberDef());
register(['v-ups'], vUpsDef());
register(['dead-bug', 'dead-bug-core'], deadBugDef());
register(['heel-taps'], heelTapsDef());
register(['toe-touches'], toeTouchesDef());
register(['scissor-kicks'], scissorKickDef());
register(['plank-shoulder-taps', 'shoulder-taps-plank'], shoulderTapsPlankDef());
register(['knee-to-elbow-plank'], kneeToElbowPlankDef());
register(['boat-hold', 'naukasana'], boatHoldDef('Boat Hold'));
register(['plank-jacks', 'plank-jacks-hiit'], plankJacksDef());
register(['burpees', 'burpees-hiit'], burpeeDef('Burpees'));

register(['surya-namaskar'], suryaNamaskarDef());
register(['tadasana'], tadasanaDef());
register(['utkatasana'], utkatasanaDef());
register(['virabhadrasana-i'], warriorOneDef());
register(['virabhadrasana-ii'], warriorTwoDef());
register(['trikonasana'], trikonasanaDef());
register(['downward-dog'], downwardDogDef());
register(['bhujangasana'], cobraDef());
register(['dhanurasana'], dhanurasanaDef());
register(['setu-bandhasana'], bridgeDef('Setu Bandhasana'));
register(['balasana'], childPoseDef());
register(['vajrasana'], breathingDef('Vajrasana', { pose: 'kneeling', torsoMidScale: [104, 104, 100], rootBob: [0, -2, 0] }));
register(['paschimottanasana'], forwardFoldSeatDef());
register(['ustrasana'], camelPoseDef());
register(['halasana'], halasanaDef());
register(['matsyasana'], matsyasanaDef());
register(['cat-cow', 'cat-cow-stretch'], catCowDef('Cat Cow'));
register(['shavasana'], breathingDef('Shavasana', { pose: 'lying', torsoMidScale: [104, 103, 100], rootBob: [0, -1, 0] }));
register(['padmasana'], breathingDef('Padmasana', { pose: 'seated', torsoMidScale: [104, 104, 100], rootBob: [0, -2, 0] }));

register(['jumping-jacks'], jumpingJacksDef());
register(['high-knees'], highKneesDef());
register(['butt-kicks'], buttKicksDef());
register(['jump-squats-hiit', 'jump-squats-lower', 'squat-jumps'], jumpSquatDef('Jump Squats'));
register(['star-jumps'], starJumpsDef());
register(['skaters'], skatersDef());
register(['tuck-jumps'], tuckJumpsDef());
register(['squat-thrusts'], squatThrustDef());
register(['fast-feet'], fastFeetDef());
register(['lateral-shuffles'], lateralShuffleDef());

register(['push-ups-standard'], pushupDef('Push-ups', {}));
register(['wide-push-ups'], pushupDef('Wide Push-ups', { armSpread: 10 }));
register(['diamond-push-ups'], pushupDef('Diamond Push-ups', { armSpread: -8 }));
register(['pike-push-ups'], pikePushupDef());
register(['knee-push-ups'], kneePushupDef());
register(['tricep-dips-chair'], tricepDipDef());
register(['superman-hold', 'superman-core'], supermanDef('Superman Hold'));
register(['arm-circles'], armCirclesDef());
register(['inchworms', 'inchworm'], inchwormDef('Inchworm'));
register(['reverse-snow-angels'], reverseSnowAngelDef());
register(['wall-push-ups', 'desk-push-ups'], wallPushupDef('Wall Push-ups'));
register(['plank-walk'], plankWalkDef());
register(['ab-rollout-towel'], abRolloutDef());
register(['plank-to-pushup'], plankToPushupDef());
register(['walk-out-pushup'], walkOutPushupDef());

register(['bodyweight-squats'], squatDef('Bodyweight Squats', 0));
register(['sumo-squats'], squatDef('Sumo Squats', 20));
register(['forward-lunges'], lungeDef('Forward Lunges', 'forward'));
register(['reverse-lunges'], lungeDef('Reverse Lunges', 'reverse'));
register(['wall-sit'], wallSitDef());
register(['glute-bridges'], bridgeDef('Glute Bridges'));
register(['single-leg-bridges'], singleLegBridgeDef());
register(['calf-raises', 'standing-calf-raises'], calfRaiseDef());
register(['donkey-kicks'], donkeyKickDef());
register(['fire-hydrants'], fireHydrantDef());
register(['side-leg-raises'], sideLegRaiseDef());
register(['bird-dog'], birdDogDef());
register(['hollow-hold'], hollowHoldDef());

register(['neck-rolls', 'desk-neck-rolls'], neckRollDef('Neck Rolls'));
register(['shoulder-stretch'], shoulderStretchDef());
register(['chest-opener'], chestOpenerDef());
register(['quad-stretch'], quadStretchDef());
register(['hamstring-stretch-standing'], standingHamstringStretchDef());
register(['hip-flexor-stretch', 'hip-flexor-stretch-standing'], hipFlexorStretchDef());
register(['spinal-twist-lying'], lyingSpinalTwistDef());
register(['seated-shoulder-shrugs'], seatedShoulderShrugDef());
register(['seated-spinal-twist'], seatedTwistDef());
register(['wrist-circles'], wristCirclesDef());
register(['desk-chair-squats'], squatDef('Desk Chair Squats', 0));

register(['squat-to-press'], squatToPressDef());
register(['bear-crawl'], bearCrawlDef());
register(['turkish-getup-lite'], turkishGetupLiteDef());
register(['sprawl'], sprawlDef());

generateAll();

function generateAll() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
  const exercises = catalog.exercises || [];
  const uniqueIds = [...new Set(exercises.map((exercise) => exercise.id))];

  ensureDir(OUTPUT_DIR);

  const missing = uniqueIds.filter((id) => !EXERCISES[id]);
  if (missing.length) {
    throw new Error(`Missing animation definitions for: ${missing.join(', ')}`);
  }

  for (const exercise of exercises) {
    const outputPath = `${OUTPUT_DIR}\\${exercise.id}.json`;
    if (fs.existsSync(outputPath)) continue;
    const definition = EXERCISES[exercise.id];
    const animation = createLottie(exercise.name, definition);
    fs.writeFileSync(outputPath, JSON.stringify(animation));
  }

  for (const id of uniqueIds) {
    const exercise = exercises.find((entry) => entry.id === id);
    const outputPath = `${OUTPUT_DIR}\\${id}.json`;
    const animation = createLottie(exercise?.name || id, EXERCISES[id]);
    fs.writeFileSync(outputPath, JSON.stringify(animation));
  }

  const files = fs.readdirSync(OUTPUT_DIR).filter((file) => file.endsWith('.json') && file !== 'jumping_jacks.json');
  const sizes = files.map((file) => ({
    file,
    sizeKB: +(fs.statSync(`${OUTPUT_DIR}\\${file}`).size / 1024).toFixed(1)
  }));
  const sizeSummary = summarizeSizes(sizes);

  console.log(`Generated ${uniqueIds.length} exercise Lottie files in ${OUTPUT_DIR}`);
  console.log(`Size range: ${sizeSummary.min}KB - ${sizeSummary.max}KB, avg ${sizeSummary.avg}KB`);
}

function createLottie(name, definition) {
  return {
    v: '5.7.6',
    fr: FPS,
    ip: IN_POINT,
    op: OUT_POINT,
    w: WIDTH,
    h: HEIGHT,
    nm: name,
    ddd: 0,
    assets: [],
    layers: createBody(definition)
  };
}

function createBody(definition) {
  const pose = createPose(POSES[definition.pose || 'standing'], definition.overrides || {});
  const motion = definition.motion || {};

  const indices = {
    background: 1,
    shadow: 2,
    root: 3,
    lUpperLeg: 4,
    lLowerLeg: 5,
    rUpperLeg: 6,
    rLowerLeg: 7,
    torso: 8,
    lUpperArm: 9,
    lForearm: 10,
    rUpperArm: 11,
    rForearm: 12,
    head: 13
  };

  return [
    createBackgroundLayer(indices.background),
    createShapeLayer(indices.shadow, 'shadow', null, resolveTransform('shadow', pose, motion)),
    createNullLayer(indices.root, resolveTransform('root', pose, motion)),
    createShapeLayer(indices.lUpperLeg, 'lUpperLeg', indices.root, resolveTransform('lUpperLeg', pose, motion)),
    createShapeLayer(indices.lLowerLeg, 'lLowerLeg', indices.lUpperLeg, resolveTransform('lLowerLeg', pose, motion)),
    createShapeLayer(indices.rUpperLeg, 'rUpperLeg', indices.root, resolveTransform('rUpperLeg', pose, motion)),
    createShapeLayer(indices.rLowerLeg, 'rLowerLeg', indices.rUpperLeg, resolveTransform('rLowerLeg', pose, motion)),
    createShapeLayer(indices.torso, 'torso', indices.root, resolveTransform('torso', pose, motion)),
    createShapeLayer(indices.lUpperArm, 'lUpperArm', indices.torso, resolveTransform('lUpperArm', pose, motion)),
    createShapeLayer(indices.lForearm, 'lForearm', indices.lUpperArm, resolveTransform('lForearm', pose, motion)),
    createShapeLayer(indices.rUpperArm, 'rUpperArm', indices.torso, resolveTransform('rUpperArm', pose, motion)),
    createShapeLayer(indices.rForearm, 'rForearm', indices.rUpperArm, resolveTransform('rForearm', pose, motion)),
    createShapeLayer(indices.head, 'head', indices.torso, resolveTransform('head', pose, motion))
  ];
}

function createBackgroundLayer(ind) {
  return {
    ddd: 0,
    ind,
    ty: 4,
    nm: 'Background',
    sr: 1,
    ks: baseKs({ p: [0, 0, 0], a: [0, 0, 0] }),
    shapes: [
      group('Background', [
        rectShape(WIDTH, HEIGHT, WIDTH / 12, [WIDTH / 2, HEIGHT / 2]),
        fill(COLORS.background)
      ])
    ],
    ip: IN_POINT,
    op: OUT_POINT,
    st: 0,
    bm: 0
  };
}

function createNullLayer(ind, transform) {
  return {
    ddd: 0,
    ind,
    ty: 3,
    nm: 'Body Root',
    sr: 1,
    ks: baseKs(transform),
    ip: IN_POINT,
    op: OUT_POINT,
    st: 0
  };
}

function createShapeLayer(ind, partKey, parent, transform) {
  const spec = PART_SPECS[partKey];
  return {
    ddd: 0,
    ind,
    ty: 4,
    nm: spec.name,
    parent: parent || undefined,
    sr: 1,
    ks: baseKs(transform),
    shapes: [shapeGroupForPart(spec)],
    ip: IN_POINT,
    op: OUT_POINT,
    st: 0,
    bm: 0
  };
}

function shapeGroupForPart(spec) {
  if (spec.type === 'head') {
    return group(spec.name, [
      ellipseShape(spec.size),
      fill(spec.color),
      stroke(spec.stroke, 4),
      ellipseHighlight()
    ]);
  }

  if (spec.type === 'ellipse') {
    return group(spec.name, [
      ellipseShape(spec.size),
      fill(spec.color)
    ]);
  }

  return group(spec.name, [
    rectShape(spec.size[0], spec.size[1], spec.roundness, [0, spec.size[1] / 2]),
    fill(spec.color),
    stroke(spec.stroke, 4)
  ]);
}

function resolveTransform(partKey, pose, motion) {
  const base = pose[partKey] || {};
  const animated = motion[partKey] || {};
  return {
    o: animated.o || base.o || 100,
    r: animated.r ?? base.r ?? 0,
    p: animated.p || base.p || [0, 0, 0],
    a: base.a || [0, 0, 0],
    s: animated.s || base.s || [100, 100, 100]
  };
}

function baseKs(transform) {
  return {
    o: property(transform.o ?? 100),
    r: property(transform.r ?? 0),
    p: property(transform.p ?? [0, 0, 0], true),
    a: property(transform.a ?? [0, 0, 0], true),
    s: property(transform.s ?? [100, 100, 100], true)
  };
}

function property(value, vector3 = false) {
  if (isAnimation(value)) {
    return {
      a: 1,
      k: value.values.map((entry, index) => {
        const frame = value.times[index];
        const payload = { t: frame, s: keyValue(entry, vector3) };
        if (index < value.values.length - 1) {
          payload.i = EASE_IN;
          payload.o = EASE_OUT;
        }
        return payload;
      })
    };
  }

  return {
    a: 0,
    k: staticValue(value, vector3)
  };
}

function keyValue(value, vector3 = false) {
  if (Array.isArray(value)) return vector3 && value.length === 2 ? [value[0], value[1], 0] : value;
  return [value];
}

function staticValue(value, vector3 = false) {
  if (Array.isArray(value)) return vector3 && value.length === 2 ? [value[0], value[1], 0] : value;
  return value;
}

function rectShape(width, height, roundness, position = [0, height / 2]) {
  return {
    ty: 'rc',
    d: 1,
    s: { a: 0, k: [width, height] },
    p: { a: 0, k: position },
    r: { a: 0, k: roundness },
    nm: 'Path'
  };
}

function ellipseShape(size) {
  return {
    ty: 'el',
    d: 1,
    s: { a: 0, k: size },
    p: { a: 0, k: [0, 0] },
    nm: 'Path'
  };
}

function fill(color) {
  return {
    ty: 'fl',
    c: { a: 0, k: color },
    o: { a: 0, k: 100 },
    r: 1,
    bm: 0,
    nm: 'Fill'
  };
}

function stroke(color, width) {
  return {
    ty: 'st',
    c: { a: 0, k: color },
    o: { a: 0, k: 100 },
    w: { a: 0, k: width },
    lc: 2,
    lj: 2,
    bm: 0,
    nm: 'Stroke'
  };
}

function ellipseHighlight() {
  return {
    ty: 'gr',
    it: [
      {
        ty: 'el',
        d: 1,
        s: { a: 0, k: [12, 8] },
        p: { a: 0, k: [8, -6] },
        nm: 'Path'
      },
      {
        ty: 'fl',
        c: { a: 0, k: [1, 1, 1, 0.18] },
        o: { a: 0, k: 18 },
        r: 1,
        bm: 0,
        nm: 'Fill'
      },
      groupTransform()
    ],
    nm: 'Highlight',
    np: 2,
    cix: 2,
    bm: 0
  };
}

function group(name, items) {
  return {
    ty: 'gr',
    it: [...items, groupTransform()],
    nm: name,
    np: items.length,
    cix: 2,
    bm: 0
  };
}

function groupTransform() {
  return {
    ty: 'tr',
    p: { a: 0, k: [0, 0] },
    a: { a: 0, k: [0, 0] },
    s: { a: 0, k: [100, 100] },
    r: { a: 0, k: 0 },
    o: { a: 0, k: 100 },
    sk: { a: 0, k: 0 },
    sa: { a: 0, k: 0 },
    nm: 'Transform'
  };
}

function breathingDef(name, options = {}) {
  const poseName = options.pose || 'standing';
  const pose = POSES[poseName];
  return {
    pose: poseName,
    label: name,
    overrides: options.overrides || {},
    motion: {
      root: { p: createKeyframes(pose.root.p, add(pose.root.p, options.rootBob || [0, -3, 0]), pose.root.p) },
      torso: { s: createKeyframes([100, 100, 100], options.torsoMidScale || [106, 106, 100], [100, 100, 100]) },
      head: { p: createKeyframes(pose.head.p, add(pose.head.p, options.headBob || [0, -1, 0]), pose.head.p) },
      ...(options.extraMotion || {})
    }
  };
}

function crunchDef(name) {
  const pose = POSES.lying;
  return {
    pose: 'lying',
    label: name,
    overrides: {
      lUpperArm: { r: -96 },
      lForearm: { r: 12 },
      rUpperArm: { r: 96 },
      rForearm: { r: -12 },
      lUpperLeg: { r: 30 },
      lLowerLeg: { r: 54 },
      rUpperLeg: { r: -30 },
      rLowerLeg: { r: -54 }
    },
    motion: {
      torso: { r: createKeyframes(0, -28, 0), p: createKeyframes([0, 0, 0], [6, -10, 0], [0, 0, 0]) },
      head: { p: createKeyframes(pose.head.p, add(pose.head.p, [8, -8, 0]), pose.head.p) },
      shadow: { s: createKeyframes(pose.shadow.s, add(pose.shadow.s, [8, 4, 0]), pose.shadow.s) }
    }
  };
}

function bicycleCrunchDef() {
  return {
    pose: 'lying',
    overrides: {
      lUpperArm: { r: -96 },
      lForearm: { r: 12 },
      rUpperArm: { r: 96 },
      rForearm: { r: -12 }
    },
    motion: {
      torso: { r: createSequence([0, -16, 0, 16, 0]) },
      lUpperLeg: { r: createSequence([30, -28, 30, 72, 30]) },
      lLowerLeg: { r: createSequence([42, 18, 42, 68, 42]) },
      rUpperLeg: { r: createSequence([-30, -72, -30, 28, -30]) },
      rLowerLeg: { r: createSequence([-42, -68, -42, -18, -42]) }
    }
  };
}

function reverseCrunchDef() {
  const pose = POSES.lying;
  return {
    pose: 'lying',
    overrides: {
      lUpperLeg: { r: 18 },
      lLowerLeg: { r: 54 },
      rUpperLeg: { r: -18 },
      rLowerLeg: { r: -54 }
    },
    motion: {
      root: { p: createKeyframes(pose.root.p, add(pose.root.p, [4, -12, 0]), pose.root.p) },
      lUpperLeg: { r: createKeyframes(18, -54, 18) },
      lLowerLeg: { r: createKeyframes(54, 18, 54) },
      rUpperLeg: { r: createKeyframes(-18, 54, -18) },
      rLowerLeg: { r: createKeyframes(-54, -18, -54) }
    }
  };
}

function legRaiseDef(label, start, mid) {
  return {
    pose: 'lying',
    motion: {
      lUpperLeg: { r: createKeyframes(start, mid, start) },
      lLowerLeg: { r: createKeyframes(0, -8, 0) },
      rUpperLeg: { r: createKeyframes(-start, -mid, -start) },
      rLowerLeg: { r: createKeyframes(0, 8, 0) }
    },
    label
  };
}

function flutterKickDef() {
  return {
    pose: 'lying',
    motion: {
      lUpperLeg: { r: alternating(-10, -34) },
      rUpperLeg: { r: alternating(10, 34) },
      lLowerLeg: { r: alternating(4, -10) },
      rLowerLeg: { r: alternating(-4, 10) }
    }
  };
}

function russianTwistDef() {
  const pose = POSES.seated;
  return {
    pose: 'seated',
    overrides: {
      lUpperArm: { r: -12 },
      lForearm: { r: -16 },
      rUpperArm: { r: 12 },
      rForearm: { r: 16 }
    },
    motion: {
      root: { p: createKeyframes(pose.root.p, add(pose.root.p, [0, -4, 0]), pose.root.p) },
      torso: { r: createSequence([-18, 18, -18, 18, -18]) },
      head: { r: createSequence([-12, 12, -12, 12, -12]) },
      lUpperArm: { r: createSequence([-6, -32, -6, 12, -6]) },
      rUpperArm: { r: createSequence([6, 32, 6, -12, 6]) }
    }
  };
}

function plankHoldDef(label) {
  const pose = POSES.plank;
  return {
    pose: 'plank',
    label,
    motion: {
      root: { p: createKeyframes(pose.root.p, add(pose.root.p, [0, 3, 0]), pose.root.p) },
      shadow: { s: createKeyframes(pose.shadow.s, add(pose.shadow.s, [6, 4, 0]), pose.shadow.s) }
    }
  };
}

function sidePlankDef(label) {
  const pose = POSES.plank;
  return {
    pose: 'plank',
    label,
    overrides: {
      root: { r: 92, p: [150, 158, 0] },
      lUpperArm: { r: -10 },
      lForearm: { r: -88 },
      rUpperArm: { r: 120 },
      rForearm: { r: 0 },
      lUpperLeg: { r: 0 },
      rUpperLeg: { r: 0 }
    },
    motion: {
      root: { p: createKeyframes([150, 158, 0], [150, 154, 0], [150, 158, 0]) },
      shadow: { s: createKeyframes(pose.shadow.s, add(pose.shadow.s, [-8, -4, 0]), pose.shadow.s) }
    }
  };
}

function sidePlankDipDef() {
  return {
    pose: 'plank',
    overrides: {
      root: { r: 92, p: [150, 158, 0] },
      lUpperArm: { r: -10 },
      lForearm: { r: -88 },
      rUpperArm: { r: 120 },
      rForearm: { r: 0 }
    },
    motion: {
      root: { p: createKeyframes([150, 158, 0], [150, 170, 0], [150, 158, 0]), r: createKeyframes(92, 100, 92) }
    }
  };
}

function mountainClimberDef() {
  return {
    pose: 'plank',
    motion: {
      lUpperLeg: { r: createSequence([8, -38, 8, 20, 8]) },
      lLowerLeg: { r: createSequence([0, 62, 0, 18, 0]) },
      rUpperLeg: { r: createSequence([-8, -20, -8, 38, -8]) },
      rLowerLeg: { r: createSequence([0, -18, 0, -62, 0]) },
      root: { p: createKeyframes(POSES.plank.root.p, add(POSES.plank.root.p, [0, 3, 0]), POSES.plank.root.p) }
    }
  };
}

function vUpsDef() {
  return {
    pose: 'lying',
    overrides: {
      lUpperArm: { r: -124 },
      lForearm: { r: 0 },
      rUpperArm: { r: 124 },
      rForearm: { r: 0 }
    },
    motion: {
      torso: { r: createKeyframes(0, -38, 0), p: createKeyframes([0, 0, 0], [10, -10, 0], [0, 0, 0]) },
      lUpperLeg: { r: createKeyframes(0, -68, 0) },
      rUpperLeg: { r: createKeyframes(0, 68, 0) }
    }
  };
}

function deadBugDef() {
  return {
    pose: 'lying',
    overrides: {
      lUpperArm: { r: -108 },
      rUpperArm: { r: 108 }
    },
    motion: {
      lUpperArm: { r: createSequence([-108, -138, -108, -88, -108]) },
      rUpperArm: { r: createSequence([108, 88, 108, 138, 108]) },
      lUpperLeg: { r: createSequence([16, -30, 16, 40, 16]) },
      rUpperLeg: { r: createSequence([-16, -40, -16, 30, -16]) },
      lLowerLeg: { r: createSequence([44, 8, 44, 60, 44]) },
      rLowerLeg: { r: createSequence([-44, -60, -44, -8, -44]) }
    }
  };
}

function heelTapsDef() {
  return {
    pose: 'lying',
    overrides: {
      torso: { r: -18 },
      lUpperLeg: { r: 42 },
      lLowerLeg: { r: 52 },
      rUpperLeg: { r: -42 },
      rLowerLeg: { r: -52 },
      lUpperArm: { r: -74 },
      rUpperArm: { r: 74 }
    },
    motion: {
      torso: { r: createSequence([-18, -30, -18, -6, -18]) },
      lUpperArm: { r: createSequence([-74, -96, -74, -48, -74]) },
      rUpperArm: { r: createSequence([74, 48, 74, 96, 74]) }
    }
  };
}

function toeTouchesDef() {
  return {
    pose: 'lying',
    overrides: {
      lUpperArm: { r: -138 },
      rUpperArm: { r: 138 }
    },
    motion: {
      torso: { r: createKeyframes(0, -44, 0) },
      lUpperLeg: { r: createKeyframes(0, -82, 0) },
      rUpperLeg: { r: createKeyframes(0, 82, 0) },
      head: { p: createKeyframes(POSES.lying.head.p, add(POSES.lying.head.p, [6, -6, 0]), POSES.lying.head.p) }
    }
  };
}

function scissorKickDef() {
  return {
    pose: 'lying',
    motion: {
      lUpperLeg: { r: createSequence([16, -22, 16, 44, 16]) },
      rUpperLeg: { r: createSequence([-16, -44, -16, 22, -16]) }
    }
  };
}

function shoulderTapsPlankDef() {
  return {
    pose: 'plank',
    motion: {
      lUpperArm: { r: createSequence([-34, -18, -34, -50, -34]) },
      lForearm: { r: createSequence([-24, 34, -24, -44, -24]) },
      rUpperArm: { r: createSequence([34, 50, 34, 18, 34]) },
      rForearm: { r: createSequence([24, 44, 24, -34, 24]) },
      root: { r: createSequence([84, 82, 84, 86, 84]) }
    }
  };
}

function kneeToElbowPlankDef() {
  return {
    pose: 'plank',
    motion: {
      lUpperLeg: { r: createSequence([8, -40, 8, 12, 8]) },
      lLowerLeg: { r: createSequence([0, 58, 0, 12, 0]) },
      root: { r: createSequence([84, 90, 84, 82, 84]) }
    }
  };
}

function boatHoldDef(label) {
  const pose = POSES.seated;
  return {
    pose: 'seated',
    label,
    overrides: {
      torso: { r: -20 },
      lUpperLeg: { r: -24 },
      lLowerLeg: { r: -10 },
      rUpperLeg: { r: 24 },
      rLowerLeg: { r: 10 },
      lUpperArm: { r: -42 },
      rUpperArm: { r: 42 }
    },
    motion: {
      root: { p: createKeyframes(pose.root.p, add(pose.root.p, [0, -4, 0]), pose.root.p) },
      torso: { r: createKeyframes(-20, -28, -20) },
      lUpperLeg: { r: createKeyframes(-24, -38, -24) },
      rUpperLeg: { r: createKeyframes(24, 38, 24) }
    }
  };
}

function plankJacksDef() {
  return {
    pose: 'plank',
    motion: {
      lUpperLeg: { r: createSequence([6, 24, 6, 24, 6]) },
      rUpperLeg: { r: createSequence([-6, -24, -6, -24, -6]) },
      root: { p: createKeyframes(POSES.plank.root.p, add(POSES.plank.root.p, [0, 2, 0]), POSES.plank.root.p) }
    }
  };
}

function burpeeDef(label) {
  return {
    pose: 'standing',
    label,
    motion: {
      root: {
        p: createSequence([[200, 84, 0], [200, 118, 0], [124, 156, 0], [200, 118, 0], [200, 84, 0]]),
        r: createSequence([0, 0, 84, 0, 0])
      },
      torso: { r: createSequence([0, -18, 0, -18, 0]) },
      lUpperArm: { r: createSequence([-16, -48, -34, -120, -16]) },
      rUpperArm: { r: createSequence([16, 48, 34, 120, 16]) },
      lUpperLeg: { r: createSequence([6, 38, 8, 46, 6]) },
      rUpperLeg: { r: createSequence([-6, -38, -8, -46, -6]) },
      lLowerLeg: { r: createSequence([0, 42, 0, 48, 0]) },
      rLowerLeg: { r: createSequence([0, -42, 0, -48, 0]) },
      shadow: { s: createSequence([[132, 24, 100], [146, 30, 100], [96, 18, 100], [146, 30, 100], [132, 24, 100]]) }
    }
  };
}

function suryaNamaskarDef() {
  return {
    pose: 'standing',
    motion: {
      root: { p: createSequence([[200, 84, 0], [200, 84, 0], [188, 116, 0], [170, 154, 0], [200, 84, 0]]) },
      torso: { r: createSequence([0, -12, 26, 88, 0]) },
      lUpperArm: { r: createSequence([-18, -132, -70, -10, -18]) },
      rUpperArm: { r: createSequence([18, 132, 70, 10, 18]) },
      lUpperLeg: { r: createSequence([6, 6, 18, 6, 6]) },
      rUpperLeg: { r: createSequence([-6, -6, -18, -6, -6]) }
    }
  };
}

function tadasanaDef() {
  return {
    pose: 'standing',
    motion: {
      lUpperArm: { r: createKeyframes(-18, -138, -18) },
      lForearm: { r: createKeyframes(-8, -6, -8) },
      rUpperArm: { r: createKeyframes(18, 138, 18) },
      rForearm: { r: createKeyframes(8, 6, 8) },
      root: { p: createKeyframes(POSES.standing.root.p, add(POSES.standing.root.p, [0, -4, 0]), POSES.standing.root.p) }
    }
  };
}

function utkatasanaDef() {
  return {
    pose: 'standing',
    motion: {
      root: { p: createKeyframes([200, 84, 0], [200, 120, 0], [200, 84, 0]) },
      torso: { r: createKeyframes(0, -10, 0) },
      lUpperArm: { r: createKeyframes(-18, -138, -18) },
      rUpperArm: { r: createKeyframes(18, 138, 18) },
      lUpperLeg: { r: createKeyframes(6, 34, 6) },
      rUpperLeg: { r: createKeyframes(-6, -34, -6) },
      lLowerLeg: { r: createKeyframes(0, 34, 0) },
      rLowerLeg: { r: createKeyframes(0, -34, 0) }
    }
  };
}

function warriorOneDef() {
  return {
    pose: 'standing',
    overrides: {
      lUpperLeg: { r: 22 },
      lLowerLeg: { r: 20 },
      rUpperLeg: { r: -54 },
      rLowerLeg: { r: -16 }
    },
    motion: {
      lUpperArm: { r: createKeyframes(-18, -144, -18) },
      rUpperArm: { r: createKeyframes(18, 144, 18) },
      root: { p: createKeyframes([196, 92, 0], [196, 98, 0], [196, 92, 0]) }
    }
  };
}

function warriorTwoDef() {
  return {
    pose: 'standing',
    overrides: {
      lUpperArm: { r: -92 },
      lForearm: { r: 0 },
      rUpperArm: { r: 92 },
      rForearm: { r: 0 },
      lUpperLeg: { r: 30 },
      lLowerLeg: { r: 20 },
      rUpperLeg: { r: -18 }
    },
    motion: {
      root: { p: createKeyframes([200, 92, 0], [200, 98, 0], [200, 92, 0]) }
    }
  };
}

function trikonasanaDef() {
  return {
    pose: 'standing',
    overrides: {
      lUpperArm: { r: -138 },
      rUpperArm: { r: 42 },
      lUpperLeg: { r: 18 },
      rUpperLeg: { r: -18 }
    },
    motion: {
      torso: { r: createSequence([-18, 32, -18, -4, -18]) },
      head: { r: createSequence([-8, 18, -8, 4, -8]) }
    }
  };
}

function downwardDogDef() {
  return {
    pose: 'plank',
    overrides: {
      root: { p: [140, 134, 0], r: 48 },
      lUpperArm: { r: -8 },
      lForearm: { r: -12 },
      rUpperArm: { r: 8 },
      rForearm: { r: 12 }
    },
    motion: {
      root: { r: createKeyframes(48, 42, 48), p: createKeyframes([140, 134, 0], [140, 128, 0], [140, 134, 0]) }
    }
  };
}

function cobraDef() {
  return {
    pose: 'prone',
    overrides: {
      lUpperArm: { r: -16 },
      lForearm: { r: -82 },
      rUpperArm: { r: 16 },
      rForearm: { r: 82 }
    },
    motion: {
      torso: { r: createKeyframes(0, -34, 0), p: createKeyframes([0, 0, 0], [0, -10, 0], [0, 0, 0]) },
      head: { p: createKeyframes(POSES.prone.head.p, add(POSES.prone.head.p, [8, -8, 0]), POSES.prone.head.p) }
    }
  };
}

function dhanurasanaDef() {
  return {
    pose: 'prone',
    overrides: {
      lUpperArm: { r: -136 },
      lForearm: { r: 48 },
      rUpperArm: { r: 136 },
      rForearm: { r: -48 },
      lUpperLeg: { r: 38 },
      lLowerLeg: { r: 64 },
      rUpperLeg: { r: -38 },
      rLowerLeg: { r: -64 }
    },
    motion: {
      torso: { r: createKeyframes(0, -22, 0) },
      lUpperLeg: { r: createKeyframes(38, 62, 38) },
      rUpperLeg: { r: createKeyframes(-38, -62, -38) }
    }
  };
}

function bridgeDef(label) {
  return {
    pose: 'bridge',
    label,
    motion: {
      root: { p: createKeyframes([126, 220, 0], [126, 198, 0], [126, 220, 0]) },
      torso: { r: createKeyframes(0, -18, 0) },
      shadow: { s: createKeyframes([88, 72, 100], [104, 80, 100], [88, 72, 100]) }
    }
  };
}

function childPoseDef() {
  return {
    pose: 'kneeling',
    overrides: {
      torso: { r: 82 },
      head: { p: [22, 68, 0] },
      lUpperArm: { r: -110 },
      lForearm: { r: -18 },
      rUpperArm: { r: 110 },
      rForearm: { r: 18 }
    },
    motion: {
      root: { p: createKeyframes([186, 136, 0], [188, 140, 0], [186, 136, 0]) }
    }
  };
}

function forwardFoldSeatDef() {
  return {
    pose: 'seated',
    overrides: {
      torso: { r: 58 },
      lUpperArm: { r: -32 },
      rUpperArm: { r: 32 },
      lUpperLeg: { r: 16 },
      rUpperLeg: { r: -16 }
    },
    motion: {
      torso: { r: createKeyframes(58, 72, 58) },
      head: { p: createKeyframes(POSES.seated.head.p, add(POSES.seated.head.p, [10, 8, 0]), POSES.seated.head.p) }
    }
  };
}

function camelPoseDef() {
  return {
    pose: 'kneeling',
    overrides: {
      torso: { r: -32 },
      lUpperArm: { r: -136 },
      lForearm: { r: 12 },
      rUpperArm: { r: 136 },
      rForearm: { r: -12 }
    },
    motion: {
      torso: { r: createKeyframes(-32, -42, -32) },
      head: { r: createKeyframes(0, -18, 0) }
    }
  };
}

function halasanaDef() {
  return {
    pose: 'lying',
    motion: {
      lUpperLeg: { r: createKeyframes(0, -144, 0) },
      rUpperLeg: { r: createKeyframes(0, 144, 0) },
      lLowerLeg: { r: createKeyframes(0, -14, 0) },
      rLowerLeg: { r: createKeyframes(0, 14, 0) },
      root: { p: createKeyframes(POSES.lying.root.p, add(POSES.lying.root.p, [-6, -10, 0]), POSES.lying.root.p) }
    }
  };
}

function matsyasanaDef() {
  return {
    pose: 'lying',
    overrides: {
      torso: { r: -12 },
      lUpperArm: { r: -110 },
      rUpperArm: { r: 110 }
    },
    motion: {
      torso: { r: createKeyframes(-12, -26, -12) },
      head: { p: createKeyframes(POSES.lying.head.p, add(POSES.lying.head.p, [6, -8, 0]), POSES.lying.head.p) }
    }
  };
}

function catCowDef(label) {
  return {
    pose: 'tabletop',
    label,
    motion: {
      torso: { r: createSequence([10, -14, 10, -14, 10]) },
      head: { r: createSequence([12, -18, 12, -18, 12]) },
      root: { p: createKeyframes(POSES.tabletop.root.p, add(POSES.tabletop.root.p, [0, -2, 0]), POSES.tabletop.root.p) }
    }
  };
}

function jumpingJacksDef() {
  return {
    pose: 'standing',
    motion: {
      root: { p: createKeyframes([200, 84, 0], [200, 72, 0], [200, 84, 0]) },
      lUpperArm: { r: createKeyframes(-16, -126, -16) },
      rUpperArm: { r: createKeyframes(16, 126, 16) },
      lUpperLeg: { r: createKeyframes(6, 34, 6) },
      rUpperLeg: { r: createKeyframes(-6, -34, -6) },
      shadow: { s: createKeyframes([132, 24, 100], [150, 32, 100], [132, 24, 100]) }
    }
  };
}

function highKneesDef() {
  return {
    pose: 'standing',
    motion: {
      lUpperArm: { r: createSequence([-18, 26, -18, -54, -18]) },
      rUpperArm: { r: createSequence([18, 54, 18, -26, 18]) },
      lUpperLeg: { r: createSequence([8, -36, 8, 20, 8]) },
      rUpperLeg: { r: createSequence([-8, -20, -8, 36, -8]) },
      lLowerLeg: { r: createSequence([0, 44, 0, 10, 0]) },
      rLowerLeg: { r: createSequence([0, -10, 0, -44, 0]) },
      root: { p: createKeyframes([200, 84, 0], [200, 78, 0], [200, 84, 0]) }
    }
  };
}

function buttKicksDef() {
  return {
    pose: 'standing',
    motion: {
      lUpperArm: { r: createSequence([-18, 18, -18, -40, -18]) },
      rUpperArm: { r: createSequence([18, 40, 18, -18, 18]) },
      lUpperLeg: { r: createSequence([8, 24, 8, 8, 8]) },
      rUpperLeg: { r: createSequence([-8, -8, -8, -24, -8]) },
      lLowerLeg: { r: createSequence([0, 72, 0, 10, 0]) },
      rLowerLeg: { r: createSequence([0, -10, 0, -72, 0]) },
      root: { p: createKeyframes([200, 84, 0], [200, 78, 0], [200, 84, 0]) }
    }
  };
}

function jumpSquatDef(label) {
  return {
    pose: 'standing',
    label,
    motion: {
      root: { p: createSequence([[200, 84, 0], [200, 124, 0], [200, 62, 0], [200, 124, 0], [200, 84, 0]]) },
      lUpperArm: { r: createSequence([-18, 10, -98, 10, -18]) },
      rUpperArm: { r: createSequence([18, -10, 98, -10, 18]) },
      lUpperLeg: { r: createSequence([6, 36, 12, 36, 6]) },
      rUpperLeg: { r: createSequence([-6, -36, -12, -36, -6]) },
      lLowerLeg: { r: createSequence([0, 38, 4, 38, 0]) },
      rLowerLeg: { r: createSequence([0, -38, -4, -38, 0]) },
      shadow: { s: createSequence([[132, 24, 100], [150, 34, 100], [106, 16, 100], [150, 34, 100], [132, 24, 100]]) }
    }
  };
}

function starJumpsDef() {
  return {
    pose: 'standing',
    motion: {
      root: { p: createSequence([[200, 84, 0], [200, 64, 0], [200, 84, 0], [200, 64, 0], [200, 84, 0]]) },
      lUpperArm: { r: createSequence([-16, -144, -16, -144, -16]) },
      rUpperArm: { r: createSequence([16, 144, 16, 144, 16]) },
      lUpperLeg: { r: createSequence([6, 44, 6, 44, 6]) },
      rUpperLeg: { r: createSequence([-6, -44, -6, -44, -6]) },
      shadow: { s: createSequence([[132, 24, 100], [102, 14, 100], [132, 24, 100], [102, 14, 100], [132, 24, 100]]) }
    }
  };
}

function skatersDef() {
  return {
    pose: 'standing',
    motion: {
      root: { p: createSequence([[176, 94, 0], [224, 84, 0], [176, 94, 0], [224, 84, 0], [176, 94, 0]]) },
      torso: { r: createSequence([10, -10, 10, -10, 10]) },
      lUpperLeg: { r: createSequence([26, -18, 26, 10, 26]) },
      rUpperLeg: { r: createSequence([-10, -26, -10, 18, -10]) },
      lLowerLeg: { r: createSequence([18, 36, 18, -6, 18]) },
      rLowerLeg: { r: createSequence([-6, -18, -6, -36, -6]) }
    }
  };
}

function tuckJumpsDef() {
  return {
    pose: 'standing',
    motion: {
      root: { p: createKeyframes([200, 84, 0], [200, 58, 0], [200, 84, 0]) },
      lUpperLeg: { r: createKeyframes(6, -46, 6) },
      rUpperLeg: { r: createKeyframes(-6, 46, -6) },
      lLowerLeg: { r: createKeyframes(0, 66, 0) },
      rLowerLeg: { r: createKeyframes(0, -66, 0) },
      lUpperArm: { r: createKeyframes(-18, -54, -18) },
      rUpperArm: { r: createKeyframes(18, 54, 18) }
    }
  };
}

function squatThrustDef() {
  return {
    pose: 'standing',
    motion: {
      root: { p: createSequence([[200, 84, 0], [200, 118, 0], [124, 156, 0], [200, 118, 0], [200, 84, 0]]), r: createSequence([0, 0, 84, 0, 0]) },
      lUpperLeg: { r: createSequence([6, 38, 6, 38, 6]) },
      rUpperLeg: { r: createSequence([-6, -38, -6, -38, -6]) },
      lLowerLeg: { r: createSequence([0, 42, 0, 42, 0]) },
      rLowerLeg: { r: createSequence([0, -42, 0, -42, 0]) },
      lUpperArm: { r: createSequence([-16, -46, -34, -46, -16]) },
      rUpperArm: { r: createSequence([16, 46, 34, 46, 16]) }
    }
  };
}

function fastFeetDef() {
  return {
    pose: 'standing',
    motion: {
      root: { p: createSequence([[196, 90, 0], [204, 84, 0], [196, 90, 0], [204, 84, 0], [196, 90, 0]]) },
      lUpperLeg: { r: createSequence([8, 22, 8, 14, 8]) },
      rUpperLeg: { r: createSequence([-8, -14, -8, -22, -8]) },
      lLowerLeg: { r: createSequence([0, 16, 0, 8, 0]) },
      rLowerLeg: { r: createSequence([0, -8, 0, -16, 0]) }
    }
  };
}

function lateralShuffleDef() {
  return {
    pose: 'standing',
    motion: {
      root: { p: createSequence([[170, 92, 0], [230, 84, 0], [170, 92, 0], [230, 84, 0], [170, 92, 0]]) },
      torso: { r: createSequence([8, -8, 8, -8, 8]) },
      lUpperArm: { r: createSequence([-24, 12, -24, -12, -24]) },
      rUpperArm: { r: createSequence([24, 12, 24, -12, 24]) },
      lUpperLeg: { r: createSequence([20, -10, 20, 10, 20]) },
      rUpperLeg: { r: createSequence([-10, -20, -10, 10, -10]) }
    }
  };
}

function pushupDef(label, options = {}) {
  const armSpread = options.armSpread || 0;
  return {
    pose: 'plank',
    label,
    overrides: {
      lUpperArm: { p: [-30 - armSpread, 10, 0] },
      rUpperArm: { p: [30 + armSpread, 10, 0] }
    },
    motion: {
      root: { p: createKeyframes([122, 156, 0], [122, 168, 0], [122, 156, 0]) },
      lUpperArm: { r: createKeyframes(-34, -6, -34) },
      lForearm: { r: createKeyframes(-24, -62, -24) },
      rUpperArm: { r: createKeyframes(34, 6, 34) },
      rForearm: { r: createKeyframes(24, 62, 24) }
    }
  };
}

function pikePushupDef() {
  return {
    pose: 'plank',
    overrides: {
      root: { p: [140, 134, 0], r: 48 },
      lUpperArm: { r: -12 },
      rUpperArm: { r: 12 }
    },
    motion: {
      root: { p: createKeyframes([140, 134, 0], [140, 146, 0], [140, 134, 0]) },
      lUpperArm: { r: createKeyframes(-12, 14, -12) },
      lForearm: { r: createKeyframes(-12, -42, -12) },
      rUpperArm: { r: createKeyframes(12, -14, 12) },
      rForearm: { r: createKeyframes(12, 42, 12) }
    }
  };
}

function kneePushupDef() {
  return {
    pose: 'plank',
    overrides: {
      lUpperLeg: { r: 30 },
      lLowerLeg: { r: 82 },
      rUpperLeg: { r: -30 },
      rLowerLeg: { r: -82 }
    },
    motion: {
      root: { p: createKeyframes([130, 168, 0], [130, 178, 0], [130, 168, 0]) },
      lUpperArm: { r: createKeyframes(-34, -10, -34) },
      lForearm: { r: createKeyframes(-24, -56, -24) },
      rUpperArm: { r: createKeyframes(34, 10, 34) },
      rForearm: { r: createKeyframes(24, 56, 24) }
    }
  };
}

function tricepDipDef() {
  return {
    pose: 'chair',
    motion: {
      root: { p: createKeyframes([200, 134, 0], [200, 150, 0], [200, 134, 0]) },
      lUpperArm: { r: createKeyframes(-58, -34, -58) },
      lForearm: { r: createKeyframes(84, 46, 84) },
      rUpperArm: { r: createKeyframes(58, 34, 58) },
      rForearm: { r: createKeyframes(-84, -46, -84) }
    }
  };
}

function supermanDef(label) {
  return {
    pose: 'prone',
    label,
    overrides: {
      lUpperArm: { r: -150 },
      lForearm: { r: 0 },
      rUpperArm: { r: 150 },
      rForearm: { r: 0 }
    },
    motion: {
      torso: { r: createKeyframes(0, -18, 0), p: createKeyframes([0, 0, 0], [0, -8, 0], [0, 0, 0]) },
      lUpperLeg: { r: createKeyframes(8, 28, 8) },
      rUpperLeg: { r: createKeyframes(-8, -28, -8) }
    }
  };
}

function armCirclesDef() {
  return {
    pose: 'standing',
    overrides: {
      lUpperArm: { r: -94 },
      lForearm: { r: 0 },
      rUpperArm: { r: 94 },
      rForearm: { r: 0 }
    },
    motion: {
      lUpperArm: { r: createSequence([-94, -154, -94, -34, -94]) },
      rUpperArm: { r: createSequence([94, 34, 94, 154, 94]) },
      lForearm: { r: createSequence([0, -20, 0, 20, 0]) },
      rForearm: { r: createSequence([0, 20, 0, -20, 0]) }
    }
  };
}

function inchwormDef(label) {
  return {
    pose: 'standing',
    label,
    motion: {
      root: { p: createSequence([[200, 84, 0], [188, 116, 0], [124, 156, 0], [188, 116, 0], [200, 84, 0]]), r: createSequence([0, 0, 84, 0, 0]) },
      torso: { r: createSequence([0, 84, 0, 84, 0]) },
      lUpperArm: { r: createSequence([-18, -34, -34, -120, -18]) },
      rUpperArm: { r: createSequence([18, 34, 34, 120, 18]) }
    }
  };
}

function reverseSnowAngelDef() {
  return {
    pose: 'prone',
    overrides: {
      lUpperArm: { r: -128 },
      rUpperArm: { r: 128 }
    },
    motion: {
      lUpperArm: { r: createSequence([-128, -70, -128, -150, -128]) },
      rUpperArm: { r: createSequence([128, 70, 128, 150, 128]) },
      torso: { r: createKeyframes(0, -10, 0) }
    }
  };
}

function wallPushupDef(label) {
  return {
    pose: 'wall',
    label,
    motion: {
      root: { p: createKeyframes([230, 88, 0], [238, 98, 0], [230, 88, 0]) },
      lUpperArm: { r: createKeyframes(-56, -34, -56) },
      lForearm: { r: createKeyframes(-34, -56, -34) },
      rUpperArm: { r: createKeyframes(56, 34, 56) },
      rForearm: { r: createKeyframes(34, 56, 34) }
    }
  };
}

function plankWalkDef() {
  return {
    pose: 'plank',
    motion: {
      root: { p: createSequence([[118, 158, 0], [126, 158, 0], [118, 158, 0], [126, 158, 0], [118, 158, 0]]) },
      lUpperArm: { r: createSequence([-34, -18, -34, -44, -34]) },
      rUpperArm: { r: createSequence([34, 44, 34, 18, 34]) },
      lForearm: { r: createSequence([-24, -8, -24, -34, -24]) },
      rForearm: { r: createSequence([24, 34, 24, 8, 24]) }
    }
  };
}

function abRolloutDef() {
  return {
    pose: 'kneeling',
    overrides: {
      lUpperArm: { r: -132 },
      lForearm: { r: -10 },
      rUpperArm: { r: 132 },
      rForearm: { r: 10 }
    },
    motion: {
      root: { p: createKeyframes([200, 132, 0], [162, 154, 0], [200, 132, 0]) },
      torso: { r: createKeyframes(0, 32, 0) },
      lUpperArm: { r: createKeyframes(-132, -150, -132) },
      rUpperArm: { r: createKeyframes(132, 150, 132) }
    }
  };
}

function plankToPushupDef() {
  return {
    pose: 'plank',
    motion: {
      lUpperArm: { r: createSequence([-34, -14, -34, -34, -34]) },
      lForearm: { r: createSequence([-24, -60, -24, -24, -24]) },
      rUpperArm: { r: createSequence([34, 34, 34, 14, 34]) },
      rForearm: { r: createSequence([24, 24, 24, 60, 24]) },
      root: { p: createKeyframes([122, 158, 0], [122, 164, 0], [122, 158, 0]) }
    }
  };
}

function walkOutPushupDef() {
  return {
    pose: 'standing',
    motion: {
      root: { p: createSequence([[200, 84, 0], [188, 116, 0], [122, 156, 0], [188, 116, 0], [200, 84, 0]]), r: createSequence([0, 0, 84, 0, 0]) },
      torso: { r: createSequence([0, 84, 0, 84, 0]) },
      lUpperArm: { r: createSequence([-18, -34, -10, -46, -18]) },
      lForearm: { r: createSequence([-8, -24, -62, -24, -8]) },
      rUpperArm: { r: createSequence([18, 34, 10, 46, 18]) },
      rForearm: { r: createSequence([8, 24, 62, 24, 8]) }
    }
  };
}

function squatDef(label, stanceOffset) {
  return {
    pose: 'standing',
    label,
    overrides: {
      lUpperLeg: { p: [-17 - stanceOffset / 2, 92, 0] },
      rUpperLeg: { p: [17 + stanceOffset / 2, 92, 0] }
    },
    motion: {
      root: { p: createKeyframes([200, 84, 0], [200, 122, 0], [200, 84, 0]) },
      torso: { r: createKeyframes(0, -12, 0) },
      lUpperLeg: { r: createKeyframes(6, 34, 6) },
      lLowerLeg: { r: createKeyframes(0, 38, 0) },
      rUpperLeg: { r: createKeyframes(-6, -34, -6) },
      rLowerLeg: { r: createKeyframes(0, -38, 0) },
      lUpperArm: { r: createKeyframes(-16, 8, -16) },
      rUpperArm: { r: createKeyframes(16, -8, 16) }
    }
  };
}

function lungeDef(label, direction) {
  const forward = direction === 'forward';
  return {
    pose: 'standing',
    label,
    motion: {
      root: { p: createKeyframes([196, 88, 0], [196, 112, 0], [196, 88, 0]) },
      lUpperLeg: { r: createKeyframes(14, forward ? 36 : -10, 14) },
      lLowerLeg: { r: createKeyframes(8, forward ? 24 : 46, 8) },
      rUpperLeg: { r: createKeyframes(-26, forward ? -58 : -22, -26) },
      rLowerLeg: { r: createKeyframes(-8, forward ? -12 : -36, -8) },
      torso: { r: createKeyframes(0, forward ? -8 : 8, 0) }
    }
  };
}

function wallSitDef() {
  return {
    pose: 'wall',
    overrides: {
      root: { p: [224, 132, 0] },
      torso: { r: -6 },
      lUpperLeg: { r: 86 },
      lLowerLeg: { r: -80 },
      rUpperLeg: { r: -86 },
      rLowerLeg: { r: 80 }
    },
    motion: {
      root: { p: createKeyframes([224, 132, 0], [224, 136, 0], [224, 132, 0]) },
      torso: { s: createKeyframes([100, 100, 100], [102, 102, 100], [100, 100, 100]) }
    }
  };
}

function singleLegBridgeDef() {
  return {
    pose: 'bridge',
    overrides: {
      lUpperLeg: { r: 0 },
      lLowerLeg: { r: 0 },
      rUpperLeg: { r: -46 },
      rLowerLeg: { r: -28 }
    },
    motion: {
      root: { p: createKeyframes([126, 220, 0], [126, 198, 0], [126, 220, 0]) },
      lUpperLeg: { r: createKeyframes(0, -16, 0) },
      torso: { r: createKeyframes(0, -16, 0) }
    }
  };
}

function calfRaiseDef() {
  return {
    pose: 'standing',
    motion: {
      root: { p: createKeyframes([200, 84, 0], [200, 76, 0], [200, 84, 0]) },
      shadow: { s: createKeyframes([132, 24, 100], [118, 18, 100], [132, 24, 100]) }
    }
  };
}

function donkeyKickDef() {
  return {
    pose: 'tabletop',
    motion: {
      lUpperLeg: { r: createSequence([10, -28, 10, 18, 10]) },
      lLowerLeg: { r: createSequence([82, 22, 82, 72, 82]) },
      root: { r: createSequence([62, 58, 62, 64, 62]) }
    }
  };
}

function fireHydrantDef() {
  return {
    pose: 'tabletop',
    motion: {
      lUpperLeg: { r: createSequence([10, 54, 10, 20, 10]) },
      lLowerLeg: { r: createSequence([82, 96, 82, 86, 82]) },
      torso: { r: createSequence([4, -8, 4, 0, 4]) }
    }
  };
}

function sideLegRaiseDef() {
  return {
    pose: 'standing',
    motion: {
      lUpperLeg: { r: createKeyframes(6, 44, 6) },
      lLowerLeg: { r: createKeyframes(0, -6, 0) },
      torso: { r: createKeyframes(0, -8, 0) }
    }
  };
}

function birdDogDef() {
  return {
    pose: 'tabletop',
    motion: {
      lUpperArm: { r: createSequence([-4, -142, -4, 18, -4]) },
      lForearm: { r: createSequence([-88, -8, -88, -82, -88]) },
      rUpperLeg: { r: createSequence([-10, -34, -10, 4, -10]) },
      rLowerLeg: { r: createSequence([-82, -4, -82, -70, -82]) },
      rUpperArm: { r: createSequence([4, 18, 4, 142, 4]) },
      rForearm: { r: createSequence([88, 82, 88, 8, 88]) },
      lUpperLeg: { r: createSequence([10, -4, 10, 34, 10]) },
      lLowerLeg: { r: createSequence([82, 70, 82, 4, 82]) }
    }
  };
}

function hollowHoldDef() {
  return {
    pose: 'lying',
    overrides: {
      torso: { r: -20 },
      lUpperArm: { r: -148 },
      rUpperArm: { r: 148 },
      lUpperLeg: { r: -26 },
      rUpperLeg: { r: 26 }
    },
    motion: {
      root: { p: createKeyframes(POSES.lying.root.p, add(POSES.lying.root.p, [0, -4, 0]), POSES.lying.root.p) },
      torso: { r: createKeyframes(-20, -26, -20) }
    }
  };
}

function neckRollDef(label) {
  return {
    pose: 'standing',
    label,
    motion: {
      head: { r: createSequence([-14, 12, -14, 10, -14]), p: createSequence([[0, -30, 0], [4, -28, 0], [0, -30, 0], [-4, -28, 0], [0, -30, 0]]) },
      torso: { r: createSequence([0, 2, 0, -2, 0]) }
    }
  };
}

function shoulderStretchDef() {
  return {
    pose: 'standing',
    overrides: {
      lUpperArm: { r: -74 },
      lForearm: { r: 58 },
      rUpperArm: { r: 24 },
      rForearm: { r: -24 }
    },
    motion: {
      root: { p: createKeyframes([200, 84, 0], [200, 80, 0], [200, 84, 0]) }
    }
  };
}

function chestOpenerDef() {
  return {
    pose: 'standing',
    overrides: {
      lUpperArm: { r: -144 },
      rUpperArm: { r: 144 }
    },
    motion: {
      torso: { r: createKeyframes(-6, -14, -6) },
      root: { p: createKeyframes([200, 84, 0], [200, 80, 0], [200, 84, 0]) }
    }
  };
}

function quadStretchDef() {
  return {
    pose: 'standing',
    overrides: {
      lUpperLeg: { r: 10 },
      lLowerLeg: { r: 84 }
    },
    motion: {
      root: { r: createSequence([-3, 3, -3, 3, -3]) },
      lLowerLeg: { r: createKeyframes(84, 94, 84) }
    }
  };
}

function standingHamstringStretchDef() {
  return {
    pose: 'standing',
    overrides: {
      torso: { r: 72 },
      lUpperArm: { r: -26 },
      rUpperArm: { r: 26 }
    },
    motion: {
      torso: { r: createKeyframes(72, 84, 72) },
      head: { p: createKeyframes(POSES.standing.head.p, add(POSES.standing.head.p, [10, 10, 0]), POSES.standing.head.p) }
    }
  };
}

function hipFlexorStretchDef() {
  return {
    pose: 'standing',
    overrides: {
      lUpperLeg: { r: 32 },
      lLowerLeg: { r: 18 },
      rUpperLeg: { r: -56 },
      rLowerLeg: { r: -18 },
      lUpperArm: { r: -138 },
      rUpperArm: { r: 54 }
    },
    motion: {
      root: { p: createKeyframes([196, 92, 0], [196, 98, 0], [196, 92, 0]) }
    }
  };
}

function lyingSpinalTwistDef() {
  return {
    pose: 'lying',
    motion: {
      lUpperLeg: { r: createSequence([18, 60, 18, -24, 18]) },
      rUpperLeg: { r: createSequence([-18, -60, -18, 24, -18]) },
      torso: { r: createSequence([0, -10, 0, 10, 0]) }
    }
  };
}

function seatedShoulderShrugDef() {
  return {
    pose: 'seated',
    motion: {
      lUpperArm: { p: createKeyframes([-30, 10, 0], [-30, 2, 0], [-30, 10, 0]) },
      rUpperArm: { p: createKeyframes([30, 10, 0], [30, 2, 0], [30, 10, 0]) },
      root: { p: createKeyframes(POSES.seated.root.p, add(POSES.seated.root.p, [0, -2, 0]), POSES.seated.root.p) }
    }
  };
}

function seatedTwistDef() {
  return {
    pose: 'seated',
    motion: {
      torso: { r: createSequence([-16, 16, -16, 16, -16]) },
      head: { r: createSequence([-10, 10, -10, 10, -10]) }
    }
  };
}

function wristCirclesDef() {
  return {
    pose: 'standing',
    overrides: {
      lUpperArm: { r: -90 },
      lForearm: { r: -2 },
      rUpperArm: { r: 90 },
      rForearm: { r: 2 }
    },
    motion: {
      lForearm: { r: createSequence([-2, -28, -2, 24, -2]) },
      rForearm: { r: createSequence([2, 28, 2, -24, 2]) }
    }
  };
}

function squatToPressDef() {
  return {
    pose: 'standing',
    motion: {
      root: { p: createKeyframes([200, 84, 0], [200, 122, 0], [200, 84, 0]) },
      lUpperArm: { r: createSequence([-18, 8, -144, 8, -18]) },
      rUpperArm: { r: createSequence([18, -8, 144, -8, 18]) },
      lUpperLeg: { r: createKeyframes(6, 34, 6) },
      rUpperLeg: { r: createKeyframes(-6, -34, -6) },
      lLowerLeg: { r: createKeyframes(0, 38, 0) },
      rLowerLeg: { r: createKeyframes(0, -38, 0) }
    }
  };
}

function bearCrawlDef() {
  return {
    pose: 'tabletop',
    motion: {
      root: { p: createSequence([[136, 140, 0], [150, 144, 0], [136, 140, 0], [150, 144, 0], [136, 140, 0]]) },
      lUpperArm: { r: createSequence([-4, -18, -4, 14, -4]) },
      rUpperArm: { r: createSequence([4, 18, 4, -14, 4]) },
      lUpperLeg: { r: createSequence([10, -8, 10, 18, 10]) },
      rUpperLeg: { r: createSequence([-10, -18, -10, 8, -10]) }
    }
  };
}

function turkishGetupLiteDef() {
  return {
    pose: 'lying',
    motion: {
      root: { p: createSequence([[126, 164, 0], [150, 148, 0], [182, 124, 0], [150, 148, 0], [126, 164, 0]]), r: createSequence([90, 70, 28, 70, 90]) },
      lUpperArm: { r: createSequence([-78, -112, -144, -112, -78]) },
      rUpperArm: { r: createSequence([78, 52, 18, 52, 78]) }
    }
  };
}

function sprawlDef() {
  return {
    pose: 'standing',
    motion: {
      root: { p: createSequence([[200, 84, 0], [200, 110, 0], [124, 152, 0], [200, 110, 0], [200, 84, 0]]), r: createSequence([0, 0, 84, 0, 0]) },
      torso: { r: createSequence([0, -8, 0, -8, 0]) },
      lUpperArm: { r: createSequence([-16, -44, -34, -54, -16]) },
      rUpperArm: { r: createSequence([16, 44, 34, 54, 16]) },
      lUpperLeg: { r: createSequence([6, 30, 6, 30, 6]) },
      rUpperLeg: { r: createSequence([-6, -30, -6, -30, -6]) }
    }
  };
}

function register(ids, definition) {
  for (const id of ids) EXERCISES[id] = clone(definition);
}

function createPose(base, overrides = {}) {
  const next = clone(base);
  for (const [part, props] of Object.entries(overrides)) {
    next[part] = { ...(next[part] || {}), ...props };
  }
  return next;
}

function createKeyframes(startValue, midValue, endValue = startValue) {
  return createAnimation([startValue, midValue, endValue], [0, 30, 60]);
}

function createSequence(values, times = [0, 15, 30, 45, 60]) {
  return createAnimation(values, times);
}

function alternating(startValue, alternateValue) {
  return createSequence([startValue, alternateValue, startValue, alternateValue, startValue]);
}

function createAnimation(values, times) {
  return { __animation: true, values, times };
}

function isAnimation(value) {
  return Boolean(value && value.__animation);
}

function add(value, delta) {
  if (Array.isArray(value)) return value.map((item, index) => item + (delta[index] || 0));
  return value + delta;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function summarizeSizes(entries) {
  const values = entries.map((entry) => entry.sizeKB);
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  return {
    min: Math.min(...values).toFixed(1),
    max: Math.max(...values).toFixed(1),
    avg: avg.toFixed(1)
  };
}

function ensureDir(path) {
  if (!fs.existsSync(path)) fs.mkdirSync(path, { recursive: true });
}

function hex(value, alpha = 1) {
  const normalized = value.replace('#', '');
  const channels = normalized.match(/.{1,2}/g).map((pair) => parseInt(pair, 16) / 255);
  return [...channels, alpha];
}
