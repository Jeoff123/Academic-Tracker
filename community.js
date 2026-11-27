/* Community: the hub page, plus the study leaderboard. Shared doubts (qa.js) and chat (chat.js) plug into it. */
(function () {
"use strict";
function ld(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
function sb() { return window.SB; }
function me() { var s = sb() && sb().session(); return s ? s.user : null; }
function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function ago(iso) { var m = Math.round((Date.now() - Date.parse(iso)) / 60000); return m < 1 ? "just now" : m < 60 ? m + " min ago" : m < 1440 ? Math.round(m / 60) + " h ago" : Math.round(m / 1440) + " d ago"; }
function mm(secs) { var m = Math.round(secs / 60), h = Math.floor(m / 60); return h ? h + "h" + (m % 60 ? " " + m % 60 + "m" : "") : m + "m"; }
var mods = {}, timers = [], LB = { period: "week", mine: false }, lastPush = 0, wasIn = !!me();
var C = window.Comm = {
  esc: esc, ago: ago, mm: mm, me: me, unreadN: 0,
  rest: function (p, m, b) { return sb().call(p, m, b); },
  reg: function (n, f) { mods[n] = f; },
  every: function (fn, ms) { timers.push(setInterval(fn, ms)); },
  clear: function () { timers.forEach(clearInterval); timers = []; },
  toast: function (t) { sb().toast(t); },
  nice: function (e) { return sb().nice(e); },
  isAdmin: function () { var s = sb() && sb().session(); return !!(s && s.admin); },
  unread: function () { return C.unreadN; },
  setUnread: function (n) { if (n !== C.unreadN) { C.unreadN = n; document.dispatchEvent(new Event("commchange")); } }
};

var TABS = [["board", "Ranking", "community"], ["doubts", "Doubts", "community-doubts"]];
var ICO = '<svg viewBox="0 0 20 20" width="19" height="19" aria-hidden="true"><path d="M4.5 5.5h11a1.5 1.5 0 0 1 1.5 1.5v5a1.5 1.5 0 0 1-1.5 1.5H10l-3.5 3v-3h-2A1.5 1.5 0 0 1 3 12V7a1.5 1.5 0 0 1 1.5-1.5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';
function hub(tab, arg) {
  try { cur = null; view = null; } catch (e) {}
  app.innerHTML = '<div class="subtop"><h1 tabindex="-1">Community</h1><span class="subr"><button type="button" class="chico" data-cgo="community-chat" aria-label="Messages">' + ICO + (C.unreadN ? '<i class="cdot"></i>' : "") + "</button>" + reloadBtn + '</span></div><div class="cseg" role="tablist">' +
    TABS.map(function (t) { return '<button type="button" role="tab" class="cs' + (t[0] === tab ? " on" : "") + '" data-cgo="' + t[2] + '">' + t[1] + "" + "</button>"; }).join("") + '</div><div id="cbody"></div>';
  var body = document.getElementById("cbody");
  if (!me()) { body.innerHTML = '<div class="empty"><b>Sign in to join</b>The ranking, shared doubts and chat are for signed-in students.<div style="margin-top:12px"><button type="button" class="csign" data-acct>Sign in or create an account</button></div></div>'; return; }
  if (mods[tab]) mods[tab](body, arg);
}
var _r = route;
route = function () {
  C.clear();
  var m = /^#community(?:-(doubts|chat)(?:-(.+))?)?$/.exec(location.hash);
  if (m && typeof profile !== "undefined" && profile) { hub(m[1] || "board", m[2] || ""); window.scrollTo(0, 0); return; }
  return _r.apply(this, arguments);
};
document.addEventListener("commchange", function () { var b = document.querySelector(".chico"); if (!b) return; var d = b.querySelector(".cdot"); if (C.unreadN && !d) b.insertAdjacentHTML("beforeend", '<i class="cdot"></i>'); else if (!C.unreadN && d) d.remove(); });
document.addEventListener("sbchange", function () { var now = !!me(); if (now !== wasIn) { wasIn = now; if (/^#community/.test(location.hash)) route(); } });
document.addEventListener("click", function (e) {
  var b = e.target.closest ? e.target.closest("[data-cgo]") : null; if (b) location.hash = b.dataset.cgo;
});

/* ---------- study time for the leaderboard ---------- */
function dayTotals() {
  var o = {}, cut = Date.now() - 8 * 864e5;
  for (var i = 0; i < localStorage.length; i++) {
    var k = localStorage.key(i); if (k.indexOf("log:") !== 0) continue;
    try { var m = JSON.parse(localStorage.getItem(k)) || {}; Object.keys(m).forEach(function (d) {
      var p = d.split("-"); if (new Date(+p[0], +p[1] - 1, +p[2]).getTime() < cut) return;
      var t = 0; for (var s in m[d]) t += m[d][s] || 0; o[d] = (o[d] || 0) + t;
    }); } catch (e) {}
  }
  return Object.keys(o).map(function (d) { return { day: d, seconds: Math.min(Math.round(o[d]), 50400) }; });
}
function pushStudy(force) {
  var u = me(); if (!u) return Promise.resolve();
  if (!force && Date.now() - lastPush < 30000) return Promise.resolve();
  lastPush = Date.now();
  var pr = ld("profile", null), calls = [], days = dayTotals();
  if (pr && pr.board) calls.push(C.rest("/rest/v1/profiles?user_id=eq." + u.id, "PATCH", { board: pr.board, stream: pr.stream }));
  if (days.length) calls.push(C.rest("/rest/v1/rpc/report_study", "POST", { p_days: days }));
  return Promise.all(calls).catch(function () {});
}
if (window.StudyLog) { var _add = window.StudyLog.add; window.StudyLog.add = function () { _add.apply(this, arguments); setTimeout(function () { pushStudy(false); }, 1500); }; }
document.addEventListener("sbchange", function () { if (me()) pushStudy(false); });

/* ---------- leaderboard ---------- */
C.reg("board", function (body) {
  var pr = ld("profile", null), tag = pr ? (pr.board === "CBSE" ? "CBSE" : "State board") + " " + pr.stream : "my batch";
  body.innerHTML = '<div class="cchips"><button type="button" class="cchip' + (LB.period === "week" ? " on" : "") + '" data-lbp="week">This week</button><button type="button" class="cchip' + (LB.period === "all" ? " on" : "") + '" data-lbp="all">All time</button></div>' +
    '<label class="cswitch"><input type="checkbox" id="lbmine"' + (LB.mine ? " checked" : "") + "><span>Only " + esc(tag) + " students</span></label>" +
    '<div id="lbl" class="lbl"><p class="lsep">Loading...</p></div>' +
    '<label class="cswitch sub"><input type="checkbox" id="lbshow" checked><span>Show me on the leaderboard</span></label><p class="note">Study time comes from the study timer. Weeks start on Monday.</p>';
  pushStudy(true).then(loadBoard);
  C.rest("/rest/v1/profiles?select=show_on_board&user_id=eq." + me().id, "GET").then(function (r) { var c = document.getElementById("lbshow"); if (c && r && r[0]) c.checked = r[0].show_on_board !== false; }).catch(function () {});
});
function loadBoard() {
  var el = document.getElementById("lbl"); if (!el) return;
  var pr = ld("profile", null);
  C.rest("/rest/v1/rpc/leaderboard", "POST", { p_period: LB.period, p_board: LB.mine && pr ? pr.board : null, p_stream: LB.mine && pr ? pr.stream : null })
    .then(function (rows) { drawBoard(el, rows || []); })
    .catch(function (e) { el.innerHTML = '<p class="lsep">' + esc(C.nice(e)) + "</p>"; });
}
function drawBoard(el, rows) {
  if (!rows.length) { el.innerHTML = '<p class="lsep">No study time yet' + (LB.period === "week" ? " this week" : "") + ". Start a timer from today's plan and be the first.</p>"; return; }
  var top = rows[0].seconds || 1;
  el.innerHTML = rows.map(function (r) {
    var tg = r.board ? (r.board === "CBSE" ? "CBSE" : "State") + " " + (r.stream || "") : "";
    return (r.is_me && r.rank > 50 ? '<p class="lsep">...</p>' : "") + '<div class="lr' + (r.is_me ? " me" : "") + '"><span class="lk' + (r.rank <= 3 ? " rk" + r.rank : "") + '">' + r.rank + '</span><span class="ln"><b>' + esc(r.name) + (r.is_me ? " <em>you</em>" : "") + "</b><small>" + esc(tg) + '</small></span><span class="lt">' + mm(r.seconds) + '</span><div class="lb"><i style="width:' + Math.max(3, Math.round(r.seconds / top * 100)) + '%"></i></div></div>';
  }).join("");
}
document.addEventListener("click", function (e) {
  var b = e.target.closest ? e.target.closest("[data-lbp]") : null;
  if (b) { LB.period = b.dataset.lbp; document.querySelectorAll("[data-lbp]").forEach(function (x) { x.classList.toggle("on", x === b); }); var el = document.getElementById("lbl"); if (el) el.innerHTML = '<p class="lsep">Loading...</p>'; loadBoard(); }
});
document.addEventListener("change", function (e) {
  if (e.target.id === "lbmine") { LB.mine = e.target.checked; loadBoard(); }
  if (e.target.id === "lbshow" && me()) C.rest("/rest/v1/profiles?user_id=eq." + me().id, "PATCH", { show_on_board: e.target.checked }).then(function () { C.toast(e.target.checked ? "You are on the leaderboard" : "You are hidden from the leaderboard"); loadBoard(); }).catch(function (er) { C.toast(C.nice(er)); });
});
window.__comm = 1;
})();
