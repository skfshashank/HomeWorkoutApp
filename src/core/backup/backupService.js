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
    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      app: 'OpenFit Local',
      database: await this.#db.exportAll(),
      preferences: this.#prefs.exportAll()
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

          if (backup.database) {
            await this.#db.importAll(backup.database);
          }

          if (backup.preferences) {
            this.#prefs.importAll(backup.preferences);
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
