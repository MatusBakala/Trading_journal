import test from 'node:test';
import assert from 'node:assert/strict';
import { collectModules, readVersionFile } from '../tools/gen-manifest.mjs';

/* Zoznam modulov v app-version.json napája import mapu v index.html. Keby zastaral,
   nový modul by sa ťahal bez ?v= a po nasadení by ostal visieť v cache - presne tá
   chyba, kvôli ktorej import mapa vznikla. Preto to stráži test, nie disciplína. */
test('app-version.json obsahuje zoznam modulov', () => {
  const data = readVersionFile();
  assert.ok(Array.isArray(data.modules), 'chýba pole "modules" - spusti: npm run manifest');
  assert.ok(data.modules.length > 0);
});

test('zoznam modulov sedí so súbormi na disku', () => {
  const data = readVersionFile();
  const onDisk = collectModules();
  const missing = onDisk.filter(m => !data.modules.includes(m));
  const extra = data.modules.filter(m => !onDisk.includes(m));
  assert.deepEqual(
    { missing, extra },
    { missing: [], extra: [] },
    'app-version.json nesedí s js/ - spusti: npm run manifest'
  );
});

test('zoznam je zoradený a bez duplicít', () => {
  const { modules } = readVersionFile();
  assert.deepEqual(modules, [...modules].sort(), 'zoznam musí byť zoradený');
  assert.equal(new Set(modules).size, modules.length, 'zoznam obsahuje duplicity');
});

test('vstupný modul aj veľký lazy-loaded dataset sú v zozname', () => {
  const { modules } = readVersionFile();
  assert.ok(modules.includes('app.js'));
  // dynamický import z gdrive.js/strategy-notes.js - bez ?v= by 2.7MB súbor ostal v cache
  assert.ok(modules.includes('data/default-strategies.js'));
});

test('verzia je prítomná a nie je nula', () => {
  const { v } = readVersionFile();
  assert.ok(v != null && String(v) !== '0', 'v app-version.json chýba rozumné "v"');
});
