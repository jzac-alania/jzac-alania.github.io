// ============================================================
// JZAC ERP - Corte de caja (arqueo del día)
// ============================================================
(function () {
  const CLAVE = 'jzac_cortes_caja';
  const r2 = (n) => Math.round(Number(n || 0) * 100) / 100;

  function leer() {
    try { return JSON.parse(localStorage.getItem(CLAVE) || '[]'); } catch (e) { return []; }
  }
  function escribir(lista) {
    localStorage.setItem(CLAVE, JSON.stringify(lista));
  }
  window.JZAC = window.JZAC || {};
  window.JZAC.cortes = { leer, escribir };

  const diaDe = (ms) => { const d = new Date(ms); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };

  // Reparto de una venta por canal de cobro: en una venta mixta el efectivo
  // y el otro medio (Yape, tarjeta...) van por separado.
  function canales(v) {
    if (v.pagoEfectivo != null && v.pagoSaldo != null) {
      return [['Efectivo', Number(v.pagoEfectivo)], [v.metodo2 || 'Otro', Number(v.pagoSaldo)]];
    }
    return [[v.metodoPago || 'Efectivo', Number(v.total || 0)]];
  }

  const efectivoDe = (v) => canales(v)
    .filter((c) => /efectivo/i.test(c[0]))
    .reduce((a, c) => a + c[1], 0);

  async function calcular(desde, hasta) {
    const ventas = (await JZAC.db.listar('ventas')).filter((v) => v.fecha >= desde && v.fecha <= hasta);
    const pagos = (await JZAC.db.listar('pagos_fiado')).filter((p) => p.fecha >= desde && p.fecha <= hasta);
    const gastos = (await JZAC.db.listar('gastos')).filter((g) => g.fecha >= desde && g.fecha <= hasta);

    const porMetodo = {};
    let efectivoVentas = 0;
    ventas.forEach((v) => {
      efectivoVentas += efectivoDe(v);
      canales(v).forEach((c) => {
        porMetodo[c[0]] = porMetodo[c[0]] || { mov: 0, total: 0 };
        porMetodo[c[0]].mov += 1;
        porMetodo[c[0]].total += c[1];
      });
    });

    let cobrosEfectivo = 0;
    let cobrosOtros = 0;
    pagos.forEach((p) => {
      if (/efectivo/i.test(p.metodo || 'Efectivo')) cobrosEfectivo += Number(p.monto || 0);
      else cobrosOtros += Number(p.monto || 0);
    });

    const gastoTotal = gastos.reduce((a, g) => a + Number(g.monto || 0), 0);
    const totalVentas = ventas.reduce((a, v) => a + Number(v.total || 0), 0);

    return {
      desde, hasta,
      nVentas: ventas.length,
      totalVentas: r2(totalVentas),
      efectivoVentas: r2(efectivoVentas),
      porMetodo: Object.entries(porMetodo)
        .map(([metodo, x]) => ({ metodo, mov: x.mov, total: r2(x.total) }))
        .sort((a, b) => b.total - a.total),
      nCobros: pagos.length,
      cobrosEfectivo: r2(cobrosEfectivo),
      cobrosOtros: r2(cobrosOtros),
      cobrosTotal: r2(cobrosEfectivo + cobrosOtros),
      nGastos: gastos.length,
      gastoTotal: r2(gastoTotal),
      // lo que la caja deberia tener antes de contar (sin fondo inicial)
      entradas: r2(efectivoVentas + cobrosEfectivo),
      salidas: r2(gastoTotal)
    };
  }

  function esperadoConFondo(r, fondo) {
    return r2(Number(fondo || 0) + r.entradas - r.salidas);
  }

  function desgloseHTML(r, fondo) {
    const filas = [
      ['Fondo inicial', Number(fondo || 0)],
      ['+ Ventas en efectivo', r.efectivoVentas],
      ['+ Cobros de fiado en efectivo', r.cobrosEfectivo],
      ['− Gastos de caja', r.salidas]
    ];
    return `<div class="desglose">
        ${filas.map((f) => `<div class="desglose-fila"><span>${f[0]}</span><b>${JZAC.ui.dinero(f[1])}</b></div>`).join('')}
        <div class="desglose-fila desglose-total"><span>Esperado en caja</span><b>${JZAC.ui.dinero(esperadoConFondo(r, fondo))}</b></div>
      </div>`;
  }

  function difHTML(d) {
    if (d === null || d === undefined) return '<span class="texto-suave">Ingresa el efectivo contado</span>';
    if (Math.abs(d) < 0.01) return '<span class="badge badge-verde">Cuadra · S/ 0.00</span>';
    return d > 0
      ? `<span class="badge badge-dorado">Sobrante ${JZAC.ui.dinero(d)}</span>`
      : `<span class="badge badge-rojo">Faltante ${JZAC.ui.dinero(-d)}</span>`;
  }

  function registroHTML(c) {
    return `JZAC ERP · CORTE DE CAJA
${JZAC.ui.fh(c.fechaCorte)}
Período: ${JZAC.ui.fe(c.desde)} al ${JZAC.ui.fe(c.hasta)}

Ventas: ${JZAC.ui.n(c.nVentas)} · ${JZAC.ui.dinero(c.totalVentas)}
Cobros de fiado: ${JZAC.ui.dinero(c.cobrosTotal)}
Gastos: ${JZAC.ui.dinero(c.gastoTotal)}

Fondo inicial: ${JZAC.ui.dinero(c.fondoInicial)}
Efectivo esperado: ${JZAC.ui.dinero(c.esperado)}
Efectivo contado: ${JZAC.ui.dinero(c.contado)}
Diferencia: ${JZAC.ui.dinero(c.diferencia)}`;
  }

  function imprimirRegistro(c) {
    const css = JZAC.impresion ? JZAC.impresion.css(JZAC.impresion.ancho()) : '';
    JZAC.ui.imprimirHTML(`
      <div style="font-family:monospace;white-space:pre-wrap;font-size:14px">${JZAC.ui.esc(registroHTML(c)).replace(/\n/g, '<br>')}</div>`, css);
  }

  async function compartirRegistro(c) {
    const txt = registroHTML(c);
    if (navigator.share) {
      try { await navigator.share({ title: 'Corte de caja', text: txt }); return; } catch (e) { /* cancelado o sin soporte */ }
    }
    try {
      await navigator.clipboard.writeText(txt);
      JZAC.ui.toast('Resumen copiado. Pégalo donde lo necesites.', 'bien');
    } catch (e) {
      JZAC.ui.toast('No se pudo copiar el resumen.', 'mal');
    }
  }

  async function render(cont) {
    const hoy = JZAC.ui.hoyRango();
    cont.innerHTML = `
      <div class="card">
        <div class="seccion-titulo" style="margin-top:0">Período del corte</div>
        <div class="fila" style="align-items:flex-end">
          <div class="campo" style="margin:0"><label>Desde</label><input type="date" id="cj-desde" value="${JZAC.ui.fechaInput(hoy.desde)}"></div>
          <div class="campo" style="margin:0"><label>Hasta</label><input type="date" id="cj-hasta" value="${JZAC.ui.fechaInput(hoy.hasta)}"></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-primario" id="cj-aplicar">Aplicar</button>
            <button class="btn" id="cj-hoy">Hoy</button>
          </div>
        </div>
      </div>
      <div id="cj-cuerpo"></div>`;

    const desde = () => JZAC.ui.fechaDesdeInput(document.getElementById('cj-desde').value);
    const hasta = () => {
      const d = JZAC.ui.fechaDesdeInput(document.getElementById('cj-hasta').value);
      return d == null ? d : d + 86399999;
    };

    document.getElementById('cj-aplicar').addEventListener('click', () => pintaCuerpo(cont, desde(), hasta()));
    document.getElementById('cj-hoy').addEventListener('click', () => {
      const h = JZAC.ui.hoyRango();
      document.getElementById('cj-desde').value = JZAC.ui.fechaInput(h.desde);
      document.getElementById('cj-hasta').value = JZAC.ui.fechaInput(h.hasta);
      pintaCuerpo(cont, h.desde, h.hasta);
    });
    pintaCuerpo(cont, desde(), hasta());
  }

  async function pintaCuerpo(cont, desde, hasta) {
    if (desde == null || hasta == null) { JZAC.ui.toast('Revisa las fechas.', 'mal'); return; }
    const caja = document.getElementById('cj-cuerpo');
    caja.innerHTML = JZAC.ui.vacio('⏳', 'Calculando el corte...');

    const r = await calcular(desde, hasta);
    const guardados = leer().sort((a, b) => b.fechaCorte - a.fechaCorte);
    const claveDia = diaDe(desde);
    const guardado = guardados.find((c) => c.clave === claveDia) || null;
    const fondo = guardado ? guardado.fondoInicial : Number(localStorage.getItem('jzac_fondo_inicial') || 0);
    const contado = guardado ? guardado.contado : null;

    caja.innerHTML = `
      <div class="grid grid-4 mt16">
        <div class="card stat azul"><div class="stat-titulo">Ventas del período</div><div class="stat-valor">${JZAC.ui.n(r.nVentas)}</div></div>
        <div class="card stat verde"><div class="stat-titulo">Efectivo esperado</div><div class="stat-valor" id="cj-esperado-stat">${JZAC.ui.dinero(esperadoConFondo(r, fondo))}</div></div>
        <div class="card stat dorado"><div class="stat-titulo">Cobros de fiado</div><div class="stat-valor">${JZAC.ui.dinero(r.cobrosTotal)}</div></div>
        <div class="card stat rojo"><div class="stat-titulo">Gastos</div><div class="stat-valor">${JZAC.ui.dinero(r.gastoTotal)}</div></div>
      </div>

      <div class="grid grid-2 mt16">
        <div class="card">
          <div class="seccion-titulo" style="margin-top:0">Efectivo esperado en caja</div>
          ${desgloseHTML(r, fondo)}
          <div class="texto-suave" style="font-size:13px;margin-top:8px">
            Ventas totales del período: <b>${JZAC.ui.dinero(r.totalVentas)}</b>
            ${r.cobrosOtros > 0 ? ` · Cobros por otro medio: <b>${JZAC.ui.dinero(r.cobrosOtros)}</b>` : ''}
          </div>
        </div>

        <div class="card">
          <div class="seccion-titulo" style="margin-top:0">${guardado ? 'Corte guardado' : 'Cierre de caja'}</div>
          <div class="fila">
            <div class="campo"><label>Fondo inicial (S/)</label><input type="number" step="0.01" min="0" id="cj-fondo" value="${guardado ? Number(guardado.fondoInicial).toFixed(2) : (fondo ? Number(fondo).toFixed(2) : '')}"></div>
            <div class="campo"><label>Efectivo contado (S/)</label><input type="number" step="0.01" min="0" id="cj-contado" value="${contado != null ? Number(contado).toFixed(2) : ''}"></div>
          </div>
          <div style="font-size:16px;margin:6px 0 14px" id="cj-diferencia">${guardado ? difHTML(guardado.diferencia) : difHTML(null)}</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-primario" id="cj-guardar">${guardado ? 'Actualizar corte' : 'Guardar corte'}</button>
            <button class="btn" id="cj-imprimir">Imprimir</button>
            <button class="btn" id="cj-compartir">Compartir</button>
          </div>
          ${guardado ? `<div class="texto-suave" style="font-size:13px;margin-top:10px">Guardado el ${JZAC.ui.fh(guardado.fechaCorte)}.</div>` : ''}
        </div>
      </div>

      ${r.porMetodo.length ? `<div class="card mt16">
        <div class="seccion-titulo" style="margin-top:0">Efectivo y cobros por canal</div>
        <div class="tabla-wrap"><table>
          <tr><th>Medio de pago</th><th class="center">Mov.</th><th class="monto">Total</th></tr>
          ${r.porMetodo.map((m) => `<tr><td class="negrita">${JZAC.ui.esc(m.metodo)}</td><td class="center">${m.mov}</td><td class="monto">${JZAC.ui.dinero(m.total)}</td></tr>`).join('')}
          <tr><td class="negrita">Total cobrado</td><td class="center negrita">${r.porMetodo.reduce((a, m) => a + m.mov, 0)}</td><td class="monto negrita">${JZAC.ui.dinero(r.totalVentas)}</td></tr>
        </table></div>
      </div>` : ''}

      <div class="panel-hdr mt16">
        <div class="seccion-titulo" style="margin:0">Historial de cortes</div>
      </div>
      ${guardados.length === 0
        ? JZAC.ui.vacio('🧾', 'Aún no has guardado ningún corte.', 'Cuando cierres la caja, cuenta el efectivo y toca "Guardar corte".')
        : `<div class="tabla-wrap"><table>
            <tr><th>Fecha</th><th class="monto">Esperado</th><th class="monto">Contado</th><th class="monto">Diferencia</th><th></th></tr>
            ${guardados.map((c) => `<tr>
              <td>${JZAC.ui.fh(c.fechaCorte)}</td>
              <td class="monto">${JZAC.ui.dinero(c.esperado)}</td>
              <td class="monto">${JZAC.ui.dinero(c.contado)}</td>
              <td class="monto">${Number(c.diferencia) === 0 ? '<span class="badge badge-verde">0.00</span>' : Number(c.diferencia) > 0 ? `<span class="badge badge-dorado">+${JZAC.ui.dinero(c.diferencia)}</span>` : `<span class="badge badge-rojo">-${JZAC.ui.dinero(-c.diferencia)}</span>`}</td>
              <td class="derecha">
                <button class="btn btn-sm" data-imp="${c.id}">Imprimir</button>
                <button class="btn btn-sm btn-peligro" data-borrar="${c.id}">Eliminar</button>
              </td>
            </tr>`).join('')}
          </table></div>`}`;

    // ---- cálculo en vivo de la diferencia ----
    const fFondo = document.getElementById('cj-fondo');
    const fContado = document.getElementById('cj-contado');
    const calcula = () => {
      const fondoV = Number(fFondo.value || 0);
      const esperado = esperadoConFondo(r, fondoV);
      const contadoV = fContado.value === '' ? null : Number(fContado.value);
      const d = contadoV == null ? null : r2(contadoV - esperado);
      document.getElementById('cj-esperado-stat').textContent = JZAC.ui.dinero(esperado);
      document.getElementById('cj-diferencia').innerHTML = difHTML(d);
      localStorage.setItem('jzac_fondo_inicial', String(fondoV));
      return { esperado, contado: contadoV, diferencia: d };
    };
    fFondo.addEventListener('input', calcula);
    fContado.addEventListener('input', calcula);

    // ---- guardar / imprimir / compartir el corte actual ----
    document.getElementById('cj-guardar').addEventListener('click', async () => {
      const calc = calcula();
      if (calc.contado === null) { JZAC.ui.toast('Ingresa el efectivo contado.', 'mal'); fContado.focus(); return; }
      const lista = leer();
      const registro = {
        id: claveDia,
        clave: claveDia,
        fechaCorte: Date.now(),
        desde, hasta,
        fondoInicial: r2(Number(fFondo.value || 0)),
        esperado: calc.esperado,
        contado: calc.contado,
        diferencia: calc.diferencia,
        nVentas: r.nVentas,
        totalVentas: r.totalVentas,
        cobrosTotal: r.cobrosTotal,
        gastoTotal: r.gastoTotal
      };
      const i = lista.findIndex((c) => c.clave === claveDia);
      if (i >= 0) {
        if (!await JZAC.ui.confirmar('Ya existe un corte guardado para este día. ¿Reemplazarlo con los datos actuales?', 'Actualizar corte')) return;
        lista[i] = registro;
      } else {
        lista.push(registro);
      }
      escribir(lista);
      JZAC.ui.toast('Corte guardado.', 'bien');
      pintaCuerpo(cont, desde, hasta);
    });

    const actual = () => {
      const calc = calcula();
      const i = leer().findIndex((c) => c.clave === claveDia);
      if (i >= 0) return leer()[i];
      return {
        id: claveDia, clave: claveDia, fechaCorte: Date.now(), desde, hasta,
        fondoInicial: r2(Number(fFondo.value || 0)), esperado: calc.esperado,
        contado: calc.contado == null ? 0 : calc.contado,
        diferencia: calc.diferencia == null ? 0 : calc.diferencia,
        nVentas: r.nVentas, totalVentas: r.totalVentas,
        cobrosTotal: r.cobrosTotal, gastoTotal: r.gastoTotal
      };
    };
    document.getElementById('cj-imprimir').addEventListener('click', () => imprimirRegistro(actual()));
    document.getElementById('cj-compartir').addEventListener('click', () => compartirRegistro(actual()));

    // ---- historial ----
    caja.querySelectorAll('[data-imp]').forEach((b) => b.addEventListener('click', () => {
      const c = leer().find((x) => String(x.id) === b.dataset.imp);
      if (c) imprimirRegistro(c);
    }));
    caja.querySelectorAll('[data-borrar]').forEach((b) => b.addEventListener('click', async () => {
      const c = leer().find((x) => String(x.id) === b.dataset.borrar);
      if (!c) return;
      if (!await JZAC.ui.confirmar(`¿Eliminar el corte del <b>${JZAC.ui.fh(c.fechaCorte)}</b>?`, 'Eliminar corte')) return;
      escribir(leer().filter((x) => String(x.id) !== b.dataset.borrar));
      JZAC.ui.toast('Corte eliminado.', 'bien');
      pintaCuerpo(cont, desde, hasta);
    }));
  }

  window.JZAC = window.JZAC || {};
  window.JZAC.modulos = window.JZAC.modulos || {};
  window.JZAC.modulos.caja = { render };
})();
