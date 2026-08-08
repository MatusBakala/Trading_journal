/**
 * Add Stacked EMAs to js/data/default-strategies.js
 * Text transcribed from Pages; only chart/diagram images embedded (not text screenshots).
 * Run: node tools/add-stacked-emas-strategy.mjs
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const defPath = path.join(root, 'js/data/default-strategies.js');
const imgDir = path.join(root, '.tmp-stacked-emas/img');
const HR = '<hr class="sep">';

/** Chart / diagram assets from Pages (not text screenshots). */
const CHART_IMAGES = [
  'img_fbf38faf.tiff', // EMA stack + confirmation candle diagram
  'img_5640f927.tiff', // USDJPY daily – bias & stacked EMAs
  'img_36ddb687.tiff', // USDJPY 30M – FVG + Trident setup
  'img_d3cddf7e.tiff', // USDJPY 30M – trade continuation
];

function chartPngPath(file) {
  const src = path.join(imgDir, file);
  const png = path.join(imgDir, file.replace(/\.tiff$/i, '-chart.png'));
  if (!fs.existsSync(src)) {
    console.warn('Missing image', file);
    return null;
  }
  if (!fs.existsSync(png)) {
    execSync(`sips -s format png "${src}" --out "${png}"`, { stdio: 'pipe' });
  }
  return png;
}

function imgTag(file) {
  const png = chartPngPath(file);
  if (!png) return '';
  const b64 = fs.readFileSync(png).toString('base64');
  return `<div class="stratDiagram"><img src="data:image/png;base64,${b64}" style="max-width:100%;display:block;border-radius:6px"></div>`;
}

