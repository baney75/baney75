/* LEGION • application lifecycle, fixed-step loop, touch input, and resumable battles. */
'use strict';
(function(L){
 const canvas=document.getElementById('battlefield'),renderer=new L.Renderer(canvas),audio=new L.AudioEngine();
 let battle=null,demo=new L.Battle({...L.MISSIONS[0],seed:6153},{mode:'demo',faction:'legion'}),last=performance.now(),accumulator=0,demoClock=0,saveClock=0,closed=false,down=null;
 const actions={
  startMission(index){const i=L.clamp(index,0,L.MISSIONS.length-1);start(new L.Battle(L.MISSIONS[i],{mode:'campaign',index:i,faction:ui.profile.faction,perk:ui.profile.perk}));},
  startSkirmish(difficulty=1,sandbox=false){const seed=Date.now()%1000000,r=L.random(seed);const themes=['meadow','river','amber','desert'];const mission={name:['The Untamed March','The Shattered Realm','A Field of Kings','The Golden Frontier'][Math.floor(r()*4)],region:'UNCHARTED TERRITORY',desc:'Outwit your rivals. Raise your standard.',theme:themes[Math.floor(r()*4)],layout:Math.floor(r()*4),difficulty,seed,rivals:difficulty>=1.4?3:difficulty>=1?2:1};start(new L.Battle(mission,{mode:'skirmish',index:-1,faction:ui.profile.faction,perk:ui.profile.perk,sandbox,difficultyName:difficulty<.8?'RELAXED':difficulty>1.2?'BRUTAL':'TACTICAL'}));},
  restart(){if(battle)start(new L.Battle(battle.mission,{...battle.opts,faction:ui.profile.faction,perk:ui.profile.perk}));},
  resumeSaved(){const restored=L.Battle.restore(L.storage.get('legion.battle.v1')||'');if(restored)start(restored,true);else{ui.saved=null;L.storage.remove('legion.battle.v1');ui.refreshHome();ui.toast('That saved battle could not be restored. Start a new conquest.');}},
  saveBattle(){if(battle&&battle.status==='playing'){const saved=L.storage.set('legion.battle.v1',battle.serialize());if(saved)ui.saved=battle.serialize();}},
  getBattle(){return battle;}
 };
 const ui=new L.UI(actions,audio);
 function start(b,restored=false){battle=b;renderer.clear();accumulator=0;saveClock=0;down=null;ui.begin(b,restored);actions.saveBattle();}
 function event(e){renderer.event(e,ui.profile.reduced);if(e.type!=='begin')audio.play(e.type);if(e.type==='capture'){
  if(e.owner===0){ui.toast('Stronghold captured · +9 command',1700);if(ui.profile.haptics&&navigator.vibrate)navigator.vibrate(12);}else if(e.old===0)ui.toast('A stronghold has fallen. Reinforce your front!',2300);
 }if(e.type==='assault')ui.toast('FINAL PUSH · recruitment and combat accelerate',3200);if(e.type==='finish')ui.result();}
 function frame(now){
  try{
   const realDt=Math.min(.08,Math.max(0,(now-last)/1000));last=now;
   if(!document.hidden){
    if(ui.homeOpen){demoClock+=realDt;if(demo.status!=='playing'||demoClock>100){demo=new L.Battle({...L.MISSIONS[0],seed:6153},{mode:'demo',faction:'legion'});demoClock=0;renderer.clear();}
      demo.step(realDt*.65);if(Math.floor(demoClock*10)%65===0){const own=demo.owned(0).sort((a,b)=>b.count-a.count);for(const n of own){if(n.count>35){const target=demo.nodes.filter(z=>z.owner!==0).sort((a,b)=>L.dist(n,a)-L.dist(n,b))[0];if(target)demo.send(n.id,target.id,.65,0);break;}}}
      demo.events.length=0;renderer.draw(demo,{selected:new Set(),pointer:null,target:null,tutorialHint:false,fraction:.75},realDt);
    }else if(battle){
     const active=ui.canInput();if(active){accumulator+=realDt*ui.speed;let loops=0;while(accumulator>=1/30&&loops++<6){battle.step(1/30);accumulator-=1/30;}saveClock+=realDt;if(saveClock>3){actions.saveBattle();saveClock=0;}audio.beat();}
     else accumulator=0;
     const events=battle.events.splice(0);for(const e of events)event(e);
     renderer.draw(battle,ui,active?realDt:0);ui.updateHUD();
    }
   }
  }catch(err){console.error(err);showError('The battlefield encountered an error. Reload the page to restore your last saved battle.');closed=true;}
  if(!closed)requestAnimationFrame(frame);
 }
 function point(e){const rect=canvas.getBoundingClientRect();return renderer.screenToWorld(e.clientX-rect.left,e.clientY-rect.top);}
 canvas.addEventListener('pointerdown',e=>{
  if(e.isPrimary===false||!ui.canInput())return;e.preventDefault();audio.unlock();const p=point(e),node=renderer.hitNode(battle,p.x,p.y);
  down={id:e.pointerId,x:e.clientX,y:e.clientY,start:p,node,selected:[...ui.selected],dragged:false};ui.pointer=p;
  if(!ui.target&&node?.owner===0&&ui.selected.size===0)ui.selected.add(node.id);
  try{canvas.setPointerCapture(e.pointerId);}catch{}ui.updateHUD(true);
 },{passive:false});
 canvas.addEventListener('pointermove',e=>{
  if(!ui.canInput())return;const p=point(e);
  if(down&&e.pointerId===down.id){e.preventDefault();if(Math.hypot(e.clientX-down.x,e.clientY-down.y)>7&&!down.dragged){down.dragged=true;if(!ui.target&&down.node?.owner===0&&!down.selected.includes(down.node.id))ui.selected=new Set([down.node.id]);}ui.pointer=p;}
  else if(e.pointerType==='mouse'&&(ui.target||ui.selected.size))ui.pointer=p;
 },{passive:false});
 canvas.addEventListener('pointerup',e=>{
  if(!down||down.id!==e.pointerId)return;e.preventDefault();const d=down;down=null;if(!ui.canInput()){ui.pointer=null;return;}const p=point(e),node=renderer.hitNode(battle,p.x,p.y);
  if(ui.target){ui.castAt(p,node);ui.pointer=null;return;}
  if(d.dragged){if(d.node?.owner===0&&node&&node.id!==d.node.id)ui.command(node);else if(!d.node&&node?.owner===0)ui.selected=new Set([node.id]);}
  else if(node){
   if(node.owner===0){
    if(d.selected.length>0&&!d.selected.includes(node.id)){ui.selected=new Set(d.selected);ui.command(node);}
    else if(d.selected.includes(node.id))ui.selected.clear();
    else ui.selected=new Set([node.id]);
   }else if(ui.selected.size)ui.command(node);
   else ui.toast((node.owner<0?'Unclaimed':'Rival')+' '+L.TYPES[node.type].name.toLowerCase()+' · '+Math.floor(node.count)+' defenders');
  }else ui.selected.clear();ui.pointer=null;ui.updateHUD(true);
 },{passive:false});
 canvas.addEventListener('pointercancel',()=>{down=null;ui.pointer=null;});canvas.addEventListener('contextmenu',e=>e.preventDefault());
 document.addEventListener('keydown',e=>{if(e.target.matches('input,textarea,select'))return;
  if(e.key==='Escape'){if(ui.target)ui.cancelTarget();else if(ui.modalOpen&&ui.allowModalClose)ui.hideModal();else ui.showPause();}
  if(e.code==='Space'&&!ui.homeOpen){e.preventDefault();if(ui.modalOpen&&ui.allowModalClose)ui.hideModal();else ui.showPause();}
  if(ui.canInput()){if(e.key.toLowerCase()==='a')document.getElementById('all-btn').click();if(['1','2','3'].includes(e.key))ui.armAbility(['volley','charge','muster'][Number(e.key)-1]);}
 });
 document.addEventListener('visibilitychange',()=>{if(document.hidden){actions.saveBattle();if(!ui.homeOpen&&!ui.modalOpen&&!ui.tutorialOpen)ui.showPause();}last=performance.now();accumulator=0;});
 window.addEventListener('pagehide',()=>actions.saveBattle());window.addEventListener('resize',()=>renderer.resize());
 if(window.ResizeObserver)new ResizeObserver(()=>renderer.resize()).observe(document.getElementById('arena'));
 document.addEventListener('pointerdown',()=>audio.unlock(),{once:true,passive:true});
 function showError(text){if(document.getElementById('error'))return;const box=document.createElement('div');box.id='error';box.textContent=text;document.getElementById('app').appendChild(box);}
 // Test hooks expose snapshots and input transforms, not automatic play or networking.
 L.debug={get battle(){return battle;},get ui(){return ui;},get renderer(){return renderer;},startMission:actions.startMission,startSkirmish:actions.startSkirmish,advance(seconds){if(!battle)return;for(let t=0;t<seconds;t+=1/30){battle.step(1/30);if(battle.status!=='playing')break;}const events=battle.events.splice(0);for(const e of events)event(e);ui.updateHUD(true);},snapshot(){return battle?{status:battle.status,time:battle.time,energy:battle.energy,armies:battle.armies.length,player:Math.round(battle.totals(0)),enemy:Math.round(battle.nodes.filter(n=>n.owner>0).reduce((s,n)=>s+n.count,0)),nodes:battle.nodes.map(n=>({id:n.id,owner:n.owner,count:Math.floor(n.count),type:n.type})),errors:!!document.getElementById('error')}:null;}};
 document.getElementById('boot').classList.add('hidden');renderer.resize();requestAnimationFrame(frame);
})(window.Legion);
