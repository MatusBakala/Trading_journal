Vytvorenie dvojjazyčnej web app/ dashboard na denné analyzovanie tradov.
Tento nástroj bude v dvoch jazykoch- Slovensky, Anglicky.
Záloha- iCloud sync pre zatiaľ a export JSON. Neskôr možno nejaka databáza.

## Testovacie dáta

Zálohy v `test-data/` sú reálne exporty z bežiacej appky — nie syntetické dáta. Použi ich
kedykoľvek treba otestovať import/restore zálohy, renderovanie, štatistiky alebo inú
funkcionalitu na reálne vyzerajúcich dátach. Čítaj ich lokálne (`node`, `Read`) a do
konverzácie púšťaj len agregovaný výstup, nie obsah súboru.

**`test-data/` je v `.gitignore` a musí tam zostať.** Súbory sa tam dostávajú ručne, nikdy
cez git — na druhé PC si ich používateľ prekopíruje sám.

Dôvod (zistené 2026-08-16): pôvodne tu stálo, že „repo je private, preto je bezpečné mať
súbor tu". **To bolo nepravdivé** — repo `MatusBakala/Trading_journal` je verejné a GitHub
Pages servíruje branch `main`, takže reálna záloha (414 obchodov, zostatky účtov, P&L,
poznámky z denníka) bola 4,6 MB verejne stiahnuteľná na
`https://matusbakala.github.io/Trading_journal/test-data/...json`. Súbor bol z `main`
odstránený, ale v git histórii zostáva — repo je verejné, takže tie konkrétne dáta treba
považovať za zverejnené. Kľúče v nebezpečenstve neboli: `buildBackupPayload()` z každej
zálohy maže `gClientId` aj `anthropicKey`.

Preto: **nikdy necommituj nič z `test-data/`**, ani „len dočasne". Appka ten priečinok na beh
nepotrebuje, je to výhradne testovacia vzorka.


## Nasadzovanie a cache

Pri každej zmene JS/CSS bumpni `v` v `app-version.json`. Boot skript v `index.html` z tohto súboru zároveň číta pole `modules` a postaví z neho import mapu, ktorá pridá `?v=` **všetkým** modulom – bez nej by sa relatívne importy (`import './init.js'`) ťahali z cache a po nasadení by bežal mix nového `app.js` so starým zvyškom appky.

Keď pribudne alebo zmizne súbor v `js/`, spusti `npm run manifest`. Ak sa na to zabudne, `npm test` to zachytí a povie čo spustiť.

## Zmena návratovej hodnoty zdieľanej funkcie

Keď zmeníš tvar/kontrakt návratovej hodnoty existujúcej zdieľanej funkcie (napr. pridáš nový možný stav ako `{mismatch:true}` do `excursionFor()`), **hneď na to `grep` VŠETKY miesta, ktoré tú funkciu volajú** (`grep -rn "menoFunkcie"` cez `js/`) – nielen to jedno, kde si zmenu potreboval. Inak zostanú "tiché" rozbité miesta, ktoré predpokladajú starý tvar (napr. `$NaN` v agregovaných štatistikách, pád pri `undefined.toFixed()` v AI exporte) – presne toto sa stalo pri MAE/MFE `mismatch` fixe, kde `excursionFor()` má 4 rôznych volajúcich (`trade-modal.js` 2×, `stats.js`, `calendar.js`) a opravený bol najprv len jeden.

## Nasadzovanie a cache

Pri každej zmene JS/CSS bumpni `v` v `app-version.json`. Boot skript v `index.html` z tohto súboru zároveň číta pole `modules` a postaví z neho import mapu, ktorá pridá `?v=` **všetkým** modulom – bez nej by sa relatívne importy (`import './init.js'`) ťahali z cache a po nasadení by bežal mix nového `app.js` so starým zvyškom appky.

Keď pribudne alebo zmizne súbor v `js/`, spusti `npm run manifest`. Ak sa na to zabudne, `npm test` to zachytí a povie čo spustiť.

## Zmena návratovej hodnoty zdieľanej funkcie

Keď zmeníš tvar/kontrakt návratovej hodnoty existujúcej zdieľanej funkcie (napr. pridáš nový možný stav ako `{mismatch:true}` do `excursionFor()`), **hneď na to `grep` VŠETKY miesta, ktoré tú funkciu volajú** (`grep -rn "menoFunkcie"` cez `js/`) – nielen to jedno, kde si zmenu potreboval. Inak zostanú "tiché" rozbité miesta, ktoré predpokladajú starý tvar (napr. `$NaN` v agregovaných štatistikách, pád pri `undefined.toFixed()` v AI exporte) – presne toto sa stalo pri MAE/MFE `mismatch` fixe, kde `excursionFor()` má 4 rôznych volajúcich (`trade-modal.js` 2×, `stats.js`, `calendar.js`) a opravený bol najprv len jeden.

## Zabudovanie stratégie ako default

Appka má v `js/data/default-strategies.js` konštantu `DEFAULT_STRATEGIES` – pole stratégií, ktoré sa automaticky vytvoria (cez `seedDefaultStrategies()` v `js/strategy-notes.js`) pri úplne prvom spustení appky na novom zariadení/prehliadači/nasadení. Slúži to ako predvolený "playbook" pre každého nového používateľa appky, bez potreby importu zálohy.

