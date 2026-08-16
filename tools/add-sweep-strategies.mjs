/**
 * Add the two strategies the user actually trades on MGC:
 *   1) "Sweep likvidity"             – a swept level, entered by one of five triggers
 *   2) "Trendový deň – pokračovanie" – continuation pullback to VWAP / Asia VAH-VAL
 *
 * Unlike the imported playbooks (iFVG, AMD, Volume Profile...), these are written so
 * that EVERY entry in `rules` is a BINARY condition verifiable at the moment of entry
 * -- renderTradeRuleChecklist() in js/strategy-notes.js turns each rule into a checkbox
 * stored on the trade as `checkedRules`, so a rule like "optional, but adds confluence"
 * makes the checklist meaningless.
 *
 * The entry trigger varies (reclaim / displacement+FVG / MSS / resting limit / touch),
 * so the triggers are rules rather than separate strategies: one strategy keeps the
 * sample size together while still letting the per-rule stats show which trigger pays.
 *
 * Run: node tools/add-sweep-strategies.mjs
 * Idempotent -- re-running skips anything already present.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const defPath = path.join(root, 'js/data/default-strategies.js');
const stratI18nPath = path.join(root, 'js/data/strategy-i18n-en.js');
const i18nPath = path.join(root, 'js/i18n.js');
const HR = '<hr class="sep">';

const dict = new Map(); // sk -> en (notes text nodes)

/**
 * translateText() in js/i18n.js does `String(s).trim()` before the dictionary lookup,
 * then `s.replace(t, d[t])` on the ORIGINAL node value -- so the key must be the
 * TRIMMED text. Registering an untrimmed run (leading/trailing space from a
 * mid-sentence <strong> split) silently never matches at runtime.
 */
function reg(sk, en) {
  const skT = String(sk).trim();
  const enT = String(en).trim();
  if (!skT) return;
  if (skT === enT) return; // identity needs no entry
  if (dict.has(skT) && dict.get(skT) !== enT) {
    throw new Error(`Conflicting translation for "${skT}":\n  existing: ${dict.get(skT)}\n  new: ${enT}`);
  }
  dict.set(skT, enT);
}

const h2 = (sk, en) => (reg(sk, en), `<h2>${sk}</h2>`);
const p = (sk, en) => (reg(sk, en), `<p>${sk}</p>`);
const bp = (sk, en) => (reg(sk, en), `<p><strong>${sk}</strong></p>`);
const li = (sk, en) => (reg(sk, en), `<li>${sk}</li>`);
const ul = (items) => `<ul>${items.join('')}</ul>`;

/* ══════════════════════════════════════════════════════════════════════════
   1) SWEEP LIKVIDITY
   ══════════════════════════════════════════════════════════════════════════ */

const s1 = { name: 'Sweep likvidity' };

s1.description = {
  sk: 'Obchodovanie vybranej likvidity na vopred označenej úrovni – Asia High/Low, PDH/PDL, ONH/ONL, VAH/VAL alebo otvorenie session. Cena úroveň zoberie, ale pohyb sa neudrží. Spôsob vstupu sa líši podľa situácie (reclaim, displacement + FVG, market structure shift, položená limitka alebo vstup na dotyku), preto sa použitý trigger zaškrtáva ku každému obchodu zvlášť.',
  en: 'Trading swept liquidity at a pre-marked level – Asia High/Low, PDH/PDL, ONH/ONL, VAH/VAL or the session open. Price takes the level, but the move does not hold. The way you enter varies with the situation (reclaim, displacement + FVG, market structure shift, a resting limit order, or entry on touch), so the trigger used is ticked separately on every trade.',
};

