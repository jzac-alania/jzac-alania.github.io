# JZAC — reglas del repositorio

Repo: `jzac-alania/jzac-alania.github.io`, rama `main`. La app ERP vive en `erp/` (PWA vanilla JS).

## Commits
- **Solo `erp/`** en los commits, salvo que el usuario pida explícitamente otra carpeta (el root tiene el sitio portafolio: index.html, script.js, styles.css).
- Mensaje estilo: `ERP vX.Y.Z: <qué cambió en español>`.

## Publicar cambios (obligatorio después de editar `erp/`)
1. **Bump de versión en dos archivos**: `erp/sw.js` → `const CACHE = 'jzac-erp-vX.Y.Z';` y `erp/js/modules/config.js` → `versión web X.Y.Z` (el SW es cache-first, sin bump el cliente no actualiza).
2. Commit + push y verificar en vivo con `curl` (con `?$(date +%s)` para saltar caché de GitHub Pages; demora ~60-90 s en desplegar).

## Suite de pruebas (25 tests)
- Carpeta: `C:\Users\Intel\AppData\Local\Temp\opencode\` — correr `node <test>.js` desde ahí con el servidor arriba.
- Lista: test_flujo_rapido, test_venta, test_scanner, test_scanner_flow, test_devolucion, test_boleta, test_movil_boleta, test_pedidos, test_mejoras, test_login, test_licencia, test_reg320, test_ui_resumen, test_ui_resumen_320, test_offline, test_app, test_dueno, test_v160, test_v170, test_v174, test_full, test_dark, test_desktop, test_caja, test_backup.
- En lote: `node run_suite.js test_a test_b ...` (marcas PASS/FAIL; NO paralelizar: los tests comparten la IndexedDB del mismo origen). Cerrar procesos `chrome.exe` residuales antes si algo se cuelga.
- Todos deben salir PASS antes de publicar. Timeout por test: ≥900000 ms.
- Servidor local: `py -m http.server 8123 --bind 127.0.0.1 --directory "C:\Users\Intel\Documents\opencode\portfolio"` (en background). Matar: PID que escuche :8123 vía `netstat -ano | grep :8123` + `taskkill //PID <pid> //F`.

## Entorno (Windows)
- `python` NO existe → usar `py`. `pgrep` NO existe → `tasklist`/`taskkill`. Chrome: `C:\Program Files\Google\Chrome\Application\chrome.exe`. puppeteer-core: `C:\Users\Intel\AppData\Local\Temp\opencode\node_modules`.

## Convenciones del código ERP
- Namespace `window.JZAC.*`; módulos exponen `JZAC.modulos.X = { render(cont) }` (render recibe el contenedor, sin `u`).
- Datos en IndexedDB vía `DB.db` / `JZAC.db.guardar/listar/limpiar/ready`; transacciones: `DB.db.transaction([...], 'readwrite')`.
- UI: `JZAC.ui.modal(html, pie)` → `{raiz, cerrar}`; Esc cierra; helpers `esc/n/dinero/fh/fe/toast/vacio`.
- WhatsApp: `JZAC.ui.abrirWha(url)` (ancla, nunca window.open) y `JZAC.negocio.wha(texto)`.
- Evitar `await` antes de abrir WhatsApp (el popup se bloquea); abrir síncrono con datos ya en caché (`proveedoresCache`).
- Campo de producto por peso: `ventaPeso`. Estilos: sin comentarios en el código, seguir el estilo existente.

## App móvil hermana
- `C:\Users\Intel\Documents\NexusERP` (Kotlin, SQLite, APKs firmados). La web es la fuente de verdad de funciones (paridad: revisar con el skill `code-review`).
