// Laboratorio de privacidad: qué ubicación puede revelar una visita web.
// Todo corre en el navegador. Los datos externos se pintan con textContent, nunca con innerHTML.
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const CLAVE = "lab-ubicacion:intentos";

  const estado = { ip: null, ipError: null, geo: null, geoError: null };

  // Servicios GeoIP, en orden. Cada uno normaliza su respuesta al mismo formato.
  const SERVICIOS = [
    {
      nombre: "ipapi.co",
      url: "https://ipapi.co/json/",
      leer: (d) => {
        if (d.error) throw new Error(d.reason || "respuesta con error");
        return { ip: d.ip, pais: d.country_name, region: d.region, ciudad: d.city, lat: d.latitude, lon: d.longitude, org: d.org };
      },
    },
    {
      nombre: "ipwho.is",
      url: "https://ipwho.is/",
      leer: (d) => {
        if (d.success === false) throw new Error(d.message || "respuesta con error");
        const c = d.connection || {};
        return { ip: d.ip, pais: d.country, region: d.region, ciudad: d.city, lat: d.latitude, lon: d.longitude, org: c.isp || c.org };
      },
    },
  ];

  const ERRORES_GEO = {
    1: "Permiso rechazado o bloqueado. La página no recibió coordenadas: esto es justo lo que el laboratorio demuestra.",
    2: "El dispositivo no pudo determinar su posición.",
    3: "Se agotó el tiempo de espera (15 s).",
  };

  // ---------- utilidades ----------

  function distanciaKm(a, b) {
    const R = 6371;
    const rad = (g) => (g * Math.PI) / 180;
    const dLat = rad(b.lat - a.lat);
    const dLon = rad(b.lon - a.lon);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  const redondear = (n, dec) => (typeof n === "number" ? Number(n.toFixed(dec)) : null);

  function formatoMetros(m) {
    if (m == null) return "—";
    return m >= 1000 ? (m / 1000).toFixed(1) + " km" : Math.round(m) + " m";
  }

  function formatoKm(km) {
    if (km == null) return "—";
    return km < 1 ? Math.round(km * 1000) + " m" : km.toFixed(1) + " km";
  }

  function mostrarEstado(id, texto, tipo) {
    const el = $(id);
    el.textContent = texto;
    el.className = "estado" + (tipo ? " " + tipo : "");
  }

  function pintarDatos(id, filas) {
    const dl = $(id);
    dl.replaceChildren();
    for (const [etiqueta, valor] of filas) {
      const dt = document.createElement("dt");
      const dd = document.createElement("dd");
      dt.textContent = etiqueta;
      dd.textContent = valor == null || valor === "" ? "—" : String(valor);
      dl.append(dt, dd);
    }
    dl.hidden = filas.length === 0;
  }

  function leerIntentos() {
    try {
      return JSON.parse(localStorage.getItem(CLAVE)) || [];
    } catch {
      return [];
    }
  }

  function escribirIntentos(lista) {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(lista));
      return true;
    } catch {
      return false;
    }
  }

  function descargar(nombre, contenido, tipo) {
    const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
    const a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // ---------- 01 · consentimiento ----------

  function actualizarConsentimiento() {
    const ok = $("acepto").checked;
    $("btn-ip").disabled = !ok;
    $("btn-geo").disabled = !ok || !("geolocation" in navigator);
  }

  // ---------- 02 · estimación por IP ----------

  async function estimarPorIP() {
    $("btn-ip").disabled = true;
    mostrarEstado("estado-ip", "Consultando servicio GeoIP…");
    let ultimoError = null;

    for (const servicio of SERVICIOS) {
      const t0 = performance.now();
      try {
        const r = await fetch(servicio.url, { cache: "no-store", referrerPolicy: "no-referrer" });
        if (!r.ok) throw new Error("HTTP " + r.status);
        const d = servicio.leer(await r.json());
        if (typeof d.lat !== "number" || typeof d.lon !== "number") throw new Error("sin coordenadas");

        estado.ip = { ...d, fuente: servicio.nombre, ms: Math.round(performance.now() - t0) };
        estado.ipError = null;
        pintarDatos("res-ip", [
          ["IP pública", estado.ip.ip],
          ["País", estado.ip.pais],
          ["Región", estado.ip.region],
          ["Ciudad", estado.ip.ciudad],
          ["Coordenadas", estado.ip.lat.toFixed(4) + ", " + estado.ip.lon.toFixed(4)],
          ["Proveedor", estado.ip.org],
          ["Fuente", estado.ip.fuente],
          ["Tiempo", estado.ip.ms + " ms"],
        ]);
        mostrarEstado("estado-ip", "Estimación obtenida sin pedirte ningún permiso.", "ok");
        actualizarConsentimiento();
        pintarComparacion();
        return;
      } catch (e) {
        ultimoError = servicio.nombre + ": " + e.message;
      }
    }

    estado.ip = null;
    estado.ipError = ultimoError;
    pintarDatos("res-ip", []);
    mostrarEstado("estado-ip", "No se pudo consultar ningún servicio (" + ultimoError + "). Un bloqueador de anuncios puede impedirlo.", "error");
    actualizarConsentimiento();
    pintarComparacion();
  }

  // ---------- 03 · geolocalización del navegador ----------

  async function vigilarPermiso() {
    const el = $("permiso");
    const nombres = { granted: "concedido", denied: "denegado", prompt: "preguntará al pulsar" };
    if (!("geolocation" in navigator)) {
      el.textContent = "API no disponible en este navegador";
      return;
    }
    if (!navigator.permissions) {
      el.textContent = "no consultable";
      return;
    }
    try {
      const p = await navigator.permissions.query({ name: "geolocation" });
      const pintar = () => (el.textContent = nombres[p.state] || p.state);
      pintar();
      p.onchange = pintar;
    } catch {
      el.textContent = "no consultable";
    }
  }

  function compartirUbicacion() {
    $("btn-geo").disabled = true;
    mostrarEstado("estado-geo", "Esperando tu respuesta al aviso del navegador…");
    const t0 = performance.now();

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = pos.coords;
        estado.geo = {
          lat: c.latitude,
          lon: c.longitude,
          precision: c.accuracy,
          altitud: c.altitude,
          ms: Math.round(performance.now() - t0),
          fecha: new Date(pos.timestamp).toISOString(),
        };
        estado.geoError = null;
        pintarDatos("res-geo", [
          ["Latitud", c.latitude.toFixed(6)],
          ["Longitud", c.longitude.toFixed(6)],
          ["Precisión", "± " + formatoMetros(c.accuracy)],
          ["Altitud", c.altitude == null ? null : Math.round(c.altitude) + " m"],
          ["Tiempo", estado.geo.ms + " ms (incluye lo que tardaste en aceptar)"],
        ]);
        const osm = "https://www.openstreetmap.org/?mlat=" + c.latitude.toFixed(6) + "&mlon=" + c.longitude.toFixed(6) + "#map=16/" + c.latitude.toFixed(6) + "/" + c.longitude.toFixed(6);
        $("link-osm").href = osm;
        $("nota-osm").hidden = false;
        mostrarEstado("estado-geo", "Ubicación compartida con tu permiso.", "ok");
        actualizarConsentimiento();
        pintarComparacion();
      },
      (err) => {
        estado.geo = null;
        estado.geoError = { codigo: err.code, mensaje: ERRORES_GEO[err.code] || err.message };
        pintarDatos("res-geo", []);
        $("nota-osm").hidden = true;
        mostrarEstado("estado-geo", estado.geoError.mensaje, "error");
        actualizarConsentimiento();
        pintarComparacion();
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  // ---------- 04 · comparación ----------

  function pintarComparacion() {
    const caja = $("comparacion");
    caja.replaceChildren();
    const p = (texto, clase) => {
      const el = document.createElement("p");
      el.textContent = texto;
      if (clase) el.className = clase;
      caja.append(el);
    };

    if (estado.ip && estado.geo) {
      const km = distanciaKm(estado.ip, estado.geo);
      const veces = (km * 1000) / estado.geo.precision;
      p(formatoKm(km), "cifra");
      p("es la distancia entre la estimación por IP (" + (estado.ip.ciudad || "sin ciudad") + ") y tu ubicación autorizada.");
      p(
        "El navegador reporta un margen de ± " + formatoMetros(estado.geo.precision) + ". " +
          (veces >= 1
            ? "La IP se desvió " + Math.round(veces) + " veces ese margen."
            : "La IP cayó dentro del margen del navegador: en este caso coinciden.")
      );
      p("Sin tu permiso, un sitio solo habría tenido el primer dato.", "nota");
    } else if (estado.ip && estado.geoError) {
      p("Solo hay estimación por IP: " + [estado.ip.ciudad, estado.ip.pais].filter(Boolean).join(", ") + ".");
      p("Al no conceder el permiso, eso es todo lo que el sitio sabe de tu ubicación.", "nota");
    } else {
      p("Completa los pasos 02 y 03 para ver la diferencia entre ambos métodos.", "vacio");
    }
  }

  // ---------- 05 · guardar, exportar y borrar ----------

  function resultadoPermiso() {
    if (estado.geo) return "aceptado";
    if (estado.geoError) return estado.geoError.codigo === 1 ? "rechazado" : "error";
    return "sin intentar";
  }

  function guardarIntento() {
    if (!estado.ip && !estado.geo && !estado.geoError) {
      mostrarEstado("estado-guardar", "No hay nada que guardar: haz primero el paso 02 o el 03.", "error");
      return;
    }
    const dec = $("redondear").checked ? 3 : 6;
    const intento = {
      id: Date.now(),
      fecha: new Date().toISOString(),
      dispositivo: $("dispositivo").value,
      red: $("red").value,
      permiso: resultadoPermiso(),
      geo_lat: estado.geo ? redondear(estado.geo.lat, dec) : null,
      geo_lon: estado.geo ? redondear(estado.geo.lon, dec) : null,
      geo_precision_m: estado.geo ? Math.round(estado.geo.precision) : null,
      geo_ms: estado.geo ? estado.geo.ms : null,
      ip_fuente: estado.ip ? estado.ip.fuente : null,
      ip_pais: estado.ip ? estado.ip.pais : null,
      ip_ciudad: estado.ip ? estado.ip.ciudad : null,
      ip_lat: estado.ip ? redondear(estado.ip.lat, 2) : null,
      ip_lon: estado.ip ? redondear(estado.ip.lon, 2) : null,
      distancia_km: estado.ip && estado.geo ? redondear(distanciaKm(estado.ip, estado.geo), 2) : null,
    };

    const lista = leerIntentos();
    lista.push(intento);
    if (escribirIntentos(lista)) {
      mostrarEstado("estado-guardar", "Intento guardado en este navegador.", "ok");
    } else {
      mostrarEstado("estado-guardar", "El navegador no permite guardar (modo privado o almacenamiento bloqueado).", "error");
    }
    pintarTabla();
  }

  function pintarTabla() {
    const lista = leerIntentos();
    const cuerpo = $("tabla-cuerpo");
    cuerpo.replaceChildren();

    for (const it of lista) {
      const tr = document.createElement("tr");
      const celdas = [
        new Date(it.fecha).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" }),
        it.dispositivo,
        it.red,
        it.permiso,
        it.geo_precision_m == null ? "—" : "± " + formatoMetros(it.geo_precision_m),
        it.ip_ciudad || "—",
        formatoKm(it.distancia_km),
      ];
      for (const valor of celdas) {
        const td = document.createElement("td");
        td.textContent = valor;
        tr.append(td);
      }
      const td = document.createElement("td");
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = "✕";
      b.title = "Borrar este intento";
      b.setAttribute("aria-label", "Borrar este intento");
      b.addEventListener("click", () => {
        escribirIntentos(leerIntentos().filter((x) => x.id !== it.id));
        pintarTabla();
      });
      td.append(b);
      tr.append(td);
      cuerpo.append(tr);
    }

    const hay = lista.length > 0;
    $("tabla").hidden = !hay;
    $("tabla-vacia").hidden = hay;
    $("btn-csv").disabled = !hay;
    $("btn-json").disabled = !hay;
    $("btn-borrar").disabled = !hay;
  }

  function exportarCSV() {
    const lista = leerIntentos();
    if (!lista.length) return;
    const columnas = Object.keys(lista[0]);
    const celda = (v) => {
      const s = v == null ? "" : String(v);
      return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const filas = [columnas.join(",")].concat(lista.map((it) => columnas.map((c) => celda(it[c])).join(",")));
    descargar("intentos-ubicacion.csv", filas.join("\n"), "text/csv;charset=utf-8");
  }

  function exportarJSON() {
    const lista = leerIntentos();
    if (!lista.length) return;
    descargar("intentos-ubicacion.json", JSON.stringify(lista, null, 2), "application/json");
  }

  // Borrado en dos pulsaciones, sin diálogos nativos.
  let confirmarBorrado = null;
  function borrarTodo() {
    const b = $("btn-borrar");
    if (!confirmarBorrado) {
      b.textContent = "¿Seguro? Pulsa otra vez";
      confirmarBorrado = setTimeout(() => {
        b.textContent = "Borrar todo";
        confirmarBorrado = null;
      }, 4000);
      return;
    }
    clearTimeout(confirmarBorrado);
    confirmarBorrado = null;
    b.textContent = "Borrar todo";
    try {
      localStorage.removeItem(CLAVE);
    } catch {
      /* almacenamiento bloqueado: no había nada guardado */
    }
    mostrarEstado("estado-guardar", "Todos los intentos fueron borrados de este navegador.", "ok");
    pintarTabla();
  }

  // ---------- inicio ----------

  if (!window.isSecureContext) $("alerta-contexto").hidden = false;

  $("acepto").addEventListener("change", actualizarConsentimiento);
  $("btn-ip").addEventListener("click", estimarPorIP);
  $("btn-geo").addEventListener("click", compartirUbicacion);
  $("btn-guardar").addEventListener("click", guardarIntento);
  $("btn-csv").addEventListener("click", exportarCSV);
  $("btn-json").addEventListener("click", exportarJSON);
  $("btn-borrar").addEventListener("click", borrarTodo);

  actualizarConsentimiento();
  vigilarPermiso();
  pintarTabla();
})();
