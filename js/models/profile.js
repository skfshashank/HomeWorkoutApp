const DEFAULT_PROFILE = {
  id: 'default',
  name: 'Office Athlete',
  age: 31,
  heightCm: 170,
  weightKg: 78,
  goal: 'belly_fat',
  focus: 'core',
  level: 'beginner',
  sessionMinutes: 20,
  voiceEnabled: true,
  deskMode: false,
  dailyWaterGoal: 8,
  targetDaysPerWeek: 5
};

export class ProfileModel {
  constructor(storage) {
    this.storage = storage;
  }

  get() {
    return { ...DEFAULT_PROFILE, ...(this.storage.get('profile', {}) || {}) };
  }

  save(profile) {
    const next = {
      ...this.get(),
      ...profile,
      updatedAt: new Date().toISOString()
    };
    this.storage.set('profile', next);
    return next;
  }

  update(partial) {
    return this.save(partial);
  }

  exists() {
    return Boolean(this.storage.get('profile'));
  }

  getBMI() {
    const profile = this.get();
    const heightMeters = profile.heightCm / 100;
    if (!heightMeters) return 0;
    return Number((profile.weightKg / (heightMeters * heightMeters)).toFixed(1));
  }

  getLevel() {
    const profile = this.get();
    const workoutHistory = this.storage.get('progress_history', []);
    const rpeHistory = this.storage.get('rpe_history', []);
    const multiplier = rpeHistory.slice(-2).every((entry) => entry?.rating === 'too_easy') ? 1 : rpeHistory.at(-1)?.rating === 'exhausting' ? -1 : 0;
    const score = workoutHistory.length + multiplier * 4;
    if (profile.level && profile.level !== 'beginner') return profile.level;
    if (score >= 40) return 'advanced';
    if (score >= 14) return 'intermediate';
    return 'beginner';
  }
}
