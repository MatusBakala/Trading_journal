/**
 * Add "Volume Profile" to js/data/default-strategies.js + register its
 * translations in js/data/strategy-i18n-en.js and js/i18n.js.
 * Source: EN playbook provided by user (screenshots), transcribed here in SK
 * as the source of truth; EN text below is the exact original wording used
 * to populate the translation dictionaries.
 * Chart images (2x) not yet embedded – see CHART_IMAGES below.
 * Run: node tools/add-volume-profile-strategy.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const defPath = path.join(root, 'js/data/default-strategies.js');
const stratI18nPath = path.join(root, 'js/data/strategy-i18n-en.js');
const i18nPath = path.join(root, 'js/i18n.js');
const imgDir = path.join(root, '.tmp-volume-profile/img');
const HR = '<hr class="sep">';

/** [sk, en] pairs -> also usable for a single bold/plain run. */
const dict = new Map(); // sk -> en, collected as we build notesParts

/**
 * translateText() in js/i18n.js does `const t=String(s).trim()` before the
 * dictionary lookup, then `s.replace(t, d[t])` on the ORIGINAL (untrimmed)
 * node value. So the dictionary key/value must be the TRIMMED text (the
 * surrounding whitespace on the live text node is preserved automatically
 * by .replace() finding the trimmed substring inside it) -- registering the
 * untrimmed run text (with a leading/trailing space from mid-sentence
 * splits around a <strong> run) silently fails to match at runtime.
 */
function reg(sk, en) {
  const skT = sk.trim();
  const enT = en.trim();
  if (!skT) return;
  if (skT === enT) return; // identity strings need no dictionary entry
  if (dict.has(skT) && dict.get(skT) !== enT) {
    throw new Error(`Conflicting translation for "${skT}":\n  existing: ${dict.get(skT)}\n  new: ${enT}`);
  }
  dict.set(skT, enT);
}

function p(sk, en) {
  reg(sk, en);
  return `<p>${sk}</p>`;
}

function h2(sk, en) {
  reg(sk, en);
  return `<h2>${sk}</h2>`;
}

/** Bold label paragraph: <p><strong>label</strong></p> */
function bp(sk, en) {
  reg(sk, en);
  return `<p><strong>${sk}</strong></p>`;
}

/** Paragraph made of runs: each run {t:'plain'|'b', sk, en}. Runs concatenate into one <p>. */
function runP(runs) {
  let html = '<p>';
  for (const r of runs) {
    reg(r.sk, r.en);
    html += r.t === 'b' ? `<strong>${r.sk}</strong>` : r.sk;
  }
  html += '</p>';
  return html;
}

function runLi(runs) {
  let html = '<li>';
  for (const r of runs) {
    reg(r.sk, r.en);
    html += r.t === 'b' ? `<strong>${r.sk}</strong>` : r.sk;
  }
  html += '</li>';
  return html;
}

function ul(items) {
  return `<ul>${items.join('')}</ul>`;
}

function b(sk, en) {
  return { t: 'b', sk, en };
}
function t(sk, en) {
  return { t: 'p', sk, en: en ?? sk };
}

function chartImg(file, alt) {
  const png = path.join(imgDir, file);
  if (!fs.existsSync(png)) {
    console.warn('Missing chart image (skipped):', file);
    return '';
  }
  const b64 = fs.readFileSync(png).toString('base64');
  const ext = file.toLowerCase().endsWith('.jpg') || file.toLowerCase().endsWith('.jpeg') ? 'jpeg' : 'png';
  return `<div class="stratDiagram"><img src="data:image/${ext};base64,${b64}" alt="${alt}" style="max-width:100%;display:block;border-radius:6px"></div>`;
}

/** Not yet supplied by the user; script will skip silently until present. */
const CHART_IMAGES = {
  signal: 'signal-chart.png',
  outcome: 'outcome-chart.png',
};

const notesParts = [];

// ── VYTVORENÉ PRE ──
notesParts.push(h2('VYTVORENÉ PRE', 'BUILT FOR'));
notesParts.push(p('Nástroje: Opcie, Futures', 'Instruments: Options, Futures'));
notesParts.push(p('Štýl obchodovania: Intradenný aj swingový', 'Trading style: Intraday and swing'));
notesParts.push(HR);

