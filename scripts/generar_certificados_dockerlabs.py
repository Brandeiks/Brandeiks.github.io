#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Genera la pagina certificaciones/dockerlabs/index.html con los diplomas
obtenidos en https://dockerlabs.es por las maquinas resueltas, y el bloque de
resumen que enlaza a ella desde certificaciones.html.

Los datos salen del perfil publico de DockerLabs, que se sirve en JSON:
    https://dockerlabs.es/u/brandeiks

DockerLabs NO envia cabeceras CORS, asi que el navegador no puede leer ese JSON
desde esta web: por eso todo se escribe EN EL HTML (estatico), igual que la
pagina de videos.

Las miniaturas de los diplomas se guardan reducidas (ANCHO_MINI px) en
assets/certificados/dockerlabs/: la CSP del sitio solo permite imagenes propias
y asi la galeria pesa poco aunque crezca. El diploma a tamano completo se abre
directamente desde DockerLabs.

En certificaciones.html solo se reescribe lo que hay entre las marcas
    <!-- DOCKERLABS:INICIO ... -->   y   <!-- DOCKERLABS:FIN -->
El resto de esa pagina se sigue editando a mano.

Requiere Pillow (pip install pillow) para reducir las imagenes.

Uso:
    python3 scripts/generar_certificados_dockerlabs.py

