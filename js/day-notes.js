import { accTrades } from './accounts.js';
import { idbAll, idbDel, idbPut } from './db.js';
import { scheduleAutoSync } from './gdrive.js';
import { tr } from './i18n.js';
import { state } from './state.js';
import { isHtmlNotes, rtEditorHTML, tTime } from './strategy-notes.js';
import { $, computePnl, dayKey, esc, EMOTIONS, fmtMoney, moneyCls, toast } from './utils.js';

/* ================= Denník dňa (zhrnutie celého dňa, nielen jednotlivých obchodov) =================
   Zápis je vedený na dátum ('YYYY-MM-DD'), nie na obchod - preto sa dá napísať aj v deň,
   keď si neobchodoval (a presne to je často to najcennejšie: prečo som nešiel do trhu).

   Editor existuje v dvoch inštanciách naraz: 'cal' v paneli dňa v kalendári (spolu s
   obchodmi) a 'jr' v záložke Denník (bez obchodov, na sústredené písanie). Preto má
   každý prvok príponu podľa scope - dve inštancie v DOM nesmú zdieľať ID. */

export const DAY_RATINGS = [1, 2, 3, 4, 5];
const SCOPES = ['cal', 'jr'];

/** Prázdny zápis - jediné miesto, kde je definovaný tvar záznamu. */
export function emptyDayNote(date) {
  return { date, rating: 0, mood: '', wentWell: '', toImprove: '', text: '', updated: 0 };
}

export function dayNoteFor(date) {
  return state.dayNotes.find(n => n.date === date) || null;
}

