/**
 * Use Case: Get progress statistics.
 */
const defaultTodayKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export class GetProgress {
  #db;
  #getActiveProfileId;
  #getProfileRecords;
  #getScopedDailyRecord;
  #todayKey;

  constructor({
    db,
    getActiveProfileId = () => 'default',
    getProfileRecords,
    getScopedDailyRecord,
    todayKey = defaultTodayKey
  }) {
    this.#db = db;
    this.#getActiveProfileId = getActiveProfileId;
    this.#getProfileRecords = getProfileRecords;
    this.#getScopedDailyRecord = getScopedDailyRecord;
    this.#todayKey = todayKey;
  }

  async execute(options = {}) {
    const year = options.year ?? new Date().getFullYear();
    const month = options.month ?? new Date().getMonth();
    const historyLimit = options.historyLimit ?? 20;

    const [stats, streak, bestStreak, consistency, history, heatmap, measurements, dailyLog] = await Promise.all([
      this.getLifetimeStats(),
      this.getStreak(),
      this.getBestStreak(),
      this.getWeeklyConsistency(),
      this.getHistory(historyLimit),
      this.getHeatmapData(year, month),
      this.getMeasurements(),
      this.getDailyLog()
    ]);

    return {
      stats,
      streak,
      bestStreak,
      consistency,
      history,
      heatmap,
      measurements,
      dailyLog,
      completedDates: await this.getCompletedDates()
    };
  }

  async getLifetimeStats() {
    const profileId = this.#getActiveProfileId();
    const stored = await this.#db.get('lifetimeStats', profileId);
    if (stored) {
      return {
        ...stored,
        totalCalories: stored.totalCaloriesBurned || 0,
        totalHoursExercised: stored.totalHoursExercised || Number(((stored.totalMinutes || 0) / 60).toFixed(1))
      };
    }

    const sessions = await this.#getProfileRecords(this.#db, 'sessions', profileId);
    const habits = await this.#getProfileRecords(this.#db, 'habits', profileId);
    const totalMinutes = sessions.reduce((sum, session) => sum + (session.duration || 0), 0);
    return {
      profileId,
      totalWorkouts: sessions.length,
      totalCalories: sessions.reduce((sum, session) => sum + (session.calories || 0), 0),
      totalCaloriesBurned: sessions.reduce((sum, session) => sum + (session.calories || 0), 0),
      totalMinutes,
      totalHoursExercised: Number((totalMinutes / 60).toFixed(1)),
      totalExercises: sessions.reduce((sum, session) => sum + (session.exercises || 0), 0),
      totalReps: {},
      totalPlankSec: 0,
      totalYogaMin: 0,
      totalStepsLogged: habits.reduce((sum, habit) => sum + (habit.steps || 0), 0),
      bestStreakEver: await this.getBestStreak(),
      currentStreak: await this.getStreak(),
      xp: 0,
      level: 1
    };
  }

  async getDailyLog(date = this.#todayKey()) {
    return this.#getScopedDailyRecord(this.#db, 'dailyLogs', this.#getActiveProfileId(), date, { waterGlasses: [] });
  }

  async getCompletedDates() {
    const logs = await this.#getProfileRecords(this.#db, 'dailyLogs', this.#getActiveProfileId());
    return logs.filter((log) => log.workoutCompleted).map((log) => log.date);
  }

  async getMeasurements() {
    const measurements = await this.#getProfileRecords(this.#db, 'measurements', this.#getActiveProfileId());
    return [...measurements].sort((a, b) => b.date.localeCompare(a.date));
  }

  async getStreak() {
    const logs = await this.#getProfileRecords(this.#db, 'dailyLogs', this.#getActiveProfileId());
    const completedDates = new Set(logs.filter((log) => log.workoutCompleted).map((log) => log.date));
    let streak = 0;
    const now = new Date();

    for (let i = 0; i < 365; i += 1) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      const dateStr = this.#todayKey(date);
      if (completedDates.has(dateStr)) {
        streak += 1;
      } else if (i > 0) {
        break;
      }
    }
    return streak;
  }

  async getBestStreak() {
    const logs = await this.#getProfileRecords(this.#db, 'dailyLogs', this.#getActiveProfileId());
    const dates = logs.filter((log) => log.workoutCompleted).map((log) => log.date).sort();
    if (!dates.length) return 0;

    let best = 1;
    let current = 1;
    for (let i = 1; i < dates.length; i += 1) {
      const diff = (new Date(dates[i]) - new Date(dates[i - 1])) / 86400000;
      if (diff === 1) {
        current += 1;
        best = Math.max(best, current);
      } else {
        current = 1;
      }
    }
    return best;
  }

  async getWeeklyConsistency() {
    const logs = await this.#getProfileRecords(this.#db, 'dailyLogs', this.#getActiveProfileId());
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());

    let daysExercised = 0;
    for (let i = 0; i < 7; i += 1) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      const dateStr = this.#todayKey(date);
      const log = logs.find((entry) => entry.date === dateStr);
      if (log?.workoutCompleted) daysExercised += 1;
    }

    return Math.round((daysExercised / 7) * 100);
  }

  async getHeatmapData(year, month) {
    const logs = await this.#getProfileRecords(this.#db, 'dailyLogs', this.#getActiveProfileId());
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    return logs.filter((log) => log.date.startsWith(prefix));
  }

  async getHistory(limit = 20) {
    const sessions = await this.#getProfileRecords(this.#db, 'sessions', this.#getActiveProfileId());
    return [...sessions].sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt))).slice(0, limit);
  }
}
