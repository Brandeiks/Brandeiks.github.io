#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Genera videos/index.html con los videos del canal de YouTube
"Abogado Cibernetico", usando el mismo diseno del resto del sitio.

Los datos salen del feed RSS publico del canal (no hace falta clave de API):
    https://www.youtube.com/feeds/videos.xml?channel_id=UCgipGAOra-KHwucH6Pjb3aw

El feed de YouTube NO envia cabeceras CORS, asi que el navegador no puede
leerlo directamente: por eso la lista se escribe EN EL HTML (estatica). Asi la
pagina se ve siempre, sin depender de servicios de terceros ni de JavaScript.

Uso:
    python3 scripts/generar_videos.py

Este script lo ejecuta automaticamente el flujo de trabajo
.github/workflows/actualizar-videos.yml todas las noches.
"""

import datetime
import html
import json
import os
import re
import sys
import urllib.request

# ------------------------------------------------------------------ ajustes
# El canal de YouTube y la ruta de salida. Para cambiar de canal basta con
# sustituir CANAL_ID por el del canal nuevo (esta en el feed y en la URL).
CANAL_ID = "UCgipGAOra-KHwucH6Pjb3aw"
CANAL_URL = "https://www.youtube.com/@AbogadoCibernetico"
FEED = "https://www.youtube.com/feeds/videos.xml?channel_id=" + CANAL_ID

# raiz del repositorio = carpeta padre de scripts/
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SALIDA = os.path.join(RAIZ, "videos", "index.html")

MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
         "agosto", "septiembre", "octubre", "noviembre", "diciembre"]

# ------------------------------------------------------------------ estilo
# Se reutiliza el CSS de la pagina de writeups y se anaden las reglas de las
# tarjetas de video. Incrustado aqui para que el script no dependa de nada.
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
    ::-webkit-scrollbar { width: 8px; }
    ::-webkit-scrollbar-track { background: var(--bg2); }
    ::-webkit-scrollbar-thumb { background: var(--dim); }
    ::-webkit-scrollbar-thumb:hover { background: var(--green); }

    /* cursor */
    .cursor {
      position: fixed; width: 8px; height: 8px; background: var(--green);
      border-radius: 50%; pointer-events: none; z-index: 10000;
      transform: translate(-50%,-50%); opacity: 0; transition: opacity .3s;
    }
    .cursor-ring {
      position: fixed; width: 36px; height: 36px; border: 1px solid rgba(0,255,136,0.5);
      border-radius: 50%; pointer-events: none; z-index: 9999;
      transform: translate(-50%,-50%); opacity: 0; transition: opacity .3s, width .3s, height .3s;
    }
    @media (max-width: 768px) { .cursor, .cursor-ring { display: none; } }

    /* nav */
    nav {
      position: fixed; top: 0; left: 0; right: 0; z-index: 100;
      display: flex; justify-content: space-between; align-items: center;
      padding: 1rem 1.5rem; background: rgba(5,10,14,0.85);
      backdrop-filter: blur(10px); border-bottom: 1px solid var(--dim);
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
    .nav-back:hover { color: var(--green); }

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
    .hero-label {
      font-family: var(--font-mono); font-size: 0.72rem; color: var(--green);
      letter-spacing: 4px; margin-bottom: 1rem;
    }
    .hero-title {
      font-family: var(--font-disp); font-size: clamp(2.5rem, 6vw, 4rem);
      font-weight: 900; letter-spacing: 2px; line-height: 1;
    }
    .hero-title span { color: var(--green); }
    .hero-sub {
      font-family: var(--font-mono); font-size: 0.82rem; color: var(--text-dim);
      margin-top: 1rem; letter-spacing: 1px; max-width: 720px;
    }
    .hero-stats { display: flex; gap: 2.5rem; margin-top: 2rem; flex-wrap: wrap; }
    .stat { font-family: var(--font-mono); }
    .stat-num { font-size: 1.8rem; color: var(--green); display: block; line-height: 1; }
    .stat-label { font-size: 0.65rem; color: var(--text-dim); letter-spacing: 2px; margin-top: 0.2rem; }

    /* filtros */
    .filters-bar {
      position: sticky; top: 57px; z-index: 90; display: flex; flex-wrap: wrap;
      gap: 0.5rem; padding: 1.2rem 1.5rem; background: rgba(5,10,14,0.92);
      backdrop-filter: blur(10px); border-bottom: 1px solid var(--dim);
      max-width: 100%; justify-content: center;
    }
    .filter-btn {
      font-family: var(--font-mono); font-size: 0.68rem; letter-spacing: 2px;
      padding: 0.4rem 1rem; border: 1px solid var(--dim); background: transparent;
      color: var(--text-dim); transition: all 0.2s; cursor: pointer;
    }
    .filter-btn:hover { border-color: var(--green); color: var(--green); }
    .filter-btn.active { background: rgba(0,255,136,0.1); border-color: var(--green); color: var(--green); }

    /* contenido */
    .main { max-width: 1100px; margin: 0 auto; padding: 2.5rem 1.5rem 4rem; }
    .cards-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1.2rem;
    }
    .writeup-card {
      background: var(--bg2); border: 1px solid var(--dim); position: relative;
      overflow: hidden; transition: border-color 0.3s, transform 0.3s;
      text-decoration: none; color: inherit; display: block;
    }
    .writeup-card::before {
      content: ''; position: absolute; top: 0; left: 0; width: 3px; height: 0;
      transition: height 0.4s; background: var(--red); z-index: 3;
    }
    .writeup-card:hover { transform: translateY(-4px); border-color: rgba(255,45,85,0.3); }
    .writeup-card:hover::before { height: 100%; }
    .card-top {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 1rem;
    }
    .card-platform { font-family: var(--font-mono); font-size: 0.62rem; color: var(--text-dim); letter-spacing: 2px; }
    .card-name {
      font-family: var(--font-disp); font-size: 1.15rem; font-weight: 700;
      letter-spacing: 1px; margin-bottom: 0.6rem;
    }
    .card-tags { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 1.2rem; }
    .card-tag {
      font-family: var(--font-mono); font-size: 0.62rem; color: var(--cyan);
      border: 1px solid rgba(0,229,255,0.2); padding: 0.15rem 0.5rem; letter-spacing: 1px;
    }
    .card-footer { display: flex; justify-content: space-between; align-items: center; }
    .card-date { font-family: var(--font-mono); font-size: 0.65rem; color: var(--text-dim); }
    .card-arrow {
      font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-dim);
      transition: color 0.2s, transform 0.2s; display: inline-block;
    }
    .writeup-card:hover .card-arrow { color: var(--green); transform: translateX(4px); }

    /* tarjetas de video */
    .video-thumb {
      position: relative; aspect-ratio: 16/9; overflow: hidden;
      background: var(--bg3); border-bottom: 1px solid var(--dim);
    }
    .video-thumb img {
      width: 100%; height: 100%; object-fit: cover; display: block;
      transition: transform 0.4s, filter 0.4s; filter: saturate(0.75) contrast(1.05);
    }
    .writeup-card:hover .video-thumb img { transform: scale(1.06); filter: saturate(1); }
    .video-play {
      position: absolute; inset: 0; display: flex; align-items: center;
      justify-content: center; font-size: 2.2rem; color: var(--green);
      text-shadow: 0 0 18px rgba(0,255,136,0.6); opacity: 0.85;
      transition: opacity .3s, transform .3s;
    }
    .writeup-card:hover .video-play { opacity: 1; transform: scale(1.12); }
    .video-card .card-top { margin-bottom: .7rem; }
    .video-card .card-name { margin-bottom: .8rem; line-height: 1.35; font-size: 1.05rem; }

    .reveal { opacity: 0; transform: translateY(24px); transition: opacity 0.6s ease, transform 0.6s ease; }
    .reveal.visible { opacity: 1; transform: translateY(0); }

    footer {
      border-top: 1px solid var(--dim); padding: 2rem 1.5rem; text-align: center;
    }
    footer p { font-family: var(--font-mono); font-size: 0.7rem; color: var(--text-dim); letter-spacing: 1px; }
    footer span { color: var(--green); }

    @media (max-width: 768px) {
      nav { padding: 0.8rem 1rem; }
      .nav-logo { font-size: 0.85rem; letter-spacing: 2px; }
      .nav-back { font-size: 0.68rem; margin-left: 0.8rem; }
      .hero { padding: 6rem 1rem 2rem; }
      .main { padding: 1.5rem 1rem 3rem; }
      .cards-grid { grid-template-columns: 1fr; }
      .hero-stats { gap: 1.5rem; }
      .filters-bar { top: 49px; }
    }
"""

