import { $ } from './utils.js';
import { renderDashboard } from './dashboard.js';
import { renderStats } from './stats.js';
import { renderReports } from './trades-list.js';

/* ================= Tabs ================= */
export function goToTab(name){
  document.querySelectorAll('nav button').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
  const btn=document.querySelector('nav button[data-tab="'+name+'"]');
  if(btn)btn.classList.add('active');
  $('tab-'+name).classList.add('active');
  if(name==='dashboard')renderDashboard();
  if(name==='stats')renderStats();
  if(name==='reports')renderReports();
  // Bez resetu sa nová sekcia otvorí v tej istej výške, v akej bola predošlá -
  // napr. zoznam obchodov uprostred tabuľky, čo vyzerá ako že sa nič nestalo.
  window.scrollTo(0,0);
  closeMobileNav();
}
document.querySelectorAll('nav button').forEach(b=>{
  b.onclick=()=>goToTab(b.dataset.tab);
});
export function toggleMobileNav(){$('headerControls').classList.toggle('open');}
export function closeMobileNav(){$('headerControls').classList.remove('open');}
