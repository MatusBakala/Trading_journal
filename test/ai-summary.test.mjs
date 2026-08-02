import './dom-stub.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

const { buildAiSummary, groupStats, tagStats, topByImpact } = await import('../js/ai.js');
const { state } = await import('../js/state.js');

const trade = (o) => Object.assign({
  symbol: 'MGC', account: 1, dir: 1, qty: 1, entry: 2000, exit: 2001,
  tEntry: 1_800_000_000, tExit: 1_800_000_600, fees: 0, pnlOverride: null,
  tags: [], tagsNeg: [], strategyId: null, checkedRules: null,
}, o);

test.beforeEach(() => { state.strategies = []; state.trades = []; state.ohlcSets = []; });

test('topByImpact: radí podľa veľkosti dopadu, nie podľa znamienka', () => {
  const rows = [{ pnl: 5 }, { pnl: -100 }, { pnl: 40 }, { pnl: -1 }];
  assert.deepEqual(topByImpact(rows, 3).map(r => r.pnl), [-100, 40, 5]);
});

test('topByImpact: nemení vstupné pole', () => {
  const rows = [{ pnl: 1 }, { pnl: -9 }];
  topByImpact(rows, 1);
  assert.deepEqual(rows.map(r => r.pnl), [1, -9]);
});

test('tagStats: sčíta P&L a winrate pre každý tag', () => {
  const closed = [
    trade({ exit: 2002, tagsNeg: ['FOMO'] }),          // +20
    trade({ exit: 1999, tagsNeg: ['FOMO', 'stop'] }),  // -10
  ];
  const rows = tagStats(closed, 'tagsNeg');
  const fomo = rows.find(r => r.tag === 'FOMO');
  assert.equal(fomo.trades, 2);
  assert.equal(fomo.pnl, 10);
  assert.equal(fomo.winRatePct, 50);
  assert.equal(rows.find(r => r.tag === 'stop').trades, 1);
});

test('tagStats: obchod bez tagov nič nepridá', () => {
  assert.deepEqual(tagStats([trade({})], 'tagsNeg'), []);
});

test('buildAiSummary: otvorené pozície sa nerátajú, ale sú priznané', () => {
  const open = trade({ exit: NaN, tExit: null });
  state.trades = [trade({ exit: 2002 }), open];
  const s = buildAiSummary(state.trades);
  assert.equal(s.totalClosedTrades, 1);
  assert.equal(s.openPositionsNotCounted, 1, 'AI musí vedieť, že nejaká pozícia beží');
});

test('buildAiSummary: dodržiavanie pravidiel sa počíta zo zaškrtnutých pravidiel', () => {
  state.strategies = [{ id: 1, name: 'iFVG', rules: ['a', 'b', 'c', 'd'] }];
  state.trades = [
    trade({ exit: 2002, strategyId: 1, checkedRules: ['a', 'b', 'c', 'd'] }), // 100 %
    trade({ exit: 1999, strategyId: 1, checkedRules: ['a', 'b'] }),           // 50 %
  ];
  const [s] = buildAiSummary(state.trades).strategiesAndRuleAdherence;
  assert.equal(s.strategy, 'iFVG');
  assert.equal(s.trades, 2);
  assert.equal(s.ruleAdherencePct, 75);
});

test('buildAiSummary: stratégia bez obchodov v období sa neposiela', () => {
  state.strategies = [{ id: 1, name: 'Pouzita', rules: [] }, { id: 2, name: 'Nepouzita', rules: [] }];
  state.trades = [trade({ strategyId: 1 })];
  const names = buildAiSummary(state.trades).strategiesAndRuleAdherence.map(s => s.strategy);
  assert.deepEqual(names, ['Pouzita']);
});

test('buildAiSummary: chyby sú zoradené podľa dopadu', () => {
  state.trades = [
    trade({ exit: 1990, tagsNeg: ['revenge'] }),  // -100
    trade({ exit: 1999, tagsNeg: ['nuda'] }),     // -10
  ];
  const tags = buildAiSummary(state.trades).mistakeTags;
  assert.equal(tags[0].tag, 'revenge', 'najdrahšia chyba ide prvá');
});

test('buildAiSummary: doba držania víťazov a porazených zvlášť', () => {
  state.trades = [
    trade({ exit: 2002, tEntry: 1000, tExit: 1060 }),  // víťaz, 60 s
    trade({ exit: 1998, tEntry: 2000, tExit: 2600 }),  // strata, 600 s
  ];
  const s = buildAiSummary(state.trades);
  assert.equal(s.avgHoldSecondsWinners, 60);
  assert.equal(s.avgHoldSecondsLosers, 600, 'držať straty dlhšie než zisky je vlastný signál');
});

test('buildAiSummary: max drawdown je záporný a berie poradie obchodov', () => {
  state.trades = [
    trade({ exit: 2005, tEntry: 100, tExit: 200 }),   // +100
    trade({ exit: 1997, tEntry: 300, tExit: 400 }),   // -30
    trade({ exit: 1998, tEntry: 500, tExit: 600 }),   // -20
  ];
  assert.equal(buildAiSummary(state.trades).maxDrawdown, -50);
});

test('buildAiSummary: poplatky sa sčítajú', () => {
  state.trades = [trade({ fees: 1.34 }), trade({ fees: 2.66 })];
  assert.equal(buildAiSummary(state.trades).feesTotal, 4);
});

test('buildAiSummary: bez sviečok je excursion null, nie chyba', () => {
  state.trades = [trade({})];
  assert.equal(buildAiSummary(state.trades).excursion, null);
});

test('buildAiSummary: prázdny žurnál nespadne', () => {
  const s = buildAiSummary([]);
  assert.equal(s.totalClosedTrades, 0);
  assert.equal(s.winRatePct, 0);
  assert.equal(s.profitFactor, null);
  assert.deepEqual(s.mistakeTags, []);
  assert.deepEqual(s.strategiesAndRuleAdherence, []);
});

test('groupStats: zoskupí a spočíta winrate', () => {
  const rows = groupStats([trade({ exit: 2002 }), trade({ exit: 1998 })], () => 'MGC');
  assert.equal(rows[0].trades, 2);
  assert.equal(rows[0].winRatePct, 50);
});
