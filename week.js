/* Week view: planned chapters for the next 7 days, with editing for future days. */
(function () {
"use strict";
function pid() { try { return ID(); } catch (e) { return "x"; } }
function ld(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
function sv(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
function pad(n) { return (n < 10 ? "0" : "") + n; }
function key(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
function WK() { return "weekplan:" + pid(); }
function dayAt(i) { var d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i); return d; }
function wd(d, o) { return d.toLocaleDateString(undefined, o); }
var TICK = '<svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><path d="M4.5 10.5l3.7 3.7L15.5 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

var css = `
.wstrip{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin:4px 0 18px}
.wday{display:flex;flex-direction:column;align-items:center;gap:2px;padding:10px 0 8px;border-radius:16px;border:1px solid var(--line);background:var(--surface);color:var(--ink);cursor:pointer;min-width:0;font-family:var(--font-b)}
.wday small{color:var(--muted);font-size:11.5px;font-weight:600}
.wday b{font:700 18px var(--font-d)}
.wday em{font-style:normal;font-size:12px;font-weight:700;color:var(--muted);min-height:16px}
.wday .ed{width:6px;height:6px;border-radius:50%;background:var(--pyq);min-height:6px}
.wday.td b{color:var(--revised)}
.wday.on{border-color:var(--revised);background:rgba(91,77,224,.12);background:color-mix(in srgb,var(--revised) 12%,var(--surface))}
.wday.on small,.wday.on em{color:var(--revised)}
.whead{display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin:6px 0 10px}
.whead h2{margin:0;font-size:22px}
.whead small{color:var(--muted)}
.wtag{display:inline-block;font-size:12.5px;font-weight:600;padding:3px 10px;border-radius:999px;background:var(--track);color:var(--muted)}
.wtable{background:var(--surface);border:1px solid var(--line);border-radius:22px;overflow:hidden}
.wrow{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;border-top:1px solid var(--line);font-weight:500}
.wrow:first-child{border-top:0}
.wrow small{display:block;color:var(--muted);font-weight:400;font-size:13px}
.wrow .wok{color:var(--learnt);display:grid}
.wempty{padding:16px;color:var(--muted)}
.oth{background:var(--surface);border:1px solid var(--line);border-radius:20px;margin:10px 0;overflow:hidden}
.oth summary{list-style:none;display:flex;justify-content:space-between;align-items:center;gap:10px;padding:14px 16px;font:600 17px var(--font-d);cursor:pointer}
.oth summary::-webkit-details-marker{display:none}
.oth summary small{margin-left:auto;color:var(--muted);font:400 13px var(--font-b)}
.oth summary::after{content:"";flex:none;width:9px;height:9px;border:solid var(--muted);border-width:0 2px 2px 0;transform:rotate(45deg);margin:-3px 2px 0 6px;transition:transform .15s}
.oth[open] summary::after{transform:rotate(-135deg);margin-top:3px}
.oth>div{border-top:1px solid var(--line)}
.oth .wtable{border-radius:0;border-width:1px 0 0}
.wbtns{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px;align-items:center}
.wbtn{border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:999px;padding:9px 18px;font-weight:600;cursor:pointer}
.wbtn:hover{border-color:var(--revised)}
.wlink{background:none;border:0;color:var(--revised);font-weight:600;cursor:pointer;text-decoration:underline;padding:6px}
.wpick{display:flex;align-items:center;gap:14px;width:100%;text-align:left;background:none;border:0;border-top:1px solid var(--line);padding:12px 16px;color:inherit;cursor:pointer;font:500 16px var(--font-b)}
.wpick:first-child{border-top:0}
.wpick .wbox{flex:none;width:26px;height:26px;border-radius:8px;border:2px solid var(--line);display:grid;place-items:center;color:var(--on)}
.wpick .wbox svg{opacity:0}
.wpick.on .wbox{background:var(--revised);border-color:var(--revised)}
.wpick.on .wbox svg{opacity:1}
.wpick.on{background:rgba(91,77,224,.07);background:color-mix(in srgb,var(--revised) 7%,transparent)}
`;
var stl = document.createElement("style"); stl.textContent = css; document.head.appendChild(stl);

/* today's plan: a plan you edited in the Week view is used when that day arrives */
var _today = today;
today = function (e, p) {
  var c = ld(WK(), {})[key(new Date())], mine = ld("custom:" + pid(), {});
  if (c && c.keys && mine.date !== new Date().toDateString()) {
    var d = new Date().toDateString(), s = ld("today:" + pid(), {});
    if (s.wk === 1 && s.date === d) return s;
    var n = { v: 5, date: d, exam: e.name, sig: "wk", keys: c.keys, note: "", wk: 1 };
    sv("today:" + pid(), n); return n;
  }
  return _today.apply(this, arguments);
};

function build() {
  var exs = upcoming(); if (!exs.length) return null;
  var papers = [], seen = {}, done = {}, rv = {}, custom = ld(WK(), {}), days = [];
  exs.forEach(function (e) { e.papers.forEach(function (p) { papers.push({ s: p.s, d: p.d, ch: p.chapters }); }); });
  papers.sort(function (a, b) { return a.d - b.d; });
  papers.forEach(function (p) {
    var chs = S().subjects[p.s] || []; p.items = [];
    p.ch.forEach(function (n) { var c = chs[n - 1]; if (c && !seen[p.s + "|" + c]) { seen[p.s + "|" + c] = 1; p.items.push(c); } });
  });
  /* the exam being studied on day D: the first exam that still has a paper on or after D */
  var focus = function (D) {
    var best = null;
    exs.forEach(function (e) { var ps = e.papers.filter(function (p) { return p.d >= D; }); if (ps.length && (!best || ps[0].d < best[0].d)) best = ps; });
    return best;
  };
  var mark = function (k) { (k[2] === "revised" ? rv : done)[k[0] + "|" + k[1]] = 1; };
  var t = today(exs[0], plan(exs[0], exs.slice(1))), mine = ld("custom:" + pid(), {});
  var k0 = t.keys.map(function (k) { return [k[0], k[1], k[2]]; }); k0.forEach(mark);
  days.push({ i: 0, date: dayAt(0), keys: k0, custom: mine.date === new Date().toDateString() });
  for (var i = 1; i <= 6; i++) {
    var D = dayAt(i), c = custom[key(D)], keys = [];
    if (c && c.keys) keys = c.keys.filter(function (k) { return (S().subjects[k[0]] || []).indexOf(k[1]) > -1; });
    else {
      (focus(D) || []).forEach(function (p) {
        var chs = S().subjects[p.s] || [], items = p.chapters.map(function (n) { return chs[n - 1]; }).filter(Boolean);
        var left = Math.round((p.d - D) / 864e5);
        var todo = items.filter(function (x) { return !st(p.s, x).learnt && !done[p.s + "|" + x]; });
        if (todo.length) {
          var rev = Math.min(3, Math.floor(left / 4)), dd = Math.max(1, left - rev), per = Math.ceil(todo.length / dd);
          todo.slice(0, per).forEach(function (x) { keys.push([p.s, x, "learnt"]); });
        } else {
          items.filter(function (x) { return !st(p.s, x).revised && !rv[p.s + "|" + x]; }).slice(0, 2).forEach(function (x) { keys.push([p.s, x, "revised"]); });
        }
      });
    }
    keys.forEach(mark);
    days.push({ i: i, date: D, keys: keys, custom: !!(c && c.keys) });
  }
  return { days: days, papers: papers, focus: focus };
}

function weekPage(sel) {
  try { cur = null; view = null; } catch (e) {}
  var b = build(), top = '<div class="subtop"><h1 tabindex="-1">Week plan</h1>' + reloadBtn + "</div>";
  if (!b) { app.innerHTML = top + '<div class="empty"><b>No upcoming exams</b>The week plan appears when an exam is scheduled. The syllabus and exams are fixed, so contact Jeoff for changes.</div>'; return; }
  var strip = b.days.map(function (d) {
    return '<button type="button" class="wday' + (d.i === sel ? " on" : "") + (d.i === 0 ? " td" : "") + '" data-wd="' + d.i + '" aria-label="' + wd(d.date, { weekday: "long", day: "numeric", month: "long" }) + ", " + d.keys.length + ' chapters"><small>' + wd(d.date, { weekday: "short" }) + "</small><b>" + d.date.getDate() + "</b>" + (d.custom ? '<span class="ed" title="Edited by you"></span>' : "<em>" + (d.keys.length || "-") + "</em>") + "</button>";
  }).join("");
  var day = b.days[sel] || b.days[0], i = day.i;
  var rows = day.keys.map(function (k) {
    var dn = i === 0 && st(k[0], k[1])[k[2]];
    return '<div class="wrow"><span>' + k[1] + "<small>" + k[0] + ", " + (k[2] === "revised" ? "revise" : "learn") + "</small></span>" + (dn ? '<span class="wok" title="Done">' + TICK + "</span>" : "") + "</div>";
  }).join("");
  var btns = i === 0 ? '<button type="button" class="wbtn" data-wkgo="plan">Edit today\'s plan</button>'
    : '<button type="button" class="wbtn" data-wkedit="' + i + '">Edit this day</button>' + (day.custom ? '<button type="button" class="wlink" data-wkreset="' + i + '">Reset to suggested</button>' : "");
  app.innerHTML = top + '<p class="lede">' + label() + ". Pick a day to see its plan.</p>" + '<div class="wstrip">' + strip + "</div>" +
    '<div class="whead"><h2>' + (i === 0 ? "Today" : i === 1 ? "Tomorrow" : wd(day.date, { weekday: "long" })) + "</h2><small>" + wd(day.date, { day: "numeric", month: "short" }) + "</small></div>" +
    (day.custom ? '<p style="margin:0 0 10px"><span class="wtag">' + (i === 0 ? "Your own plan" : "Edited by you") + "</span></p>" : "") +
    '<div class="wtable">' + (rows || '<div class="wempty">Nothing planned for this day.</div>') + "</div>" +
    '<div class="wbtns">' + btns + '</div><p class="note">Future days are a suggestion based on your exam dates and progress. Chapters in your edited days are counted as done when planning later days.</p>';
}

function editPage(i) {
  var b = build(); if (!b || i < 1 || i > 6) { location.hash = "week"; return; }
  var day = b.days[i], on = {}, by = {};
  try { cur = null; view = null; } catch (e) {}
  day.keys.forEach(function (k) { on[k[0] + "|" + k[1]] = 1; });
  (b.focus(day.date) || []).forEach(function (p) { var chs = S().subjects[p.s] || []; p.chapters.forEach(function (n) { var c = chs[n - 1]; if (c && (!st(p.s, c).learnt || on[p.s + "|" + c])) (by[p.s] = by[p.s] || {})[c] = n; }); });
  var groups = Object.keys(by).map(function (s) {
    return '<h2 class="sec">' + s + '</h2><div class="wtable">' + Object.keys(by[s]).sort(function (x, y) { return by[s][x] - by[s][y]; }).map(function (c) {
      var q = (s + "|" + c).replace(/"/g, "&quot;"), sel = !!on[s + "|" + c];
      return '<button type="button" class="wpick' + (sel ? " on" : "") + '" data-wkpick="' + q + '" aria-pressed="' + sel + '"><span class="wbox">' + TICK + "</span><span>" + by[s][c] + ". " + c + "</span></button>";
    }).join("") + "</div>";
  }).join("");
  var others = '<h2 class="sec">Other chapters and subjects</h2>' + Object.keys(S().subjects).sort(function (a, b) { return (by[a] ? 0 : 1) - (by[b] ? 0 : 1); }).map(function (s) {
    var rows = [], open = false;
    S().subjects[s].forEach(function (c, ix) {
      if (by[s] && by[s][c]) return;
      var sel = !!on[s + "|" + c]; if (sel) open = true;
      rows.push('<button type="button" class="wpick' + (sel ? " on" : "") + '" data-wkpick="' + (s + "|" + c).replace(/"/g, "&quot;") + '" aria-pressed="' + sel + '"><span class="wbox">' + TICK + "</span><span>" + (ix + 1) + ". " + c + "</span></button>");
    });
    return rows.length ? '<details class="oth"' + (open ? " open" : "") + "><summary><span>" + s + "</span><small>" + (by[s] ? "other chapters, " : "") + rows.length + ' chapters</small></summary><div class="wtable">' + rows.join("") + "</div></details>" : "";
  }).join("");
  app.innerHTML = '<div class="subtop"><button class="back" data-backto="week-' + i + '">' + CHEV + "Back</button>" + reloadBtn + '</div><h1 tabindex="-1">Edit ' + wd(day.date, { weekday: "long" }) + '</h1><p class="lede">' + wd(day.date, { day: "numeric", month: "long" }) + ". Tap the chapters you want on this day. Your choice is saved as you tap.</p>" +
    '<div class="wbtns" style="margin:0 0 6px"><button type="button" class="wlink" data-wkreset="' + i + '">Reset to suggested</button></div>' + (groups || '<div class="empty"><b>No exam chapters left</b>Every exam chapter is already learnt.</div>') + others;
}

if (typeof route === "function") {
  var _r = route;
  route = function () {
    var h = location.hash, on = typeof profile !== "undefined" && profile;
    if (on && /^#week(-\d)?$/.test(h)) { weekPage(+(h.split("-")[1] || 0)); window.scrollTo(0, 0); return; }
    if (on && /^#weekedit-\d$/.test(h)) { editPage(+h.split("-")[1]); window.scrollTo(0, 0); return; }
    return _r.apply(this, arguments);
  };
}
document.addEventListener("click", function (e) {
  var t = e.target.closest ? e.target : null; if (!t) return;
  var a = t.closest("[data-wd]"); if (a) { var n = +a.dataset.wd; location.hash = n ? "week-" + n : "week"; return; }
  if (t.closest("[data-wkgo]")) { location.hash = "plan"; return; }
  a = t.closest("[data-wkedit]"); if (a) { location.hash = "weekedit-" + a.dataset.wkedit; return; }
  a = t.closest("[data-wkreset]");
  if (a) { var m = ld(WK(), {}); delete m[key(dayAt(+a.dataset.wkreset))]; sv(WK(), m); route(); return; }
  a = t.closest("[data-wkpick]");
  if (a) {
    var i = +location.hash.split("-")[1], b = build(); if (!b || !b.days[i]) return;
    var p = a.dataset.wkpick.split("|"), s = p[0], c = p.slice(1).join("|"), m2 = ld(WK(), {}), dk = key(dayAt(i));
    var keys = (m2[dk] && m2[dk].keys) ? m2[dk].keys : b.days[i].keys.map(function (k) { return [k[0], k[1], k[2]]; });
    var at = -1; keys.forEach(function (k, x) { if (k[0] === s && k[1] === c) at = x; });
    if (at > -1) keys.splice(at, 1); else keys.push([s, c, st(s, c).learnt ? "revised" : "learnt"]);
    m2[dk] = { keys: keys }; sv(WK(), m2);
    var on = at === -1; a.classList.toggle("on", on); a.setAttribute("aria-pressed", on);
  }
});
})();