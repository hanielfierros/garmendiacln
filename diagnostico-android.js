/* ============================================================
   DIAGNÓSTICO ANDROID v2 — herramienta TEMPORAL
   CÓMO ELIMINARLA: borrar este archivo y quitar la línea
   <script src="diagnostico-android.js"></script> en index.html
   ============================================================ */
(function () {
  "use strict";

  function $(s) { return document.querySelector(s); }
  function cs(e, p) { try { return getComputedStyle(e)[p]; } catch (_) { return "?"; } }
  function rnd(n) { return Math.round(n * 10) / 10; }

  function desc(e) {
    if (!e) return "";
    var id = e.id ? "#" + e.id : "";
    var cls = "";
    try { cls = (e.className && typeof e.className === "string") ? "." + e.className.trim().split(/\s+/).join(".") : ""; } catch (_) {}
    return (e.tagName || "").toLowerCase() + (id || cls);
  }

  function rutaDOM(el) {
    var a = [];
    var n = el;
    while (n && n !== document.body && n !== document.documentElement) {
      a.push(desc(n));
      n = n.parentElement;
    }
    a.push("body");
    return a.reverse().join(" > ");
  }

  function fullViewport() {
    var vv = window.visualViewport || {};
    var de = document.documentElement, b = document.body;
    var deR = de.getBoundingClientRect(), bR = b.getBoundingClientRect();
    var L = [];
    L.push("  window.innerWidth=" + window.innerWidth + "  innerHeight=" + window.innerHeight);
    L.push("  documentElement.clientWidth=" + de.clientWidth + "  clientHeight=" + de.clientHeight);
    L.push("  body.clientWidth=" + b.clientWidth + "  clientHeight=" + b.clientHeight);
    L.push("  documentElement.scrollWidth=" + de.scrollWidth + "  scrollHeight=" + de.scrollHeight);
    L.push("  body.scrollWidth=" + b.scrollWidth + "  scrollHeight=" + b.scrollHeight);
    L.push("  visualViewport: width=" + vv.width + " height=" + vv.height + " offsetLeft=" + vv.offsetLeft + " offsetTop=" + vv.offsetTop + " scale=" + vv.scale);
    L.push("  devicePixelRatio=" + window.devicePixelRatio);
    L.push("  screen.width=" + screen.width + " screen.height=" + screen.height + " availWidth=" + screen.availWidth + " availHeight=" + screen.availHeight);
    L.push("  documentElement rect w=" + rnd(deR.width) + " left=" + rnd(deR.left) + " right=" + rnd(deR.right));
    L.push("  body rect w=" + rnd(bR.width) + " left=" + rnd(bR.left) + " right=" + rnd(bR.right));
    return L;
  }

  function isVisible(e) {
    return cs(e, "display") !== "none" && cs(e, "visibility") !== "hidden" && parseFloat(cs(e, "opacity")) > 0.01;
  }

  function detectModales() {
    var cands = [];
    var all = document.querySelectorAll("body *");
    for (var i = 0; i < all.length; i++) {
      var e = all[i];
      var pos = cs(e, "position");
      if (pos !== "fixed" && pos !== "absolute") continue;
      var r = e.getBoundingClientRect();
      if (r.width < 40 || r.height < 40) continue; // descartar botones/iconos pequeños
      if (!isVisible(e)) continue;
      cands.push({ el: e, r: r, area: r.width * r.height, pos: pos });
    }
    cands.sort(function (a, b) { return b.area - a.area; });
    return cands.slice(0, 15);
  }

  function modalDetail(o) {
    var e = o.el;
    var L = [];
    L.push("  " + desc(e) + "  [" + o.pos + "]  area=" + rnd(o.area));
    L.push("    rect w=" + rnd(o.r.width) + " h=" + rnd(o.r.height) + " left=" + rnd(o.r.left) + " right=" + rnd(o.r.right) + " top=" + rnd(o.r.top) + " bottom=" + rnd(o.r.bottom));
    L.push("    position=" + cs(e, "position") + " display=" + cs(e, "display") + " visibility=" + cs(e, "visibility") + " opacity=" + cs(e, "opacity") + " z-index=" + cs(e, "zIndex"));
    L.push("    transform=" + cs(e, "transform") + "  transform-origin=" + cs(e, "transformOrigin"));
    L.push("    overflow=" + cs(e, "overflow") + "  overflow-x=" + cs(e, "overflowX") + "  overflow-y=" + cs(e, "overflowY"));
    L.push("    width=" + cs(e, "width") + " max-width=" + cs(e, "maxWidth") + " min-width=" + cs(e, "minWidth"));
    L.push("    ruta: " + rutaDOM(e));
    return L.join("\n");
  }

  function investigarMapa() {
    var sels = ["#mapaSvgWrap", "#mapaViewport", "#mapa", ".section-inner", ".reveal-item", ".mapa-svg-wrap", ".mapa-svg"];
    var L = [];
    L.push("---- MAPA ----");
    sels.forEach(function (sel) {
      var els = document.querySelectorAll(sel);
      L.push("  " + sel + "  (encontrados: " + els.length + ")");
      els.forEach(function (e) {
        var r = e.getBoundingClientRect();
        L.push("    " + desc(e) + "  rect w=" + rnd(r.width) + " left=" + rnd(r.left) + " right=" + rnd(r.right));
        L.push("      position=" + cs(e, "position") + " display=" + cs(e, "display") +
          "  overflow=" + cs(e, "overflow") + " overflow-x=" + cs(e, "overflowX") + " overflow-y=" + cs(e, "overflowY"));
        L.push("      transform=" + cs(e, "transform") + "  filter=" + cs(e, "filter") + "  perspective=" + cs(e, "perspective") +
          "  contain=" + cs(e, "contain") + "  will-change=" + cs(e, "willChange") + "  z-index=" + cs(e, "zIndex"));
      });
    });
    return L.join("\n");
  }

  function ancestrosContainingBlock() {
    var L = [];
    L.push("---- ANCESTROS DEL MODAL PRINCIPAL ----");
    var top = detectModales()[0];
    if (!top) { L.push("  (no hay modal visible)"); return L.join("\n"); }
    var el = top.el;
    var n = el;
    while (n && n !== document.documentElement) {
      var t = cs(n, "transform"), f = cs(n, "filter"), p = cs(n, "perspective"), c = cs(n, "contain"), w = cs(n, "willChange"), o = cs(n, "overflow");
      var flag = "";
      if ((t && t !== "none") || (f && f !== "none") || (p && p !== "none") || (c && c !== "none") || (w && w !== "auto") || (o !== "visible" && o !== "")) {
        flag = "  <<< CREA CONTEXT (containing block / overflow)";
      }
      L.push("  " + desc(n) + "  pos=" + cs(n, "position") + "  transform=" + t + "  filter=" + f + "  perspective=" + p + "  contain=" + c + "  will-change=" + w + "  overflow=" + o + flag);
      n = n.parentElement;
    }
    return L.join("\n");
  }

  function scanOverflow(limit) {
    var vw = window.innerWidth;
    var list = [];
    var all = document.querySelectorAll("body *");
    for (var i = 0; i < all.length; i++) {
      var e = all[i];
      var t = (e.tagName || "").toLowerCase();
      if (t === "script" || t === "style" || t === "link" || t === "meta" || t === "noscript") continue;
      if (!isVisible(e)) continue;
      var r = e.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      var exceso = Math.max(r.right - vw, r.width - vw, -r.left);
      if (exceso <= 1) continue;
      list.push({ el: e, r: r, exceso: exceso });
    }
    list.sort(function (a, b) { return b.exceso - a.exceso; });
    return list.slice(0, limit || 20);
  }

  function buildGeneral() {
    var L = [];
    L.push("========================================");
    L.push("DIAGNÓSTICO ANDROID v2 — ESTADO ACTUAL");
    L.push("========================================");
    L.push("UserAgent: " + navigator.userAgent);
    L.push("");
    L.push("---- VIEWPORT (layout vs visual) ----");
    L = L.concat(fullViewport());
    L.push("");
    var global = (document.documentElement.scrollWidth > window.innerWidth + 1 || document.body.scrollWidth > window.innerWidth + 1);
    L.push("OVERFLOW GLOBAL (scrollWidth > innerWidth): " + (global ? "SÍ" : "NO"));
    L.push("LAYOUT vs VISUAL: innerWidth=" + window.innerWidth + "  visualViewport.width=" + (window.visualViewport ? window.visualViewport.width : "?"));
    L.push("");
    L.push("---- MODALES DETECTADOS (fixed/absolute visibles) ----");
    var mods = detectModales();
    if (!mods.length) L.push("  (ninguno)");
    else mods.forEach(function (o) { L.push(modalDetail(o)); });
    L.push("");
    L.push("---- MAPA ----");
    L.push(investigarMapa());
    L.push("");
    L.push("---- ANCESTROS ----");
    L.push(ancestrosContainingBlock());
    L.push("");
    L.push("---- OVERFLOW (top 15) ----");
    var off = scanOverflow(15);
    if (!off.length) L.push("  (ninguno)");
    else off.forEach(function (o, i) {
      L.push("  [" + (i + 1) + "] " + desc(o.el) + "  w=" + rnd(o.r.width) + " left=" + rnd(o.r.left) + " right=" + rnd(o.r.right) + " exceso=" + rnd(o.exceso));
    });
    return L.join("\n");
  }

  function buildViewports() {
    var L = [];
    L.push("===== COMPARATIVA VIEWPORT (guarda esto en los 3 estados) =====");
    L = L.concat(fullViewport());
    L.push("");
    L.push("Diferencias clave a observar entre estados: innerWidth vs visualViewport.width vs clientWidth");
    return L.join("\n");
  }

  function monitorear() {
    var dur = 5000, step = 100;
    var muestras = 0;
    var series = { iw: [], dcw: [], vvw: [], vvh: [], vvL: [], vvT: [], vvScale: [], mw: [], ml: [], mr: [] };
    var resizeCount = 0, vvResize = 0, vvScroll = 0;
    var top = detectModales()[0];
    var target = top ? top.el : null;

    function sample() {
      var vv = window.visualViewport || {};
      series.iw.push(window.innerWidth);
      series.dcw.push(document.documentElement.clientWidth);
      series.vvw.push(vv.width);
      series.vvh.push(vv.height);
      series.vvL.push(vv.offsetLeft);
      series.vvT.push(vv.offsetTop);
      series.vvScale.push(vv.scale);
      if (target) {
        var r = target.getBoundingClientRect();
        series.mw.push(r.width);
        series.ml.push(r.left);
        series.mr.push(r.right);
      }
      muestras++;
    }

    function onResize() { resizeCount++; }
    function onVvResize() { vvResize++; }
    function onVvScroll() { vvScroll++; }
    window.addEventListener("resize", onResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", onVvResize);
      window.visualViewport.addEventListener("scroll", onVvScroll);
    }

    function stats(arr) {
      var nums = arr.filter(function (x) { return x != null; });
      if (!nums.length) return "min=- max=-";
      var min = Math.min.apply(null, nums), max = Math.max.apply(null, nums);
      var changes = 0;
      for (var i = 1; i < arr.length; i++) if (arr[i] !== arr[i - 1]) changes++;
      return "min=" + rnd(min) + " max=" + rnd(max) + " cambios=" + changes;
    }

    var t0 = Date.now();
    sample();
    var timer = setInterval(function () {
      sample();
      if (Date.now() - t0 >= dur) {
        clearInterval(timer);
        window.removeEventListener("resize", onResize);
        if (window.visualViewport) {
          window.visualViewport.removeEventListener("resize", onVvResize);
          window.visualViewport.removeEventListener("scroll", onVvScroll);
        }
        var L = [];
        L.push("===== MONITOREO 5s =====");
        L.push("objetivo: " + (target ? desc(target) : "(ninguno)"));
        L.push("muestras=" + muestras);
        L.push("innerWidth: " + stats(series.iw));
        L.push("documentElement.clientWidth: " + stats(series.dcw));
        L.push("visualViewport.width: " + stats(series.vvw));
        L.push("visualViewport.height: " + stats(series.vvh));
        L.push("visualViewport.offsetLeft: " + stats(series.vvL));
        L.push("visualViewport.offsetTop: " + stats(series.vvT));
        L.push("visualViewport.scale: " + stats(series.vvScale));
        if (target) {
          L.push("modal width: " + stats(series.mw));
          L.push("modal left: " + stats(series.ml));
          L.push("modal right: " + stats(series.mr));
        }
        L.push("resize events: " + resizeCount + "  |  vv resize: " + vvResize + "  |  vv scroll: " + vvScroll);
        L.push("");
        mostrar(ultimo + "\n" + L.join("\n"));
      }
    }, step);
    mostrar("Monitoreando 5s...");
  }

  var ultimo = "";

  function mostrar(txt) {
    ultimo = txt;
    var pre = $("#diag-out");
    if (pre) pre.textContent = txt;
  }

  function copiar() {
    var txt = ultimo || "Sin diagnóstico. Pulsa 'Medir ahora'.";
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = txt; ta.style.position = "fixed"; ta.style.left = "-9999px";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); alert("Copiado (fallback)."); }
      catch (e) { alert("No se pudo copiar. Selecciona el texto del panel manualmente."); }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(function () { alert("Diagnóstico copiado."); }, fallback);
    } else fallback();
  }

  var pruebaStyle = null;

  function medirCore() {
    var vv = window.visualViewport || {};
    return [
      "innerWidth=" + window.innerWidth,
      "documentElement.clientWidth=" + document.documentElement.clientWidth,
      "body.clientWidth=" + document.body.clientWidth,
      "documentElement.scrollWidth=" + document.documentElement.scrollWidth,
      "body.scrollWidth=" + document.body.scrollWidth,
      "visualViewport.width=" + vv.width + "  height=" + vv.height + "  scale=" + vv.scale,
      "devicePixelRatio=" + window.devicePixelRatio,
      "screen.width=" + screen.width + "  screen.height=" + screen.height
    ];
  }

  function pruebaMapa() {
    var L = [];
    L.push("===== PRUEBA CAUSAL: MAPA =====");
    L.push("-- ANTES --");
    L = L.concat(medirCore());
    if (!pruebaStyle) {
      pruebaStyle = document.createElement("style");
      pruebaStyle.id = "mg-prueba-mapa";
      pruebaStyle.textContent = "#mapaSvgWrap{overflow:hidden!important} #mapaViewport{overflow:hidden!important}";
      document.head.appendChild(pruebaStyle);
    }
    setTimeout(function () {
      L.push("");
      L.push("-- CON overflow:hidden temporal --");
      L = L.concat(medirCore());
      var m = document.querySelector(".modal-ficha") || document.querySelector(".modal-overlay-ficha");
      if (m) { var r = m.getBoundingClientRect(); L.push("modal: width=" + rnd(r.width) + " left=" + rnd(r.left) + " right=" + rnd(r.right)); }
      L.push("");
      L.push("Conclusión: si innerWidth BAJÓ hacia ~411 → MAPA CONFIRMADO. Si NO cambió → MAPA DESCARTADO (el innerWidth inflado viene de otra parte).");
      L.push("Usa 'Quitar prueba MAPA' para revertir.");
      mostrar(L.join("\n"));
    }, 300);
  }

  function quitarPruebaMapa() {
    if (pruebaStyle) { pruebaStyle.remove(); pruebaStyle = null; }
    var L = ["-- DESPUÉS de quitar la prueba --"].concat(medirCore());
    mostrar(L.join("\n"));
  }

  function buildUI() {
    var btn = document.createElement("button");
    btn.textContent = "🔍 Diagnóstico Android";
    btn.setAttribute("style", "position:fixed;left:12px;bottom:12px;z-index:2147483000;background:#111;color:#7CFC9A;border:1px solid #333;border-radius:999px;padding:10px 14px;font:600 13px sans-serif;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.35)");
    btn.onclick = function () { panel.style.display = "flex"; };
    document.body.appendChild(btn);

    var panel = document.createElement("div");
    panel.setAttribute("style", "position:fixed;inset:0;z-index:2147483100;background:rgba(0,0,0,.55);display:none;align-items:center;justify-content:center;padding:12px");
    panel.innerHTML =
      '<div style="background:#0b0b0f;color:#e8e8e8;border-radius:14px;width:min(600px,100%);max-height:92vh;display:flex;flex-direction:column;overflow:hidden;font:13px/1.45 sans-serif">' +
      '  <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid #222">' +
      '    <b style="color:#7CFC9A">Diagnóstico Android v2 (temporal)</b>' +
      '    <button data-act="cerrar" style="background:#333;color:#fff;border:none;border-radius:8px;padding:6px 12px;cursor:pointer">Cerrar</button>' +
      '  </div>' +
      '  <div style="display:flex;flex-wrap:wrap;gap:6px;padding:10px 16px;border-bottom:1px solid #222">' +
      '    <button data-act="general" style="background:#6B1E3D;color:#fff;border:none;border-radius:8px;padding:8px 12px;cursor:pointer">Medir ahora</button>' +
      '    <button data-act="viewports" style="background:#333;color:#fff;border:none;border-radius:8px;padding:8px 12px;cursor:pointer">Viewport completo</button>' +
      '    <button data-act="monitor" style="background:#333;color:#fff;border:none;border-radius:8px;padding:8px 12px;cursor:pointer">Monitorear 5s</button>' +
      '    <button data-act="prueba" style="background:#333;color:#fff;border:none;border-radius:8px;padding:8px 12px;cursor:pointer">Prueba MAPA (overflow)</button>' +
      '    <button data-act="quitar" style="background:#333;color:#fff;border:none;border-radius:8px;padding:8px 12px;cursor:pointer">Quitar prueba MAPA</button>' +
      '    <button data-act="copiar" style="background:#C9A227;color:#111;border:none;border-radius:8px;padding:8px 12px;cursor:pointer;font-weight:600">Copiar diagnóstico</button>' +
      '  </div>' +
      '  <pre id="diag-out" style="margin:0;padding:14px 16px;overflow:auto;white-space:pre-wrap;word-break:break-word;flex:1;color:#7CFC9A;background:#0b0b0f;min-height:40vh">Pulsa "Medir ahora".\n\nConsejo: ejecuta "Medir ahora" en 3 momentos: página normal, ficha abierta y CATÁLOGO abierto, y copia los 3 resultados.</pre>' +
      '</div>';

    panel.addEventListener("click", function (e) {
      var b = e.target.closest("[data-act]");
      if (!b) return;
      var act = b.getAttribute("data-act");
      if (act === "cerrar") panel.style.display = "none";
      else if (act === "general") mostrar(buildGeneral());
      else if (act === "viewports") mostrar(buildViewports());
      else if (act === "monitor") monitorear();
      else if (act === "prueba") pruebaMapa();
      else if (act === "quitar") quitarPruebaMapa();
      else if (act === "copiar") copiar();
    });
    document.body.appendChild(panel);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", buildUI);
  else buildUI();
})();
