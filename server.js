// Ladybug Chat: public chat room, no sign-in. Run: npm install && npm start
const http = require('http');
const { WebSocketServer } = require('ws');

const PAGE = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Ladybug Chat</title>
<style>
:root{--bg:#f6f3f4;--panel:#fff;--text:#1b1b1f;--mute:#777;--red:#d90429;--them:#ececf0;--line:#e3e0e2}
@media(prefers-color-scheme:dark){:root{--bg:#121014;--panel:#1c191f;--text:#f2f0f3;--mute:#9a959c;--them:#2b272e;--line:#322e35}}
html,body{height:100%;margin:0;background:var(--bg);color:var(--text);font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
#app{height:100%;display:flex;flex-direction:column;max-width:720px;margin:0 auto;background:var(--panel)}
header{padding:12px 16px;border-bottom:1px solid var(--line);display:flex;gap:10px;font-weight:600}
header small{margin-left:auto;color:var(--mute);font-weight:400}
#list{flex:1;overflow-y:auto;padding:12px 14px;display:flex;flex-direction:column;gap:6px}
.m{max-width:78%;display:flex;flex-direction:column}.m.me{align-self:flex-end;align-items:flex-end}
.who,.t{font-size:.7rem;color:var(--mute);margin:2px 8px}
.b{padding:8px 13px;border-radius:18px;background:var(--them);overflow-wrap:anywhere;white-space:pre-wrap}
.me .b{background:var(--red);color:#fff}
.sys{align-self:center;font-size:.75rem;color:var(--mute)}
.bar{display:flex;gap:8px;padding:10px;border-top:1px solid var(--line)}
input{flex:1;min-width:0;padding:11px 14px;border-radius:22px;border:1px solid var(--line);background:var(--bg);color:var(--text);font-size:1rem}
button{border:0;border-radius:22px;background:var(--red);color:#fff;padding:0 18px;font-size:1rem;cursor:pointer}
#join{position:fixed;inset:0;background:var(--bg);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;z-index:5}
#join h1{margin:0;font-size:2rem}#join input{flex:none;width:min(280px,80vw);text-align:center}#join button{padding:11px 28px}
</style></head><body>
<div id="join"><h1>🐞 Ladybug Chat</h1><input id="nm" placeholder="Your name" maxlength="20"><button id="go">Join</button></div>
<div id="app"><header>🐞 Ladybug Chat<small id="st">connecting…</small></header><div id="list"></div>
<div class="bar"><input id="in" placeholder="Type a message" maxlength="1000" autocomplete="off"><button id="send">Send</button></div></div>
<script>
const $=id=>document.getElementById(id),list=$('list');let ws,name=localStorage.getItem('lbname')||'',id=Math.random().toString(36).slice(2);
$('nm').value=name;
function add(m){const d=document.createElement('div');
 if(m.sys){d.className='sys';d.textContent=m.text}
 else{d.className='m'+(m.cid===id?' me':'');const w=document.createElement('div');w.className='who';w.textContent=m.cid===id?'You':m.name;
  const b=document.createElement('div');b.className='b';b.textContent=m.text;const t=document.createElement('div');t.className='t';
  t.textContent=new Date(m.ts).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});d.append(w,b,t)}
 const stick=list.scrollTop+list.clientHeight>=list.scrollHeight-60;list.appendChild(d);if(stick)list.scrollTop=list.scrollHeight}
function connect(){ws=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host);
 ws.onopen=()=>{$('st').textContent='live';ws.send(JSON.stringify({type:'join',name,cid:id}))};
 ws.onmessage=e=>{const m=JSON.parse(e.data);
  if(m.type==='history'){list.innerHTML='';m.items.forEach(add);list.scrollTop=list.scrollHeight}
  else if(m.type==='online')$('st').textContent=m.n+' online';else add(m)};
 ws.onclose=()=>{$('st').textContent='reconnecting…';setTimeout(connect,1500)}}
function start(){name=$('nm').value.trim().slice(0,20)||'Guest';localStorage.setItem('lbname',name);$('join').remove();connect();$('in').focus()}
$('go').onclick=start;$('nm').onkeydown=e=>{if(e.key==='Enter')start()};
function send(){const t=$('in').value.trim();if(!t||!ws||ws.readyState!==1)return;ws.send(JSON.stringify({type:'msg',text:t}));$('in').value=''}
$('send').onclick=send;$('in').onkeydown=e=>{if(e.key==='Enter')send()};
</script></body></html>`;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(PAGE);
});

const wss = new WebSocketServer({ server });
let history = [];
const push = m => { history.push(m); if (history.length > 100) history.shift(); };
const sendAll = o => { const s = JSON.stringify(o); wss.clients.forEach(c => c.readyState === 1 && c.send(s)); };
const online = () => sendAll({ type: 'online', n: wss.clients.size });

wss.on('connection', ws => {
  ws.on('message', raw => {
    let d; try { d = JSON.parse(raw); } catch { return; }
    if (d.type === 'join') {
      ws.name = String(d.name || 'Guest').slice(0, 20);
      ws.cid = String(d.cid || '').slice(0, 20);
      ws.send(JSON.stringify({ type: 'history', items: history }));
      const m = { sys: true, text: ws.name + ' joined', ts: Date.now() };
      push(m); sendAll(m); online();
    } else if (d.type === 'msg' && ws.name) {
      const text = String(d.text || '').slice(0, 1000).trim();
      if (!text) return;
      const m = { name: ws.name, cid: ws.cid, text, ts: Date.now() };
      push(m); sendAll(m);
    }
  });
  ws.on('close', online);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Ladybug Chat running on port ' + PORT));
