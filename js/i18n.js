import { renderAll, saveSettings } from './init.js';
import { state } from './state.js';
import { STRATEGY_I18N_EN } from './data/strategy-i18n-en.js';

/* ================= I18N ================= */
export const I18N_EN={
'Kalendár':'Calendar','Štatistiky':'Statistics','Obchody':'Trades','Reporty':'Reports','Dáta grafu':'Chart data','Nastavenia':'Settings',
'Táto sekcia zobrazuje len obchody, ku ktorým si napísal poznámku/review (pole „Denník / poznámky k obchodu"). Nemusíš nič ručne pridávať – stačí obchod okomentovať a automaticky sa objaví tu.':'This section shows only trades you\'ve written a note/review for (the "Journal / trade notes" field). Nothing to add manually – just comment on a trade and it will show up here automatically.',
'Zatiaľ žiadne okomentované obchody. Otvor obchod a napíš poznámku/review – automaticky sa zobrazí tu.':'No commented trades yet. Open a trade and write a note/review – it will show up here automatically.',
'Poznámka':'Note',
'+ Pridať obchod':'+ Add trade','Všetky účty':'All accounts',
'Celé obdobie':'All time','Tento mesiac':'This month','Posledných 30 dní':'Last 30 days','Posledných 90 dní':'Last 90 days','Tento rok':'This year',
'Equity krivka':'Equity curve','Denný P&L':'Daily P&L','Podľa symbolu':'By symbol','Podľa dňa v týždni':'By day of week','Podľa hodiny vstupu':'By entry hour',
'Podľa emócie pri vstupe':'By entry emotion','Podľa emócie pri výstupe':'By exit emotion','Emócia pri vstupe':'Emotion at entry','Emócia pri výstupe':'Emotion at exit',
'Ázia':'Asia','Londýn':'London','Mimo session':'Off session','Podľa session':'By session','Všetky session':'All sessions',
'Stratégie':'Strategies','Stratégia':'Strategy','+ Pridať stratégiu':'+ Add strategy','Všetky stratégie':'All strategies','– žiadna –':'– none –','– (bez stratégie)':'– (no strategy)',
'Všetky hodiny':'All hours','Zobraziť obchody z tejto hodiny':'Show trades from this hour',
'Otvorí graf na TradingView (symbol a timeframe). Vstup/výstup si tam appka dokresliť nevie.':'Opens the chart on TradingView (symbol and timeframe). The app cannot draw your entry/exit there.',
'Dátum obchodu skopírovaný – v TradingView stlač Alt+G a vlož':'Trade date copied – in TradingView press Alt+G and paste',
'Najhorší bod proti tebe počas obchodu':'Worst point against you during the trade',
'Najlepší bod v tvoj prospech počas obchodu':'Best point in your favour during the trade',
'Rozdiel medzi najlepším bodom obchodu a tým, čo si reálne zobral':'Difference between the trade\'s best point and what you actually took',
'nechané na stole':'left on the table','zo sviečok':'from candles',
'Staršie zálohy':'Older backups','Načítavam staršie zálohy…':'Loading older backups…',
'Zatiaľ žiadne denné zálohy – prvá vznikne pri najbližšej synchronizácii.':'No daily backups yet – the first one is created on the next sync.',
'Obnovenie prepíše aktuálne dáta v tomto prehliadači.':'Restoring overwrites the current data in this browser.',
'Obnoviť':'Restore','Načítanie zlyhalo:':'Loading failed:',
'MAE / MFE – ako ďaleko šla cena proti tebe a v tvoj prospech':'MAE / MFE – how far price went against you and in your favour',
'Potrebné sú sviečkové dáta – naimportuj ich v záložke „Dáta grafu“, potom sa tu MAE/MFE dopočíta.':'Candle data is required – import it on the "Chart data" tab and MAE/MFE will be computed here.',
'uzavretých obchodov má sviečkové dáta. Každý bod je jeden obchod.':'closed trades have candle data. Each dot is one trade.',
'Ziskové':'Winners','Stratové':'Losers',
'MAE – najhoršie proti tebe ($)':'MAE – worst against you ($)',
'MFE – najlepšie v tvoj prospech ($)':'MFE – best in your favour ($)',
'Priem. MAE ziskových':'Avg MAE of winners','koľko museli víťazi vydržať proti sebe':'how much winners had to sit through',
'Najhorší MAE víťaza':'Worst MAE of a winner','pod týmto by ťa stop vyhodil zo ziskového obchodu':'a tighter stop would have knocked you out of a winner',
'Priem. MFE stratových':'Avg MFE of losers','koľko zisku stratové obchody medzitým ukázali':'how much profit losing trades showed on the way',
'Nechané na stole':'Left on the table','rozdiel medzi MFE a reálnym ziskom víťazov':'gap between MFE and what winners actually took',
'Kontrola dátumu – takto to appka prečítala:':'Date check – this is how the app read it:',
'Dátum v tvare dd/mm/rrrr je dvojznačný – appka ho číta ako mesiac/deň/rok. Skontroluj, či deň a mesiac sedia; ak nie, prehoď ich v CSV alebo použi formát rrrr-mm-dd.':'A dd/mm/yyyy date is ambiguous – the app reads it as month/day/year. Check that day and month are right; if not, swap them in the CSV or use yyyy-mm-dd.',
'AI rozbor obchodu':'AI trade review','Rozobrať tento obchod':'Review this trade','screenshotov':'screenshots',
'Pošle Claude parametre obchodu, sviečky, MAE/MFE, pravidlá a tvoje screenshoty.':'Sends Claude the trade parameters, candles, MAE/MFE, rules and your screenshots.',
'Definuj si obchodné stratégie s pravidlami vstupu a sleduj, ako ich dodržiavaš a ako sa im darí.':'Define your trading strategies with entry rules and track how well you follow them and how they perform.',
'Nová stratégia':'New strategy','Upraviť stratégiu':'Edit strategy','Názov *':'Name *','napr. VWAP Reversal, ORB Breakout...':'e.g. VWAP Reversal, ORB Breakout...',
'Popis / kontext':'Description / context','Kedy a prečo túto stratégiu používaš, na akých symboloch/timeframe...':'When and why you use this strategy, on which symbols/timeframe...',
'Pravidlá vstupu (checklist)':'Entry rules (checklist)','+ Pridať pravidlo':'+ Add rule','napr. Cena nad VWAP, potvrdenie objemom...':'e.g. Price above VWAP, volume confirmation...',
'Uložiť stratégiu':'Save strategy','Zadaj názov stratégie':'Enter a strategy name','Stratégia uložená':'Strategy saved',
'Vymazať túto stratégiu? Obchody, ktoré ju používajú, ostanú zachované, len stratia priradenie.':'Delete this strategy? Trades using it will be kept, they will just lose the assignment.','Stratégia vymazaná':'Strategy deleted',
'Zatiaľ žiadne stratégie. Klikni na "+ Pridať stratégiu" a definuj si prvý playbook – pravidlá vstupu, ktoré chceš dodržiavať.':'No strategies yet. Click "+ Add strategy" to define your first playbook – entry rules you want to follow.',
'Upraviť':'Edit','Obchody →':'Trades →','Obchodov':'# trades','Priem. R':'Avg R','Dodrž. pravidiel':'Rule adherence','Dodržiavanosť jednotlivých pravidiel:':'Adherence per rule:','Dodržal(a) si pravidlá tejto stratégie?':'Did you follow this strategy\'s rules?',
'Pravidlá':'Rules','Pravidlo':'Rule','← Späť na zoznam':'← Back to list',
'Follow rate = ako často toto pravidlo dodržíš. Ostatné stĺpce = výkonnosť obchodov, kde bolo toto pravidlo dodržané.':'Follow rate = how often you follow this rule. The other columns = performance of trades where this rule was followed.',
'Táto stratégia nemá zadané žiadne pravidlá. Klikni na "Upraviť" a pridaj checklist vstupu.':'This strategy has no rules yet. Click "Edit" to add an entry checklist.',
'Dlhší popis stratégie – kontext, presné pravidlá, príklady obchodov, čo funguje a čo nie...':'Longer strategy writeup – context, precise rules, trade examples, what works and what doesn\'t...',
'Uložiť poznámky':'Save notes','Poznámky uložené':'Notes saved',
'Táto stratégia zatiaľ nemá priradené žiadne obchody. Priraď ju obchodu v jeho detaile.':'This strategy has no trades assigned yet. Assign it to a trade from the trade detail.',
'Scenáre':'Scenarios','Pridať scenár':'Add scenario','Uložiť scenáre':'Save scenarios','Scenáre uložené':'Scenarios saved',
'Vyber reálny obchod, ktorý je príkladom tejto stratégie, a napíš, čo je na ňom typické alebo poučné. Jeho screenshoty sa zobrazia automaticky.':'Pick a real trade that is an example of this strategy, and write what is typical or instructive about it. Its screenshots will show up automatically.',
'Táto stratégia zatiaľ nemá priradené žiadne obchody – najprv jej nejaký priraď v poli Stratégia pri obchode.':'This strategy has no trades assigned yet – first assign it to a trade using the Strategy field on the trade.',
'– Vyber obchod –':'– Pick a trade –','Čo je na tomto obchode typické pre túto stratégiu, čo sa z neho dá poučiť...':'What is typical about this trade for this strategy, what can be learned from it...',
'Táto stratégia zatiaľ nemá žiadne scenáre. Pridaj reálne obchody ako príklad, ako táto stratégia vyzerá v praxi.':'This strategy has no scenarios yet. Add real trades as examples of what this strategy looks like in practice.',
'Prepojený obchod bol vymazaný.':'The linked trade was deleted.',
'predchádzajúci high':'previous high','Entry':'Entry','nižší low – sweep':'lower low – sweep','vyšší low – drží':'higher low – holds',
'PDH / kľúčová úroveň':'PDH / key level','Breakout':'Breakout','zlomená úroveň (teraz support)':'broken level (now support)','Entry na retest':'Entry on retest',
'Stop':'Stop','Target 1':'Target 1','Target 2':'Target 2','Zobraziť':'View',
'Prázdny riadok = nový odsek. Riadok VEĽKÝMI PÍSMENAMI = nadpis. Riadky začínajúce "- " = zoznam.':'Blank line = new paragraph. A line in ALL CAPS = heading. Lines starting with "- " = list.',
'Klikni pre vloženie do textu':'Click to insert into text','Obrázky – klikni na náhľad pre vloženie značky do textu na mieste kurzora':'Images – click a thumbnail to insert a marker into the text at the cursor position',
'(obrázok bol odstránený)':'(image was removed)',
'Táto stratégia zatiaľ nemá poznámky.':'This strategy has no notes yet.','+ Pridať poznámky':'+ Add notes',
'Predvolená':'Default','Sivá':'Gray','Hnedá':'Brown','Oranžová':'Orange','Žltá':'Yellow','Zelená':'Green','Modrá':'Blue','Fialová':'Purple','Ružová':'Pink','Červená':'Red','Čierna':'Black',
'Vlastná farba...':'Custom color...','Do bloku':'Justify','Vľavo':'Left','Na stred':'Center','Vpravo':'Right','Písmo':'Font',
'Prepnúť tému':'Toggle theme',
'Upraviť pravidlá':'Edit rules','+ Pridať pravidlá':'+ Add rules','Presunúť ťahaním':'Drag to reorder',
'Uprav text, zoraď šípkami, pridaj alebo odober pravidlá. Premenovanie pravidla nezmení históriu už zaznamenaných obchodov – tie zostanú priradené k pôvodnému zneniu.':'Edit the text, reorder with the arrows, add or remove rules. Renaming a rule will not change the history of already-logged trades – they stay linked to the original wording.',
'😌 Pokoj / disciplína':'😌 Calm / disciplined','💪 Sebadôvera':'💪 Confidence','😰 FOMO':'😰 FOMO','😨 Strach':'😨 Fear','🤑 Chamtivosť':'🤑 Greed','😤 Netrpezlivosť':'😤 Impatience','😡 Frustrácia / revenge':'😡 Frustration / revenge','🥱 Nuda':'🥱 Boredom','– (nezadané)':'– (not set)',
'Počet obchodov':'Number of trades','Očak. hodnota / trade':'Expected value / trade','Najlepší deň':'Best day','Najhorší deň':'Worst day','Žiadne dáta':'No data',
'Najlepší mesiac':'Best month','Najhorší mesiac':'Worst month','Priemer / mesiac':'Average / month',
'Dni':'Days','Celkový P&L':'Total P&L','Priemerný P&L / obchod':'Average P&L / trade','Priemerný ziskový obchod':'Average winning trade','Priemerný stratový obchod':'Average losing trade',
'Ziskové obchody':'Winning trades','Stratové obchody':'Losing trades','Breakeven obchody':'Breakeven trades',
'Max po sebe idúce výhry':'Max consecutive wins','Max po sebe idúce prehry':'Max consecutive losses','Najväčší zisk':'Largest profit','Najväčšia strata':'Largest loss',
'Poplatky spolu':'Total commissions','Priem. držanie (všetky)':'Avg hold time (all)','Priem. držanie (ziskové)':'Avg hold time (winners)','Priem. držanie (stratové)':'Avg hold time (losers)',
'Otvorené obchody (bez výstupu)':'Open trades (no exit)','Obchodných dní':'Trading days','Ziskové dni':'Winning days','Stratové dni':'Losing days','Breakeven dni':'Breakeven days',
'Max po sebe ziskových dní':'Max consecutive winning days','Max po sebe stratových dní':'Max consecutive losing days',
'Priemerný denný P&L':'Average daily P&L','Priemerný ziskový deň':'Average winning day','Priemerný stratový deň':'Average losing day',
'Priem. denný objem (kontrakty)':'Avg daily volume (contracts)','Očakávaná hodnota / obchod':'Trade expectancy','Priemerný realizovaný R-multiple':'Average realized R-multiple',
'Mesiac:':'Month:','Po':'Mo','Ut':'Tu','St':'We','Št':'Th','Pi':'Fr','So':'Sa','Ne':'Su',
'Týždeň':'Week',
'Pondelok':'Monday','Utorok':'Tuesday','Streda':'Wednesday','Štvrtok':'Thursday','Piatok':'Friday','Sobota':'Saturday','Nedeľa':'Sunday',
'Všetky symboly':'All symbols','Hľadať v poznámkach/tagoch...':'Search notes/tags...','Dátum':'Date','Smer':'Side','Množstvo':'Quantity','Vstup':'Entry','Výstup':'Exit','Trvanie':'Duration','Tagy':'Tags',
'Žiadne obchody. Pridaj ručne alebo importuj CSV.':'No trades yet. Add one manually or import a CSV.','Filter podľa tagov:':'Filter by tags:','✕ Zrušiť filter':'✕ Clear filter',
'Import obchodov z CSV':'Import trades from CSV','Importovať do účtu':'Import into account','CSV súbor':'CSV file','Mapovanie stĺpcov':'Column mapping','Náhľad (prvých 5 riadkov)':'Preview (first 5 rows)','Importovať obchody':'Import trades',
'Nahraj CSV export z tvojej platformy. Appka sa pokúsi automaticky rozpoznať stĺpce – skontroluj mapovanie a potvrď import. Podporované sú čiarky aj bodkočiarky, desatinné bodky aj čiarky, dátumy vo formátoch':'Upload a CSV export from your platform. The app auto-detects columns – check the mapping and confirm the import. Supports commas and semicolons, decimal points and commas, dates in formats',
'aj unix timestamp.':'and unix timestamps.',
'Smer (long/short)':'Side (long/short)','Vstupná cena':'Entry price','Výstupná cena':'Exit price','Čas vstupu *':'Entry time *','Čas výstupu':'Exit time','Poplatky':'Fees','P&L (hotové)':'P&L (imported)','Poznámky':'Notes',
'Pozitívne tagy/Setup':'Positive tags/Setup','Negatívne tagy/Chyby':'Negative tags/Mistakes',
'Stiahnuť sviečky z internetu (Yahoo Finance)':'Download candles from the internet (Yahoo Finance)',
'Automaticky stiahne historické sviečky pre futures (GC → GC=F, NQ → NQ=F, MGC → MGC=F...). Limity dát: 1m sviečky max ~7 dní dozadu, 5m/15m max ~60 dní, 1h ~2 roky, denné neobmedzene. Pri otvorenom obchode to vieš spraviť aj priamo tlačidlom „⟳ Stiahnuť sviečky" nad grafom.':'Automatically downloads historical candles for futures (GC → GC=F, NQ → NQ=F, MGC → MGC=F...). Data limits: 1m candles ~7 days back, 5m/15m ~60 days, 1h ~2 years, daily unlimited. With a trade open you can also use the "⟳ Download candles" button above the chart.',
'Dní dozadu':'Days back','Stiahnuť':'Download','Nahrať dáta':'Upload data','Nahrané datasety':'Uploaded datasets','Zatiaľ žiadne dáta.':'No data yet.',
'Nahrať OHLC dáta z CSV (napr. export z TradingView)':'Upload OHLC data from CSV (e.g. TradingView export)',
'Alternatíva s presnými dátami tvojho kontraktu: v TradingView otvor graf → menu grafu →':'Alternative with exact data for your contract: in TradingView open the chart → chart menu →',
'→ stiahnutý CSV nahraj sem. CSV musí obsahovať stĺpce: čas, open, high, low, close (voliteľne volume).':'→ upload the downloaded CSV here. The CSV must contain columns: time, open, high, low, close (volume optional).',
'napr. NQ, GC, MGC':'e.g. NQ, GC, MGC','1 hod':'1 hour','4 hod':'4 hours','Denný':'Daily','Sviečok':'Candles','Od':'From','Do':'To','Vymazať':'Delete',
'Účty':'Accounts',
'Každý obchod patrí do jedného účtu. Aktívny účet prepínaš hore v hlavičke – dashboard, štatistiky, kalendár aj zoznam obchodov sa počítajú len z neho (alebo zvoľ „Všetky účty"). Počiatočný kapitál sa používa pre equity krivku.':'Each trade belongs to one account. Switch the active account in the header – the dashboard, statistics, calendar and trade list are computed from it (or choose "All accounts"). Starting capital is used for the equity curve.',
'Názov účtu':'Account name','Počiat. kapitál':'Starting capital','+ Pridať účet':'+ Add account','Uložiť účty':'Save accounts',
'Hodnota bodu (multiplikátor) podľa symbolu':'Point value (multiplier) per symbol',
'P&L = (výstup − vstup) × smer × množstvo × multiplikátor − poplatky. Pre futures: NQ=20, MNQ=2, ES=50, MES=5, GC=100 (zlato), MGC=10. Symbol obchodu sa páruje aj podľa prefixu (NQZ5 → NQ).':'P&L = (exit − entry) × side × quantity × multiplier − fees. For futures: NQ=20, MNQ=2, ES=50, MES=5, GC=100 (gold), MGC=10. Trade symbols also match by prefix (NQZ5 → NQ).',
'+ Pridať symbol':'+ Add symbol','Uložiť multiplikátory':'Save multipliers','Záloha dát':'Backup','Exportovať zálohu (JSON)':'Export backup (JSON)','Obnoviť zo zálohy':'Restore from backup',
'Záloha obsahuje obchody, nastavenia a screenshoty. Dáta sú inak uložené len v tomto prehliadači.':'The backup contains trades, settings and screenshots. Otherwise data is stored only in this browser.',
'Nebezpečná zóna':'Danger zone','Vymazať všetky dáta':'Delete all data',
'Nový obchod':'New trade','Množstvo (kontrakty)':'Quantity (contracts)','Účet':'Account','Vstupná cena *':'Entry price *','P&L manuálne (prepíše výpočet)':'Manual P&L (overrides calculation)',
'🟢 Pozitívne tagy – čo bolo dobré (odd. čiarkou)':'🟢 Positive tags – what went well (comma separated)','🔴 Negatívne tagy – chyby (odd. čiarkou)':'🔴 Negative tags – mistakes (comma separated)',
'A+ setup, dodržaný plán, trpezlivosť...':'A+ setup, followed plan, patience...','FOMO, posunutý stop, revenge trading...':'FOMO, moved stop, revenge trading...',
'Denník / poznámky k obchodu':'Journal / trade notes',
'Setup a dôvod vstupu, manažment pozície, emócie, chyby, čo nabudúce spraviť inak...':'Setup and entry reason, position management, emotions, mistakes, what to do differently next time...',
'Graf':'Chart','Screenshoty':'Screenshots','Žiadne screenshoty':'No screenshots',
'Pretiahni sem obrázok, vlož zo schránky (Ctrl+V) alebo':'Drag an image here, paste from clipboard (Ctrl+V) or','vyber súbor':'choose a file',
'Zavrieť':'Close','Uložiť obchod':'Save trade',
'Zatiaľ žiadne pozitívne tagy – napíš prvý hore (napr. A+ setup, dodržaný plán).':'No positive tags yet – type the first one above (e.g. A+ setup, followed plan).',
'Zatiaľ žiadne negatívne tagy – napíš prvý hore (napr. FOMO, posunutý stop).':'No negative tags yet – type the first one above (e.g. FOMO, moved stop).',
'⟳ Stiahnuť sviečky':'⟳ Download candles','Sťahujem...':'Downloading...','– dataset:':'– dataset:',
'Knižnica grafu sa nenačítala (skontroluj internetové pripojenie).':'Chart library failed to load (check your internet connection).',
'Zadaj symbol a čas vstupu.':'Enter a symbol and entry time.','Pre symbol':'For symbol','nie sú žiadne OHLC dáta.':'there is no OHLC data.',
'Klikni hore na':'Click above on','„⟳ Stiahnuť sviečky"':'"⟳ Download candles"','(Yahoo Finance, automaticky) alebo nahraj CSV v záložke':'(Yahoo Finance, automatic) or upload a CSV in the tab',
'Zadaj symbol':'Enter a symbol','Zadaj čas vstupu':'Enter entry time','Zadaj vstupnú cenu alebo manuálne P&L':'Enter an entry price or manual P&L',
'Obchod uložený':'Trade saved','Obchod vymazaný':'Trade deleted','Vymazať tento obchod?':'Delete this trade?','Screenshot vložený':'Screenshot added',
'CSV je prázdne alebo má len hlavičku':'CSV is empty or has only a header','Namapuj minimálne Symbol a Čas vstupu':'Map at least Symbol and Entry time','Najprv nahraj CSV':'Upload a CSV first',
'Vyber CSV súbor':'Choose a CSV file','Prázdny súbor':'Empty file','Nenašiel som stĺpce open/high/low/close':'Could not find open/high/low/close columns',
'Nepodarilo sa načítať žiadne sviečky – skontroluj formát':'Could not parse any candles – check the format','OHLC dáta nahrané':'OHLC data uploaded','Vymazať tento dataset?':'Delete this dataset?',
'🔍 Kontrola pokrytia sviečkových dát':'🔍 Candle data coverage check',
'Skontroluje, ktoré uzavreté obchody nemajú zodpovedajúce sviečkové dáta (potrebné pre vzory Green to Red, Väčšinu času v strate, Nezvyčajne vysoký objem) a ukáže presne, pre ktoré symboly a dátumy chýbajú, aby si mohol cielene dostiahnuť len to, čo treba.':'Checks which closed trades have no matching candle data (needed for the Green to Red, Majority in drawdown, and Unusual volume patterns) and shows exactly which symbols and dates are missing, so you can re-download only what you need.',
'Skontrolovať chýbajúce dáta':'Check for missing data',
'Zobraziť detaily chýbajúcich dát →':'View missing data details →',
'Všetky uzavreté obchody majú kompletné sviečkové dáta.':'All closed trades have complete candle data.',
'Chýbajú sviečkové dáta pre':'Missing candle data for','z':'of','uzavretých obchodov':'closed trades','obchodov bez dát':'trades without data',
'žiadny dataset pre tento symbol':'no dataset for this symbol',
'Dáta stiahnuté':'Data downloaded','Multiplikátory uložené':'Multipliers saved','Uložené':'Saved','Záloha stiahnutá':'Backup downloaded','Neplatný JSON':'Invalid JSON','Záloha obnovená':'Backup restored',
'Obnovenie PREPÍŠE všetky aktuálne dáta. Pokračovať?':'Restoring will OVERWRITE all current data. Continue?',
'Naozaj vymazať VŠETKY obchody, screenshoty a dáta?':'Really delete ALL trades, screenshots and data?','Posledné varovanie – táto akcia sa nedá vrátiť. Vymazať?':'Last warning – this cannot be undone. Delete?',
'Všetky dáta vymazané':'All data deleted','Účty uložené':'Accounts saved','Musí existovať aspoň jeden účet':'At least one account must exist','Zobrazujem všetky účty':'Showing all accounts',
'Nepoznám Yahoo symbol pre':'Unknown Yahoo symbol for','Zadaj ho ručne (napr. GC=F, NQ=F, BTC-USD):':'Enter it manually (e.g. GC=F, NQ=F, BTC-USD):','Zadaj ho ručne (napr. GC=F):':'Enter it manually (e.g. GC=F):',
'Yahoo nevrátil dáta':'Yahoo returned no data','Chýbajú OHLC dáta v odpovedi':'OHLC data missing in the response','Yahoo vrátil 0 sviečok pre toto obdobie':'Yahoo returned 0 candles for this period',
'0 sviečok':'0 candles','skús to znova alebo nahraj CSV':'try again or upload a CSV','Sťahovanie zlyhalo':'Download failed','neznáma chyba':'unknown error',
'VZORY V OBCHODOVANÍ':'TRADING PATTERNS','Silná stránka':'Strength','Priestor na zlepšenie':'Area to improve','Neutrálny vzor':'Neutral pattern',
'Potrebných je aspoň':'You need at least','uzavretých obchodov na rozpoznanie vzorov (zatiaľ':'closed trades to detect patterns (currently',
'Top vzory naprieč':'Top patterns across','obchodmi':'trades','obchodov':'trades','Chýbajú sviečkové dáta':'Missing candle data',
'Menovateľ je nižší ako celkový počet obchodov – tento vzor vyžaduje sviečkové dáta, ktoré nie sú dostupné pre všetky obchody.':'The denominator is lower than the total trade count – this pattern needs candle data that is not available for every trade.',
'Väčšinu času v strate':'Mostly in drawdown','Dlhšie ako priemerné držanie':'Longer than average hold','Nezvyčajne vysoký objem':'Unusually high volume',
'Rýchly nový vstup hneď po stratovom obchode':'Quickly re-entered right after a losing trade',
'Výrazne viac obchodov za deň než je tvoj priemer':'Significantly more trades in a day than your average',
'🤖 AI ZHODNOTENIE':'🤖 AI INSIGHTS','🤖 AI zhodnotenie (Claude)':'🤖 AI insights (Claude)',
'Písané zhodnotenie tvojho obchodovania od Claude, na základe štatistík a vzorov vyššie.':'A written review of your trading from Claude, based on the stats and patterns above.',
'Získať AI zhodnotenie':'Get AI insights','Analyzujem…':'Analyzing…','Čakám na odpoveď od Claude…':'Waiting for a response from Claude…',
'Najprv si v Nastaveniach ulož svoj Anthropic API kľúč.':'First save your Anthropic API key in Settings.',
'uzavretých obchodov na AI zhodnotenie.':'closed trades for AI insights.',
'Prázdna odpoveď.':'Empty response.','Chyba:':'Error:',
'Odpoveď bola príliš dlhá a orezaná. Skús to znova alebo zvoľ iný model.':'The response was too long and got truncated. Try again or pick a different model.',
'📥 Export pre AI':'📥 Export for AI','Stiahni dáta a prompt na použitie zadarmo v claude.ai (bez API poplatkov)':'Download the data and prompt to use for free in claude.ai (no API charges)',
'JSON stiahnutý, prompt skopírovaný do schránky – vlož oboje do claude.ai':'JSON downloaded, prompt copied to clipboard – paste both into claude.ai',
'JSON stiahnutý':'JSON downloaded',
'Appka vie poslať zhrnutie tvojich štatistík (P&L, win rate, rozpoznané vzory a pod. – nie surové obchody či poznámky) na Claude API a získať písané zhodnotenie s odporúčaniami. Kľúč sa ukladá len lokálne v tomto prehliadači a nikdy sa nezálohuje ani nezdieľa – nepoužívaj appku s vloženým kľúčom na cudzom/zdieľanom zariadení.':'The app can send a summary of your stats (P&L, win rate, detected patterns, etc. – not raw trades or notes) to the Claude API and get back a written review with recommendations. The key is stored only locally in this browser and is never backed up or shared – don\'t use the app with a key entered on a shared/foreign device.',
'Anthropic API kľúč':'Anthropic API key','Uložiť kľúč':'Save key','Kľúč získaš na':'Get a key at',
'💬 Opýtať sa AI':'💬 Ask AI','Model':'Model','Odoslať':'Send','Claude píše…':'Claude is typing…',
'Opýtaj sa niečo o svojom obchodovaní...':'Ask something about your trading...',
'Opýtaj sa čokoľvek o svojich štatistikách, vzoroch alebo výkonnosti – appka pošle Claude súhrn tvojich dát.':'Ask anything about your stats, patterns, or performance – the app will send Claude a summary of your data.',
'Najprv si v Nastaveniach ulož svoj Anthropic API kľúč':'First save your Anthropic API key in Settings',
'Obchod bol dočasne v zisku, no skončil v strate':'Trade was floating in profit but closed at a loss',
'Väčšinu trvania obchodu bola cena proti tebe':'Price was against you for most of the trade\'s duration',
'Obchod držaný dlhšie než je tvoj priemer':'Trade held longer than your average',
'Obchodoval si s výrazne vyšším objemom než zvyčajne':'You traded with significantly higher volume than usual',
'Zrušiť':'Cancel','Odpojiť':'Disconnect','Odstrániť':'Remove',
'Nepripojené.':'Not connected.','✅ Pripojené':'✅ Connected','⏳ Synchronizujem…':'⏳ Syncing…',
'⚠️ Chyba synchronizácie: ':'⚠️ Sync error: ',' · posledná synchronizácia ':' · last sync ',' · denná záloha ':' · daily backup ',
'🔗 Pripojiť Google Drive':'🔗 Connect Google Drive','⬆️ Nahrať na Drive':'⬆️ Upload to Drive','⬇️ Stiahnuť z Drive':'⬇️ Download from Drive',
'🕘 Staršie zálohy':'🕘 Older backups','Nahrať na Drive':'Upload to Drive','Stiahnuť z Drive':'Download from Drive','Manuálna záloha':'Manual backup',
'Najprv sa pripoj ku Google Drive':'Connect to Google Drive first','Najprv zadaj Google Client ID':'Enter a Google Client ID first',
'Na Google Drive zatiaľ nie je žiadna záloha':'There is no backup on Google Drive yet','Dáta stiahnuté z Google Drive':'Data downloaded from Google Drive',
'Pripojené ku Google Drive':'Connected to Google Drive','Google Drive odpojený':'Google Drive disconnected',
'Google Identity Services sa nenačítalo':'Google Identity Services failed to load','Prihlásenie zamietnuté':'Sign-in denied',
'Stiahnutie PREPÍŠE aktuálne lokálne dáta v tomto prehliadači dátami z Google Drive. Pokračovať?':'Download will OVERWRITE the current local data in this browser with data from Google Drive. Continue?',
'Záloha obsahuje obchody, nastavenia a screenshoty. Bez pripojeného Google Drive sú dáta uložené len v tomto prehliadači.':'The backup contains trades, settings and screenshots. Without Google Drive connected, data is stored only in this browser.',
'Appka si vie sama ukladať a načítavať zálohu z tvojho Google Drive (do skrytého priečinka appky, nevidno ho v bežnom Drive). Vďaka tomu sa dáta objavia aj v inom prehliadači či na mobile, bez ručného exportu/importu. Návod na získanie Client ID nájdeš v README/pokynoch od Claude.':'The app can automatically save and load a backup from your Google Drive (into a hidden app folder, not visible in regular Drive). That way data shows up in another browser or on mobile without manual export/import. See the README for how to get a Client ID.',
'"Nahrať na Drive" pošle aktuálny lokálny stav do cloudu (prepíše to, čo tam je). "Stiahnuť z Drive" naopak prepíše dáta v tomto prehliadači tým, čo je uložené v cloude – použi to napr. keď appka na novom zariadení automaticky nestiahla dáta sama.':'"Upload to Drive" sends the current local state to the cloud (overwriting what is there). "Download from Drive" overwrites the data in this browser with what is stored in the cloud – use it e.g. when the app on a new device did not download data automatically.',
'Okrem hlavnej zálohy (ktorá sa pri každej zmene prepisuje) sa raz denne odkladá datovaná kópia. Drží sa posledných 14 dní – cez "Staršie zálohy" sa dá vrátiť k ľubovoľnému dňu, napr. keď si omylom niečo vymazal.':'Besides the main backup (rewritten on every change), a dated copy is stored once a day. The last 14 days are kept – via "Older backups" you can restore any day, e.g. if you deleted something by mistake.',
'Kľúč uložený':'Key saved','Pravidlá uložené':'Rules saved','Limity uložené':'Limits saved',
'Prompt uložený':'Prompt saved','Prompt obnovený na predvolený':'Prompt reset to default',
'URL odkazu:':'Link URL:','Nadpis':'Heading','Farba textu':'Text color','Farba zvýraznenia':'Highlight color','Zarovnanie':'Alignment',
'Vložiť odkaz':'Insert link','Vymazať formátovanie':'Clear formatting','Vložiť obrázok':'Insert image',
'Najviac nechané na stole':'Most left on the table','Najtesnejšie prežitý stop (najhlbší MAE u víťazov)':'Tightest survived stop (deepest MAE among winners)',
'uzavretých obchodov má sviečkové dáta. Klikni na bod alebo riadok nižšie pre detail obchodu.':'closed trades have candle data. Click a dot or a row below for trade detail.',
'Zadaj symbol a čas vstupu':'Enter a symbol and entry time','Zobraziť detaily chýbajúcich dát':'View missing data details','🤖 Rozobrať tento obchod':'🤖 Review this trade',
'Perióda':'Period','Dataset nemá dáta o objeme (volume)':'Dataset has no volume data','nepodarilo sa naparsovať':'could not parse',
'Nepodarilo sa načítať appku. Skús obnoviť stránku.':'Failed to load the app. Try refreshing the page.',
'Haiku 4.5 (rýchly, lacný)':'Haiku 4.5 (fast, cheap)','Claude Haiku 4.5 (rýchly, lacný)':'Claude Haiku 4.5 (fast, cheap)',
'Sonnet 5 (vyvážený)':'Sonnet 5 (balanced)','Opus 5 (najhlbší, drahší)':'Opus 5 (deepest, more expensive)',
'Spárovať do obchodov':'Pair into trades','Mapovať ručne':'Map manually',
'⚡ Toto vyzerá ako export objednávok (Tradovate a pod.) – jeden riadok = jedna objednávka/fill, nie hotový obchod. Vstupy a výstupy treba spárovať.':'⚡ This looks like an orders export (Tradovate etc.) – one row = one order/fill, not a finished trade. Entries and exits need to be paired.',
'📎 Priložiť Cash History.csv (voliteľné, doplní poplatky)':'📎 Attach Cash History.csv (optional, fills in fees)',
'Cash History CSV je prázdne alebo má len hlavičku':'Cash History CSV is empty or has only a header',
'Nenašli sa žiadne vyplnené (Filled) objednávky na spárovanie':'No filled orders found to pair',
'1m dáta u Yahoo siahajú len ~7 dní dozadu – tento obchod je starší, skús 5m/15m alebo nahraj CSV.':'1m Yahoo data only goes ~7 days back – this trade is older, try 5m/15m or upload a CSV.',
'Čas vstupu':'Entry time','Export JSON pre AI':'Export JSON for AI',
'JSON pre deň':'JSON for day','stiahnutý – vlož ho do claude.ai alebo iného AI chatu':'downloaded – paste it into claude.ai or another AI chat',
'⚠️ Rizikový manažment':'⚠️ Risk management',
'Limity počítané voči počiat. kapitálu aktívneho účtu. Nastav 0, ak limit nechceš sledovať. Appka nič neblokuje – len upozorní, keď obchod alebo deň limit prekročí.':'Limits are calculated against the active account starting capital. Set 0 if you do not want to track a limit. The app does not block anything – it only warns when a trade or day exceeds the limit.',
'Max. riziko na obchod (%)':'Max. risk per trade (%)','Max. denná strata (%)':'Max. daily loss (%)','Uložiť limity':'Save limits',
'Sviečky nesedia s cenou obchodu':'Candles do not match trade price',
'Cena v priradených sviečkach sa výrazne líši od ceny obchodu - pravdepodobne iný kontrakt/mesiac než bol stiahnutý.':'The price in the assigned candles differs significantly from the trade price – likely a different contract/month than was downloaded.',
'Riziko vstup→stop ako % počiat. kapitálu aktívneho účtu':'Risk entry→stop as % of active account starting capital',
'Dnešné využité riziko':'Today\'s used risk','(denný limit':'(daily limit',
'Prompt pre "AI rozbor obchodu"':'Prompt for "AI trade review"',
'Text inštrukcií, ktoré appka pošle Claude pri kliknutí na "🤖 Rozobrať tento obchod" v detaile obchodu. Dáta obchodu (JSON) a sviečky sa vždy pripoja automaticky za tento text – nie sú jeho súčasťou. Použi <code>{{JAZYK}}</code> tam, kde má appka doplniť aktuálny jazyk appky (SK/EN).':'Instruction text the app sends to Claude when you click "🤖 Review this trade" in trade detail. Trade data (JSON) and candles are always appended after this text – they are not part of it. Use <code>{{JAZYK}}</code> where the app should insert the current app language (SK/EN).',
'Uložiť prompt':'Save prompt','Obnoviť predvolený':'Reset to default','riziko':'risk',
'Priemerné MAE':'Average MAE','Priemerné MFE':'Average MFE',
'priemerný najhorší bod proti tebe, naprieč všetkými obchodmi':'average worst point against you, across all trades',
'priemerný najlepší bod v tvoj prospech, naprieč všetkými obchodmi':'average best point in your favour, across all trades',
'Približné - bez rozpisu fillov sa počíta s konečným množstvom cez celé okno obchodu; presnejšie je to len pri obchodoch importovaných z broker CSV.':'Approximate – without fill breakdown, the final quantity is used across the whole trade window; more accurate only for broker CSV imports.',
'Postupný vstup/výstup':'Scaled entry/exit',
'Import CSV':'Import CSV','Long + Short':'Long + Short','Long':'Long','Short':'Short',
'Timeframe':'Timeframe','Symbol':'Symbol','Symbol *':'Symbol *','Obchod':'Trade',
'Stop loss':'Stop loss','Take profit':'Take profit','napr. 1':'e.g. 1','napr. 3':'e.g. 3',
'Uložiť pravidlá':'Save rules','Táto stratégia nemá zadané žiadne pravidlá.':'This strategy has no rules yet.',
'„Export chart data…"':'"Export chart data…"',
'Alternatíva s presnými dátami tvojho kontraktu: v TradingView otvor graf → menu grafu → „Export chart data…" → stiahnutý CSV nahraj sem. CSV musí obsahovať stĺpce: čas, open, high, low, close (voliteľne volume).':'Alternative with exact data for your contract: in TradingView open the chart → chart menu → "Export chart data…" → upload the downloaded CSV here. The CSV must contain columns: time, open, high, low, close (volume optional).',
'Win rate':'Win rate','Profit factor':'Profit factor','Net P&L':'Net P&L',
'obchod':'trade','obchody':'trades','obchodov':'trades','multiplikátor':'multiplier',
};
Object.assign(I18N_EN,{
'Stratégia iFVG (Inverse Fair Value Gap) stojí na jednej jednoduchej myšlienke: ak bola vyčistená likvidita a fair value gap je následne prerazený opačným smerom, cena bude pravdepodobne pokračovať v pohybe týmto smerom.':'The IFVG (Inverse Fair Value Gap) strategy is built around one simple idea: If liquidity has been swept and a fair value gap is broken in the opposite direction, price is likely to continue to rally.',
'Potvrdený bias na vyššom timeframe (draw on liquidity)':'HTF bias confirmed (draw on liquidity)',
'Nastal jasný liquidity sweep':'Clear liquidity sweep occurred',
'SMT divergencia ako dodatočné potvrdenie (voliteľné, ale výrazne zvyšuje confluenciu)':'SMT divergence for extra confirmation (optional but high confluence)',
'Po sweepe sa vytvoril jeden čistý Fair Value Gap':'Clean, singular Fair Value Gap formed after the sweep',
'Cena sa uzavrela späť cez FVG (aktivácia inverzie)':'Price closed back through the FVG (activating the inversion)',
'Vstup po iFVG so správnou štruktúrou':'Entry after the IFVG with proper structure',
'Stop loss pod FVG alebo pod low daného pohybu.':'Stop loss below the FVG or low of the leg.',
'Čiastočné uzavretie pozície na internej likvidite':'Scale partial at internal liquidity',
'Presun stopu na breakeven po dosiahnutí prvého cieľa':'Move stop to break-even after first target hit',
'VYTVORENÉ PRE\n\nNástroje: Futures\nŠtýl obchodovania: Day Trading\n\nPREHĽAD STRATÉGIE\n\nTáto stratégia stojí na myšlienke, že keď cena vyčistí likviditu a agresívne sa presunie cez Fair Value Gap (FVG) opačným smerom, často to signalizuje začiatok smerového pohybu. Model iFVG identifikuje tieto momenty zvratu kombináciou kľúčových ICT konceptov: SMT divergencie a iFVG po likviditnej udalosti. Je to vysoko pravdepodobnostná, na pravidlách založená intradenná stratégia, najlepšie použiteľná na korelované aktíva, najefektívnejšie na NQ a ES počas New York session.\n\nKĽÚČOVÉ KONCEPTY\n\nAby si model iFVG naplno pochopil, je dôležité najprv zvládnuť dva kľúčové koncepty, na ktorých stojí: Inverse Fair Value Gaps (iFVG) a SMT Divergenciu. Tieto nástroje pomáhajú identifikovať, kedy sa trh môže s vysokou pravdepodobnosťou otáčať.\n\nInverse Fair Value Gap (iFVG)\n\nFair Value Gap (FVG) vzniká, keď je medzera medzi knôtmi troch po sebe idúcich sviečok, zvyčajne v dôsledku agresívneho nákupu alebo predaja, ktorý za sebou zanechá nerovnováhu. V tradičnej ICT teórii sú FVG vnímané ako oblasti, kam sa cena môže vrátiť, aby sa "vybalansovala" predtým, než bude pokračovať v pôvodnom smere.\n\nInverse Fair Value Gap setup tento koncept obracia.\n\nV modeli iFVG hľadáš:\n\n- Liquidity sweep – cena vyčistí stopy nad high alebo pod low.\n- Následne sa cena silno presunie opačným smerom a prerazí existujúci FVG namiesto toho, aby ho rešpektovala.\n- Táto inverzia (čisté prerazenie FVG) naznačuje, že trh už nemá záujem o vybalansovanie – smer sa mení.\n\nTento zvrat je často skorým signálom väčšieho pohybu a iFVG sa stáva tvojím vstupným triggerom po potvrdení.\n\nSMT Divergencia\n\nSMT Divergencia nastáva, keď sa dva korelované nástroje rozídu – čo odhaľuje skrytú stopu o skutočnom smere alebo o riadenej likvidite.\n\nSMT Divergencia nastáva, keď:\n\n- Dve korelované aktíva (napr. ES & NQ, SPY & QQQ, EURUSD a GBPUSD) sa na kľúčových úrovniach správajú odlišne.\n- Jedno vytvorí vyšší high (alebo nižší low), zatiaľ čo druhé nie – čo signalizuje divergenciu.\n\nPovedzme, že obchoduješ NQ a sleduješ ES ako potvrdenie.\n\n- NQ vyčistí low a vytvorí nižší low.\n- ES to isté neurobí – drží svoj predchádzajúci low (vyšší low).\n\nToto ukazuje bullish SMT divergenciu – smart money pravdepodobne vyčistilo likviditu na NQ, zatiaľ čo ES držalo. Vďaka tomu má tvoj iFVG long oveľa vyššiu pravdepodobnosť úspechu.\n\nPREHĽAD SETUPU\n\nSymboly: NQ a ES. Tieto korelované futures nástroje sa používajú spolu na identifikáciu SMT divergencie a realizáciu vysoko pravdepodobnostných obchodov.\n\nTimeframy: Na presné vstupy použi 1-minútový, 2-minútový, 3-minútový alebo 5-minútový graf. Vyššie timeframy ako 1-hodinový a 4-hodinový slúžia len na určenie smerového biasu a liquidity cieľov.\n\nSession: Iba New York session. Model je navrhnutý na použitie počas NY open (od 9:30 EST), keď sú objem, volatilita a liquidity sweepy najaktívnejšie.\n\nPRAVIDLÁ STRATÉGIE\n\nKontext (nastavenie biasu)\n- Začni so 4H alebo 1H grafom, aby si určil, či cena pravdepodobne pôjde hore alebo dole.\n- Identifikuj draw on liquidity. Cielime na highs alebo lows?\n- Označ kľúčové swing highs/lows a otvorenia session.\n\nLiquidity Sweep\n- Cena musí vyčistiť zjavný interný high/low.\n- Malo by to byť jasné – čistá, zjavná, na trhovej štruktúre založená likvidita.\n- Ak po sweepe dostaneš SMT, výrazne to zvyšuje pravdepodobnosť fungovania inverzného setupu.\n\nFormácia FVG\n- Hľadaj čistý fair value gap po sweepe.\n- Ideálne jeden jediný FVG – viacero FVG v rámci pohybu znižuje presnosť.\n\nInverzia (potvrdenie)\n- Počkaj, kým sa cena uzavrie späť cez FVG z opačného smeru.\n- Tým sa FVG mení na inverse FVG.\n\nVstup\n- Vstup pri návrate k iFVG (limitný alebo market vstup).\n- Vstup pri uzavretí sviečky cez iFVG, ak je jasná displacement.\n- Na vstup použi rovnaký timeframe ako pri inverzii – napr. 3M iFVG potrebuje 3M close cez neho.\n\nTake Profit\n- Prvý cieľ = interná likvidita (nedávny high/low).\n- Finálny cieľ = hlavný swing high/low alebo draw on liquidity.\n\nPravidlo breakeven\n\nAk je zasiahnutá prvá interná likvidita a nedôjde k ďalšej displacement, predpokladaj, že sa trh len rotuje, a chráň kapitál.\n\nViac než jeden FVG v pohybe?\n\nSetup radšej vynechaj alebo sa pozri na vyšší timeframe – viacero FVG znamená neistotu.\n\nROZBOR OBCHODOV\n\nPríklad obchodu 1 (Short)\n\nLiquidity Sweep\nCena vyčistí predchádzajúci swing high, čím spustí buy-side liquidity grab. Ide o kľúčový stop-hunt nad známym highom.\n\nFormácia Fair Value Gap (FVG)\nPočas tohto agresívneho pohybu vzniká Fair Value Gap (FVG), keďže cena za sebou necháva nerovnováhu medzi knôtmi troch po sebe idúcich sviečok.\n\nPotvrdenie iFVG\nCena prerazí FVG so silnou medvedou displacement, čo naznačuje, že trh odmietol nerovnováhu a momentum je teraz smerom dole. Toto čisté prerazenie potvrdzuje iFVG setup.\n\nVstup\nVstup sa realizuje pri retest FVG zospodu, kde sa cena vráti do zóny iFVG pred ďalším pádom.\n\nStop Loss\nStop je umiestnený tesne nad iFVG alebo nad high sviečky, ktorá spôsobila sweep.\n\nCieľ\nPrvý cieľ je najbližšia oblasť sell-side likvidity, označená rovnakými lows nižšie. Rozšírený cieľ je demand zóna (sivý box), kde cena nakoniec zareaguje.\n\nPríklad obchodu 2 (Long)\n\nSMT Divergencia\nNa low pohybu je prítomná SMT divergencia – jedno korelované aktívum (napr. ES) vytvorí nižší low, zatiaľ čo druhé (napr. NQ) drží vyššie. Toto signalizuje narušenie korelácie a naznačuje možný zvrat.\n\nLiquidity Sweep\nCena vyčistí predchádzajúci low, čím spustí sell-side liquidity grab. Stopy sú vyčistené pod týmto low pred prudkým zvratom.\n\nFormácia Fair Value Gap (FVG)\nPočas agresívneho pohybu dole vzniká FVG. Táto medzera sa tvorí medzi knôtmi troch po sebe idúcich sviečok.\n\nPotvrdenie iFVG\nCena prerazí FVG smerom hore a odmietne nerovnováhu. Toto potvrdzuje, že cena sa už nevybalansováva – mení smer. Pohyb spĺňa podmienky iFVG setupu.\n\nVstup\nVstup sa realizuje pri retest iFVG, keď sa cena vráti do zóny a udrží sa.\n\nStop Loss\nStop je umiestnený tesne pod FVG alebo pod swing low vytvoreným sweepom.\n\nPrvý cieľ je interný high. Finálny cieľ je buy-side likvidita nad predchádzajúcim highom.':
'BUILT FOR\n\nInstruments: Futures\nTrading Style: Day Trading\n\nPLAYBOOK OVERVIEW\n\nThis strategy is built around the idea that when price sweeps liquidity and aggressively displaces through a Fair Value Gap (FVG) in the opposite direction, it often signals the start of a directional move. The IFVG model identifies these moments of reversal by combining key ICT concepts: SMT divergence and IFVGs after a liquidity event. It is a high-probability, rule-based intraday strategy best applied to correlated assets, most effectively used on NQ and ES during the New York session.\n\nCORE CONCEPTS\n\nTo fully understand how the IFVG model works, it’s important to first grasp the two key concepts it relies on: Inverse Fair Value Gaps (IFVGs) and SMT Divergence. These tools help identify when the market may be reversing direction with high probability.\n\nInverse Fair Value Gap (IFVG)\n\nA Fair Value Gap (FVG) forms when there’s a gap between the wicks of three consecutive candles, usually due to aggressive buying or selling that leaves behind an imbalance. In traditional ICT theory, FVGs are seen as areas where price may return to “rebalance” before continuing in the original direction.\n\nAn Inverse Fair Value Gap setup flips this concept.\n\nIn the IFVG model, you’re looking for:\n\n- A liquidity sweep - price runs stops above a high or below a low.\n- Then, price displaces strongly in the opposite direction, breaking through an existing FVG instead of respecting it.\n- This inversion (breaking cleanly through the FVG) suggests the market is no longer interested in rebalancing, it’s shifting direction.\n\nThis shift is often the early signal of a larger move, and the IFVG becomes your entry trigger after confirmation.\n\nSMT Divergence\n\nSMT Divergence refers to when two correlated instruments diverge - revealing a hidden clue about true direction or liquidity being engineered.\n\nSMT Divergence happens when:\n\n- Two correlated assets (e.g. ES & NQ, SPY & QQQ, EURUSD and GBPUSD) behave differently at key levels.\n- One makes a higher high (or lower low), while the other fails to - signaling divergence.\n\nLet\'s say you\'re trading NQ and watching ES as confirmation.\n\n- NQ sweeps a low, making a lower low.\n- ES does not — it holds its previous low (a higher low).\n\nThis shows SMT Bullish Divergence, smart money likely swept NQ liquidity while holding ES. This makes your IFVG Long much higher probability.\n\nSETUP OVERVIEW\n\nSymbols: NQ and ES. These correlated futures instruments are used together to spot SMT divergence and execute high-probability trades.\n\nTimeframes: Use the 1-minute, 2-minute, 3-minute, or 5-minute chart for precision entries. Higher timeframes like the 1-hour and 4-hour are used only for directional bias and liquidity targets.\n\nSessions: New York Session only. The model is designed to be used during the NY open (9:30 AM EST onward), when volume, volatility, and liquidity sweeps are most active.\n\nPLAYBOOK RULES\n\nContext (Bias Setup)\n- Start with a 4H or 1H chart to determine if the price is likely to go up or down.\n- Identify draw on liquidity. Are we targeting highs or lows?\n- Mark key swing highs/lows and session opens.\n\nLiquidity Sweep\n- Price must sweep an obvious internal high/low.\n- This should be clear - clean, obvious, market-structure-based liquidity.\n- If you get SMT after the sweep, this significantly increases the probability of the inversion setup working.\n\nFormation of FVG\n- Look for a clean fair value gap after the sweep.\n- Preferably a singular FVG, multiple FVGs in the leg reduce accuracy.\n\nThe Inversion (Confirmation)\n- Wait for price to close back through the FVG from the opposite direction.\n- This transforms the FVG into an inverse FVG.\n\nEntry\n- Enter on a return to the IFVG (limit or market entry).\n- Entry on candle closure through IFVG if there is clear displacement.\n- Use the same timeframe for entry as the inversion — e.g, a 3M IFVG needs a 3M close through it.\n\nTake Profit\n- First Target = Internal Liquidity (recent high/low).\n- Final Target = Major Swing High/Low or Draw on Liquidity.\n\nBreakeven Rule\n\nIf the first internal liquidity is hit and no further displacement occurs, assume we\'re rotating and protect capital.\n\nMore than one FVG in the move?\n\nAvoid the setup or zoom out, multiple FVGs = uncertainty.\n\nTRADE BREAKDOWN\n\nTrade Example 1 (Short Trade)\n\nLiquidity Sweep\nPrice takes out a previous swing high, triggering a buy-side liquidity grab. This is a key stop-hunt above a known high.\n\nFair Value Gap (FVG) Formation\nA Fair Value Gap (FVG) forms during this aggressive move as the price leaves behind an imbalance between the wicks of three consecutive candles.\n\nIFVG Confirmation\nPrice breaks through the FVG with strong bearish displacement, indicating that the market has rejected the imbalance and momentum is now to the downside. This clean break confirms the IFVG setup.\n\nEntry\nEntry is taken on the retest of the FVG from below, where price returns to the IFVG zone before continuing lower.\n\nStop Loss\nStop is placed just above the IFVG or the high of the candle that created the sweep.\n\nTarget\nThe first target is the next area of sell-side liquidity, marked by the equal lows below. Extended target sits at the demand zone (grey box) where price eventually reacts.\n\nTrade Example 2 (Long Trade)\n\nSMT Divergence\nAt the low of the move, SMT divergence is present — one correlated asset (e.g., ES) makes a lower low, while the other (e.g., NQ) holds higher. This signals a break in correlation and hints at a reversal.\n\nLiquidity Sweep\nPrice takes out a previous low, triggering a sell-side liquidity grab. Stops are cleared below this low before a sharp reversal.\n\nFair Value Gap (FVG) Formation\nIt creates a FVG during the aggressive move down. This gap forms between the wicks of three consecutive candles.\n\nIFVG Confirmation\nPrice breaks through the FVG to the upside, rejecting the imbalance. This confirms that price is no longer rebalancing — it’s shifting direction. The move qualifies as an IFVG setup.\n\nEntry\nEntry is taken on the retest of the IFVG, as price returns to the zone and holds.\n\nStop Loss\nStop is placed just below the FVG or the swing low created by the sweep.\n\nFirst target is the internal high. Final target is the buy-side liquidity above the prior high.',
});
Object.assign(I18N_EN,{
"Break & Retest je jedna z najzákladnejších a najspoľahlivejších technických stratégií. Stojí na jednoduchej myšlienke: keď cena presvedčivo prelomí kľúčovú úroveň, táto úroveň sa často zmení z odporu na podporu (alebo naopak) a cena sa k nej neskôr vráti, aby ju \"otestovala\", než bude pokračovať ďalej. Namiesto naháňania breakoutu čakáme na tento návrat a vstupujeme až po jeho potvrdení – čím eliminujeme väčšinu falošných signálov a naháňania ceny.":"Break & Retest is one of the most fundamental and reliable technical strategies. It is built on a simple idea: when price convincingly breaks a key level, that level often flips from resistance to support (or vice versa), and price later returns to \"test\" it before continuing. Instead of chasing the breakout, we wait for that return and enter only after it is confirmed – which eliminates most false signals and chasing.",
"Označená jasná kľúčová úroveň (predchádzajúci deň high/low, výrazný swing high/low alebo iná zjavná zóna)":"A clear key level is marked (previous day high/low, a significant swing high/low, or another obvious zone)",
"Cena prelomí úroveň presvedčivo – silná sviečka so zatvorením zreteľne za úrovňou, nie len knôtom":"Price breaks the level convincingly – a strong candle closing clearly beyond the level, not just a wick",
"Cena sa vráti späť k prelomenej úrovni (retest) namiesto toho, aby okamžite pokračovala ďalej":"Price returns to the broken level (retest) instead of immediately continuing",
"Úroveň sa pri retest drží ako nová podpora/odpor – žiadne spätné prerazenie na druhú stranu":"The level holds as new support/resistance on the retest – no break back to the other side",
"Prvý cieľ = najbližší swing high/low, časť pozície sa uzatvára (trim)":"First target = nearest swing high/low, part of the position is trimmed",
"Stop je umiestnený tesne za retest zónou, mimo bežného trhového šumu":"Stop is placed just beyond the retest zone, outside normal market noise",
"VYTVORENÉ PRE\n\nNástroje: Akcie, futures, forex\nŠtýl obchodovania: Intradenný aj swingový\n\nPREHĽAD STRATÉGIE\n\nBreak & Retest je jedna z najstarších a najspoľahlivejších technických stratégií, založená na čítaní price action a kľúčových úrovní. Namiesto naháňania ceny hneď po breakoute čakáme na jej návrat k prelomenej úrovni – tam, kde je pomer risk/reward najvýhodnejší a signál najčistejší.\n\nZÁKLADNÝ KONCEPT: Zlomenie štruktúry\n\nKaždá kľúčová úroveň (predchádzajúci high/low dňa, výrazný swing bod, alebo psychologická cena) funguje ako bariéra, kde sa história obchodovania hromadí – objednávky, stopy, limitné príkazy. Keď cena túto úroveň presvedčivo prelomí (silná sviečka, jasné zatvorenie za úrovňou, nie len tieň knôtu), znamená to posun v rovnováhe medzi kupujúcimi a predávajúcimi.\n\nDôležité je rozlíšiť skutočný breakout od falošného. Slabý breakout (dlhý knôt, uzavretie späť pod úrovňou) často signalizuje pascu na retailových obchodníkov – radšej počkaj na presvedčivé zatvorenie.\n\nZÁKLADNÝ KONCEPT: Retest a vstup\n\nPo breakoute sa cena veľmi často vráti späť k prelomenej úrovni – nie preto, že sa \"mýlila\", ale pretože táto úroveň sa teraz stáva novou podporou (pri breakoute nahor) alebo odporom (pri breakoute nadol). Toto je presne ten moment, na ktorý Break & Retest trader čaká.\n\nVstup nastáva až vtedy, keď cena úroveň pri retest zreteľne rešpektuje – napríklad malou sviečkou s dlhým knôtom smerom k úrovni a zatvorením naspäť v smere pôvodného breakoutu. Ak cena namiesto toho prerazí späť cez úroveň, setup je neplatný a treba ho vynechať.\n\nRIADENIE RIZIKA: Stop a ciele\n\nStop loss patrí tesne za retest zónu (za low retest sviečky pri long vstupe, za high pri short vstupe) – dostatočne blízko, aby bol pomer risk/reward priaznivý, ale dostatočne ďaleko, aby ho nevyradil bežný trhový šum.\n\nPrvý cieľ je najbližší výrazný swing high/low – tu je vhodné časť pozície uzavrieť (trim) a zvyšok nechať bežať s presunutým stopom na breakeven. Druhý, rozšírený cieľ sa hľadá pri ďalšej významnej štruktúrnej úrovni, ak trend pokračuje.\n\nKEDY SETUP VYNECHAŤ\n\n- Breakout bez objemu alebo s dlhými knôtmi namiesto pevného zatvorenia.\n- Retest, ktorý preráža späť cez úroveň namiesto toho, aby sa od nej odrazil.\n- Príliš veľa predchádzajúcich testov tej istej úrovne – čím viackrát je úroveň testovaná, tým je slabšia.":
"BUILT FOR\n\nInstruments: Stocks, futures, forex\nTrading Style: Intraday and swing\n\nPLAYBOOK OVERVIEW\n\nBreak & Retest is one of the oldest and most reliable technical strategies, grounded in reading price action and key levels. Instead of chasing price right after the breakout, we wait for it to return to the broken level – where the risk/reward is most favorable and the signal is cleanest.\n\nCORE CONCEPT: Break of Structure\n\nEvery key level (previous day's high/low, a significant swing point, or a psychological price) acts as a barrier where trading history accumulates – orders, stops, limit orders. When price convincingly breaks through it (a strong candle, a clear close beyond the level, not just a wick), it signals a shift in the balance between buyers and sellers.\n\nIt's important to distinguish a real breakout from a fake one. A weak breakout (long wick, closing back below the level) often signals a trap for retail traders – better to wait for a convincing close.\n\nCORE CONCEPT: Retest and Entry\n\nAfter the breakout, price very often returns to the broken level – not because it was \"wrong,\" but because this level now becomes new support (on a breakout up) or resistance (on a breakout down). This is exactly the moment a Break & Retest trader waits for.\n\nEntry only comes once price clearly respects the level on the retest – for example, a small candle with a long wick toward the level, closing back in the direction of the original breakout. If price instead breaks back through the level, the setup is invalid and should be skipped.\n\nRISK MANAGEMENT: Stop and Targets\n\nThe stop loss belongs just beyond the retest zone (below the retest candle's low on a long entry, above its high on a short entry) – close enough to keep risk/reward favorable, but far enough not to get taken out by normal market noise.\n\nThe first target is the nearest significant swing high/low – a good spot to trim part of the position and let the rest run with the stop moved to breakeven. A second, extended target is sought at the next major structural level if the trend continues.\n\nWHEN TO SKIP THE SETUP\n\n- A breakout without volume or with long wicks instead of a solid close.\n- A retest that breaks back through the level instead of bouncing off it.\n- Too many previous tests of the same level – the more a level gets tested, the weaker it becomes.",
});
Object.assign(I18N_EN,{
'AMD (Akumulácia – Manipulácia – Distribúcia) je model založený na sledovaní trhových fáz: cena najprv buduje likviditu v Akumulácii, potom ju vyčistí a nalapí obchodníkov v Manipulácii, a až vo fáze Distribúcie sa objaví skutočný, obchodovateľný pohyb. Vstupuje sa až po potvrdení displacementu vo fáze Distribúcie, nikdy počas samotného manipulačného sweepu.':'AMD (Accumulation – Manipulation – Distribution) is a model based on tracking market phases: price first builds liquidity in Accumulation, then sweeps it and traps traders in Manipulation, and only in the Distribution phase does the real, tradeable move appear. Enter only after displacement is confirmed in Distribution – never during the manipulation sweep itself.',
'Správa: dôležitá udalosť (CPI, FOMC, NFP, GDP atď.)':'News: important event (CPI, FOMC, NFP, GDP, etc.)',
'Štruktúra (identifikovaná fáza Akumulácie a Manipulácie)':'Structure (identified Accumulation and Manipulation phase)',
'Korelácia trhov':'Market correlation','Identifikovaný draw on liquidity':'Identified draw on liquidity',
'Sledovaný displacement':'Displacement observed','Vstup na retracemente do fair value gapu':'Entry on retracement into a fair value gap',
'Stop za high/low manipulácie':'Stop beyond the manipulation high/low','Trailing stop':'Trailing stop',
'Čiastočný zisk na najbližšom čistom swing high/low':'Partial profit at the nearest clean swing high/low',
'Max. dva obchody za session – po dvoch stratách koniec':'Max. two trades per session – after two losses, stop',
'Low Volume Node stratégia hľadá miesta na volume-by-price profile, kadiaľ cena prešla rýchlo s minimálnym objemom (LVN). Keď sa cena neskôr vráti do tejto zóny, sleduje sa cez heatmapu/order flow, či tam veľkí hráči bránia svoju pozíciu – to je signál na vstup s tesným stopom tesne za LVN.':'The Low Volume Node strategy looks for areas on the volume-by-price profile where price moved quickly with minimal volume (LVN). When price later returns to that zone, watch the heatmap/order flow for big players defending their position – that is the entry signal with a tight stop just beyond the LVN.',
'Identifikovateľná kľúčová úroveň (predchádzajúca konsolidácia, po ktorej nasleduje impulzívny pohyb preč od tejto oblasti)':'Identifiable key level (prior consolidation followed by an impulsive move away from the area)',
'Vytvorenie Low Volume Node (LVN)':'Formation of a Low Volume Node (LVN)','Pullback ceny späť do LVN':'Price pullback back into the LVN',
'Potvrdenie cez orderflow (absorpcia, chytení účastníci, delta divergencia)':'Confirmation via order flow (absorption, trapped participants, delta divergence)',
'VYTVORENÉ PRE':'BUILT FOR','PREHĽAD STRATÉGIE':'PLAYBOOK OVERVIEW','KĽÚČOVÉ KONCEPTY':'CORE CONCEPTS',
'PREHĽAD SETUPU':'SETUP OVERVIEW','PRAVIDLÁ STRATÉGIE':'PLAYBOOK RULES','PRAVIDLÁ PLAYBOOKU':'PLAYBOOK RULES',
'ROZBOR OBCHODOV':'TRADE BREAKDOWN','ROZBOR OBCHODU':'TRADE BREAKDOWN','VÝHODY A NEVÝHODY STRATÉGIE':'STRATEGY PROS AND CONS',
'HIGH-PROBABILITY A LOW-PROBABILITY DNI':'HIGH-PROBABILITY AND LOW-PROBABILITY DAYS','Príklad obchodu 1 (Short)':'Trade example 1 (Short)',
'Nástroje: Futures':'Instruments: Futures','Štýl obchodovania: Day Trading':'Trading style: Day Trading',
'Štýl obchodovania: Intradenný (Day Trading)':'Trading style: Intraday (Day Trading)',
'Nástroje: Futures, indexy (ES)':'Instruments: Futures, indices (ES)','Nástroje: Akcie, futures, forex':'Instruments: Stocks, futures, forex',
'Štýl obchodovania: Intradenný aj swingový':'Trading style: Intraday and swing',
});
Object.assign(I18N_EN,{
'ICT Model 3 kombinuje HTF Point of Interest, Market Structure Shift s displacementom, Fair Value Gap a Optimal Trade Entry. Keď sa tieto prvky zosúladia, vytvárajú vysoko pravdepodobný setup s jasným smerovým biasom a definovaným rizikom.':'ICT Model 3 combines a High-Timeframe Point of Interest, Market Structure Shift with displacement, Fair Value Gap, and Optimal Trade Entry. When these elements align, they create a high-probability setup with a clear directional bias and defined risk.',
'Identifikovaný HTF POI (Order Block, Liquidity Zone alebo FVG)':'HTF POI identified (Order Block, Liquidity Zone, or FVG)',
'Liquidity grab pri HTF POI (sweep nad high pre short / pod low pre long)':'Liquidity grab at HTF POI (sweep above high for short / below low for long)',
'MSS s displacementom potvrdený (zlomenie interného high/low)':'MSS with displacement confirmed (break of internal high/low)',
'FVG identifikovaný počas displacementu (discount pre long, premium pre short)':'FVG identified during displacement (discount for long, premium for short)',
'OTE zóna 62–79 % v súlade s FVG':'OTE zone 62–79% aligned with FVG',
'Vstup v zóne FVG + OTE, stop za liquidity sweep, cieľ na HTF/external liquidity, min. R:R 1:2':'Entry in FVG + OTE zone, stop beyond liquidity sweep, target at HTF/external liquidity, min. R:R 1:2',
'Nástroje: Futures, forex':'Instruments: Futures, forex',
'ICT Model 3 (':'ICT Model 3 (',
') kombinuje niekoľko kľúčových ICT konceptov: ':' combines several key ICT concepts: ',
', potvrdený ':' confirmed with ',
'. Keď sa tieto prvky zosúladia, vytvárajú vysoko pravdepodobný setup s jasným smerovým biasom a definovaným rizikom.':'. When these align, they create a high-probability setup with a clear directional bias and defined risk.',
'CHECKLIST – KROK ZA KROKOM':'CHECKLIST – STEP BY STEP',
'Krok 1: Identifikuj High-Timeframe Point of Interest (HTF POI)':'Step 1: Identify the High-Timeframe Point of Interest (HTF POI)',
'Začni nájdením významnej oblasti záujmu na vyššom timefram – môže to byť:':'Start by locating a significant area of interest on the higher timeframe – this can be:',
'Order Block':'Order Block',
'Liquidity Zone':'Liquidity Zone',
'Tu očakávaš silnú reakciu ceny – buď zvrat, alebo prudký pohyb.':'This is where you expect price to react strongly – either reversing or making a sharp move.',
'Krok 2: Počkaj na liquidity grab':'Step 2: Wait for a Liquidity Grab',
'Nechaj cenu vyčistiť likviditu pri HTF POI:':'Allow price to grab liquidity near the HTF POI:',
'Pre ':'For ',
' cena musí sweepovať nad predchádzajúci high.':' price should sweep above a previous high.',
' cena musí sweepovať pod predchádzajúci low.':' price should sweep below a previous low.',
'short setup':'short setup',
'long setup':'long setup',
'Tento pohyb vyčistí stopy a nalapí breakout traderov, čím vytvorí „palivo“ pre zvrat.':'This move clears stop losses and traps breakout traders, providing fuel for a reversal.',
'Krok 3: Sleduj Market Structure Shift (MSS) s displacementom':'Step 3: Watch for a Market Structure Shift (MSS) with Displacement',
'Po liquidity grab hľadaj potvrdenie, že smer sa mení. Platný MSS vyžaduje:':'After the liquidity grab, look for confirmation that direction is shifting. A valid MSS requires:',
'Zlomenie najbližšieho interného high (pre long) alebo low (pre short).':'Price breaks the most recent internal high (for longs) or low (for shorts).',
'Zlomenie s ':'Break with ',
' – silný, impulzívny pohyb, ktorý ukazuje reálny momentum.':' – a strong, impulsive move showing real momentum.',
'displacementom':'displacement',
'Toto potvrdí, že trh je pripravený ísť novým smerom.':'This confirms the market is ready to move in a new direction.',
'Krok 4: Identifikuj Fair Value Gap (FVG)':'Step 4: Identify the Fair Value Gap (FVG)',
'Počas displacementu sa zvyčajne vytvorí ':'During displacement, an ',
' – medzera medzi sviečkami z agresívneho pohybu. Táto zóna je potenciálna oblasť vstupu.':' usually forms – a gap between candles from aggressive price movement. This zone is the potential entry area.',
' uisti sa, že FVG je v ':' ensure the FVG is in the ',
' (pod 50 % pohybu).':' (below 50% of the move).',
' (nad 50 % pohybu).':' (above 50% of the move).',
'discount zóne':'discount zone',
'premium zóne':'premium zone',
'Krok 5: Použi Optimal Trade Entry (OTE)':'Step 5: Use the Optimal Trade Entry (OTE)',
'Vstup spresni pomocou ':'Refine the entry using the ',
' – od low k high (long) alebo high k low (short). Zameraj sa na zónu ':' – from low to high (for longs) or high to low (for shorts). Focus on the ',
' retracementu – „sweet spot“. Najvyššia pravdepodobnosť je, keď OTE zóna súhlasí s FVG.':' retracement zone – the “sweet spot”. Highest probability is when the OTE zone aligns with the FVG.',
'Fibonacci retracement':'Fibonacci retracement',
'62 % až 79 %':'62% to 79%',
'Krok 6: Vykonaj vstup s riadným risk managementom':'Step 6: Execute with Proper Risk Management',
'Keď cena retracuje do zóny ':'Once price retraces into the ',
':':' zone:',
' umiestni za liquidity sweep.':' place beyond the liquidity sweep.',
' na ďalšej HTF úrovni alebo external liquidity zóne.':' at the next HTF level or external liquidity zone.',
'Uisti sa, že pomer risk-to-reward je aspoň ':'Ensure the risk-to-reward ratio is at least ',
' alebo lepší.':' or better.',
'Cieľ':'Target',
});
Object.assign(I18N_EN,{
// ── Volume Profile ──
'Tento playbook sa zameriava na obchodovanie vo chvíli, keď cena dosiahne hranu high-volume node na kľúčových aukčných úrovniach ako PDH, PDL, ONH alebo ONL. Keď cena na hrane volume profilu zareaguje, obchod smeruje z jednej strany hodnoty na druhú cez čistú cestu nízko-objemovými oblasťami.':'This playbook focuses on trading when price reaches the edge of a high-volume node at key auction levels like PDH, PDL, ONH, or ONL. Once price reacts at the volume profile edge, the trade aims to move from one side of value to the next using the clean path through low-volume areas.',
'Cena sa dotýka hrany volume profilu (prechod z HVA do LVA alebo naopak)':'Price is touching a volume profile edge (transition from HVA to LVA or vice versa)',
'Umiestnenie sa zhoduje s kľúčovou kontextovou úrovňou (ONH/ONL/PDH/PDL)':'Location aligns with a key contextual level (ONH/ONL/PDH/PDL)',
'Vytvorila sa objemovo silná signálna sviečka s viditeľným knôtom a zatvorením v smere obchodu':'A high volume signal candle formed with a visible wick and closed in the trade direction',
'Počkaj na zatvorenie signálnej sviečky, nikdy ju nepredbiehaj':'Wait for the signal candle to close, never front-run it',
'Smerový bias potvrdený z vyššieho timeframe (Weekly/Daily)':'Directional bias confirmed from a higher timeframe (Weekly/Daily)',
'Vstup po zatvorení signálnej sviečky na hrane objemu':'Entry after the signal candle closes at the volume edge',
'Stop tesne za knôtom signálnej sviečky alebo za hranou high-value node':'Stop just beyond the signal candle\'s wick or the edge of the high-value node',
'Cieľ na ďalšej hrane (edge-to-edge) – najbližšia high-volume oblasť':'Target the next edge (edge-to-edge) – the nearest high-volume area',
'Vyhni sa obchodom v strede low-volume zóny':'Avoid trades in the middle of a low-volume zone',
});

