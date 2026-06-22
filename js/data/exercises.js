const categoryLabel = {
  belly_fat: 'belly-fat reduction',
  yoga: 'mobility and mindful strength',
  pranayama: 'breathwork and recovery',
  hiit: 'high-intensity conditioning',
  office: 'desk-break mobility',
  upper: 'upper-body strength',
  lower: 'lower-body stability',
  stretch: 'flexibility and recovery',
  core: 'deep core control',
  full_body: 'full-body conditioning'
};

const breathingGuide = {
  belly_fat: 'Exhale on effort, inhale on reset.',
  yoga: 'Move with slow nasal breathing throughout the pose.',
  pranayama: 'Keep the spine tall and let the breath stay smooth and silent.',
  hiit: 'Use strong exhales and recover with deep belly breaths.',
  office: 'Relax the jaw and breathe into the tight area.',
  upper: 'Exhale during the press or pull, inhale on the return.',
  lower: 'Exhale as you stand tall, inhale while lowering with control.',
  stretch: 'Lengthen on the inhale and soften deeper on the exhale.',
  core: 'Brace gently and keep each exhale long.',
  full_body: 'Match the breath to the pace without holding it.'
};

const tipLibrary = {
  belly_fat: ['Keep the ribcage down', 'Quality beats speed', 'Brace before each rep'],
  yoga: ['Lengthen through the spine', 'Avoid forcing the pose', 'Use the breath to stay steady'],
  pranayama: ['Sit comfortably tall', 'Soften the shoulders', 'Let the exhale finish fully'],
  hiit: ['Land softly', 'Keep the core active', 'Scale the range before stopping'],
  office: ['Work within pain-free range', 'Undo desk posture slowly', 'Pause if you feel numbness'],
  upper: ['Keep the neck relaxed', 'Drive from the hands and lats', 'Own the full range'],
  lower: ['Push through the whole foot', 'Track knees over toes', 'Keep the chest proud'],
  stretch: ['Breathe instead of bouncing', 'Stay gentle around tight spots', 'Hold with relaxed shoulders'],
  core: ['Move from the torso, not the neck', 'Keep the pelvis stable', 'Stop before the back arches'],
  full_body: ['Stay light on the feet', 'Keep transitions smooth', 'Choose control over speed']
};

const mistakeLibrary = {
  belly_fat: ['Holding the breath', 'Rushing the reps', 'Pulling from the neck'],
  yoga: ['Forcing depth', 'Locking the joints', 'Ignoring alignment'],
  pranayama: ['Breathing from the chest only', 'Tensing the face', 'Going too fast'],
  hiit: ['Sacrificing form for speed', 'Landing loudly', 'Skipping recovery'],
  office: ['Shrugging the shoulders', 'Moving too abruptly', 'Ignoring posture'],
  upper: ['Flaring the elbows too much', 'Collapsing the core', 'Shortening the range'],
  lower: ['Letting knees cave in', 'Shifting weight to toes', 'Rounding the back'],
  stretch: ['Bouncing into the stretch', 'Holding tension in the jaw', 'Forcing discomfort'],
  core: ['Arching the lower back', 'Using momentum', 'Forgetting to brace'],
  full_body: ['Losing rhythm', 'Skipping setup', 'Letting posture collapse']
};

const buildLevels = (type, base) => type === 'time'
  ? {
      beginner: base,
      intermediate: Math.round(base * 1.35),
      advanced: Math.round(base * 1.7)
    }
  : {
      beginner: base,
      intermediate: Math.round(base * 1.5),
      advanced: Math.round(base * 2.2)
    };

const buildDescription = (name, category, muscles) => `${name} builds ${categoryLabel[category]} with focus on ${muscles.join(', ')}.`;

const buildSteps = (name, type) => type === 'time'
  ? [
      `Set up safely for ${name}.`,
      'Lift or hold into the strongest version you can maintain with control.',
      'Stay steady through the target while keeping posture aligned.',
      'Ease out slowly and reset with one deep breath.'
    ]
  : [
      `Set up for ${name} with a stable base.`,
      'Start each rep with the core engaged and shoulders relaxed.',
      'Move through a smooth full range without rushing.',
      'Return to the starting position with control before the next rep.'
    ];

