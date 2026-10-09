/* ============================================================
   Dragon de jade de la portada: entra volando y se posa sobre la
   terminal del hero. Todo es un SVG dentro de .terminal, en el verde
   de la web.
   Inspirado en dragones de jade chinos reales: cuerpo de piedra veteada
   y pulida con el "patron de granos" (filas de puntos en relieve),
   volutas en espiral en el lomo, melena en forma de hoja (Hongshan),
   hocico enroscado, cola en espiral y la perla en llamas (Qing).
   - Vuelo: el cuerpo es un trazo que avanza por una ruta (ventana de
     stroke-dasharray) y la cabeza sigue la punta. Las vetas y los granos
     son patrones de trazos que se mueven con el cuerpo. Dura ~3,4 s y
     solo se reproduce una vez, cuando la terminal ya se ve.
   - Al posarse aparecen las filas de granos, las volutas, las patas, la
     perla y la cola se enrosca; despues solo hay animaciones pequenas
     (bigotes, parpadeo, perla, un brillo que recorre el cuerpo), que se
     pausan si el dragon no esta a la vista.
   - Con "reducir movimiento" aparece ya posado y quieto.
   - Entre 901 y 1279 px no se muestra: ahi el texto del hero llega
     hasta la columna de la terminal.
   NO EDITAR assets/dragon.js A MANO: se genera con scripts/generar_dragon.py
   a partir de esta plantilla (rutas en coordenadas del viewBox 0 0 420 260;
   el borde de la terminal esta en y = 260).
   ============================================================ */
