// ============================================================
// JZAC ERP - Capa de datos (IndexedDB) · esquema 16 tablas
// ============================================================
const DB_NAME = 'jzac_erp_web';
const DB_VERSION = 5;

const DB = {
  db: null,
  ready: open()
};

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      const txUp = e.target.transaction;
      const ensure = (name, opts) => {
        if (!db.objectStoreNames.contains(name)) return db.createObjectStore(name, opts);
        return txUp.objectStore(name);
      };
      ensure('usuarios', { keyPath: 'id', autoIncrement: true });
      ensure('clientes', { keyPath: 'id', autoIncrement: true });
      ensure('productos', { keyPath: 'id', autoIncrement: true });
      ensure('proveedores', { keyPath: 'id', autoIncrement: true });
      ensure('pedidos_proveedor', { keyPath: 'id', autoIncrement: true });
      const stDetPed = ensure('detalle_pedido', { keyPath: 'id', autoIncrement: true });
      ensure('ventas', { keyPath: 'id', autoIncrement: true });
      const stDetVen = ensure('detalle_venta', { keyPath: 'id', autoIncrement: true });
      ensure('fiados', { keyPath: 'id', autoIncrement: true });
      const stPagos = ensure('pagos_fiado', { keyPath: 'id', autoIncrement: true });
      ensure('mermas', { keyPath: 'id', autoIncrement: true });
      ensure('gastos', { keyPath: 'id', autoIncrement: true });
      ensure('notas_credito', { keyPath: 'id', autoIncrement: true });
      ensure('detalle_nota', { keyPath: 'id', autoIncrement: true });
      ensure('respaldos', { keyPath: 'id' });
      const stSunat = ensure('comprobantes_sunat', { keyPath: 'id', autoIncrement: true });
      if (!stSunat.indexNames.contains('ventaId')) stSunat.createIndex('ventaId', 'ventaId');
      if (!stDetVen.indexNames.contains('ventaId')) stDetVen.createIndex('ventaId', 'ventaId');
      if (!stDetPed.indexNames.contains('pedidoId')) stDetPed.createIndex('pedidoId', 'pedidoId');
      if (!stPagos.indexNames.contains('fiadoId')) stPagos.createIndex('fiadoId', 'fiadoId');
    };
    // otras pestanas con la version vieja deben soltar la base o el upgrade queda bloqueado
    req.onblocked = () => {
      const avisa = () => {
        if (window.JZAC && JZAC.ui && JZAC.ui.toast) {
          JZAC.ui.toast('Cierra otras pestañas de JZAC ERP y recarga.', 'mal');
        }
      };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avisa, { once: true });
      else avisa();
    };
    req.onsuccess = () => {
      const base = req.result;
      DB.db = base;
      base.onversionchange = () => {
        try { base.close(); } catch (e) { /* ya cerrada */ }
        if (DB.db === base) { DB.db = null; DB.ready = open(); }
      };
      resolve(base);
    };
    req.onerror = () => reject(req.error);
  });
}

const TABLAS_LIBRES = ['usuarios', 'respaldos'];

function licenciaPermitida(tabla, modo) {
  if (modo !== 'readwrite') return true;
  if (TABLAS_LIBRES.indexOf(tabla) >= 0) return true;
  return !!(window.JZAC && window.JZAC.lic && typeof window.JZAC.lic.puedeEscribir === 'function' && window.JZAC.lic.puedeEscribir());
}

function abrirTransaccion(nombres, modo) {
  const lista = Array.isArray(nombres) ? nombres : [nombres];
  if (modo === 'readwrite' && !lista.every((t) => licenciaPermitida(t, modo))) {
    throw new Error('licencia-vencida');
  }
  return DB.db.transaction(nombres, modo);
}

function abrirTransaccionLibre(nombres, modo) {
  return DB.db.transaction(nombres, modo);
}

function tx(store, mode) {
  return abrirTransaccion(store, mode).objectStore(store);
}

function pedir(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const db = {
  async listar(tabla) {
    await DB.ready;
    return pedir(tx(tabla, 'readonly').getAll());
  },
  async obtener(tabla, id) {
    await DB.ready;
    return pedir(tx(tabla, 'readonly').get(id));
  },
  async guardar(tabla, obj) {
    await DB.ready;
    const t = tx(tabla, 'readwrite');
    const key = obj.id != null ? obj.id : undefined;
    const r = key === undefined ? t.add(obj) : t.put(obj);
    return pedir(r);
  },
  async borrar(tabla, id) {
    await DB.ready;
    return pedir(tx(tabla, 'readwrite').delete(id));
  },
  async limpiar(tabla) {
    await DB.ready;
    return pedir(tx(tabla, 'readwrite').clear());
  },
  transaccion: abrirTransaccion,
  transaccionLibre: abrirTransaccionLibre,
  permitida: licenciaPermitida,
  // ejecuta una funcion con una transaccion de varias tablas
  async transaccional(fn) {
    await DB.ready;
    const t = abrirTransaccion(
      ['ventas', 'detalle_venta', 'productos', 'fiados', 'pagos_fiado',
       'pedidos_proveedor', 'detalle_pedido', 'clientes', 'mermas', 'gastos',
       'notas_credito', 'detalle_nota'],
      'readwrite'
    );
    const stores = {};
    t.objectStoreNames.forEach((n) => { stores[n] = t.objectStore(n); });
    return new Promise((resolve, reject) => {
      const r = fn(stores);
      t.oncomplete = () => resolve(r);
      t.onerror = () => reject(t.error);
    });
  }
};

DB.transaccion = abrirTransaccion;
DB.transaccionLibre = abrirTransaccionLibre;
DB.permitida = licenciaPermitida;
DB.transaccional = db.transaccional;

window.JZAC = window.JZAC || {};
window.JZAC.db = db;