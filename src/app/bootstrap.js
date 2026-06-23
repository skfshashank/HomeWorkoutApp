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
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.register('./sw.js').then((reg) => {
        // Force update check on every page load
        reg.update();
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'activated') {
                // New SW activated — reload to get fresh assets
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
}
