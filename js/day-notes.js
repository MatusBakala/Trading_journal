import { accTrades } from './accounts.js';
import { idbAll, idbDel, idbPut } from './db.js';
import { scheduleAutoSync } from './gdrive.js';
import { tr } from './i18n.js';
import { state } from './state.js';
import { tTime } from './strategy-notes.js';
import { goToTab } from './tabs.js';
import { $, computePnl, dayKey, esc, EMOTIONS, fmtMoney, moneyCls, toast } from './utils.js';

/* ================= Denník dňa (zhrnutie celého dňa, nielen jednotlivých obchodov) =================
   Zápis je vedený na dátum ('YYYY-MM-DD'), nie na obchod - preto sa dá napísať aj v deň,
   keď si neobchodoval (a presne to je často to najcennejšie: prečo som nešiel do trhu).
   Editovať sa dá v kalendári pri konkrétnom dni, záložka "Denník" slúži na listovanie
   a vyhľadávanie naprieč všetkými zápismi. */

export const DAY_RATINGS = [1, 2, 3, 4, 5];

/** Prázdny zápis - jediné miesto, kde je definovaný tvar záznamu. */
export function emptyDayNote(date) {
  return { date, rating: 0, mood: '', wentWell: '', toImprove: '', text: '', updated: 0 };
}

export function dayNoteFor(date) {
  return state.dayNotes.find(n => n.date === date) || null;
}

