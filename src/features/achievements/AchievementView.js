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

  async render() {
    const [stats, achievements] = await Promise.all([
      this.ctx.getAchievements.getAchievementStats(),
      this.ctx.getAchievements.getAchievementsViewModel()
    ]);

    this.el.innerHTML = `
      <div class="page-title">Achievements</div>
      <p class="page-subtitle">Unlocked badges, XP, level progress, and the next milestone to chase.</p>
      ${this.lastUnlocked ? `<section class="card achievement-unlock-banner"><div class="achievement-confetti">${Array.from({ length: 18 }, () => '<span></span>').join('')}</div><h2>${this.lastUnlocked.icon} ${this.lastUnlocked.title}</h2><p class="text-sm text-muted">${this.lastUnlocked.desc}</p></section>` : ''}
      <section class="grid-2"><article class="card"><h2>XP</h2><div class="stat-value">${stats.xp}</div><p class="text-sm text-muted">10 per workout • 5 per habit • 50 per achievement</p></article><article class="card"><h2>Level</h2><div class="stat-value">${stats.level}</div><p class="text-sm text-muted">Every 100 XP = 1 level</p></article></section>
      <section class="card"><div class="flex flex-between gap-12 mb-16"><div><h2>Progress to next level</h2><p class="text-sm text-muted">${stats.xp % 100}/100 XP into this level</p></div><button class="btn btn-secondary btn-sm" data-action="open-progress">Open progress</button></div><div class="progress-meter"><span style="width:${stats.xp % 100}%"></span></div></section>
      <section class="achievement-grid">${achievements.map((achievement) => `
        <article class="achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'}"><div class="achievement-icon">${achievement.icon}</div><h3>${achievement.title}</h3><p class="text-sm text-muted">${achievement.desc}</p><div class="progress-meter mt-16"><span style="width:${achievement.unlocked ? 100 : achievement.progress.percent}%"></span></div><p class="text-sm text-muted mt-8">${achievement.unlocked ? `Unlocked ${new Date(achievement.unlockedAt).toLocaleDateString()}` : `${achievement.progress.current}/${achievement.progress.target}`}</p></article>`).join('')}</section>`;

    this.el.querySelector('[data-action="open-progress"]')?.addEventListener('click', () => this.ctx.router.navigate('progress'));
  }
}
