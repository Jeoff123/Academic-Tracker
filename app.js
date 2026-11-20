const app=document.getElementById("app");
const KEYS=[["learnt","Learnt"],["revised","Revised"],["pyq","PYQ"]];
const R=[46,36,26],W=7,C=R.map(r=>2*Math.PI*r);
const CONTACT="The syllabus is fixed and can’t be edited here. To request a change, contact Jeoff.";
const CHECK='<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M4.5 10.5l3.7 3.7L15.5 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const RELOAD='<svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><path d="M16 10a6 6 0 1 1-1.8-4.3M16 3.5v3.8h-3.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const reloadBtn=`<button class="icon-btn" data-reload aria-label="Reload page">${RELOAD}</button>`;
const CAL='<svg viewBox="0 0 20 20" width="22" height="22" aria-hidden="true"><rect x="3" y="4.5" width="14" height="12.5" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3 8.5h14M7 2.8v3M13 2.8v3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
const CHEV='<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M12.5 4.5L7 10l5.5 5.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const OVER_HOUR=15; // an exam counts as over at this hour (24h clock) on its date
const isOver=ds=>new Date()>=new Date(ds+"T"+String(OVER_HOUR).padStart(2,"0")+":00:00");
const get=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))||d}catch(e){return d}};
const put=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
let profile=get("profile",null),prog={},cur=null,view=null,fromHash="";
const ID=()=>profile.board+"-"+profile.stream;
const S=()=>SYLLABUS[ID()];
const st=(s,c)=>prog[s+"|"+c]||{};
function setSt(s,c,k,v){const o=prog[s+"|"+c]=Object.assign({},prog[s+"|"+c]);o[k]=v;put("progress:"+ID(),prog)}
const slug=s=>s.toLowerCase().replace(/\s+/g,"-");
const pct=(n,t)=>t?Math.round(n/t*100):0;
const label=()=>(profile.board==="CBSE"?"CBSE":"State board")+" "+profile.stream;

/* ---------- rings ---------- */
function rings(size){
  const t=R.map(r=>`<circle cx="50" cy="50" r="${r}" fill="none" stroke="var(--track)" stroke-width="${W}"/>`).join("");
  const a=R.map((r,i)=>`<circle class="arc" cx="50" cy="50" r="${r}" fill="none" stroke="var(--${KEYS[i][0]})" stroke-width="${W}" stroke-linecap="round" stroke-dasharray="${C[i]}" stroke-dashoffset="${C[i]}" style="opacity:0" transform="rotate(-90 50 50)"/>`).join("");
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">${t}${a}</svg>`;
}
const wrap=(size,fs)=>`<div class="ringwrap">${rings(size)}<div class="cbox"><span class="cpct" style="font-size:${fs}px"></span></div></div>`;
const legend=()=>`<ul class="legend">${KEYS.map(([k,l])=>`<li><i style="background:var(--${k})"></i>${l}</li>`).join("")}</ul>`;
function setRings(root,fr){
  void root.offsetWidth;
  root.querySelectorAll(".arc").forEach((a,i)=>{a.style.strokeDashoffset=C[i]*(1-fr[i]);a.style.opacity=fr[i]>0?1:0});
  const p=root.querySelector(".cpct");if(p)p.textContent=pct(fr[0]*100,100)+"%";
}

/* ---------- welcome ---------- */
function welcome(){
  const pick={};
  const group=(g,title,opts)=>`<h2 class="q">${title}</h2><div class="opts">${opts.map(([v,t,s])=>`<button class="opt" data-g="${g}" data-v="${v}" aria-pressed="false"><b>${t}</b><small>${s}</small></button>`).join("")}</div>`;
  app.innerHTML=`<h1 tabindex="-1">Welcome</h1><p class="lede">Choose your board and batch. Your syllabus loads automatically.</p>
  ${group("board","Which board are you in?",[["State","State board","State syllabus"],["CBSE","CBSE","NCERT syllabus"]])}
  ${group("stream","Which batch are you in?",[["PCMC","PCMC","Physics, Chemistry, Maths, Computer"],["PCMB","PCMB","Physics, Chemistry, Maths, Biology"]])}
  <button class="go" id="go" disabled>Start tracking</button><p class="note">${CONTACT}</p>`;
  app.onclick=e=>{
    const o=e.target.closest(".opt");
    if(o){
      pick[o.dataset.g]=o.dataset.v;
      app.querySelectorAll(`.opt[data-g="${o.dataset.g}"]`).forEach(x=>x.setAttribute("aria-pressed",x===o));
      document.getElementById("go").disabled=!(pick.board&&pick.stream);
    }
    if(e.target.closest("#go")&&pick.board&&pick.stream){profile=pick;put("profile",profile);app.onclick=click;start()}
  };
}

