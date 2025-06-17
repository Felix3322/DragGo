// Copyright 2025 Felix Liu
// Released under the GPLv3
const boardSize = 19;
const langSelect = document.getElementById('langSelect');
let lang = localStorage.getItem('lang') || langSelect.value;
langSelect.value = lang;

const texts = {
  en: {
    title: 'Snake Blocking Game',
    restart: 'Restart',
    cutHead: 'Cut Head',
    cutTail: 'Cut Tail',
    start: 'Start',
    hint: 'Valid moves for the current player are highlighted with green dots.',
    rules: `<ol>
      <li>Each player starts from any <strong>star point</strong>.</li>
      <li>On your turn, place one stone next to either head or tail of your snake.</li>
      <li>After every five moves, you may move diagonally once on your next turn; if unused that turn, the chance is lost.</li>
      <li>An end is <em>blocked</em> when the intersection directly forward is off the board or occupied.</li>
      <li>The head cannot be extended when blocked unless you cut it off. Cutting is shared with tail and can be used only once per game.</li>
      <li>The tail may optionally be cut from the middle when blocked, removing the blocked half.</li>
      <li>A red box marks each player's last stone.</li>
      <li>If both ends are blocked, that player loses.</li>
    </ol>`,
    onlineTitle: 'Online Mode',
    login: 'Login',
    close: 'Close',
    onlineBtn: 'Online',
    username: 'Username',
    password: 'Password',
    networkError: 'Network error',
    black: 'Black',
    white: 'White',
    move: ' to move',
    diag: ' (diagonal available)',
    wins: ' wins!',
    length: 'Length',
    moves: 'Moves',
    diagAvail: 'Diagonal'
  },
  zh: {
    title: '蛇堵棋',
    restart: '重新开始',
    cutHead: '截断头部',
    cutTail: '截断尾部',
    start: '开始',
    hint: '当前可下位置以绿色点标示。',
    rules: `<ol>
      <li>双方从任意<strong>星位</strong>开始。</li>
      <li>每回合在自己蛇的头或尾相邻处落子。</li>
      <li>每下五子后，下一回合可斜走一步，若不使用则失效。</li>
      <li>若某端继续前进遇到棋盘外或棋子，则视为被堵。</li>
      <li>蛇头被堵后除非截断，否则不能再从该端下子；全局只允许一次截断，头尾共用。</li>
      <li>蛇尾被堵时可选择从中间截去被堵的一半。</li>
      <li>红框标记双方最后落子的位置。</li>
      <li>若一条蛇两端皆被堵，则其对手获胜。</li>
    </ol>`,
    onlineTitle: '联机模式',
    login: '登录',
    close: '关闭',
    onlineBtn: '联机模式',
    username: '用户名',
    password: '密码',
    networkError: '网络错误',
    black: '黑',
    white: '白',
    move: '方行动',
    diag: '（可斜走）',
    wins: '方获胜！',
    length: '长度',
    moves: '计数',
    diagAvail: '斜走'
  }
};

function t(key){
  return texts[lang][key];
}

function applyLang(){
  document.documentElement.lang = lang;
  document.getElementById('title').textContent = t('title');
  document.title = t('title');
  document.getElementById('restart').textContent = t('restart');
  cutHeadBtn.textContent = t('cutHead');
  cutTailBtn.textContent = t('cutTail');
  document.getElementById('startGame').textContent = t('start');
  document.getElementById('hint').textContent = t('hint');
  document.getElementById('rules').innerHTML = t('rules');
  document.getElementById('onlineTitle').textContent = t('onlineTitle');
  document.getElementById('loginBtn').textContent = t('login');
  document.getElementById('closeOnline').textContent = t('close');
  document.getElementById('onlineBtn').textContent = t('onlineBtn');
  document.getElementById('username').placeholder = t('username');
  document.getElementById('password').placeholder = t('password');
  if(messageEl.textContent)
    switchPlayer(true); // refresh current turn text
  updateStats();
}

langSelect.onchange = ()=>{
  lang = langSelect.value;
  localStorage.setItem('lang', lang);
  applyLang();
};
const cellSize = 30;
const padding = cellSize;
const canvas = document.getElementById('board');
const ctx = setupCanvas(canvas, padding * 2 + cellSize * (boardSize - 1), padding * 2 + cellSize * (boardSize - 1));
let current = 'black';
const snakes = {black: [], white: []};
const occupied = {};
const messageEl = document.getElementById('message');
const cutHeadBtn = document.getElementById('cutHead');
const cutTailBtn = document.getElementById('cutTail');
const statsBlack = document.getElementById('statsBlack');
const statsWhite = document.getElementById('statsWhite');
const moveCount = {black:0, white:0};
const diagonalChance = {black:false, white:false};
const lastMove = {black:null, white:null};
let cutAvailable = true;
let availableMoves = [];

