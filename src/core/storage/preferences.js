/**
 * Preferences - thin wrapper for localStorage (tiny config only).
 */
const DEFAULT_FEATURE_FLAGS = Object.freeze({
  challenge: true,
  progress: true,
  settings: true,
  achievements: true,
  soreness: true,
  habitSignals: true,
  recoveryInsights: true,
  exerciseLibrary: true,
  customWorkouts: true,
  timers: true
});

export class Preferences {
  #prefix;

  constructor(prefix = 'openfit') {
    this.#prefix = prefix;
  }

  #storageKey(key) {
    return `${this.#prefix}_${key}`;
  }

  get(key, defaultValue = null) {
    const raw = localStorage.getItem(this.#storageKey(key));
    if (raw === null) return defaultValue;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  set(key, value) {
    localStorage.setItem(this.#storageKey(key), JSON.stringify(value));
  }

  remove(key) {
    localStorage.removeItem(this.#storageKey(key));
  }

  has(key) {
    return localStorage.getItem(this.#storageKey(key)) !== null;
  }

  getFeatureFlags() {
    return {
      ...DEFAULT_FEATURE_FLAGS,
      ...(this.get('featureFlags', {}) || {})
    };
  }

  isFeatureEnabled(feature) {
    return this.getFeatureFlags()[feature] !== false;
  }

  setFeatureFlag(feature, enabled) {
    const flags = this.getFeatureFlags();
    flags[feature] = enabled;
    this.set('featureFlags', flags);
  }

  exportAll() {
    const data = {};
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key?.startsWith(`${this.#prefix}_`)) {
        data[key] = localStorage.getItem(key);
      }
    }
    return data;
  }

  importAll(entries = {}) {
    for (const [key, value] of Object.entries(entries)) {
      if (key?.startsWith(`${this.#prefix}_`)) {
        localStorage.setItem(key, value);
      }
    }
  }

  clearAll() {
    Object.keys(this.exportAll()).forEach((key) => localStorage.removeItem(key));
  }
}
