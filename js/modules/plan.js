// Plan: the whole week at a glance, any day's details, the 4-week progression and notes.
// Stores nothing of its own; the plan start date lives in settings (planStart).
(function (FT) {
  'use strict';

  const { h } = FT.ui;
  const plan = FT.plan;
  const view = FT.planView;

  FT.registry.register({
    id: 'plan',
    label: 'Plan',
    icon: 'list',
    storesData: false,
    render(container, parts) {
      if (parts[0] === 'day' && plan.DAYS[parts[1]]) return renderDay(container, parts[1]);
      return renderWeek(container);
    }
  });

  function currentWeek(date) {
    const info = plan.weekInfo(FT.storage.getSettings().planStart, date);
    return info && !info.upcoming ? info : null;
  }

  function renderDay(container, key) {
    const day = plan.DAYS[key];
    FT.ui.setHeader({ title: plan.DAY_NAMES[key], back: 'plan' });
    container.replaceChildren(h('div', { class: 'stack' },
      h('section', { class: 'card' },
        h('h2', { class: 'today-title' }, day.focus),
        h('div', { class: 'chip-row' }, view.chip(day.type), day.exercises.length > 0 && view.chip(day.targets))),
      view.dayDetails(key, currentWeek(FT.dates.today()))));
  }

  function dayRow(key, todayKey) {
    const day = plan.DAYS[key];
    const isToday = key === todayKey;
    return h('li', null,
      h('a', { class: 'card day-row' + (isToday ? ' is-today' : ''), href: '#/plan/day/' + key, 'aria-current': isToday ? 'date' : null },
        h('span', { class: 'day-row-name' }, plan.DAY_NAMES[key]),
        h('span', { class: 'day-row-focus' }, day.focus),
        h('span', { class: 'muted small' }, day.type)));
  }

  function section(title, ...body) {
    return h('details', { class: 'card fold' }, h('summary', null, title), h('div', { class: 'stack-sm fold-body' }, body));
  }

  function startDateField(today) {
    const start = FT.storage.getSettings().planStart;
    return h('div', { class: 'card stack-sm' },
      h('label', { class: 'field' },
        h('span', { class: 'field-label' }, 'Week 1 starts'),
        h('input', {
          class: 'input', type: 'date', value: start || '',
          onchange: e => { if (FT.dates.isValid(e.target.value)) view.setPlanStart(e.target.value); }
        })),
      h('p', { class: 'muted small' }, start
        ? `Weeks run Monday to Sunday, so week 1 started ${FT.dates.format(start)}. Pick any date to change it.`
        : 'Pick any date in the week you started. Weeks run Monday to Sunday.'),
      start && h('button', { class: 'btn btn-block', type: 'button', onclick: () => view.setPlanStart(null) }, 'Clear start date'));
  }

  function renderWeek(container) {
    const draw = () => {
      const today = FT.dates.today();
      const todayKey = plan.dayKey(today);
      container.replaceChildren(h('div', { class: 'stack' },
        view.weekCard(today),
        h('section', null,
          h('h2', { class: 'list-heading' }, 'Your week'),
          h('ul', { class: 'card-list' }, plan.DAY_KEYS.map(key => dayRow(key, todayKey)))),
        section('How to use the plan', h('ul', { class: 'plain-list' }, plan.GUIDELINES.map(text => h('li', null, text)))),
        section('Progression and deload',
          h('p', { class: 'small' }, plan.PROGRESSION),
          h('ul', { class: 'plain-list' }, plan.WEEKS.map(w => h('li', null, h('strong', null, `Week ${w.n}, ${w.focus}: `), w.todo))),
          h('p', { class: 'small' }, plan.TEST_WEEK)),
        section('Equipment and safety',
          h('p', { class: 'small' }, h('strong', null, 'Equipment: '), plan.NOTES.equipment),
          h('p', { class: 'small' }, h('strong', null, 'Back off if:')),
          h('ul', { class: 'plain-list' }, plan.NOTES.backOff.map(text => h('li', null, text))),
          h('p', { class: 'small' }, h('strong', null, 'Handstand tips: '), plan.NOTES.handstand)),
        startDateField(today)));
    };
    draw();
    return FT.storage.subscribe(draw);
  }
})(window.FitTrack = window.FitTrack || {});
