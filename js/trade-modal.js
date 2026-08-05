import { esc, fmtDT, fmtMoney, moneyCls, multFor } from './utils.js';
import { defaultAccId } from './accounts.js';
import { closeAiChat } from './ai.js';
import { idbAdd, idbDel, idbPut, shotsByTrade } from './db.js';
import { scheduleAutoSync } from './gdrive.js';
import { tr } from './i18n.js';
import { loadCsvForImport } from './import-csv.js';
import { renderAfterTradeChange, saveSettings } from './init.js';
import { autoFetchForTrade, fetchTfForTrade } from './ohlc-fetch.js';
import { cssVar, state } from './state.js';
import { excursionFor, plannedRiskPct, refreshStrategySelects, renderTradeRuleChecklist, riskR, strategyById } from './strategy-notes.js';
import { allTagsOf, delTrade } from './trades-list.js';
import { $, computePnl, dayKey, emotionLabel, localInputToTs, num, sessionOf, toast, tsToLocalInput } from './utils.js';

/* ================= Trade modal ================= */
export async function openTrade(id){
  state.currentTradeId=id;state.pendingShots=[];state.removedShotIds=[];state.modalChartTf=null;
  $('tChartDsWrap').dataset.chosen='';
  const t=id!=null?state.trades.find(x=>x.id===id):null;
  $('tmTitle').textContent=t?`Obchod #${t.id} – ${String(t.symbol).toUpperCase()}`:'Nový obchod';
  $('tDelete').style.display=t?'':'none';
  $('tAccount').innerHTML=state.settings.accounts.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join('');
  $('tAccount').value=String(t?(t.account??defaultAccId()):(state.settings.activeAccount==='all'?defaultAccId():state.settings.activeAccount));
  $('tSymbol').value=t?t.symbol:'';
  $('tDir').value=t?String(t.dir):'1';
  $('tQty').value=t?(t.qty??1):1;
  $('tFees').value=t?(t.fees??0):0;
  $('tEntry').value=t&&isFinite(t.entry)?t.entry:'';
  $('tExit').value=t&&isFinite(t.exit)?t.exit:'';
  $('tStop').value=t&&t.stop!=null?t.stop:'';
  $('tTarget').value=t&&t.target!=null?t.target:'';
  $('tTimeIn').value=t?tsToLocalInput(t.tEntry):tsToLocalInput(Math.floor(Date.now()/1000));
  $('tTimeOut').value=t?tsToLocalInput(t.tExit):'';
  $('tPnl').value=t&&t.pnlOverride!=null?t.pnlOverride:'';
  $('tTags').value=t?(t.tags||[]).join(', '):'';
  $('tTagsNeg').value=t?(t.tagsNeg||[]).join(', '):'';
  $('tEmotionIn').value=t?(t.emotionIn||''):'';
  $('tEmotionOut').value=t?(t.emotionOut||''):'';
  refreshStrategySelects();
  $('tStrategy').value=t&&t.strategyId!=null?String(t.strategyId):'';
  $('tNotes').value=t?(t.notes||''):'';
  if(t){
    const shots=await shotsByTrade(t.id);
    state.pendingShots=shots.map(s=>({id:s.id,blob:s.blob}));
  }
  renderShots();
  renderTagSuggest();
  renderTradeRuleChecklist();
  renderAiReview(t?t.aiReview:null);
  if($('tAiReviewModel'))$('tAiReviewModel').value=state.settings.aiReviewModel||'claude-sonnet-5';
  updatePnlPreview();
  $('tradeOverlay').classList.add('open');
  renderModalChart();
}
export function closeTrade(){
  $('tradeOverlay').classList.remove('open');
  destroyModalChart();
  state.currentTradeId=null;state.pendingShots=[];state.removedShotIds=[];
}
export function formTrade(){
  const symbol=$('tSymbol').value.trim();
  const entry=num($('tEntry').value),exit=num($('tExit').value);
  const t={
    symbol,
    account:parseInt($('tAccount').value,10)||defaultAccId(),
    dir:parseInt($('tDir').value,10),
    qty:num($('tQty').value)||1,
    fees:num($('tFees').value)||0,
    entry:isFinite(entry)?entry:NaN,
    exit:isFinite(exit)?exit:NaN,
    stop:isFinite(num($('tStop').value))?num($('tStop').value):null,
    target:isFinite(num($('tTarget').value))?num($('tTarget').value):null,
    tEntry:localInputToTs($('tTimeIn').value),
    tExit:localInputToTs($('tTimeOut').value),
    pnlOverride:$('tPnl').value.trim()===''?null:num($('tPnl').value),
    tags:$('tTags').value.split(',').map(s=>s.trim()).filter(Boolean),
    tagsNeg:$('tTagsNeg').value.split(',').map(s=>s.trim()).filter(Boolean),
    emotionIn:$('tEmotionIn').value||null,
    emotionOut:$('tEmotionOut').value||null,
    strategyId:$('tStrategy').value?parseInt($('tStrategy').value,10):null,
    checkedRules:$('tStrategy').value?[...document.querySelectorAll('#tRuleChecklist .tRuleCheck:checked')].map(i=>i.value):null,
    notes:$('tNotes').value,
  };
  // entryLegs/exitLegs (z broker CSV importu, pozri import-csv.js) nemajú formulárové
  // políčka - bez tohto by ich formTrade() vždy vynulovalo (aj len pri prekreslení P&L
  // náhľadu, aj pri uložení), a MAE/MFE by tichmo spadlo naspäť na približný výpočet.
  if(state.currentTradeId!=null){
    const old=state.trades.find(x=>x.id===state.currentTradeId);
    if(old&&old.entryLegs)t.entryLegs=old.entryLegs;
    if(old&&old.exitLegs)t.exitLegs=old.exitLegs;
  }
  return t;
}
export function updatePnlPreview(){
  const t=formTrade();
  if(!t.symbol){$('tPnlPreview').textContent='';return;}
  const pnl=computePnl(t);
  const r=riskR(t);
  const riskPct=plannedRiskPct(t);
  const limit=state.settings.maxRiskPerTradePct;
  const overLimit=limit>0&&riskPct!=null&&riskPct>limit;
  $('tPnlPreview').innerHTML=`P&L: <span class="${moneyCls(pnl)}">${fmtMoney(pnl)}</span>`+
    (r!=null?` &nbsp; <span class="hint">(${r.toFixed(2)}R)</span>`:'')+
    ` &nbsp; <span class="hint">multiplikátor ${multFor(t.symbol)}</span>`+
    (riskPct!=null?` &nbsp; <span class="${overLimit?'neg':'hint'}" title="${esc(tr('Riziko vstup→stop ako % počiat. kapitálu aktívneho účtu'))}">${overLimit?'⚠️ ':''}riziko ${riskPct.toFixed(2)}%${limit>0?' / '+limit+'%':''}</span>`:'');
  renderExcursion(t);
}
/* Jeden riadok "2@3985.0 → 1@3986.2" per leg-skupina, aby bolo pri škálovanom
   obchode vidno, že sa nešlo dnu/von jedným fillom - presne to, čo v tabuľke
   obchodov ukazuje odznak ⇄ scaled (pozri trades-list.js). */
