// ============================================================
// JZAC ERP - Bloqueo por PIN y auto-bloqueo por inactividad
// ============================================================
(function () {
  const IDLE_KEY = 'jzac_lock_idle_min';
  const IDLE_DEFAULT = 5;
  const OCULTO_LIMITE_MS = 60 * 1000;

  let _usuario = null;
  let _bloqueado = false;
  let _idleTimer = null;
  let _ultActividad = 0;
  let _ocultoDesde = 0;
  let _listeners = false;
  let _authFresh = false;

  function hexABytes(hex) {
    const s = String(hex || '');
    const out = new Uint8Array(Math.floor(s.length / 2));
    for (let i = 0; i < out.length; i++) out[i] = parseInt(s.substr(i * 2, 2), 16);
    return out;
  }

  function tienePin(u) { return !!(u && u.appPinHash && u.appPinSalt); }

  function idleMin() {
    const v = Number(localStorage.getItem(IDLE_KEY));
    return Number.isFinite(v) && v >= 1 ? v : IDLE_DEFAULT;
  }
  function setIdleMin(m) {
    try { localStorage.setItem(IDLE_KEY, String(Math.max(1, Math.min(60, Number(m) || IDLE_DEFAULT)))); } catch (e) {}
  }

  async function verificarPin(u, pin) {
    if (!tienePin(u) || !pin) return false;
    try {
      const { hash } = await JZAC.auth.hashPassword(u.correo, pin, hexABytes(u.appPinSalt));
      return hash === u.appPinHash;
    } catch (e) { return false; }
  }

  async function setPin(u, pin) {
    const { hash, salt } = await JZAC.auth.hashPassword(u.correo, pin);
    u.appPinHash = hash;
    u.appPinSalt = salt;
    await JZAC.db.guardar('usuarios', u);
  }

  async function quitarPin(u) {
    delete u.appPinHash;
    delete u.appPinSalt;
    await JZAC.db.guardar('usuarios', u);
  }

  function timerActivo() {
    if (!_usuario || !tienePin(_usuario) || _bloqueado) return false;
    return true;
  }

  function reiniciarIdle() {
    clearTimeout(_idleTimer);
    _idleTimer = null;
    if (!timerActivo()) return;
    _idleTimer = setTimeout(bloquear, idleMin() * 60000);
  }

  function actividad() {
    const ahora = Date.now();
    if (ahora - _ultActividad < 800) return;
    _ultActividad = ahora;
    reiniciarIdle();
  }

  function agregarBoton() {
    if (document.getElementById('btn-lock')) return;
    const topbar = document.querySelector('.topbar');
    if (!topbar) return;
    const b = document.createElement('button');
    b.id = 'btn-lock';
    b.className = 'btn btn-sm btn-suave';
    b.type = 'button';
    b.title = 'Bloquear la app ahora';
    b.textContent = 'Bloquear';
    b.addEventListener('click', () => bloquear());
    const tema = document.getElementById('btn-tema');
    if (tema && tema.parentNode === topbar) topbar.insertBefore(b, tema);
    else topbar.appendChild(b);
  }

  function quitarBoton() {
    const b = document.getElementById('btn-lock');
    if (b) b.remove();
  }

  function refrescar(u) {
    if (u) _usuario = u;
    if (_usuario && tienePin(_usuario)) agregarBoton();
    else quitarBoton();
    reiniciarIdle();
  }

  function iniciar(u) {
    _usuario = u;
    if (!_listeners) {
      _listeners = true;
      ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'input'].forEach((ev) => {
        window.addEventListener(ev, actividad, { passive: true });
      });
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) { _ocultoDesde = Date.now(); return; }
        const estuvo = _ocultoDesde ? Date.now() - _ocultoDesde : 0;
        _ocultoDesde = 0;
        if (estuvo > OCULTO_LIMITE_MS && _usuario && tienePin(_usuario)) { bloquear(); return; }
        reiniciarIdle();
      });
    }
    if (tienePin(u)) {
      agregarBoton();
      if (_authFresh) { _authFresh = false; reiniciarIdle(); }
      else bloquear();
    } else {
      quitarBoton();
      reiniciarIdle();
    }
  }

  function markAuth() { _authFresh = true; }

  function mostrarOverlay() {
    let ov = document.getElementById('lock-overlay');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'lock-overlay';
      ov.className = 'lock-overlay';
      ov.innerHTML = `
        <div class="lock-caja">
          <img src="./icons/icono.svg" alt="" class="lock-logo">
          <h2>Sesión bloqueada</h2>
          <p class="lock-sub">Ingresa tu PIN para continuar.</p>
          <input id="lock-pin" type="password" inputmode="numeric" maxlength="8" autocomplete="off" class="lock-pin" placeholder="••••">
          <div id="lock-error" class="lock-error"></div>
          <button class="btn btn-primario btn-bloco" id="lock-entrar" type="button">Desbloquear</button>
          <button class="btn btn-sm" id="lock-salir" type="button" style="margin-top:10px;background:transparent;border-color:rgba(255,255,255,.18);color:#C9D6E8">Cerrar sesión</button>
        </div>`;
      document.body.appendChild(ov);
      ov.querySelector('#lock-entrar').addEventListener('click', intentar);
      ov.querySelector('#lock-salir').addEventListener('click', () => { JZAC.auth.borrarSesion(); location.reload(); });
      ov.querySelector('#lock-pin').addEventListener('keydown', (e) => { if (e.key === 'Enter') intentar(); });
    }
    ov.style.display = 'flex';
    const inp = ov.querySelector('#lock-pin');
    inp.value = '';
    ov.querySelector('#lock-error').textContent = '';
    setTimeout(() => { try { inp.focus(); } catch (e) {} }, 60);
  }

  async function intentar() {
    const ov = document.getElementById('lock-overlay');
    if (!ov) return;
    const inp = ov.querySelector('#lock-pin');
    const caja = ov.querySelector('.lock-caja');
    const error = ov.querySelector('#lock-error');
    const pin = inp.value.trim();
    if (!pin) { error.textContent = 'Escribe tu PIN.'; return; }
    if (await verificarPin(_usuario, pin)) {
      _bloqueado = false;
      ov.style.display = 'none';
      reiniciarIdle();
      return;
    }
    error.textContent = 'PIN incorrecto.';
    inp.value = '';
    try { inp.focus(); } catch (e) {}
    caja.classList.add('shake');
    setTimeout(() => caja.classList.remove('shake'), 400);
  }

  function bloquear() {
    if (!_usuario || !tienePin(_usuario) || _bloqueado) return;
    _bloqueado = true;
    clearTimeout(_idleTimer);
    _idleTimer = null;
    mostrarOverlay();
  }

  function abrirAjuste(u, done) {
    const tiene = tienePin(u);
    const min = idleMin();
    const opts = [1, 2, 5, 10, 15, 30].map((m) => `<option value="${m}" ${m === min ? 'selected' : ''}>${m} min</option>`).join('');
    const cuerpo = `
      <div class="modal-hdr"><h3>Bloqueo por PIN</h3><button class="cierre" data-cerrar>×</button></div>
      <div class="texto-suave" style="font-size:13px;margin-bottom:12px">Al dejar el equipo sin uso, la app se bloquea y pide el PIN para volver a entrar. Protege ganancias, fiados y la opción de borrar ventas.</div>
      ${tiene ? '<div class="campo"><label>PIN actual</label><input id="lk-actual" type="password" inputmode="numeric" maxlength="8" autocomplete="off"></div>' : ''}
      <div class="campo"><label>${tiene ? 'Nuevo PIN (déjalo vacío para no cambiarlo)' : 'Crea un PIN (4 a 8 dígitos)'}</label><input id="lk-nuevo" type="password" inputmode="numeric" maxlength="8" autocomplete="off"></div>
      <div class="campo"><label>Bloquear tras</label><select id="lk-idle">${opts}</select></div>`;
    const pie = tiene
      ? '<button class="btn btn-peligro" id="lk-quitar">Quitar bloqueo</button><button class="btn" data-cerrar>Cancelar</button><button class="btn btn-primario" id="lk-guardar">Guardar</button>'
      : '<button class="btn" data-cerrar>Cancelar</button><button class="btn btn-primario" id="lk-guardar">Activar bloqueo</button>';
    const m = JZAC.ui.modal(cuerpo, pie);

    m.raiz.querySelector('#lk-guardar').addEventListener('click', async () => {
      const elActual = m.raiz.querySelector('#lk-actual');
      const actual = elActual ? elActual.value.trim() : '';
      const nuevo = m.raiz.querySelector('#lk-nuevo').value.trim();
      const idle = Number(m.raiz.querySelector('#lk-idle').value);
      if (tiene && !actual) { JZAC.ui.toast('Ingresa tu PIN actual.', 'mal'); return; }
      if (tiene && !(await verificarPin(u, actual))) { JZAC.ui.toast('PIN actual incorrecto.', 'mal'); return; }
      if (!tiene && !/^\d{4,8}$/.test(nuevo)) { JZAC.ui.toast('El PIN debe tener de 4 a 8 dígitos.', 'mal'); return; }
      if (nuevo && !/^\d{4,8}$/.test(nuevo)) { JZAC.ui.toast('El nuevo PIN debe tener de 4 a 8 dígitos.', 'mal'); return; }
      try {
        if (nuevo) await setPin(u, nuevo);
        setIdleMin(idle);
        refrescar(u);
        JZAC.ui.toast(nuevo ? 'Bloqueo por PIN activado.' : 'Preferencias guardadas.', 'bien');
        m.cerrar();
        if (done) done();
      } catch (e) { JZAC.ui.toast('No se pudo guardar el PIN.', 'mal'); }
    });

    const q = m.raiz.querySelector('#lk-quitar');
    if (q) q.addEventListener('click', async () => {
      const actual = m.raiz.querySelector('#lk-actual').value.trim();
      if (!actual) { JZAC.ui.toast('Ingresa tu PIN actual.', 'mal'); return; }
      if (!(await verificarPin(u, actual))) { JZAC.ui.toast('PIN actual incorrecto.', 'mal'); return; }
      try {
        await quitarPin(u);
        refrescar(u);
        JZAC.ui.toast('Bloqueo desactivado.', 'bien');
        m.cerrar();
        if (done) done();
      } catch (e) { JZAC.ui.toast('No se pudo quitar el PIN.', 'mal'); }
    });
  }

  window.JZAC = window.JZAC || {};
  window.JZAC.lock = {
    iniciar, refrescar, bloquear, markAuth,
    tienePin, verificarPin, setPin, quitarPin,
    idleMin, setIdleMin, abrirAjuste
  };
})();
