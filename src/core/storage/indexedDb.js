/**
 * IndexedDB wrapper - stores structured dynamic data.
 * Tables: users, sessions, history, measurements, habits, achievements, customWorkouts
 */
export class IndexedDbService {
  #db = null;
  #dbName;
  #version;
  
  constructor(dbName = 'openfit_db', version = 1) {
    this.#dbName = dbName;
    this.#version = version;
  }
  
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.#dbName, this.#version);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Users store
        if (!db.objectStoreNames.contains('users')) {
          db.createObjectStore('users', { keyPath: 'id' });
        }
        
        // Workout sessions (history)
        if (!db.objectStoreNames.contains('sessions')) {
          const store = db.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true });
          store.createIndex('date', 'date');
          store.createIndex('type', 'type');
        }
        
        // Body measurements
        if (!db.objectStoreNames.contains('measurements')) {
          const store = db.createObjectStore('measurements', { keyPath: 'date' });
        }
        
        // Habits
        if (!db.objectStoreNames.contains('habits')) {
          const store = db.createObjectStore('habits', { keyPath: 'date' });
        }
        
        // Achievements
        if (!db.objectStoreNames.contains('achievements')) {
          db.createObjectStore('achievements', { keyPath: 'id' });
        }
        
        // Custom workouts
        if (!db.objectStoreNames.contains('customWorkouts')) {
          db.createObjectStore('customWorkouts', { keyPath: 'id' });
        }
        
        // Daily logs (goals, RPE, etc.)
        if (!db.objectStoreNames.contains('dailyLogs')) {
          const store = db.createObjectStore('dailyLogs', { keyPath: 'date' });
        }
      };
      
      request.onsuccess = (event) => {
        this.#db = event.target.result;
        resolve(this);
      };
      
      request.onerror = () => reject(request.error);
    });
  }
  
  async put(storeName, data) {
    return this.#tx(storeName, 'readwrite', store => store.put(data));
  }
  
  async get(storeName, key) {
    return this.#tx(storeName, 'readonly', store => store.get(key));
  }
  
  async getAll(storeName) {
    return this.#tx(storeName, 'readonly', store => store.getAll());
  }
  
  async getAllByIndex(storeName, indexName, value) {
    return this.#tx(storeName, 'readonly', store => {
      const index = store.index(indexName);
      return index.getAll(value);
    });
  }
  
  async getRange(storeName, indexName, lower, upper) {
    const range = IDBKeyRange.bound(lower, upper);
    return this.#tx(storeName, 'readonly', store => {
      const index = store.index(indexName);
      return index.getAll(range);
    });
  }
  
  async delete(storeName, key) {
    return this.#tx(storeName, 'readwrite', store => store.delete(key));
  }
  
  async clear(storeName) {
    return this.#tx(storeName, 'readwrite', store => store.clear());
  }
  
  async count(storeName) {
    return this.#tx(storeName, 'readonly', store => store.count());
  }
  
  async exportAll() {
    const stores = ['users', 'sessions', 'measurements', 'habits', 'achievements', 'customWorkouts', 'dailyLogs'];
    const data = {};
    for (const name of stores) {
      data[name] = await this.getAll(name);
    }
    return data;
  }
  
  async importAll(data) {
    for (const [storeName, records] of Object.entries(data)) {
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
