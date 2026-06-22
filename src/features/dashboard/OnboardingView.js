import { User } from '../../domain/entities/User.js';

export class OnboardingView {
  #updateProfile;
  #step = 1;
  #data = {};

  constructor(updateProfile) {
    this.#updateProfile = updateProfile;
  }

  render() {
    const el = document.getElementById('onboarding');
    el.classList.add('active');
    this.#renderStep();
  }

  #renderStep() {
    const content = document.getElementById('onb-content');
    const footer = document.getElementById('onb-footer');

    const steps = [
      this.#stepGoal(),
      this.#stepFocus(),
      this.#stepTime(),
      this.#stepLevel()
    ];

    content.innerHTML = steps[this.#step - 1];
    footer.innerHTML = `
      <div class="mb-16 text-muted text-sm">Step ${this.#step} of 4</div>
      <button class="btn btn-primary btn-block" id="onb-next">${this.#step === 4 ? 'Start Training! 🚀' : 'Continue →'}</button>`;

    content.querySelectorAll('.goal-option').forEach((opt) => {
      const selectOption = () => {
        const { key, value } = opt.dataset;
        content.querySelectorAll(`.goal-option[data-key="${key}"]`).forEach((o) => {
          o.classList.remove('selected');
          o.setAttribute('aria-pressed', 'false');
        });
        opt.classList.add('selected');
        opt.setAttribute('aria-pressed', 'true');
        this.#data[key] = value;
      };

      opt.addEventListener('click', selectOption);
      opt.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        selectOption();
      });
    });

    document.getElementById('onb-next').addEventListener('click', () => this.#next());
  }

  #renderOption(key, value, emoji, label) {
    const selected = this.#data[key] === value;
    return `<button type="button" class="goal-option ${selected ? 'selected' : ''}" data-key="${key}" data-value="${value}" aria-pressed="${selected ? 'true' : 'false'}"><span class="goal-emoji">${emoji}</span><span class="goal-text">${label}</span></button>`;
  }

  async #next() {
    if (this.#step < 4) {
      this.#step += 1;
      this.#renderStep();
      return;
    }

    const user = new User({
      goal: this.#data.goal || 'fat_loss',
      focusArea: this.#data.focus || 'core',
      dailyMinutes: parseInt(this.#data.time, 10) || 30,
      level: this.#data.level || 'beginner'
    });
    await this.#updateProfile.saveProfile(user, { setActive: true });
  }

  #stepGoal() {
    return `<div class="onb-step active">
      <h2 style="font:var(--text-display);margin-bottom:6px;">🎯 What's your goal?</h2>
      <p class="text-muted mb-24">We'll customize everything for you</p>
      ${this.#renderOption('goal', 'fat_loss', '🔥', 'Lose Fat / Reduce Belly')}
      ${this.#renderOption('goal', 'strength', '💪', 'Build Strength')}
      ${this.#renderOption('goal', 'flexibility', '🧘', 'Improve Flexibility')}
      ${this.#renderOption('goal', 'stress_relief', '🧠', 'Reduce Stress')}
    </div>`;
  }

  #stepFocus() {
    return `<div class="onb-step active">
      <h2 style="font:var(--text-display);margin-bottom:6px;">📍 Focus Area</h2>
      <p class="text-muted mb-24">Which area do you want to target most?</p>
      ${this.#renderOption('focus', 'core', '🎯', 'Core / Belly Fat')}
      ${this.#renderOption('focus', 'full_body', '🏃', 'Full Body')}
      ${this.#renderOption('focus', 'upper', '💪', 'Upper Body')}
      ${this.#renderOption('focus', 'lower', '🦵', 'Lower Body')}
    </div>`;
  }

  #stepTime() {
    return `<div class="onb-step active">
      <h2 style="font:var(--text-display);margin-bottom:6px;">⏰ Daily Time</h2>
      <p class="text-muted mb-24">How many minutes can you dedicate?</p>
      ${this.#renderOption('time', '15', '⚡', '15 min - Quick & effective')}
      ${this.#renderOption('time', '30', '💪', '30 min - Balanced')}
      ${this.#renderOption('time', '45', '🔥', '45 min - Intensive')}
    </div>`;
  }

  #stepLevel() {
    return `<div class="onb-step active">
      <h2 style="font:var(--text-display);margin-bottom:6px;">💪 Fitness Level</h2>
      <p class="text-muted mb-24">Be honest — we'll adjust intensity perfectly</p>
      ${this.#renderOption('level', 'beginner', '🌱', 'Beginner - New to exercise')}
      ${this.#renderOption('level', 'intermediate', '🌿', 'Intermediate - Exercise sometimes')}
      ${this.#renderOption('level', 'advanced', '🌳', 'Advanced - Exercise regularly')}
    </div>`;
  }
}
