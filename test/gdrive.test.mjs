import './dom-stub.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

const { GDRIVE_SNAPSHOT_KEEP, GDRIVE_SNAPSHOT_PREFIX, snapshotDateKey, shouldUploadOnConnect } =
  await import('../js/gdrive.js');

test('shouldUploadOnConnect: prázdny lokálny stav sa nikdy nenahráva, aj keď je "novší"', () => {
  // Toto je presne scenár, ktorý reálne zmazal produkčnú zálohu: nový/vyčistený
  // prehliadač s hasUserData=false a localChanged=0 sa pripojí k Drive, kde je
  // staršia záloha (remoteUpdated < localChanged ako čísla, lebo obe sú malé/0).
  assert.equal(shouldUploadOnConnect(false, 0, 0), false);
  assert.equal(shouldUploadOnConnect(false, Date.now(), 0), false);
});

test('shouldUploadOnConnect: lokálne dáta sa nahrajú, len keď existujú A sú aspoň také nové', () => {
  const now = Date.now();
  assert.equal(shouldUploadOnConnect(true, now, now - 1000), true);
  assert.equal(shouldUploadOnConnect(true, now, now), true);
});

test('shouldUploadOnConnect: lokálne dáta existujú, ale vzdialená záloha je novšia -> stiahnuť', () => {
  const now = Date.now();
  assert.equal(shouldUploadOnConnect(true, now - 1000, now), false);
});

test('snapshotDateKey: lokálny dátum vo formáte YYYY-MM-DD s nulami', () => {
  assert.equal(snapshotDateKey(new Date(2026, 0, 5)), '2026-01-05');
  assert.equal(snapshotDateKey(new Date(2026, 11, 31)), '2026-12-31');
});

test('snapshotDateKey: berie lokálny deň, nie UTC', () => {
  // 23:30 lokálneho času musí patriť ešte dnešku aj keď v UTC je už zajtra
  const d = new Date(2026, 5, 10, 23, 30);
  assert.equal(snapshotDateKey(d), '2026-06-10');
});

test('snapshotDateKey: bez argumentu vráti dnešok', () => {
  assert.equal(snapshotDateKey(), snapshotDateKey(new Date()));
});

test('názvy snapshotov sa lexikograficky radia chronologicky', () => {
  // na tom stojí prorezávanie starých záloh - zoradí sa podľa mena, nie dátumu
  const names = ['2026-01-05', '2026-12-31', '2026-02-01', '2025-12-31']
    .map(d => GDRIVE_SNAPSHOT_PREFIX + d + '.json');
  const sortedDesc = [...names].sort((a, b) => b.localeCompare(a));
  assert.deepEqual(sortedDesc, [
    GDRIVE_SNAPSHOT_PREFIX + '2026-12-31.json',
    GDRIVE_SNAPSHOT_PREFIX + '2026-02-01.json',
    GDRIVE_SNAPSHOT_PREFIX + '2026-01-05.json',
    GDRIVE_SNAPSHOT_PREFIX + '2025-12-31.json',
  ]);
});

test('prorezávanie nechá presne GDRIVE_SNAPSHOT_KEEP najnovších', () => {
  const files = Array.from({ length: 20 }, (_, i) =>
    GDRIVE_SNAPSHOT_PREFIX + '2026-01-' + String(i + 1).padStart(2, '0') + '.json');
  const desc = [...files].sort((a, b) => b.localeCompare(a));
  const kept = desc.slice(0, GDRIVE_SNAPSHOT_KEEP);
  const deleted = desc.slice(GDRIVE_SNAPSHOT_KEEP);
  assert.equal(kept.length, GDRIVE_SNAPSHOT_KEEP);
  assert.equal(deleted.length, 20 - GDRIVE_SNAPSHOT_KEEP);
  assert.ok(kept.includes(GDRIVE_SNAPSHOT_PREFIX + '2026-01-20.json'), 'najnovší zostáva');
  assert.ok(deleted.includes(GDRIVE_SNAPSHOT_PREFIX + '2026-01-01.json'), 'najstarší padá');
});

test('hlavná záloha sa nesmie chytiť do filtra snapshotov', () => {
  const { GDRIVE_FILE_NAME } = { GDRIVE_FILE_NAME: 'trading-journal-backup.json' };
  assert.equal(GDRIVE_FILE_NAME.startsWith(GDRIVE_SNAPSHOT_PREFIX), false);
});
