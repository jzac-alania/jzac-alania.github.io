/* ============================================================
   JZAC ERP — Landing
   Animaciones: GSAP (ScrollTrigger + SplitText) + Lenis
   - Entrada del hero, reveals, contadores, tilt 3D, partículas
   - Fallback: si falta GSAP o el usuario pide menos movimiento,
     todo queda visible.
   ============================================================ */

(function () {
  "use strict";

  var reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var tieneGsap = !!(window.gsap && window.ScrollTrigger);

  function mostrarTodo() {
    document.querySelectorAll(".reveal").forEach(function (el) {
      el.classList.add("is-visible");
    });
    document.querySelectorAll(".hero-in").forEach(function (el) {
      el.style.opacity = "1";
      el.style.filter = "none";
    });
  }

  if (!tieneGsap || reducido) {
    mostrarTodo();
    return;
  }

  var gsap = window.gsap;
  gsap.registerPlugin(window.ScrollTrigger);
  if (window.SplitText) gsap.registerPlugin(window.SplitText);

  document.documentElement.classList.add("gsap-on");

  /* ---------- Smooth scroll ---------- */
  var lenis = null;
  if (window.Lenis) {
    lenis = new window.Lenis({ duration: 1.05, smoothWheel: true });
    lenis.on("scroll", window.ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);

    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener("click", function (e) {
        var id = a.getAttribute("href");
        if (!id || id === "#") return;
        var destino = document.querySelector(id);
        if (!destino) return;
        e.preventDefault();
        lenis.scrollTo(destino, { offset: -70 });
      });
    });
  }

  /* ---------- Entrada del hero ---------- */
  var titulo = document.querySelector(".hero-title");
  var palabras = [];

  if (titulo) {
    gsap.set(titulo, { opacity: 1 });

    Array.prototype.slice.call(titulo.childNodes).forEach(function (nodo) {
      if (nodo.nodeType === 3) {
        var partes = nodo.textContent.split(/(\s+)/);
        var frag = document.createDocumentFragment();
        partes.forEach(function (parte) {
          if (!parte) return;
          if (/^\s+$/.test(parte)) {
            frag.appendChild(document.createTextNode(parte));
          } else {
            var w = document.createElement("span");
            w.className = "palabra";
            w.style.display = "inline-block";
            w.textContent = parte;
            frag.appendChild(w);
            palabras.push(w);
          }
        });
        titulo.replaceChild(frag, nodo);
      } else if (nodo.nodeType === 1) {
        nodo.style.display = "inline-block";
        palabras.push(nodo);
      }
    });
  }

  var tl = gsap.timeline({ defaults: { ease: "power3.out" }, delay: 0.45 });
  tl.fromTo(".pill.hero-in", { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 });

  if (palabras.length) {
    tl.from(palabras, { y: 46, opacity: 0, duration: 0.8, stagger: 0.07, ease: "power4.out" }, "-=0.35");
  } else if (titulo) {
    tl.fromTo(titulo, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }, "-=0.35");
  }

  tl.fromTo(".hero-sub.hero-in", { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, "-=0.55")
    .fromTo(".hero-actions.hero-in", { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, "-=0.5")
    .fromTo(".hero-note.hero-in", { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, "-=0.5")
    .fromTo(".hero-stats.hero-in", { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, "-=0.55")
    .fromTo(".phone.hero-in", { y: 80, opacity: 0, rotate: 5, scale: 0.94 }, { y: 0, opacity: 1, rotate: 0, scale: 1, duration: 1.15 }, "-=1.05")
    .from(".float-card", { opacity: 0, duration: 0.6, stagger: 0.16 }, "-=0.55")
    .from(".whatsapp-float", { scale: 0, opacity: 0, duration: 0.7, ease: "back.out(1.7)", clearProps: "transform" }, "-=0.3");

  setTimeout(function () {
    gsap.set(".hero-in", { opacity: 1, clearProps: "filter,transform" });
  }, 3400);

  /* ---------- Reveals al hacer scroll ---------- */
  gsap.utils.toArray(".reveal").forEach(function (el) {
    gsap.from(el, {
      y: 44,
      opacity: 0,
      duration: 0.9,
      ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 88%" }
    });
  });

  /* ---------- Títulos y eyebrows ---------- */
  gsap.utils.toArray(".section-eyebrow").forEach(function (el) {
    gsap.from(el, {
      y: 18,
      opacity: 0,
      duration: 0.6,
      scrollTrigger: { trigger: el, start: "top 90%" }
    });
  });

  gsap.utils.toArray(".section-title:not(.reveal)").forEach(function (el) {
    gsap.from(el, {
      y: 34,
      opacity: 0,
      duration: 0.9,
      ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 88%" }
    });
  });

  /* ---------- Strip / marquee ---------- */
  var strip = document.getElementById("strip");
  if (strip) {
    var mm = gsap.matchMedia();
    mm.add("(min-width: 1021px)", function () {
      var original = strip.innerHTML;
      strip.innerHTML = original + original;
      strip.classList.add("marquee");
      var tween = gsap.to(strip, {
        x: function () { return -strip.scrollWidth / 2; },
        duration: 34,
        ease: "none",
        repeat: -1
      });
      return function () {
        tween.kill();
        strip.classList.remove("marquee");
        strip.innerHTML = original;
        gsap.set(strip, { x: 0 });
      };
    });
  }

  /* ---------- Contadores ---------- */
  gsap.utils.toArray("[data-contador]").forEach(function (el) {
    var fin = parseFloat(el.getAttribute("data-contador")) || 0;
    var prefijo = el.getAttribute("data-prefijo") || "";
    var obj = { n: 0 };
    var tr = { trigger: el, start: "top 92%", once: true };
    if (el.closest(".hero")) {
      gsap.to(obj, {
        n: fin, duration: 1.6, ease: "power2.out", delay: 0.9,
        onUpdate: function () {
          el.textContent = prefijo + Math.round(obj.n).toLocaleString("es-PE");
        }
      });
    } else {
      gsap.to(obj, {
        n: fin, duration: 1.6, ease: "power2.out", scrollTrigger: tr,
        onUpdate: function () {
          el.textContent = prefijo + Math.round(obj.n).toLocaleString("es-PE");
        }
      });
    }
    el.textContent = prefijo + "0";
  });

  /* ---------- Tilt 3D ---------- */
  function activarTilt(el, fuerza, perspectiva) {
    var rx = gsap.quickTo(el, "rotationX", { duration: 0.6, ease: "power3" });
    var ry = gsap.quickTo(el, "rotationY", { duration: 0.6, ease: "power3" });
    gsap.set(el, { transformPerspective: perspectiva || 900, transformStyle: "preserve-3d" });
    el.addEventListener("pointermove", function (e) {
      var r = el.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      rx(-py * fuerza);
      ry(px * fuerza);
    });
    el.addEventListener("pointerleave", function () {
      rx(0);
      ry(0);
    });
  }

  document.querySelectorAll("[data-tilt]").forEach(function (el) {
    activarTilt(el, 11, 1200);
  });
  document.querySelectorAll(".tilt").forEach(function (el) {
    activarTilt(el, 7, 900);
  });

  /* ---------- Botones magnéticos ---------- */
  document.querySelectorAll(".hero-actions .btn, .section-cta .btn, .showcase-actions .btn, .pay-bar .btn").forEach(function (btn) {
    var xTo = gsap.quickTo(btn, "x", { duration: 0.4, ease: "power3" });
    var yTo = gsap.quickTo(btn, "y", { duration: 0.4, ease: "power3" });
    btn.addEventListener("pointermove", function (e) {
      var r = btn.getBoundingClientRect();
      xTo((e.clientX - r.left - r.width / 2) * 0.24);
      yTo((e.clientY - r.top - r.height / 2) * 0.34);
    });
    btn.addEventListener("pointerleave", function () {
      xTo(0);
      yTo(0);
    });
  });

  /* ---------- Navbar con sombra ---------- */
  var navbar = document.querySelector(".navbar");
  if (navbar) {
    window.addEventListener("scroll", function () {
      navbar.classList.toggle("scrolled", window.scrollY > 30);
    }, { passive: true });
  }

  /* ---------- Parallax suave ---------- */
  gsap.to(".hero-visual", {
    y: -60,
    ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 0.6 }
  });
  gsap.to(".hero-copy", {
    y: -28,
    opacity: 0.45,
    ease: "none",
    scrollTrigger: { trigger: ".hero", start: "25% top", end: "bottom top", scrub: 0.6 }
  });
  gsap.fromTo(".showcase-phone",
    { y: 50 },
    { y: -40, ease: "none", scrollTrigger: { trigger: ".showcase", start: "top bottom", end: "bottom top", scrub: 0.6 } }
  );

  /* ---------- Partículas del hero ---------- */
  (function particulas() {
    var hero = document.querySelector(".hero");
    if (!hero) return;

    var canvas = document.createElement("canvas");
    canvas.id = "particulas";
    canvas.setAttribute("aria-hidden", "true");
    hero.insertBefore(canvas, hero.firstChild);

    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0, puntos = [], activo = true;
    var raton = { x: -9999, y: -9999 };

    function medir() {
      w = hero.clientWidth;
      h = hero.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.min(64, Math.round(w / 24));
      puntos = [];
      for (var i = 0; i < n; i++) {
        puntos.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.33,
          vy: (Math.random() - 0.5) * 0.33,
          r: Math.random() * 1.6 + 0.6,
          verde: Math.random() < 0.28
        });
      }
    }
    medir();
    window.addEventListener("resize", medir);

    hero.addEventListener("pointermove", function (e) {
      var r = hero.getBoundingClientRect();
      raton.x = e.clientX - r.left;
      raton.y = e.clientY - r.top;
    });
    hero.addEventListener("pointerleave", function () { raton.x = -9999; raton.y = -9999; });

    window.ScrollTrigger.create({
      trigger: hero,
      start: "top bottom",
      end: "bottom top",
      onToggle: function (self) { activo = self.isActive; }
    });

    gsap.ticker.add(function () {
      if (!activo) return;
      ctx.clearRect(0, 0, w, h);
      var i, j, p, q, dx, dy, dist, d2;
      for (i = 0; i < puntos.length; i++) {
        p = puntos[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        dx = p.x - raton.x; dy = p.y - raton.y;
        dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 110 && dist > 0.01) {
          p.x += (dx / dist) * (110 - dist) * 0.035;
          p.y += (dy / dist) * (110 - dist) * 0.035;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.verde ? "rgba(34,197,94,0.55)" : "rgba(255,255,255,0.3)";
        ctx.fill();
      }
      for (i = 0; i < puntos.length; i++) {
        for (j = i + 1; j < puntos.length; j++) {
          p = puntos[i]; q = puntos[j];
          dx = p.x - q.x; dy = p.y - q.y;
          d2 = dx * dx + dy * dy;
          if (d2 < 12100) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = "rgba(34,197,94," + (0.15 * (1 - d2 / 12100)) + ")";
            ctx.lineWidth = 0.7;
            ctx.stroke();
          }
        }
      }
    });
  })();

  /* ---------- Cursor personalizado ---------- */
  (function cursor() {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    var dot = document.createElement("div");
    dot.className = "cursor-dot";
    var ring = document.createElement("div");
    ring.className = "cursor-ring";
    document.body.appendChild(dot);
    document.body.appendChild(ring);

    gsap.set([dot, ring], { x: -200, y: -200, opacity: 0, scale: 0.6 });

    var xDot = gsap.quickTo(dot, "x", { duration: 0.07, ease: "power2" });
    var yDot = gsap.quickTo(dot, "y", { duration: 0.07, ease: "power2" });
    var xRing = gsap.quickTo(ring, "x", { duration: 0.35, ease: "power3" });
    var yRing = gsap.quickTo(ring, "y", { duration: 0.35, ease: "power3" });

    var mostrado = false;
    window.addEventListener("pointermove", function (e) {
      xDot(e.clientX); yDot(e.clientY);
      xRing(e.clientX); yRing(e.clientY);
      if (!mostrado) {
        mostrado = true;
        gsap.to([dot, ring], { opacity: 1, scale: 1, duration: 0.5, stagger: 0.1, ease: "power3.out" });
      }
    }, { passive: true });

    document.querySelectorAll("a, button, .btn").forEach(function (el) {
      el.addEventListener("pointerenter", function () { ring.classList.add("hovering"); });
      el.addEventListener("pointerleave", function () { ring.classList.remove("hovering"); });
    });

    window.addEventListener("pointerdown", function () { gsap.to(ring, { scale: 0.72, duration: 0.15 }); });
    window.addEventListener("pointerup", function () { gsap.to(ring, { scale: 1, duration: 0.35, ease: "back.out(2.5)" }); });
  })();

  /* ---------- Recalcular ---------- */
  window.addEventListener("load", function () { window.ScrollTrigger.refresh(); });
  setTimeout(function () { window.ScrollTrigger.refresh(); }, 2600);
})();
