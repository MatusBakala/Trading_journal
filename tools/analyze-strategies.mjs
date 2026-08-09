import { DEFAULT_STRATEGIES } from '../js/data/default-strategies.js';
for (const s of DEFAULT_STRATEGIES) {
  const notes = s.notes || '';
  const h2s = [...notes.matchAll(/<h2>([^<]+)<\/h2>/g)].map((m) => m[1]);
  const h3s = [...notes.matchAll(/<h3>([^<]+)<\/h3>/g)].map((m) => m[1]);
  const imgs = (notes.match(/data:image/g) || []).length;
  const hrs = (notes.match(/hr class="sep"/g) || []).length;
  console.log('\n===', s.name, '===');
  console.log('len', notes.length, 'h2', h2s.length, 'h3', h3s.length, 'imgs', imgs, 'hrs', hrs);
  console.log('h2:', h2s.join(' | '));
  if (h3s.length) console.log('h3 sample:', h3s.slice(0, 8).join(' | '));
}

const lvn = DEFAULT_STRATEGIES.find((x) => x.name === 'Low Volume Node');
const i = lvn.notes.indexOf('PRAVIDLÁ PLAYBOOKU');
console.log('\n--- LVN playbook sample ---\n', lvn.notes.slice(i, i + 2000));
