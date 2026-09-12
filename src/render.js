/* LEGION • procedural 2D battlefield, no downloaded artwork or runtime dependencies. */
'use strict';
(function(L){
 const COLORS=['#87e9c7','#f29180','#c8a0ed','#edc176'];
 const DARK=['#1c5c49','#753c35','#584573','#715638'];
 const THEMES={
  meadow:{sea:'#294f47',water:'#3b6b60',land:'#a0ad79',light:'#b0b988',shade:'#869761',road:'#c4be8b',tree:'#496643',tree2:'#617849',mount:'#889675'},
  river:{sea:'#244b4b',water:'#518275',land:'#a7b087',light:'#b5bb94',shade:'#8a9e79',road:'#c6c39e',tree:'#496c54',tree2:'#627f5c',mount:'#859a88'},
  amber:{sea:'#374f43',water:'#597969',land:'#b7a775',light:'#c6b884',shade:'#a79662',road:'#dac697',tree:'#817840',tree2:'#a18c45',mount:'#938765'},
  desert:{sea:'#37636a',water:'#518081',land:'#cbb37f',light:'#d8c393',shade:'#b79b66',road:'#e2c995',tree:'#858c54',tree2:'#9b995c',mount:'#b29669'}
 };
 const TAU=Math.PI*2;
 function circle(c,x,y,r,fill,stroke,width=1){c.beginPath();c.arc(x,y,Math.max(0,r),0,TAU);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
 function rounded(c,x,y,w,h,r,fill,stroke,line=1){c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=line;c.stroke();}}
 function line(c,points,color,width=1){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.stroke();}
 function poly(c,points,fill,stroke,width=1){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
 function distanceToSegment(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=L.clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy),0,1);return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);}
 class Renderer{
  constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.width=0;this.height=0;this.dpr=1;this.scale=1;this.ox=0;this.oy=0;this.rotation=false;this.terrain=document.createElement('canvas');this.terrain.width=L.W;this.terrain.height=L.H;this.particles=[];this.rings=[];this.labels=[];this.projectiles=[];this.key='';this.time=0;this.performance={frames:0,totalMs:0};}
  resize(){const r=this.canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2);if(Math.abs(r.width-this.width)<.2&&Math.abs(r.height-this.height)<.2&&dpr===this.dpr)return;this.width=Math.max(1,r.width);this.height=Math.max(1,r.height);this.dpr=dpr;this.canvas.width=Math.round(this.width*dpr);this.canvas.height=Math.round(this.height*dpr);this.rotation=this.width/this.height>1.15;const w=this.rotation?L.H:L.W,h=this.rotation?L.W:L.H;this.scale=Math.min(this.width/w,this.height/h);this.ox=(this.width-w*this.scale)/2;this.oy=(this.height-h*this.scale)/2;}
  screenToWorld(x,y){x=(x-this.ox)/this.scale;y=(y-this.oy)/this.scale;return this.rotation?{x:y,y:L.H-x}:{x,y};}
  worldToScreen(x,y){if(this.rotation)return{x:this.ox+(L.H-y)*this.scale,y:this.oy+x*this.scale};return{x:this.ox+x*this.scale,y:this.oy+y*this.scale};}
  buildTerrain(b){
   this.key=b.mission.seed+':'+b.mission.theme+':'+b.mission.layout;const c=this.terrain.getContext('2d'),t=THEMES[b.mission.theme]||THEMES.meadow,r=L.random(b.mission.seed+801);
   c.clearRect(0,0,L.W,L.H);c.fillStyle=t.sea;c.fillRect(0,0,L.W,L.H);
   // Hand-shaped coastline gives every battlefield a physical board-game silhouette.
   const coast=[[360,20],[477,34],[548,71],[661,67],[731,134],[710,227],[752,315],[725,410],[767,506],[733,603],[752,695],[700,778],[714,881],[658,1000],[557,1045],[493,1100],[375,1077],[272,1100],[165,1045],[119,949],[61,875],[83,769],[40,676],[69,586],[33,491],[66,389],[44,280],[81,198],[129,104],[233,75]];
   c.save();c.translate(0,13);poly(c,coast,'#102d2760');c.restore();poly(c,coast,t.shade,t.water,14);poly(c,coast,t.land,t.road+'99',3);
   c.save();c.beginPath();coast.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.clip();
   // Large, soft terrain patches, not noisy textures.
   for(let i=0;i<24;i++){const x=r()*L.W,y=r()*L.H,rad=55+r()*160,g=c.createRadialGradient(x,y,4,x,y,rad);g.addColorStop(0,i%2?t.shade+'40':t.light+'70');g.addColorStop(1,i%2?t.shade+'00':t.light+'00');c.fillStyle=g;c.fillRect(x-rad,y-rad,rad*2,rad*2);}
   c.strokeStyle=t.light+'45';c.lineWidth=1;
   for(let i=0;i<90;i++){const x=60+r()*680,y=60+r()*1000;c.beginPath();c.ellipse(x,y,20+r()*45,6+r()*14,r()*.9,0,Math.PI*1.5);c.stroke();}
   // A river follows the same crossings as the road graph, with actual bridges painted below.
   const riverY=x=>533+Math.sin(x*.009)*23;
   if(b.mission.theme==='river'){
    c.beginPath();c.moveTo(-10,riverY(-10));for(let x=0;x<830;x+=8)c.lineTo(x,riverY(x));c.strokeStyle=t.shade;c.lineWidth=52;c.stroke();c.strokeStyle=t.water;c.lineWidth=39;c.stroke();c.strokeStyle='#a6cfb330';c.lineWidth=3;c.stroke();
   }
   for(const [a0,b0] of b.edges){const a=b.nodes[a0],d=b.nodes[b0];c.lineCap='round';line(c,[[a.x,a.y],[d.x,d.y]],t.shade+'65',17);line(c,[[a.x,a.y],[d.x,d.y]],t.road,11);c.setLineDash([2,17]);line(c,[[a.x,a.y],[d.x,d.y]],'#eae4c440',2);c.setLineDash([]);
    if(b.mission.theme==='river'&&(a.y-riverY(a.x))*(d.y-riverY(d.x))<0){let near={x:a.x,y:a.y},best=999;for(let j=0;j<=100;j++){const x=a.x+(d.x-a.x)*j/100,y=a.y+(d.y-a.y)*j/100,err=Math.abs(y-riverY(x));if(err<best){best=err;near={x,y};}}
     c.save();c.translate(near.x,near.y);c.rotate(Math.atan2(d.y-a.y,d.x-a.x));rounded(c,-35,-15,70,30,3,'#7b704e','#d8c28b',2);for(let x=-31;x<33;x+=7)line(c,[[x,-12],[x,12]],'#b29a67',3);line(c,[[-37,-16],[37,-16]],'#e0c795',4);line(c,[[-37,16],[37,16]],'#e0c795',4);c.restore();
    }
   }
   // Scenic clusters never obstruct a settlement or a marching route.
   for(let i=0;i<65;i++){
    const x=50+r()*700,y=65+r()*1000,p={x,y};if(b.nodes.some(n=>L.dist(p,n)<95)||b.edges.some(([a,d])=>distanceToSegment(p,b.nodes[a],b.nodes[d])<42))continue;
    if(i%5===0){this.mountain(c,x,y,25+r()*24,t);continue;}
    const n=3+Math.floor(r()*7);for(let j=0;j<n;j++){const tx=x+(r()-.5)*55,ty=y+(r()-.5)*46,s=8+r()*9;this.tree(c,tx,ty,s,t,r);}
   }
   for(let i=0;i<95;i++){const x=r()*800,y=r()*1120;if(b.nodes.some(n=>Math.hypot(n.x-x,n.y-y)<68))continue;line(c,[[x,y],[x+2,y-3],[x+5,y]],t.shade+'85',1.2);}
   c.restore();
   for(let i=0;i<20;i++){const x=i%2?770+r()*20:8+r()*27,y=40+r()*1050;c.strokeStyle='#9bc1a625';c.lineWidth=1.5;c.beginPath();c.ellipse(x,y,10+r()*12,3,0,0,Math.PI);c.stroke();}
   // A quiet compass rose establishes the ancient campaign-map language.
   c.save();c.translate(745,1051);poly(c,[[0,-25],[5,-5],[0,1],[-5,-5]],'#d4cf9b77');poly(c,[[0,25],[5,5],[0,-1],[-5,5]],'#d4cf9b30');line(c,[[-17,0],[17,0]],'#d4cf9b50',1);circle(c,0,0,10,null,'#d4cf9b35',1);c.font='12px Georgia';c.fillStyle='#d4cf9b77';c.textAlign='center';c.fillText('N',0,-33);c.restore();
  }
  tree(c,x,y,s,t,r){circle(c,x+4,y+6,s*.9,'#284b2921');line(c,[[x,y],[x,y+s*.75]],'#5a633b',2.5);circle(c,x-s*.35,y,s*.65,t.tree);circle(c,x+s*.35,y-s*.12,s*.65,t.tree2);circle(c,x,y-s*.46,s*.66,t.tree);circle(c,x-s*.2,y-s*.6,s*.37,t.tree2+'99');}
  mountain(c,x,y,s,t){poly(c,[[x-s*1.2,y+s*.5],[x,y-s],[x+s,y+s*.55]],t.mount,'#485e3b30',1);poly(c,[[x,y-s],[x+s,y+s*.55],[x+2,y+s*.55]],'#54684825');line(c,[[x-s*.25,y-s*.62],[x,y-s],[x+s*.24,y-s*.62]],'#e6dcaf65',2);}
  event(e,reduced=false){
   if(e.type==='clash'&&e.archer&&Number.isFinite(e.x1)){this.projectiles.push({x1:e.x1,y1:e.y1,x2:e.x2,y2:e.y2,age:0});}
   if(e.type==='clash'){const n=reduced?2:5;for(let i=0;i<n;i++)this.particles.push({x:e.x,y:e.y,vx:(Math.random()-.5)*75,vy:(Math.random()-.5)*75,life:.35+Math.random()*.35,max:.7,r:1.5+Math.random()*2,color:i%2?'#fff1b4':'#bdad75'});}
   if(e.type==='capture'){this.rings.push({x:e.x,y:e.y,r:35,life:1.3,max:1.3,color:COLORS[e.owner]});this.labels.push({x:e.x,y:e.y-65,text:e.owner===0?'CAPTURED +9 ◆':'STANDARD FALLS',life:1.8,max:1.8,color:e.owner===0?'#ddffe8':'#ffbbaa'});for(let i=0;i<(reduced?5:19);i++){const a=Math.random()*TAU;this.particles.push({x:e.x,y:e.y,vx:Math.cos(a)*(30+Math.random()*75),vy:Math.sin(a)*(30+Math.random()*75),life:.7,max:.7,r:2,color:COLORS[e.owner]});}}
   if(e.type==='muster'||e.type==='upgrade'){this.rings.push({x:e.x,y:e.y,r:35,life:1.2,max:1.2,color:'#ffe1a0'});this.labels.push({x:e.x,y:e.y-62,text:e.type==='muster'?'+36 SOLDIERS':'FORTIFIED',life:1.5,max:1.5,color:'#fff2b7'});}
   if(e.type==='impact')for(let i=0;i<(reduced?5:18);i++){const a=Math.random()*TAU;this.particles.push({x:e.x+(Math.random()-.5)*130,y:e.y+(Math.random()-.5)*130,vx:Math.cos(a)*25,vy:Math.sin(a)*25,life:.7,max:.7,r:2,color:'#fff0b7'});}
   if(this.particles.length>400)this.particles.splice(0,this.particles.length-400);
  }
  clear(){this.particles=[];this.rings=[];this.labels=[];this.projectiles=[];}
  draw(b,ui,dt){
   const begin=performance.now();this.resize();this.time+=dt;
   if(this.key!==b.mission.seed+':'+b.mission.theme+':'+b.mission.layout)this.buildTerrain(b);
   const c=this.ctx,d=this.dpr,t=THEMES[b.mission.theme]||THEMES.meadow;c.setTransform(d,0,0,d,0,0);c.fillStyle=t.sea;c.fillRect(0,0,this.width,this.height);
   c.save();c.translate(this.ox,this.oy);c.scale(this.scale,this.scale);if(this.rotation){c.translate(L.H,0);c.rotate(Math.PI/2);}
   c.drawImage(this.terrain,0,0);
   // Influence stains communicate ownership without hiding the landscape.
   for(const n of b.nodes){if(n.owner<0)continue;const g=c.createRadialGradient(n.x,n.y,22,n.x,n.y,105);g.addColorStop(0,COLORS[n.owner]+'29');g.addColorStop(1,COLORS[n.owner]+'00');c.fillStyle=g;c.fillRect(n.x-105,n.y-105,210,210);}
   for(const [a0,b0]of b.edges){const a=b.nodes[a0],z=b.nodes[b0];if(a.owner>=0&&a.owner===z.owner){line(c,[[a.x,a.y],[z.x,z.y]],COLORS[a.owner]+'50',3);}}
   for(const a of b.armies)this.army(c,a,b,ui);
   for(const n of b.nodes)this.node(c,n,b,ui);
   if(ui.tutorialHint&&ui.selected.size===0&&!ui.target){
    const a=b.nodes[0],z=b.nodes[1],v=(this.time*.4)%1;c.save();c.setLineDash([9,11]);line(c,[[a.x,a.y-18],[z.x,z.y+30]],'#fef0b999',4);c.setLineDash([]);const x=a.x+(z.x-a.x)*v,y=a.y+(z.y-a.y)*v;circle(c,x,y,13,'#fff0b94a','#fff3c7',2);c.restore();
   }
   if(ui.selected.size&&!ui.target){
    for(const id of ui.selected){const n=b.nodes[id];if(!n||n.owner!==0)continue;c.save();c.setLineDash([8,7]);c.lineDashOffset=-this.time*11;circle(c,n.x,n.y,64,null,'#f5edb5',2.4);c.restore();}
    if(ui.pointer){const target=this.hitNode(b,ui.pointer.x,ui.pointer.y),ids=[...ui.selected];
     for(const id of ids){const n=b.nodes[id];if(!n||n.owner!==0)continue;let pts;
      if(target&&target.id!==id){const path=b.route(id,target.id,0);pts=path.map(i=>[b.nodes[i].x,b.nodes[i].y]);}else pts=[[n.x,n.y],[ui.pointer.x,ui.pointer.y]];
      if(pts.length>1){c.save();c.setLineDash([10,10]);c.lineDashOffset=-this.time*28;line(c,pts,'#fff4bdc0',4);c.setLineDash([]);const a=pts[pts.length-2],z=pts[pts.length-1],ang=Math.atan2(z[1]-a[1],z[0]-a[0]);c.translate(z[0],z[1]);c.rotate(ang);poly(c,[[0,0],[-15,-8],[-12,0],[-15,8]],'#fff4bd');c.restore();}
     }
     if(target&&!ids.includes(target.id)){circle(c,target.x,target.y,66,null,'#fff4bd',3);const sum=ids.reduce((s,id)=>s+Math.floor(b.nodes[id].count*ui.fraction),0);this.label(c,target.x,target.y-84,'SEND '+sum,'#fff1b5',21,'#203927e8');}
    }
   }
   if(ui.target==='volley'&&ui.pointer){const p=ui.pointer;c.save();c.setLineDash([9,9]);circle(c,p.x,p.y,118,'#edd08720','#f7df91',2);c.setLineDash([]);line(c,[[p.x-15,p.y],[p.x+15,p.y]],'#ffecb5',2);line(c,[[p.x,p.y-15],[p.x,p.y+15]],'#ffecb5',2);c.restore();}
   for(const f of b.fx)this.effect(c,f);
   for(const a of this.projectiles){a.age+=dt;const p=L.clamp(a.age/.3,0,1),x=a.x1+(a.x2-a.x1)*p,y=a.y1+(a.y2-a.y1)*p-Math.sin(p*Math.PI)*17,ang=Math.atan2(a.y2-a.y1,a.x2-a.x1);line(c,[[x-Math.cos(ang)*14,y-Math.sin(ang)*14],[x,y]],'#fff0bb',1.5);}
   this.projectiles=this.projectiles.filter(a=>a.age<.3);
   for(const p of this.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.97;p.vy*=.97;c.globalAlpha=L.clamp(p.life/p.max,0,1);circle(c,p.x,p.y,p.r,p.color);}c.globalAlpha=1;this.particles=this.particles.filter(p=>p.life>0);
   for(const p of this.rings){p.life-=dt;p.r+=dt*58;c.globalAlpha=Math.max(0,p.life/p.max);circle(c,p.x,p.y,p.r,null,p.color,3);}c.globalAlpha=1;this.rings=this.rings.filter(p=>p.life>0);
   for(const p of this.labels){p.life-=dt;p.y-=dt*15;c.globalAlpha=Math.min(1,p.life*2);this.label(c,p.x,p.y,p.text,p.color,20,'#153327cc');}c.globalAlpha=1;this.labels=this.labels.filter(p=>p.life>0);
   c.restore();
   // Edge shade frames the tabletop, without flashing or obstructive camera shake.
   c.setTransform(d,0,0,d,0,0);const vg=c.createLinearGradient(0,0,0,this.height);vg.addColorStop(0,'#122e272b');vg.addColorStop(.13,'#122e2700');vg.addColorStop(.85,'#122e2700');vg.addColorStop(1,'#122e2730');c.fillStyle=vg;c.fillRect(0,0,this.width,this.height);
   this.performance.frames++;this.performance.totalMs+=performance.now()-begin;
  }
  army(c,a,b,ui){
   const count=Math.min(110,Math.max(1,Math.ceil(a.count))),cols=Math.max(3,Math.ceil(Math.sqrt(count)*.75)),rows=Math.ceil(count/cols),color=COLORS[a.owner],boost=a.owner===0&&b.chargeUntil>b.time;
   const ux=Math.cos(a.angle),uy=Math.sin(a.angle),px=-uy,py=ux,spacing=a.type==='cavalry'?9:7.5;
   for(let i=0;i<count;i++){
    const col=(i%cols)-(cols-1)/2,row=Math.floor(i/cols)-(rows-1)/2,jitter=Math.sin(i*17+a.seed)*1.1;
    const sway=a.stopped?Math.sin(this.time*4+i)*1.1:Math.sin(this.time*8+i*.3)*.65;
    const x=a.x+px*(col*spacing+jitter)+ux*(row*spacing+sway),y=a.y+py*(col*spacing+jitter)+uy*(row*spacing+sway);
    circle(c,x+1.5,y+2.2,a.type==='cavalry'?4.3:3.3,'#213b273a');
    if(a.type==='cavalry'){c.save();c.translate(x,y);c.rotate(a.angle);c.fillStyle=boost?'#fbe6a0':color;c.beginPath();c.ellipse(0,0,5,3,0,0,TAU);c.fill();c.fillStyle=DARK[a.owner];c.fillRect(-1.6,-1.8,2.8,3.6);c.restore();}
    else if(a.type==='archer'){poly(c,[[x+ux*4,y+uy*4],[x+px*3-ux*2,y+py*3-uy*2],[x-px*3-ux*2,y-py*3-uy*2]],boost?'#fbe6a0':color);}
    else{circle(c,x,y,3.6,boost?'#fbe6a0':color,DARK[a.owner],.7);line(c,[[x+px*2,y+py*2],[x+px*2+ux*6,y+py*2+uy*6]],'#e9e4bbad',.9);}
   }
   if(a.count>=12)this.label(c,a.x,a.y-22-Math.min(27,rows*2),Math.ceil(a.count).toString(),color,17,'#142c24d9');
  }
  node(c,n,b,ui){
   const owner=n.owner,col=owner<0?'#ede0b5':COLORS[owner],dark=owner<0?'#756f4d':DARK[owner];
   c.save();c.translate(n.x,n.y);
   // Counter-rotate stronghold symbols and labels when the tactical map turns to landscape.
   if(this.rotation)c.rotate(-Math.PI/2);
   c.fillStyle='#173b242d';c.beginPath();c.ellipse(3,11,49,24,0,0,TAU);c.fill();
   circle(c,0,0,45,owner<0?'#a89f7535':col+'22',col+'70',2);
   if(n.siege){c.save();c.setLineDash([7,5]);circle(c,0,0,52,null,'#fff0b0',2.5);c.restore();}
   // Garrison dots visibly fill the perimeter as recruitment increases.
   const garrison=Math.min(25,Math.floor(n.count/4));for(let i=0;i<garrison;i++){const a=i*2.39996,r=50+(i%2)*6;circle(c,Math.cos(a)*r,Math.sin(a)*r,2.7,col+'cc',dark,.6);}
   const stone=owner<0?'#d3c59a':'#e0d5af',shadow='#827e58',roof=owner<0?'#8d8051':dark;
   if(n.type==='citadel'){
    rounded(c,-29,-16,58,43,2,shadow);rounded(c,-27,-20,54,42,2,stone);rounded(c,-34,-32,17,42,2,stone);rounded(c,17,-32,17,42,2,stone);
    for(const x of[-34,-27,-20,17,24,31])c.fillRect(x,-37,5,9);
    poly(c,[[-16,-17],[0,-31],[16,-17]],roof);rounded(c,-7,4,14,19,6,roof);line(c,[[-25,-7],[-25,0]],shadow,4);line(c,[[25,-7],[25,0]],shadow,4);
    c.fillStyle=col;poly(c,[[-4,-47],[15,-47],[11,-41],[-4,-41]],col);line(c,[[-5,-29],[-5,-49]],'#605b40',2);
   }else if(n.type==='stable'){
    rounded(c,-27,-7,54,30,2,stone);poly(c,[[-33,-7],[0,-28],[33,-7]],roof);rounded(c,-19,5,14,18,3,shadow);rounded(c,5,5,14,18,3,shadow);line(c,[[-31,24],[31,24]],'#ded0a1',4);this.horseMark(c,0,-7,col);
   }else if(n.type==='archery'){
    poly(c,[[-29,20],[-13,-25],[7,20]],stone);poly(c,[[-13,-25],[-13,20],[7,20]],shadow);poly(c,[[0,20],[16,-16],[35,20]],stone);line(c,[[-13,-25],[-13,-36]],'#666a44',2);poly(c,[[-12,-36],[2,-32],[-12,-29]],col);circle(c,21,8,10,col,dark,2);circle(c,21,8,5,null,dark,2);circle(c,21,8,1.5,dark);
   }else if(n.type==='temple'){
    rounded(c,-28,20,56,5,1,stone);rounded(c,-24,14,48,5,1,shadow);for(const x of[-19,-6,7,20])rounded(c,x-3,-9,6,26,1,stone);poly(c,[[-30,-10],[0,-33],[30,-10]],stone,shadow,1.3);circle(c,0,-18,4,col,dark,1);line(c,[[-29,26],[29,26]],'#e6d8ac',3);
   }else{
    rounded(c,-21,-20,42,43,2,stone);rounded(c,-28,10,56,16,2,shadow);for(const x of[-21,-7,7])rounded(c,x,-27,10,12,1,stone);rounded(c,-7,4,14,20,5,roof);line(c,[[17,-15],[17,-45]],'#696e4a',2);poly(c,[[18,-45],[36,-45],[31,-38],[18,-38]],col);
   }
   if(n.level>1){for(let i=0;i<n.level-1;i++)poly(c,[[-8+i*12,-60],[-3+i*12,-64],[2+i*12,-60],[-3+i*12,-56]],'#fff0b4');}
   if(n.flash>0){c.globalAlpha=n.flash*.38;circle(c,0,0,47,col);c.globalAlpha=1;}
   const text=Math.floor(Math.max(0,n.count)).toString(),w=Math.max(52,text.length*17+19);rounded(c,-w/2,29,w,35,11,owner<0?'#5b5c43ee':dark,col+'a8',1.5);
   c.font='bold 27px -apple-system, BlinkMacSystemFont, sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillStyle=owner<0?'#f3eacb':'#f1f7da';c.fillText(text,0,47);
   if(owner===0){circle(c,-w/2+2,31,5,'#a3f0ce','#315d49',1.2);}else if(owner>0){poly(c,[[w/2-4,27],[w/2+3,34],[w/2-4,41],[w/2-11,34]],col,dark,1);}
   c.font='600 14px -apple-system,BlinkMacSystemFont,sans-serif';c.fillStyle='#283c2edb';c.textBaseline='alphabetic';const label=n.type==='citadel'?(owner===0?'YOUR CITADEL':'RIVAL CITADEL'):L.TYPES[n.type].name.toUpperCase();
   c.fillText(label,0,82);
   c.restore();
  }
  horseMark(c,x,y,col){c.save();c.translate(x,y);c.strokeStyle=col;c.lineWidth=2;c.beginPath();c.moveTo(-8,4);c.lineTo(-3,-3);c.lineTo(4,-3);c.lineTo(4,-8);c.lineTo(9,-3);c.lineTo(5,1);c.lineTo(2,1);c.lineTo(2,8);c.moveTo(-5,2);c.lineTo(-7,8);c.stroke();c.restore();}
  label(c,x,y,text,color,size=20,background=null){c.save();c.translate(x,y);if(this.rotation)c.rotate(-Math.PI/2);c.font='700 '+size+'px -apple-system,BlinkMacSystemFont,sans-serif';c.textAlign='center';c.textBaseline='middle';if(background){const w=c.measureText(text).width+16;rounded(c,-w/2,-size*.7,w,size*1.4,7,background);}c.fillStyle=color;c.fillText(text,0,0);c.restore();}
  effect(c,f){if(f.kind!=='volley')return;const a=f.age;c.save();c.globalAlpha=Math.min(1,(1.6-a)*2);c.setLineDash([8,10]);circle(c,f.x,f.y,118,a<.75?'#efd8931a':'#fbeabf14','#eed393aa',2);c.setLineDash([]);const r=L.random(Math.round(f.x*91+f.y*7));
   for(let i=0;i<35;i++){const angle=r()*TAU,rad=Math.sqrt(r())*103,tx=f.x+Math.cos(angle)*rad,ty=f.y+Math.sin(angle)*rad,delay=i*.012,p=L.clamp((a-.12-delay)/.65,0,1);if(p<=0)continue;const x=tx-100*(1-p),y=ty-230*(1-p);c.globalAlpha=p>=1?Math.max(0,1-(a-.85)*1.7):.9;line(c,[[x-8,y-18],[x,y]],'#fff0b9',2);poly(c,[[x,y],[x-5,y-5],[x+1,y-7]],'#6b5430');}
   c.restore();}
  hitNode(b,x,y){let best=null,d=Infinity;const r=Math.max(67,25/this.scale);for(const n of b.nodes){const nd=Math.hypot(n.x-x,n.y-y);if(nd<r&&nd<d){d=nd;best=n;}}return best;}
 }
 Object.assign(L,{Renderer,COLORS,THEMES});
})(window.Legion);
