import {access} from "node:fs/promises";
import {spawnSync} from "node:child_process";
const files=["game.js","renderer.js","shared.js","simulation.js","audio.js","music.js","soundtrack.js","server.mjs","test.mjs","index.html","style.css","render.yaml"];
for(const file of files){await access(new URL(file,import.meta.url));if(/\.(m?js)$/.test(file)){const result=spawnSync(process.execPath,["--check",file],{stdio:"inherit"});if(result.status!==0)process.exit(1)}}
console.log("FRL build validated. Ready for Render deployment.");
