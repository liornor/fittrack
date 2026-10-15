// Today: what the plan says for today, with one tap to start logging it.
// Stores nothing of its own; the plan lives in FT.plan and logged sessions in "workouts".
(function (FT) {
  'use strict';

  const { h, icon } = FT.ui;
  const plan = FT.plan;
  const view = FT.planView;

  FT.registry.register({
    id: 'today',
    label: 'Today',
    icon: 'today',
    storesData: false,
    render(container) {
      let shown = null;
      const draw = () => {
        shown = FT.dates.today();
        container.replaceChildren(build(shown));
      };
      // A phone left open overnight should flip to the new day when you look at it again.
      const onVisible = () => {
        if (document.visibilityState === 'visible' && FT.dates.today() !== shown) draw();
      };
      document.addEventListener('visibilitychange', onVisible);
      const unsubscribe = FT.storage.subscribe(draw);
      draw();
      return function cleanup() {
        document.removeEventListener('visibilitychange', onVisible);
        unsubscribe();
      };
    }
  });

  function currentWeek(date) {
    const info = plan.weekInfo(FT.storage.getSettings().planStart, date);
    return info && !info.upcoming ? info : null;
  }

  // A session already started from today's plan, so "Start" never makes a duplicate.
  function loggedToday(date, day) {
    const entry = FT.storage.list('workouts', { from: date, to: date }).find(e => e.title === day.focus);
    if (!entry) return null;
    const sets = (Array.isArray(entry.exercises) ? entry.exercises : []).flatMap(ex => (ex && Array.isArray(ex.sets) ? ex.sets : []));
    return { id: entry.id, done: sets.filter(s => s && s.done).length, total: sets.length };
  }

  function startWorkout(date, key, week) {
    try {
      const created = FT.storage.add('workouts', plan.toWorkout(key, date, week));
      FT.router.go('workouts/edit/' + encodeURIComponent(created.id));
    } catch (err) {
      FT.ui.toast(err.message, 'error');
    }
  }

  function build(date) {
    const key = plan.dayKey(date);
    const day = plan.DAYS[key];
    const week = currentWeek(date);
    const isRest = day.exercises.length === 0;
    const logged = isRest ? null : loggedToday(date, day);
    const tomorrowKey = plan.dayKey(plan.addDays(date, 1));
    const tomorrow = plan.DAYS[tomorrowKey];

    return h('div', { class: 'stack' },
      h('section', { class: 'card today-hero' },
        h('p', { class: 'muted small' }, view.longDate(date)),
        h('h2', { class: 'today-title' }, isRest ? 'Rest day' : day.focus),
        h('div', { class: 'chip-row' }, view.chip(day.type, isRest ? 'success' : null), !isRest && view.chip(day.targets)),
        isRest && h('p', { class: 'muted' }, day.targets)),
      view.weekCard(date),
      view.dayDetails(key, week),
      h('p', { class: 'muted small' },
        `Tomorrow: ${tomorrow.exercises.length === 0 ? 'rest' : tomorrow.focus}. `,
        h('a', { href: '#/plan' }, 'See the full week')),
      !isRest && h('div', { class: 'sticky-action' }, logged
        ? h('a', { class: 'btn btn-primary btn-lg', href: '#/workouts/edit/' + encodeURIComponent(logged.id) },
          icon('check'), `Continue workout · ${logged.done}/${logged.total} sets`)
        : h('button', { class: 'btn btn-primary btn-lg', type: 'button', onclick: () => startWorkout(date, key, week) },
          icon('plus'), 'Start workout')));
  }
})(window.FitTrack = window.FitTrack || {});
