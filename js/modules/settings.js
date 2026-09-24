// Settings and data: export/import, units, storage status.
// Stores nothing of its own; settings live at the top level of the database.
(function (FT) {
  'use strict';

  const { h, icon } = FT.ui;

  FT.registry.register({
    id: 'settings',
    label: 'Settings',
    icon: 'settings',
    tab: false,
    storesData: false,
    render(container) {
      FT.ui.setHeader({ title: 'Settings', back: FT.registry.defaultId() });
      const draw = () => container.replaceChildren(h('div', { class: 'stack' },
        corruptSection(draw), backupSection(), unitsSection(), storageSection(), aboutSection()));
      draw();
      return FT.storage.subscribe(draw);
    }
  });

  function labelFor(moduleId) {
    const mod = FT.registry.get(moduleId);
    return mod ? mod.label : moduleId;
  }

  function lastBackupText(lastExportAt) {
    if (!lastExportAt) return 'No backup yet.';
    const date = FT.dates.toLocalDate(new Date(lastExportAt));
    const days = FT.dates.daysBetween(date, FT.dates.today());
    const ago = days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;
    return `Last backup: ${ago} (${FT.dates.format(date)}).`;
  }

  // ---------- Backup ----------

  function exportAll() {
    try {
      FT.ui.download(`fittrack-backup-${FT.dates.today()}.json`, FT.storage.exportData());
      FT.ui.toast('Backup downloaded');
    } catch (err) {
      FT.ui.toast('Export failed: ' + err.message, 'error');
    }
  }

  async function importFile(event) {
    const file = event.target.files[0];
    event.target.value = ''; // lets the same file be chosen again
    if (!file) return;

    let backup;
    try {
      backup = FT.storage.readBackup(await file.text());
    } catch (err) {
      FT.ui.toast(err.message, 'error');
      return;
    }

    const when = backup.exportedAt ? `Backup from ${FT.dates.format(FT.dates.toLocalDate(new Date(backup.exportedAt)))}\n` : '';
    const lines = Object.entries(backup.counts).map(([id, n]) => `${labelFor(id)}: ${n}`).join('\n');
    const ok = await FT.ui.confirm(
      `${when}${lines}\n\nThis replaces ALL data currently in this browser. You can undo it from this page until the next import.`,
      { okLabel: 'Replace data', danger: true });
    if (!ok) return;

    try {
      FT.storage.replaceAll(backup.data);
      FT.ui.toast('Data imported');
    } catch (err) {
      FT.ui.toast(err.message, 'error');
    }
  }

  async function undoImport() {
    const ok = await FT.ui.confirm('Go back to the data you had before the last import? Anything added since then will be lost.', { okLabel: 'Undo import', danger: true });
    if (!ok) return;
    try {
      FT.storage.restorePreImportBackup();
      FT.ui.toast('Import undone');
    } catch (err) {
      FT.ui.toast(err.message, 'error');
    }
  }

  function backupSection() {
    const fileInput = h('input', { type: 'file', hidden: true, onchange: importFile });
    return h('section', { class: 'card stack-sm' },
      h('h2', null, 'Backup'),
      h('p', { class: 'muted' }, lastBackupText(FT.storage.getMeta().lastExportAt)),
      h('button', { class: 'btn btn-primary btn-block', type: 'button', onclick: exportAll }, icon('download'), 'Export all data'),
      h('button', { class: 'btn btn-block', type: 'button', onclick: () => fileInput.click() }, icon('upload'), 'Import from file…'),
      fileInput,
      FT.storage.hasPreImportBackup() && h('button', { class: 'btn btn-danger btn-block', type: 'button', onclick: undoImport }, 'Undo last import'),
      h('p', { class: 'muted small' },
        'Your data is stored only in this browser on this device. Export regularly and keep the file somewhere safe, such as iCloud Drive, Google Drive or an email to yourself.'));
  }

  // ---------- Units ----------

  function unitsSection() {
    const current = FT.storage.getSettings().weightUnit;
    const option = unit => h('button', {
      type: 'button', 'aria-pressed': String(current === unit),
      onclick: () => { if (unit !== current) FT.storage.updateSettings({ weightUnit: unit }); }
    }, unit);
    return h('section', { class: 'card stack-sm' },
      h('h2', null, 'Weight unit'),
      h('div', { class: 'segmented', role: 'group', 'aria-label': 'Weight unit' }, option('kg'), option('lb')),
      h('p', { class: 'muted small' }, 'This only changes labels. Numbers you already logged are not converted.'));
  }

  // ---------- Storage ----------

  function storageSection() {
    const counts = FT.storage.counts();
    const summary = Object.entries(counts).map(([id, n]) => `${n} ${labelFor(id).toLowerCase()}`).join(' · ');
    const kb = Math.max(1, Math.round(FT.storage.sizeInBytes() / 1024));

    const persistText = h('span', null, 'checking…');
    const askButton = h('button', { class: 'btn btn-block', type: 'button', hidden: true }, 'Ask browser to keep my data');
    const show = persisted => {
      persistText.textContent = persisted === true ? 'yes' : persisted === false ? 'not guaranteed' : 'unknown';
      askButton.hidden = persisted !== false;
    };
    askButton.addEventListener('click', async () => {
      const granted = await FT.storage.persistence(true);
      show(granted);
      FT.ui.toast(granted ? 'The browser will keep your data.' : 'The browser said no. Keep exporting backups.');
    });
    FT.storage.persistence(false).then(show);

    return h('section', { class: 'card stack-sm' },
      h('h2', null, 'Storage'),
      h('p', null, summary || 'No data yet.'),
      h('p', { class: 'muted small' }, `About ${kb} KB used. Protected from automatic cleanup: `, persistText, '.'),
      askButton);
  }

  // ---------- Unreadable data ----------

  function corruptSection(redraw) {
    const raw = FT.storage.getCorruptData();
    if (raw === null) return null;
    return h('section', { class: 'card stack-sm banner-danger' },
      h('h2', null, 'Some saved data could not be read'),
      h('p', { class: 'small' }, 'FitTrack started with empty data and kept the unreadable copy. Download it before removing it; it may be recoverable.'),
      h('button', {
        class: 'btn btn-block', type: 'button',
        onclick: () => FT.ui.download(`fittrack-unreadable-${FT.dates.today()}.txt`, raw, 'text/plain')
      }, icon('download'), 'Download unreadable data'),
      h('button', {
        class: 'btn btn-danger btn-block', type: 'button',
        onclick: async () => {
          const ok = await FT.ui.confirm('Remove the unreadable copy from this browser? Download it first if you might need it.', { okLabel: 'Remove', danger: true });
          if (!ok) return;
          FT.storage.clearCorruptData();
          redraw();
        }
      }, 'Remove unreadable copy'));
  }

  function aboutSection() {
    return h('p', { class: 'muted small', style: 'text-align:center' }, `FitTrack · data format v${FT.migrations.CURRENT_VERSION}`);
  }
})(window.FitTrack = window.FitTrack || {});
