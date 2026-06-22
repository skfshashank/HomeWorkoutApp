import { Events } from '../../app/eventBus.js';
import { closeAccessibleModal, openAccessibleModal } from '../../core/utils/modalAccessibility.js';

const formatDate = (value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const formatUnitsWeight = (value, units) => units === 'imperial' ? `${(value * 2.20462).toFixed(1)} lb` : `${value.toFixed(1)} kg`;
const formatUnitsHeight = (value, units) => units === 'imperial' ? `${(value / 2.54).toFixed(1)} in` : `${value} cm`;
const todayKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const bodyFatCategory = (gender, value) => {
  if (!value && value !== 0) return '—';
  const male = [['Essential', 5], ['Athletes', 13], ['Fitness', 17], ['Average', 24], ['Obese', Infinity]];
  const female = [['Essential', 13], ['Athletes', 20], ['Fitness', 24], ['Average', 31], ['Obese', Infinity]];
  return (gender === 'female' ? female : male).find((entry) => value <= entry[1])?.[0] || 'Average';
};

export class ProgressView {
  constructor(ctx) {
    this.ctx = ctx;
    this.el = document.querySelector('[data-page="progress"]');
    this.modal = document.getElementById('modal-overlay');
    this.modalContent = document.getElementById('modal-content');
    this.modalCleanup = null;
    this.lastFocusedElement = null;
    this.modalDismissHandler = null;

    this.el.addEventListener('click', (event) => this.handleClick(event));
    this.ctx.bus.on(Events.WORKOUT_COMPLETED, () => this.render());
    this.ctx.bus.on(Events.PROFILE_UPDATED, () => this.render());
    this.ctx.bus.on(Events.WEIGHT_UPDATED, () => this.render());
    this.ctx.bus.on(Events.MEASUREMENTS_UPDATED, () => this.render());
    this.ctx.bus.on(Events.HABIT_SAVED, () => this.render());
    this.ctx.bus.on(Events.PAGE_CHANGED, ({ page }) => {
      if (page === 'progress') this.render();
    });
  }

  async render() {
    const { user, units } = this.ctx.updateProfile.getSettings();
    const progress = await this.ctx.getProgress.execute({ historyLimit: 20 });
    const stats = progress.stats;
    const streak = progress.streak;
    const bestStreak = progress.bestStreak;
    const consistency = progress.consistency;
    const history = progress.history;
    const heatmap = progress.heatmap;
    const measurements = progress.measurements;

    const bmi = user.bmi;
    const latestMeasurement = measurements[0] || {};
    const monthTitle = new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    const bodyFatValue = latestMeasurement.bodyFat ?? this.calculateBodyFat({
      gender: user.gender,
      height: user.height,
      waist: latestMeasurement.waist,
      neck: latestMeasurement.neck,
      hip: latestMeasurement.hip
    });

    this.el.innerHTML = `
      <div class="page-title">Progress</div>
      <p class="page-subtitle">Everything you have earned — streaks, stats, adherence, body composition, and lifetime counts.</p>

      <section class="card">
        <div class="grid-2">
          <div class="stat-card"><div class="stat-value">${stats.totalWorkouts || 0}</div><div class="stat-label">Workouts</div></div>
          <div class="stat-card"><div class="stat-value">${stats.totalCaloriesBurned || stats.totalCalories || 0}</div><div class="stat-label">Calories</div></div>
          <div class="stat-card"><div class="stat-value">${stats.totalMinutes || 0}</div><div class="stat-label">Minutes</div></div>
          <div class="stat-card"><div class="stat-value">${stats.level || 1}</div><div class="stat-label">XP Level</div></div>
        </div>
      </section>

      <section class="card">
        <div class="flex flex-between gap-12 mb-16">
          <div>
            <h2>Lifetime Count Bank</h2>
            <p class="text-sm text-muted">Auto-updated after workouts and habit logs.</p>
          </div>
          ${this.ctx.features?.achievements !== false ? '<button class="btn btn-secondary btn-sm" data-action="open-achievements">Achievements</button>' : ''}
        </div>
        <div class="grid-2">
          <div class="stat-card"><div class="stat-value">${Number(stats.totalHoursExercised || ((stats.totalMinutes || 0) / 60)).toFixed(1)}</div><div class="stat-label">Hours exercised</div></div>
          <div class="stat-card"><div class="stat-value">${stats.bestStreakEver || bestStreak}</div><div class="stat-label">Best streak</div></div>
          <div class="stat-card"><div class="stat-value">${Math.round(stats.totalPlankSec || 0)}</div><div class="stat-label">Plank seconds</div></div>
          <div class="stat-card"><div class="stat-value">${Number(stats.totalYogaMin || 0).toFixed(1)}</div><div class="stat-label">Yoga minutes</div></div>
          <div class="stat-card"><div class="stat-value">${stats.totalStepsLogged || 0}</div><div class="stat-label">Steps logged</div></div>
          <div class="stat-card"><div class="stat-value">${Object.values(stats.totalReps || {}).reduce((sum, value) => sum + value, 0)}</div><div class="stat-label">Total reps</div></div>
        </div>
        <div class="flex flex-wrap gap-8 mt-16">
          ${Object.entries(stats.totalReps || {}).slice(0, 6).map(([key, value]) => `<span class="chip">${key.replaceAll('-', ' ')}: ${value}</span>`).join('') || '<span class="text-sm text-muted">Rep totals will appear after your next completed workout.</span>'}
        </div>
      </section>

      <section class="grid-2">
        <article class="card">
          <div class="streak-display"><div class="streak-fire">🔥</div><div><div class="streak-number">${streak}</div><div class="streak-label">current streak</div></div></div>
          <p class="text-sm text-muted mt-8">Best streak: ${bestStreak} days</p>
        </article>
        <article class="card">
          <h2>Weekly Consistency</h2>
          <div class="stat-value" style="color:${consistency >= 70 ? 'var(--green)' : consistency >= 40 ? 'var(--orange)' : 'var(--red)'};">${consistency}%</div>
          <p class="text-sm text-muted">A color-coded snapshot of how often you trained this week.</p>
        </article>
      </section>

      <section class="card">
        <div class="flex flex-between gap-12 mb-16"><div><h2>BMI Calculator</h2><p class="text-sm text-muted">Calculated from your profile.</p></div><span class="chip">${user.bmiCategory}</span></div>
        <div class="grid-2 mb-16">
          <div class="form-group"><label class="form-label">Height (${units === 'metric' ? 'cm' : 'in'})</label><input class="form-input" id="bmi-height" type="number" value="${units === 'metric' ? user.height : (user.height / 2.54).toFixed(1)}"></div>
          <div class="form-group"><label class="form-label">Weight (${units === 'metric' ? 'kg' : 'lb'})</label><input class="form-input" id="bmi-weight" type="number" value="${units === 'metric' ? user.weight : (user.weight * 2.20462).toFixed(1)}"></div>
        </div>
        <div class="flex flex-between gap-12"><button class="btn btn-secondary" data-action="calc-bmi">Recalculate</button><div class="text-right"><div class="stat-value" id="bmi-output">${bmi}</div><div class="stat-label" id="bmi-category">${user.bmiCategory}</div></div></div>
      </section>

      <section class="card">
        <div class="flex flex-between gap-12 mb-16"><div><h2>Body Fat Estimator</h2><p class="text-sm text-muted">US Navy method.</p></div><button class="btn btn-primary btn-sm" data-action="add-weight">Add measurement</button></div>
        <div class="grid-2 mb-16">
          <div class="form-group"><label class="form-label">Waist (cm)</label><input class="form-input" id="bf-waist" type="number" value="${latestMeasurement.waist || ''}"></div>
          <div class="form-group"><label class="form-label">Neck (cm)</label><input class="form-input" id="bf-neck" type="number" value="${latestMeasurement.neck || ''}"></div>
          ${user.gender === 'female' ? `<div class="form-group"><label class="form-label">Hip (cm)</label><input class="form-input" id="bf-hip" type="number" value="${latestMeasurement.hip || ''}"></div>` : '<div></div>'}
        </div>
        <div class="flex flex-between gap-12"><button class="btn btn-secondary" data-action="calc-bodyfat">Calculate</button><div class="text-right"><div class="stat-value" id="bodyfat-output">${bodyFatValue ? bodyFatValue.toFixed(1) : '—'}%</div><div class="stat-label" id="bodyfat-category">${bodyFatValue ? bodyFatCategory(user.gender, bodyFatValue) : 'Add measurements'}</div></div></div>
      </section>

      <section class="card"><div class="flex flex-between gap-12 mb-16"><div><h2>Calendar Heatmap</h2><p class="text-sm text-muted">${monthTitle}</p></div></div><div class="grid-7">${this.renderHeatmap(heatmap)}</div></section>

      <section class="card"><div class="flex flex-between gap-12 mb-16"><div><h2>Workout History</h2><p class="text-sm text-muted">Last 20 sessions</p></div></div>${history.length ? history.map((entry) => `
          <div class="history-item"><div class="history-date"><div class="day">${new Date(entry.completedAt).getDate()}</div><div class="month">${new Date(entry.completedAt).toLocaleDateString(undefined, { month: 'short' })}</div></div><div class="history-info"><h4>${entry.workout}</h4><p>${entry.duration} min • ${entry.calories} kcal • ${entry.exercises} exercises</p>${entry.note ? `<div class="history-note">📝 ${entry.note}</div>` : ''}</div></div>`).join('') : '<p class="text-sm text-muted">No completed workouts yet.</p>'}</section>

      <section class="card"><div class="flex flex-between gap-12 mb-16"><div><h2>Measurement Log</h2><p class="text-sm text-muted">Current profile: ${formatUnitsWeight(user.weight, units)} • Height: ${formatUnitsHeight(user.height, units)}</p></div><button class="btn btn-primary btn-sm" data-action="add-weight">Add</button></div>${measurements.length ? measurements.slice(0, 20).map((entry) => `
          <div class="history-item"><div class="history-info"><h4>${formatDate(entry.date)}</h4><p>${formatUnitsWeight(Number(entry.weight || 0), units)}${entry.waist ? ` • Waist ${entry.waist} cm` : ''}${entry.bodyFat ? ` • ${entry.bodyFat.toFixed(1)}% BF` : ''}${entry.note ? ` • ${entry.note}` : ''}</p></div></div>`).join('') : '<p class="text-sm text-muted">No measurement entries yet.</p>'}</section>`;
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
      const d = new Date(year, month, day);
      const date = todayKey(d);
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
    if (action === 'calc-bodyfat') this.updateBodyFatOutput();
    if (action === 'open-achievements') this.ctx.router.navigate('achievements');
  }

  calculateBMI() {
    const { units } = this.ctx.updateProfile.getSettings();
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

  calculateBodyFat({ gender, height, waist, neck, hip }) {
    const safeHeight = Number(height || 0);
    const safeWaist = Number(waist || 0);
    const safeNeck = Number(neck || 0);
    const safeHip = Number(hip || 0);
    if (!safeHeight || !safeWaist || !safeNeck) return 0;
    if (gender === 'female') {
      if (!safeHip || safeWaist + safeHip - safeNeck <= 0) return 0;
      return 163.205 * Math.log10(safeWaist + safeHip - safeNeck) - 97.684 * Math.log10(safeHeight) - 78.387;
    }
    if (safeWaist - safeNeck <= 0) return 0;
    return 86.01 * Math.log10(safeWaist - safeNeck) - 70.041 * Math.log10(safeHeight) + 36.76;
  }

  updateBodyFatOutput() {
    const { user } = this.ctx.updateProfile.getSettings();
    const value = this.calculateBodyFat({
      gender: user.gender,
      height: user.height,
      waist: Number(this.el.querySelector('#bf-waist')?.value || 0),
      neck: Number(this.el.querySelector('#bf-neck')?.value || 0),
      hip: Number(this.el.querySelector('#bf-hip')?.value || 0)
    });
    this.el.querySelector('#bodyfat-output').textContent = value ? `${value.toFixed(1)}%` : '—';
    this.el.querySelector('#bodyfat-category').textContent = value ? bodyFatCategory(user.gender, value) : 'Add measurements';
  }

  openWeightModal() {
    const { user } = this.ctx.updateProfile.getSettings();
    this.closeModal();
    openAccessibleModal(this, `
      <h2 class="mb-16" id="modal-title">Add measurement entry</h2>
      <form id="weight-form">
        <div class="form-group"><label class="form-label">Date</label><input class="form-input" type="date" name="date" value="${todayKey()}" required></div>
        <div class="grid-2"><div class="form-group"><label class="form-label">Weight (kg)</label><input class="form-input" type="number" step="0.1" name="weight" value="${user.weight}" required></div><div class="form-group"><label class="form-label">Waist (cm)</label><input class="form-input" type="number" step="0.1" name="waist"></div></div>
        <div class="grid-2"><div class="form-group"><label class="form-label">Neck (cm)</label><input class="form-input" type="number" step="0.1" name="neck"></div>${user.gender === 'female' ? '<div class="form-group"><label class="form-label">Hip (cm)</label><input class="form-input" type="number" step="0.1" name="hip"></div>' : '<div></div>'}</div>
        <div class="form-group"><label class="form-label">Note</label><input class="form-input" type="text" name="note" placeholder="Optional"></div>
        <div class="grid-2 mt-24"><button type="button" class="btn btn-secondary" data-close="true">Cancel</button><button type="submit" class="btn btn-primary">Save</button></div>
      </form>`, async (event) => {
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
        waist: Number(data.get('waist') || 0),
        neck: Number(data.get('neck') || 0),
        hip: Number(data.get('hip') || 0),
        note: data.get('note') || ''
      };
      entry.bodyFat = this.calculateBodyFat({ gender: user.gender, height: user.height, waist: entry.waist, neck: entry.neck, hip: entry.hip });
      await this.ctx.updateProfile.addMeasurement(entry);
      this.closeModal();
    });
  }

  closeModal(options = {}) {
    closeAccessibleModal(this, options);
  }
}
