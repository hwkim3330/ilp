/* ═══════════════════════════════════════════════
   TSN/GCL ILP Solver — Web Worker
   Runs GLPK (WASM) in a background thread
═══════════════════════════════════════════════ */

// 1) Pre-fetch WASM binary (sync XHR is fine in workers)
let glpk = null;

try {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', 'vendor/glpk.wasm', false);
  xhr.responseType = 'arraybuffer';
  xhr.send();
  const wasmBinary = new Uint8Array(xhr.response);

  // 2) Load glpk.js with CommonJS polyfill
  var module = { exports: {} };
  importScripts('vendor/glpk.min.js');
  const glpkFactory = module.exports;

  // 3) Initialize with pre-fetched WASM
  glpk = glpkFactory({ wasmBinary: wasmBinary });

  self.postMessage({ type: 'ready', version: glpk.version });
} catch (e) {
  self.postMessage({ type: 'error', error: 'GLPK init failed: ' + e.message });
}

// ── Solver logic (ported from server.js) ──

function round3(v) { return Math.round(v * 1000) / 1000; }

function txTimeUs(payloadBytes, mbps) {
  return ((payloadBytes + 38) * 8) / mbps;
}

function isTsn(priority, deadlineUs) {
  return priority >= 6 || deadlineUs !== null;
}

function gateMask(priority) {
  const bits = Array(8).fill('0');
  bits[7 - Math.max(0, Math.min(7, priority))] = '1';
  return bits.join('');
}

function generateKPaths(adjacency, src, dst, k, maxDepth) {
  const found = [];
  function dfs(node, depth, visited, path) {
    if (found.length >= 2000 || depth > maxDepth) return;
    if (node === dst) { found.push(path.slice()); return; }
    for (const e of (adjacency.get(node) || [])) {
      if (visited.has(e.to)) continue;
      visited.add(e.to);
      path.push(e.link_id);
      dfs(e.to, depth + 1, visited, path);
      path.pop();
      visited.delete(e.to);
    }
  }
  dfs(src, 0, new Set([src]), []);
  found.sort((a, b) => a.length !== b.length ? a.length - b.length : a.join('|').localeCompare(b.join('|')));
  const unique = [], seen = new Set();
  for (const p of found) {
    const key = p.join('>');
    if (!seen.has(key)) { seen.add(key); unique.push(p); }
    if (unique.length >= k) break;
  }
  return unique;
}

function normalizeFlowPaths(flow, adjacency, model) {
  if (Array.isArray(flow.candidate_paths) && flow.candidate_paths.length > 0) return flow.candidate_paths;
  if (Array.isArray(flow.path) && flow.path.length > 0) return [flow.path];
  if (flow.src && flow.dst) {
    const k = Math.max(1, Number(flow.k_paths || model.k_paths || 2));
    const maxDepth = Math.max(1, Number(flow.max_path_hops || model.max_path_hops || model.nodes.length + 2));
    const paths = generateKPaths(adjacency, flow.src, flow.dst, k, maxDepth);
    if (paths.length === 0) throw new Error('flow ' + flow.id + ': no route from ' + flow.src + ' to ' + flow.dst);
    return paths;
  }
  throw new Error('flow ' + flow.id + ': set candidate_paths/path OR src+dst');
}

