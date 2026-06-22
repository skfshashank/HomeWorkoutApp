export class MotionService {
  constructor(bus, voice) {
    this.bus = bus;
    this.voice = voice;
    this.active = false;
    this.lastPeakAt = 0;
    this.internalCount = 0;
    this.listener = null;
  }

  startCounting() {
    if (typeof window === 'undefined' || !('DeviceMotionEvent' in window)) {
      return false;
    }
    this.stopCounting();
    this.active = true;
    this.internalCount = 0;
    this.listener = (event) => {
      const acc = event.accelerationIncludingGravity;
      if (!acc) return;
      const magnitude = Math.abs(acc.x || 0) + Math.abs(acc.y || 0) + Math.abs(acc.z || 0);
      const now = Date.now();
      if (magnitude > 26 && now - this.lastPeakAt > 650) {
        this.lastPeakAt = now;
        this.internalCount += 1;
        this.bus.emit('motion:count', { count: this.internalCount });
        this.voice.speak(String(this.internalCount));
      }
    };
    window.addEventListener('devicemotion', this.listener);
    return true;
  }

  stopCounting() {
    if (typeof window !== 'undefined' && this.listener) {
      window.removeEventListener('devicemotion', this.listener);
    }
    this.listener = null;
    this.active = false;
  }

  get count() {
    return this.internalCount;
  }
}
