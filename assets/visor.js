/* ============================================================
   Visor de certificados para las galerias (hxploit, ieee...).
   Los enlaces con atributo data-visor abren su imagen dentro de la
   pagina en vez de en otra pestana:
   - flechas (o teclas <- ->, o deslizar en movil) para pasar de uno a otro
   - Esc, la X o un clic fuera de la imagen para cerrar
   - "ABRIR ORIGINAL" abre la imagen en otra pestana, como antes
   Sin JavaScript (o con Ctrl/Cmd/Mayus/clic central) el enlace funciona igual
   que siempre. Inyecta su propio CSS, como assets/cursor.js.
   El pie de cada imagen sale del <article> del enlace: su <h3> y su fecha.
   ============================================================ */
(function () {
  var enlaces = [].slice.call(document.querySelectorAll('a[data-visor]'));
  if (!enlaces.length) return;

  // Una entrada por imagen (la miniatura y "VER EN GRANDE" apuntan a la misma)
  var fotos = [], indicePorHref = {};
  enlaces.forEach(function (a) {
    if (!(a.href in indicePorHref)) {
      var art = a.closest('article');
      var h3 = art && art.querySelector('h3');
      var fecha = art && art.querySelector('[class$="-fecha"]');
      var img = art && art.querySelector('img');
      indicePorHref[a.href] = fotos.length;
      fotos.push({
        src: a.href,
        titulo: h3 ? h3.textContent.trim() : '',
        detalle: fecha ? fecha.textContent.trim() : '',
        alt: img ? img.alt : ''
      });
    }
  });

  var css = ''
    + '.visor{position:fixed;inset:0;z-index:9000;display:none;flex-direction:column;align-items:center;justify-content:center;'
    + 'gap:1rem;padding:3.5rem 4.5rem 1.5rem;background:rgba(5,10,14,.94);backdrop-filter:blur(6px);}'
    + '.visor.abierto{display:flex;}'
    + '.visor-img{max-width:100%;max-height:calc(100vh - 11rem);object-fit:contain;border:1px solid var(--dim,#1a2a2e);'
    + 'box-shadow:0 0 40px rgba(0,255,136,.08);background:var(--bg3,#0a1520);}'
    + '.visor-pie{text-align:center;font-family:var(--font-mono,monospace);color:var(--text-dim,#4a6a74);font-size:.7rem;letter-spacing:1px;max-width:720px;}'
    + '.visor-pie strong{display:block;font-family:var(--font-disp,sans-serif);color:var(--text,#c8d8e0);font-size:.95rem;letter-spacing:1px;margin-bottom:.3rem;font-weight:700;}'
    + '.visor-barra{display:flex;flex-wrap:wrap;gap:.6rem 1rem;align-items:center;justify-content:center;margin-top:.5rem;}'
    + '.visor-cuenta{color:var(--cyan,#00e5ff);}'
    + '.visor-original{font-family:var(--font-mono,monospace);font-size:.65rem;letter-spacing:2px;color:var(--green,#00ff88);'
    + 'text-decoration:none;border:1px solid rgba(0,255,136,.35);padding:.4rem .8rem;transition:background .2s,border-color .2s;}'
    + '.visor-original:hover{border-color:var(--green,#00ff88);background:rgba(0,255,136,.06);}'
    + '.visor-btn{position:absolute;display:flex;align-items:center;justify-content:center;width:44px;height:44px;cursor:pointer;'
    + 'font-family:var(--font-mono,monospace);font-size:1.3rem;line-height:1;color:var(--text,#c8d8e0);background:rgba(8,15,20,.85);'
    + 'border:1px solid var(--dim,#1a2a2e);transition:color .2s,border-color .2s;}'
    + '.visor-btn:hover,.visor-btn:focus-visible{color:var(--green,#00ff88);border-color:var(--green,#00ff88);outline:none;}'
    + '.visor-cerrar{top:.9rem;right:.9rem;}'
    + '.visor-ant{left:.9rem;top:50%;transform:translateY(-50%);}'
    + '.visor-sig{right:.9rem;top:50%;transform:translateY(-50%);}'
    + '.visor.solo .visor-ant,.visor.solo .visor-sig,.visor.solo .visor-cuenta{display:none;}'
    + '@media(max-width:700px){.visor{padding:4rem .8rem 1.2rem;}.visor-ant,.visor-sig{top:auto;bottom:1rem;transform:none;}'
    + '.visor-img{max-height:calc(100vh - 14rem);}.visor-barra{margin-bottom:3.2rem;}}';
  var estilo = document.createElement('style');
  estilo.setAttribute('data-visor', '');
  estilo.textContent = css;
  document.head.appendChild(estilo);

  var visor = document.createElement('div');
  visor.className = 'visor';
  visor.setAttribute('role', 'dialog');
  visor.setAttribute('aria-modal', 'true');
  visor.setAttribute('aria-label', 'Visor de certificados');
  visor.innerHTML = ''
    + '<button type="button" class="visor-btn visor-cerrar" aria-label="Cerrar (Esc)">✕</button>'
    + '<button type="button" class="visor-btn visor-ant" aria-label="Certificado anterior">‹</button>'
    + '<button type="button" class="visor-btn visor-sig" aria-label="Certificado siguiente">›</button>'
    + '<img class="visor-img" alt="">'
    + '<div class="visor-pie"><strong></strong><span class="visor-detalle"></span>'
    + '<div class="visor-barra"><span class="visor-cuenta"></span>'
    + '<a class="visor-original" target="_blank" rel="noopener">ABRIR ORIGINAL ↗</a></div></div>';
  document.body.appendChild(visor);
  if (fotos.length < 2) visor.classList.add('solo');

  var img = visor.querySelector('.visor-img');
  var titulo = visor.querySelector('.visor-pie strong');
  var detalle = visor.querySelector('.visor-detalle');
  var cuenta = visor.querySelector('.visor-cuenta');
  var original = visor.querySelector('.visor-original');
  var cerrarBtn = visor.querySelector('.visor-cerrar');
  var actual = 0, volverA = null;

  function mostrar(i) {
    actual = (i + fotos.length) % fotos.length;
    var f = fotos[actual];
    img.src = f.src; img.alt = f.alt;
    titulo.textContent = f.titulo; detalle.textContent = f.detalle;
    cuenta.textContent = (actual + 1) + ' / ' + fotos.length;
    original.href = f.src;
    // precarga las vecinas para que el cambio sea instantaneo
    [actual - 1, actual + 1].forEach(function (k) {
      if (fotos.length > 1) (new Image()).src = fotos[(k + fotos.length) % fotos.length].src;
    });
  }
  function abrir(i, origen) {
    volverA = origen || null;
    mostrar(i);
    visor.classList.add('abierto');
    document.documentElement.style.overflow = 'hidden';
    cerrarBtn.focus();
  }
  function cerrar() {
    visor.classList.remove('abierto');
    document.documentElement.style.overflow = '';
    img.removeAttribute('src');
    if (volverA) volverA.focus();
  }

  enlaces.forEach(function (a) {
    a.addEventListener('click', function (e) {
      if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      abrir(indicePorHref[a.href], a);
    });
  });
  cerrarBtn.addEventListener('click', cerrar);
  visor.querySelector('.visor-ant').addEventListener('click', function () { mostrar(actual - 1); });
  visor.querySelector('.visor-sig').addEventListener('click', function () { mostrar(actual + 1); });
  // clic en el fondo (no en la imagen, el pie ni los botones) cierra
  visor.addEventListener('click', function (e) { if (e.target === visor) cerrar(); });

  document.addEventListener('keydown', function (e) {
    if (!visor.classList.contains('abierto')) return;
    if (e.key === 'Escape') { e.preventDefault(); cerrar(); }
    else if (e.key === 'ArrowLeft' && fotos.length > 1) { e.preventDefault(); mostrar(actual - 1); }
    else if (e.key === 'ArrowRight' && fotos.length > 1) { e.preventDefault(); mostrar(actual + 1); }
    else if (e.key === 'Tab') {
      // el foco no sale del visor mientras esta abierto
      var foco = [].slice.call(visor.querySelectorAll('button, a')).filter(function (el) { return el.offsetParent !== null; });
      var i = foco.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); foco[foco.length - 1].focus(); }
      else if (!e.shiftKey && i === foco.length - 1) { e.preventDefault(); foco[0].focus(); }
    }
  });

  // deslizar en movil
  var x0 = null;
  visor.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  visor.addEventListener('touchend', function (e) {
    if (x0 === null || fotos.length < 2) return;
    var dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) mostrar(actual + (dx < 0 ? 1 : -1));
    x0 = null;
  });
})();
