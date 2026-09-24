// Starts the app: storage, header, tab bar, routing.
(function (FT) {
  'use strict';

  const { h, icon } = FT.ui;
  const BACKUP_REMINDER_DAYS = 7;
  const main = document.getElementById('main');
  let cleanup = null;

  function buildChrome() {
    const back = document.getElementById('header-back');
    back.append(icon('back'));
    back.addEventListener('click', () => FT.router.back(back.dataset.fallback));
    document.getElementById('header-settings').append(icon('settings'));

    document.getElementById('bottom-nav').replaceChildren(...FT.registry.tabs().map(mod =>
      h('a', { href: '#/' + mod.id, dataset: { module: mod.id } }, icon(mod.icon), h('span', null, mod.label))));
  }

  function totalEntries() {
    return Object.values(FT.storage.counts()).reduce((a, b) => a + b, 0);
  }

  function banners() {
    const result = [];
    if (FT.storage.getCorruptData() !== null) {
      result.push(h('a', { class: 'banner banner-danger', href: '#/settings' },
        'Some saved data could not be read. ', h('strong', null, 'Open settings')));
    }
    if (totalEntries() > 0) {
      const last = FT.storage.getMeta().lastExportAt;
      const days = last ? FT.dates.daysBetween(FT.dates.toLocalDate(new Date(last)), FT.dates.today()) : null;
      if (days === null || days >= BACKUP_REMINDER_DAYS) {
        result.push(h('a', { class: 'banner banner-warning', href: '#/settings' },
          days === null ? 'You haven’t backed up yet. ' : `Last backup was ${days} days ago. `,
          h('strong', null, 'Back up now')));
      }
    }
    return result;
  }

  function render(route) {
    const mod = FT.registry.get(route.moduleId);
    if (!mod) {
      FT.router.replace(FT.registry.defaultId());
      render(FT.router.current());
      return;
    }

    if (cleanup) {
      const previous = cleanup;
      cleanup = null;
      try { previous(); } catch (err) { console.error(err); }
    }

    FT.ui.setHeader({ title: mod.label, back: null });
    document.getElementById('header-settings').hidden = mod.id === 'settings';
    for (const link of document.querySelectorAll('#bottom-nav a')) {
      if (link.dataset.module === mod.id) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }

    // Reminders only on top-level pages, never mid-workout.
    const view = h('div');
    main.replaceChildren(...(route.parts.length === 0 && mod.id !== 'settings' ? banners() : []), view);
    window.scrollTo(0, 0);

    try {
      cleanup = mod.render(view, route.parts) || null;
    } catch (err) {
      console.error(err);
      view.replaceChildren(h('p', { class: 'banner banner-danger' }, 'Something went wrong: ' + err.message));
    }
  }

  function start() {
    try {
      FT.storage.init();
    } catch (err) {
      main.replaceChildren(h('p', { class: 'banner banner-danger' },
        `FitTrack could not open its storage (${err.message}). Your saved data has not been changed.`));
      return;
    }
    buildChrome();
    // Ask the browser not to auto-clear our data, once there's something worth keeping.
    if (totalEntries() > 0) FT.storage.persistence(true);
    FT.router.start(render);
  }

  start();
})(window.FitTrack = window.FitTrack || {});
