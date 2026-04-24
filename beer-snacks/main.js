/* ============================
   BEER & SNACKS — main.js
   ============================ */

/* ---------- 1. АКТИВНЕ ПОСИЛАННЯ В НАВІГАЦІЇ ---------- */
(function setActiveNav() {
  const currentPage = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav__link').forEach(link => {
    const linkPage = link.getAttribute('href');
    if (linkPage === currentPage) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
})();


/* ---------- 2. КОШИК ---------- */
const Cart = (() => {
  let items = JSON.parse(localStorage.getItem('bs_cart') || '[]');

  function save() {
    localStorage.setItem('bs_cart', JSON.stringify(items));
  }

  function add(name, price) {
    const existing = items.find(i => i.name === name);
    if (existing) {
      existing.qty += 1;
    } else {
      items.push({ name, price, qty: 1 });
    }
    save();
    updateBadge();
    showToast(`«${name}» додано до кошика`);
  }

  function remove(name) {
    items = items.filter(i => i.name !== name);
    save();
    updateBadge();
    renderCartModal();
  }

  function changeQty(name, delta) {
    const item = items.find(i => i.name === name);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) {
      remove(name);
      return;
    }
    save();
    renderCartModal();
  }

  function totalCount() {
    return items.reduce((s, i) => s + i.qty, 0);
  }

  function totalPrice() {
    return items.reduce((s, i) => s + i.price * i.qty, 0);
  }

  function getItems() {
    return items;
  }

  return { add, remove, changeQty, totalCount, totalPrice, getItems };
})();

// --- Бейдж на іконці кошика ---
function updateBadge() {
  let badge = document.querySelector('.cart-badge');
  const cartBtn = document.querySelector('[aria-label="Кошик"]');
  if (!cartBtn) return;

  const count = Cart.totalCount();
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'cart-badge';
    cartBtn.style.position = 'relative';
    cartBtn.appendChild(badge);
  }
  badge.textContent = count;
  badge.style.display = count > 0 ? 'flex' : 'none';
}

// --- Toast сповіщення ---
function showToast(message) {
  let toast = document.getElementById('bs-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'bs-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => toast.classList.remove('show'), 2500);
}

