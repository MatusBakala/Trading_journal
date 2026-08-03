/* Vygeneruje zoznam JS modulov do app-version.json.
   Boot v index.html z neho postaví import mapu, ktorá každému modulu pridá ?v=,
   inak by sa relatívne importy (./init.js) ťahali z cache aj po nasadení novej verzie.
   Spúšťa sa cez `npm run manifest`; `npm test` overí, že je zoznam aktuálny. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const jsDir = path.join(root, 'js');

export function collectModules(dir = jsDir, prefix = '') {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? prefix + '/' + entry.name : entry.name;
    if (entry.isDirectory()) out.push(...collectModules(path.join(dir, entry.name), rel));
    else if (entry.name.endsWith('.js')) out.push(rel);
  }
  return out.sort();
}

export function readVersionFile() {
  return JSON.parse(fs.readFileSync(path.join(root, 'app-version.json'), 'utf8'));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const data = readVersionFile();
  data.modules = collectModules();
  fs.writeFileSync(path.join(root, 'app-version.json'), JSON.stringify(data, null, 2) + '\n');
  console.log(`app-version.json: v=${data.v}, ${data.modules.length} modulov`);
}
