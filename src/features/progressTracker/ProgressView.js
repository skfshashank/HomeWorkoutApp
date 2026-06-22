import { Events } from '../../app/eventBus.js';

const todayKey = () => new Date().toISOString().split('T')[0];
const formatDate = (value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const formatUnitsWeight = (value, units) => units === 'imperial' ? `${(value * 2.20462).toFixed(1)} lb` : `${value.toFixed(1)} kg`;
const formatUnitsHeight = (value, units) => units === 'imperial' ? `${(value / 2.54).toFixed(1)} in` : `${value} cm`;

export class ProgressView {
  constructor(ctx) {
    this.ctx = ctx;
    this.el = document.querySelector('[data-page="progress"]');
    this.modal = document.getElementById('modal-overlay');
    this.modalContent = document.getElementById('modal-content');
    this.modalCleanup = null;

    this.el.addEventListener('click', (event) => this.handleClick(event));
    this.ctx.bus.on(Events.WORKOUT_COMPLETED, () => this.render());
    this.ctx.bus.on(Events.PROFILE_UPDATED, () => this.render());
    this.ctx.bus.on(Events.WEIGHT_UPDATED, () => this.render());
  }

  async render() {
    const user = this.ctx.getUser();
    const units = this.ctx.prefs.get('units', 'metric');
    const [stats, streak, bestStreak, consistency, history, heatmap, measurements] = await Promise.all([
      this.ctx.getProgress.getLifetimeStats(),
      this.ctx.getProgress.getStreak(),
      this.ctx.getProgress.getBestStreak(),
      this.ctx.getProgress.getWeeklyConsistency(),
      this.ctx.getProgress.getHistory(20),
      this.ctx.getProgress.getHeatmapData(new Date().getFullYear(), new Date().getMonth()),
      this.ctx.db.getAll('measurements')
    ]);

    const bmi = user.bmi;
    const weightRows = (measurements || []).sort((a, b) => b.date.localeCompare(a.date));
    const monthTitle = new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

    this.el.innerHTML = `
      <div class="page-title">Progress</div>
      <p class="page-subtitle">Everything you have earned — streaks, stats, adherence, and body metrics.</p>

      <section class="card">
        <div class="grid-2">
          <div class="stat-card"><div class="stat-value">${stats.totalWorkouts}</div><div class="stat-label">Workouts</div></div>
          <div class="stat-card"><div class="stat-value">${stats.totalCalories}</div><div class="stat-label">Calories</div></div>
          <div class="stat-card"><div class="stat-value">${stats.totalMinutes}</div><div class="stat-label">Minutes</div></div>
          <div class="stat-card"><div class="stat-value">${stats.totalExercises}</div><div class="stat-label">Exercises</div></div>
        </div>
      </section>

      <section class="grid-2">
        <article class="card">
          <div class="streak-display">
            <div class="streak-fire">🔥</div>
            <div>
              <div class="streak-number">${streak}</div>
              <div class="streak-label">current streak</div>
            </div>
          </div>
          <p class="text-sm text-muted mt-8">Best streak: ${bestStreak} days</p>
        </article>
        <article class="card">
          <h2>Weekly Consistency</h2>
          <div class="stat-value" style="color:${consistency >= 70 ? 'var(--green)' : consistency >= 40 ? 'var(--orange)' : 'var(--red)'};">${consistency}%</div>
          <p class="text-sm text-muted">A color-coded snapshot of how often you trained this week.</p>
        </article>
      </section>

      <section class="card">
        <div class="flex flex-between gap-12 mb-16">
          <div>
            <h2>BMI Calculator</h2>
            <p class="text-sm text-muted">Calculated from your profile, with editable inputs for quick checks.</p>
          </div>
          <span class="chip">${user.bmiCategory}</span>
        </div>
        <div class="grid-2 mb-16">
          <div class="form-group">
            <label class="form-label">Height (${units === 'metric' ? 'cm' : 'in'})</label>
            <input class="form-input" id="bmi-height" type="number" value="${units === 'metric' ? user.height : (user.height / 2.54).toFixed(1)}">
          </div>
          <div class="form-group">
            <label class="form-label">Weight (${units === 'metric' ? 'kg' : 'lb'})</label>
            <input class="form-input" id="bmi-weight" type="number" value="${units === 'metric' ? user.weight : (user.weight * 2.20462).toFixed(1)}">
          </div>
        </div>
        <div class="flex flex-between gap-12">
          <button class="btn btn-secondary" data-action="calc-bmi">Recalculate</button>
          <div class="text-right"><div class="stat-value" id="bmi-output">${bmi}</div><div class="stat-label" id="bmi-category">${user.bmiCategory}</div></div>
        </div>
      </section>

      <section class="card">
        <div class="flex flex-between gap-12 mb-16">
          <div>
            <h2>Calendar Heatmap</h2>
            <p class="text-sm text-muted">${monthTitle}</p>
          </div>
        </div>
        <div class="grid-7">
          ${this.renderHeatmap(heatmap)}
        </div>
      </section>

      <section class="card">
        <div class="flex flex-between gap-12 mb-16">
          <div>
            <h2>Workout History</h2>
            <p class="text-sm text-muted">Last 20 sessions</p>
          </div>
        </div>
        ${history.length ? history.map((entry) => `
          <div class="history-item">
            <div class="history-date">
              <div class="day">${new Date(entry.completedAt).getDate()}</div>
              <div class="month">${new Date(entry.completedAt).toLocaleDateString(undefined, { month: 'short' })}</div>
            </div>
            <div class="history-info">
              <h4>${entry.workout}</h4>
              <p>${entry.duration} min • ${entry.calories} kcal • ${entry.exercises} exercises</p>
            </div>
          </div>`).join('') : '<p class="text-sm text-muted">No completed workouts yet.</p>'}
      </section>

      <section class="card">
        <div class="flex flex-between gap-12 mb-16">
          <div>
            <h2>Weight Log</h2>
            <p class="text-sm text-muted">Current profile: ${formatUnitsWeight(user.weight, units)} • Height: ${formatUnitsHeight(user.height, units)}</p>
          </div>
          <button class="btn btn-primary btn-sm" data-action="add-weight">Add</button>
        </div>
        ${weightRows.length ? weightRows.slice(0, 20).map((entry) => `
          <div class="history-item">
            <div class="history-info">
              <h4>${formatDate(entry.date)}</h4>
              <p>${formatUnitsWeight(Number(entry.weight), units)}${entry.note ? ` • ${entry.note}` : ''}</p>
            </div>
          </div>`).join('') : '<p class="text-sm text-muted">No weight entries yet.</p>'}
      </section>`;
  }

  renderHeatmap(logs) {
    const today = todayKey();
    const dateMap = new Map((logs || []).map((log) => [log.date, log]));
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const leadingBlanks = new Date(year, month, 1).getDay();
    const cells = [];

    for (let i = 0; i < leadingBlanks; i += 1) cells.push('<div></div>');

    for (let day = 1; day <= totalDays; day += 1) {
      const date = new Date(year, month, day).toISOString().split('T')[0];
      const log = dateMap.get(date);
      const level = !log ? 0 : log.workoutCompleted ? 3 : log.minutes ? 2 : 1;
      const classes = ['calendar-cell', date === today ? 'today' : '', log?.workoutCompleted ? 'completed' : ''].filter(Boolean).join(' ');
      cells.push(`<div class="${classes}" style="background:${level === 0 ? 'transparent' : level === 1 ? 'var(--green-soft)' : level === 2 ? 'rgba(34,197,94,0.24)' : 'var(--green)'};color:${level >= 2 ? '#000' : ''};">${day}</div>`);
    }

    return cells.join('');
  }

  handleClick(event) {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!action) return;

    if (action === 'add-weight') this.openWeightModal();
    if (action === 'calc-bmi') this.calculateBMI();
  }

  calculateBMI() {
    const units = this.ctx.prefs.get('units', 'metric');
    const heightInput = Number(this.el.querySelector('#bmi-height')?.value || 0);
    const weightInput = Number(this.el.querySelector('#bmi-weight')?.value || 0);
    const heightCm = units === 'metric' ? heightInput : heightInput * 2.54;
    const weightKg = units === 'metric' ? weightInput : weightInput / 2.20462;
    const meters = heightCm / 100;
    const bmi = meters > 0 ? (weightKg / (meters * meters)) : 0;
    const category = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese';
    this.el.querySelector('#bmi-output').textContent = bmi ? bmi.toFixed(1) : '0.0';
    this.el.querySelector('#bmi-category').textContent = category;
  }

  openWeightModal() {
    this.closeModal();
    this.modalContent.innerHTML = `
      <h2 class="mb-16">Add weight entry</h2>
      <form id="weight-form">
        <div class="form-group">
          <label class="form-label">Date</label>
          <input class="form-input" type="date" name="date" value="${todayKey()}" required>
        </div>
        <div class="form-group">
          <label class="form-label">Weight (kg)</label>
          <input class="form-input" type="number" step="0.1" name="weight" required>
        </div>
        <div class="form-group">
          <label class="form-label">Note</label>
          <input class="form-input" type="text" name="note" placeholder="Optional">
        </div>
        <div class="grid-2 mt-24">
          <button type="button" class="btn btn-secondary" data-close="true">Cancel</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>`;
    this.modal.classList.add('active');
    this.modalCleanup = async (event) => {
      if (event.type === 'click' && event.target === this.modal) {
        this.closeModal();
        return;
      }
      if (event.target.closest('[data-close]')) {
        this.closeModal();
        return;
      }
      const form = event.target.closest('#weight-form');
      if (!form) return;
      event.preventDefault();
      const data = new FormData(form);
      const entry = {
        date: data.get('date'),
        weight: Number(data.get('weight')),
        note: data.get('note') || ''
      };
      await this.ctx.db.put('measurements', entry);
      if (entry.date === todayKey()) {
        const user = this.ctx.getUser();
        user.weight = entry.weight;
        this.ctx.prefs.set('user', user);
        this.ctx.bus.emit(Events.PROFILE_UPDATED, user);
      }
      this.ctx.bus.emit(Events.WEIGHT_UPDATED, entry);
      this.closeModal();
    };
    this.modal.addEventListener('click', this.modalCleanup);
    this.modal.addEventListener('submit', this.modalCleanup);
  }

  closeModal() {
    if (this.modalCleanup) {
      this.modal.removeEventListener('click', this.modalCleanup);
      this.modal.removeEventListener('submit', this.modalCleanup);
      this.modalCleanup = null;
    }
    this.modal.classList.remove('active');
    this.modalContent.innerHTML = '';
  }
}
