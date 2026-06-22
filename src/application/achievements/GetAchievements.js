export class GetAchievements {
  #achievementEngine;
  #getActiveProfileId;

  constructor({ achievementEngine, getActiveProfileId }) {
    this.#achievementEngine = achievementEngine;
    this.#getActiveProfileId = getActiveProfileId;
  }

  execute(profileId = this.#getActiveProfileId()) {
    return this.getAchievementsViewModel(profileId);
  }

  getAchievementStats(profileId = this.#getActiveProfileId()) {
    return this.#achievementEngine.getAchievementStats(profileId);
  }

  getAchievementsViewModel(profileId = this.#getActiveProfileId()) {
    return this.#achievementEngine.getAchievementsViewModel(profileId);
  }

  getDashboardSnapshot(profileId = this.#getActiveProfileId()) {
    return this.#achievementEngine.getDashboardSnapshot(profileId);
  }

  syncMeasurementProgress(profileId = this.#getActiveProfileId()) {
    return this.#achievementEngine.syncMeasurementProgress(profileId);
  }

  applyHabitProgress(profileId, habit, previousHabit = {}) {
    return this.#achievementEngine.applyHabitProgress(profileId, habit, previousHabit);
  }

  grantBadge(profileId, badge) {
    return this.#achievementEngine.grantBadge(profileId, badge);
  }
}
