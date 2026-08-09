import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DEFAULT_STRATEGIES } from '../js/data/default-strategies.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const i18nPath = path.join(root, 'js/i18n.js');
const i18nSrc = fs.readFileSync(i18nPath, 'utf8');

// Collect SK keys already in I18N_EN (rough parse of 'key':'value' pairs)
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

for (const name of order) {
  const s = DEFAULT_STRATEGIES.find((x) => x.name === name);
  if (!s) continue;
  const chunks = [...new Set(chunksFromHtml(s.notes || ''))];
  const missing = chunks.filter((t) => !known.has(t) && !known.has(t.replace(/\s+/g, ' ')));
  console.log(`\n# ${name}: ${missing.length} missing of ${chunks.length}`);
  for (const t of missing) {
    console.log('---');
    console.log(t.slice(0, 500));
  }
}
