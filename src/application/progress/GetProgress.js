/**
 * Use Case: Get progress statistics.
 */
export class GetProgress {
  #db;
  
  constructor(db) {
    this.#db = db;
  }
  
  async getLifetimeStats() {
    const sessions = await this.#db.getAll('sessions');
    return {
      totalWorkouts: sessions.length,
      totalCalories: sessions.reduce((s, r) => s + (r.calories || 0), 0),
      totalMinutes: sessions.reduce((s, r) => s + (r.duration || 0), 0),
      totalExercises: sessions.reduce((s, r) => s + (r.exercises || 0), 0)
    };
  }
  
  async getStreak() {
    const logs = await this.#db.getAll('dailyLogs');
    const completedDates = new Set(
      logs.filter(l => l.workoutCompleted).map(l => l.date)
    );
    
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      if (completedDates.has(dateStr)) streak++;
      else if (i > 0) break; // allow today to not be completed yet
    }
    return streak;
  }
  
  async getBestStreak() {
    const logs = await this.#db.getAll('dailyLogs');
    const dates = logs.filter(l => l.workoutCompleted).map(l => l.date).sort();
    
    let best = 0, current = 1;
    for (let i = 1; i < dates.length; i++) {
      const diff = (new Date(dates[i]) - new Date(dates[i - 1])) / 86400000;
      if (diff === 1) { current++; best = Math.max(best, current); }
      else { current = 1; }
    }
    return Math.max(best, current);
  }
  
  async getWeeklyConsistency() {
    const logs = await this.#db.getAll('dailyLogs');
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    
    let daysExercised = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const log = logs.find(l => l.date === dateStr);
      if (log && log.workoutCompleted) daysExercised++;
    }
    return Math.round((daysExercised / 7) * 100);
  }
  
  async getHeatmapData(year, month) {
    const logs = await this.#db.getAll('dailyLogs');
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    return logs.filter(l => l.date.startsWith(prefix));
  }
  
  async getHistory(limit = 20) {
    const sessions = await this.#db.getAll('sessions');
    return sessions.sort((a, b) => b.completedAt.localeCompare(a.completedAt)).slice(0, limit);
  }
}
