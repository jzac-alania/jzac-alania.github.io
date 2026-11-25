// ============================================================
// JZAC ERP - Impresora termica directa (ESC/POS por WebUSB)
// ============================================================
(function () {
  const CHOICE_KEY = 'jzac_imp_usb';
  const ON_KEY = 'jzac_imp_directa';
  const ANCHO_KEY = 'jzac_ancho_boleta';
  const SEP = '--------------------------------';

  function soporta() { return !!(typeof navigator !== 'undefined' && navigator && navigator.usb); }
  function activa() {
    try { return soporta() && localStorage.getItem(ON_KEY) === '1'; } catch (e) { return false; }
  }
  function setActiva(v) { try { localStorage.setItem(ON_KEY, v ? '1' : '0'); } catch (e) {} }
  function cols() { try { return localStorage.getItem(ANCHO_KEY) === '80' ? 48 : 32; } catch (e) { return 32; } }

  function leerEleccion() { try { return JSON.parse(localStorage.getItem(CHOICE_KEY) || 'null'); } catch (e) { return null; } }
  function guardarEleccion(d) { try { localStorage.setItem(CHOICE_KEY, JSON.stringify({ vendorId: d.vendorId, productId: d.productId, serial: d.serialNumber || '' })); } catch (e) {} }

  async function conectarPrevia() {
    if (!soporta()) return null;
    const prev = leerEleccion();
    if (!prev) return null;
    let lista = [];
    try { lista = await navigator.usb.getDevices(); } catch (e) { lista = []; }
    return lista.find((d) => d.vendorId === prev.vendorId && d.productId === prev.productId &&
      (!prev.serial || (d.serialNumber || '') === prev.serial)) || null;
  }

  async function conectar() {
    if (!soporta()) throw new Error('La impresión USB requiere Chrome o Edge.');
    const d = await navigator.usb.requestDevice({ filters: [] });
    await d.open();
    await d.close();
    guardarEleccion(d);
    return d;
  }

  function aBytes(texto) {
    const s = String(texto == null ? '' : texto).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const out = [];
    for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i) & 0xff);
    return out;
  }

  function padDer(izq, der, n) {
    izq = String(izq); der = String(der);
    let libre = n - izq.length - der.length;
    if (libre < 1) { izq = izq.slice(0, Math.max(1, n - der.length - 1)); libre = n - izq.length - der.length; }
    return izq + ' '.repeat(Math.max(0, libre)) + der;
  }

  function envolver(t, n) {
    const palabras = String(t == null ? '' : t).split(/\s+/);
    const lineas = [];
    let ln = '';
    for (const w of palabras) {
      const prueba = ln ? ln + ' ' + w : w;
      if (prueba.length > n && ln) { lineas.push(ln); ln = w; }
      else if (prueba.length > n) { lineas.push(prueba.slice(0, n)); ln = ''; }
      else ln = prueba;
    }
    if (ln) lineas.push(ln);
    return lineas.length ? lineas : [''];
  }

  function Ticket() {
    const b = [];
    const push = (...x) => b.push(...x);
    const raw = (t) => { aBytes(t).forEach((c) => push(c)); };
    return {
      init() { push(0x1B, 0x40); },
      align(m) { push(0x1B, 0x61, m === 'c' ? 1 : m === 'r' ? 2 : 0); },
      bold(on) { push(0x1B, 0x45, on ? 1 : 0); },
      size(doble) { push(0x1D, 0x21, doble ? 0x11 : 0x00); },
      line(t) { raw(t == null ? '' : t); raw('\n'); },
      feed(n) { push(0x1B, 0x64, n || 1); },
      cut() { push(0x1D, 0x56, 0x42, 0x00); },
      bytes() { return new Uint8Array(b); }
    };
  }

  function lineasBoleta(u, v, det) {
    const n = cols();
    const d = JZAC.ui.dinero;
    const t = Ticket();
    t.init();
    t.align('c'); t.bold(true); t.size(true);
    t.line(u.nombreNegocio || u.nombre || 'Mi negocio');
    t.size(false); t.bold(false);
    if (u.ruc) t.line('RUC: ' + u.ruc);
    t.line(JZAC.ui.fh(v.fecha));
    t.line(SEP);
    const tipo = v.esFactura ? 'FACTURA' : ((v.sunat || v.fiscal) ? 'BOLETA' : 'NOTA DE VENTA');
    t.bold(true); t.line(tipo + ' ' + (v.boleta || '')); t.bold(false);
    if (v.esFactura) {
      if (v.ruc) t.line('RUC: ' + v.ruc);
      t.line('Razon social: ' + (v.razonSocial || v.cliente || '-'));
    } else {
      t.line('Cliente: ' + (v.cliente || '-'));
      if (v.dni) t.line('DNI: ' + v.dni);
    }
    t.align('l');
    t.line(SEP);
    det.forEach((it) => {
      envolver(it.producto, n).forEach((l) => t.line(l));
      const izq = '  ' + JZAC.ui.n(it.cantidad) + (it.esPeso ? 'kg' : 'u') + ' x ' + d(it.precio);
      t.line(padDer(izq, d(it.total), n));
    });
    t.line(SEP);
    if (v.valorVenta != null) {
      t.line(padDer('Op. gravada', d(v.valorVenta), n));
      t.line(padDer('IGV (' + JZAC.ui.n(v.igvTasa || 18) + '%)', d(v.igv || 0), n));
    } else {
      t.line(padDer('Subtotal', d(v.subtotal), n));
    }
    if (v.descuento) t.line(padDer('Descuento', '-' + d(v.descuento), n));
    t.bold(true); t.line(padDer('TOTAL', d(v.total), n)); t.bold(false);
    if (v.recibido != null) t.line(padDer('Recibido', d(v.recibido), n));
    if (v.vuelto != null) t.line(padDer('Vuelto', d(v.vuelto), n));
    if (v.pagoSaldo != null && v.metodo2) t.line(padDer(v.metodo2, d(v.pagoSaldo), n));
    t.align('c');
    t.line('Gracias por su compra!');
    t.line('JZAC ERP');
    t.feed(3); t.cut();
    return t.bytes();
  }

  function lineasNota(u, n2, dn) {
    const n = cols();
    const d = JZAC.ui.dinero;
    const t = Ticket();
    t.init();
    t.align('c'); t.bold(true); t.size(true);
    t.line(u.nombreNegocio || u.nombre || 'Mi negocio');
    t.size(false); t.bold(false);
    if (u.ruc) t.line('RUC: ' + u.ruc);
    t.line(JZAC.ui.fh(n2.fecha));
    t.line(SEP);
    t.bold(true); t.line('NOTA DE CREDITO ' + (n2.nota || '')); t.bold(false);
    t.line('Ref: ' + (n2.boletaRef || '-'));
    t.line('Motivo: ' + (n2.motivo || '-'));
    t.align('l');
    t.line(SEP);
    dn.forEach((it) => {
      envolver(it.producto, n).forEach((l) => t.line(l));
      const tot = it.total != null ? it.total : Number(it.cantidad) * Number(it.precio);
      t.line(padDer('  ' + JZAC.ui.n(it.cantidad) + ' x ' + d(it.precio), d(tot), n));
    });
    t.line(SEP);
    t.bold(true); t.line(padDer('TOTAL DEVUELTO', d(n2.total), n)); t.bold(false);
    t.align('c'); t.line('Nota de credito · JZAC ERP');
    t.feed(3); t.cut();
    return t.bytes();
  }

  async function enviar(data) {
    const dev = await conectarPrevia();
    if (!dev) return false;
    await dev.open();
    try {
      if (!dev.configuration) { try { await dev.selectConfiguration(1); } catch (e) {} }
      const conf = dev.configuration || (dev.configurations && dev.configurations[0]);
      if (!conf || !conf.interfaces || !conf.interfaces.length) throw new Error('La impresora no expone interfaces USB.');
      const inter = conf.interfaces[0];
      await dev.claimInterface(inter.interfaceNumber);
      const alt = inter.alternate || {};
      const eps = (alt.endpoints || []).filter((e) => e.direction === 'out' && e.packetSize > 0);
      const ep = eps.find((e) => e.type === 'bulk') || eps[0];
      if (!ep) throw new Error('No se encontro un puerto de salida en la impresora.');
      for (let i = 0; i < data.length; i += 128) {
        await dev.transferOut(ep.endpointNumber, data.slice(i, i + 128));
      }
      try { await dev.releaseInterface(inter.interfaceNumber); } catch (e) {}
      return true;
    } finally {
      try { await dev.close(); } catch (e) {}
    }
  }

  async function imprimirBoleta(u, v, det) {
    try { return await enviar(lineasBoleta(u, v, det)); }
    catch (e) { console.warn('JZAC · impresion directa:', e.message || e); return false; }
  }

  async function imprimirNota(u, n, dn) {
    try { return await enviar(lineasNota(u, n, dn)); }
    catch (e) { console.warn('JZAC · impresion directa:', e.message || e); return false; }
  }

  async function probar() {
    try {
      const t = Ticket();
      t.init(); t.align('c'); t.bold(true); t.size(true);
      t.line('JZAC ERP');
      t.size(false); t.bold(false);
      t.line('Prueba de impresora');
      t.line(new Date().toLocaleString('es-PE'));
      t.line(SEP);
      t.line('Si lees esto, la impresion');
      t.line('directa por USB funciona.');
      t.feed(3); t.cut();
      return await enviar(t.bytes());
    } catch (e) { console.warn('JZAC · prueba impresora:', e.message || e); return false; }
  }

  window.JZAC = window.JZAC || {};
  window.JZAC.impresora = { soporta, activa, setActiva, conectar, probar, imprimirBoleta, imprimirNota };
})();
