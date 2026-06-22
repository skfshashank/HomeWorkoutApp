/**
 * NotificationService - wraps Notification API.
 */
export class NotificationService {
  #permitted = false;
  
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
      icon: '/assets/icons/icon-192.svg',
      badge: '/assets/icons/icon-72.svg',
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
  
  workoutReminder() {
    return this.notify('💪 Workout Time!', {
      body: "Your daily workout is waiting. Let's crush it!",
      tag: 'workout-reminder'
    });
  }
}
