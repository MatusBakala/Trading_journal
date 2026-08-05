import { tr } from './i18n.js';
import { strategyNameOf } from './strategy-notes.js';
import { fmtDT, fmtDur, fmtMoney, moneyCls } from './utils.js';
import { accTrades } from './accounts.js';
import { idbDel, shotsByTrade } from './db.js';
import { scheduleAutoSync } from './gdrive.js';
import { ask } from './i18n.js';
import { renderAfterTradeChange } from './init.js';
import { state } from './state.js';
import { riskR, tTime } from './strategy-notes.js';
import { $, computePnl, esc, sessionOf, toast } from './utils.js';

/* ================= Trades list ================= */
export function refreshSymbolFilter(){
  const syms=[...new Set(accTrades().map(t=>String(t.symbol).toUpperCase()))].sort();
  const opts=syms.map(s=>`<option>${esc(s)}</option>`).join('');
  for(const id of ['fSymbol','rSymbol']){
    const sel=$(id);
    if(!sel)continue;
    const cur=sel.value;
    sel.innerHTML='<option value="">Všetky symboly</option>'+opts;
    sel.value=cur;
  }
}
let tagFilter=new Set(); // kľúče 'g:nazov' / 'r:nazov'
let reportTagFilter=new Set();
export function allTagsOf(field,trades){
  const s=new Set();
  (trades||accTrades()).forEach(t=>(t[field]||[]).forEach(x=>s.add(x)));
  return [...s].sort((a,b)=>a.localeCompare(b));
}
export function renderTagBarGeneric(elId,filterSet,onChange){
  const el=$(elId);
  if(!el)return;
  const trades=accTrades();
  const gTags=allTagsOf('tags',trades),rTags=allTagsOf('tagsNeg',trades);
  const valid=new Set([...gTags.map(x=>'g:'+x),...rTags.map(x=>'r:'+x)]);
  [...filterSet].forEach(k=>{if(!valid.has(k))filterSet.delete(k);});
  if(!gTags.length&&!rTags.length){el.innerHTML='';el.style.display='none';return;}
  el.style.display='flex';
  const chip=(tg,type)=>{const k=type+':'+tg;
    return `<span class="tagchip ${type==='g'?'g':'r'} ${filterSet.has(k)?'on':''}" data-key="${esc(k)}">${esc(tg)}</span>`;};
  el.innerHTML='<span class="hint">Filter podľa tagov:</span>'+
    gTags.map(tg=>chip(tg,'g')).join('')+rTags.map(tg=>chip(tg,'r')).join('')+
    (filterSet.size?'<button class="btn secondary small" data-clear="1">✕ Zrušiť filter</button>':'');
  el.querySelectorAll('.tagchip').forEach(c=>c.onclick=()=>{
    const k=c.dataset.key;
    if(filterSet.has(k))filterSet.delete(k);else filterSet.add(k);
    onChange();
  });
  const tc=el.querySelector('[data-clear]');
  if(tc)tc.onclick=()=>{filterSet.clear();onChange();};
}
export function renderTagBar(){renderTagBarGeneric('tagBar',tagFilter,renderTrades);}
export function renderReportTagBar(){renderTagBarGeneric('rTagBar',reportTagFilter,renderReports);}
export function applyCommonFilters(list,prefix,filterSet){
  const sym=$(prefix+'Symbol').value,dir=$(prefix+'Dir').value,session=$(prefix+'Session').value,strat=$(prefix+'Strategy').value,from=$(prefix+'From').value,to=$(prefix+'To').value;
  const hourEl=$(prefix+'Hour'),hour=hourEl?hourEl.value:'';
  return list.filter(t=>{
    if(sym&&String(t.symbol).toUpperCase()!==sym)return false;
    if(dir&&String(t.dir)!==dir)return false;
    if(session&&sessionOf(t)!==session)return false;
    if(strat&&String(t.strategyId)!==strat)return false;
    if(hour&&String(new Date((t.tEntry||tTime(t))*1000).getHours()).padStart(2,'0')!==hour)return false;
    if(filterSet.size){
      const match=[...filterSet].some(k=>{
        const name=k.slice(2);
        return k[0]==='g'?(t.tags||[]).includes(name):(t.tagsNeg||[]).includes(name);
      });
      if(!match)return false;
    }
    const tt=tTime(t);
    if(from&&tt<new Date(from).getTime()/1000)return false;
    if(to&&tt>new Date(to).getTime()/1000+86399)return false;
    return true;
  });
}
export function filteredTrades(){
  const q=$('fSearch').value.toLowerCase();
  return applyCommonFilters(accTrades(),'f',tagFilter).filter(t=>{
    if(q){const hay=((t.notes||'')+' '+(t.tags||[]).join(' ')+' '+(t.tagsNeg||[]).join(' ')+' '+t.symbol).toLowerCase();if(!hay.includes(q))return false;}
    return true;
  }).sort((a,b)=>tTime(b)-tTime(a));
}
export function tradeRowHTML(t){
  const pnl=computePnl(t);
  const r=riskR(t);
  const dur=(t.tEntry&&t.tExit)?t.tExit-t.tEntry:null;
  const scaled=(t.entryLegs&&t.entryLegs.length>1)||(t.exitLegs&&t.exitLegs.length>1);
  const scaledTitle=scaled?esc(tr('Postupný vstup/výstup')+': '+
    (t.entryLegs||[]).map(l=>`${l.qty}@${l.price}`).join('→')+
    (t.exitLegs&&t.exitLegs.length?' / '+t.exitLegs.map(l=>`${l.qty}@${l.price}`).join('→'):'')):'';
  return `<tr data-trade-id="${t.id}">
    <td>${fmtDT(t.tEntry)}</td>
    <td><b>${esc(String(t.symbol).toUpperCase())}</b></td>
    <td><span class="pill ${t.dir===1?'long':'short'}">${t.dir===1?'LONG':'SHORT'}</span></td>
    <td>${t.qty??''}${scaled?` <span class="hint" title="${scaledTitle}">⇄</span>`:''}</td>
    <td>${isFinite(t.entry)?t.entry:''}</td>
    <td>${isFinite(t.exit)?t.exit:'–'}</td>
    <td>${fmtDur(dur)}</td>
    <td class="${moneyCls(pnl)}"><b>${fmtMoney(pnl)}</b></td>
    <td>${r==null?'–':r.toFixed(2)+'R'}</td>
    <td>${esc(tr(sessionOf(t)))}</td>
    <td>${t.strategyId!=null?esc(strategyNameOf(t)):'–'}</td>
    <td>${(t.tags||[]).map(x=>`<span class="tag g">${esc(x)}</span>`).join('')}${(t.tagsNeg||[]).map(x=>`<span class="tag r">${esc(x)}</span>`).join('')}</td>
    <td><button type="button" class="btn secondary small" data-action="delTrade" data-id="${t.id}">✕</button></td>
  </tr>`;
}
export function tradeTableHTML(list){
  return `<div style="overflow-x:auto"><table><thead><tr><th>Dátum</th><th>Symbol</th><th>Smer</th><th>Množstvo</th><th>Vstup</th><th>Výstup</th><th>Trvanie</th><th>P&L</th><th>R</th><th>Session</th><th>Stratégia</th><th>Tagy</th><th></th></tr></thead><tbody>${list.map(tradeRowHTML).join('')}</tbody></table></div>`;
}
export function renderTrades(){
  renderTagBar();
  const list=filteredTrades();
  $('tradesBody').innerHTML=list.length?list.map(tradeRowHTML).join(''):'<tr><td colspan="13" class="hint" style="cursor:default">Žiadne obchody. Pridaj ručne alebo importuj CSV.</td></tr>';
  $('fCount').textContent=list.length+' obchodov';
}
export function commentedTrades(){
  const q=($('rSearch')?$('rSearch').value:'').toLowerCase().trim();
  const base=accTrades().filter(t=>(t.notes||'').trim()!=='');
  return applyCommonFilters(base,'r',reportTagFilter).filter(t=>{
    if(!q)return true;
    const hay=((t.notes||'')+' '+(t.tags||[]).join(' ')+' '+(t.tagsNeg||[]).join(' ')+' '+t.symbol).toLowerCase();
    return hay.includes(q);
  }).sort((a,b)=>tTime(b)-tTime(a));
}
export function reportRowHTML(t){
  const pnl=computePnl(t);
  const noteRaw=(t.notes||'').trim();
  const noteExcerpt=esc(noteRaw.slice(0,160))+(noteRaw.length>160?'…':'');
  return `<tr data-trade-id="${t.id}">
    <td>${fmtDT(t.tEntry)}</td>
    <td><b>${esc(String(t.symbol).toUpperCase())}</b></td>
    <td><span class="pill ${t.dir===1?'long':'short'}">${t.dir===1?'LONG':'SHORT'}</span></td>
    <td class="${moneyCls(pnl)}"><b>${fmtMoney(pnl)}</b></td>
    <td>${esc(tr(sessionOf(t)))}</td>
    <td>${t.strategyId!=null?esc(strategyNameOf(t)):'–'}</td>
    <td>${(t.tags||[]).map(x=>`<span class="tag g">${esc(x)}</span>`).join('')}${(t.tagsNeg||[]).map(x=>`<span class="tag r">${esc(x)}</span>`).join('')}</td>
    <td style="max-width:360px;white-space:pre-wrap">${noteExcerpt}</td>
  </tr>`;
}
export function renderReports(){
  renderReportTagBar();
  const list=commentedTrades();
  $('reportsBody').innerHTML=list.length?list.map(reportRowHTML).join(''):'<tr><td colspan="8" class="hint" style="cursor:default">Zatiaľ žiadne okomentované obchody. Otvor obchod a napíš poznámku/review – automaticky sa zobrazí tu.</td></tr>';
  $('rCount').textContent=list.length+' obchodov';
}
export async function delTrade(id){
  if(!await ask('Vymazať tento obchod?'))return;
  await idbDel('trades',id);
  const shots=await shotsByTrade(id);
  for(const s of shots)await idbDel('shots',s.id);
  state.trades=state.trades.filter(t=>t.id!==id);
  renderAfterTradeChange();scheduleAutoSync();toast('Obchod vymazaný');
}
