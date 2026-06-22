export const ACHIEVEMENTS = [
  { id: 'first_workout', title: 'First Step', desc: 'Complete your first workout', icon: '🏃', check: (stats) => stats.totalWorkouts >= 1 },
  { id: 'week_streak', title: 'Week Warrior', desc: '7-day streak', icon: '🔥', check: (stats) => stats.currentStreak >= 7 },
  { id: 'month_streak', title: 'Unstoppable', desc: '30-day streak', icon: '💪', check: (stats) => stats.currentStreak >= 30 },
  { id: 'hundred_squats', title: 'Squat Master', desc: '100 total squats', icon: '🦵', check: (stats) => (stats.totalReps?.squat || 0) >= 100 },
  { id: 'yoga_hour', title: 'Zen Mode', desc: '60 min total yoga', icon: '🧘', check: (stats) => stats.totalYogaMin >= 60 },
  { id: 'early_bird', title: 'Early Bird', desc: 'Workout before 7 AM', icon: '🌅', check: (stats) => stats.earlyWorkouts >= 1 },
  { id: 'night_owl', title: 'Night Owl', desc: 'Workout after 10 PM', icon: '🦉', check: (stats) => stats.lateWorkouts >= 1 },
  { id: 'plank_5min', title: 'Iron Core', desc: '5 min total plank', icon: '🏋️', check: (stats) => stats.totalPlankSec >= 300 },
  { id: 'ten_workouts', title: 'Getting Serious', desc: '10 workouts done', icon: '⭐', check: (stats) => stats.totalWorkouts >= 10 },
  { id: 'fifty_workouts', title: 'Fitness Addict', desc: '50 workouts done', icon: '🏆', check: (stats) => stats.totalWorkouts >= 50 },
  { id: 'weight_loss_1', title: 'Lighter Already', desc: 'Lost 1 kg', icon: '⚖️', check: (stats) => stats.weightLost >= 1 },
  { id: 'belly_buster', title: 'Belly Buster', desc: 'Lost 2 cm waist', icon: '📏', check: (stats) => stats.waistLost >= 2 },
];

const defaultStats = (profileId) => ({
  id: profileId,
  profileId,
  xp: 0,
  level: 1,
  totalWorkouts: 0,
  totalMinutes: 0,
  totalHoursExercised: 0,
  totalCaloriesBurned: 0,
  totalExercises: 0,
  totalPlankSec: 0,
  totalYogaMin: 0,
  totalStepsLogged: 0,
  bestStreakEver: 0,
  currentStreak: 0,
  totalReps: {},
  earlyWorkouts: 0,
  lateWorkouts: 0,
  weightLost: 0,
  waistLost: 0,
  totalHabitXpEvents: 0,
  updatedAt: new Date().toISOString()
});

