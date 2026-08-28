/**
 * Catálogo y pedido por WhatsApp y PWA — Mercado Garmendia V15.1 Estable
 */
(function (global) {
  "use strict";

  const CATALOGO = () => global.MG_CATALOGO || {};
  let cartState = {};
  let activeLocal = null;

  // CONFIGURACIÓN DE PRODUCCIÓN DEFINITIVA EN TU DOMINIO PREMIUM DE WIX
  const WIX_API_URL = "https://ebenezeraviation.com";

  function fmtMoney(n) {
    return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
  }

  function getCatalog(localId) {
    return CATALOGO().porLocal?.[String(localId)] || null;
  }

  function lineTotal(prod, qty) {
    if (!qty || qty <= 0) return 0;
    return prod.precio * qty;
  }

  function calcTotal(catalog) {
    let total = 0;
    Object.entries(cartState).forEach(([pid, qty]) => {
      const prod = findProduct(catalog, pid);
      if (prod) total += lineTotal(prod, qty);
    });
    return total;
  }

  function findProduct(catalog, pid) {
    for (const area of catalog.areas || []) {
      const p = area.productos.find((x) => x.id === pid);
      if (p) return p;
    }
    return null;
  }

  function qtyLabel(prod, qty) {
    if (!qty) return "0";
    if (prod.tipoCantidad === "entero") return `${qty} ${prod.etiqueta || "pzas"}`;
    return `${qty} ${prod.etiqueta || prod.unidad}`;
  }

  function buildOrderMessage(catalog) {
    const lines = ["Hola, solicito los siguientes productos:", ""];
    let total = 0;
    const items = [];

    catalog.areas.forEach((area) => {
      area.productos.forEach((p) => {
        const qty = cartState[p.id];
        if (!qty || qty <= 0) return;
        const sub = lineTotal(p, qty);
        total += sub;
        items.push(`• ${p.nombre} — ${qtyLabel(p, qty)} — ${fmtMoney(sub)}`);
      });
    });

    if (!items.length) return null;

    lines.push(...items);
    lines.push("", `*Total estimado: ${fmtMoney(total)}*`);
    lines.push("", "Enviado desde Mercado Garmendia");
    return lines.join("\n");
  }

  function renderQtyControl(prod, onChange) {
    if (prod.tipoCantidad === "entero") {
      const sel = document.createElement("select");
      sel.className = "cat-qty-select";
      sel.setAttribute("aria-label", `Cantidad de ${prod.nombre}`);
      for (let i = prod.min; i <= prod.max; i++) {
        const opt = document.createElement("option");
        opt.value = String(i);
        opt.textContent = i === 0 ? "0" : String(i);
        sel.appendChild(opt);
      }
      sel.value = String(cartState[prod.id] || 0);
      sel.addEventListener("change", () => onChange(prod.id, Number(sel.value)));
      return sel;
    }

    const wrap = document.createElement("div");
    wrap.className = "cat-qty-weight";
    const inp = document.createElement("input");
    inp.type = "number";
    inp.className = "cat-qty-input";
    inp.min = String(prod.min);
    inp.max = String(prod.max);
    inp.step = String(prod.step);
    inp.value = cartState[prod.id] ? String(cartState[prod.id]) : "0";
    inp.setAttribute("aria-label", `Cantidad en ${prod.etiqueta} de ${prod.nombre}`);
    const lbl = document.createElement("span");
    lbl.className = "cat-qty-unit";
    lbl.textContent = prod.etiqueta || prod.unidad;
    inp.addEventListener("input", () => {
      const v = parseFloat(inp.value) || 0;
      onChange(prod.id, v);
    });
    wrap.append(inp, lbl);
    return wrap;
  }

  function openCatalogo(local) {
    const catalog = getCatalog(local.id);
    if (!catalog) {
      alert("Catálogo no disponible para este local.");
      return;
    }

    activeLocal = local;
    cartState = {};
    catalog.areas.forEach((a) => a.productos.forEach((p) => { cartState[p.id] = 0; }));

    let root = document.getElementById("catalogo-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "catalogo-root";
      document.body.appendChild(root);
    }

    root.innerHTML = "";
    const overlay = document.createElement("div");
    overlay.className = "cat-overlay open";
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeCatalogo(); });

    const panel = document.createElement("div");
    panel.className = "cat-panel";
    panel.addEventListener("click", (e) => e.stopPropagation());

    const header = document.createElement("div");
    header.className = "cat-header";
    header.innerHTML = `
      <div>
        <p class="cat-eyebrow">Catálogo · Local #${local.id}</p>
        <h2>${catalog.localNombre}</h2>
        <p class="cat-sub">${catalog.categoria} · ${catalog.totalProductos} productos</p>
      </div>
      <button type="button" class="cat-close" aria-label="Cerrar"><i class="fa-solid fa-xmark"></i></button>
    `;
    header.querySelector(".cat-close").addEventListener("click", closeCatalogo);

    const body = document.createElement("div");
    body.className = "cat-body";

    const totalBar = document.createElement("div");
    totalBar.className = "cat-total-sticky";
    totalBar.innerHTML = `<span>Total estimado</span><strong id="catTotalLabel">${fmtMoney(0)}</strong>`;

    function refreshTotal() {
      const t = calcTotal(catalog);
      const el = totalBar.querySelector("#catTotalLabel");
      if (el) el.textContent = fmtMoney(t);
    }

    function setQty(pid, qty) {
      cartState[pid] = qty;
      refreshTotal();
    }

    catalog.areas.forEach((area, ai) => {
      const details = document.createElement("details");
      details.className = "cat-area";
      if (ai < 2) details.open = true;

      const summary = document.createElement("summary");
      summary.innerHTML = `<span>${area.nombre}</span><em>${area.productos.length} productos</em>`;
      details.appendChild(summary);

      const list = document.createElement("div");
      list.className = "cat-product-list";

      area.productos.forEach((p) => {
        const row = document.createElement("div");
        row.className = "cat-product-row";
        const info = document.createElement("div");
        info.className = "cat-product-info";
        info.innerHTML = `
          <strong>${p.nombre}</strong>
          <span class="cat-price">${fmtMoney(p.precio)} <em>/ ${p.etiqueta || p.unidad}</em></span>
        `;
        const qty = renderQtyControl(p, setQty);
        row.append(info, qty);
        list.appendChild(row);
      });

      details.appendChild(list);
      body.appendChild(details);
    });

    const footer = document.createElement("div");
    footer.className = "cat-footer";
    footer.style.display = "flex";
    footer.style.flexDirection = "column";
    footer.style.gap = "12px";

    const orderBtn = document.createElement("button");
    orderBtn.type = "button";
    orderBtn.className = "cat-btn-order";
    orderBtn.innerHTML = '<i class="fa-brands fa-whatsapp"></i> HACER PEDIDO POR WHATSAPP';
    orderBtn.addEventListener("click", () => {
      const msg = buildOrderMessage(catalog);
      if (!msg) {
        alert("Selecciona al menos un producto para hacer tu pedido.");
        return;
      }
      const wa = catalog.whatsapp || local.whatsapp;
      const url = `https://wa.me{wa}?text=${encodeURIComponent(msg)}`;
      window.open(url, "_blank", "noopener");
    });

    const pwaOrderBtn = document.createElement("button");
    pwaOrderBtn.type = "button";
    pwaOrderBtn.className = "cat-btn-pwa-order";
    pwaOrderBtn.innerHTML = '<i class="fa-solid fa-shop"></i> ENVIAR PEDIDO AL LOCAL';
    pwaOrderBtn.style.backgroundColor = "#C9A227"; 
    pwaOrderBtn.style.color = "#FFFFFF";
    pwaOrderBtn.style.border = "none";
    pwaOrderBtn.style.padding = "14px 20px";
    pwaOrderBtn.style.borderRadius = "12px";
    pwaOrderBtn.style.fontSize = "15px";
    pwaOrderBtn.style.fontWeight = "600";
    pwaOrderBtn.style.cursor = "pointer";
    pwaOrderBtn.style.transition = "all 0.2s ease";
    pwaOrderBtn.style.display = "flex";
    pwaOrderBtn.style.alignItems = "center";
    pwaOrderBtn.style.justifyContent = "center";
    pwaOrderBtn.style.gap = "8px";

    pwaOrderBtn.addEventListener("click", () => {
      const t = calcTotal(catalog);
      if (t <= 0) {
        alert("Selecciona al menos un producto para enviar tu pedido.");
        return;
      }
      abrirPopupConfirmacionPWA(catalog, local, t);
    });

    footer.append(totalBar, orderBtn, pwaOrderBtn);
    panel.append(header, body, footer);
    overlay.appendChild(panel);
    root.appendChild(overlay);
    document.body.style.overflow = "hidden";

    document.addEventListener("keydown", onEsc);
  }

  function abrirPopupConfirmacionPWA(catalog, local, total) {
    let popupRoot = document.getElementById("pwa-popup-root");
    if (!popupRoot) {
      popupRoot = document.createElement("div");
      popupRoot.id = "pwa-popup-root";
      document.body.appendChild(popupRoot);
    }

    const resumenItems = [];
    const arrayProductosWix = [];
    catalog.areas.forEach((area) => {
      area.productos.forEach((p) => {
        const qty = cartState[p.id];
        if (!qty || qty <= 0) return;
        const sub = lineTotal(p, qty);
        resumenItems.push(`<li>${p.nombre} (${qtyLabel(p, qty)}) - <strong>${fmtMoney(sub)}</strong></li>`);
        arrayProductosWix.push({ id: p.id, nombre: p.nombre, cantidad: qty, unidad: p.etiqueta || p.unidad, subtotal: sub });
      });
    });

    const overlay = document.createElement("div");
    overlay.className = "cat-overlay open";
    overlay.style.zIndex = "2000";

    const modal = document.createElement("div");
    modal.className = "cat-panel";
    modal.style.maxWidth = "460px";
    modal.style.height = "auto";
    modal.style.maxHeight = "90vh";
    modal.style.borderRadius = "16px";
    modal.style.backgroundColor = document.body.classList.contains("dark-mode") ? "#1C1C1E" : "#FFFFFF";
    modal.style.padding = "24px";

    // RESTAURACIÓN FÍSICA: Incluye el Textarea con ID 'pwa-obs' exigido por el compilador
    modal.innerHTML = `
