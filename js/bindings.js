import { renderBreakdown } from './ai.js';
import { renderCalendar } from './calendar.js';
import { tr } from './i18n.js';
import { renderOhlcList } from './ohlc-import.js';
import { renderPatterns } from './patterns.js';
import { state } from './state.js';
import { ruleEditRowHTML } from './strategy-notes.js';
import { reportRowHTML, tradeRowHTML } from './trades-list.js';
import { $, debounce } from './utils.js';
import { addAccRow, saveAccounts, switchAccount } from './accounts.js';
import { closeAiChat, exportAiData, getAiInsight, openAiChat, saveAiChatModel, saveAiInsightModel, sendAiChatMessage } from './ai.js';
import { calMove, showDay } from './calendar.js';
import { renderDashboard } from './dashboard.js';
import { gdriveConnect, gdriveDisconnect, gdriveForceDownload, gdriveSyncNow } from './gdrive.js';
import { switchLang } from './i18n.js';
import { convertAndRebuild, doImport } from './import-csv.js';
import { fetchOnline } from './ohlc-fetch.js';
import { delOhlc, goToOhlcCoverage, importOHLC, runOhlcCoverageCheck } from './ohlc-import.js';
import { addMultRow, exportBackup, restoreBackup, saveAnthropicKey, saveMults, wipeAll } from './settings.js';
import { toggleTheme } from './state.js';
import { renderStats } from './stats.js';
import { addDetailRuleRow, addDetailScenarioRow, addStrategyRuleRow, closeStrategy, closeStrategyDetail, deleteCurrentStrategy, goToTradesForHour, openStrategy, openStrategyDetail, renderTradeRuleChecklist, rtApplyColor, rtCloseDropdowns, rtExec, rtFontSizeStep, rtInsertImageFile, rtLink, rtSetFontSize, rtToggleDropdown, ruleDragEnd, ruleDragOver, ruleDragStart, ruleTouchEnd, ruleTouchMove, ruleTouchStart, saveStrategy, saveStrategyNotes, saveStrategyRules, saveStrategyScenarios, showLightbox, switchStrategyDetailTab, toggleStrategyNotesEdit, toggleStrategyRulesEdit, toggleStrategyScenariosEdit } from './strategy-notes.js';
import { toggleMobileNav } from './tabs.js';
import { aiReviewTrade, closeTrade, deleteCurrentTrade, openTrade, saveTrade } from './trade-modal.js';
import { delTrade, renderReports, renderTrades } from './trades-list.js';

