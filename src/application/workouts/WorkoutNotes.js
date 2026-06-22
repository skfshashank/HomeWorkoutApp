export class WorkoutNotes {
  constructor(db) {
    this.db = db;
  }

  async save(sessionId, note) {
    const session = await this.db.get('sessions', sessionId);
    if (!session) return '';

    const next = {
      ...session,
      note: String(note || '').trim(),
      updatedAt: new Date().toISOString()
    };
    await this.db.put('sessions', next);
    return next.note;
  }

  async getForSession(sessionId) {
    return (await this.db.get('sessions', sessionId))?.note || '';
  }
}
