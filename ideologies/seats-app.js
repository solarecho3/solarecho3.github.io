(function () {
  var root = document.getElementById("seats-root");
  if (!root || typeof D === "undefined") {
    if (root) root.textContent = "The seat-count explorer did not load.";
    return;
  }
  root.innerHTML = '<div class="seats"><div class="seats-wrap"><div id="left">' +
    '<p class="sub">DW-NOMINATE is a score from roll-call votes, a recorded vote, that places every member on scales shared across years. Dimension 1 is the economic scale: liberal at −1, conservative at +1. The ribbon color is the party mean, the average of its members. The width is the spread, how far those members sit from that average. Hover a line for the detail. Click to pin it. <a href="ideologies.html">Ideologies</a></p>' +
    '<div class="ctl"><button type="button" id="play">▶ Play</button><input id="scrub" type="range" min="1" max="119" value="119"><span id="scrubl"></span><span id="legend"></span></div>' +
    '<div id="charts"></div><p class="note" id="src"></p></div><div id="panel"></div></div></div>';

  const PC = { "Democratic": "#1f5fd6", "Republican": "#e0262b", "Whig": "#f2a900", "Federalist": "#7b2cbf", "Democratic-Republican": "#00a6a6", "Other / Independent": "#8a8a8a" };
  const LET = { D: "Democratic", R: "Republican", W: "Whig", F: "Federalist", J: "Democratic-Republican", O: "Other / Independent" };
  const NS = "http://www.w3.org/2000/svg";
  function theme() {
    var dark = document.documentElement.getAttribute("data-theme") === "dark";
    if (dark) return { ink: "#ffffff", paper: "#000000", mute: "#a39e96", grid: "#2a2a2a", zero: "#666666", mid: [32, 32, 32] };
    return { ink: "#000000", paper: "#ffffff", mute: "#6e6a64", grid: "#efefef", zero: "#cccccc", mid: [245, 245, 245] };
  }
  function el(t, a, p) {
    const e = document.createElementNS(NS, t);
    for (const k in a) e.setAttribute(k, a[k]);
    if (p) p.appendChild(e);
    return e;
  }
  function div(v) {
    v = Math.max(-.7, Math.min(.7, v)) / .7;
    const L = [33, 102, 172], M = theme().mid, R = [178, 24, 43];
    const a = v < 0 ? L : R, t = Math.abs(v);
    return `rgb(${a.map((c, i) => Math.round(M[i] + (c - M[i]) * t)).join(",")})`;
  }
  const yr = c => 1789 + 2 * (c - 1);
  const seats = {};
  D.seats.forEach(r => { (seats[r.chamber] ??= {}); (seats[r.chamber][r.party] ??= {})[r.congress] = r.count; });
  let pinned = null, cur = null;
  const W = () => document.getElementById("left").clientWidth;
  function draw() {
    if (W() < 40) {
      draw.tries = (draw.tries || 0) + 1;
      if (draw.tries < 8) requestAnimationFrame(function () { draw(); if (cur) show(cur); });
      return;
    }
    draw.tries = 0;
    const t = theme();
    const box = document.getElementById("charts");
    box.innerHTML = "";
    ["House", "Senate"].forEach(ch => {
      const w = W(), h = ch == "House" ? 330 : 290, m = { l: 44, r: 150, t: 22, b: 22 };
      const svg = el("svg", { width: w, height: h }, box);
      const ymax = ch == "House" ? 345 : 80, x = v => m.l + (v - 1785) / (2030 - 1785) * (w - m.l - m.r), y = v => h - m.b - v / ymax * (h - m.t - m.b);
      el("text", { x: m.l, y: 14, "font-size": 14, "font-weight": "bold", fill: t.ink }, svg).textContent = ch == "House" ? "House of Representatives" : "Senate";
      const g = el("g", { class: "grid" }, svg);
      for (let v = 0; v <= ymax; v += ch == "House" ? 50 : 10) {
        el("line", { x1: m.l, x2: w - m.r, y1: y(v), y2: y(v), stroke: t.grid }, g);
        const lab = el("text", { x: m.l - 5, y: y(v) + 3, "text-anchor": "end", "font-size": 10, fill: t.mute }, svg);
        lab.textContent = v;
      }
      for (let v = 1800; v <= 2025; v += 25) {
        const lab = el("text", { x: x(v), y: h - 6, "text-anchor": "middle", "font-size": 10, fill: t.mute }, svg);
        lab.textContent = v;
        el("line", { x1: x(v), x2: x(v), y1: h - m.b, y2: h - m.b + 3, stroke: t.ink }, svg);
      }
      el("line", { x1: m.l, x2: w - m.r, y1: h - m.b, y2: h - m.b, stroke: t.ink }, svg);
      el("line", { x1: m.l, x2: m.l, y1: m.t, y2: h - m.b, stroke: t.ink }, svg);
      const defs = el("defs", {}, svg);
      Object.keys(PC).forEach((p, pi) => {
        const s = seats[ch][p];
        if (!s) return;
        const cs = Object.keys(s).map(Number).sort((a, b) => a - b).filter(c => s[c] > 0 || p == "Other / Independent");
        let runs = [], r = [];
        cs.forEach(c => { if (r.length && c != r[r.length - 1] + 1) { runs.push(r); r = []; } r.push(c); });
        if (r.length) runs.push(r);
        runs.forEach((rn, ri) => {
          if (p != "Other / Independent" && rn.length > 1) {
            const gid = `g${ch}${pi}${ri}`, lg = el("linearGradient", { id: gid, gradientUnits: "userSpaceOnUse", x1: x(yr(rn[0])), x2: x(yr(rn[rn.length - 1])), y1: 0, y2: 0 }, defs);
            const span = Math.max(1, yr(rn[rn.length - 1]) - yr(rn[0]));
            rn.forEach(c => { const st = (D.congress[c] || {})[ch]?.[p]; if (st) el("stop", { offset: (yr(c) - yr(rn[0])) / span, "stop-color": div(st.m1) }, lg); });
            const K = ch == "House" ? 60 : 14;
            let top = [], bot = [];
            rn.forEach(c => { const st = (D.congress[c] || {})[ch]?.[p]; const hw = st ? Math.max(1.2, st.sd1 * K) : 1.2; top.push([x(yr(c)), y(s[c]) - hw]); bot.unshift([x(yr(c)), y(s[c]) + hw]); });
            el("path", { d: "M" + top.concat(bot).map(q => q.join(",")).join("L") + "Z", fill: `url(#${gid})`, "fill-opacity": .85, stroke: "none" }, svg);
          }
          el("path", { d: "M" + rn.map(c => x(yr(c)) + "," + y(s[c])).join("L"), fill: "none", stroke: PC[p], "stroke-width": p == "Democratic" || p == "Republican" ? 1.2 : .9 }, svg);
        });
        const last = cs[cs.length - 1];
        if (!(p in D.votehub[ch])) {
          const lab = el("text", { x: x(yr(last)) + 4, y: y(s[last]) + (p == "Other / Independent" ? -4 : 3), "font-size": 10.5, "font-weight": "bold", fill: PC[p] }, svg);
          lab.textContent = p.split(" /")[0] + (last > 100 ? " " + s[last] : "");
        }
      });
      const vh = D.votehub[ch];
      Object.entries(vh).forEach(([p, [cl, es]]) => {
        const x0 = x(2025), y0 = y(seats[ch][p][119]), x1 = x(2027);
        el("line", { x1: x0, y1: y0, x2: x1, y2: y(es), stroke: PC[p], "stroke-width": 1.2, "stroke-dasharray": "4 2" }, svg);
        el("line", { x1: x0, y1: y0, x2: x1, y2: y(cl), stroke: PC[p], "stroke-width": .9, "stroke-dasharray": "1 1.5" }, svg);
        el("circle", { cx: x1, cy: y(es), r: 3.2, fill: t.paper, stroke: PC[p], "stroke-width": 1.3 }, svg);
        el("circle", { cx: x1, cy: y(cl), r: 2, fill: PC[p] }, svg);
        const off = (p == "Democratic" ? -1 : 1) * (ch == "House" ? 10 : 5) * (vh.Democratic[1] > vh.Republican[1] ? -1 : 1);
        const lab = el("text", { x: x1 + 6, y: y(es) - off, "font-size": 10.5, "font-weight": "bold", fill: PC[p] }, svg);
        lab.textContent = `${p} est. ${es}`;
        const lab2 = el("text", { x: x1 + 6, y: y(es) - off + 11, "font-size": 9.5, fill: PC[p] }, svg);
        lab2.textContent = `called ${cl} · VoteHub 2027`;
      });
      const hl = el("line", { y1: m.t, y2: h - m.b, stroke: t.mute, "stroke-width": .6, "stroke-dasharray": "2 2", visibility: "hidden" }, svg);
      const dot = el("circle", { r: 4, fill: "none", "stroke-width": 1.5, visibility: "hidden" }, svg);
      const ov = el("rect", { x: m.l, y: m.t, width: w - m.l - m.r, height: h - m.t - m.b, fill: "transparent" }, svg);
      function pick(ev) {
        const b = svg.getBoundingClientRect(), px = ev.clientX - b.left, py = ev.clientY - b.top;
        let c = Math.round(((px - m.l) / (w - m.l - m.r) * (2030 - 1785) + 1785 - 1789) / 2) + 1;
        c = Math.max(1, Math.min(119, c));
        let best = null, bd = 1e9;
        for (const p in PC) {
          const v = seats[ch][p]?.[c];
          if (v == null || (v == 0 && p != "Other / Independent")) continue;
          const d = Math.abs(y(v) - py);
          if (d < bd) { bd = d; best = p; }
        }
        return best && { c, ch, p: best, X: x(yr(c)), Y: y(seats[ch][best][c]) };
      }
      ov.addEventListener("mousemove", ev => {
        if (pinned) return;
        const k = pick(ev);
        if (!k) return;
        hl.setAttribute("x1", k.X);
        hl.setAttribute("x2", k.X);
        hl.setAttribute("visibility", "visible");
        dot.setAttribute("cx", k.X);
        dot.setAttribute("cy", k.Y);
        dot.setAttribute("stroke", PC[k.p]);
        dot.setAttribute("visibility", "visible");
        show(k);
      });
      ov.addEventListener("mouseleave", () => { if (!pinned) { hl.setAttribute("visibility", "hidden"); dot.setAttribute("visibility", "hidden"); } });
      ov.addEventListener("click", ev => { const k = pick(ev); pinned = pinned ? null : k; if (k) show(k); });
    });
    const lg = document.getElementById("legend");
    lg.innerHTML = "Ribbon color, mean economic score: " + [-.7, -.35, 0, .35, .7].map(v => `<span class="swatch" style="background:${div(v)}"></span>`).join("") + ' <span class="note">liberal −0.7 … +0.7 conservative · ribbon width is the spread · dashed or hollow = VoteHub estimate, dotted or solid = called</span>';
    document.getElementById("src").textContent = "Sources: seat counts from Wikipedia, Party divisions of United States Congresses, at the start of each Congress. Ideology from Voteview DW-NOMINATE (Lewis, Poole, Rosenthal et al., HSall_members.csv), every member who served. 2027: " + D.votehub.note + " Calls as of " + D.votehub.asof_calls + "; estimates as of " + D.votehub.asof_est + ".";
  }
  function f(v) { return (v >= 0 ? "+" : "") + v.toFixed(2); }
  function show(k) {
    cur = k;
    const { c, ch, p } = k, P = document.getElementById("panel"), md = D.meta[c], st = D.congress[c]?.[ch] || {}, s = st[p];
    const S = seats[ch], tot = Object.values(S).reduce((a, o) => a + (o[c] || 0), 0), mine = S[p][c];
    const other = ch == "House" ? "Senate" : "House", os = Object.entries(seats[other]).filter(([q, o]) => o[c] > 0).map(([q, o]) => `${q.split(" /")[0]} ${o[c]}`).join(" · ");
    const rank = Object.entries(S).map(([q, o]) => [q, o[c] || 0]).sort((a, b) => b[1] - a[1]);
    const role = rank[0][0] == p ? "Majority / largest party" : "Minority";
    const parties = Object.keys(st).filter(q => st[q].n > 0);
    let pol = "";
    if (st.Democratic && st.Republican) pol = `D–R gap in means: dim1 ${(st.Republican.m1 - st.Democratic.m1).toFixed(2)}, dim2 ${(st.Republican.m2 - st.Democratic.m2).toFixed(2)}`;
    else if (parties.length >= 2) {
      const pair = parties.sort((a, b) => st[b].n - st[a].n).slice(0, 2);
      pol = `${pair[0]}–${pair[1]} gap in dim1 means: ${Math.abs(st[pair[0]].m1 - st[pair[1]].m1).toFixed(2)}`;
    }
    const ord = n => n + (["th", "st", "nd", "rd"][(n % 100 > 10 && n % 100 < 14) ? 0 : n % 10] || "th");
    P.innerHTML = `${pinned ? '<div class="pin">Pinned. Click the chart to unpin.</div>' : ""}
 <h2 style="color:${PC[p]}">${ord(c)} Congress · ${yr(c)}–${yr(c) + 2} · ${ch} · ${p}</h2>
 <div><b>${mine}</b> of ${tot} seats (${role}). Other chamber (${other}): ${os}</div>
 <div><b>President:</b> ${md.pres} ${md.speaker.length ? "· <b>Speaker:</b> " + md.speaker.join("; ") : ""}</div>
 <h3>Ideology plane (DW-NOMINATE, fixed axes)</h3><svg id="sc" width="400" height="330"></svg>
 <h3>Stats (${s ? s.n : 0} members who served)</h3>${s ? `<table class="st"><tr><td></td><td>mean</td><td>median</td><td>sd</td></tr>
 <tr><td>dim1 economic</td><td>${f(s.m1)}</td><td>${f(s.md1)}</td><td>${s.sd1.toFixed(2)}</td></tr><tr><td>dim2 2nd/regional</td><td>${f(s.m2)}</td><td>${f(s.md2)}</td><td>${s.sd2.toFixed(2)}</td></tr></table>
 <div>${pol}</div><div><b>Most left:</b> ${s.left.join(", ")}<br><b>Most right:</b> ${s.right.join(", ")}</div>` : "<i>No NOMINATE scores</i>"}
 <h3>Historical context</h3><p class="tight">${md.text}</p><ul>${md.bullets.map(b => "<li>" + b + "</li>").join("")}</ul>
 ${c == 119 ? "<h3>2026 election → 120th Congress</h3><p class=\"tight\">" + D.votehub.note + "</p>" : ""}
 <h3>About the spectrum</h3><p class="note">DW-NOMINATE places every member of every Congress in one common space using their roll-call votes. <b>Dimension 1</b> (x) is the liberal (−1) to conservative (+1) axis, mostly about the government's role in the economy. <b>Dimension 2</b> (y) captures cross-cutting splits; historically it reflects slavery, then civil rights and North vs. South, and lately it is weak. Because the scale is shared, a party drifting across the plane is a real shift relative to other eras, although it is estimated from votes, not stated beliefs.</p>`;
    scatter(c, ch, p);
    document.getElementById("scrub").value = c;
    document.getElementById("scrubl").textContent = `${ord(c)} (${yr(c)})`;
  }
  function scatter(c, ch, p) {
    const t = theme();
    const sv = document.getElementById("sc"), M = D.members[c + ch[0]] || [], S = 300, o = 34, X = v => o + (v / 100 + 1) / 2 * S, Y = v => 10 + (1 - (v / 100 + 1) / 2) * S * 0.8;
    const g = el("g", {}, sv);
    [-1, -.5, 0, .5, 1].forEach(v => {
      el("line", { x1: X(v * 100), x2: X(v * 100), y1: 10, y2: 10 + S * .8, stroke: v == 0 ? t.zero : t.grid }, g);
      const lab = el("text", { x: X(v * 100), y: 10 + S * .8 + 12, "font-size": 9, "text-anchor": "middle", fill: t.mute }, g);
      lab.textContent = v;
    });
    [-1, 0, 1].forEach(v => {
      el("line", { x1: o, x2: o + S, y1: Y(v * 100), y2: Y(v * 100), stroke: v == 0 ? t.zero : t.grid }, g);
      const lab = el("text", { x: o - 4, y: Y(v * 100) + 3, "font-size": 9, "text-anchor": "end", fill: t.mute }, g);
      lab.textContent = v;
    });
    el("text", { x: o + S / 2, y: 10 + S * .8 + 24, "font-size": 10, "text-anchor": "middle", fill: t.ink }, g).textContent = "dim1: ← liberal · economic · conservative →";
    const ty = el("text", { x: 10, y: 10 + S * .4, "font-size": 10, "text-anchor": "middle", fill: t.ink, transform: `rotate(-90 10 ${10 + S * .4})` }, g);
    ty.textContent = "dim2: second / regional axis";
    M.forEach(q => {
      const mine = LET[q[2]] == p;
      const e = el("circle", { cx: X(q[0]), cy: Y(q[1]), r: mine ? 2.6 : 1.8, fill: PC[LET[q[2]]], "fill-opacity": mine ? .85 : .13 }, g);
      if (mine) { const tt = el("title", {}, e); tt.textContent = `${q[3]} (${q[4]}) ${q[0] / 100}, ${q[1] / 100}`; }
    });
    const bins = new Array(40).fill(0);
    M.filter(q => LET[q[2]] == p).forEach(q => bins[Math.min(39, Math.floor((q[0] + 100) / 5))]++);
    const mx = Math.max(1, ...bins), hy = 10 + S * .8 + 30;
    bins.forEach((b, i) => { if (b) el("rect", { x: o + i * S / 40, y: hy + 22 - b / mx * 20, width: S / 40 - .5, height: b / mx * 20, fill: div((i * 5 - 100 + 2.5) / 100) }, g); });
    sv.setAttribute("height", hy + 26);
  }
  document.getElementById("scrub").addEventListener("input", e => {
    const c = +e.target.value;
    const p = cur?.p && seats[cur?.ch || "House"][cur.p]?.[c] > 0 ? cur.p : (seats.House.Democratic[c] > 0 ? "Democratic" : "Democratic-Republican");
    show({ c, ch: cur?.ch || "House", p });
  });
  let timer = null;
  document.getElementById("play").onclick = function () {
    if (timer) { clearInterval(timer); timer = null; this.textContent = "▶ Play"; return; }
    this.textContent = "❚❚ Pause";
    let c = +document.getElementById("scrub").value;
    if (c >= 119) c = 0;
    timer = setInterval(() => {
      c++;
      if (c > 119) { clearInterval(timer); timer = null; document.getElementById("play").textContent = "▶ Play"; return; }
      const s = document.getElementById("scrub");
      s.value = c;
      s.dispatchEvent(new Event("input"));
    }, 450);
  };
  function redraw() {
    draw();
    if (cur) show(cur);
  }
  new MutationObserver(redraw).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  draw();
  show({ c: 119, ch: "House", p: "Republican" });
  window.addEventListener("resize", draw);
})();
