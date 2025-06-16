const boardSize = 19;
const cellSize = 30;
const padding = cellSize;
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
canvas.width = canvas.height = padding * 2 + cellSize * (boardSize - 1);
let current = 'black';
const snakes = {black: [], white: []};
const occupied = {};
const messageEl = document.getElementById('message');
const cutHeadBtn = document.getElementById('cutHead');
const cutTailBtn = document.getElementById('cutTail');
const moveCount = {black:0, white:0};
const diagonalChance = {black:false, white:false};
let availableMoves = [];

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
    const ends = [mySnake[0], mySnake[mySnake.length-1]];
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
    const valid = adjacent(x,y,head) || adjacent(x,y,tail) ||
                  (diagonalChance[current] && (diagonal(x,y,head) || diagonal(x,y,tail)));
    if(!valid) return;
    if(diagonalChance[current] && diagonal(x,y,head)){
      mySnake.unshift({x,y});
      diagUsed=true;
    }else if(diagonalChance[current] && diagonal(x,y,tail)){
      mySnake.push({x,y});
      diagUsed=true;
    }else if(adjacent(x,y,head)){
      mySnake.unshift({x,y});
    }else{
      mySnake.push({x,y});
    }
    occupied[key]=current;
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
  if(mySnake.length>=2 && blockedForward(mySnake,0)){
    cutHeadBtn.classList.remove('hidden');
  }else{
    cutHeadBtn.classList.add('hidden');
  }
  if(mySnake.length>=2 && blockedForward(mySnake,mySnake.length-1)){
    cutTailBtn.classList.remove('hidden');
  }else{
    cutTailBtn.classList.add('hidden');
  }
}

cutHeadBtn.onclick=()=>{ cutEnd(true); };
cutTailBtn.onclick=()=>{ cutEnd(false); };

function cutEnd(head){
  const mySnake=snakes[current];
  if(mySnake.length===0) return;
  let removed;
  if(head){
    removed=mySnake.shift();
  }else{
    removed=mySnake.pop();
  }
  delete occupied[posKey(removed.x,removed.y)];
  drawBoard();
  updateCutButtons();
}

function switchPlayer(){
  if(checkWin()) return;
  current = current==='black'?'white':'black';
  messageEl.textContent = (current==='black'?'黑':'白')+"方行动"+
    (diagonalChance[current]?"（可斜走）":"");
  updateCutButtons();
}



function checkWin(){
  const opp=current==='black'?'white':'black';
  const s=snakes[opp];
  if(s.length<2) return false;
  const headBlocked=blockedForward(s,0);
  const tailBlocked=blockedForward(s,s.length-1);
  if(headBlocked && tailBlocked){
    messageEl.textContent=(current==='black'?'黑':'白')+"方获胜！";
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
  messageEl.textContent = '黑方行动' + (diagonalChance.black ? '（可斜走）' : '');
  updateCutButtons();
};

function showDemo(){
  const demoCanvas = document.getElementById('demoBoard');
  const dctx = demoCanvas.getContext('2d');
  const demoSize = 5;
  const demoCell = 30;
  const dpad = demoCell;
  demoCanvas.width = demoCanvas.height = dpad*2 + demoCell*(demoSize-1);
  const moves = [
    {x:2,y:2,color:'black'},
    {x:3,y:2,color:'white'},
    {x:1,y:2,color:'black'},
    {x:4,y:2,color:'white'},
    {remove:{x:1,y:2}},
    {x:1,y:3,color:'black'}
  ];
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
    if(idx>=moves.length) return;
    const m=moves[idx++];
    if(m.remove){
      const i=placed.findIndex(p=>p.x===m.remove.x&&p.y===m.remove.y);
      if(i>=0) placed.splice(i,1);
    }else{
      placed.push(m);
    }
    draw();
    if(idx<moves.length) setTimeout(step,800);
  }
  draw();
  setTimeout(step,500);
}

document.addEventListener('DOMContentLoaded', showDemo);
