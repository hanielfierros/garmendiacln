/**
 * App Pick Up — Mercado Garmendia V14
 */
(function () {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const CFG = () => window.MG_PICKUP_CONFIG || {};
  const ENGINE = () => window.MG_PICKUP_ENGINE;
  const CHAT = () => window.MG_PICKUP_CHAT;
  const CHECKOUT = () => window.MG_PICKUP_CHECKOUT;
  const ACCESS = () => window.MG_PICKUP_ACCESS;

  let state = {
    carts: null,
    activeCart: null,
    customItems: null,
    customer: null,
    folio: null,
    whatsappSent: false,
  };

  function el(tag, attrs, kids) {
    const n = document.createElement(tag);
    if (attrs) {
      Object.entries(attrs).forEach(([k, v]) => {
        if (k === "className") n.className = v;
        else if (k === "text") n.textContent = v;
        else if (k === "html") n.innerHTML = v;
        else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2).toLowerCase(), v);
        else if (v != null) n.setAttribute(k, v);
      });
    }
    (kids || []).forEach((c) => {
      if (c == null) return;
      n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return n;
  }

  function addChatMsg(role, text) {
    const log = $("#puChatLog");
    if (!log) return;
    const bubble = el("div", { className: `pu-msg pu-msg-${role}` }, [
      el("span", { className: "pu-msg-label", text: role === "user" ? "Tú" : "Asistente" }),
      el("p", { text }),
    ]);
    log.appendChild(bubble);
    log.scrollTop = log.scrollHeight;
  }

  function setProcessing(on) {
    const btn = $("#puSendBtn");
    const carts = $("#puCarts");
    if (btn) btn.disabled = on;
    if (carts && on) carts.innerHTML = '<div class="pu-loading"><i class="fa-solid fa-spinner fa-spin"></i> Procesando tu pedido...</div>';
  }

  function renderCarts(carts) {
    const root = $("#puCarts");
    if (!root) return;
    root.innerHTML = "";

    if (carts.missing?.length) {
      root.appendChild(el("div", { className: "pu-alert" }, [
        el("i", { className: "fa-solid fa-circle-info" }),
        el("span", { text: `No encontramos en catálogo: ${carts.missing.join(", ")}. Cotizamos lo disponible.` }),
      ]));
    }

    const grid = el("div", { className: "pu-carts-grid" });
    ["cheap", "expensive"].forEach((key) => {
      const c = carts[key];
      if (!c?.items?.length) return;
      const card = el("button", {
        type: "button",
        className: `pu-cart-card pu-cart-${key}`,
        onclick: () => openCartModal(c),
      }, [
        el("span", { className: "pu-cart-tag", text: key === "cheap" ? "Económico" : "Premium" }),
        el("h3", { text: c.label }),
        el("p", { className: "pu-cart-meta", text: `${c.items.length} productos · varios locales` }),
        el("strong", { className: "pu-cart-price", text: CHECKOUT().fmtMoney(c.subtotal) }),
        el("span", { className: "pu-cart-hint", text: "Ver y ajustar cantidades" }),
      ]);
      grid.appendChild(card);
    });

    if (!grid.children.length) {
      root.appendChild(el("p", { className: "pu-empty", text: "No encontramos productos. Intenta describir tu pedido con más detalle." }));
      return;
    }
    root.appendChild(grid);
  }

  function getActiveItems() {
    return state.customItems || state.activeCart?.items || [];
  }

  function openCartModal(cart) {
    state.activeCart = JSON.parse(JSON.stringify(cart));
    state.customItems = state.activeCart.items.map((it) => ({ ...it }));

    const overlay = el("div", { className: "pu-modal-overlay open" });
    const panel = el("div", { className: "pu-modal-panel" });

    const list = el("div", { className: "pu-modal-list" });
    const totalEl = el("strong", { className: "pu-modal-total", text: CHECKOUT().fmtMoney(ENGINE().subtotal(state.customItems)) });
    let continueBtn;

    function updateTotals() {
      const active = state.customItems.filter((it) => (Number(it.cantidad) || 0) > 0);
      totalEl.textContent = CHECKOUT().fmtMoney(ENGINE().subtotal(active));
      if (continueBtn) continueBtn.disabled = active.length === 0;
    }

    function refresh() {
      list.innerHTML = "";
      if (!state.customItems.length) {
        list.appendChild(el("p", {
          className: "pu-empty-cart",
          text: "No quedan productos en este carrito. Cierra y elige otra opción o escribe un nuevo pedido.",
        }));
        updateTotals();
        return;
      }

      state.customItems.forEach((it, idx) => {
        const row = el("div", { className: "pu-item-row" }, [
          el("div", { className: "pu-item-info" }, [
            el("strong", { text: it.nombre }),
            el("span", { text: `Local #${it.localId} · ${it.localNombre}` }),
            el("em", { text: `${CHECKOUT().fmtMoney(it.precio)} / ${it.etiqueta || it.unidad}` }),
          ]),
        ]);

        const actions = el("div", { className: "pu-item-actions" });
        let input;
        if (it.tipoCantidad === "decimal") {
          input = el("input", {
            type: "number",
            className: "pu-qty-input",
            min: String(it.min ?? 0),
            max: String(it.max ?? 25),
            step: String(it.step ?? 0.25),
            value: String(it.cantidad),
          });
          input.addEventListener("input", () => {
            state.customItems[idx].cantidad = parseFloat(input.value) || 0;
            updateTotals();
          });
        } else {
          input = el("select", { className: "pu-qty-select" });
          for (let i = 0; i <= 20; i++) {
            input.appendChild(el("option", { value: String(i), text: String(i) }));
          }
          input.value = String(Math.round(it.cantidad));
          input.addEventListener("change", () => {
            state.customItems[idx].cantidad = Number(input.value);
            updateTotals();
          });
        }

        actions.appendChild(input);
        actions.appendChild(el("button", {
          type: "button",
          className: "pu-item-remove",
          title: "Quitar producto",
          ariaLabel: "Quitar producto",
          onclick: () => { state.customItems.splice(idx, 1); refresh(); },
        }, [el("i", { className: "fa-solid fa-xmark" })]));
        row.appendChild(actions);
        list.appendChild(row);
      });
      updateTotals();
    }

    panel.appendChild(el("div", { className: "pu-modal-head" }, [
      el("h2", { text: cart.label }),
      el("button", { type: "button", className: "pu-modal-close", onclick: () => overlay.remove() }, [
        el("i", { className: "fa-solid fa-xmark" }),
      ]),
    ]));
    panel.appendChild(el("p", { className: "pu-modal-hint", text: "Ajusta cantidades o pulsa ✕ para quitar un producto." }));
    panel.appendChild(list);
    refresh();
    panel.appendChild(el("div", { className: "pu-modal-foot" }, [
      el("span", { text: "Subtotal productos: " }), totalEl,
      continueBtn = el("button", {
        type: "button",
        className: "pu-btn-primary",
        onclick: () => {
          const active = state.customItems.filter((it) => (Number(it.cantidad) || 0) > 0);
          if (!active.length) { alert("Agrega al menos un producto al carrito."); return; }
          state.customItems = active;
          overlay.remove();
          openCustomerForm();
        },
      }, ["Cerrar carrito y continuar"]),
    ]));
    overlay.appendChild(panel);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  }

  function openCustomerForm() {
    const overlay = el("div", { className: "pu-modal-overlay open" });
    const panel = el("div", { className: "pu-modal-panel pu-form-panel" });

    const nameInp = el("input", { type: "text", className: "pu-input", placeholder: "Nombre completo", required: "true" });
    const telInp = el("input", { type: "tel", className: "pu-input", placeholder: "Teléfono", required: "true" });
    const notesInp = el("textarea", { className: "pu-input pu-textarea", placeholder: "Notas (opcional): sin cebolla, recoger a las 4pm..." });

    panel.appendChild(el("h2", { text: "Datos para tu pedido Pick Up" }));
    panel.appendChild(el("label", { text: "Nombre *" }));
    panel.appendChild(nameInp);
    panel.appendChild(el("label", { text: "Teléfono *" }));
    panel.appendChild(telInp);
    panel.appendChild(el("label", { text: "Notas" }));
    panel.appendChild(notesInp);
    panel.appendChild(el("button", {
      type: "button",
      className: "pu-btn-primary",
      onclick: () => {
        const nombre = nameInp.value.trim();
        const telefono = telInp.value.trim();
        if (!nombre || !telefono) {
          alert("Nombre y teléfono son obligatorios.");
          return;
        }
        state.customer = { nombre, telefono, notas: notesInp.value.trim() };
        state.folio = CHECKOUT().generateFolio();
        overlay.remove();
        sendWhatsAppPrePayment();
        openPaymentStep();
      },
    }, ["Continuar — enviar pedido por WhatsApp"]));

    overlay.appendChild(panel);
    document.body.appendChild(overlay);
  }

  function sendWhatsAppPrePayment() {
    const items = getActiveItems().filter((it) => (Number(it.cantidad) || 0) > 0);
    const totals = CHECKOUT().calcTotals(items, null);
    const order = {
      folio: state.folio,
      customer: state.customer,
      items,
      totals,
      paymentMethod: null,
      paymentLabel: "Pendiente de selección",
    };
    CHECKOUT().openWhatsApp(CHECKOUT().buildWhatsAppBody(order));
    state.whatsappSent = true;
  }

  function openPaymentStep() {
    const root = $("#puCheckout");
    if (!root) return;
    root.classList.add("open");
    root.innerHTML = "";

    const items = getActiveItems().filter((it) => (Number(it.cantidad) || 0) > 0);
    const labels = CHECKOUT().paymentLabels();

    root.appendChild(el("h2", { text: "Elige forma de pago" }));
    root.appendChild(el("p", { className: "pu-checkout-hint", text: "Ya enviamos tu pedido por WhatsApp. El mercado te pedirá comprobante o confirmará efectivo." }));

    const methods = [
      { id: "transfer", icon: "fa-building-columns", title: labels.transfer, desc: `CLABE Banorte: ${CFG().bankClabe}` },
      { id: "card", icon: "fa-credit-card", title: labels.card, desc: `+12% comisión · ${CFG().cardPaymentUrl}` },
      { id: "cash", icon: "fa-money-bill-wave", title: labels.cash, desc: "Paga al recoger en zona Pick Up" },
    ];

    methods.forEach((m) => {
      root.appendChild(el("button", {
        type: "button",
        className: "pu-pay-option",
        onclick: () => finalizeOrder(m.id, labels[m.id]),
      }, [
        el("i", { className: `fa-solid ${m.icon}` }),
        el("div", null, [el("strong", { text: m.title }), el("span", { text: m.desc })]),
      ]));
    });
  }

  async function finalizeOrder(method, label) {
    const items = getActiveItems().filter((it) => (Number(it.cantidad) || 0) > 0);
    const totals = CHECKOUT().calcTotals(items, method);
    const order = {
      folio: state.folio,
      customer: state.customer,
      items,
      totals,
      paymentMethod: method,
      paymentLabel: label,
    };

    if (method === "card") {
      window.open(CFG().cardPaymentUrl, "_blank", "noopener");
    }

    const emailResult = await CHECKOUT().notifyAdminEmail(order);

    const ticket = $("#puTicket");
    if (ticket) {
      ticket.classList.add("open");
      ticket.innerHTML = "";
      ticket.appendChild(el("div", { className: "pu-ticket-card" }, [
        el("div", { className: "pu-ticket-head" }, [
          el("h2", { text: "Ticket Pick Up" }),
          el("span", { className: "pu-folio", text: order.folio }),
        ]),
        el("p", { html: `<strong>${order.customer.nombre}</strong> · ${order.customer.telefono}` }),
        order.customer.notas ? el("p", { className: "pu-notes", text: order.customer.notas }) : null,
        el("p", { text: `Pago: ${label}` }),
        emailResult.ok
          ? el("p", { className: "pu-email-ok", text: "✓ Notificación enviada al administrador por correo." })
          : el("p", { className: "pu-email-warn", text: `⚠ ${emailResult.message} Tu ticket sigue válido; coordina por WhatsApp.` }),
        el("ul", { className: "pu-ticket-list" }, items.map((it) => {
          const sub = it.precio * it.cantidad;
          return el("li", { html: `<span>Local #${it.localId} · ${it.nombre} (${CHECKOUT().qtyLabel(it)})</span><strong>${CHECKOUT().fmtMoney(sub)}</strong>` });
        })),
        el("div", { className: "pu-ticket-totals" }, [
          el("div", { html: `Subtotal productos <span>${CHECKOUT().fmtMoney(totals.subtotal)}</span>` }),
          el("div", { html: `Comisión servicio Pick Up <span>${CHECKOUT().fmtMoney(totals.serviceFee)}</span>` }),
          totals.cardFee > 0 ? el("div", { html: `Comisión tarjeta (12%) <span>${CHECKOUT().fmtMoney(totals.cardFee)}</span>` }) : null,
          el("div", { className: "pu-ticket-final", html: `TOTAL <span>${CHECKOUT().fmtMoney(totals.total)}</span>` }),
          method === "cash" ? el("p", { className: "pu-cash-note", html: `<strong>Llevar en efectivo: ${CHECKOUT().fmtMoney(totals.total)}</strong>` }) : null,
          method === "transfer" ? el("p", { text: `CLABE: ${CFG().bankClabe}` }) : null,
        ]),
        el("div", { className: "pu-ticket-actions" }, [
          el("button", { type: "button", className: "pu-btn-ghost", onclick: () => CHECKOUT().printTicket(order) }, ["Imprimir"]),
          el("button", { type: "button", className: "pu-btn-ghost", onclick: () => CHECKOUT().downloadTicket(order) }, ["Descargar"]),
          el("button", { type: "button", className: "pu-btn-primary", onclick: () => { ACCESS().clearAllAndExit(); } }, ["Finalizar"]),
        ]),
      ]));
      ticket.scrollIntoView({ behavior: "smooth" });
    }
  }

  async function handleSend() {
    const input = $("#puChatInput");
    const text = input?.value?.trim();
    if (!text) return;
    input.value = "";
    addChatMsg("user", text);
    setProcessing(true);

    const [botReply] = await Promise.all([
      CHAT().sendToDominius(text),
      new Promise((r) => setTimeout(r, 400)),
    ]);

    let carts = ENGINE().generateCarts(text);
    carts = ENGINE().enrichFromDominiusReply(botReply, carts);
    state.carts = carts;

    addChatMsg("bot", botReply);
    setProcessing(false);
    renderCarts(carts);
  }

  function init() {
    if (!ACCESS().guardEntry()) return;

    ACCESS().startTimer($("#puTimer"), () => {});

    CHAT().initSpeech((text) => {
      const input = $("#puChatInput");
      if (input) {
        input.value = text;
        addChatMsg("user", text + " (voz)");
      }
    });

    $("#puSendBtn")?.addEventListener("click", handleSend);
    $("#puChatInput")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    });
    $("#puMicBtn")?.addEventListener("click", () => {
      CHAT().startMic((t) => {
        const input = $("#puChatInput");
        if (input) input.value = t;
      });
      $("#puMicBtn")?.classList.toggle("active", CHAT().isListening());
    });
    $("#puExitBtn")?.addEventListener("click", () => {
      if (confirm("¿Salir de Pick Up? Se perderá el pedido en curso.")) ACCESS().clearAllAndExit();
    });

    addChatMsg("bot", "Bienvenido a Pick Up. Cuéntame qué necesitas y te preparo dos carritos: económico y premium. Recuerda: tienes tiempo limitado para completar el pedido.");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();