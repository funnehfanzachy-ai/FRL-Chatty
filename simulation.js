import {ACTIONS,EVENTS,STARTUPS,STARTUP_DURATION,STARTUP_STAGES,SPAWN,defaultConfig,MODE_NAMES,clamp,controlStatus,emergencyActive,cellName,eventStageLine} from "./shared.js";

const id=()=>crypto.randomUUID().replaceAll("-","");
const now=()=>Date.now();
const choose=a=>a[Math.floor(Math.random()*a.length)];
const clean=(v,n=40)=>String(v??"").replace(/[\u0000-\u001f\u007f]/g,"").trim().slice(0,n);
const code=()=>Array.from(crypto.getRandomValues(new Uint8Array(6)),n=>"ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[n%32]).join("");
export function configFrom(o={}){
 if(!o||typeof o!=="object"||Array.isArray(o))o={};
 return {...defaultConfig,max:clamp(Math.round(+o.max||16),1,16),mode:MODE_NAMES.includes(o.mode)?o.mode:"Standard",visibility:o.visibility==="private"?"private":"public",difficulty:["Easy","Normal","Hard"].includes(o.difficulty)?o.difficulty:"Normal",instability:clamp(+o.instability||1,.5,2.5),frequency:["Off","Low","Normal","High"].includes(o.frequency)?o.frequency:"Normal",auto:!!o.auto,special:o.special!==false,duration:clamp(+o.duration||30,5,120),access:o.access==="Host Only"?"Host Only":"Everyone"};
}
export function initialState(t=now()){
 return {phase:"OFFLINE",temp:0,stability:100,integrity:100,energy:0,pressure:0,heat:2,cooling:2,emitters:true,containment:true,power:100,backup:false,locked:false,doors:true,ack:false,event:null,startup:null,startAt:0,startStep:0,startProgress:0,shutdown:null,shutdownAvailable:true,announcements:[],seq:0,created:t,onlineAt:0,lastEvent:t,result:null,elapsed:0,repairs:0,actions:0,discovered:[],nextRandom:t+120000,trend:[0],generation:0};
}
function say(s,message,t=now()){
 s.announcements.push({id:++s.seq,text:message,time:t});
 s.announcements=s.announcements.slice(-12);
}
function sayOnce(s,key,message,t){if(!s[key]){s[key]=true;say(s,message,t)}}
function discover(s,name){if(!s.discovered.includes(name))s.discovered.push(name)}
function beginStartup(s,t,variant=null,special=true){
 if(s.phase!=="OFFLINE"||s.result||s.event||s.shutdown)return false;
 const r=Math.random();
 s.startup=variant|| (!special?"Normal Startup":r<.025?"Rainbow Startup":r<.06?"Startup Overload":r<.11?"Unstable Shield Startup":r<.16?"Failed Startup":"Normal Startup");
 s.phase="STARTING";s.startAt=t;s.temp=0;s.doors=false;s.emitters=true;s.containment=true;s.startStep=0;s.startProgress=0;s.ack=false;
 say(s,STARTUP_STAGES[0].line,t);return true;
}
function finish(s,title,t,success=false){
 if(s.result)return;
 s.result={title,success,at:t,elapsed:Math.round((t-s.created)/1000),operating:s.onlineAt?Math.round((t-s.onlineAt)/1000):0,event:s.event?.name||s.startup||"Operations",actions:s.actions,repairs:s.repairs};
 discover(s,title);s.phase=success?"OFFLINE":"DESTROYED";s.energy=0;s.shutdown=null;s.temp=success?0:s.temp;s.event=null;s.doors=true;
 say(s,success?"Emergency concluded. "+title+". Normal operations may resume.":"Final warning. "+title+". Facility systems lost.",t);
}
function startEvent(s,event,t){
 if(!event||s.event||s.result||s.phase==="STARTING"||s.shutdown||s.phase==="DESTROYED")return false;
 s.event={...event,started:t,stage:0,progress:0,repairs:0,repairedKeys:[],objective:event.objective};
 s.lastEvent=t;s.ack=false;discover(s,event.name);
 if(event.kind==="hot")s.temp=Math.max(s.temp,129000);
 if(event.kind==="cold")s.temp=Math.min(s.temp,1000);
 if(event.kind==="power"){s.power=0;s.backup=false}
 if(event.kind==="integrity"||event.kind==="collapse"){s.integrity=55;s.containment=false}
 if(event.kind==="bonus")s.stability=100;
 if(event.kind==="computer")s.power=55;
 if(event.id==="cooling")s.cooling=0;
 if(event.id==="emitter")s.emitters=false;
 if(event.kind==="hot")s.phase="MELTDOWN";
 else if(event.kind==="cold")s.phase="FREEZEDOWN";
 else if(event.kind==="collapse")s.phase="COLLAPSE";
 else if(event.kind==="integrity")s.phase="CONTAINMENT FAILURE";
 else if(event.kind!=="bonus")s.phase="UNSTABLE";
 else s.phase="STABLE";
 say(s,"Attention, all personnel. "+event.name+" detected. "+event.objective,t);return true;
}
const eventBy=id=>EVENTS.find(e=>e.id===id);
function triggerScenario(s,scenario,t){
 const startup=STARTUPS.includes(scenario);
 const gate=controlStatus(s,{id:startup?"startup":"scenario"},{},true);
 if(gate)return gate;
 if(startup){return beginStartup(s,t,scenario)?scenario+" initiated":"Ignition unavailable"}
 const e=eventBy(scenario);if(!e)return "Unknown event";
 if(s.phase==="OFFLINE"){s.phase="STABLE";s.temp=36000;s.onlineAt=t;s.emitters=true;s.containment=true;s.doors=true}
 return startEvent(s,e,t)?e.name+" initiated":"Event director busy";
}
function regenerate(room,t){
 const previous=room.state;
 room.state=initialState(t);room.state.generation=(previous.generation||0)+1;room.state.resetAt=t;
 room.lastTick=t;
 for(const p of Object.values(room.players))Object.assign(p,SPAWN,{escaped:false,actions:0,repairs:0,lastAction:0});
 say(room.state,"Facility regeneration complete. All systems and map geometry have been reset.",t);
}
export function advance(room,t){
 t=Math.max(t,room.lastTick);
 const s=room.state,c=room.config,dt=clamp((t-room.lastTick)/1000,0,10);
 room.lastTick=t;s.elapsed=Math.round((t-s.created)/1000);
 if(s.result)return;
 if(s.phase==="OFFLINE"&&c.auto&&!s.autoHeld&&!s.startup&&s.elapsed>=3)beginStartup(s,t,null,c.special);
 if(s.phase==="STARTING"){
  const elapsed=t-s.startAt,f=clamp(elapsed/STARTUP_DURATION,0,1),formation=clamp((elapsed-14000)/19000,0,1);
  s.startProgress=f;s.temp=Math.round(formation*formation*(s.startup==="Startup Overload"?76000:36000));s.energy=formation*70;s.pressure=formation*30;s.stability=60+40*f;
  s.integrity=s.startup==="Unstable Shield Startup"?Math.max(45,100-formation*35):Math.min(100,65+f*35);
  let step=STARTUP_STAGES.findLastIndex(p=>elapsed>=p.at);
  if(step>s.startStep){for(let i=s.startStep+1;i<=step;i++)say(s,STARTUP_STAGES[i].line,t);s.startStep=step}
  if(s.startup==="Failed Startup"&&elapsed>=27000)sayOnce(s,"startupFault","Ignition fault detected. Responders standing by for automatic isolation.",t);
  if(s.startup==="Startup Overload"&&elapsed>=27000)sayOnce(s,"startupFault","Unexpected energy surge. Primary monitoring systems are approaching their limit.",t);
  if(f>=1){
   discover(s,s.startup);s.doors=true;s.onlineAt=t;s.nextRandom=t+({Off:999999999,Low:170000,Normal:90000,High:38000}[c.frequency]||90000)*(c.mode==="Survival"?.55:c.mode==="Hardcore"?.38:1);
   if(s.startup==="Failed Startup"){finish(s,"Failed Startup",t,true)}
   else {s.phase="STABLE";s.temp=36000;s.integrity=100;say(s,"Reactor ignition successful. Welcome to the Fusion Reactor Laboratory.",t);
    if(s.startup==="Unstable Shield Startup"){s.integrity=72;s.containment=false}
    if(s.startup==="Startup Overload")startEvent(s,eventBy("meltdown"),t)}
  }
  return;
 }
 if(s.shutdown){
  s.phase="SHUTTING DOWN";s.temp=Math.max(0,s.temp-dt*2500);s.energy=Math.max(0,s.energy-dt*8);
  if(s.event){const e=s.event;e.progress=clamp((t-e.started)/(e.duration*1000),0,1);e.stage=Math.min(3,Math.floor(e.progress*4));if(e.progress>=1&&s.shutdown.end>e.started+e.duration*1000){finish(s,"Emergency shutdown failed — facility lost",t,false);return}}
  if(t>=s.shutdown.end){
   const failed=s.shutdown.fail;s.shutdown=null;
   if(failed){s.power=18;s.shutdownAvailable=false;s.shutdownRetry=t+15000;discover(s,"Shutdown Failure");say(s,"Shutdown unsuccessful. Emergency systems remain active. Please await further instructions.",t);s.phase=s.event?({cold:"FREEZEDOWN",hot:"MELTDOWN",collapse:"COLLAPSE",integrity:"CONTAINMENT FAILURE"}[s.event.kind]||"UNSTABLE"):(s.temp>80000?"CRITICAL":"UNSTABLE")}
   else finish(s,"Successful Shutdown",t,true)
  }return;
 }
 if(s.shutdownRetry&&t>=s.shutdownRetry){s.shutdownAvailable=true;s.shutdownRetry=0;say(s,"Shutdown systems available.",t)}
 if(s.phase!=="OFFLINE"){
  const diff=(c.difficulty==="Hard"?1.25:c.difficulty==="Easy"?.75:1)*(c.mode==="Hardcore"?1.5:c.mode==="Survival"?1.2:1);
  const delta=((s.heat-s.cooling)*460+(s.emitters?0:-170)+(s.power<40?120:0))*c.instability*diff;
  s.temp=clamp(s.temp+delta*dt,0,240000);
  s.integrity=clamp(s.integrity+dt*(s.containment? .7:-1.3)-(s.temp>100000?dt*.6:0),0,100);
  s.stability=clamp(100-Math.abs(s.temp-36000)/1700-(100-s.integrity)*.45,0,100);
  s.energy=clamp(s.temp/650+s.heat*5,0,230);s.pressure=clamp(s.temp/1200,0,200);
  if(s.backup)s.power=clamp(s.power+dt*5,0,100);
  if(!s.event){
   if(s.temp>=125000)startEvent(s,eventBy(Math.random()<.025&&c.special?"rainbowMeltdown":"meltdown"),t);
   else if(s.temp<=1000&&s.onlineAt)startEvent(s,eventBy(Math.random()<.025&&c.special?"rainbowFreezedown":"freezedown"),t);
   else if(s.integrity<25)startEvent(s,eventBy("containment"),t);
   else s.phase=s.temp>80000?"CRITICAL":s.temp>55000?"OVERHEATING":s.temp<9000?"FREEZING":s.stability<60?"UNSTABLE":"STABLE";
   if(!s.event&&t>=s.nextRandom&&c.frequency!=="Off"){
    let weights={Common:18,Uncommon:9,Rare:4,"Very Rare":1.4,Legendary:.35,Classified:.14};
    let pool=EVENTS.filter(e=>(c.special||!["Classified","Legendary","Very Rare"].includes(e.rarity))&&!["hot","cold"].includes(e.kind));
    let total=pool.reduce((sum,e)=>sum+weights[e.rarity],0),r=Math.random()*total;
    startEvent(s,pool.find(e=>(r-=weights[e.rarity])<=0)||pool[0],t)
   }
  }
 }
 if(s.event){
  const e=s.event;e.progress=clamp((t-e.started)/(e.duration*1000),0,1);
  const stage=Math.min(3,Math.floor(e.progress*4));
  if(stage>e.stage){e.stage=stage;say(s,eventStageLine(e,stage),t)}
  if(e.kind==="hot"){s.temp=clamp(s.temp+dt*(130+e.stage*125),0,240000);s.stability=clamp(s.stability-dt*e.stage,0,100)}
  if(e.kind==="cold"){s.temp=Math.max(0,s.temp-dt*(115+e.stage*115))}
  if(e.kind==="collapse"||e.kind==="integrity")s.integrity=clamp(s.integrity-dt*(.1+e.stage*.2),0,100);
  if(e.kind==="power"&&!s.backup)s.power=Math.max(0,s.power-dt*2);
  if(e.kind==="bonus"){s.stability=100;s.integrity=100}
  if(e.id==="plasma"||e.id==="resonance"){s.stability=clamp(s.stability-(e.stage+1)*7,0,100);s.energy=clamp(s.energy+Math.sin((t-e.started)/750)*(12+e.stage*9),0,240)}
  if(e.id==="hypercore"){s.energy=170+e.progress*110;s.stability=clamp(s.stability-e.progress*42,0,100)}
  if(e.id==="mainframe"){s.power=s.backup?Math.max(s.power,70):55+Math.sin((t-e.started)/1800)*12;s.stability=clamp(s.stability-e.progress*25,0,100)}
  if(e.id==="omega"){s.pressure=clamp(s.pressure+e.progress*40,0,200);s.energy=100+e.progress*85;s.stability=clamp(s.stability-e.progress*50,0,100)}
  const enough=e.kind==="hot"?s.temp<100000:e.kind==="cold"?s.temp>14000:e.kind==="integrity"||e.kind==="collapse"?s.containment&&s.integrity>=65&&e.repairs>=2:e.kind==="power"?s.backup&&s.power>=85&&e.repairs>=1:e.kind==="computer"?e.repairs>=2:e.kind==="repair"?e.repairs>=(e.id==="aurelius"?4:3):false;
  if(enough&&e.progress>.05){finish(s,e.id==="mainframe"?"Mainframe Recovered":e.id==="aurelius"||e.id==="omega"?"Classified Protocol Completed":"Laboratory Saved",t,true)}
  else if(e.progress>=1){const escaped=Object.values(room.players).filter(p=>p.escaped).length;finish(s,e.kind==="bonus"?"Golden Core Discovery":e.kind==="cold"?"Freezedown":e.kind==="hot"?"Reactor Meltdown":e.id==="void"?"Lost in the Void":e.kind==="collapse"||e.kind==="integrity"?"Containment Collapse":escaped?"Emergency Evacuation":"Total Facility Loss",t,e.kind==="bonus"||escaped>0)}
 }
 if(!s.result&&s.elapsed>=c.duration*60)finish(s,"Shift Complete",t,true);
 if(!s.lastTrend||t-s.lastTrend>1500){s.trend=[...s.trend.slice(-39),s.temp];s.lastTrend=t}
}
export function makeRoom(name,config,username,t=now(),adminCode=""){
 const room={code:code(),name:clean(name,45)||"Fusion Laboratory",config:configFrom(config),players:{},host:null,state:initialState(t),chat:[],lastTick:t,updated:t,revision:0};
 const player=addPlayer(room,username,t,adminCode);say(room.state,"Welcome aboard. Facility operations are standing by.",t);return {room,player};
}
function adminMatch(name,secret){
 const a=String(name??""),b=String(secret??"");
 if(b.length<24||a.length!==b.length)return false;
 let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);
 return diff===0;
}
function addPlayer(room,name,t,adminCode=""){
 const admin=adminMatch(name,adminCode);
 const p={id:id(),token:id(),name:admin?"Facility Administrator":String(name??"").length>22?"Operator":clean(name,22)||"Operator",admin,...SPAWN,lastSeen:t,escaped:false,actions:0,repairs:0};room.players[p.id]=p;if(!room.host)room.host=p.id;return p;
}
function prune(room,t){
 for(const [key,p] of Object.entries(room.players))if(t-p.lastSeen>40000)delete room.players[key];
 if(!room.players[room.host])room.host=Object.keys(room.players)[0]||null;
}
const chat=(room,from,message,t)=>{room.chat.push({id:id(),from,text:clean(message,160),time:t});room.chat=room.chat.slice(-40)};
function action(room,p,key,t){
 const s=room.state;const a=ACTIONS[key];if(!a||p.escaped)return "Control unavailable";
 if(Math.hypot(p.x-a.x,p.z-a.z)>4.7)return "Move closer to the control";
 const blocked=controlStatus(s,a,room.config,room.host===p.id||p.admin);if(blocked)return blocked;
 if(p.lastAction&&t-p.lastAction<300)return "Control cooling down";
 p.lastAction=t;s.actions++;p.actions++;
 const repaired=()=>{if(s.event?.repairedKeys?.includes(key))return;s.repairs++;p.repairs++;if(s.event){s.event.repairs++;(s.event.repairedKeys??=[]).push(key)}s.integrity=clamp(s.integrity+12,0,100);say(s,p.name+" has restored a facility subsystem.",t)};
 switch(a.id){
 case "ignite":beginStartup(s,t,null,room.config.special);break;
 case "startup":case "scenario":return triggerScenario(s,a.scenario,t);
 case "regenerate":regenerate(room,t,p,true);return "Facility regenerated — new map generation "+room.state.generation;
 case "shutdown":case "emergency":
  s.shutdown={start:t,end:t+(a.id==="emergency"?15000:18000),emergency:a.id==="emergency",fail:a.id==="emergency"&&Math.random()<(s.event?.kind==="collapse"?.25:.14)};
  s.phase="SHUTTING DOWN";say(s,(a.id==="emergency"?"Emergency shutdown":"Normal shutdown")+" requested. Stand by for confirmation.",t);break;
 case "heatUp":s.heat=clamp(s.heat+1,0,4);break;
 case "heatDown":s.heat=clamp(s.heat-1,0,4);break;
 case "coolUp":s.cooling=clamp(s.cooling+1,0,4);break;
 case "coolDown":s.cooling=clamp(s.cooling-1,0,4);break;
 case "emitters":s.emitters=!s.emitters;break;
 case "containment":s.containment=!s.containment;break;
 case "doors":s.doors=!s.doors;break;
 case "lockdown":s.locked=!s.locked;break;
 case "alarm":s.ack=true;break;
 case "backup":s.backup=true;s.power=Math.max(s.power,45);repaired();break;
 case "power":s.power=100;repaired();break;
 case "repair":case "diagnostic":case "resetMainframe":s.emitters=true;repaired();break;
 case "coolRepair":s.cooling=Math.max(2,s.cooling);repaired();break;
 case "launch":p.escaped=true;discover(s,"The Final Escape");say(s,p.name+" has launched an escape pod.",t);break;
 case "announce":say(s,"Attention, all personnel. Please follow all marked safety routes and monitor reactor condition.",t);break;
 }
 return a.label+" · accepted";
}
export function publicRoom(r,me){
 const players=Object.values(r.players).map(({token,admin,...p})=>p);
 return {code:r.code,name:r.name,config:r.config,host:r.host,playerId:me?.id,isAdmin:!!me?.admin,players,state:r.state,chat:r.chat,serverTime:now()};
}
export class MemoryStore{
 constructor(){this.rooms=new Map()}
 sweep(){for(const [c,r] of this.rooms)if(r.updated<now()-90000)this.rooms.delete(c)}
 async insert(r){this.sweep();if(this.rooms.has(r.code)||this.rooms.size>=1000)return false;this.rooms.set(r.code,structuredClone(r));return true}
 async read(c){this.sweep();const r=this.rooms.get(c);return r?structuredClone(r):null}
 async write(r,rev){const old=this.rooms.get(r.code);if(!old||old.revision!==rev)return false;if(!Object.keys(r.players).length){this.rooms.delete(r.code);return true}r.revision=rev+1;this.rooms.set(r.code,structuredClone(r));return true}
 async list(){this.sweep();return [...this.rooms.values()].filter(r=>r.updated>now()-40000).map(r=>structuredClone(r))}
}
export class D1Store{
 constructor(db){this.db=db}
 async insert(r){let a=await this.db.prepare("INSERT OR IGNORE INTO rooms(code,revision,updated,body) VALUES(?,?,?,?)").bind(r.code,r.revision,r.updated,JSON.stringify(r)).run();return a.meta.changes===1}
 async read(c){let a=await this.db.prepare("SELECT body,revision FROM rooms WHERE code=?").bind(c).first();return a?{...JSON.parse(a.body),revision:a.revision}:null}
 async write(r,rev){r.revision=rev+1;let a=await this.db.prepare("UPDATE rooms SET revision=?, updated=?, body=? WHERE code=? AND revision=?").bind(r.revision,r.updated,JSON.stringify(r),r.code,rev).run();return a.meta.changes===1}
 async list(){let a=await this.db.prepare("SELECT body FROM rooms WHERE updated>? ORDER BY updated DESC LIMIT 80").bind(now()-40000).all();return a.results.map(r=>JSON.parse(r.body))}
}
const json=(o,status=200)=>new Response(JSON.stringify(o),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
export async function handleAPI(request,store,{adminCode=""}={}){
 const path=new URL(request.url).pathname,t=now();
 try{
  if(path==="/api/rooms"&&request.method==="GET"){
   const rooms=await store.list();return json({rooms:rooms.filter(r=>r.config.visibility==="public").map(r=>({code:r.code,name:r.name,count:Object.values(r.players).filter(p=>t-p.lastSeen<40000).length,max:r.config.max,mode:r.config.mode,phase:r.state.phase})).filter(r=>r.count>0)});
  }
  if(request.method!=="POST")return json({error:"Method not allowed"},405);
  const b=await request.json().catch(()=>null);
  if(!b||typeof b!=="object"||Array.isArray(b))return json({error:"Invalid request body"},400);
  if(path==="/api/create"){
   for(let i=0;i<5;i++){const {room,player}=makeRoom(b.name,b.config,b.username,t,adminCode);if(await store.insert(room))return json({room:publicRoom(room,player),token:player.token})}
   return json({error:"Room creation busy. Try again."},503);
  }
  const c=String(b.code??"").trim().toUpperCase();if(!/^[A-Z0-9]{6}$/.test(c))return json({error:"Enter a valid six-character room code."},400);
  for(let attempt=0;attempt<32;attempt++){
   const r=await store.read(c);if(!r)return json({error:"Room not found. Check the code."},404);
   const rev=r.revision;prune(r,t);advance(r,t);r.updated=t;
   if(path==="/api/join"){
    if(Object.keys(r.players).length>=r.config.max)return json({error:"Room is full."},409);
    const p=addPlayer(r,b.username,t,adminCode);chat(r,"SYSTEM",p.name+" joined the facility.",t);
    if(await store.write(r,rev))return json({room:publicRoom(r,p),token:p.token});continue;
   }
   const p=r.players[b.playerId];if(!p||!b.token||p.token!==b.token)return json({error:"Session expired. Rejoin the room."},401);
   let message="";
   if(path==="/api/leave"){delete r.players[p.id];prune(r,t);chat(r,"SYSTEM",p.name+" disconnected.",t);if(await store.write(r,rev))return json({ok:true});continue}
   if(path!=="/api/sync")return json({error:"Unknown request"},404);
   const currentGeneration=r.state.generation||0,stale=Number.isInteger(b.generation)&&b.generation!==currentGeneration;
   const movement=stale?null:b.position;
   if(movement&&[movement.x,movement.y,movement.z,movement.yaw].every(Number.isFinite)&&!p.escaped){
    const limit=clamp((t-p.lastSeen)/1000*13+3,3,18);
    if(Math.hypot(movement.x-p.x,movement.z-p.z)<=limit){p.x=clamp(movement.x,-34,34);p.z=clamp(movement.z,-34,34);p.y=clamp(movement.y,0,3);p.yaw=clamp(movement.yaw,-10000,10000)}
   }
   p.lastSeen=t;
   if(typeof b.action==="number"&&!stale)message=action(r,p,b.action,t);
   if(typeof b.chat==="string"&&clean(b.chat)&&(!p.chatAt||t-p.chatAt>550)){chat(r,p.name,b.chat,t);p.chatAt=t}
   if(typeof b.hostAction==="string"&&!stale){
    const cmd=b.hostAction;
    if(cmd==="reset"){
     if(r.host!==p.id&&!p.admin)message="Only the host or an administrator may restart a shift";
     else{regenerate(r,t);message="Facility regenerated"}
    }else if(cmd.startsWith("admin:")){
     if(!p.admin)message="ADMIN AUTHORISATION REQUIRED";
     else if(cmd==="admin:reset"){regenerate(r,t);message="Facility regenerated"}
     else if(cmd.startsWith("admin:startup:"))message=triggerScenario(r.state,cmd.slice(14),t);
     else if(cmd.startsWith("admin:scenario:"))message=triggerScenario(r.state,cmd.slice(15),t);
     else message="Unknown administrator command";
    }else message="Unknown control";
   }
   if(await store.write(r,rev))return json({room:publicRoom(r,p),message});
  }
  return json({error:"Room busy. Retrying is safe."},503)
 }catch(e){return json({error:"Server unavailable: "+String(e.message).slice(0,160)},500)}
}