# ------------------------------------------------------------------ lectura del feed
def leer_feed():
    peticion = urllib.request.Request(FEED, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(peticion, timeout=45) as r:
        return r.read().decode("utf-8")


def parsear(xml):
    videos = []
    for m in re.finditer(r"<entry>([\s\S]*?)</entry>", xml):
        e = m.group(1)
        vid = re.search(r"<yt:videoId>([^<]+)</yt:videoId>", e)
        tit = re.search(r"<title>([^<]+)</title>", e)
        pub = re.search(r"<published>([^<]+)</published>", e)
        if not (vid and tit):
            continue
        fecha = None
        if pub:
            try:
                fecha = datetime.datetime.strptime(pub.group(1)[:10], "%Y-%m-%d")
            except ValueError:
                pass
        videos.append({
            "id": vid.group(1),
            "titulo": html.unescape(tit.group(1)),
            "fecha": fecha,
            "url": "https://www.youtube.com/watch?v=" + vid.group(1),
            "miniatura": "https://i.ytimg.com/vi/%s/hqdefault.jpg" % vid.group(1),
        })
    videos.sort(key=lambda v: v["fecha"] or datetime.datetime.min, reverse=True)
    return videos


# ------------------------------------------------------------------ clasificacion
# El canal mezcla derecho y ciberseguridad. "abogado" NO clasifica como derecho
# por si solo: un video de ciberseguridad hecho por un abogado no es juridico.
CLASES = [
    ("PRESENTACIÓN", ["whoami", "presentación", "presentacion", "bienvenid",
                      "futuro del canal", "mi canal"]),
    ("DERECHO", ["ley ", "ley n", "artículo", "articulo", "código", "codigo",
                 "penal", "delito", "jurídic", "juridic", "normativ",
                 "constituci", "tribunal", "sentencia", "ciberderecho",
                 "protección de datos", "proteccion de datos"]),
    ("TUTORIAL", ["tutorial", "cómo ", "como ", "guía", "guia", "instalar",
                  "configurar", "wallpaper", "paso a paso", "personalizar"]),
    ("CIBERSEGURIDAD", ["kali", "linux", "hack", "nmap", "burp", "metasploit",
                        "pentest", "ctf", "vulnerab", "ciber", "seguridad",
                        "malware", "phishing", "osint", "forense", "wifi"]),
]


def clasificar(titulo):
    t = " " + titulo.lower() + " "
    for nombre, claves in CLASES:
        if any(k in t for k in claves):
            return nombre
    return "OTROS"


def etiquetas(titulo):
    halladas = []
    for clave, etq in [("kali", "Kali Linux"), ("linux", "Linux"), ("ley", "Ley"),
                       ("artículo", "Artículo"), ("articulo", "Artículo"),
                       ("ciber", "Ciberseguridad"), ("wallpaper", "Wallpaper"),
                       ("whoami", "Presentación"), ("abogado", "Derecho")]:
        if clave in titulo.lower() and etq not in halladas:
            halladas.append(etq)
    return halladas[:4] or ["Vídeo"]


# ------------------------------------------------------------------ plantilla
def tarjeta(v, i):
    clase = clasificar(v["titulo"])
    fecha = ("%s %d" % (MESES[v["fecha"].month - 1].capitalize(), v["fecha"].year)
             if v["fecha"] else "")
    etqs = "".join('<span class="card-tag">%s</span>' % html.escape(x)
                   for x in etiquetas(v["titulo"]))
    titulo = v["titulo"] if len(v["titulo"]) <= 70 else v["titulo"][:67] + "…"
    return """      <a href="{url}" target="_blank" rel="noopener noreferrer"
         class="writeup-card video-card reveal" data-clase="{clase}" data-i="{i}" style="padding:0">
        <div class="video-thumb">
          <img src="{mini}" alt="{alt}" loading="lazy" />
          <span class="video-play">▶</span>
        </div>
        <div style="padding:1.3rem 1.5rem 1.5rem">
          <div class="card-top">
            <span class="card-platform">YOUTUBE · {clase}</span>
            <span class="card-date">{fecha}</span>
          </div>
          <h3 class="card-name">{titulo}</h3>
          <div class="card-tags">{etqs}</div>
          <div class="card-footer">
            <span class="card-date">VER EN YOUTUBE</span>
            <span class="card-arrow">ABRIR →</span>
          </div>
        </div>
      </a>""".format(url=v["url"], clase=clase, i=i, mini=v["miniatura"],
                     alt=html.escape(v["titulo"]), fecha=fecha,
                     titulo=html.escape(titulo), etqs=etqs)


def generar(videos, actualizado):
    total = len(videos)
    anio = datetime.date.today().year
    este_anio = sum(1 for v in videos if v["fecha"] and v["fecha"].year == anio)
    por_clase = {}
    for v in videos:
        c = clasificar(v["titulo"])
        por_clase[c] = por_clase.get(c, 0) + 1

    stats = [("TOTAL", total), (str(anio), este_anio)]
    for c, n in sorted(por_clase.items(), key=lambda x: -x[1])[:3]:
        stats.append((c, n))
    stats_html = "\n".join(
        '      <div class="stat"><span class="stat-num">%s</span>'
        '<span class="stat-label">%s</span></div>' % (n, html.escape(k))
        for k, n in stats)

    botones = ['<button class="filter-btn active" data-clase="all">TODOS</button>']
    for c in ["CIBERSEGURIDAD", "DERECHO", "TUTORIAL", "PRESENTACIÓN", "OTROS"]:
        if por_clase.get(c):
            botones.append('<button class="filter-btn" data-clase="%s">%s</button>'
                           % (c.lower(), c))
    filtros = "\n  ".join(botones)
    tarjetas = "\n".join(tarjeta(v, i) for i, v in enumerate(videos))

    return """<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Vídeos | Brandeiks</title>
<meta name="description" content="Vídeos de ciberseguridad y ciberderecho del canal Abogado Cibernético — Brandon Zevallos Pastrana.">
<meta name="author" content="Brandon Zevallos Pastrana">
<link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Rajdhani:wght@300;400;600;700&family=Orbitron:wght@400;700;900&display=swap" rel="stylesheet" />
<style>
%s
</style>
</head>
<body>

<div class="cursor" id="cursor"></div>
<div class="cursor-ring" id="cursorRing"></div>

<nav>
    <a href="../index.html" class="nav-logo">BRANDEIKS_SEC</a>
    <a href="index.html" class="nav-back">VÍDEOS</a>
    <a href="../writeups/index.html" class="nav-back">WRITEUPS</a>
    <a href="../diccionario/index.html" class="nav-back">DICCIONARIO</a>
  </nav>

<!-- HERO -->
<div class="hero">
  <div class="hero-grid"></div>
  <div class="hero-glow"></div>
  <div class="hero-content">
    <p class="hero-label">// YOUTUBE · ABOGADO CIBERNÉTICO</p>
    <h1 class="hero-title">VÍDE<span>OS</span></h1>
    <p class="hero-sub">Ciberseguridad y ciberderecho explicados en vídeo — laboratorios, herramientas de Kali Linux y normativa peruana.</p>
    <div class="hero-stats">
%s
    </div>
  </div>
</div>

<!-- FILTROS -->
<div class="filters-bar">
  %s
</div>

<main class="main">
  <div class="cards-grid">
%s
  </div>

  <div style="text-align:center;margin-top:3rem">
    <a href="%s" target="_blank" rel="noopener noreferrer" class="filter-btn"
       style="text-decoration:none;display:inline-block;padding:.7rem 1.6rem">
      VER EL CANAL COMPLETO EN YOUTUBE →
    </a>
  </div>

  <p style="text-align:center;margin-top:1.5rem;font-family:var(--font-mono);
            font-size:.62rem;color:var(--text-dim);letter-spacing:1px">
    Lista actualizada automáticamente · últimos cambios: %s
  </p>
</main>

<footer>
    <p>© %d <span>Brandon Zevallos Pastrana</span> — Vídeos de ciberseguridad y ciberderecho</p>
    <p>Hecho con <span>kali linux</span> &amp; <span>❤</span></p>
  </footer>

<script>
  const cursor = document.getElementById('cursor');
  const ring   = document.getElementById('cursorRing');
  if (cursor && ring) {
    document.addEventListener('mousemove', e => {
      cursor.style.left = e.clientX + 'px'; cursor.style.top = e.clientY + 'px';
      ring.style.left   = e.clientX + 'px'; ring.style.top   = e.clientY + 'px';
      cursor.style.opacity = '1'; ring.style.opacity = '0.5';
    });
    document.querySelectorAll('a, button').forEach(el => {
      el.addEventListener('mouseenter', () => { ring.style.width = '54px'; ring.style.height = '54px'; ring.style.opacity = '0.3'; });
      el.addEventListener('mouseleave', () => { ring.style.width = '36px'; ring.style.height = '36px'; ring.style.opacity = '0.5'; });
    });
  }

  const obs = new IntersectionObserver(entries => {
    entries.forEach((e, i) => { if (e.isIntersecting) setTimeout(() => e.target.classList.add('visible'), i * 70); });
  }, { threshold: 0.06 });
  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));

  const botones = document.querySelectorAll('.filter-btn[data-clase]');
  botones.forEach(b => b.addEventListener('click', () => {
    botones.forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    const c = b.dataset.clase;
    document.querySelectorAll('.video-card').forEach(card => {
      card.style.display = (c === 'all' || card.dataset.clase === c) ? 'block' : 'none';
    });
  }));
</script>
</body>
</html>
""" % (CSS, stats_html, filtros, tarjetas, CANAL_URL, actualizado,
       datetime.date.today().year)


# ------------------------------------------------------------------ principal
def main():
    print("Leyendo el feed del canal…")
    try:
        xml = leer_feed()
    except Exception as e:
        print("ERROR: no se pudo leer el feed:", e)
        return 1

    videos = parsear(xml)
    if not videos:
        print("ERROR: el feed no devolvio ningun video; no se toca la pagina.")
        return 1

    print("Videos encontrados: %d" % len(videos))
    for v in videos:
        f = v["fecha"].strftime("%Y-%m-%d") if v["fecha"] else "?"
        print("   %s  [%-15s] %s" % (f, clasificar(v["titulo"]), v["titulo"][:58]))

    actualizado = datetime.date.today().strftime("%d/%m/%Y")
    pagina = generar(videos, actualizado)

    os.makedirs(os.path.dirname(SALIDA), exist_ok=True)

    # solo se escribe si ha cambiado algo (asi el workflow no crea commits vacios)
    anterior = ""
    if os.path.exists(SALIDA):
        anterior = open(SALIDA, encoding="utf-8").read()

    if anterior == pagina:
        print("\nSin cambios: la pagina ya estaba actualizada.")
        return 0

    open(SALIDA, "w", encoding="utf-8").write(pagina)
    print("\nPagina actualizada: %s (%.1f KB)" % (SALIDA, os.path.getsize(SALIDA) / 1024))

    # registro de estado: sirve para ver de un vistazo cuando se actualizo por
    # ultima vez y que videos hay. Ademas, al cambiar este archivo el flujo de
    # trabajo tambien se dispara por su trigger de push.
    estado = os.path.join(RAIZ, "videos", "estado.json")
    with open(estado, "w", encoding="utf-8") as f:
        json.dump({
            "actualizado": datetime.datetime.now(datetime.timezone.utc)
                             .strftime("%Y-%m-%dT%H:%M:%SZ"),
            "canal": "Abogado Cibernetico",
            "canal_id": CANAL_ID,
            "total_videos": len(videos),
            "videos": [
                {
                    "titulo": v["titulo"],
                    "fecha": v["fecha"].strftime("%Y-%m-%d") if v["fecha"] else None,
                    "tipo": clasificar(v["titulo"]),
                    "url": v["url"],
                }
                for v in videos
            ],
        }, f, ensure_ascii=False, indent=2)
    print("Estado guardado en: %s" % estado)
    return 0


if __name__ == "__main__":
    sys.exit(main())
