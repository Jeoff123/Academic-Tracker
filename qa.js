/* Shared doubts: everyone can ask, answer, upvote; the asker picks the best answer. */
(function () {
"use strict";
var C = window.Comm, F = { subject: "", unans: false }, cache = {};
var esc = C.esc;
function subjects() { var o = {}; try { Object.keys(SYLLABUS).forEach(function (k) { Object.keys(SYLLABUS[k].subjects || {}).forEach(function (s) { o[s] = 1; }); }); } catch (e) {} return Object.keys(o); }
function chaptersOf(s) { try { return S().subjects[s] || []; } catch (e) { return []; } }
function who(r) { return r.profiles && r.profiles.name ? r.profiles.name : "Student"; }

C.reg("doubts", function (body, arg) { if (arg) thread(body, arg); else feed(body); });

function feed(body) {
  body.innerHTML = '<div class="cbar"><button type="button" class="cask" data-qask>Ask a doubt</button><button type="button" class="cchip" data-qmine>My private doubts</button></div>' +
    '<div class="cchips"><button type="button" class="cchip' + (F.subject ? "" : " on") + '" data-qsub="">All</button>' + subjects().map(function (s) { return '<button type="button" class="cchip' + (F.subject === s ? " on" : "") + '" data-qsub="' + esc(s) + '">' + esc(s) + "</button>"; }).join("") + "</div>" +
    '<label class="cswitch"><input type="checkbox" id="qun"' + (F.unans ? " checked" : "") + "><span>Only unanswered</span></label><div id=\"qlist\"><p class=\"lsep\">Loading...</p></div>";
  load();
}
function load() {
  var el = document.getElementById("qlist"); if (!el) return;
  C.rest("/rest/v1/questions?select=id,subject,chapter,title,created_at,best_answer_id,user_id,profiles(name),answers(count)&order=created_at.desc&limit=60" + (F.subject ? "&subject=eq." + encodeURIComponent(F.subject) : ""), "GET").then(function (rows) {
    rows = (rows || []).filter(function (r) { return !F.unans || !(r.answers && r.answers[0] && r.answers[0].count); });
    el.innerHTML = rows.map(function (r) {
      var n = r.answers && r.answers[0] ? r.answers[0].count : 0;
      return '<button type="button" class="qcard" data-q="' + esc(r.id) + '"><b>' + esc(r.title) + (r.best_answer_id ? '<span class="qok">Solved</span>' : "") + '</b><span class="qtag">' + esc(r.subject) + (r.chapter ? ", " + esc(r.chapter) : "") + '</span><span class="qm">' + esc(who(r)) + ", " + C.ago(r.created_at) + ", " + n + " answer" + (n === 1 ? "" : "s") + "</span></button>";
    }).join("") || '<div class="empty"><b>No doubts here yet</b>Be the first to ask one.</div>';
  }).catch(function (e) { el.innerHTML = '<p class="lsep">' + esc(C.nice(e)) + "</p>"; });
}

function ask() {
  if (document.querySelector(".cmodal")) return;
  var subs = subjects(), m = document.createElement("div"); m.className = "cmodal";
  m.innerHTML = '<div class="ccard" role="dialog" aria-modal="true" aria-label="Ask a doubt"><h2>Ask a doubt</h2>' +
    '<label class="cf">Subject<select id="qs">' + subs.map(function (s) { return "<option>" + esc(s) + "</option>"; }).join("") + '</select></label>' +
    '<label class="cf">Chapter<select id="qc"></select></label>' +
    '<label class="cf">Your question<input id="qt" maxlength="150" placeholder="Short and clear"></label>' +
    '<label class="cf">Details (optional)<textarea id="qb" maxlength="2000"></textarea></label>' +
    '<button type="button" class="cgo" data-qpost>Post doubt</button><button type="button" class="cx" data-qclose>Cancel</button></div>';
  document.body.appendChild(m);
  var sel = m.querySelector("#qs"), ch = m.querySelector("#qc");
  try { var mine = Object.keys(S().subjects)[0]; if (mine && subs.indexOf(mine) > -1) sel.value = mine; } catch (e) {}
  function fill() { ch.innerHTML = chaptersOf(sel.value).map(function (c) { return "<option>" + esc(c) + "</option>"; }).join("") + '<option value="">Other or not sure</option>'; }
  sel.addEventListener("change", fill); fill();
  m.addEventListener("click", function (e) {
    if (e.target === m || e.target.closest("[data-qclose]")) { m.remove(); return; }
    if (e.target.closest("[data-qpost]")) {
      var t = m.querySelector("#qt").value.trim(); if (t.length < 3) { C.toast("Write your question first"); return; }
      var btn = e.target.closest("[data-qpost]"); btn.disabled = true;
      C.rest("/rest/v1/questions", "POST", { user_id: C.me().id, subject: sel.value, chapter: ch.value || null, title: t, body: m.querySelector("#qb").value.trim() || null })
        .then(function () { m.remove(); C.toast("Doubt posted"); load(); }).catch(function (er) { btn.disabled = false; C.toast(C.nice(er)); });
    }
  });
}

function thread(body, id) {
  body.innerHTML = '<button type="button" class="back" data-backto="community-doubts">' + CHEV + 'All doubts</button><div id="qth"><p class="lsep">Loading...</p></div>';
  var u = C.me();
  Promise.all([
    C.rest("/rest/v1/questions?select=id,subject,chapter,title,body,best_answer_id,user_id,created_at,profiles(name)&id=eq." + encodeURIComponent(id), "GET"),
    C.rest("/rest/v1/answers?select=id,body,created_at,user_id,profiles(name),answer_votes(count)&question_id=eq." + encodeURIComponent(id) + "&order=created_at.asc", "GET"),
    C.rest("/rest/v1/answer_votes?select=answer_id&user_id=eq." + u.id, "GET")
  ]).then(function (r) {
    var q = (r[0] || [])[0], el = document.getElementById("qth"); if (!el) return;
    if (!q) { el.innerHTML = '<div class="empty"><b>Not found</b>This doubt was removed.</div>'; return; }
    var mine = {}; (r[2] || []).forEach(function (v) { mine[v.answer_id] = 1; });
    var ans = (r[1] || []).map(function (a) { a.votes = a.answer_votes && a.answer_votes[0] ? a.answer_votes[0].count : 0; return a; });
    ans.sort(function (a, b) { return (b.id === q.best_answer_id) - (a.id === q.best_answer_id) || b.votes - a.votes; });
    var owner = q.user_id === u.id, adm = C.isAdmin();
    el.innerHTML = '<div class="qbox"><span class="qtag">' + esc(q.subject) + (q.chapter ? ", " + esc(q.chapter) : "") + "</span><h2>" + esc(q.title) + "</h2>" + (q.body ? "<p>" + esc(q.body) + "</p>" : "") + '<span class="qm">' + esc(who(q)) + ", " + C.ago(q.created_at) + "</span>" + (owner || adm ? '<div class="qact"><button type="button" class="qlink del" data-qdelq="' + esc(q.id) + '">Delete doubt</button></div>' : "") + "</div>" +
      '<h2 class="sec">' + ans.length + " answer" + (ans.length === 1 ? "" : "s") + "</h2>" +
      ans.map(function (a) {
        var best = a.id === q.best_answer_id;
        return '<div class="qans' + (best ? " best" : "") + '"><button type="button" class="qvote" data-qup="' + esc(a.id) + '" aria-pressed="' + !!mine[a.id] + '" aria-label="Upvote"' + (a.user_id === u.id ? " disabled" : "") + '><svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="M5 12l5-5 5 5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' + a.votes + '</button><div class="qtx"><p>' + esc(a.body) + "</p><small>" + esc(who(a)) + ", " + C.ago(a.created_at) + (best ? ' <span class="qok">Best answer</span>' : "") + '</small><div class="qact">' +
          (owner ? '<button type="button" class="qlink" data-qbest="' + esc(a.id) + '" data-q="' + esc(q.id) + '">' + (best ? "Remove best mark" : "Mark as best") + "</button>" : "") +
          (a.user_id === u.id || adm ? '<button type="button" class="qlink del" data-qdela="' + esc(a.id) + '">Delete</button>' : "") + "</div></div></div>";
      }).join("") +
      '<label class="cf" style="margin-top:12px">Your answer<textarea id="qa" maxlength="2000" placeholder="Explain step by step"></textarea></label><button type="button" class="cgo" data-qans="' + esc(q.id) + '">Post answer</button>';
  }).catch(function (e) { var el = document.getElementById("qth"); if (el) el.innerHTML = '<p class="lsep">' + esc(C.nice(e)) + "</p>"; });
}
function reopen(id) { var b = document.getElementById("cbody"); if (b) thread(b, id); }
function curId() { return (location.hash.match(/^#community-doubts-(.+)$/) || [])[1]; }

document.addEventListener("click", function (e) {
  var t = e.target.closest ? e.target : null; if (!t || !/^#community-doubts/.test(location.hash)) return;
  var b;
  if (t.closest("[data-qask]")) { ask(); return; }
  if (t.closest("[data-qmine]")) { location.hash = "doubts"; return; }
  if ((b = t.closest("[data-qsub]"))) { F.subject = b.dataset.qsub; feed(document.getElementById("cbody")); return; }
  if ((b = t.closest("[data-q]")) && !t.closest("[data-qbest]")) { location.hash = "community-doubts-" + b.dataset.q; return; }
  var id = curId(); if (!id) return;
  if ((b = t.closest("[data-qup]"))) {
    var on = b.getAttribute("aria-pressed") === "true", u = C.me();
    (on ? C.rest("/rest/v1/answer_votes?answer_id=eq." + b.dataset.qup + "&user_id=eq." + u.id, "DELETE") : C.rest("/rest/v1/answer_votes", "POST", { answer_id: b.dataset.qup, user_id: u.id })).then(function () { reopen(id); }).catch(function (er) { C.toast(C.nice(er)); });
  } else if ((b = t.closest("[data-qbest]"))) {
    var cur = b.textContent.indexOf("Remove") === 0;
    C.rest("/rest/v1/rpc/mark_best_answer", "POST", { p_question: id, p_answer: cur ? null : b.dataset.qbest }).then(function () { reopen(id); }).catch(function (er) { C.toast(C.nice(er)); });
  } else if ((b = t.closest("[data-qans]"))) {
    var ta = document.getElementById("qa"), v = ta ? ta.value.trim() : ""; if (!v) { C.toast("Write your answer first"); return; }
    b.disabled = true; C.rest("/rest/v1/answers", "POST", { question_id: id, user_id: C.me().id, body: v }).then(function () { reopen(id); }).catch(function (er) { b.disabled = false; C.toast(C.nice(er)); });
  } else if ((b = t.closest("[data-qdela]"))) {
    if (confirm("Delete this answer?")) C.rest("/rest/v1/answers?id=eq." + b.dataset.qdela, "DELETE").then(function () { reopen(id); }).catch(function (er) { C.toast(C.nice(er)); });
  } else if ((b = t.closest("[data-qdelq]"))) {
    if (confirm("Delete this doubt and its answers?")) C.rest("/rest/v1/questions?id=eq." + b.dataset.qdelq, "DELETE").then(function () { C.toast("Doubt deleted"); location.hash = "community-doubts"; }).catch(function (er) { C.toast(C.nice(er)); });
  }
});
document.addEventListener("change", function (e) { if (e.target.id === "qun") { F.unans = e.target.checked; load(); } });
window.__qa = 1;
})();
                                                                                                                       
