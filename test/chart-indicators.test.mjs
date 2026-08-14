import './dom-stub.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

const { parsePeriods, EMA_COLORS } = await import('../js/trade-modal.js');

test('parsePeriods: zoznam EMA period sa načíta, zoradí a odduplikuje', () => {
  assert.deepEqual(parsePeriods('5,9,13,21,200'), [5, 9, 13, 21, 200]);
  assert.deepEqual(parsePeriods('21 9  13'), [9, 13, 21], 'medzery aj bodkočiarky fungujú ako oddeľovač');
  assert.deepEqual(parsePeriods('9,9,9'), [9], 'duplicity by kreslili čiary na sebe');
});

test('parsePeriods: nezmysly a hodnoty mimo rozsahu sa ticho zahodia', () => {
  assert.deepEqual(parsePeriods('abc'), []);
  assert.deepEqual(parsePeriods(''), []);
  assert.deepEqual(parsePeriods(null), []);
  assert.deepEqual(parsePeriods('1,0,-5,900,20'), [20], 'perióda musí byť 2..500');
});

test('parsePeriods: počet je obmedzený, aby graf neostal nečitateľný', () => {
  const many = parsePeriods('2,3,4,5,6,7,8,9,10,11,12');
  assert.ok(many.length <= EMA_COLORS.length, 'viac EMA než farieb by kreslilo rovnakou farbou');
  assert.deepEqual(parsePeriods('2,3,4,5,6,7', 3), [2, 3, 4]);
});
