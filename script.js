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

function drawBoard(){
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
  if(mySnake.length===0){
    if(!isStar(x,y)) return;
    place(x,y);
  }else{
    const head = mySnake[0];
    const tail = mySnake[mySnake.length-1];
    if(adjacent(x,y,head) || adjacent(x,y,tail)){
      if(adjacent(x,y,head)){
        mySnake.unshift({x,y});
      }else{
        mySnake.push({x,y});
      }
      occupied[key] = current;
      drawBoard();
      switchPlayer();
      return;
    }else{
      return;
    }
  }
  drawBoard();
  switchPlayer();
});

function isStar(x,y){
  const starCoords = [3,9,15];
  return starCoords.includes(x) && starCoords.includes(y);
}

function adjacent(x,y,p){
  return Math.abs(x-p.x)+Math.abs(y-p.y)===1;
}

function place(x,y){
  snakes[current].push({x,y});
  occupied[posKey(x,y)] = current;
}

function switchPlayer(){
  if(checkWin()) return;
  current = current==='black'?'white':'black';
  messageEl.textContent = (current==='black'?'黑':'白')+"方行动";
}

function neighborsFree(pt){
  const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
  return dirs.some(d=>{
    const nx=pt.x+d[0], ny=pt.y+d[1];
    if(nx<0||ny<0||nx>=boardSize||ny>=boardSize) return false;
    return !occupied[posKey(nx,ny)];
  });
}

function checkWin(){
  const opp = current==='black'?'white':'black';
  const s = snakes[opp];
  if(s.length===0) return false;
  const headFree = neighborsFree(s[0]);
  const tailFree = neighborsFree(s[s.length-1]);
  if(!headFree && !tailFree){
    messageEl.textContent = (current==='black'?'黑':'白')+"方获胜！";
    canvas.removeEventListener('click',arguments.callee);
    return true;
  }
  return false;
}

document.getElementById('restart').onclick = ()=>location.reload();

document.getElementById('startGame').onclick = ()=>{
  document.getElementById('instructions').classList.add('hidden');
  drawBoard();
  messageEl.textContent = '黑方行动';
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
