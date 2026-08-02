'use strict';
/* ================= Tabs ================= */
function goToTab(name){
  document.querySelectorAll('nav button').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
  const btn=document.querySelector('nav button[data-tab="'+name+'"]');
  if(btn)btn.classList.add('active');
  $('tab-'+name).classList.add('active');
  if(name==='dashboard')renderDashboard();
  if(name==='stats')renderStats();
  if(name==='reports')renderReports();
  closeMobileNav();
}
document.querySelectorAll('nav button').forEach(b=>{
  b.onclick=()=>goToTab(b.dataset.tab);
});
function toggleMobileNav(){$('headerControls').classList.toggle('open');}
function closeMobileNav(){$('headerControls').classList.remove('open');}
