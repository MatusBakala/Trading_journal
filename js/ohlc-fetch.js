import { store } from './db.js';
import { idbPut } from './db.js';
import { tr } from './i18n.js';
import { renderOhlcList } from './ohlc-import.js';
import { state } from './state.js';
import { TF_SEC, formTrade, renderModalChart, symBase } from './trade-modal.js';
import { $, num, toast } from './utils.js';

/* ================= Online fetch (Yahoo Finance) ================= */
export const YAHOO_MAP={NQ:'NQ=F',MNQ:'MNQ=F',ES:'ES=F',MES:'MES=F',YM:'YM=F',MYM:'MYM=F',RTY:'RTY=F',M2K:'M2K=F',
  GC:'GC=F',MGC:'MGC=F',SI:'SI=F',SIL:'SIL=F',CL:'CL=F',MCL:'MCL=F',NG:'NG=F',HG:'HG=F',PL:'PL=F',
  XAUUSD:'GC=F',XAGUSD:'SI=F',ZB:'ZB=F',ZN:'ZN=F',BTC:'BTC-USD',ETH:'ETH-USD'};
export function yahooSymbolFor(sym){
  const s=String(sym||'').toUpperCase().trim();
  if(YAHOO_MAP[s])return YAHOO_MAP[s];
  const b=symBase(s);
  if(YAHOO_MAP[b])return YAHOO_MAP[b];
  return null;
}
export async function fetchJSONcors(url){
  const attempts=[url,
    'https://corsproxy.io/?url='+encodeURIComponent(url),
    'https://api.allorigins.win/raw?url='+encodeURIComponent(url),
    'https://api.codetabs.com/v1/proxy?quest='+encodeURIComponent(url)];
  let lastErr=null;
  for(const u of attempts){
    try{
      const r=await fetch(u,{cache:'no-store'});
      if(!r.ok){lastErr=new Error('HTTP '+r.status);continue;}
      return await r.json();
    }catch(e){lastErr=e;}
  }
  throw lastErr||new Error('Sťahovanie zlyhalo');
}
export const YAHOO_IV={'1m':'1m','2m':'2m','5m':'5m','15m':'15m','30m':'30m','1h':'60m','1d':'1d'};
/* Ako ďaleko dozadu Yahoo ešte dáva daný timeframe (dni). Bolo to rozsypané ako magické
   čísla na troch miestach, ktoré si navzájom odporovali - teraz jeden zdroj pravdy.
   Hodnoty overené proti živému Yahoo API (2m siaha ~34 dní, nie 60 ako 5m/15m/30m).
   Yahoo nemá 3m ani 10m - dostupné intradenné intervaly sú len 1m, 2m, 5m, 15m, 30m, 60m. */
export const TF_MAX_AGE_DAYS={'1m':6.9,'2m':34,'5m':58,'15m':58,'30m':58,'1h':700};
export async function fetchYahooCandles(ySym,tf,p1,p2){
  const iv=YAHOO_IV[tf]||'5m';
  const url=`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ySym)}?period1=${Math.floor(p1)}&period2=${Math.floor(p2)}&interval=${iv}&includePrePost=true`;
  const j=await fetchJSONcors(url);
  const res=j&&j.chart&&j.chart.result&&j.chart.result[0];
  if(!res)throw new Error((j&&j.chart&&j.chart.error&&j.chart.error.description)||'Yahoo nevrátil dáta');
  const ts=res.timestamp||[];
  const q=res.indicators&&res.indicators.quote&&res.indicators.quote[0];
  if(!q)throw new Error('Chýbajú OHLC dáta v odpovedi');
  const bars=[];
  for(let i=0;i<ts.length;i++){
    if(q.open[i]==null||q.high[i]==null||q.low[i]==null||q.close[i]==null)continue;
    const bar={t:ts[i],o:q.open[i],h:q.high[i],l:q.low[i],c:q.close[i]};
    if(q.volume&&q.volume[i]!=null)bar.v=q.volume[i];
    bars.push(bar);
  }
  return bars;
}
/* Jemné sviečky cez dlhé obdobie sú pre verejné CORS proxy priveľká odpoveď a request
   spadne na "Failed to fetch" (2m cez 34 dní = ~21 tisíc sviečok). Preto sa dlhý rozsah
   krája na kusy po ~5000 sviečkach a sťahuje postupne. Zlyhaný kus preskočíme - lepšie
   čiastočné dáta než nič; volajúci vidí, koľko sa reálne stiahlo. */
