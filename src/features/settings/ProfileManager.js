import { Events } from '../../app/eventBus.js';
import { DEFAULT_PROFILE_ID } from '../../core/storage/profileData.js';
import { User } from '../../domain/entities/User.js';

const createProfileId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `profile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

export class ProfileManager {
  constructor(db, prefs, bus) {
    this.db = db;
    this.prefs = prefs;
    this.bus = bus;
  }

  async init() {
    const profiles = await this.getProfiles();
    const legacyUser = this.prefs.get('user');

    if (!profiles.length && legacyUser) {
      return this.saveProfile({ ...legacyUser, id: legacyUser.id || DEFAULT_PROFILE_ID }, { setActive: true });
    }

    if (profiles.length) {
      const activeProfileId = this.prefs.get('activeProfileId', profiles[0].id);
      const activeProfile = profiles.find((profile) => profile.id === activeProfileId) || profiles[0];
      this.prefs.set('activeProfileId', activeProfile.id);
      this.prefs.set('user', activeProfile);
      return activeProfile;
    }

    return null;
  }

  getActiveProfileId() {
    return this.prefs.get('activeProfileId', DEFAULT_PROFILE_ID);
  }

  async getProfiles() {
    const profiles = await this.db.getAll('profiles');
    return profiles.map((profile) => new User(profile)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async getActiveProfile() {
    const profile = await this.db.get('profiles', this.getActiveProfileId());
    return profile ? new User(profile) : null;
  }

  async saveProfile(data, options = {}) {
    const { setActive = true } = options;
    const user = new User({
      ...data,
      id: data.id || createProfileId(),
      avatar: data.avatar || '🙂'
    });

    await this.db.put('profiles', user);

    if (setActive) {
      this.prefs.set('activeProfileId', user.id);
      this.prefs.set('user', user);
    }

    return user;
  }

  async switchProfile(profileId) {
    const nextProfile = await this.db.get('profiles', profileId);
    if (!nextProfile) return null;
    this.prefs.set('activeProfileId', profileId);
    this.prefs.set('user', nextProfile);
    this.bus.emit(Events.PROFILE_UPDATED, nextProfile);
    return new User(nextProfile);
  }

  async deleteProfile(profileId) {
    const profiles = await this.getProfiles();
    if (profiles.length <= 1) {
      throw new Error('Keep at least one profile in OpenFit Local.');
    }

    const scopedStores = ['sessions', 'measurements', 'habits', 'achievements', 'customWorkouts', 'dailyLogs', 'exerciseMeta', 'lifetimeStats', 'sorenessLogs', 'monthlyChallenges'];
    for (const store of scopedStores) {
      const records = await this.db.getAll(store);
      for (const record of records.filter((entry) => entry.profileId === profileId || entry.id === profileId)) {
        await this.db.delete(store, record.id);
      }
    }

    await this.db.delete('profiles', profileId);

    if (this.getActiveProfileId() === profileId) {
      const nextProfile = profiles.find((profile) => profile.id !== profileId);
      if (nextProfile) {
        this.prefs.set('activeProfileId', nextProfile.id);
        this.prefs.set('user', nextProfile);
        this.bus.emit(Events.PROFILE_UPDATED, nextProfile);
      }
    }
  }
}
