import { idbDel, idbGet, idbPut } from './db.js';
import { ask, tr } from './i18n.js';
import { renderAll, saveSettings } from './init.js';
import { applyBackupPayload, buildBackupPayload } from './settings.js';
import { state } from './state.js';
import { seedDefaultStrategies } from './strategy-notes.js';
import { $, esc, toast } from './utils.js';

/* ================= Google Drive sync ================= */
export const GDRIVE_FILE_NAME='trading-journal-backup.json';
/* Hlavný súbor sa pri každej synchronizácii prepisuje, takže sám o sebe nie je
   poistka - poškodené lokálne dáta by ho prepísali a iná kópia by neexistovala.
   Popri ňom preto držíme datované denné snapshoty, ku ktorým sa dá vrátiť. */
export const GDRIVE_SNAPSHOT_PREFIX='trading-journal-snapshot-';
export const GDRIVE_SNAPSHOT_KEEP=14;
let gToken=null,gTokenClient=null,gFileId=null,gSyncTimer=null,gSyncing=false;
let gLastSnapshotDate='';

export function gdriveReady(){return typeof google!=='undefined'&&google.accounts&&google.accounts.oauth2;}
export function gdriveInitTokenClient(){
  if(!state.settings.gClientId||!gdriveReady())return null;
  if(gTokenClient)return gTokenClient;
  gTokenClient=google.accounts.oauth2.initTokenClient({client_id:state.settings.gClientId,scope:'https://www.googleapis.com/auth/drive.appdata',callback:()=>{}});
  return gTokenClient;
}
export function gdriveRequestToken(interactive){
  return new Promise((resolve,reject)=>{
    const tc=gdriveInitTokenClient();
    if(!tc){reject(new Error('Google Identity Services sa nenačítalo'));return;}
    tc.callback=(resp)=>{if(resp&&resp.access_token){gToken=resp.access_token;resolve(gToken);}else reject(new Error('Prihlásenie zamietnuté'));};
    tc.error_callback=(err)=>reject(new Error((err&&err.type)||'auth-error'));
    try{tc.requestAccessToken({prompt:interactive?'consent':''});}catch(e){reject(e);}
  });
}
export async function gdriveApi(url,opts){
  opts=opts||{};
  opts.headers=Object.assign({},opts.headers,{Authorization:'Bearer '+gToken});
  let res=await fetch(url,opts);
  if(res.status===401){
    await gdriveRequestToken(false);
    opts.headers=Object.assign({},opts.headers,{Authorization:'Bearer '+gToken});
    res=await fetch(url,opts);
  }
  return res;
}
export async function gdriveFindFile(){
  const url='https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q='+encodeURIComponent(`name='${GDRIVE_FILE_NAME}' and trashed=false`)+'&orderBy=modifiedTime desc&fields=files(id,modifiedTime)';
  const res=await gdriveApi(url);
  if(!res.ok)throw new Error('Zoznam súborov zlyhal ('+res.status+')');
  const data=await res.json();
  return (data.files&&data.files[0])||null;
}
export async function gdriveForceDownload(){
  if(!state.settings.gConnected||!state.settings.gClientId){toast('Najprv sa pripoj ku Google Drive');return;}
  if(!await ask('Stiahnutie PREPÍŠE aktuálne lokálne dáta v tomto prehliadači dátami z Google Drive. Pokračovať?'))return;
  if(gSyncing)return;
  gSyncing=true;
  renderGDriveStatus('syncing');
  try{
    if(!gToken)await gdriveRequestToken(false);
    const remoteMeta=await gdriveFindFile();
    if(!remoteMeta){toast('Na Google Drive zatiaľ nie je žiadna záloha');return;}
    gFileId=remoteMeta.id;
    const remote=await gdriveDownload(remoteMeta.id);
    await applyBackupPayload(remote);
    await seedDefaultStrategies(); // code defaults win over stale Drive strategy notes
    gdriveSetLastLocalChange(remote.updatedAt||Date.now());
    state.settings.gLastSync=Date.now();
    await saveSettings();
    renderAll();
    renderGDriveStatus();
    toast('Dáta stiahnuté z Google Drive');
  }catch(e){
    console.error('Drive force download error',e);
    renderGDriveStatus(e);
    toast('Sťahovanie zlyhalo: '+(e&&e.message?e.message:'neznáma chyba'));
  }finally{
    gSyncing=false;
  }
}
export async function gdriveUploadFile(name,payload,fileId){
  const metadata=fileId?{name}:{name,parents:['appDataFolder']};
  const boundary='tjbnd'+Date.now();
  const body=`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`+
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(payload)}\r\n`+
    `--${boundary}--`;
  const url=fileId?`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`:`https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`;
  const res=await gdriveApi(url,{method:fileId?'PATCH':'POST',headers:{'Content-Type':`multipart/related; boundary=${boundary}`},body});
  if(!res.ok)throw new Error('Nahrávanie zlyhalo ('+res.status+')');
  return res.json();
}
export async function gdriveUpload(payload){
  const data=await gdriveUploadFile(GDRIVE_FILE_NAME,payload,gFileId);
  gFileId=data.id;
  return data;
}
export function snapshotDateKey(d){
  d=d||new Date();
  const p=n=>String(n).padStart(2,'0');
  return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());
}
export async function gdriveListSnapshots(){
  // appDataFolder obsahuje len naše súbory, takže je lacnejšie a spoľahlivejšie
  // vylistovať všetko a filtrovať lokálne než sa spoliehať na Drive "contains"
  const url='https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q='+encodeURIComponent('trashed=false')+'&fields=files(id,name)&pageSize=200';
  const res=await gdriveApi(url);
  if(!res.ok)throw new Error('Zoznam záloh zlyhal ('+res.status+')');
  const data=await res.json();
  return (data.files||[])
    .filter(f=>f.name&&f.name.startsWith(GDRIVE_SNAPSHOT_PREFIX))
    .sort((a,b)=>b.name.localeCompare(a.name)); // názvy sú ISO dátumy - najnovší prvý
}
export async function gdrivePruneSnapshots(){
  const files=await gdriveListSnapshots();
  let deleted=0;
  for(const f of files.slice(GDRIVE_SNAPSHOT_KEEP)){
    try{
      const res=await gdriveApi('https://www.googleapis.com/drive/v3/files/'+f.id,{method:'DELETE'});
      if(res.ok)deleted++;
    }catch(e){console.error('Snapshot prune failed',f.name,e);}
  }
  return deleted;
}
/* Raz denne odloží kópiu zálohy pod datovaným menom. Deň sa pamätá lokálne,
   takže bežný autosync nerobí žiadne extra sieťové volania. */
export async function gdriveEnsureDailySnapshot(payload){
  const today=snapshotDateKey();
  if(gLastSnapshotDate===today)return false;
  await gdriveUploadFile(GDRIVE_SNAPSHOT_PREFIX+today+'.json',payload,null);
  gLastSnapshotDate=today;
  try{await idbPut('kv',{k:'lastSnapshotDate',v:today});}catch(e){}
  await gdrivePruneSnapshots();
  return true;
}
export function gdriveLastSnapshotDate(){return gLastSnapshotDate;}
export async function gdriveShowSnapshots(){
  const box=$('gdriveSnapshotList');
  if(!box)return;
  if(!state.settings.gConnected||!state.settings.gClientId){toast('Najprv sa pripoj ku Google Drive');return;}
  box.innerHTML=`<span class="hint">${esc(tr('Načítavam staršie zálohy…'))}</span>`;
  try{
    if(!gToken)await gdriveRequestToken(false);
    const files=await gdriveListSnapshots();
    if(!files.length){box.innerHTML=`<span class="hint">${esc(tr('Zatiaľ žiadne denné zálohy – prvá vznikne pri najbližšej synchronizácii.'))}</span>`;return;}
    box.innerHTML=`<div class="hint" style="margin-bottom:6px">${esc(tr('Obnovenie prepíše aktuálne dáta v tomto prehliadači.'))}</div>`+
      files.map(f=>{
        const date=f.name.slice(GDRIVE_SNAPSHOT_PREFIX.length).replace(/\.json$/,'');
        return `<div style="display:flex;align-items:center;gap:10px;padding:4px 0">
          <span>${esc(date)}</span>
          <button type="button" class="btn secondary small" data-action="restoreSnapshot" data-id="${esc(f.id)}" data-date="${esc(date)}">${esc(tr('Obnoviť'))}</button>
        </div>`;
      }).join('');
  }catch(e){
    box.innerHTML=`<span class="hint" style="color:var(--red)">${esc(tr('Načítanie zlyhalo:'))} ${esc(e&&e.message?e.message:'')}</span>`;
  }
}
export async function gdriveRestoreSnapshot(fileId,dateLabel){
  if(!await ask(`Obnoviť zálohu z ${dateLabel}? PREPÍŠE to aktuálne dáta v tomto prehliadači.`))return;
  if(gSyncing)return;
  gSyncing=true;
  renderGDriveStatus('syncing');
  try{
    if(!gToken)await gdriveRequestToken(false);
    const payload=await gdriveDownload(fileId);
    await applyBackupPayload(payload);
    await seedDefaultStrategies();
    // obnovené dáta sú odteraz najnovšia lokálna zmena, inak by ich hlavná
    // záloha na Drive pri najbližšom štarte hneď prepísala späť
    gdriveSetLastLocalChange(Date.now());
    renderAll();
    renderGDriveStatus();
    toast('Záloha z '+dateLabel+' obnovená');
  }catch(e){
    console.error('Snapshot restore error',e);
    renderGDriveStatus(e);
    toast('Obnovenie zlyhalo: '+(e&&e.message?e.message:'neznáma chyba'));
  }finally{
    gSyncing=false;
  }
}
export async function gdriveDownload(fileId){
  const res=await gdriveApi(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`);
  if(!res.ok)throw new Error('Sťahovanie zlyhalo ('+res.status+')');
  return res.json();
}
/* Značka poslednej lokálnej zmeny rozhoduje, či pri štarte vyhrajú lokálne dáta
   alebo záloha z Drive. Musí žiť v tom istom úložisku ako samotné dáta (IndexedDB) -
   keby bola v localStorage, jeho vyčistenie by ju zhodilo na 0 a staršia Drive
   záloha by prepísala novšie lokálne dáta. V pamäti sa drží kópia, aby zápis
   mohol zostať synchrónny pre volajúcich. */
