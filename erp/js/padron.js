// ============================================================
// JZAC ERP - Consulta DNI/RUC con cache local
// RUC: OpenRUC (gratuito, sin token)
// DNI: Peru API (plan gratuito, token configurado en Ajustes)
// ============================================================
(function () {
  const CACHE_KEY = 'jzac_padron_cache_v1';
  const TOKEN_KEY = 'jzac_padron_dni_token';
  const DIAS = 30;

  function leerCache() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch (e) { return {}; }
  }

  function guardarCache(clave, datos) {
    const cache = leerCache();
    cache[clave] = { datos, ts: Date.now() };
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch (e) { /* cuota llena */ }
  }

  function validaRuc(ruc) {
    if (!/^\d{11}$/.test(ruc)) return false;
    if (!['10', '15', '16', '17', '20'].includes(ruc.slice(0, 2))) return false;
    const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    let suma = 0;
    for (let i = 0; i < 10; i++) suma += Number(ruc[i]) * pesos[i];
    const resto = 11 - (suma % 11);
    const digito = resto === 10 ? 0 : resto === 11 ? 1 : resto;
    return digito === Number(ruc[10]);
  }

  function token() {
    try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; }
  }

  function guardarToken(valor) {
    try {
      if (valor) localStorage.setItem(TOKEN_KEY, valor.trim());
      else localStorage.removeItem(TOKEN_KEY);
    } catch (e) { /* modo privado */ }
  }

  async function consultar(tipo, numero) {
    tipo = String(tipo || '').toLowerCase();
    numero = String(numero || '').replace(/\D/g, '');
    if (tipo === 'ruc' && !validaRuc(numero)) throw new Error('RUC inválido');
    if (tipo === 'dni' && !/^\d{8}$/.test(numero)) throw new Error('El DNI debe tener 8 dígitos');
    const clave = tipo + ':' + numero;
    const cache = leerCache();
    if (cache[clave] && Date.now() - cache[clave].ts < DIAS * 86400000) {
      return { ...cache[clave].datos, fuente: 'cache' };
    }
    let datos;
    if (tipo === 'ruc') {
      let res;
      try { res = await fetch('https://openruc.com/api/ruc/' + numero); }
      catch (e) { throw new Error('Sin conexión con OpenRUC. Revisa tu internet.'); }
      if (res.status === 404) throw new Error('No se encontró el RUC');
      if (!res.ok) throw new Error('OpenRUC no está disponible (' + res.status + ')');
      const d = await res.json();
      if (!d || !d.razon_social) throw new Error('No se encontró el RUC');
      datos = {
        tipo, numero,
        nombre: null,
        razonSocial: d.razon_social,
        direccion: d.direccion || '',
        estado: d.estado || '',
        condicion: d.condicion || '',
        fuente: 'openruc'
      };
    } else {
      const t = token();
      if (!t) throw new Error('Configura el token de DNI en Ajustes para consultar automáticamente');
      let res;
      try {
        res = await fetch('https://peruapi.com/api/dni/' + numero + '?api_token=' + encodeURIComponent(t), { headers: { Accept: 'application/json' } });
      } catch (e) {
        throw new Error('El proveedor de DNI no permite consultas desde el navegador. Escribe el nombre manualmente.');
      }
      if (res.status === 401 || res.status === 403) throw new Error('Token de DNI inválido o sin permiso');
      if (res.status === 429) throw new Error('Límite mensual de consultas DNI alcanzado');
      if (res.status === 404) throw new Error('No se encontró el DNI');
      if (!res.ok) throw new Error('Perú API no está disponible (' + res.status + ')');
      const d = await res.json();
      const info = d.data || d;
      const nombre = (info.cliente || [info.nombres, info.apellido_paterno, info.apellido_materno].filter(Boolean).join(' ')).trim();
      if (!nombre) throw new Error('No se encontró el DNI');
      datos = { tipo, numero, nombre, razonSocial: null, direccion: '', estado: '', condicion: '', fuente: 'peruapi' };
    }
    guardarCache(clave, datos);
    return datos;
  }

  function limpiarCache() {
    try { localStorage.removeItem(CACHE_KEY); } catch (e) { /* nada */ }
  }

  window.JZAC = window.JZAC || {};
  JZAC.padron = { consultar, token, guardarToken, limpiarCache, validaRuc };
})();
