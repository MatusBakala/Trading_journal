import { accTrades, activeStartBalance } from './accounts.js';
import { renderBreakdown } from './ai.js';
import { tr } from './i18n.js';
import { renderPatterns } from './patterns.js';
import { cssVar, state } from './state.js';
import { tTime } from './strategy-notes.js';
import { $, computeDrawdown, computePnl, dayKey, emotionLabel, fmtMoney, fmtPct, isClosed, moneyCls, returnPct, sessionOf } from './utils.js';

/* ================= Dashboard ================= */
export const GAUGE_L=125.66; // dĺžka polkruhu r=40
export function gaugeSVG(wN,bN,lN){
  const tot=wN+bN+lN;
  const seg=(frac,off,color)=>frac>0?`<path d="M10 50 A40 40 0 0 1 90 50" fill="none" stroke="${color}" stroke-width="9" stroke-dasharray="${(frac*GAUGE_L).toFixed(2)} 999" stroke-dashoffset="${(-off*GAUGE_L).toFixed(2)}"/>`:'';
  let segs='';
  if(tot>0){
    const fw=wN/tot,fb=bN/tot,fl=lN/tot;
    segs=seg(fw,0,'#26a69a')+seg(fb,fw,'#5b8def')+seg(fl,fw+fb,'#ef5350');
  }
  return `<svg viewBox="0 0 100 55" width="88" height="49">
    <path d="M10 50 A40 40 0 0 1 90 50" fill="none" stroke="${cssVar('--border')}" stroke-width="9"/>${segs}</svg>`;
}
export function donutSVG(frac,hasData){
  const C=(2*Math.PI*16).toFixed(2);
  if(!hasData)return `<svg viewBox="0 0 44 44" width="54" height="54"><circle cx="22" cy="22" r="16" fill="none" stroke="${cssVar('--border')}" stroke-width="7"/></svg>`;
  return `<svg viewBox="0 0 44 44" width="54" height="54" style="transform:rotate(-90deg)">
    <circle cx="22" cy="22" r="16" fill="none" stroke="#ef5350" stroke-width="7"/>
    <circle cx="22" cy="22" r="16" fill="none" stroke="#26a69a" stroke-width="7" stroke-dasharray="${(frac*C).toFixed(2)} 999" stroke-linecap="round"/>
  </svg>`;
}
export function filteredForDash(){
  const p=$('dashPeriod').value;
  const now=new Date();
  let from=0;
  if(p==='month')from=new Date(now.getFullYear(),now.getMonth(),1).getTime()/1000;
  else if(p==='year')from=new Date(now.getFullYear(),0,1).getTime()/1000;
  else if(p==='30')from=now.getTime()/1000-30*86400;
  else if(p==='90')from=now.getTime()/1000-90*86400;
  return accTrades().filter(t=>tTime(t)>=from).sort((a,b)=>tTime(a)-tTime(b));
}
export function toggleEqMode(mode){state.eqChartMode=mode;renderDashboard();}
/* Banner "dnešné využité riziko" - na rozdiel od plannedRiskPct() v trade-modal.js
   (riziko JEDNÉHO rozostavaného obchodu, vstup→stop) toto sčíta realizované straty
   VŠETKÝCH dnešných uzavretých obchodov, aby bolo vidno priebežné čerpanie denného
   limitu, nielen limit na jeden obchod. */
