/**
 * Preferences - thin wrapper for localStorage (tiny config only).
 */
export class Preferences {
  #prefix;
  
  constructor(prefix = 'openfit') {
    this.#prefix = prefix;
  }
  
  get(key, defaultValue = null) {
    const raw = localStorage.getItem(`${this.#prefix}_${key}`);
    if (raw === null) return defaultValue;
    try { return JSON.parse(raw); } catch { return raw; }
  }
  
  set(key, value) {
    localStorage.setItem(`${this.#prefix}_${key}`, JSON.stringify(value));
  }
  
  remove(key) {
    localStorage.removeItem(`${this.#prefix}_${key}`);
  }
  
  has(key) {
    return localStorage.getItem(`${this.#prefix}_${key}`) !== null;
  }
  
  // Feature flags
  isFeatureEnabled(feature) {
    const flags = this.get('featureFlags', {});
    return flags[feature] === true;
  }
  
  setFeatureFlag(feature, enabled) {
    const flags = this.get('featureFlags', {});
    flags[feature] = enabled;
    this.set('featureFlags', flags);
  }
}