s1.rules = [
  // ── vždy platí ──
  {
    sk: 'Úroveň bola označená na grafe PRED vstupom (Asia H/L, PDH/PDL, ONH/ONL, VAH/VAL, open session)',
    en: 'The level was marked on the chart BEFORE entry (Asia H/L, PDH/PDL, ONH/ONL, VAH/VAL, session open)',
  },
  {
    sk: 'Knôt presiahol úroveň aspoň o 2 ticky – sweep naozaj prebehol',
    en: 'The wick exceeded the level by at least 2 ticks – the sweep actually happened',
  },
  {
    sk: 'Je to prvý alebo druhý pokus o túto úroveň, nie tretí a ďalší',
    en: 'This is the first or second attempt at this level, not the third or beyond',
  },
  {
    sk: 'Stop je vyplnený v zázname obchodu',
    en: 'The stop is filled in on the trade record',
  },
  {
    sk: 'Cieľ je určený vopred a vyplnený v zázname obchodu',
    en: 'The target is set in advance and filled in on the trade record',
  },
  {
    sk: 'Plánované riziko je do vopred určeného % účtu',
    en: 'Planned risk is within the predefined % of the account',
  },
  // ── trigger: zaškrtni ten, ktorý si naozaj použil ──
  {
    sk: 'Trigger: reclaim – sviečka zavrela späť za úrovňou',
    en: 'Trigger: reclaim – a candle closed back behind the level',
  },
  {
    sk: 'Trigger: displacement + vstup na návrate do FVG',
    en: 'Trigger: displacement + entry on the return into the FVG',
  },
  {
    sk: 'Trigger: market structure shift na 1m/2m (BOS/CHoCH)',
    en: 'Trigger: market structure shift on 1m/2m (BOS/CHoCH)',
  },
  {
    sk: 'Trigger: limitka položená vopred na úrovni, stop nastavený zároveň s ňou',
    en: 'Trigger: a limit order resting at the level, with the stop set at the same time',
  },
  {
    sk: 'Trigger: vstup na dotyku úrovne bez potvrdenia',
    en: 'Trigger: entry on touch of the level without confirmation',
  },
];

const n1 = [];
n1.push(h2('VYTVORENÉ PRE', 'BUILT FOR'));
n1.push(p('Nástroje: Futures (MGC / GC)', 'Instruments: Futures (MGC / GC)'));
n1.push(p('Štýl obchodovania: Intradenný, držanie rádovo minúty až desiatky minút', 'Trading style: Intraday, holding time from minutes to tens of minutes'));
n1.push(HR);

n1.push(h2('MYŠLIENKA', 'THE IDEA'));
n1.push(p(
  'Pod zjavnými úrovňami leží nahromadená likvidita – stopy a breakout príkazy. Trh sa tam často vyberie práve preto, aby ich pozbieral. Ak bol breakout skutočný, cena za úrovňou zostane. Ak to bola len manipulácia, cena sa vráti späť a pohyb pokračuje opačným smerom.',
  'Obvious levels sit on top of accumulated liquidity – stops and breakout orders. The market often reaches for them precisely to collect it. If the breakout was real, price stays beyond the level. If it was manipulation, price comes back and the move continues the other way.'
));
n1.push(p(
  'Úroveň a sweep sú vždy rovnaké. Čo sa mení, je spôsob vstupu – a práve to je vec, ktorú sa tento playbook snaží zmerať.',
  'The level and the sweep are always the same. What changes is how you enter – and that is exactly what this playbook is built to measure.'
));
n1.push(HR);

n1.push(h2('KTORÉ ÚROVNE', 'WHICH LEVELS'));
n1.push(ul([
  li('Asia High / Low – hranice ázijského rozsahu, najčastejšie vyberané pred London open', 'Asia High / Low – the Asian range boundaries, most often swept before the London open'),
  li('PDH / PDL – high a low predošlého dňa', 'PDH / PDL – previous day high and low'),
  li('ONH / ONL – high a low nočnej session pred otvorením RTH', 'ONH / ONL – overnight session high and low before the RTH open'),
  li('VAH / VAL – hrany hodnotovej oblasti z volume profilu', 'VAH / VAL – the value area edges from the volume profile'),
  li('Otvorenie session / Initial Balance – otvorenie NY a rozsah prvej hodiny', 'Session open / Initial Balance – the NY open and the first-hour range'),
]));
n1.push(p(
  'PDH/PDL a ONH/ONL vie appka vykresliť priamo do grafu obchodu – tlačidlo „PD/ON" v lište indikátorov.',
  'PDH/PDL and ONH/ONL can be drawn straight onto the trade chart – the “PD/ON” button in the indicator bar.'
));
n1.push(p(
  'Úroveň musí byť označená skôr, než sa k nej cena priblíži. Úroveň nájdená spätne po pohybe sa nepočíta.',
  'The level must be marked before price approaches it. A level found after the move does not count.'
));
n1.push(HR);

