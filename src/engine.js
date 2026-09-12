/* LEGION • deterministic, renderer-independent battle simulation. */
'use strict';
window.Legion = window.Legion || {};
(function (L) {
  const W = 800, H = 1120, MAX_ARMIES = 180;
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const dist = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  const TYPES = {
    citadel: {name:'Citadel', unit:'legion', growth:1.5, cap:180, defense:1.12, icon:'crown'},
    village: {name:'Settlement', unit:'legion', growth:1.05, cap:125, defense:1, icon:'tower'},
    stable: {name:'Stables', unit:'cavalry', growth:.90, cap:110, defense:.96, icon:'horse'},
    archery: {name:'Archery camp', unit:'archer', growth:.94, cap:115, defense:1, icon:'bow'},
    temple: {name:'Sanctuary', unit:'legion', growth:.82, cap:115, defense:1.04, icon:'temple'}
  };
  const FACTIONS = {
    legion:{name:'The Legion',short:'LEGION',bonus:'10% faster recruitment',growth:1.10,defense:1,speed:1,icon:'crown'},
    phalanx:{name:'The Phalanx',short:'PHALANX',bonus:'18% stronger defenses',growth:1,defense:1.18,speed:1,icon:'shield'},
    riders:{name:'The Riders',short:'RIDERS',bonus:'20% faster marching',growth:1,defense:1,speed:1.20,icon:'horse'}
  };
  const ABILITIES = {
    volley:{name:'Arrow rain',cost:35,cooldown:13,icon:'arrows',desc:'Tap a target. Arrows damage enemies in a wide circle.'},
    charge:{name:'War cry',cost:25,cooldown:18,icon:'horn',desc:'Your armies march 65% faster and hit 40% harder for 8 seconds.'},
    muster:{name:'Rally',cost:40,cooldown:19,icon:'flag',desc:'Tap your stronghold to instantly recruit 36 soldiers.'}
  };
  const MISSIONS = [
    {name:'The First Standard',region:'THE GREEN FRONTIER',desc:'Raise your banner. Capture every rival stronghold.',theme:'meadow',layout:0,difficulty:.62,seed:1521,rivals:1},
    {name:'A River of Spears',region:'THE SILVER CROSSING',desc:'Control the crossings before your enemy does.',theme:'river',layout:1,difficulty:.82,seed:2734,rivals:1},
    {name:'The Amber Pass',region:'THE SUNLIT HIGHLANDS',desc:'Fast cavalry can turn a narrow front into a rout.',theme:'amber',layout:2,difficulty:.94,seed:5942,rivals:1},
    {name:'Two Crowns',region:'THE DIVIDED KINGDOM',desc:'Two rivals. Let them clash, then take their lands.',theme:'meadow',layout:3,difficulty:1.0,seed:3821,rivals:2},
    {name:'Dust & Glory',region:'THE SOUTHERN EXPANSE',desc:'Seize sanctuaries to fuel your battle abilities.',theme:'desert',layout:1,difficulty:1.08,seed:6614,rivals:1},
    {name:'The Broken Coast',region:'THE JADE SHORE',desc:'Reinforce your flank while pushing up the coast.',theme:'river',layout:2,difficulty:1.14,seed:8852,rivals:2},
    {name:'The Kingsfall',region:'THE CINDER HILLS',desc:'Three crowns stand in the way of your empire.',theme:'amber',layout:3,difficulty:1.18,seed:9413,rivals:3},
    {name:'The Last Citadel',region:'THE IMPERIAL HEARTLAND',desc:'One final field. One banner left standing.',theme:'meadow',layout:3,difficulty:1.30,seed:1278,rivals:3}
  ];
  const layouts = [
    {points:[[400,970],[190,760],[610,760],[400,555],[190,345],[610,345],[400,145]], edges:[[0,1],[0,2],[1,2],[1,3],[2,3],[3,4],[3,5],[4,5],[4,6],[5,6]]},
    {points:[[400,985],[190,805],[610,805],[190,585],[610,585],[400,425],[190,245],[610,245],[400,90]],edges:[[0,1],[0,2],[1,2],[1,3],[2,4],[3,4],[3,5],[4,5],[5,6],[5,7],[6,7],[6,8],[7,8]]},
    {points:[[240,970],[585,935],[160,725],[440,735],[635,550],[175,490],[390,345],[625,200],[200,150]],edges:[[0,1],[0,2],[0,3],[1,3],[1,4],[2,3],[2,5],[3,4],[3,5],[3,6],[4,6],[4,7],[5,6],[5,8],[6,7],[6,8],[7,8]]},
    {points:[[400,985],[175,800],[625,800],[400,660],[145,530],[650,530],[390,425],[175,245],[625,245],[400,105]],edges:[[0,1],[0,2],[1,2],[1,3],[2,3],[1,4],[2,5],[3,4],[3,5],[3,6],[4,6],[5,6],[4,7],[5,8],[6,7],[6,8],[7,8],[7,9],[8,9]]}
  ];
  const NAMES = ['HOME','WESTWATCH','EASTWATCH','SUNSTONE','OAKHOLD','HIGHGATE','ASHFORD','CROWNFALL','NORTHKEEP','THRONE'];
  function random(seed) {let a=seed>>>0; return ()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
  class Battle {
    constructor(mission, opts={}) {
      this.mission={...mission};this.opts={faction:'legion',perk:'veterans',sandbox:false,mode:'campaign',index:0,...opts};
      this.rng=random(mission.seed);this.time=0;this.status='playing';this.energy=this.opts.perk==='command'?85:65;
      this.armies=[];this.fx=[];this.events=[];this.nextId=1;this.chargeUntil=0;this.cooldowns={volley:0,charge:0,muster:0};
      this.stats={sent:0,kills:0,lost:0,captures:0,abilities:0};this.aiTimer=7;this.endTimer=0;this.hudTimer=0;this.assault=false;
      const layout=layouts[mission.layout];this.edges=layout.edges.map(e=>e.slice());
      this.nodes=layout.points.map(([x,y],i)=>{
        let type=i===0||i===layout.points.length-1?'citadel':['village','archery','stable','temple','village'][((i-1)%5+5)%5];
        if(i===2)type='stable';if(i===3)type='temple';if(i===4)type='archery';if(i===5)type='stable';
        return {id:i,x,y,owner:-1,count:12+Math.floor(this.rng()*9),type,level:1,name:NAMES[i],siege:false,flash:0,rally:0};
      });
      this.nodes[0].owner=0;this.nodes[0].count=78+(this.opts.perk==='veterans'?14:0);
      this.nodes[2].owner=0;this.nodes[2].count=27;
      const last=this.nodes.length-1;this.nodes[last].owner=1;this.nodes[last].count=45+Math.round(mission.difficulty*14);
      this.nodes[last-1].owner=1;this.nodes[last-1].count=23;
      if(mission.rivals>=2){this.nodes[last-2].owner=2;this.nodes[last-2].count=38;this.nodes[last-2].type='citadel';}
      if(mission.rivals>=3){this.nodes[last-3].owner=3;this.nodes[last-3].count=36;this.nodes[last-3].type='citadel';}
      this.nodes[last].name='RIVAL CITADEL';this.nodes[0].name='YOUR CITADEL';
      this.graph=this.nodes.map(()=>[]);for(const [a,b] of this.edges){this.graph[a].push(b);this.graph[b].push(a);}
      this.emit('begin',{});
    }
    emit(type,data){this.events.push({type,...data});if(this.events.length>100)this.events.shift();}
    faction(owner){return owner===0?FACTIONS[this.opts.faction]:{growth:1,defense:1,speed:1};}
    cap(n){return TYPES[n.type].cap+30*(n.level-1);}
    totals(owner){return this.nodes.reduce((s,n)=>s+(n.owner===owner?n.count:0),0)+this.armies.reduce((s,a)=>s+(a.owner===owner?a.count:0),0);}
    owned(owner){return this.nodes.filter(n=>n.owner===owner);}
    route(from,to,owner) {
      if(from===to)return [];
      const n=this.nodes.length, ds=Array(n).fill(Infinity),prev=Array(n).fill(-1),done=Array(n).fill(false);ds[from]=0;
      for(let z=0;z<n;z++){
        let u=-1;for(let i=0;i<n;i++)if(!done[i]&&(u<0||ds[i]<ds[u]))u=i;
        if(u<0||ds[u]===Infinity)break;if(u===to)break;done[u]=true;
        for(const v of this.graph[u]){
          const cost=dist(this.nodes[u],this.nodes[v])+(this.nodes[v].owner!==owner&&v!==to?320+this.nodes[v].count*3:0);
          if(ds[u]+cost<ds[v]){ds[v]=ds[u]+cost;prev[v]=u;}
        }
      }
      if(prev[to]<0)return [];let path=[to];while(path[0]!==from){path.unshift(prev[path[0]]);if(path.length>n)return [];}
      // A column stops at the first neutral or hostile fort. No marching through enemy walls.
      const first=path.findIndex((id,i)=>i>0&&this.nodes[id].owner!==owner);
      return first>0?path.slice(0,first+1):path;
    }
    send(from,to,fraction=.75,owner=0){
      if(this.status!=='playing'||this.armies.length>=MAX_ARMIES)return false;
      const n=this.nodes[from];if(!n||n.owner!==owner||from===to||n.count<3)return false;
      const path=this.route(from,to,owner);if(path.length<2)return false;
      const count=Math.floor(n.count*clamp(fraction,.1,1));if(count<2)return false;n.count-=count;
      const dest=this.nodes[path[1]],a={id:this.nextId++,owner,count,initial:count,type:TYPES[n.type].unit,x:n.x,y:n.y,path,leg:1,angle:Math.atan2(dest.y-n.y,dest.x-n.x),travel:0,stopped:false,hit:0,seed:this.rng()*1000};
      this.armies.push(a);if(owner===0)this.stats.sent+=count;this.emit('march',{x:n.x,y:n.y,count,owner,to:path[path.length-1]});return true;
    }
    upgrade(id){
      const n=this.nodes[id];if(!n||n.owner!==0||n.level>=3||this.status!=='playing')return false;
      const cost=25+15*n.level;if(this.energy<cost&&!this.opts.sandbox)return false;
      if(!this.opts.sandbox)this.energy-=cost;n.level++;n.flash=1;this.emit('upgrade',{x:n.x,y:n.y,level:n.level});return true;
    }
    abilityReady(key){const a=ABILITIES[key];return !!a&&this.status==='playing'&&(this.opts.sandbox||(this.energy>=a.cost&&this.cooldowns[key]<=0));}
    ability(key,pos){
      if(!this.abilityReady(key))return false;const spec=ABILITIES[key];
      if(key==='muster'){
        const n=this.nodes[pos?.id];if(!n||n.owner!==0)return false;
        n.count+=36;n.rally=2;this.emit('muster',{x:n.x,y:n.y});
      } else if(key==='volley'){
        if(!pos||!Number.isFinite(pos.x)||!Number.isFinite(pos.y))return false;
        this.fx.push({kind:'volley',x:clamp(pos.x,0,W),y:clamp(pos.y,0,H),age:0,duration:1.6,hit:false});
        this.emit('volley',{x:pos.x,y:pos.y});
      } else if(key==='charge') {this.chargeUntil=this.time+8;this.emit('charge',{});}
      if(!this.opts.sandbox){this.energy-=spec.cost;this.cooldowns[key]=spec.cooldown;}this.stats.abilities++;return true;
    }
    counter(attacker,defender){return attacker==='cavalry'&&defender==='archer'?1.35:attacker==='legion'&&defender==='cavalry'?1.25:attacker==='archer'&&defender==='legion'?1.22:1;}
    power(a){return (a.owner===0&&this.chargeUntil>this.time?1.4:1)*(this.assault?1.22:1);}
    damage(a,amount,by=0){const lost=Math.min(a.count,amount);a.count=Math.max(0,a.count-amount);a.hit=.18;if(a.owner===0)this.stats.lost+=lost;else if(a.owner>0&&by===0)this.stats.kills+=lost;}
    step(dt){
      if(this.status!=='playing')return;dt=clamp(dt,0,.1);this.time+=dt;
      if(this.time>180&&!this.assault){this.assault=true;this.emit('assault',{});}
      const shrines=this.nodes.filter(n=>n.owner===0&&n.type==='temple').length;
      this.energy=this.opts.sandbox?100:Math.min(100,this.energy+dt*(2.4+shrines*.8));
      for(const k of Object.keys(this.cooldowns))this.cooldowns[k]=Math.max(0,this.cooldowns[k]-dt);
      for(const f of this.fx){f.age+=dt;if(f.kind==='volley'&&!f.hit&&f.age>=.75){f.hit=true;
        for(const a of this.armies)if(a.owner!==0&&dist(a,f)<118)this.damage(a,Math.min(40,17+a.count*.36));
        for(const n of this.nodes)if(n.owner!==0&&dist(n,f)<118){const d=Math.min(n.count-1,12+n.count*.32);n.count-=Math.max(0,d);if(n.owner>0)this.stats.kills+=Math.max(0,d);n.flash=1;}
        this.emit('impact',{x:f.x,y:f.y});
      }}
      this.fx=this.fx.filter(f=>f.age<f.duration);
      for(const n of this.nodes){
        n.flash=Math.max(0,n.flash-dt*2);n.rally=Math.max(0,n.rally-dt);
        if(n.owner>=0){const grow=TYPES[n.type].growth*(1+.38*(n.level-1))*this.faction(n.owner).growth*(n.siege?.17:1)*(this.assault?1.4:1);if(n.count<this.cap(n))n.count=Math.min(this.cap(n),n.count+grow*dt);}
        n.siege=false;
      }
      // Spatial hash keeps packet collisions local, even with hundreds of visible soldiers.
      const cells=new Map(),cellSize=72;
      for(const a of this.armies){a.stopped=false;a.hit=Math.max(0,a.hit-dt);if(a.count<.5)continue;const k=Math.floor(a.x/cellSize)+','+Math.floor(a.y/cellSize);if(!cells.has(k))cells.set(k,[]);cells.get(k).push(a);}
      const pairs=new Set();
      for(const a of this.armies){if(a.count<.5)continue;const cx=Math.floor(a.x/cellSize),cy=Math.floor(a.y/cellSize);
        for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(const b of cells.get((cx+dx)+','+(cy+dy))||[]){
          if(a.owner===b.owner||a.id>=b.id||b.count<.5)continue;const key=a.id+'-'+b.id;if(pairs.has(key))continue;
          const range=a.type==='archer'||b.type==='archer'?69:47;if(dist(a,b)>range)continue;pairs.add(key);
          const melee=dist(a,b)<=47;if(melee||a.type==='archer')a.stopped=true;if(melee||b.type==='archer')b.stopped=true;
          const pa=Math.sqrt(a.count)*1.48*this.counter(a.type,b.type)*this.power(a)*(melee||a.type==='archer'?1:0),pb=Math.sqrt(b.count)*1.48*this.counter(b.type,a.type)*this.power(b)*(melee||b.type==='archer'?1:0);
          this.damage(a,pb*dt,b.owner);this.damage(b,pa*dt,a.owner);
          if(this.rng()<dt*5){const ar=a.type==='archer',src=ar?a:b,dst=ar?b:a;this.emit('clash',{x:(a.x+b.x)/2,y:(a.y+b.y)/2,archer:a.type==='archer'||b.type==='archer',x1:src.x,y1:src.y,x2:dst.x,y2:dst.y});}
        }
      }
      for(const a of this.armies){
        if(a.count<.5)continue;const target=this.nodes[a.path[a.leg]],d=dist(a,target);
        if(d<60&&target.owner!==a.owner){
          a.stopped=true;target.siege=true;
          const defense=TYPES[target.type].defense*(1+.13*(target.level-1))*this.faction(target.owner).defense;
          const atk=Math.sqrt(a.count)*1.9*this.power(a)*(a.type==='archer'?1.1:1);
          const retaliation=Math.sqrt(Math.max(0,target.count))*1.10*defense*(target.owner===0&&this.chargeUntil>this.time?1.12:1);
          const hurt=Math.min(target.count,atk*dt/defense);target.count-=hurt;
          if(a.owner===0&&target.owner>=0)this.stats.kills+=hurt;else if(target.owner===0)this.stats.lost+=hurt;
          this.damage(a,retaliation*dt,target.owner);
          if(this.rng()<dt*7)this.emit('clash',{x:a.x+(target.x-a.x)*.65,y:a.y+(target.y-a.y)*.65,archer:a.type==='archer',x1:a.x,y1:a.y,x2:target.x,y2:target.y});
          if(target.count<.5&&a.count>=.5){
            const old=target.owner;target.owner=a.owner;target.count=Math.max(1,a.count);a.count=0;target.flash=1;target.siege=false;
            if(a.owner===0){this.stats.captures++;this.energy=Math.min(100,this.energy+9);}
            this.emit('capture',{x:target.x,y:target.y,id:target.id,owner:a.owner,old,name:target.name});
          }
        } else if(!a.stopped){
          const speed=(a.type==='cavalry'?87:a.type==='archer'?57:63)*this.faction(a.owner).speed*(a.owner===0&&this.opts.perk==='roads'?1.12:1)*(a.owner===0&&this.chargeUntil>this.time?1.65:1);
          const step=speed*dt;a.angle=Math.atan2(target.y-a.y,target.x-a.x);
          if(d<=step+7){
            a.x=target.x;a.y=target.y;
            if(a.leg<a.path.length-1&&target.owner===a.owner)a.leg++;
            else if(target.owner===a.owner){target.count+=a.count;a.count=0;}
          }else{a.x+=Math.cos(a.angle)*step;a.y+=Math.sin(a.angle)*step;a.travel+=step;}
        }
      }
      this.armies=this.armies.filter(a=>a.count>=.5);
      this.aiTimer-=dt;if(this.aiTimer<=0){this.aiTurn();this.aiTimer=(5.0+this.rng()*2.2)/this.mission.difficulty;}
      const playerLive=this.owned(0).length>0||this.armies.some(a=>a.owner===0),enemyLive=this.nodes.some(n=>n.owner>0)||this.armies.some(a=>a.owner>0);
      if(!playerLive||!enemyLive){this.endTimer+=dt;if(this.endTimer>.65)this.finish(playerLive?'won':'lost');}else this.endTimer=0;
      if(this.time>=360&&this.status==='playing'){
        const score=o=>this.owned(o).length*1000+this.totals(o);let winner=0;
        for(let i=1;i<=this.mission.rivals;i++)if(score(i)>score(winner))winner=i;
        this.finish(winner===0?'won':'lost','time');
      }
    }
    aiTurn(){
      for(let owner=1;owner<=this.mission.rivals;owner++){
        const own=this.owned(owner).sort((a,b)=>b.count-a.count);let orders=0;
        for(const source of own){
          if(source.count<18||orders>=Math.max(1,Math.ceil(this.mission.difficulty*2)))continue;
          let best=null,bestScore=-Infinity;
          for(const target of this.nodes){
            if(target.owner===owner)continue;const route=this.route(source.id,target.id,owner);if(route.length<2)continue;
            const first=this.nodes[route[route.length-1]],length=route.slice(1).reduce((s,id,i)=>s+dist(this.nodes[route[i]],this.nodes[id]),0);
            const incoming=this.armies.filter(a=>a.owner===owner&&a.path[a.path.length-1]===first.id).reduce((s,a)=>s+a.count,0);
            const available=source.count*.78+incoming;
            const score=available-first.count*1.18-length*.036+(first.owner===-1?14:0)+(first.type==='temple'?5:0)+(first.owner===0?2:0)+this.rng()*8;
            if(score>bestScore){bestScore=score;best=first;}
          }
          if(best&&bestScore>-10){this.send(source.id,best.id,source.count>95?.85:.72,owner);orders++;}
          else if(source.count>40){
            const front=own.filter(n=>n.id!==source.id&&this.graph[n.id].some(i=>this.nodes[i].owner!==owner)).sort((a,b)=>a.count-b.count)[0];
            if(front&&front.count<source.count*.8){this.send(source.id,front.id,.6,owner);orders++;}
          }
        }
      }
    }
    finish(status,reason='conquest'){if(this.status!=='playing')return;this.status=status;this.reason=reason;this.emit('finish',{status,reason});}
    serialize(){return JSON.stringify({version:1,mission:this.mission,opts:this.opts,time:this.time,status:this.status,energy:this.energy,nodes:this.nodes,armies:this.armies,nextId:this.nextId,chargeUntil:this.chargeUntil,cooldowns:this.cooldowns,stats:this.stats,aiTimer:this.aiTimer,assault:this.assault,fx:this.fx});}
    static restore(json){try{const d=JSON.parse(json);if(d.version!==1||d.status!=='playing'||!Array.isArray(d.nodes)||!Array.isArray(d.armies)||d.nodes.length<7||d.nodes.length>12)return null;const b=new Battle(d.mission,d.opts);for(const k of ['time','energy','nodes','armies','nextId','chargeUntil','cooldowns','stats','aiTimer','assault'])b[k]=d[k];b.fx=Array.isArray(d.fx)?d.fx:[];b.events=[];return b;}catch{return null;}}
  }
  Object.assign(L,{Battle,TYPES,FACTIONS,ABILITIES,MISSIONS,layouts,W,H,clamp,dist,random});
})(window.Legion);