/** Zápis je "prázdny" (nemá zmysel ho držať), keď v ňom nie je vôbec nič vyplnené. */
export function isDayNoteEmpty(n) {
  if (!n) return true;
  return !n.rating && !n.mood && !String(n.wentWell || '').trim() &&
    !String(n.toImprove || '').trim() && !String(n.text || '').trim();
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

/* ---------- editor v kalendári ---------- */

function moodOptions(sel) {
  const opts = ['<option value="">–</option>'];
  for (const [k, label] of Object.entries(EMOTIONS)) {
    opts.push(`<option value="${k}"${k === sel ? ' selected' : ''}>${esc(tr(label))}</option>`);
  }
  return opts.join('');
}

function ratingButtonsHTML(date, rating) {
  return DAY_RATINGS.map(r =>
    `<button type="button" class="dnStar${r <= rating ? ' on' : ''}" data-action="setDayRating" data-date="${date}" data-rating="${r}" title="${r}/5">★</button>`
  ).join('') +
    `<button type="button" class="dnStarClear" data-action="setDayRating" data-date="${date}" data-rating="0" title="${esc(tr('Zrušiť hodnotenie'))}">✕</button>`;
}

/** Editor zhrnutia dňa - vkladá sa pod tabuľku obchodov v paneli dňa v kalendári. */
export function dayNoteEditorHTML(date) {
  const n = dayNoteFor(date) || emptyDayNote(date);
  return `<div class="dayNote" id="dayNoteBox" data-date="${date}">
    <h3 style="margin-bottom:10px">📓 ${esc(tr('Zhrnutie dňa'))}</h3>
    <div class="dnGrid">
      <label class="f">${esc(tr('Hodnotenie dňa'))}
        <div class="dnStars" id="dnStars">${ratingButtonsHTML(date, n.rating || 0)}</div>
      </label>
      <label class="f">${esc(tr('Nálada / psychika'))}
        <select id="dnMood">${moodOptions(n.mood || '')}</select>
      </label>
    </div>
    <div class="dnGrid">
      <label class="f">${esc(tr('Čo išlo dobre'))}
        <textarea id="dnWentWell" rows="3" placeholder="${esc(tr('Čo sa dnes podarilo, čo zopakovať...'))}">${esc(n.wentWell || '')}</textarea>
      </label>
      <label class="f">${esc(tr('Čo zlepšiť'))}
        <textarea id="dnToImprove" rows="3" placeholder="${esc(tr('Chyby, na čo si dať pozor nabudúce...'))}">${esc(n.toImprove || '')}</textarea>
      </label>
    </div>
    <label class="f">${esc(tr('Zhrnutie dňa (voľný text)'))}
      <textarea id="dnText" rows="8" placeholder="${esc(tr('Ako vyzeral trh, ako som sa cítil, čo som robil mimo obchodov, čo ma ovplyvnilo...'))}">${esc(n.text || '')}</textarea>
    </label>
    <div style="display:flex;gap:8px;align-items:center;margin-top:12px">
      <button class="btn small" data-action="saveDayNote" data-date="${date}">${esc(tr('Uložiť zhrnutie'))}</button>
      ${hasDayNote(date) ? `<button class="btn secondary small" data-action="deleteDayNote" data-date="${date}">${esc(tr('Vymazať zhrnutie'))}</button>` : ''}
      <span class="hint" id="dnSavedHint">${n.updated ? esc(tr('Uložené') + ' ' + new Date(n.updated).toLocaleString(state.settings.lang === 'en' ? 'en-GB' : 'sk-SK')) : ''}</span>
    </div>
  </div>`;
}

/** Prečíta rozpísaný zápis z DOM (hviezdičky sú v data atribúte, zvyšok v poliach). */
export function readDayNoteFromForm(date) {
  const box = $('dayNoteBox');
  const prev = dayNoteFor(date) || emptyDayNote(date);
  if (!box) return prev;
  return {
    date,
    rating: Number(box.dataset.rating != null && box.dataset.rating !== '' ? box.dataset.rating : (prev.rating || 0)) || 0,
    mood: ($('dnMood') || {}).value || '',
    wentWell: ($('dnWentWell') || {}).value || '',
    toImprove: ($('dnToImprove') || {}).value || '',
    text: ($('dnText') || {}).value || '',
    updated: prev.updated || 0,
  };
}

export function setDayRating(date, rating) {
  const box = $('dayNoteBox');
  if (!box) return;
  box.dataset.rating = String(rating);
  const stars = $('dnStars');
  if (stars) stars.innerHTML = ratingButtonsHTML(date, rating);
}

export async function saveDayNoteFromForm(date) {
  const note = readDayNoteFromForm(date);
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
  const excerpt = [n.text, n.wentWell, n.toImprove].map(x => String(x || '').trim()).filter(Boolean).join(' · ');
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
  const hay = [n.date, n.text, n.wentWell, n.toImprove, EMOTIONS[n.mood] || n.mood]
    .map(x => String(x || '').toLowerCase()).join(' ');
  return hay.includes(String(q).toLowerCase());
}

export function renderJournal() {
  const box = $('journalList');
  if (!box) return;
  const q = state.journalSearch || '';
  const entries = state.dayNotes
    .filter(n => !isDayNoteEmpty(n))
    .filter(n => journalMatches(n, q))
    .sort((a, b) => b.date.localeCompare(a.date));
  const countEl = $('journalCount');
  if (countEl) countEl.textContent = entries.length ? `${entries.length} ${tr(entries.length === 1 ? 'zápis' : (entries.length < 5 ? 'zápisy' : 'zápisov'))}` : '';
  if (!entries.length) {
    box.innerHTML = `<div class="hint">${esc(q
      ? tr('Žiadny zápis nezodpovedá hľadaniu.')
      : tr('Zatiaľ žiadne zápisy. Klikni na deň v kalendári a napíš zhrnutie – aj v deň, keď si neobchodoval.'))}</div>`;
    return;
  }
  box.innerHTML = entries.map(journalEntryHTML).join('');
}

/** Klik na zápis v denníku prepne do kalendára na ten mesiac a deň otvorí. */
export function openJournalDay(date) {
  const [y, m] = date.split('-').map(Number);
  state.calDate = new Date(y, m - 1, 1);
  state.calSelectedDay = date;
  goToTab('calendar');
  // renderCalendar() je importovaný lenivo, aby tento modul nezaťahoval kalendár
  import('./calendar.js').then(({ renderCalendar }) => {
    renderCalendar();
    const box = $('dayNoteBox');
    if (box) box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
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
    zhrnutieDna: String(n.text || '').trim() || null,
  };
}
