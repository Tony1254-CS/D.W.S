import { useMemo, useState } from 'react';

export type StampLabel = string;
export function Stamp({ label }: { label: StampLabel }) {
  return <span className={`stamp stamp-${label.toLowerCase().replace(/[^a-z]/g, '')}`}>{label}</span>;
}

interface Man {
  pair: string[];
  config: { dischargeToleranceM3s: number; toleranceNote: string };
  drivers: { dischargeM3sByDate: Record<string, number>; dischargeSource: string; stage: { status: string } };
  products: { date: string; polMode: string; channelsPresent: string[]; granule: string }[];
  processing: { ensemble: string };
  manifestHash: string; collection: string; crid: string; maturity: string;
}
interface Patch {
  id: string; title: string; question: string; robustAreaHa: number; totalAreaHa: number; robustPx: number;
  calibrated: { hhDbA: number; hhDbB: number; hvDbA: number; hvDbB: number; dDbHH: number; dDbHV: number };
  crosscheck: { reading: string; s1: { dateA: string; dateB: string }; s2: { ndwiWaterFracJul: number; ndwiWaterFracOct: number } };
  exposure: { worldPopCore: number; worldPopCorePlusFringe: number; osmBuildingsWithin1km: number };
}

/** F4 Stage Ladder on the discharge proxy (DERIVED). The gauge is UNAVAILABLE. */
export function StageLadder({ man }: { man: Man }) {
  const dis = man.drivers.dischargeM3sByDate;
  const dates = Object.keys(dis).sort();
  const max = Math.max(...Object.values(dis));
  const [a, setA] = useState(man.pair[0]); const [b, setB] = useState(man.pair[1]);
  const delta = dis[a] - dis[b];
  const comparable = Math.abs(delta) <= man.config.dischargeToleranceM3s;
  return (
    <div className="lab">
      <h2>Stage Ladder — discharge proxy</h2>
      <p className="note">BWDB/FFWC gauge: {man.drivers.stage.status}. Rungs are GloFAS discharge ({man.drivers.dischargeSource}) — a DERIVED proxy, never presented as gauge metres.</p>
      {dates.map(d => (
        <div key={d} className={(d === a || d === b) ? 'rung pair' : 'rung'}>
          <button className="chip btn dark" onClick={() => setA(d)}>A</button>
          <button className="chip btn dark" onClick={() => setB(d)}>B</button>
          <span className="rdate">{d}</span>
          <div className="rbar"><div style={{ width: `${(dis[d] / max) * 100}%` }} /></div>
          <b>{dis[d].toLocaleString()} m³/s</b>
        </div>
      ))}
      <div className="claim">
        <p>Pair {a} → {b}: discharge differed by <b>{Math.abs(delta).toLocaleString()} m³/s</b>. Declared screening tolerance: {man.config.dischargeToleranceM3s.toLocaleString()} m³/s.</p>
        {comparable
          ? <><Stamp label="CROSSCHECKED" /><p>Within tolerance on the proxy — the pair is admitted for comparison, subject to the other quality checks.</p></>
          : <><span className="stamp stamp-refuted">NOT COMPARABLE</span><p>Discharge differed by {Math.abs(delta).toLocaleString()} m³/s between {a} and {b}. A change in water extent between these dates cannot be attributed to bank change. This pair is read as stage-driven surface change only — which is exactly how the flagship case is interpreted.</p></>}
        <p className="note">{man.config.toleranceNote}</p>
      </div>
    </div>
  );
}

/** F7 Physics Twin: four questions, answered from the pack. */
export function PhysicsTwin({ patch, man }: { patch: Patch; man: Man }) {
  const dis = man.drivers.dischargeM3sByDate;
  const pairDelta = Math.abs(dis[man.pair[0]] - dis[man.pair[1]]);
  const alts: string[] = [];
  if (pairDelta > man.config.dischargeToleranceM3s) alts.push(`River-level fall between acquisitions — discharge proxy differed by ${pairDelta.toLocaleString()} m³/s, so extent change is expected without any bank change.`);
  if (patch.crosscheck.s2.ndwiWaterFracJul === 0 && patch.crosscheck.s2.ndwiWaterFracOct === 0) alts.push('The July radar-dark surface may have been smooth wet mud or shallow turbid water, not deep open water — Sentinel-2 NDWI saw no open water on either clear date.');
  alts.push('Vegetation growth or drying roughening the surface — consistent with the HV rise, not separable from emergence on this pair alone.');
  return (
    <div className="lab">
      <h2>Physics Twin — {patch.id}</h2>
      <h3>1 · What changed in the signal?</h3>
      <p>γ⁰ HH {patch.calibrated.hhDbA} → {patch.calibrated.hhDbB} dB (+{patch.calibrated.dDbHH} dB); γ⁰ HV {patch.calibrated.hvDbA} → {patch.calibrated.hvDbB} dB (+{patch.calibrated.dDbHV} dB), {man.pair[0]} → {man.pair[1]}. <Stamp label="MEASURED" /></p>
      <h3>2 · What is it consistent with?</h3>
      <p>A surface that was smooth and radar-dark in July — consistent with calm open water or a smooth wet surface — becoming rough and bright by October: consistent with emergence or drying as discharge fell. Flooded vegetation can also be very bright at L-band HH through double-bounce; the HV rise is consistent with new volume scattering. Wording stays at “consistent with”. <Stamp label="DERIVED" /></p>
      <h3>3 · What alternatives remain?</h3>
      <ul>{alts.map((t, i) => <li key={i}>{t}</li>)}</ul>
      <p>Wind-roughened water: <b>NOT EVALUATED</b> — no wind record exists in the case pack, so it is shown as missing, not assumed away.</p>
      <h3>4 · What evidence could settle it?</h3>
      <p>{patch.crosscheck.reading}</p>
      <p>Plus: a field observation at the patch (Ask the field, in the Passport) and the next same-track pass. <Stamp label="CROSSCHECKED" /></p>
      <h3>Polarization Prism — channels actually present</h3>
      {man.products.map(p => (
        <div className="row" key={p.date}><span>{p.date} · {p.polMode}</span><b>{p.channelsPresent.join(' · ')}</b>{man.pair.includes(p.date) ? <Stamp label="MEASURED" /> : null}</div>
      ))}
      <p className="note">VV/VH-family channels exist only on the two quad-pol dates; a Pauli composite is offered only where quad-pol data are present — not in this pair, so it is not shown.</p>
    </div>
  );
}

