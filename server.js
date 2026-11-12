const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const DATA_FILE = path.join(DATA_DIR, "users.json");
const SESSION_SECRET = process.env.SESSION_SECRET || "desafio-aluno-espetacular-dev-secret-change-before-deploy";
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;
const MIME = { ".html":"text/html; charset=utf-8", ".css":"text/css; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".json":"application/json; charset=utf-8", ".ico":"image/x-icon" };
fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]\n", "utf8");

function readUsers() { try { return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); } catch { return []; } }
function writeUsers(users) { fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2) + "\n", { encoding:"utf8", mode:0o600 }); }
function send(res, status, payload) { res.writeHead(status, { "Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store", "X-Content-Type-Options":"nosniff", "Referrer-Policy":"no-referrer" }); res.end(JSON.stringify(payload)); }
function readBody(req) { return new Promise((resolve,reject)=>{ let body=""; req.on("data",chunk=>{body+=chunk;if(body.length>10000){reject(new Error("Requisição muito grande"));req.destroy();}});req.on("end",()=>{try{resolve(JSON.parse(body||"{}"));}catch{reject(new Error("JSON inválido"));}});req.on("error",reject); }); }
function hashPassword(password,salt){return crypto.scryptSync(password,salt,64).toString("hex");}
function publicUser(user){return {username:user.username,points:user.points||0,played:user.played||0,xp:user.xp||0,coins:user.coins||0};}
function safeEqualHex(a,b){try{const aa=Buffer.from(a,"hex"),bb=Buffer.from(b,"hex");return aa.length===bb.length&&crypto.timingSafeEqual(aa,bb);}catch{return false;}}
function signToken(username){const payload=Buffer.from(JSON.stringify({sub:username,exp:Math.floor(Date.now()/1000)+TOKEN_TTL_SECONDS})).toString("base64url");const signature=crypto.createHmac("sha256",SESSION_SECRET).update(payload).digest("base64url");return `${payload}.${signature}`;}
function verifyToken(token){if(typeof token!=="string")return null;const [payload,signature]=token.split(".");if(!payload||!signature)return null;const expected=crypto.createHmac("sha256",SESSION_SECRET).update(payload).digest("base64url");const a=Buffer.from(signature),b=Buffer.from(expected);if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return null;try{const data=JSON.parse(Buffer.from(payload,"base64url").toString("utf8"));if(!data.sub||data.exp<Math.floor(Date.now()/1000))return null;return data.sub;}catch{return null;}}
function authenticatedUser(req){const header=req.headers.authorization||"";const match=header.match(/^Bearer\s+(.+)$/i);if(!match)return null;const username=verifyToken(match[1]);if(!username)return null;return readUsers().find(user=>user.username===username)||null;}
function ranking(){return readUsers().map(publicUser).sort((a,b)=>b.points-a.points||b.played-a.played||a.username.localeCompare(b.username));}

const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,`http://${req.headers.host||"localhost"}`);
  if(req.method==="POST"&&(url.pathname==="/api/register"||url.pathname==="/api/login")){
    try{
      const {username,password}=await readBody(req);
      if(typeof username!=="string"||typeof password!=="string"||username.trim().length<3||username.trim().length>18||password.length<4||password.length>200)return send(res,400,{error:"Informe apelido (3 a 18 caracteres) e senha (mínimo 4 caracteres)."});
      const normalized=username.trim();const users=readUsers();const existing=users.find(u=>u.username.toLowerCase()===normalized.toLowerCase());let user;
      if(url.pathname==="/api/register"){
        if(existing)return send(res,409,{error:"Esse apelido já está em uso. Escolha outro."});
        const salt=crypto.randomBytes(16).toString("hex");user={username:normalized,salt,passwordHash:hashPassword(password,salt),points:0,played:0,xp:0,coins:0,createdAt:new Date().toISOString()};users.push(user);writeUsers(users);
      }else{
        if(!existing)return send(res,401,{error:"Apelido ou senha incorretos."});
        const candidate=hashPassword(password,existing.salt);if(!safeEqualHex(candidate,existing.passwordHash))return send(res,401,{error:"Apelido ou senha incorretos."});user=existing;
      }
      return send(res,url.pathname==="/api/register"?201:200,{user:publicUser(user),token:signToken(user.username)});
    }catch(error){return send(res,400,{error:error.message||"Não foi possível processar a solicitação."});}
  }
  if(req.method==="GET"&&url.pathname==="/api/ranking")return send(res,200,{ranking:ranking()});
  if(req.method==="GET"&&url.pathname==="/api/me"){
    const user=authenticatedUser(req);if(!user)return send(res,401,{error:"Sessão inválida ou expirada. Entre novamente."});
    return send(res,200,{user:publicUser(user),ranking:ranking()});
  }
  if(req.method==="POST"&&url.pathname==="/api/score"){
    const user=authenticatedUser(req);if(!user)return send(res,401,{error:"Sessão inválida ou expirada. Entre novamente."});
    try{
      const body=await readBody(req);const points=body.points;
      if(!Number.isInteger(points)||points<0||points>1000)return send(res,400,{error:"Pontuação inválida."});
      const users=readUsers();const target=users.find(u=>u.username===user.username);if(!target)return send(res,404,{error:"Jogador não encontrado."});
      const coinsEarned=Math.floor(points/10);target.points=(target.points||0)+points;target.xp=(target.xp||0)+points;target.coins=(target.coins||0)+coinsEarned;target.played=(target.played||0)+1;target.updatedAt=new Date().toISOString();writeUsers(users);
      const sorted=ranking();return send(res,200,{user:publicUser(target),coinsEarned,position:sorted.findIndex(u=>u.username===target.username)+1});
    }catch(error){return send(res,400,{error:error.message||"Não foi possível salvar a pontuação."});}
  }
  if(req.method==="GET"||req.method==="HEAD"){
    let requested;try{requested=decodeURIComponent(url.pathname);}catch{return send(res,400,{error:"Caminho inválido."});}
    if(requested==="/")requested="/index.html";
    if(requested.startsWith("/api/")||requested==="/server.js"||requested==="/package.json"||requested.startsWith("/data/"))return send(res,404,{error:"Recurso não encontrado."});
    const filePath=path.resolve(ROOT,"."+requested);if(!filePath.startsWith(ROOT+path.sep))return send(res,403,{error:"Acesso negado."});
    fs.readFile(filePath,(error,data)=>{if(error){res.writeHead(404,{"Content-Type":"text/plain; charset=utf-8"});return res.end("Not found");}res.writeHead(200,{"Content-Type":MIME[path.extname(filePath)]||"application/octet-stream","X-Content-Type-Options":"nosniff","Cache-Control":"no-cache"});if(req.method==="HEAD")return res.end();res.end(data);});return;
  }
  return send(res,404,{error:"Rota não encontrada."});
});
server.listen(PORT,()=>{console.log(`Desafio Aluno Espetacular disponível em http://localhost:${PORT}`);console.log(`Usuários e pontuações salvos em: ${DATA_FILE}`);if(SESSION_SECRET.includes("dev-secret"))console.warn("AVISO: defina SESSION_SECRET no ambiente antes de publicar o projeto.");});