function expandPackets(model) {
  const linkMap = new Map(model.links.map(l => [l.id, l]));
  const adjacency = new Map();
  for (const l of model.links) {
    if (!adjacency.has(l.from)) adjacency.set(l.from, []);
    adjacency.get(l.from).push({ to: l.to, link_id: l.id });
  }
  const packets = [];
  for (const flow of model.flows) {
    if (!flow.period_us || flow.period_us <= 0) throw new Error('flow ' + flow.id + ': period_us must be > 0');
    const candidatePaths = normalizeFlowPaths(flow, adjacency, model);
    for (const p of candidatePaths) {
      for (const lid of p) {
        if (!linkMap.has(lid)) throw new Error('flow ' + flow.id + ': unknown link ' + lid);
      }
    }
    const repeatsRaw = model.cycle_time_us / flow.period_us;
    const repeats = Math.round(repeatsRaw);
    if (Math.abs(repeatsRaw - repeats) > 1e-9) throw new Error('flow ' + flow.id + ': cycle_time_us must be divisible by period_us');

    for (let k = 0; k < repeats; k++) {
      const release = k * flow.period_us;
      const routes = candidatePaths.map((pathLinks, rIdx) => ({
        route_idx: rIdx,
        hops: pathLinks.map(lid => {
          const link = linkMap.get(lid);
          return { link_id: lid, tx_us: txTimeUs(flow.payload_bytes, link.rate_mbps), prop_delay_us: link.prop_delay_us };
        })
      }));
      packets.push({
        packet_id: flow.id + '#' + k, flow_id: flow.id, priority: flow.priority,
        traffic_type: flow.traffic_type, release_us: release,
        deadline_abs_us: flow.deadline_us == null ? null : release + flow.deadline_us,
        tsn: isTsn(flow.priority, flow.deadline_us), routes
      });
    }
  }
  return packets;
}

function buildAndSolveIlp(model, packets) {
  if (!glpk) throw new Error('GLPK not initialized');

  const varsSeen = new Set(), subjectTo = [], binaries = [], objectiveVars = [];
  let cIdx = 0;
  const M = model.cycle_time_us + model.guard_band_us + model.processing_delay_us + 100;
  const zVar = (p, r) => 'z_' + p + '_' + r;
  const sVar = (p, r, h) => 's_' + p + '_' + r + '_' + h;
  const yVar = (lid, a, b) => 'y_' + lid.replace(/[^a-zA-Z0-9]/g, '_') + '_' + a + '_' + b;
  const addVar = n => { varsSeen.add(n); return n; };
  const addC = (pre, terms, bnd) => { subjectTo.push({ name: pre + '_' + (cIdx++), vars: terms, bnds: bnd }); };
  const opList = [];

  for (let p = 0; p < packets.length; p++) {
    const pkt = packets[p], zTerms = [];
    for (let r = 0; r < pkt.routes.length; r++) {
      const route = pkt.routes[r], z = addVar(zVar(p, r));
      binaries.push(z);
      zTerms.push({ name: z, coef: 1 });
      for (let h = 0; h < route.hops.length; h++) {
        const hop = route.hops[h], s = addVar(sVar(p, r, h));
        addC('lb', [{ name: s, coef: 1 }, { name: z, coef: -M }], { type: glpk.GLP_LO, lb: pkt.release_us - M, ub: 0 });
        addC('ub', [{ name: s, coef: 1 }, { name: z, coef: M }], { type: glpk.GLP_UP, lb: 0, ub: model.cycle_time_us - hop.tx_us + M });
        if (h < route.hops.length - 1) {
          const sN = addVar(sVar(p, r, h + 1));
          const shift = hop.tx_us + hop.prop_delay_us + model.processing_delay_us;
          addC('ch', [{ name: sN, coef: 1 }, { name: s, coef: -1 }, { name: z, coef: -M }], { type: glpk.GLP_LO, lb: shift - M, ub: 0 });
        }
        opList.push({
          op_id: opList.length, p, r, h, link_id: hop.link_id,
          s_name: s, z_name: z, tx_us: hop.tx_us,
          block_us: hop.tx_us + (pkt.tsn ? model.guard_band_us : 0)
        });
      }
      const last = route.hops.length - 1;
      const sL = addVar(sVar(p, r, last)), lH = route.hops[last];
      if (pkt.deadline_abs_us != null) {
        addC('dl', [{ name: sL, coef: 1 }, { name: z, coef: M }], { type: glpk.GLP_UP, lb: 0, ub: pkt.deadline_abs_us - lH.tx_us - lH.prop_delay_us + M });
      }
      if (pkt.tsn) {
        objectiveVars.push({ name: sL, coef: 1 });
        objectiveVars.push({ name: z, coef: lH.tx_us + lH.prop_delay_us });
      }
    }
    addC('sel', zTerms, { type: glpk.GLP_FX, lb: 1, ub: 1 });
  }

  for (const link of model.links) {
    const ops = opList.filter(o => o.link_id === link.id);
    for (let a = 0; a < ops.length; a++) {
      for (let b = a + 1; b < ops.length; b++) {
        const oa = ops[a], ob = ops[b];
        if (oa.p === ob.p && oa.r === ob.r) continue;
        const y = addVar(yVar(link.id, oa.op_id, ob.op_id));
        binaries.push(y);
        addC('na', [
          { name: ob.s_name, coef: 1 }, { name: oa.s_name, coef: -1 },
          { name: y, coef: -M }, { name: oa.z_name, coef: -M }, { name: ob.z_name, coef: -M }
        ], { type: glpk.GLP_LO, lb: oa.block_us - 3 * M, ub: 0 });
        addC('nb', [
          { name: oa.s_name, coef: 1 }, { name: ob.s_name, coef: -1 },
          { name: y, coef: M }, { name: oa.z_name, coef: -M }, { name: ob.z_name, coef: -M }
        ], { type: glpk.GLP_LO, lb: ob.block_us - 2 * M, ub: 0 });
      }
    }
  }

  const lp = {
    name: 'tsn_ilp',
    objective: {
      direction: glpk.GLP_MIN, name: 'obj',
      vars: objectiveVars.length ? objectiveVars : [{ name: addVar('dummy'), coef: 0 }]
    },
    subjectTo, binaries,
    bounds: Array.from(varsSeen).map(n => ({ name: n, type: glpk.GLP_LO, lb: 0, ub: 0 }))
  };

  const solved = glpk.solve(lp, { msglev: glpk.GLP_MSG_OFF, presol: 1 });
  if (!solved || !solved.result) throw new Error('ILP solve failed');
  if (![glpk.GLP_OPT, glpk.GLP_FEAS].includes(solved.result.status)) {
    throw new Error('ILP infeasible (status=' + solved.result.status + ')');
  }

  return {
    vars: solved.result.vars || {},
    meta: { constraints: subjectTo.length, variables: varsSeen.size, binaries: binaries.length, status: solved.result.status },
    zVar, sVar
  };
}

