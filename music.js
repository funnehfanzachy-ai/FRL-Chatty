import {trackForTheme,trackFallbacks} from "./soundtrack.js";
const T=(title,bpm,root,chords,melody,style="ambient",major=false)=>({title,bpm,root,chords,melody,style,major});
export const MUSIC_THEMES={
 menu:T("Beyond the Horizon",76,45,[0,8,3,10],[12,null,15,null,19,null,17,null,15,null,12,null,10,null,7,null],"ambient"),
 idle:T("Silent Laboratory",70,43,[0,5,3,8],[12,null,null,15,null,null,19,null,17,null,null,12,null,null,10,null],"ambient"),
 stable:T("Core of Tomorrow",91,45,[0,5,8,7],[12,null,15,19,null,17,15,null,12,10,null,14,15,null,19,null],"steady"),
 startup:T("Ignition Protocol",108,45,[0,8,3,10],[12,null,15,null,19,null,22,19,15,null,17,null,19,22,24,null],"startup"),
 startupFailed:T("A Flame Unborn",94,43,[0,6,1,8],[12,null,13,null,18,15,null,11,12,null,7,null,6,3,1,null],"dark"),
 startupShield:T("Fractured Horizon",113,46,[0,1,8,6],[12,null,19,13,null,18,16,null,12,13,null,19,18,null,15,null],"pulse"),
 startupOverload:T("Beyond the Limit",142,42,[0,3,6,1],[12,15,null,18,19,null,24,22,18,15,null,13,12,18,null,19],"danger"),
 startupRainbow:T("Spectrum Awakening",120,48,[0,7,9,5],[12,16,19,null,21,19,16,14,12,null,16,19,24,21,19,null],"sparkle",true),
 shutdown:T("The Last Light",82,47,[0,5,8,3],[19,null,17,null,15,null,12,null,10,null,8,null,7,null,5,null],"calm"),
 shutdownEmergency:T("Critical Intervention",120,42,[0,1,6,3],[12,null,13,18,19,null,13,12,15,null,18,17,13,null,12,null],"danger"),
 meltdown:T("When the Stars Burn",138,41,[0,3,8,6],[12,12,15,null,18,19,15,13,12,15,18,22,19,18,13,null],"danger"),
 freezedown:T("Absolute Silence",86,45,[0,7,1,8],[19,null,20,null,15,null,13,null,12,null,15,null,19,null,18,null],"ice"),
 rainbowMeltdown:T("Chromatic Catastrophe",150,43,[0,4,6,9],[12,16,19,22,24,22,19,16,13,17,20,23,25,20,17,null],"sparkle"),
 rainbowFreezedown:T("Aurora Zero",102,48,[0,4,9,5],[24,null,21,19,16,null,14,12,19,null,21,24,23,null,19,null],"ice",true),
 containment:T("Containment Lost",128,40,[0,6,3,1],[12,18,null,13,12,null,15,18,19,null,13,12,18,null,15,null],"danger"),
 collapse:T("The Falling Star",118,44,[0,1,8,6],[19,18,15,13,12,null,11,12,19,null,18,15,13,12,6,null],"dark"),
 plasma:T("Serpents of Light",132,45,[0,5,8,6],[12,15,19,15,null,18,15,12,17,20,19,null,15,18,12,null],"pulse"),
 outage:T("Black Corridor",78,40,[0,1,6,3],[12,null,null,13,null,6,null,null,19,null,null,18,null,15,null,null],"dark"),
 blackout:T("End of the Grid",106,39,[0,6,1,8],[12,null,13,null,18,null,12,11,15,null,18,15,13,null,12,null],"dark"),
 gravity:T("Weightless Machines",99,48,[0,2,7,5],[12,null,19,16,null,21,null,23,19,null,15,null,14,19,null,24],"sparkle"),
 emitter:T("Triad Failure",116,43,[0,3,1,6],[12,15,null,18,null,13,12,null,12,18,null,19,15,null,13,null],"pulse"),
 cooling:T("Thermal Ascent",130,45,[0,3,5,8],[12,null,15,17,19,22,null,19,12,15,17,19,24,22,19,null],"danger"),
 cryo:T("Crystal Passage",94,47,[0,5,8,1],[19,null,15,12,null,14,null,19,22,null,20,15,13,null,12,null],"ice"),
 resonance:T("Echoes in the Chamber",110,44,[0,5,1,6],[12,null,12,null,19,null,19,null,15,18,15,18,13,null,18,null],"pulse"),
 cosmic:T("Storm Above Earth",124,41,[0,8,3,10],[12,15,19,null,22,24,22,null,19,17,15,17,19,null,24,null],"danger"),
 meteor:T("Fire Across the Hull",145,43,[0,3,10,5],[12,15,12,null,19,22,19,15,17,17,19,null,22,19,15,null],"danger"),
 void:T("Into Nothing",70,37,[0,1,6,5],[12,null,null,13,null,null,18,null,17,null,null,12,null,6,null,null],"dark"),
 phantom:T("The Silent Return",91,46,[0,1,7,3],[19,null,18,null,15,null,13,12,null,19,null,20,18,null,12,null],"ice"),
 time:T("Out of Sequence",112,49,[0,5,2,8],[12,null,19,12,15,null,15,22,19,17,null,15,14,19,12,null],"pulse"),
 evacuation:T("Final Departure",126,45,[0,8,3,10],[12,15,19,24,22,null,19,17,15,19,22,24,26,24,19,null],"danger"),
 recovery:T("Rebuilding Dawn",96,48,[0,5,9,7],[12,null,16,19,null,21,19,16,12,null,14,16,19,null,21,null],"steady",true),
 reboot:T("System Wake",100,45,[0,1,8,3],[12,null,13,null,15,18,null,12,19,null,18,null,13,15,19,null],"pulse"),
 hypercore:T("Into the Supernova",140,46,[0,5,7,9],[12,16,19,24,28,24,21,19,16,19,24,26,28,24,19,null],"sparkle",true),
 eclipse:T("A Dark Sun",84,43,[0,6,8,1],[19,null,18,15,null,13,null,12,18,null,19,null,15,13,12,null],"dark"),
 golden:T("A Golden Discovery",92,48,[0,7,9,5],[12,null,16,19,21,null,24,21,19,null,16,14,16,19,24,null],"steady",true),
 mainframe:T("Override Signal",134,42,[0,1,6,3],[12,13,12,18,null,13,12,19,18,15,13,12,18,19,13,null],"pulse"),
 aurelius:T("Aurelius Directive",104,44,[0,8,5,1],[12,null,15,19,18,null,22,null,19,15,13,null,18,21,19,null],"classified"),
 omega:T("The Omega Sequence",146,40,[0,6,3,8],[12,18,15,19,24,22,18,15,12,13,18,24,25,22,19,null],"classified"),
 critical:T("Threshold Warning",122,41,[0,3,6,5],[12,null,15,18,19,null,18,15,13,null,12,15,18,null,13,null],"danger"),
 launch:T("Escape Velocity",111,48,[0,5,9,7],[19,21,24,null,21,19,16,12,14,null,16,19,21,null,24,null],"steady",true),
 survived:T("A New Shift",76,48,[0,7,9,5],[12,null,16,null,19,null,21,null,19,null,16,null,14,null,12,null],"calm",true),
 lost:T("The Experiment Ends",64,40,[0,8,5,1],[19,null,null,15,null,null,13,null,12,null,null,8,null,6,null,null],"dark")
};
const midi=n=>440*2**((n-69)/12),unit=v=>Math.max(0,Math.min(1,v));
export function themeFor(s,menu=false,launch=false){
 if(menu)return "menu";if(launch)return "launch";if(s?.result)return s.result.success?"survived":"lost";
 if(s?.shutdown)return s.shutdown.emergency?"shutdownEmergency":"shutdown";
 if(s?.phase==="STARTING")return ({"Failed Startup":"startupFailed","Unstable Shield Startup":"startupShield","Startup Overload":"startupOverload","Rainbow Startup":"startupRainbow"}[s.startup]||"startup");
 if(s?.event&&MUSIC_THEMES[s.event.id])return s.event.id;
 if(s?.phase==="OFFLINE")return "idle";if(["CRITICAL","MELTDOWN","FREEZEDOWN","CONTAINMENT FAILURE","COLLAPSE"].includes(s?.phase))return "critical";
 return "stable"
}
export class MusicDirector{
 constructor(audio){
  this.audio=audio;this.ac=audio.ac;this.track=null;this.fileTrack=null;this.key="";this.available={};this.failedFiles=new Set();fetch("/api/soundtrack",{cache:"no-store"}).then(r=>r.ok?r.json():{}).then(d=>{this.available=d.tracks||{}}).catch(()=>{});
  const ac=this.ac,wet=ac.createGain(),reverb=ac.createConvolver(),length=Math.floor(ac.sampleRate*1.6),imp=ac.createBuffer(2,length,ac.sampleRate);
  for(let channel=0;channel<2;channel++){const data=imp.getChannelData(channel);for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/length,2.7)*.5}
  reverb.buffer=imp;wet.gain.value=.15;wet.connect(reverb);reverb.connect(audio.music);this.wet=wet;
 }
 fadeProcedural(){
  if(!this.track)return;
  const old=this.track.bus,t=this.ac.currentTime;old.gain.cancelScheduledValues(t);old.gain.setTargetAtTime(.0001,t,.28);this.track=null;
  setTimeout(()=>{try{old.disconnect()}catch{}},1800)
 }
 fadeFile(){
  const old=this.fileTrack;if(!old)return;this.fileTrack=null;
  const t=this.ac.currentTime;old.gain.gain.cancelScheduledValues(t);old.gain.gain.setTargetAtTime(.0001,t,.32);
  setTimeout(()=>{old.el.pause();old.el.removeAttribute("src");old.el.load();try{old.node.disconnect();old.gain.disconnect()}catch{}},2000)
 }
 procedural(key){
  if(this.track?.theme===key)return;
  this.fadeProcedural();const ac=this.ac,t=ac.currentTime,bus=ac.createGain();bus.gain.value=.0001;bus.connect(this.audio.music);bus.connect(this.wet);bus.gain.setTargetAtTime(1,t,.55);
  this.track={theme:key,spec:MUSIC_THEMES[key]||MUSIC_THEMES.idle,bus,step:0,next:t+.055}
 }
 setTheme(key,stage=0){
  this.key=key;
  const preferred=trackForTheme(key,stage),base=trackForTheme(key),id=[preferred,base,...(trackFallbacks[base]||[])].find(k=>this.available[k]&&!this.failedFiles.has(k)),url=this.available[id];
  if(!url||this.failedFiles.has(id)){this.fadeFile();this.procedural(key);return}
  if(this.fileTrack?.id===id){if(!this.fileTrack.ready)this.procedural(key);else this.fadeProcedural();return}
  this.fadeFile();this.procedural(key);
  try{
   const el=new Audio(url);el.loop=true;el.preload="auto";
   const node=this.ac.createMediaElementSource(el),gain=this.ac.createGain();gain.gain.value=.0001;node.connect(gain);gain.connect(this.audio.music);
   const track={id,el,node,gain,ready:false};this.fileTrack=track;
   const fail=()=>{if(this.fileTrack!==track)return;this.failedFiles.add(id);this.fadeFile();this.procedural(this.key)};
   el.addEventListener("error",fail,{once:true});
   Promise.resolve(el.play()).then(()=>{if(this.fileTrack!==track)return;track.ready=true;gain.gain.setTargetAtTime(.83,this.ac.currentTime,.33);this.fadeProcedural()}).catch(fail)
  }catch{this.failedFiles.add(id);this.procedural(key)}
 }
 tone(n,duration,vol,type,bus,t,attack=.04,cutoff=0){this.audio.note(midi(n),duration,vol,type,bus,0,t,attack,cutoff)}
 sequence(track,t,tension){
  const {spec,bus}=track,step=track.step++,bar=Math.floor(step/16),index=step%16,beat=60/spec.bpm;
  const root=spec.root+spec.chords[bar%spec.chords.length],style=spec.style,triad=spec.major?[0,4,7,12]:[0,3,7,12],tense=["danger","classified","pulse"].includes(style),quiet=["ambient","calm","ice","dark"].includes(style),sparkle=style==="sparkle";
  const startup=this.key.startsWith("startup"),layer=startup?unit(tension*1.1):unit(.38+tension*.75);
  if(index===0){
   const chord=style==="dark"&&bar%2?[0,1,6,12]:triad;
   for(let i=0;i<chord.length;i++)this.tone(root+chord[i]+(i===0?0:12),beat*3.85,.040+(layer*.011),"triangle",bus,t+i*.012,quiet?.62:.25,quiet?850:1600);
   this.tone(root-12,beat*3.8,.073,"sine",bus,t,.15)
  }
  const pattern=spec.melody[index];if(pattern!=null&&(layer>.25||index%4===0||quiet)){
   const n=spec.root+pattern+spec.chords[bar%spec.chords.length];
   this.tone(n,beat*(quiet?1.55:tense?.49:.82),quiet?.060:.058+layer*.025,sparkle||style==="ice"?"sine":"triangle",bus,t,.035,style==="dark"?950:2350);
   if(sparkle||style==="ice")this.tone(n+12,beat*.9,.025,"sine",bus,t+.027,.018)
  }
  if((index%4===0||tense&&index%4===2)&&(!startup||layer>.32)){
   this.tone(root-12+(index===12&&tense?7:0),beat*(tense?.65:1.15),.078+layer*.045,tense?"sawtooth":"triangle",bus,t,.025,tense?330:470)
  }
  if(index%2===0&&(sparkle||layer>.52||style==="steady")&&(!quiet||layer>.65)){
   this.tone(root+triad[Math.floor(index/2)%triad.length]+12,beat*.45,.018+layer*.025,"triangle",bus,t,.02,2200)
  }
  if((tense||startup||style==="steady"||sparkle)&&layer>.3){
   if(index===0||index===8||(layer>.66&&(index===4||index===12))){this.audio.note(115,.24,.075+layer*.07,"sine",bus,32,t,.012);this.audio.noise(.07,.01,190,bus,t)}
   if(layer>.50&&(index===4||index===12)){this.audio.noise(.14,.045+layer*.03,1900,bus,t,true);this.audio.note(170,.13,.028,"triangle",bus,75,t,.013)}
   if(layer>.65&&index%2===0)this.audio.noise(.055,.019,4300,bus,t,true)
  }
 }
 update(state,menu,launch,tension){
  this.setTheme(themeFor(state,menu,launch),state?.event?.stage||0);const track=this.track;if(!track)return;const time=this.ac.currentTime,step=60/track.spec.bpm/4;
  if(track.next<time-.35)track.next=time+.04;
  while(track.next<time+.17){this.sequence(track,track.next,tension);track.next+=step}
 }
}
