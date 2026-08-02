'use strict';
/* ================= OHLC import ================= */
function importOHLC(){
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
    bars.sort((a,b)=>a.t-b.t);
    const dedup=[];let last=null;
    for(const b of bars){if(b.t!==last){dedup.push(b);last=b.t;}}
    const key=sym+'|'+tf;
    const existing=ohlcSets.find(d=>d.key===key);
    let merged=dedup;
    if(existing){
      const map=new Map(existing.bars.map(b=>[b.t,b]));
      for(const b of dedup)map.set(b.t,b);
      merged=[...map.values()].sort((a,b)=>a.t-b.t);
    }
    const ds={key,symbol:sym,tf,bars:merged,updated:Date.now()};
    await idbPut('ohlc',ds);
    ohlcSets=ohlcSets.filter(d=>d.key!==key);ohlcSets.push(ds);
    $('ohlcResult').textContent=`Uložených ${merged.length} sviečok pre ${sym} (${tf}), pokrytie ${fmtDT(merged[0].t)} – ${fmtDT(merged[merged.length-1].t)}`;
    renderOhlcList();
    toast('OHLC dáta nahrané');
    $('ohlcFile').value='';
  };
  rd.readAsText(file);
}
function renderOhlcList(){
  if(!ohlcSets.length){$('ohlcList').innerHTML='Zatiaľ žiadne dáta.';return;}
  $('ohlcList').innerHTML='<table><thead><tr><th>Symbol</th><th>TF</th><th>Sviečok</th><th>Od</th><th>Do</th><th></th></tr></thead><tbody>'+
    ohlcSets.map(d=>`<tr style="cursor:default"><td><b>${esc(d.symbol)}</b></td><td>${esc(d.tf)}</td><td>${d.bars.length}</td><td>${fmtDT(d.bars[0].t)}</td><td>${fmtDT(d.bars[d.bars.length-1].t)}</td>
      <td><button type="button" class="btn secondary small" data-action="delOhlc" data-key="${esc(d.key)}">Vymazať</button></td></tr>`).join('')+'</tbody></table>';
}
async function delOhlc(key){
  if(!ask('Vymazať tento dataset?'))return;
  await idbDel('ohlc',key);
  ohlcSets=ohlcSets.filter(d=>d.key!==key);
  renderOhlcList();
}
function computeOhlcCoverage(){
  const closed=trades.filter(t=>t.tExit&&isFinite(t.entry)&&isFinite(t.exit));
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
function runOhlcCoverageCheck(){
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
function goToOhlcCoverage(){
  goToTab('data');
  runOhlcCoverageCheck();
  setTimeout(()=>{const el=$('ohlcCoveragePanel');if(el)el.scrollIntoView({behavior:'smooth',block:'start'});},50);
}
