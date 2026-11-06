(function () {
  var slot = document.querySelector(".ideo-slot[data-explorer='ideologies']:not(.is-placeholder)");
  if (!slot || slot.querySelector("#app")) return;
  if (typeof THREE === "undefined" || typeof D === "undefined" || !THREE.OrbitControls) {
    slot.textContent = "The ideologies explorer did not load.";
    return;
  }

  slot.innerHTML = '<div id="app"><div id="main">' +
    '<div id="top"><div class="sub">Inner ring −2, grey ring 0, rim +2. A dashed line is a contested range. A faint spoke has low salience. The floor band is press alignment. Diamonds are documented facts. <a href="seats.html">Seat counts</a></div>' +
    '<div id="ptog"></div>' +
    '<div id="legend"><span class="k threat"></span>documented threat <span class="k over"></span>documented overreach <span class="k ctx"></span>context or contested<br>—— uncertainty &nbsp; ┄┄ contested range (low to high) &nbsp; ░ internal spread</div></div>' +
    '<div id="stage"><canvas id="c3"></canvas><svg id="radar"></svg><div id="labels"></div></div>' +
    '<div id="ctl"><div id="row"><button type="button" id="play">▶ Play</button><input id="scrub" type="range" min="1" max="120" value="89"><span id="cl"></span>' +
    '<button type="button" id="evb" class="on">Evidence layer</button><button type="button" id="medb" class="on">Press band</button><button type="button" id="mode">Flat 2D radar</button><button type="button" id="reset">Reset view</button><button type="button" id="mbtn">Method</button></div><svg id="strip"></svg></div>' +
    '<div id="method"></div></div><div id="side"></div><div id="tip"></div></div>';

  function theme() {
    var dark = document.documentElement.getAttribute("data-theme") === "dark";
    function hex(h) { return parseInt(h.slice(1), 16); }
    if (dark) {
      return {
        paper: hex("#000000"), ink: hex("#ffffff"), mute: hex("#a39e96"), hair: hex("#333333"), ring: hex("#8a8a8a"),
        paperCss: "#000000", inkCss: "#ffffff", muteCss: "#a39e96", hairCss: "#333333", ringCss: "#8a8a8a",
        barCss: "#3a3a3a", nowCss: "#e6b15c"
      };
    }
    return {
      paper: hex("#ffffff"), ink: hex("#000000"), mute: hex("#6e6a64"), hair: hex("#d8d4ce"), ring: hex("#9a9a9a"),
      paperCss: "#ffffff", inkCss: "#000000", muteCss: "#6e6a64", hairCss: "#d8d4ce", ringCss: "#9a9a9a",
      barCss: "#c9ced6", nowCss: "#8d4d12"
    };
  }

  function evCss(kind) {
    if (kind === "threat") return theme().inkCss;
    return EVC[kind];
  }

  function evTag(kind) {
    var t = theme();
    var bg = kind === "threat" ? t.inkCss : EVC[kind];
    var fg = kind === "threat" ? t.paperCss : "#fff";
    return "background:" + bg + ";color:" + fg;
  }

  const PC = { "Federalist": "#7b2cbf", "Democratic-Republican": "#00a6a6", "Whig": "#f2a900", "Democratic": "#1f5fd6", "Republican": "#e0262b" };
  const EVC = { threat: "#111111", overreach: "#2b8a3e", contested: "#9aa0a6", context: "#9aa0a6" };
  const PARTIES = Object.keys(PC), N = D.dims.length, yr = c => c >= 120 ? 2027 : 1789 + 2 * (c - 1);
  const ord = n => n + (["th", "st", "nd", "rd"][(n % 100 > 10 && n % 100 < 14) ? 0 : n % 10] || "th");
  const POS = {};
  D.pos.forEach(([c, p, d, v, u, s, src, lo, hi, clo, chi, era, rev]) => { ((POS[c] ??= {})[p] ??= {})[d] = { v, u, s, src, lo, hi, clo, chi, era, rev }; });
  const show = Object.fromEntries(PARTIES.map(p => [p, true]));
  const R0 = 0.35, RL = 1.25, ZS = 0.032, ang = i => Math.PI / 2 - i / N * 2 * Math.PI, rad = v => R0 + (v + 2) / 4 * RL, zOf = y => (y - 1908) * ZS;
  const sal = (c, i) => D.sal[c][i];
  function present(c, p) { return POS[c] && POS[c][p]; }
  const RAD = {};
  PARTIES.forEach(p => {
    const cs = [];
    for (let c = 1; c <= 120; c++) if (present(c, p)) cs.push(c);
    if (!cs.length) return;
    const raw = cs.map(c => D.dims.map(d => { const q = POS[c][p][d.id]; return q ? [q.v, 1] : [0, 0]; }));
    const out = {};
    cs.forEach((c, k) => {
      out[c] = D.dims.map((d, i) => {
        let sv = 0, sw = 0, sl = 0, sn = 0;
        for (let j = -3; j <= 3; j++) {
          const kk = k + j;
          if (kk < 0 || kk >= cs.length || cs[kk] - c !== j) continue;
          const g = Math.exp(-j * j / (2 * 1.3 * 1.3));
          sn += g;
          sl += g * raw[kk][i][1];
          if (raw[kk][i][1]) { sv += g * raw[kk][i][0]; sw += g; }
        }
        const live = sl / sn, v = sw ? sv / sw : 0;
        return rad(v * live);
      });
    });
    RAD[p] = out;
  });
  function vert(c, p, i) { const r = RAD[p][c][i]; return [r * Math.cos(ang(i)), r * Math.sin(ang(i)), zOf(yr(c))]; }
  function vertR(r, i, z) { return new THREE.Vector3(r * Math.cos(ang(i)), r * Math.sin(ang(i)), z); }

  const cv = document.getElementById("c3"), renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
  renderer.setClearColor(theme().paper);
  renderer.setPixelRatio(Math.min(2, devicePixelRatio));
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(34, 1, 0.05, 100);
  const ctr = new THREE.OrbitControls(cam, cv);
  ctr.enableDamping = true;
  ctr.dampingFactor = .12;
  const OFF = new THREE.Vector3(-1.7, 2.1, 8.4);
  const world = new THREE.Group();
  scene.add(world);
  const axisMat = new THREE.LineBasicMaterial({ color: theme().mute });
  world.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, zOf(1789)), new THREE.Vector3(0, 0, zOf(2027))]), axisMat));
  const tickMats = [];
  for (let y = 1790; y <= 2020; y += 10) {
    const t = y % 50 == 0 ? .08 : .035;
    const mat = new THREE.LineBasicMaterial({ color: theme().mute });
    tickMats.push(mat);
    world.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-t, 0, zOf(y)), new THREE.Vector3(t, 0, zOf(y))]), mat));
  }
  const SUB = 4, segs = [];
  function cr(p0, p1, p2, p3, t) { const t2 = t * t, t3 = t2 * t; return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3); }
  const tubes = {};
  PARTIES.forEach(p => {
    if (!RAD[p]) return;
    const g = new THREE.Group();
    const cs = Object.keys(RAD[p]).map(Number).sort((a, b) => a - b);
    const runs = [];
    let r = [];
    cs.forEach(c => { if (r.length && c !== r[r.length - 1] + 1) { runs.push(r); r = []; } r.push(c); });
    runs.push(r);
    runs.forEach(rn => {
      for (let k = 0; k < rn.length - 1; k++) {
        const c0 = rn[Math.max(0, k - 1)], c1 = rn[k], c2 = rn[k + 1], c3 = rn[Math.min(rn.length - 1, k + 2)];
        const rings = [];
        for (let s = 0; s <= SUB; s++) {
          const t = s / SUB, z = zOf(yr(c1)) + (zOf(yr(c2)) - zOf(yr(c1))) * t;
          rings.push(D.dims.map((d, i) => vertR(Math.max(R0 * .6, cr(RAD[p][c0][i], RAD[p][c1][i], RAD[p][c2][i], RAD[p][c3][i], t)), i, z)));
        }
        const pos = [], idx = [];
        rings.forEach(rg => rg.forEach(v => pos.push(v.x, v.y, v.z)));
        for (let s = 0; s < SUB; s++) for (let i = 0; i < N; i++) {
          const a = s * N + i, b = s * N + (i + 1) % N, c = (s + 1) * N + i, d = (s + 1) * N + (i + 1) % N;
          idx.push(a, c, b, b, c, d);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
        geo.setIndex(idx);
        const mat = new THREE.MeshBasicMaterial({ color: PC[p], transparent: true, opacity: .05, side: THREE.DoubleSide, depthWrite: false });
        g.add(new THREE.Mesh(geo, mat));
        const lp = [];
        for (let i = 0; i < N; i++) for (let s = 0; s < SUB; s++) {
          const a = rings[s][i], b = rings[s + 1][i];
          lp.push(a.x, a.y, a.z, b.x, b.y, b.z);
        }
        const lg = new THREE.BufferGeometry();
        lg.setAttribute("position", new THREE.Float32BufferAttribute(lp, 3));
        const lm = new THREE.LineBasicMaterial({ color: PC[p], transparent: true, opacity: .2 });
        g.add(new THREE.LineSegments(lg, lm));
        segs.push({ p, y: yr(c1), mat, lm });
      }
    });
    tubes[p] = g;
    world.add(g);
  });

  const FLOORY = -(R0 + RL) - 0.42, medG = new THREE.Group();
  world.add(medG);
  const MOFF = { "Federalist": -0.45, "Democratic-Republican": 0.45, "Whig": -0.45, "Democratic": -0.45, "Republican": 0.45 };
  const floorMats = [];
  (function () {
    PARTIES.forEach(p => {
      const pts = [];
      for (let c = 1; c <= 120; c++) { const m = D.ext.media[c]?.[p]; if (m) pts.push([zOf(yr(c)), m.v, m.data]); }
      if (pts.length < 2) return;
      const pos = [], idx = [];
      pts.forEach(([z, v], k) => {
        const x = MOFF[p];
        pos.push(x, FLOORY, z, x, FLOORY + v * 0.16, z);
        if (k) { const a = (k - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      });
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      geo.setIndex(idx);
      const mm = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: PC[p], transparent: true, opacity: .28, side: THREE.DoubleSide, depthWrite: false }));
      mm.userData.party = p;
      medG.add(mm);
      const top = pts.map(([z, v]) => new THREE.Vector3(MOFF[p], FLOORY + v * 0.16, z));
      const tl = new THREE.Line(new THREE.BufferGeometry().setFromPoints(top), new THREE.LineBasicMaterial({ color: PC[p] }));
      tl.userData.party = p;
      medG.add(tl);
      const dp = pts.filter(q => q[2]).map(([z, v]) => new THREE.Vector3(MOFF[p], FLOORY + v * 0.16, z));
      if (dp.length) {
        const pm = new THREE.Points(new THREE.BufferGeometry().setFromPoints(dp), new THREE.PointsMaterial({ color: PC[p], size: 4, sizeAttenuation: false }));
        pm.userData.party = p;
        medG.add(pm);
      }
    });
    [-0.45, 0.45].forEach(x => {
      const mat = new THREE.LineBasicMaterial({ color: theme().hair });
      floorMats.push(mat);
      medG.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, FLOORY, zOf(1789)), new THREE.Vector3(x, FLOORY, zOf(2027))]), mat));
    });
  })();

  const evG = new THREE.Group();
  world.add(evG);
  const evPick = [];
  const threatMats = [];
  D.ext.evidence.forEach(e => {
    const col = e.kind === "threat" ? theme().ink : parseInt(EVC[e.kind].slice(1), 16);
    const mat = new THREE.MeshBasicMaterial({ color: col });
    if (e.kind === "threat") threatMats.push(mat);
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(.045), mat);
    m.position.set(0, 0, zOf(e.year));
    m.userData.ev = e;
    evG.add(m);
    evPick.push(m);
  });
  const slices = new THREE.Group();
  world.add(slices);
  let cur = 89, pick = [];
  function line(pts, col, op = 1, dash = false) {
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    const m = dash ? new THREE.LineDashedMaterial({ color: col, dashSize: .025, gapSize: .018, transparent: true, opacity: op }) : new THREE.LineBasicMaterial({ color: col, transparent: op < 1, opacity: op });
    const l = new THREE.Line(g, m);
    if (dash) l.computeLineDistances();
    return l;
  }
  function drawSlice() {
    const t = theme();
    slices.clear();
    pick = [];
    const z = zOf(yr(cur));
    [-2, 0, 2].forEach(v => {
      const pts = [...Array(97).keys()].map(k => { const a = k / 96 * 2 * Math.PI; return new THREE.Vector3(rad(v) * Math.cos(a), rad(v) * Math.sin(a), z); });
      slices.add(line(pts, v == 0 ? t.ring : t.hair));
    });
    for (let i = 0; i < N; i++) {
      const s = sal(cur, i);
      slices.add(line([vertR(R0, i, z), vertR(R0 + RL, i, z)], t.ink, .07 + .8 * s));
    }
    PARTIES.forEach(p => {
      if (!show[p] || !present(cur, p)) return;
      const vs = [...Array(N).keys()].map(i => vert(cur, p, i));
      const pos = [0, 0, z];
      vs.forEach(v => pos.push(...v));
      const idx = [];
      for (let i = 0; i < N; i++) idx.push(0, 1 + i, 1 + (i + 1) % N);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      geo.setIndex(idx);
      slices.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: PC[p], transparent: true, opacity: .16, side: THREE.DoubleSide, depthWrite: false })));
      slices.add(line([...vs, vs[0]].map(v => new THREE.Vector3(...v)), PC[p]));
      for (let i = 0; i < N; i++) {
        const q = POS[cur][p][D.dims[i].id];
        if (!q) continue;
        const r = RAD[p][cur][i], shift = r - rad(q.v);
        const w = (a, b, op, dash) => slices.add(line([vertR(rad(Math.max(-2, a)) + shift, i, z), vertR(rad(Math.min(2, b)) + shift, i, z)], PC[p], op, dash));
        w(q.v - q.s, q.v + q.s, .18);
        w(q.v - q.u, q.v + q.u, .65);
        if (q.lo != null) w(q.lo, q.hi, 1, true);
        const m = new THREE.Mesh(new THREE.SphereGeometry(q.lo != null ? .03 : .021, 12, 8), new THREE.MeshBasicMaterial({ color: q.lo != null ? t.paper : PC[p] }));
        m.position.set(...vs[i]);
        m.userData = { p, i, q };
        slices.add(m);
        pick.push(m);
        if (q.lo != null) {
          const ring = new THREE.Mesh(new THREE.SphereGeometry(.021, 12, 8), new THREE.MeshBasicMaterial({ color: PC[p] }));
          ring.position.set(...vs[i]);
          slices.add(ring);
        }
      }
    });
    segs.forEach(s => { const d = Math.abs(s.y - yr(cur)); s.mat.opacity = .012 + .07 * Math.exp(-d / 30); s.lm.opacity = .04 + .28 * Math.exp(-d / 22); });
  }
  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(), tip = document.getElementById("tip");
  function esc(s) { return (s || "").replace(/</g, "&lt;"); }
  function eraText(era) {
    if (era == "contemporary") return "sources from the time";
    if (era == "later") return "later scholarship";
    return "both (contemporary and later)";
  }
  function partyCite(p, q) {
    let h = `<b style="color:${PC[p]}">${p}</b> ${q.v >= 0 ? "+" : ""}${q.v.toFixed(2)} ± ${q.u} <span class="note">(internal spread ±${q.s})</span><br><span class="note">Source era: ${eraText(q.era)}</span><br><span class="src">${esc(q.src)}</span>`;
    if (q.lo != null) h += `<div class="split"><b>Contested:</b> low ${q.lo.toFixed(2)} ↔ high ${q.hi.toFixed(2)}<br>Low reading: <span class="src">${esc(q.clo) || "—"}</span><br>High reading: <span class="src">${esc(q.chi) || "—"}</span></div>`;
    if (q.rev) h += `<div class="revise"><b>Revised by later archives:</b> ${esc(q.rev)}</div>`;
    return h;
  }
  function dimCite(i) {
    return PARTIES.filter(p => present(cur, p) && show[p] && POS[cur][p][D.dims[i].id]).map(p => `<div class="split">${partyCite(p, POS[cur][p][D.dims[i].id])}</div>`).join("");
  }
  function dimTip(i) {
    const d = D.dims[i];
    return `<b>${esc(d.name)}</b><br><span class="note">−2 ${esc(d.neg)} · +2 ${esc(d.pos)}</span>${dimCite(i)}`;
  }
  function vtip(p, i, q, x, y) {
    const d = D.dims[i];
    showTip(`<b style="color:${PC[p]}">${p}</b> · ${ord(cur)} Congress (${yr(cur)})<br><b>${esc(d.name)}</b><br>${partyCite(p, q)}<br><span class="note">Coded judgment on fixed poles: −2 ${esc(d.neg)} · +2 ${esc(d.pos)}</span>`, x, y);
  }
  function showTip(h, x, y) {
    tip.innerHTML = h;
    tip.style.display = "block";
    const w = tip.offsetWidth, ht = tip.offsetHeight;
    let left = x + 14, top = y + 12;
    if (left + w > window.innerWidth - 8) left = x - w - 12;
    if (left < 8) left = 8;
    if (top + ht > window.innerHeight - 8) top = y - ht - 12;
    if (top < 8) top = 8;
    tip.style.left = left + "px";
    tip.style.top = top + "px";
  }
  function etip(e, x, y) {
    showTip(`<b>${e.year} · ${esc(e.title)}</b> <span class="tag" style="${evTag(e.kind)}">${e.kind}</span><br>${esc(e.text)}<br><span class="note">Source: ${esc(e.source)}</span><br><span class="note">A documented fact, not a party rating.</span>`, x, y);
  }
  cv.addEventListener("mousemove", e => {
    const b = cv.getBoundingClientRect();
    mouse.set((e.clientX - b.left) / b.width * 2 - 1, -(e.clientY - b.top) / b.height * 2 + 1);
    ray.setFromCamera(mouse, cam);
    const h = ray.intersectObjects(pick.concat(evG.visible ? evPick : []))[0];
    if (!h) { tip.style.display = "none"; return; }
    if (h.object.userData.ev) etip(h.object.userData.ev, e.clientX, e.clientY);
    else { const { p, i, q } = h.object.userData; vtip(p, i, q, e.clientX, e.clientY); }
  });
  const lab = document.getElementById("labels");
  const labs = D.dims.map((d, i) => {
    const e = document.createElement("div");
    e.className = "sl";
    e.textContent = d.name;
    lab.appendChild(e);
    e.onmousemove = ev => showTip(`<b>${esc(d.name)}</b><br>−2: ${esc(d.neg)}<br>+2: ${esc(d.pos)}<br><span class="note">Issues mapped (${d.issues.length}): ${esc(d.issues.slice(0, 14).join("; "))}${d.issues.length > 14 ? " …" : ""}<br>Active span (salience ≥ .35): ${d.first || "—"}–${d.last || "—"} · salience now ${sal(cur, i).toFixed(2)}</span>${dimCite(i)}`, ev.clientX, ev.clientY);
    e.onmouseleave = () => tip.style.display = "none";
    return e;
  });
  const flab = document.createElement("div");
  flab.className = "sl mute";
  flab.textContent = "press alignment (floor band)";
  lab.appendChild(flab);
  function placeLabels() {
    const b = cv.getBoundingClientRect(), z = zOf(yr(cur));
    if (mode2d) { labs.forEach(e => e.style.display = "none"); flab.style.display = "none"; return; }
    const P = D.dims.map((d, i) => {
      const v = vertR(R0 + RL + .1, i, z).project(cam);
      const e = labs[i];
      e.style.display = "block";
      const w = e.offsetWidth || 90, h = e.offsetHeight || 13;
      let x = (v.x + 1) / 2 * b.width, y = (1 - v.y) / 2 * b.height;
      const c = Math.cos(ang(i));
      x += c > .25 ? 0 : c < -.25 ? -w : -w / 2;
      y -= h / 2;
      return { e, x, y, w, h, i };
    });
    for (let it = 0; it < 30; it++) {
      let moved = false;
      for (let a = 0; a < P.length; a++) for (let c = a + 1; c < P.length; c++) {
        const A = P[a], B = P[c];
        if (A.x < B.x + B.w && B.x < A.x + A.w && A.y < B.y + B.h && B.y < A.y + A.h) {
          const dy = (A.y + A.h / 2 < B.y + B.h / 2 ? -1 : 1) * 1.6;
          A.y += dy;
          B.y -= dy;
          moved = true;
        }
      }
      if (!moved) break;
    }
    const ctlBox = document.getElementById("ctl");
    const ctlOver = ctlBox && getComputedStyle(ctlBox).position === "absolute";
    const maxBottom = b.height - (ctlOver ? ctlBox.offsetHeight + 4 : 2);
    P.forEach(o => {
      o.x = Math.max(0, Math.min(b.width - o.w, o.x));
      o.y = Math.max(0, Math.min(maxBottom - o.h, o.y));
      o.e.style.display = "block";
      o.e.style.left = o.x + "px";
      o.e.style.top = o.y + "px";
      o.e.style.opacity = .3 + .7 * sal(cur, o.i);
    });
    const fv = new THREE.Vector3(0.9, FLOORY, z).project(cam);
    flab.style.display = medG.visible ? "block" : "none";
    if (medG.visible) {
      const fw = flab.offsetWidth || 120, fh = flab.offsetHeight || 13;
      flab.style.left = Math.max(0, Math.min(b.width - fw, (fv.x + 1) / 2 * b.width + 4)) + "px";
      flab.style.top = Math.max(0, Math.min(maxBottom - fh, (1 - fv.y) / 2 * b.height - 6)) + "px";
    }
  }
  function resize() {
    const m = document.getElementById("stage");
    renderer.setSize(m.clientWidth, m.clientHeight, false);
    cam.aspect = m.clientWidth / m.clientHeight;
    cam.updateProjectionMatrix();
    strip();
    if (mode2d) radar();
  }
  let lastT = null;
  function frameTarget(reset) {
    const t = new THREE.Vector3(0, -0.15, zOf(yr(cur)));
    if (reset || !lastT) cam.position.copy(t).add(OFF);
    else cam.position.add(t.clone().sub(lastT));
    ctr.target.copy(t);
    lastT = t;
  }
  function loop() { ctr.update(); renderer.render(scene, cam); placeLabels(); requestAnimationFrame(loop); }
  let mode2d = false;
  function radar() {
    const t = theme();
    const sv = document.getElementById("radar"), m = document.getElementById("stage"), W = m.clientWidth, H = m.clientHeight;
    sv.setAttribute("width", W);
    sv.setAttribute("height", H);
    const narrow = W < 640;
    const nDim = D.dims.length;
    const listCols = 2;
    const listRows = Math.ceil(nDim / listCols);
    const listSize = 10;
    const listLine = 12;
    const listRow = listLine * 2 + 4;
    const listH = narrow ? listRows * listRow + 12 : 0;
    const plotH = Math.max(80, H - listH);
    const fontSize = 11;
    let S, cx, cy;
    if (narrow) {
      const numPad = 16;
      S = Math.min(W / 2 - 8 - numPad, Math.max(24, plotH / 2 - numPad - 6));
      cx = W / 2;
      cy = plotH / 2 - 2;
    } else {
      const wantRoom = 168;
      S = Math.min(W, H - 120) * 0.33;
      if (W / 2 - (S + 16) < wantRoom) S = Math.max(78, W / 2 - 16 - wantRoom);
      cx = W / 2;
      cy = H / 2 - 20;
    }
    const room = Math.max(64, W / 2 - (S + 16));
    const maxChars = Math.max(12, Math.floor((room - 6) / (fontSize * 0.66)));
    const r = v => (R0 + (v + 2) / 4 * RL) / (R0 + RL) * S, rr = R => R / (R0 + RL) * S;
    function wrapLines(name) {
      const words = name.split(" ");
      const lines = [];
      let line = "";
      words.forEach(word => {
        const next = line ? line + " " + word : word;
        if (line && next.length > maxChars) { lines.push(line); line = word; }
        else line = next;
      });
      if (line) lines.push(line);
      return lines;
    }
    let h = "";
    [-2, -1, 0, 1, 2].forEach(v => {
      h += `<circle cx="${cx}" cy="${cy}" r="${r(v)}" fill="none" stroke="${v == 0 ? t.ringCss : t.hairCss}" stroke-width="${v == 0 ? .8 : .6}"/>`;
      if (!narrow) h += `<text x="${cx + 3}" y="${cy - r(v) - 2}" font-size="9" fill="${t.muteCss}">${v > 0 ? "+" : ""}${v}</text>`;
    });
    const LB = [];
    D.dims.forEach((d, i) => {
      const a = ang(i), s = sal(cur, i);
      h += `<line x1="${cx + r(-2) * Math.cos(a)}" y1="${cy - r(-2) * Math.sin(a)}" x2="${cx + r(2) * Math.cos(a)}" y2="${cy - r(2) * Math.sin(a)}" stroke="${t.inkCss}" stroke-opacity="${.07 + .8 * s}" stroke-width=".8"/>`;
      LB.push({ x: cx + (S + 12) * Math.cos(a), y: cy - (S + 12) * Math.sin(a) + 4, anc: Math.cos(a) > .2 ? "start" : Math.cos(a) < -.2 ? "end" : "middle", d, s, i });
    });
    PARTIES.forEach(p => {
      if (!show[p] || !present(cur, p)) return;
      const pts = D.dims.map((d, i) => { const R = rr(RAD[p][cur][i]); return [cx + R * Math.cos(ang(i)), cy - R * Math.sin(ang(i)), POS[cur][p][d.id], i]; });
      h += `<polygon points="${pts.map(q => q[0] + "," + q[1]).join(" ")}" fill="${PC[p]}" fill-opacity=".13" stroke="${PC[p]}" stroke-width="1.3"/>`;
      pts.forEach(([x, y, q, i]) => {
        if (!q) return;
        const a = ang(i), sh = rr(RAD[p][cur][i]) - r(q.v), R = v => r(Math.max(-2, Math.min(2, v))) + sh, seg = (A, B) => `x1="${cx + R(A) * Math.cos(a)}" y1="${cy - R(A) * Math.sin(a)}" x2="${cx + R(B) * Math.cos(a)}" y2="${cy - R(B) * Math.sin(a)}"`;
        h += `<line ${seg(q.v - q.s, q.v + q.s)} stroke="${PC[p]}" stroke-opacity=".22" stroke-width="5"/><line ${seg(q.v - q.u, q.v + q.u)} stroke="${PC[p]}" stroke-width="1"/>`;
        if (q.lo != null) h += `<line ${seg(q.lo, q.hi)} stroke="${PC[p]}" stroke-width="2" stroke-dasharray="3 2" transform="translate(${-3 * Math.sin(a)},${-3 * Math.cos(a)})"/>`;
        h += `<circle cx="${x}" cy="${y}" r="${q.lo != null ? 4.2 : 3.2}" fill="${t.paperCss}" stroke="${PC[p]}" stroke-width="1.6" data-p="${p}" data-i="${i}" style="cursor:pointer"/>`;
      });
    });
    if (!narrow) LB.forEach(o => {
      const lines = wrapLines(o.d.name);
      const step = fontSize + 1.5;
      const y0 = o.y - ((lines.length - 1) * step) / 2;
      const spans = lines.map((ln, i) => `<tspan x="${o.x.toFixed(1)}" y="${(y0 + i * step).toFixed(1)}">${esc(ln)}</tspan>`).join("");
      h += `<text data-dim="1" data-i="${o.i}" text-anchor="${o.anc}" font-size="${fontSize}" fill="${t.inkCss}" fill-opacity="${(.3 + .7 * o.s).toFixed(2)}">${spans}</text>`;
    });
    if (narrow) {
      const colW = (W - 12) / listCols;
      const keyLimit = Math.max(14, Math.floor((colW - 20) / (listSize * 0.56)));
      function keyLines(name) {
        const words = name.split(" ");
        const lines = [];
        let line = "";
        words.forEach(word => {
          const next = line ? line + " " + word : word;
          if (line && next.length > keyLimit) { lines.push(line); line = word; }
          else line = next;
        });
        if (line) lines.push(line);
        if (lines.length > 2) {
          const rest = lines.slice(1).join(" ");
          return [lines[0], rest.length > keyLimit ? rest.slice(0, Math.max(1, keyLimit - 1)) + "…" : rest];
        }
        return lines;
      }
      h += `<line x1="6" x2="${W - 6}" y1="${(H - listH).toFixed(1)}" y2="${(H - listH).toFixed(1)}" stroke="${t.hairCss}"/>`;
      D.dims.forEach((d, i) => {
        const a = ang(i);
        const nx = cx + (S + 12) * Math.cos(a);
        const ny = cy - (S + 12) * Math.sin(a);
        h += `<circle cx="${nx.toFixed(1)}" cy="${ny.toFixed(1)}" r="8" fill="${t.paperCss}" stroke="${t.hairCss}" stroke-width=".7"/><text x="${nx.toFixed(1)}" y="${(ny + 3.1).toFixed(1)}" text-anchor="middle" font-size="9" fill="${t.inkCss}">${i + 1}</text>`;
        const col = i < listRows ? 0 : 1;
        const row = i < listRows ? i : i - listRows;
        const x = 6 + col * colW;
        const y = H - listH + 16 + row * listRow;
        const lines = keyLines(d.name);
        const spans = lines.map((ln, k) => `<tspan x="${(x + 16).toFixed(1)}" y="${(y + k * listLine).toFixed(1)}">${esc(ln)}</tspan>`).join("");
        h += `<text data-key="1" data-i="${i}" font-size="${listSize}" fill="${t.inkCss}"><tspan x="${x.toFixed(1)}" y="${y.toFixed(1)}" fill="${t.muteCss}">${i + 1}</tspan>${spans}</text>`;
      });
    }
    const ctlEl = document.getElementById("ctl");
    const bottomInset = ctlEl && getComputedStyle(ctlEl).position === "absolute" ? ctlEl.offsetHeight + 10 : 12;
    const partiesShown = !narrow && medG.visible ? PARTIES.filter(p => D.ext.media[cur]?.[p] && show[p]) : [];
    const evAll = !narrow && evG.visible ? D.ext.evidence.filter(e => Math.abs(e.year - yr(cur)) <= 8) : [];
    const floorY = cy + S + 46;
    const roomY = H - bottomInset - Math.max(floorY, 20);
    const partyH = partiesShown.length * 14;
    let evFit = evAll.length;
    const fullNeed = 16 + partyH + (evAll.length ? 26 : 0) + evAll.length * 15;
    if (fullNeed > roomY) evFit = Math.max(0, Math.floor((roomY - 16 - partyH - (evAll.length ? 26 : 0)) / 15));
    const evShow = evAll.slice(0, evFit);
    const more = evAll.length - evShow.length;
    const blockH = 16 + partyH + (evShow.length || more ? 26 : 0) + evShow.length * 15 + (more ? 15 : 0);
    let gx = 16, gy = Math.max(16, H - bottomInset - blockH);
    if (partiesShown.length) {
      h += `<text x="${gx}" y="${gy - 8}" font-size="10" fill="${t.muteCss}">PRESS ALIGNMENT (−2 hostile … +2 friendly)</text>`;
      partiesShown.forEach(p => {
        const pm = D.ext.media[cur][p];
        const x0 = gx + 60, w = 120;
        h += `<text x="${gx}" y="${gy + 8}" font-size="10" fill="${PC[p]}" font-weight="bold">${p.replace("Democratic-Republican", "Dem-Rep")}</text><line x1="${x0}" x2="${x0 + w}" y1="${gy + 4}" y2="${gy + 4}" stroke="${t.hairCss}"/><line x1="${x0 + w / 2}" x2="${x0 + w / 2}" y1="${gy - 1}" y2="${gy + 9}" stroke="${t.muteCss}"/><rect x="${Math.min(x0 + w / 2, x0 + w / 2 + pm.v / 2 * w / 2)}" y="${gy}" width="${Math.abs(pm.v / 2 * w / 2)}" height="8" fill="${PC[p]}" fill-opacity="${pm.data ? .9 : .4}"/><text x="${x0 + w + 6}" y="${gy + 8}" font-size="9.5" fill="${t.muteCss}">${pm.v > 0 ? "+" : ""}${pm.v.toFixed(2)} ${pm.data ? "(data)" : "(coded)"}</text>`;
        gy += 14;
      });
    }
    if (evShow.length || more) {
      const titleChars = Math.max(18, Math.floor((W / 2 - gx - 28) / 6.2));
      gy += 10;
      h += `<text x="${gx}" y="${gy}" font-size="10" fill="${t.muteCss}">EVIDENCE LAYER (±8 yrs)</text>`;
      gy += 16;
      evShow.forEach(e => {
        const title = e.title.length > titleChars ? e.title.slice(0, titleChars - 1) + "…" : e.title;
        h += `<g data-ev="${D.ext.evidence.indexOf(e)}" style="cursor:pointer"><rect x="${gx}" y="${gy - 8}" width="8" height="8" transform="rotate(45 ${gx + 4} ${gy - 4})" fill="${evCss(e.kind)}"/><text x="${gx + 14}" y="${gy}" font-size="10.5" fill="${t.inkCss}">${e.year} ${esc(title)}</text></g>`;
        gy += 15;
      });
      if (more) h += `<text x="${gx}" y="${gy}" font-size="10" fill="${t.muteCss}">+ ${more} more in the side list</text>`;
    }
    sv.innerHTML = h;
    const labelBottom = ctlEl && getComputedStyle(ctlEl).position === "absolute" ? H - ctlEl.offsetHeight - 4 : H - 2;
    function shiftText(node, dx, dy) {
      const box = node.getBBox();
      if (dx < 0) dx = Math.max(dx, 2 - box.x);
      if (dx > 0) dx = Math.min(dx, W - 2 - (box.x + box.width));
      if (dy < 0) dy = Math.max(dy, 2 - box.y);
      if (dy > 0) dy = Math.min(dy, labelBottom - (box.y + box.height));
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return false;
      node.querySelectorAll("tspan").forEach(span => {
        if (dx) span.setAttribute("x", parseFloat(span.getAttribute("x")) + dx);
        if (dy) span.setAttribute("y", parseFloat(span.getAttribute("y")) + dy);
      });
      return true;
    }
    const dimNodes = [...sv.querySelectorAll("text[data-dim]")];
    dimNodes.forEach(node => {
      const box = node.getBBox();
      shiftText(node, box.x < 2 ? 2 - box.x : box.x + box.width > W - 2 ? W - 2 - (box.x + box.width) : 0, box.y < 2 ? 2 - box.y : box.y + box.height > labelBottom ? labelBottom - (box.y + box.height) : 0);
    });
    function overlaps(A, B, padX, padY) {
      return A.x < B.x + B.width + padX && B.x < A.x + A.width + padX && A.y < B.y + B.height + padY && B.y < A.y + A.height + padY;
    }
    function pushApart(nodeA, nodeB) {
      const A = nodeA.getBBox(), B = nodeB.getBBox();
      if (A.y + A.height / 2 <= B.y + B.height / 2) {
        if (shiftText(nodeA, 0, -4) || shiftText(nodeB, 0, 4)) return true;
      } else if (shiftText(nodeB, 0, -4) || shiftText(nodeA, 0, 4)) return true;
      if (A.x <= B.x) return shiftText(nodeA, -6, 0) || shiftText(nodeB, 6, 0);
      return shiftText(nodeB, -6, 0) || shiftText(nodeA, 6, 0);
    }
    for (let pass = 0; pass < 40; pass++) {
      let moved = false;
      for (let a = 0; a < dimNodes.length; a++) for (let b = a + 1; b < dimNodes.length; b++) {
        if (overlaps(dimNodes[a].getBBox(), dimNodes[b].getBBox(), 4, 3) && pushApart(dimNodes[a], dimNodes[b])) moved = true;
      }
      if (!moved) break;
    }
    for (let pass = 0; pass < 16; pass++) {
      let moved = false;
      const obstacles = [...sv.querySelectorAll("text:not([data-dim])")].map(node => node.getBBox());
      dimNodes.forEach(node => {
        const A = node.getBBox();
        const hit = obstacles.find(B => overlaps(A, B, 0, 0));
        if (!hit) return;
        if (A.y + A.height / 2 <= hit.y + hit.height / 2) {
          if (shiftText(node, 0, -4) || shiftText(node, A.x < W / 2 ? -6 : 6, 0)) moved = true;
        } else if (shiftText(node, 0, 4) || shiftText(node, A.x < W / 2 ? -6 : 6, 0)) moved = true;
      });
      if (!moved) break;
    }
    sv.querySelectorAll("circle[data-p]").forEach(e => {
      e.onmousemove = ev => { const p = e.dataset.p, i = +e.dataset.i; vtip(p, i, POS[cur][p][D.dims[i].id], ev.clientX, ev.clientY); };
      e.onmouseleave = () => tip.style.display = "none";
    });
    sv.querySelectorAll("text[data-i]").forEach(node => {
      node.onmousemove = ev => showTip(dimTip(+node.dataset.i), ev.clientX, ev.clientY);
      node.onmouseleave = () => tip.style.display = "none";
    });
    sv.querySelectorAll("g[data-ev]").forEach(g => {
      g.onmousemove = ev => etip(D.ext.evidence[+g.dataset.ev], ev.clientX, ev.clientY);
      g.onmouseleave = () => tip.style.display = "none";
    });
  }
  const SEAT = {};
  D.seats.forEach(r => { if (r.chamber == "House") ((SEAT[r.party] ??= {})[r.congress] = r.count); });
  function strip() {
    const t = theme();
    const sv = document.getElementById("strip"), W = sv.clientWidth || 800, H = 44, x = c => 4 + (yr(c) - 1789) / (2027 - 1789) * (W - 8), y = v => H - 4 - v / 340 * (H - 8);
    let h = "";
    Object.entries(PC).forEach(([p, col]) => {
      const s = SEAT[p];
      if (!s) return;
      const cs = Object.keys(s).map(Number).filter(c => s[c] > 0).sort((a, b) => a - b);
      let d = "";
      cs.forEach((c, k) => d += (k && c == cs[k - 1] + 1 ? "L" : "M") + x(c) + "," + y(s[c]));
      h += `<path d="${d}" fill="none" stroke="${col}" stroke-width="1"/>`;
    });
    const vh = D.votehub.House;
    Object.entries(vh).forEach(([p, pair]) => {
      if (!Array.isArray(pair) || !SEAT[p]?.[119]) return;
      h += `<line x1="${x(119)}" y1="${y(SEAT[p][119])}" x2="${x(120)}" y2="${y(pair[0])}" stroke="${PC[p]}" stroke-dasharray="1.5 1.5"/><circle cx="${x(120)}" cy="${y(pair[0])}" r="2.2" fill="${t.paperCss}" stroke="${PC[p]}"/>`;
    });
    if (evG.visible) D.ext.evidence.forEach(e => h += `<rect x="${x((e.year - 1789) / 2 + 1) - 2}" y="${H - 6}" width="4" height="4" transform="rotate(45 ${x((e.year - 1789) / 2 + 1)} ${H - 4})" fill="${evCss(e.kind)}"/>`);
    h += `<line x1="${x(cur)}" x2="${x(cur)}" y1="0" y2="${H}" stroke="${t.inkCss}" stroke-width=".8"/><text x="4" y="10" font-size="9" fill="${t.muteCss}">open circle = called so far · ${D.votehub.uncalled.House} House seats uncalled</text>`;
    sv.innerHTML = h;
  }
  function spark() {
    const t = theme();
    const L = D.ext.lpr_decade, F = D.ext.fb, W = 400, H = 70, ks = Object.keys(L).map(Number), mx = Math.max(...Object.values(L)), x = y => 6 + (y - 1820) / (2030 - 1820) * (W - 12);
    let h = `<svg width="${W}" height="${H + 14}">`;
    ks.forEach(k => { const v = L[k], bh = v / mx * (H - 8); h += `<rect x="${x(k) + 1}" y="${H - bh}" width="${(W - 12) / 21 - 2}" height="${bh}" fill="${t.barCss}"><title>${k}s: ${v.toLocaleString()} LPRs${k == 2020 ? " (FY2020–22 only)" : ""}</title></rect>`; });
    const fk = Object.keys(F).map(Number);
    h += `<path d="${fk.map((k, i) => (i ? "L" : "M") + (x(k) + 4) + "," + (H - F[k] / 16 * (H - 8))).join("")}" fill="none" stroke="${t.inkCss}" stroke-width="1.2"/>`;
    fk.forEach(k => h += `<circle cx="${x(k) + 4}" cy="${H - F[k] / 16 * (H - 8)}" r="1.8" fill="${t.inkCss}"><title>${k}: ${F[k]}% foreign-born</title></circle>`);
    h += `<line x1="${x(yr(cur))}" x2="${x(yr(cur))}" y1="0" y2="${H}" stroke="${t.nowCss}" stroke-width="1"/><text x="6" y="${H + 11}" font-size="9" fill="${t.muteCss}">bars: new LPRs per decade (max ${(mx / 1e6).toFixed(1)} M, 2010s) · line: foreign-born % (peak 14.8%, 1890)</text></svg>`;
    return h;
  }
  function side() {
    const m = D.meta[cur] || {}, P = document.getElementById("side"), prev = Math.max(1, cur - 1), Y = yr(cur);
    const kept = P.scrollTop;
    const rank = D.dims.map((d, i) => [d, sal(cur, i), sal(prev, i)]).sort((a, b) => b[1] - a[1]);
    const appeared = rank.filter(r => r[1] >= .35 && r[2] < .35).map(r => r[0].name), faded = rank.filter(r => r[1] < .35 && r[2] >= .35).map(r => r[0].name);
    const ps = PARTIES.filter(p => present(cur, p) && show[p]);
    const seatTxt = ch => D.seats.filter(r => r.chamber == ch && r.congress == Math.min(cur, 119) && r.count > 0).map(r => `<span style="color:${PC[r.party] || theme().muteCss}">${r.party.split(" /")[0]} ${r.count}</span>`).join(" · ");
    const calledTxt = ch => Object.entries(D.votehub[ch]).filter(([, v]) => Array.isArray(v)).map(([p, [n]]) => `${p.split(" /")[0]} ${n} called`).join(" · ") + ` · ${D.votehub.uncalled[ch]} not yet called`;
    const ab = p => p.replace("Democratic-Republican", "DR").replace("Democratic", "D").replace("Republican", "R").replace("Federalist", "F").replace("Whig", "W");
    let t = `<h2>${ord(cur)} Congress · ${Y}–${Y + 2}</h2><div><b>President:</b> ${m.pres || ""}${m.speaker?.length ? " · <b>Speaker:</b> " + m.speaker.join("; ") : ""}</div>
 <div><b>House:</b> ${cur == 120 ? calledTxt("House") : seatTxt("House")}<br><b>Senate:</b> ${cur == 120 ? calledTxt("Senate") : seatTxt("Senate")}</div>
 ${appeared.length || faded.length ? `<div class="flags">${appeared.map(a => `<span class="tag up">▲ ${a}</span>`).join("")}${faded.map(a => `<span class="tag down">▼ ${a}</span>`).join("")}</div>` : ""}
 <h3>Live dimensions · positions (−2…+2)</h3><table><tr><th>Dimension</th><th>salience</th>${ps.map(p => `<th style="color:${PC[p]}">${ab(p)}</th>`).join("")}</tr>`;
    rank.filter(r => r[1] >= .12).forEach(([d, s]) => {
      const i = D.dims.indexOf(d);
      t += `<tr><td data-i="${i}">${esc(d.name)}</td><td><span class="bar" style="width:${s * 40}px"></span></td>${ps.map(p => {
        const q = POS[cur][p][d.id];
        return q ? `<td data-i="${i}" data-p="${p}" style="color:${PC[p]}">${(q.v > 0 ? "+" : "") + q.v.toFixed(1) + (q.lo != null ? "<sup>↔</sup>" : "") + (q.rev ? "<sup>†</sup>" : "")}</td>` : `<td style="color:${PC[p]}">·</td>`;
      }).join("")}</tr>`;
    });
    t += `</table><div class="note">Hover a dimension name, a score, or a vertex for its citation and source era. ↔ marks a contested range; † marks a reading revised by later archive openings.</div>`;
    const md = D.ext.media[cur];
    if (md) {
      t += `<h3>Press alignment (overlay band)</h3>`;
      PARTIES.forEach(p => { if (md[p]) t += `<div><b style="color:${PC[p]}">${p}</b> ${md[p].v > 0 ? "+" : ""}${md[p].v.toFixed(2)} <span class="note">${md[p].data ? "data" : "coded"}: ${esc(md[p].basis)}</span></div>`; });
    }
    if (Y >= 1815) {
      t += `<h3>Immigration context (DHS, Census)</h3>${spark()}`;
      const imm = D.landmarks.filter(l => /IMMIG|immig|Chinese|Hart|IRCA|Refugee|border|Laken|S\. 744|Fence/i.test(l.label + " " + (l.dim || "")) && Math.abs(l.congress - cur) <= 3);
      imm.forEach(l => t += `<div class="note"><b>${l.label}</b>: ${Object.entries(l.split).filter(([p, v]) => p != "Other" && v.yea + v.nay > 0).map(([p, v]) => `${p} ${v.yea}–${v.nay}`).join("; ")} (Voteview ${l.chamber} #${l.rollnumber}, ${l.date})</div>`);
    }
    t += `<h3>Historical context</h3><p class="tight">${m.text || ""}</p><ul>${(m.bullets || []).map(b => "<li>" + b + "</li>").join("")}</ul>`;
    const lms = D.landmarks.filter(l => Math.abs(l.congress - cur) <= 1);
    if (lms.length) t += `<h3>Landmark roll calls (Voteview)</h3>` + lms.map(l => `<div><b>${l.label}</b> · ${l.chamber} #${l.rollnumber}, ${l.date}: ${Object.entries(l.split).filter(([p, v]) => p != "Other" && v.yea + v.nay > 0).map(([p, v]) => `${p} ${v.yea}–${v.nay}`).join("; ")}</div>`).join("");
    if (evG.visible) {
      const ev = D.ext.evidence.filter(e => Math.abs(e.year - Y) <= 8);
      if (ev.length) t += `<h3>Evidence layer: documented facts (±8 yrs)</h3>` + ev.map(e => `<div class="ev ${e.kind}"><b>${e.year} · ${esc(e.title)}</b> <span class="note">[${e.kind}]</span><br>${esc(e.text)}<br><span class="note">${esc(e.source)}</span></div>`).join("");
    }
    P.innerHTML = t;
    P.querySelectorAll("td[data-i]").forEach(el => {
      el.onmousemove = ev => {
        const i = +el.dataset.i;
        if (!el.dataset.p) { showTip(dimTip(i), ev.clientX, ev.clientY); return; }
        const q = POS[cur][el.dataset.p][D.dims[i].id];
        if (q) vtip(el.dataset.p, i, q, ev.clientX, ev.clientY);
      };
      el.onmouseleave = () => { tip.style.display = "none"; };
    });
    P.scrollTop = kept;
    document.getElementById("cl").textContent = `${ord(cur)} Congress (${Y})${cur == 120 ? " · calls so far" : ""}`;
  }
  function setC(c, reset) {
    cur = c;
    const scrub = document.getElementById("scrub");
    if (document.activeElement !== scrub) scrub.value = c;
    drawSlice();
    frameTarget(reset);
    side();
    strip();
    if (mode2d) radar();
  }
  function paintTheme() {
    const t = theme();
    renderer.setClearColor(t.paper);
    axisMat.color.setHex(t.mute);
    tickMats.forEach(m => m.color.setHex(t.mute));
    floorMats.forEach(m => m.color.setHex(t.hair));
    threatMats.forEach(m => m.color.setHex(t.ink));
    setC(cur);
  }
  document.getElementById("scrub").oninput = e => setC(+e.target.value);
  let timer = null;
  document.getElementById("play").onclick = function () {
    if (timer) { clearInterval(timer); timer = null; this.textContent = "▶ Play"; return; }
    this.textContent = "❚❚ Pause";
    if (cur >= 120) cur = 0;
    timer = setInterval(() => {
      if (cur >= 120) { clearInterval(timer); timer = null; document.getElementById("play").textContent = "▶ Play"; return; }
      setC(cur + 1);
    }, 380);
  };
  document.getElementById("mode").onclick = function () {
    mode2d = !mode2d;
    this.classList.toggle("on", mode2d);
    this.textContent = mode2d ? "3D tube" : "Flat 2D radar";
    document.getElementById("radar").style.display = mode2d ? "block" : "none";
    cv.style.display = mode2d ? "none" : "block";
    setC(cur);
  };
  document.getElementById("evb").onclick = function () { evG.visible = !evG.visible; this.classList.toggle("on", evG.visible); setC(cur); };
  document.getElementById("medb").onclick = function () { medG.visible = !medG.visible; this.classList.toggle("on", medG.visible); setC(cur); };
  document.getElementById("reset").onclick = () => setC(cur, true);
  document.getElementById("ptog").innerHTML = PARTIES.map(p => `<label style="color:${PC[p]}"><input type="checkbox" checked data-p="${p}"> ${p}</label>`).join("");
  document.querySelectorAll("#ptog input").forEach(e => e.onchange = () => {
    const p = e.dataset.p;
    show[p] = e.checked;
    if (tubes[p]) tubes[p].visible = e.checked;
    medG.children.forEach(o => { if (o.userData.party == p) o.visible = e.checked; });
    setC(cur);
  });
  const cal = D.cal.map(c => `<li>V-Party <code>${c.vparty_var}</code> vs ${c.our_dim} (${c.orientation}, n=${c.n}, 1970–2018): pooled r = ${c.pooled_r}; D-vs-R ordering agrees ${Math.round(c.DR_order_agreement * 100)}%; within-party r: D ${c.within_party_r.Democratic}, R ${c.within_party_r.Republican}.</li>`).join("");
  const X = D.ext, MT = document.getElementById("method");
  MT.innerHTML = `<b>Method (v2)</b> <button type="button" id="mclose">Close</button>
<p><b>Codebook discipline.</b> Each dimension has fixed poles defined by <i>policy content, not motive</i>, written once and used for every year. Each rating is a coded judgment (−2…+2) for a party in a Congress where the dimension is live (salience ≥ .12). Each rating carries a citation: a Voteview roll call with the party split, a platform passage, a statute, or a named work of scholarship. Interpolated ratings cite both bracketing keyframes. Ratings with no single primary citation are labelled as such.</p>
<p><b>New in v2.</b> <b>Who counts</b> (apportionment, census, statehood, naturalization, redistricting) is kept separate from the franchise. <b>Immigration</b> now covers only volume and source. <b>Speech</b> and <b>Internal subversion</b> replace the old civil-liberties axis. Press alignment is drawn as an overlay band, not a spoke. An evidence layer shows documented facts. Contested ranges are drawn as dashed whiskers, and each rating is tagged by source era.</p>
<p><b>Salience</b> = 0.8 × issue tagging + 0.2 × keyword share of roll calls. Issue tagging is the weight of the strongest active catalogued issue plus 0.25 × the others, capped at 1. Issues include landmark fights (weight 1) and standing debates (0.3–0.6), so ECON stays salient in the 1960s. Smoothed over 3 Congresses.</p>
<p><b>Surfaces.</b> Live dimensions sit at the party's position. Non-live dimensions ease toward 0 (the grey ring), not toward −2. Radii are Gaussian-smoothed over ±3 Congresses and Catmull-Rom interpolated, so tubes morph without spikes. The bold slice and its markers always show the unsmoothed rating, shifted onto the smoothed surface.</p>
<p><b>Press alignment</b>, from −2 (press aligned against the party) to +2 (friendly press dominant):<br>• 1870–1920: 4 × (party share − rival share) of big-city dailies by stated affiliation. ${esc(X.ggg_src)}<br>• 1972–2026: (party trust − rival trust) ÷ 25 percentage points. ${esc(X.gallup_src)}<br>• 1924–1971: no counts obtained, so the band is interpolated. Before 1870 it is coded. The Gentzkow–Shapiro–Sinkinson panel (ICPSR 30261) needs an ICPSR member login and was not used.</p>
<p><b>Immigration series.</b> ${esc(X.lpr_src)} ${esc(X.fb_src)}</p>
<p><b>Contested ranges and source era.</b> Where credible scholars disagree, a low and a high reading are stored, each with its citation. Each rating is tagged <i>contemporary</i> (sources from the time), <i>later</i> (later scholarship) or <i>both</i>. Readings changed by later archive openings (e.g., Venona in 1995, Soviet archives in the 1990s) are flagged †. The evidence layer lists documented threats <i>and</i> documented overreach, with sources, under the same standard for every party. The threats in that layer include espionage and foreign influence, the Barbary conflicts, and attacks on Americans by Islamist groups and states.</p>
<p><b>Calibration vs V-Party (1970–2018)</b>:</p><ul>${cal}</ul><p>Manifesto Project: not downloaded (registration required). Pooled correlations are inflated by the gap between the parties; within-party trends are the real test.</p>
<p><b>Caveats.</b> Before 1840 the coding rests on votes and the record only. There is no numeric external check before 1970 (press counts exist for 1870–1920 only). Third parties are omitted. WHO combines counting and districting in one axis. The 120th Congress carries the 119th forward (Associated Press calls as of 5 November 2026; seats not yet called are left out).</p>`;
  document.getElementById("mclose").onclick = () => { MT.style.display = "none"; };
  document.getElementById("mbtn").onclick = () => MT.style.display = MT.style.display == "block" ? "none" : "block";
  addEventListener("resize", resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(document.getElementById("stage"));
  new MutationObserver(paintTheme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  resize();
  const qs = new URLSearchParams(location.search);
  if (qs.get("c")) cur = +qs.get("c");
  if (qs.get("ev") == "0") { evG.visible = false; document.getElementById("evb").classList.remove("on"); }
  if (qs.get("mode") == "2d") {
    mode2d = true;
    const b = document.getElementById("mode");
    b.classList.add("on");
    b.textContent = "3D tube";
    document.getElementById("radar").style.display = "block";
    cv.style.display = "none";
  }
  setC(cur, true);
  loop();
})();
