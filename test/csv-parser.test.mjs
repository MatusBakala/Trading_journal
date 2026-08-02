import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCSV } from '../js/csv-parser.js';

test('parseCSV: základné čiarkové CSV', () => {
  assert.deepEqual(parseCSV('a,b\n1,2'), [['a', 'b'], ['1', '2']]);
});

test('parseCSV: sám rozpozná bodkočiarku a tabulátor', () => {
  assert.deepEqual(parseCSV('a;b;c\n1;2;3'), [['a', 'b', 'c'], ['1', '2', '3']]);
  assert.deepEqual(parseCSV('a\tb\n1\t2'), [['a', 'b'], ['1', '2']]);
});

test('parseCSV: úvodzovky chránia oddeľovač aj nový riadok', () => {
  assert.deepEqual(parseCSV('a,b\n"x,y",2'), [['a', 'b'], ['x,y', '2']]);
  assert.deepEqual(parseCSV('a,b\n"riadok\nzlom",2'), [['a', 'b'], ['riadok\nzlom', '2']]);
});

test('parseCSV: zdvojená úvodzovka je jedna úvodzovka', () => {
  assert.deepEqual(parseCSV('a\n"on povedal ""ahoj"""'), [['a'], ['on povedal "ahoj"']]);
});

test('parseCSV: CRLF a BOM', () => {
  assert.deepEqual(parseCSV('﻿a,b\r\n1,2\r\n'), [['a', 'b'], ['1', '2']]);
});

test('parseCSV: prázdne riadky sa preskočia', () => {
  assert.deepEqual(parseCSV('a,b\n\n1,2\n\n'), [['a', 'b'], ['1', '2']]);
});

test('parseCSV: posledný riadok bez ukončenia', () => {
  assert.deepEqual(parseCSV('a,b\n1,2'), [['a', 'b'], ['1', '2']]);
});

test('parseCSV: prázdne bunky zostanú prázdne reťazce', () => {
  assert.deepEqual(parseCSV('a,b,c\n1,,3'), [['a', 'b', 'c'], ['1', '', '3']]);
});
