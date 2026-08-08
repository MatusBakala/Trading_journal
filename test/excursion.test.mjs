import './dom-stub.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} !~ ${expected}`);

const { excursionFor, buildPositionSegments } = await import('../js/strategy-notes.js');
const { state } = await import('../js/state.js');

const bar = (t, h, l) => ({ t, o: h, h, l, c: h });
// ohlc() treba všade, kde sa testuje orezanie krajnej sviečky - bar() má o=c=h, takže by
// orezaný rozsah vyšiel rovnako ako plný a test by nič neoveril
const ohlc = (t, o, h, l, c) => ({ t, o, h, l, c });

test.beforeEach(() => {
  state.ohlcSets = [];
});

test('buildPositionSegments: scale-in vytvorí segmenty s narastajúcim qty a priemernou cenou', () => {
  const entryLegs = [{ qty: 2, price: 100, t: 1000 }, { qty: 3, price: 102, t: 1010 }];
  const exitLegs = [{ qty: 5, price: 99, t: 1100 }];
  const segs = buildPositionSegments(entryLegs, exitLegs, 1000, 1100);
  assert.deepEqual(segs, [
    { tStart: 1000, tEnd: 1010, qty: 2, avgPrice: 100 },
    { tStart: 1010, tEnd: 1100, qty: 5, avgPrice: 101.2 },
  ]);
});

test('buildPositionSegments: bez fillov nevráti žiadny segment', () => {
  assert.deepEqual(buildPositionSegments([], [], 1000, 1100), []);
});

// Short obchod: 2@100 vstup, potom pridané 3@102 (spolu 5, priemer 101.2), výstup 5@99.
// V okne kým bolo držaných len 2 kontrakty vyletí cena na 110 (silne proti pozícii),
// neskôr keď je už 5 kontraktov, cena sa drží v užšom pásme. Naivný výpočet (plošné
// finálne qty=5 cez celé okno) by MAE nafúkol, akoby tých 5 kontraktov bolo vystavených
// aj špičke 110 - v realite tam boli len 2.
function scaledShortTrade(withLegs) {
  const t = {
    id: 1, symbol: 'MGC', account: 1, dir: -1, qty: 5, entry: 101.2, exit: 99,
    tEntry: 1000, tExit: 1100, fees: 0, pnlOverride: null, stop: null,
  };
  if (withLegs) {
    t.entryLegs = [{ qty: 2, price: 100, t: 1000 }, { qty: 3, price: 102, t: 1010 }];
    t.exitLegs = [{ qty: 5, price: 99, t: 1100 }];
  }
  return t;
}

test('excursionFor: leg-aware MAE váži cenovú špičku iba skutočne držaným množstvom', () => {
  state.ohlcSets = [{ key: 'MGC|1m', symbol: 'MGC', tf: '1m', bars: [
    bar(1005, 110, 99), // v tomto bare bolo držaných len 2 kontrakty
    bar(1015, 102, 100), // od tejto chvíle už 5 kontraktov
    bar(1050, 101, 98),
  ] }];
  const x = excursionFor(scaledShortTrade(true));
  assert.equal(x.approx, false);
  close(x.maeMoney, -200); // 2 kontrakty × (110-100) × mult 10, nie 5×
  // posledný bar (1050-1110) presahuje tExit=1100, takže jeho low 98 sa nezaráta - mohlo
  // nastať až po výstupe. Najlepšia dokázateľná cena je fill výstupu 99: (101.2-99)×5×10
  close(x.mfeMoney, 110);
  close(x.mfeMoneyMax, 160); // horná hranica = pôvodné správanie s celým low 98
  assert.equal(x.exact, false);
});

test('excursionFor: hraničná sviečka tesne pred tEntry patrí prvému segmentu, nie poslednému', () => {
  // 1m sviečka, ktorá začína 30s pred tEntry, ale vonkajší filter (b.t+tf>t1) ju stále
  // zarátava - bežné, keď sviečka "obsahujúca" moment vstupu logicky začína o kúsok skôr.
  // Extrémny range (50-200) nech je omyl vidieť na prvý pohľad: keby sa nesprávne
  // priradila poslednému segmentu (qty=5, priemer 101.2), MAE by vyšlo -4940; správne
  // (prvý segment - pozícia sa tam ešte len otvárala - qty=2, priemer 100) je -2000.
  state.ohlcSets = [{ key: 'MGC|1m', symbol: 'MGC', tf: '1m', bars: [
    bar(970, 200, 50),
  ] }];
  const x = excursionFor(scaledShortTrade(true));
  close(x.maeMoney, -2000);
});

