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
    worker: "https://jzac-license.jzac.workers.dev",
    culqiPublico: "pk_live_GVLjB4eefHF1u9OQ",
    culqiListo: true
  };

  if (location.hostname === "127.0.0.1" || location.hostname === "localhost") {
    CONFIG.worker = "http://127.0.0.1:8787";
  }

  function workerUrl(ruta) {
    return CONFIG.worker.replace(/\/+$/, "") + ruta;
  }

  function guardarOrden(id) {
    try { localStorage.setItem("jzac_orden", id); } catch (e) {}
  }

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

  var ordenActual = null;
  var ordenPromesa = null;
  var montoActual = 0;
  var pagoEnProceso = false;

  function partesNombre(nombre) {
    var p = limpiar(nombre).split(/\s+/).filter(Boolean);
    var first = p.shift() || limpiar(nombre);
    return { first: first, last: p.join(" ") };
  }

  async function crearOrden(datos) {
    var r = await fetch(workerUrl("/checkout"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        negocio: datos.negocio,
        nombre: datos.nombre,
        correo: datos.correo,
        telefono: datos.telefono,
        acepto: true
      })
    });
    var j = await r.json().catch(function () { return {}; });
    if (!r.ok || !j.ok || !j.orden) throw new Error(j.error || "checkout");
    montoActual = Number(j.monto) || 39000;
    ordenActual = j.orden;
  }

  async function asegurarOrden(datos) {
    if (ordenActual) return ordenActual;
    if (ordenPromesa) {
      try { await ordenPromesa; } catch (e) {}
      if (ordenActual) return ordenActual;
    }
    ordenPromesa = crearOrden(datos);
    await ordenPromesa;
    return ordenActual;
  }

  async function cobrar(token, datos) {
    setNota(notaCompra, "Procesando el pago...", "ok");
    try {
      await asegurarOrden(datos);
      var r = await fetch(workerUrl("/pagar"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orden: ordenActual, token: token })
      });
      var j = await r.json().catch(function () { return {}; });
      if (j && j.ok && j.estado === "pagado" && j.codigo) {
        guardarOrden(j.orden);
        window.location.href = "pago.html?orden=" + encodeURIComponent(j.orden);
        return;
      }
      if (j && j.ok && j.estado === "pendiente") {
        guardarOrden(ordenActual);
        window.location.href = "pago.html?orden=" + encodeURIComponent(ordenActual);
        return;
      }
      if (j && j.error === "rechazado") {
        pagoEnProceso = false;
        btnCompra.disabled = false;
        setNota(notaCompra, j.mensaje || "El pago no fue aprobado. Intenta con otra tarjeta.", "bad");
        return;
      }
      if (j && (j.error === "orden-expirada" || j.error === "orden-no-encontrada")) {
        ordenActual = null;
      }
      throw new Error((j && j.error) || "pago");
    } catch (err) {
      pagoEnProceso = false;
      btnCompra.disabled = false;
      if (ordenActual) {
        guardarOrden(ordenActual);
        setNota(notaCompra, "No pudimos confirmar el pago. Revisando el estado...", "ok");
        setTimeout(function () {
          window.location.href = "pago.html?orden=" + encodeURIComponent(ordenActual);
        }, 800);
        return;
      }
      setNota(notaCompra, "No se pudo iniciar el pago. Te paso a WhatsApp.", "bad");
      setTimeout(function () { abrirWa(mensajeCompra(datos)); }, 700);
    }
  }

  function abrirCheckout(datos) {
    if (typeof window.CulqiCheckout !== "function") throw new Error("checkout-no-disponible");
    var n = partesNombre(datos.nombre);
    var instancia = new window.CulqiCheckout(CONFIG.culqiPublico, {
      settings: {
        title: "JZAC ERP",
        currency: "PEN",
        amount: montoActual || 39000
      },
      client: { email: datos.correo, firstName: n.first, lastName: n.last },
      options: {
        lang: "es",
        modal: true,
        installments: false,
        paymentMethods: {
          tarjeta: true,
          yape: true,
          billetera: false,
          bancaMovil: false,
          agente: false,
          cuotealo: false
        },
        paymentMethodsSort: ["tarjeta", "yape"]
      },
      appearance: {
        theme: "default",
        hiddenCulqiLogo: false,
        menuType: "select",
        defaultStyle: {
          bannerColor: "#0d1b2a",
          buttonBackground: "#22c55e",
          menuColor: "#22c55e",
          linksColor: "#22c55e",
          buttonTextColor: "#06281b",
          priceColor: "#22c55e"
        }
      }
    });

    instancia.culqi = function () {
      if (instancia.token && instancia.token.id) {
        var token = instancia.token.id;
        instancia.close();
        cobrar(token, datos);
        return;
      }
      if (instancia.order) {
        instancia.close();
        pagoEnProceso = false;
        btnCompra.disabled = false;
        setNota(notaCompra, "El checkout devolvió una orden pendiente. Escríbenos por WhatsApp.", "bad");
        return;
      }
      var err = instancia.error || {};
      pagoEnProceso = false;
      btnCompra.disabled = false;
      setNota(notaCompra, err.user_message || err.merchant_message || "No se pudo procesar el pago. Intenta de nuevo.", "bad");
    };

    instancia.open();
  }

  if (formCompra) {
    formCompra.addEventListener("input", function () {
      if (!pagoEnProceso) {
        ordenActual = null;
        ordenPromesa = null;
      }
    });

    formCompra.addEventListener("submit", async function (e) {
      e.preventDefault();
      if (pagoEnProceso) return;

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

      if (!CONFIG.culqiListo) {
        setNota(notaCompra, "Abriendo WhatsApp para coordinar tu compra...", "ok");
        setTimeout(function () { abrirWa(mensajeCompra(datos)); }, 450);
        return;
      }

      if (typeof window.CulqiCheckout !== "function") {
        setNota(notaCompra, "El pago con tarjeta no está disponible. Te paso a WhatsApp.", "bad");
        setTimeout(function () { abrirWa(mensajeCompra(datos)); }, 600);
        return;
      }

      pagoEnProceso = true;
      btnCompra.disabled = true;
      if (!ordenActual) {
        ordenPromesa = crearOrden(datos);
        ordenPromesa.catch(function () {});
      }
      setNota(notaCompra, "Abriendo checkout seguro de Culqi...", "ok");
      try {
        abrirCheckout(datos);
      } catch (err) {
        pagoEnProceso = false;
        btnCompra.disabled = false;
        setNota(notaCompra, "No se pudo iniciar el pago. Te paso a WhatsApp.", "bad");
        setTimeout(function () { abrirWa(mensajeCompra(datos)); }, 700);
      }
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
