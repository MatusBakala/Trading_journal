import { accTrades, activeStartBalance } from './accounts.js';
import { renderBreakdown } from './ai.js';
import { renderPatterns } from './patterns.js';
import { cssVar, state } from './state.js';
import { tTime } from './strategy-notes.js';
import { $, computePnl, dayKey, emotionLabel, fmtMoney, moneyCls, sessionOf } from './utils.js';

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
export function renderDashboard(){
  const ts=filteredForDash();
  const pnls=ts.map(computePnl);
  const net=pnls.reduce((a,b)=>a+b,0);
  const wins=pnls.filter(p=>p>0),losses=pnls.filter(p=>p<0);
  const wr=pnls.length?wins.length/pnls.length*100:0;
  const gw=wins.reduce((a,b)=>a+b,0),gl=Math.abs(losses.reduce((a,b)=>a+b,0));
  const pf=gl>0?gw/gl:(gw>0?Infinity:0);
  const avgW=wins.length?gw/wins.length:0,avgL=losses.length?gl/losses.length:0;
  const expct=pnls.length?net/pnls.length:0;
  // max drawdown
  let peak=0,dd=0,cum=0;
  for(const p of pnls){cum+=p;if(cum>peak)peak=cum;const d=peak-cum;if(d>dd)dd=d;}
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
    ['Max drawdown',fmtMoney(-dd),dd?'neg':''],
    ['Najlepší deň',fmtMoney(bestDay),moneyCls(bestDay)],
    ['Najhorší deň',fmtMoney(worstDay),moneyCls(worstDay)],
  ].map(k=>`<div class="card"><div class="lbl">${k[0]}</div><div class="val ${k[2]}">${k[1]}</div></div>`).join('');

  // equity
  if(typeof Chart!=='undefined'){
    const labels=ts.map((t,i)=>i+1);
    let c=activeStartBalance(),eq=ts.map((t,i)=>{c+=pnls[i];return c;});
    if(state.eqChartObj)state.eqChartObj.destroy();
    const gridColor=cssVar('--border'),tickColor=cssVar('--muted'),accentColor=cssVar('--accent'),greenColor=cssVar('--green'),redColor=cssVar('--red');
    state.eqChartObj=new Chart($('eqChart'),{type:'line',data:{labels,datasets:[{data:eq,borderColor:accentColor,backgroundColor:accentColor+'1f',fill:true,pointRadius:0,tension:.2,borderWidth:2}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{display:false},y:{grid:{color:gridColor},ticks:{color:tickColor}}}}});
    // daily
    const dkeys=Object.keys(daily).sort();
    if(state.dailyChartObj)state.dailyChartObj.destroy();
    state.dailyChartObj=new Chart($('dailyChart'),{type:'bar',data:{labels:dkeys.map(k=>k.slice(5)),datasets:[{data:dkeys.map(k=>daily[k]),backgroundColor:dkeys.map(k=>daily[k]>=0?greenColor:redColor)}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{color:tickColor,maxTicksLimit:12}},y:{grid:{color:gridColor},ticks:{color:tickColor}}}}});
  }
  // breakdowns
  renderBreakdown('bySymbol',ts,t=>String(t.symbol).toUpperCase());
  const dows=['Nedeľa','Pondelok','Utorok','Streda','Štvrtok','Piatok','Sobota'];
  renderBreakdown('byDow',ts,t=>dows[new Date(tTime(t)*1000).getDay()]);
  renderBreakdown('byHour',ts,t=>String(new Date((t.tEntry||tTime(t))*1000).getHours()).padStart(2,'0')+':00');
  renderBreakdown('bySession',ts,t=>sessionOf(t));
  renderBreakdown('byEmotionIn',ts,t=>emotionLabel(t.emotionIn));
  renderBreakdown('byEmotionOut',ts,t=>emotionLabel(t.emotionOut));
  renderPatterns(ts);
}
