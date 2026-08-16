import { fmtMoney, moneyCls } from './utils.js';
import { accTrades } from './accounts.js';
import { dayNoteEditorHTML, dayNoteForAi, hasDayNote } from './day-notes.js';
import { state } from './state.js';
import { tr } from './i18n.js';
import { excursionFor, riskR, riskStop, tTime } from './strategy-notes.js';
import { tradeTableHTML } from './trades-list.js';
import { $, computePnl, dayKey, emotionLabel, esc, sessionOf, toast, tsToLocalInput } from './utils.js';

/* ================= Calendar ================= */
export function calMove(d){state.calDate=new Date(state.calDate.getFullYear(),state.calDate.getMonth()+d,1);state.calSelectedDay=null;renderCalendar();}

function buildDailyStats(){
  const daily={};
  accTrades().forEach(t=>{
    const k=dayKey(tTime(t));
    if(!daily[k])daily[k]={pnl:0,n:0,wins:0};
    const pnl=computePnl(t);
    daily[k].pnl+=pnl;
    daily[k].n++;
    if(pnl>0)daily[k].wins++;
  });
  return daily;
}

function trTradeCount(n){
  return `${n} ${tr(n===1?'obchod':(n<5?'obchody':'obchodov'))}`;
}

function trDayCount(n){
  if(state.settings.lang==='en')return n===1?'1 day':`${n} days`;
  return n===1?'1 deň':`${n} dní`;
}

function dayKeyFor(y,m,d){
  return y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
}

/* 📓 značka = za daný deň existuje zápis v denníku. Deň je klikateľný VŽDY, aj bez
   obchodov - zhrnutie sa dá napísať aj v deň, keď si zámerne neobchodoval. */
function dayNoteMarkHtml(k){
  return hasDayNote(k)?`<div class="dnMark" title="${esc(tr('Deň má zhrnutie'))}">📓</div>`:'';
}

function dayCellHtml(d,k,info){
  let cls='day has';
  cls+=info.pnl>0?' win':(info.pnl<0?' loss':'');
  const winPct=info.n?+(info.wins/info.n*100).toFixed(1):0;
  return `<div class="${cls}" data-day="${k}">`+
    `<div class="dn">${d}</div>`+
    dayNoteMarkHtml(k)+
    `<div class="dp ${moneyCls(info.pnl)}">${fmtMoney(info.pnl)}</div>`+
    `<div class="dc">${trTradeCount(info.n)}</div>`+
    `<div class="dw">${winPct}%</div>`+
    `</div>`;
}

function emptyDayHtml(d,k){
  return `<div class="day empty" data-day="${k}"><div class="dn">${d}</div>${dayNoteMarkHtml(k)}</div>`;
}

function weekSumHtml(weekNum,weekPnl,weekDays){
  if(!weekDays){
    return `<div class="cal-week-sum empty"><span class="cw-label">${tr('Týždeň')} ${weekNum}</span></div>`;
  }
  const cls=weekPnl>0?'win':(weekPnl<0?'loss':'');
  return `<div class="cal-week-sum ${cls}">`+
    `<span class="cw-label">${tr('Týždeň')} ${weekNum}</span>`+
    `<span class="cw-pnl ${moneyCls(weekPnl)}">${fmtMoney(weekPnl)}</span>`+
    `<span class="cw-days">${trDayCount(weekDays)}</span>`+
    `</div>`;
}

