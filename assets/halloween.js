/* ============================================================
   Adornos de Halloween para TODO el sitio. Solo se cargan en octubre:
   lo decide assets/cursor.js (que esta en todas las paginas) con la fecha
   del visitante; el resto del ano este archivo ni se descarga.
   - Telaranas en las esquinas de arriba (cuelgan del menu).
   - Una arana colgada de su hilo; si le pasas el raton, trepa y se esconde.
   - Fantasmas y murcielagos que cruzan la pantalla de vez en cuando.
   - Una calabaza abajo a la izquierda que hace de boton: apaga o enciende
     los adornos (se recuerda en este navegador hasta el ano siguiente).
   - En la portada, un sombrero de bruja para el dragon de la terminal.
   Todo es SVG en linea, sin clics bloqueados (pointer-events: none salvo
   la calabaza y la arana) y con animaciones de transform/opacity.
   Con "reducir movimiento" no hay vuelos: solo los adornos quietos.
   ============================================================ */
(function () {
  var NARANJA = '#ff8c1a', VERDE = '#00ff88';

  var css = ''
    + '.hw{position:fixed;inset:0;z-index:450;pointer-events:none;overflow:hidden;}'
    + 'html.hw-oculto .hw,html.hw-oculto .hw-sombrero{display:none;}'
    // telaranas
    + '.hw-tela{position:absolute;top:0;width:130px;height:130px;opacity:.38;}'
    + '.hw-tela.izq{left:0;}.hw-tela.der{right:0;transform:scaleX(-1);}'
    + '.hw-tela svg{display:block;width:100%;height:100%;}.hw-tela path{fill:none;stroke:#cfffe8;stroke-width:.7;}'
    // arana
    + '.hw-arana{position:absolute;top:-70px;right:17%;width:40px;}'
    + '.hw-arana-mov{animation:hw-cuelga 5s ease-in-out infinite alternate;}'
    + '.hw-arana-sube{transition:transform .6s cubic-bezier(.3,1.4,.5,1);}'
    + '.hw-arana-sube:hover{transform:translateY(-120px);}'
    + '.hw-hilo{width:1px;height:150px;margin:0 auto;background:linear-gradient(rgba(207,255,232,0),rgba(207,255,232,.55));}'
    + '.hw-arana svg{display:block;width:40px;height:40px;margin-top:-2px;pointer-events:auto;}'
    + '.hw-arana-cuerpo{animation:hw-patas 1.6s ease-in-out infinite alternate;transform-origin:20px 6px;}'
    // fantasmas y murcielagos: la capa exterior cruza, la interior ondula
    + '.hw-vuela{position:absolute;left:0;will-change:transform;}'
    + '.hw-ondula{animation:hw-ondula 2.6s ease-in-out infinite alternate;}'
    + '.hw-fantasma svg{display:block;width:46px;height:56px;opacity:.5;filter:drop-shadow(0 0 7px rgba(0,255,136,.45));}'
    + '.hw-f1{top:24%;animation:hw-cruza-der 46s linear 4s infinite backwards;}'
    + '.hw-f2{top:62%;animation:hw-cruza-izq 63s linear 21s infinite backwards;}'
    + '.hw-f2 svg{width:36px;height:44px;}'
    + '.hw-murcielago svg{display:block;width:38px;height:19px;opacity:.85;}'
    + '.hw-m1{top:13%;animation:hw-cruza-izq 19s linear 9s infinite backwards;}'
    + '.hw-m2{top:17%;animation:hw-cruza-izq 21s linear 10.4s infinite backwards;}'
    + '.hw-m3{top:9%;animation:hw-cruza-der 27s linear 30s infinite backwards;}'
    + '.hw-ala{animation:hw-aleteo .22s ease-in-out infinite alternate;transform-origin:20px 9px;}'
    // calabaza (boton)
    + '.hw-calabaza{position:fixed;left:16px;bottom:14px;z-index:460;width:56px;height:50px;padding:0;border:0;'
    + 'background:none;cursor:pointer;filter:drop-shadow(0 0 10px rgba(255,140,26,.45));transition:transform .2s,opacity .3s,filter .3s;}'
    + '.hw-calabaza:hover{transform:translateY(-3px) rotate(-4deg);}'
    + '.hw-calabaza:focus-visible{outline:2px solid ' + VERDE + ';outline-offset:3px;border-radius:8px;}'
    + '.hw-calabaza svg{display:block;width:100%;height:100%;}'
    + '.hw-cara{animation:hw-vela 2.3s steps(1) infinite;}'
    + 'html.hw-oculto .hw-calabaza{opacity:.45;filter:grayscale(.7);}'
    + 'html.hw-oculto .hw-cara{animation:none;opacity:.25;}'
    // sombrero del dragon
    + '.hw-sombrero .cono{fill:#1d1028;stroke:' + VERDE + ';stroke-width:1.1;stroke-linejoin:round;}'
    + '.hw-sombrero .ala{fill:#1d1028;stroke:' + VERDE + ';stroke-width:1.1;}'
    + '.hw-sombrero .cinta{fill:' + NARANJA + ';}.hw-sombrero .hebilla{fill:none;stroke:#ffd25a;stroke-width:.9;}'
    + '@keyframes hw-cuelga{from{transform:translateY(0);}to{transform:translateY(34px);}}'
    + '@keyframes hw-patas{from{transform:rotate(-4deg);}to{transform:rotate(4deg);}}'
    + '@keyframes hw-ondula{from{transform:translateY(-14px);}to{transform:translateY(14px);}}'
    + '@keyframes hw-cruza-der{from{transform:translateX(-90px);}to{transform:translateX(calc(100vw + 90px));}}'
    + '@keyframes hw-cruza-izq{from{transform:translateX(calc(100vw + 90px)) scaleX(-1);}to{transform:translateX(-90px) scaleX(-1);}}'
    + '@keyframes hw-aleteo{from{transform:scaleY(1);}to{transform:scaleY(.35);}}'
    + '@keyframes hw-vela{0%,100%{opacity:1;}23%{opacity:.78;}31%{opacity:1;}58%{opacity:.86;}64%{opacity:.7;}70%{opacity:1;}}'
    + '@media(max-width:700px){.hw-tela{width:78px;height:78px;}.hw-arana{right:76px;}.hw-m3,.hw-f2{display:none;}'
    + '.hw-calabaza{width:44px;height:40px;left:10px;bottom:10px;}}'
    + '@media(prefers-reduced-motion:reduce){.hw *{animation:none!important;transition:none!important;}'
    + '.hw-fantasma,.hw-murcielago{display:none;}.hw-cara{animation:none!important;}}'
    + '@media print{.hw,.hw-calabaza{display:none!important;}}';

  // telarana de esquina (ancla en 0,0): radios y anillos que se comban hacia la esquina
  function telarana() {
    var radios = [0, 18, 36, 54, 72, 90], anillos = [20, 38, 57, 76, 96], d = '';
    var pt = function (r, a) { a = a * Math.PI / 180; return [r * Math.cos(a), r * Math.sin(a)]; };
    radios.forEach(function (a) { var p = pt(108, a); d += 'M0,0 L' + p[0].toFixed(1) + ',' + p[1].toFixed(1) + ' '; });
    anillos.forEach(function (r) {
      for (var i = 0; i < radios.length - 1; i++) {
        var a = pt(r, radios[i]), b = pt(r, radios[i + 1]), c = pt(r * 0.8, (radios[i] + radios[i + 1]) / 2);
        d += 'M' + a[0].toFixed(1) + ',' + a[1].toFixed(1) + ' Q' + c[0].toFixed(1) + ',' + c[1].toFixed(1) + ' ' + b[0].toFixed(1) + ',' + b[1].toFixed(1) + ' ';
      }
    });
    return '<svg viewBox="0 0 110 110"><path d="' + d + '"/></svg>';
  }

  var ARANA = '<svg viewBox="0 0 40 40"><g class="hw-arana-cuerpo" fill="none" stroke="#0b1a14" stroke-width="1.6" stroke-linecap="round">'
    + '<path d="M15,18 L7,12 L3,16 M15,21 L5,20 L2,25 M16,24 L7,28 L5,34 M17,26 L11,32 L11,38"/>'
    + '<path d="M25,18 L33,12 L37,16 M25,21 L35,20 L38,25 M24,24 L33,28 L35,34 M23,26 L29,32 L29,38"/>'
    + '<ellipse cx="20" cy="24" rx="6.5" ry="7.5" fill="#0b1a14" stroke="' + VERDE + '" stroke-width=".8"/>'
    + '<circle cx="20" cy="14.5" r="4.6" fill="#0b1a14" stroke="' + VERDE + '" stroke-width=".8"/>'
    + '<circle cx="18.3" cy="14" r="1.1" fill="' + VERDE + '" stroke="none"/><circle cx="21.7" cy="14" r="1.1" fill="' + VERDE + '" stroke="none"/>'
    + '<path d="M20,20 L20,28 M17.5,23 L22.5,23" stroke="' + NARANJA + '" stroke-width="1"/></g></svg>';

  var FANTASMA = '<svg viewBox="0 0 40 50"><path d="M20,3 C9.5,3 4,12 4,23 L4,46 L9.5,41 L14.5,46 L20,41 L25.5,46 L30.5,41 L36,46 L36,23 C36,12 30.5,3 20,3 Z" fill="#e8fff4"/>'
    + '<ellipse cx="14.5" cy="21" rx="3" ry="4" fill="#06120d"/><ellipse cx="25.5" cy="21" rx="3" ry="4" fill="#06120d"/>'
    + '<ellipse cx="20" cy="31" rx="3" ry="3.6" fill="#06120d"/></svg>';

  var MURCIELAGO = '<svg viewBox="0 0 40 20"><g class="hw-ala"><path d="M20,9 C16,3 9,2 2,5 C6,7 7,10 6,13 C9,11 12,12 14,14 C16,12 18,12 20,14 C22,12 24,12 26,14 C28,12 31,11 34,13 C33,10 34,7 38,5 C31,2 24,3 20,9 Z" fill="#071410" stroke="'
    + VERDE + '" stroke-width=".7" stroke-linejoin="round"/></g><circle cx="18.6" cy="9.6" r=".8" fill="' + NARANJA + '"/><circle cx="21.4" cy="9.6" r=".8" fill="' + NARANJA + '"/></svg>';

  var CALABAZA = '<svg viewBox="0 0 64 56" aria-hidden="true">'
    + '<path d="M31,10 C30,5 32,2 36,1" fill="none" stroke="#0b5236" stroke-width="4" stroke-linecap="round"/>'
    + '<path d="M31,10 C30,5 32,2 36,1" fill="none" stroke="' + VERDE + '" stroke-width="1" stroke-linecap="round"/>'
    + '<ellipse cx="18" cy="32" rx="15" ry="20" fill="#e06a00"/><ellipse cx="46" cy="32" rx="15" ry="20" fill="#e06a00"/>'
    + '<ellipse cx="32" cy="32" rx="16" ry="22" fill="' + NARANJA + '"/>'
    + '<path d="M24,13 C21,24 21,40 24,52 M40,13 C43,24 43,40 40,52" fill="none" stroke="#c75c00" stroke-width="1.2"/>'
    + '<g class="hw-cara" fill="#ffd25a"><path d="M15,26 L21,19 L24,28 Z M49,26 L43,19 L40,28 Z M30,30 L32,26 L34,30 Z"/>'
    + '<path d="M13,36 C20,46 44,46 51,36 L46,38 L43,35 L40,39 L36,36 L32,40 L28,36 L24,39 L21,35 L18,38 Z"/></g></svg>';

  var SOMBRERO = '<g class="hw-sombrero" transform="rotate(-10 33 -22)">'
    + '<path class="cono" d="M24,-23 L42,-23 C38,-30 34,-40 31,-50 C29,-55 22,-56 17,-51 C23,-51 27,-47 27,-40 C27,-33 25,-28 24,-23 Z"/>'
    + '<path class="cinta" d="M25.3,-27 L40.4,-27 L41.6,-23.6 L24.4,-23.6 Z"/><rect class="hebilla" x="31" y="-26.6" width="3.6" height="2.8"/>'
    + '<ellipse class="ala" cx="33" cy="-22.4" rx="16" ry="3.4"/></g>';

  // "ocultar" vale para el octubre de este ano: el siguiente vuelven a salir
  var ANIO = String(new Date().getFullYear());
  function guardado(v) {
    try { if (v === undefined) return localStorage.getItem('hw-oculto') === ANIO; localStorage.setItem('hw-oculto', v ? ANIO : ''); }
    catch (e) { return false; }
  }

  // el dragon de la portada se crea con su propio script: se espera a que exista
  function sombreroParaElDragon(intentos) {
    var cabeza = document.querySelector('.dragon .dr-cabeza > g');
    if (cabeza) {
      if (!cabeza.querySelector('.hw-sombrero')) cabeza.insertAdjacentHTML('beforeend', SOMBRERO);
    } else if (intentos > 0 && document.querySelector('#hero .terminal')) {
      setTimeout(function () { sombreroParaElDragon(intentos - 1); }, 250);
    }
  }

  function iniciar() {
    if (document.querySelector('.hw')) return;
    var estilo = document.createElement('style');
    estilo.setAttribute('data-halloween', '');
    estilo.textContent = css;
    document.head.appendChild(estilo);

    var capa = document.createElement('div');
    capa.className = 'hw';
    capa.setAttribute('aria-hidden', 'true');
    capa.innerHTML = ''
      + '<div class="hw-tela izq">' + telarana() + '</div><div class="hw-tela der">' + telarana() + '</div>'
      + '<div class="hw-arana"><div class="hw-arana-mov"><div class="hw-arana-sube"><div class="hw-hilo"></div>' + ARANA + '</div></div></div>'
      + '<div class="hw-vuela hw-fantasma hw-f1"><div class="hw-ondula">' + FANTASMA + '</div></div>'
      + '<div class="hw-vuela hw-fantasma hw-f2"><div class="hw-ondula" style="animation-duration:3.4s">' + FANTASMA + '</div></div>'
      + '<div class="hw-vuela hw-murcielago hw-m1"><div class="hw-ondula" style="animation-duration:.9s">' + MURCIELAGO + '</div></div>'
      + '<div class="hw-vuela hw-murcielago hw-m2"><div class="hw-ondula" style="animation-duration:1.1s">' + MURCIELAGO + '</div></div>'
      + '<div class="hw-vuela hw-murcielago hw-m3"><div class="hw-ondula" style="animation-duration:1s">' + MURCIELAGO + '</div></div>';
    document.body.appendChild(capa);

    var boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'hw-calabaza';
    boton.innerHTML = CALABAZA;
    var pintar = function () {
      var oculto = document.documentElement.classList.contains('hw-oculto');
      var texto = oculto ? 'Mostrar los adornos de Halloween' : 'Ocultar los adornos de Halloween';
      boton.setAttribute('aria-label', texto);
      boton.title = texto;
      boton.setAttribute('aria-pressed', String(!oculto));
    };
    boton.addEventListener('click', function () {
      var oculto = document.documentElement.classList.toggle('hw-oculto');
      guardado(oculto);
      pintar();
    });
    if (guardado()) document.documentElement.classList.add('hw-oculto');
    pintar();
    document.body.appendChild(boton);

    sombreroParaElDragon(20);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
