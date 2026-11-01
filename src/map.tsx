import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export interface MapPatch { id: string; centroid: number[]; core: number[][]; fringe: number[][]; ghost: number[][] }

const ring = (pts: number[][]) => [...pts, pts[0]];

export function FluviMap({ patches, selId, onSelect, onFallback }: {
  patches: MapPatch[]; selId?: string; onSelect: (id: string) => void; onFallback: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!ref.current || mapRef.current || patches.length === 0) return;
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: ref.current,
        style: {
          version: 8,
          sources: {
            carto: { type: 'raster', tiles: ['https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'], tileSize: 256, attribution: '© OpenStreetMap contributors © CARTO' },
          },
          layers: [{ id: 'carto', type: 'raster', source: 'carto', paint: { 'raster-opacity': 0.55 } }],
        },
        center: [89.70, 25.57], zoom: 10.5,
      });
    } catch { onFallback(); return; }
    mapRef.current = map;
    map.on('error', () => { /* tile errors are non-fatal offline; WebGL failure handled at construct */ });
    map.on('load', () => {
      // hatch pattern generated in-code (diagonal ember stripes)
      const c = document.createElement('canvas'); c.width = c.height = 8;
      const g = c.getContext('2d')!; g.strokeStyle = '#FF6A3D'; g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(-2, 10); g.lineTo(10, -2); g.moveTo(-2, 2); g.lineTo(2, -2); g.moveTo(6, 10); g.lineTo(10, 6); g.stroke();
      map.addImage('hatch', g.getImageData(0, 0, 8, 8));
      const feats = (key: 'core' | 'fringe' | 'ghost') => ({
        type: 'FeatureCollection' as const,
        features: patches.filter(p => p[key].length > 2).map(p => ({
          type: 'Feature' as const, properties: { id: p.id },
          geometry: { type: 'Polygon' as const, coordinates: [ring(p[key])] },
        })),
      });
      map.addSource('fringe', { type: 'geojson', data: feats('fringe') });
      map.addSource('core', { type: 'geojson', data: feats('core') });
      map.addSource('ghost', { type: 'geojson', data: feats('ghost') });
      map.addLayer({ id: 'fringe', type: 'fill', source: 'fringe', paint: { 'fill-pattern': 'hatch', 'fill-opacity': 0.9 } });
      map.addLayer({ id: 'core', type: 'fill', source: 'core', paint: { 'fill-color': '#FF6A3D', 'fill-opacity': 0.85 } });
      map.addLayer({ id: 'ghost', type: 'line', source: 'ghost', paint: { 'line-color': '#2FD0D4', 'line-width': 1.2, 'line-dasharray': [2, 3] } });
      map.addLayer({ id: 'core-line', type: 'line', source: 'core', paint: { 'line-color': '#F1ECDF', 'line-width': ['case', ['==', ['get', 'id'], selId ?? ''], 1.8, 0.4] } });
      for (const l of ['core', 'fringe']) map.on('click', l, e => { const id = e.features?.[0]?.properties?.id; if (id) onSelect(String(id)); });
      const b = new maplibregl.LngLatBounds();
      patches.forEach(p => p.fringe.forEach(pt => b.extend(pt as [number, number])));
      if (!b.isEmpty()) map.fitBounds(b, { padding: 40 });
    });
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patches]);

  return <div ref={ref} className="maplibre" aria-label="Map: Chilmari reach with robust core, contested fringe and July ghost outlines" />;
}

/** F6 swipe: radar date A vs radar date B (calibrated pair renders). */
export function Swipe({ scenes, pair }: { scenes: Record<string, string>; pair: string[] }) {
  const [x, setX] = useState(50);
  const a = scenes[pair[0]], b = scenes[pair[1]];
  if (!a || !b) return <p className="note">Pair scenes unavailable in this pack.</p>;
  return (
    <div className="swipe">
      <div className="swipewrap">
        <img src={b} alt={`NISAR calibrated dB render ${pair[1]}`} draggable={false} />
        <img src={a} alt={`NISAR calibrated dB render ${pair[0]}`} draggable={false} className="swipetop" style={{ clipPath: `inset(0 ${100 - x}% 0 0)` }} />
        <div className="swipehandle" style={{ left: `${x}%` }} />
      </div>
      <input type="range" min={0} max={100} value={x} onChange={e => setX(Number(e.target.value))} className="slider" aria-label="Compare swipe between pair dates" />
      <div className="labrow"><span>{pair[0]} · γ⁰ dB render</span><b>{pair[1]} · γ⁰ dB render</b></div>
      <p className="note">Both frames are calibrated dB renders on the same fixed −25…0 dB stretch. Dates are always shown; this is a radar-to-radar comparison, not optical.</p>
    </div>
  );
}

/** Offline tile prefetch for the AOI (TRACE v3 route): CARTO tiles z10–13 into Cache API. */
export async function prefetchOfflinePack(): Promise<string> {
  const lon2x = (lon: number, z: number) => Math.floor((lon + 180) / 360 * 2 ** z);
  const lat2y = (lat: number, z: number) => Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * 2 ** z);
  const cache = await caches.open('fluvisar-tiles-v1');
  const urls: string[] = [];
  for (let z = 10; z <= 13; z++) {
    for (let x = lon2x(89.58, z); x <= lon2x(89.82, z); x++)
      for (let y = lat2y(25.70, z); y <= lat2y(25.44, z); y++)
        urls.push(`https://basemaps.cartocdn.com/dark_all/${z}/${x}/${y}.png`);
  }
  let ok = 0;
  for (const u of urls) { try { const r = await fetch(u); if (r.ok) { await cache.put(u, r.clone()); ok++; } } catch { /* offline or blocked: count what landed */ } }
  return `${ok}/${urls.length} basemap tiles cached`;
}
