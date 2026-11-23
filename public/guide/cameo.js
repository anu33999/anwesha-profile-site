/* Anwesha cameos.
   No character travels around the page. Instead, pieces of her appear at a few places, popping
   out from behind an element's edge or peeking in from the side of the screen.
   Each cameo is driven by the scroll position alone, so scrolling down plays it forward and
   scrolling up plays the exact reverse. A soft spring follows the scroll, so every pop-out and
   pop-in takes its time and stays smooth. In the landing section she is not there at first: she
   slowly rises from behind the code window, and sinks back behind it as you scroll down. */
(function () {
  'use strict';
  var B = 'guide/';
  var reduce = false;
  try { reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  function H() { var w = innerWidth; return w <= 700 ? 140 : w < 1200 ? 200 : 236; }

  var PIC = {
    lean: { key: 's1p9', w: 231, h: 560 },
    coffee: { key: 'a7', w: 178, h: 551 },
    wave: { key: 'a1', w: 206, h: 548 },
    bust: { key: 'terminal', w: 330, h: 330 },
    thumbs: { key: 'a4', w: 223, h: 560 },
    folder: { key: 's1p1', w: 194, h: 560 },
    laptop: { key: 'a2', w: 286, h: 409 },
    sit: { key: 'a6', w: 245, h: 516 },
    peekWave2: { key: 'a9', w: 256, h: 403 }
  };
  /* where and how she appears. kind:
     'rise'   - rises from behind an element's top edge (only her upper body shows)
     'side'   - slides out from behind an element's right edge
     'border' - peeks in from the left or right edge of the screen, level with an element */
  var CAMEOS = [
    { id: 'landing', sel: '#w-code', kind: 'rise', pic: 'thumbs', fx: [0.86, 0.78, 0.92, 0.7], show: 0.5, scale: 1.08, landing: true },
    // over the top of the terminal, fingers hooked on its edge
    { id: 'terminal', sel: '#terminal .win', kind: 'rise', pic: 'bust', fx: [0.86, 0.8, 0.72, 0.62], show: 0.78, scale: 1.1, hands: true },
    // sitting cross-legged with her laptop on top of the project grid
    { id: 'work', sel: '#pindex button', kind: 'rise', pic: 'laptop', fx: [0.5], show: 0.97, scale: 0.82, phoneScale: 1.18 },
    // a second memoji, in her own tile among the project cards
    { id: 'between', sel: '.pslot .pslot-sill', kind: 'rise', pic: 'bust', fx: [0.5], show: 0.9, scale: 1.55, stay: true },
    { id: 'experience', sel: '#experience .jobs > .job:nth-child(3)', kind: 'border', side: 'right', pic: 'peekWave2', at: 0.5, scale: 1.05 },
    // sitting on an edge, legs over the front (only where her legs cover no text)
    { id: 'sit', sel: '#experience .job, #skills .certs, #hire .order, .booth .ticket', kind: 'sit', pic: 'sit', fx: [0.93, 0.9, 0.86, 0.1], seat: 0.64, scale: 0.85 },
    { id: 'hire', sel: '#hire h2', kind: 'beside', along: 0.5, pic: 'folder', scale: 1.2 }
  ];

  var page = document.querySelector('.page') || document.body;
  var layer = document.createElement('div'); layer.className = 'cm-layer'; layer.setAttribute('aria-hidden', 'true');
  page.appendChild(layer);
  var toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'ag-hide'; document.body.appendChild(toggle);

  /* ---------- text on the page: a cameo never covers it ---------- */
  var blockers = [];
  function pr() { return page.getBoundingClientRect(); }
  function collect() {
    var p = pr(), out = [];
    var w = document.createTreeWalker(page, NodeFilter.SHOW_TEXT, { acceptNode: function (n) {
      if (!n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      var e = n.parentElement; return (!e || e.closest('.cm-layer, .floats, script, style')) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; } });
    var r = document.createRange(), n;
    while ((n = w.nextNode())) { r.selectNodeContents(n); var rs = r.getClientRects(); for (var i = 0; i < rs.length; i++) if (rs[i].width > 1) out.push([rs[i].left - p.left - 3, rs[i].top - p.top - 3, rs[i].right - p.left + 3, rs[i].bottom - p.top + 3]); }
    page.querySelectorAll('input, textarea, select, .badge img, canvas, .chip, .btn, .presets button, .pindex button, .pcard').forEach(function (e) {
      if (e.closest('.cm-layer')) return; var b = e.getBoundingClientRect(); if (b.width) out.push([b.left - p.left, b.top - p.top, b.right - p.left, b.bottom - p.top]); });
    blockers = out;
  }
  function hits(x0, y0, x1, y1) { for (var i = 0; i < blockers.length; i++) { var b = blockers[i]; if (b[0] < x1 && b[2] > x0 && b[1] < y1 && b[3] > y0) return true; } return false; }
  function rectOf(el) { var r = el.getBoundingClientRect(), p = pr(); return { l: r.left - p.left, t: r.top - p.top, r: r.right - p.left, b: r.bottom - p.top, w: r.width, h: r.height }; }

  /* ---------- building the cameos ---------- */
  var items = [], motion = null;
  function picSize(c) {                                                         // the picture's size in px
    var pic = PIC[c.pic], h = H() * c.scale * (innerWidth <= 700 && c.phoneScale ? c.phoneScale : 1);   // phoneScale: a bit bigger on phones
    return { w: pic.w / 560 * h, h: pic.h / 560 * h };
  }
  function capTop(el) {                                                         // px from an element's top to its capital letters' tops
    var cs = getComputedStyle(el), m = document.createElement('canvas').getContext('2d');
    m.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
    var cap = m.measureText('HN').actualBoundingBoxAscent;
    var mark = document.createElement('span');                                 // a zero-size box sitting on the first line's baseline
    mark.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
    el.insertBefore(mark, el.firstChild);
    var base = mark.getBoundingClientRect().top - el.getBoundingClientRect().top;
    mark.remove();
    return cap ? base - cap : 0;
  }
  function place(c) {                                                           // first text-free clip box over the matching elements
    var els = document.querySelectorAll(c.sel);
    for (var i = 0; i < els.length; i++) { var r = place1(c, els[i]); if (r) return r; }
    return null;
  }
  function place1(c, el) {
    var R = rectOf(el), sz = picSize(c), vw = innerWidth;
    if (R.w < 40) return null;
    if (c.kind === 'rise') {
      var showH = sz.h * c.show;
      for (var i = 0; i < c.fx.length; i++) {
        var x = R.l + R.w * c.fx[i], box = { l: x - sz.w / 2, t: R.t - showH, w: sz.w, h: showH };
        if (box.l < 8 || box.l + box.w > vw - 8) continue;
        if (!hits(box.l + sz.w * 0.12, box.t, box.l + box.w - sz.w * 0.12, box.t + box.h - 2)) return { box: box, axis: 'y', dist: showH, el: el, ref: R };
      }
      return null;
    }
    if (c.kind === 'beside') {
      // beside a multi-line heading: in the room right of its first line, feet on the tops of its last line's letters
      var rg = document.createRange(); rg.selectNodeContents(el);
      var p0 = pr(), ls = [].slice.call(rg.getClientRects()).filter(function (q) { return q.width > 2; })
        .map(function (q) { return { l: q.left - p0.left, t: q.top - p0.top, r: q.right - p0.left, b: q.bottom - p0.top }; });
      if (ls.length < 2) return null;
      var first = ls[0], last = ls[ls.length - 1];
      ls.forEach(function (q) { if (Math.abs(q.t - first.t) < 2) first.r = Math.max(first.r, q.r); if (Math.abs(q.t - last.t) < 2) last.r = Math.max(last.r, q.r); });
      var feet = last.t + capTop(el) - (first.t - R.t);                         // same letter offset on every line
      var cxp = first.r + (last.r - first.r) * c.along, bx2 = { l: cxp - sz.w / 2, t: feet - sz.h, w: sz.w, h: sz.h };
      if (bx2.l < first.r - sz.w * 0.15 || bx2.l + bx2.w > vw - 8) return null;   // keep clear of the first line's letters
      if (hits(bx2.l + sz.w * 0.12, bx2.t, bx2.l + bx2.w - sz.w * 0.12, Math.min(first.t - 4, bx2.t + bx2.h))) return null;
      return { box: bx2, axis: 'y', dist: 16, fade: true, el: el, ref: R };
    }
    if (c.kind === 'sit') {
      // standing on a heading: her feet go on the tops of its capital letters, not on its line box
      var floor = R.t, clear = 0;
      if (c.glyphs) {                                                         // the heading's own text box reaches above it; don't count that
        var ct = capTop(el), fs = parseFloat(getComputedStyle(el).fontSize) || 0;
        floor = R.t + ct; clear = ct + Math.max(4, fs * 0.25);
      }
      for (var si = 0; si < c.fx.length; si++) {
        var sx = R.l + R.w * c.fx[si], sb = { l: sx - sz.w / 2, t: floor - sz.h * c.seat, w: sz.w, h: sz.h };
        if (sb.l < 8 || sb.l + sb.w > vw - 8) continue;
        if (!hits(sb.l + sz.w * 0.1, sb.t, sb.l + sb.w - sz.w * 0.1, sb.t + sb.h - clear)) return { box: sb, axis: 'y', dist: 16, fade: true, el: el, ref: R };
      }
      return null;
    }
    if (c.kind === 'side') {
      var gap = vw - R.r; if (gap < sz.w * 0.55) return null;                  // needs room beside the element
      var bw = Math.min(sz.w, gap - 6), bx = { l: R.r, t: R.t + R.h * c.at - sz.h / 2, w: bw, h: sz.h };
      if (hits(bx.l, bx.t, bx.l + bx.w, bx.t + bx.h)) return null;
      return { box: bx, axis: 'x', dir: 1, dist: bw, el: el, ref: R, flip: true };
    }
    // border: peeks in from the edge of the screen, level with part of an element
    var bw2 = Math.min(sz.w, vw * 0.16), y = R.t + Math.min(R.h * c.at, 900), left = c.side === 'left';
    var bb = { l: left ? 0 : vw - bw2, t: y - sz.h / 2, w: bw2, h: sz.h };
    if (hits(bb.l, bb.t, bb.l + bb.w, bb.t + bb.h)) {                           // try a little higher or lower
      var ok = false;
      for (var d = -240; d <= 240 && !ok; d += 60) { bb.t = y - sz.h / 2 + d; ok = !hits(bb.l, bb.t, bb.l + bb.w, bb.t + bb.h); }
      if (!ok) return null;
    }
    return { box: bb, axis: 'x', dir: left ? 1 : -1, dist: bw2, el: el, ref: R, flip: left };
  }
  function build() {
    collect();
    items.forEach(function (it) { it.node.remove(); if (it.hands) it.hands.forEach(function (h) { h.remove(); }); }); items = [];
    CAMEOS.forEach(function (c) {
      var pl = place(c); if (!pl) return;
      var pic = PIC[c.pic], sz = picSize(c);
      var node = document.createElement('div'); node.className = 'cm cm-' + c.id;
      var im = document.createElement('canvas'); im.style.width = sz.w + 'px'; im.style.height = sz.h + 'px';
      var eyeState = makeMotion(im, pic, sz);
      node.appendChild(im); layer.appendChild(node);
      var b = pl.box;
      node.style.left = b.l + 'px'; node.style.top = b.t + 'px'; node.style.width = b.w + 'px'; node.style.height = b.h + 'px';
      // inside the clip box: a rising figure shows its top part; a side peek is anchored on the cut edge
      if (pl.axis === 'y') { im.style.left = ((b.w - sz.w) / 2) + 'px'; im.style.top = '0px'; }
      else { im.style.top = '0px'; im.style.left = pl.flip ? '0px' : (b.w - sz.w) + 'px'; if (pl.flip) im.classList.add('cm-flip'); }
      // clip only the edge she hides behind, so leaning toward the cursor never cuts her off
      node.style.overflow = 'visible';
      node.style.clipPath = pl.fade ? 'none' : pl.axis === 'y' ? 'inset(-400px -400px 0 -400px)' : pl.dir > 0 ? 'inset(-400px -400px -400px 0)' : 'inset(-400px 0 -400px -400px)';
      var hands = c.hands ? makeBustHands(b, sz) : null;
      items.push({ c: c, pl: pl, node: node, im: im, eye: eyeState, hands: hands, v: c.stay ? 1 : 0, target: 0, last: -1, top: b.t, bottom: b.t + b.h, refTop: pl.ref.t, refBot: pl.ref.b });
    });
  }

  /* ---------- scroll -> how far out each cameo is ---------- */
  var smooth = function (x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
  var startT = performance.now(), landed = false;
  function targetFor(it) {
    var vh = innerHeight, top = it.top + pageTop0 - scrollY, c = it.c;
    if (c.stay) return 1;                                                       // stays put in its tile: no rising or sinking on scroll            // on-screen y, no layout reads
    // landing: pops out after load and sinks as you scroll down, but only when its window is on the first screen.
    // On phones the window starts lower, so she behaves like the others: out while it's on screen.
    if (c.landing && it.top + pageTop0 < vh * 0.9) {
      var appear = performance.now() - startT > 700 ? 1 : 0;
      return appear * (1 - smooth(scrollY / (vh * 0.32)));
    }
    // out while it sits in the middle of the screen; in again as it approaches either edge
    var y = top + (it.bottom - it.top) / 2;
    return Math.min(smooth((vh * 0.92 - y) / (vh * 0.28)), smooth((y - vh * 0.08) / (vh * 0.28)));
  }
  var pageTop0 = 0;
  /* ---------- cursor position for two-axis head tracking ---------- */
  var cx = -1e4, cy = -1e4, finePtr = false;
  try { finePtr = matchMedia('(hover: hover) and (pointer: fine)').matches; } catch (e) {}
  if (finePtr && !reduce) {
    addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'touch') { cx = e.clientX; cy = e.clientY; }
    }, { passive: true });
    addEventListener('blur', function () { cx = cy = -1e4; });
    document.documentElement.addEventListener('pointerleave', function () { cx = cy = -1e4; });
  }
  // Each sheet stores full-pose video frames in a grid. Decode and warm it
  // before drawing to keep pointer updates independent of media seeking.
  var headRows;
  function loadHeadRows() {
    if (!headRows) {
      headRows = Promise.all(Array.from({ length: 17 }, function (_, row) {
        var sheet = new Image();
        sheet.src = B + 'neck-turn/r' + row + '.webp?v=3';
        return sheet.decode().then(function () { return sheet; });
      })).catch(function (error) { headRows = null; throw error; });
    }
    return headRows;
  }
  function makeMotion(canvas, pic, sz) {
    var dpr = Math.min(3, devicePixelRatio || 1);
    canvas.width = Math.round(sz.w * dpr);
    canvas.height = Math.round(sz.h * dpr);
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    var pose = motion && motion.poses[pic.key];
    var state = { pose: pose, x: 0, y: 0, displayed: -1 };
    function paint(image) {
      ctx.globalCompositeOperation = 'copy';
      if (image === still && pose && pose.bounds) {
        var bounds = pose.bounds;
        ctx.drawImage(image, bounds[0] * canvas.width, bounds[1] * canvas.height,
          bounds[2] * canvas.width, bounds[3] * canvas.height);
      } else {
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      }
    }
    var still = new Image();
    still.onload = function () { if (state.displayed < 0) paint(still); };
    still.src = B + (pic.key === 'terminal' ? 'video/terminal.png?v=9' : 'hq/' + pic.key + '.webp');
    // these poses stay as still pictures: their old clips turn the head too little to look good
    if (['a2', 'a6', 'a9'].indexOf(pic.key) > -1) return state;
    if (!pose || !finePtr || reduce) return state;

    if (pic.key === 'terminal') {
      // the memoji from the video: all frames in recorded order, so turning plays the real in-between frames
      state.timeline = true;
      state.start = function () {
        Promise.all([fetch(B + 'memoji/frames.json?v=3').then(function (r) { return r.json(); }),
          new Promise(function (ok, no) { var a = new Image(); a.onload = function () { (a.decode ? a.decode() : Promise.resolve()).then(function () { ok(a); }, function () { ok(a); }); }; a.onerror = no; a.src = B + 'memoji/atlas.webp?v=1'; })])
          .then(function (res) { state.info = res[0]; state.pos = state.info.angles.length - 1; state.sheet = res[1]; }).catch(function () {});
      };
      state.paintFrame = function (i) {
        var t = state.info.tile, n = state.info.across;
        ctx.globalCompositeOperation = 'copy';
        ctx.drawImage(state.sheet, i % n * t, Math.floor(i / n) * t, t, t, 0, 0, canvas.width, canvas.height);
        state.displayed = i;
      };
      return state;
    }
    state.start = function () {
      var sheet = new Image();
      sheet.decoding = 'async';
      sheet.src = B + 'video/atlas/' + pic.key + '.webp';
      sheet.decode().then(function () {
        state.sheet = sheet;
      }).catch(function () {});
    };
    state.paintFrame = function (i) {
      var w = pose.tile[0], h = pose.tile[1];
      var sx = i % motion.tilesAcross * w, sy = Math.floor(i / motion.tilesAcross) * h;
      ctx.globalCompositeOperation = 'copy';
      ctx.drawImage(state.sheet, sx, sy, w, h, 0, 0, canvas.width, canvas.height);
      state.displayed = i;
    };
    return state;
  }
  function lookMotion(it, dt, visible) {
    var st = it.eye;
    if (!visible) return;
    if (st.start) { st.start(); st.start = null; }
    if (!st.sheet) return;
    var x = 0, y = 0;
    if (cx > -1000) {
      var r = it.im.getBoundingClientRect();
      var fx = it.im.classList.contains('cm-flip') ? 1 - st.pose.face[0] : st.pose.face[0];
      x = Math.tanh((cx - r.left - r.width * fx) / Math.max(120, innerWidth * .20));
      y = Math.tanh((cy - r.top - r.height * st.pose.face[1]) / Math.max(100, innerHeight * .21));
      if (it.im.classList.contains('cm-flip')) x = -x;
    }
    if (st.timeline) {
      var inf = st.info, ang = inf.angles, N = ang.length, links = inf.links || [];
      var ty = inf.yaw[0] + (x + 1) / 2 * (inf.yaw[1] - inf.yaw[0]), tp = inf.pitch[0] + (y + 1) / 2 * (inf.pitch[1] - inf.pitch[0]);
      st.since = (st.since || 0) + dt;
      if (st.path == null || (st.since > 0.08 && Math.abs(ty - st.ty) + Math.abs(tp - st.tp) > 1.5)) {   // re-aim when the cursor really moved
        st.ty = ty; st.tp = tp; st.since = 0;
        // cheapest route through the video: neighbouring frames, plus jumps between frames that look almost identical
        // (invisible). Turning away from the cursor on the way costs extra.
        var D = function (k) { var dy = ang[k][0] - ty, dp = (ang[k][1] - tp) * 1.7; return Math.sqrt(dy * dy + dp * dp); };
        var cur = st.shown == null ? N - 1 : st.shown, cost = new Float64Array(N).fill(1e9), prev = new Int32Array(N).fill(-1), done = new Uint8Array(N);
        cost[cur] = 0;
        for (;;) {
          var u = -1, bu = 1e9; for (var i = 0; i < N; i++) if (!done[i] && cost[i] < bu) { bu = cost[i]; u = i; }
          if (u < 0) break; done[u] = 1;
          var nb = [(u + 1) % N, (u + N - 1) % N].concat(links[u] || []), du = D(u);
          for (var j = 0; j < nb.length; j++) { var v = nb[j], c = cost[u] + 1 + Math.max(0, D(v) - du) * 0.9; if (c < cost[v]) { cost[v] = c; prev[v] = u; } }
        }
        var goal = cur, bg = 1e9; for (var k = 0; k < N; k++) { var g = D(k) * 1.6 + cost[k] * 0.12; if (g < bg) { bg = g; goal = k; } }
        var path = []; for (var q = goal; q !== cur && q >= 0; q = prev[q]) path.unshift(q);
        st.path = path; st.acc = 0;
      }
      // play the route: fast across long turns, easing into the last few frames
      if (st.path.length) {
        st.acc += dt * Math.max(30, st.path.length * 9);
        while (st.acc >= 1 && st.path.length) { st.shown = st.path.shift(); st.acc -= 1; }
      }
      if (st.shown == null) st.shown = N - 1;
      if (st.shown !== st.displayed) st.paintFrame(st.shown);
      return;
    }
    var a = 1 - Math.exp(-dt * (st.picks ? 24 : 15));
    st.x += (x - st.x) * a;
    st.y += (y - st.y) * a;
    var columns = st.columns || motion.columns;
    var col = Math.round((st.x + 1) * (columns - 1) / 2);
    var row = Math.round((st.y + 1) * ((st.rows || motion.rows) - 1) / 2);
    var frame = row * columns + col;
    if (st.picks && st.blendTo != null) {                                       // finishing a short blend
      st.blendT += dt / 0.09;
      if (st.blendT < 1 && st.blendTo === frame) { st.paintBlend(st.blendFrom, frame, st.blendT); return; }
      st.blendTo = null; st.displayed = -1;
    }
    if (frame === st.displayed) return;
    if (st.picks && st.displayed >= 0 && Math.abs(st.picks[frame] - st.picks[st.displayed]) > 8) {
      st.blendFrom = st.displayed; st.blendTo = frame; st.blendT = 0;          // far apart in the video: blend instead of snapping
      st.paintBlend(st.blendFrom, frame, 0); st.displayed = frame; return;
    }
    st.paintFrame(frame);
  }
  function makeBustHands(b, sz) {
    var fw = sz.w * 0.2, fh = fw * 36 / 102, out = [], left = b.l + (b.w - sz.w) / 2;
    [-1, 1].forEach(function (s) {
      var f = document.createElement('img'); f.src = B + 'hq/fingers.webp'; f.alt = ''; f.className = 'cm-hand' + (s < 0 ? ' cm-flip' : '');
      f.style.width = fw + 'px'; f.style.height = fh + 'px';
      f.style.left = (left + sz.w * (0.5 + s * 0.3) - fw / 2) + 'px'; f.style.top = (b.t + b.h - fh * 0.42) + 'px';
      layer.appendChild(f); out.push(f);
    });
    return out;
  }
  function frame(now) {
    requestAnimationFrame(frame);
    if (layer.hidden) return;
    var dt = Math.min(0.05, (now - (frame.last || now)) / 1000); frame.last = now;
    for (var i = 0; i < items.length; i++) {
      var it = items[i], tgt = targetFor(it);
      // a soft spring toward the scroll position: unhurried in both directions
      var rate = it.c.landing && !landed ? 1.9 : 2.8;
      it.v += (tgt - it.v) * (1 - Math.exp(-dt * rate));
      if (Math.abs(tgt - it.v) < 0.0008) it.v = tgt;
      if (it.c.landing && it.v > 0.98) landed = true;
      var e = reduce ? (tgt > 0.5 ? 1 : 0) : it.v, ease = e * e * (3 - 2 * e);
      var top = it.top + pageTop0 - scrollY;
      lookMotion(it, dt, ease > 0.02 && top < innerHeight && top + it.bottom - it.top > 0);
      if (Math.abs(ease - it.last) < 0.0005) continue; it.last = ease;
      if (it.pl.fade) it.node.style.opacity = ease.toFixed(3);
      if (it.hands) { var hp = smooth((ease - 0.55) / 0.45); it.hands.forEach(function (h) { h.style.opacity = hp.toFixed(3); h.style.transform = 'translate3d(0,' + ((1 - hp) * -10).toFixed(2) + 'px,0)' + (h.classList.contains('cm-flip') ? ' scaleX(-1)' : ''); h.style.visibility = hp < 0.01 ? 'hidden' : 'visible'; }); }
      var d = it.pl.dist * (1 - ease), fl = it.im.classList.contains('cm-flip');
      var tf = it.pl.axis === 'y' ? 'translate3d(0,' + d.toFixed(2) + 'px,0)' : 'translate3d(' + (-it.pl.dir * d).toFixed(2) + 'px,0,0)';
      it.im.style.transform = tf + (fl ? ' scaleX(-1)' : '');
      it.node.style.visibility = ease < 0.002 ? 'hidden' : 'visible';
    }
  }

  /* ---------- show / hide, layout changes ---------- */
  var EYE = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  function away() { toggle.classList.toggle('away', scrollY < innerHeight * 0.85); }
  addEventListener('scroll', away, { passive: true }); away();
  function setHidden(h) { layer.hidden = h; var t = h ? 'Show Anwesha' : 'Hide Anwesha'; toggle.innerHTML = EYE + '<span>' + t + '</span>'; toggle.setAttribute('aria-label', t); toggle.classList.toggle('off', h); try { localStorage.setItem('ag-hidden', h ? '1' : '0'); } catch (e) {} }
  toggle.addEventListener('click', function () { setHidden(!layer.hidden); });
  try { setHidden(localStorage.getItem('ag-hidden') === '1'); } catch (e) { setHidden(false); }
  var bt = 0; function rebuild() { clearTimeout(bt); bt = setTimeout(function () { pageTop0 = pr().top + scrollY; build(); }, 220); }
  addEventListener('resize', rebuild);
  var grid = document.getElementById('pgrid'); if (grid && window.MutationObserver) new MutationObserver(rebuild).observe(grid, { childList: true });
  // anything that changes the page's height after load (project previews, fonts, images) moves the edges she sits on: place her again
  if (window.ResizeObserver) { var lastH = 0; new ResizeObserver(function () { var h = page.scrollHeight; if (Math.abs(h - lastH) > 2) { lastH = h; rebuild(); } }).observe(page); }
  fetch(B + 'video/atlas/poses.json').then(function (r) { return r.json(); }).then(function (data) {
    motion = data;
  }).catch(function () {}).then(function () {
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(function () {
      setTimeout(function () { pageTop0 = pr().top + scrollY; build(); startT = performance.now(); requestAnimationFrame(frame); }, 250);
    });
  });
})();