const buildExercise = ([category, id, name, nameHindi, muscle, type, base, setsDefault, caloriesPerSet, animation, emoji]) => ({
  id,
  name,
  nameHindi,
  category,
  muscle,
  type,
  levels: buildLevels(type, base),
  setsDefault,
  caloriesPerSet,
  animation,
  emoji,
  description: buildDescription(name, category, muscle),
  steps: buildSteps(name, type),
  tips: tipLibrary[category],
  breathing: breathingGuide[category],
  commonMistakes: mistakeLibrary[category]
});

const BELLY_FAT = [
  ['crunches', 'Crunches', 'क्रंचेस', ['abs'], 'reps', 16, 3, 5, 'anim-crunch', '💥'],
  ['bicycle-crunches', 'Bicycle Crunches', 'साइकिल क्रंचेज', ['abs', 'obliques'], 'reps', 16, 3, 6, 'anim-crunch', '🚴'],
  ['reverse-crunches', 'Reverse Crunches', 'रिवर्स क्रंचेज', ['lower abs'], 'reps', 14, 3, 5, 'anim-crunch', '🔄'],
  ['leg-raises', 'Leg Raises', 'लेग रेज़', ['lower abs', 'hip flexors'], 'reps', 12, 3, 5, 'anim-crunch', '🦵'],
  ['flutter-kicks', 'Flutter Kicks', 'फ्लटर किक्स', ['lower abs'], 'time', 24, 3, 6, 'anim-mountain-climber', '🐟'],
  ['russian-twists', 'Russian Twists', 'रशियन ट्विस्ट', ['obliques', 'core'], 'reps', 20, 3, 6, 'anim-twist', '🌀'],
  ['plank', 'Plank', 'प्लैंक', ['core', 'shoulders'], 'time', 30, 3, 5, 'anim-plank', '🪵'],
  ['plank-hip-dips', 'Plank Hip Dips', 'प्लैंक हिप डिप्स', ['obliques', 'core'], 'reps', 16, 3, 6, 'anim-plank', '🌊'],
  ['mountain-climbers', 'Mountain Climbers', 'माउंटेन क्लाइम्बर्स', ['core', 'cardio'], 'time', 24, 3, 7, 'anim-mountain-climber', '⛰️'],
  ['v-ups', 'V-Ups', 'वी-अप्स', ['abs', 'hip flexors'], 'reps', 12, 3, 7, 'anim-crunch', '🔺'],
  ['dead-bug', 'Dead Bug', 'डेड बग', ['core', 'coordination'], 'reps', 12, 2, 4, 'anim-twist', '🪲'],
  ['heel-taps', 'Heel Taps', 'हील टैप्स', ['obliques'], 'reps', 20, 3, 5, 'anim-twist', '👣'],
  ['toe-touches', 'Toe Touches', 'टो टचेस', ['upper abs'], 'reps', 16, 3, 5, 'anim-crunch', '🦶'],
  ['scissor-kicks', 'Scissor Kicks', 'सिज़र किक्स', ['lower abs'], 'time', 22, 3, 6, 'anim-mountain-climber', '✂️'],
  ['burpees', 'Burpees', 'बर्पीज़', ['full body', 'cardio'], 'reps', 8, 3, 10, 'anim-burpee', '🔥'],
  ['seated-knee-tucks', 'Seated Knee Tucks', 'सीटेड नी टक्स', ['core'], 'reps', 14, 3, 5, 'anim-crunch', '🪑']
];

