# DECISIONS.md — FluviSAR (separate project, confirmed by Tony 2026-11-02)

One line per decision taken where the brief was silent or contradicted by disk evidence.

- D1 2026-11-02: FluviSAR is a separate project from TRACE Field (own folder/repo). The 2026-10-31 "do not build the observatory" call governed TRACE Field's scope only.
- D2 2026-11-02: Task 0 (brief §7) is NOT re-run. The 2026-10-31 Step 0 audit on the identical AOI/track stands: 9 PROVISIONAL dates 2026-06-27→10-13, track 19 frame 076, HVHV on all 9, CRID P05023. Decision rule: 9 ≥ 4 → full plan.
- D3 2026-11-02: The Score's first note is 2026-06-27 (first Chilmari acquisition), not 2026-06-17 (collection start). Note size does NOT encode water area (no per-date water areas exist); notes are uniform, hover shows granule + GloFAS discharge.
- D4 2026-11-02: Stage Ladder runs on the GloFAS discharge proxy, stamped DERIVED. BWDB/FFWC gauge metres are UNAVAILABLE (no public API found, Step 0). No UI text may present discharge as stage in metres.
- D5 2026-11-02: Direction of the real case is water→land emergence (γ⁰ HH −17..−19 dB → −4..−5 dB, Δ +12.4..+13.6 dB), not land→water. Ember = emergence candidates in this case pack; copy follows the data, not the brief's example direction.
- D6 2026-11-02: Only 2/9 GCOV .h5 files are on disk (2026-07-09, 2026-10-13). Break lab anchors on the calibrated pair's 12-setting ensemble until Earthdata downloads for the other 7 land. The brief's 84-member per-date Otsu ensemble is not claimed anywhere until it exists.
- D7 2026-11-02: Sensor Race Sentinel-2 counts are tile-level cloud (49 acquisitions, 5 <20%), not AOI SCL fraction. Labelled as tile-level in the manifest; AOI recompute is a P0 pipeline task, not silently assumed.
- D8 2026-11-02: Foundation slice renders patches as SVG polygons (solid core / hatched fringe / dotted ghost) on the survey-room stage — fully offline, no tile server. MapLibre + PMTiles basemap replaces it in the map slice; polygon geometry and stamps do not change.
- D9 2026-11-02: Fonts use local system stacks in the foundation slice (serif / sans / mono). Self-hosted Instrument Serif + IBM Plex download is a polish-slice task; no Google Fonts runtime call is made.
- D10 2026-11-02: Repo named by Tony 2026-11-02 00:04 +06: github.com/Tony1254-CS/nasa-web-240-mine (private, confirmed empty before first push). Local source: ~/workspace/fluvisar. No deploy yet — Vercel/Cloudflare link is Tony's step or a later slice.
