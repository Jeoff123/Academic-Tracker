/* Study timer: start from today's plan, screen saver mode, +time, finish early. */
(function () {
"use strict";
var KEY = "timer", T = null, loopId = null, ac = null, lock = null, sv = null, bar = null, drift = 0;
var ICON = '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><circle cx="10" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10 7.8V11l2.2 1.4M8 2.5h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

var css = `
.row.plan.hastimer{grid-template-columns:1fr auto 56px;gap:8px}
.tstart{width:36px;height:36px;border-radius:50%;border:1px solid var(--line);background:var(--surface);color:var(--muted);display:grid;place-items:center;cursor:pointer;padding:0}
.tstart:hover{color:var(--revised);border-color:var(--revised)}
body.has-timer{padding-bottom:150px}
.tmodal{position:fixed;inset:0;z-index:90;background:rgba(10,15,30,.55);display:grid;place-items:center;padding:16px}
.tcard{background:var(--surface);color:var(--ink);border-radius:24px;padding:22px;max-width:440px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.35)}
.tcard h2{font-size:22px;margin:0 0 6px}
.tsub{color:var(--muted);margin:0 0 14px;line-height:1.4}
.tsub b{color:var(--ink)}
.topts{display:flex;flex-wrap:wrap;gap:8px}
.topt{border:2px solid var(--line);background:var(--surface);color:var(--ink);border-radius:999px;padding:8px 16px;font-weight:600;cursor:pointer}
.topt.on{border-color:var(--revised);background:rgba(91,77,224,.12);background:color-mix(in srgb,var(--revised) 14%,var(--surface))}
.tcustom{display:flex;align-items:center;gap:10px;margin:14px 0;color:var(--muted)}
.tcustom input{width:100px;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--ink);font:inherit}
.tbtns{display:grid;gap:10px}
.tbtns .go2,.tbtns .ghost{width:100%}
.tbtns .linkbtn{justify-self:center;padding:6px}
#tbar{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:50;max-width:640px;margin:0 auto;background:var(--ink);color:var(--bg);border-radius:22px;padding:12px 14px;display:grid;grid-template-columns:auto 1fr;gap:8px 14px;align-items:center;box-shadow:0 8px 30px rgba(0,0,0,.3)}
#tbar .tt{font:700 30px/1 var(--font-d);font-variant-numeric:tabular-nums}
#tbar .tinfo{min-width:0}
#tbar .tinfo b{display:block;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#tbar .tinfo small{display:block;opacity:.7;font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#tbar .tbs{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:8px}
#tbar.up .tt{color:#f6b25a}
.tb{border:0;border-radius:999px;padding:9px 15px;font:600 14px var(--font-b);cursor:pointer;background:rgba(127,127,127,.3);color:inherit}
.tb.p{background:var(--learnt);color:var(--on)}
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
#tsaver.up .tsv-time{color:#f6b25a}
#tsaver.up .tsv-bar i{background:#f6b25a}
.ttoast{position:fixed;top:calc(16px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);background:var(--ink);color:var(--bg);padding:10px 16px;border-radius:14px;z-index:120;max-width:90%;font-weight:600;text-align:center}
`;
var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

function load() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } }
function save() { try { if (T) localStorage.setItem(KEY, JSON.stringify(T)); else localStorage.removeItem(KEY); } catch (e) {} }
function left() { return Math.round((T.end - Date.now()) / 1000); }
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

