'use strict';
/* ================= Účty ================= */
function defaultAccId(){return settings.accounts[0].id;}
function accTrades(){
  const a=settings.activeAccount;
  if(a==='all')return trades;
  return trades.filter(t=>(t.account??defaultAccId())===a);
}
function activeStartBalance(){
  if(settings.activeAccount==='all')return settings.accounts.reduce((s,a)=>s+(a.balance||0),0);
  const a=settings.accounts.find(x=>x.id===settings.activeAccount);
  return a?(a.balance||0):0;
}
function accName(id){const a=settings.accounts.find(x=>x.id===id);return a?a.name:'?';}
function renderAccSelects(){
  const opts=settings.accounts.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join('');
  const sel=$('accSelect');
  sel.innerHTML=opts+'<option value="all">Všetky účty</option>';
  sel.value=String(settings.activeAccount);
  const imp=$('importAccount');
  imp.innerHTML=opts;
  imp.value=String(settings.activeAccount==='all'?defaultAccId():settings.activeAccount);
}
async function switchAccount(v){
  settings.activeAccount=v==='all'?'all':parseInt(v,10);
  await saveSettings();
  renderAll();
  toast(v==='all'?'Zobrazujem všetky účty':'Účet: '+accName(settings.activeAccount));
}
function addAccRow(name,balance,id){
  const div=document.createElement('div');
  div.className='multrow';
  div.dataset.accid=id==null?'':String(id);
  div.innerHTML=`<input class="an" value="${esc(name)}" placeholder="Názov účtu" style="width:180px">
    <input class="ab" type="number" step="any" value="${balance||0}" style="width:140px">
    <button type="button" class="btn secondary small" data-action="removeRow">✕</button>`;
  $('accList').appendChild(div);
}
async function saveAccounts(){
  const rows=[...document.querySelectorAll('#accList .multrow')];
  const newAccs=[];
  let nextId=Math.max(0,...settings.accounts.map(a=>a.id))+1;
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
  const removedWithTrades=settings.accounts.filter(a=>!newIds.has(a.id)&&trades.some(t=>(t.account??defaultAccId())===a.id));
  if(removedWithTrades.length){
    if(!ask(`Účet "${removedWithTrades.map(a=>a.name).join(', ')}" má obchody. Presunúť ich do účtu "${newAccs[0].name}"?`))return;
    for(const t of trades){
      const acc=t.account??defaultAccId();
      if(removedWithTrades.some(a=>a.id===acc)){t.account=newAccs[0].id;await idbPut('trades',t);}
    }
  }
  settings.accounts=newAccs;
  if(settings.activeAccount!=='all'&&!newIds.has(settings.activeAccount))settings.activeAccount=newAccs[0].id;
  await saveSettings();
  renderAll();
  scheduleAutoSync();
  toast('Účty uložené');
}