// --- Модальне вікно кошика ---
function createCartModal() {
  const overlay = document.createElement('div');
  overlay.id = 'cart-overlay';
  overlay.innerHTML = `
    <div class="cart-modal" role="dialog" aria-modal="true" aria-label="Кошик">
      <div class="cart-modal__header">
        <h2>Кошик</h2>
        <button class="cart-modal__close" aria-label="Закрити">✕</button>
      </div>
      <div class="cart-modal__body" id="cart-items"></div>
      <div class="cart-modal__footer">
        <p class="cart-total">Разом: <strong id="cart-total-price">0₴</strong></p>
        <button class="cart-checkout btn-buy" id="cart-checkout">Оформити замовлення</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeCartModal();
  });
  overlay.querySelector('.cart-modal__close').addEventListener('click', closeCartModal);
  overlay.querySelector('#cart-checkout').addEventListener('click', () => {
    if (Cart.totalCount() === 0) {
      showToast('Кошик порожній');
      return;
    }
    showToast('Дякуємо за замовлення! 🍺');
    Cart.getItems().splice(0);
    localStorage.removeItem('bs_cart');
    updateBadge();
    renderCartModal();
    closeCartModal();
  });
}

function openCartModal() {
  renderCartModal();
  document.getElementById('cart-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCartModal() {
  const overlay = document.getElementById('cart-overlay');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
}

function renderCartModal() {
  const container = document.getElementById('cart-items');
  const totalEl = document.getElementById('cart-total-price');
  if (!container) return;

  const items = Cart.getItems();
  if (items.length === 0) {
    container.innerHTML = '<p class="cart-empty">Кошик порожній 🛒</p>';
  } else {
    container.innerHTML = items.map(item => `
      <div class="cart-item">
        <span class="cart-item__name">${item.name}</span>
        <div class="cart-item__controls">
          <button class="cart-qty-btn" data-action="minus" data-name="${item.name}">−</button>
          <span class="cart-item__qty">${item.qty}</span>
          <button class="cart-qty-btn" data-action="plus" data-name="${item.name}">+</button>
        </div>
        <span class="cart-item__price">${item.price * item.qty}₴</span>
        <button class="cart-item__remove" data-name="${item.name}" aria-label="Видалити">✕</button>
      </div>
    `).join('');

    container.querySelectorAll('.cart-qty-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const delta = btn.dataset.action === 'plus' ? 1 : -1;
        Cart.changeQty(btn.dataset.name, delta);
        updateBadge();
      });
    });
    container.querySelectorAll('.cart-item__remove').forEach(btn => {
      btn.addEventListener('click', () => Cart.remove(btn.dataset.name));
    });
  }

  if (totalEl) totalEl.textContent = Cart.totalPrice() + '₴';
}

// --- Ініціалізація кнопок «Купити» ---
function initBuyButtons() {
  document.querySelectorAll('.btn-buy').forEach(btn => {
    // Пропускаємо кнопку оформлення в самому кошику
    if (btn.id === 'cart-checkout') return;

    btn.addEventListener('click', () => {
      const card = btn.closest('.product-card');
      if (!card) return;
      const name = card.querySelector('.product-card__name').textContent.trim();
      const priceText = card.querySelector('.product-card__price').textContent.replace(/[^\d]/g, '');
      Cart.add(name, parseInt(priceText, 10));
    });
  });
}

// --- Кошик: відкриття по кліку на іконку ---
function initCartIcon() {
  const cartBtn = document.querySelector('[aria-label="Кошик"]');
  if (cartBtn) {
    cartBtn.addEventListener('click', openCartModal);
  }
}


/* ---------- 3. ФІЛЬТР (бокова панель) ---------- */
function initFilter() {
  const filterBtn = document.querySelector('.filter-btn');
  if (!filterBtn) return;

  // Визначаємо унікальні категорії з карток
  const categories = [
    { id: 'beer', label: '🍺 Пиво' },
    { id: 'snacks', label: '🍟 Снеки' },
  ];
  const priceRanges = [
    { id: 'all', label: 'Всі ціни', min: 0, max: Infinity },
    { id: 'cheap', label: 'До 60₴', min: 0, max: 60 },
    { id: 'mid', label: '60 – 80₴', min: 60, max: 80 },
    { id: 'expensive', label: 'Від 80₴', min: 80, max: Infinity },
  ];

  // Визначаємо категорію картки по назві товару
  function getCategory(name) {
    const beerWords = ['beer', 'пиво', 'ale', 'lager', 'craft', 'amber', 'dark', 'light'];
    const lower = name.toLowerCase();
    return beerWords.some(w => lower.includes(w)) ? 'beer' : 'snacks';
  }

  // Панель фільтрів
  const panel = document.createElement('div');
  panel.id = 'filter-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Фільтри');
  panel.innerHTML = `
    <div class="filter-panel__header">
      <h3>Фільтри</h3>
      <button class="filter-panel__close" aria-label="Закрити">✕</button>
    </div>
    <div class="filter-panel__section">
      <p class="filter-panel__label">Категорія</p>
      ${categories.map(c => `
        <label class="filter-check">
          <input type="checkbox" data-filter="category" value="${c.id}" checked>
          ${c.label}
        </label>
      `).join('')}
    </div>
    <div class="filter-panel__section">
      <p class="filter-panel__label">Ціна</p>
      ${priceRanges.map((r, i) => `
        <label class="filter-check">
          <input type="radio" name="price-range" data-filter="price" value="${r.id}" ${i === 0 ? 'checked' : ''}>
          ${r.label}
        </label>
      `).join('')}
    </div>
    <button class="filter-apply btn-buy" style="margin-top:16px">Застосувати</button>
    <button class="filter-reset" style="margin-top:8px">Скинути</button>
  `;

  const overlay = document.createElement('div');
  overlay.id = 'filter-overlay';
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  // Відкрити/закрити
  filterBtn.addEventListener('click', () => {
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  });
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeFilter();
  });
  panel.querySelector('.filter-panel__close').addEventListener('click', closeFilter);

  function closeFilter() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  // Застосувати
  panel.querySelector('.filter-apply').addEventListener('click', () => {
    applyFilter();
    closeFilter();
  });

  // Скинути
  panel.querySelector('.filter-reset').addEventListener('click', () => {
    panel.querySelectorAll('[data-filter="category"]').forEach(cb => (cb.checked = true));
    panel.querySelector('[value="all"]').checked = true;
    applyFilter();
    closeFilter();
  });

  function applyFilter() {
    const checkedCats = [...panel.querySelectorAll('[data-filter="category"]:checked')].map(cb => cb.value);
    const priceId = panel.querySelector('[data-filter="price"]:checked').value;
    const { min, max } = priceRanges.find(r => r.id === priceId);

    let visible = 0;
    document.querySelectorAll('.product-card').forEach(card => {
      const name = card.querySelector('.product-card__name').textContent;
      const price = parseInt(card.querySelector('.product-card__price').textContent.replace(/[^\d]/g, ''), 10);
      const cat = getCategory(name);
      const show = checkedCats.includes(cat) && price >= min && price <= max;
      card.style.display = show ? '' : 'none';
      if (show) visible++;
    });

    // Повідомлення якщо нічого не знайдено
    let emptyMsg = document.getElementById('filter-empty');
    if (visible === 0) {
      if (!emptyMsg) {
        emptyMsg = document.createElement('p');
        emptyMsg.id = 'filter-empty';
        emptyMsg.style.cssText = 'text-align:center;color:#666;padding:24px;grid-column:1/-1';
        emptyMsg.textContent = 'Нічого не знайдено за вашими фільтрами';
        document.querySelector('.products-grid').appendChild(emptyMsg);
      }
    } else if (emptyMsg) {
      emptyMsg.remove();
    }
  }
}


/* ---------- 4. СОРТУВАННЯ ---------- */
function initSort() {
  const sortEl = document.querySelector('.sort-select');
  if (!sortEl) return;

  const options = [
    { id: 'rating', label: 'За рейтингом' },
    { id: 'price-asc', label: 'Ціна: зростання' },
    { id: 'price-desc', label: 'Ціна: спадання' },
    { id: 'name', label: 'За назвою' },
  ];

  let current = 'rating';
  let dropdownOpen = false;

  // Замінюємо статичний елемент на кастомний select
  const wrapper = document.createElement('div');
  wrapper.className = 'sort-wrapper';
  wrapper.innerHTML = `
    <div class="sort-select" tabindex="0" role="combobox" aria-expanded="false">
      <span class="sort-label">${options[0].label}</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </div>
    <ul class="sort-dropdown" role="listbox">
      ${options.map(o => `
        <li class="sort-option ${o.id === current ? 'selected' : ''}" data-value="${o.id}" role="option">
          ${o.label}
        </li>
      `).join('')}
    </ul>
  `;

  sortEl.replaceWith(wrapper);

  const newSortEl = wrapper.querySelector('.sort-select');
  const dropdown = wrapper.querySelector('.sort-dropdown');

  function toggleDropdown(open) {
    dropdownOpen = open;
    dropdown.classList.toggle('open', open);
    newSortEl.setAttribute('aria-expanded', open);
  }

  newSortEl.addEventListener('click', e => {
    e.stopPropagation();
    toggleDropdown(!dropdownOpen);
  });

  document.addEventListener('click', () => toggleDropdown(false));

  wrapper.querySelectorAll('.sort-option').forEach(opt => {
    opt.addEventListener('click', () => {
      current = opt.dataset.value;
      wrapper.querySelectorAll('.sort-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      wrapper.querySelector('.sort-label').textContent = opt.textContent.trim();
      toggleDropdown(false);
      applySort(current);
    });
  });

  function applySort(type) {
    const grid = document.querySelector('.products-grid');
    if (!grid) return;
    const cards = [...grid.querySelectorAll('.product-card')];

    cards.sort((a, b) => {
      const nameA = a.querySelector('.product-card__name').textContent.trim();
      const nameB = b.querySelector('.product-card__name').textContent.trim();
      const priceA = parseInt(a.querySelector('.product-card__price').textContent.replace(/[^\d]/g, ''), 10);
      const priceB = parseInt(b.querySelector('.product-card__price').textContent.replace(/[^\d]/g, ''), 10);

      if (type === 'price-asc') return priceA - priceB;
      if (type === 'price-desc') return priceB - priceA;
      if (type === 'name') return nameA.localeCompare(nameB, 'uk');
      return 0; // rating — original order
    });

    // Зберігаємо оригінальний порядок для скидання
    if (type === 'rating') {
      grid._originalOrder = grid._originalOrder || cards.map(c => c.cloneNode(true));
    }

    cards.forEach(card => grid.appendChild(card));
    initBuyButtons(); // Переприкріплюємо обробники
  }
}


/* ---------- 5. СТИЛІ ДЛЯ JS-КОМПОНЕНТІВ (ін'єкція) ---------- */
(function injectStyles() {
  const css = `
    /* Бейдж кошика */
    .cart-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      min-width: 17px;
      height: 17px;
      background: #fff;
      color: var(--orange);
      font-size: 10px;
      font-weight: 700;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 3px;
    }

    /* Toast */
    #bs-toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      background: var(--brown);
      color: #fff;
      font-size: 13px;
      padding: 10px 20px;
      border-radius: 8px;
      opacity: 0;
      transition: opacity 0.25s, transform 0.25s;
      pointer-events: none;
      z-index: 9999;
      white-space: nowrap;
    }
    #bs-toast.show {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }

    /* Модальне вікно кошика */
    #cart-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.45);
      z-index: 1000;
      align-items: flex-start;
      justify-content: flex-end;
    }
    #cart-overlay.open { display: flex; }
    .cart-modal {
      background: #fff;
      width: 340px;
      max-width: 100vw;
      height: 100vh;
      display: flex;
      flex-direction: column;
      box-shadow: -4px 0 20px rgba(0,0,0,0.15);
    }
    .cart-modal__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      border-bottom: 1px solid var(--border);
      background: var(--orange);
      color: #fff;
    }
    .cart-modal__header h2 {
      font-family: 'Oswald', sans-serif;
      font-size: 18px;
    }
    .cart-modal__close {
      background: none;
      border: none;
      color: #fff;
      font-size: 18px;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 4px;
      transition: background 0.15s;
    }
    .cart-modal__close:hover { background: rgba(255,255,255,0.2); }
    .cart-modal__body {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
    }
    .cart-empty {
      text-align: center;
      color: var(--muted);
      margin-top: 40px;
      font-size: 14px;
    }
    .cart-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 0;
      border-bottom: 1px solid var(--border);
    }
    .cart-item__name { flex: 1; font-size: 13px; font-weight: 600; }
    .cart-item__controls {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .cart-qty-btn {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 1px solid var(--border) !important;
      background: #f5f5f5 !important;
      font-size: 14px;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.15s;
    }
    .cart-qty-btn:hover { background: var(--orange) !important; color: #fff; border-color: var(--orange) !important; }
    .cart-item__qty { font-size: 13px; font-weight: 700; min-width: 20px; text-align: center; }
    .cart-item__price { font-size: 13px; font-weight: 700; min-width: 44px; text-align: right; }
    .cart-item__remove {
      color: #aaa;
      font-size: 12px;
      padding: 2px 5px;
      border-radius: 4px;
      transition: color 0.15s, background 0.15s;
    }
    .cart-item__remove:hover { color: #c00; background: #ffeaea; }
    .cart-modal__footer {
      padding: 14px 16px;
      border-top: 1px solid var(--border);
    }
    .cart-total {
      font-size: 15px;
      margin-bottom: 10px;
    }
    .cart-checkout {
      width: 100%;
      font-size: 14px;
      padding: 10px;
    }

    /* Фільтр */
    #filter-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.45);
      z-index: 1000;
      align-items: flex-start;
      justify-content: flex-start;
    }
    #filter-overlay.open { display: flex; }
    #filter-panel {
      background: #fff;
      width: 260px;
      max-width: 100vw;
      height: 100vh;
      padding: 0;
      display: flex;
      flex-direction: column;
      box-shadow: 4px 0 20px rgba(0,0,0,0.15);
    }
    .filter-panel__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      border-bottom: 1px solid var(--border);
      background: var(--orange);
      color: #fff;
    }
    .filter-panel__header h3 {
      font-family: 'Oswald', sans-serif;
      font-size: 16px;
    }
    .filter-panel__close {
      background: none;
      border: none;
      color: #fff;
      font-size: 18px;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 4px;
      transition: background 0.15s;
    }
    .filter-panel__close:hover { background: rgba(255,255,255,0.2); }
    .filter-panel__section {
      padding: 14px 16px;
      border-bottom: 1px solid var(--border);
    }
    .filter-panel__label {
      font-family: 'Oswald', sans-serif;
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: .5px;
      color: var(--muted);
      margin-bottom: 8px;
    }
    .filter-check {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      padding: 4px 0;
      cursor: pointer;
    }
    .filter-check input { accent-color: var(--orange); cursor: pointer; }
    .filter-apply, .filter-reset {
      display: block;
      width: calc(100% - 32px);
      margin: 0 16px;
    }
    .filter-reset {
      background: none;
      border: 1px solid var(--border);
      color: var(--muted);
      font-size: 12px;
      padding: 7px;
      border-radius: 5px;
      transition: background 0.15s;
    }
    .filter-reset:hover { background: #f5f5f5; }

    /* Кастомний sort dropdown */
    .sort-wrapper { position: relative; }
    .sort-dropdown {
      display: none;
      position: absolute;
      top: calc(100% + 4px);
      right: 0;
      background: #fff;
      border: 1px solid var(--border);
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      z-index: 200;
      min-width: 160px;
      list-style: none;
      padding: 4px 0;
    }
    .sort-dropdown.open { display: block; }
    .sort-option {
      padding: 8px 14px;
      font-size: 12.5px;
      cursor: pointer;
      transition: background 0.12s;
    }
    .sort-option:hover { background: #f5f0ea; }
    .sort-option.selected { color: var(--orange); font-weight: 700; }
  `;

  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
})();


/* ---------- ІНІЦІАЛІЗАЦІЯ ---------- */
document.addEventListener('DOMContentLoaded', () => {
  createCartModal();
  initCartIcon();
  initBuyButtons();
  updateBadge();
  initFilter();
  initSort();
});
