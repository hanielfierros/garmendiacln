/**
 * Cuponera Digital — Mercado Garmendia (dinámica desde Wix)
 */
(function () {
  "use strict";

  const CONFIG = window.MG_CONFIG || {};
  const WIX_OBTENER_CUPONES = "https://ebenezeraviation.com";
  const grid = document.getElementById("couponsGrid");
  const modal = document.getElementById("couponModal");
  const modalBody = document.getElementById("modalBody");

  let currentCoupon = null;

  /** Genera barras simples tipo código de barras desde el código */
  function barcodeSVG(code) {
    const bars = [];
    let x = 0;
    const str = code || "";
    const seed = str.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    for (let i = 0; i < 42; i++) {
      const w = ((seed + i * 7) % 3) + 1;
      const h = 40 + ((seed + i) % 12);
      bars.push(`<rect x="${x}" y="${48 - h}" width="${w}" height="${h}" fill="#0A2540"/>`);
      x += w + 1;
    }
    return `<svg class="barcode-svg" viewBox="0 0 ${x} 48" preserveAspectRatio="xMidYMid meet">${bars.join("")}</svg>`;
  }

  function renderCard(c) {
    const card = document.createElement("article");
    card.className = "coupon-card";
    card.dataset.id = c.codigo || c._id || "";
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", `Cupón ${c.titulo || ""} en ${c.negocio || ""}`);

    card.innerHTML = `
      <i class="fa-solid fa-scissors coupon-scissors" aria-hidden="true"></i>
      <span class="coupon-brand">${CONFIG.negocio || "Mercado Garmendia"}</span>
      <span class="coupon-local">${c.negocio || ""}${c.localLabel ? "<br/>" + c.localLabel : ""}</span>
      <div class="coupon-discount">${c.titulo || ""}</div>
      <p class="coupon-sub">${c.subtitulo || ""}</p>
      <div class="coupon-footer">
        <span>${c.vigencia || ""}</span>
        <span class="coupon-code-preview">${c.codigo || ""}</span>
      </div>
    `;

    const open = () => openModal(c);
    card.addEventListener("click", open);
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
    });

    grid.appendChild(card);
  }

  function renderAll(cupones) {
    if (!grid) return;
    grid.innerHTML = "";
    if (!cupones || !cupones.length) {
      grid.innerHTML = '<p class="col-span-full text-center text-slate-500 py-10">No hay cupones activos por el momento.</p>';
      return;
    }
    cupones.forEach(renderCard);
  }

  async function cargarCuponesDesdeWix() {
    try {
      const res = await fetch(WIX_OBTENER_CUPONES);
      const data = await res.json();
      renderAll(Array.isArray(data.cupones) ? data.cupones : []);
    } catch (e) {
      renderAll([]);
    }
  }

  function openModal(c) {
    currentCoupon = c;
    modalBody.innerHTML = `
      <button type="button" class="modal-close-x" id="modalCloseX" aria-label="Cerrar">
        <i class="fa-solid fa-xmark"></i>
      </button>
      <div class="modal-coupon">
        <span class="coupon-brand">${CONFIG.negocio || "Mercado Garmendia"}</span>
        <p class="text-sm font-semibold text-[#6B1E3D] mt-1">${c.negocio || ""}</p>
        <p class="text-xs text-slate-500">${c.localLabel || ""}</p>
        <div class="modal-discount">${c.titulo || ""}</div>
        <p class="text-sm text-slate-600 px-2">${c.subtitulo || ""}</p>
        <p class="text-xs text-slate-400 mt-2">${c.vigencia || ""}</p>
      </div>
      <div class="modal-instructions">
        <strong>Muestra este cupón al cajero para canjear</strong>
        Presenta la pantalla con el código visible. Válido solo en el local indicado.
      </div>
      <div class="modal-barcode-wrap">
        <div class="modal-code-big">${c.codigo || ""}</div>
        ${barcodeSVG(c.codigo)}
      </div>
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", cargarCuponesDesdeWix);
  } else {
    cargarCuponesDesdeWix();
  }
})();