// ── PREHĽAD STRATÉGIE ──
notesParts.push(h2('PREHĽAD STRATÉGIE', 'PLAYBOOK OVERVIEW'));
notesParts.push(
  runP([
    t(
      'Stratégia Volume Profile je štruktúrovaný, opakovateľný prístup postavený na princípe, že cena reaguje inak v závislosti od toho, koľko objemu sa na danej cenovej úrovni zobchodovalo. Namiesto sledovania objemu v čase (ako pri tradičných volume baroch) táto stratégia analyzuje ',
      'The Volume Profile Strategy is a structured, repeatable approach built on the principle that price reacts differently depending on how much volume has been transacted at each price level. Instead of focusing on volume over time (like traditional volume bars), this strategy analyzes '
    ),
    b('objem pri cene', 'volume at price'),
    t(', aby odhalila, kde sú pozicionovaní účastníci trhu.', ' to reveal where market participants are positioned.'),
  ])
);
notesParts.push(p('Dva kľúčové typy správania:', 'The two key behaviors:'));
notesParts.push(
  ul([
    runLi([
      b('High-Value Areas (HVA)', 'High-Value Areas (HVAs)'),
      t(
        ' – cena má tendenciu konsolidovať tam, kde sa uskutočnilo veľké množstvo transakcií. Tieto zóny sú „lepkavé“.',
        ' – Price tends to consolidate where a large number of transactions have occurred. These zones are “sticky.”'
      ),
    ]),
    runLi([
      b('Low-Value Areas (LVA)', 'Low-Value Areas (LVAs)'),
      t(
        ' – cena má tendenciu rýchlo prechádzať zónami s nízkou obchodnou aktivitou.',
        ' – Price tends to move quickly through zones with little trading activity.'
      ),
    ]),
  ])
);
notesParts.push(
  runP([
    t('Identifikáciou ', 'By identifying '),
    b('hrán objemu', 'volume edges'),
    t(
      ' (prudký prepad z vysokého na nízky objem) vedia obchodníci predpovedať, kde cena pravdepodobne zareaguje, zastaví sa alebo sa odtrhne.',
      ' (the sharp drop-off from high to low volume), traders can anticipate where the price will likely react, stall, or break away.'
    ),
  ])
);
notesParts.push(p('Metóda kombinuje:', 'The method combines:'));
notesParts.push(
  ul([
    `<li>${(() => {
      reg('Volume Profile (na základe session aj viditeľného rozsahu)', 'Volume Profile (session-based & visible range)');
      return 'Volume Profile (na základe session aj viditeľného rozsahu)';
    })()}</li>`,
    `<li>${(() => {
      reg('Auction Market Theory', 'Auction Market Theory');
      return 'Auction Market Theory';
    })()}</li>`,
    `<li>${(() => {
      reg('Potvrdenie signálnou sviečkou', 'Signal candle confirmation');
      return 'Potvrdenie signálnou sviečkou';
    })()}</li>`,
    `<li>${(() => {
      reg('Štyri kľúčové denné likviditné úrovne', 'Four key daily liquidity levels');
      return 'Štyri kľúčové denné likviditné úrovne';
    })()}</li>`,
    `<li>${(() => {
      reg('Smerový bias z vyššieho timeframe', 'Higher timeframe directional bias');
      return 'Smerový bias z vyššieho timeframe';
    })()}</li>`,
    `<li>${(() => {
      reg('Cielenie hrana-na-hranu (edge-to-edge)', 'Edge-to-edge targeting');
      return 'Cielenie hrana-na-hranu (edge-to-edge)';
    })()}</li>`,
  ])
);
notesParts.push(
  p(
    'Cieľom je vstupovať do vysoko pravdepodobných obchodov na významných hranách objemu, potvrdených price action, a vyhýbať sa zónam v strede rozsahu s nízkou účasťou.',
    'The goal is to take high-probability trades at meaningful volume edges, confirmed by price action, while avoiding mid-zone, low-participation areas.'
  )
);
notesParts.push(HR);

