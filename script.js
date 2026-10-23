/* ============================================================
   JZAC ERP — Landing
   UI: preloader, menú, modal de compra, formularios
   Pagos: listo para Culqi/Worker; mientras, respaldo por WhatsApp
   ============================================================ */

(function () {
  "use strict";

  var CONFIG = {
    whatsapp: "51929068219",
    precio: "390",
    // Pega aquí el endpoint de Formspree cuando lo crees:
    formspree: "",
    // Cuando el Worker tenga /checkout y Culqi esté activo:
    culqiListo: false,
    checkoutUrl: ""
  };

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function limpiar(s) { return String(s == null ? "" : s).trim(); }
  function abrirWa(texto) {
    window.open("https://wa.me/" + CONFIG.whatsapp + "?text=" + encodeURIComponent(texto), "_blank", "noopener");
  }

  /* ---------- Año ---------- */
  var year = $("#year");
  if (year) year.textContent = String(new Date().getFullYear());

  /* ---------- Preloader ---------- */
  var preloader = $("#preloader");
  function ocultarPreloader() {
    if (!preloader || preloader.classList.contains("done")) return;
    preloader.classList.add("done");
  }
  window.addEventListener("load", ocultarPreloader);
  setTimeout(ocultarPreloader, 2400);

  /* ---------- Barra de progreso ---------- */
  var progress = $("#scroll-progress");
  function actualizarProgreso() {
    if (!progress) return;
    var h = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + "%";
  }
  window.addEventListener("scroll", actualizarProgreso, { passive: true });
  window.addEventListener("resize", actualizarProgreso);
  actualizarProgreso();

  /* ---------- Menú móvil ---------- */
  var toggle = $("#nav-toggle");
  var links = $("#nav-links");
  function cerrarMenu() {
    if (!links || !toggle) return;
    links.classList.remove("open");
    toggle.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  }
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var abierto = links.classList.toggle("open");
      toggle.classList.toggle("open", abierto);
      toggle.setAttribute("aria-expanded", abierto ? "true" : "false");
    });
    $$("a", links).forEach(function (a) {
      a.addEventListener("click", cerrarMenu);
    });
  }
  document.addEventListener("click", function (e) {
    if (!links || !links.classList.contains("open")) return;
    if (links.contains(e.target) || (toggle && toggle.contains(e.target))) return;
    cerrarMenu();
  });

  /* ---------- Reveal fallback (sin GSAP) ---------- */
  var reveals = $$(".reveal");
  if (window.gsap) {
    // GSAP se encarga (animaciones.js)
  } else if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- Modal de compra ---------- */
  var modal = $("#modal-compra");
  var ultimoFoco = null;

  function abrirModal() {
    if (!modal) return;
    ultimoFoco = document.activeElement;
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    var first = $("#m-negocio");
    if (first) setTimeout(function () { first.focus(); }, 120);
  }
  function cerrarModal() {
    if (!modal) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (ultimoFoco && ultimoFoco.focus) ultimoFoco.focus();
  }

  $$("[data-comprar]").forEach(function (btn) {
    btn.addEventListener("click", abrirModal);
  });
  $$("[data-cerrar-modal]").forEach(function (el) {
    el.addEventListener("click", cerrarModal);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && modal && modal.classList.contains("open")) cerrarModal();
  });

  var formCompra = $("#form-compra");
  var notaCompra = $("#m-nota");
  var btnCompra = $("#m-continuar");

  function setNota(el, texto, tipo) {
    if (!el) return;
    el.textContent = texto;
    el.classList.remove("ok", "bad");
    if (tipo) el.classList.add(tipo);
  }

  if (formCompra) {
    formCompra.addEventListener("submit", async function (e) {
      e.preventDefault();
      var negocio = limpiar($("#m-negocio").value);
      var nombre = limpiar($("#m-nombre").value);
      var correo = limpiar($("#m-correo").value);
      var telefono = limpiar($("#m-telefono").value);
      var acepto = $("#m-acepto").checked;

      if (!negocio || !nombre || !correo || !telefono) {
        setNota(notaCompra, "Completa todos los campos para continuar.", "bad");
        return;
      }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) {
        setNota(notaCompra, "Revisa el correo electrónico.", "bad");
        return;
      }
      if (!acepto) {
        setNota(notaCompra, "Acepta los términos y la política de privacidad.", "bad");
        return;
      }

      var datos = { negocio: negocio, nombre: nombre, correo: correo, telefono: telefono, precio: CONFIG.precio };

      if (CONFIG.culqiListo && CONFIG.checkoutUrl) {
        btnCompra.disabled = true;
        setNota(notaCompra, "Preparando el pago seguro...", "ok");
        try {
          var r = await fetch(CONFIG.checkoutUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos)
          });
          var j = await r.json();
          if (j && j.url) { window.location.href = j.url; return; }
          if (j && j.orderId) { setNota(notaCompra, "Orden creada. Abriendo checkout...", "ok"); return; }
          throw new Error((j && j.error) || "sin respuesta");
        } catch (err) {
          btnCompra.disabled = false;
          setNota(notaCompra, "No se pudo iniciar el pago. Te paso a WhatsApp.", "bad");
          setTimeout(function () {
            abrirWa(mensajeCompra(datos));
          }, 700);
          return;
        }
      }

      setNota(notaCompra, "Abriendo WhatsApp para coordinar tu compra...", "ok");
      setTimeout(function () {
        abrirWa(mensajeCompra(datos));
      }, 450);
    });
  }

  function mensajeCompra(d) {
    return "¡Hola Jimy! Quiero comprar JZAC ERP (S/ " + CONFIG.precio + ").\n\n" +
      "Negocio: " + d.negocio + "\n" +
      "Nombre: " + d.nombre + "\n" +
      "Correo: " + d.correo + "\n" +
      "WhatsApp: " + d.telefono + "\n\n" +
      "Quiero pagar con (Yape / tarjeta / transferencia): ";
  }

  /* ---------- Formulario de contacto ---------- */
  var formContacto = $("#form-contacto");
  var notaContacto = $("#c-nota");
  var btnContacto = $("#c-enviar");

  if (formContacto) {
    formContacto.addEventListener("submit", async function (e) {
      e.preventDefault();
      var nombre = limpiar($("#c-nombre").value);
      var negocio = limpiar($("#c-negocio").value);
      var contacto = limpiar($("#c-contacto").value);
      var mensaje = limpiar($("#c-mensaje").value);

      if (!nombre || !contacto || !mensaje) {
        setNota(notaContacto, "Completa nombre, contacto y mensaje.", "bad");
        return;
      }

      if (CONFIG.formspree) {
        btnContacto.disabled = true;
        setNota(notaContacto, "Enviando...", "ok");
        try {
          var r = await fetch(CONFIG.formspree, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ nombre: nombre, negocio: negocio, contacto: contacto, mensaje: mensaje })
          });
          if (!r.ok) throw new Error("http " + r.status);
          formContacto.reset();
          setNota(notaContacto, "¡Mensaje enviado! Te responderé pronto.", "ok");
        } catch (err) {
          setNota(notaContacto, "No se pudo enviar. Te paso a WhatsApp.", "bad");
          abrirWa(mensajeContacto(nombre, negocio, contacto, mensaje));
        } finally {
          btnContacto.disabled = false;
        }
        return;
      }

      abrirWa(mensajeContacto(nombre, negocio, contacto, mensaje));
      formContacto.reset();
      setNota(notaContacto, "Abriendo WhatsApp con tu mensaje...", "ok");
    });
  }

  function mensajeContacto(nombre, negocio, contacto, mensaje) {
    return "¡Hola Jimy! Vi tu página de JZAC ERP.\n\n" +
      "Nombre: " + nombre + "\n" +
      (negocio ? "Negocio: " + negocio + "\n" : "") +
      "Contacto: " + contacto + "\n\n" +
      "Mensaje: " + mensaje;
  }

  /* ---------- Exponer config por si se necesita ---------- */
  window.JZAC_LANDING = { config: CONFIG };
})();
