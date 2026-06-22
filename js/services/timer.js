export class TimerService {
  constructor(bus) {
    this.bus = bus;
    this.intervalId = null;
    this.remaining = 0;
    this.mode = null;
    this.callbacks = {};
    this.activePayload = null;
    this.isPaused = false;
  }

  emitTick() {
    this.callbacks.onTick?.(this.remaining);
    this.bus.emit('timer:tick', { remaining: this.remaining, mode: this.mode, payload: this.activePayload });
    if (this.remaining === 3) {
      this.callbacks.onThree?.();
      this.bus.emit('timer:three', { mode: this.mode, payload: this.activePayload });
    }
  }

  run() {
    clearInterval(this.intervalId);
    this.emitTick();
    this.intervalId = setInterval(() => {
      this.remaining -= 1;
      if (this.remaining <= 0) {
        this.stop(false);
        this.callbacks.onComplete?.();
        this.bus.emit('timer:complete', { mode: this.mode, payload: this.activePayload });
        return;
      }
      this.emitTick();
    }, 1000);
  }

  startCountdown(seconds, callbacks = {}, payload = null) {
    this.stop(false);
    this.mode = 'countdown';
    this.callbacks = callbacks;
    this.activePayload = payload;
    this.remaining = Math.max(0, Math.round(seconds));
    this.isPaused = false;
    this.run();
  }

  startTabata(rounds = 8, workSec = 20, restSec = 10) {
    let currentRound = 1;
    let inWork = true;
    const nextRound = () => {
      const duration = inWork ? workSec : restSec;
      this.startCountdown(duration, {
        onComplete: () => {
          if (!inWork) currentRound += 1;
          if (currentRound > rounds) return;
          inWork = !inWork;
          nextRound();
        }
      }, { type: 'tabata', currentRound, rounds, phase: inWork ? 'work' : 'rest' });
    };
    nextRound();
  }

  startAMRAP(totalMinutes) {
    this.startCountdown(totalMinutes * 60, {}, { type: 'amrap', totalMinutes });
  }

  pause() {
    if (!this.intervalId) return;
    clearInterval(this.intervalId);
    this.intervalId = null;
    this.isPaused = true;
  }

  resume() {
    if (!this.isPaused || this.remaining <= 0) return;
    this.isPaused = false;
    this.run();
  }

  stop(reset = true) {
    clearInterval(this.intervalId);
    this.intervalId = null;
    this.isPaused = false;
    if (reset) {
      this.remaining = 0;
      this.mode = null;
      this.callbacks = {};
      this.activePayload = null;
    }
  }
}
