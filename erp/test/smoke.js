// ============================================================
// JZAC ERP - Smoke test (dev, no forma parte de la app)
// Uso:  node erp/test/smoke.js
//   BASE_URL   (default http://127.0.0.1:8123/erp/)
//   CHROME     (default C:/Program Files/Google/Chrome/Application/chrome.exe)
//   PUPPETEER  (carpeta node_modules que contiene puppeteer-core; default cwd)
// Requiere el servidor local arriba:  py -m http.server 8123 --bind 127.0.0.1
// ============================================================
const path = require('path');
const puppeteer = require(process.env.PUPPETEER ? path.join(process.env.PUPPETEER, 'puppeteer-core') : 'puppeteer-core');
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8123/erp/';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

  const results = [];
  const ok = (name, cond, extra) => {
    results.push({ name, pass: !!cond });
    console.log((cond ? 'PASS' : 'FAIL') + ' · ' + name + (extra ? ' · ' + extra : ''));
  };

  await p.setViewport({ width: 1440, height: 900 });
  await p.goto(BASE, { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(2000);

  const reg = await p.evaluate(async () => {
    try {
      const mail = 'smoke' + Date.now() + '@test.com';
      const u = await JZAC.auth.registrar('Smoke', 'Bodega Smoke', mail, '1234');
      JZAC.auth.guardarSesion(u);
      try { await JZAC.lic.iniciarPrueba('Bodega Smoke', mail, '9' + String(Math.floor(10000000 + Math.random() * 89999999))); } catch (e) {}
      return { ok: true };
    } catch (e) { return { ok: false, error: e.message }; }
  });
  ok('registro + trial', reg.ok, reg.error || '');

  await p.reload({ waitUntil: 'networkidle2' });
  await p.waitForSelector('.nav', { timeout: 30000 });
  await sleep(1500);
  ok('app carga con nav', (await p.$('.nav')) !== null);

  const seed = await p.evaluate(async () => {
    try {
      await JZAC.db.guardar('productos', { nombre: 'Arroz Smoke', codigo: 'S1', barra: 'S1', precioCompra: 3, precioVenta: 5, stock: 10, stockMin: 2, categoria: 'Abarrotes' });
      await JZAC.db.guardar('clientes', { nombre: 'Cliente Smoke', dni: '12345678' });
      return { ok: true };
    } catch (e) { return { ok: false, error: e.message }; }
  });
  ok('guardar producto + cliente', seed.ok, seed.error || '');

  for (const r of ['dashboard', 'ventas', 'inventario', 'clientes', 'fiados', 'proveedores', 'gastos', 'caja', 'reportes', 'config']) {
    await p.evaluate((x) => { location.hash = '#/' + x; }, r);
    await sleep(900);
    const st = await p.evaluate(() => ({
      crash: (document.querySelector('#contenido') || {}).innerText ? document.querySelector('#contenido').innerText.indexOf('No se pudo cargar') >= 0 : true,
      has: document.querySelector('#contenido') ? document.querySelector('#contenido').children.length : 0
    }));
    ok('ruta ' + r, !st.crash && st.has > 0, 'nodos=' + st.has);
  }

  await p.evaluate(() => { location.hash = '#/ventas/nueva'; });
  await sleep(1400);
  const cart = await p.evaluate(async () => {
    const sel = document.getElementById('sel-prod');
    if (!sel) return { ok: false };
    sel.value = String(sel.options[1].value);
    sel.dispatchEvent(new Event('change'));
    document.getElementById('in-cant').value = '2';
    document.getElementById('agregar-item').click();
    await new Promise((r) => setTimeout(r, 300));
    return { ok: true, total: (document.getElementById('tot-final') || {}).textContent };
  });
  ok('POS agrega 2 unidades (total S/ 10)', cart.ok && String(cart.total).indexOf('10') >= 0, 'total=' + (cart.total || '?'));

  await p.evaluate(() => document.getElementById('guardar-venta').click());
  await sleep(2500);
  const sale = await p.evaluate(async () => {
    const v = await JZAC.db.listar('ventas');
    const prods = await JZAC.db.listar('productos');
    const arroz = prods.find((x) => x.nombre === 'Arroz Smoke');
    const modal = document.getElementById('modal-root');
    const cerrar = modal ? modal.querySelector('[data-cerrar], #cont-luego') : null;
    if (cerrar) cerrar.click();
    return { ventas: v.length, stock: arroz ? arroz.stock : null };
  });
  ok('venta registrada + stock 10->8', sale.ventas >= 1 && Number(sale.stock) === 8, 'ventas=' + sale.ventas + ' stock=' + sale.stock);

  const tema = await p.evaluate(async () => {
    const btn = document.getElementById('btn-tema');
    btn.click(); await new Promise((r) => setTimeout(r, 200));
    const oscuro = document.documentElement.dataset.tema === 'oscuro';
    btn.click(); await new Promise((r) => setTimeout(r, 200));
    const claro = document.documentElement.dataset.tema !== 'oscuro';
    return { oscuro, claro };
  });
  ok('toggle tema', tema.oscuro && tema.claro);

  await p.setViewport({ width: 390, height: 844, isMobile: true });
  for (const r of ['dashboard', 'ventas', 'inventario', 'fiados', 'caja', 'reportes', 'config']) {
    await p.evaluate((x) => { location.hash = '#/' + x; }, r);
    await sleep(800);
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok('movil 390 sin overflow · ' + r, ov <= 1, 'delta=' + ov + 'px');
  }

  ok('sin errores JS de pagina', errs.filter((e) => e.startsWith('pageerror')).length === 0);

  const fails = results.filter((r) => !r.pass);
  console.log('\n=== RESUMEN: ' + (results.length - fails.length) + '/' + results.length + ' PASS ===');
  if (fails.length) console.log('FALLOS: ' + fails.map((f) => f.name).join(', '));
  await b.close();
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error('SMOKE CRASH:', e); process.exit(2); });
