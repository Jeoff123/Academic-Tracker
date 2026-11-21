/* Today's plan editor: exam chapters first, then other chapters and other subjects. */
(function () {
"use strict";
var css = `
.oth{background:var(--surface);border:1px solid var(--line);border-radius:20px;margin:10px 0;overflow:hidden}
.oth summary{list-style:none;display:flex;justify-content:space-between;align-items:center;gap:10px;padding:14px 16px;font:600 17px var(--font-d);cursor:pointer}
.oth summary::-webkit-details-marker{display:none}
.oth summary small{margin-left:auto;color:var(--muted);font:400 13px var(--font-b)}
.oth summary::after{content:"";flex:none;width:9px;height:9px;border:solid var(--muted);border-width:0 2px 2px 0;transform:rotate(45deg);margin:-3px 2px 0 6px;transition:transform .15s}
.oth[open] summary::after{transform:rotate(-135deg);margin-top:3px}
.oth>div{border-top:1px solid var(--line)}
.oth .wtable{border:0;border-radius:0}
.othnote{color:var(--muted);margin:-2px 0 6px;font-size:14px}
`;
var st0 = document.createElement("style"); st0.textContent = css; document.head.appendChild(st0);
function esc(s) { return String(s).replace(/"/g, "&quot;"); }

var _pe = planEditor;
planEditor = function () {
  _pe();
  var bar = document.querySelector("#app .planbar"), ex = upcoming()[0];
  if (!bar || !ex || typeof sel === "undefined") return;
  var inExam = {}, examSubj = {};
  ex.papers.forEach(function (pp) {
    examSubj[pp.s] = 1; var chs = S().subjects[pp.s] || [];
    pp.chapters.forEach(function (n) { if (chs[n - 1]) inExam[pp.s + "|" + chs[n - 1]] = 1; });
  });
  var order = Object.keys(S().subjects).sort(function (a, b) { return (examSubj[a] ? 0 : 1) - (examSubj[b] ? 0 : 1); });
  var html = '<h2 class="sec">Other chapters and subjects</h2><p class="othnote">The exam chapters are above. Open a subject to add any other chapter to today\'s plan.</p>';
  order.forEach(function (s) {
    var rows = [], open = false;
    S().subjects[s].forEach(function (c, i) {
      var k = s + "|" + c; if (inExam[k]) return;
      var d = st(s, c), on = sel.has(k); if (on) open = true;
      var state = [d.learnt && "learnt", d.revised && "revised", d.pyq && "PYQ done"].filter(Boolean).join(", ") || "Not started";
      rows.push('<div class="row plan"><span>' + (i + 1) + ". " + c + "<small>" + state + '</small></span><button type="button" class="chip" style="--c:var(--revised)" data-pick="' + esc(k) + '" aria-pressed="' + on + '" aria-label="Add ' + esc(c) + " to today's plan\">" + CHECK + "</button></div>");
    });
    if (!rows.length) return;
    html += '<details class="oth"' + (open ? " open" : "") + "><summary><span>" + s + "</span><small>" + (examSubj[s] ? "other chapters, " : "") + rows.length + " chapter" + (rows.length > 1 ? "s" : "") + "</small></summary><div>" + rows.join("") + "</div></details>";
  });
  bar.insertAdjacentHTML("beforebegin", html);
  if (typeof countSel === "function") countSel();
};

/* save the picked chapters from any subject, exam subjects first */
savePlan = function () {
  var ex = upcoming()[0]; if (!ex) return;
  var examSubj = {}; ex.papers.forEach(function (pp) { examSubj[pp.s] = 1; });
  var keys = [];
  Object.keys(S().subjects).sort(function (a, b) { return (examSubj[a] ? 0 : 1) - (examSubj[b] ? 0 : 1); }).forEach(function (s) {
    S().subjects[s].forEach(function (c) {
      if (sel.has(s + "|" + c)) { var d = st(s, c); keys.push([s, c, !d.learnt ? "learnt" : !d.revised ? "revised" : "pyq"]); }
    });
  });
  put("custom:" + ID(), { date: new Date().toDateString(), keys: keys });
};
})();