function btns(inSaver) {
  return '<button class="tb" data-ta="add5">+5 min</button><button class="tb" data-ta="add10">+10 min</button>' +
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
  bar = el("div", "", '<div class="tt" data-tm="time">00:00</div><div class="tinfo"><b data-tm="ch"></b><small data-tm="ex"></small></div><div class="tbs">' + btns(false) + "</div>");
  bar.id = "tbar"; document.body.appendChild(bar); document.body.classList.add("has-timer"); fill(bar);
}
function nudge() {
  var i = sv && sv.querySelector(".tsv-in"); if (!i) return;
  var xs = [-14, 12, -8, 16], ys = [10, -12, 14, -6]; drift = (drift + 1) % 4;
  i.style.transform = "translate(" + xs[drift] + "px," + ys[drift] + "px)";
}
function update() {
  if (!T) { stopLoop(); return; }
  var r = left(), up = r <= 0;
  if (up && !T.fin) { T.fin = true; save(); beep(); }
  if (!up && T.fin) { T.fin = false; save(); }
  var q = function (s, f) { document.querySelectorAll('[data-tm="' + s + '"]').forEach(f); };
  q("time", function (n) { n.textContent = clock(r); });
  q("status", function (n) { n.textContent = up ? "Time is up. Add more time or finish." : "Keep going"; });
  q("earlylabel", function (n) { n.textContent = up ? "I am done" : "Finished early"; });
  q("fill", function (n) { n.style.width = Math.max(0, Math.min(100, r / ((T.end - T.at) / 1000) * 100)) + "%"; });
  [bar, sv].forEach(function (n) { if (n) n.classList.toggle("up", up); });
  document.title = (up ? "Time is up - " : clock(r) + " - ") + "Academic Tracker";
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
function finish() {
  var t = T, mins = Math.max(1, Math.round((Date.now() - t.at) / 60000));
  clear();
  try { if (typeof setSt === "function") setSt(t.s, t.c, t.k, true); } catch (e) {}
  toast(t.c + " done. Studied for " + mins + " min.");
  if (typeof route === "function") route();
}
function act(a) {
  if (!T) return;
  if (a === "add5" || a === "add10") {
    var m = a === "add5" ? 5 : 10;
    T.end = Math.max(T.end, Date.now()) + m * 60000; T.fin = false; save(); update(); toast(m + " more minutes added");
  } else if (a === "early") finish();
  else if (a === "cancel") { if (confirm("Cancel this timer without marking the chapter?")) clear(); }
  else if (a === "saver") openSaver();
  else if (a === "exit") { closeSaver(); goHome(); }
}

function begin(s, c, k, ex, mins, saver) {
  try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
  T = { s: s, c: c, k: k, ex: ex, at: Date.now(), end: Date.now() + mins * 60000, fin: false };
  save(); buildBar(); startLoop(); if (saver) openSaver();
}
function ask(s, c, k) {
  if (T) { toast("A timer is already running."); return; }
  var ex = ""; try { ex = (upcoming()[0] || {}).name || ""; } catch (e) {}
  var sel = 30, m = el("div", "tmodal",
    '<div class="tcard" role="dialog" aria-modal="true" aria-label="Study timer"><h2>How much time do you need?</h2>' +
    '<p class="tsub"><b>' + c + "</b><br>" + s + (ex ? ", " + ex : "") + "</p>" +
    '<div class="topts">' + [15, 30, 45, 60, 90].map(function (n) { return '<button class="topt' + (n === 30 ? " on" : "") + '" data-min="' + n + '">' + n + " min</button>"; }).join("") + "</div>" +
    '<label class="tcustom">Or type minutes <input type="number" min="1" max="600" inputmode="numeric" id="tmin" placeholder="e.g. 40"></label>' +
    '<div class="tbtns"><button class="go2" data-tgo="0">Start timer</button><button class="ghost" data-tgo="1">Start in screen saver mode</button><button class="linkbtn" data-tcancel>Cancel</button></div></div>');
  document.body.appendChild(m);
  var inp = m.querySelector("#tmin");
  inp.addEventListener("input", function () { m.querySelectorAll(".topt").forEach(function (x) { x.classList.remove("on"); }); });
  m.addEventListener("click", function (e) {
    var o = e.target.closest(".topt");
    if (o) { sel = +o.dataset.min; inp.value = ""; m.querySelectorAll(".topt").forEach(function (x) { x.classList.toggle("on", x === o); }); return; }
    if (e.target === m || e.target.closest("[data-tcancel]")) { m.remove(); return; }
    var g = e.target.closest("[data-tgo]");
    if (g) { var v = parseInt(inp.value, 10), mins = v > 0 ? Math.min(v, 600) : sel; m.remove(); begin(s, c, k, ex, mins, g.dataset.tgo === "1"); }
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

/* add a timer button to every row of today's plan */
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
if (T && T.end) { buildBar(); startLoop(); } else T = null;
})();
