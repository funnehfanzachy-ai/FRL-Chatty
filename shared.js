export const MAP = [
 ["Bridge","Crew Quarters","Navigation","Observation Deck","Research Lab","Medical Bay","Security"],
 ["Cargo Storage","Maintenance","West Junction","North Junction","East Junction","Server Room","Mainframe"],
 ["Backup Generator","Power Distribution","REACTOR","REACTOR","REACTOR","Cooling Systems","Emergency Shelter"],
 ["Restricted Sector","Service Tunnel","REACTOR","REACTOR","REACTOR","Service Tunnel","Experimental Lab"],
 ["Administration","Maintenance","REACTOR","REACTOR","REACTOR","Shutdown Control","Diagnostics"],
 ["Hydroponics","Observation Atrium","Control Annex","Main Control","Control Annex","East Junction","Escape Pods"],
 ["Logistics Hub","Crew Lounge","Safety Office","Reception","Security Checkpoint","Launch Control","Escape Pods"]
];
export const CELL=10;
export const SPAWN={x:0,z:30,y:0,yaw:Math.PI};
const BASE_ACTIONS=[
 ["ignite","IGNITE REACTOR",-2.3,16.9,"#a9f7ff"],
 ["shutdown","NORMAL SHUTDOWN",-3.9,16.9,"#ffc46c"],
 ["emergency","EMERGENCY SHUTDOWN",3.3,16.9,"#ff4456"],
 ["heatUp","INCREASE HEAT",-3.9,23.1,"#ff8b55",Math.PI],
 ["heatDown","DECREASE HEAT",-2.3,23.1,"#61caff",Math.PI],
 ["coolUp","INCREASE COOLING",3.9,23.1,"#55bfff",Math.PI],
 ["coolDown","DECREASE COOLING",2.3,23.1,"#ffd188",Math.PI],
 ["emitters","TOGGLE EMITTERS",-12.9,17.2,"#9b8cff"],
 ["containment","TOGGLE CONTAINMENT",12.9,17.2,"#49daee"],
 ["diagnostic","RUN DIAGNOSTICS",7.1,22.8,"#77ebad",Math.PI],
 ["doors","CHAMBER ACCESS",-7.1,22.8,"#f3c25d",Math.PI],
 ["lockdown","FACILITY LOCKDOWN",22.9,27.2,"#ff9e50"],
 ["backup","BACKUP GENERATOR",-32.9,-7.2,"#ffd96b",Math.PI],
 ["power","POWER DISTRIBUTION",-22.9,-7.2,"#69f2b3",Math.PI],
 ["repair","REPAIR EMITTER",-22.9,2.8,"#a1fbdd",Math.PI],
 ["coolRepair","REPAIR COOLING",22.9,-7.2,"#89e9ff",Math.PI],
 ["resetMainframe","MAINFRAME RECOVERY",32.9,-17.2,"#b4a7ff",Math.PI],
 ["alarm","ACKNOWLEDGE ALARMS",1.7,16.9,"#ffc774"],
 ["emergency","EMERGENCY CONTROL",22.9,7.2,"#ff6b7f"],
 ["repair","RESTORE SYSTEM",32.9,7.2,"#76f7ac"],
 ["repair","REPAIR TERMINAL",-22.9,-17.2,"#76f7ac"],
 ["repair","ANOMALY ANALYSIS",22.9,-27.2,"#cf91ff",Math.PI],
 ["launch","LAUNCH ESCAPE POD",32.9,22.8,"#43f9bd",Math.PI],
 ["launch","LAUNCH ESCAPE POD",32.9,32.8,"#43f9bd",Math.PI],
 ["announce","FACILITY ANNOUNCEMENT",2.9,27.2,"#7bffc9"]
].map(([id,label,x,z,color,facing=0],i)=>({id,label,x,z,color,facing,key:i}));

