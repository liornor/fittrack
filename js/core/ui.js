(function (FT) {
  'use strict';

  const svg = paths => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

  const icons = {
    back: svg('<path d="M15 18l-6-6 6-6"/>'),
    settings: svg('<path d="M4 6h10M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/><path d="M18 6h2"/>'),
    dumbbell: svg('<path d="M6 7v10M18 7v10M3 9.5v5M21 9.5v5M6 12h12"/>'),
    plus: svg('<path d="M12 5v14M5 12h14"/>'),
    check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
    x: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
    trash: svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
    copy: svg('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4V4h11v1"/>'),
    download: svg('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>'),
    upload: svg('<path d="M12 16V5M7 10l5-5 5 5M5 20h14"/>')
  };

  function icon(name) {
    const span = document.createElement('span');
    span.className = 'icon';
    span.innerHTML = icons[name];
    return span;
  }

  // Tiny element builder: h('button', { class: 'btn', onclick: fn }, 'Save').
  // Children may be strings, nodes, arrays, or null/false (skipped).
  // Text always goes in as text, never as HTML.
  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs || {})) {
      if (value == null || value === false) continue;
      if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2), value);
      else if (key === 'class') el.className = value;
      else if (key === 'dataset') Object.assign(el.dataset, value);
      else if (key === 'value' || key === 'checked') el[key] = value;
      else el.setAttribute(key, value === true ? '' : value);
    }
    const append = child => {
      if (child == null || child === false) return;
      if (Array.isArray(child)) child.forEach(append);
      else el.append(child instanceof Node ? child : String(child));
    };
    children.forEach(append);
    return el;
  }

  function setHeader({ title, back }) {
    document.getElementById('header-title').textContent = title;
    document.title = title === 'FitTrack' ? title : `${title} · FitTrack`;
    const backButton = document.getElementById('header-back');
    backButton.hidden = !back;
    backButton.dataset.fallback = back || '';
  }

  let toastTimer = null;
  function toast(message, type) {
    const el = document.getElementById('toast');
    el.textContent = message;
    el.className = 'toast' + (type === 'error' ? ' toast-error' : '');
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, type === 'error' ? 6000 : 2500);
  }

  // Promise<boolean>. Uses <dialog> so it works the same on every phone.
  function confirm(message, { okLabel = 'OK', danger = false } = {}) {
    return new Promise(resolve => {
      const close = result => {
        dialog.close();
        dialog.remove();
        resolve(result);
      };
      const dialog = h('dialog', { class: 'dialog' },
        h('p', null, message),
        h('div', { class: 'dialog-actions' },
          h('button', { class: 'btn', type: 'button', onclick: () => close(false) }, 'Cancel'),
          h('button', { class: 'btn ' + (danger ? 'btn-danger-solid' : 'btn-primary'), type: 'button', onclick: () => close(true) }, okLabel)));
      dialog.addEventListener('cancel', event => { event.preventDefault(); close(false); });
      document.body.append(dialog);
      dialog.showModal();
    });
  }

  function download(filename, text, type = 'application/json') {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const link = h('a', { href: url, download: filename, hidden: true });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  FT.ui = { icons, icon, h, setHeader, toast, confirm, download };
})(window.FitTrack = window.FitTrack || {});
