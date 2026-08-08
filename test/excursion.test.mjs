import './dom-stub.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} !~ ${expected}`);

const { excursionFor, buildPositionSegments, plausibleBarRange, medianBarRange } = await import('../js/strategy-notes.js');
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

test('excursionFor: viac kontraktov bez rozpisu fillov sa označí ako flatQtyRisk', () => {
  state.ohlcSets = [{ key: 'MGC|1m', symbol: 'MGC', tf: '1m', bars: [
    bar(1005, 110, 99), bar(1050, 101, 98),
  ] }];
  // qty 5, žiadne legy -> počíta sa s 5 kontraktmi po celý čas, hoci časť mohla byť
  // zavretá skôr; presne prípad obchodov naimportovaných bez detailu fillov
  assert.equal(excursionFor(scaledShortTrade(false)).flatQtyRisk, true);
  // s rozpisom fillov sa váži skutočne držaným množstvom - varovanie netreba
  assert.equal(excursionFor(scaledShortTrade(true)).flatQtyRisk, false);
});

test('excursionFor: jeden kontrakt bez legov nie je riziko - škálovať sa nedá', () => {
  state.ohlcSets = [{ key: 'MGC|1m', symbol: 'MGC', tf: '1m', bars: [
    bar(1005, 110, 99), bar(1050, 101, 98),
  ] }];
  const t = scaledShortTrade(false);
  t.qty = 1;
  assert.equal(excursionFor(t).flatQtyRisk, false);
});

/* ---- chybné ticky v dátach ---- */

test('excursionFor: zaseknutý chybný tick (dlhý fúz) sa nezaráta do MFE', () => {
  // Presný tvar z reálnych dát: sviečky sa hýbu v pásme ~$3, jedna má high $27 nad telom.
  // Bar je celý vnútri okna, takže orezanie okna ho nezachytí - musí ho zachytiť filter.
  const bars = [];
  for (let i = 0; i < 12; i++) bars.push(ohlc(1200 + i * 120, 4160, 4162, 4159, 4161));
  bars[6] = ohlc(1200 + 6 * 120, 4159.2, 4186.9, 4158.2, 4158.7); // chybný tick
  state.ohlcSets = [{ key: 'MGC|2m', symbol: 'MGC', tf: '2m', bars }];
  const x = excursionFor({
    id: 30, symbol: 'MGC', account: 1, dir: 1, qty: 1, entry: 4160, exit: 4159,
    tEntry: 1200, tExit: 1200 + 12 * 120, fees: 0, pnlOverride: null, stop: null,
  });
  assert.equal(x.badTicks, 1);
  close(x.mfeMoney, 20); // z reálneho high 4162, nie zo 4186.9
});

test('excursionFor: prudký, ale reálny pohyb (veľké telo sviečky) sa NEorezáva', () => {
  // Rovnako veľký rozsah ako pri chybnom ticku, ale cena tam naozaj došla a zostala -
  // prejaví sa to na tele (open→close), nie ako fúz, ktorý sa hneď vráti.
  const bars = [];
  for (let i = 0; i < 6; i++) bars.push(ohlc(1200 + i * 120, 4160, 4162, 4159, 4161));
  bars.push(ohlc(1200 + 6 * 120, 4161, 4187, 4160, 4186)); // skutočný výstrel, close hore
  for (let i = 7; i < 12; i++) bars.push(ohlc(1200 + i * 120, 4186, 4188, 4185, 4187));
  state.ohlcSets = [{ key: 'MGC|2m', symbol: 'MGC', tf: '2m', bars }];
  const x = excursionFor({
    id: 31, symbol: 'MGC', account: 1, dir: 1, qty: 1, entry: 4160, exit: 4187,
    tEntry: 1200, tExit: 1200 + 12 * 120, fees: 0, pnlOverride: null, stop: null,
  });
  assert.equal(x.badTicks, 0, 'reálny pohyb sa nesmie orezať');
  close(x.mfeMoney, 280); // (4188-4160) × mult 10
});

test('plausibleBarRange: bez odhadu bežného rozpätia sa neorezáva nič', () => {
  const b = ohlc(0, 100, 999, 1, 100);
  assert.deepEqual(plausibleBarRange(b, 0), { hi: 999, lo: 1, clamped: false });
});

test('medianBarRange: ignoruje nulové rozpätia a vracia medián', () => {
  assert.equal(medianBarRange([ohlc(0, 1, 3, 1, 2), ohlc(1, 1, 1, 1, 1), ohlc(2, 1, 9, 1, 5)]), 8);
});

/* ---- rozlišovanie kontraktných mesiacov ---- */

test('excursionFor: dataset presného kontraktu má prednosť pred jemnejším koreňovým', () => {
  // MGC|1m je spojitá front-month séria, ktorá sa už prerollovala na iný mesiac (hladina
  // 4230), kým obchod beží na MGCQ6 okolo 4160. Jemnejší timeframe tu nesmie rozhodnúť -
  // inak MAE/MFE vyjde z cien cudzieho kontraktu.
  state.ohlcSets = [
    { key: 'MGC|1m', symbol: 'MGC', tf: '1m', bars: [
      ohlc(1200, 4230, 4232, 4229, 4231), ohlc(1260, 4231, 4233, 4230, 4232),
    ] },
    { key: 'MGCQ6|5m', symbol: 'MGCQ6', tf: '5m', bars: [
      ohlc(1200, 4160, 4163, 4159, 4162), ohlc(1500, 4162, 4165, 4161, 4164),
    ] },
  ];
  const x = excursionFor({
    id: 20, symbol: 'MGCQ6', account: 1, dir: 1, qty: 1, entry: 4160, exit: 4164,
    tEntry: 1200, tExit: 1800, fees: 0, pnlOverride: null, stop: null,
  });
  assert.equal(x.tf, '5m', 'musí vyhrať dataset presného kontraktu, nie jemnejší koreňový');
  close(x.mfeMoney, 50); // (4165-4160) × mult 10
});

test('excursionFor: pri rovnakej presnosti symbolu rozhoduje jemnejší timeframe', () => {
  state.ohlcSets = [
    { key: 'MGCQ6|5m', symbol: 'MGCQ6', tf: '5m', bars: [ohlc(1200, 4160, 4170, 4159, 4164)] },
    { key: 'MGCQ6|1m', symbol: 'MGCQ6', tf: '1m', bars: [
      ohlc(1200, 4160, 4163, 4159, 4162), ohlc(1260, 4162, 4165, 4161, 4164),
    ] },
  ];
  const x = excursionFor({
    id: 21, symbol: 'MGCQ6', account: 1, dir: 1, qty: 1, entry: 4160, exit: 4164,
    tEntry: 1200, tExit: 1320, fees: 0, pnlOverride: null, stop: null,
  });
  assert.equal(x.tf, '1m');
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
