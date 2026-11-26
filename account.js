/* Account window: sign in, create account, account menu. */
(function () {
"use strict";
var C = window.SBc;
/* ---------- interface ---------- */
var PERSON = '<svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><circle cx="10" cy="7" r="3.3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3.8 16.5c.6-3 3.1-4.7 6.2-4.7s5.6 1.7 6.2 4.7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
function when(ms) { if (!ms) return "never"; var m = Math.round((Date.now() - ms) / 60000); return m < 1 ? "just now" : m < 60 ? m + " min ago" : new Date(ms).toLocaleString(); }
function statusText() { return C.state() || (C.M().last ? "Last synced " + when(C.M().last) : "Not synced yet"); }
function updateStatus() { var el = document.getElementById("astatus"); if (el) el.textContent = statusText(); }
function refreshBtn() { document.querySelectorAll(".acctbtn").forEach(function (b) { b.classList.toggle("on", !!C.S()); b.title = C.S() ? "Account: " + C.S().user.email : "Sign in"; }); }
function close() { var m = document.getElementById("amodal"); if (m) m.remove(); }
function msg(t, ok) { var e = document.getElementById("amsg"); if (e) { e.textContent = t || ""; e.className = "amsg" + (ok ? " ok" : ""); } }
function busyBtns(on) { document.querySelectorAll("#amodal .ago,#amodal .aghost").forEach(function (b) { b.disabled = on; }); }

function open(view) {
  close();
  var m = document.createElement("div"); m.className = "amodal"; m.id = "amodal"; var html;
  if (C.S()) {
    html = '<div class="acard" role="dialog" aria-modal="true" aria-label="Account"><h2>' + C.esc(C.S().user.name || "Account") + '</h2><p class="asub">' + C.esc(C.S().user.email.replace(C.MAIL, "") === C.S().user.email ? C.S().user.email : "Username: " + C.S().user.email.replace(C.MAIL, "")) + '<br><span id="astatus">' + C.esc(statusText()) + '</span></p><p class="amsg" id="amsg"></p><div class="abtns">' +
      (C.S().admin ? '<button type="button" class="ago" data-aadmin>Manage users</button>' : "") +
      '<button type="button" class="' + (C.S().admin ? "aghost" : "ago") + '" data-async>Sync now</button><button type="button" class="aghost" data-apw>Change password</button><button type="button" class="aghost" data-aout>Sign out</button><button type="button" class="alink" data-aclose>Close</button></div></div>';
  } else if (view === "up") {
    html = '<div class="acard" role="dialog" aria-modal="true" aria-label="Create account"><h2>Create account</h2><p class="asub">Your name is shown to other students.</p>' +
      '<label class="afield">Name<input id="sname" type="text" autocomplete="name" maxlength="40"></label><label class="afield">Email<input id="semail" type="email" autocomplete="email" inputmode="email"></label><label class="afield">Password (at least 6 characters)<input id="spass" type="password" autocomplete="new-password"></label>' +
      '<p class="amsg" id="amsg" role="status"></p><div class="abtns"><button type="button" class="ago" data-asignup>Create account</button><button type="button" class="alink" data-ashow="in">Already have an account? Sign in</button><button type="button" class="alink" data-aclose>Close</button></div></div>';
  } else {
    html = '<div class="acard" role="dialog" aria-modal="true" aria-label="Sign in"><h2>Sign in</h2><p class="asub">Save your progress online and use it on any phone.</p>' +
      '<label class="afield">Email or username<input id="aemail" type="text" autocomplete="username" autocapitalize="none" autocorrect="off"></label><label class="afield">Password<input id="apass" type="password" autocomplete="current-password"></label>' +
      '<p class="amsg" id="amsg" role="status"></p><div class="abtns"><button type="button" class="ago" data-asignin>Sign in</button><button type="button" class="alink" data-ashow="up">New here? Create an account</button><button type="button" class="alink" data-aclose>Close</button></div><p class="afine">Forgot your password? Ask the admin to reset it.</p></div>';
  }
  m.innerHTML = html; document.body.appendChild(m);
  var f = m.querySelector("#aemail,#sname"); if (f) setTimeout(function () { try { f.focus(); } catch (e) {} }, 50);
}
function openNewPassword() {
  close();
  var m = document.createElement("div"); m.className = "amodal"; m.id = "amodal";
  m.innerHTML = '<div class="acard" role="dialog" aria-modal="true" aria-label="New password"><h2>Change password</h2><p class="asub">Choose a password with at least 6 characters.</p><label class="afield">New password<input id="anew" type="password" autocomplete="new-password"></label><p class="amsg" id="amsg"></p><div class="abtns"><button type="button" class="ago" data-asetpw>Save password</button><button type="button" class="alink" data-aclose>Cancel</button></div></div>';
  document.body.appendChild(m);
}
function creds() { var e = (document.getElementById("aemail") || {}).value || "", p = (document.getElementById("apass") || {}).value || ""; return { e: e.trim(), p: p }; }
function after() { close(); refreshBtn(); C.toast("Signed in. Syncing..."); return C.checkAdmin().then(function () { refreshBtn(); return C.syncNow(true); }); }

document.addEventListener("click", function (e) {
  var t = e.target.closest ? e.target : null; if (!t) return;
  if (t.closest("[data-acct]")) { open(); return; }
  var m = document.getElementById("amodal"); if (!m || !m.contains(t)) return;
  if (t === m || t.closest("[data-aclose]")) { close(); return; }
  var c, sh = t.closest("[data-ashow]");
  if (sh) { open(sh.dataset.ashow); return; }
  if (t.closest("[data-asignin]")) {
    c = creds(); if (!c.e || !c.p) { msg("Enter your email or username and your password."); return; }
    busyBtns(true); msg("Signing in...", true);
    C.signIn(c.e, c.p).then(after).catch(function (er) { busyBtns(false); msg(C.nice(er)); });
  } else if (t.closest("[data-asignup]")) {
    var nm = ((document.getElementById("sname") || {}).value || "").trim(), em = ((document.getElementById("semail") || {}).value || "").trim(), pw = (document.getElementById("spass") || {}).value || "";
    if (!nm) { msg("Please enter your name."); return; }
    if (em.indexOf("@") < 1) { msg("Enter a valid email address."); return; }
    if (pw.length < 6) { msg("Use a password of at least 6 characters."); return; }
    busyBtns(true); msg("Creating account...", true);
    C.signUp(nm, em, pw).then(function (r) { if (r === "in") return after(); busyBtns(false); msg("Account created, but it needs confirming before you can sign in. Ask the admin.", true); }).catch(function (er) { busyBtns(false); msg(C.nice(er)); });
  } else if (t.closest("[data-aadmin]")) { close(); if (window.Admin) window.Admin.open();
  } else if (t.closest("[data-apw]")) { openNewPassword();
  } else if (t.closest("[data-async]")) { C.syncNow(true).then(function () { updateStatus(); });
  } else if (t.closest("[data-aout]")) {
    var clr = confirm("Sign out.\n\nOK = also remove your study data from this device (it stays safe in your account).\nCancel = keep it on this device.");
    close(); C.signOut(clr).then(function () { C.toast("Signed out"); });
  } else if (t.closest("[data-asetpw]")) {
    var np = (document.getElementById("anew") || {}).value || ""; if (np.length < 6) { msg("Use at least 6 characters."); return; }
    busyBtns(true); C.api("/auth/v1/user", "PUT", { password: np }, true).then(function () { close(); C.toast("Password updated"); }).catch(function (er) { busyBtns(false); msg(C.nice(er)); });
  }
});
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") close();
  if (e.key === "Enter" && e.target && /^(apass|aemail|sname|semail|spass)$/.test(e.target.id)) { var b = document.querySelector(e.target.id.charAt(0) === "s" ? "[data-asignup]" : "[data-asignin]"); if (b) b.click(); }
});

function enhance() {
  var a = document.getElementById("app"), tl = a && a.querySelector(".top .tools");
  if (!tl || tl.querySelector(".acctbtn")) return;
  var b = document.createElement("button"); b.type = "button"; b.className = "acctbtn"; b.setAttribute("data-acct", ""); b.setAttribute("aria-label", "Account"); b.innerHTML = PERSON;
  tl.insertBefore(b, tl.querySelector("[data-reload]") || null); refreshBtn();
}
var appEl = document.getElementById("app");
if (appEl) new MutationObserver(enhance).observe(appEl, { childList: true, subtree: true });
enhance();

document.addEventListener("sbchange", function () { refreshBtn(); updateStatus(); });
refreshBtn();
window.__account = 1;
})();