const YOGA = [
  ['surya-namaskar', 'Surya Namaskar', 'सूर्य नमस्कार', ['full body', 'mobility'], 'time', 45, 2, 8, 'anim-yoga-flow', '🌞'],
  ['tadasana', 'Tadasana', 'ताड़ासन', ['posture', 'balance'], 'time', 30, 2, 3, 'anim-breathing', '🧍'],
  ['utkatasana', 'Utkatasana', 'उत्कटासन', ['quads', 'core'], 'time', 28, 2, 5, 'anim-squat', '🪑'],
  ['virabhadrasana-i', 'Virabhadrasana I', 'वीरभद्रासन १', ['legs', 'hips'], 'time', 28, 2, 5, 'anim-lunge', '⚔️'],
  ['virabhadrasana-ii', 'Virabhadrasana II', 'वीरभद्रासन २', ['legs', 'shoulders'], 'time', 28, 2, 5, 'anim-lunge', '🛡️'],
  ['trikonasana', 'Trikonasana', 'त्रिकोणासन', ['hamstrings', 'waist'], 'time', 28, 2, 4, 'anim-twist', '🔺'],
  ['adho-mukha-svanasana', 'Adho Mukha Svanasana', 'अधो मुख श्वानासन', ['shoulders', 'hamstrings'], 'time', 30, 2, 4, 'anim-yoga-flow', '🐕'],
  ['bhujangasana', 'Bhujangasana', 'भुजंगासन', ['spine', 'core'], 'time', 24, 2, 4, 'anim-yoga-flow', '🐍'],
  ['dhanurasana', 'Dhanurasana', 'धनुरासन', ['back', 'hip flexors'], 'time', 24, 2, 5, 'anim-yoga-flow', '🏹'],
  ['naukasana', 'Naukasana', 'नौकासन', ['abs', 'hip flexors'], 'time', 24, 2, 5, 'anim-breathing', '🚣'],
  ['setu-bandhasana', 'Setu Bandhasana', 'सेतु बंधासन', ['glutes', 'spine'], 'time', 28, 2, 4, 'anim-yoga-flow', '🌉'],
  ['balasana', 'Balasana', 'बालासन', ['recovery', 'hips'], 'time', 40, 1, 2, 'anim-breathing', '🧘'],
  ['vajrasana', 'Vajrasana', 'वज्रासन', ['digestion', 'ankles'], 'time', 45, 1, 2, 'anim-breathing', '🙏'],
  ['paschimottanasana', 'Paschimottanasana', 'पश्चिमोत्तानासन', ['hamstrings', 'back'], 'time', 35, 1, 3, 'anim-yoga-flow', '📿'],
  ['ustrasana', 'Ustrasana', 'उष्ट्रासन', ['chest', 'quads'], 'time', 24, 2, 4, 'anim-yoga-flow', '🐪'],
  ['halasana', 'Halasana', 'हलासन', ['spine', 'shoulders'], 'time', 20, 1, 4, 'anim-yoga-flow', '🌾'],
  ['matsyasana', 'Matsyasana', 'मत्स्यासन', ['chest', 'throat'], 'time', 24, 1, 3, 'anim-yoga-flow', '🐟'],
  ['marjaryasana-bitilasana', 'Marjaryasana-Bitilasana', 'मार्जरी-गाय आसन', ['spine', 'mobility'], 'time', 35, 1, 3, 'anim-yoga-flow', '🐈'],
  ['ardhachakrasana', 'Ardha Chakrasana', 'अर्धचक्रासन', ['spine', 'posture'], 'time', 22, 2, 3, 'anim-yoga-flow', '🌈'],
  ['parsvakonasana', 'Parsvakonasana', 'पार्श्वकोणासन', ['legs', 'obliques'], 'time', 26, 2, 4, 'anim-lunge', '📐'],
  ['vrikshasana', 'Vrikshasana', 'वृक्षासन', ['balance', 'hips'], 'time', 28, 2, 3, 'anim-breathing', '🌳'],
  ['pawanmuktasana', 'Pawanmuktasana', 'पवनमुक्तासन', ['lower abs', 'hips'], 'time', 28, 2, 3, 'anim-yoga-flow', '☁️'],
  ['malasana', 'Malasana', 'मालासन', ['hips', 'ankles'], 'time', 30, 2, 4, 'anim-squat', '🪷'],
  ['shavasana', 'Shavasana', 'शवासन', ['recovery', 'mind'], 'time', 60, 1, 1, 'anim-breathing', '🌙']
];

