import { Events } from './eventBus.js';

/**
 * SPA Router - manages page visibility and navigation state.
 */
export class Router {
  #currentPage = 'dashboard';
  #bus;
  
  constructor(bus) {
    this.#bus = bus;
  }
  
  navigate(page) {
    const target = document.querySelector(`[data-page="${page}"]`);
    if (!target) return;

    // Hide all pages, show target
    document.querySelectorAll('[data-page]').forEach(el => {
      el.classList.remove('active');
      el.style.display = '';
    });
    target.classList.add('active');
    this.#currentPage = page;
    this.#bus.emit(Events.PAGE_CHANGED, { page });
    window.scrollTo(0, 0);

    // Update nav highlights
    document.querySelectorAll('[data-nav]').forEach(btn => {
      const isActive = btn.dataset.nav === page;
      btn.classList.toggle('active', isActive);
      if (isActive) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    });
  }
  
  get current() { return this.#currentPage; }
}