function legsSummary(legs){
  if(!legs||!legs.length)return '';
  return legs.map(l=>`${l.qty}@${l.price}`).join(' → ');
}
export function renderExcursion(t){
  const el=$('tExcursion');
  if(!el)return;
  const x=excursionFor(t);
  if(!x){el.innerHTML='';return;}
  if(x.mismatch){
    el.innerHTML=`<span class="hint" style="color:var(--red)" title="${esc(tr('Cena v priradených sviečkach sa výrazne líši od ceny obchodu - pravdepodobne iný kontrakt/mesiac než bol stiahnutý.'))}">⚠️ ${esc(tr('Sviečky nesedia s cenou obchodu'))} (${esc(x.tf)})</span>`;
    return;
  }
  const rTxt=v=>v==null?'':` (${v.toFixed(2)}R)`;
  const approxTitle=x.approx?esc(tr('Približné - bez rozpisu fillov sa počíta s konečným množstvom cez celé okno obchodu; presnejšie je to len pri obchodoch importovaných z broker CSV.')):'';
  const scaled=(t.entryLegs&&t.entryLegs.length>1)||(t.exitLegs&&t.exitLegs.length>1);
  el.innerHTML=
    (x.approx?`<span class="hint" title="${approxTitle}">≈</span> `:'')+
    `<span title="${esc(tr('Najhorší bod proti tebe počas obchodu'))}">MAE <b class="neg">${fmtMoney(x.maeMoney)}</b><span class="hint">${rTxt(x.maeR)}</span></span>`+
    ` &nbsp;·&nbsp; <span title="${esc(tr('Najlepší bod v tvoj prospech počas obchodu'))}">MFE <b class="pos">${fmtMoney(x.mfeMoney)}</b><span class="hint">${rTxt(x.mfeR)}</span></span>`+
    // pri stratovom obchode by „nechané na stole" miatlo (je v tom hlavne samotná strata)
    (computePnl(t)>0&&x.leftOnTable>0?` &nbsp;·&nbsp; <span class="hint" title="${esc(tr('Rozdiel medzi najlepším bodom obchodu a tým, čo si reálne zobral'))}">${esc(tr('nechané na stole'))} ${fmtMoney(x.leftOnTable)}</span>`:'')+
    ` &nbsp; <span class="hint">(${esc(tr('zo sviečok'))} ${esc(x.tf)})</span>`+
    (scaled?`<div class="hint" style="margin-top:4px">⇄ ${esc(tr('Vstup'))}: ${esc(legsSummary(t.entryLegs))}`+
      (t.exitLegs&&t.exitLegs.length?` &nbsp;·&nbsp; ${esc(tr('Výstup'))}: ${esc(legsSummary(t.exitLegs))}`:'')+`</div>`:'');
}
['tSymbol','tDir','tQty','tFees','tEntry','tExit','tStop','tTarget','tPnl'].forEach(id=>{
  document.addEventListener('input',e=>{if(e.target.id===id)updatePnlPreview();});
});
document.addEventListener('input',e=>{if(e.target.id==='tTags'||e.target.id==='tTagsNeg')renderTagSuggest();});
export function inputTags(inputId){return $(inputId).value.split(',').map(s=>s.trim()).filter(Boolean);}
export function renderTagSuggestOne(inputId,elId,field,cls,emptyMsg){
  const el=$(elId);
  const cur=inputTags(inputId);
  const tags=[...new Set([...allTagsOf(field),...cur])].sort((a,b)=>a.localeCompare(b));
  if(!tags.length){el.innerHTML='<span class="hint">'+emptyMsg+'</span>';return;}
  el.innerHTML=tags.map(tg=>`<span class="tagchip ${cls} ${cur.includes(tg)?'on':''}" data-tag="${esc(tg)}">${cur.includes(tg)?'✓ ':''}${esc(tg)}</span>`).join('');
  el.querySelectorAll('.tagchip').forEach(c=>c.onclick=()=>{
    let now=inputTags(inputId);
    const tg=c.dataset.tag;
    if(now.includes(tg))now=now.filter(x=>x!==tg);else now.push(tg);
    $(inputId).value=now.join(', ');
    renderTagSuggest();
  });
}
export function renderTagSuggest(){
  renderTagSuggestOne('tTags','tagSuggest','tags','g','Zatiaľ žiadne pozitívne tagy – napíš prvý hore (napr. A+ setup, dodržaný plán).');
  renderTagSuggestOne('tTagsNeg','tagSuggestNeg','tagsNeg','r','Zatiaľ žiadne negatívne tagy – napíš prvý hore (napr. FOMO, posunutý stop).');
}
['tEntry','tExit','tStop','tTarget','tTimeIn','tTimeOut','tSymbol'].forEach(id=>{
  document.addEventListener('change',e=>{if(e.target.id===id)renderModalChart();});
});
export async function saveTrade(){
  const t=formTrade();
  if(!t.symbol){toast('Zadaj symbol');return;}
  if(!t.tEntry){toast('Zadaj čas vstupu');return;}
  if(!isFinite(t.entry)&&t.pnlOverride==null){toast('Zadaj vstupnú cenu alebo manuálne P&L');return;}
  if(state.currentTradeId!=null){
    t.id=state.currentTradeId;
    const old=state.trades.find(x=>x.id===state.currentTradeId);
    t.createdAt=old?old.createdAt:Date.now();
    if(old&&old.aiReview)t.aiReview=old.aiReview; // formTrade() ho nepozná, nech sa nestratí
    await idbPut('trades',t);
    state.trades=state.trades.map(x=>x.id===t.id?t:x);
  }else{
    t.createdAt=Date.now();
    const id=await idbAdd('trades',t);
    t.id=id;state.trades.push(t);
  }
  for(const rid of state.removedShotIds)await idbDel('shots',rid);
  for(const s of state.pendingShots){
    if(s.id==null){await idbAdd('shots',{tradeId:t.id,blob:s.blob,added:Date.now()});}
  }
  closeTrade();
  renderAfterTradeChange();
  scheduleAutoSync();
  toast('Obchod uložený');
}
/* ---- AI rozbor jedného obchodu ---- */
export function shrinkImageBlob(blob,maxDim){
  return new Promise(res=>{
    const url=URL.createObjectURL(blob),img=new Image();
    img.onload=()=>{
      const scale=Math.min(1,maxDim/Math.max(img.width,img.height));
      const c=document.createElement('canvas');
      c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);
      c.getContext('2d').drawImage(img,0,0,c.width,c.height);
      URL.revokeObjectURL(url);
      try{res(c.toDataURL('image/jpeg',0.82));}catch(e){res(null);}
    };
    img.onerror=()=>{URL.revokeObjectURL(url);res(null);};
    img.src=url;
  });
}
export function buildTradeReviewData(t){
  const pnl=computePnl(t),r=riskR(t),xRaw=excursionFor(t);
  const x=xRaw&&!xRaw.mismatch?xRaw:null;
  const strat=t.strategyId!=null?strategyById(t.strategyId):null;
  const barsPayload=(()=>{
    const cands=datasetsForSymbol(t.symbol);
    if(!cands.length||!t.tEntry)return null;
    let best=null;
    for(const d of cands){
      const tf=TF_SEC[d.tf]||300;
      if(!best||tf<best.tfSec)best={tfSec:tf,tf:d.tf,bars:d.bars||[]};
    }
    if(!best)return null;
    const t2=t.tExit||t.tEntry;
    const from=t.tEntry-best.tfSec*40,to=t2+best.tfSec*20;
    const sel=best.bars.filter(b=>b.t>=from&&b.t<=to).slice(0,140);
    if(!sel.length)return null;
    const rnd=v=>Math.round(v*100)/100;
    return {timeframe:best.tf,format:'[cas_ISO,open,high,low,close]',
      bars:sel.map(b=>[new Date(b.t*1000).toISOString(),rnd(b.o),rnd(b.h),rnd(b.l),rnd(b.c)])};
  })();
  return {
    obchod:{
      symbol:String(t.symbol).toUpperCase(),smer:t.dir===1?'LONG':'SHORT',mnozstvo:t.qty||1,
      vstup:t.entry,vystup:t.exit,stopLoss:t.stop,takeProfit:t.target,
      casVstupu:t.tEntry?new Date(t.tEntry*1000).toISOString():null,
      casVystupu:t.tExit?new Date(t.tExit*1000).toISOString():null,
      trvanieMinut:t.tExit&&t.tEntry?Math.round((t.tExit-t.tEntry)/60):null,
      session:sessionOf(t),pnl:+pnl.toFixed(2),rMultiple:r!=null?+r.toFixed(2):null,poplatky:t.fees||0,
    },
    excursion:x?{
      maxProtiTebe:+x.maeMoney.toFixed(2),maxProtiTebeR:x.maeR!=null?+x.maeR.toFixed(2):null,
      maxVTvojProspech:+x.mfeMoney.toFixed(2),maxVTvojProspechR:x.mfeR!=null?+x.mfeR.toFixed(2):null,
      nechaneNaStole:pnl>0?+x.leftOnTable.toFixed(2):null,
    }:null,
    strategia:strat?{nazov:strat.name,
      pravidla:(strat.rules||[]).map(rule=>({pravidlo:rule,dodrzane:(t.checkedRules||[]).includes(rule)}))}:null,
    emocie:{priVstupe:emotionLabel(t.emotionIn),priVystupe:emotionLabel(t.emotionOut)},
    tagy:{pozitivne:t.tags||[],negativne:t.tagsNeg||[]},
    mojePoznamky:t.notes||null,
    svieckyOkoloObchodu:barsPayload,
  };
}
/* Predvolený inštrukčný text pre "AI rozbor obchodu" - editovateľný v Nastaveniach
   (state.settings.aiReviewPromptTemplate, prázdne = použiť tento default).
   {{JAZYK}} appka nahradí aktuálnym jazykom appky (SK/EN); dáta obchodu (JSON) a
   veta o sviečkach sa vždy pripájajú automaticky za tento text, nie sú jeho súčasťou. */
