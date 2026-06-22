import { Events } from '../../app/eventBus.js';
import { User } from '../../domain/entities/User.js';

export class OnboardingView {
  #prefs; #bus; #step = 1; #data = {};

  constructor(prefs, bus) {
    this.#prefs = prefs;
    this.#bus = bus;
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
      opt.addEventListener('click', () => {
        content.querySelectorAll('.goal-option').forEach((o) => o.classList.remove('selected'));
        opt.classList.add('selected');
        this.#data[opt.dataset.key] = opt.dataset.value;
      });
    });

    document.getElementById('onb-next').addEventListener('click', () => this.#next());
  }

  #next() {
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
    this.#prefs.set('user', user);
    this.#bus.emit(Events.PROFILE_UPDATED, user);
  }

  #stepGoal() {
    return `<div class="onb-step active">
      <h1 style="font-size:1.75rem;font-weight:800;margin-bottom:6px;">🎯 What's your goal?</h1>
      <p class="text-muted mb-24">We'll customize everything for you</p>
      <div class="goal-option" data-key="goal" data-value="fat_loss"><span class="goal-emoji">🔥</span><span class="goal-text">Lose Fat / Reduce Belly</span></div>
      <div class="goal-option" data-key="goal" data-value="strength"><span class="goal-emoji">💪</span><span class="goal-text">Build Strength</span></div>
      <div class="goal-option" data-key="goal" data-value="flexibility"><span class="goal-emoji">🧘</span><span class="goal-text">Improve Flexibility</span></div>
      <div class="goal-option" data-key="goal" data-value="stress_relief"><span class="goal-emoji">🧠</span><span class="goal-text">Reduce Stress</span></div>
    </div>`;
  }

  #stepFocus() {
    return `<div class="onb-step active">
      <h1 style="font-size:1.75rem;font-weight:800;margin-bottom:6px;">📍 Focus Area</h1>
      <p class="text-muted mb-24">Which area do you want to target most?</p>
      <div class="goal-option" data-key="focus" data-value="core"><span class="goal-emoji">🎯</span><span class="goal-text">Core / Belly Fat</span></div>
      <div class="goal-option" data-key="focus" data-value="full_body"><span class="goal-emoji">🏃</span><span class="goal-text">Full Body</span></div>
      <div class="goal-option" data-key="focus" data-value="upper"><span class="goal-emoji">💪</span><span class="goal-text">Upper Body</span></div>
      <div class="goal-option" data-key="focus" data-value="lower"><span class="goal-emoji">🦵</span><span class="goal-text">Lower Body</span></div>
    </div>`;
  }

  #stepTime() {
    return `<div class="onb-step active">
      <h1 style="font-size:1.75rem;font-weight:800;margin-bottom:6px;">⏰ Daily Time</h1>
      <p class="text-muted mb-24">How many minutes can you dedicate?</p>
      <div class="goal-option" data-key="time" data-value="15"><span class="goal-emoji">⚡</span><span class="goal-text">15 min - Quick & effective</span></div>
      <div class="goal-option" data-key="time" data-value="30"><span class="goal-emoji">💪</span><span class="goal-text">30 min - Balanced</span></div>
      <div class="goal-option" data-key="time" data-value="45"><span class="goal-emoji">🔥</span><span class="goal-text">45 min - Intensive</span></div>
    </div>`;
  }

  #stepLevel() {
    return `<div class="onb-step active">
      <h1 style="font-size:1.75rem;font-weight:800;margin-bottom:6px;">💪 Fitness Level</h1>
      <p class="text-muted mb-24">Be honest — we'll adjust intensity perfectly</p>
      <div class="goal-option" data-key="level" data-value="beginner"><span class="goal-emoji">🌱</span><span class="goal-text">Beginner - New to exercise</span></div>
      <div class="goal-option" data-key="level" data-value="intermediate"><span class="goal-emoji">🌿</span><span class="goal-text">Intermediate - Exercise sometimes</span></div>
      <div class="goal-option" data-key="level" data-value="advanced"><span class="goal-emoji">🌳</span><span class="goal-text">Advanced - Exercise regularly</span></div>
    </div>`;
  }
}
