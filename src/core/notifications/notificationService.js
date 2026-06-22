/**
 * NotificationService - wraps Notification API.
 */
export class NotificationService {
  #permitted = false;
  #i18n;

  constructor(i18n = null) {
    this.#i18n = i18n;
    this.#permitted = ('Notification' in window && Notification.permission === 'granted');
  }
  
  get isAvailable() { return 'Notification' in window; }
  
  async requestPermission() {
    if (!this.isAvailable) return false;
    const result = await Notification.requestPermission();
    this.#permitted = result === 'granted';
    return this.#permitted;
  }
  
  notify(title, options = {}) {
    if (!this.#permitted) return null;
    return new Notification(title, {
      icon: './assets/icons/icon-512.svg',
      badge: './assets/icons/icon-512.svg',
      ...options
    });
  }

  t(key, fallback = key) {
    return this.#i18n?.t(key) || fallback;
  }

  format(key, values = {}, fallback = '') {
    return this.#i18n?.format?.(key, values) || fallback;
  }
  
  deskBreak(exerciseName) {
    return this.notify(this.t('notification_time_to_move', '⏰ Time to Move!'), {
      body: this.format('notification_desk_break_body', { exercise: exerciseName }, `You've been sitting for 50 minutes. Try: ${exerciseName}`),
      tag: 'desk-break',
      requireInteraction: true
    });
  }
  
  workoutReminder(goal = 'daily') {
    return this.notify(this.t('notification_workout_title', 'OpenFit Local'), {
      body: this.format('notification_workout_body', { goal }, `Time for your workout! 💪 Your ${goal} routine is waiting.`),
      tag: 'workout-reminder'
    });
  }
}
