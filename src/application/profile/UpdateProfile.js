import { User } from '../../domain/entities/User.js';

export class UpdateProfile {
  #db;
  #prefs;
  #bus;
  #events;
  #profileManager;
  #getLocalDateStr;
  #syncMeasurementProgress;

  constructor({
    db,
    prefs,
    bus,
    events,
    profileManager,
    getLocalDateStr,
    syncMeasurementProgress = null
  }) {
    this.#db = db;
    this.#prefs = prefs;
    this.#bus = bus;
    this.#events = events;
    this.#profileManager = profileManager;
    this.#getLocalDateStr = getLocalDateStr;
    this.#syncMeasurementProgress = syncMeasurementProgress;
  }

  getUser(fallback = {}) {
    return new User(this.#prefs.get('user') || fallback);
  }

  getSettings() {
    return {
      user: this.getUser(),
      units: this.#prefs.get('units', 'metric'),
      soundEnabled: this.#prefs.get('soundEnabled', true),
      voiceEnabled: this.#prefs.get('voiceEnabled', true),
      theme: this.#prefs.get('theme', 'dark'),
      reminderConfig: this.getReminderConfig()
    };
  }

  hasUserProfile() {
    return this.#prefs.has('user');
  }

  async initProfiles() {
    const profile = await this.#profileManager.init();
    if (profile) {
      this.#bus.emit(this.#events.PROFILE_UPDATED, profile);
    }
    return profile;
  }

  async getProfiles() {
    return this.#profileManager.getProfiles();
  }

  async saveProfile(data, options = {}) {
    const saved = await this.#profileManager.saveProfile(data, options);
    this.#bus.emit(this.#events.PROFILE_UPDATED, saved);
    return saved;
  }

  async switchProfile(profileId) {
    return this.#profileManager.switchProfile(profileId);
  }

  async deleteProfile(profileId) {
    return this.#profileManager.deleteProfile(profileId);
  }

  update(fields, currentUser = this.getUser()) {
    const base = currentUser instanceof User ? currentUser : new User(currentUser);
    const next = new User({
      ...base,
      ...fields
    });
    this.#prefs.set('user', next);
    this.#bus.emit(this.#events.PROFILE_UPDATED, next);
    return next;
  }

  setUnits(units) {
    this.#prefs.set('units', units);
    return units;
  }

  setPreference(key, value) {
    this.#prefs.set(key, value);
    return value;
  }

  setTheme(theme) {
    this.#prefs.set('theme', theme === 'light' ? 'light' : 'dark');
    return this.#prefs.get('theme', 'dark');
  }

  getReminderConfig() {
    const config = this.#prefs.get('workoutReminder', {}) || {};
    return {
      enabled: Boolean(config.enabled),
      hour: Number.isFinite(config.hour) ? config.hour : 7,
      minute: Number.isFinite(config.minute) ? config.minute : 0
    };
  }

  setReminderConfig(config = {}) {
    const next = {
      enabled: Boolean(config.enabled),
      hour: Math.max(0, Math.min(23, Number(config.hour ?? 7))),
      minute: Math.max(0, Math.min(59, Number(config.minute ?? 0)))
    };
    this.#prefs.set('workoutReminder', next);
    return next;
  }

  async resetAllData(storeNames) {
    await Promise.all(storeNames.map((store) => this.#db.clear(store)));
    this.#prefs.clearAll();
  }

  async getMeasurements() {
    const rows = await this.#db.getAll('measurements');
    return rows.filter((row) => row.profileId === this.#profileManager.getActiveProfileId()).sort((a, b) => b.date.localeCompare(a.date));
  }

  async addMeasurement(entry) {
    const profileId = this.#profileManager.getActiveProfileId();
    const normalized = {
      id: entry.id || `${profileId}:${entry.date || this.#getLocalDateStr()}`,
      profileId,
      date: entry.date || this.#getLocalDateStr(),
      weight: Number(entry.weight),
      waist: Number(entry.waist || 0),
      neck: Number(entry.neck || 0),
      hip: Number(entry.hip || 0),
      bodyFat: Number(entry.bodyFat || 0),
      note: entry.note || ''
    };
    await this.#db.put('measurements', normalized);
    if (normalized.date === this.#getLocalDateStr()) {
      const user = this.getUser();
      user.weight = normalized.weight;
      await this.saveProfile(user, { setActive: true });
    }
    if (this.#syncMeasurementProgress) {
      await this.#syncMeasurementProgress(profileId);
    }
    this.#bus.emit(this.#events.WEIGHT_UPDATED, normalized);
    this.#bus.emit(this.#events.MEASUREMENTS_UPDATED, normalized);
    return normalized;
  }
}