(function () {
  var terminal = document.querySelector('#hero .terminal');
  if (!terminal || !window.requestAnimationFrame) return;

  var css = ''
    + '.terminal.con-dragon{overflow:visible;}'
    + '.terminal.con-dragon .terminal-bar{border-radius:3px 3px 0 0;}'
    + '@media(max-width:900px){.terminal.con-dragon{margin-top:calc(3rem + min(62%, 285px));}}'
    + '@media(min-width:901px) and (max-width:1279px){.dragon{display:none;}}'
    + '.dragon{position:absolute;left:0;bottom:100%;width:100%;max-width:460px;height:auto;overflow:visible;pointer-events:none;z-index:3;}'
    // piedra: halo, borde de neon, jade oscuro, nucleo mas claro, vetas y brillo de pulido
    + '.dr-capa{fill:none;stroke-linecap:round;stroke-linejoin:round;}'
    + '.dr-halo{stroke:#00ff88;opacity:.06;stroke-linecap:butt;}'
    + '.dr-borde{stroke:#00ff88;opacity:.85;}'
    + '.dr-jade{stroke:#0b5236;}'
    + '.dr-nucleo{stroke:#1a8a5a;}'
    + '.dr-vetas{stroke:#55e8a8;stroke-width:7.5;opacity:.3;}'
    + '.dr-pulido{stroke:#9dffd2;stroke-width:5;opacity:.18;}'
    + '.dr-luz{stroke:#e0fff0;stroke-width:1.4;opacity:.5;}'
    // patron de granos: puntos claros con su sombra (relieve)
    + '.dr-grano{fill:none;stroke:#b8ffe0;stroke-width:2.6;stroke-linecap:round;opacity:.7;}'
    + '.dr-grano.sombra{stroke:#021c12;opacity:.75;stroke-width:2.8;}'
    + '.dr-grano-fila{stroke-dasharray:0.01 6.4;}.dr-grano-fila.alt{stroke-dashoffset:3.2;}'
    // adornos
    + '.dr-voluta-borde{fill:none;stroke:#00ff88;stroke-width:4.4;stroke-linecap:round;opacity:.85;}'
    + '.dr-voluta-jade{fill:none;stroke:#12774c;stroke-width:2.4;stroke-linecap:round;}'
    + '.dr-cola-trazo{transition:stroke-dashoffset .9s ease-out .15s;}'
    + '.dr-pata{fill:#0f6a44;stroke:#00ff88;stroke-width:1.2;stroke-linejoin:round;}'
    + '.dr-garra{fill:none;stroke:#d8fff0;stroke-width:1.5;stroke-linecap:round;}'
    + '.dr-espiral,.dr-linea{fill:none;stroke:#00ff88;stroke-width:1.2;stroke-linecap:round;}'
    + '.dr-craneo{fill:url(#dr-cabeza-g);}'
    + '.dr-contorno{fill:none;stroke:#00ff88;stroke-width:1.4;stroke-linejoin:round;stroke-linecap:round;}'
    + '.dr-melena{fill:url(#dr-cabeza-g);stroke:#00ff88;stroke-width:1.2;stroke-linejoin:round;}'
    + '.dr-melena.fondo{fill:#0b4f33;}.dr-melena.claro{fill:#1f9a66;}'
    + '.dr-surco{fill:none;stroke:#00ff88;stroke-width:.8;opacity:.6;stroke-linecap:round;}'
    + '.dr-brillo-cabeza{fill:none;stroke:#c8ffe6;stroke-width:1.3;opacity:.35;stroke-linecap:round;}'
    + '.dr-colmillo{fill:#eafff4;}'
    + '.dr-cuerno{fill:none;stroke:#00ff88;stroke-width:2.6;stroke-linecap:round;}'
    + '.dr-cuerno.atras{stroke:#12774c;stroke-width:3;}.dr-cuerno.rama{stroke-width:1.8;}'
    + '.dr-barba{fill:#0b4f33;stroke:#00ff88;stroke-width:1;stroke-linejoin:round;}'
    + '.dr-ojo-halo{fill:#00ff88;opacity:.22;}'
    + '.dr-ojo{fill:#eafff4;transform-origin:40px -11px;}'
    + '.dr-pupila{fill:none;stroke:#021a10;stroke-width:1.4;stroke-linecap:round;}'
    + '.dr-bigote{fill:none;stroke:#00ff88;stroke-width:1.3;stroke-linecap:round;transform-origin:66px -3px;}'
    + '.dr-bigote.b2{stroke-width:1.1;opacity:.8;transform-origin:62px 2px;}'
    + '.dr-perla-halo{fill:#00ff88;opacity:.16;}'
    + '.dr-llama{fill:#00ff88;opacity:.75;}'
    + '.dr-brillo{fill:none;stroke:#e6fff4;stroke-width:3;stroke-linecap:round;opacity:0;stroke-dasharray:34 {{LARGO_MAS}};stroke-dashoffset:40;}'
    + '.dr-destello{stroke:#00ff88;stroke-width:2;opacity:0;}'
    // estados: antes de volar no se ve nada; en vuelo, cuerpo con ventana; posado, la pose fija
    + '.dr-vuelo,.dr-cabeza{visibility:hidden;}'
    + '.dragon.volando .dr-vuelo,.dragon.volando .dr-cabeza,.dragon.posado .dr-cabeza{visibility:visible;}'
    + '.dragon.posado .dr-vuelo{visibility:hidden;}'
    + '.dr-final{visibility:hidden;}.dragon.posado .dr-final{visibility:visible;}'
    + '.dr-tarde{opacity:0;transition:opacity .7s ease;}'
    + '.dragon.posado .dr-tarde{opacity:1;}'
    + '.dragon.posado .dr-t2{transition-delay:.2s;}.dragon.posado .dr-t3{transition-delay:.45s;}'
    // animaciones en reposo (solo transform/opacity y un dashoffset)
    + '.dragon.posado .dr-destello{animation:dr-destello 1s ease-out;}'
    + '.dragon.posado .dr-brillo{opacity:.7;animation:dr-brillo 7s linear 1.2s infinite;}'
    + '.dragon.posado .dr-bigote{animation:dr-bigote 3.6s ease-in-out infinite alternate;}'
    + '.dragon.posado .dr-bigote.b2{animation-duration:4.4s;animation-delay:-1.2s;}'
    + '.dragon.posado .dr-ojo{animation:dr-parpadeo 5.5s ease-in-out 2s infinite;}'
    + '.dragon.posado .dr-perla{animation:dr-flota 3s ease-in-out infinite alternate;}'
    + '.dragon.posado .dr-llamas{animation:dr-gira 6s linear infinite;}'
    + '@keyframes dr-destello{0%{opacity:0;}25%{opacity:.95;}100%{opacity:0;}}'
    + '@keyframes dr-brillo{from{stroke-dashoffset:40;}to{stroke-dashoffset:-{{LARGO}};}}'
    + '@keyframes dr-bigote{from{transform:rotate(-6deg);}to{transform:rotate(7deg);}}'
    + '@keyframes dr-parpadeo{0%,92%,100%{transform:scaleY(1);}95%{transform:scaleY(.08);}}'
    + '@keyframes dr-flota{from{transform:translateY(-3px);}to{transform:translateY(3px);}}'
    + '@keyframes dr-gira{to{transform:rotate(360deg);}}'
    + '.dragon.quieto *{animation-play-state:paused!important;}'
    + '@media(prefers-reduced-motion:reduce){.dragon *{animation:none!important;transition:none!important;}}';

  var CABEZA_FINAL = '{{CABEZA_TR}}';
  var RUTA = '{{RUTA}}';
  var POSE = '{{POSE}}';

  // El cuerpo se dibuja en tres tramos para que la cola se afine hacia la punta:
  // desde/hasta = distancia desde la punta de la cola (hasta null = hasta la cabeza)
  var TRAMOS = [{ desde: 0, hasta: 18, k: 0.4 }, { desde: 9, hasta: 32, k: 0.55 }, { desde: 21, hasta: 46, k: 0.7 },
                { desde: 34, hasta: 60, k: 0.85 }, { desde: 48, hasta: null, k: 1 }];
  var ANCHOS = { 'dr-halo': 30, 'dr-borde': 18.6, 'dr-jade': 16, 'dr-nucleo': 11 };
  var capa = function (nombre, d, clase, soloCuerpo) {
    var h = '';
    TRAMOS.forEach(function (t, i) {
      if (soloCuerpo && t.hasta !== null) return;
      h += '<path class="dr-capa ' + nombre + ' ' + clase + '" data-tramo="' + i + '" style="stroke-width:'
        + +(ANCHOS[nombre] * t.k).toFixed(2) + '" d="' + d + '"/>';
    });
    return h;
  };
  // capas que solo cubren el cuerpo (desde la cola gruesa) y llevan un patron propio
  var patronCapa = function (clase, d, extra) {
    return '<path class="dr-capa ' + clase + ' ' + extra + '" d="' + d + '"/>';
  };
  var volutas = '{{VOLUTAS_TR}}'.split('|').map(function (tr) {
    return '<g transform="' + tr + '"><path class="dr-voluta-borde" d="{{VOLUTA}}"/><path class="dr-voluta-jade" d="{{VOLUTA}}"/></g>';
  }).join('');
  var colaCapa = function (nombre, ancho) {
    return '<g transform="{{COLA_TR}}"><path class="dr-capa ' + nombre + ' dr-final dr-cola-trazo" style="stroke-width:' + ancho + '" d="{{COLA}}"/></g>';
  };
  var granos = function (clase) {
    return '<path class="dr-grano dr-grano-fila ' + clase + '" d="{{GRANO0}}"/>'
      + '<path class="dr-grano dr-grano-fila alt ' + clase + '" d="{{GRANO1}}"/>'
      + '<path class="dr-grano dr-grano-fila alt ' + clase + '" d="{{GRANO2}}"/>';
  };

  var svg = ''
    + '<svg class="dragon" viewBox="0 0 420 260" aria-hidden="true" focusable="false">'
    + '<defs>'
    + '<radialGradient id="dr-perla-g" cx="38%" cy="35%" r="65%"><stop offset="0" stop-color="#ffffff"/>'
    + '<stop offset=".35" stop-color="#b9ffe0"/><stop offset=".75" stop-color="#00ff88"/><stop offset="1" stop-color="#00995a"/></radialGradient>'
    + '<linearGradient id="dr-cabeza-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3cc98c"/>'
    + '<stop offset=".5" stop-color="#1a8a5a"/><stop offset="1" stop-color="#0b5236"/></linearGradient>'
    // recorte del vuelo: nada por encima del borde inferior del menu (se calcula al despegar)
    + '<clipPath id="dr-recorte"><rect x="-3000" y="-3000" width="6000" height="6000"/></clipPath>'
    + '</defs>'
    + '<line class="dr-destello" x1="0" y1="260" x2="420" y2="260"/>'
    + '<g class="dr-tarde dr-final">' + volutas + '</g>'
    // patas por debajo del cuerpo: solo asoman las garras
    + '<g class="dr-tarde dr-t2"><path class="dr-pata" d="{{PATAS}}"/><path class="dr-garra" d="{{GARRAS}}"/></g>'
    // cuerpo en vuelo (ventanas sobre RUTA) y cuerpo posado (POSE)
    + capa('dr-halo', RUTA, 'dr-vuelo', true) + capa('dr-halo', POSE, 'dr-final', true)
    + capa('dr-borde', RUTA, 'dr-vuelo') + capa('dr-jade', RUTA, 'dr-vuelo') + capa('dr-nucleo', RUTA, 'dr-vuelo')
    + patronCapa('dr-vetas', RUTA, 'dr-vuelo dr-patron') + patronCapa('dr-pulido', RUTA, 'dr-vuelo dr-patron')
    + patronCapa('dr-luz', RUTA, 'dr-vuelo dr-patron')
    + '<path class="dr-grano sombra dr-vuelo dr-patron" transform="translate(.5 .9)" d="' + RUTA + '"/>'
    + '<path class="dr-grano dr-vuelo dr-patron" d="' + RUTA + '"/>'
    + capa('dr-borde', POSE, 'dr-final') + colaCapa('dr-borde', 7.4)
    + capa('dr-jade', POSE, 'dr-final') + colaCapa('dr-jade', 6.4)
    + capa('dr-nucleo', POSE, 'dr-final') + colaCapa('dr-nucleo', 4.4)
    + patronCapa('dr-vetas', POSE, 'dr-final dr-patron') + patronCapa('dr-pulido', POSE, 'dr-final dr-patron')
    + patronCapa('dr-luz', POSE, 'dr-final dr-patron')
    + '<g class="dr-final dr-tarde"><g transform="translate(.5 .9)">' + granos('sombra') + '</g>' + granos('') + '</g>'
    + '<path class="dr-brillo dr-final" d="' + POSE + '"/>'
    // cabeza (dibujada mirando a +x, con el cuello en el origen)
    + '<g clip-path="url(#dr-recorte)"><g class="dr-cabeza" transform="' + CABEZA_FINAL + '"><g transform="scale(1.1)">'
    + '<path class="dr-melena fondo" d="M2,-12 C-8,-18 -20,-20 -32,-18 C-22,-14 -14,-10 -6,-6 Z"/>'
    + '<path class="dr-melena" d="M18,-17 C8,-27 -12,-33 -40,-31 C-30,-26 -18,-19 -6,-9 Z"/>'
    + '<path class="dr-surco" d="M12,-20 C0,-26 -16,-29 -32,-29.5"/>'
    + '<path class="dr-cuerno atras" d="M19,-17 C13,-24 6,-27 -4,-29"/>'
    + '<path class="dr-cuerno" d="M24,-18 C18,-28 10,-34 -2,-38"/><path class="dr-cuerno rama" d="M12,-31 C11,-37 13,-41 16,-44"/>'
    + '<path class="dr-barba" d="M22,14 L16,23 L12,15 L6,22 L2,13 Z"/>'
    // mandibula y craneo: relleno cerrado y contorno abierto, para que la nuca se funda con el cuello
    + '<path class="dr-craneo" d="M28,7 C40,7.5 52,8.5 60,9 C63.5,9.5 63.5,12.5 60.5,14 C50,16.5 36,16.5 22,14.5 C12,13.5 2,12 -8,10 L-8,7.5 C6,7.5 18,7.2 28,7 Z"/>'
    + '<path class="dr-contorno" d="M28,7 C40,7.5 52,8.5 60,9 C63.5,9.5 63.5,12.5 60.5,14 C50,16.5 36,16.5 22,14.5 C14,13.7 7,12.8 1,11.8 M2,7.5 C10,7.5 18,7.2 28,7"/>'
    + '<path class="dr-craneo" d="M-8,-9 C2,-16 14,-19 24,-18 C31,-17 35,-21 42,-20 C50,-19 55,-14 62,-13 C68,-12 72,-9 73,-5 C74,-1 71,1 67,1 C58,1.5 44,2.5 30,4 C20,5 8,6 -8,6 Z"/>'
    + '<path class="dr-contorno" d="M3,-14.2 C9,-17.4 16,-18.6 24,-18 C31,-17 35,-21 42,-20 C50,-19 55,-14 62,-13 C68,-12 72,-9 73,-5 C74,-1 71,1 67,1 C58,1.5 44,2.5 30,4 C21,4.9 12,5.6 3,5.9"/>'
    + '<path class="dr-colmillo" d="M56,1.6 L57.6,6 L59.2,1.4 Z M48,2.2 L49.4,6.2 L50.8,2.4 Z M53.6,8.6 L55,5.4 L56.4,8.8 Z"/>'
    + '<path class="dr-melena" d="M7,-8 C-4,-12 -14,-12 -26,-16 C-18,-8 -12,-4 -1,-2 Z"/>'
    + '<path class="dr-melena claro" d="M7,-1 C-6,-2 -17,0 -31,-2 C-21,4 -12,7 1,6 Z"/>'
    + '<path class="dr-melena" d="M7,6 C-4,8 -12,12 -24,14 C-14,16 -6,15 5,11 Z"/>'
    + '<path class="dr-linea" d="M72,-6 C77,-8 79,-13 76,-16 C73.5,-18 70,-15.5 72,-13"/>'
    + '<path class="dr-linea" d="M66,-7.5 q3,-2.2 4.4,1"/>'
    + '<path class="dr-linea" d="M27,3 C22,-0.5 23.5,-6 28.5,-6 C32.5,-6 33.5,-2 31,0"/>'
    + '<path class="dr-linea" d="M33,-15 Q41,-25 51,-17"/>'
    + '<path class="dr-brillo-cabeza" d="M8,-14 C20,-17 34,-17 46,-16"/>'
    + '<circle class="dr-ojo-halo" cx="40" cy="-11" r="7"/>'
    + '<g class="dr-ojo"><path d="M34,-11 Q40,-16.5 46.5,-11.2 Q40,-7.8 34,-11 Z"/><path class="dr-pupila" d="M40.3,-14 Q41.6,-11 40.3,-8.4"/></g>'
    + '<path class="dr-bigote" d="M66,-3 C80,-9 93,-1 98,13 C101,23 96,33 87,38"/>'
    + '<path class="dr-bigote b2" d="M62,2 C75,8 82,21 76,35"/>'
    + '</g></g></g>'
    + '<g class="dr-tarde dr-t3" transform="translate({{PERLA_X}} {{PERLA_Y}})"><g class="dr-perla">'
    + '<circle class="dr-perla-halo" r="13"/>'
    + '<g class="dr-llamas"><path class="dr-llama" d="M0,-9 C3,-13 2,-17 0,-21 C-1,-17 -4,-13 0,-9 Z"/>'
    + '<path class="dr-llama" transform="rotate(120)" d="M0,-9 C3,-13 2,-17 0,-21 C-1,-17 -4,-13 0,-9 Z"/>'
    + '<path class="dr-llama" transform="rotate(240)" d="M0,-9 C3,-13 2,-17 0,-21 C-1,-17 -4,-13 0,-9 Z"/></g>'
    + '<circle r="7.5" fill="url(#dr-perla-g)"/></g></g>'
    + '</svg>';

  var estilo = document.createElement('style');
  estilo.setAttribute('data-dragon', '');
  estilo.textContent = css;
  document.head.appendChild(estilo);
  terminal.classList.add('con-dragon');
  terminal.insertAdjacentHTML('afterbegin', svg);

  var dragon = terminal.querySelector('.dragon');
  var tramosVuelo = [].slice.call(dragon.querySelectorAll('.dr-vuelo[data-tramo]'));
  var tramosFinal = [].slice.call(dragon.querySelectorAll('.dr-final[data-tramo]'));
  var patronesVuelo = [].slice.call(dragon.querySelectorAll('.dr-vuelo.dr-patron'));
  var patronesFinal = [].slice.call(dragon.querySelectorAll('.dr-final.dr-patron'));
  var cola = [].slice.call(dragon.querySelectorAll('.dr-cola-trazo'));
  var ruta = tramosVuelo[0];
  var cabeza = dragon.querySelector('.dr-cabeza');
  var recorte = dragon.querySelector('#dr-recorte rect');
  tramosVuelo.concat(patronesVuelo).forEach(function (c) { c.setAttribute('clip-path', 'url(#dr-recorte)'); });
  var reducir = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var volado = false, terminalLista = false, visible = false;
  var tramoDe = function (c) { return TRAMOS[+c.getAttribute('data-tramo')]; };

  // patron de trazos de largo (hasta - desde); "secuencia" se repite (raya, hueco, raya...).
  // Empieza en su primera raya: se coloca en "desde" con stroke-dashoffset (una raya de
  // largo 0 al principio pintaria un punto, por el remate redondo).
  var patron = function (desde, hasta, secuencia, fin) {
    if (secuencia === 'continuo') return (hasta - desde) + ' ' + fin;
    var a = [], x = desde, i = 0;
    while (true) {
      var raya = secuencia[i % secuencia.length], hueco = secuencia[(i + 1) % secuencia.length];
      if (x + raya + hueco > hasta) break;
      a.push(raya, hueco); x += raya + hueco; i += 2;
    }
    a[a.length - 1] += fin;
    return a.join(' ');
  };
  var PATRONES = {
    'dr-vetas': [16, 10, [22, 8, 7, 13, 30, 9, 11, 16, 17, 7]],   // nubes mas claras de la piedra
    'dr-pulido': [40, 6, 'continuo'],                            // brillo de pulido
    'dr-luz': [30, 6, 'continuo'],
    'dr-grano': [22, 10, [0.01, 6.4]]                            // fila central de granos
  };
  var clavePatron = function (c) {
    for (var k in PATRONES) if (c.classList.contains(k)) return k;
  };

  function posar() {
    recorte.setAttribute('y', -3000);
    cabeza.setAttribute('transform', CABEZA_FINAL);
    dragon.classList.remove('volando');
    dragon.classList.add('posado');
    cola.forEach(function (c) { c.style.strokeDashoffset = 0; });
  }

  function volar() {
    var total, largo, largoCola;
    try {
      total = ruta.getTotalLength(); largo = tramosFinal[0].getTotalLength(); largoCola = cola[0].getTotalLength();
    } catch (e) { total = 0; }
    if (!total) { posar(); return; }
    var lejos = total + largo + 200;
    var ventana = function (c) { var t = tramoDe(c); return ((t.hasta === null ? largo : t.hasta) - t.desde) + ' ' + lejos; };
    tramosVuelo.forEach(function (c) { c.style.strokeDasharray = ventana(c); });
    tramosFinal.forEach(function (c) { c.style.strokeDasharray = ventana(c); c.style.strokeDashoffset = -tramoDe(c).desde; });
    patronesVuelo.concat(patronesFinal).forEach(function (c) {
      var p = PATRONES[clavePatron(c)];
      c.desde = p[0];
      c.style.strokeDasharray = patron(p[0], largo - p[1], p[2], lejos);
    });
    patronesFinal.forEach(function (c) { c.style.strokeDashoffset = -c.desde; });
    cola.forEach(function (c) { c.style.strokeDasharray = largoCola + ' ' + (largoCola + 10); c.style.strokeDashoffset = largoCola; });
    var colocar = function (s) {       // s = distancia recorrida por la cabeza
      var base = s - largo;            // donde esta la punta de la cola
      tramosVuelo.forEach(function (c) { c.style.strokeDashoffset = -(base + tramoDe(c).desde); });
      patronesVuelo.forEach(function (c) { c.style.strokeDashoffset = -(base + c.desde); });
    };
    if (reducir) { posar(); return; }
    var giro = null;
    // la cabeza en el punto s de la ruta, siempre "hacia arriba": se voltea (girando
    // sobre si misma) cuando va hacia la izquierda; dt = segundos desde el fotograma anterior
    var ponerCabeza = function (s, dt) {
      var p = ruta.getPointAtLength(s);
      var a = ruta.getPointAtLength(Math.max(0, s - 2)), b = ruta.getPointAtLength(Math.min(total, s + 2));
      var ang = Math.atan2(b.y - a.y, b.x - a.x);
      var objetivo = Math.cos(ang) < 0 ? -1 : 1;
      if (giro === null) giro = objetivo;
      else giro += Math.max(-dt * 14, Math.min(dt * 14, objetivo - giro));
      var sy = Math.abs(giro) < 0.06 ? (giro < 0 ? -0.06 : 0.06) : giro;
      cabeza.setAttribute('transform', 'translate(' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ') rotate(' + (ang * 180 / Math.PI).toFixed(1) + ') scale(1 ' + sy.toFixed(2) + ')');
    };
    // el menu es semitransparente: lo que pasara por debajo se veria como un destello borroso
    var menu = document.querySelector('nav'), caja = dragon.getBoundingClientRect();
    if (menu && caja.height) recorte.setAttribute('y', ((menu.getBoundingClientRect().bottom - caja.top) * 260 / caja.height).toFixed(1));
    // todo en el punto de salida (fuera de la pantalla) ANTES de hacerlo visible:
    // si no, la cabeza se veria un instante en su sitio final
    colocar(0);
    ponerCabeza(0, 0);
    dragon.classList.add('volando');
    var DURA = 3400, t0 = null, antes = 0;
    function paso(ts) {
      if (t0 === null) { t0 = ts; antes = ts; }
      var u = Math.min(1, (ts - t0) / DURA);
      var s = total * (1 - Math.pow(1 - u, 2.3));          // frena al posarse
      colocar(s);
      ponerCabeza(s, (ts - antes) / 1000);
      antes = ts;
      if (u < 1) requestAnimationFrame(paso); else posar();
    }
    requestAnimationFrame(paso);
  }

  function intentar() {
    if (!volado && terminalLista && visible) { volado = true; volar(); }
  }
  terminal.addEventListener('animationend', function (e) {
    if (e.target === terminal) { terminalLista = true; intentar(); }
  });
  setTimeout(function () { terminalLista = true; intentar(); }, 2600);   // por si no hay evento

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entradas) {
      visible = entradas[0].isIntersecting;
      dragon.classList.toggle('quieto', !visible);
      intentar();
    }, { threshold: 0.3 }).observe(dragon);
  } else { visible = true; }
})();