Este script lo ejecuta automaticamente el flujo de trabajo
.github/workflows/actualizar-certificados.yml todas las noches.
"""

import datetime
import html
import io
import json
import os
import re
import sys
import urllib.request

# La consola de Windows usa cp1252 y no puede escribir los acentos.
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except (AttributeError, ValueError):
    pass

try:
    from PIL import Image
except ImportError:
    print("ERROR: falta Pillow. Instalalo con:  pip install pillow")
    sys.exit(1)

# ------------------------------------------------------------------ ajustes
SLUG = "brandeiks"
BASE = "https://dockerlabs.es"
API_PERFIL = BASE + "/u/" + SLUG          # JSON
PERFIL_WEB = BASE + "/perfil/" + SLUG     # misma informacion, en HTML
SITIO = "https://brandeiks.github.io/"

# raiz del repositorio = carpeta padre de scripts/
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RESUMEN = os.path.join(RAIZ, "certificaciones.html")
GALERIA = os.path.join(RAIZ, "certificaciones", "dockerlabs", "index.html")
GALERIA_WEB = "certificaciones/dockerlabs/index.html"
CARPETA_IMG = os.path.join(RAIZ, "assets", "certificados", "dockerlabs")
RUTA_IMG_WEB = "assets/certificados/dockerlabs/"

# La galeria esta dos carpetas por debajo de la raiz
SUBIR = "../../"

INICIO = "<!-- DOCKERLABS:INICIO"
FIN = "<!-- DOCKERLABS:FIN -->"

# Miniaturas: el diploma original mide 1536x1024 (~70 KB). A 640 px de ancho
# se ve nitido en las tarjetas y pesa unas tres veces menos.
ANCHO_MINI = 640
CALIDAD_MINI = 80

# Los identificadores de certificado se usan como nombre de archivo: solo se
# acepta el formato que emite DockerLabs (DL- y 6 hexadecimales).
CERT_ID_OK = re.compile(r"^DL-[0-9A-F]{6}$")

# Dificultades en el mismo orden y con las mismas clases que /writeups/
DIFICULTADES = [
    ("Muy Fácil", "muy-facil", "MUY FÁCIL"),
    ("Fácil", "facil", "FÁCIL"),
    ("Medio", "medio", "MEDIO"),
    ("Difícil", "dificil", "DIFÍCIL"),
]
CLASE_DIF = {d[0]: d[1] for d in DIFICULTADES}
TEXTO_DIF = {d[0]: d[2] for d in DIFICULTADES}

# Hora de Peru (UTC-5, sin horario de verano) para mostrar las fechas
PERU = datetime.timezone(datetime.timedelta(hours=-5))

UA = "Mozilla/5.0 (brandeiks.github.io; generar_certificados_dockerlabs.py)"

# Icono de la pestana: la "B" negra sobre cuadrado verde (igual que el resto)
FAVICON = (
    "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20"
    "viewBox='0%200%2064%2064'%3E%3Crect%20width='64'%20height='64'%20rx='13'%20"
    "fill='%2300ff88'/%3E%3Ctext%20x='32'%20y='34'%20text-anchor='middle'%20"
    "dominant-baseline='central'%20font-family='Arial%20Black,%20Arial,%20"
    "Helvetica,%20sans-serif'%20font-size='46'%20font-weight='900'%20"
    "fill='%23050a0e'%3EB%3C/text%3E%3C/svg%3E"
)

# ------------------------------------------------------------------ estilo
# Mismo lenguaje visual que videos/ y writeups/ (nav, hero, barra de filtros),
# mas las tarjetas de diploma.
CSS = """
    :root {
      --bg:        #050a0e;
      --bg2:       #080f14;
      --bg3:       #0a1520;
      --green:     #00ff88;
      --cyan:      #00e5ff;
      --red:       #ff2d55;
      --yellow:    #ffd700;
      --dim:       #1a2a2e;
      --text:      #c8d8e0;
      --text-dim:  #4a6a74;
      --font-mono: 'Share Tech Mono', monospace;
      --font-main: 'Rajdhani', sans-serif;
      --font-disp: 'Orbitron', sans-serif;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: var(--bg); color: var(--text); font-family: var(--font-main);
      overflow-x: hidden; line-height: 1.6;
    }
    body::before {
      content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 9998;
      background: repeating-linear-gradient(0deg, rgba(0,255,136,0.02) 0 1px, transparent 1px 3px);
      opacity: 0.5;
    }
    a { color: inherit; }
    ::selection { background: var(--green); color: var(--bg); }

    /* nav */
    nav {
      position: fixed; top: 0; left: 0; right: 0; z-index: 500;
      display: flex; justify-content: space-between; align-items: center;
      padding: 1.2rem 4rem; background: rgba(5,10,14,0.85);
      backdrop-filter: blur(10px); border-bottom: 1px solid rgba(0,255,136,0.08);
      line-height: normal; /* igual que en el resto del sitio, aunque el body use 1.6 */
    }
    .nav-logo {
      font-family: var(--font-disp); font-size: 1rem; color: var(--green);
      letter-spacing: 4px; text-decoration: none;
    }
    .nav-back {
      font-family: var(--font-mono); font-size: 0.78rem; color: var(--text-dim);
      text-decoration: none; letter-spacing: 2px; transition: color 0.3s;
      margin-left: 1.4rem;
    }
    .nav-back:visited, .nav-logo:visited { color: inherit; }
    .nav-back:hover, .nav-back:hover::before { color: var(--green); }

    /* altura del nav: las barras sticky se colocan justo debajo */
    :root { --nav-h: 59px; }
    @media (max-width: 900px) { :root { --nav-h: 40px; } }
    @media (max-width: 700px) { :root { --nav-h: 54px; } }
    @media (max-width: 480px) { :root { --nav-h: 52px; } }

    /* MENU MOVIL */
    .menu-check { position: absolute; opacity: 0; pointer-events: none; }
    .menu-btn { display: none; }

    /* NAV RESPONSIVE */
    @media (max-width: 900px) {
      nav { padding: 0.7rem 1rem; }
      .nav-logo { font-size: 0.85rem; letter-spacing: 2px; }
      .nav-back { font-size: 0.68rem; margin-left: 0.8rem; }
      footer { flex-direction: column; gap: 0.8rem; text-align: center; padding: 1.5rem; }
    }
    @media (max-width: 700px) {
      nav { flex-wrap: wrap; justify-content: space-between; row-gap: 0; padding: 0.6rem 1rem; }
      .nav-logo { font-size: 0.82rem; letter-spacing: 1px; }
      .menu-btn {
        display: flex; align-items: center; justify-content: center;
        width: 40px; height: 34px; cursor: pointer;
        border: 1px solid var(--dim); border-radius: 3px;
      }
      .menu-btn span, .menu-btn span::before, .menu-btn span::after {
        display: block; width: 18px; height: 2px; background: var(--green);
        transition: transform 0.25s, opacity 0.25s;
      }
      .menu-btn span { position: relative; }
      .menu-btn span::before, .menu-btn span::after { content: ''; position: absolute; left: 0; }
      .menu-btn span::before { top: -6px; }
      .menu-btn span::after { top: 6px; }
      .menu-check:checked ~ nav .menu-btn span { background: transparent; }
      .menu-check:checked ~ nav .menu-btn span::before { transform: translateY(6px) rotate(45deg); }
      .menu-check:checked ~ nav .menu-btn span::after { transform: translateY(-6px) rotate(-45deg); }
      .nav-back { display: none; }
      .menu-check:checked ~ nav .nav-back {
        display: block; width: 100%; text-align: center;
        margin: 0; padding: 0.7rem 0; font-size: 0.78rem;
        border-top: 1px solid var(--dim);
      }
    }
    @media (max-width: 480px) {
      nav { padding: 0.55rem 0.8rem; }
      .nav-logo { font-size: 0.76rem; }
      .menu-check:checked ~ nav .nav-back { font-size: 0.72rem; padding: 0.6rem 0; }
    }

    /* hero */
    .hero {
      position: relative; padding: 8rem 1.5rem 3rem; overflow: hidden;
      border-bottom: 1px solid var(--dim);
    }
    .hero-grid {
      position: absolute; inset: 0;
      background-image: linear-gradient(rgba(0,255,136,0.03) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(0,255,136,0.03) 1px, transparent 1px);
      background-size: 60px 60px;
    }
    .hero-glow {
      position: absolute; width: 700px; height: 500px; top: -10%; left: -5%;
      background: radial-gradient(ellipse, rgba(0,255,136,0.07) 0%, transparent 70%);
      pointer-events: none;
    }
    .hero-content { position: relative; z-index: 2; max-width: 1100px; margin: 0 auto; }
    .hero-crumb {
      font-family: var(--font-mono); font-size: 0.72rem; color: var(--text-dim);
      letter-spacing: 2px; margin-bottom: 1rem;
    }
    .hero-crumb a { color: var(--green); text-decoration: none; }
    .hero-crumb a:hover { text-decoration: underline; }
    .hero-title {
      font-family: var(--font-disp); font-size: clamp(2.5rem, 6vw, 4rem);
      font-weight: 900; letter-spacing: 2px; line-height: 1;
    }
    .hero-title span { color: var(--green); }
    .hero-sub {
      font-family: var(--font-mono); font-size: 0.82rem; color: var(--text-dim);
      margin-top: 1rem; letter-spacing: 1px; max-width: 720px;
    }
    .hero-sub a { color: var(--cyan); text-decoration: none; }
    .hero-sub a:hover { text-decoration: underline; }
    .hero .dl-stats { margin-top: 2rem; }
    .hero .dl-progreso { max-width: 720px; }

