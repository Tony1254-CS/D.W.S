# FluviSAR

A radar observatory that argues with itself. NASA Space Apps 2026 · *Dancing with the SARs* · QuintessenceMinusInfinity.

FluviSAR shows where NISAR radar sees the Jamuna (Brahmaputra) changing at the Chilmari reach — using real acquisition dates only — then attacks its own finding with thresholds, river drivers, bad pixels and independent data. What survives is the Robust Core; what does not is shown as Contested or Indeterminate.

**Core principle:** A satellite signal begins an investigation; it does not establish a verified event.

## Status
Foundation slice (P0 step 3): app shell, design system ("Survey room at night"), five-label stamps, manifest-driven case pack, The Score, patch map, Claim Ledger, Methods. Data: NISAR L2 GCOV PROVISIONAL V1, CRID P05023, 9 dates 2026-06-27 → 2026-10-13, track 19 / frame 076. See `docs/DECISIONS.md` for every place reality corrected the brief, and `docs/METHODS.md`.

## Run
```bash
npm install
npm run dev     # develop
npm run build   # production build
npm run check   # banned-phrase + manifest-hash + area-arithmetic checks
python3 pipeline/build_case_pack.py   # rebuild the case pack from the verified source data
```

## Contract with TRACE Field
Same case, same label vocabulary. FluviSAR hands a patch to TRACE Field by QR/deep link; field observations return as *awaiting review* — a photo never changes a label by itself.
