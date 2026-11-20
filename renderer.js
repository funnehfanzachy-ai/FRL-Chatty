import {MAP,ACTIONS,cellName,clamp} from "./shared.js";
export const hex=s=>{if(Array.isArray(s))return s;let h=String(s).replace("#","");if(h.length===3)h=h.split("").map(a=>a+a).join("");let n=parseInt(h,16);return [((n>>16)&255)/255,((n>>8)&255)/255,(n&255)/255]};
const norm=v=>{let l=Math.hypot(...v)||1;return v.map(x=>x/l)};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const perspective=(fov,aspect,near,far)=>{const f=1/Math.tan(fov/2),r=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(near+far)*r,-1,0,0,2*near*far*r,0])};
function multiply(a,b){let out=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)out[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return out}
function view(eye,target){
 const z=norm(eye.map((n,i)=>n-target[i])),x=norm(cross([0,1,0],z)),y=cross(z,x);
 return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);
}
function model(o){
 let [x,y,z]=o.p,[sx,sy,sz]=o.s,[rx,ry,rz]=o.r,ca=Math.cos(rx),sa=Math.sin(rx),cb=Math.cos(ry),sb=Math.sin(ry),cc=Math.cos(rz),sc=Math.sin(rz);
 return new Float32Array([(cb*cc)*sx,(sa*sb*cc+ca*sc)*sx,(-ca*sb*cc+sa*sc)*sx,0,(-cb*sc)*sy,(-sa*sb*sc+ca*cc)*sy,(ca*sb*sc+sa*cc)*sy,0,sb*sz,-sa*cb*sz,ca*cb*sz,0,x,y,z,1])
}
const vtx=`#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec2 aUV;
uniform mat4 uWorld,uVP;
out vec3 vW,vN,vLocal;
out vec2 vUV;
void main(){vec4 w=uWorld*vec4(aPos,1.);vW=w.xyz;vLocal=aPos;vN=normalize(mat3(uWorld)*aNormal);vUV=aUV;gl_Position=uVP*w;}`;
const frag=`#version 300 es
precision highp float;
in vec3 vW,vN,vLocal;
in vec2 vUV;
uniform vec3 uColor,uCam,uCore,uCoreColor,uLook,uEmergency;
uniform float uEmit,uOpacity,uCorePower,uAmbient,uFlash,uTime,uTex,uGrid,uFog,uSurface;
uniform sampler2D uImage;
out vec4 fragColor;
void main(){
 vec3 col=uColor; vec4 tx=vec4(1.);if(uTex>.5){tx=texture(uImage,vUV);col*=tx.rgb;}
 vec3 n=normalize(vN);
 float dl=max(0.,dot(n,normalize(vec3(.5,1.,.35))));
 vec3 toCore=uCore-vW;float dst=length(toCore);float cp=uCorePower*max(.0,dot(n,normalize(toCore)))*exp(-dst*.09);
 vec3 toEye=uCam-vW;float eyeDist=length(toEye);float fl=uFlash*pow(max(0.,dot(normalize(-toEye),uLook)),17.)*max(0.,dot(n,normalize(toEye)))*exp(-eyeDist*.11)*1.8;
 vec2 panel=fract(vUV*4.);float seam=uGrid*(1.-smoothstep(.015,.035,min(min(panel.x,1.-panel.x),min(panel.y,1.-panel.y))));
 float brush=uGrid*(.035*sin(vW.x*37.+vW.z*22.+vW.y*12.)+.012*sin(vW.x*130.+vW.y*92.));
 float fres=pow(1.-max(0.,dot(n,normalize(toEye))),3.);
 vec3 lit=col*(uAmbient+dl*.40+fl+brush)+col*uCoreColor*cp+uEmergency*(col+.09)*.37 + col*uEmit;
 lit-=seam*col*.23;lit+=col*pow(max(0.,dot(n,normalize(vec3(.8,.5,.2)))),32.)*.18+vec3(.10,.17,.24)*fres*.12;
 float alpha=uOpacity*tx.a;
 if(uSurface>.5&&uSurface<1.5){
   vec3 q=vLocal*18.;float t=uTime;
   float swirl=sin(q.x+sin(q.y*1.5+t*.8)*2.5+q.z*.9-t*1.7);
   float veins=pow(1.-abs(sin(swirl*2.9+q.y+sin(q.z*1.7+t)*1.5)),9.);
   float cloud=.5+.5*sin(q.z*1.25+sin(q.x+t*.6)*2.+cos(q.y*.7-t)*1.5);
   lit=col*(.45+cloud*1.5+uEmit*.65)+mix(col,vec3(.76,.90,1.),.6)*veins*1.95+col*fres*.7;
 }
 if(uSurface>1.5&&uSurface<2.5){
   float stripe=pow(1.-abs(sin(vUV.y*130.+sin(vUV.x*45.+uTime)*2.+uTime*2.)),12.);
   lit=col*(.3+fres*2.3+stripe*.45);alpha*=.2+fres*.85+stripe*.17;
 }
 if(uSurface>2.5){
   float streak=pow(.5+.5*sin(vLocal.y*42.-uTime*16.+vLocal.x*16.),6.);
   lit=col*(1.2+streak*2.8+uEmit*.9);
 }
 float haze=1.-exp(-eyeDist*uFog);lit=mix(lit,vec3(.014,.031,.052),clamp(haze,0.,.85));
 lit=1.-exp(-max(lit,vec3(0.))*1.4);
 fragColor=vec4(pow(lit,vec3(.84)),clamp(alpha,0.,1.));
}`;
function triangle(a,b,c,n,out,uv=[[0,0],[1,0],[1,1]]){[a,b,c].forEach((p,i)=>out.push(...p,...n,...uv[i]))}
function quad(a,b,c,d,n,out){triangle(a,b,c,n,out);triangle(a,c,d,n,out,[[0,0],[1,1],[0,1]])}
function cube(){let v=[],a=-.5,b=.5;quad([a,a,b],[b,a,b],[b,b,b],[a,b,b],[0,0,1],v);quad([b,a,a],[a,a,a],[a,b,a],[b,b,a],[0,0,-1],v);quad([b,a,b],[b,a,a],[b,b,a],[b,b,b],[1,0,0],v);quad([a,a,a],[a,a,b],[a,b,b],[a,b,a],[-1,0,0],v);quad([a,b,b],[b,b,b],[b,b,a],[a,b,a],[0,1,0],v);quad([a,a,a],[b,a,a],[b,a,b],[a,a,b],[0,-1,0],v);return v}
function sphere(rows=15,cols=24){let v=[];const p=(i,j)=>{let t=i/rows*Math.PI,a=j/cols*Math.PI*2;return [Math.sin(t)*Math.cos(a),Math.cos(t),Math.sin(t)*Math.sin(a)]};for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){let pts=[[i,j],[i+1,j],[i+1,j+1],[i,j],[i+1,j+1],[i,j+1]];for(let [r,c] of pts){let n=p(r,c);v.push(...n.map(x=>x*.5),...n,c/cols,r/rows)}}return v}
function torus(){let v=[],N=48,M=7;const p=(i,j)=>{let a=i/N*Math.PI*2,b=j/M*Math.PI*2,n=[Math.cos(a)*Math.cos(b),Math.sin(b),Math.sin(a)*Math.cos(b)];return [[(.46+.04*Math.cos(b))*Math.cos(a),.04*Math.sin(b),(.46+.04*Math.cos(b))*Math.sin(a)],n]};for(let i=0;i<N;i++)for(let j=0;j<M;j++)for(let [r,c] of [[i,j],[i+1,j],[i+1,j+1],[i,j],[i+1,j+1],[i,j+1]]){let [pos,n]=p(r,c);v.push(...pos,...n,r/N,c/M)}return v}
function cylinder(){let v=[],N=24;for(let i=0;i<N;i++){let a=i/N*6.283,b=(i+1)/N*6.283,x=Math.cos(a)/2,z=Math.sin(a)/2,xx=Math.cos(b)/2,zz=Math.sin(b)/2;quad([x,-.5,z],[xx,-.5,zz],[xx,.5,zz],[x,.5,z],norm([x+xx,0,z+zz]),v);triangle([0,.5,0],[x,.5,z],[xx,.5,zz],[0,1,0],v);triangle([0,-.5,0],[xx,-.5,zz],[x,-.5,z],[0,-1,0],v)}return v}
function plane(){let v=[];quad([-.5,-.5,0],[.5,-.5,0],[.5,.5,0],[-.5,.5,0],[0,0,1],v);return v}
export class Engine{
 constructor(canvas){
  let gl=canvas.getContext("webgl2",{alpha:false,antialias:true,powerPreference:"high-performance"});if(!gl)throw Error("WebGL 2 is required. Enable hardware acceleration in your browser.");
  this.gl=gl;this.canvas=canvas;const shader=(type,src)=>{let s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s};
  const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vtx));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,frag));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);this.program=program;this.u={};
  for(let n of "World VP Color Cam Core CoreColor Look Emergency Emit Opacity CorePower Ambient Flash Time Tex Grid Fog Image Surface".split(" "))this.u[n]=gl.getUniformLocation(program,"u"+n);
  this.mesh={};for(let [k,data] of Object.entries({cube:cube(),sphere:sphere(),sphereHigh:sphere(30,48),torus:torus(),cylinder:cylinder(),plane:plane()})){let vao=gl.createVertexArray(),buffer=gl.createBuffer();gl.bindVertexArray(vao);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);for(let [i,n,o] of [[0,3,0],[1,3,12],[2,2,24]]){gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,n,gl.FLOAT,false,32,o)}this.mesh[k]={vao,count:data.length/8}}
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.clearColor(.006,.012,.024,1);
  this.white=this.texture((ctx,c)=>{ctx.fillStyle="white";ctx.fillRect(0,0,c.width,c.height)},4,4);
 }
 texture(draw,w=512,h=128){let c=document.createElement("canvas");c.width=w;c.height=h;draw(c.getContext("2d"),c);let gl=this.gl,t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,c);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.generateMipmap(gl.TEXTURE_2D);return {t,c}}
 updateTexture(tex,draw){draw(tex.c.getContext("2d"),tex.c);let gl=this.gl;gl.bindTexture(gl.TEXTURE_2D,tex.t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,tex.c);gl.generateMipmap(gl.TEXTURE_2D)}
 disposeFacility(f){if(!f)return;for(let tex of new Set(f.items.map(o=>o.tex).filter(Boolean)))this.gl.deleteTexture(tex.t)}
 draw(objects,camera,opts={}){
  const {gl,u,canvas}=this,ratio=Math.min(devicePixelRatio||1,opts.quality==="Low"?1:opts.quality==="Ultra"?2:1.4);let w=Math.round(canvas.clientWidth*ratio),h=Math.round(canvas.clientHeight*ratio);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h)}
  gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);let vp=multiply(perspective((opts.fov||75)*Math.PI/180,w/h,.045,opts.far||180),view(camera.eye,camera.target));let dir=norm(camera.target.map((x,i)=>x-camera.eye[i]));
  gl.uniformMatrix4fv(u.VP,false,vp);gl.uniform3fv(u.Cam,camera.eye);gl.uniform3fv(u.Look,dir);gl.uniform3fv(u.Core,opts.core||[0,6.5,0]);gl.uniform3fv(u.CoreColor,opts.coreColor||[.3,.65,1]);gl.uniform3fv(u.Emergency,opts.emergency||[0,0,0]);gl.uniform1f(u.CorePower,opts.corePower||0);gl.uniform1f(u.Ambient,opts.ambient??.45);gl.uniform1f(u.Flash,opts.flash?1:0);gl.uniform1f(u.Time,performance.now()/1000);gl.uniform1f(u.Fog,opts.fog??.008);
  let trans=[];gl.depthMask(true);for(let o of objects){if(o.hidden)continue;let x=o.p[0]-camera.eye[0],y=o.p[1]-camera.eye[1],z=o.p[2]-camera.eye[2],d=Math.hypot(x,y,z),rad=o.radius||Math.max(...o.s)*.75;if(d>(opts.distance||70)+rad)continue;if(d>rad+3&&x*dir[0]+y*dir[1]+z*dir[2]<d*.19-rad)continue;if(o.opacity<.999){trans.push([d,o]);continue}this.renderObject(o)}
  trans.sort((a,b)=>b[0]-a[0]);gl.depthMask(false);for(let [,o] of trans){gl.blendFunc(gl.SRC_ALPHA,o.add?gl.ONE:gl.ONE_MINUS_SRC_ALPHA);this.renderObject(o)}gl.depthMask(true);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA)
 }
 renderObject(o){
  let gl=this.gl,u=this.u,m=this.mesh[o.mesh];gl.bindVertexArray(m.vao);gl.uniformMatrix4fv(u.World,false,o.matrix||model(o));gl.uniform3fv(u.Color,o.color);gl.uniform1f(u.Emit,o.emit||0);gl.uniform1f(u.Opacity,o.opacity);gl.uniform1f(u.Grid,o.grid||0);gl.uniform1f(u.Tex,o.tex?1:0);gl.uniform1f(u.Surface,o.surface||0);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,(o.tex||this.white).t);gl.drawArrays(gl.TRIANGLES,0,m.count)
 }
}
export function item(mesh,p,s,c,options={}){return {mesh,p,s,r:[0,0,0],color:hex(c),emit:0,opacity:1,...options}}
const palette=["#394653","#232f3e","#46576a","#4d5969"];
let seed=29832;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
export function createFacility(engine,generation=0){
 seed=29832+(generation*31337);
 const items=[],walls=[],controls=[],doors=[],coreParts=[],emergencyLights=[],players=[],arcs=[],particles=[],screens=[],environmentFX=[],podIndicators=[],podDoors=[];
 const add=(m,p,s,c,opt={})=>{let o=item(m,p,s,c,opt);items.push(o);return o};
 const cube=(p,s,c,opt={})=>add("cube",p,s,c,opt);
 const collision=(x,z,w,d)=>walls.push({x,z,w,d});
 const solid=(p,s,c,opt={})=>{collision(p[0],p[2],s[0],s[2]);return cube(p,s,c,opt)};
 const light=(p,s,c="#76e6f3")=>{let o=cube(p,s,c,{emit:1.1});emergencyLights.push(o);return o};
 const labelTexture=(title,sub,c="#86e8ed")=>engine.texture((ctx,cn)=>{ctx.fillStyle="#071520";ctx.fillRect(0,0,cn.width,cn.height);ctx.strokeStyle=c;ctx.lineWidth=5;ctx.strokeRect(4,4,cn.width-8,cn.height-8);ctx.fillStyle=c;ctx.fillRect(0,0,12,cn.height);ctx.font="bold 35px Arial";ctx.textAlign="center";ctx.fillText(title,cn.width/2,57,cn.width-45);ctx.fillStyle="#9eb3bb";ctx.font="18px Arial";ctx.fillText(sub,cn.width/2,92,cn.width-45)},512,128);
 const panel=(p,s,title,sub,ry=0,c="#86e8ed")=>add("plane",p,s,"#ffffff",{r:[0,ry,0],tex:labelTexture(title,sub,c),emit:.9});
 const space=engine.texture((ctx,c)=>{let g=ctx.createLinearGradient(0,0,c.width,c.height);g.addColorStop(0,"#020611");g.addColorStop(.55,"#13264c");g.addColorStop(1,"#040914");ctx.fillStyle=g;ctx.fillRect(0,0,c.width,c.height);for(let i=0;i<240;i++){ctx.fillStyle=i%4?"#8bb5dd":"#f0f9fc";ctx.fillRect(rnd()*c.width,rnd()*c.height,rnd()*2.3+1,rnd()*2.3+1)}let p=ctx.createRadialGradient(650,260,10,690,275,205);p.addColorStop(0,"#6ea8b9");p.addColorStop(.6,"#345b7f");p.addColorStop(.93,"#0c2238");p.addColorStop(1,"#5eacc8");ctx.beginPath();ctx.arc(710,264,195,0,Math.PI*2);ctx.fillStyle=p;ctx.fill();ctx.strokeStyle="#86b5cf";ctx.lineWidth=3;ctx.stroke()},1024,384);
 const viewport=(p,rot)=>{cube(p,[6.75,2.25,.23],"#0d1c2a",{r:[0,rot,0]});add("plane",[p[0]+Math.sin(rot)*.15,p[1],p[2]+Math.cos(rot)*.15],[6.4,1.95,1],"#fff",{r:[0,rot,0],tex:space,emit:.85})};
 for(let row=0;row<7;row++)for(let col=0;col<7;col++){
  const x=(col-3)*10,z=(row-3)*10,name=MAP[row][col],reactor=name==="REACTOR";
  const flooring=reactor?"#25374a":name==="Main Control"?"#26374c":/Maintenance|Tunnel|Generator|Distribution/.test(name)?"#343b43":/Security|Reception/.test(name)?"#3b4b56":"#303e4e";
  cube([x,-.22,z],[10,.42,10],flooring,{grid:1});
  for(let i=-4;i<=4;i+=2){cube([x+i,.015,z],[.025,.03,10],"#111e2c");cube([x,.016,z+i],[10,.03,.025],"#172331")}
  if(!reactor){
   cube([x,4.65,z],[10,.27,10],"#263544",{grid:1});
   light([x,4.48,z],[4.8,.1,.22],"#b0eced");light([x,4.48,z+3.2],[2,.08,.12],"#68aebf");
   for(let r of [-1,1]){cube([x+r*4.12,.045,z],[.13,.08,9.6],name==="Escape Pods"?"#52e2a3":"#608ea7",{emit:.55});add("cylinder",[x+r*3.65,4.12,z],[.19,9.5,.19],"#3b697c",{r:[Math.PI/2,0,0],grid:1})}
   for(let j=0;j<3;j++)cube([x,4.27,z-3.2+j*3.2],[9.8,.22,.32],"#44566a",{grid:1});
   for(let i of [-4.4,4.4]){cube([x+i,4.12,z],[.28,.46,9.4],"#556678");cube([x+i,4.04,z],[.15,.15,9.2],"#152637")}
   panel([x,3.65,z-4.80],[5.0,1.08,1],name.toUpperCase(),"FRL / SECTOR "+(row*7+col+1),0);
   panel([x,3.65,z+4.8],[5.0,1.08,1],name.toUpperCase(),"AUTHORIZED PERSONNEL",Math.PI);
   for(let side of [-1,1]){cube([x+side*3.9,1.15,z-4.2],[1.4,2.3,.55],"#263344");cube([x+side*3.9,1.1,z-3.9],[.9,1.6,.08],"#435265");light([x+side*3.9,1.8,z-3.85],[.42,.06,.04],"#4ae8ae")}
   const hasActions=ACTIONS.some(a=>Math.abs(a.x-x)<5&&Math.abs(a.z-z)<5);
   for(let d of [-1.55,1.55]){cube([x+d,.03,z],[.035,.025,9.9],"#4d8494",{emit:.31});cube([x,.03,z+d],[9.9,.025,.035],"#4d8494",{emit:.31})}
   if(!hasActions&&!/Junction|Tunnel|Maintenance|Navigation/.test(name)){
    if(name==="Hydroponics"){
     for(let i of [-1,1]){solid([x+i*3.25,.43,z+i*2.85],[1.7,.86,1.9],"#29474a");cube([x+i*3.25,.9,z+i*2.85],[1.7,.14,1.9],"#507d6a");for(let j=0;j<4;j++)add("sphere",[x+i*3.25+(j%2?-.32:.32),1.21+(j%2)*.18,z+i*2.85+Math.floor(j/2)*.4-.2],[.6,.78,.62],"#66bd83",{emit:.25});light([x+i*3.25,3.7,z+i*2.85],[1.5,.07,1.8],"#d5ffcf")}
    }else if(/Crew Lounge|Observation Atrium|Crew Quarters/.test(name)){
     for(let i of [-1,1]){solid([x+i*3.2,.4,z+i*2.85],[2.1,.8,1.25],"#2b4858");cube([x+i*3.2,.84,z+i*2.85],[2.12,.23,1.23],"#8eb9c7");cube([x+i*3.2,1.1,z+i*2.85+i*.5],[2.12,.48,.25],"#5c8299")}
     if(name==="Observation Atrium")panel([x,3.6,z-4.82],[4.8,.85,1],"OBSERVATION ATRIUM","DEEP SPACE / PUBLIC VIEWING",0,"#97dfff");
    }else if(/Cargo|Storage|Logistics/.test(name)){
     for(let i of [-1,1]){solid([x+i*3.45,.65,z+i*3.05],[1.6,1.3,1.5],"#435363",{grid:1});cube([x+i*3.45,1.52,z+i*3.05],[1.3,.45,1.2],"#586575",{grid:1});light([x+i*3.45,1.8,z+i*3.05],[1.05,.06,.08],"#edbc78")}
    }else if(/Lab|Medical|Research|Server|Mainframe|Administration|Bridge/.test(name)){
     for(let d of [-3.15,3.15]){solid([x+3.7,1.25,z+d],[1.35,2.5,1.5],"#101d31",{grid:1});for(let k=0;k<5;k++)light([x+2.99,.7+k*.34,z+d],[.03,.07,.9],k%2?"#5df1bd":"#61aaff")}
     if(name==="Medical Bay"){solid([x-3.3,.52,z-2.9],[1.45,1.04,2.05],"#34465b");cube([x-3.3,1.13,z-2.9],[1.48,.2,2.1],"#b9deea");cube([x-3.3,1.33,z-3.6],[1.4,.2,.63],"#ddf3f0")}
     if(name==="Research Lab"||name==="Experimental Lab")for(let d of [-3,3]){solid([x-3.3,.35,z+d],[1.4,.7,1.4],"#394e62");add("cylinder",[x-3.3,1.7,z+d],[1.2,2.1,1.2],"#6fa4b9",{opacity:.26,emit:.25});add("sphere",[x-3.3,1.65,z+d],[.6,.85,.6],"#bc9cff",{emit:.9,surface:1})}
    }else for(let i of [-1,1]){solid([x+i*3.35,.58,z+i*3.05],[1.55,1.16,1.35],palette[Math.floor(rnd()*4)]);light([x+i*3.35,1.19,z+i*3.05],[1.15,.06,.1],"#4a9eaf")}
   }
   if(name==="Escape Pods"){
    const px=x+3.55,pz=z-3.2;
    solid([px,1.15,pz],[2.15,2.3,2.65],"#435466",{grid:1});cube([px,2.45,pz],[2.2,.28,2.7],"#52657a");
    const indicator=cube([px,2.65,pz+1.1],[1.95,.1,.15],"#e26150",{emit:1.3});podIndicators.push(indicator);
    panel([px,3.05,pz+1.42],[2.2,.62,1],"ESCAPE POD","EMERGENCY ACCESS",0,"#ffa27f");
    const gate=cube([px,1.2,pz+1.36],[2.15,2.4,.18],"#54717c",{grid:1});podDoors.push({o:gate,x:px,z:pz+1.36,w:2.15,d:.18})
   }
   if(name==="Safety Office")panel([x-4.78,3.2,z],[4.3,.8,1],"WEST CREW DECK  <","HYDROPONICS / OBSERVATION / LOUNGE",Math.PI/2,"#72ffdc");
   if(name==="Reception")panel([x-4.7,3.35,z],[4.5,.83,1],"WEST CREW DECK  <","MAIN CONTROL NORTH / PODS EAST",Math.PI/2,"#72ffdc");
   if(row===0)viewport([x,2.45,z-4.74],0);if(row===6)viewport([x,2.45,z+4.74],Math.PI);if(col===0)viewport([x-4.74,2.45,z],Math.PI/2);if(col===6)viewport([x+4.74,2.45,z],-Math.PI/2);
  } else {cube([x,11.9,z],[10,.4,10],"#253247",{grid:1});for(let i of [-4.5,4.5]){cube([x+i,.03,z],[.14,.06,10],"#87d1ff",{emit:.5});cube([x,11.6,z+i],[10,.12,.25],"#64b8ea",{emit:.5})}}
 }
 function wall(x,z,axis,opening,reactorEdge=false){
  let h=reactorEdge?11.8:4.5;const thick=.3;
  const segment=(offset,len)=>{if(len<=0)return;let p=axis==="x"?[x+offset,h/2,z]:[x,h/2,z+offset],s=axis==="x"?[len,h,thick]:[thick,h,len];if(reactorEdge){collision(p[0],p[2],s[0],s[2]);cube([p[0],.6,p[2]],[s[0],1.2,s[2]],"#34465c",{grid:1});cube([p[0],2.42,p[2]],[s[0],2.45,s[2]],"#527c9c",{opacity:.18,emit:.15});cube([p[0],(h+3.65)/2,p[2]],[s[0],h-3.65,s[2]],"#2c3b50",{grid:1});}else solid(p,s,"#354456",{grid:1});
   for(let Y of [.16,1.25,h-.25])cube([p[0],Y,p[2]],axis==="x"?[len,.09,.37]:[.37,.09,len],Y===1.25?"#637482":"#121d2b");
   if(!reactorEdge){for(let side of [-1,1]){const pp=axis==="x"?[p[0],2.7,p[2]+side*.17]:[p[0]+side*.17,2.7,p[2]];cube(pp,axis==="x"?[Math.min(len*.83,2.5),.95,.07]:[.07,.95,Math.min(len*.83,2.5)],"#172c3a",{grid:1});cube([pp[0],2.22,pp[2]],axis==="x"?[Math.min(len*.83,2.5),.07,.09]:[.09,.07,Math.min(len*.83,2.5)],"#537989",{emit:.32})}}
  };
  if(!opening){segment(0,10);return}
  segment(-3.55,2.9);segment(3.55,2.9);
  const len=4.2,doorH=3.15;
  cube([x,(h+doorH)/2,z],axis==="x"?[len,h-doorH,.28]:[.28,h-doorH,len],"#354558");
  for(let side of [-1,1]){const p=axis==="x"?[x+side*2.07,1.6,z]:[x,1.6,z+side*2.07];cube(p,axis==="x"?[.15,3.2,.52]:[.52,3.2,.15],"#738697");light(p,axis==="x"?[.055,2.85,.6]:[.6,2.85,.055],"#80d5e4")}
  light([x,3.23,z],axis==="x"?[4.05,.12,.52]:[.52,.12,4.05],reactorEdge?"#d09aff":"#9ee6ee");
  if(reactorEdge){const o=cube([x,1.6,z],axis==="x"?[3.9,3.15,.32]:[.32,3.15,3.9],"#687b8e",{grid:1});o.hidden=true;doors.push({o,x,z,w:axis==="x"?3.9:.32,d:axis==="x"?.32:3.9})}
 }
 for(let r=0;r<7;r++)for(let c=0;c<7;c++){
  let x=(c-3)*10,z=(r-3)*10,name=MAP[r][c],here=name==="REACTOR";
  if(c===0)wall(x-5,z,"z",false);if(r===0)wall(x,z-5,"x",false);
  if(c===6)wall(x+5,z,"z",false);else{let there=MAP[r][c+1]==="REACTOR";if(!(here&&there))wall(x+5,z,"z",true,here!==there)}
  if(r===6)wall(x,z+5,"x",false);else{let there=MAP[r+1][c]==="REACTOR";if(!(here&&there))wall(x,z+5,"x",true,here!==there)}
 }
 for(let a of ACTIONS){
  const f=a.facing||0,large=a.id==="regenerate",event=!!a.bank,w=large?2.0:event?1.78:1.48,d=large?1.72:1.0,base=[a.x,.48,a.z],side=Math.abs(Math.sin(f))>.9;
  collision(a.x,a.z,side?d:w,side?w:d);cube(base,[w,.96,d],large?"#254e49":"#293e51",{r:[0,f,0],grid:1});
  cube([a.x,.95,a.z],[w+.12,.15,d+.14],"#60748b",{r:[0,f,0]});
  let button=add("cylinder",[a.x,1.075,a.z],[large?.84:.49,.18,large?.84:.49],a.color,{emit:1.25});
  const back=[a.x-Math.sin(f)*.35,1.46,a.z-Math.cos(f)*.35];
  cube([back[0],1.43,back[2]],[w+.2,.65,.12],"#0b202d",{r:[0,f,0]});
  panel([back[0]+Math.sin(f)*.08,1.46,back[2]+Math.cos(f)*.08],[w+.14,.58,1],a.label,a.bank||"OPERATE / E",f,a.color);
  const status=cube([a.x+Math.cos(f)*(w*.34)+Math.sin(f)*.34,1.08,a.z-Math.sin(f)*(w*.34)+Math.cos(f)*.34],[.19,.08,.19],"#62ffb8",{emit:1.4});
  if(large){add("torus",[a.x,.07,a.z],[4.5,.35,4.5],"#6afce0",{emit:.9,opacity:.75});add("torus",[a.x,.11,a.z],[3.4,.28,3.4],"#306f7c",{emit:.65});for(let i=0;i<8;i++){let r=i*Math.PI/4;cube([a.x+Math.sin(r)*2.12,.045,a.z+Math.cos(r)*2.12],[.14,.05,.55],"#79ffd9",{r:[0,r,0],emit:1.1})}}
  controls.push({a,button,status});
 }
 function screen(x,y,z,w,h,rot=0,type="reactor"){
  let tex=engine.texture((ctx,c)=>{ctx.fillStyle="#03101e";ctx.fillRect(0,0,c.width,c.height)},1024,512);
  cube([x,y,z],[w+.3,h+.3,.16],"#152b3b",{r:[0,rot,0]});
  add("plane",[x+Math.sin(rot)*.1,y,z+Math.cos(rot)*.1],[w,h,1],"#ffffff",{tex,emit:.8,r:[0,rot,0]});tex.type=type;screens.push(tex)
 }
 screen(0,3.18,16.05,7.9,2.4,0);screen(0,3.5,-13.8,7.6,2.5,0);screen(20,3.15,-5.75,5.2,1.8,Math.PI);screen(30,3.05,-15.9,5,1.8,0);
 panel([0,4.15,20],[4.9,.75,1],"MAIN CONTROL","IGNITION · THERMAL SYSTEMS · SHUTDOWN",0,"#91edff");
 for(let i=0;i<4;i++){let a=i*Math.PI/2;add("cylinder",[Math.sin(a)*13.4,9.9,Math.cos(a)*13.4],[.62,4.2,.62],"#698899",{grid:1});add("torus",[0,10.8,0],[23.5,1.2,23.5],"#3d5269",{r:[0,i*.1,0],emit:.15})}
 for(let j=0;j<4;j++){let a=Math.PI*.5*j,xx=Math.sin(a)*13.5,zz=Math.cos(a)*13.5;cube([xx,8.8,zz],[j%2?.9:19,.32,j%2?19:.9],"#344b60",{grid:1});for(let q of [-1,1]){const p=[xx+Math.sin(a)*q*.67,9.13,zz+Math.cos(a)*q*.67];cube(p,[j%2?.09:19,.12,j%2?19:.09],"#6c8495",{emit:.28})}}
 for(let i=0;i<4;i++){
  let a=i*Math.PI/2,px=Math.sin(a)*11.5,pz=Math.cos(a)*11.5;
  solid([px,.65,pz],[3.4,1.3,3.4],"#526175");cube([px,3.15,pz],[1.45,5.4,1.45],"#485773",{grid:1});
  add("cylinder",[px,6.5,pz],[2.85,3.8,2.85],"#536c82",{r:[Math.PI/2,a,0]});
  const lens=add("sphereHigh",[px*.85,6.5,pz*.85],[1.5,1.5,1.5],"#9676ff",{emit:1,surface:1});coreParts.push({type:"lens",i,o:lens});
  for(let j=0;j<4;j++){let off=7.7+j*.9;add("torus",[Math.sin(a)*off,6.5,Math.cos(a)*off],[3.6,.7,3.6],"#58768e",{r:[Math.PI/2,a,0],emit:.2})}
  coreParts.push({type:"beam",base:[px*.49,6.5,pz*.49],i,o:add("cylinder",[px*.49,6.5,pz*.49],[.28,10.8,.28],"#a4baff",{r:[Math.PI/2,a,0],emit:1.6,opacity:.8,add:true,surface:3})});
  coreParts.push({type:"beamglow",base:[px*.49,6.5,pz*.49],i,o:add("cylinder",[px*.49,6.5,pz*.49],[.7,10.8,.7],"#8c8cff",{r:[Math.PI/2,a,0],emit:1,opacity:.12,add:true,surface:3})});
  for(let j=0;j<6;j++){let offset=9.9+j*.43;let p=[Math.sin(a)*offset,5.1,Math.cos(a)*offset];cube(p,[.22,.22,.22],"#94a6b6",{emit:.23});add("torus",[Math.sin(a)*offset,6.5,Math.cos(a)*offset],[2.3,.44,2.3],"#9db0c3",{r:[i%2?0:Math.PI/2,a,i%2?Math.PI/2:0],grid:1})}
 }
 solid([0,.35,0],[5.5,.7,5.5],"#46576b",{grid:1});add("cylinder",[0,.95,0],[6.6,.6,6.6],"#182c3a");
 for(let j=0;j<4;j++)add("torus",[0,1.2+j*.11,0],[6.7+j*.55,1,6.7+j*.55],"#62b9fb",{emit:1,opacity:.5});
 coreParts.push({type:"core",o:add("sphereHigh",[0,6.5,0],[6.5,6.5,6.5],"#9173ff",{emit:1.7,surface:1})});
 coreParts.push({type:"glow",o:add("sphere",[0,6.5,0],[8.8,8.8,8.8],"#9e7eff",{emit:.65,opacity:.16,add:true})});
 coreParts.push({type:"shield",o:add("sphereHigh",[0,6.5,0],[9.9,9.9,9.9],"#5ad8ff",{emit:.15,opacity:.18,add:true,surface:2})});
 for(let i=0;i<5;i++){
  let size=9.0+i*.9;coreParts.push({type:"ring",i,o:add("torus",[0,6.5,0],[size,1,size],i%2?"#768ea3":"#5a6d8f",{r:[i*.66,0,i*.47],emit:.25})});
  coreParts.push({type:"ringlight",i,o:add("torus",[0,6.5,0],[size+.12,.33,size+.12],"#a48dff",{r:[i*.66,0,i*.47],emit:1.1,opacity:.8})});
 }
 for(let i=0;i<5;i++)coreParts.push({type:"wave",i,o:add("torus",[0,6.5,0],[7,1,7],"#a58aff",{emit:1.4,opacity:.32,add:true})});
 for(let i=0;i<8;i++)coreParts.push({type:"filament",i,o:add("torus",[0,6.5,0],[6.9,.4,6.9],"#d3b2ff",{emit:1.4,opacity:.54,add:true,surface:3})});
 for(let i=0;i<24;i++){let a=i/24*Math.PI*2;cube([Math.sin(a)*9,.05,Math.cos(a)*9],[.1,.1,1.8],"#66e1ff",{r:[0,a,0],emit:1});}
 for(let i=0;i<19;i++){let o=add("cylinder",[0,0,0],[.05,1,.05],"#ebaeff",{emit:1.8,opacity:.8,add:true});arcs.push(o)}
 for(let i=0;i<70;i++){let o=add("sphere",[0,0,0],[.11,.11,.11],"#d9e9ff",{emit:1,opacity:.65,add:true});particles.push({o,a:rnd()*Math.PI*2,b:rnd()*6.28,d:4+rnd()*5,speed:.25+rnd()})}
 for(let i=0;i<55;i++){const row=Math.floor(rnd()*7),col=Math.floor(rnd()*7);let p=[(col-3)*10+(rnd()-.5)*5,1+rnd()*3,(row-3)*10+(rnd()-.5)*5];let o=add("cube",p,[.065,.28,.065],"#ff925b",{emit:1.7,opacity:.55,add:true,hidden:true});environmentFX.push({o,base:p.slice(),phase:rnd()*6.28,speed:.3+rnd()})}
 const moving=new Set([...coreParts.map(p=>p.o),...arcs,...particles.map(p=>p.o),...controls.map(c=>c.button),...environmentFX.map(p=>p.o)]);
 for(let o of items)if(!moving.has(o))o.matrix=model(o);
 return {items,walls,controls,coreParts,emergencyLights,doors,players,arcs,particles,screens,environmentFX,podIndicators,podDoors};
}
export function createShip(){
 const items=[],add=(m,p,s,c,opt={})=>{let o=item(m,p,s,c,opt);items.push(o);return o};
 add("sphere",[22,-5,-38],[25,25,25],"#274a73",{emit:.18});
 add("sphere",[22,-5,-38],[25.5,25.5,25.5],"#54b5d1",{emit:.65,opacity:.12,add:true});
 add("torus",[22,-5,-38],[41,.7,41],"#5387a0",{r:[.38,.2,.22],opacity:.4,emit:.15});
 for(let i=0;i<280;i++){let a=rnd()*6.283,e=(rnd()-.5)*2.5,d=80+rnd()*50;let s=.045+rnd()*.18;add("sphere",[Math.sin(a)*Math.cos(e)*d,Math.sin(e)*d,Math.cos(a)*Math.cos(e)*d],[s,s,s],["#e4f8ff","#7fb5ff","#a9b7de","#fff1ba"][i%4],{emit:1.8})}
 add("cube",[0,0,0],[10,2.65,31],"#4b5c77",{grid:1});
 add("cube",[0,-.8,1],[13,1.3,25],"#253449",{grid:1});add("cube",[0,1.5,-4],[7.5,1.4,14],"#8a9cad");
 add("cube",[0,.3,15.5],[8,1.5,3.8],"#4c667c");add("cube",[0,.3,-16],[7,1.8,4.8],"#2d435a");
 for(let side of [-1,1]){
  add("cube",[side*8,0,1],[5.2,1.1,19],"#52677d",{grid:1});
  add("cube",[side*9,1.1,2],[3.5,1.6,13],"#283c57");
  add("cylinder",[side*9,.9,-6],[2.5,7.5,2.5],"#677d90",{r:[Math.PI/2,0,0]});
  add("sphere",[side*9,.9,-10],[2.1,2.1,2.5],"#56d8ff",{emit:1.7});
  add("sphere",[side*9,.9,-10.3],[3,3,4],"#3fceff",{emit:.75,opacity:.2,add:true});
  for(let j=0;j<16;j++){let z=-11+j*1.5;add("cube",[side*5.04,.5,z],[.07,.19,.85],"#a7ecff",{emit:1.5});add("cube",[side*10.65,.06,z],[.07,.13,.65],"#7cdbfb",{emit:.9})}
  for(let j=0;j<5;j++)add("cube",[side*8,1.95,-3+j*2.1],[3.5,.07,.15],"#8ccfff",{emit:.4});
 }
 for(let j=0;j<6;j++){let z=-10+j*4;add("cube",[0,2.26,z],[4,.1,.3],"#51d2fa",{emit:.9})}
 add("cube",[0,3.2,-6],[5,1.6,5],"#4b667f");add("cube",[0,3.85,-6],[4.5,.45,4.7],"#8edfff",{emit:.34});
 add("torus",[0,1.8,2],[9,1,9],"#65c8fa",{emit:.32});
 add("cylinder",[0,5.05,-7],[.18,3,.18],"#687b92");add("sphere",[0,6.5,-7],[.4,.4,.4],"#ff7771",{emit:1.4});
 return items
}
export function collides(f,x,z,closed=false){
 if(Math.abs(x)>34.6||Math.abs(z)>34.6)return true;
 let walls=closed?[...f.walls,...f.doors.filter(d=>!d.o.hidden)]:f.walls;walls=[...walls,...(f.podDoors||[]).filter(d=>!d.o.hidden)];
 const rad=.30;return walls.some(w=>Math.abs(x-w.x)<w.w/2+rad&&Math.abs(z-w.z)<w.d/2+rad)
}
export function lineShape(o,a,b){
 let v=b.map((x,i)=>x-a[i]),l=Math.hypot(...v),y=norm(v),x=norm(cross(Math.abs(y[1])>.95?[1,0,0]:[0,1,0],y)),z=cross(x,y);o.p=a.map((v,i)=>(v+b[i])/2);o.s[1]=l;o.matrix=new Float32Array([x[0]*o.s[0],x[1]*o.s[0],x[2]*o.s[0],0,y[0]*l,y[1]*l,y[2]*l,0,z[0]*o.s[2],z[1]*o.s[2],z[2]*o.s[2],0,...o.p,1])
}
