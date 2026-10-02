#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generador de writeups: convierte un borrador en Markdown al HTML del sitio.

  python generar_writeup.py --md guion.md --nombre Explosion --plat hackthebox \
      --diff muy-facil --tags "nmap|RDP · 3389|xfreerdp" --fecha "Octubre 2026" \
      --salida writeups/hackthebox/muy-facil/explosion.html [--publicar]

Convierte:
  # Titulo                 -> nombre del writeup
  ## Seccion               -> seccion numerada (con ancla para el indice lateral)
  ### Paso                 -> marcador de paso (numerado)
  ```bash ... ```          -> bloque de comandos con boton COPIAR
  ```text ... ```          -> bloque de salida (nmap, consolas, etc.)
  | tablas |               -> tabla del sitio
  - listas y párrafos      -> prosa del sitio
  > cita                   -> caja de informacion

Con --publicar llama a publicar_writeup.py para insertar la tarjeta en el indice,
actualizar contadores y colocar la ficha en su bloque de dificultad.
"""
import argparse, html, os, re, subprocess, sys, unicodedata

REPO = r"C:\Users\Masker\source\repos\brandeiks.github.io"
PLAT_ETIQUETA = {"hackthebox": "HACKTHEBOX", "dockerlabs": "DOCKERLABS", "google-xss-game": "GOOGLE XSS GAME"}
DIFF_ETIQUETA = {"muy-facil": "MUY FÁCIL", "facil": "FÁCIL", "medio": "MEDIO", "dificil": "DIFÍCIL"}


def slug(t):
    t = unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", t.lower()).strip("-")[:40]


def inline(t):
    t = html.escape(t, quote=False)
    t = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", t)
    t = re.sub(r"`([^`]+)`", r"<code>\1</code>", t)
    t = re.sub(r"\[([^\]]+)\]\((https?://[^)]+)\)", r'<a href="\2" target="_blank" rel="noopener">\1</a>', t)
    return t


def bloque_cmd(codigo, etiqueta="COMANDO"):
    lineas = [l for l in codigo.strip("\n").split("\n")]
    cuerpo = ""
    for l in lineas:
        if l.strip().startswith("#"):
            cuerpo += f'<div><span class="comment">{html.escape(l)}</span></div>\n'
        else:
            cuerpo += f'<div><span class="prompt">$ </span><span class="cmd">{html.escape(l)}</span></div>\n'
    unico = " && ".join(l.strip() for l in lineas if l.strip() and not l.strip().startswith("#"))
    return ('      <div class="cmd-block" data-cmd="' + html.escape(unico, quote=True) + '">\n'
            '        <button class="copy-btn" onclick="copyCmd(this)">COPIAR</button>\n'
            f'        <span class="cmd-label">{etiqueta}</span>\n' + cuerpo + '      </div>\n')


def bloque_salida(texto):
    lineas = "".join(f"        <div>{html.escape(l)}</div>\n" for l in texto.strip("\n").split("\n"))
    return '      <div class="output-block">\n' + lineas + '      </div>\n'


def tabla(filas):
    cab = filas[0]
    cuerpo = "".join("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in f) + "</tr>\n" for f in filas[1:])
    return ('      <table class="vuln-table">\n        <thead><tr>'
            + "".join(f"<th>{inline(c)}</th>" for c in cab)
            + f"</tr></thead>\n        <tbody>\n{cuerpo}        </tbody>\n      </table>\n")


def parsear(md):
    """Devuelve (titulo, [(seccion, [bloques])])"""
    lineas = md.split("\n")
    titulo = ""
    secciones = []
    actual = None
    i = 0
    while i < len(lineas):
        l = lineas[i]
        if l.startswith("# ") and not titulo:
            titulo = l[2:].strip()
        elif l.startswith("## "):
            actual = (l[3:].strip(), [])
            secciones.append(actual)
        elif l.startswith("### "):
            if actual is None:
                actual = ("Desarrollo", [])
                secciones.append(actual)
            actual[1].append(("paso", l[4:].strip()))
        elif l.strip().startswith("```"):
            lenguaje = l.strip().strip("`") or "text"
            i += 1
            buffer = []
            while i < len(lineas) and not lineas[i].strip().startswith("```"):
                buffer.append(lineas[i])
                i += 1
            texto = "\n".join(buffer)
            if actual is None:
                actual = ("Desarrollo", [])
                secciones.append(actual)
            if lenguaje.lower() in ("bash", "sh", "shell", "console", "powershell", "python"):
                actual[1].append(("cmd", (texto, lenguaje.upper())))
            else:
                actual[1].append(("out", texto))
        elif l.strip().startswith("|") and i + 1 < len(lineas) and set(lineas[i + 1].strip()) <= set("|-: "):
            filas = []
            while i < len(lineas) and lineas[i].strip().startswith("|"):
                if not set(lineas[i].strip()) <= set("|-: "):
                    filas.append([c.strip() for c in lineas[i].strip().strip("|").split("|")])
                i += 1
            i -= 1
            if len(filas) > 1:
                actual[1].append(("tabla", filas))
        elif l.strip().startswith(">"):
            cita = []
            while i < len(lineas) and lineas[i].strip().startswith(">"):
                cita.append(lineas[i].strip()[1:].strip())
                i += 1
            i -= 1
            actual[1].append(("cita", " ".join(cita)))
        elif l.strip().startswith("- "):
            puntos = []
            while i < len(lineas) and lineas[i].strip().startswith("- "):
                puntos.append(lineas[i].strip()[2:])
                i += 1
            i -= 1
            actual[1].append(("lista", puntos))
        elif l.strip() and not l.strip().startswith(("---", "***", "|")):
            parrafo = [l.strip()]
            i += 1
            while i < len(lineas) and lineas[i].strip() and not lineas[i].startswith(("#", "```", "|", ">", "- ")):
                parrafo.append(lineas[i].strip())
                i += 1
            i -= 1
            actual[1].append(("parrafo", " ".join(parrafo)))
        i += 1
    return titulo, secciones


ap = argparse.ArgumentParser()
ap.add_argument("--md", required=True)
ap.add_argument("--nombre", required=True)
ap.add_argument("--plat", required=True, choices=list(PLAT_ETIQUETA))
ap.add_argument("--diff", required=True, choices=list(DIFF_ETIQUETA))
ap.add_argument("--tags", default="")
ap.add_argument("--fecha", required=True)
ap.add_argument("--subtitulo", default="")
ap.add_argument("--desc", default="")
ap.add_argument("--salida", required=True, help="ruta relativa dentro del repositorio")
ap.add_argument("--publicar", action="store_true")
a = ap.parse_args()

md = open(a.md, encoding="utf-8").read()
titulo_md, secciones = parsear(md)
print(f"markdown: {len(secciones)} secciones, titulo '{titulo_md or '(sin #)'}'")

mayus = a.nombre.upper()
corte = max(2, len(mayus) - max(2, len(mayus) // 3))
badges = [f'<span class="meta-badge badge-{a.diff}">● {DIFF_ETIQUETA[a.diff]}</span>',
          f'<span class="meta-badge badge-{"htb" if a.plat == "hackthebox" else "docker"}">{PLAT_ETIQUETA[a.plat]}</span>']
for t in [x.strip() for x in a.tags.split("|") if x.strip()]:
    badges.append(f'<span class="meta-badge badge-tech">{html.escape(t)}</span>')

cuerpo = ""
toc = ""
paso_n = 0
for n, (titulo, bloques) in enumerate(secciones, 1):
    sid = slug(titulo) or f"seccion-{n}"
    toc += f'        <li><a href="#{sid}">{n:02d} · {html.escape(titulo)}</a></li>\n'
    cuerpo += f'''    <div class="section" id="{sid}">
      <p class="section-label">// {n:02d}</p>
      <h2 class="section-title">{html.escape(titulo)}</h2>
      <div class="section-line"></div>
'''
    for tipo, valor in bloques:
        if tipo == "paso":
            paso_n += 1
            cuerpo += ('      <div class="step-marker">\n'
                       f'        <div class="step-num">{paso_n}</div>\n'
                       f'        <span class="step-title">{html.escape(valor.upper())}</span>\n      </div>\n')
        elif tipo == "cmd":
            cuerpo += bloque_cmd(valor[0], valor[1])
        elif tipo == "out":
            cuerpo += bloque_salida(valor)
        elif tipo == "tabla":
            cuerpo += tabla(valor)
        elif tipo == "cita":
            cuerpo += ('      <div class="info-box">\n'
                       f'        <p class="info-box-title">// NOTA</p>\n        <p>{inline(valor)}</p>\n      </div>\n')
        elif tipo == "lista":
            cuerpo += '      <div class="prose">\n        <ul>\n'
            cuerpo += "".join(f"          <li>{inline(p)}</li>\n" for p in valor)
            cuerpo += "        </ul>\n      </div>\n"
        else:
            cuerpo += f'      <div class="prose">\n        <p>{inline(valor)}</p>\n      </div>\n'
    cuerpo += "    </div>\n\n"

desc = a.desc or f"Writeup de {a.nombre} ({PLAT_ETIQUETA[a.plat]}, {DIFF_ETIQUETA[a.diff]})."
subtitulo = a.subtitulo or (secciones[0][1][0][1][:90] if secciones and secciones[0][1] and secciones[0][1][0][0] == "parrafo" else f"// {a.nombre} · {PLAT_ETIQUETA[a.plat]}")

pagina = f'''<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>{a.nombre} — {PLAT_ETIQUETA[a.plat].title()} Writeup | Brandeiks</title>
  <meta name="description" content="{html.escape(desc, quote=True)}">
  <meta name="author" content="Brandon Zevallos Pastrana">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Rajdhani:wght@300;400;600;700&family=Orbitron:wght@400;700;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="{'../' * a.salida.count('/')}assets/writeups.css">
</head>
<body>
<a href="#main" class="skip-link">Saltar al contenido</a>
<div class="cursor" id="cursor"></div>
<div class="cursor-ring" id="cursorRing"></div>
<div class="progress-container"><div class="progress-bar" id="readingProgress"></div></div>
<input type="checkbox" id="menuAbierto" class="menu-check" aria-hidden="true">
<nav>
  <a href="{'../' * a.salida.count('/')}index.html" class="nav-logo">BRANDEIKS_SEC</a>
  <label for="menuAbierto" class="menu-btn" aria-label="Abrir menú"><span></span></label>
  <a href="{'../' * a.salida.count('/')}index.html" class="nav-back">INICIO</a>
  <a href="{'../' * a.salida.count('/')}writeups/index.html" class="nav-back">WRITEUPS</a>
  <a href="{'../' * a.salida.count('/')}comandos/index.html" class="nav-back">COMANDOS</a>
</nav>
<div class="writeup-hero">
  <div class="hero-grid"></div><div class="hero-glow"></div>
  <div class="writeup-hero-content">
    <div class="breadcrumb">
      <a href="{'../' * a.salida.count('/')}index.html">brandeiks</a> /
      <a href="{'../' * a.salida.count('/')}writeups/index.html">writeups</a> /
      <a href="{'../' * a.salida.count('/')}writeups/index.html">{a.plat}</a> /
      <span>{slug(a.nombre)}</span>
    </div>
    <h1 class="writeup-title">{mayus[:corte]}<span>{mayus[corte:]}</span></h1>
    <p class="writeup-subtitle">{html.escape(subtitulo)}</p>
    <div class="writeup-meta">
      {"".join(badges)}
      <span class="meta-date">📅 {a.fecha} · Por Brandeiks</span>
    </div>
  </div>
</div>
<div class="writeup-layout">
  <aside class="sidebar">
    <div class="sidebar-box">
      <p class="sidebar-title">// ÍNDICE</p>
      <ul class="toc-list">
{toc}      </ul>
    </div>
    <div class="sidebar-box">
      <p class="sidebar-title">// INFO</p>
      <div class="info-row"><span class="info-label">NOMBRE</span><span class="info-val val-cyan">{html.escape(a.nombre)}</span></div>
      <div class="info-row"><span class="info-label">PLATAFORMA</span><span class="info-val val-green">{PLAT_ETIQUETA[a.plat]}</span></div>
      <div class="info-row"><span class="info-label">DIFICULTAD</span><span class="info-val val-facil">{DIFF_ETIQUETA[a.diff]}</span></div>
      {"".join(f'<div class="info-row"><span class="info-label">TAG</span><span class="info-val val-cyan">{html.escape(t.strip())}</span></div>' for t in a.tags.split("|") if t.strip())}
    </div>
  </aside>
  <main id="main" class="writeup-content">
{cuerpo}  </main>
</div>
<footer>
  <p>© 2026 <span>Brandon Zevallos Pastrana</span> — Writeup de {html.escape(a.nombre)} · {PLAT_ETIQUETA[a.plat].title()}</p>
  <p>Hecho con <span>kali linux</span> &amp; <span>❤</span></p>
</footer>
<script>
  // CURSOR, REVELADO, PROGRESO Y COPIAR (igual que el resto del sitio)
  const cursor = document.getElementById('cursor'), ring = document.getElementById('cursorRing');
  let visible = false;
  document.addEventListener('mousemove', e => {{
    cursor.style.left = e.clientX + 'px'; cursor.style.top = e.clientY + 'px';
    ring.style.left = e.clientX + 'px'; ring.style.top = e.clientY + 'px';
    if (!visible) {{ visible = true; cursor.style.opacity = '1'; ring.style.opacity = '0.5'; }}
  }});
  document.addEventListener('mouseleave', () => {{ cursor.style.opacity = '0'; ring.style.opacity = '0'; visible = false; }});
  document.addEventListener('mousedown', () => {{ cursor.style.transform = 'translate(-50%,-50%) scale(0.5)'; }});
  document.addEventListener('mouseup', () => {{ cursor.style.transform = 'translate(-50%,-50%)'; }});
  document.querySelectorAll('a, button').forEach(el => {{
    el.addEventListener('mouseenter', () => {{ ring.style.width = '54px'; ring.style.height = '54px'; ring.style.opacity = '0.3'; }});
    el.addEventListener('mouseleave', () => {{ ring.style.width = '36px'; ring.style.height = '36px'; ring.style.opacity = '0.5'; }});
  }});
  const obs = new IntersectionObserver(es => es.forEach(e => {{ if (e.isIntersecting) e.target.classList.add('visible'); }}), {{ threshold: 0.06 }});
  document.querySelectorAll('.section').forEach(s => obs.observe(s));
  const seccionesTOC = document.querySelectorAll('.section[id]');
  const enlacesTOC = document.querySelectorAll('.toc-list a');
  const tocObs = new IntersectionObserver(es => es.forEach(e => {{
    if (e.isIntersecting) {{
      enlacesTOC.forEach(a => a.classList.remove('active'));
      const act = document.querySelector('.toc-list a[href="#' + e.target.id + '"]');
      if (act) act.classList.add('active');
    }}
  }}), {{ rootMargin: '-30% 0px -60% 0px' }});
  seccionesTOC.forEach(s => tocObs.observe(s));
  window.addEventListener('scroll', () => {{
    const h = document.documentElement.scrollHeight - window.innerHeight;
    const b = document.getElementById('readingProgress');
    if (b) b.style.width = (h > 0 ? (document.documentElement.scrollTop / h) * 100 : 0) + '%';
  }});
  function showToast(m) {{
    let t = document.querySelector('.toast');
    if (!t) {{ t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }}
    t.textContent = '📋 ' + m; t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2000);
  }}
  function copyCmd(btn) {{
    const cmd = btn.closest('.cmd-block').dataset.cmd || '';
    navigator.clipboard.writeText(cmd).then(() => {{ btn.textContent = '✓ OK'; btn.classList.add('copied'); showToast('Comando copiado ✓'); setTimeout(() => {{ btn.textContent = 'COPIAR'; btn.classList.remove('copied'); }}, 1800); }});
  }}
</script>
<script>window.__datos = {{}};</script>
<script src="{'../' * a.salida.count('/')}assets/writeup.js" defer></script>
</body>
</html>
'''

destino = os.path.join(REPO, *a.salida.split("/"))
os.makedirs(os.path.dirname(destino), exist_ok=True)
open(destino, "w", encoding="utf-8", newline="\n").write(pagina)
print(f"escrito {a.salida}: {round(os.path.getsize(destino)/1024,1)} KB | {len(secciones)} secciones | {paso_n} pasos")

if a.publicar:
    tags = "|".join(t.strip() for t in a.tags.split("|") if t.strip())
    cmd = [sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), "publicar_writeup.py"),
           "--nombre", a.nombre, "--origen", destino, "--destino", a.salida,
           "--diff", a.diff, "--fecha", a.fecha, "--desc", desc, "--tags", tags]
    print("publicando en el indice...")
    subprocess.run(cmd, check=False)
