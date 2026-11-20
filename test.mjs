import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,writeFile,unlink,rmdir} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {Readable,Writable} from "node:stream";
import {handleAPI,MemoryStore,makeRoom,advance} from "./simulation.js";
import {EVENTS,ACTIONS,STARTUPS,STARTUP_DURATION,STARTUP_STAGES,SPAWN,MAP,controlStatus,emergencyActive,sectorRoute} from "./shared.js";
import {MUSIC_THEMES,themeFor} from "./music.js";
import {TRACKS,SOUNDTRACK,normaliseTrackName,trackForTheme} from "./soundtrack.js";
import {createFacility,collides} from "./renderer.js";

const secret="TEST-ONLY-administrator-code-2026";
const req=(path,b)=>new Request("http://localhost/api/"+path,b===undefined?{}:{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(b)});
const call=async(store,p,b,adminCode=secret)=>{const response=await handleAPI(req(p,b),store,{adminCode});return {status:response.status,body:await response.json()}};
const ask=async(store,p,b,adminCode=secret)=>{const r=await call(store,p,b,adminCode);assert.equal(r.status,200,JSON.stringify(r.body));return r.body};
const session=r=>({code:r.room.code,playerId:r.room.playerId,token:r.token});
const command=(store,p,hostAction,generation=0)=>ask(store,"sync",{...p,hostAction,generation});
const control=id=>ACTIONS.find(a=>a.id===id);
const press=(store,p,a,generation=0)=>ask(store,"sync",{...p,action:a.key,generation});
async function position(store,p,a,mutate){
 const r=await store.read(p.code),person=r.players[p.playerId],rev=r.revision;
 Object.assign(person,{x:a.x,z:a.z,lastAction:0,lastSeen:Date.now()});if(mutate)mutate(r);r.lastTick=Date.now();assert.ok(await store.write(r,rev))
}
test("real multiplayer rooms share movement, chat, simulation and host migration",async()=>{
 const store=new MemoryStore(),a=await ask(store,"create",{name:"Test Lab",username:"Ada",config:{visibility:"public",max:2,frequency:"Off",special:false}}),pa=session(a);
 assert.equal((await ask(store,"rooms")).rooms.length,1);
 const b=await ask(store,"join",{code:pa.code,username:"Bob"}),pb=session(b);
 assert.equal(b.room.players.length,2);
 await ask(store,"sync",{...pb,generation:0,position:{x:SPAWN.x+1.1,z:SPAWN.z,y:0,yaw:Math.PI}});
 const br=await ask(store,"sync",pa);assert.equal(br.room.players.find(p=>p.id===pb.playerId).x,SPAWN.x+1.1);
 await ask(store,"sync",{...pb,chat:"Hello from Bob"});
 assert.equal((await ask(store,"sync",pa)).room.chat.at(-1).text,"Hello from Bob");
 await position(store,pa,control("ignite"));assert.equal((await press(store,pa,control("ignite"))).room.state.phase,"STARTING");
 assert.equal((await ask(store,"sync",pb)).room.state.phase,"STARTING");
 await ask(store,"leave",pa);assert.equal((await ask(store,"sync",pb)).room.host,pb.playerId);
 await ask(store,"leave",pb);assert.equal(await store.read(pb.code),null);
});
test("sixteen simultaneous players fit in a room; further joins are denied",async()=>{
 const store=new MemoryStore(),host=await ask(store,"create",{username:"Host",config:{max:16}});
 const code=host.room.code;
 const joiners=await Promise.all(Array.from({length:15},(_,i)=>ask(store,"join",{code,username:"Crew "+i})));
 assert.equal(new Set(joiners.map(p=>p.room.playerId)).size,15);
 const all=await ask(store,"sync",session(host));assert.equal(all.room.players.length,16);
 assert.equal((await call(store,"join",{code,username:"Overflow"})).status,409)
});
test("private room listings, invalid inputs and session tokens",async()=>{
 const store=new MemoryStore(),a=await ask(store,"create",{username:"Host",config:{visibility:"private"}});
 assert.equal((await ask(store,"rooms")).rooms.length,0);
 assert.equal((await call(store,"sync",{...session(a),token:"bad"})).status,401);
 assert.equal((await call(store,"join",{code:"invalid"})).status,400);
 assert.equal((await call(store,"create",null)).status,400);
 assert.equal((await call(store,"create",{config:null})).status,200)
});
test("administrator access is server authenticated, private and usable without host status",async()=>{
 const store=new MemoryStore(),host=await ask(store,"create",{username:"Host",config:{mode:"Standard",frequency:"Off"}});
 assert.equal(host.room.isAdmin,false);
 const denied=await command(store,session(host),"admin:scenario:meltdown");assert.match(denied.message,/ADMIN AUTHORISATION/);
 const admin=await ask(store,"join",{code:host.room.code,username:secret}),pa=session(admin);
 assert.equal(admin.room.isAdmin,true);
 assert.equal(admin.room.players.find(p=>p.id===pa.playerId).name,"Facility Administrator");
 assert.ok(!JSON.stringify(admin.room).includes(secret));
 assert.ok(admin.room.players.every(p=>!Object.hasOwn(p,"token")&&!Object.hasOwn(p,"admin")));
 assert.notEqual(admin.room.host,pa.playerId);
 const started=await command(store,pa,"admin:scenario:meltdown");assert.equal(started.room.state.event.id,"meltdown");
 const regular=await ask(store,"sync",session(host));assert.equal(regular.room.state.event.id,"meltdown");assert.equal(regular.room.isAdmin,false);
 const tooShort=await ask(store,"create",{username:"abcd"}, "abcd");assert.equal(tooShort.room.isAdmin,false)
});
test("simultaneous administrator events are interlocked; reset clears state and rejects stale commands",async()=>{
 const store=new MemoryStore(),a=await ask(store,"create",{username:secret,config:{frequency:"Off"}}),pa=session(a);
 const b=await ask(store,"join",{code:pa.code,username:secret}),pb=session(b);
 const results=await Promise.all([command(store,pa,"admin:scenario:meltdown"),command(store,pb,"admin:scenario:freezedown")]);
 assert.equal(results.filter(r=>/initiated/.test(r.message)).length,1);
 assert.equal(results.filter(r=>/ONE EVENT AT A TIME/.test(r.message)).length,1);
 const reset=await command(store,pb,"admin:reset");
 assert.equal(reset.room.state.generation,1);assert.equal(reset.room.state.phase,"OFFLINE");assert.equal(reset.room.state.event,null);
 assert.equal(reset.room.state.power,100);assert.ok(reset.room.players.every(p=>p.x===SPAWN.x&&p.z===SPAWN.z&&!p.escaped));
 assert.equal((await command(store,pa,"admin:scenario:meltdown",0)).room.state.event,null)
});
test("five ignition programs reach distinct cinematic outcomes",()=>{
 for(const variant of STARTUPS){
  const t=Date.now(),{room}=makeRoom("Startup",{auto:true,frequency:"Off"},"Host",t);
  advance(room,t+3500);room.state.startup=variant;
  advance(room,t+3500+27010);assert.equal(room.state.startStep,4);
  advance(room,t+3500+STARTUP_DURATION+250);assert.ok(room.state.discovered.includes(variant));
  if(variant==="Failed Startup")assert.equal(room.state.result.title,"Failed Startup");
  else if(variant==="Startup Overload")assert.equal(room.state.event.id,"meltdown");
  else if(variant==="Unstable Shield Startup")assert.equal(room.state.containment,false);
  else assert.equal(room.state.phase,"STABLE")
 }
});
test("administrator ignition programs honor the scenario interlock",async()=>{
 const store=new MemoryStore(),created=await ask(store,"create",{username:secret,config:{frequency:"Off"}}),p=session(created);
 assert.equal((await command(store,p,"admin:startup:Rainbow Startup")).room.state.startup,"Rainbow Startup");
 assert.match((await command(store,p,"admin:scenario:meltdown")).message,/ONE EVENT AT A TIME/)
});
test("overheating starts the staged meltdown and can be recovered",()=>{
 const t=Date.now(),{room}=makeRoom("Simulation",{auto:true,frequency:"Off",special:false},"A",t);
 advance(room,t+3500);assert.equal(room.state.phase,"STARTING");room.state.startup="Normal Startup";
 advance(room,t+16500);assert.ok(room.state.startStep>=2);
 advance(room,t+3500+STARTUP_DURATION+50);assert.equal(room.state.phase,"STABLE");
 room.state.temp=127000;advance(room,t+40500);assert.equal(room.state.event.kind,"hot");
 room.state.temp=90000;advance(room,t+52000);assert.equal(room.state.result.title,"Laboratory Saved")
});
test("emergency controls are locked outside emergencies; escape and shutdown obey interlocks",async()=>{
 const store=new MemoryStore(),a=await ask(store,"create",{username:secret,config:{frequency:"Off",special:false}}),p=session(a);
 const pod=control("launch"),normal=control("shutdown"),emergency=control("emergency");
 await position(store,p,pod);assert.match((await press(store,p,pod)).message,/EMERGENCIES ONLY/);
 await position(store,p,emergency);assert.match((await press(store,p,emergency)).message,/NOT OPERATIONAL/);
 await position(store,p,normal,r=>Object.assign(r.state,{phase:"STABLE",temp:36000,onlineAt:Date.now()}));
 assert.equal((await press(store,p,normal)).room.state.shutdown.emergency,false);
 await command(store,p,"admin:reset");const e=await command(store,p,"admin:scenario:meltdown",1);assert.ok(emergencyActive(e.room.state));
 await position(store,p,normal);assert.match((await press(store,p,normal,1)).message,/USE EMERGENCY SHUTDOWN/);
 await position(store,p,emergency);assert.equal((await press(store,p,emergency,1)).room.state.shutdown.emergency,true);
 await position(store,p,pod);assert.ok((await press(store,p,pod,1)).room.players.find(v=>v.id===p.playerId).escaped);
 await position(store,p,emergency,r=>{r.state.shutdown.fail=false;r.state.shutdown.end=Date.now()-1});
 assert.equal((await ask(store,"sync",p)).room.state.result.title,"Successful Shutdown");
 const rebuilt=await command(store,p,"admin:reset",1);assert.equal(rebuilt.room.state.generation,2);assert.equal(rebuilt.room.state.result,null)
});
test("all event and startup themes are valid; every uploaded track is assigned",()=>{
 assert.equal(new Set(EVENTS.map(e=>e.id)).size,EVENTS.length);assert.equal(EVENTS.length,28);
 assert.ok(EVENTS.every(e=>e.name&&e.duration>20&&e.objective&&e.kind));
 assert.ok(ACTIONS.every((a,i)=>a.key===i));assert.ok(ACTIONS.every(a=>!a.bank));assert.equal(ACTIONS.length,25);
 assert.ok(STARTUP_STAGES.every((s,i)=>i===0||s.at>STARTUP_STAGES[i-1].at));
 assert.ok(EVENTS.every(e=>MUSIC_THEMES[e.id]&&themeFor({phase:"STABLE",event:e})===e.id&&trackForTheme(e.id)));
 assert.ok(Object.keys(MUSIC_THEMES).every(key=>SOUNDTRACK[key]));
 assert.equal(new Set(Object.values(SOUNDTRACK)).size,Object.keys(TRACKS).length);
 assert.equal(normaliseTrackName("Going Mental(3).mp3"),"goingmental");
 assert.equal(normaliseTrackName("Reactor Startup Song(3).mp3"),"reactorstartupsong")
});
function scan(f,closed){
 for(const d of f.doors)d.o.hidden=!closed;
 const step=.5,k=(x,z)=>x+","+z,q=[[Math.round(SPAWN.x/step),Math.round(SPAWN.z/step)]],seen=new Set([k(...q[0])]);
 for(let i=0;i<q.length;i++){
  const [x,z]=q[i];for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const a=x+dx,b=z+dz,key=k(a,b);if(seen.has(key)||collides(f,a*step,b*step,closed))continue;seen.add(key);q.push([a,b])
  }
 }return q.map(([x,z])=>[x*step,z*step])
}
test("all 49 ship sectors and every control are reachable; emergency lock leaves non-core sectors connected",()=>{
 const fake={texture:()=>({t:{},c:{}})},f=createFacility(fake,0);
 for(const closed of [false,true]){
  const points=scan(f,closed);
  for(let r=0;r<7;r++)for(let c=0;c<7;c++){
   if(closed&&MAP[r][c]==="REACTOR")continue;
   assert.ok(points.some(([x,z])=>Math.abs(x-(c-3)*10)<4.75&&Math.abs(z-(r-3)*10)<4.75),MAP[r][c]+" sector "+r+","+c+" must be reachable")
  }
  for(const a of ACTIONS)assert.ok(points.some(([x,z])=>Math.hypot(x-a.x,z-a.z)<2.25),a.label+" must be accessible")
 }
 assert.equal(f.controls.length,ACTIONS.length);
 const newer=createFacility(fake,1);assert.equal(newer.controls.length,f.controls.length);assert.equal(newer.walls.length,f.walls.length)
});
test("navigation route selects a shortest legal route avoiding sealed reactor sectors",()=>{
 const start=45,east=48,reactor=24;
 assert.deepEqual(sectorRoute(start,east),[45,46,47,48]);
 assert.deepEqual(sectorRoute(start,reactor,true),[]);
 const many=sectorRoute(start,3,true);assert.equal(many[0],start);assert.equal(many.at(-1),3);
 assert.ok(many.every(idx=>MAP[Math.floor(idx/7)][idx%7]!=="REACTOR"));
 assert.equal(sectorRoute(start,reactor,false).length,4);
 assert.deepEqual(sectorRoute(-1,48),[])
});
function httpRequest(server,path,method="GET",body,headers={}){
 return new Promise((resolve,reject)=>{
  const req=Readable.from(body===undefined?[]:[Buffer.from(JSON.stringify(body))]);
  Object.assign(req,{url:path,method,headers:body===undefined?headers:{"content-type":"application/json",...headers}});
  const chunks=[];let status=0,responseHeaders={};
  const res=new Writable({write(chunk,encoding,cb){chunks.push(Buffer.from(chunk));cb()}});
  res.headersSent=false;res.writeHead=(code,h)=>{status=code;responseHeaders=h;res.headersSent=true;return res};
  res.on("finish",()=>resolve({status,headers:responseHeaders,body:Buffer.concat(chunks)}));res.on("error",reject);server.emit("request",req,res)
 })
}
test("production HTTP handler serves the app, all track aliases and byte ranges",async()=>{
 const temp=await mkdtemp(join(tmpdir(),"frl-http-")),names=Object.values(TRACKS).map(t=>t.aliases?.[0]||t.title+"(3)."+t.file.split(".").pop());
 const oldPort=process.env.PORT,oldDir=process.env.FRL_MUSIC_DIR,oldSecret=process.env.ADMIN_ACCESS_CODE;
 let server;
 try{
  for(const name of names)await writeFile(join(temp,name),Buffer.from(Array.from({length:64},(_,i)=>i)));
  process.env.PORT="0";process.env.FRL_MUSIC_DIR=temp;process.env.ADMIN_ACCESS_CODE=secret;
  ({server}=await import("./server.mjs"));
  assert.equal((await httpRequest(server,"/healthz")).status,200);
  const page=(await httpRequest(server,"/")).body.toString();assert.match(page,/id="map-grid"/);assert.match(page,/id="admin-btn"/);
  const catalog=JSON.parse((await httpRequest(server,"/api/soundtrack")).body);assert.equal(Object.keys(catalog.tracks).length,Object.keys(TRACKS).length);
  const part=await httpRequest(server,catalog.tracks.mental,"GET",undefined,{range:"bytes=5-12"});
  assert.equal(part.status,206);assert.equal(part.headers["Content-Range"],"bytes 5-12/64");assert.equal(part.body.length,8);
  const stall=await httpRequest(server,catalog.tracks.stall,"GET");assert.equal(stall.status,200);assert.equal(stall.headers["Content-Type"],"audio/ogg");
  assert.equal((await httpRequest(server,"/.env")).status,404);
  const created=JSON.parse((await httpRequest(server,"/api/create","POST",{username:secret})).body);
  assert.equal(created.room.isAdmin,true);assert.ok(!JSON.stringify(created.room).includes(secret))
 }finally{
  if(server?.listening)await new Promise(done=>server.close(done));
  for(const [k,v] of [["PORT",oldPort],["FRL_MUSIC_DIR",oldDir],["ADMIN_ACCESS_CODE",oldSecret]])if(v===undefined)delete process.env[k];else process.env[k]=v;
  for(const name of names)await unlink(join(temp,name)).catch(()=>{});await rmdir(temp).catch(()=>{})
 }
});
