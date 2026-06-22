/**
 * Use Case: Complete a workout and record results.
 */
import { Events } from '../../app/eventBus.js';

export class CompleteWorkout {
  #db;
  #bus;
  #progression;
  
  constructor(db, bus, progressionEngine) {
    this.#db = db;
    this.#bus = bus;
    this.#progression = progressionEngine;
  }
  
  async execute(session, rpeRating) {
    const duration = Math.round((Date.now() - new Date(session.startedAt).getTime()) / 60000);
    
    // Save to history
    const record = {
      id: session.id,
      date: new Date().toISOString().split('T')[0],
      workout: session.workoutName || 'Custom',
      duration,
      calories: session.totalCalories,
      exercises: session.totalExercises,
      completedAt: new Date().toISOString()
    };
    await this.#db.put('sessions', record);
    
    // Update daily log
    const today = new Date().toISOString().split('T')[0];
    const log = (await this.#db.get('dailyLogs', today)) || { date: today };
    log.workoutCompleted = true;
    log.calories = (log.calories || 0) + session.totalCalories;
    log.minutes = (log.minutes || 0) + duration;
    log.exerciseCount = (log.exerciseCount || 0) + session.totalExercises;
    await this.#db.put('dailyLogs', log);
    
    // Record RPE
    if (rpeRating) {
      await this.#progression.recordRPE(rpeRating);
    }
    
    // Check auto-progression
    const progressCheck = await this.#progression.checkAutoProgression();
    
    // Emit events
    this.#bus.emit(Events.WORKOUT_COMPLETED, { record, progressCheck, rpeRating });
    this.#bus.emit(Events.STREAK_INCREASED, {});
    
    return { record, progressCheck };
  }
}