const E=(id,name,rarity,kind,duration,color,objective,description)=>({id,name,rarity,kind,duration,color,objective,description});
export const EVENTS=[
 E("meltdown","Meltdown","Common","hot",95,"#ff451f","Reduce heat, maximise cooling, or attempt emergency shutdown.","A runaway fictional plasma reaction threatens the laboratory."),
 E("freezedown","Freezedown","Common","cold",95,"#9eeeff","Increase heat and reduce cooling before the core crystallises.","Extreme cooling crystallises the core and fills the chamber with frost."),
 E("rainbowMeltdown","Rainbow Meltdown","Very Rare","hot",100,"#fb65ec","Restore balance or evacuate during chromatic instability.","Multicoloured plasma breaks into spectacular energy ribbons."),
 E("rainbowFreezedown","Rainbow Freezedown","Very Rare","cold",100,"#7bfaff","Restore heat and protect the crystalline containment.","An iridescent freeze consumes the chamber."),
 E("containment","Containment Breach","Uncommon","integrity",90,"#ff9958","Restore containment and use maintenance repair terminals.","The containment field fractures into radiant fragments."),
 E("collapse","Reactor Collapse","Rare","collapse",100,"#aa55ff","Repair systems and restore containment before collapse.","The core pulls waves of fictional energy inward."),
 E("plasma","Plasma Storm","Common","repair",76,"#ff85d7","Repair multiple systems at maintenance terminals.","Wild arcs surge between emitters and the plasma sphere."),
 E("outage","Power Outage","Common","power",85,"#f2bd67","Restore backup power, then power distribution.","The facility goes dark and only emergency lights remain."),
 E("blackout","Blackout Cascade","Uncommon","power",110,"#e08335","Restore backup power and repair the power network.","Successive systems drop offline across the spacecraft."),
 E("gravity","Gravitational Anomaly","Rare","repair",80,"#8ad6ff","Run diagnostics and repair the anomaly.","The chamber bends and flickers with distorted gravity."),
 E("emitter","Emitter Malfunction","Common","repair",65,"#dc91ff","Enable emitters and repair them in the service tunnel.","An emitter misfires and the core pulses asymmetrically."),
 E("cooling","Cooling System Failure","Common","hot",90,"#ff723c","Restore cooling in the cooling systems room.","Cooling systems become erratic during operation."),
 E("cryo","Cryogenic Surge","Uncommon","cold",90,"#87ebff","Stabilise temperature and repair cooling.","A pale frost wave washes over the ship."),
 E("resonance","Reactor Resonance","Uncommon","repair",85,"#cc77ff","Run diagnostics and restore systems.","Mysterious pulses resonate through the laboratory."),
 E("cosmic","Cosmic Storm","Rare","repair",95,"#619aff","Repair systems while the storm passes.","Brilliant cosmic lightning surrounds the vessel."),
 E("meteor","Meteor Shower","Uncommon","repair",70,"#ffaf59","Activate backup power and perform repairs.","Meteors streak past the observation windows."),
 E("void","Void Anomaly","Legendary","collapse",105,"#7426b8","Repair systems and restore containment. Evacuate if necessary.","A dark presence distorts the core and surrounding light."),
 E("phantom","Phantom Ignition","Rare","repair",80,"#85ffe5","Run diagnostics and repair the mysterious ignition.","The plasma glows even when the system reports offline."),
 E("time","Time Distortion","Rare","repair",80,"#beafff","Run diagnostics and repair system timing.","Unreliable clocks and waves of distorted light fill the ship."),
 E("evacuation","Emergency Evacuation","Uncommon","evac",65,"#ffb642","Reach an escape pod bay and activate a launch control.","An imminent emergency forces the crew to abandon ship."),
 E("recovery","Emergency Recovery","Uncommon","repair",90,"#56ef9f","Restore three damaged systems.","The laboratory survives, but its systems require recovery."),
 E("reboot","Total System Reboot","Uncommon","power",75,"#66cfff","Restore backup power and run diagnostics.","All primary monitors enter a controlled reboot."),
 E("hypercore","Hypercore","Very Rare","repair",85,"#ffffff","Rebalance the reactor using diagnostics and repairs.","The core becomes dramatically luminous and unstable."),
 E("eclipse","Eclipse Event","Rare","repair",70,"#bfa8ed","Restore systems during the eclipse.","The ship passes into shadow as a strange anomaly appears."),
 E("golden","Golden Core","Legendary","bonus",45,"#ffd56c","Observe the newly discovered golden core.","A rare golden form grants a temporary stability boost."),
 E("mainframe","Corrupt Mainframe","Rare","computer",100,"#70ff77","Restore the mainframe in the northern sector.","A rogue fictional AI hijacks announcements and displays."),
 E("aurelius","Aurelius Protocol","Classified","repair",110,"#d1ac52","Restore four classified systems in the experimental sector.","A secret protocol initiates a highly unusual phenomenon."),
 E("omega","Omega Protocol","Classified","collapse",125,"#fc76ee","Restore containment and perform emergency repairs, or escape.","Multiple extraordinary anomalies combine in a spectacular finale.")
];
export const STARTUPS=["Normal Startup","Failed Startup","Unstable Shield Startup","Startup Overload","Rainbow Startup"];
const STAGE_MESSAGES={
 hot:["Thermal surge continuing. Coolant systems are under sustained stress.","Reactor temperatures are rising beyond the emergency threshold. Begin evacuation preparations.","Final thermal escalation. Emergency shutdown or evacuation required."],
 cold:["A cryogenic wave is spreading through the containment chamber.","Critical frost accumulation detected. Restore heat and prepare to evacuate.","Core crystallisation imminent. Proceed to the escape pods."],
 integrity:["Containment field fluctuations are intensifying.","Multiple shield sections have failed. Repair the containment network immediately.","Catastrophic field failure imminent. Clear the chamber."],
 collapse:["The reactor is contracting. Concentric energy waves are being drawn toward its centre.","Core collapse accelerating. Stabilisation or evacuation is required.","Final collapse stage. All personnel must reach emergency shelter."],
 power:["Primary power distribution has failed. Backup power is required.","Secondary systems are losing power. Restore distribution from the generator wing.","Emergency reserves exhausted. Complete immediate power recovery."],
 computer:["Unrecognised instructions detected in the mainframe.","Critical subsystems are responding to unauthorised signals. Restore the mainframe.","Mainframe override approaching completion. Recovery personnel stand by."],
 repair:["Anomaly intensity increasing. Repair terminals are now available.","Secondary failures detected. Maintenance personnel report to the designated systems.","Final recovery window. Complete outstanding repairs or evacuate."],
 evac:["Emergency evacuation has been ordered. Escape pods authorised.","The remaining evacuation window is closing. Proceed directly to the east wing.","Final evacuation call. Launch all occupied escape pods."],
 bonus:["Golden plasma signatures confirmed. Continue observing the reactor.","Stability enhancement remains within acceptable limits.","Golden core observation concluded. Preparing recovery."]
};
const SPECIAL_STAGES={
 plasma:["Increasing plasma discharges detected across the reactor emitters.","Electrical arcs are exceeding containment tolerances. Maintenance crews proceed to repairs.","Plasma storm at maximum intensity. Complete reactor recovery before contact is lost."],
 gravity:["Unexpected gravimetric fluctuations detected.","Local gravitational instability is spreading across facility compartments.","Critical gravity displacement imminent. Complete the anomaly repair."],
 cosmic:["The spacecraft has entered a charged particle storm.","Cosmic lightning is interfering with the laboratory systems.","Storm intensity peaking. Restore damaged systems or evacuate."],
 meteor:["Multiple incoming impacts detected on the observation arrays.","Hull sensors report escalating impact activity. Backup and diagnostics required.","Main meteor front approaching. Complete repairs immediately."],
 void:["Unknown dark-plasma readings detected inside the containment field.","The anomaly is drawing energy inward. Containment integrity is rapidly deteriorating.","The void is approaching singularity. All personnel evacuate."],
 time:["Reactor timing systems are losing synchronisation.","Temporal interference spreading throughout the ship. Restore diagnostic systems.","Critical timing anomaly. Recovery personnel act now."],
 hypercore:["Output has exceeded the recorded operating range.","The core is approaching a high-energy luminous state. Restore stability.","Hypercore discharge imminent. Complete emergency repairs."],
 aurelius:["The classified Aurelius protocol has entered secondary activation.","Restricted systems require four verified maintenance acknowledgements.","Aurelius final stage commencing. Failure to complete the directive will isolate the laboratory."],
 omega:["Omega conditions intensifying. Multiple anomalies are now present.","Containment and gravitational disruption have reached critical levels.","Omega final sequence initiated. Evacuation is strongly advised."]
};
export function eventStageLine(event,stage){return (SPECIAL_STAGES[event.id]||STAGE_MESSAGES[event.kind]||STAGE_MESSAGES.repair)[Math.max(0,Math.min(2,stage-1))]}
export const STARTUP_DURATION=36000;
export const STARTUP_STAGES=[
 {at:0,name:"SYSTEM CHECK",line:"Attention all personnel. Ignition sequence authorised. Secure the reactor chamber."},
 {at:5000,name:"EMITTER CHARGING",line:"Primary emitters charging. Power systems transferring to the ignition grid."},
 {at:11000,name:"FIELD GENERATION",line:"Containment field forming. Stand clear of the chamber."},
 {at:19000,name:"PLASMA FORMATION",line:"Plasma signatures detected. Synchronising emitter frequencies."},
 {at:27000,name:"IGNITION PULSE",line:"Ignition imminent. All personnel prepare for the final energy pulse."},
 {at:33000,name:"STABILISATION",line:"Core established. Verifying stability and reactor output."}
];
export const ACTIONS=[...BASE_ACTIONS];
export const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
export const MODE_NAMES=["Standard","Sandbox","Survival","Hardcore"];
export const defaultConfig={max:16,mode:"Standard",visibility:"public",difficulty:"Normal",instability:1,frequency:"Normal",auto:false,special:true,duration:30,access:"Everyone"};
export const cellName=(x,z)=>MAP[clamp(Math.round(z/10)+3,0,6)][clamp(Math.round(x/10)+3,0,6)];
export function sectorRoute(start,goal,reactorClosed=false){
 if(!Number.isInteger(start)||!Number.isInteger(goal)||start<0||goal<0||start>=49||goal>=49)return [];
 const queue=[start],prev=new Map([[start,-1]]),reactor=i=>MAP[Math.floor(i/7)][i%7]==="REACTOR";
 for(let p=0;p<queue.length;p++){
  const at=queue[p];if(at===goal)break;
  const x=at%7,y=Math.floor(at/7);
  for(const [dx,dy] of [[0,-1],[1,0],[0,1],[-1,0]]){
   const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>6||ny>6)continue;
   const n=ny*7+nx;if(prev.has(n)||(reactorClosed&&reactor(at)!==reactor(n)))continue;
   prev.set(n,at);queue.push(n)
  }
 }
 if(!prev.has(goal))return [];
 const route=[];for(let at=goal;at>=0;at=prev.get(at))route.push(at);return route.reverse()
}
export function emergencyActive(s){
 if(s.result)return false;
 return (!!s.event&&s.event.kind!=="bonus")||["CRITICAL","MELTDOWN","FREEZEDOWN","CONTAINMENT FAILURE","COLLAPSE"].includes(s.phase)||!!s.shutdown?.emergency
}
export function controlStatus(s,a,config={},isHost=true){
 if(!a)return "UNKNOWN CONTROL";
 const director=["scenario","startup","regenerate"].includes(a.id);
 if(director&&!isHost)return "HOST AUTHORISATION REQUIRED";
 if(a.id==="regenerate")return null;
 if(s.result)return "SHIFT ENDED — RESTART SHIFT";
 if(config.access==="Host Only"&&!isHost&&a.id!=="launch")return "HOST AUTHORISATION REQUIRED";
 if(a.id==="launch")return emergencyActive(s)?null:"ESCAPE PODS LOCKED — EMERGENCIES ONLY";
 if(a.id==="ignite"||a.id==="startup"||a.id==="scenario"){
  if(s.event||s.phase==="STARTING"||s.shutdown)return "EVENT DIRECTOR BUSY — ONE EVENT AT A TIME";
  if((a.id==="ignite"||a.id==="startup")&&s.phase!=="OFFLINE")return "IGNITION REQUIRES OFFLINE REACTOR";
 }
 if(a.id==="shutdown"||a.id==="emergency"){
  if(["OFFLINE","STARTING","DESTROYED"].includes(s.phase))return "REACTOR NOT OPERATIONAL";
  if(s.shutdown||!s.shutdownAvailable)return "SHUTDOWN SYSTEM UNAVAILABLE";
  if(a.id==="shutdown"&&s.event?.kind==="bonus")return "NORMAL SHUTDOWN LOCKED — EVENT IN PROGRESS";
  if(a.id==="shutdown"&&emergencyActive(s))return "NORMAL SHUTDOWN LOCKED — USE EMERGENCY SHUTDOWN";
  if(a.id==="emergency"&&!emergencyActive(s))return "EMERGENCY SHUTDOWN LOCKED — NO ACTIVE EMERGENCY";
 }
 return null
}
export function colorFor(s){
 if(s.event){if(s.event.id.startsWith("rainbow"))return "rainbow";return s.event.color}
 if(s.phase==="OFFLINE"||s.phase==="DESTROYED")return "#1f3347";
 if(s.phase==="STARTING")return s.startup==="Rainbow Startup"?"rainbow":"#be7aff";
 if(s.temp>125000)return "#ff2525";if(s.temp>80000)return "#ff753b";if(s.temp>55000)return "#ffc65e";if(s.temp<9000)return "#9cefff";return "#8a76ff"
}
export const fmt=n=>Math.round(n).toLocaleString("en-GB");
