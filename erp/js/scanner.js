// ============================================================
// JZAC ERP - Escáner de códigos de barras y QR (cámara)
// BarcodeDetector nativo (Chrome/Android) + jsQR (respaldo)
// ============================================================
(function () {
  const FORMATOS = ['qr_code', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'codabar', 'itf', 'data_matrix'];

  let detectorNativo = null;
  let soporteNativo = null;
  let repintarTicketActual = null;

  async function preparaNativo() {
    if (soporteNativo !== null) return soporteNativo;
    try {
      if (!('BarcodeDetector' in window)) { soporteNativo = false; return false; }
      const dispo = await BarcodeDetector.getSupportedFormats();
      const usables = (dispo || []).filter((f) => FORMATOS.includes(f));
      if (usables.length === 0) { soporteNativo = false; return false; }
      detectorNativo = new BarcodeDetector({ formats: usables });
      soporteNativo = true;
      return true;
    } catch (e) { soporteNativo = false; return false; }
  }

  function cargarJsQR() {
    if (window.jsQR) return Promise.resolve(true);
    return new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = './lib/jsqr.min.js';
      s.onload = () => resolve(!!window.jsQR);
      s.onerror = () => resolve(false);
      document.head.appendChild(s);
    });
  }

  async function pedirCamara() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 } }, audio: false
      });
      return stream;
    } catch (e) { return null; }
  }

  // ---------- modal propio (control total de la cámara) ----------
  // Vive en un contenedor aparte (document.body) para NO reemplazar el
  // modal que pudiera estar abierto debajo (ej. el formulario de producto
  // o de nueva venta). Así, al escanear y volver, el formulario sigue ahí.
  function modalPropio(html, pie) {
    const raiz = document.createElement('div');
    raiz.id = 'scan-raiz';
    raiz.innerHTML = `<div class="modal-fondo"><div class="modal amplio">${html}${pie ? `<div class="modal-pie">${pie}</div>` : ''}</div></div>`;
    document.body.appendChild(raiz);
    const fondo = raiz.firstElementChild;
    return { raiz, fondo, cerrar: () => { raiz.remove(); } };
  }

  /**
   * JZAC.escanear({titulo, multiple, onDeteccion}) -> Promise<{texto, formato} | null>
   * null = el usuario canceló.
   * multiple + onDeteccion: la cámara queda abierta y cada código detectado
   * llama a onDeteccion(texto). Si el callback devuelve 'cerrar', se cierra.
   */
  async function escanear(opciones) {
    const titulo = (opciones && opciones.titulo) || 'Escanear código';
    const multiple = !!(opciones && opciones.multiple && opciones.onDeteccion);
    const onDet = (opciones && opciones.onDeteccion) || null;
    const ticket = (multiple && opciones.ticket) ? opciones.ticket : null;
    const onCobrar = (multiple && opciones.onCobrar) ? opciones.onCobrar : null;
    const m = modalPropio(`
      <div class="modal-hdr"><h3>${titulo}</h3><button class="cierre" id="scan-cerrar">×</button></div>
      <div class="scan-caja">
        <video id="scan-video" playsinline muted></video>
        <div class="scan-reticula"></div>
        <div class="scan-aviso" id="scan-aviso">Apunta la cámara al código...</div>
      </div>
      <div id="scan-ticket" class="scan-ticket" style="display:none"></div>
      <input id="scan-manual" class="scan-manual" placeholder="O escribe el código a mano..." autocomplete="off">
      <div id="scan-detalle" class="texto-suave" style="font-size:12px;margin-top:6px"></div>`,
      `<button class="btn" id="scan-cancelar">Cancelar</button>
       <button class="btn btn-primario" id="scan-conf">${multiple ? 'Listo' : 'Usar este código'}</button>`);

    const video = m.raiz.querySelector('#scan-video');
    const aviso = m.raiz.querySelector('#scan-aviso');
    const detalle = m.raiz.querySelector('#scan-detalle');
    const manual = m.raiz.querySelector('#scan-manual');
    const btnConf = m.raiz.querySelector('#scan-conf');
    const cajaTicket = m.raiz.querySelector('#scan-ticket');

    function pintaTicket() {
      if (!ticket || !cajaTicket) return;
      let data = null;
      try { data = ticket(); } catch (e) { data = null; }
      const its = (data && data.items) || [];
      const total = Number((data && data.total) || 0);
      cajaTicket.style.display = '';
      cajaTicket.innerHTML =
        `<div class="ticket-cab">Ticket en vivo · ${its.length} ${its.length === 1 ? 'producto' : 'productos'}</div>` +
        (its.length
          ? `<div class="ticket-lista">${its.map((it, i) => `
              <div class="ticket-item${i === its.length - 1 ? ' nuevo' : ''}">
                <span class="ticket-num">${i + 1}</span>
                <span class="ticket-nom">${JZAC.ui.esc(it.nombre)}<small>${JZAC.ui.dinero(it.precio)} c/u · ${it.esPeso ? JZAC.ui.n(it.cantidad) + ' kg' : JZAC.ui.n(it.cantidad) + ' u'}</small></span>
                <span class="ticket-imp">${JZAC.ui.dinero(it.precio * it.cantidad)}</span>
              </div>`).join('')}</div>`
          : '<div class="ticket-vacio">Apunta la cámara a un código: los productos van apareciendo aquí solos.</div>') +
        `<div class="ticket-total"><span>TOTAL</span><b>${JZAC.ui.dinero(total)}</b></div>
         <div class="ticket-btns">
           <button class="btn" id="scan-ver">Ver carrito</button>
           <button class="btn btn-primario" id="scan-cobrar">Cobrar</button>
         </div>`;
      const ver = cajaTicket.querySelector('#scan-ver');
      if (ver) ver.addEventListener('click', () => terminar(null));
      const cob = cajaTicket.querySelector('#scan-cobrar');
      if (cob) cob.addEventListener('click', () => { const cb = onCobrar; terminar(null); if (cb) cb(); });
      const lista = cajaTicket.querySelector('.ticket-lista');
      if (lista) lista.scrollTop = lista.scrollHeight;
    }
    repintarTicketActual = ticket ? pintaTicket : null;
    if (ticket) pintaTicket();

    let stream = null;
    let parado = false;
    let fin = false;
    let modo = 'nativo';
    let agregados = 0;
    let ultimoAdd = { cod: null, t: 0 };
    let codFuera = true;

    function procesaMulti(texto) {
      const t = String(texto || '').trim();
      if (!t) return false;
      const ahora = Date.now();
      if (t === ultimoAdd.cod) {
        const rearmado = codFuera && ahora - ultimoAdd.t >= 700;
        if (!rearmado) return false;
      }
      const r = onDet(t);
      if (r === 'cerrar') { terminar(null); return false; }
      ultimoAdd = { cod: t, t: ahora };
      codFuera = false;
      agregados++;
      if (btnConf) btnConf.textContent = `Listo (${agregados})`;
      if (aviso) aviso.textContent = `✓ ${agregados} agregado(s) · apunta el siguiente`;
      pintaTicket();
      return true;
    }

    function marcaAusencia() {
      if (ultimoAdd.cod && !codFuera && Date.now() - ultimoAdd.t > 350) codFuera = true;
    }

    function detener() {
      if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
      if (video) video.srcObject = null;
    }

    function terminar(valor) {
      if (fin) return;
      fin = true;
      parado = true;
      repintarTicketActual = null;
      detener();
      m.cerrar();
      resolver(valor);
    }

    let resolver;
    const promesa = new Promise((r) => { resolver = r; });

    const videoListo = new Promise((res) => {
      video.addEventListener('loadedmetadata', res, { once: true });
    });

    async function bucleNativo() {
      if (parado) return;
      try {
        const res = await detectorNativo.detect(video);
        if (res && res.length) {
          const texto = String(res[0].rawValue || '');
          if (multiple) {
            procesaMulti(texto);
            setTimeout(bucleNativo, 220);
            return;
          }
          terminar({ texto, formato: res[0].format || 'desconocido' });
          return;
        }
        marcaAusencia();
      } catch (e) { /* frame no listo */ }
      setTimeout(bucleNativo, 220);
    }

    async function bucleJsQR() {
      if (parado) return;
      if (!video.videoWidth) { setTimeout(bucleJsQR, 160); return; }
      const maxW = 680;
      const escala = Math.min(1, maxW / video.videoWidth);
      const w = Math.round(video.videoWidth * escala);
      const h = Math.round(video.videoHeight * escala);
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      const ctx = cv.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(video, 0, 0, w, h);
      const img = ctx.getImageData(0, 0, w, h);
      const q = window.jsQR(img.data, w, h, { inversionAttempts: 'dontInvert' });
      if (q && q.data) {
        if (multiple) {
          procesaMulti(String(q.data));
          setTimeout(bucleJsQR, 160);
          return;
        }
        terminar({ texto: String(q.data), formato: 'qr_code' });
        return;
      }
      marcaAusencia();
      setTimeout(bucleJsQR, 160);
    }

    async function iniciarCamara() {
      stream = await pedirCamara();
      if (!stream) {
        aviso.textContent = 'No se pudo abrir la cámara. Escribe el código abajo.';
        detalle.textContent = 'Acepta el permiso de cámara cuando el navegador lo pida, o ingresa el código manualmente.';
        manual.focus();
        return;
      }
      video.srcObject = stream;
      try { await video.play(); } catch (e) { /* autoplay muted ok */ }
      await videoListo;

      if (await preparaNativo()) {
        modo = 'nativo';
        bucleNativo();
      } else if (await cargarJsQR()) {
        modo = 'jsqr';
        bucleJsQR();
      } else {
        aviso.textContent = 'Escribe el código abajo (sin escáner en este navegador).';
        manual.focus();
      }
    }

    m.raiz.querySelector('#scan-cerrar').addEventListener('click', () => terminar(null));
    m.raiz.querySelector('#scan-cancelar').addEventListener('click', () => terminar(null));
    m.fondo.addEventListener('click', (e) => { if (e.target === m.fondo) terminar(null); });
    const confimarManual = () => {
      const t = manual.value.trim();
      if (t) { terminar({ texto: t, formato: 'manual' }); return; }
      if (multiple && agregados > 0) { terminar(null); return; }
      JZAC.ui.toast('Escribe primero un código.', 'mal');
    };
    m.raiz.querySelector('#scan-conf').addEventListener('click', confimarManual);
    manual.addEventListener('keydown', (e) => { if (e.key === 'Enter') confimarManual(); });

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      iniciarCamara();
    } else {
      aviso.textContent = 'Este navegador no permite usar la cámara. Escribe el código abajo.';
      manual.focus();
    }

    return promesa;
  }

  /**
   * JZAC.productoPorCodigo(lista, texto) -> producto | null
   * Busca coincidencia exacta por campo codigo o barra.
   */
  function productoPorCodigo(lista, texto) {
    const t = String(texto || '').trim().toLowerCase();
    if (!t) return null;
    return (lista || []).find((p) =>
      [p.codigo, p.barra].some((c) => String(c || '').trim().toLowerCase() === t)) || null;
  }

  window.JZAC = window.JZAC || {};
  window.JZAC.escanear = escanear;
  window.JZAC.productoPorCodigo = productoPorCodigo;
  window.JZAC.refrescarTicketScan = () => { if (repintarTicketActual) repintarTicketActual(); };
})();