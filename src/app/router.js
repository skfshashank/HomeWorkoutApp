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
    document.querySelectorAll('[data-page]').forEach(el => el.classList.remove('active'));
    const target = document.querySelector(`[data-page="${page}"]`);
    if (target) {
      target.classList.add('active');
      this.#currentPage = page;
      this.#bus.emit('page:changed', { page });
    }
    // Update nav
    document.querySelectorAll('[data-nav]').forEach(btn => {
      const isActive = btn.dataset.nav === page;
      btn.classList.toggle('active', isActive);
      if (isActive) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    });
  }
  
  get current() { return this.#currentPage; }
}