function setupCanvas(c,w,h){
  const dpr = window.devicePixelRatio || 1;
  c.style.width = w+'px';
  c.style.height = h+'px';
  c.width = w*dpr;
  c.height = h*dpr;
  const context = c.getContext('2d');
  context.scale(dpr,dpr);
  return context;
}

function updateStats(){
  statsBlack.innerHTML = `${t('black')}:<br>${t('length')}: ${snakes.black.length}`+
    `<br>${t('moves')}: ${moveCount.black}<br>${t('diagAvail')}: `+
    `${diagonalChance.black ? '✓' : '✗'}`;
  statsWhite.innerHTML = `${t('white')}:<br>${t('length')}: ${snakes.white.length}`+
    `<br>${t('moves')}: ${moveCount.white}<br>${t('diagAvail')}: `+
    `${diagonalChance.white ? '✓' : '✗'}`;
}

function updateAvailableMoves(){
  availableMoves = [];
  const mySnake = snakes[current];
  if(mySnake.length === 0){
    const stars = [3,9,15];
    stars.forEach(x=>{
      stars.forEach(y=>{
        if(!occupied[posKey(x,y)]) availableMoves.push({x,y});
      });
    });
  }else{
    const dirs = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
    if(diagonalChance[current]){
      dirs.push({x:1,y:1},{x:1,y:-1},{x:-1,y:1},{x:-1,y:-1});
    }
    const ends = [];
    const headBlocked = blockedForward(mySnake,0);
    const tailBlocked = blockedForward(mySnake,mySnake.length-1);
    if(!headBlocked) ends.push(mySnake[0]);
    if(!tailBlocked) ends.push(mySnake[mySnake.length-1]);
    ends.forEach(end=>{
      dirs.forEach(d=>{
        const nx=end.x+d.x;
        const ny=end.y+d.y;
        const key=posKey(nx,ny);
        if(nx>=0 && nx<boardSize && ny>=0 && ny<boardSize && !occupied[key]){
          if(!availableMoves.some(p=>p.x===nx && p.y===ny))
            availableMoves.push({x:nx,y:ny});
        }
      });
    });
  }
}

function drawBoard(){
  updateAvailableMoves();
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.strokeStyle = '#333';
  for(let i=0;i<boardSize;i++){
    const pos = padding + i*cellSize;
    ctx.beginPath();
    ctx.moveTo(padding,pos); ctx.lineTo(canvas.width-padding,pos); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pos,padding); ctx.lineTo(pos,canvas.height-padding); ctx.stroke();
  }
  const stars = [3,9,15];
  stars.forEach(x=>{
    stars.forEach(y=>{
      ctx.beginPath();
      ctx.arc(padding+x*cellSize,padding+y*cellSize,4,0,Math.PI*2);
      ctx.fill();
    });
  });
  Object.entries(snakes).forEach(([color,list])=>{
    list.forEach(pt=>drawStone(pt.x,pt.y,color));
  });
  ctx.strokeStyle='red';
  ctx.lineWidth=2;
  Object.entries(lastMove).forEach(([color,pt])=>{
    if(pt){
      ctx.strokeRect(padding+pt.x*cellSize-15,padding+pt.y*cellSize-15,30,30);
    }
  });
  ctx.fillStyle='rgba(0,255,0,0.4)';
  availableMoves.forEach(p=>{
    ctx.beginPath();
    ctx.arc(padding+p.x*cellSize,padding+p.y*cellSize,6,0,Math.PI*2);
    ctx.fill();
  });
  updateStats();
}

function drawStone(x,y,color){
  ctx.beginPath();
  ctx.fillStyle = color==='black'?'#000':'#fff';
  ctx.strokeStyle = '#000';
  ctx.arc(padding+x*cellSize,padding+y*cellSize,12,0,Math.PI*2);
  ctx.fill();
  ctx.stroke();
}

function posKey(x,y){ return x+','+y; }

