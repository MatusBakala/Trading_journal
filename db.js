'use strict';
/* ================= IndexedDB ================= */
const DB={db:null};
function idbOpen(){return new Promise((res,rej)=>{
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
function store(n,m){return DB.db.transaction(n,m||'readonly').objectStore(n);}
function pReq(r){return new Promise((res,rej)=>{r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
const idbAll=n=>pReq(store(n).getAll());
const idbPut=(n,v)=>pReq(store(n,'readwrite').put(v));
const idbAdd=(n,v)=>pReq(store(n,'readwrite').add(v));
const idbDel=(n,k)=>pReq(store(n,'readwrite').delete(k));
const idbGet=(n,k)=>pReq(store(n).get(k));
const shotsByTrade=id=>pReq(store('shots').index('tradeId').getAll(id));
const stratShotsByStrategy=id=>pReq(store('stratShots').index('strategyId').getAll(id));
function idbClear(n){return pReq(store(n,'readwrite').clear());}