test('excursionFor: cena obchodu ďaleko mimo rozsahu sviečok (iný kontrakt-mesiac) sa označí ako mismatch', () => {
  // Rovnaký tvar ako reálny prípad: obchod na MGCQ6 (august) omylom priradený k
  // sviečkam z MGCZ6 (december) datasetu cez spoločný koreň "MGC" - kontangová
  // medzera medzi mesiacmi je desiatky bodov, oveľa viac než bežná volatilita.
  state.ohlcSets = [{ key: 'MGC|1m', symbol: 'MGC', tf: '1m', bars: [
    bar(1005, 4080, 4074),
    bar(1050, 4082, 4078),
  ] }];
  const t = scaledShortTrade(false);
  t.entry = 4017.6;
  const x = excursionFor(t);
  assert.deepEqual(x, { mismatch: true, tf: '1m' });
});

test('excursionFor: bez legov (manuálny/starý obchod) ostáva plošný výpočet cez celé qty - žiadna regresia', () => {
  state.ohlcSets = [{ key: 'MGC|1m', symbol: 'MGC', tf: '1m', bars: [
    bar(1005, 110, 99),
    bar(1015, 102, 100),
    bar(1050, 101, 98),
  ] }];
  const x = excursionFor(scaledShortTrade(false));
  assert.equal(x.approx, true);
  close(x.maeMoney, -440); // (110-101.2) × 5 × 10 - stará, nafúknutá hodnota
  // ako vyššie: low 98 z bara presahujúceho tExit vypadáva, ostáva exit 99
  close(x.mfeMoney, 110);
  close(x.mfeMoneyMax, 160);
});

/* ---- orezanie krajných sviečok na skutočné okno pozície ---- */

// 5m sviečky, obchod 1000-1960. Krajné sviečky (900-1200 a 1800-2100) zasahujú mimo okna.
const flatTrade = (o) => Object.assign({
  id: 9, symbol: 'MGC', account: 1, dir: 1, qty: 1, entry: 100, exit: 99,
  tEntry: 1000, tExit: 1960, fees: 0, pnlOverride: null, stop: null,
}, o);

test('excursionFor: špička v poslednej sviečke ZA výstupom sa nezaráta do MFE', () => {
  // Tvar reálneho obchodu #127: posledná 5m sviečka beží ďalej po tExit a práve v tom
  // presahu má svoje high (130) - to sa už udialo, keď bola pozícia zavretá.
  state.ohlcSets = [{ key: 'MGC|5m', symbol: 'MGC', tf: '5m', bars: [
    ohlc(900, 101, 103, 99, 100.5),   // začína pred vstupom → platí len close
    ohlc(1200, 100.5, 102, 100, 101), // celá vnútri okna → platí celé h/l
    ohlc(1500, 101, 101.5, 99.5, 100),
    ohlc(1800, 100, 130, 98, 129),    // končí po výstupe → platí len open
  ] }];
  const x = excursionFor(flatTrade());
  close(x.mfeMoney, 20);      // z high 102 sviečky celej vnútri okna
  close(x.mfeMoneyMax, 300);  // horná hranica stále vie o špičke 130
  close(x.maeMoney, -10);
  assert.equal(x.exact, false);
});

test('excursionFor: špička v prvej sviečke PRED vstupom sa nezaráta do MAE', () => {
  state.ohlcSets = [{ key: 'MGC|5m', symbol: 'MGC', tf: '5m', bars: [
    ohlc(900, 70, 130, 70, 100),        // prepad na 70 nastal pred vstupom → platí len close
    ohlc(1200, 100, 101.5, 99.5, 101),
    ohlc(1500, 101, 102, 100.5, 101.5),
    ohlc(1800, 101.5, 102, 101, 101.5),
  ] }];
  const x = excursionFor(flatTrade({ exit: 101 }));
  close(x.maeMoney, -5);
  close(x.maeMoneyMax, -300);
  assert.equal(x.exact, false);
});