// ── PRAVIDLÁ STRATÉGIE ──
notesParts.push(h2('PRAVIDLÁ STRATÉGIE', 'PLAYBOOK RULES'));

notesParts.push(bp('Interpretácia Volume Profile', 'Volume Profile Interpretation'));
notesParts.push(
  p(
    'Volume Profile ukazuje, koľko ľudí obchodovalo na danej cenovej úrovni, nie v danom čase.',
    'The Volume Profile shows how many people transacted at each price, not at each time.'
  )
);
notesParts.push(
  ul([
    runLi([
      t('Cenové úrovne s vysokým objemom transakcií sa nazývajú ', 'Price levels with high transaction volume are called '),
      b('high-value areas', 'high-value areas'),
      t(' (HVA).', ' (HVA).'),
    ]),
    runLi([
      t('Cenové úrovne s nízkym objemom transakcií sú ', 'Price levels with low transaction volume are '),
      b('low-value areas', 'low-value areas'),
      t(' (LVA).', ' (LVA).'),
    ]),
    runLi([
      b('Volume shelf', 'A volume shelf'),
      t(
        ' je prudký prepad na hrane high-value node, ktorý sa stáva kľúčovou reakčnou zónou.',
        ' is a sharp drop-off at the edge of a high-value node, which becomes a key reaction zone.'
      ),
    ]),
  ])
);

notesParts.push(bp('Použi správne timeframy', 'Use the Right Timeframes'));
notesParts.push(
  runP([
    b('Vyššie timeframy', 'Higher timeframes'),
    t(
      ' (týždenný, denný) sa používajú na identifikáciu dlhodobých value areas a hrán.',
      ' (Weekly, Daily) are used to identify long-term value areas and edges.'
    ),
  ])
);
notesParts.push(
  runP([
    b('Vstupné timeframy', 'Execution timeframes'),
    t(
      ': 4H a 1H sú hlavné timeframy grafu používané na identifikáciu signálnych sviečok a vstup do obchodov.',
      ': 4H and 1H are the main chart timeframes used for identifying signal candles and taking trades.'
    ),
  ])
);
notesParts.push(
  p(
    'Neprekrývaj príliš veľa profilov; drž bias a vstupné timeframy jasne oddelené.',
    'Avoid overlapping too many profiles; keep bias and execution timeframes clearly separated.'
  )
);

notesParts.push(bp('Zameraj sa na štyri kľúčové denné úrovne', 'Focus on Four Key Daily Levels'));
notesParts.push(p('Toto sú dôležité kontextuálne likviditné zóny:', 'These are important contextual liquidity zones:'));
notesParts.push(
  ul(
    ['Overnight High', 'Overnight Low', 'Prior Day High', 'Prior Day Low'].map((s) => `<li>${s}</li>`)
  )
);
notesParts.push(
  p(
    'Toto sú likviditné zóny, kde chytení obchodníci pravdepodobne budú konať agresívne, keď sa cena vráti.',
    'These are liquidity zones where trapped traders are likely to act aggressively when the price returns.'
  )
);
notesParts.push(HR);

notesParts.push(bp('Hrana objemu + signálna sviečka = trade setup', 'Volume Edge + Signal Candle = Trade Setup'));
notesParts.push(p('Aby si vstúpil do obchodu, musia byť prítomné tri prvky:', 'To take a trade, three elements must be present:'));
notesParts.push(
  ul([
    runLi([
      t('Cena sa dotýka ', 'Price is touching a '),
      b('hrany volume profilu', 'volume profile edge'),
      t(' (prechod z HVA do LVA alebo naopak).', ' (transition from HVA to LVA or vice versa).'),
    ]),
    runLi([
      t('Umiestnenie sa zhoduje s ', 'The location aligns with a '),
      b('kľúčovou kontextovou úrovňou', 'key contextual level'),
      t(' (ONH/ONL/PDH/PDL).', ' (ONH/ONL/PDH/PDL).'),
    ]),
    runLi([
      t('Vytvorí sa ', 'A '),
      b('objemovo silná signálna sviečka', 'high volume signal candle'),
      t(
        ' s viditeľným knôtom, ktorý odmieta zónu, a zatvorením v smere obchodu.',
        ' forms with a visible wick rejecting the area and closing in the trade direction.'
      ),
    ]),
  ])
);
notesParts.push(
  runP([
    b('Vždy počkaj na zatvorenie signálnej sviečky', 'Always wait for the signal candle to close'),
    t(
      '. Nepredbiehaj ju; aj posledných pár minút sviečky môže všetko zmeniť. Bullish sviečka sa tesne pred zatvorením môže zmeniť na bearish.',
      '. Do not front-run it; even the last few minutes of a candle can change everything. A bullish candle can turn bearish right before close.'
    ),
  ])
);