canvas.addEventListener('click', e=>{
  const rect = canvas.getBoundingClientRect();
  const x = Math.round((e.clientX - rect.left - padding)/cellSize);
  const y = Math.round((e.clientY - rect.top - padding)/cellSize);
  if(x<0||x>=boardSize||y<0||y>=boardSize) return;
  const key = posKey(x,y);
  if(occupied[key]) return;
  const mySnake = snakes[current];
  let diagUsed=false;
  if(mySnake.length===0){
    if(!isStar(x,y)) return;
    place(x,y);
  }else{
    const head = mySnake[0];
    const tail = mySnake[mySnake.length-1];
    const headBlocked = blockedForward(mySnake,0);
    const tailBlocked = blockedForward(mySnake,mySnake.length-1);
    const valid = ((!headBlocked && adjacent(x,y,head)) || (!tailBlocked && adjacent(x,y,tail))) ||
                  (diagonalChance[current] && ((!headBlocked && diagonal(x,y,head)) || (!tailBlocked && diagonal(x,y,tail))));
    if(!valid) return;
    if(diagonalChance[current] && !headBlocked && diagonal(x,y,head)){
      mySnake.unshift({x,y});
      diagUsed=true;
    }else if(diagonalChance[current] && !tailBlocked && diagonal(x,y,tail)){
      mySnake.push({x,y});
      diagUsed=true;
    }else if(!headBlocked && adjacent(x,y,head)){
      mySnake.unshift({x,y});
    }else{
      mySnake.push({x,y});
    }
    occupied[key]=current;
    lastMove[current] = {x,y};
  }
  finishMove(diagUsed);
  switchPlayer();
  drawBoard();
});

function isStar(x,y){
  const starCoords = [3,9,15];
  return starCoords.includes(x) && starCoords.includes(y);
}

function adjacent(x,y,p){
  return Math.abs(x-p.x)+Math.abs(y-p.y)===1;
}

function diagonal(x,y,p){
  return Math.abs(x-p.x)===1 && Math.abs(y-p.y)===1;
}

function place(x,y){
  snakes[current].push({x,y});
  occupied[posKey(x,y)] = current;
  lastMove[current] = {x,y};
}

function finishMove(diagonalUsed){
  if(diagonalChance[current]){
    if(diagonalUsed){
      moveCount[current]=0;
    }else{
      moveCount[current]=1;
    }
    diagonalChance[current]=false;
  }else{
    moveCount[current]++;
    if(moveCount[current]>=5){
      diagonalChance[current]=true;
      moveCount[current]=0;
    }
  }
}

function forwardDir(snake,index){
  if(snake.length<2) return null;
  if(index===0){
    const next=snake[1];
    const cur=snake[0];
    return {x:cur.x-next.x,y:cur.y-next.y};
  }else{
    const prev=snake[snake.length-2];
    const cur=snake[snake.length-1];
    return {x:cur.x-prev.x,y:cur.y-prev.y};
  }
}

function blockedForward(snake,index){
  if(snake.length<2) return false;
  const dir=forwardDir(snake,index);
  if(!dir) return false;
  const end=snake[index];
  const nx=end.x+dir.x;
  const ny=end.y+dir.y;
  if(nx<0||ny<0||nx>=boardSize||ny>=boardSize) return true;
  return occupied[posKey(nx,ny)];
}

function updateCutButtons(){
  const mySnake=snakes[current];
  if(mySnake.length>=2 && blockedForward(mySnake,0) && cutAvailable){
    cutHeadBtn.classList.remove('hidden');
  }else{
    cutHeadBtn.classList.add('hidden');
  }
  if(mySnake.length>=2 && blockedForward(mySnake,mySnake.length-1) && cutAvailable){
    cutTailBtn.classList.remove('hidden');
  }else{
    cutTailBtn.classList.add('hidden');
  }
}

cutHeadBtn.onclick=()=>{ cutEnd(true); };
cutTailBtn.onclick=()=>{ cutEnd(false); };

function cutEnd(head){
  if(!cutAvailable) return;
  const mySnake=snakes[current];
  if(mySnake.length===0) return;
  if(head){
    const removed=mySnake.shift();
    delete occupied[posKey(removed.x,removed.y)];
  }else{
    const cutIndex=Math.floor(mySnake.length/2);
    for(let i=mySnake.length-1;i>=cutIndex;i--){
      const p=mySnake.pop();
      delete occupied[posKey(p.x,p.y)];
    }
  }
  cutAvailable=false;
  drawBoard();
  updateCutButtons();
}

