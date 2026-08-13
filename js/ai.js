import { esc, fmtMoney, moneyCls } from './utils.js';
import { accTrades, activeStartBalance } from './accounts.js';
import { filteredForDash } from './dashboard.js';
import { tr } from './i18n.js';
import { saveSettings } from './init.js';
import { PATTERNS_MIN_TRADES, computePatternRows } from './patterns.js';
import { state } from './state.js';
import { avg, collectExcursions } from './stats.js';
import { riskR, strategyRuleTable, tTime } from './strategy-notes.js';
import { $, computePnl, emotionLabel, isClosed, sessionOf, toast } from './utils.js';

/* ================= AI insight ================= */
export function groupStats(closed,keyFn){
  const g={};
  closed.forEach(t=>{const k=keyFn(t);(g[k]=g[k]||[]).push(computePnl(t));});
  return Object.entries(g).map(([k,arr])=>({
    key:k,trades:arr.length,
    winRatePct:+(arr.filter(p=>p>0).length/arr.length*100).toFixed(1),
    pnl:+arr.reduce((a,b)=>a+b,0).toFixed(2),
  }));
}
/* Zoznamy sa orezávajú podľa veľkosti dopadu na P&L, nie podľa abecedy - do promptu
   patria položky, ktoré reálne hýbu výsledkom, nie kompletný výpis. */
export function topByImpact(rows,n){
  return [...rows].sort((a,b)=>Math.abs(b.pnl)-Math.abs(a.pnl)).slice(0,n);
}
export function tagStats(closed,field){
  const g={};
  for(const t of closed)for(const tag of (t[field]||[]))(g[tag]=g[tag]||[]).push(computePnl(t));
  return Object.entries(g).map(([tag,arr])=>({
    tag,trades:arr.length,
    winRatePct:+(arr.filter(p=>p>0).length/arr.length*100).toFixed(1),
    pnl:+arr.reduce((a,b)=>a+b,0).toFixed(2),
  }));
}
/* Dodržiavanie vlastných pravidiel je najsilnejší signál, aký žurnál má:
   ukáže rozdiel medzi "stratégia nefunguje" a "nerobím to, čo mám". */
