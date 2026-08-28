/**
 * Catálogo y pedido por WhatsApp — Mercado Garmendia V14
 */
(function (global) {
  "use strict";

  const CATALOGO = () => global.MG_CATALOGO || {};
  let cartState = {};
  let activeLocal = null;

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

  function selectedProducts(catalog) {
    const items = [];
    (catalog.areas || []).forEach((area) => {
      (area.productos || []).forEach((p) => {
        const qty = cartState[p.id];
        if (qty && qty > 0) items.push({ id: p.id, nombre: p.nombre, cantidad: qty, unidad: p.unidad || p.etiqueta, precio: p.precio, subtotal: lineTotal(p, qty) });
      });
    });
    return items;
  }

  function genOrderId() {
    const n = 1000 + Math.floor(Math.random() * 9000);
    const s = Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, "0");
    return "GM-" + n + "-" + s;
  }

  function savePedido(order) {
    try {
      const key = "mg_pedidos_pendientes";
      const arr = JSON.parse(localStorage.getItem(key) || "[]");
      arr.push(order);
      localStorage.setItem(key, JSON.stringify(arr));
    } catch (e) {}
  }

  function openPedidoModal(local, items, total) {
    let root = document.getElementById("pedido-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "pedido-root";
      document.body.appendChild(root);
    }
    root.innerHTML = "";

    const overlay = document.createElement("div");
    overlay.className = "pedido-overlay open";
    overlay.addEventListener("click", () => { root.innerHTML = ""; });

    const card = document.createElement("div");
    card.className = "pedido-card";
    card.addEventListener("click", (e) => e.stopPropagation());

    const head = document.createElement("div");
    head.className = "pedido-head";
    head.innerHTML = '<div><h3>Confirmar Pedido</h3><p>Local #' + local.id + " · " + local.nombre + '</p></div>';
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "pedido-close";
    closeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    closeBtn.addEventListener("click", () => { root.innerHTML = ""; });
    head.appendChild(closeBtn);

    const list = document.createElement("div");
    list.className = "pedido-list";
    items.forEach((it) => {
      const row = document.createElement("div");
      row.className = "pedido-item";
      row.innerHTML = '<div><strong>' + it.nombre + '</strong><span>× ' + it.cantidad + " " + (it.unidad || "") + '</span></div><em>' + fmtMoney(it.subtotal) + '</em>';
      list.appendChild(row);
    });

    const totalEl = document.createElement("div");
    totalEl.className = "pedido-total";
    totalEl.innerHTML = '<span>Total</span><strong>' + fmtMoney(total) + '</strong>';

    const ta = document.createElement("textarea");
    ta.className = "pedido-notes";
    ta.placeholder = "Instrucciones o comentarios extras";
    ta.setAttribute("rows", "3");

    const confirmBtn = document.createElement("button");
    confirmBtn.type = "button";
    confirmBtn.className = "pedido-confirm";
    confirmBtn.innerHTML = '<i class="fa-solid fa-check"></i> Confirmar y Enviar';
    confirmBtn.addEventListener("click", () => {
      const order = {
        idPedido: genOrderId(),
        idLocal: local.id,
        hora: new Date().toLocaleString("es-MX"),
        productos: items,
        total: total,
        observaciones: ta.value.trim(),
      };
      savePedido(order);

      Object.keys(cartState).forEach((k) => { cartState[k] = 0; });
      document.querySelectorAll(".cat-qty-input").forEach((inp) => { inp.value = "0"; });
      document.querySelectorAll(".cat-qty-select").forEach((sel) => { sel.value = "0"; });
      const lbl = document.getElementById("catTotalLabel");
      if (lbl) lbl.textContent = fmtMoney(0);

      card.innerHTML = '<div class="pedido-success"><i class="fa-solid fa-circle-check"></i><h3>¡Pedido enviado con éxito!</h3><p>El local está procesando tu solicitud.</p><button type="button" class="pedido-confirm">Cerrar</button></div>';
      card.querySelector(".pedido-confirm").addEventListener("click", () => { root.innerHTML = ""; });
    });

    card.append(head, list, totalEl, ta, confirmBtn);
    overlay.appendChild(card);
    root.appendChild(overlay);
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
    const orderBtn = document.createElement("button");
    orderBtn.type = "button";
    orderBtn.className = "cat-btn-order";
    orderBtn.innerHTML = '<i class="fa-brands fa-whatsapp"></i> HACER PEDIDO';
    orderBtn.addEventListener("click", () => {
      const msg = buildOrderMessage(catalog);
      if (!msg) {
        alert("Selecciona al menos un producto para hacer tu pedido.");
        return;
      }
      const wa = catalog.whatsapp || local.whatsapp;
      const url = `https://wa.me/${wa}?text=${encodeURIComponent(msg)}`;
      window.open(url, "_blank", "noopener");
    });

    const sendBtn = document.createElement("button");
    sendBtn.type = "button";
    sendBtn.className = "cat-btn-send";
    sendBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Enviar Pedido al Local';
    sendBtn.addEventListener("click", () => {
      const items = selectedProducts(catalog);
      if (!items.length) {
        alert("Selecciona al menos un producto para enviar tu pedido.");
        return;
      }
      openPedidoModal(local, items, calcTotal(catalog));
    });

    footer.append(totalBar, orderBtn, sendBtn);
    panel.append(header, body, footer);
    overlay.appendChild(panel);
    root.appendChild(overlay);
    document.body.style.overflow = "hidden";

    document.addEventListener("keydown", onEsc);
  }

  function onEsc(e) {
    if (e.key === "Escape") closeCatalogo();
  }

  function closeCatalogo() {
    const root = document.getElementById("catalogo-root");
    if (root) root.innerHTML = "";
    if (!document.getElementById("modal-root")?.firstChild && !document.getElementById("directorio-root")?.firstChild) {
      document.body.style.overflow = "";
    }
    document.removeEventListener("keydown", onEsc);
    activeLocal = null;
  }

  function whatsappUrl(local) {
    const catalog = getCatalog(local.id);
    const wa = catalog?.whatsapp || local.whatsapp || "526673763125";
    const text = `Hola ${local.nombre}, vi su local en el Mercado Garmendia y me gustaría más información.`;
    return `https://wa.me/${wa}?text=${encodeURIComponent(text)}`;
  }

  global.MG_CATALOGO_UI = {
    openCatalogo,
    closeCatalogo,
    whatsappUrl,
    getCatalog,
  };
})(window);