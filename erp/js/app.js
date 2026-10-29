// ============================================================
// JZAC ERP - Boot: splash -> licencia -> login/registro -> app
// ============================================================
(function () {
  const app = document.getElementById('app');
  let _timerLic = null;
  let _timerSnap = null;
  let _licUser = null;
  let _licListeners = false;

  function dibujar(html) {
    app.innerHTML = html;
  }

  function o(id) { return document.getElementById(id); }

  // ---------- ayuda UX ----------
  const RE_MAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function anima(vista) {
    if (!window.gsap || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.from('.auth-logo', { scale: 0.8, opacity: 0, duration: 0.5, ease: 'back.out(1.8)', clearProps: 'all' });
    gsap.from('.auth-titulo, .auth-sub', { y: 10, opacity: 0, duration: 0.4, stagger: 0.07, delay: 0.08, clearProps: 'all' });
    gsap.from('#auth-form', { y: 16, opacity: 0, duration: 0.4, delay: 0.18, clearProps: 'all' });
    if (vista) gsap.from('.auth-caja', { y: 14, opacity: 0, duration: 0.45, ease: 'power2.out', clearProps: 'all' });
  }

  function errorCampo(input, msg) {
    const campo = input.closest('.campo');
    if (!campo) return;
    let e = campo.querySelector('.campo-error');
    if (!e) {
      e = document.createElement('div');
      e.className = 'campo-error';
      campo.appendChild(e);
    }
    e.textContent = msg || '';
    input.classList.toggle('input-mal', !!msg);
    if (msg && window.gsap && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.fromTo(input, { x: -5 }, { x: 0, duration: 0.3, ease: 'elastic.out(1, 0.4)' });
    }
  }

  function vigilaCaps(input) {
    const campo = input.closest('.campo');
    const aviso = campo && campo.querySelector('.auth-caps');
    if (!aviso) return;
    const revisa = (e) => {
      if (!e.getModifierState) return;
      aviso.style.display = e.getModifierState('CapsLock') ? 'flex' : 'none';
    };
    input.addEventListener('keydown', revisa);
    input.addEventListener('keyup', revisa);
    input.addEventListener('blur', () => { aviso.style.display = 'none'; });
  }

  function vinculaOjos() {
    document.querySelectorAll('[data-ver]').forEach((b) => {
      b.addEventListener('click', () => {
        const inp = document.getElementById(b.dataset.ver);
        if (!inp) return;
        const ver = inp.type === 'password';
        inp.type = ver ? 'text' : 'password';
        b.classList.toggle('on', ver);
        b.textContent = ver ? '🙈' : '👁';
        inp.focus();
      });
    });
  }

  async function conCarga(btn, texto, fn) {
    if (btn.dataset.cargando) return;
    btn.dataset.cargando = '1';
    const html = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="spin"></span> ${texto}`;
    try {
      await fn();
    } catch (err) {
      btn.disabled = false;
      delete btn.dataset.cargando;
      btn.innerHTML = html;
      throw err;
    }
  }

  // ---------- login / registro ----------
  function vistaAuth() {
    const splash = document.getElementById('splash');
    if (splash) splash.classList.add('hidden');
    dibujar(`
      <div class="auth auth-login">
        <div class="auth-escena">
          <aside class="auth-visual">
            <div class="av-top">
              <span class="av-marca"><img src="./icons/icono.svg" alt=""> JZAC ERP</span>
              <span class="av-estado"><i></i> En línea</span>
            </div>
            <div class="av-copy">
              <h2>Tu negocio,<br><em>en orden.</em></h2>
              <p>Ventas, inventario, boletas y caja desde un solo lugar.</p>
            </div>
            <div class="av-paneles">
              <button type="button" class="av-card av-ventas on" data-av="ventas">
                <span>Ventas de hoy</span>
                <b>S/ 1,280.50</b>
                <small>+18% vs. ayer</small>
                <span class="av-bars" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>
              </button>
              <button type="button" class="av-card av-boleta" data-av="boletas">
                <span>Boleta B001-1042</span>
                <b>S/ 35.90</b>
                <small>Emitida hace un momento</small>
              </button>
              <button type="button" class="av-card av-stock" data-av="stock">
                <span>Stock bajo</span>
                <b>3 productos</b>
                <small>Revisar inventario</small>
              </button>
            </div>
            <div class="av-puntos" role="group" aria-label="Vista previa del sistema">
              <button type="button" class="av-punto on" data-av="ventas">Ventas</button>
              <button type="button" class="av-punto" data-av="boletas">Boletas</button>
              <button type="button" class="av-punto" data-av="stock">Inventario</button>
            </div>
          </aside>
          <div class="auth-caja">
            <div class="auth-logo"><img src="./icons/icono.svg" alt="JZAC ERP"></div>
            <div class="auth-titulo">JZAC ERP</div>
            <div class="auth-sub">Software que trabaja por tu negocio</div>
            <div id="auth-form"></div>
          </div>
        </div>
      </div>`);
    anima(true);

    const escena = document.querySelector('.auth-escena');
    if (escena && window.matchMedia('(hover: hover)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      escena.addEventListener('pointermove', (e) => {
        const r = escena.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        escena.style.setProperty('--ry', (x * 3).toFixed(2) + 'deg');
        escena.style.setProperty('--rx', (-y * 3).toFixed(2) + 'deg');
        escena.style.setProperty('--mx', ((x + 0.5) * 100).toFixed(1) + '%');
        escena.style.setProperty('--my', ((y + 0.5) * 100).toFixed(1) + '%');
      });
      escena.addEventListener('pointerleave', () => {
        escena.style.setProperty('--ry', '0deg');
        escena.style.setProperty('--rx', '0deg');
      });
    }

    const puntos = document.querySelectorAll('.av-punto');
    if (puntos.length) {
      const enfocar = (clave) => {
        puntos.forEach((p) => p.classList.toggle('on', p.dataset.av === clave));
        document.querySelectorAll('.av-card').forEach((c) => c.classList.toggle('on', c.dataset.av === clave));
      };
      puntos.forEach((p) => p.addEventListener('click', () => enfocar(p.dataset.av)));
      document.querySelectorAll('.av-card').forEach((c) => c.addEventListener('click', () => enfocar(c.dataset.av)));
    }

    function formLogin() {
      const ultimo = localStorage.getItem('jzac_ultimo_correo') || '';
      o('auth-form').innerHTML = `
        <form id="frm" novalidate>
          <div class="campo">
            <label>Correo electrónico</label>
            <input type="email" id="a-correo" autocomplete="username" inputmode="email"
              autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="tu@correo.com" value="${ultimo.replace(/"/g, '&quot;')}">
          </div>
          <div class="campo">
            <label>Contraseña</label>
            <div class="auth-input-wrap">
              <input type="password" id="a-password" autocomplete="current-password" placeholder="Tu contraseña">
              <button type="button" class="auth-eye" data-ver="a-password" aria-label="Mostrar u ocultar contraseña">👁</button>
            </div>
            <div class="auth-caps" style="display:none">⚠ Mayúsculas activadas (Caps Lock)</div>
          </div>
          <button class="btn btn-primario btn-bloco" type="submit">Ingresar</button>
        </form>
        <div class="auth-enlace">¿No tienes cuenta? <a id="a-ir-reg">Regístrate gratis</a></div>
        <div class="auth-enlace"><a id="a-ir-wha" style="color:#128C7E">¿Problemas para entrar? Escríbenos</a></div>`;
      vinculaOjos();
      vigilaCaps(o('a-password'));
      const correo = o('a-correo');
      const pass = o('a-password');
      if (ultimo) pass.focus(); else correo.focus();

      o('frm').addEventListener('submit', async (e) => {
        e.preventDefault();
        errorCampo(correo, '');
        errorCampo(pass, '');
        let malo = false;
        if (!correo.value.trim()) { errorCampo(correo, 'Escribe tu correo.'); malo = true; }
        else if (!RE_MAIL.test(correo.value.trim())) { errorCampo(correo, 'Ese correo no parece válido.'); malo = true; }
        if (!pass.value) { errorCampo(pass, 'Escribe tu contraseña.'); malo = true; }
        if (malo) return;
        try {
          const btn = e.submitter || o('frm').querySelector('button[type=submit]');
          await conCarga(btn, 'Ingresando...', async () => {
            const u = await JZAC.auth.login(correo.value, pass.value);
            localStorage.setItem('jzac_ultimo_correo', correo.value.trim().toLowerCase());
            JZAC.auth.guardarSesion(u);
            return continuarLicencia(u);
          });
        } catch (err) { JZAC.ui.toast(err.message, 'mal'); }
      });
      o('a-ir-reg').addEventListener('click', () => { formRegistro(); soloForm(); });
      o('a-ir-wha').addEventListener('click', () => JZAC.negocio.wha('Hola, tengo un problema para ingresar a JZAC ERP.'));
    }

    function formRegistro() {
      o('auth-form').innerHTML = `
        <form id="frm" novalidate>
          <div class="campo">
            <label>Nombre del negocio</label>
            <input id="r-negocio" placeholder="Ej. Mi Bodega" autocomplete="organization">
          </div>
          <div class="campo">
            <label>Tu nombre</label>
            <input id="r-nombre" placeholder="Cómo te llamas" autocomplete="name">
          </div>
          <div class="campo">
            <label>Correo electrónico</label>
            <input type="email" id="r-correo" placeholder="tu@correo.com" inputmode="email"
              autocapitalize="none" autocorrect="off" spellcheck="false" autocomplete="email">
          </div>
          <div class="campo">
            <label>Contraseña</label>
            <div class="auth-input-wrap">
              <input type="password" id="r-password" autocomplete="new-password" placeholder="Mínimo 4 caracteres">
              <button type="button" class="auth-eye" data-ver="r-password" aria-label="Mostrar u ocultar contraseña">👁</button>
            </div>
            <div class="auth-caps" style="display:none">⚠ Mayúsculas activadas (Caps Lock)</div>
            <div class="auth-fuerza" id="r-fuerza">Mínimo 4 caracteres</div>
          </div>
          <button class="btn btn-primario btn-bloco" type="submit">Crear mi cuenta</button>
        </form>
        <div class="auth-enlace">¿Ya tienes cuenta? <a id="a-ir-login">Inicia sesión</a></div>`;
      vinculaOjos();
      vigilaCaps(o('r-password'));
      const fuerza = o('r-fuerza');
      o('r-password').addEventListener('input', () => {
        const n = o('r-password').value.length;
        if (n === 0) { fuerza.textContent = 'Mínimo 4 caracteres'; fuerza.classList.remove('ok'); }
        else if (n < 4) { fuerza.textContent = `${n}/4 · muy corta`; fuerza.classList.remove('ok'); }
        else { fuerza.textContent = '✓ Contraseña lista'; fuerza.classList.add('ok'); }
      });
      errorCampo(o('r-correo'), '');

      o('frm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const negocio = o('r-negocio'), nombre = o('r-nombre'), mail = o('r-correo'), pass = o('r-password');
        [negocio, nombre, mail, pass].forEach((i) => errorCampo(i, ''));
        let malo = false;
        if (!negocio.value.trim()) { errorCampo(negocio, 'Pon el nombre de tu negocio.'); malo = true; }
        if (!nombre.value.trim()) { errorCampo(nombre, 'Pon tu nombre.'); malo = true; }
        if (!mail.value.trim()) { errorCampo(mail, 'Escribe tu correo.'); malo = true; }
        else if (!RE_MAIL.test(mail.value.trim())) { errorCampo(mail, 'Ese correo no parece válido.'); malo = true; }
        if (pass.value.length < 4) { errorCampo(pass, 'La contraseña necesita 4 caracteres como mínimo.'); malo = true; }
        if (malo) return;
        try {
          const btn = e.submitter || o('frm').querySelector('button[type=submit]');
          await conCarga(btn, 'Creando tu cuenta...', async () => {
            const u = await JZAC.auth.registrar(nombre.value, negocio.value, mail.value, pass.value);
            localStorage.setItem('jzac_ultimo_correo', mail.value.trim().toLowerCase());
            JZAC.auth.guardarSesion(u);
            vistaIniciarPrueba(u);
          });
        } catch (err) { JZAC.ui.toast(err.message, 'mal'); }
      });
      o('a-ir-login').addEventListener('click', () => { formLogin(); soloForm(); });
    }

    function soloForm() {
      if (window.gsap && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        gsap.from('#auth-form', { y: 10, opacity: 0, duration: 0.28, ease: 'power2.out', clearProps: 'all' });
      }
    }

    formLogin();
  }

  // ---------- vista licencia ----------
  function vistaIniciarPrueba(u) {
    const splash = document.getElementById('splash');
    dibujar(`
      <div class="auth">
        <div class="auth-caja">
          <div class="auth-logo"><img src="./icons/icono.svg" alt="JZAC ERP"></div>
          <div class="auth-titulo">Bienvenido a JZAC ERP</div>
          <div class="auth-sub">${JZAC.ui.esc(u.nombreNegocio)}</div>
          <div class="card" style="border:1px solid var(--borde);box-shadow:none">
            <div style="font-size:38px;text-align:center">S</div>
            <h3 class="center" style="margin:4px 0">Prueba gratis por 7 días</h3>
            <p class="texto-suave center" style="font-size:14px">Prueba el sistema completo. Cuando termine la prueba, activa tu licencia para seguir usando JZAC ERP de por vida.</p>
          </div>
          <div class="campo mt16">
            <label>Tu WhatsApp</label>
            <input id="p-telefono" type="tel" inputmode="tel" placeholder="Ej: 999 888 777" autocomplete="off">
            <div class="texto-suave" style="font-size:12px;margin-top:4px">Solo para tu prueba. Un número = una prueba.</div>
          </div>
          <button class="btn btn-primario btn-bloco mt16" id="p-iniciar">Iniciar prueba de 7 días</button>
          <button class="btn btn-bloco mt16" id="p-codigo">Ya tengo un código de activación</button>
        </div>
      </div>`);

    const telPrueba = o('p-telefono');
    if (telPrueba && window.__JZAC_TEL__) telPrueba.value = String(window.__JZAC_TEL__).replace(/\D/g, '');

    o('p-iniciar').addEventListener('click', async () => {
      const telField = o('p-telefono');
      const tel = telField ? telField.value.trim() : '';
      const digits = tel.replace(/\D/g, '');
      if (telField && digits.length < 6) {
        JZAC.ui.toast('Ingresa tu número de WhatsApp (con código de país).', 'mal');
        if (telField) telField.focus();
        return;
      }
      const btn = o('p-iniciar');
      btn.disabled = true;
      btn.textContent = 'Iniciando…';
      try {
        const est = await JZAC.lic.iniciarPrueba(u.nombreNegocio, u.correo, digits);
        if (est && est.tipo === 'error') {
          btn.disabled = false;
          btn.textContent = 'Iniciar prueba de 7 días';
          const msg = est.error === 'sin-conexion' ? 'Necesitas conexión a internet para iniciar la prueba.'
            : est.error ? `Error: ${est.error}` : 'No se pudo iniciar la prueba. Intenta de nuevo.';
          JZAC.ui.toast(msg, 'mal');
          return;
        }
        if (est && (est.tipo === 'vencida' || est.tipo === 'bloqueada')) { vistaBloqueada(u, est); return; }
        JZAC.mostrarApp(u);
        vigilarLicencia(u);
      } catch (e) {
        btn.disabled = false;
        btn.textContent = 'Iniciar prueba de 7 días';
        JZAC.ui.toast('Error inesperado al iniciar la prueba: ' + (e.message || e), 'mal');
      }
    });
    o('p-codigo').addEventListener('click', () => modalActivacion(u, true));
    if (splash) splash.classList.add('hidden');
  }

  function vistaBloqueada(u, est) {
    if (_timerLic) { clearInterval(_timerLic); _timerLic = null; }
    const splash = document.getElementById('splash');
    const equipo = est && est.motivo === 'equipo-licenciado';
    const noAuto = est && est.motivo === 'equipo-no-autorizado';
    const titulo = equipo ? 'Este equipo ya tiene una licencia' : noAuto ? 'Equipo no autorizado' : 'Tu prueba ha terminado';
    const texto = equipo
      ? 'Inicia sesión con la cuenta que compró la licencia o pide a tu vendedor que libere este equipo.'
      : noAuto
        ? 'Esta licencia está activa en otro equipo. Pide a tu vendedor que libere este equipo para poder activarlo.'
        : 'Activa tu licencia con el código que te entregó tu vendedor para seguir usando JZAC ERP. Es un pago único, de por vida.';
    dibujar(`
      <div class="auth">
        <div class="auth-caja bloqueada">
          <div class="auth-logo"><img src="./icons/icono.svg" alt="JZAC ERP"></div>
          <div class="gran">!</div>
          <h2>${titulo}</h2>
          <p>${texto}</p>
          <button class="btn btn-primario btn-bloco mt16" id="b-activar">Activar licencia</button>
          <button class="btn btn-whatsapp btn-bloco mt16" id="b-wha">Hablar con el vendedor</button>
        </div>
      </div>`);
    o('b-activar').addEventListener('click', () => modalActivacion(u, false));
    o('b-wha').addEventListener('click', () => JZAC.negocio.wha('Hola, quiero activar la licencia de JZAC ERP.'));
    if (splash) splash.classList.add('hidden');
  }

  function aplicarLicencia(u, est) {
    if (!est) return;
    if (est.tipo === 'activada' || (est.tipo === 'prueba' && est.inicio)) {
      if (!document.getElementById('titulo-mod')) {
        JZAC.mostrarApp(u);
        vigilarLicencia(u);
      }
      return;
    }
    if (est.tipo === 'vencida' || est.tipo === 'bloqueada') vistaBloqueada(u, est);
  }

  function vigilarLicencia(u) {
    _licUser = u;
    if (_timerLic) clearInterval(_timerLic);
    const revisar = () => {
      const actual = _licUser;
      if (!actual) return;
      JZAC.lic.sincronizar(actual).then((est) => aplicarLicencia(actual, est)).catch(() => {});
    };
    _timerLic = setInterval(revisar, 6 * 3600000);
    if (_timerSnap) clearInterval(_timerSnap);
    _timerSnap = setInterval(() => { JZAC.backup.hacerSnapshot(); }, 30 * 60 * 1000);
    if (_licListeners) return;
    _licListeners = true;
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { revisar(); JZAC.backup.hacerSnapshot(); } });
    window.addEventListener('online', () => { revisar(); JZAC.backup.hacerSnapshot(); });
  }

  async function continuarLicencia(u) {
    await JZAC.lic.inicializar(u);
    JZAC.backup.hacerSnapshot();
    const splash = document.getElementById('splash');
    if (splash) splash.classList.add('hidden');
    const est = JZAC.lic.estado(u);
    JZAC.lic.sincronizar(u).then((e) => aplicarLicencia(u, e)).catch(() => {});
    if (est.tipo === 'activada') { JZAC.mostrarApp(u); vigilarLicencia(u); return; }
    if (est.tipo === 'prueba' && est.inicio) { JZAC.mostrarApp(u); vigilarLicencia(u); return; }
    if (est.tipo === 'vencida' || est.tipo === 'bloqueada') { vistaBloqueada(u, est); return; }
    vistaIniciarPrueba(u);
  }

  // ---------- modal activacion ----------
  function modalActivacion(u, reInicia) {
    const m = JZAC.ui.modal(`
      <div class="modal-hdr"><h3>Activar licencia</h3><button class="cierre" data-cerrar>×</button></div>
      <div class="texto-suave" style="font-size:13px;margin-bottom:10px">El código es personal de tu negocio (<b>${JZAC.ui.esc(u.nombreNegocio)}</b>). Ingresa el formato XXXX-XXXX-XXXX.</div>
      <div class="campo"><label>Código de activación</label><input id="lc-codigo" placeholder="XXXX-XXXX-XXXX" autocomplete="off" style="text-transform:uppercase;letter-spacing:2px"></div>`,
      `<button class="btn" data-cerrar>Cancelar</button>
       <button class="btn btn-primario" id="lc-activar">Activar</button>`,
      true);

    m.raiz.querySelector('#lc-activar').addEventListener('click', async () => {
      const codigo = o('lc-codigo').value.trim().toUpperCase();
      if (!codigo) { JZAC.ui.toast('Ingresa tu código.', 'mal'); return; }
      const btn = o('lc-activar');
      btn.disabled = true;
      const r = await JZAC.lic.activar(u.nombreNegocio, codigo, u.correo);
      if (!r || !r.ok) {
        btn.disabled = false;
        const msg = r && r.error === 'sin-conexion' ? 'Sin conexión al activar. Intenta de nuevo.'
          : r && r.error === 'limite-equipos' ? 'Esta licencia ya está activa en otro equipo. Pide al vendedor que libere este equipo.'
          : r && r.error === 'demasiados-intentos' ? 'Demasiados intentos. Espera unos minutos.'
          : 'Código no válido para este negocio.';
        JZAC.ui.toast(msg, 'mal');
        return;
      }
      JZAC.ui.toast('Licencia activada. Gracias por confiar en JZAC.', 'bien');
      m.cerrar();
      continuarLicencia(u);
    });
  }

  async function mostrarVendedor() {
    const u = await JZAC.auth.usuarioActual();
    const m = JZAC.ui.modal(`
      <div class="modal-hdr"><h3>Herramientas de vendedor</h3><button class="cierre" data-cerrar>×</button></div>
      <div class="texto-suave" style="font-size:13px;margin-bottom:10px">Solo para el dueño del sistema. El PIN no se guarda en el equipo.</div>
      <div class="campo"><label>PIN del vendedor</label><input type="password" id="sv-pin" placeholder="PIN" autocomplete="off"></div>
      <div class="campo"><label>Negocio del cliente</label><input id="sv-negocio" value="${u ? JZAC.ui.esc(u.nombreNegocio) : ''}"></div>
      <div class="campo"><label>Correo del cliente</label><input type="email" id="sv-correo" value="${u ? JZAC.ui.esc(u.correo) : ''}" autocomplete="off"></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-primario" id="sv-gen">Generar código</button>
        <button class="btn" id="sv-lib">Liberar equipo</button>
      </div>
      <div id="sv-res" style="margin-top:12px"></div>`,
      `<button class="btn" data-cerrar>Cerrar</button>`, true);

    const pin = () => o('sv-pin').value.trim();
    const negocio = () => o('sv-negocio').value.trim();
    const correo = () => o('sv-correo').value.trim();

    o('sv-gen').addEventListener('click', async () => {
      if (!pin() || !negocio()) { JZAC.ui.toast('Completa PIN y negocio.', 'mal'); return; }
      const btn = o('sv-gen');
      btn.disabled = true;
      const r = await JZAC.lic.generarCodigo(pin(), negocio());
      btn.disabled = false;
      if (!r || !r.ok) {
        JZAC.ui.toast(r && r.error === 'pin-invalido' ? 'PIN incorrecto.' : r && r.error === 'demasiados-intentos' ? 'Demasiados intentos. Espera.' : 'No se pudo generar. Revisa la conexión.', 'mal');
        return;
      }
      o('sv-res').innerHTML = `<div class="card" style="background:var(--bg)">
        <div class="texto-suave" style="font-size:12px">Código para ${JZAC.ui.esc(r.nombre)}</div>
        <div class="negrita center" style="letter-spacing:3px;font-size:18px">${JZAC.ui.esc(r.codigo)}</div>
        <button class="btn btn-sm btn-bloco mt16" id="sv-copiar">Copiar código</button>
      </div>`;
      o('sv-copiar').addEventListener('click', () => navigator.clipboard.writeText(r.codigo).then(() => JZAC.ui.toast('Código copiado.')));
    });

    o('sv-lib').addEventListener('click', async () => {
      if (!pin() || !negocio() || !correo()) { JZAC.ui.toast('Completa PIN, negocio y correo.', 'mal'); return; }
      if (!await JZAC.ui.confirmar('¿Liberar este equipo para que la licencia se pueda activar en otro?', 'Liberar equipo')) return;
      const btn = o('sv-lib');
      btn.disabled = true;
      const r = await JZAC.lic.liberar(pin(), negocio(), correo());
      btn.disabled = false;
      if (!r || !r.ok) {
        JZAC.ui.toast(r && r.error === 'pin-invalido' ? 'PIN incorrecto.' : r && r.error === 'licencia-no-encontrada' ? 'No encontré esa licencia.' : 'No se pudo liberar. Revisa la conexión.', 'mal');
        return;
      }
      JZAC.ui.toast('Equipo liberado. Ya puedes activar en otro.', 'bien');
    });
  }

  // exponer para config/dashboard
  window.JZAC.mostrarEstadoLicencia = async function () {
    const u = await JZAC.auth.usuarioActual();
    if (!u) return;
    const est = JZAC.lic.estado(u);
    if (est.tipo === 'activada') {
      JZAC.ui.toast('Tu licencia está activa.', 'bien');
      return;
    }
    if (est.tipo === 'prueba' && est.inicio) {
      JZAC.ui.toast(`Prueba activa: quedan ${est.diasRestantes} día(s).`, 'bien');
      modalActivacion(u, false);
      return;
    }
    if (est.tipo === 'vencida' || est.tipo === 'bloqueada') { vistaBloqueada(u, est); return; }
    vistaIniciarPrueba(u);
  };

  window.JZAC.mostrarVendedor = mostrarVendedor;

  function errorFatal(msg) {
    const splash = document.getElementById('splash');
    if (splash) splash.classList.add('hidden');
    document.body.innerHTML = `<div style="max-width:520px;margin:15vh auto;padding:24px;font-family:system-ui,sans-serif;text-align:center">
      <h2 style="margin:0 0 10px">No se pudo abrir JZAC ERP</h2>
      <p style="color:#666;line-height:1.5">${msg}</p>
      <button onclick="location.reload()" style="margin-top:12px;padding:10px 18px;border:0;border-radius:8px;background:#1a5fb4;color:#fff;font-weight:600">Recargar</button>
    </div>`;
  }

  async function boot() {
    try {
      localStorage.removeItem('jzac_padron_cache_v1');
      localStorage.removeItem('jzac_padron_dni_token');
    } catch (e) {}
    try { await DB.ready; } catch (e) {
      console.error('IndexedDB no disponible', e);
      errorFatal('El navegador no pudo abrir la base de datos local. Revisa el espacio disponible o el modo privado e intenta de nuevo.');
      return;
    }
    if (window.JZAC && JZAC.tema) { JZAC.tema.aplicar(); }
    if ('serviceWorker' in navigator) {
      try { navigator.serviceWorker.register('./sw.js'); } catch (e) { /* sin SW */ }
    }
    const u = await JZAC.auth.usuarioActual();
    if (!u) { vistaAuth(); return; }
    await continuarLicencia(u);
  }

  boot().catch((e) => { console.error(e); errorFatal('Ocurrió un error inesperado al iniciar. Recarga la página.'); });
})();