notesParts.push(bp('Smerový bias pochádza z vyšších timeframov', 'Directional Bias Comes from Higher Timeframes'));
notesParts.push(
  ul([
    runLi([
      t(
        'Ak sa týždenný graf zatvorí objemovo silnou reverznou sviečkou so spodným knôtom na hrane objemu, tak ',
        'If the Weekly chart closes with a high volume bottom-wick reversal candle at a volume edge, then the '
      ),
      b('bias je long', 'bias is long'),
      t('.', '.'),
    ]),
    runLi([
      t(
        'Všetky intradenné setupy by potom mali uprednostňovať ',
        'All intraday setups should then favor '
      ),
      b('long obchody', 'long trades'),
      t(
        ', aj keď sa vstupy realizujú na 4H, 1H alebo nižších timeframoch.',
        ', even if entries are taken on 4H, 1H, or lower timeframes.'
      ),
    ]),
    `<li>${p(
      'Týždennú sviečku neobchoduješ, ale používaš ju na to, aby si vedel, ktorý smer uprednostniť.',
      "You don't trade the weekly candle, but you use it to know which direction to prioritize."
    ).replace(/^<p>|<\/p>$/g, '')}</li>`,
  ])
);

notesParts.push(bp('Vykonanie: vstup, stop, cieľ', 'Execution: Entry, Stop, Target'));
notesParts.push(
  ul([
    runLi([b('Vstup', 'Entry'), t(': Po zatvorení signálnej sviečky na hrane objemu.', ': After the signal candle closes at the volume edge.')]),
    runLi([
      b('Stop', 'Stop'),
      t(
        ": Tesne za knôtom signálnej sviečky alebo za hranou high value node.",
        ": Just beyond the signal candle's wick or beyond the edge of the high value node."
      ),
    ]),
    runLi([
      b('Cieľ', 'Target'),
      t(
        ': Ďalšia polica (shelf) — cielenie hrana-na-hranu. Obchoduješ cez nízko-objemové zóny a hľadáš ďalšiu vysoko-objemovú oblasť.',
        ': The next shelf — edge-to-edge targeting. You trade through low-volume zones and look for the next high-volume area.'
      ),
    ]),
  ])
);

notesParts.push(bp('Retest vstup založený na volatilite', 'Volatility-Based Retest Entry'));
notesParts.push(
  ul([
    runLi([
      t('Ak má signálna sviečka dlhý knôt → očakávaj ', 'If the signal candle has a long wick → expect a '),
      b('50 – 80 % retracement knôtu', '50–80% wick retrace'),
      t(' pred pokračovaním.', ' before continuation.'),
    ]),
    `<li>${p(
      'Nastav limitný pokyn do tejto retrace zóny (odhadnutej vizuálne, nie pomocou Fib nástrojov).',
      'Set a limit order in that retrace zone (estimated visually, not with Fib tools).'
    ).replace(/^<p>|<\/p>$/g, '')}</li>`,
    `<li>${p('Funguje dobre na NQ a iných volatilných trhoch.', 'Works well for NQ and other volatile markets.').replace(/^<p>|<\/p>$/g, '')}</li>`,
  ])
);