n1.push(h2('PÄŤ TRIGGEROV', 'THE FIVE TRIGGERS'));
n1.push(p(
  'Ku každému obchodu zaškrtni ten, ktorý si naozaj použil. Po niekoľkých desiatkach obchodov appka ukáže, ktorý z nich zarába a ktorý nie – to je jediný spôsob, ako sa to dá zistiť.',
  'Tick the one you actually used on every trade. After a few dozen trades the app will show which of them makes money and which does not – that is the only way to find out.'
));
n1.push(bp('1. Reclaim', '1. Reclaim'));
n1.push(p(
  'Cena sa vráti za úroveň a sviečka tam zavrie. Zavretie je celý signál – prekmitnutie počas sviečky sa nepočíta, lebo sa do jej konca môže zmeniť.',
  'Price returns behind the level and a candle closes there. The close is the whole signal – a poke during the candle does not count, because it can still change before it ends.'
));
n1.push(bp('2. Displacement + FVG', '2. Displacement + FVG'));
n1.push(p(
  'Po sweepe príde agresívna sviečka, ktorá nechá za sebou Fair Value Gap. Vstup je na návrate ceny do tejto medzery. Detailne rozpísané v playbooku iFVG Model.',
  'After the sweep an aggressive candle leaves a Fair Value Gap behind it. Entry is on the return into that gap. Covered in detail in the iFVG Model playbook.'
));
n1.push(bp('3. Market structure shift (1m/2m)', '3. Market structure shift (1m/2m)'));
n1.push(p(
  'Po sweepe čakáš na nižšom timeframe zlomenie štruktúry (BOS/CHoCH) a vstupuješ až po ňom. Najpomalší trigger, ale dáva najviac potvrdenia.',
  'After the sweep you wait for a break of structure (BOS/CHoCH) on the lower timeframe and enter only then. The slowest trigger, but it gives the most confirmation.'
));
n1.push(bp('4. Limitka položená vopred', '4. Resting limit order'));
n1.push(p(
  'Príkaz položíš na úroveň (VAH, VAL, PD low...) dopredu, spolu so stopom. Nečaká sa na potvrdenie, ale obchod je naplánovaný vrátane rizika ešte pred tým, než sa čokoľvek stane – to je jeho hlavná výhoda oproti vstupu na dotyku.',
  'You place the order at the level (VAH, VAL, PD low...) in advance, together with the stop. There is no confirmation, but the trade is planned including its risk before anything happens – that is its main advantage over entering on touch.'
));
n1.push(bp('5. Vstup na dotyku', '5. Entry on touch'));
n1.push(p(
  'Vstup rukou v momente, keď sa cena úrovne dotkne, bez potvrdenia a bez vopred pripraveného príkazu. Najrýchlejší, ale aj najmenej podložený trigger.',
  'Entering by hand the moment price touches the level, with no confirmation and no order prepared in advance. The fastest trigger, but also the least supported one.'
));
n1.push(HR);

n1.push(h2('RIADENIE OBCHODU', 'TRADE MANAGEMENT'));
n1.push(ul([
  li('Stop: za knôt sweepu. Ak sa tam cena vráti, model zlyhal a dôvod na obchod zanikol.', 'Stop: behind the sweep wick. If price gets back there, the model failed and the reason for the trade is gone.'),
  li('Cieľ: opačná likvidita (druhá strana rozsahu) alebo VWAP. Urči ho pred vstupom, nie počas obchodu.', 'Target: the opposite liquidity (the other side of the range) or VWAP. Set it before entry, not during the trade.'),
  li('Oboje zapíš do obchodu. Bez stopu appka nevie spočítať R ani % rizika – riskR() vráti prázdno.', 'Record both on the trade. Without a stop the app cannot compute R or risk % – riskR() returns nothing.'),
]));
n1.push(HR);

