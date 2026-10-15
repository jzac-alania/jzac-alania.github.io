// ============================================================
// JZAC ERP - Usuarios y sesion
// ============================================================
const SESION_KEY = 'jzac_sesion';

function bytesAHex(buf) {
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function hexABytes(hex) {
  const s = String(hex || '');
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(s.substr(i * 2, 2), 16);
  return out;
}

// Hash legado (v1-v1.10): SHA-256 simple. Solo para verificar usuarios antiguos.
async function hashLegacy(correo, pass) {
  const datos = `${pass}|${(correo || '').trim().toLowerCase()}`;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(datos));
  return bytesAHex(buf);
}

// Hash actual: PBKDF2-SHA256, 100k iteraciones, salt aleatorio de 16 bytes.
async function hashPassword(correo, pass, saltBytes) {
  const enc = new TextEncoder();
  const salt = saltBytes || crypto.getRandomValues(new Uint8Array(16));
  const material = await crypto.subtle.importKey(
    'raw', enc.encode(`${pass}|${(correo || '').trim().toLowerCase()}`), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, material, 256
  );
  return { hash: bytesAHex(bits), salt: bytesAHex(salt) };
}

// Verifica y, si el usuario aún tiene hash viejo, lo re-hashea en el primer login.
async function verificaPassword(u, pass) {
  if (u.passwordSalt) {
    const { hash } = await hashPassword(u.correo, pass, hexABytes(u.passwordSalt));
    return hash === u.passwordHash;
  }
  const h = await hashLegacy(u.correo, pass);
  if (h !== u.passwordHash) return false;
  try {
    const nueva = await hashPassword(u.correo, pass);
    u.passwordHash = nueva.hash;
    u.passwordSalt = nueva.salt;
    await JZAC.db.guardar('usuarios', u);
  } catch (e) { /* la migración es best-effort; el login ya es válido */ }
  return true;
}

async function usuarioPorCorreo(correo) {
  const usuarios = await JZAC.db.listar('usuarios');
  const c = (correo || '').trim().toLowerCase();
  return usuarios.find((u) => (u.correo || '').trim().toLowerCase() === c) || null;
}

async function registrar(nombre, nombreNegocio, correo, pass) {
  if (!nombre || !correo || !pass) throw new Error('Completa todos los campos.');
  if (pass.length < 4) throw new Error('La contraseña debe tener al menos 4 caracteres.');
  if (await usuarioPorCorreo(correo)) throw new Error('Ese correo ya está registrado.');
  const { hash, salt } = await hashPassword(correo, pass);
  const usuario = {
    nombre: nombre.trim(),
    nombreNegocio: (nombreNegocio || '').trim() || 'Mi Bodega',
    correo: correo.trim().toLowerCase(),
    passwordHash: hash,
    passwordSalt: salt,
    serieBoleta: 'B001',
    correlativoBoleta: 1000,
    serieNota: 'NC001',
    correlativoNota: 1000,
    creado: Date.now()
  };
  const id = await JZAC.db.guardar('usuarios', usuario);
  usuario.id = id;
  return usuario;
}

async function login(correo, pass) {
  const u = await usuarioPorCorreo(correo);
  if (!u) throw new Error('Correo no registrado.');
  if (!(await verificaPassword(u, pass))) throw new Error('Contraseña incorrecta.');
  return u;
}

function guardarSesion(usuario) {
  localStorage.setItem(SESION_KEY, JSON.stringify({ usuarioId: usuario.id }));
}

function borrarSesion() {
  localStorage.removeItem(SESION_KEY);
}

async function usuarioActual() {
  try {
    const s = JSON.parse(localStorage.getItem(SESION_KEY) || 'null');
    if (!s) return null;
    return await JZAC.db.obtener('usuarios', s.usuarioId) || null;
  } catch (e) { return null; }
}

window.JZAC = window.JZAC || {};
window.JZAC.auth = { registrar, login, guardarSesion, borrarSesion, usuarioActual, hashPassword };
