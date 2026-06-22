/**
 * BackupService - JSON export/import for data portability.
 */
import { getLocalDateStr } from '../utils/dateUtils.js';

export class BackupService {
  #db;
  #prefs;
  
  constructor(db, prefs) {
    this.#db = db;
    this.#prefs = prefs;
  }
  
  async exportToJSON() {
    const dbData = await this.#db.exportAll();
    const prefs = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('openfit_')) {
        prefs[key] = localStorage.getItem(key);
      }
    }
    
    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      app: 'OpenFit Local',
      database: dbData,
      preferences: prefs
    };
    
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `openfit_backup_${getLocalDateStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  async importFromJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const backup = JSON.parse(e.target.result);
          if (backup.app !== 'OpenFit Local') throw new Error('Invalid backup file');
          
          // Restore database
          if (backup.database) {
            await this.#db.importAll(backup.database);
          }
          
          // Restore preferences
          if (backup.preferences) {
            for (const [key, value] of Object.entries(backup.preferences)) {
              localStorage.setItem(key, value);
            }
          }
          
          resolve({ success: true, date: backup.exportedAt });
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsText(file);
    });
  }
}
