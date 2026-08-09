/**
 * Add hr.sep dividers to all default strategies.
 * Remove embedded PNG screenshots ONLY from ICT Model 3 (RTFD paste), keep trade charts elsewhere.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const defPath = path.join(root, 'js/data/default-strategies.js');
const HR = '<hr class="sep">';

const ICT_DESCRIPTION =
  'ICT Model 3 kombinuje HTF Point of Interest, Market Structure Shift s displacementom, Fair Value Gap a Optimal Trade Entry. Keď sa tieto prvky zosúladia, vytvárajú vysoko pravdepodobný setup s jasným smerovým biasom a definovaným rizikom.';

const ICT_RULES = [
  'Identifikovaný HTF POI (Order Block, Liquidity Zone alebo FVG)',
  'Liquidity grab pri HTF POI (sweep nad high pre short / pod low pre long)',
  'MSS s displacementom potvrdený (zlomenie interného high/low)',
  'FVG identifikovaný počas displacementu (discount pre long, premium pre short)',
  'OTE zóna 62–79 % v súlade s FVG',
  'Vstup v zóne FVG + OTE, stop za liquidity sweep, cieľ na HTF/external liquidity, min. R:R 1:2',
];

function buildIctNotes() {
  const parts = [
    '<h2>VYTVORENÉ PRE</h2>',
    '<p>Nástroje: Futures, forex</p>',
    '<p>Štýl obchodovania: Intradenný (Day Trading)</p>',
    '<h2>PREHĽAD STRATÉGIE</h2>',
    '<p>ICT Model 3 (<strong>HTF POI + MSS + FVG + OTE</strong>) kombinuje niekoľko kľúčových ICT konceptov: <strong>High-Timeframe Point of Interest (HTF POI)</strong>, <strong>Market Structure Shift (MSS)</strong> potvrdený <strong>displacementom</strong>, <strong>Fair Value Gap (FVG)</strong> a <strong>Optimal Trade Entry (OTE)</strong>. Keď sa tieto prvky zosúladia, vytvárajú vysoko pravdepodobný setup s jasným smerovým biasom a definovaným rizikom.</p>',
    '<h2>CHECKLIST – KROK ZA KROKOM</h2>',
    '<p><strong>Krok 1: Identifikuj High-Timeframe Point of Interest (HTF POI)</strong></p>',
    '<p>Začni nájdením významnej oblasti záujmu na vyššom timefram – môže to byť:</p>',
    '<ul><li>Order Block</li><li>Liquidity Zone</li><li>Fair Value Gap (FVG)</li></ul>',
    '<p>Tu očakávaš silnú reakciu ceny – buď zvrat, alebo prudký pohyb.</p>',
    '<p><strong>Krok 2: Počkaj na liquidity grab</strong></p>',
    '<p>Nechaj cenu vyčistiť likviditu pri HTF POI:</p>',
    '<ul><li>Pre <strong>short setup</strong> cena musí sweepovať nad predchádzajúci high.</li><li>Pre <strong>long setup</strong> cena musí sweepovať pod predchádzajúci low.</li></ul>',
    '<p>Tento pohyb vyčistí stopy a nalapí breakout traderov, čím vytvorí „palivo“ pre zvrat.</p>',
    '<p><strong>Krok 3: Sleduj Market Structure Shift (MSS) s displacementom</strong></p>',
    '<p>Po liquidity grab hľadaj potvrdenie, že smer sa mení. Platný MSS vyžaduje:</p>',
    '<ul><li>Zlomenie najbližšieho interného high (pre long) alebo low (pre short).</li><li>Zlomenie s <strong>displacementom</strong> – silný, impulzívny pohyb, ktorý ukazuje reálny momentum.</li></ul>',
    '<p>Toto potvrdí, že trh je pripravený ísť novým smerom.</p>',
    '<p><strong>Krok 4: Identifikuj Fair Value Gap (FVG)</strong></p>',
    '<p>Počas displacementu sa zvyčajne vytvorí <strong>FVG</strong> – medzera medzi sviečkami z agresívneho pohybu. Táto zóna je potenciálna oblasť vstupu.</p>',
    '<ul><li>Pre <strong>long</strong> uisti sa, že FVG je v <strong>discount zóne</strong> (pod 50 % pohybu).</li><li>Pre <strong>short</strong> uisti sa, že FVG je v <strong>premium zóne</strong> (nad 50 % pohybu).</li></ul>',
    '<p><strong>Krok 5: Použi Optimal Trade Entry (OTE)</strong></p>',
    '<p>Vstup spresni pomocou <strong>Fibonacci retracement</strong> – od low k high (long) alebo high k low (short). Zameraj sa na zónu <strong>62 % až 79 %</strong> retracementu – „sweet spot“. Najvyššia pravdepodobnosť je, keď OTE zóna súhlasí s FVG.</p>',
    '<p><strong>Krok 6: Vykonaj vstup s riadným risk managementom</strong></p>',
    '<p>Keď cena retracuje do zóny <strong>FVG + OTE</strong>:</p>',
    '<ul><li><strong>Stop loss</strong> umiestni za liquidity sweep.</li><li><strong>Cieľ</strong> na ďalšej HTF úrovni alebo external liquidity zóne.</li><li>Uisti sa, že pomer risk-to-reward je aspoň <strong>1:2</strong> alebo lepší.</li></ul>',
  ];
  return parts.join('');
}

function formatNotes(html, name) {
  let h = html || '';

  if (name === 'ICT Model 3') {
    h = h.replace(/<div class="stratDiagram"><img src="data:image\/png;base64,[^"]*"[^>]*><\/div>/gi, '');
    h = h.replace(/<img src="data:image\/png;base64,[^"]*"[^>]*>/gi, '');
  }

  h = h.replace(/<hr class="sep">\s*/g, '');

  let h2Count = 0;
  h = h.replace(/<h2>/g, () => {
    if (h2Count++ === 0) return '<h2>';
    return HR + '<h2>';
  });

  h = h.replace(/<p>(<strong>|<b>)/g, (match) => HR + match);
  h = h.replace(/(<hr class="sep">\s*)+/g, HR);

  return h;
}

function strategyLine(s) {
  return `  {name:${JSON.stringify(s.name)},description:${JSON.stringify(s.description)},rules:${JSON.stringify(s.rules)},notes:${JSON.stringify(s.notes)}},`;
}

const { DEFAULT_STRATEGIES } = await import(`file://${defPath}`);
const strategies = DEFAULT_STRATEGIES.map((s) => ({ ...s }));

if (!strategies.some((s) => s.name === 'ICT Model 3')) {
  strategies.push({
    name: 'ICT Model 3',
    description: ICT_DESCRIPTION,
    rules: ICT_RULES,
    notes: buildIctNotes(),
  });
}

const updated = strategies.map((s) => ({
  ...s,
  notes: formatNotes(s.notes, s.name),
}));

const out = `export const DEFAULT_STRATEGIES=[\n${updated.map(strategyLine).join('\n')}\n];\n`;
const tmpPath = path.join(root, 'js/data/default-strategies.validate.js');
fs.writeFileSync(tmpPath, out);

await import(`file://${tmpPath}`);
fs.renameSync(tmpPath, defPath);

for (const s of updated) {
  const hrs = (s.notes.match(/hr class="sep"/g) || []).length;
  const imgs = (s.notes.match(/data:image/g) || []).length;
  console.log(`${s.name}: ${hrs} dividers, ${imgs} images, ${s.notes.length} chars`);
}
