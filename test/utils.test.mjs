import './dom-stub.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

const { computeDrawdown, computePnl, isClosed, multFor, num, parseDT, fmtDur, fmtPct, returnPct } = await import('../js/utils.js');
const { state } = await import('../js/state.js');

test('computePnl: long a short s multiplikátorom', () => {
  // MNQ má multiplikátor 2 -> 10 bodov * 2 kontrakty * 2 = 40
  assert.equal(computePnl({ symbol: 'MNQ', dir: 1, qty: 2, entry: 100, exit: 110 }), 40);
  // short zarába pri poklese
  assert.equal(computePnl({ symbol: 'MNQ', dir: -1, qty: 1, entry: 110, exit: 100 }), 20);
});

test('computePnl: poplatky sa odpočítavajú', () => {
  assert.equal(computePnl({ symbol: 'MNQ', dir: 1, qty: 1, entry: 100, exit: 110, fees: 4.5 }), 15.5);
});

test('computePnl: pnlOverride má prednosť pred cenami', () => {
  assert.equal(computePnl({ symbol: 'MNQ', dir: 1, qty: 1, entry: 100, exit: 110, pnlOverride: -7 }), -7);
});

test('computePnl: otvorená pozícia vracia 0', () => {
  assert.equal(computePnl({ symbol: 'MNQ', dir: 1, qty: 1, entry: 100, exit: NaN }), 0);
});

test('isClosed: rozlíši uzavretý obchod od otvorenej pozície', () => {
  assert.equal(isClosed({ entry: 100, exit: 110 }), true);
  assert.equal(isClosed({ entry: 100, exit: NaN }), false, 'bez výstupnej ceny je pozícia otvorená');
  assert.equal(isClosed({ entry: NaN, exit: NaN, pnlOverride: -25 }), true, 'ručný P&L stačí');
  assert.equal(isClosed({ entry: NaN, exit: NaN, pnlOverride: null }), false);
});

test('isClosed: otvorená pozícia nesmie prejsť ako breakeven', () => {
  // presne tá kombinácia, ktorá kedysi kazila win rate na dashboarde
  const open = { symbol: 'MNQ', dir: 1, qty: 1, entry: 50, exit: NaN, pnlOverride: null };
  assert.equal(computePnl(open), 0);
  assert.equal(isClosed(open), false);
});

test('multFor: presná zhoda vyhráva nad prefixom', () => {
  // MNQ aj NQ sú v tabuľke; MNQ sa nesmie spárovať na NQ
  assert.equal(multFor('MNQ'), 2);
  assert.equal(multFor('NQ'), 20);
  assert.equal(multFor('nq'), 20, 'malé písmená');
  assert.equal(multFor('NEZNAMY'), 1, 'neznámy symbol -> 1');
});

test('multFor: prefix pre kontrakty s príponou mesiaca', () => {
  assert.equal(multFor('MNQZ5'), 2);
});

test('num: zvláda medzery, doláre aj európske desatinné čiarky', () => {
  assert.equal(num('1234.5'), 1234.5);
  assert.equal(num('$1,234.50'), 1234.5);
  assert.equal(num('1234,5'), 1234.5, 'čiarka ako desatinná bodka');
  assert.equal(num('1.234,5'), 1234.5, 'bodka ako oddeľovač tisícov');
  assert.equal(num(' 42 '), 42);
  assert.ok(Number.isNaN(num('')));
  assert.ok(Number.isNaN(num(null)));
});

test('parseDT: ISO formát', () => {
  const ts = parseDT('2026-07-01 09:30');
  assert.equal(new Date(ts * 1000).getFullYear(), 2026);
  assert.equal(new Date(ts * 1000).getMonth(), 6);
  assert.equal(new Date(ts * 1000).getDate(), 1);
  assert.equal(new Date(ts * 1000).getHours(), 9);
});

test('parseDT: európsky formát s bodkami je deň.mesiac.rok', () => {
  const d = new Date(parseDT('02.07.2026 14:05') * 1000);
  assert.equal(d.getDate(), 2);
  assert.equal(d.getMonth(), 6, 'júl');
});

test('parseDT: lomkový formát sa číta ako mesiac/deň/rok', () => {
  // zámerne zafixované - appka tento tvar číta po americky a import to
  // pri mapovaní explicitne ukazuje, aby si používateľ omyl všimol
  const d = new Date(parseDT('01/02/2026') * 1000);
  assert.equal(d.getMonth(), 0, 'január');
  assert.equal(d.getDate(), 2);
});

test('parseDT: AM/PM', () => {
  assert.equal(new Date(parseDT('01/02/2026 01:30 PM') * 1000).getHours(), 13);
  assert.equal(new Date(parseDT('01/02/2026 12:30 AM') * 1000).getHours(), 0);
});

test('parseDT: unixové sekundy aj milisekundy', () => {
  assert.equal(parseDT('1782889200'), 1782889200);
  assert.equal(parseDT('1782889200000'), 1782889200);
});

test('parseDT: nezmysly vrátia null', () => {
  assert.equal(parseDT(''), null);
  assert.equal(parseDT(null), null);
});

test('fmtDur: rozsahy jednotiek', () => {
  assert.equal(fmtDur(30), '30s');
  assert.equal(fmtDur(120), '2m');
  assert.equal(fmtDur(5400), '1.5h');
  assert.equal(fmtDur(null), '–');
});

test('state má očakávané predvolené multiplikátory', () => {
  assert.equal(state.settings.mults.MGC, 10);
  assert.equal(state.settings.mults.GC, 100);
});

test('computeDrawdown: $ pokles je rovnaký ako pri starom výpočte len z kumulatívneho P&L (posun o konštantu nemení rozdiely)', () => {
  const pnls = [100, -50, 200, -300, 150];
  const { ddAbs } = computeDrawdown(pnls, 1000);
  // stará logika: peak/pokles len z kumulatívneho súčtu P&L, bez počiat. kapitálu
  let peak = 0, dd = 0, cum = 0;
  for (const p of pnls) { cum += p; if (cum > peak) peak = cum; const d = peak - cum; if (d > dd) dd = d; }
  assert.equal(ddAbs, dd);
});

test('computeDrawdown: % pokles je voči vrcholu equity, nie voči nule', () => {
  // vrchol equity 1000+100=1100, potom pokles o 300 na 800 → -300/1100
  const { ddAbs, ddPct } = computeDrawdown([100, -300], 1000);
  assert.equal(ddAbs, 300);
  assert.ok(Math.abs(ddPct - 300 / 1100 * 100) < 1e-9);
});

test('computeDrawdown: kým equity nikdy neprejde nad nulu, % pokles nedelí nulou', () => {
  const { ddAbs, ddPct } = computeDrawdown([-300], 0);
  assert.equal(ddAbs, 300);
  assert.equal(ddPct, 0);
});

test('returnPct: null bez kladného počiat. kapitálu, inak percento voči nemu', () => {
  assert.equal(returnPct(150, 0), null);
  assert.equal(returnPct(150, 1000), 15);
  assert.equal(returnPct(-50, 1000), -5);
});

test('fmtPct: kladné hodnoty majú +, záporné -, null je pomlčka', () => {
  assert.equal(fmtPct(5), '+5.00%');
  assert.equal(fmtPct(-5), '-5.00%');
  assert.equal(fmtPct(null), '–');
});
