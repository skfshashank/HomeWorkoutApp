/**
 * Replaces native <select> elements with custom styled dropdowns.
 * Uses a portal (menu appended to body) so overflow:hidden parents can't clip it.
 */

const ARROW_SVG = `<svg class="custom-dropdown__arrow" viewBox="0 0 16 16" fill="currentColor"><path d="M4 6l4 4 4-4"/></svg>`;

let activeMenu = null; // tracks the currently open portal menu

function closeActiveMenu() {
  if (!activeMenu) return;
  activeMenu.menu.remove();
  activeMenu.wrapper.classList.remove('open');
  activeMenu.trigger.setAttribute('aria-expanded', 'false');
  activeMenu = null;
}

function positionMenu(menu, trigger) {
  const rect = trigger.getBoundingClientRect();
  const menuH = menu.scrollHeight;
  const spaceBelow = window.innerHeight - rect.bottom - 8;
  const openAbove = spaceBelow < menuH && rect.top > spaceBelow;

  menu.style.position = 'fixed';
  menu.style.left = `${rect.left}px`;
  menu.style.width = `${rect.width}px`;
  menu.style.zIndex = '9999';

  if (openAbove) {
    menu.style.bottom = `${window.innerHeight - rect.top + 4}px`;
    menu.style.top = 'auto';
  } else {
    menu.style.top = `${rect.bottom + 4}px`;
    menu.style.bottom = 'auto';
  }
}

function buildMenuEl(options, selectedValue) {
  const menu = document.createElement('div');
  menu.className = 'custom-dropdown__menu custom-dropdown__menu--portal';
  menu.setAttribute('role', 'listbox');

  options.forEach(opt => {
    const item = document.createElement('div');
    item.className = 'custom-dropdown__option' + (opt.value === selectedValue ? ' selected' : '');
    item.dataset.value = opt.value;
    item.textContent = opt.text;
    item.setAttribute('role', 'option');
    item.setAttribute('aria-selected', opt.value === selectedValue ? 'true' : 'false');
    menu.appendChild(item);
  });

  return menu;
}

function createDropdown(select) {
  const wrapper = document.createElement('div');
  wrapper.className = 'custom-dropdown';

  for (const [key, val] of Object.entries(select.dataset)) {
    wrapper.dataset[key] = val;
  }

  const optionData = Array.from(select.options).map(o => ({ value: o.value, text: o.textContent, selected: o.selected }));
  const selectedOption = optionData.find(o => o.selected) || optionData[0];

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'custom-dropdown__trigger';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.innerHTML = `<span class="custom-dropdown__label">${selectedOption?.text || ''}</span>${ARROW_SVG}`;

  // Hidden native select to preserve form value and change events
  const hiddenSelect = select.cloneNode(true);
  hiddenSelect.style.display = 'none';
  hiddenSelect.setAttribute('aria-hidden', 'true');
  hiddenSelect.tabIndex = -1;

  wrapper.appendChild(trigger);
  wrapper.appendChild(hiddenSelect);

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();

    // If this dropdown is already open, close it
    if (activeMenu?.wrapper === wrapper) {
      closeActiveMenu();
      return;
    }

    closeActiveMenu();

    const menu = buildMenuEl(optionData, hiddenSelect.value);
    document.body.appendChild(menu);
    positionMenu(menu, trigger);

    // Animate in
    requestAnimationFrame(() => menu.classList.add('visible'));

    wrapper.classList.add('open');
    trigger.setAttribute('aria-expanded', 'true');
    activeMenu = { menu, wrapper, trigger };

    menu.addEventListener('click', (ev) => {
      const item = ev.target.closest('.custom-dropdown__option');
      if (!item) return;

      const value = item.dataset.value;
      const chosen = optionData.find(o => o.value === value);

      wrapper.querySelector('.custom-dropdown__label').textContent = chosen?.text || value;
      hiddenSelect.value = value;
      hiddenSelect.dispatchEvent(new Event('change', { bubbles: true }));

      closeActiveMenu();
    });
  });

  select.replaceWith(wrapper);
  return wrapper;
}

// Close on any outside click
document.addEventListener('click', (e) => {
  if (activeMenu && !activeMenu.wrapper.contains(e.target) && !activeMenu.menu.contains(e.target)) {
    closeActiveMenu();
  }
});

// Close on scroll so menu doesn't float detached
window.addEventListener('scroll', () => closeActiveMenu(), { passive: true, capture: true });

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
