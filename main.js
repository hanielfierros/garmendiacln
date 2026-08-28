(function () {
  "use strict";

  const DATA = window.MG_DATA || {};
  const META = DATA.meta || {};
  const LOCALES = DATA.locales || [];
  const CATEGORIAS = DATA.categorias || [];
  const PRODUCTOS = DATA.productos || [];
  const EVENTOS = DATA.eventos || [];
  const NOTICIAS = DATA.noticias || [];
  const GALERIA = DATA.galeria || [];
  const MAPA = DATA.mapa || {};

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const NAV = [
    { id: "inicio", label: "Inicio", href: "#inicio", action: "scroll" },
    { id: "historia", label: "Conócenos", href: "#historia", action: "scroll" },
    { id: "locales", label: "Locales", href: "#locales", action: "directorio" },
    { id: "mapa", label: "Mapa", href: "#mapa", action: "scroll" },
    { id: "gastronomia", label: "Gastronomía", href: "#gastronomia", action: "scroll" },
    { id: "eventos", label: "Eventos", href: "#eventos", action: "scroll" },
    { id: "noticias", label: "Noticias", href: "#noticias", action: "scroll" },
    { id: "contacto", label: "Contacto", href: "#contacto", action: "scroll" },
    { id: "cuponera", label: "Cuponera", href: "cupones.html", action: "link", cta: true },
  ];

  let filterCat = "";
  let searchQuery = "";
  let visibleCount = 24;
  let directorioGrid = null;

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      Object.entries(attrs).forEach(([k, v]) => {
        if (k === "className") node.className = v;
        else if (k === "text") node.textContent = v;
        else if (k === "html") node.innerHTML = v;
        else if (k === "style") node.style.cssText = v;
        else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2).toLowerCase(), v);
        else if (v != null) node.setAttribute(k, v);
      });
    }
    (children || []).forEach((c) => {
      if (c == null) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  function fmtDate(iso) {
    if (!iso) return "";
    const d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
  }

  function smoothScroll(target) {
    const node = $(target);
    if (!node) return;
    const y = node.getBoundingClientRect().top + window.scrollY - 78;
    window.scrollTo({ top: y, behavior: "smooth" });
  }

  function navClick(item, e) {
    if (item.action !== "link") e.preventDefault();
    closeMobile();
    if (item.action === "link") {
      window.location.href = item.href;
      return;
    }
    if (item.action === "directorio") {
      openDirectorio(filterCat);
    } else {
      smoothScroll(item.href);
      setActiveNav(item.id);
    }
  }

  function staggerReveal(selector, baseDelay, step) {
    $$(selector).forEach((node, i) => {
      setTimeout(() => node.classList.add("is-visible"), baseDelay + i * step);
    });
  }

  function productsForLocal(id) {
    const cat = window.MG_CATALOGO?.porLocal?.[String(id)];
    if (cat) {
      const out = [];
      for (const area of cat.areas || []) {
        for (const p of area.productos || []) {
          if (out.length >= 5) return out;
          out.push({
            localId: id,
            producto: p.nombre,
            precio: p.precio,
            categoria: cat.categoria,
            unidad: p.unidad,
            productoId: p.id,
          });
        }
      }
      return out;
    }
    return PRODUCTOS.filter((p) => p.localId === id);
  }

  function filteredLocales(gastroOnly) {
    const gastro = new Set(META.gastroCategorias || []);
    return LOCALES.filter((l) => {
      if (gastroOnly && !gastro.has(l.categoria)) return false;
      if (filterCat && l.categoria !== filterCat) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const hay = [l.nombre, l.giro, l.categoria, String(l.id)].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function openFichaRapida(local) {
    const root = $("#modal-root");
    if (!root || !window.MG_MAPA) return;

    const overlay = el("div", { className: "modal-overlay modal-overlay-ficha open", onclick: (e) => { if (e.target === overlay) closeModal(); } }, [
      window.MG_MAPA.buildFichaRapida(local, {
        el,
        productsForLocal,
        closeModal,
        DATA,
      }),
    ]);

    root.innerHTML = "";
    root.appendChild(overlay);
    document.body.style.overflow = "hidden";
  }

  function openLocalModal(local) {
    openFichaRapida(local);
  }

  function closeModal() {
    const root = $("#modal-root");
    if (root) root.innerHTML = "";
    if (!$("#directorio-root")?.firstChild) document.body.style.overflow = "";
  }

  function renderHeader(app) {
    const navItems = NAV.map((item, i) =>
      el("li", null, [
        el("a", {
          href: item.href,
          className: `${i === 0 ? "active" : ""}${item.cta ? " nav-cta" : ""}`.trim(),
          "data-nav": item.id,
          onclick: (e) => navClick(item, e),
        }, [
          item.cta ? el("i", { className: "fa-solid fa-ticket", "aria-hidden": "true" }) : null,
          item.label,
        ]),
      ])
    );

    const mobileLinks = NAV.map((item) =>
      el("a", {
        href: item.href,
        className: item.cta ? "mobile-nav-cta" : "",
        onclick: (e) => navClick(item, e),
      }, [
        item.cta ? el("i", { className: "fa-solid fa-ticket", "aria-hidden": "true" }) : null,
        item.label,
      ])
    );

    app.append(
      el("div", { className: "top-bar", "aria-hidden": "true" }),
      el("header", { className: "site-header", id: "siteHeader" }, [
        el("div", { className: "header-inner" }, [
          el("div", { className: "brand-block" }, [
            el("a", { className: "brand-garmendia", href: "#inicio", onclick: (e) => { e.preventDefault(); smoothScroll("#inicio"); } }, ["Mercado Garmendia"]),
            el("div", { className: "brand-culiacan" }, [
              el("img", { src: "logo-culiacan.png", alt: "Ayuntamiento de Culiacán" }),
              el("div", { className: "brand-culiacan-text" }, [
                el("span", { text: "Ayuntamiento" }),
                el("span", { text: "de Culiacán" }),
              ]),
            ]),
          ]),
          el("div", { className: "nav-wrap" }, [
            el("ul", { className: "nav-menu", id: "navMenu" }, navItems),
            el("button", { className: "hamburger", id: "hamburger", type: "button", "aria-label": "Menú", onclick: toggleMobile }, [
              el("span"), el("span"), el("span"),
            ]),
          ]),
        ]),
        el("nav", { className: "mobile-nav", id: "mobileNav" }, mobileLinks),
      ])
    );
  }

  function renderHero(app) {
    const heroSrc = META.heroImage || "hero-mercado-viejo.jpg";

    const heroImg = el("img", {
      id: "heroPhoto",
      alt: "Vista histórica del Mercado de Culiacán — Culiacán Viejito",
      src: heroSrc,
    });

    const photoWrap = el("div", { className: "hero-photo-wrap is-loading", id: "heroPhotoWrap" }, [heroImg]);

    app.appendChild(
      el("section", { className: "hero-section", id: "inicio" }, [
        el("div", { className: "hero-copy" }, [
          el("img", { className: "hero-building-icon reveal-item", src: "garmen-2.jpg", alt: "Mercado Garmendia", width: "88" }),
          el("p", { className: "hero-eyebrow reveal-item", text: `Encuéntranos en el corazón ~ Desde ${META.fundacion || 1916}.` }),
          el("h1", { className: "hero-title" }, [
            el("span", { className: "line reveal-item", text: "Bienvenidos al" }),
            el("span", { className: "line reveal-item", html: '<span class="accent">corazón</span> de Culiacán' }),
          ]),
          el("p", { className: "hero-subtitle reveal-item", text: "El Mercado Municipal Garmendia es historia, cultura y el punto de encuentro de generaciones." }),
          el("button", {
            className: "btn-gold reveal-item",
            type: "button",
            onclick: () => smoothScroll("#historia"),
          }, ["Conócenos"]),
        ]),
        el("div", { className: "hero-visual", id: "heroVisual" }, [
          photoWrap,
          el("div", { className: "hero-fade-left" }),
        ]),
      ])
    );

    heroImg.addEventListener("load", () => photoWrap.classList.remove("is-loading"));
    heroImg.addEventListener("error", () => photoWrap.classList.remove("is-loading"));
    if (heroImg.complete && heroImg.naturalWidth > 0) photoWrap.classList.remove("is-loading");
  }

  function renderCuponeraBanner(app) {
    app.appendChild(
      el("section", { className: "cuponera-promo-banner", id: "cuponera-promo", "aria-label": "Cuponera digital" }, [
        el("div", { className: "cuponera-promo-inner" }, [
          el("div", { className: "cuponera-promo-visual reveal-item" }, [
            el("div", { className: "cuponera-promo-icon", html: '<i class="fa-solid fa-ticket"></i>' }),
          ]),
          el("div", { className: "cuponera-promo-copy reveal-item" }, [
            el("p", { className: "cuponera-promo-eyebrow", text: "Ofertas oficiales · 2026" }),
            el("h2", { html: 'Descubre la <em>Cuponera Digital</em>' }),
            el("p", {
              text: "Más de 40 cupones verificados en locales del mercado. Muestra el cupón desde tu celular y canjéalo al instante — sin registro.",
            }),
            el("a", { className: "btn-cuponera-promo", href: "cupones.html" }, [
              el("i", { className: "fa-solid fa-ticket" }),
              "Ver cupones exclusivos",
            ]),
          ]),
        ]),
      ])
    );
  }

  function renderFeatures(app) {
    const items = [
      { icon: "fa-regular fa-building", text: `Más de ${new Date().getFullYear() - (META.fundacion || 1916)} años de historia`, href: "#historia" },
      { icon: "fa-solid fa-store", text: `${META.totalLocales || 150} locales activos`, href: "#locales" },
      { icon: "fa-solid fa-bowl-food", text: "Gastronomía auténtica sinaloense", href: "#gastronomia" },
      { icon: "fa-solid fa-people-group", text: "Comunidad que nos hace únicos", href: "#eventos" },
    ];

    app.appendChild(
      el("section", { className: "features-strip", id: "estadisticas" }, [
        el("div", { className: "features-grid" }, items.map((f) =>
          el("div", {
            className: "feature-item reveal-item",
            role: "button",
            tabindex: "0",
            onclick: () => {
              if (f.href === "#locales") openDirectorio("");
              else smoothScroll(f.href);
            },
            onkeydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); f.href === "#locales" ? openDirectorio("") : smoothScroll(f.href); } },
          }, [
            el("i", { className: f.icon }),
            el("span", { text: f.text }),
          ])
        )),
      ])
    );
  }

  function sectionHead(title, lead) {
    return el("div", { className: "section-head reveal-item" }, [
      el("h2", { text: title }),
      lead ? el("p", { className: "section-lead", text: lead }) : null,
    ]);
  }

  function renderHistoria(main) {
    const img = META.historiaImage || "mercado-historia.jpg";
    main.appendChild(
      el("section", { className: "page-section section-historia", id: "historia" }, [
        el("div", { className: "section-inner historia-grid" }, [
          el("div", { className: "historia-copy reveal-item" }, [
            sectionHead("Nuestra historia", null),
            el("p", { text: `Fundado en ${META.fundacion || 1916}, el Mercado Garmendia nació como el principal centro de abasto de Culiacán. Su arquitectura lo convirtió en ícono urbano y patrimonio cultural de Sinaloa.` }),
            el("p", { text: `Hoy alberga ${META.totalLocales} locales que mantienen viva la tradición comercial y gastronómica, conectando generaciones de familias sinaloenses con el sabor de su hogar.` }),
            el("div", { className: "stats-row" }, [
              el("div", { className: "stat-box" }, [el("strong", { text: String(META.totalLocales) }), el("span", { text: "Locales" })]),
              el("div", { className: "stat-box" }, [el("strong", { text: String(CATEGORIAS.length) }), el("span", { text: "Categorías" })]),
              el("div", { className: "stat-box" }, [el("strong", { text: String(META.totalProductos) }), el("span", { text: "Productos" })]),
            ]),
          ]),
          el("div", { className: "historia-visual reveal-item" }, [
            el("img", { src: img, alt: "Fachada del Mercado Garmendia — vista actual" }),
            el("div", { className: "historia-badge" }, [
              el("strong", { text: String(META.fundacion || 1916) }),
              el("span", { text: "Año de fundación" }),
            ]),
          ]),
        ]),
      ])
    );
  }

  function renderLocalesInvite(main) {
    const topCats = [...CATEGORIAS].sort((a, b) => b.total - a.total).slice(0, 6);

    main.appendChild(
      el("section", { className: "page-section section-locales-invite section-alt", id: "locales" }, [
        el("div", { className: "section-inner locales-invite-inner reveal-item" }, [
          el("div", { className: "locales-invite-copy" }, [
            el("span", { className: "invite-badge", text: "Directorio completo" }),
            el("h2", { text: "Descubre nuestros locales" }),
            el("p", { text: `Más de ${META.totalLocales} negocios te esperan: carnicerías, fruterías, panaderías, joyerías y mucho más. Entra al directorio para ver nombre, giro, contacto y productos de cada local.` }),
            el("div", { className: "invite-stats" }, [
              el("div", null, [el("strong", { text: String(META.totalLocales) }), el("span", { text: "Locales" })]),
              el("div", null, [el("strong", { text: String(CATEGORIAS.length) }), el("span", { text: "Giros" })]),
              el("div", null, [el("strong", { text: String(META.totalProductos) }), el("span", { text: "Productos" })]),
            ]),
            el("div", { className: "invite-btns" }, [
              el("button", { className: "btn-gold btn-lg", type: "button", onclick: () => openDirectorio("") }, [
                el("i", { className: "fa-solid fa-store" }),
                "Explorar directorio",
              ]),
              el("button", { className: "btn-outline btn-lg", type: "button", onclick: () => smoothScroll("#mapa") }, [
                el("i", { className: "fa-solid fa-map" }),
                "Ver mapa interactivo",
              ]),
            ]),
          ]),
          el("div", { className: "locales-invite-cats" }, [
            el("h3", { text: "Categorías destacadas" }),
            el("ul", null, topCats.map((c) =>
              el("li", null, [
                el("button", {
                  type: "button",
                  onclick: () => openDirectorio(c.nombre),
                }, [
                  el("i", { className: "fa-solid fa-chevron-right" }),
                  el("span", { text: c.nombre }),
                  el("em", { text: String(c.total) }),
                ]),
              ])
            )),
          ]),
        ]),
      ])
    );
  }

  function renderLocalCard(local) {
    return el("article", {
      className: "local-card",
      onclick: () => openLocalModal(local),
      onkeydown: (e) => { if (e.key === "Enter") openLocalModal(local); },
      tabindex: "0",
      role: "button",
    }, [
      el("div", { className: "local-card-top" }, [
        el("img", {
          className: "local-logo",
          src: local.logo,
          alt: "",
          loading: "lazy",
          onerror: function () {
            const iconSrc = local.iconPng || "icon-local.png";
            const img = el("img", { className: "local-cat-icon", src: iconSrc, alt: local.categoria });
            this.replaceWith(img);
          },
        }),
        el("img", {
          className: "local-cat-icon-badge",
          src: local.iconPng || "icon-local.png",
          alt: "",
          loading: "lazy",
        }),
        el("span", { className: "local-num", text: `#${local.id}` }),
      ]),
      el("span", { className: "local-cat", text: local.categoria }),
      el("h3", { text: local.nombre }),
      el("p", { className: "local-giro", text: local.giro }),
    ]);
  }

  function renderDirectorioGrid(container) {
    const list = filteredLocales(false);
    const slice = list.slice(0, visibleCount);

    container.innerHTML = "";
    if (!slice.length) {
      container.appendChild(el("div", { className: "empty-state" }, [
        el("i", { className: "fa-solid fa-magnifying-glass" }),
        el("p", { text: "No se encontraron locales con esos criterios." }),
      ]));
      return;
    }

    slice.forEach((l) => container.appendChild(renderLocalCard(l)));

    const countEl = $("#dirResultsCount");
    if (countEl) countEl.textContent = `Mostrando ${slice.length} de ${list.length} locales`;

    const moreBtn = $("#dirLoadMore");
    if (moreBtn) {
      moreBtn.style.display = slice.length < list.length ? "inline-flex" : "none";
      moreBtn.onclick = () => {
        visibleCount += 24;
        renderDirectorioGrid(container);
      };
    }
  }

  function setDirectorioFilter(cat) {
    filterCat = cat;
    visibleCount = 24;
    $$("#directorio-root .chip").forEach((b) => b.classList.toggle("active", b.dataset.cat === cat));
    if (directorioGrid) renderDirectorioGrid(directorioGrid);
  }

  function openDirectorio(initialCat) {
    const root = $("#directorio-root");
    if (!root) return;

    filterCat = initialCat || "";
    searchQuery = "";
    visibleCount = 24;

    const grid = el("div", { className: "locales-grid", id: "directorioGrid" });
    directorioGrid = grid;

    const chips = el("div", { className: "filter-chips" }, [
      el("button", { className: `chip${filterCat === "" ? " active" : ""}`, type: "button", "data-cat": "", onclick: () => setDirectorioFilter("") }, ["Todos"]),
      ...CATEGORIAS.map((c) =>
        el("button", {
          className: `chip${filterCat === c.nombre ? " active" : ""}`,
          type: "button",
          "data-cat": c.nombre,
          onclick: () => setDirectorioFilter(c.nombre),
        }, [`${c.nombre} (${c.total})`])
      ),
    ]);

    const overlay = el("div", { className: "directorio-overlay open" }, [
      el("div", { className: "directorio-topbar" }, [
        el("div", { className: "directorio-topbar-inner" }, [
          el("h1", { text: "Directorio de Locales" }),
          el("button", { className: "directorio-close", type: "button", "aria-label": "Cerrar", onclick: closeDirectorio }, [
            el("i", { className: "fa-solid fa-xmark" }),
          ]),
        ]),
      ]),
      el("div", { className: "directorio-body" }, [
        el("div", { className: "dir-hero-wrap" }, [
          el("span", { className: "dir-hero-badge", html: `<i class="fa-solid fa-store"></i> ${META.totalLocales} locales` }),
          el("h2", { text: "Encuentra tu local favorito" }),
          el("p", { text: "Busca por nombre, giro, categoría o número de local. Toca un negocio para ver detalles y productos." }),
        ]),
        el("div", { className: "search-bar" }, [
          el("i", { className: "fa-solid fa-magnifying-glass" }),
          el("input", {
            type: "search",
            id: "dirSearch",
            placeholder: "Buscar local, giro o categoría…",
            "aria-label": "Buscar locales",
            oninput: (e) => {
              searchQuery = e.target.value.trim();
              visibleCount = 24;
              renderDirectorioGrid(grid);
            },
          }),
        ]),
        chips,
        el("p", { className: "results-count", id: "dirResultsCount" }),
        grid,
        el("div", { className: "load-more-wrap" }, [
          el("button", { className: "btn-outline", type: "button", id: "dirLoadMore" }, ["Ver más locales"]),
        ]),
      ]),
    ]);

    root.innerHTML = "";
    root.appendChild(overlay);
    document.body.style.overflow = "hidden";
    renderDirectorioGrid(grid);
    $("#dirSearch")?.focus();
  }

  function closeDirectorio() {
    const root = $("#directorio-root");
    if (root) root.innerHTML = "";
    directorioGrid = null;
    if (!$("#modal-root")?.firstChild) document.body.style.overflow = "";
  }

  function renderGastronomia(main) {
    const gastro = LOCALES.filter((l) => (META.gastroCategorias || []).includes(l.categoria));
    const galleryImg = GALERIA.find((g) => g.cap.includes("Gastronomía"))?.src || GALERIA[2]?.src;

    main.appendChild(
      el("section", { className: "page-section section-gastro", id: "gastronomia" }, [
        el("div", { className: "section-inner" }, [
          sectionHead("Gastronomía sinaloense", "Antojitos, mariscos y sazón auténtica en cada pasillo del mercado."),
          el("div", { className: "gastro-banner reveal-item" }, [
            el("img", { src: galleryImg, alt: "Gastronomía en el Mercado Garmendia", loading: "lazy" }),
            el("div", { className: "gastro-banner-text" }, [
              el("h3", { text: "Sabores que cuentan historias" }),
              el("p", { text: `${gastro.length} locales dedicados a la cocina tradicional y los antojitos culiacanenses.` }),
              el("button", { className: "btn-gold", type: "button", onclick: () => openDirectorio("") }, ["Ver directorio de locales"]),
            ]),
          ]),
          el("div", { className: "gastro-grid" }, gastro.slice(0, 8).map((l) =>
            el("article", {
              className: "gastro-card reveal-item",
              onclick: () => openLocalModal(l),
              role: "button",
              tabindex: "0",
            }, [
              el("div", { className: "gastro-icon" }, [
                el("img", { src: l.iconPng || "icon-snacks.png", alt: l.categoria, loading: "lazy" }),
              ]),
              el("h3", { text: l.nombre }),
              el("span", { text: l.categoria }),
              el("p", { text: l.giro }),
            ])
          )),
        ]),
      ])
    );
  }

  function renderEventos(main) {
    main.appendChild(
      el("section", { className: "page-section section-eventos section-alt", id: "eventos" }, [
        el("div", { className: "section-inner" }, [
          sectionHead("Próximos eventos", "Actividades culturales, ferias gastronómicas y celebraciones en el mercado."),
          el("div", { className: "eventos-grid" }, EVENTOS.map((ev) =>
            el("article", { className: "evento-card reveal-item" }, [
              el("div", { className: "evento-img" }, [
                el("img", { src: ev.img, alt: ev.titulo, loading: "lazy" }),
                el("div", { className: "evento-date" }, [
                  el("strong", { text: ev.dia }),
                  el("span", { text: ev.mes }),
                ]),
              ]),
              el("div", { className: "evento-body" }, [
                el("span", { className: "evento-tag", text: ev.tag }),
                el("h3", { text: ev.titulo }),
                el("p", { text: ev.desc }),
                el("div", { className: "evento-meta" }, [
                  el("span", { html: `<i class="fa-regular fa-calendar"></i> ${fmtDate(ev.fecha)}` }),
                  el("span", { html: '<i class="fa-solid fa-location-dot"></i> Mercado Garmendia' }),
                ]),
              ]),
            ])
          )),
        ]),
      ])
    );
  }

  function renderNoticias(main) {
    const [featured, ...rest] = NOTICIAS;
    main.appendChild(
      el("section", { className: "page-section section-noticias", id: "noticias" }, [
        el("div", { className: "section-inner" }, [
          sectionHead("Noticias y avisos", "Mantente al día con las novedades del Mercado Garmendia."),
          el("div", { className: "noticias-grid" }, [
            featured ? el("article", { className: "news-card featured reveal-item" }, [
              el("div", { className: "news-img" }, [el("img", { src: featured.img, alt: featured.titulo, loading: "lazy" })]),
              el("div", { className: "news-body" }, [
                el("div", { className: "news-meta" }, [
                  el("span", { className: "news-tag", text: featured.tag }),
                  el("span", { className: "news-date", text: fmtDate(featured.fecha) }),
                ]),
                el("h3", { text: featured.titulo }),
                el("p", { text: featured.resumen }),
              ]),
            ]) : null,
            ...rest.map((n) =>
              el("article", { className: "news-card reveal-item" }, [
                el("div", { className: "news-img" }, [el("img", { src: n.img, alt: n.titulo, loading: "lazy" })]),
                el("div", { className: "news-body" }, [
                  el("div", { className: "news-meta" }, [
                    el("span", { className: "news-tag", text: n.tag }),
                    el("span", { className: "news-date", text: fmtDate(n.fecha) }),
                  ]),
                  el("h3", { text: n.titulo }),
                  el("p", { text: n.resumen }),
                ]),
              ])
            ),
          ]),
        ]),
      ])
    );
  }

  function renderGaleria(main) {
    const track = el("div", { className: "galeria-coverflow-track", id: "galeriaTrack" });
    GALERIA.forEach((g, i) => {
      track.appendChild(
        el("figure", { className: "galeria-coverflow-slide", "data-index": String(i) }, [
          el("div", { className: "galeria-coverflow-frame" }, [
            el("img", { src: g.src, alt: g.cap, loading: i < 3 ? "eager" : "lazy" }),
            el("figcaption", { text: g.cap }),
          ]),
        ])
      );
    });

    const dots = el("div", { className: "galeria-dots", id: "galeriaDots" });
    GALERIA.forEach((_, i) => {
      dots.appendChild(el("button", {
        type: "button",
        className: `galeria-dot${i === 0 ? " active" : ""}`,
        "aria-label": `Imagen ${i + 1}`,
        "data-index": String(i),
      }));
    });

    main.appendChild(
      el("section", { className: "page-section section-galeria section-alt", id: "galeria" }, [
        el("div", { className: "section-inner" }, [
          sectionHead("Galería", "Imágenes del corazón de Culiacán."),
          el("div", { className: "galeria-coverflow reveal-item", id: "galeriaCarousel" }, [
            el("button", { className: "galeria-nav galeria-prev", type: "button", id: "galeriaPrev", "aria-label": "Anterior" }, [
              el("i", { className: "fa-solid fa-chevron-left" }),
            ]),
            el("div", { className: "galeria-coverflow-viewport" }, [track]),
            el("button", { className: "galeria-nav galeria-next", type: "button", id: "galeriaNext", "aria-label": "Siguiente" }, [
              el("i", { className: "fa-solid fa-chevron-right" }),
            ]),
            dots,
          ]),
        ]),
      ])
    );
  }

  function initGaleriaCarousel() {
    const slides = $$(".galeria-coverflow-slide");
    const dots = $$(".galeria-dot");
    const track = $("#galeriaTrack");
    if (!slides.length || !track) return;
    let current = 0;
    let autoTimer = null;
    const total = slides.length;

    function relPos(i) {
      let d = i - current;
      if (d > total / 2) d -= total;
      if (d < -total / 2) d += total;
      return d;
    }

    function applyStates() {
      slides.forEach((s, i) => {
        const d = relPos(i);
        s.classList.remove("is-active", "is-prev", "is-next", "is-far");
        s.style.setProperty("--offset", String(d));
        if (d === 0) s.classList.add("is-active");
        else if (d === -1) s.classList.add("is-prev");
        else if (d === 1) s.classList.add("is-next");
        else s.classList.add("is-far");
      });
      dots.forEach((dot, i) => dot.classList.toggle("active", i === current));
    }

    function show(n) {
      current = (n + total) % total;
      applyStates();
    }

    function next() { show(current + 1); resetAuto(); }
    function prev() { show(current - 1); resetAuto(); }

    function resetAuto() {
      clearInterval(autoTimer);
      autoTimer = setInterval(() => show(current + 1), 4000);
    }

    $("#galeriaPrev")?.addEventListener("click", prev);
    $("#galeriaNext")?.addEventListener("click", next);
    dots.forEach((d) => d.addEventListener("click", () => show(Number(d.dataset.index))));

    const carousel = $("#galeriaCarousel");
    let tx = 0;
    carousel?.addEventListener("touchstart", (e) => { tx = e.touches[0].clientX; }, { passive: true });
    carousel?.addEventListener("touchend", (e) => {
      const dx = e.changedTouches[0].clientX - tx;
      if (Math.abs(dx) > 40) dx < 0 ? next() : prev();
    });

    slides.forEach((s) => {
      s.addEventListener("click", () => {
        const i = Number(s.dataset.index);
        if (i !== current) show(i);
      });
    });

    applyStates();
    resetAuto();
  }

  function renderCampaignBanner(app) {
    const slot = el("div", { id: "campaign-banner-root" });
    app.appendChild(slot);
    if (window.MG_HERO_BANNER) window.MG_HERO_BANNER.mount(slot);
  }

  function renderContacto(main) {
    main.appendChild(
      el("section", { className: "page-section section-contacto", id: "contacto" }, [
        el("div", { className: "section-inner contacto-grid" }, [
          el("div", { className: "contacto-info reveal-item" }, [
            sectionHead("Contacto y ubicación", null),
            el("ul", { className: "contacto-list" }, [
              el("li", { html: `<i class="fa-solid fa-location-dot"></i><div><strong>Dirección</strong><span>${META.direccion}</span></div>` }),
              el("li", { html: `<i class="fa-solid fa-clock"></i><div><strong>Horario</strong><span>${META.horario}</span></div>` }),
              el("li", { html: `<i class="fa-solid fa-phone"></i><div><strong>Teléfono</strong><span>${META.telefono}</span></div>` }),
              el("li", { html: `<i class="fa-solid fa-envelope"></i><div><strong>Correo</strong><span>${META.email}</span></div>` }),
            ]),
            el("a", {
              className: "btn-gold",
              href: "https://www.google.com/maps/search/?api=1&query=Mercado+Garmendia+Culiacán",
              target: "_blank",
              rel: "noopener",
            }, ["Abrir en Google Maps"]),
            el("button", {
              className: "btn-pickup",
              type: "button",
              onclick: () => window.MG_PICKUP_ENTRY && window.MG_PICKUP_ENTRY.openFromHome(),
            }, [el("i", { className: "fa-solid fa-bag-shopping" }), "PICK UP"]),
          ]),
          el("div", { className: "contacto-map reveal-item" }, [
            el("iframe", {
              title: "Ubicación Mercado Garmendia",
              src: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3540.0!2d-107.394!3d24.809!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjTCsDQ4JzMyLjQiTiAxMDfCsDIzJzM4LjQiVw!5e0!3m2!1ses!2smx!4v1",
              loading: "lazy",
              referrerpolicy: "no-referrer-when-downgrade",
              allowfullscreen: "",
            }),
          ]),
        ]),
      ])
    );
  }

  function renderFooter() {
    const footer = $("#site-footer");
    if (!footer) return;
    const topCats = [...CATEGORIAS].sort((a, b) => b.total - a.total).slice(0, 6);

    footer.innerHTML = "";
    footer.appendChild(
      el("div", { className: "site-footer", id: "footer" }, [
        el("div", { className: "footer-inner" }, [
          el("div", { className: "footer-brand" }, [
            el("div", { className: "footer-logo" }, [
              el("img", { src: "logo-mercado.svg", alt: "" }),
              el("div", null, [
                el("span", { className: "footer-logo-text", text: META.mercado }),
                el("span", { className: "footer-logo-sub", text: META.ciudad }),
              ]),
            ]),
            el("p", { className: "footer-desc", text: "El mercado municipal más emblemático de Culiacán. Historia, cultura y el punto de encuentro de generaciones desde 1916." }),
            el("div", { className: "footer-socials" }, [
              el("a", { className: "footer-social", href: "#", "aria-label": "Facebook" }, [el("i", { className: "fa-brands fa-facebook-f" })]),
              el("a", { className: "footer-social", href: "#", "aria-label": "Instagram" }, [el("i", { className: "fa-brands fa-instagram" })]),
              el("a", { className: "footer-social", href: "#", "aria-label": "YouTube" }, [el("i", { className: "fa-brands fa-youtube" })]),
            ]),
          ]),
          el("div", { className: "footer-col" }, [
            el("h4", { text: "Explorar" }),
            el("ul", null, NAV.map((n) =>
              el("li", null, [
                el("a", {
                  href: n.href,
                  onclick: (e) => navClick(n, e),
                }, [
                  el("i", { className: "fa-solid fa-chevron-right" }),
                  n.label,
                ]),
              ])
            )),
          ]),
          el("div", { className: "footer-col" }, [
            el("h4", { text: "Categorías" }),
            el("ul", null, topCats.map((c) =>
              el("li", null, [
                el("a", {
                  href: "#",
                  onclick: (e) => { e.preventDefault(); openDirectorio(c.nombre); },
                }, [
                  el("i", { className: "fa-solid fa-chevron-right" }),
                  `${c.nombre} (${c.total})`,
                ]),
              ])
            )),
          ]),
          el("div", { className: "footer-newsletter" }, [
            el("h4", { text: "Boletín" }),
            el("p", { text: "Recibe noticias, eventos y promociones del mercado." }),
            el("form", { className: "newsletter-form", onsubmit: (e) => { e.preventDefault(); alert("¡Gracias! Te mantendremos informado."); } }, [
              el("input", { type: "email", placeholder: "Tu correo electrónico", required: true }),
              el("button", { type: "submit" }, ["Suscribir"]),
            ]),
            el("div", { className: "footer-contact-mini" }, [
              el("p", { html: `<i class="fa-solid fa-phone"></i> ${META.telefono}` }),
              el("p", { html: `<i class="fa-solid fa-envelope"></i> ${META.email}` }),
            ]),
          ]),
        ]),
        el("div", { className: "footer-bottom" }, [
          el("p", { text: `© ${new Date().getFullYear()} ${META.mercado} · ${META.ciudad}. Todos los derechos reservados.` }),
          el("div", { className: "footer-bottom-links" }, [
            el("a", { href: "#", text: "Aviso de privacidad" }),
            el("a", { href: "#", text: "Términos de uso" }),
            el("a", { href: "#contacto", onclick: (e) => { e.preventDefault(); smoothScroll("#contacto"); }, text: "Contacto" }),
          ]),
        ]),
      ])
    );
  }

  function setActiveNav(id) {
    $$(".nav-menu a").forEach((a) => a.classList.toggle("active", a.dataset.nav === id));
  }

  function highlightNav() {
    if ($("#directorio-root")?.firstChild) return;
    let current = NAV[0].id;
    NAV.forEach(({ id }) => {
      const sec = $(`#${id}`);
      if (sec && window.scrollY >= sec.offsetTop - 100) current = id;
    });
    setActiveNav(current);
  }

  function initScroll() {
    const header = $("#siteHeader");
    const bar = $("#progress-bar");
    const heroImg = $("#heroPhoto");
    const btt = $("#btt");

    window.addEventListener("scroll", () => {
      const y = window.scrollY;
      header?.classList.toggle("scrolled", y > 30);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (bar) bar.style.width = max > 0 ? `${(y / max) * 100}%` : "0%";
      btt?.classList.toggle("show", y > 400);
      highlightNav();

      if (heroImg && !heroImg.dataset.parallaxOff) {
        const shift = Math.min(y * 0.12, 40);
        heroImg.style.transform = `translateY(${shift}px) scale(1.03)`;
      }
    }, { passive: true });

    btt?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  function initParallax() {
    const visual = $("#heroVisual");
    const img = $("#heroPhoto");
    if (!visual || !img) return;

    visual.addEventListener("mousemove", (e) => {
      const r = visual.getBoundingClientRect();
      const dx = (e.clientX - r.left - r.width / 2) / r.width;
      const dy = (e.clientY - r.top - r.height / 2) / r.height;
      img.dataset.parallaxOff = "1";
      img.style.transform = `translate(${dx * 10}px, ${dy * 6}px) scale(1.04)`;
    });

    visual.addEventListener("mouseleave", () => {
      delete img.dataset.parallaxOff;
      img.style.transform = "";
    });
  }

  function toggleMobile() {
    $("#hamburger")?.classList.toggle("open");
    $("#mobileNav")?.classList.toggle("open");
  }

  function closeMobile() {
    $("#hamburger")?.classList.remove("open");
    $("#mobileNav")?.classList.remove("open");
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if ($("#modal-root")?.firstChild) closeModal();
      else if ($("#directorio-root")?.firstChild) closeDirectorio();
    }
  });

  function boot() {
    try {
      document.body.classList.add("js-ready");

      const app = $("#app");
      const main = $("#main-content");
      if (!app || !main) throw new Error("Estructura HTML incompleta");

      renderHeader(app);
      renderHero(app);
      renderFeatures(app);
      renderCuponeraBanner(app);
      renderCampaignBanner(app);

      renderHistoria(main);
      renderLocalesInvite(main);
      if (window.MG_MAPA) {
        window.MG_MAPA.initMapaSection(main, {
          el,
          DATA,
          sectionHead,
          productsForLocal,
          closeModal,
          openFichaRapida,
        });
      }
      renderGastronomia(main);
      renderEventos(main);
      renderNoticias(main);
      renderGaleria(main);
      renderContacto(main);
      renderFooter();

      staggerReveal(".hero-copy .reveal-item", 100, 120);
      staggerReveal(".feature-item", 500, 90);
      staggerReveal(".cuponera-promo-banner .reveal-item", 700, 120);
      staggerReveal(".page-section .reveal-item", 200, 60);

      initScroll();
      initParallax();
      initGaleriaCarousel();
      highlightNav();
    } catch (err) {
      console.error("Mercado Garmendia V14:", err);
      document.body.classList.remove("js-ready");
      $$(".reveal-item").forEach((n) => n.classList.add("is-visible"));
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();