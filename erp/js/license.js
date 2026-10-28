// ============================================================
// JZAC ERP - Licencia firmada (7 dias de prueba)
// La clave privada y el PIN viven SOLO en el servidor.
// ============================================================
const LIC = {
  API: 'https://jzac-license.jzac.workers.dev',
  DIAS_PRUEBA: 7,
  TOKEN: 'jzac_lic_token_v3',
  LEGACY: 'jzac_licencia',
  TRIAL_MAX: 'jzac_trial_max_v3',
  DEVICE: 'jzac_device_id_v2',
  DEVICE_OLD: 'jzac_device_id',
  PUBLIC_KEY: {
    key_ops: ['verify'],
    ext: true,
    kty: 'EC',
    x: 'f-IVRGnwesW3ra6epTgl3WX35Ho3602kA2uIQHPHyg8',
    y: 'H2iWwgP351fXRuOAd1f1OBOsSSvBFu4RXabh9H6CbSw',
    crv: 'P-256'
  }
};

let _deviceId = null;
let _payload = null;
let _clave = null;

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
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(partes));
  return 'd' + Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 31);
}

async function licDeviceId() {
  if (_deviceId) return _deviceId;
  if (window.__JZAC_DEVICE__) { _deviceId = window.__JZAC_DEVICE__; return _deviceId; }
  const guardado = localStorage.getItem(LIC.DEVICE);
  if (guardado) { _deviceId = guardado; return guardado; }
  if (localStorage.getItem(LIC.DEVICE_OLD)) localStorage.removeItem(LIC.DEVICE_OLD);
  const fp = await licFingerprint();
  try { localStorage.setItem(LIC.DEVICE, fp); } catch (e) { /* sin storage */ }
  _deviceId = fp;
  return fp;
}

