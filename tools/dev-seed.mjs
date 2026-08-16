/**
 * Dev-only helper: load a real backup from test-data/ straight into the running app,
 * and wipe the database, without clicking through Settings every time.
 *
 * Usage from the browser console (or an automation tool) on the dev server:
 *
 *   const dev = await import('/tools/dev-seed.mjs');
 *   await dev.listBackups();   // ['trading-journal-zaloha-2026-08-08.json', ...]
 *   await dev.loadBackup();    // newest one by filename
 *   await dev.loadBackup('trading-journal-zaloha-2026-08-08.json');
 *   await dev.wipe();          // delete the IndexedDB, then reload for a clean install
 *
 * Nothing imports this module, so it stays inert unless called by hand, and every
 * entry point refuses to run outside localhost - test-data/ holds real trading data
 * and is gitignored, so on a deployed site these fetches would 404 anyway.
 */

const DB_NAME = 'tjournal';

function assertDev() {
  const h = location.hostname;
  if (h !== 'localhost' && h !== '127.0.0.1' && h !== '[::1]') {
    throw new Error('dev-seed.mjs is for local development only (hostname: ' + h + ')');
  }
}

/**
 * Import an app module through the SAME URL the app itself used.
 *
 * index.html installs an import map rewriting every js/ module to `?v=<app version>`;
 * a relative specifier from this file resolves to that same absolute URL and gets
 * remapped with it. Fetching `/js/settings.js` by hand instead would be a different
 * URL, so the browser would instantiate a SECOND copy of the module graph with its
 * own `state` object - the seeded data would land in an app the page is not rendering.
 */
const appModule = (rel) => import(rel);

/** Backup exports available in test-data/, newest filename first. */
export async function listBackups() {
  assertDev();
  const res = await fetch('/__dev/backups', { cache: 'no-store' });
  if (!res.ok) throw new Error('/__dev/backups failed: ' + res.status + ' (is tools/dev-server.mjs running?)');
  return res.json();
}

/**
 * Restore a backup into the running app: same path as Settings -> restore, including
 * re-seeding the built-in strategies afterwards (code wins over whatever the backup
 * carried) and a full re-render.
 *
 * @param {string} [name] file in test-data/; defaults to the newest by filename.
 * @returns {Promise<object>} short summary of what landed in the app.
 */
export async function loadBackup(name) {
  assertDev();
  let file = name;
  if (!file) {
    const all = await listBackups();
    if (!all.length) throw new Error('test-data/ has no .json backup - drop an export in there first');
    file = all[0];
  }

  const res = await fetch('/test-data/' + encodeURIComponent(file), { cache: 'no-store' });
  if (!res.ok) throw new Error('cannot read test-data/' + file + ': ' + res.status);
  const payload = await res.json();

  const settings = await appModule('../js/settings.js');
  const strategyNotes = await appModule('../js/strategy-notes.js');
  const init = await appModule('../js/init.js');
  const stateMod = await appModule('../js/state.js');

  await settings.applyBackupPayload(payload);
  await strategyNotes.seedDefaultStrategies();
  init.renderAll();

  const st = stateMod.state;
  return {
    file,
    exported: payload.exported || null,
    trades: (st.trades || []).length,
    strategies: (st.strategies || []).length,
    ohlcSets: (st.ohlcSets || []).length,
    dayNotes: (st.dayNotes || []).length,
    accounts: ((st.settings && st.settings.accounts) || []).length,
  };
}

/**
 * Delete the whole IndexedDB, for testing the first-run path.
 *
 * deleteDatabase waits for every open connection to close, and the running app holds
 * one of its own (DB.db in js/db.js) - so this closes that first, otherwise the delete
 * blocks forever against the very page you called it from. Any OTHER tab open on the
 * app blocks it too, and that one can only be fixed by closing the tab, so say so
 * instead of hanging.
 *
 * The app cannot touch the database after this until the page reloads; pass
 * `{reload:true}` to do that immediately.
 */
export async function wipe({ timeoutMs = 5000, reload = false } = {}) {
  assertDev();

  // Release this page's own connection before asking for the delete.
  try {
    const { DB } = await appModule('../js/db.js');
    if (DB && DB.db) {
      DB.db.close();
      DB.db = null;
    }
  } catch (e) {
    // js/db.js not loaded yet (e.g. called from a non-app page) - nothing to close.
  }

  const outcome = await new Promise((resolve) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve('deleted');
    req.onerror = () => resolve('error');
    req.onblocked = () => resolve('blocked');
    setTimeout(() => resolve('timeout'), timeoutMs);
  });

  if (outcome !== 'deleted') {
    throw new Error(
      'IndexedDB delete came back "' + outcome + '": another tab still holds a connection to "' +
        DB_NAME + '". Close every other tab on this app and call wipe() again.'
    );
  }

  if (reload) location.reload();
  return { deleted: true, hint: 'reload the page to re-seed from DEFAULT_STRATEGIES' };
}