notesParts.push(bp('Vyhýbaj sa obchodom v strede zóny', 'Avoid Mid-Zone Trades'));
notesParts.push(
  ul([
    `<li>${p('Nízko-objemové zóny sú nepredvídateľné; vyhýbaj sa vstupom v strede.', 'Low-volume zones are unpredictable; avoid entries in the middle.').replace(/^<p>|<\/p>$/g, '')}</li>`,
    `<li>${p('Počkaj, kým cena dosiahne hranu, než začneš obchodovať.', 'Wait for the price to hit an edge before trading.').replace(/^<p>|<\/p>$/g, '')}</li>`,
  ])
);
notesParts.push(HR);

notesParts.push(bp('Previous Day POC Retest', 'Previous Day POC Retest'));
notesParts.push(
  runP([
    t('Základným setupom je ', 'A core setup is the '),
    b('retest Previous Point of Control (POC)', 'Previous Point of Control (POC) Retest'),
    t(
      '. Po breakoute alebo trendovom dni sa cena často vracia k POC predchádzajúceho dňa, než pokračuje v trende.',
      '. After a breakout or trend day, the price often returns to the prior day\'s POC before resuming the trend.'
    ),
  ])
);
notesParts.push(
  p(
    'Toto je spoľahlivý vstupný bod. Hľadaj signálnu sviečku na POC predchádzajúceho dňa a cieľ na nový high/low.',
    "This is a reliable entry point. Look for a signal candle at the prior day's POC and target a new high/low."
  )
);
notesParts.push(HR);

// ── VÝHODY A NEVÝHODY STRATÉGIE ──
notesParts.push(h2('VÝHODY A NEVÝHODY STRATÉGIE', 'STRATEGY PROS AND CONS'));
notesParts.push(
  p(
    'Táto stratégia je navrhnutá tak, aby prinášala kvalitné, opakovateľné setupy — no ako pri každej obchodnej stratégii, aj tu treba pred používaním poznať niekoľko dôležitých vecí.',
    'This strategy is designed to deliver high-quality, repeatable setups — but like any trading strategy, there are key things to understand before using it.'
  )
);
notesParts.push(
  runP([
    b('Poznámka:', 'Note:'),
    t(
      ' nevýhody uvedené nižšie nie sú nevýhody. Sú to veci, o ktorých treba vedieť — dôležité vlastnosti, ktoré si vyžadujú trpezlivosť, disciplínu a správny manažment, aby stratégia fungovala efektívne.',
      " The cons listed here aren't disadvantages. They are things to be aware of — important characteristics that require patience, discipline, and proper management to make the strategy work effectively."
    ),
  ])
);
notesParts.push(HR);
notesParts.push(bp('Výhody', 'Pros'));
notesParts.push(
  ul([
    runLi([b('True Auction Insight', 'True Auction Insight'), t(': Odhaľuje, kde sú účastníci trhu skutočne pozicionovaní, nie len kam sa cena presunula.', ': Reveals where market participants are actually positioned, not just where price has moved.')]),
    runLi([b('Objective Key Levels', 'Objective Key Levels'), t(': HVN a LVN poskytujú jasné, objektívne obchodné zóny.', ': HVNs and LVNs provide clear, non-subjective trade zones.')]),
    runLi([b('Fractal Application', 'Fractal Application'), t(': Dá sa aplikovať od týždenných až po intradenné grafy.', ': Can be applied from weekly down to intraday charts.')]),
    runLi([b('Built-in Trade Filtering', 'Built-in Trade Filtering'), t(': Automaticky zvýrazňuje zóny bez obchodovania (mid-LVN bez štruktúry).', ': Automatically highlights no-trade zones (mid-LVNs with no structure).')]),
    runLi([b('Works Across Asset Classes', 'Works Across Asset Classes'), t(': Efektívna na akomkoľvek trhu s centralizovanými, spoľahlivými objemovými dátami.', ': Effective in any market with centralized, reliable volume data.')]),
    runLi([b('Supports Bias Formation', 'Supports Bias Formation'), t(': Profily z vyššieho timeframe dávajú jasný kontext trhu skôr, než začneš hľadať vstupy.', ': Higher timeframe profiles give clear market context before looking for entries.')]),
  ])
);
notesParts.push(HR);
notesParts.push(bp('Nevýhody', 'Cons'));
notesParts.push(
  ul([
    runLi([b('Menej obchodov', 'Fewer Trades'), t(': Kvalitné setupy na skutočných hranách sú zriedkavé, vyžadujú trpezlivosť.', ': Quality setups at true edges are infrequent, requiring patience.')]),
    runLi([b('Pomalý vývoj', 'Slow to Develop'), t(': Volume Profily potrebujú čas na vybudovanie; intradenné hrany nemusia byť na začiatku session jasné.', ': Volume Profiles need time to build; intraday edges may not be clear early in the session.')]),
    runLi([b('Zmätok z prekrývania', 'Overlap Confusion'), t(': Viacero timeframov môže vytvárať konfliktné HVN, ak nie sú vyfiltrované na 2 – 3 hlavné profily.', ': Multiple timeframes can produce conflicting HVNs if not filtered down to 2–3 main profiles.')]),
    runLi([b('Vyžaduje objemové dáta', 'Requires Volume Data'), t(': Nie je použiteľná na decentralizovaných trhoch ako spotový forex.', ': Not viable in decentralized markets like spot forex.')]),
    runLi([b('Nie je „vždy zapnutá“', 'Not “Always On”'), t(': Niektoré dni neponúknu žiadny platný signál; obchodník musí byť v pohode s tým, že daný deň vynechá.', ': Some days produce no valid signals; traders must be comfortable sitting out.')]),
    runLi([b('Riziko predpovedania chopu', 'Chop Prediction Risk'), t(': Aj keď dokáže predpovedať chop, obchodovanie v chop zónach má nižšiu pravdepodobnosť a je rizikovejšie.', ': While it can predict chop, trading inside chop zones is lower probability and riskier.')]),
  ])
);
notesParts.push(HR);

