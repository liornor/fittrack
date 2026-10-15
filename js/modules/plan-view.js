// Pieces of the plan screens shared by the Today and Plan tabs. Registers no module of its own.
(function (FT) {
  'use strict';

  const { h } = FT.ui;
  const plan = FT.plan;

  function chip(text, tone) { return h('span', { class: 'chip' + (tone ? ' chip-' + tone : '') }, text); }

  function longDate(dateString) {
    return FT.dates.parse(dateString).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  }

  // Weeks always start on Monday, so any date picked is moved back to its Monday.
  function setPlanStart(dateString) {
    try {
      FT.storage.updateSettings({ planStart: dateString ? plan.mondayOf(dateString) : null });
      return true;
    } catch (err) {
      FT.ui.toast(err.message, 'error');
      return false;
    }
  }

  // Which week of the 4-week cycle it is, or a prompt to set the start date.
  function weekCard(date) {
    const info = plan.weekInfo(FT.storage.getSettings().planStart, date);
    if (!info) {
      return h('section', { class: 'card week-card' },
        h('h2', null, 'Track your 4-week cycle'),
        h('p', { class: 'muted small' }, 'Set when week 1 started and the app will show what to focus on each week, including the lighter week 4.'),
        h('button', { class: 'btn btn-primary', type: 'button', onclick: () => setPlanStart(date) }, 'Week 1 starts this week'));
    }
    if (info.upcoming) {
      return h('section', { class: 'card week-card' },
        h('h2', null, `Plan starts in ${info.daysUntil} ${info.daysUntil === 1 ? 'day' : 'days'}`),
        h('p', { class: 'muted small' }, 'Until then the schedule below is the normal week.'));
    }
    return h('section', { class: 'card week-card' + (info.deload ? ' is-deload' : '') },
      h('div', { class: 'week-card-top' },
        h('h2', null, `Week ${info.n} of ${plan.CYCLE_WEEKS} · ${info.focus}`),
        info.block > 1 && chip(`Round ${info.block}`)),
      h('p', { class: 'small' }, info.todo));
  }

  function exerciseItem(ex, week) {
    return h('li', null,
      h('details', { class: 'ex-item' },
        h('summary', null,
          h('span', { class: 'ex-name' }, ex.name),
          h('span', { class: 'ex-target' }, plan.targetText(ex, week))),
        h('p', { class: 'ex-how' }, ex.how)));
  }

  function warmupItem(w) {
    return h('li', null,
      h('details', { class: 'ex-item' },
        h('summary', null,
          h('span', { class: 'ex-name' }, w.name),
          h('span', { class: 'ex-target' }, w.time)),
        h('div', { class: 'stack-sm' },
          w.why && h('p', { class: 'ex-how' }, w.why),
          w.steps.map(step => h('div', null,
            h('p', { class: 'ex-step' }, `${step.name}: ${step.target}`),
            h('p', { class: 'ex-how' }, step.how))))));
  }

  // Warm-up and exercises for a day. `week` is a weekInfo result, or null.
  function dayDetails(key, week) {
    const day = plan.DAYS[key];
    const warmups = plan.warmupsFor(key);
    return h('div', { class: 'stack' },
      h('p', { class: 'muted' }, day.intro),
      warmups.length > 0 && h('section', null,
        h('h2', { class: 'list-heading' }, 'Warm-up'),
        h('ul', { class: 'ex-list' }, warmups.map(warmupItem))),
      day.exercises.length > 0 && h('section', null,
        h('h2', { class: 'list-heading' }, 'Main work'),
        h('ul', { class: 'ex-list' }, day.exercises.map(ex => exerciseItem(ex, week)))));
  }

  FT.planView = { chip, longDate, setPlanStart, weekCard, dayDetails };
})(window.FitTrack = window.FitTrack || {});