/* ---------- exam plan ---------- */
const fmt=d=>d.toLocaleDateString(undefined,{day:"numeric",month:"short"});
function upcoming(){
  const t=new Date();t.setHours(0,0,0,0);
  return (S().exams||[]).map((e,i)=>({...e,i,papers:Object.entries(e.papers||{}).map(([s,p])=>{
      const d=new Date(p.date+"T00:00:00");return {s,d,chapters:p.chapters==="all"?(S().subjects[s]||[]).map((_,i)=>i+1):(p.chapters||[]),left:Math.round((d-t)/864e5),over:isOver(p.date)};
    }).filter(p=>!p.over).sort((a,b)=>a.d-b.d)}))
    .filter(e=>e.papers.length).sort((a,b)=>a.papers[0].d-b.papers[0].d);
}
function plan(e,later=[]){
  const items=[],rows=[],q=[];
  e.papers.forEach(p=>{
    const mine=p.chapters.map(n=>({s:p.s,c:(S().subjects[p.s]||[])[n-1]})).filter(x=>x.c);
    const todo=mine.filter(x=>!st(x.s,x.c).learnt);
    const rev=Math.min(3,Math.floor(p.left/4)),days=Math.max(1,p.left-rev),per=Math.ceil(todo.length/days);
    items.push(...mine);
    rows.push({...p,n:mine.length,todo:todo.length,per});
    if(todo.length)todo.slice(0,per).forEach(x=>q.push([x.s,x.c,"learnt"]));
    else mine.filter(x=>!st(x.s,x.c).revised).slice(0,2).forEach(x=>q.push([x.s,x.c,"revised"]));
  });
  /* Spare time: when every paper of this exam has more than (chapters left + 2) days,
     add ONE bonus chapter, after the current exam's own chapters, from the biggest pending portion of the following exams. */
  let note="";
  const live=rows.filter(r=>r.todo>0);
  if(live.every(r=>r.left>r.todo+2)){
    const E=1;
    const taken=new Set(q.map(k=>k[0]+"|"+k[1]));
    const build=src=>{
      const pool={};
      src.forEach(x=>x.papers.forEach(p=>{
        const chs=S().subjects[p.s]||[];
        p.chapters.slice().sort((m,n)=>m-n).forEach(n=>{
          const c=chs[n-1];
          if(c&&!st(p.s,c).learnt&&!taken.has(p.s+"|"+c)){
            const o=pool[p.s]=pool[p.s]||[];
            if(!o.some(y=>y.c===c))o.push({c,from:x.name});
          }
        });
      }));
      return pool;
    };
    let pool=build(later);
    if(!Object.keys(pool).length)pool=build([e]);
    let first=null;
    for(let i=0;i<E;i++){
      const s=Object.keys(pool).sort((m,n)=>pool[n].length-pool[m].length)[0];
      if(!s||!pool[s].length)break;
      if(!first)first={s,n:pool[s].length,from:pool[s][0].from};
      q.push([s,pool[s].shift().c,"learnt","ahead"]);
    }
    if(first)note=`The main chapters above are for ${e.name}, so do them first. You have spare time, so 1 bonus chapter is added${first.from!==e.name?` from ${first.from}`:""}. ${first.s} has the biggest portion left (${first.n} chapters).`;
  }
  return {items,rows,q,note};
}
function today(e,p){
  const d=new Date().toDateString(),s=get("today:"+ID(),{});
  const sg=p.rows.map(r=>r.s).join(",");
  if(s.v===5&&s.date===d&&s.exam===e.name&&s.sig===sg)return s;
  const n={v:5,date:d,exam:e.name,sig:sg,keys:p.q,note:p.note};put("today:"+ID(),n);return n;
}

