(function () {
  "use strict";

  var DATA = window.BIBLIOTECA || { docs: [], bloques: {} };
  var DOCS = DATA.docs;
  var PAGE = 60;

  // Palabras en español -> raíces en inglés que aparecen en los títulos
  var SINONIMOS = {
    nube: ["cloud"], contrasena: ["password", "authenticator"], contrasenas: ["password", "authenticator"],
    clave: ["key", "password"], claves: ["key", "password"], llave: ["key"], llaves: ["key"],
    criptografia: ["crypt", "cipher"], cifrado: ["encrypt", "cipher", "crypt"], cifrar: ["encrypt"],
    incidente: ["incident"], incidentes: ["incident"], riesgo: ["risk"], riesgos: ["risk"],
    privacidad: ["privacy"], personales: ["pii", "personally identifiable", "privacy"],
    identidad: ["identity", "identit"], autenticacion: ["authenticat"], acceso: ["access"],
    red: ["network"], redes: ["network"], inalambrica: ["wireless", "wlan", "802.11"], wifi: ["wireless", "802.11"],
    movil: ["mobile"], moviles: ["mobile"], celular: ["mobile", "cell phone"], celulares: ["mobile", "cell phone"],
    suministro: ["supply chain"], proveedores: ["supply chain", "supplier"], proveedor: ["supply chain", "supplier"],
    forense: ["forensic"], forenses: ["forensic"], evidencia: ["evidence", "forensic"], prueba: ["evidence", "test"],
    ia: ["artificial intelligence", "ai rmf", "machine learning"], inteligencia: ["intelligence"], artificial: ["artificial"],
    continuidad: ["continuity", "contingency"], contingencia: ["contingency"], controles: ["control"],
    auditoria: ["audit", "assess"], evaluacion: ["assess", "evaluat"], vulnerabilidad: ["vulnerab"],
    vulnerabilidades: ["vulnerab"], parche: ["patch"], parches: ["patch"], correo: ["mail"],
    servidor: ["server"], servidores: ["server"], contenedores: ["container"], virtualizacion: ["virtual"],
    salud: ["health", "hipaa"], industrial: ["industrial", "operational technology", "ics"], scada: ["scada", "industrial"],
    firma: ["signature"], registros: ["log"], bitacoras: ["log"], seguridad: ["security"],
    capacitacion: ["training", "awareness", "learning"], formacion: ["training", "awareness", "learning"],
    teletrabajo: ["telework", "remote"], remoto: ["remote", "telework"], laboral: ["workforce"],
    metricas: ["measur", "metric"], medicion: ["measur", "metric"], borrado: ["sanitiz"], sanitizacion: ["sanitiz"],
    politicas: ["polic"], gobierno: ["governance", "govern"], ciberseguridad: ["cybersecurity"],
    marco: ["framework"], cuantica: ["quantum", "post-quantum"], poscuantica: ["post-quantum", "quantum"],
    aleatorio: ["random"], hash: ["hash"], certificados: ["certificate", "pki"], certificado: ["certificate", "pki"],
    nombres: ["dns", "domain name"], dominio: ["domain"], pruebas: ["test", "penetration"], penetracion: ["penetration"],
    resiliencia: ["resilien"], ingenieria: ["engineering"], software: ["software"], desarrollo: ["development", "develop"],
    cumplimiento: ["requirement", "compliance"], requisitos: ["requirement"], gestion: ["management"],
    terceros: ["supply chain", "external", "third"], ransomware: ["ransomware"], malware: ["malware", "malicious"],
    confianza: ["trust", "zero trust"], cero: ["zero"], dispositivos: ["device"], usb: ["portable", "media"],
    respuesta: ["response", "respond"], datos: ["pii", "personally identifiable", "data"], cadena: ["chain"],
    informacion: ["information"], sistemas: ["system"], sistema: ["system"], proteccion: ["protect"],
    digital: ["digital"], amenazas: ["threat"], amenaza: ["threat"], recuperacion: ["recover"],
    biometria: ["biometric"], tarjeta: ["card", "piv"], blockchain: ["blockchain"], descubrimiento: ["discovery"],
    // términos jurídicos y en inglés -> como aparecen en las normas en español
    cibercrimen: ["ciberdelincuencia", "delitos informaticos", "cybercrime"], ciberdelito: ["ciberdelincuencia", "delitos informaticos"],
    ciberdelitos: ["ciberdelincuencia", "delitos informaticos"], cybercrime: ["ciberdelincuencia", "delitos informaticos"],
    hacking: ["acceso ilicito", "delitos informaticos"], hackeo: ["acceso ilicito", "delitos informaticos"],
    phishing: ["fraude informatico", "suplantacion", "phishing"], estafa: ["fraude informatico", "fraud"],
    deepfake: ["contenido sexual", "inteligencia artificial"], deepfakes: ["contenido sexual", "inteligencia artificial"],
    gdpr: ["rgpd", "2016/679"], privacy: ["privacidad", "datos personales"], banco: ["financiero", "sbs", "financial"],
    bancos: ["financiero", "sbs", "financial"], tratado: ["convenio", "convencion"], tratados: ["convenio", "convencion"],
    ninos: ["menores", "children"], delitos: ["ciberdelitos", "delito", "ciberdelincuencia"],
    informaticos: ["ciberdelitos", "informatic", "ciberdelincuencia"]
  };
  var VACIAS = { de: 1, la: 1, el: 1, los: 1, las: 1, y: 1, en: 1, para: 1, del: 1, a: 1, con: 1, por: 1, un: 1, una: 1, sobre: 1, o: 1, e: 1, al: 1, guia: 1, norma: 1 };

  var INICIO = [
    { c: "SP 800-12 Rev. 1", s: "Introducción" },
    { c: "CSF 2.0 (español)", s: "Marco CSF 2.0" },
    { c: "SP 800-30 Rev. 1", s: "Evaluar riesgos" },
    { c: "SP 800-53 Rev. 5", s: "Controles" },
    { c: "SP 800-61 Rev. 3", s: "Incidentes" },
    { c: "ISO/IEC 27001:2022 + Amd 1:2024", s: "ISO: SGSI" },
    { c: "ISO/IEC 27035-1:2023", s: "ISO: incidentes" }
  ];
  var INICIO_LEGAL = [
    { c: "Ley N.° 30096", s: "Delitos informáticos" },
    { c: "Decreto Legislativo N.° 1700", s: "Tráfico de datos (2026)" },
    { c: "Ley N.° 29733", s: "Datos personales" },
    { c: "D.S. N.° 016-2024-JUS", s: "Reglamento de datos" },
    { c: "Decreto de Urgencia N.° 007-2020", s: "Confianza digital" },
    { c: "D.S. N.° 126-2025-PCM", s: "Reglamento confianza digital" },
    { c: "Convenio de Budapest (STE 185)", s: "Tratado de cibercrimen" },
    { c: "Reglamento (UE) 2016/679 (RGPD)", s: "Referente mundial" }
  ];
  // orden de los bloques: primero la normativa, luego lo técnico
  var ORDEN_BLOQUES = [20, 30, 8, 1, 2, 3, 4, 5, 6, 7, 10, 90];
  function rango(b) { var i = ORDEN_BLOQUES.indexOf(+b); return i < 0 ? 99 : i; }
  var SUGERENCIAS = ["Delitos informáticos", "Datos personales", "Ley 29733", "Confianza digital", "Convenio de Budapest", "Respuesta a incidentes", "27001", "800-53", "Evidencia digital", "Inteligencia artificial", "Sector financiero", "Nube"];

  var $ = function (id) { return document.getElementById(id); };
  var state = { q: "", org: "", bloque: "", hist: false, es: false, fav: false, sort: "rel", limit: PAGE };
  var favs = cargarFavs();

  function norm(s) {
    return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; });
  }
  function id(d) { return d.url || d.codigo; }
  function esPdf(u) { return /\.pdf($|[?#])/i.test(u || ""); }

  function cargarFavs() {
    try { return new Set(JSON.parse(localStorage.getItem("ac-favs") || "[]")); } catch (e) { return new Set(); }
  }
  function guardarFavs() {
    try { localStorage.setItem("ac-favs", JSON.stringify(Array.from(favs))); } catch (e) { /* sin almacenamiento */ }
  }

  // índice de búsqueda precalculado
  DOCS.forEach(function (d, i) {
    var b = DATA.bloques[d.bloque] || {};
    d._i = i;
    d._code = norm(d.codigo);
    d._compact = d._code.replace(/[^a-z0-9]/g, "");
    d._title = norm(d.titulo);
    d._rest = norm([d.es, d.tema].join(" "));
    d._blk = norm([b.nombre, d.estado, d.org].join(" "));
  });

  function tokens(q) {
    return norm(q).split(/[\s,;]+/).filter(function (t) { return t && !VACIAS[t]; });
  }

  function puntuar(d, toks) {
    var total = 0;
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i], s = 0, tc = t.replace(/[^a-z0-9]/g, "");
      if (d._code.indexOf(t) >= 0 || (tc.length > 2 && d._compact.indexOf(tc) >= 0)) {
        s = 10;
        if (new RegExp("(^|[^0-9a-z])" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "($|[^0-9a-z])").test(d._code)) s = 25;
      }
      if (d._title.indexOf(t) >= 0) s = Math.max(s, 8);
      if (d._rest.indexOf(t) >= 0) s = Math.max(s, 6);
      var syn = SINONIMOS[t] || SINONIMOS[t.replace(/s$/, "")] || [];
      for (var k = 0; k < syn.length; k++) {
        if (d._title.indexOf(syn[k]) >= 0 || d._code.indexOf(syn[k]) >= 0) s = Math.max(s, 6 - k * 0.5);
        else if (d._rest.indexOf(syn[k]) >= 0) s = Math.max(s, 3 - k * 0.5);
      }
      if (!s && d._blk.indexOf(t) >= 0) s = 1;
      if (!s) return 0;
      total += s;
    }
    return total;
  }

  function natural(a, b) { return a.localeCompare(b, "es", { numeric: true, sensitivity: "base" }); }

  function filtrar() {
    var toks = tokens(state.q);
    var out = [];
    DOCS.forEach(function (d) {
      if (state.org && d.org !== state.org) return;
      if (state.bloque) { if (String(d.bloque) !== state.bloque) return; }
      else if (!state.hist && d.bloque === 90) return;
      if (state.es && d.idioma !== "es") return;
      if (state.fav && !favs.has(id(d))) return;
      var s = toks.length ? puntuar(d, toks) : 1;
      if (s) { d._s = s; out.push(d); }
    });
    var porLectura = function (a, b) { return (rango(a.bloque) - rango(b.bloque)) || (a.orden - b.orden) || natural(a.codigo, b.codigo); };
    var cmp = {
      rel: toks.length ? function (a, b) { return (b._s - a._s) || (a.bloque === 90) - (b.bloque === 90) || porLectura(a, b); } : porLectura,
      "new": function (a, b) { return (b.fecha || "").localeCompare(a.fecha || "") || porLectura(a, b); },
      old: function (a, b) { return (a.fecha || "9").localeCompare(b.fecha || "9") || porLectura(a, b); },
      code: function (a, b) { return natural(a.codigo, b.codigo); },
      pages: function (a, b) { return (a.paginas || 1e9) - (b.paginas || 1e9) || porLectura(a, b); }
    }[state.sort];
    return { list: out.sort(cmp), toks: toks };
  }

  function resaltar(texto, toks) {
    var html = esc(texto);
    var palabras = [];
    toks.forEach(function (t) {
      if (t.length >= 2) palabras.push(t);
      (SINONIMOS[t] || []).forEach(function (s) { palabras.push(s); });
    });
    if (!palabras.length) return html;
    var clase = { a: "[aáàä]", e: "[eéèë]", i: "[iíìï]", o: "[oóòö]", u: "[uúùü]", n: "[nñ]" };
    var pat = palabras.sort(function (a, b) { return b.length - a.length; }).map(function (p) {
      return esc(p).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/[aeioun]/g, function (c) { return clase[c]; });
    }).join("|");
    return html.replace(new RegExp("(" + pat + ")", "gi"), "<mark>$1</mark>");
  }

  function fecha(f) {
    if (!f) return "";
    var p = f.split("-");
    var m = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"][+p[1] - 1];
    return +p[2] + " " + m + " " + p[0];
  }

  function tarjeta(d, toks) {
    var b = DATA.bloques[d.bloque] || {};
    var abre = esc(d.url);
    var tags = '<span class="tag">' + esc(d.tema || b.nombre || "") + "</span>";
    if (d.pais) tags += '<span class="tag pe">' + esc(d.pais) + "</span>";
    else if (d.bloque === 30) tags += '<span class="tag pe">Internacional</span>';
    if (d.idioma === "es" && d.org !== "LEY") tags += '<span class="tag es">Español</span>';
    if (d.bloque === 90) tags += '<span class="tag old">' + esc(d.estado) + "</span>";
    if (d.org === "ISO") tags += '<span class="tag old">De pago</span>';
    var meta = [];
    if (d.fecha) meta.push(fecha(d.fecha));
    if (d.paginas) meta.push(d.paginas + " págs.");
    if (d.mb) meta.push(d.mb.toFixed(1) + " MB");
    if (d.org === "ISO") meta.push("Norma con derechos de autor");
    var texto = d.org === "ISO" ? "Ver en ISO.org" : esPdf(d.url) ? "Abrir PDF oficial" : "Abrir fuente oficial";
    var acciones = '<a class="btn primary" href="' + abre + '" target="_blank" rel="noopener noreferrer">' + texto + " ↗</a>";
    var on = favs.has(id(d));
    return '<li class="card" style="--c:var(--b' + d.bloque + ')">' +
      '<div class="head"><span class="code">' + resaltar(d.codigo, toks) + "</span>" + tags + "</div>" +
      '<h3 class="title"><a href="' + abre + '" target="_blank" rel="noopener noreferrer">' + resaltar(d.titulo, toks) + "</a></h3>" +
      (d.es ? '<p class="desc">' + resaltar(d.es, toks) + "</p>" : "") +
      '<div class="meta">' + meta.map(function (m) { return "<span>" + esc(m) + "</span>"; }).join("") + "</div>" +
      '<div class="actions">' + acciones + "</div>" +
      '<button type="button" class="fav' + (on ? " on" : "") + '" data-fav="' + d._i + '" aria-pressed="' + on + '" aria-label="' + (on ? "Quitar de" : "Añadir a") + ' favoritos" title="Favorito">' +
      '<svg viewBox="0 0 24 24"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z"/></svg></button>' +
      "</li>";
  }

  function pintarInicio() {
    var el = $("start");
    var vacio = !state.q && !state.bloque && !state.org && !state.fav && !state.es;
    if (!vacio) { el.innerHTML = ""; return; }
    var fila = function (lista) {
      return lista.map(function (x, i) {
        var d = DOCS.find(function (y) { return y.codigo === x.c; });
        if (!d) return "";
        return '<li><a href="' + esc(d.url) + '" target="_blank" rel="noopener noreferrer"><span class="step">' + (i + 1) + " · " + esc(x.s) +
          '</span><span class="c">' + esc(d.codigo.replace(" + Amd 1:2024", "")) + '</span><span class="t">' + esc(d.titulo) + "</span></a></li>";
      }).join("");
    };
    el.innerHTML = "<h2>Ruta legal: lo esencial para el abogado</h2><ol class=\"path\">" + fila(INICIO_LEGAL) + "</ol>" +
      "<h2>Ruta técnica: normas y estándares</h2><ol class=\"path\">" + fila(INICIO) + "</ol>";
  }

  function pintar() {
    var r = filtrar();
    var vis = r.list.slice(0, state.limit);
    $("grid").innerHTML = vis.map(function (d) { return tarjeta(d, r.toks); }).join("");
    $("empty").hidden = r.list.length > 0;
    $("more").hidden = r.list.length <= state.limit;
    $("more").textContent = "Mostrar más (" + (r.list.length - vis.length) + " restantes)";
    var nb = state.bloque && DATA.bloques[state.bloque] ? " en <strong>" + esc(DATA.bloques[state.bloque].nombre) + "</strong>" : "";
    $("count").innerHTML = "<strong>" + r.list.length + "</strong> documento" + (r.list.length === 1 ? "" : "s") + nb;
    pintarInicio();
    pintarBloques();
    guardarHash();
  }

  function pintarBloques() {
    var cuenta = {};
    DOCS.forEach(function (d) {
      if (state.org && d.org !== state.org) return;
      cuenta[d.bloque] = (cuenta[d.bloque] || 0) + 1;
    });
    var total = 0;
    Object.keys(cuenta).forEach(function (k) { if (k !== "90" || state.hist) total += cuenta[k]; });
    var html = '<li><button type="button" data-b="" class="' + (state.bloque ? "" : "on") + '"><span class="dot" style="background:var(--ink-3)"></span>Todos<span class="n">' + total + "</span></button></li>";
    Object.keys(DATA.bloques).sort(function (a, b) { return rango(a) - rango(b); }).forEach(function (k) {
      if (!cuenta[k]) return;
      var b = DATA.bloques[k];
      html += '<li><button type="button" data-b="' + k + '" title="' + esc(b.desc) + '" class="' + (state.bloque === k ? "on" : "") + '">' +
        '<span class="dot" style="background:var(--b' + k + ')"></span>' + esc(b.nombre) + '<span class="n">' + cuenta[k] + "</span></button></li>";
    });
    $("blocks").innerHTML = html;
  }

  // estado en la URL (#q=...&b=...) para poder compartir enlaces
  function guardarHash() {
    var p = new URLSearchParams();
    if (state.q) p.set("q", state.q);
    if (state.bloque) p.set("b", state.bloque);
    if (state.org) p.set("org", state.org);
    if (state.hist) p.set("hist", "1");
    if (state.es) p.set("es", "1");
    if (state.sort !== "rel") p.set("orden", state.sort);
    var h = p.toString();
    try { history.replaceState(null, "", h ? "#" + h : location.pathname + location.search); } catch (e) { /* file:// en algunos navegadores */ }
  }
  function leerHash() {
    var p = new URLSearchParams(location.hash.slice(1));
    state.q = p.get("q") || "";
    state.bloque = p.get("b") || "";
    state.org = p.get("org") || "";
    state.hist = p.get("hist") === "1";
    state.es = p.get("es") === "1";
    state.sort = p.get("orden") || "rel";
  }
  function sincronizarControles() {
    $("q").value = state.q;
    $("f-hist").checked = state.hist;
    $("f-es").checked = state.es;
    $("f-fav").checked = state.fav;
    $("sort").value = state.sort;
    document.querySelectorAll(".seg button").forEach(function (b) { b.classList.toggle("on", b.dataset.org === state.org); });
  }

  function reiniciar() { state.limit = PAGE; pintar(); }

  // eventos
  var tmr;
  $("q").addEventListener("input", function (e) {
    clearTimeout(tmr);
    tmr = setTimeout(function () { state.q = e.target.value.trim(); reiniciar(); }, 90);
  });
  $("q").addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      var a = document.querySelector("#grid .card .btn.primary");
      if (a) a.click();
    }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "/" && document.activeElement !== $("q") && !/input|select|textarea/i.test(document.activeElement.tagName)) {
      e.preventDefault(); $("q").focus(); $("q").select();
    } else if (e.key === "Escape" && document.activeElement === $("q")) {
      $("q").value = ""; state.q = ""; reiniciar();
    }
  });
  document.querySelector(".seg").addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    state.org = b.dataset.org; state.bloque = "";
    sincronizarControles(); reiniciar();
  });
  $("blocks").addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    state.bloque = b.dataset.b;
    if (state.bloque === "10") { state.org = ""; sincronizarControles(); }
    reiniciar();
  });
  $("f-hist").addEventListener("change", function (e) { state.hist = e.target.checked; reiniciar(); });
  $("f-es").addEventListener("change", function (e) { state.es = e.target.checked; reiniciar(); });
  $("f-fav").addEventListener("change", function (e) { state.fav = e.target.checked; reiniciar(); });
  $("sort").addEventListener("change", function (e) { state.sort = e.target.value; reiniciar(); });
  $("more").addEventListener("click", function () { state.limit += PAGE; pintar(); });
  $("grid").addEventListener("click", function (e) {
    var b = e.target.closest(".fav"); if (!b) return;
    var d = DOCS[+b.dataset.fav], k = id(d);
    if (favs.has(k)) favs.delete(k); else favs.add(k);
    guardarFavs();
    var on = favs.has(k);
    b.classList.toggle("on", on);
    b.setAttribute("aria-pressed", on);
    b.setAttribute("aria-label", (on ? "Quitar de" : "Añadir a") + " favoritos");
    if (state.fav && !on) pintar();
  });

  $("quick").innerHTML = SUGERENCIAS.map(function (s) { return '<button type="button">' + esc(s) + "</button>"; }).join("");
  $("quick").addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    state.q = b.textContent; state.bloque = ""; sincronizarControles(); reiniciar();
  });

  var nNist = DOCS.filter(function (d) { return d.org === "NIST" && d.bloque !== 90; }).length;
  var nIso = DOCS.filter(function (d) { return d.org === "ISO"; }).length;
  var nPe = DOCS.filter(function (d) { return d.bloque === 20; }).length;
  var nInt = DOCS.filter(function (d) { return d.bloque === 30; }).length;
  var nHist = DOCS.filter(function (d) { return d.bloque === 90; }).length;
  $("lede").textContent = "Leyes peruanas, normativa internacional, publicaciones del NIST y normas ISO/IEC sobre ciberseguridad. " +
    "Busca en español o en inglés y abre cada documento en su fuente oficial.";
  $("n-pe").textContent = nPe; $("n-int").textContent = nInt; $("n-nist").textContent = nNist;
  $("n-iso").textContent = nIso; $("n-hist").textContent = nHist;
  $("gen").textContent = fecha(DATA.generado);

  leerHash();
  sincronizarControles();
  pintar();
})();
