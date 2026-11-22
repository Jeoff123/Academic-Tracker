/* Doubts list: note a doubt from the timer, tick it off when cleared. */
(function () {
"use strict";
function pid() { try { return ID(); } catch (e) { return "x"; } }
function ld(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
function sv(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
function pad(n) { return (n < 10 ? "0" : "") + n; }
function key(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function DK() { return "doubts:" + pid(); }
function save2(v) { sv(DK(), v); try { window.dispatchEvent(new Event("doubts")); } catch (e) {} }
function all() { return ld(DK(), []); }
function ago(iso) {
  var p = iso.split("-"), t = new Date(); t.setHours(0, 0, 0, 0);
  var n = Math.round((t - new Date(+p[0], +p[1] - 1, +p[2])) / 864e5);
  return n <= 0 ? "today" : n === 1 ? "yesterday" : n + " days ago";
}
var TICK = '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M4.5 10.5l3.7 3.7L15.5 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
var QM = '<svg viewBox="0 0 20 20" width="22" height="22" aria-hidden="true"><circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M7.9 8a2.2 2.2 0 1 1 3.2 2c-.8.5-1.1.9-1.1 1.7M10 14.2v.1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
var BIN = '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M5 6h10M8 6V4h4v2M6.5 6l.6 10h5.8l.6-10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

var css = `
.dmodal{position:fixed;inset:0;z-index:130;background:rgba(10,15,30,.55);display:grid;place-items:center;padding:16px}
.dcard{background:var(--surface);color:var(--ink);border-radius:24px;padding:22px;max-width:440px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.35);max-height:100%;overflow:auto}
.dcard h2{font-size:22px;margin:0 0 6px}
.dsub{color:var(--muted);margin:0 0 12px;line-height:1.4}
.dsub b{color:var(--ink)}
.dcard textarea{width:100%;border:1px solid var(--line);border-radius:14px;background:var(--bg);color:var(--ink);font:inherit;padding:12px;resize:vertical;min-height:84px}
.dchips{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 14px}
.dchips button{border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:999px;padding:7px 14px;font:600 14px var(--font-b);cursor:pointer}
.dchips button:hover{border-color:var(--revised)}
.dbtns{display:grid;gap:10px}
.dgo{min-height:48px;border:0;border-radius:14px;background:var(--revised);color:var(--on);font:600 16px var(--font-b);cursor:pointer}
.dlink{background:none;border:0;color:var(--muted);font-weight:600;cursor:pointer;padding:6px;text-decoration:underline;justify-self:center}
.dtable{background:var(--surface);border:1px solid var(--line);border-radius:22px;overflow:hidden}
.dbrow{display:flex;align-items:center;gap:12px;padding:12px 14px;border-top:1px solid var(--line)}
.dbrow:first-child{border-top:0}
.dchk{flex:none;width:32px;height:32px;border-radius:50%;border:2px solid var(--line);background:transparent;color:var(--on);display:grid;place-items:center;cursor:pointer;padding:0}
.dchk svg{opacity:0}
.dchk[aria-pressed="true"]{background:var(--learnt);border-color:var(--learnt)}
.dchk[aria-pressed="true"] svg{opacity:1}
.dtx{flex:1;min-width:0}
.dtx b{display:block;font-weight:600;overflow-wrap:anywhere}
.dtx small{color:var(--muted);font-size:13px}
.dbrow.cleared .dtx b{text-decoration:line-through;color:var(--muted)}
.ddel{flex:none;width:36px;height:36px;border-radius:50%;border:0;background:none;color:var(--muted);cursor:pointer;display:grid;place-items:center;padding:0}
.ddel:hover{color:var(--pyq)}
.dbcard{display:flex;align-items:center;gap:14px;width:100%;text-align:left;background:var(--surface);color:var(--ink);border:1px solid var(--line);border-radius:20px;padding:14px 16px;margin:24px 0 0;cursor:pointer;font:inherit}
.dbcard:hover{border-color:var(--revised)}
.dbcard .di{flex:none;display:grid;place-items:center;width:44px;height:44px;border-radius:14px;background:rgba(91,77,224,.12);color:var(--revised)}
.dbcard .dt{flex:1;min-width:0}
.dbcard b{display:block;font:600 17px/1.25 var(--font-d)}
.dbcard small{color:var(--muted);font-size:13px}
`;
var stl = document.createElement("style"); stl.textContent = css; document.head.appendChild(stl);

function toast(t) { document.querySelectorAll(".ttoast").forEach(function (o) { o.remove(); }); var x = document.createElement("div"); x.className = "ttoast"; x.textContent = t; document.body.appendChild(x); setTimeout(function () { x.remove(); }, 3500); }

window.Doubts = {
  open: function () { return all().filter(function (x) { return !x.x; }); },
  add: function (s, c, t) {
    var a = all(); a.push({ id: Date.now() + "-" + Math.floor(Math.random() * 100000), s: s, c: c, t: t || "Ask sir about this", d: key(new Date()), x: 0 }); save2( a);
  },
  ask: function (s, c) {
    if (document.querySelector(".dmodal")) return;
    var m = document.createElement("div"); m.className = "dmodal";
    m.innerHTML = '<div class="dcard" role="dialog" aria-modal="true" aria-label="Note a doubt"><h2>Note a doubt</h2><p class="dsub"><b>' + esc(c) + "</b><br>" + esc(s) + '</p><textarea id="dtxt" maxlength="300" placeholder="What is the doubt?"></textarea>' +
      '<div class="dchips">' + ["Ask sir about this", "Ask a friend", "Check the textbook"].map(function (q) { return '<button type="button" data-dq="' + q + '">' + q + "</button>"; }).join("") +
      '</div><div class="dbtns"><button type="button" class="dgo" data-dsave>Save doubt</button><button type="button" class="dlink" data-dcancel>Cancel</button></div></div>';
    document.body.appendChild(m);
    var ta = m.querySelector("#dtxt"); setTimeout(function () { try { ta.focus(); } catch (e) {} }, 50);
    function close() { m.remove(); document.removeEventListener("keydown", esc2); }
    function esc2(e) { if (e.key === "Escape") close(); }
    document.addEventListener("keydown", esc2);
    m.addEventListener("click", function (e) {
      var q = e.target.closest("[data-dq]");
      if (q) { var v = ta.value.trim(); ta.value = (v ? v + (/[.?!]$/.test(v) ? " " : ". ") : "") + q.dataset.dq; ta.focus(); return; }
      if (e.target === m || e.target.closest("[data-dcancel]")) { close(); return; }
      if (e.target.closest("[data-dsave]")) {
        window.Doubts.add(s, c, ta.value.trim()); close();
        toast("Doubt saved. " + window.Doubts.open().length + " open.");
        if (location.hash === "#doubts") page(); else enhance();
      }
    });
  }
};

function row(x) {
  return '<div class="dbrow' + (x.x ? " cleared" : "") + '"><button type="button" class="dchk" data-dtick="' + x.id + '" aria-pressed="' + !!x.x + '" aria-label="' + (x.x ? "Mark as not cleared" : "Mark as cleared") + '">' + TICK + '</button><span class="dtx"><b>' + esc(x.t) + "</b><small>" + esc(x.s) + ", " + esc(x.c) + ", " + ago(x.d) + '</small></span><button type="button" class="ddel" data-ddel="' + x.id + '" aria-label="Delete doubt">' + BIN + "</button></div>";
}
function page() {
  try { cur = null; view = null; } catch (e) {}
  var a = all().slice().reverse(), open = a.filter(function (x) { return !x.x; }), done = a.filter(function (x) { return x.x; });
  app.innerHTML = '<div class="subtop"><button class="back" data-backto="">' + CHEV + "Back</button>" + reloadBtn + '</div><h1 tabindex="-1">Doubts</h1><p class="lede">' + label() + ". " + open.length + " open.</p>" +
    (open.length ? '<div class="dtable">' + open.map(row).join("") + "</div>" : '<div class="empty"><b>No open doubts</b>While the study timer runs, tap Note a doubt to save a question for later. Tick it off here once it is cleared.</div>') +
    (done.length ? '<details class="oth" style="margin-top:16px"><summary><span>Cleared</span><small>' + done.length + '</small></summary><div class="dtable" style="border:0;border-radius:0">' + done.map(row).join("") + "</div></details>" : "");
}
if (typeof route === "function") {
  var _r = route;
  route = function () {
    if (typeof profile !== "undefined" && profile && location.hash === "#doubts") { page(); window.scrollTo(0, 0); return; }
    return _r.apply(this, arguments);
  };
}
document.addEventListener("click", function (e) {
  var t = e.target.closest ? e.target : null; if (!t) return;
  if (t.closest("[data-dbcard]")) { location.hash = "doubts"; return; }
  var b = t.closest("[data-dtick]");
  if (b) { var a = all(); a.forEach(function (x) { if (x.id === b.dataset.dtick) x.x = x.x ? 0 : key(new Date()); }); save2( a); page(); return; }
  b = t.closest("[data-ddel]");
  if (b && confirm("Delete this doubt?")) { save2( all().filter(function (x) { return x.id !== b.dataset.ddel; })); page(); }
});

function enhance() {
  var a = document.getElementById("app"); if (!a) return;
  var old = a.querySelector(".dbcard"), n = 0; try { n = window.Doubts.open().length; } catch (e) {}
  if (old) { if (!n) old.remove(); return; }
  if (!n) return;
  var h = Array.prototype.filter.call(a.querySelectorAll("h2"), function (x) { return x.textContent.trim() === "Subjects"; })[0]; if (!h) return;
  var b = document.createElement("button"); b.type = "button"; b.className = "dbcard"; b.setAttribute("data-dbcard", "");
  b.innerHTML = '<span class="di">' + QM + '</span><span class="dt"><b>Open doubts</b><small>' + n + " to clear</small></span>";
  h.parentNode.insertBefore(b, h);
}
var appEl = document.getElementById("app");
if (appEl) new MutationObserver(enhance).observe(appEl, { childList: true, subtree: true });
enhance();
})();
