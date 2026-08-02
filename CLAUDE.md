Vytvorenie podobnej aplikácie ako je Tradezella.
Je to web/app štatistika mojich tradov a setup-ov/ stratégií. Pokiaľ nájdeš niečo čo by si zlepšil, pridal tak to navrhni.

Odpovedaj stručne a vecne, vždy otestuj čo si vykonal či to funguje. Neponukaj upload na github, urobim si to sám.


Treba mať aj nejaký back-up plan. Teda obsah sa musí uploadovať niekde cloudove úložisko každý deň.

## Zabudovanie stratégie ako default

Appka má v `js/data/default-strategies.js` konštantu `DEFAULT_STRATEGIES` – pole stratégií, ktoré sa automaticky vytvoria (cez `seedDefaultStrategies()` v `js/strategy-notes.js`) pri úplne prvom spustení appky na novom zariadení/prehliadači/nasadení. Slúži to ako predvolený "playbook" pre každého nového používateľa appky, bez potreby importu zálohy.

**Keď požiadam "zabuduj túto stratégiu defaultne" alebo podobne:**
1. Načítaj aktuálny živý obsah tej stratégie (name, description, rules, notes) z bežiaceho localhost preview (kde ju editujem/testujem) – nie z nejakej staršej verzie.
2. Skontroluj `notes` pole cez `isHtmlNotes()` – ak sú stratégie/notes upravované cez rich-text editor, `notes` už je HTML (vrátane prípadných vložených obrázkov ako base64 `data:` URI, nie externé odkazy).
3. Zapíš tento presný obsah (name/description/rules/notes) do `DEFAULT_STRATEGIES` v `js/data/default-strategies.js`, nahraď existujúci záznam pre danú stratégiu (podľa `name`).
4. Ak `notes` obsahuje `<img src="https://...">` (externý odkaz, nie `data:` base64) – **zastav sa a spýtaj sa ma**, či mám právo/vlastníctvo k tým obrázkom, kým ich zabudujem natrvalo do kódu appky. Never ticho embedovať externé/cudzie obrázky bez potvrdenia.
5. Over v prehliadači, že `DEFAULT_STRATEGIES[i].notes === strategyById(id).notes` (presná zhoda) a že sa stratégia správne zobrazuje (screenshot), predtým než to commitnem.
6. `seedDefaultStrategies()` (v `js/strategy-notes.js`) porovnáva fingerprint aktuálneho `DEFAULT_STRATEGIES` s uloženým – ak sa líši, automaticky prepíše `description`/`rules`/`notes` existujúcich built-in stratégií aj na už-seedovaných inštaláciách (netreba ručne mazať/importovať dáta). **Dôležité:** kvôli veľkosti `default-strategies.js` (obsahuje base64 obrázky) sa tento fingerprint-check kvôli výkonu robí len keď sa zmení `app-version.json` – **pri každej zmene DEFAULT_STRATEGIES preto vždy bumpni aj `app-version.json`**, inak sa update na už-seedovaných inštaláciách neprejaví.