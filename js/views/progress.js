export class ProgressView {
  constructor(bus, progress, challenge, container) {
    this.bus = bus;
    this.progress = progress;
    this.challenge = challenge;
    this.container = container;
  }

  render() {
    const stats = this.progress.getLifetimeStats();
    const streak = this.progress.getStreak();
    const best = this.progress.getBestStreak();
    const weekly = this.progress.getWeeklyConsistency();
    const heatmap = this.progress.getHeatmapData(new Date());
    const history = this.progress.getHistory(8);
    const completedChallengeDays = this.progress.getChallengeProgress().length;
    const badges = [
      { name: 'Starter', unlocked: stats.totalWorkouts >= 1, hint: 'Complete your first workout' },
      { name: '5-Day Rhythm', unlocked: best >= 5, hint: 'Reach a 5-day streak' },
      { name: 'Desk Break Hero', unlocked: weekly >= 70, hint: 'Hit 70% weekly consistency' },
      { name: 'Challenge Climber', unlocked: completedChallengeDays >= 15, hint: 'Finish 15 challenge days' }
    ];
    this.container.innerHTML = `
      <section class="grid-2">
        <article class="card stack">
          <h2>Progress snapshot</h2>
          <div class="grid-2">
            <div class="stat-item"><span class="tiny muted">Total workouts</span><strong>${stats.totalWorkouts}</strong></div>
            <div class="stat-item"><span class="tiny muted">Minutes trained</span><strong>${stats.totalMinutes}</strong></div>
            <div class="stat-item"><span class="tiny muted">Calories</span><strong>${stats.totalCalories}</strong></div>
            <div class="stat-item"><span class="tiny muted">Reps logged</span><strong>${stats.totalReps}</strong></div>
          </div>
        </article>
        <article class="card stack">
          <h2>Consistency</h2>
          <div class="grid-3">
            <div class="stat-item"><span class="tiny muted">Current streak</span><strong>${streak}</strong></div>
            <div class="stat-item"><span class="tiny muted">Best streak</span><strong>${best}</strong></div>
            <div class="stat-item"><span class="tiny muted">Weekly</span><strong>${weekly}%</strong></div>
          </div>
        </article>
      </section>

      <section class="card stack">
        <div class="section-header">
          <div>
            <h3>This month</h3>
            <p class="tiny muted">Workout heatmap for daily habit momentum.</p>
          </div>
          <span class="chip">${new Date().toLocaleString('en-IN', { month: 'long' })}</span>
        </div>
        <div class="heatmap-grid">${heatmap.map((cell) => `<div class="heat-cell" data-level="${cell.level}" title="${cell.date}: ${cell.count} workouts">${cell.day}</div>`).join('')}</div>
      </section>

      <section class="grid-2">
        <article class="card stack">
          <h3>Recent history</h3>
          <ul class="list-clean">${history.map((entry) => `
            <li class="history-item">
              <div class="inline-between">
                <div>
                  <strong>${entry.title}</strong>
                  <p class="tiny muted">${new Date(entry.completedAt).toLocaleDateString('en-IN')}</p>
                </div>
                <span class="tag">${entry.durationMinutes} min</span>
              </div>
            </li>`).join('') || '<li class="page-empty muted">Complete a session to start your history.</li>'}
          </ul>
        </article>
        <article class="card stack">
          <h3>Badges</h3>
          <div class="badge-grid">${badges.map((badge) => `
            <div class="history-item ${badge.unlocked ? '' : 'muted'}">
              <strong>${badge.unlocked ? '🏅' : '🔒'} ${badge.name}</strong>
              <p class="tiny">${badge.hint}</p>
            </div>`).join('')}</div>
          <div class="note is-success">Challenge days completed: ${completedChallengeDays}/${this.challenge.days.length}</div>
        </article>
      </section>`;
  }
}
