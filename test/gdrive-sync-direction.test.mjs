import './dom-stub.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const strategySrc = fs.readFileSync(path.join(root, 'js/strategy-notes.js'), 'utf8');
const gdriveSrc = fs.readFileSync(path.join(root, 'js/gdrive.js'), 'utf8');

const { shouldUploadOnConnect, snapshotLabel } = await import('../js/gdrive.js');

/* Reálna strata dát: prehliadač so STARÝMI dátami dostal novšiu verziu appky,
   seedDefaultStrategies() doplnilo nové vstavané stratégie a pritom označilo dáta ako
   "práve zmenené". Prvá synchronizácia potom videla lokálne dáta ako novšie než zálohu
   na Drive a prepísala ju starým stavom. */

test('seedDefaultStrategies neoznačuje dáta ako zmenené používateľom', () => {
  const fn = strategySrc.slice(
    strategySrc.indexOf('export async function seedDefaultStrategies'),
    strategySrc.indexOf('export function strategyById')
  );
  assert.ok(fn.length > 0, 'seedDefaultStrategies sa nenašlo');
  assert.ok(
    !/gdriveSetLastLocalChange\s*\(/.test(fn),
    'seedovanie znovu značkuje lokálnu zmenu - zastaraný prehliadač tým prepíše novšiu zálohu na Drive'
  );
});

test('shouldUploadOnConnect: staršie lokálne dáta nikdy neprepíšu novšiu zálohu', () => {
  const teraz = Date.now();
  const zaloha = teraz;            // záloha na Drive je čerstvá
  const lokalneStare = teraz - 86400000; // lokálne zmeny spred dňa
  assert.equal(shouldUploadOnConnect(true, lokalneStare, zaloha), false);
});

test('shouldUploadOnConnect: prázdny prehliadač neprepíše zálohu ani keď vyzerá "novší"', () => {
  assert.equal(shouldUploadOnConnect(false, Date.now(), 0), false);
  assert.equal(shouldUploadOnConnect(false, 0, 0), false);
});

test('shouldUploadOnConnect: skutočne novšie lokálne dáta sa nahrať smú', () => {
  const teraz = Date.now();
  assert.equal(shouldUploadOnConnect(true, teraz, teraz - 1000), true);
});

test('pri ručnom pripojení sa appka pýta, než prepíše zálohu na Drive', () => {
  // Prepis zálohy je jediná nezvratná operácia a pri prvom pripojení je lokálny stav
  // neznámy (starý prehliadač, iné zariadenie), preto tam musí byť potvrdenie.
  assert.match(gdriveSrc, /gdriveSyncNow\(true,true\)/, 'gdriveConnect nevolá sync s potvrdením');
  assert.match(gdriveSrc, /if\(doUpload&&askBeforeOverwrite\)/, 'chýba potvrdenie pred prepísaním zálohy');
});

test('snapshotLabel: dátum aj čas uloženia, a prežije chýbajúci/neplatný čas', () => {
  const label = snapshotLabel('2026-08-12', '2026-08-12T17:34:00.000Z');
  assert.match(label, /^12\.08\.2026 · \d{2}:\d{2}$/, 'nesedí tvar "12.08.2026 · HH:MM", dostal: ' + label);
  // Drive nemusí čas vrátiť - vtedy stačí samotný dátum, nie "Invalid Date"
  assert.equal(snapshotLabel('2026-08-12', null), '12.08.2026');
  assert.equal(snapshotLabel('2026-08-12', 'nezmysel'), '12.08.2026');
});

test('zoznam záloh si od Drive naozaj pýta čas zmeny', () => {
  // bez modifiedTime v poli "fields" ho Drive nepošle a čas by sa nemal odkiaľ vziať
  assert.match(gdriveSrc, /fields=files\(id,name,modifiedTime\)/);
});