/*CSS_RESUMEN*/

    /* filtros y buscador */
    .filters-bar {
      position: sticky; top: var(--nav-h); z-index: 90; display: flex; flex-wrap: wrap;
      gap: 0.5rem; padding: 1.2rem 1.5rem; background: rgba(5,10,14,0.92);
      backdrop-filter: blur(10px); border-bottom: 1px solid var(--dim);
      justify-content: center; align-items: center;
    }
    .filter-btn {
      font-family: var(--font-mono); font-size: 0.68rem; letter-spacing: 2px;
      padding: 0.4rem 1rem; border: 1px solid var(--dim); background: transparent;
      color: var(--text-dim); transition: all 0.2s; cursor: pointer;
    }
    .filter-btn:hover { border-color: var(--green); color: var(--green); }
    .filter-btn.active { background: rgba(0,255,136,0.1); border-color: var(--green); color: var(--green); }
    .filter-btn[data-diff="muy-facil"].active { border-color: var(--cyan);   color: var(--cyan);   background: rgba(0,229,255,0.05); }
    .filter-btn[data-diff="medio"].active     { border-color: var(--yellow); color: var(--yellow); background: rgba(255,215,0,0.05); }
    .filter-btn[data-diff="dificil"].active   { border-color: var(--red);    color: var(--red);    background: rgba(255,45,85,0.05); }
    .buscar {
      font-family: var(--font-mono); font-size: 0.72rem; letter-spacing: 1px;
      padding: 0.4rem 0.8rem; width: 220px; max-width: 100%;
      background: var(--bg2); color: var(--text); border: 1px solid var(--dim); outline: none;
    }
    .buscar:focus { border-color: var(--green); }
    .buscar::placeholder { color: var(--text-dim); }

    /* galeria */
    .main { max-width: 1100px; margin: 0 auto; padding: 2.5rem 1.5rem 4rem; }
    .dl-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1.2rem;
    }
    .dl-card {
      border: 1px solid var(--dim); background: var(--bg2);
      display: flex; flex-direction: column;
      position: relative; overflow: hidden;
      transition: border-color 0.3s, transform 0.3s;
    }
    .dl-card::before {
      content: ''; position: absolute; top: 0; left: 0; z-index: 2;
      width: 3px; height: 0; transition: height 0.4s; background: var(--green);
    }
    .dl-card:hover { transform: translateY(-3px); }
    .dl-card:hover::before { height: 100%; }
    .dl-card[data-diff="muy-facil"]::before { background: var(--cyan); }
    .dl-card[data-diff="medio"]::before     { background: var(--yellow); }
    .dl-card[data-diff="dificil"]::before   { background: var(--red); }
    .dl-card[data-diff="muy-facil"]:hover { border-color: rgba(0,229,255,0.3); }
    .dl-card[data-diff="facil"]:hover     { border-color: rgba(0,255,136,0.3); }
    .dl-card[data-diff="medio"]:hover     { border-color: rgba(255,215,0,0.3); }
    .dl-card[data-diff="dificil"]:hover   { border-color: rgba(255,45,85,0.3); }

    .dl-thumb { display: block; aspect-ratio: 3 / 2; overflow: hidden; border-bottom: 1px solid var(--dim); background: var(--bg3); }
    .dl-thumb img {
      display: block; width: 100%; height: 100%; object-fit: cover;
      filter: saturate(0.8) brightness(0.92); transition: transform 0.4s, filter 0.4s;
    }
    .dl-card:hover .dl-thumb img { transform: scale(1.04); filter: none; }

    .dl-body { padding: 1.1rem 1.3rem 1.3rem; display: flex; flex-direction: column; gap: 0.35rem; flex: 1; }
    .dl-top { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; }
    .dl-diff {
      font-family: var(--font-mono); font-size: 0.6rem; letter-spacing: 2px;
      padding: 0.15rem 0.55rem; border: 1px solid;
    }
    .dl-id { font-family: var(--font-mono); font-size: 0.68rem; color: var(--cyan); letter-spacing: 1px; }
    .dl-body h3 { font-family: var(--font-disp); font-size: 0.95rem; letter-spacing: 1px; margin-top: 0.3rem; }
    .dl-fecha { font-family: var(--font-mono); font-size: 0.65rem; color: var(--text-dim); }
    .dl-acciones { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: auto; padding-top: 0.7rem; }
    .dl-btn {
      font-family: var(--font-mono); font-size: 0.65rem; letter-spacing: 2px;
      padding: 0.4rem 0.8rem; border: 1px solid var(--dim);
      color: var(--text-dim); text-decoration: none; transition: border-color 0.2s, color 0.2s;
    }
    .dl-btn:hover { border-color: var(--cyan); color: var(--cyan); }
    .dl-btn-main { border-color: rgba(0,255,136,0.35); color: var(--green); margin-left: auto; }
    .dl-btn-main:hover { border-color: var(--green); color: var(--green); background: rgba(0,255,136,0.06); }

    .sin-resultados {
      display: none; text-align: center; margin-top: 2rem;
      font-family: var(--font-mono); font-size: .78rem; color: var(--text-dim); letter-spacing: 2px;
    }
    .pie-galeria { display: flex; flex-wrap: wrap; gap: 1rem; justify-content: center; margin-top: 3rem; }
    .pie-galeria a { text-decoration: none; padding: .7rem 1.6rem; }
    .nota { text-align: center; margin-top: 1.5rem; font-family: var(--font-mono); font-size: .62rem; color: var(--text-dim); letter-spacing: 1px; }

    .reveal { opacity: 0; transform: translateY(24px); transition: opacity 0.6s ease, transform 0.6s ease; }
    .reveal.visible { opacity: 1; transform: translateY(0); }

    footer {
      padding: 2rem 4rem; border-top: 1px solid var(--dim);
      display: flex; justify-content: space-between;
      align-items: center; margin-top: 4rem;
    }
    footer p { font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-dim); letter-spacing: 1px; }
    footer span { color: var(--green); }

    @media (max-width: 768px) {
      .hero { padding: 6rem 1rem 2rem; }
      .main { padding: 1.5rem 1rem 3rem; }
      .dl-grid { grid-template-columns: 1fr; }
      .buscar { width: 100%; }
    }
