import { esc } from './utils.js';
import { idbPut } from './db.js';
import { scheduleAutoSync } from './gdrive.js';
import { ask } from './i18n.js';
import { renderAll, saveSettings } from './init.js';
import { state } from './state.js';
import { $, num, toast } from './utils.js';

/* ================= Účty ================= */
export function defaultAccId(){return state.settings.accounts[0].id;}
export function accTrades(){
  const a=state.settings.activeAccount;
  if(a==='all')return state.trades;
  return state.trades.filter(t=>(t.account??defaultAccId())===a);
}
export function activeStartBalance(){
  if(state.settings.activeAccount==='all')return state.settings.accounts.reduce((s,a)=>s+(a.balance||0),0);
  const a=state.settings.accounts.find(x=>x.id===state.settings.activeAccount);
  return a?(a.balance||0):0;
}
export function accName(id){const a=state.settings.accounts.find(x=>x.id===id);return a?a.name:'?';}
export function renderAccSelects(){
  const opts=state.settings.accounts.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join('');
  const sel=$('accSelect');
  sel.innerHTML=opts+'<option value="all">Všetky účty</option>';
  sel.value=String(state.settings.activeAccount);
  const imp=$('importAccount');
  imp.innerHTML=opts;
  imp.value=String(state.settings.activeAccount==='all'?defaultAccId():state.settings.activeAccount);
}
export async function switchAccount(v){
  state.settings.activeAccount=v==='all'?'all':parseInt(v,10);
  await saveSettings();
  renderAll();
  toast(v==='all'?'Zobrazujem všetky účty':'Účet: '+accName(state.settings.activeAccount));
}
export function addAccRow(name,balance,id){
  const div=document.createElement('div');
  div.className='multrow';
  div.dataset.accid=id==null?'':String(id);
  div.innerHTML=`<input class="an" value="${esc(name)}" placeholder="Názov účtu" style="width:180px">
    <input class="ab" type="number" step="any" value="${balance||0}" style="width:140px">
    <button type="button" class="btn secondary small" data-action="removeRow">✕</button>`;
  $('accList').appendChild(div);
}
export async function saveAccounts(){
  const rows=[...document.querySelectorAll('#accList .multrow')];
  const newAccs=[];
  let nextId=Math.max(0,...state.settings.accounts.map(a=>a.id))+1;
  for(const r of rows){
    const name=r.querySelector('.an').value.trim();
    if(!name)continue;
    const bal=num(r.querySelector('.ab').value)||0;
    const id=r.dataset.accid?parseInt(r.dataset.accid,10):nextId++;
    newAccs.push({id,name,balance:bal});
  }
  if(!newAccs.length){toast('Musí existovať aspoň jeden účet');return;}
  // účty odstránené v UI, ktoré majú trady -> presun do prvého účtu
  const newIds=new Set(newAccs.map(a=>a.id));
  const removedWithTrades=state.settings.accounts.filter(a=>!newIds.has(a.id)&&state.trades.some(t=>(t.account??defaultAccId())===a.id));
  if(removedWithTrades.length){
    if(!ask(`Účet "${removedWithTrades.map(a=>a.name).join(', ')}" má obchody. Presunúť ich do účtu "${newAccs[0].name}"?`))return;
    for(const t of state.trades){
      const acc=t.account??defaultAccId();
      if(removedWithTrades.some(a=>a.id===acc)){t.account=newAccs[0].id;await idbPut('trades',t);}
    }
  }
  state.settings.accounts=newAccs;
  if(state.settings.activeAccount!=='all'&&!newIds.has(state.settings.activeAccount))state.settings.activeAccount=newAccs[0].id;
  await saveSettings();
  renderAll();
  scheduleAutoSync();
  toast('Účty uložené');
}
