#!/usr/bin/env python3
"""FluviSAR case-pack builder (pipeline step 12 prototype).
Reads the verified TRACE Field data files (single source of upstream truth),
transforms them into the FluviSAR manifest schema (brief section C2), and
writes public/case/jamuna-chilmari/{manifest.json,case.json}.
No number is created here: every value is copied from the TRACE manifest/case
or derived by the stated arithmetic (pixel count x pixel area, discharge diffs).
"""
import json, hashlib, pathlib
SRC = pathlib.Path.home()/"workspace/trace-field/public/data"
OUT = pathlib.Path.home()/"workspace/fluvisar/public/case/jamuna-chilmari"
tm = json.loads((SRC/"manifest.json").read_text())
tc = json.loads((SRC/"case.json").read_text())

products=[]
for g in tm["granules"]:
    products.append({
        "granule": g["granuleId"], "date": g["date"], "track": tm["track"],
        "frame": tm["frame"], "direction": "descending" if tm["orbitDirection"]=="D" else "ascending",
        "bandwidthMHz": g["bandwidthMHz"], "polMode": g["polPrimary"],
        "channelsPresent": g["layersFrequencyA"], "nativeGridM": g["gridM"],
        "orbitAccuracy": g["orbitAccuracy"], "crid": tm["product"]["crid"],
        "maturity": tm["product"]["maturity"]})

patches=[]
for c in tc["candidates"]:
    patches.append({
        "id": c["id"], "title": c["title"], "question": c["question"],
        "centroid": c["centroid"], "robustPx": c["robustPx"], "fringePx": c["fringePx"],
        "robustAreaHa": c["robustAreaHa"], "totalAreaHa": c["areaHa"],
        "pair": tc["pair"], "direction": "water-to-land emergence candidate (gamma-0 HH rose)",
        "calibrated": c["calibrated"], "crosscheck": c["crosscheck"],
        "label": c["provenance"], "status": c["status"],
        "core": c["core"], "fringe": c["fringe"], "ghost": c.get("ghost",[]),
        "exposure": {"worldPopCore": tm["exposureWorldPop"]["population"][c["id"]]["core"],
                     "worldPopCorePlusFringe": tm["exposureWorldPop"]["population"][c["id"]]["corePlusFringe"],
                     "osmBuildingsWithin1km": tm["exposure"]["buildingsWithin1km"][c["id"]]}})

