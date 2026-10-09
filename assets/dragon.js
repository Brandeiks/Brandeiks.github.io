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
    + '.dr-brillo{fill:none;stroke:#e6fff4;stroke-width:3;stroke-linecap:round;opacity:0;stroke-dasharray:34 478.8;stroke-dashoffset:40;}'
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
    + '@keyframes dr-brillo{from{stroke-dashoffset:40;}to{stroke-dashoffset:-438.8;}}'
    + '@keyframes dr-bigote{from{transform:rotate(-6deg);}to{transform:rotate(7deg);}}'
    + '@keyframes dr-parpadeo{0%,92%,100%{transform:scaleY(1);}95%{transform:scaleY(.08);}}'
    + '@keyframes dr-flota{from{transform:translateY(-3px);}to{transform:translateY(3px);}}'
    + '@keyframes dr-gira{to{transform:rotate(360deg);}}'
    + '.dragon.quieto *{animation-play-state:paused!important;}'
    + '@media(prefers-reduced-motion:reduce){.dragon *{animation:none!important;transition:none!important;}}';

  var CABEZA_FINAL = 'translate(296 140) rotate(-176.2) scale(1 -1)';
  var RUTA = 'M760,24 C716.7,14.7 673.5,4 630,-4 C586.8,-12 543.4,-19.3 500,-24 C456.8,-28.6 412,-31.4 370,-32 C330.5,-32.5 291.4,-31.7 255,-28 C221.7,-24.6 186.6,-22.3 160,-12 C137.9,-3.4 115,9.8 104,24 C95.7,34.7 90,47.7 92,60 C94.5,75.5 111.6,99.2 128,108 C145.4,117.3 176.4,119 195,112 C212.6,105.4 234,86 238,70 C241.7,55.1 233.6,28.8 222,20 C209.9,10.8 181.9,11.7 165,18 C147,24.7 129.2,44.7 118,62 C107.1,78.9 102.3,101 98,120 C94,137.6 91.1,155.9 92,172 C92.8,186.3 95.3,200.4 101,212 C106.3,222.9 114.9,233.8 124,240 C132.2,245.6 142.5,248.8 152,249 C161.8,249.2 172,243.2 182,241 C191.7,238.9 201.3,235.6 211,236 C221,236.4 230.9,241.8 241,244 C250.9,246.2 260.9,248.7 271,249 C281.2,249.4 291.7,248.2 302,246 C312.7,243.7 325.1,241 334,235 C342.7,229.2 351.2,220.2 355,211 C358.7,202.1 359,190.4 357,181 C355,171.7 349.4,161.6 343,155 C336.9,148.8 328,144.5 320,142 C312.3,139.6 304,140.7 296,140';
  var POSE = 'M92,172 C92.8,186.3 95.3,200.4 101,212 C106.3,222.9 114.9,233.8 124,240 C132.2,245.6 142.5,248.8 152,249 C161.8,249.2 172,243.2 182,241 C191.7,238.9 201.3,235.6 211,236 C221,236.4 230.9,241.8 241,244 C250.9,246.2 260.9,248.7 271,249 C281.2,249.4 291.7,248.2 302,246 C312.7,243.7 325.1,241 334,235 C342.7,229.2 351.2,220.2 355,211 C358.7,202.1 359,190.4 357,181 C355,171.7 349.4,161.6 343,155 C336.9,148.8 328,144.5 320,142 C312.3,139.6 304,140.7 296,140';

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
  var volutas = 'translate(142.3 240.1) rotate(14.4) scale(1 1)|translate(191.1 231.1) rotate(-13.5) scale(1 1)|translate(248.9 238.1) rotate(12.4) scale(1 1)|translate(301.2 238.5) rotate(-12.2) scale(1 1)'.split('|').map(function (tr) {
    return '<g transform="' + tr + '"><path class="dr-voluta-borde" d="M4,0 C4,-9 -2,-15 -9,-15 C-14,-15 -16,-10 -13,-7 C-11,-5 -8,-7 -9,-9"/><path class="dr-voluta-jade" d="M4,0 C4,-9 -2,-15 -9,-15 C-14,-15 -16,-10 -13,-7 C-11,-5 -8,-7 -9,-9"/></g>';
  }).join('');
  var colaCapa = function (nombre, ancho) {
    return '<g transform="translate(92 172) rotate(86.6)"><path class="dr-capa ' + nombre + ' dr-final dr-cola-trazo" style="stroke-width:' + ancho + '" d="M0,0 C-9,-1 -16,-7 -16,-15 C-16,-23 -8,-26 -3.5,-21.5 C-0.5,-18.5 -2.5,-14 -6,-14.5"/></g>';
  };
  var granos = function (clase) {
    return '<path class="dr-grano dr-grano-fila ' + clase + '" d="M94.8,193.8 L95.5,196.7 L96.3,199.6 L97.2,202.5 L98.2,205.3 L99.3,208.1 L100.5,210.9 L101.8,213.5 L103.2,216.2 L104.7,218.8 L106.3,221.3 L108,223.8 L109.8,226.2 L111.7,228.5 L113.7,230.8 L115.7,233 L117.9,235.1 L120.1,237.1 L122.5,238.9 L124.9,240.6 L127.5,242.2 L130.2,243.6 L132.9,244.8 L135.7,245.9 L138.5,246.8 L141.4,247.6 L144.4,248.2 L147.3,248.7 L150.3,248.9 L153.3,249 L156.3,248.7 L159.3,248.2 L162.2,247.4 L165,246.6 L167.9,245.6 L170.7,244.6 L173.5,243.5 L176.4,242.6 L179.2,241.7 L182.1,241 L185.1,240.3 L188,239.6 L190.9,238.9 L193.8,238.2 L196.7,237.5 L199.7,236.9 L202.6,236.4 L205.6,236.1 L208.6,236 L211.6,236 L214.6,236.4 L217.5,236.9 L220.4,237.6 L223.3,238.5 L226.2,239.4 L229,240.4 L231.9,241.4 L234.7,242.3 L237.6,243.1 L240.5,243.9 L243.4,244.5 L246.3,245.2 L249.3,245.8 L252.2,246.4 L255.2,247 L258.1,247.6 L261.1,248 L264,248.4 L267,248.8 L270,249 L273,249.1 L276,249.1 L279,249 L282,248.8 L285,248.6 L288,248.3 L291,247.9 L293.9,247.5 L296.9,247 L299.8,246.5 L302.8,245.8 L305.7,245.2 L308.6,244.5 L311.5,243.8 L314.5,243.1 L317.3,242.3 L320.2,241.4 L323,240.4 L325.8,239.3 L328.6,238.1 L331.2,236.7 L333.8,235.1 L336.2,233.4 L338.6,231.6 L340.9,229.6 L343.1,227.6 L345.2,225.5 L347.2,223.2 L349.1,220.9 L350.9,218.5 L352.5,216 L353.9,213.3 L355.2,210.6 L356.2,207.8 L356.9,204.9 L357.5,201.9 L357.9,198.9 L358.2,196 L358.2,193 L358.2,190 L357.9,187 L357.6,184 L357,181 L356.3,178.1 L355.4,175.3 L354.3,172.5 L353.1,169.7 L351.7,167.1 L350.2,164.5 L348.6,161.9 L346.9,159.5 L345,157.2 L342.9,154.9 L340.8,152.9 L338.4,151 L336,149.3 L333.4,147.7 L330.8,146.3 L328,145 L325.3,143.9 L322.5,142.8 L319.6,141.9 L316.7,141.2 L313.7,140.7 L310.7,140.5 L307.7,140.4"/>'
      + '<path class="dr-grano dr-grano-fila alt ' + clase + '" d="M123.8,234.1 L125.9,235.7 L128.2,237.2 L130.6,238.6 L133,239.8 L135.5,240.9 L138.1,241.9 L140.7,242.7 L143.4,243.3 L146.1,243.8 L148.8,244.2 L151.5,244.4 L154,244.4 L156.5,244 L159.1,243.5 L161.8,242.8 L164.5,241.9 L167.3,240.9 L170.1,239.9 L173,238.9 L175.9,237.9 L179,237 L182.1,236.3 L184.9,235.6 L187.8,234.9 L190.8,234.1 L193.7,233.4 L196.8,232.8 L199.9,232.2 L203.1,231.7 L206.3,231.5 L209.7,231.4 L213,231.5 L216.4,232 L219.6,232.7 L222.7,233.5 L225.7,234.4 L228.6,235.4 L231.4,236.4 L234.2,237.3 L237,238.2 L239.7,239 L242.5,239.6 L245.4,240.3 L248.3,240.9 L251.2,241.5 L254.1,242.1 L257,242.7 L259.8,243.2 L262.7,243.6 L265.5,244 L268.4,244.2 L271.2,244.4 L274,244.5 L276.9,244.4 L279.8,244.3 L282.7,244.2 L285.6,243.9 L288.4,243.6 L291.3,243.3 L294.2,242.8 L297,242.3 L299.9,241.7 L302.8,241.1 L305.7,240.5 L308.5,239.8 L311.4,239.1 L314.2,238.4 L317,237.6 L319.7,236.7 L322.3,235.8 L324.9,234.7 L327.4,233.5 L329.8,232.2 L332,230.8 L334.3,229.2 L336.4,227.4 L338.5,225.6 L340.6,223.6 L342.5,221.6 L344.3,219.5 L346,217.4 L347.6,215.1 L349,212.8 L350.2,210.5 L351.2,208.1 L352,205.6 L352.6,202.9 L353.1,200.3 L353.4,197.5 L353.6,194.8 L353.6,192 L353.5,189.3 L353.3,186.5 L352.9,183.8 L352.3,181.1 L351.6,178.5 L350.7,176 L349.7,173.4 L348.5,170.9 L347.2,168.4 L345.8,166.1 L344.3,163.8 L342.6,161.6 L340.9,159.5 L339,157.6 L337.1,155.8 L334.9,154.2 L332.7,152.7 L330.3,151.3 L327.8,150 L325.3,148.8 L322.7,147.8 L320.1,146.9 L317.5,146.1 L315,145.5 L312.3,145.2"/>'
      + '<path class="dr-grano dr-grano-fila alt ' + clase + '" d="M118,241.3 L120.6,243.3 L123.4,245.1 L126.2,246.7 L129.1,248.2 L132.1,249.5 L135.2,250.6 L138.3,251.5 L141.4,252.3 L144.6,252.9 L147.9,253.3 L151.2,253.6 L154.6,253.5 L158.1,253.1 L161.3,252.4 L164.5,251.6 L167.5,250.6 L170.4,249.6 L173.2,248.5 L176,247.6 L178.7,246.7 L181.3,245.9 L184.1,245.2 L187.1,244.5 L190.1,243.8 L192.9,243.1 L195.8,242.4 L198.6,241.8 L201.4,241.3 L204.2,240.9 L206.9,240.6 L209.6,240.6 L212.2,240.7 L214.8,241.1 L217.4,241.6 L220.1,242.3 L222.9,243.2 L225.6,244.1 L228.5,245.1 L231.4,246 L234.3,247 L237.4,247.9 L240.5,248.6 L243.4,249.2 L246.3,249.9 L249.3,250.5 L252.3,251.1 L255.3,251.7 L258.3,252.3 L261.4,252.7 L264.5,253.1 L267.7,253.4 L270.9,253.6 L274,253.7 L277.1,253.6 L280.2,253.5 L283.3,253.4 L286.4,253.1 L289.5,252.8 L292.6,252.4 L295.7,251.9 L298.7,251.4 L301.8,250.8 L304.7,250.1 L307.7,249.5 L310.7,248.8 L313.6,248 L316.6,247.3 L319.6,246.4 L322.6,245.4 L325.6,244.3 L328.6,243.1 L331.5,241.7 L334.4,240.2 L337.2,238.4 L339.8,236.5 L342.3,234.5 L344.8,232.4 L347.1,230.2 L349.3,227.8 L351.4,225.4 L353.4,222.8 L355.3,220.2 L357,217.3 L358.5,214.4 L359.8,211.2 L360.9,208 L361.7,204.8 L362.2,201.6 L362.6,198.4 L362.8,195.1 L362.8,191.9 L362.7,188.7 L362.4,185.4 L361.9,182.2 L361.3,179 L360.4,175.8 L359.3,172.7 L358.1,169.7 L356.7,166.8 L355.2,163.9 L353.6,161.2 L351.8,158.5 L349.9,155.9 L347.7,153.3 L345.4,150.9 L342.9,148.7 L340.3,146.7 L337.5,144.9 L334.7,143.2 L331.9,141.7 L329,140.4 L326,139.2 L323,138.1 L319.8,137.2 L316.5,136.5 L313.2,136.1"/>';
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
    + '<g class="dr-tarde dr-t2"><path class="dr-pata" d="M160.9,246.6 C158.9,251.6 160.9,256 163.4,258.5 L172.4,258.5 C174.4,255.5 175.4,250.6 174.4,246.6 Z M269,250.1 C267,255.1 269,256 271.5,258.5 L280.5,258.5 C282.5,255.5 283.5,254.1 282.5,250.1 Z"/><path class="dr-garra" d="M163.9,258.6 q-2.4,3.6 -0.6,7.4 M168.1,259 q0.2,4 2,7.6 M172.3,258.4 q2.6,3 3.6,6.6 M272,258.6 q-2.4,3.6 -0.6,7.4 M276.2,259 q0.2,4 2,7.6 M280.4,258.4 q2.6,3 3.6,6.6"/></g>'
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
    + '<g class="dr-tarde dr-t3" transform="translate(186.4 126.5)"><g class="dr-perla">'
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