export function strategyBreakdown(closed){
  const out=[];
  for(const s of state.strategies){
    const ts=closed.filter(t=>t.strategyId===s.id);
    if(!ts.length)continue;
    const pnls=ts.map(computePnl);
    const rules=s.rules||[];
    const withChecklist=ts.filter(t=>Array.isArray(t.checkedRules));
    out.push({
      strategy:s.name,
      trades:ts.length,
      pnl:+pnls.reduce((a,b)=>a+b,0).toFixed(2),
      winRatePct:+(pnls.filter(p=>p>0).length/ts.length*100).toFixed(1),
      ruleAdherencePct:(rules.length&&withChecklist.length)
        ?+(avg(withChecklist.map(t=>t.checkedRules.length/rules.length))*100).toFixed(1):null,
      rules:strategyRuleTable(s,ts).filter(r=>r.n>0).map(r=>({
        rule:r.rule,
        followedInPctOfTrades:+r.followRate.toFixed(1),
        pnlWhenFollowed:+r.net.toFixed(2),
        winRateWhenFollowedPct:r.wr==null?null:+r.wr.toFixed(1),
      })).sort((a,b)=>Math.abs(b.pnlWhenFollowed)-Math.abs(a.pnlWhenFollowed)).slice(0,6),
    });
  }
  return out.sort((a,b)=>b.trades-a.trades).slice(0,5);
}
export function excursionSummary(closed){
  const rows=collectExcursions(closed);
  if(!rows.length)return null;
  const wins=rows.filter(r=>r.pnl>0),losses=rows.filter(r=>r.pnl<0);
  return {
    tradesWithCandleData:rows.length,
    avgMaeOfWinners:+(-avg(wins.map(r=>r.mae))).toFixed(2),
    worstMaeOfAWinner:+(-(wins.length?Math.max(...wins.map(r=>r.mae)):0)).toFixed(2),
    avgMfeOfLosers:+avg(losses.map(r=>r.mfe)).toFixed(2),
    profitLeftOnTable:+wins.reduce((a,r)=>a+r.leftOnTable,0).toFixed(2),
  };
}
export function buildAiSummary(ts){
  const closed=ts.filter(isClosed);
  const total=closed.length;
  const pnls=closed.map(computePnl);
  const net=pnls.reduce((a,b)=>a+b,0);
  const wins=pnls.filter(p=>p>0),losses=pnls.filter(p=>p<0);
  const gw=wins.reduce((a,b)=>a+b,0),gl=Math.abs(losses.reduce((a,b)=>a+b,0));
  const dows=['Nedeľa','Pondelok','Utorok','Streda','Štvrtok','Piatok','Sobota'];
  // vzory navyše potrebujú tExit - počítajú trvanie obchodu a párujú sviečky
  const forPatterns=closed.filter(t=>t.tExit&&isFinite(t.entry)&&isFinite(t.exit));
  const patterns=forPatterns.length>=PATTERNS_MIN_TRADES?computePatternRows(forPatterns).map(r=>({
    name:r.name,pctOfEligible:+r.pct.toFixed(1),matched:r.count,eligible:r.eligible,
  })):[];
  let peak=0,dd=0,cum=0;
  for(const p of pnls){cum+=p;if(cum>peak)peak=cum;if(peak-cum>dd)dd=peak-cum;}
  const rs=closed.map(riskR).filter(r=>r!=null);
  const durOf=t=>(t.tEntry&&t.tExit&&t.tExit>t.tEntry)?t.tExit-t.tEntry:null;
  const durWin=closed.filter((t,i)=>pnls[i]>0).map(durOf).filter(d=>d!=null);
  const durLoss=closed.filter((t,i)=>pnls[i]<0).map(durOf).filter(d=>d!=null);
  const periodLabel=($('dashPeriod')&&$('dashPeriod').selectedOptions[0])?$('dashPeriod').selectedOptions[0].textContent:'';
  return {
    period:periodLabel,
    accountStartBalance:+activeStartBalance().toFixed(2),
    openPositionsNotCounted:accTrades().filter(t=>!isClosed(t)).length,
    totalClosedTrades:total,
    netPnl:+net.toFixed(2),
    winRatePct:total?+(wins.length/total*100).toFixed(1):0,
    profitFactor:gl>0?+(gw/gl).toFixed(2):null,
    avgWin:+(wins.length?gw/wins.length:0).toFixed(2),
    avgLoss:+(-(losses.length?gl/losses.length:0)).toFixed(2),
    avgRMultiple:rs.length?+avg(rs).toFixed(2):null,
    maxDrawdown:+(-dd).toFixed(2),
    feesTotal:+closed.reduce((a,t)=>a+(t.fees||0),0).toFixed(2),
    avgHoldSecondsWinners:durWin.length?Math.round(avg(durWin)):null,
    avgHoldSecondsLosers:durLoss.length?Math.round(avg(durLoss)):null,
    strategiesAndRuleAdherence:strategyBreakdown(closed),
    mistakeTags:topByImpact(tagStats(closed,'tagsNeg'),8),
    setupTags:topByImpact(tagStats(closed,'tags'),8),
    byEntryEmotion:topByImpact(groupStats(closed,t=>emotionLabel(t.emotionIn)),8),
    byExitEmotion:topByImpact(groupStats(closed,t=>emotionLabel(t.emotionOut)),8),
    bySession:groupStats(closed,t=>sessionOf(t)),
    excursion:excursionSummary(closed),
    bySymbol:topByImpact(groupStats(closed,t=>String(t.symbol).toUpperCase()),10),
    byDayOfWeek:groupStats(closed,t=>dows[new Date(tTime(t)*1000).getDay()]),
    byEntryHour:groupStats(closed,t=>String(new Date((t.tEntry||tTime(t))*1000).getHours()).padStart(2,'0')+':00'),
    detectedPatterns:patterns,
  };
}
export function saveAiInsightModel(){state.settings.aiInsightModel=$('aiInsightModel').value;saveSettings();}
export function buildAiPromptText(inlineSummary){
  const langName=state.settings.lang==='en'?'English':'Slovak';
  const base=`Toto je súhrn štatistík z trading journalu (počítané appkou, čísla sú presné). Napíš stručné, konkrétne zhodnotenie obchodovania: 2-3 silné stránky, 2-3 konkrétne oblasti na zlepšenie, a 1-2 praktické odporúčania. Vždy sa opri o konkrétne čísla z dát.

Kľúč k poliam:
- strategiesAndRuleAdherence: ako často obchodník dodržal vlastné pravidlá a s akým výsledkom. Rozlíš, či stratégia nefunguje, alebo ju len nedodržiava (ruleAdherencePct, followedInPctOfTrades vs pnlWhenFollowed).
- mistakeTags / setupTags: chyby a setupy, ktoré si sám otagoval, zoradené podľa dopadu na P&L.
- byEntryEmotion / byExitEmotion: emócie a ich cena.
- excursion: MAE = najhoršie proti nemu, MFE = najlepšie v jeho prospech. avgMaeOfWinners a worstMaeOfAWinner hovoria, či nemá stopy pritesné; profitLeftOnTable a avgMfeOfLosers, či nenechá zisky ujsť.
- avgHoldSecondsWinners vs avgHoldSecondsLosers: kratšie držanie víťazov než porazených = zatvára zisky priskoro a sedí na stratách.
- maxDrawdown, avgRMultiple, feesTotal: riziko a náklady.

Buď priamy a vecný, žiadne všeobecné rady. Odpíš v jazyku: ${langName}.`;
  if(inlineSummary)return base+`\n\nDáta (JSON):\n${JSON.stringify(inlineSummary)}`;
  return base+`\n\nDáta sú v priloženom JSON súbore.`;
}
export async function exportAiData(){
  const summary=buildAiSummary(filteredForDash());
  if(summary.totalClosedTrades<PATTERNS_MIN_TRADES){
    toast(tr('Potrebných je aspoň')+' '+PATTERNS_MIN_TRADES+' '+tr('uzavretých obchodov na AI zhodnotenie.'));
    return;
  }
  const blob=new Blob([JSON.stringify(summary,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='trading-journal-ai-data-'+new Date().toISOString().slice(0,10)+'.json';
  a.click();
  const promptText=buildAiPromptText(null);
  try{
    await navigator.clipboard.writeText(promptText);
    toast(tr('JSON stiahnutý, prompt skopírovaný do schránky – vlož oboje do claude.ai'));
  }catch(e){
    toast(tr('JSON stiahnutý'));
  }
}
export async function getAiInsight(){
  const body=$('aiInsightBody'),btn=$('btnAiInsight');
  if(!state.settings.anthropicKey){
    body.innerHTML=`<div class="hint">${esc(tr('Najprv si v Nastaveniach ulož svoj Anthropic API kľúč.'))}</div>`;
    return;
  }
  const ts=filteredForDash();
  const summary=buildAiSummary(ts);
  if(summary.totalClosedTrades<PATTERNS_MIN_TRADES){
    body.innerHTML=`<div class="hint">${esc(tr('Potrebných je aspoň'))} ${PATTERNS_MIN_TRADES} ${esc(tr('uzavretých obchodov na AI zhodnotenie.'))}</div>`;
    return;
  }
  btn.disabled=true;btn.textContent=tr('Analyzujem…');
  body.innerHTML=`<div class="hint">${esc(tr('Čakám na odpoveď od Claude…'))}</div>`;
  const prompt=buildAiPromptText(summary);
  try{
    const res=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{
        'content-type':'application/json',
        'x-api-key':state.settings.anthropicKey,
        'anthropic-version':'2023-06-01',
        'anthropic-dangerous-direct-browser-access':'true',
      },
      body:JSON.stringify({
        model:state.settings.aiInsightModel||'claude-haiku-4-5-20251001',
        max_tokens:1536,
        thinking:{type:'disabled'},
        messages:[{role:'user',content:prompt}],
      }),
    });
    const data=await res.json();
    if(!res.ok)throw new Error((data&&data.error&&data.error.message)||('HTTP '+res.status));
    const text=(data.content||[]).map(c=>c.text||'').join('').trim();
    if(!text&&data.stop_reason==='max_tokens'){
      body.innerHTML=`<div class="hint" style="color:var(--red)">${esc(tr('Odpoveď bola príliš dlhá a orezaná. Skús to znova alebo zvoľ iný model.'))}</div>`;
    }else{
      body.innerHTML=`<div class="patRow neutral" style="white-space:pre-wrap;line-height:1.6">${esc(text||tr('Prázdna odpoveď.'))}</div>`;
    }
  }catch(e){
    body.innerHTML=`<div class="hint" style="color:var(--red)">${esc(tr('Chyba:'))} ${esc(e&&e.message?e.message:tr('neznáma chyba'))}</div>`;
  }finally{
    btn.disabled=false;btn.textContent=tr('Získať AI zhodnotenie');
  }
}
/* ---- AI chat ---- */
let aiChatHistory=[];
export function saveAiChatModel(){state.settings.aiChatModel=$('aiChatModel').value;saveSettings();}
export function openAiChat(){
  if(!state.settings.anthropicKey){toast(tr('Najprv si v Nastaveniach ulož svoj Anthropic API kľúč'));return;}
  $('aiChatModel').value=state.settings.aiChatModel||'claude-sonnet-5';
  $('aiChatOverlay').classList.add('open');
  renderAiChatMessages();
  $('aiChatInput').focus();
}
export function closeAiChat(){$('aiChatOverlay').classList.remove('open');}
export function renderAiChatMessages(){
  const box=$('aiChatMessages');
  if(!aiChatHistory.length){
    box.innerHTML=`<div class="hint">${esc(tr('Opýtaj sa čokoľvek o svojich štatistikách, vzoroch alebo výkonnosti – appka pošle Claude súhrn tvojich dát.'))}</div>`;
    return;
  }
  box.innerHTML=aiChatHistory.map(m=>`
    <div style="margin-bottom:12px;display:flex;${m.role==='user'?'justify-content:flex-end':''}">
      <div style="max-width:80%;padding:8px 12px;border-radius:10px;white-space:pre-wrap;line-height:1.5;background:${m.role==='user'?'var(--accent)':'var(--bg2)'};color:${m.role==='user'?'#fff':'var(--text)'}">${esc(m.content)}</div>
    </div>`).join('');
  box.scrollTop=box.scrollHeight;
}
export async function sendAiChatMessage(){
  const input=$('aiChatInput');
  const text=input.value.trim();
  if(!text)return;
  if(!state.settings.anthropicKey){toast(tr('Najprv si v Nastaveniach ulož svoj Anthropic API kľúč'));return;}
  input.value='';
  aiChatHistory.push({role:'user',content:text});
  renderAiChatMessages();
  const box=$('aiChatMessages'),sendBtn=$('btnAiChatSend');
  sendBtn.disabled=true;input.disabled=true;
  box.insertAdjacentHTML('beforeend',`<div class="hint" id="aiChatTyping">${esc(tr('Claude píše…'))}</div>`);
  box.scrollTop=box.scrollHeight;
  const model=$('aiChatModel').value;
  const summary=buildAiSummary(filteredForDash());
  const langName=state.settings.lang==='en'?'English':'Slovak';
  const systemPrompt=`Si asistent v trading journal appke používateľa. Máš k dispozícii súhrn jeho obchodných štatistík, vypočítaný appkou (presné čísla, JSON): ${JSON.stringify(summary)}\n\nOdpovedaj na otázky o jeho obchodovaní stručne a vecne, v jazyku: ${langName}. Ak sa opýta na niečo, čo v týchto dátach nie je (napr. konkrétne poznámky k jednotlivým obchodom), povedz, že to nemáš k dispozícii.`;
  try{
    const res=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{
        'content-type':'application/json',
        'x-api-key':state.settings.anthropicKey,
        'anthropic-version':'2023-06-01',
        'anthropic-dangerous-direct-browser-access':'true',
      },
      body:JSON.stringify({model,max_tokens:2048,thinking:{type:'disabled'},system:systemPrompt,messages:aiChatHistory}),
    });
    const data=await res.json();
    if(!res.ok)throw new Error((data&&data.error&&data.error.message)||('HTTP '+res.status));
    const reply=(data.content||[]).map(c=>c.text||'').join('').trim();
    aiChatHistory.push({role:'assistant',content:reply||tr('Prázdna odpoveď.')});
  }catch(e){
    aiChatHistory.push({role:'assistant',content:tr('Chyba:')+' '+(e&&e.message?e.message:tr('neznáma chyba'))});
  }finally{
    sendBtn.disabled=false;input.disabled=false;input.focus();
    renderAiChatMessages();
  }
}
/**
 * Rozpad obchodov podľa kľúča do tabuľky na dashboarde.
 * @param {{id:string,valueFn:function}} [filter]  keď je zadaný, riadky sú klikateľné
 *   a preklik nastaví filter `id` na hodnotu z `valueFn`. Zobrazený text a hodnota
 *   filtra sa líšia (napr. "😌 Pokoj / disciplína" vs kľúč "pokoj"), preto valueFn.
 */