// ── ROZBOR OBCHODU ──
notesParts.push(h2('ROZBOR OBCHODU', 'TRADE BREAKDOWN'));
notesParts.push(HR);
notesParts.push(bp('Kontext', 'Context'));
notesParts.push(
  ul([
    `<li>${p('Nástroj: NQ futures', 'Instrument: NQ futures').replace(/^<p>|<\/p>$/g, '')}</li>`,
    '<li>TF: 1H</li>',
    `<li>${p('Nástroje na grafe: Session Volume Profile, Visible Range VP', 'Tools: Session Volume Profile, Visible Range VP').replace(/^<p>|<\/p>$/g, '')}</li>`,
    `<li>${p('Kľúčové úrovne: Prior Day High (PDH), Overnight Low (ONL)', 'Key levels: Prior Day High (PDH), Overnight Low (ONL)').replace(/^<p>|<\/p>$/g, '')}</li>`,
  ])
);
notesParts.push(bp('Pred pohybom', 'Before the move'));
notesParts.push(
  ul([
    `<li>${p('Označ PDH a ONL.', 'Mark PDH and ONL.').replace(/^<p>|<\/p>$/g, '')}</li>`,
    `<li>${p('Session VP buduje objemovo silnú policu (shelf) blízko high.', 'Session VP is building a high-volume shelf near the highs.').replace(/^<p>|<\/p>$/g, '')}</li>`,
    `<li>${p('Visible Range VP ukazuje nižšiu policu / support zónu blízko ONL.', 'Visible Range VP shows a lower shelf / support area near ONL.').replace(/^<p>|<\/p>$/g, '')}</li>`,
  ])
);
notesParts.push(bp('Signál', 'Signal'));
notesParts.push(
  p(
    'Cena obchoduje hore do PDH a na hranu vrchnej VP police. Vytvorí sa 1H sviečka, ktorá:',
    'Price trades up into PDH and the edge of the upper VP shelf. A 1H candle forms that:'
  )
);
notesParts.push(
  ul([
    `<li>${p('Obchoduje nad PDH intrabar (sweep),', 'Trades above PDH intrabar (sweep),').replace(/^<p>|<\/p>$/g, '')}</li>`,
    runLi([t('Zatvorí sa späť ', 'Closes back '), b('pod PDH', 'below PDH'), t(',', ',')]),
    runLi([t('Má ', 'Has a '), b('dlhý horný knôt', 'long upper wick'), t(' a ', ' and '), b('vysoký objem', 'high volume'), t('.', '.')]),
  ])
);
notesParts.push(
  runP([
    t('Toto je ', 'This is the '),
    b('signálna sviečka', 'signal candle'),
    t(': chytené longy na hrane VP.', ': trapped longs at a VP edge.'),
  ])
);
notesParts.push(chartImg(CHART_IMAGES.signal, 'Signálna sviečka na hrane VP, PDH sweep'));

