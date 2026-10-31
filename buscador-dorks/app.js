// Buscador Dorks — recomienda consultas con operadores de búsqueda para auditar un dominio propio o autorizado.
// Todo corre en el navegador: no hay servidor, no se lanza ninguna búsqueda sola. El usuario copia la consulta
// o la abre en Google con un clic. El registro de hallazgos se guarda solo en este navegador (localStorage).
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var CLAVE = "buscador-dorks:hallazgos";

  // Glosario: qué hace cada operador. Se usa para explicar cada consulta.
  var OPERADORES = {
    "site:":      "limita la búsqueda a un dominio o subdominio.",
    "filetype:":  "solo archivos de ese tipo (pdf, docx, xlsx…).",
    "ext:":       "igual que filetype: pero por extensión del archivo.",
    "intitle:":   "la palabra aparece en el título de la página.",
    "allintitle:":"todas las palabras aparecen en el título.",
    "inurl:":     "la palabra aparece en la dirección (URL).",
    "intext:":    "la palabra aparece en el cuerpo del texto.",
    "cache:":     "muestra la copia que Google guardó de la página.",
    "related:":   "páginas parecidas a la indicada.",
    "\"…\"":      "busca la frase exacta entre comillas.",
    "OR":         "cualquiera de los términos (en mayúsculas).",
    "-":          "excluye lo que vaya detrás del guion.",
    "*":          "comodín: cualquier palabra en ese hueco.",
    "before:":    "resultados anteriores a una fecha (AAAA-MM-DD).",
    "after:":     "resultados posteriores a una fecha (AAAA-MM-DD)."
  };

  // Objetivos de auditoría. Cada uno genera varias consultas alternativas, todas limitadas al dominio.
  // d = dominio, kw = frase de palabras clave (o ""), ft = tipo de archivo elegido (o "").
  var OBJETIVOS = [
    {
      id: "documentos",
      nombre: "Documentos públicos",
      desc: "Archivos ofimáticos que el dominio publica y Google ha indexado.",
      ops: ["site:", "filetype:", "\"…\""],
      consultas: function (d, kw, ft) {
        var out = [];
        if (ft) out.push("site:" + d + " filetype:" + ft + (kw ? ' "' + kw + '"' : ""));
        out.push("site:" + d + " (filetype:pdf OR filetype:docx OR filetype:xlsx OR filetype:pptx)" + (kw ? ' "' + kw + '"' : ""));
        if (kw) out.push("site:" + d + ' intext:"' + kw + '" filetype:pdf');
        return out;
      }
    },
    {
      id: "directorios",
      nombre: "Directorios listados",
      desc: "Carpetas del servidor que muestran su contenido sin una página de inicio.",
      ops: ["site:", "intitle:", "OR"],
      consultas: function (d, kw) {
        return [
          'site:' + d + ' intitle:"index of"',
          'site:' + d + ' intitle:"index of" (backup OR copia OR bak OR old)' + (kw ? ' ' + kw : ""),
          'site:' + d + ' intitle:"index of" (parent directory)'
        ];
      }
    },
    {
      id: "acceso",
      nombre: "Páginas de acceso y paneles",
      desc: "Formularios de inicio de sesión y paneles de administración indexados.",
      ops: ["site:", "inurl:", "intitle:", "OR"],
      consultas: function (d) {
        return [
          "site:" + d + " (inurl:login OR inurl:signin OR inurl:admin OR inurl:acceso)",
          'site:' + d + ' (intitle:"iniciar sesión" OR intitle:login OR intitle:admin)',
          "site:" + d + " (inurl:dashboard OR inurl:panel OR inurl:cpanel OR inurl:wp-admin)"
        ];
      }
    },
    {
      id: "config",
      nombre: "Archivos de configuración y registros",
      desc: "Ficheros de configuración, registros o copias que no deberían estar expuestos.",
      ops: ["site:", "filetype:", "ext:", "OR"],
      consultas: function (d) {
        return [
          "site:" + d + " (filetype:env OR filetype:cfg OR filetype:ini OR filetype:conf OR filetype:yml)",
          "site:" + d + " (filetype:log OR filetype:sql OR filetype:bak OR ext:old OR ext:backup)",
          "site:" + d + " (inurl:config OR inurl:backup OR inurl:.git)"
        ];
      }
    },
    {
      id: "subdominios",
      nombre: "Subdominios visibles",
      desc: "Otros subdominios del mismo dominio que Google ha indexado.",
      ops: ["site:", "-", "*"],
      consultas: function (d) {
        var raiz = d.replace(/^www\./, "").replace(/^\*\./, "");
        return [
          "site:*." + raiz + " -www",
          "site:*." + raiz + " (inurl:dev OR inurl:test OR inurl:staging OR inurl:qa)"
        ];
      }
    },
    {
      id: "parametros",
      nombre: "Rutas con parámetros",
      desc: "Direcciones con parámetros en la URL, útiles para revisar qué expone cada ruta.",
      ops: ["site:", "inurl:", "OR"],
      consultas: function (d, kw) {
        return [
          "site:" + d + " (inurl:id= OR inurl:page= OR inurl:file= OR inurl:url=)",
          "site:" + d + " inurl:?" + (kw ? ' intext:"' + kw + '"' : "")
        ];
      }
    },
    {
      id: "texto",
      nombre: "Texto o dato concreto",
      desc: "Buscar una palabra o frase exacta dentro del dominio. Requiere palabras clave.",
      ops: ["site:", "intext:", "\"…\""],
      requiereKw: true,
      consultas: function (d, kw) {
        return [
          'site:' + d + ' "' + kw + '"',
          'site:' + d + ' intext:"' + kw + '"',
          'site:' + d + ' intitle:"' + kw + '"'
        ];
      }
    }
  ];

  var estado = { generadas: [] };

  // ---------- utilidades ----------

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // Normaliza lo que escribe el usuario a un dominio limpio (sin https://, sin ruta, sin espacios).
  function limpiarDominio(v) {
    v = (v || "").trim().toLowerCase();
    v = v.replace(/^https?:\/\//, "").replace(/^www\./, "");
    v = v.split("/")[0].split("?")[0].split("#")[0].replace(/\s+/g, "");
    return v;
  }

  function dominioValido(d) {
    return /^([a-z0-9-]+\.)+[a-z]{2,}$/.test(d);
  }

  // Lista los operadores que usa una consulta, con su explicación.
  function explicar(q) {
    var filas = [];
    Object.keys(OPERADORES).forEach(function (op) {
      var usado = op === "\"…\"" ? /"[^"]+"/.test(q)
        : op === "OR" ? /\bOR\b/.test(q)
        : op === "-" ? /\s-\w/.test(q)
        : op === "*" ? /\*/.test(q)
        : q.indexOf(op) >= 0;
      if (usado) filas.push([op, OPERADORES[op]]);
    });
    return filas;
  }

  function leer() {
    try { return JSON.parse(localStorage.getItem(CLAVE)) || []; } catch (e) { return []; }
  }
  function escribir(lista) {
    try { localStorage.setItem(CLAVE, JSON.stringify(lista)); return true; } catch (e) { return false; }
  }
  function descargar(nombre, contenido, tipo) {
    var url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
    var a = document.createElement("a");
    a.href = url; a.download = nombre;
    document.body.append(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }
  function urlGoogle(q) {
    return "https://www.google.com/search?q=" + encodeURIComponent(q);
  }

  // ---------- generar consultas ----------

  function generar() {
    var d = limpiarDominio($("dominio").value);
    $("dominio").value = d;
    if (!dominioValido(d)) {
      mostrarAviso("Escribe un dominio válido, por ejemplo midominio.com. Recuerda: solo dominios propios o con permiso.", "error");
      $("resultados").replaceChildren();
      return;
    }
    var obj = $("objetivo").value;
    var kw = $("kw").value.trim().replace(/"/g, "");
    var ft = $("ft").value;
    mostrarAviso("", "");

    var lista = obj === "todos" ? OBJETIVOS : OBJETIVOS.filter(function (o) { return o.id === obj; });
    var bloques = [];
    lista.forEach(function (o) {
      if (o.requiereKw && !kw) return;
      var qs = o.consultas(d, kw, ft).filter(Boolean);
      // sin duplicados dentro del objetivo
      qs = qs.filter(function (q, i) { return qs.indexOf(q) === i; });
      if (qs.length) bloques.push({ obj: o, qs: qs });
    });

    if (!bloques.length) {
      mostrarAviso('El objetivo «Texto o dato concreto» necesita que escribas una palabra clave.', "error");
      $("resultados").replaceChildren();
      return;
    }
    estado.generadas = bloques;
    pintarResultados(bloques, d);
  }

  function mostrarAviso(texto, tipo) {
    var el = $("aviso-form");
    el.textContent = texto;
    el.className = "estado" + (tipo ? " " + tipo : "");
  }

  function pintarResultados(bloques, dominio) {
    var cont = $("resultados");
    cont.replaceChildren();

    var intro = document.createElement("p");
    intro.className = "res-intro";
    var n = bloques.reduce(function (s, b) { return s + b.qs.length; }, 0);
    intro.textContent = n + (n === 1 ? " consulta recomendada para " : " consultas recomendadas para ") + dominio + ":";
    cont.append(intro);

    bloques.forEach(function (b) {
      var sec = document.createElement("section");
      sec.className = "obj-bloque";
      var h = document.createElement("h3");
      h.className = "obj-titulo";
      h.textContent = "// " + b.obj.nombre.toUpperCase();
      var pd = document.createElement("p");
      pd.className = "obj-desc";
      pd.textContent = b.obj.desc;
      sec.append(h, pd);

      b.qs.forEach(function (q) { sec.append(tarjetaConsulta(q)); });
      cont.append(sec);
    });
  }

  function tarjetaConsulta(q) {
    var card = document.createElement("div");
    card.className = "dork-card";

    var fila = document.createElement("div");
    fila.className = "dork-fila";
    var code = document.createElement("code");
    code.className = "dork-q";
    code.textContent = q;
    fila.append(code);
    card.append(fila);

    // explicación de los operadores
    var exp = explicar(q);
    if (exp.length) {
      var dl = document.createElement("dl");
      dl.className = "dork-exp";
      exp.forEach(function (par) {
        var dt = document.createElement("dt"); dt.textContent = par[0];
        var dd = document.createElement("dd"); dd.textContent = par[1];
        dl.append(dt, dd);
      });
      card.append(dl);
    }

    // acciones
    var acc = document.createElement("div");
    acc.className = "dork-acc";

    var bCopiar = document.createElement("button");
    bCopiar.type = "button"; bCopiar.className = "btn btn-sec";
    bCopiar.textContent = "Copiar";
    bCopiar.addEventListener("click", function () {
      navigator.clipboard && navigator.clipboard.writeText(q).then(function () {
        bCopiar.textContent = "Copiado ✓";
        setTimeout(function () { bCopiar.textContent = "Copiar"; }, 1500);
      });
    });

    var aGoogle = document.createElement("a");
    aGoogle.className = "btn btn-principal";
    aGoogle.href = urlGoogle(q);
    aGoogle.target = "_blank"; aGoogle.rel = "noopener noreferrer";
    aGoogle.textContent = "Buscar en Google ↗";

    var bGuardar = document.createElement("button");
    bGuardar.type = "button"; bGuardar.className = "btn btn-sec";
    bGuardar.textContent = "Guardar en registro";
    bGuardar.addEventListener("click", function () { guardarHallazgo(q); });

    acc.append(bCopiar, aGoogle, bGuardar);
    card.append(acc);
    return card;
  }

  // ---------- registro de hallazgos ----------

  function guardarHallazgo(q) {
    var lista = leer();
    var h = {
      id: Date.now(),
      fecha: new Date().toISOString(),
      consulta: q,
      url: "",
      observacion: "",
      estado: "Información encontrada"
    };
    lista.push(h);
    if (escribir(lista)) {
      mostrarEstadoReg("Consulta añadida al registro. Completa la URL y tu observación abajo.", "ok");
    } else {
      mostrarEstadoReg("El navegador no permite guardar (modo privado o almacenamiento bloqueado).", "error");
    }
    pintarRegistro();
  }

  function mostrarEstadoReg(texto, tipo) {
    var el = $("estado-reg");
    el.textContent = texto;
    el.className = "estado" + (tipo ? " " + tipo : "");
  }

  function pintarRegistro() {
    var lista = leer();
    var cuerpo = $("reg-cuerpo");
    cuerpo.replaceChildren();

    lista.forEach(function (h) {
      var tr = document.createElement("tr");

      var tdFecha = celda(new Date(h.fecha).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" }));
      var tdQ = document.createElement("td");
      var c = document.createElement("code"); c.textContent = h.consulta; c.className = "reg-q";
      tdQ.append(c);

      // URL editable
      var tdUrl = document.createElement("td");
      var inUrl = document.createElement("input");
      inUrl.type = "url"; inUrl.value = h.url; inUrl.placeholder = "https://…"; inUrl.className = "reg-input";
      inUrl.addEventListener("change", function () { actualizar(h.id, { url: inUrl.value.trim() }); });
      tdUrl.append(inUrl);

      // observación editable
      var tdObs = document.createElement("td");
      var inObs = document.createElement("input");
      inObs.type = "text"; inObs.value = h.observacion; inObs.placeholder = "Observación del analista"; inObs.className = "reg-input";
      inObs.addEventListener("change", function () { actualizar(h.id, { observacion: inObs.value.trim() }); });
      tdObs.append(inObs);

      // estado editable
      var tdEst = document.createElement("td");
      var sel = document.createElement("select");
      sel.className = "reg-sel";
      ["Información encontrada", "Hallazgo validado", "Descartado"].forEach(function (op) {
        var o = document.createElement("option"); o.textContent = op; o.selected = h.estado === op; sel.append(o);
      });
      sel.dataset.v = h.estado;
      sel.addEventListener("change", function () { actualizar(h.id, { estado: sel.value }); sel.dataset.v = sel.value; });
      tdEst.append(sel);

      // borrar
      var tdDel = document.createElement("td");
      var bDel = document.createElement("button");
      bDel.type = "button"; bDel.className = "reg-del"; bDel.textContent = "✕";
      bDel.title = "Borrar esta fila"; bDel.setAttribute("aria-label", "Borrar esta fila");
      bDel.addEventListener("click", function () { escribir(leer().filter(function (x) { return x.id !== h.id; })); pintarRegistro(); });
      tdDel.append(bDel);

      tr.append(tdFecha, tdQ, tdUrl, tdObs, tdEst, tdDel);
      cuerpo.append(tr);
    });

    var hay = lista.length > 0;
    $("reg-tabla").hidden = !hay;
    $("reg-vacio").hidden = hay;
    $("btn-csv").disabled = !hay;
    $("btn-json").disabled = !hay;
    $("btn-limpiar").disabled = !hay;
  }

  function celda(txt) { var td = document.createElement("td"); td.textContent = txt; return td; }

  function actualizar(id, campos) {
    var lista = leer().map(function (h) { return h.id === id ? Object.assign(h, campos) : h; });
    escribir(lista);
  }

  function exportarCSV() {
    var lista = leer();
    if (!lista.length) return;
    var cols = ["fecha", "estado", "consulta", "url", "observacion"];
    var celdaCsv = function (v) {
      var s = v == null ? "" : String(v);
      return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    var filas = [cols.join(",")].concat(lista.map(function (h) {
      return cols.map(function (c) { return celdaCsv(h[c]); }).join(",");
    }));
    descargar("registro-dorks.csv", filas.join("\n"), "text/csv;charset=utf-8");
  }
  function exportarJSON() {
    var lista = leer();
    if (!lista.length) return;
    descargar("registro-dorks.json", JSON.stringify(lista, null, 2), "application/json");
  }

  // Borrado en dos pulsaciones, sin diálogos nativos.
  var confirmar = null;
  function limpiarRegistro() {
    var b = $("btn-limpiar");
    if (!confirmar) {
      b.textContent = "¿Seguro? Pulsa otra vez";
      confirmar = setTimeout(function () { b.textContent = "Borrar todo el registro"; confirmar = null; }, 4000);
      return;
    }
    clearTimeout(confirmar); confirmar = null;
    b.textContent = "Borrar todo el registro";
    try { localStorage.removeItem(CLAVE); } catch (e) { /* nada guardado */ }
    mostrarEstadoReg("Registro borrado de este navegador.", "ok");
    pintarRegistro();
  }

  // ---------- glosario ----------

  function pintarGlosario() {
    var dl = $("glosario");
    Object.keys(OPERADORES).forEach(function (op) {
      var dt = document.createElement("dt"); dt.textContent = op;
      var dd = document.createElement("dd"); dd.textContent = OPERADORES[op];
      dl.append(dt, dd);
    });
  }

  // ---------- inicio ----------

  // rellenar el select de objetivos
  var selObj = $("objetivo");
  var optTodos = document.createElement("option"); optTodos.value = "todos"; optTodos.textContent = "Todos los objetivos"; selObj.append(optTodos);
  OBJETIVOS.forEach(function (o) {
    var op = document.createElement("option"); op.value = o.id; op.textContent = o.nombre; selObj.append(op);
  });

  $("btn-generar").addEventListener("click", generar);
  $("dominio").addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); generar(); } });
  $("kw").addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); generar(); } });
  $("btn-csv").addEventListener("click", exportarCSV);
  $("btn-json").addEventListener("click", exportarJSON);
  $("btn-limpiar").addEventListener("click", limpiarRegistro);

  pintarGlosario();
  pintarRegistro();
})();
