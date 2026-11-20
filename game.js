import {ACTIONS,MAP,EVENTS,STARTUPS,STARTUP_DURATION,STARTUP_STAGES,MODE_NAMES,SPAWN,cellName,fmt,clamp,colorFor,controlStatus,emergencyActive,sectorRoute} from "./shared.js";
import {Engine,createFacility,createShip,item,hex,collides,lineShape} from "./renderer.js";
import {AudioSystem} from "./audio.js";
const $=id=>document.getElementById(id),show=(id,vis=true)=>$(id).classList.toggle("hidden",!vis),set=(id,v)=>$(id).textContent=v;
const escape=s=>String(s).replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[x]));
const html=(id,h)=>$(id).innerHTML=h;
const defaults={quality:"High",distance:65,fov:76,master:65,music:36,sfx:65,ambient:55,voice:35,sensitivity:50,invert:false,bob:true,flashing:false,shake:false,distortion:false,subtitles:true,particles:"High",colorblind:false};
let settings={...defaults};try{settings={...defaults,...JSON.parse(localStorage.getItem("frl-settings")||"{}")}}catch{}
let archive={events:[],xp:0,achievements:[]};try{archive={...archive,...JSON.parse(localStorage.getItem("frl-archive")||"{}")}}catch{}
const saveArchive=()=>localStorage.setItem("frl-archive",JSON.stringify(archive));
const username=$("username");username.value=localStorage.getItem("frl-name")||"Operator";

