import * as THREE from 'three';
export interface OceanConfig{canvas:OffscreenCanvas;url:string;boatUrl:string;width:number;height:number;pixelRatio:number;motion:number}
const vertexShader=`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
const fragmentShader=`
uniform sampler2D uArt;uniform sampler2D uBoat;uniform float uTime;uniform vec2 uCover;uniform float uShift;uniform vec2 uPointer;uniform float uBoatRatio;uniform float uMobile;
varying vec2 vUv;
vec4 sampleBoat(vec2 uv){if(uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.)return vec4(0.);return texture2D(uBoat,uv);}
void main(){
 float t=uTime;vec2 uv=(vUv-.5)*uCover+.5;uv.x+=uShift;
 if(uMobile>.5){uv=vec2((vUv.x-.5)*.70+.5,vUv.y/.60);}
 float water=1.-smoothstep(.45,.49,uv.y);float foreground=1.-smoothstep(.0,.49,uv.y);
 vec2 flow=vec2(sin(uv.y*90.+t*.82)+sin(uv.y*167.-t*.60),cos(uv.x*30.+uv.y*60.-t*.72))*.0023*foreground*water;
 vec2 artUv=uv+flow;artUv+=uPointer*.0015;
 vec3 color=texture2D(uArt,clamp(artUv,.001,.999)).rgb;
 if(uMobile>.5){vec3 sky=texture2D(uArt,vec2(.50+vUv.x*.20,.90+clamp((vUv.y-.6)/.4,0.,1.)*.08)).rgb;color=mix(color,sky,smoothstep(.78,.84,uv.y));}
 float boatWidth=mix(.25,.38,uMobile);
 vec2 size=vec2(boatWidth,boatWidth*1.5/uBoatRatio);
 float bob=sin(t*.72)*.0038+sin(t*.31)*.001;
 float baseX=mix(.735,.55,uMobile);
 if(uMobile<.5)baseX=min(baseX,.5+uCover.x*.5-boatWidth*.55-.06);
 vec2 center=vec2(baseX+sin(t*.14)*mix(.045,.024,uMobile),mix(.37,.43,uMobile)+bob);
 float angle=sin(t*.62)*.016;
 mat2 turn=mat2(cos(angle),-sin(angle),sin(angle),cos(angle));
 vec2 boatUv=turn*((uv-center)/size)+.5;
 float contact=center.y-size.y*.485;
 vec2 reflectionUv=vec2(uv.x,contact*2.-uv.y);
 reflectionUv.x+=sin(uv.y*220.+t*1.4)*.004+sin(uv.y*73.-t*.7)*.0023;
 vec2 reflectBoat=turn*((reflectionUv-center)/size)+.5;
 vec4 reflected=sampleBoat(reflectBoat);
 float reflection=(1.-smoothstep(.0,size.y*.50,contact-uv.y))*step(uv.y,contact)*.32;
 color=mix(color,reflected.rgb,reflected.a*reflection);
 float wakeX=(uv.x-center.x)/.20;float wakeY=uv.y-contact;
 float wake=exp(-wakeY*wakeY*140000.)*(1.-smoothstep(.0,1.,abs(wakeX)))*(.5+.5*sin(uv.x*230.-t*1.3));
 color=mix(color,vec3(.91,.95,.82),wake*.18);
 vec4 boat=sampleBoat(boatUv);color=mix(color,boat.rgb,boat.a);
 gl_FragColor=vec4(color,1.);
 #include <colorspace_fragment>
}`;
export async function createOceanScene(config:OceanConfig){
 const renderer=new THREE.WebGLRenderer({canvas:config.canvas,antialias:false,powerPreference:'low-power'});renderer.setPixelRatio(config.pixelRatio);renderer.outputColorSpace=THREE.SRGBColorSpace;
 const bitmaps=await Promise.all([config.url,config.boatUrl].map(async url=>{const r=await fetch(url);if(!r.ok)throw new Error('Artwork unavailable');return createImageBitmap(await r.blob(),{imageOrientation:'flipY',premultiplyAlpha:'none',colorSpaceConversion:'none'});}));
 const textures=bitmaps.map(b=>{const t=new THREE.Texture(b);t.needsUpdate=true;t.colorSpace=THREE.SRGBColorSpace;t.minFilter=THREE.LinearFilter;t.generateMipmaps=false;return t;});
 const uniforms={uArt:{value:textures[0]},uBoat:{value:textures[1]},uTime:{value:0},uCover:{value:new THREE.Vector2(1,1)},uShift:{value:0},uPointer:{value:new THREE.Vector2()},uBoatRatio:{value:bitmaps[1].width/bitmaps[1].height},uMobile:{value:0}};
 const material=new THREE.ShaderMaterial({uniforms,vertexShader,fragmentShader,depthWrite:false,depthTest:false});const geometry=new THREE.PlaneGeometry(2,2);const mesh=new THREE.Mesh(geometry,material);const scene=new THREE.Scene();scene.add(mesh);const camera=new THREE.OrthographicCamera(-1,1,1,-1,0,10);
 function resize(width:number,height:number){renderer.setSize(width,height,false);const aspect=width/height;uniforms.uCover.value.set(Math.min(aspect/1.5,1),Math.min(1.5/aspect,1));uniforms.uShift.value=0;uniforms.uMobile.value=width<760?1:0;}
 resize(config.width,config.height);await renderer.compileAsync(scene,camera);
 return{resize,draw(t:number,x:number,y:number){uniforms.uTime.value=t;uniforms.uPointer.value.set(x,y);renderer.render(scene,camera);},motion(_v:number){},dispose(){geometry.dispose();material.dispose();textures.forEach(t=>t.dispose());bitmaps.forEach(b=>b.close());renderer.dispose();}};
}