**Keď požiadam "zabuduj túto stratégiu defaultne" alebo podobne:**
1. Načítaj aktuálny živý obsah tej stratégie (name, description, rules, notes) z bežiaceho localhost preview (kde ju editujem/testujem) – nie z nejakej staršej verzie.
2. Skontroluj `notes` pole cez `isHtmlNotes()` – ak sú stratégie/notes upravované cez rich-text editor, `notes` už je HTML (vrátane prípadných vložených obrázkov ako base64 `data:` URI, nie externé odkazy).
3. Zapíš tento presný obsah (name/description/rules/notes) do `DEFAULT_STRATEGIES` v `js/data/default-strategies.js`, nahraď existujúci záznam pre danú stratégiu (podľa `name`).
4. Ak `notes` obsahuje `<img src="https://...">` (externý odkaz, nie `data:` base64) – **zastav sa a spýtaj sa ma**, či mám právo/vlastníctvo k tým obrázkom, kým ich zabudujem natrvalo do kódu appky. Never ticho embedovať externé/cudzie obrázky bez potvrdenia.
5. Over v prehliadači, že `DEFAULT_STRATEGIES[i].notes === strategyById(id).notes` (presná zhoda) a že sa stratégia správne zobrazuje (screenshot), predtým než to commitnem.
6. `seedDefaultStrategies()` (v `js/strategy-notes.js`) porovnáva fingerprint aktuálneho `DEFAULT_STRATEGIES` s uloženým – ak sa líši, automaticky prepíše `description`/`rules`/`notes` existujúcich built-in stratégií aj na už-seedovaných inštaláciách (netreba ručne mazať/importovať dáta). **Dôležité:** kvôli veľkosti `default-strategies.js` (obsahuje base64 obrázky) sa tento fingerprint-check kvôli výkonu robí len keď sa zmení `app-version.json` – **pri každej zmene DEFAULT_STRATEGIES preto vždy bumpni aj `app-version.json`**, inak sa update na už-seedovaných inštaláciách neprejaví.

## Obnova zálohy vs. kv značky (stav mimo zálohovaných stores)

Záloha (`buildBackupPayload()`) obsahuje `trades`/`shots`/`ohlc`/`strategies`/`stratShots` +
`settings`, ale **nie store `kv`**. Preto keď `applyBackupPayload()` prepíše niektorý store
obsahom zo zálohy, všetky `kv` značky, ktoré ten store popisovali, zrazu **klamú** – ukazujú na
stav, ktorý už v store nie je.

Presne toto spôsobilo, že prehliadač, ktorý si stiahol staršiu zálohu (z Drive alebo ručne z
JSON), zostal **natrvalo** na starej sade stratégií: `defaultStrategiesSeeded`/`AppVersion`/
`Fingerprint` prežili obnovu, `seedDefaultStrategies()` sa preto hneď na začiatku ukončilo a
stratégie pridané novšou verziou kódu (ICT Model 3, Stacked EMAs, Volume Profile) sa už nikdy
nedoplnili. Všetky tri Drive cesty pritom `seedDefaultStrategies()` po obnove **volali** – len to
bol no-op.

**Pravidlo:** keď pridáš `kv` značku, ktorá popisuje obsah nejakého zálohovaného store, pridaj ju
do `DEFAULT_STRATEGY_SEED_KEYS` (resp. analogického zoznamu) a zmaž ju v `applyBackupPayload()` –
stráži to test `test/default-strategy-seed-state.test.mjs`. A guard nikdy nestavaj len na verzii
appky: over aj to, že dáta naozaj v store sú (u stratégií sa porovnávajú mená z
`defaultStrategiesNames`), inak sa už raz pokazená inštalácia nemá ako sama vyliečiť.

## Ďalšie exporty od brokera (Tradovate cez Apex) – čo s nimi appka vie robiť

Okrem **Order History** + **Cash History** (bežný import cez záložku Import CSV → rozpozná sa
ako broker order CSV → spáruje fily do obchodov s `entryLegs`/`exitLegs`) existujú od brokera aj
ďalšie exporty, ktoré má zmysel sťahovať priebežne popri Order History:

- **Position History.csv** – broker vlastné spárovanie kúpa↔predaj (`Buy Fill ID`/`Sell Fill ID`/
  `Paired Qty`/`P/L` na pár, s presným časom oboch strán). Appka ho zatiaľ priamo neimportuje,
  ale je to výborný **nezávislý zdroj na krížovú kontrolu**: súčet stĺpca `P/L` by mal sedieť so
  súčtom `computePnl()` (bez poplatkov) appky pre ten istý účet/obdobie. Overené 2026-08-08 na
  účte FundedFutures 26.7 (29.7.–7.8.): CSV −$1 335.00 vs appka −$1 337.00 (0.15% rozdiel).
  Má fill-úroveň presnosti (čas aj cena), takže ak niekedy chýba Order History pre nejaké
  obdobie/účet, Position History za to isté obdobie je alternatívny zdroj s porovnateľnou
  presnosťou – vieš z neho ručne dorekonštruovať entryLegs/exitLegs, aj keď na to appka zatiaľ
  nemá priamy import.
- **Performance.<timestamp>.pdf** – čitateľný report generovaný z tých istých spárovaných dát
  (rovnaké obchody ako v Position History.csv, len naformátované + agregované štatistiky:
  Gross P/L, win rate, avg trade time, max drawdown, max run-up s dátumami). Užitočné ako
  rýchla vizuálna kontrola appkiných vlastných štatistík, nie je to zdroj nových dát na import.
  Čítanie PDF na tomto stroji vyžaduje `pip install pypdf` (chýba `poppler`/`pdftotext`,
  homebrew nie je nainštalovaný) – použi napr. `python3 -c "import pypdf; ..."`, nie `Read` tool
  priamo (ten potrebuje `pdftoppm`).

**Odporúčanie:** Position History (+ Performance PDF ako doplnok) sťahuj priebežne spolu s Order
History/Cash History – nepridáva to nové obchody navyše, ale slúži ako overenie, že appkina
rekonštrukcia fillov a P&L sedí s tým, čo hovorí sám broker.