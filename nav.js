/* Bottom navigation bar: Home, Week, Timetable, Study log, Community. */
(function () {
"use strict";
var NAVH = 62;
function ic(d) { return '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + d + "</svg>"; }
var TABS = [
  { id: "home", label: "Home", svg: ic('<path d="M4 11l8-7 8 7"/><path d="M6 10v9h12v-9"/><path d="M10 19v-5h4v5"/>') },
  { id: "week", label: "Week", svg: ic('<path d="M9 7h10M9 12h10M9 17h10"/><circle cx="5" cy="7" r="1"/><circle cx="5" cy="12" r="1"/><circle cx="5" cy="17" r="1"/>') },
  { id: "timetable", label: "Timetable", svg: ic('<rect x="4" y="5.5" width="16" height="14" rx="3"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>') },
  { id: "community", label: "Community", svg: ic('<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.5-3.3 2.8-5 5.5-5s5 1.7 5.5 5"/><circle cx="17" cy="9" r="2.4"/><path d="M16 14.2c2.4.2 4 1.7 4.5 4.3"/>') },
  { id: "log", label: "Study log", svg: ic('<path d="M6 19V11M12 19V5M18 19v-6"/>') }
];

var css = `
#bnav{position:fixed;left:0;right:0;bottom:0;z-index:60;background:var(--surface);border-top:1px solid var(--line);padding-bottom:env(safe-area-inset-bottom,0px)}
#bnav .bn-in{display:grid;grid-template-columns:repeat(5,1fr);max-width:560px;margin:0 auto;height:62px;padding:0 6px}
#bnav button{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;background:none;border:0;color:var(--muted);font:600 11.5px var(--font-b);cursor:pointer;padding:0;min-width:0}
#bnav .bn-ic{display:grid;place-items:center;width:52px;height:30px;border-radius:999px;transition:background .15s,color .15s}
#bnav button[aria-current="page"]{color:var(--revised)}
#bnav button[aria-current="page"] .bn-ic{background:rgba(91,77,224,.14);background:color-mix(in srgb,var(--revised) 14%,transparent)}
#bnav button:active .bn-ic{transform:scale(.94)}
body.has-nav{padding-bottom:calc(var(--navh,0px) + 28px + env(safe-area-inset-bottom,0px))}
body.has-nav.has-timer{padding-bottom:calc(var(--navh,0px) + 200px + env(safe-area-inset-bottom,0px))}
body.has-nav .ttlink,body.has-nav .logbtn,body.has-nav .dbcard{display:none}
#bnav .bn-ic{position:relative}
#bnav .bn-b{position:absolute;top:-4px;right:4px;min-width:17px;height:17px;padding:0 4px;border-radius:999px;background:var(--pyq);color:var(--on);font:700 10.5px/17px var(--font-b);text-align:center;font-style:normal}
#bnav .bn-b[hidden]{display:none}
h2.sec{scroll-margin-top:12px}
@media (prefers-reduced-motion:reduce){#bnav .bn-ic{transition:none}}
`;
var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

var nav = document.createElement("nav");
nav.id = "bnav"; nav.setAttribute("aria-label", "Main");
nav.innerHTML = '<div class="bn-in">' + TABS.map(function (t) {
  return '<button type="button" data-nav="' + t.id + '"><span class="bn-ic">' + t.svg + (t.id === "community" ? '<i class="bn-b" hidden></i>' : "") + "</span><span>" + t.label + "</span></button>";
}).join("") + "</div>";
document.body.appendChild(nav);

function active() {
  var h = location.hash.replace("#", "");
  if (h === "timetable" || h.indexOf("exam-") === 0) return "timetable";
  if (h === "stats") return "log";
  if (h === "doubts" || h.indexOf("community") === 0) return "community";
  if (h.indexOf("week") === 0) return "week";
  return "home";
}
function sync() {
  var on = false;
  try { on = typeof profile !== "undefined" && !!profile; } catch (e) {}
  nav.style.display = on ? "" : "none";
  document.body.classList.toggle("has-nav", on);
  document.documentElement.style.setProperty("--navh", on ? NAVH + "px" : "0px");
  var cnt = 0; try { cnt = window.Comm ? window.Comm.unread() : 0; } catch (e) {}
  var bd = nav.querySelector('[data-nav="community"] .bn-b'); if (bd) { bd.textContent = cnt > 99 ? "99+" : cnt; bd.hidden = !cnt; }
  var a = active();
  nav.querySelectorAll("button").forEach(function (b) {
    if (b.dataset.nav === a) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
  });
}
nav.addEventListener("click", function (e) {
  var b = e.target.closest("button[data-nav]"); if (!b) return;
  var id = b.dataset.nav, h = location.hash.replace("#", "");
  if (id === "home") { if (h) location.hash = ""; else window.scrollTo({ top: 0, behavior: "smooth" }); }
  else if (id === "week") location.hash = "week";
  else if (id === "timetable") location.hash = "timetable";
  else if (id === "log") location.hash = "stats";
  else if (id === "community") location.hash = "community";
});
window.addEventListener("hashchange", sync);
window.addEventListener("doubts", sync);
document.addEventListener("commchange", sync);
var appEl = document.getElementById("app");
if (appEl) new MutationObserver(sync).observe(appEl, { childList: true, subtree: true });
sync();
})();