export function renderBreakdown(elId,ts,keyFn,filter){
  const g={},sample={};
  ts.forEach(t=>{const k=keyFn(t);(g[k]=g[k]||[]).push(computePnl(t));if(!(k in sample))sample[k]=t;});
  const keys=Object.keys(g).sort((a,b)=>{
    const sa=g[a].reduce((x,y)=>x+y,0),sb=g[b].reduce((x,y)=>x+y,0);
    return elId==='byHour'?a.localeCompare(b):sb-sa;});
  if(!keys.length){$(elId).innerHTML='<span class="hint">Žiadne dáta</span>';return;}
  $(elId).innerHTML='<table><thead><tr><th></th><th>Trades</th><th>WR</th><th>P&L</th></tr></thead><tbody>'+
    keys.map(k=>{const arr=g[k];const s=arr.reduce((x,y)=>x+y,0);const w=arr.filter(x=>x>0).length;
      const rowAttr=filter
        ?`data-filter="${esc(filter.id)}" data-value="${esc(String(filter.valueFn(sample[k])))}" title="${esc(tr('Zobraziť tieto obchody'))}"`
        :'style="cursor:default"';
      return `<tr ${rowAttr}><td>${esc(k)}</td><td>${arr.length}</td><td>${(w/arr.length*100).toFixed(0)}%</td><td class="${moneyCls(s)}">${fmtMoney(s)}</td></tr>`;}).join('')+'</tbody></table>';
}
