import './dom-stub.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { groupByStopMovement } from '../js/stats.js';

const pnlOf = (t) => t._pnl;
const rOf = (t) => (t._r == null ? null : t._r);
const T = (o) => Object.assign({ _pnl: 0, _r: 0 }, o);

test('obchod bez histórie stopov padne do "unknown", nie medzi neposunuté', () => {
  // "neposunutý" a "nevieme" nie je to isté - ručne zadané obchody nemajú stopMoves
  // a keby sa počítali ako neposunuté, tá skupina by pohltila skoro celý žurnál
  const g = groupByStopMovement([T({}), T({ stopMoves: 0 })], pnlOf, rOf);
  assert.equal(g.unknown, 1);
  assert.equal(g.none.n, 1);
  assert.equal(g.total, 1, 'total počíta len obchody s históriou');
});

test('rozdelenie podľa smeru posunu', () => {
  const g = groupByStopMovement([
    T({ stopMoves: 0, stopWidened: 0 }),
    T({ stopMoves: 3, stopWidened: 0 }),
    T({ stopMoves: 2, stopWidened: 1 }),
    T({ stopMoves: 5, stopWidened: 5 }),
  ], pnlOf, rOf);
  assert.equal(g.none.n, 1);
  assert.equal(g.tightened.n, 1);
  assert.equal(g.widened.n, 2, 'stačí jeden posun do straty, aby obchod patril sem');
  assert.equal(g.total, 4);
});

test('medián aj priemer R, lebo pri chvoste sa rozchádzajú', () => {
  // presne prípad z reálnych dát: medián vyzerá lepšie než -1R, priemer horšie,
  // a celý rozdiel drží jeden extrémny obchod
  const trades = [
    T({ stopMoves: 1, stopWidened: 1, _r: -0.8, _pnl: -80 }),
    T({ stopMoves: 1, stopWidened: 1, _r: -0.85, _pnl: -85 }),
    T({ stopMoves: 1, stopWidened: 1, _r: -0.9, _pnl: -90 }),
    T({ stopMoves: 1, stopWidened: 1, _r: -29, _pnl: -365 }),
  ];
  const g = groupByStopMovement(trades, pnlOf, rOf);
  assert.equal(g.widened.medianR, -0.875, 'párny počet -> priemer dvoch stredných, nie vyšší z nich');
  assert.ok(g.widened.avgR < -7, 'priemer musí ísť za chvostom, nie za mediánom');
  assert.equal(g.widened.worstR, -29);
  assert.equal(g.widened.beyond2R, 25);
});

test('win rate a P&L sa počítajú z odovzdanej funkcie', () => {
  const g = groupByStopMovement([
    T({ stopMoves: 0, _pnl: 100, _r: 1 }),
    T({ stopMoves: 0, _pnl: -50, _r: -1 }),
    T({ stopMoves: 0, _pnl: 0, _r: 0 }),
  ], pnlOf, rOf);
  assert.equal(g.none.pnl, 50);
  assert.equal(Math.round(g.none.winRate), 33, 'nula sa nepočíta ako výhra');
});

test('prázdna skupina vráti null namiesto NaN', () => {
  const g = groupByStopMovement([T({ stopMoves: 0, _pnl: 1, _r: 1 })], pnlOf, rOf);
  assert.equal(g.widened.n, 0);
  assert.equal(g.widened.medianR, null);
  assert.equal(g.widened.avgR, null);
  assert.equal(g.widened.winRate, null);
  assert.equal(g.widened.beyond2R, null);
});

test('obchody bez R (chýba stop) sa do R-štatistík nezapočítajú, ale do P&L áno', () => {
  const g = groupByStopMovement([
    T({ stopMoves: 0, _pnl: -10, _r: null }),
    T({ stopMoves: 0, _pnl: -20, _r: -2 }),
  ], pnlOf, rOf);
  assert.equal(g.none.n, 2);
  assert.equal(g.none.pnl, -30);
  assert.equal(g.none.avgR, -2, 'priemer len z obchodu, ktorý R má');
});

test('groupByStopMovement znesie prázdny vstup', () => {
  const g = groupByStopMovement(null, pnlOf, rOf);
  assert.equal(g.total, 0);
  assert.equal(g.unknown, 0);
  assert.equal(g.none.n, 0);
});