export const DEFAULT_TRADE_REVIEW_PROMPT=
  `Si skúsený trading kouč. Nižšie sú presné dáta jedného obchodu z trading journalu `+
  `(čísla počítala appka, sú spoľahlivé). Ak sú priložené obrázky, sú to screenshoty grafu k tomuto obchodu.\n\n`+
  `Napíš rozbor v tejto štruktúre:\n`+
  `1. ČO SI SPRAVIL DOBRE – 1-3 konkrétne body\n`+
  `2. ČO SI SPRAVIL ZLE – 1-3 konkrétne body\n`+
  `3. ODPORÚČANIE NABUDÚCE – 1-2 vety, konkrétne a vykonateľné\n\n`+
  `Opieraj sa o čísla (MAE/MFE, R-multiple, dodržanie pravidiel, načasovanie). Žiadne všeobecné frázy typu "riaď si riziko". `+
  `Ak dáta na nejaký záver nestačia, radšej to povedz, než by si si vymýšľal. Odpíš v jazyku: {{JAZYK}}.`;
export function buildTradeReviewPrompt(template,langName,hasCandles,data){
  const base=(template||DEFAULT_TRADE_REVIEW_PROMPT).replace('{{JAZYK}}',langName);
  return base+(hasCandles?` Nižšie sú aj sviečky pred vstupom a počas obchodu.`:``)+
    `\n\nDáta (JSON):\n${JSON.stringify(data)}`;
}
export function saveAiReviewModel(){state.settings.aiReviewModel=$('tAiReviewModel').value;saveSettings();}
export async function aiReviewTrade(){
  if(!state.settings.anthropicKey){toast(tr('Najprv si v Nastaveniach ulož svoj Anthropic API kľúč'));return;}
  const btn=$('tAiReviewBtn'),body=$('tAiReviewBody');
  const t=formTrade();
  if(!t.symbol||!t.tEntry){toast(tr('Zadaj symbol a čas vstupu'));return;}
  const data=buildTradeReviewData(t);
  btn.disabled=true;btn.textContent=tr('Analyzujem…');
  body.innerHTML=`<div class="hint">${esc(tr('Čakám na odpoveď od Claude…'))}</div>`;
  const langName=state.settings.lang==='en'?'English':'Slovak';
  const promptText=buildTradeReviewPrompt(state.settings.aiReviewPromptTemplate,langName,!!data.svieckyOkoloObchodu,data);
  const content=[];
  try{
    const shots=state.currentTradeId!=null?await shotsByTrade(state.currentTradeId):[];
    for(const sh of shots.slice(0,3)){
      const dataUrl=await shrinkImageBlob(sh.blob,1400);
      const m=dataUrl&&/^data:([^;]+);base64,(.+)$/.exec(dataUrl);
      if(m)content.push({type:'image',source:{type:'base64',media_type:m[1],data:m[2]}});
    }
  }catch(e){}
  content.push({type:'text',text:promptText});
  try{
    const res=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'content-type':'application/json','x-api-key':state.settings.anthropicKey,
        'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
      body:JSON.stringify({
        model:state.settings.aiReviewModel||'claude-sonnet-5',
        max_tokens:3200,
        thinking:{type:'disabled'},
        messages:[{role:'user',content}],
      }),
    });
    const d=await res.json();
    if(!res.ok)throw new Error((d&&d.error&&d.error.message)||('HTTP '+res.status));
    const text=(d.content||[]).map(c=>c.text||'').join('').trim();
    if(!text){body.innerHTML=`<div class="hint" style="color:var(--red)">${esc(tr('Prázdna odpoveď.'))}</div>`;return;}
    const review={text,at:Date.now(),model:state.settings.aiReviewModel||'claude-sonnet-5',images:content.length-1};
    renderAiReview(review);
    if(state.currentTradeId!=null){ // ulož, nech sa nemusí (a neplatí) generovať znova
      const stored=state.trades.find(x=>x.id===state.currentTradeId);
      if(stored){stored.aiReview=review;await idbPut('trades',stored);scheduleAutoSync();}
    }
  }catch(e){
    body.innerHTML=`<div class="hint" style="color:var(--red)">${esc(tr('Chyba:'))} ${esc(e&&e.message?e.message:tr('neznáma chyba'))}</div>`;
  }finally{
    btn.disabled=false;btn.textContent='🤖 '+tr('Rozobrať tento obchod');
  }
}
export function renderAiReview(review){
  const body=$('tAiReviewBody');
  if(!body)return;
  if(!review||!review.text){body.innerHTML='';return;}
  const when=new Date(review.at).toLocaleString(state.settings.lang==='en'?'en-GB':'sk-SK');
  body.innerHTML=`<div class="patRow neutral" style="white-space:pre-wrap;line-height:1.6">${esc(review.text)}</div>`+
    `<div class="hint" style="margin-top:6px">${esc(when)} · ${esc(review.model||'')}`+
    (review.images?` · ${review.images} ${esc(tr('screenshotov'))}`:'')+`</div>`;
}
export async function deleteCurrentTrade(){
  if(state.currentTradeId==null)return;
  const id=state.currentTradeId;
  closeTrade();
  await delTrade(id);
}

