const app=document.getElementById("app");
const KEYS=[["learnt","Learnt"],["revised","Revised"],["pyq","PYQ"]];
const R=[46,36,26],W=7,C=R.map(r=>2*Math.PI*r);
const CONTACT="The syllabus is fixed and can’t be edited here. To request a change, contact Jeoff.";
const CHECK='<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M4.5 10.5l3.7 3.7L15.5 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const RELOAD='<svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><path d="M16 10a6 6 0 1 1-1.8-4.3M16 3.5v3.8h-3.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const reloadBtn=`<button class="icon-btn" data-reload aria-label="Reload page">${RELOAD}</button>`;
const CHEV='<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M12.5 4.5L7 10l5.5 5.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const get=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))||d}catch(e){return d}};
const put=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
let profile=get("profile",null),prog={},cur=null;
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
  return (S().exams||[]).map(e=>({...e,papers:Object.entries(e.papers||{}).map(([s,p])=>{
      const d=new Date(p.date+"T00:00:00");return {s,d,chapters:p.chapters==="all"?(S().subjects[s]||[]).map((_,i)=>i+1):(p.chapters||[]),left:Math.round((d-t)/864e5)};
    }).filter(p=>p.left>=0).sort((a,b)=>a.d-b.d)}))
    .filter(e=>e.papers.length).sort((a,b)=>a.papers[0].d-b.papers[0].d);
}
function plan(e){
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
  return {items,rows,q};
}
function today(e,p){
  const d=new Date().toDateString(),s=get("today:"+ID(),{});
  if(s.v===2&&s.date===d&&s.exam===e.name)return s;
  const n={v:2,date:d,exam:e.name,keys:p.q};put("today:"+ID(),n);return n;
}

/* ---------- home ---------- */
function counts(s){
  const c=[0,0,0];
  S().subjects[s].forEach(ch=>KEYS.forEach(([k],j)=>{if(st(s,ch)[k])c[j]++}));
  return c;
}
function home(){
  const subs=Object.keys(S().subjects);
  let h=`<div class="top"><h1 tabindex="-1">Academic Tracker</h1><div class="tools"><button class="pill" data-change>${label()}<span>Change</span></button>${reloadBtn}</div></div>`;
  if(!subs.length){
    app.innerHTML=h+`<div class="empty"><b>Syllabus coming soon</b>The ${label()} syllabus hasn’t been added yet. ${CONTACT}</div>`;
    return;
  }
  const ex=upcoming()[0];let fr=null,tp="";
  if(ex){
    const p=plan(ex),n=p.items.length,t=today(ex,p);
    const f=KEYS.map(([k])=>p.items.filter(x=>st(x.s,x.c)[k]).length);fr=f.map(x=>x/Math.max(n,1));
    const ago=l=>l===0?"today":l===1?"1 day left":l+" days left";
    const list=p.rows.map(r=>`<li><b>${r.s}</b>, ${fmt(r.d)}, ${ago(r.left)}<small>${r.todo?`${r.todo} of ${r.n} chapters to learn, about ${r.per} a day`:"All chapters learnt. Time to revise."}</small></li>`).join("");
    const rows=t.keys.length?t.keys.map(([s,c,k])=>`<div class="row plan${st(s,c)[k]?" done":""}"><span>${c}<small>${s}${k==="revised"?", revise":""}</small></span><button class="chip" style="--c:var(--${k})" data-plan="${s}|${c}" data-k="${k}" aria-pressed="${!!st(s,c)[k]}" aria-label="Mark ${c} ${k}">${CHECK}</button></div>`).join(""):`<div class="row plan"><span>Nothing left for today.</span></div>`;
    tp=`<section class="excard" id="ex">${wrap(112,20)}<div><h2>${ex.name}</h2><ul class="papers">${list}</ul>${legend()}</div></section><h2 class="sec">Today’s plan</h2><div class="table">${rows}</div>`;
  }else tp=`<div class="empty"><b>No exam scheduled</b>The next exam date and its chapters haven’t been added yet. ${CONTACT}</div>`;
  const cards=subs.map(s=>{
    const m=S().subjects[s].length,k=counts(s);
    return `<button class="card" data-go="${slug(s)}" data-fr="${k.map(x=>x/m)}">${rings(64)}<span class="name">${s}</span><span class="sub">${k[0]} of ${m} learnt</span></button>`;
  }).join("");
  app.innerHTML=h+tp+`<h2 class="sec">Subjects</h2><div class="grid">${cards}</div><p class="note">${CONTACT}</p>`;
  if(fr)setRings(app.querySelector("#ex"),fr);
  app.querySelectorAll(".card").forEach(el=>setRings(el,el.dataset.fr.split(",").map(Number)));
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
  app.innerHTML=`<div class="subtop"><button class="back" data-back>${CHEV}All subjects</button>${reloadBtn}</div><section class="shead" id="shead">${wrap(112,19)}<div><h2 tabindex="-1">${s}</h2>${legend()}</div></section><div class="table">${rows}</div><p class="note">${CONTACT}</p>`;
  setRings(app.querySelector("#shead"),c.map(x=>x/n));
}

/* ---------- events + routing ---------- */
function click(e){
  const g=e.target.closest("[data-go]");
  if(g){location.hash=g.dataset.go;return}
  if(e.target.closest("[data-reload]")){location.reload();return}
  if(e.target.closest("[data-back]")){location.hash="";return}
  if(e.target.closest("[data-change]")){try{localStorage.removeItem("profile")}catch(x){}profile=null;location.hash="";welcome();return}
  const p=e.target.closest("[data-plan]");
  if(p){const [s,c]=p.dataset.plan.split("|");setSt(s,c,p.dataset.k,p.getAttribute("aria-pressed")!=="true");home();return}
  const t=e.target.closest("[data-t]");
  if(t&&cur){
    const v=t.getAttribute("aria-pressed")!=="true";
    setSt(cur,t.dataset.ch,t.dataset.t,v);
    t.setAttribute("aria-pressed",v);
    const row=t.closest(".row");
    row.classList.toggle("done",row.querySelectorAll('[aria-pressed="true"]').length===3);
    const chs=S().subjects[cur];
    setRings(app.querySelector("#shead"),counts(cur).map(x=>x/chs.length));
  }
}
function route(){
  if(!profile||!SYLLABUS[ID()])return welcome();
  const h=decodeURIComponent(location.hash.slice(1));
  cur=Object.keys(S().subjects).find(s=>slug(s)===h)||null;
  cur?subject(cur):home();
  window.scrollTo(0,0);
}
function start(){prog=get("progress:"+ID(),{});route()}
app.onclick=click;
addEventListener("hashchange",()=>{if(profile)route()});
profile?start():welcome();
