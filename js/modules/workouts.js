// Workout log. One entry per session:
//   { id, date, createdAt, updatedAt, title, notes,
//     exercises: [{ name, sets: [{ reps, weight, done }] }] }
// weight is in the unit from settings; null weight means bodyweight.
(function (FT) {
  'use strict';

  const { h, icon } = FT.ui;
  const MODULE = 'workouts';
  const SAVE_DELAY_MS = 400;

  FT.registry.register({
    id: MODULE,
    label: 'Workouts',
    icon: 'dumbbell',
    render(container, parts) {
      if (parts[0] === 'new') return renderEditor(container, null);
      if (parts[0] === 'edit' && parts[1]) return renderEditor(container, parts[1]);
      return renderList(container);
    }
  });

  // ---------- Helpers ----------

  function weightUnit() { return FT.storage.getSettings().weightUnit; }

  // Accepts "80", "80.5" and "80,5" (many phone keyboards only offer a comma).
  function parseNumber(text) {
    const s = String(text).trim().replace(',', '.');
    if (s === '') return null;
    const n = Number(s);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }

  function emptySet() { return { reps: null, weight: null, done: false }; }
  function hasValues(set) { return set.reps != null || set.weight != null; }
  function plural(n, word) { return `${n} ${word}${n === 1 ? '' : 's'}`; }

  function blankWorkout() { return { date: FT.dates.today(), title: '', notes: '', exercises: [] }; }

  // Entries can come from an imported file, so don't trust their shape.
  function normalize(entry) {
    const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : null);
    return {
      date: entry.date,
      title: typeof entry.title === 'string' ? entry.title : '',
      notes: typeof entry.notes === 'string' ? entry.notes : '',
      exercises: (Array.isArray(entry.exercises) ? entry.exercises : []).filter(Boolean).map(ex => ({
        name: typeof ex.name === 'string' ? ex.name : '',
        sets: (Array.isArray(ex.sets) ? ex.sets : []).filter(Boolean).map(s => ({
          reps: num(s.reps),
          weight: num(s.weight),
          done: Boolean(s.done)
        }))
      }))
    };
  }

  function toStored(workout) {
    return {
      date: workout.date,
      title: workout.title.trim(),
      notes: workout.notes.trim(),
      exercises: workout.exercises.map(ex => ({ name: ex.name.trim(), sets: ex.sets.map(s => ({ ...s })) }))
    };
  }

  function namedExercises(workout) { return workout.exercises.filter(ex => ex.name.trim()); }

  function isEmpty(workout) {
    return !workout.title.trim() && !workout.notes.trim() &&
      !workout.exercises.some(ex => ex.name.trim() || ex.sets.some(hasValues));
  }

  // "3 × 8 @ 80 kg", "8 @ 80, 6 @ 75 kg", or "3 × 12" for bodyweight.
  function describeSets(sets) {
    const filled = sets.filter(hasValues);
    if (!filled.length) return '';
    const unit = filled.some(s => s.weight != null) ? ' ' + weightUnit() : '';
    const one = s => (s.reps ?? '–') + (s.weight != null ? ' @ ' + s.weight : '');
    const allSame = filled.every(s => s.reps === filled[0].reps && s.weight === filled[0].weight);
    return (allSame ? `${filled.length} × ${one(filled[0])}` : filled.map(one).join(', ')) + unit;
  }

  // ---------- List ----------

  function renderList(container) {
    const draw = () => {
      const workouts = FT.storage.list(MODULE);
      const groups = [];
      for (const entry of workouts) {
        const month = entry.date.slice(0, 7);
        if (!groups.length || groups[groups.length - 1].month !== month) groups.push({ month, entries: [] });
        groups[groups.length - 1].entries.push(entry);
      }
      container.replaceChildren(
        workouts.length
          ? h('div', null, groups.map(g => [
            h('h2', { class: 'list-heading' }, FT.dates.monthLabel(g.entries[0].date)),
            h('ul', { class: 'card-list' }, g.entries.map(workoutCard))
          ]))
          : h('div', { class: 'empty-state' },
            h('strong', null, 'No workouts yet'),
            'Tap “New workout” to log your first session.'),
        h('div', { class: 'sticky-action' },
          h('a', { class: 'btn btn-primary btn-lg', href: '#/workouts/new' }, icon('plus'), 'New workout'))
      );
    };
    draw();
    return FT.storage.subscribe(draw);
  }

  function workoutCard(entry) {
    const workout = normalize(entry);
    const names = namedExercises(workout).map(ex => ex.name);
    const setCount = workout.exercises.reduce((n, ex) => n + ex.sets.filter(s => hasValues(s) || s.done).length, 0);
    return h('li', null,
      h('a', { class: 'card workout-card', href: '#/workouts/edit/' + encodeURIComponent(entry.id) },
        h('div', { class: 'workout-card-top' },
          h('span', { class: 'workout-card-title' }, workout.title || 'Workout'),
          h('span', { class: 'muted small' }, FT.dates.relative(workout.date))),
        h('div', { class: 'muted small' }, `${plural(names.length, 'exercise')} · ${plural(setCount, 'set')}`),
        names.length > 0 && h('div', { class: 'workout-card-names' }, names.join(', '))));
  }

  // ---------- Editor ----------

  function renderEditor(container, id) {
    let entryId = id;
    let workout;
    if (id) {
      const stored = FT.storage.get(MODULE, id);
      if (!stored) {
        container.append(h('div', { class: 'empty-state' },
          h('strong', null, 'Workout not found'),
          h('a', { href: '#/workouts' }, 'Back to workouts')));
        return null;
      }
      workout = normalize(stored);
    } else {
      workout = blankWorkout();
    }

    FT.ui.setHeader({ title: id ? 'Edit workout' : 'New workout', back: 'workouts' });

    // Past sessions, newest first, for "last time" hints and name suggestions.
    const history = FT.storage.list(MODULE).filter(e => e.id !== id).map(e => ({ date: e.date, ...normalize(e) }));
    const knownNames = [...new Map(history.flatMap(w => namedExercises(w))
      .map(ex => [ex.name.trim().toLowerCase(), ex.name.trim()])).values()];

    const statusEl = h('span', { class: 'save-status', 'aria-live': 'polite' });
    let saveTimer = null;
    let leaving = false;

    // ----- Saving -----

    function saveNow() {
      clearTimeout(saveTimer);
      saveTimer = null;
      try {
        if (entryId) {
          FT.storage.update(MODULE, entryId, toStored(workout));
        } else if (!isEmpty(workout)) {
          // A new workout is only created once it has content.
          entryId = FT.storage.add(MODULE, toStored(workout)).id;
          if (!leaving) FT.router.replace('workouts/edit/' + encodeURIComponent(entryId));
        } else {
          statusEl.textContent = '';
          return;
        }
        statusEl.textContent = 'Saved';
      } catch (err) {
        statusEl.textContent = 'Not saved';
        FT.ui.toast(err.message, 'error');
      }
    }

    // Typing: save shortly after the last keystroke.
    function scheduleSave() {
      clearTimeout(saveTimer);
      statusEl.textContent = 'Saving…';
      saveTimer = setTimeout(saveNow, SAVE_DELAY_MS);
    }

    // Adding/removing things via buttons: save now and rebuild the form.
    // Never call this from a `change` event: those fire while the user's tap is
    // moving focus to another field, and rebuilding would swallow that tap.
    function commitStructure() {
      saveNow();
      redraw();
    }

    // Save before the phone locks or the tab is switched away.
    const flushOnHide = () => { if (document.visibilityState === 'hidden' && saveTimer) saveNow(); };
    document.addEventListener('visibilitychange', flushOnHide);

    // ----- Data lookups -----

    function lastTime(name) {
      const key = name.trim().toLowerCase();
      if (!key) return null;
      for (const past of history) {
        if (past.date > workout.date) continue;
        const ex = past.exercises.find(e => e.name.trim().toLowerCase() === key && e.sets.some(hasValues));
        if (ex) return { date: past.date, sets: ex.sets };
      }
      return null;
    }

    // ----- Actions -----

    function hintText(last) {
      return last ? `Last time (${FT.dates.relative(last.date)}): ${describeSets(last.sets)}` : '';
    }

    // Updates this exercise's card in place (see commitStructure for why).
    function onNameCommitted(ex, index) {
      const card = container.querySelector(`[data-exercise="${index}"]`);
      const last = lastTime(ex.name);
      const hint = card.querySelector('.exercise-hint');
      hint.textContent = hintText(last);
      hint.hidden = !last;

      // Pre-fill from last time, but only if nothing has been entered yet.
      if (last && ex.sets.length > 0 && !ex.sets.some(s => hasValues(s) || s.done)) {
        const addSetButton = card.querySelector('.add-set');
        last.sets.filter(hasValues).forEach((previous, i) => {
          if (i < ex.sets.length) {
            // Mutate the existing set: its row's handlers point at this object.
            Object.assign(ex.sets[i], { reps: previous.reps, weight: previous.weight });
            card.querySelector(`[data-focus-key="ex${index}-s${i}-w"]`).value = previous.weight ?? '';
            card.querySelector(`[data-focus-key="ex${index}-s${i}-r"]`).value = previous.reps ?? '';
          } else {
            const set = { reps: previous.reps, weight: previous.weight, done: false };
            ex.sets.push(set);
            addSetButton.before(setRow(ex, set, index, i));
          }
        });
      }
      saveNow();
    }

    function addExercise() {
      workout.exercises.push({ name: '', sets: [emptySet()] });
      commitStructure();
      const input = container.querySelector(`[data-focus-key="ex${workout.exercises.length - 1}-name"]`);
      if (input) {
        input.focus();
        input.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }

    async function removeExercise(index) {
      const ex = workout.exercises[index];
      if (ex.sets.some(hasValues)) {
        const ok = await FT.ui.confirm(`Remove ${ex.name.trim() || 'this exercise'} and its sets?`, { okLabel: 'Remove', danger: true });
        if (!ok) return;
      }
      workout.exercises.splice(index, 1);
      commitStructure();
    }

    function addSet(ex) {
      const previous = ex.sets[ex.sets.length - 1];
      ex.sets.push(previous ? { reps: previous.reps, weight: previous.weight, done: false } : emptySet());
      commitStructure();
    }

    function repeatToday() {
      if (saveTimer) saveNow();
      const copy = toStored(workout);
      copy.date = FT.dates.today();
      copy.notes = '';
      copy.exercises.forEach(ex => ex.sets.forEach(s => { s.done = false; }));
      try {
        const created = FT.storage.add(MODULE, copy);
        FT.ui.toast('Copied to today');
        FT.router.go('workouts/edit/' + encodeURIComponent(created.id));
      } catch (err) {
        FT.ui.toast(err.message, 'error');
      }
    }

    async function deleteWorkout() {
      const ok = await FT.ui.confirm('Delete this workout? This cannot be undone.', { okLabel: 'Delete', danger: true });
      if (!ok) return;
      clearTimeout(saveTimer);
      saveTimer = null;
      try {
        if (entryId) FT.storage.remove(MODULE, entryId);
        entryId = null;
        FT.router.go('workouts');
      } catch (err) {
        FT.ui.toast(err.message, 'error');
      }
    }

    // ----- Rendering -----

    function numberInput(value, mode, label, focusKey, onValue) {
      return h('input', {
        class: 'input input-num',
        type: 'text', // type=number rejects "80,5" on some phones
        inputmode: mode,
        autocomplete: 'off',
        enterkeyhint: 'done',
        'aria-label': label,
        value: value == null ? '' : String(value),
        dataset: { focusKey },
        oninput: e => { onValue(parseNumber(e.target.value)); scheduleSave(); },
        onchange: e => { e.target.value = e.target.value.trim() === '' ? '' : (parseNumber(e.target.value) ?? ''); }
      });
    }

    function setRow(ex, set, exIndex, setIndex) {
      const n = setIndex + 1;
      return h('div', { class: 'set-row' + (set.done ? ' is-done' : '') },
        h('span', { class: 'set-index' }, String(n)),
        numberInput(set.weight, 'decimal', `Set ${n} weight`, `ex${exIndex}-s${setIndex}-w`, v => { set.weight = v; }),
        numberInput(set.reps, 'numeric', `Set ${n} reps`, `ex${exIndex}-s${setIndex}-r`, v => { set.reps = v == null ? null : Math.round(v); }),
        h('button', {
          class: 'done-toggle', type: 'button', 'aria-label': `Set ${n} done`, 'aria-pressed': String(set.done),
          onclick: () => { set.done = !set.done; commitStructure(); }
        }, icon('check')),
        h('button', {
          class: 'icon-btn icon-btn-muted', type: 'button', 'aria-label': `Remove set ${n}`,
          onclick: () => { ex.sets.splice(setIndex, 1); commitStructure(); }
        }, icon('x')));
    }

    function exerciseCard(ex, index, unit) {
      const last = lastTime(ex.name);
      return h('section', { class: 'card exercise', dataset: { exercise: String(index) } },
        h('div', { class: 'exercise-head' },
          h('input', {
            class: 'input exercise-name', type: 'text', value: ex.name, placeholder: 'Exercise name',
            list: 'exercise-names', autocomplete: 'off', autocapitalize: 'words', enterkeyhint: 'done',
            'aria-label': `Exercise ${index + 1} name`, dataset: { focusKey: `ex${index}-name` },
            oninput: e => { ex.name = e.target.value; scheduleSave(); },
            onchange: () => onNameCommitted(ex, index)
          }),
          h('button', { class: 'icon-btn icon-btn-muted', type: 'button', 'aria-label': 'Remove exercise', onclick: () => removeExercise(index) }, icon('trash'))),
        h('p', { class: 'exercise-hint', hidden: !last }, hintText(last)),
        ex.sets.length > 0 && h('div', { class: 'set-grid-head', 'aria-hidden': 'true' },
          h('span', null, 'Set'), h('span', null, unit), h('span', null, 'Reps'), h('span', null, 'Done'), h('span')),
        ex.sets.map((set, setIndex) => setRow(ex, set, index, setIndex)),
        h('button', { class: 'btn btn-block add-set', type: 'button', onclick: () => addSet(ex) }, icon('plus'), 'Add set'));
    }

    function build() {
      const unit = weightUnit();
      return h('div', { class: 'stack' },
        h('div', { class: 'row' },
          h('label', { class: 'field grow' },
            h('span', { class: 'field-label' }, 'Date'),
            h('input', {
              class: 'input', type: 'date', value: workout.date, required: true, dataset: { focusKey: 'date' },
              onchange: e => {
                if (FT.dates.isValid(e.target.value)) { workout.date = e.target.value; saveNow(); }
                else e.target.value = workout.date;
              }
            })),
          statusEl),
        h('label', { class: 'field' },
          h('span', { class: 'field-label' }, 'Title'),
          h('input', {
            class: 'input', type: 'text', value: workout.title, placeholder: 'e.g. Push day',
            autocomplete: 'off', enterkeyhint: 'done', dataset: { focusKey: 'title' },
            oninput: e => { workout.title = e.target.value; scheduleSave(); }
          })),
        workout.exercises.map((ex, i) => exerciseCard(ex, i, unit)),
        h('button', { class: 'btn btn-dashed btn-block btn-lg', type: 'button', onclick: addExercise }, icon('plus'), 'Add exercise'),
        h('label', { class: 'field' },
          h('span', { class: 'field-label' }, 'Notes'),
          h('textarea', {
            class: 'input', rows: '3', placeholder: 'How did it feel?', value: workout.notes, dataset: { focusKey: 'notes' },
            oninput: e => { workout.notes = e.target.value; scheduleSave(); }
          })),
        entryId && h('div', { class: 'editor-actions' },
          h('button', { class: 'btn', type: 'button', onclick: repeatToday }, icon('copy'), 'Repeat today'),
          h('button', { class: 'btn btn-danger', type: 'button', onclick: deleteWorkout }, icon('trash'), 'Delete')),
        h('a', { class: 'btn btn-primary btn-block btn-lg', href: '#/workouts' }, 'Done'),
        h('datalist', { id: 'exercise-names' }, knownNames.map(name => h('option', { value: name }))));
    }

    // Rebuilding the form must not steal the field the user just tapped into.
    function redraw() {
      const active = document.activeElement;
      const focusKey = active && container.contains(active) ? active.dataset.focusKey : null;
      container.replaceChildren(build());
      if (focusKey) {
        const el = container.querySelector(`[data-focus-key="${focusKey}"]`);
        if (el) el.focus({ preventScroll: true });
      }
    }

    redraw();

    return function cleanup() {
      leaving = true;
      document.removeEventListener('visibilitychange', flushOnHide);
      if (saveTimer) saveNow();
      if (entryId && isEmpty(workout)) {
        try {
          FT.storage.remove(MODULE, entryId);
          FT.ui.toast('Empty workout discarded');
        } catch (err) {
          console.error(err);
        }
      }
    };
  }
})(window.FitTrack = window.FitTrack || {});
