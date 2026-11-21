/* Confidence rating (1-5) after a chapter is learnt or revised, revision reminders, weak chapters. */
(function () {
"use strict";
var DAYS = { 1: 1, 2: 2, 3: 4 }; /* rating -> days until it should be revised */
function pid() { try { return ID(); } catch (e) { return "x"; } }
function ld(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
function sv(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
function pad(n) { return (n < 10 ? "0" : "") + n; }
function key(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
function CK() { return "conf:" + pid(); }
function dt(s) { var p = s.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
function days(a, b) { return Math.round((a - b) / 864e5); }
function today0() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }

var css = `
.rmodal{position:fixed;inset:0;z-index:95;background:rgba(10,15,30,.55);display:grid;place-items:center;padding:16px}
.rcard{background:var(--surface);color:var(--ink);border-radius:24px;padding:22px;max-width:420px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.35);text-align:center}
.rcard h2{font-size:22px;margin:0 0 6px}
.rsub{color:var(--muted);margin:0 0 16px;line-height:1.4}
.rsub b{color:var(--ink)}
.rrow{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}
.rrow button{height:52px;border-radius:16px;border:2px solid var(--line);background:var(--surface);color:var(--ink);font:700 20px var(--font-d);cursor:pointer}
.rrow button:hover,.rrow button:focus-visible{border-color:var(--revised);color:var(--revised)}
.rlab{display:flex;justify-content:space-between;color:var(--muted);font-size:12.5px;margin:8px 2px 14px}
.rskip{background:none;border:0;color:var(--muted);font-weight:600;cursor:pointer;padding:8px;text-decoration:underline}
.rtoast{position:fixed;top:calc(16px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);background:var(--ink);color:var(--bg);padding:10px 16px;border-radius:14px;z-index:120;max-width:90%;font-weight:600;text-align:center}
.wkcard{display:flex;align-items:center;gap:14px;width:100%;text-align:left;background:var(--surface);color:var(--ink);border:1px solid var(--line);border-radius:20px;padding:14px 16px;margin:24px 0 0;cursor:pointer;font:inherit}
.wkcard:hover{border-color:var(--pyq)}
.wkcard .wi{flex:none;display:grid;place-items:center;width:44px;height:44px;border-radius:14px;background:rgba(201,116,10,.14);color:var(--pyq)}
.wkcard .wt{flex:1;min-width:0}
.wkcard b{display:block;font:600 17px/1.25 var(--font-d)}
.wkcard small{color:var(--muted);font-size:13px}
.wkrow{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;border-top:1px solid var(--line)}
.wkrow:first-child{border-top:0}
.wkrow b{display:block;font-weight:600}
.wkrow small{color:var(--muted);font-size:13px}
.wkbtn{flex:none;border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:999px;padding:8px 14px;font-weight:600;cursor:pointer}
.wkbtn:hover{border-color:var(--revised);color:var(--revised)}
`;
var stl = document.createElement("style"); stl.textContent = css; document.head.appendChild(stl);

function pool() {
  var o = {};
  try { upcoming().forEach(function (e) { e.papers.forEach(function (p) { var chs = S().subjects[p.s] || []; p.chapters.forEach(function (n) { if (chs[n - 1]) o[p.s + "|" + chs[n - 1]] = 1; }); }); }); } catch (e) {}
  return o;
}
var C = window.Confidence = {
  get: function (s, c) { return ld(CK(), {})[s + "|" + c] || null; },
  set: function (s, c, r) { var m = ld(CK(), {}); m[s + "|" + c] = { r: r, d: key(new Date()), done: r > 3 }; sv(CK(), m); },
  /* chapters (rated 1-3, not revised since) whose revision is due by date D */
  due: function (D) {
    var m = ld(CK(), {}), pl = pool(), out = [];
    Object.keys(m).forEach(function (k) {
      var e = m[k]; if (!e || e.done || !DAYS[e.r] || !pl[k]) return;
      var due = dt(e.d); due.setDate(due.getDate() + DAYS[e.r]);
      if (due <= D) { var p = k.split("|"); out.push({ s: p[0], c: p.slice(1).join("|"), r: e.r, d: e.d }); }
    });
    out.sort(function (a, b) { return a.r - b.r || (a.d < b.d ? -1 : 1); });
    return out.map(function (x) { return [x.s, x.c]; });
  },
  weak: function () {
    var m = ld(CK(), {}), out = [];
    Object.keys(m).forEach(function (k) {
      var p = k.split("|"), s = p[0], c = p.slice(1).join("|");
      if (m[k].r <= 2 && (S().subjects[s] || []).indexOf(c) > -1) out.push({ s: s, c: c, r: m[k].r, d: m[k].d });
    });
    out.sort(function (a, b) { return a.r - b.r || (a.d < b.d ? -1 : 1); });
    return out;
  }
};

/* ask for a rating whenever a chapter becomes learnt or revised */
var _set = setSt;
setSt = function (s, c, k, v) {
  _set.apply(this, arguments);
  if (!v) return;
  if (k === "revised") { var m = ld(CK(), {}), e = m[s + "|" + c]; if (e) { e.done = true; sv(CK(), m); } }
  if (k === "learnt" || k === "revised") ask(s, c);
};
var _plan = plan;
plan = function (e, later) {
  var r = _plan(e, later), taken = {};
  r.q.forEach(function (k) { taken[k[0] + "|" + k[1]] = 1; });
  var due = C.due(today0()).filter(function (x) { return !taken[x[0] + "|" + x[1]]; }).slice(0, 2);
  var at = r.q.findIndex(function (k) { return k[3]; });
  due.forEach(function (x) { var it = [x[0], x[1], "revised"]; if (at < 0) r.q.push(it); else { r.q.splice(at, 0, it); at++; } });
  return r;
};

function toast(t) { document.querySelectorAll(".rtoast").forEach(function (o) { o.remove(); }); var x = document.createElement("div"); x.className = "rtoast"; x.textContent = t; document.body.appendChild(x); setTimeout(function () { x.remove(); }, 4500); }
function ask(s, c) {
  if (document.querySelector(".rmodal")) return;
  var m = document.createElement("div"); m.className = "rmodal";
  m.innerHTML = '<div class="rcard" role="dialog" aria-modal="true" aria-label="Confidence rating"><h2>How confident are you?</h2><p class="rsub"><b></b><br></p>' +
    '<div class="rrow">' + [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" data-r="' + n + '" aria-label="Confidence ' + n + ' out of 5">' + n + "</button>"; }).join("") +
    '</div><div class="rlab"><span>Not sure</span><span>Very sure</span></div><button type="button" class="rskip" data-rskip>Skip</button></div>';
  m.querySelector("b").textContent = c; m.querySelector(".rsub").appendChild(document.createTextNode(s));
  document.body.appendChild(m);
  m.addEventListener("click", function (e) {
    var b = e.target.closest("[data-r]");
    if (b) {
      var r = +b.dataset.r; C.set(s, c, r); m.remove();
      toast(r <= 2 ? "Noted. This chapter will come back for revision soon." : r === 3 ? "Okay. A revision is planned in a few days." : "Great. Keep it fresh with your normal revision.");
      if (location.hash === "#weak") weakPage();
      return;
    }
    if (e.target === m || e.target.closest("[data-rskip]")) m.remove();
  });
}

function weakPage() {
  try { cur = null; view = null; } catch (e) {}
  var list = C.weak(), t = today0();
  var rows = list.map(function (x) {
    var ago = days(t, dt(x.d)), q = (x.s + "|" + x.c).replace(/"/g, "&quot;");
    return '<div class="wkrow"><span><b>' + x.c + "</b><small>" + x.s + ", rated " + x.r + " of 5, " + (ago <= 0 ? "today" : ago + (ago === 1 ? " day ago" : " days ago")) + '</small></span><button type="button" class="wkbtn" data-wkrev="' + q + '">Revised</button></div>';
  }).join("");
  app.innerHTML = '<div class="subtop"><button class="back" data-backto="">' + CHEV + "Back</button>" + reloadBtn + '</div><h1 tabindex="-1">Weak chapters</h1><p class="lede">' + label() + ". Chapters you rated 1 or 2 out of 5.</p>" +
    (list.length ? '<div class="table">' + rows + "</div>" : '<div class="empty"><b>No weak chapters</b>Chapters you rate 1 or 2 will show up here, and they come back in your plan for revision.</div>') +
    '<p class="note">Tap Revised after you revise a chapter, then rate it again. Chapters rated 3 or lower are added to your plan for revision after a few days.</p>';
}
if (typeof route === "function") {
  var _r = route;
  route = function () {
    if (typeof profile !== "undefined" && profile && location.hash === "#weak") { weakPage(); window.scrollTo(0, 0); return; }
    return _r.apply(this, arguments);
  };
}
document.addEventListener("click", function (e) {
  var w = e.target.closest && e.target.closest("[data-weak]"); if (w) { location.hash = "weak"; return; }
  var b = e.target.closest && e.target.closest("[data-wkrev]");
  if (b) { var p = b.dataset.wkrev.split("|"); setSt(p[0], p.slice(1).join("|"), "revised", true); if (location.hash === "#weak") weakPage(); }
});

function enhance() {
  var a = document.getElementById("app"); if (!a || a.querySelector(".wkcard")) return;
  var h = Array.prototype.filter.call(a.querySelectorAll("h2"), function (x) { return x.textContent.trim() === "Subjects"; })[0];
  if (!h) return;
  var n = 0; try { n = C.weak().length; } catch (e) {}
  if (!n) return;
  var b = document.createElement("button"); b.type = "button"; b.className = "wkcard"; b.setAttribute("data-weak", "");
  b.innerHTML = '<span class="wi"><svg viewBox="0 0 20 20" width="22" height="22" aria-hidden="true"><path d="M10 3.5l7 12.5H3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M10 8.5v3.5M10 14.2v.1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></span><span class="wt"><b>Weak chapters</b><small>' + n + " chapter" + (n > 1 ? "s need" : " needs") + " revision</small></span>";
  h.parentNode.insertBefore(b, h);
}
var appEl = document.getElementById("app");
if (appEl) new MutationObserver(enhance).observe(appEl, { childList: true, subtree: true });
enhance();
})();
