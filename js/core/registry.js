// Modules register themselves here; the tab bar and router are built from this list.
//
// A module is:
//   {
//     id: 'workouts',        // route (#/workouts) and storage section name
//     label: 'Workouts',     // tab and header text
//     icon: 'dumbbell',      // name from FT.ui.icons
//     tab: true,             // false = reachable by URL only (e.g. settings)
//     storesData: true,      // false = gets no storage section (e.g. dashboard)
//     render(container, routeParts) { ...; return optionalCleanupFn; }
//   }
(function (FT) {
  'use strict';

  const modules = [];

  function register(mod) {
    if (modules.some(m => m.id === mod.id)) throw new Error(`Module "${mod.id}" is registered twice`);
    modules.push(mod);
    if (mod.storesData !== false) FT.storage.defineModule(mod.id);
  }

  function get(id) { return modules.find(m => m.id === id) || null; }
  function tabs() { return modules.filter(m => m.tab !== false); }
  function defaultId() { return tabs()[0].id; }

  FT.registry = { register, get, tabs, defaultId };
})(window.FitTrack = window.FitTrack || {});
