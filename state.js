'use strict';
/* ================= State ================= */
let trades=[];
let strategies=[];
let currentStrategyId=null;
let strategyDetailId=null;
let strategyDetailTab='rules';
let settings={lang:'sk',theme:'dark',balance:0,accounts:[{id:1,name:'Účet 1',balance:0}],activeAccount:1,mults:{NQ:20,MNQ:2,ES:50,MES:5,YM:5,MYM:0.5,RTY:50,M2K:5,GC:100,MGC:10,SI:5000,SIL:1000,CL:1000,MCL:100,NG:10000,XAUUSD:100,XAGUSD:5000},gClientId:'',gConnected:false,gLastSync:null,anthropicKey:'',aiChatModel:'claude-sonnet-5',aiInsightModel:'claude-haiku-4-5-20251001'};
function cssVar(name){return getComputedStyle(document.documentElement).getPropertyValue(name).trim();}
function applyTheme(){
  document.documentElement.dataset.theme=settings.theme==='light'?'light':'dark';
  const btn=$('themeToggle');
  if(btn)btn.textContent=settings.theme==='light'?'☀️':'🌙';
}
function toggleTheme(){
  settings.theme=settings.theme==='light'?'dark':'light';
  applyTheme();
  if(gBootDone)renderDashboard();
  saveSettings();
  scheduleAutoSync();
}
let ohlcSets=[];
let calDate=new Date();
let eqChartObj=null,dailyChartObj=null;
let currentTradeId=null,pendingShots=[],removedShotIds=[],modalChart=null,modalChartTf=null,modalChartRsi=null,modalSyncing=false;
let modalIndicators={sma:false,smaPeriod:20,ema:false,emaPeriod:50,vwap:false,rsi:false,rsiPeriod:14};
