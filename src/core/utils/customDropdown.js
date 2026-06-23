/**
 * Replaces native <select> elements with custom styled dropdowns.
 * Eliminates the white flash from OS-native dropdowns in dark theme.
 *
 * Usage: call upgradeSelects(container) after rendering HTML that contains
 * <select class="form-input form-select"> elements.
 */

const ARROW_SVG = `<svg class="custom-dropdown__arrow" viewBox="0 0 16 16" fill="currentColor"><path d="M4 6l4 4 4-4"/></svg>`;

function createDropdown(select) {
  const wrapper = document.createElement('div');
  wrapper.className = 'custom-dropdown';

  // Copy data attributes from original select
  for (const [key, val] of Object.entries(select.dataset)) {
    wrapper.dataset[key] = val;
  }

  const options = Array.from(select.options);
  const selectedOption = options.find(o => o.selected) || options[0];

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'custom-dropdown__trigger';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.innerHTML = `<span class="custom-dropdown__label">${selectedOption?.textContent || ''}</span>${ARROW_SVG}`;

  const menu = document.createElement('div');
  menu.className = 'custom-dropdown__menu';
  menu.setAttribute('role', 'listbox');

  options.forEach(opt => {
    const item = document.createElement('div');
    item.className = 'custom-dropdown__option' + (opt.selected ? ' selected' : '');
    item.dataset.value = opt.value;
    item.textContent = opt.textContent;
    item.setAttribute('role', 'option');
    item.setAttribute('aria-selected', opt.selected ? 'true' : 'false');
    menu.appendChild(item);
  });

  // Hidden native select to preserve form value and change events
  const hiddenSelect = select.cloneNode(true);
  hiddenSelect.style.display = 'none';
  hiddenSelect.setAttribute('aria-hidden', 'true');
  hiddenSelect.tabIndex = -1;

  wrapper.appendChild(trigger);
  wrapper.appendChild(menu);
  wrapper.appendChild(hiddenSelect);

  // Toggle open/close
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = wrapper.classList.toggle('open');
    trigger.setAttribute('aria-expanded', isOpen);
  });

  // Select option
  menu.addEventListener('click', (e) => {
    const item = e.target.closest('.custom-dropdown__option');
    if (!item) return;

    const value = item.dataset.value;

    // Update visual state
    menu.querySelectorAll('.custom-dropdown__option').forEach(o => {
      o.classList.remove('selected');
      o.setAttribute('aria-selected', 'false');
    });
    item.classList.add('selected');
    item.setAttribute('aria-selected', 'true');
    wrapper.querySelector('.custom-dropdown__label').textContent = item.textContent;

    // Update hidden select and fire change event
    hiddenSelect.value = value;
    hiddenSelect.dispatchEvent(new Event('change', { bubbles: true }));

    // Close
    wrapper.classList.remove('open');
    trigger.setAttribute('aria-expanded', 'false');
  });

  select.replaceWith(wrapper);
  return wrapper;
}

// Close all dropdowns when clicking outside
document.addEventListener('click', () => {
  document.querySelectorAll('.custom-dropdown.open').forEach(dd => {
    dd.classList.remove('open');
    dd.querySelector('.custom-dropdown__trigger')?.setAttribute('aria-expanded', 'false');
  });
});

/**
 * Upgrade all native <select> elements inside a container to custom dropdowns.
 * @param {HTMLElement} container
 */
export function upgradeSelects(container) {
  if (!container) return;
  container.querySelectorAll('select.form-select, select.form-input').forEach(select => {
    createDropdown(select);
  });
}
