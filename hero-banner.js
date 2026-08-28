/**
 * Hero Banner dinámico — Mercado Garmendia V14
 * Mensajes rotativos cada 5 s · fondos desde galería local.
 */
(function (global) {
  "use strict";

  const PHRASES = [
    { frase: "Hagamos que comprar local vuelva a estar de moda.", subtitulo: "Tradición viva en cada pasillo del Garmendia.", overlay: "rgba(39,174,96,0.55)", anim: "fade-scale" },
    { frase: "Lo más auténtico no se pide por aplicación.", subtitulo: "Sabores reales, personas reales, historias reales.", overlay: "rgba(230,126,34,0.58)", anim: "slide-left" },
    { frase: "Frescura real, sin filtros.", subtitulo: "Frutas y verduras recién llegadas del Valle.", overlay: "rgba(46,204,113,0.52)", anim: "blur-in" },
    { frase: "Menos supermercado, más tradición.", subtitulo: "El mercado donde Culiacán se encuentra.", overlay: "rgba(107,30,61,0.62)", anim: "zoom" },
    { frase: "Porque lo bueno se encuentra cerca.", subtitulo: "Apoya el comercio de tu ciudad.", overlay: "rgba(52,152,219,0.55)", anim: "fade-scale" },
    { frase: "Apoya a quienes hacen grande nuestra ciudad.", subtitulo: "Cada local es una familia sinaloense.", overlay: "rgba(201,162,39,0.5)", anim: "slide-right" },
    { frase: "Lo natural nunca deja de ser tendencia.", subtitulo: "Productos frescos, sazón auténtica.", overlay: "rgba(39,174,96,0.58)", anim: "blur-in" },
    { frase: "Lo mejor de Sinaloa se encuentra aquí.", subtitulo: "Mariscos, carnes, antojitos y más.", overlay: "rgba(231,76,60,0.55)", anim: "zoom" },
    { frase: "Cada compra apoya a una familia local.", subtitulo: "Tu bolsa construye comunidad.", overlay: "rgba(107,30,61,0.58)", anim: "fade-scale" },
    { frase: "El sabor que no encontrarás en una cadena comercial.", subtitulo: "Gastronomía sinaloense de verdad.", overlay: "rgba(230,126,34,0.6)", anim: "slide-left" },
    { frase: "Recién cosechado, recién disfrutado.", subtitulo: "Del campo a tu mesa en el mismo día.", overlay: "rgba(46,204,113,0.55)", anim: "blur-in" },
    { frase: "Tradición que sigue conquistando generaciones.", subtitulo: "Más de un siglo de historia culiacanense.", overlay: "rgba(201,162,39,0.52)", anim: "zoom" },
    { frase: "Sabores que cuentan historias.", subtitulo: "Cada platillo tiene raíz y memoria.", overlay: "rgba(107,30,61,0.6)", anim: "fade-scale" },
    { frase: "El corazón de Culiacán late en cada pasillo.", subtitulo: "250 locales te esperan.", overlay: "rgba(52,152,219,0.55)", anim: "slide-right" },
    { frase: "Lo natural nunca pasa de moda.", subtitulo: "Frescura, color y vida en el mercado.", overlay: "rgba(39,174,96,0.55)", anim: "blur-in" },
    { frase: "Apoyar lo local también es construir comunidad.", subtitulo: "Consume cerca, transforma tu ciudad.", overlay: "rgba(201,162,39,0.55)", anim: "zoom" },
    { frase: "Aquí la frescura tiene nombre y apellido.", subtitulo: "Productores y locatarios de confianza.", overlay: "rgba(46,204,113,0.52)", anim: "fade-scale" },
    { frase: "Descubre el sabor auténtico de nuestra tierra.", subtitulo: "Turismo gastronómico en Culiacán.", overlay: "rgba(230,126,34,0.58)", anim: "slide-left" },
    { frase: "Consume local, transforma tu ciudad.", subtitulo: "El Mercado Garmendia te invita.", overlay: "rgba(107,30,61,0.58)", anim: "blur-in" },
    { frase: "Tradición, sabor y orgullo sinaloense.", subtitulo: "Bienvenidos al corazón de Culiacán.", overlay: "rgba(231,76,60,0.55)", anim: "zoom" },
  ];

  function buildSlides() {
    const fotos = global.MG_GALERIA_FOTOS || [];
    const fallback = "galeria-01.jpeg";
    return PHRASES.map((p, i) => ({
      ...p,
      imagen: fotos[i % fotos.length] || fallback,
    }));
  }

  let SLIDES = buildSlides();

  const DURATION = 5000;
  let idx = 0;
  let timer = null;
  let progressRAF = null;
  let startTime = 0;
  let touchStartX = 0;

  function mount(container) {
    if (!container) return;
    SLIDES = buildSlides();
    container.innerHTML = `
      <section class="mg-campaign-hero" id="campana-local" aria-label="Campaña compra local">
        <div class="mg-campaign-bg" id="mgCampBgA"></div>
        <div class="mg-campaign-bg mg-campaign-bg-b" id="mgCampBgB"></div>
        <div class="mg-campaign-overlay" id="mgCampOverlay"></div>
        <div class="mg-campaign-particles" aria-hidden="true">
          <span class="mg-particle"></span><span class="mg-particle"></span><span class="mg-particle"></span>
          <span class="mg-particle"></span><span class="mg-particle"></span>
        </div>
        <div class="mg-campaign-content" id="mgCampContent">
          <p class="mg-campaign-eyebrow" id="mgCampEyebrow">Mercado Turístico · Culiacán, Sinaloa</p>
          <h2 class="mg-campaign-title" id="mgCampTitle"></h2>
          <p class="mg-campaign-sub" id="mgCampSub"></p>
          <div class="mg-campaign-btns">
            <button type="button" class="mg-btn-primary" id="mgBtnExplore">Explora el Mercado</button>
            <button type="button" class="mg-btn-secondary" id="mgBtnLocales">Conoce a nuestros locatarios</button>
          </div>
        </div>
        <button type="button" class="mg-campaign-arrow mg-campaign-prev" id="mgCampPrev" aria-label="Anterior"><i class="fa-solid fa-chevron-left"></i></button>
        <button type="button" class="mg-campaign-arrow mg-campaign-next" id="mgCampNext" aria-label="Siguiente"><i class="fa-solid fa-chevron-right"></i></button>
        <div class="mg-campaign-dots" id="mgCampDots" role="tablist"></div>
        <div class="mg-campaign-progress"><div class="mg-campaign-progress-bar" id="mgCampProgress"></div></div>
      </section>`;

    const dots = container.querySelector("#mgCampDots");
    SLIDES.forEach((_, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "mg-campaign-dot" + (i === 0 ? " active" : "");
      b.setAttribute("aria-label", `Diapositiva ${i + 1}`);
      b.dataset.idx = String(i);
      b.addEventListener("click", () => goTo(i, true));
      dots.appendChild(b);
    });

    container.querySelector("#mgCampPrev")?.addEventListener("click", () => goTo((idx - 1 + SLIDES.length) % SLIDES.length, true));
    container.querySelector("#mgCampNext")?.addEventListener("click", () => goTo((idx + 1) % SLIDES.length, true));
    container.querySelector("#mgBtnExplore")?.addEventListener("click", () => {
      const t = document.querySelector("#locales");
      if (t) t.scrollIntoView({ behavior: "smooth" });
    });
    container.querySelector("#mgBtnLocales")?.addEventListener("click", () => {
      const t = document.querySelector("#locales");
      if (t) t.scrollIntoView({ behavior: "smooth" });
    });

    const hero = container.querySelector(".mg-campaign-hero");
    hero?.addEventListener("touchstart", (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
    hero?.addEventListener("touchend", (e) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 50) goTo(dx < 0 ? (idx + 1) % SLIDES.length : (idx - 1 + SLIDES.length) % SLIDES.length, true);
    });

    document.addEventListener("keydown", (e) => {
      if (!hero || !document.body.contains(hero)) return;
      const r = hero.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      if (e.key === "ArrowLeft") goTo((idx - 1 + SLIDES.length) % SLIDES.length, true);
      if (e.key === "ArrowRight") goTo((idx + 1) % SLIDES.length, true);
    });

    hero?.addEventListener("mousemove", (e) => {
      const r = hero.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      const content = container.querySelector("#mgCampContent");
      if (content) content.style.transform = `translate(${px * 12}px, ${py * 8}px)`;
    });

    goTo(0, false);
    schedule();
  }

  function goTo(newIdx, animate) {
    idx = newIdx;
    const slide = SLIDES[idx];
    const title = document.getElementById("mgCampTitle");
    const sub = document.getElementById("mgCampSub");
    const overlay = document.getElementById("mgCampOverlay");
    const bgA = document.getElementById("mgCampBgA");
    const bgB = document.getElementById("mgCampBgB");
    const content = document.getElementById("mgCampContent");

    if (overlay) overlay.style.background = slide.overlay;
    const activeBg = bgA?.classList.contains("is-front") ? bgB : bgA;
    const frontBg = bgA?.classList.contains("is-front") ? bgA : bgB;
    if (activeBg) {
      activeBg.style.backgroundImage = `url('${slide.imagen}')`;
      activeBg.classList.add("is-front");
    }
    if (frontBg) frontBg.classList.remove("is-front");

    if (content) {
      content.className = "mg-campaign-content anim-" + slide.anim + (animate ? " is-entering" : "");
      requestAnimationFrame(() => content.classList.remove("is-entering"));
    }
    if (title) title.textContent = slide.frase;
    if (sub) sub.textContent = slide.subtitulo;

    document.querySelectorAll(".mg-campaign-dot").forEach((d, i) => d.classList.toggle("active", i === idx));
    resetProgress();
    if (animate) schedule();
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(() => goTo((idx + 1) % SLIDES.length, true), DURATION);
  }

  function resetProgress() {
    const bar = document.getElementById("mgCampProgress");
    if (!bar) return;
    cancelAnimationFrame(progressRAF);
    startTime = performance.now();
    function tick(now) {
      const p = Math.min(1, (now - startTime) / DURATION);
      bar.style.transform = `scaleX(${p})`;
      if (p < 1) progressRAF = requestAnimationFrame(tick);
    }
    bar.style.transform = "scaleX(0)";
    progressRAF = requestAnimationFrame(tick);
  }

  global.MG_HERO_BANNER = { mount, SLIDES };
})(window);