/* ---------- home ---------- */
function counts(s){
  const c=[0,0,0];
  S().subjects[s].forEach(ch=>KEYS.forEach(([k],j)=>{if(st(s,ch)[k])c[j]++}));
  return c;
}
function home(){
  const subs=Object.keys(S().subjects);
  let h=`<div class="top"><h1 tabindex="-1">Academic Tracker</h1><div class="tools"><button class="pill" data-change>${label()}<span>Change</span></button>${reloadBtn}</div></div><button class="ttlink" data-go="timetable"><span class="ttico">${CAL}</span><span><b>Exam timetable</b><small>All exam dates for ${label()}</small></span><span class="ttgo">${CHEV}</span></button>`;
  if(!subs.length){
    app.innerHTML=h+`<div class="empty"><b>Syllabus coming soon</b>The ${label()} syllabus hasn’t been added yet. ${CONTACT}</div>`;
    return;
  }
  const exs=upcoming(),ex=exs[0];let fr=null,tp="";
  if(ex){
    const p=plan(ex,exs.slice(1)),n=p.items.length,t=today(ex,p);
    const f=KEYS.map(([k])=>p.items.filter(x=>st(x.s,x.c)[k]).length);fr=f.map(x=>x/Math.max(n,1));
    const ago=l=>l===0?"today":l===1?"1 day left":l+" days left";
    const list=p.rows.map(r=>`<li data-exam="exam-${ex.i}-${slug(r.s)}" tabindex="0" role="button"><b>${r.s}</b>, ${fmt(r.d)}, ${ago(r.left)}<small>${r.todo?`${r.todo} of ${r.n} chapters to learn, about ${r.per} a day`:"All chapters learnt. Time to revise."}</small></li>`).join("");
    const cu=get("custom:"+ID(),{}),custom=cu.date===new Date().toDateString()?cu:null,tk=custom?custom.keys:t.keys;
    const rows=tk.length?tk.map(([s,c,k,ah])=>`<div class="row plan${st(s,c)[k]?" done":""}"><span>${c}<small>${s}${k==="revised"?", revise":""}${ah?", bonus":""}</small></span><button class="chip" style="--c:var(--${k})" data-plan="${s}|${c}" data-k="${k}" aria-pressed="${!!st(s,c)[k]}" aria-label="Mark ${c} ${k}">${CHECK}</button></div>`).join(""):`<div class="row plan"><span>${custom?"You haven’t picked any chapters for today.":"Nothing left for today."}</span></div>`;
    tp=`<section class="excard" id="ex" data-exam="exam-${ex.i}" tabindex="0" role="button">${wrap(112,20)}<div><h2>${ex.name}</h2><ul class="papers">${list}</ul><p class="hint">Tap the exam or a subject to see only its chapters.</p>${!custom&&t.note?`<p class="ahead">${t.note}</p>`:""}${legend()}</div></section><div class="phead"><h2>Today’s plan</h2><button class="mini" data-goplan>${custom?"Edit":"Change"}</button></div>${custom?`<p class="hint">You chose this plan. The suggested plan comes back tomorrow.</p>`:""}<div class="table">${rows}</div>`;
  }else tp=`<div class="empty"><b>No exam scheduled</b>The next exam date and its chapters haven’t been added yet. ${CONTACT}</div>`;
  const cards=subs.map(s=>{
    const m=S().subjects[s].length,k=counts(s);
    return `<button class="card" data-go="${slug(s)}" data-fr="${k.map(x=>x/m)}">${rings(64)}<span class="name">${s}</span><span class="sub">${k[0]} of ${m} learnt</span></button>`;
  }).join("");
  app.innerHTML=h+tp+`<h2 class="sec">Subjects</h2><div class="grid">${cards}</div><p class="note">${CONTACT}</p>`;
  if(fr)setRings(app.querySelector("#ex"),fr);
  app.querySelectorAll(".card").forEach(el=>setRings(el,el.dataset.fr.split(",").map(Number)));
}

