# -*- coding: utf-8 -*-
"""
Publica un writeup en el sitio:
  1. copia el HTML al repositorio de GitHub Pages
  2. inserta la tarjeta en el indice respetando el orden por dificultad
     (muy-facil < facil < medio < dificil, agrupadas por plataforma)
  3. actualiza los contadores de la cabecera y de cada plataforma
  4. verifica el resultado

Uso:
  python publicar_writeup.py --nombre RansomNet \
      --origen  <ruta al html en sitio/...> \
      --destino writeups/hackthebox/muy-facil/ransomnet.html \
      --diff    muy-facil --fecha "Octubre 2026" \
      --desc "..." --tags "nmap|RDP · 3389|..." [--dry-run]
"""
import argparse, hashlib, os, re, shutil, sys

REPO = r"C:\Users\Masker\source\repos\brandeiks.github.io"
SITIO = r"C:\Users\Masker\Desktop\Deepseek\sitio"
INDICES = [os.path.join(REPO, "writeups", "index.html"),
           os.path.join(SITIO, "writeups", "index.html")]

ORDEN = ["muy-facil", "facil", "medio", "dificil"]
ETIQUETA = {"muy-facil": "MUY FÁCIL", "facil": "FÁCIL", "medio": "MEDIO", "dificil": "DIFÍCIL"}
PLATAFORMAS = {
    "hackthebox":      {"grid": "hackthebox-grid",      "contador": "htb-visible-count",  "stat": "HACKTHEBOX"},
    "dockerlabs":      {"grid": "dockerlabs-grid",      "contador": "docker-visible-count", "stat": "DOCKERLABS"},
    "google-xss-game": {"grid": "google-xss-game-grid", "contador": "ggxss-visible-count", "stat": "GOOGLE XSS GAME"},
}
RE_CARD = re.compile(r'<a href="(?P<href>[^"]+)" class="writeup-card reveal" data-diff="(?P<diff>[a-z-]+)" data-platform="(?P<plat>[a-z-]+)">')


def sha(p):
    return hashlib.sha256(open(p, "rb").read()).hexdigest()[:16]


def contar_cards(html):
    cuenta = {}
    for m in RE_CARD.finditer(html):
        cuenta[m.group("plat")] = cuenta.get(m.group("plat"), 0) + 1
    return cuenta


def bloque_tarjeta(nombre, href, diff, fecha, desc, tags, comentario):
    lineas = [f"      <!-- {comentario} -->",
              f'      <a href="{href}" class="writeup-card reveal" data-diff="{diff}" data-platform="{href.split("/")[0]}">',
              '        <div class="card-top">',
              f'          <span class="card-platform">{PLATAFORMAS[href.split("/")[0]]["stat"]}</span>',
              f'          <span class="card-diff diff-{diff}">{ETIQUETA[diff]}</span>',
              '        </div>',
              f'        <h3 class="card-name">{nombre}</h3>',
              f'        <p class="card-desc">{desc}</p>',
              '        <div class="card-tags">']
    lineas += [f'          <span class="card-tag">{t}</span>' for t in tags]
    lineas += ['        </div>',
               '        <div class="card-footer">',
               f'          <span class="card-date">{fecha}</span>',
               '          <span class="card-arrow">LEER →</span>',
               '        </div>',
               '      </a>']
    return lineas


def insertar(html, lineas_tarjeta, diff, plataforma):
    """Inserta antes de la primera tarjeta de la misma plataforma con dificultad posterior."""
    lineas = html.split("\n")
    rango = ORDEN.index(diff)
    destino = None
    for i, ln in enumerate(lineas):
        m = RE_CARD.search(ln)
        if not m or m.group("plat") != plataforma:
            continue
        if ORDEN.index(m.group("diff")) > rango:
            # retroceder hasta el comentario que precede a esa tarjeta
            j = i - 1
            while j > 0 and lineas[j].strip() == "":
                j -= 1
            destino = j if lineas[j].strip().startswith("<!--") else i
            break
    if destino is None:  # no hay dificultad posterior: al final de la plataforma
        ultimo = None
        for i, ln in enumerate(lineas):
            if RE_CARD.search(ln) and RE_CARD.search(ln).group("plat") == plataforma:
                ultimo = i
        if ultimo is None:
            return html, False
        destino = ultimo + 1
    nuevas = lineas[:destino] + lineas_tarjeta + [""] + lineas[destino:]
    return "\n".join(nuevas), True


def actualizar_contadores(html, nombre_archivo):
    cuenta = contar_cards(html)
    total = sum(cuenta.values())
    html = re.sub(r'(id="totalCount">)\d+(</span>)', lambda m: m.group(1) + str(total) + m.group(2), html)
    for plat, info in PLATAFORMAS.items():
        n = cuenta.get(plat, 0)
        html = re.sub(r'(<span class="stat-num">)\d+(</span><span class="stat-label">' + re.escape(info["stat"]) + r'</span>)',
                      lambda m: m.group(1) + str(n) + m.group(2), html)
        html = re.sub(r'(id="' + info["contador"] + r'">)\d+(\s+[\wáéíóú]+</span>)',
                      lambda m: m.group(1) + str(n) + m.group(2), html)
    return html, cuenta, total


