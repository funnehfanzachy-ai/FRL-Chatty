export const TRACKS={
 startup:{title:"Reactor Startup Song",file:"reactor-startup-song.mp3"},
 shutdown:{title:"Shutdown",file:"shutdown.mp3"},
 story:{title:"My Story",file:"my-story.mp3"},
 quicksand:{title:"Quicksand",file:"quicksand.mp3"},
 roller:{title:"Roller Mobster",file:"roller-mobster.mp3"},
 mental:{title:"Going Mental",file:"going-mental.mp3"},
 ruinous:{title:"Ruinous",file:"ruinous.mp3"},
 deprivation:{title:"Thought Deprivation",file:"thought-deprivation.mp3",aliases:["YTDown.com_YouTube_Thought-Deprivation-A-core-game-OST-v0-6_Media_AV8MqjyaQv8_009_128k.mp3"]},
 anthem:{title:"New Life Anthem",file:"new-life-anthem.mp3",aliases:["YTDown.com_YouTube_New-Life-Anthem_Media_j6TnVatHRAA_009_128k.mp3"]},
 xbox:{title:"Roblox Xbox theme",file:"roblox-xbox-theme.mp3"},
 naxion:{title:"Naxion Phase 3 Melt",file:"naxion-phase-3-melt.mp3"},
 hammer:{title:"Hammer O' Justice",file:"hammer-o-justice.mp3"},
 hostile:{title:"hOSTILE",file:"hostile.mp3"},
 stall:{title:"Shift Stall",file:"shift-stall.ogg"}
};
const cues={
 xbox:["menu"],
 story:["idle","golden"],
 anthem:["survived","recovery","launch"],
 startup:["startup","startupRainbow"],
 shutdown:["shutdown","shutdownEmergency","startupFailed"],
 quicksand:["stable","gravity","reboot","time","phantom","cryo"],
 roller:["plasma","cosmic","meteor","resonance","hypercore","rainbowMeltdown"],
 mental:["meltdown","startupOverload","emitter","cooling"],
 ruinous:["freezedown","rainbowFreezedown","collapse","void","lost"],
 deprivation:["startupShield","eclipse"],
 stall:["outage","blackout"],
 hostile:["critical","mainframe"],
 hammer:["containment","evacuation","aurelius"],
 naxion:["omega"]
};
export const SOUNDTRACK=Object.fromEntries(Object.entries(cues).flatMap(([id,keys])=>keys.map(key=>[key,id])));
export const trackForTheme=(theme,stage=0)=>stage>=3&&["meltdown","rainbowMeltdown","omega"].includes(theme)?"naxion":SOUNDTRACK[theme]||null;
export const trackFallbacks={anthem:["story","quicksand"],deprivation:["stall","ruinous"],hammer:["roller","mental"],xbox:["story"],stall:["ruinous"]};
export const normaliseTrackName=name=>String(name).toLowerCase().replace(/\s*\(\d+\)(?=\.(mp3|ogg)$)/,"").replace(/\.(mp3|ogg)$/i,"").replace(/[^a-z0-9]/g,"");
