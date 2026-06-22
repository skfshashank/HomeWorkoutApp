/**
 * Logger - structured logging with levels.
 */
export class Logger {
  #prefix;
  #level; // 0=debug, 1=info, 2=warn, 3=error
  
  constructor(prefix = 'OpenFit', level = 1) {
    this.#prefix = prefix;
    this.#level = level;
  }
  
  debug(...args) { if (this.#level <= 0) console.debug(`[${this.#prefix}]`, ...args); }
  info(...args) { if (this.#level <= 1) console.info(`[${this.#prefix}]`, ...args); }
  warn(...args) { if (this.#level <= 2) console.warn(`[${this.#prefix}]`, ...args); }
  error(...args) { if (this.#level <= 3) console.error(`[${this.#prefix}]`, ...args); }
}