const PRANAYAMA = [
  ['kapalbhati', 'Kapalbhati', 'कपालभाति', ['lungs', 'core'], 'time', 45, 1, 2, 'anim-breathing', '🌬️'],
  ['anulom-vilom', 'Anulom Vilom', 'अनुलोम विलोम', ['lungs', 'nervous system'], 'time', 60, 1, 2, 'anim-breathing', '🫁'],
  ['bhramari', 'Bhramari', 'भ्रामरी', ['calm', 'focus'], 'time', 45, 1, 1, 'anim-breathing', '🐝'],
  ['ujjayi', 'Ujjayi', 'उज्जायी', ['breath control', 'focus'], 'time', 45, 1, 2, 'anim-breathing', '🌊'],
  ['sheetali', 'Sheetali', 'शीतली', ['cooling', 'recovery'], 'time', 40, 1, 1, 'anim-breathing', '❄️'],
  ['box-breathing', 'Box Breathing', 'बॉक्स ब्रीदिंग', ['focus', 'stress relief'], 'time', 60, 1, 1, 'anim-breathing', '⬜']
];

const HIIT = [
  ['jump-squats', 'Jump Squats', 'जंप स्क्वैट्स', ['legs', 'cardio'], 'reps', 12, 3, 8, 'anim-jumping-jack', '🦘'],
  ['high-knees', 'High Knees', 'हाई नीज़', ['cardio', 'hip flexors'], 'time', 26, 3, 7, 'anim-jumping-jack', '🏃'],
  ['jumping-jacks', 'Jumping Jacks', 'जंपिंग जैक्स', ['cardio', 'shoulders'], 'time', 30, 3, 6, 'anim-jumping-jack', '⭐'],
  ['star-jumps', 'Star Jumps', 'स्टार जंप्स', ['full body', 'cardio'], 'reps', 14, 3, 8, 'anim-jumping-jack', '🌟'],
  ['plank-jacks', 'Plank Jacks', 'प्लैंक जैक्स', ['core', 'cardio'], 'time', 24, 3, 7, 'anim-plank', '🪵'],
  ['skaters', 'Skaters', 'स्केटर्स', ['glutes', 'cardio'], 'reps', 20, 3, 7, 'anim-lunge', '⛸️'],
  ['tuck-jumps', 'Tuck Jumps', 'टक जंप्स', ['legs', 'power'], 'reps', 10, 3, 8, 'anim-jumping-jack', '🚀'],
  ['squat-thrusts', 'Squat Thrusts', 'स्क्वैट थ्रस्ट्स', ['full body', 'cardio'], 'reps', 10, 3, 8, 'anim-burpee', '⚡'],
  ['box-steps', 'Box Steps', 'बॉक्स स्टेप्स', ['legs', 'cardio'], 'reps', 20, 3, 6, 'anim-squat', '📦'],
  ['speed-lunges', 'Speed Lunges', 'स्पीड लंजेस', ['legs', 'cardio'], 'reps', 18, 3, 7, 'anim-lunge', '🏁'],
  ['bear-crawl', 'Bear Crawl', 'बेयर क्रॉल', ['shoulders', 'core'], 'time', 24, 3, 8, 'anim-mountain-climber', '🐻'],
  ['fast-feet', 'Fast Feet', 'फास्ट फीट', ['cardio', 'calves'], 'time', 26, 3, 6, 'anim-jumping-jack', '👟']
];

