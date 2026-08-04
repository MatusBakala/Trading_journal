import { accTrades, activeStartBalance } from './accounts.js';
import { tr } from './i18n.js';
import { cssVar, state } from './state.js';
import { excursionFor, riskR, tTime } from './strategy-notes.js';
import { openTrade } from './trade-modal.js';
import { $, computeDrawdown, computePnl, dayKey, esc, fmtD, fmtDur, fmtMoney, fmtPct, isClosed, moneyCls, returnPct } from './utils.js';

/* ================= Stats page ================= */
export function periodFiltered(p){
  const now=new Date();
  let from=0;
  if(p==='month')from=new Date(now.getFullYear(),now.getMonth(),1).getTime()/1000;
  else if(p==='year')from=new Date(now.getFullYear(),0,1).getTime()/1000;
  else if(p==='30')from=now.getTime()/1000-30*86400;
  else if(p==='90')from=now.getTime()/1000-90*86400;
  return accTrades().filter(t=>tTime(t)>=from).sort((a,b)=>tTime(a)-tTime(b));
}
export function maxStreak(arr,pred){let m=0,c=0;for(const x of arr){if(pred(x)){c++;if(c>m)m=c;}else c=0;}return m;}
export function avg(arr){return arr.length?arr.reduce((a,b)=>a+b,0)/arr.length:0;}
export function srow(l,v,cls){return `<div class="srow"><span>${l}</span><b class="${cls||''}">${v}</b></div>`;}
export function renderStats(){
  const all=periodFiltered($('statsPeriod').value);
  // len uzavreté obchody - otvorené pozície nemajú realizovaný P&L
  const ts=all.filter(isClosed);
  const pnls=ts.map(computePnl);
  const net=pnls.reduce((a,b)=>a+b,0);
  const wins=pnls.filter(p=>p>0),losses=pnls.filter(p=>p<0),be=pnls.filter(p=>p===0);
  const gw=wins.reduce((a,b)=>a+b,0),gl=Math.abs(losses.reduce((a,b)=>a+b,0));
  const pf=gl>0?gw/gl:(gw>0?Infinity:0);
  const fees=ts.reduce((a,t)=>a+(t.fees||0),0);
  const openTrades=all.length-ts.length;
  // hold times
  const durs=ts.map(t=>(t.tEntry&&t.tExit&&t.tExit>t.tEntry)?t.tExit-t.tEntry:null);
  const dAll=durs.filter(d=>d!=null);
  const dWin=durs.filter((d,i)=>d!=null&&pnls[i]>0);
  const dLoss=durs.filter((d,i)=>d!=null&&pnls[i]<0);
  // daily
  const daily={},dailyVol={};
  ts.forEach((t,i)=>{const k=dayKey(tTime(t));daily[k]=(daily[k]||0)+pnls[i];dailyVol[k]=(dailyVol[k]||0)+(t.qty||1);});
  const dkeys=Object.keys(daily).sort();
  const dVals=dkeys.map(k=>daily[k]);
  const dW=dVals.filter(v=>v>0),dL=dVals.filter(v=>v<0),dB=dVals.filter(v=>v===0);
  // drawdown + % return
  const startBalance=activeStartBalance();
  const {ddAbs:dd,ddPct}=computeDrawdown(pnls,startBalance);
  const netPct=returnPct(net,startBalance);
  // R multiples
  const rs=ts.map(riskR).filter(r=>r!=null);
  // months
  const months={};
  ts.forEach((t,i)=>{const d=new Date(tTime(t)*1000);const k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');months[k]=(months[k]||0)+pnls[i];});
  const mkeys=Object.keys(months).sort();
  const mName=k=>{const [y,m]=k.split('-');return new Date(+y,+m-1,1).toLocaleDateString(state.settings.lang==='en'?'en-US':'sk-SK',{month:'short',year:'numeric'});};
  let bestM=null,worstM=null;
  for(const k of mkeys){
    if(bestM==null||months[k]>months[bestM])bestM=k;
    if(worstM==null||months[k]<months[worstM])worstM=k;
  }
  const mAvg=mkeys.length?net/mkeys.length:0;
  $('statsMonths').innerHTML=[
    ['Najlepší mesiac',bestM?fmtMoney(months[bestM]):'–',bestM?moneyCls(months[bestM]):'',bestM?mName(bestM):''],
    ['Najhorší mesiac',worstM?fmtMoney(months[worstM]):'–',worstM?moneyCls(months[worstM]):'',worstM?mName(worstM):''],
    ['Priemer / mesiac',fmtMoney(mAvg),moneyCls(mAvg),mkeys.length+' mes.'],
  ].map(k=>`<div class="card"><div class="lbl">${k[0]}</div><div class="val ${k[2]}">${k[1]}</div><div class="lbl" style="margin-top:4px">${k[3]}</div></div>`).join('');

  $('statsLeft').innerHTML='<h3>Obchody</h3>'+
    srow('Celkový P&L',fmtMoney(net)+(netPct!=null?` (${fmtPct(netPct)})`:''),moneyCls(net))+
    srow('Priemerný P&L / obchod',fmtMoney(avg(pnls)),moneyCls(avg(pnls)))+
    srow('Priemerný ziskový obchod',fmtMoney(avg(wins)),'pos')+
    srow('Priemerný stratový obchod',fmtMoney(-Math.abs(avg(losses))),losses.length?'neg':'')+
    srow('Počet obchodov',pnls.length)+
    srow('Ziskové obchody',wins.length,'pos')+
    srow('Stratové obchody',losses.length,losses.length?'neg':'')+
    srow('Breakeven obchody',be.length)+
    srow('Max po sebe idúce výhry',maxStreak(pnls,p=>p>0))+
    srow('Max po sebe idúce prehry',maxStreak(pnls,p=>p<0))+
    srow('Najväčší zisk',fmtMoney(pnls.length?Math.max(...pnls):0),'pos')+
    srow('Najväčšia strata',fmtMoney(pnls.length?Math.min(...pnls):0),pnls.length&&Math.min(...pnls)<0?'neg':'')+
    srow('Poplatky spolu',fmtMoney(fees),fees?'neg':'')+
    srow('Priem. držanie (všetky)',dAll.length?fmtDur(avg(dAll)):'–')+
    srow('Priem. držanie (ziskové)',dWin.length?fmtDur(avg(dWin)):'–')+
    srow('Priem. držanie (stratové)',dLoss.length?fmtDur(avg(dLoss)):'–')+
    srow('Profit factor',pf===Infinity?'∞':pf.toFixed(2),pf>=1?'pos':(pnls.length?'neg':''));

  $('statsRight').innerHTML='<h3>Dni</h3>'+
    srow('Otvorené obchody (bez výstupu)',openTrades)+
    srow('Obchodných dní',dkeys.length)+
    srow('Ziskové dni',dW.length,'pos')+
    srow('Stratové dni',dL.length,dL.length?'neg':'')+
    srow('Breakeven dni',dB.length)+
    srow('Max po sebe ziskových dní',maxStreak(dVals,v=>v>0))+
    srow('Max po sebe stratových dní',maxStreak(dVals,v=>v<0))+
    srow('Priemerný denný P&L',fmtMoney(avg(dVals)),moneyCls(avg(dVals)))+
    srow('Priemerný ziskový deň',fmtMoney(avg(dW)),'pos')+
    srow('Priemerný stratový deň',fmtMoney(avg(dL)),dL.length?'neg':'')+
    srow('Najlepší deň',fmtMoney(dVals.length?Math.max(...dVals):0),'pos')+
    srow('Najhorší deň',fmtMoney(dVals.length?Math.min(...dVals):0),dVals.length&&Math.min(...dVals)<0?'neg':'')+
    srow('Priem. denný objem (kontrakty)',dkeys.length?avg(Object.values(dailyVol)).toFixed(1):'–')+
    srow('Očakávaná hodnota / obchod',fmtMoney(avg(pnls)),moneyCls(avg(pnls)))+
    srow('Priemerný realizovaný R-multiple',rs.length?avg(rs).toFixed(2)+'R':'–',rs.length?(avg(rs)>=0?'pos':'neg'):'')+
    srow('Max drawdown',fmtMoney(-dd)+(dd&&startBalance>0?` (-${ddPct.toFixed(1)}%)`:''),dd?'neg':'');

  renderExcursionChart(ts);
}
/* MAE = najhorší bod proti tebe počas obchodu, MFE = najlepší bod v tvoj prospech.
   Spolu odpovedajú na dve otázky: či stopy nedávaš zbytočne tesne (víťazi, ktorí
   museli prežiť hlboký MAE) a či nenechávaš zisky ujsť (stratové obchody, ktoré
   boli medzitým pekne v pluse). Počíta sa zo sviečok, takže bez OHLC dát nič. */
export function collectExcursions(ts){
  const rows=[];
  for(const t of ts){
    const x=excursionFor(t);
    if(!x)continue;
    rows.push({trade:t,pnl:computePnl(t),mae:Math.abs(x.maeMoney),mfe:x.mfeMoney,leftOnTable:x.leftOnTable});
  }
  return rows;
}
export function renderExcursionChart(ts){
  const canvas=$('excChart'),sub=$('excursionSub'),summary=$('excursionSummary'),outliers=$('excOutliers');
  if(!canvas||!sub||!summary)return;
  const rows=collectExcursions(ts);
  if(state.excChartObj){state.excChartObj.destroy();state.excChartObj=null;}
  if(!rows.length){
    sub.textContent=tr('Potrebné sú sviečkové dáta – naimportuj ich v záložke „Dáta grafu“, potom sa tu MAE/MFE dopočíta.');
    summary.innerHTML='';
    if(outliers)outliers.innerHTML='';
    canvas.style.display='none';
    return;
  }
  canvas.style.display='';
  sub.textContent=`${rows.length} ${tr('z')} ${ts.length} ${tr('uzavretých obchodov má sviečkové dáta. Klikni na bod alebo riadok nižšie pre detail obchodu.')}`;
  const wins=rows.filter(r=>r.pnl>0),losses=rows.filter(r=>r.pnl<0);
  const pt=r=>({x:r.mae,y:r.mfe,sym:String(r.trade.symbol||'').toUpperCase(),day:fmtD(tTime(r.trade)),pnl:r.pnl,id:r.trade.id});
  if(typeof Chart!=='undefined'){
    const gridColor=cssVar('--border'),tickColor=cssVar('--muted');
    state.excChartObj=new Chart(canvas,{
      type:'scatter',
      data:{datasets:[
        {label:tr('Ziskové'),data:wins.map(pt),backgroundColor:cssVar('--green'),pointRadius:5,pointHoverRadius:7},
        {label:tr('Stratové'),data:losses.map(pt),backgroundColor:cssVar('--red'),pointRadius:5,pointHoverRadius:7},
      ]},
      options:{
        responsive:true,maintainAspectRatio:false,
        onClick:(evt,elements,chart)=>{
          if(!elements.length)return;
          const {datasetIndex,index}=elements[0];
          const point=chart.data.datasets[datasetIndex].data[index];
          if(point&&point.id!=null)openTrade(point.id);
        },
        onHover:(evt,elements)=>{
          if(evt.native&&evt.native.target)evt.native.target.style.cursor=elements.length?'pointer':'default';
        },
        plugins:{
          legend:{labels:{color:tickColor}},
          tooltip:{callbacks:{label:c=>{
            const d=c.raw;
            return `${d.sym} ${d.day} · MAE ${fmtMoney(-d.x)} · MFE ${fmtMoney(d.y)} · P&L ${fmtMoney(d.pnl)}`;
          }}},
        },
        scales:{
          x:{title:{display:true,text:tr('MAE – najhoršie proti tebe ($)'),color:tickColor},grid:{color:gridColor},ticks:{color:tickColor}},
          y:{title:{display:true,text:tr('MFE – najlepšie v tvoj prospech ($)'),color:tickColor},grid:{color:gridColor},ticks:{color:tickColor}},
        },
      },
    });
  }
  const maeWins=wins.map(r=>r.mae),mfeLosses=losses.map(r=>r.mfe);
  const allMae=rows.map(r=>r.mae),allMfe=rows.map(r=>r.mfe);
  const worstWinMae=maeWins.length?Math.max(...maeWins):0;
  const leftTotal=wins.reduce((a,r)=>a+r.leftOnTable,0);
  summary.innerHTML='<div class="cards">'+[
    [tr('Priemerné MAE'),fmtMoney(-avg(allMae)),allMae.length?'neg':'',tr('priemerný najhorší bod proti tebe, naprieč všetkými obchodmi')],
    [tr('Priemerné MFE'),fmtMoney(avg(allMfe)),allMfe.length?'pos':'',tr('priemerný najlepší bod v tvoj prospech, naprieč všetkými obchodmi')],
    [tr('Priem. MAE ziskových'),fmtMoney(-avg(maeWins)),maeWins.length?'neg':'',tr('koľko museli víťazi vydržať proti sebe')],
    [tr('Najhorší MAE víťaza'),fmtMoney(-worstWinMae),worstWinMae?'neg':'',tr('pod týmto by ťa stop vyhodil zo ziskového obchodu')],
    [tr('Priem. MFE stratových'),fmtMoney(avg(mfeLosses)),mfeLosses.length?'pos':'',tr('koľko zisku stratové obchody medzitým ukázali')],
    [tr('Nechané na stole'),fmtMoney(leftTotal),leftTotal?'pos':'',tr('rozdiel medzi MFE a reálnym ziskom víťazov')],
  ].map(k=>`<div class="card"><div class="lbl">${esc(k[0])}</div><div class="val ${k[2]}">${k[1]}</div><div class="lbl" style="margin-top:4px">${esc(k[3])}</div></div>`).join('')+'</div>';
  if(outliers)renderExcursionOutliers(outliers,wins);
}
/* Presné klikanie na malý bod v scatter grafe je na dotyku aj pri prekrývajúcich sa
   bodoch nespoľahlivé - preto popri klikaní na graf existuje aj tento zoznam
   najvýraznejších prípadov (najviac nechaného na stole / najtesnejšie prežitý stop)
   ako spoľahlivý, vždy klikateľný vstup do rovnakého detailu obchodu. */
export function topExcursionOutliers(list,valueOf,n){
  return [...list].filter(r=>valueOf(r)>0).sort((a,b)=>valueOf(b)-valueOf(a)).slice(0,n==null?5:n);
}
function excursionOutlierRowsHTML(list,valueOf,label){
  const top=topExcursionOutliers(list,valueOf);
  if(!top.length)return '';
  return `<div style="margin-top:14px"><div class="lbl" style="margin-bottom:6px">${esc(label)}</div>`+
    `<table><tbody>${top.map(r=>`<tr data-trade-id="${r.trade.id}">`+
      `<td>${esc(fmtD(tTime(r.trade)))}</td>`+
      `<td><b>${esc(String(r.trade.symbol||'').toUpperCase())}</b></td>`+
      `<td class="${moneyCls(r.pnl)}">${esc(fmtMoney(r.pnl))}</td>`+
      `<td class="hint">${esc(fmtMoney(valueOf(r)))}</td>`+
      `</tr>`).join('')}</tbody></table></div>`;
}
export function renderExcursionOutliers(box,wins){
  box.innerHTML=
    excursionOutlierRowsHTML(wins,r=>r.leftOnTable,tr('Najviac nechané na stole'))+
    excursionOutlierRowsHTML(wins,r=>r.mae,tr('Najtesnejšie prežitý stop (najhlbší MAE u víťazov)'));
}
