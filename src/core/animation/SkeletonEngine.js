const CONNECTIONS = [
  [13, 0], [1, 13], [2, 13], [1, 3], [3, 5], [2, 4], [4, 6],
  [13, 14], [7, 14], [8, 14], [7, 9], [9, 11], [8, 10], [10, 12], [11, 15], [12, 16]
];

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export class SkeletonEngine {
  constructor(canvas, options = {}) {
    this.playing = false;
    this.speed = 1;
    this.lottieAnim = null;
    this.exerciseId = null;

    // Create a container div to replace the canvas
    this.container = document.createElement('div');
    this.container.className = canvas?.className || '';
    this.container.style.width = '100%';
    this.container.style.aspectRatio = '1';
    this.container.style.display = 'block';
    this.container.style.background = '#111827';
    this.container.style.overflow = 'hidden';
    this.container.style.position = 'relative';
    if (canvas?.id) this.container.id = canvas.id;
    this.container.dataset.renderer = 'lottie';

    if (canvas?.parentNode) {
      canvas.parentNode.replaceChild(this.container, canvas);
    }
  }

  loadExercise(keyframes, exerciseId) {
    this.exerciseId = exerciseId;
    if (exerciseId) {
      this._loadLottie(exerciseId);
    }
  }

  _loadLottie(exerciseId) {
    if (this.lottieAnim) {
      this.lottieAnim.destroy();
      this.lottieAnim = null;
    }
    this.container.innerHTML = '';

    const lottieLib = window.lottie;
    if (!lottieLib) {
      console.warn('Lottie library not loaded');
      this.container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#64748B;font-size:14px;">Loading...</div>';
      return;
    }

    // Resolve path relative to page location
    const animPath = `animations/${exerciseId}.json`;

    try {
      this.lottieAnim = lottieLib.loadAnimation({
        container: this.container,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        path: animPath,
        rendererSettings: {
          preserveAspectRatio: 'xMidYMid meet',
          progressiveLoad: false,
          hideOnTransparent: true
        }
      });

      this.lottieAnim.setSpeed(this.speed);

      this.lottieAnim.addEventListener('data_failed', () => {
        console.warn(`Lottie load failed: ${exerciseId}`);
        this.container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#64748B;font-size:13px;">⚠️ Animation unavailable</div>';
      });
    } catch (err) {
      console.warn('Lottie error:', err);
    }
  }

  play() {
    this.playing = true;
    if (this.lottieAnim) this.lottieAnim.play();
  }

  pause() {
    this.playing = false;
    if (this.lottieAnim) this.lottieAnim.pause();
  }

  setSpeed(speed = 1) {
    this.speed = Math.max(0.1, Number(speed) || 1);
    if (this.lottieAnim) this.lottieAnim.setSpeed(this.speed);
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
