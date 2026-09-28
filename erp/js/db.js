// ============================================================
// JZAC ERP - Capa de datos (IndexedDB) · esquema 16 tablas
// ============================================================
const DB_NAME = 'jzac_erp_web';
const DB_VERSION = 3;

const DB = {
  db: null,
  ready: open()
};

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('usuarios')) db.createObjectStore('usuarios', { keyPath: 'id', autoIncrement: true });
      if (!db.objectStoreNames.contains('clientes')) db.createObjectStore('clientes', { keyPath: 'id', autoIncrement: true });
      if (!db.objectStoreNames.contains('productos')) db.createObjectStore('productos', { keyPath: 'id', autoIncrement: true });
      if (!db.objectStoreNames.contains('proveedores')) db.createObjectStore('proveedores', { keyPath: 'id', autoIncrement: true });
      if (!db.objectStoreNames.contains('pedidos_proveedor')) db.createObjectStore('pedidos_proveedor', { keyPath: 'id', autoIncrement: true });
      if (!db.objectStoreNames.contains('detalle_pedido')) db.createObjectStore('detalle_pedido', { keyPath: 'id', autoIncrement: true });
      if (!db.objectStoreNames.contains('ventas')) db.createObjectStore('ventas', { keyPath: 'id', autoIncrement: true });
      if (!db.objectStoreNames.contains('detalle_venta')) db.createObjectStore('detalle_venta', { keyPath: 'id', autoIncrement: true });
      if (!db.objectStoreNames.contains('fiados')) db.createObjectStore('fiados', { keyPath: 'id', autoIncrement: true });
      if (!db.objectStoreNames.contains('pagos_fiado')) db.createObjectStore('pagos_fiado', { keyPath: 'id', autoIncrement: true });
      if (!db.objectStoreNames.contains('mermas')) db.createObjectStore('mermas', { keyPath: 'id', autoIncrement: true });
      if (!db.objectStoreNames.contains('gastos')) db.createObjectStore('gastos', { keyPath: 'id', autoIncrement: true });
      if (!db.objectStoreNames.contains('notas_credito')) db.createObjectStore('notas_credito', { keyPath: 'id', autoIncrement: true });
      if (!db.objectStoreNames.contains('detalle_nota')) db.createObjectStore('detalle_nota', { keyPath: 'id', autoIncrement: true });
      if (!db.objectStoreNames.contains('respaldos')) db.createObjectStore('respaldos', { keyPath: 'id' });
    };
    // otras pestanas con la version vieja deben soltar la base o el upgrade queda bloqueado
    req.onblocked = () => {};
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

function tx(store, mode) {
  return DB.db.transaction(store, mode).objectStore(store);
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
  // ejecuta una funcion con una transaccion de varias tablas
  async transaccional(fn) {
    await DB.ready;
    const t = DB.db.transaction(
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

window.JZAC = window.JZAC || {};
window.JZAC.db = db;