const OFFICE = [
  ['neck-rolls', 'Neck Rolls', 'नेक रोल्स', ['neck', 'mobility'], 'time', 24, 1, 1, 'anim-twist', '🌀'],
  ['shoulder-shrugs', 'Shoulder Shrugs', 'शोल्डर श्रग्स', ['traps', 'posture'], 'reps', 18, 2, 2, 'anim-breathing', '🤷'],
  ['seated-twist', 'Seated Twist', 'सीटेड ट्विस्ट', ['spine', 'obliques'], 'time', 24, 1, 2, 'anim-twist', '🪑'],
  ['wrist-circles', 'Wrist Circles', 'रिस्ट सर्कल्स', ['wrists', 'mobility'], 'time', 22, 1, 1, 'anim-twist', '⌚'],
  ['hip-flexor-stretch-desk', 'Desk Hip Flexor Stretch', 'डेस्क हिप फ्लेक्सर स्ट्रेच', ['hips', 'quads'], 'time', 24, 1, 2, 'anim-lunge', '🧑‍💻'],
  ['standing-cat-cow', 'Standing Cat-Cow', 'स्टैंडिंग कैट-काउ', ['spine', 'mobility'], 'time', 26, 1, 2, 'anim-yoga-flow', '🏢'],
  ['desk-push-ups', 'Desk Push-Ups', 'डेस्क पुश-अप्स', ['chest', 'arms'], 'reps', 12, 2, 3, 'anim-push-up', '🪑'],
  ['desk-calf-raises', 'Desk Calf Raises', 'डेस्क काफ रेज़', ['calves'], 'reps', 20, 2, 2, 'anim-squat', '🦵'],
  ['seated-leg-extension', 'Seated Leg Extension', 'सीटेड लेग एक्सटेंशन', ['quads'], 'reps', 16, 2, 2, 'anim-lunge', '🪑'],
  ['doorway-chest-openers', 'Doorway Chest Opener', 'डोरवे चेस्ट ओपनर', ['chest', 'shoulders'], 'time', 24, 1, 2, 'anim-yoga-flow', '🚪']
];

const UPPER = [
  ['push-ups', 'Push-Ups', 'पुश-अप्स', ['chest', 'triceps'], 'reps', 10, 3, 6, 'anim-push-up', '💪'],
  ['wide-push-ups', 'Wide Push-Ups', 'वाइड पुश-अप्स', ['chest', 'shoulders'], 'reps', 8, 3, 6, 'anim-push-up', '↔️'],
  ['diamond-push-ups', 'Diamond Push-Ups', 'डायमंड पुश-अप्स', ['triceps', 'chest'], 'reps', 6, 3, 6, 'anim-push-up', '💎'],
  ['pike-push-ups', 'Pike Push-Ups', 'पाइक पुश-अप्स', ['shoulders', 'triceps'], 'reps', 8, 3, 6, 'anim-push-up', '⛰️'],
  ['tricep-dips', 'Tricep Dips', 'ट्राइसेप डिप्स', ['triceps', 'shoulders'], 'reps', 12, 3, 6, 'anim-push-up', '🪑'],
  ['superman-hold', 'Superman Hold', 'सुपरमैन होल्ड', ['back', 'glutes'], 'time', 24, 3, 4, 'anim-breathing', '🦸'],
  ['arm-circles', 'Arm Circles', 'आर्म सर्कल्स', ['shoulders'], 'time', 24, 2, 2, 'anim-twist', '⭕'],
  ['inchworms', 'Inchworms', 'इंचवर्म्स', ['shoulders', 'hamstrings'], 'reps', 10, 3, 6, 'anim-push-up', '🐛'],
  ['shoulder-taps', 'Shoulder Taps', 'शोल्डर टैप्स', ['core', 'shoulders'], 'reps', 16, 3, 5, 'anim-plank', '✋'],
  ['wall-angels', 'Wall Angels', 'वॉल एंजल्स', ['posture', 'shoulders'], 'reps', 14, 2, 2, 'anim-breathing', '😇'],
  ['reverse-snow-angels', 'Reverse Snow Angels', 'रिवर्स स्नो एंजल्स', ['upper back', 'rear delts'], 'reps', 12, 2, 3, 'anim-yoga-flow', '❄️'],
  ['plank-up-downs', 'Plank Up-Downs', 'प्लैंक अप-डाउन', ['shoulders', 'core'], 'reps', 10, 3, 6, 'anim-plank', '⬆️']
];