/* ---------- exam page (only the chapters of one exam) ---------- */
const tagFor=(left,over)=>over?["Done",""]:left===0?["Today","soon"]:left===1?["Tomorrow","soon"]:["In "+left+" days",""];
function papersOf(e){
  const t=new Date();t.setHours(0,0,0,0);
  return Object.entries(e.papers||{}).map(([s,p])=>{
    const chs=S().subjects[s]||[],d=new Date(p.date+"T00:00:00");
    const idx=p.chapters==="all"?chs.map((_,i)=>i+1):(p.chapters||[]);
    return {s,d,left:Math.round((d-t)/864e5),over:isOver(p.date),items:idx.filter(n=>chs[n-1]).map(n=>({n,c:chs[n-1]}))};
  }).sort((x,y)=>x.d-y.d);
}
function shown(e,only){const all=papersOf(e),f=only?all.filter(p=>slug(p.s)===only):all;return f.length?f:all}
function paintExam(){
  const e=S().exams[view.i],it=shown(e,view.only).flatMap(p=>p.items.map(x=>({s:p.s,c:x.c}))),n=Math.max(it.length,1);
  setRings(app.querySelector("#shead"),KEYS.map(([k])=>it.filter(x=>st(x.s,x.c)[k]).length/n));
}
function examPage(i,only){
  const e=(S().exams||[])[i];
  if(!e){location.hash="";return}
  const ps=shown(e,only);
  view={i,only};
  const body=ps.map(p=>{
    const tg=tagFor(p.left,p.over);
    let rows=`<div class="row head"><span>Chapter</span>${KEYS.map(([k,l])=>`<span style="color:var(--${k})">${l}</span>`).join("")}</div>`;
    p.items.forEach(({n,c})=>{
      const d=st(p.s,c),q=c.replace(/"/g,"&quot;");
      rows+=`<div class="row${d.learnt&&d.revised&&d.pyq?" done":""}"><span>${n}. ${c}</span>${KEYS.map(([k,l])=>`<button class="chip" style="--c:var(--${k})" data-t="${k}" data-s="${p.s}" data-ch="${q}" aria-pressed="${!!d[k]}" aria-label="${l}, ${q}">${CHECK}</button>`).join("")}</div>`;
    });
    return `<div class="phead"><div><h2>${p.s}</h2><small>${p.d.toLocaleDateString(undefined,{weekday:"short",day:"numeric",month:"short"})}, ${p.items.length} chapter${p.items.length===1?"":"s"}</small></div><span class="tag ${tg[1]}">${tg[0]}</span></div><div class="table">${rows}</div>`;
  }).join("");
  app.innerHTML=`<div class="subtop"><button class="back" data-backto="${fromHash}">${CHEV}Back</button>${reloadBtn}</div><section class="shead" id="shead">${wrap(112,19)}<div><h2 tabindex="-1">${e.name}${only&&ps.length===1?": "+ps[0].s:""}</h2>${legend()}</div></section>${body}<p class="note">${CONTACT}</p>`;
  paintExam();
}

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
      return `<div class="row plan"><span>${n}. ${c}<small>${state}</small></span><button class="chip" style="--c:var(--revised)" data-pick="${key}" aria-pressed="${sel.has(pp.s+"|"+c)}" aria-label="Add ${c.replace(/"/g,"&quot;")} to today’s plan">${CHECK}</button></div>`;
    }).join("");
    return `<div class="phead"><div><h2>${pp.s}</h2><small>${fmt(pp.d)}, ${tagFor(pp.left,false)[0].toLowerCase()}</small></div></div><div class="table">${rows}</div>`;
  }).join("");
  app.innerHTML=`<div class="subtop"><button class="back" data-backto="">${CHEV}Back</button>${reloadBtn}</div><h1 tabindex="-1">Today’s plan</h1><p class="lede">Pick the chapters you want to study today for ${ex.name}. The suggested ones are already ticked.</p>${groups}<div class="planbar"><span id="selcount"></span><button class="go2" data-save>Save plan</button>${custom?`<button class="ghost" data-reset>Reset to suggested</button>`:""}</div><p class="note">${CONTACT}</p>`;
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
    }).sort((x,y)=>x.d-y.d);
    if(ps.length)secs.push({k:ps[0].d,name:e.name,go:"exam-"+ei,rows:ps.map(p=>row(p.d,p.over,tagOf(p.left,p.over),p.s,p.what,"exam-"+ei+"-"+slug(p.s)))});
  });
  (S().events||[]).forEach(ev=>{
    const ds=ev.dates.map(x=>typeof x==="string"?{date:x}:x).sort((x,y)=>x.date<y.date?-1:1).map(x=>({...x,d:new Date(x.date+"T00:00:00")}));
    if(ds.length)secs.push({k:ds[0].d,name:ev.name,rows:ds.map(x=>{const over=isOver(x.date);return row(x.d,over,tagOf(Math.round((x.d-t)/864e5),over),"Practical",x.note||"")})});
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
    if(confirm(`Clear every "${l}" tick for ${cur}? This can’t be undone.`)){
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
profile?start():welcome();