n1.push(h2('KEDY NEOBCHODOVAŤ', 'WHEN NOT TO TRADE'));
n1.push(ul([
  li('Úroveň bola dnes už dvakrát testovaná – tretí pokus je zvyčajne skutočný breakout, nie manipulácia.', 'The level has already been tested twice today – the third attempt is usually a real breakout, not manipulation.'),
  li('Chýba jasná úroveň. Bez vopred označenej úrovne nie je čo vyberať a tento model neplatí.', 'There is no clear level. With no pre-marked level there is nothing to sweep and this model does not apply.'),
  li('Práve prebieha alebo o chvíľu príde news s vysokým dopadom.', 'A high-impact news release is running or about to hit.'),
]));
n1.push(HR);

n1.push(h2('ČO SI ZAPÍSAŤ KU KAŽDÉMU OBCHODU', 'WHAT TO RECORD ON EVERY TRADE'));
n1.push(p(
  'Zaškrtni pravidlá, ktoré naozaj platili – nie tie, ktoré si chcel dodržať. Zaškrtnutý trigger je najdôležitejší údaj z celého zoznamu, lebo bez neho sa päť rôznych spôsobov vstupu zlije do jedného čísla a nedá sa z neho nič vyčítať.',
  'Tick the rules that actually held – not the ones you meant to follow. The ticked trigger is the most valuable item on the whole list, because without it five different ways of entering blend into a single number that tells you nothing.'
));
n1.push(p(
  'Do poznámky obchodu stačí jedna veta: ktorá úroveň to bola a čo sweep spustilo.',
  'One sentence in the trade note is enough: which level it was and what triggered the sweep.'
));

s1.notes = n1.join('');

/* ══════════════════════════════════════════════════════════════════════════
   2) TRENDOVÝ DEŇ – POKRAČOVANIE
   ══════════════════════════════════════════════════════════════════════════ */

const s2 = { name: 'Trendový deň – pokračovanie' };

s2.description = {
  sk: 'Pokračovací model pre dni, keď Ázia ráno udá jasný smer. London nejde proti nemu – najprv stiahne cenu späť na VWAP alebo na Asia VAH/VAL a odtiaľ pokračuje pôvodným smerom. Vstupuje sa na potvrdený retest tejto úrovne v smere trendu, nikdy proti nemu.',
  en: 'A continuation model for days when the Asian session sets a clear direction in the morning. London does not fight it – it first pulls price back to VWAP or to the Asia VAH/VAL, then continues in the original direction. You enter on a confirmed retest of that level in the direction of the trend, never against it.',
};

s2.rules = [
  {
    sk: 'Ázijská session zavrela v hornej (long) alebo dolnej (short) tretine svojho rozsahu',
    en: 'The Asian session closed in the upper (long) or lower (short) third of its range',
  },
  {
    sk: 'Cena je nad VWAP pri longu / pod VWAP pri shorte',
    en: 'Price is above VWAP for a long / below VWAP for a short',
  },
  {
    sk: 'Pullback dosiahol VWAP alebo Asia VAH (long) / Asia VAL (short)',
    en: 'The pullback reached VWAP or the Asia VAH (long) / Asia VAL (short)',
  },
  {
    sk: 'Pullback nezmazal viac než 50 % ázijského pohybu',
    en: 'The pullback did not erase more than 50 % of the Asian move',
  },
  {
    sk: 'Reakcia je potvrdená – sviečka na úrovni zavrela v smere trendu',
    en: 'The reaction is confirmed – the candle at the level closed in the trend direction',
  },
  {
    sk: 'Vstúpil som až po zatvorení potvrdzujúcej sviečky',
    en: 'I entered only after the confirming candle closed',
  },
  {
    sk: 'Stop je za úrovňou pullbacku a je vyplnený v zázname obchodu',
    en: 'The stop is behind the pullback level and is filled in on the trade record',
  },
  {
    sk: 'Cieľ je určený vopred (high/low dňa alebo ďalšia likvidita) a je vyplnený v zázname',
    en: 'The target is set in advance (day high/low or the next liquidity) and is filled in on the record',
  },
  {
    sk: 'V tento deň neobchodujem proti smeru Ázie',
    en: 'On this day I do not trade against the Asian direction',
  },
];

const n2 = [];
n2.push(h2('VYTVORENÉ PRE', 'BUILT FOR'));
n2.push(p('Nástroje: Futures (MGC / GC)', 'Instruments: Futures (MGC / GC)'));
n2.push(p('Štýl obchodovania: Intradenný, jeden až dva obchody za trendový deň', 'Trading style: Intraday, one or two trades per trend day'));
n2.push(HR);

