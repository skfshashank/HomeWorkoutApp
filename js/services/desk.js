export class DeskService {
  constructor(bus, exercises) {
    this.bus = bus;
    this.exercises = exercises.filter((exercise) => exercise.category === 'office');
    this.timeoutId = null;
    this.enabled = false;
    this.intervalMinutes = 50;
  }

  schedule() {
    clearTimeout(this.timeoutId);
    this.timeoutId = setTimeout(() => {
      const exercise = this.getRandomDeskExercise();
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification('Time to move', {
          body: `${exercise.name} • ${exercise.type === 'time' ? `${exercise.levels.beginner}s` : `${exercise.levels.beginner} reps`}`
        });
      }
      this.bus.emit('desk:break', { exercise });
      if (this.enabled) this.schedule();
    }, this.intervalMinutes * 60 * 1000);
  }

  startDeskMode() {
    this.enabled = true;
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => null);
    }
    this.schedule();
    this.bus.emit('desk:updated', { enabled: true });
  }

  stopDeskMode() {
    this.enabled = false;
    clearTimeout(this.timeoutId);
    this.timeoutId = null;
    this.bus.emit('desk:updated', { enabled: false });
  }

  getRandomDeskExercise() {
    return this.exercises[Math.floor(Math.random() * this.exercises.length)] ?? this.exercises[0];
  }
}
