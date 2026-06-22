import { Events } from '../../app/eventBus.js';
import { getLocalDateStr } from '../../core/utils/dateUtils.js';

export class TrackHabit {
  #db;
  #prefs;
  #bus;

  constructor(db, prefs, bus) {
    this.#db = db;
    this.#prefs = prefs;
    this.#bus = bus;
  }

  async getDailyLog(date = getLocalDateStr()) {
    return (await this.#db.get('dailyLogs', date)) || { date, waterGlasses: [] };
  }

  async getHabitSummary(date = getLocalDateStr()) {
    const [dailyLog, habit] = await Promise.all([
      this.getDailyLog(date),
      this.#db.get('habits', date)
    ]);
    return {
      date,
      waterCount: (dailyLog.waterGlasses || []).length,
      sleep: habit?.sleep ?? null,
      steps: habit?.steps ?? null,
      energy: habit?.energy ?? 'medium',
      mood: habit?.mood ?? 'okay',
      soreness: habit?.soreness ?? []
    };
  }

  async toggleWater(index, date = getLocalDateStr()) {
    const log = await this.getDailyLog(date);
    const filled = new Set(log.waterGlasses || []);
    if (filled.has(index)) filled.delete(index);
    else filled.add(index);
    log.waterGlasses = [...filled].sort((a, b) => a - b);
    await this.#db.put('dailyLogs', log);
    this.#bus.emit(Events.HABIT_COMPLETED, { type: 'water', date, value: log.waterGlasses.length });
    return log;
  }

  async saveDailySignals(payload, date = getLocalDateStr()) {
    const habit = {
      date,
      sleep: Number(payload.sleep) || 0,
      steps: Number(payload.steps) || 0,
      energy: payload.energy || 'medium',
      mood: payload.mood || 'okay',
      soreness: Array.isArray(payload.soreness) ? payload.soreness : []
    };
    await this.#db.put('habits', habit);
    this.#bus.emit(Events.HABIT_COMPLETED, { type: 'recovery', date, value: habit });
    return habit;
  }

  isDeskModeEnabled() {
    return this.#prefs.get('deskModeEnabled', false);
  }

  getDeskModeEndsAt(defaultValue = null) {
    return this.#prefs.get('deskModeEndsAt', defaultValue);
  }

  setDeskMode(enabled, now = Date.now(), durationMs = 50 * 60 * 1000) {
    this.#prefs.set('deskModeEnabled', enabled);
    if (enabled) {
      this.#prefs.set('deskModeEndsAt', now + durationMs);
      return now + durationMs;
    }
    this.#prefs.remove('deskModeEndsAt');
    return null;
  }

  renewDeskMode(now = Date.now(), durationMs = 50 * 60 * 1000) {
    const endsAt = now + durationMs;
    this.#prefs.set('deskModeEndsAt', endsAt);
    return endsAt;
  }
}
