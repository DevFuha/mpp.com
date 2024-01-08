let Client = require('./client').default;
let clients = [];
global.ch = `[channel_name]`;

let n = 0;

var midi = require('midi');
var input = new midi.Input();
input.on('message', (delta,data)=>{try{
  if(data[0]>=160||data[0]<144||data[0]==155||data[1]<21||data[1]>=109)return;
  clients[++n%clients.length].startNote((["a-1","as-1","b-1","c0","cs0","d0","ds0","e0","f0","fs0","g0","gs0","a0","as0","b0","c1","cs1","d1","ds1","e1","f1","fs1","g1","gs1","a1","as1","b1","c2","cs2","d2","ds2","e2","f2","fs2","g2","gs2","a2","as2","b2","c3","cs3","d3","ds3","e3","f3","fs3","g3","gs3","a3","as3","b3","c4","cs4","d4","ds4","e4","f4","fs4","g4","gs4","a4","as4","b4","c5","cs5","d5","ds5","e5","f5","fs5","g5","gs5","a5","as5","b5","c6","cs6","d6","ds6","e6","f6","fs6","g6","gs6","a6","as6","b6","c7"])[data[1]-21],data[2]/120);
}catch(e){console.warn(e)}});
input.openPort(0);


a=()=>{
  let client = new Client();
  client.setChannel(global.ch);
  client.once('hi',()=>{
    client.sendArray([{m:'userset',set:{name:'Anonymous'}}])
    clients.push(client);
    clients = clients.sort((a, b)=>{
      a = a.user.color;
      let bigint = parseInt(a.substring(1), 16);
      let R = (bigint >> 16) & 255;
      let G = (bigint >> 8) & 255;
      let B = bigint & 255;
      a = "rgb(" + R + ", " + G + ", " + B + ")";
  
      b = b.user.color;
      bigint = parseInt(b.substring(1), 16);
      R = (bigint >> 16) & 255;
      G = (bigint >> 8) & 255;
      B = bigint & 255;
      b = "rgb(" + R + ", " + G + ", " + B + ")";
  
      if (a > b) return 1;
      else if (a < b) return -1;
      else return 0;
    });
  });
  client.on('ch',data=>{
    if(data.ch._id!=global.ch) client.stop();
  })
  client.once('disconnect',()=>{
    a();
    client.stop();
    let index = clients.indexOf(client);
    if(index!=-1) clients.splice(index,1);
  });
  client.start();
}

for(var i=0;i<66;i++)setTimeout(a);

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
function inp() {
  rl.question('', data=>{
    if(data.startsWith('>'))console.log(eval(data.replace('>','')));
    else if(data) clients.forEach(e=>e.sendArray([{m:'a',message:data}]));
    inp();
  });
}
inp();
process.on('unhandledRejection',(...args)=>console.warn(...args,'unhandledRejection'));
process.on('uncaughtException',(...args)=>console.warn(...args,'uncaughtException'));
