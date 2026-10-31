// ============================================================
// JZAC ERP - Facturacion electronica (IGV, series y PSE)
// ============================================================
(function () {
  const TOKEN_KEY = 'jzac_pse_token';
  const PSE_URL = 'https://sandbox.apisunat.pe/api/v3/documents';
  const PSE_PROD = 'https://app.apisunat.pe/api/v3/documents';

  function num(v, def) {
    const n = Number(v);
    return Number.isFinite(n) ? n : def;
  }
  function dos(n) {
    return Math.round((num(n, 0) + Number.EPSILON) * 100) / 100;
  }
  function seis(n) {
    return Math.round((num(n, 0) + Number.EPSILON) * 1000000) / 1000000;
  }

  function config(u) {
    const c = u || {};
    const igv = Math.max(0, Math.min(18, num(c.igvPorcentaje, 18)));
    return {
      activo: !!c.fiscalActivo,
      ruc: String(c.ruc || '').replace(/\D/g, '').slice(0, 11),
      razonSocial: c.razonSocial || c.nombreNegocio || '',
      direccion: c.direccionFiscal || '',
      regimen: c.regimen || 'MYPE',
      igv,
      precioIncluyeIgv: c.precioIncluyeIgv !== false,
      serieFactura: c.serieFactura || 'F001',
      serieBoleta: c.serieBoleta || 'B001',
      modo: c.modoFiscal === 'lucode' ? 'lucode' : 'simulado',
      pseUrl: c.pseUrl || (c.pseProduccion ? PSE_PROD : PSE_URL),
      proxyUrl: c.pseProxyUrl || '',
      produccion: !!c.pseProduccion
    };
  }

  function token() {
    try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; }
  }
  function guardarToken(t) {
    try {
      if (t) localStorage.setItem(TOKEN_KEY, String(t).trim());
      else localStorage.removeItem(TOKEN_KEY);
    } catch (e) { /* almacenamiento no disponible */ }
  }

  // Precio bruto (con IGV) -> valor unitario sin IGV.
  function valorUnitario(precioBruto, igv) {
    return seis(num(precioBruto, 0) / (1 + igv / 100));
  }

  function calcular(items, descuento, cfg) {
    cfg = cfg || config({});
    const lista = Array.isArray(items) ? items : [];
    const bruto = lista.reduce((a, it) => a + num(it.precio, 0) * num(it.cantidad, 0), 0);
    const dsc = Math.min(bruto, Math.max(0, num(descuento, 0)));
    let total;
    let valorVenta;
    let igv;
    if (cfg.precioIncluyeIgv) {
      total = Math.max(0, bruto - dsc);
      valorVenta = total / (1 + cfg.igv / 100);
      igv = total - valorVenta;
    } else {
      const neto = Math.max(0, bruto - dsc);
      valorVenta = neto;
      igv = neto * (cfg.igv / 100);
      total = neto + igv;
    }
    return {
      bruto: dos(bruto),
      descuento: dos(dsc),
      total: dos(total),
      valorVenta: dos(valorVenta),
      igv: dos(igv)
    };
  }

  function tipoDoc(det) {
    return det && det.esPeso ? 'KGM' : 'NIU';
  }

  function payload(u, venta, det, cfg) {
    cfg = cfg || config(u);
    const lista = Array.isArray(det) ? det : [];
    const calc = calcular(lista.map((d) => ({ precio: d.precio, cantidad: d.cantidad })), venta.descuento, cfg);
    const factor = calc.bruto > 0 ? calc.total / calc.bruto : 1;
    const esFactura = !!venta.esFactura;
    const cuerpo = {
      documento: esFactura ? 'factura' : 'boleta',
      serie: esFactura ? (venta.serie || cfg.serieFactura) : (venta.serie || cfg.serieBoleta),
      numero: Number(venta.numero),
      fecha_de_emision: fechaISO(venta.fecha),
      hora_de_emision: horaISO(venta.fecha),
      moneda: 'PEN',
      tipo_operacion: '0101',
      cliente_tipo_de_documento: esFactura ? '6' : '1',
      cliente_numero_de_documento: esFactura ? (venta.ruc || '') : (venta.dni || '99999999'),
      cliente_denominacion: esFactura ? (venta.razonSocial || venta.cliente || '') : (venta.cliente || 'CLIENTE VARIOS'),
      cliente_direccion: esFactura ? (venta.direccion || '-') : '-',
      items: lista.map((d) => {
        const brutoItem = num(d.precio, 0) * factor;
        return {
          unidad_de_medida: tipoDoc(d),
          descripcion: String(d.producto || d.nombre || 'Producto'),
          cantidad: String(num(d.cantidad, 0)),
          valor_unitario: String(valorUnitario(brutoItem, cfg.igv)),
          porcentaje_igv: String(cfg.igv),
          codigo_tipo_afectacion_igv: '10',
          nombre_tributo: 'IGV'
        };
      }),
      total: calc.total.toFixed(2)
    };
    return cuerpo;
  }

  function fechaISO(ms) {
    const d = ms ? new Date(ms) : new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function horaISO(ms) {
    const d = ms ? new Date(ms) : new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':' + String(d.getSeconds()).padStart(2, '0');
  }

  function nuevoHash() {
    try {
      const b = crypto.getRandomValues(new Uint8Array(16));
      return btoa(String.fromCharCode.apply(null, b));
    } catch (e) { return 'SIM-' + Date.now(); }
  }

  async function guardarComprobante(rec) {
    const obj = { ...rec, creado: rec.creado || Date.now() };
    const id = await JZAC.db.guardar('comprobantes_sunat', obj);
    obj.id = obj.id != null ? obj.id : id;
    return obj;
  }

  async function existente(ventaId) {
    const todos = await JZAC.db.listar('comprobantes_sunat');
    return todos.find((c) => c.ventaId === ventaId) || null;
  }

  async function emitirVenta(u, venta, det) {
    const cfg = config(u);
    if (!cfg.activo || !venta) return null;
    const previo = await existente(venta.id);
    if (previo) return previo;
    const data = payload(u, venta, det, cfg);
    const base = {
      ventaId: venta.id,
      tipo: venta.esFactura ? 'factura' : 'boleta',
      serie: data.serie,
      numero: data.numero,
      fechaEmision: data.fecha_de_emision,
      modo: cfg.modo,
      payload: data
    };
    if (cfg.modo === 'simulado') {
      return guardarComprobante({
        ...base,
        estado: 'simulado',
        hash: nuevoHash(),
        xml: null,
        cdr: null,
        pdf: null,
        notas: 'Emisión simulada en el ERP. No enviada a SUNAT.'
      });
    }
    if (cfg.ruc.length !== 11) {
      return guardarComprobante({
        ...base,
        estado: 'pendiente_envio',
        notas: 'El RUC del negocio debe tener 11 dígitos para emitir con el PSE.'
      });
    }
    if (!cfg.proxyUrl && !token()) {
      return guardarComprobante({
        ...base,
        estado: 'pendiente_envio',
        notas: 'Falta configurar el proxy PSE o el token de Lucode.'
      });
    }
    try {
      const resp = await enviarPse(cfg, data);
      const p = resp && resp.payload ? resp.payload : {};
      return guardarComprobante({
        ...base,
        estado: String(p.estado || (resp && resp.success ? 'ACEPTADO' : 'ERROR')).toLowerCase(),
        hash: p.hash || '',
        xml: p.xml || '',
        cdr: p.cdr || '',
        pdf: p.pdf || null,
        notas: resp && resp.message ? resp.message : ''
      });
    } catch (e) {
      return guardarComprobante({
        ...base,
        estado: 'pendiente_envio',
        notas: e && e.message ? e.message : 'No se pudo conectar con el PSE.'
      });
    }
  }

  async function enviarPse(cfg, data) {
    const url = cfg.proxyUrl || cfg.pseUrl || (cfg.produccion ? PSE_PROD : PSE_URL);
    const headers = { 'Content-Type': 'application/json' };
    if (!cfg.proxyUrl) {
      const t = token();
      if (!t) throw new Error('Falta el token de Lucode.');
      headers.Authorization = 'Bearer ' + t;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000);
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
        signal: ctrl.signal
      });
      let json = null;
      try { json = await resp.json(); } catch (e) { json = null; }
      if (!resp.ok || !json || json.success === false) {
        throw new Error((json && json.message) || ('Error del PSE (' + resp.status + ')'));
      }
      return json;
    } finally {
      clearTimeout(timer);
    }
  }

  function etiqueta(c) {
    if (!c) return '';
    if (c.estado === 'simulado') return 'SIMULADO ' + c.serie + '-' + c.numero;
    if (c.estado === 'pendiente_envio') return 'PENDIENTE ' + c.serie + '-' + c.numero;
    if (c.estado === 'aceptado') return 'SUNAT ' + c.serie + '-' + c.numero;
    return String(c.estado || 'emitido').toUpperCase() + ' ' + c.serie + '-' + c.numero;
  }

  window.JZAC = window.JZAC || {};
  window.JZAC.fiscal = {
    PSE_URL,
    PSE_PROD,
    config,
    token,
    guardarToken,
    calcular,
    valorUnitario,
    payload,
    emitirVenta,
    etiqueta
  };
})();
