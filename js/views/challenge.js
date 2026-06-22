export class ChallengeView {
  constructor(bus, challenge, progress, exerciseIndex, container) {
    this.bus = bus;
    this.challenge = challenge;
    this.progress = progress;
    this.exerciseIndex = exerciseIndex;
    this.container = container;
    this.selectedDay = 1;
    this.container.addEventListener('click', (event) => this.handleClick(event));
  }

  get completedDays() {
    return this.progress.getChallengeProgress();
  }

  renderDay(day) {
    const completed = this.completedDays.includes(day.day);
    return `
      <button class="challenge-day ${this.selectedDay === day.day ? 'is-selected' : ''} ${completed ? 'is-complete' : ''} ${day.type === 'rest' ? 'is-rest' : ''}" type="button" data-action="select-day" data-day="${day.day}">
        <strong>${day.day}</strong>
        <span class="tiny">${day.type === 'rest' ? 'Rest' : 'Train'}</span>
      </button>`;
  }

  renderExerciseList(day) {
    if (day.type === 'rest') {
      return `<div class="note">${day.suggestion}</div>`;
    }
    return `<ul class="list-clean">${day.exercises.map((id) => {
      const exercise = this.exerciseIndex[id];
      return `<li class="history-item"><strong>${exercise?.emoji || '•'} ${exercise?.name || id}</strong><p class="tiny muted">${exercise?.nameHindi || ''}</p></li>`;
    }).join('')}</ul>`;
  }

  render() {
    const day = this.challenge.days.find((entry) => entry.day === this.selectedDay) || this.challenge.days[0];
    const completed = this.completedDays.length;
    this.container.innerHTML = `
      <section class="card stack">
        <div class="section-header">
          <div>
            <h2>${this.challenge.name}</h2>
            <p class="tiny muted">Progressive four-week belly fat reset with built-in recovery.</p>
          </div>
          <span class="chip">${completed}/30 complete</span>
        </div>
        <div class="challenge-grid">${this.challenge.days.map((entry) => this.renderDay(entry)).join('')}</div>
      </section>
      <section class="card stack">
        <div class="section-header">
          <div>
            <h3>${day.label}</h3>
            <p class="tiny muted">${day.type === 'rest' ? 'Recovery focus' : `${Math.round((day.intensity || 0) * 100)}% intensity • ${day.duration} min`}</p>
          </div>
          ${day.type === 'rest' ? '<span class="badge badge-beginner">Rest</span>' : '<span class="badge badge-intermediate">Challenge</span>'}
        </div>
        ${this.renderExerciseList(day)}
        ${day.type === 'workout' ? `<button class="btn btn-primary" type="button" data-action="start-day" data-day="${day.day}">Start day ${day.day}</button>` : ''}
      </section>`;
  }

  handleClick(event) {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    if (button.dataset.action === 'select-day') {
      this.selectedDay = Number(button.dataset.day);
      this.render();
    }
    if (button.dataset.action === 'start-day') {
      const day = this.challenge.days.find((entry) => entry.day === Number(button.dataset.day));
      this.bus.emit('workout:start', { source: 'challenge', challengeDay: day.day, challengePlan: day });
    }
  }
}
