/**
 * Cuponera Digital — Mercado Garmendia V8
 * Modal, filtros, canje y código de barras SVG.
 */
(function () {
  "use strict";

  const CONFIG = window.MG_CONFIG || {};
  const CUPONES = window.MG_CUPONES || [];
  const grid = document.getElementById("couponsGrid");
  const mayoristaGrid = document.getElementById("mayoristaGrid");
  const modal = document.getElementById("couponModal");
  const modalBody = document.getElementById("modalBody");
  const filterTabs = document.querySelectorAll(".filter-tab");

  let activeFilter = "todos";
  let currentCoupon = null;

  /** Genera barras simples tipo código de barras desde el código */
  function barcodeSVG(code) {
    const bars = [];
    let x = 0;
    const seed = code.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    for (let i = 0; i < 42; i++) {
      const w = ((seed + i * 7) % 3) + 1;
      const h = 40 + ((seed + i) % 12);
      bars.push(`<rect x="${x}" y="${48 - h}" width="${w}" height="${h}" fill="#0A2540"/>`);
      x += w + 1;
    }
    return `<svg class="barcode-svg" viewBox="0 0 ${x} 48" preserveAspectRatio="xMidYMid meet">${bars.join("")}</svg>`;
  }

  function renderCard(c, container) {
    const isMay = c.tipo === "mayorista";
    const card = document.createElement("article");
    card.className = `coupon-card${isMay ? " mayorista" : ""}`;
    card.dataset.category = c.categoria;
    card.dataset.id = c.id;
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", `Cupón ${c.titulo} en ${c.negocio}`);

    card.innerHTML = `
      <i class="fa-solid fa-scissors coupon-scissors" aria-hidden="true"></i>
      ${isMay ? '<span class="coupon-badge-may">Mayorista</span>' : ""}
      <span class="coupon-brand">${CONFIG.negocio || "Mercado Garmendia"}</span>
      <span class="coupon-local">${c.negocio}<br/>${c.localLabel}</span>
      <div class="coupon-discount">${c.titulo}</div>
      <p class="coupon-sub">${c.subtitulo}</p>
      <div class="coupon-footer">
        <span>${c.vigencia}</span>
        <span class="coupon-code-preview">${c.codigo}</span>
      </div>
    `;

    const open = () => openModal(c);
    card.addEventListener("click", open);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
    });

    container.appendChild(card);
    return card;
  }

  function renderAll() {
    if (!grid || !mayoristaGrid) return;
    grid.innerHTML = "";
    mayoristaGrid.innerHTML = "";

    CUPONES.filter((c) => c.tipo !== "mayorista").forEach((c) => renderCard(c, grid));
    CUPONES.filter((c) => c.tipo === "mayorista").forEach((c) => renderCard(c, mayoristaGrid));
    applyFilter(activeFilter);
  }

  function applyFilter(filter) {
    activeFilter = filter;
    filterTabs.forEach((t) => t.classList.toggle("active", t.dataset.filter === filter));

    const allCards = document.querySelectorAll(".coupon-card");
    const sectionMay = document.getElementById("sectionMayorista");

    allCards.forEach((card) => {
      const cat = card.dataset.category;
      let show = false;
      if (filter === "todos") show = true;
      else if (filter === "descuentos") show = cat === "descuento";
      else if (filter === "mayoristas") show = cat === "mayorista";
      card.classList.toggle("hidden-card", !show);
    });

    if (sectionMay) {
      const showMaySection = filter === "todos" || filter === "mayoristas";
      sectionMay.style.display = showMaySection ? "" : "none";
    }

    if (filter === "mayoristas") {
      document.getElementById("sectionRetail")?.scrollIntoView({ behavior: "smooth" });
    }
  }

  function openModal(c) {
    currentCoupon = c;
    const isMay = c.tipo === "mayorista";

    modalBody.innerHTML = `
      <button type="button" class="modal-close-x" id="modalCloseX" aria-label="Cerrar">
        <i class="fa-solid fa-xmark"></i>
      </button>
      <div class="modal-coupon${isMay ? " mayorista" : ""}">
        ${isMay ? '<span class="coupon-badge-may">Cupón mayorista</span>' : ""}
        <span class="coupon-brand">${CONFIG.negocio}</span>
        <p class="text-sm font-semibold text-[#6B1E3D] mt-1">${c.negocio}</p>
        <p class="text-xs text-slate-500">${c.localLabel}</p>
        <div class="modal-discount">${c.titulo}</div>
        <p class="text-sm text-slate-600 px-2">${c.subtitulo}</p>
        <p class="text-xs text-slate-400 mt-2">${c.vigencia}</p>
      </div>
      <div class="modal-instructions">
        <strong>Muestra este cupón al cajero para canjear</strong>
        Presenta la pantalla con el código visible. Válido solo en el local indicado.
      </div>
      <div class="modal-barcode-wrap">
        <div class="modal-code-big">${c.codigo}</div>
        ${barcodeSVG(c.codigo)}
      </div>
      ${isMay ? `
        <div class="modal-mayorista-note">
          <i class="fa-solid fa-building"></i>
          Aplicable solo a clientes mayoristas. Verifica disponibilidad con tu ejecutivo de cuenta.
          ${c.minimo ? `<br/><strong>${c.minimo}</strong>` : ""}
        </div>
      ` : ""}
      <div class="modal-actions">
        <button type="button" class="btn-redeem" id="btnRedeem">
          <i class="fa-solid fa-check-circle"></i> Canjear cupón
        </button>
        <button type="button" class="btn-close-modal" id="btnCloseModal">Cerrar</button>
      </div>
    `;

    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    document.getElementById("modalCloseX")?.addEventListener("click", closeModal);
    document.getElementById("btnCloseModal")?.addEventListener("click", closeModal);
    document.getElementById("btnRedeem")?.addEventListener("click", redeemCoupon);
  }

  function redeemCoupon() {
    const btn = document.getElementById("btnRedeem");
    if (!btn || btn.classList.contains("success")) return;
    btn.classList.add("success");
    btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> ¡Cupón aplicado!';
  }

  function closeModal() {
    modal?.classList.remove("open");
    modal?.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    currentCoupon = null;
  }

  filterTabs.forEach((tab) => {
    tab.addEventListener("click", () => applyFilter(tab.dataset.filter));
  });

  modal?.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  const burger = document.getElementById("hamburger");
  const mobile = document.getElementById("mobileNav");
  burger?.addEventListener("click", () => {
    burger.classList.toggle("open");
    mobile?.classList.toggle("open");
  });

  function highlightLocalFromUrl() {
    const localId = new URLSearchParams(window.location.search).get("local");
    if (!localId) return;
    const coupon = CUPONES.find((c) => String(c.localNum) === localId);
    if (!coupon) return;
    const match = document.querySelector(`.coupon-card[data-id="${coupon.id}"]`);
    if (match) {
      match.scrollIntoView({ behavior: "smooth", block: "center" });
      match.style.outline = "3px solid #C9A227";
      match.style.outlineOffset = "4px";
    }
  }

  renderAll();
  highlightLocalFromUrl();
})();