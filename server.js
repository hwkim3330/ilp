const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const glpkFactory = require(path.join(ROOT, 'vendor', 'glpk.min.js'));
const wasmBinary = fs.readFileSync(path.join(ROOT, 'vendor', 'glpk.wasm'));
const glpk = glpkFactory(wasmBinary);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
};

function round3(v) {
  return Math.round(v * 1000) / 1000;
}

function txTimeUs(payloadBytes, mbps) {
  return ((payloadBytes + 38) * 8) / mbps;
}

function isTsn(priority, deadlineUs) {
  return priority >= 6 || deadlineUs !== null;
}

function gateMask(priority) {
  const bits = Array(8).fill('0');
  const p = Math.max(0, Math.min(7, priority));
  bits[7 - p] = '1';
  return bits.join('');
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 20 * 1024 * 1024) {
        reject(new Error('payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (_e) {
        reject(new Error('invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function normalizeFlowPaths(flow) {
  if (Array.isArray(flow.candidate_paths) && flow.candidate_paths.length > 0) {
    return flow.candidate_paths;
  }
  if (Array.isArray(flow.path) && flow.path.length > 0) {
    return [flow.path];
  }
  throw new Error(`flow ${flow.id}: path or candidate_paths is required`);
}

function expandPackets(model) {
  const linkMap = new Map(model.links.map((l) => [l.id, l]));
  const packets = [];

  for (const flow of model.flows) {
    if (!flow.period_us || flow.period_us <= 0) {
      throw new Error(`flow ${flow.id}: period_us must be > 0`);
    }

    const candidatePaths = normalizeFlowPaths(flow);
    for (const p of candidatePaths) {
      for (const lid of p) {
        if (!linkMap.has(lid)) {
          throw new Error(`flow ${flow.id}: unknown link ${lid}`);
        }
      }
    }

    const repeatsRaw = model.cycle_time_us / flow.period_us;
    const repeats = Math.round(repeatsRaw);
    if (Math.abs(repeatsRaw - repeats) > 1e-9) {
      throw new Error(`flow ${flow.id}: cycle_time_us must be divisible by period_us`);
    }

    for (let k = 0; k < repeats; k++) {
      const release = k * flow.period_us;
      const routes = candidatePaths.map((pathLinks, rIdx) => {
        const hops = pathLinks.map((lid) => {
          const link = linkMap.get(lid);
          return {
            link_id: lid,
            tx_us: txTimeUs(flow.payload_bytes, link.rate_mbps),
            prop_delay_us: link.prop_delay_us,
          };
        });

        return {
          route_idx: rIdx,
          hops,
        };
      });

      packets.push({
        packet_id: `${flow.id}#${k}`,
        flow_id: flow.id,
        priority: flow.priority,
        traffic_type: flow.traffic_type,
        release_us: release,
        deadline_abs_us: flow.deadline_us == null ? null : release + flow.deadline_us,
        tsn: isTsn(flow.priority, flow.deadline_us),
        routes,
      });
    }
  }

  return packets;
}

function buildAndSolveIlp(model, packets) {
  const varsSeen = new Set();
  const subjectTo = [];
  const binaries = [];
  const objectiveVars = [];
  let cIdx = 0;

  const M = model.cycle_time_us + model.guard_band_us + model.processing_delay_us + 100;

  const zVar = (pIdx, rIdx) => `z_${pIdx}_${rIdx}`;
  const sVar = (pIdx, rIdx, hIdx) => `s_${pIdx}_${rIdx}_${hIdx}`;
  const yVar = (linkId, a, b) => `y_${linkId.replace(/[^a-zA-Z0-9]/g, '_')}_${a}_${b}`;

  const addVar = (name) => {
    varsSeen.add(name);
    return name;
  };

  const addConstraint = (prefix, terms, bnd) => {
    subjectTo.push({ name: `${prefix}_${cIdx++}`, vars: terms, bnds: bnd });
  };

  const operationList = [];

  for (let p = 0; p < packets.length; p++) {
    const packet = packets[p];

    const zTerms = [];
    for (let r = 0; r < packet.routes.length; r++) {
      const route = packet.routes[r];
      const z = addVar(zVar(p, r));
      binaries.push(z);
      zTerms.push({ name: z, coef: 1 });

      for (let h = 0; h < route.hops.length; h++) {
        const hop = route.hops[h];
        const s = addVar(sVar(p, r, h));

        // Active only when route selected: s >= release - M*(1-z)
        addConstraint('lb_release', [
          { name: s, coef: 1 },
          { name: z, coef: -M },
        ], {
          type: glpk.GLP_LO,
          lb: packet.release_us - M,
          ub: 0,
        });

        // s <= cycle-tx + M*(1-z)
        addConstraint('ub_cycle', [
          { name: s, coef: 1 },
          { name: z, coef: M },
        ], {
          type: glpk.GLP_UP,
          lb: 0,
          ub: model.cycle_time_us - hop.tx_us + M,
        });

        if (h < route.hops.length - 1) {
          const sNext = addVar(sVar(p, r, h + 1));
          const shift = hop.tx_us + hop.prop_delay_us + model.processing_delay_us;
          // s_next - s >= shift - M*(1-z)
          addConstraint('chain', [
            { name: sNext, coef: 1 },
            { name: s, coef: -1 },
            { name: z, coef: -M },
          ], {
            type: glpk.GLP_LO,
            lb: shift - M,
            ub: 0,
          });
        }

        operationList.push({
          op_id: operationList.length,
          p,
          r,
          h,
          link_id: hop.link_id,
          s_name: s,
          z_name: z,
          tx_us: hop.tx_us,
          block_us: hop.tx_us + (packet.tsn ? model.guard_band_us : 0),
        });
      }

      const last = route.hops.length - 1;
      const sLast = addVar(sVar(p, r, last));
      const lastHop = route.hops[last];

      if (packet.deadline_abs_us != null) {
        const finishShift = lastHop.tx_us + lastHop.prop_delay_us;
        // s_last <= deadline-finishShift + M*(1-z)
        addConstraint('deadline', [
          { name: sLast, coef: 1 },
          { name: z, coef: M },
        ], {
          type: glpk.GLP_UP,
          lb: 0,
          ub: packet.deadline_abs_us - finishShift + M,
        });
      }

      if (packet.tsn) {
        // arrival approx: s_last + tx_last + prop_last
        objectiveVars.push({ name: sLast, coef: 1 });
        objectiveVars.push({ name: z, coef: lastHop.tx_us + lastHop.prop_delay_us });
      }
    }

    // Exactly one route selected per packet.
    addConstraint('select_route', zTerms, {
      type: glpk.GLP_FX,
      lb: 1,
      ub: 1,
    });
  }

  // No-overlap on each link across all possible operations using that link.
  for (const link of model.links) {
    const ops = operationList.filter((o) => o.link_id === link.id);

    for (let a = 0; a < ops.length; a++) {
      for (let b = a + 1; b < ops.length; b++) {
        const oa = ops[a];
        const ob = ops[b];

        if (oa.p === ob.p && oa.r === ob.r) continue;

        const y = addVar(yVar(link.id, oa.op_id, ob.op_id));
        binaries.push(y);

        // y=1 => a before b.
        // sb - sa >= ba - M*(1-y) - M*(2-za-zb)
        addConstraint('nolap_ab', [
          { name: ob.s_name, coef: 1 },
          { name: oa.s_name, coef: -1 },
          { name: y, coef: -M },
          { name: oa.z_name, coef: -M },
          { name: ob.z_name, coef: -M },
        ], {
          type: glpk.GLP_LO,
          lb: oa.block_us - 3 * M,
          ub: 0,
        });

        // y=0 => b before a.
        // sa - sb >= bb - M*y - M*(2-za-zb)
        addConstraint('nolap_ba', [
          { name: oa.s_name, coef: 1 },
          { name: ob.s_name, coef: -1 },
          { name: y, coef: M },
          { name: oa.z_name, coef: -M },
          { name: ob.z_name, coef: -M },
        ], {
          type: glpk.GLP_LO,
          lb: ob.block_us - 2 * M,
          ub: 0,
        });
      }
    }
  }

  const lp = {
    name: 'tsn_triangle_path_ilp',
    objective: {
      direction: glpk.GLP_MIN,
      name: 'obj',
      vars: objectiveVars.length ? objectiveVars : [{ name: addVar('dummy_obj'), coef: 0 }],
    },
    subjectTo,
    binaries,
    bounds: Array.from(varsSeen).map((name) => ({
      name,
      type: glpk.GLP_LO,
      lb: 0,
      ub: 0,
    })),
  };

  const solved = glpk.solve(lp, { msglev: glpk.GLP_MSG_OFF, presol: 1 });
  if (!solved || !solved.result) {
    throw new Error('ILP solve failed');
  }
  if (![glpk.GLP_OPT, glpk.GLP_FEAS].includes(solved.result.status)) {
    throw new Error(`ILP infeasible/status=${solved.result.status}`);
  }

  return {
    vars: solved.result.vars || {},
    meta: {
      constraints: subjectTo.length,
      variables: varsSeen.size,
      binaries: binaries.length,
      status: solved.result.status,
    },
    zVar,
    sVar,
  };
}

function buildResult(model, packets, ilpRes) {
  const linkRows = Object.fromEntries(model.links.map((l) => [l.id, []]));
  const packetRows = [];

  for (let p = 0; p < packets.length; p++) {
    const packet = packets[p];

    let selectedR = 0;
    let bestZ = -1;
    for (let r = 0; r < packet.routes.length; r++) {
      const zv = Number(ilpRes.vars[ilpRes.zVar(p, r)] || 0);
      if (zv > bestZ) {
        bestZ = zv;
        selectedR = r;
      }
    }

    const route = packet.routes[selectedR];
    const hops = [];

    for (let h = 0; h < route.hops.length; h++) {
      const hop = route.hops[h];
      const s = Number(ilpRes.vars[ilpRes.sVar(p, selectedR, h)] || 0);
      const e = s + hop.tx_us;

      hops.push({
        link_id: hop.link_id,
        start_us: round3(s),
        end_us: round3(e),
        duration_us: round3(hop.tx_us),
      });

      linkRows[hop.link_id].push({
        type: 'flow',
        note: packet.packet_id,
        priority: packet.priority,
        start_us: round3(s),
        end_us: round3(e),
        duration_us: round3(hop.tx_us),
      });

      if (packet.tsn) {
        linkRows[hop.link_id].push({
          type: 'guard',
          note: 'guard band',
          priority: packet.priority,
          start_us: round3(e),
          end_us: round3(e + model.guard_band_us),
          duration_us: round3(model.guard_band_us),
        });
      }
    }

    const lastHop = route.hops[route.hops.length - 1];
    const finish = hops[hops.length - 1].end_us + lastHop.prop_delay_us;
    const e2e = round3(finish - packet.release_us);
    const ok = packet.deadline_abs_us == null || finish <= packet.deadline_abs_us + 1e-6;

    packetRows.push({
      packet_id: packet.packet_id,
      flow_id: packet.flow_id,
      priority: packet.priority,
      selected_route: selectedR,
      release_us: round3(packet.release_us),
      end_us: round3(finish),
      e2e_delay_us: e2e,
      deadline_abs_us: packet.deadline_abs_us == null ? null : round3(packet.deadline_abs_us),
      slack_us: packet.deadline_abs_us == null ? null : round3(packet.deadline_abs_us - finish),
      status: packet.deadline_abs_us == null ? 'BE' : (ok ? 'OK' : 'MISS'),
      hops,
    });
  }

  packetRows.sort((a, b) => a.end_us - b.end_us);

  const gcl = {
    cycle_time_us: model.cycle_time_us,
    base_time_us: 0,
    links: {},
  };

  for (const link of model.links) {
    const rows = linkRows[link.id].slice().sort((a, b) => a.start_us - b.start_us);
    const entries = [];
    let cursor = 0;
    let idx = 0;

    for (const r of rows) {
      if (r.start_us > cursor) {
        entries.push({
          index: idx++,
          gate_mask: '00001111',
          start_us: round3(cursor),
          end_us: round3(r.start_us),
          duration_us: round3(r.start_us - cursor),
          note: 'best-effort gap',
        });
      }

      entries.push({
        index: idx++,
        gate_mask: r.type === 'guard' ? '00000000' : gateMask(r.priority),
        start_us: r.start_us,
        end_us: r.end_us,
        duration_us: r.duration_us,
        note: r.note,
      });

      cursor = Math.max(cursor, r.end_us);
    }

    if (cursor < model.cycle_time_us) {
      entries.push({
        index: idx++,
        gate_mask: '00001111',
        start_us: round3(cursor),
        end_us: round3(model.cycle_time_us),
        duration_us: round3(model.cycle_time_us - cursor),
        note: 'best-effort remainder',
      });
    }

    gcl.links[link.id] = {
      from: link.from,
      to: link.to,
      entries,
    };
  }

  let worstUtil = 0;
  for (const link of model.links) {
    let active = 0;
    for (const e of gcl.links[link.id].entries) {
      if (!e.note.includes('best-effort')) active += e.duration_us;
    }
    worstUtil = Math.max(worstUtil, (active / model.cycle_time_us) * 100);
  }

  const objective = round3(
    packetRows
      .filter((p) => p.status !== 'BE')
      .reduce((acc, p) => acc + p.e2e_delay_us, 0)
  );

  return {
    method: 'ILP(GLPK, Node, Route+Schedule)',
    objective,
    worst_util_percent: round3(worstUtil),
    packetRows,
    gcl,
    stats: ilpRes.meta,
  };
}

function solve(model) {
  if (!model || typeof model !== 'object') throw new Error('model is required');
  if (!Array.isArray(model.links) || !Array.isArray(model.flows) || !Array.isArray(model.nodes)) {
    throw new Error('nodes/links/flows are required');
  }
  if (!model.cycle_time_us || model.cycle_time_us <= 0) {
    throw new Error('cycle_time_us must be > 0');
  }
  if (model.processing_delay_us == null || model.processing_delay_us < 0) {
    throw new Error('processing_delay_us must be >= 0');
  }
  if (model.guard_band_us == null || model.guard_band_us < 0) {
    throw new Error('guard_band_us must be >= 0');
  }

  const packets = expandPackets(model);
  if (packets.length > 70) {
    throw new Error(`too many packets in cycle (${packets.length}); reduce flow count/period`);
  }

  const ilpRes = buildAndSolveIlp(model, packets);
  return buildResult(model, packets, ilpRes);
}

function serveFile(reqPath, res) {
  const safePath = path.normalize(reqPath).replace(/^\.+/, '');
  let filePath = path.join(ROOT, safePath);
  if (safePath === '/' || safePath === '') {
    filePath = path.join(ROOT, 'index.html');
  }

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'forbidden' }));
    return;
  }

  fs.readFile(filePath, (err, buf) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'not found' }));
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(buf);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (req.method === 'POST' && url.pathname === '/api/solve') {
    try {
      const model = await parseBody(req);
      const t0 = Date.now();
      const result = solve(model);
      result.runtime_ms = Date.now() - t0;

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, result }));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }

  if (req.method === 'GET' || req.method === 'HEAD') {
    serveFile(url.pathname, res);
    return;
  }

  res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: 'method not allowed' }));
});

const PORT = Number(process.env.PORT || 8080);
server.listen(PORT, () => {
  console.log(`TSN ILP server listening on http://localhost:${PORT}`);
});
