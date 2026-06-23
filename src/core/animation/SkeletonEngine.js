export class SkeletonEngine {
  constructor(canvas) {
    this.playing = false;
    this.speed = 1;
    this.lottieAnim = null;
    this.exerciseId = null;
    this._loadId = 0;

    // Replace canvas with a div container for Lottie SVG rendering
    this.container = document.createElement('div');
    this.container.className = canvas?.className || '';
    this.container.style.cssText = 'width:100%;aspect-ratio:1;display:block;background:#111827;overflow:hidden;position:relative;';
    if (canvas?.id) this.container.id = canvas.id;

    if (canvas?.parentNode) {
      canvas.parentNode.replaceChild(this.container, canvas);
    }
  }

  loadExercise(keyframes, exerciseId) {
    this.exerciseId = exerciseId;
    if (exerciseId) this._loadLottie(exerciseId);
  }

  async _loadLottie(exerciseId) {
    // Increment load ID to ignore stale fetches
    const loadId = ++this._loadId;

    this._destroyAnim();
    this.container.innerHTML = '';

    const lottieLib = window.lottie;
    if (!lottieLib) {
      this.container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#94a3b8;font-size:14px;">Animation loading...</div>';
      return;
    }

    try {
      // Fetch JSON directly with cache-busting to avoid stale SW cache
      const resp = await fetch(`animations/${exerciseId}.json`, { cache: 'reload' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const animationData = await resp.json();

      // Abort if a newer load was requested while we were fetching
      if (loadId !== this._loadId) return;

      this.lottieAnim = lottieLib.loadAnimation({
        container: this.container,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        animationData,
        rendererSettings: {
          preserveAspectRatio: 'xMidYMid meet',
          progressiveLoad: false
        }
      });

      this.lottieAnim.setSpeed(this.speed);
      if (!this.playing) this.lottieAnim.pause();
    } catch (err) {
      if (loadId !== this._loadId) return;
      console.warn(`Lottie load failed for ${exerciseId}:`, err);
      this.container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#94a3b8;font-size:13px;">⚠️ Animation unavailable</div>';
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

  _destroyAnim() {
    if (this.lottieAnim) {
      this.lottieAnim.destroy();
      this.lottieAnim = null;
    }
  }

  destroy() {
    this.playing = false;
    this._loadId++;
    this._destroyAnim();
    this.container.innerHTML = '';
  }
}
