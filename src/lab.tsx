import { useEffect, useMemo, useRef, useState } from 'react';

export interface Grid { unit: string; values: (number | null)[][]; pair?: string[]; date?: string; layer?: string; note?: string }

function useCanvas(draw: (g: CanvasRenderingContext2D, s: number, N: number) => void, deps: unknown[], size = 320) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const g = cv.getContext('2d')!; draw(g, cv.width / 64, 64);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return <canvas ref={ref} width={size} height={size} className="labcanvas" />;
}

/** F9 Break My Finding — live recompute over the real calibrated delta grid.
 *  Counts are exact block counts on the 64x64 block grid (DECISIONS D11: no hectares here). */
function medianFilter(vals: (number|null)[][], w: number): (number|null)[][] {
  if (w === 0) return vals;
  const r = Math.floor(w / 2), out: (number|null)[][] = [];
  for (let y = 0; y < 64; y++) { out.push([]); for (let x = 0; x < 64; x++) {
    const v = vals[y][x]; if (v === null) { out[y].push(null); continue; }
    const win: number[] = [];
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const q = vals[y+dy]?.[x+dx]; if (q !== null && q !== undefined) win.push(q); }
    win.sort((a,b) => a-b); out[y].push(win[Math.floor(win.length/2)]);
  } }
  return out;
}
function applyMMU(mask: boolean[][], mmu: number): { kept: boolean[][]; blocks: number } {
  const seen = Array.from({length:64}, () => new Array(64).fill(false));
  const kept = Array.from({length:64}, () => new Array(64).fill(false));
  let blocks = 0;
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    if (!mask[y][x] || seen[y][x]) continue;
    const comp: [number,number][] = []; const stack: [number,number][] = [[y,x]]; seen[y][x] = true;
    while (stack.length) { const [cy,cx] = stack.pop()!; comp.push([cy,cx]);
      for (const [dy,dx] of [[1,0],[-1,0],[0,1],[0,-1]]) { const ny = cy+dy, nx = cx+dx;
        if (ny>=0 && ny<64 && nx>=0 && nx<64 && mask[ny][nx] && !seen[ny][nx]) { seen[ny][nx] = true; stack.push([ny,nx]); } } }
    if (comp.length >= mmu) { comp.forEach(([cy,cx]) => { kept[cy][cx] = true; }); blocks += comp.length; }
  }
  return { kept, blocks };
}

export function BreakLab({ grid, qaFlags }: { grid: Grid; qaFlags?: string[] }) {
  const [thr, setThr] = useState(4.5);
  const [mode, setMode] = useState<'slider' | 'ensemble'>('slider');
  const [filt, setFilt] = useState(0);
  const [mmu, setMmu] = useState(0);
  const fvals = useMemo(() => medianFilter(grid.values, filt), [grid, filt]);
  const live = useMemo(() => {
    const mask = fvals.map(row => row.map(v => v !== null && v > thr));
    const { kept, blocks } = applyMMU(mask, mmu);
    return { kept, blocks };
  }, [fvals, thr, mmu]);
  const stable = useMemo(() => { let n = 0; for (const row of grid.values) for (const v of row) if (v !== null && Math.abs(v) < 3) n++; return n; }, [grid]);
  const vals = grid.values;
  const stats = useMemo(() => {
    let up = 0, down = 0, total = 0;
    for (const row of vals) for (const v of row) { if (v === null) continue; total++; if (v > thr) up++; if (v < -thr) down++; }
    return { up, down, total };
  }, [thr, vals]);
  const ens = useMemo(() => {
    const T = [3, 4.5, 6]; let all = 0, some = 0;
    for (const row of vals) for (const v of row) { if (v === null) continue; const k = T.filter(t => v > t).length; if (k === 3) all++; else if (k > 0) some++; }
    return { all, some };
  }, [vals]);
  const canvas = useCanvas((g, s) => {
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const v = vals[y][x];
      if (v === null) { g.fillStyle = '#0B1118'; }
      else if (mode === 'slider') g.fillStyle = live.kept[y][x] ? '#FF6A3D' : v < -thr ? '#2FD0D4' : '#1B2632';
      else { const k = [3, 4.5, 6].filter(t => v > t).length; g.fillStyle = k === 3 ? '#FF6A3D' : k > 0 ? '#7a3b22' : '#1B2632'; }
      g.fillRect(x * s, y * s, s + 1, s + 1);
    }
  }, [thr, mode, vals, live], 352);
  return (
    <div className="lab">
      <h2>Challenge Bench — live on the real Δ grid</h2>
      {canvas}
      <div className="labrow"><span>Mode</span>
        <button className="chip btn" onClick={() => setMode(mode === 'slider' ? 'ensemble' : 'slider')}>{mode === 'slider' ? 'threshold slider' : 'ensemble agreement (3/4.5/6 dB)'}</button>
      </div>
      {mode === 'slider' && <>
        <div className="labrow"><span>Threshold Δ γ⁰ HH</span><b>&gt; {thr.toFixed(1)} dB</b></div>
        <input type="range" min={2} max={9} step={0.5} value={thr} onChange={e => setThr(Number(e.target.value))} className="slider" aria-label="Delta threshold in dB" />
        <p className="labline">Candidate blocks across the tested setting: <b>{stats.up} brightened</b> · {stats.down} darkened · of {stats.total} valid blocks ({(100 * stats.up / stats.total).toFixed(1)}% brightened).</p>
        <div className="labrow"><span>Speckle filter (median, on this grid)</span>
          <select value={filt} onChange={e => setFilt(Number(e.target.value))} aria-label="Median filter window"><option value={0}>none</option><option value={3}>3×3</option><option value={5}>5×5</option></select></div>
        <div className="labrow"><span>Minimum mapping unit (blocks)</span>
          <select value={mmu} onChange={e => setMmu(Number(e.target.value))} aria-label="Minimum mapping unit in blocks"><option value={0}>none</option><option value={5}>5</option><option value={20}>20</option><option value={50}>50</option></select></div>
        <p className="labline">After filter + MMU: <b>{live.blocks} blocks</b> retained on the map. Filter and MMU here operate on the 64×64 block grid; the headline hectares come from the same operations on the native 20 m grid, offline.</p>
      </>}
      <h3>Why NISAR saw nothing here — the null view</h3>
      <p className="labline">{stable} of {stats.total} blocks changed by less than ±3 dB — inside the tested change floor at block level, so no change is claimed there. “No detected change” is not “no change exists”: features smaller than a block, or changes under the floor, cannot be evaluated on this grid. <span className="stamp stamp-derived">DERIVED</span></p>
      <h3>Data quality on this case</h3>
      {(qaFlags ?? []).map((q, i) => <p className="note" key={i}>· {q}</p>)}
      <p className="note">Invalid-pixel share per patch: UNAVAILABLE — not stored in the case pack, shown as missing rather than estimated.</p>
      {mode === 'ensemble' && <p className="labline">Ensemble thresholds 3 / 4.5 / 6 dB on this grid: <b>{ens.all} blocks flagged in all 3</b> (robust at block level) · {ens.some} in some (contested). The headline patch areas in hectares come from the native 20 m ensemble, not this block grid.</p>}
      <p className="note">Share of tested settings in agreement is a robustness measure, not a probability of being correct.</p>
    </div>
  );
}

