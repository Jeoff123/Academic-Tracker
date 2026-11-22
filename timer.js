/* Study timer: pause, Pomodoro, screen saver mode, +time, finish early, study log. */
(function () {
"use strict";
var KEY = "timer", POMO = 25 * 60, BRK = 5 * 60;
var T = null, loopId = null, ac = null, lock = null, sv = null, bar = null, drift = 0;
var ICON = '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><circle cx="10" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10 7.8V11l2.2 1.4M8 2.5h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';


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
var PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="4.5" width="4.2" height="15" rx="1.4" fill="currentColor"/><rect x="13.8" y="4.5" width="4.2" height="15" rx="1.4" fill="currentColor"/></svg>';
var PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4.8v14.4a1 1 0 0 0 1.5.9l11.2-7.2a1 1 0 0 0 0-1.7L9.5 3.9A1 1 0 0 0 8 4.8z" fill="currentColor"/></svg>';
function btns(inSaver) {
  return '<button class="tb" data-ta="pause" data-tm="pausebtn" aria-label="Pause" title="Pause">' + PAUSE + "</button>" +
    '<button class="tb" data-ta="addtime">Add time</button>' +
    '<button class="tb" data-ta="doubt">Note a doubt</button>' +
    '<button class="tb p" data-ta="early" data-tm="earlylabel">Finished early</button>' +
    (inSaver ? '<button class="tb" data-ta="exit">Exit screen saver</button>'
             : '<button class="tb" data-ta="saver">Screen saver</button><button class="tb" data-ta="cancel">Cancel timer</button>');
}
function addSheet() {
  if (document.querySelector(".tadd")) return;
  var m = el("div", "tmodal tadd", '<div class="tcard" role="dialog" aria-modal="true" aria-label="Add time"><h2>Add time</h2><p class="tsub">How much more time do you need?</p>' +
    '<div class="topts" style="display:grid;grid-template-columns:repeat(3,1fr)">' + [5, 10, 15].map(function (n) { return '<button type="button" class="topt" data-addm="' + n + '">+' + n + " min</button>"; }).join("") +
    '</div><div class="tbtns" style="margin-top:12px"><button type="button" class="linkbtn" data-addx>Cancel</button></div></div>');
  m.style.zIndex = "140"; document.body.appendChild(m);
  m.addEventListener("click", function (e) {
    var b = e.target.closest("[data-addm]");
    if (b) { m.remove(); if (T) add(+b.dataset.addm); return; }
    if (e.target === m || e.target.closest("[data-addx]")) m.remove();
  });
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
  q("pausebtn", function (n) { var w = pz ? "Resume" : "Pause"; if (n.getAttribute("aria-label") !== w) { n.innerHTML = pz ? PLAY : PAUSE; n.setAttribute("aria-label", w); n.title = w; } n.disabled = up; });
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
  if (a === "addtime") addSheet();
  else if (a === "pause") pause();
  else if (a === "doubt") { if (window.Doubts) window.Doubts.ask(T.s, T.c); }
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
  var hard = !!(window.HardFlags && window.HardFlags.is(s, c)), sel = hard ? 90 : 60, pm = false;
  try { pm = localStorage.getItem("pomo") === "1"; } catch (e) {}
  var m = el("div", "tmodal",
    '<div class="tcard" role="dialog" aria-modal="true" aria-label="Study timer"><h2>How much time do you need?</h2>' +
    '<p class="tsub"><b>' + c + "</b><br>" + s + (ex ? ", " + ex : "") + "</p>" +
    (hard ? '<p class="thard">Starred as hard, so more time (1 h 30 min) is suggested.</p>' : "") +
    '<div class="topts">' + [30, 45, 60, 90, 120].map(function (n) { return '<button class="topt' + (n === sel ? " on" : "") + '" data-min="' + n + '">' + n + " min</button>"; }).join("") + "</div>" +
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
window.__timer = 1;
})();
  
