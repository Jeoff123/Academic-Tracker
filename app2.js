/* Part 2 of the app: plan editor, subject page, timetable, events and routing. Loads after app.js. */
/* ---------- choose today's plan ---------- */
let sel=new Set();
function countSel(){const c=app.querySelector("#selcount");if(c)c.textContent=sel.size+" chapter"+(sel.size===1?"":"s")+" selected"}
function planEditor(){
  const exs=upcoming(),ex=exs[0];
  if(!ex){location.hash="";return}
  const p=plan(ex,exs.slice(1)),t=today(ex,p),cu=get("custom:"+ID(),{}),custom=cu.date===new Date().toDateString()?cu:null;
  sel=new Set((custom?custom.keys:t.keys).map(k=>k[0]+"|"+k[1]));
  const groups=ex.papers.map(pp=>{
    const chs=S().subjects[pp.s]||[];
    const rows=pp.chapters.filter(n=>chs[n-1]).map(n=>{
      const c=chs[n-1],d=st(pp.s,c),key=(pp.s+"|"+c).replace(/"/g,"&quot;");
      const state=[d.learnt&&"learnt",d.revised&&"revised",d.pyq&&"PYQ done"].filter(Boolean).join(", ")||"Not started";
      return `<div class="row plan"><span>${n}. ${c}<small>${state}</small></span><button class="chip" style="--c:var(--revised)" data-pick="${key}" aria-pressed="${sel.has(pp.s+"|"+c)}" aria-label="Add ${c.replace(/"/g,"&quot;")} to today&rsquo;s plan">${CHECK}</button></div>`;
    }).join("");
    return `<div class="phead"><div><h2>${pp.s}</h2><small>${fmt(pp.d)}, ${tagFor(pp.left,false)[0].toLowerCase()}</small></div></div><div class="table">${rows}</div>`;
  }).join("");
  app.innerHTML=`<div class="subtop"><button class="back" data-backto="">${CHEV}Back</button>${reloadBtn}</div><h1 tabindex="-1">Today&rsquo;s plan</h1><p class="lede">Pick the chapters you want to study today for ${ex.name}. The suggested ones are already ticked.</p>${groups}<div class="planbar"><span id="selcount"></span><button class="go2" data-save>Save plan</button>${custom?`<button class="ghost" data-reset>Reset to suggested</button>`:""}</div><p class="note">${CONTACT}</p>`;
  countSel();
}
function savePlan(){
  const ex=upcoming()[0];if(!ex)return;
  const keys=[];
  ex.papers.forEach(pp=>{
    const chs=S().subjects[pp.s]||[];
    pp.chapters.forEach(n=>{
      const c=chs[n-1];
      if(c&&sel.has(pp.s+"|"+c)){const d=st(pp.s,c);keys.push([pp.s,c,!d.learnt?"learnt":!d.revised?"revised":"pyq"])}
    });
  });
  put("custom:"+ID(),{date:new Date().toDateString(),keys});
}

/* ---------- subject ---------- */
function subject(s){
  const chs=S().subjects[s],n=chs.length,c=counts(s),ex=upcoming()[0],pp=ex&&ex.papers.find(p=>p.s===s);
  const inEx=pp?pp.chapters.map(i=>chs[i-1]):[];
  let rows=`<div class="row head"><span>Chapter</span>${KEYS.map(([k,l])=>`<span style="color:var(--${k})">${l}</span>`).join("")}</div>`;
  chs.forEach((ch,i)=>{
    const d=st(s,ch);
    rows+=`<div class="row${d.learnt&&d.revised&&d.pyq?" done":""}"><span>${i+1}. ${ch}${inEx.includes(ch)?`<small>In the exam on ${fmt(pp.d)}</small>`:""}</span>${KEYS.map(([k,l])=>`<button class="chip" style="--c:var(--${k})" data-t="${k}" data-ch="${ch.replace(/"/g,"&quot;")}" aria-pressed="${!!d[k]}" aria-label="${l}, ${ch.replace(/"/g,"&quot;")}">${CHECK}</button>`).join("")}</div>`;
  });
  app.innerHTML=`<div class="subtop"><button class="back" data-back>${CHEV}All subjects</button>${reloadBtn}</div><section class="shead" id="shead">${wrap(112,19)}<div><h2 tabindex="-1">${s}</h2>${legend()}</div></section><div class="table">${rows}</div><h2 class="sec">Clear progress</h2><div class="clears">${KEYS.map(([k,l],i)=>`<button class="clr" style="--c:var(--${k})" data-clear="${k}"${c[i]?"":" disabled"}>Clear ${l==="PYQ"?"PYQ":l.toLowerCase()}<small>${c[i]} chapter${c[i]===1?"":"s"} ticked</small></button>`).join("")}</div><p class="note">${CONTACT}</p>`;
  setRings(app.querySelector("#shead"),c.map(x=>x/n));
}

/* ---------- timetable ---------- */
function timetable(){
  const t=new Date();t.setHours(0,0,0,0);
  const mo=(d,o)=>d.toLocaleDateString(undefined,o);
  const tagOf=(left,over)=>over?["Done",""]:left===0?["Today","soon"]:left===1?["Tomorrow","soon"]:["In "+left+" days",""];
  const row=(d,over,tag,title,sub,go)=>`<div class="row tt${over?" past":""}"${go?` data-exam="${go}" tabindex="0" role="button"`:""}><span class="dt"><b>${d.getDate()}</b>${mo(d,{month:"short"})}<br>${mo(d,{weekday:"short"})}</span><span><b>${title}</b>${sub?`<small>${sub}</small>`:""}</span><span class="tag ${tag[1]}">${tag[0]}</span></div>`;
  const secs=[];
  (S().exams||[]).forEach((e,ei)=>{
    const ps=Object.entries(e.papers||{}).map(([s,p])=>{
      const d=new Date(p.date+"T00:00:00"),chs=S().subjects[s]||[];
      const idx=p.chapters==="all"?chs.map((_,i)=>i+1):(p.chapters||[]);
      const names=idx.map(n=>chs[n-1]).filter(Boolean);
      return {d,left:Math.round((d-t)/864e5),over:isOver(p.date),s,what:p.chapters==="all"?`Full syllabus, ${names.length} chapters`:names.join(", ")};
    });
    Object.entries(e.extra||{}).forEach(([s,p])=>{const d=new Date(p.date+"T00:00:00");ps.push({d,left:Math.round((d-t)/864e5),over:isOver(p.date),s,what:p.note||"Theory exam, no fixed chapters",extra:1})});
    ps.sort((x,y)=>x.d-y.d);
    if(ps.length)secs.push({k:ps[0].d,name:e.name,go:ps.some(p=>!p.extra)?"exam-"+ei:"",rows:ps.map(p=>row(p.d,p.over,tagOf(p.left,p.over),p.s,p.what,p.extra?"":"exam-"+ei+"-"+slug(p.s)))});
  });
  (S().events||[]).forEach(ev=>{
    const ds=ev.dates.map(x=>typeof x==="string"?{date:x}:x).sort((x,y)=>x.date<y.date?-1:1).map(x=>({...x,d:new Date(x.date+"T00:00:00")}));
    if(ds.length)secs.push({k:ds[0].d,name:ev.name,rows:ds.map(x=>{const over=isOver(x.date);return row(x.d,over,tagOf(Math.round((x.d-t)/864e5),over),ev.label||"Practical",x.note||"")})});
  });
  secs.sort((x,y)=>x.k-y.k);
  let h=`<div class="subtop"><button class="back" data-back>${CHEV}Back</button>${reloadBtn}</div><h1 tabindex="-1">Exam timetable</h1><p class="lede">${label()}</p>`;
  if(!secs.length)h+=`<div class="empty"><b>No exams added yet</b>${CONTACT}</div>`;
  h+=secs.map(x=>`<h2 class="sec"${x.go?` data-exam="${x.go}" tabindex="0" role="button" style="cursor:pointer"`:""}>${x.name}${x.go?`<span class="more">All chapters</span>`:""}</h2><div class="table">${x.rows.join("")}</div>`).join("");
  app.innerHTML=h+(secs.length?`<p class="note">${CONTACT}</p>`:"");
}

/* ---------- events + routing ---------- */
function click(e){
  const xe=e.target.closest("[data-exam]");
  if(xe){fromHash=location.hash.slice(1);location.hash=xe.dataset.exam;return}
  if(e.target.closest("[data-goplan]")){location.hash="plan";return}
  const pk=e.target.closest("[data-pick]");
  if(pk){const key=pk.dataset.pick,on=!sel.has(key);on?sel.add(key):sel.delete(key);pk.setAttribute("aria-pressed",on);countSel();return}
  if(e.target.closest("[data-save]")){savePlan();location.hash="";return}
  if(e.target.closest("[data-reset]")){try{localStorage.removeItem("custom:"+ID())}catch(x){}location.hash="";return}
  const bt=e.target.closest("[data-backto]");
  if(bt){location.hash=bt.dataset.backto;return}
  const g=e.target.closest("[data-go]");
  if(g){location.hash=g.dataset.go;return}
  if(e.target.closest("[data-reload]")){location.reload();return}
  if(e.target.closest("[data-back]")){location.hash="";return}
  if(e.target.closest("[data-change]")){try{localStorage.removeItem("profile")}catch(x){}profile=null;location.hash="";welcome();return}
  const p=e.target.closest("[data-plan]");
  if(p){const [s,c]=p.dataset.plan.split("|");setSt(s,c,p.dataset.k,p.getAttribute("aria-pressed")!=="true");home();return}
  const cl=e.target.closest("[data-clear]");
  if(cl&&cur){
    const k=cl.dataset.clear,l=KEYS.find(x=>x[0]===k)[1];
    if(confirm(`Clear every "${l}" tick for ${cur}? This can't be undone.`)){
      S().subjects[cur].forEach(ch=>{if(st(cur,ch)[k])setSt(cur,ch,k,false)});
      subject(cur);
    }
    return;
  }
  const t=e.target.closest("[data-t]");
  if(t&&(cur||view)){
    const v=t.getAttribute("aria-pressed")!=="true";
    setSt(t.dataset.s||cur,t.dataset.ch,t.dataset.t,v);
    t.setAttribute("aria-pressed",v);
    const row=t.closest(".row");
    row.classList.toggle("done",row.querySelectorAll('[aria-pressed="true"]').length===3);
    if(view)paintExam();
    else{const chs=S().subjects[cur];setRings(app.querySelector("#shead"),counts(cur).map(x=>x/chs.length))}
  }
}
function route(){
  if(!profile||!SYLLABUS[ID()])return welcome();
  const h=decodeURIComponent(location.hash.slice(1));
  view=null;
  const xm=h.match(/^exam-(\d+)(?:-(.+))?$/);
  if(xm){cur=null;examPage(+xm[1],xm[2]||"");window.scrollTo(0,0);return}
  if(h==="plan"){cur=null;planEditor();window.scrollTo(0,0);return}
  if(h==="timetable"){cur=null;timetable();window.scrollTo(0,0);return}
  cur=Object.keys(S().subjects).find(s=>slug(s)===h)||null;
  cur?subject(cur):home();
  window.scrollTo(0,0);
}
function start(){prog=get("progress:"+ID(),{});route()}
app.onclick=click;
app.addEventListener("keydown",e=>{if((e.key==="Enter"||e.key===" ")&&e.target.matches&&e.target.matches("[data-exam]")){e.preventDefault();click(e)}});
addEventListener("hashchange",()=>{if(profile)route()});
let sig="";
setInterval(()=>{ // refresh by itself when an exam passes its end time while the page is open
  if(!profile||!SYLLABUS[ID()])return;
  const n=JSON.stringify([upcoming().map(e=>[e.name,e.papers.map(p=>[p.s,p.left])]),(S().events||[]).map(ev=>ev.dates.map(x=>isOver(x.date||x)))]);
  if(sig&&n!==sig)route();
  sig=n;
},30000);
window.__start=function(){profile?start():welcome()};
addEventListener("load",function(){if(!app.innerHTML.trim())window.__start()});
