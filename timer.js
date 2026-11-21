/* Study timer: pause, Pomodoro, screen saver mode, +time, finish early, study log. */
(function () {
"use strict";
var KEY = "timer", POMO = 25 * 60, BRK = 5 * 60;
var T = null, loopId = null, ac = null, lock = null, sv = null, bar = null, drift = 0;
var ICON = '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><circle cx="10" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10 7.8V11l2.2 1.4M8 2.5h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

var css = `
.row.plan.hastimer{grid-template-columns:1fr auto 56px;gap:8px}
.tstart{width:36px;height:36px;border-radius:50%;border:1px solid var(--line);background:var(--surface);color:var(--muted);display:grid;place-items:center;cursor:pointer;padding:0}
.tstart:hover{color:var(--revised);border-color:var(--revised)}
body.has-timer{padding-bottom:170px}
.tmodal{position:fixed;inset:0;z-index:90;background:rgba(10,15,30,.55);display:grid;place-items:center;padding:16px}
.tcard{background:var(--surface);color:var(--ink);border-radius:24px;padding:22px;max-width:440px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.35);max-height:100%;overflow:auto}
.tcard h2{font-size:22px;margin:0 0 6px}
.tsub{color:var(--muted);margin:0 0 14px;line-height:1.4}
.tsub b{color:var(--ink)}
.thard{color:var(--pyq);font-weight:600;font-size:13px;margin:-6px 0 12px}
.topts{display:flex;flex-wrap:wrap;gap:8px}
.topt{border:2px solid var(--line);background:var(--surface);color:var(--ink);border-radius:999px;padding:8px 16px;font-weight:600;cursor:pointer}
.topt.on{border-color:var(--revised);background:rgba(91,77,224,.12);background:color-mix(in srgb,var(--revised) 14%,var(--surface))}
.tcustom{display:flex;align-items:center;gap:10px;margin:14px 0 8px;color:var(--muted)}
.tcustom input[type=number]{width:100px;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--ink);font:inherit}
.tpomo{display:flex;align-items:flex-start;gap:10px;margin:0 0 14px;color:var(--ink);line-height:1.35}
.tpomo input{width:20px;height:20px;margin-top:2px;accent-color:var(--revised)}
.tpomo small{display:block;color:var(--muted)}
.tbtns{display:grid;gap:10px}
.tbtns .go2,.tbtns .ghost{width:100%}
.tbtns .linkbtn{justify-self:center;padding:6px;background:none;border:0;color:var(--revised);font-weight:600;cursor:pointer;text-decoration:underline}
#tbar{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:50;max-width:640px;margin:0 auto;background:var(--ink);color:var(--bg);border-radius:22px;padding:12px 14px;display:grid;grid-template-columns:auto 1fr;gap:8px 14px;align-items:center;box-shadow:0 8px 30px rgba(0,0,0,.3)}
#tbar .tt{font:700 30px/1 var(--font-d);font-variant-numeric:tabular-nums}
#tbar .tinfo{min-width:0}
#tbar .tinfo b{display:block;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#tbar .tinfo small{display:block;opacity:.75;font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#tbar .tbs{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:8px}
#tbar.up .tt{color:#f6b25a}
#tbar.brk .tt,#tsaver.brk .tsv-time{color:#2dd4bf}
#tbar.pz .tt,#tsaver.pz .tsv-time{opacity:.55}
.tb{border:0;border-radius:999px;padding:9px 15px;font:600 14px var(--font-b);cursor:pointer;background:rgba(127,127,127,.3);color:inherit}
.tb.p{background:var(--learnt);color:var(--on)}
.tb.hide{display:none}
#tsaver{position:fixed;inset:0;z-index:100;background:#080d1a;color:#e8edf7;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;padding-top:calc(24px + env(safe-area-inset-top,0px));padding-bottom:calc(24px + env(safe-area-inset-bottom,0px))}
.tsv-in{width:100%;max-width:720px;transition:transform 3s ease}
.tsv-ex{color:#97a4bf;font-size:clamp(15px,3.6vw,20px)}
.tsv-ch{font:600 clamp(24px,6vw,44px)/1.2 var(--font-d);margin:6px 0 0}
.tsv-time{font:700 clamp(72px,24vw,200px)/1 var(--font-d);font-variant-numeric:tabular-nums;margin:20px 0}
.tsv-bar{height:6px;border-radius:6px;background:#26324d;overflow:hidden;margin:0 auto 18px;max-width:560px}
.tsv-bar i{display:block;height:100%;background:#2dd4bf;width:100%;transition:width 1s linear}
.tsv-sub{color:#97a4bf;margin:0 0 22px;min-height:1.5em}
.tsv-btns{display:flex;flex-wrap:wrap;gap:12px;justify-content:center}
.tsv-btns .tb{min-height:52px;padding:0 22px;border-radius:16px;font-size:16px;background:#18223a;color:#e8edf7;border:1px solid #33415f}
.tsv-btns .tb.p{background:#2dd4bf;color:#0b1020;border:0}
.tsv-btns .tb.hide{display:none}
#tsaver.up .tsv-time{color:#f6b25a}
#tsaver.up .tsv-bar i{background:#f6b25a}
.ttoast{position:fixed;top:calc(16px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);background:var(--ink);color:var(--bg);padding:10px 16px;border-radius:14px;z-index:120;max-width:90%;font-weight:600;text-align:center}
`;
var stl = document.createElement("style"); stl.textContent = css; document.head.appendChild(stl);

function load() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }
function save() { try { if (T) localStorage.setItem(KEY, JSON.stringify(T)); else localStorage.removeItem(KEY); } catch (e) {} }
function pad(n) { return (n < 10 ? "0" : "") + n; }
function clock(s) { s = Math.max(s, 0); var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return (h ? h + ":" : "") + pad(m) + ":" + pad(s % 60); }
function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
function toast(t) { document.querySelectorAll(".ttoast").forEach(function (o) { o.remove(); }); var x = el("div", "ttoast"); x.textContent = t; document.body.appendChild(x); setTimeout(function () { x.remove(); }, 4500); }
function beep() {
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === "suspended") ac.resume();
    [0, 0.35, 0.7].forEach(function (d) {
      var o = ac.createOscillator(), g = ac.createGain();
      o.frequency.value = 880; g.gain.value = 0.15; o.connect(g); g.connect(ac.destination);
      o.start(ac.currentTime + d); o.stop(ac.currentTime + d + 0.2);
    });
  } catch (e) {}
  try { if (navigator.vibrate) navigator.vibrate([300, 150, 300, 150, 300]); } catch (e) {}
}

