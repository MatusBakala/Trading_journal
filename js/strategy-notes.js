import { activeStartBalance } from './accounts.js';
import { shotsByTrade, idbAdd, idbAll, idbDel, idbGet, idbPut, stratShotsByStrategy } from './db.js';
import { scheduleAutoSync, gdriveSetLastLocalChange } from './gdrive.js';
import { ask, tr, trHtml } from './i18n.js';
import { goToTab } from './tabs.js';
import { renderTrades, tradeTableHTML } from './trades-list.js';
import { fmtDT, fmtMoney, toast } from './utils.js';
import { blobToB64 } from './settings.js';
import { state } from './state.js';
import { avg } from './stats.js';
import { TF_SEC, datasetsForSymbol, openTrade } from './trade-modal.js';
import { $, computePnl, esc, isClosed, moneyCls, multFor } from './utils.js';

/* ================= Strategy notes: formatting + inline images ================= */
export function renderNotesHTML(text,imgMap){
  imgMap=imgMap||{};
  const blocks=String(text||'').split(/\n\s*\n/);
  let out='';
  for(const block of blocks){
    const t=block.trim();
    if(!t)continue;
    const imgMatch=t.match(/^\[IMG:(\d+)\]$/);
    if(imgMatch){
      const url=imgMap[imgMatch[1]];
      out+=url?`<div class="stratDiagram"><img src="${url}" style="max-width:100%;display:block;border-radius:6px"></div>`
        :`<div class="hint">${esc(tr('(obrázok bol odstránený)'))}</div>`;
      continue;
    }
    const lines=t.split('\n').map(l=>l.trim()).filter(Boolean);
    if(lines.length===1&&lines[0]===lines[0].toUpperCase()&&/[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ]/.test(lines[0])&&lines[0].length<60){
      out+=`<h3 style="margin-top:18px;margin-bottom:8px;color:var(--text);font-size:15px">${esc(lines[0])}</h3>`;
      continue;
    }
    if(lines.every(l=>l.startsWith('- '))){
      out+=`<ul style="margin:6px 0 6px 20px;line-height:1.6">${lines.map(l=>`<li>${esc(l.slice(2))}</li>`).join('')}</ul>`;
      continue;
    }
    out+=`<p style="margin:6px 0;line-height:1.6">${esc(t).replace(/\n/g,'<br>')}</p>`;
  }
  return out;
}
export function defaultStrategiesFingerprint(defs){
  return defs.map(s=>[
    s.name||'',
    s.description||'',
    (s.rules||[]).join('\n'),
    s.notes||''
  ].join('\x1e')).join('\x1f');
}
export async function seedDefaultStrategies(){
  // DEFAULT_STRATEGIES is a 2.7MB module (embedded base64 images) - skip importing it
  // entirely once already seeded for the currently deployed app-version.json (bumped
  // whenever DEFAULT_STRATEGIES changes, see CLAUDE.md).
  const appVersion=String(window.__TJ_APP_VERSION__||'');
  const storedVersion=await idbGet('kv','defaultStrategiesAppVersion');
  const prevAppVersion=storedVersion&&storedVersion.v!=null?String(storedVersion.v):'';
  const seededFlag=await idbGet('kv','defaultStrategiesSeeded');
  if(seededFlag&&seededFlag.v&&appVersion&&appVersion===prevAppVersion)return;
  const {DEFAULT_STRATEGIES}=await import('./data/default-strategies.js');
  const fp=defaultStrategiesFingerprint(DEFAULT_STRATEGIES);
  const stored=await idbGet('kv','defaultStrategiesFingerprint');
  const prevFp=stored&&stored.v!=null?String(stored.v):'';
  const syncBuiltIns=prevFp!==fp;
  let changed=false;
  for(const def of DEFAULT_STRATEGIES){
    const existing=state.strategies.find(s=>s.name===def.name);
    if(existing){
      if(syncBuiltIns){
        existing.description=def.description;
        existing.rules=def.rules?def.rules.slice():[];
        existing.notes=def.notes||'';
        await idbPut('strategies',existing);
        changed=true;
      }
    }else{
      const id=await idbAdd('strategies',Object.assign({},def));
      state.strategies.push(Object.assign({},def,{id}));
      changed=true;
    }
  }
  if(changed||syncBuiltIns){
    state.strategies=await idbAll('strategies');
    await idbPut('kv',{k:'defaultStrategiesFingerprint',v:fp});
    await idbPut('kv',{k:'defaultStrategiesSeeded',v:true});
    await idbDel('kv','defaultStrategiesRevision');
    if(typeof gdriveSetLastLocalChange==='function')gdriveSetLastLocalChange();
  }
  await idbPut('kv',{k:'defaultStrategiesAppVersion',v:appVersion});
}
export function strategyById(id){return id==null?null:state.strategies.find(s=>s.id===id)||null;}
export function strategyNameOf(t){const s=strategyById(t.strategyId);return s?s.name:'– (bez stratégie)';}
export function refreshStrategySelects(){
  const opts=state.strategies.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('');
  const fSel=$('fStrategy');
  if(fSel){const cur=fSel.value;fSel.innerHTML='<option value="">Všetky stratégie</option>'+opts;fSel.value=cur;}
  const tSel=$('tStrategy');
  if(tSel){const cur=tSel.value;tSel.innerHTML='<option value="">– žiadna –</option>'+opts;tSel.value=cur;}
  const rSel=$('rStrategy');
  if(rSel){const cur=rSel.value;rSel.innerHTML='<option value="">Všetky stratégie</option>'+opts;rSel.value=cur;}
}
export function strategyStats(s){
  const ts=state.trades.filter(t=>t.strategyId===s.id&&isClosed(t));
  const pnls=ts.map(computePnl);
  const net=pnls.reduce((a,b)=>a+b,0);
  const wins=pnls.filter(p=>p>0).length;
  const wr=ts.length?wins/ts.length*100:0;
  const rs=ts.map(riskR).filter(r=>r!=null);
  const avgR=rs.length?avg(rs):null;
  const rules=s.rules||[];
  const withChecklist=ts.filter(t=>Array.isArray(t.checkedRules));
  const avgAdherence=(rules.length&&withChecklist.length)?avg(withChecklist.map(t=>t.checkedRules.length/rules.length))*100:null;
  return {count:ts.length,net,wr,avgR,avgAdherence,ts};
}
export function ruleOutcomeStats(ts,rule){
  const total=ts.length;
  const followed=ts.filter(t=>Array.isArray(t.checkedRules)&&t.checkedRules.includes(rule));
  const followRate=total?followed.length/total*100:0;
  const pnls=followed.map(computePnl);
  const net=pnls.reduce((a,b)=>a+b,0);
  const wins=pnls.filter(p=>p>0),losses=pnls.filter(p=>p<0);
  const gw=wins.reduce((a,b)=>a+b,0),gl=Math.abs(losses.reduce((a,b)=>a+b,0));
  const pf=gl>0?gw/gl:(gw>0?Infinity:null);
  const wr=followed.length?wins.length/followed.length*100:null;
  return {followRate,net,pf,wr,n:followed.length};
}
export function strategyRuleTable(s,ts){return (s.rules||[]).map(r=>Object.assign({rule:r},ruleOutcomeStats(ts,r)));}
export function renderStrategies(){
  refreshStrategySelects();
  const box=$('strategyCards');
  if(!box)return;
  if(state.strategyDetailId!=null){renderStrategyDetail(box);return;}
  box.className='stratGrid';
  if(!state.strategies.length){box.innerHTML='<div class="hint">Zatiaľ žiadne stratégie. Klikni na "+ Pridať stratégiu" a definuj si prvý playbook – pravidlá vstupu, ktoré chceš dodržiavať.</div>';return;}
  box.innerHTML=state.strategies.map(s=>{
    const st=strategyStats(s);
    return `<div class="stratCard" style="cursor:pointer" data-action="openStrategyDetail" data-id="${s.id}">
      <h3><span>${esc(s.name)}</span><span>
        <button class="btn secondary small" data-action="openStrategy" data-id="${s.id}">Upraviť</button>
      </span></h3>
      ${s.description?`<div class="stratDesc">${esc(tr(s.description))}</div>`:''}
      <div class="stratStats">
        <div><div class="lbl">Obchodov</div><div class="val">${st.count}</div></div>
        <div><div class="lbl">Winrate</div><div class="val">${st.count?st.wr.toFixed(0)+'%':'–'}</div></div>
        <div><div class="lbl">Priem. R</div><div class="val">${st.avgR!=null?st.avgR.toFixed(2)+'R':'–'}</div></div>
        <div><div class="lbl">Net P&L</div><div class="val ${moneyCls(st.net)}">${st.count?fmtMoney(st.net):'–'}</div></div>
        <div><div class="lbl">Dodrž. pravidiel</div><div class="val">${st.avgAdherence!=null?st.avgAdherence.toFixed(0)+'%':'–'}</div></div>
      </div>
    </div>`;
  }).join('');
}
let strategyNotesEdit=false;
let strategyRulesEdit=false;
let strategyScenariosEdit=false;
export function isHtmlNotes(text){return /<[a-z][\s\S]*>/i.test(String(text||''));}
export async function legacyNotesToHTML(text,strategyId){
  const shots=await stratShotsByStrategy(strategyId);
  const shotMap={};
  for(const sh of shots)shotMap[sh.id]=await blobToB64(sh.blob);
  const blocks=String(text||'').split(/\n\s*\n/);
  let out='';
  for(const block of blocks){
    const t=block.trim();
    if(!t)continue;
    const imgMatch=t.match(/^\[IMG:(\d+)\]$/);
    if(imgMatch){
      const data=shotMap[imgMatch[1]];
      if(data)out+=`<img src="${data}">`;
      continue;
    }
    const lines=t.split('\n').map(l=>l.trim()).filter(Boolean);
    if(lines.length===1&&lines[0]===lines[0].toUpperCase()&&/[A-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ]/.test(lines[0])&&lines[0].length<60){
      out+=`<h2>${esc(lines[0])}</h2>`;
      continue;
    }
    if(lines.every(l=>l.startsWith('- '))){
      out+=`<ul>${lines.map(l=>`<li>${esc(l.slice(2))}</li>`).join('')}</ul>`;
      continue;
    }
    out+=`<p>${esc(t).replace(/\n/g,'<br>')}</p>`;
  }
  return out;
}
export function openStrategyDetail(id){state.strategyDetailId=id;state.strategyDetailTab='rules';strategyNotesEdit=false;strategyRulesEdit=false;strategyScenariosEdit=false;renderStrategies();}
export function closeStrategyDetail(){state.strategyDetailId=null;renderStrategies();}
export function switchStrategyDetailTab(tab){state.strategyDetailTab=tab;strategyNotesEdit=false;strategyRulesEdit=false;strategyScenariosEdit=false;renderStrategies();}
export async function toggleStrategyNotesEdit(){
  if(!strategyNotesEdit&&state.strategyDetailId!=null){
    const s=strategyById(state.strategyDetailId);
    if(s&&!isHtmlNotes(s.notes)){
      const html=await legacyNotesToHTML(s.notes,state.strategyDetailId);
      s.notes=html;
      await idbPut('strategies',s);
      state.strategies=state.strategies.map(x=>x.id===s.id?s:x);
    }
  }
  strategyNotesEdit=!strategyNotesEdit;
  renderStrategies();
}
let stNotesSavedRange=null;
export function stNotesSaveRange(){
  const ed=$('stNotesEditor');
  const sel=window.getSelection();
  if(ed&&sel.rangeCount&&ed.contains(sel.anchorNode)&&ed.contains(sel.focusNode))stNotesSavedRange=sel.getRangeAt(0).cloneRange();
}
document.addEventListener('selectionchange',stNotesSaveRange);
export function stNotesRestoreRange(){
  const ed=$('stNotesEditor');
  if(!ed)return;
  ed.focus();
  if(stNotesSavedRange){
    const sel=window.getSelection();
    sel.removeAllRanges();
    sel.addRange(stNotesSavedRange);
  }
}
export const RT_DEFAULT_FONT='Helvetica';
export function rtExec(cmd,val){
  stNotesRestoreRange();
  if(cmd==='removeFormat'){
    document.execCommand('removeFormat',false,null);
    document.execCommand('unlink',false,null);
    // Some pasted content can leave a selection nested inside more than one
    // block ancestor (e.g. a <p> inside a leftover <h1>-<h6>); formatBlock only
    // fixes the innermost one, so unwrap any heading ancestors within the
    // editor by hand to make sure their default bold styling doesn't linger.
    const ed=$('stNotesEditor');
    const sel=window.getSelection();
    if(ed&&sel.rangeCount){
      let node=sel.getRangeAt(0).commonAncestorContainer;
      if(node.nodeType===3)node=node.parentElement;
      while(node&&node!==ed){
        const next=node.parentElement;
        if(node.nodeType===1&&/^H[1-6]$/.test(node.tagName)&&ed.contains(node)){
          const p=document.createElement('p');
          while(node.firstChild)p.appendChild(node.firstChild);
          node.replaceWith(p);
        }
        node=next;
      }
    }
    document.execCommand('formatBlock',false,'p');
    document.execCommand('fontName',false,RT_DEFAULT_FONT);
  }else{
    document.execCommand(cmd,false,val);
  }
  stNotesSaveRange();
  updateToolbarState();
}
export function rtLink(){
  stNotesRestoreRange();
  const url=prompt(tr('URL odkazu:'),'https://');
  if(url)document.execCommand('createLink',false,url);
  stNotesSaveRange();
}
export function rtSetFontSize(px){
  px=Math.max(8,Math.min(96,parseInt(px,10)||16));
  const box=$('rtFontSizeBox');
  if(box)box.value=px;
  stNotesRestoreRange();
  const sel=window.getSelection();
  if(!sel.rangeCount||sel.isCollapsed)return;
  const ed=$('stNotesEditor');
  // execCommand handles arbitrary/complex ranges reliably; manual Range surgery
  // (surroundContents) throws or corrupts structure on multi-paragraph/partial-overlap
  // selections, so mark with a legacy size then convert that marker to a real px style.
  document.execCommand('fontSize',false,'7');
  ed.querySelectorAll('font[size="7"]').forEach(f=>{
    f.removeAttribute('size');
    f.style.fontSize=px+'px';
  });
  stNotesSaveRange();
}
export function rtFontSizeStep(delta){
  const box=$('rtFontSizeBox');
  rtSetFontSize((box?parseInt(box.value,10):16||16)+delta);
}
export function updateToolbarState(){
  const ed=$('stNotesEditor');
  if(!ed)return;
  const sel=window.getSelection();
  if(!sel.rangeCount||!ed.contains(sel.anchorNode))return;
  ['bold','italic','strikeThrough','underline'].forEach(cmd=>{
    let active=false;
    try{active=document.queryCommandState(cmd);}catch(e){}
    document.querySelectorAll('.rtToolbar button[data-cmd="'+cmd+'"]').forEach(b=>b.classList.toggle('on',active));
  });
  const fontSel=$('rtFontNameSel');
  if(fontSel&&document.activeElement!==fontSel){
    let raw='';
    try{raw=document.queryCommandValue('fontName')||'';}catch(e){}
    const cur=raw.split(',')[0].replace(/^["']|["']$/g,'').trim().toLowerCase();
    let matched='';
    for(const opt of fontSel.options){
      if(!opt.value)continue;
      const first=opt.value.split(',')[0].replace(/^["']|["']$/g,'').trim().toLowerCase();
      if(first===cur){matched=opt.value;break;}
    }
    fontSel.value=matched;
  }
  const range=sel.getRangeAt(0);
  let node=range.startContainer;
  if(node.nodeType===3)node=node.parentElement;
  if(!ed.contains(node))node=ed;
  const headingSel=$('rtHeadingSel');
  if(headingSel&&document.activeElement!==headingSel){
    let n=node,tag='p';
    while(n&&n!==ed){
      if(n.nodeType===1&&/^H[1-3]$/.test(n.tagName)){tag=n.tagName.toLowerCase();break;}
      n=n.parentElement;
    }
    headingSel.value=tag;
  }
  const sizeBox=$('rtFontSizeBox');
  if(sizeBox&&document.activeElement!==sizeBox&&node){
    const px=parseFloat(getComputedStyle(node).fontSize);
    if(isFinite(px))sizeBox.value=Math.round(px);
  }
  if(node){
    const cs=getComputedStyle(node);
    const fgInd=$('rtFgIndicator');
    if(fgInd){
      const known=RT_COLORS.find(c=>c.fg!=='inherit'&&rtColorToHex(c.fg)===rtColorToHex(cs.color));
      fgInd.style.color=known?known.fg:'';
    }
    const bgBtn=$('rtBgIndicatorBtn');
    if(bgBtn){
      const known=RT_COLORS.find(c=>c.bg!=='transparent'&&rtColorToHex(c.bg)===rtColorToHex(cs.backgroundColor));
      bgBtn.style.background=known?known.bg:'';
    }
  }
}
document.addEventListener('selectionchange',updateToolbarState);
export function rtInsertImageAtCursor(dataUrl){
  stNotesRestoreRange();
  const ed=$('stNotesEditor');
  ed.focus();
  const img=document.createElement('img');
  img.src=dataUrl;
  const sel=window.getSelection();
  if(sel.rangeCount){
    const range=sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(img);
    range.setStartAfter(img);range.collapse(true);
    sel.removeAllRanges();sel.addRange(range);
  }else{
    ed.appendChild(img);
  }
  stNotesSaveRange();
}
export async function rtInsertImageFile(files){
  const f=files&&files[0];
  if(!f||!f.type||!f.type.startsWith('image/'))return;
  const dataUrl=await blobToB64(f);
  rtInsertImageAtCursor(dataUrl);
}
export function rtHandlePaste(e){
  const items=e.clipboardData&&e.clipboardData.items;
  if(!items)return;
  for(const it of items){
    if(it.type&&it.type.startsWith('image/')){
      e.preventDefault();
      const file=it.getAsFile();
      blobToB64(file).then(dataUrl=>rtInsertImageAtCursor(dataUrl));
      return;
    }
  }
}
export function rtHandleDrop(e){
  const files=e.dataTransfer&&e.dataTransfer.files;
  if(!files||!files.length)return;
  const f=[...files].find(x=>x.type&&x.type.startsWith('image/'));
  if(!f)return;
  e.preventDefault();
  blobToB64(f).then(dataUrl=>rtInsertImageAtCursor(dataUrl));
}
export const RT_COLORS=[
  {name:'Predvolená',fg:'inherit',bg:'transparent'},
  {name:'Sivá',fg:'#9B9A97',bg:'#3a3f47'},
  {name:'Hnedá',fg:'#b08968',bg:'#4a3b30'},
  {name:'Oranžová',fg:'#e8935a',bg:'#4a3520'},
  {name:'Žltá',fg:'#e0c14d',bg:'#4a4420'},
  {name:'Zelená',fg:'#4dbd9c',bg:'#1f3a34'},
  {name:'Modrá',fg:'#5b9bd9',bg:'#1f333f'},
  {name:'Fialová',fg:'#a685e2',bg:'#332a47'},
  {name:'Ružová',fg:'#e07fb0',bg:'#452c3a'},
  {name:'Červená',fg:'#e25c5c',bg:'#452525'},
  {name:'Čierna',fg:'#000000',bg:'#000000'},
];
export function rtColorToHex(str){
  if(!str)return '';
  str=str.trim().toLowerCase();
  const m=str.match(/^rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)$/);
  if(m){
    if(m[4]!==undefined&&parseFloat(m[4])===0)return 'transparent';
    const toHex=n=>('0'+Math.round(parseFloat(n)).toString(16)).slice(-2);
    return '#'+toHex(m[1])+toHex(m[2])+toHex(m[3]);
  }
  return str;
}
export function rtColorPanelHTML(kind){
  const rows=RT_COLORS.map(c=>{
    const val=kind==='fg'?c.fg:c.bg;
    const swatchStyle=kind==='fg'?`color:${val};background:var(--bg3)`:`background:${val};border:1px solid var(--border)`;
    return `<div class="rtColorRow" data-action="rtApplyColor" data-cmd="${kind==='fg'?'foreColor':'hiliteColor'}" data-val="${val}">
      <span class="rtSwatch" style="${swatchStyle}">${kind==='fg'?'A':''}</span><span>${esc(tr(c.name))}</span>
    </div>`;
  }).join('');
  return rows+`<div class="rtDropSep"></div><div class="rtColorRow" data-action="openCustomColor" data-kind="${kind}">
      <span class="rtSwatch" style="background:var(--bg3)">🎨</span><span>${esc(tr('Vlastná farba...'))}</span>
    </div><input type="color" id="rtCustomColor_${kind}" data-cmd="${kind==='fg'?'foreColor':'hiliteColor'}" style="display:none">`;
}
export function rtApplyColor(cmd,value){
  stNotesRestoreRange();
  const isDefault=(value==='inherit'||value==='transparent');
  // 'inherit'/'transparent' aren't valid legacy <font color>/hiliteColor values —
  // Chrome's legacy color parser mangles them into an unrelated color (e.g. red).
  // styleWithCSS makes execCommand use inline CSS instead, which understands them.
  if(isDefault)document.execCommand('styleWithCSS',false,true);
  document.execCommand(cmd,false,value);
  if(isDefault)document.execCommand('styleWithCSS',false,false);
  stNotesSaveRange();
  rtCloseDropdowns();
  updateToolbarState();
}
export function rtToggleDropdown(id,e){
  if(e)e.stopPropagation();
  const el=$(id);
  if(!el)return;
  const willOpen=el.style.display!=='block';
  rtCloseDropdowns();
  if(willOpen)el.style.display='block';
}
export function rtCloseDropdowns(){document.querySelectorAll('.rtDropdown').forEach(d=>d.style.display='none');}
export function rtAlignPanelHTML(){
  const opts=[['justifyLeft','Vľavo'],['justifyCenter','Na stred'],['justifyRight','Vpravo'],['justifyFull','Do bloku']];
  return opts.map(([cmd,label])=>`<div class="rtColorRow" data-action="rtExecClose" data-cmd="${cmd}">${esc(tr(label))}</div>`).join('');
}
document.addEventListener('click',e=>{
  if(!e.target.closest('.rtDropWrap'))rtCloseDropdowns();
});
export function toggleStrategyRulesEdit(){strategyRulesEdit=!strategyRulesEdit;renderStrategies();}
export function ruleEditRowHTML(text){
  return `<div class="ruleRow">
    <span class="ruleHandle" draggable="true" title="${esc(tr('Presunúť ťahaním'))}">⠿</span>
    <input type="text" class="stRuleTextD" value="${esc(text||'')}" placeholder="napr. Cena nad VWAP, potvrdenie objemom...">
    <button type="button" class="btn secondary small" data-action="removeRuleRow">✕</button>
  </div>`;
}
export function addDetailRuleRow(text){
  const box=$('stRulesEditList');
  if(box)box.insertAdjacentHTML('beforeend',ruleEditRowHTML(text));
}
let draggedRuleRow=null;
export function ruleDragStart(e){
  draggedRuleRow=e.target.closest('.ruleRow');
  if(!draggedRuleRow)return;
  e.dataTransfer.effectAllowed='move';
  e.dataTransfer.setData('text/plain','');
  try{e.dataTransfer.setDragImage(draggedRuleRow,20,20);}catch(err){}
  setTimeout(()=>draggedRuleRow&&draggedRuleRow.classList.add('dragging'),0);
}
export function ruleDragOver(e){
  if(!draggedRuleRow)return;
  const row=e.target.closest('.ruleRow');
  if(!row)return;
  e.preventDefault();
  if(row===draggedRuleRow)return;
  const rect=row.getBoundingClientRect();
  const before=(e.clientY-rect.top)<rect.height/2;
  row.parentElement.insertBefore(draggedRuleRow,before?row:row.nextSibling);
}
export function ruleDragEnd(){
  if(draggedRuleRow)draggedRuleRow.classList.remove('dragging');
  draggedRuleRow=null;
}
let touchDragRow=null;
export function ruleTouchStart(e){
  const handle=e.target.closest('.ruleHandle');
  const row=handle&&handle.closest('.ruleRow');
  if(!row)return;
  e.preventDefault();
  touchDragRow=row;
  row.classList.add('dragging');
}
export function ruleTouchMove(e){
  if(!touchDragRow)return;
  e.preventDefault();
  const touch=e.touches[0];
  if(!touch)return;
  const el=document.elementFromPoint(touch.clientX,touch.clientY);
  const row=el&&el.closest('.ruleRow');
  if(!row||row===touchDragRow||row.parentElement!==touchDragRow.parentElement)return;
  const rect=row.getBoundingClientRect();
  const before=(touch.clientY-rect.top)<rect.height/2;
  row.parentElement.insertBefore(touchDragRow,before?row:row.nextSibling);
}
export function ruleTouchEnd(){
  if(touchDragRow)touchDragRow.classList.remove('dragging');
  touchDragRow=null;
}
export async function saveStrategyRules(id){
  const s=strategyById(id);
  if(!s)return;
  const rules=[...document.querySelectorAll('#stRulesEditList .stRuleTextD')].map(i=>i.value.trim()).filter(Boolean);
  s.rules=rules;
  await idbPut('strategies',s);
  state.strategies=state.strategies.map(x=>x.id===s.id?s:x);
  strategyRulesEdit=false;
  renderStrategies();
  scheduleAutoSync();
  toast('Pravidlá uložené');
}
export function toggleStrategyScenariosEdit(){strategyScenariosEdit=!strategyScenariosEdit;renderStrategies();}
export function scenarioEditRowHTML(strategyId,sc){
  sc=sc||{tradeId:null,note:''};
  const options=state.trades.filter(t=>t.strategyId===strategyId).sort((a,b)=>tTime(b)-tTime(a)).map(t=>{
    const label=`${fmtDT(t.tEntry)} · ${String(t.symbol).toUpperCase()} ${t.dir===1?'LONG':'SHORT'} · ${fmtMoney(computePnl(t))}`;
    return `<option value="${t.id}" ${sc.tradeId===t.id?'selected':''}>${esc(label)}</option>`;
  }).join('');
  return `<div class="scenarioRow" style="border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:10px">
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
      <select class="scTradeSel" style="flex:1">
        <option value="">${esc(tr('– Vyber obchod –'))}</option>
        ${options}
      </select>
      <button type="button" class="btn secondary small" data-action="removeScenarioRow">✕</button>
    </div>
    <textarea class="scNoteText" rows="3" placeholder="${esc(tr('Čo je na tomto obchode typické pre túto stratégiu, čo sa z neho dá poučiť...'))}">${esc(sc.note||'')}</textarea>
  </div>`;
}
export function addDetailScenarioRow(strategyId){
  const box=$('stScenariosEditList');
  if(box)box.insertAdjacentHTML('beforeend',scenarioEditRowHTML(strategyId,null));
}
export async function saveStrategyScenarios(id){
  const s=strategyById(id);
  if(!s)return;
  const rows=[...document.querySelectorAll('#stScenariosEditList .scenarioRow')];
  s.scenarios=rows.map(row=>{
    const tradeId=parseInt(row.querySelector('.scTradeSel').value,10);
    const note=row.querySelector('.scNoteText').value.trim();
    return isFinite(tradeId)?{tradeId,note}:null;
  }).filter(Boolean);
  await idbPut('strategies',s);
  state.strategies=state.strategies.map(x=>x.id===s.id?s:x);
  strategyScenariosEdit=false;
  renderStrategies();
  scheduleAutoSync();
  toast('Scenáre uložené');
}
let scenarioShotCache={};
export function ensureScenarioShots(tradeId){
  if(scenarioShotCache[tradeId])return;
  scenarioShotCache[tradeId]=[];
  shotsByTrade(tradeId).then(shots=>{
    scenarioShotCache[tradeId]=shots.map(sh=>URL.createObjectURL(sh.blob));
    if(state.strategyDetailId!=null&&state.strategyDetailTab==='scenarios'&&!strategyScenariosEdit)renderStrategies();
  });
}
export function showLightbox(url){$('lightboxImg').src=url;$('lightbox').classList.add('open');}
export function scenarioViewCardHTML(sc){
  const t=state.trades.find(x=>x.id===sc.tradeId);
  if(!t)return `<div class="panel" style="margin-bottom:12px"><div class="hint">${esc(tr('Prepojený obchod bol vymazaný.'))}</div></div>`;
  const pnl=computePnl(t);
  const urls=scenarioShotCache[t.id];
  if(urls===undefined)ensureScenarioShots(t.id);
  const shotsHtml=urls&&urls.length?`<div class="shots">${urls.map(u=>`<div class="shot"><img src="${esc(u)}" data-action="showLightbox" data-url="${esc(u)}"></div>`).join('')}</div>`:'';
  return `<div class="panel" style="margin-bottom:12px">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
      <div style="display:flex;align-items:center;gap:8px;cursor:pointer" data-action="openTrade" data-id="${t.id}">
        <b>${esc(String(t.symbol).toUpperCase())}</b>
        <span class="pill ${t.dir===1?'long':'short'}">${t.dir===1?'LONG':'SHORT'}</span>
        <span class="hint">${fmtDT(t.tEntry)}</span>
      </div>
      <span class="${moneyCls(pnl)}"><b>${fmtMoney(pnl)}</b></span>
    </div>
    ${sc.note?`<div style="margin-top:8px;white-space:pre-wrap">${esc(sc.note)}</div>`:''}
    ${shotsHtml}
  </div>`;
}
export function renderStrategyDetail(box){
  const s=strategyById(state.strategyDetailId);
  if(!s){state.strategyDetailId=null;renderStrategies();return;}
  box.className='';
  const st=strategyStats(s);
  const tabs=[['rules','Pravidlá'],['notes','Notes'],['scenarios','Scenáre ('+(s.scenarios||[]).length+')'],['trades','Obchody ('+st.count+')']];
  const tabBtns=tabs.map(([k,label])=>`<button class="btn ${state.strategyDetailTab===k?'':'secondary'} small" data-action="switchStrategyDetailTab" data-tab="${k}">${esc(label)}</button>`).join('');
  let body;
  if(state.strategyDetailTab==='rules'){
    if(strategyRulesEdit){
      body=`<div class="hint" style="margin-bottom:8px">${esc(tr('Uprav text, zoraď šípkami, pridaj alebo odober pravidlá. Premenovanie pravidla nezmení históriu už zaznamenaných obchodov – tie zostanú priradené k pôvodnému zneniu.'))}</div>
        <div id="stRulesEditList">${(s.rules||[]).map(r=>ruleEditRowHTML(r)).join('')}</div>
        <button class="btn secondary small" data-action="addDetailRuleRow">+ Pridať pravidlo</button>
        <div style="margin-top:14px;display:flex;gap:8px">
          <button class="btn small" data-action="saveStrategyRules" data-id="${s.id}">Uložiť pravidlá</button>
          <button class="btn secondary small" data-action="toggleStrategyRulesEdit">${esc(tr('Zobraziť'))}</button>
        </div>`;
    }else{
      const rows=strategyRuleTable(s,st.ts);
      body=rows.length?`<div style="margin-bottom:10px"><button class="btn secondary small" data-action="toggleStrategyRulesEdit">${esc(tr('Upraviť pravidlá'))}</button></div><div style="overflow-x:auto"><table><thead><tr><th>Pravidlo</th><th>Follow rate</th><th>Net P&L</th><th>Profit factor</th><th>Win rate</th></tr></thead><tbody>${
        rows.map(r=>`<tr style="cursor:default"><td>${esc(tr(r.rule))}</td><td>${r.followRate.toFixed(0)}%</td><td class="${r.n?moneyCls(r.net):''}">${r.n?fmtMoney(r.net):'–'}</td><td>${r.pf==null?'–':(r.pf===Infinity?'∞':r.pf.toFixed(2))}</td><td>${r.wr==null?'–':r.wr.toFixed(0)+'%'}</td></tr>`).join('')
      }</tbody></table></div><div class="hint" style="margin-top:10px">Follow rate = ako často toto pravidlo dodržíš. Ostatné stĺpce = výkonnosť obchodov, kde bolo toto pravidlo dodržané.</div>`
        :`<div class="hint" style="margin-bottom:10px">Táto stratégia nemá zadané žiadne pravidlá.</div><button class="btn small" data-action="toggleStrategyRulesEdit">${esc(tr('+ Pridať pravidlá'))}</button>`;
    }
  }else if(state.strategyDetailTab==='notes'){
    if(strategyNotesEdit){
      body=`<div class="rtToolbar">
          <select id="rtHeadingSel" title="${esc(tr('Nadpis'))}">
            <option value="p">¶</option>
            <option value="h1">H1</option>
            <option value="h2">H2</option>
            <option value="h3">H3</option>
          </select>
          <span class="rtSep"></span>
          <select id="rtFontNameSel" title="${esc(tr('Písmo'))}">
            <option value="">${esc(tr('Písmo'))}</option>
            <option value="Helvetica">Helvetica</option>
            <option value="Arial">Arial</option>
            <option value="Georgia">Georgia</option>
            <option value="Verdana">Verdana</option>
            <option value="'Courier New',monospace">Courier New</option>
            <option value="'Times New Roman',serif">Times New Roman</option>
          </select>
          <button type="button" data-action="rtFontSizeStep" data-delta="-2">−</button>
          <input type="number" id="rtFontSizeBox" value="16" min="8" max="96">
          <button type="button" data-action="rtFontSizeStep" data-delta="2">+</button>
          <span class="rtSep"></span>
          <button type="button" data-cmd="bold" data-action="rtExec" title="Bold"><b>B</b></button>
          <button type="button" data-cmd="italic" data-action="rtExec" title="Italic"><i>I</i></button>
          <button type="button" data-cmd="strikeThrough" data-action="rtExec" title="Strikethrough"><s>S</s></button>
          <button type="button" data-cmd="underline" data-action="rtExec" title="Underline"><u>U</u></button>
          <button type="button" data-action="rtLink" title="${esc(tr('Vložiť odkaz'))}">🔗</button>
          <button type="button" data-cmd="removeFormat" data-action="rtExec" title="${esc(tr('Vymazať formátovanie'))}">✗</button>
          <span class="rtSep"></span>
          <div class="rtDropWrap">
            <button type="button" data-action="rtToggleDropdown" data-target="rtDropFg" title="${esc(tr('Farba textu'))}"><b id="rtFgIndicator" style="text-decoration:underline">A</b></button>
            <div class="rtDropdown" id="rtDropFg">${rtColorPanelHTML('fg')}</div>
          </div>
          <div class="rtDropWrap">
            <button type="button" id="rtBgIndicatorBtn" data-action="rtToggleDropdown" data-target="rtDropBg" title="${esc(tr('Farba zvýraznenia'))}">🖍</button>
            <div class="rtDropdown" id="rtDropBg">${rtColorPanelHTML('bg')}</div>
          </div>
          <span class="rtSep"></span>
          <div class="rtDropWrap">
            <button type="button" data-action="rtToggleDropdown" data-target="rtDropAlign" title="${esc(tr('Zarovnanie'))}">≡ ▾</button>
            <div class="rtDropdown" id="rtDropAlign">${rtAlignPanelHTML()}</div>
          </div>
          <span class="rtSep"></span>
          <button type="button" data-action="clickImgFile" title="${esc(tr('Vložiť obrázok'))}">+</button>
          <input type="file" id="rtImgFile" accept="image/*" style="display:none">
        </div>
        <div id="stNotesEditor" contenteditable="true">${s.notes||''}</div>
        <div style="margin-top:14px;display:flex;gap:8px">
          <button class="btn small" data-action="saveStrategyNotes" data-id="${s.id}">Uložiť poznámky</button>
          <button class="btn secondary small" data-action="toggleStrategyNotesEdit">${esc(tr('Zobraziť'))}</button>
        </div>`;
    }else{
      const htmlNotes=isHtmlNotes(s.notes);
      body=(s.notes||'').trim()
        ?`<div style="margin-bottom:10px"><button class="btn secondary small" data-action="toggleStrategyNotesEdit">Upraviť</button></div><div class="notesView">${htmlNotes?trHtml(s.notes):renderNotesHTML(tr(s.notes),{})}</div>`
        :`<div class="hint" style="margin-bottom:10px">Táto stratégia zatiaľ nemá poznámky.</div><button class="btn small" data-action="toggleStrategyNotesEdit">+ Pridať poznámky</button>`;
    }
  }else if(state.strategyDetailTab==='scenarios'){
    if(strategyScenariosEdit){
      const noTrades=!state.trades.some(t=>t.strategyId===s.id);
      body=`<div class="hint" style="margin-bottom:8px">${esc(tr('Vyber reálny obchod, ktorý je príkladom tejto stratégie, a napíš, čo je na ňom typické alebo poučné. Jeho screenshoty sa zobrazia automaticky.'))}</div>
        ${noTrades?`<div class="hint" style="margin-bottom:8px">${esc(tr('Táto stratégia zatiaľ nemá priradené žiadne obchody – najprv jej nejaký priraď v poli Stratégia pri obchode.'))}</div>`:''}
        <div id="stScenariosEditList">${(s.scenarios||[]).map(sc=>scenarioEditRowHTML(s.id,sc)).join('')}</div>
        <button class="btn secondary small" data-action="addDetailScenarioRow" data-id="${s.id}">+ ${esc(tr('Pridať scenár'))}</button>
        <div style="margin-top:14px;display:flex;gap:8px">
          <button class="btn small" data-action="saveStrategyScenarios" data-id="${s.id}">${esc(tr('Uložiť scenáre'))}</button>
          <button class="btn secondary small" data-action="toggleStrategyScenariosEdit">${esc(tr('Zobraziť'))}</button>
        </div>`;
    }else{
      const scenarios=s.scenarios||[];
      body=scenarios.length
        ?`<div style="margin-bottom:10px"><button class="btn secondary small" data-action="toggleStrategyScenariosEdit">${esc(tr('Upraviť'))}</button></div>${scenarios.map(scenarioViewCardHTML).join('')}`
        :`<div class="hint" style="margin-bottom:10px">${esc(tr('Táto stratégia zatiaľ nemá žiadne scenáre. Pridaj reálne obchody ako príklad, ako táto stratégia vyzerá v praxi.'))}</div><button class="btn small" data-action="toggleStrategyScenariosEdit">+ ${esc(tr('Pridať scenár'))}</button>`;
    }
  }else if(state.strategyDetailTab==='trades'){
    body=st.ts.length?tradeTableHTML(st.ts.sort((a,b)=>tTime(b)-tTime(a))):`<div class="hint">${esc(tr('Táto stratégia zatiaľ nemá priradené žiadne obchody. Priraď ju obchodu v jeho detaile.'))}</div>`;
  }
  box.innerHTML=`
    <button class="btn secondary small" data-action="closeStrategyDetail">← Späť na zoznam</button>
    <div class="panel" style="margin-top:14px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
        <div>
          <h2 style="font-size:19px;margin-bottom:6px">${esc(s.name)}</h2>
          ${s.description?`<div class="stratDesc" style="margin-bottom:0">${esc(tr(s.description))}</div>`:''}
        </div>
        <button class="btn secondary small" data-action="openStrategy" data-id="${s.id}">Upraviť</button>
      </div>
      <div class="stratStats" style="margin-top:16px">
        <div><div class="lbl">Obchodov</div><div class="val">${st.count}</div></div>
        <div><div class="lbl">Winrate</div><div class="val">${st.count?st.wr.toFixed(0)+'%':'–'}</div></div>
        <div><div class="lbl">Priem. R</div><div class="val">${st.avgR!=null?st.avgR.toFixed(2)+'R':'–'}</div></div>
        <div><div class="lbl">Net P&L</div><div class="val ${moneyCls(st.net)}">${st.count?fmtMoney(st.net):'–'}</div></div>
        <div><div class="lbl">Dodrž. pravidiel</div><div class="val">${st.avgAdherence!=null?st.avgAdherence.toFixed(0)+'%':'–'}</div></div>
      </div>
    </div>
    <div class="filters" style="margin-top:16px">${tabBtns}</div>
    <div class="panel" style="margin-top:12px">${body}</div>
  `;
  // stNotesEditor je contenteditable a znovu sa vykresľuje pri každom prepnutí
  // režimu úpravy poznámok – blur nebublá hore (na rozdiel od focusout), preto
  // sa viaže priamo tu namiesto delegovania na #strategyCards.
  const ed=$('stNotesEditor');
  if(ed){
    ed.addEventListener('blur',stNotesSaveRange);
    ed.addEventListener('paste',rtHandlePaste);
    ed.addEventListener('drop',rtHandleDrop);
    ed.addEventListener('dragover',e=>e.preventDefault());
  }
}
export async function saveStrategyNotes(id){
  const s=strategyById(id);
  if(!s)return;
  const ed=$('stNotesEditor');
  s.notes=ed?ed.innerHTML:(s.notes||'');
  await idbPut('strategies',s);
  state.strategies=state.strategies.map(x=>x.id===s.id?s:x);
  strategyNotesEdit=false;
  renderStrategies();
  scheduleAutoSync();
  toast('Poznámky uložené');
}
export function goToTradesForStrategy(id){
  goToTab('trades');
  const sel=$('fStrategy');
  if(sel){sel.value=String(id);renderTrades();}
}
export function goToTradesForHour(hour){
  goToTab('trades');
  const sel=$('fHour');
  if(sel){sel.value=hour;renderTrades();}
}
export function addStrategyRuleRow(text){
  const div=document.createElement('div');
  div.className='ruleRow';
  div.innerHTML=`<input type="text" class="stRuleText" value="${esc(text)}" placeholder="napr. Cena nad VWAP, potvrdenie objemom...">
    <button type="button" class="btn secondary small" data-action="removeRuleRow">✕</button>`;
  $('stRules').appendChild(div);
}
export function openStrategy(id){
  state.currentStrategyId=id;
  const s=id!=null?strategyById(id):null;
  $('stmTitle').textContent=s?'Upraviť stratégiu':'Nová stratégia';
  $('stDelete').style.display=s?'':'none';
  $('stName').value=s?s.name:'';
  $('stDesc').value=s?(s.description||''):'';
  $('stRules').innerHTML='';
  (s&&s.rules||[]).forEach(r=>addStrategyRuleRow(r));
  $('strategyOverlay').classList.add('open');
}
export function closeStrategy(){
  $('strategyOverlay').classList.remove('open');
  state.currentStrategyId=null;
}
export async function saveStrategy(){
  const name=$('stName').value.trim();
  if(!name){toast('Zadaj názov stratégie');return;}
  const rules=[...document.querySelectorAll('#stRules .stRuleText')].map(i=>i.value.trim()).filter(Boolean);
  const existing=state.currentStrategyId!=null?strategyById(state.currentStrategyId):null;
  const s=Object.assign({},existing,{name,description:$('stDesc').value.trim(),rules});
  if(state.currentStrategyId!=null){
    s.id=state.currentStrategyId;
    await idbPut('strategies',s);
    state.strategies=state.strategies.map(x=>x.id===s.id?s:x);
  }else{
    const id=await idbAdd('strategies',s);
    s.id=id;state.strategies.push(s);
  }
  closeStrategy();
  renderStrategies();
  renderTrades();
  scheduleAutoSync();
  toast('Stratégia uložená');
}
export async function deleteCurrentStrategy(){
  if(state.currentStrategyId==null)return;
  if(!await ask('Vymazať túto stratégiu? Obchody, ktoré ju používajú, ostanú zachované, len stratia priradenie.'))return;
  await idbDel('strategies',state.currentStrategyId);
  state.strategies=state.strategies.filter(x=>x.id!==state.currentStrategyId);
  if(state.strategyDetailId===state.currentStrategyId)state.strategyDetailId=null;
  closeStrategy();
  renderStrategies();
  renderTrades();
  scheduleAutoSync();
  toast('Stratégia vymazaná');
}
export function renderTradeRuleChecklist(){
  const sid=parseInt($('tStrategy').value,10);
  const s=isFinite(sid)?strategyById(sid):null;
  const wrap=$('tRuleChecklistWrap');
  if(!s||!(s.rules||[]).length){wrap.style.display='none';$('tRuleChecklist').innerHTML='';return;}
  wrap.style.display='';
  const t=state.currentTradeId!=null?state.trades.find(x=>x.id===state.currentTradeId):null;
  const checked=(t&&t.strategyId===s.id&&Array.isArray(t.checkedRules))?t.checkedRules:[];
  $('tRuleChecklist').innerHTML=s.rules.map((r,i)=>`<label class="checkRow"><input type="checkbox" class="tRuleCheck" value="${esc(r)}" ${checked.includes(r)?'checked':''}>${esc(r)}</label>`).join('');
}
export function riskR(t){
  const pnl=computePnl(t);
  if(t.stop==null||!isFinite(t.stop)||!isFinite(t.entry))return null;
  const risk=Math.abs(t.entry-t.stop)*(t.qty||1)*multFor(t.symbol);
  if(risk<=0)return null;
  return pnl/risk;
}
/* Plánované riziko obchodu (vstup→stop) ako % počiat. kapitálu aktívneho účtu -
   na rozdiel od riskR() (spätný R-multiple realizovaného výsledku) toto je preventívne:
   vidno to hneď pri vypĺňaní obchodu, ešte pred uložením. */
export function plannedRiskPct(t){
  if(t.stop==null||!isFinite(t.stop)||!isFinite(t.entry))return null;
  const balance=activeStartBalance();
  if(!(balance>0))return null;
  const risk=Math.abs(t.entry-t.stop)*(t.qty||1)*multFor(t.symbol);
  return risk/balance*100;
}
export function tTime(t){return t.tExit||t.tEntry||0;}
/* Pri obchode postavenom z viacerých fillov (scale-in/scale-out z broker CSV importu,
   pozri convertBrokerOrdersToTrades) sa počas života pozície menila reálne držaná
   veľkosť - t.qty je len súčet/maximum, nie veľkosť v každom okamihu. Táto funkcia
   z entryLegs/exitLegs (chronologicky zoradené {qty,price,t}) zrekonštruuje časovú os
   veľkosti pozície metódou priemerných nákladov (exit neholieb cenu zvyšku, len zníži
   qty), aby excursionFor mohol každý úsek váhovať skutočne držaným množstvom namiesto
   plošného konečného qty cez celé okno.  */
export function buildPositionSegments(entryLegs,exitLegs,tEntry,tExit){
  const events=[
    ...(entryLegs||[]).map(l=>({t:l.t,type:'in',qty:l.qty,price:l.price})),
    ...(exitLegs||[]).map(l=>({t:l.t,type:'out',qty:l.qty})),
  ].sort((a,b)=>a.t-b.t);
  const segments=[];
  let openQty=0,openNotional=0,segStart=tEntry;
  for(const e of events){
    if(openQty>0&&e.t>segStart)segments.push({tStart:segStart,tEnd:e.t,qty:openQty,avgPrice:openNotional/openQty});
    if(e.type==='in'){openQty+=e.qty;openNotional+=e.qty*e.price;}
    else{const rm=Math.min(e.qty,openQty);if(openQty>0)openNotional-=rm*(openNotional/openQty);openQty-=rm;}
    segStart=e.t;
  }
  if(openQty>0&&tExit>segStart)segments.push({tStart:segStart,tEnd:tExit,qty:openQty,avgPrice:openNotional/openQty});
  return segments;
}
/* MAE/MFE – ako hlboko šla pozícia proti tebe (Maximum Adverse Excursion) a ako
   ďaleko v tvoj prospech (Maximum Favourable Excursion), kým si ju zavrel.
   Počíta sa z uložených sviečok; bez OHLC dát vráti null. */
export function excursionFor(t){
  if(!t||!isFinite(t.entry)||!t.tEntry||!t.tExit)return null;
  if(typeof datasetsForSymbol!=='function')return null;
  const t1=Math.min(t.tEntry,t.tExit),t2=Math.max(t.tEntry,t.tExit);
  let best=null;
  for(const d of datasetsForSymbol(t.symbol)){
    const tf=TF_SEC[d.tf]||300;
    const bars=(d.bars||[]).filter(b=>b.t+tf>t1&&b.t<=t2);
    if(!bars.length)continue;
    if(!best||tf<best.tfSec)best={tfSec:tf,tf:d.tf,bars}; // jemnejší timeframe = presnejšie
  }
  if(!best)return null;
  let hi=-Infinity,lo=Infinity;
  for(const b of best.bars){if(b.h>hi)hi=b.h;if(b.l<lo)lo=b.l;}
  if(!isFinite(hi)||!isFinite(lo))return null;
  // Sviečky priradené cez koreňový symbol (napr. "MGC" pre MGCQ6 aj MGCZ6, viď
  // datasetsForSymbol) môžu patriť inému kontraktu-mesiacu na inej cenovej hladine
  // (kontango) - vtedy by MAE/MFE vyšlo z nesúvisiacich čísel. Namiesto tichého
  // zavádzajúceho výsledku to označíme ako mismatch.
  const range=hi-lo,tol=Math.max(range*0.5,hi*0.01);
  if(t.entry<lo-tol||t.entry>hi+tol)return{mismatch:true,tf:best.tf};
  const dir=t.dir,mult=multFor(t.symbol);
  const hasLegs=(t.entryLegs&&t.entryLegs.length)||(t.exitLegs&&t.exitLegs.length);
  let maeMoney,mfeMoney;
  if(hasLegs){
    const segments=buildPositionSegments(t.entryLegs,t.exitLegs,t1,t2);
    maeMoney=0;mfeMoney=0;
    for(const b of best.bars){
      // Sviečka tesne pred tEntry (bežné pri 5m+ timeframe, viď filter vyššie) nespadá
      // do žiadneho segmentu - patrí prvému (pozícia sa ešte len otvárala), nie
      // poslednému, inak by sa jej rozsah nesprávne váhoval finálnym (často väčším) qty.
      const seg=segments.find(s=>b.t>=s.tStart&&b.t<s.tEnd)
        ||(b.t<segments[0].tStart?segments[0]:segments[segments.length-1]);
      if(!seg)continue;
      const fav=(dir===1?b.h:b.l)-seg.avgPrice,adv=(dir===1?b.l:b.h)-seg.avgPrice;
      const favMoney=fav*dir*seg.qty*mult,advMoney=adv*dir*seg.qty*mult;
      if(favMoney>mfeMoney)mfeMoney=favMoney;
      if(advMoney<maeMoney)maeMoney=advMoney;
    }
  }else{
    const qty=t.qty||1;
    const maePrice=dir===1?lo:hi,mfePrice=dir===1?hi:lo;
    maeMoney=Math.min(0,(maePrice-t.entry)*dir*qty*mult);
    mfeMoney=Math.max(0,(mfePrice-t.entry)*dir*qty*mult);
  }
  const maePrice=dir===1?lo:hi,mfePrice=dir===1?hi:lo;
  const qty=t.qty||1;
  const risk=(t.stop!=null&&isFinite(t.stop))?Math.abs(t.entry-t.stop)*qty*mult:0;
  return {
    tf:best.tf,barCount:best.bars.length,maePrice,mfePrice,maeMoney,mfeMoney,
    approx:!hasLegs,
    maeR:risk>0?maeMoney/risk:null,
    mfeR:risk>0?mfeMoney/risk:null,
    leftOnTable:Math.max(0,mfeMoney-computePnl(t)),
  };
}
