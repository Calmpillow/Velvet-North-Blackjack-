const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const crypto = require("crypto");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;
const STARTING_CHIPS = 250000;
const MAX_PLAYERS = 12;
const rooms = new Map();
const suits = ["♠", "♥", "♦", "♣"];
const ranks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];

function newDeck() {
  const d = [];
  for (let n=0; n<6; n++) for (const suit of suits) for (const rank of ranks)
    d.push({suit, rank, red: suit==="♥" || suit==="♦"});
  for (let i=d.length-1; i>0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [d[i],d[j]]=[d[j],d[i]];
  }
  return d;
}
function value(hand) {
  let total=0, aces=0;
  for (const c of hand) {
    if (c.rank==="A") { total+=11; aces++; }
    else total += ["K","Q","J"].includes(c.rank) ? 10 : Number(c.rank);
  }
  while (total>21 && aces) { total-=10; aces--; }
  return total;
}
function safeChips(n) { return Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(n))); }
function publicRoom(room) {
  return {
    code: room.code, phase: room.phase, round: room.round,
    players: room.players.map(p => ({
      id:p.id, name:p.name, chips:p.chips, bet:p.bet,
      hand:p.hand, total:p.hand.length ? value(p.hand) : 0,
      status:p.status, connected:p.connected
    })),
    dealer: room.phase==="settled" || room.phase==="betting"
      ? {hand:room.dealer, total: room.dealer.length ? value(room.dealer) : 0}
      : {hand:room.dealer.slice(0,1), total: room.dealer.length ? value(room.dealer.slice(0,1)) : 0, hidden:true},
    message: room.message
  };
}
function emitRoom(room) { io.to(room.code).emit("state", publicRoom(room)); }
function getPlayer(socket, room) { return room.players.find(p=>p.id===socket.id); }
function roomFor(socket) {
  const code = socket.data.room;
  return code ? rooms.get(code) : null;
}
function settle(room) {
  while (value(room.dealer)<17) room.dealer.push(room.deck.pop());
  const dealerTotal=value(room.dealer);
  for (const p of room.players) {
    if (!p.bet || p.status==="left") continue;
    const total=value(p.hand);
    if (total>21) p.status="bust";
    else if (dealerTotal>21 || total>dealerTotal) {
      p.chips=safeChips(p.chips + (p.natural ? Math.floor(p.bet*2.5) : p.bet*2));
      p.status=p.natural ? "blackjack" : "won";
    } else if (total===dealerTotal) {
      p.chips=safeChips(p.chips+p.bet); p.status="push";
    } else p.status="lost";
  }
  room.phase="settled";
  room.message = dealerTotal>21 ? "The house busts. Winning hands collect." : "Round complete. Place your next bet when ready.";
  emitRoom(room);
}
function allDone(room) {
  return room.players.filter(p=>p.bet>0 && p.status!=="left").every(p=>["stand","bust","blackjack"].includes(p.status));
}
function beginIfReady(room) {
  if (room.phase!=="betting") return;
  const active=room.players.filter(p=>p.bet>0);
  if (!active.length) return;
  room.phase="playing";
  room.message="Cards are in motion. Play your hand.";
  for (const p of active) {
    p.hand=[room.deck.pop(),room.deck.pop()];
    p.status="playing";
    p.natural=value(p.hand)===21;
    if (p.natural) p.status="blackjack";
  }
  if (active.every(p=>p.status==="blackjack")) settle(room);
  else emitRoom(room);
}
io.on("connection", socket => {
  socket.on("join", ({code, name}, cb=()=>{}) => {
    code=String(code||"").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,8);
    name=String(name||"Guest").trim().slice(0,18) || "Guest";
    if (!code) return cb({error:"Enter a table code."});
    let room=rooms.get(code);
    if (!room) {
      room={code,players:[],phase:"betting",round:0,deck:newDeck(),dealer:[],message:"Welcome. Choose your bet to join the next hand."};
      rooms.set(code,room);
    }
    if (room.players.length>=MAX_PLAYERS) return cb({error:"This table is full (12 players maximum)."});
    if (room.players.some(p=>p.name.toLowerCase()===name.toLowerCase())) name=name.slice(0,14)+" "+(room.players.length+1);
    const player={id:socket.id,name,chips:STARTING_CHIPS,bet:0,hand:[],status:"waiting",connected:true,natural:false};
    room.players.push(player);
    socket.join(code); socket.data.room=code;
    cb({ok:true,code});
    emitRoom(room);
  });
  socket.on("bet", amount => {
    const room=roomFor(socket), p=room&&getPlayer(socket,room);
    if (!p || !["betting","settled"].includes(room.phase)) return;
    const bet=Number(amount);
    if (!Number.isSafeInteger(bet) || bet<1 || bet>p.chips) return socket.emit("notice","Enter a valid bet within your chip balance.");
    if (room.phase==="settled") {
      room.phase="betting"; room.dealer=[]; room.players.forEach(x=>{x.bet=0;x.hand=[];x.status="waiting";x.natural=false;});
      room.message="New round. Place your bets.";
    }
    p.bet=bet; p.chips-=bet; p.status="ready";
    emitRoom(room);
    if (room.players.every(x=>!x.connected || x.bet>0)) {
      room.round++; room.deck=newDeck(); room.dealer=[room.deck.pop(),room.deck.pop()];
      beginIfReady(room);
    } else {
      room.message="Waiting for the table. Everyone can place a bet; the hand starts when all connected players are ready.";
      emitRoom(room);
    }
  });
  socket.on("start", () => {
    const room=roomFor(socket);
    if (!room || !["betting","settled"].includes(room.phase)) return;
    if (room.phase==="settled") {
      room.phase="betting"; room.dealer=[]; room.players.forEach(x=>{x.bet=0;x.hand=[];x.status="waiting";x.natural=false;});
    }
    if (room.players.some(p=>p.connected && p.bet===0)) return socket.emit("notice","Everyone at the table needs to place a bet first.");
    room.round++; room.deck=newDeck(); room.dealer=[room.deck.pop(),room.deck.pop()];
    beginIfReady(room);
  });
  socket.on("hit", () => {
    const room=roomFor(socket), p=room&&getPlayer(socket,room);
    if (!p || room.phase!=="playing" || p.status!=="playing") return;
    p.hand.push(room.deck.pop());
    if (value(p.hand)>21) p.status="bust";
    else if (value(p.hand)===21) p.status="stand";
    if (allDone(room)) settle(room); else emitRoom(room);
  });
  socket.on("stand", () => {
    const room=roomFor(socket), p=room&&getPlayer(socket,room);
    if (!p || room.phase!=="playing" || p.status!=="playing") return;
    p.status="stand";
    if (allDone(room)) settle(room); else emitRoom(room);
  });
  socket.on("double", () => {
    const room=roomFor(socket), p=room&&getPlayer(socket,room);
    if (!p || room.phase!=="playing" || p.status!=="playing" || p.hand.length!==2 || p.chips<p.bet) return;
    p.chips-=p.bet; p.bet=safeChips(p.bet*2); p.hand.push(room.deck.pop());
    p.status=value(p.hand)>21 ? "bust" : "stand";
    if (allDone(room)) settle(room); else emitRoom(room);
  });
  socket.on("disconnect", () => {
    const room=roomFor(socket); if (!room) return;
    const p=getPlayer(socket,room); if (p) p.connected=false;
    emitRoom(room);
  });
});

server.listen(PORT, "0.0.0.0", () => console.log(`Velvet North Blackjack running on port ${PORT}`));
