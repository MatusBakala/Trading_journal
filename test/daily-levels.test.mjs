import './dom-stub.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

const { parseHhmm, fmtHhmm, dailyLevels, levelsMatchTrade, levelsForTrade } = await import('../js/trade-modal.js');
const { state } = await import('../js/state.js');

/* Časy sa stavajú cez lokálny Date, nie cez pevné unix čísla - dayKey aj minsOfDay
   pracujú v lokálnom čase, takže test musí byť nezávislý od zóny stroja. */
const ts = (y, m, d, h, mi) => Math.floor(new Date(y, m - 1, d, h, mi).getTime() / 1000);
const bar = (t, h, l) => ({ t, o: (h + l) / 2, h, l, c: (h + l) / 2 });

const RTH = parseHhmm('15:30');

test('parseHhmm: prijme HH:MM aj bez oddeľovača, odmietne nezmysly', () => {
  assert.equal(parseHhmm('15:30'), 15 * 60 + 30);
  assert.equal(parseHhmm('9:00'), 540);
  assert.equal(parseHhmm('0930'), 570);
  assert.equal(parseHhmm('14.20'), 14 * 60 + 20);
  assert.equal(parseHhmm('24:00'), null, 'hodina musí byť 0..23');
  assert.equal(parseHhmm('12:60'), null, 'minúta musí byť 0..59');
  assert.equal(parseHhmm('abc'), null);
  assert.equal(parseHhmm(''), null);
  assert.equal(parseHhmm(null), null);
});

test('fmtHhmm: minúty od polnoci sa vrátia ako HH:MM s nulami vpredu', () => {
  assert.equal(fmtHhmm(570), '09:30');
  assert.equal(fmtHhmm(0), '00:00');
  assert.equal(fmtHhmm(15 * 60 + 30), '15:30');
});

test('dailyLevels: PDH/PDL sú z predošlého dňa, ONH/ONL z noci dňa obchodu', () => {
  const bars = [
    bar(ts(2026, 8, 11, 10, 0), 100, 90),   // predošlý deň
    bar(ts(2026, 8, 11, 20, 0), 105, 95),   // predošlý deň - tu je PDH
    bar(ts(2026, 8, 12, 3, 0), 102, 88),    // noc dňa obchodu - ONL
    bar(ts(2026, 8, 12, 14, 0), 103, 99),   // stále noc (pred 15:30) - ONH
    bar(ts(2026, 8, 12, 16, 0), 120, 80),   // RTH - do ONH/ONL nesmie
  ];
  const lv = dailyLevels(bars, ts(2026, 8, 12, 16, 30), RTH);
  assert.equal(lv.pdh, 105);
  assert.equal(lv.pdl, 90);
  assert.equal(lv.onh, 103, 'RTH sviečka (120) sa do ONH nesmie dostať');
  assert.equal(lv.onl, 88);
  assert.equal(lv.prevDay, '2026-08-11');
});

test('dailyLevels: predošlý deň = najbližší deň so sviečkami, nie kalendárne -1 (víkendy/sviatky)', () => {
  const bars = [
    bar(ts(2026, 8, 7, 12, 0), 105, 95),    // piatok
    bar(ts(2026, 8, 10, 12, 0), 130, 120),  // pondelok = deň obchodu
  ];
  const lv = dailyLevels(bars, ts(2026, 8, 10, 16, 0), RTH);
  assert.equal(lv.prevDay, '2026-08-07', 'sobota a nedeľa nemajú sviečky - berie sa piatok');
  assert.equal(lv.pdh, 105);
  assert.equal(lv.pdl, 95);
});

test('dailyLevels: pri nočnom obchode sa ONH/ONL počíta len po vstup, nie z toho, čo prišlo potom', () => {
  const bars = [
    bar(ts(2026, 8, 12, 2, 0), 101, 99),
    bar(ts(2026, 8, 12, 4, 0), 104, 96),    // pred vstupom
    bar(ts(2026, 8, 12, 8, 0), 150, 50),    // až po vstupe - to trader pri vstupe nevidel
  ];
  const lv = dailyLevels(bars, ts(2026, 8, 12, 5, 0), RTH);
  assert.equal(lv.onh, 104);
  assert.equal(lv.onl, 96);
});