test('excursionFor: keď celý obchod padne do jednej sviečky, platia len vstup a výstup', () => {
  // Z jedinej sviečky, ktorá presahuje na oboch stranách, sa nedá dokázať nič - ani open,
  // ani close nepatria do okna pozície.
  state.ohlcSets = [{ key: 'MGC|5m', symbol: 'MGC', tf: '5m', bars: [
    ohlc(900, 90, 150, 50, 95),
  ] }];
  const x = excursionFor(flatTrade({ tExit: 1100, exit: 105 }));
  close(x.mfeMoney, 50);   // len z výstupu 105
  close(x.maeMoney, 0);    // nič horšie než vstup sa dokázať nedá
  close(x.mfeMoneyMax, 500);
});

test('excursionFor: keď sú všetky sviečky celé vnútri okna, exact je true a hranice sa rovnajú', () => {
  state.ohlcSets = [{ key: 'MGC|5m', symbol: 'MGC', tf: '5m', bars: [
    ohlc(1200, 100, 102, 99, 101),
    ohlc(1500, 101, 103, 100, 102),
  ] }];
  const x = excursionFor(flatTrade({ tEntry: 1200, tExit: 1800, exit: 102 }));
  assert.equal(x.exact, true);
  close(x.mfeMoney, 30);
  close(x.mfeMoneyMax, 30);
  close(x.maeMoney, -10);
  close(x.maeMoneyMax, -10);
});

test('excursionFor: MFE neklesne pod realizovaný zisk, aj keď ho sviečky nepokrývajú', () => {
  // Kľúčový invariant: cenu výstupu trh dosiahol z definície. Jediná sviečka okno
  // presahuje na oboch stranách a jej high (105) je pod výstupom (110) - bez zarátania
  // výstupu by MFE ($100) vyšlo nižšie než realizovaný zisk ($200), čo je nemožné.
  state.ohlcSets = [{ key: 'MGC|5m', symbol: 'MGC', tf: '5m', bars: [
    ohlc(900, 100, 105, 99, 101),
  ] }];
  const t = flatTrade({ qty: 2, tExit: 1100, exit: 110 });
  const x = excursionFor(t);
  const gross = (t.exit - t.entry) * t.dir * t.qty * 10;
  assert.ok(x.mfeMoney >= gross - 1e-6, `MFE ${x.mfeMoney} < hrubý zisk ${gross}`);
  close(x.mfeMoney, 200);
});

test('excursionFor: pri škálovanom výstupe sa zaráta cena samotného fillu, nielen sviečky', () => {
  // Sviečka okolo výstupu presahuje za tExit, takže z nej platí len open (100) - najlepšia
  // dokázateľná cena je fill výstupu 108 pri vtedy držaných 2 kontraktoch.
  state.ohlcSets = [{ key: 'MGC|5m', symbol: 'MGC', tf: '5m', bars: [
    ohlc(1200, 100, 101, 99, 100.5),
    ohlc(1500, 100.5, 101, 100, 100),
  ] }];
  const t = flatTrade({
    tEntry: 1200, tExit: 1700, qty: 2, entry: 100, exit: 108,
    entryLegs: [{ qty: 2, price: 100, t: 1200 }],
    exitLegs: [{ qty: 2, price: 108, t: 1700 }],
  });
  const x = excursionFor(t);
  assert.equal(x.approx, false);
  close(x.mfeMoney, 160); // (108-100) × 2 kontrakty × mult 10
});

test('excursionFor: jeden entry leg zodpovedajúci t.qty/t.entry dá identický výsledok ako bez legov', () => {
  state.ohlcSets = [{ key: 'MGC|1m', symbol: 'MGC', tf: '1m', bars: [
    bar(1005, 110, 99),
    bar(1050, 101, 98),
  ] }];
  const noLegs = excursionFor(scaledShortTrade(false));
  const t = scaledShortTrade(false);
  t.entryLegs = [{ qty: 5, price: 101.2, t: 1000 }];
  t.exitLegs = [{ qty: 5, price: 99, t: 1100 }];
  const withLegs = excursionFor(t);
  close(withLegs.maeMoney, noLegs.maeMoney);
  close(withLegs.mfeMoney, noLegs.mfeMoney);
});
