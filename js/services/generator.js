const pickBySeed = (items, count, seed) => {
  const source = [...items];
  let currentSeed = seed;
  for (let index = source.length - 1; index > 0; index -= 1) {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    const swapIndex = Math.floor((currentSeed / 233280) * (index + 1));
    [source[index], source[swapIndex]] = [source[swapIndex], source[index]];
  }
  return source.slice(0, Math.min(count, source.length));
};

export class GeneratorService {
  constructor(exercises, plans, progress = null, rpe = null) {
    this.exercises = exercises;
    this.plans = plans;
    this.progress = progress;
    this.rpe = rpe;
  }

  dateSeed(date) {
    return Number(new Date(date).toISOString().slice(0, 10).replaceAll('-', ''));
  }

  filterByProfile(profile) {
    const goalMap = {
      belly_fat: ['belly_fat', 'core', 'full_body', 'hiit'],
      yoga: ['yoga', 'stretch', 'pranayama'],
      stress: ['pranayama', 'stretch', 'yoga'],
      strength: ['upper', 'lower', 'core', 'full_body'],
      mobility: ['stretch', 'office', 'yoga']
    };
    const categories = goalMap[profile.goal] ?? ['belly_fat', 'core', 'full_body'];
    const preferred = profile.focus ? categories.concat(profile.focus) : categories;
    return this.exercises.filter((exercise) => preferred.includes(exercise.category));
  }

  isRestDay(profile, date) {
    if (!this.progress?.getWorkoutDays) return false;
    const workoutDays = new Set(this.progress.getWorkoutDays());
    const cursor = new Date(date);
    cursor.setDate(cursor.getDate() - 1);
    let consecutive = 0;
    while (workoutDays.has(cursor.toISOString().slice(0, 10))) {
      consecutive += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    const targetDays = profile.targetDaysPerWeek ?? 5;
    if (targetDays <= 4) return consecutive > 0 && consecutive % 4 === 0;
    return consecutive > 0 && consecutive % 3 === 0;
  }

  applyRPE(exercises) {
    const multiplier = this.rpe?.getMultiplier?.() ?? 1;
    return exercises.map((exercise) => {
      const beginnerTarget = exercise.levels.beginner;
      const target = Math.max(1, Math.round(beginnerTarget * multiplier));
      return {
        ...exercise,
        target,
        sets: exercise.setsDefault,
        targetLabel: exercise.type === 'time' ? `${target}s hold` : `${target} reps`
      };
    });
  }

  generateRestDay(profile) {
    const restorative = this.exercises.filter((exercise) => ['stretch', 'yoga', 'pranayama', 'office'].includes(exercise.category));
    const seed = this.dateSeed(new Date());
    const warmUp = pickBySeed(restorative.filter((exercise) => exercise.category !== 'pranayama'), 2, seed + 1);
    const main = pickBySeed(restorative.filter((exercise) => ['stretch', 'yoga', 'office'].includes(exercise.category)), 4, seed + 2);
    const coolDown = pickBySeed(restorative.filter((exercise) => exercise.category === 'pranayama'), 2, seed + 3);
    return {
      id: `rest-${seed}`,
      name: 'Recovery Reset',
      category: 'stretch',
      difficulty: profile.level || 'beginner',
      duration: 12,
      isRestDay: true,
      warmUp,
      main,
      coolDown,
      message: 'Today is a recovery day. Keep your habit alive with breath and mobility.'
    };
  }

  generateDaily(profile, date = new Date()) {
    const seed = this.dateSeed(date);
    if (this.isRestDay(profile, date)) {
      return this.generateRestDay(profile);
    }
    const pool = this.filterByProfile(profile);
    const warmUpPool = this.exercises.filter((exercise) => ['office', 'stretch', 'yoga', 'full_body'].includes(exercise.category));
    const coolDownPool = this.exercises.filter((exercise) => ['stretch', 'pranayama', 'yoga'].includes(exercise.category));
    const mainPool = pool.length ? pool : this.exercises.filter((exercise) => ['belly_fat', 'core', 'full_body'].includes(exercise.category));
    const warmUp = pickBySeed(warmUpPool, 3, seed + 11);
    const main = this.applyRPE(pickBySeed(mainPool, profile.sessionMinutes > 20 ? 8 : 6, seed + 29));
    const coolDown = pickBySeed(coolDownPool, 3, seed + 47);
    const recoveryBias = this.rpe?.shouldSubstituteRecovery?.();
    if (recoveryBias) {
      main.splice(-1, 1, ...this.applyRPE(pickBySeed(coolDownPool, 1, seed + 57)));
    }
    return {
      id: `daily-${new Date(date).toISOString().slice(0, 10)}`,
      name: 'Today\'s Adaptive Routine',
      category: profile.goal || 'belly_fat',
      difficulty: profile.level || 'beginner',
      duration: profile.sessionMinutes || 20,
      isRestDay: false,
      warmUp,
      main,
      coolDown
    };
  }
}

