const API_URL = "https://script.google.com/macros/s/AKfycbz2TbbRs49nIkZET3Nc_PDX-8Ylx38pr9NZYcbuzXWZH-Wo1f3bLcGr1EfsfI4WEqRh/exec";
const DEFAULT_PASSWORD = "0418";
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCS5jVD_7h1hVUl7vTALZdqPFR4azXkghw",
  authDomain: "exchange-diary-3a750.firebaseapp.com",
  projectId: "exchange-diary-3a750",
  storageBucket: "exchange-diary-3a750.firebasestorage.app",
  messagingSenderId: "749042685880",
  appId: "1:749042685880:web:2dc8ed0d84f3fd0869a14d",
  measurementId: "G-0XT23WF0X5"
};
const VAPID_PUBLIC_KEY = "BKIqS6q158e3bO1bjcgAEzPkyyLk6bEheyGgecF5OcM0u1HztdgDUt7zUOBzzirdrpm_cVClk_UgHHQj28VV9lM";
let appPassword = localStorage.getItem("exchangeDiaryPassword") || DEFAULT_PASSWORD;
const ANNIVERSARY = "2024-04-18";
const $ = id => document.getElementById(id);
let state = {letters:[], songs:[], todos:[], memories:[], current:'home', month:new Date(), selectedMood:'😀', letterPhoto:'', memoryPhoto:''};
const fmt = v => { const d = new Date(v); return Number.isNaN(d) ? (v||'') : d.toLocaleString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}); };
const dateKey = v => { const d=new Date(v); if(Number.isNaN(d)) return ''; return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const esc = s => String(s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
const ytRegex = /(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=[\w-]+(?:[^\s]*)?|youtu\.be\/[\w-]+(?:[^\s]*)?|youtube\.com\/shorts\/[\w-]+(?:[^\s]*)?))/gi;
const DELETED_LETTERS_KEY = "exchangeDiaryDeletedLetters";
const LIKED_LETTERS_KEY = "exchangeDiaryLikedLetters";
function extractYouTubeUrl(text=''){ const m=String(text||'').match(ytRegex); return m ? m[0] : ''; }
function stripYouTubeLinks(text=''){ return String(text||'').replace(ytRegex,'').replace(/\n{3,}/g,'\n\n').trim(); }
function deletedLetterRows(){try{return new Set(JSON.parse(localStorage.getItem(DELETED_LETTERS_KEY)||'[]').map(String));}catch(e){return new Set();}}
function rememberDeletedLetter(row){const rows=deletedLetterRows();rows.add(String(row));localStorage.setItem(DELETED_LETTERS_KEY,JSON.stringify([...rows]));}
function forgetDeletedLetter(row){const rows=deletedLetterRows();rows.delete(String(row));localStorage.setItem(DELETED_LETTERS_KEY,JSON.stringify([...rows]));}
function likedLetterRows(){try{return new Set(JSON.parse(localStorage.getItem(LIKED_LETTERS_KEY)||'[]').map(String));}catch(e){return new Set();}}
function rememberLikedLetter(row){const rows=likedLetterRows();rows.add(String(row));localStorage.setItem(LIKED_LETTERS_KEY,JSON.stringify([...rows]));}
function isDateLike(v){const d=new Date(v);return !!v && !Number.isNaN(d.getTime());}
function isImageData(v){return String(v||'').startsWith('data:image/');}
function normalizeLetter(l){
  const letter={...l};
  if(!isDateLike(letter.date) && letter.date && letter.writer && letter.mood){
    letter.writer=l.date;
    letter.mood=l.writer;
    letter.title=l.mood;
    letter.content=l.title;
    letter.photoUrl=isImageData(l.content) ? l.content : l.photoUrl;
    letter.songUrl=l.photoUrl || l.songUrl || '';
    letter.openDate=l.songUrl || l.openDate || '';
    letter.date=l.id || new Date().toISOString();
  }
  return letter;
}
function hasLetterContent(l){
  return !!String(l.title||l.content||l.photoUrl||l.songUrl||l.openDate||'').trim();
}
function cleanLetters(letters){
  const deleted=deletedLetterRows();
  return (letters||[]).map(normalizeLetter).filter(l=>l.row && !deleted.has(String(l.row)) && hasLetterContent(l));
}
function show(screen){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));$(screen).classList.add('active');state.current=screen;document.body.classList.toggle('reading-letter',screen==='letterDetail');document.querySelectorAll('.tabbar button').forEach(b=>b.classList.toggle('active',b.dataset.screen===screen));const titles={home:['교환일기','오늘도 기록하기'],letters:['편지','우리의 마음'],write:['새 편지 쓰기','사진과 오노추도 함께'],letterDetail:['편지','천천히 읽기'],calendar:['캘린더','날짜별 기록'],songs:['오노추','오늘의 노래 추천'],week:['이번주','함께 하고 싶은 것'],memories:['추억','사진 모아보기'],capsule:['타임캡슐','정해진 날에 열리는 편지'],settings:['설정','앱 관리']};$('screenTitle').textContent=titles[screen][0];$('screenSub').textContent=titles[screen][1];}
document.addEventListener('click',e=>{const t=e.target.closest('[data-screen]'); if(t) show(t.dataset.screen);});
$('loginBtn').onclick=()=>{ if($('password').value===appPassword){$('login').classList.add('hidden');$('app').classList.remove('hidden');init();} else $('loginStatus').textContent='비밀번호가 달라요.' };
$('password').addEventListener('keydown',e=>{if(e.key==='Enter')$('loginBtn').click()});
function setToday(){const d=new Date();$('todayText').textContent=d.toLocaleDateString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit',weekday:'long'});const a=new Date(ANNIVERSARY);const diff=Math.floor((d-a)/86400000)+1;$('ddayText').textContent=`D+${diff}`;}
function apiAction(type){
  const map={
    'letter-add':'addLetter',
    'letter-delete':'deleteLetter',
    'letter-edit':'editLetter',
    'letter-like':'likeLetter',
    'letter-comment':'commentLetter',
    'letter-comment-edit':'editComment',
    'letter-comment-delete':'deleteComment',
    'todo-add':'addTodo',
    'todo-toggle':'toggleTodo',
    'todo-edit':'editTodo',
    'todo-delete':'deleteTodo',
    'song-add':'addSong',
    'memory-add':'addMemory',
    'push-token-save':'savePushToken'
  };
  return map[type] || type;
}
async function api(payload){const body={...payload};if(body.type&&!body.action)body.action=apiAction(body.type);const res=await fetch(API_URL,{method:'POST',mode:'cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(body)});return res.json();}
function firebaseReady(){return window.firebase && firebase.messaging && 'Notification' in window && 'serviceWorker' in navigator;}
async function enablePushNotifications(){
  if(!firebaseReady()){setSettingMessage('이 브라우저에서는 푸시 알림을 지원하지 않아요.\n아이폰에서는 홈 화면에 추가한 앱에서 다시 시도해 주세요.');return;}
  const owner=prompt('이 폰에서 알림 받을 사람을 입력해요.\n예은 또는 준희', localStorage.getItem('pushOwner') || $('writer')?.value || '예은');
  if(owner===null)return;
  const writer=owner.trim();
  if(!writer){setSettingMessage('알림 받을 사람 이름을 입력해주세요.');return;}
  try{
    if(!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    const permission=await Notification.requestPermission();
    if(permission!=='granted'){setSettingMessage('알림 권한이 허용되지 않았어요.\n아이폰 설정 또는 홈 화면 앱에서 알림을 허용해 주세요.');return;}
    const registration=await navigator.serviceWorker.register('sw.js');
    const messaging=firebase.messaging();
    const token=await messaging.getToken({vapidKey:VAPID_PUBLIC_KEY,serviceWorkerRegistration:registration});
    if(!token){setSettingMessage('알림 토큰을 만들 수 없어요. 잠시 후 다시 시도해 주세요.');return;}
    const data=await api({type:'push-token-save',writer,token,userAgent:navigator.userAgent});
    if(!data.ok){setSettingMessage(data.message||'알림 등록에 실패했어요.');return;}
    localStorage.setItem('pushOwner',writer);
    setSettingMessage(`${writer} 폰으로 새 편지 알림을 받을 수 있어요.`);
  }catch(e){
    setSettingMessage('알림 설정 중 오류가 났어요.\n' + (e.message || e));
  }
}
async function loadAll(){try{const res=await fetch(API_URL);const data=await res.json();state.letters=cleanLetters(data.letters);state.songs=data.songs||[];state.todos=data.todos||[];state.memories=data.memories||[];}catch(e){console.log(e)} renderAll();}
function renderAll(){renderLetters();renderCalendar();renderSongs();renderTodos();renderMemories();renderCapsules();renderHomeTodo();}
function renderLetters(filter='all'){const box=$('letterList');let list=[...state.letters].reverse().filter(x=>!x.openDate || new Date(x.openDate)<=new Date());if(filter!=='all')list=list.filter(x=>x.writer===filter);box.innerHTML=list.length?'':'<div class="item"><div class="meta">아직 편지가 없어요.</div></div>';list.forEach(l=>{const rowArg=JSON.stringify(String(l.row));box.insertAdjacentHTML('beforeend',`<div class="item row-card" onclick='openLetter(${rowArg})'><div class="grow"><div class="item-title">${esc(l.title)}${l.pending?' <span class="saving-dot">저장 중</span>':''}</div><div class="meta">${esc(l.writer || '작성자 없음')} · ${fmt(l.date)} ${l.mood?`· ${esc(l.mood)}`:''}</div><div class="likes">💙 ${l.likes||0}　💬 ${(l.comments||[]).length}</div></div>${l.photoUrl?`<img class="thumb" src="${l.photoUrl}">`:''}</div>`)});}
document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-filter]').forEach(x=>x.classList.remove('active'));b.classList.add('active');renderLetters(b.dataset.filter)});
function openLetter(row){
  const l=state.letters.find(x=>x.row==row);
  if(!l)return;
  if(l.openDate && new Date(l.openDate)>new Date()){
    const days=Math.ceil((new Date(l.openDate)-new Date())/86400000);
    $('letterDetailContent').innerHTML=`
      <div class="letter-locked">
        <div class="lock-mark">🔒</div>
        <h2>${esc(l.title)}</h2>
        <p>아직 열 수 없어요.</p>
        <b>D-${days}</b>
      </div>`;
    show('letterDetail');
    return;
  }
  const songUrl = l.songUrl || extractYouTubeUrl(l.content);
  const cleanContent = stripYouTubeLinks(l.content);
  const liked=likedLetterRows().has(String(l.row));
  const rowArg=JSON.stringify(String(l.row));
  $('letterDetailContent').innerHTML=`
    <div class="letter-meta-line">${esc(l.writer || '작성자 없음')} · ${fmt(l.date)} ${l.mood?`· ${esc(l.mood)}`:''}</div>
    <h2>${esc(l.title)}</h2>
    ${l.photoUrl?`<img class="letter-photo" src="${l.photoUrl}">`:''}
    <p class="letter-body">${cleanContent ? esc(cleanContent) : '<span class="meta">내용이 없어요.</span>'}</p>
    ${songCard(songUrl)}
    <div class="letter-actions">
      <button class="secondary" onclick='editLetter(${rowArg})'>수정</button>
      <button class="danger" onclick='deleteLetter(${rowArg})'>삭제</button>
    </div>
    <div class="likes letter-likes"><button class="heart-button ${liked?'liked':''}" onclick='likeLetter(${rowArg})'><span>${liked?'💙':'♡'}</span> 좋아요 ${l.likes||0}</button><span>💬 댓글 ${(l.comments||[]).length}</span></div>
    <div id="comments" class="letter-comments">${(l.comments||[]).map((c,i)=>`<div class="comment-bubble"><div class="comment-head"><b>${esc(c.writer || '작성자')}</b><span>${fmt(c.date)}</span></div><span>${esc(c.text)}</span><div class="comment-actions"><button onclick='editComment(${rowArg},${i})'>수정</button><button class="danger" onclick='deleteComment(${rowArg},${i})'>삭제</button></div></div>`).join('')}</div>
    <div class="inline-form letter-comment-form"><input id="commentText" placeholder="댓글"><button onclick='addComment(${rowArg})'>전송</button></div>`;
  show('letterDetail');
}
async function editLetter(row){
  const l=state.letters.find(x=>x.row==row); if(!l)return;
  const title=prompt('제목을 수정해요.', l.title || '');
  if(title===null)return;
  const content=prompt('내용을 수정해요.', l.content || '');
  if(content===null)return;
  const cleanTitle=title.trim(), cleanContent=content.trim();
  if(!cleanTitle || !cleanContent){alert('제목과 내용은 비워둘 수 없어요.');return;}
  const songUrl = l.songUrl || extractYouTubeUrl(cleanContent);
  const old={title:l.title, content:l.content, songUrl:l.songUrl};
  l.title=cleanTitle; l.content=cleanContent; if(!l.songUrl) l.songUrl=songUrl;
  renderLetters(); openLetter(row);
  const data=await api({type:'letter-edit',row,title:cleanTitle,content:cleanContent,songUrl:l.songUrl||''});
  if(!data.ok){Object.assign(l,old);renderLetters();openLetter(row);alert(data.message||'수정에 실패했어요.');return;}
  loadAll();
}
async function deleteLetter(row){
  if(!confirm('이 편지를 삭제할까요?'))return;
  const before=[...state.letters];
  rememberDeletedLetter(row);
  state.letters=state.letters.filter(x=>x.row!=row);
  renderLetters();
  const data=await api({type:'letter-delete',row});
  if(!data.ok){forgetDeletedLetter(row);state.letters=before;renderLetters();alert(data.message||'삭제에 실패했어요.');return;}
  if(detailDialog.open)detailDialog.close();
  show('letters');
  await loadAll();
}
async function likeLetter(row){
  const l=state.letters.find(x=>x.row==row); if(!l)return;
  const old=Number(l.likes||0);
  l.likes=old+1;
  rememberLikedLetter(row);
  renderLetters(); openLetter(row);
  const data=await api({type:'letter-like',row});
  if(!data.ok){l.likes=old;renderLetters();openLetter(row);alert(data.message||'좋아요 저장에 실패했어요.');return;}
  loadAll();
}
async function addComment(row){
  const input=$('commentText');
  const text=input.value.trim();
  if(!text)return;
  const l=state.letters.find(x=>x.row==row); if(!l)return;
  const temp={writer:$('writer')?.value||'예은',text,date:new Date().toISOString(),pending:true};
  const before=[...(l.comments||[])];
  l.comments=[...before,temp];
  input.value='';
  renderLetters(); openLetter(row);
  const data=await api({type:'letter-comment',row,writer:temp.writer,text});
  if(!data.ok){l.comments=before;renderLetters();openLetter(row);alert(data.message||'댓글 저장에 실패했어요.');return;}
  loadAll();
}
async function editComment(row,index){
  const l=state.letters.find(x=>x.row==row); if(!l || !l.comments || !l.comments[index])return;
  const next=prompt('댓글을 수정해요.', l.comments[index].text || '');
  if(next===null)return;
  const text=next.trim();
  if(!text)return;
  const old=l.comments[index].text;
  l.comments[index].text=text;
  renderLetters(); openLetter(row);
  const data=await api({type:'letter-comment-edit',row,index,text});
  if(!data.ok){l.comments[index].text=old;renderLetters();openLetter(row);alert(data.message||'댓글 수정에 실패했어요.');}
}
async function deleteComment(row,index){
  if(!confirm('이 댓글을 삭제할까요?'))return;
  const l=state.letters.find(x=>x.row==row); if(!l || !l.comments || !l.comments[index])return;
  const before=[...l.comments];
  l.comments=l.comments.filter((_,i)=>i!==index);
  renderLetters(); openLetter(row);
  const data=await api({type:'letter-comment-delete',row,index});
  if(!data.ok){l.comments=before;renderLetters();openLetter(row);alert(data.message||'댓글 삭제에 실패했어요.');}
}
function fileToData(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file)})}
$('pickLetterPhoto').onclick=()=>$('letterPhotoFile').click();$('letterPhotoFile').onchange=async()=>{const f=$('letterPhotoFile').files[0];if(!f)return;state.letterPhoto=await fileToData(f);$('letterPhotoPreview').src=state.letterPhoto;$('letterPhotoPreview').classList.remove('hidden')};
$('moods').onclick=e=>{const b=e.target.closest('button');if(!b)return;state.selectedMood=b.dataset.mood;document.querySelectorAll('.moods button').forEach(x=>x.classList.remove('active'));b.classList.add('active')};
$('isCapsule').onchange=e=>$('capsuleDateWrap').classList.toggle('hidden',!e.target.checked);
$('letterSong').addEventListener('input',()=>{$('letterSongPreview').innerHTML=songCard($('letterSong').value.trim())});
$('saveLetterBtn').onclick=async()=>{const title=$('letterTitle').value.trim(),content=$('letterContent').value.trim();if(!title||!content){$('letterStatus').textContent='제목과 내용을 적어주세요.';return}const typedSong=$('letterSong').value.trim();const songUrl=typedSong||extractYouTubeUrl(content);const payload={type:'letter-add',writer:$('writer').value,mood:state.selectedMood,title,content,photoUrl:state.letterPhoto,songUrl,openDate:$('isCapsule').checked?$('capsuleDate').value:''};const temp={row:'temp_'+Date.now(),date:new Date().toISOString(),writer:payload.writer,mood:payload.mood,title,content,photoUrl:payload.photoUrl,songUrl,openDate:payload.openDate,likes:0,comments:[],pending:true};state.letters.push(temp);$('letterTitle').value='';$('letterContent').value='';$('letterSong').value='';$('letterSongPreview').innerHTML='';state.letterPhoto='';$('letterPhotoPreview').classList.add('hidden');$('letterStatus').textContent='저장 중...';renderLetters();show('letters');const data=await api(payload);if(!data.ok){state.letters=state.letters.filter(x=>x!==temp);renderLetters();show('write');$('letterStatus').textContent=data.message||'저장에 실패했어요.';return;}$('letterStatus').textContent='저장 완료';loadAll();};
function songCard(url){if(!url)return '';const id=(url.match(/(?:v=|youtu\.be\/|shorts\/)([\w-]+)/)||[])[1];const img=id?`https://img.youtube.com/vi/${id}/hqdefault.jpg`:'';return `<div class="song-card">${img?`<img src="${img}">`:''}<div><b>오노추</b><p class="meta">유튜브 링크</p><a href="${esc(url)}" target="_blank">▶ 듣기</a></div></div>`}
$('addSong').onclick=async()=>{const url=$('songLink').value.trim();if(!url)return;await api({type:'song-add',url});$('songLink').value='';await loadAll()};
function renderSongs(){const box=$('songList');box.innerHTML='';[...state.songs].reverse().forEach(s=>box.insertAdjacentHTML('beforeend',songCard(s.url)))}
$('addTodo').onclick=async()=>{
  const text=$('todoText').value.trim();
  if(!text) return;
  const temp={id:'temp_'+Date.now(),date:new Date().toISOString(),text,done:false};
  state.todos.unshift(temp);
  $('todoText').value='';
  renderTodos(); renderHomeTodo();
  const data=await api({type:'todo-add',text});
  if(!data.ok){alert(data.message||'등록에 실패했어요.'); state.todos=state.todos.filter(t=>t.id!==temp.id); renderTodos(); renderHomeTodo(); return;}
  await loadAll();
};
function todoText(t){ return t.text || t.todo || t.content || ''; }
function todoKey(t){ return t.id ? `id:${t.id}` : `row:${t.row}`; }
function findTodo(key){ const [kind,value]=String(key).split(':'); return state.todos.find(t=>kind==='row' ? String(t.row)===value : String(t.id)===value); }
function todoPayload(key){ const [kind,value]=String(key).split(':'); return kind==='row' ? {row:Number(value)} : {id:value}; }
function renderTodos(){
  const box=$('todoList');
  box.innerHTML='';
  if(!state.todos.length){box.innerHTML='<div class="item"><div class="meta">이번주 할 일을 추가해요.</div></div>'; return;}
  state.todos.forEach(t=>{
    const text=todoText(t);
    const key=todoKey(t);
    box.insertAdjacentHTML('beforeend',`
      <div class="item todo-row ${t.done?'done':''}">
        <div class="todo-left" onclick="toggleTodo('${key}')">
          <span class="check">${t.done?'✓':''}</span>
          <b>${esc(text)}</b>
        </div>
        <div class="todo-actions">
          <button type="button" onclick="editTodo('${key}')">수정</button>
          <button type="button" onclick="deleteTodo('${key}')">삭제</button>
        </div>
      </div>`);
  });
}
function renderHomeTodo(){
  const box=$('homeTodo');
  const todos=state.todos.slice(0,4);
  box.innerHTML=todos.map(t=>`<div class="meta">${t.done?'☑':'☐'} ${esc(todoText(t))}</div>`).join('')||'<div class="meta">이번주 할 일을 추가해요.</div>';
}
async function toggleTodo(id){
  const t=findTodo(id); if(!t)return;
  t.done=!t.done; renderTodos(); renderHomeTodo();
  const data=await api({type:'todo-toggle',...todoPayload(id)});
  if(!data.ok){t.done=!t.done; renderTodos(); renderHomeTodo(); alert(data.message||'체크 저장에 실패했어요.');}
}
async function editTodo(id){
  const t=findTodo(id); if(!t)return;
  const next=prompt('할 일을 수정해요.', todoText(t));
  if(next===null) return;
  const text=next.trim();
  if(!text) return;
  const old=todoText(t);
  t.text=text; renderTodos(); renderHomeTodo();
  const data=await api({type:'todo-edit',...todoPayload(id),text});
  if(!data.ok){t.text=old; renderTodos(); renderHomeTodo(); alert(data.message||'수정에 실패했어요.');}
}
async function deleteTodo(id){
  if(!confirm('이 할 일을 삭제할까요?')) return;
  const before=[...state.todos];
  const target=findTodo(id);
  state.todos=state.todos.filter(x=>x!==target); renderTodos(); renderHomeTodo();
  const data=await api({type:'todo-delete',...todoPayload(id)});
  if(!data.ok){state.todos=before; renderTodos(); renderHomeTodo(); alert(data.message||'삭제에 실패했어요.');}
}
$('pickMemory').onclick=()=>$('memoryFile').click();$('memoryFile').onchange=async()=>{const f=$('memoryFile').files[0];if(!f)return;state.memoryPhoto=await fileToData(f);$('memoryPreview').src=state.memoryPhoto;$('memoryPreview').classList.remove('hidden')};
$('saveMemory').onclick=async()=>{if(!state.memoryPhoto)return;await api({type:'memory-add',title:$('memoryTitle').value.trim(),memo:$('memoryMemo').value.trim(),url:state.memoryPhoto});$('memoryTitle').value='';$('memoryMemo').value='';state.memoryPhoto='';$('memoryPreview').classList.add('hidden');await loadAll()};
function renderMemories(){const box=$('memoryList');box.innerHTML='';[...state.memories].reverse().forEach(m=>box.insertAdjacentHTML('beforeend',`<div class="memory-card"><img src="${m.url}"><div><b>${esc(m.title||'추억')}</b><p class="meta">${fmt(m.date)}</p></div></div>`))}
function renderCapsules(){const box=$('capsuleList');const list=state.letters.filter(x=>x.openDate);box.innerHTML=list.length?'':'<div class="item"><div class="meta">아직 타임캡슐이 없어요.</div></div>';list.reverse().forEach(c=>{const open=new Date(c.openDate)<=new Date();const days=Math.ceil((new Date(c.openDate)-new Date())/86400000);const rowArg=JSON.stringify(String(c.row));box.insertAdjacentHTML('beforeend',`<div class="item" onclick='openLetter(${rowArg})'><div class="item-title">${open?'🔓':'🔒'} ${esc(c.title)}</div><div class="meta">${c.openDate} ${open?'열렸어요':`D-${days}`}</div></div>`)})}
function renderCalendar(){const d=new Date(state.month.getFullYear(),state.month.getMonth(),1);$('monthLabel').textContent=`${d.getFullYear()}년 ${d.getMonth()+1}월`;const start=d.getDay();const last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();let html='';for(let i=0;i<start;i++)html+='<button class="day dim"></button>';const today=dateKey(new Date());for(let n=1;n<=last;n++){const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(n).padStart(2,'0')}`;const marks=[];if(state.letters.some(x=>dateKey(x.date)===key))marks.push('✉');if(state.memories.some(x=>dateKey(x.date)===key))marks.push('▧');if(state.songs.some(x=>dateKey(x.date)===key))marks.push('♫');if(state.letters.some(x=>x.openDate===key))marks.push('🔒');html+=`<button class="day ${key===today?'today':''}" onclick="showDay('${key}')"><div>${n}</div><div class="marks">${marks.join('')}</div></button>`}$('calendarGrid').innerHTML=html;}
$('prevMonth').onclick=()=>{state.month=new Date(state.month.getFullYear(),state.month.getMonth()-1,1);renderCalendar()};$('nextMonth').onclick=()=>{state.month=new Date(state.month.getFullYear(),state.month.getMonth()+1,1);renderCalendar()};
function showDay(key){const l=state.letters.filter(x=>dateKey(x.date)===key).length,m=state.memories.filter(x=>dateKey(x.date)===key).length,s=state.songs.filter(x=>dateKey(x.date)===key).length,c=state.letters.filter(x=>x.openDate===key).length;$('dayDetail').innerHTML=`<b>${key}</b><br><br>✉ 편지 ${l}개<br>▧ 추억 ${m}개<br>♫ 오노추 ${s}개<br>🔒 타임캡슐 ${c}개`}

function setSettingMessage(message){
  detailContent.innerHTML=`<h3>설정</h3><p style="white-space:pre-wrap;line-height:1.7">${esc(message)}</p>`;
  detailDialog.showModal();
}
function downloadBackup(){
  const data={letters:state.letters,songs:state.songs,todos:state.todos,memories:state.memories,createdAt:new Date().toISOString()};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download='exchange-diary-backup.json'; a.click();
  URL.revokeObjectURL(url);
}
function bindSettings(){
  const change=$('changePasswordBtn'); if(change) change.onclick=()=>{
    const next=prompt('새 비밀번호를 입력해요.', appPassword);
    if(next===null) return;
    const pw=next.trim();
    if(!pw){alert('비밀번호는 비워둘 수 없어요.'); return;}
    appPassword=pw; localStorage.setItem('exchangeDiaryPassword', pw);
    setSettingMessage('비밀번호가 변경됐어요.\n이 기기에서만 적용돼요.');
  };
  const noti=$('notificationBtn'); if(noti) noti.onclick=enablePushNotifications;
  const refresh=$('refreshDataBtn'); if(refresh) refresh.onclick=async()=>{await loadAll(); setSettingMessage('데이터를 새로고침했어요.');};
  const backup=$('backupDataBtn'); if(backup) backup.onclick=downloadBackup;
  const info=$('appInfoBtn'); if(info) info.onclick=()=>setSettingMessage('교환일기 v3.2\n검은 ★ 패턴 / iMessage 블루 / PWA 버전\n데이터는 Google Sheets와 Apps Script에 저장돼요.');
  const logout=$('logoutBtn'); if(logout) logout.onclick=()=>{ $('app').classList.add('hidden'); $('login').classList.remove('hidden'); $('password').value=''; };
}

function init(){setToday();bindSettings();loadAll();if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});} 