/* ----- timer state: phases "study" and "break"; studied = seconds of real study ----- */
function remaining() { return T.fin ? 0 : T.paused ? T.pl : Math.round((T.pend - Date.now()) / 1000); }
function studiedSecs() {
  var s = T.studied;
  if (T.phase === "study" && T.seg && !T.paused && !T.fin) s += (Date.now() - T.seg) / 1000;
  return Math.min(s, T.budget);
}
function advance() {
  var now = Date.now(), moved = false;
  while (!T.paused && !T.fin && T.pend <= now) {
    if (T.phase === "study") {
      T.studied += (T.pend - T.seg) / 1000; T.seg = 0; moved = true;
      if (T.studied >= T.budget - 1) { T.fin = true; T.studied = Math.min(T.studied, T.budget); break; }
      T.phase = "break"; T.plen = BRK; T.pend += BRK * 1000;
    } else {
      var len = Math.min(POMO, T.budget - T.studied);
      T.phase = "study"; T.seg = T.pend; T.plen = len; T.pend += len * 1000; moved = true;
    }
  }
  if (moved) { save(); beep(); }
}
function pause() {
  if (T.fin) return;
  var now = Date.now();
  if (!T.paused) {
    T.pl = Math.max(0, Math.round((T.pend - now) / 1000));
    if (T.phase === "study" && T.seg) { T.studied += (now - T.seg) / 1000; T.seg = 0; }
    T.paused = true;
  } else {
    T.pend = now + T.pl * 1000; if (T.phase === "study") T.seg = now; T.paused = false; T.pl = 0;
  }
  save(); update();
}
function add(m) {
  var now = Date.now(); T.budget += m * 60;
  if (T.fin) { T.fin = false; T.phase = "study"; T.seg = now; T.pend = now + m * 60000; T.plen = m * 60; }
  else if (T.phase === "study") { if (T.paused) T.pl += m * 60; else T.pend += m * 60000; T.plen += m * 60; }
  if (window.PlanTime) window.PlanTime.set(T.s, T.c, Math.round(T.budget / 60));
  save(); update(); toast(m + " more minutes added");
}

