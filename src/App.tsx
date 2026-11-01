import { useEffect, useMemo, useState } from 'react';
import { BreakLab, Lens, type Grid } from './lab';
import { FluviMap, Swipe, prefetchOfflinePack } from './map';
import { AskField, FieldInbox } from './field';
import { StageLadder, PhysicsTwin, DecisionBrief, Exports, type Audience } from './panels';

type Label = 'MEASURED' | 'DERIVED' | 'CROSSCHECKED' | 'UNVERIFIED' | 'SIMULATED';
interface Product { granule: string; date: string; polMode: string; channelsPresent: string[]; bandwidthMHz: number; orbitAccuracy: string }
interface Patch { id: string; title: string; question: string; centroid: number[]; robustPx: number; fringePx: number; robustAreaHa: number; totalAreaHa: number; pair: string[]; calibrated: { hhDbA: number; hhDbB: number; hvDbA: number; hvDbB: number; dDbHH: number; dDbHV: number }; crosscheck: { reading: string; s1: { dateA: string; dateB: string }; s2: { ndwiWaterFracJul: number; ndwiWaterFracOct: number } }; label: string; core: number[][]; fringe: number[][]; ghost: number[][]; exposure: { worldPopCore: number; worldPopCorePlusFringe: number; osmBuildingsWithin1km: number } }
interface Manifest { config: { dischargeToleranceM3s: number; toleranceNote: string }; qaFlags: string[]; caseSlug: string; collection: string; doi: string; crid: string; maturity: string; variable: string; analysisGridM: number; haPerPixel: number; manifestHash: string; products: Product[]; pair: string[]; drivers: { dischargeM3sByDate: Record<string, number>; dischargeSource: string; stage: { status: string; source: string } }; sensorRace: { sentinel2: { acquisitions: number; clearUnder20PctTile: number; note: string }; sentinel1RTC: { dates: string[]; band: string }; nisar: { dates: string[]; seen: number } }; claims: { id: string; text: string; label: Label; status: string }[]; gap: { label: string; note: string }; processing: { ensemble: string } }

const ACTS = [
  { n: 'I', name: 'Atlas' }, { n: 'II', name: 'Memory' }, { n: 'III', name: 'Reality' },
  { n: 'IV', name: 'Break' }, { n: 'V', name: 'Passport' }, { n: 'VI', name: 'Impact' },
];

function Stamp({ label }: { label: string }) {
  return <span className={`stamp stamp-${label.toLowerCase()}`}>{label}</span>;
}

function project(patches: Patch[]) {
  const pts = patches.flatMap(p => [...p.core, ...p.fringe]);
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const pad = 0.004;
  return (pt: number[]) => [
    ((pt[0] - x0 + pad) / (x1 - x0 + 2 * pad)) * 760,
    (1 - (pt[1] - y0 + pad) / (y1 - y0 + 2 * pad)) * 430,
  ] as const;
}
const poly = (pts: number[][], proj: (p: number[]) => readonly [number, number]) =>
  pts.map(p => proj(p).join(',')).join(' ');

