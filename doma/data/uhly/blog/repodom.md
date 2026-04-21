# Repo dům — Metodika stavby nezávislého webu bez serveru

**Michaela Nováková**  
2026

---

## Obsah

1. [Úvod](#úvod)
2. [Filosofie](#filosofie)
3. [Principy](#principy)
4. [Architektura](#architektura)
5. [Praktické implementace](#praktické-implementace)
6. [Srovnání s tradičními přístupy](#srovnání-s-tradičními-přístupy)
7. [Bezpečnost a GDPR](#bezpečnost-a-gdpr)
8. [Pitfalls a jejich řešení](#pitfalls-a-jejich-řešení)
9. [Getting started](#getting-started)
10. [Budoucnost](#budoucnost)

---

## Úvod

**Repo dům** není framework. Není to ani SaaS platforma. Je to architektonický pattern — způsob myšlení o tom, jak stavět weby, která si vlastníš a která fungují s minimální externální infrastrukturou.

Základní myšlenka je jednoduchá: tvůj web žije v GitHubu (nebo na kterémkoliv Git hostingu), servíruje se přes GitHub Pages (nebo jakýkoliv static hosting), a všechna data jsou uložena **lokálně v prohlížeči** — v `localStorage`. Není tam databáze. Není tam backend. Není tam API. Je tam jen HTML, CSS, JavaScript a **tvůj soubor dat**.

To není nová myšlenka. Single-page applications existují desítky let. Ale **Repo dům** dodává struktuře — způsob, jak organizovat projeto tak, aby byla:

- **Přenositelná** — vezmeš si ji na jiný server a funguje
- **Offline-capable** — pracuješ i bez internetu
- **Dlouhodobě udržitelná** — bez vendor lock-in
- **Vlastnictvím** — data jsou tvá, nejsi závislá na nikoho

Představ si to jako antitézu SaaS modelu. Místo "přihlaš se k naší platformě a uchovávej tam svá data" je to "tady máš HTML soubor, modifikuj si jej a drž jej u sebe".

---

## Filosofie

Proč Repo dům vznikl? Existují čtyři hlavní pohnutky:

### 1. Odpor vůči vendor lock-in

Když používáš Shopify, Wix nebo Notion, tvá data žijí na jejich serveru. Ty si nemůžeš vzít svou sbírku fotografií a přemístit ji jinam bez bolesti. Jsi závislý na tom, aby jejich server běžel, aby nezvýšili ceny, aby nevyměnili výrobce.

Repo dům řeší toto: tvá data jsou v tvém gitu. Kdykoliv si je vezmeš.

### 2. Ekonomika infrastruktury

Server stojí peníze. Malého e-shopu, rodinného alba nebo vědeckého katalogů. Stojí jej to měsícně 500 Kč za cloud a při 100 návštěvnících měsíčně je to overkill.

GitHub Pages je zdarma. Navždy. Pro statický obsah.

### 3. Offline-first je budoucnost

Internet není všude. A neměl by být absolutní předpoklad. Když publikuješ vědecký katalog, měl by fungovat v knihovně bez internetu. Když se učíš offline — měl bys mít přístup k materiálům bez WiFi.

Repo dům to umožňuje: web si stáhneš, otevřeš lokálně, pracuješ offline, pak se synchronizuješ online.

### 4. Bezpečnost a soukromí

Neexistuje lepší způsob, jak chránit data, než aby nikdy neputovala na cizí server. Repo dům nesbírá nic. Nevysílá nic domů. Je to mezi tebou a tvým počítačem.

Pro citlivá data — zdravotnické záznamy, osobní deníky, právní dokumenty — je to zásadní.

---

## Principy

Repo dům spočívá na pěti pilířích:

### 1. **Statické předlohy** (Static HTML)

Všechny webové stránky jsou HTML, CSS a JavaScript. Žádný server nemusí generovat obsah — ten je již vygenerován a staticky servírován.

To znamená:
- Rychlost (bez latence zpracování na serveru)
- Spolehlivost (bez server outages)
- Jednoduchost (co vidíš, to dostaneš)

### 2. **Lokální state** (localStorage)

Všechna data, která se mění — formuláře, výběr, analýzy, poznámky — se ukládají do `localStorage`. To je API v prohlížeči, která uchovává až 5–10 MB dat per doména.

Příklad:
```javascript
localStorage.setItem('moje_data', JSON.stringify(data));
const data = JSON.parse(localStorage.getItem('moje_data'));
```

To je všechno co potřebuješ. Není tam nikdo na druhé straně, kdo by tvá data sbíral.

### 3. **URL jako stav** (URL State / Deep Linking)

Místo toho, aby se stav uložil na serveru, ukládá se do URL. Když chceš někomu poslat, co vidíš, pošleš mu odkaz.

Příklad:
```
https://example.com/katalog.html?zvire=ptak&uhel=filosoficky&barva=cervena
```

URL je sdílitelný artefakt — nemusíš nic ukládat na server. Osoba dostane link, klikne, vidí přesně to co ty.

To je elegantní: není tam žádné autentifikace, žádné cookies, žádné session. Jen URL, která nese informaci.

### 4. **Konzistentní struktury** (Predictable Paths)

V každém projektu jsou stejné cesty:

```
projekt/
├── index.html          (vstupní bod)
├── doma/
│   ├── ilustrace/
│   │   ├── zvire1.jpg
│   │   ├── zvire2.jpg
│   │   └── ...
│   ├── nastroje/
│   │   ├── analyzer.html
│   │   ├── script.js
│   │   └── style.css
│   └── data/
│       ├── zvire.json
│       ├── uhly.json
│       └── ...
├── README.md
└── LICENSE.md
```

Proč? Protože když má člověk deset projektů, všechny jsou strukturované stejně. Není tam chaos — je tam **konzistence**. Když přejdeš z jednoho projektu na druhý, víš, kde jsou věci.

To také znamená, že můžeš snadno přesouvat assety mezi projekty. Tvoje zvířata jsou v `doma/ilustrace/` — ve všech projektech. Můžeš je sdílet bez přepisování cest.

### 5. **Offline-capable design** (Progressive Enhancement)

Web funguje s internetem i bez něj. Neexistuje se na server — existuje fallback.

Příklad:
```javascript
// Pokud je online, synchronizuj se serverem (optional)
if (navigator.onLine) {
  fetch('/sync-endpoint').then(...)
}
// Ať bez internetu nebo ne, pracuješ s localStorage
const data = localStorage.getItem('moje_data');
```

Aplikace se *degraduje elegantně*. Některé funkce mohou být offline unavailable (export do cloudu), ale jádro (práce s daty) funguje vždy.

---

## Architektura

Jak konkrétně stavíš Repo dům web? Zde je blueprint:

### Struktura projektu

```
projekt-nazev/
│
├── README.md                           # Dokumentace
├── LICENSE.md                          # Právní informace
│
├── index.html                          # Vstupní bod
│
├── doma/
│   ├── ilustrace/
│   │   ├── [tvoje grafické assety]
│   │   └── style.css                  # Globální CSS
│   │
│   ├── nastroje/
│   │   ├── [konkrétní aplikace].html  # Tool 1
│   │   ├── [konkrétní aplikace].html  # Tool 2
│   │   ├── script.js                  # Shared JS logic
│   │   └── styles/
│   │       ├── tool1.css
│   │       ├── tool2.css
│   │       └── ...
│   │
│   └── data/
│       ├── [obsahové JSON soubory]
│       └── [data v textu, kterou projekt používá]
│
└── .gitignore                          # Co si netlačit do gitu
```

### Minimální HTML šablona

```html
<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Projekt — Repo dům</title>
  <link rel="stylesheet" href="../ilustrace/style.css">
  <link rel="stylesheet" href="./tools.css">
</head>
<body>
  <div id="app"></div>
  
  <script src="./shared-logic.js"></script>
  <script src="./tool-specific.js"></script>
</body>
</html>
```

**Klíčové body:**
- Jedna HTML stránka (SPA — single page application)
- Všechny styly z relativní cesty `../ilustrace/`
- JavaScript se načítá v pořadí (shared → specific)
- Stav se spravuje v JS (ne na serveru)

### Správa stavu — localStorage + URL

```javascript
// 1. Inicializace — přečti stav z URL a localStorage
function initializeApp() {
  const params = new URLSearchParams(window.location.search);
  
  let state = {
    vyber: params.get('vyber') || 'default',
    barva: params.get('barva') || localStorage.getItem('barva') || '#000',
    data: JSON.parse(localStorage.getItem('moje_data') || '{}')
  };
  
  return state;
}

// 2. Když se změní stav, ulož jej
function updateState(newData) {
  localStorage.setItem('moje_data', JSON.stringify(newData));
  
  // Aktualizuj URL (aby se dalo sdílet)
  const params = new URLSearchParams();
  params.set('vyber', newData.vyber);
  window.history.replaceState(null, '', `?${params}`);
  
  // Překresli UI
  render(newData);
}

// 3. Když se změní URL (někdo poslal odkaz), přečti stav
window.addEventListener('popstate', () => {
  const state = initializeApp();
  render(state);
});
```

To je jádro: **stav je tři místa — URL (pro sdílení), localStorage (pro perzistenci), memory (pro UI)**.

### Data — JSON v `doma/data/`

Místo databáze máš JSON soubory:

```json
// doma/data/zvire.json
{
  "ryba": {
    "nazev": "Ryba",
    "popis": "Analytika detailu",
    "ikona": "🐟"
  },
  "slon": {
    "nazev": "Slon",
    "popis": "Holismus a paměť",
    "ikona": "🐘"
  }
}
```

Při načtení webu se JSON stáhne (je to statický soubor):

```javascript
fetch('../data/zvire.json')
  .then(r => r.json())
  .then(data => {
    localStorage.setItem('zvire_katalog', JSON.stringify(data));
    render(data);
  });
```

Pokud je offline, fetch selže — ale to je OK, protože data jsou již v localStorage z minula.

### Export a sdílení

Jakmile má uživatel data, chce je exportovat. Bez serveru nemůžeš jej "nahrát" — ale můžeš mu dát soubor ke stažení:

```javascript
function exportData() {
  const data = localStorage.getItem('moje_data');
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = 'moje_data_backup.json';
  a.click();
}
```

A když chce data znovu nahrát:

```javascript
function importData(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const data = JSON.parse(e.target.result);
    localStorage.setItem('moje_data', JSON.stringify(data));
    location.reload(); // Znovu načti UI
  };
  reader.readAsText(file);
}
```

---

## Praktické implementace

Kde se Repo dům opravdu hodí? Zde jsou konkrétní příklady:

### 1. E-shop bez platební brány

Tradičně: Shopify → měsíční poplatek → jejich server → jejich pravidla.

Repo dům:
```
eshop/
├── index.html              # Katalog produktů
├── doma/
│   ├── data/
│   │   └── produkty.json   # { id, nazev, cena, popis, foto }
│   ├── ilustrace/
│   │   ├── produkty/       # Fotos
│   │   └── style.css
│   └── nastroje/
│       ├── kosik.html      # Nákupní košík (localStorage)
│       ├── katalog.html    # Zobrazení produktů
│       └── script.js
```

Uživatel si otevře eshop, prohlíží produkty, přidá do košíku (lokálně), pak si vezme **CSV export** nebo **Email s detaily** (můžeš mu nabídnout payment link na external branu jako Stripe, PayPal — bez toho aby jejich server řešil obsah).

Výhody:
- Žádné měsíční poplatky
- Plná kontrola nad designem
- Data jsou tvá
- Funguje offline (user si prohlíží katalog i bez internetu)

### 2. Vědecký katalog (botanika, entomologie, zoologie)

```
katalog_ptak/
├── index.html
├── doma/
│   ├── data/
│   │   ├── ptaci.json      # { id, nazev, popis, foto, habitat, ... }
│   │   └── klice.json      # Taxonomické klíče
│   ├── ilustrace/
│   │   ├── ptaci/          # Fotografie ptáků
│   │   └── style.css
│   └── nastroje/
│       ├── vyhledavac.html # Fultext search
│       ├── klice.html      # Interaktivní určování
│       └── mapa.html       # Distribuce druhů
```

Badatel nebo amatér si stáhne ZIP, otevře v prohlížeči, může:
- Vyhledávat offline
- Filtrovat podle vlastností
- Vytvářet si poznámky (localStorage)
- Exportovat si záznamy
- Sdílet findings (URL s filtry, např. `?habitat=les&velikost=velky`)

Ideální pro terénní práci — nemáš WiFi v lese, ale máš offline data.

### 3. Rodinný archiv fotografií

```
archiv_foto/
├── index.html
├── doma/
│   ├── data/
│   │   └── fotografie.json # { id, datum, popis, osoby, tags }
│   ├── ilustrace/
│   │   ├── archiv/         # JPG/PNG foto
│   │   ├── thumbnaily/     # Komprimované verze
│   │   └── style.css
│   └── nastroje/
│       ├── galerie.html    # Zobrazení s filtry
│       └── editor.html     # Přidání metadat
```

Tvá rodina:
- Otevře si galerii, prochází fotky
- Přidá poznámky, tagy (lokálně)
- Exortuje si oblíbené (ZIP soubor)
- Sdílí URL s jinými členy ("Tady je polibek z roku 1995")
- Všechno je offline dostupné

Žádné Google Photos, žádné Amazon storage. Tvoje data, tvůj archiv.

### 4. Interaktivní vzdělávací materiál

```
kurz_lingvistika/
├── index.html
├── doma/
│   ├── data/
│   │   ├── kapitoly.json       # { id, nazev, obsah }
│   │   ├── cviceni.json        # { id, typ, otazky }
│   │   └── odpovedi.json       # { id, spravne_odpovedi }
│   ├── ilustrace/
│   │   ├── schema/             # Diagramy
│   │   └── style.css
│   └── nastroje/
│       ├── kapitola.html       # Čtení kapitol
│       ├── cviceni.html        # Interaktivní cvičení
│       └── progress.html       # Pokrok studenta
```

Student:
- Stáhne si kurz (ZIP, ~5MB)
- Pracuje offline (na vlaků, bez připojení)
- Dělá cvičení — score se ukládá lokálně
- Exportuje si certifikát nebo report
- Všechno bez toho aby něco putovalo na server

Ideální pro:
- Offline školení
- Vzdálené oblasti bez stabilního internetu
- Ochranu soukromí (nikdo nesleduje co se učíš)

### 5. Portfolio a osobní web

```
portfolio_michaela/
├── index.html
├── doma/
│   ├── data/
│   │   ├── projekty.json   # { id, nazev, popis, link, rok }
│   │   └── dovednosti.json # { nazev, level }
│   ├── ilustrace/
│   │   ├── loga/
│   │   ├── projekty/
│   │   └── style.css
│   └── nastroje/
│       ├── galerie.html    # Zobrazení projektů
│       └── kontakt.html    # Formulář (bez backendu)
```

Formulář bez backendu? Ano — můžeš použít služby jako Formspree, Basin či Netlify Forms, které "chytají" formulář bez serveru na tvé straně. Nebo jednoduše uložiš data do localStorage a pošleš si je sám emailem.

---

## Srovnání s tradičními přístupy

Jak se Repo dům porovnává s ostatními metodami?

| Aspekt | Repo dům | WordPress | Shopify | Custom React + Node |
|--------|----------|-----------|---------|-------------------|
| **Cena za hosting** | Zdarma (GH Pages) | ~200 Kč/měsíc | ~500 Kč/měsíc | ~5000 Kč/měsíc |
| **Technické znalosti** | HTML + JS (elementární) | Minimální (GUI) | Minimální (GUI) | Vysoké (full-stack) |
| **Data ownership** | 100% tvá | U providera | U providera | Tvá (pokud svůj server) |
| **Offline** | Ano | Ne | Ne | Ne (bez PWA) |
| **Flexibility** | Vysoká | Střední (pluginy) | Nízká (omezeno) | Velmi vysoká |
| **Bezpečnost** | Vysoká (bez serveru) | Střední (závisí na pluginech) | Vysoká (enterprise) | Závisí na kódu |
| **SEO** | Dobrý (static content) | Vynikající | Vynikající | Dobrý (s SSR) |
| **Údržba** | Minimální | Nízká (aktualizace) | Minimální | Vysoká |

**Kdy zvolit Repo dům?**
- Malé projekty (do 10 MB dat)
- Offline musí fungovat
- Nechceš placení za hosting
- Chceš plné vlastnictví
- Data nejsou extrémně dynamická (ne live chat, ne real-time)

**Kdy ne?**
- Potřebuješ full-text vyhledávání přes miliony záznamů (pomalý JS)
- Musíš sčítát věci v reálném čase (bez serveru to je těžké)
- Uživatelé mají být anonymní (bez cookies a auth to nejde)
- Potřebuješ real-time synchronizaci (bez WebSockets)

---

## Bezpečnost a GDPR

Repo dům má výhody v bezpečnosti, ale i úskalí.

### Bezpečnost — výhody

**Žádný server = žádné hacování serveru**

Pokud není server, není co hacovat. Útočník si nemůže vzít tvoje data, protože ta nejsou na serveru. Jsou v localStorage uživatele.

**Nula injectionů**

Bez databáze není SQL injection. Bez API není API injection. Jednoduše — kód beží lokálně a pracuje s lokálními daty.

**Transparentnost**

Veškerý kód je veřejný (pokud je v GitHub). Lidi si mohou přečíst, co se děje. Žádné skryté callbacky do serverů. To je bezpečnost skrze transparentnost.

### Bezpečnost — úskalí

**XSS (Cross-site scripting)**

Pokud akceptuješ uživatelský input a vkládáš jej do HTML bez sanitizace, útočník vloží JavaScript:

```html
<!-- Špatně -->
<div id="obsah"></div>
<script>
  const text = prompt('Zadej text');
  document.getElementById('obsah').innerHTML = text; // ❌ XSS!
</script>

<!-- Správně -->
document.getElementById('obsah').textContent = text; // ✓ Safe
// Nebo pokud potřebuješ HTML:
import DOMPurify from 'dompurify';
document.getElementById('obsah').innerHTML = DOMPurify.sanitize(text);
```

**localStorage je čitelné JavaScriptem**

Cokoli v localStorage si může přečíst libovolný JS běžící na stránce. Pokud je tam heslo, je kompromitováno. Řešení: **nikdy** tam neukládej hesla. localStorage je pro data, nikoliv pro secrets.

**CORS — Cross-Origin Resource Sharing**

Pokud chceš loadit data z jiné domény, CORS ti to blokuje. Řešení: proxy nebo vlastní data lokálně.

### GDPR — výhody

**Nespracováváš osobní data na serveru**

GDPR se týká serverů, které zpracovávají osobní data. Repo dům nemá server. Pokud uživatel zapíše svůj deník, zůstane v jeho localStorage — ty ho nesbíráš.

To znamená:
- Žádné "Privacy policy"? Jednoduché — "Tvá data zůstávají u tebe"
- Žádná "cookie banner"? Žádné cookies nejsou
- Žádné "right to deletion"? Data si smaže sám

### GDPR — úskalí

**Pokud sbíráš cokoliv (i anonymně)**

Jakmile něco putuje na server (např. analytics), potřebuješ GDPR kompliance. Řešení:
- Nesbírej nic (ideální)
- Nebo použij GDPR-compliant analytics (Plausible, Fathom)

**Export data — povinnost**

GDPR vyžaduje "right to data portability" — uživatel si chce vzít data. V Repo domu to je jednoduché — stáhne si JSON. Naplňuješ povinnost bez práce.

---

## Pitfalls a jejich řešení

Kde obvykle zlyhává Repo dům a jak to řešit:

### Pitfall 1: localStorage má limit (~5–10 MB)

**Problém:** Máš 50 000 fotografií. localStorage to neudrží.

**Řešení:**
- Data rozdělíš na "stránky" — najednou loaduješ jen X záznamů
- Nebo použiješ IndexedDB (pokročilejší API, až 50+ GB)
- Nebo si vezmeš jen metadata (jméno, náhled, tag) a fulls images loaduješ on-demand

```javascript
// Paginated loading
const itemsPerPage = 50;
const page = parseInt(params.get('page')) || 1;
const start = (page - 1) * itemsPerPage;
const items = allItems.slice(start, start + itemsPerPage);
```

### Pitfall 2: Vyhledávání je pomalé

**Problém:** Máš 100 000 záznamů a chceš full-text search. JS je pomalý.

**Řešení:**
- Indexuješ data na compile-time (ne runtime)
- Nebo používáš webworkers (paralelní vláko v JS)
- Nebo limit hledání — "hledej jen v posledních 1000 záznamech"

```javascript
// Web worker pro paralelní hledání
const worker = new Worker('search-worker.js');
worker.postMessage({ query, data });
worker.onmessage = (e) => {
  const results = e.data;
  render(results);
};
```

### Pitfall 3: Offline synchronizace je komplikovaná

**Problém:** Uživatel edituje offline, pak se připojí. Který data jsou nová? Kterou verzi si vezmeš?

**Řešení:**
- Nevěř automtické synchronizaci — zeptej se
- Uchovej "verzi" dat — `{ data, timestamp, hash }`
- Pokud se data změní na obou stranách, zkonfrontuj uživatele

```javascript
// Verzování dat
const myData = {
  content: "text",
  version: 5,
  lastModified: 1234567890,
  hash: "abc123"
};

// Při sync: porovnaj hash
if (serverData.hash !== myData.hash) {
  // Konflikt — zepti se uživatele která verze je správná
  showConflictDialog(myData, serverData);
}
```

### Pitfall 4: Sdílení je jednosměrné

**Problém:** Pošleš URL příteli, ten ji upraví, ale ty to nevidíš.

**Řešení:**
To není bug, je to design. Pokud chceš real-time collaboration, Repo dům není vhodný. Místo toho:
- Použij Operational Transform (OT) nebo CRDT
- Nebo centralizuj úpravy — "odkaz je read-only"

Ale to už není čistý Repo dům — je to hybrid.

### Pitfall 5: Backup a recovery

**Problém:** Uživatel smaže data omylem. Jak se vrátí?

**Řešení:**
- Automaticky exportuj data periodicky (každý den)
- Udělej "history" — ulož verze dat (s timestamps)
- Nebo pravidelný prompt: "Chceš si stáhnout backup?"

```javascript
// Auto-backup
setInterval(() => {
  const backup = {
    data: localStorage.getItem('moje_data'),
    timestamp: new Date().toISOString()
  };
  const existing = JSON.parse(localStorage.getItem('backups')) || [];
  existing.push(backup);
  // Drž jen posledních 10 backupů
  localStorage.setItem('backups', JSON.stringify(existing.slice(-10)));
}, 24 * 60 * 60 * 1000); // Každý den
```

---

## Getting started

Jak postavit svůj první Repo dům web? Zde je krok za krokem:

### Krok 1: Vytvoř Git repository

```bash
# Na GitHubu vytvoř nový repozitář
# (nebo lokálně)

git init projekt-nazev
cd projekt-nazev
```

### Krok 2: Nastav základní strukturu

```bash
mkdir doma
mkdir doma/ilustrace
mkdir doma/nastroje
mkdir doma/data

touch index.html
touch doma/ilustrace/style.css
touch doma/nastroje/app.html
touch doma/nastroje/app.js
touch doma/data/data.json
touch README.md
touch LICENSE.md
```

### Krok 3: Napiš základní HTML

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Můj Repo dům projekt</title>
  <link rel="stylesheet" href="doma/ilustrace/style.css">
</head>
<body>
  <header>
    <h1>Můj web bez serveru</h1>
    <nav>
      <a href="doma/nastroje/app.html">Aplikace</a>
    </nav>
  </header>
  
  <main>
    <p>Vítej v Repo domu!</p>
  </main>
</body>
</html>
```

### Krok 4: Napiš aplikaci

```html
<!-- doma/nastroje/app.html -->
<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <title>Aplikace</title>
  <link rel="stylesheet" href="../ilustrace/style.css">
</head>
<body>
  <div id="app"></div>
  <script src="./app.js"></script>
</body>
</html>
```

```javascript
// doma/nastroje/app.js
class RepoApp {
  constructor() {
    this.state = this.loadState();
    this.render();
    this.attachListeners();
  }
  
  loadState() {
    const params = new URLSearchParams(window.location.search);
    return {
      items: JSON.parse(localStorage.getItem('items') || '[]'),
      filter: params.get('filter') || ''
    };
  }
  
  saveState() {
    localStorage.setItem('items', JSON.stringify(this.state.items));
    const params = new URLSearchParams();
    params.set('filter', this.state.filter);
    window.history.replaceState(null, '', `?${params}`);
  }
  
  addItem(text) {
    this.state.items.push({
      id: Date.now(),
      text,
      created: new Date().toISOString()
    });
    this.saveState();
    this.render();
  }
  
  render() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <input type="text" id="input" placeholder="Přidej položku">
      <button id="add">Přidat</button>
      <ul>
        ${this.state.items.map(item => `
          <li>${item.text}</li>
        `).join('')}
      </ul>
    `;
  }
  
  attachListeners() {
    document.getElementById('add').addEventListener('click', () => {
      const input = document.getElementById('input');
      this.addItem(input.value);
      input.value = '';
    });
  }
}

new RepoApp();
```

### Krok 5: Push na GitHub

```bash
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/tvoje_github/projekt-nazev.git
git push -u origin main
```

### Krok 6: Povoluj GitHub Pages

V repozitáři:
- Settings → Pages
- Source: Deploy from a branch
- Branch: main
- Folder: / (root)
- Save

Za pár sekund bude tvůj web dostupný na `https://tvoje_github.github.io/projekt-nazev/`

---

## Budoucnost

Repo dům není silver bullet, ale má potenciál. Kde vidím evoluci:

### 1. Lepší offline sync

Nástoje jako **Replicache** a **Figma's multiplayer architecture** ukazují, že můžeš mít real-time collaboration bez centrálního serveru. Repo dům by mohl tyto technologie zapracovat.

### 2. WASM pro performance

JavaScript je pomalý na velkých datech. WebAssembly (WASM) by umožnil fast indexing, vyhledávání, zpracování. To by rozšířilo hranice toho co je v Repo domu možné.

### 3. Decentralizace

Místo GitHub Pages (centralizovaného) by mohly být weby distribuovány přes IPFS nebo Holochain. Pak by byla Repo dům skutečně decentralizovaná.

### 4. Better tooling

Teď se Repo dům píše ručně. Mohl by existovat framework, který generuje strukturu, spravuje state, stará se o sync. Něco jako "Svelte for offline-first apps".

### 5. Právní standardizace

GDPR a další regulace se aspoň častěji zajímají o data ownership. Repo dům by mohl být "standard for user data ownership" — oficiálně schválený jako privacy-preserving.

---

## Závěr

**Repo dům není módní trend.** Je to odpověď na specifické potřeby:

- Tvůrci, které nechtějí platit za hosting
- Vědce, který chce offline data
- Vývojáři, který chcce data ownership
- Neziskovky, které nemají budget na infrastrukturu
- Vzdělávací programy v oblastech bez internetu

Je to staré myšlenky (statické weby) v nových šatech (interactivní aplikace). Ale to není slabost — je to síla.

Klíč je pochopit, **kdy jej používat a kdy ne**. Není to framework pro všechno. Ale pro svou doménu — offline-capable, decentralized, user-owned web — je to elegantní řešení.

Pokud chceš stavět web bez vendor lock-in, bez měsíčních poplatků, bez serveru na kterém by padal — Repo dům je cesta.

---

**Kontakt a další zdroje:**

Pokud chceš konzultaci nebo custom build: chcesmys@gmail.com

GitHub repository s příklady: [odkaz na template]

Další čtení:
- MDN — localStorage a Web APIs
- GitHub Pages dokumentace
- Offline-first manifesto
- GDPR a web development

---

*Michaela Nováková, 2026*
