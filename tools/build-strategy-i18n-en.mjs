/**
 * Build js/data/strategy-i18n-en.js from tools/strategy-i18n-translations.json
 * Run: node tools/build-strategy-i18n-en.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = path.join(root, 'tools/strategy-i18n-translations.json');
const out = path.join(root, 'js/data/strategy-i18n-en.js');

const data = JSON.parse(fs.readFileSync(src, 'utf8'));
const lines = ['export const STRATEGY_I18N_EN = {'];
for (const [sk, en] of Object.entries(data)) {
  lines.push(`  ${JSON.stringify(sk)}: ${JSON.stringify(en)},`);
}
lines.push('};', '');
fs.writeFileSync(out, lines.join('\n'));
console.log('Written', Object.keys(data).length, 'entries to', out);