"""

# Estilos del resumen (contadores + barra de progreso). Se usan en la galeria
# y se copian tal cual en certificaciones.html, dentro de su <style>.
CSS_RESUMEN = """    .diff-muy-facil { color: var(--cyan);   border-color: rgba(0,229,255,0.4);  background: rgba(0,229,255,0.05); }
    .diff-facil     { color: var(--green);  border-color: rgba(0,255,136,0.4);  background: rgba(0,255,136,0.05); }
    .diff-medio     { color: var(--yellow); border-color: rgba(255,215,0,0.4);  background: rgba(255,215,0,0.05); }
    .diff-dificil   { color: var(--red);    border-color: rgba(255,45,85,0.4);  background: rgba(255,45,85,0.05); }
    .dl-stats { display: flex; flex-wrap: wrap; gap: 2.5rem; margin-bottom: 1.4rem; }
    .dl-stat { font-family: var(--font-mono); }
    .dl-num { display: block; font-size: 1.8rem; line-height: 1; color: var(--green); }
    .dl-lbl { display: block; font-size: 0.62rem; letter-spacing: 2px; color: var(--text-dim); margin-top: 0.3rem; }
    .dl-prog-top {
      display: flex; justify-content: space-between; gap: 1rem;
      font-family: var(--font-mono); font-size: 0.65rem; letter-spacing: 2px; color: var(--text-dim);
      margin-bottom: 0.5rem;
    }
    .dl-barra { height: 6px; background: var(--dim); overflow: hidden; }
    .dl-barra span {
      display: block; height: 100%; min-width: 4px;
      background: linear-gradient(90deg, var(--cyan), var(--green));
      box-shadow: 0 0 10px rgba(0,255,136,0.5);
    }
    .dl-difs { font-family: var(--font-mono); font-size: 0.62rem; letter-spacing: 1px; color: var(--text-dim); margin-top: 0.6rem; }
    .dl-difs span { background: none; }
    @media (max-width: 768px) {
      .dl-stats { gap: 1.5rem; }
      .dl-prog-top { flex-direction: column; gap: 0.2rem; }
    }"""


# ------------------------------------------------------------------ descarga
def bajar(url, timeout=45):
    peticion = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(peticion, timeout=timeout) as r:
        return r.read()


def url_dockerlabs(ruta):
    """Convierte una ruta relativa del JSON en URL absoluta de DockerLabs.
    Cualquier otra cosa (otro dominio, javascript:, etc.) se descarta."""
    if isinstance(ruta, str) and re.match(r"^/[A-Za-z0-9/_.-]+$", ruta):
        return BASE + ruta
    return None


def writeup_local(url):
    """Si el writeup es de esta misma web y existe, devuelve la ruta desde la raiz."""
    if not isinstance(url, str) or not url.startswith(SITIO):
        return None
    ruta = url[len(SITIO):]
    if not re.match(r"^[a-z0-9/_.-]+\.html$", ruta):
        return None
    return ruta if os.path.isfile(os.path.join(RAIZ, *ruta.split("/"))) else None


def fecha_corta(iso):
    try:
        f = datetime.datetime.strptime(iso, "%Y-%m-%dT%H:%M:%SZ")
    except (TypeError, ValueError):
        return ""
    return f.replace(tzinfo=datetime.timezone.utc).astimezone(PERU).strftime("%d/%m/%Y")


def es_webp(datos):
    return len(datos) > 12 and datos[:4] == b"RIFF" and datos[8:12] == b"WEBP"


def miniatura_ok(ruta):
    try:
        with Image.open(ruta) as im:
            return im.width == ANCHO_MINI
    except Exception:
        return False


def sincronizar_imagenes(certs):
    """Crea las miniaturas que falten y borra las de certificados que ya no
    aparecen. Un diploma no cambia una vez emitido, asi que no se re-descarga."""
    os.makedirs(CARPETA_IMG, exist_ok=True)
    for c in certs:
        destino = os.path.join(CARPETA_IMG, c["cert_id"] + ".webp")
        if miniatura_ok(destino):
            continue
        datos = bajar(c["imagen"])
        if not es_webp(datos):
            raise ValueError("la imagen de %s no es un WebP valido" % c["cert_id"])
        with Image.open(io.BytesIO(datos)) as im:
            alto = round(im.height * ANCHO_MINI / im.width)
            im.convert("RGB").resize((ANCHO_MINI, alto), Image.LANCZOS).save(
                destino, "WEBP", quality=CALIDAD_MINI, method=6)
        print("   miniatura: %s.webp (%.0f KB)"
              % (c["cert_id"], os.path.getsize(destino) / 1024))

    validos = {c["cert_id"] + ".webp" for c in certs}
    for nombre in os.listdir(CARPETA_IMG):
        if nombre.endswith(".webp") and nombre not in validos:
            os.remove(os.path.join(CARPETA_IMG, nombre))
            print("   imagen retirada: %s" % nombre)


# ------------------------------------------------------------------ datos
def preparar(perfil):
    """Extrae del JSON solo lo que se muestra, ya validado."""
    writeups = {}
    for m in perfil.get("maquinas_hechas") or []:
        cid = (m.get("certificado") or {}).get("cert_id")
        if cid:
            writeups[cid] = writeup_local(m.get("writeup_url"))
    # Plan B por nombre de maquina: DockerLabs puede emitir el diploma de una
    # maquina que aun no figura en maquinas_hechas (paso con FirstHacking).
    writeups_nombre = {}
    for w in perfil.get("writeups") or []:
        if isinstance(w.get("maquina"), str):
            writeups_nombre[w["maquina"].lower()] = writeup_local(w.get("url"))

    certs = []
    for c in perfil.get("certificados") or []:
        cid = c.get("cert_id")
        if not c.get("generado") or not isinstance(cid, str) or not CERT_ID_OK.match(cid):
            continue
        imagen, pdf, verificar = (url_dockerlabs(c.get(k)) for k in
                                  ("imagen_url", "pdf_url", "verify_url"))
        if not (imagen and pdf and verificar):
            continue
        certs.append({
            "cert_id": cid,
            "maquina": str(c.get("maquina") or "?"),
            "dificultad": str(c.get("dificultad") or ""),
            "emitido": c.get("emitido_el") or "",
            "imagen": imagen,
            "pdf": pdf,
            "verificar": verificar,
            "writeup": (writeups.get(cid)
                        or writeups_nombre.get(str(c.get("maquina") or "").lower())),
        })

    # los mas recientes primero; a igual fecha, por nombre de maquina
    certs.sort(key=lambda c: c["maquina"].lower())
    certs.sort(key=lambda c: c["emitido"], reverse=True)
    return certs


def numero(v):
    return v if isinstance(v, int) and v >= 0 else 0


# ------------------------------------------------------------------ plantillas
def resumen(perfil, certs):
    """Contadores + barra de progreso (comun a la galeria y al resumen)."""
    est = perfil.get("estadisticas") or {}
    prog = perfil.get("progreso") or {}
    hechas = numero(prog.get("maquinas_hechas"))
    totales = numero(prog.get("maquinas_totales"))
    pct = round(100.0 * hechas / totales, 1) if totales else 0.0

    stats = [
        (numero(est.get("maquinas_hechas")), "MÁQUINAS RESUELTAS"),
        (len(certs), "DIPLOMAS"),
        (numero(est.get("writeups_publicados")), "WRITEUPS PUBLICADOS"),
    ]
    if numero(est.get("ranking_writeups")):
        stats.append(("#%d" % est["ranking_writeups"], "RANKING WRITEUPS"))
    stats_html = "\n".join(
        '        <div class="dl-stat"><span class="dl-num">%s</span>'
        '<span class="dl-lbl">%s</span></div>' % (n, k) for n, k in stats)

    por_dif = prog.get("por_dificultad") or {}
    difs = []
    for nombre, clase, texto in DIFICULTADES:
        d = por_dif.get(nombre) or {}
        if numero(d.get("totales")):
            difs.append('<span class="diff-%s">%s %d/%d</span>'
                        % (clase, texto, numero(d.get("hechas")), d["totales"]))

    return """      <div class="dl-stats">
{stats}
      </div>
      <div class="dl-progreso">
        <div class="dl-prog-top"><span>PROGRESO DEL CATÁLOGO</span><span>{hechas} / {totales} · {pct_txt} %</span></div>
        <div class="dl-barra"><span style="width:{pct}%"></span></div>
        <div class="dl-difs">{difs}</div>
      </div>""".format(
        stats=stats_html, hechas=hechas, totales=totales, pct=pct,
        pct_txt=("%.1f" % pct).replace(".", ","), difs=" · ".join(difs))


def bloque_resumen(perfil, certs):
    """Lo que va entre las marcas de certificaciones.html: una sola tarjeta que
    enlaza a la galeria, para no tapar al resto de certificaciones."""
    return """{inicio} (generado por scripts/generar_certificados_dockerlabs.py; no editar a mano) -->
    <div class="cat-header" style="margin-top:3.5rem;">
      <span class="cat-label">// DOCKERLABS · LABORATORIOS RESUELTOS</span>
      <div class="cat-line"></div>
    </div>

    <a href="{galeria}" class="dl-resumen reveal">
{resumen}
      <div class="dl-resumen-pie">
        <span>Un diploma de DockerLabs por cada máquina resuelta, verificable con su identificador.</span>
        <span class="dl-ver">VER LOS {n} DIPLOMAS →</span>
      </div>
    </a>
    {fin}""".format(inicio=INICIO, fin=FIN, galeria=GALERIA_WEB,
                    resumen=resumen(perfil, certs), n=len(certs))


def tarjeta(c):
    clase = CLASE_DIF.get(c["dificultad"], "otra")
    dif = TEXTO_DIF.get(c["dificultad"], c["dificultad"].upper() or "—")
    maquina = html.escape(c["maquina"])
    writeup = ""
    if c["writeup"]:
        writeup = ('\n            <a href="%s" class="dl-btn dl-btn-main">WRITEUP →</a>'
                   % html.escape(SUBIR + c["writeup"]))
    return """      <article class="dl-card reveal" data-diff="{clase}" data-nombre="{buscar}">
        <a class="dl-thumb" href="{completa}" target="_blank" rel="noopener noreferrer" title="Ver el diploma a tamaño completo">
          <img src="{mini}" alt="Diploma de DockerLabs por resolver la máquina {maquina}" width="{ancho}" height="{alto}" loading="lazy">
        </a>
        <div class="dl-body">
          <div class="dl-top">
            <span class="dl-diff diff-{clase}">{dif}</span>
            <span class="dl-id">{cid}</span>
          </div>
          <h3>{maquina}</h3>
          <p class="dl-fecha">📅 Emitido el {fecha}</p>
          <div class="dl-acciones">
            <a href="{pdf}" class="dl-btn" target="_blank" rel="noopener noreferrer">PDF</a>
            <a href="{verificar}" class="dl-btn" target="_blank" rel="noopener noreferrer">VERIFICAR</a>{writeup}
          </div>
        </div>
      </article>""".format(
        clase=clase, buscar=html.escape(c["maquina"].lower()),
        completa=html.escape(c["imagen"]), mini=SUBIR + RUTA_IMG_WEB + c["cert_id"] + ".webp",
        ancho=ANCHO_MINI, alto=ANCHO_MINI * 2 // 3, maquina=maquina, dif=dif,
        cid=c["cert_id"], fecha=fecha_corta(c["emitido"]), pdf=html.escape(c["pdf"]),
        verificar=html.escape(c["verificar"]), writeup=writeup)


def pagina_galeria(perfil, certs):
    presentes = {c["dificultad"] for c in certs}
    botones = ['<button class="filter-btn active" data-diff="all">TODOS</button>']
    for nombre, clase, texto in DIFICULTADES:
        if nombre in presentes:
            botones.append('<button class="filter-btn" data-diff="%s">%s</button>'
                           % (clase, texto))
    botones.append('<input type="search" class="buscar" id="buscar" '
                   'placeholder="Buscar máquina…" aria-label="Buscar máquina" autocomplete="off">')

    titulo = "Diplomas de DockerLabs | Brandeiks"
    desc = ("Diplomas de DockerLabs obtenidos por Brandon Zevallos Pastrana al resolver "
            "máquinas de hacking ético, verificables con su identificador.")
    url = SITIO + GALERIA_WEB
    ld = json.dumps({
        "@context": "https://schema.org", "@type": "CollectionPage", "name": titulo,
        "description": desc, "url": url, "inLanguage": "es",
        "author": {"@type": "Person", "name": "Brandon Zevallos Pastrana", "url": SITIO},
    }, ensure_ascii=False)

    return """<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'self'; form-action 'none'; object-src 'none'">
