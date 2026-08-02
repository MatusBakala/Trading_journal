'use strict';
/* ================= Online fetch (Yahoo Finance) ================= */
const YAHOO_MAP={NQ:'NQ=F',MNQ:'MNQ=F',ES:'ES=F',MES:'MES=F',YM:'YM=F',MYM:'MYM=F',RTY:'RTY=F',M2K:'M2K=F',
  GC:'GC=F',MGC:'MGC=F',SI:'SI=F',SIL:'SIL=F',CL:'CL=F',MCL:'MCL=F',NG:'NG=F',HG:'HG=F',PL:'PL=F',
  XAUUSD:'GC=F',XAGUSD:'SI=F',ZB:'ZB=F',ZN:'ZN=F',BTC:'BTC-USD',ETH:'ETH-USD'};
function yahooSymbolFor(sym){
  const s=String(sym||'').toUpperCase().trim();
  if(YAHOO_MAP[s])return YAHOO_MAP[s];
  const b=symBase(s);
  if(YAHOO_MAP[b])return YAHOO_MAP[b];
  return null;
}
async function fetchJSONcors(url){
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
const YAHOO_IV={'1m':'1m','5m':'5m','15m':'15m','30m':'30m','1h':'60m','1d':'1d'};
async function fetchYahooCandles(ySym,tf,p1,p2){
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
async function saveBars(sym,tf,newBars){
  newBars.sort((a,b)=>a.t-b.t);
  const key=sym+'|'+tf;
  const existing=ohlcSets.find(d=>d.key===key);
  let merged=newBars;
  if(existing){
    const map=new Map(existing.bars.map(b=>[b.t,b]));
    for(const b of newBars)map.set(b.t,b);
    merged=[...map.values()].sort((a,b)=>a.t-b.t);
  }
  const ds={key,symbol:sym,tf,bars:merged,updated:Date.now()};
  await idbPut('ohlc',ds);
  ohlcSets=ohlcSets.filter(d=>d.key!==key);ohlcSets.push(ds);
  renderOhlcList();
  return ds;
}
function pickAutoTf(tEntry,tExit){
  const now=Date.now()/1000;
  const age=now-tEntry;
  const dur=Math.max((tExit||tEntry)-tEntry,60);
  if(age<6.5*86400)return dur<=2*3600?'1m':'5m';
  if(age<58*86400)return dur<=4*3600?'5m':'15m';
  if(age<700*86400)return '1h';
  return '1d';
}
async function fetchTfForTrade(tf){
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
  if(tf==='1m'&&age>6.9*86400){toast('1m dáta u Yahoo siahajú len ~7 dní dozadu – tento obchod je starší, skús 5m/15m alebo nahraj CSV.');return;}
  if((tf==='5m'||tf==='15m'||tf==='30m')&&age>58*86400){toast(tf+' dáta u Yahoo siahajú len ~60 dní dozadu – tento obchod je starší, skús 1h/denný alebo nahraj CSV.');return;}
  let p1=t.tEntry-Math.max(tfS*200,86400);
  let p2=Math.min((t.tExit||t.tEntry)+Math.max(tfS*200,86400),now);
  if(tf==='1m')p1=Math.max(p1,now-6.9*86400);
  if(tf==='5m'||tf==='15m'||tf==='30m')p1=Math.max(p1,now-58*86400);
  const btn=$('btnAutoFetch');
  if(btn){btn.disabled=true;btn.textContent='Sťahujem...';}
  try{
    const bars=await fetchYahooCandles(ySym,tf,p1,p2);
    if(!bars.length)throw new Error('Yahoo vrátil 0 sviečok pre toto obdobie');
    const sym=symBase(t.symbol)||String(t.symbol).toUpperCase();
    const ds=await saveBars(sym,tf,bars);
    $('tChartDsWrap').dataset.chosen=ds.key;
    modalChartTf=tf;
    toast(`Stiahnutých ${bars.length} sviečok (${ySym}, ${tf})`);
    renderModalChart();
  }catch(e){
    toast('Sťahovanie zlyhalo: '+(e&&e.message?e.message:'skús to znova alebo nahraj CSV'));
    renderModalChart();
  }
}
async function autoFetchForTrade(){
  const t=formTrade();
  if(!t.symbol||!t.tEntry){toast('Zadaj symbol a čas vstupu');return;}
  return fetchTfForTrade(modalChartTf||pickAutoTf(t.tEntry,t.tExit));
}
async function fetchOnline(){
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
  if(tf==='1m')p1=Math.max(p1,now-6.9*86400);
  if(tf==='5m'||tf==='15m')p1=Math.max(p1,now-58*86400);
  if(tf==='1h')p1=Math.max(p1,now-700*86400);
  $('ofResult').textContent='Sťahujem...';
  try{
    const bars=await fetchYahooCandles(ySym,tf,p1,now);
    if(!bars.length)throw new Error('0 sviečok');
    const sym=symBase(symIn)||symIn;
    const ds=await saveBars(sym,tf,bars);
    $('ofResult').textContent=`Stiahnutých ${bars.length} sviečok (${ySym}, ${tf}). Dataset ${sym}|${tf} má teraz ${ds.bars.length} sviečok.`;
    toast('Dáta stiahnuté');
  }catch(e){
    $('ofResult').textContent='Sťahovanie zlyhalo: '+(e&&e.message?e.message:'neznáma chyba');
  }
}
