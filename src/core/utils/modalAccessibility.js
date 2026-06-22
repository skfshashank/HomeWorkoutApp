const FOCUSABLE_SELECTOR = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const getFocusableElements = (root) => Array.from(root.querySelectorAll(FOCUSABLE_SELECTOR))
  .filter((element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true');

const getMainContent = () => document.getElementById('main-content');

export const withModalCloseButton = (html) => `
  <button type="button" class="modal-close" data-close-modal="true" aria-label="Close dialog">✕</button>
  ${html}
`;

export function openAccessibleModal(controller, html, handler, options = {}) {
  const { closeOnBackdrop = true, onDismiss = null } = options;
  closeAccessibleModal(controller, { notify: false });

  controller.lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  controller.modalDismissHandler = onDismiss;
  controller.modalContent.innerHTML = withModalCloseButton(html);
  controller.modalContent.setAttribute('aria-hidden', 'false');
  controller.modalContent.setAttribute('tabindex', '-1');
  controller.modal.classList.add('active');
  controller.modal.setAttribute('aria-hidden', 'false');
  getMainContent()?.setAttribute('inert', '');

  controller.modalCleanup = (event) => {
    if (event.target.closest('[data-close-modal]')) {
      closeAccessibleModal(controller, { reason: 'dismiss' });
      return;
    }

    if (closeOnBackdrop && event.type === 'click' && event.target === controller.modal) {
      closeAccessibleModal(controller, { reason: 'dismiss' });
      return;
    }

    handler?.(event);
  };

  controller._trapFocus = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeAccessibleModal(controller, { reason: 'dismiss' });
      return;
    }

    if (event.key !== 'Tab') return;

    const focusable = getFocusableElements(controller.modalContent);
    if (!focusable.length) {
      event.preventDefault();
      controller.modalContent.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  controller.modal.addEventListener('click', controller.modalCleanup);
  controller.modal.addEventListener('submit', controller.modalCleanup);
  document.addEventListener('keydown', controller._trapFocus);

  window.requestAnimationFrame(() => {
    const focusable = getFocusableElements(controller.modalContent);
    (focusable[0] || controller.modalContent).focus();
  });
}

export function closeAccessibleModal(controller, options = {}) {
  const { reason = 'programmatic', notify = true } = options;

  if (controller.modalCleanup) {
    controller.modal.removeEventListener('click', controller.modalCleanup);
    controller.modal.removeEventListener('submit', controller.modalCleanup);
    controller.modalCleanup = null;
  }

  if (controller._trapFocus) {
    document.removeEventListener('keydown', controller._trapFocus);
    controller._trapFocus = null;
  }

  controller.modal.classList.remove('active');
  controller.modal.setAttribute('aria-hidden', 'true');
  controller.modalContent.setAttribute('aria-hidden', 'true');
  controller.modalContent.innerHTML = '';
  getMainContent()?.removeAttribute('inert');

  const focusTarget = controller.lastFocusedElement;
  controller.lastFocusedElement = null;

  const dismissHandler = controller.modalDismissHandler;
  controller.modalDismissHandler = null;

  if (notify) dismissHandler?.(reason);

  if (focusTarget?.focus) {
    window.requestAnimationFrame(() => focusTarget.focus());
  }
}
