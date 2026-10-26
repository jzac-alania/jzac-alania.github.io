/* ============================================================
   JZAC ERP — Estado del pago
   Consulta la orden en el Worker y muestra el código de activación
   ============================================================ */

(function () {
  "use strict";

  var CONFIG = {
    worker: "https://jzac-license.jzac.workers.dev",
    whatsapp: "51929068219",
    erp: "https://jzac-alania.github.io/erp/"
  };

  if (location.hostname === "127.0.0.1" || location.hostname === "localhost") {
    CONFIG.worker = "http://127.0.0.1:8787";
  }

  function $(sel) { return document.querySelector(sel); }
  function workerUrl(ruta) { return CONFIG.worker.replace(/\/+$/, "") + ruta; }

  var ui = {
    card: $("#pago-card"),
    spinner: $("#pago-spinner"),
    eyebrow: $("#pago-eyebrow"),
    titulo: $("#pago-titulo"),
    texto: $("#pago-texto"),
    codeBox: $("#pago-code-box"),
    codigo: $("#pago-codigo"),
    copiar: $("#pago-copiar"),
    datos: $("#pago-datos"),
    negocio: $("#pago-negocio"),
    monto: $("#pago-monto"),
    pasos: $("#pago-pasos"),
    erp: $("#pago-erp"),
    reintentar: $("#pago-reintentar"),
    wa: $("#pago-wa"),
    nota: $("#pago-nota-final")
  };

  var params = new URLSearchParams(location.search);
  var orden = params.get("orden") || "";
  try {
    if (!orden) orden = localStorage.getItem("jzac_orden") || "";
    if (orden) localStorage.setItem("jzac_orden", orden);
  } catch (e) {}

  var codigoActual = "";
  var negocioActual = "";
  var temporizador = null;
  var intentos = 0;

  function dinero(centimos) {
    var n = Number(centimos || 0) / 100;
    return "S/ " + n.toFixed(2);
  }

  function mostrar(el, visible) {
    if (el) el.hidden = !visible;
  }

  function enlaceWa(texto) {
    if (!ui.wa) return;
    ui.wa.href = "https://wa.me/" + CONFIG.whatsapp + "?text=" + encodeURIComponent(texto);
  }

  function detener() {
    if (temporizador) {
      clearInterval(temporizador);
      temporizador = null;
    }
  }

  function iniciarPolling() {
    if (temporizador) return;
    temporizador = setInterval(function () {
      intentos++;
      if (intentos >= 75) {
        detener();
        ui.eyebrow.textContent = "Pago pendiente";
        ui.titulo.textContent = "Aún no recibimos la confirmación";
        ui.texto.textContent = "Si ya pagaste, escríbenos por WhatsApp con tu número de orden para ayudarte.";
        mostrar(ui.spinner, false);
        mostrar(ui.reintentar, true);
        return;
      }
      consultar();
    }, 4000);
  }

  function pintarPagado(j) {
    detener();
    codigoActual = j.codigo || "";
    negocioActual = j.negocio || "";
    document.title = "Pago confirmado | JZAC ERP";
    ui.card.classList.add("is-ok");
    mostrar(ui.spinner, false);
    mostrar(ui.reintentar, false);
    mostrar(ui.datos, true);
    mostrar(ui.codeBox, true);
    mostrar(ui.pasos, true);
    mostrar(ui.erp, true);
    ui.eyebrow.textContent = "Pago confirmado";
    ui.titulo.textContent = "¡Tu licencia está lista!";
    ui.texto.textContent = "Guarda este código. Lo usarás una sola vez para activar el ERP en tus equipos.";
    ui.codigo.textContent = codigoActual || "Escríbenos";
    ui.negocio.textContent = negocioActual || "—";
    ui.monto.textContent = dinero(j.monto);
    ui.nota.textContent = "Compra protegida por Culqi. Si necesitas ayuda, escríbenos por WhatsApp.";
    enlaceWa(
      "Hola Jimy, ya pagué JZAC ERP." +
      (negocioActual ? "\nNegocio: " + negocioActual : "") +
      (codigoActual ? "\nCódigo: " + codigoActual : "") +
      "\nQuiero ayuda para activarlo."
    );
    if (codigoActual && ui.copiar) ui.copiar.hidden = false;
  }

  function pintarPendiente(j) {
    mostrar(ui.spinner, true);
    mostrar(ui.datos, true);
    mostrar(ui.reintentar, true);
    ui.datos.hidden = false;
    ui.negocio.textContent = j.negocio || "—";
    ui.monto.textContent = dinero(j.monto);
    ui.eyebrow.textContent = "Confirmando pago";
    ui.titulo.textContent = "Estamos verificando tu pago...";
    ui.texto.textContent = "Si ya pagaste, espera unos segundos. Esta página se actualiza sola. Si no completaste el pago, puedes volver al inicio e intentarlo de nuevo.";
    ui.nota.textContent = "¿Ya te cobraron y sigue pendiente? Escríbenos por WhatsApp.";
    enlaceWa("Hola Jimy, pagué JZAC ERP y quiero confirmar el estado de mi orden " + orden + ".");
    iniciarPolling();
  }

  function pintarError(titulo, texto, nota, waTexto) {
    detener();
    mostrar(ui.spinner, false);
    mostrar(ui.codeBox, false);
    mostrar(ui.pasos, false);
    mostrar(ui.erp, false);
    mostrar(ui.reintentar, true);
    ui.card.classList.add("is-error");
    ui.eyebrow.textContent = "Pago no confirmado";
    ui.titulo.textContent = titulo;
    ui.texto.textContent = texto;
    ui.nota.textContent = nota || "";
    enlaceWa(waTexto || "Hola Jimy, necesito ayuda con mi compra de JZAC ERP.");
  }

  function render(j) {
    if (!j || !j.ok) {
      pintarError(
        "No encontramos esta orden",
        "Revisa el enlace o escríbenos por WhatsApp con el correo que usaste al pagar.",
        "No compartas datos de tu tarjeta por chat.",
        "Hola Jimy, no encuentro el estado de mi compra de JZAC ERP."
      );
      return;
    }
    if (j.estado === "pagado") {
      pintarPagado(j);
      return;
    }
    if (j.estado === "pendiente" || j.estado === "pendiente-pago") {
      pintarPendiente(j);
      return;
    }
    if (j.estado === "expirado") {
      pintarError(
        "La orden expiró",
        "No recibimos el pago dentro del tiempo de la orden. Puedes volver a comprar desde la página principal.",
        "Si el banco te cobró, escríbenos y lo revisamos.",
        "Hola Jimy, mi orden de JZAC ERP expiró pero quiero comprar."
      );
      return;
    }
    pintarError(
      "El pago no se completó",
      "No se registró un cobro para esta orden. Vuelve al inicio para intentarlo otra vez.",
      "No se te cobrará nada si el pago fue rechazado.",
      "Hola Jimy, mi pago de JZAC ERP no se completó y quiero ayuda."
    );
  }

  async function consultar() {
    if (!orden) {
      pintarError(
        "No encontramos tu orden",
        "Abre esta página desde el enlace que te mostramos al pagar o escríbenos por WhatsApp.",
        "",
        "Hola Jimy, pagué JZAC ERP y quiero recuperar mi código."
      );
      return;
    }
    try {
      var r = await fetch(workerUrl("/orden"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orden: orden })
      });
      var j = await r.json();
      render(j);
    } catch (e) {
      detener();
      mostrar(ui.spinner, false);
      mostrar(ui.reintentar, true);
      ui.eyebrow.textContent = "Sin conexión";
      ui.titulo.textContent = "No pudimos consultar el pago";
      ui.texto.textContent = "Revisa tu conexión a internet y pulsa Reintentar. Si el problema continúa, escríbenos por WhatsApp.";
      enlaceWa("Hola Jimy, no puedo consultar el estado de mi compra de JZAC ERP.");
    }
  }

  if (ui.copiar) {
    ui.copiar.addEventListener("click", function () {
      if (!codigoActual) return;
      var listo = function () {
        ui.copiar.textContent = "¡Copiado!";
        setTimeout(function () { ui.copiar.textContent = "Copiar código"; }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(codigoActual).then(listo, function () {});
        return;
      }
      var ta = document.createElement("textarea");
      ta.value = codigoActual;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); listo(); } catch (e) {}
      document.body.removeChild(ta);
    });
  }

  if (ui.reintentar) {
    ui.reintentar.addEventListener("click", function () {
      intentos = 0;
      mostrar(ui.reintentar, false);
      mostrar(ui.spinner, true);
      consultar();
    });
  }

  consultar();
})();