notesParts.push(bp('Vykonanie', 'Execution'));
notesParts.push(
  runP([
    b('Vstup do shortu', 'Short Entry'),
    t(': Na zatvorení 1H signálnej sviečky (alebo pri malom retrace do jej tela)', ': On the close of the 1H signal candle (or tiny retrace into its body)'),
  ])
);
notesParts.push(
  runP([
    b('Stop Loss', 'Stop Loss'),
    t(': Tesne nad high knôtu signálnej sviečky (nad sweepom).', ': Just above the wick high of the signal candle (above the sweep).'),
  ])
);
notesParts.push(
  runP([
    b('Cieľ', 'Target'),
    t(
      ': Prvý cieľ: ONL. Toto sa zhoduje s nižšou policou na VP / visible range.',
      ': First target: ONL. This aligns with the lower shelf on VP / visible range.'
    ),
  ])
);
notesParts.push(bp('Výsledok', 'Outcome'));
notesParts.push(
  ul([
    `<li>${p('Cena sa predáva od PDH,', 'Price sells off from PDH,').replace(/^<p>|<\/p>$/g, '')}</li>`,
    `<li>${p('Pohybuje sa späť cez session range,', 'Moves back through session range,').replace(/^<p>|<\/p>$/g, '')}</li>`,
    runLi([t('Dotkne sa ', 'Tags '), b('ONL / nižšej police', 'ONL / lower shelf'), t(', kde vstupujú kupujúci.', ', where buyers step in.')]),
    `<li>${p('Short sa zatvára na plánovanom cieli.', 'Short exits at planned target.').replace(/^<p>|<\/p>$/g, '')}</li>`,
  ])
);
notesParts.push(chartImg(CHART_IMAGES.outcome, 'Výsledok obchodu, cena dosiahla ONL'));

const notesHtml = notesParts.filter(Boolean).join('');

// Manual override: this run's SK text has no leading whitespace (starts with
// a comma right after </strong>), but the EN translation needs a leading
// space before "to reveal" that only the value can supply -- reg()'s
// symmetric trim() strips it from both sides, so restore it post-hoc.
dict.set(
  ', aby odhalila, kde sú pozicionovaní účastníci trhu.',
  ' to reveal where market participants are positioned.'
);

// ── description + rules (main I18N_EN, not STRATEGY_I18N_EN) ──
const description = {
  sk: 'Tento playbook sa zameriava na obchodovanie vo chvíli, keď cena dosiahne hranu high-volume node na kľúčových aukčných úrovniach ako PDH, PDL, ONH alebo ONL. Keď cena na hrane volume profilu zareaguje, obchod smeruje z jednej strany hodnoty na druhú cez čistú cestu nízko-objemovými oblasťami.',
  en: 'This playbook focuses on trading when price reaches the edge of a high-volume node at key auction levels like PDH, PDL, ONH, or ONL. Once price reacts at the volume profile edge, the trade aims to move from one side of value to the next using the clean path through low-volume areas.',
};

