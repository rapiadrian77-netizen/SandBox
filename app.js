/* Sandbox - bundle JS gabungan (02 sampai 60). Dibuat dari js/*.js sesuai urutan lama di index.html. */

/* ===== 02-multiplayer-firebase.js ===== */
/* MULTIPLAYER via FIREBASE Realtime Database. Jalan lintas HP/browser/akun/WiFi.
   Antarmuka room tetap sama (claude.use('room').join(kode)) jadi game tidak perlu diubah. */
(function(){
if(window.claude&&claude.use)return;
const FBV='10.12.2',STALE=9000;
const hs=t=>{let h=2166136261,g=5381;for(let i=0;i<t.length;i++){h=Math.imul(h^t.charCodeAt(i),16777619);g=(g*33)^t.charCodeAt(i)}return(h>>>0).toString(36)+(g>>>0).toString(36)};
const say=m=>{try{toast(m)}catch(e){}};
/* --- key room (tetap kompatibel dengan API key mabar lama) --- */
const ki=()=>{let key=(localStorage.getItem('sp_rkey')||'').replace(/["\s]/g,''),rw=1;const mm=/^spm_([rw])([0-9a-z]{8})([0-9a-f]{12})$/.exec(key);if(mm){if(mm[2]!=='00000000'&&parseInt(mm[2],36)*6e4<Date.now()){say('API key mabar kadaluarsa');throw new Error('expired')}rw=mm[1]==='w';key=mm[3]}return{key,rw}};
const kn=()=>{let k=(localStorage.getItem('sp_rkey')||'').replace(/["\s]/g,'');const m=/^spm_[rw][0-9a-z]{8}([0-9a-f]{12})$/.exec(k);return m?m[1]:k};
/* --- konfigurasi: dari file (FIREBASE_CONFIG) atau dari kotak tempel di Studio --- */
const okCfg=c=>c&&c.apiKey&&c.databaseURL&&!/ISI_/.test(c.apiKey+c.databaseURL);
const cfg=()=>{if(okCfg(window.FIREBASE_CONFIG))return window.FIREBASE_CONFIG;try{const c=JSON.parse(localStorage.getItem('sp_fbcfg')||'null');if(okCfg(c))return c}catch(e){}return null};
const parseCfg=t=>{const o={};['apiKey','authDomain','databaseURL','projectId','storageBucket','messagingSenderId','appId'].forEach(k=>{const m=new RegExp(k+'\\s*[:=]\\s*["\']([^"\']+)["\']').exec(t);if(m)o[k]=m[1]});return o};
const addScript=src=>new Promise(ok=>{const e=document.createElement('script');e.src=src;e.onload=()=>ok(1);e.onerror=()=>ok(0);document.head.appendChild(e)});
const fbLib=async()=>{if(window.firebase&&firebase.database)return 1;const b='https://www.gstatic.com/firebasejs/'+FBV+'/';return (await addScript(b+'firebase-app-compat.js'))&&(await addScript(b+'firebase-database-compat.js'))&&window.firebase&&firebase.database?1:0};
const fbdb=async()=>{if(window.__fbdb)return window.__fbdb;const c=cfg();if(!c)throw new Error('nocfg');if(!(await fbLib()))throw new Error('fblib');const app=firebase.apps.length?firebase.app():firebase.initializeApp(c);return window.__fbdb=firebase.database(app)};
window.spFB=fbdb;window.spParseCfg=parseCfg;
/* diagnosis: cek apakah alamat database terjangkau lewat HTTPS biasa */
const probe=async()=>{const c=cfg();if(!c)return 'konfigurasi Firebase belum diisi';
 try{const r=await timeout(fetch(c.databaseURL.replace(/\/$/,'')+'/.json?shallow=true',{cache:'no-store'}),8000);
  if(r.status===404)return 'databaseURL salah (404). Cek alamat database di file';
  if(r.status===401||r.status===403||r.ok)return 'server Firebase terjangkau, tapi koneksi realtime diblokir. Buka game lewat Chrome (bukan dari TikTok/aplikasi lain) lalu coba lagi';
  return 'Firebase membalas status '+r.status}
 catch(e){return 'server Firebase tidak terjangkau dari jaringan ini. Cek internet/VPN/DNS'}};
window.spProbe=probe;
const TS=()=>firebase.database.ServerValue.TIMESTAMP;
const timeout=(p,ms,msg)=>Promise.race([p,new Promise((_,r)=>setTimeout(()=>r(new Error(msg||'timeout')),ms))]);
/* --- room: semua pemain menulis ke rooms/<hash>/<id>, semua membaca seluruh room --- */
async function join(name,idp){
 let db;
 try{db=await fbdb()}catch(e){
  if(e.message==='expired')throw e;
  say(e.message==='nocfg'?'Firebase belum diatur. Isi konfigurasi dulu (lihat tutorial)':'Gagal memuat Firebase. Cek internet lalu coba lagi');
  throw new Error('none')}
 const {key,rw}=ki(),base=hs(name+'|'+key),id=idp||Math.random().toString(36).slice(2,10);
 const rr=db.ref('rooms/'+base),mine=rr.child(id),con=db.ref('.info/connected');
 const P={},subs=[];let alive=1,me={};
 const list=()=>{const t=Date.now(),a=[{peer:id,isMe:true,kind:'viewer',presence:me}];for(const k in P){if(t-P[k].t>STALE){delete P[k];continue}a.push({peer:k,isMe:false,kind:'viewer',presence:P[k].p,t:P[k].t})}return a};
 const fire=()=>{const l=list();subs.forEach(f=>{try{f({peers:l})}catch(e){}})};
 const onRoom=snap=>{if(!alive)return;const v=snap.val()||{};
  for(const k in v){if(k===id)continue;const s=JSON.stringify(v[k]),o=P[k];if(!o||o.s!==s)P[k]={p:v[k].d||{},t:Date.now(),s}}
  for(const k in P)if(!(k in v))delete P[k];
  fire()};
 const pub=()=>{if(!rw||!alive)return;try{mine.set({d:me,t:TS()})}catch(e){}};
 /* tunggu terhubung ke server Firebase */
 try{await timeout(new Promise(res=>{let done=0;const f=v=>{if(v.val()===true&&!done){done=1;res();setTimeout(()=>{try{con.off('value',f)}catch(e){}},0)}};con.on('value',f)}),20000,'fbtimeout')}
 catch(e){const why=await probe();say('Mabar gagal: '+why);throw new Error('none')}
 rr.on('value',onRoom,()=>{say('Firebase menolak akses. Cek Rules di Realtime Database')});
 /* tiap (re)connect: pasang ulang auto-hapus saat putus & tulis ulang posisi */
 const onCon=con.on('value',s=>{if(s.val()===true&&alive){if(rw){try{mine.onDisconnect().remove()}catch(e){}}pub()}});
 const tm=setInterval(fire,2000),ka=setInterval(pub,2500);
 pub();
 return{peers:list,
  presence(o){if(!rw)return Promise.resolve();Object.assign(me,o);pub();return Promise.resolve()},
  onPeers(f,cl){subs.push(f);return()=>{const i=subs.indexOf(f);if(i>-1)subs.splice(i,1)}},
  leave(){alive=0;clearInterval(tm);clearInterval(ka);try{rr.off('value',onRoom);con.off('value',onCon)}catch(e){}
   try{if(rw){mine.onDisconnect().cancel();mine.remove()}}catch(e){}}}}
/* --- LOBI TEMAN (presence + event) di atas Firebase. Meniru channel Supabase supaya skrip teman tidak perlu diubah --- */
const enc=k=>encodeURIComponent(String(k)).replace(/\./g,'%2E'),dec=k=>{try{return decodeURIComponent(k)}catch(e){return k}};
const jclean=o=>JSON.parse(JSON.stringify(o===undefined?null:o));
function mkChannel(db,name,conf){
 const pk=(conf&&conf.config&&conf.config.presence&&conf.config.presence.key)||Math.random().toString(36).slice(2,10);
 const base='lobby/'+hs(name),pr=db.ref(base+'/p'),mine=pr.child(enc(pk)),inbox=db.ref(base+'/ev/'+enc(pk)),con=db.ref('.info/connected');
 const cbs={sync:[],ev:[]},P={},offs=[];let alive=1,ready=0,lastG='',last=null,tm=null,onP=null,onE=null;
 const state=()=>{const t=Date.now(),st={};for(const k in P){if(t-P[k].t>25000){delete P[k];continue}st[dec(k)]=[P[k].v]}return st};
 const fireSync=()=>{cbs.sync.forEach(f=>{try{f()}catch(e){}})};
 const doTrack=()=>{if(!ready||!alive||!last)return;let o;try{o=jclean(last)}catch(e){return}
  const game=o.game||null;delete o.game;const gs=game?JSON.stringify(game):'';const upd={d:o,t:TS()};if(gs!==lastG)upd.g=game;
  try{mine.update(upd);lastG=gs}catch(e){if('g' in upd){try{delete upd.g;mine.update(upd)}catch(x){}}}};
 const attach=()=>{
  onP=pr.on('value',snap=>{if(!alive)return;const v=snap.val()||{},now=Date.now(),me=enc(pk);
   for(const k in v){if(k===me)continue;const n=v[k]||{},sig=String(n.t);if(!P[k]||P[k].s!==sig){const val=Object.assign({},n.d||{});if(n.g)val.game=n.g;P[k]={v:val,t:now,s:sig}}}
   for(const k in P)if(!(k in v))delete P[k];
   fireSync()});
  onE=inbox.on('child_added',snap=>{if(!alive)return;const v=snap.val();try{snap.ref.remove()}catch(e){}if(!v||!v.p)return;cbs.ev.forEach(f=>{try{f({payload:v.p})}catch(e){}})});
  tm=setInterval(fireSync,5000)};
 const ch={
  on(type,flt,cb){if(type==='presence')cbs.sync.push(cb);else if(type==='broadcast')cbs.ev.push(cb);return ch},
  presenceState(){return state()},
  track(o){last=o;doTrack();return Promise.resolve('ok')},
  send(m){const p=m&&m.payload;if(!p||!p.to||!alive||!ready)return Promise.resolve('error');
   try{db.ref(base+'/ev/'+enc(p.to)+'/'+(p.t==='ack'?'a_':'e_')+String(p.id||Date.now()).replace(/[.#$\[\]\/]/g,'_')).set({p:jclean(p),t:TS()})}catch(e){}
   return Promise.resolve('ok')},
  subscribe(cb){
   const to=setTimeout(()=>{if(!ready&&alive){try{cb&&cb('TIMED_OUT')}catch(e){}}},9000);
   const h=con.on('value',s=>{if(s.val()!==true||!alive)return;try{mine.onDisconnect().remove()}catch(e){}lastG='';
    if(!ready){ready=1;clearTimeout(to);attach();try{cb&&cb('SUBSCRIBED')}catch(e){}}doTrack()});
   offs.push(()=>con.off('value',h));return ch},
  _close(){alive=0;clearInterval(tm);try{if(onP)pr.off('value',onP);if(onE)inbox.off('child_added',onE)}catch(e){}offs.forEach(f=>{try{f()}catch(e){}});try{mine.onDisconnect().cancel();mine.remove()}catch(e){}}};
 return ch}
window.spSB=async()=>{if(window.__sb)return window.__sb;const db=await fbdb();return window.__sb={channel:(n,c)=>mkChannel(db,n,c),removeChannel:ch=>{try{ch._close()}catch(e){}return Promise.resolve('ok')}}};
window.claude={use:async k=>k=='room'?{join}:null};
/* --- bagikan / ambil game lewat Firebase (untuk tombol Gabung Mabar) --- */
const cl=g=>{const d=Object.assign({},g);delete d.thumb;delete d.icon;delete d.by;delete d.mb;d.objs=d.objs||[];return d};
const gpath=()=>'games/'+hs('game|'+roomCode+'|'+kn());
window.spShare=async g=>{try{const db=await fbdb(),r=db.ref(gpath());await r.set({game:cl(g),t:TS()});r.onDisconnect().remove()}catch(e){}};
window.spFetch=async()=>{try{const db=await fbdb(),s=await timeout(db.ref(gpath()).once('value'),7000),v=s&&s.val();if(v&&v.game)return v.game}catch(e){}return null};
window.spJoin=async()=>{toast('Mencari game di room "'+roomCode+'"...');const d=await spFetch();if(!d||typeof d!=='object'||!d.id)return toast('Belum ada game di room ini. Minta temanmu tekan Main dulu dengan kode room yang sama');
 const id=String(d.id);let g=(me.games||[]).find(x=>x.id==id);if(g&&g.mb){me.games=me.games.filter(x=>x!==g);g=null}
 if(!g){const inp=document.getElementById('imp'),dt=new DataTransfer();dt.items.add(new File([JSON.stringify({shinpo:1,kind:'g',data:d})],'m.sandbox.json'));inp.files=dt.files;inp.dispatchEvent(new Event('change'));
  for(let i=0;i<30&&!(g=(me.games||[]).find(x=>x.id==id));i++)await new Promise(r=>setTimeout(r,100));if(!g)return toast('Gagal memuat game temanmu');g.mb=1;save()}
 startGame(g)};
/* UI: Room Key (API key room privat) di Home */
const mk=()=>'rk_'+Array.from(crypto.getRandomValues(new Uint8Array(8))).map(b=>b.toString(16).padStart(2,'0')).join('');
window.addEventListener('load',()=>{
 const R0=window.render;if(typeof R0!=='function')return;
 window.render=render=function(){R0.apply(this,arguments);try{if(page!=='home'||document.getElementById('rkc'))return;const rc=document.getElementById('rc');if(!rc)return;const card=rc.closest('.card');
  card.insertAdjacentHTML('afterend','<div class="card" id="rkc" style="margin-top:14px;background:var(--g)"><button class="btn g w" id="rkj" style="margin-bottom:12px"> Gabung Mabar (pakai kode room di atas)</button><label>API Key Room (opsional, untuk room privat)</label><input type="text" id="rk" placeholder="kosong = room publik" maxlength="40" autocomplete="off" value="'+esc(localStorage.getItem('sp_rkey')||'')+'" style="margin:6px 0 10px"><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm c" id="rkn">Buat Key</button><button class="btn sm" id="rkc2">Salin</button></div><p style="margin:8px 0 0;font-size:12px">Teman harus memasukkan <b>kode room</b> dan <b>API key</b> yang sama untuk berada di dunia yang sama.</p></div>');
  const i=document.getElementById('rk'),sv=()=>{try{localStorage.setItem('sp_rkey',i.value.replace(/\s/g,''))}catch(e){}};
  i.oninput=sv;document.getElementById('rkj').onclick=()=>window.spJoin();document.getElementById('rkn').onclick=()=>{i.value=mk();sv();toast('API key room dibuat')};
  document.getElementById('rkc2').onclick=()=>{i.select();try{document.execCommand('copy')}catch(e){}if(navigator.clipboard)navigator.clipboard.writeText(i.value).catch(()=>{});toast('API key room disalin')}}catch(e){}}});
})();
;

/* ===== 03-api-key-mabar.js ===== */
/* API Key Mabar di halaman Buat (Studio) */
window.addEventListener('load',()=>{
 const R1=window.render;if(typeof R1!=='function')return;
 const mk=()=>'rk_'+Array.from(crypto.getRandomValues(new Uint8Array(8))).map(b=>b.toString(16).padStart(2,'0')).join('');
 const get=()=>{let k='';try{k=localStorage.getItem('sp_rkey')||''}catch(e){}return k},set=k=>{try{localStorage.setItem('sp_rkey',k)}catch(e){}};
 window.render=render=function(){R1.apply(this,arguments);try{if(page!=='create'||document.getElementById('rkS'))return;const pg=document.querySelector('#main .page');if(!pg)return;
  if(!get())set(mk());
  pg.insertAdjacentHTML('beforeend','<div class="card" id="rkS" style="margin-top:18px;background:var(--g)"><h3>API Key Mabar</h3><p style="margin:0 0 8px;font-size:13px">Key ini membuat room privat. Kirim <b>key</b> + <b>kode room</b> (di Home) ke temanmu, lalu mereka isi di Home &rarr; API Key Room. Beda HP, browser, akun, atau WiFi tetap bisa mabar.</p><input type="text" id="rkSi" value="'+esc(get())+'" maxlength="40" autocomplete="off"><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm" id="rkSn">Buat Key Baru</button><button class="btn sm c" id="rkSc">Salin</button><button class="btn sm p" id="rkSt">Tes Koneksi</button></div><div id="rkSs" style="margin-top:10px;font-size:13px"></div></div>');
  const i=document.getElementById('rkSi'),st=document.getElementById('rkSs');
  i.oninput=()=>set(i.value.replace(/\s/g,''));
  document.getElementById('rkSn').onclick=()=>{i.value=mk();set(i.value);toast('API key mabar baru dibuat')};
  document.getElementById('rkSc').onclick=()=>{i.select();try{document.execCommand('copy')}catch(e){}if(navigator.clipboard)navigator.clipboard.writeText(i.value).catch(()=>{});toast('API key disalin')};
  document.getElementById('rkSt').onclick=async()=>{st.textContent='Menghubungkan...';try{const rm=await claude.use('room'),a=await rm.join('tes-'+get());a.leave();st.textContent='\u2705 Terhubung ke server mabar. Key siap dipakai.'}catch(e){st.textContent='\u274c Gagal terhubung. Cek internet lalu coba lagi.'}}}catch(e){}}});
;

/* ===== 04-kartu-firebase-studio.js ===== */
/* Kartu Firebase di halaman Buat (Studio): status, tempel konfigurasi, tes koneksi */
window.addEventListener('load',()=>{
 const R2=window.render;if(typeof R2!=='function')return;
 const has=()=>{try{const c=window.FIREBASE_CONFIG;if(c&&c.apiKey&&c.databaseURL&&!/ISI_/.test(c.apiKey+c.databaseURL))return 'file';const s=JSON.parse(localStorage.getItem('sp_fbcfg')||'null');return s&&s.apiKey&&s.databaseURL?'hp':''}catch(e){return ''}};
 const txt=()=>{const h=has();return h=='file'?'\u2705 Firebase sudah diatur di file game.':h=='hp'?'\u2705 Firebase sudah diatur di HP ini saja (tempel dari kotak di bawah).':'\u26a0\ufe0f Firebase belum diatur. Isi FIREBASE_CONFIG di file, atau tempel konfigurasi di bawah.'};
 window.render=render=function(){R2.apply(this,arguments);try{if(page!=='create'||document.getElementById('fbS'))return;const pg=document.querySelector('#main .page');if(!pg)return;
  pg.insertAdjacentHTML('beforeend','<div class="card" id="fbS" style="margin-top:18px;background:var(--c)"><h3>Firebase (Mabar)</h3><p style="margin:0 0 8px;font-size:13px">Mabar antar HP memakai Firebase Realtime Database. Tempel <b>firebaseConfig</b> dari Firebase Console. Supaya berlaku di semua HP, isi juga di file game lalu upload ulang ke Netlify.</p><div id="fbSs" style="margin:6px 0 10px;font-size:13px"></div><textarea id="fbSt" rows="6" placeholder="const firebaseConfig = { apiKey: &quot;...&quot;, databaseURL: &quot;https://...&quot;, ... };" style="width:100%;box-sizing:border-box;font-size:12px"></textarea><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><button class="btn sm p" id="fbSv">Simpan</button><button class="btn sm c" id="fbSx">Tes Koneksi</button><button class="btn sm" id="fbSd">Hapus</button></div></div>');
  const st=document.getElementById('fbSs'),ta=document.getElementById('fbSt');st.textContent=txt();
  document.getElementById('fbSv').onclick=()=>{const c=window.spParseCfg(ta.value);if(!c.apiKey||!c.databaseURL){st.textContent='\u274c Konfigurasi tidak lengkap. Pastikan ada apiKey dan databaseURL (buat Realtime Database dulu).';return}try{localStorage.setItem('sp_fbcfg',JSON.stringify(c))}catch(e){}window.__fbdb=null;ta.value='';st.textContent=txt()};
  document.getElementById('fbSd').onclick=()=>{try{localStorage.removeItem('sp_fbcfg')}catch(e){}window.__fbdb=null;st.textContent=txt()};
  document.getElementById('fbSx').onclick=async()=>{st.textContent='Mengecek server Firebase...';let dg='';try{dg=await window.spProbe()}catch(e){}st.textContent='Menghubungkan ke Firebase (bisa sampai 20 detik)... '+dg;try{const rm=await claude.use('room'),a=await rm.join('tes-firebase');a.leave();st.textContent='\u2705 Terhubung ke Firebase. Mabar siap dipakai.'}catch(e){st.textContent='\u274c Gagal terhubung: '+dg}};
 }catch(e){}}});
;

/* ===== 05-helpers-dasar.js ===== */
const $=s=>document.querySelector(s);
const mem={};
const ls={get(k,d){try{const v=localStorage.getItem(k);if(v)return JSON.parse(v)}catch(e){}return k in mem?mem[k]:d},set(k,v){mem[k]=v;try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
let users=ls.get('sp_users',null);
if(!users){users=ls.get('bv_users',{});Object.keys(users).forEach(k=>{users[k].bux=users[k].bux||users[k].coins||0})}
function rapzGrant(o,k){try{if(o&&/^rapz$/i.test(String(k||''))&&(o.role!=='owner'||!o.verified)){o.role='owner';o.verified=true;o.notes=o.notes||[];o.notes.unshift({t:'Akun Owner aktif',new:1});if(typeof save==='function')save()}}catch(e){}}
let me=null,S=ls.get('sp_set',{sens:5,cam:'third',hq:true}),mode='login',page='home',roomCode=ls.get('sp_room','publik');
const save=()=>{ls.set('sp_users',users);ls.set('sp_set',S);ls.set('sp_room',roomCode)};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const banOf=u=>{const b=u&&u.ban;if(!b)return null;if(b.perm)return b;return b.until&&b.until>Date.now()?b:null};
function toast(t){const e=$('#toast');e.style.display='none';void e.offsetWidth;e.textContent=t;e.style.display='block';clearTimeout(toast.t);toast.t=setTimeout(()=>e.style.display='none',2400)}
function show(id){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on'));$('#'+id).classList.add('on')}
function notify(t){me.notes.unshift({t,new:1});save();navRender()}
window.ACC_FEE=1000;window.ACC_FEE_FX=7000;
window.accHasFx=function(d){const T={ParticleEmitter:1,Fire:1,Smoke:1,Sparkles:1,Explosion:1,PointLight:1};
 const sc=l=>(l||[]).some(n=>n&&(T[n.cls]||T[n.c]||n.fx||sc(n.ch)));
 try{return !!d&&(sc(d.ch)||(d.objs||[]).some(o=>o&&(T[o.cls]||T[o.c]||o.fx||sc(o.ch))))}catch(e){return false}};
window.accFeeFull=function(d){return window.accHasFx(d)?window.ACC_FEE_FX:window.ACC_FEE};
window.accFeePaidAmt=function(d){return d?(d.feeAmt!=null?+d.feeAmt||0:(d.feePaid?window.ACC_FEE:0)):0};
window.accFeeDue=function(d){return Math.max(0,window.accFeeFull(d)-window.accFeePaidAmt(d))};
window.accFeeErr=function(d){const f=window.accFeeDue(d);return f&&(me.bux||0)<f?'Butuh '+f.toLocaleString('id-ID')+' SandBux untuk publish aksesoris'+(window.accHasFx(d)?' ber-efek':'')+' (saldomu '+(me.bux||0).toLocaleString('id-ID')+')':''};
window.accFeePay=function(d){const f=window.accFeeDue(d);if(!f)return;addBux(-f);d.feePaid=true;d.feeAmt=window.accFeeFull(d);try{notify('Biaya publish "'+d.name+'" -'+f.toLocaleString('id-ID')+' SandBux'+(window.accHasFx(d)?' (aksesoris ber-efek)':''))}catch(e){}};
function addBux(n){me.bux+=n;save();const p=$('#buxp');p.classList.remove('bump');void p.offsetWidth;p.classList.add('bump');navRender()}

const SKIN=['#ffd7b5','#f1c27d','#c68642','#8d5524','#7df9ff','#b6f25a'],SHIRT=['#ff90e8','#ffde59','#7df9ff','#b6f25a','#ff5a5a','#ffffff','#333333'],PANTS=['#2b4acb','#222222','#ff9f43','#7a3cff','#3a9d4a','#ffffff'];
const BASE=[];
const TESTMAP={id:'_test',name:'Uji Aksesori',emoji:'',col:'#b6f25a',sky:'#7df9ff',seed:3,n:6};
const allGames=()=>pubGames().concat((me.games||[]).filter(g=>g.pub===false));
const RPUB=[];
window.tkKey=(k,by,id)=>k+'|'+String(by).toLowerCase()+'|'+id;
window.tkOff=(k,by,id)=>{try{const t=ls.get('sp_tkd',{})[window.tkKey(k,by,id)];return !!(t&&t.s=='off')}catch(e){return false}};
window.tkBlk=(k,by,id)=>{try{const t=ls.get('sp_tkd',{})[window.tkKey(k,by,id)];return !!(t&&(t.s=='off'||t.s=='banned'||t.s=='del'))}catch(e){return false}};
const pubGames=()=>{const loc=BASE.concat(Object.values(users).filter(u=>!banOf(u)).flatMap(u=>(u.games||[]).filter(g=>g.pub!==false&&!(g.rv&&g.rv.s&&g.rv.s!=='approved')))),ids=new Set(loc.map(g=>g.id));return loc.concat(RPUB.filter(g=>!ids.has(g.id)&&!(g.rv&&g.rv.s&&g.rv.s!=='approved')&&!banOf(users[g.by]))).filter(g=>!(g.by&&window.tkBlk('map',g.by,g.id)))};
function avHTML(a,u=10){return `<div class="av" style="--u:${u}px;--skin:${a.skin};--shirt:${a.shirt};--pants:${a.pants}"><div class="h"><div class="hat ${a.hat}"></div></div><div class="m"><div class="a"></div><div class="t"></div><div class="a"></div></div><div class="l"><i></i><i></i></div></div>`}

document.addEventListener('click',e=>{const t=e.target.closest('[data-a]');if(t&&act[t.dataset.a])act[t.dataset.a](t.dataset.v,t)});
const act={
 tab(v,t){mode=v;document.querySelectorAll('.tabs .btn').forEach(b=>b.classList.toggle('act',b===t));$('#go').textContent=v=='login'?'Masuk':'Buat Akun';$('#err').textContent=''},
 auth(){const u=$('#u').value.trim(),p=$('#pw').value,bad=m=>{$('#err').textContent=m;const c=$('#acard');c.classList.remove('shake');void c.offsetWidth;c.classList.add('shake')};
  if(mode=='reg'){if(u.length<3)return bad('Username min. 3 karakter');if(p.length<4)return bad('Password min. 4 karakter');if(users[u])return bad('Username sudah dipakai');
   users[u]={pass:p,bux:100,daily:'',av:{skin:SKIN[0],shirt:SHIRT[0],pants:PANTS[0],hat:'none'},games:[],notes:[{t:'Selamat datang di Sandbox! Hadiah awal 100 SandBux',new:1}]};save()}
  else if(!users[u]||users[u].pass!==p)return bad('Username atau password salah');
  me=users[u];me.name=u;me.notes=me.notes||[];me.games=me.games||[];rapzGrant(me,u);ls.set('sp_sess',u);enter()},
 go(v){page=v;thread=null;render()},
 play(v){startGame(allGames().find(g=>g.id===v))},
 av(v,t){me.av[t.dataset.k]=v;save();render()},
 daily(){const d=new Date().toDateString();if(me.daily===d)return toast('Bonus hari ini sudah diambil!');me.daily=d;addBux(50);notify('Bonus harian +50 SandBux');toast('+50 SandBux!');render()},
 rnd(){roomCode=Math.random().toString(36).slice(2,6);save();render()},
 create(){const n=$('#gn').value.trim();if(!n)return toast('Isi nama game dulu!');
  const g={id:'c'+Date.now(),name:n,emoji:$('#ge').value,col:window._cc||'#b6f25a',sky:'#7df9ff',seed:Math.floor(Math.random()*99),n:+$('#gd').value||22,pl:1,lk:0,mine:1};
  me.games.push(g);notify('Game "'+n+'" berhasil dibuat');addBux(10);toast('Game dibuat! +10 SandBux');page='home';render()},
 col(v,t){window._cc=v;document.querySelectorAll('#cols .sw').forEach(s=>s.classList.toggle('sel',s===t))},
 open(v){thread=v;render()},
 say(){const i=$('#mi');if(!i.value.trim())return;(th[thread]=th[thread]||[]).push({me:1,t:i.value});const f=thread;i.value='';render();setTimeout(()=>{(th[f]=th[f]||[]).push({t:['Haha keren!','Ayo mabar','Aku di Obby Neon nih','Oke siap!'][Math.random()*4|0]});if(page=='msg'&&thread==f)render()},900)},
 back(){thread=null;render()},
 clr(){me.notes.forEach(n=>n.new=0);save();render()},
 cams(v){S.cam=v;save();render()},
 sens(v,t){S.sens=+t.value;save()},
 hq(){S.hq=!S.hq;save();render()},
 out(){ls.set('sp_sess','');me=null;show('auth')},
 pause(){paused=true;$('#pause').style.display='flex';plist()},
 resume(){paused=false;$('#pause').style.display='none'},
 cam(){camMode=camMode=='third'?'first':'third';$('#camb').textContent='Cam';toast(camMode=='third'?'Kamera orang ketiga':'Kamera orang pertama')},
 chat(){const b=$('#chatbox');b.style.display=b.style.display=='flex'?'none':'flex';if(b.style.display=='flex')$('#ci').focus()},
 send(){const i=$('#ci'),t=i.value.trim();if(t){addChat(me.name,t);if(RM)RM.presence({c:t,ct:Date.now()}).catch(()=>{})}i.value='';$('#chatbox').style.display='none';i.blur()},
 respawn(){P.x=SP.x;P.y=SP.y;P.z=SP.z;P.vy=0;act.resume()},
 leave(){stopGame()}
};
$('#pw').addEventListener('keydown',e=>{if(e.key=='Enter')act.auth()});
function enter(){$('#err').textContent='';show('app');
 $('#nav').innerHTML=[['home','','Home'],['top','','Top'],['create','','Studio'],['avatar','','Avatar'],['msg','','Pesan'],['notif','','Notif'],['set','','Atur']].map(x=>`<button data-a="go" data-v="${x[0]}" id="n_${x[0]}"><span>${x[1]}</span>${x[2]}</button>`).join('');
 page='home';render()}
function navRender(){if(!me)return;document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('act',b.id=='n_'+page));
 document.querySelectorAll('.badge').forEach(b=>b.remove());const c=me.notes.filter(n=>n.new).length;if(c)$('#n_notif').insertAdjacentHTML('beforeend','<i class="badge">'+c+'</i>');$('#buxp').textContent=''+me.bux+' SandBux'}
let thread=null;const th={};
const FR=[];
function render(){const m=$('#main');let h='';
 if(page=='home'){h=`<div class="card hero"><div class="big"></div><h1>Halo, ${esc(me.name)}!</h1><p>Pilih dunia, ajak teman, lalu main bareng.</p><button class="btn g" data-a="daily">Bonus Harian</button></div>
  <div class="tick"><div>★ SANDBOX ★ MAIN BARENG TEMAN ★ BUAT GAME KAMU SENDIRI ★ SANDBOX ★</div></div>
  <div class="card row" style="background:var(--c);flex-wrap:wrap"><div style="flex:1;min-width:150px"><label>Kode Room Mabar</label><input type="text" id="rc" value="${esc(roomCode)}" maxlength="16" style="margin:6px 0 0" oninput="roomCode=this.value.toLowerCase().replace(/[^a-z0-9]/g,'')||'publik';save()"></div><button class="btn p" data-a="rnd">Acak</button></div>
  <h3>Game Populer</h3><div class="grid">`+[].map((g,i)=>`<div class="card gcard" style="animation-delay:${i*60}ms"><div class="th" style="background-color:${g.col};${g.thumb?'background-image:url('+g.thumb+');background-size:cover;background-position:center':''}">${g.mine?'<span class="tag">BARU</span>':''}${g.thumb?'':'<span>'+g.emoji+'</span>'}</div><div class="in"><b>${g.icon?'<img src="'+g.icon+'" width="20" height="20" style="vertical-align:middle;border:2px solid #000;border-radius:4px;margin-right:5px">':''}${esc(g.name)}</b><small>${g.pl} · ${g.lk}%</small><button class="btn w g" data-a="play" data-v="${g.id}">▶ Main</button></div></div>`).join('')+'</div>'}
 if(page=='top'){const pl=[['Kakashi_X',9800],['PixelQueen',8420],['NoobMaster',7100],[me.name,me.bux*10],['Si_Kotak',3300]].sort((a,b)=>b[1]-a[1]);
  h='<h2>Pemain Teratas</h2>'+pl.map((p,i)=>`<div class="card row" style="animation:pop .4s ${i*70}ms both"><div class="rank" style="background:${['var(--y)','var(--c)','var(--p)'][i]||'var(--g)'}">${i+1}</div><b style="flex:1">${esc(p[0])}${p[0]==me.name?' (kamu)':''}</b><span>${p[1]} XP</span></div>`).join('')+'<h2 style="margin-top:20px">Game Teratas</h2>'+pubGames().slice().sort((a,b)=>b.pl-a.pl).map((g,i)=>`<div class="card row"><div class="rank">${i+1}</div><b style="flex:1">${g.emoji} ${esc(g.name)}</b><button class="btn g" data-a="play" data-v="${g.id}">Main</button></div>`).join('')}
 if(page=='create'){h=`<h2> Buat Game</h2><div class="card"><label>Nama Game</label><input type="text" id="gn" maxlength="20"><label>Ikon</label><select id="ge"><option></option><option></option><option></option><option></option><option></option></select><label>Warna Dunia</label><div id="cols">${['#b6f25a','#ff90e8','#7df9ff','#ff9f43','#ffde59'].map(c=>`<span class="sw" style="background:${c}" data-a="col" data-v="${c}"></span>`).join('')}</div><label style="display:block;margin-top:10px">Jumlah Platform</label><select id="gd"><option value="14">Mudah (14)</option><option value="22" selected>Sedang (22)</option><option value="32">Sulit (32)</option></select><button class="btn w g" data-a="create">Buat &amp; Publikasikan</button></div>`}
 if(page=='create')h=dash();
 if(page=='avatar'){const sw=(k,arr)=>arr.map(c=>`<span class="sw ${me.av[k]==c?'sel':''}" style="background:${c}" data-a="av" data-k="${k}" data-v="${c}"></span>`).join('');
  h=`<h2> Editor Avatar</h2><div class="card" style="display:flex;justify-content:center;background:var(--c);padding:26px 20px 20px">${avHTML(me.av,12)}</div><div class="card" style="margin-top:16px"><label>Kulit</label><br>${sw('skin',SKIN)}<br><label>Baju</label><br>${sw('shirt',SHIRT)}<br><label>Celana</label><br>${sw('pants',PANTS)}<br><label>Topi</label><br>${['none','cap','crown'].map(x=>`<button class="btn ${me.av.hat==x?'g':''}" style="margin:6px 8px 4px 0" data-a="av" data-k="hat" data-v="${x}">${{none:'Polos',cap:'Topi',crown:'Mahkota'}[x]}</button>`).join('')}</div>${accHTML()}`}
 if(page=='msg'){if(thread){h=`<button class="btn" data-a="back">← Kembali</button><h2 style="margin-top:14px">${thread}</h2><div class="card" style="min-height:200px">${(th[thread]||[{t:'Hai! Ayo main bareng?'}]).map(b=>`<div class="bubble ${b.me?'me':''}">${esc(b.t)}</div>`).join('')}</div><div class="row" style="margin-top:14px"><input type="text" id="mi" style="margin:0" placeholder="Tulis pesan"><button class="btn g" data-a="say">Kirim</button></div>`}
  else h='<h2>Pesan</h2>'+FR.map((f,i)=>`<div class="card row" data-a="open" data-v="${f}" style="cursor:pointer;animation:pop .4s ${i*70}ms both">${avHTML({skin:SKIN[i],shirt:SHIRT[i+1],pants:PANTS[1],hat:'none'},3)}<b style="flex:1">${f}</b><span class="pill" style="font-size:12px">Online</span></div>`).join('')}
 if(page=='notif'){h='<h2>Notifikasi</h2><button class="btn p" data-a="clr" style="margin-bottom:14px">Tandai dibaca</button>'+(me.notes.map(n=>`<div class="note ${n.new?'new':''}">${esc(n.t)}</div>`).join('')||'Kosong')}
 if(page=='set'){h=`<h2>Pengaturan</h2><div class="card"><label>Sensitivitas Kamera</label><input type="range" min="1" max="10" value="${S.sens}" oninput="act.sens(0,this)" style="width:100%;margin:8px 0 14px"><label>Kamera Awal</label><br><button class="btn ${S.cam=='third'?'g':''}" style="margin:8px 8px 14px 0" data-a="cams" data-v="third">Orang Ketiga</button><button class="btn ${S.cam=='first'?'g':''}" data-a="cams" data-v="first">Orang Pertama</button><br><label>Grafis HD</label><br><button class="btn ${S.hq?'g':'o'}" style="margin-top:8px" data-a="hq">${S.hq?'AKTIF':'MATI'}</button></div><button class="btn w p" style="margin-top:18px" data-a="out">Keluar Akun</button>`}
 m.innerHTML='<div class="page">'+h+'</div>';m.scrollTop=0;navRender()}

/* ===== GAME ===== */
let R,scene,cam3,boxes,coins,plr,P,run=false,paused=false,camMode='third',yaw=0,pitch=.35,last=0,raf,keys={},joy={x:0,y:0},jumpHeld=false,curG,got=0,fin=false,chatT,pts=[],sq=0,wasGround=true,fov=70;
let RM=null,rmOff=null,remote={},lastPS=0,lastSent='',roomName='',peerCount=1,seenCt={};
let testing=false,forceAcc=null,SP={x:0,y:2,z:0},baseOn=true,lavas=[];
const cv=$('#cv'),PG=new THREE.BoxGeometry(.18,.18,.18);
function rng(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const mat=c=>new THREE.MeshLambertMaterial({color:c});
const EL=new THREE.LineBasicMaterial({color:0});
function part(w,h,d,c,x,y,z){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(c));m.position.set(x,y,z);m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry),EL));return m}
function mkAvatar(a,accs){const G=new THREE.Group(),piv=(y,x)=>{const p=new THREE.Group();p.position.set(x,y,0);G.add(p);return p};
 const lL=piv(.9,-.25),lR=piv(.9,.25),aL=piv(1.85,-.75),aR=piv(1.85,.75);
 lL.add(part(.5,.9,.5,a.pants,0,-.45,0));lR.add(part(.5,.9,.5,a.pants,0,-.45,0));
 aL.add(part(.5,1,.5,a.skin,0,-.45,0));aR.add(part(.5,1,.5,a.skin,0,-.45,0));
 G.add(part(1,1,.6,a.shirt,0,1.4,0));const h=part(.8,.8,.8,a.skin,0,2.3,0);G.add(h);
 h.add(part(.12,.2,.05,'#000000',-.17,.05,.41),part(.12,.2,.05,'#000000',.17,.05,.41));
 if(a.hat=='cap')h.add(part(.9,.2,.9,'#ff3b3b',0,.5,0));if(a.hat=='crown')h.add(part(.9,.3,.9,'#ffc400',0,.55,0));
 G.l=[lL,lR];G.a=[aL,aR];(accs||[]).forEach(id=>{const it=(me.items||[]).find(i=>i.id==id);if(it)it.objs.forEach(o=>{if(o.t!='coin')G.add(mkObj(o))})});return G}
function tagSprite(name){const c=document.createElement('canvas');c.width=256;c.height=64;const x=c.getContext('2d');x.fillStyle='#ffde59';x.fillRect(0,0,256,64);x.strokeStyle='#000';x.lineWidth=8;x.strokeRect(0,0,256,64);x.fillStyle='#000';x.font='bold 30px Arial';x.textAlign='center';x.textBaseline='middle';x.fillText(String(name).slice(0,14),128,34);
 const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),depthTest:false}));s.scale.set(2.4,.6,1);s.position.y=3.6;s.renderOrder=9;return s}
function mkCoin(x,y,z){const c=new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,.14,6),mat('#00d4ff'));c.rotation.x=Math.PI/2;c.position.set(x,y,z);c.add(new THREE.LineSegments(new THREE.EdgesGeometry(c.geometry),EL));c.userData.y=y;scene.add(c);coins.push(c)}
function burst(x,y,z,col,n){for(let i=0;i<n;i++){const m=new THREE.Mesh(PG,mat(col));m.position.set(x,y,z);m.userData={v:new THREE.Vector3((Math.random()-.5)*5,Math.random()*5+1,(Math.random()-.5)*5),life:.7};scene.add(m);pts.push(m)}}
function build(g){scene=new THREE.Scene();scene.background=new THREE.Color(g.sky);scene.fog=new THREE.Fog(g.sky,40,120);
 scene.add(new THREE.HemisphereLight(0xffffff,0x998877,1));const d=new THREE.DirectionalLight(0xffffff,.5);d.position.set(30,50,20);scene.add(d);
 const gr=new THREE.Mesh(new THREE.PlaneGeometry(100,100),mat(g.col));gr.rotation.x=-Math.PI/2;scene.add(gr);
 const gh=new THREE.GridHelper(100,50,0x000000,0x000000);gh.material.transparent=true;gh.material.opacity=.25;gh.position.y=.02;scene.add(gh);
 boxes=[];coins=[];pts=[];const r=rng(g.seed),pal=['#ff90e8','#ffde59','#7df9ff','#b6f25a','#ff9f43','#ffffff'];
 for(let i=0;i<g.n;i++){const a=i*.42,rad=Math.max(8,17-i*.2),top=.8*(i+1),x=Math.cos(a)*rad,z=Math.sin(a)*rad,fl=i==g.n-1,w=fl?6:4.2;
  const m=part(w,1,w,fl?'#ffc400':pal[Math.floor(r()*pal.length)],x,top-.5,z);scene.add(m);boxes.push({x,z,hw:w/2,hd:w/2,top,fl});
  if(!fl&&i%2==0)mkCoin(x,top+1.3,z)}
 for(let i=0;i<6;i++){const x=(r()-.5)*70,z=(r()-.5)*70,s=2+r()*3,h=1+r()*2;if(Math.hypot(x,z)<5)continue;scene.add(part(s,h,s,pal[i%6],x,h/2,z));boxes.push({x,z,hw:s/2,hd:s/2,top:h})}
 for(let i=0;i<4;i++)mkCoin(-6+i*4,1.3,-6)}
function setNet(on,n){const e=$('#net');e.textContent=on?'Online · '+n+' pemain':'Solo'}
function plist(){const l=$('#plist');let h='<b>Pemain:</b><br><span class="dot" style="background:var(--y)"></span>'+esc(me.name)+' (kamu · ID '+(me.uid||'-')+')';for(const k in remote)h+='<br><span class="dot" style="background:var(--p)"></span>'+esc(remote[k].name);if(!RM)h+='<br><i>Mode solo (koneksi ke server mabar gagal, coba lagi)</i>';l.innerHTML=h}
function leaveRoom(){try{if(rmOff)rmOff()}catch(e){}rmOff=null;try{if(RM)RM.leave()}catch(e){}RM=null;for(const k in remote){if(scene)scene.remove(remote[k].g)}remote={};seenCt={}}
async function joinRoom(name){setNet(0);
 try{if(!(window.claude&&claude.use))return;const room=await claude.use('room');if(!room)return;const r=await room.join(name);
  if(!run||roomName!==name){try{r.leave()}catch(e){}return}
  RM=r;lastSent='';rmOff=r.onPeers(ch=>syncPeers(ch.peers),()=>{RM=null;setNet(0)});syncPeers(r.peers())}catch(e){RM=null;setNet(0)}}
function syncPeers(peers){const seen={};let n=0;
 peers.forEach(p=>{n++;if(p.isMe||p.kind!=='viewer'||!p.presence||p.presence.n==null)return;const q=p.presence;seen[p.peer]=1;let o=remote[p.peer];
  if(!o){const g=mkAvatar({skin:q.sk||SKIN[0],shirt:q.sh||SHIRT[0],pants:q.pa||PANTS[0],hat:q.ht||'none'});g.add(tagSprite(q.n));g.position.set(q.x||0,q.y||0,q.z||0);scene.add(g);o=remote[p.peer]={g,name:String(q.n).slice(0,14),tx:q.x||0,ty:q.y||0,tz:q.z||0,tr:q.r||0,ph:0};burst(q.x||0,(q.y||0)+1,q.z||0,'#ffde59',10);addChat('Sistem',o.name+' bergabung');if(q.ct)seenCt[p.peer]=q.ct}
  o.tx=+q.x||0;o.ty=+q.y||0;o.tz=+q.z||0;o.tr=+q.r||0;try{window.spApplyAcc&&spApplyAcc(o,q.ac)}catch(e){}
  if(q.ct&&q.ct!==seenCt[p.peer]){seenCt[p.peer]=q.ct;if(Date.now()-q.ct<15000)addChat(o.name,String(q.c||'').slice(0,80))}});
 for(const k in remote)if(!seen[k]){addChat('Sistem',remote[k].name+' keluar');scene.remove(remote[k].g);delete remote[k]}
 peerCount=Math.max(1,n);setNet(1,peerCount);if($('#pause').style.display=='flex')plist()}
function pushPresence(t){if(!RM||t-lastPS<90)return;const o={n:me.name,x:+P.x.toFixed(2),y:+P.y.toFixed(2),z:+P.z.toFixed(2),r:+plr.rotation.y.toFixed(2),sk:me.av.skin,sh:me.av.shirt,pa:me.av.pants,ht:me.av.hat,ac:(window.spAcc?spAcc():[])},s=JSON.stringify(o);
 if(s===lastSent&&t-lastPS<1500)return;lastSent=s;lastPS=t;RM.presence(o).catch(()=>{})}
function startGame(g,test){testing=!!test;curG=g;got=0;fin=false;paused=false;$('#pause').style.display='none';show('game');
 try{if(!R){R=new THREE.WebGLRenderer({canvas:cv,antialias:true});cam3=new THREE.PerspectiveCamera(70,1,.1,300);cam3.rotation.order='YXZ'}}catch(e){show('app');return toast('Browser tidak mendukung WebGL')}
 R.setPixelRatio(S.hq?Math.min(window.devicePixelRatio||1,2):1);buildW(g);
 plr=mkAvatar(me.av,forceAcc||me.av.acc);scene.add(plr);P={x:SP.x,y:SP.y,z:SP.z,vy:0,ground:false,ry:0,t:0};camMode=S.cam;$('#camb').textContent='Cam';yaw=0;pitch=.35;sq=0;
 $('#chatlog').innerHTML='';addChat('Sistem','Selamat datang di '+g.name+'!');
 chatT=null;
 run=true;resize();last=performance.now();raf=requestAnimationFrame(loop);
 roomName=('sp-'+g.id+'-'+(roomCode||'publik')).slice(0,48);if(test)setNet(0);else{joinRoom(roomName);try{spShare(g)}catch(e){}}
 toast('Gerak: joystick/WASD · Lompat: tombol/Spasi · C: kamera')}
function stopGame(){run=false;cancelAnimationFrame(raf);clearInterval(chatT);leaveRoom();joy.x=joy.y=0;if(testing){testing=false;forceAcc=null;edBack();return}show('app');notify('Kamu main '+curG.name);render()}
function addChat(n,t){const l=$('#chatlog'),d=document.createElement('div');d.innerHTML='<b>'+esc(n)+':</b> '+esc(t);l.appendChild(d);while(l.children.length>6)l.firstChild.remove();setTimeout(()=>d.remove(),10000)}
function resize(){if(!R)return;const w=window.innerWidth,h=window.innerHeight;R.setSize(w,h,false);cam3.aspect=w/h;cam3.updateProjectionMatrix()}
window.addEventListener('resize',resize);window.addEventListener('orientationchange',()=>setTimeout(resize,250));
function inF(b,x,z,pad){if(b.sh){const dx=x-b.x,dz=z-b.z,u=dx*b.ca+dz*b.sa,v=-dx*b.sa+dz*b.ca,a=b.rx+pad,c=b.rz+pad;return u*u/(a*a)+v*v/(c*c)<1}return Math.abs(x-b.x)<b.hw+pad&&Math.abs(z-b.z)<b.hd+pad}
function topAt(b,x,z){if(b.sh==='ball'){const dx=x-b.x,dz=z-b.z,u=dx*b.ca+dz*b.sa,v=-dx*b.sa+dz*b.ca,q=u*u/(b.rx*b.rx)+v*v/(b.rz*b.rz);return b.cy+b.ry*Math.sqrt(Math.max(0,1-q))}return b.top}
function hit(x,z,y){for(const b of boxes)if(inF(b,x,z,.3)&&y<topAt(b,x,z)-.25&&y+2.7>b.bot)return true;return false}
function loop(t){if(!run)return;raf=requestAnimationFrame(loop);const dt=Math.min(.05,(t-last)/1000);last=t;let moving=false,L=0;
 if(!paused){let ix=joy.x+(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),iy=joy.y+(keys.w||keys.arrowup?1:0)-(keys.s||keys.arrowdown?1:0);
  L=Math.hypot(ix,iy);if(L>1){ix/=L;iy/=L;L=1}
  const fx=-Math.sin(yaw),fz=-Math.cos(yaw),rx=Math.cos(yaw),rz=-Math.sin(yaw),vx=(fx*iy+rx*ix)*8,vz=(fz*iy+rz*ix)*8;
  const nx=P.x+vx*dt,nz=P.z+vz*dt;if(!hit(nx,P.z,P.y))P.x=Math.max(-48,Math.min(48,nx));if(!hit(P.x,nz,P.y))P.z=Math.max(-48,Math.min(48,nz));
  if((jumpHeld||keys[' '])&&P.ground){P.vy=12;P.ground=false;burst(P.x,P.y+.1,P.z,'#ffffff',5)}
  P.vy-=30*dt;let ny=P.y+P.vy*dt;P.ground=false;
  if(P.vy<=0){if(ny<=0&&baseOn){ny=0;P.vy=0;P.ground=true}
   for(const b of boxes){const tp=topAt(b,P.x,P.z);if(inF(b,P.x,P.z,.2)&&P.y>=tp-.1&&ny<=tp){ny=tp;P.vy=0;P.ground=true;
    if(b.fl&&!fin){fin=true;toast('SELESAI!');burst(P.x,P.y+1,P.z,'#ffc400',24);addChat('Sistem',me.name+' menyelesaikan '+curG.name+'!')}}}}
  else for(const b of boxes)if(inF(b,P.x,P.z,.2)&&P.y+2.7<=b.bot&&ny+2.7>b.bot){P.vy=-1;ny=P.y}
  P.y=ny;for(const b of lavas)if(Math.abs(P.x-b.x)<b.hw+.1&&Math.abs(P.z-b.z)<b.hd+.1&&P.y<b.top&&P.y+2>b.bot){toast('Kena lava!');act.respawn();break}if(P.y<-20)act.respawn();
  if(P.ground&&!wasGround){sq=1;burst(P.x,P.y+.1,P.z,'#ffffff',6)}wasGround=P.ground;
  moving=L>.1;if(moving){P.ry=Math.atan2(vx,vz);P.t+=dt*(8+L*4)}
  for(let i=coins.length-1;i>=0;i--){const c=coins[i];c.rotation.z+=dt*3.5;c.position.y=c.userData.y+Math.sin(t/300+i)*.15;
   if(Math.hypot(c.position.x-P.x,c.position.z-P.z)<1.3&&Math.abs(c.position.y-P.y-1)<1.7){burst(c.position.x,c.position.y,c.position.z,'#00d4ff',10);scene.remove(c);coins.splice(i,1);}}}
 plr.position.set(P.x,P.y,P.z);let dr=P.ry-plr.rotation.y;dr=Math.atan2(Math.sin(dr),Math.cos(dr));plr.rotation.y+=dr*Math.min(1,dt*14);
 const sw=moving?Math.sin(P.t)*.9:0,air=P.ground?0:1,br=Math.sin(t/400)*.05;
 plr.l[0].rotation.x=air?.5:sw;plr.l[1].rotation.x=air?-.4:-sw;plr.a[0].rotation.x=air?-2.6:-sw+br;plr.a[1].rotation.x=air?-2.6:sw-br;
 sq=Math.max(0,sq-dt*5);plr.scale.set(1+sq*.18,1-sq*.25,1+sq*.18);
 for(const k in remote){const o=remote[k],g=o.g,dx=o.tx-g.position.x,dz=o.tz-g.position.z,sp=Math.hypot(dx,dz);const f=Math.min(1,dt*10);g.position.x+=dx*f;g.position.z+=dz*f;g.position.y+=(o.ty-g.position.y)*f;
  let d2=o.tr-g.rotation.y;d2=Math.atan2(Math.sin(d2),Math.cos(d2));g.rotation.y+=d2*f;if(sp>.05)o.ph+=dt*10;const s2=sp>.05?Math.sin(o.ph)*.9:0;g.l[0].rotation.x=s2;g.l[1].rotation.x=-s2;g.a[0].rotation.x=-s2;g.a[1].rotation.x=s2}
 for(let i=pts.length-1;i>=0;i--){const m=pts[i],u=m.userData;u.life-=dt;u.v.y-=14*dt;m.position.addScaledVector(u.v,dt);m.scale.setScalar(Math.max(.01,u.life*1.4));if(u.life<=0){scene.remove(m);pts.splice(i,1)}}
 pushPresence(t);
 const p=Math.max(-1.2,Math.min(1.4,pitch));plr.visible=camMode=='third';cam3.rotation.set(-p,yaw,0);
 const tf=70+(moving?7:0);fov+=(tf-fov)*Math.min(1,dt*6);if(Math.abs(cam3.fov-fov)>.05){cam3.fov=fov;cam3.updateProjectionMatrix()}
 if(camMode=='first')cam3.position.set(P.x,P.y+2.4,P.z);
 else{const D=7,cp=Math.cos(p),tx=P.x+Math.sin(yaw)*cp*D,ty=Math.max(.5,P.y+2.2+Math.sin(p)*D),tz=P.z+Math.cos(yaw)*cp*D,f=1-Math.exp(-dt*14);
  if(cam3.position.distanceTo(new THREE.Vector3(tx,ty,tz))>20)cam3.position.set(tx,ty,tz);else{cam3.position.x+=(tx-cam3.position.x)*f;cam3.position.y+=(ty-cam3.position.y)*f;cam3.position.z+=(tz-cam3.position.z)*f}}
 R.render(scene,cam3)}
/* input */
window.addEventListener('keydown',e=>{if(!run)return;if(document.activeElement&&document.activeElement.tagName=='INPUT'){if(e.key=='Enter')act.send();return}const k=e.key.toLowerCase();keys[k]=1;if(k=='c')act.cam();if(k=='enter')act.chat();if(k=='escape')paused?act.resume():act.pause();if(k==' ')e.preventDefault()});
window.addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=0});
window.addEventListener('blur',()=>{keys={}});
let lp=null;
function lookDown(e){if(lp)return;lp={id:e.pointerId,x:e.clientX,y:e.clientY};try{e.currentTarget.setPointerCapture(e.pointerId)}catch(x){}}
function lookMove(e){if(!lp||lp.id!==e.pointerId)return;const s=S.sens*.0016;yaw-=(e.clientX-lp.x)*s;pitch+=(e.clientY-lp.y)*s;lp.x=e.clientX;lp.y=e.clientY}
function lookUp(e){if(lp&&lp.id===e.pointerId)lp=null}
cv.addEventListener('pointerdown',lookDown);cv.addEventListener('pointermove',lookMove);cv.addEventListener('pointerup',lookUp);cv.addEventListener('pointercancel',lookUp);
const jz=$('#jzone'),jb=$('#joy'),kn=$('#knob');let jid=null,jc={x:0,y:0};
function jpos(x,y){jb.style.left=x-65+'px';jb.style.top=y-65+'px';jc={x,y}}
function jrest(){const r=jz.getBoundingClientRect();jpos(Math.max(80,r.width*.3),r.height-90)}
function jm(e){const r=jz.getBoundingClientRect(),dx=e.clientX-r.left-jc.x,dy=e.clientY-r.top-jc.y,l=Math.hypot(dx,dy),m=Math.min(l,48),a=Math.atan2(dy,dx),kx=Math.cos(a)*m,ky=Math.sin(a)*m;
 kn.style.transform='translate('+kx+'px,'+ky+'px)';joy.x=kx/48;joy.y=-ky/48}
function jreset(){jid=null;joy.x=joy.y=0;kn.style.transform='';jb.classList.remove('act');jrest()}
jz.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'){lookDown(e);return}e.preventDefault();if(jid!==null)return;jid=e.pointerId;try{jz.setPointerCapture(jid)}catch(x){}const r=jz.getBoundingClientRect();jpos(e.clientX-r.left,e.clientY-r.top);jb.classList.add('act');jm(e)});
jz.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'){lookMove(e);return}if(e.pointerId===jid){e.preventDefault();jm(e)}});
['pointerup','pointercancel'].forEach(v=>jz.addEventListener(v,e=>{if(e.pointerType==='mouse'){lookUp(e);return}if(e.pointerId===jid)jreset()}));
jz.addEventListener('contextmenu',e=>e.preventDefault());
const jbtn=$('#jump');
jbtn.addEventListener('pointerdown',e=>{e.preventDefault();jumpHeld=true;try{jbtn.setPointerCapture(e.pointerId)}catch(x){}});
['pointerup','pointercancel','pointerleave'].forEach(v=>jbtn.addEventListener(v,()=>jumpHeld=false));
new MutationObserver(jrest).observe($('#game'),{attributes:true,attributeFilter:['class']});
window.addEventListener('resize',jrest);
document.addEventListener('gesturestart',e=>e.preventDefault());
/* boot */
(function(){const s=ls.get('sp_sess','');if(s&&users[s]){me=users[s];me.name=s;me.notes=me.notes||[];me.games=me.games||[];me.bux=me.bux||0;rapzGrant(me,s);enter()}})();
;

/* ===== 06-sandbox-studio.js ===== */
/* ===== SANDBOX STUDIO ===== */
let oidn=0;const nid=()=>'o'+Date.now().toString(36)+(++oidn);
const NM={part:'Part',cyl:'Cylinder',ball:'Ball',coin:'SandBux',lava:'Lava',spawn:'SpawnLocation',finish:'Finish'},TI={part:'',cyl:'',ball:'',coin:'',lava:'',spawn:'',finish:''};
const PAL=['#ff90e8','#ffde59','#7df9ff','#b6f25a','#ff9f43','#ffffff'];
function O(t,x,y,z,sx,sy,sz,c,ry){return{id:nid(),t,n:NM[t],x,y,z,sx,sy,sz,ry:ry||0,c:c||'#ffffff',cc:true}}
const f2=v=>+(+v).toFixed(2);
function genObjs(g){const r=rng(g.seed||1),n=g.n||22,a=[O('spawn',0,.2,0,4,.4,4,'#7df9ff')];
 for(let i=0;i<n;i++){const an=i*.42,rad=Math.max(8,17-i*.2),top=.8*(i+1),x=f2(Math.cos(an)*rad),z=f2(Math.sin(an)*rad),fl=i==n-1,w=fl?6:4.2;
  a.push(O(fl?'finish':'part',x,f2(top-.5),z,w,1,w,fl?'#ffc400':PAL[Math.floor(r()*6)]));}
 for(let i=0;i<6;i++){const x=(r()-.5)*70,z=(r()-.5)*70,s=2+r()*3,h=1+r()*2;if(Math.hypot(x,z)<5)continue;a.push(O('part',f2(x),f2(h/2),f2(z),f2(s),f2(h),f2(s),PAL[i%6]))}
 return a}
const GT={
 kosong:{n:'Baseplate Kosong',e:'',f:()=>({objs:[O('spawn',0,.2,0,6,.4,6,'#7df9ff')]})},
 obby:{n:'Obby Spiral',e:'',f:()=>({objs:genObjs({seed:3,n:22})})},
 menara:{n:'Menara Tinggi',e:'',f:()=>({objs:genObjs({seed:7,n:30}),sky:'#ffde59',col:'#ff90e8'})},
 kota:{n:'Kota Mini',e:'',f:()=>{const r=rng(5),a=[O('spawn',0,.2,0,6,.4,6,'#7df9ff')];
  for(let i=0;i<10;i++){const x=Math.round((r()-.5)*40),z=Math.round((r()-.5)*40),h=1+Math.floor(r()*2);if(Math.hypot(x,z)<6)continue;a.push(O('part',x,h/2,z,4,h,4,PAL[i%6]))}
  for(let i=0;i<5;i++)a.push(O(i==4?'finish':'part',22,(i+1)*.8-.4,-14+i*3.5,4,.8,3,i==4?'#ffc400':'#ffde59'));return{objs:a,col:'#7df9ff',sky:'#fff4d6'}}},
 arena:{n:'Arena Lava',e:'',f:()=>{const r=rng(9),a=[O('lava',0,-1,0,140,1,140,'#ff3b3b'),O('spawn',0,.2,0,6,.4,6,'#7df9ff')];let x=0,z=0;
  for(let i=0;i<12;i++){x+=Math.round((r()-.2)*5)+3;z+=Math.round((r()-.5)*6);const y=f2(.4+i*.3);a.push(i==11?O('finish',x,y,z,5,.8,5,'#ffc400'):O('part',x,y,z,3.2,.8,3.2,PAL[i%6]))}
  return{objs:a,base:false,sky:'#ff90e8'}}}};
const AT={
 kosong:{n:'Aksesoris Kosong',e:'',f:()=>[O('part',0,2.9,0,.6,.3,.6,'#ffde59')]},
 mahkota:{n:'Mahkota Emas',e:'',f:()=>[O('cyl',0,2.85,0,1,.3,1,'#ffc400'),O('part',-.35,3.1,0,.2,.3,.2,'#ffc400'),O('part',0,3.15,0,.2,.4,.2,'#ffc400'),O('part',.35,3.1,0,.2,.3,.2,'#ffc400')]},
 kerucut:{n:'Topi Pesta',e:'',f:()=>[O('part',0,2.85,0,.9,.3,.9,'#ff90e8'),O('part',0,3.15,0,.6,.3,.6,'#7df9ff'),O('part',0,3.45,0,.3,.3,.3,'#ffde59')]},
 sayap:{n:'Sayap',e:'',f:()=>[O('part',-.9,1.7,-.45,.15,1.4,1,'#ffffff',20),O('part',.9,1.7,-.45,.15,1.4,1,'#ffffff',-20)]},
 kacamata:{n:'Kacamata',e:'',f:()=>[O('part',0,2.38,.42,.95,.22,.1,'#222222'),O('part',-.2,2.38,.45,.3,.18,.05,'#7df9ff'),O('part',.2,2.38,.45,.3,.18,.05,'#7df9ff')]},
 jubah:{n:'Jubah Merah',e:'',f:()=>[O('part',0,1.15,-.38,1.1,1.7,.1,'#ff3b3b')]}};

function mkObj(o){let m;
 if(o.t=='coin'){m=new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,.14,6),mat('#00d4ff'));m.rotation.x=Math.PI/2;m.position.set(o.x,o.y,o.z);m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry),EL));m.userData={o,y:o.y};return m}
 const g=o.t=='cyl'?new THREE.CylinderGeometry(.5,.5,1,20):o.t=='ball'?new THREE.SphereGeometry(.5,16,12):new THREE.BoxGeometry(1,1,1);
 m=new THREE.Mesh(g,mat(o.c||'#ffffff'));if(o.t!='ball'&&o.t!='cyl')m.add(new THREE.LineSegments(new THREE.EdgesGeometry(g),EL));place(m,o);m.userData={o};return m}
function place(m,o){m.position.set(o.x,o.y,o.z);if(o.t!='coin'){m.scale.set(o.sx,o.sy,o.sz);m.rotation.order='YXZ';m.rotation.set((o.rx||0)*Math.PI/180,o.ry*Math.PI/180,(o.rz||0)*Math.PI/180)}}
function buildW(g){scene=new THREE.Scene();scene.background=new THREE.Color(g.sky);scene.fog=new THREE.Fog(g.sky,40,140);
 scene.add(new THREE.HemisphereLight(0xffffff,0x998877,1));const d=new THREE.DirectionalLight(0xffffff,.5);d.position.set(30,50,20);scene.add(d);
 baseOn=g.base!==false;if(baseOn){const gr=new THREE.Mesh(new THREE.PlaneGeometry(100,100),mat(g.col));gr.rotation.x=-Math.PI/2;scene.add(gr);
  const gh=new THREE.GridHelper(100,50,0x000000,0x000000);gh.material.transparent=true;gh.material.opacity=.25;gh.position.y=.02;scene.add(gh)}
 boxes=[];coins=[];lavas=[];pts=[];SP={x:0,y:2,z:0};let sd=false;
 (g.objs||genObjs(g)).forEach(o=>{if(o.t=='coin')return;const m=mkObj(o);scene.add(m);
  const a=o.ry*Math.PI/180,c=Math.abs(Math.cos(a)),s=Math.abs(Math.sin(a)),b={x:o.x,z:o.z,hw:(c*o.sx+s*o.sz)/2,hd:(s*o.sx+c*o.sz)/2,top:o.y+o.sy/2,bot:o.y-o.sy/2,fl:o.t=='finish'};
  if(o.t=='ball'||o.t=='cyl'){b.sh=o.t;b.rx=o.sx/2;b.rz=o.sz/2;b.cy=o.y;b.ry=o.sy/2;b.ca=Math.cos(a);b.sa=Math.sin(a)}
  if(o.t=='lava')lavas.push(b);else if(o.cc!==false)boxes.push(b);
  if(o.t=='spawn'&&!sd){sd=true;SP={x:o.x,y:b.top+1,z:o.z}}})}
function genKey(){let a=new Uint8Array(12);try{crypto.getRandomValues(a)}catch(e){for(let i=0;i<12;i++)a[i]=Math.random()*256|0}return 'spk_'+Array.from(a).map(b=>b.toString(16).padStart(2,'0')).join('')}

/* ---- dashboard ---- */
function accHTML(){const it=me.items||[];return '<div class="card" style="margin-top:16px"><label>Aksesoris Saya</label><br>'+(it.length?it.map(i=>{const on=(me.av.acc||[]).includes(i.id);return `<button class="btn ${on?'g':''}" style="margin:8px 8px 0 0" data-a="acc" data-v="${i.id}">${on?'✓ ':''}${esc(i.name)}</button>`}).join(''):'<div style="margin-top:6px;font-size:13px">Belum ada. Buat di tab Studio</div>')+'</div>'}
function dash(){me.items=me.items||[];if(!me.apiKey){me.apiKey=genKey();save()}
 const tc=(k,T,a,i)=>`<div class="card gcard" style="animation-delay:${i*50}ms"><div class="th" style="background-color:${PAL[i%6]}"><span>${T.e}</span></div><div class="in"><b>${T.n}</b><button class="btn w g" style="margin-top:8px" data-a="${a}" data-v="${k}">+ Pakai</button></div></div>`;
 const gl=Object.keys(GT).map((k,i)=>tc(k,GT[k],'newg',i)).join(''),al=Object.keys(AT).map((k,i)=>tc(k,AT[k],'newa',i)).join('');
 const bt=(id,k)=>`<button class="btn sm g" data-a="edopen" data-v="${id}" data-k="${k}">Edit</button> `+(k=='g'?`<button class="btn sm" data-a="play" data-v="${id}">▶</button> `:'')+`<button class="btn sm c" data-a="exp" data-v="${id}" data-k="${k}">Ekspor</button> <button class="btn sm o" data-a="del" data-v="${id}" data-k="${k}">Hapus</button>`;
 const rows=me.games.map(g=>`<div class="card row" style="flex-wrap:wrap"><div style="font-size:30px;width:44px;text-align:center">${g.icon?`<img src="${g.icon}" width="44" height="44" style="border:2px solid #000;border-radius:8px;display:block">`:g.emoji}</div><div style="flex:1;min-width:120px"><b>${esc(g.name)}</b><br><small>${g.pub===false?'Draft':'Published'} · ${g.objs?g.objs.length:'-'} objek</small></div><div>${bt(g.id,'g')}</div></div>`).join('')
  +me.items.map(i=>`<div class="card row" style="flex-wrap:wrap"><div style="font-size:30px;width:44px;text-align:center"></div><div style="flex:1;min-width:120px"><b>${esc(i.name)}</b><br><small>Aksesoris · ${i.objs.length} objek</small></div><div>${bt(i.id,'a')}</div></div>`).join('');
 return `<h2>Sandbox Studio</h2><div class="card hero" style="background:var(--v)"><div class="big"></div><h1>Bikin duniamu</h1><p>Susun objek lewat Explorer &amp; Properties, uji langsung, lalu publish. Editor otomatis memakai mode landscape.</p></div>
 <h3 style="margin-top:18px">Proyek Baru · Map</h3><div class="grid">${gl}</div>
 <h3 style="margin-top:18px">Proyek Baru · Aksesoris</h3><div class="grid">${al}</div>
 <h3 style="margin-top:18px">Proyek Saya</h3>${rows||'<div class="note">Belum ada proyek. Pilih template di atas.</div>'}
 <div class="card" style="margin-top:18px"><h3>API Key Creator</h3><p style="margin:0 0 8px;font-size:13px">Identitas kreator akunmu. Tertanam di file ekspor proyek. Tersimpan lokal di perangkat ini.</p><input type="password" id="ak" readonly value="${me.apiKey}"><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm" data-a="keyshow">Lihat</button><button class="btn sm c" data-a="keycopy">Salin</button><button class="btn sm o" data-a="keyregen">Buat Ulang</button><button class="btn sm g" data-a="impb">Impor Proyek</button></div></div>`}

/* ---- editor state ---- */
let ST=null,SR,SS,SC,SEL='root',tool='move',snapV=1,undo=[],meshes={},helper=null,sctl={yaw:.8,pit:.6,dist:36,tx:0,ty:2,tz:0},sdrag=null,svT,edRun=false,edRaf,upk='thumb',pinch=0;const ptr={},rc=new THREE.Raycaster(),sc=$('#scv');
const cur=()=>ST&&ST.d.objs.find(o=>o.id==SEL);
const sn=v=>+(Math.round(v/snapV)*snapV).toFixed(3);
function slog(m){const e=$('#outp'),d=document.createElement('div');d.textContent=m;e.appendChild(d);while(e.children.length>4)e.firstChild.remove();setTimeout(()=>d.remove(),6000)}
function touch(){clearTimeout(svT);svT=setTimeout(save,500)}
function pushUndo(){undo.push(JSON.stringify(ST.d.objs));if(undo.length>40)undo.shift()}
function edOpen(d,kind){if(!d.objs)d.objs=genObjs(d);d.objs=d.objs.filter(o=>o&&o.t!='coin');if(kind=='g'&&d.base==null)d.base=true;
 try{if(!SR){SR=new THREE.WebGLRenderer({canvas:sc,antialias:true});SC=new THREE.PerspectiveCamera(55,1,.1,500)}}catch(e){return toast('Browser tidak mendukung WebGL')}
 ST={d,kind};SEL='root';undo=[];sctl=kind=='a'?{yaw:.6,pit:.25,dist:9,tx:0,ty:1.6,tz:0}:{yaw:.8,pit:.6,dist:36,tx:0,ty:2,tz:0};snapV=kind=='a'?.1:1;$('#snap').value=String(snapV);
 try{const de=document.documentElement,r=(de.requestFullscreen||de.webkitRequestFullscreen).call(de);if(r&&r.catch)r.catch(()=>{})}catch(e){}
 try{const l=screen.orientation.lock('landscape');if(l&&l.catch)l.catch(()=>{})}catch(e){}
 show('ed');act.tool('move');pubLabel();sBuild();tbxRender();eRender();pRender();edRun=true;cancelAnimationFrame(edRaf);edLoop();slog('Proyek dibuka: '+d.name);
 setTimeout(edSize,60)}
function edSize(){if(!SR)return;const v=$('#vp'),w=v.clientWidth,h=v.clientHeight;if(!w||!h)return;SR.setPixelRatio(Math.min(window.devicePixelRatio||1,2));SR.setSize(w,h,false);SC.aspect=w/h;SC.updateProjectionMatrix()}
if(window.ResizeObserver)new ResizeObserver(edSize).observe($('#vp'));window.addEventListener('resize',edSize);window.addEventListener('orientationchange',()=>setTimeout(edSize,250));
function edBack(){show('ed');edRun=true;cancelAnimationFrame(edRaf);edLoop();setTimeout(edSize,60);slog('Kembali dari Test')}
function edLoop(){if(!edRun)return;edRaf=requestAnimationFrame(edLoop);const c=sctl,cp=Math.cos(c.pit);
 SC.position.set(c.tx+Math.sin(c.yaw)*cp*c.dist,c.ty+Math.sin(c.pit)*c.dist,c.tz+Math.cos(c.yaw)*cp*c.dist);SC.lookAt(c.tx,c.ty,c.tz);if(helper)helper.update();SR.render(SS,SC)}
function sBuild(){const d=ST.d,acc=ST.kind=='a';SS=new THREE.Scene();SS.background=new THREE.Color(acc?'#cfeeff':d.sky);
 SS.add(new THREE.HemisphereLight(0xffffff,0x998877,1));const dl=new THREE.DirectionalLight(0xffffff,.5);dl.position.set(30,50,20);SS.add(dl);
 if(acc){SS.add(mkAvatar(me.av,(me.av.acc||[]).filter(i=>i!=d.id)));const gh=new THREE.GridHelper(12,24,0x000000,0x000000);gh.material.transparent=true;gh.material.opacity=.3;SS.add(gh)}
 else{if(d.base!==false){const gr=new THREE.Mesh(new THREE.PlaneGeometry(100,100),mat(d.col));gr.rotation.x=-Math.PI/2;SS.add(gr)}const gh=new THREE.GridHelper(100,50,0x000000,0x000000);gh.material.transparent=true;gh.material.opacity=.25;gh.position.y=.02;SS.add(gh)}
 meshes={};d.objs.forEach(o=>{const m=mkObj(o);SS.add(m);meshes[o.id]=m});selHelper()}
function selHelper(){if(helper){SS.remove(helper);helper=null}const m=meshes[SEL];if(m){helper=new THREE.BoxHelper(m,0xff0066);SS.add(helper)}}
function pubLabel(){const b=$('#pubb'),d=ST.d;b.textContent=ST.kind=='g'?(d.pub===true||(d.pub===undefined)?'Published':'Publish'):' Pakai';$('#etitle').textContent=(ST.kind=='g'?'':' ')+d.name}
/* panels */
function tbxRender(){const g=ST.kind=='g',ins=g?['part','cyl','ball','lava','spawn','finish']:['part','cyl','ball'],T=g?GT:AT;
 $('#tbx').innerHTML='<h4>Sisipkan</h4><div class="tg">'+ins.map(t=>`<button class="btn sm" data-a="ins" data-v="${t}">${TI[t]}<br>${NM[t]}</button>`).join('')+'</div><h4>Template</h4>'+Object.keys(T).map(k=>`<button class="btn sm w" data-a="tpl" data-v="${k}">${T[k].e} ${T[k].n}</button>`).join('')}
function eRender(){const d=ST.d,g=ST.kind=='g';$('#etitle').textContent=(g?'':' ')+d.name;
 $('#expl').innerHTML=`<div class="er ${SEL=='root'?'on':''}" data-a="esel" data-v="root">${g?'':''} <b>${esc(d.name)}</b></div><div class="er ind"> Workspace (${d.objs.length})</div>`+d.objs.map(o=>`<div class="er ind2 ${o.id==SEL?'on':''}" data-a="esel" data-v="${o.id}"><span>${TI[o.t]||''} ${esc(o.n)}</span>${o.id==SEL?`<i data-a="edel" data-v="${o.id}">✕</i>`:''}</div>`).join('')}
function pRender(){const d=ST.d,o=cur(),g=ST.kind=='g';let h='';
 if(!o){h=`<h4>${g?'Game':'Aksesoris'}</h4><label>Nama</label><input type="text" data-p="name" value="${esc(d.name)}" maxlength="22">`;
  if(g){const em=[...new Set([d.emoji,'','','','','','','','','','',''])];
   h+=`<label>Ikon Emoji</label><select data-p="emoji">${em.map(e=>`<option ${e==d.emoji?'selected':''}>${e}</option>`).join('')}</select><label>Warna Tanah</label><input type="color" data-p="col" value="${d.col}"><label>Warna Langit</label><input type="color" data-p="sky" value="${d.sky}"><label class="ck"><input type="checkbox" data-p="base" ${d.base!==false?'checked':''}> Baseplate</label><h4>Aset Gambar</h4><div class="ups"><div>Thumbnail${d.thumb?`<img class="pv" src="${d.thumb}">`:'<div class="pv">16:9</div>'}<button class="btn sm w" data-a="upimg" data-v="thumb">Upload</button></div><div>Icon${d.icon?`<img class="pv" src="${d.icon}">`:'<div class="pv">1:1</div>'}<button class="btn sm w" data-a="upimg" data-v="icon">Upload</button></div></div>`}
  else h+=`<label>Slot</label><select data-p="slot">${['Kepala','Wajah','Leher','Belakang','Pinggang','Bahu','Depan','Perlengkapan','Pakaian','Sepatu','Tubuh','Avatar'].map(s=>`<option ${s==(d.slot=='Alat'?'Perlengkapan':d.slot||'Kepala')?'selected':''}>${s}</option>`).join('')}</select>`;
  h+=`<div style="font-size:11px;margin-top:8px">Pilih objek di Explorer atau ketuk di viewport.</div>`}
 else{const n3=(ps)=>'<div class="v3">'+ps.map(p=>`<input type="number" step="${p=='ry'||p=='rx'||p=='rz'?5:snapV}" data-p="${p}" value="${f2(o[p])}">`).join('')+'</div>';
  h=`<h4>${TI[o.t]} ${esc(NM[o.t]||o.t)}</h4><label>Nama</label><input type="text" data-p="n" value="${esc(o.n)}" maxlength="20"><label>Posisi X Y Z</label>${n3(['x','y','z'])}`;
  if(o.t!='coin')h+=`<label>Ukuran X Y Z</label>${n3(['sx','sy','sz'])}<label>Rotasi X Y Z (derajat)</label>${n3(['rx','ry','rz'])}<label>Warna</label><input type="color" data-p="c" value="${/^#[0-9a-f]{6}$/i.test(o.c)?o.c:'#ffffff'}">`+(o.t=='lava'?'':`<label class="ck"><input type="checkbox" data-p="cc" ${o.cc!==false?'checked':''}> CanCollide</label>`);
  h+=`<div style="display:flex;gap:6px;margin-top:6px"><button class="btn sm c" data-a="edup">⧉ Duplikat</button><button class="btn sm o" data-a="edel" data-v="${o.id}">Hapus</button></div>`}
 $('#props').innerHTML=h}
$('#props').addEventListener('change',e=>{const t=e.target,p=t.dataset&&t.dataset.p;if(!p||!ST)return;pushUndo();const o=cur(),d=ST.d,v=t.type=='checkbox'?t.checked:t.type=='number'?(parseFloat(t.value)||0):t.value;
 if(!o){d[p]=p=='name'?(String(v).trim()||'Tanpa Nama'):v}
 else if(['sx','sy','sz'].includes(p))o[p]=Math.max(.1,v);else if(p=='ry')o[p]=((v%360)+360)%360;else o[p]=p=='n'?(String(v).trim()||'Part'):v;
 touch();sBuild();eRender();if(o&&['x','y','z'].includes(p))pRender()});
/* viewport input */
function ndc(e){const r=sc.getBoundingClientRect();return new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1)}
function pick(e){rc.setFromCamera(ndc(e),SC);const h=rc.intersectObjects(Object.values(meshes),false);return h.length?h[0].object.userData.o:null}
function plane(e,y){rc.setFromCamera(ndc(e),SC);const p=new THREE.Vector3();return rc.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-y),p)?p:null}
function pdist(){const k=Object.keys(ptr);if(k.length<2)return 0;const a=ptr[k[0]],b=ptr[k[1]];return Math.hypot(a.x-b.x,a.y-b.y)}
function panBy(dx,dy){const k=sctl.dist*.0016,y=sctl.yaw;sctl.tx+=-Math.cos(y)*dx*k-Math.sin(y)*dy*k;sctl.tz+=Math.sin(y)*dx*k-Math.cos(y)*dy*k}
sc.addEventListener('pointerdown',e=>{e.preventDefault();try{sc.setPointerCapture(e.pointerId)}catch(x){}
 ptr[e.pointerId]={x:e.clientX,y:e.clientY};if(Object.keys(ptr).length>1){sdrag=null;pinch=pdist();return}
 if(e.button==2||e.button==1||e.shiftKey){sdrag={m:'pan'};return}
 const o=pick(e);
 if(o){SEL=o.id;selHelper();eRender();pRender();
  if(tool!='select'){const p=plane(e,o.y);sdrag={m:tool,o,ox:p?o.x-p.x:0,oz:p?o.z-p.z:0,mv:0,acc:o.ry,tdy:0,s0:[o.sx,o.sy,o.sz]};return}
  sdrag={m:'orbit',tap:0,mv:0};return}
 sdrag={m:'orbit',tap:1,mv:0}});
sc.addEventListener('pointermove',e=>{const p=ptr[e.pointerId];if(!p)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;
 if(Object.keys(ptr).length>1){const d=pdist();if(pinch&&d)sctl.dist=Math.max(3,Math.min(150,sctl.dist*pinch/d));pinch=d;panBy(dx/2,dy/2);return}
 if(!sdrag)return;sdrag.mv=(sdrag.mv||0)+Math.abs(dx)+Math.abs(dy);
 if(sdrag.m=='orbit'){sctl.yaw-=dx*.008;sctl.pit=Math.max(.05,Math.min(1.5,sctl.pit+dy*.008))}
 else if(sdrag.m=='pan')panBy(dx,dy);
 else{const o=sdrag.o;if(!sdrag.u){if(sdrag.mv<5)return;sdrag.u=1;pushUndo()}
  if(sdrag.m=='move'){const q=plane(e,o.y);if(q){o.x=sn(q.x+sdrag.ox);o.z=sn(q.z+sdrag.oz)}}
  else if(sdrag.m=='rot'){sdrag.acc+=dx*.7;o.ry=((Math.round(sdrag.acc/5)*5)%360+360)%360}
  else if(sdrag.m=='scale'){sdrag.tdy+=dy;const f=Math.max(.1,1-sdrag.tdy*.01);o.sx=Math.max(.1,f2(Math.round(sdrag.s0[0]*f*10)/10));o.sy=Math.max(.1,f2(Math.round(sdrag.s0[1]*f*10)/10));o.sz=Math.max(.1,f2(Math.round(sdrag.s0[2]*f*10)/10))}
  place(meshes[o.id],o);if(helper)helper.update()}});
const pup=e=>{if(!ptr[e.pointerId])return;delete ptr[e.pointerId];pinch=0;
 if(!Object.keys(ptr).length&&sdrag){if(sdrag.m=='orbit'&&sdrag.tap&&sdrag.mv<6&&SEL!='root'){SEL='root';selHelper();eRender();pRender()}
  if(sdrag.u){touch();pRender()}sdrag=null}};
sc.addEventListener('pointerup',pup);sc.addEventListener('pointercancel',pup);
sc.addEventListener('wheel',e=>{e.preventDefault();sctl.dist=Math.max(3,Math.min(150,sctl.dist*(1+e.deltaY*.0012)))},{passive:false});
sc.addEventListener('contextmenu',e=>e.preventDefault());
$('#snap').addEventListener('change',e=>{snapV=parseFloat(e.target.value)||1;if(ST)pRender()});
window.addEventListener('keydown',e=>{if(!ST||!$('#ed').classList.contains('on'))return;const tg=document.activeElement&&document.activeElement.tagName;if(tg=='INPUT'||tg=='SELECT')return;const k=e.key.toLowerCase();
 if((k=='delete'||k=='backspace')&&cur())act.edel(SEL);else if((e.ctrlKey||e.metaKey)&&k=='z'){e.preventDefault();act.undo()}else if((e.ctrlKey||e.metaKey)&&k=='d'){e.preventDefault();act.edup()}
 else if(k.length==1&&'1234'.includes(k))act.tool(['select','move','rot','scale'][+k-1])});
/* upload gambar */
$('#fi').addEventListener('change',e=>{const f=e.target.files[0];e.target.value='';if(!f||!ST)return;if(!/^image\//.test(f.type))return toast('File harus berupa gambar');
 const fr=new FileReader();fr.onload=()=>{const im=new Image();im.onload=()=>{const W=upk=='icon'?128:320,H=upk=='icon'?128:180,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d'),s=Math.max(W/im.width,H/im.height),w=im.width*s,h=im.height*s;
  x.drawImage(im,(W-w)/2,(H-h)/2,w,h);ST.d[upk]=c.toDataURL('image/jpeg',.82);save();pRender();slog('Upload '+upk+' berhasil');toast('Gambar '+(upk=='icon'?'icon':'thumbnail')+' tersimpan')};im.onerror=()=>toast('Gambar tidak valid');im.src=fr.result};fr.readAsDataURL(f)});
/* export / import */
async function expo(rec,kind){const j=JSON.stringify({shinpo:1,kind,by:(me.apiKey||'').slice(0,12),data:rec});
 try{const dl=await claude.use('downloads');if(dl){await dl.save({filename:String(rec.name||'proyek').replace(/\W+/g,'_')+'.sandbox.json',data:j});return}}catch(e){}
 try{await navigator.clipboard.writeText(j);toast('JSON proyek disalin ke clipboard')}catch(e){toast('Ekspor tidak tersedia di browser ini')}}
$('#imp').addEventListener('change',e=>{const f=e.target.files[0];e.target.value='';if(!f)return;const fr=new FileReader();
 fr.onload=()=>{try{const j=JSON.parse(fr.result);if(j.shinpo!==1||!j.data||!Array.isArray(j.data.objs))throw 0;const s=j.data,hx=c=>/^#[0-9a-f]{6}$/i.test(c)?c:'#ffffff',nm=v=>isFinite(+v)?+v:0,im=u=>/^data:image\/(jpeg|png);base64,[A-Za-z0-9+\/=]+$/.test(u||'')?u:undefined;
  const d={id:(()=>{const o=String(s.id||''),ex=(me.games||[]).concat(me.items||[]).some(x=>x.id==o);return /^[ci]\d{10,14}$/.test(o)&&!ex?o:(j.kind=='g'?'c':'i')+Date.now()})(),name:String(s.name||'Impor').slice(0,14)+' (impor)',emoji:esc(String(s.emoji||'').slice(0,4)),col:hx(s.col||'#b6f25a'),sky:hx(s.sky||'#7df9ff'),base:s.base!==false,slot:String(s.slot||'Kepala').slice(0,10),seed:1,n:0,pl:1,lk:0,pub:false,by:String(j.by||'').slice(0,12),thumb:im(s.thumb),icon:im(s.icon),
   objs:s.objs.slice(0,400).map(o=>({id:nid(),t:NM[o.t]?o.t:'part',n:String(o.n||'Part').slice(0,20),x:nm(o.x),y:nm(o.y),z:nm(o.z),sx:Math.max(.1,nm(o.sx)||1),sy:Math.max(.1,nm(o.sy)||1),sz:Math.max(.1,nm(o.sz)||1),ry:nm(o.ry),rx:nm(o.rx),rz:nm(o.rz),c:hx(o.c),cc:o.cc!==false,mid:(o.t=='model'&&/^m[a-z0-9]{3,20}$/.test(String(o.mid)))?String(o.mid):undefined})),models:(s.models&&typeof s.models=='object')?Object.fromEntries(Object.entries(s.models).filter(([k,v])=>/^m[a-z0-9]{3,20}$/.test(k)&&/^data:model\/gltf-binary;base64,[A-Za-z0-9+\/=]+$/.test(v)).slice(0,6)):undefined,svc:(typeof cleanSvc=='function'?cleanSvc(s.svc):undefined),ch:(()=>{try{const t=JSON.stringify(s.ch||[]);return t.length<3e5&&Array.isArray(s.ch)?JSON.parse(t).slice(0,80):undefined}catch(e){return undefined}})()};
  if(j.kind=='g'){d.mine=1;me.games.push(d)}else{me.items=me.items||[];me.items.push(d)}save();toast('Proyek diimpor ✓');render();if(window.__impOpen){window.__impOpen=0;try{edOpen(d,j.kind=='g'?'g':'a')}catch(e){}}}catch(x){toast('File proyek tidak valid')}};fr.readAsText(f)});
/* aksi */
Object.assign(act,{
 newg(v){const T=GT[v],t=T.f(),g=Object.assign({id:'c'+Date.now(),name:T.n,emoji:T.e,col:'#b6f25a',sky:'#7df9ff',seed:1,n:0,pl:1,lk:0,mine:1,pub:false,base:true},t);me.games.push(g);save();edOpen(g,'g')},
 newa(v){const T=AT[v],i={id:'i'+Date.now(),name:T.n,slot:'Kepala',objs:T.f()};me.items=me.items||[];me.items.push(i);save();edOpen(i,'a')},
 edopen(v,t){const k=t.dataset.k,d=k=='g'?me.games.find(g=>g.id==v):(me.items||[]).find(i=>i.id==v);if(d)edOpen(d,k)},
 del(v,t){if(!t.dataset.arm){t.dataset.arm=1;t.textContent='Yakin?';setTimeout(()=>{delete t.dataset.arm;t.textContent='Hapus'},2500);return}
  if(t.dataset.k=='g')me.games=me.games.filter(g=>g.id!=v);else{me.items=me.items.filter(i=>i.id!=v);me.av.acc=(me.av.acc||[]).filter(i=>i!=v)}save();render()},
 exp(v,t){const k=t.dataset.k,r=k=='g'?me.games.find(g=>g.id==v):me.items.find(i=>i.id==v);if(r)expo(r,k)},
 impb(){$('#imp').click()},
 keyshow(){const i=$('#ak');i.type=i.type=='password'?'text':'password'},
 keycopy(){const i=$('#ak'),old=i.type;i.type='text';i.select();try{document.execCommand('copy')}catch(e){}if(navigator.clipboard)navigator.clipboard.writeText(me.apiKey).catch(()=>{});i.type=old;toast('API key disalin')},
 keyregen(){me.apiKey=genKey();save();render();toast('API key baru dibuat')},
 acc(v){const a=me.av.acc=me.av.acc||[],i=a.indexOf(v);i<0?a.push(v):a.splice(i,1);save();render()},
 tool(v){tool=v;document.querySelectorAll('#etb [data-a=tool]').forEach(b=>b.classList.toggle('on',b.dataset.v==v))},
 esel(v){SEL=v;selHelper();eRender();pRender()},
 ins(v){if(v=='coin')return;pushUndo();const a=ST.kind=='a',k=a?.2:1,d={part:[4,1,4],cyl:[3,1,3],ball:[3,3,3],coin:[1,1,1],lava:[6,.5,6],spawn:[4,.4,4],finish:[5,.8,5]}[v].map(s=>a&&v!='coin'?f2(s*k):s),
  col={lava:'#ff3b3b',spawn:'#7df9ff',finish:'#ffc400',coin:'#00d4ff'}[v]||PAL[Math.random()*6|0],x=a?0:Math.round(sctl.tx),z=a?0:Math.round(sctl.tz),y=a?2.9:(v=='coin'?1.5:f2(d[1]/2)),o=O(v,x,y,z,d[0],d[1],d[2],col);
  ST.d.objs.push(o);SEL=o.id;sBuild();eRender();pRender();touch();slog('+ '+o.n)},
 edel(v){pushUndo();ST.d.objs=ST.d.objs.filter(o=>o.id!=v);SEL='root';sBuild();eRender();pRender();touch();slog('Objek dihapus')},
 edup(){const o=cur();if(!o)return;pushUndo();const c=Object.assign({},o,{id:nid(),x:f2(o.x+Math.max(snapV,.5))});ST.d.objs.push(c);SEL=c.id;sBuild();eRender();pRender();touch()},
 undo(){if(!undo.length)return slog('Tidak ada yang bisa di-undo');ST.d.objs=JSON.parse(undo.pop());if(!cur())SEL='root';sBuild();eRender();pRender();touch()},
 yup(){const o=cur();if(!o)return;pushUndo();o.y=f2(o.y+snapV);place(meshes[o.id],o);if(helper)helper.update();pRender();touch()},
 ydn(){const o=cur();if(!o)return;pushUndo();o.y=f2(o.y-snapV);place(meshes[o.id],o);if(helper)helper.update();pRender();touch()},
 tpl(v){pushUndo();const d=ST.d;if(ST.kind=='g'){const t=GT[v].f();d.objs=t.objs;d.base=t.base!=null?t.base:true;if(t.sky)d.sky=t.sky;if(t.col)d.col=t.col}else d.objs=AT[v].f();SEL='root';sBuild();eRender();pRender();touch();slog('Template diterapkan (bisa Undo)')},
 upimg(v){upk=v;$('#fi').click()},
 edsave(){save();slog('Tersimpan');toast('Proyek tersimpan')},
 edpub(){const d=ST.d;if(ST.kind=='g'){d.pub=d.pub===false;save();pubLabel();toast(d.pub?'Game dipublikasikan! Muncul di Home':'Game kembali menjadi draft');if(d.pub)notify('Game "'+d.name+'" dipublikasikan')}
  else{const a=me.av.acc=me.av.acc||[];if(!a.includes(d.id))a.push(d.id);save();toast('Aksesoris dipakai di avatarmu ');notify('Aksesoris "'+d.name+'" dipakai')}},
 edtest(){save();edRun=false;cancelAnimationFrame(edRaf);if(ST.kind=='g')startGame(ST.d,true);else{forceAcc=(me.av.acc||[]).filter(i=>i!=ST.d.id).concat(ST.d.id);startGame(TESTMAP,true)}},
 edexit(){save();edRun=false;cancelAnimationFrame(edRaf);try{if(document.fullscreenElement)document.exitFullscreen().catch(()=>{})}catch(e){}try{screen.orientation.unlock()}catch(e){}show('app');page='create';render()}
});
;

/* ===== 07-sandbox-addon-v2.js ===== */
/* ===== SANDBOX ADDON v2: Owner/Panel, Marketplace, Gizmo 3D, Menu, Publish ===== */
const SALT='sandbox$7',OH='',OU='',OPH='';
const sha=(()=>{const K=[],H0=[],p=[];for(let n=2;p.length<64;n++)if(p.every(q=>n%q))p.push(n);
 p.forEach((q,i)=>{K[i]=(Math.cbrt(q)%1*4294967296)|0;if(i<8)H0[i]=(Math.sqrt(q)%1*4294967296)|0});
 const r=(x,n)=>x>>>n|x<<32-n;
 return s=>{const b=[...new TextEncoder().encode(s)],l=b.length*8;b.push(128);while(b.length%64!=56)b.push(0);for(let i=7;i>=0;i--)b.push(i>3?0:(l>>>(i*8))&255);
  let h=H0.slice();for(let o=0;o<b.length;o+=64){const w=[];for(let i=0;i<16;i++)w[i]=b[o+i*4]<<24|b[o+i*4+1]<<16|b[o+i*4+2]<<8|b[o+i*4+3];
   for(let i=16;i<64;i++){const a=w[i-15],c=w[i-2];w[i]=w[i-16]+(r(a,7)^r(a,18)^a>>>3)+w[i-7]+(r(c,17)^r(c,19)^c>>>10)|0}
   let[a,B,c,d,e,f,g,H]=h;
   for(let i=0;i<64;i++){const t1=H+(r(e,6)^r(e,11)^r(e,25))+(e&f^~e&g)+K[i]+w[i]|0,t2=(r(a,2)^r(a,13)^r(a,22))+(a&B^a&c^B&c)|0;H=g;g=f;f=e;e=d+t1|0;d=c;c=B;B=a;a=t1+t2|0}
   h=[h[0]+a|0,h[1]+B|0,h[2]+c|0,h[3]+d|0,h[4]+e|0,h[5]+f|0,h[6]+g|0,h[7]+H|0]}
  return h.map(x=>(x>>>0).toString(16).padStart(8,'0')).join('')}})();
const ROLE={owner:3,coowner:2,admin:1},RN={owner:'OWNER',coowner:'CO-ADMIN',admin:'ADMIN'};
const lv=u=>u&&ROLE[u.role]||0,vb=u=>{if(!u)return'';let v=!!u.verified,rb='';try{const k=Object.keys(users).find(x=>users[x]===u);if(k){if(window.spVerified&&window.spVerified(k))v=true;if(window.spRoleBadge)rb=window.spRoleBadge(k)}}catch(e){}return (v?'<span class="vb">✔</span>':'')+rb},staff=()=>!!me&&lv(me)>0,okT=u=>lv(me)==3||lv(me)>lv(u);
let pt='gift',avt='cust',mtab='play';
const reps=()=>ls.get('sp_rep',[]),gf=()=>Object.assign({q:'2',sh:'normal',fog:'1'},S.gfx||{});

/* ---- login owner (email tidak pernah ditampilkan / disimpan, hanya hash) ---- */
const _auth=act.auth;
act.auth=function(){const raw=$('#u').value.trim(),p=$('#pw').value,bad=m=>{$('#err').textContent=m;const c=$('#acard');c.classList.remove('shake');void c.offsetWidth;c.classList.add('shake')};
 if(raw.includes('@')){if(mode!='login'||(sha(SALT+raw.toLowerCase())!==OH&&sha(SALT+raw.toLowerCase())!==OU))return bad('Username atau password salah');
  if(p.length<6)return bad('Password owner min. 6 karakter');const ph=sha(SALT+'pw:'+p);let o=users.Owner;
  if(!o)o=users.Owner={pass:'',ph,bux:99999,daily:'',av:{skin:SKIN[0],shirt:SHIRT[1],pants:PANTS[1],hat:'crown'},games:[],items:[],notes:[{t:'Akun Owner aktif ',new:1}],role:'owner',verified:true};
  else if(o.ph!==ph)return bad('Username atau password salah');
  save();me=o;me.name='Owner';me.notes=me.notes||[];me.games=me.games||[];ls.set('sp_sess','Owner');$('#u').value='';$('#pw').value='';$('#u').type='text';return enter()}
 if(/^(owner|admin|coowner|co-owner)$/i.test(raw))return bad(mode=='reg'?'Username dicadangkan':'Username atau password salah');
 if(mode=='reg'&&raw.length>14)return bad('Username maks. 14 karakter');
 _auth()};
$('#u').removeAttribute('maxlength');$('#u').setAttribute('autocomplete','off');
$('#u').addEventListener('input',e=>{e.target.type=e.target.value.includes('@')?'password':'text'});

/* ---- render hooks ---- */
const _r=render;
render=function(){if(page=='panel'&&!staff())page='home';_r();const m=$('#main');
 if(page=='avatar')m.innerHTML='<div class="page">'+avH()+'</div>';
 if(page=='panel')m.innerHTML='<div class="page">'+panH()+'</div>';
 if(page=='home'){const h=m.querySelector('.hero h1');if(h)h.insertAdjacentHTML('beforeend',vb(me))}rolePill()};
function rolePill(){if(!me)return;let e=$('#rolep');if(!e){e=document.createElement('div');e.id='rolep';e.className='pill';$('#buxp').before(e)}const t=(RN[me.role]||'')+(me.verified?' ✔':'');e.style.display=t?'':'none';e.textContent=t}
const _en=enter;
enter=function(){_en();if(staff())$('#nav').insertAdjacentHTML('beforeend','<button data-a="go" data-v="panel" id="n_panel"><span></span>Panel</button>');navRender();rolePill()};

/* ---- panel (hanya staff) ---- */
const usersOpt=()=>Object.keys(users).filter(k=>users[k]!==me).map(k=>`<option>${esc(k)}</option>`).join('');
function panH(){if(!staff())return'';const T=[['gift','Gift'],['user','Pengguna'],['lap','Laporan']];
 let h='<h2>Panel '+(RN[me.role]||'')+'</h2><div class="mt" style="margin-bottom:12px">'+T.map(x=>`<button class="btn sm ${pt==x[0]?'c':''}" data-a="pt" data-v="${x[0]}">${x[1]}</button>`).join('')+'</div>';
 if(pt=='gift'){const ro=[['admin','Admin',2],['coowner','Co-Owner',3]].filter(r=>lv(me)>=r[2]);
  h+=`<div class="card"><label>Pilih pemain</label><select id="pt_u">${usersOpt()}</select>
  <label>Gift SandBux${lv(me)<3?' (maks. 500)':''}</label><input type="text" inputmode="numeric" id="pt_n" value="100"><button class="btn w g" data-a="gbux">Kirim SandBux</button>
  <label style="margin-top:14px">✔ Gift Centang Biru</label><div style="display:flex;gap:8px;margin-top:6px"><button class="btn w c" data-a="gver" data-v="1">Beri ✔</button><button class="btn w o" data-a="gver" data-v="0">Cabut</button></div>`
  +(ro.length?`<label style="margin-top:14px">Gift Akses Panel</label><select id="pt_r" style="margin-bottom:8px">${ro.map(r=>`<option value="${r[0]}">${r[1]}</option>`).join('')}<option value="none">Cabut akses</option></select><button class="btn w v" data-a="grole">Berikan Akses</button>`:'')+'</div>'}
 if(pt=='user')h+=Object.keys(users).map(k=>{const u=users[k];return`<div class="card row"><b style="flex:1">${esc(k)}${vb(u)}</b><span class="pill" style="font-size:12px">${RN[u.role]||'User'}</span><span class="pill" style="font-size:12px">${u.bux||0}</span></div>`}).join('');
 if(pt=='lap')h+=reps().map((r,i)=>`<div class="note"><b>${esc(r.type)}</b> · ${esc(r.by)} → ${esc(r.tg||'-')}<br>${esc(r.txt)}<br><small>${esc(r.gn||'')}</small><div style="margin-top:6px">${r.gid?`<button class="btn sm o" data-a="rtake" data-v="${i}">Turunkan map</button> `:''}<button class="btn sm" data-a="rdel" data-v="${i}">Hapus</button></div></div>`).join('')||'<div class="note">Belum ada laporan.</div>';
 return h}
const tgt=()=>{const k=$('#pt_u')&&$('#pt_u').value,u=users[k];if(!u)toast('Pilih pemain dulu');return u?[k,u]:null},
 nt=(u,t)=>(u.notes=u.notes||[]).unshift({t,new:1});
Object.assign(act,{
 pt(v){pt=v;render()},
 gbux(){const t=tgt();if(!t||!staff())return;let n=Math.floor(+$('#pt_n').value);if(!(n>0))return toast('Jumlah tidak valid');if(lv(me)<3)n=Math.min(n,500);t[1].bux=(t[1].bux||0)+n;nt(t[1],'Kamu mendapat '+n+' SandBux dari '+RN[me.role]);save();toast('Terkirim '+n+' SandBux ke '+t[0])},
 gver(v){const t=tgt();if(!t||!staff()||!okT(t[1]))return toast('Tidak diizinkan');t[1].verified=v=='1';nt(t[1],v=='1'?'✔ Kamu mendapat Centang Biru!':'Centang biru dicabut');save();toast(v=='1'?'Centang biru diberikan':'Centang biru dicabut')},
 grole(){const t=tgt(),r=$('#pt_r')&&$('#pt_r').value;if(!t||!r||!okT(t[1])||(r!='none'&&lv({role:r})>=lv(me)))return toast('Tidak diizinkan');
  if(r=='none'){delete t[1].role;nt(t[1],'Akses panelmu dicabut')}else{t[1].role=r;nt(t[1],'Kamu mendapat akses '+RN[r]+'. Login ulang untuk membuka Panel.')}save();toast('Akses diperbarui')},
 rdel(v){if(!staff())return;const r=reps();r.splice(+v,1);ls.set('sp_rep',r);render()},
 rtake(v){if(!staff())return;const r=reps()[+v];Object.values(users).forEach(u=>(u.games||[]).forEach(g=>{if(g.id==r.gid)g.pub=false}));save();toast('Map diturunkan jadi draft')}
});

/* ---- avatar: kostumisasi + marketplace ---- */
const PRICE={mahkota:60,kerucut:30,sayap:90,kacamata:25,jubah:45};
function mkItems(){const a=Object.keys(AT).filter(k=>PRICE[k]).map(k=>({key:'t_'+k,name:AT[k].n,e:AT[k].e,price:PRICE[k],by:'Sandbox',v:1,objs:AT[k].f(),desc:'Item resmi Sandbox'}));
 Object.keys(users).forEach(un=>(users[un].items||[]).forEach(i=>{const lm=!!(i.rv&&i.rv.s==='off');if((i.pub===true&&!(i.rv&&i.rv.s&&i.rv.s!=='approved'))||lm)a.push({key:'u_'+un+'_'+i.id,name:i.name,e:'',icon:i.icon,price:i.price||0,by:un,v:users[un].verified,objs:i.objs,desc:i.desc,slot:i.slot,lim:lm?1:0})}));return a}
function avH(){const tb=[['cust','Kostumisasi'],['mkt','Marketplace']].map(x=>`<button class="btn sm ${avt==x[0]?'c':''}" data-a="avt" data-v="${x[0]}">${x[1]}</button>`).join(' ');
 let h=`<h2>Avatar</h2><div class="card" style="display:flex;justify-content:center;background:var(--c);padding:26px 20px 20px">${avHTML(me.av,12)}</div><div class="mt" style="margin:14px 0">${tb}</div>`;
 if(avt=='cust'){const sw=(k,arr)=>arr.map(c=>`<span class="sw ${me.av[k]==c?'sel':''}" style="background:${c}" data-a="av" data-k="${k}" data-v="${c}"></span>`).join('');
  h+=`<div class="card"><label>Kulit</label><br>${sw('skin',SKIN)}<br><label>Baju</label><br>${sw('shirt',SHIRT)}<br><label>Celana</label><br>${sw('pants',PANTS)}<br><label>Topi</label><br>${['none','cap','crown'].map(x=>`<button class="btn sm ${me.av.hat==x?'g':''}" style="margin:6px 6px 0 0" data-a="av" data-k="hat" data-v="${x}">${x}</button>`).join('')}</div>`+accHTML()}
 else h+=`<div class="note">Kamu punya ${me.bux} SandBux. Aksesoris buatan kreator lain muncul di sini setelah dipublish.</div><div class="grid">`+mkItems().map((it,i)=>{const own=(me.items||[]).some(x=>x.src==it.key||'u_'+me.name+'_'+x.id==it.key);
  return`<div class="card gcard"><div class="th" style="background-color:${PAL[i%6]}">${it.icon?`<img src="${it.icon}" style="width:100%;height:100%;object-fit:cover">`:'<span>'+esc(it.e||String(it.name||'?').charAt(0).toUpperCase())+'</span>'}</div><div class="in"><b>${esc(it.name)}</b><small>${esc(it.desc||'')} · ${esc(it.by)}${it.v?'<span class="vb">✔</span>':''}</small><button class="btn w ${own?'':'g'}" data-a="buy" data-v="${it.key}">${own?'✓ Dimiliki':''+it.price}</button></div></div>`}).join('')+'</div>';
 return h}
Object.assign(act,{avt(v){avt=v;render()},
 buy(v){const it=mkItems().find(x=>x.key==v);if(!it)return;if(it.lim)return toast('Limited U: item ini sudah tidak dijual');if((me.items||[]).some(x=>x.src==v||'u_'+me.name+'_'+x.id==v))return toast('Sudah dimiliki');
  if(me.bux<it.price)return toast('SandBux tidak cukup');addBux(-it.price);const cr=users[it.by];if(cr&&cr!==me){cr.bux=(cr.bux||0)+it.price;nt(cr,''+me.name+' membeli "'+it.name+'" +'+it.price+' SandBux')}
  (me.items=me.items||[]).push({id:'i'+Date.now(),name:it.name,slot:it.slot||'Kepala',objs:it.objs.map(o=>Object.assign({},o,{id:nid()})),src:v});save();notify('Membeli "'+it.name+'"');toast('Dibeli! Pakai di Kostumisasi');render()}});

/* ---- publish (nama, deskripsi, icon, thumbnail, API key wajib) ---- */
const pmKeep=()=>{const g=i=>$('#'+i)?$('#'+i).value:undefined;window._pm=Object.assign(window._pm||{},{n:g('pm_n'),d:g('pm_d'),k:g('pm_k'),p:g('pm_p')})};
function pubOpen(re){if(!me.apiKey){me.apiKey=genKey();save()}const d=ST.d,a=ST.kind=='a';let m=$('#pubm');if(re&&m)pmKeep();else window._pm={};const P=window._pm;
 if(!m){m=document.createElement('div');m.id='pubm';document.body.appendChild(m)}m.dataset.open=1;
 const im=(k,l)=>`<label>${l} ${a?'<span style="opacity:.6">(opsional)</span>':'<b style="color:#d00">*</b>'}</label><div style="display:flex;gap:8px;align-items:center;margin:4px 0 10px"><div class="pv" style="width:${k=='icon'?'64px':'120px'};aspect-ratio:${k=='icon'?'1':'16/9'};margin:0">${d[k]?`<img src="${d[k]}" style="width:100%;height:100%;object-fit:cover">`:'kosong'}</div><button class="btn sm" style="margin:0" data-a="upimg" data-v="${k}">Pilih</button></div>`;
 m.innerHTML=`<div class="card"><h2>Publish ${a?'Aksesoris':'Map'}</h2><label>Nama ${a?'aksesoris':'map'} *</label><input type="text" id="pm_n" maxlength="22" value="${esc(P.n!=null?P.n:d.name)}"><label>Deskripsi * (min. 10 huruf)</label><input type="text" id="pm_d" maxlength="140" value="${esc(P.d!=null?P.d:d.desc||'')}">${im('icon','Icon')}${im('thumb','Thumbnail')}${a?`<label>Harga SandBux (0 = gratis)</label><input type="text" inputmode="numeric" id="pm_p" value="${esc(P.p!=null?P.p:d.price||0)}">`:''}<label>API Key Creator *</label><input type="password" id="pm_k" autocomplete="off" value="${esc(P.k||'')}" placeholder="spk_..."><div style="font-size:11px;margin:-6px 0 8px">Ambil dari Studio → API Key Creator. Key asal-asalan akan ditolak.</div>${a?'<div style="font-size:12px;margin:0 0 8px;font-weight:700">Biaya publish aksesoris: '+(window.accFeeDue(d)?window.accFeeDue(d).toLocaleString('id-ID')+' SandBux'+(window.accHasFx(d)?' (aksesoris ber-efek: total '+window.ACC_FEE_FX.toLocaleString('id-ID')+')':' (tanpa efek; jika ditambah efek jadi '+window.ACC_FEE_FX.toLocaleString('id-ID')+')')+' (saldomu '+(me.bux||0).toLocaleString('id-ID')+')':'sudah dibayar')+'</div>':''}<div class="err" id="pm_e"></div><div style="display:flex;gap:8px"><button class="btn w" data-a="pmx">Batal</button><button class="btn w g" data-a="pmgo">Publish</button></div></div>`}
const _pR=pRender;pRender=function(){_pR();const m=$('#pubm');if(m&&m.dataset.open)pubOpen(1)};
const _pl=pubLabel;pubLabel=function(){_pl();$('#pubb').textContent=ST.d.pub===true?'Published':(ST.d.rv&&ST.d.rv.s=='pending'?'Menunggu review':'Publish')};
Object.assign(act,{
 edpub(){const d=ST.d;if(d.pub===true){d.pub=false;save();pubLabel();return toast('Kembali menjadi draft')}if(d.rv&&d.rv.s=='pending'){RV.cancel(d);pubLabel();return toast('Pengajuan dibatalkan')}pubOpen()},
 pmx(){const m=$('#pubm');if(m)m.remove()},
 pmgo(){pmKeep();const d=ST.d,a=ST.kind=='a',P=window._pm,k=(P.k||'').trim(),n=(P.n||'').trim(),ds=(P.d||'').trim(),err=m=>{$('#pm_e').textContent=m};
  if(n.length<3)return err('Nama minimal 3 karakter');if(ds.length<10)return err('Deskripsi minimal 10 karakter');if(!a&&!d.icon)return err('Icon wajib diupload');if(!a&&!d.thumb)return err('Thumbnail wajib diupload');
  {const kr=keyChk(k,a?'universe-accessory':'universe-place','w');if(kr)return err(kr)}
  let pr=0;if(a){pr=Math.floor(+P.p||0);if(!(pr>=0&&pr<=9999))return err('Harga 0–9999')}
  Object.assign(d,{name:n,desc:ds,by:me.name,price:pr});if(RV.blk(d))return err('Diblokir/off sale oleh admin, tidak bisa dipublish');if(a){const fe=window.accFeeErr(d);if(fe)return err(fe);window.accFeePay(d)}const dr=RV.submit(d,a?'acc':'map');act.pmx();pubLabel();eRender();toast(dr?(a?'Aksesoris':'Map')+' dipublish':'Dikirim ke admin untuk dicek ⏳')}});

/* ---- gizmo 3D (panah) ---- */
let GZ=null,gd=null;const V3=THREE.Vector3,GAX={x:new THREE.Vector3(1,0,0),y:new THREE.Vector3(0,1,0),z:new THREE.Vector3(0,0,1)};
function gzBuild(){if(!SS)return;if(GZ){SS.remove(GZ);GZ=null}const o=cur();if(!o||tool=='select'||((tool=='scale'||tool=='rot')&&o.t=='coin'))return;
 GZ=new THREE.Group();const C={x:0xff3b3b,y:0x2ecc40,z:0x3b6bff},M=(c,op)=>new THREE.MeshBasicMaterial({color:c,depthTest:false,transparent:true,opacity:op==null?1:op}),AX=GAX,Y=new V3(0,1,0);
 if(tool=='rot'){['x','y','z'].forEach(ax=>{const g=new THREE.Group(),vis=new THREE.Mesh(new THREE.TorusGeometry(2.2,.07,8,72),M(C[ax])),hit=new THREE.Mesh(new THREE.TorusGeometry(2.2,.25,6,48),M(C[ax],0));g.add(vis,hit);if(ax=='x')g.rotation.y=Math.PI/2;if(ax=='y')g.rotation.x=Math.PI/2;g.children.forEach(x=>{x.userData.ax=ax;x.renderOrder=99});GZ.add(g)})}
 else['x','y','z'].forEach(ax=>[1,-1].forEach(sg=>{const col=sg>0?C[ax]:new THREE.Color(C[ax]).multiplyScalar(.7).getHex(),c=M(col),g=new THREE.Group(),
  sh=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,2.3,8),c),tip=tool=='move'?new THREE.Mesh(new THREE.ConeGeometry(.26,.7,14),c):new THREE.Mesh(new THREE.BoxGeometry(.4,.4,.4),c),hit=new THREE.Mesh(new THREE.CylinderGeometry(.32,.32,3.4,6),M(col,0));
  sh.position.y=1.65;tip.position.y=3.1;hit.position.y=1.9;g.add(sh,tip,hit);g.quaternion.setFromUnitVectors(Y,AX[ax].clone().multiplyScalar(sg));g.children.forEach(x=>{x.userData.ax=ax;x.userData.sg=sg;x.renderOrder=99});GZ.add(g)}));
 SS.add(GZ)}
function gzUpd(){if(!GZ)return;const o=cur(),m=o&&meshes[o.id];GZ.visible=!!m;if(m){GZ.position.copy(m.position);if(o.t=='coin')GZ.quaternion.identity();else GZ.quaternion.copy(m.quaternion);GZ.scale.setScalar(Math.max(.3,sctl.dist*.075))}}
const _sh=selHelper;selHelper=function(){_sh();gzBuild()};
const _tl=act.tool;act.tool=function(v){_tl(v);if(ST)gzBuild()};
const _el=edLoop;edLoop=function(){gzUpd();_el()};
function axS(e,P,u){rc.setFromCamera(ndc(e),SC);const w=P.clone().sub(rc.ray.origin),d=rc.ray.direction,b=u.dot(d),den=1-b*b;return den<1e-4?null:(b*d.dot(w)-u.dot(w))/den}
function ringA(e,P,n,e1,e2){rc.setFromCamera(ndc(e),SC);const pl=new THREE.Plane().setFromNormalAndCoplanarPoint(n,P),q=new V3();if(!rc.ray.intersectPlane(pl,q))return null;const r=q.sub(P);return Math.atan2(r.dot(e2),r.dot(e1))}
const mod=(v,m)=>((v%m)+m)%m,s5=d=>Math.round(d/5)*5;
sc.addEventListener('pointerdown',e=>{if(!GZ||!GZ.visible||!ST||Object.keys(ptr).length)return;rc.setFromCamera(ndc(e),SC);const h=rc.intersectObjects(GZ.children,true);if(!h.length)return;const ud=h[0].object.userData,ax=ud.ax,sg=ud.sg||1,o=cur(),m=o&&meshes[o.id];if(!o||!m)return;
 const P=m.position.clone(),Q=o.t=='coin'?new THREE.Quaternion():m.quaternion.clone(),u=GAX[ax].clone().applyQuaternion(Q);
 const g0={id:e.pointerId,ax,sg,o,m:tool,P,Q,u,v0:{x:o.x,y:o.y,z:o.z,sx:o.sx,sy:o.sy,sz:o.sz},s0:0,a0:0,last:0};
 if(tool=='rot'){const e1=(Math.abs(u.y)<.9?new V3(0,1,0):new V3(1,0,0)).cross(u).normalize(),e2=u.clone().cross(e1),a=ringA(e,P,u,e1,e2);if(a==null)return;g0.e1=e1;g0.e2=e2;g0.a0=a}
 else{const s=axS(e,P,u);if(s==null)return;g0.s0=s}
 e.stopImmediatePropagation();e.preventDefault();try{sc.setPointerCapture(e.pointerId)}catch(x){}pushUndo();gd=g0},true);
sc.addEventListener('pointermove',e=>{if(!gd||e.pointerId!==gd.id)return;e.stopImmediatePropagation();e.preventDefault();const o=gd.o,ax=gd.ax;
 if(gd.m=='rot'){const a=ringA(e,gd.P,gd.u,gd.e1,gd.e2);if(a==null)return;let d=a-gd.a0;d=Math.atan2(Math.sin(d),Math.cos(d));const q=new THREE.Quaternion().setFromAxisAngle(gd.u,d).multiply(gd.Q),eu=new THREE.Euler().setFromQuaternion(q,'YXZ'),R=180/Math.PI,nx=mod(s5(eu.x*R),360),ny=mod(s5(eu.y*R),360),nz=mod(s5(eu.z*R),360);
  if(nx===o.rx&&ny===o.ry&&nz===(o.rz||0))return;o.rx=nx;o.ry=ny;o.rz=nz}
 else{const s=axS(e,gd.P,gd.u);if(s==null)return;const dl=s-gd.s0,sp=snapV||.1;
  if(gd.m=='scale'){const k='s'+ax,nv=Math.max(.1,f2(Math.round((gd.v0[k]+dl*gd.sg*2)/sp)*sp));if(nv===o[k])return;o[k]=nv}
  else{const nx=sn(gd.v0.x+gd.u.x*dl),ny=sn(gd.v0.y+gd.u.y*dl),nz=sn(gd.v0.z+gd.u.z*dl);if(nx===o.x&&ny===o.y&&nz===o.z)return;o.x=nx;o.y=ny;o.z=nz}}
 place(meshes[o.id],o);if(helper)helper.update()},true);
const gu=e=>{if(gd&&e.pointerId===gd.id){gd=null;touch();pRender()}};sc.addEventListener('pointerup',gu);sc.addEventListener('pointercancel',gu);

/* ---- menu in-game ala Roblox ---- */
$('#pause').innerHTML=`<div class="card"><h2>☰ Menu</h2><div class="mt">${[['play','Pemain'],['set','Setelan'],['gfx','Grafik'],['rep','Laporan'],['help','Info']].map(x=>`<button class="btn sm" data-a="mt" data-v="${x[0]}">${x[1]}</button>`).join('')}</div><div id="mb"></div><div class="mf"><button class="btn g" data-a="resume">▶ Lanjut</button><button class="btn o" data-a="respawn">↺ Reset</button><button class="btn p" data-a="leave"> Keluar</button></div></div>`;
const SHF={normal:'none',bright:'saturate(1.35) brightness(1.08)',cine:'contrast(1.2) saturate(.85) sepia(.18)',retro:'saturate(1.6) contrast(1.15)',bw:'grayscale(1)'};
function gfxApply(){const g=gf();cv.style.filter=SHF[g.sh]||'none';cv.style.imageRendering=g.sh=='retro'?'pixelated':'';
 if(R){R.setPixelRatio(Math.max(.3,Math.min(+g.q,window.devicePixelRatio||1)*(g.sh=='retro'?.5:1)));resize()}if(scene&&scene.fog)scene.fog.far=g.fog=='1'?140:600;$('#chatlog').style.display=S.nochat?'none':''}
function mtR(v){mtab=v;const g=gf(),op=(k,a)=>a.map(x=>`<button class="btn sm ${g[k]==x[0]?'g':''}" style="margin:4px 4px 0 0" data-a="gfx" data-k="${k}" data-v="${x[0]}">${x[1]}</button>`).join('');let h='';
 if(v=='play')h='<div id="plist"></div>';
 if(v=='set')h=`<label>Sensitivitas Kamera</label><input type="range" min="1" max="10" value="${S.sens}" oninput="act.sens(0,this)" style="width:100%"><label>Kamera</label><button class="btn sm" data-a="cam">Ganti Kamera</button><label style="margin-top:8px">Log Chat</label><button class="btn sm" data-a="chl">${S.nochat?'Tampilkan':'Sembunyikan'}</button>`;
 if(v=='gfx')h='<label>Kualitas</label>'+op('q',[['.6','Rendah'],['1','Sedang'],['2','Tinggi']])+'<label style="margin-top:8px">Shader</label>'+op('sh',[['normal','Normal'],['bright','Cerah'],['cine','Sinematik'],['retro','Retro'],['bw','Hitam Putih']])+'<label style="margin-top:8px">Kabut</label>'+op('fog',[['1','Nyala'],['0','Mati']]);
 if(v=='rep')h=`<label>Jenis</label><select id="rp_t"><option>Pemain</option><option>Map</option><option>Bug</option></select><label>Nama pemain / map</label><input type="text" id="rp_g" maxlength="30"><label>Alasan</label><input type="text" id="rp_x" maxlength="120"><button class="btn w p" data-a="rsend"> Kirim Laporan</button>`;
 if(v=='help')h='<b>Kontrol</b><br>WASD / joystick: gerak<br>Spasi / LOMPAT: lompat<br>C: ganti kamera · Enter: chat · Esc: menu<br><br>Map: '+esc(curG?curG.name:'-');
 $('#mb').innerHTML=h;document.querySelectorAll('#pause .mt .btn').forEach(b=>b.classList.toggle('act',b.dataset.v==v));if(v=='play')plist()}
Object.assign(act,{pause(){paused=true;$('#pause').style.display='flex';mtR(mtab)},mt(v){mtR(v)},
 gfx(v,t){const g=gf();g[t.dataset.k]=v;S.gfx=g;save();gfxApply();mtR('gfx')},chl(){S.nochat=!S.nochat;save();gfxApply();mtR('set')},
 rsend(){const t=($('#rp_x').value||'').trim();if(t.length<5)return toast('Tulis alasan (min. 5 huruf)');const r=reps();r.unshift({by:me.name,type:$('#rp_t').value,tg:$('#rp_g').value.trim(),txt:t,gid:curG&&curG.id,gn:curG&&curG.name,t:Date.now()});ls.set('sp_rep',r.slice(0,100));$('#rp_x').value='';toast('Laporan terkirim ✓')}});
const _sg=startGame;startGame=function(g,t){_sg(g,t);gfxApply();mtab='play'};

if(me)enter();
;

/* ===== 08-auth-v3.js ===== */
/* ===== AUTH v3: username + email + password ===== */
(function(){
const card=$('#acard');
card.innerHTML=`<div class="logo">SANDBOX</div><p id="sub" style="margin:-4px 0 12px;font-size:13px">Masuk untuk lanjut bermain</p>
<div class="tabs"><button class="btn act" data-a="tab" data-v="login">Masuk</button><button class="btn" data-a="tab" data-v="reg">Daftar</button></div>
<div id="fu" style="display:none"><label>Username</label><input type="text" id="u" maxlength="14" autocomplete="off" autocapitalize="off" placeholder="min. 3 karakter"></div>
<label>Email</label><input type="text" id="em" inputmode="email" autocomplete="off" autocapitalize="off" placeholder="nama@email.com">
<label>Password</label><div style="display:flex;gap:8px;align-items:flex-start"><input type="password" id="pw" autocomplete="off" placeholder="min. 4 karakter"><button class="btn" style="margin:6px 0 12px;padding:9px 12px;font-size:13px" data-a="eye">Lihat</button></div>
<div class="err" id="err"></div><button class="btn w g" id="go" data-a="auth">Masuk</button><div class="afoot">Dengan masuk, kamu setuju mengikuti aturan komunitas Sandbox.<br>Akun yang melanggar aturan dapat diblokir.</div>`;
const isO=v=>{const h=sha(SALT+v.trim().toLowerCase());return h===OH||h===OU};
$('#em').addEventListener('input',e=>{e.target.type=isO(e.target.value)||e.target.value.toLowerCase().includes('owner')?'password':'text';$('#err').textContent=''});
$('#pw').addEventListener('keydown',e=>{if(e.key=='Enter')act.auth()});
mode='login';
Object.assign(act,{
 eye(){const p=$('#pw');p.type=p.type=='password'?'text':'password'},
 tab(v,t){mode=v;document.querySelectorAll('.tabs .btn').forEach(b=>b.classList.toggle('act',b===t));$('#go').textContent=v=='login'?'Masuk':'Buat Akun';$('#fu').style.display=v=='reg'?'':'none';$('#sub').textContent=v=='login'?'Masuk untuk lanjut bermain':'Buat akun baru, dapat 100 SandBux gratis!';$('#err').textContent=''},
 out(){ls.set('sp_sess','');me=null;['u','em','pw'].forEach(i=>$('#'+i).value='');$('#em').type='text';show('auth')},
 auth(){const u=$('#u').value.trim(),em=$('#em').value.trim().toLowerCase(),p=$('#pw').value,
  bad=m=>{$('#err').textContent=m;card.classList.remove('shake');void card.offsetWidth;card.classList.add('shake')},
  done=(k,o)=>{me=o;me.name=k;rapzGrant(me,k);me.notes=me.notes||[];me.games=me.games||[];me.bux=me.bux||0;ls.set('sp_sess',k);$('#pw').value='';$('#em').value='';$('#em').type='text';enter()};
  if(!em)return bad('Isi email dulu');if(!p)return bad('Isi password dulu');
  if(mode=='reg'){
   if(u.length<3)return bad('Username min. 3 karakter');if(u.length>14)return bad('Username maks. 14 karakter');
   const R=/^rapz$/i.test(u),K=R?'Rapz':u;if(/^(owner|admin|coowner|co-owner|sandbox)$/i.test(u)||users[K])return bad('Username sudah dipakai');
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em))return bad('Format email tidak valid');
   if(isO(em)||Object.values(users).some(x=>x.email===em))return bad('Email sudah terdaftar');
   if(p.length<4)return bad('Password min. 4 karakter');
   users[K]={pass:p,email:em,bux:100,daily:'',av:{skin:SKIN[0],shirt:SHIRT[0],pants:PANTS[0],hat:'none'},games:[],items:[],notes:[{t:'Selamat datang di Sandbox! Hadiah awal 100 SandBux',new:1}]};if(R){users[K].role='owner';users[K].verified=true;users[K].notes.unshift({t:'Akun Owner aktif',new:1})}users[K].name=K;save();return done(K,users[K])}
  if(isO(em)){if(p.length<6)return bad('Password min. 6 karakter');const ph=sha(SALT+'pw:'+p);if(ph!==OPH)return bad('Email atau password salah');let o=users.Owner;
   if(!o)o=users.Owner={pass:'',ph,bux:99999,daily:'',av:{skin:SKIN[0],shirt:SHIRT[1],pants:PANTS[1],hat:'crown'},games:[],items:[],notes:[{t:'Akun Owner aktif ',new:1}],role:'owner',verified:true};
   else o.ph=OPH;
   save();return done('Owner',o)}
  let k=Object.keys(users).find(x=>users[x].email===em);if(!k&&!em.includes('@'))k=Object.keys(users).find(x=>x.toLowerCase()===em);
  if(!k||k==='Owner'||users[k].pass!==p)return bad('Email atau password salah');
  done(k,users[k])}});
if(me)show('app');
})();
;

/* ===== 09-luau-subset-interpreter-async-mendukun.js ===== */
/* ===== LUAU-SUBSET INTERPRETER (async, mendukung wait/task) ===== */
class LT{constructor(){this.h=new Map();this.mt=null}get(k){return this.h.get(k)}set(k,v){v===undefined?this.h.delete(k):this.h.set(k,v)}len(){let n=0;while(this.h.has(n+1))n++;return n}}
class LV{constructor(x,y,z){this.x=x;this.y=y;this.z=z}$g(k){switch(k){case'X':case'x':return this.x;case'Y':case'y':return this.y;case'Z':case'z':return this.z;case'Magnitude':return Math.hypot(this.x,this.y,this.z);case'Unit':{const m=Math.hypot(this.x,this.y,this.z)||1;return new LV(this.x/m,this.y/m,this.z/m)}}}$str(){return this.x+', '+this.y+', '+this.z}}
let OUT=()=>{};const rerr=e=>{if(!e||!e.kill)OUT('err',e&&e.message||String(e))};
const truthy=v=>v!==undefined&&v!==null&&v!==false;
const tyn=v=>v==null?'nil':typeof v=='boolean'?'boolean':typeof v=='number'?'number':typeof v=='string'?'string':v instanceof LT?'table':typeof v=='function'?'function':'userdata';
const tn=v=>typeof v=='number'?v:typeof v=='string'&&v.trim()!==''&&!isNaN(+v)?+v:null;
function tostr(v){if(v==null)return'nil';if(typeof v=='number')return Number.isInteger(v)?String(v):isFinite(v)?String(+v.toPrecision(14)):isNaN(v)?'nan':v>0?'inf':'-inf';if(typeof v=='string')return v;if(typeof v=='boolean')return String(v);if(v instanceof LT)return'table';if(typeof v=='function')return'function';return v.$str?v.$str():'Instance'}
function arith(op,a,b){if(a instanceof LV||b instanceof LV){const A=a instanceof LV?a:new LV(a,a,a),B=b instanceof LV?b:new LV(b,b,b),f={'+':(p,q)=>p+q,'-':(p,q)=>p-q,'*':(p,q)=>p*q,'/':(p,q)=>p/q}[op];if(!f)throw new Error('operasi vektor tidak valid');return new LV(f(A.x,B.x),f(A.y,B.y),f(A.z,B.z))}
 const x=tn(a),y=tn(b);if(x===null||y===null)throw new Error('mencoba operasi aritmatika "'+op+'" pada '+tyn(a)+' dan '+tyn(b));
 switch(op){case'+':return x+y;case'-':return x-y;case'*':return x*y;case'/':return x/y;case'//':return Math.floor(x/y);case'%':return x-Math.floor(x/y)*y;case'^':return Math.pow(x,y)}}
const cat=(a,b)=>{if((typeof a=='string'||typeof a=='number')&&(typeof b=='string'||typeof b=='number'))return tostr(a)+tostr(b);throw new Error('mencoba menyambung (..) '+tyn(a)+' dan '+tyn(b))};
const eq=(a,b)=>a===b||(a==null&&b==null)||(a instanceof LV&&b instanceof LV&&a.x===b.x&&a.y===b.y&&a.z===b.z);
const lt=(a,b)=>{if(typeof a=='number'&&typeof b=='number'||typeof a=='string'&&typeof b=='string')return a<b;throw new Error('mencoba membandingkan '+tyn(a)+' dengan '+tyn(b))};
function lex(s){const t=[];let i=0,L=1;const E=m=>{throw new Error('baris '+L+': '+m)},KW=new Set('and break do else elseif end false for function if in local nil not or repeat return then true until while continue'.split(' '));
 const OP=['...','..=','==','~=','<=','>=','..','//','+=','-=','*=','/=','%=','^=','+','-','*','/','%','^','#','<','>','=','(',')','{','}','[',']',';',':',',','.'];
 while(i<s.length){const c=s[i];
  if(c=='\n'){L++;i++;continue}if(/\s/.test(c)){i++;continue}
  if(c=='-'&&s[i+1]=='-'){i+=2;const m=/^\[(=*)\[/.exec(s.slice(i));if(m){const e=s.indexOf(']'+m[1]+']',i);if(e<0)E('komentar tidak ditutup');L+=(s.slice(i,e).match(/\n/g)||[]).length;i=e+m[1].length+2}else while(i<s.length&&s[i]!='\n')i++;continue}
  if(/[A-Za-z_]/.test(c)){let j=i;while(j<s.length&&/\w/.test(s[j]))j++;const w=s.slice(i,j);t.push({k:KW.has(w)?w:'name',v:w,l:L});i=j;continue}
  if(/\d/.test(c)||(c=='.'&&/\d/.test(s[i+1]))){const m=/^(0[xX][0-9a-fA-F]+|\d*\.?\d+(?:[eE][+-]?\d+)?)/.exec(s.slice(i));t.push({k:'num',v:Number(m[0]),l:L});i+=m[0].length;continue}
  if(c=='"'||c=="'"){let j=i+1,r='';while(j<s.length&&s[j]!=c){if(s[j]=='\\'){j++;const n=s[j];r+=n=='n'?'\n':n=='t'?'\t':n=='r'?'\r':n=='0'?'\0':n}else{if(s[j]=='\n')E('string tidak ditutup');r+=s[j]}j++}if(j>=s.length)E('string tidak ditutup');t.push({k:'str',v:r,l:L});i=j+1;continue}
  const ms=c=='['?/^\[(=*)\[/.exec(s.slice(i)):null;if(ms){const e=s.indexOf(']'+ms[1]+']',i);if(e<0)E('string tidak ditutup');let v=s.slice(i+ms[0].length,e);if(v[0]=='\n')v=v.slice(1);t.push({k:'str',v,l:L});L+=(s.slice(i,e).match(/\n/g)||[]).length;i=e+ms[1].length+2;continue}
  const op=OP.find(o=>s.startsWith(o,i));if(!op)E('karakter tidak dikenal "'+c+'"');t.push({k:op,v:op,l:L});i+=op.length}
 t.push({k:'eof',l:L});return t}
const BP={'or':[1,1],'and':[2,2],'<':[3,3],'>':[3,3],'<=':[3,3],'>=':[3,3],'~=':[3,3],'==':[3,3],'..':[5,4],'+':[6,6],'-':[6,6],'*':[7,7],'/':[7,7],'//':[7,7],'%':[7,7],'^':[10,9]};
function parse(src){const T=lex(src);let p=0;const END=['end','else','elseif','until','eof'],ck=k=>T[p].k==k,ac=k=>T[p].k==k?(p++,true):false,nx=()=>T[p++],
 ex=k=>{if(T[p].k!=k)throw new Error('baris '+T[p].l+': diharapkan "'+k+'" dekat "'+(T[p].v??T[p].k)+'"');return T[p++]},nm=()=>ex('name').v,exl=()=>{const a=[expr()];while(ac(','))a.push(expr());return a};
 function block(){const b=[];while(!END.includes(T[p].k)){const s=stat();if(s){b.push(s);if(s.t=='ret'||s.t=='brk'||s.t=='cont')break}}return b}
 function stat(){const l=T[p].l,n=st0();if(n)n.l=l;return n}
 function st0(){const k=T[p].k;
  if(k==';'){p++;return null}
  if(k=='if'){p++;const cs=[];let c=expr();ex('then');cs.push([c,block()]);let el=null;while(ac('elseif')){c=expr();ex('then');cs.push([c,block()])}if(ac('else'))el=block();ex('end');return{t:'if',cs,el}}
  if(k=='while'){p++;const c=expr();ex('do');const b=block();ex('end');return{t:'wh',c,b}}
  if(k=='do'){p++;const b=block();ex('end');return{t:'do',b}}
  if(k=='for'){p++;const n=nm();if(ac('=')){const a=expr();ex(',');const b=expr(),c=ac(',')?expr():null;ex('do');const body=block();ex('end');return{t:'fnum',n,a,b,c,body}}const ns=[n];while(ac(','))ns.push(nm());ex('in');const es=exl();ex('do');const body=block();ex('end');return{t:'fin',ns,es,body}}
  if(k=='repeat'){p++;const b=block();ex('until');return{t:'rep',b,c:expr()}}
  if(k=='function'){p++;const path=[nm()];let meth=null;while(ac('.'))path.push(nm());if(ac(':'))meth=nm();return{t:'fdef',path,meth,f:fb(!!meth)}}
  if(k=='local'){p++;if(ac('function')){const n=nm();return{t:'lfn',n,f:fb(false)}}const ns=[nm()];while(ac(','))ns.push(nm());const es=ac('=')?exl():[];return{t:'loc',ns,es}}
  if(k=='return'){p++;const es=END.includes(T[p].k)||ck(';')?[]:exl();ac(';');return{t:'ret',es}}
  if(k=='break'){p++;return{t:'brk'}}if(k=='continue'){p++;return{t:'cont'}}
  const e=suf(),k2=T[p].k;
  if(['+=','-=','*=','/=','%=','^=','..='].includes(k2)){p++;return{t:'cas',op:k2.slice(0,-1),tg:e,v:expr()}}
  if(k2=='='||k2==','){const tg=[e];while(ac(','))tg.push(suf());ex('=');return{t:'asg',tg,es:exl()}}
  if(e.t!='call'&&e.t!='mcall')throw new Error('baris '+T[p].l+': sintaks tidak valid dekat "'+(T[p].v??T[p].k)+'"');return{t:'ex',e}}
 function fb(self){ex('(');const ps=self?['self']:[];let va=false;while(!ck(')')){if(ac('...')){va=true;break}ps.push(nm());if(!ac(','))break}ex(')');const body=block();ex('end');return{ps,va,body}}
 function prim(){const t=T[p];if(t.k=='name'){p++;return{t:'var',n:t.v}}if(t.k=='('){p++;const e=expr();ex(')');return{t:'par',e}}throw new Error('baris '+t.l+': token tidak terduga "'+(t.v??t.k)+'"')}
 function suf(){let e=prim();for(;;){const k=T[p].k,l=T[p].l;
  if(k=='.'){p++;e={t:'idx',o:e,k:{t:'str',v:nm()}}}
  else if(k=='['){p++;const i=expr();ex(']');e={t:'idx',o:e,k:i}}
  else if(k==':'){p++;const n=nm();e={t:'mcall',o:e,n,a:args(),l}}
  else if(k=='('||k=='str'||k=='{')e={t:'call',f:e,a:args(),l};else return e}}
 function args(){if(ac('(')){const a=ck(')')?[]:exl();ex(')');return a}if(ck('str'))return[{t:'str',v:nx().v}];return[tb()]}
 function tb(){ex('{');const f=[];while(!ck('}')){if(ck('[')){p++;const k=expr();ex(']');ex('=');f.push({k,v:expr()})}else if(ck('name')&&T[p+1].k=='='){const k={t:'str',v:nm()};p++;f.push({k,v:expr()})}else f.push({v:expr()});if(!ac(',')&&!ac(';'))break}ex('}');return{t:'tbl',f}}
 function simple(){const t=T[p];switch(t.k){case'num':case'str':p++;return{t:t.k,v:t.v};case'nil':p++;return{t:'nil'};case'true':p++;return{t:'true'};case'false':p++;return{t:'false'};case'...':p++;return{t:'va'};case'function':p++;return{t:'fn',f:fb(false)};case'{':return tb();case'if':{p++;const c=expr();ex('then');const a=expr();ex('else');return{t:'ife',c,a,b:expr()}}}return suf()}
 function expr(lim=0){let l;const k=T[p].k;if(k=='not'||k=='-'||k=='#'){p++;l={t:'un',op:k,e:expr(8)}}else l=simple();
  for(;;){const o=T[p].k,b=BP[o];if(!b||b[0]<=lim)break;p++;l={t:'bin',op:o,a:l,b:expr(b[1])}}return l}
 const body=block();ex('eof');return body}
function idx(o,k){if(o instanceof LT){let v=o.h.get(k);if(v===undefined&&o.mt){const m=o.mt.get('__index');if(m instanceof LT)return idx(m,k)}return v}
 if(typeof o=='string')return STR.get(k);if(o&&o.$g)return o.$g(k);throw new Error('mencoba mengindeks '+tyn(o)+' dengan "'+tostr(k)+'"')}
function setidx(o,k,v){if(o instanceof LT)return o.set(k,v);if(o&&o.$s)return o.$s(k,v);throw new Error('mencoba mengubah properti "'+tostr(k)+'" pada '+tyn(o))}
async function call(f,a){if(typeof f=='function'){const r=await f(...a);return r==null?[]:Array.isArray(r)?r:[r]}if(f instanceof LT&&f.mt&&f.mt.get('__call'))return call(f.mt.get('__call'),[f,...a]);throw new Error('mencoba memanggil nilai '+tyn(f))}
let OPS=0;
async function xb(b,s){for(const st of b){if(++OPS%2500==0)await new Promise(r=>setTimeout(r,0));if(s.$rt&&!s.$rt.alive)throw Object.assign(new Error('dihentikan'),{kill:1});
 try{const r=await xs(st,s);if(r)return r}catch(e){if(e&&!e.ln&&!e.kill){e.ln=st.l;e.message='baris '+st.l+': '+e.message}throw e}}}
function setv(s,n,v){for(let c=s;c;c=Object.getPrototypeOf(c))if(Object.hasOwn(c,n)){c[n]=v;return}G.set(n,v)}
async function asg(tg,v,s){if(tg.t=='var')setv(s,tg.n,v);else if(tg.t=='idx')setidx(await ev(tg.o,s),await ev(tg.k,s),v);else throw new Error('target tidak valid')}
function mkf(f,s){return async(...a)=>{const e=Object.create(s);f.ps.forEach((p,i)=>e[p]=a[i]);if(f.va)e['...']=a.slice(f.ps.length);const r=await xb(f.body,e);return r&&r.ret?r.ret:[]}}
async function evl(es,s){const r=[];for(let i=0;i<es.length;i++){const e=es[i],last=i==es.length-1;if(last&&(e.t=='call'||e.t=='mcall'))r.push(...await evm(e,s));else if(last&&e.t=='va')r.push(...(s['...']||[]));else r.push(await ev(e,s))}return r}
async function evm(n,s){if(n.t=='call'){const f=await ev(n.f,s);if(f==null)throw new Error('mencoba memanggil nilai nil'+(n.f.t=='var'?' ("'+n.f.n+'")':n.f.t=='idx'&&n.f.k.t=='str'?' ("'+n.f.k.v+'")':''));return call(f,await evl(n.a,s))}
 const o=await ev(n.o,s),f=idx(o,n.n);if(f==null)throw new Error('"'+n.n+'" bukan method/properti dari '+tyn(o));return call(f,[o,...await evl(n.a,s)])}
async function ev(n,s){switch(n.t){
 case'num':case'str':return n.v;case'nil':return;case'true':return true;case'false':return false;case'va':return(s['...']||[])[0];
 case'var':return n.n in s?s[n.n]:G.get(n.n);case'par':return ev(n.e,s);
 case'idx':return idx(await ev(n.o,s),await ev(n.k,s));
 case'call':case'mcall':return(await evm(n,s))[0];case'fn':return mkf(n.f,s);
 case'ife':return truthy(await ev(n.c,s))?ev(n.a,s):ev(n.b,s);
 case'tbl':{const t=new LT();let i=1;for(let j=0;j<n.f.length;j++){const f=n.f[j];if(f.k)t.set(await ev(f.k,s),await ev(f.v,s));else if(j==n.f.length-1&&(f.v.t=='call'||f.v.t=='mcall'||f.v.t=='va')){(f.v.t=='va'?(s['...']||[]):await evm(f.v,s)).forEach(x=>t.set(i++,x))}else t.set(i++,await ev(f.v,s))}return t}
 case'un':{const v=await ev(n.e,s);if(n.op=='not')return!truthy(v);if(n.op=='-'){if(v instanceof LV)return new LV(-v.x,-v.y,-v.z);const x=tn(v);if(x===null)throw new Error('mencoba negasi pada '+tyn(v));return-x}if(typeof v=='string')return v.length;if(v instanceof LT)return v.len();throw new Error('mencoba mengukur '+tyn(v))}
 case'bin':{if(n.op=='and'){const a=await ev(n.a,s);return truthy(a)?ev(n.b,s):a}if(n.op=='or'){const a=await ev(n.a,s);return truthy(a)?a:ev(n.b,s)}
  const a=await ev(n.a,s),b=await ev(n.b,s);switch(n.op){case'==':return eq(a,b);case'~=':return!eq(a,b);case'<':return lt(a,b);case'>':return lt(b,a);case'<=':return!lt(b,a);case'>=':return!lt(a,b);case'..':return cat(a,b);default:return arith(n.op,a,b)}}}
 throw new Error('node tidak dikenal '+n.t)}
async function xs(n,s){switch(n.t){
 case'ex':await evm(n.e,s);return;
 case'loc':{const v=await evl(n.es,s);n.ns.forEach((x,i)=>s[x]=v[i]);return}
 case'lfn':s[n.n]=undefined;s[n.n]=mkf(n.f,s);return;
 case'asg':{const v=await evl(n.es,s);for(let i=0;i<n.tg.length;i++)await asg(n.tg[i],v[i],s);return}
 case'cas':{const c=await ev(n.tg,s),v=await ev(n.v,s);await asg(n.tg,n.op=='..'?cat(c,v):arith(n.op,c,v),s);return}
 case'fdef':{let t={t:'var',n:n.path[0]};for(let i=1;i<n.path.length;i++)t={t:'idx',o:t,k:{t:'str',v:n.path[i]}};if(n.meth)t={t:'idx',o:t,k:{t:'str',v:n.meth}};await asg(t,mkf(n.f,s),s);return}
 case'if':{for(const[c,b]of n.cs)if(truthy(await ev(c,s)))return xb(b,Object.create(s));if(n.el)return xb(n.el,Object.create(s));return}
 case'do':return xb(n.b,Object.create(s));
 case'wh':while(truthy(await ev(n.c,s))){const r=await xb(n.b,Object.create(s));if(r){if(r.brk)break;if(r.cont)continue;return r}}return;
 case'rep':for(;;){const e=Object.create(s),r=await xb(n.b,e);if(r){if(r.brk)break;if(!r.cont)return r}if(truthy(await ev(n.c,e)))break}return;
 case'fnum':{const a=tn(await ev(n.a,s)),b=tn(await ev(n.b,s)),c=n.c?tn(await ev(n.c,s)):1;if(a===null||b===null||!c)throw new Error("'for' butuh angka");
  for(let i=a;c>0?i<=b:i>=b;i+=c){const e=Object.create(s);e[n.n]=i;const r=await xb(n.body,e);if(r){if(r.brk)break;if(r.cont)continue;return r}}return}
 case'fin':{let[f,st,ctl]=await evl(n.es,s);if(f instanceof LT)[f,st]=G.get('pairs')(f);
  for(;;){const v=await call(f,[st,ctl]);if(v[0]===undefined)break;ctl=v[0];const e=Object.create(s);n.ns.forEach((x,i)=>e[x]=v[i]);const r=await xb(n.body,e);if(r){if(r.brk)break;if(r.cont)continue;return r}}return}
 case'ret':return{ret:await evl(n.es,s)};case'brk':return{brk:1};case'cont':return{cont:1}}
 throw new Error('statement tidak dikenal '+n.t)}
/* ---- library ---- */
const mkT=o=>{const t=new LT();for(const k in o)t.set(k,o[k]);return t},sleep=ms=>new Promise(r=>setTimeout(r,ms));
function lpat(p){let r='',i=0;const C={a:'A-Za-z',d:'0-9',s:'\\s',w:'A-Za-z0-9',l:'a-z',u:'A-Z',p:'!-\\/:-@\\[-`{-~',x:'0-9A-Fa-f'};
 while(i<p.length){const c=p[i];
  if(c=='%'){const n=p[++i],k=n.toLowerCase();r+=C[k]?(n==k?'['+C[k]+']':'[^'+C[k]+']'):'\\'+n;i++}
  else if(c=='['){let j=i+1,q='[';if(p[j]=='^'){q+='^';j++}if(p[j]==']'){q+='\\]';j++}while(j<p.length&&p[j]!=']'){if(p[j]=='%'){j++;const n=p[j],k=n.toLowerCase();q+=C[k]?(n==k?C[k]:''):'\\'+n}else q+=p[j]=='\\'?'\\\\':p[j];j++}r+=q+']';i=j+1}
  else if(c=='-'){r+='*?';i++}else if('\\|{}/'.includes(c)){r+='\\'+c;i++}else{r+=c;i++}}return r}
function fmt(f,a){let i=0;return f.replace(/%([-+ 0#]*)(\d+)?(?:\.(\d+))?([dioxXfgGeEsqc%])/g,(m,fl,w,pr,c)=>{if(c=='%')return'%';const v=a[i++];let r;switch(c){case'd':case'i':r=String(Math.trunc(tn(v)));break;case'f':r=tn(v).toFixed(pr===undefined?6:+pr);break;case'x':r=(tn(v)>>>0).toString(16);break;case'X':r=(tn(v)>>>0).toString(16).toUpperCase();break;case'g':case'G':r=String(+tn(v).toPrecision(pr?+pr:6));break;case'e':case'E':r=tn(v).toExponential(pr===undefined?6:+pr);break;case'c':r=String.fromCharCode(tn(v));break;case'q':r=JSON.stringify(String(v));break;default:r=tostr(v)}
 if(pr!==undefined&&c=='s')r=r.slice(0,+pr);if(w)r=fl.includes('-')?r.padEnd(+w):r.padStart(+w,fl.includes('0')&&c!='s'?'0':' ');return r})}
const sidx=(s,i,d)=>i===undefined?d:i<0?Math.max(0,s.length+i+1):i;
const STR=mkT({len:s=>s.length,upper:s=>s.toUpperCase(),lower:s=>s.toLowerCase(),rep:(s,n,sep)=>Array(Math.max(0,n)).fill(s).join(sep||''),reverse:s=>[...s].reverse().join(''),
 sub:(s,i,j)=>{i=sidx(s,i,1);j=j===undefined?s.length:j<0?s.length+j+1:j;return s.slice(Math.max(0,i-1),Math.max(0,j))},format:(f,...a)=>fmt(f,a),byte:(s,i)=>s.charCodeAt((i||1)-1),char:(...a)=>String.fromCharCode(...a),
 find:(s,p,i,pl)=>{i=sidx(s,i,1);if(pl===true){const k=s.indexOf(p,i-1);return k<0?undefined:[k+1,k+p.length]}const m=new RegExp(lpat(p)).exec(s.slice(i-1));return m?[m.index+i,m.index+i-1+m[0].length,...m.slice(1)]:undefined},
 match:(s,p,i)=>{const m=new RegExp(lpat(p)).exec(s.slice(sidx(s,i,1)-1));return m?(m.length>1?m.slice(1):m[0]):undefined},
 gmatch:(s,p)=>{const ms=[...s.matchAll(new RegExp(lpat(p),'g'))];let j=0;return()=>{const m=ms[j++];return m?(m.length>1?m.slice(1):m[0]):undefined}},
 gsub:async(s,p,r,n)=>{const ms=[...s.matchAll(new RegExp(lpat(p),'g'))].slice(0,n||1e9);let o='',last=0;for(const m of ms){o+=s.slice(last,m.index);let v;if(typeof r=='string')v=r.replace(/%(\d)/g,(_,d)=>d=='0'?m[0]:m[+d]);else if(r instanceof LT)v=r.get(m[1]??m[0]);else v=(await call(r,m.length>1?m.slice(1):[m[0]]))[0];o+=v===undefined||v===false?m[0]:tostr(v);last=m.index+m[0].length}return[o+s.slice(last),ms.length]}});
async function msort(a,c){if(a.length<2)return a;const m=a.length>>1,l=await msort(a.slice(0,m),c),r=await msort(a.slice(m),c),o=[];let i=0,j=0;while(i<l.length&&j<r.length){const less=c?truthy((await call(c,[r[j],l[i]]))[0]):lt(r[j],l[i]);if(less)o.push(r[j++]);else o.push(l[i++])}return o.concat(l.slice(i),r.slice(j))}
const arr=t=>{const a=[];for(let i=1;t.h.has(i);i++)a.push(t.h.get(i));return a};
const MATH=mkT({floor:Math.floor,ceil:Math.ceil,abs:Math.abs,sqrt:Math.sqrt,sin:Math.sin,cos:Math.cos,tan:Math.tan,asin:Math.asin,acos:Math.acos,atan:Math.atan,atan2:Math.atan2,exp:Math.exp,log:(x,b)=>b?Math.log(x)/Math.log(b):Math.log(x),pow:Math.pow,min:Math.min,max:Math.max,pi:Math.PI,huge:Infinity,
 random:(m,n)=>m===undefined?Math.random():n===undefined?1+Math.floor(Math.random()*m):m+Math.floor(Math.random()*(n-m+1)),randomseed:()=>{},clamp:(x,a,b)=>Math.min(b,Math.max(a,x)),round:x=>Math.round(x),sign:x=>Math.sign(x),deg:x=>x*180/Math.PI,rad:x=>x*Math.PI/180,fmod:(a,b)=>a%b,noise:()=>0});
const wait=async t=>{const a=performance.now();await sleep((+t||.03)*1000);return[(performance.now()-a)/1000]},spawn=(f,...a)=>{call(f,a).catch(rerr)};
const G=mkT({print:(...a)=>{OUT('print',a.map(tostr).join('\t'))},warn:(...a)=>{OUT('warn',a.map(tostr).join(' '))},type:tyn,tostring:tostr,
 tonumber:(v,b)=>{if(typeof v=='number')return v;if(typeof v!='string')return;const x=b?parseInt(v,b):tn(v.trim().toLowerCase().startsWith('0x')?String(parseInt(v,16)):v);return x===null||isNaN(x)?undefined:x},
 pairs:t=>{if(!(t instanceof LT))throw new Error('pairs butuh tabel');const ks=[];let n=t.len();for(let i=1;i<=n;i++)ks.push(i);for(const k of t.h.keys())if(!(Number.isInteger(k)&&k>=1&&k<=n))ks.push(k);let j=0;return[()=>{while(j<ks.length){const k=ks[j++],v=t.h.get(k);if(v!==undefined)return[k,v]}return[undefined]},t]},
 ipairs:t=>{let i=0;return[()=>{i++;const v=t.get(i);return v===undefined?[undefined]:[i,v]},t]},
 next:(t,k)=>{const ks=[...t.h.keys()],i=k===undefined?0:ks.indexOf(k)+1;return i<ks.length?[ks[i],t.h.get(ks[i])]:undefined},
 select:(n,...a)=>n=='#'?a.length:a.slice(n-1),unpack:(t,i,j)=>arr(t).slice((i||1)-1,j),
 setmetatable:(t,m)=>{t.mt=m;return t},getmetatable:t=>t.mt,rawget:(t,k)=>t.get(k),rawset:(t,k,v)=>{t.set(k,v);return t},
 pcall:async(f,...a)=>{try{return[true,...await call(f,a)]}catch(e){if(e&&e.kill)throw e;return[false,e&&e.message||String(e)]}},
 error:m=>{throw new Error(tostr(m))},assert:(v,m)=>{if(!truthy(v))throw new Error(m===undefined?'assertion failed!':tostr(m));return v},
 string:STR,math:MATH,
 table:mkT({insert:(t,a,b)=>{if(b===undefined)t.set(t.len()+1,a);else{const n=t.len();for(let i=n;i>=a;i--)t.set(i+1,t.get(i));t.set(a,b)}},remove:(t,i)=>{const n=t.len();if(!n)return;i=i===undefined?n:i;const v=t.get(i);for(let j=i;j<n;j++)t.set(j,t.get(j+1));t.set(n,undefined);return v},
  concat:(t,s,i,j)=>arr(t).slice((i||1)-1,j).map(tostr).join(s||''),unpack:(t,i,j)=>arr(t).slice((i||1)-1,j),getn:t=>t.len(),clear:t=>t.h.clear(),
  sort:async(t,c)=>{const a=await msort(arr(t),c);a.forEach((v,i)=>t.set(i+1,v))},find:(t,v)=>{const i=arr(t).indexOf(v);return i<0?undefined:i+1}}),
 os:mkT({time:()=>Math.floor(Date.now()/1000),clock:()=>performance.now()/1000,date:(f)=>new Date().toLocaleString()}),
 wait,spawn,delay:(t,f,...a)=>{sleep(t*1000).then(()=>call(f,a)).catch(rerr)},
 task:mkT({wait,spawn,defer:spawn,delay:(t,f,...a)=>{sleep(t*1000).then(()=>call(f,a)).catch(rerr)}})});

/* ===== SANDBOX STUDIO v3: Explorer service, GUI editor, Script editor, Toolbox, runtime Luau ===== */
class LC{constructor(r,g,b){this.r=r;this.g=g;this.b=b}$g(k){return{R:this.r,G:this.g,B:this.b}[k]}$str(){return this.r+', '+this.g+', '+this.b}}
class LU{constructor(p){this.p=p}$g(k){return k=='X'||k=='Y'?undefined:undefined}$str(){return'{'+this.p.join(', ')+'}'}}
const hexC=h=>new LC(parseInt(h.slice(1,3),16)/255,parseInt(h.slice(3,5),16)/255,parseInt(h.slice(5,7),16)/255),
 cHex=c=>c instanceof LC?'#'+[c.r,c.g,c.b].map(v=>Math.round(Math.max(0,Math.min(1,v))*255).toString(16).padStart(2,'0')).join(''):'#ffffff';
const GN={ScreenGui:1,Frame:1,ScrollingFrame:1,TextLabel:1,TextButton:1,TextBox:1};
const FNT={Lilita:["'Lilita One','Arial Black',sans-serif",400],Gotham:["Inter,'Segoe UI',sans-serif",600],GothamBold:["Inter,'Segoe UI',sans-serif",800],GothamBlack:["Inter,'Segoe UI',sans-serif",900],SourceSans:["'Space Grotesk',system-ui,sans-serif",500],SourceSansBold:["'Space Grotesk',system-ui,sans-serif",700],Arial:["Arial,Helvetica,sans-serif",400],ArialBold:["Arial,Helvetica,sans-serif",700],Cartoon:["Fredoka,'Comic Sans MS',sans-serif",500],Arcade:["'Press Start 2P','Courier New',monospace",400],SciFi:["Orbitron,'Trebuchet MS',sans-serif",700],Bangers:["Bangers,Impact,sans-serif",400],Creepster:["Creepster,Impact,fantasy",400],PermanentMarker:["'Permanent Marker','Comic Sans MS',cursive",400],Pacifico:["Pacifico,'Brush Script MT',cursive",400],Nunito:["Nunito,'Segoe UI',sans-serif",700],Oswald:["Oswald,Impact,sans-serif",500],Merriweather:["Merriweather,Georgia,serif",700],Antique:["Georgia,'Times New Roman',serif",400],Code:["'Roboto Mono','Courier New',monospace",500],Impact:["Impact,'Arial Black',sans-serif",400]},
 FNA={Legacy:'Lilita',GothamMedium:'Gotham',FredokaOne:'Cartoon',LuckiestGuy:'Bangers',Roboto:'Nunito',RobotoMono:'Code',SpecialElite:'Code',Highway:'Oswald',Fantasy:'Creepster',Bodoni:'Merriweather',Garamond:'Merriweather',SourceSansLight:'SourceSans',SourceSansItalic:'SourceSans',Michroma:'SciFi',Jura:'SciFi',TitilliumWeb:'Nunito',Ubuntu:'Nunito',IndieFlower:'PermanentMarker',Kalam:'PermanentMarker',PatrickHand:'PermanentMarker'},
 fnt=k=>FNT[k]||FNT.Lilita,fkey=v=>{v=String(v).replace(/^Enum\.Font\./,'');return FNT[v]?v:FNA[v]||null};
const CL={ScreenGui:'',Frame:'▭',ScrollingFrame:'',TextLabel:'',TextButton:'',TextBox:'',Script:'',LocalScript:'',ModuleScript:'',Folder:'',Team:''};
const CD={ScreenGui:'Wadah semua GUI di layar',Frame:'Kotak/panel',ScrollingFrame:'Panel yang bisa di-scroll',TextLabel:'Teks biasa',TextButton:'Tombol yang bisa diklik',TextBox:'Kolom input teks',Script:'Kode Luau (server)',LocalScript:'Kode Luau (client/GUI)',ModuleScript:'Library, dipakai lewat require()',Folder:'Pengelompok objek',Team:'Tim pemain',part:'Balok',cyl:'Tabung',ball:'Bola',coin:'Koin SandBux',lava:'Lava',spawn:'Titik spawn',finish:'Garis finish'};
const SRC={Script:'-- Script (berjalan saat game dimulai)\nprint("Halo dari Script Sandbox!")\n',LocalScript:'-- LocalScript: membuat GUI (panel) lewat script\nlocal Players = game:GetService("Players")\nlocal TweenService = game:GetService("TweenService")\nlocal player = Players.LocalPlayer\n\nlocal gui = Instance.new("ScreenGui")\ngui.Name = "PanelSaya"\ngui.Parent = player.PlayerGui\n\nlocal panel = Instance.new("Frame")\npanel.Size = UDim2.new(0, 260, 0, 190)\npanel.Position = UDim2.new(0.5, 0, 0.5, 0)\npanel.AnchorPoint = Vector2.new(0.5, 0.5)\npanel.BackgroundColor3 = Color3.fromRGB(35, 38, 50)\npanel.Parent = gui\nInstance.new("UICorner", panel).CornerRadius = UDim.new(0, 14)\nInstance.new("UIListLayout", panel).Padding = UDim.new(0, 8)\nInstance.new("UIPadding", panel)\n\nlocal title = Instance.new("TextLabel")\ntitle.Size = UDim2.new(1, 0, 0, 40)\ntitle.BackgroundTransparency = 1\ntitle.Font = Enum.Font.GothamBold\ntitle.TextColor3 = Color3.new(1, 1, 1)\ntitle.TextSize = 18\ntitle.Text = "Halo, " .. player.Name\ntitle.Parent = panel\n\nlocal info = Instance.new("TextLabel")\ninfo.Size = UDim2.new(1, 0, 0, 30)\ninfo.BackgroundTransparency = 1\ninfo.Font = Enum.Font.Gotham\ninfo.TextColor3 = Color3.fromRGB(170, 180, 200)\ninfo.TextSize = 14\ninfo.Text = "UserId: " .. player.UserId\ninfo.Parent = panel\n\nlocal btn = Instance.new("TextButton")\nbtn.Size = UDim2.new(1, 0, 0, 44)\nbtn.BackgroundColor3 = Color3.fromRGB(51, 95, 255)\nbtn.TextColor3 = Color3.new(1, 1, 1)\nbtn.Font = Enum.Font.GothamBold\nbtn.TextSize = 16\nbtn.Text = "Klik aku"\nbtn.Parent = panel\nInstance.new("UICorner", btn).CornerRadius = UDim.new(0, 10)\n\nlocal n = 0\nbtn.MouseButton1Click:Connect(function()\n\tn = n + 1\n\tbtn.Text = "Diklik " .. n .. "x"\n\tTweenService:Create(panel, TweenInfo.new(0.25), {BackgroundColor3 = Color3.fromHSV((n * 0.17) % 1, 0.5, 0.35)}):Play()\nend)\n',ModuleScript:'local M = {}\n\nfunction M.hello(name)\n\treturn "Halo " .. name\nend\n\nreturn M\n'};
const SVC=[['Workspace','',1],['Players','',0],['Lighting','',0],['ReplicatedFirst','',1],['ReplicatedStorage','',1],['ServerScriptService','',1],['ServerStorage','',1],['StarterGui','',1],['StarterPack','',1],['StarterPlayer','',0],['Teams','',1]];
const SKEYS=['Workspace','ReplicatedFirst','ReplicatedStorage','ServerScriptService','ServerStorage','StarterGui','StarterPack','StarterPlayerScripts','Teams'];
const PL={Workspace:['Folder','Script'],StarterGui:['ScreenGui','LocalScript','Folder'],ServerScriptService:['Script','ModuleScript','Folder'],ServerStorage:['Script','ModuleScript','Folder'],ReplicatedStorage:['ModuleScript','Folder'],ReplicatedFirst:['LocalScript','ModuleScript'],StarterPlayerScripts:['LocalScript','Folder'],StarterPack:['LocalScript'],Teams:['Team']};
const GUIK=['Frame','ScrollingFrame','TextLabel','TextButton','TextBox','LocalScript'];
let SI=null,guiOn=false,gdr=null,XP={Workspace:1,StarterGui:1,ServerScriptService:1};
function newI(cls){const i={id:nid(),cls,n:cls,ch:[]};
 if(GN[cls]&&cls!='ScreenGui'){const big=cls=='Frame'||cls=='ScrollingFrame';Object.assign(i,{p:[0,30,0,30],s:big?[0,240,0,150]:[0,160,0,50],bg:big?'#ffffff':cls=='TextButton'?'#7df9ff':'#ffde59',bt:big?.3:0,tc:'#000000',ts:18,txt:cls=='TextLabel'?'Label':cls=='TextButton'?'Tombol':'',vis:true,bd:true})}
 if(cls=='ScreenGui')i.vis=true;if(/Script$/.test(cls))i.src=SRC[cls];if(cls=='Team')i.tcol='#ff3b3b';return i}
function ensureSvc(d){d.svc=d.svc||{};SKEYS.forEach(k=>d.svc[k]=d.svc[k]||[])}
const fI=(id,l)=>{for(const i of l){if(i.id==id)return{i,list:l};const r=fI(id,i.ch);if(r)return r}},
 loc=id=>{if(!ST)return;if(ST.d.svc)for(const k in ST.d.svc){const r=fI(id,ST.d.svc[k]);if(r)return r}for(const o of (ST.d.objs||[])){if(o.ch&&o.ch.length){const r=fI(id,o.ch);if(r)return r}}if(ST.d.ch&&ST.d.ch.length){const r=fI(id,ST.d.ch);if(r)return r}};
const tgtList=t=>{if(t==='@acc')return ST.d.ch=ST.d.ch||[];if(ST.d.svc&&ST.d.svc[t])return ST.d.svc[t];const r=loc(t);if(r)return r.i.ch;const o=(ST.d.objs||[]).find(x=>x.id==t);if(o)return o.ch=o.ch||[];return[]};
function pickL(t){let c,k=[];if(PL[t])c=PL[t];else{const r=loc(t);if(!r)return[];const cl=r.i.cls;c=cl=='Folder'?['Folder','Script','LocalScript','ModuleScript']:GN[cl]&&cl!='TextLabel'&&cl!='TextButton'&&cl!='TextBox'?GUIK:[]}
 const o=t=='Workspace'?['part','cyl','ball','lava','spawn','finish'].map(v=>({id:v,k:'obj',n:NM[v],ic:TI[v],d:CD[v]})):[];
 return o.concat(c.map(v=>({id:v,k:'inst',n:v,ic:CL[v],d:CD[v]})))}

/* ---- GUI DOM (dipakai editor & runtime) ---- */
function gSty(i,e){const s=e.style,sg=i.cls=='ScreenGui',tx=i.cls=='TextLabel'||i.cls=='TextButton'||i.cls=='TextBox';
 s.position='absolute';s.boxSizing='border-box';s.margin='0';s.display=i.vis===false?'none':tx?'flex':'block';s.alignItems='center';s.justifyContent=i.ta=='l'?'flex-start':i.ta=='r'?'flex-end':'center';
 if(sg){s.left=s.top='0';s.width=s.height='100%';s.background='transparent';s.border='0';return}
 s.left=`calc(${i.p[0]*100}% + ${i.p[1]}px)`;s.top=`calc(${i.p[2]*100}% + ${i.p[3]}px)`;s.width=`calc(${i.s[0]*100}% + ${i.s[1]}px)`;s.height=`calc(${i.s[2]*100}% + ${i.s[3]}px)`;
 s.background=i.bg+Math.round((1-(i.bt||0))*255).toString(16).padStart(2,'0');s.color=i.tc;s.fontSize=i.ts+'px';s.border=i.bd===false?'0':'3px solid '+(/^#[0-9a-f]{6}$/i.test(i.bc)?i.bc:'#000');s.borderRadius='8px';{const f=fnt(i.f);s.fontFamily=f[0];s.fontWeight=f[1]}s.padding='0 4px';s.overflow=i.cls=='ScrollingFrame'?'auto':i.cl===false?'visible':'hidden';s.textAlign=i.ta=='l'?'left':i.ta=='r'?'right':'center';
 s.zIndex=i.z?String(i.z):'';const ap=i.ap||[0,0];s.transform=(ap[0]||ap[1]||i.rn)?`translate(${-ap[0]*100}%,${-ap[1]*100}%) rotate(${+i.rn||0}deg)`:'';if(e.tagName=='INPUT')e.placeholder=i.ph||''}
function gDom(i,hook,par){const e=document.createElement(i.cls=='TextButton'?'button':i.cls=='TextBox'?'input':'div');e.dataset.gid=i.id;if(i.cls=='ScrollingFrame')e.className='gsc';gSty(i,e);
 if(i.cls=='TextBox')e.value=i.txt||'';else if(i.cls=='TextLabel'||i.cls=='TextButton')e.textContent=i.txt;
 if(hook)hook(i,e,par);(i.ch||[]).forEach(c=>{if(GN[c.cls])e.appendChild(gDom(c,hook,i))});return e}

/* ---- runtime Luau API ---- */
let RT=null;
class Sig{constructor(){this.h=[]}fire(...a){this.h.slice().forEach(f=>call(f,a).catch(rerr))}
 $g(k){if(k=='Connect'||k=='connect')return(s,f)=>{this.h.push(f);const c=new LT();c.set('Disconnect',()=>{this.h=this.h.filter(x=>x!==f)});return c};
  if(k=='Wait')return()=>new Promise(r=>{const f=(...a)=>{this.h=this.h.filter(x=>x!==f);r(a)};this.h.push(f)})}}
const tbl2=l=>{const t=new LT();l.forEach((x,j)=>t.set(j+1,x));return t};
class FW{constructor(n,kf,x){this.n=n;this.kf=kf;this.x=x||{}}
 $g(k){if(k=='Name')return this.n;if(k=='ClassName')return'Folder';if(k=='FindFirstChild'||k=='WaitForChild')return(s,n)=>this.kf().find(c=>c.n==n);if(k=='GetChildren')return()=>tbl2(this.kf());if(k in this.x)return this.x[k];return this.kf().find(c=>c.n==k)}
 $s(k,v){this.x[k]=v}}
class GW{constructor(i,e,par){this.i=i;this.e=e;this.par=par;this.sg={}}get n(){return this.i.n}
 sig(k){return this.sg[k]||(this.sg[k]=new Sig())}kids(){return this.i.ch.map(c=>RT.gw.get(c.id)).filter(Boolean)}
 det(){const p=this.par;if(p instanceof GW){const a=p.i.ch,k=a.indexOf(this.i);if(k>=0)a.splice(k,1)}if(RT)RT.pgk=RT.pgk.filter(x=>x!==this)}
 $g(k){const i=this.i;switch(k){case'Font':return i.f||'Lilita';case'TextXAlignment':return i.ta=='l'?'Left':i.ta=='r'?'Right':'Center';case'BorderSizePixel':return i.bd===false?0:1;case'BorderColor3':return hexC(i.bc||'#000000');case'ZIndex':return i.z||1;case'AnchorPoint':return new LV((i.ap||[0,0])[0],(i.ap||[0,0])[1],0);case'ClipsDescendants':return i.cl!==false;case'PlaceholderText':return i.ph||'';case'Rotation':return +i.rn||0;case'AbsoluteSize':{const r=this.e.getBoundingClientRect();return new LV(r.width,r.height,0)}case'AbsolutePosition':{const r=this.e.getBoundingClientRect();return new LV(r.left,r.top,0)}case'Name':return i.n;case'ClassName':return i.cls;case'Text':return i.cls=='TextBox'?this.e.value:i.txt;case'Visible':case'Enabled':return i.vis!==false;
  case'BackgroundColor3':return hexC(i.bg||'#ffffff');case'TextColor3':return hexC(i.tc||'#000000');case'TextSize':return i.ts;case'BackgroundTransparency':return i.bt||0;case'Position':return new LU(i.p||[0,0,0,0]);case'Size':return new LU(i.s||[0,0,0,0]);case'Parent':return this.par;
  case'MouseButton1Click':case'Activated':return this.sig('click');case'FocusLost':return this.sig('focus');
  case'FindFirstChild':case'WaitForChild':return(s,n)=>this.kids().find(x=>x.i.n==n);case'GetChildren':return()=>tbl2(this.kids());case'Destroy':return()=>{this.det();this.e.remove();if(RT)RT.gw.delete(i.id)}}
  return this.kids().find(x=>x.i.n==k)}
 $s(k,v){const i=this.i;switch(k){case'Font':{const f=fkey(v);if(f)i.f=f;break}case'TextXAlignment':{const a=String(v).replace(/^Enum\.TextXAlignment\./,'');i.ta=a=='Left'?'l':a=='Right'?'r':'c';break}case'BorderSizePixel':i.bd=+v>0;break;case'BorderColor3':i.bc=cHex(v);break;case'ZIndex':i.z=Math.max(0,Math.min(999,+v||0));break;case'AnchorPoint':if(v instanceof LV)i.ap=[v.x,v.y];break;case'ClipsDescendants':i.cl=truthy(v);break;case'PlaceholderText':i.ph=tostr(v);break;case'Rotation':i.rn=+v||0;break;case'Name':i.n=tostr(v);break;case'Text':i.txt=tostr(v);if(this.e.tagName=='INPUT')this.e.value=i.txt;else this.e.textContent=i.txt;break;case'Visible':case'Enabled':i.vis=truthy(v);break;case'BackgroundColor3':i.bg=cHex(v);break;case'TextColor3':i.tc=cHex(v);break;case'TextSize':i.ts=+v;break;case'BackgroundTransparency':i.bt=+v;break;
  case'Position':i.p=v.p.slice();break;case'Size':i.s=v.p.slice();break;
  case'Parent':this.det();if(v instanceof GW){v.e.appendChild(this.e);v.i.ch.push(i);this.par=v}else if(v===RT.pg||(v instanceof FW&&/^(StarterGui|PlayerGui|CoreGui)$/.test(v.n))){RT.gui.appendChild(this.e);RT.pgk.push(this);this.par=RT.pg}else if(v==null){this.e.remove();this.par=null}return;default:return}
  gSty(i,this.e)}}
class PtW{constructor(o,m){this.o=o;this.m=m;this.t=new Sig();this.nm=o.n;this.in=false}get n(){return this.nm}
 $g(k){const m=this.m;switch(k){case'Name':return this.nm;case'ClassName':return'Part';case'Position':return new LV(m.position.x,m.position.y,m.position.z);case'Size':return new LV(m.scale.x,m.scale.y,m.scale.z);case'Color':return hexC(this.col||this.o.c||'#ffffff');case'Transparency':return m.material&&m.material.transparent?1-m.material.opacity:0;case'Touched':return this.t;case'Anchored':return true;case'CanCollide':return this.o.cc!==false;case'Parent':return RT.ws;case'Destroy':return()=>{if(m.parent)m.parent.remove(m)};case'FindFirstChild':return()=>undefined}}
 $s(k,v){const m=this.m;switch(k){case'Name':this.nm=tostr(v);break;case'Position':m.position.set(v.x,v.y,v.z);break;case'Size':m.scale.set(v.x,v.y,v.z);break;case'Color':this.col=cHex(v);m.material.color.set(this.col);break;case'Transparency':m.material.transparent=true;m.material.opacity=1-v;break;case'Parent':if(v===RT.ws){scene.add(m);if(!RT.parts.includes(this))RT.parts.push(this)}else if(v==null&&m.parent)m.parent.remove(m)}}}
class RootW{get n(){return'HumanoidRootPart'}$g(k){switch(k){case'Name':return this.n;case'Position':return new LV(P.x,P.y+1.5,P.z);case'Parent':return RT.ch;case'ClassName':return'Part'}}$s(k,v){if(k=='Position'&&v instanceof LV){P.x=v.x;P.y=v.y-1.5;P.z=v.z;P.vy=0}}}
class HumW{get n(){return'Humanoid'}$g(k){switch(k){case'Name':return this.n;case'Health':return RT.hp;case'MaxHealth':return 100;case'Parent':return RT.ch;case'ClassName':return'Humanoid'}}$s(k,v){if(k=='Health'){RT.hp=+v;if(RT.hp<=0){RT.hp=100;act.respawn()}}}}
class SW{constructor(i,par){this.i=i;this.par=par}get n(){return this.i.n}$g(k){return k=='Name'?this.i.n:k=='ClassName'?this.i.cls:k=='Parent'?this.par:undefined}}
function mkGw(i,e,par){const gw=new GW(i,e,par?RT.gw.get(par.id):RT.pg);RT.gw.set(i.id,gw);e.addEventListener('click',()=>gw.sig('click').fire());if(i.cls=='TextBox')e.addEventListener('blur',()=>gw.sig('focus').fire(true));return gw}
function iW(i){if(RT.iw.has(i.id))return RT.iw.get(i.id);const w=i.cls=='Folder'?new FW(i.n,()=>i.ch.map(iW)):new SW(i,null);RT.iw.set(i.id,w);return w}
async function runSrc(i,par){const s=Object.create(null);s.$rt=RT;s.script=new SW(i,par);return xb(parse(i.src||''),s)}
async function runScript(i,par){try{await runSrc(i,par)}catch(e){if(!e.kill)OUT('err',i.n+' → '+(e.message||e))}}
const MODS=new Map();
G.set('require',async m=>{if(!(m instanceof SW))throw new Error('require butuh ModuleScript');if(MODS.has(m.i)&&MODS.get(m.i).rt===RT)return MODS.get(m.i).v;const r=await runSrc(m.i,m.par);const v=r&&r.ret?r.ret[0]:undefined;MODS.set(m.i,{rt:RT,v});return v});
G.set('Vector3',mkT({new:(x,y,z)=>new LV(+x||0,+y||0,+z||0),zero:new LV(0,0,0),one:new LV(1,1,1)}));
G.set('Color3',mkT({fromRGB:(r,g,b)=>new LC(r/255,g/255,b/255),new:(r,g,b)=>new LC(r||0,g||0,b||0),fromHex:h=>hexC(h)}));
G.set('Vector2',mkT({new:(x,y)=>new LV(+x||0,+y||0,0),zero:new LV(0,0,0),one:new LV(1,1,0)}));
{const fm={};Object.keys(FNT).concat(Object.keys(FNA)).forEach(k=>fm[k]=k);G.set('Enum',mkT({Font:mkT(fm),TextXAlignment:mkT({Left:'Left',Center:'Center',Right:'Right'})}));
 G.get('Color3').set('fromHSV',(h,sa,v)=>{h=((+h||0)%1+1)%1*6;const c=(+v||0)*(+sa||0),x=c*(1-Math.abs(h%2-1)),m=(+v||0)-c,k=Math.floor(h),r=[[c,x,0],[x,c,0],[0,c,x],[0,x,c],[x,0,c],[c,0,x]][k%6];return new LC(r[0]+m,r[1]+m,r[2]+m)})}
G.set('UDim2',mkT({new:(a,b,c,d)=>new LU([a||0,b||0,c||0,d||0]),fromScale:(a,b)=>new LU([a||0,0,b||0,0]),fromOffset:(a,b)=>new LU([0,a||0,0,b||0])}));
G.set('typeof',v=>v instanceof LV?'Vector3':v instanceof LC?'Color3':v instanceof LU?'UDim2':v instanceof Sig?'RBXScriptSignal':v&&v.$g&&!(v instanceof LT)?'Instance':tyn(v));
G.set('Instance',mkT({new:(cls,par)=>{let w;if(GN[cls]){const i=newI(cls);if(i.cls!='ScreenGui'){i.p=[0,0,0,0];if(!/^Image/.test(i.cls)){i.s=[0,100,0,100];i.bg='#ffffff';i.bt=0;i.ts=14;i.txt=i.cls=='TextLabel'?'Label':i.cls=='TextButton'?'Button':''}}w=mkGw(i,gDom(i,mkGw,null),null)}
 else if(cls=='Part'){const o=O('part',0,5,0,4,1,4,'#ffffff');o.n='Part';w=new PtW(o,mkObj(o))}else if(cls=='Folder')w=new FW('Folder',()=>[]);else throw new Error('Instance.new("'+cls+'") belum didukung');
 if(par!==undefined)w.$s('Parent',par);return w}}));
function rtStop(){if(RT){RT.alive=false;if(RT.gui)RT.gui.remove();RT=null}}
function rtStart(g){rtStop();if(!g.svc)return;const sv=g.svc;
 RT={alive:true,gw:new Map(),iw:new Map(),lt:performance.now(),hp:100,hb:new Sig(),pa:new Sig(),svc:{},pgk:[]};const rt=RT;
 const gui=document.createElement('div');gui.id='guir';$('#game').appendChild(gui);RT.gui=gui;RT.pg=new FW('PlayerGui',()=>RT.pgk);
 RT.parts=scene.children.filter(m=>m.userData&&m.userData.o&&m.userData.o.t!='coin').map(m=>new PtW(m.userData.o,m));
 RT.ws=new FW('Workspace',()=>RT.parts.concat((sv.Workspace||[]).map(iW)));RT.root=new RootW();RT.hum=new HumW();RT.ch=new FW(me.name,()=>[RT.root,RT.hum],{HumanoidRootPart:RT.root,Humanoid:RT.hum,Parent:RT.ws});
 RT.pl=new FW(me.name,()=>[RT.pg],{Name:me.name,Character:RT.ch,PlayerGui:RT.pg,UserId:+me.uid||1,DisplayName:me.name,AccountAge:30,CharacterAdded:new Sig()});
 const st=k=>new FW(k,()=>(sv[k]||[]).map(iW));
 RT.svc={Workspace:RT.ws,Players:new FW('Players',()=>[RT.pl],{LocalPlayer:RT.pl,PlayerAdded:RT.pa,GetPlayers:()=>tbl2([RT.pl]),GetPlayerByUserId:(s,id)=>+id===(+me.uid||1)?RT.pl:undefined,GetPlayerFromCharacter:()=>RT.pl,
   GetNameFromUserIdAsync:(s,id)=>Object.keys(users).find(n=>users[n]&&+users[n].uid===+id),GetUserIdFromNameAsync:(s,nm)=>{const k=Object.keys(users).find(n=>n.toLowerCase()===String(nm).toLowerCase());return k?+users[k].uid:undefined}}),
  RunService:new FW('RunService',()=>[],{Heartbeat:RT.hb,RenderStepped:RT.hb,Stepped:RT.hb,IsClient:()=>true,IsServer:()=>false}),
  Lighting:new FW('Lighting',()=>[],{Brightness:1,ClockTime:12}),ReplicatedStorage:st('ReplicatedStorage'),ReplicatedFirst:st('ReplicatedFirst'),ServerStorage:st('ServerStorage'),ServerScriptService:st('ServerScriptService'),StarterGui:st('StarterGui'),Teams:new FW('Teams',()=>(sv.Teams||[]).map(iW)),CoreGui:new FW('CoreGui',()=>RT.pgk),TweenService:window.mkTweenSvc?window.mkTweenSvc():new FW('TweenService',()=>[],{})};
 RT.game=new FW('Game',()=>Object.values(RT.svc),{GetService:(s,n)=>RT.svc[n],PlaceId:1});G.set('game',RT.game);G.set('workspace',RT.ws);
 (sv.StarterGui||[]).forEach(i0=>{if(i0.cls!='ScreenGui')return;const i=JSON.parse(JSON.stringify(i0));gui.appendChild(gDom(i,mkGw,null));RT.pgk.push(RT.gw.get(i.id))});
 const guiScripts=(i,w)=>i.ch.forEach(c=>{if(c.cls=='LocalScript')runScript(c,w);else if(GN[c.cls])guiScripts(c,RT.gw.get(c.id))});
 const lst=(a,par,cls)=>(a||[]).forEach(i=>{if(i.cls==cls)runScript(i,par);else if(i.cls=='Folder')lst(i.ch,iW(i),cls)});
 lst(sv.ReplicatedFirst,RT.svc.ReplicatedFirst,'LocalScript');lst(sv.ServerScriptService,RT.svc.ServerScriptService,'Script');lst(sv.Workspace,RT.ws,'Script');
 lst(sv.StarterPlayerScripts,RT.pl,'LocalScript');lst(sv.StarterPack,RT.pl,'LocalScript');
 (sv.StarterGui||[]).forEach(i0=>{const w=RT.gw.get(i0.id);if(i0.cls=='ScreenGui'&&w){const cl=JSON.parse(JSON.stringify(i0));guiScripts(cl,w)}else if(i0.cls=='LocalScript')runScript(i0,RT.pg)});
 setTimeout(()=>{if(RT===rt){RT.pa.fire(RT.pl);RT.pl.x.CharacterAdded.fire(RT.ch)}},60)}
function rtTick(){if(!RT||!RT.alive||!P)return;const t=performance.now(),dt=Math.min(.1,(t-RT.lt)/1000);RT.lt=t;RT.hb.fire(dt);
 RT.parts.forEach(w=>{if(!w.t.h.length||!w.m.parent)return;const m=w.m,hw=m.scale.x/2+.35,hd=m.scale.z/2+.35,top=m.position.y+m.scale.y/2,bot=m.position.y-m.scale.y/2,
  inn=Math.abs(P.x-m.position.x)<hw&&Math.abs(P.z-m.position.z)<hd&&P.y<top+.15&&P.y+2.7>bot-.1;if(inn&&!w.in)w.t.fire(RT.root);w.in=inn})}
OUT=(k,t)=>{const s=String(t).slice(0,140);if(RT&&RT.alive)addChat(k=='err'?'Error':k=='warn'?'Peringatan':'Script',s);else if(typeof slog=='function')slog((k=='err'?'Error: ':k=='warn'?'Peringatan: ':'')+s)};
const _lp=loop;loop=function(t){_lp(t);rtTick()};
const _sg3=startGame;startGame=function(g,t){_sg3(g,t);try{rtStart(g)}catch(e){OUT('err',e.message)}};
const _st3=stopGame;stopGame=function(){rtStop();_st3()};

/* ---- explorer ---- */
const _eR=eRender;
eRender=function(){if(!ST||ST.kind!='g')return _eR();const d=ST.d;ensureSvc(d);$('#etitle').textContent=''+d.name;
 const IR=(i,dep)=>{const on=SI==i.id,cont=pickL(i.id).length;let h=`<div class="er ${on?'on':''}" style="padding-left:${6+dep*12}px" data-a="isel" data-v="${i.id}"><span>${CL[i.cls]||'▫'} ${esc(i.n)}</span><span>${on&&/Script/.test(i.cls)?'<b class="px" data-a="sedit"></b>':''}${cont?`<b class="px" data-a="padd" data-v="${i.id}">＋</b>`:''}${on?`<b class="px dx" data-a="idel" data-v="${i.id}">✕</b>`:''}</span></div>`;i.ch.forEach(c=>h+=IR(c,dep+1));return h},
  SR2=(k,ic,pl,dep)=>`<div class="er sv" style="margin-left:${dep*10}px" data-a="xtg" data-v="${k}"><span>${XP[k]?'▾':'▸'} ${ic} ${k}</span>${pl?`<b class="px" data-a="padd" data-v="${k}">＋</b>`:''}</div>`;
 let h=`<div class="er ${SEL=='root'&&!SI?'on':''}" data-a="esel" data-v="root"><span><b>${esc(d.name)}</b></span></div>`;
 SVC.forEach(([k,ic,pl])=>{
  if(k=='StarterPlayer'){h+=SR2(k,ic,0,0);if(XP[k]){h+=SR2('StarterPlayerScripts','',1,1);if(XP.StarterPlayerScripts)d.svc.StarterPlayerScripts.forEach(i=>h+=IR(i,2));h+=`<div class="er ind" style="padding-left:20px">StarterCharacterScripts</div>`}return}
  h+=SR2(k,ic,pl,0);if(!XP[k])return;
  if(k=='Workspace')d.objs.forEach(o=>h+=`<div class="er ${o.id==SEL&&!SI?'on':''}" style="padding-left:18px" data-a="esel" data-v="${o.id}"><span>${TI[o.t]||''} ${esc(o.n)}</span><span><b class="px" data-a="padd" data-v="${o.id}">＋</b>${o.id==SEL&&!SI?`<b class="px dx" data-a="edel" data-v="${o.id}">✕</b>`:''}</span></div>${(o.ch||[]).map(c=>IR(c,2)).join('')}`);
  if(k=='Players')h+='<div class="er ind" style="padding-left:18px"> LocalPlayer</div>';
  (d.svc[k]||[]).forEach(i=>h+=IR(i,1))});
 $('#expl').innerHTML=h};
function iProps(i){const sc=/Script$/.test(i.cls),gu=GN[i.cls],q4=(k,a)=>'<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:3px">'+i[k].map((v,j)=>`<input type="number" step="${j%2?1:.1}" data-q="${k}${j}" value="${v}">`).join('')+'</div>';
 let h=`<h4>${CL[i.cls]||''} ${i.cls}</h4><label>Nama</label><input type="text" data-q="n" value="${esc(i.n)}" maxlength="24">`;
 if(sc)h+=`<button class="btn sm g w" data-a="sedit">Edit Script</button><div style="font-size:11px">${(i.src||'').split('\n').length} baris · Luau</div>`;
 if(gu&&i.cls!='ScreenGui'){h+=`<label>Position (skalaX, offsetX, skalaY, offsetY)</label>${q4('p')}<label>Size (skalaX, offsetX, skalaY, offsetY)</label>${q4('s')}<label>BackgroundColor3</label><input type="color" data-q="bg" value="${i.bg}"><label>BackgroundTransparency (0–1)</label><input type="number" step=".1" min="0" max="1" data-q="bt" value="${i.bt}">`;
  if(i.cls!='Frame'&&i.cls!='ScrollingFrame')h+=`<label>Text</label><input type="text" data-q="txt" value="${esc(i.txt||'')}"><label>TextColor3</label><input type="color" data-q="tc" value="${i.tc}"><label>TextSize</label><input type="number" data-q="ts" value="${i.ts}"><label>Font</label><select data-q="f">${Object.keys(FNT).map(k=>`<option value="${k}" ${(i.f||'Lilita')==k?'selected':''}>${k}</option>`).join('')}</select><label>TextXAlignment</label><select data-q="ta">${[['c','Center'],['l','Left'],['r','Right']].map(a=>`<option value="${a[0]}" ${(i.ta||'c')==a[0]?'selected':''}>${a[1]}</option>`).join('')}</select>`;
  h+=`<label class="ck"><input type="checkbox" data-q="bd" ${i.bd!==false?'checked':''}> Border</label>`}
 if(gu)h+=`<label class="ck"><input type="checkbox" data-q="vis" ${i.vis!==false?'checked':''}> ${i.cls=='ScreenGui'?'Enabled':'Visible'}</label>`;
 if(i.cls=='Team')h+=`<label>TeamColor</label><input type="color" data-q="tcol" value="${i.tcol}">`;
 return h+`<div style="display:flex;gap:6px;margin-top:8px"><button class="btn sm c" data-a="idup">⧉ Duplikat</button><button class="btn sm o" data-a="idel" data-v="${i.id}">Hapus</button></div>`}
const _pR2=pRender;
pRender=function(){if(ST&&ST.kind=='g'&&SI){const r=loc(SI);if(!r||SEL!='root')SI=null;else{$('#props').innerHTML=iProps(r.i);return}}_pR2()};
$('#props').addEventListener('change',e=>{const t=e.target,q=t.dataset&&t.dataset.q;if(!q||!ST||!SI)return;const r=loc(SI);if(!r)return;const i=r.i,v=t.type=='checkbox'?t.checked:t.type=='number'?(parseFloat(t.value)||0):t.value;
 if(/^[ps]\d$/.test(q))i[q[0]][+q[1]]=v;else if(q=='n')i.n=String(v).trim()||i.cls;else i[q]=v;touch();eRender();guiRefresh()});
/* picker */
function pickOpen(t){let m=$('#cpick');if(!m){m=document.createElement('div');m.id='cpick';document.body.appendChild(m)}m.dataset.t=t;const L=pickL(t);
 m.innerHTML=`<div class="card"><div style="display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">＋ Insert Object</h3><button class="btn sm o" style="margin:0" data-a="pkx">✕</button></div><input type="text" id="pq" placeholder="Cari objek…" style="margin:8px 0"><div class="plist">${L.map(x=>`<div class="pit" data-n="${x.n.toLowerCase()}" data-a="pins" data-v="${x.id}" data-k="${x.k}"><span>${x.ic}</span><div><b>${x.n}</b><small>${x.d}</small></div></div>`).join('')||'<div class="pit">Tidak ada objek yang bisa ditambahkan di sini.</div>'}</div></div>`}
document.addEventListener('input',e=>{if(e.target.id=='pq'){const q=e.target.value.toLowerCase();document.querySelectorAll('#cpick .pit').forEach(p=>p.style.display=!q||(p.dataset.n||'').includes(q)?'':'none')}});
const afterIns=i=>{SI=i.id;SEL='root';guiOn=!!GN[i.cls]||(guiOn&&i.cls=='LocalScript');selHelper();eRender();pRender();guiRefresh();touch()};
Object.assign(act,{
 xtg(v){XP[v]=!XP[v];eRender()},padd(v){pickOpen(v)},pkx(){const m=$('#cpick');if(m)m.remove()},
 pins(v,t){const m=$('#cpick'),tg=m.dataset.t;act.pkx();if(t.dataset.k=='obj')return act.ins(v);const i=newI(v);tgtList(tg).push(i);XP[tg]=1;afterIns(i);slog('+ '+v)},
 isel(v){const r=loc(v);if(!r)return;if(SI==v&&/Script/.test(r.i.cls))return act.sedit();SI=v;SEL='root';if(GN[r.i.cls])guiOn=true;selHelper();eRender();pRender();guiRefresh()},
 idel(v){const r=loc(v||SI);if(!r)return;r.list.splice(r.list.indexOf(r.i),1);SI=null;eRender();pRender();guiRefresh();touch();slog('Objek dihapus')},
 idup(){const r=loc(SI);if(!r)return;const c=JSON.parse(JSON.stringify(r.i)),re=x=>{x.id=nid();x.ch.forEach(re)};re(c);c.n+='2';r.list.push(c);afterIns(c)},
 gui(){guiOn=!guiOn;guiRefresh()},
 sedit(){const r=SI&&loc(SI);if(!r||!/Script$/.test(r.i.cls))return;sedOpen(r.i)},sclose(){const m=$('#sed');if(m)m.remove();touch()},
 schk(){const r=SI&&loc(SI);try{parse(r.i.src||'');$('#sst').textContent='✔ Syntax OK';$('#sst').style.color='#7dff9a'}catch(e){$('#sst').textContent=' '+e.message;$('#sst').style.color='#ff8080'}},
 sdemo(){act.sclose();act.edtest()}});
const _es=act.esel;act.esel=function(v){SI=null;guiOn=false;_es(v);guiRefresh()};
const _ed=act.edexit;act.edexit=function(){act.sclose();act.pkx();_ed()};
const _eo=edOpen;edOpen=function(d,k){SI=null;guiOn=false;if(k=='g')ensureSvc(d);_eo(d,k);const g=k=='g';['guib','tbxb'].forEach(i=>{const b=$('#'+i);if(b)b.style.display=g?'':'none'});guiRefresh()};
$('#snap').insertAdjacentHTML('afterend','<button class="btn sm" data-a="gui" id="guib"> GUI</button><button class="btn sm v" data-a="tbox" id="tbxb"> Toolbox</button>');
/* GUI editor overlay */
$('#vp').insertAdjacentHTML('beforeend','<div id="guiv"><div class="stg"></div></div>');
function guiRefresh(){const v=$('#guiv');if(!v)return;const on=guiOn&&ST&&ST.kind=='g';v.style.display=on?'flex':'none';$('#guib').classList.toggle('on',!!on);if(!on)return;
 const vp=$('#vp');let W=vp.clientWidth*.94,H=W*9/16;if(H>vp.clientHeight*.94){H=vp.clientHeight*.94;W=H*16/9}const st=v.querySelector('.stg');st.style.width=W+'px';st.style.height=H+'px';st.innerHTML='';
 ST.d.svc.StarterGui.forEach(i=>{if(i.cls=='ScreenGui')st.appendChild(gDom(i))});
 if(!st.children.length)st.innerHTML='<div class="gem">Belum ada GUI.<br>Klik ＋ di StarterGui → ScreenGui</div>';
 const el=SI&&st.querySelector('[data-gid="'+SI+'"]');if(el){el.classList.add('gsel');const l=loc(SI);if(l&&l.i.cls!='ScreenGui')el.insertAdjacentHTML('beforeend','<s class="rh"></s>')}}
{const gv=$('#guiv');
 gv.addEventListener('pointerdown',e=>{const st=gv.querySelector('.stg'),el=e.target.closest('[data-gid]'),rh=e.target.closest('.rh');
  if(!el){if(SI){SI=null;eRender();pRender();guiRefresh()}return}
  const id=el.dataset.gid;if(SI!=id)act.isel(id);const r=loc(id);if(!r||r.i.cls=='ScreenGui')return;try{gv.setPointerCapture(e.pointerId)}catch(x){}
  gdr={i:r.i,el:st.querySelector('[data-gid="'+id+'"]'),x:e.clientX,y:e.clientY,p:r.i.p.slice(),s:r.i.s.slice(),rs:!!rh};e.preventDefault()});
 gv.addEventListener('pointermove',e=>{if(!gdr)return;const dx=Math.round(e.clientX-gdr.x),dy=Math.round(e.clientY-gdr.y),i=gdr.i;if(gdr.rs){i.s[1]=Math.max(8,gdr.s[1]+dx);i.s[3]=Math.max(8,gdr.s[3]+dy)}else{i.p[1]=gdr.p[1]+dx;i.p[3]=gdr.p[3]+dy}gSty(i,gdr.el)});
 const up=()=>{if(gdr){gdr=null;touch();pRender()}};gv.addEventListener('pointerup',up);gv.addEventListener('pointercancel',up)}
new ResizeObserver(()=>guiRefresh()).observe($('#vp'));
/* script editor */
function sedOpen(i){let m=$('#sed');if(!m){m=document.createElement('div');m.id='sed';document.body.appendChild(m)}
 m.innerHTML=`<div class="sh"><b>${CL[i.cls]} ${esc(i.n)} <small>${i.cls} · Luau</small></b><span style="flex:1"></span><button class="btn sm g" data-a="schk">✔ Cek</button><button class="btn sm c" data-a="sdemo">▶ Test</button><button class="btn sm o" data-a="sclose">✕ Tutup</button></div><div class="sb"><pre id="sgut"></pre><textarea id="sta" spellcheck="false" autocapitalize="off" autocomplete="off" wrap="off"></textarea></div><div id="sst">Tab = indentasi · print() tampil di chat saat Test</div>`;
 const ta=$('#sta'),gut=()=>{$('#sgut').textContent=ta.value.split('\n').map((_,j)=>j+1).join('\n')};ta.value=i.src||'';gut();
 ta.addEventListener('input',()=>{i.src=ta.value;gut();touch()});ta.addEventListener('scroll',()=>$('#sgut').scrollTop=ta.scrollTop);
 ta.addEventListener('keydown',e=>{if(e.key=='Tab'){e.preventDefault();ta.setRangeText('  ',ta.selectionStart,ta.selectionEnd,'end');i.src=ta.value;gut()}});ta.focus()}
/* toolbox */
const pa=(x,y,z,sx,sy,sz,c,n)=>{const o=O('part',x,y,z,sx,sy,sz,c);o.n=n;return o},
 sg=(k,cls,src,n)=>{const i=newI(cls);i.src=src;if(n)i.n=n;ST.d.svc[k].push(i);return i};
const TB=[
 {n:'Kill Brick',ic:'',d:'Balok merah + Script: sentuh = respawn',f(){ST.d.objs.push(pa(6,.5,6,4,1,4,'#ff3b3b','KillBrick'));return sg('ServerScriptService','Script','local brick = workspace:FindFirstChild("KillBrick")\nbrick.Touched:Connect(function(hit)\n\tlocal hum = hit.Parent:FindFirstChild("Humanoid")\n\tif hum then\n\t\thum.Health = 0\n\tend\nend)\n','KillBrickScript')}},
 {n:'Balok Pelangi',ic:'',d:'Balok yang berganti warna tiap 0.5 detik',f(){ST.d.objs.push(pa(-6,.5,6,4,1,4,'#ff90e8','Rainbow'));return sg('ServerScriptService','Script','local part = workspace:FindFirstChild("Rainbow")\nwhile true do\n\tpart.Color = Color3.fromRGB(math.random(0,255), math.random(0,255), math.random(0,255))\n\twait(0.5)\nend\n','RainbowScript')}},
 {n:'Teleporter',ic:'',d:'Sentuh balok biru → pindah ke atas',f(){ST.d.objs.push(pa(10,.5,0,3,1,3,'#7df9ff','Teleport'));return sg('ServerScriptService','Script','local tp = workspace:FindFirstChild("Teleport")\ntp.Touched:Connect(function(hit)\n\thit.Parent.HumanoidRootPart.Position = Vector3.new(0, 15, 0)\nend)\n','TeleportScript')}},
 {n:'HUD Skor',ic:'',d:'ScreenGui: label skor + tombol +1',f(){const g=newI('ScreenGui');g.n='HUD';const l=newI('TextLabel');l.n='Skor';l.txt='Skor: 0';l.p=[0,20,0,70];l.s=[0,160,0,46];const b=newI('TextButton');b.n='Tambah';b.txt='+1';b.p=[0,20,0,124];b.s=[0,160,0,46];const s=newI('LocalScript');s.src='local gui = script.Parent\nlocal label = gui:WaitForChild("Skor")\nlocal btn = gui:WaitForChild("Tambah")\nlocal n = 0\nbtn.MouseButton1Click:Connect(function()\n\tn = n + 1\n\tlabel.Text = "Skor: " .. n\nend)\n';g.ch.push(l,b,s);ST.d.svc.StarterGui.push(g);return g}},
 {n:'Panel Info',ic:'',d:'Frame di tengah + tombol Tutup',f(){const g=newI('ScreenGui');g.n='InfoGui';const f=newI('Frame');f.n='Panel';f.p=[.5,-130,.5,-80];f.s=[0,260,0,160];const t=newI('TextLabel');t.txt='Selamat datang di mapku!';t.p=[0,10,0,10];t.s=[1,-20,0,60];t.bt=1;t.bd=false;const b=newI('TextButton');b.n='Tutup';b.txt='Tutup';b.p=[.5,-60,1,-60];b.s=[0,120,0,44];f.ch.push(t,b);const s=newI('LocalScript');s.src='local gui = script.Parent\nlocal panel = gui:WaitForChild("Panel")\npanel:WaitForChild("Tutup").MouseButton1Click:Connect(function()\n\tpanel.Visible = false\nend)\n';g.ch.push(f,s);ST.d.svc.StarterGui.push(g);return g}},
 {n:'Module Util + Script',ic:'',d:'ModuleScript di ReplicatedStorage + require()',f(){sg('ReplicatedStorage','ModuleScript',SRC.ModuleScript,'Util');return sg('ServerScriptService','Script','local Util = require(game:GetService("ReplicatedStorage"):WaitForChild("Util"))\nprint(Util.hello("Sandbox"))\n','UseUtil')}},
 {n:'Hello Output',ic:'',d:'Script contoh: print + loop',f(){return sg('ServerScriptService','Script','for i = 1, 3 do\n\tprint("Hitung", i)\n\twait(1)\nend\nprint("Selesai!")\n','Hello')}}];
Object.assign(act,{tbox(){let m=$('#cpick');if(!m){m=document.createElement('div');m.id='cpick';document.body.appendChild(m)}
 m.innerHTML=`<div class="card"><div style="display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0"> Toolbox</h3><button class="btn sm o" style="margin:0" data-a="pkx">✕</button></div><div class="plist" style="margin-top:8px">${TB.map((x,j)=>`<div class="pit" data-a="tbi" data-v="${j}"><span>${x.ic}</span><div><b>${x.n}</b><small>${x.d}</small></div></div>`).join('')}</div></div>`},
 tbi(v){act.pkx();const i=TB[+v].f();sBuild();afterIns(i);slog('Toolbox: '+TB[+v].n);toast('Ditambahkan: '+TB[+v].n)}});
if(ST)eRender();
;

/* ===== 10-ui-tidy-v4-gui-palette-script-helpers.js ===== */
/* ===== UI TIDY v4 + GUI palette + script helpers ===== */
(function(){
 /* toolbar: aksi utama selalu terlihat di kanan */
 const tb=$('#etb'),l=document.createElement('div'),r=document.createElement('div');l.id='etl';r.id='etr';
 [...tb.children].forEach(c=>{const a=c.dataset&&c.dataset.a;if(c.tagName=='SPAN'&&c.style.flex){c.remove();return}
  if(['edtest','edsave','edpub'].includes(a))r.appendChild(c);else l.appendChild(c)});
 tb.append(l,r);
 const tbxb=$('#tbxb'),gb=$('#guib');if(tbxb){tbxb.textContent='';tbxb.title='Toolbox'}if(gb)gb.title='Editor GUI';
 /* panel kanan: tab Explorer / Properti */
 $('#rgt').insertAdjacentHTML('afterbegin','<div id="rtabs"><button data-a="rtab" data-v="expl"> Explorer</button><button data-a="rtab" data-v="props"> Properti</button></div>');
})();
function rtab(v){const g=$('#rgt');g.dataset.t=v;g.querySelectorAll('#rtabs button').forEach(b=>b.classList.toggle('act',b.dataset.v==v))}
rtab('expl');
const _eo4=edOpen;edOpen=function(d,k){_eo4(d,k);rtab('expl')};
const _es4=act.esel;act.esel=function(v){const same=v==SEL&&!SI&&v!='root';_es4(v);if(same)rtab('props')};
const _is4=act.isel;act.isel=function(v){const same=SI==v;_is4(v);if(same)rtab('props')};
$('#guiv').addEventListener('pointerup',e=>{if(e.target.closest&&e.target.closest('[data-gid]')&&SI)rtab('props')});

/* palet GUI di panel kiri saat mode GUI */
let tbxMode;
const _tr4=tbxRender;
tbxRender=function(){if(ST&&ST.kind=='g'&&guiOn){
  $('#tbx').innerHTML='<h4>GUI</h4><div class="tg">'+['Frame','ScrollingFrame','TextLabel','TextButton','TextBox'].map(c=>`<button class="btn sm" data-a="gadd" data-v="${c}">${CL[c]}<br>${c=='ScrollingFrame'?'Scroll':c}</button>`).join('')+'</div><button class="btn sm w g" data-a="gadd" data-v="ScreenGui">＋ ScreenGui</button><h4>Script</h4><button class="btn sm w" data-a="gadd" data-v="LocalScript"> LocalScript</button><div class="hint">Ketuk elemen untuk pilih · seret untuk geser · kotak pink = ubah ukuran · ketuk elemen terpilih lagi / tab Properti untuk edit.</div>';return}
 _tr4();document.querySelectorAll('#tbx [data-a=ins]').forEach(b=>{b.innerHTML=b.innerHTML.replace('SpawnLocation','Spawn')})};
const _gr4=guiRefresh;guiRefresh=function(){_gr4();const k=!!(ST&&ST.kind=='g'&&guiOn);if(k!==tbxMode){tbxMode=k;if(ST)tbxRender()}};
function findPar(list,t){for(const i of list){if(i.ch.includes(t))return i;const r=findPar(i.ch,t);if(r)return r}return null}
act.gadd=function(cls){if(!ST||ST.kind!='g')return;ensureSvc(ST.d);const sg=ST.d.svc.StarterGui;XP.StarterGui=1;
 if(cls=='ScreenGui'){const i=newI(cls);i.n='ScreenGui'+(sg.filter(x=>x.cls=='ScreenGui').length+1);sg.push(i);return afterIns(i)}
 let par=null;const sel=SI&&loc(SI);
 if(sel){par=['ScreenGui','Frame','ScrollingFrame'].includes(sel.i.cls)?sel.i:findPar(sg,sel.i)}
 if(!par||!['ScreenGui','Frame','ScrollingFrame'].includes(par.cls))par=sg.find(x=>x.cls=='ScreenGui');
 if(!par){par=newI('ScreenGui');sg.push(par)}
 const i=newI(cls),n=par.ch.length;if(i.p){i.p[1]=20+n*16;i.p[3]=20+n*16}par.ch.push(i);afterIns(i);slog('+ '+cls)};

/* editor script: bar simbol + referensi */
const _so4=sedOpen;sedOpen=function(i){_so4(i);const m=$('#sed');if(!m)return;
 const keys=['  ','(',')','{','}','[',']','"',"'",'=','==','~=','.',':',',','..','#','+','-','*','/','end','then','do','local','function','if','else','for','while','return','print()'];
 m.querySelector('.sh').insertAdjacentHTML('beforeend','<button class="btn sm" data-a="sref">Ref</button>');
 m.querySelector('.sb').insertAdjacentHTML('beforebegin','<div id="ssn">'+keys.map(k=>`<button class="btn sm" data-a="sins" data-v="${esc(k)}">${k=='  '?'⇥':esc(k)}</button>`).join('')+'</div>');
 m.insertAdjacentHTML('beforeend','<div id="sref"><b>Referensi Luau Sandbox</b><br><code>print(...)</code> <code>wait(s)</code> <code>task.spawn/delay</code> <code>pcall</code> <code>require(m)</code><br><code>game:GetService("Players").LocalPlayer</code> → <code>.Character.HumanoidRootPart.Position</code>, <code>.PlayerGui</code><br><code>workspace:FindFirstChild("Nama")</code> → <code>.Touched:Connect(f)</code>, <code>.Color</code>, <code>.Position</code>, <code>.Transparency</code><br><code>Instance.new("TextLabel", parent)</code> (ScreenGui, Frame, TextLabel, TextButton, TextBox, Part, Folder)<br>GUI: <code>.Text</code> <code>.Visible</code> <code>.BackgroundColor3</code> <code>.Position</code> <code>.Size</code> <code>.MouseButton1Click:Connect(f)</code><br>GUI lanjut: <code>.Font = Enum.Font.GothamBold</code> <code>.TextXAlignment</code> <code>.AnchorPoint = Vector2.new(.5,.5)</code> <code>.ZIndex</code> <code>.BorderSizePixel</code> <code>.PlaceholderText</code><br>Layout: <code>Instance.new("UIListLayout", frame)</code> <code>UIGridLayout</code> <code>UIPadding</code> <code>UICorner</code> <code>UIStroke</code><br><code>TweenService:Create(gui, TweenInfo.new(0.3), {Size = UDim2.new(...)}):Play()</code><br><code>player.UserId</code> <code>Players:GetPlayerByUserId(id)</code> <code>Players:GetNameFromUserIdAsync(id)</code><br><code>Vector3.new</code> <code>Color3.fromRGB</code> <code>UDim2.new</code><br><code>Color3.fromHSV</code> <code>Vector2.new</code> <code>Enum.Font.X</code><br><code>RunService.Heartbeat:Connect(function(dt)</code><br><code>math</code> <code>string</code> <code>table</code> <code>os.time()</code> · operator <code>+=</code> <code>continue</code> <code>if…then…else</code> ekspresi</div>');
 $('#ssn').addEventListener('pointerdown',e=>e.preventDefault());$('#sref').addEventListener('pointerdown',e=>e.stopPropagation())};
act.sref=function(){const e=$('#sref');if(e)e.style.display=e.style.display=='block'?'none':'block'};
act.sins=function(v){const ta=$('#sta');if(!ta)return;ta.focus();ta.setRangeText(v,ta.selectionStart,ta.selectionEnd,'end');if(v=='print()')ta.setSelectionRange(ta.selectionStart-1,ta.selectionStart-1);ta.dispatchEvent(new Event('input'))};

/* perbaikan kecil: Enter di TextBox game tidak mengirim chat; nil eksplisit di tonumber/find/match */
window.addEventListener('keydown',e=>{const a=document.activeElement;if(run&&e.key=='Enter'&&a&&a.tagName=='INPUT'&&a.id!='ci')e.stopImmediatePropagation()},true);
['find','match'].forEach(k=>{const f=STR.get(k);STR.set(k,(...a)=>{const r=f(...a);return r===undefined?[undefined]:r})});
{const f=G.get('tonumber');G.set('tonumber',(v,b)=>{const r=f(v,b);return r===undefined?[undefined]:r})}

/* sanitasi proyek hasil impor (Explorer + script) */
function cleanSvc(s){const out={};SKEYS.forEach(k=>out[k]=[]);if(!s||typeof s!='object')return out;let cnt=0;
 const hx=c=>/^#[0-9a-f]{6}$/i.test(c)?c:'#ffffff',n4=a=>Array.isArray(a)&&a.length==4&&a.every(x=>isFinite(+x))?a.map(Number):[0,0,0,0],
 cl=(i,d)=>{if(!i||typeof i!='object'||!Object.hasOwn(CL,i.cls)||cnt++>300||d>8)return null;const o=newI(i.cls);o.n=String(i.n||i.cls).slice(0,24);
  if(GN[i.cls]){o.vis=i.vis!==false;if(i.cls!='ScreenGui'){o.p=n4(i.p);o.s=n4(i.s);o.bg=hx(i.bg);o.tc=hx(i.tc);o.bt=Math.min(1,Math.max(0,+i.bt||0));o.ts=Math.min(72,Math.max(6,+i.ts||18));o.txt=String(i.txt||'').slice(0,200);o.bd=i.bd!==false;if(FNT[i.f])o.f=i.f;if(i.ta=='l'||i.ta=='r')o.ta=i.ta}}
  if(/Script$/.test(i.cls))o.src=String(i.src||'').slice(0,20000);if(i.cls=='Team')o.tcol=hx(i.tcol);
  o.ch=(Array.isArray(i.ch)?i.ch:[]).map(c=>cl(c,d+1)).filter(Boolean);return o};
 SKEYS.forEach(k=>{out[k]=(Array.isArray(s[k])?s[k]:[]).map(i=>cl(i,0)).filter(Boolean)});return out}
;

/* ===== 11-tema-sandbox.js ===== */
/* ===== TEMA SANDBOX: header, drawer, nav, Beranda, Avatar, Chat ===== */
const IC={
 menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
 search:'<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
 hex:'<path d="M12 2.8l7.8 4.5v9.4L12 21.2l-7.8-4.5V7.3z"/><path d="M12 8.2l3.4 2v3.6l-3.4 2-3.4-2v-3.6z"/>',
 bell:'<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 21h4"/>',
 bookmark:'<path d="M7 3.5h10v17l-5-4-5 4z"/>',
 history:'<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.5"/><path d="M3.5 4v4.5H8M12 7.5V12l3 2"/>',
 friends:'<circle cx="9" cy="8" r="3.2"/><path d="M3 19c0-3.4 2.7-5.5 6-5.5s6 2.1 6 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M17 14c2.6 0 4.5 1.7 4.5 4.5"/>',
 comm:'<circle cx="12" cy="7" r="2.5"/><circle cx="6" cy="10" r="2"/><circle cx="18" cy="10" r="2"/><path d="M8 18c0-2.5 1.8-4 4-4s4 1.5 4 4M2.5 17c0-2 1.5-3.2 3.5-3.2M21.5 17c0-2-1.5-3.2-3.5-3.2"/>',
 pack:'<path d="M7 9a5 5 0 0 1 10 0v11H7z"/><path d="M9.5 5V3.5h5V5M7 14h10"/>',
 swap:'<path d="M4 8h14l-3-3M20 16H6l3 3"/>',
 mail:'<rect x="3.5" y="5.5" width="17" height="13" rx="1.5"/><path d="M4 7l8 6 8-6"/>',
 plus:'<path d="M12 2.8l7.8 4.5v9.4L12 21.2l-7.8-4.5V7.3z"/><path d="M10 16v-7h3a2 2 0 0 1 0 4h-3"/>',
 gift:'<rect x="3.5" y="9" width="17" height="11" rx="1.5"/><path d="M3.5 13h17M12 9v11M12 9c-3-.5-4.5-1.5-4.5-3a2 2 0 0 1 4 0c0 1.5.5 2 .5 3zM12 9c3-.5 4.5-1.5 4.5-3a2 2 0 0 0-4 0"/>',
 gear:'<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8"/>',
 shield:'<path d="M12 3l7 3v5.5c0 4.2-2.8 7.4-7 9.5-4.2-2.1-7-5.3-7-9.5V6z"/><rect x="9.5" y="10.5" width="5" height="4" rx=".8"/>',
 learn:'<circle cx="12" cy="8" r="3.5"/><path d="M6 20c0-3.5 2.7-5.5 6-5.5s6 2 6 5.5z"/>',
 create:'<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/>',
 home:'<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>',
 top:'<rect x="4" y="11" width="4" height="9" rx=".8"/><rect x="10" y="4" width="4" height="16" rx=".8"/><rect x="16" y="8" width="4" height="12" rx=".8"/>',
 chat:'<path d="M4 5h16v11H11l-4 4v-4H4z"/><path d="M8 9h8M8 12h5"/>',
 back:'<path d="M15 5l-7 7 7 7"/>',
 chev:'<path d="M9 5l7 7-7 7"/>',
 thumb:'<path d="M8 11v9H4v-9zM8 11l4-7c1.6 0 2.6 1.3 2.2 2.8L13.5 10H19a1.5 1.5 0 0 1 1.4 1.9l-1.8 6.6A2 2 0 0 1 16.7 20H8"/>',
 adduser:'<circle cx="10" cy="8" r="3.5"/><path d="M3.5 20c0-3.6 2.8-6 6.5-6"/><path d="M17 12v6M14 15h6"/>'
};
const ico=(k,s=24)=>`<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${IC[k]}</svg>`;
const hexc=(c,d)=>/^#[0-9a-f]{6}$/i.test(c||'')?c:d;
const okImg=u=>/^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+\/=]+$/.test(u||'')?u:'';
/* foto profil: render 3D bagian atas avatar yang sedang dipakai (aksesori, baju, model tubuh ikut) */
let PFR=null;const PFC={};
function avItems(a){try{if(me&&a===me.av)return me.items||[];for(const k in users)if(users[k]&&users[k].av===a)return users[k].items||[]}catch(e){}return[]}
function avShot(a){if(!window.THREE||!a||typeof mkAvatar!=='function')return'';
 const items=avItems(a),ids=(a.acc||[]).slice();if(a.body&&!ids.includes(a.body))ids.push(a.body);
 let sg;try{sg=JSON.stringify([a.skin,a.shirt,a.pants,a.hat,a.body||0,a.hideBody||0,a.bodyObjs||0,ids.map(id=>{const i=items.find(x=>x.id==id);return i?[i.slot,i.objs]:0})])}catch(e){return''}
 if(PFC[sg]!==undefined)return PFC[sg];
 let url='';const sv=me.items;
 try{me.items=items;const N=320;
  if(!PFR){PFR=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});PFR.setPixelRatio(1)}
  PFR.setSize(N,N,false);PFR.setClearColor(0x000000,0);
  const S=new THREE.Scene(),C=new THREE.PerspectiveCamera(30,1,.1,60);S.add(new THREE.AmbientLight(0xffffff,.85));const L=new THREE.DirectionalLight(0xffffff,.6);L.position.set(4,8,7);S.add(L);
  const G=mkAvatar(a,a.acc||[]);G.rotation.y=-.4;S.add(G);C.position.set(0,2.15,6.2);C.lookAt(0,2.15,0);
  PFR.render(S,C);url=PFR.domElement.toDataURL('image/png');
  S.traverse(o=>{if(o.geometry)o.geometry.dispose()})
 }catch(e){url=''}finally{me.items=sv}
 if(Object.keys(PFC).length>120)for(const k in PFC)delete PFC[k];
 PFC[sg]=url;return url}
function circ(a,sz){a=a||{skin:SKIN[0],shirt:SHIRT[0],pants:PANTS[0],hat:'none'};const im=typeof avShot==='function'?avShot(a):'';return `<span class="circ" style="--s:${sz}px">${im?`<img src="${im}" alt="" draggable="false">`:avHTML(a,sz/10)}</span>`}
document.title='Sandbox';
let mfil='all';

function buildChrome(){
 const lg=document.querySelector('#auth .logo');if(lg)lg.innerHTML='SAND<b>BOX</b>';
 $('#app header').innerHTML=`<button class="hb" data-a="drawer" aria-label="Menu">${ico('menu',30)}<i id="mdot"></i></button><div class="wm">SAND<b>BOX</b></div><span class="sp"></span><button class="hb" data-a="srch" aria-label="Cari">${ico('search',27)}</button><button class="hb" data-a="daily" aria-label="Bonus harian">${ico('hex',28)}</button><button class="hb" data-a="go" data-v="notif" aria-label="Notifikasi">${ico('bell',28)}<i id="bcnt" class="cnt"></i></button>`;
 if(!$('#sbar'))$('#app header').insertAdjacentHTML('afterend','<div id="sbar"><input type="text" id="qin" placeholder="Cari game..." autocomplete="off" maxlength="30"><div id="sres"></div></div>');
 $('#nav').innerHTML=[['home','home','Beranda'],['top','top','Teratas'],['avatar','','Avatar'],['msg','chat','Chat']].map(x=>`<button data-a="go" data-v="${x[0]}" id="n_${x[0]}">${x[1]?ico(x[1],28):'<span id="navav"></span>'}<em>${x[2]}</em></button>`).join('');
 if(!$('#drawer'))$('#app').insertAdjacentHTML('beforeend','<div id="drawer"><div id="dsc" data-a="dclose"></div><aside id="dpn"></aside></div>');
 const q=$('#qin');if(q&&!q.dataset.b){q.dataset.b=1;q.addEventListener('input',()=>srchGo(q.value))}
}
function friends(){const dflt=i=>({skin:SKIN[i%SKIN.length],shirt:SHIRT[(i+1)%SHIRT.length],pants:PANTS[1],hat:'none'});
 const real=Object.keys(users).filter(k=>k!==me.name&&!users[k].role).map(k=>({n:k,a:users[k].av||dflt(0)}));
 const fake=FR.filter(n=>!real.some(r=>r.n==n)).map((n,i)=>({n,a:dflt(i)}));
 const gs=pubGames();return real.concat(fake).slice(0,10).map((f,i)=>Object.assign(f,{g:(gs[i%gs.length]||{}).name||''}))}
const TH_C=new Map();
function thumbU(d){if(!d)return'';let v=TH_C.get(d);if(v!==undefined)return v;v='';
 try{const k=okImg(d);if(k){const m=/^data:(image\/[a-z0-9.+-]+);base64,(.*)$/i.exec(k);if(m){const b=atob(m[2]),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);v=URL.createObjectURL(new Blob([u],{type:m[1]}))}}}catch(e){v=''}
 if(TH_C.size>300){TH_C.forEach(x=>{try{x&&URL.revokeObjectURL(x)}catch(e){}});TH_C.clear()}TH_C.set(d,v);return v}
function gcard(g,i){const t=thumbU(g.thumb),c1=hexc(g.col,'#b6f25a'),c2=hexc(g.sky,'#7df9ff');
 const sub=g.by?`<span class="mini">${esc(String(g.by).charAt(0).toUpperCase())}</span>${esc(g.by)}`:`${ico('thumb',16)} ${g.lk>0?'Rating '+(+g.lk)+'%':'Baru'}`;
 return `<button class="gc" data-a="gopen" data-v="${esc(g.id)}" style="animation-delay:${Math.min(i,12)*40}ms"><span class="gt" style="background:${t?`url(${t}) center/cover`:`linear-gradient(135deg,${c1},${c2})`}">${t?'':esc(g.emoji||String(g.name||'?').charAt(0).toUpperCase())}</span><strong>${esc(g.name)}</strong><small>${sub}</small></button>`}
function homeH(){const gs=pubGames(),rec=(me.recent||[]).map(id=>gs.find(g=>g.id==id)).filter(Boolean);
 return `<div class="who">${circ(me.av,46)}<span>${esc(me.name)}${vb(me)}</span></div>
 <div class="frs"><button class="fr add" data-a="soon" data-v="Tambah teman"><span class="circw"><span class="circ" style="--s:92px">${ico('adduser',40)}</span></span><em>Tambah Teman</em></button>${friends().map(f=>`<button class="fr" data-a="fr" data-v="${esc(f.n)}"><span class="circw">${circ(f.a,92)}<i class="on"></i></span><em>${esc(f.n)}</em><small>${esc(f.g)}</small></button>`).join('')}</div>
 <h3 class="sec">Direkomendasikan untukmu</h3><div class="gg">${gs.map(gcard).join('')}</div>
 <h3 class="sec" id="cont">${rec.length?'Lanjutkan':'Populer'} ${ico('chev',20)}</h3><div class="hs">${(rec.length?rec:gs).map(gcard).join('')}</div>
 <h3 class="sec">Mabar bareng teman</h3><div class="card row" style="flex-wrap:wrap"><div style="flex:1;min-width:150px"><label>Kode room</label><input type="text" id="rc" value="${esc(roomCode)}" maxlength="16" style="margin:6px 0 0" oninput="roomCode=this.value.toLowerCase().replace(/[^a-z0-9]/g,'')||'publik';save()"></div><button class="btn g" data-a="rnd">Acak</button></div>`}
function msgH(){return '<h2>Chat</h2>'+friends().map(f=>`<button class="crow" data-a="open" data-v="${esc(f.n)}">${circ(f.a,54)}<span><b>${esc(f.n)}</b><small>Online · ${esc(f.g)}</small></span></button>`).join('')}
function avP(){const own=it=>(me.items||[]).some(x=>x.src==it.key||'u_'+me.name+'_'+x.id==it.key);
 let h=`<div class="atop"><button class="rb" data-a="go" data-v="home" aria-label="Kembali">${ico('back',28)}</button><div class="seg"><button class="${avt=='mkt'?'on':''}" data-a="avt" data-v="mkt">Marketplace</button><button class="${avt!='mkt'?'on':''}" data-a="avt" data-v="cust">Kustomisasi</button></div><span class="bx">${ico('hex',20)} ${me.bux}</span></div><div class="stage">${avHTML(me.av,13)}</div><div class="sheet"><i class="grab"></i>`;
 if(avt=='mkt'){const all=mkItems(),f=all.filter(it=>!it.lim&&(mfil=='all'||(mfil=='off'?it.by=='Sandbox':it.by!='Sandbox')));
  h+=`<div class="ban">${ico('hex',20)}<span>Kamu punya <b>${me.bux}</b> SandBux. Item kreator muncul setelah dipublish.</span></div><div class="chips">${[['all','Semua'],['off','Resmi'],['cr','Kreator']].map(c=>`<button class="${mfil==c[0]?'on':''}" data-a="mf" data-v="${c[0]}">${c[1]}</button>`).join('')}</div>`+
  (f.length?`<div class="ig">${f.map(it=>{const im=okImg(it.icon),o=own(it);return `<button class="it" data-a="buy" data-v="${esc(it.key)}"><span class="ith">${im?`<img src="${im}" alt="">`:esc(it.e||String(it.name||'?').charAt(0).toUpperCase())}</span><strong>${esc(it.name)}</strong><small>${esc(it.by)}${it.v?' ✔':''}</small><em>${o?'Dimiliki':ico('hex',15)+' '+(+it.price||0)}</em></button>`}).join('')}</div>`:'<div style="color:var(--mut);padding:20px 0;text-align:center">Belum ada item.</div>')}
 else{const sw=(k,arr)=>`<div class="sws">${arr.map(c=>`<span class="sw ${me.av[k]==c?'sel':''}" style="background:${c}" data-a="av" data-k="${k}" data-v="${c}"></span>`).join('')}</div>`;
  h+=`<div class="sl">Kulit</div>${sw('skin',SKIN)}<div class="sl">Baju</div>${sw('shirt',SHIRT)}<div class="sl">Celana</div>${sw('pants',PANTS)}<div class="sl">Topi</div>${[['none','Polos'],['cap','Topi'],['crown','Mahkota']].map(x=>`<button class="chip ${me.av.hat==x[0]?'on':''}" data-a="av" data-k="hat" data-v="${x[0]}">${x[1]}</button>`).join('')}<div class="sl">Aksesoris saya</div>`+((me.items||[]).length?(me.items||[]).map(i=>{const on=(me.av.acc||[]).includes(i.id);return `<button class="chip ${on?'on':''}" data-a="acc" data-v="${esc(i.id)}">${on?'✓ ':''}${esc(i.name)}</button>`}).join(''):'<div style="color:var(--mut);font-size:14px">Belum ada. Buat di Studio (menu ☰ → Buat) atau beli di Marketplace.</div>')}
 return h+'</div>'}
function drawerFill(){const nn=me.notes.filter(n=>n.new).length,rl=(RN[me.role]||'')+(me.verified?' ✔':'');
 const it=(ic,t,v,b)=>`<button class="mi" data-a="dnav" data-v="${v}">${ico(ic,27)}<span>${t}</span>${b?`<i class="bd">${b}</i>`:''}</button>`;
 $('#dpn').innerHTML=`<div class="pf">${circ(me.av,70)}<div><b>${esc(me.name)}${vb(me)}</b><small>@${esc(me.name.toLowerCase())}</small><span id="rolep">${esc(rl)}</span></div></div>
 <div class="cur"><div class="cr">${ico('hex',27)}<b id="buxp">${me.bux}</b><button class="pb" data-a="daily">Bonus Harian</button></div><button class="plus" data-a="soon" data-v="Sandbox Plus">${ico('plus',27)}<span>Lebih seru, lebih hemat SandBux. Subscribe Sandbox Plus.</span>${ico('chev',20)}</button></div>
 ${it('bookmark','Favorit','fav')}${it('history','Lanjutkan Bermain','cont')}${it('friends','Teman','ppl:fr',FRD(me).i.length||'')}${it('comm','Komunitas','soon:Komunitas')}${it('pack','Inventaris','avatar:cust')}${it('swap','Penukaran','avatar:mkt')}${it('mail','Pesan','msg')}${it('bell','Notifikasi','notif',nn?(nn>99?'99+':nn):'')}${it('plus','Sandbox Plus','soon:Sandbox Plus')}${it('gift','Beli Gift Card','soon:Gift Card')}${it('gear','Pengaturan','set')}${it('shield','Bantuan &amp; Keamanan','soon:Bantuan')}${staff()?it('shield','Panel '+esc(RN[me.role]||''),'panel'):''}
 <div class="dv"></div>${it('learn','Pelajari','soon:Pelajari')}${it('create','Buat','create')}
 <button class="dbtn" data-a="out">Beralih Akun</button><button class="dbtn" data-a="soon" data-v="Log In Cepat">Log In Cepat</button>`}
function srchGo(q){q=q.trim().toLowerCase();const r=$('#sres');if(!q){r.innerHTML='';return}
 const f=pubGames().filter(g=>g.name.toLowerCase().includes(q));
 r.innerHTML=f.length?f.map(g=>{const t=okImg(g.thumb);return `<button class="sr" data-a="gopen" data-v="${esc(g.id)}"><span class="gt" style="background:${t?`url(${t}) center/cover`:`linear-gradient(135deg,${hexc(g.col,'#b6f25a')},${hexc(g.sky,'#7df9ff')})`}">${t?'':esc(g.emoji||String(g.name||'?').charAt(0).toUpperCase())}</span><b>${esc(g.name)}</b>${ico('chev',20)}</button>`}).join(''):'<div style="color:var(--mut);padding:12px 0">Game tidak ditemukan.</div>'}

Object.assign(act,{
 drawer(){drawerFill();$('#drawer').classList.add('on')},
 dclose(){$('#drawer').classList.remove('on')},
 dnav(v){act.dclose();if(v.startsWith('soon:'))return toast(v.slice(5)+' segera hadir');
  if(v=='cont'){page='home';thread=null;render();const e=$('#cont');if(e)e.scrollIntoView({block:'start'});return}
  if(v.startsWith('avatar:')){avt=v.slice(7);v='avatar'}act.go(v)},
 soon(v){toast((v||'Fitur')+' segera hadir')},
 srch(){const b=$('#sbar');b.classList.toggle('on');if(b.classList.contains('on'))$('#qin').focus();else{$('#qin').value='';$('#sres').innerHTML=''}},
 fr(n){page='msg';thread=n;render()},
 mf(v){mfil=v;render()}});
document.addEventListener('click',e=>{const t=e.target.closest('[data-a]');if(t&&(t.dataset.a=='gopen'||t.dataset.a=='play')&&$('#sbar')){$('#sbar').classList.remove('on');$('#qin').value='';$('#sres').innerHTML=''}},true);

navRender=function(){if(!me)return;const app=$('#app');app.dataset.p=page;
 document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('act',b.dataset.v==page));
 const c=me.notes.filter(n=>n.new).length,bc=$('#bcnt'),md=$('#mdot');
 if(bc){bc.textContent=c>99?'99+':c;bc.style.display=c?'block':'none'}if(md)md.style.display=c?'block':'none';
 const bp=$('#buxp');if(bp)bp.textContent=me.bux;const na=$('#navav');if(na)na.innerHTML=circ(me.av,30)};
rolePill=function(){if(!me)return;const e=$('#rolep');if(e)e.textContent=(RN[me.role]||'')+(me.verified?' ✔':'')};
const _r5=render;
render=function(){const m=$('#main'),keep=(page=='avatar'&&m.dataset.pg=='avatar')?m.scrollTop:0;_r5();
 if(page=='home')m.innerHTML='<div class="page">'+homeH()+'</div>';
 if(page=='avatar'){m.innerHTML='<div class="page">'+avP()+'</div>';m.scrollTop=keep}
 if(page=='msg'&&!thread)m.innerHTML='<div class="page">'+msgH()+'</div>';
 m.dataset.pg=page;navRender()};
const _sg5=startGame;
startGame=function(g,test){if(!test&&me&&g&&g.id){me.recent=[g.id].concat((me.recent||[]).filter(x=>x!=g.id)).slice(0,10);save()}return _sg5.apply(this,arguments)};
const _en5=enter;
enter=function(){_en5();buildChrome();page='home';render()};
if(me&&$('#app').classList.contains('on')){buildChrome();render()}else buildChrome();
;

/* ===== 12-sosial.js ===== */
/* ===== SOSIAL: teman, profil, detail game, bergabung ===== */
Object.assign(IC,{x:'<path d="M6 6l12 12M18 6L6 18"/>',more:'<circle cx="12" cy="12" r="9"/><circle cx="8" cy="12" r=".6" fill="currentColor"/><circle cx="12" cy="12" r=".6" fill="currentColor"/><circle cx="16" cy="12" r=".6" fill="currentColor"/>',invite:'<rect x="4" y="3.5" width="6" height="6" rx="1"/><path d="M4 21v-6.5h6V21M13 8h6v7h-6zM13 18l7 3-7 3z" transform="translate(0 -3) scale(.95)"/>',play:'<path d="M7 4.5v15l13-7.5z" fill="currentColor"/>',star:'<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z"/>',thumbd:'<path d="M8 13V4H4v9zM8 13l4 7c1.6 0 2.6-1.3 2.2-2.8L13.5 14H19a1.5 1.5 0 0 0 1.4-1.9L18.6 5.5A2 2 0 0 0 16.7 4H8"/>',bellx:'<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 21h4"/>'});
const BN=[],BOTS={};
BN.forEach((n,i)=>BOTS[n]={n,gi:i,av:{skin:SKIN[i%SKIN.length],shirt:SHIRT[(i+1)%SHIRT.length],pants:PANTS[1],hat:['none','cap','crown','none'][i]},fr:12+i*7,fl:30+i*11,fg:20+i*3});
const isBot=n=>!!BOTS[n]&&!users[n];
function FRD(u){u.fr=u.fr||{};['f','i','o','fo'].forEach(k=>{if(!Array.isArray(u.fr[k]))u.fr[k]=[]});return u.fr}
function pinfo(n){if(users[n])return{n,av:users[n].av,u:users[n]};if(BOTS[n])return{n,av:BOTS[n].av,bot:1};return null}
function rel(n){const f=FRD(me);return f.f.includes(n)?'friend':f.o.includes(n)?'sent':f.i.includes(n)?'recv':'none'}
function presOf(n){if(isBot(n)){const g=BASE[BOTS[n].gi%BASE.length];return{g:g.id,room:'bot-'+n.toLowerCase()}}const u=users[n],p=u&&u.pres;return p&&p.g?p:null}
function pushNote(u,t){u.notes=u.notes||[];u.notes.unshift({t,new:1});save();if(u===me)navRender()}
const fmtN=n=>n>=1e6?(n/1e6).toFixed(1).replace('.',',')+' jt':n>=1e3?(n/1e3).toFixed(1).replace('.',',')+' rb':String(n);
function counts(n){if(isBot(n)){const b=BOTS[n],f=FRD(me);return{fr:b.fr+(rel(n)=='friend'?1:0),fl:b.fl+(f.fo.includes(n)?1:0),fg:b.fg}}
 const u=users[n];return{fr:FRD(u).f.length,fl:Object.keys(users).filter(k=>FRD(users[k]).fo.includes(n)).length,fg:FRD(u).fo.length}}
function friends(){return FRD(me).f.filter(n=>pinfo(n)).map(n=>{const p=pinfo(n),ps=presOf(n),g=ps&&allGames().find(x=>x.id==ps.g);return{n,a:p.av,g:g?g.name:'Offline',pl:!!g}})}
const playingFriends=gid=>FRD(me).f.filter(n=>{const p=presOf(n);return p&&p.g==gid});
const lastMsg=n=>{const c=(me.chat||{})[n]||[];return c[c.length-1]};

/* ---- aksi pertemanan ---- */
function botAcc(n){if(!me||!FRD(me).o.includes(n))return;const f=FRD(me);f.o=f.o.filter(x=>x!=n);if(!f.f.includes(n))f.f.push(n);pushNote(me,''+n+' menerima permintaan pertemananmu');toast(n+' menerima permintaanmu');refreshUI()}
function refreshUI(){if(!me||!$('#app').classList.contains('on'))return;if(OVS.length)ovRender();if(page=='home'||page=='msg'||page=='fav')render();else navRender()}
Object.assign(act,{
 freq(n){if(rel(n)!='none'||!pinfo(n))return;FRD(me).o.push(n);if(isBot(n))setTimeout(()=>botAcc(n),1800);else{FRD(users[n]).i.push(me.name);pushNote(users[n],''+me.name+' mengirim permintaan pertemanan')}save();toast('Permintaan dikirim ke '+n);refreshUI()},
 facc(n){const f=FRD(me);if(!f.i.includes(n))return;f.i=f.i.filter(x=>x!=n);if(!f.f.includes(n))f.f.push(n);if(users[n]){const g=FRD(users[n]);g.o=g.o.filter(x=>x!=me.name);if(!g.f.includes(me.name))g.f.push(me.name);pushNote(users[n],''+me.name+' menerima permintaan pertemananmu')}save();toast('Sekarang berteman dengan '+n);refreshUI()},
 fdec(n){const f=FRD(me);f.i=f.i.filter(x=>x!=n);if(users[n]){const g=FRD(users[n]);g.o=g.o.filter(x=>x!=me.name)}save();refreshUI()},
 fcan(n){const f=FRD(me);f.o=f.o.filter(x=>x!=n);if(users[n]){const g=FRD(users[n]);g.i=g.i.filter(x=>x!=me.name)}save();toast('Permintaan dibatalkan');refreshUI()},
 funf(n){const f=FRD(me);f.f=f.f.filter(x=>x!=n);if(users[n]){const g=FRD(users[n]);g.f=g.f.filter(x=>x!=me.name)}if(thread==n)thread=null;save();shClose();toast('Berteman dengan '+n+' diakhiri');refreshUI()},
 ffol(n){const f=FRD(me),i=f.fo.indexOf(n);i<0?f.fo.push(n):f.fo.splice(i,1);save();toast(i<0?'Kamu mengikuti '+n:'Berhenti mengikuti '+n);refreshUI()}});

/* ---- sheet bawah & overlay ---- */
const OVS=[];let PQ='',ptab='add',gcache=0;
function shOpen(h){$('#shp').innerHTML=h;$('#sh').classList.add('on')}
function shClose(){$('#sh').classList.remove('on')}
function ovOpen(t,a){shClose();OVS.push({t,a});ovRender(1)}
function ovRender(fresh){const o=$('#ov'),tp=OVS[OVS.length-1];if(!tp){o.classList.remove('on');o.innerHTML='';return}
 const y=fresh?0:o.scrollTop;o.innerHTML=({game:gameOv,prof:profOv,ppl:pplOv})[tp.t](tp.a);o.classList.add('on');o.scrollTop=y}
function ovClear(){OVS.length=0;shClose();ovRender()}
Object.assign(act,{ovb(){shClose();OVS.pop();ovRender()},shx(){shClose()},
 gopen(id){ovOpen('game',id)},prof(n){if(pinfo(n)||n==me.name)ovOpen('prof',n)},
 ptab(v){ptab=v;PQ='';ovRender()},
 fr(n){const p=pinfo(n);if(!p)return;const ps=presOf(n),g=ps&&allGames().find(x=>x.id==ps.g),t=g?okImg(g.thumb):'';
  shOpen(`<div class="sht" style="${g?`background:${t?`url(${t}) center/cover`:`linear-gradient(135deg,${hexc(g.col,'#b6f25a')},${hexc(g.sky,'#7df9ff')})`}`:''}">${g?(t?'':esc(g.emoji||String(g.name||'?').charAt(0).toUpperCase())):circ(p.av,150)}</div><div class="shn">${g?esc(g.name):esc(n)+' · Offline'}</div>${g?`<button class="sb pr" data-a="join" data-v="${esc(n)}">Bergabung</button>`:''}<button class="sb" data-a="chatw" data-v="${esc(n)}">Chat dengan ${esc(n)}</button><button class="sb ln" data-a="prof" data-v="${esc(n)}">Lihat profil</button>`)},
 join(n){if(rel(n)!='friend')return toast('Kamu harus berteman dulu untuk bergabung');const ps=presOf(n),g=ps&&allGames().find(x=>x.id==ps.g);if(!g)return toast(n+' sedang tidak bermain');roomCode=String(ps.room||'publik').toLowerCase().replace(/[^a-z0-9-]/g,'').slice(0,16)||'publik';save();ovClear();startGame(g)},
 chatw(n){if(rel(n)!='friend')return toast('Terima pertemanan dulu untuk chat');ovClear();page='msg';thread=n;render()},
 glike(id){const l=me.lk=me.lk||{};l[id]=l[id]==1?0:1;save();ovRender()},gdis(id){const l=me.lk=me.lk||{};l[id]=l[id]==-1?0:-1;save();ovRender()},
 gfav(id){const a=me.favs=me.favs||[],i=a.indexOf(id);i<0?a.push(id):a.splice(i,1);save();toast(i<0?'Ditambahkan ke Favorit':'Dihapus dari Favorit');ovRender()},
 gnot(id){const n=me.nots=me.nots||{};n[id]=!n[id];save();toast(n[id]?'Notifikasi game aktif':'Notifikasi game mati');ovRender()},
 gfrp(id){const l=playingFriends(id);if(!l.length)return;shOpen('<div class="shn" style="margin-top:6px">Teman yang sedang bermain</div>'+l.map(n=>`<div class="ur"><button class="ura" data-a="prof" data-v="${esc(n)}">${circ(pinfo(n).av,48)}<span><b>${esc(n)}</b></span></button><button class="ub bl" data-a="join" data-v="${esc(n)}">Bergabung</button></div>`).join(''))},
 gmenu(){shOpen(`<div class="shn" style="margin-top:6px">Kode room</div><input class="shin" type="text" id="rc2" maxlength="16" value="${esc(roomCode)}" oninput="roomCode=this.value.toLowerCase().replace(/[^a-z0-9-]/g,'')||'publik';save()"><button class="sb" data-a="rcrnd">Acak kode</button><button class="sb" data-a="rccopy">Salin kode</button><button class="sb ln" data-a="shx">Tutup</button>`)},
 rcrnd(){roomCode=Math.random().toString(36).slice(2,6);save();const i=$('#rc2');if(i)i.value=roomCode;toast('Kode room: '+roomCode)},
 rccopy(){try{navigator.clipboard.writeText(roomCode)}catch(e){}toast('Kode room "'+roomCode+'" — bagikan ke temanmu')},
 ginv(){act.gmenu()}});

/* ---- tampilan: detail game ---- */
function gameOv(id){const g=allGames().find(x=>x.id==id);if(!g)return'<div class="otop"><button class="rb" data-a="ovb">'+ico('x',28)+'</button></div><div class="empty">Game tidak ditemukan.</div>';
 const t=okImg(g.thumb),ic=okImg(g.icon),c1=hexc(g.col,'#b6f25a'),c2=hexc(g.sky,'#7df9ff'),bg=t?`url(${t}) center/cover`:`linear-gradient(135deg,${c1},${c2})`,lk=(me.lk||{})[g.id]||0,fav=(me.favs||[]).includes(g.id),nt=(me.nots||{})[g.id],pf=playingFriends(g.id),by=g.by||'Sandbox',bu=users[by],vis=(ls.get('sp_vis',{})[g.id]||0)+(g.pl||1)*1300,
  others=pubGames().filter(x=>x.id!=g.id),dt=new Date().toLocaleDateString('id-ID');
 return `<div class="otop"><button class="rb" data-a="ovb" aria-label="Tutup">${ico('x',30)}</button></div><div class="gsheet">
 <div class="ghead"><span class="gico" style="background:${ic?`url(${ic}) center/cover`:bg}">${ic?'':esc(g.emoji||String(g.name||'?').charAt(0).toUpperCase())}</span><div><h1>${esc(g.name)}</h1><p>oleh ${esc(by)}${bu?vb(bu):''}</p><small>Kedewasaan: Minimal</small></div></div>
 <div class="gshot" style="background:${bg}">${t?'':esc(g.emoji||String(g.name||'?').charAt(0).toUpperCase())}</div>
 <div class="gchips"><span class="gch"><button class="${lk==1?'on':''}" data-a="glike" data-v="${esc(g.id)}">${ico('thumb',22)} ${g.lk>0?(+g.lk)+'%':'Baru'}</button><hr><button class="${lk==-1?'on':''}" data-a="gdis" data-v="${esc(g.id)}">${ico('thumbd',22)}</button></span><span class="gch">${ico('friends',22)} ${fmtN((g.pl||1)+pf.length)} aktif</span><button class="gch ${nt?'on':''}" data-a="gnot" data-v="${esc(g.id)}">${ico('bell',22)} Notifikasi</button><button class="gch ${fav?'on':''}" data-a="gfav" data-v="${esc(g.id)}">${ico('star',22)} Favorit</button></div>
 <button class="gplay" ${pf.length?`data-a="gfrp" data-v="${esc(g.id)}"`:''}>${pf.length?`<span class="stk">${pf.slice(0,3).map(n=>circ(pinfo(n).av,34)).join('')}</span><span>Dimainkan oleh <b>${esc(pf[0])}</b>${pf.length>1?' dan <b>'+(pf.length-1)+' teman lainnya</b>':''} — ketuk untuk bergabung</span>`:'<span>Belum ada temanmu yang sedang bermain ini.</span>'}</button>
 <h3>Deskripsi</h3><p class="ds">${esc(g.desc||'Selamat datang di '+g.name+'! Lompati platform dan capai garis finish bersama teman.')}</p>
 <h3>Informasi</h3>
 <div class="irow"><span>Kunjungan</span><b>${fmtN(vis)}</b></div><div class="irow"><span>Kedewasaan Konten</span><b>Minimal</b></div><div class="irow"><span>Pengembang</span><b>${bu?`<a data-a="prof" data-v="${esc(by)}" style="cursor:pointer">${esc(by)}</a>`:esc(by)}${bu?vb(bu):(window.spVb?spVb(by):'')}</b></div><div class="irow"><span>Ukuran Server</span><b>8</b></div><div class="irow"><span>Genre</span><b>${g.mine?'Buatan Pemain':'Obby'}</b></div><div class="irow"><span>Di-update</span><b>${dt}</b></div><div class="irow"><span>Kode room</span><b>${esc(roomCode)}</b></div>
 ${others.length?`<h3>Pengguna lain juga ikut</h3><div class="hs" style="margin:0 -16px;padding:0 16px">${others.map(gcard).join('')}</div>`:''}
 </div><div class="gbar"><button class="gb" data-a="gmenu" aria-label="Opsi">${ico('more',34)}</button><button class="gb" data-a="gmenu" aria-label="Undang">${ico('invite',34)}</button><button class="gplayb" data-a="play" data-v="${esc(g.id)}" aria-label="Main">${ico('play',34)}</button></div>`}

/* ---- tampilan: cari orang / teman ---- */
function uact(n){const r=rel(n);return r=='friend'?'<span class="tg2">Teman</span>':r=='sent'?`<button class="ub" data-a="fcan" data-v="${esc(n)}">Batalkan</button>`:r=='recv'?`<button class="ub bl" data-a="facc" data-v="${esc(n)}">Terima</button><button class="ub" data-a="fdec" data-v="${esc(n)}">Tolak</button>`:`<button class="ub bl" data-a="freq" data-v="${esc(n)}">Tambah</button>`}
function urow(n,sub,act2){const p=pinfo(n);if(!p)return'';return `<div class="ur"><button class="ura" data-a="prof" data-v="${esc(n)}">${circ(p.av,52)}<span><b>${esc(n)}${p.u?vb(p.u):((window.spVerified&&window.spVerified(n))?'<span class="vb">✔</span>':'')}</b><small>${sub}</small></span></button>${act2||uact(n)}</div>`}
const allPeople=()=>Object.keys(users).filter(k=>k!==me.name&&!users[k].role&&!banOf(users[k])).concat(BN.filter(n=>!users[n]));
const subOf=n=>'@'+esc(String(n).toLowerCase());
function pplList(){const q=PQ.trim().toLowerCase(),f=FRD(me);
 if(q){const r=allPeople().filter(n=>n.toLowerCase().includes(q));return `<div class="ps">Hasil pencarian</div>`+(r.length?r.map(n=>urow(n,subOf(n))).join(''):'<div class="empty">Tidak ada pengguna dengan nama itu.</div>')}
 if(ptab=='fr'){const fl=friends();return fl.length?fl.map(x=>urow(x.n,x.pl?'Bermain: '+esc(x.g):'Offline',`<button class="ub" data-a="chatw" data-v="${esc(x.n)}">Chat</button>${x.pl?`<button class="ub bl" data-a="join" data-v="${esc(x.n)}">Gabung</button>`:''}`)).join(''):'<div class="empty">Belum ada teman.<br>Cari orang di tab "Tambah teman".</div>'}
 let h='';if(f.i.length)h+=`<div class="ps">Permintaan masuk (${f.i.length})</div>`+f.i.map(n=>urow(n,'Ingin berteman denganmu')).join('');
 if(f.o.length)h+=`<div class="ps">Permintaan terkirim</div>`+f.o.map(n=>urow(n,'Menunggu persetujuan')).join('');
 const sg=allPeople().filter(n=>rel(n)=='none');h+=`<div class="ps">Orang yang mungkin kamu kenal</div>`+(sg.length?sg.map(n=>urow(n,subOf(n))).join(''):'<div class="empty">Tidak ada saran lagi.</div>');return h}
function pplOv(){const bi=FRD(me).i.length;return `<div class="pph"><button class="rb" data-a="ovb" aria-label="Kembali">${ico('back',28)}</button><input type="text" id="pq" placeholder="Cari orang" value="${esc(PQ)}" autocomplete="off" maxlength="20"></div><div class="ptabs"><button class="${ptab=='add'?'on':''}" data-a="ptab" data-v="add">Tambah teman${bi?' ('+bi+')':''}</button><button class="${ptab=='fr'?'on':''}" data-a="ptab" data-v="fr">Teman</button></div><div class="pbody" id="pl">${pplList()}</div>`}
document.addEventListener('input',e=>{if(e.target.id=='pq'){PQ=e.target.value;const l=$('#pl');if(l)l.innerHTML=pplList()}});

/* ---- tampilan: profil ---- */
function wearTiles(u){const a=u.av||{},t=(l,c)=>`<div class="wt"><i style="background:${hexc(c,'#888')}"></i>${l}<small>Tidak Dijual</small></div>`,
 mt=i=>{const im=okImg(i.icon);if(im)return `<img src="${im}" alt="">`;const m=window.modelThumb(i.objs,i.id);return m?`<img src="${m}" alt="">`:esc(String(i.name||'?').charAt(0).toUpperCase())},
 acc=(a.acc||[]).map(id=>(u.items||(u.u&&u.u.items)||[]).find(i=>i.id==id)).filter(Boolean).map(i=>`<div class="wt"><i style="background:#3b2023">${mt(i)}${window.itemLim&&window.itemLim(i)?'<span class="lu"><span class="la">LIMITED</span><span class="lb">U</span></span>':''}</i>${esc(i.name)}<small>${window.itemLim&&window.itemLim(i)?'Limited U':'Aksesori'}</small></div>`).join('');
 return t('Kulit',a.skin)+t('Baju',a.shirt)+t('Celana',a.pants)+(a.hat&&a.hat!='none'?`<div class="wt"><i style="background:#3b2023">${avHTML(Object.assign({},a,{acc:[]}),7)}</i>${a.hat=='crown'?'Mahkota':'Topi'}<small>Tidak Dijual</small></div>`:'')+acc}
function profOv(n){const self=n==me.name,p=self?{n,av:me.av,u:me}:pinfo(n);if(!p)return'<div class="otop"><button class="rb" data-a="ovb">'+ico('back',28)+'</button></div><div class="empty">Pengguna tidak ditemukan.</div>';
 const r=self?'self':rel(n),c=self?{fr:FRD(me).f.length,fl:Object.keys(users).filter(k=>FRD(users[k]).fo.includes(n)).length,fg:FRD(me).fo.length}:counts(n),fo=FRD(me).fo.includes(n),ps=self?null:presOf(n),gm=ps&&allGames().find(x=>x.id==ps.g),
 mine=p.u?(p.u.games||[]).filter(g=>g.pub!==false&&!(g.rv&&g.rv.s&&g.rv.s!=='approved')):[];
 let b='';
 if(self)b=`<button class="bl" data-a="edav">Edit Avatar</button>`;
 else if(r=='none')b=`<button class="bl" data-a="freq" data-v="${esc(n)}">Tambahkan Teman</button><button data-a="ffol" data-v="${esc(n)}">${fo?'Mengikuti':'Ikuti'}</button>`;
 else if(r=='sent')b=`<button data-a="fcan" data-v="${esc(n)}">Permintaan terkirim · Batalkan</button><button data-a="ffol" data-v="${esc(n)}">${fo?'Mengikuti':'Ikuti'}</button>`;
 else if(r=='recv')b=`<button class="bl" data-a="facc" data-v="${esc(n)}">Terima</button><button data-a="fdec" data-v="${esc(n)}">Tolak</button>`;
 else b=`<button class="bl" data-a="chatw" data-v="${esc(n)}">Chat</button>${gm?`<button class="bl" data-a="join" data-v="${esc(n)}">Bergabung</button>`:''}<button data-a="ffol" data-v="${esc(n)}">${fo?'Mengikuti':'Ikuti'}</button>`;
 if(!self)b+=`<button class="sm" data-a="pmore" data-v="${esc(n)}" aria-label="Lainnya">${ico('more',26)}</button>`;
 return `<div class="otop" style="position:absolute;left:0;right:0;background:none"><button class="rb" data-a="ovb" aria-label="Tutup">${ico('x',30)}</button></div><div class="pst"><div id="pst3" data-n="${esc(n)}" style="width:100%;height:100%">${avHTML(p.av,12)}</div></div>
 <div class="pid">${circ(p.av,72)}<div><b>${esc(n)}${p.u?vb(p.u):((window.spVerified&&window.spVerified(n))?'<span class="vb">✔</span>':'')}</b><small>@${esc(String(n).toLowerCase())}</small></div></div>
 <div class="pch"><span>${c.fr} Teman</span><span class="dm">${c.fl} Pengikut</span><span class="dm">${c.fg} Mengikuti</span></div>
 ${gm&&r=='friend'?`<div class="pch" style="padding-top:0"><span style="background:#1f6b3f">● Bermain: ${esc(gm.name)}</span></div>`:''}
 <div class="pbt">${b}</div>
 <h3 class="sec" style="padding:0 16px">Saat ini Memakai</h3><div class="wr">${wearTiles(p)}</div>
 ${mine.length?`<h3 class="sec" style="padding:0 16px">Game buatan ${esc(n)}</h3><div class="hs">${mine.map(gcard).join('')}</div>`:''}<div style="height:40px"></div>`}
Object.assign(act,{edav(){ovClear();avt='cust';page='avatar';render()},
 pmore(n){shOpen(`<div class="shn" style="margin-top:6px">${esc(n)}</div>${rel(n)=='friend'?`<button class="sb" data-a="funf" data-v="${esc(n)}">Hapus teman</button>`:''}<button class="sb" data-a="cpn" data-v="${esc(n)}">Salin username</button><button class="sb ln" data-a="shx">Tutup</button>`)},
 cpn(n){try{navigator.clipboard.writeText(n)}catch(e){}shClose();toast('Username disalin')}});

/* ---- beranda: hanya teman yang sudah diterima ---- */
homeH=function(){const gs=pubGames(),rec=(me.recent||[]).map(id=>gs.find(g=>g.id==id)).filter(Boolean),bi=FRD(me).i.length;
 return `<div class="who" data-a="prof" data-v="${esc(me.name)}" style="cursor:pointer">${circ(me.av,46)}<span>${esc(me.name)}${vb(me)}</span></div>
 <div class="frs"><button class="fr add" data-a="ppl"><span class="circw"><span class="circ" style="--s:92px">${ico('adduser',40)}</span>${bi?`<i class="bdg">${bi}</i>`:''}</span><em>Tambah Teman</em></button>${friends().map(f=>`<button class="fr" data-a="fr" data-v="${esc(f.n)}"><span class="circw">${circ(f.a,92)}${f.pl||isBot(f.n)?'<i class="on"></i>':''}</span><em>${esc(f.n)}</em><small>${esc(f.pl?f.g:'Offline')}</small></button>`).join('')}</div>
 <h3 class="sec">Direkomendasikan untukmu</h3><div class="gg">${gs.map(gcard).join('')}</div>
 <h3 class="sec" id="cont">${rec.length?'Lanjutkan':'Populer'} ${ico('chev',20)}</h3><div class="hs">${(rec.length?rec:gs).map(gcard).join('')}</div>
 <h3 class="sec">Mabar bareng teman</h3><div class="card row" style="flex-wrap:wrap"><div style="flex:1;min-width:150px"><label>Kode room</label><input type="text" id="rc" value="${esc(roomCode)}" maxlength="16" style="margin:6px 0 0" oninput="roomCode=this.value.toLowerCase().replace(/[^a-z0-9-]/g,'')||'publik';save()"></div><button class="btn g" data-a="rnd">Acak</button></div>`};
act.ppl=function(){PQ='';ptab='add';ovOpen('ppl')};
const _dn6=act.dnav;act.dnav=function(v){if(v.startsWith('ppl:')){act.dclose();ptab=v.slice(4);PQ='';return ovOpen('ppl')}return _dn6(v)};

/* ---- chat: hanya teman ---- */
msgH=function(){const fl=friends();return '<h2>Chat</h2>'+(fl.length?fl.map(f=>{const m=lastMsg(f.n),un=((me.unr||{})[f.n]||0);return `<button class="crow" data-a="open" data-v="${esc(f.n)}">${circ(f.a,54)}<span><b>${esc(f.n)}${un?'<i class="dot2"></i>':''}</b><small class="lm">${m?esc((m.me?'Kamu: ':'')+m.t):(f.pl?'Bermain: '+esc(f.g):'Mulai ngobrol')}</small></span></button>`}).join(''):`<div class="empty">Kamu belum punya teman.<br>Tambahkan teman dulu untuk chat dan mabar.<br><br><button class="btn g" data-a="ppl">Cari Teman</button></div>`)};
function thrH(){const n=thread,p=pinfo(n),ok=rel(n)=='friend';if(!p)return '<div class="empty">Pengguna tidak ditemukan.</div><button class="btn" data-a="back">← Kembali</button>';
 if(me.unr)delete me.unr[n];const ps=ok?presOf(n):null,gm=ps&&allGames().find(x=>x.id==ps.g),ms=(me.chat||{})[n]||[];
 return `<div class="thh"><button class="rb" data-a="back" aria-label="Kembali">${ico('back',26)}</button>${circ(p.av,40)}<button class="nm" data-a="prof" data-v="${esc(n)}">${esc(n)}<small>${ok?(gm?'Bermain: '+esc(gm.name):'Offline'):'Bukan teman'}</small></button>${gm?`<button class="ub bl" data-a="join" data-v="${esc(n)}">Gabung</button>`:''}</div>
 <div class="thm">${ms.length?ms.map(b=>`<div class="bubble ${b.me?'me':''}">${esc(b.t)}</div>`).join(''):'<div class="empty">Belum ada pesan. Sapa '+esc(n)+'!</div>'}</div>
 ${ok?`<div class="thi"><input type="text" id="mi" placeholder="Tulis pesan" maxlength="200" autocomplete="off"><button class="btn g" data-a="say">Kirim</button></div>`:`<div class="empty">Kamu harus berteman dulu untuk chat.<br><br><button class="btn c" data-a="prof" data-v="${esc(n)}">Lihat profil</button></div>`}`}
act.say=function(){const i=$('#mi');if(!i||!thread)return;const t=i.value.trim(),n=thread;if(!t||rel(n)!='friend')return;
 (me.chat=me.chat||{})[n]=(me.chat[n]||[]).concat({me:1,t,ts:Date.now()}).slice(-80);
 if(users[n]){const u=users[n];(u.chat=u.chat||{})[me.name]=(u.chat[me.name]||[]).concat({me:0,t,ts:Date.now()}).slice(-80);(u.unr=u.unr||{})[me.name]=((u.unr||{})[me.name]||0)+1}
 else setTimeout(()=>{if(!me||rel(n)!='friend')return;const r=['Haha keren!','Ayo mabar ','Aku lagi di '+(allGames().find(x=>x.id==(presOf(n)||{}).g)||{name:'game'}).name,'Oke siap!','Gas!'][Math.random()*5|0];(me.chat[n]=me.chat[n]||[]).push({me:0,t:r,ts:Date.now()});save();if(page=='msg'&&thread==n)render()},900);
 save();render();const m=$('#mi');if(m)m.focus()};
document.addEventListener('keydown',e=>{if(e.key=='Enter'&&e.target.id=='mi'){e.preventDefault();act.say()}});

/* ---- Favorit & Kustomisasi bertab ---- */
let ctab='av';act.ct=function(v){ctab=v;render()};
avP=function(){const own=it=>(me.items||[]).some(x=>x.src==it.key||'u_'+me.name+'_'+x.id==it.key);
 let h=`<div class="atop"><button class="rb" data-a="go" data-v="home" aria-label="Kembali">${ico('back',28)}</button><div class="seg"><button class="${avt=='mkt'?'on':''}" data-a="avt" data-v="mkt">Marketplace</button><button class="${avt!='mkt'?'on':''}" data-a="avt" data-v="cust">Kustomisasi</button></div><span class="bx">${ico('hex',20)} ${me.bux}</span></div><div class="stage">${avHTML(me.av,13)}</div><div class="sheet"><i class="grab"></i>`;
 if(avt=='mkt'){const all=mkItems(),f=all.filter(it=>!it.lim&&(mfil=='all'||(mfil=='off'?it.by=='Sandbox':it.by!='Sandbox')));
  h+=`<div class="ban">${ico('hex',20)}<span>Kamu punya <b>${me.bux}</b> SandBux. Item kreator muncul setelah dipublish.</span></div><div class="chips">${[['all','Semua'],['off','Resmi'],['cr','Kreator']].map(c=>`<button class="${mfil==c[0]?'on':''}" data-a="mf" data-v="${c[0]}">${c[1]}</button>`).join('')}</div>`+
  (f.length?`<div class="ig">${f.map(it=>{const im=okImg(it.icon),o=own(it);return `<button class="it" data-a="buy" data-v="${esc(it.key)}"><span class="ith">${im?`<img src="${im}" alt="">`:esc(it.e||String(it.name||'?').charAt(0).toUpperCase())}</span><strong>${esc(it.name)}</strong><small>${esc(it.by)}${it.v?' ✔':''}</small><em>${o?'Dimiliki':ico('hex',15)+' '+(+it.price||0)}</em></button>`}).join('')}</div>`:'<div style="color:var(--mut);padding:20px 0;text-align:center">Belum ada item.</div>')}
 else{const sw=(k,arr)=>`<div class="sws">${arr.map(c=>`<span class="sw ${me.av[k]==c?'sel':''}" style="background:${c}" data-a="av" data-k="${k}" data-v="${c}"></span>`).join('')}</div>`;
  h+=`<div class="chips" style="margin-top:4px">${[['av','Avatar'],['body','Tubuh'],['cloth','Pakaian'],['acc','Aksesori']].map(c=>`<button class="${ctab==c[0]?'on':''}" data-a="ct" data-v="${c[0]}">${c[1]}</button>`).join('')}</div>`;
  if(ctab=='av')h+=`<div class="sl" style="margin-top:0">Sedang dipakai</div><div class="wr" style="padding:0">${wearTiles(me)}</div><button class="sb" style="margin-top:18px;background:#4d2a2d;border:0;border-radius:12px;padding:15px;width:100%;font:700 16px Inter,sans-serif;color:#fff;cursor:pointer" data-a="avt" data-v="mkt">Buka Marketplace</button>`;
  if(ctab=='body')h+=`<div class="sl" style="margin-top:0">Warna kulit</div>${sw('skin',SKIN)}`;
  if(ctab=='cloth')h+=`<div class="sl" style="margin-top:0">Baju</div>${sw('shirt',SHIRT)}<div class="sl">Celana</div>${sw('pants',PANTS)}`;
  if(ctab=='acc'){const its=me.items||[];h+=`<div class="sl" style="margin-top:0">Topi</div>${[['none','Polos'],['cap','Topi'],['crown','Mahkota']].map(x=>`<button class="chip ${me.av.hat==x[0]?'on':''}" data-a="av" data-k="hat" data-v="${x[0]}">${x[1]}</button>`).join('')}<div class="sl">Aksesori 3D saya</div>`+(its.length?`<div class="ig">${its.map(i=>{const on=(me.av.acc||[]).includes(i.id),im=okImg(i.icon);return `<button class="it" data-a="acc" data-v="${esc(i.id)}"><span class="ith" style="${on?'outline:3px solid #fff':''}">${im?`<img src="${im}" alt="">`:''}</span><strong>${esc(i.name)}</strong><small>${on?'✓ Dipakai':esc(i.slot||'Kepala')}</small></button>`}).join('')}</div>`:'<div style="color:var(--mut);font-size:14px">Belum ada. Beli di Marketplace atau buat di Studio.</div>')}}
 return h+'</div>'};
const _r7=render;
render=function(){_r7();const m=$('#main');
 if(page=='fav'){const gs=pubGames().filter(g=>(me.favs||[]).includes(g.id));m.innerHTML='<div class="page"><h2>Favorit</h2>'+(gs.length?'<div class="gg">'+gs.map(gcard).join('')+'</div>':'<div class="empty">Belum ada favorit.<br>Buka sebuah game lalu ketuk ★ Favorit.</div>')+'</div>'}
 if(page=='msg'){m.innerHTML='<div class="page">'+(thread?thrH():msgH())+'</div>';if(thread){m.scrollTop=m.scrollHeight;const i=$('#mi');if(i&&!navigator.maxTouchPoints)i.focus()}}
 navRender()};

/* ---- presence, kunjungan, bot pending ---- */
const _sg7=startGame;
startGame=function(g,test){if(!test&&me&&g&&g.id){me.pres={g:g.id,room:roomCode,t:Date.now()};const v=ls.get('sp_vis',{});v[g.id]=(v[g.id]||0)+1;ls.set('sp_vis',v);save()}ovClear();return _sg7.apply(this,arguments)};
const _st7=stopGame;
stopGame=function(){if(me){me.pres=null;save()}return _st7.apply(this,arguments)};
const _out7=act.out;act.out=function(){if(me){me.pres=null;save()}ovClear();return _out7.apply(this,arguments)};
const _en7=enter;
enter=function(){_en7();FRD(me).o.filter(isBot).forEach((n,i)=>setTimeout(()=>botAcc(n),1200+i*600));if(!$('#ov')){$('#app').insertAdjacentHTML('beforeend','<div id="ov"></div><div id="sh"><div id="shs" data-a="shx"></div><div id="shp"></div></div>')}};
if(!$('#ov'))$('#app').insertAdjacentHTML('beforeend','<div id="ov"></div><div id="sh"><div id="shs" data-a="shx"></div><div id="shp"></div></div>');
if(me&&$('#app').classList.contains('on')){FRD(me).o.filter(isBot).forEach((n,i)=>setTimeout(()=>botAcc(n),1200+i*600));render()}

/* perbaikan: animasi saldo tidak lagi bergantung pada menu samping */
addBux=function(n){me.bux+=n;save();const p=document.querySelector('.hb[data-a=daily]');if(p){p.classList.remove('bump');void p.offsetWidth;p.classList.add('bump')}navRender()};
;

/* ===== 13-sandbox-v6.js ===== */
/* ===== SANDBOX v6: redeem code, report, ban, promosi, beranda tanpa demo ===== */
(function(){
const NOW=()=>Date.now();
const fmtDT=t=>new Date(t).toLocaleString('id-ID',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
const ago=t=>{const s=Math.max(1,(NOW()-t)/1000|0);if(s<60)return s+' dtk lalu';const m=s/60|0;if(m<60)return m+' mnt lalu';const h=m/60|0;if(h<24)return h+' jam lalu';return (h/24|0)+' hari lalu'};
const normCode=v=>String(v||'').toUpperCase().replace(/[^A-Z0-9-]/g,'').slice(0,24);
const codes=()=>{const c=ls.get('sp_codes',{});return c&&typeof c=='object'&&!Array.isArray(c)?c:{}},setCodes=c=>ls.set('sp_codes',c);
const promos=()=>{const p=ls.get('sp_promo',[]);return(Array.isArray(p)?p:[]).filter(x=>!x.until||x.until>NOW())},setPromos=p=>ls.set('sp_promo',p);
const userKey=n=>{n=String(n||'').trim().toLowerCase();return n?Object.keys(users).find(k=>k.toLowerCase()==n)||null:null};
const creatorOf=gid=>Object.keys(users).find(k=>(users[k].games||[]).some(g=>g.id==gid))||null;
const DUR={'1h':36e5,'1d':864e5,'3d':3*864e5,'7d':7*864e5,'30d':30*864e5};
const DURL={'1h':'1 jam','1d':'1 hari','3d':'3 hari','7d':'7 hari','30d':'30 hari','perm':'Permanen'};
const REASONS=['Spam','Kata kasar / pelecehan','Curang / cheat','Penipuan','Username tidak pantas','Lainnya'];
let _bt=null,_rt=null,_rr=0;
pt='rep';

/* ---------- laporan ---------- */
function repAll(){let r=ls.get('sp_rep',[]);if(!Array.isArray(r))r=[];let ch=0;r.forEach((x,i)=>{if(!x.id){x.id='r'+(x.t||0)+'_'+i;ch=1}if(!x.st){x.st='open';ch=1}});if(ch)ls.set('sp_rep',r);return r}
const repOpen=()=>repAll().filter(r=>r.st=='open');
function addReport(o){const r=repAll();
 if(r.some(x=>x.st=='open'&&x.by==me.name&&x.type==o.type&&String(x.tg||'').toLowerCase()==String(o.tg||'').toLowerCase()))return false;
 r.unshift(Object.assign({id:'r'+NOW().toString(36)+Math.random().toString(36).slice(2,5),t:NOW(),st:'open',by:me.name},o));
 ls.set('sp_rep',r.slice(0,200));
 Object.keys(users).forEach(k=>{if(lv(users[k])>0&&users[k]!==me)pushNote(users[k],'Report baru: '+me.name+(o.tg?' melaporkan '+o.tg:' mengirim laporan'))});
 return true}

/* ---------- ban ---------- */
const banTxt=b=>b.perm?'permanen':'sampai '+fmtDT(b.until);
const canBan=k=>{const u=users[k];return !!u&&staff()&&u!==me&&u.role!=='owner'&&okT(u)};
function applyBan(k,key,why){
 if(!canBan(k)){toast('Tidak diizinkan');return false}
 if(!DURL[key])return false;
 if(key=='perm'&&lv(me)<3){toast('Ban permanen hanya untuk Owner');return false}
 const u=users[k];
 u.ban={perm:key=='perm',until:key=='perm'?0:NOW()+DUR[key],reason:(why||'Pelanggaran aturan').slice(0,120),by:me.name,t:NOW()};
 u.pres=null;
 const r=repAll();r.forEach(x=>{if(x.st=='open'&&(userKey(x.tg)==k||(x.gid&&creatorOf(x.gid)==k))){x.st='done';x.res='Ban '+DURL[key].toLowerCase()+' oleh '+me.name;x.rt=NOW()}});
 ls.set('sp_rep',r);save();return true}
function banDlg(k,rid,preset){
 if(!canBan(k))return toast('Tidak diizinkan');
 _bt={k,rid};
 const opts=Object.keys(DURL).filter(x=>x!='perm'||lv(me)>=3);
 shOpen(`<div class="shn" style="margin-top:6px">Ban ${esc(k)}</div><label class="dl">Durasi</label><select id="bn_d" class="shin">${opts.map(x=>`<option value="${x}" ${x==preset?'selected':''}>${DURL[x]}</option>`).join('')}</select><label class="dl">Alasan (ditampilkan ke pemain)</label><input class="shin" type="text" id="bn_r" maxlength="120" placeholder="Contoh: kata kasar di chat"><button class="sb pr" data-a="bango">Terapkan ban</button><button class="sb ln" data-a="shx">Batal</button>`)}
function showBan(b){const e=$('#err'),c=$('#acard');e.textContent='Akun ini diblokir '+banTxt(b)+'.\nAlasan: '+(b.reason||'-');e.classList.add('banmsg');c.classList.remove('shake');void c.offsetWidth;c.classList.add('shake')}

/* ---------- panel ---------- */
function repCard(x){const mk=x.gid?creatorOf(x.gid):null,k=userKey(x.tg)||mk,u=k&&users[k],bn=u&&banOf(u),own=lv(me)>=3;
 const cls=x.type=='Akun'?'a':x.type=='Map'?'m':'b';
 return `<div class="rc"><div class="rh2"><span class="rtag ${cls}">${esc(x.type)}</span><b>${esc(x.tg||'-')}</b><small>${ago(x.t)}</small></div>
 <div class="rby">Dilaporkan oleh <b>${esc(x.by)}</b></div>${x.why?`<div class="rwhy">${esc(x.why)}</div>`:''}<div class="rtx">${esc(x.txt||'')}</div>
 ${x.gn?`<small class="rg">Map: ${esc(x.gn)}${mk?' · pembuat '+esc(mk):''}</small>`:''}
 <div class="rac">${bn?`<span class="rban">Sudah diblokir (${banTxt(bn)})</span>`:(k&&canBan(k)?`<button class="btn sm o" data-a="banui" data-v="${esc(x.id)}">Ban</button>${own?`<button class="btn sm p" data-a="banperm" data-v="${esc(x.id)}">Ban permanen</button>`:''}`:'')}
 ${x.gid?`<button class="btn sm" data-a="rtake" data-v="${esc(x.id)}">Turunkan map</button>`:''}<button class="btn sm" data-a="rdone" data-v="${esc(x.id)}">Abaikan</button></div></div>`}
function giftH(){const ro=[['admin','Admin',2],['coowner','Co-Admin',3]].filter(r=>lv(me)>=r[2]);
 return `<div class="card"><label>Username pemain</label><input type="text" id="pt_u" list="pt_dl" placeholder="Ketik username" autocomplete="off" autocapitalize="none"><datalist id="pt_dl">${usersOpt()}</datalist>
 <label>Jumlah SandBux${lv(me)<3?' (maks. 500)':''}</label><input type="text" inputmode="numeric" id="pt_n" value="100"><button class="btn w g" data-a="gbux">Kirim SandBux</button>
 <label style="margin-top:14px;display:block">Centang biru</label><div style="display:flex;gap:8px;margin-top:6px"><button class="btn w c" data-a="gver" data-v="1">Beri centang</button><button class="btn w o" data-a="gver" data-v="0">Cabut centang</button></div>`
 +(ro.length?`<label style="margin-top:14px;display:block">Akses panel</label><select id="pt_r" hidden>${ro.map(r=>`<option value="${r[0]}">${r[1]}</option>`).join('')}<option value="none">Cabut</option></select><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px">${ro.map(r=>`<button class="btn v" style="flex:1 1 45%" data-a="grolev" data-v="${r[0]}">Beri ${r[1]}</button>`).join('')}<button class="btn w o" data-a="grolev" data-v="none">Cabut akses</button></div>`:'')+'</div>'}
function userRow(k){const u=users[k],b=banOf(u);
 return `<div class="card ur2"><div class="ur2h"><b>${esc(k)}${vb(u)}</b><span class="pill" style="font-size:12px">${RN[u.role]||'User'}</span><span class="pill" style="font-size:12px">${u.bux||0} SandBux</span></div>${b?`<div class="rban">Diblokir ${banTxt(b)} · ${esc(b.reason||'-')}</div>`:''}
 <div class="rac">${b?(canBan(k)?`<button class="btn sm g" data-a="unban" data-v="${esc(k)}">Cabut ban</button>`:''):(canBan(k)?`<button class="btn sm o" data-a="banu" data-v="${esc(k)}">Ban</button>`:'')}</div></div>`}
function promoTab(){const gs=pubGames(),ps=promos();
 let h=`<div class="card"><label>Pilih map</label><select id="pr_g">${gs.length?gs.map(g=>`<option value="${esc(g.id)}">${esc(g.name)} · ${esc(g.by||'Sandbox')}</option>`).join(''):'<option value="">Belum ada map dipublish</option>'}</select>
 <label>Teks promosi (opsional)</label><input type="text" id="pr_t" maxlength="50" placeholder="Contoh: Event akhir pekan">
 <label>Durasi</label><select id="pr_d"><option value="1">1 hari</option><option value="3">3 hari</option><option value="7" selected>7 hari</option><option value="30">30 hari</option><option value="0">Tanpa batas</option></select>
 <button class="btn w g" data-a="prgo">Pasang di bagian atas Beranda</button></div><div class="ps2">Promosi aktif (${ps.length}/6)</div>`;
 h+=ps.length?ps.map(p=>{const g=gs.find(x=>x.id==p.gid);return `<div class="card ur2"><div class="ur2h"><b>${esc(g?g.name:'Map tidak tersedia')}</b><small style="color:var(--mut)">${p.until?'sampai '+fmtDT(p.until):'tanpa batas'}</small></div>${p.title?`<div class="rtx">${esc(p.title)}</div>`:''}<div class="rac"><button class="btn sm o" data-a="prdel" data-v="${esc(p.id)}">Hapus</button></div></div>`}).join(''):'<div class="empty2"><p style="margin:0">Belum ada promosi.</p></div>';
 return h}
function codeTab(){const c=codes(),ks=Object.keys(c).sort((a,b)=>(c[b].t||0)-(c[a].t||0));
 let h=`<div class="card"><label>Kode (kosongkan untuk acak)</label><input type="text" id="cd_k" maxlength="24" autocomplete="off" autocapitalize="characters" placeholder="Contoh: SANDBOX100" style="text-transform:uppercase">
 <label>Jumlah SandBux</label><input type="text" inputmode="numeric" id="cd_a" value="100">
 <label>Batas pemakaian (0 = tanpa batas)</label><input type="text" inputmode="numeric" id="cd_m" value="0">
 <label>Masa berlaku dalam hari (0 = tanpa batas)</label><input type="text" inputmode="numeric" id="cd_e" value="0">
 <button class="btn w g" data-a="cdgo">Buat kode</button></div><div class="ps2">Kode aktif (${ks.length})</div>`;
 h+=ks.length?ks.map(k=>{const d=c[k],n=(d.used||[]).length,ex=d.exp&&d.exp<NOW();return `<div class="card ur2"><div class="ur2h"><span class="cdk">${esc(k)}</span><span class="pill" style="font-size:12px">${d.amt} SandBux</span></div><div class="rby">Dipakai <b>${n}${d.max?' / '+d.max:''}</b> kali · ${d.exp?(ex?'sudah kedaluwarsa':'berlaku sampai '+fmtDT(d.exp)):'tanpa masa berlaku'}</div><div class="rac"><button class="btn sm c" data-a="cdcopy" data-v="${esc(k)}">Salin</button><button class="btn sm o" data-a="cddel" data-v="${esc(k)}">Hapus</button></div></div>`}).join(''):'<div class="empty2"><p style="margin:0">Belum ada kode. Buat kode pertama di atas.</p></div>';
 return h}
panH=function(){if(!staff())return'';
 const own=lv(me)>=3,no=repOpen().length,nb=Object.keys(users).filter(k=>banOf(users[k])).length;
 const T=[['rv','Review',RV.n()],['ann','Pengumuman',0],['wk','Works',0],['vl','Pelanggaran',0],['rep','Report',no],['user','Pengguna',0],['ban','Diblokir',nb],['gift','Gift',0]].concat(own?[['promo','Promosi',0],['code','Kode',0]]:[]);
 if(!T.some(x=>x[0]==pt))pt='rep';
 let h='<h2>Panel '+(RN[me.role]||'')+'</h2><div class="ptabs2">'+T.map(x=>`<button class="ptb ${pt==x[0]?'on':''}" data-a="pt" data-v="${x[0]}">${x[1]}${x[2]?'<i>'+x[2]+'</i>':''}</button>`).join('')+'</div>';
 if(pt=='rep'){const r=repAll(),op=r.filter(x=>x.st=='open'),dn=r.filter(x=>x.st!='open').slice(0,8);
  h+=op.length?op.map(repCard).join(''):'<div class="empty2"><b>Tidak ada report baru</b><p style="margin:0">Laporan dari pemain akan muncul di sini.</p></div>';
  if(dn.length)h+='<div class="ps2">Selesai</div>'+dn.map(x=>`<div class="rc done"><div class="rh2"><span class="rtag ${x.type=='Akun'?'a':x.type=='Map'?'m':'b'}">${esc(x.type)}</span><b>${esc(x.tg||'-')}</b><small>${ago(x.rt||x.t)}</small></div><div class="rby">${esc(x.res||'Selesai')}</div></div>`).join('')}
 if(pt=='user')h+=Object.keys(users).length?Object.keys(users).map(userRow).join(''):'<div class="empty2"><p style="margin:0">Belum ada pengguna.</p></div>';
 if(pt=='ban'){const l=Object.keys(users).filter(k=>banOf(users[k]));h+=l.length?l.map(userRow).join(''):'<div class="empty2"><p style="margin:0">Tidak ada akun yang sedang diblokir.</p></div>'}
 if(pt=='gift')h+=giftH();
 if(pt=='promo'&&own)h+=promoTab();
 if(pt=='code'&&own)h+=codeTab();
 if(pt=='rv'||pt=='ann'||pt=='wk'||pt=='vl')h+=RV.tab(pt);
 return h};

function rand(n){const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let s='';const a=new Uint8Array(n);try{crypto.getRandomValues(a)}catch(e){for(let i=0;i<n;i++)a[i]=Math.random()*256|0}for(let i=0;i<n;i++)s+=A[a[i]%A.length];return s}
const num=id=>{const e=$('#'+id);return e?Math.max(0,Math.floor(+String(e.value).replace(/[^0-9]/g,'')||0)):0};

Object.assign(act,{
 rdone(v){if(!staff())return;const r=repAll(),x=r.find(y=>y.id==v);if(!x)return;x.st='done';x.res='Diabaikan oleh '+me.name;x.rt=NOW();ls.set('sp_rep',r);render()},
 rtake(v){if(!staff())return;const r=repAll(),x=r.find(y=>y.id==v);if(!x||!x.gid)return;Object.values(users).forEach(u=>(u.games||[]).forEach(g=>{if(g.id==x.gid)g.pub=false}));x.st='done';x.res='Map diturunkan oleh '+me.name;x.rt=NOW();ls.set('sp_rep',r);save();toast('Map diturunkan jadi draft');render()},
 banui(v){const x=repAll().find(y=>y.id==v);if(!x)return;const k=userKey(x.tg)||(x.gid&&creatorOf(x.gid));if(!k)return toast('Akun tidak ditemukan');banDlg(k,v,'1d')},
 banperm(v){const x=repAll().find(y=>y.id==v);if(!x)return;const k=userKey(x.tg)||(x.gid&&creatorOf(x.gid));if(!k)return toast('Akun tidak ditemukan');banDlg(k,v,'perm')},
 banu(n){banDlg(n,null,'1d')},
 bango(){if(!_bt)return;const d=$('#bn_d'),r=$('#bn_r');if(!d)return;const k=_bt.k;if(applyBan(k,d.value,(r.value||'').trim())){shClose();toast(k+' diblokir ('+DURL[d.value].toLowerCase()+')');pushNote(me,'Kamu memblokir '+k+' ('+DURL[d.value].toLowerCase()+')');render()}},
 unban(n){const u=users[n];if(!staff()||!u||!okT(u))return toast('Tidak diizinkan');delete u.ban;pushNote(u,'Blokir pada akunmu telah dicabut');save();toast('Ban '+n+' dicabut');render()},
 prgo(){if(lv(me)<3)return;const g=$('#pr_g').value;if(!g)return toast('Pilih map dulu');const ps=promos();if(ps.some(p=>p.gid==g))return toast('Map ini sudah dipromosikan');if(ps.length>=6)return toast('Maksimal 6 promosi aktif');
  const dy=+$('#pr_d').value||0;ps.push({id:'p'+NOW().toString(36),gid:g,title:($('#pr_t').value||'').trim().slice(0,50),until:dy?NOW()+dy*864e5:0,t:NOW()});setPromos(ps);toast('Promosi dipasang');render()},
 prdel(v){if(lv(me)<3)return;setPromos(promos().filter(p=>p.id!=v));toast('Promosi dihapus');render()},
 cdgo(){if(lv(me)<3)return;let k=normCode($('#cd_k').value);const amt=num('cd_a'),mx=num('cd_m'),ex=num('cd_e'),c=codes();
  if(!k){do{k='SHIN-'+rand(4)+'-'+rand(4)}while(c[k])}
  if(k.length<4)return toast('Kode minimal 4 karakter');if(c[k])return toast('Kode sudah ada');if(!(amt>=1&&amt<=1000000))return toast('Jumlah SandBux 1 sampai 1.000.000');
  c[k]={amt,max:mx,exp:ex?NOW()+ex*864e5:0,used:[],by:me.name,t:NOW()};setCodes(c);toast('Kode '+k+' dibuat');render()},
 cddel(v){if(lv(me)<3)return;const c=codes();delete c[v];setCodes(c);toast('Kode dihapus');render()},
 cdcopy(v){try{navigator.clipboard.writeText(v)}catch(e){}toast('Kode '+v+' disalin')},
 /* redeem */
 redeem(){act.dclose();shOpen(`<div class="shn" style="margin-top:6px">Redeem Kode</div><p class="sub2">Masukkan kode untuk mendapatkan SandBux.</p><input class="shin" type="text" id="rd_k" maxlength="24" autocomplete="off" autocapitalize="characters" placeholder="Masukkan kode" style="text-transform:uppercase"><div class="err2" id="rd_e"></div><button class="sb pr" data-a="rdgo">Tukar kode</button><button class="sb ln" data-a="shx">Tutup</button>`);setTimeout(()=>{const i=$('#rd_k');if(i)i.focus()},320)},
 rdgo(){const e=$('#rd_e');if(!e)return;const bad=m=>{e.textContent=m},now=NOW();me.rdf=(me.rdf||[]).filter(t=>now-t<60000);
  if(me.rdf.length>=5)return bad('Terlalu banyak percobaan. Coba lagi sebentar.');
  const k=normCode($('#rd_k').value);if(!k)return bad('Masukkan kodenya dulu');
  const c=codes(),d=c[k];
  if(!d){me.rdf.push(now);save();return bad('Kode tidak valid')}
  if(d.exp&&d.exp<now)return bad('Kode sudah kedaluwarsa');
  d.used=d.used||[];if(d.used.includes(me.name))return bad('Kamu sudah memakai kode ini');
  if(d.max&&d.used.length>=d.max)return bad('Kode sudah habis dipakai');
  d.used.push(me.name);setCodes(c);addBux(d.amt);notify('Redeem kode '+k+': +'+d.amt+' SandBux');shClose();toast('+'+d.amt+' SandBux berhasil ditambahkan');render()},
 /* report dari pemain */
 pmore(n){shOpen(`<div class="shn" style="margin-top:6px">${esc(n)}</div>${rel(n)=='friend'?`<button class="sb" data-a="funf" data-v="${esc(n)}">Hapus teman</button>`:''}<button class="sb" data-a="cpn" data-v="${esc(n)}">Salin username</button><button class="sb dg" data-a="rptu" data-v="${esc(n)}">Laporkan akun</button><button class="sb ln" data-a="shx">Tutup</button>`)},
 rptu(n){const k=userKey(n);if(!k||k==me.name)return toast('Akun tidak bisa dilaporkan');_rt=k;_rr=0;
  shOpen(`<div class="shn" style="margin-top:6px">Laporkan ${esc(k)}</div><label class="dl">Alasan</label><div class="chips2" id="rp_c">${REASONS.map((r,i)=>`<button class="chip ${i==0?'on':''}" data-a="rpr" data-v="${i}">${r}</button>`).join('')}</div><input class="shin" type="text" id="rp_d" maxlength="120" placeholder="Detail tambahan (opsional)"><div class="err2" id="rp_e"></div><button class="sb pr" data-a="rpgo">Kirim laporan</button><button class="sb ln" data-a="shx">Batal</button>`)},
 rpr(v){_rr=+v||0;document.querySelectorAll('#rp_c .chip').forEach((b,i)=>b.classList.toggle('on',i==_rr))},
 rpgo(){if(!_rt||!users[_rt])return;const d=($('#rp_d').value||'').trim();
  if(!addReport({type:'Akun',tg:_rt,why:REASONS[_rr],txt:d||REASONS[_rr]})){$('#rp_e').textContent='Kamu sudah melaporkan akun ini dan masih ditinjau.';return}
  shClose();toast('Laporan terkirim ke admin')},
 /* report dari dalam game */
 rsend(){const t=($('#rp_x').value||'').trim(),ty=$('#rp_t').value;let tg=($('#rp_g').value||'').trim();
  if(t.length<5)return toast('Tulis alasan (min. 5 huruf)');
  const o={txt:t,why:''};
  if(ty=='Pemain'){const k=userKey(tg);if(!k)return toast('Nama pemain tidak ditemukan');if(k==me.name)return toast('Tidak bisa melaporkan diri sendiri');o.type='Akun';o.tg=k}
  else if(ty=='Map'){o.type='Map';o.tg=tg||(curG&&curG.name)||'';o.gid=curG&&curG.id;o.gn=curG&&curG.name}
  else{o.type='Bug';o.tg=tg}
  if(!addReport(o))return toast('Laporan serupa masih ditinjau');
  $('#rp_x').value='';toast('Laporan terkirim')},
 play(v){const g=allGames().find(x=>x.id===v);if(!g)return toast('Game tidak tersedia');startGame(g)}
});
act.pt=function(v){pt=v;render()};

/* ---------- beranda & teratas ---------- */
function promoH(){const gs=pubGames(),it=promos().map(p=>({p,g:gs.find(g=>g.id==p.gid)})).filter(x=>x.g);if(!it.length)return'';
 return `<div class="promo">${it.map(({p,g})=>{const t=okImg(g.thumb),bg=t?`url(${t}) center/cover`:`linear-gradient(135deg,${hexc(g.col,'#b6f25a')},${hexc(g.sky,'#7df9ff')})`;
  return `<button class="pcard" data-a="gopen" data-v="${esc(g.id)}" style="background:${bg}"><span class="pshade"></span><span class="ptag">Promosi</span><span class="pinfo"><b>${esc(g.name)}</b><small>${esc(p.title||('oleh '+(g.by||'Sandbox')))}</small></span><span class="pplay">Main</span></button>`}).join('')}</div>`}
let HOME_N=24;act.homemore=function(){const m=$('#main'),t=m?m.scrollTop:0;HOME_N+=24;render();if(m)m.scrollTop=t};
homeH=function(){const gs=pubGames(),vis=ls.get('sp_vis',{}),rec=(me.recent||[]).map(id=>gs.find(g=>g.id==id)).filter(Boolean),bi=FRD(me).i.length;
 const pop=gs.slice().sort((a,b)=>((vis[b.id]||0)+(b.pl||0))-((vis[a.id]||0)+(a.pl||0)));
 const games=gs.length?`<h3 class="sec">Direkomendasikan untukmu</h3><div class="gg">${gs.slice(0,HOME_N).map(gcard).join('')}</div>${gs.length>HOME_N?`<button class="btn w" data-a="homemore" style="margin-top:12px">Lihat lebih banyak (${gs.length-HOME_N} lagi)</button>`:''}<h3 class="sec" id="cont">${rec.length?'Lanjutkan':'Populer'} ${ico('chev',20)}</h3><div class="hs">${(rec.length?rec:pop).slice(0,12).map(gcard).join('')}</div>`
  :`<div class="empty2"><b>Belum ada game</b><p>Belum ada map yang dipublish. Buat map pertamamu di Studio lalu publish agar muncul di sini.</p><button class="btn g" data-a="go" data-v="create">Buka Studio</button></div>`;
 return promoH()+`<div class="who" data-a="prof" data-v="${esc(me.name)}" style="cursor:pointer">${circ(me.av,46)}<span>${esc(me.name)}${vb(me)}</span></div>
 <div class="frs"><button class="fr add" data-a="ppl"><span class="circw"><span class="circ" style="--s:92px">${ico('adduser',40)}</span>${bi?`<i class="bdg">${bi}</i>`:''}</span><em>Tambah Teman</em></button>${friends().map(f=>`<button class="fr" data-a="fr" data-v="${esc(f.n)}"><span class="circw">${circ(f.a,92)}${f.pl?'<i class="on"></i>':''}</span><em>${esc(f.n)}</em><small>${esc(f.pl?f.g:'Offline')}</small></button>`).join('')}</div>`
 +games+`<h3 class="sec">Mabar bareng teman</h3><div class="card row" style="flex-wrap:wrap"><div style="flex:1;min-width:150px"><label>Kode room</label><input type="text" id="rc" value="${esc(roomCode)}" maxlength="16" style="margin:6px 0 0" oninput="roomCode=this.value.toLowerCase().replace(/[^a-z0-9-]/g,'')||'publik';save()"></div><button class="btn g" data-a="rnd">Acak</button></div>
 <div class="card row" style="margin-top:12px"><div style="flex:1"><b>Punya kode redeem?</b><br><small style="color:var(--mut)">Tukarkan dengan SandBux</small></div><button class="btn c" data-a="redeem">Tukar</button></div>`};
function topH(){const us=Object.keys(users).filter(k=>!users[k].role&&!banOf(users[k])).sort((a,b)=>(users[b].bux||0)-(users[a].bux||0)).slice(0,10);
 const gs=pubGames(),vis=ls.get('sp_vis',{}),sc=g=>(vis[g.id]||0)+(g.pl||0),gl=gs.slice().sort((a,b)=>sc(b)-sc(a)).slice(0,10);
 return '<h2>Teratas</h2><h3 class="sec" style="margin-top:6px">Pemain</h3>'+(us.length?us.map((k,i)=>`<div class="lbr ${i==0?'t1':''}" data-a="prof" data-v="${esc(k)}" style="cursor:pointer"><div class="rank">${i+1}</div>${circ(users[k].av,36)}<b>${esc(k)}${vb(users[k])}${k==me.name?' (kamu)':''}</b><span class="v">${users[k].bux||0} SandBux</span></div>`).join(''):'<div class="empty2"><p style="margin:0">Belum ada pemain.</p></div>')
 +'<h3 class="sec">Game</h3>'+(gl.length?gl.map((g,i)=>`<div class="lbr ${i==0?'t1':''}" data-a="gopen" data-v="${esc(g.id)}" style="cursor:pointer"><div class="rank">${i+1}</div><b>${esc(g.name)}</b><span class="v">${fmtN(sc(g))} kunjungan</span></div>`).join(''):'<div class="empty2"><p style="margin:0">Belum ada game dipublish.</p></div>')}
const _r8=render;
render=function(){_r8();const m=$('#main');if(page=='top'){m.innerHTML='<div class="page">'+topH()+'</div>';navRender()}};

/* ---------- drawer, badge, ban saat login ---------- */
const _df=drawerFill;
drawerFill=function(){_df();const d=$('#dpn'),sw=d.querySelector('.mi[data-v="avatar:mkt"]');
 if(sw)sw.insertAdjacentHTML('afterend',`<button class="mi" data-a="redeem">${ico('gift',27)}<span>Redeem Kode</span></button>`);
 const pn=d.querySelector('.mi[data-v="panel"]');if(pn){const sp=pn.querySelector('span');if(sp)sp.textContent='Panel Admin';const n=repOpen().length;if(n)pn.insertAdjacentHTML('beforeend',`<i class="bd rd">${n} Report</i>`)}};
const _nr=navRender;
navRender=function(){_nr();if(me&&staff()){const md=$('#mdot');if(md&&repOpen().length)md.style.display='block'}};
const _en9=enter;
enter=function(){const b=me&&banOf(me);
 if(b){me=null;ls.set('sp_sess','');show('auth');showBan(b);return}
 if(me&&me.ban){delete me.ban;save()}
 _en9()};
const _a9=act.auth;
act.auth=function(){const e=$('#err');if(e)e.classList.remove('banmsg');return _a9.apply(this,arguments)};
document.addEventListener('keydown',e=>{if(e.key=='Enter'&&e.target.id=='rd_k'){e.preventDefault();act.rdgo()}});
})();
;

/* ===== 14-v7.js ===== */
/* ===== v7 ===== */
(function(){
const ID=s=>document.getElementById(s),fm=n=>(+n||0).toLocaleString('id-ID');
Object.assign(IC,{key:'<circle cx="8" cy="15" r="3.5"/><path d="M10.5 12.5L19 4M16 7l2 2M13.5 9.5l2 2"/>'});
Object.assign(IC,{folder:'<path d="M3.5 7a1.5 1.5 0 0 1 1.5-1.5h4l2 2.5h8A1.5 1.5 0 0 1 20.5 9.500v8A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.500-1.500z"/>',book:'<path d="M3.500 5.500c3-1 6-.8 8.500 1 2.500-1.800 5.500-2 8.500-1v12c-3-1-6-.8-8.500 1-2.500-1.800-5.500-2-8.500-1zM12 6.500v12"/>',shop:'<path d="M5 9h14l-1 11H6zM9 9V7a3 3 0 0 1 6 0v2"/>',forum:'<rect x="4" y="5" width="16" height="11" rx="1.500"/><path d="M9 16l-2 3.500V16M8 9.500h8M8 12.500h5"/>',mega:'<path d="M4 10v4h3l8 4V6L7 10zM18 9.500c1.200.600 1.200 4.400 0 5"/>',dollar:'<circle cx="12" cy="12" r="8.500"/><path d="M14.500 9.500c-.5-1-1.500-1.500-2.500-1.500-1.500 0-2.500.8-2.500 2s1 1.800 2.500 2 2.500.8 2.500 2-1 2-2.500 2c-1 0-2-.5-2.500-1.500M12 6.500V8M12 16v1.500"/>',chart:'<path d="M5 20v-7h4v7M10 20V5h4v15M15 20v-9h4v9"/>',dots:'<path d="M5 12h.01M12 12h.01M19 12h.01"/>',pencil:'<path d="M4 20l1-4L16.500 4.500a2 2 0 0 1 3 3L8 19z"/>',globe:'<circle cx="12" cy="12" r="8.500"/><path d="M3.500 12h17M12 3.500c2.500 2.500 2.500 14.500 0 17M12 3.500c-2.500 2.500-2.500 14.500 0 17"/>',lock:'<rect x="5.500" y="10.500" width="13" height="9.500" rx="2"/><path d="M8.500 10.500V8a3.500 3.500 0 0 1 7 0v2.500"/>',down:'<path d="M12 4.500v15M6 14l6 6 6-6"/>',up:'<path d="M12 19.500v-15M6 10l6-6 6 6"/>',cur:'<circle cx="11" cy="11" r="6.500"/><path d="M11 11l8 3-3.500 1.500L14 19z"/>'});
const H={v:'home',k:'g',gid:null,sec:'sum',tab:'g',fp:0,fd:0,sort:'upd',asc:0,rs:-1,rk:[null,null,null,null],up:'icon'};
const Q=[['Kekerasan','Apakah pengalaman virtual ini mengandung kekerasan dan/atau konten kekerasan?','Penggambaran tindakan atau akibat dari kekuatan fisik/psikologis yang disengaja terhadap karakter atau pemain. Kematian akibat kecelakaan, konflik tanpa kekerasan, dan reset karakter default tidak termasuk.'],['Darah','Apakah ada darah atau luka yang ditampilkan?','Cairan atau luka yang menyerupai darah pada karakter, objek, atau efek visual.'],['Ketakutan','Apakah ada elemen menakutkan (horor, jumpscare, suasana mencekam)?','Konten yang dirancang membuat pemain takut atau tidak nyaman.'],['Humor Vulgar','Apakah ada humor vulgar atau bahasa kasar?','Lelucon kasar, sindiran dewasa, atau bahasa yang tidak pantas untuk anak.']];
const GEN=['Semua Genre','Petualangan','Obby','Aksi','Santai','Simulasi','Roleplay'];
const mine=()=>(me.items||[]).filter(i=>!i.src),cur=()=>H.k=='a'?mine().find(i=>i.id==H.gid):(me.games||[]).find(g=>g.id==H.gid);
const vis=g=>(ls.get('sp_vis',{})||{})[g.id]||0,ts=g=>g.upd||+String(g.id).replace(/\D/g,'')||0,pub=x=>x.pub===true&&!(x.rv&&x.rv.s&&x.rv.s!=='approved');
const cp=t=>{try{navigator.clipboard.writeText(t)}catch(e){}toast('Disalin')};
const bg=g=>{const t=okImg(g.thumb||g.icon);return t?`url(${t}) center/cover`:`linear-gradient(135deg,${hexc(g.col,'#3b5bff')},${hexc(g.sky,'#7df9ff')})`};
const pill=g=>(g.rv&&(g.rv.s=='off'||g.rv.s=='banned')&&!pub(g))?'<span class="pl">⛔ '+(g.rv.s=='off'?'Off sale':'Diblokir')+'</span>':(g.rv&&g.rv.s=='pending'&&!pub(g))?'<span class="pl">⏳ Menunggu review</span>':(g.rv&&g.rv.s=='rejected'&&!pub(g))?'<span class="pl">❌ Ditolak</span>':pub(g)?`<span class="pl">${ico('globe',16)} ${esc(g.age||'Publik')}</span>`:`<span class="pl">${ico('lock',16)} Draft</span>`;
const card=(g,k)=>`<button class="hc" data-a="hgo" data-v="${esc(g.id)}" data-k="${k}"><span class="ht2" style="background:${bg(g)}">${okImg(g.thumb||g.icon)?'':esc(g.emoji||'')}</span>${pill(g)}<strong>${esc(g.name)}</strong></button>`;
const sheetBtn=(a,v,t)=>`<button class="sb" data-a="${a}" data-v="${esc(v)}">${t}</button>`;

const SCP=[['universe-place','Map / game (publikasi)'],['universe-model','Model (ekspor & impor proyek)'],['universe-accessory','Aksesori (publikasi)'],['universe-mabar','Mabar (room multiplayer)']];
function keysPage(){me.keys=me.keys||[];const now=Date.now();
 const list=me.keys.map((k,i)=>{const dead=k.exp&&k.exp<now;return `<div class="gx" style="margin-bottom:12px"><b>${esc(k.name)}</b> <span class="mut">${dead?'· Kadaluarsa':'· Aktif'}</span><div class="mut" style="font-size:12px;margin:4px 0">Kadaluarsa: ${k.exp?new Date(k.exp).toLocaleString('id-ID'):'Tidak pernah'}</div><div style="font-size:12px;margin-bottom:8px">${k.perm.map(p=>esc(p.s)+' ['+(p.r?'baca':'')+(p.r&&p.w?' + ':'')+(p.w?'tulis':'')+']').join('<br>')}</div><label style="margin-top:0">API key</label><input type="text" readonly value="${esc(k.key)}">${k.mk?`<label>Key Mabar (kirim ke teman)</label><input type="text" readonly value="${esc(k.mk)}">`:''}<div class="row" style="margin-top:10px"><button class="ghost" data-a="kcopy" data-v="${i}">Salin Key</button>${k.mk?`<button class="ghost" data-a="kcopym" data-v="${i}">Salin Key Mabar</button><button class="ghost" data-a="kmabar" data-v="${i}">Pakai Mabar</button>`:''}<button class="dng" data-a="kdel" data-v="${i}">Hapus</button></div></div>`}).join('')||'<div class="nt">Belum ada API key.</div>';
 const form=H.kf?`<div class="gx"><label style="margin-top:0">Nama API key</label><input type="text" id="kn" maxlength="30" autocomplete="off" placeholder="mis. Key Mabar"><label>Kadaluarsa</label><select id="kx"><option value="0">Tidak pernah</option><option value="1">1 hari</option><option value="7">7 hari</option><option value="30">30 hari</option><option value="90">90 hari</option></select><label>Izin</label>${SCP.map(x=>`<div style="padding:8px 0;border-top:1px solid #ffffff22"><b style="font-size:14px">${x[0]}</b><div class="mut" style="font-size:12px">${x[1]}</div><div style="display:flex;gap:18px;margin-top:6px"><label style="text-transform:none;display:flex;align-items:center;gap:6px"><input type="checkbox" id="kr_${x[0]}" style="width:20px;height:20px"> Baca</label><label style="text-transform:none;display:flex;align-items:center;gap:6px"><input type="checkbox" id="kw_${x[0]}" style="width:20px;height:20px"> Tulis</label></div></div>`).join('')}<div class="row" style="margin-top:12px"><button class="pri" data-a="kmake">Buat API Key</button><button class="ghost" data-a="kcancel">Batal</button></div></div>`:`<div class="row"><button class="pri" data-a="kform">Buat API Key</button></div>`;
 return `<h2 style="margin-top:14px">Kunci API</h2><div class="nt">Dipakai untuk publikasi (Kreasi), ekspor/impor proyek, dan mabar. Key lama (Layanan API) tetap berlaku penuh.</div>${form}<h2>Daftar key</h2>${list}`}
Object.assign(act,{
 kform(){H.kf=1;hubRender()},kcancel(){H.kf=0;hubRender()},
 kmake(){const n=ID('kn').value.trim();if(n.length<2)return toast('Isi nama API key');const perm=SCP.map(x=>({s:x[0],r:ID('kr_'+x[0]).checked?1:0,w:ID('kw_'+x[0]).checked?1:0})).filter(p=>p.r||p.w);if(!perm.length)return toast('Pilih minimal satu izin');
  const d=+ID('kx').value,exp=d?Date.now()+d*864e5:0,key=genKey(),mp=perm.find(p=>p.s=='universe-mabar'),mk=mp?'spm_'+(mp.w?'w':'r')+(exp?Math.floor(exp/6e4).toString(36).padStart(8,'0'):'00000000')+key.slice(4,16):'';
  me.keys=me.keys||[];me.keys.push({name:n,key,mk,exp,perm,t:Date.now()});save();H.kf=0;notify('API key "'+n+'" dibuat');toast('API key dibuat');hubRender()},
 kcopy(v){cp(me.keys[+v].key)},kcopym(v){cp(me.keys[+v].mk)},
 kmabar(v){const k=me.keys[+v];if(k.exp&&k.exp<Date.now())return toast('Key sudah kadaluarsa');try{localStorage.setItem('sp_rkey',k.mk)}catch(e){}toast('Key mabar dipakai. Buka Home lalu main')},
 kdel(v){me.keys.splice(+v,1);save();hubRender()}
});
function body(g){
 if(H.v=='keys')return keysPage();
 if(H.v=='home'){const L=(me.games||[]).slice().sort((a,b)=>ts(b)-ts(a));
  return `<div class="hu">${circ(me.av,36)}<span>${esc(me.name)}${vb(me)}</span></div>
  <h2>Update <a data-a="hnav" data-v="upd">Lihat semua</a></h2><div class="hs">${UPD.map(u=>`<div class="uc"><b>${u[0]}</b><small>${u[1]}</small></div>`).join('')}</div>
  <h2 data-a="hnav" data-v="exp" style="cursor:pointer">Pengalaman virtual ${ico('chev',20)}</h2>`+
  (L.length?`<div class="hs">${L.map(x=>`<button class="gx" data-a="hgo" data-v="${esc(x.id)}" data-k="g"><div class="r"><span class="ic" style="background:${bg(x)}">${okImg(x.thumb||x.icon)?'':esc(x.emoji||'')}</span><b>${esc(x.name)}</b></div>${pill(x)}<div class="kv" style="margin-top:12px"><span>Kunjungan</span><b>${fm(vis(x))}</b></div><div class="kv"><span>Pengguna bersamaan</span><b>0</b></div><div class="kv"><span>Objek</span><b>${(x.objs||[]).length||'--'}</b></div></button>`).join('')}</div>`
  :`<div class="uc"><b>Belum ada pengalaman virtual</b><small>Pilih template, susun objek di Studio, lalu publikasikan.</small><button class="pri" data-a="hnew" style="align-self:flex-start">Buat pengalaman</button></div>`)+
  `<h2>Pelajari</h2><div class="hs">${LRN.map(u=>`<div class="uc"><b>${u[0]}</b><small>${u[1]}</small></div>`).join('')}</div>`}
 if(H.v=='learn')return LRN.map(u=>`<div class="uc" style="margin-top:14px"><b>${u[0]}</b><small>${u[1]}</small></div>`).join('');
 if(H.v=='upd')return UPD.map(u=>`<div class="uc" style="margin-top:14px"><b>${u[0]}</b><small>${u[1]}</small></div>`).join('');
 if(H.v=='fin'){const s=(me.notes||[]).filter(n=>/membeli/.test(n.t)).slice(0,10);return `<div class="sg" style="margin-top:14px"><div><small>Saldo SandBux</small><b>${fm(me.bux)}</b></div><div><small>Penjualan terbaru</small><b>${s.length}</b></div></div><div class="row"><button class="pri" data-a="daily">Ambil bonus harian</button><button class="ghost" data-a="hnav" data-v="redeem">Redeem kode</button></div><h2>Penjualan aksesori</h2>`+(s.length?s.map(n=>`<div class="kv"><span>${esc(n.t)}</span></div>`).join(''):'<div class="mut">Belum ada yang membeli aksesorimu.</div>')}
 if(H.v=='ana'){const L=me.games||[];return `<h2>Kunjungan per pengalaman</h2>`+(L.length?L.map(x=>`<div class="kv" style="font-size:16px"><span>${esc(x.name)}</span><b>${fm(vis(x))}</b></div>`).join(''):'<div class="mut">Belum ada data.</div>')}
 if(H.v=='exp'){let L=(H.tab=='a'?mine():(me.games||[])).slice();
  if(H.fp&&!H.fd)L=L.filter(pub);else if(H.fd&&!H.fp)L=L.filter(x=>!pub(x));
  L.sort((a,b)=>H.sort=='name'?String(a.name).localeCompare(String(b.name)):ts(a)-ts(b));if(!H.asc)L.reverse();
  return `<div class="tabs"><button class="tb ${H.tab=='g'?'on':''}" data-a="htab" data-v="g">Pengalaman Virtual Saya</button><button class="tb ${H.tab=='a'?'on':''}" data-a="htab" data-v="a">Aksesori Saya</button></div>
  <div class="fl">Tampilkan:<button class="sw2 ${H.fp?'on':''}" data-a="hfl" data-v="fp"><i></i>Publik</button><button class="sw2 ${H.fd?'on':''}" data-a="hfl" data-v="fd"><i></i>Draft</button></div>
  <div class="srt"><select onchange="act.hsort(this.value)"><option value="upd" ${H.sort=='upd'?'selected':''}>Urutkan berdasarkan: Terakhir Di-update</option><option value="name" ${H.sort=='name'?'selected':''}>Urutkan berdasarkan: Nama</option></select><button data-a="hasc" aria-label="Arah">${ico(H.asc?'up':'down',22)}</button></div>
  <div class="gr"><button class="hc" data-a="hnew"><span class="nw">${ico('plus',34)}Buat baru</span></button>${L.map(x=>card(x,H.tab)).join('')}</div>
  <div class="row"><button class="ghost" data-a="impb">Impor proyek</button></div>`}
 if(!g)return'';
 const a=H.k=='a',S=H.sec;
 if(S=='sum')return `<h2 style="margin-top:14px">Ringkasan</h2><div class="sg"><div><small>Pengguna bersamaan</small><b>0</b></div><div><small>${a?'Harga':'Kunjungan'}</small><b>${a?fm(g.price||0):fm(vis(g))}</b></div><div><small>Status</small><b style="font-size:20px">${pub(g)?'Publik':'Draft'}</b></div><div><small>Objek</small><b>${(g.objs||[]).length}</b></div></div>
  <div class="row"><button class="pri" data-a="edopen" data-v="${esc(g.id)}" data-k="${H.k}">Edit di Studio</button>${a?'':`<button class="ghost" data-a="play" data-v="${esc(g.id)}">Main</button>`}<button class="ghost" data-a="exp" data-v="${esc(g.id)}" data-k="${H.k}">Ekspor</button>${H.k=='g'?`<button class="ghost" data-a="shshare" data-v="${esc(g.id)}">Bagikan</button>`:''}<button class="dng" data-a="del" data-v="${esc(g.id)}" data-k="${H.k}">Hapus</button></div>`;
 if(S=='aud'){const ck=[['Nama minimal 3 huruf',(g.name||'').trim().length>=3],['Deskripsi minimal 10 huruf',(g.desc||'').trim().length>=10],].concat(a?[['Biaya publish '+window.accFeeFull(g).toLocaleString('id-ID')+' SandBux'+(window.accHasFx(g)?' (ber-efek)':'')+(window.accFeeDue(g)===0?' (sudah dibayar)':''),window.accFeeDue(g)===0||(me.bux||0)>=window.accFeeDue(g)]]:[['Ikon diunggah',!!g.icon],['Thumbnail diunggah',!!g.thumb],['Rating konten diisi',!!g.age]]),all=ck.every(c=>c[1]);
  return `<h2 style="margin-top:14px">Kelola audiens</h2><div class="gx"><div class="r"><b>Status</b>${pill(g)}</div>`+(pub(g)?`<div class="mut">${a?'Aksesori':'Pengalaman'} ini tampil di ${a?'Marketplace':'Beranda'}.</div><div class="row"><button class="dng" data-a="hunpub">Jadikan draft</button></div>`
  :RV.note(g)+`${ck.map(c=>`<div class="ck ${c[1]?'ok':''}"><i>${c[1]?'✓':''}</i>${c[0]}</div>`).join('')}<label>API key kreator</label><input type="password" id="hk" autocomplete="off" placeholder="spk_..."><div class="cn">Salin dari Konfigurasi → Layanan API.</div>${a?`<div class="cn">Ikon & thumbnail opsional. Publish aksesori memotong ${window.ACC_FEE.toLocaleString('id-ID')} SandBux; jika ada efek (Fire/Smoke/Sparkles/dll) jadi ${window.ACC_FEE_FX.toLocaleString('id-ID')} SandBux (sekali per aksesori, tambah efek setelah bayar = bayar selisihnya). Saldomu: ${(me.bux||0).toLocaleString('id-ID')}.</div>`:''}<div class="row"><button class="pri" data-a="hpub" ${all&&!RV.pend(g)&&!RV.blk(g)?'':'disabled'}>Publikasikan</button></div>`)+`</div>`}
 if(S=='det')return `<h2 style="margin-top:14px">Detail ${a?'item':'game'}</h2><div class="im"><div style="width:34%;aspect-ratio:1;background-image:${g.icon?`url(${g.icon})`:'none'}">${g.icon?'':'Ikon'}<button data-a="hup" data-v="icon" aria-label="Ganti ikon">${ico('pencil',20)}</button></div><div style="flex:1;aspect-ratio:16/9;align-self:flex-end;background-image:${g.thumb?`url(${g.thumb})`:'none'}">${g.thumb?'':'Thumbnail'}<button data-a="hup" data-v="thumb" aria-label="Ganti thumbnail">${ico('pencil',20)}</button></div></div><div class="cn">Ikon dan thumbnail tampil di kartu Beranda.</div>
  <label>Nama *</label><input type="text" id="hd_n" maxlength="22" value="${esc(g.name)}"><div class="cn">${(g.name||'').length}/22</div>
  <label>Deskripsi</label><textarea id="hd_d" maxlength="140">${esc(g.desc||'')}</textarea><div class="cn">${(g.desc||'').length}/140</div>
  ${a?`<label>Harga SandBux (0 = gratis)</label><input type="text" inputmode="numeric" id="hd_p" value="${+g.price||0}">`:`<label>Genre</label><select id="hd_g">${GEN.map(x=>`<option ${g.genre==x?'selected':''}>${x}</option>`).join('')}</select>`}
  <div class="row"><button class="pri" data-a="hsave">Simpan</button><button class="ghost" data-a="hcancel">Batalkan</button></div>`;
 if(S=='rate'){const q=g.q;
  if(H.rs<0)return `<h2 style="margin-top:14px">Rating konten</h2><div class="sg"><div><small>Label kedewasaan</small><b style="font-size:20px">${esc(g.age||'Belum dinilai')}</b></div><div><small>Kuesioner</small><b style="font-size:20px">${q?'Selesai':'Belum'}</b></div></div><div class="nt">Label ini tampil di kartu dan halaman detail. Game tanpa label tidak bisa dipublikasikan. Jawab sesuai konten paling dewasa yang bisa dialami pemain.</div><button class="pri" data-a="hrs">${q?'Ulangi kuesioner':'Mulai'}</button>`;
  const i=H.rs,ans=H.rk[i];
  return `<h2 style="margin-top:14px">Kuesioner konten</h2><div class="stp">${Q.map((x,j)=>`<div class="${j==i?'on':''}">${j+1}  ${x[0]}</div>`).join('')}</div><b>${Q[i][1]}</b><p class="mut" style="margin:10px 0">${Q[i][2]}</p><button class="rd ${ans===0?'on':''}" data-a="hq" data-v="0"><i></i>Tidak</button><button class="rd ${ans===1?'on':''}" data-a="hq" data-v="1"><i></i>Ya</button>
  <div class="row"><button class="pri" data-a="hrn" ${ans==null?'disabled':''}>${i==3?'Selesai':'Lanjutkan'}</button>${i?'<button class="ghost" data-a="hrb">Kembali</button>':''}<button class="ghost" data-a="hrx">Batalkan</button></div>`}
 if(S=='plc')return `<h2 style="margin-top:14px">Tempat</h2><div class="gx"><div class="r"><b>Tempat Mulai</b></div><div class="kv"><span>Objek</span><b>${(g.objs||[]).length}</b></div><div class="kv"><span>Dibuat</span><b>${new Date(ts(g)||Date.now()).toLocaleDateString('id-ID')}</b></div><div class="row"><button class="pri" data-a="edopen" data-v="${esc(g.id)}" data-k="${H.k}">Edit di Studio</button>${a?'':`<button class="ghost" data-a="play" data-v="${esc(g.id)}">Uji coba</button>`}</div></div>`;
 if(S=='api')return `<h2 style="margin-top:14px">Layanan API</h2><div class="gx"><label style="margin-top:0">API key kreator</label><input type="password" id="ak" readonly value="${esc(me.apiKey||'')}"><div class="row" style="margin-top:12px"><button class="ghost" data-a="keyshow">Lihat</button><button class="ghost" data-a="keycopy">Salin</button><button class="dng" data-a="keyregen">Buat ulang</button></div></div><h2>Pemilik</h2><div class="own">${circ(me.av,52)}<div><b>${esc(me.name)}</b><div class="mut">@${esc(me.name.toLowerCase())}</div></div></div>`;
 if(S=='ana')return `<h2 style="margin-top:14px">Analitik</h2><div class="sg"><div><small>Kunjungan</small><b>${fm(vis(g))}</b></div><div><small>Pengguna aktif harian</small><b>--</b></div></div><div class="nt">Data retensi dan pendapatan belum dihitung untuk game lokal.</div>`;
 return''}
const UPD=[['Avatar kini 3D dan bisa diputar','Geser avatarmu di halaman Avatar. Preview 3D juga muncul sebelum membeli item.'],['Gift SandBux dan ban lewat username','Staf cukup mengetik username di Panel, tanpa memilih dari daftar.'],['Studio pindah ke Buat','Kelola game, aksesori, rating, dan publikasi dari satu tempat.']];
const LRN=[['Mulai dari template','Ketuk Buat baru di Pengalaman virtual, pilih template, lalu edit di Studio.'],['Cara mempublikasikan','Isi Detail game, selesaikan Rating konten, lalu publikasikan dari Kelola audiens dengan API key.'],['Mengunggah ikon dan thumbnail','Buka Detail game dan ketuk pensil. Gambar dikecilkan otomatis.']];
function drawer(g){const it=(ic,t,v,on)=>`<button class="ni ${on?'on':''}" data-a="hnav" data-v="${v}">${ico(ic,26)}<span>${t}</span></button>`;
 if(H.v=='game'&&g){const s=(t,v)=>`<button class="ni s ${H.sec==v?'on':''}" data-a="hsec" data-v="${v}">${t}</button>`,a=H.k=='a';
  return `<div class="gh"><span class="ic" style="width:46px;height:46px;border-radius:10px;flex:none;background:${bg(g)}"></span><b>${esc(g.name)}</b><button data-a="hmore" style="padding:8px">${ico('dots',24)}</button></div>${s('Ringkasan','sum')}<div class="nh">Pengaturan publikasi</div>${s('Kelola audiens','aud')}${s(a?'Detail item':'Detail game','det')}${a?'':s('Rating konten','rate')}<div class="nh">Konfigurasi</div>${s('Tempat','plc')}${s('Layanan API','api')}<div class="nh">Analitik</div>${s('Kunjungan','ana')}<div class="dv"></div>${it('back','Pengalaman virtual','exp')}`}
 return `<div class="lg">${ico('hex',38)}KREATOR</div><div class="me">${circ(me.av,40)}<span>${esc(me.name)}</span></div>${it('home','Beranda','home',H.v=='home')}${it('folder','Kreasi','exp',H.v=='exp')}${it('book','Pelajari','learn',H.v=='learn')}${it('shop','Toko','store')}${it('forum','Forum','soon:Forum')}${it('mega','Update','upd',H.v=='upd')}${it('key','Kunci API','keys',H.v=='keys')}<div class="dv"></div>${it('dollar','Keuangan','fin',H.v=='fin')}${it('chart','Analitik','ana',H.v=='ana')}${it('cur','Iklan','soon:Iklan')}<div class="dv"></div>${it('dots','Semua alat','soon:Semua alat')}<span style="flex:1"></span>${it('hex','Sandbox','exit')}`}
const TT={keys:'Kunci API',home:'Beranda',exp:'Pengalaman virtual',learn:'Pelajari',upd:'Update',fin:'Keuangan',ana:'Analitik',game:'Kreasi'};
function hubRender(){const el=ID('hub'),sc=ID('hm'),top=sc?sc.scrollTop:0;let g=null;if(H.v=='game'){g=cur();if(!g)H.v='exp'}
 const dr=ID('hdr')&&ID('hdr').classList.contains('on');
 el.classList.add('on');el.innerHTML=`<div class="ht">${H.v=='game'?`<button data-a="hback" aria-label="Kembali">${ico('back',26)}</button>`:''}<button data-a="hdr" aria-label="Menu">${ico('menu',26)}</button><b>${TT[H.v]}</b><span></span><button data-a="hbell" aria-label="Notifikasi">${ico('bell',25)}</button><button data-a="havatar" aria-label="Avatar">${circ(me.av,32)}</button></div><div class="hm" id="hm">${body(g)}</div><div id="hdr" class="${dr?'on':''}"><div class="hsc" data-a="hdc"></div><aside>${drawer(g)}</aside></div>`;
 if(ID('hm'))ID('hm').scrollTop=top}
const touch=g=>{g.upd=Date.now();save()};
const fin=()=>{ID('hdr')&&ID('hdr').classList.remove('on')};
Object.assign(act,{
 hdr(){ID('hdr').classList.toggle('on')},hdc(){fin()},
 hnav(v){fin();if(v.startsWith('soon:'))return toast(v.slice(5)+' segera hadir');if(v=='exit')return act.go('home');if(v=='store'){avt='mkt';return act.go('avatar')}if(v=='redeem')return act.redeem();H.v=v;hubRender()},
 hback(){H.v='exp';hubRender()},hbell(){act.go('notif')},havatar(){act.go('avatar')},
 hgo(v,t){H.gid=v;H.k=t.dataset.k;H.v='game';H.sec='sum';H.rs=-1;hubRender()},
 hsec(v){H.sec=v;H.rs=-1;fin();hubRender()},htab(v){H.tab=v;hubRender()},hfl(v){H[v]=H[v]?0:1;hubRender()},hsort(v){H.sort=v;hubRender()},hasc(){H.asc=H.asc?0:1;hubRender()},
 hnew(){shOpen(`<div class="shn" style="margin-top:6px">Buat baru</div><div class="mut" style="padding:0 4px 4px;color:#bfa5a7">Map</div>${Object.keys(GT).map(k=>sheetBtn('hnewg',k,GT[k].e+'  '+GT[k].n)).join('')}<div style="padding:14px 4px 0;color:#bfa5a7">Aksesori</div>${Object.keys(AT).map(k=>sheetBtn('hnewa',k,AT[k].e+'  '+AT[k].n)).join('')}<button class="sb ln" data-a="shx">Tutup</button>`)},
 hnewg(v){shClose();act.newg(v)},hnewa(v){shClose();act.newa(v)},
 hmore(){const g=cur();if(!g)return;fin();shOpen(`<div class="shn" style="margin-top:6px">${esc(g.name)}</div>${sheetBtn('hcp',g.id,'Salin ID Universe')}${sheetBtn('hcp','P'+g.id,'Salin ID Tempat Mulai')}${sheetBtn('hcp',location.href.split('#')[0]+'#'+g.id,'Salin URL')}${H.k=='g'?`<button class="sb" data-a="hplay" data-v="${esc(g.id)}">Lihat di Sandbox</button>`:''}<button class="sb" data-a="hstudio" data-v="${esc(g.id)}">Edit di Studio</button><button class="sb ln" data-a="shx">Tutup</button>`)},
 hcp(v){shClose();cp(v)},hplay(v){shClose();act.play(v)},hstudio(v){shClose();act.edopen(v,{dataset:{k:H.k}})},
 hup(v){H.up=v;ID('hfi').click()},
 hsave(){const g=cur();if(!g)return;const n=ID('hd_n').value.trim();if(n.length<3)return toast('Nama minimal 3 huruf');g.name=n;g.desc=ID('hd_d').value.trim();
  if(H.k=='a'){const p=Math.floor(+String(ID('hd_p').value).replace(/\D/g,'')||0);if(p>9999)return toast('Harga 0 sampai 9999');g.price=p}else g.genre=ID('hd_g').value;touch(g);toast('Tersimpan');hubRender()},
 hcancel(){hubRender()},
 hrs(){H.rs=0;H.rk=[null,null,null,null];hubRender()},hq(v){H.rk[H.rs]=+v;hubRender()},hrb(){H.rs--;hubRender()},hrx(){H.rs=-1;hubRender()},
 hrn(){if(H.rk[H.rs]==null)return;if(H.rs<3){H.rs++;return hubRender()}const g=cur(),n=H.rk.reduce((a,b)=>a+b,0);g.q=H.rk.slice();g.age=n==0?'Usia 9+':n==1?'Usia 13+':'Usia 16+';H.rs=-1;touch(g);toast('Rating: '+g.age);hubRender()},
 hpub(){const g=cur();if(!g)return;{const tg=window.spTestGate&&window.spTestGate(g,H.k=='a');if(tg)return toast(tg)}const k=(ID('hk').value||'').trim();if((g.name||'').trim().length<3||(g.desc||'').trim().length<10||(H.k!='a'&&(!g.icon||!g.thumb)))return toast('Lengkapi detail dulu');if(H.k=='g'&&!g.age)return toast('Isi rating konten dulu');
  {const kr=keyChk(k,H.k=='a'?'universe-accessory':'universe-place','w');if(kr)return toast(kr)}g.by=me.name;if(RV.blk(g))return toast('Diblokir/off sale oleh admin');if(H.k=='a'){const fe=window.accFeeErr(g);if(fe)return toast(fe);window.accFeePay(g)}const dr=RV.submit(g,H.k=='a'?'acc':'map');touch(g);toast(dr?'Dipublikasikan':'Dikirim ke admin untuk dicek ⏳');hubRender()},
 hunpub(){const g=cur();if(!g)return;g.pub=false;touch(g);toast('Kembali jadi draft');hubRender()}});
document.getElementById('app').insertAdjacentHTML('beforeend','<div id="hub"></div><input type="file" id="hfi" accept="image/*" hidden>');
ID('hfi').addEventListener('change',e=>{const f=e.target.files[0];e.target.value='';const g=cur();if(!f||!g)return;if(!/^image\//.test(f.type))return toast('File harus gambar');const k=H.up,fr=new FileReader();
 fr.onload=()=>{const im=new Image();im.onload=()=>{const W=k=='icon'?128:320,Hh=k=='icon'?128:180,c=document.createElement('canvas');c.width=W;c.height=Hh;const x=c.getContext('2d'),s=Math.max(W/im.width,Hh/im.height);x.drawImage(im,(W-im.width*s)/2,(Hh-im.height*s)/2,im.width*s,im.height*s);g[k]=c.toDataURL('image/jpeg',.82);touch(g);toast('Gambar tersimpan');hubRender()};im.onerror=()=>toast('Gambar tidak valid');im.src=fr.result};fr.readAsDataURL(f)});

/* ---- avatar 3D ---- */
let AVY=.5;
function av3(el,a,extra){if(!el||!window.THREE)return;el.innerHTML='';el.classList.add('av3');let R;const AVR=window.__avR=window.__avR||[],avFree=o=>{try{o.R.dispose();if(o.R.forceContextLoss)o.R.forceContextLoss()}catch(e){}};
 for(let i=AVR.length-1;i>=0;i--)if(!AVR[i].el.isConnected){avFree(AVR[i]);AVR.splice(i,1)}
 while(AVR.length>=3){const o=AVR.shift();o.dead=1;avFree(o)}
 try{R=new THREE.WebGLRenderer({antialias:true,alpha:true})}catch(e){el.textContent='WebGL tidak tersedia';return}
 const rec={R,el,dead:0};AVR.push(rec);
 const w=el.clientWidth||320,h=el.clientHeight||290;R.setPixelRatio(Math.min(devicePixelRatio||1,2));R.setSize(w,h);el.appendChild(R.domElement);
 const S=new THREE.Scene(),C=new THREE.PerspectiveCamera(30,w/h,.1,60);C.position.set(0,2.4,12.5);C.lookAt(0,1.45,0);S.add(new THREE.AmbientLight(0xffffff,.8));const L=new THREE.DirectionalLight(0xffffff,.65);L.position.set(4,8,7);S.add(L);
 const G=mkAvatar(a,a.acc||[]);(extra||[]).forEach(o=>{if(o.t!='coin')G.add(mkObj(o))});S.add(G);try{window.__pvFxInit&&window.__pvFxInit(rec,S,G,a,extra)}catch(e){}
 const sh=new THREE.Mesh(new THREE.CircleGeometry(1.3,24),new THREE.MeshBasicMaterial({color:0,transparent:true,opacity:.3}));sh.rotation.x=-Math.PI/2;sh.position.y=.02;S.add(sh);
 let dn=null,idle=1;el.addEventListener('pointerdown',e=>{dn=e.clientX;idle=0;try{el.setPointerCapture(e.pointerId)}catch(x){}});el.addEventListener('pointermove',e=>{if(dn==null)return;AVY+=(e.clientX-dn)*.012;dn=e.clientX});
 const up=()=>{dn=null;setTimeout(()=>{if(dn==null)idle=1},2500)};el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);
 el.insertAdjacentHTML('beforeend','<div class="hint">Geser untuk memutar</div>');
 (function f(){if(rec.dead)return;if(!el.isConnected){avFree(rec);const k=AVR.indexOf(rec);if(k>-1)AVR.splice(k,1);return}requestAnimationFrame(f);if(getComputedStyle(el).visibility=='hidden')return;if(idle&&dn==null)AVY+=.006;G.rotation.y=AVY;try{if(rec.pv)rec.pv()}catch(e){}R.render(S,C)})()}
window.av3=av3;
const _avP=avP;avP=function(){return _avP().replace(/<div class="stage">[\s\S]*?<\/div><div class="sheet">/,'<div class="stage v3" id="av3s"></div><div class="sheet">')};
/* ---- baju & paket avatar ---- */
const CL=[['c_kaos_merah','Kaos Merah','',20,{shirt:'#d93a3a'},'Baju'],['c_kaos_laut','Kaos Biru Laut','',20,{shirt:'#2f6fd6'},'Baju'],['c_celana_hitam','Celana Hitam','',25,{pants:'#1d1d22'},'Celana'],['c_paket_ungu','Paket Avatar Ungu','',80,{skin:'#c68642',shirt:'#6a1b9a',pants:'#263238'},'Avatar'],['c_paket_hutan','Paket Avatar Hutan','',80,{skin:'#f1c27d',shirt:'#2e7d32',pants:'#4e342e'},'Avatar']];
const _mk=mkItems;mkItems=function(){return _mk().concat(CL.map(c=>({key:c[0],name:c[1],e:c[2],price:c[3],by:'Sandbox',v:1,objs:[],desc:c[5],slot:c[5],cloth:c[4]})))};
const _acc=act.acc;act.acc=function(v){const i=(me.items||[]).find(x=>x.id==v);if(i&&i.cloth){Object.assign(me.av,i.cloth);save();toast(i.name+' dipakai');return render()}return _acc(v)};
/* ---- preview sebelum beli ---- */
const _buy=act.buy,own=k=>(me.items||[]).find(x=>x.src==k||'u_'+me.name+'_'+x.id==k);
act.buy=function(k){const it=mkItems().find(x=>x.key==k);if(!it)return;const o=own(k);
 shOpen(`<div class="shn" style="margin-top:6px">${esc(it.name)}</div><div class="pv3" id="pv3"></div><div class="pvm">${esc(it.by)}${(it.v||(window.spVerified&&window.spVerified(it.by)))?' ✔':''}${it.lim?' · LIMITED U':''} · ${esc(it.desc||it.slot||'')}</div>${(it.lim&&!o)?'<button class="sb pr" disabled style="opacity:.6">Limited U · Tidak dijual</button>':`<button class="sb pr" data-a="${o?'pvwear':'buy2'}" data-v="${esc(k)}">${o?(it.cloth?'Pakai':'Dimiliki'):'Beli · '+(+it.price||0)+' SandBux'}</button>`}<button class="sb ln" data-a="shx">Tutup</button>`);
 setTimeout(()=>av3(ID('pv3'),Object.assign({},me.av,{acc:[],pvfx:it.fx||[]},it.cloth||{},it.slot==='Tubuh'?{bodyObjs:it.objs}:{}),it.slot==='Tubuh'?[]:it.objs),30)};
act.buy2=function(k){_buy(k);if(own(k)){const n=own(k),it=mkItems().find(x=>x.key==k);if(it&&it.cloth)n.cloth=it.cloth;shClose()}};
act.pvwear=function(k){const n=own(k);shClose();if(n&&n.cloth)act.acc(n.id);else toast('Sudah dimiliki. Pakai di Kustomisasi')};

/* ---- gift & ban via username ---- */
const ukey=r=>{r=String(r||'').trim().replace(/^@/,'').toLowerCase();return r?Object.keys(users).find(k=>k.toLowerCase()==r)||null:null};
function tg2(id,selfOk){const r=(ID(id)&&ID(id).value||'').trim();if(!r){toast('Ketik username dulu');return null}const k=ukey(r);if(!k){toast('Username "'+r.replace(/^@/,'')+'" tidak ditemukan');return null}if(users[k]===me&&!selfOk){toast('Tidak bisa untuk akun sendiri');return null}return[k,users[k]]}
Object.assign(act,{
 gbux(){const t=tg2('pt_u',1);if(!t||!staff())return;let n=Math.floor(+String(ID('pt_n').value).replace(/\D/g,''));if(!(n>0))return toast('Jumlah tidak valid');if(lv(me)<3)n=Math.min(n,500);t[1].bux=(t[1].bux||0)+n;nt(t[1],'Kamu mendapat '+n+' SandBux dari '+RN[me.role]);save();if(t[1]===me){try{navRender()}catch(e){}}toast(t[1]===me?'Berhasil gift '+n+' SandBux ke dirimu sendiri':'Terkirim '+n+' SandBux ke '+t[0])},
 gver(v){const t=tg2('pt_u',1);if(!t||!staff()||!okT(t[1]))return toast('Tidak diizinkan');t[1].verified=v=='1';nt(t[1],v=='1'?'✔ Kamu mendapat Centang Biru!':'Centang biru dicabut');save();toast(v=='1'?'Centang biru diberikan':'Centang biru dicabut')},
 grole(){const t=tg2('pt_u'),r=ID('pt_r')&&ID('pt_r').value;if(!t||!r||!okT(t[1])||(r!='none'&&lv({role:r})>=lv(me)))return toast('Tidak diizinkan');if(r=='none'){delete t[1].role;nt(t[1],'Akses panelmu dicabut')}else{t[1].role=r;nt(t[1],'Kamu mendapat akses '+RN[r]+'. Login ulang untuk membuka Panel.')}save();toast('Akses diperbarui')},
 bandirect(){if(!staff())return;const t=tg2('bu_u');if(!t)return;const k=t[0],u=t[1];if(u.role=='owner'||!okT(u))return toast('Tidak diizinkan: pangkat target sama atau lebih tinggi');if(banOf(u))return toast(k+' sudah diblokir');
  act.banu(k);const d=ID('bn_d'),r=ID('bn_r');if(!d||!ID('sh').classList.contains('on'))return;const dur=ID('bu_d').value;if(![...d.options].some(o=>o.value==dur))return toast('Ban permanen hanya untuk Owner');d.value=dur;r.value=(ID('bu_r').value||'').trim();act.bango()},
 unbandirect(){if(!staff())return;const t=tg2('bu_u');if(!t)return;if(!banOf(t[1]))return toast(t[0]+' tidak sedang diblokir');act.unban(t[0])}});
function patchPanel(){if(page!='panel')return;const s=ID('pt_u');
 if(s&&s.tagName=='SELECT'){const ks=Object.keys(users).filter(k=>users[k]!==me),i=document.createElement('input');i.type='text';i.id='pt_u';i.placeholder='Ketik username';i.autocomplete='off';i.autocapitalize='none';i.setAttribute('list','pt_dl');const lb=s.previousElementSibling;if(lb&&lb.tagName=='LABEL')lb.textContent='Username pemain';s.replaceWith(i);i.insertAdjacentHTML('afterend','<datalist id="pt_dl">'+ks.map(k=>'<option value="'+esc(k)+'">').join('')+'</datalist>')}
 const tb=document.querySelector('.ptabs2');if((pt=='ban'||pt=='user')&&tb&&!ID('bu_u')){const o=[['1h','1 jam'],['1d','1 hari'],['3d','3 hari'],['7d','7 hari'],['30d','30 hari']].concat(lv(me)>=3?[['perm','Permanen']]:[]);
  tb.insertAdjacentHTML('afterend',`<div class="card" style="margin-bottom:12px"><label>Username</label><input type="text" id="bu_u" list="pt_dl2" placeholder="Ketik username" autocomplete="off" autocapitalize="none"><datalist id="pt_dl2">${Object.keys(users).filter(k=>users[k]!==me).map(k=>'<option value="'+esc(k)+'">').join('')}</datalist><label>Durasi</label><select id="bu_d">${o.map(x=>`<option value="${x[0]}" ${x[0]=='1d'?'selected':''}>${x[1]}</option>`).join('')}</select><label>Alasan (tampil ke pemain)</label><input type="text" id="bu_r" maxlength="120" placeholder="Contoh: kata kasar di chat"><div style="display:flex;gap:8px;margin-top:12px"><button class="btn w o" data-a="bandirect">Ban</button><button class="btn w g" data-a="unbandirect">Cabut ban</button></div></div>`)}}
/* ---- hook render ---- */
const _R=render;
render=function(){if(page=='create'){if(!me)return;hubRender();navRender();return}const h=ID('hub');if(h)h.classList.remove('on');_R();if(page=='avatar')av3(ID('av3s'),me.av,[]);patchPanel()};
if(me&&page=='create')render();
})();
;

/* ===== 15-patch.js ===== */
(function(){
const nf=n=>Number(n||0).toLocaleString('id-ID');
const CAP=8,PSMAX=2,CCOST=100;
Object.assign(IC,{
 pencil:'<path d="M4 20l1-4L16 5l3 3L8 19z"/><path d="M14 7l3 3"/>',
 copy:'<rect x="8" y="8" width="11" height="12" rx="1.5"/><path d="M5 16V5a1 1 0 0 1 1-1h9"/>',
 up:'<path d="M12 19V5M6 11l6-6 6 6"/>',
 trash:'<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>',
 img:'<rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="M5 17l5-4 3 2 3-3 3 3"/>',
 chevd:'<path d="M6 9l6 6 6-6"/>'
});
const emptyPage=m=>`<div class="v8top"><button class="rb" data-a="ovb" aria-label="Kembali">${ico('back',28)}</button></div><div class="empty">${m}</div>`;
const gBg=g=>{const t=okImg(g.thumb),ic=okImg(g.icon);return ic?`url(${ic})`:t?`url(${t})`:`linear-gradient(135deg,${hexc(g.col,'#b6f25a')},${hexc(g.sky,'#7df9ff')})`};
const gLetter=g=>okImg(g.icon)||okImg(g.thumb)?'':esc(g.emoji||String(g.name||'?').charAt(0).toUpperCase());

/* ================= SERVER PRIVAT ================= */
const PS=()=>ls.get('sp_ps',{}),PSs=o=>ls.set('sp_ps',o);
function PSmod(id,fn){const o=PS();if(o[id]){fn(o[id]);PSs(o)}}
const canJoin=s=>s.owner==me.name||(s.on&&(s.mem.includes(me.name)||(s.fr&&rel(s.owner)=='friend')));
const inRoom=(gid,room)=>Object.keys(users).filter(k=>{const p=users[k].pres;return p&&p.g==gid&&p.room==room});
let PSJOIN=0;
function avStack(names){if(!names.length)return'<div class="v8av"><small style="grid-column:1/3;align-self:center">Belum ada pemain</small></div>';
 const sh=names.slice(0,names.length>6?5:6);return `<div class="v8av">${sh.map(n=>circ(users[n].av,46)).join('')}${names.length>6?`<span class="more">+${names.length-5}</span>`:''}</div>`}
function srvCard(gid,room,title,idTxt){const p=inRoom(gid,room);
 return `<div class="v8sv">${avStack(p)}<small>${p.length} dari maksimal ${CAP} pemain</small><div class="v8bar"><i style="width:${Math.min(100,p.length/CAP*100)}%"></i></div><button class="v8btn w" data-a="psgo" data-v="${esc(gid)}|${esc(room)}">${p.length>=CAP?'Penuh':'Bergabung'}</button><span class="id">${esc(title)} · ID: ${esc(idTxt)}</span></div>`}
function srvOv(gid){const g=allGames().find(x=>x.id==gid);if(!g)return emptyPage('Game tidak ditemukan.');
 const all=Object.values(PS()),owned=all.filter(s=>s.owner==me.name),
  list=all.filter(s=>s.gid==gid&&(s.owner==me.name||canJoin(s))).sort((a,b)=>(a.owner==me.name?0:1)-(b.owner==me.name?0:1)),
  limit=owned.length>=PSMAX,pf=playingFriends(gid),
  rooms=['publik'];Object.keys(users).forEach(k=>{const p=users[k].pres;if(p&&p.g==gid&&p.room&&!String(p.room).startsWith('ps-')&&!rooms.includes(p.room))rooms.push(p.room)});
 const row=s=>{const c=inRoom(gid,'ps-'+s.id).length;return `<div class="v8row"><span class="ic2" style="background-image:${gBg(g)}">${gLetter(g)}</span><span class="tx"><b>${esc(s.name)}</b><small>${c} dari maksimal ${CAP} pemain${s.owner!=me.name?' · oleh '+esc(s.owner):''}${s.owner==me.name&&!s.on?' · Nonaktif':''}</small></span>${s.owner==me.name?`<button class="v8btn" data-a="psc" data-v="${esc(s.id)}" aria-label="Edit">${ico('pencil',20)}</button>`:''}<button class="v8btn bl" data-a="psgo" data-v="${esc(gid)}|ps-${esc(s.id)}">Bergabung</button></div>`};
 return `<div class="v8top"><button class="rb" data-a="ovb" aria-label="Tutup">${ico('x',30)}</button><h2>Server</h2></div><div class="v8b">
 <h3 class="v8h" style="margin-top:6px">Server privatmu</h3><p class="v8p">Bermain di ruangmu sendiri, sendirian atau bersama pengguna yang kamu undang.</p>
 <div class="v8row"><span class="ic2" style="border-radius:50%">${ico('invite',28)}</span><span class="tx"><b>Buat server privat</b><small>${limit?'Batas jumlah server privat tercapai':'Maksimal '+PSMAX+' server ('+owned.length+' terpakai)'}</small></span><button class="v8btn ${limit?'off':''}" data-a="pscreate" data-v="${esc(gid)}">Buat</button></div>
 ${list.map(row).join('')}
 <div class="v8sh"><b>Server yang Ada Teman Saya</b><button class="v8btn" style="background:none" data-a="psref">Refresh ${ico('swap',20)}</button></div>
 ${pf.length?pf.map(n=>`<div class="v8row"><span class="ic2" style="border-radius:50%;background:none">${circ(pinfo(n).av,48)}</span><span class="tx"><b>${esc(n)}</b><small>Sedang bermain</small></span><button class="v8btn bl" data-a="join" data-v="${esc(n)}">Gabung</button></div>`).join(''):'<div class="v8none">Tidak menemukan server.</div>'}
 <div class="v8sh"><b>Layanan Lainnya</b><button class="v8btn" style="background:none" data-a="psref">Refresh ${ico('swap',20)}</button></div>
 <div class="v8g" style="margin-top:12px">${rooms.map(r=>srvCard(gid,r,r=='publik'?'Server publik':'Server',r)).join('')}</div></div>`}
function pscOv(id){const s=PS()[id];if(!s||s.owner!=me.name)return emptyPage('Server tidak ditemukan.');const g=allGames().find(x=>x.id==s.gid)||{name:'-'};
 const lnk=s.link?location.href.split('#')[0]+'#ps='+s.link:'';
 return `<div class="v8top"><button class="rb" data-a="ovb" aria-label="Kembali">${ico('back',28)}</button><h2>Konfigurasi Server Privat</h2></div><div class="v8b">
 <div class="v8sq" style="background-image:${gBg(g)}">${gLetter(g)}</div>
 <div class="v8kv"><span>Nama Server</span><b><em>${esc(s.name)}</em><button class="v8ico" data-a="psren" data-v="${esc(id)}" aria-label="Ubah nama">${ico('pencil',22)}</button></b></div>
 <div class="v8kv"><span>Pengalaman Virtual</span><b><em>${esc(g.name)}</em></b></div>
 <div class="v8kv"><span>Harga Subscription</span><b>Gratis</b></div>
 <div class="v8box"><div class="hd">Izinkan Bergabung<button class="v8sw ${s.on?'on':''}" data-a="pson" data-v="${esc(id)}" aria-label="Izinkan bergabung"></button></div><p>Menonaktifkan ini akan membuat server privat tidak dapat diakses untuk kamu dan pengguna lain yang telah kamu undang ke server privat ini dan akan membatalkan kode tautan saat ini. Kamu dapat mengaktifkan kembali server privat kapan saja.</p></div>
 <div class="v8box"><div class="hd">Teman Diizinkan<button class="v8sw ${s.fr?'on':''}" data-a="psfr" data-v="${esc(id)}" aria-label="Teman diizinkan"></button></div><hr>
  <div class="hd">Anggota Server<button class="v8btn" data-a="psadd" data-v="${esc(id)}">Tambahkan Pengguna</button></div>
  ${s.mem.length?s.mem.map(n=>`<div class="v8row"><span class="ic2" style="border-radius:50%;background:none">${circ(pinfo(n)?pinfo(n).av:undefined,44)}</span><span class="tx"><b>${esc(n)}${users[n]?vb(users[n]):''}</b></span><button class="v8btn dg" data-a="psrm" data-v="${esc(id)}|${esc(n)}">Hapus</button></div>`).join(''):'<p style="color:var(--mut);margin:12px 0 0">Tidak ada</p>'}<hr>
  <div class="hd">Tautan Server Privat<button class="v8btn" data-a="pslink" data-v="${esc(id)}">${s.link?'Buat Ulang':'Buat'}</button></div>
  <div class="v8kv" style="border:1px solid #5a3236;border-radius:12px;padding:12px 14px;margin-top:12px"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;flex:1;font-size:14px">${s.link?esc(lnk):'Bergabung ke Tautan Pengalaman Virtual...'}</span><button class="v8ico" data-a="pscopy" data-v="${esc(id)}" aria-label="Salin">${ico('copy',22)}</button></div>
  <p style="margin-top:10px;font-size:13px;color:var(--mut)">Server privat tersimpan di perangkat ini. Tautan berlaku untuk akun yang membukanya di perangkat yang sama.</p></div>
 <button class="v8btn dg w" data-a="psdel" data-v="${esc(id)}">${ico('trash',20)} Hapus Server</button></div>`}
function psRef(){ovRender()}
Object.assign(act,{
 srv(gid){ovOpen('srv',gid)},
 psref(){ovRender();toast('Daftar server diperbarui')},
 psc(id){ovOpen('psc',id)},
 pscreate(gid){const o=PS();if(Object.values(o).filter(s=>s.owner==me.name).length>=PSMAX)return toast('Batas jumlah server privat tercapai');
  const id=Math.random().toString(36).slice(2,8);o[id]={id,gid,owner:me.name,name:'Server '+me.name,on:true,fr:false,mem:[],link:'',t:Date.now()};PSs(o);toast('Servermu berhasil dibuat');ovRender()},
 psgo(v){const i=v.indexOf('|'),gid=v.slice(0,i),room=v.slice(i+1),g=allGames().find(x=>x.id==gid);if(!g)return toast('Game tidak ditemukan');
  if(room.startsWith('ps-')){const s=PS()[room.slice(3)];if(!s||!canJoin(s))return toast('Kamu tidak diizinkan masuk ke server ini')}
  else if(inRoom(gid,room).filter(n=>n!=me.name).length>=CAP)return toast('Server penuh');
  roomCode=room;save();PSJOIN=1;act.play(gid)},
 psren(id){const s=PS()[id];if(!s)return;shOpen(`<div class="shn" style="margin-top:6px">Nama Server</div><input class="shin" id="v8nm" type="text" maxlength="30" value="${esc(s.name)}" autocomplete="off"><button class="sb pr" data-a="psrens" data-v="${esc(id)}">Simpan</button><button class="sb ln" data-a="shx">Batal</button>`)},
 psrens(id){const el=$('#v8nm'),n=(el&&el.value||'').trim();if(n.length<3)return toast('Nama minimal 3 huruf');PSmod(id,s=>s.name=n);shClose();toast('Nama server disimpan');ovRender()},
 pson(id){PSmod(id,s=>{s.on=!s.on;if(!s.on)s.link=''});toast(PS()[id].on?'Server dapat dimasuki':'Server dinonaktifkan, tautan dibatalkan');ovRender()},
 psfr(id){PSmod(id,s=>s.fr=!s.fr);toast(PS()[id].fr?'Semua temanmu boleh bergabung':'Hanya anggota yang boleh bergabung');ovRender()},
 psadd(id){shOpen(`<div class="shn" style="margin-top:6px">Tambahkan Pengguna</div><input class="shin" id="v8aq" data-id="${esc(id)}" placeholder="Cari username" autocomplete="off" autocapitalize="none" maxlength="20"><div id="v8al">${addList(id,'')}</div><button class="sb ln" data-a="shx">Tutup</button>`)},
 psaddu(v){const i=v.indexOf('|'),id=v.slice(0,i),n=v.slice(i+1);const s=PS()[id];if(!s||!users[n])return;if(!s.mem.includes(n)){PSmod(id,x=>x.mem.push(n));pushNote(users[n],me.name+' mengundangmu ke server privat "'+s.name+'"')}toast(n+' ditambahkan');const q=$('#v8aq'),l=$('#v8al');if(l)l.innerHTML=addList(id,q?q.value:'');ovRender()},
 psrm(v){const i=v.indexOf('|'),id=v.slice(0,i),n=v.slice(i+1);PSmod(id,s=>s.mem=s.mem.filter(x=>x!=n));toast(n+' dihapus dari server');ovRender()},
 pslink(id){PSmod(id,s=>{if(!s.on)return;s.link=Math.random().toString(36).slice(2,10)});if(!PS()[id].on)return toast('Aktifkan "Izinkan Bergabung" dulu');toast('Tautan server dibuat');ovRender()},
 pscopy(id){const s=PS()[id];if(!s||!s.link)return toast('Buat tautan dulu');const t=location.href.split('#')[0]+'#ps='+s.link;try{navigator.clipboard.writeText(t)}catch(e){}toast('Tautan disalin')},
 psdel(id){const s=PS()[id];if(!s)return;shOpen(`<div class="shn" style="margin-top:6px">Hapus "${esc(s.name)}"?</div><p class="v8p" style="text-align:center">Server dan tautannya akan dihapus permanen.</p><button class="sb" style="color:#ff9aa0" data-a="psdel2" data-v="${esc(id)}">Hapus Server</button><button class="sb ln" data-a="shx">Batal</button>`)},
 psdel2(id){const o=PS();delete o[id];PSs(o);shClose();OVS.pop();ovRender();toast('Server dihapus')},
 gmenu(){const tp=OVS[OVS.length-1],id=tp&&tp.t=='game'?tp.a:'';shOpen(`<div class="shn" style="margin-top:6px">Opsi</div><button class="sb" data-a="srv" data-v="${esc(id)}">Server</button><button class="sb" data-a="gcpid" data-v="${esc(id)}">Salin ID game</button>${(me.games||[]).some(g=>g.id==id)?`<button class="sb" data-a="shshare" data-v="${esc(id)}">Bagikan ke teman</button>`:''}<button class="sb ln" data-a="shx">Tutup</button>`)},
 gcpid(id){try{navigator.clipboard.writeText(id)}catch(e){}shClose();toast('ID game disalin')}
});
function addList(id,q){const s=PS()[id];q=String(q||'').trim().toLowerCase();const f=FRD(me).f;
 const l=allPeople().filter(n=>users[n]&&!s.mem.includes(n)&&n!=s.owner&&(!q||n.toLowerCase().includes(q))).sort((a,b)=>f.includes(b)-f.includes(a)).slice(0,30);
 return l.length?l.map(n=>`<div class="ur"><span class="ura">${circ(users[n].av,44)}<span><b>${esc(n)}${vb(users[n])}</b><small>${f.includes(n)?'Teman':subOf(n)}</small></span></span><button class="ub bl" data-a="psaddu" data-v="${esc(id)}|${esc(n)}">Tambah</button></div>`).join(''):'<div class="empty">Pengguna tidak ditemukan.</div>'}
const _pl8=act.play;act.play=function(v,t){if(!PSJOIN){roomCode='publik';save()}PSJOIN=0;return _pl8.call(act,v,t)};
const _jn8=act.join;act.join=function(n){const ps=presOf(n),r=ps&&ps.room;if(r&&String(r).startsWith('ps-')){const s=PS()[String(r).slice(3)];if(s&&!canJoin(s))return toast('Server privat: kamu belum diizinkan masuk')}return _jn8.call(act,n)};
function hashPS(){const m=/#ps=([a-z0-9]+)/i.exec(location.hash||'');if(!m||!me)return;try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}
 const s=Object.values(PS()).find(x=>x.link&&x.link==m[1]);if(!s)return toast('Tautan server tidak valid atau sudah diganti');if(!s.on&&s.owner!=me.name)return toast('Server privat sedang dinonaktifkan');
 if(s.owner!=me.name&&!s.mem.includes(me.name)){PSmod(s.id,x=>x.mem.push(me.name));if(users[s.owner])pushNote(users[s.owner],me.name+' bergabung ke servermu "'+s.name+'"')}
 ovOpen('srv',s.gid);toast('Kamu diizinkan masuk ke "'+s.name+'"')}
window.addEventListener('hashchange',hashPS);

/* ================= DETAIL GAME ================= */
const _go8=gameOv;
gameOv=function(id){let h=_go8(id);
 h=h.replace(/<div class="irow"><span>Kode room<\/span><b>[^<]*<\/b><\/div>/,`<button class="irow v8lnk" data-a="srv" data-v="${esc(id)}"><span>Server</span><b>Lihat ${ico('chev',18)}</b></button>`);
 h=h.replace('data-a="gmenu" aria-label="Undang"',`data-a="srv" data-v="${esc(id)}" aria-label="Server"`);return h};

/* ================= BERANDA ================= */
const _hm8=homeH;
homeH=function(){return _hm8.apply(this,arguments).replace(/<h3 class="sec">Mabar bareng teman<\/h3>[\s\S]*$/,'')};

/* ================= BELI SANDBUX ================= */
const PK=[[80,'Rp 18 rb'],[400,'Rp 90 rb'],[800,'Rp 180 rb'],[1200,'Rp 249 rb'],[1700,'Rp 360 rb'],[3150,'Rp 599 rb'],[4500,'Rp 900 rb'],[10000,'Rp 1,799 jt'],[22500,'Rp 3,599 jt']].reverse();
function shopOv(){const fq=(q,a)=>`<details class="v8fq"><summary>${q}${ico('chevd',22)}</summary><p>${a}</p></details>`;
 return `<div class="v8top"><button class="rb" data-a="ovb" aria-label="Tutup">${ico('x',30)}</button><span class="v8bal">${ico('hex',30)} ${nf(me.bux)}</span><span class="sp"></span><button class="v8btn" data-a="kirim">${ico('up',18)} Kirim</button></div><div class="v8b">
 <h2 class="v8h" style="margin-top:14px">Paket SandBux</h2><p class="v8p">Dengan membeli SandBux, kamu menyetujui aturan komunitas Sandbox.</p>
 <div class="v8box" style="padding:6px 18px">${PK.map((p,i)=>`<div class="v8pk"><b>${ico('hex',30)} ${nf(p[0])}</b><button class="pr ${i==PK.length-1?'hi':''}" data-a="pkg" data-v="${p[0]}">${p[1]}</button></div>`).join('')}</div>
 <h2 class="v8h">Cara lain untuk mendapatkan SandBux</h2>
 <div class="v8box"><div class="hd">Bonus Harian</div><p>Ambil +50 SandBux gratis setiap hari.</p><button class="v8btn w" style="margin-top:14px" data-a="daily">Ambil Bonus</button></div>
 <div class="v8box"><div class="hd">Kode Redeem</div><p>Punya kode dari Owner atau staf? Tukarkan dengan SandBux.</p><button class="v8btn w" style="margin-top:14px" data-a="redeem">Tukar Kode</button></div>
 <div class="v8box"><div class="hd">Gift Card</div><p>Beli gift card Sandbox.</p><button class="v8btn w" style="margin-top:14px" data-a="soon" data-v="Gift Card">Beli</button></div>
 <h2 class="v8h">FAQ</h2>
 ${fq('Apa itu SandBux?','SandBux adalah mata uang di Sandbox. Pakai untuk membeli item avatar di Marketplace dan membeli aksesori kreator lain.')}
 ${fq('Di mana SandBux-ku?','Saldomu tampil di pojok atas halaman ini dan di halaman Avatar. Tiap item yang kamu beli masuk ke Inventaris.')}
 ${fq('Apakah SandBux kedaluwarsa?','Tidak. SandBux di akunmu tidak kedaluwarsa.')}</div>`}
Object.assign(act,{
 shop(){ovOpen('shop')},
 pkg(n){shOpen(`<div class="shn" style="margin-top:6px">${nf(n)} SandBux</div><p class="v8p" style="text-align:center;margin-top:8px">Pembayaran uang asli belum tersedia di Sandbox. Dapatkan SandBux lewat Bonus Harian atau kode redeem.</p><button class="sb pr" data-a="pkgd">Ambil Bonus Harian</button><button class="sb" data-a="pkgr">Tukar Kode</button><button class="sb ln" data-a="shx">Tutup</button>`)},
 pkgd(){shClose();act.daily()},pkgr(){shClose();act.redeem()},
 kirim(){const fl=FRD(me).f.filter(n=>users[n]);shOpen(`<div class="shn" style="margin-top:6px">Kirim SandBux</div><p class="v8p">Saldo: ${nf(me.bux)} SandBux. Kamu hanya bisa mengirim ke temanmu.</p><input class="shin" id="v8ku" list="v8kl" placeholder="Username teman" autocomplete="off" autocapitalize="none" maxlength="20"><datalist id="v8kl">${fl.map(n=>`<option value="${esc(n)}">`).join('')}</datalist><input class="shin" id="v8ka" inputmode="numeric" placeholder="Jumlah SandBux" maxlength="9"><button class="sb pr" data-a="kirim2">Kirim</button><button class="sb ln" data-a="shx">Batal</button>`)},
 kirim2(){const n=(($('#v8ku')||{}).value||'').trim().replace(/^@/,''),k=Object.keys(users).find(x=>x.toLowerCase()==n.toLowerCase()),a=Math.floor(+String((($('#v8ka')||{}).value||'')).replace(/\D/g,''));
  if(!k||k==me.name)return toast('Username tidak ditemukan');if(rel(k)!='friend')return toast('Kamu hanya bisa mengirim ke teman');if(!(a>0))return toast('Jumlah tidak valid');if(a>me.bux)return toast('SandBux tidak cukup');
  addBux(-a);users[k].bux=(users[k].bux||0)+a;pushNote(users[k],me.name+' mengirim '+nf(a)+' SandBux kepadamu');notify('Kamu mengirim '+nf(a)+' SandBux ke '+k);save();shClose();toast('Terkirim '+nf(a)+' SandBux ke '+k);ovRender()}
});
addBux=function(n){me.bux+=n;save();const p=document.querySelector('.hb[data-a=shop]');if(p){p.classList.remove('bump');void p.offsetWidth;p.classList.add('bump')}navRender()};
const _bc8=buildChrome;
buildChrome=function(){_bc8.apply(this,arguments);const b=document.querySelector('#app header .hb[data-a=daily]');if(b){b.dataset.a='shop';b.setAttribute('aria-label','Beli SandBux')}};
const _df8=drawerFill;
drawerFill=function(){_df8.apply(this,arguments);const d=$('#dpn');
 const c=[...d.querySelectorAll('.mi')].find(x=>x.dataset.v=='soon:Komunitas');if(c)c.dataset.v='comm';
 const r=d.querySelector('.mi[data-a="redeem"]');if(r)r.insertAdjacentHTML('beforebegin',`<button class="mi" data-a="dnav" data-v="shop">${ico('hex',27)}<span>Beli SandBux</span></button>`)};
const _dn8=act.dnav;
act.dnav=function(v){if(v=='comm'){act.dclose();return act.comm()}if(v=='shop'){act.dclose();return act.shop()}return _dn8.apply(this,arguments)};

/* ================= TERATAS ================= */
const actv=g=>(g.pl||0)+Object.keys(users).filter(k=>users[k].pres&&users[k].pres.g==g.id).length;
function TOPS(k){const gs=pubGames(),vis=ls.get('sp_vis',{}),sc=g=>(vis[g.id]||0)+(g.pl||0);
 if(k=='trend')return{t:'Tren Teratas',l:gs.slice().sort((a,b)=>sc(b)-sc(a)),c:actv,e:''};
 if(k=='new')return{t:'Baru Dirilis',l:gs.map((g,i)=>[g,i]).sort((a,b)=>(b[0].upd||0)-(a[0].upd||0)||b[1]-a[1]).map(x=>x[0]),c:actv,e:''};
 if(k=='active')return{t:'Paling Banyak Dimainkan Sekarang',l:gs.slice().sort((a,b)=>actv(b)-actv(a)),c:actv,e:''};
 return{t:'Lebih Seru Bersama Teman',l:gs.filter(g=>playingFriends(g.id).length),c:g=>playingFriends(g.id).length,e:'Belum ada temanmu yang sedang bermain.'}}
function tcard(g,n){const t=okImg(g.thumb);return `<button class="gc" data-a="gopen" data-v="${esc(g.id)}"><span class="gt" style="background:${t?`url(${t}) center/cover`:`linear-gradient(135deg,${hexc(g.col,'#b6f25a')},${hexc(g.sky,'#7df9ff')})`}">${t?'':esc(g.emoji||String(g.name||'?').charAt(0).toUpperCase())}</span><strong>${esc(g.name)}</strong><small>${ico('thumb',15)} ${g.lk>0?(+g.lk)+'%':'Baru'} ${ico('friends',15)} ${fmtN(n)}</small></button>`}
function leaders(){const us=Object.keys(users).filter(k=>!users[k].role&&!banOf(users[k])).sort((a,b)=>(users[b].bux||0)-(users[a].bux||0)).slice(0,10);
 return '<h3 class="sec">Pemain Teratas</h3>'+(us.length?us.map((k,i)=>`<div class="lbr ${i==0?'t1':''}" data-a="prof" data-v="${esc(k)}" style="cursor:pointer"><div class="rank">${i+1}</div>${circ(users[k].av,36)}<b>${esc(k)}${vb(users[k])}${k==me.name?' (kamu)':''}</b><span class="v">${nf(users[k].bux||0)} SandBux</span></div>`).join(''):'<div class="empty2"><p style="margin:0">Belum ada pemain.</p></div>')}
function topV8(){const gs=pubGames();if(!gs.length)return '<h2>Teratas</h2><div class="empty2"><b>Belum ada game</b><p>Belum ada game yang dipublish.</p></div>'+leaders();
 const sec=k=>{const s=TOPS(k);return `<h3 class="sec" data-a="tsec" data-v="${k}" style="cursor:pointer">${s.t} ${ico('chev',20)}</h3>`+(s.l.length?`<div class="hs">${s.l.slice(0,10).map(g=>tcard(g,s.c(g))).join('')}</div>`:`<div class="v8none">${s.e}</div>`)};
 return '<h2>Teratas</h2>'+sec('trend')+sec('new')+sec('active')+sec('fr')+leaders()}
function tsecOv(k){const s=TOPS(k);return `<div class="v8top"><button class="rb" data-a="ovb" aria-label="Kembali">${ico('back',28)}</button><h2>${s.t}</h2></div><div class="v8b">${s.l.length?`<div class="gg" style="margin-top:12px">${s.l.map(g=>tcard(g,s.c(g))).join('')}</div>`:`<div class="v8none">${s.e||'Belum ada game.'}</div>`}</div>`}
act.tsec=function(k){ovOpen('tsec',k)};
const _r9=render;
render=function(){_r9.apply(this,arguments);if(!me)return;if(page=='top'){const m=$('#main');m.innerHTML='<div class="page">'+topV8()+'</div>';navRender()}
 const tp=OVS[OVS.length-1];if(tp&&(tp.t=='shop'||tp.t=='srv'||tp.t=='psc'))ovRender()};

/* ================= KOMUNITAS ================= */
const CM=()=>ls.get('sp_comm',[]),CMs=a=>ls.set('sp_comm',a);
function CMmod(id,fn){const a=CM(),c=a.find(x=>x.id==id);if(c){fn(c);CMs(a)}}
const cmCnt=c=>Object.keys(c.mem).length;
const cmSt=c=>c.mem[me.name]=='owner'?'own':c.mem[me.name]?'mem':(c.pend||[]).includes(me.name)?'pen':'non';
const cmIc=(c,s)=>`<span class="ic2" style="width:${s}px;height:${s}px;${okImg(c.icon)?`background-image:url(${c.icon})`:''}">${okImg(c.icon)?'':esc(c.name.charAt(0).toUpperCase())}</span>`;
let CT='mine',CQ='',CD=null;
const cdNew=()=>{CD={name:'',desc:'',icon:'',cover:'',mode:'open'}};
function cmList(){const q=CQ.trim().toLowerCase(),a=CM().filter(c=>!q||c.name.toLowerCase().includes(q));
 const row=c=>{const s=cmSt(c);return `<button class="v8row v8lnk" data-a="cview" data-v="${esc(c.id)}">${cmIc(c,60)}<span class="tx"><b>${esc(c.name)}</b><small>${nf(cmCnt(c))} anggota</small></span><span class="v8pill ${s=='own'?'own':''}">${s=='own'?'Dimiliki':s=='mem'?'Member':s=='pen'?'Menunggu':'Lihat'}</span></button>`};
 if(CT=='all')return a.length?a.map(row).join(''):'<div class="v8none">Belum ada komunitas.</div>';
 const own=a.filter(c=>cmSt(c)=='own'),mem=a.filter(c=>cmSt(c)=='mem');
 if(!own.length&&!mem.length)return `<div class="empty2"><b>${q?'Tidak ditemukan':'Belum ada komunitas'}</b><p>${q?'Coba kata kunci lain.':'Buat komunitasmu sendiri atau lihat semua komunitas untuk bergabung.'}</p></div>`;
 return (own.length?`<h3 class="v8h">Utama</h3>${own.map(row).join('')}`:'')+(mem.length?`<h3 class="v8h">Komunitas Saya</h3>${mem.map(row).join('')}`:'')}
function commOv(){return `<div class="v8top"><button class="rb" data-a="ovb" aria-label="Kembali">${ico('back',28)}</button><h2>Komunitas</h2><button class="v8btn" style="background:none" data-a="ctab">${CT=='mine'?'Lihat Semua':'Komunitasku'}</button></div><div class="v8b">
 <input class="shin" id="v8cq" type="text" placeholder="${CT=='mine'?'Cari Komunitas Saya':'Cari semua komunitas'}" value="${esc(CQ)}" autocomplete="off" maxlength="50" style="padding:15px 16px">
 <button class="v8btn w" style="margin-top:12px" data-a="cnew">Buat Komunitas</button><div id="v8cl">${cmList()}</div></div>`}
function cviewOv(id){const c=CM().find(x=>x.id==id);if(!c)return emptyPage('Komunitas tidak ditemukan.');const s=cmSt(c),ow=users[c.owner],mem=Object.keys(c.mem);
 const act1=s=='own'?`<button class="v8btn dg w" data-a="cdel" data-v="${esc(id)}">${ico('trash',20)} Hapus Komunitas</button>`:s=='mem'?`<button class="v8btn w" data-a="cleave" data-v="${esc(id)}">Keluar dari Komunitas</button>`:s=='pen'?`<button class="v8btn w" data-a="ccancel" data-v="${esc(id)}">Permintaan terkirim · Batalkan</button>`:`<button class="v8btn bl w" data-a="cjoin" data-v="${esc(id)}">${c.mode=='open'?'Bergabung':'Minta Bergabung'}</button>`;
 return `<div class="v8top" style="position:absolute;left:0;right:0;background:none"><button class="rb" data-a="ovb" aria-label="Kembali" style="background:#0007">${ico('back',28)}</button></div><div class="v8cv" style="${okImg(c.cover)?`background-image:url(${c.cover})`:''}"></div><div class="v8b" style="padding-top:0">
 <div class="v8row" style="margin-top:-30px">${cmIc(c,76)}<span class="tx"><b style="font-size:22px;white-space:normal">${esc(c.name)}</b><small>${nf(cmCnt(c))} anggota · oleh ${esc(c.owner)}${ow?vb(ow):''}</small></span></div>
 ${c.desc?`<p class="v8p" style="font-size:16px;color:#f1e4e5;white-space:pre-wrap">${esc(c.desc)}</p>`:''}${act1}
 ${s=='own'&&(c.pend||[]).length?`<h3 class="v8h">Permintaan bergabung</h3>${c.pend.map(n=>`<div class="v8row"><span class="tx"><b>${esc(n)}</b></span><button class="v8btn bl" data-a="cok" data-v="${esc(id)}|${esc(n)}">Terima</button><button class="v8btn" data-a="cno" data-v="${esc(id)}|${esc(n)}">Tolak</button></div>`).join('')}`:''}
 <h3 class="v8h">Anggota</h3>${mem.map(n=>`<div class="v8row"><button class="v8lnk v8row" style="padding:0;flex:1" data-a="prof" data-v="${esc(n)}"><span class="ic2" style="border-radius:50%;background:none;width:44px;height:44px">${circ(pinfo(n)?pinfo(n).av:undefined,44)}</span><span class="tx"><b>${esc(n)}${users[n]?vb(users[n]):''}</b><small>${c.mem[n]=='owner'?'Pemilik':'Member'}</small></span></button>${s=='own'&&c.mem[n]!='owner'?`<button class="v8btn dg" data-a="ckick" data-v="${esc(id)}|${esc(n)}">Keluarkan</button>`:''}</div>`).join('')}</div>`}
function cnewOv(){if(!CD)cdNew();const pv=(k,w,h)=>CD[k]?`<span class="pv" style="width:${w}px;height:${h}px;background-image:url(${CD[k]})"></span>`:`<span class="pv" style="width:${w}px;height:${h}px">${ico('img',34)}</span>`;
 return `<div class="v8top"><button class="rb" data-a="cback" aria-label="Tutup">${ico('x',30)}</button><h2>Buat Komunitas</h2></div><div class="v8b">
 <label>Nama*</label><input class="shin" id="v8cn" type="text" maxlength="50" autocomplete="off" value="${esc(CD.name)}"><div class="v8cnt"><span id="v8k1">${CD.name.length}</span> / 50</div>
 <label>Deskripsi</label><textarea class="shin" id="v8cd" maxlength="1000">${esc(CD.desc)}</textarea><div class="v8cnt"><span id="v8k2">${CD.desc.length}</span> / 1000</div>
 <label>Lambang*</label><button class="v8dz" data-a="cpick" data-v="icon">${pv('icon',110,110)}<span class="t">Pilih gambar dari perangkat kamu</span></button>
 <label>Foto Sampul</label><p class="v8p" style="margin:0 0 8px">Gambar akan dipotong ke 720x228.</p><button class="v8dz" data-a="cpick" data-v="cover">${pv('cover',240,76)}<span class="t">Pilih gambar dari perangkat kamu</span></button>
 <label>Pengaturan</label><div class="v8box" style="padding:0;background:#4a1519"><button class="v8rd ${CD.mode=='open'?'on':''}" data-a="cmode" data-v="open"><i></i>Siapa Pun Dapat Bergabung</button><button class="v8rd ${CD.mode=='manual'?'on':''}" data-a="cmode" data-v="manual"><i></i>Persetujuan Manual</button></div>
 <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px"><button class="v8btn" data-a="cback">Batalkan</button><button class="v8btn bl" data-a="cmake">${ico('hex',20)} ${CCOST}</button></div></div>`}
Object.assign(act,{
 comm(){CT='mine';CQ='';ovOpen('comm')},
 ctab(){CT=CT=='mine'?'all':'mine';CQ='';ovRender(1)},
 cview(id){ovOpen('cview',id)},
 cnew(){cdNew();ovOpen('cnew')},
 cback(){CD=null;OVS.pop();ovRender()},
 cmode(v){CD.mode=v;ovRender()},
 cpick(k){window.V8K=k;$('#v8fi').click()},
 cmake(){if(!CD)return;CD.name=CD.name.trim();if(CD.name.length<3)return toast('Nama komunitas minimal 3 huruf');if(!CD.icon)return toast('Pilih lambang komunitas dulu');if(me.bux<CCOST)return toast('SandBux tidak cukup (butuh '+CCOST+')');
  const id=Math.random().toString(36).slice(2,9),a=CM();addBux(-CCOST);const m={};m[me.name]='owner';a.push({id,name:CD.name,desc:CD.desc.trim(),icon:CD.icon,cover:CD.cover,owner:me.name,mode:CD.mode,mem:m,pend:[],t:Date.now()});CMs(a);notify('Komunitas "'+CD.name+'" dibuat (-'+CCOST+' SandBux)');CD=null;OVS.pop();ovOpen('cview',id);toast('Komunitas berhasil dibuat')},
 cjoin(id){const c=CM().find(x=>x.id==id);if(!c)return;if(c.mode=='open'){CMmod(id,x=>x.mem[me.name]='member');toast('Kamu bergabung ke '+c.name)}else{CMmod(id,x=>{x.pend=x.pend||[];if(!x.pend.includes(me.name))x.pend.push(me.name)});if(users[c.owner])pushNote(users[c.owner],me.name+' ingin bergabung ke "'+c.name+'"');toast('Permintaan dikirim')}ovRender()},
 ccancel(id){CMmod(id,x=>x.pend=(x.pend||[]).filter(n=>n!=me.name));toast('Permintaan dibatalkan');ovRender()},
 cleave(id){CMmod(id,x=>{delete x.mem[me.name]});toast('Kamu keluar dari komunitas');ovRender()},
 cok(v){const i=v.indexOf('|'),id=v.slice(0,i),n=v.slice(i+1);CMmod(id,x=>{x.pend=(x.pend||[]).filter(p=>p!=n);x.mem[n]='member'});if(users[n])pushNote(users[n],'Permintaanmu bergabung ke komunitas diterima');ovRender()},
 cno(v){const i=v.indexOf('|'),id=v.slice(0,i),n=v.slice(i+1);CMmod(id,x=>x.pend=(x.pend||[]).filter(p=>p!=n));ovRender()},
 ckick(v){const i=v.indexOf('|'),id=v.slice(0,i),n=v.slice(i+1);CMmod(id,x=>{delete x.mem[n]});toast(n+' dikeluarkan');ovRender()},
 cdel(id){const c=CM().find(x=>x.id==id);if(!c)return;shOpen(`<div class="shn" style="margin-top:6px">Hapus "${esc(c.name)}"?</div><p class="v8p" style="text-align:center">Komunitas dan semua anggotanya akan dihapus. Biaya pembuatan tidak dikembalikan.</p><button class="sb" style="color:#ff9aa0" data-a="cdel2" data-v="${esc(id)}">Hapus Komunitas</button><button class="sb ln" data-a="shx">Batal</button>`)},
 cdel2(id){CMs(CM().filter(x=>x.id!=id));shClose();OVS.pop();ovRender();toast('Komunitas dihapus')}
});
document.body.insertAdjacentHTML('beforeend','<input type="file" id="v8fi" accept="image/*" hidden>');
function v8img(f,W,H,cb){const fr=new FileReader();fr.onload=()=>{const im=new Image();im.onload=()=>{const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d'),s=Math.max(W/im.width,H/im.height);x.drawImage(im,(W-im.width*s)/2,(H-im.height*s)/2,im.width*s,im.height*s);cb(c.toDataURL('image/jpeg',.82))};im.onerror=()=>toast('Gambar tidak valid');im.src=fr.result};fr.readAsDataURL(f)}
$('#v8fi').addEventListener('change',e=>{const f=e.target.files[0];e.target.value='';if(!f||!CD)return;if(!/^image\//.test(f.type))return toast('File harus gambar');
 const k=window.V8K;v8img(f,k=='icon'?128:720,k=='icon'?128:228,d=>{CD[k]=d;ovRender()})});
document.addEventListener('input',e=>{const t=e.target;
 if(t.id=='v8cq'){CQ=t.value;const l=$('#v8cl');if(l)l.innerHTML=cmList()}
 if(t.id=='v8cn'&&CD){CD.name=t.value;const k=$('#v8k1');if(k)k.textContent=t.value.length}
 if(t.id=='v8cd'&&CD){CD.desc=t.value;const k=$('#v8k2');if(k)k.textContent=t.value.length}
 if(t.id=='v8aq'){const l=$('#v8al');if(l)l.innerHTML=addList(t.dataset.id,t.value)}});

/* ================= RENDER OVERLAY & MASUK ================= */
const V8={srv:srvOv,psc:pscOv,shop:shopOv,comm:commOv,cview:cviewOv,cnew:cnewOv,tsec:tsecOv};
const _ovr8=ovRender;
ovRender=function(fresh){const tp=OVS[OVS.length-1];if(!tp||!V8[tp.t])return _ovr8.apply(this,arguments);const o=$('#ov'),y=fresh?0:o.scrollTop;o.innerHTML=V8[tp.t](tp.a);o.classList.add('on');o.scrollTop=y};
const _en8=enter;
enter=function(){_en8.apply(this,arguments);setTimeout(hashPS,400)};
if(me&&$('#app').classList.contains('on')){buildChrome();render();hashPS()}
})();
;

/* ===== 16-patch.js ===== */
window.keyChk=function(k,sc,op){k=(k||'').trim();if(!k)return 'Masukkan API key';if(k===me.apiKey)return '';const e=(me.keys||[]).find(x=>x.key===k);if(!e)return 'API key tidak dikenal';if(e.exp&&e.exp<Date.now())return 'API key sudah kadaluarsa';const p=e.perm.find(x=>x.s===sc);if(!p||!p[op])return 'API key tidak punya izin '+(op==='w'?'tulis':'baca')+' '+sc;e.used=Date.now();save();return ''};
(function(){const ex=act.exp,im=act.impb;
act.exp=function(v,t){const k=prompt('Masukkan API key (izin universe-model: baca)');if(k===null)return;const e=keyChk(k,'universe-model','r');if(e)return toast(e);ex.call(this,v,t)};
act.impb=function(){const k=prompt('Masukkan API key (izin universe-model: tulis)');if(k===null)return;const e=keyChk(k,'universe-model','w');if(e)return toast(e);im.call(this)}})();
;

/* ===== 17-teman-lintas-perangkat-via-firebase-re.js ===== */
/* ===== TEMAN LINTAS PERANGKAT via Firebase Realtime Database (tanpa kode room) ===== */
(function(){
const h=t=>{let x=2166136261;for(let i=0;i<t.length;i++)x=Math.imul(x^t.charCodeAt(i),16777619);return(x>>>0).toString(36)};
const myRoom=()=>('f-'+h(me.name)).slice(0,14);
let lob=null,RG={},creating=0;
const clean=g=>{const d=JSON.parse(JSON.stringify(g));delete d.thumb;delete d.icon;delete d.by;delete d.mb;d.pub=true;d.name=String(d.name||'Game').slice(0,22);d.emoji=String(d.emoji||'').slice(0,4);if(!Array.isArray(d.objs))d.objs=[];if(d.objs.length>800)d.objs.length=800;return d};
const card=()=>{const p=me.pres&&me.pres.g?me.pres:null;let game=null;if(p){const g=allGames().find(x=>x.id==p.g)||RG[p.g];if(g){try{game=clean(g)}catch(e){}}}return{n:me.name,av:me.av,pres:p,game,t:Date.now()}};
const track=()=>{if(lob&&lob.ready&&me){try{lob.ch.track(card())}catch(e){}}};
function syncUsers(st){if(!me)return;const on={};
 for(const k in st){const e=st[k][st[k].length-1];if(!e||!e.n||e.n===me.name)continue;on[e.n]=1;
  let u=users[e.n];if(!u)u=users[e.n]={rm:1,bux:0,av:e.av,games:[],notes:[]};
  if(!u.rm)continue;u.av=e.av||u.av;u.pres=e.pres&&e.pres.g?{g:String(e.pres.g),room:String(e.pres.room||'').toLowerCase().replace(/[^a-z0-9-]/g,'').slice(0,16),t:Date.now()}:null;
  if(e.game&&e.game.id&&u.pres&&rel(e.n)=='friend'){try{const g=clean(e.game);RG[g.id]=g;u.games=[g]}catch(x){u.games=[]}}else u.games=[]}
 for(const k in users){const u=users[k];if(u.rm&&!on[k]){u.pres=null;u.games=[]}}
 save();flush();try{refreshUI()}catch(e){}}
function send(to,t,x){const ev={id:Math.random().toString(36).slice(2,10),to,from:me.name,t,x:x||'',av:me.av,ts:Date.now()};(me.ob=me.ob||[]).push(ev);try{window.spInboxPut&&spInboxPut(ev)}catch(e){}save();flush()}
function flush(){if(!lob||!lob.ready||!me||!me.ob)return;me.ob=me.ob.filter(e=>Date.now()-e.ts<6048e5);me.ob.forEach(ev=>{try{lob.ch.send({type:'broadcast',event:'ev',payload:ev})}catch(e){}})}
function onEv(p){if(!p||!me)return;
 if(p.t==='ack'){if(p.to===me.name&&me.ob){me.ob=me.ob.filter(e=>e.id!==p.id);save()}return}
 if(p.to!==me.name||!p.from)return;
 try{lob.ch.send({type:'broadcast',event:'ev',payload:{t:'ack',to:p.from,id:p.id}})}catch(e){}
 me.seen=me.seen||[];if(me.seen.includes(p.id))return;me.seen.push(p.id);if(me.seen.length>200)me.seen.shift();
 const n=String(p.from).slice(0,20);if(!users[n])users[n]={rm:1,bux:0,av:p.av,games:[],notes:[]};
 const f=FRD(me),x=p.t;
 if(x==='freq'){if(!f.f.includes(n)){if(f.o.includes(n)){f.o=f.o.filter(y=>y!=n);f.f.push(n);pushNote(me,n+' menerima permintaan pertemananmu')}else if(!f.i.includes(n)){f.i.push(n);pushNote(me,n+' mengirim permintaan pertemanan')}}}
 else if(x==='facc'){f.o=f.o.filter(y=>y!=n);if(!f.f.includes(n))f.f.push(n);pushNote(me,n+' menerima permintaan pertemananmu')}
 else if(x==='fdec'){f.o=f.o.filter(y=>y!=n)}
 else if(x==='fcan'){f.i=f.i.filter(y=>y!=n)}
 else if(x==='funf'){f.f=f.f.filter(y=>y!=n);f.i=f.i.filter(y=>y!=n)}
 else if(x==='msg'&&f.f.includes(n)){const t=String(p.x||'').slice(0,200);if(t){(me.chat=me.chat||{})[n]=(me.chat[n]||[]).concat({me:0,t,ts:Date.now()}).slice(-80);(me.unr=me.unr||{})[n]=((me.unr||{})[n]||0)+1;pushNote(me,n+': '+t.slice(0,40))}}
 save();try{refreshUI()}catch(e){}}
window.__spOnEv=p=>onEv(p);
async function lobby(){if(!me||creating||(lob&&lob.nm===me.name))return;creating=1;
 try{const sb=await spSB();if(lob){try{sb.removeChannel(lob.ch)}catch(e){}lob=null}
  const ch=sb.channel('sp-lobby-v1',{config:{presence:{key:me.name},broadcast:{self:false,ack:false}}}),L={ch,nm:me.name,ready:0};lob=L;
  ch.on('presence',{event:'sync'},()=>syncUsers(ch.presenceState()));
  ch.on('broadcast',{event:'ev'},({payload})=>onEv(payload));
  ch.subscribe(st=>{if(st==='SUBSCRIBED'){L.ready=1;track();flush()}})}catch(e){}creating=0}
window.addEventListener('load',()=>{
 const _sg=startGame;startGame=function(g,test){const r=_sg.apply(this,arguments);setTimeout(track,400);return r};
 const _st=stopGame;stopGame=function(){const r=_st.apply(this,arguments);setTimeout(track,400);return r};
 const _out=act.out;act.out=function(){try{if(lob&&window.__sb){window.__sb.removeChannel(lob.ch)}}catch(e){}lob=null;return _out.apply(this,arguments)};
 const _en=enter;enter=function(){const r=_en.apply(this,arguments);setTimeout(lobby,400);return r};
 [['freq','none'],['facc','recv'],['fdec','recv'],['fcan','sent'],['funf','friend']].forEach(([k,need])=>{const o=act[k];act[k]=function(n){const b=rel(n),r=o.apply(this,arguments);if(b===need&&users[n]&&users[n].rm)send(n,k,'');return r}});
 const os=act.say;act.say=function(){const i=$('#mi'),t=i?i.value.trim():'',n=thread;const r=os.apply(this,arguments);if(t&&n&&users[n]&&users[n].rm&&rel(n)=='friend')send(n,'msg',t);return r};
 const R=render;window.render=render=function(){R.apply(this,arguments);try{
  if(page!=='home')return;const rc=document.getElementById('rc');if(rc){const c=rc.closest('.card'),hh=c&&c.previousElementSibling;if(hh&&hh.classList.contains('sec'))hh.style.display='none';if(c)c.style.display='none'}
  const k=document.getElementById('rkc');if(k)k.style.display='none';
  if(document.getElementById('frh'))return;const fl=friends(),m=document.querySelector('#main .page')||$('#main');
  const html='<h3 class="sec">Teman</h3><div class="card" id="frh"><div style="margin-bottom:10px">'+(fl.length?fl.map(x=>'<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px"><b style="flex:1">'+esc(x.n)+'<small style="display:block;font-weight:400">'+(x.pl?'Bermain: '+esc(x.g):'Offline')+'</small></b>'+(x.pl?'<button class="btn sm g" data-a="join" data-v="'+esc(x.n)+'">Gabung</button>':'')+'</div>').join(''):'<small>Belum ada teman. Tambah teman, lalu bergabung ke game mereka.</small>')+'</div><button class="btn w" data-a="ppl">+ Cari / Tambah Teman</button></div>';
  if(rc&&rc.closest('.card'))rc.closest('.card').insertAdjacentHTML('afterend',html);else m.insertAdjacentHTML('beforeend',html)}catch(e){}};
 setInterval(()=>{if(me&&$('#app').classList.contains('on')){lobby();track()}},6000);
 if(me&&$('#app').classList.contains('on'))setTimeout(lobby,800)});
})();
;

/* ===== 18-katalog-map-global.js ===== */
/* ===== KATALOG MAP GLOBAL: map yang dipublish tampil di semua HP/browser/akun =====
   Tiap map dipublish sebagai pesan "retained" di 3 broker MQTT publik (topik sandbox/v9/cat/<id>).
   HP lain subscribe ke topik itu dan langsung menerima semua map yang pernah dipublish. */
(function(){
const BR=['wss://broker.emqx.io:8084/mqtt','wss://broker.hivemq.com:8884/mqtt','wss://test.mosquitto.org:8081'];
const PFX='sandbox/v9/cat/',MAXB=700000;
const lib=()=>new Promise(r=>{if(window.mqtt)return r(1);const e=document.createElement('script');e.src='https://cdn.jsdelivr.net/npm/mqtt@5.10.1/dist/mqtt.min.js';e.onload=()=>r(!!window.mqtt);e.onerror=()=>r(0);document.head.appendChild(e)});
const hsh=t=>{let h=2166136261;for(let i=0;i<t.length;i++)h=Math.imul(h^t.charCodeAt(i),16777619);return(h>>>0).toString(36)+t.length};
const b64=u=>{let s='';for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(s)};
const unb64=t=>{const s=atob(t),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u};
const pipe=async(data,S)=>{const st=new S('gzip'),w=st.writable.getWriter();w.write(data);w.close();return new Uint8Array(await new Response(st.readable).arrayBuffer())};
const enc=async o=>{const j=JSON.stringify(o);if(window.CompressionStream){try{return 'z1:'+b64(await pipe(new TextEncoder().encode(j),CompressionStream))}catch(e){}}return 'j1:'+j};
const dec=async s=>{try{if(s.startsWith('x1:'))return{dead:1,ts:+s.slice(3)||0};if(s.startsWith('j1:'))return JSON.parse(s.slice(3));if(s.startsWith('z1:'))return JSON.parse(new TextDecoder().decode(await pipe(unb64(s.slice(3)),DecompressionStream)))}catch(e){}return null};
const shrink=(src,w,h,q)=>new Promise(res=>{if(!src)return res('');const im=new Image();im.onload=()=>{try{const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d'),r=Math.max(w/im.width,h/im.height),dw=im.width*r,dh=im.height*r;x.drawImage(im,(w-dw)/2,(h-dh)/2,dw,dh);res(c.toDataURL('image/jpeg',q))}catch(e){res('')}};im.onerror=()=>res('');im.src=src});
const sigOf=g=>{const d=Object.assign({},g);['pl','lk','mine','mb'].forEach(k=>delete d[k]);return hsh(JSON.stringify(d))};
const hx=(c,f)=>/^#[0-9a-f]{6}$/i.test(c||'')?c:f;
const okI=u=>/^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+\/=]+$/.test(u||'')?u:'';
const cleanRemote=(g,id)=>{if(!g||typeof g!=='object'||!Array.isArray(g.objs))return null;const d=Object.assign({},g);d.id=id;d.name=String(d.name||'Map').slice(0,22);d.desc=String(d.desc||'').slice(0,140);d.emoji=String(d.emoji||'').slice(0,4);d.col=hx(d.col,'#b6f25a');d.sky=hx(d.sky,'#7df9ff');d.by=String(d.by||'Sandbox').slice(0,20);d.thumb=okI(d.thumb);d.icon=okI(d.icon);if(d.rv&&d.rv.s&&d.rv.s!=='approved')return null;d.pub=true;d.rp=1;delete d.mb;delete d.mine;if(d.objs.length>4000)d.objs.length=4000;return d};

/* ---- kirim (publish / unpublish) ---- */
function pushAll(msgs){return new Promise(async res=>{if(!(window.mqtt||await lib()))return res(0);let ok=0,pend=BR.length;
 const fin=()=>{if(--pend===0)res(ok)};
 BR.forEach(url=>{let done=0,m;const end=g=>{if(done)return;done=1;if(g)ok++;try{m.end(true)}catch(e){}fin()};
  try{m=mqtt.connect(url,{clientId:'spc_'+Math.random().toString(16).slice(2,12),connectTimeout:6000,reconnectPeriod:0,clean:true});}catch(e){done=1;return fin()}
  m.on('error',()=>end(0));m.on('close',()=>end(0));
  m.on('connect',async()=>{try{for(const x of msgs)await new Promise(r=>m.publish(x.t,x.p,{qos:1,retain:true},()=>r()));end(1)}catch(e){end(0)}});
  setTimeout(()=>end(0),15000)})})}
let syncing=0;
async function sync(){if(syncing||typeof users==='undefined')return;syncing=1;
 try{const sigs=ls.get('sp_catsig',{}),cur={};
  Object.values(users).forEach(u=>{if(!u||u.rm||banOf(u))return;(u.games||[]).forEach(g=>{if(g&&g.pub===true&&!(g.rv&&g.rv.s&&g.rv.s!=='approved')&&!g.mb&&g.id&&g.icon&&g.thumb&&Array.isArray(g.objs))cur[g.id]=g})});
  const msgs=[],upd={};
  for(const id in cur){const sg=sigOf(cur[id]),e=sigs[id];if(e&&e.s===sg&&Date.now()-e.t<216e5)continue;
   const g=JSON.parse(JSON.stringify(cur[id]));['pl','lk','mine','mb'].forEach(k=>delete g[k]);
   g.icon=await shrink(g.icon,96,96,.75);g.thumb=await shrink(g.thumb,320,180,.65);
   const p=await enc({ts:Date.now(),g});if(p.length>MAXB){try{toast('Map "'+g.name+'" terlalu besar untuk dibagikan online')}catch(e){}continue}
   msgs.push({t:PFX+id,p});upd[id]={s:sg,t:Date.now()}}
  const gone=[];for(const id in sigs)if(!cur[id]){msgs.push({t:PFX+id,p:'x1:'+Date.now()});gone.push(id)}
  if(!msgs.length)return;
  const ok=await pushAll(msgs);
  if(ok){for(const id in upd)sigs[id]=upd[id];gone.forEach(id=>delete sigs[id]);ls.set('sp_catsig',sigs);
   if(Object.keys(upd).length)try{toast('Map dibagikan ke semua pemain ✓')}catch(e){}}
  else if(Object.keys(upd).length)try{toast('Gagal membagikan map, akan dicoba lagi')}catch(e){}
 }catch(e){}finally{syncing=0}}

/* ---- terima (katalog dari semua HP) ---- */
function fetchAll(){return new Promise(async res=>{if(!(window.mqtt||await lib()))return res(null);const got={};let pend=BR.length,fin=0;
 const out=()=>{if(fin)return;fin=1;res(got)};
 BR.forEach(url=>{let done=0,m;const ps=[];const end=()=>{if(done)return;done=1;try{m.end(true)}catch(e){}Promise.all(ps).then(()=>{if(--pend===0)out()})};
  try{m=mqtt.connect(url,{clientId:'spc_'+Math.random().toString(16).slice(2,12),connectTimeout:6000,reconnectPeriod:0,clean:true})}catch(e){done=1;if(--pend===0)out();return}
  m.on('error',end);m.on('close',end);
  m.on('connect',()=>{m.subscribe(PFX+'+',{qos:0});setTimeout(end,4000)});
  m.on('message',(t,b)=>{const id=t.slice(PFX.length).replace(/[^\w-]/g,'');if(!id)return;ps.push(dec(b.toString()).then(d=>{if(d&&d.ts&&(!got[id]||d.ts>got[id].ts))got[id]=d}))});
  setTimeout(end,9000)});
 setTimeout(out,11000)})}
let lastSig='',fetching=0;
async function pull(){if(fetching)return;fetching=1;
 try{const got=await fetchAll();if(!got||!Object.keys(got).length)return;
  const list=[];for(const id in got){const d=got[id];if(d.dead||!d.g)continue;const g=cleanRemote(d.g,id);if(g){g._ts=d.ts;list.push(g)}}
  list.sort((a,b)=>b._ts-a._ts);
  const sg=list.map(g=>g.id+':'+g._ts).join(',');if(sg===lastSig)return;lastSig=sg;
  RPUB.length=0;list.forEach(g=>RPUB.push(g));ls.set('sp_catcache',RPUB);
  const a=document.getElementById('app');if(a&&a.classList.contains('on')&&!document.getElementById('ov')?.classList.contains('on')){try{if(typeof refreshUI==='function')refreshUI();else render()}catch(e){}}
 }catch(e){}finally{fetching=0}}

/* cache terakhir langsung dipakai (tampil instan, sebelum koneksi selesai) */
try{const c=ls.get('sp_catcache',[]);if(Array.isArray(c))c.forEach(g=>{const x=cleanRemote(g,String(g.id||'').replace(/[^\w-]/g,''));if(x)RPUB.push(x)})}catch(e){}
window.__spMq={pushAll,lib};
window.spCatalogSync=()=>{sync();pull()};
window.addEventListener('load',()=>{
 const _en=enter;enter=function(){const r=_en.apply(this,arguments);setTimeout(()=>{pull();sync()},600);return r};
 setInterval(()=>{if(typeof me!=='undefined'&&me)sync()},8000);
 setInterval(()=>{const a=document.getElementById('app');if(a&&a.classList.contains('on'))pull()},40000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){pull();sync()}});
 const a=document.getElementById('app');if(a&&a.classList.contains('on')){pull();sync()}});
})();
;

/* ===== 19-fix-mabar-lintas-akun.js ===== */
/* ===== FIX MABAR LINTAS AKUN: room teman (f-...) & server privat (ps-...) tidak boleh bergantung pada API key lokal tiap HP,
   kalau tidak HP A dan HP B masuk dunia berbeda walau gabung dari daftar teman ===== */
(function(){const g=Storage.prototype.getItem;
Storage.prototype.getItem=function(k){if(k==='sp_rkey'&&this===window.localStorage){try{if(typeof roomCode==='string'&&/^(f-|ps-)/.test(roomCode)||roomCode==='publik')return ''}catch(e){}}return g.apply(this,arguments)}})();
;

/* ===== 20-direktori-akun-global-kotak-masuk-offl.js ===== */
/* ===== DIREKTORI AKUN GLOBAL + KOTAK MASUK OFFLINE =====
   - Profil (username + avatar, tanpa password) dipublish ke broker MQTT publik agar akun dari HP lain muncul di "Cari orang".
   - Permintaan teman & chat disimpan di broker (retained) sampai penerima online, lalu diproses dan dihapus. */
(function(){
const USR='sandbox/v9/usr/',INB='sandbox/v9/inb/',BR=['wss://broker.emqx.io:8084/mqtt','wss://broker.hivemq.com:8884/mqtt','wss://test.mosquitto.org:8081'];
const hs=t=>{let h=2166136261;for(let i=0;i<t.length;i++)h=Math.imul(h^t.charCodeAt(i),16777619);return(h>>>0).toString(36)};
const lw=n=>hs(String(n).toLowerCase());
const hx=(c,f)=>/^#[0-9a-f]{6}$/i.test(c||'')?c:f;
const safeAv=a=>{a=a||{};return{skin:hx(a.skin,'#ffd7b5'),shirt:hx(a.shirt,'#ffde59'),pants:hx(a.pants,'#222222'),hat:String(a.hat||'none').replace(/[^\w-]/g,'').slice(0,14)||'none',acc:Array.isArray(a.acc)?a.acc.filter(x=>typeof x==='string'||typeof x==='number').slice(0,5).map(x=>String(x).slice(0,24)):[]}};
const mq=()=>window.__spMq;
window.spInboxPut=ev=>{try{if(!ev||!ev.to||!ev.id||!mq())return Promise.resolve(0);return mq().pushAll([{t:INB+lw(ev.to)+'/'+ev.id,p:JSON.stringify(ev)}])}catch(e){return Promise.resolve(0)}};
let putting=0;
async function putMe(){if(putting||!me||me.role==='owner'||!mq())return;putting=1;
 try{const av=safeAv(me.av),sg=hs(me.name+JSON.stringify(av)),S=ls.get('sp_usrsig',{}),e=S[me.name];if(e&&e.s===sg&&Date.now()-e.t<216e5)return;
  const ok=await mq().pushAll([{t:USR+lw(me.name),p:JSON.stringify({n:me.name,av,ts:Date.now()})}]);if(ok){S[me.name]={s:sg,t:Date.now()};ls.set('sp_usrsig',S)}}
 catch(e){}finally{putting=0}}
function collect(){return new Promise(async res=>{if(!me||!mq()||!(window.mqtt||await mq().lib()))return res(null);
 const mine=INB+lw(me.name)+'/',D={},I={};let pend=BR.length,fin=0;const out=()=>{if(!fin){fin=1;res({D,I})}};
 BR.forEach(url=>{let done=0,m;const end=()=>{if(done)return;done=1;try{m.end(true)}catch(e){}if(--pend===0)out()};
  try{m=mqtt.connect(url,{clientId:'spd_'+Math.random().toString(16).slice(2,12),connectTimeout:6000,reconnectPeriod:0,clean:true})}catch(e){done=1;if(--pend===0)out();return}
  m.on('error',end);m.on('close',end);
  m.on('connect',()=>{m.subscribe([USR+'+',mine+'+'],{qos:0});setTimeout(end,3500)});
  m.on('message',(t,b)=>{try{const s=b.toString();if(!s)return;const d=JSON.parse(s);if(t.startsWith(USR))D[t]=d;else I[t]=d}catch(e){}});
  setTimeout(end,8000)});setTimeout(out,10000)})}
let polling=0;
async function poll(){if(polling||!me)return;polling=1;
 try{const r=await collect();if(!r)return;let ch=0;
  for(const t in r.D){const d=r.D[t],n=String((d&&d.n)||'').replace(/[\u0000-\u001f<>"&]/g,'').slice(0,20);
   if(!n||n===me.name||/^(owner|admin|coowner|co-owner)$/i.test(n))continue;let u=users[n];if(u&&!u.rm)continue;
   if(!u){users[n]={rm:1,bux:0,av:safeAv(d.av),games:[],notes:[]};ch=1}else{const a=safeAv(d.av);if(JSON.stringify(a)!==JSON.stringify(u.av)){u.av=a;ch=1}}}
  const clr=[];
  for(const t in r.I){const p=r.I[t];if(!p||p.to!==me.name||!p.from||!p.ts||Date.now()-p.ts>6048e5){clr.push({t,p:''});continue}
   try{if(window.__spOnEv)window.__spOnEv(p);ch=1;clr.push({t,p:''})}catch(e){}}
  if(ch){save();try{refreshUI()}catch(e){}}
  if(clr.length&&mq())mq().pushAll(clr)}
 catch(e){}finally{polling=0}}
window.spDirSync=()=>{putMe();poll()};
window.addEventListener('load',()=>{
 const _en=enter;enter=function(){const r=_en.apply(this,arguments);setTimeout(()=>{putMe();poll()},900);return r};
 setInterval(()=>{if(typeof me!=='undefined'&&me)putMe()},10000);
 setInterval(()=>{if(typeof me!=='undefined'&&me&&!document.hidden)poll()},30000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&me)spDirSync()});
 if(typeof me!=='undefined'&&me)setTimeout(spDirSync,900)});
})();
;

/* ===== 21-cek-username-global-gift-akses-panel-l.js ===== */
/* ===== CEK USERNAME GLOBAL + GIFT AKSES PANEL LINTAS PERANGKAT =====
   Owner menandatangani gift dengan kunci ECDSA di perangkatnya; perangkat lain memverifikasi dengan public key owner (disematkan saat pertama dilihat). */
(function(){
const USR='sandbox/v9/usr/',OWN='sandbox/v9/own/',BR=['wss://broker.emqx.io:8084/mqtt','wss://broker.hivemq.com:8884/mqtt','wss://test.mosquitto.org:8081'];
const hs=t=>{let h=2166136261;for(let i=0;i<t.length;i++)h=Math.imul(h^t.charCodeAt(i),16777619);return(h>>>0).toString(36)};
const lw=n=>hs(String(n).toLowerCase());
const mq=()=>window.__spMq,EC={name:'ECDSA',namedCurve:'P-256'},SG={name:'ECDSA',hash:'SHA-256'};
const b64=u=>{let s='';u.forEach(c=>s+=String.fromCharCode(c));return btoa(s)};
const unb=t=>Uint8Array.from(atob(t),c=>c.charCodeAt(0));
const te=s=>new TextEncoder().encode(s);
const msgOf=(n,r,t,k)=>String(n).toLowerCase()+'|'+r+'|'+t+'|'+(k?hs(JSON.stringify(k)):'');
const STUDIO=document.title==='Sandbox Studio';
function sub(url,topics,ms,onMsg){return new Promise(res=>{let m,done=0;const end=()=>{if(done)return;done=1;try{m.end(true)}catch(e){}res()};
 try{m=mqtt.connect(url,{clientId:'spo_'+Math.random().toString(16).slice(2,12),connectTimeout:6000,reconnectPeriod:0,clean:true})}catch(e){return res()}
 m.on('error',end);m.on('close',end);m.on('connect',()=>{m.subscribe(topics,{qos:0});setTimeout(end,ms)});
 m.on('message',(t,b)=>{try{const s=b.toString();if(s&&onMsg(t,JSON.parse(s))===1)end()}catch(e){}});setTimeout(end,ms+4000)})}
async function ready(){return !!(mq()&&(window.mqtt||await mq().lib()))}
/* --- cek username --- */
async function checkName(n){if(!(await ready()))return null;let taken=0;
 await Promise.all(BR.map(u=>sub(u,[USR+lw(n)],2500,(t,d)=>{if(d&&String(d.n||'').toLowerCase()===n.toLowerCase()){taken=1;return 1}})));return taken}
/* v11: cari username di semua perangkat -> nama asli, null = tidak ada, false = tidak ada koneksi */
async function lookupName(n){if(!(await ready()))return false;let real=null;
 await Promise.all(BR.map(u=>sub(u,[USR+lw(n)],2500,(t,d)=>{if(d&&String(d.n||'').toLowerCase()===String(n).toLowerCase()){real=String(d.n).replace(/[\u0000-\u001f<>"&]/g,'').slice(0,20);return 1}})));
 return real&&!/^(owner|admin|coowner|co-owner)$/i.test(real)?real:null}
window.spLookupName=lookupName;
/* --- kunci owner --- */
async function ownerKey(){let k=ls.get('sp_okey',null);if(k&&k.priv&&k.pub)return k;
 const p=await crypto.subtle.generateKey(EC,true,['sign','verify']);k={priv:await crypto.subtle.exportKey('jwk',p.privateKey),pub:await crypto.subtle.exportKey('jwk',p.publicKey)};ls.set('sp_okey',k);ls.set('sp_ownpk',k.pub);return k}
async function pubPk(){if(!me||me.role!=='owner'||!mq())return;const k=await ownerKey(),sg=hs(JSON.stringify(k.pub)),S=ls.get('sp_pksig',{});if(S.s===sg&&Date.now()-S.t<216e5)return;
 if(await mq().pushAll([{t:OWN+'pk',p:JSON.stringify({pub:k.pub,ts:Date.now()})}]))ls.set('sp_pksig',{s:sg,t:Date.now()})}
async function grant(n,role){try{if(!(await ready())||me.role!=='owner')return;const k=await ownerKey(),ts=Date.now(),key=await crypto.subtle.importKey('jwk',k.priv,EC,false,['sign']);let UK=null;
 if(role!=='none')await Promise.all(BR.map(u=>sub(u,[OWN+'uk/'+lw(n)],2500,(t,d)=>{if(d&&d.pub&&(!UK||d.ts>UK.ts))UK=d})));const pk=UK?UK.pub:null;
 {const P=ls.get('sp_gpend',{})||{},kk=String(n).toLowerCase();if(role!=='none'&&!pk)P[kk]={n,role};else delete P[kk];ls.set('sp_gpend',P)}
 if(role!=='none'&&!pk&&!grant._auto)toast(n+' belum membuka versi terbaru; panel jalan di HP-nya, tapi aksi lintas HP butuh gift ulang setelah dia login');
 const sig=b64(new Uint8Array(await crypto.subtle.sign(SG,key,te(msgOf(n,role,ts,pk)))));
 const ok=await mq().pushAll([{t:OWN+'pk',p:JSON.stringify({pub:k.pub,ts})},{t:OWN+'g/'+lw(n),p:JSON.stringify({n,role,ts,pk,sig})}]);
 if(!grant._auto)toast(ok?'Akses '+n+' dikirim ke semua perangkat ✓':'Gagal mengirim akses ke server, coba lagi')}catch(e){if(!grant._auto)toast('Gagal menandatangani akses')}}
/* --- terima gift --- */
async function restoreRole(){try{if(!me||me.role||!me.grec||!me.grec.sig)return;const pin=ls.get('sp_ownpk',null);if(!pin)return;const G=me.grec;
 if(String(G.n||'').toLowerCase()!==me.name.toLowerCase()||!['admin','coowner'].includes(G.role))return;
 const key=await crypto.subtle.importKey('jwk',pin,EC,false,['verify']);if(!(await crypto.subtle.verify(SG,key,unb(G.sig),te(msgOf(G.n,G.role,G.ts,G.pk)))))return;
 me.role=G.role;save();try{rolePill();if(!document.getElementById('n_panel')&&document.getElementById('nav'))document.getElementById('nav').insertAdjacentHTML('beforeend','<button data-a="go" data-v="panel" id="n_panel"><span></span>Panel</button>');render()}catch(e){}}catch(e){}}
async function pullGrant(){if(!me||me.role==='owner')return;await restoreRole();if(!me||!(await ready()))return;let PK=null,G=null;
 await Promise.all(BR.map(u=>sub(u,[OWN+'pk',OWN+'g/'+lw(me.name)],3000,(t,d)=>{if(t===OWN+'pk'){if(d&&d.pub&&(!PK||d.ts>PK.ts))PK=d}else if(d&&d.sig&&(!G||d.ts>G.ts))G=d})));
 let pin=ls.get('sp_ownpk',null);if(!pin&&PK){pin=PK.pub;ls.set('sp_ownpk',pin)}if(!pin||!G)return;
 const _g0=me.gts||0,_fresh=G.ts>_g0,_stale=G.ts===_g0&&(G.role==='none'?!!(me.role&&me.role!=='owner'):me.role!==G.role);
 if(String(G.n||'').toLowerCase()!==me.name.toLowerCase()||!(_fresh||_stale)||!['admin','coowner','none'].includes(G.role))return;
 try{const key=await crypto.subtle.importKey('jwk',pin,EC,false,['verify']);if(!(await crypto.subtle.verify(SG,key,unb(G.sig),te(msgOf(G.n,G.role,G.ts,G.pk)))))return}catch(e){return}
 const _old=me.role;me.gts=G.ts;me.grec=G.role==='none'?null:G;if(G.role==='none'){if(me.role&&me.role!=='owner'){delete me.role;toast('Akses panel dicabut')}}else{me.role=G.role;if(_old!==G.role){toast('Kamu mendapat akses '+G.role.toUpperCase()+' ');(me.notes=me.notes||[]).unshift({t:'Kamu mendapat akses '+G.role.toUpperCase()+'. Buka menu → Panel.',new:1})}}
 save();try{rolePill();if(me.role&&!document.getElementById('n_panel')&&document.getElementById('nav'))document.getElementById('nav').insertAdjacentHTML('beforeend','<button data-a="go" data-v="panel" id="n_panel"><span></span>Panel</button>');render()}catch(e){}}
window.spPullGrant=pullGrant;window.spOwnerPub=()=>JSON.stringify((ls.get('sp_okey',{})||{}).pub||null);
window.addEventListener('load',()=>{
 /* username global saat daftar */
 const _a=act.auth;let okN=null;
 act.auth=function(){if(mode!=='reg')return _a.apply(this,arguments);const u=($('#u').value||'').trim();
  if(!u||u.includes('@')||okN===u.toLowerCase()){okN=null;return _a.apply(this,arguments)}
  const e=$('#err');e.textContent='Memeriksa username...';
  checkName(u).then(r=>{if(r===1){e.textContent='Username sudah dipakai oleh akun di perangkat lain';const c=$('#acard');if(c){c.classList.remove('shake');void c.offsetWidth;c.classList.add('shake')}}else{okN=u.toLowerCase();e.textContent='';act.auth()}});return};
 /* gift akses panel dari owner -> kirim ke perangkat target */
 const _g=act.grole;act.grole=function(){const i=$('#pt_u'),n=i?String(i.value||'').trim():'',b=n&&users[n]?users[n].role||'none':'none';const r=_g.apply(this,arguments);
  try{if(me&&me.role==='owner'&&n&&users[n]){const a=users[n].role||'none';if(a!==b)grant(n,a)}}catch(e){}return r};
 const _en=enter;enter=function(){const r=_en.apply(this,arguments);setTimeout(()=>{pubPk();pullGrant()},1200);return r};
 setInterval(()=>{if(typeof me!=='undefined'&&me&&!document.hidden){pubPk();pullGrant()}},30000);
 setTimeout(()=>{if(typeof me!=='undefined'&&me&&me.role!=='owner')pullGrant()},5000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&typeof me!=='undefined'&&me)pullGrant()});
 /* owner: kirim ulang gift akses yang belum punya kunci penerima */
 setInterval(async()=>{try{if(typeof me==='undefined'||!me||me.role!=='owner'||document.hidden)return;const P=ls.get('sp_gpend',{})||{};grant._auto=1;for(const k in P)await grant(P[k].n,P[k].role)}catch(e){}finally{grant._auto=0}},45000);
 /* tombol Panel untuk website Studio (tanpa nav bawah) */
 if(STUDIO)setInterval(()=>{let b=document.getElementById('spPnl');if(typeof me==='undefined'||!me||!staff()){if(b)b.remove();return}
  const a=document.getElementById('app');if(!a||!a.classList.contains('on')){if(b)b.style.display='none';return}
  if(!b){b=document.createElement('button');b.id='spPnl';b.className='btn sm v';b.style.cssText='position:fixed;right:10px;bottom:10px;z-index:9000';b.onclick=()=>act.go(page==='panel'?'create':'panel');document.body.appendChild(b)}
  b.style.display='';b.textContent=page==='panel'?'← Studio':' Panel'},1500)});
})();
;

/* ===== 22-akun-cloud.js ===== */
/* ===== AKUN CLOUD: login username/email yang sama di HP mana pun =====
   Data akun dienkripsi di perangkat (PBKDF2 + AES-GCM, kunci dari password) lalu disimpan di broker publik.
   Tanpa password yang benar, isinya tidak bisa dibuka. */
(function(){
const ACC='sandbox/v9/acc/',BR=['wss://broker.emqx.io:8084/mqtt','wss://broker.hivemq.com:8884/mqtt','wss://test.mosquitto.org:8081'];
const hs=t=>{let h=2166136261;for(let i=0;i<t.length;i++)h=Math.imul(h^t.charCodeAt(i),16777619);return(h>>>0).toString(36)+t.length};
const te=s=>new TextEncoder().encode(s),mq=()=>window.__spMq;
const b64=u=>{let s='';for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(s)};
const unb=t=>{const s=atob(t),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u};
const sha=async t=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',te(t)))).map(b=>b.toString(16).padStart(2,'0')).join('').slice(0,24);
const pipe=async(d,S)=>{const st=new S('gzip'),w=st.writable.getWriter();w.write(d);w.close();return new Uint8Array(await new Response(st.readable).arrayBuffer())};
const kdf=async(pw,salt)=>{const b=await crypto.subtle.importKey('raw',te(pw),'PBKDF2',false,['deriveBits']);return new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:150000,hash:'SHA-256'},b,256))};
const aes=k=>crypto.subtle.importKey('raw',k,'AES-GCM',false,['encrypt','decrypt']);
async function seal(obj,key){let d=te(JSON.stringify(obj)),z=0;if(window.CompressionStream){try{d=await pipe(d,CompressionStream);z=1}catch(e){}}
 const iv=crypto.getRandomValues(new Uint8Array(12)),ct=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},await aes(key),d));return{iv:b64(iv),ct:b64(ct),z}}
async function open(R,key){try{let d=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:unb(R.iv)},await aes(key),unb(R.ct)));if(R.z)d=await pipe(d,DecompressionStream);return JSON.parse(new TextDecoder().decode(d))}catch(e){return null}}
async function ready(){return !!(mq()&&(window.mqtt||await mq().lib()))}
function fetchTopic(topic){return new Promise(async res=>{if(!(await ready()))return res(null);let best=null,pend=BR.length,fin=0;const out=()=>{if(!fin){fin=1;res(best)}};
 BR.forEach(url=>{let m,done=0;const end=()=>{if(done)return;done=1;try{m.end(true)}catch(e){}if(--pend===0)out()};
  try{m=mqtt.connect(url,{clientId:'spa_'+Math.random().toString(16).slice(2,12),connectTimeout:6000,reconnectPeriod:0,clean:true})}catch(e){done=1;if(--pend===0)out();return}
  m.on('error',end);m.on('close',end);m.on('connect',()=>{m.subscribe(topic,{qos:0});setTimeout(end,3200)});
  m.on('message',(t,b)=>{try{const s=b.toString();if(!s)return;const d=JSON.parse(s);if(d&&d.ts&&(!best||d.ts>best.ts))best=d}catch(e){}});setTimeout(end,8000)});setTimeout(out,10000)})}
const skip=['pres','ob','role','rm'];
const blobOf=u=>{const o={};for(const k in u)if(!skip.includes(k))o[k]=u[k];return o};
const CK=()=>ls.get('sp_ck',{}),CS=()=>ls.get('sp_cs',{});
const emTop=async em=>ACC+await sha('sp-acc|'+em.toLowerCase());
function applyBlob(u,blob,keepLocal){const keep={};skip.forEach(k=>{if(k in u)keep[k]=u[k]});
 let extraG=[],extraI=[];if(keepLocal){const gi=new Set((blob.games||[]).map(g=>g.id)),ii=new Set((blob.items||[]).map(g=>g.id));extraG=(u.games||[]).filter(g=>g&&!gi.has(g.id));extraI=(u.items||[]).filter(g=>g&&!ii.has(g.id))}
 for(const k in u)delete u[k];Object.assign(u,blob,keep);if(extraG.length)u.games=(u.games||[]).concat(extraG);if(extraI.length)u.items=(u.items||[]).concat(extraI)}
async function push(name,ck){const u=users[name];if(!u)return false;let b=blobOf(u),pay;
 const mk=async()=>{const s=await seal(b,unb(ck.k));return JSON.stringify(Object.assign({v:1,n:name,salt:ck.salt,ts:Date.now()},s))};
 pay=await mk();if(pay.length>900000){b.chat={};pay=await mk()}
 if(pay.length>900000){b.notes=(b.notes||[]).slice(0,10);pay=await mk()}
 if(pay.length>900000){b.games=(b.games||[]).map(g=>Object.assign({},g,{thumb:'',icon:''}));pay=await mk()}
 if(pay.length>900000)return false;
 const eh=await sha('sp-acc|'+u.email.toLowerCase()),ts=JSON.parse(pay).ts;
 const ok=await mq().pushAll([{t:ACC+eh,p:pay},{t:ACC+'u'+await sha('u|'+name.toLowerCase()),p:JSON.stringify({p:eh,ts})}]);
 if(ok){const cs=CS();cs[name]={sy:ts,sig:hs(JSON.stringify(blobOf(u)))};ls.set('sp_cs',cs)}return !!ok}
let busy=0;
async function tick(){if(busy||typeof me==='undefined'||!me||me.role==='owner'||!me.email)return;const name=me.name,ck=CK()[name];if(!ck)return;busy=1;
 try{if(!(await ready()))return;const R=await fetchTopic(await emTop(me.email)),cs=CS(),m=cs[name]||{},sigNow=hs(JSON.stringify(blobOf(me)));let changed=m.sig!==sigNow;
  if(R&&R.ts>(m.sy||0)){const blob=await open(R,unb(ck.k));if(blob){applyBlob(me,blob,changed);cs[name]={sy:R.ts,sig:hs(JSON.stringify(blobOf(me)))};ls.set('sp_cs',cs);save();try{refreshUI()}catch(e){}changed=changed&&true}}
  const m2=CS()[name]||{};if(!R||hs(JSON.stringify(blobOf(me)))!==m2.sig)await push(name,ck)}
 catch(e){}finally{busy=0}}
async function ensure(){const st=window.__spPw;window.__spPw=null;if(typeof me==='undefined'||!me||me.role==='owner'||!me.email)return;
 const cks=CK();if(!cks[me.name]&&st&&st.p&&await ready()){const R=await fetchTopic(await emTop(me.email));
  if(R){const key=await kdf(st.p,unb(R.salt));if(await open(R,key))cks[me.name]={k:b64(key),salt:R.salt}}
  else{const salt=crypto.getRandomValues(new Uint8Array(16)),key=await kdf(st.p,salt);cks[me.name]={k:b64(key),salt:b64(salt)}}
  ls.set('sp_ck',cks)}
 tick()}
async function cloudLogin(em,p){try{let eh;if(em.includes('@'))eh=await sha('sp-acc|'+em.toLowerCase());else{const P=await fetchTopic(ACC+'u'+await sha('u|'+em.toLowerCase()));if(!P||!P.p)return false;eh=P.p}
 const R=await fetchTopic(ACC+eh);if(!R||!R.salt)return false;const key=await kdf(p,unb(R.salt)),blob=await open(R,key);if(!blob||!blob.email)return false;
 const name=String(R.n||'').slice(0,14);if(!name||/^(owner|admin|coowner|co-owner)$/i.test(name))return false;
 const old=users[name];if(old&&!old.rm)applyBlob(old,blob,true);else users[name]=blob;delete users[name].rm;
 const cks=CK();cks[name]={k:b64(key),salt:R.salt};ls.set('sp_ck',cks);const cs=CS();cs[name]={sy:R.ts,sig:hs(JSON.stringify(blobOf(users[name])))};ls.set('sp_cs',cs);save();return true}catch(e){return false}}
window.addEventListener('load',()=>{
 const _a=act.auth;let okE=null;
 act.auth=function(){const e=$('#err'),emv=($('#em').value||'').trim().toLowerCase(),p=$('#pw').value,u=($('#u').value||'').trim(),isOwn=$('#em').type==='password';
  if(isOwn||!emv||!p)return _a.apply(this,arguments);
  if(mode==='reg'){if(okE===emv){okE=null;window.__spPw={p};return _a.apply(this,arguments)}
   e.textContent='Memeriksa email...';emTop(emv).then(fetchTopic).then(R=>{if(R){e.textContent='Email sudah terdaftar di akun lain';const c=$('#acard');if(c){c.classList.remove('shake');void c.offsetWidth;c.classList.add('shake')}}else{okE=emv;e.textContent='';act.auth()}});return}
  const k=Object.keys(users).find(x=>users[x].email===emv)||(!emv.includes('@')&&users[emv]?emv:null);
  if(k&&!users[k].rm&&users[k].pass===p){window.__spPw={p};return _a.apply(this,arguments)}
  e.textContent='Memeriksa akun...';
  cloudLogin(emv,p).then(ok=>{e.textContent='';window.__spPw={p};_a.call(act)});};
 const _en=enter;enter=function(){const r=_en.apply(this,arguments);setTimeout(ensure,900);return r};
 setInterval(()=>{if(!document.hidden)tick()},20000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick()});
 window.spCloudSync=tick});
})();
;

/* ===== 23-panel-admin-global.js ===== */
/* ===== PANEL ADMIN GLOBAL: gift SandBux, centang biru, ban, takedown map, report -> berlaku di perangkat target =====
   Perintah ditandatangani (owner: kunci owner; admin: kunci akun + bukti gift dari owner) dan diverifikasi penerima. */
(function(){
const CMD='sandbox/v9/cmd/',BAN='sandbox/v9/ban/',VF='sandbox/v9/vf/',REP='sandbox/v9/rep/',OWN='sandbox/v9/own/',BR=['wss://broker.emqx.io:8084/mqtt','wss://broker.hivemq.com:8884/mqtt','wss://test.mosquitto.org:8081'];
const hs=t=>{let h=2166136261;for(let i=0;i<t.length;i++)h=Math.imul(h^t.charCodeAt(i),16777619);return(h>>>0).toString(36)};
const lw=n=>hs(String(n).toLowerCase()),te=s=>new TextEncoder().encode(s),mq=()=>window.__spMq,EC={name:'ECDSA',namedCurve:'P-256'},SG={name:'ECDSA',hash:'SHA-256'};
const b64=u=>{let s='';u.forEach(c=>s+=String.fromCharCode(c));return btoa(s)},unb=t=>Uint8Array.from(atob(t),c=>c.charCodeAt(0));
const msgOf=(n,r,t,k)=>String(n).toLowerCase()+'|'+r+'|'+t+'|'+(k?hs(JSON.stringify(k)):'');
const cmdMsg=c=>[c.id,c.from,c.to,c.cmd,JSON.stringify(c.args),c.ts].join('|');
const sign=async(priv,m)=>b64(new Uint8Array(await crypto.subtle.sign(SG,await crypto.subtle.importKey('jwk',priv,EC,false,['sign']),te(m))));
const verify=async(pub,sig,m)=>{try{return await crypto.subtle.verify(SG,await crypto.subtle.importKey('jwk',pub,EC,false,['verify']),unb(sig),te(m))}catch(e){return false}};
const ready=async()=>!!(mq()&&(window.mqtt||await mq().lib()));
function collect(topics,ms,cb){return new Promise(async res=>{if(!(await ready()))return res(0);let pend=BR.length;
 BR.forEach(url=>{let m,done=0;const end=()=>{if(done)return;done=1;try{m.end(true)}catch(e){}if(--pend===0)res(1)};
  try{m=mqtt.connect(url,{clientId:'spx_'+Math.random().toString(16).slice(2,12),connectTimeout:6000,reconnectPeriod:0,clean:true})}catch(e){done=1;if(--pend===0)res(1);return}
  m.on('error',end);m.on('close',end);m.on('connect',()=>{m.subscribe(topics,{qos:0});setTimeout(end,ms)});
  m.on('message',(t,b)=>{try{const s=b.toString();if(s)cb(t,JSON.parse(s))}catch(e){}});setTimeout(end,ms+4000)});setTimeout(()=>res(1),ms+6000)})}
const keyOf=n=>{const r=String(n||'').trim().toLowerCase();return r?Object.keys(users).find(k=>k.toLowerCase()===r)||null:null};
const rid=()=>Math.random().toString(36).slice(2,10)+Date.now().toString(36);
/* kunci akun (dipakai admin untuk menandatangani) */
async function ensureUkey(){if(!me||me.role==='owner')return;
 if(!me.ukey){const p=await crypto.subtle.generateKey(EC,true,['sign','verify']);me.ukey={priv:await crypto.subtle.exportKey('jwk',p.privateKey),pub:await crypto.subtle.exportKey('jwk',p.publicKey)};save()}
 const sg=hs(JSON.stringify(me.ukey.pub)),S=ls.get('sp_uksig',{});if(S[me.name]&&S[me.name].s===sg&&Date.now()-S[me.name].t<216e5)return;
 if(mq()&&await mq().pushAll([{t:OWN+'uk/'+lw(me.name),p:JSON.stringify({n:me.name,pub:me.ukey.pub,ts:Date.now()})}])){S[me.name]={s:sg,t:Date.now()};ls.set('sp_uksig',S)}}
/* kirim perintah */
async function sendCmd(to,cmd,args,state){try{if(!me||!(await ready()))return;const rec={id:rid(),from:me.name,to,cmd,args,ts:Date.now()};let priv;
 if(me.role==='owner'){const k=ls.get('sp_okey',null);if(!k)return;priv=k.priv;rec.o=1}
 else{if(!me.ukey||!me.grec||!me.grec.pk){toast('Perintah belum bisa menjangkau HP lain: minta owner gift akses ulang');return}priv=me.ukey.priv;rec.g=me.grec}
 rec.sig=await sign(priv,cmdMsg(rec));
 const msgs=[{t:state?BAN+lw(to):CMD+lw(to)+'/'+rec.id,p:JSON.stringify(rec)}];if(cmd==='ver')msgs.push({t:VF+lw(to),p:JSON.stringify(rec)});const ok=await mq().pushAll(msgs);
 toast(ok?'Perintah ke '+to+' terkirim ke semua perangkat ✓':'Gagal mengirim perintah ke server')}catch(e){}}
/* verifikasi pengirim -> level (0 = tidak sah) */
async function authz(rec,state){try{const pin=ls.get('sp_ownpk',null);if(!pin||!rec||!rec.sig||!rec.id||!rec.from||!rec.to||typeof rec.cmd!=='string')return 0;
 if(!state&&Date.now()-rec.ts>6048e5)return 0;
 if(rec.o)return(String(rec.from).toLowerCase()==='owner'&&await verify(pin,rec.sig,cmdMsg(rec)))?3:0;
 const g=rec.g;if(!g||!g.pk||!g.sig||String(g.n).toLowerCase()!==String(rec.from).toLowerCase()||!ROLE[g.role])return 0;
 if(!(await verify(pin,g.sig,msgOf(g.n,g.role,g.ts,g.pk))))return 0;if(!(await verify(g.pk,rec.sig,cmdMsg(rec))))return 0;return ROLE[g.role]}catch(e){return 0}}
const OKV=new Set();
function kick(){try{act.out()}catch(e){}try{toast('Akunmu diblokir oleh staf')}catch(e){}}
async function applyState(rec){if(OKV.has(rec.id))return 0;const lv0=await authz(rec,1);if(!lv0)return 0;OKV.add(rec.id);if(String(rec.to).charAt(0)==='_')return RV.rcv(rec);
 const k=keyOf(rec.to);if(!k)return 0;const u=users[k];if(u.role==='owner'||(u.bts||0)>=rec.ts)return 0;if(!(lv0===3||lv0>lv(u)))return 0;
 if(rec.cmd==='ban'){const b=rec.args&&rec.args.ban;if(!b||(b.perm&&lv0<3))return 0;u.ban={perm:!!b.perm,until:+b.until||0,reason:String(b.reason||'').slice(0,120),by:String(rec.from).slice(0,20),t:+b.t||rec.ts};u.pres=null;u.bts=rec.ts;save();if(u===me&&banOf(me))kick();return 1}
 if(rec.cmd==='unban'){delete u.ban;u.bts=rec.ts;save();return 1}return 0}
async function applyCmd(rec){const lv0=await authz(rec,0);if(!lv0||String(rec.to).toLowerCase()!==me.name.toLowerCase())return;
 me.seen2=me.seen2||[];if(me.seen2.includes(rec.id))return;const a=rec.args||{};let ch=0;
 if(rec.cmd==='bux'){const n=Math.floor(+a.amt);if(n>0&&n<=(lv0>=3?1e7:500)){me.bux=(me.bux||0)+n;me.notes.unshift({t:'Kamu mendapat '+n+' SandBux dari '+(RN[rec.g?rec.g.role:'owner']||'staf'),new:1});ch=1}}
 else if(rec.cmd==='ver'&&(lv0===3||lv0>lv(me))){me.verified=!!a.v;me.notes.unshift({t:a.v?'✔ Kamu mendapat Centang Biru!':'Centang biru dicabut',new:1});ch=1}
 else if(rec.cmd==='take'&&lv0>=1){(me.games||[]).forEach(g=>{if(g.id==a.gid)g.pub=false});ch=1;me.notes.unshift({t:'Salah satu mapmu diturunkan oleh staf',new:1})}
 else if(rec.cmd==='rv'&&lv0>=1){RV.apply(a.k,a.id,me.name,!!a.ok,a.note);ch=1}
 else if(rec.cmd==='rvs'&&lv0>=1){RV.setS(a.k,a.id,me.name,String(a.s),a.note);ch=1}
 else if(rec.cmd==='viol'&&lv0>=1&&(lv0>=3||lv0>lv(me))){RV.viol(me,a.id,a.reason,rec.from);ch=1}
 else if(rec.cmd==='violx'&&lv0>=1){RV.violx(me);ch=1}
 else if(rec.cmd==='flyok'&&lv0>=1){me.flyOk=a.on?{until:+a.until||0,by:String(rec.from).slice(0,20)}:null;me.notes.unshift({t:a.on?'Kamu mendapat izin terbang dari staf':'Izin terbang dari staf dicabut',new:1});ch=1}
 me.seen2.push(rec.id);if(me.seen2.length>200)me.seen2.shift();if(ch){save();try{navRender();rolePill();refreshUI()}catch(e){}}}
/* v12: centang biru terlihat semua pemain. Catatan 'ver' bertanda tangan owner/admin disimpan di VF/<nama>; tiap perangkat memverifikasi tanda tangannya sebelum menampilkan ✔ */
const VFK='sp_vf',vfc=()=>{const c=ls.get(VFK,{});return c&&typeof c==='object'&&!Array.isArray(c)?c:{}};
window.spVb=n=>{try{return window.spVerified(n)?'<span class="vb">✔</span>':''}catch(e){return''}};
window.spVerified=n=>{const l=String(n||'').toLowerCase();if(l==='owner')return true;const c=vfc()[l];return !!(c&&c.v)};
function vfApply(){const c=vfc();let ch=0;
 for(const k in users){const u=users[k],z=c[k.toLowerCase()];if(!z||u.role==='owner')continue;
  if(u===me){if(z.ts>(me.vts||0)){me.vts=z.ts;if(!!me.verified!==z.v)me.verified=z.v;ch=1}continue}
  if(!!u.verified!==z.v){u.verified=z.v;ch=1}}
 if(ch){save();try{refreshUI()}catch(e){}}try{window.spVfChanged&&window.spVfChanged()}catch(e){}}
async function vfSync(){try{if(typeof me==='undefined'||!me||!(await ready()))return;const got={};
 await collect([VF+'+'],2500,(t,d)=>{if(!d||typeof d!=='object'||d.cmd!=='ver'||!d.to||!d.sig||t!==VF+lw(d.to))return;if(!got[t]||d.ts>got[t].ts)got[t]=d});
 const c=vfc();let ch=0;
 for(const t in got){const r=got[t],l=String(r.to).toLowerCase();if(!r.args||typeof r.args.v!=='boolean')continue;if(c[l]&&c[l].ts>=r.ts)continue;if(!(await authz(r,1)))continue;c[l]={v:r.args.v,ts:r.ts};ch=1}
 if(ch)ls.set(VFK,c);vfApply()}catch(e){}}
window.spVfSync=vfSync;
/* v16: roster bot buatan owner, bertanda tangan, dibaca semua perangkat */
const BOTT='sandbox/v9/botroster',botMsg=r=>'bots|'+r.ts+'|'+JSON.stringify([r.bots,!!r.chat]);
const ownerKey2=async()=>{let k=ls.get('sp_okey',null);if(k&&k.priv&&k.pub)return k;const p=await crypto.subtle.generateKey(EC,true,['sign','verify']);k={priv:await crypto.subtle.exportKey('jwk',p.privateKey),pub:await crypto.subtle.exportKey('jwk',p.publicKey)};ls.set('sp_okey',k);ls.set('sp_ownpk',k.pub);return k};
window.spBotPublish=async(bots,chat)=>{try{if(!me||me.role!=='owner'||!(await ready()))return 0;const k=await ownerKey2(),rec={ts:Date.now(),bots,chat:!!chat};rec.sig=await sign(k.priv,botMsg(rec));return await mq().pushAll([{t:BOTT,p:JSON.stringify(rec)}])?rec.ts:0}catch(e){return 0}};
window.spBotFetch=async()=>{try{const pin=ls.get('sp_ownpk',null);if(!pin||!(await ready()))return;let best=null;
 await collect([BOTT],2500,(t,d)=>{if(d&&d.sig&&Array.isArray(d.bots)&&(!best||d.ts>best.ts))best=d});
 const cur=ls.get('sp_botr',{ts:0});if(best&&best.ts>(cur.ts||0)&&await verify(pin,best.sig,botMsg(best))){ls.set('sp_botr',{ts:best.ts,bots:best.bots.slice(0,40),chat:!!best.chat});window.spBotsChanged&&spBotsChanged()}}catch(e){}};
/* report lintas perangkat */
const reps=()=>{let r=ls.get('sp_rep',[]);return Array.isArray(r)?r:[]};
async function repSync(){if(!me||!(await ready()))return;const S=ls.get('sp_repsig',{}),push=[];
 reps().forEach(x=>{if(!x||!x.id||push.length>=20)return;const sg=hs(JSON.stringify(x));if(S[x.id]!==sg&&(x.by===me.name||staff())){push.push({t:REP+x.id,p:JSON.stringify({r:x,ts:Date.now()})});S[x.id]=sg}});
 if(push.length&&mq())await mq().pushAll(push);
 if(staff()){const got={};await collect([REP+'+'],3000,(t,d)=>{if(d&&d.r&&d.r.id&&(!got[d.r.id]||d.ts>got[d.r.id].ts))got[d.r.id]=d});
  let r=reps(),ch=0;for(const id in got){const x=got[id].r;if(String(id)!==String(x.id))continue;const l=r.find(y=>y.id===x.id);
   if(!l){r.unshift({id:String(x.id),t:+x.t||Date.now(),st:x.st==='done'?'done':'open',by:String(x.by||'').slice(0,20),type:String(x.type||'').slice(0,20),tg:String(x.tg||'').slice(0,20),txt:String(x.txt||'').slice(0,300),gid:x.gid?String(x.gid).slice(0,30):undefined,gn:x.gn?String(x.gn).slice(0,30):undefined,res:x.res?String(x.res).slice(0,80):undefined,rt:x.rt});ch=1;
    if(x.st!=='done'&&x.by!==me.name)me.notes.unshift({t:'Report baru: '+String(x.by||'').slice(0,20)+(x.tg?' melaporkan '+String(x.tg).slice(0,20):' mengirim laporan'),new:1})}
   else if(x.st==='done'&&l.st!=='done'){l.st='done';l.res=String(x.res||'').slice(0,80);l.rt=x.rt;ch=1}}
  if(ch){r=r.slice(0,200);ls.set('sp_rep',r);r.forEach(x=>{S[x.id]=hs(JSON.stringify(x))});save();try{refreshUI()}catch(e){}}}
 ls.set('sp_repsig',S)}
let busy=0;
async function tick(){if(busy||typeof me==='undefined'||!me||!(await ready()))return;busy=1;
 try{ensureUkey();const st=[],inb=[];RV.b();const okc=await collect([BAN+'+',CMD+lw(me.name)+'/+','sandbox/v9/rvq/+'],3000,(t,d)=>{if(t.startsWith(BAN))st.push(d);else if(t.startsWith('sandbox/v9/rvq/')){if(staff())RV.got(t,d)}else inb.push([t,d])});if(okc)RV.f();
  for(const r of st)await applyState(r);const clr=[];
  for(const [t,r] of inb){await applyCmd(r);clr.push({t,p:''})}
  if(clr.length&&mq())mq().pushAll(clr);
  await repSync()}catch(e){}finally{busy=0}}
window.spPanelSync=tick;window.spSendCmd=sendCmd;
window.addEventListener('load',()=>{
 const snap=()=>{const s={};for(const k in users){const u=users[k];s[k]={b:u.bux||0,v:!!u.verified,n:JSON.stringify(u.ban||null)}}return s};
 const diff=s0=>{for(const k in users){const u=users[k];if(u===me||!u.rm)continue;const z=s0[k]||{b:0,v:false,n:'null'};
  if((u.bux||0)>z.b)sendCmd(k,'bux',{amt:(u.bux||0)-z.b});
  if(!!u.verified!==z.v)sendCmd(k,'ver',{v:!!u.verified});
  const n=JSON.stringify(u.ban||null);if(n!==z.n){if(u.ban)sendCmd(k,'ban',{ban:u.ban},1);else sendCmd(k,'unban',{},1)}}};
 ['gbux','gver','bandirect','bango','unban','unbandirect'].forEach(a=>{const o=act[a];if(!o)return;act[a]=function(){if(!me||!staff())return o.apply(this,arguments);const s0=snap(),r=o.apply(this,arguments);try{diff(s0)}catch(e){}return r}});
 const rt=act.rtake;if(rt)act.rtake=function(v){const x=reps().find(y=>y.id==v),gid=x&&x.gid,r=rt.apply(this,arguments);
  try{if(gid&&staff()){const g=RPUB.find(y=>y.id==gid);if(g&&g.by){const by=keyOf(g.by)||g.by;RPUB.splice(RPUB.indexOf(g),1);sendCmd(by,'take',{gid})}}}catch(e){}return r};
 const _en=enter;enter=function(){const r=_en.apply(this,arguments);setTimeout(tick,1500);setTimeout(vfSync,2500);return r};
 setInterval(()=>{if(typeof me!=='undefined'&&me&&!document.hidden)tick()},20000);
 setInterval(()=>{if(typeof me!=='undefined'&&me&&!document.hidden)vfSync()},45000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick()})});
})();
;

/* ===== 24-studio-v4.js ===== */
/* ===== STUDIO v4: UICorner/UIStroke/UIGradient, ImageButton/Label, RemoteEvent, Sound, Tekstur, Rig, Toolbox lengkap ===== */
(function(){
const MODC=['UICorner','UIStroke','UIGradient','UIListLayout','UIGridLayout','UIPadding'],SERV=['RemoteEvent','RemoteFunction','BindableEvent'];
Object.assign(GN,{ImageButton:1,ImageLabel:1});
Object.assign(CL,{ImageButton:'',ImageLabel:'',UICorner:'◜',UIStroke:'',UIGradient:'',UIListLayout:'',UIGridLayout:'',UIPadding:'',RemoteEvent:'',RemoteFunction:'',BindableEvent:'',Sound:''});
Object.assign(CD,{ImageButton:'Tombol bergambar (upload gambar)',ImageLabel:'Label bergambar',UICorner:'Sudut membulat untuk elemen GUI',UIStroke:'Garis tepi (warna & tebal)',UIGradient:'Warna gradasi',UIListLayout:'Susun anak GUI berurutan (vertikal / horizontal)',UIGridLayout:'Susun anak GUI dalam kotak-kotak (grid)',UIPadding:'Jarak dalam (padding) elemen',RemoteEvent:'Event klien↔server (FireServer/OnServerEvent)',RemoteFunction:'Fungsi klien↔server (InvokeServer)',BindableEvent:'Event antar script',Sound:'Suara (efek / musik)'});
GUIK.push('ImageButton','ImageLabel');
PL.ReplicatedStorage.push('RemoteEvent','RemoteFunction','BindableEvent','Sound');
PL.Workspace.push('Sound','Folder');PL.ServerScriptService.push('RemoteEvent','RemoteFunction','BindableEvent','Sound');PL.ServerStorage.push('RemoteEvent','Sound');PL.StarterGui.push('Sound');
const hx=c=>/^#[0-9a-f]{6}$/i.test(c)?c:null,nn=(v,a,b,d)=>{v=+v;return isFinite(v)?Math.min(b,Math.max(a,v)):d};
/* ---- newI ---- */
const _ni=newI;newI=function(c){const i=_ni(c);
 if(c=='ImageButton'||c=='ImageLabel'){i.img='';i.bg='#ffffff';i.bt=0;i.txt='';i.s=[0,120,0,120]}
 if(c=='UIListLayout'){i.pad=6;i.dir='v';i.ha='l'}if(c=='UIGridLayout'){i.pad=6;i.cw=80;i.chh=80}if(c=='UIPadding'){i.pt=8;i.pb=8;i.pl=8;i.pr=8}
 if(c=='UICorner')i.rad=8;if(c=='UIStroke'){i.col='#000000';i.th=2}if(c=='UIGradient'){i.c0='#ff90e8';i.c1='#7df9ff';i.rot=90}
 if(c=='Sound'){i.preset='coin';i.vol=.6;i.loop=false;i.auto=false}return i};
/* ---- gSty: modifier + gambar ---- */
const _gs=gSty;gSty=function(i,e){_gs(i,e);if(i.cls=='ScreenGui')return;const ch=i.ch||[],c=ch.find(x=>x.cls=='UICorner'),st=ch.find(x=>x.cls=='UIStroke'),gr=ch.find(x=>x.cls=='UIGradient'),s=e.style,im=(i.cls=='ImageButton'||i.cls=='ImageLabel')?okImg(i.img):'';
 if(i.cls=='ImageButton')s.cursor='pointer';
 if(c)s.borderRadius=nn(c.rad,0,999,8)+'px';
 if(st){s.border=nn(st.th,0,30,2)+'px solid '+(hx(st.col)||'#000000')}
 const L=[];if(gr)L.push(`linear-gradient(${nn(gr.rot,-360,360,90)}deg,${hx(gr.c0)||'#fff'},${hx(gr.c1)||'#000'})`);if(im)L.push(`url("${im}")`);
 if(L.length){s.backgroundImage=L.join(',');s.backgroundSize=im?(gr?'auto,cover':'cover'):'auto';s.backgroundPosition='center';s.backgroundRepeat='no-repeat'}
 const ll=ch.find(x=>x.cls=='UIListLayout'),lg=ch.find(x=>x.cls=='UIGridLayout'),pd=ch.find(x=>x.cls=='UIPadding'),cx=e.classList;
 cx.remove('llv','llh','lla','llr','lgd');
 if(i.vis!==false){if(ll){cx.add(ll.dir=='h'?'llh':'llv');if(ll.ha=='c')cx.add('lla');else if(ll.ha=='r')cx.add('llr');s.setProperty('--gap',nn(ll.pad,0,200,6)+'px')}
  else if(lg){cx.add('lgd');s.setProperty('--gap',nn(lg.pad,0,200,6)+'px');s.setProperty('--cw',nn(lg.cw,8,600,80)+'px');s.setProperty('--chh',nn(lg.chh,8,600,80)+'px')}}
 if(pd)s.padding=nn(pd.pt,0,200,8)+'px '+nn(pd.pr,0,200,8)+'px '+nn(pd.pb,0,200,8)+'px '+nn(pd.pl,0,200,8)+'px'};
/* ---- picker ---- */
const _pk=pickL;pickL=function(t){const L=_pk(t),have=new Set(L.map(x=>x.id)),add=c=>{if(!have.has(c)){have.add(c);L.push({id:c,k:'inst',n:c,ic:CL[c],d:CD[c]})}},r=loc(t);
 if(r){const cl=r.i.cls;if(GN[cl]&&cl!='ScreenGui')MODC.forEach(add);if(cl=='Folder'){SERV.concat('Sound').forEach(add)}}return L};
/* ---- properti ---- */
const _ip=iProps;iProps=function(i){let h=_ip(i);const K='<div style="display:flex;gap:6px;margin-top:8px"><button class="btn sm c" data-a="idup">',cv=v=>hx(v)||'#ffffff',
 nf=(l,q,v,a)=>`<label>${l}</label><input type="number" ${a||''} data-q="${q}" value="${v}">`,cf=(l,q,v)=>`<label>${l}</label><input type="color" data-q="${q}" value="${cv(v)}">`;let a='';
 if(i.cls=='UICorner')a=nf('CornerRadius (px, 999 = bulat)','rad',i.rad,'min="0" max="999" step="2"');
 if(i.cls=='UIStroke')a=cf('Color','col',i.col)+nf('Thickness','th',i.th,'min="0" max="30" step="1"');
 if(i.cls=='UIGradient')a=cf('Color 0','c0',i.c0)+cf('Color 1','c1',i.c1)+nf('Rotation','rot',i.rot,'step="15"');
 if(i.cls=='UIListLayout')a=nf('Padding (px)','pad',i.pad,'min="0" max="200"')+`<label>FillDirection</label><select data-q="dir"><option value="v" ${i.dir!='h'?'selected':''}>Vertical</option><option value="h" ${i.dir=='h'?'selected':''}>Horizontal</option></select><label>HorizontalAlignment</label><select data-q="ha">${[['l','Left'],['c','Center'],['r','Right']].map(x=>`<option value="${x[0]}" ${(i.ha||'l')==x[0]?'selected':''}>${x[1]}</option>`).join('')}</select>`;
 if(i.cls=='UIGridLayout')a=nf('CellSize lebar (px)','cw',i.cw,'min="8" max="600"')+nf('CellSize tinggi (px)','chh',i.chh,'min="8" max="600"')+nf('CellPadding (px)','pad',i.pad,'min="0" max="200"');
 if(i.cls=='UIPadding')a=nf('PaddingTop','pt',i.pt,'min="0" max="200"')+nf('PaddingBottom','pb',i.pb,'min="0" max="200"')+nf('PaddingLeft','pl',i.pl,'min="0" max="200"')+nf('PaddingRight','pr',i.pr,'min="0" max="200"');
 if(i.cls=='ImageButton'||i.cls=='ImageLabel'){const im=okImg(i.img);a=`<label>Image</label><div class="pv" style="${im?`background:url('${im}') center/cover`:''}">${im?'':'kosong'}</div><div style="display:flex;gap:6px"><button class="btn sm g" data-a="iimg">Upload</button><button class="btn sm o" data-a="iclr">Hapus</button></div>`}
 if(SERV.includes(i.cls))a='<div style="font-size:11px;line-height:1.5;margin-top:6px"><code>ev.OnServerEvent:Connect(f)</code><br><code>ev:FireServer(...)</code><br><code>ev:FireClient(plr, ...)</code><br><code>ev.OnClientEvent:Connect(f)</code></div>';
 if(i.cls=='Sound')a=`<label>Suara</label><select data-q="preset">${Object.keys(SNDN).map(k=>`<option value="${k}" ${i.preset==k?'selected':''}>${SNDN[k]}</option>`).join('')}</select>`+nf('Volume (0-1)','vol',i.vol,'min="0" max="1" step=".1"')+`<label class="ck"><input type="checkbox" data-q="loop" ${i.loop?'checked':''}> Looped</label><label class="ck"><input type="checkbox" data-q="auto" ${i.auto?'checked':''}> Putar otomatis saat Test</label><button class="btn sm g w" data-a="sndtest">▶ Dengar</button>`;
 return a?h.replace(K,a+K):h};
/* ---- upload gambar GUI ---- */
document.body.insertAdjacentHTML('beforeend','<input type="file" id="fi2" accept="image/*" hidden>');
$('#fi2').addEventListener('change',e=>{const f=e.target.files[0];e.target.value='';const r=SI&&loc(SI);if(!f||!r)return;if(!/^image\//.test(f.type))return toast('File harus gambar');
 const fr=new FileReader();fr.onload=()=>{const im=new Image();im.onload=()=>{const m=Math.min(1,256/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.max(1,im.width*m|0);c.height=Math.max(1,im.height*m|0);c.getContext('2d').drawImage(im,0,0,c.width,c.height);r.i.img=c.toDataURL(f.type=='image/png'?'image/png':'image/jpeg',.85);touch();pRender();guiRefresh();toast('Gambar dipasang')};im.onerror=()=>toast('Gambar tidak valid');im.src=fr.result};fr.readAsDataURL(f)});
/* ---- palet GUI & tambah modifier ---- */
const _tr=tbxRender;tbxRender=function(){_tr();if(ST&&ST.kind=='g'&&guiOn)$('#tbx').insertAdjacentHTML('beforeend','<h4>Gambar</h4><div class="tg">'+['ImageButton','ImageLabel'].map(c=>`<button class="btn sm" data-a="gadd" data-v="${c}">${CL[c]}<br>${c.replace('Image','Img')}</button>`).join('')+'</div><h4>Modifier</h4><div class="tg">'+MODC.map(c=>`<button class="btn sm" data-a="gadd" data-v="${c}">${CL[c]}<br>${c.slice(2)}</button>`).join('')+'</div><div class="hint">Modifier dipasang ke elemen yang dipilih.</div>')};
const _ga=act.gadd;act.gadd=function(cls){if(!MODC.includes(cls))return _ga.apply(this,arguments);
 let r=SI&&loc(SI),p=r&&r.i;if(p&&MODC.includes(p.cls))p=findPar(ST.d.svc.StarterGui,p);if(!p||!GN[p.cls]||p.cls=='ScreenGui')return toast('Pilih elemen GUI dulu (Frame, Tombol, dll)');
 let x=p.ch.find(y=>y.cls==cls);if(!x){x=newI(cls);p.ch.push(x)}SI=x.id;SEL='root';guiOn=true;eRender();pRender();guiRefresh();touch();rtab('props');toast(cls+' dipasang')};
Object.assign(act,{iimg(){$('#fi2').click()},iclr(){const r=SI&&loc(SI);if(r){r.i.img='';touch();pRender();guiRefresh()}},
 sndtest(){const r=SI&&loc(SI);if(r)sndGo(r.i.preset,r.i.vol,false)}});
/* ---- tekstur ---- */
const TXN={brick:'Batu Bata',grass:'Rumput',wood:'Kayu',stone:'Batu',sand:'Pasir',metal:'Logam',checker:'Papan Catur',water:'Air'},TXC={};
function txGet(k){if(TXC[k])return TXC[k];const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');let s=7;const r=()=>(s=(s*16807)%2147483647)/2147483647,fill=q=>{x.fillStyle=q;x.fillRect(0,0,128,128)},sp=(cols,n,z)=>{for(let i=0;i<n;i++){x.fillStyle=cols[i%cols.length];x.fillRect(r()*128,r()*128,z,z)}};
 if(k=='brick'){fill('#d8d0c0');x.fillStyle='#b5523b';for(let j=0;j<4;j++)for(let i=-1;i<3;i++)x.fillRect(i*64+(j%2)*32+2,j*32+2,60,28);sp(['#a2452f','#c26048'],60,4)}
 if(k=='grass'){fill('#4caf50');sp(['#3d9142','#66bb6a','#2f7d35'],400,3)}
 if(k=='wood'){fill('#a1693a');for(let j=0;j<4;j++){x.fillStyle='#6b4423';x.fillRect(0,j*32,128,2);x.fillStyle='#8c5a2e';for(let g=0;g<5;g++)x.fillRect(r()*128,j*32+4+r()*24,30+r()*40,1.5)}}
 if(k=='stone'){fill('#8a8d93');for(let i=0;i<45;i++){x.fillStyle=`rgba(${r()<.5?'40,40,45':'200,200,205'},.25)`;x.beginPath();x.arc(r()*128,r()*128,6+r()*14,0,7);x.fill()}}
 if(k=='sand'){fill('#e6cf8e');sp(['#d4b972','#f1dfa8','#c9ad66'],500,2)}
 if(k=='metal'){fill('#b0b7bf');x.fillStyle='#8d949c';for(let i=0;i<128;i+=32){x.fillRect(i,0,2,128);x.fillRect(0,i,128,2)}x.fillStyle='#6f757c';for(let i=0;i<4;i++)for(let j=0;j<4;j++){x.beginPath();x.arc(i*32+8,j*32+8,2.5,0,7);x.fill()}}
 if(k=='checker'){for(let i=0;i<8;i++)for(let j=0;j<8;j++){x.fillStyle=(i+j)%2?'#111':'#fff';x.fillRect(i*16,j*16,16,16)}}
 if(k=='water'){fill('#2f7de1');x.strokeStyle='rgba(255,255,255,.35)';x.lineWidth=2;for(let j=0;j<6;j++){x.beginPath();for(let i=0;i<=128;i+=8)x.lineTo(i,j*22+8+Math.sin(i/10+j)*4);x.stroke()}}
 const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;return TXC[k]=t}
const _mo=mkObj;mkObj=function(o){const m=_mo(o);if(o&&o.t!='coin'&&typeof o.tex=='string'&&Object.hasOwn(TXN,o.tex)&&m.material){const t=txGet(o.tex).clone(),q=Math.max(1,Math.round(((+o.sx||1)+(+o.sz||1))/8));t.needsUpdate=true;t.repeat.set(q,q);m.material.map=t;m.material.needsUpdate=true}return m};
const _pr=pRender;pRender=function(){_pr();if(!ST||SI)return;const o=cur();if(!o||o.t=='coin')return;const p=$('#props'),K='<div style="display:flex;gap:6px;margin-top:6px"><button class="btn sm c" data-a="edup">';
 p.innerHTML=p.innerHTML.replace(K,'<label>Tekstur</label><select data-p="tex"><option value="">Tanpa</option>'+Object.keys(TXN).map(q=>`<option value="${q}" ${o.tex==q?'selected':''}>${TXN[q]}</option>`).join('')+'</select>'+K)};
/* ---- suara (sintesis WebAudio) ---- */
let AC=null;const SNDS=new Set();
const SP={coin:{w:'square',s:[[988,.07],[1319,.3]]},jump:{w:'square',sw:[260,760,.2]},boom:{n:.7},win:{w:'triangle',s:[[523,.12],[659,.12],[784,.12],[1047,.45]]},alarm:{w:'sawtooth',s:[[880,.22],[660,.22],[880,.22],[660,.22]]},klik:{w:'square',s:[[1400,.04]]},hit:{w:'sawtooth',sw:[400,80,.25]},
 musik:{w:'triangle',s:[[262,.3],[330,.3],[392,.3],[523,.3],[392,.3],[330,.3],[294,.3],[392,.3],[262,.3],[330,.3],[392,.3],[494,.3],[392,.3],[330,.3],[262,.6],[0,.3]]},
 petualangan:{w:'square',g:.5,s:[[330,.15],[392,.15],[440,.15],[494,.3],[440,.15],[392,.15],[330,.3],[294,.15],[330,.15],[392,.3],[330,.15],[294,.15],[262,.45],[0,.15]]},angin:{n:2.5,lp:600}};
const SNDN={coin:'Koin',jump:'Lompat',boom:'Ledakan',win:'Menang',alarm:'Alarm',klik:'Klik',hit:'Pukulan',musik:'Musik Santai',petualangan:'Musik Petualangan',angin:'Angin'};
function sndGo(p,vol,loop,onEnd){let c;try{c=AC=AC||new(window.AudioContext||window.webkitAudioContext)();if(c.state=='suspended')c.resume()}catch(e){return()=>{}}
 const d=SP[p]||SP.coin;vol=nn(vol,0,1,.5);let dead=0,iv=0,to=0;const nodes=[];
 const once=()=>{let t=c.currentTime+.02;const t0=t,env=(g,du)=>{g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol*.3*(d.g||1),t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+du)};
  if(d.n){const len=c.sampleRate*d.n|0,b=c.createBuffer(1,len,c.sampleRate),a=b.getChannelData(0);for(let k=0;k<len;k++)a[k]=Math.random()*2-1;const sr=c.createBufferSource(),g=c.createGain(),f=c.createBiquadFilter();sr.buffer=b;f.type='lowpass';f.frequency.value=d.lp||1200;g.gain.setValueAtTime(vol*.5,t);g.gain.exponentialRampToValueAtTime(.0001,t+d.n);sr.connect(f);f.connect(g);g.connect(c.destination);sr.start(t);nodes.push(sr);return d.n}
  if(d.sw){const o=c.createOscillator(),g=c.createGain();o.type=d.w;o.frequency.setValueAtTime(d.sw[0],t);o.frequency.exponentialRampToValueAtTime(d.sw[1],t+d.sw[2]);env(g,d.sw[2]);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+d.sw[2]+.05);nodes.push(o);return d.sw[2]}
  d.s.forEach(([f,du])=>{if(f){const o=c.createOscillator(),g=c.createGain();o.type=d.w;o.frequency.value=f;env(g,du);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+du+.03);nodes.push(o)}t+=du});return t-t0};
 const dur=once(),stop=()=>{if(dead)return;dead=1;clearInterval(iv);clearTimeout(to);nodes.forEach(n=>{try{n.stop()}catch(e){}});SNDS.delete(stop)};
 if(loop)iv=setInterval(once,Math.max(100,dur*1000));else to=setTimeout(()=>{stop();if(onEnd)onEnd()},dur*1000);SNDS.add(stop);return stop}
window.sndGo=sndGo;
/* ---- runtime Luau: RemoteEvent, Sound, modifier, Image ---- */
class REW{constructor(i){this.i=i;this.s=new Sig();this.c=new Sig();this.fn=null;this.cf=null}get n(){return this.i.n}
 $g(k){const t=this,b=t.i.cls=='BindableEvent';switch(k){case'Name':return t.i.n;case'ClassName':return t.i.cls;case'OnServerEvent':case'Event':return t.s;case'OnClientEvent':return t.c;
  case'FireServer':case'Fire':return(_,...a)=>{t.s.fire(...(b?[]:[RT&&RT.pl]),...a)};case'FireClient':return(_,pl,...a)=>{t.c.fire(...a)};case'FireAllClients':return(_,...a)=>{t.c.fire(...a)};
  case'InvokeServer':return async(_,...a)=>t.fn?call(t.fn,[RT&&RT.pl,...a]):[];case'InvokeClient':return async(_,pl,...a)=>t.cf?call(t.cf,a):[]}}
 $s(k,v){if(k=='OnServerInvoke')this.fn=v;else if(k=='OnClientInvoke')this.cf=v;else if(k=='Name')this.i.n=tostr(v)}};window.REW=REW;
class SOW{constructor(i){this.i=i;this.stop=null;this.pl=false;this.en=new Sig()}get n(){return this.i.n}
 play(){this.halt();this.pl=true;this.stop=sndGo(this.i.preset,this.i.vol,this.i.loop,()=>{this.pl=false;this.en.fire()})}
 halt(){if(this.stop)this.stop();this.stop=null;this.pl=false}
 $g(k){const t=this,i=this.i;switch(k){case'Name':return i.n;case'ClassName':return'Sound';case'Volume':return i.vol;case'Looped':return!!i.loop;case'IsPlaying':case'Playing':return t.pl;case'SoundId':return i.preset;case'Play':return()=>t.play();case'Stop':case'Pause':return()=>t.halt();case'Ended':return t.en}}
 $s(k,v){const i=this.i;if(k=='Volume')i.vol=nn(v,0,1,.5);else if(k=='Looped')i.loop=truthy(v);else if(k=='SoundId'&&Object.hasOwn(SP,String(v)))i.preset=String(v);else if(k=='Playing')truthy(v)?this.play():this.halt();else if(k=='Name')i.n=tostr(v)}}
class CSq{constructor(a,b){this.a=a;this.b=b||a}$str(){return'ColorSequence'}}
class MW{constructor(i){this.i=i;this.par=null}get n(){return this.i.n}
 $g(k){const i=this.i;switch(k){case'Name':return i.n;case'ClassName':return i.cls;case'CornerRadius':return i.rad;case'Thickness':return i.th;case'Rotation':return i.rot;case'Padding':case'CellPadding':return i.pad;case'FillDirection':return i.dir=='h'?'Horizontal':'Vertical';case'HorizontalAlignment':return i.ha=='c'?'Center':i.ha=='r'?'Right':'Left';case'PaddingTop':return i.pt;case'PaddingBottom':return i.pb;case'PaddingLeft':return i.pl;case'PaddingRight':return i.pr;case'Color':return i.cls=='UIStroke'?hexC(i.col):new CSq(hexC(i.c0),hexC(i.c1))}}
 $s(k,v){const i=this.i;if(k=='Name')i.n=tostr(v);else if(k=='CornerRadius')i.rad=nn(v,0,999,8);else if(k=='Thickness')i.th=nn(v,0,30,2);else if(k=='Rotation')i.rot=nn(v,-360,360,90);
  else if(k=='Color'){if(v instanceof CSq){i.c0=cHex(v.a);i.c1=cHex(v.b)}else if(v instanceof LC)i.col=cHex(v)}
  else if(k=='Padding'||k=='CellPadding')i.pad=nn(v instanceof LU?v.p[1]:v,0,200,6);
  else if(k=='FillDirection')i.dir=/Horizontal/.test(String(v))?'h':'v';
  else if(k=='HorizontalAlignment')i.ha=/Center/.test(String(v))?'c':/Right/.test(String(v))?'r':'l';
  else if(k=='CellSize'&&v instanceof LU){i.cw=nn(v.p[1],8,600,80);i.chh=nn(v.p[3],8,600,80)}
  else if(k=='PaddingTop')i.pt=nn(v,0,200,8);else if(k=='PaddingBottom')i.pb=nn(v,0,200,8);else if(k=='PaddingLeft')i.pl=nn(v,0,200,8);else if(k=='PaddingRight')i.pr=nn(v,0,200,8);
  else if(k=='Parent'){if(v instanceof GW){this.par=v;v.i.ch.push(i)}}
  if(this.par)gSty(this.par.i,this.par.e)}}
G.set('UDim',mkT({new:(s,o)=>+o||0}));G.set('ColorSequence',mkT({new:(a,b)=>new CSq(a,b)}));
const IN=G.get('Instance'),_inw=IN.get('new');
IN.set('new',(cls,par)=>{let w=null;if(SERV.includes(cls))w=new REW(newI(cls));else if(cls=='Sound')w=new SOW(newI('Sound'));else if(MODC.includes(cls))w=new MW(newI(cls));
 if(w){if(par!==undefined)w.$s('Parent',par);return w}return _inw(cls,par)});
const _iw=iW;iW=function(i){if(RT.iw.has(i.id))return RT.iw.get(i.id);let w=null;if(SERV.includes(i.cls))w=new REW(i);else if(i.cls=='Sound')w=new SOW(i);if(w){RT.iw.set(i.id,w);return w}return _iw(i)};
const _gg=GW.prototype.$g,_gw=GW.prototype.$s;
GW.prototype.$g=function(k){if(k=='Image')return this.i.img?'custom':'';return _gg.call(this,k)};
GW.prototype.$s=function(k,v){if(k=='Image'){this.i.img=okImg(tostr(v));gSty(this.i,this.e);return}return _gw.call(this,k,v)};
const _rs=rtStart;rtStart=function(g){_rs(g);try{if(!RT)return;const w=l=>(l||[]).forEach(i=>{if(i.cls=='Sound'&&i.auto)iW(i).$g('Play')();w(i.ch)});Object.values(g.svc||{}).forEach(w)}catch(e){}};
const _rp=rtStop;rtStop=function(){SNDS.forEach(f=>f());SNDS.clear();_rp()};
/* ---- impor proyek: pertahankan field baru ---- */
const _cs=cleanSvc;cleanSvc=function(s){const out=_cs(s);try{
 const cp=(a,b)=>{const c=a.cls;if(c=='UICorner')b.rad=nn(a.rad,0,999,8);if(c=='UIStroke'){b.col=hx(a.col)||'#000000';b.th=nn(a.th,0,30,2)}if(c=='UIGradient'){b.c0=hx(a.c0)||'#ffffff';b.c1=hx(a.c1)||'#000000';b.rot=nn(a.rot,-360,360,90)}
  if(c=='ImageButton'||c=='ImageLabel')b.img=okImg(a.img);if(c=='Sound'){b.preset=Object.hasOwn(SP,a.preset)?a.preset:'coin';b.vol=nn(a.vol,0,1,.6);b.loop=!!a.loop;b.auto=!!a.auto}},
 z=(o,n)=>{const v=(Array.isArray(o)?o:[]).filter(i=>i&&typeof i=='object'&&Object.hasOwn(CL,i.cls));n.forEach((x,k)=>{if(v[k]){cp(v[k],x);z(v[k].ch,x.ch)}})};
 if(s&&typeof s=='object')SKEYS.forEach(k=>z(s[k],out[k]))}catch(e){}return out};
/* ---- TOOLBOX LENGKAP ---- */
const mdl=(rows,pre)=>{pushUndo();const x0=Math.round(sctl.tx),z0=Math.round(sctl.tz);let first=null;rows.forEach(r=>{const[t,dx,y,dz,sx,sy,sz,c,n,ry]=r,o=O(t,f2(x0+dx),f2(y),f2(z0+dz),sx,sy,sz,c,ry||0);o.n=(pre||'')+n;ST.d.objs.push(o);first=first||o});return first};
const sadd=(k,cls,n,p)=>{const i=newI(cls);if(n)i.n=n;Object.assign(i,p||{});ST.d.svc[k].push(i);XP[k]=1;return i};
function rig(pre,sk,sh,pa,r15,extra){let R=[];
 if(!r15)R=[['part',-.5,1,0,1,2,1,pa,'LeftLeg'],['part',.5,1,0,1,2,1,pa,'RightLeg'],['part',0,3,0,2,2,1,sh,'Torso'],['part',-1.5,3,0,1,2,1,sk,'LeftArm'],['part',1.5,3,0,1,2,1,sk,'RightArm'],['part',0,4.6,0,1.2,1.2,1.2,sk,'Head'],['part',-.25,4.75,.62,.2,.25,.05,'#000000','EyeL'],['part',.25,4.75,.62,.2,.25,.05,'#000000','EyeR'],['part',0,4.35,.62,.5,.1,.05,'#000000','Mouth']];
 else{[-1,1].forEach(s=>{const sd=s<0?'Left':'Right',x=s*.5,ax=s*1.5;R.push(['part',x,.15,0,.95,.3,1.1,pa,sd+'Foot'],['part',x,.7,0,.95,.8,.95,pa,sd+'LowerLeg'],['part',x,1.6,0,.95,1,.95,pa,sd+'UpperLeg'],['part',ax,3.8,0,1,1,1,sh,sd+'UpperArm'],['part',ax,2.85,0,1,.9,1,sk,sd+'LowerArm'],['part',ax,2.25,0,1,.3,1,sk,sd+'Hand'])});
  R.push(['part',0,2.4,0,2,.6,1,pa,'LowerTorso'],['part',0,3.5,0,2,1.6,1,sh,'UpperTorso'],['part',0,4.9,0,1.2,1.2,1.2,sk,'Head'],['part',-.25,5.05,.62,.2,.25,.05,'#000000','EyeL'],['part',.25,5.05,.62,.2,.25,.05,'#000000','EyeR'],['part',0,4.65,.62,.5,.1,.05,'#000000','Mouth'])}
 return mdl(R.concat(extra||[]),pre)}
const NPCS='local torso = workspace:FindFirstChild("NPC_Torso")\ntorso.Touched:Connect(function(hit)\n\tprint("NPC: Halo, pemain!")\nend)\n';
const mk=(n,ic,d,f)=>({n,ic,d,f}),gi=(cls,n,p,mods,kids)=>{const i=newI(cls);i.n=n;Object.assign(i,p||{});(mods||[]).forEach(m=>{const x=newI(m[0]);Object.assign(x,m[1]||{});i.ch.push(x)});(kids||[]).forEach(k=>i.ch.push(k));return i},
 sg2=(n,kids)=>{const g=newI('ScreenGui');g.n=n;kids.forEach(k=>g.ch.push(k));ST.d.svc.StarterGui.push(g);XP.StarterGui=1;return g};
const TXI=k=>mk('Lantai '+TXN[k],'','Part 8x1x8 bertekstur '+TXN[k].toLowerCase(),()=>{const o=mdl([['part',0,.5,0,8,1,8,'#ffffff',TXN[k]]]);o.tex=k;return o});
const snd=k=>mk(SNDN[k],'','Sound di Workspace · workspace.'+SNDN[k].replace(/ /g,'')+':Play()',()=>sadd('Workspace','Sound',SNDN[k].replace(/ /g,''),{preset:k,loop:k=='musik'||k=='petualangan'||k=='angin'}));
const TBL={
 Model:[
  mk('Pohon','','Batang + daun',()=>mdl([['cyl',0,2,0,1.2,4,1.2,'#8d5524','Batang'],['ball',0,5.5,0,5,5,5,'#2e9e4f','Daun'],['ball',0,8,0,3.2,3.2,3.2,'#43b85f','DaunAtas']])),
  mk('Rumah','','Rumah dengan pintu & atap',()=>mdl([['part',0,.15,0,8.5,.3,8.5,'#a1693a','Lantai'],['part',0,2.3,-4,8,4,.5,'#e8d9b8','DindingBelakang'],['part',-4,2.3,0,.5,4,8,'#e8d9b8','DindingKiri'],['part',4,2.3,0,.5,4,8,'#e8d9b8','DindingKanan'],['part',-2.75,2.3,4,2.5,4,.5,'#e8d9b8','DindingDepanKiri'],['part',2.75,2.3,4,2.5,4,.5,'#e8d9b8','DindingDepanKanan'],['part',0,3.8,4,3,1,.5,'#e8d9b8','AmbangPintu'],['part',0,4.55,0,9.5,.5,9.5,'#c0392b','Atap'],['part',0,5.1,0,6.5,.6,6.5,'#a93226','AtapAtas']])),
  mk('Mobil','','Body + kabin + roda',()=>mdl([['part',0,1,0,4,1,8,'#e63946','Body'],['part',0,2,-.8,3.4,1,3.6,'#a8dadc','Kabin'],['ball',-2,.7,2.4,1.4,1.4,1.4,'#222222','Roda'],['ball',2,.7,2.4,1.4,1.4,1.4,'#222222','Roda'],['ball',-2,.7,-2.4,1.4,1.4,1.4,'#222222','Roda'],['ball',2,.7,-2.4,1.4,1.4,1.4,'#222222','Roda']])),
  mk('Tangga','','12 anak tangga (bisa dinaiki)',()=>mdl(Array.from({length:12},(_,k)=>['part',0,.125+k*.25,k,4,.25,1,k%2?'#ff90e8':'#7df9ff','Anak'+(k+1)]))),
  mk('Jembatan','','Dek + pagar + tiang',()=>mdl([['part',0,3,0,4,.5,16,'#a1693a','Dek'],['part',-2,3.75,0,.3,1,16,'#6b4423','PagarKiri'],['part',2,3.75,0,.3,1,16,'#6b4423','PagarKanan'],['cyl',-1.5,1.5,-7,.8,3,.8,'#8a8d93','Tiang'],['cyl',1.5,1.5,-7,.8,3,.8,'#8a8d93','Tiang'],['cyl',-1.5,1.5,7,.8,3,.8,'#8a8d93','Tiang'],['cyl',1.5,1.5,7,.8,3,.8,'#8a8d93','Tiang']])),
  mk('Menara Kastil','','Menara + bendera',()=>mdl([['cyl',0,5,0,6,10,6,'#9aa0a6','Menara'],['part',-2,10.75,-2,1.4,1.5,1.4,'#9aa0a6','Gerigi'],['part',2,10.75,-2,1.4,1.5,1.4,'#9aa0a6','Gerigi'],['part',-2,10.75,2,1.4,1.5,1.4,'#9aa0a6','Gerigi'],['part',2,10.75,2,1.4,1.5,1.4,'#9aa0a6','Gerigi'],['cyl',0,12,0,.2,3,.2,'#dddddd','Tiang'],['part',.7,12.9,0,1.2,.7,.1,'#e63946','Bendera']])),
  mk('Pagar','','Pagar kayu 10 stud',()=>mdl([0,1,2,3,4,5].map(k=>['part',-5+k*2,1,0,.4,2,.4,'#c19a6b','Tiang']).concat([['part',0,1.5,0,10.4,.3,.2,'#c19a6b','Palang'],['part',0,.8,0,10.4,.3,.2,'#c19a6b','Palang']]))),
  mk('Peti Harta','','Peti dengan tutup emas',()=>mdl([['part',0,.8,0,3,1.6,2,'#8d5524','Peti'],['part',0,1.8,0,3,.4,2,'#ffc400','Tutup'],['part',0,1.4,1.05,.5,.6,.15,'#ffc400','Kunci']])),
  mk('Lampu Jalan','','Tiang + lampu',()=>mdl([['cyl',0,3.5,0,.4,7,.4,'#333333','Tiang'],['ball',0,7.3,0,1.4,1.4,1.4,'#fff3a0','Lampu']])),
  mk('Meja + Kursi','','Meja dengan 2 kursi',()=>mdl([['part',0,2.2,0,4,.3,2.5,'#a1693a','Meja'],['part',-1.7,1.05,-1,.3,2.1,.3,'#6b4423','Kaki'],['part',1.7,1.05,-1,.3,2.1,.3,'#6b4423','Kaki'],['part',-1.7,1.05,1,.3,2.1,.3,'#6b4423','Kaki'],['part',1.7,1.05,1,.3,2.1,.3,'#6b4423','Kaki'],['part',0,1,-2.5,1.4,.2,1.4,'#c19a6b','Kursi'],['part',0,1.9,-3.1,1.4,1.6,.2,'#c19a6b','SandaranKursi'],['part',0,1,2.5,1.4,.2,1.4,'#c19a6b','Kursi']])),
  mk('Piramida','','5 lapis',()=>mdl([0,1,2,3,4].map(k=>['part',0,.5+k,0,10-2*k,1,10-2*k,'#e6cf8e','Lapisan']))),
  mk('Checkpoint','','Spawn + bendera',()=>mdl([['spawn',0,.2,0,4,.4,4,'#7df9ff','Checkpoint'],['cyl',0,2.5,-1.5,.2,5,.2,'#dddddd','Tiang'],['part',.7,4.3,-1.5,1.4,.9,.1,'#ff3b3b','Bendera']])),
  mk('Awan','','3 bola putih di langit',()=>mdl([['ball',0,16,0,6,3.5,4,'#ffffff','Awan'],['ball',2.5,16.6,0,4,3,3.5,'#ffffff','Awan'],['ball',-2.5,16.4,0,4,2.8,3.2,'#ffffff','Awan']]))],
 Rig:[
  mk('Rig R6','','Karakter blok 6 bagian',()=>rig('','#ffd7b5','#3b82f6','#2b4acb',false)),
  mk('Rig R15','','Karakter 15 bagian (siku, lutut)',()=>rig('','#ffd7b5','#3b82f6','#2b4acb',true)),
  mk('Zombie','','Rig hijau',()=>rig('Zombie_','#7ab648','#3a6b2a','#2d3a55',false)),
  mk('Robot','','Rig logam + antena',()=>rig('Robot_','#b0b7bf','#8d949c','#6f757c',false,[['cyl',0,5.6,0,.1,.8,.1,'#333333','Antena'],['ball',0,6.1,0,.3,.3,.3,'#ff3b3b','UjungAntena']])),
  mk('NPC + Script','','Rig dengan script sapaan',()=>{const h=rig('NPC_','#f1c27d','#b6f25a','#222222',false);sadd('ServerScriptService','Script','NPCScript',{src:NPCS});return h})],
 Suara:Object.keys(SNDN).map(snd),
 Tekstur:Object.keys(TXN).map(TXI),
 GUI:[
  mk('Tombol Modern','','Tombol + UICorner + UIStroke + UIGradient',()=>sg2('TombolModern',[gi('TextButton','Main',{p:[.5,-100,.5,-28],s:[0,200,0,56],bg:'#335fff',tc:'#ffffff',txt:'Mulai',ts:22,bd:false},[['UICorner',{rad:16}],['UIStroke',{col:'#ffffff',th:3}],['UIGradient',{c0:'#6d5bff',c1:'#2f9bff',rot:90}]])])),
  mk('Kartu Gambar','','Frame bulat + ImageLabel + judul',()=>sg2('KartuGambar',[gi('Frame','Kartu',{p:[.5,-110,.5,-100],s:[0,220,0,200],bg:'#2e1519',bd:false},[['UICorner',{rad:18}],['UIStroke',{col:'#ff5a5f',th:2}]],[gi('ImageLabel','Gambar',{p:[0,10,0,10],s:[1,-20,0,130]},[['UICorner',{rad:12}]]),gi('TextLabel','Judul',{p:[0,10,0,148],s:[1,-20,0,40],txt:'Judul Kartu',tc:'#ffffff',bt:1,bd:false})])])),
  mk('Menu Scroll','','ScrollingFrame berisi 8 tombol',()=>sg2('MenuScroll',[gi('ScrollingFrame','Daftar',{p:[.5,-110,.5,-150],s:[0,220,0,300],bg:'#241013',bd:false},[['UICorner',{rad:14}],['UIStroke',{col:'#4a2a2d',th:2}]],Array.from({length:8},(_,k)=>gi('TextButton','Item'+(k+1),{p:[0,10,0,10+k*52],s:[1,-20,0,44],txt:'Item '+(k+1),bg:'#3d2326',tc:'#ffffff',bd:false},[['UICorner',{rad:10}]])))])),
  mk('Toolbar Ikon','','3 ImageButton bulat',()=>sg2('ToolbarIkon',[gi('Frame','Bar',{p:[.5,-110,1,-90],s:[0,220,0,70],bg:'#2e1519',bd:false},[['UICorner',{rad:35}],['UIStroke',{col:'#ffffff',th:2}]],[0,1,2].map(k=>gi('ImageButton','Ikon'+(k+1),{p:[0,12+k*68,0,10],s:[0,50,0,50],bg:['#ff90e8','#7df9ff','#ffde59'][k],bd:false},[['UICorner',{rad:999}]])))])),
  mk('RemoteEvent Demo','','RemoteEvent + Script server + tombol klien',()=>{sadd('ReplicatedStorage','RemoteEvent','PesanEvent');
   sadd('ServerScriptService','Script','RemoteServer',{src:'local rs = game:GetService("ReplicatedStorage")\nlocal ev = rs:WaitForChild("PesanEvent")\nev.OnServerEvent:Connect(function(player, teks)\n\tprint(player.Name .. " mengirim: " .. teks)\n\tev:FireClient(player, "Server menerima: " .. teks)\nend)\n'});
   const ls=newI('LocalScript');ls.src='local gui = script.Parent\nlocal btn = gui:WaitForChild("Kirim")\nlocal ev = game:GetService("ReplicatedStorage"):WaitForChild("PesanEvent")\nev.OnClientEvent:Connect(function(teks)\n\tbtn.Text = teks\nend)\nbtn.MouseButton1Click:Connect(function()\n\tev:FireServer("Halo dari klien")\nend)\n';
   return sg2('RemoteDemo',[gi('TextButton','Kirim',{p:[.5,-110,.5,-28],s:[0,220,0,56],txt:'Kirim Pesan',bg:'#1faa59',tc:'#ffffff',bd:false},[['UICorner',{rad:14}]]),ls])})],
 Efek:[
  mk('Lava Pit','','Kolam lava 8x8',()=>{pushUndo();const o=O('lava',Math.round(sctl.tx),.25,Math.round(sctl.tz),8,.5,8,'#ff3b3b');ST.d.objs.push(o);return o}),
  mk('Part Berkedip','','Part hilang-muncul (script)',()=>{const o=mdl([['part',0,.5,0,4,1,4,'#ff90e8','Berkedip']]);sadd('ServerScriptService','Script','BerkedipScript',{src:'local p = workspace:FindFirstChild("Berkedip")\nwhile true do\n\tp.Transparency = 0.8\n\twait(0.7)\n\tp.Transparency = 0\n\twait(0.7)\nend\n'});return o})],
 'Siap Pakai':TB};
window.SPX={TBL,mdl,rig,sadd,gi,sg2,mk};let TBT='Model';
function tbDraw(){const m=$('#cpick');if(!m)return;m.innerHTML=`<div class="card"><div style="display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0"> Toolbox</h3><button class="btn sm o" style="margin:0" data-a="pkx">✕</button></div><div class="mt" style="margin:8px 0">${Object.keys(TBL).map(k=>`<button class="btn sm ${k==TBT?'g':''}" data-a="tbc" data-v="${k}">${k}</button>`).join('')}</div><div class="plist">${TBL[TBT].map((x,j)=>`<div class="pit" data-a="tbm" data-v="${j}"><span>${x.ic}</span><div><b>${x.n}</b><small>${x.d}</small></div></div>`).join('')}</div></div>`}
Object.assign(act,{tbox(){let m=$('#cpick');if(!m){m=document.createElement('div');m.id='cpick';document.body.appendChild(m)}tbDraw()},tbc(v){TBT=v;tbDraw()},
 tbm(v){const it=TBL[TBT][+v];if(!it||!ST||ST.kind!='g')return;act.pkx();let r;try{r=it.f()}catch(e){return toast('Gagal menambahkan: '+e.message)}sBuild();
  if(r&&r.cls)afterIns(r);else{if(r&&r.id){SEL=r.id;SI=null;guiOn=false}selHelper();eRender();pRender();guiRefresh();touch()}slog('Toolbox: '+it.n);toast('Ditambahkan: '+it.n)}});
})();
;

/* ===== 25-patch.js ===== */
(function(){
const G=$('#game');
/* ===== 1. Explorer ＋ : RemoteEvent dkk di Workspace dan service lain ===== */
const EV=['RemoteEvent','RemoteFunction','BindableEvent'],ad=(k,a)=>{PL[k]=PL[k]||[];a.forEach(x=>{if(!PL[k].includes(x))PL[k].push(x)})};
ad('Workspace',['Script','ModuleScript','Folder',...EV,'Sound']);
ad('ServerScriptService',['Script','ModuleScript','Folder',...EV,'Sound']);
ad('ServerStorage',['Script','ModuleScript','Folder',...EV,'Sound']);
ad('ReplicatedStorage',['ModuleScript','Folder',...EV,'Sound']);
ad('ReplicatedFirst',['LocalScript','ModuleScript',...EV]);
ad('StarterGui',['ScreenGui','LocalScript','Folder','ModuleScript',...EV,'Sound']);
ad('StarterPlayerScripts',['LocalScript','Folder','ModuleScript',...EV]);
ad('StarterPack',['LocalScript',...EV]);

/* ===== 2. Chat ala Roblox ===== */
$('#topl').innerHTML='<button class="rbx" data-a="pause" title="Menu">S</button><div class="rpill"><button data-a="pause">☰</button><button data-a="chat"></button><button data-a="cam"><i id="camb" style="display:none"></i></button></div>';
G.insertAdjacentHTML('beforeend','<div id="rchat"><div class="rtabs"><b data-a="rct" data-v="here" class="on">Di sini</b><b data-a="rct" data-v="all">Global</b><b data-a="rct" data-v="fr">Teman</b></div><div class="rlog"></div><div class="rin"></div></div><div class="hud" id="hpb"><i></i><b>100</b></div><div id="hurt"></div><div id="dead"> Kamu dimakan zombie!<small>Respawn sebentar lagi…</small></div>');
const RC=$('#rchat'),LG=RC.querySelector('.rlog'),CI=$('#ci');
CI.placeholder='Ketuk di sini untuk chat';RC.querySelector('.rin').appendChild(CI);
let CHM=[],CHT='here',opn=false;
const hue=n=>{let h=0;for(const c of String(n))h=(h*31+c.charCodeAt(0))%360;return h};
function draw(){const now=Date.now();let L=CHM.filter(m=>CHT=='all'?m.k!='s':CHT=='fr'?(m.me||(m.k=='u'&&rel(m.n)=='friend')):true);
 if(!opn)L=L.filter(m=>now-m.ts<12000);L=L.slice(-40);
 LG.innerHTML=L.length?L.map(m=>m.k=='u'?`<div class="rm"><b style="color:hsl(${hue(m.n)},80%,70%)">[${esc(m.n)}]:</b> ${esc(m.t)}</div>`:`<div class="rm ${m.k}"><span>${m.k=='s'?'':'['+esc(m.n)+'] '}${esc(m.t)}</span></div>`).join(''):(opn?'<div class="rm k"><span>Belum ada pesan.</span></div>':'');
 LG.scrollTop=LG.scrollHeight;RC.classList.toggle('op',opn);RC.querySelectorAll('.rtabs b').forEach(b=>b.classList.toggle('on',b.dataset.v==CHT))}
function bubble(g,t){if(!g||!window.THREE)return;if(g.userData.bub){g.remove(g.userData.bub);clearTimeout(g.userData.bubT)}
 const c=document.createElement('canvas');c.width=512;c.height=160;const x=c.getContext('2d');x.font='bold 30px Arial';
 const w=[],words=String(t).split(' ');let ln='';words.forEach(s=>{if(x.measureText(ln+' '+s).width>440&&ln){w.push(ln);ln=s}else ln=ln?ln+' '+s:s});w.push(ln);const ls=w.slice(0,3),h=ls.length*36+28;
 x.fillStyle='#fff';x.strokeStyle='#000';x.lineWidth=5;x.beginPath();x.roundRect?x.roundRect(8,8,496,h,22):x.rect(8,8,496,h);x.fill();x.stroke();
 x.fillStyle='#111';x.textAlign='center';x.textBaseline='middle';ls.forEach((s,i)=>x.fillText(s.slice(0,28),256,8+14+18+i*36));
 const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),depthTest:false,transparent:true}));sp.scale.set(4.2,1.3,1);sp.position.y=7.4;sp.renderOrder=9;g.add(sp);g.userData.bub=sp;
 g.userData.bubT=setTimeout(()=>{g.remove(sp);if(g.userData.bub===sp)g.userData.bub=null},7000)}
const _ac=addChat;
addChat=function(n,t){const sys=n=='Sistem',scr=n=='Script'||n=='Error'||n=='Peringatan',m={n,t:String(t),k:sys?'s':scr?'k':'u',ts:Date.now(),me:n==me.name};CHM.push(m);if(CHM.length>200)CHM.shift();draw();
 if(m.k=='u'){try{if(m.me)bubble(plr,t);else for(const k in remote)if(remote[k].name==n)bubble(remote[k].g,t)}catch(e){}}};
setInterval(()=>{if(run&&!opn)draw()},2000);
act.chat=function(){opn=!opn;draw();if(opn)setTimeout(()=>CI.focus(),30);else CI.blur()};
act.rct=function(v){CHT=v;draw()};
act.send=function(){const t=CI.value.trim();if(t){addChat(me.name,t);if(RM)RM.presence({c:t,ct:Date.now()}).catch(()=>{})}CI.value='';opn=false;CI.blur();draw()};

/* ===== 3. Health GUI, mati, respawn ===== */
const HB=$('#hpb'),HF=HB.querySelector('i'),HT=HB.querySelector('b'),HU=$('#hurt'),DD=$('#dead');let rvT=null,dPos=null,dT0=0,lastHurt=0;
function hud(){if(!RT)return;const h=Math.max(0,Math.ceil(RT.hp));HF.style.width=h+'%';HF.style.background=h>60?'#4cd964':h>30?'#ffcc00':'#ff3b30';HT.textContent=h}
function hurt(n){if(!RT||!RT.alive||RT.dead||!(n>0)||Date.now()<(RT.inv||0))return;RT.hp=Math.max(0,RT.hp-n);lastHurt=Date.now();hud();HU.style.opacity=1;setTimeout(()=>HU.style.opacity=0,160);try{burst(P.x,P.y+1.5,P.z,'#ff3b30',8)}catch(e){}if(RT.hp<=0)die()}
function die(){if(!RT||RT.dead)return;RT.dead=true;RT.hp=0;hud();dPos={x:P.x,z:P.z};dT0=performance.now();DD.style.display='flex';try{burst(P.x,P.y+1.5,P.z,'#ff3b30',30)}catch(e){}if(RT.died)RT.died.fire();
 rvT=setTimeout(()=>{if(!RT||!RT.alive)return;RT.dead=false;RT.hp=100;RT.inv=Date.now()+2500;DD.style.display='none';if(plr){plr.rotation.x=0}act.respawn();hud();if(RT.pl)try{RT.pl.x.CharacterAdded.fire(RT.ch)}catch(e){}toast('Respawn!')},1800)}
const _hg=HumW.prototype.$g,_hs=HumW.prototype.$s;
HumW.prototype.$g=function(k){if(k=='Health')return RT.hp;if(k=='TakeDamage')return(s,n)=>{hurt(+n);return[]};if(k=='Died')return RT.died;if(k=='MaxHealth')return 100;return _hg.call(this,k)};
HumW.prototype.$s=function(k,v){if(k=='Health'){v=+v;if(v<RT.hp)hurt(RT.hp-v);else if(!RT.dead){RT.hp=Math.min(100,v);hud()}}else _hs.call(this,k,v)};
const _rt=rtTick;rtTick=function(){_rt();if(!RT||!RT.alive||!P)return;
 if(RT.dead){P.x=dPos.x;P.z=dPos.z;P.vy=0;if(plr)plr.rotation.x=-Math.min(1.5,(performance.now()-dT0)/350)}
 else if(RT.hp<100&&Date.now()-lastHurt>4000){RT.hp=Math.min(100,RT.hp+.02*60*Math.min(.1,(performance.now()-(RT._lt2||performance.now()))/1000));hud()}
 RT._lt2=performance.now()};
const _sg=startGame;startGame=function(g,t){_sg(g,t);CHM=[];CHT='here';opn=false;try{if(RT){RT.dead=false;RT.hp=100;RT.inv=0;RT.died=new Sig()}}catch(e){}
 clearTimeout(rvT);DD.style.display='none';HU.style.opacity=0;HB.style.display='block';hud();CI.value='';draw();addChat('Sistem','Selamat datang di '+g.name+'!')};
const _sp=stopGame;stopGame=function(){clearTimeout(rvT);HB.style.display='none';DD.style.display='none';opn=false;_sp()};

/* ===== 4. Zombie: script yang mengejar & memakan pemain ===== */
const ZS=pre=>`-- ZombieAI: mengejar pemain, memakannya, lalu pemain respawn
local PREFIX = "${pre}"
local SPEED = 5      -- kecepatan jalan
local RANGE = 45     -- jarak mulai mengejar
local DAMAGE = 25    -- damage per gigitan
local player = game:GetService("Players").LocalPlayer
local parts, offs = {}, {}
local torso
for _, p in ipairs(workspace:GetChildren()) do
	if string.sub(p.Name, 1, #PREFIX) == PREFIX then
		table.insert(parts, p)
		if p.Name == PREFIX .. "Torso" then torso = p end
	end
end
if not torso then warn("ZombieAI: part tidak ditemukan") return end
local base = torso.Position
for i, p in ipairs(parts) do offs[i] = p.Position - base end
local home = base
local lastHit = 0
local function moveTo(target, dt)
	local cur = torso.Position
	local d = Vector3.new(target.X - cur.X, 0, target.Z - cur.Z)
	local dist = d.Magnitude
	if dist < 0.3 then return end
	local step = math.min(SPEED * dt, dist)
	local nxt = cur + d.Unit * step
	for i, p in ipairs(parts) do p.Position = nxt + offs[i] end
end
while true do
	local dt = wait(0.03)
	if dt > 0.1 then dt = 0.1 end
	local char = player.Character
	local root = char:FindFirstChild("HumanoidRootPart")
	local hum = char:FindFirstChild("Humanoid")
	local pos = root.Position
	local tp = torso.Position
	local flat = Vector3.new(pos.X - tp.X, 0, pos.Z - tp.Z).Magnitude
	local dy = math.abs(pos.Y - tp.Y)
	if hum.Health > 0 and flat < RANGE and dy < 8 then
		if flat > 2.2 then
			moveTo(pos, dt)
		elseif os.clock() - lastHit > 0.8 then
			lastHit = os.clock()
			hum:TakeDamage(DAMAGE)
		end
	else
		moveTo(home, dt)
	end
end
`;
const T=window.SPX.TBL.Rig,ix=T.findIndex(x=>x.n=='Zombie');
const zi={n:'Zombie',ic:'',d:'Zombie + script: mengejar & memakan pemain (HP berkurang, mati, respawn)',f(){
 const n=ST.d.objs.filter(o=>/^Zombie\d*_Torso$/.test(o.n)).length+1,pre='Zombie'+n+'_';
 const h=window.SPX.rig(pre,'#7ab648','#3a6b2a','#2d3a55',false);ST.d.objs.forEach(o=>{if(o.n.startsWith(pre))o.cc=false});
 window.SPX.sadd('ServerScriptService','Script','ZombieAI'+n,{src:ZS(pre)});return h}};
if(ix>=0)T[ix]=zi;else T.push(zi);
draw();
})();
;

/* ===== 26-patch.js ===== */
(function(){
const ED=$('#ed'),ETB=$('#etb'),EB=$('#ebody'),SPXx=window.SPX,TBL=SPXx.TBL;
const E=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
const rb=(ic,t,a,v,x)=>`<button class="rb ${x||''}" data-a="${a}"${v!=null?` data-v="${E(v)}"`:''} title="${E(t)}"><i>${ico(t)}</i><span>${E(t)}</span></button>`;
const A='#4da3ff',SV=b=>`<svg viewBox="0 0 24 24" fill="none" stroke="#d7dde6" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">${b}</svg>`;
const IC={Select:SV(`<path d="M6 3l12 9-6 1.5L9.5 20z" fill="${A}"/>`),Move:SV('<path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3"/>'),Rotate:SV('<path d="M20 12a8 8 0 11-3-6.2M20 4v5h-5"/>'),Scale:SV(`<rect x="4" y="9" width="11" height="11" fill="${A}" fill-opacity=".4"/><path d="M13 11l7-7M15 4h5v5"/>`),Undo:SV('<path d="M9 7L4 12l5 5M4 12h10a6 6 0 010 8"/>'),Naik:SV(`<path d="M12 4l8 10h-5v6H9v-6H4z" fill="${A}" fill-opacity=".5"/>`),Turun:SV(`<path d="M12 20l8-10h-5V4H9v6H4z" fill="${A}" fill-opacity=".5"/>`),Part:SV(`<path d="M12 3l8 4v10l-8 4-8-4V7z" fill="${A}" fill-opacity=".45"/><path d="M4 7l8 4 8-4M12 11v10"/>`),Terrain:SV(`<path d="M2 19l7-12 4 7 3-4 6 9z" fill="#5cc26b" fill-opacity=".6"/>`),Karakter:SV(`<circle cx="12" cy="6" r="3" fill="${A}"/><path d="M12 9v6M7 11h10M12 15l-3 6M12 15l3 6"/>`),GUI:SV(`<rect x="3" y="5" width="18" height="14" rx="2" fill="${A}" fill-opacity=".3"/><path d="M3 9h18M7 13h6"/>`),Script:SV(`<path d="M6 3h9l4 4v14H6z" fill="#6fd37f" fill-opacity=".35"/><path d="M9 11h7M9 15h7"/>`),Material:SV(`<rect x="3" y="5" width="18" height="14" fill="#d9703a" fill-opacity=".5"/><path d="M3 10h18M3 15h18M9 5v5M15 10v5M9 15v4"/>`),Color:SV('<circle cx="12" cy="12" r="9"/><circle cx="8" cy="10" r="1.6" fill="#ff5a5a"/><circle cx="12" cy="7.5" r="1.6" fill="#ffd54a"/><circle cx="16" cy="10" r="1.6" fill="#5acb6a"/><circle cx="9" cy="15" r="1.6" fill="#4da3ff"/>'),Duplikat:SV(`<rect x="8" y="8" width="12" height="12"/><rect x="4" y="4" width="12" height="12" fill="${A}" fill-opacity=".3"/>`),Hapus:SV('<path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13"/>'),Tempel:SV(`<rect x="5" y="5" width="14" height="16" rx="2" fill="${A}" fill-opacity=".3"/><path d="M9 5V3h6v2M9 11h6M9 15h6"/>`),Salin:SV('<rect x="9" y="9" width="11" height="12" rx="1.5"/><path d="M5 15V4a1 1 0 0 1 1-1h9"/>'),Potong:SV('<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><path d="M8 7.5L20 18M8 16.5L20 6"/>'),Toolbox:SV(`<rect x="3" y="8" width="18" height="12" rx="2" fill="#d9703a" fill-opacity=".5"/><path d="M9 8V5h6v3M3 13h18"/>`)};
const ico=t=>IC[t]||IC.Part;
const sp='<div class="rsep"></div>';
const tbi=(cat,list)=>(list||TBL[cat]||[]).map(x=>rb(x.ic,x.n,'rb','tb:'+cat+':'+x.n,'gonly')).join('');
/* ---- pita atas, menu, tab ---- */
const etl=$('#etl'),etr=$('#etr'),title=$('#etitle'),pub=$('#pubb'),snap=$('#snap'),guib=$('#guib'),tbxb=$('#tbxb'),tst=etr.querySelector('[data-a=edtest]'),sav=etr.querySelector('[data-a=edsave]');
const top=document.createElement('div');top.id='rtop';ED.insertBefore(top,ETB);
const back=etl.querySelector('[data-a=edexit]');top.append(back,title,sav,pub);
const MN={File:[['Simpan','edsave'],['Ekspor ke file (.json)','edexpf'],['Impor dari file','edimpf'],['Ekspor model (.glb)','edglb'],['Impor model (.glb)','edglbi'],['Publish / Draft','edpub'],['Keluar Studio','edexit']],
 Edit:[['Undo (Ctrl+Z)','undo'],['Duplikat (Ctrl+D)','edup'],['Hapus','rb','del']],
 Object:[['Part','ins','part'],['Silinder','ins','cyl'],['Bola','ins','ball'],['Spawn','ins','spawn'],['Finish','ins','finish'],['Lava','ins','lava']],
 View:[['Toolbox','tbox'],['Editor GUI','gui'],['Terrain Editor','rb','terp'],['Output','rb','out']],
 Plugins:[['Tidak ada plugin terpasang','rb','noplug']],
 Help:[['Pintasan keyboard','rb','help'],['Referensi Luau','rb','luau']]};
const row=document.createElement('div');row.id='rrow';ED.insertBefore(row,ETB);
row.innerHTML='<div id="rmenu">'+Object.keys(MN).map(k=>`<div class="mn"><b data-a="mnu" data-v="${k}">${k}</b><div class="dd">${MN[k].map(m=>`<button data-a="${m[1]}"${m[2]?` data-v="${m[2]}"`:''}>${m[0]}</button>`).join('')}</div></div>`).join('')+'</div><div id="rtabs2"><b class="on" data-a="rt2" data-v="home">Home</b><b data-a="rt2" data-v="model">Model</b><b class="gonly" data-a="rt2" data-v="avatar">Avatar</b><b class="gonly" data-a="rt2" data-v="ui">UI</b><b class="gonly" data-a="rt2" data-v="script">Script</b></div><div class="go"></div>';
row.querySelector('.go').appendChild(tst);
/* ---- pita ribbon ---- */
const shapes=[['','Part','part'],['','Silinder','cyl'],['⚪','Bola','ball'],['','Lava','lava'],['','Spawn','spawn'],['','Finish','finish']];
ETB.innerHTML='';
const pg=(k,h)=>{const d=document.createElement('div');d.className='rpg'+(k=='home'?' on':'');d.dataset.t=k;d.innerHTML=h;ETB.appendChild(d);return d};
const home=pg('home',rb('','Select','tool','select')+rb('✛','Move','tool','move','on')+rb('⟳','Rotate','tool','rot')+rb('⤢','Scale','tool','scale')+sp+rb('↶','Undo','undo')+rb('','Naik','yup')+rb('','Turun','ydn')+sp+'<div class="rsn"><span>Snap</span></div>'+sp+rb('','Part','ins','part')+rb('','Terrain','rb','terp','gonly')+rb('','Karakter','rb','tb:Rig:Rig R6','gonly')+'<span id="gslot" style="display:contents"></span>'+rb('','Script','rb','add:Script','gonly')+rb('','Material','rb','mat')+'<label class="rb" title="Warna"><i>'+ico('Color')+'</i><span>Color</span><input type="color" id="rcol" value="#ff5a5a" style="position:absolute;opacity:0;inset:0;width:100%;height:100%;cursor:pointer"></label>'+sp+rb('⧉','Duplikat','edup')+rb('','Tempel','pst')+rb('','Salin','cpy')+rb('','Potong','cut')+rb('','Hapus','rb','del')+'<span id="tslot" style="display:contents"></span>');
home.querySelector('.rsn').appendChild(snap);
for(const [b,ic,t,slot] of [[guib,'','GUI','#gslot'],[tbxb,'','Toolbox','#tslot']]){b.className='rb gonly';b.innerHTML=`<i>${ico(t)}</i><span>${t}</span>`;home.querySelector(slot).appendChild(b)}
const mdlp=pg('model','');const avp=pg('avatar','');const uip=pg('ui','');const scp=pg('script','');
const fillTabs=()=>{
 mdlp.innerHTML=shapes.map(s=>rb(s[0],s[1],'ins',s[2])).join('')+sp+tbi('Model')+sp+tbi('Tekstur')+sp+tbi('Efek');
 avp.innerHTML=tbi('Rig');
 uip.innerHTML=rb('','ScreenGui','gadd','ScreenGui')+['Frame','ScrollingFrame','TextLabel','TextButton','TextBox','ImageLabel','ImageButton'].map(c=>rb(CL[c]||'▫',c=='ScrollingFrame'?'Scroll':c.replace('Image','Img'),'gadd',c)).join('')+sp+['UICorner','UIStroke','UIGradient'].map(c=>rb(CL[c]||'▫',c.slice(2),'gadd',c)).join('')+sp+tbi('GUI');
 scp.innerHTML=[['','Script','Script'],['','LocalScript','LocalScript'],['','ModuleScript','ModuleScript'],['','RemoteEvent','RemoteEvent'],['','RemoteFunc','RemoteFunction'],['','BindableEv','BindableEvent'],['','Sound','Sound'],['','Folder','Folder']].map(s=>rb(s[0],s[1],'rb','add:'+s[2])).join('')+sp+tbi('Suara')+sp+tbi('Siap Pakai')};
fillTabs();
/* ---- kolom kiri: Terrain + Toolbox ---- */
const lcol=document.createElement('div');lcol.id='lcol';
lcol.innerHTML='<div id="terp" class="gonly"><div class="phd">Terrain Editor<b data-a="rb" data-v="terp">✕</b></div><div class="tt"><b class="on" data-a="rb" data-v="tt:c">Create</b><b data-a="rb" data-v="tt:e">Edit</b><b data-a="rb" data-v="tt:b">Tipe Brush</b></div><div class="tgr"></div></div><div class="phd">Toolbox<b data-a="tbox" title="Toolbox lengkap"></b></div>';
EB.insertBefore(lcol,EB.firstChild);lcol.appendChild($('#tbx'));
/* ---- tengah: viewport + Output ---- */
const vpc=document.createElement('div');vpc.id='vpc';EB.insertBefore(vpc,$('#rgt'));vpc.appendChild($('#vp'));
const op=document.createElement('div');op.id='opan';op.innerHTML='<div class="phd">Output<span><b data-a="rb" data-v="clr"></b> &nbsp;<b data-a="rb" data-v="out">✕</b></span></div>';op.appendChild($('#outp'));vpc.appendChild(op);
/* ---- kanan: header Explorer / Properti ---- */
$('#expl').insertAdjacentHTML('beforebegin','<div class="phd">Explorer</div>');$('#props').insertAdjacentHTML('beforebegin','<div class="phd">Properti</div>');
/* ---- Output log ---- */
const OUTP=$('#outp');
slog=function(m){const d=document.createElement('div'),s=String(m);d.textContent=s;if(/^Error/.test(s))d.className='er2';else if(/^Peringatan/.test(s))d.className='wr';OUTP.appendChild(d);while(OUTP.children.length>120)OUTP.firstChild.remove();OUTP.scrollTop=OUTP.scrollHeight};
slog('Selamat datang di Sandbox Studio');
/* ---- Terrain ---- */
let TT='c';const TR=()=>ST.d.objs.filter(o=>o.n=='Terrain'),trR=()=>{sBuild();eRender();pRender();touch()};
const TG={c:[['','Import',()=>toast('Import heightmap belum didukung')],['','Generate',()=>{pushUndo();const x0=Math.round(sctl.tx),z0=Math.round(sctl.tz);for(let i=-3;i<=3;i++)for(let j=-3;j<=3;j++){const h=Math.max(1,Math.round(3+(Math.sin(i*.9)+Math.cos(j*.7))*1.6)),o=O('part',x0+i*8,h/2,z0+j*8,8,h,8,'#5aa14a',0);o.n='Terrain';o.tex='grass';ST.d.objs.push(o)}trR();slog('Terrain dibuat (49 blok)')}],['','Clean',()=>{if(!TR().length)return toast('Tidak ada Terrain');pushUndo();ST.d.objs=ST.d.objs.filter(o=>o.n!='Terrain');SEL='root';trR();slog('Terrain dibersihkan')}]],
 e:[['','Naikkan',()=>{pushUndo();TR().forEach(o=>{o.sy=f2(o.sy+1);o.y=f2(o.y+.5)});trR()}],['','Turunkan',()=>{pushUndo();TR().forEach(o=>{o.sy=Math.max(1,f2(o.sy-1));o.y=o.sy/2});trR()}],['➖','Ratakan',()=>{const t=TR();if(!t.length)return;pushUndo();t.forEach(o=>{o.sy=3;o.y=1.5});trR()}]],
 b:[['','Rumput',()=>br('#5aa14a','grass')],['','Pasir',()=>br('#e6cf8e','sand')],['','Batu',()=>br('#8a8a8a','stone')],['','Air',()=>br('#3b82f6','water')],['','Salju',()=>br('#f4f8ff','')],['','Tanah',()=>br('#8d5524','')]]};
function br(c,t){if(!TR().length)return toast('Buat Terrain dulu (Generate)');pushUndo();TR().forEach(o=>{o.c=c;o.tex=t});trR()}
const TGR=lcol.querySelector('.tgr');
function drawT(){lcol.querySelectorAll('.tt b').forEach(b=>b.classList.toggle('on',b.dataset.v=='tt:'+TT));TGR.innerHTML=TG[TT].map((x,i)=>`<button data-a="rb" data-v="tf:${i}"><i>${ico(x[1])}</i>${x[1]}</button>`).join('')}drawT();
/* ---- aksi ---- */
const curO=()=>ST&&ST.d.objs.find(o=>o.id==SEL);
const SVCM={Script:'ServerScriptService',LocalScript:'StarterPlayerScripts',ModuleScript:'ReplicatedStorage',RemoteEvent:'ReplicatedStorage',RemoteFunction:'ReplicatedStorage',BindableEvent:'ReplicatedStorage',Sound:'Workspace',Folder:'Workspace'};
function runTB(cat,name){const it=(TBL[cat]||[]).find(x=>x.n==name);if(!it||!ST||ST.kind!='g')return;let r;try{r=it.f()}catch(e){return toast('Gagal menambahkan: '+e.message)}sBuild();
 if(r&&r.cls)afterIns(r);else{if(r&&r.id){SEL=r.id;SI=null;guiOn=false}selHelper();eRender();pRender();guiRefresh();touch()}slog('Toolbox: '+it.n);toast('Ditambahkan: '+it.n)}
function addS(cls){if(!ST||ST.kind!='g')return;try{ensureSvc(ST.d)}catch(e){}const i=SPXx.sadd(SVCM[cls],cls,null,/Script$/.test(cls)&&SRC[cls]?{src:SRC[cls]}:null);afterIns(i);slog(cls+' ditambahkan ke '+SVCM[cls]);toast(cls+' → '+SVCM[cls])}
act.rb=function(v){const a=String(v).split(':');switch(a[0]){
 case'terp':$('#terp').classList.toggle('off');break;case'out':op.classList.toggle('off');break;case'clr':OUTP.innerHTML='';break;
 case'tt':TT=a[1];drawT();break;case'tf':if(ST&&ST.kind=='g')TG[TT][+a[1]][2]();break;
 case'del':{const o=curO();if(!o)return toast('Pilih objek dulu');act.edel(o.id);break}
 case'mat':rtab('props');toast('Atur Tekstur & Warna di panel Properti (pilih objek dulu)');break;
 case'tb':runTB(a[1],a.slice(2).join(':'));break;case'add':addS(a[1]);break;
 case'noplug':toast('Belum ada plugin');break;
 case'help':toast('1-4: alat · Ctrl+Z undo · Ctrl+D duplikat · Ctrl+C salin · Ctrl+X potong · Ctrl+V tempel · Delete hapus');break;
 case'luau':toast('Lihat Referensi Luau di editor Script');break}};
act.rt2=function(v){ETB.querySelectorAll('.rpg').forEach(p=>p.classList.toggle('on',p.dataset.t==v));row.querySelectorAll('#rtabs2 b').forEach(b=>b.classList.toggle('on',b.dataset.v==v))};
act.mnu=function(v,el){const m=el.parentNode,was=m.classList.contains('op');document.querySelectorAll('#rmenu .mn.op').forEach(x=>x.classList.remove('op'));if(!was)m.classList.add('op')};
document.addEventListener('click',e=>{if(!e.target.closest('[data-a=mnu]'))document.querySelectorAll('#rmenu .mn.op').forEach(x=>x.classList.remove('op'))});
$('#rcol').addEventListener('input',e=>{const o=curO();if(!o)return toast('Pilih objek dulu');const el=$('#props [data-p=c]');if(!el)return;el.value=e.target.value;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))});
/* ---- kind accessory + langit viewport ---- */
const _eo=edOpen;edOpen=function(d,k){_eo(d,k);ED.dataset.k=k;if(k!='g')act.rt2('home');fillTabs()};
let skyT=null;const sky=()=>{if(skyT)return skyT;const c=document.createElement('canvas');c.width=4;c.height=256;const x=c.getContext('2d'),g=x.createLinearGradient(0,0,0,256);g.addColorStop(0,'#7e92ab');g.addColorStop(.42,'#c7d0da');g.addColorStop(.5,'#5a5348');g.addColorStop(.56,'#3a3026');g.addColorStop(1,'#271f17');x.fillStyle=g;x.fillRect(0,0,4,256);return skyT=new THREE.CanvasTexture(c)};
const _sb=sBuild;sBuild=function(){_sb();if(ST&&ST.kind=='g'&&SS){try{SS.background=sky();SS.fog=null}catch(e){}}};
})();
;

/* ===== 27-patch.js ===== */
(function(){
const G=$('#game');
const ic=p=>`<svg viewBox="0 0 24 24">${p}</svg>`;
const I={
 menu:ic('<path d="M4 7h16M4 12h16M4 17h16"/>'),close:ic('<path d="M6 6l12 12M18 6L6 18"/>'),
 logo:'<svg viewBox="0 0 24 24" fill="#fff"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 8.5l3.5 2v3L12 15.5l-3.5-2v-3z" fill="#1b1d22"/></svg>',
 chat:ic('<path d="M4 5h16v11H10l-4 3v-3H4z" stroke="#fff" fill="none" stroke-width="1.8" stroke-linejoin="round"/><path d="M8 9h8M8 12h5" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>'),
 cam:ic('<rect x="3" y="7" width="18" height="13" rx="2" stroke="#fff" fill="none" stroke-width="1.8"/><circle cx="12" cy="13.5" r="3" stroke="#fff" fill="none" stroke-width="1.8"/><path d="M8 7l1.5-3h5L16 7" stroke="#fff" fill="none" stroke-width="1.8"/>'),
 friend:ic('<path d="M4 5h16v11H9l-4 3v-3H4z"/><path d="M8 9h8M8 12h5"/>'),shop:ic('<path d="M5 8h14l-1 12H6z"/><path d="M9 8a3 3 0 016 0"/>'),
 avatar:ic('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="10" r="3"/><path d="M6.5 18c1.5-3 9.5-3 11 0"/>'),
 music:ic('<path d="M9 18V6l10-2v12"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="16" r="2"/>'),
 media:ic('<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7l1.5-3h5L16 7"/><circle cx="12" cy="13.5" r="3"/>'),
 flag:ic('<path d="M5 21V4M5 5h13l-3 4 3 4H5"/>'),
 cup:ic('<path d="M8 4h8v6a4 4 0 01-8 0zM8 6H4v2a3 3 0 004 3M16 6h4v2a3 3 0 01-4 3M12 14v4M8 20h8"/>'),
 emote:ic('<circle cx="12" cy="12" r="9"/><path d="M8 14c2 3 6 3 8 0"/><circle cx="9" cy="10" r=".8"/><circle cx="15" cy="10" r=".8"/>'),
 bag:ic('<rect x="6" y="8" width="12" height="13" rx="3"/><path d="M9 8V6a3 3 0 016 0v2M9 14h6"/>'),
 resp:ic('<circle cx="9" cy="5" r="2"/><path d="M9 8v5l-3 4M9 13l3 4M14 17a4 4 0 106-3"/>'),
 up:'<svg viewBox="0 0 24 24"><path d="M12 3l9 10h-5v8H8v-8H3z"/></svg>'};
$('#topl').innerHTML=`<button class="rbx" data-a="pause" title="Menu">${I.logo}</button><div class="rpill"><button data-a="gmn" id="gmb">${I.menu}</button><button data-a="chat">${I.chat}</button><button data-a="cam">${I.cam}<i id="camb" style="display:none"></i></button></div>`;
$('#jump').innerHTML=I.up;
G.insertAdjacentHTML('beforeend','<div id="gmenu"></div><div id="stopb" data-a="stopt"><i></i>Stop</div>');
const M=$('#gmenu');
const LST=[['friend','Chat teman','friend'],['shop','Toko','shop'],['avatar','Beralih avatar','avatar'],['music','Musik','music'],['media','Media','media'],['flag','Laporkan','rep'],['cup','Papan Peringkat','lead'],['emote','Emote','emote'],['bag','Inventaris','inv'],['resp','Respawn','resp']];
const EMO=[['emote','Lambai','wave'],['emote','Dansa','dance'],['emote','Loncat','jump'],['friend','Kembali','back']];
function mdraw(l){M.innerHTML=l.map(x=>`<button data-a="gma" data-v="${x[2]}">${I[x[0]]}<span>${x[1]}</span></button>`).join('')}
function mopen(o){M.classList.toggle('on',o);$('#gmb').innerHTML=o?I.close:I.menu;$('#gmb').classList.toggle('on',o);if(o)mdraw(LST)}
let mus=null,emo=null;
function musik(){if(mus){clearInterval(mus.t);try{mus.c.close()}catch(e){}mus=null;toast('Musik mati');return}
 try{const c=new(window.AudioContext||window.webkitAudioContext)(),sc=[0,2,4,7,9,12,9,7,4,2],base=261.63;let i=0;
  const t=setInterval(()=>{const o=c.createOscillator(),g=c.createGain();o.type='triangle';o.frequency.value=base*Math.pow(2,sc[i++%sc.length]/12);g.gain.value=.05;g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+.4);o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+.4)},420);mus={c,t};toast('Musik nyala')}catch(e){toast('Musik tidak didukung')}}
act.gmn=function(){mopen(!M.classList.contains('on'))};
act.gma=function(v){
 if(v=='emote'){mdraw(EMO);return}if(v=='back'){mdraw(LST);return}
 if(v=='wave'||v=='dance'||v=='jump'){emo={k:v,t0:performance.now()};if(v=='jump')act.jump&&0;mopen(false);return}
 mopen(false);
 if(v=='friend'){act.rct('fr');if(!document.querySelector('#rchat.op'))act.chat()}
 else if(v=='shop'||v=='avatar'){if(testing)return toast('Tidak tersedia saat Test');act.leave();setTimeout(()=>act.go('avatar'),60)}
 else if(v=='music')musik();
 else if(v=='media'){try{R.render(scene,cam3);const a=document.createElement('a');a.href=cv.toDataURL('image/png');a.download='sandbox.png';a.click();toast('Tangkapan layar disimpan')}catch(e){toast('Gagal menyimpan gambar')}}
 else if(v=='rep'){act.pause();act.mt('rep')}
 else if(v=='lead'){act.pause();act.mt('play')}
 else if(v=='inv')toast('SandBux tidak bisa didapat di dalam game')
 else if(v=='resp')act.respawn()};
act.stopt=function(){if(testing)stopGame()};
document.addEventListener('click',e=>{if(!e.target.isConnected)return;if(M.classList.contains('on')&&!e.target.closest('#gmenu,#gmb'))mopen(false)});
const _rt=rtTick;rtTick=function(){_rt();if(!emo||!plr||(RT&&RT.dead))return;const t=(performance.now()-emo.t0)/1000;
 if(t>2.5||Math.hypot(joy.x,joy.y)>.2){emo=null;plr.rotation.z=0;return}
 if(emo.k=='wave')plr.rotation.z=Math.sin(t*9)*.22;else if(emo.k=='dance'){plr.rotation.y=t*7;plr.position.y+=Math.abs(Math.sin(t*8))*.35}else plr.position.y+=Math.abs(Math.sin(t*5))*1.1};
const _sg=startGame;startGame=function(g,t){_sg(g,t);mopen(false);emo=null;$('#stopb').style.display=t?'block':'none'};
const _sp=stopGame;stopGame=function(){mopen(false);$('#stopb').style.display='none';if(mus){clearInterval(mus.t);try{mus.c.close()}catch(e){}mus=null}_sp()};
})();
;

/* ===== 28-patch.js ===== */
(function(){
const G=$('#game'),E=d=>d*Math.PI/180,PRT=/^(Part|Cylinder|Ball)$/;
const NEWC={Tool:'🔧',Part:'🧱',Cylinder:'🛢',Ball:'🔴',WeldConstraint:'🔗',Motor6D:'⚙️'};
Object.assign(CL,NEWC);
Object.assign(CD,{Tool:'Alat yang bisa dipegang pemain (masuk Backpack)',Part:'Blok di dalam Tool',Cylinder:'Tabung di dalam Tool',Ball:'Bola di dalam Tool',WeldConstraint:'Menempelkan dua Part jadi satu',Motor6D:'Sendi: Part1 ikut Part0, bisa berputar'});
PL.StarterPack=['Tool','LocalScript'];PL.Workspace=['Script','Tool'];PL.ServerStorage=['Script','ModuleScript','Folder','Tool'];
const TD={Tool:{gx:0,gy:0,gz:0,gp:90,px:0,py:3,pz:8},Part:{ox:0,oy:0,oz:0,rx:0,ry:0,rz:0,sx:1,sy:1,sz:1,c:'#b0b0b0'},WeldConstraint:{w0:'',w1:''},Motor6D:{w0:'',w1:'',ax:'y',spd:0,a0:0,a1:0,a2:0,a3:0,a4:0,a5:0,b0:0,b1:0,b2:0,b3:0,b4:0,b5:0}};
TD.Cylinder=TD.Ball=TD.Part;
const _ni=newI;newI=function(c){const i=_ni(c);if(TD[c])Object.assign(i,JSON.parse(JSON.stringify(TD[c])));return i};
const mkL=a=>a.map(v=>({id:v,k:'inst',n:v,ic:CL[v],d:CD[v]}));
const _pk=pickL;pickL=function(t){if(!PL[t]){const r=loc(t);if(r){const c=r.i.cls;if(c=='Tool')return mkL(['Part','Cylinder','Ball','WeldConstraint','Motor6D','Script','LocalScript']);if(PRT.test(c))return mkL(['WeldConstraint','Motor6D'])}}return _pk(t)};
const par=i=>{for(const k in ST.d.svc){const p=findPar(ST.d.svc[k],i);if(p)return p}return null};
const toolOf=i=>{let p=par(i);while(p&&p.cls!='Tool')p=par(p);return p};
const parts=t=>{const o=[],w=a=>a.forEach(c=>{if(PRT.test(c.cls))o.push(c);w(c.ch)});w(t.ch);return o};
const _pn=act.pins;act.pins=function(v,t){const tg=($('#cpick')||{dataset:{}}).dataset.t;_pn(v,t);if(t.dataset.k!='inst')return;const r=SI&&loc(SI);if(!r)return;const i=r.i,tl=toolOf(i)||(i.cls=='Tool'?i:null),pa=tg&&(loc(tg)||{}).i;
 if(PRT.test(i.cls)&&tl){const ps=parts(tl);if(!ps.some(x=>x!==i&&x.n=='Handle')){i.n='Handle';i.sx=.6;i.sy=3;i.sz=.6;i.c='#8b5a2b'}else{i.oy=(ps.length-1)*1.1;i.c=['#ff5a5a','#5ab0ff','#ffd24d','#6edc7a'][ps.length%4]}}
 if((i.cls=='WeldConstraint'||i.cls=='Motor6D')&&tl){const ps=parts(tl);i.w0=pa&&PRT.test(pa.cls)?pa.id:(ps[0]&&ps[0].id)||'';const o=ps.find(x=>x.id!=i.w0);i.w1=o?o.id:''}
 eRender();pRender()};
const _ip=iProps;iProps=function(i){if(!NEWC[i.cls])return _ip(i);const tl=toolOf(i),
 v3=(l,ks)=>`<label>${l}</label><div class="g3">${ks.map(k=>`<input type="number" step=".1" data-q="${k}" value="${+i[k]||0}">`).join('')}</div>`,
 sel=(k,l)=>`<label>${l}</label><select data-q="${k}"><option value="">(kosong)</option>${(tl?parts(tl):[]).map(p=>`<option value="${p.id}" ${i[k]==p.id?'selected':''}>${esc(p.n)}</option>`).join('')}</select>`;
 let h=`<h4>${CL[i.cls]} ${i.cls}</h4><label>Nama</label><input type="text" data-q="n" value="${esc(i.n)}" maxlength="24">`;
 if(i.cls=='Tool')h+=v3('Grip offset (X, Y, Z)',['gx','gy','gz'])+`<label>Grip pitch (derajat, 90 = tegak)</label><input type="number" data-q="gp" value="${+i.gp}">`+v3('Posisi di dunia saat di Workspace (bisa dipungut)',['px','py','pz'])+'<div class="hint">Ketuk ＋ di Tool ini di Explorer untuk memasukkan Part, Weld, Motor6D, Script.</div>';
 if(PRT.test(i.cls))h+=v3('Posisi (X, Y, Z)',['ox','oy','oz'])+v3('Rotasi (derajat)',['rx','ry','rz'])+v3('Ukuran (X, Y, Z)',['sx','sy','sz'])+`<label>Warna</label><input type="color" data-q="c" value="${i.c||'#b0b0b0'}">`;
 if(i.cls=='WeldConstraint')h+=sel('w0','Part0')+sel('w1','Part1');
 if(i.cls=='Motor6D')h+=sel('w0','Part0')+sel('w1','Part1')+v3('C0 posisi',['a0','a1','a2'])+v3('C0 rotasi',['a3','a4','a5'])+v3('C1 posisi',['b0','b1','b2'])+v3('C1 rotasi',['b3','b4','b5'])+`<label>Sumbu putar</label><select data-q="ax">${['x','y','z'].map(a=>`<option ${i.ax==a?'selected':''}>${a}</option>`).join('')}</select><label>Kecepatan putar (derajat/detik)</label><input type="number" data-q="spd" value="${+i.spd||0}">`;
 return h+`<div style="display:flex;gap:6px;margin-top:8px"><button class="btn sm c" data-a="idup">⧉ Duplikat</button><button class="btn sm o" data-a="idel" data-v="${i.id}">Hapus</button></div>`};
/* ---- bangun model Tool (dipakai Studio & game) ---- */
function tbuild(tool){const root=new THREE.Group(),out=new THREE.Group(),map={},ps=parts(tool),mot=[];out.add(root);
 ps.forEach(p=>{const g=new THREE.Group();g.position.set(+p.ox||0,+p.oy||0,+p.oz||0);g.rotation.set(E(p.rx||0),E(p.ry||0),E(p.rz||0));
  const geo=p.cls=='Cylinder'?new THREE.CylinderGeometry(.5,.5,1,18):p.cls=='Ball'?new THREE.SphereGeometry(.5,14,10):new THREE.BoxGeometry(1,1,1),m=new THREE.Mesh(geo,mat(p.c||'#b0b0b0'));
  m.scale.set(+p.sx||1,+p.sy||1,+p.sz||1);if(p.cls!='Ball')m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo),EL));g.add(m);root.add(g);map[p.id]=g});
 const h=ps.find(p=>p.n=='Handle')||ps[0];if(h)root.position.set(-(+h.ox||0),-(+h.oy||0),-(+h.oz||0));
 const cs=[],w=a=>a.forEach(c=>{if(c.cls=='WeldConstraint'||c.cls=='Motor6D')cs.push(c);w(c.ch)});w(tool.ch);
 cs.forEach(c=>{const a=map[c.w0],b=map[c.w1];if(!a||!b||a===b)return;for(let q=a;q;q=q.parent)if(q===b)return;
  if(c.cls=='WeldConstraint'){out.updateMatrixWorld(true);a.attach(b);return}
  const pv=new THREE.Group(),sp=new THREE.Group();pv.position.set(+c.a0||0,+c.a1||0,+c.a2||0);pv.rotation.set(E(c.a3||0),E(c.a4||0),E(c.a5||0));a.add(pv);pv.add(sp);
  const m1=new THREE.Matrix4().compose(new THREE.Vector3(+c.b0||0,+c.b1||0,+c.b2||0),new THREE.Quaternion().setFromEuler(new THREE.Euler(E(c.b3||0),E(c.b4||0),E(c.b5||0))),new THREE.Vector3(1,1,1)).invert();
  m1.decompose(b.position,b.quaternion,b.scale);sp.add(b);mot.push({s:sp,ax:c.ax||'y',spd:+c.spd||0})});
 return{g:out,mot}}
const tspin=(mot,dt)=>mot.forEach(m=>{m.s.rotation[m.ax]+=E(m.spd)*dt});
/* ---- pratinjau di viewport Studio ---- */
let TVG=null;function tvBuild(){try{if(TVG&&TVG.parent)TVG.parent.remove(TVG);TVG=null;if(!SS||!ST||ST.kind!='g'||!ST.d.svc)return;const g=new THREE.Group(),ws=ST.d.svc.Workspace||[],r=SI&&loc(SI),sel=r&&(r.i.cls=='Tool'?r.i:toolOf(r.i));
 ws.filter(x=>x.cls=='Tool').forEach(t=>{const b=tbuild(t);b.g.position.set(+t.px||0,+t.py||0,+t.pz||0);g.add(b.g)});
 if(sel&&!ws.includes(sel)){const b=tbuild(sel);b.g.position.set(0,3,0);g.add(b.g)}SS.add(g);TVG=g}catch(e){}}
const _er=eRender;eRender=function(){_er();tvBuild()};
const _sb=sBuild;sBuild=function(){_sb();tvBuild()};
/* ---- impor proyek: pertahankan properti Tool ---- */
const NK=['ox','oy','oz','rx','ry','rz','sx','sy','sz','gx','gy','gz','gp','px','py','pz','spd'].concat([0,1,2,3,4,5].map(n=>'a'+n),[0,1,2,3,4,5].map(n=>'b'+n));
const _cs=cleanSvc;cleanSvc=function(s){const o=_cs(s);try{const idm={},w=(a,b)=>{if(!Array.isArray(a)||!Array.isArray(b)||a.length!=b.length)return;a.forEach((x,j)=>{const y=b[j];if(!x||!y)return;idm[x.id]=y.id;if(NEWC[y.cls]){NK.forEach(k=>{if(x[k]!=null&&isFinite(+x[k]))y[k]=Math.max(-1e3,Math.min(1e3,+x[k]))});if(/^#[0-9a-f]{6}$/i.test(x.c))y.c=x.c;if(['x','y','z'].includes(x.ax))y.ax=x.ax;y.w0=x.w0;y.w1=x.w1}w(x.ch,y.ch)})};
 SKEYS.forEach(k=>w(s&&s[k],o[k]));const f=a=>a.forEach(y=>{if(NEWC[y.cls]){y.w0=idm[y.w0]||'';y.w1=idm[y.w1]||''}f(y.ch)});SKEYS.forEach(k=>f(o[k]))}catch(e){}return o};
/* ---- Luau: Tool.Activated / Equipped / Unequipped ---- */
const _iw=iW;iW=function(i){if(i.cls!='Tool')return _iw(i);if(RT.iw.has(i.id))return RT.iw.get(i.id);const w=new FW(i.n,()=>i.ch.map(iW),{Activated:new Sig(),Equipped:new Sig(),Unequipped:new Sig()});w.i=i;RT.iw.set(i.id,w);return w};
const _tx=tbxRender;tbxRender=function(){_tx();const e=$('#tbx');if(!e)return;const h=e.innerHTML,k=h.indexOf('<h4>Template');if(k<0)return;let t='';if(ST&&ST.kind=='g'){const T=window.SPX.TBL;t='<h4>Toolbox</h4>'+Object.keys(T).map(c=>`<div class="hint" style="margin:6px 0 2px">${c}</div>`+T[c].map(x=>`<button class="btn sm w" data-a="rb" data-v="tb:${c}:${esc(x.n)}">${x.ic||''} ${esc(x.n)}</button>`).join('')).join('')}e.innerHTML=h.slice(0,k)+t};
if(ST)tbxRender();
/* ---- game: hotbar, backpack, pegang Tool ---- */
G.insertAdjacentHTML('beforeend','<div id="hotbar"></div><div id="bpk"><div style="display:flex;justify-content:space-between;font:700 20px Arial"><span>Backpack</span><span data-a="bpx" style="cursor:pointer">✕</span></div><div class="gr"></div></div><button id="toolact" data-a="toolact">⚡</button><div id="fps"></div>');
window.__tbuild=tbuild;let TL=[],EQ=-1,held=null,hmot=[],SW0=-9e9,PK=[];const HB=$('#hotbar'),BP=$('#bpk');
function hbDraw(){const s=(t,n)=>`<div class="hb ${n==EQ?'eq':''}" data-a="tsel" data-v="${n}"><i>${n+1}</i>${esc(t.i.n)}</div>`;HB.innerHTML=TL.map(s).join('')+(TL.length?'<div class="hb" data-a="bpt">🎒</div>':'');HB.classList.toggle('on',TL.length>0);BP.querySelector('.gr').innerHTML=TL.map(s).join('')}
function unequip(){if(EQ>=0&&TL[EQ])try{TL[EQ].w.x.Unequipped.fire()}catch(e){}if(held&&held.parent)held.parent.remove(held);held=null;hmot=[];EQ=-1;window.__heldTool=null;window.__heldMesh=null;try{lastSent=''}catch(e){}$('#toolact').style.display='none'}
function equip(n){const same=EQ==n;unequip();if(!same&&TL[n]&&plr){const t=TL[n].i,b=tbuild(t);b.g.rotation.x=E(isFinite(+t.gp)?+t.gp:90);b.g.position.set(+t.gx||0,-.95+(+t.gy||0),+t.gz||0);plr.a[1].add(b.g);held=b.g;hmot=b.mot;EQ=n;window.__heldTool=String(t.id);window.__heldMesh=b.g;try{lastSent=''}catch(e){}$('#toolact').style.display=t.ch.some(c=>/Script$/.test(c.cls))?'grid':'none';try{TL[n].w.x.Equipped.fire()}catch(e){}}hbDraw()}
Object.assign(act,{tsel(v){equip(+v)},bpt(){BP.classList.toggle('on')},bpx(){BP.classList.remove('on')},toolact(){if(EQ<0)return;SW0=performance.now();try{TL[EQ].w.x.Activated.fire()}catch(e){}}});
const hasH=i=>parts(i).length>0;const _tsg=startGame;startGame=function(g,t){_tsg(g,t);unequip();TL=[];PK.forEach(p=>p.m.parent&&p.m.parent.remove(p.m));PK=[];BP.classList.remove('on');
 try{const sv=g.svc||{},add=i=>{if(i.cls!='Tool')return;if(!hasH(i))return;if(TL.some(x=>x.i.id===i.id))return;const w=iW(i);TL.push({i,w});i.ch.forEach(c=>{if(/Script$/.test(c.cls))runScript(c,w)})};
  (sv.StarterPack||[]).forEach(i=>{add(i);if(i.cls=='Folder')i.ch.forEach(add)});
  (sv.Workspace||[]).filter(i=>i.cls=='Tool').forEach(i=>{const b=tbuild(i);b.g.position.set(+i.px||0,+i.py||0,+i.pz||0);scene.add(b.g);PK.push({i,m:b.g,mot:b.mot})})}catch(e){OUT('err',e.message)}hbDraw()};
const _tst=stopGame;stopGame=function(){unequip();TL=[];PK=[];hbDraw();BP.classList.remove('on');_tst()};
let fc=0,ft=performance.now();const _trt=rtTick;rtTick=function(){_trt();if(!plr||!P)return;const now=performance.now(),dt=.016;
 if(held){const s=(now-SW0)/320;window.__armPose=-1.45+(s<1?-Math.sin(s*Math.PI)*.9:0);plr.a[1].rotation.x=window.__armPose;tspin(hmot,dt)}else window.__armPose=null;
 for(let k=PK.length-1;k>=0;k--){const p=PK[k];p.m.rotation.y+=.02;tspin(p.mot,dt);if(Math.hypot(P.x-p.m.position.x,P.z-p.m.position.z)<2.2&&Math.abs(P.y+1-p.m.position.y)<4){scene.remove(p.m);PK.splice(k,1);if(TL.some(x=>x.i.id===p.i.id)){toast('Sudah punya: '+p.i.n);continue}const w=iW(p.i);TL.push({i:p.i,w});p.i.ch.forEach(c=>{if(/Script$/.test(c.cls))runScript(c,w)});hbDraw();toast('Dipungut: '+p.i.n)}}
 fc++;if(now-ft>500){const e=$('#fps');if(e.style.display=='block')e.textContent=Math.round(fc*1000/(now-ft))+' FPS';fc=0;ft=now}};
window.addEventListener('keydown',e=>{if(!run||(document.activeElement&&document.activeElement.tagName=='INPUT'))return;if(/^[1-9]$/.test(e.key)&&TL[+e.key-1])equip(+e.key-1)});
/* ---- UI ala Roblox: tombol mic, menu pause, roda emote, papan peringkat ---- */
const mb=$('#topl .rpill button:last-child');if(mb){mb.dataset.a='mic';mb.innerHTML='<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/><path d="M4 4l16 16" stroke="#ff4040"/></svg><i id="camb" style="display:none"></i>'}
act.mic=()=>toast('Chat suara tidak tersedia');
G.insertAdjacentHTML('beforeend','<div id="pm"><div class="pmb"><div class="pmt"></div><div class="pmc"></div></div></div><div id="lbp"><div class="pmb"><div style="display:flex;justify-content:space-between;padding:14px 18px;font:700 20px Arial"><span data-a="lbx" style="cursor:pointer">✕</span><span>Papan Peringkat</span><span></span></div><div class="pmc"></div></div></div><div id="ew"><div id="ewc"><div id="ewm">Pilih Emote</div></div></div>');
const PM=$('#pm'),TABS=[['user','Pengguna'],['set','Pengaturan'],['gal','Galeri'],['rep','Laporkan'],['help','Bantuan']];let pmt='user',rpt='Pemain',rpOpen=0;
const row=(l,k,v)=>`<div class="pr"><span>${l}</span><div class="pa"><b data-a="pmset" data-v="${k}:-1">‹</b><span>${v}</span><b data-a="pmset" data-v="${k}:1">›</b></div></div>`,QL={'.6':'Rendah','1':'Sedang','2':'Tinggi'},SHL={normal:'Normal',bright:'Cerah',cine:'Sinematik',retro:'Retro',bw:'Hitam Putih'};
function pmDraw(){PM.querySelector('.pmt').innerHTML=TABS.map(t=>`<b class="${t[0]==pmt?'on':''}" data-a="pmtab" data-v="${t[0]}">${t[1]}</b>`).join('');const c=PM.querySelector('.pmc'),g=gf();let h='';
 if(pmt=='user'){const names=[me.name].concat(Object.values(remote).map(o=>o.name));h=`<div class="pbr"><button class="pbtn" data-a="leave">Keluar</button><button class="pbtn" data-a="respawn">Respawn</button><button class="pbtn bl" data-a="resume">Lanjutkan</button></div><div class="pbr"><button class="pbtn" data-a="pminv">Undang Teman</button><button class="pbtn" data-a="chl">${S.nochat?'Tampilkan':'Bunyikan'} Chat</button></div><div class="ph">Di server ini</div><div style="display:flex;gap:10px;flex-wrap:wrap">${names.map(n=>`<div style="background:#2a2c31;border-radius:8px;padding:10px;text-align:center;min-width:90px;font-size:12px">${n==me.name?circ(me.av,56):'<div style="height:56px;font-size:34px">🙂</div>'}<br>${esc(n)}</div>`).join('')}</div>`}
 if(pmt=='set')h=`<div class="ph">Tampilan &amp; Grafik</div>${row('Layar Penuh','fs',document.fullscreenElement?'Nyala':'Mati')}${row('Statistik Performa','fps',$('#fps').style.display=='block'?'Nyala':'Mati')}${row('Kualitas Grafik','q',QL[g.q]||'Tinggi')}${row('Shader','sh',SHL[g.sh]||'Normal')}${row('Kabut','fog',g.fog=='0'?'Mati':'Nyala')}<div class="ph">Tampilan &amp; Kendali</div>${row('Sensitivitas Kamera','sens',S.sens)}${row('Mode Kamera','cam',camMode=='first'?'Orang pertama':'Orang ketiga')}<div class="ph">Chat</div>${row('Log Chat','chl',S.nochat?'Sembunyi':'Tampil')}`;
 if(pmt=='gal')h='<div class="pbr"><button class="pbtn" data-a="pmshot">📷 Ambil Tangkapan Layar</button></div>';
 if(pmt=='rep')h=rpOpen?`<label>Jenis</label><select id="rp_t"><option ${rpt=='Pemain'?'selected':''}>Pemain</option><option ${rpt=='Map'?'selected':''}>Map</option><option>Bug</option></select><label>Nama pemain / map</label><input type="text" id="rp_g" maxlength="30"><label>Alasan</label><input type="text" id="rp_x" maxlength="120"><button class="pbtn bl" style="width:100%" data-a="rsend">Kirim Laporan</button>`:`<div class="ph">Apa yang ingin kamu laporkan?</div>${[['Chat suara','Pemain'],['Chat teks','Pemain'],['Seseorang sedang bermain','Pemain'],['Game atau pengalaman virtual','Map']].map(r=>`<div class="pr" style="cursor:pointer;font-size:16px" data-a="rpk" data-v="${r[1]}"><span>${r[0]}</span><span>›</span></div>`).join('')}`;
 if(pmt=='help')h='<b>Kontrol</b><br>WASD / joystick: gerak · Spasi / tombol panah: lompat<br>C: ganti kamera · Enter: chat · Esc: menu · 1-9: pilih Tool<br><br>Map: '+esc(curG?curG.name:'-');c.innerHTML=h}
act.pause=function(){paused=true;pmt='user';rpOpen=0;PM.classList.add('on');pmDraw()};
const _rs=act.resume;act.resume=function(){_rs();PM.classList.remove('on')};
Object.assign(act,{pmtab(v){pmt=v;rpOpen=0;pmDraw()},rpk(v){rpt=v;rpOpen=1;pmDraw()},pminv(){const u=location.href;try{navigator.clipboard.writeText(u);toast('Tautan disalin')}catch(e){toast(u)}},pmshot(){act.gma('media')},
 pmset(v){const[k,d]=v.split(':'),n=+d,g=gf(),sv=()=>{S.gfx=g;save();gfxApply()},cyc=(a,x)=>a[(a.indexOf(x)+n+a.length)%a.length];
  if(k=='fs'){try{document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen()}catch(e){}setTimeout(pmDraw,250);return}
  if(k=='fps'){const e=$('#fps');e.style.display=e.style.display=='block'?'none':'block'}
  if(k=='q'){g.q=cyc(['.6','1','2'],g.q);sv()}if(k=='sh'){g.sh=cyc(Object.keys(SHL),g.sh);sv()}if(k=='fog'){g.fog=g.fog=='0'?'1':'0';sv()}
  if(k=='sens'){S.sens=Math.max(1,Math.min(10,(+S.sens||5)+n));save()}if(k=='cam')act.cam();if(k=='chl')act.chl();pmDraw()}});
const _chl=act.chl;act.chl=function(){_chl();if(PM.classList.contains('on'))pmDraw()};
const _mt=act.mt;act.mt=function(v){if(v=='rep'){pmt='rep';rpOpen=0;pmDraw()}else if(v=='play'){act.resume();const names=[[me.name,got]].concat(Object.values(remote).map(o=>[o.name,'-']));$('#lbp .pmc').innerHTML=`<div class="pr" style="color:#fff9"><span>Pengguna</span></div>${names.map(n=>`<div class="pr"><span>${esc(n[0])}</span></div>`).join('')}`;$('#lbp').classList.add('on')}else _mt(v)};
act.lbx=()=>$('#lbp').classList.remove('on');
const EW=$('#ew'),EMS=[['Lambai','wave'],['Dansa','dance'],['Loncat','jump']];
$('#ewc').insertAdjacentHTML('beforeend',[0,1,2,3,4,5,6,7].map(k=>{const a=E(-90+k*45),e=EMS[k];return`<div class="sl ${e?'e':''}" style="left:${50+39*Math.cos(a)}%;top:${50+39*Math.sin(a)}%" ${e?`data-a="ewp" data-v="${e[1]}"`:''}>${e?e[0]:k+1}</div>`}).join(''));
EW.addEventListener('pointerdown',e=>{if(e.target===EW)EW.classList.remove('on')});PM.addEventListener('pointerdown',e=>{if(e.target===PM)act.resume()});act.ewp=v=>{EW.classList.remove('on');act.gma(v)};
const _gm=act.gma;act.gma=function(v,t){if(v=='emote'){act.gmn();EW.classList.add('on');return}_gm(v,t)};
const _sg2=startGame;startGame=function(g,t){_sg2(g,t);PM.classList.remove('on');EW.classList.remove('on');$('#lbp').classList.remove('on')};
})();
;

/* ===== 29-patch.js ===== */
(function(){
const SK=c=>({Script:'ServerScriptService',LocalScript:'StarterPlayerScripts',ModuleScript:'ReplicatedStorage',Tool:'StarterPack',ScreenGui:'StarterGui',Team:'Teams'})[c]||'Workspace';
const cl=x=>JSON.parse(JSON.stringify(x));
const reid=(x,m)=>{const o=x.id;x.id=nid();m[o]=x.id;(x.ch||[]).forEach(c=>reid(c,m))};
const remap=(x,m)=>{if(x.w0)x.w0=m[x.w0]||x.w0;if(x.w1)x.w1=m[x.w1]||x.w1;(x.ch||[]).forEach(c=>remap(c,m))};
const inEd=()=>{const e=$('#ed');return e&&e.classList.contains('on')&&ST};
/* ---------- Salin / Potong / Tempel ---------- */
function copy1(){if(!inEd())return false;const r=SI&&loc(SI);if(r){ls.set('sp_clip',{t:'inst',d:cl(r.i)});return true}const o=cur();if(o){ls.set('sp_clip',{t:'obj',d:cl(o)});return true}toast('Pilih objek dulu');return false}
function paste1(){if(!inEd())return;const c=ls.get('sp_clip',null);if(!c||!c.d)return toast('Clipboard kosong — Salin objek dulu');ensureSvc(ST.d);
 if(c.t=='obj'){if(ST.kind!='g'&&!ST.d.objs)return;pushUndo();const o=cl(c.d);o.id=nid();o.x=Math.round(((+o.x||0)+1)*100)/100;o.z=Math.round(((+o.z||0)+1)*100)/100;ST.d.objs.push(o);SEL=o.id;SI=null;sBuild();eRender();pRender();touch();toast('Ditempel: '+(o.n||'objek'));return}
 if(ST.kind!='g')return toast('Tempel instance hanya di game');const x=cl(c.d),m={};reid(x,m);remap(x,m);x.n=String(x.n||x.cls).slice(0,22);
 const r=SI&&loc(SI);let list;if(r&&pickL(r.i.id).some(p=>p.k=='inst'&&p.id==x.cls)){list=r.i.ch;XP[r.i.id]=1}else{const k=SK(x.cls);list=ST.d.svc[k];XP[k]=1}
 list.push(x);afterIns(x);toast('Ditempel: '+x.n)}
Object.assign(act,{cpy(){if(copy1())toast('Disalin')},cut(){if(copy1()){const r=SI&&loc(SI);if(r)act.idel(SI);else act.edel(SEL);toast('Dipotong')}},pst:paste1});
window.addEventListener('keydown',e=>{if(!(e.ctrlKey||e.metaKey)||!inEd())return;const a=document.activeElement;if(a&&/INPUT|TEXTAREA|SELECT/.test(a.tagName))return;const k=e.key.toLowerCase();if(k=='c'){e.preventDefault();act.cpy()}else if(k=='x'){e.preventDefault();act.cut()}else if(k=='v'){e.preventDefault();paste1()}});
const addM=(n,it)=>document.querySelectorAll('#rmenu .mn').forEach(m=>{if(m.querySelector('b').textContent==n)m.querySelector('.dd').insertAdjacentHTML('beforeend',it.map(x=>`<button data-a="${x[1]}">${x[0]}</button>`).join(''))});
addM('File',[['Publish Model…','mpubm'],['Publish Suara…','mpubs']]);addM('Edit',[['Salin (Ctrl+C)','cpy'],['Potong (Ctrl+X)','cut'],['Tempel (Ctrl+V)','pst']]);addM('View',[['Toko Model','stoopen']]);
const _t2=tbxRender;tbxRender=function(){_t2();const e=$('#tbx');if(e&&ST&&ST.kind=='g'&&!guiOn)e.insertAdjacentHTML('afterbegin','<button class="btn sm w v" data-a="stoopen">🛒 Toko Model</button><label style="margin:6px 0 0">Insert Model by ID</label><div style="display:flex;gap:4px;margin:4px 0 8px"><input type="text" id="mid" inputmode="numeric" placeholder="Tempel ID model" style="margin:0"><button class="btn sm g" data-a="midget">Insert</button></div>')};
if(ST){eRender();tbxRender()}
/* ---------- data model ---------- */
const MDL=()=>{const a=ls.get('sp_models',[]);return Array.isArray(a)?a:[]};
const MD=()=>{const l=MDL(),ids=new Set(l.map(m=>String(m.id))),r=(window.spRMD||[]).filter(m=>!ids.has(String(m.id)));return l.concat(r).filter(m=>!window.tkBlk(m.kind=='sound'?'snd':'mdl',m.by,m.id)).filter(m=>!m.rv||m.rv.s=='approved'||(me&&m.by==me.name)).sort((x,y)=>(y.t||0)-(x.t||0))};
function mSave(a){try{localStorage.setItem('sp_models',JSON.stringify(a))}catch(e){toast('Penyimpanan penuh, hapus model lama');return false}ls.set('sp_models',a);return true}
const newId=()=>{let i;do{i=String(Math.floor(1e9+Math.random()*9e9))}while(MD().some(m=>m.id==i));return i};
function siteImg(name){const s=String(name||'model'),h=[...s].reduce((a,c)=>(a*31+c.charCodeAt(0))>>>0,7),C=['#7df9ff','#ffde59','#ff90e8','#b6f25a','#a78bfa'];let L='';
 for(let i=0;i<9;i++){const w=40+((h>>>i)*37%130),x=22+(i%3)*14;L+=`<rect x="${x}" y="${50+i*15}" width="${w}" height="7" rx="3" fill="${C[(h+i)%5]}" opacity=".9"/>`}
 const t=s.replace(/[^a-zA-Z0-9]/g,'').slice(0,14)||'model';
 return'data:image/svg+xml;utf8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 200"><rect width="240" height="200" rx="10" fill="#1e2230"/><rect width="240" height="28" rx="10" fill="#2b3144"/><circle cx="14" cy="14" r="4" fill="#ff5f57"/><circle cx="26" cy="14" r="4" fill="#febc2e"/><circle cx="38" cy="14" r="4" fill="#28c840"/><rect x="54" y="7" width="170" height="14" rx="7" fill="#161a26"/><text x="62" y="17.5" font-size="8" fill="#9aa4bf" font-family="monospace">sandbox://model/${t}</text>${L}</svg>`)}
const thumbOf=m=>m.thumb||siteImg(m.name);
function imgFile(f,cb){if(!f||!/^image\//.test(f.type))return toast('Pilih file gambar');const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const k=Math.min(1,320/Math.max(im.width,im.height,1)),c=document.createElement('canvas');c.width=Math.max(1,im.width*k|0);c.height=Math.max(1,im.height*k|0);c.getContext('2d').drawImage(im,0,0,c.width,c.height);cb(c.toDataURL('image/jpeg',.8))};im.onerror=()=>toast('Gambar tidak valid');im.src=r.result};r.readAsDataURL(f)}
function pickFile(acc,cb){const i=document.createElement('input');i.type='file';i.accept=acc;i.style.display='none';i.onchange=()=>{const f=i.files&&i.files[0];i.remove();if(f)cb(f)};document.body.appendChild(i);i.click()}
function copyT(t,msg){const ok=()=>toast(msg),fb=()=>{const a=document.createElement('textarea');a.value=t;a.style.cssText='position:fixed;opacity:0';document.body.appendChild(a);a.select();try{document.execCommand('copy');ok()}catch(e){toast(t)}a.remove()};try{navigator.clipboard.writeText(t).then(ok,fb)}catch(e){fb()}}
/* ---------- dialog publish ---------- */
document.body.insertAdjacentHTML('beforeend','<div id="mpm"><div class="bx"></div></div><div id="sto"></div>');
const MP=$('#mpm');let PD=null;
function pdDraw(){const d=PD,s=d.kind=='sound';MP.querySelector('.bx').innerHTML=`<h3 style="margin:0 0 8px">${s?'Publish Suara':'Publish Model'}</h3><label>Nama</label><input type="text" id="pd_n" maxlength="40" value="${esc(d.name)}"><label>Deskripsi</label><input type="text" id="pd_d" maxlength="160" value="${esc(d.desc)}"><label>Harga SandBux (0 = gratis)</label><input type="text" inputmode="numeric" id="pd_p" value="${esc(d.price||0)}">
 ${s?`<label>File audio</label><div class="row"><button class="btn sm" data-a="pdaud">🎵 Pilih audio</button><span>${d.snd?esc(d.sname)+' ('+Math.round(d.snd.length*.75/1024)+' KB)':'belum dipilih'}</span></div>`:`<label>Isi model</label><select id="pd_s"><option value="sel" ${d.src=='sel'?'selected':''}>Objek terpilih</option><option value="all" ${d.src=='all'?'selected':''}>Semua isi Workspace</option></select>`}
 <label>Gambar (opsional)</label><div class="row"><img src="${d.thumb||siteImg(d.name||'model')}"><div style="display:flex;flex-direction:column;gap:6px"><button class="btn sm" data-a="pdgal">🖼 Galeri</button><button class="btn sm" data-a="pdfil">📁 File lain</button><button class="btn sm o" data-a="pdnoimg">Tanpa gambar</button></div></div>
 <div style="font-size:12px;font-weight:400;color:#666">Tanpa gambar, thumbnail otomatis berupa tampilan website/script.</div><label>API key (izin universe-model: tulis)</label><input type="password" id="pd_k" autocomplete="off" placeholder="spk_..." value="${esc(d.key||'')}"><div class="row" style="margin-bottom:4px"><button class="btn sm" data-a="pdmykey">Pakai key kreatorku</button><span style="font-size:12px;font-weight:400;color:#666">Key ada di Kreator Hub → Layanan API</span></div><div class="row" style="margin-top:12px"><button class="btn g" style="flex:1" data-a="pdgo">Publish</button><button class="btn o" data-a="pdx">Batal</button></div>`}
function pdOpen(kind){if(!me)return;if(kind=='model'&&!inEd())return toast('Buka Studio dulu');const r=ST&&SI&&loc(SI),o=ST&&cur&&cur();PD={kind,name:kind=='sound'?'':(r?r.i.n:o?(o.n||''):(ST?ST.d.name:'')),desc:'',price:0,src:(r||o)?'sel':'all',thumb:null,snd:null,sname:'',key:String(ls.get('sp_mpk','')||'')};pdDraw();MP.classList.add('on')}
MP.addEventListener('input',e=>{if(!PD)return;if(e.target.id=='pd_n')PD.name=e.target.value;if(e.target.id=='pd_d')PD.desc=e.target.value;if(e.target.id=='pd_p')PD.price=e.target.value.replace(/\D/g,'').slice(0,4);if(e.target.id=='pd_k')PD.key=e.target.value});
MP.addEventListener('change',e=>{if(PD&&e.target.id=='pd_s')PD.src=e.target.value});
MP.addEventListener('pointerdown',e=>{if(e.target===MP){MP.classList.remove('on');PD=null}});
function collect(src){const d=ST.d;let objs=[],svc={};if(src=='sel'){const r=SI&&loc(SI);if(r)svc[SK(r.i.cls)]=[cl(r.i)];else{const o=cur();if(o)objs=[cl(o)]}}else{objs=cl(d.objs||[]);const w=(d.svc&&d.svc.Workspace)||[];if(w.length)svc.Workspace=cl(w)}return{objs,svc}}
Object.assign(act,{mpubm(){pdOpen('model')},mpubs(){pdOpen('sound')},pdx(){MP.classList.remove('on');PD=null},pdmykey(){if(PD){if(!me.apiKey){me.apiKey=genKey();save()}PD.key=me.apiKey;pdDraw()}},
 pdgal(){pickFile('image/*',f=>imgFile(f,u=>{PD.thumb=u;pdDraw()}))},pdfil(){pickFile('*/*',f=>imgFile(f,u=>{PD.thumb=u;pdDraw()}))},pdnoimg(){PD.thumb=null;pdDraw()},
 pdaud(){pickFile('audio/*',f=>{if(!/^audio\//.test(f.type))return toast('Pilih file audio');if(f.size>1.2e6)return toast('Audio maks 1,2 MB');const r=new FileReader();r.onload=()=>{PD.snd=r.result;PD.sname=f.name;if(!PD.name)PD.name=f.name.replace(/\.[^.]+$/,'').slice(0,40);pdDraw()};r.readAsDataURL(f)})},
 pdgo(){const d=PD;if(!d)return;const name=(d.name||'').trim();if(!name)return toast('Isi nama dulu');const ke=keyChk(d.key,'universe-model','w');if(ke)return toast(ke);const a=MDL(),rec={id:newId(),kind:d.kind,name,desc:(d.desc||'').trim(),by:me.name,t:Date.now(),thumb:d.thumb||null,price:Math.max(0,Math.min(9999,Math.floor(+d.price||0)))};
  if(d.kind=='sound'){if(!d.snd)return toast('Pilih file audio dulu');rec.snd=d.snd}else{if(!inEd())return;const dt=collect(d.src);if(!dt.objs.length&&!Object.keys(dt.svc).length)return toast('Tidak ada isi untuk dipublish');rec.data=dt;if(JSON.stringify(dt).length>6e5)return toast('Model terlalu besar')}
  RV.stamp(rec,d.kind=='sound'?'snd':'mdl');a.unshift(rec);if(!mSave(a))return;try{ls.set('sp_mpk',String(d.key).trim())}catch(e){}MP.classList.remove('on');PD=null;copyT(rec.id,rec.rv&&rec.rv.s=='pending'?'Dikirim ke admin untuk dicek ⏳ ID '+rec.id:'Dipublish! ID '+rec.id+' disalin');ST2.tab=rec.kind;stOpen(rec.id)}});
/* ---------- Toko Model ---------- */
const SO=$('#sto');let ST2={tab:'model',q:'',id:null,menu:0};
function stOpen(id){ST2.id=id||null;ST2.menu=0;SO.classList.add('on');stDraw()}
function stDraw(){const a=MD();if(ST2.id){const m=a.find(x=>x.id==ST2.id);if(!m){ST2.id=null;return stDraw()}const snd=m.kind=='sound';
  SO.innerHTML=`<div class="sth"><b data-a="stback">‹</b>${snd?'Info Suara':'Info Model'}</div><div class="sti"><img src="${thumbOf(m)}"><h2>${esc(m.name)}</h2><div style="font-weight:400;color:#555">oleh ${esc(m.by)} · ${new Date(m.t).toLocaleDateString('id-ID')}</div>${snd?`<audio controls src="${m.snd}" style="width:100%;margin-top:10px"></audio>`:''}<div class="sta"><button class="stget" data-a="stget" data-v="${m.id}">${snd?'Get Suara':'Get Model'}${m.price>0&&m.by!=me.name&&!(me.mbought||[]).includes(String(m.id))?' · '+m.price+' SandBux':''}</button><button class="stdt" data-a="stdots">⋯</button>${ST2.menu?`<div class="stm"><button data-a="stcid" data-v="${m.id}">Salin ID</button><button data-a="stcurl" data-v="${m.id}">Salin URL</button>${m.by==me.name?`<button data-a="stdel" data-v="${m.id}" style="color:#d00">Hapus</button>`:''}</div>`:''}</div><div style="font-weight:400">${esc(m.desc||'Tidak ada deskripsi.')}</div><div style="margin-top:12px;display:flex;align-items:center;gap:8px"><span style="color:#666;font-size:13px">ID: <b>${m.id}</b></span><button class="btn sm" data-a="stcid" data-v="${m.id}">Salin ID</button></div></div>`;return}
 const q=ST2.q.trim().toLowerCase(),L=a.filter(m=>(ST2.tab=='mine'?m.by==me.name:m.kind==ST2.tab)&&(!q||m.name.toLowerCase().includes(q)||String(m.id).includes(q)||String(m.by||'').toLowerCase().includes(q)||String(m.desc||'').toLowerCase().includes(q)));
 SO.innerHTML=`<div class="sth"><b data-a="stx">✕</b>Toko Model</div><div class="stt">${[['model','Model'],['sound','Suara'],['mine','Milikku']].map(t=>`<span class="${ST2.tab==t[0]?'on':''}" data-a="sttab" data-v="${t[0]}">${t[1]}</span>`).join('')}</div><input type="text" id="stq" placeholder="Cari nama, pembuat, atau ID" value="${esc(ST2.q)}"><div class="stg">${L.map(m=>`<div class="stc" data-a="stopen" data-v="${m.id}"><img src="${thumbOf(m)}"><div>${m.kind=='sound'?'🎵 ':''}${esc(m.name)}<small>${esc(m.by)}${m.price>0?' · '+m.price+' SB':''}</small><small>ID ${m.id}</small>${m.rv&&m.rv.s!='approved'?'<small>'+(m.rv.s=='pending'?'⏳ menunggu review':m.rv.s=='rejected'?'❌ ditolak: '+esc(m.rv.note||''):'⛔ '+(m.rv.s=='off'?'off sale':'diblokir')+': '+esc(m.rv.note||''))+'</small>':''}</div></div>`).join('')||'<div style="grid-column:1/-1;padding:30px;text-align:center;font-weight:400;color:#666">'+(window.spMLoading?'Memuat model dari pemain lain…':q?'Tidak ada hasil untuk “'+esc(ST2.q)+'”':'Belum ada yang dipublish. Di Studio: File → Publish Model / Publish Suara.')+'</div>'}</div>`}
SO.addEventListener('input',e=>{if(e.target.id=='stq'){ST2.q=e.target.value;const p=e.target.selectionStart;stDraw();const n=$('#stq');n.focus();n.setSelectionRange(p,p)}});
function getM(id){const m=MD().find(x=>x.id==id);if(!m)return toast('ID tidak ditemukan');
 if(!ST||ST.kind!='g'||!inEd())return toast('Buka Studio (game) dulu, lalu tekan Get');ensureSvc(ST.d);
 if(!(window.spPayModel?spPayModel(m):true))return;
 if(m.kind=='sound'){const i=newI('Sound');i.n=m.name.slice(0,24);i.src=m.snd;i.vol=1;i.loop=false;ST.d.svc.Workspace.push(i);XP.Workspace=1;afterIns(i);toast('Suara ditambahkan: '+i.n);return}
 pushUndo();const ids={};let n=0;(m.data.objs||[]).forEach(o=>{const c=cl(o);c.id=nid();ST.d.objs.push(c);n++});
 const add=[];Object.keys(m.data.svc||{}).forEach(k=>{if(!ST.d.svc[k])return;(m.data.svc[k]||[]).forEach(x=>{const c=cl(x);reid(c,ids);ST.d.svc[k].push(c);add.push(c);XP[k]=1;n++})});add.forEach(x=>remap(x,ids));
 sBuild();eRender();pRender();touch();toast('Model ditambahkan: '+m.name);slog('Get Model '+m.id)}
Object.assign(act,{stoopen(){stOpen(null)},stx(){SO.classList.remove('on');ST2.id=null},stback(){ST2.id=null;ST2.menu=0;stDraw()},sttab(v){ST2.tab=v;stDraw()},stopen(v){stOpen(v)},stdots(){ST2.menu=ST2.menu?0:1;stDraw()},
 stget(v){getM(v)},midget(){const v=($('#mid')||{}).value;getM((v||'').trim())},
 stcid(v){ST2.menu=0;stDraw();copyT(v,'ID disalin')},stcurl(v){ST2.menu=0;stDraw();copyT(location.href.split('#')[0]+'#model='+v,'URL disalin')},
 stdel(v){const a=MDL().filter(m=>m.id!=v);mSave(a);ST2.id=null;ST2.menu=0;stDraw();toast('Dihapus')}});
window.spStoreRefresh=()=>{if(!SO.classList.contains('on')||ST2.id||document.activeElement.id==='stq')return;const a=SO.scrollTop,g0=SO.querySelector('.stg'),b=g0?g0.scrollTop:0;stDraw();SO.scrollTop=a;const g1=SO.querySelector('.stg');if(g1)g1.scrollTop=b;SO.querySelectorAll('*').forEach(e=>{e.style.animation='none'})};
document.addEventListener('click',e=>{if(ST2.menu&&SO.classList.contains('on')&&!e.target.closest('[data-a=stdots],.stm')){ST2.menu=0;stDraw()}});
const _df=drawerFill;drawerFill=function(){_df();const d=$('#dpn');if(d)d.insertAdjacentHTML('beforeend','<button class="dbtn" data-a="stoopen">🛒 Toko Model</button>')};
const hs=()=>{const m=/#model=(\d+)/.exec(location.hash||'');if(m&&me){ST2.tab='model';stOpen(m[1])}};window.addEventListener('hashchange',hs);setTimeout(hs,800);
/* ---------- Sound buatan sendiri di game ---------- */
let AU=[];const _iw2=iW;iW=function(i){if(i.cls=='Sound'&&/^data:audio\//.test(i.src||'')){if(RT.iw.has(i.id))return RT.iw.get(i.id);const a=new Audio(i.src);a.loop=!!i.loop;a.volume=Math.min(1,+i.vol||1);AU.push(a);
 const w=new FW(i.n,()=>[],{Play:()=>{a.currentTime=0;a.play().catch(()=>{})},Stop:()=>{a.pause();a.currentTime=0},Pause:()=>a.pause(),Resume:()=>{a.play().catch(()=>{})}});RT.iw.set(i.id,w);return w}return _iw2(i)};
const _sp3=stopGame;stopGame=function(){AU.forEach(a=>{try{a.pause()}catch(e){}});AU=[];_sp3()};
})();
;

/* ===== 30-marketplace-global.js ===== */
/* ===== MARKETPLACE GLOBAL: aksesori & model tampil di semua pemain, bisa dibeli, dipakai, dan terlihat pemain lain =====
   - Aksesori yang dipublish (Studio) dan Model/Suara yang dipublish (Toko Model) dikirim sebagai pesan "retained"
     ke broker MQTT publik (topik sandbox/v9/acc/<id> dan sandbox/v9/mdl/<id>), sama seperti katalog map.
   - HP lain subscribe ke topik itu -> item langsung muncul di Marketplace / Toko Model mereka.
   - Beli: SandBux pembeli berkurang, kreator di HP lain menerima SandBux lewat kotak masuk (event "sale").
   - Aksesori yang sedang dipakai ikut dikirim di presence room (Firebase) sehingga pemain lain melihatnya di avatar. */
(function(){
const BR=['wss://broker.emqx.io:8084/mqtt','wss://broker.hivemq.com:8884/mqtt','wss://test.mosquitto.org:8081'];
const PA='sandbox/v9/acc/',PM='sandbox/v9/mdl/',MAXB=700000;
const mq=()=>window.__spMq;
const lib=()=>mq()?mq().lib():Promise.resolve(0);
const hsh=t=>{let h=2166136261;for(let i=0;i<t.length;i++)h=Math.imul(h^t.charCodeAt(i),16777619);return(h>>>0).toString(36)+t.length};
const b64=u=>{let s='';for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(s)};
const unb64=t=>{const s=atob(t),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u};
const pipe=async(data,S)=>{const st=new S('gzip'),w=st.writable.getWriter();w.write(data);w.close();return new Uint8Array(await new Response(st.readable).arrayBuffer())};
const enc=async o=>{const j=JSON.stringify(o);if(window.CompressionStream){try{return 'z1:'+b64(await pipe(new TextEncoder().encode(j),CompressionStream))}catch(e){}}return 'j1:'+j};
const dec=async s=>{try{if(s.startsWith('x1:'))return{dead:1,ts:+s.slice(3)||0};if(s.startsWith('j1:'))return JSON.parse(s.slice(3));if(s.startsWith('z1:'))return JSON.parse(new TextDecoder().decode(await pipe(unb64(s.slice(3)),DecompressionStream)))}catch(e){}return null};
const shrink=(src,w,h,q)=>new Promise(res=>{if(!src)return res('');const im=new Image();im.onload=()=>{try{const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d'),r=Math.max(w/im.width,h/im.height),dw=im.width*r,dh=im.height*r;x.drawImage(im,(w-dw)/2,(h-dh)/2,dw,dh);res(c.toDataURL('image/jpeg',q))}catch(e){res('')}};im.onerror=()=>res('');im.src=src});
const hx=(c,f)=>/^#[0-9a-f]{6}$/i.test(c||'')?c:f;
const okI=u=>/^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+\/=]+$/.test(u||'')?u:'';
const num=(v,d,lo,hi)=>{v=+v;return isFinite(v)?Math.max(lo,Math.min(hi,v)):d};
const price=v=>Math.max(0,Math.min(9999,Math.floor(+v||0)));
const nm=(s,n)=>String(s==null?'':s).replace(/[\u0000-\u001f<>"&]/g,'').slice(0,n);
const BAD=/^(sandbox|owner|admin|coowner|co-owner)$/i;
const arr=v=>Array.isArray(v)?v:(v&&typeof v==='object'?Object.values(v):[]);
const toast_=m=>{try{toast(m)}catch(e){}};

/* ---- pembersih objek 3D (data dari HP lain tidak dipercaya) ---- */
const TY=['cyl','ball','part','box'];
function cleanObjs(a,max,noId){const out=[];for(const o of arr(a)){if(out.length>=max)break;if(!o||typeof o!=='object'||o.t==='coin')continue;
 const r={t:(TY.includes(o.t)||o.t==='grass'||o.t==='video'||o.t==='model')?o.t:'part',x:num(o.x,0,-60,60),y:num(o.y,0,-60,60),z:num(o.z,0,-60,60),sx:num(o.sx,1,.05,30),sy:num(o.sy,1,.05,30),sz:num(o.sz,1,.05,30),ry:num(o.ry,0,-720,720),rx:num(o.rx,0,-720,720),rz:num(o.rz,0,-720,720),c:hx(o.c,'#ffffff')};
 if(!noId)r.id='r'+Math.random().toString(36).slice(2,9);
 if(r.t==='model'){if(/^m[a-z0-9]{3,20}$/.test(String(o.mid)))r.mid=String(o.mid);else r.t='part'}
 if(typeof o.tex==='string'&&/^[a-z0-9_-]{1,24}$/i.test(o.tex))r.tex=o.tex;if(r.t==='grass'||r.t==='video')r.cc=false;if(o.t==='video'){if(typeof o.vurl==='string'&&/^https:\/\/[^\s]{4,300}$/i.test(o.vurl))r.vurl=o.vurl;if(typeof o.vid==='string'&&/^v_[a-z0-9]{1,24}$/i.test(o.vid))r.vid=o.vid;if(o.vmode==='efek')r.vmode='efek';r.vop=num(o.vop,1,.05,1)}out.push(r)}return out}

/* ---- pembersih item dari katalog ---- */
const FXT=['Fire','Smoke','Sparkles','ParticleEmitter','Explosion','PointLight'];
function cleanFx(l){const n=(v,a,b,d)=>{v=+v;return isFinite(v)?Math.max(a,Math.min(b,v)):d};return arr(l).slice(0,6).map(d=>{if(!d||FXT.indexOf(d.c)<0)return null;return{q:(Array.isArray(d.q)&&d.q.length===4)?d.q.map(v=>n(v,-30,30,0)):undefined,c:d.c,e:d.e===0?0:1,r:n(d.r,0,60,20),l:n(d.l,.05,6,1.5),s:n(d.s,0,30,3),z:n(d.z,.02,4,.5),a:n(d.a,0,180,30),g:n(d.g,-30,30,0),k:hx(d.k,'#ffffff'),b:n(d.b,0,20,1),n:n(d.n,1,40,16)}}).filter(Boolean)}
function cleanAcc(a){if(!a||typeof a!=='object')return null;const by=nm(a.by,20),id=String(a.id||'').replace(/[^\w-]/g,'').slice(0,24);if(!by||!id||BAD.test(by))return null;
 let objs=cleanObjs(a.objs,80);if(!objs.length)return null;
 const models={};try{Object.entries(a.models&&typeof a.models==='object'?a.models:{}).slice(0,3).forEach(([k,v])=>{if(/^m[a-z0-9]{3,20}$/.test(k)&&typeof v==='string'&&v.length<950000&&/^data:model\/gltf-binary;base64,[A-Za-z0-9+\/=]+$/.test(v))models[k]=v})}catch(e){}
 objs=objs.map(o=>{if(o.t==='model'&&!models[o.mid]){o.t='part';delete o.mid}return o});const hasM=Object.keys(models).length>0;
 return{key:'u_'+by+'_'+id,name:nm(a.name,22)||'Aksesoris',e:'',icon:okI(a.icon),price:price(a.price),by,objs,desc:nm(a.desc,140),slot:nm(a.slot,14)||'Kepala',rp:1,fx:cleanFx(a.fx),models:hasM?models:undefined}}
function cleanMdl(m,id){if(!m||typeof m!=='object')return null;const kind=m.kind==='sound'?'sound':'model';
 const r={id:String(m.id||id).replace(/[^\w-]/g,'').slice(0,24),kind,name:nm(m.name,40)||'Model',desc:nm(m.desc,160),by:nm(m.by,20),t:num(m.t,Date.now(),0,4e12),thumb:okI(m.thumb)||null,price:price(m.price),rp:1};
 if(!r.id||!r.by||BAD.test(r.by))return null;
 if(kind==='sound'){if(!/^data:audio\/[\w.+-]+;base64,[A-Za-z0-9+\/=]+$/.test(m.snd||''))return null;r.snd=m.snd}
 else{const d=m.data;if(!d||typeof d!=='object')return null;if(!Array.isArray(d.objs))d.objs=[];if(!d.svc||typeof d.svc!=='object')d.svc={};r.data=d}
 return r}

/* ---- state katalog ---- */
let RACC=[];window.spRMD=[];
try{const c=ls.get('sp_acccache',[]);if(Array.isArray(c))RACC=c.filter(x=>x&&x.key&&x.by&&Array.isArray(x.objs)).slice(0,150)}catch(e){}
const MDL=()=>{const a=ls.get('sp_models',[]);return Array.isArray(a)?a:[]};
const remoteItems=()=>RACC.filter(x=>x.by!==(me&&me.name)&&!banOf(users[x.by])).map(x=>Object.assign({},x,{v:!!(users[x.by]&&users[x.by].verified)}));

/* ---- Marketplace: gabungkan item online ---- */
const _mk=mkItems;
mkItems=function(){const a=_mk.apply(this,arguments),k=new Set(a.map(x=>x.key));return a.concat(remoteItems().filter(x=>!k.has(x.key))).filter(x=>{if(!x.by||!String(x.key).startsWith('u_'+x.by+'_'))return true;const id=x.key.slice(('u_'+x.by+'_').length);return !window.tkBlk('acc',x.by,id)||window.tkOff('acc',x.by,id)}).map(x=>{if(x.by&&String(x.key).startsWith('u_'+x.by+'_')&&window.tkOff('acc',x.by,x.key.slice(('u_'+x.by+'_').length)))x.lim=1;return x})};

/* ---- kirim (publish / unpublish) ---- */
let syncing=0;
async function sync(){if(syncing||typeof users==='undefined'||typeof me==='undefined'||!me)return;syncing=1;
 try{const sigs=ls.get('sp_mktsig',{}),cur={};
  Object.keys(users).forEach(un=>{const u=users[un];if(!u||u.rm||banOf(u))return;(u.items||[]).forEach(i=>{if(i&&(i.pub===true||(i.rv&&i.rv.s==='off'))&&!(i.rv&&i.rv.s&&i.rv.s!=='approved'&&i.rv.s!=='off')&&!i.src&&i.id&&Array.isArray(i.objs)&&i.objs.length)cur[PA+(hsh(un)+'_'+String(i.id).replace(/[^\w-]/g,''))]={k:'a',un,i}})});
  MDL().forEach(m=>{if(m&&m.id&&m.by&&(!m.rv||m.rv.s==='approved')&&!BAD.test(m.by)&&!banOf(users[m.by]))cur[PM+String(m.id).replace(/[^\w-]/g,'')]={k:'m',m}});
  const msgs=[],upd={};let nA=0,nM=0;
  for(const t in cur){const x=cur[t];let sg,build;
   if(x.k==='a'){const i=x.i,objs=cleanObjs(i.objs,80,1);sg=hsh(JSON.stringify([i.name,i.desc,i.price,i.icon,i.slot,objs,x.un,window.__fxOf?window.__fxOf(i):0]));
    build=async()=>{const ic=i.icon?await shrink(i.icon,96,96,.75):'';const ms={};objs.forEach(o=>{if(o.t==='model'&&i.models&&i.models[o.mid])ms[o.mid]=i.models[o.mid]});const a={id:i.id,name:i.name,desc:i.desc||'',icon:ic,by:x.un,price:price(i.price),slot:i.slot||'Kepala',objs,fx:(window.__fxOf?window.__fxOf(i):[])};if(Object.keys(ms).length){a.models=ms;try{const t=await enc({ts:Date.now(),a});if(t.length>MAXB)delete a.models}catch(e){delete a.models}}return{ts:Date.now(),a}}}
   else{const m=x.m;sg=hsh(JSON.stringify([m.name,m.desc,m.price,m.by,m.kind,m.thumb,m.kind==='sound'?m.snd:m.data]));
    build=async()=>{const d=Object.assign({},m);d.price=price(m.price);return{ts:Date.now(),m:d}}}
   const e=sigs[t];if(e&&e.s===sg&&Date.now()-e.t<216e5)continue;
   const body=await build();if(!body)continue;const p=await enc(body);
   if(p.length>MAXB){toast_('"'+(x.k==='a'?x.i.name:x.m.name)+'" terlalu besar untuk dibagikan online');upd[t]={s:sg,t:Date.now()};continue}
   msgs.push({t,p});upd[t]={s:sg,t:Date.now()};x.k==='a'?nA++:nM++}
  const gone=[];for(const t in sigs)if(!cur[t]){msgs.push({t,p:'x1:'+Date.now()});gone.push(t)}
  if(!msgs.length){if(Object.keys(upd).length){for(const t in upd)sigs[t]=upd[t];ls.set('sp_mktsig',sigs)}return}
  if(!(window.mqtt||await lib()))return;
  const ok=await mq().pushAll(msgs);
  if(ok){for(const t in upd)sigs[t]=upd[t];gone.forEach(t=>delete sigs[t]);ls.set('sp_mktsig',sigs);
   if(nA||nM)toast_('Dibagikan ke semua pemain ✓')}
  else if(nA||nM)toast_('Gagal membagikan item, akan dicoba lagi')
 }catch(e){}finally{syncing=0}}

/* ---- terima ---- */
function fetchAll(){return new Promise(async res=>{if(!(window.mqtt||await lib()))return res(null);const got={a:{},m:{}};let pend=BR.length,fin=0;
 const out=()=>{if(fin)return;fin=1;res(got)};
 BR.forEach(url=>{let done=0,m;const ps=[];const end=()=>{if(done)return;done=1;try{m.end(true)}catch(e){}Promise.all(ps).then(()=>{if(--pend===0)out()})};
  try{m=mqtt.connect(url,{clientId:'spm_'+Math.random().toString(16).slice(2,12),connectTimeout:6000,reconnectPeriod:0,clean:true})}catch(e){done=1;if(--pend===0)out();return}
  m.on('error',end);m.on('close',end);
  m.on('connect',()=>{m.subscribe([PA+'+',PM+'+'],{qos:0});setTimeout(end,4500)});
  m.on('message',(t,b)=>{const isA=t.startsWith(PA),id=t.slice((isA?PA:PM).length).replace(/[^\w-]/g,'');if(!id)return;
   ps.push(dec(b.toString()).then(d=>{const B=isA?got.a:got.m;if(d&&d.ts&&(!B[id]||d.ts>B[id].ts))B[id]=d}))});
  setTimeout(end,9000)});
 setTimeout(out,11000)})}
let fetching=0,lastPull=0,lastSig='';
async function pull(force){if(fetching||typeof me==='undefined'||!me)return;if(!force&&Date.now()-lastPull<8000)return;fetching=1;lastPull=Date.now();window.spMLoading=1;try{window.spStoreRefresh&&spStoreRefresh()}catch(e){}
 try{const got=await fetchAll();if(!got||(!Object.keys(got.a).length&&!Object.keys(got.m).length))return;
  const A=[],Mo=[];
  for(const id in got.a){const d=got.a[id];if(!d||d.dead||!d.a)continue;const x=cleanAcc(d.a);if(x){x._ts=d.ts;A.push(x)}}
  for(const id in got.m){const d=got.m[id];if(!d||d.dead||!d.m)continue;const x=cleanMdl(d.m,id);if(x){x._ts=d.ts;Mo.push(x)}}
  A.sort((a,b)=>b._ts-a._ts);Mo.sort((a,b)=>b.t-a.t);
  const sg=A.map(x=>x.key+':'+x._ts).join(',')+'|'+Mo.map(x=>x.id+':'+x._ts).join(',');if(sg===lastSig)return;lastSig=sg;
  RACC=A;window.spRMD=Mo;try{ls.set('sp_acccache',A.slice(0,150))}catch(e){}
  refresh()}catch(e){}finally{fetching=0;window.spMLoading=0;try{window.spStoreRefresh&&spStoreRefresh()}catch(e){}}}
function marketOpen(){try{return page==='avatar'&&typeof avt!=='undefined'&&avt==='mkt'}catch(e){return false}}
function storeOpen(){const s=document.getElementById('sto');return !!(s&&s.classList.contains('on'))}
function refresh(){try{if(window.spStoreRefresh)spStoreRefresh();
 const a=document.getElementById('app'),sh=document.getElementById('sh');
 if(!(a&&a.classList.contains('on')&&marketOpen()&&!(sh&&sh.classList.contains('on'))))return;
 /* update di tempat: hanya daftar item yang diganti, tanpa render ulang halaman (tidak ada getaran / scroll lompat) */
 const tmp=document.createElement('div');tmp.innerHTML=avP();const nw=tmp.querySelector('.ig'),cur=document.querySelector('#main .ig');
 if(!nw)return;
 if(cur){if(cur.innerHTML===nw.innerHTML)return;cur.innerHTML=nw.innerHTML}
 else{const sheet=document.querySelector('#main .sheet');if(!sheet)return;const em=[...sheet.children].find(c=>/Belum ada item/.test(c.textContent||'')&&!c.classList.contains('ban')&&!c.classList.contains('chips'));if(em)em.remove();sheet.appendChild(nw)}
 document.querySelectorAll('#main .ig .it').forEach(e=>{e.style.animation='none'})}catch(e){}}

/* ---- bayar kreator yang ada di HP lain (kotak masuk MQTT) ---- */
function payCreator(by,name,p){if(!p||!by||by===(me&&me.name))return;const cr=users[by];
 if(cr&&!cr.rm){cr.bux=(cr.bux||0)+p;try{nt(cr,me.name+' membeli "'+name+'" +'+p+' SandBux')}catch(e){}save();return}
 const ev={id:Math.random().toString(36).slice(2,10),to:by,from:me.name,t:'sale',x:JSON.stringify({n:name,p}),ts:Date.now()};
 try{window.spInboxPut&&spInboxPut(ev)}catch(e){}}
const _oe=window.__spOnEv;
window.__spOnEv=function(p){
 if(p&&p.t==='sale'&&typeof me!=='undefined'&&me&&p.to===me.name){
  me.seen=me.seen||[];if(me.seen.includes(p.id))return;me.seen.push(p.id);if(me.seen.length>200)me.seen.shift();
  let d={};try{d=JSON.parse(p.x||'{}')}catch(e){}const a=price(d&&d.p);
  if(a>0){me.bux=(me.bux||0)+a;try{notify(nm(p.from,20)+' membeli "'+nm(d.n,40)+'" +'+a+' SandBux')}catch(e){}}
  save();try{navRender()}catch(e){}return}
 return _oe?_oe.apply(this,arguments):undefined};

/* ---- beli aksesori online: bayar kreator + simpan ikon ---- */
const _b2=act.buy2;
act.buy2=function(k){const it=mkItems().find(x=>x.key===k),had=(me.items||[]).length;const r=_b2?_b2.apply(this,arguments):undefined;
 try{if(it&&(me.items||[]).length>had){const n=(me.items||[]).find(x=>x.src===k);if(n&&it.icon&&!n.icon)n.icon=it.icon;if(it.rp)payCreator(it.by,it.name,price(it.price));save()}}catch(e){}
 return r};

/* ---- beli model / suara (dipanggil dari Toko Model) ---- */
window.spPayModel=function(m){const p=price(m.price);if(!p||m.by===me.name)return true;
 me.mbought=me.mbought||[];const id=String(m.id);if(me.mbought.includes(id))return true;
 if(me.bux<p){toast_('SandBux tidak cukup · butuh '+p);return false}
 addBux(-p);me.mbought.push(id);if(me.mbought.length>500)me.mbought.shift();
 payCreator(m.by,m.name,p);save();try{notify('Membeli '+(m.kind==='sound'?'suara':'model')+' "'+m.name+'" -'+p+' SandBux')}catch(e){}return true};

/* ---- aksesori yang sedang dipakai ikut terkirim ke pemain lain ---- */
const r2=v=>Math.round((+v||0)*100)/100,CODE={cyl:'c',ball:'s'};
let _k='',_v=[];
window.spAcc=function(){try{const ids=((typeof forceAcc!=='undefined'&&forceAcc)||me.av.acc||[]).slice(0,4),items=me.items||[];
 const key=ids.map(id=>{const it=items.find(i=>i.id==id);return id+':'+(it&&it.objs?it.objs.length:0)+(it&&it.slot||'')}).join('|');if(key===_k)return _v;
 const out=[];let tot=0;ids.forEach(id=>{const it=items.find(i=>i.id==id);if(!it||!Array.isArray(it.objs))return;
  const rows=[];for(const o of cleanObjs(it.objs,60,1)){if(tot>=100)break;const r=[CODE[o.t]||'p',r2(o.x),r2(o.y),r2(o.z),r2(o.sx),r2(o.sy),r2(o.sz),Math.round(o.ry),o.c];const bd=it.slot==='Tubuh'||it.slot==='Avatar';if(bd){r.push(o.tex||'',String(o.n||'').slice(0,20))}else if(o.tex)r.push(o.tex);rows.push(r);tot++}
  if(rows.length){const e={i:String(id).slice(0,24),o:rows};if(it.slot==='Tubuh'||it.slot==='Avatar')e.b=1;else if(/^(Alat|Perlengkapan)$/.test(it.slot||''))e.h=1;out.push(e)}});
 _k=key;_v=out;return out}catch(e){return []}};
window.spApplyAcc=function(o,ac){const list=arr(ac).slice(0,4);const sig=list.length?JSON.stringify(list):'';if(o.acs===sig)return;o.acs=sig;
 if(o.ag){o.ag.parent&&o.ag.parent.remove(o.ag);o.ag=null}
 if(o.bl){o.bl.forEach(m=>m.parent&&m.parent.remove(m));o.bl=null}
 if(o.hid){o.hid.forEach(m=>m.visible=true);o.hid=null}
 if(!list.length)return;
 const grp=new THREE.Group();let n=0;const T={c:'cyl',s:'ball',p:'part'};
 if(list.some(a=>a&&a.b)){o.hid=[];o.g.traverse(m=>{if(m.isMesh&&m.visible){m.visible=false;o.hid.push(m)}});o.bl=[]}if(!o.bl)o.bl=[];
 const named=list.some(a=>a&&a.b&&arr(a.o).some(r=>window.__limbName&&window.__limbName(arr(r)[10])));
 list.forEach(a=>{const isB=!!(a&&a.b);arr(a&&a.o).forEach(r=>{const v=arr(r);if(n>=100||v.length<9)return;n++;
  const ob={t:T[v[0]]||'part',x:num(v[1],0,-60,60),y:num(v[2],0,-60,60),z:num(v[3],0,-60,60),sx:num(v[4],1,.05,30),sy:num(v[5],1,.05,30),sz:num(v[6],1,.05,30),ry:num(v[7],0,-720,720),c:hx(v[8],'#ffffff')};
  if(typeof v[9]==='string'&&/^[a-z0-9_-]{1,24}$/i.test(v[9]))ob.tex=v[9];
  try{const m=mkObj(ob);let p=null;
   if(isB){const nm=String(v[10]||'').toLowerCase(),L=o.g.l||[],A=o.g.a||[];
    p=window.__limbPick?window.__limbPick(nm,ob,A,L,named):null}else if(a&&a.h&&o.g.a)p=o.g.a[1];
   if(p){m.position.x-=p.position.x;m.position.y-=p.position.y;m.position.z-=p.position.z;p.add(m);o.bl.push(m)}else grp.add(m)}catch(e){}})});
 o.ag=grp;o.g.add(grp)};

/* ---- jadwal ---- */
setInterval(()=>{if(typeof me!=='undefined'&&me)sync()},10000);
setInterval(()=>{if(typeof me==='undefined'||!me||document.hidden)return;if(marketOpen()||storeOpen())pull()},3000);
setInterval(()=>{if(typeof me!=='undefined'&&me&&!document.hidden)pull()},40000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&typeof me!=='undefined'&&me){pull();sync()}});
const wrap=(k,f)=>{const o=act[k];act[k]=function(){const r=o?o.apply(this,arguments):undefined;try{f.apply(this,arguments)}catch(e){}return r}};
['pmgo','hpub','edpub','pdgo','stdel'].forEach(k=>wrap(k,()=>setTimeout(sync,500)));
wrap('stoopen',()=>pull(1));
/* Insert by ID: kalau model dibuat pemain lain & belum ada di HP ini, ambil dulu dari jaringan */
{const midOf=v=>{const m=String(v||'').match(/\d{6,}/);return m?m[0]:String(v||'').trim()},
 hasM=id=>MDL().some(m=>String(m.id)===id)||(window.spRMD||[]).some(m=>String(m.id)===id);
 async function ensureM(id){if(!id||hasM(id))return;toast_('Mencari model '+id+'…');
  for(let t=0;t<2&&!hasM(id);t++){let w=0;while(fetching&&w++<60)await new Promise(r=>setTimeout(r,250));await pull(1)}}
 const _mg=act.midget;act.midget=async function(){const i=document.getElementById('mid');if(!i)return;const id=midOf(i.value);i.value=id;await ensureM(id);return _mg.apply(this,arguments)};
 document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target&&e.target.id==='mid'){e.preventDefault();act.midget()}})}
const _en=enter;enter=function(){const r=_en.apply(this,arguments);setTimeout(()=>{pull(1);sync()},900);return r};
window.spMarketSync=()=>{sync();pull(1)};
if(typeof me!=='undefined'&&me)setTimeout(()=>{pull(1);sync()},1200);
})();
;

/* ===== 31-v9.js ===== */
/* ===== v9: Marketplace, Kustomisasi & Info Game — gaya terang ===== */
(function(){
const S=(p,s,f)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="${f||'none'}" stroke="${f?'none':'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const I={
 back:s=>S('<path d="M19 12H5M11 6l-6 6 6 6"/>',s||30),
 search:s=>S('<circle cx="11" cy="11" r="7.5"/><path d="M21 21l-4.6-4.6"/>',s||30),
 x:s=>S('<path d="M6 6l12 12M18 6L6 18"/>',s||28),
 undo:s=>S('<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 010 12h-3"/>',s||26),
 redo:s=>S('<path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 000 12h3"/>',s||26),
 filt:s=>S('<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2.2"/><circle cx="8" cy="17" r="2.2"/>',s||26),
 tag:s=>S('<path d="M12 2.5l8.2 3.3.1 8.5-6.1 6.1a2 2 0 01-2.8 0l-5.9-5.9a2 2 0 010-2.8z" fill="#335fff" stroke="none"/><circle cx="14.6" cy="9.4" r="1.4" fill="#fff" stroke="none"/>',s||30),
 pgear:s=>S('<circle cx="10" cy="6" r="3"/><path d="M4 20v-3a4 4 0 014-4h2"/><circle cx="17" cy="17" r="2.2"/><path d="M17 12.6v1.2M17 20.2v1.2M12.6 17h1.2M20.2 17h1.2"/>',s||26),
 plus:s=>S('<path d="M12 5v14M5 12h14"/>',s||34),
 chev:s=>S('<path d="M9 5l7 7-7 7"/>',s||18),
 ver:'<svg width="16" height="16" viewBox="0 0 24 24"><path fill="#2f6bff" d="M12 1l2.6 1.8 3.1-.2 1.2 2.9 2.7 1.6-.6 3.1 1.1 2.9-2 2.4-.2 3.1-3 .9-2.1 2.3L12 21.8l-2.8 1.3-2.1-2.3-3-.9-.2-3.1-2-2.4 1.1-2.9-.6-3.1 2.7-1.6 1.2-2.9 3.1.2z"/><path d="M8 12.3l2.6 2.6L16 9.5" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
 play:s=>S('<path d="M7 4.5v15l13-7.5z" fill="#fff" stroke="#fff" stroke-linejoin="round"/>',s||34),
 more:s=>S('<circle cx="12" cy="12" r="9.5"/><circle cx="7.5" cy="12" r=".9" fill="currentColor"/><circle cx="12" cy="12" r=".9" fill="currentColor"/><circle cx="16.5" cy="12" r=".9" fill="currentColor"/>',s||34),
 inv:s=>S('<rect x="4" y="3" width="8" height="8" rx="1.5"/><path d="M5 21v-2.5A3.5 3.5 0 018.5 15H11"/><path d="M15 15l6 3.5-6 3.5z" fill="currentColor"/>',s||34),
 up:s=>S('<path d="M7 10v11H3V10zM7 10l4-7a2.2 2.2 0 012 2.2V9h6a2 2 0 012 2.3l-1.2 7A2 2 0 0117.8 20H7"/>',s||22),
 dn:s=>S('<path d="M17 14V3h4v11zM17 14l-4 7a2.2 2.2 0 01-2-2.2V15H5a2 2 0 01-2-2.3l1.2-7A2 2 0 016.2 4H17"/>',s||22),
 grp:s=>S('<circle cx="9" cy="8" r="3.2"/><path d="M3 20v-1a5 5 0 015-5h2a5 5 0 015 5v1"/><circle cx="17" cy="9" r="2.4"/><path d="M17.5 14a4 4 0 013.5 4v1"/>',s||22),
 bell:s=>S('<path d="M6 17V11a6 6 0 0112 0v6l1.5 2h-15z"/><path d="M10 21h4"/>',s||22),
 star:s=>S('<path d="M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 17l-5.4 2.9 1.1-6.1L3.2 9.6l6.1-.8z"/>',s||22)
};
const hex=s=>(typeof ico=='function'?ico('hex',s):'');
const nf=n=>String(n).replace(/\B(?=(\d{3})+(?!\d))/g,'.');
const BGS={senja:['Latar Senja','linear-gradient(#ffd9a8,#ff8fa3)'],laut:['Latar Laut','linear-gradient(#c3ecff,#4aa8d8)'],malam:['Latar Malam','linear-gradient(#3a3f7a,#12142e)'],hutan:['Latar Hutan','linear-gradient(#d2f5bd,#3f9a58)']};
const EXTRA=[].concat(Object.keys(BGS).map(k=>({key:'bg_'+k,name:BGS[k][0],e:'',price:15,by:'Sandbox',v:1,objs:[],desc:'Latar Belakang',slot:'Latar Belakang',cloth:{bg:k}})),
 [['b_zamrud','Kulit Zamrud','#6fcf97'],['b_langit','Kulit Langit','#7ec8ff'],['b_ungu','Kulit Ungu','#c9a6ff']].map(c=>({key:c[0],name:c[1],e:'',price:30,by:'Sandbox',v:1,objs:[],desc:'Tubuh',slot:'Tubuh',cloth:{skin:c[2]}})));
const _mk9=mkItems;
mkItems=function(){const a=_mk9.apply(this,arguments),k=new Set(a.map(x=>x.key));return a.concat(EXTRA.filter(x=>!k.has(x.key)))};


const SLK=[['Kepala','Kepala'],['Wajah','Wajah'],['Leher','Leher'],['Belakang','Belakang'],['Pinggang','Pinggang'],['Bahu','Bahu'],['Depan','Depan'],['Alat','Perlengkapan']];
const NORM={Punggung:'Belakang',Badan:'Depan',Perlengkapan:'Alat'},OFSLOT={t_mahkota:'Kepala',t_kerucut:'Kepala',t_sayap:'Belakang',t_kacamata:'Wajah',t_jubah:'Belakang'};
const slotOf=i=>{const s=OFSLOT[i.src||i.key]||NORM[i.slot]||i.slot||'Kepala';return (SLK.some(x=>x[0]==s)||s=='Pakaian'||s=='Sepatu'||s=='Tubuh'||s=='Avatar')?s:'Kepala'};
const _mk10=mkItems;mkItems=function(){return _mk10.apply(this,arguments).map(it=>OFSLOT[it.key]?Object.assign({},it,{slot:OFSLOT[it.key]}):it)};
let cslot='Kepala',clslot='top';
const SI={Kepala:'<path d="M5 17c0-6 3-10 7-10s7 4 7 10zM3 17h18"/>',Wajah:'<circle cx="7" cy="14" r="3.5"/><circle cx="17" cy="14" r="3.5"/><path d="M10.5 14h3M3.5 14L5 7M20.5 14L19 7"/>',Leher:'<path d="M5 5c0 8 3 11 7 11s7-3 7-11"/><rect x="9.5" y="16" width="5" height="5" rx="1"/>',Belakang:'<path d="M12 3v14M9 17l3 4 3-4M8 7h8"/>',Pinggang:'<rect x="3" y="8" width="18" height="8" rx="3"/><rect x="9" y="10" width="6" height="4" rx="1"/>',Bahu:'<path d="M5 20V9c0-3 2-5 5-5l4 4 3-1c2 0 3 2 2 4l-3 9z"/>',Depan:'<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M8 8a4 4 0 018 0"/>',Alat:'<path d="M5 19L17 7l2 2L7 21zM15 5l2-2 4 4-2 2z"/>',top:'<path d="M8 4L3 8l3 4 2-1v9h8v-9l2 1 3-4-5-4a4 4 0 01-8 0z"/>',outer:'<path d="M9 4L4 8v12h16V8l-5-4-3 4zM12 8v12"/>',bottom:'<path d="M6 3h12l1 18h-6l-1-10-1 10H5z"/>',shoe:'<path d="M3 15l4-1 3-5 3 3 6 1c2 0 2 4 2 4H3z"/>'};
const sico=(k,s)=>`<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="#a9adb8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${SI[k]}</svg>`;
const slotBtn=(act2,key,label,sel,worn)=>`<button class="sl9 ${sel?'sel':''}" data-a="${act2}" data-v="${key}"><span class="sb9x">${worn?worn:sico(key,28)}${worn?'':'<b>+</b>'}</span><em>${label}</em></button>`;
const wornThumb=i=>{const im=okImg(i.icon),mm=im?'':window.modelThumb(i.objs,i.id);return im?`<img src="${im}" alt="">`:mm?`<img src="${mm}" alt="">`:`<span style="font-size:22px;font-weight:800;color:#555">${esc(String(i.name||'?').charAt(0).toUpperCase())}</span>`};
const clothCat=c=>c.bg?'bg':(c.shirt&&c.pants&&c.skin)?'pack':(c.skin&&!c.shirt&&!c.pants)?'body':'cloth';
const catOf=it=>{if(it.slot=='Tubuh')return 'body';if(it.slot=='Pakaian'||it.slot=='Sepatu')return 'cloth';if(it.cloth){const k=clothCat(it.cloth);return k=='pack'?'avatar':k}const s=it.slot||'';return s=='Avatar'?'avatar':s=='Latar Belakang'?'bg':s=='Tubuh'?'body':(s=='Baju'||s=='Celana')?'cloth':'acc'};
const MC=[['all','Semua'],['avatar','Avatar'],['bg','Latar Belakang'],['body','Tubuh'],['cloth','Pakaian'],['acc','Aksesori'],['anim','Animasi'],['mk','Makeup']];
const CC=[['av','Avatar'],['body','Tubuh'],['cloth','Pakaian'],['acc','Aksesori'],['bg','Latar Belakang'],['anim','Animasi'],['emo','Emoji'],['mk','Makeup']];
let mcat='all',msearch=false,msq='',bnx=false,big=false,hist=[],redo=[];
const own=it=>(me.items||[]).some(x=>x.src==it.key||'u_'+me.name+'_'+x.id==it.key);
const wearing=c=>c&&Object.keys(c).every(k=>me.av[k]==c[k]);

const MT_C=new Map();let MT_R=null;
function modelThumb(objs,key){
 try{
  if(!window.THREE||!Array.isArray(objs)||!objs.length)return '';
  key=String(key||'')+':'+JSON.stringify(objs).length;
  if(MT_C.has(key))return MT_C.get(key);
  let url='';
  try{
   if(!MT_R){MT_R=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});MT_R.setPixelRatio(1);MT_R.setSize(192,192)}
   const S=new THREE.Scene();S.add(new THREE.AmbientLight(0xffffff,.85));const L=new THREE.DirectionalLight(0xffffff,.7);L.position.set(4,8,7);S.add(L);
   const G=new THREE.Group();objs.slice(0,400).forEach(o=>{try{if(o&&o.t!='coin')G.add(mkObj(o))}catch(e){}});
   if(G.children.length){
    G.rotation.set(.25,-.7,0);S.add(G);G.updateMatrixWorld(true);
    const bb=new THREE.Box3().setFromObject(G);
    if(!bb.isEmpty()){
     const c=bb.getCenter(new THREE.Vector3()),sz=bb.getSize(new THREE.Vector3()),r=Math.max(sz.x,sz.y,sz.z,.5);
     const C=new THREE.PerspectiveCamera(30,1,.1,300),d=sz.length()/2*3.5;
     C.position.set(c.x,c.y+r*.1,c.z+d);C.lookAt(c);
     MT_R.render(S,C);url=MT_R.domElement.toDataURL('image/png')}}
  }catch(e){url=''}
  if(MT_C.size>150)MT_C.delete(MT_C.keys().next().value);
  MT_C.set(key,url);return url
 }catch(e){return ''}
}
window.modelThumb=modelThumb;
window.itemLim=function(i){try{if(!i)return 0;if(i.rv&&i.rv.s=='off')return 1;const k=i.src||('u_'+(i.by||'')+'_'+i.id),x=mkItems().find(z=>z.key==k);return x&&x.lim?1:0}catch(e){return 0}};
function thumb(it,u){const im=okImg(it.icon);if(im)return `<img src="${im}" alt="">`;const c=it.cloth;
 if(c&&c.bg&&BGS[c.bg])return `<i style="position:absolute;inset:0;background:${BGS[c.bg][1]}"></i>`;
 if(c)return avHTML(Object.assign({},me.av,{hat:'none',acc:[]},c),u);
 {const m=it.e?'':window.modelThumb(it.objs,it.key||it.id||it.name);if(m)return `<img src="${m}" alt="">`}
 return `<span style="font-size:38px;font-weight:800;color:#8a8fa0">${esc(it.e||String(it.name||'?').charAt(0).toUpperCase())}</span>`}
function mktCard(it){const o=own(it);return `<button class="c9" data-a="buy" data-v="${esc(it.key)}"><span class="th">${thumb(it,5)}${it.lim?'<span class="lu"><span class="la">LIMITED</span><span class="lb">U</span></span>':''}</span><strong>${esc(it.name)}</strong><small>${esc(it.by)}${(it.v||(window.spVerified&&window.spVerified(it.by)))?I.ver:''}</small><em>${o?'Dimiliki':it.lim?'Tidak dijual':hex(18)+' '+nf(+it.price||0)}</em></button>`}
function mktList(){const q=msq.trim().toLowerCase();
 return mkItems().filter(it=>!it.lim&&(mcat=='all'||catOf(it)==mcat)&&(mfil=='all'||(mfil=='off'?it.by=='Sandbox':it.by!='Sandbox'))&&(!q||String(it.name).toLowerCase().includes(q)||String(it.by).toLowerCase().includes(q)))}
function mktGrid(){const f=mktList();return f.length?f.map(mktCard).join(''):`<div class="em9">${msq?'Tidak ada item yang cocok.':'Belum ada item di kategori ini.'}</div>`}
function ownTile(i,u){const im=okImg(i.icon),on=i.cloth?wearing(i.cloth):(me.av.acc||[]).includes(i.id);
 const th=i.cloth?thumb({cloth:i.cloth,name:i.name,icon:i.icon},u):(im?`<img src="${im}" alt="">`:(window.modelThumb(i.objs,i.id)?`<img src="${window.modelThumb(i.objs,i.id)}" alt="">`:`<span style="font-size:34px;font-weight:800;color:#8a8fa0">${esc(String(i.name||'?').charAt(0).toUpperCase())}</span>`));
 return `<button class="c9 o9 ${on?'on':''}" data-a="${i.cloth?'acc':'wear'}" data-v="${esc(i.id)}"><span class="th">${th}${window.itemLim(i)?'<span class="lu"><span class="la">LIMITED</span><span class="lb">U</span></span>':''}${on&&!i.cloth?'<u class="lp9">Lepas</u>':''}</span><strong>${esc(i.name)}</strong></button>`}
function ownGrid(f){const a=(me.items||[]).filter(f);return a.length?`<div class="ig c4">${a.map(i=>ownTile(i,4)).join('')}</div>`:'<div class="h9s">Belum ada item. Beli di Marketplace.</div>'}
const swatches=(k,arr)=>`<div class="sw9w">${arr.map(c=>`<span class="sw9 ${me.av[k]==c?'sel':''}" style="background:${c}" data-a="av" data-k="${k}" data-v="${c}"></span>`).join('')}</div>`;
const sameAv=a=>{try{return JSON.stringify(a)==JSON.stringify(me.av)}catch(e){return false}};
function custBody(){
 if(ctab=='av'){const os=me.outfits||[];
  return `<div class="ig c4"><button class="c9 o9 add" data-a="oedit"><span class="th">${I.plus(36)}</span><strong>Tambah/Edit</strong></button>${os.map(o=>`<button class="c9 o9 ${sameAv(o.av)?'on':''}" data-a="outfit" data-v="${esc(o.id)}"><span class="th" style="${o.av&&o.av.bg&&BGS[o.av.bg]?'background:'+BGS[o.av.bg][1]:''}">${avHTML(Object.assign({acc:[]},o.av),4)}</span><strong>${esc(o.n)}</strong></button>`).join('')}</div>`}
 if(ctab=='body')return `<div class="h9s" style="margin-top:18px">Warna kulit</div>${swatches('skin',SKIN)}<div class="h9s">Model tubuh saya (bentuk)</div>`+ownGrid(i=>i.slot=='Tubuh'||(i.cloth&&clothCat(i.cloth)=='body'));

 if(ctab=='cloth'){const sl=[['top','Atasan'],['outer','Pakaian Luar'],['bottom','Bawahan'],['shoe','Sepatu']];
  let h=`<div class="slr">${sl.map(s=>slotBtn('clslot',s[0],s[1],clslot==s[0])).join('')}</div>`;
  if(clslot=='top')h+=`<div class="h9s" style="margin-top:18px">Warna baju</div>${swatches('shirt',SHIRT)}<div class="h9s">Item atasan &amp; paket saya</div>`+ownGrid(i=>i.cloth&&(i.cloth.shirt&&!i.cloth.pants||clothCat(i.cloth)=='pack'));
  else if(clslot=='bottom')h+=`<div class="h9s" style="margin-top:18px">Warna celana</div>${swatches('pants',PANTS)}<div class="h9s">Item bawahan saya</div>`+ownGrid(i=>i.cloth&&i.cloth.pants&&!i.cloth.shirt);
  else h+=`<div class="h9s" style="margin-top:18px">${clslot=='outer'?'Pakaian luar':'Sepatu'} saya</div>`+ownGrid(i=>!i.cloth&&i.slot==(clslot=='outer'?'Pakaian':'Sepatu'));
  return h}
 if(ctab=='acc'){const worn=s=>(me.items||[]).find(i=>!i.cloth&&(me.av.acc||[]).includes(i.id)&&slotOf(i)==s);
  const its=(me.items||[]).filter(i=>!i.cloth&&i.slot!='Tubuh'&&i.slot!='Avatar'&&i.slot!='Pakaian'&&i.slot!='Sepatu'&&slotOf(i)==cslot),lb=(SLK.find(x=>x[0]==cslot)||[])[1];
  return `<div class="slr">${SLK.map(s=>{const w=worn(s[0]);return slotBtn('cslot',s[0],s[1],cslot==s[0],w?wornThumb(w):'')}).join('')}<button class="sl9" data-a="accclr"><span class="sb9x"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#6b7080" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 11-2.6-5.9M20 4v5h-5"/></svg></span><em>Hapus</em></button></div>
  <div class="h9s" style="margin-top:6px;padding-top:12px">Topi &amp; aksesori dasar</div>${cslot=='Kepala'?`<div class="pl9w">${[['none','Polos'],['cap','Topi'],['crown','Mahkota']].map(x=>`<button class="pl9 ${me.av.hat==x[0]?'on':''}" data-a="av" data-k="hat" data-v="${x[0]}">${x[1]}</button>`).join('')}</div>`:'<div class="pl9w" style="color:#000;font-weight:500">—</div>'}
  <div class="h9s">Aksesori ${esc(lb||cslot)} saya</div>`+(its.length?`<div class="ig c4">${its.map(i=>ownTile(i,4)).join('')}</div>`:`<div class="em9" style="padding:20px 22px">Belum ada aksesori ${esc((lb||cslot).toLowerCase())}.<br>Beli di Marketplace atau buat di Studio.</div><button class="wide9" data-a="avt" data-v="mkt">Buka Marketplace</button>`)}
 if(ctab=='bg'){const a=(me.items||[]).filter(i=>i.cloth&&i.cloth.bg);return `<div class="ig c4" style="padding-top:18px!important"><button class="c9 o9 ${!me.av.bg?'on':''}" data-a="av" data-k="bg" data-v=""><span class="th" style="background:linear-gradient(#dcdce0,#f1f1f3)"></span><strong>Default</strong></button>${a.map(i=>ownTile(i,4)).join('')}</div>`+(a.length?'':'<div class="h9s">Beli latar belakang di Marketplace.</div>')}
 return `<div class="ig"><div class="em9">Belum ada item di kategori ini.</div></div>`}
function city(){return [[-3,24,70],[16,18,52],[30,26,84],[52,20,58],[68,24,76],[88,16,46]].map(b=>`<i style="left:${b[0]}%;width:${b[1]}%;height:${b[2]}%"></i>`).join('')}

avP=function(){const mkt=avt=='mkt',bg=me.av&&me.av.bg&&BGS[me.av.bg]?BGS[me.av.bg][1]:'';
 let h=`<div class="avx${big?' big':''}"><div class="city" style="${bg?'background:'+bg:''}">${bg?'':city()}</div><div class="stage v3" id="av3s"></div>
 <div class="tb"><button class="rb9" data-a="go" data-v="home" aria-label="Kembali">${I.back(30)}</button><div class="sg9"><button class="${mkt?'on':''}" data-a="avt" data-v="mkt">Marketplace</button><button class="${mkt?'':'on'}" data-a="avt" data-v="cust">Kustomisasi</button></div><button class="rb9" data-a="msearch" aria-label="Cari" style="${mkt?'':'visibility:hidden'}">${I.search(30)}</button></div>
 <div class="lp glass"><span class="circ" style="--s:42px">${avHTML(me.av,4.2)}</span><button data-a="av2" aria-label="Edit avatar">${I.pgear(26)}</button></div>
 <div class="cp glass" data-a="shop" role="button">${hex(24)}<span>${nf(me.bux)}</span></div>
 <div class="ur9 glass"><button class="${hist.length?'on':''}" data-a="avundo" aria-label="Urungkan">${I.undo(26)}</button><button class="${redo.length?'on':''}" data-a="avredo" aria-label="Ulangi">${I.redo(26)}</button></div>
 <div class="sheet"><div class="sh9h"><button class="gb9" data-a="bigx" aria-label="Perbesar"><i class="grab"></i></button>`;
 if(mkt){
  if(!bnx)h+=`<div class="bn9">${I.tag(30)}<span>Kamu punya <b>${nf(me.bux)}</b> SandBux. Item kreator muncul setelah dipublish.</span><button data-a="bnx" aria-label="Tutup">${I.x(22)}</button></div>`;
  if(msearch)h+=`<div class="sb9">${I.search(22)}<input id="mq" type="text" placeholder="Cari item" value="${esc(msq)}" autocomplete="off" maxlength="30"><button data-a="msearch" aria-label="Tutup pencarian">${I.x(22)}</button></div>`;
  h+=`<div class="tw9"><div class="tabs9">${MC.map(c=>`<button class="t9 ${mcat==c[0]?'on':''}" data-a="mcat" data-v="${c[0]}">${c[1]}</button>`).join('')}</div><button class="fb9" data-a="mfilt" aria-label="Filter">${I.filt(26)}</button></div></div>`;
  h+=`<h3 class="h9">${mcat=='all'?'Direkomendasikan Untukmu':esc(MC.find(c=>c[0]==mcat)[1])}</h3><div class="ig">${mktGrid()}</div>`;
 }else{
  h+=`<div class="tw9"><div class="tabs9">${CC.map(c=>`<button class="t9 ${ctab==c[0]?'on':''}" data-a="ct" data-v="${c[0]}">${c[1]}</button>`).join('')}</div></div></div>${custBody()}`;
 }
 return h+'</div></div>'};

/* ---- aksi ---- */
const snap=()=>{try{hist.push(JSON.stringify(me.av));if(hist.length>30)hist.shift();redo=[]}catch(e){}};
['av','acc'].forEach(k=>{const o=act[k];act[k]=function(){snap();return o.apply(this,arguments)}});
const setAv=s=>{me.av=JSON.parse(s);save();render()};
Object.assign(act,{
 cslot(v){cslot=v;render()},clslot(v){clslot=v;render()},
 wear(v){const it=(me.items||[]).find(x=>x.id==v);if(!it)return;snap();let a=me.av.acc=me.av.acc||[];const i=a.indexOf(v);
  if(i>-1){a.splice(i,1);toast(it.name+' dilepas')}else{const sl=slotOf(it),keep=new Set((me.items||[]).filter(x=>!x.cloth&&slotOf(x)==sl).map(x=>x.id));me.av.acc=a=a.filter(id=>!keep.has(id));a.push(v);toast(it.name+' dipakai')}
  save();render()},
 accclr(){snap();me.av.acc=[];me.av.hat='none';save();toast('Semua aksesori dilepas');render()},
 mcat(v){mcat=v;render()},
 msearch(){msearch=!msearch;if(!msearch)msq='';render();if(msearch){const e=document.getElementById('mq');if(e)e.focus()}},
 bnx(){bnx=true;render()},
 bigx(){big=!big;const a=document.querySelector('.avx');if(a)a.classList.toggle('big',big)},
 mfilt(){shOpen(`<div class="shn" style="margin-top:6px">Filter</div>${[['all','Semua item'],['off','Resmi (Sandbox)'],['cr','Buatan kreator']].map(x=>`<button class="sb ${mfil==x[0]?'pr':''}" data-a="mf2" data-v="${x[0]}">${x[1]}</button>`).join('')}<button class="sb ln" data-a="shx">Tutup</button>`)},
 mf2(v){mfil=v;shClose();render()},
 av2(){avt='cust';ctab='av';render()},
 avundo(){if(!hist.length)return;redo.push(JSON.stringify(me.av));setAv(hist.pop())},
 avredo(){if(!redo.length)return;hist.push(JSON.stringify(me.av));setAv(redo.pop())},
 oedit(){const os=me.outfits||[];shOpen(`<div class="shn" style="margin-top:6px">Avatar Saya</div><input class="shin" id="on9" type="text" maxlength="14" placeholder="Nama avatar" autocomplete="off"><button class="sb pr" data-a="osave">Simpan avatar saat ini</button>${os.length?`<div class="pvm" style="margin-top:16px">Tersimpan</div>`+os.map(o=>`<div style="display:flex;align-items:center;gap:12px;padding:8px 2px"><b style="flex:1;font-weight:600">${esc(o.n)}</b><button class="sb" style="width:auto;margin:0;padding:10px 16px;font-size:15px" data-a="odel" data-v="${esc(o.id)}">Hapus</button></div>`).join(''):''}<button class="sb ln" data-a="shx">Tutup</button>`)},
 osave(){const os=me.outfits=me.outfits||[];if(os.length>=24)return toast('Maksimal 24 avatar tersimpan');const e=document.getElementById('on9'),n=((e&&e.value)||'').trim().slice(0,14)||('avatar '+(os.length+1));os.push({id:Math.random().toString(36).slice(2,9),n,av:JSON.parse(JSON.stringify(me.av))});save();shClose();toast('Avatar "'+n+'" disimpan');render()},
 odel(v){me.outfits=(me.outfits||[]).filter(o=>o.id!=v);save();act.oedit();render()},
 outfit(v){const o=(me.outfits||[]).find(x=>x.id==v);if(!o)return;snap();me.av=JSON.parse(JSON.stringify(o.av));save();toast('Memakai "'+o.n+'"');render()}
});
document.addEventListener('input',e=>{if(e.target.id!='mq')return;msq=e.target.value;const g=document.querySelector('.avx .ig');if(g)g.innerHTML=mktGrid()});

/* ---- info game ---- */
const fd=t=>{const d=new Date(t);return(!t||isNaN(d))?'—':d.toLocaleDateString('en-US')};
gameOv=function(id){const g=allGames().find(x=>x.id==id);
 if(!g)return `<div class="gx2"><div class="gx2t"><button class="gx2x" data-a="ovb" aria-label="Tutup">${I.x(30)}</button></div><div class="gx2e">Game tidak ditemukan.</div></div>`;
 const t=okImg(g.thumb),ic=okImg(g.icon),c1=hexc(g.col,'#b6f25a'),c2=hexc(g.sky,'#7df9ff'),grad=`linear-gradient(135deg,${c1},${c2})`,
 lk=(me.lk||{})[g.id]||0,fav=(me.favs||[]).includes(g.id),nt=(me.nots||{})[g.id],pf=playingFriends(g.id),by=g.by||'Sandbox',bu=users[by],
 vis=(ls.get('sp_vis',{})[g.id]||0)+(g.pl||1)*1300,L=String(g.emoji||String(g.name||'?').charAt(0).toUpperCase()),
 ds=String(g.desc||('Selamat datang di '+g.name+'! Lompati platform dan capai garis finish bersama teman.')),
 row=(a,b,cl)=>`<div class="ir9"><span>${a}</span><b>${b}</b></div>`;
 return `<div class="gx2"><div class="gx2t"><button class="gx2x" data-a="ovb" aria-label="Tutup">${I.x(30)}</button></div>
 <div class="gx2b"><i class="gx2g"></i>
 <div class="gh9"><span class="gi9" style="background:${ic?`url(${ic})`:grad}">${ic?'':esc(L)}</span><div><h1>${esc(g.name)}</h1><p>${esc(by)}${bu?vb(bu):(window.spVb?spVb(by):'')}</p><small>Kedewasaan: Minimal • Semua usia</small></div></div>
 <div class="gs9" style="background:${t?`url(${t})`:grad}">${t?'':esc(L)}</div>
 <div class="gc9"><span class="ch9 sp"><button class="${lk==1?'on':''}" data-a="glike" data-v="${esc(g.id)}">${I.up(22)} ${g.lk>0?(+g.lk)+'%':'Baru'}</button><hr><button class="${lk==-1?'on':''}" data-a="gdis" data-v="${esc(g.id)}" aria-label="Tidak suka">${I.dn(22)}</button></span><span class="ch9">${I.grp(22)} ${fmtN((g.pl||1)+pf.length)} aktif</span><button class="ch9 ${nt?'on':''}" data-a="gnot" data-v="${esc(g.id)}">${I.bell(22)} Notifikasi</button><button class="ch9 ${fav?'on':''}" data-a="gfav" data-v="${esc(g.id)}">${I.star(22)} Favorit</button></div>
 ${pf.length?`<button class="pb9" data-a="gfrp" data-v="${esc(g.id)}" style="cursor:pointer"><span class="stk">${pf.slice(0,3).map(n=>circ(pinfo(n).av,34)).join('')}</span><span>Dimainkan oleh <b>${esc(pf[0])}</b>${pf.length>1?' dan <b>'+(pf.length-1)+' teman lainnya</b>':''}</span></button>`:''}
 <h3>Deskripsi</h3><p class="ds9${ds.length>120?' cl':''}" id="ds9">${esc(ds)}</p>${ds.length>120?`<button class="mo9" data-a="gmore">lebih banyak</button>`:''}
 <h3>Informasi</h3>
 ${row('Kunjungan',nf(vis))}${row('Kedewasaan Konten','Minimal')}
 ${bu?`<button class="ir9" data-a="prof" data-v="${esc(by)}"><span>Pengembang</span><b>${esc(by)}${vb(bu)}${I.chev(18)}</b></button>`:row('Pengembang',esc(by)+(window.spVb?spVb(by):''))}
 ${row('Ukuran Server','8')}${row('Genre',g.mine?'Buatan Pemain':'Obby')}${row('Dibuat',fd(g.t||g.ts||g.created||g.at))}${row('Di-update',fd(g.upd||g.u||g.ut||g.ts||g.t||Date.now()))}${row('Chat Suara','Didukung')}${row('Kamera','Didukung')}
 <button class="ir9" data-a="srv" data-v="${esc(g.id)}"><span>Server</span><b>Lihat ${I.chev(18)}</b></button>
 </div><div class="bar9"><button class="sm9" data-a="gmenu" aria-label="Opsi">${I.more(36)}</button><button class="sm9" data-a="srv" data-v="${esc(g.id)}" aria-label="Server">${I.inv(34)}</button><button class="pp9" data-a="play" data-v="${esc(g.id)}" aria-label="Main">${I.play(34)}</button></div></div>`};
act.gmore=function(){const d=document.getElementById('ds9'),b=document.querySelector('.gx2 .mo9');if(!d)return;const c=d.classList.toggle('cl');if(b)b.textContent=c?'lebih banyak':'lebih sedikit'};

/* ---- tema terang untuk sheet & overlay ---- */
function syncLt(){const o=document.getElementById('ov'),lt=!!(o&&o.querySelector('.gx2'));if(o)o.classList.toggle('lt',lt);document.body.classList.toggle('lt9',lt||(typeof page!='undefined'&&page=='avatar'))}
const _ov9=ovRender;ovRender=function(){const r=_ov9.apply(this,arguments);syncLt();return r};
const _rn9=render;render=function(){const r=_rn9.apply(this,arguments);syncLt();return r};
if(me&&document.getElementById('app').classList.contains('on')){try{render()}catch(e){}}
})();
;

/* ===== 32-v10.js ===== */
/* ===== v10: map hanya baseplate kosong, slot aksesori, model Tubuh, part bulat ===== */
(function(){
const P=(n,t,x,y,z,sx,sy,sz,c)=>{const o=O(t,x,y,z,sx,sy,sz,c);o.n=n;return o};
const SKN='#ffd7b5';
const TPL={
 pakaian:{n:'Pakaian',e:'',slot:'Pakaian',f:()=>[P('Baju','part',0,1.4,0,1.14,1.06,.72,'#ff5a5a'),P('LenganKiri','part',-.75,1.62,0,.58,.6,.58,'#ff5a5a'),P('LenganKanan','part',.75,1.62,0,.58,.6,.58,'#ff5a5a')]},
 sepatu:{n:'Sepatu',e:'',slot:'Sepatu',f:()=>[P('SepatuKiri','part',-.25,.12,.05,.56,.26,.66,'#2b2b33'),P('SepatuKanan','part',.25,.12,.05,.56,.26,.66,'#2b2b33')]},
 bahu:{n:'Aksesoris Bahu',e:'',slot:'Bahu',f:()=>[P('BahuKiri','ball',-.78,1.95,0,.62,.4,.62,'#c9ccd6'),P('BahuKanan','ball',.78,1.95,0,.62,.4,.62,'#c9ccd6')]},
 kepala:{n:'Aksesoris Kepala',e:'',slot:'Kepala',f:()=>[P('TopiBrim','cyl',0,2.78,0,1.15,.1,1.15,'#3b82f6'),P('TopiAtas','cyl',0,2.95,0,.85,.3,.85,'#3b82f6')]},
 alat:{n:'Aksesoris Perlengkapan (pegang)',e:'',slot:'Alat',f:()=>[P('Gagang','cyl',.75,.85,.2,.14,.5,.14,'#6b4423'),P('Pelindung','part',.75,1.12,.2,.5,.1,.14,'#ffc400'),P('Bilah','part',.75,1.95,.2,.14,1.6,.06,'#d7dbe2')]},
 pinggang:{n:'Aksesoris Pinggang',e:'',slot:'Pinggang',f:()=>[P('Sabuk','part',0,.98,0,1.12,.2,.72,'#6b4423'),P('Gesper','part',0,.98,.37,.28,.22,.06,'#ffc400')]},
 belakang:{n:'Aksesoris Belakang',e:'',slot:'Belakang',f:()=>[P('Tas','part',0,1.4,-.5,.8,.95,.35,'#3b82f6'),P('Kantong','part',0,1.05,-.7,.5,.4,.12,'#2563eb')]},
 depan:{n:'Aksesoris Depan',e:'',slot:'Depan',f:()=>[P('Perisai','part',0,1.4,.45,.7,.7,.12,'#a855f7')]},
 tubuh:{n:'Model Tubuh',e:'',slot:'Tubuh',f:()=>[P('Head','ball',0,2.3,0,.9,.9,.9,SKN),P('Torso','part',0,1.4,0,1,1,.6,'#3b82f6'),P('LeftArm','cyl',-.75,1.4,0,.5,1,.5,SKN),P('RightArm','cyl',.75,1.4,0,.5,1,.5,SKN),P('LeftLeg','cyl',-.25,.45,0,.5,.9,.5,'#2b4acb'),P('RightLeg','cyl',.25,.45,0,.5,.9,.5,'#2b4acb'),P('MataKiri','part',-.17,2.35,.43,.12,.2,.05,'#000000'),P('MataKanan','part',.17,2.35,.43,.12,.2,.05,'#000000')]}};
TPL.avatar=Object.assign({},TPL.tubuh,{n:'Avatar (karakter lengkap)',slot:'Avatar'});
Object.keys(TPL).forEach(k=>AT[k]=TPL[k]);
['obby','menara','kota','arena'].forEach(k=>delete GT[k]);
const _na=act.newa;act.newa=function(k){_na.apply(this,arguments);if(ST&&ST.kind=='a'){ST.d.slot=AT[k]&&AT[k].slot||'Kepala';save();pRender()}};
AT.mahkota.slot='Kepala';AT.kerucut.slot='Kepala';AT.sayap.slot='Belakang';AT.kacamata.slot='Wajah';AT.jubah.slot='Belakang';

/* menu "Buat baru": map = baseplate kosong saja, aksesori dipilih per slot */
act.hnew=function(){
 const A=['avatar','pakaian','sepatu','kepala','bahu','alat','pinggang','belakang','depan','tubuh'];
 shOpen(`<div class="shn" style="margin-top:6px">Buat baru</div><div style="padding:0 4px 4px;opacity:.7">Map</div><button class="sb" data-a="hnewg" data-v="kosong">Baseplate Kosong</button><div style="padding:14px 4px 0;opacity:.7">Aksesori &amp; Tubuh</div>${A.map(k=>`<button class="sb" data-a="hnewa" data-v="${k}">${AT[k].n}</button>`).join('')}<button class="sb ln" data-a="shx">Tutup</button>`)};
const _tp=act.tpl;
act.tpl=function(v){_tp.apply(this,arguments);if(ST&&ST.kind=='a'&&AT[v]&&AT[v].slot){ST.d.slot=AT[v].slot;sBuild();eRender();pRender();touch()}};
const _pr=pRender;
pRender=function(){_pr();try{if(ST&&ST.kind=='a'&&!SI&&!cur()&&(ST.d.slot==='Tubuh'||ST.d.slot==='Avatar'))$('#props').insertAdjacentHTML('beforeend','<div style="font-size:11px;margin-top:8px;line-height:1.45">Model Tubuh menggantikan badan bawaan. Beri nama <b>LeftArm</b>, <b>RightArm</b>, <b>LeftLeg</b>, <b>RightLeg</b> agar anggota badan ikut bergerak. Bentuk bisa Part, Cylinder, atau Ball.</div>')}catch(e){}};

/* pakai model Tubuh */

/* avatar: model Tubuh menggantikan badan, Perlengkapan menempel di tangan kanan */
mkAvatar=function(a,accs){
 const G=new THREE.Group(),piv=(y,x)=>{const p=new THREE.Group();p.position.set(x,y,0);G.add(p);return p};
 const items=(typeof me!=='undefined'&&me&&me.items)||[];
 const ids=(accs||[]).slice();if(a.body&&!ids.includes(a.body))ids.push(a.body);
 const bItem=ids.map(id=>items.find(i=>i.id==id)).find(i=>i&&(i.slot==='Tubuh'||i.slot==='Avatar'));
 const bObjs=a.bodyObjs||(bItem&&bItem.objs)||null,hb=!!bObjs||!!a.hideBody;
 const lL=piv(.9,-.25),lR=piv(.9,.25),aL=piv(1.85,-.75),aR=piv(1.85,.75);let h;
 if(!hb){
  lL.add(part(.5,.9,.5,a.pants,0,-.45,0));lR.add(part(.5,.9,.5,a.pants,0,-.45,0));
  aL.add(part(.5,1,.5,a.skin,0,-.45,0));aR.add(part(.5,1,.5,a.skin,0,-.45,0));
  G.add(part(1,1,.6,a.shirt,0,1.4,0));h=part(.8,.8,.8,a.skin,0,2.3,0);G.add(h);
  h.add(part(.12,.2,.05,'#000000',-.17,.05,.41),part(.12,.2,.05,'#000000',.17,.05,.41))}
 else{h=new THREE.Group();h.position.set(0,2.3,0);G.add(h)}
 if(a.hat=='cap')h.add(part(.9,.2,.9,'#ff3b3b',0,.5,0));if(a.hat=='crown')h.add(part(.9,.3,.9,'#ffc400',0,.55,0));
 const named=!!bObjs&&bObjs.some(o=>o&&window.__limbName&&window.__limbName(o.n));
 if(bObjs)bObjs.forEach(o=>{if(!o||o.t==='coin')return;const m=mkObj(o),n=String(o.n||'').toLowerCase();let p=null;
  p=window.__limbPick?window.__limbPick(n,o,[aL,aR],[lL,lR],named):null;
  if(p){m.position.x-=p.position.x;m.position.y-=p.position.y;m.position.z-=p.position.z;p.add(m)}else G.add(m)});
 G.l=[lL,lR];G.a=[aL,aR];
 ids.forEach(id=>{const it=items.find(i=>i.id==id);if(!it||it===bItem||it.slot==='Tubuh'||it.slot==='Avatar')return;const hand=/^(Alat|Perlengkapan)$/.test(it.slot||'');
  (it.objs||[]).forEach(o=>{if(!o||o.t==='coin')return;const m=mkObj(o);if(hand){m.position.x-=aR.position.x;m.position.y-=aR.position.y;m.position.z-=aR.position.z;aR.add(m)}else G.add(m)})});
 return G};

/* seleksi bulat di Studio (tanpa kotak) */
selHelper=function(){
 if(helper){SS.remove(helper);helper=null}
 const m=meshes[SEL];
 if(m){const o=m.userData&&m.userData.o;
  if(o&&(o.t=='ball'||o.t=='cyl')){
   const g=new THREE.Group(),M=new THREE.LineBasicMaterial({color:0xff0066,depthTest:false,transparent:true});
   const ring=(rx,rz,yy)=>{const pts=[];for(let i=0;i<=48;i++){const t=i/48*Math.PI*2;pts.push(new THREE.Vector3(Math.cos(t)*.5,0,Math.sin(t)*.5))}const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),M);l.rotation.set(rx||0,0,rz||0);l.position.y=yy||0;l.renderOrder=98;return l};
   if(o.t=='ball'){g.add(ring(0,0,0),ring(Math.PI/2,0,0),ring(0,Math.PI/2,0))}
   else{g.add(ring(0,0,.5),ring(0,0,-.5));[[.5,0],[-.5,0],[0,.5],[0,-.5]].forEach(p=>{const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(p[0],-.5,p[1]),new THREE.Vector3(p[0],.5,p[1])]),M);l.renderOrder=98;g.add(l)})}
   g.update=()=>{g.position.copy(m.position);g.rotation.copy(m.rotation);g.scale.copy(m.scale).multiplyScalar(1.01)};g.update();helper=g;SS.add(g)}
  else{helper=new THREE.BoxHelper(m,0xff0066);SS.add(helper)}}
 gzBuild()};
if(ST&&SS)selHelper();
})();
;

/* ===== 33-v11.js ===== */
/* ===== v11: Terrain rumput bergoyang + kuas terrain, Video & Efek video ===== */
(function(){
const GU={value:0};(function tk(){GU.value=performance.now()/1000;requestAnimationFrame(tk)})();
NM.grass='Rumput';TI.grass='';NM.video='Video';TI.video='';
try{TY.push('grass','video')}catch(e){}
/* ---- penyimpanan video (IndexedDB, hanya di perangkat ini) ---- */
let _db=null;const idb=()=>_db||(_db=new Promise((ok,no)=>{try{const r=indexedDB.open('sbvid',1);r.onupgradeneeded=()=>r.result.createObjectStore('v');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)}catch(e){no(e)}}));
const vPut=(k,b)=>idb().then(d=>new Promise((ok,no)=>{const t=d.transaction('v','readwrite');t.objectStore('v').put(b,k);t.oncomplete=ok;t.onerror=()=>no(t.error)}));
const vGet=k=>idb().then(d=>new Promise(ok=>{const q=d.transaction('v').objectStore('v').get(k);q.onsuccess=()=>ok(q.result);q.onerror=()=>ok(null)})).catch(()=>null);
const VC={};
function getVid(o){const k=o.vurl||o.vid;if(!k)return null;if(VC[k])return VC[k];
 const v=document.createElement('video');v.loop=true;v.muted=true;v.playsInline=true;v.setAttribute('playsinline','');v.crossOrigin='anonymous';v.preload='auto';VC[k]=v;
 if(o.vurl)v.src=o.vurl;else vGet(k).then(b=>{if(b){v.src=URL.createObjectURL(b);v.play().catch(()=>{})}});
 v.play&&v.play().catch(()=>{});return v}
document.addEventListener('pointerdown',()=>Object.values(VC).forEach(v=>{if(v.paused&&v.src)v.play().catch(()=>{})}),{passive:true});
/* ---- rumput ---- */
let GM=null;
function grassMat(){if(GM)return GM;GM=new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide});
 GM.onBeforeCompile=sh=>{sh.uniforms.uT=GU;sh.vertexShader='uniform float uT;\n'+sh.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
 float ph=modelMatrix[3].x*.7+modelMatrix[3].z*.9;float kx=length(modelMatrix[0].xyz),ky=length(modelMatrix[1].xyz),kz=length(modelMatrix[2].xyz);
 float sw=sin(uT*1.6+ph+position.x*4.+position.z*3.)*.6+sin(uT*2.7+ph*1.3+position.z*5.)*.3;
 transformed.x+=sw*.09*position.y*ky/kx;transformed.z+=cos(uT*1.3+ph+position.x*3.)*.05*position.y*ky/kz;`)};return GM}
function mkGrass(o){o.cc=false;
 const base=new THREE.Mesh(new THREE.CylinderGeometry(.5,.5,.03,28),new THREE.MeshLambertMaterial({color:new THREE.Color(o.c||'#4caf50').multiplyScalar(.5)}));
 const n=Math.min(320,Math.max(30,Math.round(o.sx*o.sz*10)));let s=(Math.abs(Math.round(o.x*131+o.z*977))+7)>>>0;const R=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296};
 const c1=new THREE.Color(o.c||'#4caf50'),c0=c1.clone().multiplyScalar(.45),c2=c1.clone().lerp(new THREE.Color('#ffffff'),.2);
 const P=[],C=[],N=[];
 for(let i=0;i<n;i++){const a=R()*6.2832,r=Math.sqrt(R())*.48,x=Math.cos(a)*r,z=Math.sin(a)*r,h=.55+R()*.45,w=.02+R()*.012,t=R()*3.1416,dx=Math.cos(t)*w,dz=Math.sin(t)*w,lx=(R()-.5)*.06,lz=(R()-.5)*.06;
  P.push(x-dx,0,z-dz,x+dx,0,z+dz,x+lx,h,z+lz);C.push(c0.r,c0.g,c0.b,c0.r,c0.g,c0.b,c2.r,c2.g,c2.b);N.push(0,1,0,0,1,0,0,1,0)}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('color',new THREE.Float32BufferAttribute(C,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));
 const bl=new THREE.Mesh(g,grassMat());bl.frustumCulled=false;bl.raycast=()=>{};base.add(bl);place(base,o);base.userData={o};return base}
/* ---- video ---- */
function mkVideo(o){o.cc=false;const el=getVid(o),tx=el?new THREE.VideoTexture(el):null;
 if(tx){tx.minFilter=THREE.LinearFilter;tx.magFilter=THREE.LinearFilter;tx.generateMipmaps=false}
 const mt=new THREE.MeshBasicMaterial({map:tx,color:tx?0xffffff:new THREE.Color(o.c||'#888888'),side:THREE.DoubleSide,transparent:true,opacity:Math.min(1,Math.max(.05,o.vop||(tx?1:.5)))});
 if(o.vmode==='efek'){mt.blending=THREE.AdditiveBlending;mt.depthWrite=false}
 const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),mt);place(m,o);m.userData={o};return m}
const _mk=mkObj;mkObj=function(o){return o&&o.t==='grass'?mkGrass(o):o&&o.t==='video'?mkVideo(o):_mk(o)};
/* seleksi rumput: cincin datar */
const _sh=selHelper;selHelper=function(){const m=meshes[SEL],o=m&&m.userData&&m.userData.o;
 if(o&&o.t==='grass'){if(helper){SS.remove(helper);helper=null}const pts=[];for(let i=0;i<=48;i++){const t=i/48*Math.PI*2;pts.push(new THREE.Vector3(Math.cos(t)*.5,0,Math.sin(t)*.5))}
  const g=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0xff0066,depthTest:false,transparent:true}));g.renderOrder=98;
  g.update=()=>{g.position.copy(m.position);g.scale.set(m.scale.x,1,m.scale.z)};g.update();helper=g;SS.add(g);gzBuild();return}
 _sh()};
/* ---- kuas terrain ---- */
const TB={on:false,m:'add',s:3,h:.7,c:'#4caf50'};
let cursor=null;const gcount=()=>ST.d.objs.filter(o=>o.t==='grass').length,MAXG=400;
function curs(){if(!cursor){const pts=[];for(let i=0;i<=40;i++){const t=i/40*Math.PI*2;pts.push(new THREE.Vector3(Math.cos(t)*.5,0,Math.sin(t)*.5))}cursor=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0x22cc66,depthTest:false,transparent:true}));cursor.renderOrder=99}
 if(cursor.parent!==SS)SS.add(cursor);return cursor}
let painting=false,lastP=null,changed=false,pid=null;
function dab(p){if(!p)return;const s=TB.s;
 if(TB.m==='add'){if(lastP&&Math.hypot(p.x-lastP.x,p.z-lastP.z)<s*.6)return;if(gcount()>=MAXG){toast('Batas rumput tercapai ('+MAXG+')');return}
  const o=O('grass',+(p.x).toFixed(2),.03,+(p.z).toFixed(2),s,TB.h,s,TB.c);o.cc=false;ST.d.objs.push(o);const m=mkObj(o);SS.add(m);meshes[o.id]=m;lastP=p;changed=true}
 else{const r=s/2;const del=ST.d.objs.filter(o=>o.t==='grass'&&Math.hypot(o.x-p.x,o.z-p.z)<r+o.sx*.3);if(!del.length)return;
  del.forEach(o=>{const m=meshes[o.id];if(m)SS.remove(m);delete meshes[o.id]});ST.d.objs=ST.d.objs.filter(o=>!del.includes(o));changed=true}}
const on=()=>TB.on&&ST&&ST.kind==='g'&&$('#ed').classList.contains('on');
sc.addEventListener('pointerdown',e=>{if(!on()||e.button==2||e.button==1||e.shiftKey)return;if(painting){painting=false;return}
 e.preventDefault();e.stopImmediatePropagation();try{sc.setPointerCapture(e.pointerId)}catch(x){}
 pushUndo();painting=true;pid=e.pointerId;lastP=null;changed=false;const p=plane(e,0);const c=curs();if(p){c.position.set(p.x,.06,p.z);c.scale.set(TB.s,1,TB.s)}dab(p)},true);
sc.addEventListener('pointermove',e=>{if(!on())return;const p=plane(e,0);if(p){const c=curs();c.position.set(p.x,.06,p.z);c.scale.set(TB.s,1,TB.s)}
 if(painting&&e.pointerId===pid){e.stopImmediatePropagation();dab(p)}},true);
const endP=e=>{if(!painting||e.pointerId!==pid)return;e.stopImmediatePropagation();painting=false;if(changed){eRender();touch();slog((TB.m==='add'?'+ rumput':'- rumput'))}};
sc.addEventListener('pointerup',endP,true);sc.addEventListener('pointercancel',endP,true);
/* ---- panel Toolbox ---- */
const _tb=tbxRender;
tbxRender=function(){_tb();if(!ST||ST.kind!=='g')return;
 $('#tbx').insertAdjacentHTML('beforeend',`<h4>Terrain</h4>
 <button class="btn sm w ${TB.on?'c':'o'}" id="tr_on">Kuas Terrain: ${TB.on?'HIDUP':'Mati'}</button>
 <label>Mode kuas</label><select id="tr_m"><option value="add" ${TB.m=='add'?'selected':''}>Tambah rumput</option><option value="del" ${TB.m=='del'?'selected':''}>Hapus rumput</option></select>
 <label>Ukuran kuas: <b id="tr_sv">${TB.s}</b></label><input type="range" id="tr_s" min="1" max="12" step=".5" value="${TB.s}">
 <label>Tinggi rumput: <b id="tr_hv">${TB.h}</b></label><input type="range" id="tr_h" min=".2" max="2" step=".1" value="${TB.h}">
 <label>Warna rumput</label><input type="color" id="tr_c" value="${TB.c}">
 <div class="tg"><button class="btn sm" id="tr_gen">Generate</button><button class="btn sm o" id="tr_cl">Clean</button></div>
 <div style="font-size:11px;opacity:.7;margin:4px 0">Hidupkan kuas, lalu seret di viewport. Rumput bergoyang pelan.</div>
 <h4>Video &amp; Efek</h4><button class="btn sm w" id="vd_up">Upload Video</button><button class="btn sm w" id="vd_url">Video dari URL</button>
 <div style="font-size:11px;opacity:.7;margin:4px 0">Pilih video di viewport lalu atur <b>Efek</b> di panel properti (Efek = latar hitam jadi transparan).</div>`);
 const g=id=>$('#'+id);
 g('tr_on').onclick=()=>{TB.on=!TB.on;tbxRender();toast(TB.on?'Kuas terrain hidup: seret di viewport':'Kuas terrain mati')};
 g('tr_m').onchange=e=>TB.m=e.target.value;
 g('tr_s').oninput=e=>{TB.s=+e.target.value;g('tr_sv').textContent=TB.s};g('tr_h').oninput=e=>{TB.h=+e.target.value;g('tr_hv').textContent=TB.h};g('tr_c').onchange=e=>TB.c=e.target.value;
 g('tr_gen').onclick=()=>{pushUndo();ST.d.objs=ST.d.objs.filter(o=>o.t!=='grass');let n=0;for(let x=-36;x<=36;x+=7)for(let z=-36;z<=36;z+=7){const o=O('grass',x,.03,z,8,TB.h,8,TB.c);o.cc=false;ST.d.objs.push(o);n++}
  sBuild();eRender();pRender();touch();slog('+ '+n+' rumput')};
 g('tr_cl').onclick=()=>{pushUndo();ST.d.objs=ST.d.objs.filter(o=>o.t!=='grass');SEL='root';sBuild();eRender();pRender();touch();slog('Rumput dibersihkan')};
 g('vd_up').onclick=()=>{let f=$('#vd_file');if(!f){f=document.createElement('input');f.type='file';f.accept='video/*';f.id='vd_file';f.style.display='none';document.body.appendChild(f);f.onchange=()=>{const fl=f.files[0];f.value='';if(fl)upVid(fl)}}f.click()};
 g('vd_url').onclick=()=>{const u=(prompt('Tempel link video (https, mp4/webm, harus mengizinkan CORS):')||'').trim();if(!u)return;if(!/^https:\/\/[^\s]{4,300}$/i.test(u))return toast('Link harus https');addVid({vurl:u,n:'Video URL'},16/9)}};
function addVid(f,asp){pushUndo();const w=6,h=+(w/(asp||1.78)).toFixed(2),o=O('video',Math.round(sctl.tx),+(h/2+.1).toFixed(2),Math.round(sctl.tz),w,h,.05,'#ffffff');Object.assign(o,f);o.cc=false;
 ST.d.objs.push(o);SEL=o.id;sBuild();eRender();pRender();touch();slog('+ Video')}
async function upVid(fl){if(!/^video\//.test(fl.type))return toast('Pilih file video');if(fl.size>60*1024*1024)return toast('Maksimal 60 MB');
 const key='v_'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
 try{await vPut(key,fl)}catch(e){return toast('Gagal menyimpan video')}
 const u=URL.createObjectURL(fl),t=document.createElement('video');t.preload='metadata';
 t.onloadedmetadata=()=>{const a=t.videoWidth&&t.videoHeight?t.videoWidth/t.videoHeight:1.78;URL.revokeObjectURL(u);addVid({vid:key,n:fl.name.replace(/\.[^.]+$/,'').slice(0,18)||'Video'},a)};
 t.onerror=()=>{URL.revokeObjectURL(u);addVid({vid:key,n:'Video'},1.78)};t.src=u}
/* ---- properti video ---- */
const _pr=pRender;
pRender=function(){_pr();try{const o=cur();if(!o||o.t!=='video')return;
 $('#props').insertAdjacentHTML('afterbegin',`<h4>Video</h4><label>Efek</label><select data-p="vmode"><option value="normal" ${o.vmode!=='efek'?'selected':''}>Normal</option><option value="efek" ${o.vmode==='efek'?'selected':''}>Efek (hitam transparan)</option></select><label>Transparansi (0.1 - 1)</label><input type="number" step=".1" min=".1" max="1" data-p="vop" value="${o.vop||1}"><label>URL video (opsional, https)</label><input type="text" data-p="vurl" value="${esc(o.vurl||'')}" maxlength="300"><div style="font-size:11px;opacity:.7;margin-bottom:6px">${o.vid&&!o.vurl?'Video tersimpan di perangkat ini saja. Pakai URL agar terlihat di perangkat lain.':''}</div>`)}catch(e){}};
})();
;

/* ===== 34-v10.js ===== */
/* ===== v10: UserId, TweenService, Enum GUI, Voice chat (WebRTC lewat room Mabar) ===== */
(function(){
const cp=(t,msg)=>{const ok=()=>toast(msg),fb=()=>{const a=document.createElement('textarea');a.value=t;a.style.cssText='position:fixed;opacity:0';document.body.appendChild(a);a.select();try{document.execCommand('copy');ok()}catch(e){toast(t)}a.remove()};try{navigator.clipboard.writeText(t).then(ok,fb)}catch(e){fb()}};

/* ---------- UserId ---------- */
function ensureAllUid(){let ch=0;const used=new Set(Object.values(users).map(u=>u&&u.uid).filter(Boolean).map(String));
 Object.keys(users).forEach(k=>{const u=users[k];if(!u||typeof u!=='object')return;if(!/^\d{6,12}$/.test(String(u.uid||''))){let n;do{n=String(Math.floor(1e8+Math.random()*9e8))}while(used.has(n));used.add(n);u.uid=+n;ch=1}});
 if(ch)try{save()}catch(e){}}
window.ensureAllUid=ensureAllUid;
const _en=enter;enter=function(){ensureAllUid();return _en.apply(this,arguments)};
if(typeof me!=='undefined'&&me)ensureAllUid();
const _rd=render;render=function(){const r=_rd.apply(this,arguments);
 try{if(page=='set'&&me){const m=document.getElementById('main');if(m&&!document.getElementById('uidc')){ensureAllUid();
  m.insertAdjacentHTML('beforeend','<div class="card" id="uidc" style="margin-top:14px"><h3>User ID</h3><p style="margin:0 0 8px;font-size:13px">ID unik akunmu. Di script: <code>player.UserId</code></p><div style="display:flex;gap:8px"><input type="text" readonly value="'+me.uid+'" style="margin:0"><button class="btn sm g" data-a="uidcopy">Salin</button></div></div>')}}}catch(e){}
 return r};
act.uidcopy=()=>cp(String(me.uid),'UserId disalin');

/* ---------- Enum tambahan ---------- */
{const E=G.get('Enum'),en=o=>mkT(o);
 E.set('FillDirection',en({Horizontal:'Horizontal',Vertical:'Vertical'}));
 E.set('HorizontalAlignment',en({Left:'Left',Center:'Center',Right:'Right'}));
 E.set('VerticalAlignment',en({Top:'Top',Center:'Center',Bottom:'Bottom'}));
 E.set('SortOrder',en({LayoutOrder:'LayoutOrder',Name:'Name'}));
 E.set('EasingStyle',en({Linear:'Linear',Sine:'Sine',Quad:'Quad',Cubic:'Cubic',Quart:'Quart',Quint:'Quint',Exponential:'Exponential',Back:'Back',Bounce:'Bounce',Elastic:'Elastic'}));
 E.set('EasingDirection',en({In:'In',Out:'Out',InOut:'InOut'}))}

/* ---------- TweenService ---------- */
const ob=t=>{const n=7.5625,d=2.75;if(t<1/d)return n*t*t;if(t<2/d)return n*(t-=1.5/d)*t+.75;if(t<2.5/d)return n*(t-=2.25/d)*t+.9375;return n*(t-=2.625/d)*t+.984375};
const EIN={Linear:t=>t,Sine:t=>1-Math.cos(t*Math.PI/2),Quad:t=>t*t,Cubic:t=>t**3,Quart:t=>t**4,Quint:t=>t**5,Exponential:t=>t<=0?0:2**(10*t-10),Back:t=>2.70158*t*t*t-1.70158*t*t,Bounce:t=>1-ob(1-t),Elastic:t=>t<=0?0:t>=1?1:-(2**(10*t-10))*Math.sin((t*10-10.75)*(2*Math.PI/3))};
const ease=(st,dr,t)=>{const f=EIN[st]||EIN.Quad;if(dr=='In')return f(t);if(dr=='InOut')return t<.5?f(2*t)/2:1-f(2-2*t)/2;return 1-f(1-t)};
const lerp=(a,b,t)=>{if(typeof a=='number'&&typeof b=='number')return a+(b-a)*t;if(a instanceof LU&&b instanceof LU)return new LU(a.p.map((x,i)=>x+(b.p[i]-x)*t));
 if(a instanceof LC&&b instanceof LC)return new LC(a.r+(b.r-a.r)*t,a.g+(b.g-a.g)*t,a.b+(b.b-a.b)*t);if(a instanceof LV&&b instanceof LV)return new LV(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,a.z+(b.z-a.z)*t);return b};
class TInfo{constructor(t,st,dr,rc,rv,dl){this.t=Math.max(0,+t||1);this.st=String(st||'Quad').replace(/^Enum\.EasingStyle\./,'');this.dr=String(dr||'Out').replace(/^Enum\.EasingDirection\./,'');this.rc=Math.max(0,Math.floor(+rc||0));this.rv=!!rv;this.dl=Math.max(0,+dl||0)}
 $g(k){return{Time:this.t,EasingStyle:this.st,EasingDirection:this.dr,RepeatCount:this.rc,Reverses:this.rv,DelayTime:this.dl}[k]}}
class TweenW{constructor(inst,info,goals){this.inst=inst;this.info=info;this.goals=goals;this.done=new Sig();this.raf=0;this.state='Begin'}
 $g(k){switch(k){case'Play':return()=>this.play();case'Cancel':case'Pause':return()=>this.stop();case'Completed':return this.done;case'PlaybackState':return this.state;case'Instance':return this.inst}}
 stop(){if(this.raf)cancelAnimationFrame(this.raf);this.raf=0;if(this.state=='Playing')this.state='Cancelled'}
 play(){this.stop();const inf=this.info,from=new Map(),to=new Map();
  if(this.goals&&this.goals.h)for(const[k,v]of this.goals.h){let f;try{f=this.inst.$g(k)}catch(e){}if(f!==undefined){from.set(k,f);to.set(k,v)}}
  const dur=Math.max(.001,inf.t)*1000,cyc=inf.rv?dur*2:dur,total=cyc*(inf.rc+1),t0=performance.now()+inf.dl*1000;this.state='Playing';
  const step=now=>{if(this.state!=='Playing')return;if(typeof RT==='undefined'||!RT||!RT.alive){this.state='Cancelled';return}
   const el=now-t0;if(el<0){this.raf=requestAnimationFrame(step);return}
   const fin=el>=total;let u;if(fin)u=inf.rv?0:1;else{u=(el%cyc)/dur;if(u>1)u=2-u}
   const e=ease(inf.st,inf.dr,Math.max(0,Math.min(1,u)));for(const[k,b]of to){try{this.inst.$s(k,lerp(from.get(k),b,e))}catch(x){}}
   if(fin){this.raf=0;this.state='Completed';this.done.fire('Completed')}else this.raf=requestAnimationFrame(step)};
  this.raf=requestAnimationFrame(step)}}
G.set('TweenInfo',mkT({new:(t,st,dr,rc,rv,dl)=>new TInfo(t,st,dr,rc,rv,dl)}));
window.mkTweenSvc=()=>new FW('TweenService',()=>[],{Create:(s,inst,info,goals)=>new TweenW(inst,info instanceof TInfo?info:new TInfo(1),goals)});

/* ---------- Voice chat: WebRTC mesh, signaling lewat presence room Firebase ---------- */
const ICE={iceServers:[{urls:['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302']}]};
window.mkVoice=function(env){
 const S={on:0,muted:0,stream:null,room:null,id:'',pcs:{},sig:{},aud:{},an:{},sp:new Set(),tm:0,sp_t:0};let ac=null;
 const nonce=()=>Math.random().toString(36).slice(2,9),say=m=>{try{env.toast&&env.toast(m)}catch(e){}},chg=()=>{try{env.onChange&&env.onChange(api)}catch(e){}};
 const roomNow=()=>{try{return env.room()}catch(e){return null}};
 const pushSig=()=>{const r=S.room;if(r)try{r.presence({vs:Object.assign({},S.sig)})}catch(e){}};
 const gather=pc=>new Promise(res=>{if(pc.iceGatheringState==='complete')return res();const f=()=>{if(pc.iceGatheringState==='complete'){pc.removeEventListener('icegatheringstatechange',f);res()}};pc.addEventListener('icegatheringstatechange',f);setTimeout(res,2000)});
 function close(pid){const e=S.pcs[pid];if(e){e.dead=1;try{e.pc.ontrack=null;e.pc.onconnectionstatechange=null;e.pc.close()}catch(x){}}delete S.pcs[pid];
  const a=S.aud[pid];if(a){try{a.pause();a.srcObject=null;a.remove()}catch(x){}delete S.aud[pid]}
  if(S.an[pid]){try{S.an[pid].src.disconnect()}catch(x){}delete S.an[pid]}S.sp.delete(pid);if(pid in S.sig){delete S.sig[pid];pushSig()}}
 function watch(id,st){try{ac=ac||new(window.AudioContext||window.webkitAudioContext)();if(ac.state==='suspended')ac.resume();const src=ac.createMediaStreamSource(st),an=ac.createAnalyser();an.fftSize=256;src.connect(an);S.an[id]={src,an,buf:new Uint8Array(an.fftSize),last:0}}catch(x){}}
 function speak(){const now=Date.now();let ch=0;for(const id in S.an){const o=S.an[id];try{o.an.getByteTimeDomainData(o.buf)}catch(x){continue}let m=0;for(let i=0;i<o.buf.length;i++){const v=Math.abs(o.buf[i]-128);if(v>m)m=v}if(m>6)o.last=now;const sp=now-o.last<350;if(sp!==S.sp.has(id)){sp?S.sp.add(id):S.sp.delete(id);ch=1}}if(ch)chg()}
 function attach(pid,st){let a=S.aud[pid];if(!a){a=document.createElement('audio');a.autoplay=true;a.playsInline=true;a.style.display='none';(env.audioParent||document.body).appendChild(a);S.aud[pid]=a}a.srcObject=st;a.play&&a.play().catch(()=>{});if(S.an[pid]){try{S.an[pid].src.disconnect()}catch(x){}delete S.an[pid]}watch(pid,st);chg()}
 function newPc(pid,n,role){const pc=new RTCPeerConnection(ICE),e={pc,n,role,t:Date.now(),ok:0,dead:0,badAt:0,ans:0};S.pcs[pid]=e;
  pc.ontrack=ev=>attach(pid,(ev.streams&&ev.streams[0])||new MediaStream([ev.track]));
  pc.onconnectionstatechange=()=>{const s=pc.connectionState;
   if(s==='connected'){e.ok=1;e.badAt=0;setTimeout(()=>{if(S.pcs[pid]===e&&S.sig[pid]&&S.sig[pid].n===n){delete S.sig[pid];pushSig()}},2500);chg()}
   else if(s==='failed'||s==='closed')e.dead=1;else if(s==='disconnected')e.badAt=e.badAt||Date.now()}
  return e}
 function addLocal(pc){const tr=S.stream&&S.stream.getAudioTracks()[0],free=pc.getTransceivers().find(t=>!t.sender.track&&t.receiver&&t.receiver.track&&t.receiver.track.kind==='audio');
  if(tr){if(free){free.direction='sendrecv';free.sender.replaceTrack(tr);try{free.sender.setStreams(S.stream)}catch(x){}}else pc.addTrack(tr,S.stream)}
  else if(free)free.direction='recvonly';else pc.addTransceiver('audio',{direction:'recvonly'})}
 async function offer(pid){const n=nonce(),e=newPc(pid,n,'o');try{addLocal(e.pc);const o=await e.pc.createOffer();await e.pc.setLocalDescription(o);await gather(e.pc);if(e.dead||S.pcs[pid]!==e)return;S.sig[pid]={k:'o',n,s:e.pc.localDescription.sdp};pushSig()}catch(x){e.dead=1}}
 async function accept(pid,sg){close(pid);const e=newPc(pid,sg.n,'a');try{await e.pc.setRemoteDescription({type:'offer',sdp:sg.s});addLocal(e.pc);const a=await e.pc.createAnswer();await e.pc.setLocalDescription(a);await gather(e.pc);if(e.dead||S.pcs[pid]!==e)return;S.sig[pid]={k:'a',n:sg.n,s:e.pc.localDescription.sdp};pushSig()}catch(x){e.dead=1}}
 function tick(){if(!S.on)return;const r=roomNow();if(!r)return;let ps;try{ps=r.peers()}catch(x){return}const mine=ps.find(p=>p.isMe);if(!mine)return;
  if(S.room!==r||S.id!==mine.peer){Object.keys(S.pcs).forEach(close);S.sig={};S.room=r;S.id=mine.peer;try{r.presence({vc:1,vm:S.muted?1:0,vs:{}})}catch(x){}}
  const live=new Set(),now=Date.now();
  ps.forEach(p=>{if(p.isMe||!p.presence||p.presence.vc!==1)return;const pid=p.peer;live.add(pid);const sg=(p.presence.vs||{})[S.id];let e=S.pcs[pid];
   if(e&&(e.dead||(!e.ok&&now-e.t>25000)||(e.badAt&&now-e.badAt>6000))){close(pid);e=null}
   if(S.id<pid){if(!e)offer(pid);else if(e.role==='o'&&!e.ans&&sg&&sg.k==='a'&&sg.n===e.n){e.ans=1;e.pc.setRemoteDescription({type:'answer',sdp:sg.s}).catch(()=>{e.dead=1})}}
   else if(sg&&sg.k==='o'&&(!e||e.n!==sg.n))accept(pid,sg)});
  Object.keys(S.pcs).forEach(pid=>{if(!live.has(pid))close(pid)})}
 async function join(){if(S.on)return true;const r=roomNow();if(!r){say('Voice chat hanya di mode online (Mabar)');return false}
  if(!navigator.mediaDevices||!window.RTCPeerConnection){say('Browser tidak mendukung voice chat');return false}
  try{S.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}})}catch(x){S.stream=null;say('Mikrofon tidak diizinkan, kamu masuk sebagai pendengar')}
  S.on=1;S.muted=0;S.room=null;S.id='';if(S.stream)watch('_me',S.stream);S.tm=setInterval(tick,1000);S.sp_t=setInterval(speak,150);tick();chg();return true}
 function leave(){if(!S.on)return;S.on=0;clearInterval(S.tm);clearInterval(S.sp_t);const r=S.room||roomNow();Object.keys(S.pcs).forEach(close);S.sig={};
  if(S.stream){S.stream.getTracks().forEach(t=>{try{t.stop()}catch(x){}})}S.stream=null;for(const id in S.an){try{S.an[id].src.disconnect()}catch(x){}}S.an={};S.sp.clear();
  try{r&&r.presence({vc:0,vm:0,vs:{}})}catch(x){}S.room=null;chg()}
 function mute(m){S.muted=m===undefined?!S.muted:!!m;if(S.stream)S.stream.getAudioTracks().forEach(t=>t.enabled=!S.muted);const r=S.room;try{r&&r.presence({vm:S.muted?1:0})}catch(x){}chg()}
 const api={join,leave,mute,tick,
  get on(){return!!S.on},get muted(){return!!S.muted},get hasMic(){return!!S.stream},
  state(){const o={};for(const k in S.pcs)o[k]={ok:S.pcs[k].ok,role:S.pcs[k].role,tracks:S.aud[k]&&S.aud[k].srcObject?S.aud[k].srcObject.getAudioTracks().length:0};return{id:S.id,peers:o,speaking:[...S.sp]}},
  speakers(){const r=S.room||roomNow();let ps=[];try{ps=r?r.peers():[]}catch(x){}const names=[];S.sp.forEach(id=>{if(id==='_me')names.push('Kamu');else{const p=ps.find(q=>q.peer===id);names.push((p&&p.presence&&p.presence.n)||'Pemain')}});return names}};
 return api};

/* ---------- Voice: tombol mic di HUD game ---------- */
const MIC={off:'<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/><path d="M4 4l16 16" stroke="#ff4040"/></svg>',
 on:'<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/></svg>',
 mute:'<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/><path d="M4 4l16 16" stroke="#ff4040"/></svg>'};
const gameEl=document.getElementById('game')||document.body;
gameEl.insertAdjacentHTML('beforeend','<div id="vcs"></div>');
const micBtn=()=>document.querySelector('#topl .rpill button[data-a=mic]');
function ui(v){const b=micBtn();if(b){const keep='<i id="camb" style="display:none"></i>';b.innerHTML=(!v.on?MIC.off:v.muted?MIC.mute:MIC.on)+keep;b.classList.toggle('vcon',v.on&&!v.muted);b.title=!v.on?'Voice chat':v.muted?'Mic mati (tap untuk nyalakan)':'Mic menyala (tap untuk mute, tahan untuk keluar)'}
 const el=document.getElementById('vcs');if(el){const n=v.on?v.speakers():[];el.style.display=n.length?'block':'none';el.textContent=n.length?'🔊 '+n.join(', '):''}}
const V=window.spVoice=mkVoice({room:()=>(typeof RM!=='undefined'?RM:null),toast:t=>toast(t),onChange:ui});
act.mic=async()=>{if(!V.on){const ok=await V.join();if(ok)toast(V.hasMic?'Voice aktif · tap = mute, tahan = keluar':'Voice aktif sebagai pendengar')}else V.mute()};
{const b=micBtn();if(b){let t=0,lp=0;b.addEventListener('pointerdown',()=>{lp=0;clearTimeout(t);t=setTimeout(()=>{if(V.on){lp=1;V.leave();toast('Keluar dari voice chat')}},650)});
 ['pointerup','pointerleave','pointercancel'].forEach(ev=>b.addEventListener(ev,()=>clearTimeout(t)));
 b.addEventListener('click',e=>{if(lp){lp=0;e.stopImmediatePropagation();e.preventDefault()}},true)}}
const _sg=stopGame;stopGame=function(){try{V.leave()}catch(e){}return _sg.apply(this,arguments)};
})();
;

/* ===== 35-v12.js ===== */
/* ===== v12: animasi terlihat di Avatar model + bagikan map ke teman ===== */
(function(){
const NOW=()=>performance.now();
const EMD={wave:2.5,dance:3.5,jump:1.2};
/* --- pemetaan anggota badan (nama + tebakan posisi) --- */
function limbName(n){n=String(n||'').toLowerCase().replace(/[_\s\-.]/g,'');if(!n)return null;const L=/(left|kiri)/.test(n),Rt=/(right|kanan)/.test(n);
 if(/(arm|lengan|hand|tangan|shoulder|bahu)/.test(n)){if(L)return'aL';if(Rt)return'aR'}
 if(/(leg|kaki|foot|shoe|sepatu|thigh|paha)/.test(n)){if(L)return'lL';if(Rt)return'lR'}return null}
function limbGuess(x,y){const ax=Math.abs(x);if(ax>=.55&&y>=.8&&y<=2.4)return x<0?'aL':'aR';if(y<1&&ax>=.05&&ax<=.6)return x<0?'lL':'lR';return null}
window.__limbName=limbName;
window.__limbPick=function(nm,ob,A,L,named){const k=named?limbName(nm):limbGuess(+(ob&&ob.x)||0,+(ob&&ob.y)||0);
 return k==='aL'?A[0]:k==='aR'?A[1]:k==='lL'?L[0]:k==='lR'?L[1]:null};
/* --- pose animasi (dipasang SEBELUM render, dikembalikan sesudahnya) --- */
function snap(g){return{y:g.position.y,ry:g.rotation.y,rz:g.rotation.z,l:g.l.map(x=>[x.rotation.x,x.rotation.z]),a:g.a.map(x=>[x.rotation.x,x.rotation.z])}}
function back(g,s){g.position.y=s.y;g.rotation.y=s.ry;g.rotation.z=s.rz;g.l.forEach((x,i)=>{x.rotation.x=s.l[i][0];x.rotation.z=s.l[i][1]});g.a.forEach((x,i)=>{x.rotation.x=s.a[i][0];x.rotation.z=s.a[i][1]})}
function pose(g,k,t){
 if(k==='wave'){g.a[1].rotation.x=-2.9+Math.sin(t*10)*.2;g.a[1].rotation.z=-.25+Math.sin(t*10)*.45;g.rotation.z=Math.sin(t*9)*.05}
 else if(k==='dance'){const s=Math.sin(t*8)*.9;g.rotation.y+=t*7;g.position.y+=Math.abs(Math.sin(t*8))*.35;g.a[0].rotation.x=-2.6+s*.3;g.a[1].rotation.x=-2.6-s*.3;g.l[0].rotation.x=s;g.l[1].rotation.x=-s}
 else if(k==='jump'){const u=Math.min(1,t/EMD.jump);g.position.y+=Math.sin(u*Math.PI)*1.3;g.a[0].rotation.x=g.a[1].rotation.x=-2.7;g.l[0].rotation.x=.4;g.l[1].rotation.x=-.4}}
let myE=null;
function moving(){try{if(Math.hypot(joy.x,joy.y)>.2)return true;return !!(keys.w||keys.a||keys.s||keys.d||keys.arrowup||keys.arrowdown||keys.arrowleft||keys.arrowright)}catch(e){return false}}
function hookPresence(){try{if(RM&&!RM.__emw){const f=RM.presence;RM.presence=function(o){if(o&&o.n!=null){if(myE)o.em=myE.k+':'+myE.id;if(window.__heldTool)o.tl=String(window.__heldTool).slice(0,24);try{const u=+me.uid;if(u>0)o.u=u}catch(e){}try{const fx=window.__ownFx&&window.__ownFx();if(fx&&fx.length)o.fx=fx}catch(e){}}return f.apply(this,arguments)};RM.__emw=1}}catch(e){}}
function startEmo(k){myE={k,t0:NOW(),id:Math.random().toString(36).slice(2,6)};try{lastSent=''}catch(e){}}
const _gm=act.gma;
act.gma=function(v,t){if(EMD[v]&&!moving())startEmo(v);return _gm.apply(this,arguments)};
function pre(){
 if(typeof scene==='undefined'||typeof plr==='undefined'||!plr||!plr.l||!plr.a)return null;
 const undo=[];hookPresence();
 const t=NOW();
 if(myE){const e=(t-myE.t0)/1000;if(e>EMD[myE.k]||moving()||(typeof RT!=='undefined'&&RT&&RT.dead)){myE=null;try{lastSent=''}catch(x){}}}
 try{const s=snap(plr);undo.push(()=>back(plr,s));
  if(myE)pose(plr,myE.k,(t-myE.t0)/1000);
  else if(typeof window.__armPose==='number')plr.a[1].rotation.x=window.__armPose}catch(e){}
 try{for(const k in remote){const o=remote[k],g=o.g;if(!g||!g.l||!g.a)continue;
  if(o.emo){const e=(t-o.emo.t0)/1000;if(e>EMD[o.emo.k])o.emo=null}
  if(o.emo||o.hg){const s=snap(g);undo.push(()=>back(g,s));if(o.hg)g.a[1].rotation.x=-1.45;if(o.emo)pose(g,o.emo.k,(t-o.emo.t0)/1000)}}}catch(e){}
 return()=>undo.forEach(f=>{try{f()}catch(e){}})}
function wrapR(){try{if(typeof R==='undefined'||!R||R.__w)return;const _r=R.render.bind(R);
 R.render=function(s,c){let post=null;if(s===scene){try{post=pre()}catch(e){}}const r=_r(s,c);if(post)try{post()}catch(e){}return r};R.__w=1}catch(e){}}
wrapR();
const _sg12=startGame;startGame=function(){const r=_sg12.apply(this,arguments);wrapR();return r};
/* --- emote pemain lain --- */
const _sp=syncPeers;
syncPeers=function(peers){_sp.apply(this,arguments);
 try{(peers||[]).forEach(p=>{const q=p&&p.presence;if(!q||p.isMe)return;const o=remote[p.peer];if(!o)return;const em=typeof q.em==='string'?q.em.slice(0,12):'';
  if(o.emS===undefined){o.emS=em;return}
  if(em!==o.emS){o.emS=em;const k=em.split(':')[0];if(em&&EMD[k])o.emo={k,t0:NOW()}}})}catch(e){}};

/* ===== Bagikan map ke teman ===== */
const esc2=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const MAXB=240000;
function b64(u8){let s='';for(let i=0;i<u8.length;i+=8192)s+=String.fromCharCode.apply(null,u8.subarray(i,i+8192));return btoa(s)}
function unb64(s){const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u}
async function enc(o){const j=JSON.stringify(o);
 if(window.CompressionStream){try{const st=new Blob([j]).stream().pipeThrough(new CompressionStream('gzip'));return'z1:'+b64(new Uint8Array(await new Response(st).arrayBuffer()))}catch(e){}}
 return'j1:'+b64(new TextEncoder().encode(j))}
async function dec(s){s=String(s||'');if(s.length>MAXB*1.5)throw 0;const k=s.slice(0,3),u=unb64(s.slice(3));
 if(k==='z1:'){const st=new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'));const buf=await new Response(st).arrayBuffer();if(buf.byteLength>3e6)throw 0;return JSON.parse(new TextDecoder().decode(buf))}
 if(k==='j1:'){if(u.length>3e6)throw 0;return JSON.parse(new TextDecoder().decode(u))}
 throw 0}
const hx6=(c,f)=>/^#[0-9a-f]{6}$/i.test(c||'')?c:f;
function shClean(g,from,ts){if(!g||typeof g!=='object'||!Array.isArray(g.objs))return null;
 const d=JSON.parse(JSON.stringify(g));['thumb','icon','by','mb','mine','rp','sh','apiKey'].forEach(k=>delete d[k]);
 d.id='sh'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);d.name=String(d.name||'Map').slice(0,22);d.emoji=String(d.emoji||'').slice(0,4);d.desc=String(d.desc||'').slice(0,140);
 d.col=hx6(d.col,'#b6f25a');d.sky=hx6(d.sky,'#7df9ff');if(d.objs.length>4000)d.objs.length=4000;
 d.pub=false;d.mine=1;d.sh={f:String(from).slice(0,20),t:+ts||Date.now()};return d}
function friends(){try{return FRD(me).f.filter(n=>{try{return typeof isBot==='function'?!isBot(n):true}catch(e){return true}})}catch(e){return[]}}
let SM=null;
function ensureM(){if(SM)return SM;SM=document.createElement('div');SM.id='shm';SM.innerHTML='<div class="bx"><div class="hd"></div><div class="sb2"></div><div class="ls"></div><div class="ft"><button data-x="1">Tutup</button></div></div>';document.body.appendChild(SM);
 SM.addEventListener('click',e=>{if(e.target===SM||e.target.dataset.x)SM.classList.remove('on')});return SM}
function openShare(id){
 const g=(me.games||[]).find(x=>x.id==id);if(!g)return toast('Map tidak ditemukan');
 const m=ensureM(),fl=friends();m.querySelector('.hd').textContent='Bagikan "'+String(g.name||'Map').slice(0,22)+'"';
 m.querySelector('.sb2').textContent='Teman akan menerima salinan map sebagai draft (maks. ~30 detik).';
 const ls=m.querySelector('.ls');
 ls.innerHTML=fl.length?fl.map(n=>'<div class="fr"><b>'+esc2(n)+'</b><button data-n="'+esc2(n)+'">Kirim</button></div>').join(''):'<div class="em">Belum ada teman. Tambah teman dulu lewat menu Teman.</div>';
 ls.onclick=async e=>{const b=e.target.closest('button[data-n]');if(!b||b.disabled)return;b.disabled=true;b.textContent='...';
  try{const pk={n:g.name,g:g},z=await enc(pk);if(z.length>MAXB){b.textContent='Kirim';b.disabled=false;return toast('Map terlalu besar untuk dibagikan. Pakai Ekspor.')}
   const ev={id:Math.random().toString(36).slice(2,10),to:b.dataset.n,from:me.name,t:'share',x:z,av:me.av,ts:Date.now()};
   if(!window.spInboxPut)throw new Error('layanan kirim belum siap');
   const ok=await window.spInboxPut(ev);if(!ok)throw new Error('koneksi ke server pesan gagal, coba lagi');
   b.textContent='Terkirim ✓';toast('Map dikirim ke '+b.dataset.n)}
  catch(x){b.textContent='Kirim';b.disabled=false;toast('Gagal mengirim: '+String((x&&x.message)||x||'error').slice(0,80))}};
 m.classList.add('on')}
act.shshare=function(v){try{if(typeof me==='undefined'||!me)return;try{act.shx&&act.shx()}catch(e){}openShare(v)}catch(e){toast('Gagal membuka menu bagikan: '+String((e&&e.message)||e).slice(0,80))}};
/* terima */
const _oe=window.__spOnEv;
window.__spOnEv=function(p){
 if(p&&p.t==='share'&&typeof me!=='undefined'&&me&&p.to===me.name&&p.from){
  me.shd=me.shd||[];if(me.shd.includes(p.id))return;me.shd.push(p.id);if(me.shd.length>100)me.shd.shift();
  const from=String(p.from).slice(0,20);
  if(!FRD(me).f.includes(from)){return}
  if((me.games||[]).filter(g=>g.sh).length>=30){return}
  dec(p.x).then(pk=>{const d=shClean(pk&&pk.g,from,p.ts);if(!d)return;me.games.push(d);save();
   try{pushNote(me,from+' membagikan map "'+d.name+'"')}catch(e){}try{toast(from+' membagikan map "'+d.name+'"')}catch(e){}try{refreshUI()}catch(e){}try{navRender()}catch(e){}}).catch(()=>{});
  return}
 return _oe?_oe.apply(this,arguments):undefined};
/* Beranda */
const _hh=homeH;
homeH=function(){let h=_hh.apply(this,arguments);try{const L=(me.games||[]).filter(g=>g.sh);if(L.length)h+='<h3 class="sec">Dibagikan teman</h3><div class="hs">'+L.map(gcard).join('')+'</div>'}catch(e){}return h};
/* Studio: menu Bagikan */
let curEd=null;
const _eo=edOpen;edOpen=function(d,k){curEd=k=='g'?d:null;const r=_eo.apply(this,arguments);setTimeout(addMenu,50);return r};
function addMenu(){try{const rm=document.getElementById('rmenu');if(!rm||document.getElementById('shmn'))return;
 const d=document.createElement('div');d.className='mn';d.id='shmn';d.innerHTML='<b>Bagikan</b>';
 d.addEventListener('click',()=>{if(curEd&&(me.games||[]).includes(curEd))openShare(curEd.id);else toast('Hanya map yang bisa dibagikan')});rm.appendChild(d)}catch(e){}}
setTimeout(addMenu,1500);
})();
;

/* ===== 36-v12b.js ===== */
/* ===== v12b: efek lewat script (ParticleEmitter, Fire, Smoke, Sparkles, Explosion, PointLight) ===== */
(function(){
const TYPES={ParticleEmitter:1,Fire:1,Smoke:1,Sparkles:1,Explosion:1,PointLight:1};
const MAXP=500;let live=[],parts=[],raf=0,last=0;
const BG=new THREE.BoxGeometry(1,1,1);
const col=(v,d)=>{try{if(v&&typeof v.r==='number')return new THREE.Color(v.r,v.g,v.b)}catch(e){}return new THREE.Color(d)};
const num=(v,d,a,b)=>{v=+v;if(!isFinite(v))v=d;return Math.max(a,Math.min(b,v))};
const DEF={
 ParticleEmitter:{Rate:20,Lifetime:1.5,Speed:5,Size:.3,Spread:35,Gravity:0,Color:[1,1,1],Grow:0,Add:1},
 Fire:{Rate:28,Lifetime:.9,Speed:3,Size:.7,Spread:14,Gravity:-4,Color:[1,.45,.05],Grow:-.6,Add:1},
 Smoke:{Rate:10,Lifetime:2.6,Speed:2,Size:.8,Spread:20,Gravity:-1,Color:[.45,.45,.45],Grow:1.4,Add:0},
 Sparkles:{Rate:24,Lifetime:.8,Speed:2.2,Size:.18,Spread:180,Gravity:0,Color:[1,.9,.3],Grow:-.5,Add:1},
 Explosion:{Rate:0,Lifetime:.8,Speed:18,Size:.5,Spread:180,Gravity:12,Color:[1,.5,.1],Grow:-.4,Add:1},
 PointLight:{}};
class EW{
 constructor(cls){this.cls=cls;this.nm=cls;this.par=null;this.en=true;this.acc=0;this.alive=true;this.eid=Math.random().toString(36).slice(2,8);this.an=null;this.p=Object.assign({},DEF[cls]);
  this.p.Color=new THREE.Color(...(DEF[cls].Color||[1,1,1]));this.pos=null;this.age=0;
  if(cls==='PointLight'){this.p.Brightness=1;this.p.Range=16;this.p.Color=new THREE.Color(1,1,1);this.l=new THREE.PointLight(0xffffff,1,16)}
  if(cls==='Explosion'){this.p.BlastRadius=6;this.fired=false}}
 origin(){let x=0,y=3,z=0;try{const A=this.an;
  if(A==='part'){const i=this.pinf();if(i)return{x:i.x,y:i.y,z:i.z}}
  if(this.rem){const g=this.rem.g;if(this.q&&A==='rbody'){const v=g.localToWorld(new THREE.Vector3(this.q[0],this.q[1],this.q[2]));return{x:v.x,y:v.y,z:v.z}}if(A==='rtool'&&this.rem.hg){const v=new THREE.Vector3();this.rem.hg.getWorldPosition(v);return{x:v.x,y:v.y,z:v.z}}return{x:g.position.x,y:g.position.y+1.5,z:g.position.z}}
  if(A==='tool'&&window.__heldMesh&&window.__heldTool===this.tid){const v=new THREE.Vector3();window.__heldMesh.getWorldPosition(v);return{x:v.x,y:v.y,z:v.z}}
  if(A==='body'||A==='tool')return{x:P.x,y:P.y+1.5,z:P.z};
  if(this.pos){x=this.pos.x;y=this.pos.y;z=this.pos.z}else if(this.par&&this.par.$g){const v=this.par.$g('Position');if(v&&typeof v.x==='number'){x=v.x;y=v.y;z=v.z}}}catch(e){}return{x,y,z}}
 /* efek di dalam Part aksesoris: keluar dari part itu & ukuran/jumlah/kecepatan ikut ukuran part */
 pinf(){try{if(this.am){const m=this.am,v=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();m.updateWorldMatrix(true,false);m.matrixWorld.decompose(v,q,s);return{x:v.x,y:v.y,z:v.z,k:Math.max(.05,Math.min(20,(s.x+s.y+s.z)/3)),m}}
  if(this.q&&typeof plr!=='undefined'&&plr){const v=plr.localToWorld(new THREE.Vector3(this.q[0],this.q[1],this.q[2]));return{x:v.x,y:v.y,z:v.z,k:Math.max(.05,Math.min(20,+this.q[3]||1))}}}catch(e){}return null}
 kf(){if(this.an==='part'){const i=this.pinf();return i?i.k:1}if(this.q&&this.rem)return Math.max(.05,Math.min(20,+this.q[3]||1));return 1}
 rf(){return(this.an==='part'||(this.q&&this.rem))?(.5+.8*this.kf()):1}
 $g(k){const p=this.p;switch(k){
  case'Name':return this.nm;case'ClassName':return this.cls;case'Parent':return this.par;
  case'Enabled':return this.en;case'Destroy':return()=>this.destroy();case'Emit':return(_,n)=>this.emit(num(n,10,0,200));
  case'Rate':return p.Rate;case'Lifetime':return p.Lifetime;case'Speed':return p.Speed;case'Size':return p.Size;case'SpreadAngle':return p.Spread;
  case'Acceleration':return p.Gravity;case'Color':return new LC(p.Color.r,p.Color.g,p.Color.b);
  case'Brightness':return p.Brightness;case'Range':return p.Range;case'BlastRadius':return p.BlastRadius;
  case'Position':{const o=this.origin();return new LV(o.x,o.y,o.z)}}}
 $s(k,v){const p=this.p;switch(k){
  case'Name':this.nm=String(v);break;
  case'Parent':if(v==null){this.destroy();break}this.par=v;this.an=null;try{if(v&&(v.$am||v.$q)){this.an='part';this.am=v.$am||null;this.q=Array.isArray(v.$q)&&v.$q.length===4?v.$q.map(Number):null}else if(v===RT.ch||v instanceof RootW)this.an='body';else if(v&&v.i&&v.i.cls==='Tool'){this.an='tool';this.tid=String(v.i.id)}}catch(x){}if(!live.includes(this)){live.push(this);if(this.l)scene.add(this.l);kick()}break;
  case'Enabled':this.en=!!v;break;
  case'Rate':p.Rate=num(v,p.Rate,0,200);break;case'Lifetime':p.Lifetime=num(v,p.Lifetime,.05,15);break;
  case'Speed':p.Speed=num(v,p.Speed,0,80);break;case'Size':p.Size=num(v,p.Size,.02,20);break;
  case'SpreadAngle':p.Spread=num(v,p.Spread,0,180);break;case'Acceleration':p.Gravity=num(v,p.Gravity,-80,80);break;
  case'Color':p.Color=col(v,'#ffffff');if(this.l)this.l.color.copy(p.Color);break;
  case'Brightness':p.Brightness=num(v,1,0,20);if(this.l)this.l.intensity=p.Brightness;break;
  case'Range':p.Range=num(v,16,1,200);if(this.l)this.l.distance=p.Range;break;
  case'BlastRadius':p.BlastRadius=num(v,6,.5,60);break;
  case'Position':if(v&&typeof v.x==='number'){this.pos={x:v.x,y:v.y,z:v.z};if(!live.includes(this)){live.push(this);kick()}}break}}
 emit(n){const o=this.origin(),p=this.p,sp=p.Spread*Math.PI/180,K=this.kf(),PI=this.an==='part'?this.pinf():null,Kp=(this.an==='part'||(this.q&&this.rem))?(.4+.6*K):1;
  for(let i=0;i<n&&parts.length<MAXP;i++){
   const a=Math.random()*Math.PI*2,t=Math.acos(1-Math.random()*(1-Math.cos(sp))),sx=Math.sin(t)*Math.cos(a),sy=Math.cos(t),sz=Math.sin(t)*Math.sin(a);
   const mt=new THREE.MeshBasicMaterial({color:p.Color.clone(),transparent:true,opacity:1,depthWrite:false});
   if(this.cls!=='Smoke')mt.blending=THREE.AdditiveBlending;
   if(this.cls==='Sparkles')mt.color.setHSL(Math.random(),1,.65);
   const m=new THREE.Mesh(BG,mt),sz0=p.Size*(.6+Math.random()*.8)*K;
   if(PI&&PI.m)m.position.copy(PI.m.localToWorld(new THREE.Vector3(Math.random()-.5,Math.random()-.5,Math.random()-.5)));
   else if(K!==1)m.position.set(o.x+(Math.random()-.5)*K,o.y+(Math.random()-.5)*K,o.z+(Math.random()-.5)*K);
   else m.position.set(o.x+(Math.random()-.5)*.6,o.y+(Math.random()-.5)*.3,o.z+(Math.random()-.5)*.6);m.scale.setScalar(sz0);m.rotation.set(Math.random()*6,Math.random()*6,0);
   const sv=p.Speed*(.5+Math.random()*.7)*Kp;
   parts.push({m,mt,vx:sx*sv,vy:sy*sv,vz:sz*sv,g:p.Gravity,life:p.Lifetime*(.7+Math.random()*.6),age:0,s0:sz0,gr:this.cls==='Explosion'?-.4:(this.cls==='Smoke'?1.4:this.cls==='Fire'?-.6:this.cls==='Sparkles'?-.5:0)});scene.add(m)}}
 destroy(){if(!this.alive)return;this.alive=false;const i=live.indexOf(this);if(i>=0)live.splice(i,1);if(this.l&&this.l.parent)this.l.parent.remove(this.l)}}
function clearAll(){live.forEach(e=>{e.alive=false;if(e.l&&e.l.parent)e.l.parent.remove(e.l)});live=[];parts.forEach(q=>{try{q.m.parent&&q.m.parent.remove(q.m);q.mt.dispose()}catch(e){}});parts=[]}
function kick(){if(!raf){last=performance.now();raf=requestAnimationFrame(tick)}}
function tick(now){raf=0;const dt=Math.min(.05,(now-last)/1000);last=now;
 if(typeof RT==='undefined'||!RT||!RT.alive){clearAll();return}
 for(const e of live.slice()){if(!e.alive)continue;e.age+=dt;
  if(e.rem&&!Object.values(remote).includes(e.rem)){e.destroy();continue}
  if(e.l){const o=e.origin();e.l.position.set(o.x,o.y,o.z)}
  else if(e.cls==='Explosion'){if(!e.fired){e.fired=true;e.emit(70);const o=e.origin();try{burst(o.x,o.y,o.z,'#ffc400',18)}catch(x){}
    e.flash=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),new THREE.MeshBasicMaterial({color:0xffaa33,transparent:true,opacity:.7,depthWrite:false,blending:THREE.AdditiveBlending}));e.flash.position.set(o.x,o.y,o.z);scene.add(e.flash)}
   if(e.flash){const u=e.age/.45;e.flash.scale.setScalar(.5+u*e.p.BlastRadius*.5);e.flash.material.opacity=Math.max(0,.7*(1-u));if(u>=1){scene.remove(e.flash);e.flash.geometry.dispose();e.flash.material.dispose();e.flash=null}}
   if(e.age>2&&!e.flash)e.destroy()}
  else if(e.en&&e.p.Rate>0&&(e.an!=='tool'||window.__heldTool===e.tid)&&(e.an!=='rtool'||e.rem.hg)){e.acc+=e.p.Rate*dt*e.rf();const n=Math.floor(e.acc);if(n>0){e.acc-=n;e.emit(n)}}}
 for(let i=parts.length-1;i>=0;i--){const q=parts[i];q.age+=dt;const u=q.age/q.life;
  if(u>=1){scene.remove(q.m);q.mt.dispose();parts.splice(i,1);continue}
  q.vy-=q.g*dt;
  q.m.position.x+=q.vx*dt;q.m.position.y+=q.vy*dt;q.m.position.z+=q.vz*dt;
  q.m.scale.setScalar(Math.max(.01,q.s0*(1+q.gr*u)));q.mt.opacity=1-u*u;q.m.rotation.z+=dt*2}
 if(live.length||parts.length)raf=requestAnimationFrame(tick)}
const hex=c=>'#'+c.getHexString();
const r1=v=>Math.round((+v||0)*100)/100;
let fxSig='';
const qo=e=>{try{if(e.an!=='part')return undefined;if(e.q)return e.q.map(r1);const o=e.am&&e.am.userData&&e.am.userData.o;if(!o)return undefined;return[o.x,o.y,o.z,(+o.sx+ +o.sy+ +o.sz)/3].map(r1)}catch(x){return undefined}};
window.__ownFx=function(){const o=live.filter(e=>e.alive&&!e.rem&&(e.an==='body'||e.an==='part'||(e.an==='tool'&&window.__heldTool===e.tid))&&!(e.cls==='Explosion'&&e.age>2.2)).slice(0,6).map(e=>{const p=e.p;
  return{i:e.eid,c:e.cls,q:qo(e),t:e.an==='tool'?'tool':'body',e:e.en?1:0,r:r1(p.Rate),l:r1(p.Lifetime),s:r1(p.Speed),z:r1(p.Size),a:r1(p.Spread),g:r1(p.Gravity),k:hex(p.Color),b:r1(p.BlastRadius||p.Brightness||0),n:r1(p.Range||0)}});
 const sg=JSON.stringify(o);if(sg!==fxSig){fxSig=sg;try{lastSent=''}catch(x){}}return o};
window.__applyFx=function(o,list){if(!o)return;const m=o.fxm=o.fxm||{},seen={};
 (Array.isArray(list)?list.slice(0,6):[]).forEach(d=>{try{if(!d||typeof d.i!=='string'||!TYPES[d.c])return;const id=d.i.slice(0,8);seen[id]=1;let e=m[id];
  const hx6=/^#[0-9a-f]{6}$/i.test(d.k||'')?d.k:'#ffffff';
  if(!e){e=new EW(d.c);e.rem=o;e.an=d.t==='tool'?'rtool':'rbody';e.eid=id;m[id]=e;live.push(e);if(e.l)scene.add(e.l);kick()}
  const p=e.p;e.en=!!d.e;e.q=Array.isArray(d.q)&&d.q.length===4?d.q.map(v=>num(v,0,-30,30)):null;
  if(d.c==='PointLight'){p.Brightness=num(d.b,1,0,5);p.Range=num(d.n,16,1,40);e.l.intensity=p.Brightness;e.l.distance=p.Range;p.Color=new THREE.Color(hx6);e.l.color.copy(p.Color)}
  else{p.Rate=num(d.r,p.Rate,0,60);p.Lifetime=num(d.l,p.Lifetime,.05,6);p.Speed=num(d.s,p.Speed,0,30);p.Size=num(d.z,p.Size,.02,4);p.Spread=num(d.a,p.Spread,0,180);p.Gravity=num(d.g,p.Gravity,-30,30);p.Color=new THREE.Color(hx6);if(d.c==='Explosion')p.BlastRadius=num(d.b,6,.5,20)}}catch(x){}});
 for(const id in m)if(!seen[id]){try{m[id].destroy()}catch(x){}delete m[id]}};
const I=G.get('Instance'),_n=I&&I.get('new');
if(I&&_n)I.set('new',function(cls,par){if(TYPES[cls]){const w=new EW(cls);if(par!==undefined)w.$s('Parent',par);return w}return _n.apply(this,arguments)});
/* referensi Luau */
try{const r=document.getElementById('sref');if(r)r.insertAdjacentHTML('beforeend','<br><b>Efek:</b> <code>Instance.new("Fire"|"Smoke"|"Sparkles"|"ParticleEmitter"|"Explosion"|"PointLight", part)</code> <code>.Rate .Lifetime .Speed .Size .Color .Enabled</code> <code>:Emit(n)</code> <code>:Destroy()</code>')}catch(e){}
})();
;

/* ===== 37-v12c.js ===== */
/* ===== v12c: tombol ＋ di Part/Model/Folder/Script + efek sebagai anak objek ===== */
(function(){
const FXC=['Fire','Smoke','Sparkles','ParticleEmitter','Explosion','PointLight'];
const OBJC=['Script','ModuleScript','Folder'].concat(FXC);
const FXD={
 Fire:{Rate:28,Lifetime:.9,Speed:3,Size:.7,SpreadAngle:14,Acceleration:-4,Color:'#ff7300',Enabled:true},
 Smoke:{Rate:10,Lifetime:2.6,Speed:2,Size:.8,SpreadAngle:20,Acceleration:-1,Color:'#737373',Enabled:true},
 Sparkles:{Rate:24,Lifetime:.8,Speed:2.2,Size:.18,SpreadAngle:180,Acceleration:0,Color:'#ffe64d',Enabled:true},
 ParticleEmitter:{Rate:20,Lifetime:1.5,Speed:5,Size:.3,SpreadAngle:35,Acceleration:0,Color:'#ffffff',Enabled:true},
 Explosion:{BlastRadius:6,Color:'#ff8019'},
 PointLight:{Brightness:1,Range:16,Color:'#ffffff'}};
const FP={Fire:['Rate','Lifetime','Speed','Size','SpreadAngle','Acceleration'],Smoke:['Rate','Lifetime','Speed','Size','SpreadAngle','Acceleration'],Sparkles:['Rate','Lifetime','Speed','Size','SpreadAngle','Acceleration'],ParticleEmitter:['Rate','Lifetime','Speed','Size','SpreadAngle','Acceleration'],Explosion:['BlastRadius'],PointLight:['Brightness','Range']};
Object.assign(CL,{Fire:'',Smoke:'',Sparkles:'',ParticleEmitter:'',Explosion:'',PointLight:''});
Object.assign(CD,{Fire:'Api menyala di Part induknya',Smoke:'Asap yang naik dari Part',Sparkles:'Percikan warna-warni di Part',ParticleEmitter:'Pemancar partikel (atur Rate, Speed, Warna)',Explosion:'Ledakan sekali jalan di posisi Part',PointLight:'Cahaya titik yang menyala di Part'});
FXC.forEach(c=>{if(!PL.Workspace.includes(c))PL.Workspace.push(c)});
/* newI: isi nilai default efek */
const _ni=newI;newI=function(cls){const i=_ni.apply(this,arguments);if(FXD[cls]){i.fx=1;Object.assign(i,FXD[cls])}return i};
/* picker: Part/Model/objek 3D, Folder, Script */
const _pk2=pickL;pickL=function(t){let L=_pk2(t);
 try{const have=new Set(L.map(x=>x.id)),add=c=>{if(!have.has(c)){have.add(c);L.push({id:c,k:'inst',n:c,ic:CL[c],d:CD[c]})}};
  if(t==='@acc')OBJC.concat(['LocalScript','RemoteEvent','RemoteFunction','BindableEvent','Sound']).forEach(add);
  else if(ST&&ST.d&&(ST.d.objs||[]).some(o=>o.id==t))OBJC.concat(ST.kind==='a'?['LocalScript']:[]).forEach(add);
  else{const r=loc(t);if(r){const cl=r.i.cls;if(cl==='Folder'||/Script$/.test(cl)&&cl!=='LocalScript')OBJC.concat(ST.kind==='a'?['LocalScript']:[]).forEach(add)}}}catch(e){}
 return L};
/* properti efek */
const _ip=iProps;iProps=function(i){if(!i||!i.fx)return _ip.apply(this,arguments);
 const f=FP[i.cls]||[];let h='<h4>'+(CL[i.cls]||'')+' '+i.cls+'</h4><label>Nama</label><input type="text" data-q="n" value="'+esc(i.n)+'" maxlength="24">';
 f.forEach(k=>h+='<label>'+k+'</label><input type="number" step="any" data-q="'+k+'" value="'+(+i[k]||0)+'">');
 h+='<label>Color</label><input type="color" data-q="Color" value="'+(/^#[0-9a-f]{6}$/i.test(i.Color)?i.Color:'#ffffff')+'">';
 if(i.Enabled!==undefined)h+='<label class="ck"><input type="checkbox" data-q="Enabled" '+(i.Enabled!==false?'checked':'')+'> Enabled</label>';
 h+='<div style="font-size:11px;opacity:.7;margin-top:6px">Efek tampil di Part induknya saat game dimainkan (Test / Main).</div>';return h};
/* runtime */
const num=(v,d)=>{v=+v;return isFinite(v)?v:d};
function lc(h){const m=/^#([0-9a-f]{6})$/i.exec(h||'');if(!m)return new LC(1,1,1);const n=parseInt(m[1],16);return new LC((n>>16&255)/255,(n>>8&255)/255,(n&255)/255)}
function mkFx(n,par){const w=G.get('Instance').get('new')(n.cls);
 ['Rate','Lifetime','Speed','Size','SpreadAngle','Acceleration','Brightness','Range','BlastRadius'].forEach(k=>{if(n[k]!==undefined)w.$s(k,num(n[k],0))});
 if(n.Color)w.$s('Color',lc(n.Color));if(n.Enabled===false)w.$s('Enabled',false);w.$s('Name',n.n||n.cls);w.$s('Parent',(Array.isArray(n.pq)&&n.pq.length===4&&par===RT.root)?{$q:n.pq}:par);return w}
function walk(list,parW,posW,fxOnly,dep,acc){if(dep>12)return;(list||[]).forEach(n=>{if(!n)return;
 try{if(FXD[n.cls]){if(!(acc&&window.__nfx))mkFx(n,posW||RT.ws)}
  else if((n.cls==='Script'||acc&&n.cls==='LocalScript')&&!fxOnly)runScript(n,parW);
  else if(n.cls==='Folder')walk(n.ch,iW(n),posW,fxOnly,dep+1,acc);
  if(/Script$/.test(n.cls)&&n.ch&&n.ch.length)walk(n.ch,parW,posW,fxOnly,dep+1,acc)}catch(e){OUT('err',(n.n||n.cls)+' → '+(e.message||e))}})}
const _rs=rtStart;rtStart=function(g){_rs.apply(this,arguments);
 try{if(!RT||!RT.alive||!g||!g.svc)return;
  (RT.parts||[]).forEach(w=>{if(w.o&&w.o.ch&&w.o.ch.length)walk(w.o.ch,w,w,false,0)});
  walk((g.svc.Workspace||[]).filter(x=>x.cls==='Folder'),RT.ws,null,true,0);
  {const tl=[],col=l=>(l||[]).forEach(i=>{if(i.cls==='Tool')tl.push(i);else if(i.cls==='Folder')col(i.ch)});col(g.svc.StarterPack);tl.forEach(t=>{if(t.ch&&t.ch.length){const w=iW(t);walk(t.ch,w,w,true,0)}})}
  {const ids=(forceAcc||(me.av&&me.av.acc)||[]).slice();if(me.av&&me.av.body&&!ids.includes(me.av.body))ids.push(me.av.body);
   const fm=o=>{let r=null;try{plr.traverse(c=>{if(!r&&c.userData&&c.userData.o===o)r=c})}catch(e){}return r};
   ids.forEach(id=>{const it=(me.items||[]).find(x=>x.id==id);if(!it)return;if(it.ch&&it.ch.length)walk(it.ch,RT.ch,RT.root,false,0,true);(it.objs||[]).forEach(o=>{if(o&&o.ch&&o.ch.length){const mm=fm(o);walk(o.ch,RT.ch,mm?{$am:mm}:RT.root,false,0,true)}})})}}catch(e){OUT('err',e.message||e)}};
})();
;

/* ===== 38-v12d.js ===== */
/* ===== v12d: Tool terlihat di pemain lain + label User ID & username ===== */
(function(){
function findTool(id){const sv=(typeof curG!=='undefined'&&curG&&curG.svc)||{};let r=null;
 const f=l=>(l||[]).forEach(i=>{if(r||!i)return;if(i.cls==='Tool'&&String(i.id)===id)r=i;else if(i.cls==='Folder')f(i.ch)});
 f(sv.StarterPack);f(sv.Workspace);f(sv.ServerStorage);return r}
function dropTool(o){try{if(o.hg&&o.hg.parent)o.hg.parent.remove(o.hg)}catch(e){}o.hg=null}
function setTool(o,id){if(o.tlId===id)return;o.tlId=id;dropTool(o);if(!id)return;
 try{const it=findTool(id);if(!it||!window.__tbuild||!o.g||!o.g.a)return;const b=window.__tbuild(it);
  b.g.rotation.x=(isFinite(+it.gp)?+it.gp:90)*Math.PI/180;b.g.position.set(+it.gx||0,-.95+(+it.gy||0),+it.gz||0);o.g.a[1].add(b.g);o.hg=b.g}catch(e){}}
function subTag(n,u){const c=document.createElement('canvas');c.width=320;c.height=56;const x=c.getContext('2d');
 x.fillStyle='rgba(0,0,0,.62)';x.beginPath();x.roundRect?x.roundRect(2,2,316,52,14):x.rect(2,2,316,52);x.fill();
 const t='@'+String(n).slice(0,16)+(u?'  ·  ID '+u:'');let fs=26;x.textAlign='center';x.textBaseline='middle';
 do{x.font='bold '+fs+'px Arial';fs-=2}while(x.measureText(t).width>296&&fs>12);x.fillStyle='#fff';x.fillText(t,160,30);
 const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),depthTest:false,transparent:true}));s.scale.set(2.6,.455,1);s.position.y=3.12;s.renderOrder=9;return s}
const _sp2=syncPeers;
syncPeers=function(peers){_sp2.apply(this,arguments);
 try{(peers||[]).forEach(p=>{const q=p&&p.presence;if(!q||p.isMe||q.n==null)return;const o=remote[p.peer];if(!o)return;
  setTool(o,typeof q.tl==='string'?q.tl.slice(0,24):'');try{window.__applyFx&&window.__applyFx(o,q.fx)}catch(e){}
  const u=+q.u>0?Math.floor(+q.u):0,key=String(o.name)+'|'+u;
  if(o.idk!==key){o.idk=key;if(o.idt&&o.idt.parent)o.idt.parent.remove(o.idt);o.idt=subTag(o.name,u);o.g.add(o.idt)}})}catch(e){}};
})();
;

/* ===== 39-v12e.js ===== */
/* ===== v12e: editor Aksesoris bisa diisi Script, Folder, efek, dll ===== */
(function(){
function row(i,dep){const on=SI===i.id,cont=pickL(i.id).length;
 let h='<div class="er '+(on?'on':'')+'" style="padding-left:'+(18+dep*12)+'px" data-a="isel" data-v="'+i.id+'"><span>'+(CL[i.cls]||'▫')+' '+esc(i.n)+'</span><span>'+(cont?'<b class="px" data-a="padd" data-v="'+i.id+'">＋</b>':'')+(on?'<b class="px dx" data-a="idel" data-v="'+i.id+'">✕</b>':'')+'</span></div>';
 (i.ch||[]).forEach(c=>h+=row(c,dep+1));return h}
const _e5=eRender;eRender=function(){_e5.apply(this,arguments);
 try{if(!ST||ST.kind!=='a')return;const d=ST.d;d.ch=d.ch||[];
  let h='<div class="er '+(SEL=='root'&&!SI?'on':'')+'" data-a="esel" data-v="root"><b>'+esc(d.name)+'</b></div><div class="er ind">Workspace ('+d.objs.length+')</div>';
  d.objs.forEach(o=>{h+='<div class="er ind2 '+(o.id==SEL?'on':'')+'" data-a="esel" data-v="'+o.id+'"><span>'+(TI[o.t]||'')+' '+esc(o.n)+'</span><span><b class="px" data-a="padd" data-v="'+o.id+'">＋</b>'+(o.id==SEL?'<i data-a="edel" data-v="'+o.id+'">✕</i>':'')+'</span></div>';(o.ch||[]).forEach(c=>h+=row(c,2))});
  h+='<div class="er sv" data-a="padd" data-v="@acc"><span>▾ Isi aksesoris (umum)</span><b class="px">＋</b></div>'+d.ch.map(c=>row(c,0)).join('');
  $('#expl').innerHTML=h}catch(e){}};
const _p5=pRender;pRender=function(){
 try{if(ST&&ST.kind==='a'&&SI){const r=loc(SI);if(r&&SEL==='root'){$('#props').innerHTML=iProps(r.i);return}SI=null}}catch(e){SI=null}
 return _p5.apply(this,arguments)};
})();
;

/* ===== 40-v12f.js ===== */
/* ===== v12f: Beranda tidak di-refresh kalau datanya sama ===== */
(function(){
let lastSig='';
function sig(){try{const gs=pubGames();
 return JSON.stringify([gs.map(g=>[g.id,g.name,g.pl,g.lk,g._ts,g.n]),me.recent,FRD(me),
  Object.keys(users).filter(k=>users[k]&&users[k].rm).map(k=>[k,users[k].pres&&users[k].pres.g,JSON.stringify(users[k].av)]),
  (me.notes||[]).length,me.unr,me.bux,me.name,JSON.stringify(me.av),(me.games||[]).map(g=>g.id+':'+g.name+':'+(g.pub?1:0))])}catch(e){return String(Math.random())}}
const _ru=refreshUI;
refreshUI=function(){
 try{if(me&&page==='home'&&!(OVS&&OVS.length)){const m=$('#main');
   if(m&&m.firstElementChild&&sig()===lastSig)return;
   const top=m?m.scrollTop:0;const r=_ru.apply(this,arguments);if(m)m.scrollTop=top;lastSig=sig();return r}}catch(e){}
 return _ru.apply(this,arguments)};
const _rd2=render;
render=function(){const r=_rd2.apply(this,arguments);try{if(me&&page==='home')lastSig=sig()}catch(e){}return r};
})();
;

/* ===== 41-v12g.js ===== */
/* ===== v12g: pratinjau efek (Kustomisasi/Marketplace/Profil) + Profil avatar 3D ===== */
(function(){
const FXC=['Fire','Smoke','Sparkles','ParticleEmitter','Explosion','PointLight'];
const DEF={Fire:{r:28,l:.9,s:3,z:.7,a:14,g:-4,k:'#ff7300',gr:-.6,add:1},Smoke:{r:10,l:2.6,s:2,z:.8,a:20,g:-1,k:'#737373',gr:1.4,add:0},Sparkles:{r:24,l:.8,s:2.2,z:.18,a:180,g:0,k:'#ffe64d',gr:-.5,add:1},ParticleEmitter:{r:20,l:1.5,s:5,z:.3,a:35,g:0,k:'#ffffff',gr:0,add:1},Explosion:{r:0,l:.8,s:18,z:.5,a:180,g:12,k:'#ff8019',gr:-.4,add:1},PointLight:{}};
const nv=(v,d,a,b)=>{v=+v;return isFinite(v)?Math.max(a,Math.min(b,v)):d};
/* deskriptor efek dari item (anak Part/Folder/Script) */
function fxOf(it){const out=[];const w=(l,q)=>(l||[]).forEach(n=>{if(!n)return;if(FXC.indexOf(n.cls)>=0&&out.length<6)out.push({q:q,c:n.cls,e:n.Enabled===false?0:1,r:n.Rate,l:n.Lifetime,s:n.Speed,z:n.Size,a:n.SpreadAngle,g:n.Acceleration,k:n.Color,b:n.BlastRadius||n.Brightness||0,n:n.Range||0});if(n.ch)w(n.ch,q)});
 if(it){w(it.ch);(it.objs||[]).forEach(o=>o&&w(o.ch,[o.x,o.y,o.z,(+o.sx+ +o.sy+ +o.sz)/3].map(v=>Math.round((+v||0)*100)/100)))}return out}
window.__fxOf=fxOf;
const qk=d=>Array.isArray(d.q)&&d.q.length===4?Math.max(.05,Math.min(20,+d.q[3]||1)):1;
/* pratinjau 3D */
window.__pvFxInit=function(rec,S,G,a,extra){
 let ds=[];try{ds=ds.concat(Array.isArray(a&&a.pvfx)?a.pvfx:[]);const its=(typeof me!=='undefined'&&me&&me.items)||[];((a&&a.acc)||[]).forEach(id=>{const it=its.find(x=>x.id==id);if(it)ds=ds.concat(fxOf(it))})}catch(e){}
 ds=ds.filter(d=>d&&DEF[d.c]).slice(0,6);if(!ds.length)return;
 const geo=new THREE.BoxGeometry(1,1,1),ps=[],em=ds.map(d=>({d,acc:0,t:0,fired:false}));let last=performance.now();
 const emit=(d,n)=>{const F=DEF[d.c],sp=nv(d.a,F.a,0,180)*Math.PI/180;
  for(let i=0;i<n&&ps.length<260;i++){const ang=Math.random()*6.283,t=Math.acos(1-Math.random()*(1-Math.cos(sp))),sx=Math.sin(t)*Math.cos(ang),sy=Math.cos(t),sz=Math.sin(t)*Math.sin(ang);
   const mt=new THREE.MeshBasicMaterial({color:/^#[0-9a-f]{6}$/i.test(d.k||'')?d.k:F.k,transparent:true,opacity:1,depthWrite:false});if(F.add)mt.blending=THREE.AdditiveBlending;if(d.c==='Sparkles')mt.color.setHSL(Math.random(),1,.65);
   const m=new THREE.Mesh(geo,mt),K=qk(d),z0=nv(d.z,F.z,.02,4)*(.6+Math.random()*.8)*K,v=nv(d.s,F.s,0,30)*(.5+Math.random()*.7)*(Array.isArray(d.q)?(.4+.6*K):1);
   if(Array.isArray(d.q)&&d.q.length===4){G.updateWorldMatrix(true,false);const c=G.localToWorld(new THREE.Vector3(+d.q[0]||0,+d.q[1]||0,+d.q[2]||0));m.position.set(c.x+(Math.random()-.5)*K,c.y+(Math.random()-.5)*K,c.z+(Math.random()-.5)*K)}
   else m.position.set((Math.random()-.5)*.6,1.5+(Math.random()-.5)*.3,(Math.random()-.5)*.6);m.scale.setScalar(z0);m.rotation.set(Math.random()*6,Math.random()*6,0);S.add(m);
   ps.push({m,mt,vx:sx*v,vy:sy*v,vz:sz*v,g:nv(d.g,F.g,-30,30),life:nv(d.l,F.l,.05,6)*(.7+Math.random()*.6),age:0,z0,gr:F.gr})}};
 rec.pv=function(){const now=performance.now(),dt=Math.min(.05,(now-last)/1000);last=now;
  em.forEach(e=>{const d=e.d;e.t+=dt;
   if(d.c==='PointLight'){if(!e.l){e.l=new THREE.PointLight(/^#[0-9a-f]{6}$/i.test(d.k||'')?d.k:'#ffffff',nv(d.b,1,0,5),nv(d.n,16,1,40));e.l.position.set(0,1.8,3);S.add(e.l)}return}
   if(d.c==='Explosion'){if(!e.fired||e.t>2.6){e.fired=true;e.t=0;emit(d,60)}return}
   if(d.e===0)return;e.acc+=nv(d.r,DEF[d.c].r,0,60)*dt*(Array.isArray(d.q)?(.5+.8*qk(d)):1);const n=Math.floor(e.acc);if(n>0){e.acc-=n;emit(d,n)}});
  for(let i=ps.length-1;i>=0;i--){const q=ps[i];q.age+=dt;const u=q.age/q.life;if(u>=1){S.remove(q.m);q.mt.dispose();ps.splice(i,1);continue}
   q.vy-=q.g*dt;q.m.position.x+=q.vx*dt;q.m.position.y+=q.vy*dt;q.m.position.z+=q.vz*dt;q.m.scale.setScalar(Math.max(.01,q.z0*(1+q.gr*u)));q.mt.opacity=1-u*u;q.m.rotation.z+=dt*2}}};
/* beli: salin efek jadi isi aksesoris milik pembeli */
function fromDesc(d){const n=newI(d.c);const M={r:'Rate',l:'Lifetime',s:'Speed',z:'Size',a:'SpreadAngle',g:'Acceleration'};for(const k in M)if(d[k]!==undefined&&n[M[k]]!==undefined)n[M[k]]=+d[k];
 if(/^#[0-9a-f]{6}$/i.test(d.k||''))n.Color=d.k;if(d.c==='Explosion')n.BlastRadius=+d.b||6;if(d.c==='PointLight'){n.Brightness=+d.b||1;n.Range=+d.n||16}if(d.e===0&&n.Enabled!==undefined)n.Enabled=false;if(Array.isArray(d.q)&&d.q.length===4)n.pq=d.q.map(v=>+v||0);return n}
const _b3=act.buy2;act.buy2=function(k){const r=_b3.apply(this,arguments);
 try{const it=mkItems().find(x=>x.key===k),n=(me.items||[]).find(x=>x.src===k);if(it&&it.fx&&it.fx.length&&n&&!(n.ch&&n.ch.length)){n.ch=it.fx.map(fromDesc);save()}}catch(e){}return r};
/* Profil: avatar 3D mengikuti yang dipakai, bisa diputar */
function avOf(n){try{if(n===me.name)return{av:me.av,items:me.items||[]};const u=users[n];const pi=typeof pinfo==='function'?pinfo(n):null;const av=(pi&&pi.av)||(u&&u.av);return av?{av,items:(u&&u.items)||[]}:null}catch(e){return null}}
function sgOf(o){try{return JSON.stringify(o.av)+'|'+o.items.map(i=>i.id+':'+(i.objs||[]).length+':'+(i.ch||[]).length).join(',')}catch(e){return''}}
function mount(el){const n=el.dataset.n,o=avOf(n);if(!o||!window.THREE)return;el.dataset.sg=sgOf(o);
 setTimeout(()=>{if(!el.isConnected)return;const sv=me.items;try{me.items=o.items;(window.av3||function(){})(el,Object.assign({},o.av,{acc:(o.av.acc||[]).slice()}),[])}finally{me.items=sv}},30)}
const _ov12=ovRender;
ovRender=function(){const old=document.getElementById('pst3');const keep=old&&old.querySelector('canvas')?old:null;const r=_ov12.apply(this,arguments);
 try{const nw=document.getElementById('pst3');if(nw){const o=avOf(nw.dataset.n);if(keep&&o&&keep.dataset.n===nw.dataset.n&&keep.dataset.sg===sgOf(o))nw.replaceWith(keep);else mount(nw)}}catch(e){}return r};
})();
;

/* ===== 42-review-admin-pengumuman-work.js ===== */
/* ===== REVIEW ADMIN + PENGUMUMAN + WORK ===== */
const RV=(()=>{const ID=i=>document.getElementById(i),Q='sandbox/v9/rvq/',mq=()=>window.__spMq,ky=(k,by,id)=>(k+'_'+String(by).toLowerCase()+'_'+id).replace(/[^\w-]/g,'_').slice(0,60),
sm=u=>u&&u.length<6e4?u:'',lm=(x,n)=>{try{const t=JSON.stringify(x);return t&&t.length<n?t:''}catch(e){return ''}},rid=()=>Math.random().toString(36).slice(2,9)+Date.now().toString(36),rf=()=>{try{render()}catch(e){}try{hubRender()}catch(e){}};
const cat=(k,o)=>k=='map'?'Map':k=='mdl'?'Model':k=='snd'?'Suara':({Tubuh:'Tubuh',Avatar:'Avatar',Pakaian:'Pakaian',Sepatu:'Pakaian'})[o.slot]||'Aksesori';
const ent=(k,o,by)=>({key:ky(k,by,o.id),k,id:String(o.id),by,n:o.name||'',d:o.desc||'',p:+o.price||0,c:cat(k,o),t:(o.rv&&o.rv.t)||Date.now(),oc:(o.objs||(o.data&&o.data.objs)||[]).length,ic:sm(o.icon),th:sm(o.thumb),ag:o.age||'',sl:o.slot||'',ob:k=='acc'?lm(o.objs,30000):'',gd:k=='map'?lm(Object.assign({},o,{icon:'',thumb:'',rv:null}),120000):''});
const push=(e,clr)=>{try{mq()&&mq().pushAll([{t:Q+e.key,p:clr?'':JSON.stringify(e)}])}catch(x){}};
const find=(k,id,by)=>{const u=users[by];if(k=='acc')return u&&(u.items||[]).find(i=>i.id==id);if(k=='map')return u&&(u.games||[]).find(g=>g.id==id);return ls.get('sp_models',[]).find(m=>m.id==id)};
let T={},C=ls.get('sp_rvq',{}),RV_T=0;
const R={
 pend:g=>!!(g&&g.rv&&g.rv.s=='pending'),
 objsOf(e){try{const o=find(e.k,e.id,e.by);if(o)return e.k=='map'?((o.data&&o.data.objs)||o.objs||[]):(o.objs||[]);const j=e.k=='acc'?e.ob:e.gd;if(!j)return null;const x=JSON.parse(j);return e.k=='map'?((x.data&&x.data.objs)||x.objs||[]):x}catch(err){return null}},
 pic(e){const S=140,st='border-radius:10px;object-fit:cover;background:#2a1a22';let h='';if(e.ic)h+=`<img src="${e.ic}" width="${S}" height="${S}" style="${st}">`;if(e.th)h+=`<img src="${e.th}" height="${S}" style="border-radius:10px;max-width:60%">`;
  if(!h){const ob=R.objsOf(e),m=ob&&ob.length&&window.modelThumb?window.modelThumb(ob,e.key):'';if(m)h=`<img src="${m}" width="${S}" height="${S}" style="${st}">`}return h},
 submit(o,k){if(lv(me)>=3){o.pub=true;o.rv={s:'approved',t:Date.now()};save();notify('"'+o.name+'" dipublikasikan');return true}
  o.pub=false;o.rv={s:'pending',t:Date.now()};save();push(ent(k,o,me.name));notify('"'+o.name+'" dikirim ke admin untuk dicek');return false},
 stamp(r,k){if(lv(me)>=3){r.rv={s:'approved',t:Date.now()};return}r.rv={s:'pending',t:Date.now()};push(ent(k,r,me.name));notify('"'+r.name+'" dikirim ke admin untuk dicek')},
 cancel(o){const k=o.slot!==undefined||o.objs&&!o.age&&!o.col?'acc':'map';o.rv=null;o.pub=false;save();try{(me.items||[]).includes(o)&&push({key:ky('acc',me.name,o.id)},1);(me.games||[]).includes(o)&&push({key:ky('map',me.name,o.id)},1)}catch(e){}},
 cancelById(id){const o=(me.games||[]).concat(me.items||[]).find(x=>x.id==id);if(o){R.cancel(o);toast('Pengajuan dibatalkan');rf()}},
 note(g){const v=g.rv;if(v&&v.s=='pending')return '<div class="nt">⏳ Menunggu review admin. Setelah disetujui, otomatis tampil publik.</div><div class="row"><button class="ghost" data-a="rvcancel" data-v="'+esc(g.id)+'">Batalkan pengajuan</button></div>';
  if(v&&(v.s=='off'||v.s=='banned'))return '<div class="nt">⛔ '+(v.s=='off'?'Off sale':'Diblokir')+' oleh staf'+(v.note?': '+esc(v.note):'')+'. Tidak bisa dipublish ulang.</div>';if(v&&v.s=='rejected')return '<div class="nt">❌ Ditolak admin'+(v.note?': '+esc(v.note):'')+'. Perbaiki lalu ajukan lagi.</div>';return '<div class="nt">Item dicek admin dulu sebelum tampil di Marketplace/Beranda.</div>'},
 mut(k,id,by,fn){if(k=='mdl'||k=='snd'){const a=ls.get('sp_models',[]),o=a.find(m=>m.id==id);if(!o)return null;fn(o);ls.set('sp_models',a);return o}const o=find(k,id,by);if(!o)return null;fn(o);save();return o},
 blk:g=>!!(g&&g.rv&&(g.rv.s=='off'||g.rv.s=='banned')),
 apply(k,id,by,ok,note){note=String(note||'').slice(0,100);const o=R.mut(k,id,by,o=>{o.rv={s:ok?'approved':'rejected',t:Date.now(),note};if(k=='acc'||k=='map')o.pub=!!ok});if(!o)return;
  const u=users[by]||me;(u.notes=u.notes||[]).unshift({t:'"'+o.name+'" '+(ok?'disetujui admin ✓':'ditolak admin'+(note?': '+note:'')),new:1});save();rf()},
 setS(k,id,by,s,note){if(!/^(off|banned|ok)$/.test(s))return;note=String(note||'').slice(0,100);const on=s=='ok',o=R.mut(k,id,by,o=>{o.rv={s:on?'approved':s,t:Date.now(),note};if(k=='acc'||k=='map')o.pub=on});if(!o)return;
  const u=users[by]||me;(u.notes=u.notes||[]).unshift({t:'"'+o.name+'" '+(on?'diaktifkan kembali oleh staf':s=='off'?'di-off sale oleh staf':'diblokir oleh staf')+(note&&!on?': '+note:''),new:1});save();rf()},
 W:{},
 works(){const L={},add=(k,by,id,n,c,st,ic,note)=>{L[ky(k,by,id)]={key:ky(k,by,id),k,by,id,n,c,st,ic,note}},px=(i)=>'u_'+i.by+'_';
  mkItems().forEach(i=>{if(i.by&&i.by!='Sandbox'&&String(i.key).startsWith(px(i))){add('acc',i.by,i.key.slice(px(i).length),i.name,cat('acc',i),'on',i.icon)}});
  pubGames().forEach(g=>{if(g.by&&g.by!='Sandbox')add('map',g.by,g.id,g.name,'Map','on',g.icon)});
  ls.get('sp_models',[]).concat(window.spRMD||[]).forEach(m=>{if(m.by&&(!m.rv||m.rv.s=='approved'))add(m.kind=='sound'?'snd':'mdl',m.by,m.id,m.name,cat(m.kind=='sound'?'snd':'mdl',m),'on',m.thumb)});
  const bad=(k,o,by)=>{if(R.blk(o))add(k,by,o.id,o.name,cat(k,o),o.rv.s,o.icon||o.thumb,o.rv.note)};
  Object.keys(users).forEach(un=>{const u=users[un];if(!u||u.rm)return;(u.items||[]).forEach(i=>!i.src&&bad('acc',i,un));(u.games||[]).forEach(g=>bad('map',g,un))});
  ls.get('sp_models',[]).forEach(m=>bad(m.kind=='sound'?'snd':'mdl',m,m.by));
  Object.values(ls.get('sp_tkd',{})).forEach(t=>{if(t&&t.k&&(t.s=='off'||t.s=='banned')){const kk=ky(t.k,t.by,t.id);if(!L[kk])add(t.k,t.by,t.id,t.n||t.id,t.c||'',t.s,t.ic,t.note)}});
  R.W=L;return Object.values(L).sort((a,b)=>(a.st=='on')-(b.st=='on')).slice(0,80)},
 worksH(){const L=R.works();return L.length?L.map(w=>`<div class="card ur2"><div class="ur2h"><b>${esc(w.n)}</b><span class="pill" style="font-size:12px">${esc(w.c)} · ${w.st=='on'?'Aktif':w.st=='off'?'Off sale':'Diblokir'}</span></div><div style="display:flex;gap:8px;align-items:center;margin:4px 0">${w.ic?`<img src="${w.ic}" width="84" height="84" style="border-radius:10px;object-fit:cover">`:''}<div class="rby">oleh <b>${esc(w.by)}</b>${w.note?'<br>Alasan: '+esc(w.note):''}</div></div>${w.st=='on'?`<input type="text" id="wn_${w.key}" placeholder="Alasan (wajib)" maxlength="100"><div class="rac"><button class="btn sm c" data-a="wkdo" data-v="${w.key}|off">Off Sale</button><button class="btn sm o" data-a="wkdo" data-v="${w.key}|banned">Blokir</button><button class="btn sm o" data-a="wkdo" data-v="${w.key}|del">Hapus</button><button class="btn sm o" data-a="wkdo" data-v="${w.key}|banuser">Ban pembuat</button></div>`:`<input type="text" id="wn_${w.key}" placeholder="Alasan (untuk Hapus/Ban)" maxlength="100"><div class="rac"><button class="btn sm g" data-a="wkdo" data-v="${w.key}|ok">Aktifkan lagi</button><button class="btn sm o" data-a="wkdo" data-v="${w.key}|del">Hapus</button><button class="btn sm o" data-a="wkdo" data-v="${w.key}|banuser">Ban pembuat</button></div>`}</div>`).join(''):'<div class="empty2"><b>Belum ada karya</b><p style="margin:0">Karya kreator yang sudah tayang muncul di sini.</p></div>'},
 wkdo(v){const [key,st]=v.split('|'),w=R.W[key];if(!w)return;const note=((document.getElementById('wn_'+key)||{}).value||'').trim();if(st!='ok'&&note.length<3)return toast('Isi alasan dulu');
  if(st=='banuser'){if(!users[w.by])users[w.by]={rm:1,bux:0,av:null,games:[],notes:[]};if(typeof act.banu=='function')act.banu(w.by);else toast('Fitur ban tidak tersedia');return}
  if(w.by==(me&&me.name)&&lv(me)<3)return toast('Tidak boleh memproses punya sendiri');
  const it=w.k=='acc'?mkItems().find(i=>i.by==w.by&&i.key=='u_'+w.by+'_'+w.id):null;
  R.send(w.k,w.by,w.id,st,w.n,w.c,w.ic,note);
  toast(st=='ok'?'Diaktifkan lagi (global)':st=='off'?'Off sale — berlaku di semua perangkat':st=='del'?'Dihapus — berlaku di semua perangkat':'Diblokir — berlaku di semua perangkat');rf()},
 b(){T={}},got(t,d){if(d&&d.key&&d.n)T[d.key]=d},f(){C=T;ls.set('sp_rvq',C)},
 list(){const L={};Object.values(C).forEach(e=>L[e.key]=e);Object.keys(users).forEach(un=>{const u=users[un];if(!u||u.rm)return;(u.items||[]).forEach(i=>{if(R.pend(i)&&!i.src)L[ky('acc',un,i.id)]=ent('acc',i,un)});(u.games||[]).forEach(g=>{if(R.pend(g))L[ky('map',un,g.id)]=ent('map',g,un)})});
  ls.get('sp_models',[]).forEach(m=>{if(R.pend(m))L[ky(m.kind=='sound'?'snd':'mdl',m.by,m.id)]=ent(m.kind=='sound'?'snd':'mdl',m,m.by)});return Object.values(L).sort((a,b)=>a.t-b.t)},
 n(){return staff()?R.list().length:0},
 decide(key,ok){const e=R.list().find(x=>x.key==key);if(!e)return;if(e.by==me.name&&lv(me)<3)return toast('Tidak boleh menyetujui punya sendiri');const note=(ID('rn_'+key)||{}).value||'';if(!ok&&note.trim().length<3)return toast('Isi alasan penolakan');
  const u=users[e.by];if((e.k=='mdl'||e.k=='snd')?find(e.k,e.id,e.by):(u&&!u.rm&&find(e.k,e.id,e.by)))R.apply(e.k,e.id,e.by,ok,note);else if(window.spSendCmd)window.spSendCmd(e.by,'rv',{k:e.k,id:e.id,ok:ok?1:0,note},0);
  delete C[key];ls.set('sp_rvq',C);push({key},1);toast(ok?'Disetujui ✓':'Ditolak');rf()},
 put(c,a){const l=ls.get('sp_'+c,[]).filter(x=>x.id!=a.id);l.unshift(a);l.sort((x,y)=>y.ts-x.ts);ls.set('sp_'+c,l.slice(0,40))},
 tk(k,by,id,st,n,c,ic,note,fromRemote,ts){if(!/^(off|banned|del|ok)$/.test(st))return 0;ts=ts||Date.now();const T0=ls.get('sp_tkd',{}),kk=window.tkKey(k,by,id);if(T0[kk]&&T0[kk].ts>=ts&&fromRemote)return 0;
  if(st=='ok')delete T0[kk];else T0[kk]={s:st,n:String(n||'').slice(0,40),c:String(c||'').slice(0,20),ic:(ic&&String(ic).length<400)?ic:'',note:String(note||'').slice(0,100),ts,k,by,id};
  ls.set('sp_tkd',T0);
  if(me&&String(by).toLowerCase()==me.name.toLowerCase()){
   if(st=='del'){if(k=='acc'&&me.items)me.items=me.items.filter(i=>i.id!=id);else if(k=='map'&&me.games)me.games=me.games.filter(g=>g.id!=id);else if(k=='mdl'||k=='snd')ls.set('sp_models',ls.get('sp_models',[]).filter(m=>m.id!=id));(me.notes=me.notes||[]).unshift({t:'"'+(n||id)+'" dihapus oleh staf'+(note?': '+note:''),new:1});save()}
   else R.setS(k,id,me.name,st,note)}
  rf();return 1},
 send(k,by,id,st,n,c,ic,note){const ts=Date.now();R.tk(k,by,id,st,n,c,ic,note,0,ts);const to='_tk'+window.tkKey(k,by,id).replace(/[^\w-]/g,'_').slice(0,50);
  if(window.spSendCmd)window.spSendCmd(to,'tkd',{k,by:String(by).slice(0,20),id:String(id).slice(0,40),s:st,n:String(n||'').slice(0,40),c:String(c||'').slice(0,20),ic:(ic&&String(ic).length<400)?ic:'',note:String(note||'').slice(0,100)},1);
  else toast('Tersimpan di perangkat ini; perintah global belum bisa dikirim')},
 rcv(rec){const c=String(rec.cmd||'').replace(/x$/,''),a=rec.args||{};
  if(c=='tkd'){if(!a.k||!a.by||!a.id)return 0;return R.tk(a.k,a.by,a.id,a.s,a.n,a.c,a.ic,a.note,1,rec.ts)}
  if(c!='ann'&&c!='wrk')return 0;const id=String(a.id||rec.to.slice(1)).replace(/[^\w-]/g,'').slice(0,24),o=ls.get('sp_'+c,[]).find(x=>x.id==id);if(o&&o.ts>=rec.ts)return 0;
  if(!o&&!/x$/.test(rec.cmd)&&me&&String(rec.from).toLowerCase()!=me.name.toLowerCase()){(me.notes=me.notes||[]).unshift({t:(+a.r>0?'🎁 Event SandBux: ':'📢 ')+String(a.t||'').slice(0,60),new:1});save()}
  R.put(c,{id,t:String(a.t||'').slice(0,60),x:String(a.x||'').slice(0,400),r:Math.max(0,Math.min(9999,Math.floor(+a.r||0))),by:String(rec.from).slice(0,20),ts:rec.ts,dead:/x$/.test(rec.cmd)?1:0});rf();return 1},
 post(c){const t=ID(c+'_t').value.trim(),x=ID(c+'_x').value.trim();if(t.length<3||x.length<5)return toast('Judul min 3 & isi min 5 huruf');const id=rid(),r=c=='ann'?Math.max(0,Math.min(9999,Math.floor(+ID('ann_r').value||0))):0,a={id,t,x,r};
  R.put(c,Object.assign({by:me.name,ts:Date.now(),dead:0},a));window.spSendCmd&&window.spSendCmd('_'+id,c,a,1);toast('Terkirim ke semua perangkat');rf()},
 del(c,id){R.put(c,{id,ts:Date.now(),dead:1});window.spSendCmd&&window.spSendCmd('_'+id,c+'x',{id},1);rf()},
 tab(t){if(t=='wk')return R.worksH();if(t=='vl')return R.vlH();if(t=='rv'){const L=R.list();return L.length?L.map(e=>`<div class="card ur2"><div class="ur2h"><b>${esc(e.n)}</b><span class="pill" style="font-size:12px">${esc(e.c)}</span></div><div style="display:flex;gap:8px;margin:6px 0">${R.pic(e)}</div><div class="rtx">${esc(e.d||'-')}</div><div class="rby">oleh <b>${esc(e.by)}</b> · ${e.p} SandBux · ${e.oc} objek${e.ag?' · '+esc(e.ag):''}</div><input type="text" id="rn_${e.key}" placeholder="Alasan (wajib jika ditolak)" maxlength="100"><div class="rac">${(e.k=='acc'||e.k=='map')?`<button class="btn sm c" data-a="rvtest" data-v="${e.key}">Uji</button>`:''}<button class="btn sm g" data-a="rvok" data-v="${e.key}">Setujui</button><button class="btn sm o" data-a="rvno" data-v="${e.key}">Tolak</button></div></div>`).join(''):'<div class="empty2"><b>Antrean kosong</b><p style="margin:0">Aksesori, tubuh, avatar, model, suara, dan map baru muncul di sini sebelum tayang.</p></div>'}
  const l=ls.get('sp_'+t,[]).filter(x=>!x.dead);return `<div class="card"><label>Judul</label><input type="text" id="${t}_t" maxlength="60"><label>Isi</label><input type="text" id="${t}_x" maxlength="400">${t=='ann'?'<label>Hadiah SandBux (0 = pengumuman biasa, &gt;0 = event klaim)</label><input type="text" inputmode="numeric" id="ann_r" value="0">':''}<button class="btn w g" data-a="rvpost" data-v="${t}">Kirim ke semua pemain</button><button class="btn w" data-a="ntest" style="margin-top:8px">🔔 Tes notifikasi HP</button></div>`+l.map(x=>`<div class="card ur2"><div class="ur2h"><b>${esc(x.t)}</b>${x.r?`<span class="pill" style="font-size:12px">${x.r} SB</span>`:''}</div><div class="rtx">${esc(x.x)}</div><div class="rby">${esc(x.by)}</div><div class="rac"><button class="btn sm o" data-a="rvdel" data-v="${t}:${x.id}">Hapus</button></div></div>`).join('')},
 annH(){const A=ls.get('sp_ann',[]).filter(x=>!x.dead).slice(0,5),cl=(me&&me.claimed)||[];if(!A.length)return'';
  return '<div class="anl">'+A.map(x=>`<div class="anc${x.r?' rw':''}"><div class="ani">${x.r?'🎁':'📢'}</div><div class="anb"><div class="ant">${esc(x.t)}</div><div class="anx">${esc(x.x)}</div><div class="anm">${esc(x.by||'Admin')}${x.ts?' · '+new Date(x.ts).toLocaleDateString('id-ID',{day:'numeric',month:'short'}):''}</div>${x.r?`<button class="anbt${cl.includes(x.id)?' dn':''}" data-a="rvwk" data-v="${x.id}">${cl.includes(x.id)?'Sudah diklaim ✓':'Klaim '+x.r+' SandBux'}</button>`:''}</div></div>`).join('')+'</div>'}};
{const _eb=edBack;edBack=function(){if(RV_T){RV_T=0;show('app');try{render()}catch(e){}setTimeout(()=>{try{act.dnav('panel')}catch(e){}},80);return}return _eb.apply(this,arguments)}}
Object.assign(act,{rvtest(v){const e=R.list().find(x=>x.key==v);if(!e)return;
  if(e.k=='acc'){const ob=R.objsOf(e);if(!ob||!ob.length)return toast('Data aksesori tidak tersedia untuk diuji');const o=find('acc',e.id,e.by)||{};
   shOpen(`<div class="shn" style="margin-top:6px">${esc(e.n)}</div><div class="pv3" id="pvr"></div><div class="pvm">Uji coba · oleh ${esc(e.by)} · ${esc(e.c)}</div><button class="sb ln" data-a="shx">Tutup</button>`);
   setTimeout(()=>window.av3(ID('pvr'),Object.assign({},me.av,{acc:[],pvfx:o.fx||[]},o.cloth||{},e.sl==='Tubuh'?{bodyObjs:ob}:{}),e.sl==='Tubuh'?[]:ob),30)}
  else if(e.k=='map'){let g=find('map',e.id,e.by);if(!g&&e.gd){try{g=JSON.parse(e.gd)}catch(x){}}if(!g)return toast('Data map tidak tersedia untuk diuji');RV_T=1;startGame(g,true)}},wkdo(v){R.wkdo(v)},rvok(v){R.decide(v,1)},rvno(v){R.decide(v,0)},rvcancel(v){R.cancelById(v)},rvpost(v){R.post(v)},rvdel(v){const i=v.indexOf(':');R.del(v.slice(0,i),v.slice(i+1))},rvwk(v){const x=ls.get('sp_ann',[]).find(a=>a.id==v&&!a.dead);if(!x||!x.r)return;me.claimed=me.claimed||[];if(me.claimed.includes(v))return toast('Sudah kamu klaim');me.claimed.push(v);me.bux=(me.bux||0)+x.r;(me.notes=me.notes||[]).unshift({t:'Klaim event: +'+x.r+' SandBux',new:1});save();toast('+'+x.r+' SandBux diklaim 🎉');rf();try{refreshUI()}catch(e){}}});
const _hh=homeH;homeH=function(){return R.annH()+_hh.apply(this,arguments)};
return R})();
;

/* ===== 43-pelanggaran-notifikasi-hp.js ===== */
/* ===== PELANGGARAN + NOTIFIKASI HP ===== */
(()=>{const ID=i=>document.getElementById(i),rf=()=>{try{render()}catch(e){}},act_=u=>(u.viol||[]).filter(v=>!v.done),rd=()=>Math.random().toString(36).slice(2,9);
RV.viol=(u,id,reason,by)=>{u.viol=u.viol||[];id=String(id||rd()).slice(0,24);if(u.viol.some(v=>v.id==id))return;const n=act_(u).length+1,e={id,r:String(reason||'').slice(0,120),by:String(by||'staf').slice(0,20),t:Date.now(),n:Math.min(n,2),ack:0};u.viol.push(e);
 if(n>=2){e.ban=1;u.ban={perm:false,until:Date.now()+3*864e5,reason:'Pelanggaran 2/2: '+e.r,by:e.by,t:Date.now()}}
 (u.notes=u.notes||[]).unshift({t:'⚠️ Pelanggaran '+e.n+'/2: '+e.r,new:1});save();setTimeout(RV.vchk,300)};
RV.violx=u=>{const a=act_(u),l=a[a.length-1];if(!l)return;l.done=1;if(l.ban&&u.ban&&/^Pelanggaran 2\/2/.test(u.ban.reason))delete u.ban;save();rf()};
RV.vchk=()=>{if(typeof me==='undefined'||!me)return;const v=(me.viol||[]).find(x=>!x.ack&&!x.done);let o=ID('rvVio');if(!v){if(o)o.remove();return}
 if(v.ban&&!banOf(me)){me.viol.forEach(x=>x.done=1);save();if(o)o.remove();return}if(o&&o.dataset.id==v.id)return;if(o)o.remove();
 const d=document.createElement('div');d.id='rvVio';d.dataset.id=v.id;d.className='vov';
 const dt=new Date(v.t||Date.now()).toLocaleString('id-ID',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
 d.innerHTML=`<div class="vbx${v.ban?' vban':''}"><div class="vic">${v.ban?'⛔':'⚠️'}</div><div class="vkk">${v.ban?'Akun diblokir':'Peringatan resmi'}</div><h2>Pelanggaran ${v.n}/2</h2><div class="vpp"><i class="on"></i><i class="${v.n>=2?'on':''}"></i></div><div class="vrs"></div><div class="vby"></div><p class="vtx">${v.ban?'Ini pelanggaran ke-2, jadi akunmu <b>diblokir 3 hari</b>. Tekan tombol di bawah untuk keluar dari akun.':'Kamu hanya boleh melakukan <b>2 pelanggaran</b>. Pelanggaran ke-2 akan memblokir akunmu selama <b>3 hari</b>. Tekan tombol di bawah untuk melanjutkan ke akunmu.'}</p><button id="rvVioB" disabled>Terima</button></div>`;
 d.querySelector('.vrs').textContent=v.r||'Kamu melanggar aturan Sandbox.';d.querySelector('.vby').textContent='Diberikan oleh '+(v.by||'staf')+' · '+dt;
 document.body.appendChild(d);const bt=ID('rvVioB'),lbl=v.ban?'Terima & keluar':'Terima & lanjutkan';let c=3;bt.textContent=lbl+' ('+c+')';
 const iv=setInterval(()=>{if(!document.body.contains(d)){clearInterval(iv);return}c--;if(c<=0){clearInterval(iv);bt.disabled=false;bt.textContent=lbl}else bt.textContent=lbl+' ('+c+')'},1000);
 bt.onclick=()=>{if(bt.disabled||!me)return;v.ack=1;const nm=me.name,bb=v.ban&&banOf(me);if(v.ban)me.viol.forEach(x=>x.done=1);save();d.remove();if(bb&&window.spDevBan)window.spDevBan(nm,bb);if(v.ban){try{act.out()}catch(e){}try{window.spBanCheck&&window.spBanCheck()}catch(e){}}else rf()}};
RV.vlH=()=>{const L=Object.keys(users).filter(k=>{const u=users[k];return u&&!u.rm&&act_(u).length}).map(k=>{const a=act_(users[k]);return `<div class="card ur2"><div class="ur2h"><b>${esc(k)}</b><span class="pill" style="font-size:12px">${a.length}/2</span></div><div class="rby">${esc(a[a.length-1].r)}</div><div class="rac"><button class="btn sm o" data-a="vlx" data-v="${esc(k)}">Hapus 1 pelanggaran</button></div></div>`}).join('');
 return `<div class="card"><label>Username pemain</label><input type="text" id="vl_u" maxlength="20" autocomplete="off" autocapitalize="off"><label>Alasan pelanggaran</label><input type="text" id="vl_r" maxlength="120"><div style="font-size:12px;margin:-6px 0 8px">Maks 2 pelanggaran. Ke-2 = akun otomatis diblokir 3 hari.</div><button class="btn w o" data-a="vlgo">Beri pelanggaran</button></div>`+(L||'<div class="empty2"><p style="margin:0">Belum ada pelanggaran aktif di perangkat ini.</p></div>')};
const find=n=>Object.keys(users).find(k=>k.toLowerCase()==String(n).toLowerCase())||n;
/* notifikasi native */
const NT=(()=>{const C=()=>window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins.LocalNotifications,K=()=>window.cordova&&cordova.plugins&&cordova.plugins.notification&&cordova.plugins.notification.local,B=()=>{const a=window.Android||window.AndroidBridge||window.ShinpoAndroid;return a&&(a.showNotification||a.notify)?a:null};let n=Math.floor(Math.random()*1e5);
 const ask=async()=>{try{if(C())await C().requestPermissions();else if(K()&&K().requestPermission)K().requestPermission(()=>{});else if(window.Notification&&Notification.permission==='default')await Notification.requestPermission()}catch(e){}};
 const show=async(t,b)=>{t=String(t).slice(0,60);b=String(b||'').slice(0,160);const id=(++n)%2147483647;
  try{if(C()){await C().schedule({notifications:[{id,title:t,body:b,schedule:{at:new Date(Date.now()+400)}}]});return 'capacitor'}}catch(e){}
  try{if(K()){K().schedule({id,title:t,text:b,foreground:true});return 'cordova'}}catch(e){}
  try{const a=B();if(a){(a.showNotification||a.notify).call(a,t,b);return 'bridge'}}catch(e){}
  try{if(window.Notification&&Notification.permission==='granted'){try{const r=navigator.serviceWorker&&await navigator.serviceWorker.getRegistration();if(r){await r.showNotification(t,{body:b});return 'sw'}}catch(e){}new Notification(t,{body:b});return 'web'}}catch(e){}
  try{navigator.vibrate&&navigator.vibrate(120)}catch(e){}return 'none'};
 return{ask,show}})();
let prev=null,who='';
setInterval(()=>{if(typeof me==='undefined'||!me){who='';prev=null;return}const cur={};(me.notes||[]).slice(0,20).forEach(x=>{if(x&&x.new)cur[x.t]=(cur[x.t]||0)+1});
 if(who!==me.name||!prev){who=me.name;prev=cur;return}for(const t in cur)if(cur[t]>(prev[t]||0))NT.show('Sandbox',t);prev=cur},2000);
document.addEventListener('pointerdown',()=>NT.ask(),{once:true});
setInterval(RV.vchk,3000);
const _e=enter;enter=function(){const r=_e.apply(this,arguments);setTimeout(()=>{RV.vchk();NT.ask()},1200);return r};
Object.assign(act,{
 vlgo(){if(!staff())return;const nm=ID('vl_u').value.trim(),r=ID('vl_r').value.trim();if(!nm||r.length<3)return toast('Isi username & alasan (min 3 huruf)');const k=find(nm),u=users[k];
  if(/^(owner|admin|coowner|co-owner)$/i.test(k)||k.toLowerCase()==me.name.toLowerCase())return toast('Tidak bisa untuk akun ini');if(u&&!okT(u))return toast('Tidak diizinkan');
  if(u&&!u.rm){RV.viol(u,rd(),r,me.name);toast('Pelanggaran diberikan ke '+k)}else if(window.spSendCmd)window.spSendCmd(k,'viol',{id:rd(),reason:r},0);else return toast('Perintah belum bisa dikirim');rf()},
 vlx(v){const u=users[v];if(!staff()||!u)return;if(u.rm&&window.spSendCmd)window.spSendCmd(v,'violx',{},0);else RV.violx(u);rf()},
 ntest(){NT.ask();NT.show('Sandbox','Tes notifikasi 🔔').then(m=>toast(m=='none'?'Notifikasi native belum terhubung ke APK':'Terkirim via: '+m))}});
})();
;

/* ===== 44-patch.js ===== */
Object.assign(act,{grolev(v){const r=document.getElementById('pt_r');if(!r)return;r.value=v;act.grole()}});
;

/* ===== 45-patch.js ===== */
(()=>{const nm=()=>{const i=document.getElementById('pt_u'),r=String(i&&i.value||'').trim().replace(/^@/,'').toLowerCase();return Object.keys(users).find(k=>k.toLowerCase()==r)||''},
lb=u=>RN[u&&u.role]||'User',
why=(role)=>{const k=nm();if(!k)return'';const u=users[k];if(u===me)return'';if(!staff())return 'akunmu ('+lb(me)+') bukan staf';
 if(!okT(u))return 'levelmu ('+lb(me)+') harus lebih tinggi dari '+k+' ('+lb(u)+')';
 if(role&&role!='none'&&lv({role})>=lv(me))return 'kamu ('+lb(me)+') hanya bisa memberi akses di bawah levelmu';return ''};
const gv=act.gver,gr=act.grole;
act.gver=function(){const w=why();if(w)return toast('Tidak diizinkan: '+w);return gv.apply(this,arguments)};
act.grole=function(){const r=document.getElementById('pt_r'),w=why(r&&r.value);if(w)return toast('Tidak diizinkan: '+w);return gr.apply(this,arguments)};
})();
;

/* ===== 46-patch.js ===== */
(function(){
const DK='sp_devban',rd=()=>{try{return JSON.parse(localStorage.getItem(DK)||'null')}catch(e){return null}},wr=d=>{try{d?localStorage.setItem(DK,JSON.stringify(d)):localStorage.removeItem(DK)}catch(e){}};
const live=d=>d&&(d.perm||(+d.until||0)>Date.now());
const fmt=d=>d.perm?'permanen':'sampai '+new Date(d.until).toLocaleString('id-ID');
function setDev(n,b){const o=rd();if(o&&o.name===n&&o.t===b.t)return;wr({name:n,perm:!!b.perm,until:+b.until||0,reason:String(b.reason||'').slice(0,120),t:b.t||Date.now()})}
function check(){let d=rd();if(d){const u=users[d.name];if(!live(d)||(u&&!banOf(u)&&u.bts))d=null,wr(null)}
 let o=document.getElementById('banov');
 if(!d){if(o)o.remove();return}
 if(!o){o=document.createElement('div');o.id='banov';document.body.appendChild(o)}
 o.innerHTML='<div class="bx"><h2>Akun diblokir</h2><p>Akun <b></b> diblokir '+fmt(d)+'.</p><p class="rs"></p><small>Perangkat ini tidak dapat login atau membuat akun baru selama blokir aktif.</small><button type="button" id="banck">Cek status</button></div>';
 o.querySelector('b').textContent=d.name;o.querySelector('.rs').textContent='Alasan: '+(d.reason||'-');
 o.querySelector('#banck').onclick=recheck}
async function recheck(){const d=rd();if(!d)return check();const u=users[d.name];
 if(u&&window.spPanelSync&&!me){try{me=u;me.name=d.name;me.notes=me.notes||[];await window.spPanelSync()}catch(e){}finally{me=null}}
 check()}
const _en=enter;
const pend=()=>!!(me&&(me.viol||[]).some(v=>!v.ack&&!v.done&&v.ban));
enter=function(){if(me&&banOf(me)&&!pend()){const n=me.name,b=banOf(me);setDev(n,b);me=null;try{ls.set('sp_sess','')}catch(e){}check();return}
 const r=_en.apply(this,arguments);return r};
const _au=act.auth;
act.auth=function(){check();if(document.getElementById('banov'))return;const r=_au.apply(this,arguments);
 const hit=()=>{const n=(($('#u')||{}).value||'').trim().toLowerCase(),em=(($('#em')||{}).value||'').trim().toLowerCase(),k=Object.keys(users).find(x=>x.toLowerCase()==n||(em&&users[x].email===em));if(k&&banOf(users[k])){setDev(k,banOf(users[k]));check()}};
 hit();setTimeout(hit,600);setTimeout(hit,2000);return r};
setInterval(()=>{try{if(me&&banOf(me)&&!pend()){setDev(me.name,banOf(me));const n=me.name;try{act.out()}catch(e){me=null}}check()}catch(e){}},1500);
setInterval(()=>{if(document.getElementById('banov')&&!document.hidden)recheck()},30000);
setInterval(()=>{try{if(typeof me==='undefined'||!me||document.getElementById('rvVio')||document.getElementById('banov')||document.getElementById('annPop'))return;
 const A=ls.get('sp_ann',[]).filter(x=>!x.dead),seen=me.annSeen=me.annSeen||[],x=A.find(a=>!seen.includes(a.id));
 if(!x||!document.getElementById('app')||document.getElementById('app').style.display==='none')return;
 const cl=(me.claimed||[]).includes(x.id),o=document.createElement('div');o.id='annPop';o.className='apop';
 o.innerHTML='<div class="bx'+(x.r?' rw':'')+'"><div style="font-size:42px">'+(x.r?'🎁':'📢')+'</div><h3></h3><p></p>'+(x.r&&!cl?'<button class="g" id="apk">Klaim '+(+x.r)+' SandBux</button>':'')+'<button id="apx">Tutup</button></div>';
 document.body.appendChild(o);o.querySelector('h3').textContent=x.t;o.querySelector('p').textContent=x.x;
 const done=()=>{if(!seen.includes(x.id))seen.push(x.id);if(seen.length>50)seen.shift();save();o.remove()};
 o.querySelector('#apx').onclick=done;const k=o.querySelector('#apk');if(k)k.onclick=()=>{try{act.rvwk(x.id)}catch(e){}done()}}catch(e){}},3500);
window.spDevBan=setDev;window.spBanCheck=check;
document.addEventListener('DOMContentLoaded',check);check();
})();
;

/* ===== 47-v11.js ===== */
/* ===== v11: Panel hanya untuk staf + gift/ban lewat username (juga untuk pemain di perangkat lain) ===== */
(function(){
const STAFF_ACTS=['pt','gbux','gver','grole','grolev','banu','banui','banperm','bango','unban','bandirect','unbandirect','rtake','rdone','vlgo','vlx','rvok','rvno','rvtest','rvpost','rvdel','wkdo'];
const OWNER_ACTS=['prgo','prdel','cdgo','cddel','cdcopy'];
const TARGET={gbux:'pt_u',gver:'pt_u',grole:'pt_u',bandirect:'bu_u',unbandirect:'bu_u'};
const HIDE='#n_panel,#spPnl,.mi[data-v="panel"],[data-a="go"][data-v="panel"],[data-a="dnav"][data-v="panel"]';
const isStaff=()=>{try{return typeof me!=='undefined'&&!!me&&staff()}catch(e){return false}};
const isOwner=()=>{try{return isStaff()&&lv(me)>=3}catch(e){return false}};
const deny=m=>{try{toast(m||'Hanya staf yang bisa melakukan ini')}catch(e){}};
const localKey=r=>{r=String(r||'').trim().replace(/^@/,'').toLowerCase();return r?Object.keys(users).find(k=>k.toLowerCase()===r)||null:null};

/* 1. sembunyikan Panel dari semua yang bukan staf */
function sweep(){
 if(isStaff())return;
 document.querySelectorAll(HIDE).forEach(e=>e.remove());
 try{if(typeof page!=='undefined'&&page==='panel'){page='home';render()}}catch(e){}
}
setInterval(sweep,700);

function install(){
 /* 2. semua aksi panel ditolak bila bukan staf / bukan owner */
 STAFF_ACTS.forEach(n=>{const o=act[n];if(typeof o!=='function')return;act[n]=function(){if(!isStaff())return deny();return o.apply(this,arguments)}});
 OWNER_ACTS.forEach(n=>{const o=act[n];if(typeof o!=='function')return;act[n]=function(){if(!isOwner())return deny('Hanya Owner yang bisa melakukan ini');return o.apply(this,arguments)}});
 const go=act.go;act.go=function(v){if(v==='panel'&&!isStaff())v='home';return go.call(this,v)};
 const dn=act.dnav;if(typeof dn==='function')act.dnav=function(v){if(v==='panel'&&!isStaff()){try{act.dclose()}catch(e){}return}return dn.apply(this,arguments)};
 const out=act.out;if(typeof out==='function')act.out=function(){document.querySelectorAll(HIDE).forEach(e=>e.remove());return out.apply(this,arguments)};

 /* 3. gift/ban lewat username: kalau username belum ada di perangkat ini, cari di semua perangkat dulu */
 Object.keys(TARGET).forEach(n=>{const prev=act[n];if(typeof prev!=='function')return;
  act[n]=function(){const self=this,args=arguments;
   if(!isStaff())return deny();
   const inp=document.getElementById(TARGET[n]),raw=String(inp&&inp.value||'').trim().replace(/^@/,'');
   if(!raw||localKey(raw)||typeof window.spLookupName!=='function')return prev.apply(self,args);
   if(raw.toLowerCase()===String(me.name).toLowerCase())return prev.apply(self,args);
   deny('Mencari @'+raw+' ...');
   window.spLookupName(raw).then(real=>{
    if(real===false)return deny('Tidak ada koneksi, username di perangkat lain belum bisa dicari');
    if(!real)return deny('Username "'+raw+'" tidak ditemukan');
    if(!localKey(real)){users[real]={rm:1,bux:0,av:{skin:SKIN[0],shirt:SHIRT[1],pants:PANTS[1]},games:[],notes:[]};save()}
    if(inp)inp.value=localKey(real);
    prev.apply(self,args)}).catch(()=>deny('Gagal mencari username'))}});
}
if(document.readyState==='complete')install();else window.addEventListener('load',install);
})();
;

/* ===== 48-v12.js ===== */
/* ===== v12: foto profil + centang biru terlihat di dalam game (nametag 3D, chat, daftar pemain) ===== */
(function(){
const HEX=/^#[0-9a-f]{6}$/i,HATS=['none','cap','crown'];
const vf=n=>{try{if(window.spVerified&&spVerified(n))return true;const l=String(n||'').toLowerCase(),k=Object.keys(users).find(x=>x.toLowerCase()===l);return !!(k&&users[k].verified)}catch(e){return false}};
const vbn=n=>(vf(n)?'<span class="vb">✔</span>':'')+(window.spRoleBadge?spRoleBadge(n):'');
const PAV={};
const cleanAv=q=>({skin:HEX.test(q.sk)?q.sk:SKIN[0],shirt:HEX.test(q.sh)?q.sh:SHIRT[0],pants:HEX.test(q.pa)?q.pa:PANTS[0],hat:HATS.includes(q.ht)?q.ht:'none'});
const avFor=n=>{try{if(me&&n===me.name)return me.av;if(PAV[n])return PAV[n];for(const k in remote)if(remote[k].name===n&&remote[k].av)return remote[k].av;const p=pinfo(n);return p&&p.av||null}catch(e){return null}};
window.spUI={vf,avFor};

/* nametag 3D: foto profil di kiri, nama di tengah, centang biru di kanan */
tagSprite=function(name){const nm=String(name).slice(0,14),V=vf(nm),RL=window.spRoleOf?spRoleOf(nm):'',RH=RL?30:0,c=document.createElement('canvas');c.width=384;c.height=64+RH;const x=c.getContext('2d');
 const paint=img=>{x.clearRect(0,0,384,64+RH);if(RL&&window.spRoleDraw)spRoleDraw(x,RL,384,RH);x.save();x.translate(0,RH);x.fillStyle='#ffde59';x.fillRect(0,0,384,64);x.strokeStyle='#000';x.lineWidth=8;x.strokeRect(0,0,384,64);
  x.save();x.beginPath();x.arc(38,32,23,0,Math.PI*2);x.closePath();x.fillStyle='#3b1f23';x.fill();x.clip();if(img)x.drawImage(img,15,9,46,46);x.restore();
  x.strokeStyle='#000';x.lineWidth=3;x.beginPath();x.arc(38,32,23,0,Math.PI*2);x.stroke();
  const x0=70,x1=V?326:372;x.fillStyle='#000';x.textAlign='center';x.textBaseline='middle';let fs=30;do{x.font='bold '+fs+'px Arial';fs-=2}while(x.measureText(nm).width>x1-x0&&fs>12);x.fillText(nm,(x0+x1)/2,34);
  if(V){x.fillStyle='#1d9bf0';x.beginPath();x.arc(350,32,17,0,Math.PI*2);x.fill();x.strokeStyle='#fff';x.lineWidth=4.5;x.lineCap='round';x.lineJoin='round';x.beginPath();x.moveTo(341,32.5);x.lineTo(347.5,39);x.lineTo(359,26);x.stroke()}x.restore()};
 paint(null);const tex=new THREE.CanvasTexture(c);
 try{const a=avFor(nm),url=a?avShot(a):'';if(url){const im=new Image();im.onload=()=>{paint(im);tex.needsUpdate=true};im.src=url}}catch(e){}
 const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,depthTest:false}));s.scale.set(3.6,.6*(64+RH)/64,1);s.position.y=3.6+(RH?.15:0);s.renderOrder=9;s.userData.sptag=1;return s};

/* data avatar pemain lain dari presence + perbarui tag bila centang/foto berubah */
function retag(o){try{if(!o||!o.g)return;const key=o.name+'|'+(vf(o.name)?1:0)+'|'+(window.spRoleOf?spRoleOf(o.name):'')+'|'+JSON.stringify(PAV[o.name]||0);
 if(o.tgk===key)return;const first=o.tgk===undefined;o.tgk=key;if(first)return;
 o.g.children.filter(c=>c.userData&&c.userData.sptag).forEach(c=>{o.g.remove(c);try{c.material.map.dispose()}catch(e){}});o.g.add(tagSprite(o.name))}catch(e){}}
window.spVfChanged=()=>{try{for(const k in remote)retag(remote[k])}catch(e){}};
const _spv=syncPeers;
syncPeers=function(peers){
 try{(peers||[]).forEach(p=>{const q=p&&p.presence;if(!q||p.isMe||q.n==null)return;PAV[String(q.n).slice(0,14)]=cleanAv(q)})}catch(e){}
 const r=_spv.apply(this,arguments);
 try{(peers||[]).forEach(p=>{const q=p&&p.presence;if(!q||p.isMe||q.n==null)return;const o=remote[p.peer];if(!o)return;o.av=PAV[o.name];retag(o)})}catch(e){}
 return r};

/* daftar pemain (menu jeda): foto + nama + centang */
plist=function(){const l=document.getElementById('plist');if(!l||typeof me==='undefined'||!me)return;
 const row=(n,a,ex)=>'<div style="display:flex;align-items:center;gap:8px;margin:4px 0">'+circ(a,28)+'<b>'+esc(n)+'</b>'+vbn(n)+(ex||'')+'</div>';
 let h='<b>Pemain:</b>'+row(me.name,me.av,'<small style="opacity:.7">(kamu · ID '+esc(me.uid||'-')+')</small>');
 for(const k in remote)h+=row(remote[k].name,remote[k].av||avFor(remote[k].name));
 if(!RM)h+='<br><i>Mode solo (koneksi ke server mabar gagal, coba lagi)</i>';l.innerHTML=h};

/* chat di game: foto kecil + centang di samping nama pengirim */
function decorate(){try{document.querySelectorAll('#rchat .rlog .rm:not(.s):not(.k) > b:not([data-d])').forEach(b=>{const m=/^\[(.*)\]:$/.exec(b.textContent);b.dataset.d='1';if(!m)return;const n=m[1],a=avFor(n);
  b.innerHTML=(a?'<span style="display:inline-flex;vertical-align:middle;margin-right:4px">'+circ(a,18)+'</span>':'')+'['+esc(n)+vbn(n)+']:'})}catch(e){}}
function watch(){const lg=document.querySelector('#rchat .rlog');if(!lg)return setTimeout(watch,1000);new MutationObserver(decorate).observe(lg,{childList:true});decorate()}
watch();

/* ambil data centang biru terbaru tiap kali masuk game */
const _sgu=startGame;startGame=function(){const r=_sgu.apply(this,arguments);setTimeout(()=>{try{window.spVfSync&&spVfSync()}catch(e){}},1500);return r};
})();
;

/* ===== 49-v13.js ===== */
/* ===== v13: foto profil semua pemain di menu (Keluar/Respawn/Lanjutkan) + bubble chat tepat di atas kepala ===== */
(function(){
const U=()=>window.spUI||{};
/* menu pengguna: ganti emoji 🙂 jadi foto profil + centang untuk tiap pemain */
function decPM(){try{document.querySelectorAll('#pm .pmc div[style*="min-width:90px"]:not([data-d])').forEach(c=>{c.dataset.d='1';
  const n=String(c.lastChild&&c.lastChild.textContent||'').trim();if(!n)return;
  const a=U().avFor&&U().avFor(n),f=c.firstElementChild;
  if(a&&f&&!f.classList.contains('circ'))f.outerHTML='<div style="height:56px;display:flex;justify-content:center">'+circ(a,56)+'</div>';
  if(U().vf&&U().vf(n))c.insertAdjacentHTML('beforeend','<span class="vb">✔</span>')})}catch(e){}}
function watchPM(){const c=document.querySelector('#pm .pmc');if(!c)return setTimeout(watchPM,1000);new MutationObserver(decPM).observe(c,{childList:true});decPM()}
watchPM();
/* kalau ada pemain masuk/keluar saat menu terbuka, gambar ulang daftarnya */
let pmKey='';
const _sp3=syncPeers;
syncPeers=function(){const r=_sp3.apply(this,arguments);
 try{const k=Object.values(remote).map(o=>o.name).sort().join('|'),pm=document.getElementById('pm'),t=pm&&pm.querySelector('.pmt b.on');
  if(k!==pmKey){pmKey=k;if(pm&&pm.classList.contains('on')&&t&&t.dataset.v==='user')act.pmtab('user')}}catch(e){}
 return r};

/* bubble chat: tepat di atas nametag (bukan jauh di atas), ukuran mengikuti isi pesan */
function fixBub(){try{const L=[];if(typeof plr!=='undefined'&&plr)L.push([plr,3.5]);for(const k in remote)L.push([remote[k].g,4.05]);
 L.forEach(([g,y])=>{const sp=g&&g.userData&&g.userData.bub;if(!sp||sp.userData.fx)return;sp.userData.fx=1;
  const m=sp.material.map,c=m.image,d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let last=0;
  for(let r=c.height-1;r>=0&&!last;r--)for(let q=0;q<c.width;q+=4)if(d[(r*c.width+q)*4+3]>10){last=r+1;break}
  const fr=Math.min(1,(last+4)/c.height);m.repeat.set(1,fr);m.offset.set(0,1-fr);sp.scale.set(4.2,1.3*fr,1);sp.center.set(.5,0);sp.position.y=y})}catch(e){}}
const _ac3=addChat;
addChat=function(){const r=_ac3.apply(this,arguments);setTimeout(fixBub,0);return r};
})();
;

/* ===== 50-v14.js ===== */
/* ===== v14: Teman / Pengikut / Mengikuti terlihat oleh semua pemain di profil (lintas perangkat) ===== */
(function(){
const SOC='sandbox/v9/soc/',BR=['wss://broker.emqx.io:8084/mqtt','wss://broker.hivemq.com:8884/mqtt','wss://test.mosquitto.org:8081'];
const hs=t=>{let h=2166136261;for(let i=0;i<t.length;i++)h=Math.imul(h^t.charCodeAt(i),16777619);return(h>>>0).toString(36)};
const lw=n=>hs(String(n).toLowerCase()),low=n=>String(n||'').toLowerCase();
const clean=a=>(Array.isArray(a)?a:[]).filter(x=>typeof x==='string'&&x.length>0&&x.length<=20).map(x=>x.replace(/[\u0000-\u001f<>"&]/g,'')).slice(0,300);
const cleanB=t=>String(t||'').replace(/[\u0000-\u001f<>"&]/g,' ').replace(/\s+/g,' ').trim().slice(0,150);
const cache=()=>{const c=ls.get('sp_soc',{});return c&&typeof c==='object'&&!Array.isArray(c)?c:{}};
const mq=()=>window.__spMq;

/* 1. publikasikan daftar teman & yang diikuti milik sendiri */
let lastSig='',lastT=0;
async function publish(){try{if(typeof me==='undefined'||!me||!mq())return;const f=FRD(me),rec={n:me.name,f:clean(f.f),fo:clean(f.fo),ts:Date.now(),b:cleanB(me.bio),j:+me.joined||0},sg=hs(me.name+JSON.stringify([rec.f,rec.fo,rec.b,rec.j]));
 if(sg===lastSig&&Date.now()-lastT<216e5)return;
 if(await mq().pushAll([{t:SOC+lw(me.name),p:JSON.stringify(rec)}])){lastSig=sg;lastT=Date.now()}}catch(e){}}

/* 2. ambil data sosial semua pemain */
let pulling=0,lastPull=0;
async function pull(){if(pulling)return;pulling=1;lastPull=Date.now();try{if(typeof me==='undefined'||!me||!mq()||!(window.mqtt||await mq().lib()))return;const got={};
 await Promise.all(BR.map(url=>new Promise(res=>{let m,done=0;const end=()=>{if(done)return;done=1;try{m.end(true)}catch(e){}res()};
  try{m=mqtt.connect(url,{clientId:'sps_'+Math.random().toString(16).slice(2,12),connectTimeout:6000,reconnectPeriod:0,clean:true})}catch(e){return res()}
  m.on('error',end);m.on('close',end);m.on('connect',()=>{m.subscribe(SOC+'+',{qos:0});setTimeout(end,2500)});
  m.on('message',(t,b)=>{try{const s=b.toString();if(!s)return;const d=JSON.parse(s);if(!d||typeof d.n!=='string'||d.n.length>20||t!==SOC+lw(d.n))return;const k=low(d.n);if(!got[k]||d.ts>got[k].ts)got[k]={n:d.n.replace(/[\u0000-\u001f<>"&]/g,''),f:clean(d.f),fo:clean(d.fo),ts:+d.ts||0,b:cleanB(d.b),j:(+d.j>9e11&&+d.j<4e12)?+d.j:0}}catch(e){}});
  setTimeout(end,6500)})));
 const c=cache();let ch=0;for(const k in got){if(!c[k]||got[k].ts>=c[k].ts){c[k]=got[k];ch=1}}if(ch)ls.set('sp_soc',c);deco()}catch(e){}finally{pulling=0}}

/* 3. hitung angka + daftar nama untuk satu pemain */
function soc(n){const c=cache(),me0=me.name,k=low(n),S={fr:new Map(),fo:new Map(),fl:new Map()};
 const add=(M,x)=>{if(x)M.set(low(x),x)};
 const u=users[n]||users[Object.keys(users).find(x=>low(x)===k)];
 if(n===me0){FRD(me).f.forEach(x=>add(S.fr,x));FRD(me).fo.forEach(x=>add(S.fo,x))}
 else{const r=c[k];if(r){r.f.forEach(x=>add(S.fr,x));r.fo.forEach(x=>add(S.fo,x))}if(u&&!u.rm){FRD(u).f.forEach(x=>add(S.fr,x));FRD(u).fo.forEach(x=>add(S.fo,x))}}
 for(const kk in c)if(c[kk].fo.some(x=>low(x)===k))add(S.fl,c[kk].n);
 for(const kk in users){if(users[kk]===me)continue;if(!users[kk].rm&&FRD(users[kk]).fo.some(x=>low(x)===k))add(S.fl,kk)}
 if(n!==me0&&FRD(me).fo.some(x=>low(x)===k))add(S.fl,me0);
 return{fr:[...S.fr.values()],fo:[...S.fo.values()],fl:[...S.fl.values()]}}
window.spSoc=soc;

/* 4. tampilkan di halaman profil + bisa diketuk untuk melihat daftarnya */
function decorate(){try{const pc=document.querySelector('#ov .pch'),st=document.getElementById('pst3');if(!pc||!st||typeof me==='undefined'||!me)return;
 const n=st.dataset.n;if(!n||(typeof isBot==='function'&&isBot(n)))return;const S=soc(n),sp=pc.querySelectorAll(':scope > span');if(sp.length<3)return;
 [['fr','Teman'],['fl','Pengikut'],['fo','Mengikuti']].forEach(([k,l],i)=>{sp[i].textContent=S[k].length+' '+l;sp[i].dataset.a='soclist';sp[i].dataset.v=k+'|'+n;sp[i].style.cursor='pointer'});
 /* bio + bergabung sejak */
 const k=low(n),r=cache()[k],u=users[n]||users[Object.keys(users).find(x=>low(x)===k)],mine=n===me.name;
 const bio=mine?me.bio:((r&&r.b)||(u&&u.bio)),jn=mine?me.joined:((r&&r.j)||(u&&u.joined));
 const old=document.getElementById('pbio');if(old)old.remove();
 let h='<div id="pbio" style="margin:8px 0 10px;text-align:center">';
 h+='<div style="font-size:14px;line-height:1.4;'+(bio?'':'opacity:.6;')+'">'+(bio?esc(bio):(mine?'Belum ada bio':''))+'</div>';
 if(jn)h+='<div style="font-size:12px;opacity:.75;margin-top:4px">Bergabung sejak '+new Date(jn).getFullYear()+'</div>';
 if(mine)h+='<button class="btn sm g" data-a="bioedit" style="margin-top:8px">Edit Bio</button>';
 pc.insertAdjacentHTML('beforebegin',h+'</div>')}catch(e){}}
let ob=null,ovEl=null;
function deco(){if(ob)ob.disconnect();try{decorate()}finally{if(ob&&ovEl)ob.observe(ovEl,{childList:true})}}
function watch(){const o=document.getElementById('ov');if(!o)return setTimeout(watch,1000);
 ovEl=o;ob=new MutationObserver(()=>{deco();if(document.querySelector('#ov .pch')&&Date.now()-lastPull>20000)setTimeout(pull,300)});ob.observe(o,{childList:true})}
watch();

/* 5. daftar nama (sheet bawah) */
const T={fr:'Teman',fl:'Pengikut',fo:'Mengikuti'};
Object.assign(act,{
 soclist(v){const i=String(v).indexOf('|'),k=v.slice(0,i),n=v.slice(i+1);if(!T[k])return;const L=soc(n)[k].slice().sort((a,b)=>low(a)<low(b)?-1:1);
  const row=x=>{const a=(window.spUI&&spUI.avFor&&spUI.avFor(x))||(users[x]&&users[x].av)||null,u=users[x];
   return '<button data-a="soclistgo" data-v="'+esc(x)+'" style="display:flex;align-items:center;gap:12px;width:100%;background:none;border:0;border-bottom:1px solid rgba(255,255,255,.08);padding:10px 4px;color:inherit;font:inherit;text-align:left;cursor:pointer">'+circ(a,44)+'<b>'+esc(x)+'</b>'+(u&&u.verified||(window.spVerified&&spVerified(x))?'<span class="vb">✔</span>':'')+'</button>'};
  shOpen('<div class="shn" style="margin:6px 0 10px">'+T[k]+' · '+esc(n)+' ('+L.length+')</div><div style="max-height:52vh;overflow:auto">'+(L.length?L.map(row).join(''):'<div style="opacity:.7;padding:14px 4px">Belum ada.</div>')+'</div>')},
 bioedit(){const ov='<div class="shn" style="margin:6px 0 10px">Edit Bio</div><textarea id="bioin" maxlength="150" rows="4" placeholder="Ceritakan tentang dirimu (maks 150 huruf)" style="width:100%;box-sizing:border-box;padding:10px;border:3px solid #000;border-radius:10px;font:inherit;resize:none">'+esc(me.bio||'')+'</textarea><button class="btn w" data-a="biosave" style="margin-top:10px">Simpan</button>';shOpen(ov)},
 biosave(){const el=document.getElementById('bioin');if(!el)return;me.bio=cleanB(el.value);save();shClose();window.spSocPublish();toast('Bio disimpan');deco()},
 soclistgo(x){if(!users[x])users[x]={rm:1,bux:0,av:{skin:SKIN[0],shirt:SHIRT[1],pants:PANTS[1]},games:[],notes:[]};shClose();act.prof(x)}});

window.spSocPublish=()=>{lastSig='';publish()};
/* jadwal */
setInterval(()=>{if(typeof me!=='undefined'&&me&&!document.hidden)publish()},6000);
setInterval(()=>{if(typeof me!=='undefined'&&me&&!document.hidden)pull()},40000);
const _en=enter;enter=function(){const r=_en.apply(this,arguments);try{if(me&&!me.joined){me.joined=Date.now();save()}}catch(e){}setTimeout(()=>{publish();pull()},2000);return r};
})();
;

/* ===== 51-v16.js ===== */
/* ===== v16: Bot di Panel Owner: mengisi map, bisa dihentikan, dipindah map ===== */
(function(){
const HEX=/^#[0-9a-f]{6}$/i,HATS=['none','cap','crown'];
const PH=['halo semua!','ayo main bareng','wkwk seru juga map nya','gg','siapa yang udah sampai finish?','hati-hati lava ya','mantap map nya','ada yang mau jadi teman?','semangat ya!','lompat lompat'];
const isOwner=()=>{try{return !!me&&me.role==='owner'&&staff()}catch(e){return false}};
const cfg=()=>{const c=ls.get('sp_botcfg',null);return c&&Array.isArray(c.bots)?c:{bots:[],chat:true}};
const roster=()=>{const r=ls.get('sp_botr',null);return r&&Array.isArray(r.bots)?r:{bots:[],chat:true}};
const clean=b=>({id:String(b.id||'').replace(/[^\w-]/g,'').slice(0,12),n:String(b.n||'').replace(/[^\w\- ]/g,'').trim().slice(0,14),g:String(b.g||'*').replace(/[^\w\-*]/g,'').slice(0,40)||'*',on:!!b.on,sk:HEX.test(b.sk)?b.sk:SKIN[0],sh:HEX.test(b.sh)?b.sh:SHIRT[0],pa:HEX.test(b.pa)?b.pa:PANTS[0],ht:HATS.includes(b.ht)?b.ht:'none'});
const rnd=a=>a[Math.floor(Math.random()*a.length)];
const BO={};let chatAt=0;

/* ---- jalankan bot di dalam game ---- */
function clear(){for(const id in BO){try{scene.remove(remote['bot_'+id].g)}catch(e){}delete remote['bot_'+id];delete BO[id]}}
function topY(x,z,ref){let y=baseOn?0:null;for(const b of boxes||[])if(!b.sh&&inF(b,x,z,.2)&&b.top<=ref+4&&(y===null||b.top>y))y=b.top;return y}
function spawn(){clear();if(!run||testing||!curG)return;
 roster().bots.map(clean).filter(b=>b.on&&b.n&&(b.g==='*'||b.g===String(curG.id))).slice(0,12).forEach(b=>{
  let x=SP.x+(Math.random()-.5)*10,z=SP.z+(Math.random()-.5)*10,y=topY(x,z,SP.y);if(y===null){x=SP.x;z=SP.z;y=Math.max(0,SP.y-1)}
  const av={skin:b.sk,shirt:b.sh,pants:b.pa,hat:b.ht},g=mkAvatar(av);g.add(tagSprite(b.n));g.position.set(x,y,z);scene.add(g);
  remote['bot_'+b.id]={g,name:b.n,tx:x,ty:y,tz:z,tr:0,ph:0,av,bot:1};BO[b.id]={hx:x,hz:z,dx:x,dz:z,next:0}});
 try{if(document.getElementById('pause').style.display=='flex')plist()}catch(e){}}
function step(){if(!run||paused)return;const now=Date.now();
 for(const id in BO){const e=BO[id],o=remote['bot_'+id];if(!o)continue;
  const dx=e.dx-o.tx,dz=e.dz-o.tz,d=Math.hypot(dx,dz);
  if(d<.6){if(now>e.next){e.next=now+1500+Math.random()*4500;for(let i=0;i<6;i++){const tx=Math.max(-46,Math.min(46,e.hx+(Math.random()-.5)*30)),tz=Math.max(-46,Math.min(46,e.hz+(Math.random()-.5)*30)),y=topY(tx,tz,o.ty);if(y!==null&&Math.abs(y-o.ty)<2.2){e.dx=tx;e.dz=tz;break}}}}
  else{o.tx+=dx/d*.45;o.tz+=dz/d*.45;o.tr=Math.atan2(dx,dz);const y=topY(o.tx,o.tz,o.ty);if(y!==null&&Math.abs(y-o.ty)<2.5)o.ty=y}}
 if(roster().chat&&now>chatAt){chatAt=now+35000+Math.random()*55000;const ks=Object.keys(BO);if(ks.length){const o=remote['bot_'+rnd(ks)];if(o)addChat(o.name,rnd(PH))}}}
setInterval(step,130);
window.spBotsChanged=()=>{if(run)spawn()};
/* syncPeers tidak boleh menghapus bot */
const _sp=syncPeers;syncPeers=function(){const st={};for(const k in remote)if(k.indexOf('bot_')===0){st[k]=remote[k];delete remote[k]}
 try{return _sp.apply(this,arguments)}finally{Object.assign(remote,st)}};
const _sg=startGame;startGame=function(){const r=_sg.apply(this,arguments);setTimeout(()=>{try{window.spBotFetch&&spBotFetch()}catch(e){}spawn()},1500);return r};
const _en=enter;enter=function(){const r=_en.apply(this,arguments);setTimeout(()=>{try{window.spBotFetch&&spBotFetch()}catch(e){}},3500);return r};
setInterval(()=>{if(typeof me==='undefined'||!me||document.hidden)return;try{window.spBotFetch&&spBotFetch()}catch(e){}
 if(isOwner()&&cfg().dirty)push(true)},45000);

/* ---- panel owner: tab Bot ---- */
const games=()=>{try{return pubGames()}catch(e){return[]}};
const gname=id=>id==='*'?'Semua map':((games().find(g=>String(g.id)===id)||{}).name||'(map dihapus)');
const opts=sel=>'<option value="*"'+(sel==='*'?' selected':'')+'>Semua map</option>'+games().map(g=>'<option value="'+esc(g.id)+'"'+(String(g.id)===sel?' selected':'')+'>'+esc(g.name)+'</option>').join('');
function botHTML(){const c=cfg(),n=c.bots.filter(b=>b.on).length;
 let h='<div class="card" style="margin-bottom:12px"><label>Nama bot (pisahkan dengan koma)</label><input type="text" id="bt_n" placeholder="Raka, Dewi, Bima" autocomplete="off" autocapitalize="none"><label>Isi map</label><select id="bt_g">'+opts('*')+'</select><button class="btn w" data-a="botadd" style="margin-top:10px">+ Tambah &amp; Jalankan</button></div>'
 +'<div class="card" style="margin-bottom:12px"><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><b style="flex:1">'+c.bots.length+' bot · '+n+' aktif</b><button class="btn sm g" data-a="botstartall">Jalankan semua</button><button class="btn sm o" data-a="botstopall">Hentikan semua</button></div><button class="btn sm '+(c.chat?'g':'o')+'" data-a="botchat" style="margin-top:8px">Bot chat: '+(c.chat?'Aktif':'Mati')+'</button></div>';
 h+=c.bots.length?c.bots.map(b=>'<div class="card" style="margin-bottom:10px"><div style="display:flex;align-items:center;gap:10px">'+circ({skin:b.sk,shirt:b.sh,pants:b.pa,hat:b.ht},40)+'<div style="flex:1"><b>'+esc(b.n)+'</b><br><small>'+esc(gname(b.g))+' · '+(b.on?'Aktif':'Berhenti')+'</small></div><button class="btn sm '+(b.on?'o':'g')+'" data-a="botrun" data-v="'+esc(b.id)+'">'+(b.on?'Hentikan':'Jalankan')+'</button></div><div style="display:flex;gap:6px;margin-top:8px"><select id="bm_'+esc(b.id)+'" style="flex:1">'+opts(b.g)+'</select><button class="btn sm g" data-a="botmap" data-v="'+esc(b.id)+'">Pindah map</button><button class="btn sm o" data-a="botdel" data-v="'+esc(b.id)+'">Hapus</button></div></div>').join(''):'<div class="empty2"><p style="margin:0">Belum ada bot. Tambahkan nama di atas.</p></div>';
 return h}
const _ph=panH;panH=function(){if(!isOwner())return _ph.apply(this,arguments);
 const want=!!window.__bt;if(want)pt='rep';let h=_ph.apply(this,arguments);
 const i=h.indexOf('</div>');if(i<0)return h;let head=h.slice(0,i),rest=h.slice(i+6);
 if(want)head=head.replace(/ptb on/g,'ptb ');
 head+='<button class="ptb '+(want?'on':'')+'" data-a="pt" data-v="bot">Bot</button></div>';
 return head+(want?botHTML():rest)};
const _pt=act.pt;act.pt=function(v){window.__bt=(v==='bot'&&isOwner());return _pt.call(this,v==='bot'?'rep':v)};

async function push(silent){const c=cfg(),bots=c.bots.map(clean);let ts=0;try{ts=window.spBotPublish?await spBotPublish(bots,c.chat):0}catch(e){}
 ls.set('sp_botr',{ts:ts||Date.now(),bots,chat:c.chat});c.dirty=!ts;ls.set('sp_botcfg',c);
 if(!silent)toast(ts?'Bot diperbarui untuk semua pemain ✓':'Tersimpan di perangkat ini, dikirim ke semua pemain saat online');
 try{spBotsChanged()}catch(e){}if(!silent)try{render()}catch(e){}}
const guard=f=>function(){if(!isOwner())return toast('Hanya Owner yang bisa mengatur bot');return f.apply(this,arguments)};
Object.assign(act,{
 botadd:guard(function(){const c=cfg(),el=document.getElementById('bt_n'),g=(document.getElementById('bt_g')||{}).value||'*';
  const names=String(el&&el.value||'').split(/[,\n]/).map(x=>x.replace(/[^\w\- ]/g,'').trim().slice(0,14)).filter(Boolean);
  if(!names.length)return toast('Isi nama bot dulu');let add=0;
  names.forEach(n=>{if(c.bots.length>=24||/^(owner|admin|coowner|co-owner)$/i.test(n)||c.bots.some(b=>b.n.toLowerCase()===n.toLowerCase()))return;
   c.bots.push({id:Math.random().toString(36).slice(2,8),n,g,on:true,sk:rnd(SKIN),sh:rnd(SHIRT),pa:rnd(PANTS),ht:rnd(HATS)});add++});
  if(!add)return toast('Nama sudah dipakai atau batas 24 bot tercapai');ls.set('sp_botcfg',c);push()}),
 botrun:guard(function(id){const c=cfg(),b=c.bots.find(x=>x.id===id);if(!b)return;b.on=!b.on;ls.set('sp_botcfg',c);push()}),
 botdel:guard(function(id){const c=cfg();c.bots=c.bots.filter(x=>x.id!==id);ls.set('sp_botcfg',c);push()}),
 botmap:guard(function(id){const c=cfg(),b=c.bots.find(x=>x.id===id),s=document.getElementById('bm_'+id);if(!b||!s)return;b.g=s.value;ls.set('sp_botcfg',c);push()}),
 botstopall:guard(function(){const c=cfg();c.bots.forEach(b=>b.on=false);ls.set('sp_botcfg',c);push()}),
 botstartall:guard(function(){const c=cfg();c.bots.forEach(b=>b.on=true);ls.set('sp_botcfg',c);push()}),
 botchat:guard(function(){const c=cfg();c.chat=!c.chat;ls.set('sp_botcfg',c);push()})});
})();
;

/* ===== 52-v17.js ===== */
/* ===== v17: Luau Pro: Material/Neon, BrickColor, CFrame, Humanoid (WalkSpeed, JumpPower, fly, noclip), UserInputService, Light, Body movers, Model, Value, Debris, dll ===== */
(function(){
const L=window.SPL={};
const defs=()=>({noclip:false,fly:false,ph:false,ws:16,jp:50,grav:196.2,vel:null,bvs:[],anch:false,tr:0,mv:null,jump:false,dn:false,mh:100,st:'Running',sit:false,tint:{},keys:L.keys||{},cas:{},tags:{}});
const rs=()=>{const k=L.keys;Object.keys(L).forEach(x=>delete L[x]);Object.assign(L,defs());L.keys=k||{}};
rs();
const nn=(v,a,b,d)=>{v=+v;return isFinite(v)?Math.min(b,Math.max(a,v)):d};
const clsOf=x=>{try{return x&&x.$g?x.$g('ClassName'):typeof x}catch(e){return'?'}};
const addV=(a,b)=>new LV(a.x+b.x,a.y+b.y,a.z+b.z);

/* ===== Enum ===== */
const E=G.get('Enum'),mkE=a=>mkT(Object.fromEntries(a.map(x=>[x,x]))),setE=(n,a)=>{if(!E.get(n))E.set(n,mkE(a))};
setE('Material',['Plastic','SmoothPlastic','Neon','Glass','ForceField','Metal','DiamondPlate','CorrodedMetal','Foil','Wood','WoodPlanks','Brick','Concrete','Granite','Marble','Slate','Sand','Grass','LeafyGrass','Ice','Fabric','Cobblestone','Pebble','Rock','Basalt','Salt','Snow','Mud','Ground','Limestone','Pavement','Asphalt']);
setE('KeyCode',[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].concat(['Zero','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Space','LeftShift','RightShift','LeftControl','RightControl','LeftAlt','Return','Escape','Tab','Backspace','Up','Down','Left','Right','Unknown'],Array.from({length:12},(_,i)=>'F'+(i+1))));
setE('UserInputType',['Keyboard','MouseButton1','MouseButton2','MouseMovement','Touch','Focus']);
setE('UserInputState',['Begin','Change','End']);
const HST=['FallingDown','Ragdoll','GettingUp','Jumping','Swimming','Freefall','Flying','Landed','Running','Unused','RunningNoPhysics','StrafingNoPhysics','Climbing','Seated','PlatformStanding','Dead','Physics'];
setE('HumanoidStateType',HST.filter(x=>x!='Unused'));
setE('PartType',['Block','Ball','Cylinder']);setE('CameraType',['Custom','Scriptable','Fixed','Follow']);setE('RaycastFilterType',['Exclude','Include','Blacklist','Whitelist']);
setE('RenderPriority',['First','Input','Camera','Character','Last']);setE('SurfaceType',['Smooth','Studs','Inlet','Weld']);setE('Technology',['Compatibility','Voxel','ShadowMap','Future']);
if(!E.get('EasingStyle'))setE('EasingStyle',['Linear','Sine','Quad','Cubic','Quart','Quint','Exponential','Circular','Back','Bounce','Elastic']);

/* ===== BrickColor ===== */
const BCN={'Really red':'#ff0000','Bright red':'#c4281c','Bright blue':'#0d69ac','Really blue':'#0000ff','Bright green':'#4b974b','Lime green':'#00ff00','Bright yellow':'#f5cd30','Bright orange':'#da8541','Hot pink':'#ff66cc','Pink':'#ff98dc','Magenta':'#aa00aa','Royal purple':'#6b327c','Black':'#1b2a35','Really black':'#000000','White':'#f2f3f3','Institutional white':'#f8f8f8','Medium stone grey':'#a3a2a5','Dark stone grey':'#635f62','Light stone grey':'#e5e4df','Cyan':'#049f9a','Teal':'#12eed4','Toothpaste':'#7df9ff','Navy blue':'#203a56','Brown':'#7c5c46','Dark orange':'#a05f35','Gold':'#efb838','Camo':'#3a7d15','Light blue':'#9fc3e9','Persimmon':'#ff6600','Neon orange':'#d5733d'};
class BCW{constructor(n,h){this.nm=n;this.hx=h}$g(k){switch(k){case'Name':return this.nm;case'Color':return hexC(this.hx);case'Number':return 1;case'r':return parseInt(this.hx.slice(1,3),16)/255;case'g':return parseInt(this.hx.slice(3,5),16)/255;case'b':return parseInt(this.hx.slice(5,7),16)/255}}$str(){return this.nm}}
const bcNew=(v,g,b)=>{if(v instanceof LC)return new BCW('Custom',cHex(v));if(typeof v==='number'&&g!==undefined)return new BCW('Custom',cHex(new LC(v,g,b)));if(typeof v==='number'){const k=Object.keys(BCN)[Math.abs(v|0)%Object.keys(BCN).length];return new BCW(k,BCN[k])}
 const k=Object.keys(BCN).find(n=>n.toLowerCase()==String(v).toLowerCase());return new BCW(k||'Medium stone grey',k?BCN[k]:BCN['Medium stone grey'])};
{const o={new:bcNew,Random:()=>bcNew(Math.floor(Math.random()*30)),palette:i=>bcNew(i)};['Red:Bright red','Blue:Bright blue','Green:Bright green','Yellow:Bright yellow','Orange:Bright orange','White:White','Black:Black','Gray:Medium stone grey','Pink:Hot pink','Purple:Royal purple'].forEach(x=>{const[a,b]=x.split(':');o[a]=()=>bcNew(b)});G.set('BrickColor',mkT(o))}
const cOf=v=>v instanceof BCW?v.hx:cHex(v);

/* ===== Vector3 / Color3 tambahan ===== */
{const g0=LV.prototype.$g;LV.prototype.$g=function(k){const r=g0.call(this,k);if(r!==undefined)return r;const t=this;switch(k){case'Dot':return(_,o)=>t.x*o.x+t.y*o.y+t.z*o.z;case'Cross':return(_,o)=>new LV(t.y*o.z-t.z*o.y,t.z*o.x-t.x*o.z,t.x*o.y-t.y*o.x);case'Lerp':return(_,o,a)=>new LV(t.x+(o.x-t.x)*a,t.y+(o.y-t.y)*a,t.z+(o.z-t.z)*a);case'Abs':return()=>new LV(Math.abs(t.x),Math.abs(t.y),Math.abs(t.z));case'Floor':return()=>new LV(Math.floor(t.x),Math.floor(t.y),Math.floor(t.z));case'FuzzyEq':return(_,o,e)=>Math.hypot(t.x-o.x,t.y-o.y,t.z-o.z)<=(e||1e-5);case'Min':return(_,o)=>new LV(Math.min(t.x,o.x),Math.min(t.y,o.y),Math.min(t.z,o.z));case'Max':return(_,o)=>new LV(Math.max(t.x,o.x),Math.max(t.y,o.y),Math.max(t.z,o.z))}}
 const V=G.get('Vector3');V.set('xAxis',new LV(1,0,0));V.set('yAxis',new LV(0,1,0));V.set('zAxis',new LV(0,0,1));
 const c0=LC.prototype.$g;LC.prototype.$g=function(k){const r=c0.call(this,k);if(r!==undefined)return r;const t=this;if(k=='Lerp')return(_,o,a)=>new LC(t.r+(o.r-t.r)*a,t.g+(o.g-t.g)*a,t.b+(o.b-t.b)*a);if(k=='ToHex')return()=>cHex(t).slice(1)}}

/* ===== CFrame ===== */
const I3=[1,0,0,0,1,0,0,0,1];
const mm=(a,b)=>{const r=[];for(let i=0;i<3;i++)for(let j=0;j<3;j++)r.push(a[i*3]*b[j]+a[i*3+1]*b[3+j]+a[i*3+2]*b[6+j]);return r};
const mv=(m,v)=>new LV(m[0]*v.x+m[1]*v.y+m[2]*v.z,m[3]*v.x+m[4]*v.y+m[5]*v.z,m[6]*v.x+m[7]*v.y+m[8]*v.z);
const tr3=m=>[m[0],m[3],m[6],m[1],m[4],m[7],m[2],m[5],m[8]];
const Rx=a=>{const c=Math.cos(a),s=Math.sin(a);return[1,0,0,0,c,-s,0,s,c]},Ry=a=>{const c=Math.cos(a),s=Math.sin(a);return[c,0,s,0,1,0,-s,0,c]},Rz=a=>{const c=Math.cos(a),s=Math.sin(a);return[c,-s,0,s,c,0,0,0,1]};
const ang=(x,y,z)=>mm(Rx(x),mm(Ry(y),Rz(z)));
const eul=m=>[Math.atan2(-m[5],m[8]),Math.asin(Math.max(-1,Math.min(1,m[2]))),Math.atan2(-m[1],m[0])];
class CF{constructor(p,m){this.p=p;this.m=m||I3}
 $g(k){const t=this,m=this.m;switch(k){case'Position':return t.p;case'X':return t.p.x;case'Y':return t.p.y;case'Z':return t.p.z;
  case'LookVector':return new LV(-m[2],-m[5],-m[8]);case'RightVector':return new LV(m[0],m[3],m[6]);case'UpVector':return new LV(m[1],m[4],m[7]);
  case'Inverse':return()=>{const q=tr3(m),np=mv(q,t.p);return new CF(new LV(-np.x,-np.y,-np.z),q)};
  case'ToWorldSpace':return(_,c)=>cfMul(t,c);case'ToObjectSpace':return(_,c)=>cfMul(t.$g('Inverse')(),c);
  case'PointToWorldSpace':return(_,v)=>addV(t.p,mv(m,v));case'PointToObjectSpace':return(_,v)=>mv(tr3(m),new LV(v.x-t.p.x,v.y-t.p.y,v.z-t.p.z));case'VectorToWorldSpace':return(_,v)=>mv(m,v);case'VectorToObjectSpace':return(_,v)=>mv(tr3(m),v);
  case'Lerp':return(_,c,a)=>new CF(new LV(t.p.x+(c.p.x-t.p.x)*a,t.p.y+(c.p.y-t.p.y)*a,t.p.z+(c.p.z-t.p.z)*a),a<.5?m:c.m);
  case'ToEulerAnglesXYZ':case'ToOrientation':return()=>eul(m)}}
 $str(){return this.p.x+', '+this.p.y+', '+this.p.z+', '+this.m.join(', ')}}
const cfMul=(a,b)=>new CF(addV(a.p,mv(a.m,b.p)),mm(a.m,b.m));
const lookM=(at,tg,up)=>{let z=new LV(at.x-tg.x,at.y-tg.y,at.z-tg.z);const zl=Math.hypot(z.x,z.y,z.z)||1;z=new LV(z.x/zl,z.y/zl,z.z/zl);up=up||new LV(0,1,0);let x=new LV(up.y*z.z-up.z*z.y,up.z*z.x-up.x*z.z,up.x*z.y-up.y*z.x);let xl=Math.hypot(x.x,x.y,x.z);if(xl<1e-6){x=new LV(1,0,0);xl=1}x=new LV(x.x/xl,x.y/xl,x.z/xl);const y=new LV(z.y*x.z-z.z*x.y,z.z*x.x-z.x*x.z,z.x*x.y-z.y*x.x);return[x.x,y.x,z.x,x.y,y.y,z.y,x.z,y.z,z.z]};
G.set('CFrame',mkT({new:(a,b,c)=>{if(a===undefined)return new CF(new LV(0,0,0));if(a instanceof LV&&b instanceof LV)return new CF(a,lookM(a,b));if(a instanceof LV)return new CF(a);return new CF(new LV(+a||0,+b||0,+c||0))},
 Angles:(x,y,z)=>new CF(new LV(0,0,0),ang(+x||0,+y||0,+z||0)),fromEulerAnglesXYZ:(x,y,z)=>new CF(new LV(0,0,0),ang(+x||0,+y||0,+z||0)),fromOrientation:(x,y,z)=>new CF(new LV(0,0,0),ang(+x||0,+y||0,+z||0)),
 lookAt:(a,b,u)=>new CF(a,lookM(a,b,u)),identity:new CF(new LV(0,0,0))}));
{const _ar=arith;arith=function(op,a,b){if(a instanceof CF||b instanceof CF){
  if(op=='*'){if(a instanceof CF&&b instanceof CF)return cfMul(a,b);if(a instanceof CF&&b instanceof LV)return addV(a.p,mv(a.m,b))}
  if(op=='+'&&a instanceof CF&&b instanceof LV)return new CF(addV(a.p,b),a.m);
  if(op=='-'&&a instanceof CF&&b instanceof LV)return new CF(new LV(a.p.x-b.x,a.p.y-b.y,a.p.z-b.z),a.m);
  throw new Error('operasi CFrame tidak valid')}return _ar(op,a,b)};
 const ty=G.get('typeof');G.set('typeof',v=>v instanceof CF?'CFrame':v instanceof BCW?'BrickColor':ty(v))}
const cfFromObj=(o)=>new CF(new LV(o.position.x,o.position.y,o.position.z),ang(o.rotation.x,o.rotation.y,o.rotation.z));
const cfToObj=(o,cf)=>{o.position.set(cf.p.x,cf.p.y,cf.p.z);const e=eul(cf.m);o.rotation.set(e[0],e[1],e[2])};

/* ===== library tambahan ===== */
G.set('tick',()=>Date.now()/1000);G.set('time',()=>performance.now()/1000);
{const xr=seed=>{let s=(seed>>>0)||1;return()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296}};
 G.set('Random',mkT({new:seed=>{const r=seed===undefined?Math.random:xr(+seed);return mkT({NextNumber:(_,a,b)=>a===undefined?r():a+(b-a)*r(),NextInteger:(_,a,b)=>a+Math.floor(r()*(b-a+1))})}}));
 STR.set('split',(s,sep)=>tbl2(s.split(sep===undefined?',':sep)));
 const T=G.get('table');T.set('freeze',t=>t);T.set('isfrozen',()=>false);T.set('create',(n,v)=>{const t=new LT();for(let i=1;i<=n;i++)t.set(i,v);return t});T.set('pack',(...a)=>{const t=tbl2(a);t.set('n',a.length);return t});
 T.set('move',(a,f,e,t,b)=>{b=b||a;const v=[];for(let i=f;i<=e;i++)v.push(a.get(i));v.forEach((x,i)=>b.set(t+i,x));return b});
 MATH.set('lerp',(a,b,t)=>a+(b-a)*t);
 G.set('bit32',mkT({band:(a,b)=>(a&b)>>>0,bor:(a,b)=>(a|b)>>>0,bxor:(a,b)=>(a^b)>>>0,lshift:(a,b)=>(a<<b)>>>0,rshift:(a,b)=>a>>>b,bnot:a=>(~a)>>>0}));
 G.set('NumberRange',mkT({new:(a,b)=>mkT({Min:a,Max:b===undefined?a:b})}));G.set('NumberSequence',mkT({new:(a,b)=>mkT({Value:a,Value2:b})}));
 G.set('RaycastParams',mkT({new:()=>mkT({FilterDescendantsInstances:new LT(),FilterType:'Exclude',IgnoreWater:true})}));G.set('OverlapParams',G.get('RaycastParams'))}

/* ===== Part: Material (Neon!), BrickColor, CFrame, collision, dll ===== */
let NL=0;
const findBox=w=>{const o=w.o;if(!o||typeof boxes==='undefined'||!boxes)return null;const tp=o.y+o.sy/2;return boxes.find(b=>!b.sh&&Math.abs(b.x-o.x)<.01&&Math.abs(b.z-o.z)<.01&&Math.abs(b.top-tp)<.01)||null};
const syncBox=w=>{const b=w.bx,m=w.m;if(!b||!m)return;const a=m.rotation.y,c=Math.abs(Math.cos(a)),s=Math.abs(Math.sin(a));b.x=m.position.x;b.z=m.position.z;b.hw=(c*m.scale.x+s*m.scale.z)/2;b.hd=(s*m.scale.x+c*m.scale.z)/2;b.top=m.position.y+m.scale.y/2;b.bot=m.position.y-m.scale.y/2};
const addBox=w=>{if(!w.bx){w.bx={x:0,z:0,hw:1,hd:1,top:0,bot:0};syncBox(w)}if(typeof boxes!=='undefined'&&boxes&&!boxes.includes(w.bx))boxes.push(w.bx)};
const delBox=w=>{if(w.bx&&typeof boxes!=='undefined'&&boxes){const i=boxes.indexOf(w.bx);if(i>=0)boxes.splice(i,1)}};
function applyMat(w){const mt=w.m.material;if(!mt)return;const k=w.mat||'Plastic',c=w.col||(w.o&&w.o.c)||'#ffffff';
 if(mt.emissive){if(k=='Neon'){mt.emissive.set(c);mt.emissiveIntensity=1;mt.color.set(c)}else if(k=='ForceField'){mt.emissive.set(c);mt.emissiveIntensity=.6}else{mt.emissive.set('#000000');mt.emissiveIntensity=0}}
 if(w.trs===undefined){if(k=='Glass'||k=='ForceField'||k=='Ice'){mt.transparent=true;mt.opacity=k=='Glass'?.45:k=='Ice'?.8:.55}else mt.opacity=1}
 if(k=='Neon'&&!w.glow&&NL<4&&typeof THREE!=='undefined'&&THREE.PointLight){NL++;w.glow=new THREE.PointLight(c,.7,10);w.m.add(w.glow)}else if(k!='Neon'&&w.glow){w.m.remove(w.glow);w.glow=null;NL--}
 if(w.glow)w.glow.color.set(c);mt.needsUpdate=true}
const attachWs=w=>{PS0.call(w,'Parent',RT.ws);if(w.o.cc!==false&&w.cc!==false)addBox(w)};
const detachWs=w=>{PS0.call(w,'Parent',undefined);delBox(w)};
const PG0=PtW.prototype.$g,PS0=PtW.prototype.$s;
PtW.prototype.$g=function(k){const w=this,m=this.m;switch(k){
 case'Material':return w.mat||'Plastic';case'BrickColor':return new BCW('Custom',w.col||(w.o&&w.o.c)||'#ffffff');case'Reflectance':return w.rf||0;
 case'Anchored':return w.anch!==false;case'CanCollide':return w.cc!==false&&w.o.cc!==false;case'CanTouch':case'CanQuery':return true;case'Massless':case'Locked':case'CastShadow':return false;
 case'Shape':return w.o.t=='ball'?'Ball':w.o.t=='cyl'?'Cylinder':'Block';
 case'CFrame':return cfFromObj(m);case'Orientation':case'Rotation':{const e=eul(ang(m.rotation.x,m.rotation.y,m.rotation.z));return new LV(e[0]*180/Math.PI,e[1]*180/Math.PI,e[2]*180/Math.PI)}
 case'Velocity':case'AssemblyLinearVelocity':case'RotVelocity':return new LV(0,0,0);
 case'Parent':return w.par2||(m.parent?RT.ws:undefined);
 case'IsA':return(_,c)=>/^(Part|BasePart|PVInstance|Instance|FormFactorPart)$/.test(c);
 case'GetChildren':return()=>tbl2(w.kids||[]);case'GetDescendants':return()=>tbl2(w.kids||[]);
 case'FindFirstChild':case'WaitForChild':return(_,n)=>(w.kids||[]).find(c=>c.n==n);case'FindFirstChildOfClass':case'FindFirstChildWhichIsA':return(_,c)=>(w.kids||[]).find(x=>clsOf(x)==c);
 case'SetAttribute':return(_,a,v)=>{(w.at=w.at||{})[a]=v};case'GetAttribute':return(_,a)=>(w.at||{})[a];case'GetTouchingParts':return()=>tbl2([]);case'GetFullName':return()=>'Workspace.'+w.nm;
 case'TouchEnded':return w.te||(w.te=new Sig());
 case'Clone':return()=>{const o2=Object.assign({},w.o,{id:nid()}),m2=mkObj(o2);m2.position.copy?m2.position.copy(m.position):m2.position.set(m.position.x,m.position.y,m.position.z);m2.scale.set(m.scale.x,m.scale.y,m.scale.z);m2.rotation.set(m.rotation.x,m.rotation.y,m.rotation.z);const c=new PtW(o2,m2);['mat','col','rf','anch','cc','trs'].forEach(q=>{if(w[q]!==undefined)c[q]=w[q]});if(w.col)m2.material.color.set(w.col);if(w.trs!==undefined)PS0.call(c,'Transparency',1-(m.material.opacity));applyMat(c);return c};
 case'Destroy':return()=>{delBox(w);if(w.glow){NL--;w.glow=null}if(w.par2&&w.par2.ch)w.par2.ch=w.par2.ch.filter(x=>x!==w);if(m.parent)m.parent.remove(m);RT.parts=RT.parts.filter(x=>x!==w)};
 case'Transparency':return w.trs!==undefined?w.trs:(m.material&&m.material.transparent?1-m.material.opacity:0)}
 return PG0.call(this,k)};
PtW.prototype.$s=function(k,v){const w=this,m=this.m;switch(k){
 case'Material':w.mat=String(v);applyMat(w);return;case'BrickColor':case'Color':if(!w.bxd)w.bxd=0;PS0.call(w,'Color',k=='BrickColor'?(v instanceof BCW?hexC(v.hx):v):v);w.col=cOf(k=='BrickColor'?v:v);applyMat(w);return;
 case'Reflectance':w.rf=+v||0;return;case'Anchored':w.anch=truthy(v);return;
 case'CanCollide':{const on=truthy(v);w.cc=on;if(!on)delBox(w);else if(m.parent){if(!w.bx)w.bx=findBox(w);addBox(w)}return}
 case'Transparency':w.trs=nn(v,0,1,0);PS0.call(w,'Transparency',w.trs);return;
 case'Position':case'Size':case'CFrame':case'Orientation':case'Rotation':if(!w.bxd){w.bxd=1;if(!w.bx)w.bx=findBox(w)}
  if(k=='CFrame'&&v instanceof CF)cfToObj(m,v);else if(k=='Orientation'||k=='Rotation'){if(v instanceof LV)m.rotation.set(v.x*Math.PI/180,v.y*Math.PI/180,v.z*Math.PI/180)}else PS0.call(w,k,v);
  w.dirty=1;return;
 case'Shape':{const s=String(v);if(typeof THREE!=='undefined'&&m.geometry){m.geometry=s=='Ball'?new THREE.SphereGeometry(.5,16,12):s=='Cylinder'?new THREE.CylinderGeometry(.5,.5,1,20):new THREE.BoxGeometry(1,1,1)}w.o.t=s=='Ball'?'ball':s=='Cylinder'?'cyl':'part';return}
 case'Parent':{if(w.par2&&w.par2.ch)w.par2.ch=w.par2.ch.filter(x=>x!==w);w.par2=null;
  if(v instanceof MD){w.par2=v;v.ch.push(w);if(v.ws)attachWs(w);else if(m.parent)detachWs(w)}
  else if(v===RT.ws){attachWs(w)}else if(v==null){detachWs(w)}else PS0.call(w,k,v);return}
 case'Velocity':case'AssemblyLinearVelocity':case'RotVelocity':case'Massless':case'Locked':case'CastShadow':case'CanTouch':case'CanQuery':case'TopSurface':case'BottomSurface':case'Archivable':return}
 return PS0.call(this,k,v)};

/* ===== Model/Folder, Light, Body mover, Value, stub ===== */
class MD{constructor(c,n){this.cls=c;this.nm=n||c;this.ch=[];this.par=null;this.ws=false;this.at={}}get n(){return this.nm}
 desc(){const o=[];this.ch.forEach(c=>{o.push(c);if(c instanceof MD)o.push(...c.desc())});return o}
 parts(){return this.desc().filter(x=>x instanceof PtW)}
 setWs(on){this.ws=on;this.ch.forEach(c=>{if(c instanceof MD)c.setWs(on);else if(c instanceof PtW){on?attachWs(c):detachWs(c)}});if(on){if(!RT.models.includes(this)&&this.par===RT.ws)RT.models.push(this)}else RT.models=RT.models.filter(x=>x!==this)}
 mid(){const p=this.parts();if(!p.length)return new LV(0,0,0);let x=0,y=0,z=0;p.forEach(w=>{x+=w.m.position.x;y+=w.m.position.y;z+=w.m.position.z});return new LV(x/p.length,y/p.length,z/p.length)}
 shift(d){this.parts().forEach(w=>{if(!w.bxd){w.bxd=1;if(!w.bx)w.bx=findBox(w)}w.m.position.set(w.m.position.x+d.x,w.m.position.y+d.y,w.m.position.z+d.z);w.dirty=1})}
 $g(k){const t=this;switch(k){case'Name':return t.nm;case'ClassName':return t.cls;case'Parent':return t.par;case'GetChildren':return()=>tbl2(t.ch);case'GetDescendants':return()=>tbl2(t.desc());
  case'FindFirstChild':case'WaitForChild':return(_,n,r)=>(r?t.desc():t.ch).find(c=>c.n==n);case'FindFirstChildOfClass':case'FindFirstChildWhichIsA':return(_,c)=>t.ch.find(x=>clsOf(x)==c);
  case'IsA':return(_,c)=>c==t.cls||c=='Instance'||(c=='PVInstance'&&t.cls=='Model');case'SetAttribute':return(_,a,v)=>{t.at[a]=v};case'GetAttribute':return(_,a)=>t.at[a];
  case'Destroy':return()=>{t.$s('Parent',undefined);t.parts().forEach(w=>w.$g('Destroy')())};case'ClearAllChildren':return()=>{t.ch.slice().forEach(c=>c.$g('Destroy')&&c.$g('Destroy')())};
  case'MoveTo':return(_,v)=>{const c=t.mid();t.shift(new LV(v.x-c.x,v.y-c.y,v.z-c.z))};case'PivotTo':case'SetPrimaryPartCFrame':return(_,cf)=>{const c=t.mid();t.shift(new LV(cf.p.x-c.x,cf.p.y-c.y,cf.p.z-c.z))};case'GetPivot':return()=>new CF(t.mid());
  case'Clone':return()=>{const n=new MD(t.cls,t.nm);t.ch.forEach(c=>{const cc=c.$g('Clone');if(cc){const x=cc();x.$s('Parent',n)}});return n};
  case'GetFullName':return()=>t.nm}return t.ch.find(c=>c.n==k)}
 $s(k,v){if(k=='Name'){this.nm=tostr(v);return}if(k=='Parent'){if(this.par instanceof MD)this.par.ch=this.par.ch.filter(x=>x!==this);
  if(this.par===RT.pl&&RT.plk)RT.plk=RT.plk.filter(x=>x!==this);this.par=v==null?null:v;
  if(v instanceof MD){v.ch.push(this);this.setWs(v.ws)}else if(v===RT.ws)this.setWs(true);else{if(v===RT.pl){RT.plk=RT.plk||[];RT.plk.push(this)}this.setWs(false)}return}this.at[k]=v}}
class LiW{constructor(c){this.cls=c;this.nm=c;this.p={Brightness:1,Range:12,Color:hexC('#ffffff'),Enabled:true,Angle:90,Shadows:false};this.par=null;this.l=null}get n(){return this.nm}
 rm(){if(this.l&&this.l.parent){this.l.parent.remove(this.l);NL--}this.l=null}
 mk(host){if(NL>=5||typeof THREE==='undefined')return;NL++;this.l=new THREE.PointLight(cHex(this.p.Color),nn(this.p.Brightness,0,10,1),nn(this.p.Range,1,80,12));this.l.visible=truthy(this.p.Enabled);host.add(this.l)}
 $g(k){const t=this;switch(k){case'Name':return t.nm;case'ClassName':return t.cls;case'Parent':return t.par;case'Destroy':return()=>{t.rm();t.par=null};case'IsA':return(_,c)=>c==t.cls||c=='Light'||c=='Instance'}return t.p[k]}
 $s(k,v){if(k=='Name'){this.nm=tostr(v);return}if(k=='Parent'){this.rm();this.par=v;const h=v instanceof PtW?v.m:(v instanceof RootW||v instanceof CPW)?plr:null;if(h)this.mk(h);return}this.p[k]=v;if(this.l){if(k=='Brightness')this.l.intensity=nn(v,0,10,1);else if(k=='Range')this.l.distance=nn(v,1,80,12);else if(k=='Color')this.l.color.set(cHex(v));else if(k=='Enabled')this.l.visible=truthy(v)}}}
class BVW{constructor(c){this.cls=c;this.nm=c;this.p={Velocity:new LV(0,0,0),VectorVelocity:new LV(0,0,0),MaxForce:new LV(4e4,4e4,4e4),P:1250,D:100,Force:new LV(0,0,0),Position:new LV(0,0,0),CFrame:new CF(new LV(0,0,0)),Enabled:true};this.par=null}get n(){return this.nm}
 reg(on){L.bvs=(L.bvs||[]).filter(x=>x!==this);if(on)L.bvs.push(this)}
 $g(k){const t=this;switch(k){case'Name':return t.nm;case'ClassName':return t.cls;case'Parent':return t.par;case'Destroy':return()=>{t.reg(false);t.par=null};case'IsA':return(_,c)=>c==t.cls||c=='Instance'}return t.p[k]}
 $s(k,v){if(k=='Name'){this.nm=tostr(v);return}if(k=='Parent'){this.par=v;this.reg(v instanceof RootW||v instanceof CPW);return}this.p[k]=v}}
class SB{constructor(c){this.cls=c;this.nm=c;this.p={};this.sg={};this.par=null;this.ch=[];if(/Value$/.test(c))this.p.Value=/^(Int|Number)Value$/.test(c)?0:c=='StringValue'?'':c=='BoolValue'?false:undefined}get n(){return this.nm}
 sig(k){return this.sg[k]||(this.sg[k]=new Sig())}
 $g(k){const t=this;switch(k){case'Name':return t.nm;case'ClassName':return t.cls;case'Parent':return t.par;case'IsA':return(_,c)=>c==t.cls||c=='Instance'||(c=='ValueBase'&&/Value$/.test(t.cls));
  case'Destroy':return()=>{t.$s('Parent',undefined)};case'GetChildren':return()=>tbl2(t.ch);case'FindFirstChild':case'WaitForChild':return(_,n)=>t.ch.find(c=>c.n==n);
  case'Clone':return()=>{const c=new SB(t.cls);c.nm=t.nm;Object.assign(c.p,t.p);return c};case'SetAttribute':return(_,a,v)=>{t.p['@'+a]=v};case'GetAttribute':return(_,a)=>t.p['@'+a];
  case'Play':case'Stop':case'Pause':case'Resume':case'Emit':case'Fire':return()=>[];case'GetPropertyChangedSignal':return(_,p)=>t.sig('pc_'+p)}
  if(/^(Changed|Touched|MouseClick|MouseHover|Triggered|Activated|Equipped|Unequipped|Died|ChildAdded|MouseButton1Click|Event|OnServerEvent)$/.test(k))return t.sig(k);return t.p[k]}
 $s(k,v){if(k=='Name'){this.nm=tostr(v);return}if(k=='Parent'){const o=this.par;if(o&&o.ch)o.ch=o.ch.filter(x=>x!==this);if(o instanceof PtW&&o.kids)o.kids=o.kids.filter(x=>x!==this);this.par=v==null?null:v;
  if(v instanceof MD||v instanceof SB)v.ch.push(this);else if(v instanceof PtW){(v.kids=v.kids||[]).push(this)}
  if(this.cls=='Sound'&&v&&this.p.Playing)this.p.Playing=true;return}const o=this.p[k];this.p[k]=v;if(o!==v){this.sig('Changed').fire(v);this.sig('pc_'+k).fire()}}}
{const I=G.get('Instance'),old=I.get('new');
 const STUB=/^(Sound|ClickDetector|ProximityPrompt|ParticleEmitter|Fire|Smoke|Sparkles|Highlight|Decal|Texture|Beam|Trail|Attachment|Weld|WeldConstraint|Motor6D|Tool|Humanoid|Animation|StringValue|IntValue|NumberValue|BoolValue|ObjectValue|Color3Value|Vector3Value|CFrameValue|SelectionBox|BillboardGui|SurfaceGui|Camera|Configuration|Accessory|Shirt|Pants|ForceField|Explosion|Seat|VehicleSeat|Script|LocalScript|ModuleScript)$/;
 I.set('new',(cls,par)=>{cls=String(cls);
  if(GN[cls]||cls=='Part'&&false)return old(cls,par);
  let w;if(/^(Part|WedgePart|CornerWedgePart|SpawnLocation|MeshPart|TrussPart)$/.test(cls)){w=old('Part');if(cls=='SpawnLocation')w.nm=cls}
  else if(cls=='Model'||cls=='Folder')w=new MD(cls);
  else if(/^(PointLight|SpotLight|SurfaceLight)$/.test(cls))w=new LiW(cls);
  else if(/^(BodyVelocity|BodyGyro|BodyPosition|BodyForce|BodyAngularVelocity|LinearVelocity|VectorForce|AlignPosition|AlignOrientation)$/.test(cls))w=new BVW(cls);
  else if(cls=='BindableEvent'||cls=='RemoteEvent'||cls=='RemoteFunction'||cls=='BindableFunction'){w=new REW({cls,n:cls})}
  else if(STUB.test(cls))w=new SB(cls);else throw new Error('Instance.new("'+cls+'") belum didukung');
  if(par!==undefined)w.$s('Parent',par);return w})}

/* ===== bagian karakter ===== */
function tintMeshes(name,fn){if(typeof plr==='undefined'||!plr)return;const arm=[plr.a&&plr.a[0],plr.a&&plr.a[1]],leg=[plr.l&&plr.l[0],plr.l&&plr.l[1]];
 const inside=(o,g)=>{for(let p=o;p;p=p.parent)if(p===g)return true;return false};
 const apply=g=>g&&g.traverse&&g.traverse(o=>{if(o.material&&o.material.color)fn(o.material)});
 if(name=='Left Arm')apply(arm[0]);else if(name=='Right Arm')apply(arm[1]);else if(name=='Left Leg')apply(leg[0]);else if(name=='Right Leg')apply(leg[1]);
 else plr.traverse(o=>{if(o.material&&o.material.color&&!arm.some(g=>inside(o,g))&&!leg.some(g=>inside(o,g)))fn(o.material)})}
class CPW{constructor(n,dx,dy,sx,sy,sz){this.nm=n;this.dx=dx;this.dy=dy;this.sz=new LV(sx,sy,sz);this.t=new Sig();this.kids=[]}get n(){return this.nm}
 $g(k){const t=this;switch(k){case'Name':return t.nm;case'ClassName':return'Part';case'Position':return new LV(P.x+t.dx,P.y+t.dy,P.z);case'CFrame':return new CF(new LV(P.x+t.dx,P.y+t.dy,P.z),Ry(P.ry+Math.PI));case'Size':return t.sz;case'Parent':return RT.ch;
  case'CanCollide':return!L.noclip;case'Transparency':return L.tr;case'Anchored':return L.anch;case'Material':return(L.tint[t.nm]||{}).mat||'Plastic';case'Color':return hexC((L.tint[t.nm]||{}).col||(me.av&&me.av.skin)||'#ffd7b5');case'BrickColor':return new BCW('Custom',(L.tint[t.nm]||{}).col||'#ffd7b5');
  case'Velocity':case'AssemblyLinearVelocity':return L.vel||new LV(0,0,0);case'Touched':return t.t;case'IsA':return(_,c)=>/^(Part|BasePart|PVInstance|Instance)$/.test(c);
  case'GetChildren':case'GetDescendants':return()=>tbl2(t.kids);case'FindFirstChild':case'FindFirstChildOfClass':return(_,n)=>t.kids.find(c=>c.n==n);case'Destroy':return()=>[];case'GetFullName':return()=>'Workspace.'+me.name+'.'+t.nm}}
 $s(k,v){const t=this;switch(k){case'CanCollide':L.noclip=!truthy(v);return;case'Transparency':L.tr=nn(v,0,1,0);if(plr)plr.traverse(o=>{if(o.material&&o.type!=='Sprite'){o.material.transparent=true;o.material.opacity=1-L.tr}});return;case'Anchored':L.anch=truthy(v);return;
  case'Velocity':case'AssemblyLinearVelocity':if(v instanceof LV)L.vel=v;return;
  case'Color':case'BrickColor':{const c=cOf(v),T=L.tint[t.nm]=L.tint[t.nm]||{};T.col=c;tintMeshes(t.nm,m=>{m.color.set(c);if(T.mat=='Neon'&&m.emissive){m.emissive.set(c);m.emissiveIntensity=1}});return}
  case'Material':{const T=L.tint[t.nm]=L.tint[t.nm]||{};T.mat=String(v);const c=T.col||(me.av&&me.av.skin)||'#ffd7b5';tintMeshes(t.nm,m=>{if(m.emissive){if(T.mat=='Neon'){m.emissive.set(c);m.emissiveIntensity=1}else{m.emissive.set('#000000');m.emissiveIntensity=0}}});return}
  case'CFrame':if(v instanceof CF)setRootCF(v);return}}}
const rootCF=()=>new CF(new LV(P.x,P.y+1.5,P.z),Ry(P.ry+Math.PI));
const setRootCF=cf=>{P.x=cf.p.x;P.y=cf.p.y-1.5;P.z=cf.p.z;P.vy=0;const lv=new LV(-cf.m[2],0,-cf.m[8]);if(Math.hypot(lv.x,lv.z)>1e-4)P.ry=Math.atan2(lv.x,lv.z)};
{const g0=RootW.prototype.$g,s0=RootW.prototype.$s;
 RootW.prototype.$g=function(k){switch(k){case'CFrame':return rootCF();case'Orientation':case'Rotation':return new LV(0,(P.ry+Math.PI)*180/Math.PI,0);case'Velocity':case'AssemblyLinearVelocity':return L.vel||new LV(0,P.vy||0,0);case'Anchored':return L.anch;case'CanCollide':return!L.noclip;case'Size':return new LV(2,2,1);case'Transparency':return L.tr;case'Material':return'Plastic';case'IsA':return(_,c)=>/^(Part|BasePart|PVInstance|Instance)$/.test(c);case'GetChildren':case'GetDescendants':return()=>tbl2([]);case'FindFirstChild':return()=>undefined;case'Touched':return this.t||(this.t=new Sig());case'GetFullName':return()=>'Workspace.'+me.name+'.HumanoidRootPart'}return g0.call(this,k)};
 RootW.prototype.$s=function(k,v){switch(k){case'CFrame':if(v instanceof CF)setRootCF(v);return;case'Velocity':case'AssemblyLinearVelocity':if(v instanceof LV)L.vel=v;return;case'Anchored':L.anch=truthy(v);return;case'CanCollide':L.noclip=!truthy(v);return;case'Orientation':case'Rotation':if(v instanceof LV)P.ry=v.y*Math.PI/180-Math.PI;return;case'Transparency':case'Material':case'Color':case'Size':case'Massless':return}return s0.call(this,k,v)}}

/* ===== Humanoid ===== */
const chState=s=>{if(typeof s==='number')s=HST[s]||'Running';s=String(s);L.st=s;
 if(s=='Flying'||s=='Physics'||s=='PlatformStanding')L.fly=true;else if(/^(Running|Freefall|GettingUp|Landed|Jumping|Climbing|Seated)$/.test(s))L.fly=false;
 if(s=='Jumping')L.jump=true;if(s=='Dead')RT.hum.$s('Health',0);try{L.sig.sc.fire(s)}catch(e){}};
{const g0=HumW.prototype.$g,s0=HumW.prototype.$s;
 HumW.prototype.$g=function(k){switch(k){case'WalkSpeed':return L.ws;case'JumpPower':return L.jp;case'JumpHeight':return L.jp/50*7.2;case'UseJumpPower':return true;case'PlatformStand':return L.ph;case'Sit':return L.sit;case'MaxHealth':return L.mh;case'DisplayName':return me.name;case'RigType':return'R6';case'HipHeight':return 0;case'AutoRotate':return true;case'Jump':return false;case'FloorMaterial':return'Plastic';
  case'MoveDirection':return moveDir();case'HealthChanged':return L.sig.hc;case'Running':return L.sig.run;case'Jumping':return L.sig.jump;case'StateChanged':return L.sig.sc;case'MoveToFinished':return L.sig.mtf;
  case'ChangeState':case'SetStateEnabled':return(_,s)=>{if(k=='ChangeState')chState(s);return[]};case'GetState':return()=>L.st;case'MoveTo':return(_,v)=>{if(v instanceof LV)L.mv={x:v.x,z:v.z};return[]};case'Move':case'EquipTool':case'UnequipTools':case'RemoveAccessories':return()=>[];
  case'LoadAnimation':return()=>mkT({Play:()=>[],Stop:()=>[],AdjustSpeed:()=>[],Looped:false,IsPlaying:false,Length:1});case'GetPlayingAnimationTracks':return()=>tbl2([]);case'IsA':return(_,c)=>/^(Humanoid|Instance)$/.test(c);case'GetFullName':return()=>'Workspace.'+me.name+'.Humanoid'}
  return g0.call(this,k)};
 HumW.prototype.$s=function(k,v){switch(k){case'WalkSpeed':L.ws=nn(v,0,500,16);return;case'JumpPower':L.jp=nn(v,0,1000,50);return;case'JumpHeight':L.jp=nn(v,0,200,7.2)/7.2*50;return;case'PlatformStand':L.ph=truthy(v);return;case'Sit':L.sit=truthy(v);return;case'MaxHealth':L.mh=nn(v,1,1e9,100);return;case'Jump':if(truthy(v))L.jump=true;return;case'UseJumpPower':case'HipHeight':case'AutoRotate':case'DisplayName':case'CameraOffset':case'DisplayDistanceType':case'NameDisplayDistance':case'HealthDisplayType':return}
  return s0.call(this,k,v)}}
function moveDir(){let ix=joy.x+(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),iy=joy.y+(keys.w||keys.arrowup?1:0)-(keys.s||keys.arrowdown?1:0);const l=Math.hypot(ix,iy);if(l>1){ix/=l;iy/=l}
 return new LV(Math.cos(yaw)*ix-Math.sin(yaw)*iy,0,-Math.sin(yaw)*ix-Math.cos(yaw)*iy)}

/* ===== service tambahan ===== */
class NW extends FW{$g(k){const v=super.$g(k);if(v!==undefined)return v;return(typeof k==='string'&&/^[A-Z]/.test(k))?(()=>[]):undefined}}
class LS{constructor(){this.p={Brightness:1,ClockTime:12,FogEnd:140,FogStart:40,FogColor:hexC('#7df9ff'),Ambient:hexC('#7f7f7f'),OutdoorAmbient:hexC('#7f7f7f'),GlobalShadows:true,TimeOfDay:'12:00:00'}}get n(){return'Lighting'}
 $g(k){if(k=='Name'||k=='ClassName')return'Lighting';if(k=='GetChildren')return()=>tbl2([]);if(k=='FindFirstChild')return()=>undefined;if(k=='GetMinutesAfterMidnight')return()=>this.p.ClockTime*60;if(k=='SetMinutesAfterMidnight')return(_,m)=>this.$s('ClockTime',m/60);return this.p[k]}
 $s(k,v){this.p[k]=v;try{this.ap(k)}catch(e){}}
 ap(k){if(typeof scene==='undefined'||!scene)return;const p=this.p;
  if(!this.sky0&&scene.background&&scene.background.clone){this.sky0=scene.background.clone()}
  const f=.5+.5*Math.cos((nn(p.ClockTime,0,24,12)-12)/12*Math.PI),dim=.2+.8*f;
  scene.children.forEach(c=>{if(c.isHemisphereLight)c.intensity=nn(p.Brightness,0,10,1)*(.3+.7*f);if(c.isDirectionalLight)c.intensity=nn(p.Brightness,0,10,1)*.5*dim});
  if(k=='FogEnd'&&scene.fog)scene.fog.far=nn(p.FogEnd,1,5000,140);if(k=='FogStart'&&scene.fog)scene.fog.near=nn(p.FogStart,0,5000,40);
  if(k=='FogColor'&&scene.fog){scene.fog.color.set(cHex(p.FogColor));scene.background&&scene.background.set&&scene.background.set(cHex(p.FogColor));this.sky0=scene.background.clone()}
  if(k=='ClockTime'&&this.sky0&&scene.background){scene.background.copy(this.sky0).multiplyScalar(dim);if(scene.fog)scene.fog.color.copy(scene.background)}}}
class CAMW{get n(){return'Camera'}$g(k){switch(k){case'Name':return'Camera';case'ClassName':return'Camera';case'FieldOfView':return cam3.fov;case'CFrame':return cfFromObj(cam3);case'CameraType':return L.camType||'Custom';case'CameraSubject':return RT.hum;case'ViewportSize':return new LV(innerWidth,innerHeight,0);
  case'WorldToViewportPoint':case'WorldToScreenPoint':return(_,v)=>{const p=new THREE.Vector3(v.x,v.y,v.z).project(cam3);return[new LV((p.x*.5+.5)*innerWidth,(-p.y*.5+.5)*innerHeight,p.z),Math.abs(p.x)<=1&&Math.abs(p.y)<=1&&p.z<1]};case'Focus':return rootCF()}}
 $s(k,v){if(k=='FieldOfView'){cam3.fov=nn(v,1,120,70);cam3.updateProjectionMatrix()}else if(k=='CameraType')L.camType=String(v)}}
function raycast(o,d){const len=Math.hypot(d.x,d.y,d.z);if(!len)return;const ux=d.x/len,uy=d.y/len,uz=d.z/len;let prev=0;
 for(let s=.25;s<=Math.min(len,600);s+=.25){const x=o.x+ux*s,y=o.y+uy*s,z=o.z+uz*s;let hitB=null;
  if(baseOn&&y<=0&&o.y>0||baseOn&&y<=0&&uy<0)hitB={g:1};else for(const b of boxes||[])if(!b.sh&&inF(b,x,z,0)&&y<=b.top&&y>=b.bot){hitB=b;break}
  if(hitB){const r=new LT();r.set('Position',new LV(x,hitB.g?0:y,z));r.set('Distance',s);r.set('Normal',new LV(0,1,0));r.set('Material','Plastic');const w=hitB.g?undefined:RT.parts.find(q=>q.bx===hitB||(q.o&&Math.abs(q.o.x-hitB.x)<.01&&Math.abs(q.o.z-hitB.z)<.01&&Math.abs(q.o.y+q.o.sy/2-hitB.top)<.01));r.set('Instance',w||RT.ws);return r}}}
const jsonOf=v=>v instanceof LT?(v.len()>0&&[...v.h.keys()].every(k=>typeof k==='number')?arr(v).map(jsonOf):Object.fromEntries([...v.h].map(([k,x])=>[String(k),jsonOf(x)]))):(v instanceof LV?{x:v.x,y:v.y,z:v.z}:v instanceof LC?{r:v.r,g:v.g,b:v.b}:(typeof v=='object'||typeof v=='function')&&v!==null?undefined:v);
const ofJson=j=>Array.isArray(j)?tbl2(j.map(ofJson)):j&&typeof j=='object'?mkT(Object.fromEntries(Object.entries(j).map(([k,v])=>[k,ofJson(v)]))):j===null?undefined:j;

function setup(){
 L.sig={hc:new Sig(),run:new Sig(),jump:new Sig(),sc:new Sig(),mtf:new Sig()};RT.models=[];RT.plk=[];
 const bp=(n,dx,dy,sx,sy,sz)=>new CPW(n,dx,dy,sx,sy,sz);
 RT.body=[bp('Head',0,2.55,1,1,1),bp('Torso',0,1.6,2,2,1),bp('Left Arm',-1.5,1.6,1,2,1),bp('Right Arm',1.5,1.6,1,2,1),bp('Left Leg',-.5,.5,1,2,1),bp('Right Leg',.5,.5,1,2,1)];
 const ch=RT.ch,fg=FW.prototype.$g;ch.kf=()=>[RT.root,RT.hum].concat(RT.body);RT.body.forEach(b=>ch.x[b.nm]=b);ch.x.PrimaryPart=RT.root;
 ch.$g=function(k){switch(k){case'ClassName':return'Model';case'GetDescendants':return()=>tbl2(this.kf());case'IsA':return(_,c)=>/^(Model|PVInstance|Instance)$/.test(c);
  case'FindFirstChildOfClass':case'FindFirstChildWhichIsA':return(_,c)=>c=='Humanoid'?RT.hum:this.kf().find(x=>clsOf(x)==c||(c=='BasePart'&&clsOf(x)=='Part'));case'GetPivot':return()=>rootCF();case'PivotTo':case'SetPrimaryPartCFrame':return(_,cf)=>{if(cf instanceof CF)setRootCF(cf);return[]};
  case'MoveTo':return(_,v)=>{if(v instanceof LV){P.x=v.x;P.y=v.y;P.z=v.z;P.vy=0}return[]};case'BreakJoints':case'Destroy':return()=>{RT.hum.$s('Health',0);return[]};case'GetFullName':return()=>'Workspace.'+me.name}return fg.call(this,k)};
 const pl=RT.pl;pl.kf=()=>[RT.pg].concat(RT.plk);const mo=new FW('Mouse',()=>[],{Button1Down:new Sig(),Button1Up:new Sig(),Button2Down:new Sig(),KeyDown:new Sig(),KeyUp:new Sig(),Move:new Sig(),X:0,Y:0,Icon:''});
 mo.$g=function(k){if(k=='Hit'){const d=new LV(-Math.sin(yaw)*Math.cos(pitch),-Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch));return new CF(new LV(cam3.position.x+d.x*14,cam3.position.y+d.y*14,cam3.position.z+d.z*14))}return FW.prototype.$g.call(this,k)};RT.mouse=mo;
 Object.assign(pl.x,{GetMouse:()=>mo,LoadCharacter:()=>{act.respawn();return[]},Kick:(_,m)=>{toast(String(m||'Dikeluarkan'));return[]},Neutral:true,CharacterRemoving:new Sig(),Chatted:new Sig(),MembershipType:'None',RespawnTime:3});
 /* services */
 const svc=RT.svc,uis=new FW('UserInputService',()=>[],{InputBegan:new Sig(),InputEnded:new Sig(),InputChanged:new Sig(),JumpRequest:new Sig(),
  IsKeyDown:(_,k)=>!!L.keys[k],GetMouseLocation:()=>new LV(innerWidth/2,innerHeight/2,0),TouchEnabled:'ontouchstart' in window,KeyboardEnabled:!('ontouchstart' in window),MouseEnabled:!('ontouchstart' in window),GamepadEnabled:false,MouseBehavior:'Default',MouseIconEnabled:true,GetFocusedTextBox:()=>undefined,
  GetKeysPressed:()=>tbl2(Object.keys(L.keys).filter(k=>L.keys[k]))});RT.uis=uis;svc.UserInputService=uis;
 svc.ContextActionService=new FW('ContextActionService',()=>[],{BindAction:(_,n,f,b,...ks)=>{L.cas[n]={f,ks};return[]},UnbindAction:(_,n)=>{delete L.cas[n];return[]},BindActionAtPriority:(_,n,f,b,p,...ks)=>{L.cas[n]={f,ks};return[]}});
 svc.Debris=new FW('Debris',()=>[],{AddItem:(_,it,t)=>{setTimeout(()=>{try{call(it.$g('Destroy'),[it])}catch(e){}},(+t||10)*1000);return[]}});
 svc.HttpService=new FW('HttpService',()=>[],{JSONEncode:(_,v)=>JSON.stringify(jsonOf(v)),JSONDecode:(_,s)=>{try{return ofJson(JSON.parse(s))}catch(e){throw new Error('JSON tidak valid')}},GenerateGUID:(_,w)=>{const u=(crypto.randomUUID?crypto.randomUUID():String(Math.random())).toUpperCase();return w===false?u.replace(/-/g,''):'{'+u+'}'},UrlEncode:(_,s)=>encodeURIComponent(s),
  GetAsync:()=>{throw new Error('HTTP request diblokir di Sandbox')},PostAsync:()=>{throw new Error('HTTP request diblokir di Sandbox')},RequestAsync:()=>{throw new Error('HTTP request diblokir di Sandbox')},HttpEnabled:false});
 const tagSet=t=>L.tags[t]||(L.tags[t]=new Set());
 svc.CollectionService=new FW('CollectionService',()=>[],{AddTag:(_,i,t)=>{tagSet(String(t)).add(i);return[]},RemoveTag:(_,i,t)=>{tagSet(String(t)).delete(i);return[]},HasTag:(_,i,t)=>tagSet(String(t)).has(i),GetTagged:(_,t)=>tbl2([...tagSet(String(t))]),GetTags:(_,i)=>tbl2(Object.keys(L.tags).filter(t=>L.tags[t].has(i)))});
 ['MarketplaceService','SoundService','StarterPlayer','Chat','TextChatService','PhysicsService','ContentProvider','GuiService','TeleportService','BadgeService','LocalizationService','Stats','NetworkClient','VRService','Selection','MaterialService','TestService','StarterPack','Players_'].forEach(n=>{if(!svc[n])svc[n]=new NW(n,()=>[],{})});
 svc.MarketplaceService.x.UserOwnsGamePassAsync=()=>false;svc.MarketplaceService.x.PromptPurchase=()=>[];
 const rs0=svc.RunService;rs0.x.IsStudio=()=>false;rs0.x.IsRunning=()=>true;rs0.x.BindToRenderStep=(_,n,p,f)=>{rs0.x['_b'+n]=f;RT.hb.h.push(f);return[]};rs0.x.UnbindFromRenderStep=(_,n)=>{const f=rs0.x['_b'+n];if(f)RT.hb.h=RT.hb.h.filter(x=>x!==f);return[]};
 svc.Lighting=new LS();
 const ws=RT.ws,k0=ws.kf;ws.kf=()=>k0().filter(c=>!(c instanceof PtW&&c.par2)).concat(RT.models);
 const wg=FW.prototype.$g,wsx=FW.prototype.$s,cam=new CAMW();
 ws.$g=function(k){switch(k){case'Gravity':return L.grav;case'CurrentCamera':case'Camera':return cam;case'ClassName':return'Workspace';case'Raycast':return(_,o,d)=>raycast(o,d);case'GetServerTimeNow':return()=>Date.now()/1000;case'GetDescendants':return()=>tbl2(k0().concat(RT.models.flatMap(m=>m.desc())));case'IsA':return(_,c)=>/^(Workspace|Instance|Model)$/.test(c);case'FindPartsInRegion3':case'GetPartBoundsInBox':case'GetPartBoundsInRadius':return()=>tbl2([]);case'Terrain':return undefined}return wg.call(this,k)};
 ws.$s=function(k,v){if(k=='Gravity'){L.grav=nn(v,0,1000,196.2);return}return wsx.call(this,k,v)};
 /* leaderstats */
 const hud=document.createElement('div');hud.id='sp-ls';hud.style.cssText='position:absolute;top:56px;right:8px;z-index:6;background:rgba(0,0,0,.55);color:#fff;border-radius:10px;padding:6px 10px;font:600 13px system-ui;display:none;pointer-events:none;max-width:44vw';const gm=document.getElementById('game');if(gm)gm.appendChild(hud);RT.lsHud=hud;
 RT.lsT=setInterval(()=>{if(!RT||!RT.alive){clearInterval(RT&&RT.lsT);return}const f=(RT.plk||[]).find(x=>x.n=='leaderstats');if(!f){hud.style.display='none';return}
  const rows=f.ch.filter(c=>c.p&&c.p.Value!==undefined).map(c=>'<div style="display:flex;justify-content:space-between;gap:14px"><span>'+esc(c.nm)+'</span><b>'+esc(tostr(c.p.Value))+'</b></div>');hud.innerHTML=rows.join('');hud.style.display=rows.length?'block':'none'},500);
 /* respawn -> CharacterAdded */
 L.respawnFlag=0}
const _rt=rtStart;rtStart=function(g){rs();_rt.apply(this,arguments);if(RT)try{setup()}catch(e){OUT('err','Luau Pro: '+(e.message||e))}};
const _rp=rtStop;rtStop=function(){try{if(RT&&RT.lsT)clearInterval(RT.lsT);if(RT&&RT.lsHud)RT.lsHud.remove()}catch(e){}try{const dn=document.getElementById('sp-dn');if(dn)dn.style.display='none'}catch(e){}rs();return _rp.apply(this,arguments)};

/* ===== input ke Luau ===== */
const KN=e=>{const k=e.key;if(k.length==1){const u=k.toUpperCase();if(/[A-Z]/.test(u))return u;if(/[0-9]/.test(u))return['Zero','One','Two','Three','Four','Five','Six','Seven','Eight','Nine'][+u];return u==' '?'Space':null}return({Shift:'LeftShift',Control:'LeftControl',Alt:'LeftAlt',Enter:'Return',Escape:'Escape',Tab:'Tab',Backspace:'Backspace',ArrowUp:'Up',ArrowDown:'Down',ArrowLeft:'Left',ArrowRight:'Right'})[k]||(/^F\d+$/.test(k)?k:null)};
const inp=(kc,ty,st)=>{const t=new LT();t.set('KeyCode',kc||'Unknown');t.set('UserInputType',ty);t.set('UserInputState',st);return t};
const kfire=(down,e)=>{if(!RT||!RT.alive||!RT.uis)return;if(document.activeElement&&document.activeElement.tagName=='INPUT')return;const k=KN(e);if(!k)return;
 if(down){if(e.repeat)return;L.keys[k]=1}else L.keys[k]=0;
 const i=inp(k,'Keyboard',down?'Begin':'End');RT.uis.x[down?'InputBegan':'InputEnded'].fire(i,false);if(RT.mouse)RT.mouse.x[down?'KeyDown':'KeyUp'].fire(String(e.key).toLowerCase());
 if(down&&k=='Space')RT.uis.x.JumpRequest.fire();
 if(down)Object.keys(L.cas).forEach(n=>{const c=L.cas[n];if(c.ks.some(x=>x===k||x===k.toLowerCase())){call(c.f,[n,'Begin',i]).catch(rerr)}})};
window.addEventListener('keydown',e=>kfire(true,e),true);window.addEventListener('keyup',e=>kfire(false,e),true);
window.addEventListener('blur',()=>{L.keys={}});
{const cvs=document.getElementById('c')||document.querySelector('#game canvas');const cv0=typeof cv!=='undefined'?cv:cvs;
 if(cv0){cv0.addEventListener('pointerdown',e=>{if(!RT||!RT.alive||!RT.uis)return;const t=e.pointerType=='mouse'?'MouseButton1':'Touch';RT.uis.x.InputBegan.fire(inp('Unknown',t,'Begin'),false);if(RT.mouse)RT.mouse.x.Button1Down.fire()});
  cv0.addEventListener('pointerup',e=>{if(!RT||!RT.alive||!RT.uis)return;RT.uis.x.InputEnded.fire(inp('Unknown',e.pointerType=='mouse'?'MouseButton1':'Touch','End'),false);if(RT.mouse)RT.mouse.x.Button1Up.fire()})}}

/* ===== tombol turun (HP) ===== */
let dn=null;const mkDn=()=>{if(dn)return dn;const g=document.getElementById('game');if(!g)return null;dn=document.createElement('button');dn.id='sp-dn';dn.textContent='▼';dn.style.cssText='position:absolute;right:22px;bottom:200px;width:54px;height:54px;border-radius:50%;border:3px solid #000;background:#ffde59;font:700 22px system-ui;z-index:7;display:none;touch-action:none';
 dn.addEventListener('pointerdown',e=>{e.preventDefault();L.dn=true});['pointerup','pointercancel','pointerleave'].forEach(v=>dn.addEventListener(v,()=>L.dn=false));g.appendChild(dn);return dn};

/* ===== fisika: WalkSpeed, JumpPower, Gravity, fly, noclip, velocity, BodyVelocity ===== */
const _loop=loop;
loop=function(t){
 if(!run||!RT||!RT.alive||typeof P==='undefined'||!P)return _loop(t);
 const dt=Math.min(.05,(t-last)/1000)||.016;
 /* sinkronkan kotak tabrak part yang dipindah script */
 try{RT.parts.forEach(w=>{if(w.dirty){w.dirty=0;if(w.bx&&w.cc!==false&&w.o.cc!==false)syncBox(w)}});(RT.models||[]).forEach(m=>m.parts().forEach(w=>{if(w.dirty){w.dirty=0;if(w.bx)syncBox(w)}}))}catch(e){}
 const bv=(L.bvs||[]).filter(b=>truthy(b.p.Enabled));
 const on=L.noclip||L.fly||L.ph||L.ws!==16||L.jp!==50||L.grav!==196.2||L.vel||bv.length||L.anch||L.mv||L.jump;
 const d=mkDn();if(d)d.style.display=(L.fly||L.ph||bv.length)&&!paused?'block':'none';
 if(!on||paused)return _loop(t);
 const x0=P.x,y0=P.y,z0=P.z,g0=P.ground;let sb,sl;
 if(L.noclip){sb=boxes;sl=lavas;boxes=[];lavas=[]}
 try{_loop(t)}finally{if(sb){boxes=sb;lavas=sl}}
 const dx=P.x-x0,dz=P.z-z0,hitf=(x,z,y)=>L.noclip?false:hit(x,z,y);
 if(L.ws!==16&&(dx||dz)){const f=L.ws/16,nx=Math.max(-48,Math.min(48,x0+dx*f)),nz=Math.max(-48,Math.min(48,z0+dz*f));if(!hitf(nx,P.z,P.y))P.x=nx;if(!hitf(P.x,nz,P.y))P.z=nz}
 if(L.mv){const tx=L.mv.x-P.x,tz=L.mv.z-P.z,dd=Math.hypot(tx,tz);if(dd<.6){L.mv=null;L.sig.mtf.fire(true)}else{const sp=Math.max(1,L.ws/2)*dt;P.x+=tx/dd*sp;P.z+=tz/dd*sp;P.ry=Math.atan2(tx,tz)}}
 if(g0&&P.vy>4&&(L.jp!==50||L.jump)){P.vy=12*(L.jp/50)-30*dt;L.sig.jump.fire(true)}
 if(L.jump){if(g0&&P.vy<=4){P.vy=12*(L.jp/50);P.ground=false;L.sig.jump.fire(true)}L.jump=false}
 if(L.grav!==196.2&&!P.ground)P.vy+=(30-30*L.grav/196.2)*dt;
 if(L.fly||L.ph){const up=(jumpHeld||keys[' '])?1:0,dw=(keys.shift||keys.control||keys.q||L.dn)?1:0,fs=Math.max(4,L.ws/16*10);P.y=y0+(up-dw)*fs*dt;P.vy=0;P.ground=false}
 if(bv.length){const b=bv[bv.length-1],v=b.cls=='LinearVelocity'?b.p.VectorVelocity:b.cls=='BodyPosition'?null:b.p.Velocity;
  if(b.cls=='BodyPosition'){const p=b.p.Position,k=Math.min(1,dt*4);P.x+=(p.x-P.x)*k;P.y+=(p.y-1.5-P.y)*k;P.z+=(p.z-P.z)*k}
  else if(v instanceof LV&&(b.cls=='BodyVelocity'||b.cls=='LinearVelocity')){P.x+=v.x*dt;P.y+=v.y*dt;P.z+=v.z*dt;P.vy=0;P.ground=false}}
 if(L.vel instanceof LV){P.x+=L.vel.x*dt;P.y+=L.vel.y*dt;P.z+=L.vel.z*dt;if(L.vel.y)P.vy=0;const k=Math.max(0,1-4*dt);L.vel=new LV(L.vel.x*k,L.vel.y*k,L.vel.z*k);if(Math.hypot(L.vel.x,L.vel.y,L.vel.z)<.05)L.vel=null}
 if(L.anch){P.x=x0;P.y=y0;P.z=z0;P.vy=0}
 if(P.y<-60&&(L.noclip||L.fly))P.y=-60;
 try{plr.position.set(P.x,P.y,P.z)}catch(e){}};

/* ===== toolbox: template siap pakai ===== */
const lsrc=(k,cls)=>ST.d.svc[k]?k:'ReplicatedFirst';
const addT=(n,d,f)=>{if(!TB.some(x=>x.n===n))TB.push({n,ic:'',d,f})};
addT('Neon Part','Balok neon yang berganti warna pelan-pelan',()=>{ST.d.objs.push(pa(0,1,10,4,1,4,'#00ffff','NeonPart'));return sg('ServerScriptService','Script','local part = workspace:FindFirstChild("NeonPart")\npart.Material = Enum.Material.Neon\nwhile true do\n\tpart.Color = Color3.fromHSV((tick() % 5) / 5, 1, 1)\n\twait(0.05)\nend\n','NeonScript')});
addT('Ubah Warna & Material','Balok: ganti warna dengan BrickColor + Material',()=>{ST.d.objs.push(pa(8,1,10,4,1,4,'#ffffff','ColorPart'));return sg('ServerScriptService','Script','local part = workspace:FindFirstChild("ColorPart")\nlocal mats = {Enum.Material.Neon, Enum.Material.Glass, Enum.Material.Metal, Enum.Material.Wood}\nlocal i = 1\nwhile true do\n\tpart.BrickColor = BrickColor.Random()\n\tpart.Material = mats[i]\n\ti = i % #mats + 1\n\twait(1)\nend\n','ColorScript')});
addT('Fly (tekan F)','LocalScript: tekan F untuk terbang. Spasi/lompat = naik, Shift/▼ = turun',()=>{const k=lsrc('StarterPlayerScripts');return sg(k,'LocalScript','local UIS = game:GetService("UserInputService")\nlocal player = game:GetService("Players").LocalPlayer\nlocal hum = player.Character:FindFirstChild("Humanoid")\nlocal flying = false\n\nUIS.InputBegan:Connect(function(input, gp)\n\tif input.KeyCode == Enum.KeyCode.F then\n\t\tflying = not flying\n\t\thum.PlatformStand = flying\n\t\tprint("Fly:", flying)\n\tend\nend)\n','FlyScript')});
addT('Fly BodyVelocity','LocalScript: terbang ke arah kamera (Heartbeat + BodyVelocity), tombol E',()=>{const k=lsrc('StarterPlayerScripts');return sg(k,'LocalScript','local Players = game:GetService("Players")\nlocal UIS = game:GetService("UserInputService")\nlocal RunService = game:GetService("RunService")\nlocal char = Players.LocalPlayer.Character\nlocal root = char:FindFirstChild("HumanoidRootPart")\nlocal hum = char:FindFirstChild("Humanoid")\nlocal cam = workspace.CurrentCamera\nlocal speed = 50\nlocal bv = nil\n\nUIS.InputBegan:Connect(function(input)\n\tif input.KeyCode ~= Enum.KeyCode.E then return end\n\tif bv then\n\t\tbv:Destroy()\n\t\tbv = nil\n\telse\n\t\tbv = Instance.new("BodyVelocity")\n\t\tbv.MaxForce = Vector3.new(1e5, 1e5, 1e5)\n\t\tbv.Parent = root\n\tend\nend)\n\nRunService.Heartbeat:Connect(function()\n\tif bv then\n\t\tif hum.MoveDirection.Magnitude > 0 then\n\t\t\tbv.Velocity = cam.CFrame.LookVector * speed\n\t\telse\n\t\t\tbv.Velocity = Vector3.new(0, 0, 0)\n\t\tend\n\tend\nend)\n','FlyBodyVelocity')});
addT('Noclip (tekan N)','LocalScript: tekan N untuk tembus dinding & lantai',()=>{const k=lsrc('StarterPlayerScripts');return sg(k,'LocalScript','local UIS = game:GetService("UserInputService")\nlocal RunService = game:GetService("RunService")\nlocal char = game:GetService("Players").LocalPlayer.Character\nlocal noclip = false\n\nUIS.InputBegan:Connect(function(input)\n\tif input.KeyCode == Enum.KeyCode.N then\n\t\tnoclip = not noclip\n\t\tprint("Noclip:", noclip)\n\tend\nend)\n\nRunService.Stepped:Connect(function()\n\tfor _, part in pairs(char:GetDescendants()) do\n\t\tif part:IsA("BasePart") then\n\t\t\tpart.CanCollide = not noclip\n\t\tend\n\tend\nend)\n','NoclipScript')});
addT('Speed & Lompat Tinggi','Script: WalkSpeed 32, JumpPower 100',()=>sg('ReplicatedFirst','LocalScript','local hum = game:GetService("Players").LocalPlayer.Character:FindFirstChild("Humanoid")\nhum.WalkSpeed = 32\nhum.JumpPower = 100\nprint("Speed & lompat tinggi aktif")\n','SpeedScript'));
addT('Lampu Neon (PointLight)','Balok neon + PointLight yang menyala',()=>{ST.d.objs.push(pa(-8,1,10,2,2,2,'#ff00ff','GlowPart'));return sg('ServerScriptService','Script','local part = workspace:FindFirstChild("GlowPart")\npart.Material = Enum.Material.Neon\nlocal light = Instance.new("PointLight")\nlight.Brightness = 2\nlight.Range = 16\nlight.Color = part.Color\nlight.Parent = part\n','GlowScript')});

/* ===== referensi Luau: tambahan ===== */
new MutationObserver(()=>{const r=document.getElementById('sref');if(r&&!document.getElementById('sref2'))r.insertAdjacentHTML('beforeend','<div id="sref2" style="margin-top:8px"><b>Tambahan Luau Pro</b><br>Part: <code>.Material = Enum.Material.Neon</code> <code>.BrickColor = BrickColor.new("Bright red")</code> <code>.Anchored</code> <code>.CanCollide</code> <code>.CFrame</code> <code>.Orientation</code> <code>:Clone()</code> <code>:Destroy()</code><br>Humanoid: <code>.WalkSpeed</code> <code>.JumpPower</code> <code>.PlatformStand</code> (terbang) <code>.Health</code> <code>.MoveDirection</code> <code>:ChangeState(...)</code> <code>:MoveTo(pos)</code><br>Noclip: <code>part.CanCollide = false</code> pada bagian karakter · Fly: <code>PlatformStand</code>, <code>BodyVelocity</code>, atau <code>root.Velocity</code><br>Input: <code>UserInputService.InputBegan:Connect(function(input, gp) ... end)</code> <code>input.KeyCode == Enum.KeyCode.F</code> <code>UIS:IsKeyDown(...)</code> <code>ContextActionService:BindAction</code><br>Lainnya: <code>CFrame.new/Angles/lookAt</code> <code>BrickColor</code> <code>Instance.new("Model"/"PointLight"/"BodyVelocity"/"IntValue"...)</code> <code>Debris:AddItem</code> <code>workspace.Gravity</code> <code>workspace:Raycast</code> <code>workspace.CurrentCamera</code> <code>Lighting.ClockTime</code> <code>HttpService:JSONEncode</code> <code>CollectionService</code> <code>tick()</code> <code>Random.new()</code> <code>leaderstats</code></div>')}).observe(document.body,{childList:true,subtree:true});
})();
;

/* ===== 53-v13.js ===== */
/* ===== v13: gift centang biru + akses panel lewat username (huruf besar/kecil bebas) ===== */
window.addEventListener('load',()=>setTimeout(()=>{
 const canon=id=>{const i=document.getElementById(id);if(!i)return null;const raw=String(i.value||'').trim().replace(/^@/,'').toLowerCase();if(!raw)return null;
  const k=Object.keys(users).find(x=>x.toLowerCase()===raw);if(k&&i.value!==k)i.value=k;return k||null};
 ['gbux','gver','grole','bandirect','unbandirect'].forEach(n=>{const o=act[n];if(typeof o!=='function')return;
  const id=(n==='bandirect'||n==='unbandirect')?'bu_u':'pt_u';
  act[n]=function(){const k=canon(id),u=k&&users[k],before=u?!!u.verified:null;const r=o.apply(this,arguments);
   try{if(n==='gver'&&u&&!u.rm&&u!==me&&before!==null&&!!u.verified!==before&&window.spSendCmd)window.spSendCmd(k,'ver',{v:!!u.verified})}catch(e){}
   return r}});
},0));
;

/* ===== 54-v13.js ===== */
/* ===== v13: kode redeem global (semua pemain bisa pakai) =====
   Owner menandatangani kode (ECDSA) lalu dikirim ke broker MQTT; pemain memverifikasi dengan public key Owner.
   Kode disimpan sebagai hash (tidak bisa dibaca dari broker). Pemakaian dicatat per akun. */
(function(){
const BR=['wss://broker.emqx.io:8084/mqtt','wss://broker.hivemq.com:8884/mqtt','wss://test.mosquitto.org:8081'],CD='sandbox/v9/code/',CU='sandbox/v9/cuse/',OWN='sandbox/v9/own/';
const EC={name:'ECDSA',namedCurve:'P-256'},SG={name:'ECDSA',hash:'SHA-256'},te=s=>new TextEncoder().encode(s);
const b64=u=>{let s='';u.forEach(c=>s+=String.fromCharCode(c));return btoa(s)},unb=t=>Uint8Array.from(atob(t),c=>c.charCodeAt(0));
const sha=async t=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',te(t)))].map(x=>x.toString(16).padStart(2,'0')).join('');
const norm=v=>String(v||'').toUpperCase().replace(/[^A-Z0-9-]/g,'').slice(0,24);
const mq=()=>window.__spMq,ready=async()=>!!(mq()&&(window.mqtt||await mq().lib()));
const codes=()=>{const c=ls.get('sp_codes',{});return c&&typeof c=='object'&&!Array.isArray(c)?c:{}};
const msgOf=r=>['code',r.h,r.amt,r.max,r.exp,r.c,r.ts,r.del?1:0].join('|');
function collect(topics,ms,cb){return new Promise(async res=>{if(!(await ready()))return res(0);let pend=BR.length;
 BR.forEach(url=>{let m,done=0;const end=()=>{if(done)return;done=1;try{m.end(true)}catch(e){}if(--pend===0)res(1)};
  try{m=mqtt.connect(url,{clientId:'spk_'+Math.random().toString(16).slice(2,12),connectTimeout:6000,reconnectPeriod:0,clean:true})}catch(e){done=1;if(--pend===0)res(1);return}
  m.on('error',end);m.on('close',end);m.on('connect',()=>{m.subscribe(topics,{qos:0});setTimeout(end,ms)});
  m.on('message',(t,b)=>{try{const s=b.toString();if(s)cb(t,JSON.parse(s))}catch(e){}});setTimeout(end,ms+4000)});setTimeout(()=>res(1),ms+6000)})}
async function pin(){let p=ls.get('sp_ownpk',null);if(p)return p;let best=null;await collect([OWN+'pk'],2500,(t,d)=>{if(d&&d.pub&&(!best||d.ts>best.ts))best=d});if(best){ls.set('sp_ownpk',best.pub);return best.pub}return null}
const verify=async(pub,r)=>{try{return await crypto.subtle.verify(SG,await crypto.subtle.importKey('jwk',pub,EC,false,['verify']),unb(r.sig),te(msgOf(r)))}catch(e){return false}};
/* owner: kirim kode */
async function publish(k,d,del){try{const ok=ls.get('sp_okey',null);if(!ok||!ok.priv||!(await ready()))return false;const h=await sha('sp-code|'+k);
 const r={h,amt:d.amt|0,max:d.max|0,exp:d.exp|0,c:d.t|0,ts:Date.now(),del:del?1:0};
 r.sig=b64(new Uint8Array(await crypto.subtle.sign(SG,await crypto.subtle.importKey('jwk',ok.priv,EC,false,['sign']),te(msgOf(r)))));
 const msgs=[{t:CD+h,p:JSON.stringify(r)}];
 if(!del)for(const n of (d.used||[]))msgs.push({t:CU+h+'/'+(await sha('u|'+String(n).toLowerCase())).slice(0,24),p:JSON.stringify({n,ts:Math.max(r.c,Date.now())})});
 return !!(await mq().pushAll(msgs))}catch(e){return false}}
async function pubNew(before){const c=codes();let any=0;for(const k of Object.keys(c)){if(before&&before.has(k))continue;if(c[k].g)continue;
  const ok=await publish(k,c[k],0);if(ok){const c2=codes();if(c2[k]){c2[k].g=1;ls.set('sp_codes',c2)}any=1;try{toast('Kode '+k+' aktif untuk semua pemain ✓')}catch(e){}}
  else try{toast('Kode tersimpan, tapi gagal dikirim ke server. Dicoba lagi otomatis.')}catch(e){}}return any}
/* owner: ambil catatan pemakaian dari semua perangkat */
async function pullUses(){const c=codes(),ks=Object.keys(c);if(!ks.length)return;const H={};for(const k of ks)H[await sha('sp-code|'+k)]=k;let ch=0;
 await collect([CU+'+/+'],3000,(t,d)=>{const h=t.slice(CU.length).split('/')[0],k=H[h];if(!k||!d||!d.n)return;const c2=codes();const x=c2[k];if(!x||(d.ts||0)<(x.t||0))return;x.used=x.used||[];
  if(!x.used.some(n=>String(n).toLowerCase()===String(d.n).toLowerCase())){x.used.push(String(d.n).slice(0,20));ls.set('sp_codes',c2);ch=1}});
 if(ch)try{if(typeof page!=='undefined'&&page==='panel'&&typeof pt!=='undefined'&&pt==='code')render()}catch(e){}}
let busy=0;
async function redeem(){const e=$('#rd_e');if(!e)return;const bad=m=>{e.textContent=m},now=Date.now();
 me.rdf=(me.rdf||[]).filter(t=>now-t<60000);if(me.rdf.length>=5)return bad('Terlalu banyak percobaan. Coba lagi sebentar.');
 const k=norm($('#rd_k').value);if(!k)return bad('Masukkan kodenya dulu');if(busy)return;busy=1;bad('Memeriksa kode...');
 try{const h=await sha('sp-code|'+k);let best=null;const uses={};
  const on=await collect([CD+h,CU+h+'/+'],2500,(t,d)=>{if(t===CD+h){if(d&&d.sig&&(!best||d.ts>best.ts))best=d}else if(d&&d.n)uses[t]=d});
  if(!on)return bad('Tidak ada koneksi internet. Coba lagi.');
  if(!best||best.del||best.h!==h){me.rdf.push(now);save();return bad('Kode tidak valid')}
  const pk=await pin();if(!pk)return bad('Belum bisa memverifikasi kode. Coba lagi sebentar.');
  if(!(await verify(pk,best))){me.rdf.push(now);save();return bad('Kode tidak valid')}
  if(best.exp&&best.exp<now)return bad('Kode sudah kedaluwarsa');
  const nm=me.name.toLowerCase(),L=Object.values(uses).filter(u=>(u.ts||0)>=(best.c||0));me.rdc=me.rdc||[];
  if(me.rdc.includes(h)||L.some(u=>String(u.n).toLowerCase()===nm))return bad('Kamu sudah memakai kode ini');
  if(best.max&&L.length>=best.max)return bad('Kode sudah habis dipakai');
  const amt=Math.max(1,Math.min(1000000,best.amt|0)),un=(await sha('u|'+nm)).slice(0,24);
  me.rdc.push(h);save();
  const ok=await mq().pushAll([{t:CU+h+'/'+un,p:JSON.stringify({n:me.name,ts:Date.now()})}]);
  if(!ok){me.rdc=me.rdc.filter(x=>x!==h);save();return bad('Gagal mencatat pemakaian. Coba lagi.')}
  addBux(amt);notify('Redeem kode '+k+': +'+amt+' SandBux');shClose();toast('+'+amt+' SandBux berhasil ditambahkan');render()
 }catch(x){bad('Terjadi kesalahan. Coba lagi.')}finally{busy=0}}
window.addEventListener('load',()=>setTimeout(()=>{
 act.rdgo=function(){return redeem()};
 const cg=act.cdgo,cdl=act.cddel;
 if(cg)act.cdgo=function(){const b=new Set(Object.keys(codes())),r=cg.apply(this,arguments);setTimeout(()=>pubNew(b),60);return r};
 if(cdl)act.cddel=function(v){const d=codes()[v],r=cdl.apply(this,arguments);if(d&&!codes()[v])publish(v,d,1).then(ok=>{try{toast(ok?'Kode dihapus untuk semua pemain':'Dihapus di sini, gagal dikirim ke server')}catch(e){}});return r};
 const own=()=>typeof me!=='undefined'&&me&&me.role==='owner'&&!document.hidden;
 setTimeout(()=>{if(own()){pubNew(null);pullUses()}},7000);
 setInterval(()=>{if(own()){pubNew(null);pullUses()}},45000);
},0));
})();
;

/* ===== 55-v13.js ===== */
/* ===== v13: centang biru & akses panel cepat terlihat ===== */
(function(){
const BR=['wss://broker.emqx.io:8084/mqtt','wss://broker.hivemq.com:8884/mqtt','wss://test.mosquitto.org:8081'];
async function ensurePin(){try{if(ls.get('sp_ownpk',null))return true;const mq=window.__spMq;if(!mq||!(window.mqtt||await mq.lib()))return false;let best=null;
 await Promise.all(BR.map(url=>new Promise(res=>{let m,d=0;const end=()=>{if(d)return;d=1;try{m.end(true)}catch(e){}res()};
  try{m=mqtt.connect(url,{clientId:'spv_'+Math.random().toString(16).slice(2,12),connectTimeout:6000,reconnectPeriod:0,clean:true})}catch(e){return res()}
  m.on('error',end);m.on('close',end);m.on('connect',()=>{m.subscribe('sandbox/v9/own/pk',{qos:0});setTimeout(end,2500)});
  m.on('message',(t,b)=>{try{const x=JSON.parse(b.toString());if(x&&x.pub&&(!best||x.ts>best.ts))best=x}catch(e){}});setTimeout(end,7000)})));
 if(best){ls.set('sp_ownpk',best.pub);return true}return false}catch(e){return false}}
const run=async()=>{try{if(typeof me==='undefined'||!me||document.hidden)return;await ensurePin();
 if(me.role!=='owner'){if(!staff()&&window.spPullGrant)await window.spPullGrant()}
 if(window.spVfSync)await window.spVfSync()}catch(e){}};
window.addEventListener('load',()=>setTimeout(()=>{
 const _e=enter;enter=function(){const r=_e.apply(this,arguments);setTimeout(run,3500);setTimeout(run,10000);return r};
 setInterval(run,20000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)run()});
},0));
})();
;

/* ===== 56-v14.js ===== */
/* ===== v14: Daftar Admin — semua pemain bisa lihat siapa saja staf =====
   Owner menandatangani daftar staf (kunci owner) lalu mengirimnya ke broker; tiap perangkat memverifikasi dengan public key owner
   yang sudah disematkan (sp_ownpk) sebelum menampilkannya. Daftar lokal (akun yang punya role di perangkat ini) ikut digabung. */
(function(){
const OWN='sandbox/v9/own/',ST=OWN+'staff',BR=['wss://broker.emqx.io:8084/mqtt','wss://broker.hivemq.com:8884/mqtt','wss://test.mosquitto.org:8081'];
const EC={name:'ECDSA',namedCurve:'P-256'},SG={name:'ECDSA',hash:'SHA-256'};
const te=s=>new TextEncoder().encode(s),mq=()=>window.__spMq;
const b64=u=>{let s='';u.forEach(c=>s+=String.fromCharCode(c));return btoa(s)},unb=t=>Uint8Array.from(atob(t),c=>c.charCodeAt(0));
const ready=async()=>!!(mq()&&(window.mqtt||await mq().lib()));
const OK={owner:3,coowner:2,admin:1},LBL={owner:'OWNER',coowner:'CO-ADMIN',admin:'ADMIN'};
const clean=n=>String(n||'').replace(/[\u0000-\u001f<>"&]/g,'').slice(0,20);
const msg=(l,t)=>'staff|'+t+'|'+JSON.stringify(l);
let busy=0,loadedAt=0;
function sub(url,topic,ms,cb){return new Promise(res=>{let m,done=0;const end=()=>{if(done)return;done=1;try{m.end(true)}catch(e){}res()};
 try{m=mqtt.connect(url,{clientId:'sps_'+Math.random().toString(16).slice(2,12),connectTimeout:6000,reconnectPeriod:0,clean:true})}catch(e){return res()}
 m.on('error',end);m.on('close',end);m.on('connect',()=>{m.subscribe(topic,{qos:0});setTimeout(end,ms)});
 m.on('message',(t,b)=>{try{const s=b.toString();if(s)cb(JSON.parse(s))}catch(e){}});setTimeout(end,ms+4000)})}
/* daftar dari akun lokal */
function localList(){const o=[];try{Object.keys(users).forEach(k=>{const u=users[k];if(u&&OK[u.role])o.push([k,u.role])})}catch(e){}return o}
/* OWNER: kirim daftar staf bertanda tangan */
async function publish(force){try{if(!me||me.role!=='owner'||!(await ready()))return;
 const l=localList().sort((a,b)=>OK[b[1]]-OK[a[1]]||a[0].localeCompare(b[0])),sg=JSON.stringify(l),S=ls.get('sp_stsig',{});
 if(!force&&S.s===sg&&Date.now()-S.t<216e5)return;
 const k=ls.get('sp_okey',null);if(!k||!k.priv)return;const ts=Date.now();
 const key=await crypto.subtle.importKey('jwk',k.priv,EC,false,['sign']),sig=b64(new Uint8Array(await crypto.subtle.sign(SG,key,te(msg(l,ts)))));
 if(await mq().pushAll([{t:ST,p:JSON.stringify({list:l,ts,sig})}]))ls.set('sp_stsig',{s:sg,t:Date.now()})}catch(e){}}
/* SEMUA: ambil daftar, verifikasi, simpan cache */
async function load(){if(busy)return;busy=1;try{if(!(await ready()))return;const pin=ls.get('sp_ownpk',null);if(!pin)return;let best=null;
 await Promise.all(BR.map(u=>sub(u,ST,2500,d=>{if(d&&d.sig&&Array.isArray(d.list)&&(!best||d.ts>best.ts))best=d})));
 if(!best)return;const c=ls.get('sp_staffc',{});if((c.ts||0)>=best.ts){loadedAt=Date.now();return}
 const key=await crypto.subtle.importKey('jwk',pin,EC,false,['verify']);
 if(!(await crypto.subtle.verify(SG,key,unb(best.sig),te(msg(best.list,best.ts)))))return;
 const l=best.list.filter(x=>Array.isArray(x)&&OK[x[1]]).slice(0,60).map(x=>[clean(x[0]),x[1]]);
 ls.set('sp_staffc',{list:l,ts:best.ts});loadedAt=Date.now()}catch(e){}finally{busy=0}}
/* gabungan: cache terverifikasi + lokal; role lokal menang (lebih baru di perangkat ini) */
function merged(){const m=new Map(),c=ls.get('sp_staffc',{});(c.list||[]).forEach(x=>m.set(x[0].toLowerCase(),x));
 localList().forEach(x=>m.set(x[0].toLowerCase(),x));
 try{if(me&&OK[me.role])m.set(me.name.toLowerCase(),[me.name,me.role]);else if(me)m.delete(me.name.toLowerCase())}catch(e){}
 return [...m.values()].sort((a,b)=>OK[b[1]]-OK[a[1]]||a[0].localeCompare(b[0]))}
function sheet(){const l=merged();
 const row=x=>{const n=x[0],a=(()=>{try{const k=Object.keys(users).find(y=>y.toLowerCase()===n.toLowerCase());return k&&users[k].av||(typeof avFor==='function'?avFor(n):null)}catch(e){return null}})();
  return `<div class="ur"><button class="ura" data-a="prof" data-v="${esc(n)}">${a?circ(a,48):''}<span><b>${esc(n)}</b><small style="display:block;opacity:.7">${LBL[x[1]]||''}</small></span></button></div>`};
 shOpen('<div class="shn" style="margin-top:6px">Daftar Admin</div>'+(l.length?l.map(row).join(''):'<div style="text-align:center;opacity:.7;padding:14px 6px">Belum ada admin yang terdata.</div>')+'<button class="sb ln" data-a="shx">Tutup</button>');
 if(Date.now()-loadedAt>15000)load().then(()=>{const sh=document.getElementById('sh');if(sh&&sh.classList.contains('on')&&document.querySelector('#shp .shn')&&/Daftar Admin/.test(document.querySelector('#shp .shn').textContent)){const b=JSON.stringify(l),n=JSON.stringify(merged());if(b!==n)sheet()}})}
act.admins=function(){sheet()};
/* tombol di menu samping + kartu kecil di Beranda tidak memberatkan render (hanya satu tombol) */
if(typeof drawerFill==='function'){const _d=drawerFill;drawerFill=function(){_d.apply(this,arguments);try{const d=$('#dpn');if(d&&!d.querySelector('[data-a="admins"]')){const sw=d.querySelector('[data-a="redeem"]')||d.querySelector('.mi');const h='<button class="mi" data-a="admins">'+(typeof ico==='function'&&typeof IC!=='undefined'&&IC.shield?ico('shield',27):'')+'<span>Daftar Admin</span></button>';if(sw)sw.insertAdjacentHTML('afterend',h);else d.insertAdjacentHTML('beforeend',h)}}catch(e){}}}
window.spStaffList=merged;window.spStaffLoad=()=>load();
window.addEventListener('load',()=>{
 const _g=act.grole;if(typeof _g==='function')act.grole=function(){const r=_g.apply(this,arguments);setTimeout(()=>publish(true),2500);return r};
 const _en=enter;enter=function(){const r=_en.apply(this,arguments);setTimeout(()=>{publish();load()},4000);return r};
 setInterval(()=>{if(typeof me!=='undefined'&&me&&!document.hidden){publish();if(Date.now()-loadedAt>120000)load()}},60000);
 if(typeof me!=='undefined'&&me)setTimeout(()=>{publish();load()},6000)});
})();
;

/* ===== 57-panel-upgrade.js ===== */
/* ===== v15: Panel — daftar pemain custom (scroll, cari, avatar) + sub-tab Review: Aksesoris / Map / Works ===== */
(function(){
const ID=i=>document.getElementById(i);
const RN2={owner:'OWNER',coowner:'CO-ADMIN',admin:'ADMIN'};
const isStaff=()=>{try{return typeof me!=='undefined'&&!!me&&staff()}catch(e){return false}};
const E=s=>{try{return esc(s)}catch(e){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}};

/* ---------- 1. DAFTAR PEMAIN (menggantikan datalist) ---------- */
let sel={pt_u:'',bu_u:''},scr={pt_u:0,bu_u:0},lastSync=0;
function players(withSelf){
 const out=[];
 for(const k in users){const u=users[k];if(!u)continue;if(u===me&&!withSelf)continue;out.push({k,u,me:u===me})}
 out.sort((a,b)=>(b.me-a.me)||((lvl(b.u))-(lvl(a.u)))||(a.k.toLowerCase()<b.k.toLowerCase()?-1:1));
 return out;
}
function lvl(u){return u.role=='owner'?3:u.role=='coowner'?2:u.role=='admin'?1:0}
function avOfP(k,u){try{return(window.spUI&&spUI.avFor&&spUI.avFor(k))||u.av||null}catch(e){return u.av||null}}
function row(p,on){
 const u=p.u,k=p.k,ver=u.verified||(window.spVerified&&(()=>{try{return spVerified(k)}catch(e){return 0}})());
 const av=(typeof circ==='function')?circ(avOfP(k,u),38):'<span class="pkr-ph">'+E(k.charAt(0).toUpperCase())+'</span>';
 return '<button type="button" class="pkr-row'+(on?' on':'')+'" data-k="'+E(k)+'">'+av
  +'<span class="pkr-n"><b>'+E(k)+(ver?'<i class="pkr-v">✔</i>':'')+(p.me?'<em>(kamu)</em>':'')+'</b>'
  +'<small>'+(RN2[u.role]||'Pemain')+(u.rm?' · online lain':'')+'</small></span>'
  +'<span class="pkr-b">'+(+u.bux||0)+'</span><span class="pkr-ck">✓</span></button>';
}
function build(box,input,withSelf){
 const id=input.id,q=String(input.value||'').trim().replace(/^@/,'').toLowerCase();
 const all=players(withSelf),list=all.filter(p=>!q||p.k.toLowerCase().includes(q));
 const cur=String(input.value||'').trim().toLowerCase();
 const lst=box.querySelector('.pkr-list');
 scr[id]=lst?lst.scrollTop:scr[id];
 box.querySelector('.pkr-list').innerHTML=list.length?list.map(p=>row(p,p.k.toLowerCase()===cur)).join(''):'<div class="pkr-empty">'+(all.length?'Tidak ada pemain yang cocok':'Belum ada pemain')+'</div>';
 box.querySelector('.pkr-cnt').textContent=list.length+(q?' dari '+all.length:'')+' pemain';
 box.querySelector('.pkr-list').scrollTop=scr[id]||0;
}
function enhance(id,withSelf){
 const input=ID(id);if(!input||input.tagName!=='INPUT'||input.dataset.pkr)return;
 input.dataset.pkr='1';input.removeAttribute('list');input.setAttribute('autocomplete','off');
 const dl=ID(id=='pt_u'?'pt_dl':'bu_dl');if(dl)dl.remove();
 if(!input.value&&sel[id]&&users[sel[id]])input.value=sel[id];
 const box=document.createElement('div');box.className='pkr';
 box.innerHTML='<div class="pkr-top"><span class="pkr-cnt"></span>'+(withSelf?'<button type="button" class="pkr-me">Pilih diriku</button>':'')+'</div><div class="pkr-list" role="listbox"></div>';
 input.insertAdjacentElement('afterend',box);
 build(box,input,withSelf);
 input.addEventListener('input',()=>{sel[id]='';build(box,input,withSelf)});
 box.addEventListener('click',e=>{
  const b=e.target.closest('.pkr-row'),m=e.target.closest('.pkr-me');
  if(b){const k=b.dataset.k;sel[id]=k;input.value=k;build(box,input,withSelf);return}
  if(m&&me){sel[id]=me.name;input.value=me.name;build(box,input,withSelf)}
 });
 box.querySelector('.pkr-list').addEventListener('scroll',e=>{scr[id]=e.target.scrollTop},{passive:true});
 /* ambil akun dari perangkat lain, lalu segarkan daftar */
 if(Date.now()-lastSync>30000){lastSync=Date.now();try{window.spDirSync&&spDirSync()}catch(e){}
  setTimeout(()=>{if(document.body.contains(box))build(box,input,withSelf)},3500)}
}
function enhanceAll(){
 if(typeof page==='undefined'||page!=='panel'||!isStaff())return;
 enhance('pt_u',true);enhance('bu_u',false);
}

/* ---------- 2. REVIEW: tombol Aksesoris / Map / Works ---------- */
function installReview(){
 if(typeof RV==='undefined'||!RV||typeof RV.tab!=='function'||RV.__pk)return;RV.__pk=1;
 const _tab=RV.tab,_list=RV.list;
 const isMap=e=>e&&e.k==='map';
 RV.tab=function(t){
  if(t!=='rv')return _tab.apply(this,arguments);
  const all=_list.call(RV),nm=all.filter(isMap).length,na=all.length-nm;
  let f=window.__rvf;if(f!=='acc'&&f!=='map'&&f!=='wk')f=(na>0||nm==0)?'acc':'map';
  const chip=(v,l,n)=>'<button type="button" class="ptb'+(f==v?' on':'')+'" data-a="rvf" data-v="'+v+'">'+l+(n?'<i>'+n+'</i>':'')+'</button>';
  const bar='<div class="rvsub">'+chip('acc','Aksesoris',na)+chip('map','Map',nm)+chip('wk','Works',0)+'</div>';
  if(f==='wk')return bar+RV.worksH();
  RV.list=function(){return _list.apply(this,arguments).filter(e=>f==='map'?isMap(e):!isMap(e))};
  let h;try{h=_tab.call(RV,'rv')}finally{RV.list=_list}
  if(f==='map'&&/empty2/.test(h)&&nm==0)h=h.replace(/<b>[^<]*<\/b><p[^>]*>[^<]*<\/p>/,'<b>Tidak ada map yang menunggu</b><p style="margin:0">Map baru dari pemain muncul di sini sebelum tayang.</p>');
  if(f==='acc'&&/empty2/.test(h)&&na==0)h=h.replace(/<b>[^<]*<\/b><p[^>]*>[^<]*<\/p>/,'<b>Tidak ada aksesoris yang menunggu</b><p style="margin:0">Aksesori, tubuh, avatar, model, dan suara baru muncul di sini sebelum tayang.</p>');
  return bar+h;
 };
 Object.assign(act,{rvf(v){if(!isStaff())return;window.__rvf=(v==='map'||v==='wk')?v:'acc';try{render()}catch(e){}}});
}

/* ---------- 3. gaya ---------- */
const css=document.createElement('style');
css.textContent=`
.pkr{margin:8px 0 12px;border:1px solid rgba(127,127,127,.35);border-radius:14px;overflow:hidden;background:rgba(127,127,127,.07)}
.pkr-top{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 12px;font-size:12px;font-weight:700;opacity:.85;border-bottom:1px solid rgba(127,127,127,.25)}
.pkr-me{border:0;border-radius:99px;background:#335fff;color:#fff;font:700 12px Inter,sans-serif;padding:6px 12px;cursor:pointer}
.pkr-list{max-height:248px;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;scrollbar-width:thin}
.pkr-row{display:flex;align-items:center;gap:10px;width:100%;box-sizing:border-box;padding:9px 12px;border:0;border-bottom:1px solid rgba(127,127,127,.18);background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer;min-height:56px}
.pkr-row:last-child{border-bottom:0}
.pkr-row:active{background:rgba(127,127,127,.18)}
.pkr-row.on{background:#335fff;color:#fff}
.pkr-row .circ{flex:0 0 auto}
.pkr-ph{flex:0 0 38px;width:38px;height:38px;border-radius:50%;background:rgba(127,127,127,.35);display:flex;align-items:center;justify-content:center;font-weight:800}
.pkr-n{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.pkr-n b{font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pkr-n em{font-style:normal;font-weight:600;font-size:12px;opacity:.7;margin-left:6px}
.pkr-n small{font-size:11px;font-weight:700;opacity:.65;letter-spacing:.3px}
.pkr-v{font-style:normal;display:inline-flex;align-items:center;justify-content:center;width:15px;height:15px;border-radius:50%;background:#1d9bf0;color:#fff;font-size:10px;margin-left:5px;vertical-align:middle}
.pkr-b{flex:0 0 auto;font-size:12px;font-weight:800;padding:3px 9px;border-radius:99px;background:rgba(127,127,127,.22)}
.pkr-row.on .pkr-b{background:rgba(255,255,255,.28)}
.pkr-ck{flex:0 0 auto;width:20px;text-align:center;font-weight:900;opacity:0}
.pkr-row.on .pkr-ck{opacity:1}
.pkr-empty{padding:22px 14px;text-align:center;opacity:.65;font-size:14px}
.rvsub{display:flex;gap:6px;margin:0 0 12px;flex-wrap:wrap}
`;
document.head.appendChild(css);

/* ---------- pasang ---------- */
if(typeof render==='function'){const _r=render;render=function(){const r=_r.apply(this,arguments);try{enhanceAll()}catch(e){}return r}}
const iv=setInterval(()=>{if(typeof RV!=='undefined'&&RV){installReview();clearInterval(iv)}},200);
installReview();
})();
;

/* ===== 58-role-global.js ===== */
/* ===== v18: ROLE ADMIN TERLIHAT SEMUA ORANG + POPUP GIFT UNTUK PENERIMA =====
   1. Gift role (admin / co-admin) dari owner sudah ditandatangani & disebar lewat MQTT (OWN/g/<nama>).
      Sekarang SEMUA perangkat ikut membaca catatan itu, memverifikasi tanda tangan owner,
      lalu menampilkan badge role di samping nama (profil, chat, daftar pemain, nametag 3D, developer game).
   2. Pemain yang digift role / centang biru langsung dapat popup perayaan. */
(function(){
const OWN='sandbox/v9/own/',BR=['wss://broker.emqx.io:8084/mqtt','wss://broker.hivemq.com:8884/mqtt','wss://test.mosquitto.org:8081'];
const hs=t=>{let h=2166136261;for(let i=0;i<t.length;i++)h=Math.imul(h^t.charCodeAt(i),16777619);return(h>>>0).toString(36)};
const lw=n=>hs(String(n).toLowerCase()),te=s=>new TextEncoder().encode(s),mq=()=>window.__spMq;
const EC={name:'ECDSA',namedCurve:'P-256'},SG={name:'ECDSA',hash:'SHA-256'};
const unb=t=>Uint8Array.from(atob(t),c=>c.charCodeAt(0));
const msgOf=(n,r,t,k)=>String(n).toLowerCase()+'|'+r+'|'+t+'|'+(k?hs(JSON.stringify(k)):'');
const E=s=>{try{return esc(s)}catch(e){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}};
const LBL={owner:'OWNER',coowner:'CO-ADMIN',admin:'ADMIN'},COL={owner:'#f5a400',coowner:'#8a4dff',admin:'#e5383b'};

/* ---------- 1. registry role global ---------- */
const RLK='sp_rl',rc=()=>{const c=ls.get(RLK,{});return c&&typeof c==='object'&&!Array.isArray(c)?c:{}};
window.spRoleOf=n=>{try{const l=String(n||'').toLowerCase();if(!l)return'';if(l==='owner')return'owner';
 const c=rc()[l];if(c)return LBL[c.role]&&c.role!=='owner'?c.role:'';
 const k=Object.keys(users).find(x=>x.toLowerCase()===l),u=k&&users[k];
 return u&&u.role&&LBL[u.role]?u.role:''}catch(e){return''}};
window.spRoleBadge=n=>{const r=window.spRoleOf(n);return r?'<span class="rbd rbd-'+r+'">'+LBL[r]+'</span>':''};
window.spRoleDraw=(x,r,w,h)=>{x.fillStyle=COL[r];const t=LBL[r],pw=Math.min(w-40,34+t.length*17),px=(w-pw)/2;
 x.beginPath();x.moveTo(px+13,2);x.lineTo(px+pw-13,2);x.quadraticCurveTo(px+pw-2,2,px+pw-2,13);x.lineTo(px+pw-2,h-10);x.quadraticCurveTo(px+pw-2,h-2,px+pw-13,h-2);x.lineTo(px+13,h-2);x.quadraticCurveTo(px+2,h-2,px+2,h-10);x.lineTo(px+2,13);x.quadraticCurveTo(px+2,2,px+13,2);x.closePath();x.fill();
 x.strokeStyle='#000';x.lineWidth=4;x.stroke();x.fillStyle='#fff';x.font='bold 19px Arial';x.textAlign='center';x.textBaseline='middle';x.fillText(t,w/2,h/2+1)};

function sub(url,topics,ms,cb){return new Promise(res=>{let m,done=0;const end=()=>{if(done)return;done=1;try{m.end(true)}catch(e){}res()};
 try{m=mqtt.connect(url,{clientId:'spr_'+Math.random().toString(16).slice(2,12),connectTimeout:6000,reconnectPeriod:0,clean:true})}catch(e){return res()}
 m.on('error',end);m.on('close',end);m.on('connect',()=>{m.subscribe(topics,{qos:0});setTimeout(end,ms)});
 m.on('message',(t,b)=>{try{const s=b.toString();if(s)cb(t,JSON.parse(s))}catch(e){}});setTimeout(end,ms+4000)})}
let busy=0;
async function rlSync(){if(busy||typeof me==='undefined'||!me)return;busy=1;
 try{if(!(mq()&&(window.mqtt||await mq().lib())))return;const G={};let PK=null;
  await Promise.all(BR.map(u=>sub(u,[OWN+'g/+',OWN+'pk'],3000,(t,d)=>{if(!d)return;if(t===OWN+'pk'){if(d.pub&&(!PK||d.ts>PK.ts))PK=d;return}
   if(d.n&&d.sig&&typeof d.ts==='number'){const l=String(d.n).toLowerCase();if(t===OWN+'g/'+lw(l)&&(!G[l]||d.ts>G[l].ts))G[l]=d}})));
  let pin=ls.get('sp_ownpk',null);if(!pin&&PK){pin=PK.pub;ls.set('sp_ownpk',pin)}if(!pin)return;
  const key=await crypto.subtle.importKey('jwk',pin,EC,false,['verify']),c=rc();let ch=0;
  for(const l in G){const g=G[l];if(!['admin','coowner','none'].includes(g.role))continue;if(c[l]&&c[l].ts>=g.ts)continue;
   let ok=false;try{ok=await crypto.subtle.verify(SG,key,unb(g.sig),te(msgOf(g.n,g.role,g.ts,g.pk)))}catch(e){}
   if(!ok)continue;c[l]={role:g.role,ts:g.ts};ch=1}
  if(ch){ls.set(RLK,c);try{window.spVfChanged&&spVfChanged()}catch(e){}try{refreshUI()}catch(e){}}
 }catch(e){}finally{busy=0}}
window.spRoleSync=rlSync;

/* ---------- 2. popup gift untuk penerima ---------- */
function popup(ico,title,txt,col){const old=document.getElementById('gfx');if(old)old.remove();
 const d=document.createElement('div');d.id='gfx';
 d.innerHTML='<div class="gfx-c" style="--gc:'+col+'"><div class="gfx-i">'+ico+'</div><h2>'+E(title)+'</h2><p>'+E(txt)+'</p><button type="button" class="btn g">Mantap!</button></div>';
 d.addEventListener('click',e=>{if(e.target===d||e.target.tagName==='BUTTON')d.remove()});document.body.appendChild(d);setTimeout(()=>{try{d.remove()}catch(e){}},12000)}
window.spGiftPopup=popup;
const SK='sp_gseen';
function watch(){try{if(typeof me==='undefined'||!me||!me.name)return;const S=ls.get(SK,{})||{},k=me.name.toLowerCase(),cur={r:me.role&&me.role!=='owner'?me.role:'',v:!!me.verified&&me.role!=='owner'};
 if(!S[k]){S[k]=cur;ls.set(SK,S);return}
 const o=S[k];if(o.r===cur.r&&o.v===cur.v)return;S[k]=cur;ls.set(SK,S);
 if(cur.r&&cur.r!==o.r)popup('🛡️','Kamu jadi '+LBL[cur.r]+'!','Kamu mendapat akses '+LBL[cur.r]+'. Buka menu → Panel. Badge '+LBL[cur.r]+' kini terlihat oleh semua pemain.',COL[cur.r]);
 else if(!cur.r&&o.r)popup('ℹ️','Akses panel dicabut','Role '+LBL[o.r]+'-mu sudah dicabut.','#888');
 if(cur.v&&!o.v)popup('✔','Centang Biru!','Kamu mendapat Centang Biru. Semua pemain bisa melihatnya di samping namamu.','#1d9bf0');
 else if(!cur.v&&o.v)popup('ℹ️','Centang biru dicabut','Centang biru di akunmu sudah dicabut.','#888')}catch(e){}}

/* ---------- 3. gaya ---------- */
const css=document.createElement('style');css.textContent=`
.rbd{display:inline-block;vertical-align:middle;margin-left:6px;padding:2px 7px;border-radius:99px;color:#fff;font:800 10px/1.3 Inter,Arial,sans-serif;letter-spacing:.4px;border:1px solid rgba(0,0,0,.25);position:relative;top:-1px}
.rbd-owner{background:#f5a400}.rbd-coowner{background:#8a4dff}.rbd-admin{background:#e5383b}
.ur2h .rbd,.card.row .rbd,.pkr-n .rbd{display:none}
#gfx{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.62);display:flex;align-items:center;justify-content:center;padding:20px;animation:gfxf .25s}
.gfx-c{max-width:340px;width:100%;text-align:center;background:linear-gradient(180deg,#2d1114,#1a0b0d);border:2px solid var(--gc,#1d9bf0);border-radius:20px;padding:26px 22px;color:#fff;box-shadow:0 0 0 5px color-mix(in srgb,var(--gc) 25%,transparent),0 20px 60px rgba(0,0,0,.6);animation:gfxp .35s cubic-bezier(.2,1.4,.4,1)}
.gfx-i{width:72px;height:72px;margin:0 auto 10px;border-radius:50%;background:var(--gc);display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:900}
.gfx-c h2{margin:6px 0 8px;font-size:24px}.gfx-c p{margin:0 0 18px;font-size:14px;opacity:.85;line-height:1.45}
@keyframes gfxf{from{opacity:0}to{opacity:1}}@keyframes gfxp{from{transform:scale(.6);opacity:0}to{transform:scale(1);opacity:1}}`;
document.head.appendChild(css);

/* ---------- pasang ---------- */
window.addEventListener('load',()=>{
 try{const _en=enter;enter=function(){const r=_en.apply(this,arguments);setTimeout(rlSync,2000);return r}}catch(e){}
 try{const _sg=startGame;startGame=function(){const r=_sg.apply(this,arguments);setTimeout(rlSync,1800);return r}}catch(e){}
 setInterval(()=>{if(typeof me!=='undefined'&&me&&!document.hidden)rlSync()},40000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)rlSync()});
 setInterval(watch,1500);setTimeout(rlSync,6000)});
})();
;

/* ===== 59-efek-aksesoris-map.js ===== */
/* ===== v19: efek aksesoris (Fire/Smoke/Sparkles/ParticleEmitter/Explosion/PointLight) selalu muncul saat main di map =====
   Penyebab sebelumnya:
   1. rtStart() langsung berhenti untuk map yang belum punya "svc" (map tanpa script/service) -> runtime efek tidak pernah hidup,
      jadi aksesoris ber-efek tidak mengeluarkan efek sama sekali di map itu.
   2. Aksesoris hasil beli yang tidak sempat menyalin efeknya (ch kosong) tidak punya efek untuk dijalankan.
   Perbaikan: map tanpa svc dijalankan dengan svc kosong (data map asli tidak diubah), dan efek aksesoris yang dipakai
   disalin ulang dari katalog bila hilang, sebelum game dimulai. Efek tetap ikut dikirim ke pemain lain lewat presence. */
(function(){
const M={r:'Rate',l:'Lifetime',s:'Speed',z:'Size',a:'SpreadAngle',g:'Acceleration'};
function toNode(d){const n=newI(d.c);for(const k in M)if(d[k]!==undefined&&n[M[k]]!==undefined)n[M[k]]=+d[k];
 if(/^#[0-9a-f]{6}$/i.test(d.k||''))n.Color=d.k;if(d.c==='Explosion')n.BlastRadius=+d.b||6;
 if(d.c==='PointLight'){n.Brightness=+d.b||1;n.Range=+d.n||16}
 if(d.e===0&&n.Enabled!==undefined)n.Enabled=false;if(Array.isArray(d.q)&&d.q.length===4)n.pq=d.q.map(v=>+v||0);return n}
const hasFx=l=>(l||[]).some(n=>n&&(n.fx||(n.ch&&hasFx(n.ch))));
function heal(){try{if(typeof me==='undefined'||!me)return;
 const ids=((typeof forceAcc!=='undefined'&&forceAcc)||(me.av&&me.av.acc)||[]).slice();if(me.av&&me.av.body&&!ids.includes(me.av.body))ids.push(me.av.body);
 let cat=null,ch=0;
 ids.forEach(id=>{const it=(me.items||[]).find(x=>x.id==id);if(!it||!it.src||(it.ch&&it.ch.length)||(it.objs||[]).some(o=>o&&hasFx(o.ch)))return;
  if(!cat)cat=mkItems();const m=cat.find(x=>x.key===it.src);
  if(m&&Array.isArray(m.fx)&&m.fx.length){it.ch=m.fx.slice(0,6).map(toNode);ch=1}});
 if(ch)save()}catch(e){}}
const _rs=rtStart;
rtStart=function(g){heal();
 if(g&&!g.svc)g=Object.assign({},g,{svc:{}});
 return _rs.call(this,g)};
})();
;

/* ===== 60-terrain-pohon.js ===== */
/* ===== v20: TERRAIN VIA SCRIPT (semua material) + MATERIAL PART + KUAS EDITOR + ANIMASI POHON =====
   1. workspace.Terrain di Luau:
        Terrain:FillBlock(CFrame, Vector3, Enum.Material.X)
        Terrain:FillBall(Vector3, radius, Enum.Material.X)
        Terrain:FillCylinder(CFrame, height, radius, Enum.Material.X)
        Terrain:ReplaceMaterial(region, resolusi, dari, ke)   -- region diabaikan: ganti SEMUA terrain bermaterial "dari"
        Terrain:SetMaterialColor(Enum.Material.X, Color3) / :GetMaterialColor(Enum.Material.X)
        Terrain:Clear()
      Enum.Material.Air = hapus terrain (yang pusatnya berada di dalam kotak/bola/silinder).
      Material: Grass LeafyGrass Sand Sandstone Water Rock Slate Basalt Mud Ground Snow Ice Glacier Salt Limestone
                Pavement Asphalt Cobblestone Concrete Brick WoodPlanks CrackedLava Air
      Selain Water, semua terrain bisa diinjak (collision). Water tembus & bergelombang.
   2. Part.Material = Enum.Material.Water/Grass/Sand/... sekarang mengubah tampilan Part (tekstur/warna) juga.
   3. Terrain Editor (Studio) -> tab "Tipe Brush": semua material tersedia, bukan hanya 6.
   4. Toolbox: "Terrain Script (semua material)" dan "Pohon Bergoyang (animasi)". */
(function(){
const MAT={
 Grass:{c:'#5aa14a',tx:'grass'},LeafyGrass:{c:'#43a047',tx:'grass'},Sand:{c:'#e6cf8e',tx:'sand'},Sandstone:{c:'#d9a45f'},
 Water:{c:'#2f7fe0',tx:'water',a:.6,w:1},Rock:{c:'#8a8a8a',tx:'stone'},Slate:{c:'#5d6670',tx:'stone'},Basalt:{c:'#3a3a40'},
 Mud:{c:'#5b4330'},Ground:{c:'#7a5636'},Snow:{c:'#f4f8ff'},Ice:{c:'#aee3ff',a:.8},Glacier:{c:'#cfeeff',a:.9},Salt:{c:'#f0e9e0'},
 Limestone:{c:'#d8d0b8'},Pavement:{c:'#9a9a98'},Asphalt:{c:'#2c2c30'},Cobblestone:{c:'#8b8480',tx:'stone'},Concrete:{c:'#a9a9a9'},
 Brick:{c:'#a4523b',tx:'brick'},WoodPlanks:{c:'#9b7240',tx:'wood'},CrackedLava:{c:'#ff5a14',em:1}};
const ORDER=Object.keys(MAT);
const mdef=m=>MAT[String(m)]||{c:'#8a8a8a'};
const hex=c=>'#'+[c.r,c.g,c.b].map(v=>Math.round(Math.max(0,Math.min(1,+v||0))*255).toString(16).padStart(2,'0')).join('');
const nn=(v,d)=>{v=+v;return isFinite(v)?v:d};

/* ---------- enum: tambah material terrain yang belum ada ---------- */
function addEnum(){try{const M=G.get('Enum').get('Material');if(!M)return;['Water','Air','Sandstone','Glacier','CrackedLava'].concat(ORDER).forEach(n=>{if(M.get(n)===undefined)M.set(n,n)})}catch(e){}}
addEnum();

/* ---------- 1. workspace.Terrain ---------- */
class TerW{
 constructor(){this.pcs=[];this.col={};this.p={WaterColor:hexC('#2f7fe0'),WaterTransparency:.4,WaterWaveSize:.15,WaterWaveSpeed:10,WaterReflectance:1};this.t0=performance.now()}
 colOf(m){return this.col[m]||mdef(m).c}
 look(m,sx,sz){const d=mdef(m),mt=new THREE.MeshLambertMaterial({color:m==='Water'?hex(this.p.WaterColor):this.colOf(m)});
  if(d.tx&&typeof txGet==='function'){try{const t=txGet(d.tx).clone(),q=Math.max(1,Math.round((sx+sz)/8));t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(q,q);t.needsUpdate=true;mt.map=t}catch(e){}}
  if(d.em){mt.emissive=new THREE.Color(d.c);mt.emissiveIntensity=.8}
  if(m==='Water'){mt.transparent=true;mt.opacity=Math.max(.1,1-this.p.WaterTransparency);mt.depthWrite=false}
  else if(d.a){mt.transparent=true;mt.opacity=d.a}
  return mt}
 add(m,mesh,bx){const p={m,mesh,bx};this.pcs.push(p);scene.add(mesh);if(!d0(m).w&&typeof boxes!=='undefined'&&boxes)bx.forEach(b=>boxes.push(b));return p}
 rm(p){try{scene.remove(p.mesh);p.mesh.geometry.dispose();if(p.mesh.material.map)p.mesh.material.map.dispose();p.mesh.material.dispose()}catch(e){}
  if(typeof boxes!=='undefined'&&boxes)p.bx.forEach(b=>{const i=boxes.indexOf(b);if(i>=0)boxes.splice(i,1)});const i=this.pcs.indexOf(p);if(i>=0)this.pcs.splice(i,1)}
 erase(ok){this.pcs.slice().forEach(p=>{if(ok(p.mesh.position))this.rm(p)})}
 block(cf,sz,m){if(!(cf&&cf.p&&cf.m)||!(sz instanceof LV))return;const c=cf.p,sx=Math.abs(sz.x),sy=Math.abs(sz.y),sw=Math.abs(sz.z);if(!(sx&&sy&&sw))return;
  if(m==='Air'){const ys=Math.atan2(cf.m[2],cf.m[0]),co=Math.cos(ys),si=Math.sin(ys);this.erase(q=>{const dx=q.x-c.x,dz=q.z-c.z,lx=dx*co-dz*si,lz=dx*si+dz*co;return Math.abs(lx)<=sx/2&&Math.abs(q.y-c.y)<=sy/2&&Math.abs(lz)<=sw/2});return}
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),this.look(m,sx,sw)),ry=Math.atan2(cf.m[2],cf.m[0]);
  mesh.scale.set(sx,sy,sw);mesh.position.set(c.x,c.y,c.z);mesh.rotation.y=ry;
  const co=Math.abs(Math.cos(ry)),si=Math.abs(Math.sin(ry));
  this.add(m,mesh,[{x:c.x,z:c.z,hw:(co*sx+si*sw)/2,hd:(si*sx+co*sw)/2,top:c.y+sy/2,bot:c.y-sy/2}])}
 ball(c,r,m){if(!(c instanceof LV)||!(r>0))return;
  if(m==='Air'){this.erase(q=>Math.hypot(q.x-c.x,q.y-c.y,q.z-c.z)<=r);return}
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),this.look(m,r*2,r*2));mesh.scale.setScalar(r);mesh.position.set(c.x,c.y,c.z);
  const n=Math.max(3,Math.min(9,Math.round(r))),bx=[];
  for(let i=0;i<n;i++){const y0=-r+2*r*i/n,y1=-r+2*r*(i+1)/n,yc=(y0+y1)/2,h=Math.sqrt(Math.max(0,r*r-yc*yc))*.72;if(h>.2)bx.push({x:c.x,z:c.z,hw:h,hd:h,top:c.y+y1,bot:c.y+y0})}
  this.add(m,mesh,bx)}
 cyl(cf,h,r,m){if(!(cf&&cf.p&&cf.m)||!(h>0)||!(r>0))return;const c=cf.p;
  if(m==='Air'){this.erase(q=>Math.hypot(q.x-c.x,q.z-c.z)<=r&&Math.abs(q.y-c.y)<=h/2);return}
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(1,1,1,28),this.look(m,r*2,r*2));mesh.scale.set(r,h,r);mesh.position.set(c.x,c.y,c.z);mesh.rotation.y=Math.atan2(cf.m[2],cf.m[0]);
  this.add(m,mesh,[{x:c.x,z:c.z,hw:r*.85,hd:r*.85,top:c.y+h/2,bot:c.y-h/2}])}
 swap(a,b){if(b==='Air'){this.pcs.slice().forEach(p=>{if(p.m===a)this.rm(p)});return}
  this.pcs.slice().forEach(p=>{if(p.m!==a)return;const o=p.mesh,s=o.scale,old=o.material;o.material=this.look(b,s.x*(o.geometry.type==='BoxGeometry'?1:2),s.z*(o.geometry.type==='BoxGeometry'?1:2));try{old.map&&old.map.dispose();old.dispose()}catch(e){}
   const w0=!!mdef(a).w,w1=!!mdef(b).w;p.m=b;
   if(w0&&!w1&&typeof boxes!=='undefined'&&boxes)p.bx.forEach(x=>boxes.push(x));
   else if(!w0&&w1&&typeof boxes!=='undefined'&&boxes)p.bx.forEach(x=>{const i=boxes.indexOf(x);if(i>=0)boxes.splice(i,1)})})}
 recolor(m){this.pcs.forEach(p=>{if(p.m===m&&p.mesh.material.color)p.mesh.material.color.set(m==='Water'?hex(this.p.WaterColor):this.colOf(m))})}
 tick(){const t=(performance.now()-this.t0)/1000;this.pcs.forEach(p=>{if(p.m==='Water'&&p.mesh.material.map){const o=p.mesh.material.map.offset;o.x=(t*.02*(this.p.WaterWaveSpeed/10))%1;o.y=(Math.sin(t*.8)*.02)}})}
 $g(k){const T=this,M=v=>String(v==null?'Grass':v);
  switch(k){
   case'ClassName':return'Terrain';case'Name':return'Terrain';case'IsA':return(_,c)=>/^(Terrain|BasePart|Instance)$/.test(c);
   case'FillBlock':return(_,cf,sz,m)=>{T.block(cf,sz,M(m))};
   case'FillBall':return(_,c,r,m)=>{T.ball(c,nn(r,0),M(m))};
   case'FillCylinder':return(_,cf,h,r,m)=>{T.cyl(cf,nn(h,0),nn(r,0),M(m))};
   case'FillWedge':return(_,cf,sz,m)=>{T.block(cf,sz,M(m))};
   case'Clear':return()=>{T.pcs.slice().forEach(p=>T.rm(p))};
   case'ReplaceMaterial':return(_,a,b,c,d)=>{const arg=[a,b,c,d].filter(v=>typeof v==='string');if(arg.length>=2)T.swap(arg[arg.length-2],arg[arg.length-1])};
   case'SetMaterialColor':return(_,m,c)=>{if(c instanceof LC){T.col[M(m)]=hex(c);T.recolor(M(m))}};
   case'GetMaterialColor':return(_,m)=>hexC(T.colOf(M(m)));
   case'GetPieceCount':return()=>T.pcs.length;
   default:return T.p[k]}}
 $s(k,v){this.p[k]=v;if(k==='WaterColor'&&v instanceof LC)this.recolor('Water');
  if(k==='WaterTransparency'){const o=Math.max(.1,1-nn(v,.4));this.pcs.forEach(p=>{if(p.m==='Water')p.mesh.material.opacity=o})}}}
function d0(m){return mdef(m)}

/* pasang Terrain ke workspace setiap game dimulai */
const _rs=rtStart;
rtStart=function(g){const r=_rs.apply(this,arguments);
 try{if(RT&&RT.ws){const T=new TerW(),rt=RT,o=RT.ws.$g;RT.terr=T;
  RT.ws.$g=function(k){if(k==='Terrain')return T;if(k==='FindFirstChild'||k==='WaitForChild'||k==='FindFirstChildOfClass'||k==='FindFirstChildWhichIsA'){const f=o.apply(this,arguments);return(s,n,...q)=>(n==='Terrain'?T:(f&&f(s,n,...q)))}return o.apply(this,arguments)};
  (function lp(){if(RT!==rt||!rt.alive)return;try{T.tick()}catch(e){}requestAnimationFrame(lp)})()}}catch(e){}
 return r};

/* ---------- 2. Part.Material = Water / Grass / Sand ... mengubah tampilan Part ---------- */
function lookPart(w){const m=w.m&&w.m.material;if(!m)return;const k=String(w.mat||'Plastic'),d=MAT[k];
 if(w._om===undefined)w._om=m.map||null;
 if(d){
  if(d.tx&&typeof txGet==='function'){try{const t=txGet(d.tx).clone(),q=Math.max(1,Math.round(((w.m.scale.x||1)+(w.m.scale.z||1))/8));t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(q,q);t.needsUpdate=true;m.map=t}catch(e){}}
  else m.map=null;
  if(!w.col&&d.c&&m.color)m.color.set(d.c);
  if(d.em&&m.emissive){m.emissive.set(d.c);m.emissiveIntensity=.8}
  if(w.trs===undefined){if(d.a){m.transparent=true;m.opacity=d.a}}
  w._tm=1;m.needsUpdate=true}
 else if(w._tm){m.map=w._om;w._tm=0;m.needsUpdate=true}}
if(typeof PtW!=='undefined'){const _ps=PtW.prototype.$s;PtW.prototype.$s=function(k,v){const r=_ps.apply(this,arguments);if(k==='Material'){try{lookPart(this)}catch(e){}}return r}}

/* ---------- 3. Terrain Editor: semua material di tab "Tipe Brush" ---------- */
function brushGrid(){const lc=document.getElementById('lcol');if(!lc)return false;const tgr=lc.querySelector('.tgr');if(!tgr)return false;
 const css=document.createElement('style');css.textContent='.tgx{display:grid;grid-template-columns:repeat(2,1fr);gap:4px;margin-top:6px;padding-top:6px;border-top:1px solid rgba(127,127,127,.35)}.tgx b{grid-column:1/-1;font-size:11px;opacity:.7}.tgx button{display:flex;align-items:center;gap:6px;font-size:11px;padding:5px 6px;border-radius:6px;border:1px solid rgba(127,127,127,.4);background:rgba(127,127,127,.12);color:inherit;cursor:pointer}.tgx i{width:12px;height:12px;border-radius:3px;border:1px solid rgba(0,0,0,.35);flex:0 0 12px}';document.head.appendChild(css);
 const draw=()=>{const on=lc.querySelector('.tt b.on');if(!on||on.dataset.v!=='tt:b'||tgr.querySelector('.tgx'))return;
  const d=document.createElement('div');d.className='tgx';d.innerHTML='<b>Semua material</b>'+ORDER.map(m=>'<button type="button" data-tm="'+m+'"><i style="background:'+MAT[m].c+'"></i>'+m+'</button>').join('');tgr.appendChild(d)};
 new MutationObserver(draw).observe(tgr,{childList:true});new MutationObserver(draw).observe(lc.querySelector('.tt'),{subtree:true,attributes:true,attributeFilter:['class']});
 tgr.addEventListener('click',e=>{const b=e.target.closest('[data-tm]');if(!b)return;e.stopPropagation();
  try{const d=MAT[b.dataset.tm],T=ST.d.objs.filter(o=>o.n=='Terrain');if(!T.length)return toast('Buat Terrain dulu (Generate)');
   pushUndo();T.forEach(o=>{o.c=d.c;o.tex=d.tx||''});sBuild();eRender();pRender();touch();slog('Terrain → '+b.dataset.tm)}catch(x){}});
 draw();return true}
{let n=0;const iv=setInterval(()=>{if(brushGrid()||++n>40)clearInterval(iv)},500)}

/* ---------- 4. template Toolbox ---------- */
const addT=(n,d,f)=>{if(!TB.some(x=>x.n===n))TB.push({n,ic:'',d,f})};
const TERSRC=`-- Membuat terrain dari script. Semua material bisa dipakai:
-- Grass LeafyGrass Sand Sandstone Water Rock Slate Basalt Mud Ground Snow Ice Glacier
-- Salt Limestone Pavement Asphalt Cobblestone Concrete Brick WoodPlanks CrackedLava
-- Air = menghapus terrain.
local terrain = workspace.Terrain
terrain:Clear()

-- bukit rumput + pantai pasir
terrain:FillBlock(CFrame.new(0, 1, 40), Vector3.new(40, 2, 30), Enum.Material.Grass)
terrain:FillBlock(CFrame.new(0, 0.5, 60), Vector3.new(40, 1, 10), Enum.Material.Sand)

-- kolam air (tembus, bisa dilewati)
terrain:FillCylinder(CFrame.new(32, 0.4, 40), 0.8, 9, Enum.Material.Water)

-- gunung batu + puncak salju
terrain:FillBall(Vector3.new(-30, 2, 40), 9, Enum.Material.Rock)
terrain:FillBall(Vector3.new(-30, 9, 40), 4, Enum.Material.Snow)

-- lava
terrain:FillBlock(CFrame.new(0, 0.3, 80), Vector3.new(14, 0.6, 14), Enum.Material.CrackedLava)

-- ganti material: rumput -> salju -> pasir -> rumput (tiap 3 detik)
local urutan = {Enum.Material.Snow, Enum.Material.Sand, Enum.Material.Mud, Enum.Material.Grass}
local sekarang = Enum.Material.Grass
local i = 1
while true do
	wait(3)
	terrain:ReplaceMaterial(nil, 4, sekarang, urutan[i])
	sekarang = urutan[i]
	i = i % #urutan + 1
end
`;
addT('Terrain Script (semua material)','Script: bikin terrain (FillBlock/FillBall/FillCylinder) dengan semua material + ReplaceMaterial',()=>sg('ServerScriptService','Script',TERSRC,'TerrainScript'));
const TREESRC=`-- Animasi pohon bergoyang tertiup angin.
-- Cara pakai untuk pohon buatanmu: namai part-nya  NamaPohon_Batang  dan  NamaPohon_Daun1, NamaPohon_Daun2, ...
-- (contoh: Pohon1_Batang, Pohon1_Daun1). Semua pohon dengan pola nama itu akan ikut bergoyang.
local RunService = game:GetService("RunService")

local KEKUATAN = 0.06   -- seberapa miring (radian). 0.03 = pelan, 0.12 = badai
local KECEPATAN = 1.4   -- seberapa cepat bergoyang

local pohon = {}
for _, p in pairs(workspace:GetChildren()) do
	local nama = p.Name
	if #nama > 7 and string.sub(nama, -7) == "_Batang" then
		local awalan = string.sub(nama, 1, #nama - 7)
		local alas = p.Position - Vector3.new(0, p.Size.Y / 2, 0)
		local data = {batang = p, tinggi = p.Size.Y, alas = alas, daun = {}, fase = #pohon * 1.7}
		for _, d in pairs(workspace:GetChildren()) do
			if string.sub(d.Name, 1, #awalan + 5) == awalan .. "_Daun" then
				table.insert(data.daun, {part = d, off = d.Position - alas})
			end
		end
		table.insert(pohon, data)
	end
end

RunService.Heartbeat:Connect(function()
	local t = tick()
	for _, h in pairs(pohon) do
		local angin = math.sin(t * KECEPATAN + h.fase) * KEKUATAN + math.sin(t * KECEPATAN * 2.3 + h.fase) * KEKUATAN * 0.3
		local cf = CFrame.new(h.alas) * CFrame.Angles(math.cos(t * KECEPATAN * 0.8 + h.fase) * KEKUATAN * 0.5, 0, angin)
		h.batang.CFrame = cf * CFrame.new(0, h.tinggi / 2, 0)
		for _, d in pairs(h.daun) do
			-- daun bergoyang sedikit lebih kuat daripada batang
			local ayun = CFrame.Angles(0, 0, math.sin(t * KECEPATAN * 2 + h.fase) * KEKUATAN * 0.4)
			d.part.CFrame = cf * CFrame.new(d.off) * ayun
		end
	end
end)
`;
addT('Pohon Bergoyang (animasi)','3 pohon + script animasi: batang & daun bergoyang tertiup angin',()=>{
 [[-12,12],[0,16],[12,12]].forEach((q,i)=>{const n='Pohon'+(i+1),x=q[0],z=q[1];
  const b=O('cyl',x,2,z,1.2,4,1.2,'#8d5524');b.n=n+'_Batang';ST.d.objs.push(b);
  const d1=O('ball',x,5.5,z,5,5,5,'#2e9e4f');d1.n=n+'_Daun1';ST.d.objs.push(d1);
  const d2=O('ball',x,8,z,3.2,3.2,3.2,'#43b85f');d2.n=n+'_Daun2';ST.d.objs.push(d2)});
 return sg('ServerScriptService','Script',TREESRC,'PohonBergoyang')});
addT('Animasi Pohon (untuk pohonmu)','Script saja: pohon bernama X_Batang + X_Daun1.. akan bergoyang',()=>sg('ServerScriptService','Script',TREESRC,'PohonBergoyang'));
})();
;

/* ===== 61-tema-ganti.js ===== */
/* Tema normal: Merah Kehitaman (bawaan style.css). Tidak ada perubahan warna lewat JS. */
(function(){try{localStorage.removeItem('sp_theme')}catch(e){}
 try{const st=document.documentElement.style;for(let i=st.length-1;i>=0;i--){const n=st[i];if(n&&n.indexOf('--rt-')===0)st.removeProperty(n)}}catch(e){}
 const m=document.getElementById('tmeta');if(m)m.setAttribute('content','#1c0709')})();

/* ===== 62-ai-anti-terbang.js ===== */
/* ===== v21: AI ANTI-TERBANG / ANTI-CHEAT =====
   Pemain biasa yang melayang, naik tanpa lompat, atau tembus objek (noclip) di dalam game TANPA izin admin/owner
   -> peringatan (2x), lalu AUTO BAN. Ban pertama 7 hari, ban berikutnya permanen.
   Diizinkan jika: staf (owner/co-admin/admin), mode Test di Studio, pemain punya "izin terbang" dari staf (Panel -> Gift),
   atau map milik staf / map resmi Sandbox. Catatan: ini deteksi sisi-klien, bukan pengganti validasi server. */
(function(){
const AC_WARN=2,ACLOG='sp_aclog';
const STAFF=['owner','coowner','admin'];
const isStaff=u=>!!u&&(STAFF.includes(u.role)||String(u.name||'').toLowerCase()==='owner');
const flyOk=u=>{const f=u&&u.flyOk;return !!f&&(!f.until||f.until>Date.now())};
function allowed(){try{
 if(testing)return true;if(isStaff(me)||flyOk(me))return true;
 const g=curG;if(!g)return true;const by=g.by;if(!by||by==='Sandbox')return true;
 const cu=users&&users[by];if(cu&&(isStaff(cu)||String(by).toLowerCase()==='owner'))return true;
 return false}catch(e){return true}}
function logAC(why){try{const l=ls.get(ACLOG,[]);l.unshift({u:me.name,why,g:(curG&&curG.name)||'',t:Date.now()});ls.set(ACLOG,l.slice(0,50))}catch(e){}}
let st=null;
function reset(){st=null}
if(typeof startGame==='function'){const _sg=startGame;startGame=function(){reset();return _sg.apply(this,arguments)}}
function flag(why){
 logAC(why);me.acStrikes=(me.acStrikes||0)+1;const n=me.acStrikes;
 if(n<=AC_WARN){try{notify('AI Anti-Cheat: terdeteksi '+why+' tanpa izin staf. Peringatan '+n+'/'+AC_WARN)}catch(e){}
  try{toast('⚠ AI Anti-Cheat: '+why+' tidak diizinkan! Peringatan '+n+'/'+AC_WARN+'. Berikutnya = BAN')}catch(e){}
  try{act.respawn()}catch(e){}st.t0=performance.now();st.hov=st.rise=st.nc=0;save();return}
 const bans=(me.acBans||0)+1;me.acBans=bans;const perm=bans>=2;
 me.ban={perm,until:perm?0:Date.now()+7*864e5,reason:('AI Anti-Cheat: '+why+' tanpa izin admin/owner').slice(0,120),by:'AI Sandbox',t:Date.now(),auto:1};
 me.acStrikes=0;me.pres=null;save();
 try{if(window.spDevBan)window.spDevBan(me.name,me.ban)}catch(e){}
 try{stopGame()}catch(e){}try{enter()}catch(e){}}
setInterval(()=>{try{
 if(!run||paused||!P||!me||document.hidden)return;
 const now=performance.now();
 if(!st||st.g!==curG){st={g:curG,t0:now,last:now,x:P.x,y:P.y,z:P.z,hov:0,rise:0,nc:0};return}
 const dt=(now-st.last)/1000;st.last=now;
 const dx=P.x-st.x,dy=P.y-st.y,dz=P.z-st.z;st.x=P.x;st.y=P.y;st.z=P.z;
 if(dt>.8||dt<=0||now-st.t0<3500||Math.hypot(dx,dy,dz)>25){st.hov=st.rise=st.nc=0;return}
 if(allowed())return;
 const air=!P.ground,vy=P.vy||0;
 if(air&&P.y>3.2&&Math.abs(vy)<.6)st.hov+=dt;else st.hov=Math.max(0,st.hov-dt*2);
 if(air&&dy>.02&&vy<=.5&&dy/dt>2.5)st.rise+=dt;else st.rise=Math.max(0,st.rise-dt);
 if(hit(P.x,P.z,P.y))st.nc+=dt;else st.nc=Math.max(0,st.nc-dt);
 let why='';
 if(st.hov>1.8)why='melayang/terbang';else if(st.rise>1)why='naik tanpa lompat (fly)';else if(st.nc>1.5)why='tembus objek (noclip)';
 if(why)flag(why);
}catch(e){}},150);
/* ---- izin terbang dari staf (Panel -> Gift) ---- */
const $i=id=>document.getElementById(id);
act.flyok=function(v){
 if(!isStaff(me))return toast('Hanya admin/owner');
 const r=String(($i('pt_u')||{}).value||'').trim().replace(/^@/,'').toLowerCase();if(!r)return toast('Ketik username dulu');
 const k=Object.keys(users).find(x=>x.toLowerCase()===r);if(!k)return toast('Username "'+r+'" tidak ditemukan');
 const hrs=v==='0'?0:v==='7d'?168:24,on=v!=='0',until=on?Date.now()+hrs*36e5:0,u=users[k];
 if(u&&(u===me||!u.rm)){u.flyOk=on?{until,by:me.name}:null;try{u.notes=u.notes||[];u.notes.unshift({t:on?'Kamu mendapat izin terbang dari '+me.name:'Izin terbang dicabut',new:1})}catch(e){}save()}
 if(u!==me&&window.spSendCmd){try{window.spSendCmd(k,'flyok',{on,until},0)}catch(e){}}
 toast(on?'Izin terbang '+(hrs>=168?'7 hari':'24 jam')+' diberikan ke '+k:'Izin terbang '+k+' dicabut')};
function inject(){try{if(typeof page==='undefined'||page!=='panel'||!isStaff(me))return;const b=document.querySelector('[data-a=gbux]');if(!b||$i('fo_box'))return;
 b.insertAdjacentHTML('afterend','<div id="fo_box" style="margin-top:10px"><label>Izin terbang (AI Anti-Cheat)</label><div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn sm g" data-a="flyok" data-v="24h">Izinkan 24 jam</button><button class="btn sm c" data-a="flyok" data-v="7d">Izinkan 7 hari</button><button class="btn sm o" data-a="flyok" data-v="0">Cabut izin</button></div><div class="cn" style="font-size:12px;margin-top:4px">Tanpa izin ini, pemain biasa yang terbang/noclip di map akan di-ban otomatis oleh AI.</div></div>')}catch(e){}}
const m=document.getElementById('main');if(m)new MutationObserver(inject).observe(m,{childList:true,subtree:true});
})();

/* ===== 63-taman-kunci-uji.js ===== */
/* ===== v21: Map "Taman Sandbox" + kunci rahasia (ProximityPrompt) -> Mahkota Creator Sandbox; wajib UJI (Test) sebelum publish map/aksesoris ===== */
(function(){
/* ---------- 1. MAP TAMAN ---------- */
const G=[];const add=(...a)=>{const o=O(...a);G.push(o);return o},nc=(...a)=>{const o=O(...a);o.cc=false;G.push(o);return o};
add('spawn',0,.2,24,5,.4,5,'#e8e2d0');
nc('part',0,.05,0,4,.1,50,'#d9ccaa');nc('part',0,.06,0,50,.1,4,'#d9ccaa');nc('part',0,.05,24,5.4,.1,5.4,'#d9ccaa');
/* air mancur */
add('cyl',0,.5,0,8,1,8,'#a9b4c2');nc('cyl',0,1.03,0,7,.1,7,'#58b8ff');add('cyl',0,2,0,1.2,3,1.2,'#c3ccd8');nc('ball',0,3.9,0,1.8,1.8,1.8,'#58b8ff');
/* pohon */
[[-14,-14],[14,-14],[-14,14],[14,14],[-22,2],[22,-2],[2,-22],[-24,-8],[24,10],[10,-26],[-8,26],[26,24],[-26,20]].forEach(([x,z],i)=>{
 add('cyl',x,1.5,z,.9,3,.9,'#7a4b25');nc('ball',x,4.3,z,4.4,3.8,4.4,i%3?'#3fa34d':'#58b85a');nc('ball',x+.5,5.7,z-.4,2.8,2.4,2.8,'#6cc96b')});
/* bedeng bunga */
[[-9,-9],[9,-9],[-9,9],[9,9]].forEach(([x,z],q)=>{add('part',x,.25,z,5,.5,5,'#6b4a2b');
 ['#ff6b8b','#ffd23f','#ff9f43','#c77dff','#ffffff'].forEach((c,i)=>{const a=i*1.26+q;nc('ball',x+Math.cos(a)*1.6,.75,z+Math.sin(a)*1.6,.7,.7,.7,c)});nc('ball',x,.8,z,.9,.9,.9,['#ff6b8b','#ffd23f','#c77dff','#ff9f43'][q])});
/* bangku */
[[-6,12,0],[6,12,0],[-6,-12,180],[6,-12,180]].forEach(([x,z,r])=>{add('part',x,.7,z,3,.25,1,'#a9713a',r);add('part',x-1.2,.35,z,.2,.7,.8,'#6b4a2b',r);add('part',x+1.2,.35,z,.2,.7,.8,'#6b4a2b',r);add('part',x,1.15,z+(r?.45:-.45),3,.7,.15,'#a9713a',r)});
/* kolam */
nc('part',24,.05,-14,10,.1,8,'#4aa8e8');
[[19,-14],[29,-14],[24,-18],[24,-10]].forEach(([x,z])=>add('ball',x,.3,z,1.4,.8,1.4,'#8d939c'));
/* pagar keliling (gerbang di selatan) */
add('part',0,1,-32,64,2,.4,'#e6d5b8');add('part',-32,1,0,.4,2,64,'#e6d5b8');add('part',32,1,0,.4,2,64,'#e6d5b8');
add('part',-18,1,32,28,2,.4,'#e6d5b8');add('part',18,1,32,28,2,.4,'#e6d5b8');
/* batu biasa */
add('ball',24,.9,22,3.2,1.8,2.6,'#8d939c');add('ball',-10,.7,-20,2.6,1.4,2.2,'#868b95');add('ball',12,.6,-6,2,1.2,1.8,'#9097a1');add('ball',-22,.8,14,2.8,1.6,2.4,'#8a8f99');
/* batu besar (di depan) + batu kunci tersembunyi di belakangnya */
add('ball',-26,1.8,-26,6,3.6,5,'#7b7f88');
const KP={x:-30.4,y:.4,z:-30.4};
const stone=nc('ball',KP.x,KP.y,KP.z,1,.8,1,'#4f525c');stone.n='Batu Kunci';
const glint=nc('cyl',KP.x+.05,KP.y+.45,KP.z+.05,.28,.12,.28,'#ffd54a');glint.n='Kilau Kunci';
const TAMAN={id:'sb_taman',name:'Taman Sandbox',emoji:'🌳',col:'#6dc15a',sky:'#bfe9ff',by:'Sandbox',desc:'Taman santai dengan air mancur, bunga, dan kolam. Konon ada rahasia tersembunyi di sini...',genre:'Santai',pub:true,pl:0,lk:0,seed:7,objs:G,svc:{}};
try{if(!BASE.some(g=>g.id==='sb_taman'))BASE.push(TAMAN)}catch(e){}
/* ---------- 2. KUNCI RAHASIA + PROXIMITYPROMPT ---------- */
const CROWN_SRC='sb_creator_crown';
const crownObjs=()=>{const a=[O('cyl',0,2.82,0,1.08,.3,1.08,'#ffc400')];
 [[.38,.38],[-.38,.38],[.38,-.38],[-.38,-.38]].forEach(([x,z])=>{a.push(O('part',x,3.12,z,.2,.4,.2,'#ffd54a'));a.push(O('ball',x,3.38,z,.2,.2,.2,'#ff3b5c'))});
 a.push(O('part',0,3.2,0,.26,.58,.26,'#ffd54a'));a.push(O('ball',0,3.56,0,.28,.28,.28,'#00d4ff'));a.push(O('ball',0,2.86,.56,.26,.26,.26,'#7df9ff'));return a};
const hasCrown=()=>(me.items||[]).some(x=>x.src===CROWN_SRC);
let btn=null,near=false;
const css=document.createElement('style');css.textContent='#kprompt{position:fixed;left:50%;bottom:150px;transform:translateX(-50%);z-index:30;display:none;align-items:center;gap:10px;padding:12px 18px;border-radius:14px;border:3px solid #fff;background:rgba(20,10,12,.88);color:#fff;font:800 16px "Space Grotesk",system-ui,sans-serif;box-shadow:0 6px 18px rgba(0,0,0,.5)}#kprompt i{font-style:normal;background:#fff;color:#000;border-radius:6px;padding:2px 8px;font-size:14px}';
document.head.appendChild(css);
btn=document.createElement('button');btn.id='kprompt';btn.innerHTML='<i>E</i> 🔑 Ambil Kunci';btn.addEventListener('click',e=>{e.stopPropagation();take()});
document.getElementById('game').appendChild(btn);
function hideKey(){try{scene.traverse(m=>{const o=m.userData&&m.userData.o;if(o===stone||o===glint)m.visible=false})}catch(e){}}
function take(){if(!near||!me||hasCrown())return;
 const id='i'+Date.now();(me.items=me.items||[]).push({id,name:'Mahkota Creator Sandbox',slot:'Kepala',objs:crownObjs(),src:CROWN_SRC,by:'Sandbox',special:1,desc:'Hadiah rahasia Taman Sandbox'});
 try{me.av.acc=(me.av.acc||[]).concat(id);if(plr)crownObjs().forEach(o=>plr.add(mkObj(o)))}catch(e){}
 me.gardenKey=true;save();near=false;btn.style.display='none';
 hideKey();
 try{for(let i=0;i<24;i++)burst(P.x,P.y+2.6,P.z,i%2?'#ffd54a':'#ff3b5c',1)}catch(e){}
 try{notify('👑 Kamu menemukan kunci rahasia dan mendapat "Mahkota Creator Sandbox"!')}catch(e){}
 try{toast('👑 Mahkota Creator Sandbox didapat!')}catch(e){}try{addChat('Sistem','👑 '+me.name+' menemukan kunci rahasia Taman!')}catch(e){}}
document.addEventListener('keydown',e=>{if((e.key==='e'||e.key==='E')&&near&&!/INPUT|TEXTAREA/.test((document.activeElement||{}).tagName||''))take()});
if(typeof startGame==='function'){const _sg=startGame;startGame=function(g){near=false;btn.style.display='none';const r=_sg.apply(this,arguments);
 try{if(g&&g.id==='sb_taman'&&hasCrown())hideKey()}catch(e){}
 try{if(g&&g.id==='sb_taman')setTimeout(()=>{try{addChat('Sistem','Konon ada kunci tersembunyi di taman ini... coba periksa di balik batu besar 🪨')}catch(e){}},1200)}catch(e){}return r}}
setInterval(()=>{try{
 if(!run||paused||!P||!me||!curG||curG.id!=='sb_taman'||hasCrown()){if(near){near=false;btn.style.display='none'}return}
 const d=Math.hypot(P.x-KP.x,P.z-KP.z),v=d<2.6&&Math.abs(P.y-KP.y)<3;
 if(v!==near){near=v;btn.style.display=v?'flex':'none'}
}catch(e){}},120);
/* ---------- 3. WAJIB UJI (TEST) SEBELUM PUBLISH ---------- */
const hsh=t=>{let h=2166136261;for(let i=0;i<t.length;i++)h=Math.imul(h^t.charCodeAt(i),16777619);return(h>>>0).toString(36)};
const sig=d=>{try{return hsh(JSON.stringify([d.objs||null,d.ch||null,d.svc||null]))}catch(e){return''}};
window.spTestGate=function(d,isAcc){try{
 if(!d||d.pub===true)return'';
 if(isAcc){const n=(d.objs||[]).length+(d.ch||[]).length;if(!n)return'Aksesoris masih kosong. Tambahkan objek lalu uji (▶ Test)'}
 if(d.testSig!==sig(d))return'Uji dulu! Tekan ▶ Test minimal sekali (setelah perubahan terakhir) sebelum publish '+(isAcc?'aksesoris':'map');
 return''}catch(e){return''}};
if(typeof act!=='undefined'&&act.edtest){const _t=act.edtest;act.edtest=function(){try{if(ST&&ST.d){ST.d.testSig=sig(ST.d);save()}}catch(e){}return _t.apply(this,arguments)}}
if(typeof act!=='undefined'&&act.edpub){const _p=act.edpub;act.edpub=function(){try{if(ST&&ST.d&&(ST.kind==='g'||ST.kind==='a')){const d=ST.d;if(d.pub!==true&&!(d.rv&&d.rv.s==='pending')){const m=window.spTestGate(d,ST.kind==='a');if(m)return toast(m)}}}catch(e){}return _p.apply(this,arguments)}}
})();

/* ===== 64-studio-ekspor-impor.js ===== */
/* ===== v22: Studio -> File -> Ekspor ke file (.json) & Impor dari file. Aksesoris ikut membawa efek/isi (ch) ===== */
(function(){
act.edexpf=function(){
 try{if(!ST||!ST.d)return toast('Buka proyek dulu');
  const d=ST.d,kind=ST.kind==='a'?'a':'g',c=JSON.parse(JSON.stringify(d));
  ['pub','rv','feePaid','feeAmt','testSig','mine','id'].forEach(k=>delete c[k]);
  const j=JSON.stringify({shinpo:1,kind,by:(me.apiKey||'').slice(0,12),data:Object.assign({id:d.id},c)});
  const fn=String(d.name||'proyek').replace(/\W+/g,'_')+'.sandbox.json';let dl=false;
  try{const b=new Blob([j],{type:'application/json'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=fn;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);dl=true}catch(e){}
  let cp=false;try{if(navigator.clipboard){navigator.clipboard.writeText(j).catch(()=>{});cp=true}}catch(e){}
  toast(dl?'Diekspor: '+fn+(cp?' (JSON juga disalin)':''):cp?'JSON proyek disalin ke clipboard':'Ekspor tidak tersedia di browser ini')
 }catch(e){toast('Gagal mengekspor')}};
act.edimpf=function(){try{window.__impOpen=1;document.getElementById('imp').click()}catch(e){toast('Impor tidak tersedia')}};
})();

/* ===== 65-ekspor-impor-dialog.js ===== */
/* v22b: dialog Ekspor/Impor yang tidak bergantung pada unduhan/file picker (aman di artefak/WebView): salin-tempel JSON + tombol unduh/pilih file */
(function(){
const css=document.createElement('style');css.textContent='#eiov{position:fixed;inset:0;z-index:400;background:rgba(0,0,0,.65);display:none;align-items:center;justify-content:center;padding:12px}#eiov.on{display:flex}#eiov .ec{width:100%;max-width:520px;max-height:92vh;overflow:auto;background:#fff;color:#000;border:3px solid #000;border-radius:14px;padding:14px;font-family:inherit}#eiov h3{margin:0 0 8px}#eiov textarea{width:100%;height:150px;box-sizing:border-box;font:12px/1.3 monospace;border:2px solid #000;border-radius:8px;padding:6px}#eiov .er2{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}#eiov .er2 button{flex:1;min-width:110px;padding:10px;border:2px solid #000;border-radius:10px;font:inherit;font-weight:800;background:#b6f25a;color:#000}#eiov .er2 button.x{background:#eee}';
document.head.appendChild(css);
const ov=document.createElement('div');ov.id='eiov';document.body.appendChild(ov);
const close=()=>ov.classList.remove('on');
const build=()=>{const d=ST.d,kind=ST.kind==='a'?'a':'g',c=JSON.parse(JSON.stringify(d));
 ['pub','rv','feePaid','feeAmt','testSig','mine','id'].forEach(k=>delete c[k]);
 return{fn:String(d.name||'proyek').replace(/\W+/g,'_')+'.sandbox.json',j:JSON.stringify({shinpo:1,kind,by:(me.apiKey||'').slice(0,12),data:Object.assign({id:d.id},c)})}};
const cp=t=>{try{if(navigator.clipboard&&navigator.clipboard.writeText)return navigator.clipboard.writeText(t).then(()=>1,()=>0)}catch(e){}return Promise.resolve(0)};
act.edexpf=function(){
 let o;try{if(!ST||!ST.d)return toast('Buka proyek dulu');o=build()}catch(e){return toast('Gagal mengekspor')}
 ov.innerHTML='<div class="ec"><h3>Ekspor proyek</h3><div style="font-size:13px;margin-bottom:6px">Salin teks ini lalu simpan sebagai <b>'+esc(o.fn)+'</b>, atau tekan Unduh.</div><textarea id="ei_t" readonly></textarea><div class="er2"><button id="ei_c">Salin</button><button id="ei_d">Unduh file</button><button class="x" id="ei_x">Tutup</button></div></div>';
 const t=ov.querySelector('#ei_t');t.value=o.j;ov.classList.add('on');
 ov.querySelector('#ei_c').onclick=async()=>{t.focus();t.select();let ok=await cp(o.j);if(!ok){try{ok=document.execCommand('copy')}catch(e){}}toast(ok?'JSON disalin ✓':'Tekan lama teks lalu pilih Salin')};
 ov.querySelector('#ei_d').onclick=()=>{try{const b=new Blob([o.j],{type:'application/json'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=o.fn;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);toast('Mengunduh '+o.fn+' (jika tidak muncul, pakai Salin)')}catch(e){toast('Unduh diblokir. Pakai Salin')}};
 ov.querySelector('#ei_x').onclick=close};
act.edimpf=function(){
 ov.innerHTML='<div class="ec"><h3>Impor proyek</h3><div style="font-size:13px;margin-bottom:6px">Pilih file <b>.sandbox.json</b>, atau tempel isi JSON di bawah.</div><textarea id="ei_t" placeholder="Tempel JSON proyek di sini..."></textarea><label class="fl2" style="display:block;margin-top:8px;padding:12px;border:2px dashed #000;border-radius:10px;font-weight:800;text-align:center;background:#7df9ff">📁 Ketuk untuk pilih file<input type="file" id="ei_f" accept="*/*" style="display:block;width:100%;margin-top:8px;font-size:13px"></label><div class="er2"><button id="ei_i">Impor teks</button><button class="x" id="ei_x">Tutup</button></div></div>';
 ov.classList.add('on');const t=ov.querySelector('#ei_t');
 const sendJ=v=>{try{JSON.parse(v)}catch(e){return toast('Isi file bukan JSON proyek yang valid')}const inp=document.getElementById('imp'),dt=new DataTransfer();dt.items.add(new File([v],'m.sandbox.json'));inp.files=dt.files;window.__impOpen=1;close();inp.dispatchEvent(new Event('change'))};
 ov.querySelector('#ei_f').onchange=ev=>{const f=ev.target.files&&ev.target.files[0];if(!f)return;const fr=new FileReader();fr.onload=()=>sendJ(String(fr.result||'').trim());fr.onerror=()=>toast('Gagal membaca file');fr.readAsText(f)};
 ov.querySelector('#ei_i').onclick=()=>{const v=t.value.trim();if(!v)return toast('Tempel JSON dulu');try{JSON.parse(v)}catch(e){return toast('Teks bukan JSON yang valid')}
  const inp=document.getElementById('imp'),dt=new DataTransfer();dt.items.add(new File([v],'m.sandbox.json'));inp.files=dt.files;window.__impOpen=1;close();inp.dispatchEvent(new Event('change'))};
 ov.querySelector('#ei_x').onclick=close};
ov.addEventListener('click',e=>{if(e.target===ov)close()});
})();

/* ===== 66-glb.js: Model 3D asli (.glb) - impor, tampil di Studio & game, ekspor ===== */
(function(){
const CDN=['https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/','https://unpkg.com/three@0.128.0/examples/js/','https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/examples/js/'];
const ld=u=>new Promise((ok,no)=>{const e=document.createElement('script');e.src=u;e.onload=ok;e.onerror=()=>{e.remove();no()};document.head.appendChild(e)});
async function need(cls,path){if(THREE[cls])return true;for(const b of CDN){try{await ld(b+path);if(THREE[cls])return true}catch(e){}}return false}
function save1(blob,fn){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=fn;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),6000)}
const b64buf=u=>{const b=atob(u.slice(u.indexOf(',')+1)),a=new Uint8Array(b.length);for(let i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return a.buffer};
NM.model='Model';TI.model='🧊';
/* cari data model berdasarkan id */
function mdlData(mid){const L=[];try{if(window.__curG)L.push(window.__curG)}catch(e){}try{if(typeof curG!=='undefined'&&curG)L.push(curG)}catch(e){}try{if(ST&&ST.d)L.push(ST.d)}catch(e){}
 try{if(me){(me.games||[]).forEach(x=>L.push(x));(me.items||[]).forEach(x=>L.push(x))}}catch(e){}
 for(const r of L){if(r&&r.models&&r.models[mid])return r.models[mid]}
 try{if(typeof pubGames==='function')for(const g of pubGames()){if(g&&g.models&&g.models[mid])return g.models[mid]}}catch(e){}
 try{if(typeof mkItems==='function')for(const x of mkItems()){if(x&&x.models&&x.models[mid])return x.models[mid]}}catch(e){}
 return null}
const MC={};
/* muat & normalkan model ke kubus 1x1x1 (ukuran asli diatur lewat sx/sy/sz) */
function mdlLoad(mid){if(MC[mid])return MC[mid];const url=mdlData(mid);if(!url)return Promise.resolve(null);
 return MC[mid]=(async()=>{if(!await need('GLTFLoader','loaders/GLTFLoader.js')){delete MC[mid];return null}
  return new Promise(ok=>{try{new THREE.GLTFLoader().parse(b64buf(url),'',gl=>{const r=gl.scene;r.updateMatrixWorld(true);
   const b=new THREE.Box3().setFromObject(r),sz=b.getSize(new THREE.Vector3()),ct=b.getCenter(new THREE.Vector3()),N=new THREE.Group();
   r.position.sub(ct);N.add(r);N.scale.set(1/(sz.x||1),1/(sz.y||1),1/(sz.z||1));N.userData.dim=[sz.x,sz.y,sz.z];ok(N)},()=>{delete MC[mid];ok(null)})}catch(e){delete MC[mid];ok(null)}})})()}
function mkModel(o){const G=new THREE.Group();place(G,o);G.userData={o};
 const h=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));G.add(h);
 mdlLoad(o.mid).then(N=>{if(!N)return;G.add(N.clone(true));try{if(ST&&typeof selHelper==='function')selHelper()}catch(e){}});return G}
const _mk=mkObj;mkObj=function(o){return o&&o.t==='model'?mkModel(o):_mk.apply(this,arguments)};
window.__mdlLoad=mdlLoad;const _bw=buildW;buildW=function(g){window.__curG=g;return _bw.apply(this,arguments)};
/* ---- ekspor ---- */
act.edglb=async function(){
 try{if(!ST||!ST.d)return toast('Buka proyek dulu');
  toast('Menyiapkan GLB...');
  if(!await need('GLTFExporter','exporters/GLTFExporter.js'))return toast('Pengekspor GLB gagal dimuat. Cek koneksi internet');
  const d=ST.d,S=new THREE.Scene(),M=c=>new THREE.MeshStandardMaterial({color:c||'#ffffff',roughness:.9,metalness:0});
  if(ST.kind!=='a'&&d.base!==false){const gr=new THREE.Mesh(new THREE.PlaneGeometry(100,100),M(d.col));gr.rotation.x=-Math.PI/2;gr.name='Baseplate';S.add(gr)}
  let n=0;
  for(const o of (d.objs||[])){if(!o||o.t==='coin')continue;
   if(o.t==='model'){const N=await mdlLoad(o.mid);if(!N)continue;const G=new THREE.Group();G.name=String(o.n||'Model');place(G,o);G.add(N.clone(true));S.add(G);n++;continue}
   const g=o.t=='cyl'?new THREE.CylinderGeometry(.5,.5,1,20):o.t=='ball'?new THREE.SphereGeometry(.5,16,12):new THREE.BoxGeometry(1,1,1),m=new THREE.Mesh(g,M(o.c));
   m.name=String(o.n||'Part');place(m,o);S.add(m);n++}
  if(!n&&!S.children.length)return toast('Tidak ada objek untuk diekspor');
  S.updateMatrixWorld(true);
  const fn=String(d.name||'model').replace(/\W+/g,'_')+'.glb';
  new THREE.GLTFExporter().parse(S,res=>{try{save1(new Blob([res],{type:'model/gltf-binary'}),fn);toast('Diekspor: '+fn)}catch(e){toast('Unduh diblokir browser')}},{binary:true,onlyVisible:true})
 }catch(e){toast('Gagal mengekspor GLB')}};
/* ---- impor: model asli, bukan Part ---- */
async function shrinkGlb(buf){
 if(!await need('GLTFExporter','exporters/GLTFExporter.js')||!await need('GLTFLoader','loaders/GLTFLoader.js'))return null;
 return new Promise(ok=>{try{new THREE.GLTFLoader().parse(buf,'',gl=>{try{
  const seen=new Map(),small=t=>{if(!t||!t.image)return t;if(seen.has(t))return seen.get(t);const im=t.image,w=im.width||0,h=im.height||0;if(!w||!h){seen.set(t,t);return t}
   const k=Math.min(1,256/Math.max(w,h));if(k>=1){seen.set(t,t);return t}
   const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w*k));c.height=Math.max(1,Math.round(h*k));c.getContext('2d').drawImage(im,0,0,c.width,c.height);
   const n=new THREE.CanvasTexture(c);n.flipY=false;n.encoding=t.encoding;n.wrapS=t.wrapS;n.wrapT=t.wrapT;n.name=t.name;seen.set(t,n);return n};
  gl.scene.traverse(o=>{if(!o.isMesh)return;(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>{['map','normalMap','roughnessMap','metalnessMap','emissiveMap','aoMap','alphaMap'].forEach(k=>{if(m&&m[k])m[k]=small(m[k])})})});
  new THREE.GLTFExporter().parse(gl.scene,r=>ok(r instanceof ArrayBuffer?r:null),{binary:true,onlyVisible:false})
 }catch(e){ok(null)}},()=>ok(null))}catch(e){ok(null)}})}
const bufUrl=b=>{const u=new Uint8Array(b);let t='';for(let i=0;i<u.length;i+=8192)t+=String.fromCharCode.apply(null,u.subarray(i,i+8192));return 'data:model/gltf-binary;base64,'+btoa(t)};
async function addModel(url,fname){try{
    url='data:model/gltf-binary;base64,'+url.slice(url.indexOf(',')+1);
    if(url.length>300000){try{toast('Mengoptimalkan model...');const sb=await shrinkGlb(b64buf(url));if(sb){const nu=bufUrl(sb);if(nu.length<url.length*.9){const tid='mt'+Date.now().toString(36);window.__tmpm=window.__tmpm||{};window.__tmpm[tid]=nu;ST.d.models=ST.d.models||{};ST.d.models[tid]=nu;const T=await mdlLoad(tid);delete ST.d.models[tid];delete MC[tid];if(T)url=nu}}}catch(e){}}
    const head=new Uint8Array(b64buf(url).slice(0,4));if(String.fromCharCode(...head)!=='glTF')return toast('File bukan .glb yang valid');
    const d=ST.d,tot=Object.values(d.models||{}).reduce((a,v)=>a+v.length,0);if(tot+url.length>4.5e6)return toast('Ruang model proyek penuh. Hapus model lain dulu');
    toast('Memuat model...');
    const mid='m'+Date.now().toString(36);d.models=d.models||{};d.models[mid]=url;
    const N=await mdlLoad(mid);if(!N){delete d.models[mid];delete MC[mid];return toast('Model gagal dimuat. Cek koneksi internet')}
    const dim=N.userData.dim,mx=Math.max(dim[0],dim[1],dim[2])||1,acc=ST.kind==='a',k=(acc?1.2:5)/mx,r=v=>Math.max(.05,+(v*k).toFixed(2));
    const sx=r(dim[0]),sy=r(dim[1]),sz=r(dim[2]);
    pushUndo();
    const o={id:nid(),t:'model',mid,n:String(fname||'Model').replace(/\.glb$/i,'').slice(0,20)||'Model',x:acc?0:Math.round(sctl.tx||0),y:acc?3.1:+(sy/2).toFixed(2),z:acc?0:Math.round(sctl.tz||0),sx,sy,sz,ry:0,rx:0,rz:0,c:'#ffffff',cc:true};
    d.objs.push(o);SEL=o.id;sBuild();eRender();pRender();touch();slog('+ Model '+o.n);toast('Model ditambahkan: '+o.n)
   }catch(e){toast('Gagal mengimpor model')}}
act.addpm=function(key){if(!ST||!ST.d)return toast('Buka proyek dulu');const u=window.SB_MODELS&&window.SB_MODELS[key];if(!u)return toast('Model bawaan tidak ditemukan');addModel('data:model/gltf-binary;base64,'+u,key==='gold'?'Gold Dominus Hat':'Immortal Domino Crown')};
let fi=null;
act.edglbi=function(){
 if(!ST||!ST.d)return toast('Buka proyek dulu');
 if(!fi){fi=document.createElement('input');fi.type='file';fi.accept='.glb,model/gltf-binary';fi.hidden=true;document.body.appendChild(fi);
  fi.addEventListener('change',()=>{const f=fi.files&&fi.files[0];fi.value='';if(!f)return;
   if(f.size>4e6)return toast('File terlalu besar (maks. 4 MB)');
   const fr=new FileReader();fr.onerror=()=>toast('Gagal membaca file');
   fr.onload=()=>addModel(String(fr.result||''),f.name);
   fr.readAsDataURL(f)})}
 fi.click()};
/* picker Workspace + : entri Model (.glb) */
const _pins=act.pins;act.pins=function(v,t){if(t&&t.dataset&&t.dataset.k==='glb'){act.pkx();return act.edglbi()}if(t&&t.dataset&&t.dataset.k==='pm'){act.pkx();return act.addpm(v)}return _pins.apply(this,arguments)};
})();

/* ===== 67-model-toolbox.js: model bawaan siap pakai di Toolbox (tanpa impor) ===== */
(function(){
const _tb=tbxRender;
tbxRender=function(){_tb.apply(this,arguments);try{
 if(!ST||(typeof guiOn!=='undefined'&&guiOn))return;const e=document.getElementById('tbx');if(!e||e.querySelector('[data-a="addpm"]'))return;
 const h='<h4>Model</h4><div class="tg"><button class="btn sm" data-a="addpm" data-v="gold">🧊<br>Gold Dominus Hat</button><button class="btn sm" data-a="addpm" data-v="crown">🧊<br>Domino Crown</button></div>';
 const t=e.innerHTML,k=t.indexOf('<h4>Template');
 if(k>=0){e.innerHTML=t.slice(0,k)+h+t.slice(k)}else e.insertAdjacentHTML('beforeend',h)}catch(x){}};
if(ST)try{tbxRender()}catch(e){}
})();

/* ===== 68-efek-foto.js: efek aksesoris di game (native), foto otomatis, model ikut terbeli ===== */
(function(){
const DEF={Fire:{r:28,l:.9,s:3,z:.7,a:14,g:-4,k:'#ff7300',add:1},Smoke:{r:10,l:2.6,s:2,z:.8,a:20,g:-1,k:'#737373',add:0},Sparkles:{r:24,l:.8,s:2.2,z:.18,a:180,g:0,k:'#ffe64d',add:1},ParticleEmitter:{r:20,l:1.5,s:5,z:.3,a:35,g:0,k:'#ffffff',add:1},Explosion:{r:0,l:.8,s:18,z:.5,a:180,g:12,k:'#ff8019',add:1},PointLight:{}};
const nv=(v,d,a,b)=>{v=+v;return isFinite(v)?Math.max(a,Math.min(b,v)):d};
let ps=[],em=[],lts=[],geo=null,sc=null,last=performance.now();
function worn(){try{const ids=((typeof forceAcc!=='undefined'&&forceAcc)||(me&&me.av&&me.av.acc)||[]).slice();if(me&&me.av&&me.av.body&&!ids.includes(me.av.body))ids.push(me.av.body);return ids.map(id=>(me.items||[]).find(x=>x.id==id)).filter(Boolean)}catch(e){return[]}}
function clear(){ps.forEach(p=>{try{p.m.parent&&p.m.parent.remove(p.m);p.mt.dispose()}catch(e){}});ps=[];em=[];lts.forEach(l=>{try{l.parent&&l.parent.remove(l)}catch(e){}});lts=[]}
function setup(){clear();try{
 if(typeof window.__fxOf!=='function'||!me||typeof plr==='undefined'||!plr||typeof scene==='undefined')return;
 let ds=[];worn().forEach(it=>{ds=ds.concat(window.__fxOf(it))});ds=ds.filter(d=>d&&DEF[d.c]).slice(0,8);
 sc=scene;geo=geo||new THREE.BoxGeometry(1,1,1);last=performance.now();
 ds.forEach(d=>{if(d.c==='PointLight'){const l=new THREE.PointLight(/^#[0-9a-f]{6}$/i.test(d.k||'')?d.k:'#ffffff',nv(d.b,1,0,5),nv(d.n,16,1,40));l.position.set(0,1.8,.5);plr.add(l);lts.push(l)}else em.push({d,acc:0,t:0,fired:false})})
}catch(e){}}
function emit(d,n){const F=DEF[d.c],sp=nv(d.a,F.a,0,180)*Math.PI/180,q=Array.isArray(d.q)&&d.q.length===4,K=q?Math.max(.05,Math.min(20,+d.q[3]||1)):1;
 plr.updateWorldMatrix(true,false);
 for(let i=0;i<n&&ps.length<300;i++){const ang=Math.random()*6.283,t=Math.acos(1-Math.random()*(1-Math.cos(sp))),vx=Math.sin(t)*Math.cos(ang),vy=Math.cos(t),vz=Math.sin(t)*Math.sin(ang);
  const mt=new THREE.MeshBasicMaterial({color:/^#[0-9a-f]{6}$/i.test(d.k||'')?d.k:F.k,transparent:true,opacity:1,depthWrite:false});if(F.add)mt.blending=THREE.AdditiveBlending;if(d.c==='Sparkles')mt.color.setHSL(Math.random(),1,.65);
  const m=new THREE.Mesh(geo,mt),z0=nv(d.z,F.z,.02,4)*(.6+Math.random()*.8)*K,v=nv(d.s,F.s,0,30)*(.5+Math.random()*.7)*(q?(.4+.6*K):1);
  const c=plr.localToWorld(q?new THREE.Vector3(+d.q[0]||0,+d.q[1]||0,+d.q[2]||0):new THREE.Vector3(0,1.5,0));
  m.position.set(c.x+(Math.random()-.5)*(q?K:.6),c.y+(Math.random()-.5)*(q?K:.3),c.z+(Math.random()-.5)*(q?K:.6));m.scale.setScalar(z0);m.rotation.set(Math.random()*6,Math.random()*6,0);sc.add(m);
  ps.push({m,mt,vx:vx*v,vy:vy*v,vz:vz*v,g:nv(d.g,F.g,-30,30),life:nv(d.l,F.l,.05,6)*(.7+Math.random()*.6),age:0,z0})}}
function tick(){requestAnimationFrame(tick);
 const now=performance.now(),dt=Math.min(.05,(now-last)/1000);last=now;
 if(!sc||typeof scene==='undefined'||sc!==scene||typeof run==='undefined'||!run||typeof plr==='undefined'||!plr)return;
 if(typeof paused!=='undefined'&&paused)return;
 try{em.forEach(e=>{const d=e.d;e.t+=dt;
  if(d.c==='Explosion'){if(!e.fired||e.t>2.6){e.fired=true;e.t=0;emit(d,60)}return}
  if(d.e===0)return;e.acc+=nv(d.r,DEF[d.c].r,0,60)*dt*(Array.isArray(d.q)?(.5+.8*Math.max(.05,Math.min(20,+d.q[3]||1))):1);const n=Math.floor(e.acc);if(n>0){e.acc-=n;emit(d,n)}});
  for(let i=ps.length-1;i>=0;i--){const p=ps[i];p.age+=dt;if(p.age>=p.life){p.m.parent&&p.m.parent.remove(p.m);p.mt.dispose();ps.splice(i,1);continue}
   p.vy+=p.g*dt;p.m.position.x+=p.vx*dt;p.m.position.y+=p.vy*dt;p.m.position.z+=p.vz*dt;p.mt.opacity=1-p.age/p.life;p.m.scale.setScalar(p.z0*(1-.5*p.age/p.life))}}catch(e){}}
tick();
window.__nfx=true;
if(typeof startGame==='function'){const _s=startGame;startGame=function(){const r=_s.apply(this,arguments);setTimeout(setup,600);return r}}

/* ---- foto otomatis (ikon & thumbnail) dari objek/model ---- */
async function shot(d,kind,W,H){
 const objs=(d.objs||[]).filter(o=>o&&o.t!=='coin').slice(0,200);if(!objs.length)return null;
 for(const o of objs)if(o.t==='model'&&window.__mdlLoad)await window.__mdlLoad(o.mid);
 const R=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});R.setSize(W,H);R.setPixelRatio(1);R.setClearColor(kind==='a'?0xe6e6ea:(/^#[0-9a-f]{6}$/i.test(d.sky||'')?d.sky:'#bfe9ff'));
 const S=new THREE.Scene();S.add(new THREE.HemisphereLight(0xffffff,0x998877,1.1));const L=new THREE.DirectionalLight(0xffffff,.7);L.position.set(30,50,20);S.add(L);
 const G=new THREE.Group();objs.forEach(o=>{try{G.add(mkObj(o))}catch(e){}});S.add(G);
 await new Promise(r=>setTimeout(r,150));G.updateMatrixWorld(true);
 const b=new THREE.Box3().setFromObject(G),sz=b.getSize(new THREE.Vector3()),ct=b.getCenter(new THREE.Vector3()),rad=Math.max(sz.x,sz.y,sz.z,.5)*.5;
 const C=new THREE.PerspectiveCamera(35,W/H,.05,1000),dist=rad/Math.tan(C.fov*Math.PI/360)*1.4;
 C.position.copy(ct).addScaledVector(new THREE.Vector3(.7,.5,1).normalize(),dist);C.lookAt(ct);R.render(S,C);
 let u=null;try{u=R.domElement.toDataURL('image/jpeg',.85)}catch(e){}R.dispose();return u}
async function gen(d,kind){try{let ch=0;
 if(!d.icon){const u=await shot(d,kind,128,128);if(u){d.icon=u;ch=1}}
 if(!d.thumb){const u=await shot(d,kind,320,180);if(u){d.thumb=u;ch=1}}
 if(ch)save()}catch(e){}}
if(act.edpub){const _p=act.edpub;act.edpub=function(){const a=arguments,self=this;
 try{if(ST&&ST.d&&(!ST.d.icon||!ST.d.thumb)){toast('Membuat foto model...');gen(ST.d,ST.kind==='a'?'a':'g').then(()=>_p.apply(self,a));return}}catch(e){}
 return _p.apply(this,a)}}
let filled=null;
async function fillIcons(){try{if(!me||filled===me)return;filled=me;
 for(const it of (me.items||[]).slice(0,12)){if(!it.icon&&(it.objs||[]).some(o=>o&&o.t==='model')){const u=await shot(it,'a',128,128);if(u){it.icon=u;save()}}}}catch(e){}}
const _en=enter;enter=function(){const r=_en.apply(this,arguments);setTimeout(fillIcons,2500);return r};
setTimeout(fillIcons,3500);

/* ---- perbaiki aksesoris yang sudah terlanjur terbeli sebagai Part biasa: ambil model aslinya dari katalog ---- */
setInterval(()=>{try{
 if(!me||!Array.isArray(me.items)||!me.items.some(n=>n&&n.src&&String(n.src).indexOf('u_')===0&&!(n.models&&(n.objs||[]).some(o=>o&&o.t==='model'))))return;
 const cat=mkItems();let ch=0;
 me.items.forEach(n=>{if(!n||!n.src||String(n.src).indexOf('u_')!==0||(n.models&&(n.objs||[]).some(o=>o&&o.t==='model')))return;
  const c=cat.find(x=>x.key===n.src);
  if(c&&c.models&&(c.objs||[]).some(o=>o&&o.t==='model')){n.objs=c.objs.map(o=>Object.assign({},o,{id:nid()}));n.models=c.models;delete n.icon;ch=1}});
 if(ch){save();filled=null;fillIcons();try{render()}catch(e){}}
}catch(e){}},6000);
/* ---- model ikut terbawa saat beli aksesoris dari Marketplace ---- */
if(act.buy2){const _b=act.buy2;act.buy2=function(k){const r=_b.apply(this,arguments);try{const it=mkItems().find(x=>x.key===k),n=(me.items||[]).find(x=>x.src===k);if(it&&it.models&&n&&!n.models){n.models=it.models;save()}}catch(e){}return r}}
})();
