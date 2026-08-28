/* Mapa SVG interactivo — Plano conceptual Mercado Garmendia V14 */
(function (global) {
  "use strict";

  const PLANO = global.MG_PLANO || {};
  const PLANO_META = PLANO.meta || {};
  const SVG_W = PLANO_META.svgWidth || 1000;
  const SVG_H = PLANO_META.svgHeight || 720;

  let mapFilterGrupo = "";
  let mapSearch = "";
  let scale = 1;
  let panX = 0;
  let panY = 0;
  let isPanning = false;
  let panStart = { x: 0, y: 0, px: 0, py: 0 };

  let svgRoot = null;
  let viewportEl = null;
  let localesLayer = null;

  const FAV_KEY = "mg_favoritos";
  const MIN_SCALE = 0.45;
  const MAX_SCALE = 2.8;

  function svgIcon(inner) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + '</svg>';
  }

  const GRUPO_SVG = {
    "Frutas y Verduras": svgIcon('<path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z"/><path d="M10 2c1 .5 2 2 2 5"/>'),
    "Carnicerías": svgIcon('<circle cx="12.5" cy="8.5" r="2.5"/><path d="M12.5 2a6.5 6.5 0 0 0-6.22 4.6c-1.1 3.13-.78 3.9-3.18 6.08A3 3 0 0 0 5 18c4 0 8.5-1 12.5-3a7.5 7.5 0 0 0 4.5-6 6.5 6.5 0 0 0-9.5-7z"/>'),
    "Comida Preparada": svgIcon('<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3v7"/>'),
    "Artesanías": svgIcon('<path d="M8 3h8"/><path d="M9 3v3"/><path d="M15 3v3"/><path d="M7 6v5a5 5 0 0 0 10 0V6"/>'),
    "Abarrotes": svgIcon('<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>'),
    "Especias y Víveres": svgIcon('<path d="M4 10h16"/><path d="M5 10v2a7 7 0 0 0 14 0v-2"/><path d="M12 3v7"/><path d="M10 3h4"/>'),
    "Varios": svgIcon('<path d="M21 8l-9-5-9 5v8l9 5 9-5V8z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/>'),
    "Moda y Hogar": svgIcon('<path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/>'),
  };

  function getMapDeps() {
    return global.MG_MAP_DEPS || {};
  }

  function getFavoritos() {
    try { return JSON.parse(localStorage.getItem(FAV_KEY) || "[]"); }
    catch { return []; }
  }

  function isFavorito(id) { return getFavoritos().includes(id); }

  function toggleFavorito(id) {
    let favs = getFavoritos();
    favs = favs.includes(id) ? favs.filter((x) => x !== id) : favs.concat(id);
    localStorage.setItem(FAV_KEY, JSON.stringify(favs));
    const btn = document.querySelector(".ficha-btn-fav");
    if (btn) {
      const on = favs.includes(id);
      btn.classList.toggle("is-active", on);
      btn.innerHTML = on
        ? '<i class="fa-solid fa-star"></i> Guardado en favoritos'
        : '<i class="fa-regular fa-star"></i> Guardar favorito';
    }
  }

  function phoneTel(contacto) {
    return (contacto || "").replace(/[^\d+]/g, "");
  }

  function isOpenNow(horario) {
    const m = (horario || "").match(/(\d{1,2}):(\d{2})\s*(am|pm)\s*[–\-]\s*(\d{1,2}):(\d{2})\s*(am|pm)/i);
    if (!m) return true;
    const toMin = (h, min, ap) => {
      let hh = +h;
      if (ap.toLowerCase() === "pm" && hh !== 12) hh += 12;
      if (ap.toLowerCase() === "am" && hh === 12) hh = 0;
      return hh * 60 + (+min);
    };
    const open = toMin(m[1], m[2], m[3]);
    const close = toMin(m[4], m[5], m[6]);
    const now = new Date();
    const cur = now.getHours() * 60 + now.getMinutes();
    return cur >= open && cur < close;
  }

  function getDestacadosProducts(localId) {
    try {
      const raw = localStorage.getItem("mg_cat_" + localId);
      if (!raw) return null;
      const items = JSON.parse(raw) || [];
      const dest = items.filter((p) => p && p.destacado === true);
      if (!dest.length) return null;
      return dest.slice(0, 5).map((p) => ({
        localId: localId,
        producto: p.producto,
        precio: p.precio,
        categoria: "",
        unidad: p.unidad || "pieza",
        productoId: p.id,
      }));
    } catch (e) {
      return null;
    }
  }

  function matchesMapFilter(local) {
    if (mapFilterGrupo && local.grupoColor !== mapFilterGrupo) return false;
    if (mapSearch) {
      const q = mapSearch.toLowerCase();
      const hay = [local.nombre, local.categoria, local.giro, String(local.id)].join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }

  function applyTransform() {
    if (!svgRoot) return;
    svgRoot.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
    if (viewportEl) viewportEl.classList.toggle("is-zoomed", scale >= 1.35);
    const lbl = document.getElementById("mapZoomLabel");
    if (lbl) lbl.textContent = `${Math.round(scale * 100)}%`;
  }

  function setMapZoom(delta, centerX, centerY) {
    const prev = scale;
    scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale + delta));
    if (viewportEl && centerX != null) {
      const r = viewportEl.getBoundingClientRect();
      const cx = centerX - r.left;
      const cy = centerY - r.top;
      panX = cx - ((cx - panX) * scale) / prev;
      panY = cy - ((cy - panY) * scale) / prev;
    }
    applyTransform();
  }

  function resetMapView() {
    fitMapPreview();
  }

  function fitMapPreview() {
    if (!viewportEl) return;
    const vp = viewportEl.getBoundingClientRect();
    const ed = PLANO_META.edificio || { x: 70, y: 118, w: 860, h: 545 };
    const pad = 16;
    scale = Math.min((vp.width - pad) / ed.w, (vp.height - pad) / ed.h);
    scale = Math.min(Math.max(scale, 0.95), MAX_SCALE);
    panX = (vp.width - ed.w * scale) / 2 - ed.x * scale + 8;
    panY = (vp.height - ed.h * scale) / 2 - ed.y * scale + 8;
    applyTransform();
  }

  function initPanZoom(viewport, svgWrap) {
    viewportEl = viewport;
    svgRoot = svgWrap;

    viewport.addEventListener("wheel", (e) => {
      e.preventDefault();
      setMapZoom(e.deltaY < 0 ? 0.12 : -0.12, e.clientX, e.clientY);
    }, { passive: false });

    viewport.addEventListener("mousedown", (e) => {
      if (e.target.closest(".mapa-local-svg")) return;
      isPanning = true;
      panStart = { x: e.clientX, y: e.clientY, px: panX, py: panY };
      viewport.classList.add("is-panning");
    });

    window.addEventListener("mousemove", (e) => {
      if (!isPanning) return;
      panX = panStart.px + (e.clientX - panStart.x);
      panY = panStart.py + (e.clientY - panStart.y);
      applyTransform();
    });

    window.addEventListener("mouseup", () => {
      isPanning = false;
      viewport?.classList.remove("is-panning");
    });

    let touchDist = 0;
    viewport.addEventListener("touchstart", (e) => {
      if (e.touches.length === 2) {
        touchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      } else if (e.touches.length === 1 && !e.target.closest(".mapa-local-svg")) {
        isPanning = true;
        panStart = { x: e.touches[0].clientX, y: e.touches[0].clientY, px: panX, py: panY };
      }
    }, { passive: true });

    viewport.addEventListener("touchmove", (e) => {
      if (e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        setMapZoom((dist - touchDist) * 0.004, (e.touches[0].clientX + e.touches[1].clientX) / 2, (e.touches[0].clientY + e.touches[1].clientY) / 2);
        touchDist = dist;
      } else if (isPanning && e.touches.length === 1) {
        panX = panStart.px + (e.touches[0].clientX - panStart.x);
        panY = panStart.py + (e.touches[0].clientY - panStart.y);
        applyTransform();
      }
    }, { passive: true });

    viewport.addEventListener("touchend", () => { isPanning = false; });
  }

  function svgEl(tag, attrs, children) {
    const ns = "http://www.w3.org/2000/svg";
    const node = document.createElementNS(ns, tag);
    if (attrs) {
      Object.entries(attrs).forEach(([k, v]) => {
        if (k === "text") node.textContent = v;
        else if (k === "on click") node.addEventListener("click", v);
        else if (v != null) node.setAttribute(k, String(v));
      });
    }
    (children || []).forEach((c) => { if (c) node.appendChild(c); });
    return node;
  }

  function drawPasillos(g) {
    const p = PLANO_META.pasillos || {};
    const ed = PLANO_META.edificio || { x: 70, y: 118, w: 860, h: 545 };

    if (p.principal) {
      g.appendChild(svgEl("rect", {
        x: p.principal.x1, y: ed.y, width: p.principal.x2 - p.principal.x1, height: ed.h,
        class: "mapa-pasillo-svg",
      }));
      g.appendChild(svgEl("text", {
        x: (p.principal.x1 + p.principal.x2) / 2, y: ed.y + ed.h / 2,
        class: "mapa-pasillo-label", "text-anchor": "middle",
        transform: `rotate(-90 ${(p.principal.x1 + p.principal.x2) / 2} ${ed.y + ed.h / 2})`,
        text: "PASILLO PRINCIPAL",
      }));
    }
    ["secundario1", "secundario2"].forEach((key) => {
      const a = p[key];
      if (!a) return;
      g.appendChild(svgEl("rect", {
        x: ed.x, y: a.y1, width: ed.w, height: a.y2 - a.y1,
        class: "mapa-pasillo-svg",
      }));
      g.appendChild(svgEl("text", {
        x: ed.x + ed.w / 2, y: (a.y1 + a.y2) / 2 + 4,
        class: "mapa-pasillo-label", "text-anchor": "middle",
        text: "PASILLO SECUNDARIO",
      }));
    });
  }

  function drawAreas(g) {
    (PLANO_META.areas || []).forEach((a) => {
      g.appendChild(svgEl("rect", {
        x: a.x, y: a.y, width: a.w, height: a.h,
        class: `mapa-area-svg mapa-area-${a.tipo}`,
      }));
      g.appendChild(svgEl("text", {
        x: a.x + a.w / 2, y: a.y + a.h / 2 + 4,
        class: "mapa-area-label", "text-anchor": "middle", text: a.label,
      }));
    });
    (PLANO_META.accesos || []).forEach((a) => {
      g.appendChild(svgEl("text", {
        x: a.x, y: a.y, class: "mapa-acceso-label", "text-anchor": "middle", text: a.label,
      }));
    });
  }

  function renderLocalesSvg() {
    const { DATA, openFichaRapida } = getMapDeps();
    const locales = DATA.locales || [];
    if (!localesLayer) return;

    while (localesLayer.firstChild) localesLayer.removeChild(localesLayer.firstChild);

    locales.forEach((local) => {
      const m = local.mapa || {};
      const match = matchesMapFilter(local);
      const highlight = mapSearch && String(local.id) === mapSearch;
      const g = svgEl("g", {
        class: `mapa-local-svg${match ? "" : " is-dimmed"}${highlight ? " is-highlight" : ""}`,
        "data-id": local.id,
      });

      const stroke = m.tipo === "perimetral" ? 2.2 : 1.2;
      g.appendChild(svgEl("rect", {
        x: m.x, y: m.y, width: m.w, height: m.h,
        rx: 3, fill: local.color, stroke: "#fff", "stroke-width": stroke,
        class: "mapa-local-rect",
      }));

      const cx = m.x + m.w / 2;
      const compact = m.w < 36 || m.h < 26;
      const fs = compact ? 6 : m.w < 42 ? 7 : 8;
      const numY = compact ? m.y + m.h * 0.52 : m.y + m.h * 0.36;

      g.appendChild(svgEl("text", {
        x: cx, y: numY, class: "mapa-local-num-svg",
        "text-anchor": "middle", "font-size": compact ? fs + 1 : fs + 2, text: String(local.id),
      }));

      if (!compact) {
        const maxLen = m.w < 40 ? 10 : 12;
        const name = local.nombre.length > maxLen ? local.nombre.slice(0, maxLen - 1) + "…" : local.nombre;
        g.appendChild(svgEl("text", {
          x: cx, y: m.y + m.h * 0.62, class: "mapa-local-name-svg",
          "text-anchor": "middle", "font-size": fs, text: name,
        }));

        if (m.h > 34) {
          const catMax = m.w < 40 ? 9 : 11;
          const cat = local.categoria.length > catMax ? local.categoria.slice(0, catMax - 1) + "…" : local.categoria;
          g.appendChild(svgEl("text", {
            x: cx, y: m.y + m.h * 0.82, class: "mapa-local-cat-svg",
            "text-anchor": "middle", "font-size": fs - 1, text: cat,
          }));
        }
      }

      g.addEventListener("click", (e) => {
        e.stopPropagation();
        openFichaRapida(local);
      });

      localesLayer.appendChild(g);
    });
  }

  function scrollToLocal(id) {
    const { DATA } = getMapDeps();
    const local = (DATA.locales || []).find((l) => l.id === Number(id));
    if (!local || !local.mapa || !viewportEl) return;

    const vp = viewportEl.getBoundingClientRect();
    const cx = local.mapa.x + local.mapa.w / 2;
    const cy = local.mapa.y + local.mapa.h / 2;
    scale = 1.4;
    panX = vp.width / 2 - cx * scale;
    panY = vp.height / 2 - cy * scale;
    applyTransform();
    renderLocalesSvg();

    setTimeout(() => {
      const g = localesLayer?.querySelector(`[data-id="${id}"]`);
      if (!g) return;
      g.classList.add("is-highlight");
      const r = g.querySelector(".mapa-local-rect");
      if (r) {
        const cx = +r.getAttribute("x") + +r.getAttribute("width") / 2;
        const cy = +r.getAttribute("y") + +r.getAttribute("height") / 2;
        const rad = Math.max(+r.getAttribute("width"), +r.getAttribute("height")) / 2 + 6;
        [0, 1].forEach((i) => {
          const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          c.setAttribute("cx", String(cx));
          c.setAttribute("cy", String(cy));
          c.setAttribute("r", String(rad));
          c.setAttribute("class", "mg-pulse-ring");
          c.style.animationDelay = `${i * 0.7}s`;
          g.appendChild(c);
          setTimeout(() => c.remove(), 3200);
        });
      }
      setTimeout(() => g.classList.remove("is-highlight"), 2800);
    }, 80);
  }

  function setMapFilter(grupo) {
    mapFilterGrupo = grupo;
    document.querySelectorAll(".mapa-leyenda-item").forEach((b) => {
      b.classList.toggle("active", b.dataset.grupo === grupo || (!grupo && b.dataset.grupo === ""));
    });
    renderLocalesSvg();
  }

  function buildSvgMap() {
    const ed = PLANO_META.edificio || { x: 70, y: 118, w: 860, h: 545 };
    const svg = svgEl("svg", {
      viewBox: `0 0 ${SVG_W} ${SVG_H}`,
      class: "mapa-svg",
      width: SVG_W,
      height: SVG_H,
    });

    svg.appendChild(svgEl("text", {
      x: SVG_W / 2, y: 24, class: "mapa-titulo-svg", "text-anchor": "middle",
      text: "MERCADO MUNICIPAL — PLANO CONCEPTUAL",
    }));

    const bg = svgEl("g", { class: "mapa-bg-layer" });
    bg.appendChild(svgEl("rect", {
      x: ed.x - 8, y: ed.y - 8, width: ed.w + 16, height: ed.h + 16,
      class: "mapa-edificio-bg", rx: 6,
    }));
    bg.appendChild(svgEl("rect", {
      x: ed.x, y: ed.y, width: ed.w, height: ed.h,
      class: "mapa-edificio", rx: 4,
    }));
    drawPasillos(bg);
    drawAreas(bg);
    svg.appendChild(bg);

    localesLayer = svgEl("g", { class: "mapa-locales-layer" });
    svg.appendChild(localesLayer);

    const compass = svgEl("g", { class: "mapa-compass" });
    compass.appendChild(svgEl("text", { x: SVG_W - 55, y: SVG_H - 95, class: "mapa-compass-n", text: "N" }));
    compass.appendChild(svgEl("line", {
      x1: SVG_W - 55, y1: SVG_H - 88, x2: SVG_W - 55, y2: SVG_H - 68,
      class: "mapa-compass-line",
    }));
    svg.appendChild(compass);

    renderLocalesSvg();
    return svg;
  }

  function initMapaSection(main, deps) {
    global.MG_MAP_DEPS = deps;
    const { el, DATA, sectionHead } = deps;
    const MAPA = DATA.mapa || {};
    const META = DATA.meta || {};
    const leyenda = MAPA.leyenda || [];

    const svgWrap = el("div", { className: "mapa-svg-wrap", id: "mapaSvgWrap" });
    const viewport = el("div", { className: "mapa-viewport mapa-viewport-svg", id: "mapaViewport" });
    const svg = buildSvgMap();
    svgWrap.appendChild(svg);
    viewport.appendChild(svgWrap);

    const toolbar = el("div", { className: "mapa-toolbar reveal-item" }, [
      el("div", { className: "mapa-search" }, [
        el("i", { className: "fa-solid fa-magnifying-glass" }),
        el("input", {
          type: "search",
          placeholder: "Buscar local por número o nombre…",
          "aria-label": "Buscar en mapa",
          oninput: (e) => {
            mapSearch = e.target.value.trim();
            renderLocalesSvg();
            if (/^\d+$/.test(mapSearch)) scrollToLocal(mapSearch);
          },
        }),
      ]),
      el("div", { className: "mapa-zoom" }, [
        el("button", { type: "button", "aria-label": "Alejar", onclick: () => setMapZoom(-0.15) }, [el("i", { className: "fa-solid fa-minus" })]),
        el("span", { id: "mapZoomLabel", text: "100%" }),
        el("button", { type: "button", "aria-label": "Acercar", onclick: () => setMapZoom(0.15) }, [el("i", { className: "fa-solid fa-plus" })]),
        el("button", { type: "button", className: "mapa-reset", "aria-label": "Restablecer", onclick: resetMapView }, [el("i", { className: "fa-solid fa-compress" })]),
      ]),
    ]);

    const leyendaEl = el("div", { className: "mapa-leyenda reveal-item" }, [
      el("button", { type: "button", className: "mapa-leyenda-item active", "data-grupo": "", onclick: () => setMapFilter("") }, [
        el("span", { text: "Todos los giros" }),
      ]),
      ...leyenda.map((item) =>
        el("button", {
          type: "button", className: "mapa-leyenda-item", "data-grupo": item.grupo,
          style: `--giro:${item.color}`,
          onclick: () => setMapFilter(item.grupo),
        }, [
          el("span", { className: "mapa-leyenda-icon", html: GRUPO_SVG[item.grupo] || "" }),
          el("span", { text: item.grupo }),
        ])
      ),
    ]);

    const tipoLeyenda = el("div", { className: "mapa-tipo-leyenda reveal-item" }, [
      el("span", { className: "mapa-tipo-item" }, [el("i", { className: "mapa-tipo-box perimetral" }), "Local perimetral"]),
      el("span", { className: "mapa-tipo-item" }, [el("i", { className: "mapa-tipo-box interior" }), "Local interior"]),
      el("span", { className: "mapa-tipo-item" }, [el("i", { className: "mapa-tipo-box pasillo" }), "Circulación"]),
    ]);

    main.appendChild(
      el("section", { className: "page-section section-mapa section-alt", id: "mapa" }, [
        el("div", { className: "section-inner" }, [
          sectionHead(
            "Mapa del mercado",
            "Plano conceptual ampliado con pasillo principal, pasillos secundarios y 250 locales. Arrastra para moverte y usa la rueda o los botones para hacer zoom."
          ),
          toolbar,
          leyendaEl,
          tipoLeyenda,
          el("div", { className: "reveal-item" }, [viewport]),
          el("p", {
            className: "mapa-hint reveal-item",
            html: `<i class="fa-solid fa-hand-pointer"></i> Clic en un local para ver su ficha · <i class="fa-solid fa-arrows-up-down-left-right"></i> Arrastra el plano para explorar · ${META.totalLocales} locales`,
          }),
        ]),
      ])
    );

    initPanZoom(viewport, svgWrap);
    fitMapPreview();
    window.addEventListener("resize", () => {
      if (scale <= 1.05) fitMapPreview();
    }, { passive: true });
  }

  function buildFichaRapida(local, deps) {
    const { el, productsForLocal, closeModal } = deps;
    const prods = getDestacadosProducts(local.id) || productsForLocal(local.id);
    const promos = local.promociones || [];
    const m = local.mapa || {};
    const open = isOpenNow(local.horario);
    const waUrl = (global.MG_CATALOGO_UI && global.MG_CATALOGO_UI.whatsappUrl(local))
      || `https://wa.me/${local.whatsapp || "526673763125"}?text=${encodeURIComponent(`Hola ${local.nombre}, vi su local en el Mercado Garmendia.`)}`;

    const scrollBlocks = [
      el("div", { className: "ficha-hero" }, [
        el("div", {
          className: "ficha-foto",
          html: (global.generarLogoMexicanoSVG ? global.generarLogoMexicanoSVG(local.id, local.giro) : ""),
        }),
        el("div", { className: "ficha-hero-text" }, [
          el("span", { className: "ficha-badge", style: `background:${local.color}`, text: `Local ${local.id}` }),
          el("h3", { text: local.nombre }),
          el("p", { className: "ficha-cat", text: local.categoria }),
          m.zona ? el("p", { className: "ficha-zona", text: `Zona: ${m.zona.replace(/-/g, " ")}` }) : null,
        ]),
      ]),
      el("div", { className: "ficha-datos" }, [
        el("div", { className: "ficha-row" }, [el("i", { className: "fa-solid fa-store" }), el("div", null, [el("strong", { text: "Giro comercial" }), el("span", { text: local.giro })])]),
        el("div", { className: "ficha-row" }, [el("i", { className: "fa-solid fa-phone" }), el("div", null, [el("strong", { text: "Teléfono" }), el("span", { text: local.contacto || "No disponible" })])]),
        el("div", { className: "ficha-row" }, [el("i", { className: "fa-brands fa-whatsapp" }), el("div", null, [el("strong", { text: "WhatsApp" }), el("span", { text: local.whatsappDisplay || "667 376 3125 / 55 4192 1509" })])]),
        el("div", { className: "ficha-row" }, [el("i", { className: "fa-solid fa-clock" }), el("div", null, [el("strong", { text: "Horario" }), el("div", { className: "ficha-horario" }, [
          el("span", { text: local.horario || "Lun–Dom 6:00 am – 6:00 pm" }),
          el("span", { className: `ficha-open-badge${open ? "" : " cerrado"}`, text: open ? "Abierto" : "Cerrado" }),
        ])])]),
      ]),
      prods.length ? el("div", { className: "ficha-block" }, [
        el("h4", { text: "Productos destacados" }),
        el("ul", { className: "ficha-list" }, prods.map((p) =>
          el("li", null, [el("span", { text: p.producto }), el("strong", { text: `$${p.precio}` })])
        )),
      ]) : null,
      promos.length ? el("div", { className: "ficha-block ficha-promos" }, [
        el("h4", { text: "Promociones activas" }),
        ...promos.map((p) =>
          el("div", { className: "ficha-promo-item" }, [
            el("span", { className: "ficha-promo-tag", text: p.codigo }),
            el("strong", { text: p.titulo }),
            el("span", { text: p.vigencia }),
          ])
        ),
      ]) : el("div", { className: "ficha-block" }, [
        el("h4", { text: "Promociones activas" }),
        el("p", { className: "ficha-empty", text: "Sin promociones publicadas por el momento." }),
      ]),
    ].filter(Boolean);

    return el("div", { className: "modal-card modal-ficha", onclick: (e) => e.stopPropagation() }, [
      el("button", { className: "modal-close", type: "button", "aria-label": "Cerrar", onclick: closeModal }, [
        el("i", { className: "fa-solid fa-xmark" }),
      ]),
      el("div", { className: "ficha-scroll" }, scrollBlocks),
      el("div", { className: "ficha-actions-primary" }, [
        el("a", {
          className: "ficha-btn-wa-primary",
          href: waUrl,
          target: "_blank", rel: "noopener",
          onclick: (e) => e.stopPropagation(),
        }, [
          el("span", { className: "ficha-btn-ic", html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.6L3 21l1.9-5.6A8.5 8.5 0 1 1 21 11.5z"/><path d="M9 9.5c.5 2.5 3 5 5.5 5.5l1-1.2c.2-.2.5-.3.8-.2l2.2.9c.3.1.4.4.3.7-.3 1.2-1.5 1.9-2.7 1.6-4.3-1-7.6-4.3-8.6-8.6-.3-1.2.4-2.4 1.6-2.7.3-.1.6 0 .7.3l.9 2.2c.1.3 0 .6-.2.8z"/></svg>' }),
          "WhatsApp",
        ]),
        el("button", {
          type: "button",
          className: "ficha-btn-catalogo",
          onclick: (e) => {
            e.stopPropagation();
            if (global.MG_CATALOGO_UI) global.MG_CATALOGO_UI.openCatalogo(local);
          },
        }, [
          el("span", { className: "ficha-btn-ic", html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>' }),
          "CATÁLOGO",
        ]),
      ]),
    ]);
  }

  global.MG_MAPA = {
    initMapaSection,
    buildFichaRapida,
    renderLocalesSvg,
    scrollToLocal,
    setMapFilter,
    resetMapView,
  };
})(window);