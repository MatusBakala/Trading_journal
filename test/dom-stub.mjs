/* Appka je písaná priamo pre prehliadač a pár modulov siaha na `document`/`window`
   už pri načítaní (napr. tabs.js si vešia listenery na navigáciu). Aby sa dali
   testovať čisté funkcie bez jsdom a bez závislostí, stačí týmto modulom podstrčiť
   minimálne globály. Importuj tento súbor PRED akýmkoľvek modulom z js/. */
const noop = () => {};
const emptyList = Object.assign([], { forEach: Array.prototype.forEach });

const elementStub = {
  value: '',
  textContent: '',
  innerHTML: '',
  style: {},
  dataset: {},
  classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
  addEventListener: noop,
  removeEventListener: noop,
  appendChild: noop,
  querySelector: () => null,
  querySelectorAll: () => emptyList,
  closest: () => null,
  focus: noop,
  click: noop,
};

globalThis.document = {
  documentElement: { dataset: {}, lang: 'sk', style: {} },
  body: elementStub,
  head: elementStub,
  addEventListener: noop,
  removeEventListener: noop,
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => emptyList,
  createElement: () => ({ ...elementStub }),
};

globalThis.window = {
  confirm: () => true,
  alert: noop,
  addEventListener: noop,
  location: { search: '', pathname: '/', hash: '' },
};

globalThis.localStorage = {
  _d: new Map(),
  getItem(k) { return this._d.has(k) ? this._d.get(k) : null; },
  setItem(k, v) { this._d.set(k, String(v)); },
  removeItem(k) { this._d.delete(k); },
  clear() { this._d.clear(); },
};

globalThis.getComputedStyle = () => ({ getPropertyValue: () => '' });

globalThis.MutationObserver = class {
  observe() {}
  disconnect() {}
  takeRecords() { return []; }
};
