# -*- coding: utf-8 -*-
"""Genera assets/dragon.js (el dragon de jade de la portada) a partir de
scripts/dragon.plantilla.js: calcula las rutas del vuelo y de la pose, las filas
del patron de granos, las volutas, las patas, la cola y la posicion de la cabeza
y la perla, y rellena los {{MARCADORES}} de la plantilla.

Uso:  python scripts/generar_dragon.py            (escribe assets/dragon.js)
      python scripts/generar_dragon.py otro.js    (escribe en otra ruta)

Inspirado en dragones de jade reales: patron de granos, volutas en espiral,
melena en hoja (Hongshan), cola en espiral y la perla en llamas (Qing).
Sistema de coordenadas: viewBox 0 0 420 260; el borde superior de la terminal
esta en y = 260 y la terminal ocupa x 0..420. El vuelo sale fuera del viewBox.
"""
import math, sys, os

def sub(a, b): return (a[0] - b[0], a[1] - b[1])
def add(a, b): return (a[0] + b[0], a[1] + b[1])
def mul(a, k): return (a[0] * k, a[1] * k)
def norm(a):
    l = math.hypot(*a) or 1e-9
    return (a[0] / l, a[1] / l)

def catmull_rom(points, alpha=0.5):
    pts = [sub(mul(points[0], 2), points[1])] + points + [sub(mul(points[-1], 2), points[-2])]
    segs = []
    for i in range(1, len(pts) - 2):
        p0, p1, p2, p3 = pts[i - 1], pts[i], pts[i + 1], pts[i + 2]
        t0 = 0.0
        t1 = t0 + max(math.dist(p0, p1), 1e-6) ** alpha
        t2 = t1 + max(math.dist(p1, p2), 1e-6) ** alpha
        t3 = t2 + max(math.dist(p2, p3), 1e-6) ** alpha
        def m(pa, pb, pc, ta, tb, tc):
            return tuple((t2 - t1) * ((pb[k] - pa[k]) / (tb - ta) - (pc[k] - pa[k]) / (tc - ta) + (pc[k] - pb[k]) / (tc - tb)) for k in range(2))
        m1 = m(p0, p1, p2, t0, t1, t2)
        m2 = m(p1, p2, p3, t1, t2, t3)
        segs.append((p1, add(p1, mul(m1, 1 / 3)), sub(p2, mul(m2, 1 / 3)), p2))
    return segs

def bez(s, t):
    p0, c1, c2, p1 = s
    u = 1 - t
    return tuple(u ** 3 * p0[k] + 3 * u * u * t * c1[k] + 3 * u * t * t * c2[k] + t ** 3 * p1[k] for k in range(2))

def muestrear(segs, n=240):
    out, s, prev = [], 0.0, None
    for seg in segs:
        for i in range(n + 1):
            p = bez(seg, i / n)
            if prev is not None:
                s += math.dist(prev, p)
            if prev is None or i > 0:
                out.append((s, p))
            prev = p
    return out

def punto_en(mu, s):
    for i in range(1, len(mu)):
        if mu[i][0] >= s:
            s0, p0 = mu[i - 1]; s1, p1 = mu[i]
            k = (s - s0) / ((s1 - s0) or 1e-9)
            return (p0[0] + (p1[0] - p0[0]) * k, p0[1] + (p1[1] - p0[1]) * k)
    return mu[-1][1]

def tangente(mu, s, h=1.5):
    a = punto_en(mu, max(0, s - h)); b = punto_en(mu, min(mu[-1][0], s + h))
    return norm(sub(b, a))

def f(x):
    r = round(x, 1)
    return str(int(r)) if r == int(r) else ('%.1f' % r)
def P(p): return f(p[0]) + ',' + f(p[1])
def ang(t): return math.degrees(math.atan2(t[1], t[0]))

def path_d(segs):
    d = 'M' + P(segs[0][0])
    for _, c1, c2, p1 in segs:
        d += ' C' + P(c1) + ' ' + P(c2) + ' ' + P(p1)
    return d

# --- recorrido: vuelo + pose final (cola -> cabeza) ---
# entra por el borde derecho, por debajo de la barra del menu (y >= -32 en el viewBox),
# para no asomar difuminado detras del menu semitransparente
VUELO = [(760, 24), (630, -4), (500, -24), (370, -32), (255, -28), (160, -12), (104, 24), (92, 60),
         (128, 108), (195, 112), (238, 70), (222, 20), (165, 18), (118, 62), (98, 120)]
POSE = [(92, 172), (101, 212), (124, 240), (152, 249), (182, 241), (211, 236), (241, 244),
        (271, 249), (302, 246), (334, 235), (355, 211), (357, 181), (343, 155), (320, 142), (296, 140)]

segs = catmull_rom(VUELO + POSE)
segs_pose = segs[len(VUELO):]
d_ruta, d_pose = path_d(segs), path_d(segs_pose)
mu = muestrear(segs_pose)
L = mu[-1][0]

def arriba(t):
    """Normal que apunta hacia arriba (lomo)."""
    n = (t[1], -t[0])
    return n if n[1] <= 0 else (-n[0], -n[1])