/** Voľný text je HTML (rich text) - na hľadanie, výpis aj AI potrebujeme čistý text. */
export function stripHtml(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Zápis je "prázdny" (nemá zmysel ho držať), keď v ňom nie je vôbec nič vyplnené. */
export function isDayNoteEmpty(n) {
  if (!n) return true;
  return !n.rating && !n.mood && !String(n.wentWell || '').trim() &&
    !String(n.toImprove || '').trim() && !stripHtml(n.text);
}

export function hasDayNote(date) {
  return !isDayNoteEmpty(dayNoteFor(date));
}

export async function loadDayNotes() {
  state.dayNotes = await idbAll('dayNotes');
}

/** Uloží zápis; prázdny zápis sa namiesto uloženia zmaže, aby v denníku nevznikali duchovia. */
export async function saveDayNote(note) {
  const i = state.dayNotes.findIndex(n => n.date === note.date);
  if (isDayNoteEmpty(note)) {
    if (i >= 0) {
      state.dayNotes.splice(i, 1);
      await idbDel('dayNotes', note.date);
    }
    return false;
  }
  const rec = Object.assign({}, note, { updated: Date.now() });
  if (i >= 0) state.dayNotes[i] = rec; else state.dayNotes.push(rec);
  await idbPut('dayNotes', rec);
  return true;
}

/* ---------- pomocné výpočty ---------- */

export function dayStats(date) {
  const ts = accTrades().filter(t => dayKey(tTime(t)) === date);
  const pnls = ts.map(computePnl);
  const net = pnls.reduce((a, b) => a + b, 0);
  const wins = pnls.filter(p => p > 0).length;
  return { count: ts.length, net, wins, winRate: ts.length ? wins / ts.length * 100 : null };
}

/* Slovenské skloňovanie: 1 obchod, 2-4 obchody, 0 aj 5+ obchodov.
   Pozor na nulu - tá patrí k "obchodov", nie k "obchody" (denník sa píše aj v dni bez obchodov). */
export function skTradePlural(n) {
  if (n === 1) return 'obchod';
  return (n >= 2 && n <= 4) ? 'obchody' : 'obchodov';
}

export function ratingStars(rating) {
  const r = Math.max(0, Math.min(5, Number(rating) || 0));
  return '★'.repeat(r) + '☆'.repeat(5 - r);
}

/** Staršie zápisy sú čistý text - pri načítaní do rich-text editora treba zachovať riadky. */
export function noteTextToHtml(text) {
  const t = String(text || '');
  if (!t.trim()) return '';
  if (isHtmlNotes(t)) return t;
  return t.split('\n').map(line => `<div>${esc(line) || '<br>'}</div>`).join('');
}

/* ---------- editor ---------- */

function moodOptions(sel) {
  const opts = ['<option value="">–</option>'];
  for (const [k, label] of Object.entries(EMOTIONS)) {
    opts.push(`<option value="${k}"${k === sel ? ' selected' : ''}>${esc(tr(label))}</option>`);
  }
  return opts.join('');
}

function ratingButtonsHTML(date, rating, scope) {
  return DAY_RATINGS.map(r =>
    `<button type="button" class="dnStar${r <= rating ? ' on' : ''}" data-action="setDayRating" data-date="${date}" data-scope="${scope}" data-rating="${r}" title="${r}/5">★</button>`
  ).join('') +
    `<button type="button" class="dnStarClear" data-action="setDayRating" data-date="${date}" data-scope="${scope}" data-rating="0" title="${esc(tr('Zrušiť hodnotenie'))}">✕</button>`;
}

/**
 * Editor zhrnutia dňa.
 * @param {string} date  deň vo formáte YYYY-MM-DD
 * @param {'cal'|'jr'} scope  'cal' = panel dňa v kalendári, 'jr' = záložka Denník
 */
export function dayNoteEditorHTML(date, scope) {
  const n = dayNoteFor(date) || emptyDayNote(date);
  const s = scope || 'cal';
  return `<div class="dayNote" id="dnBox_${s}" data-date="${date}" data-scope="${s}">
    <h3 style="margin-bottom:10px">📓 ${esc(tr('Zhrnutie dňa'))}</h3>
    <div class="dnGrid">
      <label class="f">${esc(tr('Hodnotenie dňa'))}
        <div class="dnStars" id="dnStars_${s}">${ratingButtonsHTML(date, n.rating || 0, s)}</div>
      </label>
      <label class="f">${esc(tr('Nálada / psychika'))}
        <select id="dnMood_${s}">${moodOptions(n.mood || '')}</select>
      </label>
    </div>
    <div class="dnGrid">
      <label class="f">${esc(tr('Čo išlo dobre'))}
        <textarea id="dnWentWell_${s}" rows="3" placeholder="${esc(tr('Čo sa dnes podarilo, čo zopakovať...'))}">${esc(n.wentWell || '')}</textarea>
      </label>
      <label class="f">${esc(tr('Čo zlepšiť'))}
        <textarea id="dnToImprove_${s}" rows="3" placeholder="${esc(tr('Chyby, na čo si dať pozor nabudúce...'))}">${esc(n.toImprove || '')}</textarea>
      </label>
    </div>
    <label class="f" style="margin-bottom:0">${esc(tr('Zhrnutie dňa (voľný text)'))}</label>
    ${rtEditorHTML('dnEditor_' + s, noteTextToHtml(n.text))}
    <div style="display:flex;gap:8px;align-items:center;margin-top:12px;flex-wrap:wrap">
      <button class="btn small" data-action="saveDayNote" data-date="${date}" data-scope="${s}">${esc(tr('Uložiť zhrnutie'))}</button>
      ${hasDayNote(date) ? `<button class="btn secondary small" data-action="deleteDayNote" data-date="${date}" data-scope="${s}">${esc(tr('Vymazať zhrnutie'))}</button>` : ''}
      <span class="hint">${n.updated ? esc(tr('Uložené') + ' ' + new Date(n.updated).toLocaleString(state.settings.lang === 'en' ? 'en-GB' : 'sk-SK')) : ''}</span>
    </div>
  </div>`;
}

/** Prečíta rozpísaný zápis z DOM (hviezdičky sú v data atribúte, zvyšok v poliach). */
export function readDayNoteFromForm(date, scope) {
  const s = scope || 'cal';
  const box = $('dnBox_' + s);
  const prev = dayNoteFor(date) || emptyDayNote(date);
  if (!box) return prev;
  const ed = $('dnEditor_' + s);
  return {
    date,
    rating: Number(box.dataset.rating != null && box.dataset.rating !== '' ? box.dataset.rating : (prev.rating || 0)) || 0,
    mood: ($('dnMood_' + s) || {}).value || '',
    wentWell: ($('dnWentWell_' + s) || {}).value || '',
    toImprove: ($('dnToImprove_' + s) || {}).value || '',
    text: ed ? ed.innerHTML : (prev.text || ''),
    updated: prev.updated || 0,
  };
}

export function setDayRating(date, rating, scope) {
  const s = scope || 'cal';
  const box = $('dnBox_' + s);
  if (!box) return;
  box.dataset.rating = String(rating);
  const stars = $('dnStars_' + s);
  if (stars) stars.innerHTML = ratingButtonsHTML(date, rating, s);
}

export async function saveDayNoteFromForm(date, scope) {
  const note = readDayNoteFromForm(date, scope);
  const kept = await saveDayNote(note);
  scheduleAutoSync();
  toast(kept ? tr('Zhrnutie dňa uložené') : tr('Prázdne zhrnutie – zápis odstránený'));
  return kept;
}

export async function deleteDayNote(date) {
  const i = state.dayNotes.findIndex(n => n.date === date);
  if (i >= 0) state.dayNotes.splice(i, 1);
  await idbDel('dayNotes', date);
  scheduleAutoSync();
  toast(tr('Zhrnutie dňa vymazané'));
}

/* ---------- záložka Denník ---------- */

function journalEntryHTML(n) {
  const s = dayStats(n.date);
  const dateLabel = n.date.split('-').reverse().join('.');
  const bits = [];
  if (s.count) bits.push(`<span class="${moneyCls(s.net)}">${fmtMoney(s.net)}</span>`);
  bits.push(`${s.count} ${tr(skTradePlural(s.count))}`);
  if (n.mood) bits.push(esc(tr(EMOTIONS[n.mood] || n.mood)));
  const excerpt = [stripHtml(n.text), n.wentWell, n.toImprove]
    .map(x => String(x || '').trim()).filter(Boolean).join(' · ');
  return `<div class="jEntry" data-action="openJournalDay" data-date="${n.date}">
    <div class="jHead">
      <b>${dateLabel}</b>
      ${n.rating ? `<span class="jStars">${ratingStars(n.rating)}</span>` : ''}
      <span class="hint">${bits.join(' · ')}</span>
    </div>
    <div class="jExcerpt">${esc(excerpt.length > 260 ? excerpt.slice(0, 260) + '…' : excerpt)}</div>
  </div>`;
}

export function journalMatches(n, q) {
  if (!q) return true;
  const hay = [n.date, stripHtml(n.text), n.wentWell, n.toImprove, EMOTIONS[n.mood] || n.mood]
    .map(x => String(x || '').toLowerCase()).join(' ');
  return hay.includes(String(q).toLowerCase());
}

export function renderJournal() {
  const box = $('journalList');
  if (!box) return;
  const countEl = $('journalCount');
  const filters = $('journalFilters');

  /* Otvorený deň = písanie. Zámerne bez tabuľky obchodov - v denníku ide o text,
     obchody sú od toho v kalendári a inak by zabrali celú obrazovku. */
  if (state.journalOpenDate) {
    const date = state.journalOpenDate;
    const st = dayStats(date);
    if (countEl) countEl.textContent = '';
    if (filters) filters.style.display = 'none';
    box.innerHTML = `<div class="jEditorHead">
        <button class="btn secondary small" data-action="closeJournalDay">← ${esc(tr('Späť na zoznam'))}</button>
        <b>${date.split('-').reverse().join('.')}</b>
        <span class="hint">${st.count ? `<span class="${moneyCls(st.net)}">${fmtMoney(st.net)}</span> · ` : ''}${st.count} ${tr(skTradePlural(st.count))}</span>
      </div>` + dayNoteEditorHTML(date, 'jr');
    return;
  }

  if (filters) filters.style.display = '';
  const q = state.journalSearch || '';
  const entries = state.dayNotes
    .filter(n => !isDayNoteEmpty(n))
    .filter(n => journalMatches(n, q))
    .sort((a, b) => b.date.localeCompare(a.date));
  if (countEl) countEl.textContent = entries.length ? `${entries.length} ${tr(entries.length === 1 ? 'zápis' : (entries.length < 5 ? 'zápisy' : 'zápisov'))}` : '';
  if (!entries.length) {
    box.innerHTML = `<div class="hint">${esc(q
      ? tr('Žiadny zápis nezodpovedá hľadaniu.')
      : tr('Zatiaľ žiadne zápisy. Klikni na deň v kalendári a napíš zhrnutie – aj v deň, keď si neobchodoval.'))}</div>`;
    return;
  }
  box.innerHTML = entries.map(journalEntryHTML).join('');
}

/** Klik na zápis otvorí písanie priamo v Denníku (bez obchodov, na celú šírku). */
export function openJournalDay(date) {
  state.journalOpenDate = date;
  renderJournal();
  const box = $('journalList');
  if (box && box.scrollIntoView) box.scrollIntoView({ block: 'start' });
}

export function closeJournalDay() {
  state.journalOpenDate = null;
  renderJournal();
}

/** Zápis dňa v tvare pre AI export - null, keď za daný deň nič nie je. */
export function dayNoteForAi(date) {
  const n = dayNoteFor(date);
  if (isDayNoteEmpty(n)) return null;
  return {
    hodnotenieDna: n.rating || null,
    nalada: n.mood ? (EMOTIONS[n.mood] || n.mood) : null,
    coIsloDobre: String(n.wentWell || '').trim() || null,
    coZlepsit: String(n.toImprove || '').trim() || null,
    zhrnutieDna: stripHtml(n.text) || null,
  };
}
