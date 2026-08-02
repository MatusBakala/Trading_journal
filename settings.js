'use strict';
/* ================= Settings ================= */
function renderSettings(){
  $('accList').innerHTML='';
  settings.accounts.forEach(a=>addAccRow(a.name,a.balance||0,a.id));
  $('multList').innerHTML='';
  Object.entries(settings.mults).sort((a,b)=>a[0].localeCompare(b[0])).forEach(([k,v])=>addMultRow(k,v));
  renderGDriveStatus();
  if($('anthropicKey')&&document.activeElement!==$('anthropicKey'))$('anthropicKey').value=settings.anthropicKey||'';
}
function saveAnthropicKey(){
  settings.anthropicKey=$('anthropicKey').value.trim();
  saveSettings();
  toast('Kľúč uložený');
}
function addMultRow(k,v){
  const div=document.createElement('div');
  div.className='multrow';
  div.innerHTML=`<input class="mk" value="${esc(k)}" placeholder="SYMBOL" style="width:120px;text-transform:uppercase">
    <input class="mv" type="number" step="any" value="${v}" style="width:120px">
    <button type="button" class="btn secondary small" data-action="removeRow">✕</button>`;
  $('multList').appendChild(div);
}
async function saveMults(){
  const m={};
  document.querySelectorAll('#multList .multrow').forEach(r=>{
    const k=r.querySelector('.mk').value.trim().toUpperCase();
    const v=num(r.querySelector('.mv').value);
    if(k&&isFinite(v))m[k]=v;
  });
  settings.mults=m;
  await saveSettings();
  renderAll();
  scheduleAutoSync();
  toast('Multiplikátory uložené');
}
function blobToB64(blob){return new Promise(res=>{const r=new FileReader();r.onload=()=>res(r.result);r.readAsDataURL(blob);});}
function b64ToBlob(dataUrl){
  const [meta,data]=dataUrl.split(',');
  const mime=(meta.match(/data:(.*?);/)||[])[1]||'image/png';
  const bin=atob(data);const arr=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);
  return new Blob([arr],{type:mime});
}
async function buildBackupPayload(){
  const shots=await idbAll('shots');
  const shotsOut=[];
  for(const s of shots)shotsOut.push({tradeId:s.tradeId,data:await blobToB64(s.blob)});
  const stratShots=await idbAll('stratShots');
  const stratShotsOut=[];
  for(const s of stratShots)stratShotsOut.push({strategyId:s.strategyId,data:await blobToB64(s.blob)});
  const settingsOut=Object.assign({},settings);
  delete settingsOut.gClientId; // client id sa nezálohuje (per-device/per-deployment hodnota)
  delete settingsOut.anthropicKey; // API kľúč sa nezálohuje (citlivý údaj, len pre toto zariadenie)
  return {version:1,updatedAt:Date.now(),exported:new Date().toISOString(),settings:settingsOut,trades,ohlc:ohlcSets,shots:shotsOut,strategies,stratShots:stratShotsOut};
}
async function applyBackupPayload(p){
  await idbClear('trades');await idbClear('shots');await idbClear('ohlc');await idbClear('strategies');await idbClear('stratShots');
  const idMap={};
  for(const t of (p.trades||[])){
    const oldId=t.id;delete t.id;
    const nid=await idbAdd('trades',t);
    t.id=nid;idMap[oldId]=nid;
  }
  for(const s of (p.shots||[])){
    const tid=idMap[s.tradeId];
    if(tid!=null)await idbAdd('shots',{tradeId:tid,blob:b64ToBlob(s.data),added:Date.now()});
  }
  for(const d of (p.ohlc||[]))await idbPut('ohlc',d);
  for(const st of (p.strategies||[]))await idbPut('strategies',st);
  for(const s of (p.stratShots||[]))await idbAdd('stratShots',{strategyId:s.strategyId,blob:b64ToBlob(s.data),added:Date.now()});
  if(p.settings){
    const keepClientId=settings.gClientId,keepAnthropicKey=settings.anthropicKey;
    settings=Object.assign(settings,p.settings);
    settings.gClientId=keepClientId;
    settings.anthropicKey=keepAnthropicKey;
    await saveSettings();
  }
  trades=await idbAll('trades');
  ohlcSets=await idbAll('ohlc');
  strategies=await idbAll('strategies');
}
async function exportBackup(){
  const payload=await buildBackupPayload();
  const blob=new Blob([JSON.stringify(payload)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='trading-journal-zaloha-'+new Date().toISOString().slice(0,10)+'.json';
  a.click();
  toast('Záloha stiahnutá');
}
async function restoreBackup(input){
  const file=input.files[0];if(!file)return;
  if(!ask('Obnovenie PREPÍŠE všetky aktuálne dáta. Pokračovať?')){input.value='';return;}
  const text=await file.text();
  let p;try{p=JSON.parse(text);}catch(e){toast('Neplatný JSON');return;}
  await applyBackupPayload(p);
  renderAll();
  scheduleAutoSync();
  input.value='';
  toast('Záloha obnovená');
}
async function wipeAll(){
  if(!ask('Naozaj vymazať VŠETKY obchody, screenshoty a dáta?'))return;
  if(!ask('Posledné varovanie – táto akcia sa nedá vrátiť. Vymazať?'))return;
  await idbClear('trades');await idbClear('shots');await idbClear('ohlc');
  trades=[];ohlcSets=[];
  renderAll();
  scheduleAutoSync();
  toast('Všetky dáta vymazané');
}
