/* ============================================================
   Cursor personalizado unico para TODO el sitio.
   Fuente de verdad: este archivo (antes estaba duplicado y con
   comportamientos distintos en cada pagina). Comportamiento canonico
   tomado del de la portada: punto + anillo, el anillo crece sobre
   elementos interactivos y ambos encogen/crecen al hacer clic.
   - Inyecta su propio CSS (no hace falta hoja aparte).
   - Crea los <div> del cursor si la pagina no los trae.
   - Se desactiva en tactil y en pantallas <= 960px.
   ============================================================ */

/* Adornos de temporada: como este archivo esta en todas las paginas, desde aqui
   se carga assets/halloween.js (junto a este archivo) solo en octubre, segun la
   fecha del visitante. Para probar: ?halloween=1 los enciende y ?halloween=0 los
   apaga en cualquier fecha. Va antes del cursor porque este se corta en tactil. */
(function () {
  var forzado = /[?&]halloween=([01])/.exec(location.search);
  var activo = forzado ? forzado[1] === '1' : new Date().getMonth() === 9;
  var yo = document.currentScript && document.currentScript.src;
  if (!activo || !yo) return;
  var s = document.createElement('script');
  s.src = yo.replace(/cursor\.js(\?.*)?$/, 'halloween.js');
  document.head.appendChild(s);
})();

(function () {
  // En dispositivos tactiles no hay cursor que seguir.
  if (window.matchMedia && window.matchMedia('(hover: none)').matches) return;

  // --- CSS canonico (gana sobre cualquier regla .cursor previa por ir despues) ---
  var css = ''
    + '.cursor{position:fixed;width:10px;height:10px;background:var(--green,#00ff88);'
    + 'border-radius:50%;pointer-events:none;z-index:9999;transform:translate(-50%,-50%);'
    + 'opacity:0;transition:opacity .15s,width .18s,height .18s;box-shadow:0 0 12px var(--green,#00ff88);}'
    + '.cursor-ring{position:fixed;width:36px;height:36px;border:1px solid var(--green,#00ff88);'
    + 'border-radius:50%;pointer-events:none;z-index:9998;transform:translate(-50%,-50%);'
    + 'opacity:0;transition:opacity .15s,width .18s,height .18s;}'
    + '.cursor.clicked{transform:translate(-50%,-50%) scale(0.5);}'
    + '.cursor-ring.clicked{transform:translate(-50%,-50%) scale(1.4);}'
    + '@media(max-width:960px){.cursor,.cursor-ring{display:none!important;}}'
    + '@media(hover:none){.cursor,.cursor-ring{display:none!important;}}';
  var estilo = document.createElement('style');
  estilo.setAttribute('data-cursor', '');
  estilo.textContent = css;
  document.head.appendChild(estilo);

  // --- elementos (reutiliza los de la pagina si existen) ---
  function asegurar(id, clase) {
    var el = document.getElementById(id);
    if (!el) { el = document.createElement('div'); el.id = id; el.className = clase; document.body.appendChild(el); }
    else { el.className = clase; }
    return el;
  }
  var cursor = asegurar('cursor', 'cursor');
  var ring = asegurar('cursorRing', 'cursor-ring');

  // --- seguimiento ---
  var visible = false;
  document.addEventListener('mousemove', function (e) {
    cursor.style.left = e.clientX + 'px'; cursor.style.top = e.clientY + 'px';
    ring.style.left = e.clientX + 'px'; ring.style.top = e.clientY + 'px';
    if (!visible) { visible = true; cursor.style.opacity = '1'; ring.style.opacity = '0.5'; }
  });
  document.addEventListener('mouseleave', function () {
    cursor.style.opacity = '0'; ring.style.opacity = '0'; visible = false;
  });

  // --- clic ---
  document.addEventListener('mousedown', function () { cursor.classList.add('clicked'); ring.classList.add('clicked'); });
  document.addEventListener('mouseup', function () { cursor.classList.remove('clicked'); ring.classList.remove('clicked'); });

  // --- el anillo crece sobre elementos interactivos (delegacion: sirve tambien
  //     para los que se crean despues, p. ej. resultados de busqueda) ---
  var selector = 'a, button, .btn, input, label, select, textarea, [role="button"]';
  document.addEventListener('mouseover', function (e) {
    if (e.target.closest && e.target.closest(selector)) {
      ring.style.width = '54px'; ring.style.height = '54px'; ring.style.opacity = '0.3';
    }
  });
  document.addEventListener('mouseout', function (e) {
    if (e.target.closest && e.target.closest(selector)) {
      ring.style.width = '36px'; ring.style.height = '36px'; ring.style.opacity = '0.5';
    }
  });
})();
