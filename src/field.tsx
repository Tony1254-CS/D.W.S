import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export const TRACE_URL = 'https://trace-field-tonys-projects-42e6ad8b.vercel.app';

export interface Obs {
  candidateId: string; answer: string; relation: string; note: string;
  lat: number | null; lon: number | null; accuracyM: number | null;
  takenAt: string; observerTag: string; status: string; receivedAt: string;
}

/** Brief F17 demo-integrity rule, enforced: a record whose observer tag marks it
 *  as a demo (not a real person at the site) is stamped SAMPLE. */
export const isSample = (o: Obs) => /demo/i.test(o.observerTag) || (o.lat === null && o.lon === null);

export function deepLink(patchId: string, hashShort: string) {
  // TRACE Field's actual contract (its App reads ?case=<candidateId>): verified in its source.
  return `${TRACE_URL}/?case=${patchId}&v=${hashShort}`;
}

export function AskField({ patchId, question, hashShort }: { patchId: string; question: string; hashShort: string }) {
  const [qr, setQr] = useState('');
  const url = deepLink(patchId, hashShort);
  useEffect(() => { QRCode.toDataURL(url, { width: 176, margin: 1 }).then(setQr).catch(() => setQr('')); }, [url]);
  return (
    <div className="lab">
      <h2>Ask the field — {patchId}</h2>
      {qr && <img src={qr} alt={`QR code opening TRACE Field at case ${patchId}`} className="qr" />}
      <p className="labline">{question}</p>
      <p className="mono"><a href={url} target="_blank" rel="noreferrer">{url}</a></p>
      <p className="note">Opens this exact case in TRACE Field. What returns is evidence awaiting review — a photo never changes a label by itself.</p>
    </div>
  );
}

type Review = Record<string, { decision: string; note: string; at: string }>;

export function FieldInbox({ patchId }: { patchId: string }) {
  const [rows, setRows] = useState<Obs[] | null>(null);
  const [err, setErr] = useState('');
  const [review, setReview] = useState<Review>(() => { try { return JSON.parse(localStorage.getItem('fluvisar-review-log') || '{}'); } catch { return {}; } });
  const [note, setNote] = useState('');

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const r = await fetch('/api/observations');
        if (!r.ok) throw new Error('proxy unavailable');
        const all = await r.json();
        if (live) setRows(all.filter((o: Obs) => o.candidateId === patchId));
      } catch {
        try {
          const r = await fetch(`${TRACE_URL}/api/observations`);
          const all = await r.json();
          if (live) setRows(all.filter((o: Obs) => o.candidateId === patchId));
        } catch { if (live) setErr('Field inbox unreachable from this origin. Open TRACE Field to review live evidence.'); }
      }
    })();
    return () => { live = false; };
  }, [patchId]);

  const decide = (key: string, decision: string) => {
    const next = { ...review, [key]: { decision, note, at: new Date().toISOString() } };
    setReview(next); localStorage.setItem('fluvisar-review-log', JSON.stringify(next)); setNote('');
  };

  if (err) return <div className="lab"><h2>Field Inbox — {patchId}</h2><p className="note">{err}</p></div>;
  if (!rows) return <div className="lab"><h2>Field Inbox — {patchId}</h2><p className="note">Loading…</p></div>;
  const awaiting = rows.filter(o => o.status === 'awaiting review').length;
  return (
    <div className="lab">
      <h2>Field Inbox — {patchId}</h2>
      <p className="labline">{rows.length} observation(s) returned · {awaiting} awaiting review</p>
      {rows.length === 0 && <p className="note">None yet for this patch.</p>}
      {rows.map((o, i) => {
        const key = `${o.candidateId}|${o.receivedAt}|${i}`;
        const rv = review[key];
        return (
          <div className="claim" key={key}>
            <p><b>{o.answer}</b>{o.relation ? ` · ${o.relation}` : ''} — {new Date(o.takenAt).toLocaleString()}</p>
            <p className="note">{o.observerTag || 'observer'}{o.lat !== null ? ` · ${o.lat}, ${o.lon} · GPS ±${o.accuracyM} m` : ' · no GPS fix'} · status: {o.status}</p>
            {o.note && <p>{o.note}</p>}
            {isSample(o) && <span className="stamp stamp-simulated">SAMPLE · NOT INDEPENDENT FIELD VALIDATION</span>}
            {rv ? <p className="note">Reviewer: {rv.decision} · {rv.at}{rv.note ? ` · “${rv.note}”` : ''} (local audit log)</p> : <>
              <input value={note} onChange={e => setNote(e.target.value)} placeholder="Reviewer note (required by the workflow)" className="revnote" aria-label="Reviewer note" />
              <div className="revbtns">
                <button className="chip btn dark" disabled={!note} onClick={() => decide(key, 'ACCEPTED AS EVIDENCE')}>Accept as evidence</button>
                <button className="chip btn dark" disabled={!note} onClick={() => decide(key, 'REJECTED')}>Reject</button>
                <button className="chip btn dark" disabled={!note} onClick={() => decide(key, 'NEEDS FOLLOW-UP')}>Needs follow-up</button>
              </div>
              <p className="note">Accepting records evidence; it does not upgrade the finding's label automatically.</p>
            </>}
          </div>
        );
      })}
    </div>
  );
}
