(function () {
  var raiz = document.documentElement;
  var boton = document.getElementById("theme-toggle");
  var meta = document.querySelector('meta[name="theme-color"]');

  function aplicar(tema, guardar) {
    raiz.setAttribute("data-theme", tema);
    if (meta) meta.setAttribute("content", tema === "light" ? "#F6F8FC" : "#0B1120");
    if (boton) {
      boton.setAttribute("aria-pressed", tema === "light" ? "true" : "false");
      boton.setAttribute("aria-label", tema === "light" ? "Activar tema oscuro" : "Activar tema claro");
      boton.setAttribute("title", tema === "light" ? "Activar tema oscuro" : "Activar tema claro");
    }
    if (guardar) { try { localStorage.setItem("jzac_theme", tema); } catch (e) {} }
  }

  function animar(fn) {
    raiz.classList.add("theme-anim");
    window.setTimeout(function () { raiz.classList.remove("theme-anim"); }, 420);
    fn();
  }

  if (boton) {
    boton.addEventListener("click", function () {
      var actual = raiz.getAttribute("data-theme") === "light" ? "light" : "dark";
      var siguiente = actual === "light" ? "dark" : "light";
      animar(function () { aplicar(siguiente, true); });
      boton.classList.add("spin");
      window.setTimeout(function () { boton.classList.remove("spin"); }, 480);
    });
    aplicar(raiz.getAttribute("data-theme") === "light" ? "light" : "dark", false);
  }

  try {
    window.addEventListener("storage", function (e) {
      if (e.key === "jzac_theme" && (e.newValue === "light" || e.newValue === "dark")) {
        animar(function () { aplicar(e.newValue, false); });
      }
    });
  } catch (e) {}

  var navBtn = document.getElementById("nav-toggle");
  var navLinks = document.getElementById("nav-links");
  if (navBtn && navLinks) {
    navBtn.addEventListener("click", function () {
      var abierto = navLinks.classList.toggle("open");
      navBtn.classList.toggle("open", abierto);
      navBtn.setAttribute("aria-expanded", abierto ? "true" : "false");
      navBtn.setAttribute("aria-label", abierto ? "Cerrar menú" : "Abrir menú");
    });
    navLinks.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        navLinks.classList.remove("open");
        navBtn.classList.remove("open");
        navBtn.setAttribute("aria-expanded", "false");
        navBtn.setAttribute("aria-label", "Abrir menú");
      }
    });
  }
})();
