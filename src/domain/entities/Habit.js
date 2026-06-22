/**
 * Habit Entity - daily habit tracking.
 */
export class Habit {
  constructor(data = {}) {
    this.date = data.date; // YYYY-MM-DD
    this.water = data.water || 0; // glasses (out of 8)
    this.sleepHours = Number(data.sleepHours ?? data.sleep ?? 0); // hours
    this.steps = data.steps || 0;
    this.mood = data.mood || ''; // great|good|okay|bad
    this.energy = data.energy || ''; // high|medium|low
    this.soreness = data.soreness || []; // muscle groups that are sore
    this.customGoals = data.customGoals || []; // { text, completed }
    this.workoutCompleted = data.workoutCompleted || false;
  }
  
  get waterPercentage() { return Math.round((this.water / 8) * 100); }
  get isFullyHydrated() { return this.water >= 8; }
}
