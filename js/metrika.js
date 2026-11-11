(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get("nometrika") === "1" || params.get("no_metrika") === "1") {
    window.reachGoal = () => {};
    window.trackGoal = () => {};
    return;
  }

  const METRIKA_ID = 114193275;

  const ensureCounter = () => {
    if (typeof window.ym === "function") return;
    (function (m, e, t, r, i, k, a) {
      m[i] =
        m[i] ||
        function () {
          (m[i].a = m[i].a || []).push(arguments);
        };
      m[i].l = 1 * new Date();
      for (let j = 0; j < document.scripts.length; j++) {
        if (document.scripts[j].src === r) return;
      }
      (k = e.createElement(t)),
        (a = e.getElementsByTagName(t)[0]),
        (k.async = 1),
        (k.src = r),
        a.parentNode.insertBefore(k, a);
    })(window, document, "script", `https://mc.yandex.ru/metrika/tag.js?id=${METRIKA_ID}`, "ym");

    window.ym(METRIKA_ID, "init", {
      ssr: true,
      webvisor: true,
      clickmap: true,
      ecommerce: "dataLayer",
      referrer: document.referrer,
      url: location.href,
      accurateTrackBounce: true,
      trackLinks: true,
    });
  };

  ensureCounter();

  const reachGoal = (name, goalParams) => {
    try {
      if (typeof ym !== "function" || !name) return;
      if (goalParams) ym(METRIKA_ID, "reachGoal", name, goalParams);
      else ym(METRIKA_ID, "reachGoal", name);
    } catch (_) {
      /* ignore */
    }
  };

  const trackGoal = (names, goalParams) => {
    const list = Array.isArray(names) ? names : [names];
    list.forEach((name) => reachGoal(name, goalParams));
  };

  window.reachGoal = reachGoal;
  window.trackGoal = trackGoal;
})();
