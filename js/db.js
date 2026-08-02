/* ================= IndexedDB ================= */
export const DB={db:null};
export function idbOpen(){return new Promise((res,rej)=>{
  const r=indexedDB.open('tjournal',3);
  r.onupgradeneeded=e=>{const d=e.target.result;
    if(!d.objectStoreNames.contains('trades'))d.createObjectStore('trades',{keyPath:'id',autoIncrement:true});
    if(!d.objectStoreNames.contains('shots')){const s=d.createObjectStore('shots',{keyPath:'id',autoIncrement:true});s.createIndex('tradeId','tradeId');}
    if(!d.objectStoreNames.contains('ohlc'))d.createObjectStore('ohlc',{keyPath:'key'});
    if(!d.objectStoreNames.contains('kv'))d.createObjectStore('kv',{keyPath:'k'});
    if(!d.objectStoreNames.contains('strategies'))d.createObjectStore('strategies',{keyPath:'id',autoIncrement:true});
    if(!d.objectStoreNames.contains('stratShots')){const s=d.createObjectStore('stratShots',{keyPath:'id',autoIncrement:true});s.createIndex('strategyId','strategyId');}
  };
  r.onsuccess=()=>{DB.db=r.result;res();};
  r.onerror=()=>rej(r.error);
});}
export function store(n,m){return DB.db.transaction(n,m||'readonly').objectStore(n);}
export function pReq(r){return new Promise((res,rej)=>{r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
export const idbAll=n=>pReq(store(n).getAll());
export const idbPut=(n,v)=>pReq(store(n,'readwrite').put(v));
export const idbAdd=(n,v)=>pReq(store(n,'readwrite').add(v));
export function idbAddMany(n,records){
  return new Promise((res,rej)=>{
    const tx=DB.db.transaction(n,'readwrite');
    const os=tx.objectStore(n);
    const ids=new Array(records.length);
    records.forEach((v,i)=>{
      const r=os.add(v);
      r.onsuccess=()=>{ids[i]=r.result;};
    });
    tx.oncomplete=()=>res(ids);
    tx.onerror=()=>rej(tx.error);
  });
}
export const idbDel=(n,k)=>pReq(store(n,'readwrite').delete(k));
export const idbGet=(n,k)=>pReq(store(n).get(k));
export const shotsByTrade=id=>pReq(store('shots').index('tradeId').getAll(id));
export const stratShotsByStrategy=id=>pReq(store('stratShots').index('strategyId').getAll(id));
export function idbClear(n){return pReq(store(n,'readwrite').clear());}