n2.push(h2('MYŠLIENKA', 'THE IDEA'));
n2.push(p(
  'Nie každý deň je otočkový. Keď Ázia ráno udá jasný smer, London ho zvyčajne nezruší – len urobí pullback, natankuje na VWAP alebo na hranu ázijskej hodnotovej oblasti a pokračuje ďalej. V takýto deň je protitrendový obchod najdrahšia chyba, akú vieš spraviť.',
  'Not every day is a reversal day. When the Asian session sets a clear direction in the morning, London usually does not cancel it – it just pulls back, refuels at VWAP or at the edge of the Asian value area, and carries on. On such a day a counter-trend trade is the most expensive mistake available.'
));
n2.push(p(
  'Tento model je opakom Sweepu likvidity – tam sa obchoduje zlyhanie úrovne, tu jej udržanie. Preto je vedený ako samostatná stratégia: keby boli obe pod jedným menom, appka by ich štatistiky zliala dokopy a nikdy by si nezistil, ktorá z nich ťa živí.',
  'This model is the opposite of the Liquidity Sweep – there you trade a level failing, here you trade it holding. That is why it is kept as a separate strategy: under one shared name the app would blend their statistics together and you would never learn which of the two actually pays.'
));
n2.push(HR);

n2.push(h2('AKO POZNÁŠ TRENDOVÝ DEŇ', 'HOW TO RECOGNISE A TREND DAY'));
n2.push(p(
  'Rozhodni to ráno, pred London open, a zapíš si to. Rozhodnutie spravené uprostred pohybu je racionalizácia, nie príprava.',
  'Decide it in the morning, before the London open, and write it down. A decision made in the middle of the move is rationalisation, not preparation.'
));
n2.push(ul([
  li('Ázijská session zavrela v hornej alebo dolnej tretine svojho rozsahu – nie v strede.', 'The Asian session closed in the upper or lower third of its range – not in the middle.'),
  li('Ázijský rozsah je aspoň priemerne veľký. Úzky rozsah znamená nerozhodnutý trh a nie je z čoho stavať bias.', 'The Asian range is at least average sized. A narrow range means an undecided market and there is nothing to build a bias on.'),
  li('Cena drží jednu stranu VWAP – nie prepína medzi nimi.', 'Price holds one side of VWAP – it is not flipping across it.'),
]));
n2.push(p(
  'Ak niektorý bod neplatí, dnes tento model neobchoduješ. Neexistuje „polovičný" trendový deň.',
  'If any of these does not hold, you do not trade this model today. There is no such thing as a “half” trend day.'
));
n2.push(HR);

n2.push(h2('KDE JE VSTUP', 'WHERE THE ENTRY IS'));
n2.push(p(
  'Pri longu čakáš stiahnutie na VWAP alebo na Asia VAH, pri shorte na VWAP alebo Asia VAL. Ktorá z nich príde skôr, tá platí – nedopĺňaj si ďalšie úrovne počas obchodu.',
  'For a long you wait for a pullback to VWAP or the Asia VAH; for a short, to VWAP or the Asia VAL. Whichever comes first is the one that counts – do not invent extra levels mid-trade.'
));
n2.push(p(
  'Potvrdenie je povinné: sviečka na úrovni musí zavrieť v smere trendu a vstup ide až po jej zatvorení. Na rozdiel od Sweepu likvidity sa tu limitka ani vstup na dotyku nepoužívajú – pri pokračovaní trendu je hrana práve v tom, že vidíš reakciu.',
  'Confirmation is mandatory: the candle at the level must close in the trend direction and the entry comes only after it closes. Unlike the Liquidity Sweep, neither a resting limit nor a touch entry is used here – with a trend continuation the edge lies precisely in seeing the reaction.'
));
n2.push(p(
  'Ak pullback zmaže viac než polovicu ázijského pohybu, prestáva to byť pullback. Vtedy setup zaniká a čakáš na nový obraz trhu.',
  'If the pullback erases more than half of the Asian move it stops being a pullback. At that point the setup is void and you wait for a new picture of the market.'
));
n2.push(HR);