function renderRiskBanner(startBalance){
  const el=$('riskBanner');
  if(!el)return;
  const limit=state.settings.maxDailyLossPct;
  if(!(limit>0)||!(startBalance>0)){el.innerHTML='';return;}
  const todayKey=dayKey(Math.floor(Date.now()/1000));
  const todayNet=accTrades().filter(t=>isClosed(t)&&dayKey(tTime(t))===todayKey).reduce((a,t)=>a+computePnl(t),0);
  const lossPct=todayNet<0?Math.abs(todayNet)/startBalance*100:0;
  const overLimit=lossPct>limit;
  el.innerHTML=`<div class="card" style="border:1px solid ${overLimit?'var(--red)':'var(--border)'};margin-bottom:14px">
    <div class="lbl">${overLimit?'⚠️ ':''}${tr('Dnešné využité riziko')} <span class="hint">${tr('(denný limit')} ${limit}%)</span></div>
    <div class="val ${overLimit?'neg':''}" style="font-size:20px;font-weight:700">${lossPct.toFixed(2)}%</div>
  </div>`;
}
function renderEqModeBar(startBalance){
  const bar=$('eqModeBar');
  if(!bar)return;
  if(!(startBalance>0)){bar.innerHTML='';return;} // % nedáva zmysel bez počiat. kapitálu
  bar.innerHTML=['usd','pct'].map(m=>
    `<button type="button" class="tfBtn${state.eqChartMode===m?' on':''}" data-eqmode="${m}">${m==='usd'?'$':'%'}</button>`).join('');
}
export function renderDashboard(){
  // len uzavreté obchody - otvorené pozície nemajú realizovaný P&L
  const ts=filteredForDash().filter(isClosed);
  const pnls=ts.map(computePnl);
  const net=pnls.reduce((a,b)=>a+b,0);
  const wins=pnls.filter(p=>p>0),losses=pnls.filter(p=>p<0);
  const wr=pnls.length?wins.length/pnls.length*100:0;
  const gw=wins.reduce((a,b)=>a+b,0),gl=Math.abs(losses.reduce((a,b)=>a+b,0));
  const pf=gl>0?gw/gl:(gw>0?Infinity:0);
  const avgW=wins.length?gw/wins.length:0,avgL=losses.length?gl/losses.length:0;
  const expct=pnls.length?net/pnls.length:0;
  const startBalance=activeStartBalance();
  const {ddAbs:dd,ddPct}=computeDrawdown(pnls,startBalance);
  const netPct=returnPct(net,startBalance);
  renderRiskBanner(startBalance);
  const be=pnls.filter(p=>p===0).length;
  // daily sums
  const daily={};
  ts.forEach((t,i)=>{const k=dayKey(tTime(t));daily[k]=(daily[k]||0)+pnls[i];});
  const dayVals=Object.values(daily);
  const dW=dayVals.filter(v=>v>0).length,dL=dayVals.filter(v=>v<0).length,dB=dayVals.filter(v=>v===0).length;
  const dwr=dayVals.length?dW/dayVals.length*100:0;
  const ratio=avgL>0?avgW/avgL:(avgW>0?Infinity:0);
  const pfFrac=(gw+gl)>0?gw/(gw+gl):0;
  const bestDay=dayVals.length?Math.max(...dayVals):0;
  const worstDay=dayVals.length?Math.min(...dayVals):0;
  const awPct=(avgW+avgL)>0?avgW/(avgW+avgL)*100:50;
  $('kpiCards').innerHTML=`
    <div class="card kpi">
      <div>
        <div class="lbl">Net P&L <span class="badge">${pnls.length}</span></div>
        <div class="big ${moneyCls(net)}">${fmtMoney(net)}</div>
        ${netPct!=null?`<div class="hint ${moneyCls(net)}">${fmtPct(netPct)}</div>`:''}
      </div>
    </div>
    <div class="card kpi">
      <div>
        <div class="lbl">Trade win %</div>
        <div class="big">${wr.toFixed(2)}%</div>
      </div>
      <div style="text-align:center">
        ${gaugeSVG(wins.length,be,losses.length)}
        <div class="gpills"><span class="gpill w">${wins.length}</span><span class="gpill b">${be}</span><span class="gpill l">${losses.length}</span></div>
      </div>
    </div>
    <div class="card kpi">
      <div>
        <div class="lbl">Profit factor</div>
        <div class="big">${pf===Infinity?'∞':pf.toFixed(2)}</div>
      </div>
      <div>${donutSVG(pfFrac,pnls.length>0)}</div>
    </div>
    <div class="card kpi">
      <div>
        <div class="lbl">Day win %</div>
        <div class="big">${dwr.toFixed(2)}%</div>
      </div>
      <div style="text-align:center">
        ${gaugeSVG(dW,dB,dL)}
        <div class="gpills"><span class="gpill w">${dW}</span><span class="gpill b">${dB}</span><span class="gpill l">${dL}</span></div>
      </div>
    </div>
    <div class="card">
      <div class="lbl">Avg win/loss trade</div>
      <div class="big" style="font-size:23px;font-weight:800">${ratio===Infinity?'∞':ratio.toFixed(2)}</div>
      <div class="wlbar"><div style="width:${awPct.toFixed(1)}%;background:var(--green)"></div><div style="flex:1;background:${(avgW+avgL)>0?'var(--red)':'var(--bg3)'}"></div></div>
      <div class="wllabels"><span class="pos">${fmtMoney(avgW)}</span><span class="neg">${fmtMoney(-avgL)}</span></div>
    </div>`;
  $('kpiCards2').innerHTML=[
    ['Očak. hodnota / trade',fmtMoney(expct),moneyCls(expct)],
    ['Max drawdown',fmtMoney(-dd)+(dd&&startBalance>0?` (-${ddPct.toFixed(1)}%)`:''),dd?'neg':''],
    ['Najlepší deň',fmtMoney(bestDay),moneyCls(bestDay)],
    ['Najhorší deň',fmtMoney(worstDay),moneyCls(worstDay)],
  ].map(k=>`<div class="card"><div class="lbl">${k[0]}</div><div class="val ${k[2]}">${k[1]}</div></div>`).join('');

  renderEqModeBar(startBalance);
  // equity
  if(typeof Chart!=='undefined'){
    const labels=ts.map((t,i)=>i+1);
    let c=startBalance,eqUsd=ts.map((t,i)=>{c+=pnls[i];return c;});
    const pctMode=state.eqChartMode==='pct'&&startBalance>0;
    const eq=pctMode?eqUsd.map(v=>(v/startBalance-1)*100):eqUsd;
    if(state.eqChartObj)state.eqChartObj.destroy();
    const gridColor=cssVar('--border'),tickColor=cssVar('--muted'),accentColor=cssVar('--accent'),greenColor=cssVar('--green'),redColor=cssVar('--red');
    state.eqChartObj=new Chart($('eqChart'),{type:'line',data:{labels,datasets:[{data:eq,borderColor:accentColor,backgroundColor:accentColor+'1f',fill:true,pointRadius:0,tension:.2,borderWidth:2}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>pctMode?fmtPct(c.parsed.y):fmtMoney(c.parsed.y)}}},scales:{x:{display:false},y:{grid:{color:gridColor},ticks:{color:tickColor,callback:v=>pctMode?v.toFixed(1)+'%':v}}}}});
    // daily
    const dkeys=Object.keys(daily).sort();
    if(state.dailyChartObj)state.dailyChartObj.destroy();
    state.dailyChartObj=new Chart($('dailyChart'),{type:'bar',data:{labels:dkeys.map(k=>k.slice(5)),datasets:[{data:dkeys.map(k=>daily[k]),backgroundColor:dkeys.map(k=>daily[k]>=0?greenColor:redColor)}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{color:tickColor,maxTicksLimit:12}},y:{grid:{color:gridColor},ticks:{color:tickColor}}}}});
  }
  // breakdowns
  // Každý rozpad je klikateľný - preklik prehodí do Obchodov a nastaví zodpovedajúci
  // filter. Deň v týždni sa filtruje podľa čísla dňa (názov je len na zobrazenie)
  // a emócia podľa kľúča; 'none' = emócia nezadaná.
  const dowOf=t=>String(new Date(tTime(t)*1000).getDay());
  const hourOf=t=>String(new Date((t.tEntry||tTime(t))*1000).getHours()).padStart(2,'0');
  renderBreakdown('bySymbol',ts,t=>String(t.symbol).toUpperCase(),{id:'fSymbol',valueFn:t=>String(t.symbol).toUpperCase()});
  const dows=['Nedeľa','Pondelok','Utorok','Streda','Štvrtok','Piatok','Sobota'];
  renderBreakdown('byDow',ts,t=>dows[new Date(tTime(t)*1000).getDay()],{id:'fDow',valueFn:dowOf});
  renderBreakdown('byHour',ts,t=>hourOf(t)+':00',{id:'fHour',valueFn:hourOf});
  renderBreakdown('bySession',ts,t=>sessionOf(t),{id:'fSession',valueFn:t=>sessionOf(t)});
  renderBreakdown('byEmotionIn',ts,t=>emotionLabel(t.emotionIn),{id:'fEmotionIn',valueFn:t=>t.emotionIn||'none'});
  renderBreakdown('byEmotionOut',ts,t=>emotionLabel(t.emotionOut),{id:'fEmotionOut',valueFn:t=>t.emotionOut||'none'});
  renderPatterns(ts);
}
