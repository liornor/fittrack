// The only code that touches localStorage.
//
// All data lives in one JSON object under one key:
//   { schemaVersion, meta, settings, modules: { <moduleId>: { items: [], entries: [] } } }
// Every entry has id, date (local YYYY-MM-DD), createdAt and updatedAt; the rest
// belongs to the module. `items` holds undated definitions (habits, goals).
// Every change is written immediately. Callers get copies, never live objects.
(function (FT) {
  'use strict';

  const KEY = 'fittrack:db';
  const CORRUPT_KEY = 'fittrack:corrupt';
  const PRE_IMPORT_KEY = 'fittrack:pre-import-backup';
  const APP_MARKER = 'fittrack';

  const moduleIds = new Set();
  const listeners = new Set();
  let backend = null; // window.localStorage, or an in-memory stand-in for tests
  let db = null;

  function now() { return new Date().toISOString(); }
  function clone(value) { return value === undefined ? undefined : JSON.parse(JSON.stringify(value)); }

  function newId() {
    const random = Array.from(crypto.getRandomValues(new Uint8Array(5)), b => b.toString(36).padStart(2, '0')).join('');
    return Date.now().toString(36) + random;
  }

  function emptyDb() {
    const t = now();
    return {
      schemaVersion: FT.migrations.CURRENT_VERSION,
      meta: { createdAt: t, updatedAt: t, lastExportAt: null },
      settings: { weightUnit: 'kg' },
      modules: {}
    };
  }

  // Adds whatever is missing (new modules, new settings). Never removes data,
  // including modules this version of the app doesn't know about.
  function fillDefaults(data) {
    const base = emptyDb();
    data.meta = Object.assign(base.meta, data.meta);
    data.settings = Object.assign(base.settings, data.settings);
    for (const id of moduleIds) {
      if (!data.modules[id]) data.modules[id] = { items: [], entries: [] };
    }
    return data;
  }

  function validate(data) {
    const fail = message => { throw new Error('Invalid data: ' + message); };
    if (!data.modules || typeof data.modules !== 'object') fail('missing modules');
    for (const [id, mod] of Object.entries(data.modules)) {
      if (!mod || !Array.isArray(mod.entries) || !Array.isArray(mod.items)) fail(`section "${id}" is malformed`);
      const seen = new Set();
      for (const entry of mod.entries) {
        if (!entry || typeof entry.id !== 'string') fail(`an entry in "${id}" has no id`);
        if (seen.has(entry.id)) fail(`duplicate id "${entry.id}" in "${id}"`);
        seen.add(entry.id);
        if (!FT.dates.isValid(entry.date)) fail(`entry "${entry.id}" in "${id}" has an invalid date`);
      }
    }
  }

  // Parse, upgrade, check and complete a stored or imported database.
  function prepare(data) {
    const migrated = FT.migrations.run(data);
    validate(migrated);
    return fillDefaults(migrated);
  }

  function isQuotaError(err) {
    return err && (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED' || err.code === 22);
  }

  function reloadFromBackend() {
    try {
      const raw = backend.getItem(KEY);
      db = raw === null ? fillDefaults(emptyDb()) : prepare(JSON.parse(raw));
    } catch {
      db = fillDefaults(emptyDb());
    }
  }

  function emit(section) {
    for (const fn of listeners) {
      try { fn(section); } catch (err) { console.error(err); }
    }
  }

  // Write the whole database. On failure, roll memory back to what is on disk
  // so the app never shows data that wasn't actually saved.
  function commit(section) {
    db.meta.updatedAt = now();
    try {
      backend.setItem(KEY, JSON.stringify(db));
    } catch (err) {
      reloadFromBackend();
      throw new Error(isQuotaError(err)
        ? 'Storage is full, so this change was not saved. Export a backup, then remove old data.'
        : 'Could not save: ' + err.message);
    }
    emit(section);
  }

  function section(moduleId) {
    if (!db) throw new Error('storage.init() has not run');
    const mod = db.modules[moduleId];
    if (!mod) throw new Error(`Unknown module "${moduleId}"`);
    return mod;
  }

  function byNewest(a, b) {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return String(b.createdAt).localeCompare(String(a.createdAt));
  }

  // ---------- Setup ----------

  function defineModule(id) {
    moduleIds.add(id);
    if (db) fillDefaults(db);
  }

  function init(options) {
    backend = (options && options.backend) || window.localStorage;
    const raw = backend.getItem(KEY);
    if (raw === null) {
      db = fillDefaults(emptyDb());
      return;
    }
    try {
      db = prepare(JSON.parse(raw));
    } catch (err) {
      console.error('Saved data could not be read:', err);
      // Keep the unreadable copy before anything can overwrite it. If even that
      // fails, this throws and the app refuses to start rather than lose data.
      backend.setItem(CORRUPT_KEY, raw);
      db = fillDefaults(emptyDb());
    }
  }

  // ---------- Entries ----------

  function list(moduleId, range) {
    const from = range && range.from;
    const to = range && range.to;
    return clone(section(moduleId).entries
      .filter(e => (!from || e.date >= from) && (!to || e.date <= to))
      .sort(byNewest));
  }

  function get(moduleId, id) {
    return clone(section(moduleId).entries.find(e => e.id === id)) || null;
  }

  function add(moduleId, data) {
    const t = now();
    const entry = Object.assign(clone(data) || {}, { id: newId(), createdAt: t, updatedAt: t });
    if (entry.date === undefined) entry.date = FT.dates.today();
    if (!FT.dates.isValid(entry.date)) throw new Error('Invalid date: ' + entry.date);
    section(moduleId).entries.push(entry);
    commit(moduleId);
    return clone(entry);
  }

  // Shallow merge: top-level fields in `changes` replace the stored ones.
  function update(moduleId, id, changes) {
    const entries = section(moduleId).entries;
    const index = entries.findIndex(e => e.id === id);
    if (index === -1) throw new Error(`No entry "${id}" in "${moduleId}"`);
    const current = entries[index];
    const next = Object.assign({}, current, clone(changes), { id: current.id, createdAt: current.createdAt, updatedAt: now() });
    if (!FT.dates.isValid(next.date)) throw new Error('Invalid date: ' + next.date);
    entries[index] = next;
    commit(moduleId);
    return clone(next);
  }

  function remove(moduleId, id) {
    const mod = section(moduleId);
    const before = mod.entries.length;
    mod.entries = mod.entries.filter(e => e.id !== id);
    if (mod.entries.length === before) return false;
    commit(moduleId);
    return true;
  }

  // ---------- Items, settings, meta ----------

  function getItems(moduleId) { return clone(section(moduleId).items); }

  function saveItems(moduleId, items) {
    if (!Array.isArray(items)) throw new Error('Items must be an array');
    section(moduleId).items = clone(items);
    commit(moduleId);
  }

  function getSettings() { return clone(db.settings); }

  function updateSettings(changes) {
    Object.assign(db.settings, clone(changes));
    commit('settings');
  }

  function getMeta() { return clone(db.meta); }

  function counts(data) {
    const result = {};
    for (const [id, mod] of Object.entries((data || db).modules)) result[id] = mod.entries.length;
    return result;
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  // ---------- Export / import ----------

  function exportData() {
    const t = now();
    const payload = { app: APP_MARKER, exportedAt: t, schemaVersion: db.schemaVersion, data: clone(db) };
    payload.data.meta.lastExportAt = t;
    // Recording the date must not block the export itself: a full storage is
    // exactly when you need a backup.
    try {
      db.meta.lastExportAt = t;
      commit('meta');
    } catch (err) {
      console.warn('Could not record export date:', err);
    }
    return JSON.stringify(payload, null, 2);
  }

  // Step 1 of import: read and check a backup without changing anything.
  function readBackup(text) {
    let payload;
    try { payload = JSON.parse(text); } catch { throw new Error('This file is not valid JSON.'); }
    if (!payload || payload.app !== APP_MARKER || !payload.data || typeof payload.data !== 'object') {
      throw new Error('This is not a FitTrack backup file.');
    }
    const data = prepare(payload.data);
    return { data, exportedAt: payload.exportedAt || null, counts: counts(data) };
  }

  // Step 2 of import: replace everything, keeping a safety copy of the old data.
  function replaceAll(data) {
    const current = backend.getItem(KEY);
    if (current !== null) {
      try {
        backend.setItem(PRE_IMPORT_KEY, current);
      } catch {
        throw new Error('Not enough space to keep a safety copy of your current data. Export it first, then try again.');
      }
    }
    db = prepare(clone(data));
    commit('*');
  }

  function hasPreImportBackup() { return backend.getItem(PRE_IMPORT_KEY) !== null; }

  function restorePreImportBackup() {
    const raw = backend.getItem(PRE_IMPORT_KEY);
    if (raw === null) throw new Error('There is no import to undo.');
    db = prepare(JSON.parse(raw));
    commit('*');
    backend.removeItem(PRE_IMPORT_KEY);
  }

  function getCorruptData() { return backend.getItem(CORRUPT_KEY); }
  function clearCorruptData() { backend.removeItem(CORRUPT_KEY); }

  // ---------- Browser storage info ----------

  function sizeInBytes() {
    const raw = backend.getItem(KEY);
    return raw ? new Blob([raw]).size : 0;
  }

  // true / false, or null when the browser can't tell.
  // With ask = true, asks the browser not to evict this site's data.
  async function persistence(ask) {
    if (!navigator.storage || !navigator.storage.persisted) return null;
    try {
      if (await navigator.storage.persisted()) return true;
      return ask ? await navigator.storage.persist() : false;
    } catch {
      return null;
    }
  }

  FT.storage = {
    defineModule, init,
    list, get, add, update, remove,
    getItems, saveItems,
    getSettings, updateSettings, getMeta, counts,
    subscribe,
    exportData, readBackup, replaceAll, hasPreImportBackup, restorePreImportBackup,
    getCorruptData, clearCorruptData,
    sizeInBytes, persistence
  };
})(window.FitTrack = window.FitTrack || {});
