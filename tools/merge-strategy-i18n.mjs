/**
 * Merge strategy note translations into js/data/strategy-i18n-en.js
 * Run: node tools/merge-strategy-i18n.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { TRANSLATIONS } from './strategy-translations.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const missingPath = path.join(root, 'tools/strategy-i18n-missing.json');
const outPath = path.join(root, 'js/data/strategy-i18n-en.js');

const missing = JSON.parse(fs.readFileSync(missingPath, 'utf8'));
const all = { ...TRANSLATIONS };

// Entity aliases for HTML text nodes (browser decodes &amp; → &)
for (const [sk, en] of Object.entries(TRANSLATIONS)) {
  if (sk.includes('&amp;')) {
    const decoded = sk.replace(/&amp;/g, '&');
    if (!all[decoded]) all[decoded] = en;
  }
}

let covered = 0;
let gaps = [];
for (const chunks of Object.values(missing)) {
  for (const sk of chunks) {
    if (all[sk]) covered++;
    else gaps.push(sk);
  }
}

const lines = ['export const STRATEGY_I18N_EN = {'];
for (const [sk, en] of Object.entries(all)) {
  lines.push(`  ${JSON.stringify(sk)}: ${JSON.stringify(en)},`);
}
lines.push('};', '');

fs.writeFileSync(outPath, lines.join('\n'));
console.log(`Written ${Object.keys(all).length} entries to ${outPath}`);
console.log(`Missing coverage: ${gaps.length} of ${covered + gaps.length}`);
if (gaps.length) {
  console.log('Still missing:');
  gaps.slice(0, 20).forEach((g) => console.log(' -', g.slice(0, 100)));
}
