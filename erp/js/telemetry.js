// ============================================================
// JZAC ERP - Telemetria de errores (best-effort, sin datos personales)
// ============================================================
(function () {
  const URL = 'https://jzac-landing-analytics.jzac.workers.dev/e';
  const MAX = 8;
  let enviados = 0;
  const vistos = new Set();

  function permitido() {
    try {
      if (/^(localhost|127\.0\.0\.1|::1)$/.test(location.hostname)) return false;
      if (navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.globalPrivacyControl === true) return false;
      return true;
    } catch (e) { return false; }
  }

  function enviar(msg, stack) {
    try {
      if (!permitido() || enviados >= MAX) return;
      const m = String(msg || 'Error').slice(0, 300);
      const firma = m + '|' + String(stack || '').slice(0, 80);
      if (vistos.has(firma)) return;
      vistos.add(firma);
      enviados++;
      const cuerpo = JSON.stringify({
        t: 'err',
        msg: m,
        stack: String(stack || '').slice(0, 900),
        ruta: (location.hash || location.pathname || '').slice(0, 80),
        ua: navigator.userAgent
      });
      if (navigator.sendBeacon) {
        navigator.sendBeacon(URL, new Blob([cuerpo], { type: 'text/plain;charset=UTF-8' }));
      }
    } catch (e) { /* nunca romper la app */ }
  }

  window.addEventListener('error', (e) => {
    if (e && e.target && e.target !== window && e.target.tagName) return;
    enviar(e && e.message, e && e.error && e.error.stack);
  });
  window.addEventListener('unhandledrejection', (e) => {
    const r = e && e.reason;
    enviar(r && r.message ? r.message : r, r && r.stack);
  });

  window.JZAC = window.JZAC || {};
  window.JZAC.telemetria = { enviar };
})();
