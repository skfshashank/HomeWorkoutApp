/**
 * ProgressionEngine - adaptive difficulty based on RPE feedback.
 * 
 * Rules:
 * - "Too Easy" × 2 consecutive → +10% reps/duration, suggest level up
 * - "Just Right" → maintain
 * - "Exhausting" → -15% next day, swap hardest exercise with recovery yoga
 * - After 3 consecutive completions → auto-suggest +10%
 */
export class ProgressionEngine {
  #db;
  #prefs;
  
  constructor(db, prefs) {
    this.#db = db;
    this.#prefs = prefs;
  }
  
  async recordRPE(rating) {
    // rating: 'too_easy' | 'just_right' | 'exhausting'
    const history = this.#prefs.get('rpe_history', []);
    history.push({ date: new Date().toISOString(), rating });
    // Keep last 10
    if (history.length > 10) history.shift();
    this.#prefs.set('rpe_history', history);
  }
  
  getMultiplier() {
    const history = this.#prefs.get('rpe_history', []);
    const last2 = history.slice(-2);
    
    if (last2.length >= 2 && last2.every(r => r.rating === 'too_easy')) {
      return 1.10; // +10%
    }
    
    if (last2.length >= 1 && last2[last2.length - 1].rating === 'exhausting') {
      return 0.85; // -15%
    }
    
    return 1.0;
  }
  
  shouldLevelUp() {
    const history = this.#prefs.get('rpe_history', []);
    const last3 = history.slice(-3);
    return last3.length >= 3 && last3.every(r => r.rating === 'too_easy');
  }
  
  shouldDeload() {
    const history = this.#prefs.get('rpe_history', []);
    const last2 = history.slice(-2);
    return last2.length >= 2 && last2.every(r => r.rating === 'exhausting');
  }
  
  shouldSubstituteRecovery() {
    const history = this.#prefs.get('rpe_history', []);
    const last = history[history.length - 1];
    return last && last.rating === 'exhausting';
  }
  
  getRecoverySubstitutes() {
    // Return IDs of gentle exercises to swap in
    return ['balasana', 'shavasana', 'anulom-vilom', 'cat-cow', 'child-pose'];
  }
  
  async checkAutoProgression() {
    // If last 3 workouts all completed successfully
    const logs = await this.#db.getAll('dailyLogs');
    const recent = logs.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
    if (recent.length >= 3 && recent.every(l => l.workoutCompleted)) {
      return { shouldProgress: true, message: 'You\'re crushing it! Increasing targets by 10%' };
    }
    return { shouldProgress: false };
  }
}
