/**
 * Lightweight Event Bus - Observer pattern for decoupled communication.
 */
export class EventBus {
  #listeners = new Map();

  on(event, handler) {
    if (!this.#listeners.has(event)) this.#listeners.set(event, new Set());
    this.#listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    this.#listeners.get(event)?.delete(handler);
  }

  emit(event, payload) {
    this.#listeners.get(event)?.forEach((fn) => {
      try { fn(payload); } catch (error) { console.error(`[EventBus] Error in ${event}:`, error); }
    });
  }
}

export const Events = {
  WORKOUT_STARTED: 'workout:started',
  WORKOUT_COMPLETED: 'workout:completed',
  EXERCISE_COMPLETED: 'exercise:completed',
  SET_COMPLETED: 'set:completed',
  REST_STARTED: 'rest:started',
  REST_ENDED: 'rest:ended',
  WEIGHT_UPDATED: 'weight:updated',
  MEASUREMENTS_UPDATED: 'measurements:updated',
  HABIT_COMPLETED: 'habit:completed',
  HABIT_SAVED: 'habit:saved',
  STREAK_INCREASED: 'streak:increased',
  ACHIEVEMENT_UNLOCKED: 'achievement:unlocked',
  RPE_RECORDED: 'rpe:recorded',
  PROFILE_UPDATED: 'profile:updated',
  CUSTOM_WORKOUTS_CHANGED: 'customWorkouts:changed',
  MONTHLY_CHALLENGE_COMPLETED: 'monthlyChallenge:completed',
  DESK_BREAK: 'desk:break',
  PAGE_CHANGED: 'page:changed',
  TIMER_TICK: 'timer:tick',
  TIMER_COMPLETE: 'timer:complete',
};