let gLastLocalChange=0;
export async function gdriveLoadSyncState(){
  let v=0;
  try{
    const rec=await idbGet('kv','lastLocalChange');
    if(rec&&rec.v!=null)v=parseInt(rec.v,10)||0;
  }catch(e){}
  if(!v){
    // migrácia z pôvodného localStorage kľúča
    let legacy=0;
    try{legacy=parseInt(localStorage.getItem('tj_lastLocalChange')||'0',10)||0;}catch(e){}
    if(legacy){
      v=legacy;
      idbPut('kv',{k:'lastLocalChange',v}).catch(()=>{});
    }
  }
  gLastLocalChange=v;
  try{
    const snap=await idbGet('kv','lastSnapshotDate');
    gLastSnapshotDate=(snap&&snap.v)?String(snap.v):'';
  }catch(e){}
  return v;
}
export function gdriveSetLastLocalChange(ts){
  gLastLocalChange=ts||Date.now();
  idbPut('kv',{k:'lastLocalChange',v:gLastLocalChange}).catch(e=>console.error('lastLocalChange save failed',e));
}
export function gdriveLastLocalChange(){return gLastLocalChange;}
export async function gdriveResetLastLocalChange(){
  gLastLocalChange=0;
  try{localStorage.removeItem('tj_lastLocalChange');}catch(e){}
  try{await idbDel('kv','lastLocalChange');}catch(e){}
}
/* Rozhoduje, či pri PRVOM pripojení/synchronizácii v tejto session nahrať
   lokálne dáta na Drive, alebo radšej stiahnuť to, čo je tam už uložené.
   Zámerne asymetrické: nahrať smie len vtedy, keď lokálne dáta reálne niečo
   obsahujú A sú aspoň také nové ako vzdialená záloha. Vo všetkých ostatných
   prípadoch (vrátane úplne prázdneho lokálneho stavu na novom/vyčistenom
   prehliadači) sa musí stiahnuť vzdialená záloha - inak by čerstvý/prázdny
   prehliadač ticho prepísal existujúcu zálohu na Drive niečím prázdnym. */