export type Audience = 'analyst' | 'decision' | 'public';

/** F15 Decision Brief + F14 audience lenses (templates filled from the pack). */
export function DecisionBrief({ patch, man, audience }: { patch: Patch; man: Man; audience: Audience }) {
  const next = useMemo(() => {
    const last = man.products[man.products.length - 1].date;
    const d = new Date(last + 'T00:00:00Z');
    do { d.setUTCDate(d.getUTCDate() + 12); } while (d.getTime() <= Date.now());
    return d.toISOString().slice(0, 10);
  }, [man]);
  if (audience === 'analyst') return (
    <div className="lab"><h2>Decision Brief — Analyst</h2>
      <p>Candidate water-to-land emergence, {patch.totalAreaHa} ha (Robust Core {patch.robustAreaHa} ha across the 12-setting ensemble), {man.pair[0]} → {man.pair[1]}. Δ γ⁰ HH +{patch.calibrated.dDbHH} dB, Δ γ⁰ HV +{patch.calibrated.dDbHV} dB. Discharge proxy fell {man.drivers.dischargeM3sByDate[man.pair[0]].toLocaleString()} → {man.drivers.dischargeM3sByDate[man.pair[1]].toLocaleString()} m³/s; pair is NOT COMPARABLE for bank-change attribution. Next expected same-track pass: {next} (DERIVED, expected, not guaranteed).</p></div>
  );
  if (audience === 'decision') return (
    <div className="lab"><h2>Decision Brief — Decision-maker</h2>
      <p>Between {man.pair[0]} and {man.pair[1]} the satellite saw about {patch.totalAreaHa} hectares of river surface emerge or dry along the western channel belt; {patch.robustAreaHa} hectares of that survives every measurement setting we tested. The river itself fell sharply over the same period, so this reads as the river changing level — not as proven bank erosion. What would settle what the surface is now: one field visit (already handoff-ready in the Passport) and the next pass, expected {next}.</p></div>
  );
  return (
    <div className="lab"><h2>Decision Brief — Public</h2>
      <p className="lede">What this means: between {man.pair[0]} and {man.pair[1]}, land that was under water or wet along this riverbank came up dry over about {patch.totalAreaHa} hectares.</p>
      <p>What we do not know: the river's height and the way we measure can change that number, and a satellite cannot say what is standing on the ground now.</p>
      <p>What happens next: a person on the ground checks this exact place, and the satellite looks again — next expected pass {next}.</p>
      <p className="note">Bangla rendering of this template is pending review by a Bengali-speaking teammate (brief F14 rule); the reviewed Bangla narration for this case already ships inside TRACE Field's My Place view.</p></div>
  );
}

/** F16/F12 exports: report .md, manifest download, reproduce command. */
export function Exports({ patch, man }: { patch: Patch; man: Man }) {
  const [copied, setCopied] = useState('');
  const report = () => {
    const md = `# FluviSAR — Case Report ${patch.id}\n\nCase: Jamuna · Chilmari reach · track 19 · ${man.collection} · ${man.maturity} · CRID ${man.crid}\nPair: ${man.pair[0]} -> ${man.pair[1]}\n\nCandidate: ${patch.totalAreaHa} ha · Robust Core: ${patch.robustAreaHa} ha (${patch.robustPx} px on the 20 m grid)\nSignal: gamma-0 HH ${patch.calibrated.hhDbA} -> ${patch.calibrated.hhDbB} dB (+${patch.calibrated.dDbHH} dB); HV +${patch.calibrated.dDbHV} dB\n\nInterpretation: water-to-land emergence candidate, consistent with emergence/drying as discharge fell. Not a claim of permanent erosion.\nCrosscheck: ${patch.crosscheck.reading}\nExposure (estimated, not damage): WorldPop population in core ${patch.exposure.worldPopCore}; OSM buildings within 1 km ${patch.exposure.osmBuildingsWithin1km}.\n\nManifest: ${man.manifestHash}\nReproduce: python3 pipeline/build_case_pack.py\n`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
    a.download = `fluvisar-report-${patch.id}.md`; a.click(); URL.revokeObjectURL(a.href);
  };
  return (
    <div className="lab"><h2>Exports</h2>
      <div className="revbtns">
        <button className="chip btn dark" onClick={report}>Download report (.md)</button>
        <a className="chip btn dark" href="/case/jamuna-chilmari/manifest.json" download>Download manifest.json</a>
        <button className="chip btn dark" onClick={async () => { try { await navigator.clipboard.writeText('python3 pipeline/build_case_pack.py'); setCopied('copied'); } catch { setCopied('python3 pipeline/build_case_pack.py'); } }}>Copy reproduce command</button>
      </div>
      {copied && <p className="note">{copied}</p>}
    </div>
  );
}
