import { $ } from './utils.js';
import { renderDashboard } from './dashboard.js';
import { renderStats } from './stats.js';
import { renderReports, resetTradeFilters } from './trades-list.js';

/* ================= Tabs =================
   Sekcia je zapísaná v URL za mriežkou (#/trades). Vďaka tomu funguje tlačidlo Späť,
   dá sa uložiť záložka na konkrétnu sekciu a obnovenie stránky ťa nechá tam, kde si bol.

   Prečo mriežka a nie pekná cesta /trades: appka je statická a beží aj na GitHub Pages,
   kde by /trades skončilo ako 404 - server by musel na každú cestu vrátiť index.html.
   Mriežka funguje všade bez nastavovania a boot skript v index.html ju pri presmerovaní
   na ?_cv= zachováva. */

export const TABS = ['dashboard', 'calendar', 'journal', 'stats', 'trades', 'strategies', 'reports', 'import', 'data', 'settings'];
const DEFAULT_TAB = 'dashboard';

/** Sekcia z URL. Prázdna mriežka = úvodná sekcia, neznáma hodnota = null (neprepínaj). */
export function tabFromHash(hash) {
  const raw = String(hash != null ? hash : location.hash || '').replace(/^#\/?/, '').trim();
  if (!raw) return DEFAULT_TAB;
  return TABS.includes(raw) ? raw : null;
}

/**
 * @param {string} name  sekcia
 * @param {boolean} [updateHash=true]  false = len prepni UI, URL nechaj tak. Používa sa,
 *   keď zmena prišla z URL (Späť/Vpred) - inak by sme do histórie zapisovali znova to isté.
 */
export function goToTab(name, updateHash) {
  if (!TABS.includes(name)) name = DEFAULT_TAB;
  document.querySelectorAll('nav button').forEach(x => x.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
  const btn = document.querySelector('nav button[data-tab="' + name + '"]');
  if (btn) btn.classList.add('active');
  $('tab-' + name).classList.add('active');
  if (name === 'dashboard') renderDashboard();
  if (name === 'stats') renderStats();
  if (name === 'reports') renderReports();
  // Bez resetu sa nová sekcia otvorí v tej istej výške, v akej bola predošlá -
  // napr. zoznam obchodov uprostred tabuľky, čo vyzerá ako že sa nič nestalo.
  window.scrollTo(0, 0);
  closeMobileNav();
  if (updateHash !== false) {
    const target = '#/' + name;
    if (location.hash !== target) location.hash = target; // pridá krok do histórie
  }
}

/** Otvorí sekciu podľa aktuálnej URL. Volá sa pri štarte aj pri Späť/Vpred. */
export function applyRouteFromHash() {
  const name = tabFromHash();
  if (!name) return; // neznáma sekcia v URL - nechaj používateľa tam, kde je
  goToTab(name, false);
}

window.addEventListener('hashchange', applyRouteFromHash);

document.querySelectorAll('nav button').forEach(b => {
  b.onclick = () => {
    // Zámerne len pri kliku v menu: preklik z grafu si filter nastavuje sám a robí to
    // až po goToTab(), takže mu tento reset neprekáža. Späť/Vpred tiež nechávame tak -
    // vrátiť sa má na to, čo tam bolo.
    if (b.dataset.tab === 'trades') resetTradeFilters();
    goToTab(b.dataset.tab);
  };
});
export function toggleMobileNav() { $('headerControls').classList.toggle('open'); }
export function closeMobileNav() { $('headerControls').classList.remove('open'); }
