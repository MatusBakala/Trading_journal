import { tr } from './i18n.js';
import { esc, fmtDT } from './utils.js';
import { parseCSV } from './csv-parser.js';
import { idbDel } from './db.js';
import { ask } from './i18n.js';
import { normH } from './import-csv.js';
import { saveBars } from './ohlc-fetch.js';
import { barsForTrade } from './patterns.js';
import { state } from './state.js';
import { goToTab } from './tabs.js';
import { datasetsForSymbol } from './trade-modal.js';
import { $, dayKey, num, parseDT, toast } from './utils.js';

/* ================= OHLC import ================= */
export function importOHLC(){
  const sym=$('ohlcSymbol').value.trim().toUpperCase();
  const tf=$('ohlcTf').value;
  const file=$('ohlcFile').files[0];
  if(!sym){toast('Zadaj symbol');return;}
  if(!file){toast('Vyber CSV súbor');return;}
  const rd=new FileReader();
  rd.onload=async()=>{
    const rows=parseCSV(rd.result);
    if(!rows.length){toast('Prázdny súbor');return;}
    let start=0,ci={t:0,o:1,h:2,l:3,c:4};
    const h0=rows[0].map(normH);
    const findCol=names=>h0.findIndex(h=>names.some(n=>h===n||h.startsWith(n)));
    const timeIdx=findCol(['time','date','datetime','timestamp','cas','datum']);
    if(timeIdx>=0){
      start=1;
      ci={t:timeIdx,
        o:findCol(['open','otvaracia']),h:findCol(['high','max']),
        l:findCol(['low','min']),c:findCol(['close','zatvaracia','last']),
        v:findCol(['volume','vol','objem'])};
      if(ci.o<0||ci.h<0||ci.l<0||ci.c<0){toast('Nenašiel som stĺpce open/high/low/close');return;}
    }
    const bars=[];
    for(let i=start;i<rows.length;i++){
      const r=rows[i];
      const t=parseDT(r[ci.t]);
      const o=num(r[ci.o]),h=num(r[ci.h]),l=num(r[ci.l]),c=num(r[ci.c]);
      const v=ci.v>=0?num(r[ci.v]):NaN;
      if(t&&isFinite(o)&&isFinite(h)&&isFinite(l)&&isFinite(c))bars.push(isFinite(v)?{t,o,h,l,c,v}:{t,o,h,l,c});
    }
    if(!bars.length){toast('Nepodarilo sa načítať žiadne sviečky – skontroluj formát');return;}
    const ds=await saveBars(sym,tf,bars);
    $('ohlcResult').textContent=`Uložených ${ds.bars.length} sviečok pre ${sym} (${tf}), pokrytie ${fmtDT(ds.bars[0].t)} – ${fmtDT(ds.bars[ds.bars.length-1].t)}`;
    toast('OHLC dáta nahrané');
    $('ohlcFile').value='';
  };
  rd.readAsText(file);
}
export function renderOhlcList(){
  if(!state.ohlcSets.length){$('ohlcList').innerHTML='Zatiaľ žiadne dáta.';return;}
  $('ohlcList').innerHTML='<table><thead><tr><th>Symbol</th><th>TF</th><th>Sviečok</th><th>Od</th><th>Do</th><th></th></tr></thead><tbody>'+
    state.ohlcSets.map(d=>`<tr style="cursor:default"><td><b>${esc(d.symbol)}</b></td><td>${esc(d.tf)}</td><td>${d.bars.length}</td><td>${fmtDT(d.bars[0].t)}</td><td>${fmtDT(d.bars[d.bars.length-1].t)}</td>
      <td><button type="button" class="btn secondary small" data-action="delOhlc" data-key="${esc(d.key)}">Vymazať</button></td></tr>`).join('')+'</tbody></table>';
}
export async function delOhlc(key){
  if(!ask('Vymazať tento dataset?'))return;
  await idbDel('ohlc',key);
  state.ohlcSets=state.ohlcSets.filter(d=>d.key!==key);
  renderOhlcList();
}
export function computeOhlcCoverage(){
  const closed=state.trades.filter(t=>t.tExit&&isFinite(t.entry)&&isFinite(t.exit));
  const bySymbolDay={};
  let missingTotal=0;
  for(const t of closed){
    if(barsForTrade(t))continue;
    missingTotal++;
    const sym=String(t.symbol||'?').toUpperCase();
    const day=dayKey(t.tEntry);
    bySymbolDay[sym]=bySymbolDay[sym]||{};
    bySymbolDay[sym][day]=(bySymbolDay[sym][day]||0)+1;
  }
  const groups=Object.keys(bySymbolDay).sort().map(sym=>{
    const days=Object.keys(bySymbolDay[sym]).sort();
    const ranges=[];
    let curStart=null,curEnd=null,curCount=0;
    for(const d of days){
      if(curStart&&(new Date(d+'T00:00:00')-new Date(curEnd+'T00:00:00'))===86400000){
        curEnd=d;curCount+=bySymbolDay[sym][d];
      }else{
        if(curStart)ranges.push({from:curStart,to:curEnd,count:curCount});
        curStart=d;curEnd=d;curCount=bySymbolDay[sym][d];
      }
    }
    if(curStart)ranges.push({from:curStart,to:curEnd,count:curCount});
    return {symbol:sym,totalMissing:days.reduce((a,d)=>a+bySymbolDay[sym][d],0),ranges,hasDataset:datasetsForSymbol(sym).length>0};
  });
  return {totalClosed:closed.length,missingTotal,groups};
}
export function runOhlcCoverageCheck(){
  const box=$('ohlcCoverageResult');
  if(!box)return;
  const res=computeOhlcCoverage();
  if(!res.missingTotal){
    box.innerHTML=`<div class="hint" style="color:var(--green)">✓ ${esc(tr('Všetky uzavreté obchody majú kompletné sviečkové dáta.'))}</div>`;
    return;
  }
  const rows=res.groups.map(g=>{
    const rangesHtml=g.ranges.map(r=>{
      const rangeLabel=r.from===r.to?r.from:`${r.from} → ${r.to}`;
      return `<div style="margin-left:14px;margin-top:2px">• ${esc(rangeLabel)} — ${r.count} ${esc(tr('obchodov'))}</div>`;
    }).join('');
    const noDatasetNote=g.hasDataset?'':` <span style="color:var(--red)">(${esc(tr('žiadny dataset pre tento symbol'))})</span>`;
    return `<div style="margin-top:10px"><b>${esc(g.symbol)}</b>${noDatasetNote} – ${g.totalMissing} ${esc(tr('obchodov bez dát'))}${rangesHtml}</div>`;
  }).join('');
  box.innerHTML=`<div class="hint">${esc(tr('Chýbajú sviečkové dáta pre'))} <b>${res.missingTotal}</b> ${esc(tr('z'))} ${res.totalClosed} ${esc(tr('uzavretých obchodov'))}:</div>${rows}`;
}
export function goToOhlcCoverage(){
  goToTab('data');
  runOhlcCoverageCheck();
  setTimeout(()=>{const el=$('ohlcCoveragePanel');if(el)el.scrollIntoView({behavior:'smooth',block:'start'});},50);
}
