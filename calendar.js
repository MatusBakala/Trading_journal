'use strict';
/* ================= Calendar ================= */
function calMove(d){calDate=new Date(calDate.getFullYear(),calDate.getMonth()+d,1);renderCalendar();}
function renderCalendar(){
  const y=calDate.getFullYear(),m=calDate.getMonth();
  const months=['Január','Február','Marec','Apríl','Máj','Jún','Júl','August','September','Október','November','December'];
  $('calMonthName').textContent=months[m]+' '+y;
  const daily={};
  accTrades().forEach(t=>{const k=dayKey(tTime(t));(daily[k]=daily[k]||{pnl:0,n:0});daily[k].pnl+=computePnl(t);daily[k].n++;});
  const first=new Date(y,m,1);
  let startDow=(first.getDay()+6)%7; // Monday first
  const dim=new Date(y,m+1,0).getDate();
  const dows=['Po','Ut','St','Št','Pi','So','Ne'];
  let html=dows.map(d=>`<div class="dow">${d}</div>`).join('');
  for(let i=0;i<startDow;i++)html+='<div class="day other"></div>';
  let monthTotal=0;
  for(let d=1;d<=dim;d++){
    const k=y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    const info=daily[k];
    let cls='day',inner=`<div class="dn">${d}</div>`;
    if(info){monthTotal+=info.pnl;
      cls+=' has '+(info.pnl>0?'win':(info.pnl<0?'loss':''));
      inner+=`<div class="dp ${moneyCls(info.pnl)}">${fmtMoney(info.pnl)}</div><div class="dc">${info.n} ${info.n===1?'obchod':(info.n<5?'obchody':'obchodov')}</div>`;
    }
    html+=`<div class="${cls}" ${info?`data-day="${k}"`:''}>${inner}</div>`;
  }
  $('calGrid').innerHTML=html;
  $('calTotal').innerHTML=`Mesiac: <span class="${moneyCls(monthTotal)}">${fmtMoney(monthTotal)}</span>`;
  $('calDayPanel').style.display='none';
}
function showDay(k){
  const dayTrades=accTrades().filter(t=>dayKey(tTime(t))===k).sort((a,b)=>tTime(a)-tTime(b));
  const p=$('calDayPanel');
  p.style.display='block';
  p.innerHTML=`<h3>Obchody ${k.split('-').reverse().join('.')}</h3>`+tradeTableHTML(dayTrades);
}
