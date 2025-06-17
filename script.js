const boardSize = 19;
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
const moveCount = {black:0, white:0};
const diagonalChance = {black:false, white:false};
const lastMove = {black:null, white:null};
let cutAvailable = true;
let availableMoves = [];

let currentLang = 'zh';
const langStrings = {
  en: {
    restart: 'Restart',
    cutHead: 'Cut Head',
    cutTail: 'Cut Tail',
    start: 'Start',
    onlineBtn: 'Online',
    close: 'Close',
    login: 'Login',
    username: 'Username',
    password: 'Password',
    onlineTitle: 'Online Mode',
    instructions: `
      <h1>Snake Blocking Game</h1>
      <p>Goal: block both ends of your opponent's snake.</p>
      <ol>
        <li>Each player starts from any <strong>star point</strong>.</li>
        <li>Place one stone adjacent to your snake's head or tail on each turn.</li>
        <li>An end is <em>blocked</em> if the grid directly ahead is off the board or occupied.</li>
        <li>If your head is blocked you may cut it off once per game. Otherwise that side cannot extend.</li>
        <li>If your tail is blocked you may cut from the middle to remove the blocked half. This shares the same single use.</li>
        <li>After every five moves you may move diagonally once on your next turn. Unused, it is lost.</li>
        <li>When both ends are blocked the opponent wins.</li>
        <li>The last stone of each player is marked with a red box.</li>
      </ol>
      <p>Valid moves are highlighted with green dots.</p>`
  },
  zh: {
    restart: '重新开始',
    cutHead: '截断头部',
    cutTail: '截断尾部',
    start: '开始',
    onlineBtn: '联机模式',
    close: '关闭',
    login: '登录',
    username: '用户名',
    password: '密码',
    onlineTitle: '联机模式',
    instructions: `
      <h1>蛇堵棋</h1>
      <p>目标：堵死对手蛇的两端。</p>
      <ol>
        <li>双方可从任意星位开始。</li>
        <li>轮到你时，只能在自己蛇头或蛇尾相邻的格子落子。</li>
        <li>若沿蛇头或尾前进一格越界或遭遇棋子，则该端被堵住。</li>
        <li>蛇头被堵时可以选择截断，整局仅能执行一次；不截断则该侧不可继续下子。</li>
        <li>蛇尾被堵时可从中部截断并删除被堵的一半，此机会与截断蛇头共用一次。</li>
        <li>每下五子后，下一回合可斜走一步，若不使用则失效。</li>
        <li>若一方蛇的两端均被堵死，则判负。</li>
        <li>双方最后落子的格子会以红框标记。</li>
      </ol>
      <p>当前可下位置以绿色点标示。</p>`
  }
};

function applyLanguage(){
  const t = langStrings[currentLang];
  document.getElementById('restart').textContent = t.restart;
  document.getElementById('cutHead').textContent = t.cutHead;
  document.getElementById('cutTail').textContent = t.cutTail;
  document.getElementById('startGame').textContent = t.start;
  document.getElementById('onlineBtn').textContent = t.onlineBtn;
  document.getElementById('closeOnline').textContent = t.close;
  document.getElementById('loginBtn').textContent = t.login;
  document.getElementById('username').placeholder = t.username;
  document.getElementById('password').placeholder = t.password;
  document.querySelector('#online h2').textContent = t.onlineTitle;
  document.getElementById('instructionsText').innerHTML = t.instructions;
  document.getElementById('langToggle').textContent = currentLang==='zh'? 'English' : '中文';
}

function setTurnMessage(){
  if(currentLang==='zh'){
    messageEl.textContent=(current==='black'?'黑':'白')+'方行动'+(diagonalChance[current]?'（可斜走）':'');
  }else{
    messageEl.textContent=(current==='black'?'Black':'White')+' to play'+(diagonalChance[current]?' (diagonal available)':'');
  }
}

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

function switchPlayer(){
  if(checkWin()) return;
  current = current==='black'?'white':'black';
  setTurnMessage();
  updateCutButtons();
}



function checkWin(){
  const opp=current==='black'?'white':'black';
  const s=snakes[opp];
  if(s.length<2) return false;
  const headBlocked=blockedForward(s,0);
  const tailBlocked=blockedForward(s,s.length-1);
  if(headBlocked && tailBlocked){
    if(currentLang==='zh'){
      messageEl.textContent=(current==='black'?'黑':'白')+'方获胜！';
    }else{
      messageEl.textContent=(current==='black'?'Black':'White')+' wins!';
    }
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
  setTurnMessage();
  updateCutButtons();
};

function loopDemo(canvasId,moves){
  const demoCanvas=document.getElementById(canvasId);
  const size=5;
  const cell=30;
  const pad=cell;
  const boardSizePx=pad*2+cell*(size-1);
  const ctx=setupCanvas(demoCanvas,boardSizePx,boardSizePx);
  let placed=[];
  function draw(){
    ctx.clearRect(0,0,demoCanvas.width,demoCanvas.height);
    ctx.strokeStyle='#333';
    for(let i=0;i<size;i++){
      const pos=pad+i*cell;
      ctx.beginPath();
      ctx.moveTo(pad,pos); ctx.lineTo(demoCanvas.width-pad,pos); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pos,pad); ctx.lineTo(pos,demoCanvas.height-pad); ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(pad+2*cell,pad+2*cell,4,0,Math.PI*2);
    ctx.fill();
    placed.forEach(p=>{
      ctx.beginPath();
      ctx.fillStyle=p.color==='black'?'#000':'#fff';
      ctx.strokeStyle='#000';
      ctx.arc(pad+p.x*cell,pad+p.y*cell,12,0,Math.PI*2);
      ctx.fill();
      ctx.stroke();
    });
  }
  let idx=0;
  function step(){
    const m=moves[idx++];
    if(m.remove){
      placed=placed.filter(pt=>!(pt.x===m.remove.x&&pt.y===m.remove.y));
    }else{
      placed.push(m);
    }
    draw();
    if(idx>=moves.length){
      setTimeout(()=>{placed=[]; idx=0; draw(); setTimeout(step,800);},1000);
    }else{
      setTimeout(step,800);
    }
  }
  draw();
  setTimeout(step,500);
}

document.addEventListener('DOMContentLoaded', ()=>{
  applyLanguage();
  loopDemo('demoCut', [
    {x:2,y:2,color:'black'},
    {x:3,y:2,color:'white'},
    {x:1,y:2,color:'black'},
    {x:4,y:2,color:'white'},
    {remove:{x:1,y:2}},
    {x:1,y:3,color:'black'}
  ]);
  loopDemo('demoDiag', [
    {x:1,y:1,color:'black'},
    {x:3,y:1,color:'white'},
    {x:1,y:2,color:'black'},
    {x:3,y:2,color:'white'},
    {x:1,y:3,color:'black'},
    {x:2,y:4,color:'black'}
  ]);
});
document.getElementById('langToggle').onclick = ()=>{
  currentLang = currentLang==='zh'?'en':'zh';
  applyLanguage();
  if(messageEl.textContent) setTurnMessage();
};
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
    document.getElementById('leaderboard').textContent='Network error';
  }
};
