/* Quillbench visit counter: no cookies and nothing saved in your browser. Sends the page, referrer and campaign tags; the server keeps a one-day visitor code, never the IP address. Details: /privacy */
(function () {
  try {
    if (/bot|crawl|spider|slurp|headless|lighthouse|preview/i.test(navigator.userAgent)) return;
    var send = function (e) {
      var d = JSON.stringify({ p: location.pathname, q: location.search.slice(0, 200), r: document.referrer.slice(0, 200), e: e || "view" });
      if (navigator.sendBeacon) navigator.sendBeacon("/.netlify/functions/hit", new Blob([d], { type: "text/plain" }));
      else fetch("/.netlify/functions/hit", { method: "POST", body: d, keepalive: true });
    };
    send("view");
    var buy = document.getElementById("buy");
    if (buy) buy.addEventListener("click", function () { send("checkout_click"); });
    window.__qbCount = send;
  } catch (e) {}
})();
