/* Cover Brief: ONE optional email box — "Send me my results" + UNCHECKED "Also send me cover and launch tips".
 * Separate from the brief generator on purpose: the brief never waits on or depends on this file.
 * If this script is blocked or throws, the box stays hidden and the brief works as before.
 * Results -> Netlify Forms "cover-brief-results" (email, brief text on screen, source + campaign tags, tips yes/no).
 * Tips (only if ticked) -> existing "quillbench-waitlist" form (email, source "cover-brief[ ?utm…]"), exactly what the
 * old separate tips box sent. Sends no email itself (Sarah is notified by the site's form notification). */
(function () {
  try {
    var box = document.getElementById("rsbox"), form = document.getElementById("rs");
    var out = document.getElementById("out");
    if (!box || !form || !out || !window.fetch || !window.URLSearchParams) return;
    var btn = document.getElementById("rsbtn"), err = document.getElementById("rserr"), ok = document.getElementById("rsok");
    var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    var count = function (e) { try { window.__qbCount && window.__qbCount(e); } catch (x) {} };
    var post = function (fields) {
      return fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(fields).toString() })
        .then(function (r) { if (!r.ok) throw new Error("status " + r.status); return r; });
    };
    box.hidden = false; // #result (its parent) is still hidden until a brief is made
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      err.hidden = true;
      var email = (form.elements.email.value || "").trim();
      if (!EMAIL.test(email)) { err.textContent = "Please enter a valid email address."; err.hidden = false; return; }
      var tips = !!(form.elements.tips && form.elements.tips.checked);
      var bot = form.elements["bot-field"].value || "";
      var source = "cover-brief" + (location.search ? " " + location.search.slice(0, 120) : "");
      btn.disabled = true; btn.textContent = "Sending…";
      post({ "form-name": "cover-brief-results", "bot-field": bot, email: email, brief: (out.textContent || "").slice(0, 6000), source: source, tips: tips ? "yes" : "no" })
        .then(function () {
          form.hidden = true; form.style.display = "none"; ok.hidden = false;
          if (!tips) return;
          return post({ "form-name": "quillbench-waitlist", "bot-field": bot, email: email, source: source })
            .then(function () { count("tool_email"); })
            .catch(function () { err.textContent = "Your brief request went through, but the tips signup didn't. You can email sarah@brundigebusiness.com to join."; err.hidden = false; });
        }, function () {
          btn.disabled = false; btn.textContent = "Try again";
          err.textContent = "That didn't go through. Your brief above is fine: copy or print it, or try again.";
          err.hidden = false;
        });
    });
  } catch (e) { /* never affect the brief */ }
})();
