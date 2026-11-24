/* Account: sign in with Supabase and keep progress in sync across devices. */
(function () {
"use strict";
var BASE = "https://rtgfohqsiocihahoqbfp.supabase.co";
var ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0Z2ZvaHFzaW9jaWhhaG9xYmZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU0NTEwMjQsImV4cCI6MjExMTAyNzAyNH0.umFcfJCeR7cHw--XKjDKixc4l_U5ZlcFk3AKMmLnzQY";
var SK = "sb-session", MK = "sb-meta";
var _set = Storage.prototype.setItem, _rem = Storage.prototype.removeItem, _get = Storage.prototype.getItem;
function ld(k, d) { try { return JSON.parse(_get.call(localStorage, k)) || d; } catch (e) { return d; } }
function sv(k, v) { try { _set.call(localStorage, k, JSON.stringify(v)); } catch (e) {} }
var S = ld(SK, null), M = ld(MK, { owner: null, ts: {}, dirty: [], last: 0 });
var busy = false, timer = null, state = "";

function isSynced(k) { return k === "profile" || /^(progress|hard|doubts|log|weekplan|badges):/.test(k); }
function localKeys() { var o = []; for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (isSynced(k)) o.push(k); } return o; }
function readLocal(k) { var r = _get.call(localStorage, k); if (r === null) return undefined; try { return JSON.parse(r); } catch (e) { return { __raw: r }; } }
function writeLocal(k, v) {
  if (v && v.__removed) _rem.call(localStorage, k);
  else if (v && v.__raw !== undefined) _set.call(localStorage, k, v.__raw);
  else _set.call(localStorage, k, JSON.stringify(v));
}
function restart() { try { profile = readLocal("profile") || null; } catch (e) {} if (window.__start) { try { window.__start(); } catch (e) {} } }
function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

/* remember which synced keys changed on this device */
Storage.prototype.setItem = function (k) { _set.apply(this, arguments); if (this === localStorage) touch(k); };
Storage.prototype.removeItem = function (k) { _rem.apply(this, arguments); if (this === localStorage) touch(k); };
function touch(k) {
  if (!S || !isSynced(k)) return;
  M.ts[k] = Date.now(); if (M.dirty.indexOf(k) < 0) M.dirty.push(k); sv(MK, M); later();
}
function later() { clearTimeout(timer); timer = setTimeout(function () { syncNow(false); }, 2500); }

/* ---------- Supabase calls (plain fetch, no library) ---------- */
function api(path, method, body, authed) {
  var h = { apikey: ANON, "Content-Type": "application/json", Authorization: "Bearer " + (authed && S ? S.access_token : ANON) };
  if (path.indexOf("/rest/") === 0 && method === "POST") h.Prefer = "resolution=merge-duplicates,return=minimal";
  return fetch(BASE + path, { method: method, headers: h, body: body ? JSON.stringify(body) : undefined }).then(function (r) {
    return r.text().then(function (t) {
      var j = null; try { j = t ? JSON.parse(t) : null; } catch (e) {}
      if (!r.ok) { var er = new Error((j && (j.error_description || j.msg || j.message || j.error)) || "Request failed (" + r.status + ")"); er.status = r.status; throw er; }
      return j;
    });
  });
}
function setSession(j) {
  S = { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at || Math.floor(Date.now() / 1000) + (j.expires_in || 3600), user: { id: j.user.id, email: j.user.email } };
  sv(SK, S);
}
function ensureToken() {
  if (!S) return Promise.reject(new Error("Not signed in"));
  if (S.expires_at - 60 > Date.now() / 1000) return Promise.resolve();
  return api("/auth/v1/token?grant_type=refresh_token", "POST", { refresh_token: S.refresh_token }).then(setSession).catch(function (e) {
    if (e.status === 400 || e.status === 401) { S = null; _rem.call(localStorage, SK); refreshBtn(); }
    throw e;
  });
}
function nice(e) {
  var m = e && e.message || "Something went wrong";
  if (/invalid login/i.test(m)) return "Wrong email or password.";
  if (/not confirmed/i.test(m)) return "Please confirm your email first. Check your inbox.";
  if (/already registered|already been registered/i.test(m)) return "This email already has an account. Sign in instead.";
  if (/failed to fetch|networkerror|load failed/i.test(m)) return "No internet connection. Try again.";
  return m;
}

/* ---------- merge rules for the first sync on a device ---------- */
function merge(k, a, b) {
  var p = k.split(":")[0], o = {};
  if (p === "profile") return b !== undefined ? b : a;
  if (a === undefined) return b; if (b === undefined) return a;
  if (p === "progress") {
    [b, a].forEach(function (m) { Object.keys(m || {}).forEach(function (c) { var x = m[c] || {}, y = o[c] || {}, z = {}; ["learnt", "revised", "pyq"].forEach(function (f) { if (x[f] || y[f]) z[f] = true; }); o[c] = z; }); });
    return o;
  }
  if (p === "doubts") {
    var by = {}, out = []; (Array.isArray(b) ? b : []).concat(Array.isArray(a) ? a : []).forEach(function (d) { if (!by[d.id]) { by[d.id] = d; out.push(d); } else if (d.x && !by[d.id].x) by[d.id].x = d.x; });
    return out;
  }
  if (p === "log") {
    [b, a].forEach(function (m) { Object.keys(m || {}).forEach(function (day) { o[day] = o[day] || {}; Object.keys(m[day] || {}).forEach(function (s) { o[day][s] = Math.max(o[day][s] || 0, m[day][s] || 0); }); }); });
    return o;
  }
  if (p === "hard" || p === "weekplan" || p === "badges") return Object.assign({}, b, a);
  return a;
}

/* ---------- sync ---------- */
function syncNow(manual) {
  if (!S || busy) return Promise.resolve();
  busy = true; state = "Syncing..."; updateStatus();
  return ensureToken().then(function () { return api("/rest/v1/user_data?select=key,value,updated_at", "GET", null, true); }).then(function (rows) {
    var uid = S.user.id, first = M.owner !== uid, changed = false, up = [], cloud = {}, now = Date.now();
    if (first && M.owner) { localKeys().forEach(function (k) { _rem.call(localStorage, k); }); M.ts = {}; M.dirty = []; changed = true; }
    rows.forEach(function (r) { cloud[r.key] = r; });
    var keys = {}; Object.keys(cloud).forEach(function (k) { keys[k] = 1; }); localKeys().forEach(function (k) { keys[k] = 1; });
    Object.keys(keys).forEach(function (k) {
      var c = cloud[k], lv = readLocal(k), has = lv !== undefined, cts = c ? Date.parse(c.updated_at) : 0, lts = M.ts[k] || 0;
      if (!c) { if (has) { up.push([k, lv, lts || now]); } return; }
      if (!has) { if (!(c.value && c.value.__removed)) { writeLocal(k, c.value); M.ts[k] = cts; changed = true; } return; }
      if (first) {
        var mg = merge(k, lv, c.value);
        if (JSON.stringify(mg) !== JSON.stringify(c.value)) up.push([k, mg, now]);
        if (JSON.stringify(mg) !== JSON.stringify(lv)) { writeLocal(k, mg); changed = true; }
        M.ts[k] = up.length && up[up.length - 1][0] === k ? now : cts; return;
      }
      if (cts > lts) { writeLocal(k, c.value); M.ts[k] = cts; changed = true; }
      else if (lts > cts) up.push([k, lv, lts]);
    });
    M.dirty.forEach(function (k) { if (!keys[k] || readLocal(k) !== undefined) return; if (!up.some(function (u) { return u[0] === k; })) up.push([k, { __removed: true }, M.ts[k] || now]); });
    var body = up.map(function (u) { return { user_id: uid, key: u[0], value: u[1], updated_at: new Date(u[2]).toISOString() }; });
    var p = body.length ? api("/rest/v1/user_data?on_conflict=user_id,key", "POST", body, true) : Promise.resolve();
    return p.then(function () {
      up.forEach(function (u) { M.ts[u[0]] = u[2]; });
      M.owner = uid; M.dirty = []; M.last = Date.now(); sv(MK, M);
      state = ""; updateStatus();
      if (changed) { restart(); if (manual || first) toast("Synced from your account"); }
      else if (manual) toast("All synced");
    });
  }).catch(function (e) { state = "Not synced: " + nice(e); updateStatus(); if (manual) toast(nice(e)); }).then(function () { busy = false; });
}

/* ---------- account actions ---------- */
function signIn(email, pw) { return api("/auth/v1/token?grant_type=password", "POST", { email: email, password: pw }).then(function (j) { setSession(j); }); }
function signUp(email, pw) { return api("/auth/v1/signup", "POST", { email: email, password: pw }).then(function (j) { if (j && j.access_token) { setSession(j); return "in"; } return "confirm"; }); }
function signOut(clear) {
  var p = S ? api("/auth/v1/logout", "POST", null, true).catch(function () {}) : Promise.resolve();
  return p.then(function () {
    S = null; _rem.call(localStorage, SK);
    if (clear) { localKeys().forEach(function (k) { _rem.call(localStorage, k); }); M = { owner: null, ts: {}, dirty: [], last: 0 }; sv(MK, M); }
    restart(); refreshBtn();
  });
}

/* ---------- interface ---------- */
var PERSON = '<svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><circle cx="10" cy="7" r="3.3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3.8 16.5c.6-3 3.1-4.7 6.2-4.7s5.6 1.7 6.2 4.7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
function toast(t) { document.querySelectorAll(".atoast").forEach(function (o) { o.remove(); }); var x = document.createElement("div"); x.className = "atoast"; x.textContent = t; document.body.appendChild(x); setTimeout(function () { x.remove(); }, 3500); }
function when(ms) { if (!ms) return "never"; var m = Math.round((Date.now() - ms) / 60000); return m < 1 ? "just now" : m < 60 ? m + " min ago" : new Date(ms).toLocaleString(); }
function statusText() { return state || (M.last ? "Last synced " + when(M.last) : "Not synced yet"); }
function updateStatus() { var el = document.getElementById("astatus"); if (el) el.textContent = statusText(); }
function refreshBtn() { document.querySelectorAll(".acctbtn").forEach(function (b) { b.classList.toggle("on", !!S); b.title = S ? "Account: " + S.user.email : "Sign in"; }); }
function close() { var m = document.getElementById("amodal"); if (m) m.remove(); }
function msg(t, ok) { var e = document.getElementById("amsg"); if (e) { e.textContent = t || ""; e.className = "amsg" + (ok ? " ok" : ""); } }
function busyBtns(on) { document.querySelectorAll("#amodal .ago,#amodal .aghost").forEach(function (b) { b.disabled = on; }); }

function open(note) {
  close();
  var m = document.createElement("div"); m.className = "amodal"; m.id = "amodal";
  m.innerHTML = S
    ? '<div class="acard" role="dialog" aria-modal="true" aria-label="Account"><h2>Account</h2><p class="asub"><b>' + esc(S.user.email) + '</b><br><span id="astatus">' + esc(statusText()) + '</span></p><p class="amsg" id="amsg"></p><div class="abtns"><button type="button" class="ago" data-async>Sync now</button><button type="button" class="aghost" data-aout>Sign out</button><button type="button" class="alink" data-aclose>Close</button></div></div>'
    : '<div class="acard" role="dialog" aria-modal="true" aria-label="Sign in"><h2>Sign in</h2><p class="asub">Save your progress online and use it on any phone. Chat, leaderboard and doubts for everyone are coming next.</p>' +
      '<label class="afield">Email<input id="aemail" type="email" autocomplete="email" inputmode="email"></label><label class="afield">Password<input id="apass" type="password" autocomplete="current-password"></label>' +
      '<p class="amsg" id="amsg" role="status">' + esc(note || "") + '</p><div class="abtns"><button type="button" class="ago" data-asignin>Sign in</button><button type="button" class="aghost" data-asignup>Create account</button><button type="button" class="alink" data-aforgot>Forgot password?</button><button type="button" class="alink" data-aclose>Close</button></div></div>';
  document.body.appendChild(m);
  var f = m.querySelector("#aemail"); if (f) setTimeout(function () { try { f.focus(); } catch (e) {} }, 50);
}
function openNewPassword() {
  close();
  var m = document.createElement("div"); m.className = "amodal"; m.id = "amodal";
  m.innerHTML = '<div class="acard" role="dialog" aria-modal="true" aria-label="New password"><h2>Set a new password</h2><p class="asub">Choose a password with at least 6 characters.</p><label class="afield">New password<input id="anew" type="password" autocomplete="new-password"></label><p class="amsg" id="amsg"></p><div class="abtns"><button type="button" class="ago" data-asetpw>Save password</button></div></div>';
  document.body.appendChild(m);
}
function creds() { var e = (document.getElementById("aemail") || {}).value || "", p = (document.getElementById("apass") || {}).value || ""; return { e: e.trim(), p: p }; }
function after() { close(); refreshBtn(); toast("Signed in. Syncing..."); return syncNow(true); }

document.addEventListener("click", function (e) {
  var t = e.target.closest ? e.target : null; if (!t) return;
  if (t.closest("[data-acct]")) { open(); return; }
  var m = document.getElementById("amodal"); if (!m || !m.contains(t)) return;
  if (t === m || t.closest("[data-aclose]")) { close(); return; }
  var c;
  if (t.closest("[data-asignin]")) {
    c = creds(); if (!c.e || !c.p) { msg("Enter your email and password."); return; }
    busyBtns(true); msg("Signing in...", true);
    signIn(c.e, c.p).then(after).catch(function (er) { busyBtns(false); msg(nice(er)); });
  } else if (t.closest("[data-asignup]")) {
    c = creds(); if (!c.e || c.p.length < 6) { msg("Enter your email and a password of at least 6 characters."); return; }
    busyBtns(true); msg("Creating account...", true);
    signUp(c.e, c.p).then(function (r) { if (r === "in") return after(); busyBtns(false); msg("Account created. Check your email and tap the confirm link, then sign in.", true); }).catch(function (er) { busyBtns(false); msg(nice(er)); });
  } else if (t.closest("[data-aforgot]")) {
    c = creds(); if (!c.e) { msg("Type your email first, then tap Forgot password."); return; }
    api("/auth/v1/recover", "POST", { email: c.e }).then(function () { msg("If this email has an account, a reset link is on its way.", true); }).catch(function (er) { msg(nice(er)); });
  } else if (t.closest("[data-async]")) { syncNow(true).then(function () { updateStatus(); });
  } else if (t.closest("[data-aout]")) {
    var clr = confirm("Sign out.\n\nOK = also remove your study data from this device (it stays safe in your account).\nCancel = keep it on this device.");
    close(); signOut(clr).then(function () { toast("Signed out"); });
  } else if (t.closest("[data-asetpw]")) {
    var np = (document.getElementById("anew") || {}).value || ""; if (np.length < 6) { msg("Use at least 6 characters."); return; }
    busyBtns(true); api("/auth/v1/user", "PUT", { password: np }, true).then(function () { close(); toast("Password updated"); syncNow(false); }).catch(function (er) { busyBtns(false); msg(nice(er)); });
  }
});
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") close();
  if (e.key === "Enter" && e.target && (e.target.id === "apass" || e.target.id === "aemail")) { var b = document.querySelector("[data-asignin]"); if (b) b.click(); }
});