def colocar(p, t):
    """transform para un adorno dibujado con x = tangente y -y = lomo (arriba)."""
    flip = 1 if (t[1], -t[0]) == arriba(t) else -1
    return 'translate(%s) rotate(%s) scale(1 %d)' % (P(p).replace(',', ' '), f(ang(t)), flip)

# --- filas de granos (patron de granos) sobre el cuerpo ya posado ---
def fila(desv, desde, hasta, paso=3.0):
    pts = []
    s = desde
    while s <= hasta:
        p = punto_en(mu, s); t = tangente(mu, s)
        n = (t[1], -t[0])
        pts.append(add(p, mul(n, desv)))
        s += paso
    return 'M' + ' L'.join(P(q) for q in pts)
d_granos = [fila(0, 22, L - 10), fila(4.6, 74, L - 14), fila(-4.6, 74, L - 14)]

# --- volutas dorsales en los tramos casi horizontales del cuerpo ---
VOLUTA = 'M4,0 C4,-9 -2,-15 -9,-15 C-14,-15 -16,-10 -13,-7 C-11,-5 -8,-7 -9,-9'
volutas = []
for s in (96, 150, 206, 262):
    p = punto_en(mu, s); t = tangente(mu, s)
    base = add(p, mul(arriba(t), 7.5))
    volutas.append(colocar(base, t))

# --- patas agarradas al borde de la terminal (y = 260) ---
def s_cerca_de_x(x, ymin):
    mejor = None
    for sm, pm in mu:
        if pm[1] >= ymin and (mejor is None or abs(pm[0] - x) < abs(mejor[1][0] - x)):
            mejor = (sm, pm)
    return mejor
patas, garras, espirales = [], [], []
for xp in (168, 276):
    _, c = s_cerca_de_x(xp, 238)
    x, yb = c
    patas.append('M%s C%s %s %s L%s C%s %s %s Z' % (
        P((x - 7, yb + 1)), P((x - 9, yb + 6)), P((x - 7, 256)), P((x - 4.5, 258.5)),
        P((x + 4.5, 258.5)), P((x + 6.5, 255.5)), P((x + 7.5, yb + 5)), P((x + 6.5, yb + 1))))
    garras += ['M%s q-2.4,3.6 -0.6,7.4' % P((x - 4, 258.6)),
               'M%s q0.2,4 2,7.6' % P((x + 0.2, 259)),
               'M%s q2.6,3 3.6,6.6' % P((x + 4.4, 258.4))]
    # espiral en la articulacion (como en las placas de los Reinos Combatientes)
    cx, cy = x + 8.5, yb + 3
    espirales.append('M%s c4,-1 6,2 4.5,4.5 c-1.4,2 -4.2,1.2 -3.8,-1' % P((cx - 2, cy - 1)))

# --- cola en espiral (se dibuja al posarse) ---
t0 = tangente(mu, 0.5)
cola_tr = 'translate(%s) rotate(%s)' % (P(POSE[0]).replace(',', ' '), f(ang(t0)))
COLA = 'M0,0 C-9,-1 -16,-7 -16,-15 C-16,-23 -8,-26 -3.5,-21.5 C-0.5,-18.5 -2.5,-14 -6,-14.5'

# --- cabeza y perla en la pose final ---
tE = tangente(mu, L - 0.5)
angE = ang(tE)
flipE = -1 if tE[0] < 0 else 1
cabeza_tr = 'translate(%s) rotate(%s) scale(1 %d)' % (P(POSE[-1]).replace(',', ' '), f(angE), flipE)
def aplicar(local):
    x, y = local[0], local[1] * flipE
    a = math.radians(angE)
    return (POSE[-1][0] + x * math.cos(a) - y * math.sin(a), POSE[-1][1] + x * math.sin(a) + y * math.cos(a))
boca = aplicar((80 * 1.1, -2 * 1.1))
perla = add(boca, add(mul(tE, 22), (0, -4)))

R = {
    '{{RUTA}}': d_ruta, '{{POSE}}': d_pose,
    '{{GRANO0}}': d_granos[0], '{{GRANO1}}': d_granos[1], '{{GRANO2}}': d_granos[2],
    '{{VOLUTA}}': VOLUTA, '{{VOLUTAS_TR}}': '|'.join(volutas),
    '{{PATAS}}': ' '.join(patas), '{{GARRAS}}': ' '.join(garras),
    '{{COLA_TR}}': cola_tr, '{{COLA}}': COLA, '{{CABEZA_TR}}': cabeza_tr,
    '{{PERLA_X}}': f(perla[0]), '{{PERLA_Y}}': f(perla[1]),
    '{{LARGO_MAS}}': f(L + 40), '{{LARGO}}': f(L),
}
js = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dragon.plantilla.js'), encoding='utf-8').read()
for k, v in R.items():
    js = js.replace(k, v)
assert '{{' not in js, 'quedan marcadores sin rellenar'
salida = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'dragon.js')
open(salida, 'w', encoding='utf-8', newline='\n').write(js)
print('cuerpo %.0f | volutas %d | angulo final %.0f | perla %s | %d bytes' % (L, len(volutas), angE, P(perla), len(js.encode('utf-8'))))
