import './dom-stub.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { state } from '../js/state.js';
import { pickDataset } from '../js/trade-modal.js';
import { excursionFor } from '../js/strategy-notes.js';

const H = 3600;
const T0 = 1784498400; // 2026-07-19

/** rovnomerné sviečky okolo danej ceny */
function bars(from, to, tfSec, price) {
  const out = [];
  for (let t = from; t <= to; t += tfSec) out.push({ t, o: price, h: price + 1, l: price - 1, c: price, v: 10 });
  return out;
}
const ds = (symbol, tf, tfSec, from, to, price) => ({ key: symbol + '|' + tf, symbol, tf, bars: bars(from, to, tfSec, price) });

function withSets(sets, fn) {
  const prev = state.ohlcSets;
  state.ohlcSets = sets;
  try { return fn(); } finally { state.ohlcSets = prev; }
}

test('presný kontrakt vyhrá nad spojitou front-month sériou', () => {
  // MGC je spojitá séria - pri rollovaní skočí na iný mesiac s inou cenovou hladinou,
  // takže sviečky by k MGCQ6 obchodu nesedeli, aj keď je timeframe jemnejší
  const sets = [
    ds('MGC', '1m', 60, T0, T0 + 8 * H, 4000),
    ds('MGCQ6', '2m', 120, T0, T0 + 8 * H, 4000),
  ];
  withSets(sets, () => {
    const d = pickDataset('MGCQ6', T0 + H, T0 + H + 600);
    assert.equal(d.symbol, 'MGCQ6');
  });
});

test('dataset, ktorý čas obchodu nepokrýva, prehrá aj keď symbol sedí presne', () => {
  const sets = [
    ds('MGCZ6', '1m', 60, T0, T0 + H, 4000),              // presný, ale iné obdobie
    ds('MGC', '2m', 120, T0 + 5 * H, T0 + 9 * H, 4000),   // pokrýva
  ];
  withSets(sets, () => {
    const d = pickDataset('MGCZ6', T0 + 6 * H, T0 + 6 * H + 600);
    assert.equal(d.symbol, 'MGC', 'lepšie ukázať spojitú sériu než prázdny graf');
  });
});

test('keď nepokrýva žiadny dataset, vráti sa niečo (nie null) pre hlášku vyššie', () => {
  const sets = [ds('MGCZ6', '1m', 60, T0, T0 + H, 4000)];
  withSets(sets, () => {
    const d = pickDataset('MGCZ6', T0 + 50 * H, T0 + 50 * H + 600);
    assert.ok(d, 'volajúci na tom stavia hlášku „dataset nepokrýva čas obchodu"');
  });
});

test('zvolený timeframe nesmie prepnúť na iný kontrakt', () => {
  // pred opravou sa bral prvý dataset s daným tf, teda MGC len preto, že bol v poli skôr
  const sets = [
    ds('MGC', '2m', 120, T0, T0 + 8 * H, 4000),
    ds('MGCQ6', '2m', 120, T0, T0 + 8 * H, 4000),
    ds('MGCQ6', '1m', 60, T0, T0 + 8 * H, 4000),
  ];
  withSets(sets, () => {
    const d = pickDataset('MGCQ6', T0 + H, T0 + H + 600, '2m');
    assert.equal(d.symbol, 'MGCQ6');
    assert.equal(d.tf, '2m', 'zvolený timeframe musí zostať zachovaný');
  });
});

test('neexistujúci timeframe sa ignoruje namiesto vrátenia null', () => {
  const sets = [ds('MGCQ6', '1m', 60, T0, T0 + 8 * H, 4000)];
  withSets(sets, () => {
    const d = pickDataset('MGCQ6', T0 + H, T0 + H + 600, '30m');
    assert.equal(d.tf, '1m');
  });
});

test('graf a MAE/MFE siahnu po tom istom datasete', () => {
  // toto je celý dôvod opravy: excursionFor() uprednostňuje presný kontrakt, graf
  // predtým nie - výsledkom boli sviečky z iného kontraktu pod číslami z tohto
  const sets = [
    ds('MGC', '1m', 60, T0, T0 + 8 * H, 4000),
    ds('MGCQ6', '2m', 120, T0, T0 + 8 * H, 4000),
  ];
  const trade = { symbol: 'MGCQ6', dir: 1, qty: 1, entry: 4000, exit: 4002, stop: 3995, tEntry: T0 + H, tExit: T0 + H + 600 };
  withSets(sets, () => {
    const chart = pickDataset(trade.symbol, trade.tEntry, trade.tExit);
    const x = excursionFor(trade);
    assert.ok(x, 'excursionFor musí nájsť dáta');
    assert.equal(chart.tf, x.tf, 'timeframe grafu a MAE/MFE sa musia zhodovať');
  });
});
