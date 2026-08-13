import './dom-stub.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const tabsSrc = fs.readFileSync(path.join(root, 'js/tabs.js'), 'utf8');

const { TABS, tabFromHash } = await import('../js/tabs.js');

test('tabFromHash: číta sekciu z URL v oboch tvaroch', () => {
  assert.equal(tabFromHash('#/trades'), 'trades');
  assert.equal(tabFromHash('#trades'), 'trades');
  assert.equal(tabFromHash('#/journal'), 'journal');
});

test('tabFromHash: prázdna mriežka je úvodná sekcia', () => {
  // Dôležité pre tlačidlo Späť: z #/trades sa vracia na prázdny hash a vtedy sa
  // musí zobraziť Dashboard, nie zostať na Obchodoch.
  assert.equal(tabFromHash(''), 'dashboard');
  assert.equal(tabFromHash('#'), 'dashboard');
  assert.equal(tabFromHash('#/'), 'dashboard');
});

test('tabFromHash: neznámu sekciu nepodstrčí, vráti null', () => {
  // null = "nechaj používateľa tam, kde je", nie pád ani skok na Dashboard
  assert.equal(tabFromHash('#/neexistuje'), null);
  assert.equal(tabFromHash('#/../etc'), null);
});

test('každá sekcia zo zoznamu má naozaj svoju sekciu v index.html', () => {
  for (const t of TABS) {
    assert.ok(html.includes('id="tab-' + t + '"'), 'chýba sekcia id="tab-' + t + '"');
    assert.ok(html.includes('data-tab="' + t + '"'), 'chýba tlačidlo data-tab="' + t + '"');
  }
});

test('každé tlačidlo v navigácii je v zozname sekcií', () => {
  const inNav = [...html.matchAll(/<button data-tab="([a-z]+)"/g)].map(m => m[1]);
  assert.ok(inNav.length >= 10, 'v navigácii sa našlo podozrivo málo tlačidiel');
  for (const t of inNav) assert.ok(TABS.includes(t), 'tlačidlo "' + t + '" chýba v TABS, routing ho nebude poznať');
});

test('prepnutie z URL nezapisuje späť do URL (inak by vzniklo zacyklenie)', () => {
  // applyRouteFromHash() beží aj z udalosti hashchange; keby volalo goToTab bez
  // druhého argumentu, zápis hashu by spustil ďalší hashchange dookola.
  assert.match(tabsSrc, /goToTab\(name,\s*false\)/);
  assert.match(tabsSrc, /if\s*\(updateHash\s*!==\s*false\)/);
});

test('klik na "Obchody" v menu vyčistí filter, preklik z grafu nie', () => {
  // Filter vie nastaviť preklik z grafu (hodina vstupu). Bez tohto by prežil prepnutie
  // sekcie aj zmenu účtu a používateľ by videl výsek bez toho, aby vedel prečo.
  assert.match(tabsSrc, /if \(b\.dataset\.tab === 'trades'\) resetTradeFilters\(\);/);
  // reset musí byť naviazaný na klik v menu, nie na samotné goToTab - inak by zmazal
  // filter, ktorý si preklik z grafu práve nastavil, aj pri Späť/Vpred
  const goToTabFn = tabsSrc.slice(tabsSrc.indexOf('export function goToTab'), tabsSrc.indexOf('/** Otvorí sekciu'));
  assert.ok(!/resetTradeFilters/.test(goToTabFn), 'reset patrí na klik v menu, nie do goToTab');
});
