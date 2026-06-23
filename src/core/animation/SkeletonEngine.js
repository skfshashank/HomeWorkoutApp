export class SkeletonEngine {
  constructor(canvas) {
    this.playing = false;
    this.speed = 1;
    this.mediaElement = null;
    this.exerciseId = null;
    this._loadId = 0;

    // Replace canvas with a div container for media rendering
    this.container = document.createElement('div');
    this.container.className = canvas?.className || '';
    this.container.style.cssText = 'width:100%;aspect-ratio:1;display:flex;align-items:center;justify-content:center;background:#f5f5f5;overflow:hidden;position:relative;border-radius:12px;';
    if (canvas?.id) this.container.id = canvas.id;

    if (canvas?.parentNode) {
      canvas.parentNode.replaceChild(this.container, canvas);
    }
  }

  loadExercise(keyframes, exerciseId) {
    this.exerciseId = exerciseId;
    if (exerciseId) this._loadMedia(exerciseId);
  }

  async _loadMedia(exerciseId) {
    const loadId = ++this._loadId;
    this._destroyMedia();
    this.container.innerHTML = '<div style="color:#94a3b8;font-size:14px;">Loading...</div>';

    try {
      // Try MP4 first (supports speed and pause), fallback to GIF, fallback to WebP
      const formats = ['mp4', 'gif', 'webp'];
      let foundUrl = null;
      let isVideo = false;

      for (const ext of formats) {
        const url = `animations/${exerciseId}.${ext}`;
        try {
          const resp = await fetch(url, { method: 'HEAD' });
          if (resp.ok) {
            foundUrl = url;
            isVideo = ext === 'mp4';
            break;
          }
        } catch(e) {
          // ignore network errors and try next
        }
      }

      if (loadId !== this._loadId) return;

      this.container.innerHTML = '';

      if (!foundUrl) {
        this.container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#94a3b8;font-size:13px;text-align:center;padding:20px;">⚠️ Media unavailable<br>Run download script</div>';
        return;
      }

      if (isVideo) {
        this.mediaElement = document.createElement('video');
        this.mediaElement.src = foundUrl;
        this.mediaElement.loop = true;
        this.mediaElement.muted = true;
        this.mediaElement.playsInline = true;
        this.mediaElement.style.cssText = 'width:100%;height:100%;object-fit:cover;';
        this.mediaElement.playbackRate = this.speed;
        if (this.playing) this.mediaElement.play().catch(()=>{});
      } else {
        this.mediaElement = document.createElement('img');
        this.mediaElement.src = foundUrl;
        this.mediaElement.style.cssText = 'width:100%;height:100%;object-fit:cover;';
      }

      this.container.appendChild(this.mediaElement);

    } catch (err) {
      if (loadId !== this._loadId) return;
      console.warn(`Media load failed for ${exerciseId}:`, err);
      this.container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#94a3b8;font-size:13px;">⚠️ Media unavailable</div>';
    }
  }

  play() {
    this.playing = true;
    if (this.mediaElement && this.mediaElement.tagName === 'VIDEO') {
      this.mediaElement.play().catch(()=>{});
    }
  }

  pause() {
    this.playing = false;
    if (this.mediaElement && this.mediaElement.tagName === 'VIDEO') {
      this.mediaElement.pause();
    }
  }

  setSpeed(speed = 1) {
    this.speed = Math.max(0.1, Number(speed) || 1);
    if (this.mediaElement && this.mediaElement.tagName === 'VIDEO') {
      this.mediaElement.playbackRate = this.speed;
    }
  }

  _destroyMedia() {
    if (this.mediaElement) {
      if (this.mediaElement.tagName === 'VIDEO') {
        this.mediaElement.pause();
        this.mediaElement.src = '';
      }
      this.mediaElement.remove();
      this.mediaElement = null;
    }
  }

  destroy() {
    this.playing = false;
    this._loadId++;
    this._destroyMedia();
    this.container.innerHTML = '';
  }
}
