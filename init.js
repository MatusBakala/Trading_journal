'use strict';
/* ================= Init ================= */
async function init(){
  await idbOpen();
  const s=await idbGet('kv','settings');
  if(s&&s.v){settings.balance=s.v.balance||0;settings.mults=Object.assign({},settings.mults,s.v.mults||{});
    if(s.v.multsExact)settings.mults=s.v.mults;
    if(s.v.accounts&&s.v.accounts.length)settings.accounts=s.v.accounts;
    if(s.v.activeAccount!=null)settings.activeAccount=s.v.activeAccount;
    if(s.v.lang)settings.lang=s.v.lang;
    if(s.v.theme)settings.theme=s.v.theme;
    if(s.v.gClientId)settings.gClientId=s.v.gClientId;
    settings.gConnected=!!s.v.gConnected;
    settings.gLastSync=s.v.gLastSync||null;
    if(s.v.anthropicKey)settings.anthropicKey=s.v.anthropicKey;
    if(s.v.aiChatModel)settings.aiChatModel=s.v.aiChatModel;
    if(s.v.aiInsightModel)settings.aiInsightModel=s.v.aiInsightModel;}
  applyTheme();
  // migrácia: starý settings.balance -> prvý účet
  if(settings.accounts.length===1&&!settings.accounts[0].balance&&settings.balance)settings.accounts[0].balance=settings.balance;
  if(settings.activeAccount!=='all'&&!settings.accounts.some(a=>a.id===settings.activeAccount))settings.activeAccount=settings.accounts[0].id;
  trades=await idbAll('trades');
  ohlcSets=await idbAll('ohlc');
  strategies=await idbAll('strategies');
  await seedDefaultStrategies();
  renderAll();
  bindGlobal();
  $('langSelect').value=settings.lang||'sk';
  document.documentElement.lang=settings.lang||'sk';
  if(settings.lang==='en'){i18nBusy=true;translateDOM(document.body,'fwd');i18nBusy=false;}
  gBootDone=true;
  if(settings.gConnected&&settings.gClientId){
    setTimeout(()=>{gdriveSyncNow(true).catch(e=>console.error('Initial Drive sync failed',e));},1000);
  }
}
function saveSettings(){return idbPut('kv',{k:'settings',v:{balance:settings.balance,mults:settings.mults,multsExact:true,accounts:settings.accounts,activeAccount:settings.activeAccount,lang:settings.lang,theme:settings.theme,gClientId:settings.gClientId,gConnected:settings.gConnected,gLastSync:settings.gLastSync,anthropicKey:settings.anthropicKey,aiChatModel:settings.aiChatModel,aiInsightModel:settings.aiInsightModel}});}
function renderAll(){renderAccSelects();renderDashboard();renderStats();renderCalendar();renderTrades();renderReports();renderOhlcList();renderSettings();refreshSymbolFilter();renderStrategies();}
