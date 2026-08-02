import { accTrades } from './accounts.js';
import { state } from './state.js';
import { riskR, tTime } from './strategy-notes.js';
import { $, computePnl, dayKey, fmtDur, fmtMoney, moneyCls } from './utils.js';

/* ================= Stats page ================= */
export function periodFiltered(p){
  const now=new Date();
  let from=0;
  if(p==='month')from=new Date(now.getFullYear(),now.getMonth(),1).getTime()/1000;
  else if(p==='year')from=new Date(now.getFullYear(),0,1).getTime()/1000;
  else if(p==='30')from=now.getTime()/1000-30*86400;
  else if(p==='90')from=now.getTime()/1000-90*86400;
  return accTrades().filter(t=>tTime(t)>=from).sort((a,b)=>tTime(a)-tTime(b));
}
export function maxStreak(arr,pred){let m=0,c=0;for(const x of arr){if(pred(x)){c++;if(c>m)m=c;}else c=0;}return m;}
export function avg(arr){return arr.length?arr.reduce((a,b)=>a+b,0)/arr.length:0;}
export function srow(l,v,cls){return `<div class="srow"><span>${l}</span><b class="${cls||''}">${v}</b></div>`;}
export function renderStats(){
  const ts=periodFiltered($('statsPeriod').value);
  const pnls=ts.map(computePnl);
  const net=pnls.reduce((a,b)=>a+b,0);
  const wins=pnls.filter(p=>p>0),losses=pnls.filter(p=>p<0),be=pnls.filter(p=>p===0);
  const gw=wins.reduce((a,b)=>a+b,0),gl=Math.abs(losses.reduce((a,b)=>a+b,0));
  const pf=gl>0?gw/gl:(gw>0?Infinity:0);
  const fees=ts.reduce((a,t)=>a+(t.fees||0),0);
  const openTrades=ts.filter(t=>!isFinite(t.exit)&&t.pnlOverride==null).length;
  // hold times
  const durs=ts.map(t=>(t.tEntry&&t.tExit&&t.tExit>t.tEntry)?t.tExit-t.tEntry:null);
  const dAll=durs.filter(d=>d!=null);
  const dWin=durs.filter((d,i)=>d!=null&&pnls[i]>0);
  const dLoss=durs.filter((d,i)=>d!=null&&pnls[i]<0);
  // daily
  const daily={},dailyVol={};
  ts.forEach((t,i)=>{const k=dayKey(tTime(t));daily[k]=(daily[k]||0)+pnls[i];dailyVol[k]=(dailyVol[k]||0)+(t.qty||1);});
  const dkeys=Object.keys(daily).sort();
  const dVals=dkeys.map(k=>daily[k]);
  const dW=dVals.filter(v=>v>0),dL=dVals.filter(v=>v<0),dB=dVals.filter(v=>v===0);
  // drawdown
  let peak=0,dd=0,cum=0;
  for(const p of pnls){cum+=p;if(cum>peak)peak=cum;const d=peak-cum;if(d>dd)dd=d;}
  // R multiples
  const rs=ts.map(riskR).filter(r=>r!=null);
  // months
  const months={};
  ts.forEach((t,i)=>{const d=new Date(tTime(t)*1000);const k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');months[k]=(months[k]||0)+pnls[i];});
  const mkeys=Object.keys(months).sort();
  const mName=k=>{const [y,m]=k.split('-');return new Date(+y,+m-1,1).toLocaleDateString(state.settings.lang==='en'?'en-US':'sk-SK',{month:'short',year:'numeric'});};
  let bestM=null,worstM=null;
  for(const k of mkeys){
    if(bestM==null||months[k]>months[bestM])bestM=k;
    if(worstM==null||months[k]<months[worstM])worstM=k;
  }
  const mAvg=mkeys.length?net/mkeys.length:0;
  $('statsMonths').innerHTML=[
    ['Najlepší mesiac',bestM?fmtMoney(months[bestM]):'–',bestM?moneyCls(months[bestM]):'',bestM?mName(bestM):''],
    ['Najhorší mesiac',worstM?fmtMoney(months[worstM]):'–',worstM?moneyCls(months[worstM]):'',worstM?mName(worstM):''],
    ['Priemer / mesiac',fmtMoney(mAvg),moneyCls(mAvg),mkeys.length+' mes.'],
  ].map(k=>`<div class="card"><div class="lbl">${k[0]}</div><div class="val ${k[2]}">${k[1]}</div><div class="lbl" style="margin-top:4px">${k[3]}</div></div>`).join('');

  $('statsLeft').innerHTML='<h3>Obchody</h3>'+
    srow('Celkový P&L',fmtMoney(net),moneyCls(net))+
    srow('Priemerný P&L / obchod',fmtMoney(avg(pnls)),moneyCls(avg(pnls)))+
    srow('Priemerný ziskový obchod',fmtMoney(avg(wins)),'pos')+
    srow('Priemerný stratový obchod',fmtMoney(-Math.abs(avg(losses))),losses.length?'neg':'')+
    srow('Počet obchodov',pnls.length)+
    srow('Ziskové obchody',wins.length,'pos')+
    srow('Stratové obchody',losses.length,losses.length?'neg':'')+
    srow('Breakeven obchody',be.length)+
    srow('Max po sebe idúce výhry',maxStreak(pnls,p=>p>0))+
    srow('Max po sebe idúce prehry',maxStreak(pnls,p=>p<0))+
    srow('Najväčší zisk',fmtMoney(pnls.length?Math.max(...pnls):0),'pos')+
    srow('Najväčšia strata',fmtMoney(pnls.length?Math.min(...pnls):0),pnls.length&&Math.min(...pnls)<0?'neg':'')+
    srow('Poplatky spolu',fmtMoney(fees),fees?'neg':'')+
    srow('Priem. držanie (všetky)',dAll.length?fmtDur(avg(dAll)):'–')+
    srow('Priem. držanie (ziskové)',dWin.length?fmtDur(avg(dWin)):'–')+
    srow('Priem. držanie (stratové)',dLoss.length?fmtDur(avg(dLoss)):'–')+
    srow('Profit factor',pf===Infinity?'∞':pf.toFixed(2),pf>=1?'pos':(pnls.length?'neg':''));

  $('statsRight').innerHTML='<h3>Dni</h3>'+
    srow('Otvorené obchody (bez výstupu)',openTrades)+
    srow('Obchodných dní',dkeys.length)+
    srow('Ziskové dni',dW.length,'pos')+
    srow('Stratové dni',dL.length,dL.length?'neg':'')+
    srow('Breakeven dni',dB.length)+
    srow('Max po sebe ziskových dní',maxStreak(dVals,v=>v>0))+
    srow('Max po sebe stratových dní',maxStreak(dVals,v=>v<0))+
    srow('Priemerný denný P&L',fmtMoney(avg(dVals)),moneyCls(avg(dVals)))+
    srow('Priemerný ziskový deň',fmtMoney(avg(dW)),'pos')+
    srow('Priemerný stratový deň',fmtMoney(avg(dL)),dL.length?'neg':'')+
    srow('Najlepší deň',fmtMoney(dVals.length?Math.max(...dVals):0),'pos')+
    srow('Najhorší deň',fmtMoney(dVals.length?Math.min(...dVals):0),dVals.length&&Math.min(...dVals)<0?'neg':'')+
    srow('Priem. denný objem (kontrakty)',dkeys.length?avg(Object.values(dailyVol)).toFixed(1):'–')+
    srow('Očakávaná hodnota / obchod',fmtMoney(avg(pnls)),moneyCls(avg(pnls)))+
    srow('Priemerný realizovaný R-multiple',rs.length?avg(rs).toFixed(2)+'R':'–',rs.length?(avg(rs)>=0?'pos':'neg'):'')+
    srow('Max drawdown',fmtMoney(-dd),dd?'neg':'');
}
