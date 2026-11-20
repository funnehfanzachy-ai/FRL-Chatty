import {MusicDirector} from "./music.js";
export class AudioSystem{
 constructor(settings){this.settings=settings;this.enabled=false;this.lastBeat=0;this.lastStage=-1;this.wasPhase="";this.voiceQueue=[];this.speaking=false}
 init(){
  if(this.enabled)return;try{let ac=new (window.AudioContext||window.webkitAudioContext)();this.ac=ac;this.master=ac.createGain();this.master.connect(ac.destination);this.music=ac.createGain();this.music.connect(this.master);this.sfx=ac.createGain();this.sfx.connect(this.master);this.amb=ac.createGain();this.amb.connect(this.master);
   this.hum=ac.createOscillator();this.hum.frequency.value=47;this.hum.type="sine";this.humGain=ac.createGain();this.humGain.gain.value=.025;this.hum.connect(this.humGain);this.humGain.connect(this.amb);this.hum.start();
   this.hum2=ac.createOscillator();this.hum2.frequency.value=61;this.hum2.type="triangle";this.humGain2=ac.createGain();this.humGain2.gain.value=.012;this.hum2.connect(this.humGain2);this.humGain2.connect(this.amb);this.hum2.start();
   this.noiseBuffer=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate);let d=this.noiseBuffer.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;this.director=new MusicDirector(this);this.enabled=true;this.apply();ac.resume()
  }catch(e){console.warn("Audio unavailable",e)}
 }
 apply(){if(!this.enabled)return;let t=this.ac.currentTime;for(let [g,v] of [[this.master,this.settings.master],[this.music,this.settings.music],[this.sfx,this.settings.sfx],[this.amb,this.settings.ambient]])g.gain.setTargetAtTime(v/100,t,.06)}
 note(freq,dur=.5,vol=.06,type="sine",mix=this.music,slide=0,start=null,attack=.06,cutoff=0){if(!this.enabled)return;let ac=this.ac,t=start??ac.currentTime,o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.setValueAtTime(Math.max(1,freq),t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(1,slide),t+dur);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.001,vol),t+Math.min(attack,dur*.40));g.gain.exponentialRampToValueAtTime(.0001,t+dur);if(cutoff){let f=ac.createBiquadFilter();f.type="lowpass";f.frequency.value=cutoff;f.Q.value=.45;o.connect(f);f.connect(g)}else o.connect(g);g.connect(mix);o.start(t);o.stop(t+dur+.03)}
 noise(dur=.2,vol=.04,filter=550,mix=this.sfx,start=null,high=false){if(!this.enabled)return;let ac=this.ac,t=start??ac.currentTime,n=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();n.buffer=this.noiseBuffer;f.type=high?"highpass":"lowpass";f.frequency.value=filter;g.gain.setValueAtTime(Math.max(.001,vol),t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);n.connect(f);f.connect(g);g.connect(mix);n.start(t,Math.random()*.4);n.stop(t+dur)}
 click(){this.init();this.note(460,.12,.035,"triangle",this.sfx,260)}
 deny(){this.init();this.note(180,.22,.075,"square",this.sfx,110,null,.02,680)}
 regeneration(){if(!this.enabled)return;const t=this.ac.currentTime;[196,261.6,329.6,392,523.2].forEach((n,i)=>this.note(n,.56,.08,"triangle",this.sfx,0,t+i*.105,.035,1600));this.noise(.7,.06,1700)}
 foot(sprint=false){this.noise(.16,sprint?.06:.035,sprint?500:320);this.note(80,.09,.018,"sine",this.sfx,38)}
 impact(){this.noise(.95,.24,190);this.note(82,1.7,.22,"triangle",this.sfx,24);this.note(156,1.1,.08,"sine",this.sfx,40)}
 announce(text){if(!this.settings.subtitles&&!this.settings.voice)return;this.voiceQueue.push(text);this.pumpVoice()}
 pumpVoice(){if(this.speaking||!this.voiceQueue.length||!window.speechSynthesis)return;const text=this.voiceQueue.shift();if(!this.settings.voice){this.pumpVoice();return}let u=new SpeechSynthesisUtterance(text);u.pitch=.78;u.rate=.95;u.volume=(this.settings.voice/100)*(this.settings.master/100);let voices=speechSynthesis.getVoices();let voice=voices.find(v=>v.lang==="en-GB")||voices.find(v=>v.lang.startsWith("en"));if(voice)u.voice=voice;this.speaking=true;u.onend=u.onerror=()=>{this.speaking=false;this.pumpVoice()};speechSynthesis.speak(u)}
 clear(){this.voiceQueue=[];if(window.speechSynthesis)speechSynthesis.cancel();this.speaking=false}
 stageSfx(s){
  if(s?.phase!=="STARTING"){this.lastStage=-1;return}
  let stage=s.startStep||0;if(stage===this.lastStage)return;this.lastStage=stage;const t=this.ac.currentTime;
  if(stage===0){this.note(136,1.2,.09,"triangle",this.sfx,56,t,.04,950);this.noise(.55,.07,330)}
  if(stage===1){this.note(48,2.8,.1,"triangle",this.sfx,360,t,.4,1700);this.noise(.8,.06,650)}
  if(stage===2){[196,261.6,392].forEach((n,i)=>this.note(n,1.7,.065,"triangle",this.sfx,0,t+i*.12,.24,1700))}
  if(stage===3){this.note(105,2.5,.075,"sine",this.sfx,495,t,.45);this.noise(1,.06,1200)}
  if(stage===5){[261.6,329.6,392,523.2].forEach((n,i)=>this.note(n,1.2,.052,"sine",this.sfx,0,t+i*.075,.18))}
 }
 update(state,dist,t,menu=false,launch=false){
  if(!this.enabled)return;let ac=this.ac,time=ac.currentTime,phase=menu?"MENU":state?.phase||"OFFLINE",event=state?.event,startup=phase==="STARTING",p=startup?Math.max(0,Math.min(1,state?.startProgress||0)):0;
  const tension=menu?.06:launch?.8:startup?.12+p*.87:event?.kind==="bonus"?.50:event?Math.min(1,.37+event.progress*.63):phase==="CRITICAL"?.85:state?.shutdown?.65:phase==="OVERHEATING"?.47:.25;
  this.director.update(state,menu,launch,tension);this.stageSfx(menu?null:state);
  let hum=(menu?.018:phase==="OFFLINE"?.012:(.046+tension*.021))*Math.exp(-dist*.028);this.humGain.gain.setTargetAtTime(hum,time,.27);this.humGain2.gain.setTargetAtTime(hum*.45,time,.32);this.hum.frequency.setTargetAtTime(42+(state?.temp||0)/5200+(startup?p*20:0),time,.35);
  if(phase!==this.wasPhase){if(!menu&&["MELTDOWN","FREEZEDOWN","CONTAINMENT FAILURE","COLLAPSE"].includes(phase)){this.note(198,.65,.075,"triangle",this.sfx,66);this.noise(.45,.10,220)}this.wasPhase=phase}
  if(!menu&&event&&event.kind!=="bonus"&&!state.ack&&time-this.lastBeat>2.3-tension*1.15){
   this.lastBeat=time;let hz=event.kind==="cold"?870:event.kind==="computer"?415:event.kind==="collapse"?330:event.kind==="power"?250:660;
   this.note(hz,.27,.058,"triangle",this.sfx,hz*.72,time,.04,1600);
   if(event.stage>=2)this.note(hz*.52,.24,.035,"triangle",this.sfx,hz*.7,time+.34,.028,1200)
  }
 }
}
