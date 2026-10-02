import {createOceanScene,type OceanConfig} from './scene';
type Command = {type:'init';config:OceanConfig;paused:boolean}|{type:'resize';width:number;height:number}|{type:'pointer';x:number;y:number}|{type:'state';paused:boolean;visible:boolean;motion:number};
let ocean:Awaited<ReturnType<typeof createOceanScene>>|undefined;
let elapsed=0,previous=0,x=0,y=0,targetX=0,targetY=0;
let paused=false,visible=true;
let interval:ReturnType<typeof setInterval>|undefined;
async function receive(command:Command):Promise<void>{
  if(command.type==='init'){
    paused=command.paused;
    ocean=await createOceanScene(command.config);
    ocean.draw(0,0,0);
    command.config.canvas.addEventListener('webglcontextlost',(event)=>{event.preventDefault();clearInterval(interval);postMessage({type:'unavailable'});});
    postMessage({type:'ready'});
    previous=performance.now();
    interval=setInterval(()=>{
      const now=performance.now();const dt=Math.min((now-previous)/1000,.05);previous=now;
      if(paused||!visible||!ocean)return;
      elapsed+=dt;x+=(targetX-x)*.075;y+=(targetY-y)*.075;
      ocean.draw(elapsed,x,y);
    },1000/30);
  }else if(command.type==='resize'){ocean?.resize(command.width,command.height);ocean?.draw(elapsed,x,y);}
  else if(command.type==='pointer'){targetX=command.x;targetY=command.y;}
  else {paused=command.paused;visible=command.visible;ocean?.motion(command.motion);ocean?.draw(elapsed,x,y);previous=performance.now();}
}
onmessage=(event:MessageEvent<Command>)=>{receive(event.data).catch(()=>postMessage({type:'unavailable'}));};
