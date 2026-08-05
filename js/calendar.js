import { fmtMoney, moneyCls } from './utils.js';
import { accTrades } from './accounts.js';
import { state } from './state.js';
import { tr } from './i18n.js';
import { excursionFor, riskR, tTime } from './strategy-notes.js';
import { tradeTableHTML } from './trades-list.js';
import { $, computePnl, dayKey, emotionLabel, sessionOf, toast, tsToLocalInput } from './utils.js';

/* ================= Calendar ================= */
export function calMove(d){state.calDate=new Date(state.calDate.getFullYear(),state.calDate.getMonth()+d,1);state.calSelectedDay=null;renderCalendar();}
export function renderCalendar(){
  const y=state.calDate.getFullYear(),m=state.calDate.getMonth();
  const months=['Január','Február','Marec','Apríl','Máj','Jún','Júl','August','September','Október','November','December'];
  $('calMonthName').textContent=tr(months[m]+' '+y);
  const daily={};
  accTrades().forEach(t=>{const k=dayKey(tTime(t));(daily[k]=daily[k]||{pnl:0,n:0});daily[k].pnl+=computePnl(t);daily[k].n++;});
  const first=new Date(y,m,1);
  let startDow=(first.getDay()+6)%7; // Monday first
  const dim=new Date(y,m+1,0).getDate();
  const dows=['Po','Ut','St','Št','Pi','So','Ne'];
  let html=dows.map(d=>`<div class="dow">${tr(d)}</div>`).join('');
  for(let i=0;i<startDow;i++)html+='<div class="day other"></div>';
  let monthTotal=0;
  for(let d=1;d<=dim;d++){
    const k=y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    const info=daily[k];
    let cls='day',inner=`<div class="dn">${d}</div>`;
    if(info){monthTotal+=info.pnl;
      cls+=' has '+(info.pnl>0?'win':(info.pnl<0?'loss':''));
      inner+=`<div class="dp ${moneyCls(info.pnl)}">${fmtMoney(info.pnl)}</div><div class="dc">${info.n} ${tr(info.n===1?'obchod':(info.n<5?'obchody':'obchodov'))}</div>`;
    }
    html+=`<div class="${cls}" ${info?`data-day="${k}"`:''}>${inner}</div>`;
  }
  $('calGrid').innerHTML=html;
  $('calTotal').innerHTML=`${tr('Mesiac:')} <span class="${moneyCls(monthTotal)}">${fmtMoney(monthTotal)}</span>`;
  // panel s obchodmi dňa musí prežiť prekreslenie kalendára - úprava aj zmazanie
  // obchodu priamo z neho volá renderCalendar(), inak by zoznam zakaždým zmizol
  if(state.calSelectedDay&&daily[state.calSelectedDay])showDay(state.calSelectedDay);
  else{state.calSelectedDay=null;$('calDayPanel').style.display='none';}
}
export function showDay(k){
  const dayTrades=accTrades().filter(t=>dayKey(tTime(t))===k).sort((a,b)=>tTime(a)-tTime(b));
  const p=$('calDayPanel');
  if(!dayTrades.length){state.calSelectedDay=null;p.style.display='none';return;}
  state.calSelectedDay=k;
  p.style.display='block';
  p.innerHTML=`<h3>${tr('Obchody')} ${k.split('-').reverse().join('.')} `+
    `<button type="button" class="btn secondary small" data-action="exportDay" data-day="${k}" style="margin-left:8px">📥 ${tr('Export JSON pre AI')}</button></h3>`+
    tradeTableHTML(dayTrades);
}
/* Súhrn jedného dňa ako čistý JSON - na voľné vloženie do AI chatu (claude.ai a pod.)
   bez potreby vlastného API kľúča, na rozdiel od exportAiData() v ai.js, ktorý posiela
   agregovaný súhrn za celé filtrované obdobie cez API. Tu ide o surové obchody len za
   jeden konkrétny deň. */
export function dayTradeToJson(t){
  const xRaw=excursionFor(t);
  const x=xRaw&&!xRaw.mismatch?xRaw:null;
  return {
    id:t.id,symbol:String(t.symbol||'').toUpperCase(),
    dir:t.dir===1?'long':'short',
    qty:t.qty??1,
    entry:isFinite(t.entry)?t.entry:null,
    exit:isFinite(t.exit)?t.exit:null,
    tEntry:t.tEntry?tsToLocalInput(t.tEntry):null,
    tExit:t.tExit?tsToLocalInput(t.tExit):null,
    stop:t.stop??null,target:t.target??null,
    fees:t.fees||0,
    pnl:+computePnl(t).toFixed(2),
    r:riskR(t),
    mae:x?+x.maeMoney.toFixed(2):null,
    mfe:x?+x.mfeMoney.toFixed(2):null,
    scaled:!!((t.entryLegs&&t.entryLegs.length>1)||(t.exitLegs&&t.exitLegs.length>1)),
    session:sessionOf(t),
    emotionIn:emotionLabel(t.emotionIn),emotionOut:emotionLabel(t.emotionOut),
    tags:t.tags||[],tagsNeg:t.tagsNeg||[],
    notes:t.notes||'',
  };
}
export function exportDayJson(k){
  const dayTrades=accTrades().filter(t=>dayKey(tTime(t))===k).sort((a,b)=>tTime(a)-tTime(b));
  if(!dayTrades.length)return;
  const pnls=dayTrades.map(computePnl);
  const net=pnls.reduce((a,b)=>a+b,0);
  const wins=pnls.filter(p=>p>0).length;
  const payload={
    date:k,
    netPnl:+net.toFixed(2),
    tradeCount:dayTrades.length,
    winCount:wins,lossCount:pnls.filter(p=>p<0).length,
    winRatePct:+(wins/dayTrades.length*100).toFixed(1),
    trades:dayTrades.map(dayTradeToJson),
  };
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='trading-journal-'+k+'.json';
  a.click();
  toast(tr('JSON pre deň')+' '+k+' '+tr('stiahnutý – vlož ho do claude.ai alebo iného AI chatu'));
}
