// Today: what the plan says for today, with a tick next to each exercise as you finish it.
// Ticks are saved per day (entry { date, done: [exercise names] }); the plan itself lives in FT.plan.
(function (FT) {
  'use strict';

  const { h } = FT.ui;
  const plan = FT.plan;
  const view = FT.planView;
  const MODULE = 'today';

  FT.registry.register({
    id: MODULE,
    label: 'Today',
    icon: 'today',
    render(container) {
      let shown = null;
      const draw = () => {
        shown = FT.dates.today();
        container.replaceChildren(build(shown, draw));
      };
      // A phone left open overnight should flip to the new day when you look at it again.
      const onVisible = () => {
        if (document.visibilityState === 'visible' && FT.dates.today() !== shown) draw();
      };
      document.addEventListener('visibilitychange', onVisible);
      draw();
      return () => document.removeEventListener('visibilitychange', onVisible);
    }
  });

  // ---------- Saved ticks ----------

  function entryFor(date) { return FT.storage.list(MODULE, { from: date, to: date })[0] || null; }

  function savedDone(date) {
    const entry = entryFor(date);
    return new Set(entry && Array.isArray(entry.done) ? entry.done.filter(n => typeof n === 'string') : []);
  }

  function saveDone(date, done) {
    const entry = entryFor(date);
    if (done.size === 0) {
      if (entry) FT.storage.remove(MODULE, entry.id);
    } else if (entry) {
      FT.storage.update(MODULE, entry.id, { done: [...done] });
    } else {
      FT.storage.add(MODULE, { date, done: [...done] });
    }
  }

  // ---------- Screen ----------

  function currentWeek(date) {
    const info = plan.weekInfo(FT.storage.getSettings().planStart, date);
    return info && !info.upcoming ? info : null;
  }

  function build(date, redraw) {
    const key = plan.dayKey(date);
    const day = plan.DAYS[key];
    const week = currentWeek(date);
    const isRest = day.exercises.length === 0;
    const total = day.exercises.length;
    const done = savedDone(date);
    const tomorrow = plan.DAYS[plan.dayKey(plan.addDays(date, 1))];

    const progressFill = h('div', { class: 'progress-fill' });
    const progressText = h('p', { class: 'hero-progress' });
    const hero = h('section', { class: 'hero' + (isRest ? ' is-rest' : '') },
      h('p', { class: 'hero-date' }, view.longDate(date)),
      h('h2', { class: 'hero-title' }, isRest ? 'Rest day' : day.focus),
      h('div', { class: 'chip-row' }, view.chip(day.type), view.chip(day.targets)),
      !isRest && h('div', { class: 'progress', 'aria-hidden': 'true' }, progressFill),
      !isRest && progressText);

    const tracker = isRest ? null : {
      done,
      toggle(name) {
        const next = new Set(done);
        if (!next.delete(name)) next.add(name);
        try {
          saveDone(date, next);
        } catch (err) {
          FT.ui.toast(err.message, 'error');
          return;
        }
        done.clear();
        next.forEach(n => done.add(n));
        paint();
        if (done.has(name) && navigator.vibrate) navigator.vibrate(12);
      }
    };

    const root = h('div', { class: 'stack' },
      hero,
      view.weekCard(date, redraw),
      view.dayDetails(key, week, tracker),
      h('p', { class: 'muted small' },
        `Tomorrow: ${tomorrow.exercises.length === 0 ? 'rest' : tomorrow.focus}. `,
        h('a', { href: '#/plan' }, 'See the full week')));

    // Updates ticks and progress in place, so open exercise notes stay open.
    function paint() {
      let count = 0;
      for (const row of root.querySelectorAll('.ex-row')) {
        const isDone = done.has(row.dataset.exercise);
        if (isDone) count += 1;
        row.classList.toggle('is-done', isDone);
        row.querySelector('.tick').setAttribute('aria-pressed', String(isDone));
      }
      if (isRest) return;
      const complete = count === total;
      hero.classList.toggle('is-complete', complete);
      progressFill.style.width = `${(count / total) * 100}%`;
      progressText.textContent = complete ? 'Workout complete. Nice work.' : `${count} of ${total} done`;
    }
    paint();
    return root;
  }
})(window.FitTrack = window.FitTrack || {});
