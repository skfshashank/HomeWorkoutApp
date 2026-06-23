export class AppBootstrap {
  #router;
  #logger;

  constructor({ router, logger }) {
    this.#router = router;
    this.#logger = logger;
  }

  init(initialPage = 'dashboard') {
    this.bindNavigation();
    this.registerServiceWorker();
    this.#router.navigate(initialPage);
  }

  bindNavigation() {
    document.querySelectorAll('[data-nav]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.hidden) return;
        this.#router.navigate(btn.dataset.nav);
      });
    });
  }

  registerServiceWorker() {
    if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
    
    // Force cleanup: unregister old SWs and clear old caches
    const targetVersion = 'openfit-v22';
    caches.keys().then((keys) => {
      keys.filter((k) => k.startsWith('openfit-') && k !== targetVersion)
        .forEach((k) => caches.delete(k));
    });

    navigator.serviceWorker.register('./sw.js').then((reg) => {
      reg.update();
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated' && !document.querySelector('.modal-overlay.active')) {
              window.location.reload();
            }
          });
        }
      });
    }).catch((error) => {
      this.#logger.error('Service worker registration failed', error);
    });
  }
}
