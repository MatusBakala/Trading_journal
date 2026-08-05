import './dom-stub.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';

const { DEFAULT_TRADE_REVIEW_PROMPT, buildTradeReviewPrompt } = await import('../js/trade-modal.js');

test('buildTradeReviewPrompt: prázdny template padá na DEFAULT_TRADE_REVIEW_PROMPT', () => {
  const out = buildTradeReviewPrompt('', 'Slovak', false, { a: 1 });
  assert.ok(out.startsWith(DEFAULT_TRADE_REVIEW_PROMPT.replace('{{JAZYK}}', 'Slovak')));
});

test('buildTradeReviewPrompt: {{JAZYK}} sa nahradí v custom aj default template', () => {
  const custom = 'Buď stručný. Jazyk: {{JAZYK}}.';
  const out = buildTradeReviewPrompt(custom, 'English', false, {});
  assert.ok(out.includes('Jazyk: English.'));
  assert.ok(!out.includes('{{JAZYK}}'));
});

test('buildTradeReviewPrompt: veta o sviečkach sa pridá len keď hasCandles=true', () => {
  const withCandles = buildTradeReviewPrompt('x {{JAZYK}}', 'Slovak', true, {});
  const withoutCandles = buildTradeReviewPrompt('x {{JAZYK}}', 'Slovak', false, {});
  assert.ok(withCandles.includes('sviečky pred vstupom'));
  assert.ok(!withoutCandles.includes('sviečky pred vstupom'));
});

test('buildTradeReviewPrompt: dáta obchodu (JSON) sú vždy na konci', () => {
  const data = { symbol: 'MGC', pnl: 12.5 };
  const out = buildTradeReviewPrompt('vlastný prompt', 'Slovak', false, data);
  assert.ok(out.endsWith(`Dáta (JSON):\n${JSON.stringify(data)}`));
});
