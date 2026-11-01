# Methods & Limitations — FluviSAR

Core principle: **A satellite signal begins an investigation; it does not establish a verified event.**

- Data: NISAR L2 GCOV PROVISIONAL V1, CRID P05023, ASF DAAC. Calibrated and partly validated, not final; validated reprocessing planned by NASA will supersede it. Collection DOI 10.5067/NIL2GCOV-P1 (from the Step 0 audit).
- Variable: gamma-nought (γ⁰) power, radiometrically terrain corrected, shown in dB = 10·log10(γ⁰). Sigma-nought is not native; it would require the rtcGammaToSigmaFactor layer and is not shown.
- Analysis grid: 20 m common grid (two 40 MHz dates are native 10 m, resampled). Pixel area 400 m² = 0.04 ha.
- Ensemble: 12 settings (Δ thresholds 3 / 4.5 / 6 dB × median 3 / 5 × MMU 100 / 350 px), pair delta referenced to a stable east-farmland control patch (seasonal shift +2.25 dB removed). "Robust" = persists in all 12 settings.
- Robustness is the share of tested settings that agree. It is **not** a probability of being correct, and a sensitivity range is **not** a statistical confidence interval.
- Drivers: GloFAS discharge (DERIVED proxy — no BWDB/FFWC gauge series was obtainable) and NASA POWER rainfall. Only one rainfall figure is shown per window.
- Crosschecks: Sentinel-1 RTC C-band (never merged into the NISAR series) and Sentinel-2 L2A NDWI on the two clear dates.
- What we do not claim: permanent erosion, forecasts, damage, people affected. Field evidence is *awaiting review*, never automatic proof; a photo never changes a label by itself.
- Known QA: 2026-09-07 HVHV browse is defective (excluded); 40 MHz dates are series-only, never pair anchors; one AOI-edge coverage artefact cluster was rejected.
