import { goToOhlcCoverage } from './ohlc-import.js';
import { tr } from './i18n.js';
import { state } from './state.js';
import { avg } from './stats.js';
import { tTime } from './strategy-notes.js';
import { TF_SEC, datasetsForSymbol } from './trade-modal.js';
import { $, computePnl, dayKey, esc } from './utils.js';

/* ================= Trading patterns ================= */
export const PATTERNS_MIN_TRADES=5;
function lowerBoundByTime(bars,value){
  let lo=0,hi=bars.length;
  while(lo<hi){const mid=(lo+hi)>>1;if(bars[mid].t<value)lo=mid+1;else hi=mid;}
  return lo;
}
export function barsForTrade(t){
  if(!t.symbol||!t.tEntry||!t.tExit)return null;
  const cands=datasetsForSymbol(t.symbol);
  let best=null,bestCount=0;
  for(const d of cands){
    const tf=TF_SEC[d.tf]||300;
    // include any bar whose [t, t+tf) interval overlaps the trade's duration, not just
    // ones that start inside it - otherwise a trade shorter than one candle (common for
    // scalps) matches zero bars even though a covering candle exists.
    // bars are stored sorted by t - bound the scan instead of filtering the whole array.
    const startIdx=lowerBoundByTime(d.bars,t.tEntry-tf);
    const bars=[];
    for(let i=startIdx;i<d.bars.length;i++){
      const b=d.bars[i];
      if(b.t>t.tExit)break;
      if((b.t+tf)>=t.tEntry)bars.push(b);
    }
    if(bars.length>bestCount){bestCount=bars.length;best=bars;}
  }
  return bestCount>=1?best:null;
}
export const _volMemo={};
export function avgVolumeForSymbol(sym){
  if(_volMemo[sym]!=null)return _volMemo[sym];
  let sum=0,n=0;
  for(const d of datasetsForSymbol(sym))for(const b of d.bars){if(b.v>0){sum+=b.v;n++;}}
  return _volMemo[sym]=(n?sum/n:0);
}
export function patGreenToRed(t,bars){
  if(!isFinite(t.entry)||!isFinite(t.exit))return false;
  if(computePnl(t)>=0)return false;
  let mfe=-Infinity;
  for(const b of bars){
    const fav=t.dir===1?(b.h-t.entry):(t.entry-b.l);
    if(fav>mfe)mfe=fav;
  }
  return mfe>0;
}
export function patDrawdownMajority(t,bars){
  if(!isFinite(t.entry))return false;
  let ddBars=0;
  for(const b of bars){
    const underwater=t.dir===1?(b.c<t.entry):(b.c>t.entry);
    if(underwater)ddBars++;
  }
  return ddBars/bars.length>0.5;
}
export function patUnusualVolume(t,bars){
  const symAvg=avgVolumeForSymbol(String(t.symbol||'').toUpperCase());
  if(!symAvg)return false;
  const vols=bars.map(b=>b.v||0).filter(v=>v>0);
  if(!vols.length)return false;
  const avg=vols.reduce((a,b)=>a+b,0)/vols.length;
  return avg>symAvg*1.5;
}
export function patRevengeCount(chrono){
  // only compare gaps between trades on the same calendar day - otherwise overnight
  // gaps between sessions would dominate the average and make every same-day
  // re-entry look "fast" by comparison.
  const sameDayGap=(a,b)=>dayKey(a.tExit)===dayKey(b.tEntry)?b.tEntry-a.tExit:null;
  const gaps=[];
  for(let i=1;i<chrono.length;i++){
    const gap=sameDayGap(chrono[i-1],chrono[i]);
    if(gap!=null&&gap>=0)gaps.push(gap);
  }
  if(gaps.length<2)return 0;
  // use the median, not the mean, as the "typical gap" baseline - a handful of long
  // same-day gaps (e.g. a lunch break) skew the mean upward, which made half-the-mean
  // wider than most of the trader's normal fast re-entries and over-flagged them all.
  gaps.sort((a,b)=>a-b);
  const typicalGap=gaps[Math.floor(gaps.length/2)];
  if(!typicalGap)return 0;
  let n=0;
  for(let i=1;i<chrono.length;i++){
    const gap=sameDayGap(chrono[i-1],chrono[i]);
    if(gap!=null&&gap>=0&&gap<typicalGap*0.5&&computePnl(chrono[i-1])<0)n++;
  }
  return n;
}
export function patOvertradingCount(closed){
  const byDay={};
  for(const t of closed){const k=dayKey(tTime(t));(byDay[k]=byDay[k]||[]).push(t);}
  const dayCounts=Object.values(byDay).map(a=>a.length);
  if(dayCounts.length<2)return 0;
  const avgPerDay=dayCounts.reduce((a,b)=>a+b,0)/dayCounts.length;
  const variance=dayCounts.reduce((a,b)=>a+(b-avgPerDay)**2,0)/dayCounts.length;
  const threshold=avgPerDay+Math.sqrt(variance);
  // a fixed multiplier (e.g. avg*1.5) misses traders whose day-to-day count varies
  // gradually rather than in rare spikes - comparing to the trader's own spread
  // (1 stddev above their average) adapts to that instead.
  let n=0;
  for(const k in byDay){if(byDay[k].length>threshold)n+=byDay[k].length;}
  return n;
}
export function computePatternRows(closed){
  const total=closed.length;
  const avgDur=closed.reduce((a,t)=>a+(t.tExit-t.tEntry),0)/total;
  let gtr=0,ddm=0,eht=0,vol=0,ohlcElig=0;
  for(const t of closed){
    if((t.tExit-t.tEntry)>avgDur)eht++;
    const bars=barsForTrade(t);
    if(bars){
      ohlcElig++;
      if(patGreenToRed(t,bars))gtr++;
      if(patDrawdownMajority(t,bars))ddm++;
      if(patUnusualVolume(t,bars))vol++;
    }
  }
  const chrono=[...closed].sort((a,b)=>a.tEntry-b.tEntry);
  const revenge=patRevengeCount(chrono);
  const overtrade=patOvertradingCount(closed);
  return [
    {name:'Dlhšie ako priemerné držanie',desc:'Obchod držaný dlhšie než je tvoj priemer',count:eht,cls:'neutral',needsOhlc:false,eligible:total},
    {name:'Green to Red',desc:'Obchod bol dočasne v zisku, no skončil v strate',count:gtr,cls:'bad',needsOhlc:true,eligible:ohlcElig},
    {name:'Väčšinu času v strate',desc:'Väčšinu trvania obchodu bola cena proti tebe',count:ddm,cls:'bad',needsOhlc:true,eligible:ohlcElig},
    {name:'Nezvyčajne vysoký objem',desc:'Obchodoval si s výrazne vyšším objemom než zvyčajne',count:vol,cls:'neutral',needsOhlc:true,eligible:ohlcElig},
    {name:'Revenge trading',desc:'Rýchly nový vstup hneď po stratovom obchode',count:revenge,cls:'bad',needsOhlc:false,eligible:total},
    {name:'Overtrading',desc:'Výrazne viac obchodov za deň než je tvoj priemer',count:overtrade,cls:'bad',needsOhlc:false,eligible:total},
  ].map(r=>({...r,pct:r.eligible?r.count/r.eligible*100:0})).sort((a,b)=>b.pct-a.pct);
}
export function renderPatterns(ts){
  const sub=$('patternsSub'),body=$('patternsBody');
  if($('aiInsightModel'))$('aiInsightModel').value=state.settings.aiInsightModel||'claude-haiku-4-5-20251001';
  const closed=ts.filter(t=>t.tExit&&isFinite(t.entry)&&isFinite(t.exit));
  const total=closed.length;
  if(total<PATTERNS_MIN_TRADES){
    sub.textContent=tr('Potrebných je aspoň')+' '+PATTERNS_MIN_TRADES+' '+tr('uzavretých obchodov na rozpoznanie vzorov (zatiaľ')+' '+total+').';
    body.innerHTML='';
    return;
  }
  const rows=computePatternRows(closed);
  const ohlcRow=rows.find(r=>r.needsOhlc);
  const gapLink=ohlcRow&&ohlcRow.eligible<total
    ?` · <a href="javascript:void(0)" data-action="goToOhlcCoverage" style="color:var(--accent)">${esc(tr('Zobraziť detaily chýbajúcich dát →'))}</a>`
    :'';
  sub.innerHTML=esc(tr('Top vzory naprieč')+' '+total+' '+tr('obchodmi'))+gapLink;
  body.innerHTML=rows.map(r=>{
    if(r.needsOhlc&&r.eligible===0){
      return `<div class="patRow neutral">
        <div class="patContent">
          <div class="patText"><b>${esc(tr(r.name))}</b> – ${esc(tr(r.desc))}</div>
          <div class="patStat"><div class="hint">${esc(tr('Chýbajú sviečkové dáta'))}</div></div>
        </div>
      </div>`;
    }
    const countLabel=`${r.count}/${r.eligible} ${esc(tr('obchodov'))}`;
    const denomNote=r.needsOhlc&&r.eligible<total?` title="${esc(tr('Menovateľ je nižší ako celkový počet obchodov – tento vzor vyžaduje sviečkové dáta, ktoré nie sú dostupné pre všetky obchody.'))}"`:'';
    return `<div class="patRow ${r.cls}">
      <div class="patBar" style="width:${r.pct.toFixed(1)}%"></div>
      <div class="patContent">
        <div class="patText"><b>${esc(tr(r.name))}</b> – ${esc(tr(r.desc))}</div>
        <div class="patStat"><div class="pct">${r.pct.toFixed(1)}%</div><div class="hint"${denomNote}>${countLabel}</div></div>
      </div>
    </div>`;
  }).join('');
}