/* ---- screenshots ---- */
export function renderShots(){
  const el=$('shotList');
  el.innerHTML='';
  state.pendingShots.forEach((s,i)=>{
    const url=URL.createObjectURL(s.blob);
    const div=document.createElement('div');
    div.className='shot';
    div.innerHTML=`<img src="${url}"><button title="Odstrániť">✕</button>`;
    div.querySelector('img').onclick=()=>{$('lightboxImg').src=url;$('lightbox').classList.add('open');};
    div.querySelector('button').onclick=()=>{
      if(s.id!=null)state.removedShotIds.push(s.id);
      state.pendingShots.splice(i,1);renderShots();
    };
    el.appendChild(div);
  });
  if(!state.pendingShots.length)el.innerHTML='<span class="hint">Žiadne screenshoty</span>';
}
export function addShotFiles(files){
  for(const f of files){
    if(f&&f.type&&f.type.startsWith('image/')){state.pendingShots.push({id:null,blob:f});}
  }
  renderShots();
}
export function bindGlobal(){
  $('shotFile').addEventListener('change',e=>{addShotFiles(e.target.files);e.target.value='';});
  const dz=$('dropzone');
  dz.addEventListener('dragover',e=>{e.preventDefault();dz.classList.add('drag');});
  dz.addEventListener('dragleave',()=>dz.classList.remove('drag'));
  dz.addEventListener('drop',e=>{e.preventDefault();dz.classList.remove('drag');addShotFiles(e.dataTransfer.files);});
  document.addEventListener('paste',e=>{
    if(!$('tradeOverlay').classList.contains('open'))return;
    const items=e.clipboardData&&e.clipboardData.items;
    if(!items)return;
    const files=[];
    for(const it of items){if(it.type&&it.type.startsWith('image/'))files.push(it.getAsFile());}
    if(files.length){addShotFiles(files);toast('Screenshot vložený');}
  });
  $('csvFile').addEventListener('change',e=>{if(e.target.files[0])loadCsvForImport(e.target.files[0]);});
  $('tradeOverlay').addEventListener('mousedown',e=>{if(e.target===$('tradeOverlay'))closeTrade();});
  $('aiChatOverlay').addEventListener('mousedown',e=>{if(e.target===$('aiChatOverlay'))closeAiChat();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeTrade();closeAiChat();$('lightbox').classList.remove('open');}});
}

