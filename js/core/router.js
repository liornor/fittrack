// Hash routes: #/<moduleId>/<part>/<part>, e.g. #/workouts/edit/abc123.
// Hash routing keeps refresh and the phone's back button working on any static host.
(function (FT) {
  'use strict';

  let navigations = 0; // hash changes since page load; > 0 means "back" stays in the app

  function current() {
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
    return { moduleId: parts[0] || null, parts: parts.slice(1) };
  }

  function start(onRoute) {
    window.addEventListener('hashchange', () => {
      navigations += 1;
      onRoute(current());
    });
    onRoute(current());
  }

  function go(path) { location.hash = '#/' + path; }

  // Change the URL without a new history entry and without re-rendering.
  function replace(path) { history.replaceState(null, '', '#/' + path); }

  function back(fallbackPath) {
    if (navigations > 0) history.back();
    else go(fallbackPath);
  }

  FT.router = { start, go, replace, back, current };
})(window.FitTrack = window.FitTrack || {});