function enhance() {
  var a = document.getElementById("app"), go = a && a.querySelector("#go");
  if (go && !a.querySelector(".wsign")) {
    var w = document.createElement("button"); w.type = "button"; w.className = "wsign"; w.setAttribute("data-acct", "");
    w.textContent = S ? "Signed in. Tap to manage your account" : "Already have an account? Sign in to restore your progress";
    go.insertAdjacentElement("afterend", w);
  }
  var tl = a && a.querySelector(".top .tools");
  if (!tl || tl.querySelector(".acctbtn")) return;
  var b = document.createElement("button"); b.type = "button"; b.className = "acctbtn"; b.setAttribute("data-acct", ""); b.setAttribute("aria-label", "Account"); b.innerHTML = PERSON;
  tl.insertBefore(b, tl.querySelector("[data-reload]") || null); refreshBtn();
}
var appEl = document.getElementById("app");
if (appEl) new MutationObserver(enhance).observe(appEl, { childList: true, subtree: true });
enhance();

/* sign-in and password-reset links from emails arrive with the session in the address */
(function () {
  var h = location.hash; if (h.indexOf("access_token=") < 0) return;
  var p = new URLSearchParams(h.replace(/^#/, "")), at = p.get("access_token"), type = p.get("type");
  try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
  if (!at) return;
  var tmp = S; S = { access_token: at, refresh_token: p.get("refresh_token"), expires_at: +p.get("expires_at") || Math.floor(Date.now() / 1000) + (+p.get("expires_in") || 3600), user: { id: "", email: "" } };
  api("/auth/v1/user", "GET", null, true).then(function (u) {
    S.user = { id: u.id, email: u.email }; sv(SK, S); refreshBtn();
    if (type === "recovery") openNewPassword(); else { toast("Signed in. Syncing..."); syncNow(true); }
  }).catch(function () { S = tmp; });
})();

window.addEventListener("online", function () { syncNow(false); });
document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") syncNow(false); });
setInterval(function () { syncNow(false); }, 60000);
if (S) setTimeout(function () { syncNow(false); }, 800);
window.__sync = 1;
})();
