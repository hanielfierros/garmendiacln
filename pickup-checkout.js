/**
 * Checkout, ticket, WhatsApp y notificación admin — Pick Up V13
 */
(function (global) {
  "use strict";

  const CFG = () => global.MG_PICKUP_CONFIG || {};

  function fmtMoney(n) {
    return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n);
  }

  function generateFolio() {
    const n = Math.floor(1000 + Math.random() * 9000);
    return `${CFG().folioPrefix || "PU-2026-"}${n}`;
  }

  function calcTotals(items, paymentMethod) {
    const subtotal = items.reduce((s, it) => s + it.precio * (Number(it.cantidad) || 0), 0);
    const serviceFee = CFG().serviceFee ?? 65;
    const base = subtotal + serviceFee;
    const cardPct = (CFG().cardFeePercent ?? 12) / 100;
    const cardFee = paymentMethod === "card" ? base * cardPct : 0;
    const total = base + cardFee;
    return { subtotal, serviceFee, cardFee, total, cardPct: cardPct * 100 };
  }

  function qtyLabel(it) {
    const q = Number(it.cantidad) || 0;
    if (it.tipoCantidad === "decimal") return `${q} ${it.etiqueta || it.unidad}`;
    return `${q} ${it.etiqueta || "pzas"}`;
  }

  function buildWhatsAppBody(order) {
    const lines = ["Para PickUp", `Folio: ${order.folio}`, ""];
    if (order.customer?.nombre) lines.push(`Cliente: ${order.customer.nombre}`);
    if (order.customer?.telefono) lines.push(`Tel: ${order.customer.telefono}`);
    if (order.customer?.notas) lines.push(`Notas: ${order.customer.notas}`);
    lines.push("");

    order.items.forEach((it) => {
      const sub = it.precio * (Number(it.cantidad) || 0);
      lines.push(
        `• Local #${it.localId} (${it.localNombre}) — ${it.nombre} — ${qtyLabel(it)} — ${fmtMoney(sub)}`
      );
    });

    lines.push("");
    lines.push(`Subtotal: ${fmtMoney(order.totals.subtotal)}`);
    lines.push(`Servicio Pick Up: ${fmtMoney(order.totals.serviceFee)}`);
    if (order.totals.cardFee > 0) lines.push(`Comisión tarjeta (12%): ${fmtMoney(order.totals.cardFee)}`);
    lines.push(`*TOTAL: ${fmtMoney(order.totals.total)}*`);

    if (order.paymentMethod === "transfer") {
      lines.push("", `Pago: Transferencia ${CFG().bankName}`, `CLABE: ${CFG().bankClabe}`);
    } else if (order.paymentMethod === "card") {
      lines.push("", "Pago: Tarjeta (enlace enviado al cliente)");
    } else if (order.paymentMethod === "cash") {
      lines.push("", `Pago: Efectivo al recoger — llevar ${fmtMoney(order.totals.total)}`);
    }

    lines.push("", "*Adjuntar comprobante de pago y en caso de que sea pago en Efectivo, avisar*");
    return lines.join("\n");
  }

  function openWhatsApp(text) {
    const num = CFG().whatsappNumber || "525541921509";
    const url = `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
    global.open(url, "_blank", "noopener");
  }

  function buildEmailPayload(order) {
    const subject = `[PickUp Garmendia] ${order.folio}`;
    const productos = order.items.map((it) =>
      `Local ${it.localId} | ${it.nombre} | ${qtyLabel(it)} | ${fmtMoney(it.precio * it.cantidad)}`
    ).join("\n");
    const mensaje = buildWhatsAppBody(order);

    return {
      access_key: CFG().web3formsAccessKey,
      subject,
      from_name: "Mercado Garmendia Pick Up",
      botcheck: "",
      email: CFG().adminEmail || "pickup@mercadogarmendia.mx",
      replyto: CFG().adminEmail || "pickup@mercadogarmendia.mx",
      folio: order.folio,
      cliente: order.customer?.nombre || "",
      telefono: order.customer?.telefono || "",
      notas: order.customer?.notas || "",
      metodo_pago: order.paymentLabel || "",
      subtotal: fmtMoney(order.totals.subtotal),
      servicio: fmtMoney(order.totals.serviceFee),
      comision_tarjeta: fmtMoney(order.totals.cardFee),
      total: fmtMoney(order.totals.total),
      productos,
      message: mensaje,
    };
  }

  async function postWeb3Forms(payload) {
    const url = CFG().web3formsUrl || "https://api.web3forms.com/submit";
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });
    let data = {};
    try {
      data = await res.json();
    } catch {
      data = {};
    }
    const ok = res.ok && data.success === true;
    return {
      ok,
      message: data.message || (ok ? "Correo enviado." : "No se pudo enviar el correo."),
    };
  }

  async function notifyAdminEmail(order) {
    const key = CFG().web3formsAccessKey;
    if (!key) {
      return { ok: false, message: "Falta configurar Web3Forms." };
    }

    const payload = buildEmailPayload(order);

    try {
      let result = await postWeb3Forms(payload);
      if (!result.ok) {
        await new Promise((r) => setTimeout(r, 800));
        result = await postWeb3Forms(payload);
      }
      return result;
    } catch {
      return { ok: false, message: "Error de red al enviar el correo." };
    }
  }

  function paymentLabels() {
    return {
      transfer: "Transferencia bancaria",
      card: "Pago con tarjeta",
      cash: "Efectivo al recoger",
    };
  }

  function renderTicketHTML(order) {
    const t = order.totals;
    const rows = order.items.map((it) => {
      const sub = it.precio * (Number(it.cantidad) || 0);
      return `<tr>
        <td>#${it.localId}<br><small>${it.localNombre}</small></td>
        <td>${it.nombre}</td>
        <td>${qtyLabel(it)}</td>
        <td>${fmtMoney(it.precio)}</td>
        <td>${fmtMoney(sub)}</td>
      </tr>`;
    }).join("");

    return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
      <title>Ticket ${order.folio}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:24px;color:#1a0a12}
        h1{color:#6B1E3D;font-size:1.4rem}
        table{width:100%;border-collapse:collapse;margin:16px 0;font-size:0.85rem}
        th,td{border:1px solid #ddd;padding:8px;text-align:left}
        th{background:#f5f0eb}
        .totals{margin-top:16px;font-size:0.95rem}
        .total{font-size:1.2rem;font-weight:bold;color:#6B1E3D}
      </style></head><body>
      <h1>Mercado Garmendia — Pick Up</h1>
      <p><strong>Folio:</strong> ${order.folio}<br>
      <strong>Cliente:</strong> ${order.customer?.nombre || ""}<br>
      <strong>Teléfono:</strong> ${order.customer?.telefono || ""}<br>
      <strong>Pago:</strong> ${order.paymentLabel || ""}<br>
      <strong>Punto recogida:</strong> ${CFG().pickupPoint || "Mercado Garmendia"}</p>
      ${order.customer?.notas ? `<p><strong>Notas:</strong> ${order.customer.notas}</p>` : ""}
      <table><thead><tr><th>Local</th><th>Producto</th><th>Cant.</th><th>P.unit</th><th>Subtotal</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <div class="totals">
        <p>Subtotal productos: ${fmtMoney(t.subtotal)}</p>
        <p>Comisión servicio Pick Up: ${fmtMoney(t.serviceFee)}</p>
        ${t.cardFee > 0 ? `<p>Comisión bancaria tarjeta (12%): ${fmtMoney(t.cardFee)}</p>` : ""}
        <p class="total">TOTAL: ${fmtMoney(t.total)}</p>
        ${order.paymentMethod === "cash" ? `<p><strong>Llevar en efectivo: ${fmtMoney(t.total)}</strong></p>` : ""}
        ${order.paymentMethod === "transfer" ? `<p>CLABE Banorte: ${CFG().bankClabe}</p>` : ""}
      </div>
      <p><em>Recoge el mismo día en zona Pick Up. Coordina por WhatsApp.</em></p>
      </body></html>`;
  }

  function downloadTicket(order) {
    const html = renderTicketHTML(order);
    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${order.folio}-ticket.html`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function printTicket(order) {
    const w = global.open("", "_blank");
    if (!w) return;
    w.document.write(renderTicketHTML(order));
    w.document.close();
    w.focus();
    w.print();
  }

  global.MG_PICKUP_CHECKOUT = {
    fmtMoney,
    generateFolio,
    calcTotals,
    buildWhatsAppBody,
    openWhatsApp,
    notifyAdminEmail,
    paymentLabels,
    downloadTicket,
    printTicket,
    qtyLabel,
  };
})(window);