const operator=()=>username.value.trim()||"Operator";
let mapTarget=null,mapSignature="";
let engine,facility,ship;
try{engine=new Engine($("world"));ship=createShip()}catch(e){$("world").style.background="radial-gradient(circle at 70% 40%,#183b63,#020a16 65%)";console.error(e);setTimeout(()=>toastMenu("WebGL unavailable. Enable hardware acceleration."),100)}
let room=null,token="",me="",active=false,inFlight=false,nextAction=null,nextChat="",nextHost="";
let local={...SPAWN,pitch:0,vy:0,eye:1.68},keys={},remote=new Map(),lastFrame=performance.now(),lastSync=0,clock=0,aim=null,torch=false,mapOpen=false,tabOpen=false,chatOpen=false,paused=false,launchAt=0,prevResult=0,lastReset=0,lastAnn=0,toastTimer=0,announceTimer=0,lastFoot=0,lastStatus=0,lastScreen=0,frame=0,connected=true,networkErrors=0,manualLook=false;
const audio=new AudioSystem(settings);
let aimBlocked=null,inspection=false,snapshotAt=performance.now(),lastIgnitionPulse=-1;
const serverNow=()=>room?room.serverTime+Math.min(1600,Math.max(0,performance.now()-snapshotAt)):Date.now();
const loadingTips=["Always test safety systems before raising heat.","Use M to open the spacecraft schematic.","Visit the west crew deck for hydroponics, logistics and a lounge.","Only one event can be activated at a time.","Escape pods and emergency shutdown unlock only in emergencies.","Use F for your flashlight during power outages."];
let loadingCounter=0;
function toastMenu(s){let el=document.createElement("div");el.className="toast";el.style.zIndex="100";el.textContent=s;document.body.appendChild(el);setTimeout(()=>el.remove(),4000)}
function toast(s){clearTimeout(toastTimer);set("toast",s);show("toast");toastTimer=setTimeout(()=>show("toast",false),2800)}
const request=async(path,body)=>{const signal=typeof AbortSignal.timeout==="function"?AbortSignal.timeout(10000):undefined;const res=await fetch("/api/"+path,body===undefined?{cache:"no-store",signal}:{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),signal});let json;try{json=await res.json()}catch{throw Error("Unable to reach the game server")}if(!res.ok)throw Error(json.error||"Network request failed");return json};
function loading(v){show("loading",v);show("modal",false);if(v){loadingCounter++;set("load-tip",loadingTips[loadingCounter%loadingTips.length])}}
function modal(title,contents){set("modal-title",title);html("modal-body",contents);show("modal");if(document.pointerLockElement)document.exitPointerLock();paused=active;audio.click()}
function closeModal(){show("modal",false);paused=false;if(active&&!launchAt&&(!room.state.result||inspection))show("capture",!document.pointerLockElement)}
$("close-modal").onclick=closeModal;
$("modal").addEventListener("click",e=>{if(e.target===$("modal"))closeModal()});
const field=(name,id,type="text",value="",extra="")=>`<div class="field"><label for="${id}">${name}</label><input type="${type}" id="${id}" value="${escape(value)}" ${extra}></div>`;
const select=(name,id,values,d)=>`<div class="field"><label for="${id}">${name}</label><select id="${id}">${values.map(v=>`<option ${v===d?"selected":""}>${escape(v)}</option>`).join("")}</select></div>`;
function createForm(single=false){
 modal(single?"SINGLEPLAYER / NEW SHIFT":"CREATE LABORATORY",`<p>Configure a private or public facility. Every operator shares its simulation and event progression.</p><form id="create-form"><div class="form-grid">${field("Room name","rname","text",single?"Private Experiment":"Fusion Laboratory",'maxlength="45" required')}${select("Gameplay mode","rmode",MODE_NAMES,single?"Sandbox":"Standard")}${select("Visibility","rvisibility",["Public","Private"],single?"Private":"Public")}${field("Maximum personnel","rmax","number",single?1:16,'min="1" max="16"')}${select("Difficulty","rdifficulty",["Easy","Normal","Hard"],"Normal")}${field("Reactor instability","rinstability","number",1,'min=".5" max="2.5" step=".25"')}${select("Random event frequency","rfrequency",["Off","Low","Normal","High"],"Normal")}${field("Shift duration (minutes)","rduration","number",30,'min="5" max="120"')}${select("Control permissions","raccess",["Everyone","Host Only"],"Everyone")}${select("Special events","rspecial",["Enabled","Disabled"],"Enabled")}${select("Auto ignition","rauto",["Disabled","Enabled"],"Disabled")}</div><div class="form-actions"><button type="submit" class="primary">ESTABLISH ROOM</button></div></form><div id="form-error" class="error"></div>`);
 $("create-form").onsubmit=async e=>{e.preventDefault();const config={mode:$("rmode").value,max:+$("rmax").value,visibility:$("rvisibility").value.toLowerCase(),difficulty:$("rdifficulty").value,instability:+$("rinstability").value,frequency:$("rfrequency").value,duration:+$("rduration").value,access:$("raccess").value,special:$("rspecial").value==="Enabled",auto:$("rauto").value==="Enabled"};if(single){config.visibility="private";config.max=1}await connect("create",{name:$("rname").value,config,username:operator()})}
}
async function connect(path,body){
 if(!engine){toastMenu("The 3D engine needs WebGL 2.");return}
 loading(true);
 try{let r=await request(path,body);room=r.room;token=r.token;me=room.playerId;const display=room.players.find(p=>p.id===me)?.name||"Operator";username.value=display;if(room.isAdmin)localStorage.removeItem("frl-name");else localStorage.setItem("frl-name",display);enter();loading(false)}catch(e){loading(false);modal("CONNECTION FAILED",`<p>${escape(e.message)}</p><button id="back-menu">RETURN</button>`);$("back-menu").onclick=closeModal}
}
async function browse(){
 modal("SERVER BROWSER",`<div class="form-actions" style="margin:0 0 12px"><button id="refresh">REFRESH LIVE ROOMS</button><button id="new-room" class="primary">CREATE ROOM</button></div><div id="room-list"><p>Retrieving available laboratories...</p></div>`);
 $("refresh").onclick=browse;$("new-room").onclick=()=>createForm();
 try{let {rooms}=await request("rooms");if(!$("room-list"))return;html("room-list",rooms.length?rooms.map(r=>`<div class="list-entry"><div><strong>${escape(r.name)}</strong><small>${escape(r.mode)} · ${escape(r.phase)} · ${r.code}</small></div><div><span>${r.count}/${r.max}</span> <button data-join="${r.code}" ${r.count>=r.max?"disabled":""}>JOIN</button></div></div>`).join(""):'<div class="empty"><b>No public rooms online</b><p>Create a room to begin the experiment.</p></div>');document.querySelectorAll("[data-join]").forEach(b=>b.onclick=()=>connect("join",{code:b.dataset.join,username:operator()}))}catch(e){if($("room-list"))html("room-list",`<div class="error">${escape(e.message)}</div>`)}
}
function joinForm(code=""){modal("JOIN WITH CODE",`<p>Enter the six-character code shared by your room host.</p><form id="join-form">${field("Room code","join-code","text",code,'maxlength="6" minlength="6" required style="text-transform:uppercase;letter-spacing:.3em;font-size:20px"')}<div class="form-actions"><button class="primary">CONNECT</button></div></form>`);$("join-form").onsubmit=e=>{e.preventDefault();connect("join",{code:$("join-code").value,username:operator()})}}
function how(){modal("PERSONNEL TRAINING",`<p>Explore the full 3D laboratory with your crew, operate physical controls and survive events. All units and machinery are fictional.</p><div class="list-entry"><b>Movement</b><span>W A S D · Shift · Space · C</span></div><div class="list-entry"><b>Look & interact</b><span>Mouse · E</span></div><div class="list-entry"><b>Equipment</b><span>F flashlight · M map</span></div><div class="list-entry"><b>Communication</b><span>T chat · Tab player list</span></div><div class="list-entry"><b>Pause</b><span>Escape · Pause button</span></div><h3>Facility navigation</h3><p>Open M for the interactive schematic. Select any sector to plot a route. Main Control lies north of Reception, the western crew deck is through Safety Office, and the escape pods are at the eastern end. Keep the marked centre lanes clear.</p><h3>Operating the reactor</h3><p>Walk north to Main Control to initiate the six-stage ignition sequence. Normal shutdown is available only during non-emergency operations. Emergency shutdown and escape pods unlock when an emergency is declared. Red control lights indicate locked systems; green means authorised.</p><p><b>Photosensitivity notice:</b> Events may include flashing lights, simulated shaking and intense audio. Reduce these effects in Settings.</p>`)}
function renderArchive(){let names=[...EVENTS.map(e=>({name:e.name,rarity:e.rarity,description:e.description})),...STARTUPS.map(name=>({name,rarity:"Startup",description:"An alternate ignition outcome."})),...["Successful Shutdown","Shutdown Failure","Laboratory Saved","Emergency Evacuation","The Final Escape","Total Facility Loss","Containment Collapse","Lost in the Void","Mainframe Recovered","Classified Protocol Completed","Golden Core Discovery"].map(name=>({name,rarity:"Ending",description:"A discovered facility outcome."}))];let ranks=["Visitor","Trainee","Technician","Reactor Operator","Senior Operator","Research Scientist","Facility Administrator"];modal("EVENT ARCHIVE",`<div class="list-entry"><div><strong>${ranks[Math.min(6,Math.floor(archive.xp/200))]}</strong><small>${archive.xp} XP · ${archive.events.length} discoveries</small></div><span class="badge">PERSONNEL RECORD</span></div><div class="scroll-items">${names.map(e=>`<div class="archive-entry"><span class="badge">${escape(e.rarity)}</span><h3>${archive.events.includes(e.name)?escape(e.name):"UNDISCOVERED / "+escape(e.name)}</h3><p>${archive.events.includes(e.name)?escape(e.description):"Encounter this event during a shift to unlock its report."}</p></div>`).join("")}</div>`)}
function settingsMenu(){
 const row=(label,key,type,min,max)=>`<div class="setting-row"><label for="set-${key}">${label}</label>${type==="range"?`<input data-setting="${key}" id="set-${key}" type="range" min="${min}" max="${max}" value="${settings[key]}">`:type==="check"?`<input data-setting="${key}" id="set-${key}" type="checkbox" ${settings[key]?"checked":""}>`:`<select data-setting="${key}" id="set-${key}">${min.map(v=>`<option ${v===settings[key]?"selected":""}>${v}</option>`).join("")}</select>`}</div>`;
 modal("SYSTEM SETTINGS",`<div class="setting-section"><h3>GRAPHICS</h3>${row("Graphics quality","quality","select",["Low","Medium","High","Ultra"])}${row("Render distance","distance","range",24,95)}${row("Field of view","fov","range",55,100)}${row("Particle effects","particles","select",["Low","High"])}</div><div class="setting-section"><h3>AUDIO</h3>${row("Master","master","range",0,100)}${row("Music","music","range",0,100)}${row("Effects","sfx","range",0,100)}${row("Ambience","ambient","range",0,100)}${row("Announcements","voice","range",0,100)}</div><div class="setting-section"><h3>CONTROLS</h3>${row("Mouse sensitivity","sensitivity","range",10,100)}${row("Invert mouse","invert","check")}${row("Head bob","bob","check")}</div><div class="setting-section"><h3>ACCESSIBILITY</h3>${row("Reduce flashing","flashing","check")}${row("Reduce camera shake","shake","check")}${row("Reduce distortion","distortion","check")}${row("Announcement subtitles","subtitles","check")}${row("Colourblind indicators","colorblind","check")}</div><button id="settings-done" class="primary">SAVE & CLOSE</button>`);
 document.querySelectorAll("[data-setting]").forEach(e=>e.oninput=()=>{settings[e.dataset.setting]=e.type==="checkbox"?e.checked:e.type==="range"?+e.value:e.value;localStorage.setItem("frl-settings",JSON.stringify(settings));audio.apply()});$("settings-done").onclick=closeModal
}
function pauseMenu(){
 if(!active)return;let host=room.host===me,admin=room.isAdmin;
 modal("OPERATIONS PAUSED",`<div class="list-entry"><div><strong>${escape(room.name)}</strong><small>ROOM ${room.code} · ${room.config.mode} · ${room.players.length}/${room.config.max} crew</small></div><span class="badge">${admin?"ADMIN":host?"HOST":"CREW"}</span></div><div class="form-actions" style="justify-content:flex-start;flex-wrap:wrap"><button class="primary" id="resume">RESUME</button><button id="game-settings">SETTINGS</button><button id="game-invite">COPY INVITE</button><button id="leave">LEAVE FACILITY</button>${host||admin?'<button id="reset">RESTART SHIFT</button>':""}${admin?'<button id="pause-admin" class="admin-access">ADMIN PANEL · F2</button>':""}</div>`);
 $("resume").onclick=()=>{closeModal();capture()};$("game-settings").onclick=settingsMenu;$("game-invite").onclick=invite;$("leave").onclick=leave;
 if(host||admin)$("reset").onclick=()=>{nextHost="reset";closeModal();sync()};if(admin)$("pause-admin").onclick=adminPanel
}
function adminPanel(){
 if(!active||!room?.isAdmin)return;
 if(mapOpen)toggleMap(false);
 const state=room.state,busy=!!(state.event||state.shutdown||state.phase==="STARTING"||state.result);
 modal("FACILITY ADMINISTRATION",`<div class="admin-banner"><div><small>AUTHENTICATED · ELEVATED CLEARANCE</small><b>${escape(room.name.toUpperCase())}</b><span>ROOM ${room.code} / ${room.players.length} PERSONNEL</span></div><i>${busy?"INTERLOCK ENGAGED":"SYSTEM READY"}</i></div><div class="admin-tools"><button id="admin-reset">REGENERATE FACILITY</button><button id="admin-return">RETURN</button></div><h3>IGNITION PROGRAMS</h3><div class="admin-grid">${STARTUPS.map(e=>`<button data-admin="startup:${escape(e)}"><b>${escape(e)}</b><small>IGNITION</small></button>`).join("")}</div><h3>EVENT DIRECTOR · ${EVENTS.length} SCENARIOS</h3><p>Only one scenario can run at once. Regenerate the current shift to clear an active event.</p><div class="admin-grid admin-events">${EVENTS.map(e=>`<button data-admin="scenario:${e.id}" style="--event-color:${e.color}"><b>${escape(e.name)}</b><small>${escape(e.rarity)} · ${e.duration}s</small></button>`).join("")}</div>`);
 $("admin-return").onclick=closeModal;
 $("admin-reset").onclick=()=>{nextHost="admin:reset";closeModal();sync()};
 document.querySelectorAll("[data-admin]").forEach(b=>{const blocked=controlStatus(state,{id:b.dataset.admin.startsWith("startup:")?"startup":"scenario"},room.config,true);b.disabled=!!blocked;b.title=blocked||"Activate scenario";b.onclick=()=>{if(!room?.isAdmin)return;nextHost="admin:"+b.dataset.admin;closeModal();sync()}})
}
document.querySelectorAll("[data-open]").forEach(b=>b.onclick=async()=>{
 audio.click();switch(b.dataset.open){
 case "quick":try{loading(true);let {rooms}=await request("rooms");let r=rooms.find(r=>r.count<r.max);if(r)await connect("join",{code:r.code,username:operator()});else await connect("create",{name:"Quick Play Laboratory",config:{visibility:"public",mode:"Standard",max:16,frequency:"Normal"},username:operator()})}catch(e){loading(false);toastMenu(e.message)}break;
 case "browser":browse();break;case "create":createForm();break;case "single":createForm(true);break;case "join":joinForm();break;case "archive":renderArchive();break;case "how":how();break;case "settings":settingsMenu();break;case "credits":modal("CREDITS",`<p><b>Fusion Reactor Laboratory — The Experiment Continues</b></p><p>An original standalone fan-inspired browser experience. Inspired by the atmosphere of Fusion Reactor Laboratory by Mihai's Tech.</p><p>Original procedural 3D geometry, interface, adaptive soundtrack and sound effects. Optional uploaded songs provide cinematic event music. No assets from Roblox were copied. This game uses fictional invented mechanics and is not an engineering simulator.</p><p>Build 03 / Deep Space Research Division</p>`);break
 }
});
function enter(){
 engine.disposeFacility(facility);lastReset=room.state.generation||0;facility=createFacility(engine,lastReset);active=true;connected=true;networkErrors=0;lastAnn=0;prevResult=0;launchAt=0;inspection=false;lastIgnitionPulse=-1;remote.clear();audio.init();audio.clear();Object.assign(local,room.players.find(p=>p.id===me)||SPAWN,{pitch:0,vy:0,eye:1.68});show("menu",false);show("hud");show("capture");show("result",false);show("cinematic",false);show("modal",false);show("alert",false);show("announcement",false);show("players",false);show("map",false);set("room-code",room.code);set("location","RECEPTION");mapOpen=false;mapTarget=null;mapSignature="";paused=false;chatOpen=false;nextAction=null;nextChat="";nextHost="";set("chatlog","");updateRoom(room);sync()
}
async function leave(){
 if(!active)return;let payload={code:room.code,playerId:me,token};active=false;room=null;paused=false;document.exitPointerLock?.();audio.clear();show("hud",false);show("result",false);show("cinematic",false);show("modal",false);show("menu");try{await request("leave",payload)}catch{}
}
async function invite(){if(!room)return;const link=new URL(location.href);link.search="";link.searchParams.set("room",room.code);try{await navigator.clipboard.writeText(link.toString());toast("Invite link copied · "+room.code);if(paused)toastMenu("Invite link copied · "+room.code)}catch{modal("INVITE PERSONNEL",`<p>Room code: <b>${room.code}</b></p><div class="field"><input value="${escape(link.toString())}" readonly onclick="this.select()"></div>`)}}
$("invite").onclick=invite;$("pause-btn").onclick=pauseMenu;$("result-menu").onclick=leave;
$("result-restart").onclick=()=>{nextHost="reset";sync()};
$("result-admin").onclick=adminPanel;$("admin-btn").onclick=adminPanel;
function capture(){if(!active||(room?.state.result&&!inspection)||launchAt||paused||chatOpen)return;audio.init();const el=$("world");const fallback=()=>{if(!document.pointerLockElement){manualLook=true;show("capture",false);toast("Mouse capture unavailable · Drag mouse or use arrow keys to look.")}};try{const p=el.requestPointerLock();if(p?.catch)p.catch(fallback);setTimeout(fallback,650)}catch{fallback()}}
$("capture").onclick=capture;
document.addEventListener("pointerlockchange",()=>{if(active&&(!room?.state.result||inspection)&&!launchAt)show("capture",!document.pointerLockElement&&!paused&&!chatOpen&&!mapOpen);if(!document.pointerLockElement)keys={}});
document.addEventListener("mousemove",e=>{if(!active||(document.pointerLockElement!==$("world")&&!(manualLook&&e.buttons===1))||paused||chatOpen||mapOpen)return;let sens=settings.sensitivity*.000065;local.yaw-=e.movementX*sens;local.pitch=clamp(local.pitch-e.movementY*sens*(settings.invert?-1:1),-1.37,1.37)});
function toggleChat(v){chatOpen=v;show("chatform",v);if(v){document.exitPointerLock?.();$("chatinput").focus();show("capture",false);keys={}}else{$("chatinput").blur();show("capture",!document.pointerLockElement)}}
$("chatform").onsubmit=e=>{e.preventDefault();let msg=$("chatinput").value.trim();if(msg){nextChat=msg;sync();$("chatinput").value=""}toggleChat(false)};
document.addEventListener("keydown",e=>{
 if(!active)return;if(e.code==="F2"&&room?.isAdmin){e.preventDefault();adminPanel();return}if(mapOpen&&(e.code==="Escape"||e.code==="KeyM")){e.preventDefault();toggleMap(false);return}if(mapOpen)return;if(e.code==="Escape"&&chatOpen){toggleChat(false);return}if(e.code==="Escape"&&paused){closeModal();return}if(e.target.tagName==="INPUT"||e.target.tagName==="SELECT"||e.target.tagName==="TEXTAREA")return;
 if(e.code==="Tab"){e.preventDefault();tabOpen=true;show("players");return}
 if(e.repeat||paused||(room?.state.result&&!inspection)||launchAt)return;keys[e.code]=true;
 if(["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code))e.preventDefault();
 if(e.code==="KeyF"){torch=!torch;audio.click();toast("Flashlight "+(torch?"enabled":"disabled"))}
 if(e.code==="KeyM"){e.preventDefault();toggleMap(true)}
 if(e.code==="KeyT"){e.preventDefault();toggleChat(!chatOpen)}
 if(e.code==="KeyE"&&aim!==null){if(aimBlocked){audio.deny();toast(aimBlocked)}else{nextAction=aim;audio.click();sync()}}
 if(e.code==="Escape"&&!document.pointerLockElement)pauseMenu()
});
document.addEventListener("keyup",e=>{keys[e.code]=false;if(e.code==="Tab"){tabOpen=false;show("players",false)}});
window.addEventListener("blur",()=>keys={});document.addEventListener("visibilitychange",()=>{if(document.hidden)keys={}});
async function sync(){
 if(!active||!room||inFlight)return;
 inFlight=true;const thisCode=room.code,thisPlayer=me,act=nextAction,msg=nextChat,host=nextHost;nextAction=null;nextChat="";nextHost="";
 try{
  let r=await request("sync",{code:room.code,playerId:me,token,generation:room.state.generation||0,position:{x:local.x,z:local.z,y:local.y,yaw:local.yaw},action:act,chat:msg,hostAction:host});
  if(!active||room?.code!==thisCode||me!==thisPlayer)return;
  if(!connected)toast("Connection restored");networkErrors=0;connected=true;updateRoom(r.room);if(r.message){toast(r.message);if(act!==null&&/accepted|initiated|regenerated/i.test(r.message)){const c=facility.controls.find(c=>c.a.key===act);if(c)c.pressed=performance.now()}}
 }catch(e){if(active&&room?.code===thisCode&&me===thisPlayer){networkErrors++;if(connected&&networkErrors>=2){connected=false;toast("CONNECTION INTERRUPTED · "+e.message)}if(e.message.includes("Session expired")||e.message.includes("Room not found")){await leave();toastMenu(e.message)}else{if(act!==null&&!nextAction)nextAction=act;if(msg&&!nextChat)nextChat=msg;if(host&&!nextHost)nextHost=host}}}finally{inFlight=false;lastSync=performance.now()}
}
function updateRoom(r){
 const old=room?.state;room=r;snapshotAt=performance.now();let s=r.state;set("room-code",r.code+" · "+r.players.length+"/"+r.config.max);$("room-code").style.color=connected?"#b8f9e6":"#ff986a";
 const my=room.players.find(p=>p.id===me);show("admin-btn",!!room.isAdmin);show("admin-status",!!room.isAdmin);if(room.isAdmin)set("admin-status","ADMIN ACCESS / F2");
 if((s.generation||0)!==lastReset){
  lastReset=s.generation||0;launchAt=0;prevResult=0;inspection=false;lastIgnitionPulse=-1;Object.assign(local,my||SPAWN,{pitch:0,vy:0,eye:1.68});keys={};nextAction=null;nextHost="";mapOpen=false;paused=false;chatOpen=false;show("modal",false);show("chatform",false);show("map",false);show("result",false);show("cinematic",false);show("hud",true);show("capture",!document.pointerLockElement);lastAnn=0;audio.clear();audio.regeneration();pulse("#6dffd1");engine.disposeFacility(facility);facility=createFacility(engine,lastReset);remote.clear()
 }
 set("phase",s.phase);set("temp",fmt(s.temp));set("heat",s.heat);set("cool",s.cooling);set("output",Math.round(s.energy));for(let q of ["stability","integrity","power"]){set(q,Math.round(s[q])+"%");$(q+"-bar").style.width=clamp(s[q],0,100)+"%";$(q+"-bar").style.background=s[q]<30?"#ff6358":s[q]<65?"#f9c264":"#65e8d1"}
 let color=colorFor(s);$("phase").style.color=color==="rainbow"?"#efbaff":s.phase==="OFFLINE"?"#9eafb9":settings.colorblind?"#ffe78c":color;
 const emergency=emergencyActive(s);
 set("pod-status","ESCAPE PODS  /  "+(emergency?"AUTHORISED":"LOCKED"));$("pod-status").classList.toggle("authorised",emergency);
 const normalGate=controlStatus(s,{id:"shutdown"},r.config,r.host===me||r.isAdmin),emergencyGate=controlStatus(s,{id:"emergency"},r.config,r.host===me);
 set("shutdown-status",!normalGate?"NORMAL SHUTDOWN  /  READY":!emergencyGate?"EMERGENCY SHUTDOWN  /  READY":"SHUTDOWN SYSTEMS  /  LOCKED");$("shutdown-status").classList.toggle("authorised",!normalGate||!emergencyGate);
 show("alert",!!s.event||!!s.shutdown||s.phase==="STARTING");
 if(s.shutdown){set("stage",s.shutdown.emergency?"EMERGENCY SHUTDOWN":"NORMAL SHUTDOWN");set("event-name","Shutdown sequence");set("countdown",formatTime((s.shutdown.end-r.serverTime)/1000));set("event-obj",s.event?"Active crisis: "+s.event.name+" / awaiting shutdown outcome":"Ramping down core and isolating containment.");$("event-bar").style.width=clamp((r.serverTime-s.shutdown.start)/(s.shutdown.end-s.shutdown.start)*100,0,100)+"%";$("alert").style.borderColor="#78c7ef";$("event-name").style.color="#78c7ef"}
 else if(s.event){const e=s.event;set("stage",["WARNING","ESCALATION","EMERGENCY","FINAL STAGE"][e.stage]);set("event-name",e.name);set("countdown",formatTime(e.duration*(1-e.progress)));set("event-obj",e.objective+(["repair","computer","power","collapse","integrity"].includes(e.kind)?" · Repairs: "+e.repairs:""));$("event-bar").style.width=(e.progress*100)+"%";$("alert").style.borderColor=e.color;$("event-name").style.color=e.color}
 else if(s.phase==="STARTING"){const stage=STARTUP_STAGES[Math.min(STARTUP_STAGES.length-1,s.startStep||0)];set("stage",stage.name);set("event-name",s.startup||"Reactor startup");set("countdown",formatTime((STARTUP_DURATION-(r.serverTime-s.startAt))/1000));set("event-obj",stage.line);$("event-bar").style.width=clamp((r.serverTime-s.startAt)/STARTUP_DURATION*100,0,100)+"%";$("alert").style.borderColor="#8adfff";$("event-name").style.color="#b4ecff"}
 for(let a of s.announcements){if(a.id>lastAnn){lastAnn=a.id;if(r.serverTime-a.time<18000){announce(a.text)}}}
 let esc=room.players.find(p=>p.id===me)?.escaped;
 if(esc&&!launchAt){launchAt=performance.now();show("hud",false);show("cinematic");document.exitPointerLock?.();audio.impact();discover("The Final Escape")}
 updateRemote();updatePeople();
 for(let d of s.discovered)discover(d);
 if(s.result&&!inspection&&s.result.at!==prevResult&&(!launchAt||performance.now()-launchAt>7000))result(s.result);
 if(s.phase==="STARTING"&&s.startStep>=4&&lastIgnitionPulse!==s.startAt){lastIgnitionPulse=s.startAt;audio.impact();pulse(s.startup==="Startup Overload"?"#ffb675":"#c5ddff")}
 if(old?.phase==="STARTING"&&s.phase!=="STARTING"&&!s.result){audio.impact();pulse("#c2dfff")}
}
function discover(name){if(!archive.events.includes(name)){archive.events.push(name);archive.xp+=45;saveArchive()}}
function formatTime(sec){sec=Math.max(0,Math.ceil(sec));return String(Math.floor(sec/60)).padStart(2,"0")+":"+String(sec%60).padStart(2,"0")}
function announce(msg){if(settings.subtitles){set("announce-text",msg);show("announcement");clearTimeout(announceTimer);announceTimer=setTimeout(()=>show("announcement",false),7400)}audio.announce(msg)}
function pulse(color){if(settings.flashing)return;let e=$("flash");e.style.background=color;e.animate([{opacity:.52},{opacity:0}],{duration:700,easing:"ease-out"})}
function updatePeople(){
 html("player-list",room.players.map(p=>`<div class="player"><b>${escape(p.name)} ${p.id===me?"(YOU)":""}</b><span>${p.id===room.host?"HOST":p.escaped?"ESCAPED":"ACTIVE"}</span></div>`).join(""));
 html("chatlog",room.chat.slice(-6).map(c=>`<div class="chat-line"><b>${escape(c.from)}:</b> ${escape(c.text)}</div>`).join(""));
}
function updateRemote(){
 const seen=new Set();for(let p of room.players){if(p.id===me||p.escaped)continue;seen.add(p.id);let rem=remote.get(p.id);if(!rem){
   let col=hex(["#94aec7","#ea916d","#90c7c0","#9b96cb","#b9d1a3"][remote.size%5]);
   let parts=[item("cube",[0,0,0],[.65,.76,.38],col),item("sphere",[0,0,0],[.47,.49,.44],"#8ba3b7"),item("cube",[0,0,0],[.48,.16,.46],"#4f8d9e",{emit:.55}),item("cube",[0,0,0],[.19,.75,.21],col),item("cube",[0,0,0],[.19,.75,.21],col),item("cube",[0,0,0],[.25,.7,.28],"#44546a"),item("cube",[0,0,0],[.25,.7,.28],"#44546a")];
   let tex=engine.texture((ctx,c)=>{ctx.fillStyle="#061522df";ctx.fillRect(0,0,c.width,c.height);ctx.strokeStyle="#8aebef";ctx.strokeRect(2,2,c.width-4,c.height-4);ctx.fillStyle="#bdfafa";ctx.font="bold 36px Arial";ctx.textAlign="center";ctx.fillText(p.name,c.width/2,46,c.width-24)},256,64);
   parts.push(item("plane",[0,0,0],[1.85,.46,1],"#fff",{tex,emit:1,opacity:.94}));rem={p:{...p},target:{...p},parts};remote.set(p.id,rem)
  }rem.target=p;
 }
 for(let id of remote.keys())if(!seen.has(id))remote.delete(id)
}
function animateRemote(dt){
 let all=[];for(let rem of remote.values()){
  let p=rem.p,t=rem.target,k=1-Math.exp(-dt*8),speed=Math.hypot(t.x-p.x,t.z-p.z);
  p.x+=(t.x-p.x)*k;p.z+=(t.z-p.z)*k;p.y+=(t.y-p.y)*k;let diff=((t.yaw-p.yaw+Math.PI*3)%(Math.PI*2))-Math.PI;p.yaw+=diff*k;
  let offsets=[[0,1.02,0],[0,1.68,0],[0,1.67,.20],[-.43,1.03,0],[.43,1.03,0],[-.18,.35,0],[.18,.35,0],[0,2.20,0]];
  for(let i=0;i<rem.parts.length;i++){let o=rem.parts[i],[x,y,z]=offsets[i];o.p=[p.x+x*Math.cos(p.yaw)+z*Math.sin(p.yaw),p.y+y,p.z-x*Math.sin(p.yaw)+z*Math.cos(p.yaw)];o.r=[i===5||i===6?Math.sin(clock*9+(i%2)*Math.PI)*Math.min(speed,1)*.3:0,i===7?Math.atan2(local.x-p.x,local.z-p.z):p.yaw,0];all.push(o)}
 }return all
}
function result(r){
 if(prevResult===r.at)return;
 prevResult=r.at;document.exitPointerLock?.();show("hud",false);show("cinematic",false);show("result");set("result-title",r.title.toUpperCase());set("result-desc",r.success?"The crew has survived this shift. Your actions have been recorded in the facility archive.":"The experiment reached a catastrophic conclusion. This outcome has been added to your event archive.");
 html("result-stats",[[ "Time survived",formatTime(r.elapsed)],["Reactor operating time",formatTime(r.operating)],["Personnel evacuated",room.players.filter(p=>p.escaped).length],["Facility actions",r.actions],["Systems repaired",r.repairs],["Experience earned",r.success?"+150 XP":"+60 XP"]].map(([a,b])=>`<div class="result-stat"><span>${a}</span><b>${b}</b></div>`).join(""));
 $("result-title").style.color=r.success?"#8af5cd":"#ffa187";$("result-restart").disabled=room.host!==me&&!room.isAdmin;show("result-admin",!!room.isAdmin);archive.xp+=r.success?150:60;discover(r.title);saveArchive();pulse(r.success?"#8bffd2":"#ff783f");audio.impact()
}
function toggleMap(open){
 mapOpen=open;show("map",open);keys={};
 if(open){document.exitPointerLock?.();show("capture",false);mapSignature="";updateMap()}
 else if(active&&!paused&&!chatOpen&&!launchAt)show("capture",!document.pointerLockElement)
}
$("map-close").onclick=()=>toggleMap(false);
$("map-clear").onclick=()=>{mapTarget=null;mapSignature="";updateMap()};
$("map-grid").addEventListener("click",e=>{const button=e.target.closest("[data-sector]");if(!button)return;mapTarget=Number(button.dataset.sector);mapSignature="";updateMap()});
function mapCategory(n){
 if(n==="REACTOR")return "core";
 if(n==="Escape Pods")return "pods";
 if(/Control|Generator|Distribution|Cooling|Mainframe/.test(n))return "main";
 if(/Hydroponics|Lounge|Observation|Logistics|Crew/.test(n))return "crew";
 return /Junction|Tunnel|Maintenance/.test(n)?"corridor":"sector"
}
function updateMap(){
 if(!room)return;
 const row=clamp(Math.round(local.z/10)+3,0,6),col=clamp(Math.round(local.x/10)+3,0,6),here=row*7+col,closed=!room.state.doors||room.state.locked;
 const count=Array(49).fill(0);for(const p of room.players)if(p.id!==me&&!p.escaped){const x=clamp(Math.round(p.x/10)+3,0,6),z=clamp(Math.round(p.z/10)+3,0,6);count[z*7+x]++}
 const route=mapTarget===null?[]:sectorRoute(here,mapTarget,closed),routeSet=new Set(route),sig=[here,mapTarget,closed,count.join(","),lastReset].join("|");
 set("map-where",cellName(local.x,local.z).toUpperCase()+" / DECK 01");
 if(sig!==mapSignature){
  mapSignature=sig;html("map-grid",MAP.flatMap((line,y)=>line.map((n,x)=>{const idx=y*7+x,meHere=idx===here,selected=idx===mapTarget;return `<button class="map-cell ${mapCategory(n)} ${meHere?"here":""} ${routeSet.has(idx)&&!meHere?"route":""} ${selected?"destination":""}" data-sector="${idx}" aria-pressed="${selected}"><span>${escape(n)}</span>${meHere?'<small><i class="map-heading">▲</i> YOU</small>':count[idx]?`<small>● ${count[idx]} CREW</small>`:""}${selected&&!meHere?'<small>DESTINATION</small>':""}</button>`})).join(""));
  set("map-route",mapTarget===null?"Select a sector to plot a route.":route.length?MAP[Math.floor(mapTarget/7)][mapTarget%7].toUpperCase()+"  /  "+(route.length===1?"YOU HAVE ARRIVED":(route.length-1)+" SECTOR"+(route.length===2?"":"S")+" · FOLLOW HIGHLIGHTED PATH"):"ROUTE UNAVAILABLE / REACTOR ACCESS LOCKED");$("map-clear").disabled=mapTarget===null
 }
 const heading=$("map-grid").querySelector(".map-heading");if(heading)heading.style.transform="rotate("+((Math.PI-local.yaw)*180/Math.PI)+"deg)"
}
function movePlayer(dt,time){
 let move=active&&!paused&&!chatOpen&&!mapOpen&&!launchAt&&(!room.state.result||inspection)&&(document.pointerLockElement||manualLook||keys.ArrowUp||keys.ArrowDown||keys.ArrowLeft||keys.ArrowRight);
 let sprint=keys.ShiftLeft||keys.ShiftRight,crouch=keys.KeyC,speed=crouch?2.2:sprint?7.5:4.5;
 let sx=(keys.KeyD?1:0)-(keys.KeyA?1:0),sz=(keys.KeyW?1:0)-(keys.KeyS?1:0);
 if(move){
  if(keys.ArrowLeft)local.yaw+=dt*1.8;if(keys.ArrowRight)local.yaw-=dt*1.8;if(keys.ArrowUp)local.pitch=clamp(local.pitch+dt,-1.37,1.37);if(keys.ArrowDown)local.pitch=clamp(local.pitch-dt,-1.37,1.37);
  let len=Math.hypot(sx,sz)||1,dx=(Math.sin(local.yaw)*sz-Math.cos(local.yaw)*sx)/len*speed*dt,dz=(Math.cos(local.yaw)*sz+Math.sin(local.yaw)*sx)/len*speed*dt;
  let close=!room.state.doors||room.state.locked;for(let door of facility.doors)door.o.hidden=!close;for(let door of facility.podDoors)door.o.hidden=emergencyActive(room.state);
  if(!collides(facility,local.x+dx,local.z,close))local.x+=dx;if(!collides(facility,local.x,local.z+dz,close))local.z+=dz;
  if(keys.Space&&local.y<=.001)local.vy=5.7;
  if(Math.hypot(sx,sz)>.1&&local.y===0&&time-lastFoot>(sprint?280:440)){lastFoot=time;audio.foot(sprint)}
 }
 local.vy-=14*dt;local.y=Math.max(0,local.y+local.vy*dt);if(local.y<=0)local.vy=0;
 let target=crouch?1.15:1.68;local.eye+=(target-local.eye)*Math.min(1,dt*10);
 return move&&Math.hypot(sx,sz)>.1&&settings.bob?Math.sin(clock*(sprint?15:10))*.035:0
}
function selectControl(){
 if(!facility||!active||paused||chatOpen||mapOpen||launchAt||(room.state.result&&!inspection)){aim=null;aimBlocked=null;show("prompt",false);return}
 let vx=Math.sin(local.yaw)*Math.cos(local.pitch),vz=Math.cos(local.yaw)*Math.cos(local.pitch),vy=Math.sin(local.pitch),ey=local.y+local.eye;
 let best=null,score=-1;for(let c of facility.controls){let a=c.a;let dx=a.x-local.x,dy=1.18-ey,dz=a.z-local.z,d=Math.hypot(dx,dy,dz);if(d<4.25){let alignment=(dx*vx+dy*vy+dz*vz)/d;let val=alignment-d*.028;if(alignment>.62&&val>score){score=val;best=c}}}
 aim=best?.a.key??null;aimBlocked=best?controlStatus(room.state,best.a,room.config,room.host===me||room.isAdmin):null;show("prompt",aim!==null);if(best){set("prompt-label",best.a.label);set("prompt-status",aimBlocked||"AUTHORISED / PRESS E");$("prompt").classList.toggle("locked",!!aimBlocked)}
}
function drawScreen(s){
 for(let tex of facility.screens)engine.updateTexture(tex,(ctx,c)=>{
  let w=c.width,h=c.height,col=colorFor(s);if(col==="rainbow")col="#d5a6ff";ctx.fillStyle=s.power<15?"#03070c":"#061526";ctx.fillRect(0,0,w,h);ctx.strokeStyle="#29495b";ctx.lineWidth=2;for(let x=0;x<w;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke()}for(let y=0;y<h;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}
  if(s.power<15){ctx.fillStyle="#9f744e";ctx.font="bold 48px monospace";ctx.textAlign="center";ctx.fillText("EMERGENCY POWER",w/2,h/2);return}
  ctx.textAlign="left";ctx.fillStyle="#99ddef";ctx.font="bold 26px monospace";ctx.fillText("FRL // FUSION REACTOR LABORATORY",28,40);ctx.fillStyle=col;ctx.font="bold 42px monospace";ctx.fillText(s.phase,30,101);ctx.fillStyle="#7eb6c8";ctx.font="22px monospace";ctx.fillText("CORE TEMPERATURE [FU]",30,151);ctx.font="bold 70px monospace";ctx.fillStyle="#daffff";ctx.fillText(fmt(s.temp),28,226);
  ctx.font="26px monospace";ctx.fillStyle="#b6d4de";ctx.fillText("STABILITY",30,291);ctx.fillText("CONTAINMENT",30,339);ctx.fillText("FACILITY POWER",30,387);for(let [i,v] of [s.stability,s.integrity,s.power].entries()){ctx.fillStyle="#183b49";ctx.fillRect(275,271+i*48,195,22);ctx.fillStyle=v<35?"#ff6e58":"#57e5be";ctx.fillRect(275,271+i*48,195*v/100,22)}
  ctx.fillStyle="#27475a";ctx.fillRect(520,65,475,325);ctx.fillStyle="#071827";ctx.fillRect(526,71,463,313);ctx.strokeStyle=col;ctx.lineWidth=5;ctx.beginPath();s.trend.forEach((v,i)=>{let x=538+i/Math.max(1,s.trend.length-1)*438,y=370-clamp(v/135000,0,1)*274;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y)});ctx.stroke();ctx.fillStyle="#b8e6ec";ctx.font="25px monospace";ctx.fillText("FLUX TREND / LIVE",542,108);ctx.fillStyle=col;ctx.fillText(s.event?s.event.name.toUpperCase():s.shutdown?"SHUTDOWN ATTEMPT":s.phase==="STARTING"?STARTUP_STAGES[s.startStep||0].name:"SYSTEMS MONITORING",32,478);
  if(s.event?.id==="mainframe"){ctx.fillStyle="rgba(6,30,18,.52)";ctx.fillRect(0,0,w,h);ctx.fillStyle="#7cffa4";ctx.font="bold 37px monospace";ctx.fillText("MAINFRAME // OVERRIDE ACTIVE",36,255);if(!settings.flashing){for(let y=0;y<h;y+=28){ctx.fillStyle="rgba(22,255,110,.10)";ctx.fillRect((Math.sin(y+clock*3)+1)*80,y,w-160,3)}}}
 })
}
const rotateColor=t=>[.55+.45*Math.sin(t),.55+.45*Math.sin(t+2.094),.55+.45*Math.sin(t+4.188)];
function animateCore(s,time){
 const e=s.event,prog=e?clamp((serverNow()-e.started)/(e.duration*1000),0,1):0,starting=s.phase==="STARTING",isOnline=s.phase!=="OFFLINE"&&s.phase!=="DESTROYED",ms=starting?clamp(serverNow()-s.startAt,0,STARTUP_DURATION):0;
 const f=starting?ms/STARTUP_DURATION:1,charge=starting?clamp((ms-5000)/13000,0,1):isOnline?1:0,field=starting?clamp((ms-11000)/8000,0,1):isOnline?1:0;
 let form=starting?clamp((ms-13800)/17500,0,1):isOnline?1:0;
 if(s.shutdown)form*=Math.pow(clamp((s.shutdown.end-serverNow())/(s.shutdown.end-s.shutdown.start),0,1),.7);
 const fault=starting&&s.startup==="Failed Startup"&&ms>27000,overload=starting&&s.startup==="Startup Overload",unstable=starting&&s.startup==="Unstable Shield Startup";
 if(fault)form*=Math.max(.10,1-clamp((ms-28000)/7000,0,1));
 const c=colorFor(s),emergency=emergencyActive(s),col=fault?[1,.24,.12]:overload?[1,.55,.18]:c==="rainbow"?rotateColor(clock*2.6):hex(c);
 const tension=e?.kind==="bonus"?.12:e?(.25+prog*.90):starting?.14+f*.75:s.phase==="CRITICAL"?.63:s.shutdown?.4:0;
 const pulseScale=1+Math.sin(clock*(e?.id==="resonance"?6.3:2+tension*8))*(e?.id==="resonance"?.16:.035+tension*.075),baseSize=(e?.kind==="collapse"?Math.max(.13,1-prog*.92):e?.kind==="cold"?1.05:1+prog*(e?.id==="hypercore"?.7:.30))*(overload?1.2:1);
 const size=5.9*baseSize*pulseScale*form,ignitionWave=starting&&ms>=27000&&ms<32000;
 for(let part of facility.coreParts){
  let o=part.o;
  if(part.type==="core"){o.hidden=form<.035;o.s=[size,size,size];o.color=e?.id==="void"?[.10,.025,.23]:col;o.emit=.8+form*1.1+tension*.6;o.surface=e?.kind==="cold"?1:1}
  if(part.type==="glow"){o.hidden=form<.08;o.color=col;o.s=[size*1.57,size*1.57,size*1.57];o.opacity=.07+tension*.06+(ignitionWave?.035:0)}
  if(part.type==="shield"){o.hidden=field<.08||(!s.containment&&!unstable);o.s=[9.8*field,9.8*field,9.8*field];o.opacity=(unstable||e?.kind==="integrity")&&!settings.flashing?.11+.15*Math.abs(Math.sin(clock*17)):.15+field*.07;o.color=col}
  if(part.type==="lens"){o.color=charge>.05?col:hex("#40536b");o.emit=.18+charge*(.9+.6*Math.abs(Math.sin(clock*6+part.i)));o.s=[1.25+charge*.3,1.25+charge*.3,1.25+charge*.3]}
  if(part.type==="beam"||part.type==="beamglow"){
   const allow=s.emitters||(e?.id==="emitter"&&part.i!==2);o.hidden=!allow||charge<.07||form<.02&&charge<.3;o.color=c==="rainbow"?rotateColor(clock*2.6+part.i*.9):col;
   let p=part.base,from=[p[0]*2,6.5,p[2]*2],target=[from[0]*(1-charge),6.5,from[2]*(1-charge)];if(unstable&&!settings.flashing&&part.i===2)target=[target[0]+Math.sin(clock*8)*.5,6.5,target[2]];
   const thickness=(part.type==="beam"?.14+.20*charge:.5+.35*charge)*(1+tension*.3);o.s[0]=o.s[2]=thickness;lineShape(o,from,target);o.opacity=part.type==="beam"?(.35+charge*.4)*(.87+.13*Math.sin(clock*7+part.i)):.10+charge*.08;
  }
  if(part.type==="ring"||part.type==="ringlight"){
   let spin=(.06+charge*.18+tension*.19)*(e?.id==="time"?Math.sin(clock*.65)*2:e?.id==="plasma"?2.3:1);o.r=[part.i*.67+clock*spin*(part.i%2?1:-1),clock*(.12+spin),part.i*.58];if(part.type==="ringlight"){o.color=col;o.hidden=charge<.1;o.emit=.6+charge*.9+tension*.7}
  }
  if(part.type==="filament"){
   o.hidden=form<.12||part.i>(settings.particles==="Low"?2:7);let d=size*(1.06+part.i*.055);o.color=c==="rainbow"?rotateColor(clock*3+part.i*.8):col;o.s=[d,.23+form*.16,d];o.r=[part.i*.6+clock*.28,clock*.4*(part.i%2?1:-1),part.i*.62];o.opacity=.20+form*.23+tension*.10
  }
  if(part.type==="wave"){
   const inward=e?.kind==="collapse"||!!s.shutdown,phase=(clock*(.25+tension*.92)+part.i/5)%1,w=inward?24-phase*23:2+phase*25;
   o.hidden=!(e||ignitionWave||s.shutdown)||(starting&&!ignitionWave);o.color=col;o.s=[w,.38+tension*.25,w];o.r=[part.i*.36,clock*.12,part.i*.43];o.opacity=(.20+tension*.24)*(1-phase)
  }
 }
 const arcCount=settings.particles==="Low"?5:19;
 facility.arcs.forEach((o,i)=>{o.hidden=form<.12||i>=arcCount||(!e&&!starting&&i>4)||(starting&&!ignitionWave&&i>4);o.color=c==="rainbow"?rotateColor(clock*3+i*.45):col;if(o.hidden)return;const a=i*.97+clock*(1+tension*2),b=i*1.17+clock*.7,r=size*.38;const from=[Math.cos(a)*r,6.5+Math.sin(b)*r,Math.sin(a)*r],to=[Math.cos(a+.7)*(r+2+Math.sin(clock*6+i)*.8),6.5+Math.sin(b+1)*(r+1.4),Math.sin(a+.7)*(r+2+Math.cos(clock*8+i)*.6)];lineShape(o,from,to);o.opacity=.23+.52*Math.abs(Math.sin(clock*9+i))});
 facility.particles.forEach((p,i)=>{
  let o=p.o;o.hidden=(!isOnline&&!starting)||charge<.08||i>(settings.particles==="Low"?16:e||starting?69:35);if(o.hidden)return;let radius=p.d*baseSize+.5*Math.sin(clock*p.speed+i),a=p.a+clock*p.speed,b=p.b+clock*.6;
  if(e?.kind==="collapse"||starting)radius=1.4+(p.d+2)*(1-((clock*(.2+tension*.2)+i/70)%1));
  o.p=[Math.cos(a)*Math.sin(b)*radius,6.5+Math.cos(b)*radius,Math.sin(a)*Math.sin(b)*radius];o.color=c==="rainbow"?rotateColor(clock*2+i*.27):col;
  const cold=e?.kind==="cold";o.mesh=cold?"cube":"sphere";o.s=cold?[.13,.24,.13]:[.105+tension*.05,.105+tension*.05,.105+tension*.05];o.r=cold?[a,b,a*.32]:[0,0,0]
 });
 for(let [i,fx] of facility.environmentFX.entries()){
  const o=fx.o,visible=emergency&&(e||s.phase==="CRITICAL")&&i<(settings.particles==="Low"?14:55);o.hidden=!visible;if(!visible)continue;
  const k=(clock*(.4+fx.speed*.43)+fx.phase)%1,cold=e?.kind==="cold",gravity=e?.id==="gravity"||e?.id==="time";o.p=[fx.base[0]+Math.sin(clock*.75+fx.phase)*.45,cold?4.3-k*4.1:gravity?1.6+Math.sin(clock*fx.speed+fx.phase)*1.4:.22+k*3.3,fx.base[2]+Math.cos(clock*.55+fx.phase)*.35];o.color=cold?[.65,.91,1]:gravity?col:e?.kind==="computer"?[.33,1,.45]:[1,.48,.17];o.s=cold?[.10,.17,.10]:gravity?[.13,.13,.13]:[.05,.2+prog*.15,.05];o.opacity=.26+.35*Math.sin(Math.PI*k);o.r=[clock*.8+fx.phase,.4,fx.phase]
 }
 const flicker=emergency&&!settings.flashing?.78+.22*Math.sin(clock*7):1;
 for(let o of facility.emergencyLights){if(!o.original)o.original=o.color.slice();o.color=s.power<25?[.72,.18,.08]:emergency?(e?.kind==="cold"?[.31,.73,1]:e?.kind==="computer"?[.26,.9,.35]:[1,.20,.14]):starting?[.53,.79,.98]:o.original;o.emit=s.power<25?.5:emergency?1.05*flicker:.88+charge*.33}
 for(let d of facility.doors)d.o.hidden=!!s.doors&&!s.locked;for(let d of facility.podDoors)d.o.hidden=emergencyActive(s);
 for(let d of facility.podDoors)d.o.hidden=emergency;
 for(let indicator of facility.podIndicators){indicator.color=emergency?hex("#55ffae"):hex("#ff614b");indicator.emit=emergency?1.6:1.0}
 for(let c of facility.controls){const locked=!!controlStatus(s,c.a,room.config,room.host===me||room.isAdmin),triggered=c.pressed&&time-c.pressed<350;c.button.p[1]=triggered?1.018:1.075;c.button.color=locked?hex("#586778"):hex(c.a.color);c.button.emit=locked?.16:triggered?2.4:c.a.key===aim?1.9:1.2;c.status.color=locked?hex("#f66c50"):hex("#5cffab");c.status.emit=locked?.70:1.5}
 return {col,tension,online:Math.max(charge*.6,form),ambient:s.power<25?.15:e?.id==="eclipse"?.21:Math.max(.34,.56-tension*.14),fog:e?.kind==="cold"?.023:e?.id==="void"?.019:.006}
}
function tick(time){
 requestAnimationFrame(tick);let dt=Math.min(.05,(time-lastFrame)/1000||.016);lastFrame=time;clock+=dt;if(!engine)return;
 frame++;
 if(!active||!room||launchAt){
  let t=clock*.035,a=launchAt?(time-launchAt)/1000:0,eye=launchAt?[22+a*1.4,10+a*.35,29+a*2.5]:[27+Math.sin(t)*4,15+Math.cos(t)*2,36+Math.sin(t*.65)*2],target=[-4,0,-2];engine.draw(ship,{eye,target},{quality:settings.quality,fov:57,far:240,distance:190,corePower:1.2,core:[-8,0,0],coreColor:[.4,.72,1],ambient:.65,fog:.0015});audio.update(room?.state&&prevResult?{...room.state,result:room.state.result||{success:true}}:room?.state,5,time,!launchAt,!!launchAt&&!prevResult);
  if(active&&launchAt){$("launch-progress").style.width=clamp(a/7*100,0,100)+"%";if(a>7){show("cinematic",false);if(room.state.result)result(room.state.result);else{show("cinematic");$("cinematic").querySelector("p").textContent="Escape pod in safe orbit. Awaiting facility outcome...";if(a>20&&prevResult===0)result({title:"Emergency Evacuation",success:true,elapsed:room.state.elapsed,operating:room.state.onlineAt?Math.round((room.serverTime-room.state.onlineAt)/1000):0,actions:room.state.actions,repairs:room.state.repairs,at:room.serverTime})}}}
 }else{
  let s=room.state,bob=movePlayer(dt,time),look=local.yaw,pitch=local.pitch,{col,tension,online,ambient,fog}=animateCore(s,time),shake=settings.shake?0:tension*.043,eye=[local.x+Math.sin(clock*36)*shake,local.y+local.eye+bob+Math.cos(clock*33)*shake,local.z],target=[eye[0]+Math.sin(look)*Math.cos(pitch),eye[1]+Math.sin(pitch),eye[2]+Math.cos(look)*Math.cos(pitch)];
  if(s.event?.id==="gravity"&&!settings.distortion)target[1]+=Math.sin(clock*2)*.055;
  let objects=[...facility.items,...animateRemote(dt)];engine.draw(objects,{eye,target},{quality:settings.quality,fov:settings.fov,far:130,distance:Math.min(settings.distance,Math.hypot(local.x,local.z)<23?46:32),corePower:online*(2.1+tension),coreColor:col,ambient,flash:torch,fog,emergency:emergencyActive(s)?(s.event?.kind==="cold"?[.12,.38,.65]:s.event?.kind==="computer"?[.04,.65,.21]:[.62,.10,.07]):[0,0,0]});
  audio.update(s,Math.hypot(local.x,local.z),time,false);
  if(time-lastStatus>100){lastStatus=time;const area=cellName(local.x,local.z);set("location",area.toUpperCase());selectControl();if(mapOpen)updateMap()}
  if(time-lastScreen>850){lastScreen=time;drawScreen(s)}
 }
 if(active&&time-lastSync>490&&!inFlight){lastSync=time;sync()}
}
requestAnimationFrame(tick);
const roomCode=new URLSearchParams(location.search).get("room");if(roomCode)joinForm(roomCode.toUpperCase().slice(0,6));
document.addEventListener("pointerdown",()=>audio.init(),{once:true});