function licNorm(s) {
  return String(s || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function licCorreo(correo) {
  return String(correo || '').trim().toLowerCase();
}

function licClave(u) {
  return licNorm(u && u.nombreNegocio) + '|' + licCorreo(u && u.correo);
}

function licUsuario(nombre, correo) {
  return { nombreNegocio: nombre || '', correo: correo || '' };
}

function licTokenKey(u) { return LIC.TOKEN + ':' + licClave(u); }
function licTrialKey(u) { return LIC.TRIAL_MAX + ':' + licClave(u); }

function b64urlBytes(buf) {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(texto) {
  let s = String(texto || '').replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function licVerificarToken(token) {
  const partes = String(token || '').split('.');
  if (partes.length !== 2) return null;
  try {
    const llave = window.__JZAC_LIC_PUBLIC_KEY__ || LIC.PUBLIC_KEY;
    const key = await crypto.subtle.importKey('jwk', llave, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    const ok = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      b64urlDecode(partes[1]),
      new TextEncoder().encode(partes[0])
    );
    if (!ok) return null;
    return JSON.parse(new TextDecoder().decode(b64urlDecode(partes[0])));
  } catch (e) {
    return null;
  }
}

function licTokenCoincide(p, u, deviceId) {
  if (!p || p.v !== 1) return false;
  if (String(p.deviceId || '') !== String(deviceId || '')) return false;
  if (licNorm(p.nombre) !== licNorm(u && u.nombreNegocio)) return false;
  if (licCorreo(p.correo) !== licCorreo(u && u.correo)) return false;
  return true;
}

function licGuardarToken(token, u) {
  try { localStorage.setItem(licTokenKey(u), token); } catch (e) { /* sin storage */ }
}

function licBorrarToken(u) {
  try { localStorage.removeItem(licTokenKey(u)); } catch (e) { /* sin storage */ }
}

async function licApi(ruta, datos) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);
  try {
    const base = window.__JZAC_LIC_API__ || LIC.API;
    const r = await fetch(base + ruta, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
      signal: ctrl.signal
    });
    if (!r.ok && r.status !== 429 && r.status !== 401) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

function licEstado(u) {
  const clave = u ? licClave(u) : _clave;
  if (!_payload || clave !== _clave) return { tipo: 'prueba', inicio: null, fin: null, diasRestantes: LIC.DIAS_PRUEBA };
  if (_payload.tipo === 'vencida' || _payload.tipo === 'bloqueada') return { ..._payload };
  if (_payload.tipo === 'activada') {
    if (_payload.exp && Date.now() > _payload.exp) return { tipo: 'vencida', inicio: _payload.inicio, exp: _payload.exp };
    return { tipo: 'activada', nombre: _payload.nombre, correo: _payload.correo, inicio: _payload.inicio, exp: _payload.exp };
  }
  if (_payload.tipo !== 'prueba') return { tipo: 'prueba', inicio: null, fin: null, diasRestantes: LIC.DIAS_PRUEBA };
  const ahora = Date.now();
  if (ahora > _payload.fin || ahora > _payload.exp) return { tipo: 'vencida', inicio: _payload.inicio, fin: _payload.fin };
  const tkey = licTrialKey(u || licUsuario(_payload.nombre, _payload.correo));
  const previo = Number(localStorage.getItem(tkey) || 0);
  const maxVisto = Math.max(ahora, Number.isFinite(previo) ? previo : 0);
  if (maxVisto > previo) { try { localStorage.setItem(tkey, String(maxVisto)); } catch (e) { /* sin storage */ } }
  if (maxVisto > _payload.fin) return { tipo: 'vencida', inicio: _payload.inicio, fin: _payload.fin };
  const dias = Math.max(0, Math.min(LIC.DIAS_PRUEBA, Math.ceil((_payload.fin - maxVisto) / 86400000)));
  return { tipo: 'prueba', inicio: _payload.inicio, fin: _payload.fin, diasRestantes: dias };
}

async function licInicializar(u) {
  if (!u) u = licUsuario('', '');
  const deviceId = await licDeviceId();
  const clave = licClave(u);
  _clave = clave;
  const token = localStorage.getItem(licTokenKey(u));
  if (!token) {
    _payload = null;
    return licEstado(u);
  }
  const p = await licVerificarToken(token);
  if (!p || !licTokenCoincide(p, u, deviceId)) {
    licBorrarToken(u);
    _payload = null;
    return licEstado(u);
  }
  _payload = p;
  if (_payload.tipo === 'prueba' && (Date.now() > _payload.fin || Date.now() > _payload.exp)) {
    licBorrarToken(u);
    _payload = { tipo: 'vencida', inicio: _payload.inicio, fin: _payload.fin };
  } else if (_payload.tipo === 'activada' && _payload.exp && Date.now() > _payload.exp) {
    licBorrarToken(u);
    _payload = { tipo: 'vencida', inicio: _payload.inicio, exp: _payload.exp };
  }
  return licEstado(u);
}

async function licMigrar(u) {
  const raw = localStorage.getItem(LIC.LEGACY);
  if (!raw) return;
  try {
    const old = JSON.parse(raw);
    if (!old || !old.nombre || !old.codigo) return;
    const r = await licActivar(old.nombre, old.codigo, (u && u.correo) || old.correo || '');
    if (r && r.ok) localStorage.removeItem(LIC.LEGACY);
  } catch (e) { /* sin conexion: se reintenta luego */ }
}

async function licSincronizar(u) {
  await licInicializar(u);
  await licMigrar(u);
  try {
    const est = await licApi('/status', {
      deviceId: await licDeviceId(),
      nombre: (u && u.nombreNegocio) || '',
      correo: (u && u.correo) || ''
    });
    if (est && est.token) {
      const p = await licVerificarToken(est.token);
      if (p && licTokenCoincide(p, u, await licDeviceId())) {
        licGuardarToken(est.token, u);
        _payload = p;
        _clave = licClave(u);
        return licEstado(u);
      }
    }
    if (est && (est.tipo === 'vencida' || est.tipo === 'bloqueada')) {
      licBorrarToken(u);
      _payload = { ...est };
      _clave = licClave(u);
      return licEstado(u);
    }
    if (est && est.tipo === 'nueva') {
      licBorrarToken(u);
      _payload = null;
      _clave = licClave(u);
      return licEstado(u);
    }
    return licEstado(u);
  } catch (e) {
    return licEstado(u);
  }
}

async function licIniciarPrueba(nombre, correo, telefono) {
  const u = licUsuario(nombre, correo);
  try {
    const est = await licApi('/trial', { deviceId: await licDeviceId(), nombre: nombre || '', correo: correo || '', telefono: telefono || '' });
    if (est && est.token) {
      const p = await licVerificarToken(est.token);
      if (p && licTokenCoincide(p, u, await licDeviceId())) {
        licGuardarToken(est.token, u);
        _payload = p;
        _clave = licClave(u);
        return licEstado(u);
      }
    }
    if (est && (est.tipo === 'vencida' || est.tipo === 'bloqueada')) {
      licBorrarToken(u);
      _payload = { ...est };
      _clave = licClave(u);
      return licEstado(u);
    }
    return { tipo: 'error', error: (est && est.error) || 'respuesta-invalida' };
  } catch (e) {
    return { tipo: 'error', error: 'sin-conexion' };
  }
}

async function licActivar(nombre, codigo, correo) {
  const u = licUsuario(nombre, correo);
  try {
    const r = await licApi('/activate', { deviceId: await licDeviceId(), nombre, codigo, correo: correo || '' });
    if (r && r.ok && r.token) {
      const p = await licVerificarToken(r.token);
      if (p && licTokenCoincide(p, u, await licDeviceId())) {
        licGuardarToken(r.token, u);
        _payload = p;
        _clave = licClave(u);
      }
    }
    return r;
  } catch (e) {
    return { ok: false, error: 'sin-conexion' };
  }
}

async function licGenerarCodigo(pin, nombre) {
  try {
    return await licApi('/generar', { pin, nombre });
  } catch (e) {
    return { ok: false, error: 'sin-conexion' };
  }
}

async function licLiberar(pin, nombre, correo) {
  try {
    return await licApi('/liberar', { pin, nombre, correo });
  } catch (e) {
    return { ok: false, error: 'sin-conexion' };
  }
}

function licPuedeEscribir() {
  if (!_payload) return false;
  const ahora = Date.now();
  if (_payload.tipo === 'activada') return !_payload.exp || ahora <= _payload.exp;
  if (_payload.tipo === 'prueba') return ahora <= Number(_payload.fin || 0) && (!_payload.exp || ahora <= _payload.exp);
  return false;
}

window.JZAC = window.JZAC || {};
window.JZAC.lic = {
  API: LIC.API,
  DIAS_PRUEBA: LIC.DIAS_PRUEBA,
  deviceId: licDeviceId,
  inicializar: licInicializar,
  estado: licEstado,
  validar: licSincronizar,
  sincronizar: licSincronizar,
  iniciarPrueba: licIniciarPrueba,
  activar: licActivar,
  generarCodigo: licGenerarCodigo,
  liberar: licLiberar,
  puedeEscribir: licPuedeEscribir,
  limpiarCache: (u) => {
    try {
      if (u) {
        localStorage.removeItem(licTokenKey(u));
        localStorage.removeItem(licTrialKey(u));
      } else {
        Object.keys(localStorage).filter((k) => k.indexOf(LIC.TOKEN + ':') === 0 || k.indexOf(LIC.TRIAL_MAX + ':') === 0).forEach((k) => localStorage.removeItem(k));
      }
    } catch (e) { /* sin storage */ }
  }
};
