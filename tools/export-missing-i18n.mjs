import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DEFAULT_STRATEGIES } from '../js/data/default-strategies.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const i18nSrc = fs.readFileSync(path.join(root, 'js/i18n.js'), 'utf8');
const known = new Set();
const keyRe = /'((?:\\'|[^'])*)':/g;
let m;
while ((m = keyRe.exec(i18nSrc))) {
  known.add(m[1].replace(/\\'/g, "'").replace(/\\n/g, '\n'));
}

function chunksFromHtml(html) {
  const out = [];
  const stripped = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|h2|h3|ul|div)>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  for (const line of stripped.split('\n')) {
    const t = line.trim();
    if (t) out.push(t);
  }
  return out;
}

const order = ['AMD Playbook', 'Low Volume Node', 'iFVG Model', 'Break & Retest', 'ICT Model 3'];
const report = {};

for (const name of order) {
  const s = DEFAULT_STRATEGIES.find((x) => x.name === name);
  const chunks = [...new Set(chunksFromHtml(s.notes || ''))];
  report[name] = chunks.filter((t) => !known.has(t));
}

fs.writeFileSync(path.join(root, 'tools/strategy-i18n-missing.json'), JSON.stringify(report, null, 2));
console.log(Object.fromEntries(Object.entries(report).map(([k, v]) => [k, v.length])));
