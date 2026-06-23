import { SkeletonEngine } from './SkeletonEngine.js';
import { getExerciseAnimation, getKeyframesForExercise } from './exerciseKeyframes.js';

const ACTIVE_RENDERERS = new Map();

export class SkeletonRenderer {
  constructor() {
    this.engine = null;
    this.container = null;
    this.controlHandler = null;
  }

  createPlayer(exerciseId, exerciseName = '') {
    const id = `skeleton-${exerciseId}-${Date.now()}-${Math.round(Math.random() * 10000)}`;
    const label = `${exerciseName || exerciseId || 'Exercise'} animation`;
    const html = `
      <div class="skeleton-player-wrapper" data-skeleton-player="${id}">
        <canvas id="${id}" class="skeleton-canvas" width="400" height="400" aria-label="${label}"></canvas>
        <div class="skeleton-controls">
          <button class="skel-btn" type="button" data-skel-action="play-pause">⏯️</button>
          <button class="skel-btn" type="button" data-skel-action="slow">🐢 0.5x</button>
          <button class="skel-btn" type="button" data-skel-action="normal">▶️ 1x</button>
        </div>
      </div>`;

    const setup = () => {
      const canvas = document.getElementById(id);
      if (!canvas) return null;

      this.destroy();
      this.container = canvas.closest('[data-skeleton-player]');
      this.engine = new SkeletonEngine(canvas);
      this.engine.loadExercise(getKeyframesForExercise(exerciseId));
      this.engine.play();

      this.controlHandler = (event) => {
        const action = event.target.closest('[data-skel-action]')?.dataset.skelAction;
        if (!action || !this.engine) return;
        if (action === 'play-pause') {
          if (this.engine.playing) this.engine.pause();
          else this.engine.play();
        }
        if (action === 'slow') this.engine.setSpeed(0.5);
        if (action === 'normal') this.engine.setSpeed(1);
      };

      this.container?.addEventListener('click', this.controlHandler);
      return this.engine;
    };

    return { html, setup, id };
  }

  destroy() {
    if (this.container && this.controlHandler) {
      this.container.removeEventListener('click', this.controlHandler);
    }
    this.controlHandler = null;
    this.container = null;
    this.engine?.destroy();
    this.engine = null;
  }
}

export function getExercisePlayerHTML(exerciseId, exerciseName = '') {
  const renderer = new SkeletonRenderer();
  return renderer.createPlayer(exerciseId, exerciseName);
}

export function renderExerciseAnimation(containerId, exerciseId, exerciseName = '') {
  const host = document.getElementById(containerId);
  if (!host) return null;

  ACTIVE_RENDERERS.get(containerId)?.destroy();
  const renderer = new SkeletonRenderer();
  const { html, setup } = renderer.createPlayer(exerciseId, exerciseName);
  host.innerHTML = html;
  const engine = setup();
  ACTIVE_RENDERERS.set(containerId, renderer);
  return engine;
}

export function destroyExerciseAnimation(containerId) {
  ACTIVE_RENDERERS.get(containerId)?.destroy();
  ACTIVE_RENDERERS.delete(containerId);
}

export { getExerciseAnimation };