export function chunkSecondsFor(tf){
  const tfS=TF_SEC[tf]||300;
  return Math.max(tfS*500,Math.min(5000*tfS,90*86400));
}
export async function fetchYahooCandlesChunked(ySym,tf,p1,p2,onProgress){
  const span=chunkSecondsFor(tf);
  if(p2-p1<=span)return fetchYahooCandles(ySym,tf,p1,p2);
  const byTime=new Map();
  let failed=0,done=0;
  const total=Math.ceil((p2-p1)/span);
  for(let from=p1;from<p2;from+=span){
    const to=Math.min(from+span,p2);
    try{
      const part=await fetchYahooCandles(ySym,tf,from,to);
      for(const b of part)byTime.set(b.t,b);
    }catch(e){failed++;}
    done++;
    if(onProgress)onProgress(done,total,byTime.size);
  }
  if(!byTime.size)throw new Error(`všetkých ${total} častí zlyhalo – skús kratšie obdobie`);
  const bars=[...byTime.values()].sort((a,b)=>a.t-b.t);
  bars.partsFailed=failed;
  return bars;
}
export async function saveBars(sym,tf,newBars){
  newBars.sort((a,b)=>a.t-b.t);
  const key=sym+'|'+tf;
  const existing=state.ohlcSets.find(d=>d.key===key);
  let merged=newBars;
  if(existing){
    const map=new Map(existing.bars.map(b=>[b.t,b]));
    for(const b of newBars)map.set(b.t,b);
    merged=[...map.values()].sort((a,b)=>a.t-b.t);
  }
  const ds={key,symbol:sym,tf,bars:merged,updated:Date.now()};
  await idbPut('ohlc',ds);
  state.ohlcSets=state.ohlcSets.filter(d=>d.key!==key);state.ohlcSets.push(ds);
  renderOhlcList();
  return ds;
}
/* Čím kratší obchod, tým jemnejšie sviečky treba - pri hrubom timeframe pokrývajú obchod
   len 1-2 sviečky a z krajných sa dá dokázať len open/close (viď barRangeInWindow), takže
   MAE/MFE ostane široká dolná hranica. Preto sa vždy berie najjemnejší tf, ktorý Yahoo pre
   daný vek obchodu ešte dá. */
export function pickAutoTf(tEntry,tExit){
  const now=Date.now()/1000;
  const age=now-tEntry;
  const dur=Math.max((tExit||tEntry)-tEntry,60);
  if(age<6.5*86400)return dur<=2*3600?'1m':'5m';
  if(age<TF_MAX_AGE_DAYS['2m']*86400)return dur<=2*3600?'2m':(dur<=4*3600?'5m':'15m');
  if(age<58*86400)return dur<=4*3600?'5m':'15m';
  if(age<700*86400)return '1h';
  return '1d';
}
/* Yahoo dáva pri futures spojitý front-month kontrakt (MGC=F), nie konkrétny mesiac. Keď sa
   front month prerolluje (u zlata napr. Q6 -> Z6), cenová hladina skočí o desiatky dolárov,
   kým obchod je stále na starom kontrakte - a MAE/MFE by sa počítalo z cudzích čísel.
   Porovnaním ceny obchodu s hladinou sviečok okolo neho sa taký prípad dá odhaliť. */