test('dailyLevels: čo v dátach nie je, vráti null (radšej nič než vymyslená úroveň)', () => {
  const onlyToday = [bar(ts(2026, 8, 12, 16, 0), 120, 80)];
  const lv = dailyLevels(onlyToday, ts(2026, 8, 12, 16, 30), RTH);
  assert.equal(lv.pdh, null, 'dataset nesiaha do predošlého dňa');
  assert.equal(lv.pdl, null);
  assert.equal(lv.onh, null, 'dataset nemá ani jednu sviečku pred otvorením RTH');
  assert.equal(lv.onl, null);
  assert.equal(dailyLevels([], ts(2026, 8, 12, 16, 0), RTH), null);
  assert.equal(dailyLevels(null, ts(2026, 8, 12, 16, 0), RTH), null);
  assert.equal(dailyLevels(onlyToday, null, RTH), null, 'bez času vstupu sa nedá určiť „dnešok"');
});

test('levelsMatchTrade: rozsah z iného kontraktného mesiaca sa nepoužije', () => {
  assert.equal(levelsMatchTrade(4074, 4080, 4076), true);
  assert.equal(levelsMatchTrade(4074, 4080, 4017.6), false, 'Q6 vs Z6 kontango - iná cenová hladina');
  assert.equal(levelsMatchTrade(4074, 4080, null), true, 'bez vstupnej ceny sa nedá porovnávať - neblokuj');
  assert.equal(levelsMatchTrade(null, 4080, 4076), false);
});

test('levelsForTrade: čo v zvolenom datasete chýba, doplní sa z iného datasetu toho istého symbolu', () => {
  // 1m CSV nahraté len na deň obchodu (typický TradingView export), 5m dataset siaha ďalej
  const oneMin = {
    key: 'MGC|1m', symbol: 'MGC', tf: '1m',
    bars: [bar(ts(2026, 8, 12, 14, 0), 103, 99), bar(ts(2026, 8, 12, 16, 0), 110, 98)],
  };
  const fiveMin = {
    key: 'MGC|5m', symbol: 'MGC', tf: '5m',
    bars: [bar(ts(2026, 8, 11, 12, 0), 105, 90), bar(ts(2026, 8, 12, 16, 0), 110, 98)],
  };
  state.ohlcSets = [oneMin, fiveMin];
  const t = { symbol: 'MGC', entry: 100, tEntry: ts(2026, 8, 12, 16, 30) };
  const lv = levelsForTrade(t, oneMin, RTH);
  assert.equal(lv.onh, 103, 'noc má 1m dataset sám');
  assert.equal(lv.pdh, 105, 'predošlý deň sa dotiahol z 5m datasetu');
  assert.equal(lv.pdl, 90);
  assert.equal(lv.pdFrom, '5m', 'nech je vidno, odkiaľ úroveň je');
});

test('levelsForTrade: náhradný dataset na inej cenovej hladine sa zahodí', () => {
  const oneMin = {
    key: 'MGC|1m', symbol: 'MGC', tf: '1m',
    bars: [bar(ts(2026, 8, 12, 16, 0), 4080, 4074)],
  };
  const wrongMonth = {
    key: 'MGC|5m', symbol: 'MGC', tf: '5m',
    bars: [bar(ts(2026, 8, 11, 12, 0), 4020, 4010)],
  };
  state.ohlcSets = [oneMin, wrongMonth];
  const t = { symbol: 'MGC', entry: 4076, tEntry: ts(2026, 8, 12, 16, 30) };
  const lv = levelsForTrade(t, oneMin, RTH);
  assert.equal(lv.pdh, null, 'úroveň z iného kontraktu je horšia než žiadna');
  assert.equal(lv.pdl, null);
});
