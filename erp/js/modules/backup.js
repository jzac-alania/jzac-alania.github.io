// ============================================================
// JZAC ERP - Respaldo: exportacion, copia local automatica y aviso
// ============================================================
(function () {
  const TABLAS = ['usuarios', 'clientes', 'productos', 'proveedores', 'pedidos_proveedor',
    'detalle_pedido', 'ventas', 'detalle_venta', 'fiados', 'pagos_fiado',
    'mermas', 'gastos', 'notas_credito', 'detalle_nota'];
  const NEGOCIO = TABLAS.filter((t) => t !== 'usuarios');
  const CLAVE_EXPORT = 'jzac_ultima_export';
  const CLAVE_SNAPSHOT = 'jzac_ultimo_snapshot';
  const DIAS_AVISO = 7;
  const CADA_SNAPSHOT = 30 * 60 * 1000;

  window.JZAC = window.JZAC || {};
  window.JZAC.TABLAS = TABLAS;

  function msDe(clave) {
    const v = Number(localStorage.getItem(clave));
    return Number.isFinite(v) && v > 0 ? v : null;
  }

  function estadoExport() {
    const ms = msDe(CLAVE_EXPORT) || Date.now();
    const dias = Math.floor((Date.now() - ms) / 86400000);
    return { ms, dias, aviso: dias >= DIAS_AVISO, diasAviso: DIAS_AVISO };
  }

  function marcarExport() {
    localStorage.setItem(CLAVE_EXPORT, String(Date.now()));
  }

  async function datosExport() {
    const data = {};
    for (const t of TABLAS) data[t] = await JZAC.db.listar(t);
    data.cortes_caja = window.JZAC.cortes ? JZAC.cortes.leer() : [];
    return data;
  }

  async function exportar() {
    const data = await datosExport();
    marcarExport();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'JZAC_ERP_respaldo_' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 400);
    JZAC.ui.toast('Respaldo descargado. Guárdalo en tu nube o USB.', 'bien');
    return true;
  }

  async function informacion() {
    const exp = estadoExport();
    let snap = null;
    try { snap = await JZAC.db.obtener('respaldos', 'ultimo'); } catch (e) { snap = null; }
    return { export: exp, snapshot: snap ? snap.fecha : null };
  }

  // copia local de seguridad: renueva el slot "ultimo" y baja el anterior a "previo"
  async function hacerSnapshot(forzar) {
    try {
      const ult = msDe(CLAVE_SNAPSHOT);
      if (!forzar && ult && Date.now() - ult < CADA_SNAPSHOT) return false;
      const datos = {};
      for (const t of NEGOCIO) datos[t] = await JZAC.db.listar(t);
      datos.cortes_caja = window.JZAC.cortes ? JZAC.cortes.leer() : [];
      const actual = await JZAC.db.obtener('respaldos', 'ultimo');
      if (actual && actual.datos) {
        await JZAC.db.guardar('respaldos', { id: 'previo', fecha: actual.fecha, datos: actual.datos });
      }
      await JZAC.db.guardar('respaldos', { id: 'ultimo', fecha: Date.now(), datos });
      localStorage.setItem(CLAVE_SNAPSHOT, String(Date.now()));
      return true;
    } catch (e) {
      return false;
    }
  }

  async function restaurarSnapshot(cual) {
    const s = await JZAC.db.obtener('respaldos', cual || 'ultimo').catch(() => null);
    if (!s || !s.datos) return false;
    const cuando = JZAC.ui.fh(s.fecha);
    if (!await JZAC.ui.confirmar(
      `Restaurar la copia automática del <b>${cuando}</b> reemplazará los datos actuales de este dispositivo (productos, ventas, clientes, fiados...). Tu cuenta y licencia no cambian. ¿Continuar?`,
      'Restaurar copia')) return false;
    for (const t of NEGOCIO) {
      await JZAC.db.limpiar(t);
      for (const item of s.datos[t] || []) await JZAC.db.guardar(t, item);
    }
    if (Array.isArray(s.datos.cortes_caja) && window.JZAC.cortes) JZAC.cortes.escribir(s.datos.cortes_caja);
    return true;
  }

  function avisoHTML() {
    const e = estadoExport();
    if (!e.aviso) return '';
    return `<div class="aviso-respaldo">
        <div style="flex:1;min-width:220px"><b>Hace ${e.dias} ${e.dias === 1 ? 'día' : 'días'} sin descargar un respaldo.</b>
          Si pierdes este equipo, pierdes tus datos. Descárgalo y guárdalo en tu nube o USB.</div>
        <button class="btn btn-sm btn-primario" data-exportar>Descargar ahora</button>
      </div>`;
  }

  function enlazar(raiz) {
    if (!raiz) return;
    raiz.querySelectorAll('[data-exportar]').forEach((b) => b.addEventListener('click', () => exportar()));
  }

  window.JZAC.backup = { estadoExport, marcarExport, exportar, datosExport, informacion, hacerSnapshot, restaurarSnapshot, avisoHTML, enlazar };
})();
