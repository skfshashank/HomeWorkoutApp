/**
 * NotificationService - wraps Notification API.
 */
export class NotificationService {
  #permitted = false;

  constructor() {
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
  
  deskBreak(exerciseName) {
    return this.notify('⏰ Time to Move!', {
      body: `You've been sitting for 50 minutes. Try: ${exerciseName}`,
      tag: 'desk-break',
      requireInteraction: true
    });
  }
  
  workoutReminder(goal = 'daily') {
    return this.notify('OpenFit Local', {
      body: `Time for your workout! 💪 Your ${goal} routine is waiting.`,
      tag: 'workout-reminder'
    });
  }
}
