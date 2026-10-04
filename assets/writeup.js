/* ==========================================================================
   Brandeiks — comportamientos de los writeups (compartido por las 29 paginas)
   Navegacion, modo guion, lightbox, glosario enlazado, resaltado de comandos
   y progreso de lectura. No redefine nada del script propio de cada pagina.
   ========================================================================== */
(function () {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var datos = {};
  try { datos = JSON.parse(($('#datos-writeup') || {}).textContent || '{}'); } catch (e) { datos = {}; }

  function copiar(texto, boton) {
    var listo = function () {
      if (!boton) return;
      var previo = boton.textContent;
      boton.textContent = '✓ COPIADO';
      boton.classList.add('copiado');
      setTimeout(function () { boton.textContent = previo; boton.classList.remove('copiado'); }, 1600);
    };
    if (navigator.clipboard) { navigator.clipboard.writeText(texto).then(listo, function () {}); }
    else {
      var t = document.createElement('textarea');
      t.value = texto; document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); listo(); } catch (e) {}
      document.body.removeChild(t);
    }
  }

  /* ---------------- 1. Volver arriba ---------------- */
  var arriba = document.createElement('button');
  arriba.id = 'btnArriba';
  arriba.className = 'flotante';
  arriba.type = 'button';
  arriba.textContent = '↑ ARRIBA';
  arriba.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  document.body.appendChild(arriba);
  window.addEventListener('scroll', function () {
    arriba.classList.toggle('visible', window.scrollY > 420);
  }, { passive: true });

  /* ---------------- 2. Progreso de lectura ---------------- */
  var enlacesTOC = $$('.toc-list a');
  var secciones = $$('.section[id]');
  var clave = 'wu-leido:' + location.pathname;
  var leidas = {};
  try { leidas = JSON.parse(localStorage.getItem(clave) || '{}'); } catch (e) { leidas = {}; }

  var lectura = document.createElement('span');
  lectura.className = 'lectura';
  var cajaTOC = $('.toc-list');
  if (cajaTOC) cajaTOC.parentNode.appendChild(lectura);

  function pintarLectura() {
    var n = 0;
    enlacesTOC.forEach(function (a) {
      var id = (a.getAttribute('href') || '').replace('#', '');
      if (leidas[id]) { a.classList.add('leido'); n++; } else { a.classList.remove('leido'); }
    });
    if (lectura && enlacesTOC.length) {
      lectura.innerHTML = 'Leídas <b>' + n + '</b> de <b>' + enlacesTOC.length + '</b> secciones';
    }
  }
  function marcarLeidas() {
    var limite = window.scrollY + window.innerHeight * 0.65;
    secciones.forEach(function (s) {
      if (s.offsetTop <= limite && !leidas[s.id]) leidas[s.id] = 1;
    });
    try { localStorage.setItem(clave, JSON.stringify(leidas)); } catch (e) {}
    pintarLectura();
  }
  window.addEventListener('scroll', marcarLeidas, { passive: true });
  pintarLectura();
  marcarLeidas();

  /* ---------------- 3. Enlaces por paso ---------------- */
  $$('.step-marker').forEach(function (m, i) {
    m.id = m.id || 'paso-' + (i + 1);
    var a = document.createElement('a');
    a.href = '#' + m.id;
    a.className = 'ancla-paso';
    a.textContent = '#';
    a.title = 'Enlace directo a este paso';
    a.style.cssText = 'font-family:var(--font-mono);font-size:.7rem;color:var(--text-dim);text-decoration:none;margin-left:auto;opacity:.5';
    a.addEventListener('mouseenter', function () { a.style.opacity = '1'; a.style.color = 'var(--green)'; });
    a.addEventListener('mouseleave', function () { a.style.opacity = '.5'; a.style.color = 'var(--text-dim)'; });
    m.appendChild(a);
  });

  /* ---------------- 4. Resaltado de comandos ---------------- */
  var RE_TOKEN = /(^|\s)(--?[a-zA-Z][\w-]*|"[^"]*"|'[^']*'|\/[^\s;|&]*)/g;
  $$('.cmd-block').forEach(function (bloque) {
    $$('.cmd, .arg, div', bloque).forEach(function (nodo) {
      if (nodo.children.length) return;
      var texto = nodo.textContent;
      if (!texto || texto.indexOf('$') === 0) return;
      var cambiado = texto.replace(RE_TOKEN, function (m, pre, tok) {
        var clase = tok.charAt(0) === '-' ? 'tok-flag'
          : (tok.charAt(0) === '"' || tok.charAt(0) === "'") ? 'tok-comilla' : 'tok-ruta';
        return pre + '<span class="' + clase + '">' + tok + '</span>';
      });
      if (cambiado !== texto) nodo.innerHTML = cambiado;
    });
  });

  /* ---------------- 5. Glosario enlazado ---------------- */
  var terminos = $$('.glos-term').map(function (t) {
    var limpio = t.textContent.split('—')[0].split('(')[0].trim();
    return { corto: limpio, largo: t.parentNode ? t.parentNode.querySelector('.glos-def').textContent.replace(/\s+/g, ' ').trim() : '' };
  }).filter(function (t) { return t.corto.length > 3 && t.corto.length < 40; });

  if (terminos.length) {
    var usados = {};
    $$('.prose p').slice(0, 40).forEach(function (p) {
      if (p.querySelector('.glos-inline')) return;
      var nodos = [];
      var w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT, null);
      while (w.nextNode()) nodos.push(w.currentNode);
      nodos.forEach(function (nodo) {
        if (usados.length > 24) return;
        terminos.forEach(function (t) {
          if (usados[t.corto]) return;
          var i = nodo.nodeValue.toLowerCase().indexOf(t.corto.toLowerCase());
          if (i === -1 || t.corto.length < 4) return;
          var rango = document.createRange();
          rango.setStart(nodo, i); rango.setEnd(nodo, i + t.corto.length);
          var marca = document.createElement('span');
          marca.className = 'glos-inline';
          marca.title = t.largo.slice(0, 300);
          try { rango.surroundContents(marca); } catch (e) { return; }
          usados[t.corto] = 1;
        });
      });
    });
  }

  /* ---------------- 6. Lightbox ---------------- */
  var lightbox = document.createElement('div');
  lightbox.className = 'lightbox';
  lightbox.innerHTML = '<figure style="margin:0;position:relative"><img alt=""><figcaption></figcaption></figure>';
  document.body.appendChild(lightbox);
  function cerrarLightbox() { lightbox.classList.remove('abierto'); }
  lightbox.addEventListener('click', cerrarLightbox);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') cerrarLightbox(); });

  function activarZoom() {
    $$('figure.shot img, img.zoomable').forEach(function (img) {
      if (img.dataset.zoom === '1') return;
      img.dataset.zoom = '1';
      img.classList.add('zoomable');
      img.addEventListener('click', function () {
        $('img', lightbox).src = img.src;
        $('figcaption', lightbox).textContent = img.alt || (img.closest('figure') ? ($('figcaption', img.closest('figure')) || {}).textContent : '') || '';
        lightbox.classList.add('abierto');
      });
    });
  }
  /* lightbox desactivado: se retiraron las capturas generadas */

  /* ---------------- 7. Modo guion ---------------- */
  var pasos = $$('.step-marker');
  if (pasos.length) {
    var boton = document.createElement('button');
    boton.id = 'btnGuion';
    boton.className = 'flotante';
    boton.type = 'button';
    boton.textContent = '▶ MODO GUION';
    document.body.appendChild(boton);

    var capa = document.createElement('div');
    capa.className = 'guion';
    capa.innerHTML =
      '<div class="guion-cab">' +
      '  <div class="guion-titulo">MODO GUION · <span>' + (datos.nombre || document.title.split('—')[0].trim()) + '</span></div>' +
      '  <div class="guion-contador" id="guionContador"></div>' +
      '  <button type="button" class="flotante" id="guionCerrar" style="position:static">CERRAR (ESC)</button>' +
      '</div><div class="guion-cuerpo" id="guionCuerpo"></div>' +
      '<div class="guion-pie"><span>← → para moverte · C copia el comando · Esc cierra</span><span>' +
      (datos.plataforma ? datos.plataforma + (datos.dificultad ? ' · ' + datos.dificultad : '') : '') + '</span></div>';
    document.body.appendChild(capa);

    var lista = [];
    pasos.forEach(function (m) {
      var titulo = m.querySelector('.step-title');
      var parrafo = m.nextElementSibling;
      while (parrafo && !parrafo.classList.contains('prose') && !parrafo.classList.contains('step-marker')) parrafo = parrafo.nextElementSibling;
      var cmd = null, n = m.nextElementSibling;
      while (n && !n.classList.contains('step-marker')) {
        if (!cmd && n.classList.contains('cmd-block')) cmd = n;
        n = n.nextElementSibling;
      }
      var texto = '';
      if (parrafo && parrafo.classList.contains('prose')) {
        var ps = $$('p', parrafo);
        texto = ps.length ? ps.map(function (p) { return p.textContent; }).join(' ') : parrafo.textContent;
      }
      lista.push({
        titulo: titulo ? titulo.textContent : 'PASO',
        texto: texto.replace(/\s+/g, ' ').trim().slice(0, 420),
        cmd: cmd ? (cmd.dataset.cmd || cmd.textContent.replace(/\s+/g, ' ').trim()) : ''
      });
    });

    var actual = 0;
    function pintar() {
      var cuerpo = $('#guionCuerpo');
      cuerpo.innerHTML = '';
      lista.slice(0, actual + 1).forEach(function (p, i) {
        var d = document.createElement('div');
        d.className = 'guion-paso';
        d.innerHTML = '<h3>' + (i + 1) + ' · ' + p.titulo + '</h3>' +
          (p.texto ? '<p>' + p.texto + '</p>' : '') +
          (p.cmd ? '<div class="guion-cmd"><span>' + p.cmd.replace(/</g, '&lt;') + '</span>' +
                   '<button type="button" class="flotante" style="position:static" data-cmd="' +
                   p.cmd.replace(/"/g, '&quot;') + '">COPIAR</button></div>' : '');
        cuerpo.appendChild(d);
      });
      $$('[data-cmd]', cuerpo).forEach(function (b) {
        b.addEventListener('click', function () { copiar(b.dataset.cmd, b); });
      });
      $('#guionContador').textContent = 'PASO ' + (actual + 1) + ' / ' + lista.length;
      cuerpo.scrollTop = cuerpo.scrollHeight;
    }
    function mover(d) {
      actual = Math.max(0, Math.min(lista.length - 1, actual + d));
      pintar();
    }
    boton.addEventListener('click', function () { capa.classList.add('abierto'); actual = 0; pintar(); });
    $('#guionCerrar').addEventListener('click', function () { capa.classList.remove('abierto'); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'g' && !/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) {
        capa.classList.toggle('abierto');
        if (capa.classList.contains('abierto')) { actual = 0; pintar(); }
      }
      if (!capa.classList.contains('abierto')) return;
      if (e.key === 'Escape') capa.classList.remove('abierto');
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); mover(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); mover(-1); }
      if (e.key.toLowerCase() === 'c') {
        var ultimo = lista[actual] && lista[actual].cmd;
        if (ultimo) copiar(ultimo, null);
      }
    });
  }

  /* ---------------- 8. Copiar todos los comandos ---------------- */
  var bloquesCmd = $$('.cmd-block[data-cmd]');
  if (bloquesCmd.length > 1) {
    var btn = document.createElement('button');
    btn.id = 'btnTodos';
    btn.className = 'flotante';
    btn.type = 'button';
    btn.textContent = '⧉ COPIAR COMANDOS (' + bloquesCmd.length + ')';
    btn.title = 'Copiar todos los comandos del writeup como script';
    btn.addEventListener('click', function () {
      var cabecera = '#!/bin/bash\n# ' + (datos.nombre || document.title.split('—')[0].trim()) +
        ' — comandos del writeup\n# ' + location.href + '\n\n';
      var cuerpo = bloquesCmd.map(function (b) { return b.dataset.cmd; })
        .filter(function (c) { return c && c.indexOf('COMMAND') !== 0; }).join('\n');
      copiar(cabecera + cuerpo, btn);
    });
    document.body.appendChild(btn);
  }
})();