<meta name="referrer" content="strict-origin-when-cross-origin">
<title>{titulo}</title>
<meta name="description" content="{desc}">
<meta name="author" content="Brandon Zevallos Pastrana">
  <link rel="canonical" href="{url}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Brandeiks">
  <meta property="og:title" content="{titulo}">
  <meta property="og:description" content="{desc}">
  <meta property="og:url" content="{url}">
  <meta property="og:image" content="{sitio}assets/og/certificaciones.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:locale" content="es_ES">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{titulo}">
  <meta name="twitter:description" content="{desc}">
  <meta name="twitter:image" content="{sitio}assets/og/certificaciones.png">
  <script type="application/ld+json">{ld}</script>
<link rel="icon" type="image/svg+xml" href="{favicon}">
<link rel="apple-touch-icon" href="{favicon}">
<link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Rajdhani:wght@300;400;600;700&family=Orbitron:wght@400;700;900&display=swap" rel="stylesheet" />
<style>
{css}
</style>
</head>
<body>

  <input type="checkbox" id="menuAbierto" class="menu-check" aria-hidden="true">
  <nav>
    <a href="{s}index.html" class="nav-logo">BRANDEIKS_SEC</a>
    <label for="menuAbierto" class="menu-btn" aria-label="Abrir menú"><span></span></label>
    <a href="{s}index.html" class="nav-back">INICIO</a>
    <a href="{s}videos/index.html" class="nav-back">VÍDEOS</a>
    <a href="{s}writeups/index.html" class="nav-back">WRITEUPS</a>
    <a href="{s}diccionario/index.html" class="nav-back">DICCIONARIO</a>
    <a href="{s}comandos/index.html" class="nav-back">COMANDOS</a>
    <a href="{s}certificaciones.html" class="nav-back">CERTIFICACIONES</a>
  </nav>

