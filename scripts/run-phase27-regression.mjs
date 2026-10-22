// Phase 27 stdlib-only Python integrity gate from npm, on Windows and Linux.
import {spawnSync} from 'node:child_process';
const possibilities=process.platform==='win32'?
 [['py','-3'],['python'],['python3']]:[['python3'],['python']];
let status=null,found=false;
for(const [binary,...prefix] of possibilities){
 const p=spawnSync(binary,[...prefix,'scripts/phase27_benchmark_regression.py'],{
  cwd:process.cwd(),encoding:'utf8',timeout:30000
 });
 if(p.error?.code==='ENOENT')continue;
 found=true;
 process.stdout.write(p.stdout||'');
 process.stderr.write(p.stderr||'');
 status=p.status===0?0:1;
 if(status===0){
  const ast=spawnSync(binary,[...prefix,'-c',
   'import ast,pathlib; ast.parse(pathlib.Path("scripts/phase27_score_outputs.py").read_text(encoding="utf-8"))'],
   {cwd:process.cwd(),encoding:'utf8',timeout:15000});
  if(ast.status!==0){
   process.stderr.write(ast.stderr||'Phase27 optional QA scorer syntax invalid');
   status=1;
  }
 }
 break;
}
if(!found)throw new Error('Phase27 Python 3 test interpreter not found');
if(status!==0)process.exitCode=1;
