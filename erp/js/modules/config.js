// ============================================================
// JZAC ERP - Configuracion: negocio, licencia y respaldo
// ============================================================
(function () {
  const TABLAS = window.JZAC.TABLAS;

  async function render(cont) {
    const u = await JZAC.auth.usuarioActual();
    const lic = JZAC.lic.estado(u);
    const diaLic = Math.max(1, Math.min(JZAC.lic.DIAS_PRUEBA, JZAC.lic.DIAS_PRUEBA - (lic.diasRestantes || 0) + 1));
    const info = await JZAC.backup.informacion();
    const ultima = info.export.dias === 0 ? 'hoy' : info.export.dias === 1 ? 'ayer' : `hace ${info.export.dias} días`;
    const copia = info.snapshot
      ? (Date.now() - info.snapshot < 45 * 60 * 1000 ? 'hace unos minutos' : `hace ${Math.max(1, Math.round((Date.now() - info.snapshot) / 3600000))} h (${JZAC.ui.fh(info.snapshot)})`)
      : 'aún no se ha guardado';

    cont.innerHTML = `
      <div class="grid grid-2">
        <div class="card">
          <div class="seccion-titulo" style="margin-top:0">Datos del negocio</div>
          <div class="campo"><label>Nombre del negocio</label><input id="cf-negocio" value="${JZAC.ui.esc(u.nombreNegocio)}"></div>
          <div class="campo"><label>Tu nombre</label><input id="cf-nombre" value="${JZAC.ui.esc(u.nombre)}"></div>
          <div class="fila">
            <div class="campo"><label>Serie de boleta</label><input id="cf-serie" value="${JZAC.ui.esc(u.serieBoleta || 'B001')}"></div>
            <div class="campo"><label>Correlativo</label><input type="number" id="cf-correl" value="${Number(u.correlativoBoleta || 1000)}"></div>
          </div>
          <button class="btn btn-primario" id="cf-guardar">Guardar cambios</button>

          <div class="seccion-titulo">Facturación electrónica</div>
          <div class="texto-suave" style="font-size:13px;margin-bottom:8px">Completa los datos fiscales del negocio. En modo <b>simulado</b> el comprobante se registra solo en este dispositivo y no se envía a SUNAT.</div>
          <label class="campo-check" style="display:flex;gap:8px;align-items:flex-start;margin-bottom:8px">
            <input type="checkbox" id="cf-fiscal-activo" style="width:18px;height:18px;margin-top:2px">
            <span><b>Emitir comprobante al registrar cada venta</b><br><small class="texto-suave">Si está desactivado, la venta se guarda como documento interno.</small></span>
          </label>
          <div class="fila">
            <div class="campo"><label>RUC del negocio</label><input id="cf-ruc" inputmode="numeric" maxlength="11" value="${JZAC.ui.esc(u.ruc || '')}" placeholder="11 dígitos"><div class="texto-suave" style="font-size:12px;margin-top:3px">En simulación puedes usar un documento de prueba. Para SUNAT el RUC debe tener 11 dígitos.</div></div>
            <div class="campo"><label>Régimen tributario</label><select id="cf-regimen">
              ${['RUS', 'RER', 'MYPE', 'General'].map((r) => `<option value="${r}" ${(u.regimen || 'MYPE') === r ? 'selected' : ''}>${r === 'MYPE' ? 'MYPE Tributario' : r}</option>`).join('')}
            </select></div>
          </div>
          <div class="campo"><label>Razón social</label><input id="cf-razon" value="${JZAC.ui.esc(u.razonSocial || u.nombreNegocio || '')}"></div>
          <div class="campo"><label>Dirección fiscal</label><input id="cf-direc-fiscal" value="${JZAC.ui.esc(u.direccionFiscal || '')}" placeholder="Dirección del establecimiento"></div>
          <div class="fila">
            <div class="campo"><label>Serie de factura</label><input id="cf-serie-factura" value="${JZAC.ui.esc(u.serieFactura || 'F001')}" maxlength="4"></div>
            <div class="campo"><label>Correlativo factura</label><input type="number" id="cf-correl-factura" value="${Number(u.correlativoFactura || 1000)}"></div>
          </div>
          <div class="fila">
            <div class="campo"><label>IGV (%)</label><input type="number" id="cf-igv" step="0.01" min="0" max="18" value="${Number(u.igvPorcentaje != null ? u.igvPorcentaje : 18)}"></div>
            <div class="campo"><label>Modo de emisión</label><select id="cf-modo-fiscal">
              <option value="simulado" ${(u.modoFiscal || 'simulado') === 'simulado' ? 'selected' : ''}>Simulado (local)</option>
              <option value="lucode" ${u.modoFiscal === 'lucode' ? 'selected' : ''}>Lucode / PSE</option>
            </select></div>
          </div>
          <label class="campo-check" style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
            <input type="checkbox" id="cf-precio-igv" style="width:18px;height:18px">
            <span>Los precios de venta ya incluyen IGV</span>
          </label>
          <div class="campo"><label>URL del proxy PSE (recomendado)</label><input id="cf-pse-proxy" value="${JZAC.ui.esc(u.pseProxyUrl || '')}" placeholder="https://tu-worker.workers.dev/emitir"></div>
          <div class="campo"><label>URL de la API Lucode</label><input id="cf-pse-url" value="${JZAC.ui.esc(u.pseUrl || JZAC.fiscal.PSE_URL)}"></div>
          <div class="campo"><label>Token Lucode sandbox (solo este dispositivo)</label><input id="cf-pse-token" type="password" value="${JZAC.ui.esc(JZAC.fiscal.token())}" placeholder="Bearer token"></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
            <button class="btn btn-sm" id="cf-pse-token-guardar">Guardar token PSE</button>
            <button class="btn btn-sm" id="cf-pse-token-limpiar">Borrar token PSE</button>
          </div>
          <div class="texto-suave" style="font-size:12px;margin-bottom:4px">El token no se incluye en el respaldo. Para producción usa un proxy que guarde el token en el servidor.</div>

          <div class="seccion-titulo">Licencia</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
            ${lic.tipo === 'activada'
              ? '<span class="badge badge-verde">Licencia activa</span>'
              : lic.tipo === 'prueba'
                ? `<span class="badge badge-dorado">Prueba · día ${diaLic} de ${JZAC.lic.DIAS_PRUEBA}</span>`
                : '<span class="badge badge-rojo">Licencia vencida</span>'}
            <button class="btn btn-sm" id="cf-licencia">Ver / activar licencia</button>
            <button class="btn btn-sm" id="cf-vendedor">Herramientas de vendedor</button>
          </div>
        </div>

        <div>
          <div class="card">
            <div class="seccion-titulo" style="margin-top:0">Apariencia</div>
            <div class="campo">
              <label>Tema de la pantalla</label>
              <select id="cf-tema">
                <option value="claro">Claro</option>
                <option value="oscuro">Oscuro</option>
              </select>
            </div>
            <div class="texto-suave" style="font-size:13px">También puedes alternarlo desde el botón del encabezado.</div>
          </div>

          <div class="card mt16">
            <div class="seccion-titulo" style="margin-top:0">Respaldo de datos</div>
            ${JZAC.backup.avisoHTML()}
            <div class="estado-respaldo">
              Última descarga de respaldo: <b>${ultima}</b>.<br>
              Copia automática local: <b>${copia}</b>.
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn" id="cf-exportar">Descargar respaldo (.json)</button>
              <button class="btn" id="cf-importar">Restaurar respaldo</button>
              ${info.snapshot ? '<button class="btn" id="cf-copia">Restaurar copia automática</button>' : ''}
              <input type="file" id="cf-file" accept=".json" style="display:none">
            </div>
          </div>

          <div class="card mt16">
            <div class="seccion-titulo" style="margin-top:0">Caja e impresión</div>
            <div class="campo">
              <label>Ancho de la impresora térmica</label>
              <select id="cf-ancho">
                <option value="58">58 mm (bobina angosta)</option>
                <option value="80">80 mm (bobina ancha)</option>
              </select>
            </div>
            <div class="texto-suave" style="font-size:13px;margin-bottom:12px">Pon la impresora como <b>predeterminada</b> de Windows y verifica antes de la primera venta.</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn" id="cf-probar">Probar impresión de boleta</button>
            </div>
          </div>

          <div class="card mt16">
            <div class="seccion-titulo" style="margin-top:0">Flujo rápido de la caja</div>
            <div class="texto-suave" style="font-size:13px;margin-bottom:12px">Para atender al cliente más rápido. Puedes activarlas y desactivarlas cuando quieras.</div>
            <label class="campo-check" style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
              <input type="checkbox" id="cf-modrap" style="width:18px;height:18px">
              <span><b>Modo rápido:</b> al registrar la venta <b>se queda vendiendo</b> en la misma pantalla (no vuelve al historial) y deja todo limpio para el siguiente cliente.</span>
            </label>
            <label class="campo-check" style="display:flex;gap:8px;align-items:center">
              <input type="checkbox" id="cf-autoimp" style="width:18px;height:18px">
              <span><b>Imprimir boleta automática:</b> al registrar, la boleta sale sola sin tocar nada más.</span>
            </label>
          </div>

          <div class="card mt16">
            <div class="seccion-titulo" style="margin-top:0">Punto de venta (POS)</div>
            <label class="pos-toggle" for="cf-camara">
              <span>
                <b>Escanear con la cámara siempre abierta</b>
                <small>Pasa los productos frente a la cámara y se agregan solos al carrito, con un bip. Al escanear verás el <b>Ticket en vivo</b> con los productos y el total. Si lo desactivas, el botón "Escanear cámara" se oculta en la venta.</small>
              </span>
              <input type="checkbox" id="cf-camara" class="switch">
            </label>
          </div>

          <div class="card mt16">
            <div class="seccion-titulo" style="margin-top:0">Cajón registrador (USB)</div>
            <div class="texto-suave" style="font-size:13px;margin-bottom:12px">Se abre automáticamente al cobrar en efectivo (pulso USB a la impresora térmica). Requiere Chrome o Edge.</div>
            <div class="texto-suave" style="font-size:13px;margin-bottom:12px" id="cf-cajon-estado">Esperando dispositivo...</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn" id="cf-cajon-conectar">Conectar cajón</button>
              <button class="btn" id="cf-cajon-probar">Probar apertura</button>
            </div>
          </div>

          <div class="card mt16">
            <div class="seccion-titulo" style="margin-top:0">Acerca de</div>
            <div style="font-size:14px;line-height:1.7;color:var(--texto-suave)">
              <b style="color:var(--texto)">JZAC ERP</b> · versión web 1.20.4<br>
              Ventas, inventario, fiados y reportes para tu negocio.<br>
              JZAC · Software que trabaja por tu negocio.
            </div>
            <div class="mt16" style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn btn-whatsapp" id="cf-contacto">Contactar al vendedor</button>
            </div>
          </div>
        </div>
      </div>`;

    document.getElementById('cf-fiscal-activo').checked = !!u.fiscalActivo;
    document.getElementById('cf-precio-igv').checked = u.precioIncluyeIgv !== false;
    document.getElementById('cf-pse-token-guardar').addEventListener('click', () => {
      JZAC.fiscal.guardarToken(document.getElementById('cf-pse-token').value);
      JZAC.ui.toast('Token PSE guardado en este dispositivo.', 'bien');
    });
    document.getElementById('cf-pse-token-limpiar').addEventListener('click', () => {
      JZAC.fiscal.guardarToken('');
      document.getElementById('cf-pse-token').value = '';
      JZAC.ui.toast('Token PSE borrado.', 'bien');
    });

    document.getElementById('cf-guardar').addEventListener('click', async () => {
      const negocio = document.getElementById('cf-negocio').value.trim();
      const nombre = document.getElementById('cf-nombre').value.trim();
      const serie = document.getElementById('cf-serie').value.trim().toUpperCase();
      const correl = Math.max(1000, Number(document.getElementById('cf-correl').value || 1000));
      const ruc = document.getElementById('cf-ruc').value.replace(/\D/g, '');
      const serieFactura = document.getElementById('cf-serie-factura').value.trim().toUpperCase();
      const modoFiscal = document.getElementById('cf-modo-fiscal').value;
      if (!negocio || !nombre) { JZAC.ui.toast('Completa el nombre del negocio y tu nombre.', 'mal'); return; }
      if (modoFiscal === 'lucode' && ruc.length !== 11) {
        JZAC.ui.toast('Para emitir con Lucode el RUC del negocio debe tener 11 dígitos.', 'mal');
        return;
      }
      const nuevo = {
        ...u,
        nombreNegocio: negocio,
        nombre,
        serieBoleta: serie || 'B001',
        correlativoBoleta: correl,
        ruc,
        razonSocial: document.getElementById('cf-razon').value.trim(),
        direccionFiscal: document.getElementById('cf-direc-fiscal').value.trim(),
        regimen: document.getElementById('cf-regimen').value,
        serieFactura: serieFactura || 'F001',
        correlativoFactura: Math.max(1000, Number(document.getElementById('cf-correl-factura').value || 1000)),
        igvPorcentaje: Math.max(0, Math.min(18, Number(document.getElementById('cf-igv').value || 18))),
        precioIncluyeIgv: document.getElementById('cf-precio-igv').checked,
        fiscalActivo: document.getElementById('cf-fiscal-activo').checked,
        modoFiscal,
        pseProxyUrl: document.getElementById('cf-pse-proxy').value.trim(),
        pseUrl: document.getElementById('cf-pse-url').value.trim() || JZAC.fiscal.PSE_URL
      };
      await JZAC.db.guardar('usuarios', nuevo);
      JZAC.ui.toast('Cambios guardados.', 'bien');
      render(cont);
    });

    document.getElementById('cf-licencia').addEventListener('click', () => JZAC.mostrarEstadoLicencia());
    document.getElementById('cf-vendedor').addEventListener('click', () => JZAC.mostrarVendedor());

    document.getElementById('cf-exportar').addEventListener('click', () => JZAC.backup.exportar());

    const btnCopia = document.getElementById('cf-copia');
    if (btnCopia) btnCopia.addEventListener('click', async () => {
      if (await JZAC.backup.restaurarSnapshot()) {
        JZAC.ui.toast('Copia automática restaurada.', 'bien');
        render(cont);
      }
    });
    JZAC.backup.enlazar(cont);

    document.getElementById('cf-importar').addEventListener('click', () => document.getElementById('cf-file').click());
    document.getElementById('cf-file').addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        if (!data || typeof data !== 'object') throw new Error('Formato');
        const requeridas = ['ventas', 'productos', 'clientes'];
        if (!requeridas.every((k) => Array.isArray(data[k]))) throw new Error('Formato');
        const incluidas = TABLAS.filter((k) => k !== 'usuarios' && Array.isArray(data[k]));
        if (!incluidas.length) throw new Error('Sin datos');
        incluidas.forEach((k) => {
          if (data[k].some((it) => !it || typeof it !== 'object' || Array.isArray(it))) throw new Error('Formato');
        });
        if (!await JZAC.ui.confirmar('Restaurar este respaldo reemplazará TODOS los datos actuales de este dispositivo. Tu cuenta y licencia no cambian. ¿Continuar?', 'Restaurar respaldo')) return;
        await JZAC.db.ready;
        // Solo se restauran las tablas presentes; usuarios se conserva para no perder el acceso.
        const t = DB.transaccionLibre(incluidas, 'readwrite');
        for (const nombre of incluidas) {
          const st = t.objectStore(nombre);
          st.clear();
          for (const item of data[nombre]) st.put(item);
        }
        await new Promise((resolve, reject) => {
          t.oncomplete = resolve;
          t.onerror = () => reject(t.error);
          t.onabort = () => reject(t.error || new Error('Restauración cancelada'));
        });
        if (Array.isArray(data.cortes_caja) && window.JZAC.cortes) JZAC.cortes.escribir(data.cortes_caja);
        JZAC.ui.toast('Respaldo restaurado.', 'bien');
        render(cont);
      } catch (err) {
        JZAC.ui.toast('Archivo de respaldo no válido.', 'mal');
      }
      e.target.value = '';
    });

    document.getElementById('cf-contacto').addEventListener('click', () =>
      JZAC.negocio.wha('Hola, soy usuario de JZAC ERP. Necesito ayuda.'));

    document.getElementById('cf-ancho').value = localStorage.getItem('jzac_ancho_boleta') === '80' ? '80' : '58';
    document.getElementById('cf-ancho').addEventListener('change', (e) => {
      localStorage.setItem('jzac_ancho_boleta', e.target.value === '80' ? '80' : '58');
      JZAC.ui.toast('Ancho de boleta guardado.', 'bien');
    });
    document.getElementById('cf-probar').addEventListener('click', async () => {
      const usr = await JZAC.auth.usuarioActual();
      if (!JZAC.impresion) { JZAC.ui.toast('Carga el sistema primero.', 'mal'); return; }
      JZAC.ui.imprimirHTML(JZAC.impresion.test(usr) + '<div style="margin-top:8px"></div>', JZAC.impresion.css(JZAC.impresion.ancho()));
    });

    // ---------- apariencia (tema) ----------
    document.getElementById('cf-tema').value = window.JZAC.tema.actual();
    document.getElementById('cf-tema').addEventListener('change', (e) => {
      localStorage.setItem('jzac_tema', e.target.value === 'oscuro' ? 'oscuro' : 'claro');
      window.JZAC.tema.aplicar();
      JZAC.ui.toast('Tema actualizado.', 'bien');
    });

    // ---------- flujo rápido de la caja ----------
    for (const t of ['cf-modrap', 'cf-autoimp']) {
      const el = document.getElementById(t);
      const key = t === 'cf-modrap' ? 'jzac_modo_rapido' : 'jzac_autoimp';
      el.checked = localStorage.getItem(key) !== '0';
      el.addEventListener('change', () => {
        localStorage.setItem(key, el.checked ? '1' : '0');
        JZAC.ui.toast('Preferencia guardada.', 'bien');
      });
    }

    // ---------- punto de venta (cámara) ----------
    const elCamara = document.getElementById('cf-camara');
    elCamara.checked = JZAC.ventaRapida.camaraActiva();
    elCamara.addEventListener('change', () => {
      localStorage.setItem('jzac_pos_camara', elCamara.checked ? '1' : '0');
      JZAC.ui.toast(elCamara.checked ? 'Cámara activada.' : 'Cámara desactivada.', 'bien');
    });

    // ---------- cajón registrador ----------
    if (window.JZAC.cajon) {
      async function cajonEstado() {
        const el = document.getElementById('cf-cajon-estado');
        await JZAC.cajon.conectarPrevia();
        const n = JZAC.cajon.nombre();
        el.textContent = JZAC.cajon.soporta()
          ? (n ? `Conectado: <b>${n}</b> · se abrirá solo al cobrar en efectivo.` : 'No hay cajón conectado. Toca "Conectar cajón" y elige tu impresora USB.')
          : 'Este navegador no soporta el cajón USB. Usa Chrome o Edge.';
      }
      cajonEstado();
      document.getElementById('cf-cajon-conectar').addEventListener('click', async () => {
        try {
          await JZAC.cajon.conectar();
          JZAC.ui.toast('Cajón conectado.', 'bien');
        } catch (e) {
          JZAC.ui.toast(e && e.message ? e.message : 'No se pudo conectar.', 'mal');
        }
        cajonEstado();
      });
      document.getElementById('cf-cajon-probar').addEventListener('click', async () => {
        const ok = await JZAC.cajon.test();
        JZAC.ui.toast(ok ? '¡Cajón abierto!' : 'No se pudo abrir. Revisa la conexión.', ok ? 'bien' : 'mal');
      });
    }
  }

  window.JZAC = window.JZAC || {};
  window.JZAC.modulos = window.JZAC.modulos || {};
  window.JZAC.modulos.config = { render };
})();