export function shouldUploadOnConnect(hasUserData,localChanged,remoteUpdated){
  return !!hasUserData&&localChanged>=remoteUpdated;
}
export function scheduleAutoSync(){
  gdriveSetLastLocalChange();
  if(!state.gBootDone||!state.settings.gConnected)return;
  clearTimeout(gSyncTimer);
  gSyncTimer=setTimeout(()=>{gdriveSyncNow(false);},4000);
}
export async function gdriveSyncNow(isInitial){
  if(!state.settings.gConnected||!state.settings.gClientId)return;
  if(gSyncing)return;
  gSyncing=true;
  renderGDriveStatus('syncing');
  try{
    if(!gToken)await gdriveRequestToken(false);
    const remoteMeta=await gdriveFindFile();
    let uploaded=null;
    if(remoteMeta){
      gFileId=remoteMeta.id;
      if(isInitial){
        const remote=await gdriveDownload(remoteMeta.id);
        const remoteUpdated=remote.updatedAt||0;
        const localChanged=gdriveLastLocalChange();
        const {DEFAULT_STRATEGIES}=await import('./data/default-strategies.js');
        const builtInNames=new Set(DEFAULT_STRATEGIES.map(s=>s.name));
        const hasUserData=state.trades.length>0||state.strategies.some(s=>!builtInNames.has(s.name));
        if(shouldUploadOnConnect(hasUserData,localChanged,remoteUpdated)){
          uploaded=await buildBackupPayload();
          await gdriveUpload(uploaded);
        }else{
          // Bezpečná predvoľba: prázdny/starší lokálny stav nikdy neprepíše
          // existujúcu zálohu na Drive - radšej sa stiahne to, čo tam je.
          await applyBackupPayload(remote);
          await seedDefaultStrategies(); // keep built-in strategies current from deployed code
          renderAll();
          toast('Dáta stiahnuté z Google Drive');
        }
      }else{
        uploaded=await buildBackupPayload();
        await gdriveUpload(uploaded);
      }
    }else{
      uploaded=await buildBackupPayload();
      await gdriveUpload(uploaded);
    }
    // snapshot je poistka navyše - keď zlyhá, hlavná synchronizácia platí ďalej
    if(uploaded){
      try{await gdriveEnsureDailySnapshot(uploaded);}
      catch(e){console.error('Denný snapshot zlyhal',e);}
    }
    state.settings.gLastSync=Date.now();
    await saveSettings();
    renderGDriveStatus();
  }catch(e){
    console.error('Drive sync error',e);
    renderGDriveStatus(e);
  }finally{
    gSyncing=false;
  }
}
export async function gdriveConnect(){
  const idInput=$('gClientId');
  if(idInput)state.settings.gClientId=idInput.value.trim();
  if(!state.settings.gClientId){toast('Najprv zadaj Google Client ID');return;}
  gTokenClient=null;
  try{
    await gdriveRequestToken(true);
    state.settings.gConnected=true;
    await saveSettings();
    toast('Pripojené ku Google Drive');
    renderGDriveStatus();
    await gdriveSyncNow(true);
  }catch(e){
    toast('Pripojenie zlyhalo: '+(e&&e.message?e.message:'neznáma chyba'));
    renderGDriveStatus(e);
  }
}
export function gdriveDisconnect(){
  try{if(gToken&&gdriveReady())google.accounts.oauth2.revoke(gToken,()=>{});}catch(e){}
  gToken=null;gFileId=null;
  state.settings.gConnected=false;
  saveSettings();
  renderGDriveStatus();
  toast('Google Drive odpojený');
}
export function renderGDriveStatus(status){
  const el=$('gdriveStatus');if(!el)return;
  const connectBtn=$('gdriveConnectBtn'),disconnectBtn=$('gdriveDisconnectBtn');
  if(status instanceof Error){el.textContent=tr('⚠️ Chyba synchronizácie: ')+status.message;el.style.color='var(--red)';}
  else if(status==='syncing'){el.textContent=tr('⏳ Synchronizujem…');el.style.color='';}
  else{
    el.style.color='';
    if(!state.settings.gConnected)el.textContent=tr('Nepripojené.');
    else{
      const loc=state.settings.lang==='en'?'en-GB':'sk-SK';
      el.textContent=tr('✅ Pripojené')
        +(state.settings.gLastSync?(tr(' · posledná synchronizácia ')+new Date(state.settings.gLastSync).toLocaleTimeString(loc)):'')
        +(gLastSnapshotDate?(tr(' · denná záloha ')+gLastSnapshotDate):'');
    }
  }
  if($('gClientId')&&document.activeElement!==$('gClientId'))$('gClientId').value=state.settings.gClientId||'';
  if(connectBtn)connectBtn.style.display=state.settings.gConnected?'none':'';
  if(disconnectBtn)disconnectBtn.style.display=state.settings.gConnected?'':'none';
}