<!-- HERO -->
<div class="hero">
  <div class="hero-grid"></div>
  <div class="hero-glow"></div>
  <div class="hero-content">
    <p class="hero-crumb"><a href="{s}certificaciones.html">// CERTIFICACIONES</a> / DOCKERLABS</p>
    <h1 class="hero-title">DOCKER<span>LABS</span></h1>
    <p class="hero-sub">Diplomas emitidos por <a href="{perfil}" target="_blank" rel="noopener noreferrer">DockerLabs</a> al resolver cada máquina. Cada uno se puede verificar con su identificador.</p>
{resumen}
  </div>
</div>

<!-- FILTROS -->
<div class="filters-bar">
  {filtros}
</div>

<main class="main">
  <div class="dl-grid">
{tarjetas}
  </div>

  <p class="sin-resultados" id="sinResultados">NINGÚN DIPLOMA COINCIDE CON EL FILTRO</p>

  <div class="pie-galeria">
    <a href="{s}certificaciones.html" class="filter-btn">← VOLVER A CERTIFICACIONES</a>
    <a href="{perfil}" target="_blank" rel="noopener noreferrer" class="filter-btn">VER MI PERFIL EN DOCKERLABS →</a>
  </div>

  <p class="nota">Lista actualizada automáticamente desde el perfil público de DockerLabs.</p>
