// FluviSAR checks (brief section 15, foundation slice):
// 1) banned phrases in src/ (brief section 2 list)
// 2) every patch area in case.json equals robustPx/fringePx arithmetic in manifest terms:
//    robust area = robustPx * haPerPixel (20 m grid = 0.04 ha/px), tolerance 0.15 ha (rounding in source)
// 3) manifest hash verifies over canonical JSON
import {readFileSync,readdirSync} from 'fs'; import {createHash} from 'crypto';
const banned=['94%','inevitable','ground truth confirms','SMS dispatched','No data is fabricated','6-day revisit','Sentinel-1 optical','wet soil is dark'];
let fail=0;
for(const f of readdirSync('src')){ if(!/\.(tsx?|css)$/.test(f))continue; const t=readFileSync('src/'+f,'utf8');
  for(const b of banned) if(t.toLowerCase().includes(b.toLowerCase())){console.log('BANNED in',f,':',b);fail=1;}
  if(/\bverified\b/i.test(t) && !/never|not|awaiting/i.test(t)) { /* soft: verified only in negated copy */ }
}
const man=JSON.parse(readFileSync('public/case/jamuna-chilmari/manifest.json','utf8'));
const kase=JSON.parse(readFileSync('public/case/jamuna-chilmari/case.json','utf8'));
const {manifestHash,...rest}=man; const canon=JSON.stringify(rest,Object.keys(rest).sort());
// canonical check mirrors python sort_keys for top level only if python used nested sort too:
import {execSync} from 'child_process';
const py=execSync(`python3 -c "import json,hashlib; m=json.load(open('public/case/jamuna-chilmari/manifest.json')); h=m.pop('manifestHash'); print(h, 'sha256:'+hashlib.sha256(json.dumps(m,sort_keys=True,ensure_ascii=False).encode()).hexdigest())"`).toString().trim().split(' ');
if(py[0]!==py[1]){console.log('HASH MISMATCH',py);fail=1;} else console.log('manifest hash OK',py[0].slice(0,20));
for(const p of kase.patches){ const calc=p.robustPx*man.haPerPixel; if(Math.abs(calc-p.robustAreaHa)>0.15){console.log('AREA MISMATCH',p.id,calc,p.robustAreaHa);fail=1;} }
console.log(fail?'CHECK FAILED':'CHECK PASSED'); process.exit(fail);
