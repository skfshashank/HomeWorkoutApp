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

    // Stale caches are pruned by the service worker's own `activate` handler
    // (it deletes every cache except the current CACHE_NAME), so no client-side
    // cache cleanup is needed here.
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      reg.update().catch(() => {});
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
