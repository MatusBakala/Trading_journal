/**
 * Add Stacked EMAs to js/data/default-strategies.js
 * Run: node tools/add-stacked-emas-strategy.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const defPath = path.join(root, 'js/data/default-strategies.js');
const imgDir = path.join(root, '.tmp-stacked-emas/img');
const HR = '<hr class="sep">';

const IMAGE_FILES = [
  'img_109c9779.png',
  'img_e03a036d.png',
  'img_f99fc98d.png',
  'img_ad193a60.png',
];

function imgTag(file) {
  const p = path.join(imgDir, file);
  if (!fs.existsSync(p)) {
    console.warn('Missing image', file);
    return '';
  }
  const b64 = fs.readFileSync(p).toString('base64');
  return `<div class="stratDiagram"><img src="data:image/png;base64,${b64}" style="max-width:100%;display:block;border-radius:6px"></div>`;
}

function buildNotes() {
  const parts = [
    '<h2>VYTVORENÉ PRE</h2>',
    '<p>Nástroje: Forex, zlato (XAUUSD)</p>',
    '<p>Platné páry: USDJPY, EURUSD, GBPUSD, NZDUSD, USDCAD, XAUUSD</p>',
    '<p>Štýl obchodovania: Intradenný (London session)</p>',
    '<h2>PREHĽAD STRATÉGIE</h2>',
    '<p>Stacked EMAs je silný <strong>London session</strong> model, ktorý kombinuje <strong>stack EMA</strong>, <strong>časové vstupy</strong> a <strong>Trident Pattern</strong> na zachytenie obchodov s vysokým R-multiple s presnosťou. Vstup na <strong>30-minútovom</strong> grafe, bias a ciele na <strong>dennom</strong> grafe.</p>',
    '<h2>INDIKÁTORY A NASTAVENIA</h2>',
    '<p><strong>Stack EMA (5, 9, 13 alebo 15, 21)</strong> – musia byť jasne „stacked“ v smere obchodu (napr. long: 5 > 9 > 13 > 21). Ak sa prekrývajú alebo sú zamotané, setup je neplatný.</p>',
    '<p><strong>200 EMA (bias)</strong> – cena nad 200 EMA: iba long setupy. Cena pod 200 EMA: iba short setupy.</p>',
    '<p><strong>Bull Trading Candle Strength</strong> na dennom grafe (momentum): zelená = silný bullish, modrá = mierný bullish, červená = silný bearish, čierna = mierný bearish.</p>',
    imgTag('img_109c9779.png'),
    '<h2>ČASOVÉ OKNO (LONDON KILL ZONE)</h2>',
    '<p>Obchoduj len medzi <strong>3:00 a 6:30 ráno New York čas</strong>. FVG sa ideálne formuje medzi <strong>2:30 a 4:00</strong> NY čas.</p>',
    '<h2>TRIDENT PATTERN – VSTUP</h2>',
    '<p>Všetky podmienky musia súhlasiť:</p>',
    '<ul>',
    '<li>EMA 5, 9, 13 a 21 sú stacked v smere obchodu</li>',
    '<li>Cena je na správnej strane 200 EMA (bias)</li>',
    '<li>Formuje sa <strong>Fair Value Gap (FVG)</strong></li>',
    '<li><strong>Doji</strong> sviečka wickuje do aspoň <strong>50 % (stred)</strong> FVG zóny</li>',
    '<li><strong>Potvrdenie:</strong> ďalšia sviečka zatvorí <strong>pod high doji</strong> (short) alebo <strong>nad low doji</strong> (long)</li>',
    '</ul>',
    imgTag('img_e03a036d.png'),
    '<h2>STOP LOSS A EXIT</h2>',
    '<ul>',
    '<li><strong>Stop loss</strong> pod low FVG sviečky (long) alebo nad high FVG sviečky (short)</li>',
    '<li>Uzavri obchod, ak EMA stratia stack alebo sa otočia</li>',
    '<li>Uzavri obchod pri silnej reversal sviečke na dennom grafe</li>',
    '</ul>',
    imgTag('img_f99fc98d.png'),
    '<h2>PRÍKLAD SETUPU</h2>',
    '<p>Na 30M grafe je viditeľný stack EMA v smere shortu, FVG v kill zone a Trident Pattern – doji do polovice FVG s potvrdením na ďalšej sviečke. Stop nad high FVG, cieľ na ďalšej štruktúre alebo podľa denného biasu.</p>',
    imgTag('img_ad193a60.png'),
  ];
  return parts.join('');
}

function formatNotes(html) {
  let h = html.replace(/<hr class="sep">\s*/g, '');
  let h2Count = 0;
  h = h.replace(/<h2>/g, () => {
    if (h2Count++ === 0) return '<h2>';
    return HR + '<h2>';
  });
  h = h.replace(/<p>(<strong>|<b>)/g, (m) => HR + m);
  h = h.replace(/(<hr class="sep">\s*)+/g, HR);
  return h;
}

const STACKED_EMAS = {
  name: 'Stacked EMAs',
  description:
    'Stacked EMAs je London session model s časovými vstupmi, stackom EMA (5/9/13/21) a Trident Patternom (doji do 50 % FVG) pre obchody s vysokým R-multiple. Bias z 200 EMA na dennom grafe.',
  rules: [
    'Obchod len v London Kill Zone (3:00–6:30 NY čas)',
    'EMA 5, 9, 13 (15) a 21 sú jasne stacked v smere obchodu',
    'Bias podľa 200 EMA – long len nad, short len pod',
    'FVG vytvorený v obchodnom okne (ideálne 2:30–4:00 NY)',
    'Doji wickuje do 50 % FVG (Trident Pattern)',
    'Potvrdenie: ďalšia sviečka zatvorí pod high doji (short) / nad low doji (long)',
    'Stop pod low FVG (long) / nad high FVG (short)',
    'Exit pri strate EMA stacku alebo silnej reversal sviečke na daily',
  ],
  notes: formatNotes(buildNotes()),
};

const { DEFAULT_STRATEGIES } = await import(`file://${defPath}`);
const strategies = DEFAULT_STRATEGIES.filter((s) => s.name !== 'Stacked EMAs');
strategies.push(STACKED_EMAS);

function strategyLine(s) {
  return `  {name:${JSON.stringify(s.name)},description:${JSON.stringify(s.description)},rules:${JSON.stringify(s.rules)},notes:${JSON.stringify(s.notes)}},`;
}

const out = `export const DEFAULT_STRATEGIES=[\n${strategies.map(strategyLine).join('\n')}\n];\n`;
const tmpPath = path.join(root, 'js/data/default-strategies.validate.js');
fs.writeFileSync(tmpPath, out);
await import(`file://${tmpPath}`);
fs.renameSync(tmpPath, defPath);

const hrs = (STACKED_EMAS.notes.match(/hr class="sep"/g) || []).length;
const imgs = (STACKED_EMAS.notes.match(/data:image/g) || []).length;
console.log(`Stacked EMAs: ${hrs} dividers, ${imgs} images, ${STACKED_EMAS.notes.length} chars notes`);
console.log('Total strategies:', strategies.length);
