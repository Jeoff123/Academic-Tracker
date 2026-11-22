/* Streak badges (3, 7, 30 days) and an encouraging message when the day's plan is finished. */
(function () {
"use strict";
function pid() { try { return ID(); } catch (e) { return "x"; } }
function ld(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
function sv(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
function pad(n) { return (n < 10 ? "0" : "") + n; }
function key(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
function BK() { return "badges:" + pid(); }
var LEVELS = [3, 7, 30], COL = { 3: "var(--pyq)", 7: "var(--learnt)", 30: "var(--revised)" };
var MSG = {
  3: "Three days in a row. A good habit is starting.",
  7: "A full week of studying. Your consistency is paying off.",
  30: "Thirty days in a row. That is real discipline. Be proud of yourself."
};
var CHEER = [
  "Today's plan is done. Well done!",
  "All finished for today. Proud of you!",
  "Plan complete. Rest well, you earned it.",
  "That is today done. Small steps add up.",
  "Every chapter ticked. Great work today!"
];

var css = `
.cmodal{position:fixed;inset:0;z-index:96;background:rgba(10,15,30,.55);display:grid;place-items:center;padding:16px}
.ccard{background:var(--surface);color:var(--ink);border-radius:26px;padding:26px 22px;max-width:380px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.35)}
.cbadge{width:104px;height:104px;border-radius:50%;margin:0 auto 14px;display:grid;place-items:center;background:var(--c);color:var(--on);font:700 44px var(--font-d);box-shadow:0 0 0 8px rgba(127,127,127,.15)}
.ccard h2{font-size:24px;margin:0 0 6px}
.ccard p{color:var(--muted);margin:0 0 18px;line-height:1.45}
.ccard button{width:100%;min-height:48px;border:0;border-radius:14px;background:var(--revised);color:var(--on);font:600 16px var(--font-b);cursor:pointer}
.badges{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:14px 0 4px}
.bdg{background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:14px 8px;text-align:center;min-width:0}
.bdg .bn{width:54px;height:54px;border-radius:50%;margin:0 auto 8px;display:grid;place-items:center;background:var(--track);color:var(--muted);font:700 22px var(--font-d)}
.bdg b{display:block;font-size:13.5px;font-weight:600}
.bdg small{color:var(--muted);font-size:12px}
.bdg.on .bn{background:var(--c);color:var(--on)}
.bdg:not(.on){opacity:.75}
.ctoast{position:fixed;top:calc(16px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);background:var(--learnt);color:var(--on);padding:11px 18px;border-radius:14px;z-index:121;max-width:90%;font-weight:600;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,.25)}
`;
var stl = document.createElement("style"); stl.textContent = css; document.head.appendChild(stl);

function celebrate(n) {
  var m = document.createElement("div"); m.className = "cmodal";
  m.innerHTML = '<div class="ccard" role="dialog" aria-modal="true" aria-label="Badge earned"><div class="cbadge" style="--c:' + COL[n] + '">' + n + "</div><h2>" + n + "-day streak!</h2><p>" + MSG[n] + '</p><button type="button">Keep going</button></div>';
  m.addEventListener("click", function (e) { if (e.target === m || e.target.tagName === "BUTTON") m.remove(); });
  document.body.appendChild(m);
}
function check() {
  if (!window.StudyLog || !window.StudyLog.streak) return;
  var sr = window.StudyLog.streak().cur, e = ld(BK(), {}), hi = 0;
  LEVELS.forEach(function (k) { if (sr >= k && !e[k]) { e[k] = key(new Date()); hi = k; } });
  if (hi) { sv(BK(), e); celebrate(hi); }
}
if (window.StudyLog) {
  var _add = window.StudyLog.add;
  window.StudyLog.add = function () { _add.apply(this, arguments); setTimeout(check, 60); };
}

function enhance() {
  var a = document.getElementById("app"); if (!a) return;
  var sc = a.querySelector(".streak");
  if (sc && !a.querySelector(".badges") && window.StudyLog && window.StudyLog.streak) {
    var cur = window.StudyLog.streak().cur, e = ld(BK(), {}), box = document.createElement("div");
    box.className = "badges";
    box.innerHTML = LEVELS.map(function (k) {
      var on = !!e[k] || cur >= k;
      return '<div class="bdg' + (on ? " on" : "") + '" style="--c:' + COL[k] + '"><div class="bn">' + k + "</div><b>" + k + "-day streak</b><small>" + (on ? "Earned" : (k - cur) + " day" + (k - cur === 1 ? "" : "s") + " to go") + "</small></div>";
    }).join("");
    sc.insertAdjacentElement("afterend", box);
  }
  var rows = a.querySelectorAll(".row.plan [data-plan]");
  if (rows.length && Array.prototype.every.call(rows, function (r) { return r.getAttribute("aria-pressed") === "true"; })) {
    var today = new Date().toDateString(), c = ld("cheer:" + pid(), {});
    if (c.d !== today) {
      sv("cheer:" + pid(), { d: today });
      var t = document.createElement("div"); t.className = "ctoast"; t.textContent = CHEER[new Date().getDate() % CHEER.length];
      document.body.appendChild(t); setTimeout(function () { t.remove(); }, 5000);
    }
  }
}
var appEl = document.getElementById("app");
if (appEl) new MutationObserver(enhance).observe(appEl, { childList: true, subtree: true });
enhance();
window.__reward = 1;
})();