export const SK_MONTHS={'Január':'January','Február':'February','Marec':'March','Apríl':'April','Máj':'May','Jún':'June','Júl':'July','August':'August','September':'September','Október':'October','November':'November','December':'December'};
export const I18N_RULES=[
[/^(Január|Február|Marec|Apríl|Máj|Jún|Júl|August|September|Október|November|December) (\d{4})$/,(m,mo,y)=>SK_MONTHS[mo]+' '+y],
[/^Stiahnutých (\d+) sviečok \((.+)\)\. Dataset (.+) má teraz (\d+) sviečok\.$/,'Downloaded $1 candles ($2). Dataset $3 now has $4 candles.'],
[/^Stiahnutých (\d+) sviečok \((.+)\)$/,'Downloaded $1 candles ($2)'],
[/^Uložených (\d+) sviečok pre (.+), pokrytie (.+)$/,'Saved $1 candles for $2, coverage $3'],
[/^Sťahovanie zlyhalo: ([\s\S]+)$/,(m,p1)=>'Download failed: '+(I18N_EN[p1]||p1)],
[/^Obnovenie zlyhalo: ([\s\S]+)$/,(m,p1)=>'Restore failed: '+(I18N_EN[p1]||p1)],
[/^Pripojenie zlyhalo: ([\s\S]+)$/,(m,p1)=>'Connection failed: '+(I18N_EN[p1]||p1)],
[/^⚠️ Chyba synchronizácie: ([\s\S]+)$/,(m,p1)=>'⚠️ Sync error: '+p1],
[/^Nahrávanie zlyhalo \((\d+)\)$/,'Upload failed ($1)'],
[/^Zoznam súborov zlyhal \((\d+)\)$/,'File list failed ($1)'],
[/^Zoznam záloh zlyhal \((\d+)\)$/,'Backup list failed ($1)'],
[/^Sťahovanie zlyhalo \((\d+)\)$/,'Download failed ($1)'],
[/^nepokrýva čas tohto obchodu \((.+)\)\.$/,"does not cover this trade's time ($1)."],
[/^(\d+) (obchodov|obchody|obchod)$/,(m,n)=>n+' '+(n==='1'?'trade':'trades')],
[/^(\d+) riadkov na import$/,'$1 rows to import'],
[/^Importované: (\d+), preskočené: (\d+)(?:, duplicity preskočené: (\d+))?(?:, doplnený stop pri (\d+) existujúcich)?$/,
  (m,a,b,c,d)=>'Imported: '+a+', skipped: '+b+(c!=null?', duplicates skipped: '+c:'')+(d!=null?', stop backfilled on '+d+' existing':'')],
[/^Importovaných (\d+) obchodov(?:, (\d+) duplicít preskočených)?(?:, doplnený stop pri (\d+))?$/,
  (m,a,b,c)=>'Imported '+a+' trades'+(b!=null?', '+b+' duplicates skipped':'')+(c!=null?', stop backfilled on '+c:'')],
[/^Spárovaných (\d+) obchodov(?: \((\d+) stále otvorených\))?( \+ poplatky doplnené)?$/,
  (m,a,b,c)=>'Paired '+a+' trades'+(b!=null?' ('+b+' still open)':'')+(c?' + fees filled in':'')],
[/^✅ Cash History pripojený \((\d+) riadkov\) – poplatky sa doplnia$/,'✅ Cash History attached ($1 rows) – fees will be filled in'],
[/^Obnoviť zálohu z (.+)\? PREPÍŠE to aktuálne dáta v tomto prehliadači\.$/,'Restore backup from $1? This will OVERWRITE the current data in this browser.'],
[/^Záloha z (.+) obnovená$/,'Backup from $1 restored'],
[/^✅ Pripojené( · posledná synchronizácia [^·]+)?( · denná záloha .+)?$/,
  (m,a,b)=>'✅ Connected'+(a?a.replace(' · posledná synchronizácia ',' · last sync '):'')+(b?b.replace(' · denná záloha ',' · daily backup '):'')],
[/^(.+) dáta u Yahoo siahajú len ~60 dní dozadu – tento obchod je starší, skús 1h\/denný alebo nahraj CSV\.$/,'$1 Yahoo data only goes ~60 days back – this trade is older, try 1h/daily or upload a CSV.'],
[/^multiplikátor (.+)$/,'multiplier $1'],
[/^(.+) \((\d+) sviečok\)$/,'$1 ($2 candles)'],
[/^Obchod #(\d+) – (.+)$/,'Trade #$1 – $2'],
[/^Obchody (\d.+)$/,'Trades $1'],
[/^Obchody \((\d+)\)$/,'Trades ($1)'],
[/^Scenáre \((\d+)\)$/,'Scenarios ($1)'],
[/^(\d+) mes\.$/,'$1 mo.'],
[/^Účet: (.+)$/,'Account: $1'],
[/^Účet "(.+)" má obchody\. Presunúť ich do účtu "(.+)"\?$/,'Account "$1" has trades. Move them to account "$2"?'],
[/^\(denný limit (\d+%)\)$/,'(daily limit $1)'],
[/^riziko ([\d.]+%(?: \/ [\d.]+%)?)$/,'risk $1'],
[/^ nepokrýva čas tohto obchodu \((.+)\)\.$/," does not cover this trade's time ($1)."],
];
Object.assign(I18N_EN, STRATEGY_I18N_EN);
export const I18N_REV={};
Object.entries(I18N_EN).forEach(([k,v])=>{if(k!==v)I18N_REV[v]=k;});
export function translateText(s,dir){
  const t=String(s).trim();
  if(!t)return s;
  const d=dir==='fwd'?I18N_EN:I18N_REV;
  if(d[t]!=null)return s.replace(t,d[t]);
  if(dir==='fwd'){
    for(const [re,out] of I18N_RULES){
      if(re.test(t))return s.replace(t,t.replace(re,out));
    }
  }
  return s;
}
export function tr(s){return state.settings.lang==='en'?translateText(s,'fwd'):s;}
/** Preklad HTML (napr. rich-text poznámky stratégií) – prejde textové uzly cez translateText. */
export function trHtml(html){
  if(state.settings.lang!=='en'||!html)return html;
  const tpl=document.createElement('template');
  tpl.innerHTML=html;
  translateDOM(tpl.content,'fwd');
  const wrap=document.createElement('div');
  wrap.appendChild(tpl.content);
  return wrap.innerHTML;
}
export function translateDOM(root,dir){
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  const nodes=[];
  while(walker.nextNode())nodes.push(walker.currentNode);
  for(const n of nodes){
    const p=n.parentElement;
    if(p&&(p.tagName==='SCRIPT'||p.tagName==='STYLE'||p.tagName==='TEXTAREA'))continue;
    const v=translateText(n.nodeValue,dir);
    if(v!==n.nodeValue)n.nodeValue=v;
  }
  if(root.querySelectorAll){
    root.querySelectorAll('input[placeholder],textarea[placeholder],[title]').forEach(el=>{
      if(el.placeholder){const v=translateText(el.placeholder,dir);if(v!==el.placeholder)el.placeholder=v;}
      if(el.title){const v=translateText(el.title,dir);if(v!==el.title)el.title=v;}
    });
  }
}
export let i18nBusy=false;
export function withI18nBusy(fn){
  i18nBusy=true;
  try{return fn();}finally{i18nBusy=false;}
}
export const i18nObserver=new MutationObserver(muts=>{
  if(state.settings.lang!=='en'||i18nBusy)return;
  i18nBusy=true;
  for(const m of muts){
    if(m.type==='characterData'&&m.target.nodeValue){
      const v=translateText(m.target.nodeValue,'fwd');
      if(v!==m.target.nodeValue)m.target.nodeValue=v;
    }
    if(m.addedNodes)m.addedNodes.forEach(n=>{
      if(n.nodeType===3){const v=translateText(n.nodeValue,'fwd');if(v!==n.nodeValue)n.nodeValue=v;}
      else if(n.nodeType===1)translateDOM(n,'fwd');
    });
  }
  i18nBusy=false;
});
i18nObserver.observe(document.body,{childList:true,subtree:true,characterData:true});
export async function switchLang(l){
  if(l===(state.settings.lang||'sk'))return;
  state.settings.lang=l;
  await saveSettings();
  document.documentElement.lang=l;
  if(l==='en'){renderAll();i18nBusy=true;translateDOM(document.body,'fwd');i18nBusy=false;}
  else{i18nBusy=true;translateDOM(document.body,'rev');i18nBusy=false;renderAll();}
}
/* window.confirm() sa v niektorých prostrediach (embedded preview panely, headless
   testy) ticho potláča a vždy vráti false, bez akejkoľvek chyby - mazanie potom
   pôsobí "nefunkčne", hoci appka o potvrdenie požiadala správne. Vlastný dialóg
   nad #confirmOverlay funguje všade rovnako. */
export function ask(s){
  return new Promise(res=>{
    const overlay=document.getElementById('confirmOverlay');
    const msg=document.getElementById('confirmMessage');
    const okBtn=document.getElementById('confirmOkBtn');
    const cancelBtn=document.getElementById('confirmCancelBtn');
    msg.textContent=tr(s);
    function cleanup(result){
      overlay.classList.remove('open');
      okBtn.removeEventListener('click',onOk);
      cancelBtn.removeEventListener('click',onCancel);
      overlay.removeEventListener('mousedown',onOverlayClick);
      document.removeEventListener('keydown',onKey);
      res(result);
    }
    function onOk(){cleanup(true);}
    function onCancel(){cleanup(false);}
    function onOverlayClick(e){if(e.target===overlay)cleanup(false);}
    function onKey(e){if(e.key==='Escape')cleanup(false);else if(e.key==='Enter')cleanup(true);}
    okBtn.addEventListener('click',onOk);
    cancelBtn.addEventListener('click',onCancel);
    overlay.addEventListener('mousedown',onOverlayClick);
    document.addEventListener('keydown',onKey);
    overlay.classList.add('open');
    okBtn.focus();
  });
}