export function renderCalendar(){
  const grid=$('calGrid');
  const monthEl=$('calMonthName');
  const totalEl=$('calTotal');
  if(!grid||!monthEl||!totalEl)return;

  const y=state.calDate.getFullYear(),m=state.calDate.getMonth();
  const months=['Január','Február','Marec','Apríl','Máj','Jún','Júl','August','September','Október','November','December'];
  monthEl.textContent=tr(months[m]+' '+y);
  const daily=buildDailyStats();
  const startDow=(new Date(y,m,1).getDay()+6)%7; // Monday first
  const dim=new Date(y,m+1,0).getDate();
  const dows=['Po','Ut','St','Št','Pi','So','Ne'];

  const cells=[];
  for(let i=0;i<startDow;i++)cells.push({type:'pad'});
  for(let d=1;d<=dim;d++){
    const k=dayKeyFor(y,m,d);
    cells.push({type:'day',d,k,info:daily[k]});
  }
  while(cells.length%7!==0)cells.push({type:'pad'});

  let html='<div class="cal-dow-row"><div class="cal-week-days">';
  html+=dows.map(d=>`<div class="dow">${tr(d)}</div>`).join('');
  html+='</div><div class="dow dow-week" aria-hidden="true"></div></div>';

  let monthTotal=0;
  let weekNum=0;
  for(let i=0;i<cells.length;i+=7){
    weekNum++;
    let weekPnl=0,weekDays=0;
    let daysHtml='';
    for(let j=0;j<7;j++){
      const c=cells[i+j];
      if(c.type==='day'&&c.info){
        monthTotal+=c.info.pnl;
        weekPnl+=c.info.pnl;
        weekDays++;
        daysHtml+=dayCellHtml(c.d,c.k,c.info);
      }else if(c.type==='day'){
        daysHtml+=emptyDayHtml(c.d,c.k);
      }else{
        daysHtml+='<div class="day other"></div>';
      }
    }
    html+=`<div class="cal-week-row"><div class="cal-week-days">${daysHtml}</div>${weekSumHtml(weekNum,weekPnl,weekDays)}</div>`;
  }

  grid.innerHTML=html;
  totalEl.innerHTML=`${tr('Mesiac:')} <span class="${moneyCls(monthTotal)}">${fmtMoney(monthTotal)}</span>`;

  const panel=$('calDayPanel');
  if(state.calSelectedDay)showDay(state.calSelectedDay);
  else if(panel)panel.style.display='none';
}

export function showDay(k){
  const dayTrades=accTrades().filter(t=>dayKey(tTime(t))===k).sort((a,b)=>tTime(a)-tTime(b));
  const p=$('calDayPanel');
  if(!p)return;
  // Panel sa otvára aj pre deň BEZ obchodov - inak by sa nedalo napísať zhrnutie dňa,
  // keď si zámerne neobchodoval (a práve to býva to najpoučnejšie).
  state.calSelectedDay=k;
  p.style.display='block';
  const head=dayTrades.length
    ?`<h3>${tr('Obchody')} ${k.split('-').reverse().join('.')} `+
      `<button type="button" class="btn secondary small" data-action="exportDay" data-day="${k}" style="margin-left:8px">📥 ${tr('Export JSON pre AI')}</button></h3>`+
      tradeTableHTML(dayTrades)
    :`<h3>${k.split('-').reverse().join('.')}</h3>`+
      `<div class="hint" style="margin-bottom:6px">${tr('V tento deň nemáš žiadne obchody. Zhrnutie si aj tak môžeš napísať.')}</div>`;
  p.innerHTML=head+dayNoteEditorHTML(k,'cal');
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
    stop:riskStop(t),target:t.target??null,
    // posun stopu je pre AI podstatný kontext - bez neho vyzerá obchod ako plánovaný
    stopPosunuty:t.stopMoves?{pocet:t.stopMoves,doStraty:t.stopWidened||0,finalny:t.stopFinal??null}:null,
    fees:t.fees||0,
    pnl:+computePnl(t).toFixed(2),
    r:riskR(t),
    mae:x?+x.maeMoney.toFixed(2):null,
    mfe:x?+x.mfeMoney.toFixed(2):null,
    // false = MAE/MFE je dolná hranica (krajná sviečka presahuje mimo obchodu)
    maeMfePresne:x?!!x.exact:null,
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
    // zhrnutie dňa dáva AI kontext a psychiku, ktoré zo samotných čísel nevyčíta
    dennik:dayNoteForAi(k),
    trades:dayTrades.map(dayTradeToJson),
  };
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='trading-journal-'+k+'.json';
  a.click();
  toast(tr('JSON pre deň')+' '+k+' '+tr('stiahnutý – vlož ho do claude.ai alebo iného AI chatu'));
}
