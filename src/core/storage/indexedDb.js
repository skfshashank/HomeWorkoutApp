/**
 * IndexedDB wrapper - stores structured dynamic data.
 */
export class IndexedDbService {
  #db = null;
  #dbName;
  #version;

  constructor(dbName = 'openfit_db', version = 3) {
    this.#dbName = dbName;
    this.#version = version;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.#dbName, this.#version);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        const { oldVersion } = event;

        const ensureIndex = (store, name, keyPath, options) => {
          if (!store.indexNames.contains(name)) store.createIndex(name, keyPath, options);
        };

        const createOrRecreateStore = (name, options, configure, recreate = false) => {
          if (db.objectStoreNames.contains(name) && recreate) db.deleteObjectStore(name);
          const store = db.objectStoreNames.contains(name)
            ? event.target.transaction.objectStore(name)
            : db.createObjectStore(name, options);
          configure?.(store);
          return store;
        };

        createOrRecreateStore('users', { keyPath: 'id' });
        createOrRecreateStore('profiles', { keyPath: 'id' }, (store) => ensureIndex(store, 'name', 'name'));
        createOrRecreateStore('sessions', { keyPath: 'id' }, (store) => {
          ensureIndex(store, 'date', 'date');
          ensureIndex(store, 'type', 'type');
          ensureIndex(store, 'profileId', 'profileId');
          ensureIndex(store, 'completedAt', 'completedAt');
        });
        createOrRecreateStore('measurements', { keyPath: 'id' }, (store) => {
          ensureIndex(store, 'profileId', 'profileId');
          ensureIndex(store, 'date', 'date');
        }, oldVersion < 3);
        createOrRecreateStore('habits', { keyPath: 'id' }, (store) => {
          ensureIndex(store, 'profileId', 'profileId');
          ensureIndex(store, 'date', 'date');
        }, oldVersion < 3);
        createOrRecreateStore('achievements', { keyPath: 'id' }, (store) => {
          ensureIndex(store, 'profileId', 'profileId');
          ensureIndex(store, 'unlockedAt', 'unlockedAt');
        });
        createOrRecreateStore('customWorkouts', { keyPath: 'id' }, (store) => {
          ensureIndex(store, 'profileId', 'profileId');
          ensureIndex(store, 'updatedAt', 'updatedAt');
        });
        createOrRecreateStore('dailyLogs', { keyPath: 'id' }, (store) => {
          ensureIndex(store, 'profileId', 'profileId');
          ensureIndex(store, 'date', 'date');
        }, oldVersion < 3);
        createOrRecreateStore('exerciseMeta', { keyPath: 'id' }, (store) => {
          ensureIndex(store, 'profileId', 'profileId');
          ensureIndex(store, 'favorite', 'favorite');
          ensureIndex(store, 'lastUsedAt', 'lastUsedAt');
        });
        createOrRecreateStore('lifetimeStats', { keyPath: 'id' });
        createOrRecreateStore('sorenessLogs', { keyPath: 'id' }, (store) => {
          ensureIndex(store, 'profileId', 'profileId');
          ensureIndex(store, 'date', 'date');
        });
        createOrRecreateStore('monthlyChallenges', { keyPath: 'id' }, (store) => {
          ensureIndex(store, 'profileId', 'profileId');
          ensureIndex(store, 'month', 'month');
        });
      };

      request.onsuccess = (event) => {
        this.#db = event.target.result;
        resolve(this);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async put(storeName, data) {
    return this.#tx(storeName, 'readwrite', (store) => store.put(data));
  }

  async get(storeName, key) {
    return this.#tx(storeName, 'readonly', (store) => store.get(key));
  }

  async getAll(storeName) {
    return this.#tx(storeName, 'readonly', (store) => store.getAll());
  }

  async getAllByIndex(storeName, indexName, value) {
    return this.#tx(storeName, 'readonly', (store) => store.index(indexName).getAll(value));
  }

  async getRange(storeName, indexName, lower, upper) {
    const range = IDBKeyRange.bound(lower, upper);
    return this.#tx(storeName, 'readonly', (store) => store.index(indexName).getAll(range));
  }

  async delete(storeName, key) {
    return this.#tx(storeName, 'readwrite', (store) => store.delete(key));
  }

  async clear(storeName) {
    return this.#tx(storeName, 'readwrite', (store) => store.clear());
  }

  async count(storeName) {
    return this.#tx(storeName, 'readonly', (store) => store.count());
  }

  async exportAll() {
    const stores = Array.from(this.#db.objectStoreNames);
    const data = {};
    for (const name of stores) {
      data[name] = await this.getAll(name);
    }
    return data;
  }

  async importAll(data) {
    for (const [storeName, records] of Object.entries(data || {})) {
      if (!this.#db.objectStoreNames.contains(storeName)) continue;
      for (const record of records) {
        await this.put(storeName, record);
      }
    }
  }

  #tx(storeName, mode, operation) {
    return new Promise((resolve, reject) => {
      const tx = this.#db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const request = operation(store);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}