export function barsMatchTradePrice(bars,t,tfS){
  if(!isFinite(t.entry)||!t.tEntry)return true;
  const from=t.tEntry-3600,to=(t.tExit||t.tEntry)+3600;
  let lo=Infinity,hi=-Infinity;
  for(const b of bars){
    if(b.t+tfS<from||b.t>to)continue;
    if(b.h>hi)hi=b.h;
    if(b.l<lo)lo=b.l;
  }
  if(!isFinite(hi))return true; // okolo obchodu nie sú sviečky - o hladine netvrdíme nič
  const tol=Math.max(hi-lo,hi*0.003);
  return t.entry>=lo-tol&&t.entry<=hi+tol;
}
export async function fetchTfForTrade(tf){
  const t=formTrade();
  if(!t.symbol||!t.tEntry){toast('Zadaj symbol a čas vstupu');return;}
  let ySym=yahooSymbolFor(t.symbol);
  if(!ySym){
    ySym=prompt(tr('Nepoznám Yahoo symbol pre')+' "'+t.symbol+'". '+tr('Zadaj ho ručne (napr. GC=F, NQ=F, BTC-USD):'),'');
    if(!ySym)return;
    ySym=ySym.trim();
  }
  const tfS=TF_SEC[tf];
  const now=Date.now()/1000;
  const age=now-t.tEntry;
  const maxAge=TF_MAX_AGE_DAYS[tf];
  if(maxAge&&age>maxAge*86400){
    toast(`${tf} dáta u Yahoo siahajú len ~${Math.round(maxAge)} dní dozadu – tento obchod je starší, skús hrubší timeframe alebo nahraj CSV.`);
    return;
  }
  let p1=t.tEntry-Math.max(tfS*200,86400);
  let p2=Math.min((t.tExit||t.tEntry)+Math.max(tfS*200,86400),now);
  if(maxAge)p1=Math.max(p1,now-maxAge*86400);
  const btn=$('btnAutoFetch');
  if(btn){btn.disabled=true;btn.textContent='Sťahujem...';}
  try{
    const bars=await fetchYahooCandles(ySym,tf,p1,p2);
    if(!bars.length)throw new Error('Yahoo vrátil 0 sviečok pre toto obdobie');
    const rootSym=symBase(t.symbol)||String(t.symbol).toUpperCase();
    const fullSym=String(t.symbol).toUpperCase().trim();
    // Pod kľúč konkrétneho kontraktu sa uloží, len keď cenová hladina naozaj sedí - inak
    // ide o iný mesiac zo spojitej série a patrí do spoločného (koreňového) datasetu.
    const matches=barsMatchTradePrice(bars,t,tfS);
    const sym=(matches&&fullSym!==rootSym)?fullSym:rootSym;
    const ds=await saveBars(sym,tf,bars);
    if(!matches&&fullSym!==rootSym){
      toast(`Pozor: sviečky z ${ySym} nesedia s cenou obchodu ${fullSym} – Yahoo dáva spojitý front-month kontrakt, ktorý sa už prerolloval na iný mesiac. Pre presné MAE/MFE nahraj CSV pre ${fullSym}.`);
    }
    $('tChartDsWrap').dataset.chosen=ds.key;
    state.modalChartTf=tf;
    toast(`Stiahnutých ${bars.length} sviečok (${ySym}, ${tf})`);
    renderModalChart();
  }catch(e){
    toast('Sťahovanie zlyhalo: '+(e&&e.message?e.message:'skús to znova alebo nahraj CSV'));
    renderModalChart();
  }
}
export async function autoFetchForTrade(){
  const t=formTrade();
  if(!t.symbol||!t.tEntry){toast('Zadaj symbol a čas vstupu');return;}
  return fetchTfForTrade(state.modalChartTf||pickAutoTf(t.tEntry,t.tExit));
}
export async function fetchOnline(){
  const symIn=$('ofSymbol').value.trim().toUpperCase();
  if(!symIn){toast('Zadaj symbol');return;}
  const tf=$('ofTf').value;
  const days=Math.max(1,num($('ofDays').value)||30);
  let ySym=yahooSymbolFor(symIn)||( /[=\-]/.test(symIn)?symIn:null);
  if(!ySym){
    ySym=prompt(tr('Nepoznám Yahoo symbol pre')+' "'+symIn+'". '+tr('Zadaj ho ručne (napr. GC=F):'),'');
    if(!ySym)return;ySym=ySym.trim();
  }
  const now=Date.now()/1000;
  let p1=now-days*86400;
  const maxAge=TF_MAX_AGE_DAYS[tf];
  if(maxAge)p1=Math.max(p1,now-maxAge*86400);
  $('ofResult').textContent='Sťahujem...';
  try{
    const bars=await fetchYahooCandlesChunked(ySym,tf,p1,now,
      (done,total,got)=>{$('ofResult').textContent=`Sťahujem... časť ${done}/${total} (${got} sviečok)`;});
    if(!bars.length)throw new Error('0 sviečok');
    const sym=symBase(symIn)||symIn;
    const ds=await saveBars(sym,tf,bars);
    $('ofResult').textContent=`Stiahnutých ${bars.length} sviečok (${ySym}, ${tf}). Dataset ${sym}|${tf} má teraz ${ds.bars.length} sviečok.`+
      (bars.partsFailed?` ${bars.partsFailed} časť/í sa nepodarilo stiahnuť – spusti znova pre doplnenie.`:'');
    toast('Dáta stiahnuté');
  }catch(e){
    $('ofResult').textContent='Sťahovanie zlyhalo: '+(e&&e.message?e.message:'neznáma chyba');
  }
}
