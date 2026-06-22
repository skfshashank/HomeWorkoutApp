/**
 * RecoveryEngine - calculates recovery score and muscle availability.
 * 
 * Input: sleep, energy, soreness, recent workout history
 * Output: recovery score (0-100), muscles to avoid
 */
export class RecoveryEngine {
  #db;
  
  constructor(db) {
    this.#db = db;
  }
  
  async calculateScore(habit) {
    let score = 50; // baseline
    
    // Sleep factor (+/- 20)
    if (habit.sleep >= 7) score += 20;
    else if (habit.sleep >= 6) score += 10;
    else if (habit.sleep < 5) score -= 15;
    
    // Energy factor (+/- 15)
    if (habit.energy === 'high') score += 15;
    else if (habit.energy === 'low') score -= 15;
    
    // Mood factor (+/- 10)
    if (habit.mood === 'great') score += 10;
    else if (habit.mood === 'bad') score -= 10;
    
    // Soreness factor (-5 per sore group)
    score -= habit.soreness.length * 5;
    
    // Consecutive days factor
    const streak = await this.getRecentConsecutiveDays();
    if (streak >= 5) score -= 10; // needs rest
    
    return Math.max(0, Math.min(100, score));
  }
  
  getRecommendation(score) {
    if (score >= 80) return { type: 'full', label: 'Ready to Train', color: '#22c55e' };
    if (score >= 60) return { type: 'moderate', label: 'Light Training', color: '#fb923c' };
    if (score >= 40) return { type: 'light', label: 'Active Recovery', color: '#f59e0b' };
    return { type: 'rest', label: 'Rest Day', color: '#f87171' };
  }
  
  getMusclestoAvoid(soreness) {
    // Map soreness areas to exercise muscle groups to avoid
    const mapping = {
      'chest': ['chest', 'shoulders'],
      'back': ['back', 'lats'],
      'legs': ['quads', 'hamstrings', 'glutes', 'calves'],
      'arms': ['biceps', 'triceps'],
      'core': ['abs', 'obliques'],
      'shoulders': ['shoulders', 'chest']
    };
    const avoid = new Set();
    soreness.forEach(area => {
      (mapping[area] || [area]).forEach(m => avoid.add(m));
    });
    return [...avoid];
  }
  
  async getRecentConsecutiveDays() {
    const logs = await this.#db.getAll('dailyLogs');
    // Count consecutive completed days from today backwards
    let count = 0;
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const log = logs.find(l => l.date === dateStr);
      if (log && log.workoutCompleted) count++;
      else break;
    }
    return count;
  }
}
