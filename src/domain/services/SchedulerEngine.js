/**
 * SchedulerEngine - generates daily workout schedule.
 * Uses date-seeded randomization for daily variety.
 * Handles rest days, missed workouts, and adaptive scheduling.
 */
const defaultGetDateStr = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const dateSeed = (date, getDateStr) => {
  const str = getDateStr(date);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const seededShuffle = (array, seed) => {
  const arr = [...array];
  let s = seed;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export class SchedulerEngine {
  #exerciseRepo;
  #workoutRepo;
  #getDateStr;
  
  constructor(exerciseRepo, workoutRepo, getDateStr = defaultGetDateStr) {
    this.#exerciseRepo = exerciseRepo;
    this.#workoutRepo = workoutRepo;
    this.#getDateStr = getDateStr;
  }
  
  generateDaily(user, date = new Date(), options = {}) {
    const seed = dateSeed(date, this.#getDateStr);
    const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000);
    
    // Rest day check (every 3rd day)
    if (this.isRestDay(dayOfYear, options.streak || 0)) {
      return this.#generateRestDay(user, seed);
    }
    
    // Get goal-appropriate category mapping
    const categories = this.#goalToCategories(user.goal, user.focusArea);
    
    // Rotate through categories based on day
    const todayCategory = categories[dayOfYear % categories.length];
    
    // Build workout phases
    const warmUp = this.#pickWarmUp(user.level, seed);
    const main = this.#pickMain(todayCategory, user, seed);
    const coolDown = this.#pickCoolDown(user.goal, seed);
    
    return {
      isRestDay: false,
      date: this.#getDateStr(date),
      category: todayCategory,
      warmUp,
      main,
      coolDown,
      estimatedMinutes: user.dailyMinutes,
      estimatedCalories: this.#estimateCalories(main, user.level)
    };
  }
  
  isRestDay(dayOfYear, streak) {
    // Rest every 3rd day, or if streak >= 6
    return (dayOfYear % 3 === 0) || streak >= 6;
  }
  
  #generateRestDay(user, seed) {
    // Light yoga / stretching / pranayama
    const yoga = this.#exerciseRepo.getByCategory('yoga');
    const stretch = this.#exerciseRepo.getByCategory('stretch');
    const pranayama = this.#exerciseRepo.getByCategory('pranayama');
    const pool = [...yoga, ...stretch, ...pranayama];
    const shuffled = seededShuffle(pool, seed);
    
    return {
      isRestDay: true,
      category: 'recovery',
      warmUp: [],
      main: shuffled.slice(0, 5).map(ex => ({ exerciseId: ex.id, sets: 1 })),
      coolDown: shuffled.slice(5, 7).map(ex => ({ exerciseId: ex.id, sets: 1 })),
      estimatedMinutes: 15,
      estimatedCalories: 30
    };
  }
  
  #goalToCategories(goal, focus) {
    const map = {
      'fat_loss': ['belly_fat', 'hiit', 'full_body', 'belly_fat', 'hiit', 'yoga'],
      'strength': ['upper', 'lower', 'core', 'full_body', 'upper', 'lower'],
      'flexibility': ['yoga', 'stretch', 'yoga', 'pranayama', 'yoga', 'stretch'],
      'stress_relief': ['yoga', 'pranayama', 'stretch', 'yoga', 'pranayama', 'yoga']
    };
    const base = map[goal] || map['fat_loss'];
    
    // Boost focus area
    if (focus === 'core') base.unshift('belly_fat');
    if (focus === 'upper') base.unshift('upper');
    if (focus === 'lower') base.unshift('lower');
    
    return base;
  }
  
  #pickWarmUp(level, seed) {
    const warmUps = this.#exerciseRepo.filter({ category: 'stretch' })
      .concat(this.#exerciseRepo.filter({ category: 'office' }));
    const shuffled = seededShuffle(warmUps, seed + 1);
    const count = level === 'beginner' ? 3 : level === 'intermediate' ? 4 : 3;
    return shuffled.slice(0, count).map(ex => ({ exerciseId: ex.id, sets: 1 }));
  }
  
  #pickMain(category, user, seed) {
    let pool = this.#exerciseRepo.getByCategory(category);
    if (pool.length < 4) {
      pool = [...pool, ...this.#exerciseRepo.getByCategory('full_body')];
    }
    
    const shuffled = seededShuffle(pool, seed + 2);
    const count = user.dailyMinutes <= 15 ? 5 : user.dailyMinutes <= 30 ? 7 : 10;
    const sets = user.level === 'beginner' ? 2 : user.level === 'intermediate' ? 3 : 4;
    
    return shuffled.slice(0, count).map(ex => ({
      exerciseId: ex.id,
      sets,
      restSec: user.level === 'beginner' ? 25 : user.level === 'intermediate' ? 20 : 15
    }));
  }
  
  #pickCoolDown(goal, seed) {
    const isYogaGoal = goal === 'flexibility' || goal === 'stress_relief';
    const pool = isYogaGoal
      ? this.#exerciseRepo.getByCategory('pranayama')
      : this.#exerciseRepo.getByCategory('stretch');
    const shuffled = seededShuffle(pool.length ? pool : this.#exerciseRepo.getByCategory('stretch'), seed + 3);
    return shuffled.slice(0, 3).map(ex => ({ exerciseId: ex.id, sets: 1 }));
  }
  
  #estimateCalories(main, level) {
    return main.reduce((sum, item) => {
      const ex = this.#exerciseRepo.getById(item.exerciseId);
      return sum + (ex ? ex.caloriesPerSet * (item.sets || 2) : 5);
    }, 0);
  }
}
