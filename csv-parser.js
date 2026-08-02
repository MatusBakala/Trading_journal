'use strict';
/* ================= CSV parser ================= */
function parseCSV(text){
  text=text.replace(/^﻿/,'');
  const firstLine=text.split(/\r?\n/)[0]||'';
  let best=',',bestC=-1;
  for(const d of [',',';','\t']){
    let c=0,inQ=false;
    for(const ch of firstLine){if(ch==='"')inQ=!inQ;else if(ch===d&&!inQ)c++;}
    if(c>bestC){bestC=c;best=d;}
  }
  const rows=[];let row=[],cell='',inQ=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(inQ){
      if(ch==='"'){if(text[i+1]==='"'){cell+='"';i++;}else inQ=false;}
      else cell+=ch;
    }else{
      if(ch==='"')inQ=true;
      else if(ch===best){row.push(cell);cell='';}
      else if(ch==='\n'||ch==='\r'){
        if(ch==='\r'&&text[i+1]==='\n')i++;
        row.push(cell);cell='';
        if(row.length>1||row[0].trim()!=='')rows.push(row);
        row=[];
      }else cell+=ch;
    }
  }
  if(cell!==''||row.length){row.push(cell);if(row.length>1||row[0].trim()!=='')rows.push(row);}
  return rows;
}
