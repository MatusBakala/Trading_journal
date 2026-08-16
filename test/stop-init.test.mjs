import './dom-stub.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { convertBrokerOrdersToTrades } from '../js/import-csv.js';
import { riskStop, stopMovement } from '../js/strategy-notes.js';

/* Order History od Tradovate: každá verzia stop príkazu je vlastný riadok, takže
   posúvanie stopu je v exporte prítomné - appka si z neho predtým brala jedinú
   hodnotu a zvyšok zahodila. */
const H = ['Account', 'B/S', 'Contract', 'Status', 'Filled Qty', 'Avg Fill Price', 'Fill Time', 'Type', 'Stop Price', 'Timestamp'];
const fill = (side, qty, price, t) => ['ACC1', side, 'MGCZ6', 'Filled', String(qty), String(price), t, 'Market', '', t];
const stop = (side, price, t) => ['ACC1', side, 'MGCZ6', 'Working', '', '', '', 'Stop', String(price), t];

const rowsFor = (extra) => [
  fill('Buy', 1, 4000, '2026-08-10 10:00:00'),
  ...extra,
  fill('Sell', 1, 4010, '2026-08-10 10:30:00'),
];
const only = (rows) => {
  const out = convertBrokerOrdersToTrades(H, rows, {});
  assert.equal(out.rows.length, 1);
  const col = (name) => out.rows[0][out.headers.indexOf(name)];
  return { col, headers: out.headers };
};

test('stop zadaný pred vstupom (bracket) sa už nestratí', () => {
  // pôvodný stop vzniká spolu so vstupným príkazom, teda SKÔR než sa vstup naplní;
  // staré okno `t.tEntry-1` ho vynechalo a za "prvý" považovalo až jeho úpravu
  const { col } = only(rowsFor([
    stop('Sell', 3990, '2026-08-10 09:59:30'),
    stop('Sell', 4002, '2026-08-10 10:15:00'),
  ]));
  assert.equal(col('Stop loss'), '3990', 'riziko musí stáť na pôvodnom stope, nie na utiahnutom');
  assert.equal(col('StopFinal'), '4002');
  assert.equal(col('StopMoves'), '1');
});

test('utiahnutie stopu do zisku sa nepočíta ako posun do straty', () => {
  const { col } = only(rowsFor([
    stop('Sell', 3990, '2026-08-10 10:00:05'),
    stop('Sell', 3995, '2026-08-10 10:10:00'),
    stop('Sell', 4005, '2026-08-10 10:20:00'),
  ]));
  assert.equal(col('StopMoves'), '2');
  assert.equal(col('StopWidened'), '0');
});

test('posunutie stopu ĎALEJ do straty sa zachytí (long)', () => {
  const { col } = only(rowsFor([
    stop('Sell', 3990, '2026-08-10 10:00:05'),
    stop('Sell', 3985, '2026-08-10 10:10:00'), // rozšírenie
    stop('Sell', 3980, '2026-08-10 10:20:00'), // ďalšie rozšírenie
  ]));
  assert.equal(col('Stop loss'), '3990');
  assert.equal(col('StopFinal'), '3980');
  assert.equal(col('StopMoves'), '2');
  assert.equal(col('StopWidened'), '2');
});

test('pri shorte je smer opačný – rozšírenie je stop VYŠŠIE', () => {
  const rows = [
    fill('Sell', 1, 4000, '2026-08-10 10:00:00'),
    stop('Buy', 4010, '2026-08-10 10:00:05'),
    stop('Buy', 4020, '2026-08-10 10:10:00'), // ďalej od vstupu = do straty
    stop('Buy', 4005, '2026-08-10 10:20:00'), // späť bližšie = utiahnutie
    fill('Buy', 1, 3990, '2026-08-10 10:30:00'),
  ];
  const { col } = only(rows);
  assert.equal(col('Stop loss'), '4010');
  assert.equal(col('StopWidened'), '1', 'len prvý z dvoch posunov bol do straty');
});

test('stop z PREDOŠLÉHO obchodu na tom istom symbole sa nezapočíta', () => {
  // okno siaha 120 s pred vstup, takže bez orezania podľa výstupu predošlého
  // obchodu by sa doň votrel jeho stop a druhý obchod by dostal cudzie riziko
  const rows = [
    fill('Buy', 1, 4000, '2026-08-10 10:00:00'),
    stop('Sell', 3990, '2026-08-10 10:00:05'),
    fill('Sell', 1, 4010, '2026-08-10 10:02:00'),
    fill('Buy', 1, 4020, '2026-08-10 10:03:00'), // druhý obchod, do 120 s od prvého
    stop('Sell', 4012, '2026-08-10 10:03:05'),
    fill('Sell', 1, 4030, '2026-08-10 10:10:00'),
  ];
  const out = convertBrokerOrdersToTrades(H, rows, {});
  assert.equal(out.rows.length, 2);
  const iStop = out.headers.indexOf('Stop loss');
  assert.equal(out.rows[0][iStop], '3990');
  assert.equal(out.rows[1][iStop], '4012', 'druhý obchod nesmie zdediť stop prvého');
});

test('riskStop uprednostní stopInit pred stop', () => {
  assert.equal(riskStop({ stop: 4005, stopInit: 3990 }), 3990);
  assert.equal(riskStop({ stop: 4005 }), 4005, 'bez stopInit sa použije stop');
  assert.equal(riskStop({ stop: null }), null);
  assert.equal(riskStop({}), null);
});

test('stopMovement vráti null, keď obchod históriu nemá', () => {
  assert.equal(stopMovement({ stop: 3990 }), null);
  const mv = stopMovement({ stop: 3990, stopInit: 3990, stopFinal: 3980, stopMoves: 2, stopWidened: 2 });
  assert.deepEqual(mv, { moves: 2, widened: 2, from: 3990, to: 3980 });
});
