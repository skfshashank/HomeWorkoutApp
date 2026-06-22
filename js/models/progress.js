const dateKey = (value = new Date()) => new Date(value).toISOString().slice(0, 10);

export class ProgressModel {
  constructor(storage) {
    this.storage = storage;
  }

  getHistory(limit) {
    const history = this.storage.get('progress_history', []);
    const ordered = [...history].sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
    return typeof limit === 'number' ? ordered.slice(0, limit) : ordered;
  }

  logWorkout(data) {
    const history = this.getHistory();
    history.push({
      ...data,
      completedAt: data.completedAt || new Date().toISOString()
    });
    this.storage.set('progress_history', history.slice(-365));
    return data;
  }

  getWorkoutDays() {
    return [...new Set(this.getHistory().map((entry) => dateKey(entry.completedAt)))].sort();
  }

  getStreak(asOf = new Date()) {
    const days = new Set(this.getWorkoutDays());
    let cursor = new Date(asOf);
    let streak = 0;
    while (days.has(dateKey(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  getBestStreak() {
    const days = this.getWorkoutDays();
    if (!days.length) return 0;
    let best = 1;
    let current = 1;
    for (let index = 1; index < days.length; index += 1) {
      const prev = new Date(days[index - 1]);
      const next = new Date(days[index]);
      const diff = (next - prev) / 86400000;
      if (diff === 1) {
        current += 1;
        best = Math.max(best, current);
      } else {
        current = 1;
      }
    }
    return best;
  }

  getLifetimeStats() {
    return this.getHistory().reduce((stats, workout) => {
      stats.totalWorkouts += 1;
      stats.totalMinutes += workout.durationMinutes || 0;
      stats.totalCalories += workout.calories || 0;
      stats.totalReps += workout.totalReps || 0;
      return stats;
    }, { totalWorkouts: 0, totalMinutes: 0, totalCalories: 0, totalReps: 0 });
  }

  getWeeklyConsistency(referenceDate = new Date()) {
    const end = new Date(referenceDate);
    const start = new Date(referenceDate);
    start.setDate(end.getDate() - 6);
    const uniqueDays = new Set(
      this.getHistory()
        .filter((entry) => new Date(entry.completedAt) >= start && new Date(entry.completedAt) <= end)
        .map((entry) => dateKey(entry.completedAt))
    );
    return Math.round((uniqueDays.size / 7) * 100);
  }

  getHeatmapData(month = new Date()) {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const history = this.getHistory();
    return Array.from({ length: daysInMonth }, (_, offset) => {
      const date = new Date(year, monthIndex, offset + 1);
      const count = history.filter((entry) => dateKey(entry.completedAt) === dateKey(date)).length;
      return {
        day: offset + 1,
        date: dateKey(date),
        count,
        level: count === 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : 3,
        isToday: dateKey(date) === dateKey(new Date())
      };
    });
  }

  getTodayStats() {
    return this.getHistory().filter((entry) => dateKey(entry.completedAt) === dateKey(new Date())).reduce((stats, entry) => {
      stats.minutes += entry.durationMinutes || 0;
      stats.calories += entry.calories || 0;
      stats.workouts += 1;
      return stats;
    }, { minutes: 0, calories: 0, workouts: 0 });
  }

  getDailyHydration(date = new Date()) {
    const hydration = this.storage.get('hydration', {});
    return hydration[dateKey(date)] || [];
  }

  toggleWater(index, goal = 8) {
    const hydration = this.storage.get('hydration', {});
    const key = dateKey(new Date());
    const glasses = new Set(hydration[key] || []);
    if (glasses.has(index)) {
      glasses.delete(index);
    } else if (index < goal) {
      glasses.add(index);
    }
    hydration[key] = [...glasses].sort((a, b) => a - b);
    this.storage.set('hydration', hydration);
    return hydration[key];
  }

  getChallengeProgress(challengeId = '30-day-belly-fat-blast') {
    const all = this.storage.get('challenge_progress', {});
    return all[challengeId] || [];
  }

  markChallengeDay(day, challengeId = '30-day-belly-fat-blast') {
    const all = this.storage.get('challenge_progress', {});
    const completed = new Set(all[challengeId] || []);
    completed.add(day);
    all[challengeId] = [...completed].sort((a, b) => a - b);
    this.storage.set('challenge_progress', all);
    return all[challengeId];
  }
}