function buildNotes() {
  const parts = [
    '<h2>VYTVORENÉ PRE</h2>',
    '<p>Nástroje: Forex, zlato (XAUUSD)</p>',
    '<p>Platné páry: USDJPY, EURUSD, GBPUSD, NZDUSD, USDCAD, XAUUSD</p>',
    '<p>Štýl obchodovania: Intradenný (London session)</p>',

    '<h2>PREHĽAD STRATÉGIE</h2>',
    '<p>Silný London session model so stacked EMAs, časovými vstupmi a Trident Patternom na obchody s vysokým R-multiple a presnosťou.</p>',
    '<p>Táto stratégia je navrhnutá na zachytenie obchodov s vysokým risk-to-reward tým, že obchoduje len počas London session, keď sa momentum a volatilita zvyčajne zosúladia. Nasleduje jasný, štruktúrovaný model so stacked EMAs, fair value gaps (FVG) a časovo podmienenými vstupmi na identifikáciu presných setupov s vysokou pravdepodobnosťou.</p>',
    '<p>Stratégia je postavená okolo vstupnej formácie Trident Pattern – čistý FVG, wick doji sviečky do polovice FVG a potvrdenie na ďalšej sviečke. Obchod len keď sú splnené všetky podmienky: zosúladenie viacerých EMA a potvrdenie z vyššieho timeframe biasu.</p>',
    '<p>Hoci uprednostňuje long setupy na prirodzene bullish aktívach (Gold, Nasdaq), model je smerový a funguje aj na shorty. Zameranie na kvalitu nad kvantitou – čakanie na ideálne setupy v úzkom okne a maximalizácia zisku cez pokračovanie trendu na dennom grafe.</p>',

    '<h2>INDIKÁTORY A NASTAVENIA</h2>',
    '<p>Timeframes: vstup na 30-minútovom grafe; bias a take-profit na dennom grafe.</p>',
    '<p>Stack EMA (5, 9, 13 alebo 15, 21) – musia byť jasne „stacked“ v smere obchodu (napr. long: 5 > 9 > 13 > 21). Ak sa prekrývajú alebo sú zamotané, setup je neplatný.</p>',
    '<p>200 EMA (bias) – cena nad 200 EMA: iba long setupy. Cena pod 200 EMA: iba short setupy.</p>',
    '<p>Bull Trading Candle Strength na dennom grafe (momentum): zelená = silný bullish, modrá = mierný bullish, červená = silný bearish, čierna = mierný bearish.</p>',
    imgTag('img_fbf38faf.tiff'),

    '<h2>ČASOVÉ OKNO (LONDON KILL ZONE)</h2>',
    '<p>Obchoduj len medzi 3:00 a 6:30 ráno New York čas. Vstupy musia byť v tomto okne – podľa backtestu najvyššia pravdepodobnosť.</p>',
    '<p>FVG sa ideálne formuje medzi 2:30 a 4:00 NY čas. FVG mimo kill zone ignoruj.</p>',

    '<h2>TRIDENT PATTERN – VSTUP</h2>',
    '<p>Keď si v London Kill Zone, hľadaj presne toto:</p>',
    '<p>1. Fair Value Gap (FVG)</p>',
    '<ul>',
    '<li>Na 30M grafe hľadaj 3-sviečkový FVG.</li>',
    '<li>Ideálne medzi 2:30 a 4:00 NY čas.</li>',
  '</ul>',
    '<p>2. Úroveň 50 % (Consequent Encroachment)</p>',
    '<p>Označ stred FVG – tam chceš vidieť reakciu.</p>',
    '<p>3. Trident sviečka (doji)</p>',
    '<ul>',
    '<li>Malé doji sviečka musí formovať hneď po FVG.</li>',
    '<li>Wick musí siahať do zóny 50 % FVG.</li>',
    '<li>Wick ukazuje, že jedna strana trhu sa pokúsila presunúť cenu, ale druhá ju stiahla späť.</li>',
    '</ul>',
    '<p>4. Potvrdenie na ďalšej sviečke</p>',
    '<ul>',
    '<li>Long: sviečka po doji zatvorí nad low doji.</li>',
    '<li>Short: sviečka po doji zatvorí pod high doji.</li>',
    '<li>Ak zatvorí na nesprávnej strane, setup je neplatný.</li>',
    '</ul>',
    '<p>5. Vstup</p>',
    '<p>Vstup na potvrdení alebo limit na 50 % FVG, ak si v setupe skoro.</p>',
    '<p>6. Stop loss</p>',
    '<ul>',
    '<li>Long: pod low sviečky, ktorá vytvorila FVG.</li>',
    '<li>Short: nad high sviečky, ktorá vytvorila FVG.</li>',
    '<li>Na Gold sa často nepoužíva hard stop – hlboké liquidity wicky pred behom; filter zatvorenia sviečky znižuje predčasné vyradenie.</li>',
    '</ul>',
    '<p>7. Take profit a manažment</p>',
    '<ul>',
    '<li>Ciele podľa štruktúry na dennom grafe – drž trend, kým je platný.</li>',
    '<li>Uzavri, ak EMA stratia stack alebo sa otočia.</li>',
    '<li>Uzavri pri výraznej reversal sviečke, ktorá invaliduje štruktúru.</li>',
    '</ul>',

    '<h2>VÝHODY A NEVÝHODY STRATÉGIE</h2>',
    '<p>Model je navrhnutý na kvalitné, opakovateľné setupy. „Nevýhody“ nie sú slabiny – sú to vlastnosti, ktoré vyžadujú disciplínu a správny manažment.</p>',
    '<p>Výhody</p>',
    '<ul>',
    '<li>Vysoký risk-to-reward – veľké pohyby v pomere k riziku.</li>',
    '<li>Vysoká win rate – okolo 90 % pri dodržaní všetkých pravidiel.</li>',
    '<li>Jasné pravidlá – trend, čas a pattern bez zbytočnej komplikácie.</li>',
    '<li>Žiadny overtrading – max. ~3,5 hodiny obchodovania denne.</li>',
    '<li>Silné v trendových trhoch – najlepšie na Gold a Nasdaq.</li>',
    '</ul>',
    '<p>Nevýhody (na čo si dať pozor)</p>',
    '<ul>',
    '<li>Patience – setup môže prísť len niekoľkokrát ročne.</li>',
    '<li>Úzke časové okno – musíš byť pripravený počas London session.</li>',
    '<li>PNL fluktuácie – cena môže ísť +10R a stiahnuť sa na +5R pred ďalším behom.</li>',
    '<li>Prop firm – hybrid drawdown modely môžu zničiť obchod kvôli equity resetom.</li>',
    '<li>Psychológia – ak nevydržíš sedieť na rukách, stratíš edge.</li>',
    '</ul>',

    '<h2>ROZBOR OBCHODU</h2>',
    '<p>Aktívum: USDJPY</p>',
    '<p>Kontext timeframov (daily)</p>',
    '<ul>',
    '<li>Cena obchoduje nad 200 EMA – bullish bias.</li>',
    '<li>EMA 5, 9, 13 a 21 sú čisto stacked – silný upward momentum.</li>',
    '<li>Denná štruktúra je zosúladená nahor – hľadaj len long setupy.</li>',
    '</ul>',
    imgTag('img_36ddb687.tiff'),
    '<p>Kill zone</p>',
    '<p>Čas setupu: 4:00 NY – v rámci London Kill Zone.</p>',
    '<p>Formácia FVG (30M)</p>',
    '<p>Čistý 3-sviečkový Fair Value Gap na 30-minútovom grafe v kill zone.</p>',
    '<p>Validácia Trident Patternu</p>',
    '<ul>',
    '<li>Doji sviečka hneď po FVG, wick do 50 % FVG (consequent encroachment).</li>',
    '<li>Wick ukázal absorpciu agresie predchádzajúcej strany – vysoká pravdepodobnosť reakcie.</li>',
    '<li>Ďalšia sviečka zatvorila nad low doji – Trident pattern potvrdený (long).</li>',
    '</ul>',
    '<p>Vstup, stop a riziko</p>',
    '<ul>',
    '<li>Vstup: ihneď po zatvorení potvrdenia.</li>',
    '<li>Stop loss: tesne pod low FVG sviečky.</li>',
    '<li>Cieľ: manažment podľa denného trendu – drž, kým EMA zostávajú stacked.</li>',
    '</ul>',
    imgTag('img_d3cddf7e.tiff'),
    imgTag('img_5640f927.tiff'),
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
console.log(`Stacked EMAs: ${hrs} dividers, ${imgs} chart images, ${STACKED_EMAS.notes.length} chars notes`);
console.log('Total strategies:', strategies.length);
