import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const commands=JSON.parse(readFileSync('package.json','utf8')).scripts.build.split(' && ');
for(const command of commands){
 const args=command==='next build'?['node_modules/next/dist/bin/next','build','--webpack']:command.replace(/^node /,'').split(' ');
 console.log('Checking:',command);
 const result=spawnSync(process.execPath,args,{stdio:'inherit',env:process.env});
 if(result.status!==0)process.exit(result.status??1);
}
