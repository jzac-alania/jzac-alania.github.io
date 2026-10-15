// ============================================================
// JZAC ERP - Licencia (validada en el servidor)
// prueba 7 dias · activacion · backend Cloudflare Worker + KV
// La clave HMAC y el PIN viven SOLO en el servidor.
// ============================================================
const LIC = {
  API: 'https://jzac-license.jzac.workers.dev',
  DIAS_PRUEBA: 7,
  CACHE: 'jzac_lic_cache',
  LEGACY: 'jzac_licencia',
  TRIAL_MAX: 'jzac_trial_max',
  DEVICE: 'jzac_device_id'
};

let _deviceId = null;

async function licFingerprint() {
  const n = window.navigator || {};
  const s = window.screen || {};
  const partes = [
    n.userAgent || '',
    n.language || '',
    (n.languages || []).join(','),
    n.platform || '',
    s.width + 'x' + s.height + 'x' + (s.colorDepth || 0) + 'x' + (s.availWidth || 0),
    new Date().getTimezoneOffset(),
    n.hardwareConcurrency || 0,
    n.deviceMemory || 0,
    n.maxTouchPoints || 0,
    LIC.DIAS_PRUEBA
  ].join('|');
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return 'd' + Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 31);
}

async function licDeviceId() {
  if (_deviceId) return _deviceId;
  if (window.__JZAC_DEVICE__) { _deviceId = window.__JZAC_DEVICE__; return _deviceId; }
  const guardado = localStorage.getItem(LIC.DEVICE);
  if (guardado) { _deviceId = guardado; return guardado; }
  const fp = await licFingerprint();
  try { localStorage.setItem(LIC.DEVICE, fp); } catch (e) { /* sin storage */ }
  _deviceId = fp;
  return fp;
}

function licLeerCache() {
  try { return JSON.parse(localStorage.getItem(LIC.CACHE) || 'null'); } catch (e) { return null; }
}

function licGuardarCache(c) {
  try { localStorage.setItem(LIC.CACHE, JSON.stringify(c)); } catch (e) { /* sin storage */ }
}

async function licApi(ruta, datos) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(LIC.API + ruta, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
      signal: ctrl.signal
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

function licEstado() {
  const c = licLeerCache();
  if (!c) return { tipo: 'prueba', inicio: null, fin: null, diasRestantes: LIC.DIAS_PRUEBA };
  if (c.tipo === 'activada') return c;
  if (c.tipo === 'vencida') return c;
  if (!c.inicio) return c;
  const ahora = Date.now();
  const previo = Number(localStorage.getItem(LIC.TRIAL_MAX) || 0);
  const maxVisto = Math.max(ahora, Number.isFinite(previo) ? previo : 0);
  if (maxVisto > previo) { try { localStorage.setItem(LIC.TRIAL_MAX, String(maxVisto)); } catch (e) { /* sin storage */ } }
  if (maxVisto > c.fin) return { tipo: 'vencida', inicio: c.inicio, fin: c.fin };
  return { tipo: 'prueba', inicio: c.inicio, fin: c.fin, diasRestantes: Math.max(0, Math.ceil((c.fin - maxVisto) / 86400000)) };
}

async function licMigrar() {
  const raw = localStorage.getItem(LIC.LEGACY);
  if (!raw) return;
  try {
    const old = JSON.parse(raw);
    if (!old || !old.nombre || !old.codigo) return;
    const r = await licApi('/activate', { deviceId: await licDeviceId(), nombre: old.nombre, codigo: old.codigo });
    if (r && r.ok) localStorage.removeItem(LIC.LEGACY);
  } catch (e) { /* sin conexion: se reintenta luego */ }
}

async function licSincronizar() {
  await licMigrar();
  try {
    const est = await licApi('/status', { deviceId: await licDeviceId() });
    if (est.tipo === 'nueva') {
      const actual = licLeerCache();
      if (actual && (actual.tipo === 'activada' || actual.inicio)) return actual;
      const c = { tipo: 'prueba', inicio: null, fin: null, diasRestantes: LIC.DIAS_PRUEBA };
      licGuardarCache(c);
      return c;
    }
    if (est.tipo === 'activada') est.valido = true;
    licGuardarCache(est);
    return est;
  } catch (e) {
    return licEstado();
  }
}

async function licIniciarPrueba() {
  try {
    const est = await licApi('/trial', { deviceId: await licDeviceId() });
    licGuardarCache(est);
    return est;
  } catch (e) {
    const c = licEstado();
    if (c.tipo === 'prueba' && !c.inicio) {
      const ahora = Date.now();
      const local = { tipo: 'prueba', inicio: ahora, fin: ahora + LIC.DIAS_PRUEBA * 86400000, diasRestantes: LIC.DIAS_PRUEBA, pendiente: true };
      licGuardarCache(local);
      return local;
    }
    return c;
  }
}

async function licActivar(nombre, codigo) {
  try {
    const r = await licApi('/activate', { deviceId: await licDeviceId(), nombre, codigo });
    if (r && r.ok) licGuardarCache({ tipo: 'activada', nombre, codigo, valido: true });
    return r;
  } catch (e) {
    return { ok: false, error: 'sin-conexion' };
  }
}

async function licGenerarCodigo(pin, nombre) {
  try {
    const r = await licApi('/generar', { pin, nombre });
    return r;
  } catch (e) {
    return { ok: false, error: 'sin-conexion' };
  }
}

window.JZAC = window.JZAC || {};
window.JZAC.lic = {
  API: LIC.API,
  DIAS_PRUEBA: LIC.DIAS_PRUEBA,
  deviceId: licDeviceId,
  estado: licEstado,
  validar: licSincronizar,
  sincronizar: licSincronizar,
  iniciarPrueba: licIniciarPrueba,
  activar: licActivar,
  generarCodigo: licGenerarCodigo,
  limpiarCache: () => localStorage.removeItem(LIC.CACHE)
};
