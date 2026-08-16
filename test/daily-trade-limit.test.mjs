import './dom-stub.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { dailyTradeLimit, dayKey, dayTradeCount } from '../js/utils.js';

const ts = (iso) => Math.floor(new Date(iso).getTime() / 1000);

test('dayTradeCount počíta obchody podľa času VSTUPU, nie výstupu', () => {
  // obchod otvorený 23:50 a zavretý po polnoci patrí do dňa, kedy sa doň vstúpilo -
  // limit je o počte vstupov, nie o tom, kedy sa pozícia zavrela
  const late = { id: 1, tEntry: ts('2026-08-10T23:50:00'), tExit: ts('2026-08-11T00:20:00') };
  const next = { id: 2, tEntry: ts('2026-08-11T09:00:00'), tExit: ts('2026-08-11T09:10:00') };
  const trades = [late, next];
  assert.equal(dayTradeCount(trades, dayKey(late.tEntry)), 1);
  assert.equal(dayTradeCount(trades, dayKey(next.tEntry)), 1);
});

test('dayTradeCount vynechá editovaný obchod, aby sa nezapočítal dvakrát', () => {
  const a = { id: 7, tEntry: ts('2026-08-10T09:00:00') };
  const b = { id: 8, tEntry: ts('2026-08-10T10:00:00') };
  const day = dayKey(a.tEntry);
  assert.equal(dayTradeCount([a, b], day), 2);
  assert.equal(dayTradeCount([a, b], day, 7), 1);
  assert.equal(dayTradeCount([a, b], day, 999), 2, 'neznáme id nemá nič odčítať');
});

test('dayTradeCount znesie prázdny/neplatný vstup a obchod bez tEntry', () => {
  assert.equal(dayTradeCount(null, '2026-08-10'), 0);
  assert.equal(dayTradeCount([], '2026-08-10'), 0);
  assert.equal(dayTradeCount([{ id: 1 }, null, { id: 2, tEntry: 0 }], '2026-08-10'), 0);
});

test('dailyTradeLimit vráti null, keď limit nie je nastavený', () => {
  assert.equal(dailyTradeLimit(5, 0), null);
  assert.equal(dailyTradeLimit(5, null), null);
  assert.equal(dailyTradeLimit(5, undefined), null);
  assert.equal(dailyTradeLimit(5, -3), null);
});

test('dailyTradeLimit rozlíši "na limite" od "nad limitom"', () => {
  const under = dailyTradeLimit(5, 8);
  assert.equal(under.over, false);
  assert.equal(under.atLimit, false);
  assert.equal(under.remaining, 3);

  const at = dailyTradeLimit(8, 8);
  assert.equal(at.over, false, 'ôsmy obchod pri limite 8 ešte limit neprekračuje');
  assert.equal(at.atLimit, true);
  assert.equal(at.remaining, 0);

  const over = dailyTradeLimit(9, 8);
  assert.equal(over.over, true);
  assert.equal(over.remaining, 0, 'remaining nikdy neklesne pod nulu');
});
