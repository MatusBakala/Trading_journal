import { tTime } from './strategy-notes.js';
import { tr } from './i18n.js';

import { state } from './state.js';
/* ================= Utils ================= */
export const $=id=>document.getElementById(id);
export function toast(msg){const t=$('toast');t.textContent=(typeof tr==='function')?tr(msg):msg;t.style.display='block';clearTimeout(t._h);t._h=setTimeout(()=>t.style.display='none',3200);}
export function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export function fmtMoney(v){const s=(v<0?'-':'')+'$'+Math.abs(v).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});return s;}
export function moneyCls(v){return v>0?'pos':(v<0?'neg':'');}
export function fmtDT(ts){if(!ts)return'–';const d=new Date(ts*1000);return d.toLocaleDateString('sk-SK')+' '+d.toLocaleTimeString('sk-SK',{hour:'2-digit',minute:'2-digit'});}
export function fmtD(ts){return new Date(ts*1000).toLocaleDateString('sk-SK');}
export function dayKey(ts){const d=new Date(ts*1000);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
export function fmtDur(sec){if(sec==null||isNaN(sec)||sec<0)return'–';if(sec<60)return Math.round(sec)+'s';if(sec<3600)return Math.round(sec/60)+'m';if(sec<86400)return(sec/3600).toFixed(1)+'h';return(sec/86400).toFixed(1)+'d';}
/* Ktorý oddeľovač je desatinný, prezradí ten, čo je v čísle posledný:
   "1,234.50" je americký zápis, "1.234,50" európsky. Ten druhý sa predtým
   čítal ako 1.2345, lebo európska vetva sa púšťala len pri čísle bez bodky. */
export function num(v){
  if(v==null)return NaN;
  let s=String(v).trim().replace(/[\s $]/g,'');
  if(!s)return NaN;
  if(s.lastIndexOf(',')>s.lastIndexOf('.'))s=s.replace(/\./g,'').replace(',','.');
  else s=s.replace(/,/g,'');
  const n=parseFloat(s);
  return isNaN(n)?NaN:n;
}
export function parseDT(v){
  if(v==null)return null;const s=String(v).trim();if(!s)return null;
  if(/^\d+(\.\d+)?$/.test(s)){const n=parseFloat(s);if(n>1e12)return Math.floor(n/1000);if(n>1e9)return Math.floor(n);}
  let m=s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if(m)return Math.floor(new Date(+m[1],+m[2]-1,+m[3],+m[4],+m[5],+(m[6]||0)).getTime()/1000);
  m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(m)return Math.floor(new Date(+m[1],+m[2]-1,+m[3]).getTime()/1000);
  m=s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:[ ,]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if(m)return Math.floor(new Date(+m[3],+m[2]-1,+m[1],+(m[4]||0),+(m[5]||0),+(m[6]||0)).getTime()/1000);
  m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ ,]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM|am|pm)?)?/);
  if(m){let h=+(m[4]||0);const ap=(m[7]||'').toUpperCase();if(ap==='PM'&&h<12)h+=12;if(ap==='AM'&&h===12)h=0;
    return Math.floor(new Date(+m[3],+m[1]-1,+m[2],h,+(m[5]||0),+(m[6]||0)).getTime()/1000);}
  const d=new Date(s);if(!isNaN(d.getTime()))return Math.floor(d.getTime()/1000);
  return null;
}
export function tsToLocalInput(ts){if(!ts)return'';const d=new Date(ts*1000);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')+'T'+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');}
export function localInputToTs(v){if(!v)return null;return Math.floor(new Date(v).getTime()/1000);}

export function multFor(symbol){
  const s=String(symbol||'').toUpperCase().trim();
  const keys=Object.keys(state.settings.mults).sort((a,b)=>b.length-a.length);
  for(const k of keys){if(s===k)return state.settings.mults[k];}
  for(const k of keys){if(s.startsWith(k))return state.settings.mults[k];}
  return 1;
}
export function computePnl(t){
  if(t.pnlOverride!=null&&isFinite(t.pnlOverride))return t.pnlOverride;
  if(!isFinite(t.entry)||!isFinite(t.exit))return 0;
  return (t.exit-t.entry)*t.dir*(t.qty||1)*multFor(t.symbol)-(t.fees||0);
}
/* Obchod má realizovaný výsledok - buď výstupnú cenu, alebo ručne zadaný P&L.
   Otvorené pozície nesmú vstupovať do štatistík: computePnl() im vráti 0, takže
   by sa počítali ako breakeven obchody a skreslili win rate aj priemery. */
export function isClosed(t){
  if(t.pnlOverride!=null&&isFinite(t.pnlOverride))return true;
  return isFinite(t.entry)&&isFinite(t.exit);
}
export const EMOTIONS={pokoj:'😌 Pokoj / disciplína',sebadovera:'💪 Sebadôvera',fomo:'😰 FOMO',strach:'😨 Strach',chamtivost:'🤑 Chamtivosť',netrpezlivost:'😤 Netrpezlivosť',frustracia:'😡 Frustrácia / revenge',nuda:'🥱 Nuda'};
export function emotionLabel(k){return k?(EMOTIONS[k]||k):'– (nezadané)';}
export function sessionOf(t){
  const d=new Date((t.tEntry||tTime(t))*1000);
  const h=d.getHours()+d.getMinutes()/60;
  if(h>=2&&h<9)return 'Ázia';
  if(h>=9&&h<14)return 'Londýn';
  if(h>=14&&h<22)return 'New York';
  return 'Mimo session';
}
export function debounce(fn,ms){
  let h;
  return function(...args){clearTimeout(h);h=setTimeout(()=>fn.apply(this,args),ms);};
}
/* Zdieľaný max drawdown pre dashboard aj štatistiky (predtým každý počítal ten istý
   cyklus zvlášť). Sleduje sa rovno equity (počiat. kapitál + kumulatívne P&L), nie len
   holé súčty P&L - vrchol a pokles v dolároch vyjde identicky ako predtým (posun o
   konštantu nemení rozdiely), ale navyše to umožní aj % pokles voči vrcholu equity. */
export function computeDrawdown(pnls,startBalance){
  let peakEq=startBalance||0,eq=startBalance||0,ddAbs=0,ddPct=0;
  for(const p of pnls){
    eq+=p;
    if(eq>peakEq)peakEq=eq;
    const d=peakEq-eq;
    if(d>ddAbs){ddAbs=d;ddPct=peakEq>0?d/peakEq*100:0;}
  }
  return {ddAbs,ddPct};
}
/* % return voči počiatočnému kapitálu - bez kladného počiat. kapitálu nemá zmysel. */
export function returnPct(net,startBalance){
  return startBalance>0?net/startBalance*100:null;
}
export function fmtPct(v){return v==null?'–':(v>=0?'+':'')+v.toFixed(2)+'%';}
