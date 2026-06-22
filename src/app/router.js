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
      btn.classList.toggle('active', btn.dataset.nav === page);
    });
  }
  
  get current() { return this.#currentPage; }
}