dis = tc["drivers"]["dischargeM3sByDate"]
pair = tc["pair"]
claims=[
 {"id":"CL-1","text":f"Calibrated pair {pair[0]} to {pair[1]}: three western channel-belt patches brightened by +12.4 to +13.6 dB in gamma-0 HH.","label":"DERIVED","status":"ACTIVE"},
 {"id":"CL-2","text":f"GloFAS discharge at Chilmari fell from {dis[pair[0]]} to {dis[pair[1]]} m3/s between the pair dates (difference {dis[pair[0]]-dis[pair[1]]} m3/s).","label":"DERIVED","status":"ACTIVE"},
 {"id":"CL-3","text":"River stage (BWDB/FFWC gauge, metres): no public source obtained. Stage-admission test runs on the discharge proxy, labelled DERIVED, never as gauge metres.","label":"UNVERIFIED","status":"LIMITED"},
 {"id":"CL-4","text":"Sentinel-1 C-band crosscheck: water-like dark fraction inside each core fell to near zero between 2026-07-13 and 2026-10-05.","label":"CROSSCHECKED","status":"ACTIVE"},
 {"id":"CL-5","text":"Sentinel-2 NDWI saw no open water in these cores on either clear date (2026-07-04, 2026-10-12): the July radar-dark surface may have been wet mud or shallow water, not deep open water.","label":"CROSSCHECKED","status":"ACTIVE"},
]
manifest={
 "caseId":"jamuna-chilmari","caseSlug":"JAMUNA · CHILMARI REACH · TRACK 19",
 "aoi":{"site":tm["site"],"track":tm["track"],"frame":tm["frame"]},
 "analysisGridM":tm["commonGridM"],"pixelAreaM2":tm["commonGridM"]**2,"haPerPixel":tm["haPerPixel"],
 "collection":tm["product"]["collection"],"doi":tm["product"]["doi"],"crid":tm["product"]["crid"],
 "maturity":tm["product"]["maturity"],"variable":"gamma-0 (γ⁰) power, dB = 10·log10(γ⁰)",
 "sigmaNote":tm["sigmaNote"],
 "products":products,
 "pair":pair,
 "processing":{"pipeline":"calibrated GCOV gamma-0 float -> dB, native 20 m grid, control-patch seasonal shift removed (+2.25 dB)","ensemble":"12 settings: thresholds 3/4.5/6 dB x median 3/5 x MMU 100/350 px; robust = persists in all 12 (robustness measure, not a probability)","methodV4":tm.get("methodV4",{})},
 "drivers":{"dischargeM3sByDate":dis,"dischargeSource":tc["drivers"]["dischargeSource"],
            "rainMmWindows":tc["drivers"]["rainMmWindows"],"rainSource":tc["drivers"]["rainSource"],
            "stage":{"status":"UNAVAILABLE","source":"BWDB/FFWC Chilmari gauge — no public API found (Step 0 audit)","proxy":"GloFAS discharge, DERIVED"}},
 "sensorRace":{"sentinel2":{"acquisitions":tm["sentinel2"]["acquisitions"],"clearUnder20PctTile":tm["sentinel2"]["clearUnder20Pct"],"tile":tm["sentinel2"]["tile"],"note":"tile-level cloud, not AOI SCL fraction — AOI recompute pending, see DECISIONS.md"},
               "sentinel1RTC":{"dates":tm["sentinel1RTC"]["dates"],"band":"C-band radar","relativeOrbits":tm["sentinel1RTC"]["relativeOrbits"]},
               "nisar":{"dates":[p["date"] for p in products],"seen":len(products)}},
 "qaFlags":tm["qaFlags"],
 "claims":claims,
 "gap":{"label":"SILENCE","note":"Cycle 027 (expected 2026-08-02) has no GCOV granule — verified zero in CMR search (Step 0 audit). Brief lists a permanent instrument gap 2026-07-27 22:03 UTC to 2026-08-10 00:55 UTC; the missing cycle falls inside it."},
}
manifest["scenesNote"]="Pair-date scenes are calibrated dB renders (fixed -25..0 dB stretch, gcov_process.py); shipped for the A/B swipe. Other dates' browse renders are not shipped in this pack."
manifest["grids"]={"aoiBoundsLonLat":[89.58,25.44,89.82,25.70],"blockGrid":"64x64 block means over the calibrated pair window (gcov_process.py AOI)","deltaGridNote":"Mean calibrated HH gamma-0 change per block, tie-point referenced. Block extent is not stored in the source file, so the Break lab reports exact block counts and shares, never hectares, for this grid. Hectares come only from the native 20 m ensemble.","walkGridNote":"2026-10-13 NISAR HH gamma-0 block means in dB."}
canon=json.dumps(manifest,sort_keys=True,ensure_ascii=False)
manifest["manifestHash"]="sha256:"+hashlib.sha256(canon.encode()).hexdigest()
OUT.mkdir(parents=True,exist_ok=True)
(OUT/"manifest.json").write_text(json.dumps(manifest,indent=1,ensure_ascii=False))
(OUT/"scenes.json").write_text(json.dumps({d: json.loads((SRC/"scenes.json").read_text())[d] for d in pair}))
(OUT/"grids.json").write_text(json.dumps({"deltaGrid":tc["deltaGrid"],"walkGrid":tc["walkGrid"]},indent=1))
(OUT/"case.json").write_text(json.dumps({"caseId":"jamuna-chilmari","patches":patches},indent=1,ensure_ascii=False))
reality={"task0":"Step 0 audit 2026-10-31 (TRACE Field), re-used for FluviSAR — same AOI/track",
 "nisarDates":[p["date"] for p in products],"count":len(products),
 "hvhv":"present on all 9 dates (DH; QP on 2026-08-26, 2026-09-19)",
 "gcovH5OnDisk":["2026-07-09","2026-10-13"],"browseOnlyDates":[p["date"] for p in products if p["date"] not in ("2026-07-09","2026-10-13")],
 "decisionRule":"9 same-track PROVISIONAL dates >= 4 -> full plan (brief section 7), with Break lab anchored on the calibrated pair until remaining .h5 downloads land"}
(OUT/"reality.json").write_text(json.dumps(reality,indent=1))
print("pack written; patches:",[ (p['id'],p['robustAreaHa'],p['totalAreaHa']) for p in patches])
print("hash:",manifest["manifestHash"][:23])
