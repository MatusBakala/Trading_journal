# Návod: Nasadenie appky + Google Drive sync

Appka (`index.html`) teraz vie automaticky ukladať a načítavať zálohu z tvojho
Google Drive (do skrytého priečinka appky – nevidíš ho v bežnom zozname súborov
na Drive, ale patrí ti a počíta sa do tvojho úložiska). Aby to fungovalo, treba
appku hostovať na nejakej URL adrese (Google prihlásenie nefunguje spoľahlivo
z `file://`) a založiť si (zadarmo) prístup ku Google Drive API.

Trvá to cca 10 minút, jednorazovo.

## Krok 1 – Nahraj appku na GitHub Pages (zadarmo)

### 1a. Vytvor nový repozitár (ak ešte nemáš)

1. Prihlás sa na [github.com](https://github.com).
2. Vpravo hore klikni na **+** → **New repository**.
3. Repository name: napíš napr. `trading-journal`.
4. Nižšie pri "Visibility" zaškrtni **Public** (nie Private – to je presne to
   nastavenie, ktoré si hľadal).
5. Nič iné nezaškrtávaj (README netreba) → klikni zelené **Create repository**.

### 1b. Ak už repozitár máš a je Private, zmeň ho na Public

1. Otvor svoj repozitár → záložka **Settings** (hore v repozitári, nie účet).
2. Zíď úplne dole do sekcie **Danger Zone**.
3. Klikni **Change visibility** → **Change to public** → potvrď (treba napísať
   názov repozitára pre potvrdenie).

### 1c. Nahraj súbor `index.html`

1. Na hlavnej stránke repozitára klikni **Add file** (vpravo hore nad zoznamom
   súborov) → **Upload files**.
   (Ak repozitár už niečo obsahuje, tlačidlo "Add file" nájdeš rovnako hore.)
2. Presuň tam súbor `index.html` z priečinka `Trading_journal_app` na svojom
   počítači (alebo klikni "choose your files" a vyber ho).
3. Dole klikni zelené **Commit changes** (žiadne ďalšie nastavenia netreba meniť).

### 1d. Zapni GitHub Pages

1. V repozitári choď na **Settings → Pages** (v ľavom menu).
2. Pri "Build and deployment → Source" vyber **Deploy from a branch**.
3. Pri "Branch" vyber `main` a priečinok `/ (root)` → **Save**.
4. Počkaj cca 1 minútu, obnov stránku – hore sa objaví zelený rámček s adresou
   appky v tvare `https://<tvoje-meno>.github.io/trading-journal/`.
4. V repozitári choď do **Settings → Pages**.
5. Pri "Source" vyber **Deploy from a branch**, branch `main`, priečinok `/ (root)` → **Save**.
6. Po chvíli sa appka objaví na adrese v tvare:
   `https://<tvoje-github-meno>.github.io/trading-journal/`
   Túto URL si ulož – bude treba v Kroku 2 aj na otváranie appky z PC/mobilu.

## Krok 2 – Google Cloud: povoľ Drive API a vytvor Client ID

1. Choď na [console.cloud.google.com](https://console.cloud.google.com) a prihlás sa
   účtom `matoburkos@gmail.com`.
2. Hore vytvor **nový projekt** (napr. "Trading Journal"), počkaj kým sa vytvorí.
3. V ľavom menu choď na **APIs & Services → Library**, vyhľadaj **Google Drive API**
   a klikni **Enable**.
4. Choď na **APIs & Services → OAuth consent screen**.
   - User Type: **External** → Create.
   - Vyplň názov appky (napr. "Trading Journal"), tvoj e-mail ako support email
     aj ako developer contact email → Save and Continue.
   - Scopes: netreba nič pridávať ručne, appka si o scope `drive.appdata` požiada
     sama pri prihlásení → Save and Continue.
   - Test users: klikni **+ Add users** a pridaj `matoburkos@gmail.com` → Save.
   - Appka môže ostať v stave "Testing" – netreba ju nikde verejne publikovať,
     je len pre teba.
5. Choď na **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
   - Application type: **Web application**.
   - Name: čokoľvek (napr. "Trading Journal Web").
   - **Authorized JavaScript origins** → Add URI → vlož URL z Kroku 1, ale **bez**
     cesty za doménou, napr.: `https://tvoje-meno.github.io`
   - Create.
6. Zobrazí sa **Client ID** (dlhý reťazec končiaci na `.apps.googleusercontent.com`).
   Skopíruj si ho.

## Krok 3 – Prepoj appku

1. Otvor appku na GitHub Pages URL z Kroku 1 (v Safari aj kdekoľvek inde).
2. Choď na **Nastavenia → ☁️ Cloud sync (Google Drive)**.
3. Vlož Client ID z Kroku 2 do poľa "Google Client ID".
4. Klikni **🔗 Pripojiť Google Drive**, prihlás sa účtom `matoburkos@gmail.com`
   a potvrď prístup (Google zobrazí upozornenie "unverified app" – to je normálne,
   keďže appka je len pre teba; klikni "Advanced/Rozšírené" → "Go to Trading
   Journal (unsafe)"/pokračovať).
5. Appka odteraz automaticky:
   - po každej zmene (nový obchod, import, úprava) po ~4 sekundách potichu
     zálohuje dáta na Drive,
   - pri otvorení na inom zariadení/prehliadači si dáta sama stiahne, ak sú
     na Drive novšie ako lokálne.

Na mobile stačí otvoriť tú istú GitHub Pages URL v Safari/Chrome a znova sa
raz prihlásiť Google účtom (Krok 3, body 3–4) – appka je tá istá appka bežiaca
z tej istej adresy, ktorá sa cez Drive automaticky zosynchronizuje s dátami
z PC.

## Poznámky

- Toto **nie je** klasický server – dáta stále primárne žijú lokálne v
  prehliadači (IndexedDB), Google Drive slúži ako zdieľané úložisko medzi
  zariadeniami a záloha. Appka funguje aj offline, sync doplní zmeny, keď
  bude internet.
- Súbor na Drive sa volá `trading-journal-backup.json` a je v skrytom
  "appDataFolder" – zmizne, ak appku v Google účte niekedy "odpojíš" cez
  [myaccount.google.com/permissions](https://myaccount.google.com/permissions).
- Ak by si niekedy chcel appku posunúť na skutočný backend (viac používateľov,
  real-time), toto nastavenie sa dá kedykoľvek nahradiť bez straty dát – JSON
  záloha je štandardná a dá sa vždy vytiahnuť aj ručne cez Nastavenia →
  Manuálna záloha.