const LOWER = [
  ['bodyweight-squats', 'Bodyweight Squats', 'बॉडीवेट स्क्वैट्स', ['quads', 'glutes'], 'reps', 16, 3, 6, 'anim-squat', '🏋️'],
  ['reverse-lunges', 'Reverse Lunges', 'रिवर्स लंजेस', ['quads', 'glutes'], 'reps', 14, 3, 6, 'anim-lunge', '↩️'],
  ['wall-sit', 'Wall Sit', 'वॉल सिट', ['quads'], 'time', 30, 3, 5, 'anim-squat', '🧱'],
  ['glute-bridges', 'Glute Bridges', 'ग्लूट ब्रिजेस', ['glutes', 'hamstrings'], 'reps', 16, 3, 5, 'anim-yoga-flow', '🌉'],
  ['calf-raises', 'Calf Raises', 'काफ रेज़', ['calves'], 'reps', 22, 3, 4, 'anim-squat', '🦶'],
  ['sumo-squats', 'Sumo Squats', 'सुमो स्क्वैट्स', ['inner thighs', 'glutes'], 'reps', 14, 3, 6, 'anim-squat', '🗻'],
  ['donkey-kicks', 'Donkey Kicks', 'डॉन्की किक्स', ['glutes'], 'reps', 16, 3, 4, 'anim-lunge', '🐴'],
  ['fire-hydrants', 'Fire Hydrants', 'फायर हाइड्रेंट्स', ['glute medius'], 'reps', 16, 3, 4, 'anim-lunge', '🚒'],
  ['curtsy-lunges', 'Curtsy Lunges', 'कर्टसी लंजेस', ['glutes', 'adductors'], 'reps', 14, 3, 5, 'anim-lunge', '🎀'],
  ['single-leg-deadlift', 'Single-Leg Deadlift', 'सिंगल लेग डेडलिफ्ट', ['hamstrings', 'balance'], 'reps', 12, 3, 5, 'anim-yoga-flow', '⚖️'],
  ['side-lunges', 'Side Lunges', 'साइड लंजेस', ['glutes', 'adductors'], 'reps', 14, 3, 5, 'anim-lunge', '↔️'],
  ['squat-pulse', 'Squat Pulse', 'स्क्वैट पल्स', ['quads', 'glutes'], 'reps', 18, 3, 6, 'anim-squat', '📶']
];

const STRETCH = [
  ['neck-stretch', 'Neck Stretch', 'नेक स्ट्रेच', ['neck'], 'time', 24, 1, 1, 'anim-breathing', '🧠'],
  ['shoulder-stretch', 'Shoulder Stretch', 'शोल्डर स्ट्रेच', ['shoulders'], 'time', 24, 1, 1, 'anim-breathing', '🫶'],
  ['quad-stretch', 'Quad Stretch', 'क्वाड स्ट्रेच', ['quads'], 'time', 24, 1, 1, 'anim-lunge', '🦵'],
  ['hamstring-stretch', 'Hamstring Stretch', 'हैमस्ट्रिंग स्ट्रेच', ['hamstrings'], 'time', 28, 1, 2, 'anim-yoga-flow', '🪢'],
  ['hip-flexor-stretch', 'Hip Flexor Stretch', 'हिप फ्लेक्सर स्ट्रेच', ['hips'], 'time', 24, 1, 2, 'anim-lunge', '🧘‍♂️'],
  ['childs-pose', "Child's Pose", 'चाइल्ड पोज़', ['back', 'hips'], 'time', 40, 1, 2, 'anim-breathing', '🛏️'],
  ['cobra-stretch', 'Cobra Stretch', 'कोबरा स्ट्रेच', ['spine', 'abs'], 'time', 24, 1, 2, 'anim-yoga-flow', '🐍'],
  ['cat-cow-stretch', 'Cat-Cow Stretch', 'कैट-काउ स्ट्रेच', ['spine'], 'time', 30, 1, 2, 'anim-yoga-flow', '🐈'],
  ['seated-forward-fold', 'Seated Forward Fold', 'सीटेड फॉरवर्ड फोल्ड', ['hamstrings', 'back'], 'time', 32, 1, 2, 'anim-yoga-flow', '📎'],
  ['spinal-twist-stretch', 'Spinal Twist Stretch', 'स्पाइनल ट्विस्ट स्ट्रेच', ['spine', 'obliques'], 'time', 26, 1, 2, 'anim-twist', '🧵']
];

