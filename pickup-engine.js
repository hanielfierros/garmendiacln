/**
 * Motor de carritos Pick Up — búsqueda en MG_CATALOGO
 */
(function (global) {
  "use strict";

  const SLANG = {
    asada: ["arrachera", "carne", "bistec", "res"],
    adobada: ["cerdo", "chuleta", "carne"],
    machaca: ["machaca", "cecina", "carne seca"],
    tacos: ["tortilla", "carne", "cebolla", "cilantro", "limon", "salsa"],
    pozole: ["maiz", "carne", "lechuga", "rabano", "limon"],
    birria: ["carne", "tortilla", "cebolla", "cilantro"],
    ceviche: ["pescado", "camaron", "limon", "cebolla", "jitomate"],
    aguachile: ["camaron", "limon", "pepino", "cebolla"],
    desayuno: ["huevo", "tortilla", "frijol", "cafe", "leche", "pan"],
    carnita: ["carne", "tortilla", "cebolla", "cilantro"],
    cheve: ["cerveza", "refresco"],
    popo: ["refresco", "soda"],
    lonche: ["tortilla", "pan", "jamón", "queso"],
    mariscos: ["camaron", "pescado", "pulpo", "ostion"],
    fruta: ["mango", "sandia", "melon", "platano", "papaya"],
    verdura: ["jitomate", "cebolla", "chile", "lechuga", "papa"],
  };

  const INTENT_PRODUCTS = {
    tacos: ["tortilla", "arrachera", "cebolla", "cilantro", "limon", "salsa", "aguacate"],
    desayuno: ["huevo", "tortilla", "frijol", "cafe", "leche", "pan", "aguacate"],
    mariscos: ["camaron", "pescado", "limon", "cebolla", "jitomate"],
    carnes: ["bistec", "arrachera", "carne molida", "pollo", "cerdo"],
    abarrotes: ["arroz", "frijol", "aceite", "azucar", "sal", "leche"],
    fiesta: ["tortilla", "carne", "refresco", "cerveza", "pan"],
    picnic: ["sandia", "refresco", "pan", "queso", "jamón"],
  };

  function normalize(s) {
    return (s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ");
  }

  function tokenize(text) {
    const n = normalize(text);
    const tokens = new Set(n.split(/\s+/).filter((w) => w.length > 2));
    Object.entries(SLANG).forEach(([k, vals]) => {
      if (n.includes(k)) vals.forEach((v) => tokens.add(v));
    });
    Object.entries(INTENT_PRODUCTS).forEach(([k, vals]) => {
      if (n.includes(k)) vals.forEach((v) => tokens.add(normalize(v)));
    });
    return Array.from(tokens);
  }

  function getCatalog() {
    return global.MG_CATALOGO || {};
  }

  function allProducts() {
    const cat = getCatalog();
    if (cat.indice?.length) return cat.indice.filter((p) => p.nombre);
    const out = [];
    Object.entries(cat.porLocal || {}).forEach(([lid, loc]) => {
      (loc.areas || []).forEach((area) => {
        (area.productos || []).forEach((p) => {
          if (p.activo === false) return;
          out.push({
            productoId: p.id,
            localId: Number(lid),
            localNombre: loc.localNombre,
            categoria: loc.categoria,
            areaNombre: area.nombre,
            nombre: p.nombre,
            precio: p.precio,
            unidad: p.unidad,
            tipoCantidad: p.tipoCantidad,
            min: p.min,
            max: p.max,
            step: p.step,
            etiqueta: p.etiqueta,
          });
        });
      });
    });
    return out;
  }

  function scoreProduct(prod, tokens) {
    const name = normalize(prod.nombre);
    let score = 0;
    tokens.forEach((t) => {
      if (name.includes(t)) score += t.length >= 5 ? 3 : 2;
      if (t.length >= 4 && name.split(" ").some((w) => w.startsWith(t))) score += 1;
    });
    return score;
  }

  function defaultQty(prod) {
    if (prod.tipoCantidad === "decimal" || prod.unidad === "kg") return 0.5;
    return 1;
  }

  function findMatches(tokens, all) {
    const matches = all
      .map((p) => ({ p, score: scoreProduct(p, tokens) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);

    const byToken = {};
    tokens.forEach((tok) => {
      const pool = all.filter((p) => normalize(p.nombre).includes(tok));
      if (pool.length) byToken[tok] = pool;
    });

    return { matches, byToken, tokens };
  }

  function pickForToken(token, pool, mode) {
    const sorted = [...pool].sort((a, b) =>
      mode === "cheap" ? a.precio - b.precio : b.precio - a.precio
    );
    return sorted[0] || null;
  }

  function buildCartItems(tokens, mode) {
    const all = allProducts();
    const { byToken } = findMatches(tokens, all);
    const items = [];
    const missing = [];
    const usedIds = new Set();

    const searchTokens = tokens.length ? tokens : ["tortilla", "leche", "huevo"];

    searchTokens.forEach((tok) => {
      let pool = byToken[tok];
      if (!pool?.length) {
        pool = all.filter((p) => scoreProduct(p, [tok]) > 0);
      }
      if (!pool?.length) {
        missing.push(tok);
        return;
      }
      const pick = pickForToken(tok, pool, mode);
      if (!pick || usedIds.has(pick.productoId)) return;
      usedIds.add(pick.productoId);
      items.push({
        productoId: pick.productoId,
        localId: pick.localId,
        localNombre: pick.localNombre,
        nombre: pick.nombre,
        precio: pick.precio,
        unidad: pick.unidad,
        tipoCantidad: pick.tipoCantidad,
        etiqueta: pick.etiqueta || pick.unidad,
        min: pick.min ?? 0,
        max: pick.max ?? 20,
        step: pick.step ?? 1,
        cantidad: defaultQty(pick),
      });
    });

    if (items.length < 3) {
      const extra = all
        .filter((p) => !usedIds.has(p.productoId))
        .sort((a, b) => (mode === "cheap" ? a.precio - b.precio : b.precio - a.precio));
      for (const p of extra) {
        if (items.length >= 6) break;
        usedIds.add(p.productoId);
        items.push({
          productoId: p.productoId,
          localId: p.localId,
          localNombre: p.localNombre,
          nombre: p.nombre,
          precio: p.precio,
          unidad: p.unidad,
          tipoCantidad: p.tipoCantidad,
          etiqueta: p.etiqueta || p.unidad,
          min: p.min ?? 0,
          max: p.max ?? 20,
          step: p.step ?? 1,
          cantidad: defaultQty(p),
        });
      }
    }

    return { items, missing };
  }

  function subtotal(items) {
    return items.reduce((s, it) => s + it.precio * (Number(it.cantidad) || 0), 0);
  }

  function generateCarts(userMessage) {
    const tokens = tokenize(userMessage);
    const cheap = buildCartItems(tokens, "cheap");
    const expensive = buildCartItems(tokens, "expensive");
    const missing = [...new Set([...cheap.missing, ...expensive.missing])];

    return {
      tokens,
      missing,
      cheap: { id: "cheap", label: "Opción económica", items: cheap.items, subtotal: subtotal(cheap.items) },
      expensive: { id: "expensive", label: "Opción premium", items: expensive.items, subtotal: subtotal(expensive.items) },
    };
  }

  function enrichFromDominiusReply(reply, carts) {
    const extra = tokenize(reply || "");
    if (!extra.length) return carts;
    const merged = [...new Set([...carts.tokens, ...extra])].slice(0, 12);
    return generateCarts(merged.join(" "));
  }

  global.MG_PICKUP_ENGINE = {
    generateCarts,
    enrichFromDominiusReply,
    tokenize,
    subtotal,
    allProducts,
  };
})(window);