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
  S = { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at || Math.floor(Date.now() / 1000) + (j.expires_in || 3600), user: { id: j.user.id, email: j.user.email, name: (j.user.user_metadata && j.user.user_metadata.name) || "" }, admin: !!(S && S.user && S.user.id === j.user.id && S.admin) };
  sv(SK, S);
}
function ensureToken() {
  if (!S) return Promise.reject(new Error("Not signed in"));
  if (S.expires_at - 60 > Date.now() / 1000) return Promise.resolve();
  return api("/auth/v1/token?grant_type=refresh_token", "POST", { refresh_token: S.refresh_token }).then(setSession).catch(function (e) {
    if (e.status === 400 || e.status === 401) { S = null; _rem.call(localStorage, SK); ping(); }
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
  busy = true; state = "Syncing..."; ping();
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
      state = ""; ping();
      if (changed) { restart(); if (manual || first) toast("Synced from your account"); }
      else if (manual) toast("All synced");
    });
  }).catch(function (e) { state = "Not synced: " + nice(e); ping(); if (manual) toast(nice(e)); }).then(function () { busy = false; });
}

/* ---------- account actions ---------- */
var MAIL = "@academictracker.app";
function toEmail(v) { v = (v || "").trim(); return v.indexOf("@") < 0 ? v.toLowerCase() + MAIL : v; }
function signIn(user, pw) { return api("/auth/v1/token?grant_type=password", "POST", { email: toEmail(user), password: pw }).then(function (j) { setSession(j); }); }
function signUp(name, email, pw) { return api("/auth/v1/signup", "POST", { email: email, password: pw, data: { name: name } }).then(function (j) { if (j && j.access_token) { setSession(j); return "in"; } return "confirm"; }); }
function checkAdmin() {
  if (!S) return Promise.resolve();
  return ensureToken().then(function () { return api("/rest/v1/rpc/is_admin", "POST", {}, true); }).then(function (r) { if (S) { S.admin = r === true; sv(SK, S); } }).catch(function () {});
}
function signOut(clear) {
  var p = S ? api("/auth/v1/logout", "POST", null, true).catch(function () {}) : Promise.resolve();
  return p.then(function () {
    S = null; _rem.call(localStorage, SK);
    if (clear) { localKeys().forEach(function (k) { _rem.call(localStorage, k); }); M = { owner: null, ts: {}, dirty: [], last: 0 }; sv(MK, M); }
    restart(); ping();
  });
}

function ping() { try { document.dispatchEvent(new Event("sbchange")); } catch (e) {} }
function toast(t) { document.querySelectorAll(".atoast").forEach(function (o) { o.remove(); }); var x = document.createElement("div"); x.className = "atoast"; x.textContent = t; document.body.appendChild(x); setTimeout(function () { x.remove(); }, 3500); }

window.addEventListener("online", function () { syncNow(false); });
document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") syncNow(false); });
setInterval(function () { syncNow(false); }, 60000);
if (S) setTimeout(function () { checkAdmin().then(function () { ping(); syncNow(false); }); }, 800);
window.SB = { call: function (p, m, b) { return ensureToken().then(function () { return api(p, m, b, true); }); }, session: function () { return S; }, nice: nice, toast: toast, esc: esc };
window.SBc = { S: function () { return S; }, M: function () { return M; }, state: function () { return state; }, api: api, sv: sv, signIn: signIn, signUp: signUp, signOut: signOut, syncNow: syncNow, checkAdmin: checkAdmin, toast: toast, esc: esc, nice: nice, MAIL: MAIL };
window.__sync = 1;
})();
