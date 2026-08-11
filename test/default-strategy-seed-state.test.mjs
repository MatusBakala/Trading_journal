import './dom-stub.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const strategyNotesSrc = fs.readFileSync(path.join(root, 'js/strategy-notes.js'), 'utf8');
const settingsSrc = fs.readFileSync(path.join(root, 'js/settings.js'), 'utf8');

const { DEFAULT_STRATEGY_SEED_KEYS } = await import('../js/strategy-notes.js');

/* Záloha (buildBackupPayload) obsahuje store `strategies`, ale NIE `kv`. Keď teda
   applyBackupPayload() prepíše stratégie obsahom zálohy, kv značky o seedovaní
   prežijú a tvrdia, že built-in stratégie sú aktuálne - hoci v store sú tie zo
   zálohy. seedDefaultStrategies() sa potom preskočí a stratégie pridané novšou
   verziou kódu (napr. Volume Profile) sa v takom prehliadači už nikdy neobjavia. */

test('applyBackupPayload zmaže seed značky - inak sa seedDefaultStrategies() preskočí', () => {
  const body = settingsSrc.slice(
    settingsSrc.indexOf('export async function applyBackupPayload'),
    settingsSrc.indexOf('export async function exportBackup')
  );
  assert.ok(body.length > 0, 'applyBackupPayload sa nenašlo v settings.js');
  assert.match(
    body,
    /clearDefaultStrategySeedState\(\)/,
    'applyBackupPayload prepisuje `strategies` cudzími dátami, takže musí zneplatniť kv značky o seedovaní'
  );
});

test('DEFAULT_STRATEGY_SEED_KEYS pokrýva každú kv značku, ktorú seedDefaultStrategies() číta/zapisuje', () => {
  // Chytí prípad, keď niekto pridá novú značku (napr. defaultStrategiesXyz) a
  // zabudne ju doplniť do zoznamu - obnova zálohy by ju nechala nažive a chyba
  // by sa vrátila v novej podobe.
  const used = new Set();
  for (const m of strategyNotesSrc.matchAll(/'(defaultStrategies[A-Za-z]*)'/g)) used.add(m[1]);
  assert.ok(used.size > 0, 'v strategy-notes.js sa nenašli žiadne defaultStrategies* kľúče');
  for (const key of used) {
    assert.ok(
      DEFAULT_STRATEGY_SEED_KEYS.includes(key),
      `kv značka '${key}' chýba v DEFAULT_STRATEGY_SEED_KEYS, obnova zálohy ju nezmaže`
    );
  }
});

test('guard v seedDefaultStrategies() naozaj stojí na tých značkách (inak je test vyššie zbytočný)', () => {
  assert.match(strategyNotesSrc, /idbGet\('kv','defaultStrategiesAppVersion'\)/);
  assert.match(strategyNotesSrc, /idbGet\('kv','defaultStrategiesSeeded'\)/);
  assert.match(
    strategyNotesSrc,
    /if\(seededFlag&&seededFlag\.v&&appVersion&&appVersion===prevAppVersion&&haveAllBuiltIns\)return;/,
    'skorý návrat zo seedDefaultStrategies() zmenil tvar - over, či oprava obnovy zálohy stále platí'
  );
});

test('guard sa nespolieha len na verziu - chýbajúca built-in stratégia musí seedovanie vynútiť', () => {
  // Bez tejto kontroly zostane prehliadač, ktorý sa už do zlého stavu dostal
  // (staré stratégie zo zálohy + kv značky s aktuálnou verziou), pokazený
  // natrvalo - žiadny reload ani nová verzia appky ho nevylieči.
  assert.match(
    strategyNotesSrc,
    /haveAllBuiltIns=prevNames!=null&&prevNames\.every\(/,
    'seedDefaultStrategies() musí overiť, že built-in stratégie sú naozaj v store'
  );
  assert.match(
    strategyNotesSrc,
    /idbPut\('kv',\{k:'defaultStrategiesNames',v:DEFAULT_STRATEGIES\.map\(s=>s\.name\)\}\)/,
    'zoznam mien sa musí zapisovať, inak sa kontrola nemá o čo oprieť'
  );
});

test('keď značky klamali, obnoví sa aj obsah už existujúcich built-in stratégií', () => {
  // Fingerprint prežije obnovu zálohy rovnako ako ostatné značky a môže sa zhodovať
  // s kódom, hoci v store sú stratégie zo starej zálohy. Bez tohto by sa doplnili
  // len chýbajúce a zvyšné by ostali s prastarým popisom/poznámkami.
  assert.match(
    strategyNotesSrc,
    /const syncBuiltIns=prevFp!==fp\|\|!haveAllBuiltIns;/,
    'syncBuiltIns sa musí vynútiť aj vtedy, keď kv značky nesedia so store'
  );
});
