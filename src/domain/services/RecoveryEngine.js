/**
 * RecoveryEngine - calculates recovery score and muscle availability.
 */
const defaultGetDateStr = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export class RecoveryEngine {
  #storage;
  #getActiveProfileId;
  #getDateStr;

  constructor({
    storage,
    getActiveProfileId = () => 'default',
    getDateStr = defaultGetDateStr
  }) {
    this.#storage = storage;
    this.#getActiveProfileId = getActiveProfileId;
    this.#getDateStr = getDateStr;
  }

  async calculateScore(habit) {
    let score = 50;
    if (habit.sleep >= 7) score += 20;
    else if (habit.sleep >= 6) score += 10;
    else if (habit.sleep < 5) score -= 15;

    if (habit.energy === 'high') score += 15;
    else if (habit.energy === 'low') score -= 15;

    if (habit.mood === 'great') score += 10;
    else if (habit.mood === 'bad') score -= 10;

    score -= (habit.soreness || []).length * 5;
    const streak = await this.getRecentConsecutiveDays();
    if (streak >= 5) score -= 10;
    return Math.max(0, Math.min(100, score));
  }

  getRecommendation(score) {
    if (score >= 80) return { type: 'full', label: 'Ready to Train', color: '#22c55e' };
    if (score >= 60) return { type: 'moderate', label: 'Light Training', color: '#fb923c' };
    if (score >= 40) return { type: 'light', label: 'Active Recovery', color: '#f59e0b' };
    return { type: 'rest', label: 'Rest Day', color: '#f87171' };
  }

  getMusclestoAvoid(soreness) {
    const mapping = {
      chest: ['chest', 'shoulders'],
      back: ['back', 'lats'],
      legs: ['quads', 'hamstrings', 'glutes', 'calves'],
      arms: ['biceps', 'triceps'],
      core: ['abs', 'obliques'],
      shoulders: ['shoulders', 'chest'],
      glutes: ['glutes', 'hamstrings'],
      hamstrings: ['hamstrings', 'glutes'],
      quads: ['quads', 'calves']
    };
    const avoid = new Set();
    soreness.forEach((area) => {
      (mapping[area] || [area]).forEach((muscle) => avoid.add(muscle));
    });
    return [...avoid];
  }

  async getRecentConsecutiveDays() {
    const logs = await this.#storage.getLogs(this.#getActiveProfileId(), 30);
    let count = 0;
    const now = new Date();
    for (let i = 0; i < 30; i += 1) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      const dateStr = this.#getDateStr(date);
      const log = logs.find((entry) => entry.date === dateStr);
      if (log?.workoutCompleted) count += 1;
      else break;
    }
    return count;
  }
}