export default function App() {
  const [man, setMan] = useState<Manifest | null>(null);
  const [grids, setGrids] = useState<{ deltaGrid: Grid; walkGrid: Grid } | null>(null);
  const [scenes, setScenes] = useState<Record<string, string> | null>(null);
  const [stageView, setStageView] = useState<'map' | 'svg' | 'swipe'>('map');
  const [packMsg, setPackMsg] = useState('');
  const [audience, setAudience] = useState<Audience>('analyst');
  const [patches, setPatches] = useState<Patch[]>([]);
  const [act, setAct] = useState(1); // II Memory default
  const [sel, setSel] = useState<Patch | null>(null);
  const [methods, setMethods] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    fetch('/case/jamuna-chilmari/manifest.json').then(r => r.json()).then(setMan);
    fetch('/case/jamuna-chilmari/scenes.json').then(r => r.json()).then(setScenes);
    fetch('/case/jamuna-chilmari/grids.json').then(r => r.json()).then(setGrids);
    fetch('/case/jamuna-chilmari/case.json').then(r => r.json()).then(d => { setPatches(d.patches); setSel(d.patches[0]); });
    const f = () => setOnline(navigator.onLine);
    window.addEventListener('online', f); window.addEventListener('offline', f);
    const key = (e: KeyboardEvent) => { const i = parseInt(e.key); if (i >= 1 && i <= 6) setAct(i - 1); };
    window.addEventListener('keydown', key);
    return () => { window.removeEventListener('online', f); window.removeEventListener('offline', f); window.removeEventListener('keydown', key); };
  }, []);

  const proj = useMemo(() => project(patches), [patches]);
  useEffect(() => { if (sel) history.replaceState(null, '', `#${sel.id}`); }, [sel]);
  if (!man) return <div className="loading">Loading case pack…</div>;
  const dis = man.drivers.dischargeM3sByDate;

  return (
    <div className="app">
      <header className="topbar">
        <div className="wordmark">FluviSAR</div>
        <div className="slug">{man.caseSlug}</div>
        <div className="topright">
          <span className="chip">NISAR L2 GCOV · {man.maturity} · CRID {man.crid}</span>
          <span className="chip">{online ? 'Online' : 'Offline pack'}</span>
          <button className="chip btn" onClick={async () => { setPackMsg('caching…'); setPackMsg(await prefetchOfflinePack()); }}>Offline pack{packMsg ? ` · ${packMsg}` : ''}</button>
          <select value={audience} onChange={e => setAudience(e.target.value as Audience)} className="chip btn" aria-label="Audience lens">
            <option value="analyst">Analyst</option><option value="decision">Decision-maker</option><option value="public">Public</option>
          </select>
          <button className="chip btn" onClick={() => setMethods(true)}>Methods &amp; Limits</button>
        </div>
      </header>

      <nav className="rail">
        {ACTS.map((a, i) => (
          <button key={a.n} className={i === act ? 'act active' : 'act'} onClick={() => setAct(i)}>
            <span className="roman">{a.n}</span><span className="actname">{a.name}</span>
          </button>
        ))}
      </nav>

      <aside className="dossier">
        {act === 0 && <>
          <h1>Act I · Atlas</h1>
          <p className="lede">One full analysis. The flagship case is the Jamuna at Chilmari — the only case this observatory opens.</p>
          <div className="row"><span>Jamuna · Chilmari reach</span><Stamp label="DERIVED" /></div>
          <p>Full Atlas pins (derived examples, contextual cases, planned applications) arrive in the P1 slice. Planned pins never open an analysis.</p>
        </>}
        {act === 1 && <>
          <h1>Act II · Memory</h1>
          <p className="lede">The river, date by date — only on dates the satellite really looked.</p>
          <p>Calibrated pair {man.pair[0]} → {man.pair[1]}. Three emergence candidates in the western channel belt. Select a patch on the map.</p>
          <h2>Claim Ledger</h2>
          {man.claims.map(c => <div className="claim" key={c.id}><p>{c.text}</p><Stamp label={c.label} /><span className="status">{c.status}</span></div>)}
          <StageLadder man={man} />
        </>}
        {act === 2 && <>
          <h1>Act III · Reality</h1>
          {sel && <>
            <p className="lede">{sel.question}</p>
            <div className="row"><span>γ⁰ HH {sel.pair[0]}</span><b>{sel.calibrated.hhDbA} dB</b><Stamp label="MEASURED" /></div>
            <div className="row"><span>γ⁰ HH {sel.pair[1]}</span><b>{sel.calibrated.hhDbB} dB</b><Stamp label="MEASURED" /></div>
            <div className="row"><span>Δ γ⁰ HH</span><b>+{sel.calibrated.dDbHH} dB</b><Stamp label="DERIVED" /></div>
            <div className="row"><span>Δ γ⁰ HV</span><b>+{sel.calibrated.dDbHV} dB</b><Stamp label="DERIVED" /></div>
            <p>{sel.crosscheck.reading}</p>
            <div className="row"><span>Independent crosscheck</span><Stamp label="CROSSCHECKED" /></div>
            <p className="note">Low backscatter is consistent with, but not proof of, open water. Calm open water is dark because it is smooth and reflects the beam away.</p>
          </>}
          <h2>Sensor Race</h2>
          <div className="row"><span>Sentinel-2 optical — clear view</span><b>{man.sensorRace.sentinel2.clearUnder20PctTile} of {man.sensorRace.sentinel2.acquisitions} dates</b><Stamp label="DERIVED" /></div>
          <div className="row"><span>Sentinel-1 C-band radar</span><b>{man.sensorRace.sentinel1RTC.dates.length} dates</b><Stamp label="MEASURED" /></div>
          <div className="row"><span>NISAR L-band radar</span><b>{man.sensorRace.nisar.seen} of {man.sensorRace.nisar.dates.length} dates</b><Stamp label="MEASURED" /></div>
          <p className="note">{man.sensorRace.sentinel2.note}</p>
          {grids && <Lens grid={grids.walkGrid} />}
          {sel && <PhysicsTwin patch={sel} man={man} />}
        </>}
        {act === 3 && <>
          <h1>Act IV · Break</h1>
          <p className="lede">Try to break the finding. What survives every tested setting is the Robust Core.</p>
          <p>{man.processing.ensemble}</p>
          {patches.map(p => <div className="claim" key={p.id}>
            <p>{p.id} — robust core {p.robustAreaHa} ha of {p.totalAreaHa} ha candidate</p>
            <div className="bar"><div className="core" style={{ width: `${(p.robustAreaHa / p.totalAreaHa) * 100}%` }} /></div>
            <Stamp label="DERIVED" /><span className="status">share of tested settings in agreement is a robustness measure, not a probability of being correct</span>
          </div>)}
          {grids && <BreakLab grid={grids.deltaGrid} qaFlags={man.qaFlags} />}
          <p className="note">Stage test: BWDB/FFWC gauge {man.drivers.stage.status.toLowerCase()} — pair admission runs on the GloFAS discharge proxy ({dis[man.pair[0]]} → {dis[man.pair[1]]} m³/s), stamped DERIVED. Live threshold recompute arrives with the raster slice; nothing here is canned — these areas are the offline ensemble's.</p>
        </>}
        {act === 4 && <>
          <h1>Act V · Passport</h1>
          {sel && <>
            <div className="row"><span>Source</span><b>{man.collection}</b><Stamp label="MEASURED" /></div>
            <div className="row"><span>Collection DOI</span><b>{man.doi}</b></div>
            <div className="row"><span>Maturity · CRID</span><b>{man.maturity} · {man.crid}</b></div>
            <div className="row"><span>Variable</span><b>{man.variable}</b></div>
            <button className="row asbtn" onClick={() => setStageView('svg')} title="Show these pixels on the plate"><span>Area formula — click to see the pixels</span><b>{sel.robustPx} px × {man.haPerPixel} ha = {sel.robustAreaHa} ha</b><Stamp label="DERIVED" /></button>
            <div className="row"><span>Grid</span><b>{man.analysisGridM} m analysis grid</b></div>
            <div className="row"><span>Field record</span><b>none yet — evidence returns as awaiting review</b><Stamp label="UNVERIFIED" /></div>
            {sel && <AskField patchId={sel.id} question={sel.question} hashShort={man.manifestHash.replace('sha256:', '').slice(0, 8)} />}
            {sel && <FieldInbox patchId={sel.id} />}
            {sel && <Exports patch={sel} man={man} />}
            <p className="mono">manifest {man.manifestHash.slice(0, 23)}…</p>
            <p className="note">Granules: {man.products.filter(p => man.pair.includes(p.date)).map(p => p.granule).join(' · ')}</p>
          </>}
        </>}
        {act === 5 && <>
          <h1>Act VI · Impact</h1>
          {sel && <DecisionBrief patch={sel} man={man} audience={audience} />}
          <p className="lede">Exposure, not damage.</p>
          {patches.map(p => <div className="claim" key={p.id}>
            <p>{p.id} — people in robust core (WorldPop): {p.exposure.worldPopCore}; buildings within 1 km (OSM): {p.exposure.osmBuildingsWithin1km}</p>
            <span className="stamp stamp-estimated">ESTIMATED</span><span className="status">population is an estimate from a grid, not a count of affected people · exposure, not damage</span>
            <p className="note">Road length / cropland in footprint: UNAVAILABLE — no road or land-cover intersection layer in the case pack.</p>
          </div>)}
        </>}
      </aside>

      <main className="stage">
        <div className="stagebar">
          <button className={stageView === 'map' ? 'chip btn on' : 'chip btn'} onClick={() => setStageView('map')}>Map</button>
          <button className={stageView === 'swipe' ? 'chip btn on' : 'chip btn'} onClick={() => setStageView('swipe')}>Swipe A↔B</button>
          <button className={stageView === 'svg' ? 'chip btn on' : 'chip btn'} onClick={() => setStageView('svg')}>Plate</button>
        </div>
        {stageView === 'map' && <FluviMap patches={patches} selId={sel?.id} onSelect={id => { const p = patches.find(q => q.id === id); if (p) setSel(p); }} onFallback={() => setStageView('svg')} />}
        {stageView === 'swipe' && (scenes ? <Swipe scenes={scenes} pair={man.pair} /> : <p className="note pad">Loading pair scenes…</p>)}
        {stageView === 'svg' && (
        <svg viewBox="0 0 760 430" className="map" role="img" aria-label="Patch map: robust core solid, contested fringe hatched, July water ghost dotted">
          <defs>
            <pattern id="hatch" width="7" height="7" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
              <rect width="7" height="7" fill="rgba(255,106,61,0.12)" /><line x1="0" y1="0" x2="0" y2="7" stroke="#FF6A3D" strokeWidth="1.4" />
            </pattern>
          </defs>
          {patches.map(p => (
            <g key={p.id} onClick={() => setSel(p)} className={sel?.id === p.id ? 'patch sel' : 'patch'}>
              {p.ghost.length > 2 && <polygon points={poly(p.ghost, proj)} fill="none" stroke="#2FD0D4" strokeDasharray="2 4" strokeWidth="1.2" />}
              <polygon points={poly(p.fringe, proj)} fill="url(#hatch)" stroke="#FF6A3D" strokeWidth="1" />
              <polygon points={poly(p.core, proj)} fill="#FF6A3D" fillOpacity="0.85" stroke="#FF6A3D" />
              <text x={proj(p.centroid)[0]} y={proj(p.centroid)[1]} className="plabel">{p.id}</text>
            </g>
          ))}
        </svg>)}
        <div className="legend">
          <span><i className="sw solid" /> Robust Core</span>
          <span><i className="sw hatch" /> Contested Fringe</span>
          <span><i className="sw ghost" /> July γ⁰ HH &lt; −20 dB outline</span>
          {sel && <span className="selinfo">{sel.id} · {sel.robustAreaHa} ha robust · {sel.totalAreaHa} ha candidate <Stamp label={sel.label} /></span>}
        </div>
      </main>

      <footer className="score">
        <div className="scoretitle">THE SCORE · 12-day cycles · notes exist only for real acquisitions</div>
        <div className="notes">
          {man.products.map(p => (
            <button key={p.date} className={man.pair.includes(p.date) ? 'note pair' : 'note'} title={`${p.granule} · discharge ${dis[p.date]} m³/s`}>
              <span className="dot" /><span className="ndate">{p.date.slice(5)}</span>
            </button>
          ))}
          <div className="silence" title={man.gap.note}>{man.gap.label} · cycle 027 · no granule</div>
        </div>
        <div className="drivers">GloFAS discharge at pair: {dis[man.pair[0]]} → {dis[man.pair[1]]} m³/s <Stamp label="DERIVED" /> <span className="note">stage gauge: {man.drivers.stage.status}</span></div>
      </footer>

      {methods && <div className="modal" onClick={() => setMethods(false)}>
        <div className="paper" onClick={e => e.stopPropagation()}>
          <h1>Methods &amp; Limitations</h1>
          <p><b>Core principle:</b> A satellite signal begins an investigation; it does not establish a verified event.</p>
          <p>Data: {man.collection}, CRID {man.crid}, {man.maturity} — calibrated and partly validated, not final; validated reprocessing will supersede it.</p>
          <p>Variable: {man.variable}. Robustness = share of tested settings in agreement — not a probability of being correct; a sensitivity range is not a statistical confidence interval.</p>
          <p>We do not claim: permanent erosion, forecasts, damage, or people affected. Field evidence is awaiting review, never automatic proof.</p>
          <button className="chip btn" onClick={() => setMethods(false)}>Close</button>
        </div>
      </div>}
    </div>
  );
}
