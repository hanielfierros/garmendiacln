/**
 * Generador de logotipos vectoriales "Alebrije Mexicano" — Mercado Garmendia
 * window.generarLogoMexicanoSVG(idLocal, giro) -> string SVG (viewBox 0 0 100 100)
 * Determinista: el Local N produce SIEMPRE el mismo logo en cliente y PWA.
 */
window.generarLogoMexicanoSVG = (function () {
  "use strict";
  var PAL = ["#E4007C", "#006847", "#1F6FA8", "#FF8C00", "#FFD100", "#CE1126", "#6B1E3D", "#00A79D", "#8E44AD", "#E67E22"];

  function hash(s) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  }
  function mulberry(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function motifOf(giro) {
    var g = String(giro || "").toLowerCase();
    if (/carn|carne|cecina|chorizo|barbacoa|embutid|pollo|aves|marinad|molida/.test(g)) return "meat";
    if (/pan|repost|pastel|flanes|pays|tortill|masa|totopo|tostada|bolillo|telera/.test(g)) return "wheat";
    if (/pescad|marisc|camar|ostion|ceviche|pescado|bahia|mar/.test(g)) return "fish";
    if (/fruta|verdura|tropical|cosecha|huerto|mango|sandia|jugo|licuado|vitamina|frescas/.test(g)) return "fruit";
    if (/lacteo|queso|leche|crema|requeson|yogurt/.test(g)) return "cheese";
    if (/artesan|joyer|bisuter|ceramic|vasija|plata|recuerdo|souvenir|manualidad|tejido/.test(g)) return "vessel";
    if (/flor|rama|corona|arreglo|primavera|rosas/.test(g)) return "flower";
    if (/cafe|atole|bebida|refresco|agua|chela|embotellad/.test(g)) return "cup";
    if (/dulce|golosina|chocolate|candy|botana|snack|golos/.test(g)) return "candy";
    if (/ropa|textil|calzado|zapato|sandalia|huarache|tela|confeccion|mercer|bordad|uniforme|vestir|moda/.test(g)) return "textile";
    if (/abarrote|grano|semilla|despensa|miscelanea|aceite|enlatado|especia|condimento|chile|mole|salsa|limpieza|ferreter/.test(g)) return "grain";
    return "sun";
  }

  var ICONS = {
    meat: '<path d="M36 41h28a7 7 0 0 1 0 15H36a7 7 0 0 1 0-15z"/><path d="M50 41v15"/>',
    wheat: '<path d="M50 64V38"/><path d="M50 43l-7 4 7 5 7-5z"/><path d="M50 52l-7 4 7 5 7-5z"/>',
    fish: '<path d="M32 50q11-9 22 0-11 9-22 0z"/><path d="M54 50l7-5v10z"/><circle cx="40" cy="47" r="1.6"/>',
    fruit: '<circle cx="50" cy="53" r="9"/><path d="M50 44q-1-6-7-6 5 1 5 5z"/>',
    cheese: '<path d="M39 42h18v9q-9 3-18-9z"/><circle cx="47" cy="46" r="1.4"/><circle cx="51" cy="44" r="1.4"/>',
    vessel: '<path d="M43 40h14M45 40v3a5 5 0 0 0 10 0v-3"/><path d="M42 48a8 8 0 0 0 16 0"/>',
    flower: '<circle cx="50" cy="45" r="3.4"/><circle cx="50" cy="55" r="3.4"/><circle cx="45" cy="50" r="3.4"/><circle cx="55" cy="50" r="3.4"/><circle cx="50" cy="50" r="2.4"/>',
    cup: '<path d="M43 43h10v7a5 5 0 0 1-10 0z"/><path d="M53 45h3q2 2 0 4h-3"/>',
    candy: '<ellipse cx="50" cy="50" rx="9" ry="4.5"/><path d="M41 50l-4-4M59 50l4 4"/>',
    textile: '<path d="M40 44l10-9 10 9M40 44v11M60 44v11M40 55h20"/>',
    grain: '<path d="M50 39v22M50 39q-5 1-5 6M50 39q5 1 5 6M50 49q-5 1-5 6M50 49q5 1 5 6M50 59q-5 1-5 6M50 59q5 1 5 6"/>',
    sun: '<path d="M50 38v-6M50 62v6M38 50h-6M62 50h6M41 41l-4-4M59 41l4-4M41 59l-4 4M59 59l4 4"/><circle cx="50" cy="50" r="6"/>'
  };

  function petals(n, cx, cy, r, rx, ry, fill, off, op) {
    var s = "";
    for (var i = 0; i < n; i++) {
      var a = off + i * 360 / n;
      s += '<ellipse transform="rotate(' + a.toFixed(2) + ' ' + cx + ' ' + cy + ')" cx="' + cx + '" cy="' + (cy - r) + '" rx="' + rx + '" ry="' + ry + '" fill="' + fill + '" opacity="' + (op || 1) + '"/>';
    }
    return s;
  }
  function diamonds(n, color) {
    var s = "";
    for (var i = 0; i < n; i++) {
      var a = i * 360 / n;
      s += '<g transform="rotate(' + a.toFixed(2) + ' 50 50)"><rect x="47.5" y="4.5" width="5" height="5" transform="rotate(45 50 7)" fill="' + color + '"/></g>';
    }
    return s;
  }

  return function (idLocal, giro) {
    var id = Number(idLocal) || 1;
    var rnd = mulberry((id * 2654435761 + hash(String(giro || ""))) >>> 0);
    function pick(avoid) { var c; do { c = PAL[(rnd() * PAL.length) | 0]; } while (avoid && avoid.indexOf(c) >= 0); return c; }
    var c1 = pick(), c2 = pick([c1]), c3 = pick([c1, c2]), c4 = pick([c1, c2, c3]);
    var p1 = [6, 8, 10, 12][(rnd() * 4) | 0];
    var p2 = [6, 8, 10][(rnd() * 3) | 0];
    var off = (rnd() * 360) | 0;
    var dn = [10, 12, 16, 20][(rnd() * 4) | 0];
    var innerR = 19 + ((rnd() * 3) | 0);

    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">';
    s += '<rect width="100" height="100" fill="#FFFFFF"/>';
    s += diamonds(dn, c1);
    s += petals(p1, 50, 50, 33, 8, 13, c2, off, 0.92);
    s += petals(p2, 50, 50, 33, 5, 10, c1, off + 180 / p2, 0.85);
    s += '<circle cx="50" cy="50" r="' + innerR + '" fill="' + c4 + '"/>';
    s += '<g fill="none" stroke="#4A1429" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[motifOf(giro)] || ICONS.sun) + '</g>';
    s += '</svg>';
    return s;
  };
})();