/** F5 Radar Lens — block-mean γ⁰ readout over the real Oct 13 walk grid. */
export function Lens({ grid }: { grid: Grid }) {
  const [cur, setCur] = useState<{ v: number; x: number; y: number } | null>(null);
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return; const g = cv.getContext('2d')!; const s = cv.width / 64;
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const v = grid.values[y][x];
      const t = v === null ? 0 : Math.max(0, Math.min(1, (v + 25) / 25));
      g.fillStyle = v === null ? '#0B1118' : `rgb(${20 + t * 200},${20 + t * 200},${18 + t * 190})`;
      g.fillRect(x * s, y * s, s + 1, s + 1);
    }
    if (cur) { g.strokeStyle = '#FF6A3D'; g.lineWidth = 2; g.beginPath(); g.arc(cur.x * s + s / 2, cur.y * s + s / 2, 26, 0, Math.PI * 2); g.stroke(); }
  }, [cur, grid]);
  const hist = useMemo(() => {
    const bins = new Array(25).fill(0);
    for (const row of grid.values) for (const v of row) if (v !== null) bins[Math.max(0, Math.min(24, Math.floor(v + 25)))]++;
    return bins;
  }, [grid]);
  const max = Math.max(...hist);
  return (
    <div className="lab">
      <h2>Radar Lens — γ⁰ HH, {grid.date}</h2>
      <canvas ref={ref} width={352} height={352} className="labcanvas"
        onMouseMove={e => { const r = e.currentTarget.getBoundingClientRect(); const x = Math.floor((e.clientX - r.left) / r.width * 64), y = Math.floor((e.clientY - r.top) / r.height * 64); const v = grid.values[y]?.[x]; if (v !== null && v !== undefined) setCur({ v, x, y }); }} />
      <p className="labline">{cur ? <>γ⁰ HH <b>{cur.v.toFixed(1)} dB</b> · block ({cur.x}, {cur.y}) · {grid.date} · block-mean value</> : 'Move over the grid — the lens reads the stored block value, nothing is interpolated.'}</p>
      <div className="hist" aria-hidden>{hist.map((b, i) => <div key={i} className="hbar" style={{ height: `${(b / max) * 100}%`, background: i === 5 ? '#2FD0D4' : '#5c5643' }} title={`${i - 25} dB`} />)}</div>
      <p className="note">Histogram of all block values; teal bar marks −20 dB, the water-like reference used for the July ghost outlines. Units always shown: γ⁰ in dB.</p>
    </div>
  );
}
