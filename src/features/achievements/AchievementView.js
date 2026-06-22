import { Events } from '../../app/eventBus.js';

export class AchievementView {
  constructor() {
    this.ctx = null;
    this.el = null;
    this.lastUnlocked = null;
  }

  init(container, deps) {
    this.el = container;
    this.ctx = deps;
    this.ctx.bus.on(Events.ACHIEVEMENT_UNLOCKED, ({ achievement }) => {
      this.lastUnlocked = achievement;
      this.render();
      window.setTimeout(() => {
        this.lastUnlocked = null;
        this.render();
      }, 3500);
    });
    this.ctx.bus.on(Events.PROFILE_UPDATED, () => this.render());
    this.ctx.bus.on(Events.WORKOUT_COMPLETED, () => this.render());
    this.ctx.bus.on(Events.HABIT_SAVED, () => this.render());
  }

  t(key, fallback = key) {
    return this.ctx.i18n?.t(key) || fallback;
  }

  translateAchievement(achievement) {
    const achievementId = achievement?.achievementId || achievement?.id;
    if (!achievementId) return achievement;
    return {
      ...achievement,
      title: this.t(`achievement_${achievementId}_title`, achievement.title),
      desc: this.t(`achievement_${achievementId}_desc`, achievement.desc)
    };
  }

  async render() {
    const [stats, achievements] = await Promise.all([
      this.ctx.getAchievements.getAchievementStats(),
      this.ctx.getAchievements.getAchievementsViewModel()
    ]);
    const translatedAchievements = achievements.map((achievement) => this.translateAchievement(achievement));
    const lastUnlocked = this.lastUnlocked ? this.translateAchievement(this.lastUnlocked) : null;

    this.el.innerHTML = `
      <div class="page-title">${this.t('achievements_title', 'Achievements')}</div>
      <p class="page-subtitle">${this.t('achievements_subtitle', 'Unlocked badges, XP, level progress, and the next milestone to chase.')}</p>
      ${lastUnlocked ? `<section class="card achievement-unlock-banner"><div class="achievement-confetti">${Array.from({ length: 18 }, () => '<span></span>').join('')}</div><h2>${lastUnlocked.icon} ${lastUnlocked.title}</h2><p class="text-sm text-muted">${lastUnlocked.desc}</p></section>` : ''}
      <section class="grid-2"><article class="card"><h2>${this.t('xp', 'XP')}</h2><div class="stat-value">${stats.xp}</div><p class="text-sm text-muted">${this.t('xp_formula', '10 per workout • 5 per habit • 50 per achievement')}</p></article><article class="card"><h2>${this.t('level', 'Level')}</h2><div class="stat-value">${stats.level}</div><p class="text-sm text-muted">${this.t('level_formula', 'Every 100 XP = 1 level')}</p></article></section>
      <section class="card"><div class="flex flex-between gap-12 mb-16"><div><h2>${this.t('progress_to_next_level', 'Progress to next level')}</h2><p class="text-sm text-muted">${stats.xp % 100}/100 ${this.t('xp_into_level', 'XP into this level')}</p></div><button class="btn btn-secondary btn-sm" data-action="open-progress">${this.t('open_progress', 'Open progress')}</button></div><div class="progress-meter"><span style="width:${stats.xp % 100}%"></span></div></section>
      <section class="achievement-grid">${translatedAchievements.map((achievement) => `
        <article class="achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'}"><div class="achievement-icon">${achievement.icon}</div><h3>${achievement.title}</h3><p class="text-sm text-muted">${achievement.desc}</p><div class="progress-meter mt-16"><span style="width:${achievement.unlocked ? 100 : achievement.progress.percent}%"></span></div><p class="text-sm text-muted mt-8">${achievement.unlocked ? `${this.t('unlocked_on', 'Unlocked')} ${new Date(achievement.unlockedAt).toLocaleDateString()}` : `${achievement.progress.current}/${achievement.progress.target}`}</p></article>`).join('')}</section>`;

    this.el.querySelector('[data-action="open-progress"]')?.addEventListener('click', () => this.ctx.router.navigate('progress'));
  }
}