export function bindStaticHandlers(){
/* ================= Static event bindings (formerly inline on* attributes) ================= */
document.getElementById('navToggle').addEventListener('click', function(event){ toggleMobileNav(); });
document.getElementById('accSelect').addEventListener('change', function(event){ switchAccount(this.value); });
document.getElementById('btnAddTrade').addEventListener('click', function(event){ openTrade(null); });
document.getElementById('themeToggle').addEventListener('click', function(event){ toggleTheme(); });
document.getElementById('langSelect').addEventListener('change', function(event){ switchLang(this.value); });
document.getElementById('dashPeriod').addEventListener('change', function(event){ renderDashboard(); });
document.getElementById('aiInsightModel').addEventListener('change', function(event){ saveAiInsightModel(); });
document.getElementById('btnAiInsight').addEventListener('click', function(event){ getAiInsight(); });
document.getElementById('btnOpenAiChat').addEventListener('click', function(event){ openAiChat(); });
document.getElementById('btnExportAiData').addEventListener('click', function(event){ exportAiData(); });
document.getElementById('statsPeriod').addEventListener('change', function(event){ renderStats(); });
document.getElementById('calPrevBtn').addEventListener('click', function(event){ calMove(-1); });
document.getElementById('calNextBtn').addEventListener('click', function(event){ calMove(1); });
document.getElementById('fSymbol').addEventListener('change', function(event){ renderTrades(); });
document.getElementById('fDir').addEventListener('change', function(event){ renderTrades(); });
document.getElementById('fSession').addEventListener('change', function(event){ renderTrades(); });
document.getElementById('fStrategy').addEventListener('change', function(event){ renderTrades(); });
document.getElementById('fHour').addEventListener('change', function(event){ renderTrades(); });
document.getElementById('fFrom').addEventListener('change', function(event){ renderTrades(); });
document.getElementById('fTo').addEventListener('change', function(event){ renderTrades(); });
document.getElementById('fSearch').addEventListener('input', debounce(function(event){ renderTrades(); }, 250));
document.getElementById('btnAddStrategy').addEventListener('click', function(event){ openStrategy(null); });
document.getElementById('rSymbol').addEventListener('change', function(event){ renderReports(); });
document.getElementById('rDir').addEventListener('change', function(event){ renderReports(); });
document.getElementById('rSession').addEventListener('change', function(event){ renderReports(); });
document.getElementById('rStrategy').addEventListener('change', function(event){ renderReports(); });
document.getElementById('rFrom').addEventListener('change', function(event){ renderReports(); });
document.getElementById('rTo').addEventListener('change', function(event){ renderReports(); });
document.getElementById('rSearch').addEventListener('input', debounce(function(event){ renderReports(); }, 250));
document.getElementById('btnConvertRebuild').addEventListener('click', function(event){ convertAndRebuild(); });
document.getElementById('btnMapManually').addEventListener('click', function(event){ $('brokerConvertBox').style.display='none'; });
document.getElementById('btnDoImport').addEventListener('click', function(event){ doImport(); });
document.getElementById('btnFetchOnline').addEventListener('click', function(event){ fetchOnline(); });
document.getElementById('btnImportOhlc').addEventListener('click', function(event){ importOHLC(); });
document.getElementById('btnOhlcCoverageCheck').addEventListener('click', function(event){ runOhlcCoverageCheck(); });
document.getElementById('btnAddAccRow').addEventListener('click', function(event){ addAccRow('',0,null); });
document.getElementById('btnSaveAccounts').addEventListener('click', function(event){ saveAccounts(); });
document.getElementById('btnAddMultRow').addEventListener('click', function(event){ addMultRow('',1); });
document.getElementById('btnSaveMults').addEventListener('click', function(event){ saveMults(); });
document.getElementById('gdriveConnectBtn').addEventListener('click', function(event){ gdriveConnect(); });
document.getElementById('gdriveDisconnectBtn').addEventListener('click', function(event){ gdriveDisconnect(); });
document.getElementById('btnGdriveSyncNow').addEventListener('click', function(event){ gdriveSyncNow(false); });
document.getElementById('btnGdriveForceDownload').addEventListener('click', function(event){ gdriveForceDownload(); });
document.getElementById('btnSaveAnthropicKey').addEventListener('click', function(event){ saveAnthropicKey(); });
document.getElementById('btnExportBackup').addEventListener('click', function(event){ exportBackup(); });
document.getElementById('restoreFile').addEventListener('change', function(event){ restoreBackup(this); });
document.getElementById('btnWipeAll').addEventListener('click', function(event){ wipeAll(); });
document.getElementById('tStrategy').addEventListener('change', function(event){ renderTradeRuleChecklist(); });
document.getElementById('tAiReviewBtn').addEventListener('click', function(event){ aiReviewTrade(); });
document.getElementById('tDelete').addEventListener('click', function(event){ deleteCurrentTrade(); });
document.getElementById('btnCloseTrade').addEventListener('click', function(event){ closeTrade(); });
document.getElementById('btnSaveTrade').addEventListener('click', function(event){ saveTrade(); });
document.getElementById('btnAddStrategyRuleRow').addEventListener('click', function(event){ addStrategyRuleRow(''); });
document.getElementById('stDelete').addEventListener('click', function(event){ deleteCurrentStrategy(); });
document.getElementById('btnCloseStrategy').addEventListener('click', function(event){ closeStrategy(); });
document.getElementById('btnSaveStrategy').addEventListener('click', function(event){ saveStrategy(); });
document.getElementById('lightbox').addEventListener('click', function(event){ this.classList.remove('open'); });
document.getElementById('aiChatModel').addEventListener('change', function(event){ saveAiChatModel(); });
document.getElementById('aiChatInput').addEventListener('keydown', function(event){ if(event.key==='Enter')sendAiChatMessage(); });
document.getElementById('btnAiChatSend').addEventListener('click', function(event){ sendAiChatMessage(); });
document.getElementById('btnCloseAiChat').addEventListener('click', function(event){ closeAiChat(); });

/* ================= Delegated bindings for dynamically-rendered markup ================= */
/* "✕ remove row" buttons rendered by addAccRow()/addMultRow() (accounts.js, settings.js) */
document.addEventListener('click', function(event){
  const btn = event.target.closest('[data-action="removeRow"]');
  if (btn) btn.closest('.multrow').remove();
});

/* dashboard "podľa hodiny vstupu" rows (ai.js renderBreakdown) */
document.getElementById('byHour').addEventListener('click', function(event){
  const row = event.target.closest('tr[data-hour]');
  if (row) goToTradesForHour(row.dataset.hour);
});

/* calendar day cells (calendar.js renderCalendar) */
document.getElementById('calGrid').addEventListener('click', function(event){
  const cell = event.target.closest('[data-day]');
  if (cell) showDay(cell.dataset.day);
});

/* OHLC dataset "Vymazať" buttons (ohlc-import.js renderOhlcList) */
document.getElementById('ohlcList').addEventListener('click', function(event){
  const btn = event.target.closest('[data-action="delOhlc"]');
  if (btn) delOhlc(btn.dataset.key);
});

/* dashboard patterns "Zobraziť detaily chýbajúcich dát" link (patterns.js renderPatterns) */
document.getElementById('patternsSub').addEventListener('click', function(event){
  const link = event.target.closest('[data-action="goToOhlcCoverage"]');
  if (link) goToOhlcCoverage();
});

/* trades table rows + delete button (trades-list.js tradeRowHTML) */
document.getElementById('tradesBody').addEventListener('click', function(event){
  const delBtn = event.target.closest('[data-action="delTrade"]');
  if (delBtn) { delTrade(parseInt(delBtn.dataset.id, 10)); return; }
  const row = event.target.closest('tr[data-trade-id]');
  if (row) openTrade(parseInt(row.dataset.tradeId, 10));
});

/* reports table rows (trades-list.js reportRowHTML) */
document.getElementById('reportsBody').addEventListener('click', function(event){
  const row = event.target.closest('tr[data-trade-id]');
  if (row) openTrade(parseInt(row.dataset.tradeId, 10));
});

/* ================= Strategies + rich-text notes toolbar (strategy-notes.js) ================= */
/* #strategyCards renders both the strategy card grid AND the strategy detail view
   (list, rules editor with drag&drop, notes editor with rt toolbar, scenarios), so a
   single set of delegated listeners here covers all of it. */
(function () {
  const box = document.getElementById('strategyCards');

  box.addEventListener('mousedown', function (event) {
    if (event.target.closest('#rtHeadingSel')) { event.stopPropagation(); return; }
    if (event.target.closest('.rtToolbar button, .rtColorRow')) event.preventDefault();
  });

  box.addEventListener('click', function (event) {
    const el = event.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;
    switch (action) {
      case 'openStrategyDetail': openStrategyDetail(parseInt(el.dataset.id, 10)); break;
      case 'openStrategy': openStrategy(parseInt(el.dataset.id, 10)); break;
      case 'closeStrategyDetail': closeStrategyDetail(); break;
      case 'switchStrategyDetailTab': switchStrategyDetailTab(el.dataset.tab); break;
      case 'toggleStrategyRulesEdit': toggleStrategyRulesEdit(); break;
      case 'addDetailRuleRow': addDetailRuleRow(''); break;
      case 'saveStrategyRules': saveStrategyRules(parseInt(el.dataset.id, 10)); break;
      case 'removeRuleRow': el.closest('.ruleRow').remove(); break;
      case 'toggleStrategyNotesEdit': toggleStrategyNotesEdit(); break;
      case 'saveStrategyNotes': saveStrategyNotes(parseInt(el.dataset.id, 10)); break;
      case 'toggleStrategyScenariosEdit': toggleStrategyScenariosEdit(); break;
      case 'addDetailScenarioRow': addDetailScenarioRow(parseInt(el.dataset.id, 10)); break;
      case 'saveStrategyScenarios': saveStrategyScenarios(parseInt(el.dataset.id, 10)); break;
      case 'removeScenarioRow': el.closest('.scenarioRow').remove(); break;
      case 'showLightbox': showLightbox(el.dataset.url); break;
      case 'openTrade': openTrade(parseInt(el.dataset.id, 10)); break;
      case 'rtExec': rtExec(el.dataset.cmd); break;
      case 'rtExecClose': rtExec(el.dataset.cmd); rtCloseDropdowns(); break;
      case 'rtLink': rtLink(); break;
      case 'rtFontSizeStep': rtFontSizeStep(parseInt(el.dataset.delta, 10)); break;
      case 'rtToggleDropdown': rtToggleDropdown(el.dataset.target, event); break;
      case 'clickImgFile': document.getElementById('rtImgFile').click(); break;
      case 'rtApplyColor': rtApplyColor(el.dataset.cmd, el.dataset.val); break;
      case 'openCustomColor': document.getElementById('rtCustomColor_' + el.dataset.kind).click(); break;
    }
  });

  box.addEventListener('change', function (event) {
    const t = event.target;
    if (t.id === 'rtHeadingSel') rtExec('formatBlock', t.value);
    else if (t.id === 'rtFontNameSel') rtExec('fontName', t.value);
    else if (t.id === 'rtFontSizeBox') rtSetFontSize(t.value);
    else if (t.id === 'rtImgFile') { rtInsertImageFile(t.files); t.value = ''; }
    else if (t.id === 'rtCustomColor_fg' || t.id === 'rtCustomColor_bg') rtApplyColor(t.dataset.cmd, t.value);
  });

  /* drag & drop / touch reordering of strategy detail rule rows (ruleEditRowHTML) */
  box.addEventListener('dragover', function (event) { ruleDragOver(event); });
  box.addEventListener('drop', function (event) { if (event.target.closest('.ruleRow')) event.preventDefault(); });
  box.addEventListener('dragstart', function (event) { ruleDragStart(event); });
  box.addEventListener('dragend', function (event) { ruleDragEnd(event); });
  box.addEventListener('touchstart', function (event) { ruleTouchStart(event); }, { passive: false });
  box.addEventListener('touchmove', function (event) { ruleTouchMove(event); }, { passive: false });
  box.addEventListener('touchend', function (event) { ruleTouchEnd(event); });
  box.addEventListener('touchcancel', function (event) { ruleTouchEnd(event); });
})();

/* "✕" remove-rule button inside the plain Strategy modal (#stRules, addStrategyRuleRow) */
document.getElementById('stRules').addEventListener('click', function (event) {
  const btn = event.target.closest('[data-action="removeRuleRow"]');
  if (btn) btn.closest('.ruleRow').remove();
});

}
