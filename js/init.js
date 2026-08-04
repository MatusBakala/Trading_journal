import { renderAccSelects } from './accounts.js';
import { renderCalendar } from './calendar.js';
import { renderDashboard } from './dashboard.js';
import { idbAll, idbGet, idbOpen, idbPut } from './db.js';
import { gdriveLoadSyncState, gdriveSyncNow } from './gdrive.js';
import { translateDOM, withI18nBusy } from './i18n.js';
import { renderOhlcList } from './ohlc-import.js';
import { renderSettings } from './settings.js';
import { applyTheme, state } from './state.js';
import { renderStats } from './stats.js';
import { renderStrategies, seedDefaultStrategies } from './strategy-notes.js';
import { bindGlobal } from './trade-modal.js';
import { refreshSymbolFilter, renderReports, renderTrades } from './trades-list.js';
import { $ } from './utils.js';

/* ================= Init ================= */
export async function init(){
  await idbOpen();
  const s=await idbGet('kv','settings');
  if(s&&s.v){state.settings.balance=s.v.balance||0;state.settings.mults=Object.assign({},state.settings.mults,s.v.mults||{});
    if(s.v.multsExact)state.settings.mults=s.v.mults;
    if(s.v.accounts&&s.v.accounts.length)state.settings.accounts=s.v.accounts;
    if(s.v.activeAccount!=null)state.settings.activeAccount=s.v.activeAccount;
    if(s.v.lang)state.settings.lang=s.v.lang;
    if(s.v.theme)state.settings.theme=s.v.theme;
    if(s.v.maxRiskPerTradePct!=null)state.settings.maxRiskPerTradePct=s.v.maxRiskPerTradePct;
    if(s.v.maxDailyLossPct!=null)state.settings.maxDailyLossPct=s.v.maxDailyLossPct;
    if(s.v.gClientId)state.settings.gClientId=s.v.gClientId;
    state.settings.gConnected=!!s.v.gConnected;
    state.settings.gLastSync=s.v.gLastSync||null;
    if(s.v.anthropicKey)state.settings.anthropicKey=s.v.anthropicKey;
    if(s.v.aiChatModel)state.settings.aiChatModel=s.v.aiChatModel;
    if(s.v.aiInsightModel)state.settings.aiInsightModel=s.v.aiInsightModel;}
  applyTheme();
  // migrácia: starý settings.balance -> prvý účet
  if(state.settings.accounts.length===1&&!state.settings.accounts[0].balance&&state.settings.balance)state.settings.accounts[0].balance=state.settings.balance;
  if(state.settings.activeAccount!=='all'&&!state.settings.accounts.some(a=>a.id===state.settings.activeAccount))state.settings.activeAccount=state.settings.accounts[0].id;
  state.trades=await idbAll('trades');
  state.ohlcSets=await idbAll('ohlc');
  state.strategies=await idbAll('strategies');
  // musí byť pred seedDefaultStrategies() - to samo značku prepisuje
  await gdriveLoadSyncState();
  await seedDefaultStrategies();
  renderAll();
  bindGlobal();
  $('langSelect').value=state.settings.lang||'sk';
  document.documentElement.lang=state.settings.lang||'sk';
  if(state.settings.lang==='en')withI18nBusy(()=>translateDOM(document.body,'fwd'));
  state.gBootDone=true;
  if(state.settings.gConnected&&state.settings.gClientId){
    setTimeout(()=>{gdriveSyncNow(true).catch(e=>console.error('Initial Drive sync failed',e));},1000);
  }
}
export function saveSettings(){return idbPut('kv',{k:'settings',v:{balance:state.settings.balance,mults:state.settings.mults,multsExact:true,accounts:state.settings.accounts,activeAccount:state.settings.activeAccount,lang:state.settings.lang,theme:state.settings.theme,maxRiskPerTradePct:state.settings.maxRiskPerTradePct,maxDailyLossPct:state.settings.maxDailyLossPct,gClientId:state.settings.gClientId,gConnected:state.settings.gConnected,gLastSync:state.settings.gLastSync,anthropicKey:state.settings.anthropicKey,aiChatModel:state.settings.aiChatModel,aiInsightModel:state.settings.aiInsightModel}});}
export function renderAll(){renderAccSelects();renderDashboard();renderStats();renderCalendar();renderTrades();renderReports();renderOhlcList();renderSettings();refreshSymbolFilter();renderStrategies();}
/* Užšia verzia renderAll() pre zmeny tradov/P&L - vynecháva účty/OHLC/nastavenia, ktoré nie sú dotknuté. */
export function renderAfterTradeChange(){renderDashboard();renderStats();renderCalendar();renderTrades();renderReports();renderStrategies();refreshSymbolFilter();}
