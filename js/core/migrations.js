// Upgrades saved data (and imported backups) to the current schema version.
// To change the data format: bump CURRENT_VERSION and add a step for it.
// Never edit a step after it has shipped; old backups still depend on it.
(function (FT) {
  'use strict';

  const CURRENT_VERSION = 1;

  // steps[n] upgrades data from version n - 1 to version n.
  const steps = {
    1(data) {
      // Version 0: anything saved before versioning existed.
      data.meta = data.meta || {};
      data.settings = data.settings || {};
      data.modules = data.modules || {};
      return data;
    }
  };

  function run(data) {
    if (!data || typeof data !== 'object') throw new Error('Invalid data: not an object');
    let version = typeof data.schemaVersion === 'number' ? data.schemaVersion : 0;
    if (version > CURRENT_VERSION) {
      throw new Error(`This data was made by a newer version of FitTrack (format ${version}). Update the app first.`);
    }
    while (version < CURRENT_VERSION) {
      version += 1;
      data = steps[version](data);
      data.schemaVersion = version;
    }
    return data;
  }

  FT.migrations = { CURRENT_VERSION, run };
})(window.FitTrack = window.FitTrack || {});
