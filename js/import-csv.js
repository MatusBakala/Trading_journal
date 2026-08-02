import { tr } from './i18n.js';
import { esc } from './utils.js';
import { defaultAccId } from './accounts.js';
import { parseCSV } from './csv-parser.js';
import { idbAddMany, idbPut } from './db.js';
import { scheduleAutoSync } from './gdrive.js';
import { renderAfterTradeChange } from './init.js';
import { state } from './state.js';
import { $, num, parseDT, toast, tsToLocalInput } from './utils.js';

/* ================= CSV import (trades) ================= */
let csvRows=null,csvHeaders=null;
export const IMPORT_FIELDS=[
  ['symbol','Symbol *',['symbol','ticker','instrument','market','contract','produkt','symb']],
  ['dir','Smer (long/short)',['side','dir','direction','type','smer','buysell','b/s','position','pozicia']],
  ['qty','Množstvo',['qty','quantity','size','contracts','amount','mnozstvo','lots','volume','pocet']],
  ['entry','Vstupná cena',['entryprice','entry','avgentryprice','priceentry','openprice','buyprice','vstup','vstupnacena','avgbuy','pricein','open']],
  ['exit','Výstupná cena',['exitprice','exit','avgexitprice','priceexit','closeprice','sellprice','vystup','vystupnacena','avgsell','priceout','close']],
  ['tEntry','Čas vstupu *',['entrytime','opentime','entrydate','opendate','datetime','opened','boughttimestamp','casvstupu','date','datum','time','timestamp']],
  ['tExit','Čas výstupu',['exittime','closetime','exitdate','closedate','closed','soldtimestamp','casvystupu']],
  ['stop','Stop loss',['stop','sl','stoploss','stopprice']],
  ['target','Take profit',['target','tp','takeprofit','targetprice']],
  ['fees','Poplatky',['fee','fees','commission','commissions','comm','poplatky','naklady']],
  ['pnl','P&L (hotové)',['pnl','profit','netpnl','netprofit','p/l','pl','zisk','realizedpnl','gain']],
  ['notes','Poznámky',['note','notes','comment','comments','poznamka','poznamky']],
  ['tags','Pozitívne tagy/Setup',['tag','tags','setup','strategy','strategia','playbook']],
  ['tagsNeg','Negatívne tagy/Chyby',['mistake','mistakes','chyba','chyby','error','errors','negatives']],
];
export function normH(h){return String(h).toLowerCase().replace(/[^a-z0-9/]/g,'');}
let rawCsvHeaders=null,rawCsvRows=null;
let rawCashHeaders=null,rawCashRows=null;
export function isBrokerOrderCsv(headers){
  const hs=headers.map(normH);
  return hs.includes('b/s')&&hs.includes('status')&&(hs.includes('filledqty')||hs.includes('avgprice')||hs.includes('avgfillprice'));
}
export function loadCashHistoryFile(file){
  const rd=new FileReader();
  rd.onload=()=>{
    const rows=parseCSV(rd.result);
    if(rows.length<2){toast('Cash History CSV je prázdne alebo má len hlavičku');return;}
    rawCashHeaders=rows[0];rawCashRows=rows.slice(1);
    $('cashFileLabel').innerHTML='✅ Cash History pripojený ('+rawCashRows.length+' riadkov) – poplatky sa doplnia<input type="file" id="cashFile" accept=".csv,.txt,.tsv" style="display:none">';
    $('cashFile').addEventListener('change',e=>{if(e.target.files[0])loadCashHistoryFile(e.target.files[0]);});
  };
  rd.readAsText(file);
}
export function buildCommissionMap(headers,rows){
  const map={};
  if(!headers||!rows)return map;
  const idx=name=>headers.findIndex(h=>normH(h)===normH(name));
  const iType=idx('Cash Change Type'),iContract=idx('Contract'),iDelta=idx('Delta'),iTime=idx('Timestamp');
  if(iType<0||iContract<0||iDelta<0||iTime<0)return map;
  // Some brokers (e.g. prop-firm "funded futures" accounts) split the cost of a single fill
  // across several rows: Commission, Exchange Fee, Clearing Fee, Nfa Fee, etc. All of these
  // share the same Contract+Timestamp as the fill. We sum every fee-like row for that key and
  // treat the "Commission" row as the terminator of one fill's fee group (it's always present
  // exactly once per fill), pushing the running total so multiple fills sharing the same
  // Contract+Timestamp each still get their own distinct fee amount instead of double-counting.
  const pending={};
  for(const r of rows){
    const type=String(r[iType]||'').trim().toLowerCase();
    const isFeeRow=type==='commission'||type.indexOf('fee')>=0;
    if(!isFeeRow)continue;
    const contract=String(r[iContract]||'').trim().toUpperCase();
    const t=parseDT(r[iTime]);
    const delta=Math.abs(num(r[iDelta])||0);
    if(!contract||!t||!isFinite(delta))continue;
    const key=contract+'|'+t;
    pending[key]=(pending[key]||0)+delta;
    if(type==='commission'){
      (map[key]=map[key]||[]).push(pending[key]);
      pending[key]=0;
    }
  }
  for(const key in pending){
    if(pending[key]>0)(map[key]=map[key]||[]).push(pending[key]);
  }
  return map;
}
export function convertBrokerOrdersToTrades(headers,rows,commissionMap){
  commissionMap=commissionMap||{};
  const idx=name=>headers.findIndex(h=>normH(h)===normH(name));
  const iAcc=idx('Account'),iSide=idx('B/S'),iContract=idx('Contract'),iStatus=idx('Status');
  const iQty=idx('Filled Qty')>=0?idx('Filled Qty'):idx('filledQty');
  const iPrice=idx('Avg Fill Price')>=0?idx('Avg Fill Price'):idx('avgPrice');
  const iTime=idx('Fill Time')>=0?idx('Fill Time'):idx('Timestamp');
  const iType=idx('Type'),iStopPrice=idx('Stop Price'),iTimestamp=idx('Timestamp');
  const fills=[];
  const stopOrders=[];
  for(const r of rows){
    const status=String(r[iStatus]||'').trim().toLowerCase();
    const typeRaw=iType>=0?String(r[iType]||'').trim().toLowerCase():'';
    if(typeRaw==='stop'){
      const sideRaw=String(r[iSide]||'').trim().toLowerCase();
      const side=sideRaw.startsWith('b')?1:-1;
      const symbol=String(r[iContract]||'').trim();
      const account=iAcc>=0?String(r[iAcc]||''):'';
      const stopPrice=iStopPrice>=0?num(r[iStopPrice]):NaN;
      const ts=iTimestamp>=0?parseDT(r[iTimestamp]):null;
      if(symbol&&isFinite(stopPrice)&&ts)stopOrders.push({account,symbol,side,stopPrice,t:ts});
    }
    if(status!=='filled')continue;
    const qty=num(r[iQty]),price=num(r[iPrice]),t=parseDT(r[iTime]);
    const sideRaw=String(r[iSide]||'').trim().toLowerCase();
    const side=sideRaw.startsWith('b')?1:-1;
    const symbol=String(r[iContract]||'').trim();
    const account=iAcc>=0?String(r[iAcc]||''):'';
    if(!symbol||!isFinite(qty)||qty<=0||!isFinite(price)||!t)continue;
    const fee=(commissionMap[symbol.toUpperCase()+'|'+t]||[]).shift()||0;
    fills.push({account,symbol,side,qty,price,t,fee});
  }
  fills.sort((a,b)=>a.t-b.t);
  stopOrders.sort((a,b)=>a.t-b.t);
  const groups={};
  for(const f of fills){(groups[f.account+'|'+f.symbol]=groups[f.account+'|'+f.symbol]||[]).push(f);}
  const convertedTrades=[];
  for(const k in groups){
    const account=k.split('|')[0];
    let position=0,cur=null;
    for(const f of groups[k]){
      let remaining=f.qty;
      const feePerUnit=f.fee/f.qty;
      while(remaining>0){
        if(position===0){
          cur={dir:f.side,symbol:f.symbol,account,entryQty:0,entryNotional:0,exitQty:0,exitNotional:0,fees:0,tEntry:f.t,tExit:null};
          cur.entryQty+=remaining;cur.entryNotional+=remaining*f.price;cur.fees+=feePerUnit*remaining;
          position=f.side*remaining;remaining=0;
        }else if(Math.sign(position)===f.side){
          cur.entryQty+=remaining;cur.entryNotional+=remaining*f.price;cur.fees+=feePerUnit*remaining;
          position+=f.side*remaining;remaining=0;
        }else{
          const closeQty=Math.min(remaining,Math.abs(position));
          cur.exitQty+=closeQty;cur.exitNotional+=closeQty*f.price;cur.fees+=feePerUnit*closeQty;
          position-=Math.sign(position)*closeQty;
          remaining-=closeQty;
          if(position===0){cur.tExit=f.t;convertedTrades.push(cur);cur=null;}
        }
      }
    }
    if(cur)convertedTrades.push(cur);
  }
  convertedTrades.sort((a,b)=>a.tEntry-b.tEntry);
  // best-effort match: first protective Stop order (opposite side, same account+symbol) placed between entry and exit
  for(const t of convertedTrades){
    const cands=stopOrders.filter(s=>s.account===t.account&&s.symbol===t.symbol&&s.side===-t.dir&&s.t>=t.tEntry-1&&(!t.tExit||s.t<=t.tExit+1));
    if(cands.length)t.stopPrice=cands[0].stopPrice;
  }
  const rnd=x=>Math.round(x*1e6)/1e6;
  const outHeaders=['Symbol','Side','Quantity','Entry price','Exit price','Entry time','Exit time','Fees','Stop loss'];
  const outRows=convertedTrades.map(t=>[
    t.symbol,
    t.dir===1?'Buy':'Sell',
    String(t.entryQty),
    String(rnd(t.entryNotional/t.entryQty)),
    t.exitQty?String(rnd(t.exitNotional/t.exitQty)):'',
    tsToLocalInput(t.tEntry),
    t.tExit?tsToLocalInput(t.tExit):'',
    String(rnd(t.fees||0)),
    t.stopPrice!=null?String(rnd(t.stopPrice)):'',
  ]);
  return {headers:outHeaders,rows:outRows,openCount:convertedTrades.filter(t=>!t.tExit).length};
}
export function buildImportMapUI(){
  const opts=(sel)=>'<option value="-1">—</option>'+csvHeaders.map((h,i)=>`<option value="${i}" ${i===sel?'selected':''}>${esc(h)}</option>`).join('');
  $('mapRows').innerHTML=IMPORT_FIELDS.map(f=>{
    const auto=csvHeaders.findIndex(h=>f[2].includes(normH(h)));
    return `<div class="maprow"><div>${f[1]}</div><select id="map_${f[0]}">${opts(auto)}</select></div>`;
  }).join('');
  $('csvPreview').innerHTML='<table><thead><tr>'+csvHeaders.map(h=>`<th>${esc(h)}</th>`).join('')+'</tr></thead><tbody>'+
    csvRows.slice(0,5).map(r=>'<tr style="cursor:default">'+csvHeaders.map((_,i)=>`<td>${esc(r[i]||'')}</td>`).join('')+'</tr>').join('')+'</tbody></table>';
  $('mapPanel').style.display='block';
  $('importResult').textContent=csvRows.length+' riadkov na import';
}
export function convertAndRebuild(){
  const commissionMap=buildCommissionMap(rawCashHeaders,rawCashRows);
  const res=convertBrokerOrdersToTrades(rawCsvHeaders,rawCsvRows,commissionMap);
  if(!res.rows.length){toast('Nenašli sa žiadne vyplnené (Filled) objednávky na spárovanie');return;}
  csvHeaders=res.headers;csvRows=res.rows;
  $('brokerConvertBox').style.display='none';
  buildImportMapUI();
  const feeNote=rawCashRows?' + poplatky doplnené':'';
  toast(`Spárovaných ${csvRows.length} obchodov`+(res.openCount?` (${res.openCount} stále otvorených)`:'')+feeNote);
}
export function loadCsvForImport(file){
  const rd=new FileReader();
  rd.onload=()=>{
    const rows=parseCSV(rd.result);
    if(rows.length<2){toast('CSV je prázdne alebo má len hlavičku');return;}
    csvHeaders=rows[0];csvRows=rows.slice(1);
    rawCsvHeaders=csvHeaders;rawCsvRows=csvRows;
    rawCashHeaders=null;rawCashRows=null;
    $('cashFileLabel').innerHTML='📎 Priložiť Cash History.csv (voliteľné, doplní poplatky)<input type="file" id="cashFile" accept=".csv,.txt,.tsv" style="display:none">';
    $('cashFile').addEventListener('change',e=>{if(e.target.files[0])loadCashHistoryFile(e.target.files[0]);});
    $('brokerConvertBox').style.display=isBrokerOrderCsv(csvHeaders)?'block':'none';
    buildImportMapUI();
  };
  rd.readAsText(file);
}
export function parseDir(v){
  const s=String(v||'').toLowerCase().trim();
  if(['buy','long','b','l','1','kupa','kúpa','bot'].includes(s))return 1;
  if(['sell','short','s','sh','-1','predaj','sld'].includes(s))return -1;
  if(s.startsWith('buy')||s.startsWith('long'))return 1;
  if(s.startsWith('sell')||s.startsWith('short'))return -1;
  return 1;
}
export async function doImport(){
  if(!csvRows){toast('Najprv nahraj CSV');return;}
  const map={};
  IMPORT_FIELDS.forEach(f=>{map[f[0]]=parseInt($('map_'+f[0]).value,10);});
  if(map.symbol<0||map.tEntry<0){toast('Namapuj minimálne Symbol a Čas vstupu');return;}
  const get=(r,k)=>map[k]>=0?r[map[k]]:null;
  const account=parseInt($('importAccount').value,10)||defaultAccId();
  let ok=0,skip=0,dup=0,backfilled=0;
  const dupKey=(acc,tEntry,sym)=>acc+'|'+tEntry+'|'+sym.toUpperCase();
  const dupIndex=new Map();
  for(const x of state.trades){
    const k=dupKey(x.account,x.tEntry,String(x.symbol||''));
    if(!dupIndex.has(k))dupIndex.set(k,[]);
    dupIndex.get(k).push(x);
  }
  const newTrades=[];
  for(const r of csvRows){
    const symbol=String(get(r,'symbol')||'').trim();
    const tEntry=parseDT(get(r,'tEntry'));
    if(!symbol||!tEntry){skip++;continue;}
    const entry=num(get(r,'entry')),exit=num(get(r,'exit'));
    const pnlRaw=get(r,'pnl');
    const pnlOverride=(pnlRaw!=null&&String(pnlRaw).trim()!=='')?num(pnlRaw):null;
    if(!isFinite(entry)&&(pnlOverride==null||!isFinite(pnlOverride))){skip++;continue;}
    const key=dupKey(account,tEntry,symbol);
    const candidates=dupIndex.get(key);
    const existing=candidates&&candidates.find(x=>
      (!isFinite(entry)||!isFinite(x.entry)||Math.abs(x.entry-entry)<1e-9));
    if(existing){
      dup++;
      const stopRaw=num(get(r,'stop'));
      if((existing.stop==null||!isFinite(existing.stop))&&isFinite(stopRaw)){
        existing.stop=stopRaw;
        await idbPut('trades',existing);
        backfilled++;
      }
      continue;
    }
    const t={
      symbol,
      account,
      dir:map.dir>=0?parseDir(get(r,'dir')):((isFinite(entry)&&isFinite(exit))?(exit>=entry?1:1):1),
      qty:isFinite(num(get(r,'qty')))?num(get(r,'qty')):1,
      entry:isFinite(entry)?entry:NaN,
      exit:isFinite(exit)?exit:NaN,
      stop:isFinite(num(get(r,'stop')))?num(get(r,'stop')):null,
      target:isFinite(num(get(r,'target')))?num(get(r,'target')):null,
      tEntry,
      tExit:parseDT(get(r,'tExit'))||tEntry,
      fees:isFinite(num(get(r,'fees')))?num(get(r,'fees')):0,
      pnlOverride:(pnlOverride!=null&&isFinite(pnlOverride))?pnlOverride:null,
      notes:String(get(r,'notes')||''),
      tags:String(get(r,'tags')||'').split(/[,;]/).map(s=>s.trim()).filter(Boolean),
      tagsNeg:String(get(r,'tagsNeg')||'').split(/[,;]/).map(s=>s.trim()).filter(Boolean),
      createdAt:Date.now(),
    };
    newTrades.push(t);
    if(!dupIndex.has(key))dupIndex.set(key,[]);
    dupIndex.get(key).push(t);
    ok++;
  }
  if(newTrades.length){
    const ids=await idbAddMany('trades',newTrades);
    newTrades.forEach((t,i)=>{t.id=ids[i];state.trades.push(t);});
  }
  $('importResult').textContent=`Importované: ${ok}, preskočené: ${skip}, duplicity preskočené: ${dup}`+(backfilled?`, doplnený stop pri ${backfilled} existujúcich`:'');
  renderAfterTradeChange();
  scheduleAutoSync();
  toast(`Importovaných ${ok} obchodov`+(dup?`, ${dup} duplicít preskočených`:'')+(backfilled?`, doplnený stop pri ${backfilled}`:''));
}