const CORE = [
  ['side-plank', 'Side Plank', 'साइड प्लैंक', ['obliques', 'shoulders'], 'time', 24, 2, 4, 'anim-plank', '↔️'],
  ['hollow-hold', 'Hollow Hold', 'होलो होल्ड', ['abs'], 'time', 22, 2, 4, 'anim-breathing', '🥚'],
  ['bird-dog', 'Bird Dog', 'बर्ड डॉग', ['core', 'balance'], 'reps', 14, 2, 4, 'anim-yoga-flow', '🐦'],
  ['forearm-plank', 'Forearm Plank', 'फोरआर्म प्लैंक', ['core', 'shoulders'], 'time', 32, 2, 4, 'anim-plank', '🪵'],
  ['bear-hold', 'Bear Hold', 'बेयर होल्ड', ['core', 'quads'], 'time', 24, 2, 4, 'anim-plank', '🐻'],
  ['plank-shoulder-taps', 'Plank Shoulder Taps', 'प्लैंक शोल्डर टैप्स', ['core', 'shoulders'], 'reps', 16, 3, 5, 'anim-plank', '🤸'],
  ['seated-russian-reach', 'Seated Russian Reach', 'सीटेड रशियन रीच', ['obliques'], 'reps', 18, 3, 5, 'anim-twist', '🎯'],
  ['windshield-wipers', 'Windshield Wipers', 'विंडशील्ड वाइपर्स', ['obliques', 'lower abs'], 'reps', 12, 3, 5, 'anim-twist', '🚗'],
  ['standing-oblique-crunch', 'Standing Oblique Crunch', 'स्टैंडिंग ऑब्लिक क्रंच', ['obliques'], 'reps', 18, 3, 5, 'anim-twist', '📐'],
  ['bear-plank-knee-taps', 'Bear Plank Knee Taps', 'बेयर प्लैंक नी टैप्स', ['core', 'shoulders'], 'reps', 16, 3, 5, 'anim-plank', '🐾']
];

const FULL_BODY = [
  ['sunrise-march', 'Sunrise March', 'सनराइज़ मार्च', ['cardio', 'hips'], 'time', 30, 2, 4, 'anim-jumping-jack', '🌅'],
  ['inchworm-to-push-up', 'Inchworm to Push-Up', 'इंचवर्म टू पुश-अप', ['shoulders', 'core'], 'reps', 8, 3, 7, 'anim-push-up', '🐛'],
  ['squat-to-press', 'Squat to Press', 'स्क्वैट टू प्रेस', ['legs', 'shoulders'], 'reps', 14, 3, 7, 'anim-squat', '📈'],
  ['lunge-and-twist', 'Lunge and Twist', 'लंज एंड ट्विस्ट', ['legs', 'obliques'], 'reps', 14, 3, 6, 'anim-lunge', '🧭'],
  ['walkout-plank', 'Walkout Plank', 'वॉकआउट प्लैंक', ['core', 'hamstrings'], 'reps', 10, 3, 6, 'anim-plank', '🚶'],
  ['power-knee-drive', 'Power Knee Drive', 'पावर नी ड्राइव', ['cardio', 'core'], 'reps', 16, 3, 7, 'anim-jumping-jack', '⚡'],
  ['bridge-reach', 'Bridge Reach', 'ब्रिज रीच', ['glutes', 'core'], 'reps', 14, 3, 5, 'anim-yoga-flow', '🌉'],
  ['low-impact-burpee', 'Low Impact Burpee', 'लो इम्पैक्ट बर्पी', ['full body', 'cardio'], 'reps', 10, 3, 7, 'anim-burpee', '🌪️']
];

const withCategory = (category, rows) => rows.map((row) => [category, ...row]);

export const EXERCISES = [
  ...withCategory('belly_fat', BELLY_FAT),
  ...withCategory('yoga', YOGA),
  ...withCategory('pranayama', PRANAYAMA),
  ...withCategory('hiit', HIIT),
  ...withCategory('office', OFFICE),
  ...withCategory('upper', UPPER),
  ...withCategory('lower', LOWER),
  ...withCategory('stretch', STRETCH),
  ...withCategory('core', CORE),
  ...withCategory('full_body', FULL_BODY)
].map(buildExercise);

export const EXERCISE_INDEX = Object.fromEntries(EXERCISES.map((exercise) => [exercise.id, exercise]));
export const EXERCISE_CATEGORIES = Object.keys(categoryLabel);
