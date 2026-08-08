import { DEFAULT_STRATEGIES } from '../js/data/default-strategies.js';
const s = DEFAULT_STRATEGIES.find((x) => x.name === 'iFVG Model');
const chunks = ['KĽÚČOVÉ KONCEPTY', 'PRAVIDLÁ STRATÉGIE', 'ROZBOR OBCHODOV'];
for (const c of chunks) {
  const i = s.notes.indexOf(c);
  console.log('\n---', c, '---\n', s.notes.slice(i, i + 1200));
}