/* ---- modal chart ---- */
export const TF_SEC={'1m':60,'5m':300,'15m':900,'30m':1800,'1h':3600,'4h':14400,'1d':86400};
export function destroyModalChart(){if(state.modalChart){state.modalChart.remove();state.modalChart=null;}
  if(state.modalChartRsi){state.modalChartRsi.remove();state.modalChartRsi=null;}
  $('tChartRsi').style.display='none';
  const c=$('tChart');[...c.children].forEach(ch=>{if(ch.id!=='tChartHint')ch.remove();});}
export function symBase(s){
  s=String(s||'').toUpperCase();
  const m=s.match(/^([A-Z]{1,4})[FGHJKMNQUVXZ]\d{1,2}$/);
  if(m)return m[1];
  return s.replace(/[^A-Z].*$/,'');
}
export function datasetsForSymbol(sym){
  const s=String(sym||'').toUpperCase().trim();
  const b=symBase(s);
  return state.ohlcSets.filter(d=>{
    const ds=String(d.symbol).toUpperCase();
    return ds===s||ds===b||s.startsWith(ds)||ds.startsWith(b)&&b.length>0;
  });
}
export function pickDataset(sym,tEntry,tExit){
  const cands=datasetsForSymbol(sym);
  if(!cands.length)return null;
  const dur=Math.max((tExit||tEntry)-(tEntry||0),60);
  let best=null,bestScore=Infinity;
  for(const d of cands){
    const tf=TF_SEC[d.tf]||300;
    const bars=dur/tf;
    const score=Math.abs(Math.log((bars||1)/40)); // ideal ~40 bars for trade duration
    if(score<bestScore){bestScore=score;best=d;}
  }
  return best;
}
export const TF_LIST=['1m','5m','15m','30m'];
export function renderTfBar(sym,activeTf){
  const bar=$('tfBar');
  if(!sym){bar.innerHTML='';return;}
  bar.innerHTML=TF_LIST.map(tf=>`<button type="button" class="tfBtn${tf===activeTf?' on':''}" data-tf="${tf}">${tf}</button>`).join('')+
    `<button class="btn secondary small" id="btnAutoFetch" style="margin-left:6px">⟳ Stiahnuť sviečky</button>`+
    `<button type="button" class="btn secondary small" id="btnOpenTv" style="margin-left:6px" title="${esc(tr('Otvorí graf na TradingView (symbol a timeframe). Vstup/výstup si tam appka dokresliť nevie.'))}">↗ TradingView</button>`;
  bar.querySelectorAll('.tfBtn').forEach(b=>b.onclick=()=>selectTf(b.dataset.tf));
  const fb=$('btnAutoFetch');
  if(fb)fb.onclick=autoFetchForTrade;
  const tv=$('btnOpenTv');
  if(tv)tv.onclick=openInTradingView;
}
export function tvSymbolFor(sym){
  const s=String(sym||'').toUpperCase().trim();
  // MGCQ6 / NQZ5 … kontrakt s expiráciou -> priebežný kontrakt (MGC1!), inak symbol tak, ako je
  return /^[A-Z]{1,4}[FGHJKMNQUVXZ]\d{1,2}$/.test(s)?symBase(s)+'1!':s;
}
export function openInTradingView(){
  const t=formTrade();
  if(!t.symbol){toast('Zadaj symbol');return;}
  const iv={'1m':'1','5m':'5','15m':'15','30m':'30'}[state.modalChartTf]||'5';
  // TradingView nevie cez URL skočiť na konkrétny čas – dátum preto pošleme do
  // schránky, nech ho stačí v TV vložiť do „Go to" (Alt+G).
  if(t.tEntry){
    const d=new Date(t.tEntry*1000),p=n=>String(n).padStart(2,'0');
    const stamp=`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
    try{
      navigator.clipboard.writeText(stamp)
        .then(()=>toast(tr('Dátum obchodu skopírovaný – v TradingView stlač Alt+G a vlož')))
        .catch(()=>{});
    }catch(e){}
  }
  window.open('https://www.tradingview.com/chart/?symbol='+encodeURIComponent(tvSymbolFor(t.symbol))+'&interval='+iv,'_blank','noopener');
}
export async function selectTf(tf){
  const t=formTrade();
  if(!t.symbol||!t.tEntry){toast('Zadaj symbol a čas vstupu');return;}
  state.modalChartTf=tf;
  const exist=datasetsForSymbol(t.symbol).find(d=>d.tf===tf);
  if(exist){$('tChartDsWrap').dataset.chosen=exist.key;renderModalChart();return;}
  await fetchTfForTrade(tf);
}
/* ---- indicators ---- */
export function renderIndBar(hasVolume){
  const bar=$('indBar');
  if(!bar)return;
  const item=(key,label,periodKey)=>{
    const disabled=key==='vwap'&&!hasVolume;
    const periodInput=periodKey?`<input type="number" class="indPeriod" data-ind="${periodKey}" value="${state.modalIndicators[periodKey]}" min="2" max="500" title="Perióda" style="width:46px;padding:4px 5px;font-size:12px;background:var(--bg3);border:1px solid var(--border);color:var(--text);border-radius:6px">`:'';
    return `<span style="display:inline-flex;align-items:center;gap:3px"><button type="button" class="tfBtn${state.modalIndicators[key]?' on':''}" data-ind="${key}"${disabled?' disabled title="Dataset nemá dáta o objeme (volume)"':''}>${label}</button>${periodInput}</span>`;
  };
  bar.innerHTML=item('sma','SMA','smaPeriod')+item('ema','EMA','emaPeriod')+item('vwap','VWAP')+item('rsi','RSI','rsiPeriod');
  bar.querySelectorAll('.tfBtn').forEach(b=>{
    if(b.disabled)return;
    b.onclick=()=>{state.modalIndicators[b.dataset.ind]=!state.modalIndicators[b.dataset.ind];renderModalChart();};
  });
  bar.querySelectorAll('.indPeriod').forEach(inp=>{
    inp.onclick=e=>e.stopPropagation();
    inp.onchange=()=>{
      const key=inp.dataset.ind;
      state.modalIndicators[key]=Math.max(2,Math.round(num(inp.value))||state.modalIndicators[key]);
      const ind=key.replace('Period','');
      if(state.modalIndicators[ind])renderModalChart();
    };
  });
}
export function calcSMA(bars,period){
  const out=[];let sum=0;
  for(let i=0;i<bars.length;i++){
    sum+=bars[i].c;
    if(i>=period)sum-=bars[i-period].c;
    if(i>=period-1)out.push({time:bars[i]._time,value:sum/period});
  }
  return out;
}
export function calcEMA(bars,period){
  const out=[];const k=2/(period+1);let prev=null,sum=0;
  for(let i=0;i<bars.length;i++){
    if(prev==null){
      sum+=bars[i].c;
      if(i===period-1){prev=sum/period;out.push({time:bars[i]._time,value:prev});}
    }else{
      prev=bars[i].c*k+prev*(1-k);
      out.push({time:bars[i]._time,value:prev});
    }
  }
  return out;
}
export function calcVWAP(bars){
  const out=[];let cumPV=0,cumV=0,curDay=null;
  for(const b of bars){
    const dk=dayKey(b.t);
    if(dk!==curDay){curDay=dk;cumPV=0;cumV=0;}
    const typical=(b.h+b.l+b.c)/3,vol=b.v||0;
    cumPV+=typical*vol;cumV+=vol;
    out.push({time:b._time,value:cumV>0?cumPV/cumV:typical});
  }
  return out;
}
export function calcRSI(bars,period){
  const out=[];let avgGain=null,avgLoss=null,gsum=0,lsum=0;
  for(let i=1;i<bars.length;i++){
    const diff=bars[i].c-bars[i-1].c;
    const gain=diff>0?diff:0,loss=diff<0?-diff:0;
    if(avgGain==null){
      gsum+=gain;lsum+=loss;
      if(i===period){avgGain=gsum/period;avgLoss=lsum/period;}
    }else{
      avgGain=(avgGain*(period-1)+gain)/period;
      avgLoss=(avgLoss*(period-1)+loss)/period;
    }
    if(avgGain!=null){
      const rsi=avgLoss===0?100:100-100/(1+avgGain/avgLoss);
      out.push({time:bars[i]._time,value:rsi});
    }
  }
  return out;
}
/* Position-tool zóny (ako v TradingView): priesvitné obdĺžniky cez čas trvania
   obchodu – riziko (vstup→SL), cieľ (vstup→TP) a reálny výsledok (vstup→výstup). */
export class TradeZonesPrimitive{
  constructor(o){this._o=o;this._chart=null;this._series=null;}
  attached(p){this._chart=p.chart;this._series=p.series;}
  detached(){this._chart=null;this._series=null;}
  updateAllViews(){}
  paneViews(){
    const self=this;
    return [{zOrder:()=>'bottom',renderer:()=>({draw:target=>self._draw(target)})}];
  }
  _draw(target){
    const chart=this._chart,series=this._series,o=this._o;
    if(!chart||!series)return;
    let x1=chart.timeScale().timeToCoordinate(o.t1),x2=chart.timeScale().timeToCoordinate(o.t2);
    if(x1==null||x2==null)return;
    if(x2<x1){const tmp=x1;x1=x2;x2=tmp;}
    if(x2-x1<6)x2=x1+6; // veľmi krátke obchody nech nezmiznú do vlásočnice
    const yOf=p=>(p==null||!isFinite(p))?null:series.priceToCoordinate(p);
    const yE=yOf(o.entry);
    if(yE==null)return;
    const boxes=[];
    const push=(price,fill,stroke,w)=>{const y=yOf(price);if(y!=null)boxes.push({y,fill,stroke,w});};
    if(o.stop!=null)push(o.stop,'rgba(239,83,80,.14)','rgba(239,83,80,.5)',1);
    if(o.target!=null)push(o.target,'rgba(38,166,154,.14)','rgba(38,166,154,.5)',1);
    if(o.exit!=null){
      const win=o.pnl>=0;
      push(o.exit,win?'rgba(38,166,154,.20)':'rgba(239,83,80,.20)',win?'rgba(38,166,154,.95)':'rgba(239,83,80,.95)',2);
    }
    target.useMediaCoordinateSpace(scope=>{
      const ctx=scope.context;
      ctx.save();
      for(const b of boxes){
        const top=Math.min(yE,b.y),h=Math.abs(b.y-yE);
        ctx.fillStyle=b.fill;ctx.fillRect(x1,top,x2-x1,h);
        ctx.strokeStyle=b.stroke;ctx.lineWidth=b.w;ctx.strokeRect(x1,top,x2-x1,h);
      }
      ctx.restore();
    });
  }
}
export function renderModalChart(){
  if(!$('tradeOverlay').classList.contains('open'))return;
  destroyModalChart();
  const hint=$('tChartHint');
  const t=formTrade();
  const wrap=$('tChartDsWrap');
  if(typeof LightweightCharts==='undefined'){hint.textContent='Knižnica grafu sa nenačítala (skontroluj internetové pripojenie).';hint.style.display='flex';wrap.innerHTML='';renderTfBar(null);return;}
  const cands=t.symbol?datasetsForSymbol(t.symbol):[];
  let ds=null;
  if(cands.length){
    ds=cands.find(d=>d.key===wrap.dataset.chosen)||(state.modalChartTf&&cands.find(d=>d.tf===state.modalChartTf))||pickDataset(t.symbol,t.tEntry,t.tExit);
  }
  if(ds&&!state.modalChartTf)state.modalChartTf=ds.tf;
  // dataset selector (only shown when several datasets share the same timeframe) + timeframe quick-buttons
  const sameTf=cands.filter(d=>d.tf===(ds?ds.tf:state.modalChartTf));
  if(sameTf.length>1){
    const selId='dsSelect';
    const cur=wrap.dataset.chosen||'';
    wrap.innerHTML=' – dataset: <select id="'+selId+'" style="padding:3px 6px;font-size:12px">'+
      sameTf.map(d=>`<option value="${esc(d.key)}" ${d.key===cur?'selected':''}>${esc(d.symbol)} ${esc(d.tf)} (${d.bars.length} sviečok)</option>`).join('')+'</select>';
    $(selId).onchange=e=>{wrap.dataset.chosen=e.target.value;renderModalChart();};
  }else wrap.innerHTML='';
  renderTfBar(t.symbol,ds?ds.tf:state.modalChartTf);
  if(!ds||!t.tEntry){
    hint.innerHTML=t.symbol
      ?`Pre symbol <b>${esc(String(t.symbol).toUpperCase())}</b> nie sú žiadne OHLC dáta${modalChartTf?' (timeframe '+esc(modalChartTf)+')':''}.<br>Klikni hore na <b>„⟳ Stiahnuť sviečky"</b> (Yahoo Finance, automaticky) alebo nahraj CSV v záložke <b>Dáta grafu</b>.`
      :'Zadaj symbol a čas vstupu.';
    hint.style.display='flex';
    renderIndBar(false);
    return;
  }
  const tf=TF_SEC[ds.tf]||300;
  const t1=t.tEntry,t2=t.tExit||t.tEntry;
  const padBars=100;
  const pad=Math.max(tf*padBars,(t2-t1));
  // Zoom sa prispôsobí dĺžke obchodu, nech nie je stratený v širokom okne;
  // `pad` ostáva veľký len na kontrolu, či dataset vôbec pokrýva čas obchodu.
  const padView=Math.max(tf*8,Math.min((t2-t1)*0.9,tf*60));
  const inRange=ds.bars.some(b=>b.t>=t1-pad&&b.t<=t2+pad);
  if(!inRange){
    hint.innerHTML=`Dataset <b>${esc(ds.symbol)} ${esc(ds.tf)}</b> nepokrýva čas tohto obchodu (${fmtDT(t1)}).`;
    hint.style.display='flex';renderIndBar(false);return;
  }
  hint.style.display='none';
  const tzOff=ts=>ts-new Date(ts*1000).getTimezoneOffset()*60;
  const barsAll=ds.bars.map(b=>({...b,_time:tzOff(b.t)}));
  const hasVolume=barsAll.some(b=>isFinite(b.v)&&b.v>0);
  if(!hasVolume)state.modalIndicators.vwap=false;
  renderIndBar(hasVolume);
  state.modalChart=LightweightCharts.createChart($('tChart'),{
    layout:{background:{color:cssVar('--bg')},textColor:cssVar('--muted')},
    grid:{vertLines:{color:cssVar('--bg3')},horzLines:{color:cssVar('--bg3')}},
    timeScale:{timeVisible:true,secondsVisible:false,borderColor:cssVar('--border')},
    rightPriceScale:{borderColor:cssVar('--border'),scaleMargins:{top:0.1,bottom:0.08}},
    autoSize:true,
  });
  const series=state.modalChart.addCandlestickSeries({
    upColor:'#26a69a',downColor:'#ef5350',borderVisible:false,wickUpColor:'#26a69a',wickDownColor:'#ef5350',
  });
  series.setData(barsAll.map(b=>({time:b._time,open:b.o,high:b.h,low:b.l,close:b.c})));
  if(state.modalIndicators.sma){
    const s=state.modalChart.addLineSeries({color:'#f5a623',lineWidth:2,priceLineVisible:false,lastValueVisible:false});
    s.setData(calcSMA(barsAll,state.modalIndicators.smaPeriod));
  }
  if(state.modalIndicators.ema){
    const s=state.modalChart.addLineSeries({color:'#7c5bef',lineWidth:2,priceLineVisible:false,lastValueVisible:false});
    s.setData(calcEMA(barsAll,state.modalIndicators.emaPeriod));
  }
  if(state.modalIndicators.vwap&&hasVolume){
    const s=state.modalChart.addLineSeries({color:'#26a69a',lineWidth:2,priceLineVisible:false,lastValueVisible:false});
    s.setData(calcVWAP(barsAll));
  }
  const markers=[];
  const near=ts=>{let best=barsAll[0].t,bd=Infinity;for(const b of barsAll){const d=Math.abs(b.t-ts);if(d<bd){bd=d;best=b.t;}}return tzOff(best);};
  const pnl=computePnl(t);
  const hasExit=isFinite(t.exit)&&!!t.tExit;
  if(isFinite(t.entry)){
    markers.push({time:near(t1),position:t.dir===1?'belowBar':'aboveBar',color:t.dir===1?'#26a69a':'#ef5350',shape:t.dir===1?'arrowUp':'arrowDown',size:2,text:tr('Vstup')+' '+t.entry});
    series.createPriceLine({price:t.entry,color:'#5b8def',lineWidth:2,lineStyle:0,title:tr('Vstup')});
  }
  if(hasExit){
    markers.push({time:near(t2),position:t.dir===1?'aboveBar':'belowBar',color:pnl>=0?'#26a69a':'#ef5350',shape:t.dir===1?'arrowDown':'arrowUp',size:2,text:tr('Výstup')+' '+t.exit});
    series.createPriceLine({price:t.exit,color:pnl>=0?'#26a69a':'#ef5350',lineWidth:2,lineStyle:0,title:tr('Výstup')});
  }
  if(t.stop!=null)series.createPriceLine({price:t.stop,color:'#ef5350',lineWidth:2,lineStyle:3,title:'SL'});
  if(t.target!=null)series.createPriceLine({price:t.target,color:'#26a69a',lineWidth:2,lineStyle:3,title:'TP'});
  markers.sort((a,b)=>a.time-b.time);
  series.setMarkers(markers);
  if(isFinite(t.entry)&&typeof series.attachPrimitive==='function'){
    try{
      series.attachPrimitive(new TradeZonesPrimitive({
        t1:near(t1),t2:hasExit?near(t2):near(t1),
        entry:t.entry,exit:hasExit?t.exit:null,stop:t.stop,target:t.target,pnl,
      }));
    }catch(e){}
  }
  try{state.modalChart.timeScale().setVisibleRange({from:tzOff(t1-padView),to:tzOff(t2+padView)});}
  catch(e){state.modalChart.timeScale().fitContent();}
  if(state.modalIndicators.rsi){
    $('tChartRsi').style.display='block';
    state.modalChartRsi=LightweightCharts.createChart($('tChartRsi'),{
      layout:{background:{color:cssVar('--bg')},textColor:cssVar('--muted')},
      grid:{vertLines:{color:cssVar('--bg3')},horzLines:{color:cssVar('--bg3')}},
      timeScale:{timeVisible:true,secondsVisible:false,borderColor:cssVar('--border')},
      rightPriceScale:{borderColor:cssVar('--border'),scaleMargins:{top:0.15,bottom:0.15}},
      autoSize:true,
    });
    const rsiSeries=state.modalChartRsi.addLineSeries({color:'#e91e63',lineWidth:1.5,priceLineVisible:false,lastValueVisible:false});
    rsiSeries.setData(calcRSI(barsAll,state.modalIndicators.rsiPeriod));
    rsiSeries.createPriceLine({price:70,color:cssVar('--muted'),lineWidth:1,lineStyle:3,title:'70'});
    rsiSeries.createPriceLine({price:30,color:cssVar('--muted'),lineWidth:1,lineStyle:3,title:'30'});
    state.modalChartRsi.timeScale().setVisibleRange({from:tzOff(t1-padView),to:tzOff(t2+padView)});
    state.modalChart.timeScale().subscribeVisibleLogicalRangeChange(r=>{
      if(state.modalSyncing||!r||!state.modalChartRsi)return;state.modalSyncing=true;
      state.modalChartRsi.timeScale().setVisibleLogicalRange(r);state.modalSyncing=false;
    });
    state.modalChartRsi.timeScale().subscribeVisibleLogicalRangeChange(r=>{
      if(state.modalSyncing||!r||!state.modalChart)return;state.modalSyncing=true;
      state.modalChart.timeScale().setVisibleLogicalRange(r);state.modalSyncing=false;
    });
  }
}
