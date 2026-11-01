# FEATURE_STATUS.md — FluviSAR vs the Feature Specification PDF (Tony, 2026-11-02)

Canonical list: `FluviSAR_Web_Observatory_Feature_Specification.pdf` (01 Nov 2026), consolidated from the
Feature Prioritization + Brutal-Judge Verdict PDFs. It is web-only (does not cover TRACE Field / PWA —
the brief's PWA + field-loop items stay in force from the brief). Triage method: every spec item diffed
against the built slices (commits e940a0d, c0d8fd1, 28de60d, e7f87b5); only genuinely new gaps queue work.

## Triage summary
- Already built and matching spec: label system (§09), Passport core (§06), Sensor Race counts (§05),
  Break-lab live threshold + ensemble (§04 core), Impact basics (§07), Methods/Limitations, cut list (§12)
  — none of the removed items exist in this build (no ML page, no fixed confidence %, no chat, no auth,
  no forecasts, no hard-coded numbers: all values load from the case pack, check.mjs enforces).
- Partial / new gaps queued as Slice 5: Stage Ladder UI + pair verdict, Physics Twin Q1–Q4 + Polarization
  Prism, Break-lab filter + MMU live controls + quality panel + null-result view, ESTIMATED stamp +
  UNAVAILABLE impact rows, Decision Brief, report/manifest export + shareable URL, audience switch.
- Blocked on the per-date pipeline (Tony's token-vs-browse decision): Rhythm Player per-date area series
  and per-date boundary stepping (needs per-date masks for 7 browse-only dates), Ground Biography in
  calibrated dB, AOI-measured Sentinel-2 cloud fraction for full Sensor Race lanes.

## Per-feature verdicts
| Spec | Status | Evidence / gap |
|---|---|---|
| 01 Earth Change Atlas | PARTIAL | Act I shows the flagship + label; no globe, pins or cases.json registry yet (P1 in brief). Counts must come from a registry when built. |
| 02 Rhythm Player | PARTIAL | Score has the 9 real notes + SILENCE band; no Play stepping of boundaries, no area-over-time (per-date masks blocked). |
| 02 Stage Ladder | GAP → Slice 5 | Only a discharge text row exists. Build ladder on the GloFAS proxy (DERIVED) with a config tolerance; the real pair's discharge fell 35,236→11,994 m³/s, so for bank-change attribution the pair is NOT COMPARABLE — which matches the case reading (stage-driven emergence, not an erosion claim). |
| 03 Radar-to-Reality / Physics Twin | PARTIAL → Slice 5 | Q1 values + crosscheck reading exist. Add structured Q2/Q3/Q4, rule-generated alternatives, Prism (channels per granule from manifest), illustrative Driver X-Ray stamped as a diagram. |
| 04 Break It Lab | PARTIAL → Slice 5 | Live threshold + ensemble agreement on the real Δ grid built. Add live median filter + MMU (connected components on the block grid), data-quality panel (QA flags from manifest; invalid-pixel share UNAVAILABLE — not in pack), independent-comparison toggles (S1/S2 readings), null-result view (blocks below the tested change floor, DERIVED). |
| 05 Sensor Race | PARTIAL | Counts real (S2 clear 5/49 tile-level, S1 18 dates, NISAR 9/9). Lane view with beads buildable for NISAR + S1; S2 per-date AOI cloud unavailable (tile-level only) — show as such, never simulated. |
| 06 Change Passport | BUILT (core) | 7 sections present; add Download manifest, reproduce command, shareable URL (hash carries patch). Report export → Slice 5 (.md generated from the pack + print view). |
| 07 Impact Ledger | PARTIAL → Slice 5 | WorldPop + OSM buildings present. Population must carry ESTIMATED (spec label), not DERIVED; roads/cropland rows show UNAVAILABLE (no layer in pack) instead of being absent. |
| 07 Audience lenses | GAP → Slice 5 | Not built. Template engine from manifest values; Analyst + Decision-maker + Public (EN) now, Bangla template flagged pending Bengali-speaking teammate review (brief F14 rule). |
| 07 Decision Brief | GAP → Slice 5 | Generated one-screen brief incl. next expected pass (last + 12n days: 2026-11-06, DERIVED, expected not guaranteed). |
| 08 Optionals | NOT STARTED | SAR Lab, Future strip, Ground Biography, sonification, Scenario Lab, InSAR — P1/P2, after core. Future strip cards are cheap and honest (POTENTIAL USES · NOT VALIDATED); add with Atlas in P1. |
| 10/11 Guardrails | PASS | γ⁰ never called σ⁰; pixel area from the actual 20 m grid; 12-day cadence, real dates only; maturity + QA flags visible; no confidence %, no ROC/SHAP, no forecasts. Check.mjs greps the banned phrases. |
