import { Events } from '../../app/eventBus.js';
import { getLocalDateStr } from '../../core/utils/dateUtils.js';
import { User } from '../../domain/entities/User.js';

export class UpdateProfile {
  #db;
  #prefs;
  #bus;

  constructor(db, prefs, bus) {
    this.#db = db;
    this.#prefs = prefs;
    this.#bus = bus;
  }

  getUser(fallback = {}) {
    return new User(this.#prefs.get('user') || fallback);
  }

  getSettings() {
    return {
      user: this.getUser(),
      units: this.#prefs.get('units', 'metric'),
      soundEnabled: this.#prefs.get('soundEnabled', true),
      voiceEnabled: this.#prefs.get('voiceEnabled', true)
    };
  }

  hasUserProfile() {
    return this.#prefs.has('user');
  }

  update(fields, currentUser = this.getUser()) {
    const base = currentUser instanceof User ? currentUser : new User(currentUser);
    const next = new User({
      ...base,
      ...fields
    });
    this.#prefs.set('user', next);
    this.#bus.emit(Events.PROFILE_UPDATED, next);
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

  async resetAllData(storeNames, keyPrefix = 'openfit_') {
    await Promise.all(storeNames.map((store) => this.#db.clear(store)));
    const keys = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key?.startsWith(keyPrefix)) keys.push(key);
    }
    keys.forEach((key) => localStorage.removeItem(key));
  }

  async getMeasurements() {
    const rows = await this.#db.getAll('measurements');
    return rows.sort((a, b) => b.date.localeCompare(a.date));
  }

  async addMeasurement(entry) {
    const normalized = {
      date: entry.date || getLocalDateStr(),
      weight: Number(entry.weight),
      note: entry.note || ''
    };
    await this.#db.put('measurements', normalized);
    if (normalized.date === getLocalDateStr()) {
      const user = this.getUser();
      user.weight = normalized.weight;
      this.#prefs.set('user', user);
      this.#bus.emit(Events.PROFILE_UPDATED, user);
    }
    this.#bus.emit(Events.WEIGHT_UPDATED, normalized);
    return normalized;
  }
}
