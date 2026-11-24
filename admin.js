/* Admin panel: list users, reset a password, delete a user. Only works for accounts in the admins table. */
(function () {
"use strict";
var users = [], q = "";
function sb() { return window.SB; }
function esc(s) { return sb().esc(s); }
function dt(x) { return x ? new Date(x).toLocaleDateString() : ""; }
function close() { var m = document.getElementById("admodal"); if (m) m.remove(); }
function open() {
  close(); q = "";
  var m = document.createElement("div"); m.className = "amodal"; m.id = "admodal";
  m.innerHTML = '<div class="acard adm" role="dialog" aria-modal="true" aria-label="Manage users"><h2>Manage users</h2><p class="asub" id="adcount">Loading...</p><input id="adq" class="adq" type="search" placeholder="Search by name or email" autocomplete="off"><div id="adlist"></div><div class="abtns" style="margin-top:12px"><button type="button" class="alink" data-adclose>Close</button></div></div>';
  document.body.appendChild(m); load();
}
function load() {
  sb().call("/rest/v1/rpc/admin_list_users", "POST", {}).then(function (r) { users = r || []; draw(); })
    .catch(function (e) { var c = document.getElementById("adcount"); if (c) c.textContent = sb().nice(e); });
}
function draw() {
  var list = document.getElementById("adlist"), c = document.getElementById("adcount"); if (!list) return;
  var t = q.toLowerCase(), rows = users.filter(function (u) { return !t || (u.name || "").toLowerCase().indexOf(t) > -1 || (u.email || "").toLowerCase().indexOf(t) > -1; });
  c.textContent = users.length + " user" + (users.length === 1 ? "" : "s") + (t ? ", " + rows.length + " shown" : "");
  list.innerHTML = rows.map(function (u) {
    return '<div class="adrow"><div class="adav">' + esc((u.name || "?").charAt(0).toUpperCase()) + '</div><div class="adtx"><b>' + esc(u.name || "Student") + (u.is_admin ? ' <span class="adtag">admin</span>' : "") + "</b><small>" + esc(u.email) + "</small><small>Joined " + dt(u.created_at) + (u.last_sign_in_at ? ", last sign-in " + dt(u.last_sign_in_at) : "") + "</small></div>" +
      (u.is_admin ? "" : '<div class="adbt"><button type="button" class="adb" data-adreset="' + esc(u.user_id) + '">Reset password</button><button type="button" class="adb del" data-addel="' + esc(u.user_id) + '">Delete</button></div>') + "</div>";
  }).join("") || '<p class="asub">No users found.</p>';
}
function find(id) { return users.filter(function (u) { return u.user_id === id; })[0]; }
document.addEventListener("click", function (e) {
  var t = e.target.closest ? e.target : null; if (!t) return;
  var m = document.getElementById("admodal"); if (!m || !m.contains(t)) return;
  if (t === m || t.closest("[data-adclose]")) { close(); return; }
  var b = t.closest("[data-adreset]"), u;
  if (b) {
    u = find(b.dataset.adreset); var pw = prompt("New password for " + (u ? u.name : "this user") + " (at least 6 characters):");
    if (pw === null) return; if (pw.length < 6) { sb().toast("Password must be at least 6 characters"); return; }
    sb().call("/rest/v1/rpc/admin_set_password", "POST", { target: b.dataset.adreset, new_password: pw }).then(function () { sb().toast("Password changed"); }).catch(function (er) { sb().toast(sb().nice(er)); });
    return;
  }
  b = t.closest("[data-addel]");
  if (b) {
    u = find(b.dataset.addel);
    if (!confirm("Delete " + (u ? u.name + " (" + u.email + ")" : "this user") + "?\n\nTheir account and all saved data are removed permanently.")) return;
    sb().call("/rest/v1/rpc/admin_delete_user", "POST", { target: b.dataset.addel }).then(function () { sb().toast("User deleted"); load(); }).catch(function (er) { sb().toast(sb().nice(er)); });
  }
});
document.addEventListener("input", function (e) { if (e.target && e.target.id === "adq") { q = e.target.value; draw(); } });
document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
window.Admin = { open: open };
window.__admin = 1;
})();
