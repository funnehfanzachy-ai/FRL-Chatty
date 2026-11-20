import http from "node:http";
import {readFile,readdir,stat} from "node:fs/promises";
import {createReadStream} from "node:fs";
import {resolve,join} from "node:path";
import {fileURLToPath} from "node:url";
import {handleAPI,MemoryStore} from "./simulation.js";
import {TRACKS,normaliseTrackName} from "./soundtrack.js";

const store=new MemoryStore(),root=fileURLToPath(new URL(".",import.meta.url));
const musicDir=resolve(process.env.FRL_MUSIC_DIR||join(root,"music")),port=process.env.PORT===undefined?5173:Number(process.env.PORT);
const adminCode=process.env.ADMIN_ACCESS_CODE||"";
const files=new Set(["index.html","style.css","game.js","renderer.js","audio.js","music.js","shared.js","soundtrack.js"]);
const mime={html:"text/html; charset=utf-8",css:"text/css; charset=utf-8",js:"application/javascript; charset=utf-8"};
const headers={"X-Content-Type-Options":"nosniff","Referrer-Policy":"same-origin"};
const reply=(res,status,body,type="text/plain; charset=utf-8",extra={})=>{res.writeHead(status,{...headers,"Content-Type":type,...extra});res.end(body)};
async function musicCatalog(){
 const dir=await readdir(musicDir,{withFileTypes:true}).catch(()=>[]);
 const result={};
 for(const [id,track] of Object.entries(TRACKS)){
  const names=[track.title,track.file,...(track.aliases||[])].map(normaliseTrackName);
  const match=dir.find(f=>f.isFile()&&/\.(mp3|ogg)$/i.test(f.name)&&names.includes(normaliseTrackName(f.name)));
  if(match){const ext=match.name.toLowerCase().endsWith(".ogg")?"ogg":"mp3";result[id]={path:join(musicDir,match.name),url:"/music/"+id+"."+ext,type:ext==="ogg"?"audio/ogg":"audio/mpeg"}}
 }return result
}
async function streamTrack(req,res,file,type){
 const info=await stat(file),size=info.size;
 let start=0,end=size-1,status=200;
 const range=req.headers.range;
 if(range){
  const m=/^bytes=(\d*)-(\d*)$/.exec(range);
  if(!m||(!m[1]&&!m[2])||size===0)return reply(res,416,"",undefined,{"Content-Range":"bytes */"+size});
  if(!m[1]){const suffix=Number(m[2]);start=Math.max(0,size-suffix)}
  else{start=Number(m[1]);end=m[2]?Math.min(Number(m[2]),size-1):size-1}
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=size)return reply(res,416,"",undefined,{"Content-Range":"bytes */"+size});
  status=206
 }
 const h={...headers,"Content-Type":type,"Accept-Ranges":"bytes","Content-Length":Math.max(0,end-start+1),"Cache-Control":"public, max-age=3600"};
 if(status===206)h["Content-Range"]="bytes "+start+"-"+end+"/"+size;
 res.writeHead(status,h);
 if(req.method==="HEAD"||size===0)return res.end();
 const stream=createReadStream(file,{start,end});stream.on("error",()=>res.destroy());res.on("close",()=>stream.destroy());stream.pipe(res);
}
export const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,"http://localhost:"+port),p=url.pathname,method=req.method;
  if(p==="/healthz")return reply(res,200,"ok",undefined,{"Cache-Control":"no-store"});
  if(p==="/api/soundtrack"&&method==="GET"){
   const catalog=await musicCatalog();return reply(res,200,JSON.stringify({tracks:Object.fromEntries(Object.entries(catalog).map(([id,track])=>[id,track.url]))}),"application/json; charset=utf-8",{"Cache-Control":"no-store"})
  }
  if(p.startsWith("/api/")){
   let chunks=[],size=0;for await(const chunk of req){size+=chunk.length;if(size>20000)return reply(res,413,JSON.stringify({error:"Request too large"}),"application/json");chunks.push(chunk)}
   const data=chunks.length?Buffer.concat(chunks):undefined;
   const r=await handleAPI(new Request(url,{method,headers:req.headers,...(data?{body:data}:{})}),store,{adminCode});
   res.writeHead(r.status,{...headers,...Object.fromEntries(r.headers)});res.end(Buffer.from(await r.arrayBuffer()));return
  }
  if(method!=="GET"&&method!=="HEAD")return reply(res,405,"Method not allowed");
  const musicMatch=/^\/music\/([a-z]+)\.(mp3|ogg)$/.exec(p);
  if(musicMatch){
   const catalog=await musicCatalog(),track=catalog[musicMatch[1]];
   if(!track||track.url!==p)return reply(res,404,"Track not installed");
   return await streamTrack(req,res,track.path,track.type)
  }
  const name=p==="/"?"index.html":p.slice(1);
  if(!files.has(name))return reply(res,404,"Not found");
  const data=await readFile(resolve(root,name));res.writeHead(200,{...headers,"Content-Type":mime[name.split(".").pop()],"Content-Length":data.length,"Cache-Control":"no-cache"});res.end(method==="HEAD"?undefined:data);
 }catch(e){if(!res.headersSent)reply(res,500,"Server error");else res.destroy();console.error("HTTP error:",e.message)}
});
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 server.listen(port,"0.0.0.0",()=>console.log("FRL is online at http://localhost:"+server.address().port));
 if(adminCode&&adminCode.length<24)console.warn("ADMIN_ACCESS_CODE is too short: admin mode is disabled. Use at least 24 characters.");
}
