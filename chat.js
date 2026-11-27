/* Chat: a general room and 1-to-1 messages, with replies, online status and delete. Messages vanish after 10 hours. */
(function () {
"use strict";
var C = window.Comm, esc = C.esc, last = 0, partner = null, reply = null, ONLINE = 150000;
var SEL = "id,user_id,to_user,body,created_at,reply_to,reply_name,reply_snip,profiles!messages_user_fk(name)";
function readMap() { try { return JSON.parse(localStorage.getItem("chatread")) || {}; } catch (e) { return {}; } }
function setRead(p, id) { var m = readMap(); if ((m[p] || 0) < id) { m[p] = id; try { localStorage.setItem("chatread", JSON.stringify(m)); } catch (e) {} } }
function nm(r) { return r.profiles && r.profiles.name ? r.profiles.name : "Student"; }
function isOn(ts) { return !!ts && Date.now() - Date.parse(ts) < ONLINE; }
function seen(ts) { return !ts ? "" : isOn(ts) ? "Online" : "Last seen " + C.ago(ts); }
function dot(ts) { return isOn(ts) ? '<i class="con"></i>' : ""; }

C.reg("chat", function (body, arg) {
  var dm = arg && arg !== "dm" ? arg : null;
  if (dm) return thread(body, dm);
  var inbox = arg === "dm";
  body.innerHTML = '<div class="csub"><button type="button" class="' + (inbox ? "" : "on") + '" data-cgo="community-chat">General</button><button type="button" class="' + (inbox ? "on" : "") + '" data-cgo="community-chat-dm">Messages' + (C.unread() ? " (" + C.unread() + ")" : "") + '</button></div><p class="cnote">Messages disappear after 10 hours.</p><div id="cc"></div>';
  var el = document.getElementById("cc");
  if (inbox) inboxView(el); else room(el, null, "Message everyone");
});

function filter(to) { var me = C.me().id; return to ? "&or=(and(user_id.eq." + me + ",to_user.eq." + to + "),and(user_id.eq." + to + ",to_user.eq." + me + "))" : "&to_user=is.null"; }
function room(el, to, hint) {
  partner = to; last = 0; reply = null;
  el.innerHTML = '<div id="cmsgs" class="cmsgs"><p class="lsep">Loading...</p></div><div id="crb" class="crb" hidden></div><div class="ccomp"><input id="cin" maxlength="500" placeholder="' + esc(hint) + '" autocomplete="off"><button type="button" data-csend>Send</button></div>';
  C.rest("/rest/v1/messages?select=" + SEL + filter(to) + "&order=id.desc&limit=60", "GET").then(function (rows) {
    var box = document.getElementById("cmsgs"); if (!box) return;
    rows = (rows || []).reverse(); box.innerHTML = rows.length ? "" : '<p class="lsep">No messages yet. Say hello.</p>';
    add(rows, true); if (to && last) { setRead(to, last); loadCount(); }
  }).catch(function (e) { var b = document.getElementById("cmsgs"); if (b) b.innerHTML = '<p class="lsep">' + esc(C.nice(e)) + "</p>"; });
  C.every(poll, 4000);
}
var ticks = 0;
function poll() {
  if (!document.getElementById("cmsgs")) return;
  if (++ticks % 5 === 0) reconcile();
  C.rest("/rest/v1/messages?select=" + SEL + filter(partner) + "&id=gt." + last + "&order=id.asc", "GET").then(function (rows) {
    if (rows && rows.length) { var near = window.innerHeight + window.scrollY > document.body.scrollHeight - 160; add(rows, near); if (partner) { setRead(partner, last); loadCount(); } }
  }).catch(function () {});
}
function reconcile() {
  C.rest("/rest/v1/messages?select=id" + filter(partner) + "&order=id.desc&limit=60", "GET").then(function (rows) {
    if (!rows) return; var ids = {}, min = Infinity; rows.forEach(function (r) { ids[r.id] = 1; if (r.id < min) min = r.id; }); if (rows.length < 60) min = 0;
    document.querySelectorAll("#cmsgs .cm[data-mid]").forEach(function (d) { var id = +d.getAttribute("data-mid"); if (id >= min && !ids[id]) d.remove(); });
  }).catch(function () {});
}
function add(rows, scroll) {
  var box = document.getElementById("cmsgs"), my = C.me().id, adm = C.isAdmin(); if (!box || !rows.length) return;
  if (box.querySelector(".lsep")) box.innerHTML = "";
  rows.forEach(function (r) {
    if (box.querySelector('[data-mid="' + r.id + '"]')) return;
    last = Math.max(last, r.id);
    var mine = r.user_id === my, d = document.createElement("div"); d.className = "cm" + (mine ? " me" : ""); d.setAttribute("data-mid", r.id); d.setAttribute("data-who", mine ? (C.me().name || "You") : nm(r));
    d.innerHTML = "<small>" + (mine ? "You" : esc(nm(r))) + ", " + C.ago(r.created_at) + '<button type="button" data-crep="' + r.id + '">reply</button>' + (mine || partner || (adm && !r.to_user) ? '<button type="button" data-cdel="' + r.id + '">delete</button>' : "") + "</small>" +
      (r.reply_snip ? '<blockquote data-cgoto="' + (r.reply_to || "") + '"><b>' + esc(r.reply_name || "") + "</b> " + esc(r.reply_snip) + "</blockquote>" : "") + "<p>" + esc(r.body) + "</p>";
    box.appendChild(d);
  });
  if (scroll) window.scrollTo(0, document.body.scrollHeight);
}
function showReply() {
  var rb = document.getElementById("crb"); if (!rb) return;
  if (!reply) { rb.hidden = true; rb.innerHTML = ""; return; }
  rb.hidden = false; rb.innerHTML = '<span>Replying to <b>' + esc(reply.name) + "</b>: " + esc(reply.snip) + '</span><button type="button" data-crx aria-label="Cancel reply">x</button>';
  var i = document.getElementById("cin"); if (i) i.focus();
}
function send() {
  var inp = document.getElementById("cin"), v = inp ? inp.value.trim() : ""; if (!v) return;
  var msg = { user_id: C.me().id, to_user: partner, body: v };
  if (reply) { msg.reply_to = reply.id; msg.reply_name = reply.name; msg.reply_snip = reply.snip; }
  var keep = reply; inp.value = ""; reply = null; showReply(); inp.focus();
  C.rest("/rest/v1/messages", "POST", msg).then(poll).catch(function (e) { inp.value = v; reply = keep; showReply(); C.toast(C.nice(e)); });
}

/* 1-to-1 with online status */
function thread(body, to) {
  body.innerHTML = '<button type="button" class="back" data-backto="community-chat-dm">' + CHEV + 'Messages</button><h2 id="cwho" style="margin:0">Chat</h2><p id="cstat" class="cstat"></p><p class="cnote">Messages disappear after 10 hours. Either of you can delete any message.</p><div id="cc"></div>';
  function stat() { C.rest("/rest/v1/profiles?select=name,last_seen&user_id=eq." + encodeURIComponent(to), "GET").then(function (r) { var h = document.getElementById("cwho"), s = document.getElementById("cstat"); if (!h || !r || !r[0]) return; h.textContent = r[0].name; s.innerHTML = dot(r[0].last_seen) + esc(seen(r[0].last_seen)); }).catch(function () {}); }
  stat(); C.every(stat, 30000);
  room(document.getElementById("cc"), to, "Write a message");
}
function inboxView(el) {
  var on = localStorage.getItem("presence") !== "0";
  el.innerHTML = '<label class="cf">Find a student<input id="cfind" class="cin" placeholder="Type a name" autocomplete="off"></label><div id="cres"></div><div id="cthr"><p class="lsep">Loading...</p></div><label class="cswitch sub"><input type="checkbox" id="cpres"' + (on ? " checked" : "") + "><span>Show when I am online</span></label>";
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
      return '<button type="button" class="cth" data-cdm="' + esc(r.partner_id) + '"><span class="cav">' + esc((r.partner_name || "?").charAt(0).toUpperCase()) + dot(r.partner_seen) + '</span><span><b>' + esc(r.partner_name) + "</b><small>" + (r.last_from_me ? "You: " : "") + esc(r.last_body) + "</small></span>" + (un ? '<i class="cu"></i>' : "") + "</button>";
    }).join("") || '<p class="lsep">No conversations yet. Find a student above to start one.</p>';
  }).catch(function (e) { var el = document.getElementById("cthr"); if (el) el.innerHTML = '<p class="lsep">' + esc(C.nice(e)) + "</p>"; });
}
var ft = null;
function find(q) {
  clearTimeout(ft);
  ft = setTimeout(function () {
    var el = document.getElementById("cres"); if (!el) return;
    if (q.trim().length < 2) { el.innerHTML = ""; return; }
    C.rest("/rest/v1/profiles?select=user_id,name,last_seen&name=ilike.*" + encodeURIComponent(q.trim().replace(/[*,()]/g, "")) + "*&user_id=neq." + C.me().id + "&limit=10", "GET").then(function (rows) {
      el.innerHTML = (rows || []).map(function (r) { return '<button type="button" class="cth" data-cdm="' + esc(r.user_id) + '"><span class="cav">' + esc((r.name || "?").charAt(0).toUpperCase()) + dot(r.last_seen) + "</span><span><b>" + esc(r.name) + "</b><small>" + esc(seen(r.last_seen)) + "</small></span></button>"; }).join("") || '<p class="lsep">No student found.</p>';
    }).catch(function () {});
  }, 300);
}

