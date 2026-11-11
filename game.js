const socket=io();
const $=id=>document.getElementById(id);
let myId=null, state=null, roomCode="";
const money=n=>Number(n||0).toLocaleString("en-US");
function notice(msg){$("notice").textContent=msg;$("notice").classList.remove("hidden");setTimeout(()=>$("notice").classList.add("hidden"),2600)}
function cardHTML(c, hidden=false){
  if(hidden)return '<div class="playing-card back"></div>';
  return `<div class="playing-card ${c.red?'red':''}"><span>${c.rank}${c.suit}</span><span class="pip">${c.suit}</span><span>${c.rank}</span></div>`;
}
function render(s){
 state=s; const me=s.players.find(p=>p.id===myId);
 $("roundNo").textContent=s.round; $("playerCount").textContent=`${s.players.length} / 12 seats`;
 $("tableMessage").textContent=s.message||"The table is ready.";
 $("dealerCards").innerHTML=(s.dealer.hand||[]).map(c=>cardHTML(c)).join("")+(s.dealer.hidden?cardHTML(null,true):"");
 $("dealerTotal").textContent=s.dealer.hidden?"":(s.dealer.total?`Total ${s.dealer.total}`:"");
 $("playersGrid").innerHTML=s.players.map(p=>`<div class="player-seat ${p.id===myId?'me':''}">
 <div class="seat-name">${escapeHTML(p.name)}${p.id===myId?' · YOU':''}</div>
 <div class="seat-chips">${money(p.chips)} chips · bet ${money(p.bet)}</div>
 <div class="seat-cards">${(p.hand||[]).map(c=>cardHTML(c)).join("")}</div>
 <div class="seat-status">${p.status}${p.connected?'':' · offline'}</div></div>`).join("");
 if(me){$("myBalance").textContent=money(me.chips);
 const canBet=["betting","settled"].includes(s.phase)&&me.bet===0;
 $("betBtn").disabled=!canBet||me.chips<1;
 const playing=s.phase==="playing"&&me.status==="playing";
 $("hitBtn").disabled=!playing;$("standBtn").disabled=!playing;
 $("doubleBtn").disabled=!(playing&&me.hand.length===2&&me.chips>=me.bet);
 $("nextBtn").disabled=!(["betting","settled"].includes(s.phase)&&s.players.some(p=>p.bet>0));
 $("betAmount").max=me.chips;
 }
}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
$("joinBtn").onclick=()=>{
 const name=$("playerName").value.trim()||"Guest";
 const code=$("roomCode").value.trim().toUpperCase();
 if(!code)return notice("Choose a table code to create or join.");
 socket.emit("join",{name,code},res=>{
  if(res.error)return notice(res.error);
  myId=socket.id;roomCode=res.code;$("roomLabel").textContent=roomCode;
  $("lobby").classList.add("hidden");$("game").classList.remove("hidden");
 });
};
$("betBtn").onclick=()=>socket.emit("bet",Number($("betAmount").value));
$("hitBtn").onclick=()=>socket.emit("hit");
$("standBtn").onclick=()=>socket.emit("stand");
$("doubleBtn").onclick=()=>socket.emit("double");
$("nextBtn").onclick=()=>socket.emit("start");
$("copyRoom").onclick=async()=>{try{await navigator.clipboard.writeText(roomCode);notice("Room code copied. Share it with your players.");}catch(e){notice("Your room code is "+roomCode);}};
socket.on("state",render);
socket.on("notice",notice);
