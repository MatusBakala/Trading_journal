import './dom-stub.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

const { addToDupIndex, buildDupIndex, dupKeyFor, findDuplicate, isAmbiguousSlashDate, parseDir } =
  await import('../js/import-csv.js');

const trade = (o) => Object.assign({ account: 1, tEntry: 1000, symbol: 'MNQ', entry: 100 }, o);

test('dupKeyFor: symbol je case-insensitive', () => {
  assert.equal(dupKeyFor(1, 1000, 'mnq'), dupKeyFor(1, 1000, 'MNQ'));
});

test('findDuplicate: nájde zhodu na účte, čase a symbole', () => {
  const idx = buildDupIndex([trade({ id: 7 })]);
  assert.equal(findDuplicate(idx, 1, 1000, 'MNQ', 100).id, 7);
});

test('findDuplicate: iný účet, čas alebo symbol nie je duplicita', () => {
  const idx = buildDupIndex([trade({ id: 7 })]);
  assert.equal(findDuplicate(idx, 2, 1000, 'MNQ', 100), null, 'iný účet');
  assert.equal(findDuplicate(idx, 1, 2000, 'MNQ', 100), null, 'iný čas');
  assert.equal(findDuplicate(idx, 1, 1000, 'ES', 100), null, 'iný symbol');
});

test('findDuplicate: rozdielna vstupná cena znamená iný obchod', () => {
  const idx = buildDupIndex([trade({ id: 7, entry: 100 })]);
  assert.equal(findDuplicate(idx, 1, 1000, 'MNQ', 105), null);
});

test('findDuplicate: cena sa porovnáva s toleranciou na plávajúcu čiarku', () => {
  const idx = buildDupIndex([trade({ id: 7, entry: 0.1 + 0.2 })]);
  assert.equal(findDuplicate(idx, 1, 1000, 'MNQ', 0.3).id, 7);
});

test('findDuplicate: chýbajúca cena na ktorejkoľvek strane zhodu nezruší', () => {
  const idx = buildDupIndex([trade({ id: 7, entry: NaN })]);
  assert.equal(findDuplicate(idx, 1, 1000, 'MNQ', 100).id, 7);
  const idx2 = buildDupIndex([trade({ id: 8, entry: 100 })]);
  assert.equal(findDuplicate(idx2, 1, 1000, 'MNQ', NaN).id, 8);
});

test('findDuplicate: rovnaký čas a symbol na rôznych účtoch sa nemieša', () => {
  const idx = buildDupIndex([trade({ id: 1, account: 1 }), trade({ id: 2, account: 2 })]);
  assert.equal(findDuplicate(idx, 1, 1000, 'MNQ', 100).id, 1);
  assert.equal(findDuplicate(idx, 2, 1000, 'MNQ', 100).id, 2);
});

test('addToDupIndex: riadok pridaný počas importu je hneď viditeľný', () => {
  // dva rovnaké riadky v jednom CSV - druhý musí padnúť ako duplicita
  const idx = buildDupIndex([]);
  assert.equal(findDuplicate(idx, 1, 1000, 'MNQ', 100), null);
  addToDupIndex(idx, trade({ id: 'novy' }));
  assert.equal(findDuplicate(idx, 1, 1000, 'MNQ', 100).id, 'novy');
});

test('buildDupIndex: zvládne prázdny aj chýbajúci zoznam', () => {
  assert.equal(buildDupIndex([]).size, 0);
  assert.equal(buildDupIndex(undefined).size, 0);
});

test('parseDir: long a short v rôznych zápisoch', () => {
  for (const v of ['buy', 'Long', 'B', '1', 'bot', 'BuyToOpen']) assert.equal(parseDir(v), 1, v);
  for (const v of ['sell', 'Short', 'S', '-1', 'sld', 'SellToClose']) assert.equal(parseDir(v), -1, v);
  assert.equal(parseDir('nezmysel'), 1, 'neznáme -> long');
});

test('isAmbiguousSlashDate: označí len naozaj dvojznačné dátumy', () => {
  assert.equal(isAmbiguousSlashDate('01/02/2026'), true, 'deň aj mesiac <= 12');
  assert.equal(isAmbiguousSlashDate('12/25/2026'), false, '25 nemôže byť mesiac');
  assert.equal(isAmbiguousSlashDate('03/03/2026'), false, 'rovnaké čísla sú jedno aj druhé');
  assert.equal(isAmbiguousSlashDate('2026-01-02'), false, 'ISO nie je dvojznačné');
  assert.equal(isAmbiguousSlashDate(''), false);
});
