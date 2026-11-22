/* Hard-chapter stars (earlier slot in the plan) and "time needed today" for the plan. */
(function () {
"use strict";
function pid() { try { return ID(); } catch (e) { return "x"; } }
function ld(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
function sv(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
function hk() { return "hard:" + pid(); }
function dkey() { var d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }
var STAR = '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path class="sp" d="M10 2.6l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L2.8 7.9l5-.7z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" fill="none"/></svg>';

var css = `
.star{background:none;border:0;padding:2px;margin-right:6px;color:var(--muted);cursor:pointer;vertical-align:middle;line-height:0;opacity:.75}
.star:hover{opacity:1;color:var(--pyq)}
.star[aria-pressed="true"]{color:var(--pyq);opacity:1}
.star[aria-pressed="true"] .sp{fill:currentColor}
.hstar{color:var(--pyq);margin-right:6px;vertical-align:middle;line-height:0;display:inline-block}
.ptime{margin:0 0 10px}
`;
var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

window.HardFlags = {
  is: function (s, c) { return !!ld(hk(), {})[s + "|" + c]; },
  toggle: function (s, c) {
    var m = ld(hk(), {}), k = s + "|" + c;
    if (m[k]) delete m[k]; else m[k] = 1;
    sv(hk(), m); return !!m[k];
  }
};
window.PlanTime = {
  get: function (s, c) { var o = ld("ptime:" + pid(), {}); return o.date === dkey() && o.m ? (o.m[s + "|" + c] || 0) : 0; },
  set: function (s, c, mins) {
    var o = ld("ptime:" + pid(), {}); if (o.date !== dkey()) o = { date: dkey(), m: {} };
    o.m[s + "|" + c] = mins; sv("ptime:" + pid(), o); enhance();
  }
};

/* hard chapters come first when the plan picks chapters */
if (typeof upcoming === "function") {
  var _up = upcoming;
  upcoming = function () {
    var r = _up(), h = ld(hk(), {});
    r.forEach(function (e) { e.papers.forEach(function (p) {
      var chs = S().subjects[p.s] || [];
      p.chapters = p.chapters.slice().sort(function (a, b) {
        return (h[p.s + "|" + chs[a - 1]] ? 0 : 1) - (h[p.s + "|" + chs[b - 1]] ? 0 : 1) || a - b;
      });
    }); });
    return r;
  };
}

function fmtm(m) { var h = Math.floor(m / 60), r = m % 60; return h ? h + " h" + (r ? " " + r + " min" : "") : r + " min"; }
function enhance() {
  var h = ld(hk(), {});
  document.querySelectorAll("#app .row .chip[data-t]").forEach(function (chip) {
    var row = chip.closest(".row"); if (!row || row.querySelector(".star")) return;
    var s = chip.dataset.s || (typeof cur !== "undefined" ? cur : ""), c = chip.dataset.ch; if (!s || !c) return;
    var b = document.createElement("button"); b.type = "button"; b.className = "star";
    b.setAttribute("data-star", s + "|" + c); b.setAttribute("aria-pressed", !!h[s + "|" + c]);
    b.setAttribute("aria-label", "Mark as a hard chapter"); b.title = "Mark as hard"; b.innerHTML = STAR;
    var sp = row.firstElementChild; sp.insertBefore(b, sp.firstChild);
  });
  var total = 0, n = 0, any = false;
  document.querySelectorAll("#app .row.plan [data-plan]").forEach(function (chip) {
    any = true;
    var p = chip.dataset.plan.split("|"), row = chip.closest(".row"), hard = !!h[p[0] + "|" + p[1]];
    if (hard && !row.querySelector(".hstar")) {
      var i = document.createElement("span"); i.className = "hstar"; i.title = "Hard chapter"; i.innerHTML = STAR;
      i.querySelector(".sp").setAttribute("style", "fill:currentColor");
      row.firstElementChild.insertBefore(i, row.firstElementChild.firstChild);
    }
    if (chip.getAttribute("aria-pressed") !== "true") { n++; total += window.PlanTime.get(p[0], p[1]) || (hard ? 90 : 60); }
  });
  var gp = document.querySelector("#app [data-goplan]"), head = gp && gp.parentElement;
  if (head && any) {
    var txt = n ? "Time needed today: about " + fmtm(total) + " for " + n + " chapter" + (n > 1 ? "s" : "") + ". Based on the times you set, otherwise 1 h per chapter (1 h 30 min for starred hard ones)."
                : "All of today's plan is done.";
    var old = document.querySelector("#app .ptime");
    if (!old) { old = document.createElement("p"); old.className = "hint ptime"; head.insertAdjacentElement("afterend", old); }
    if (old.textContent !== txt) old.textContent = txt;
  }
}

document.addEventListener("click", function (e) {
  var b = e.target.closest && e.target.closest("[data-star]"); if (!b) return;
  var p = b.dataset.star.split("|"), on = window.HardFlags.toggle(p[0], p[1]);
  b.setAttribute("aria-pressed", on);
  var cu = ld("custom:" + pid(), {});
  if (cu.date !== new Date().toDateString()) { try { localStorage.removeItem("today:" + pid()); } catch (x) {} }
});

var appEl = document.getElementById("app");
if (appEl) new MutationObserver(enhance).observe(appEl, { childList: true, subtree: true });
enhance();
})();
