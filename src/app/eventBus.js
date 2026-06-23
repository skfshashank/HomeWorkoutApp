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
  WEIGHT_UPDATED: 'weight:updated',
  MEASUREMENTS_UPDATED: 'measurements:updated',
  HABIT_SAVED: 'habit:saved',
  ACHIEVEMENT_UNLOCKED: 'achievement:unlocked',
  PROFILE_UPDATED: 'profile:updated',
  CUSTOM_WORKOUTS_CHANGED: 'customWorkouts:changed',
  DESK_BREAK: 'desk:break',
  PAGE_CHANGED: 'page:changed',
};
