import { tr } from './i18n.js';
import { esc, fmtDT } from './utils.js';
import { parseCSV } from './csv-parser.js';
import { idbDel } from './db.js';
import { ask } from './i18n.js';
import { normH } from './import-csv.js';
import { saveBars } from './ohlc-fetch.js';
import { barsForTrade } from './patterns.js';
import { state } from './state.js';
import { excursionFor } from './strategy-notes.js';
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
  if(!await ask('Vymazať tento dataset?'))return;
  await idbDel('ohlc',key);
  state.ohlcSets=state.ohlcSets.filter(d=>d.key!==key);
  renderOhlcList();
}
export function computeOhlcCoverage(){
  const closed=state.trades.filter(t=>t.tExit&&isFinite(t.entry)&&isFinite(t.exit));
  const bySymbolDay={};
  let missingTotal=0;
  /* Samotná prítomnosť sviečky nestačí - barsForTrade() vráti "pokryté" aj vtedy, keď
     4-minútový obchod prekrýva jediná denná sviečka. Preto sa popri chýbajúcich dátach
     zbiera aj kvalita: aký timeframe sa reálne použil, koľko obchodov skončí len s dolnou
     hranicou MAE/MFE (krajná sviečka presahuje mimo obchodu) a koľko ich má cenu mimo
     rozsahu datasetu (iný kontrakt-mesiac). */
  const quality={};
  for(const t of closed){
    const sym=String(t.symbol||'?').toUpperCase();
    if(!barsForTrade(t)){
      missingTotal++;
      const day=dayKey(t.tEntry);
      bySymbolDay[sym]=bySymbolDay[sym]||{};
      bySymbolDay[sym][day]=(bySymbolDay[sym][day]||0)+1;
      continue;
    }
    const q=quality[sym]=quality[sym]||{symbol:sym,covered:0,bounded:0,mismatch:0,thin:0,badTicks:0,tfs:{}};
    q.covered++;
    const x=excursionFor(t);
    if(!x)continue;
    if(x.mismatch){q.mismatch++;continue;}
    q.tfs[x.tf]=(q.tfs[x.tf]||0)+1;
    if(!x.exact)q.bounded++;
    if(x.barCount<=2)q.thin++; // celý obchod pokrývajú 1-2 sviečky
    if(x.badTicks)q.badTicks++;
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
  return {totalClosed:closed.length,missingTotal,groups,
    quality:Object.values(quality).sort((a,b)=>a.symbol.localeCompare(b.symbol))};
}
/* Kvalita pokrytia - odpovedá na "dá sa týmto číslam veriť", nielen "existujú sviečky". */
function coverageQualityHTML(quality){
  if(!quality.length)return '';
  const rows=quality.map(q=>{
    const tfs=Object.keys(q.tfs).sort((a,b)=>q.tfs[b]-q.tfs[a]).map(tf=>`${tf}×${q.tfs[tf]}`).join(', ');
    const notes=[];
    if(q.bounded)notes.push(`${q.bounded} ${tr('s dolnou hranicou MAE/MFE')}`);
    if(q.thin)notes.push(`<span style="color:var(--red)">${q.thin} ${esc(tr('pokrytých len 1–2 sviečkami'))}</span>`);
    if(q.badTicks)notes.push(`${q.badTicks} ${esc(tr('s ignorovaným chybným tickom'))}`);
    if(q.mismatch)notes.push(`<span style="color:var(--red)">${q.mismatch} ${esc(tr('s cenou mimo datasetu – iný kontrakt-mesiac'))}</span>`);
    return `<div style="margin-top:6px"><b>${esc(q.symbol)}</b> – ${q.covered} ${esc(tr('obchodov so sviečkami'))}`+
      (tfs?` <span class="hint">(${esc(tfs)})</span>`:'')+
      (notes.length?`<div style="margin-left:14px;margin-top:2px" class="hint">• ${notes.join(' · ')}</div>`:
        `<div style="margin-left:14px;margin-top:2px;color:var(--green)" class="hint">• ${esc(tr('presné MAE/MFE'))}</div>`)+
      `</div>`;
  }).join('');
  return `<div style="margin-top:14px"><div class="lbl">${esc(tr('Kvalita pokrytia'))}</div>${rows}`+
    `<div class="hint" style="margin-top:8px">${esc(tr('„Dolná hranica" znamená, že krajná sviečka presahuje mimo obchodu, takže skutočné MAE/MFE môže byť vyššie. Zúžiš to jemnejšími sviečkami: Yahoo dáva 1m len ~7 dní dozadu, pre staršie obchody nahraj CSV z TradingView (panel vyššie).'))}</div></div>`;
}
export function runOhlcCoverageCheck(){
  const box=$('ohlcCoverageResult');
  if(!box)return;
  const res=computeOhlcCoverage();
  const qualityHtml=coverageQualityHTML(res.quality);
  if(!res.missingTotal){
    box.innerHTML=`<div class="hint" style="color:var(--green)">✓ ${esc(tr('Každý uzavretý obchod má nejaké sviečkové dáta.'))}</div>`+qualityHtml;
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
  box.innerHTML=`<div class="hint">${esc(tr('Chýbajú sviečkové dáta pre'))} <b>${res.missingTotal}</b> ${esc(tr('z'))} ${res.totalClosed} ${esc(tr('uzavretých obchodov'))}:</div>${rows}${qualityHtml}`;
}
export function goToOhlcCoverage(){
  goToTab('data');
  runOhlcCoverageCheck();
  setTimeout(()=>{const el=$('ohlcCoveragePanel');if(el)el.scrollIntoView({behavior:'smooth',block:'start'});},50);
}
