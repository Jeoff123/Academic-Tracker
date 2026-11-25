/* Chat: one general room and 1-to-1 messages. New messages are checked every few seconds. */
(function () {
"use strict";
var C = window.Comm, esc = C.esc, last = 0, partner = null;
function readMap() { try { return JSON.parse(localStorage.getItem("chatread")) || {}; } catch (e) { return {}; } }
function setRead(p, id) { var m = readMap(); if ((m[p] || 0) < id) { m[p] = id; try { localStorage.setItem("chatread", JSON.stringify(m)); } catch (e) {} } }
function nm(r) { return r.profiles && r.profiles.name ? r.profiles.name : "Student"; }
var SEL = "id,user_id,to_user,body,created_at,profiles!messages_user_fk(name)";

C.reg("chat", function (body, arg) {
  var dm = arg && arg !== "dm" ? arg : null;
  if (dm) return thread(body, dm);
  var inbox = arg === "dm";
  body.innerHTML = '<div class="csub"><button type="button" class="' + (inbox ? "" : "on") + '" data-cgo="community-chat">General</button><button type="button" class="' + (inbox ? "on" : "") + '" data-cgo="community-chat-dm">Messages' + (C.unread() ? " (" + C.unread() + ")" : "") + "</button></div><div id=\"cc\"></div>";
  var el = document.getElementById("cc");
  if (inbox) inboxView(el); else room(el, null, "Message everyone");
});

/* a room: general chat (to = null) or a 1-to-1 thread */
function filter(to) { var me = C.me().id; return to ? "&or=(and(user_id.eq." + me + ",to_user.eq." + to + "),and(user_id.eq." + to + ",to_user.eq." + me + "))" : "&to_user=is.null"; }
function room(el, to, hint) {
  partner = to; last = 0;
  el.innerHTML = '<div id="cmsgs" class="cmsgs"><p class="lsep">Loading...</p></div><div class="ccomp"><input id="cin" maxlength="500" placeholder="' + esc(hint) + '" autocomplete="off"><button type="button" data-csend>Send</button></div>';
  C.rest("/rest/v1/messages?select=" + SEL + filter(to) + "&order=id.desc&limit=60", "GET").then(function (rows) {
    var box = document.getElementById("cmsgs"); if (!box) return;
    rows = (rows || []).reverse(); box.innerHTML = rows.length ? "" : '<p class="lsep">No messages yet. Say hello.</p>';
    add(rows, true); if (to && last) { setRead(to, last); badge(); }
  }).catch(function (e) { var b = document.getElementById("cmsgs"); if (b) b.innerHTML = '<p class="lsep">' + esc(C.nice(e)) + "</p>"; });
  C.every(poll, 4000);
}
function poll() {
  if (!document.getElementById("cmsgs")) return;
  C.rest("/rest/v1/messages?select=" + SEL + filter(partner) + "&id=gt." + last + "&order=id.asc", "GET").then(function (rows) {
    if (rows && rows.length) { var near = window.innerHeight + window.scrollY > document.body.scrollHeight - 160; add(rows, near); if (partner) { setRead(partner, last); badge(); } }
  }).catch(function () {});
}
function add(rows, scroll) {
  var box = document.getElementById("cmsgs"), my = C.me().id, adm = C.isAdmin(); if (!box || !rows.length) return;
  if (box.querySelector(".lsep")) box.innerHTML = "";
  rows.forEach(function (r) {
    if (r.id <= last && last) { if (box.querySelector('[data-mid="' + r.id + '"]')) return; }
    last = Math.max(last, r.id);
    var d = document.createElement("div"); d.className = "cm" + (r.user_id === my ? " me" : ""); d.setAttribute("data-mid", r.id);
    d.innerHTML = "<small>" + (r.user_id === my ? "You" : esc(nm(r))) + ", " + C.ago(r.created_at) + (r.user_id === my || (adm && !r.to_user) ? '<button type="button" data-cdel="' + r.id + '">delete</button>' : "") + "</small><p>" + esc(r.body) + "</p>";
    box.appendChild(d);
  });
  if (scroll) window.scrollTo(0, document.body.scrollHeight);
}
function send() {
  var inp = document.getElementById("cin"), v = inp ? inp.value.trim() : ""; if (!v) return;
  inp.value = ""; inp.focus();
  C.rest("/rest/v1/messages", "POST", { user_id: C.me().id, to_user: partner, body: v }).then(poll).catch(function (e) { inp.value = v; C.toast(C.nice(e)); });
}

/* 1-to-1 */
function thread(body, to) {
  body.innerHTML = '<button type="button" class="back" data-backto="community-chat-dm">' + CHEV + 'Messages</button><h2 id="cwho" style="margin:0 0 10px">Chat</h2><div id="cc"></div>';
  C.rest("/rest/v1/profiles?select=name&user_id=eq." + encodeURIComponent(to), "GET").then(function (r) { var h = document.getElementById("cwho"); if (h && r && r[0]) h.textContent = r[0].name; }).catch(function () {});
  room(document.getElementById("cc"), to, "Write a message");
}
function inboxView(el) {
  el.innerHTML = '<label class="cf">Find a student<input id="cfind" class="cin" placeholder="Type a name" autocomplete="off"></label><div id="cres"></div><div id="cthr"><p class="lsep">Loading...</p></div>';
  loadThreads();
}
function loadThreads() {
  C.rest("/rest/v1/rpc/dm_threads", "POST", {}).then(function (rows) {
    rows = (rows || []).sort(function (a, b) { return b.last_id - a.last_id; });
    var rd = readMap(), n = 0, el = document.getElementById("cthr");
    rows.forEach(function (r) { if (!r.last_from_me && r.last_id > (rd[r.partner_id] || 0)) n++; });
    C.setUnread(n); if (!el) return;
    el.innerHTML = rows.map(function (r) {
      var un = !r.last_from_me && r.last_id > (rd[r.partner_id] || 0);
      return '<button type="button" class="cth" data-cdm="' + esc(r.partner_id) + '"><span class="cav">' + esc((r.partner_name || "?").charAt(0).toUpperCase()) + '</span><span><b>' + esc(r.partner_name) + "</b><small>" + (r.last_from_me ? "You: " : "") + esc(r.last_body) + "</small></span>" + (un ? '<i class="cu"></i>' : "") + "</button>";
    }).join("") || '<p class="lsep">No conversations yet. Find a student above to start one.</p>';
  }).catch(function (e) { var el = document.getElementById("cthr"); if (el) el.innerHTML = '<p class="lsep">' + esc(C.nice(e)) + "</p>"; });
}
var ft = null;
function find(q) {
  clearTimeout(ft);
  ft = setTimeout(function () {
    var el = document.getElementById("cres"); if (!el) return;
    if (q.trim().length < 2) { el.innerHTML = ""; return; }
    C.rest("/rest/v1/profiles?select=user_id,name&name=ilike.*" + encodeURIComponent(q.trim().replace(/[*,()]/g, "")) + "*&user_id=neq." + C.me().id + "&limit=10", "GET").then(function (rows) {
      el.innerHTML = (rows || []).map(function (r) { return '<button type="button" class="cth" data-cdm="' + esc(r.user_id) + '"><span class="cav">' + esc((r.name || "?").charAt(0).toUpperCase()) + "</span><b>" + esc(r.name) + "</b></button>"; }).join("") || '<p class="lsep">No student found.</p>';
    }).catch(function () {});
  }, 300);
}

/* unread dot on the Community tab */
function badge() { if (C.me()) loadCount(); }
function loadCount() {
  C.rest("/rest/v1/rpc/dm_threads", "POST", {}).then(function (rows) {
    var rd = readMap(), n = 0; (rows || []).forEach(function (r) { if (!r.last_from_me && r.last_id > (rd[r.partner_id] || 0)) n++; });
    C.setUnread(n);
  }).catch(function () {});
}
setInterval(function () { if (C.me() && document.visibilityState === "visible") loadCount(); }, 45000);
document.addEventListener("sbchange", function () { if (C.me() && !C.unreadN) setTimeout(loadCount, 500); });
if (C.me()) setTimeout(loadCount, 1500);

document.addEventListener("click", function (e) {
  var t = e.target.closest ? e.target : null; if (!t) return;
  var b;
  if (t.closest("[data-csend]")) { send(); return; }
  if ((b = t.closest("[data-cdm]"))) { location.hash = "community-chat-" + b.dataset.cdm; return; }
  if ((b = t.closest("[data-cdel]"))) { C.rest("/rest/v1/messages?id=eq." + b.dataset.cdel, "DELETE").then(function () { var d = b.closest(".cm"); if (d) d.remove(); }).catch(function (er) { C.toast(C.nice(er)); }); }
});
document.addEventListener("keydown", function (e) { if (e.key === "Enter" && e.target && e.target.id === "cin") { e.preventDefault(); send(); } });
document.addEventListener("input", function (e) { if (e.target && e.target.id === "cfind") find(e.target.value); });
window.__chat = 1;
})();
      