</main>

<footer>
    <p>© {anio} <span>Brandon Zevallos Pastrana</span> — Diplomas de DockerLabs</p>
    <p>Hecho con <span>kali linux</span> &amp; <span>❤</span></p>
  </footer>

<script>
  // El cursor personalizado lo gestiona assets/cursor.js (unico para todo el sitio).

  const obs = new IntersectionObserver(entries => {{
    entries.forEach((e, i) => {{
      if (e.isIntersecting) {{
        setTimeout(() => e.target.classList.add('visible'), i * 70);
        obs.unobserve(e.target);
      }}
    }});
  }}, {{ threshold: 0.06 }});
  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));

  // Filtro por dificultad + busqueda por nombre (se combinan)
  const botones = document.querySelectorAll('.filter-btn[data-diff]');
  const buscar = document.getElementById('buscar');
  let dif = 'all';
  function aplicar() {{
    const q = buscar.value.trim().toLowerCase();
    let visibles = 0;
    document.querySelectorAll('.dl-card').forEach(card => {{
      const ok = (dif === 'all' || card.dataset.diff === dif)
              && (!q || card.dataset.nombre.includes(q));
      card.style.display = ok ? '' : 'none';
      if (ok) {{ card.classList.add('visible'); visibles++; }}
    }});
    document.getElementById('sinResultados').style.display = visibles ? 'none' : 'block';
  }}
  botones.forEach(b => b.addEventListener('click', () => {{
    botones.forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    dif = b.dataset.diff;
    aplicar();
  }}));
  buscar.addEventListener('input', aplicar);