const toLevel = (xp) => Math.floor((xp || 0) / 100) + 1;
const defaultGetProfileRecords = async () => [];
const defaultSortByDateDesc = (records = [], field = 'date') => [...records].sort((a, b) => String(b?.[field] || '').localeCompare(String(a?.[field] || '')));
const defaultTodayKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export class AchievementEngine {
  constructor({
    storage,
    bus,
    events,
    getActiveProfileId,
    exerciseRepo,
    getProfileRecords = defaultGetProfileRecords,
    sortByDateDesc = defaultSortByDateDesc,
    todayKey = defaultTodayKey
  }) {
    this.storage = storage;
    this.bus = bus;
    this.events = events;
    this.getActiveProfileId = getActiveProfileId;
    this.exerciseRepo = exerciseRepo;
    this.getProfileRecords = getProfileRecords;
    this.sortByDateDesc = sortByDateDesc;
    this.todayKey = todayKey;
  }

  init() {
    this.bus.on(this.events.WORKOUT_COMPLETED, (payload) => this.handleWorkoutCompleted(payload));
  }

  async getStats(profileId = this.getActiveProfileId()) {
    const activeProfileId = profileId || this.getActiveProfileId();
    return (await this.storage.getStats(activeProfileId)) || defaultStats(activeProfileId);
  }

  async saveStats(stats) {
    const nextStats = {
      ...defaultStats(stats.profileId),
      ...stats,
      totalHoursExercised: Number(((stats.totalMinutes || 0) / 60).toFixed(1)),
      level: toLevel(stats.xp || 0),
      updatedAt: new Date().toISOString()
    };
    await this.storage.saveStats(nextStats);
    return nextStats;
  }

  async grantXp(profileId, amount, source = 'general') {
    const stats = await this.getStats(profileId);
    stats.xp = (stats.xp || 0) + amount;
    stats.lastXpSource = source;
    return this.saveStats(stats);
  }

  async grantBadge(profileId, badge) {
    const recordId = `${profileId}:${badge.id}`;
    const unlocked = await this.storage.getUnlocked(profileId);
    const existing = unlocked.find((record) => record.id === recordId);
    if (existing) return existing;

    const record = {
      id: recordId,
      profileId,
      achievementId: badge.id,
      title: badge.title,
      desc: badge.desc,
      icon: badge.icon,
      type: badge.type || 'monthly',
      unlockedAt: new Date().toISOString(),
      rewardXp: badge.xp || 100
    };

    await this.storage.saveUnlocked(record);
    await this.grantXp(profileId, record.rewardXp, record.type);
    this.bus.emit(this.events.ACHIEVEMENT_UNLOCKED, { achievement: record, profileId });
    return record;
  }

  async handleWorkoutCompleted(payload) {
    const profileId = payload?.profileId || this.getActiveProfileId();
    const stats = await this.getStats(profileId);
    const record = payload?.record || {};
    const exerciseDetails = record.exerciseDetails || [];

    stats.totalWorkouts += 1;
    stats.totalMinutes += record.duration || 0;
    stats.totalCaloriesBurned += record.calories || 0;
    stats.totalExercises += record.exercises || 0;

    const workoutTime = new Date(record.startedAt || record.completedAt || Date.now()).getHours();
    if (workoutTime < 7) stats.earlyWorkouts += 1;
    if (workoutTime >= 22) stats.lateWorkouts += 1;

    for (const detail of exerciseDetails) {
      const count = (detail.target || 0) * (detail.sets || 1);
      const exercise = this.exerciseRepo?.getById(detail.exerciseId);
      const exerciseId = String(detail.exerciseId || '').toLowerCase();
      const exerciseName = String(detail.name || '').toLowerCase();
      const tags = exercise?.tags || [];

      if (detail.type === 'reps') {
        const repKey = exerciseId.includes('squat') || exerciseName.includes('squat') ? 'squat' : exerciseId;
        stats.totalReps[repKey] = (stats.totalReps[repKey] || 0) + count;
      }

      if (detail.type === 'time' && (exerciseId.includes('plank') || exerciseName.includes('plank'))) {
        stats.totalPlankSec += count;
      }

      if (detail.type === 'time' && (tags.includes('yoga') || detail.category === 'yoga' || detail.category === 'pranayama')) {
        stats.totalYogaMin += count / 60;
      }
    }

    const streak = await this.computeCurrentStreak(profileId);
    stats.currentStreak = streak;
    stats.bestStreakEver = Math.max(stats.bestStreakEver || 0, streak);
    stats.xp = (stats.xp || 0) + 10;
    stats.lastXpSource = 'workout';

    await this.saveStats(stats);
    await this.syncMeasurementProgress(profileId);
    await this.evaluateAchievements(profileId);
  }

  async applyHabitProgress(profileId, habit, previousHabit = {}) {
    const stats = await this.getStats(profileId);
    const awarded = new Set(previousHabit.awardedHabitKeys || []);
    const nextAwarded = new Set(awarded);
    let earnedXp = 0;

    const tryAward = (key, condition) => {
      if (condition && !awarded.has(key)) {
        nextAwarded.add(key);
        earnedXp += 5;
      }
    };

    tryAward('water_goal', Number(habit.water || 0) >= 8);
    tryAward('sleep_logged', Number(habit.sleepHours || 0) >= 1);
    tryAward('steps_logged', Number(habit.steps || 0) > 0);
    tryAward('protein_logged', Number(habit.protein || 0) > 0 || habit.proteinDone === true);
    tryAward('screen_logged', Number(habit.screenTime || 0) > 0);
    tryAward('mood_logged', Boolean(habit.mood));
    tryAward('energy_logged', Number(habit.energyLevel || 0) > 0);
    tryAward('stress_logged', Number(habit.stressLevel || 0) > 0);
    tryAward('bedtime_logged', Boolean(habit.bedtime && habit.wakeTime));
    (habit.customHabits || []).forEach((item) => tryAward(`custom:${item.id}`, item.completed));

    const stepDelta = Math.max(0, Number(habit.steps || 0) - Number(previousHabit.steps || 0));
    stats.totalStepsLogged += stepDelta;
    stats.totalHabitXpEvents += earnedXp ? 1 : 0;
    await this.saveStats(stats);

    habit.awardedHabitKeys = [...nextAwarded];

    if (earnedXp) {
      await this.grantXp(profileId, earnedXp, 'habit');
      this.bus.emit(this.events.HABIT_SAVED, { profileId, habit, earnedXp });
      await this.evaluateAchievements(profileId);
    }

    return { habit, earnedXp };
  }

  async syncMeasurementProgress(profileId) {
    const measurements = this.sortByDateDesc(await this.getProfileRecords('measurements', profileId));
    const stats = await this.getStats(profileId);
    const chronological = [...measurements].sort((a, b) => a.date.localeCompare(b.date));
    const first = chronological[0];
    const latest = chronological[chronological.length - 1];

    stats.weightLost = first && latest && Number(first.weight) > 0 && Number(latest.weight) > 0
      ? Math.max(0, Number(first.weight) - Number(latest.weight))
      : 0;
    stats.waistLost = first && latest && Number(first.waist) > 0 && Number(latest.waist) > 0
      ? Math.max(0, Number(first.waist) - Number(latest.waist))
      : 0;

    await this.saveStats(stats);
    await this.evaluateAchievements(profileId);
    return stats;
  }

  async computeCurrentStreak(profileId) {
    const logs = await this.getProfileRecords('dailyLogs', profileId);
    const completedDates = new Set(logs.filter((log) => log.workoutCompleted).map((log) => log.date));
    let streak = 0;
    const now = new Date();

    for (let i = 0; i < 365; i += 1) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      const dateStr = this.todayKey(date);
      if (completedDates.has(dateStr)) {
        streak += 1;
      } else if (i > 0) {
        break;
      }
    }

    return streak;
  }

  async getAchievementStats(profileId = this.getActiveProfileId()) {
    const stats = await this.getStats(profileId);
    return {
      ...stats,
      currentStreak: await this.computeCurrentStreak(profileId),
      totalYogaMin: Number((stats.totalYogaMin || 0).toFixed(1)),
      totalPlankSec: Math.round(stats.totalPlankSec || 0),
      totalReps: stats.totalReps || {},
      weightLost: Number((stats.weightLost || 0).toFixed(1)),
      waistLost: Number((stats.waistLost || 0).toFixed(1))
    };
  }

  getAchievementProgress(achievementId, stats) {
    const targets = {
      first_workout: [stats.totalWorkouts, 1],
      week_streak: [stats.currentStreak, 7],
      month_streak: [stats.currentStreak, 30],
      hundred_squats: [stats.totalReps?.squat || 0, 100],
      yoga_hour: [stats.totalYogaMin || 0, 60],
      early_bird: [stats.earlyWorkouts || 0, 1],
      night_owl: [stats.lateWorkouts || 0, 1],
      plank_5min: [stats.totalPlankSec || 0, 300],
      ten_workouts: [stats.totalWorkouts || 0, 10],
      fifty_workouts: [stats.totalWorkouts || 0, 50],
      weight_loss_1: [stats.weightLost || 0, 1],
      belly_buster: [stats.waistLost || 0, 2]
    };
    const [current, target] = targets[achievementId] || [0, 1];
    return {
      current: Number(current || 0),
      target,
      percent: Math.max(0, Math.min(100, Math.round((Number(current || 0) / Math.max(target, 1)) * 100)))
    };
  }

  async evaluateAchievements(profileId = this.getActiveProfileId()) {
    const stats = await this.getAchievementStats(profileId);
    const unlockedRecords = await this.storage.getUnlocked(profileId);
    const unlockedIds = new Set(unlockedRecords.map((record) => record.achievementId));

    for (const achievement of ACHIEVEMENTS) {
      if (!unlockedIds.has(achievement.id) && achievement.check(stats)) {
        const record = {
          id: `${profileId}:${achievement.id}`,
          profileId,
          achievementId: achievement.id,
          title: achievement.title,
          desc: achievement.desc,
          icon: achievement.icon,
          type: 'core',
          unlockedAt: new Date().toISOString(),
          rewardXp: 50
        };
        await this.storage.saveUnlocked(record);
        await this.grantXp(profileId, 50, 'achievement');
        this.bus.emit(this.events.ACHIEVEMENT_UNLOCKED, { achievement: record, profileId });
      }
    }
  }

  async getAchievementsViewModel(profileId = this.getActiveProfileId()) {
    const stats = await this.getAchievementStats(profileId);
    const unlockedRecords = await this.storage.getUnlocked(profileId);
    const unlockedMap = new Map(unlockedRecords.map((record) => [record.achievementId, record]));

    return ACHIEVEMENTS.map((achievement) => {
      const unlocked = unlockedMap.get(achievement.id);
      return {
        ...achievement,
        unlocked: Boolean(unlocked),
        unlockedAt: unlocked?.unlockedAt || '',
        progress: this.getAchievementProgress(achievement.id, stats)
      };
    });
  }

  async getDashboardSnapshot(profileId = this.getActiveProfileId()) {
    const stats = await this.getAchievementStats(profileId);
    const achievements = await this.getAchievementsViewModel(profileId);
    return {
      stats,
      unlockedCount: achievements.filter((achievement) => achievement.unlocked).length,
      nextAchievement: achievements.find((achievement) => !achievement.unlocked) || null
    };
  }
}
