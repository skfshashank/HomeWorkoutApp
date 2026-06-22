export class StorageService {
  constructor(namespace = 'openfit') {
    this.baseNamespace = namespace;
    this.ns = namespace;
    this.memory = new Map();
    this.storageEnabled = this.detectStorage();
  }

  detectStorage() {
    try {
      const key = '__openfit_probe__';
      globalThis.localStorage?.setItem(key, '1');
      globalThis.localStorage?.removeItem(key);
      return Boolean(globalThis.localStorage);
    } catch {
      return false;
    }
  }

  makeKey(key) {
    return `${this.ns}_${key}`;
  }

  get(key, fallback = null) {
    const storageKey = this.makeKey(key);
    try {
      const raw = this.storageEnabled ? globalThis.localStorage.getItem(storageKey) : this.memory.get(storageKey);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  set(key, value) {
    const storageKey = this.makeKey(key);
    const payload = JSON.stringify(value);
    if (this.storageEnabled) {
      globalThis.localStorage.setItem(storageKey, payload);
    } else {
      this.memory.set(storageKey, payload);
    }
    return value;
  }

  remove(key) {
    const storageKey = this.makeKey(key);
    if (this.storageEnabled) {
      globalThis.localStorage.removeItem(storageKey);
    }
    this.memory.delete(storageKey);
  }

  keys() {
    const keys = new Set();
    if (this.storageEnabled) {
      for (let index = 0; index < globalThis.localStorage.length; index += 1) {
        const key = globalThis.localStorage.key(index);
        if (key?.startsWith(`${this.ns}_`)) {
          keys.add(key.replace(`${this.ns}_`, ''));
        }
      }
    }
    for (const key of this.memory.keys()) {
      if (key.startsWith(`${this.ns}_`)) {
        keys.add(key.replace(`${this.ns}_`, ''));
      }
    }
    return [...keys].sort();
  }

  exportAll() {
    const data = {};
    for (const key of this.keys()) {
      data[key] = this.get(key);
    }
    return {
      namespace: this.ns,
      exportedAt: new Date().toISOString(),
      data
    };
  }

  importAll(json) {
    const parsed = typeof json === 'string' ? JSON.parse(json) : json;
    const data = parsed?.data ?? parsed;
    Object.entries(data).forEach(([key, value]) => this.set(key, value));
    return data;
  }

  clearNamespace() {
    this.keys().forEach((key) => this.remove(key));
  }

  switchProfile(profileId) {
    this.ns = `${this.baseNamespace}_${profileId || 'default'}`;
    return this.ns;
  }
}
