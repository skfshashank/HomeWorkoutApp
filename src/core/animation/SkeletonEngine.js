import { STANDING_FRONT } from './exerciseKeyframes.js';

const CONNECTIONS = [
  [13, 0], [1, 13], [2, 13], [1, 3], [3, 5], [2, 4], [4, 6],
  [13, 14], [7, 14], [8, 14], [7, 9], [9, 11], [8, 10], [10, 12], [11, 15], [12, 16]
];

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export class SkeletonEngine {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.width = options.width || 400;
    this.height = options.height || 400;
    this.playing = false;
    this.speed = 1;
    this.lottieAnim = null;
    this.exerciseId = null;

    // Create a container div to replace the canvas for Lottie
    this.container = document.createElement('div');
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.container.style.background = '#111827';
    this.container.style.borderRadius = (canvas?.style?.borderRadius) || '0';
    this.container.style.overflow = 'hidden';
    if (canvas?.id) this.container.id = canvas.id;
    if (canvas?.className) this.container.className = canvas.className;
    this.container.dataset.renderer = 'lottie';

    if (canvas?.parentNode) {
      canvas.parentNode.replaceChild(this.container, canvas);
    }
  }

  loadExercise(keyframes, exerciseId) {
    this.exerciseId = exerciseId;
    this._loadLottie(exerciseId);
  }

  async _loadLottie(exerciseId) {
    // Clean up previous animation
    if (this.lottieAnim) {
      this.lottieAnim.destroy();
      this.lottieAnim = null;
    }
    this.container.innerHTML = '';

    if (!exerciseId) return;

    // Check if lottie library is available
    const lottie = window.lottie;
    if (!lottie) {
      console.warn('Lottie library not loaded, falling back to static display');
      this.container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#64748B;font-size:14px;">Animation loading...</div>';
      return;
    }

    const path = `animations/${exerciseId}.json`;

    try {
      this.lottieAnim = lottie.loadAnimation({
        container: this.container,
        renderer: 'svg',
        loop: true,
        autoplay: this.playing,
        path: path,
        rendererSettings: {
          preserveAspectRatio: 'xMidYMid meet',
          progressiveLoad: true
        }
      });

      this.lottieAnim.setSpeed(this.speed);

      this.lottieAnim.addEventListener('DOMLoaded', () => {
        if (this.playing) {
          this.lottieAnim.play();
        }
      });

      this.lottieAnim.addEventListener('data_failed', () => {
        console.warn(`Failed to load Lottie for ${exerciseId}`);
        this.container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#64748B;font-size:14px;">⚠️ Animation unavailable</div>';
      });
    } catch (err) {
      console.warn('Lottie load error:', err);
    }
  }

  play() {
    this.playing = true;
    if (this.lottieAnim) {
      this.lottieAnim.play();
    }
  }

  pause() {
    this.playing = false;
    if (this.lottieAnim) {
      this.lottieAnim.pause();
    }
  }

  setSpeed(speed = 1) {
    this.speed = Math.max(0.1, Number(speed) || 1);
    if (this.lottieAnim) {
      this.lottieAnim.setSpeed(this.speed);
    }
  }

  destroy() {
    this.playing = false;
    if (this.lottieAnim) {
      this.lottieAnim.destroy();
      this.lottieAnim = null;
    }
    this.container.innerHTML = '';
  }
}

export { CONNECTIONS, easeInOut };