/* unread dot (only on the small chat icon) and online heartbeat */
function loadCount() {
  if (!C.me()) return;
  C.rest("/rest/v1/rpc/dm_threads", "POST", {}).then(function (rows) {
    var rd = readMap(), n = 0; (rows || []).forEach(function (r) { if (!r.last_from_me && r.last_id > (rd[r.partner_id] || 0)) n++; });
    C.setUnread(n);
  }).catch(function () {});
}
var lastBeat = 0;
function beat() { if (C.me() && document.visibilityState === "visible" && Date.now() - lastBeat > 20000) { lastBeat = Date.now(); C.rest("/rest/v1/rpc/touch_presence", "POST", { p_show: localStorage.getItem("presence") !== "0" }).catch(function () {}); } }
setInterval(function () { if (C.me() && document.visibilityState === "visible") loadCount(); }, 45000);
setInterval(beat, 60000);
document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") beat(); });
document.addEventListener("sbchange", function () { if (C.me()) { beat(); if (!C.unreadN) setTimeout(loadCount, 500); } });
if (C.me()) { setTimeout(loadCount, 1500); setTimeout(beat, 2000); }

document.addEventListener("click", function (e) {
  var t = e.target.closest ? e.target : null; if (!t) return;
  var b;
  if (t.closest("[data-csend]")) { send(); return; }
  if (t.closest("[data-crx]")) { reply = null; showReply(); return; }
  if ((b = t.closest("[data-cdm]"))) { location.hash = "community-chat-" + b.dataset.cdm; return; }
  if ((b = t.closest("[data-crep]"))) { var d = b.closest(".cm"); reply = { id: +b.dataset.crep, name: d.getAttribute("data-who"), snip: (d.querySelector("p").textContent || "").slice(0, 90) }; showReply(); return; }
  if ((b = t.closest("[data-cgoto]"))) { var tg = document.querySelector('[data-mid="' + b.dataset.cgoto + '"]'); if (tg) { tg.scrollIntoView({ block: "center", behavior: "smooth" }); tg.classList.add("flash"); setTimeout(function () { tg.classList.remove("flash"); }, 1200); } return; }
  if ((b = t.closest("[data-cdel]"))) {
    if (!confirm(partner ? "Delete this message for both of you?" : "Delete this message?")) return;
    C.rest("/rest/v1/messages?id=eq." + b.dataset.cdel, "DELETE").then(function () { var d = b.closest(".cm"); if (d) d.remove(); }).catch(function (er) { C.toast(C.nice(er)); });
  }
});
document.addEventListener("keydown", function (e) { if (e.key === "Enter" && e.target && e.target.id === "cin") { e.preventDefault(); send(); } });
document.addEventListener("input", function (e) { if (e.target && e.target.id === "cfind") find(e.target.value); });
document.addEventListener("change", function (e) { if (e.target && e.target.id === "cpres") { try { localStorage.setItem("presence", e.target.checked ? "1" : "0"); } catch (x) {} lastBeat = 0; beat(); C.toast(e.target.checked ? "Others can see when you are online" : "Your online status is hidden"); } });
window.__chat = 1;
})();
