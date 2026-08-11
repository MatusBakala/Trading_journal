import './dom-stub.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const settingsSrc = fs.readFileSync(path.join(root, 'js/settings.js'), 'utf8');
const dbSrc = fs.readFileSync(path.join(root, 'js/db.js'), 'utf8');

const { emptyDayNote, isDayNoteEmpty, journalMatches, ratingStars, dayNoteForAi, skTradePlural,
  stripHtml, noteTextToHtml } = await import('../js/day-notes.js');

test('stripHtml: z rich-textu spraví čitateľný text pre výpis, hľadanie aj AI', () => {
  assert.equal(stripHtml('<div><b>Silný deň</b></div><div>druhý riadok</div>'), 'Silný deň\ndruhý riadok');
  assert.equal(stripHtml('a<br>b'), 'a\nb');
  assert.equal(stripHtml('&lt;nie tag&gt; &amp; &nbsp;x'), '<nie tag> &  x'.trim());
  assert.equal(stripHtml(''), '');
  assert.equal(stripHtml(null), '');
});

test('isDayNoteEmpty: zápis s prázdnym HTML sa nepovažuje za vyplnený', () => {
  // rich-text editor po vymazaní obsahu často nechá <div><br></div> - to nie je zápis
  assert.equal(isDayNoteEmpty({ ...emptyDayNote('2026-08-10'), text: '<div><br></div>' }), true);
  assert.equal(isDayNoteEmpty({ ...emptyDayNote('2026-08-10'), text: '<p>  </p>' }), true);
  assert.equal(isDayNoteEmpty({ ...emptyDayNote('2026-08-10'), text: '<div>niečo</div>' }), false);
});

test('noteTextToHtml: staré zápisy v čistom texte si po prechode na rich text udržia riadky', () => {
  assert.equal(noteTextToHtml('prvy\ndruhy'), '<div>prvy</div><div>druhy</div>');
  assert.equal(noteTextToHtml(''), '');
  // už HTML sa nesmie znovu escapovať
  const html = '<div><b>tucne</b></div>';
  assert.equal(noteTextToHtml(html), html);
});

test('skTradePlural: nula sa skloňuje ako 5+, nie ako 2-4', () => {
  assert.equal(skTradePlural(0), 'obchodov', '"0 obchody" je nesprávne po slovensky');
  assert.equal(skTradePlural(1), 'obchod');
  assert.equal(skTradePlural(2), 'obchody');
  assert.equal(skTradePlural(4), 'obchody');
  assert.equal(skTradePlural(5), 'obchodov');
  assert.equal(skTradePlural(12), 'obchodov');
});
const { state } = await import('../js/state.js');

test('isDayNoteEmpty: nevyplnený zápis sa neukladá, čokoľvek vyplnené áno', () => {
  assert.equal(isDayNoteEmpty(null), true);
  assert.equal(isDayNoteEmpty(emptyDayNote('2026-08-10')), true);
  // samé medzery sú stále prázdny zápis
  assert.equal(isDayNoteEmpty({ ...emptyDayNote('2026-08-10'), text: '   ' }), true);
  assert.equal(isDayNoteEmpty({ ...emptyDayNote('2026-08-10'), text: 'dnes' }), false);
  assert.equal(isDayNoteEmpty({ ...emptyDayNote('2026-08-10'), rating: 3 }), false);
  assert.equal(isDayNoteEmpty({ ...emptyDayNote('2026-08-10'), mood: 'pokoj' }), false);
  assert.equal(isDayNoteEmpty({ ...emptyDayNote('2026-08-10'), wentWell: 'trpezlivosť' }), false);
});

test('ratingStars: 0-5 hviezdičiek, mimo rozsahu sa oreže', () => {
  assert.equal(ratingStars(0), '☆☆☆☆☆');
  assert.equal(ratingStars(3), '★★★☆☆');
  assert.equal(ratingStars(5), '★★★★★');
  assert.equal(ratingStars(9), '★★★★★');
  assert.equal(ratingStars(-2), '☆☆☆☆☆');
});

test('journalMatches: hľadá naprieč dátumom, textom aj náladou, nezáleží na veľkosti písmen', () => {
  const n = { date: '2026-08-10', text: 'Trh bol pomalý', wentWell: 'Počkal som si', toImprove: '', mood: 'pokoj' };
  assert.equal(journalMatches(n, ''), true, 'prázdne hľadanie pustí všetko');
  assert.equal(journalMatches(n, 'POMALÝ'), true);
  assert.equal(journalMatches(n, 'počkal'), true);
  assert.equal(journalMatches(n, '2026-08'), true);
  assert.equal(journalMatches(n, 'FOMO'), false);
});

test('dayNoteForAi: prázdny deň nedá AI nič, vyplnený dá preložené polia', () => {
  state.dayNotes = [
    { ...emptyDayNote('2026-08-10'), rating: 4, mood: 'pokoj', text: 'dobrý deň', wentWell: '  ' },
  ];
  assert.equal(dayNoteForAi('2026-08-11'), null, 'deň bez zápisu');
  const out = dayNoteForAi('2026-08-10');
  assert.equal(out.hodnotenieDna, 4);
  assert.match(out.nalada, /Pokoj/);
  assert.equal(out.zhrnutieDna, 'dobrý deň');
  assert.equal(out.coIsloDobre, null, 'prázdne polia idú ako null, nie ako medzery');
  state.dayNotes = [];
});

/* Toto je presne tá chyba, ktorá už raz nastala pri stratégiách: nový store, ktorý
   sa zabudne pridať do zálohy, sa nesynchronizuje na Drive a pri obnove sa stratí. */
test('dayNotes sú súčasťou zálohy - inak by sa denník nesynchronizoval a pri obnove zmizol', () => {
  const build = settingsSrc.slice(
    settingsSrc.indexOf('export async function buildBackupPayload'),
    settingsSrc.indexOf('export async function applyBackupPayload')
  );
  assert.match(build, /dayNotes:state\.dayNotes/, 'buildBackupPayload musí zálohovať dayNotes');

  const apply = settingsSrc.slice(
    settingsSrc.indexOf('export async function applyBackupPayload'),
    settingsSrc.indexOf('export async function exportBackup')
  );
  assert.match(apply, /idbClear\('dayNotes'\)/, 'obnova musí starý denník najprv vyčistiť');
  assert.match(apply, /p\.dayNotes\|\|\[\]/, 'obnova musí denník zo zálohy zapísať späť');
});

test('nový store dayNotes si vyžiadal vyššiu verziu IndexedDB (inak sa nevytvorí)', () => {
  assert.match(dbSrc, /indexedDB\.open\('tjournal',(\d+)\)/);
  const version = Number(dbSrc.match(/indexedDB\.open\('tjournal',(\d+)\)/)[1]);
  assert.ok(version >= 4, `verzia DB je ${version}, pre store dayNotes musí byť aspoň 4`);
  assert.match(dbSrc, /createObjectStore\('dayNotes',\{keyPath:'date'\}\)/);
});

test('wipeAll zmaže aj denník', () => {
  const wipe = settingsSrc.slice(settingsSrc.indexOf('export async function wipeAll'));
  assert.match(wipe, /idbClear\('dayNotes'\)/);
  assert.match(wipe, /state\.dayNotes=\[\]/);
});
