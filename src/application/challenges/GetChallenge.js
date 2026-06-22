import { Events } from '../../app/eventBus.js';
import { daysBetween, today } from '../../core/utils/dateUtils.js';

export class GetChallenge {
  #db;
  #prefs;
  #bus;

  constructor(db, prefs, bus) {
    this.#db = db;
    this.#prefs = prefs;
    this.#bus = bus;
  }

  getState(challengeData) {
    const currentDay = this.getCurrentDay();
    const completedDays = this.getCompletedDays();
    const totalDays = challengeData?.days?.length || 0;
    const progress = totalDays ? Math.round((completedDays.length / totalDays) * 100) : 0;

    return {
      currentDay,
      completedDays,
      activeDay: this.#prefs.get('activeChallengeDay'),
      progress,
      remainingDays: Math.max(totalDays - completedDays.length, 0)
    };
  }

  getCurrentDay() {
    const start = this.#prefs.get('challengeStartDate');
    if (!start) {
      const startDate = today();
      this.#prefs.set('challengeStartDate', startDate);
      return 1;
    }
    return Math.max(1, Math.min(30, daysBetween(start, today()) + 1));
  }

  getCompletedDays() {
    return this.#prefs.get('challengeCompletedDays', []);
  }

  startDay(dayNumber) {
    this.#prefs.set('activeChallengeDay', dayNumber);
    return dayNumber;
  }

  markCompletedDay(dayNumber) {
    const completed = new Set(this.getCompletedDays());
    completed.add(dayNumber);
    const completedDays = [...completed].sort((a, b) => a - b);
    this.#prefs.set('challengeCompletedDays', completedDays);
    this.#bus.emit(Events.HABIT_COMPLETED, { type: 'challenge', day: dayNumber });
    return completedDays;
  }

  completeActiveDay() {
    const activeDay = this.#prefs.get('activeChallengeDay');
    if (!activeDay) return null;
    const completedDays = this.markCompletedDay(activeDay);
    this.#prefs.remove('activeChallengeDay');
    return { activeDay, completedDays };
  }
}
