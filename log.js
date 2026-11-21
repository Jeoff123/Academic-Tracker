/* Study log: minutes per subject, last 7 days chart, day streak. */
(function () {
"use strict";
var PAL = ["#0b8a86", "#5b4de0", "#c9740a", "#d1477a", "#3a86d9", "#7a8a1f"];
var BARS = '<svg viewBox="0 0 20 20" width="22" height="22" aria-hidden="true"><path d="M4 16V9M10 16V4M16 16v-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
var GO = '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M7.5 4.5L13 10l-5.5 5.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function pid() { try { return ID(); } catch (e) { return "x"; } }
function ld(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
function sv(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
function pad(n) { return (n < 10 ? "0" : "") + n; }
function key(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
function LK() { return "log:" + pid(); }
function tot(o) { var t = 0; for (var k in o) t += o[k]; return t; }
function mm(secs) { var m = Math.round(secs / 60), h = Math.floor(m / 60); return h ? h + "h" + (m % 60 ? " " + m % 60 + "m" : "") : m + "m"; }

window.StudyLog = { add: function (s, secs) {
  var m = ld(LK(), {}), d = key(new Date()); m[d] = m[d] || {}; m[d][s] = (m[d][s] || 0) + Math.round(secs); sv(LK(), m);
} };

window.StudyLog.streak = function () { return streak(ld(LK(), {})); };
function streak(m) {
  var cur = 0, d = new Date(); if (!m[key(d)]) d.setDate(d.getDate() - 1);
  while (m[key(d)] && tot(m[key(d)]) > 0) { cur++; d.setDate(d.getDate() - 1); }
  var best = 0, run = 0, prev = null;
  Object.keys(m).filter(function (k) { return tot(m[k]) > 0; }).sort().forEach(function (k) {
    var p = k.split("-"), dt = new Date(+p[0], +p[1] - 1, +p[2]);
    run = prev && Math.round((dt - prev) / 864e5) === 1 ? run + 1 : 1; best = Math.max(best, run); prev = dt;
  });
  return { cur: cur, best: Math.max(best, cur) };
}
function week(m) {
  var out = [];
  for (var i = 6; i >= 0; i--) {
    var d = new Date(); d.setDate(d.getDate() - i);
    var o = m[key(d)] || {}; out.push({ o: o, t: tot(o), l: d.toLocaleDateString(undefined, { weekday: "short" }) });
  }
  return out;
}

var css = `
.logbtn{display:flex;align-items:center;gap:14px;width:100%;text-align:left;background:var(--surface);color:var(--ink);border:1px solid var(--line);border-radius:20px;padding:14px 16px;margin:10px 0 14px;cursor:pointer;font:inherit;transition:border-color .15s}
.logbtn:hover{border-color:var(--revised)}
.logbtn .li{flex:none;display:grid;place-items:center;width:44px;height:44px;border-radius:14px;background:rgba(201,116,10,.14);color:var(--pyq)}
.logbtn .lt{flex:1;min-width:0}
.logbtn b{display:block;font:600 17px/1.25 var(--font-d)}
.logbtn small{color:var(--muted);font-size:13px}
.logbtn .lg{color:var(--muted);display:grid}
.streak{display:flex;align-items:center;gap:16px;background:var(--surface);border:1px solid var(--line);border-radius:24px;padding:18px 20px;margin-bottom:6px}
.snum{font:700 54px/1 var(--font-d);color:var(--pyq);min-width:56px;text-align:center}
.streak b{display:block;font:600 20px var(--font-d)}
.streak small{color:var(--muted)}
.lchart{display:grid;grid-template-columns:repeat(7,1fr);gap:8px;background:var(--surface);border:1px solid var(--line);border-radius:22px;padding:16px 12px}
.lcol{display:flex;flex-direction:column;align-items:center;gap:6px;min-width:0}
.lcol small{height:16px;color:var(--muted);font-size:11px;white-space:nowrap}
.lbar{width:100%;max-width:34px;height:150px;display:flex;flex-direction:column-reverse;background:var(--track);border-radius:10px;overflow:hidden}
.lbar i{display:block;width:100%}
.lcol b{font-size:12.5px;font-weight:600;color:var(--muted)}
.lrow{display:grid;grid-template-columns:1fr auto;gap:4px 12px;padding:10px 0;border-top:1px solid var(--line)}
.lrow:first-child{border-top:0}
.lrow u{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:8px}
.ltr{grid-column:1/-1;height:8px;border-radius:8px;background:var(--track);overflow:hidden}
.ltr i{display:block;height:100%}
`;
var stl = document.createElement("style"); stl.textContent = css; document.head.appendChild(stl);

function stats() {
  try { cur = null; view = null; } catch (e) {}
  var m = ld(LK(), {}), days = week(m), sr = streak(m), subs = {}, max = 1800, wt = 0;
  days.forEach(function (d) { wt += d.t; max = Math.max(max, d.t); for (var s in d.o) subs[s] = (subs[s] || 0) + d.o[s]; });
  var names = Object.keys(subs).sort(function (a, b) { return subs[b] - subs[a]; }), col = {};
  names.forEach(function (s, i) { col[s] = PAL[i % PAL.length]; });
  var bars = days.map(function (d) {
    var segs = names.filter(function (s) { return d.o[s]; }).map(function (s) {
      return '<i style="height:' + (d.o[s] / max * 150) + 'px;background:' + col[s] + '" title="' + s + ': ' + mm(d.o[s]) + '"></i>';
    }).join("");
    return '<div class="lcol"><small>' + (d.t ? mm(d.t) : "") + '</small><div class="lbar">' + segs + '</div><b>' + d.l + "</b></div>";
  }).join("");
  var rows = names.map(function (s) {
    return '<div class="lrow"><span><u style="background:' + col[s] + '"></u>' + s + "</span><b>" + mm(subs[s]) + '</b><div class="ltr"><i style="width:' + (subs[s] / subs[names[0]] * 100) + "%;background:" + col[s] + '"></i></div></div>';
  }).join("");
  var empty = !wt && !sr.cur;
  app.innerHTML = '<div class="subtop"><button class="back" data-backto="">' + CHEV + "Back</button>" + reloadBtn + '</div><h1 tabindex="-1">Study log</h1><p class="lede">' + label() + "</p>" +
    '<section class="streak"><div class="snum">' + sr.cur + "</div><div><b>day streak</b><small>Best: " + sr.best + " day" + (sr.best === 1 ? "" : "s") + ". Today: " + mm(tot(m[key(new Date())] || {})) + "</small></div></section>" +
    (empty ? '<div class="empty" style="margin-top:14px"><b>Nothing logged yet</b>Start a timer from today\'s plan and your study time will show up here.</div>' :
    '<h2 class="sec">Last 7 days<span class="more">' + mm(wt) + ' total</span></h2><div class="lchart">' + bars + '</div><h2 class="sec">By subject</h2><div class="table" style="padding:6px 16px">' + (rows || '<p class="hint" style="padding:10px 0">No study time in the last 7 days.</p>') + "</div>") +
    '<p class="note">Time is saved from the study timer on this device.</p>';
}

if (typeof route === "function") {
  var _r = route;
  route = function () {
    if (typeof profile !== "undefined" && profile && location.hash === "#stats") { stats(); window.scrollTo(0, 0); return; }
    return _r.apply(this, arguments);
  };
  if (location.hash === "#stats") route();
}

function enhance() {
  var a = document.getElementById("app"), top = a && a.querySelector(".top");
  if (!top || a.querySelector(".logbtn")) return;
  var m = ld(LK(), {}), w = 0; week(m).forEach(function (d) { w += d.t; });
  var b = document.createElement("button"); b.type = "button"; b.className = "logbtn"; b.setAttribute("data-stats", "");
  b.innerHTML = '<span class="li">' + BARS + '</span><span class="lt"><b>Study log</b><small>' + streak(m).cur + " day streak, " + mm(w) + ' this week</small></span><span class="lg">' + GO + "</span>";
  var tt = a.querySelector(".ttlink"); (tt || top).insertAdjacentElement("afterend", b);
}
document.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("[data-stats]")) location.hash = "stats"; });
var appEl = document.getElementById("app");
if (appEl) new MutationObserver(enhance).observe(appEl, { childList: true, subtree: true });
enhance();
})();