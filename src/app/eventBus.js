/**
 * Lightweight Event Bus - Observer pattern for decoupled communication.
 * Components never talk directly — always through events.
 */
export class EventBus {
  #listeners = new Map();
  
  on(event, handler) {
    if (!this.#listeners.has(event)) this.#listeners.set(event, new Set());
    this.#listeners.get(event).add(handler);
    return () => this.off(event, handler); // returns unsubscribe fn
  }
  
  off(event, handler) {
    this.#listeners.get(event)?.delete(handler);
  }
  
  emit(event, payload) {
    this.#listeners.get(event)?.forEach(fn => {
      try { fn(payload); } catch(e) { console.error(`[EventBus] Error in ${event}:`, e); }
    });
  }
}

// Event constants
export const Events = {
  WORKOUT_STARTED: 'workout:started',
  WORKOUT_COMPLETED: 'workout:completed',
  EXERCISE_COMPLETED: 'exercise:completed',
  SET_COMPLETED: 'set:completed',
  REST_STARTED: 'rest:started',
  REST_ENDED: 'rest:ended',
  WEIGHT_UPDATED: 'weight:updated',
  HABIT_COMPLETED: 'habit:completed',
  STREAK_INCREASED: 'streak:increased',
  ACHIEVEMENT_UNLOCKED: 'achievement:unlocked',
  RPE_RECORDED: 'rpe:recorded',
  PROFILE_UPDATED: 'profile:updated',
  DESK_BREAK: 'desk:break',
  PAGE_CHANGED: 'page:changed',
  TIMER_TICK: 'timer:tick',
  TIMER_COMPLETE: 'timer:complete',
};