/* ----- display ----- */
function btns(inSaver) {
  return '<button class="tb" data-ta="add5">+5 min</button><button class="tb" data-ta="add10">+10 min</button>' +
    '<button class="tb" data-ta="pause" data-tm="pausebtn">Pause</button>' +
    '<button class="tb p" data-ta="early" data-tm="earlylabel">Finished early</button>' +
    (inSaver ? '<button class="tb" data-ta="exit">Exit screen saver</button>'
             : '<button class="tb" data-ta="saver">Screen saver</button><button class="tb" data-ta="cancel">Cancel timer</button>');
}
function fill(root) {
  root.querySelectorAll('[data-tm="ch"]').forEach(function (n) { n.textContent = T.c; });
  root.querySelectorAll('[data-tm="ex"]').forEach(function (n) { n.textContent = (T.ex ? T.ex + ", " : "") + T.s; });
}
function buildBar() {
  if (bar) return;
  bar = el("div", "", '<div class="tt" data-tm="time">00:00</div><div class="tinfo"><b data-tm="ch"></b><small data-tm="ex"></small><small data-tm="status"></small></div><div class="tbs">' + btns(false) + "</div>");
  bar.id = "tbar"; document.body.appendChild(bar); document.body.classList.add("has-timer"); fill(bar);
}
function nudge() {
  var i = sv && sv.querySelector(".tsv-in"); if (!i) return;
  var xs = [-14, 12, -8, 16], ys = [10, -12, 14, -6]; drift = (drift + 1) % 4;
  i.style.transform = "translate(" + xs[drift] + "px," + ys[drift] + "px)";
}
function update() {
  if (!T) { stopLoop(); return; }
  advance();
  var r = remaining(), up = T.fin, pz = T.paused, br = T.phase === "break" && !up;
  var q = function (s, f) { document.querySelectorAll('[data-tm="' + s + '"]').forEach(f); };
  q("time", function (n) { n.textContent = clock(r); });
  q("status", function (n) { n.textContent = up ? "Time is up. Add more time or finish." : pz ? "Paused" : br ? "Break time, rest your eyes" : T.pomo ? "Study block" : "Keep going"; });
  q("earlylabel", function (n) { n.textContent = up ? "I am done" : "Finished early"; });
  q("pausebtn", function (n) { n.textContent = pz ? "Resume" : "Pause"; n.classList.toggle("hide", up); });
  q("fill", function (n) { n.style.width = (up ? 0 : Math.max(0, Math.min(100, r / T.plen * 100))) + "%"; });
  [bar, sv].forEach(function (n) { if (n) { n.classList.toggle("up", up); n.classList.toggle("brk", br); n.classList.toggle("pz", pz); } });
  document.title = (up ? "Time is up - " : (br ? "Break " : "") + clock(r) + " - ") + "Academic Tracker";
  if (sv && r % 60 === 0) nudge();
}
function startLoop() { if (!loopId) loopId = setInterval(update, 1000); update(); }
function stopLoop() { if (loopId) { clearInterval(loopId); loopId = null; } }

function wake() { try { if (navigator.wakeLock && sv) navigator.wakeLock.request("screen").then(function (l) { lock = l; }).catch(function () {}); } catch (e) {} }
function openSaver() {
  if (sv || !T) return;
  sv = el("div", "", '<div class="tsv-in"><div class="tsv-ex" data-tm="ex"></div><div class="tsv-ch" data-tm="ch"></div><div class="tsv-time" data-tm="time">00:00</div><div class="tsv-bar"><i data-tm="fill"></i></div><p class="tsv-sub" data-tm="status"></p><div class="tsv-btns">' + btns(true) + "</div></div>");
  sv.id = "tsaver"; document.body.appendChild(sv); fill(sv);
  if (bar) bar.style.display = "none";
  try { var f = document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); if (f && f.catch) f.catch(function () {}); } catch (e) {}
  wake(); update();
}
function closeSaver() {
  if (!sv) return;
  sv.remove(); sv = null; if (bar) bar.style.display = "";
  try { if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen(); } catch (e) {}
  try { if (lock) lock.release(); lock = null; } catch (e) {}
}
function goHome() { if (location.hash) location.hash = ""; else if (typeof route === "function") route(); }
function clear() {
  closeSaver(); T = null; save(); stopLoop();
  if (bar) { bar.remove(); bar = null; }
  document.body.classList.remove("has-timer"); document.title = "Academic Tracker";
}
function logIt(t, secs) { if (window.StudyLog && secs >= 30) window.StudyLog.add(t.s, secs); }
function finish() {
  var t = T, secs = studiedSecs(), mins = Math.max(1, Math.round(secs / 60));
  clear(); logIt(t, secs);
  try { if (typeof setSt === "function") setSt(t.s, t.c, t.k, true); } catch (e) {}
  toast(t.c + " done. Studied for " + mins + " min.");
  if (typeof route === "function") route();
}
function act(a) {
  if (!T) return;
  if (a === "add5") add(5);
  else if (a === "add10") add(10);
  else if (a === "pause") pause();
  else if (a === "early") finish();
  else if (a === "cancel") {
    if (confirm("Cancel this timer without marking the chapter? Time already studied is still saved to your study log.")) { var t = T, s = studiedSecs(); clear(); logIt(t, s); }
  }
  else if (a === "saver") openSaver();
  else if (a === "exit") { closeSaver(); goHome(); }
}