function switchPlayer(refreshOnly=false){
  if(!refreshOnly && checkWin()) return;
  if(!refreshOnly) current = current==='black'?'white':'black';
  messageEl.textContent = t(current) + t('move') +
    (diagonalChance[current]?t('diag'):'');
  updateCutButtons();
}



function checkWin(){
  const opp=current==='black'?'white':'black';
  const s=snakes[opp];
  if(s.length<2) return false;
  const headBlocked=blockedForward(s,0);
  const tailBlocked=blockedForward(s,s.length-1);
  if(headBlocked && tailBlocked){
    messageEl.textContent=t(current)+t('wins');
    canvas.removeEventListener('click',arguments.callee);
    cutHeadBtn.classList.add('hidden');
    cutTailBtn.classList.add('hidden');
    return true;
  }
  return false;
}

document.getElementById('restart').onclick = ()=>location.reload();

document.getElementById('startGame').onclick = ()=>{
  document.getElementById('instructions').classList.add('hidden');
  drawBoard();
  messageEl.textContent = t('black') + t('move') + (diagonalChance.black ? t('diag') : '');
  updateCutButtons();
};

function runDemo(moves, done){
  const demoCanvas = document.getElementById('demoBoard');
  const demoSize = 5;
  const demoCell = 30;
  const dpad = demoCell;
  const dSize = dpad*2 + demoCell*(demoSize-1);
  const dctx = setupCanvas(demoCanvas, dSize, dSize);
  const placed=[];
  function draw(){
    dctx.clearRect(0,0,demoCanvas.width,demoCanvas.height);
    dctx.strokeStyle='#333';
    for(let i=0;i<demoSize;i++){
      const pos=dpad+i*demoCell;
      dctx.beginPath();
      dctx.moveTo(dpad,pos); dctx.lineTo(demoCanvas.width-dpad,pos); dctx.stroke();
      dctx.beginPath();
      dctx.moveTo(pos,dpad); dctx.lineTo(pos,demoCanvas.height-dpad); dctx.stroke();
    }
    dctx.beginPath();
    dctx.arc(dpad+2*demoCell,dpad+2*demoCell,4,0,Math.PI*2);
    dctx.fill();
    placed.forEach(p=>{
      dctx.beginPath();
      dctx.fillStyle=p.color==='black'?'#000':'#fff';
      dctx.strokeStyle='#000';
      dctx.arc(dpad+p.x*demoCell,dpad+p.y*demoCell,12,0,Math.PI*2);
      dctx.fill();
      dctx.stroke();
    });
  }
  let idx=0;
  function step(){
    if(idx>=moves.length){
      if(done) setTimeout(done,1000);
      return;
    }
    const m=moves[idx++];
    if(m.remove){
      const i=placed.findIndex(p=>p.x===m.remove.x&&p.y===m.remove.y);
      if(i>=0) placed.splice(i,1);
    }else if(m.cutHead){
      placed.shift();
    }else{
      placed.push(m);
    }
    draw();
    setTimeout(step,800);
  }
  draw();
  setTimeout(step,500);
}

function cycleDemos(){
  const seqs=[
    [
      {x:2,y:2,color:'black'},
      {x:3,y:2,color:'white'},
      {x:1,y:2,color:'black'},
      {x:4,y:2,color:'white'},
      {remove:{x:1,y:2}},
      {x:1,y:3,color:'black'}
    ],
    [
      {x:1,y:2,color:'black'},
      {x:2,y:2,color:'black'},
      {x:3,y:2,color:'black'},
      {x:4,y:2,color:'white'},
      {cutHead:true},
      {x:0,y:2,color:'black'}
    ]
  ];
  let i=0;
  const next=()=>{
    runDemo(seqs[i],()=>{ i=(i+1)%seqs.length; next(); });
  };
  next();
}

document.addEventListener('DOMContentLoaded', ()=>{applyLang(); cycleDemos();});
document.getElementById('onlineBtn').onclick = ()=>{
  document.getElementById('online').classList.remove('hidden');
};
document.getElementById('closeOnline').onclick = ()=>{
  document.getElementById('online').classList.add('hidden');
};
document.getElementById('loginBtn').onclick = async ()=>{
  const username=document.getElementById('username').value;
  const password=document.getElementById('password').value;
  try{
    await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});
    const res=await fetch('/api/leaderboard');
    const board=await res.json();
    const list=board.map(item=>`${item.user} ${item.elo}`).join('<br>');
    document.getElementById('leaderboard').innerHTML=list;
  }catch(e){
    document.getElementById('leaderboard').textContent=t('networkError');
  }
};