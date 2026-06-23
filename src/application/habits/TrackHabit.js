import { parseDateSafe } from '../../core/utils/dateUtils.js';

export class TrackHabit {
  #db;
  #prefs;
  #bus;
  #events;
  #getActiveProfileId;
  #getLocalDateStr;
  #getProfileRecords;
  #getScopedDailyRecord;
  #applyHabitProgress;

  constructor({
    db,
    prefs,
    bus,
    events,
    getActiveProfileId,
    getLocalDateStr,
    getProfileRecords,
    getScopedDailyRecord,
    applyHabitProgress = null
  }) {
    this.#db = db;
    this.#prefs = prefs;
    this.#bus = bus;
    this.#events = events;
    this.#getActiveProfileId = getActiveProfileId;
    this.#getLocalDateStr = getLocalDateStr;
    this.#getProfileRecords = getProfileRecords;
    this.#getScopedDailyRecord = getScopedDailyRecord;
    this.#applyHabitProgress = applyHabitProgress;
  }

  async getDailyLog(date = this.#getLocalDateStr()) {
    return this.#getScopedDailyRecord(this.#db, 'dailyLogs', this.#getActiveProfileId(), date, { waterGlasses: [] });
  }

  async getHabit(date = this.#getLocalDateStr()) {
    const habit = await this.#getScopedDailyRecord(this.#db, 'habits', this.#getActiveProfileId(), date, {
      water: 0,
      sleepHours: 0,
      customHabits: []
    });
    return this.#normalizeHabit(habit);
  }

  async getHabitSummary(date = this.#getLocalDateStr()) {
    const [dailyLog, habit] = await Promise.all([
      this.getDailyLog(date),
      this.getHabit(date)
    ]);
    return {
      date,
      waterCount: (dailyLog.waterGlasses || []).length,
      sleepHours: this.#getSleepHoursValue(habit) || null,
      steps: habit?.steps ?? null,
      energy: habit?.energy ?? 'medium',
      mood: habit?.mood ?? 'okay',
      soreness: habit?.soreness ?? []
    };
  }

  async getTrackerViewModel(date = this.#getLocalDateStr()) {
    const [habit, records] = await Promise.all([
      this.getHabit(date),
      this.#getProfileRecords('habits', this.#getActiveProfileId())
    ]);
    return {
      habit,
      weekly: this.calculateConsistency(records, 7),
      monthly: this.calculateConsistency(records, 30),
      sleepAvg: this.calculateSleepAverage(records, 7)
    };
  }

  calculateConsistency(records, days) {
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - (days - 1));
    const recent = records.filter((record) => parseDateSafe(record.date) >= cutoff);
    const scored = recent.filter((record) => (
      (record.water || 0) >= 8
      || this.#getSleepHoursValue(record) >= 7
      || (record.steps || 0) > 0
      || (record.customHabits || []).some((item) => item.completed)
    ));
    return Math.round((scored.length / Math.max(days, 1)) * 100);
  }

  calculateSleepAverage(records, days) {
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - (days - 1));
    const recent = records.filter((record) => parseDateSafe(record.date) >= cutoff && this.#getSleepHoursValue(record) > 0);
    if (!recent.length) return 0;
    return recent.reduce((sum, record) => sum + this.#getSleepHoursValue(record), 0) / recent.length;
  }

  calculateSleepHours(bedtime, wakeTime) {
    if (!bedtime || !wakeTime) return 0;
    const [bedHour, bedMinute] = bedtime.split(':').map(Number);
    const [wakeHour, wakeMinute] = wakeTime.split(':').map(Number);
    let bed = bedHour * 60 + bedMinute;
    let wake = wakeHour * 60 + wakeMinute;
    if (wake <= bed) wake += 24 * 60;
    return Number(((wake - bed) / 60).toFixed(1));
  }

  async toggleWater(index, date = this.#getLocalDateStr()) {
    return this.#saveHabit(date, async (habit, dailyLog) => {
      const filled = new Set(dailyLog.waterGlasses || []);
      if (filled.has(index)) filled.delete(index);
      else filled.add(index);
      dailyLog.waterGlasses = [...filled].sort((a, b) => a - b);
      habit.water = dailyLog.waterGlasses.length;
    });
  }

  async updateFields(fields, date = this.#getLocalDateStr()) {
    return this.#saveHabit(date, async (habit) => {
      Object.assign(habit, fields);
    });
  }

  async addCustomHabit(label, date = this.#getLocalDateStr()) {
    return this.#saveHabit(date, async (habit) => {
      habit.customHabits = habit.customHabits || [];
      habit.customHabits.push({ id: `${Date.now().toString(36)}`, label, completed: false });
    });
  }

  async toggleCustomHabit(habitId, date = this.#getLocalDateStr()) {
    return this.#saveHabit(date, async (habit) => {
      const item = (habit.customHabits || []).find((entry) => entry.id === habitId);
      if (item) item.completed = !item.completed;
    });
  }

  async saveDailySignals(payload, date = this.#getLocalDateStr()) {
    return this.#saveHabit(date, async (habit) => {
      habit.sleepHours = Number(payload.sleepHours ?? payload.sleep) || 0;
      habit.steps = Number(payload.steps) || 0;
      habit.energy = payload.energy || 'medium';
      habit.mood = payload.mood || 'okay';
      habit.soreness = Array.isArray(payload.soreness) ? payload.soreness : [];
      delete habit.sleep;
    });
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
      const endsAt = now + durationMs;
      this.#prefs.set('deskModeEndsAt', endsAt);
      return endsAt;
    }
    this.#prefs.remove('deskModeEndsAt');
    return null;
  }

  renewDeskMode(now = Date.now(), durationMs = 50 * 60 * 1000) {
    const endsAt = now + durationMs;
    this.#prefs.set('deskModeEndsAt', endsAt);
    return endsAt;
  }

  async #saveHabit(date, mutate) {
    const habit = await this.getHabit(date);
    const previous = JSON.parse(JSON.stringify(habit));
    const dailyLog = await this.getDailyLog(date);
    await mutate(habit, dailyLog);

    if ((!habit.sleepHours || Number(habit.sleepHours) === 0) && habit.bedtime && habit.wakeTime) {
      habit.sleepHours = this.calculateSleepHours(habit.bedtime, habit.wakeTime);
    } else {
      habit.sleepHours = this.#getSleepHoursValue(habit);
    }
    delete habit.sleep;

    dailyLog.waterGlasses = dailyLog.waterGlasses || Array.from({ length: Math.max(0, Number(habit.water) || 0) }, (_, index) => index);
    await this.#db.put('dailyLogs', dailyLog);

    let result;
    if (this.#applyHabitProgress) {
      result = await this.#applyHabitProgress(this.#getActiveProfileId(), habit, previous);
      await this.#db.put('habits', result?.habit || habit);
    } else {
      await this.#db.put('habits', habit);
      result = { habit, earnedXp: 0 };
    }

    if (!result?.earnedXp) {
      this.#bus.emit(this.#events.HABIT_SAVED, {
        profileId: this.#getActiveProfileId(),
        habit: result?.habit || habit,
        earnedXp: 0
      });
    }

    return { habit: result?.habit || habit, dailyLog };
  }

  #getSleepHoursValue(record = {}) {
    return Number(record?.sleepHours ?? record?.sleep ?? 0);
  }

  #normalizeHabit(habit = {}) {
    const normalized = {
      water: 0,
      sleepHours: 0,
      customHabits: [],
      ...habit
    };
    normalized.sleepHours = this.#getSleepHoursValue(habit);
    delete normalized.sleep;
    return normalized;
  }
}
