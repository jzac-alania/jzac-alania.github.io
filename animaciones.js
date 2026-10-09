/* Portafolio — Jimy Alania
   Animaciones: GSAP (ScrollTrigger + SplitText) y Lenis (smooth scroll)
   Vendor: vendor/gsap.min.js, ScrollTrigger.min.js, SplitText.min.js, lenis.min.js
   Fallback: si falta GSAP o el usuario pide movimiento reducido, todo queda visible. */

(function () {
  "use strict";

  var reducido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!window.gsap || !window.ScrollTrigger || !window.Lenis || reducido) {
    document.querySelectorAll(".reveal").forEach(function (el) {
      el.classList.add("is-visible");
    });
    return;
  }

  var gsap = window.gsap;
  gsap.registerPlugin(window.ScrollTrigger, window.SplitText);

  document.documentElement.classList.add("gsap-on");

  /* ---------- Smooth scroll ---------- */

  var lenis = new window.Lenis({ duration: 1.05, smoothWheel: true });

  lenis.on("scroll", window.ScrollTrigger.update);
  gsap.ticker.add(function (time) {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href");
      if (!id || id === "#") return;
      var destino = document.querySelector(id);
      if (!destino) return;
      e.preventDefault();
      lenis.scrollTo(destino, { offset: -72 });
    });
  });

  /* ---------- Entrada del hero ---------- */

  var split = new window.SplitText(".hero-title", {
    type: "chars,words,lines",
    mask: "lines"
  });

  gsap.set(".hero-title", { opacity: 1 });

  gsap
    .timeline({ defaults: { ease: "power3.out" }, delay: 0.45 })
    .fromTo(".pill.hero-in", { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 })
    .from(split.chars, { yPercent: 120, opacity: 0, stagger: 0.016, duration: 0.85 }, "-=0.35")
    .fromTo(".hero-sub.hero-in", { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, "-=0.55")
    .fromTo(".hero-actions.hero-in", { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, "-=0.5")
    .fromTo(".hero-note.hero-in", { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6 }, "-=0.5")
    .fromTo(
      ".phone.hero-in",
      { y: 70, opacity: 0, rotate: 5, scale: 0.95 },
      { y: 0, opacity: 1, rotate: 0, scale: 1, duration: 1.1 },
      "-=0.95"
    )
    .from(".float-card", { opacity: 0, duration: 0.6, stagger: 0.15 }, "-=0.5")
    .from(".whatsapp-float", { scale: 0, opacity: 0, duration: 0.7, ease: "back.out(1.7)", clearProps: "transform" }, "-=0.3");

  /* Red de seguridad: el hero nunca puede quedar invisible */
  setTimeout(function () {
    gsap.set(".hero-in", { opacity: 1, clearProps: "filter,transform" });
  }, 3200);

  /* ---------- Reveals al hacer scroll ---------- */

  gsap.utils.toArray(".reveal").forEach(function (el) {
    gsap.from(el, {
      y: 44,
      opacity: 0,
      duration: 0.9,
      ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 86%" }
    });
  });

  gsap.utils.toArray("section.section").forEach(function (sec) {
    var eyebrow = sec.querySelectorAll(".section-eyebrow");
    if (eyebrow.length) {
      gsap.from(eyebrow, {
        y: 26,
        opacity: 0,
        duration: 0.7,
        stagger: 0.1,
        scrollTrigger: { trigger: sec, start: "top 78%" }
      });
    }
  });

  gsap.utils.toArray(".section-title").forEach(function (titulo) {
    var s = new window.SplitText(titulo, { type: "lines", mask: "lines" });
    gsap.from(s.lines, {
      yPercent: 115,
      duration: 0.95,
      stagger: 0.1,
      ease: "power4.out",
      scrollTrigger: { trigger: titulo, start: "top 85%" }
    });
  });

  gsap.from(".strip-item", {
    opacity: 0,
    y: 16,
    duration: 0.6,
    stagger: 0.1,
    scrollTrigger: { trigger: ".strip", start: "top 92%" }
  });

  gsap.from(".sell-point", {
    scale: 0.85,
    opacity: 0,
    duration: 0.6,
    stagger: 0.09,
    ease: "back.out(1.6)",
    scrollTrigger: { trigger: ".sell-points", start: "top 88%" }
  });

  gsap.from(".tech-list li", {
    opacity: 0,
    y: 14,
    duration: 0.5,
    stagger: 0.07,
    scrollTrigger: { trigger: ".tech-list", start: "top 92%" }
  });

  gsap.from(".guarantee", {
    y: 26,
    opacity: 0,
    duration: 0.6,
    stagger: 0.1,
    scrollTrigger: { trigger: ".guarantees", start: "top 90%" }
  });

  /* ---------- Parallax y scrub ---------- */

  gsap.to(".hero-visual", {
    y: -70,
    ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 0.6 }
  });

  gsap.to(".hero-copy", {
    y: -30,
    opacity: 0.4,
    ease: "none",
    scrollTrigger: { trigger: ".hero", start: "25% top", end: "bottom top", scrub: 0.6 }
  });

  gsap.fromTo(
    ".featured-visual .phone",
    { rotate: -5, y: 60 },
    {
      rotate: 4,
      y: -40,
      ease: "none",
      scrollTrigger: { trigger: ".featured", start: "top bottom", end: "bottom top", scrub: 0.6 }
    }
  );

  /* ---------- Navbar con sombra al hacer scroll ---------- */

  var navbar = document.querySelector(".navbar");
  if (navbar) {
    window.addEventListener(
      "scroll",
      function () {
        navbar.classList.toggle("scrolled", window.scrollY > 30);
      },
      { passive: true }
    );
  }

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
    var w = 0;
    var h = 0;
    var puntos = [];
    var activo = true;
    var raton = { x: -9999, y: -9999 };

    function medir() {
      w = hero.clientWidth;
      h = hero.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.min(72, Math.round(w / 22));
      puntos = [];
      for (var i = 0; i < n; i++) {
        puntos.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          r: Math.random() * 1.7 + 0.6,
          verde: Math.random() < 0.25
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
    hero.addEventListener("pointerleave", function () {
      raton.x = -9999;
      raton.y = -9999;
    });

    window.ScrollTrigger.create({
      trigger: hero,
      start: "top bottom",
      end: "bottom top",
      onToggle: function (self) {
        activo = self.isActive;
      }
    });

    gsap.ticker.add(function () {
      if (!activo) return;
      ctx.clearRect(0, 0, w, h);
      var i;
      var j;
      var p;
      var q;
      var dx;
      var dy;
      var dist;

      for (i = 0; i < puntos.length; i++) {
        p = puntos[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        dx = p.x - raton.x;
        dy = p.y - raton.y;
        dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 110 && dist > 0.01) {
          p.x += (dx / dist) * (110 - dist) * 0.035;
          p.y += (dy / dist) * (110 - dist) * 0.035;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.verde ? "rgba(34,197,94,0.55)" : "rgba(255,255,255,0.32)";
        ctx.fill();
      }

      for (i = 0; i < puntos.length; i++) {
        for (j = i + 1; j < puntos.length; j++) {
          p = puntos[i];
          q = puntos[j];
          dx = p.x - q.x;
          dy = p.y - q.y;
          var d2 = dx * dx + dy * dy;
          if (d2 < 12100) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = "rgba(34,197,94," + (0.16 * (1 - d2 / 12100)) + ")";
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

    gsap.set([dot, ring], { opacity: 0, scale: 0 });
    gsap.to([dot, ring], {
      opacity: 1,
      scale: 1,
      duration: 0.6,
      stagger: 0.12,
      ease: "power3.out",
      delay: 1.3
    });

    var xDot = gsap.quickTo(dot, "x", { duration: 0.07, ease: "power2" });
    var yDot = gsap.quickTo(dot, "y", { duration: 0.07, ease: "power2" });
    var xRing = gsap.quickTo(ring, "x", { duration: 0.35, ease: "power3" });
    var yRing = gsap.quickTo(ring, "y", { duration: 0.35, ease: "power3" });

    window.addEventListener(
      "pointermove",
      function (e) {
        xDot(e.clientX);
        yDot(e.clientY);
        xRing(e.clientX);
        yRing(e.clientY);
      },
      { passive: true }
    );

    document.querySelectorAll("a, button, .btn").forEach(function (el) {
      el.addEventListener("pointerenter", function () {
        ring.classList.add("hovering");
      });
      el.addEventListener("pointerleave", function () {
        ring.classList.remove("hovering");
      });
    });

    window.addEventListener("pointerdown", function () {
      gsap.to(ring, { scale: 0.72, duration: 0.15 });
    });
    window.addEventListener("pointerup", function () {
      gsap.to(ring, { scale: 1, duration: 0.35, ease: "back.out(2.5)" });
    });
  })();

  /* ---------- Botones magnéticos ---------- */

  document.querySelectorAll(".hero-actions .btn, .cta-actions .btn").forEach(function (btn) {
    var xTo = gsap.quickTo(btn, "x", { duration: 0.4, ease: "power3" });
    var yTo = gsap.quickTo(btn, "y", { duration: 0.4, ease: "power3" });

    btn.addEventListener("pointermove", function (e) {
      var r = btn.getBoundingClientRect();
      xTo((e.clientX - r.left - r.width / 2) * 0.28);
      yTo((e.clientY - r.top - r.height / 2) * 0.4);
    });
    btn.addEventListener("pointerleave", function () {
      xTo(0);
      yTo(0);
    });
  });

  /* ---------- Tilt 3D de las cards de servicio ---------- */

  document.querySelectorAll(".services-grid .card").forEach(function (card) {
    var rx = gsap.quickTo(card, "rotationX", { duration: 0.5, ease: "power2" });
    var ry = gsap.quickTo(card, "rotationY", { duration: 0.5, ease: "power2" });

    card.addEventListener("pointermove", function (e) {
      var r = card.getBoundingClientRect();
      rx(-((e.clientY - r.top) / r.height - 0.5) * 9);
      ry(((e.clientX - r.left) / r.width - 0.5) * 9);
    });
    card.addEventListener("pointerleave", function () {
      rx(0);
      ry(0);
    });
  });

  /* ---------- Metodología editorial (estética A24) ---------- */

  var filmTl = gsap.timeline({
    scrollTrigger: { trigger: ".steps-viewport", start: "top 85%" }
  });

  filmTl
    .from(".section-film .step-rule", {
      scaleX: 0,
      duration: 1,
      stagger: 0.16,
      ease: "power3.inOut"
    }, 0)
    .from(".section-film .step", {
      opacity: 0,
      y: 56,
      duration: 0.9,
      stagger: 0.16,
      ease: "power3.out",
      clearProps: "transform"
    }, 0.12);

  /* ---------- Marquee del strip de confianza ---------- */

  var mmMarquee = gsap.matchMedia();
  mmMarquee.add("(min-width: 1021px)", function () {
    var inner = document.querySelector(".strip-inner");
    if (!inner) return;
    var htmlOriginal = inner.innerHTML;
    inner.innerHTML += htmlOriginal;
    inner.classList.add("marquee");

    var tween = gsap.to(inner, {
      x: function () {
        return -inner.scrollWidth / 2;
      },
      duration: 30,
      ease: "none",
      repeat: -1
    });

    return function () {
      tween.kill();
      inner.classList.remove("marquee");
      inner.innerHTML = htmlOriginal;
      gsap.set(inner, { x: 0 });
    };
  });

  /* ---------- Proceso horizontal con pin (desktop) ---------- */

  var mmPasos = gsap.matchMedia();
  mmPasos.add("(min-width: 1021px)", function () {
    var vp = document.querySelector(".steps-viewport");
    var steps = document.querySelector(".steps");
    if (!vp || !steps) return;

    steps.classList.add("h-track");

    var tween = gsap.to(steps, {
      x: function () {
        return -(steps.scrollWidth - vp.clientWidth);
      },
      ease: "none",
      scrollTrigger: {
        trigger: vp,
        start: "top 265px",
        end: function () {
          return "+=" + Math.max(steps.scrollWidth - vp.clientWidth + 300, 500);
        },
        scrub: 0.7,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true
      }
    });

    return function () {
      if (tween.scrollTrigger) tween.scrollTrigger.kill();
      tween.kill();
      steps.classList.remove("h-track");
      gsap.set(steps, { x: 0 });
    };
  });

  /* ---------- Recalcular triggers tras cargar imágenes ---------- */

  window.addEventListener("load", function () {
    window.ScrollTrigger.refresh();
  });
  setTimeout(function () {
    window.ScrollTrigger.refresh();
  }, 2600);
})();