const rules = [
  { sk: 'Cena sa dotýka hrany volume profilu (prechod z HVA do LVA alebo naopak)', en: 'Price is touching a volume profile edge (transition from HVA to LVA or vice versa)' },
  { sk: 'Umiestnenie sa zhoduje s kľúčovou kontextovou úrovňou (ONH/ONL/PDH/PDL)', en: 'Location aligns with a key contextual level (ONH/ONL/PDH/PDL)' },
  { sk: 'Vytvorila sa objemovo silná signálna sviečka s viditeľným knôtom a zatvorením v smere obchodu', en: 'A high volume signal candle formed with a visible wick and closed in the trade direction' },
  { sk: 'Počkaj na zatvorenie signálnej sviečky, nikdy ju nepredbiehaj', en: 'Wait for the signal candle to close, never front-run it' },
  { sk: 'Smerový bias potvrdený z vyššieho timeframe (Weekly/Daily)', en: 'Directional bias confirmed from a higher timeframe (Weekly/Daily)' },
  { sk: "Vstup po zatvorení signálnej sviečky na hrane objemu", en: 'Entry after the signal candle closes at the volume edge' },
  { sk: "Stop tesne za knôtom signálnej sviečky alebo za hranou high-value node", en: "Stop just beyond the signal candle's wick or the edge of the high-value node" },
  { sk: 'Cieľ na ďalšej hrane (edge-to-edge) – najbližšia high-volume oblasť', en: 'Target the next edge (edge-to-edge) – the nearest high-volume area' },
  { sk: 'Vyhni sa obchodom v strede low-volume zóny', en: 'Avoid trades in the middle of a low-volume zone' },
];

// ── 1) Insert strategy object into default-strategies.js ──
const rulesJs = '[' + rules.map((r) => JSON.stringify(r.sk)).join(',') + ']';
const strategyLine =
  `  {name:${JSON.stringify('Volume Profile')},description:${JSON.stringify(description.sk)},rules:${rulesJs},notes:${JSON.stringify(notesHtml)}},\n`;

let defSrc = fs.readFileSync(defPath, 'utf8');
if (defSrc.includes('name:"Volume Profile"')) {
  console.log('Volume Profile already present in default-strategies.js, skipping insert.');
} else {
  defSrc = defSrc.replace(/\n\];\n?$/, `\n${strategyLine}];\n`);
  fs.writeFileSync(defPath, defSrc);
  console.log('Inserted Volume Profile into', defPath);
}

// ── 2) Append notes dictionary to strategy-i18n-en.js ──
let stratSrc = fs.readFileSync(stratI18nPath, 'utf8');
let added = 0;
let skipped = 0;
const newLines = [];
for (const [sk, en] of dict.entries()) {
  const keyLiteral = JSON.stringify(sk);
  if (stratSrc.includes(keyLiteral + ':')) {
    skipped++;
    continue;
  }
  newLines.push(`  ${keyLiteral}: ${JSON.stringify(en)},`);
  added++;
}
if (newLines.length) {
  stratSrc = stratSrc.replace(/\n};\n?$/, `\n${newLines.join('\n')}\n};\n`);
  fs.writeFileSync(stratI18nPath, stratSrc);
}
console.log(`strategy-i18n-en.js: added ${added}, already present ${skipped}`);

// ── 3) Append description + rules translations to js/i18n.js ──
let i18nSrc = fs.readFileSync(i18nPath, 'utf8');
const mainEntries = [description, ...rules].filter((x) => x.sk !== x.en);
const mainLines = [];
let mainAdded = 0;
let mainSkipped = 0;
for (const { sk, en } of mainEntries) {
  const keyLiteral = "'" + sk.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
  if (i18nSrc.includes(keyLiteral + ':')) {
    mainSkipped++;
    continue;
  }
  const valLiteral = "'" + en.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
  mainLines.push(`${keyLiteral}:${valLiteral},`);
  mainAdded++;
}
if (mainLines.length) {
  const marker = "\nexport const SK_MONTHS=";
  const idx = i18nSrc.indexOf(marker);
  if (idx === -1) throw new Error('Could not find SK_MONTHS marker in i18n.js');
  const block = `\nObject.assign(I18N_EN,{\n// ── Volume Profile ──\n${mainLines.join('\n')}\n});\n`;
  i18nSrc = i18nSrc.slice(0, idx) + block + i18nSrc.slice(idx);
  fs.writeFileSync(i18nPath, i18nSrc);
}
console.log(`i18n.js: added ${mainAdded}, already present ${mainSkipped}`);

console.log('\nTotal notes dictionary entries:', dict.size);
console.log('Done.');
