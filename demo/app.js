(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* plano: se dibuja al cargar */
  requestAnimationFrame(function () { requestAnimationFrame(function () { document.documentElement.classList.add('drawn'); }); });

  /* plano CAD: cursor en cruz con coordenadas (mm desde el extremo de la pieza, escala 2:1) */
  var cad = $('.cad'), svg = $('#cad');
  if (cad && svg) {
    var narrow = window.matchMedia('(max-width: 560px)');
    var frame = function () { svg.setAttribute('viewBox', narrow.matches ? '30 40 482 306' : '0 0 760 480'); };
    frame();
    if (narrow.addEventListener) narrow.addEventListener('change', frame);

    if (window.matchMedia('(pointer: fine)').matches) {
      cad.classList.add('live');
      var xhH = $('#xh-h'), xhV = $('#xh-v'), xhB = $('#xh-b'), xy = $('#xy'), cmd = $('#cmd');
      var hits = [
        { x: [40, 440], y: [120, 300], c: 'CASQUILLO · CuZn39Pb3' },
        { x: [520, 690], y: [126, 296], c: 'VISTA LATERAL' },
        { x: [456, 736], y: [372, 456], c: 'CAJETÍN · SI-0417 rev. A' },
        { x: [30, 440], y: [372, 440], c: 'NOTAS · ISO 2768-mK' }
      ];
      var mm = function (n) { return (n < 0 ? '-' : '') + Math.abs(n).toFixed(2).replace('.', ','); };
      svg.addEventListener('pointermove', function (e) {
        var m = svg.getScreenCTM(); if (!m) return;
        var p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
        p = p.matrixTransform(m.inverse());
        xhH.setAttribute('y1', p.y); xhH.setAttribute('y2', p.y);
        xhV.setAttribute('x1', p.x); xhV.setAttribute('x2', p.x);
        xhB.setAttribute('x', p.x - 5); xhB.setAttribute('y', p.y - 5);
        xy.textContent = 'X ' + mm((p.x - 50) / 4) + ' · Y ' + mm((210 - p.y) / 4);
        var c = '_ACOTAR';
        for (var i = 0; i < hits.length; i++) {
          var h = hits[i];
          if (p.x >= h.x[0] && p.x <= h.x[1] && p.y >= h.y[0] && p.y <= h.y[1]) { c = h.c; break; }
        }
        if (cmd.textContent !== c) cmd.textContent = c;
        cad.classList.add('on');
      });
      svg.addEventListener('pointerleave', function () { cad.classList.remove('on'); cmd.textContent = '_ACOTAR'; });
    }
  }

  /* tira de piezas: se duplica para que el bucle no tenga corte */
  var strip = $('.strip-in');
  if (strip) strip.innerHTML += strip.innerHTML;

  /* aparición suave */
  try {
    var els = $$('.rv');
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (en) {
        en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); } });
      }, { threshold: 0.06, rootMargin: '0px 0px -5% 0px' });
      els.forEach(function (e) { io.observe(e); });
      setTimeout(function () { els.forEach(function (e) { e.classList.add('in'); }); }, 4000);
    } else { els.forEach(function (e) { e.classList.add('in'); }); }
  } catch (e) { $$('.rv').forEach(function (x) { x.classList.add('in'); }); }

  /* ---------- ¿Cabe en nuestros tornos? ---------- */
  var CAPS = [16, 26, 36, 42, 60, 80];        // tornos automáticos de levas (mm)
  var SCALE = 260 / 120;                      // Ø120 mm ocupa el dibujo entero
  var NS = 'http://www.w3.org/2000/svg';
  var rings = $('#rings'), mine = $('#mine'), bars = $('.bars');
  var range = $('#c-r'), num = $('#c-d'), mat = $('#c-m');
  var fmt = function (n) { return String(n).replace('.', ','); };

  CAPS.forEach(function (c, i) {
    var r = c / 2 * SCALE;
    var ci = document.createElementNS(NS, 'circle');
    ci.setAttribute('cx', 150); ci.setAttribute('cy', 150); ci.setAttribute('r', r);
    ci.setAttribute('class', 'ring'); ci.dataset.c = c;
    var a = -42 * Math.PI / 180;
    var t = document.createElementNS(NS, 'text');
    t.setAttribute('x', 150 + Math.cos(a) * r + 4);
    t.setAttribute('y', 150 + Math.sin(a) * r - 4);
    t.textContent = 'Ø' + c; t.dataset.c = c;
    if (i === CAPS.length - 1) t.setAttribute('class', 'max');
    rings.appendChild(ci); rings.appendChild(t);
  });

  function qty() { var q = $('input[name=q]:checked'); return q ? q.value : ''; }
  function qIdx() { return $$('input[name=q]').indexOf($('input[name=q]:checked')); }

  function verdict() {
    var d = parseFloat(String(num.value).replace(',', '.'));
    var k = $('#v-k'), m = $('#v-m'), t = $('#v-t');
    if (!(d > 0)) { k.textContent = 'Diámetro'; m.textContent = 'Indica un diámetro'; t.textContent = 'En milímetros, el de la barra de la que sale la pieza.'; return; }
    var cap = null;
    for (var i = 0; i < CAPS.length; i++) { if (CAPS[i] >= d) { cap = CAPS[i]; break; } }
    mine.setAttribute('r', Math.min(d / 2 * SCALE, 142));
    bars.classList.toggle('over', !cap);
    $$('[data-c]', rings).forEach(function (el) { el.classList.toggle('hit', +el.dataset.c === cap || (!cap && +el.dataset.c === 80)); });

    var q = qIdx();
    if (!cap) {
      k.textContent = 'Más de Ø80 mm';
      m.textContent = 'Lo estudiamos en CNC o fresa';
      t.textContent = 'No entra en los tornos de levas, que llegan a Ø80 mm. Según la pieza puede hacerse en CNC o en fresa: mándanos el plano y lo vemos.';
    } else if (q >= 2) {
      k.textContent = 'Encaja en';
      m.textContent = 'Torno de levas de Ø' + cap + ' mm';
      t.textContent = 'Serie larga de una pieza de Ø' + fmt(d) + ' mm: es terreno del decoletaje. La barra entra sola y el torno repite la pieza con la misma medida, que es lo que abarata cada unidad.';
    } else if (q === 1) {
      k.textContent = 'Encaja en';
      m.textContent = 'Levas de Ø' + cap + ' mm o CNC';
      t.textContent = 'Depende de la pieza. Si es sencilla, el torno de levas suele salir mejor de precio; si lleva fresados, taladros cruzados u operaciones por detrás, mejor en CNC de cabezal móvil.';
    } else {
      k.textContent = 'Mejor en';
      m.textContent = 'CNC';
      t.textContent = 'Para pocas piezas no suele compensar preparar un torno de levas. Se hace en CNC de cabezal móvil (hasta 10 ejes) o de bancada inclinada con motorizadas.';
    }
  }

  range.addEventListener('input', function () { num.value = range.value; verdict(); });
  num.addEventListener('input', function () {
    var d = parseFloat(String(num.value).replace(',', '.'));
    if (d > 0) range.value = Math.min(Math.max(d, 2), 120);
    verdict();
  });
  $$('input[name=q]').forEach(function (r) { r.addEventListener('change', verdict); });
  verdict();

  /* rellena el presupuesto con lo elegido */
  $('#v-go').addEventListener('click', function () {
    $('#q-mat').value = mat.value;
    $('#q-d').value = num.value ? fmt(num.value) : '';
    $('#q-q').value = qty();
    setTimeout(function () { $('#q-n').focus({ preventScroll: true }); }, 600);
  });

  /* ---------- materiales ---------- */
  $$('.filter button').forEach(function (b) {
    b.addEventListener('click', function () {
      var f = b.dataset.f;
      $$('.filter button').forEach(function (x) { var on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
      $$('.mats li').forEach(function (li) { li.classList.toggle('off', f !== 'all' && li.dataset.t.split(' ').indexOf(f) < 0); });
    });
  });

  /* ---------- formulario de presupuesto (demo, no envía) ---------- */
  var form = $('#qform'), file = $('#q-p'), drop = $('#drop'), dropS = $('#drop-s'), err = $('#q-err');
  var MAX = 10 * 1024 * 1024;
  var kb = function (n) { return n > 1048576 ? fmt((n / 1048576).toFixed(1)) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; };

  function showFile() {
    var f = file.files && file.files[0];
    if (!f) { drop.classList.remove('has'); dropS.textContent = 'PDF, DXF, DWG, STEP, JPG · máx. 10 MB'; return; }
    if (f.size > MAX) { file.value = ''; drop.classList.remove('has'); dropS.textContent = 'Ese archivo pasa de 10 MB. Prueba con un PDF.'; return; }
    drop.classList.add('has'); dropS.textContent = f.name + ' · ' + kb(f.size);
  }
  file.addEventListener('change', showFile);
  ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
  drop.addEventListener('drop', function (e) {
    if (e.dataTransfer && e.dataTransfer.files.length) {
      try { file.files = e.dataTransfer.files; } catch (x) {}
      showFile();
    }
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    $$('.bad', form).forEach(function (x) { x.classList.remove('bad'); });
    var bad = [];
    var n = $('#q-n'), m = $('#q-m'), c = $('#q-c'), ok = $('#q-ok');
    if (!n.value.trim()) bad.push([n, 'Falta tu nombre.']);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(m.value.trim())) bad.push([m, 'Revisa el correo: ahí te mandamos el presupuesto.']);
    if (!(file.files && file.files[0]) && !c.value.trim()) bad.push([c, 'Adjunta un plano o cuéntanos qué pieza necesitas.']);
    if (!ok.checked) bad.push([ok, 'Marca la casilla de datos para poder responderte.']);
    if (bad.length) {
      bad.forEach(function (b) { b[0].classList.add('bad'); });
      err.textContent = bad[0][1];
      bad[0][0].focus();
      return;
    }
    err.textContent = '';
    var f = file.files && file.files[0];
    var rows = [
      ['Empresa', $('#q-e').value.trim() || '—'],
      ['Material', $('#q-mat').value || 'Sin indicar'],
      ['Ø barra', $('#q-d').value ? $('#q-d').value + ' mm' : 'Sin indicar'],
      ['Cantidad', $('#q-q').value || 'Sin indicar'],
      ['Plano', f ? f.name : 'Sin plano']
    ];
    var dl = $('#s-sum'); dl.innerHTML = '';
    rows.forEach(function (r) {
      var dt = document.createElement('dt'), dd = document.createElement('dd');
      dt.textContent = r[0]; dd.textContent = r[1]; dl.appendChild(dt); dl.appendChild(dd);
    });
    $('#s-n').textContent = n.value.trim().split(' ')[0];
    form.hidden = true;
    var s = $('#sent'); s.hidden = false; s.focus();
  });

  $('#s-back').addEventListener('click', function () {
    form.reset(); showFile();
    $('#sent').hidden = true; form.hidden = false; $('#q-n').focus();
  });

  /* ---------- menú: marca la sección en la que estás ---------- */
  var menu = $('.menu'), links = $$('.menu a');
  if (menu && 'IntersectionObserver' in window) {
    var byId = {};
    links.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    var spy = new IntersectionObserver(function (en) {
      en.forEach(function (x) {
        if (!x.isIntersecting) return;
        var a = byId[x.target.id];
        links.forEach(function (l) { l.classList.toggle('on', l === a); });
        if (a && menu.scrollWidth > menu.clientWidth) {
          menu.scrollTo({ left: a.offsetLeft - menu.clientWidth / 2 + a.offsetWidth / 2, behavior: 'smooth' });
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    Object.keys(byId).forEach(function (id) { var s = document.getElementById(id); if (s) spy.observe(s); });
    var top = new IntersectionObserver(function (en) {
      if (en[0].isIntersecting) links.forEach(function (l) { l.classList.remove('on'); });
    }, { rootMargin: '0px 0px -60% 0px' });
    top.observe($('.hero'));
  }

  /* ---------- barra fija en el móvil ---------- */
  var mbar = $('#mbar'), quote = $('#presupuesto'), inQuote = false;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { inQuote = en[0].isIntersecting; tick(); }, { threshold: 0.15 }).observe(quote);
  }
  function tick() { mbar.classList.toggle('show', window.scrollY > 520 && !inQuote); }
  window.addEventListener('scroll', tick, { passive: true });

  $('#y').textContent = new Date().getFullYear();
})();
