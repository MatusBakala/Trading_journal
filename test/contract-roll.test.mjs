import './dom-stub.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

const { barsMatchTradePrice, pickAutoTf, TF_MAX_AGE_DAYS, YAHOO_IV } = await import('../js/ohlc-fetch.js');

const ohlc = (t, o, h, l, c) => ({ t, o, h, l, c });
const T0 = 1_700_000_000;
// obchod na MGCQ6 okolo 4160, 10 minút
const trade = (o) => Object.assign({
  symbol: 'MGCQ6', dir: 1, qty: 1, entry: 4160, exit: 4164,
  tEntry: T0, tExit: T0 + 600,
}, o);

test('barsMatchTradePrice: sviečky na rovnakej cenovej hladine sedia', () => {
  const bars = [ohlc(T0, 4159, 4163, 4158, 4162), ohlc(T0 + 300, 4162, 4166, 4161, 4165)];
  assert.equal(barsMatchTradePrice(bars, trade(), 300), true);
});

test('barsMatchTradePrice: prerollovaný front-month kontrakt (kontangová medzera) sa odhalí', () => {
  // Reálny prípad: Yahoo MGC=F sa prerollovalo z Q6 na Z6, hladina o ~$60 vyššie, kým
  // obchod stále beží na Q6. Medián tejto odchýlky bol v dátach -$60.20.
  const bars = [ohlc(T0, 4219, 4223, 4218, 4222), ohlc(T0 + 300, 4222, 4226, 4221, 4225)];
  assert.equal(barsMatchTradePrice(bars, trade(), 300), false);
});

test('barsMatchTradePrice: bežná volatilita okolo vstupu nesmie vyhlásiť nesúlad', () => {
  // vstup mimo rozsahu, ale len o pár dolárov - to je normálne (slippage, priemerná cena)
  const bars = [ohlc(T0, 4163, 4168, 4162, 4167), ohlc(T0 + 300, 4167, 4171, 4165, 4169)];
  assert.equal(barsMatchTradePrice(bars, trade(), 300), true);
});

test('barsMatchTradePrice: bez sviečok okolo obchodu sa netvrdí nič', () => {
  const bars = [ohlc(T0 - 86400, 3000, 3001, 2999, 3000)];
  assert.equal(barsMatchTradePrice(bars, trade(), 300), true);
});

test('pickAutoTf: krátky obchod spred pár dní dostane 1m, spred pár týždňov 2m', () => {
  const now = Date.now() / 1000;
  const short = 15 * 60;
  assert.equal(pickAutoTf(now - 2 * 86400, now - 2 * 86400 + short), '1m');
  assert.equal(pickAutoTf(now - 20 * 86400, now - 20 * 86400 + short), '2m');
  // za hranicou retencie 2m už musí spadnúť na 5m
  assert.equal(pickAutoTf(now - 45 * 86400, now - 45 * 86400 + short), '5m');
});

test('TF_MAX_AGE_DAYS pokrýva každý sťahovateľný intradenný timeframe', () => {
  for (const tf of ['1m', '2m', '5m', '15m', '30m', '1h']) {
    assert.ok(TF_MAX_AGE_DAYS[tf] > 0, `chýba limit retencie pre ${tf}`);
    assert.ok(YAHOO_IV[tf], `chýba Yahoo interval pre ${tf}`);
  }
  // Yahoo nemá 3m ani 10m - nesmú sa omylom dostať do ponuky
  assert.equal(YAHOO_IV['3m'], undefined);
});