def informe_orden(html, plataforma):
    orden = [(m.group("href").split("/")[-1].replace(".html", ""), m.group("diff"))
             for m in RE_CARD.finditer(html) if m.group("plat") == plataforma]
    print("   orden:", " | ".join(f"{n}:{d}" for n, d in orden))
    diffs = [d for _, d in orden]
    cambios = sum(1 for a, b in zip(diffs, diffs[1:]) if a != b)
    print(f"   bloques de dificultad: {cambios + 1} | total tarjetas: {len(orden)}")


ap = argparse.ArgumentParser()
ap.add_argument("--nombre", required=True)
ap.add_argument("--origen", required=True)
ap.add_argument("--destino", required=True, help="ruta relativa dentro del repo, p.ej. writeups/hackthebox/muy-facil/x.html")
ap.add_argument("--diff", required=True, choices=ORDEN)
ap.add_argument("--fecha", required=True)
ap.add_argument("--desc", required=True)
ap.add_argument("--tags", required=True, help="separadas por |")
ap.add_argument("--comentario", default=None)
ap.add_argument("--dry-run", action="store_true")
a = ap.parse_args()

comentario = a.comentario or a.nombre.upper().replace(" ", "")
tags = [t.strip() for t in a.tags.split("|") if t.strip()]
href = a.destino.replace("writeups/", "", 1)
plataforma = href.split("/")[0]
if plataforma not in PLATAFORMAS:
    sys.exit(f"plataforma desconocida en el destino: {plataforma}")
if a.diff not in ORDEN:
    sys.exit("dificultad no valida")

print("== 1. copiar el writeup al repositorio ==")
destino_abs = os.path.join(REPO, *a.destino.split("/"))
if not os.path.isfile(a.origen):
    sys.exit(f"no existe el origen: {a.origen}")
print("   origen :", sha(a.origen), os.path.getsize(a.origen), "bytes")
if a.dry_run:
    print("   [dry-run] no se copia ni se escribe nada")
else:
    os.makedirs(os.path.dirname(destino_abs), exist_ok=True)
    shutil.copy2(a.origen, destino_abs)
    print("   destino:", sha(destino_abs), os.path.getsize(destino_abs), "bytes",
          "-> IDENTICO" if sha(a.origen) == sha(destino_abs) else "-> DISTINTO")

etiqueta_card = plataforma
cuenta_repo = None   # tarjetas por plataforma del indice del repositorio (para la portada)
for ruta in INDICES:
    print(f"\n--- indice: {ruta}")
    html = open(ruta, encoding="utf-8").read().replace("\r\n", "\n")
    if href in html:
        print("   AVISO: la tarjeta ya existe en este indice, no se inserta")
        continue
    lineas = bloque_tarjeta(a.nombre, href, a.diff, a.fecha, a.desc, tags, comentario)
    html, ok = insertar(html, lineas, a.diff, plataforma)
    if not ok:
        print("   FALLO: no se encontro donde insertar la tarjeta")
        continue
    html, cuenta, total = actualizar_contadores(html, ruta)
    abiertos, cerrados = html.count("<div"), html.count("</div>")
    if abiertos != cerrados:
        print(f"   FALLO: divs desbalanceados ({abiertos}/{cerrados}), no se escribe")
        continue
    if ruta == INDICES[0]:
        cuenta_repo = cuenta
    print(f"   insertada en el bloque '{a.diff}' | contadores -> TOTAL {total} | " +
          " | ".join(f"{k} {v}" for k, v in sorted(cuenta.items())))
    informe_orden(html, plataforma)
    if not a.dry_run:
        open(ruta, "w", encoding="utf-8", newline="\r\n").write(html)
        verificado = open(ruta, encoding="utf-8").read()
        print("   verificado:", verificado.count(href), "referencia(s) |",
              "TOTAL =", re.search(r'id="totalCount">(\d+)', verificado).group(1))

# 5. Portada: las cifras de "Experiencia practica" (WRITEUPS, HACKTHEBOX, DOCKERLABS)
#    salen del indice de writeups del repositorio, para que no se queden viejas.
PORTADA = os.path.join(REPO, "index.html")
print(f"\n--- portada: {PORTADA}")
if cuenta_repo is None:   # la tarjeta ya existia o fallo: se cuenta lo que hay escrito
    cuenta_repo = contar_cards(open(INDICES[0], encoding="utf-8").read())
cifras = {"WRITEUPS": sum(cuenta_repo.values()),
          "HACKTHEBOX": cuenta_repo.get("hackthebox", 0),
          "DOCKERLABS": cuenta_repo.get("dockerlabs", 0)}
portada = open(PORTADA, encoding="utf-8", newline="").read()
nueva = portada
for etiqueta, n in cifras.items():
    nueva, k = re.subn(r'(<span class="about-stat-num">)\d+(</span><span class="about-stat-lbl">' + etiqueta + r'\b)',
                       lambda m: m.group(1) + str(n) + m.group(2), nueva)
    if k != 1:
        print(f"   AVISO: no se encontro la cifra {etiqueta} en la portada")
estado = "sin cambios" if nueva == portada else ("dry-run, no se escribe" if a.dry_run else "actualizada")
print("   " + " | ".join(f"{k} {v}" for k, v in cifras.items()) + f" ({estado})")
if nueva != portada and not a.dry_run:
    open(PORTADA, "w", encoding="utf-8", newline="").write(nueva)

print("\nRESULTADO:", "DRY-RUN" if a.dry_run else "OK")