n2.push(h2('RIADENIE OBCHODU', 'TRADE MANAGEMENT'));
n2.push(ul([
  li('Stop: za úroveň pullbacku (pod VWAP/VAH pri longu, nad VWAP/VAL pri shorte).', 'Stop: behind the pullback level (below VWAP/VAH for a long, above VWAP/VAL for a short).'),
  li('Cieľ: high/low dňa alebo ďalšia likvidita v smere trendu. Trendový deň dáva priestor – nezatváraj na prvom pohybe.', 'Target: the day high/low or the next liquidity in the trend direction. A trend day gives room – do not close on the first move.'),
  li('Jeden až dva obchody za deň. Tento model nie je na opakované vstupy.', 'One or two trades per day. This model is not built for repeated entries.'),
]));
n2.push(HR);

n2.push(h2('NAJČASTEJŠIA CHYBA', 'THE MOST COMMON MISTAKE'));
n2.push(p(
  'Obchodovať tento deň ako otočkový. Keď cena po pullbacku pokračuje a ty vidíš „prehnaný" pohyb, láka to vstúpiť proti. V trendový deň to je presne ten obchod, ktorý ide bez zastavenia proti tebe – preto je posledné pravidlo v checkliste práve o tom.',
  'Trading this day as if it were a reversal day. When price continues after the pullback and the move looks “overextended”, it is tempting to fade it. On a trend day that is exactly the trade that runs against you without stopping – which is why the last rule in the checklist is about precisely that.'
));

s2.notes = n2.join('');

/* ══════════════════════════════════════════════════════════════════════════
   WRITE OUT
   ══════════════════════════════════════════════════════════════════════════ */

const strategies = [s1, s2];

// ── 1) default-strategies.js ──
let defSrc = fs.readFileSync(defPath, 'utf8');
let inserted = 0;
for (const s of strategies) {
  if (defSrc.includes(`name:${JSON.stringify(s.name)}`)) {
    console.log(`"${s.name}" already present in default-strategies.js, skipping.`);
    continue;
  }
  const rulesJs = '[' + s.rules.map((r) => JSON.stringify(r.sk)).join(',') + ']';
  const line =
    `  {name:${JSON.stringify(s.name)},description:${JSON.stringify(s.description.sk)},rules:${rulesJs},notes:${JSON.stringify(s.notes)}},\n`;
  defSrc = defSrc.replace(/\n\];\n?$/, `\n${line}];\n`);
  inserted++;
}
if (inserted) {
  fs.writeFileSync(defPath, defSrc);
  console.log(`Inserted ${inserted} strategy/strategies into ${defPath}`);
}

// ── 2) notes dictionary -> strategy-i18n-en.js ──
let stratSrc = fs.readFileSync(stratI18nPath, 'utf8');
const newLines = [];
let added = 0;
let skipped = 0;
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

// ── 3) names + descriptions + rules -> js/i18n.js ──
let i18nSrc = fs.readFileSync(i18nPath, 'utf8');
const mainEntries = [];
for (const s of strategies) {
  mainEntries.push(s.description);
  mainEntries.push(...s.rules);
}
// strategy names show up in selects/tables and need translating too
mainEntries.push({ sk: 'Sweep likvidity', en: 'Liquidity Sweep' });
mainEntries.push({ sk: 'Trendový deň – pokračovanie', en: 'Trend day – continuation' });

const mainLines = [];
let mainAdded = 0;
let mainSkipped = 0;
for (const { sk, en } of mainEntries) {
  if (sk === en) continue;
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
  const marker = '\nexport const SK_MONTHS=';
  const idx = i18nSrc.indexOf(marker);
  if (idx === -1) throw new Error('Could not find SK_MONTHS marker in i18n.js');
  const block = `\nObject.assign(I18N_EN,{\n// ── Sweep likvidity / Trendový deň ──\n${mainLines.join('\n')}\n});\n`;
  i18nSrc = i18nSrc.slice(0, idx) + block + i18nSrc.slice(idx);
  fs.writeFileSync(i18nPath, i18nSrc);
}
console.log(`i18n.js: added ${mainAdded}, already present ${mainSkipped}`);

console.log('\nNotes dictionary entries collected:', dict.size);
console.log('Done.');
