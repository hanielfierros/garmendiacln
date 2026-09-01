/* ============================================================
   DIAGNÓSTICO ANDROID — herramienta TEMPORAL
   CÓMO ELIMINARLA: borrar este archivo y quitar la línea
   <script src="diagnostico-android.js"></script> en index.html
   NO forma parte de la app en producción.
   ============================================================ */
(function () {
  "use strict";

  function $(s) { return document.querySelector(s); }
  function cs(e, p) { try { return getComputedStyle(e)[p]; } catch (_) { return "?"; } }

  function desc(e) {
    if (!e) return "";
    var id = e.id ? "#" + e.id : "";
    var cls = "";
    try { cls = (e.className && typeof e.className === "string") ? "." + e.className.trim().split(/\s+/).join(".") : ""; } catch (_) {}
    return (e.tagName || "").toLowerCase() + (id || cls);
  }

  function rnd(n) { return Math.round(n * 10) / 10; }

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

  function rectBlock(sel) {
    var el = $(sel);
    if (!el) return "  [" + sel + "] NO PRESENTE\n";
    var r = el.getBoundingClientRect();
    return "  " + sel + "\n" +
      "    width=" + rnd(r.width) + " height=" + rnd(r.height) +
      " left=" + rnd(r.left) + " right=" + rnd(r.right) +
      " top=" + rnd(r.top) + " bottom=" + rnd(r.bottom) + "\n";
  }

  function computedBlock(el) {
    var p = ["width","maxWidth","minWidth","height","maxHeight","paddingLeft","paddingRight","marginLeft","marginRight","boxSizing","position","display","flex","flexShrink","flexGrow","gridTemplateColumns","transform","overflow","overflowX","whiteSpace","wordBreak"];
    return p.map(function (k) { return k + "=" + cs(el, k); }).join("  |  ");
  }

  function viewportData() {
    var vv = window.visualViewport || {};
    return {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      docClientW: document.documentElement.clientWidth,
      docClientH: document.documentElement.clientHeight,
      bodyClientW: document.body.clientWidth,
      bodyClientH: document.body.clientHeight,
      docScrollW: document.documentElement.scrollWidth,
      docScrollH: document.documentElement.scrollHeight,
      bodyScrollW: document.body.scrollWidth,
      bodyScrollH: document.body.scrollHeight,
      vvWidth: vv.width != null ? vv.width : null,
      vvHeight: vv.height != null ? vv.height : null,
      vvOffsetLeft: vv.offsetLeft != null ? vv.offsetLeft : null,
      vvOffsetTop: vv.offsetTop != null ? vv.offsetTop : null,
      vvScale: vv.scale != null ? vv.scale : null
    };
  }

  function scanOverflow(limit) {
    var vw = window.innerWidth;
    var list = [];
    var all = document.querySelectorAll("body *");
    for (var i = 0; i < all.length; i++) {
      var e = all[i];
      var t = (e.tagName || "").toLowerCase();
      if (t === "script" || t === "style" || t === "link" || t === "meta" || t === "noscript") continue;
      var r = e.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      var exceso = Math.max(r.right - vw, r.width - vw, -r.left);
      if (exceso <= 1) continue;
      list.push({ el: e, r: r, exceso: exceso });
    }
    list.sort(function (a, b) { return b.exceso - a.exceso; });
    return list.slice(0, limit || 20);
  }

  function headerReport() {
    var v = viewportData();
    var L = [];
    L.push("========================================");
    L.push("DIAGNÓSTICO OVERFLOW ANDROID");
    L.push("========================================");
    L.push("");
    L.push("DISPOSITIVO / NAVEGADOR");
    L.push("  UserAgent: " + navigator.userAgent);
    L.push("");
    L.push("----------------------------------------");
    L.push("VIEWPORT");
    L.push("----------------------------------------");
    L.push("  innerWidth=" + v.innerWidth + "  innerHeight=" + v.innerHeight);
    L.push("  documentElement.clientWidth=" + v.docClientW + "  clientHeight=" + v.docClientH);
    L.push("  body.clientWidth=" + v.bodyClientW + "  clientHeight=" + v.bodyClientH);
    L.push("  visualViewport.width=" + v.vvWidth + "  height=" + v.vvHeight + "  offsetLeft=" + v.vvOffsetLeft + "  offsetTop=" + v.vvOffsetTop + "  scale=" + v.vvScale);
    L.push("");
    L.push("----------------------------------------");
    L.push("DOCUMENTO");
    L.push("----------------------------------------");
    L.push("  documentElement.scrollWidth=" + v.docScrollW + "  scrollHeight=" + v.docScrollH);
    L.push("  body.scrollWidth=" + v.bodyScrollW + "  scrollHeight=" + v.bodyScrollH);
    var global = (v.docScrollW > v.innerWidth + 1 || v.bodyScrollW > v.innerWidth + 1);
    L.push("  OVERFLOW GLOBAL: " + (global ? "SÍ" : "NO"));
    L.push("");
    return { L: L, v: v, global: global };
  }

  function fichaBlock() {
    var L = [];
    L.push("----------------------------------------");
    L.push("FICHA");
    L.push("----------------------------------------");
    L.push("  .modal-overlay-ficha PRESENTE=" + !!$(".modal-overlay-ficha"));
    L.push(rectBlock(".modal-overlay-ficha"));
    L.push(rectBlock(".modal-ficha"));
    return L;
  }

  function catalogoBlock() {
    var L = [];
    L.push("----------------------------------------");
    L.push("CATÁLOGO");
    L.push("----------------------------------------");
    L.push("  .cat-overlay PRESENTE=" + !!$(".cat-overlay"));
    L.push(rectBlock(".cat-overlay"));
    L.push(rectBlock(".cat-panel"));
    return L;
  }

  function offendersBlock(v) {
    var L = [];
    L.push("----------------------------------------");
    L.push("ELEMENTOS PROBLEMÁTICOS (top 20)");
    L.push("----------------------------------------");
    var list = scanOverflow(20);
    if (!list.length) { L.push("  (ninguno)"); return L; }
    list.forEach(function (o, i) {
      L.push((i + 1) + ". " + desc(o.el));
      L.push("   TAG=" + (o.el.tagName || "").toLowerCase() + "  ID=" + (o.el.id || "-") + "  CLASS=" + ((typeof o.el.className === "string") ? o.el.className : "-"));
      L.push("   width=" + rnd(o.r.width) + " left=" + rnd(o.r.left) + " right=" + rnd(o.r.right) + "  exceso=" + rnd(o.exceso));
      L.push("   Ruta DOM: " + rutaDOM(o.el));
    });
    L.push("");
    L.push("CSS COMPUTADO (top 5)");
    list.slice(0, 5).forEach(function (o, i) {
      L.push("  [" + (i + 1) + "] " + desc(o.el));
      L.push("     " + computedBlock(o.el));
    });
    return L;
  }

  function conclusion(v, list) {
    var L = [];
    L.push("----------------------------------------");
    L.push("CONCLUSIÓN");
    L.push("----------------------------------------");
    var caso = "";
    var conf = "";
    if (v.docScrollW > v.innerWidth + 1 || v.bodyScrollW > v.innerWidth + 1) {
      caso = "A (DOCUMENTO más ancho que el viewport)";
      conf = "ALTO";
    } else if (list.length) {
      var top = list[0].el;
      caso = "C (HIJO interno excede) / B (modal excede)";
      var st = { transform: cs(top, "transform"), flexShrink: cs(top, "flexShrink"), minWidth: cs(top, "minWidth"), display: cs(top, "display"), position: cs(top, "position") };
      if (st.transform && st.transform !== "none") caso = "D (TRANSFORM)";
      else if (st.flexShrink === "0") caso = "E (FLEXBOX: flex-shrink 0)";
      else if (st.minWidth && st.minWidth !== "0px" && st.minWidth !== "auto") caso = "B/C + min-width fijo";
      else caso = "C (HIJO DEL MODAL, contenido/estructura)";
      conf = "MEDIO";
    } else {
      caso = "CAUSA NO DETERMINADA (sin overflow medido en este instante)";
      conf = "BAJO";
    }
    L.push("  CASO: " + caso);
    L.push("  ELEMENTO MÁS PROBABLE: " + (list.length ? desc(list[0].el) : "-"));
    L.push("  CAUSA CSS/DOM MÁS PROBABLE: ver 'ELEMENTOS PROBLEMÁTICOS' y 'CSS COMPUTADO' arriba");
    L.push("  NIVEL DE CONFIANZA: " + conf);
    L.push("");
    return L;
  }

  function buildGeneral() {
    var h = headerReport();
    var list = scanOverflow(20);
    var L = h.L;
    L = L.concat(fichaBlock(), catalogoBlock(), offendersBlock(h.v), conclusion(h.v, list));
    return L.join("\n");
  }

  function buildFicha() {
    var v = viewportData();
    var L = [];
    L.push("===== MEDICIÓN FICHA =====");
    L.push("viewport.innerWidth=" + v.innerWidth + "  scrollWidth=" + v.docScrollW);
    L.push("");
    L.push(rectBlock(".modal-overlay-ficha"));
    L.push(rectBlock(".modal-ficha"));
    L.push("");
    var modal = $(".modal-ficha");
    if (modal) {
      var r = modal.getBoundingClientRect();
      L.push("Hijos de .modal-ficha que exceden el contenedor (" + rnd(r.width) + "px):");
      var found = false;
      modal.querySelectorAll("*").forEach(function (k) {
        var kr = k.getBoundingClientRect();
        if (kr.width > r.width + 1 || kr.right > r.right + 1 || kr.left < r.left - 1) {
          found = true;
          L.push("  └ " + desc(k) + "  w=" + rnd(kr.width) + " left=" + rnd(kr.left) + " right=" + rnd(kr.right));
          L.push("      " + computedBlock(k));
        }
      });
      if (!found) L.push("  (ningún hijo excede)");
      L.push("");
      L.push("CSS .modal-overlay-ficha: " + computedBlock($(".modal-overlay-ficha")));
      L.push("CSS .modal-ficha: " + computedBlock(modal));
    }
    return L.join("\n");
  }

  function buildCatalogo() {
    var v = viewportData();
    var L = [];
    L.push("===== MEDICIÓN CATÁLOGO =====");
    L.push("viewport.innerWidth=" + v.innerWidth + "  scrollWidth=" + v.docScrollW);
    L.push("");
    L.push(rectBlock(".cat-overlay"));
    L.push(rectBlock(".cat-panel"));
    L.push("");
    var panel = $(".cat-panel");
    if (panel) {
      var r = panel.getBoundingClientRect();
      L.push("Hijos de .cat-panel que exceden el contenedor (" + rnd(r.width) + "px):");
      var found = false;
      panel.querySelectorAll("*").forEach(function (k) {
        var kr = k.getBoundingClientRect();
        if (kr.width > r.width + 1 || kr.right > r.right + 1 || kr.left < r.left - 1) {
          found = true;
          L.push("  └ " + desc(k) + "  w=" + rnd(kr.width) + " left=" + rnd(kr.left) + " right=" + rnd(kr.right));
          L.push("      " + computedBlock(k));
        }
      });
      if (!found) L.push("  (ningún hijo excede)");
      L.push("");
      L.push("CSS .cat-overlay: " + computedBlock($(".cat-overlay")));
      L.push("CSS .cat-panel: " + computedBlock(panel));
    }
    return L.join("\n");
  }

  function stats(arr) {
    var nums = arr.filter(function (x) { return x != null; });
    if (!nums.length) return "min=- max=- avg=-";
    var min = Math.min.apply(null, nums), max = Math.max.apply(null, nums);
    var sum = nums.reduce(function (a, b) { return a + b; }, 0);
    var changes = 0;
    for (var i = 1; i < arr.length; i++) { if (arr[i] !== arr[i - 1]) changes++; }
    return "min=" + rnd(min) + " max=" + rnd(max) + " avg=" + rnd(sum / nums.length) + " cambios=" + changes;
  }

  function monitorear() {
    var dur = 5000, step = 100;
    var vw = [], mw = [], ml = [], mr = [];
    var resizeCount = 0, vvResize = 0, vvScroll = 0;
    var isCat = !!$(".cat-overlay");
    var isFicha = !!$(".modal-overlay-ficha");
    var target = isCat ? ".cat-panel" : (isFicha ? ".modal-ficha" : null);
    var muestras = 0;

    function sample() {
      vw.push(window.innerWidth);
      if (target) {
        var el = $(target);
        var r = el ? el.getBoundingClientRect() : null;
        mw.push(r ? r.width : null);
        ml.push(r ? r.left : null);
        mr.push(r ? r.right : null);
      }
      muestras++;
    }

    var onResize = function () { resizeCount++; };
    var onVvResize = function () { vvResize++; };
    var onVvScroll = function () { vvScroll++; };
    window.addEventListener("resize", onResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", onVvResize);
      window.visualViewport.addEventListener("scroll", onVvScroll);
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
        L.push("----------------------------------------");
        L.push("MONITOREO (5 segundos)");
        L.push("----------------------------------------");
        L.push("  objetivo: " + (target || "(ningún modal abierto)") + "  |  ficha=" + isFicha + "  catálogo=" + isCat);
        L.push("  muestras=" + muestras);
        L.push("  viewport width: " + stats(vw));
        if (target) {
          L.push("  modal width: " + stats(mw));
          L.push("  modal left: " + stats(ml));
          L.push("  modal right: " + stats(mr));
        }
        L.push("  resize events: " + resizeCount);
        L.push("  visualViewport resize events: " + vvResize);
        L.push("  visualViewport scroll events: " + vvScroll);
        L.push("");
        mostrar(ultimo + "\n" + L.join("\n"));
      }
    }, step);
    mostrar("Monitoreando 5 s... (espera)");
  }

  var ultimo = "";

  function mostrar(txt) {
    ultimo = txt;
    var pre = $("#diag-out");
    if (pre) pre.textContent = txt;
  }

  function copiar() {
    var txt = ultimo || "Sin diagnóstico todavía. Pulsa 'Medir ahora'.";
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = txt;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); alert("Diagnóstico copiado (fallback)."); }
      catch (e) { alert("No se pudo copiar automáticamente. Selecciona el texto del panel manualmente."); }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(function () { alert("Diagnóstico copiado."); }, fallback);
    } else {
      fallback();
    }
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
      '<div style="background:#0b0b0f;color:#e8e8e8;border-radius:14px;width:min(560px,100%);max-height:92vh;display:flex;flex-direction:column;overflow:hidden;font:13px/1.45 sans-serif">' +
      '  <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid #222">' +
      '    <b style="color:#7CFC9A">Diagnóstico Android (temporal)</b>' +
      '    <button data-act="cerrar" style="background:#333;color:#fff;border:none;border-radius:8px;padding:6px 12px;cursor:pointer">Cerrar</button>' +
      '  </div>' +
      '  <div style="display:flex;flex-wrap:wrap;gap:6px;padding:10px 16px;border-bottom:1px solid #222">' +
      '    <button data-act="general" style="background:#6B1E3D;color:#fff;border:none;border-radius:8px;padding:8px 12px;cursor:pointer">Medir ahora</button>' +
      '    <button data-act="ficha" style="background:#333;color:#fff;border:none;border-radius:8px;padding:8px 12px;cursor:pointer">Medir FICHA</button>' +
      '    <button data-act="catalogo" style="background:#333;color:#fff;border:none;border-radius:8px;padding:8px 12px;cursor:pointer">Medir CATÁLOGO</button>' +
      '    <button data-act="monitor" style="background:#333;color:#fff;border:none;border-radius:8px;padding:8px 12px;cursor:pointer">Monitorear 5s</button>' +
      '    <button data-act="copiar" style="background:#C9A227;color:#111;border:none;border-radius:8px;padding:8px 12px;cursor:pointer;font-weight:600">Copiar diagnóstico</button>' +
      '  </div>' +
      '  <pre id="diag-out" style="margin:0;padding:14px 16px;overflow:auto;white-space:pre-wrap;word-break:break-word;flex:1;color:#7CFC9A;background:#0b0b0f;min-height:40vh">Pulsa "Medir ahora" para generar el diagnóstico.</pre>' +
      '</div>';

    panel.addEventListener("click", function (e) {
      var b = e.target.closest("[data-act]");
      if (!b) return;
      var act = b.getAttribute("data-act");
      if (act === "cerrar") { panel.style.display = "none"; }
      else if (act === "general") { mostrar(buildGeneral()); }
      else if (act === "ficha") { mostrar(buildFicha()); }
      else if (act === "catalogo") { mostrar(buildCatalogo()); }
      else if (act === "monitor") { monitorear(); }
      else if (act === "copiar") { copiar(); }
    });
    document.body.appendChild(panel);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildUI);
  } else {
    buildUI();
  }
})();