</script>
<script src="{s}assets/cursor.js" defer></script>
</body>
</html>
""".format(
        titulo=titulo, desc=html.escape(desc), url=url, sitio=SITIO,
        ld=ld.replace("</", "<\\/"), favicon=FAVICON,
        css=CSS.replace("/*CSS_RESUMEN*/", CSS_RESUMEN), s=SUBIR, perfil=PERFIL_WEB,
        resumen=resumen(perfil, certs), filtros="\n  ".join(botones),
        tarjetas="\n".join(tarjeta(c) for c in certs),
        anio=datetime.date.today().year)


# ------------------------------------------------------------------ escritura
def escribir_si_cambia(ruta, contenido):
    anterior = None
    if os.path.exists(ruta):
        with open(ruta, encoding="utf-8", newline="") as f:
            anterior = f.read()
    if anterior == contenido:
        return False
    os.makedirs(os.path.dirname(ruta), exist_ok=True)
    with open(ruta, "w", encoding="utf-8", newline="\n") as f:
        f.write(contenido)
    return True


# ------------------------------------------------------------------ principal
def main():
    print("Leyendo el perfil publico de DockerLabs: %s" % API_PERFIL)
    try:
        perfil = json.loads(bajar(API_PERFIL).decode("utf-8"))
    except Exception as e:
        print("ERROR: no se pudo leer el perfil: %s" % e)
        return 1

    if (perfil.get("slug") or "").lower() != SLUG:
        print("ERROR: el JSON no corresponde al perfil '%s'; no se toca nada." % SLUG)
        return 1

    certs = preparar(perfil)
    if not certs:
        # Si DockerLabs falla o el perfil pasa a privado, mejor dejar las
        # paginas como estaban que publicarlas vacias.
        print("ERROR: el perfil no trae ningun certificado valido; no se toca nada.")
        return 1

    print("Certificados encontrados: %d" % len(certs))
    for c in certs:
        print("   %s  %-10s %-12s %s" % (c["cert_id"], c["dificultad"],
                                       c["maquina"], c["writeup"] or "(sin writeup local)"))

    with open(RESUMEN, encoding="utf-8", newline="") as f:
        cert_html = f.read()
    i, j = cert_html.find(INICIO), cert_html.find(FIN)
    if i < 0 or j < i:
        print("ERROR: no se encuentran las marcas DOCKERLABS en certificaciones.html.")
        return 1

    try:
        sincronizar_imagenes(certs)
    except Exception as e:
        print("ERROR: no se pudieron preparar las imagenes: %s" % e)
        return 1

    cambios = 0
    if escribir_si_cambia(GALERIA, pagina_galeria(perfil, certs)):
        print("Galeria actualizada: %s" % GALERIA)
        cambios += 1
    nuevo = cert_html[:i] + bloque_resumen(perfil, certs) + cert_html[j + len(FIN):]
    if escribir_si_cambia(RESUMEN, nuevo):
        print("Resumen actualizado en: %s" % RESUMEN)
        cambios += 1
    if not cambios:
        print("\nSin cambios: todo estaba al dia.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