function begin(s, c, k, ex, mins, saver, pomo) {
  try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
  var now = Date.now(), b = mins * 60, len = pomo ? Math.min(POMO, b) : b;
  T = { s: s, c: c, k: k, ex: ex, at: now, pomo: pomo ? 1 : 0, budget: b, studied: 0, phase: "study", seg: now, pend: now + len * 1000, plen: len, pl: 0, paused: false, fin: false };
  if (window.PlanTime) window.PlanTime.set(s, c, mins);
  try { localStorage.setItem("pomo", pomo ? "1" : "0"); } catch (e) {}
  save(); buildBar(); startLoop(); if (saver) openSaver();
}
function ask(s, c, k) {
  if (T) { toast("A timer is already running."); return; }
  var ex = ""; try { ex = (upcoming()[0] || {}).name || ""; } catch (e) {}
  var hard = !!(window.HardFlags && window.HardFlags.is(s, c)), sel = hard ? 45 : 30, pm = false;
  try { pm = localStorage.getItem("pomo") === "1"; } catch (e) {}
  var m = el("div", "tmodal",
    '<div class="tcard" role="dialog" aria-modal="true" aria-label="Study timer"><h2>How much time do you need?</h2>' +
    '<p class="tsub"><b>' + c + "</b><br>" + s + (ex ? ", " + ex : "") + "</p>" +
    (hard ? '<p class="thard">Starred as hard, so more time (45 min) is suggested.</p>' : "") +
    '<div class="topts">' + [15, 30, 45, 60, 90].map(function (n) { return '<button class="topt' + (n === sel ? " on" : "") + '" data-min="' + n + '">' + n + " min</button>"; }).join("") + "</div>" +
    '<label class="tcustom">Or type minutes <input type="number" min="1" max="600" inputmode="numeric" id="tmin" placeholder="e.g. 40"></label>' +
    '<label class="tpomo"><input type="checkbox" id="tpomo"' + (pm ? " checked" : "") + '><span>Pomodoro mode<small>25 min study, 5 min break, repeated until your time is used.</small></span></label>' +
    '<div class="tbtns"><button class="go2" data-tgo="0">Start timer</button><button class="ghost" data-tgo="1">Start in screen saver mode</button><button class="linkbtn" data-tcancel>Cancel</button></div></div>');
  document.body.appendChild(m);
  var inp = m.querySelector("#tmin");
  inp.addEventListener("input", function () { m.querySelectorAll(".topt").forEach(function (x) { x.classList.remove("on"); }); });
  m.addEventListener("click", function (e) {
    var o = e.target.closest(".topt");
    if (o) { sel = +o.dataset.min; inp.value = ""; m.querySelectorAll(".topt").forEach(function (x) { x.classList.toggle("on", x === o); }); return; }
    if (e.target === m || e.target.closest("[data-tcancel]")) { m.remove(); return; }
    var g = e.target.closest("[data-tgo]");
    if (g) { var v = parseInt(inp.value, 10), mins = v > 0 ? Math.min(v, 600) : sel, pomo = m.querySelector("#tpomo").checked; m.remove(); begin(s, c, k, ex, mins, g.dataset.tgo === "1", pomo); }
  });
}

document.addEventListener("click", function (e) {
  var b = e.target.closest && e.target.closest("[data-timer]");
  if (b) { var p = b.dataset.timer.split("|"); ask(p[0], p[1], p[2] || "learnt"); return; }
  var a = e.target.closest && e.target.closest("[data-ta]");
  if (a) act(a.dataset.ta);
});
document.addEventListener("keydown", function (e) { if (e.key === "Escape" && sv) closeSaver(); });
document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") { if (sv) wake(); if (T) update(); } });

function enhance() {
  document.querySelectorAll(".row.plan [data-plan]").forEach(function (chip) {
    var row = chip.closest(".row"); if (!row || row.querySelector(".tstart")) return;
    var b = el("button", "tstart", ICON); b.type = "button";
    b.setAttribute("data-timer", chip.dataset.plan + "|" + (chip.dataset.k || "learnt"));
    b.setAttribute("aria-label", "Start a study timer");
    row.classList.add("hastimer"); row.insertBefore(b, chip);
  });
}
var appEl = document.getElementById("app");
if (appEl) new MutationObserver(enhance).observe(appEl, { childList: true, subtree: true });
enhance();

T = load();
if (T && T.budget) { buildBar(); startLoop(); } else { T = null; save(); }
})();