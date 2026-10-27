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

  /* ---------- Intro cinematográfica ---------- */
  var preloader = $("#preloader");
  var introSaltada = false;
  var introReducida = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var introVista = false;
  try { introVista = sessionStorage.getItem("jzac_intro") === "1"; } catch (e) {}
  if (preloader && introVista) preloader.classList.add("intro-quick");

  function cerrarIntro() {
    if (!preloader || preloader.classList.contains("done") || introSaltada) return;
    introSaltada = true;
    preloader.classList.add("preloader-out");
    try { sessionStorage.setItem("jzac_intro", "1"); } catch (e) {}
    setTimeout(function () {
      if (preloader) preloader.classList.add("done");
    }, introReducida ? 80 : 1050);
  }
  if (preloader && !introReducida) {
    var inicioIntro = performance.now();
    var esperaIntro = introVista ? 420 : 2250;
    window.addEventListener("load", function () {
      var falta = Math.max(0, esperaIntro - (performance.now() - inicioIntro));
      setTimeout(cerrarIntro, falta);
    });
    setTimeout(cerrarIntro, 4800);
    var saltar = $("#intro-skip");
    if (saltar) saltar.addEventListener("click", cerrarIntro);
  } else if (preloader) {
    preloader.classList.add("done");
  }

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

  /* ---------- Hero: luz que sigue al mouse ---------- */
  var hero = $(".hero");
  if (hero && window.matchMedia("(hover: hover)").matches) {
    hero.addEventListener("pointermove", function (e) {
      var r = hero.getBoundingClientRect();
      hero.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100).toFixed(1) + "%");
      hero.style.setProperty("--my", ((e.clientY - r.top) / r.height * 100).toFixed(1) + "%");
    }, { passive: true });
  }

  /* ---------- Recorrido interactivo por la app ---------- */
  var APP_VIEWS = {
    claro: { url: "jzac-erp.app/inicio", tag: "Panel claro · Vista general", caption: "Panel claro · Todo tu día en una pantalla" },
    oscuro: { url: "jzac-erp.app/inicio", tag: "Modo oscuro · La misma claridad", caption: "Modo oscuro · La misma claridad, con menos brillo" },
    acceso: { url: "jzac-erp.app/acceso", tag: "Acceso · Entra en segundos", caption: "Acceso · Tu negocio, en orden desde el primer clic" }
  };
  var appShots = $$(".app-shot");
  var appChapters = $$(".app-chapter");
  var appNavBtns = $$(".app-dots-nav [data-app-step]");
  var appTag = $("#app-stage-tag");
  var appUrl = $("#app-url");
  var appActual = "claro";
  var appTagTimer = null;

  function pintarApp(clave) {
    if (!APP_VIEWS[clave]) return;
    appActual = clave;
    appShots.forEach(function (s) { s.classList.toggle("on", s.getAttribute("data-app") === clave); });
    appChapters.forEach(function (c) { c.classList.toggle("on", c.getAttribute("data-app-step") === clave); });
    appNavBtns.forEach(function (b) {
      var on = b.getAttribute("data-app-step") === clave;
      b.classList.toggle("on", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
    if (appTag) {
      appTag.textContent = APP_VIEWS[clave].tag;
      appTag.classList.add("cambiando");
      setTimeout(function () { appTag.classList.remove("cambiando"); }, 320);
    }
    if (appUrl) appUrl.lastChild.nodeValue = " " + APP_VIEWS[clave].url;
  }

  appNavBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var clave = btn.getAttribute("data-app-step");
      pintarApp(clave);
      var cap = appChapters.filter(function (c) { return c.getAttribute("data-app-step") === clave; })[0];
      if (cap) cap.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });

  if ("IntersectionObserver" in window && appChapters.length) {
    var capObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var clave = en.target.getAttribute("data-app-step");
        if (clave && clave !== appActual) pintarApp(clave);
      });
    }, { rootMargin: "-42% 0px -42% 0px", threshold: 0 });
    appChapters.forEach(function (c) { capObs.observe(c); });
  }

  $$(".app-hot").forEach(function (hot) {
    hot.addEventListener("click", function (e) {
      e.stopPropagation();
      if (!appTag) return;
      clearTimeout(appTagTimer);
      appTag.textContent = hot.getAttribute("data-tip") || APP_VIEWS[appActual].tag;
      appTag.classList.add("is-tip");
      appTagTimer = setTimeout(function () {
        appTag.textContent = APP_VIEWS[appActual].tag;
        appTag.classList.remove("is-tip");
      }, 2600);
    });
  });

  /* ---------- Lightbox de capturas ---------- */
  var zoomables = $$("[data-zoom]");
  var lightbox = $("#lightbox");
  var lightboxImg = $("#lightbox-img");
  var lightboxCaption = $("#lightbox-caption");
  var lightboxIdx = 0;
  var ultimoFocoLb = null;

  function abrirLightbox(el) {
    if (!lightbox || !lightboxImg) return;
    var idx = zoomables.indexOf(el);
    if (idx < 0) return;
    lightboxIdx = idx;
    ultimoFocoLb = document.activeElement;
    pintarLightbox();
    lightbox.classList.add("open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    var cerrar = $(".lightbox-close");
    if (cerrar) setTimeout(function () { cerrar.focus(); }, 120);
  }
  function pintarLightbox() {
    var el = zoomables[lightboxIdx];
    if (!el || !lightboxImg) return;
    var src = el.getAttribute("data-zoom");
    lightboxImg.src = src;
    lightboxImg.alt = el.getAttribute("data-caption") || "Captura de JZAC ERP";
    if (lightboxCaption) lightboxCaption.textContent = el.getAttribute("data-caption") || "JZAC ERP";
  }
  function cerrarLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove("open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (ultimoFocoLb && ultimoFocoLb.focus) ultimoFocoLb.focus();
  }
  function moverLightbox(dir) {
    if (!zoomables.length) return;
    lightboxIdx = (lightboxIdx + dir + zoomables.length) % zoomables.length;
    pintarLightbox();
  }
  $$("[data-zoom]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      abrirLightbox(el);
    });
  });
  $$("[data-lightbox-close]").forEach(function (el) { el.addEventListener("click", cerrarLightbox); });
  var lbPrev = $("#lightbox-prev");
  var lbNext = $("#lightbox-next");
  if (lbPrev) lbPrev.addEventListener("click", function () { moverLightbox(-1); });
  if (lbNext) lbNext.addEventListener("click", function () { moverLightbox(1); });
  var appExpand = $("#app-expand");
  if (appExpand) {
    appExpand.addEventListener("click", function () {
      var img = $(".app-shot.on img[data-zoom]");
      if (img) abrirLightbox(img);
    });
  }
  document.addEventListener("keydown", function (e) {
    if (!lightbox || !lightbox.classList.contains("open")) return;
    if (e.key === "Escape") cerrarLightbox();
    if (e.key === "ArrowLeft") moverLightbox(-1);
    if (e.key === "ArrowRight") moverLightbox(1);
  });

  /* ---------- Detalle de productos y servicios ---------- */
  var svcModal = $("#svc-modal");
  var svcVisual = $("#svc-modal-visual");
  var svcKicker = $("#svc-modal-kicker");
  var svcTitulo = $("#svc-modal-title");
  var svcDesc = $("#svc-modal-desc");
  var svcFeatures = $("#svc-modal-features");
  var svcPrecio = $("#svc-modal-price");
  var svcNota = $("#svc-modal-note");
  var svcCta = $("#svc-modal-cta");
  var svcUltimoFoco = null;
  var svcActual = null;

  function abrirSvc(card) {
    if (!svcModal || !card) return;
    var datos = card.dataset;
    svcActual = card;
    svcUltimoFoco = document.activeElement;

    if (svcVisual) {
      svcVisual.textContent = "";
      var arte = $(".svc-art", card);
      if (arte) {
        var clon = arte.cloneNode(true);
        clon.setAttribute("aria-hidden", "true");
        svcVisual.appendChild(clon);
      }
    }
    if (svcKicker) svcKicker.textContent = datos.svcKicker || "Producto";
    if (svcTitulo) svcTitulo.textContent = datos.svcTitle || "";
    if (svcDesc) svcDesc.textContent = datos.svcDesc || "";
    if (svcPrecio) svcPrecio.textContent = datos.svcPrice || "";
    if (svcNota) svcNota.textContent = datos.svcNote || "";
    if (svcFeatures) {
      svcFeatures.textContent = "";
      (datos.svcFeatures || "").split("|").forEach(function (texto) {
        if (!texto) return;
        var li = document.createElement("li");
        li.textContent = texto;
        svcFeatures.appendChild(li);
      });
    }
    if (svcCta) {
      if (datos.svcBuy === "1") {
        svcCta.setAttribute("href", "#precio");
        svcCta.removeAttribute("target");
        svcCta.removeAttribute("rel");
        svcCta.textContent = "Comprar ahora";
      } else {
        svcCta.setAttribute("href", datos.svcCta || "#servicios");
        svcCta.setAttribute("target", "_blank");
        svcCta.setAttribute("rel", "noopener");
        svcCta.textContent = datos.svcCtaText || "Cotizar por WhatsApp";
      }
    }

    svcModal.classList.add("open");
    svcModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    var cerrar = $(".svc-modal-close", svcModal);
    if (cerrar) setTimeout(function () { cerrar.focus(); }, 120);
  }

  function cerrarSvc() {
    if (!svcModal) return;
    svcModal.classList.remove("open");
    svcModal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (svcUltimoFoco && svcUltimoFoco.focus) svcUltimoFoco.focus();
    svcActual = null;
  }

  $$("[data-svc-open]").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      var card = btn.closest(".svc-card");
      if (card) abrirSvc(card);
    });
  });
  if (svcModal) {
    $$("[data-svc-close]", svcModal).forEach(function (el) {
      el.addEventListener("click", cerrarSvc);
    });
  }
  if (svcCta) {
    svcCta.addEventListener("click", function (e) {
      if (svcActual && svcActual.dataset.svcBuy === "1") {
        e.preventDefault();
        cerrarSvc();
        abrirModal();
        return;
      }
      cerrarSvc();
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && svcModal && svcModal.classList.contains("open")) cerrarSvc();
  });

  /* ---------- Navegación activa ---------- */
  var navEnlaces = $$(".nav-links a[href^='#']");
  var navSecciones = navEnlaces.map(function (a) {
    return { link: a, sec: document.querySelector(a.getAttribute("href")) };
  }).filter(function (x) { return !!x.sec; });
  function actualizarNav() {
    if (!navSecciones.length) return;
    var y = window.scrollY + window.innerHeight * 0.34;
    var actual = null;
    var mejor = -1;
    navSecciones.forEach(function (x) {
      if (x.sec.offsetTop <= y && x.sec.offsetTop > mejor) {
        mejor = x.sec.offsetTop;
        actual = x;
      }
    });
    navEnlaces.forEach(function (a) { a.classList.remove("active"); });
    if (actual) actual.link.classList.add("active");
  }
  window.addEventListener("scroll", actualizarNav, { passive: true });
  window.addEventListener("resize", actualizarNav);
  actualizarNav();

  /* ---------- Chips de rubro ---------- */
  var chips = $$(".chip[data-sector]");
  var mensajeContacto = $("#c-mensaje");
  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      chips.forEach(function (c) { c.classList.remove("sel"); });
      chip.classList.add("sel");
      var sector = chip.getAttribute("data-sector") || "";
      if (mensajeContacto && !mensajeContacto.value.trim()) {
        mensajeContacto.value = "Hola, tengo " + sector +
          " y quiero saber si JZAC ERP me sirve para ordenar mis ventas.";
      }
      var contacto = $("#contacto");
      if (contacto) contacto.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  /* ---------- FAQ: una abierta a la vez ---------- */
  var faqs = $$(".faq-item");
  faqs.forEach(function (item) {
    item.addEventListener("toggle", function () {
      if (!item.open) return;
      faqs.forEach(function (otro) { if (otro !== item) otro.open = false; });
    });
  });

  /* ---------- Brillo que sigue al mouse en tarjetas ---------- */
  $$(".card, .bento-card, .svc-card").forEach(function (card) {
    card.addEventListener("pointermove", function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty("--gx", ((e.clientX - r.left) / r.width * 100).toFixed(1) + "%");
      card.style.setProperty("--gy", ((e.clientY - r.top) / r.height * 100).toFixed(1) + "%");
    }, { passive: true });
  });

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

  function leerDatosCompra() {
    var negocio = limpiar($("#m-negocio").value);
    var nombre = limpiar($("#m-nombre").value);
    var correo = limpiar($("#m-correo").value);
    var telefono = limpiar($("#m-telefono").value);
    var acepto = $("#m-acepto").checked;

    if (!negocio || !nombre || !correo || !telefono) {
      setNota(notaCompra, "Completa todos los campos para continuar.", "bad");
      return null;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) {
      setNota(notaCompra, "Revisa el correo electrónico.", "bad");
      return null;
    }
    if (!acepto) {
      setNota(notaCompra, "Acepta los términos y la política de privacidad.", "bad");
      return null;
    }
    return { negocio: negocio, nombre: nombre, correo: correo, telefono: telefono, precio: CONFIG.precio };
  }

  if (formCompra) {
    var cajaYape = $("#m-yape-box");

    formCompra.addEventListener("input", function () {
      if (cajaYape) cajaYape.hidden = true;
      if (!pagoEnProceso) {
        ordenActual = null;
        ordenPromesa = null;
      }
    });

    var btnYape = $("#m-yape");
    if (btnYape) {
      btnYape.addEventListener("click", function () {
        if (pagoEnProceso) return;
        var datos = leerDatosCompra();
        if (!datos) return;
        if (cajaYape) cajaYape.hidden = false;
        var wa = $("#m-yape-wa");
        if (wa) wa.href = "https://wa.me/" + CONFIG.whatsapp + "?text=" + encodeURIComponent(mensajeYape(datos));
        setNota(notaCompra, "Escanea el QR, paga S/ 390 y envíanos el comprobante por WhatsApp.", "ok");
        if (cajaYape) cajaYape.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }

    formCompra.addEventListener("submit", async function (e) {
      e.preventDefault();
      if (pagoEnProceso) return;
      var datos = leerDatosCompra();
      if (!datos) return;
      if (cajaYape) cajaYape.hidden = true;

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

  function mensajeYape(d) {
    return "¡Hola Jimy! Quiero comprar JZAC ERP (S/ " + CONFIG.precio + ") y pagar por Yape.\n\n" +
      "Negocio: " + d.negocio + "\n" +
      "Nombre: " + d.nombre + "\n" +
      "Correo: " + d.correo + "\n" +
      "WhatsApp: " + d.telefono + "\n\n" +
      "Adjunto mi comprobante de Yape.\nCódigo de operación: ";
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
