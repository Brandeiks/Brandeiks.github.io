# MODELO DE WRITEUP — instrucciones para Claude

Este archivo es la plantilla de trabajo. **Claude convierte tus capturas/Word a Markdown siguiendo
exactamente esta estructura**, y el script `scripts/generar_writeup.py` lo transforma en la página
del sitio sin retoques manuales.

---

## 0. Bloque de metadatos (obligatorio, al principio del archivo)

Claude debe empezar el Markdown con este bloque, tal cual, en una sola línea de código:

```yaml
nombre: FirstHacking
plataforma: DockerLabs          # DockerLabs | HackTheBox | Google XSS Game
dificultad: muy-facil           # muy-facil | facil | medio | dificil
tags: FTP, vsftpd 2.3.4, Backdoor, CVE-2011-2523, Netcat, Root
fecha: Octubre 2026
resumen: Una frase de 20-30 palabras que explique el vector y el resultado.
subtitulo: // vsFTPd 2.3.4 con backdoor -> shell como root en el puerto 6200
```

Esos seis campos son los que rellenan la cabecera, los badges del hero, la tarjeta del índice,
el `<title>`, la meta descripción y la tarjeta social (og:image). **No hace falta que los inventes
con precisión: si falta alguno, se puede completar a mano**, pero cuantos más vengan, menos trabajo.

---

## 1. Estructura de secciones (el orden importa)

Obligatorias (las que hacen que el writeup se parezca a los demás):

| Sección | Qué debe contener |
|---|---|
| `## Contexto` | 1-2 párrafos: qué es la máquina, plataforma, dificultad, y **qué se va a aprender**. Si el fallo tiene historia (un CVE, un backdoor famoso, una versión concreta), aquí va la **etapa histórica**. |
| `## Reconocimiento` | Comando de nmap con sus flags + salida real + interpretación. Todo hallazgo con `> ` (caja de nota). |
| `## Explotación` | El vector, paso a paso, con el comando y su salida. Explicar **por qué funciona**, no solo qué se escribe. |
| `## Acceso y escalada` | Shell obtenida, usuario, escalada si la hay, y la captura de la flag. |
| `## Referencia de comandos` | **Obligatoria**: tabla o lista con cada comando usado, **qué hace y qué significa cada flag**. Es lo que diferencia un writeup del resto. |
| `## Glosario` | **Obligatoria**: 5-10 términos con su definición (tecnologías, siglas, herramientas). |
| `## Curiosidades` | Opcional pero muy recomendable: 2-4 datos interesantes (historia del CVE, anécdotas, cómo se descubrió, por qué sigue apareciendo en auditorías). |
| `## Resumen` | 3-5 líneas con la cadena de ataque completa. |

## 2. Sintaxis admitida por el generador

```markdown
## Título de sección          -> sección numerada (// 01, // 02...) con ancla para el índice

### Título del paso            -> marcador de paso numerado (activa el MODO GUION)
                                 Si no usas ### , cada ## se trata como un paso.

```bash
comando aquí                 -> bloque de comandos con botón COPIAR (se usa el primer comando
                                 para la tarjeta de terminal y para "copiar todos los comandos")
```

```text
salida del comando           -> bloque de salida (nmap, consolas, etc.). Si la etiqueta NO es
                                 bash/sh/shell/console/powershell/python, se trata como salida.
```

| Flag | Para qué sirve |     -> tabla del sitio (cabecera + filas)
|---|---|
| -sV  | detecta versiones |

> Nota o aclaración            -> caja de información (para avisos, contexto o "ojo con esto")

- lista de puntos              -> lista dentro de la prosa

**negrita**, `código`, [enlace](https://...)  -> formato en línea
```

## 3. Reglas de estilo (para que quede uniforme)

1. **Comandos y salidas separados**: comando en ```bash, salida en ```text. Nunca la salida
   dentro del bloque del comando (rompe la tarjeta de terminal).
2. **La flag va censurada**: escribe `HTB{...}` o `FLAG{...}`; el valor real se añade a mano si
   quieres, nunca en el Markdown de trabajo.
3. **IPs y puertos**: los de tu instancia. Añade una nota si cambian en cada despliegue.
4. **Sin capturas de pantalla en el Markdown**: el sitio genera la tarjeta de terminal desde los
   comandos; las capturas reales (si las tienes) se añaden luego como `<figure class="shot">`.
5. **Nada de HTML** en el Markdown: el generador escapa lo que haga falta.
6. **Español**, tono técnico y directo. Los títulos de sección en una o dos palabras.
7. **Explica cada flag** que aparezca, aunque sea obvio: es la sección que más se consulta.
8. **Mínimo recomendado por writeup**: 4-6 secciones, 8-15 comandos, 6 términos de glosario,
   2 curiosidades. Los writeups que ya están en el sitio sirven de referencia de longitud.

## 4. Flujo de trabajo completo

1. Tú resuelves la máquina y guardas las capturas en Word.
2. Claude lo pasa a Markdown **con este modelo** → `writeup.md`.
3. Se genera y publica:
   ```powershell
   python scripts/generar_writeup.py --md writeup.md --publicar `
     --nombre "FirstHacking" --plat dockerlabs --diff muy-facil `
     --tags "FTP|vsftpd 2.3.4|Backdoor|Netcat|Root" --fecha "Octubre 2026"
   ```
   El script crea la página con la plantilla del sitio, inserta la tarjeta en su bloque de
   dificultad, actualiza los contadores y avisa si algo no cuadra.
4. Se completan los extras automáticos: metadatos sociales, banner OG (1200×630), tarjeta de
   terminal, navegación anterior/siguiente, relacionados y sitemap/feed.

## 5. Ejemplo mínimo válido

```markdown
# WriteUp: FirstHacking

```yaml
nombre: FirstHacking
plataforma: DockerLabs
dificultad: muy-facil
tags: FTP, vsftpd 2.3.4, Backdoor, Netcat, Root
fecha: Octubre 2026
resumen: nmap descubre vsFTPd 2.3.4 en el 21; el backdoor de la version troyanizada abre una shell como root.
subtitulo: // vsFTPd 2.3.4 con backdoor -> root en el puerto 6200
```

## Contexto

FirstHacking es la primera máquina de DockerLabs...

> CVE-2011-2523: en 2011 el tarball de vsftpd 2.3.4 se distribuyó con un backdoor...

## Reconocimiento

### Escaneo de puertos

```bash
nmap -sV -p- --min-rate 5000 172.17.0.2
```

```text
21/tcp open  ftp     vsftpd 2.3.4
```

## Referencia de comandos

| Comando | Para qué sirve |
|---|---|
| `nmap -sV` | detecta la versión del servicio |

## Glosario

- **Backdoor**: puerta trasera...

## Curiosidades

- El backdoor se activaba escribiendo `:)`...

## Resumen

nmap → vsftpd 2.3.4 → login con `:)` → nc al 6200 → root.
```
