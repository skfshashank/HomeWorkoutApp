export class OnboardingView {
  #updateProfile;
  #i18n;
  #step = 1;
  #data = {};

  constructor(updateProfile, i18n = null) {
    this.#updateProfile = updateProfile;
    this.#i18n = i18n;
  }

  #t(key, fallback = key) {
    return this.#i18n?.t(key) || fallback;
  }

  #format(key, values, fallback) {
    return this.#i18n?.format?.(key, values) || fallback;
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
      <div class="mb-16 text-muted text-sm">${this.#format('onboarding_step_label', { step: this.#step, total: 4 }, `Step ${this.#step} of 4`)}</div>
      <button class="btn btn-primary btn-block" id="onb-next">${this.#step === 4 ? this.#t('onboarding_start_training', 'Start Training! 🚀') : this.#t('continue', 'Continue →')}</button>`;

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
    // Validate current step - user must select an option
    const requiredKeys = ['goal', 'focus', 'time', 'level'];
    const currentKey = requiredKeys[this.#step - 1];
    if (!this.#data[currentKey]) {
      // Shake the options to indicate selection required
      const content = document.getElementById('onb-content');
      content.querySelectorAll('.goal-option').forEach(opt => {
        opt.classList.add('shake');
        setTimeout(() => opt.classList.remove('shake'), 500);
      });
      return;
    }

    if (this.#step < 4) {
      this.#step += 1;
      this.#renderStep();
      return;
    }

    await this.#updateProfile.createFromOnboarding({
      goal: this.#data.goal,
      focusArea: this.#data.focus,
      dailyMinutes: parseInt(this.#data.time, 10),
      level: this.#data.level
    });
  }

  #stepGoal() {
    return `<div class="onb-step active">
      <h2 style="font:var(--text-display);margin-bottom:6px;">${this.#t('onboarding_goal_title', '🎯 What\'s your goal?')}</h2>
      <p class="text-muted mb-24">${this.#t('onboarding_goal_subtitle', 'We\'ll customize everything for you')}</p>
      ${this.#renderOption('goal', 'fat_loss', '🔥', this.#t('onboarding_goal_fat_loss', 'Lose Fat / Reduce Belly'))}
      ${this.#renderOption('goal', 'strength', '💪', this.#t('onboarding_goal_strength', 'Build Strength'))}
      ${this.#renderOption('goal', 'flexibility', '🧘', this.#t('onboarding_goal_flexibility', 'Improve Flexibility'))}
      ${this.#renderOption('goal', 'stress_relief', '🧠', this.#t('onboarding_goal_stress_relief', 'Reduce Stress'))}
    </div>`;
  }

  #stepFocus() {
    return `<div class="onb-step active">
      <h2 style="font:var(--text-display);margin-bottom:6px;">${this.#t('onboarding_focus_title', '📍 Focus Area')}</h2>
      <p class="text-muted mb-24">${this.#t('onboarding_focus_subtitle', 'Which area do you want to target most?')}</p>
      ${this.#renderOption('focus', 'core', '🎯', this.#t('onboarding_focus_core', 'Core / Belly Fat'))}
      ${this.#renderOption('focus', 'full_body', '🏃', this.#t('onboarding_focus_full_body', 'Full Body'))}
      ${this.#renderOption('focus', 'upper', '💪', this.#t('onboarding_focus_upper', 'Upper Body'))}
      ${this.#renderOption('focus', 'lower', '🦵', this.#t('onboarding_focus_lower', 'Lower Body'))}
    </div>`;
  }

  #stepTime() {
    return `<div class="onb-step active">
      <h2 style="font:var(--text-display);margin-bottom:6px;">${this.#t('onboarding_time_title', '⏰ Daily Time')}</h2>
      <p class="text-muted mb-24">${this.#t('onboarding_time_subtitle', 'How many minutes can you dedicate?')}</p>
      ${this.#renderOption('time', '15', '⚡', this.#t('onboarding_time_15', '15 min - Quick & effective'))}
      ${this.#renderOption('time', '30', '💪', this.#t('onboarding_time_30', '30 min - Balanced'))}
      ${this.#renderOption('time', '45', '🔥', this.#t('onboarding_time_45', '45 min - Intensive'))}
    </div>`;
  }

  #stepLevel() {
    return `<div class="onb-step active">
      <h2 style="font:var(--text-display);margin-bottom:6px;">${this.#t('onboarding_level_title', '💪 Fitness Level')}</h2>
      <p class="text-muted mb-24">${this.#t('onboarding_level_subtitle', 'Be honest — we\'ll adjust intensity perfectly')}</p>
      ${this.#renderOption('level', 'beginner', '🌱', this.#t('onboarding_level_beginner', 'Beginner - New to exercise'))}
      ${this.#renderOption('level', 'intermediate', '🌿', this.#t('onboarding_level_intermediate', 'Intermediate - Exercise sometimes'))}
      ${this.#renderOption('level', 'advanced', '🌳', this.#t('onboarding_level_advanced', 'Advanced - Exercise regularly'))}
    </div>`;
  }
}
