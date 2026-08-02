import { idbDel, idbGet, idbPut } from './db.js';
import { ask } from './i18n.js';
import { renderAll, saveSettings } from './init.js';
import { applyBackupPayload, buildBackupPayload } from './settings.js';
import { state } from './state.js';
import { seedDefaultStrategies } from './strategy-notes.js';
import { $, toast } from './utils.js';

/* ================= Google Drive sync ================= */
export const GDRIVE_FILE_NAME='trading-journal-backup.json';
let gToken=null,gTokenClient=null,gFileId=null,gSyncTimer=null,gSyncing=false;

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
  if(!ask('Stiahnutie PREPÍŠE aktuálne lokálne dáta v tomto prehliadači dátami z Google Drive. Pokračovať?'))return;
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
export async function gdriveUpload(payload){
  const metadata=gFileId?{name:GDRIVE_FILE_NAME}:{name:GDRIVE_FILE_NAME,parents:['appDataFolder']};
  const boundary='tjbnd'+Date.now();
  const body=`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`+
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(payload)}\r\n`+
    `--${boundary}--`;
  const url=gFileId?`https://www.googleapis.com/upload/drive/v3/files/${gFileId}?uploadType=multipart`:`https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`;
  const res=await gdriveApi(url,{method:gFileId?'PATCH':'POST',headers:{'Content-Type':`multipart/related; boundary=${boundary}`},body});
  if(!res.ok)throw new Error('Nahrávanie zlyhalo ('+res.status+')');
  const data=await res.json();
  gFileId=data.id;
  return data;
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
export async function gdriveLoadLastLocalChange(){
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
    if(remoteMeta){
      gFileId=remoteMeta.id;
      if(isInitial){
        const remote=await gdriveDownload(remoteMeta.id);
        const remoteUpdated=remote.updatedAt||0;
        const localChanged=gdriveLastLocalChange();
        const {DEFAULT_STRATEGIES}=await import('./data/default-strategies.js');
        const builtInNames=new Set(DEFAULT_STRATEGIES.map(s=>s.name));
        const hasUserData=state.trades.length>0||state.strategies.some(s=>!builtInNames.has(s.name));
        // Fresh install / reset often has only built-in strategies and localChanged=0.
        // Don't let an older Drive backup overwrite newly seeded defaults from code.
        if(remoteUpdated>localChanged&&hasUserData){
          await applyBackupPayload(remote);
          await seedDefaultStrategies(); // keep built-in strategies current from deployed code
          renderAll();
          toast('Dáta stiahnuté z Google Drive');
        }else{
          await gdriveUpload(await buildBackupPayload());
        }
      }else{
        await gdriveUpload(await buildBackupPayload());
      }
    }else{
      await gdriveUpload(await buildBackupPayload());
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
  if(status instanceof Error){el.textContent='⚠️ Chyba synchronizácie: '+status.message;el.style.color='var(--red)';}
  else if(status==='syncing'){el.textContent='⏳ Synchronizujem…';el.style.color='';}
  else{
    el.style.color='';
    if(!state.settings.gConnected)el.textContent='Nepripojené.';
    else el.textContent='✅ Pripojené'+(state.settings.gLastSync?(' · posledná synchronizácia '+new Date(state.settings.gLastSync).toLocaleTimeString('sk-SK')):'');
  }
  if($('gClientId')&&document.activeElement!==$('gClientId'))$('gClientId').value=state.settings.gClientId||'';
  if(connectBtn)connectBtn.style.display=state.settings.gConnected?'none':'';
  if(disconnectBtn)disconnectBtn.style.display=state.settings.gConnected?'':'none';
}
