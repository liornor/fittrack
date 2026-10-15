// Starts the app: storage, header, tab bar, routing.
(function (FT) {
  'use strict';

  const { h, icon } = FT.ui;
  const main = document.getElementById('main');
  let cleanup = null;

  function buildChrome() {
    const back = document.getElementById('header-back');
    back.append(icon('back'));
    back.addEventListener('click', () => FT.router.back(back.dataset.fallback));

    document.getElementById('bottom-nav').replaceChildren(...FT.registry.tabs().map(mod =>
      h('a', { href: '#/' + mod.id, dataset: { module: mod.id } }, icon(mod.icon), h('span', null, mod.label))));
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
    for (const link of document.querySelectorAll('#bottom-nav a')) {
      if (link.dataset.module === mod.id) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }

    const view = h('div');
    main.replaceChildren(view);
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
    // Ticks and the plan start date are small; ask the browser not to clear them.
    FT.storage.persistence(true);
    FT.router.start(render);
  }

  start();
})(window.FitTrack = window.FitTrack || {});