function buildResult(model, packets, ilpRes) {
  const linkRows = Object.fromEntries(model.links.map(l => [l.id, []]));
  const packetRows = [];

  for (let p = 0; p < packets.length; p++) {
    const pkt = packets[p];
    let selR = 0, bestZ = -1;
    for (let r = 0; r < pkt.routes.length; r++) {
      const zv = Number(ilpRes.vars[ilpRes.zVar(p, r)] || 0);
      if (zv > bestZ) { bestZ = zv; selR = r; }
    }
    const route = pkt.routes[selR], hops = [];
    for (let h = 0; h < route.hops.length; h++) {
      const hop = route.hops[h];
      const s = Number(ilpRes.vars[ilpRes.sVar(p, selR, h)] || 0);
      const e = s + hop.tx_us;
      hops.push({ link_id: hop.link_id, start_us: round3(s), end_us: round3(e), duration_us: round3(hop.tx_us) });
      linkRows[hop.link_id].push({ type: 'flow', note: pkt.packet_id, priority: pkt.priority, start_us: round3(s), end_us: round3(e), duration_us: round3(hop.tx_us) });
      if (pkt.tsn) {
        linkRows[hop.link_id].push({ type: 'guard', note: 'guard band', priority: pkt.priority, start_us: round3(e), end_us: round3(e + model.guard_band_us), duration_us: round3(model.guard_band_us) });
      }
    }
    const lH = route.hops[route.hops.length - 1];
    const finish = hops[hops.length - 1].end_us + lH.prop_delay_us;
    const e2e = round3(finish - pkt.release_us);
    const ok = pkt.deadline_abs_us == null || finish <= pkt.deadline_abs_us + 1e-6;
    packetRows.push({
      packet_id: pkt.packet_id, flow_id: pkt.flow_id, priority: pkt.priority,
      selected_route: selR, release_us: round3(pkt.release_us), end_us: round3(finish),
      e2e_delay_us: e2e,
      deadline_abs_us: pkt.deadline_abs_us == null ? null : round3(pkt.deadline_abs_us),
      slack_us: pkt.deadline_abs_us == null ? null : round3(pkt.deadline_abs_us - finish),
      status: pkt.deadline_abs_us == null ? 'BE' : (ok ? 'OK' : 'MISS'),
      hops
    });
  }

  packetRows.sort((a, b) => a.end_us - b.end_us);

  const gcl = { cycle_time_us: model.cycle_time_us, base_time_us: 0, links: {} };
  for (const link of model.links) {
    const rows = linkRows[link.id].slice().sort((a, b) => a.start_us - b.start_us);
    const entries = [];
    let cursor = 0, idx = 0;
    for (const r of rows) {
      if (r.start_us > cursor) {
        entries.push({ index: idx++, gate_mask: '00001111', start_us: round3(cursor), end_us: round3(r.start_us), duration_us: round3(r.start_us - cursor), note: 'best-effort gap' });
      }
      entries.push({ index: idx++, gate_mask: r.type === 'guard' ? '00000000' : gateMask(r.priority), start_us: r.start_us, end_us: r.end_us, duration_us: r.duration_us, note: r.note });
      cursor = Math.max(cursor, r.end_us);
    }
    if (cursor < model.cycle_time_us) {
      entries.push({ index: idx++, gate_mask: '00001111', start_us: round3(cursor), end_us: round3(model.cycle_time_us), duration_us: round3(model.cycle_time_us - cursor), note: 'best-effort remainder' });
    }
    gcl.links[link.id] = { from: link.from, to: link.to, entries };
  }

  let worstUtil = 0;
  for (const link of model.links) {
    let active = 0;
    for (const e of gcl.links[link.id].entries) {
      if (!e.note.includes('best-effort')) active += e.duration_us;
    }
    worstUtil = Math.max(worstUtil, (active / model.cycle_time_us) * 100);
  }

  const objective = round3(packetRows.filter(p => p.status !== 'BE').reduce((a, p) => a + p.e2e_delay_us, 0));

  return {
    method: 'ILP(GLPK/WASM, Browser)',
    objective, worst_util_percent: round3(worstUtil),
    packetRows, gcl,
    stats: ilpRes.meta
  };
}

// ── Message handler ──

self.onmessage = function(evt) {
  if (evt.data.type !== 'solve') return;
  const { id, model } = evt.data;

  try {
    if (!model || !Array.isArray(model.nodes) || !Array.isArray(model.links) || !Array.isArray(model.flows)) {
      throw new Error('nodes/links/flows are required');
    }
    if (!model.cycle_time_us || model.cycle_time_us <= 0) throw new Error('cycle_time_us must be > 0');
    if (model.processing_delay_us == null) model.processing_delay_us = 2;
    if (model.guard_band_us == null) model.guard_band_us = 2;

    const t0 = performance.now();
    const packets = expandPackets(model);
    if (packets.length > 70) throw new Error('Too many packets in cycle (' + packets.length + '); reduce flows or increase period');

    const ilpRes = buildAndSolveIlp(model, packets);
    const result = buildResult(model, packets, ilpRes);
    result.runtime_ms = Math.round(performance.now() - t0);

    self.postMessage({ type: 'result', id: id, ok: true, result: result });
  } catch (e) {
    self.postMessage({ type: 'result', id: id, ok: false, error: e.message });
  }
};
