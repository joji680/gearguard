"use strict";
  let state='menu',meta=loadMeta(),lastBank=0,endless=false,hitstop=0;
  let player,bullets,ebullets,enemies,pickups,parts,shocks,chains,hazards,oilZones,pets,decoGears,grid;
  let room,cogsRun,clearTimer,shake=0,rerollsLeft=0;
  let challengeMode=false;
  let runPress=Math.min(meta.lastPress||0,meta.unlockedPress||0)||0,pressHpMul=1,pressDmgMul=1,pressBossMul=1,pressCogMul=1;
  Audio.muted=!!meta.muted;Audio.vol=meta.vol==null?0.5:meta.vol;
  document.documentElement.style.setProperty('--uiscale',meta.uiscale||1);
  function toggleMute(){meta.muted=meta.muted?0:1;Audio.setMute(!!meta.muted);saveMeta(meta);if($('mutebtn'))$('mutebtn').textContent=meta.muted?'🔇 Aus':'🔊 An';}
  let curBiome=null,curStage=-1;
  function biomeFor(r){const st=Math.floor((r-1)/5);if(r===1||st!==curStage){curStage=st;const opts=BIOMES.filter(b=>b!==curBiome);curBiome=opts.length?opts[(Math.random()*opts.length)|0]:BIOMES[0];}return curBiome;}
  function bossVariantFor(r){if(r%25===0)return 'herzwerk';return ['kessel','spindel','fabrik','uhrturm','koloss','schwarm','brenner','zerleger'][((r/5)-1)%8];}
  function makePlayer(){const m=challengeMode?CH_BASE:meta;return{
    x:0,y:0,lastX:0,lastY:0,vx:0,vy:0,r:14,speed:3.0,hp:100+m.vit*20,maxHp:100+m.vit*20,
    damage:10+m.pow*4,fireRate:Math.max(70,260-m.ign*18),lastShot:0,
    projectiles:1,spread:0,pierce:m.pierceM||0,bulletSpeed:7+(m.bspeed||0)*0.7,
    heat:0,maxHeat:100+(m.heatcap||0)*12,heatPerShot:16,coolRate:55+m.cool*12,overheated:false,
    cogMult:1+m.coll*0.25,iframe:0,iframeBonus:0,healPerRoom:0,aim:0,revives:m.phoenix||0,
    relics:new Set(),syn:{},twin:false,magnet:110+(m.magnetM||0)*25,cogHeal:false,noSpread:false,
    crit:(m.critM||0)*0.05,flywheel:0,heartTimer:5,homing:false,shotCount:0,shielded:false,shieldCd:10,
    dashT:0,dashCd:0,dashMax:1.3*(1-0.15*(m.dash||0)),dvx:0,dvy:0,charge:0,chargeRate:(1/30)*(1+0.15*(m.tank||0)),bombDmgMul:1+0.2*(m.tank||0),oiltrail:false,
    skin:COSMETICS.find(c=>c.id===m.skin)||COSMETICS[0]
  };}
  const hasR=id=>player.relics.has(id);
  function dmgEnemy(e,d){if(e.shield>0)return;if(e.armor)d*=(1-e.armor);e.hp-=d;e.hit=0.08;}
  function popNum(x,y,val,crit){parts.push({x:x+(Math.random()-0.5)*8,y:y-6,vx:(Math.random()-0.5)*0.6,vy:-1.4,life:0.7,max:0.7,kind:'dmgnum',r:0,val:Math.max(1,Math.round(val)),crit:!!crit});}

  function genArena(boss){
    const desired=50;
    let cols=Math.min(17,Math.max(11,Math.floor((W-60)/desired)));if(cols%2===0)cols--;
    let rows=Math.min(13,Math.max(9,Math.floor((H-150)/desired)));if(rows%2===0)rows--;
    let tile=Math.floor(Math.min((W-50)/cols,(H-140)/rows));tile=Math.max(40,Math.min(56,tile));
    const ox=Math.round((W-cols*tile)/2),oy=Math.round((H-rows*tile)/2)+16,cells=[];
    for(let r=0;r<rows;r++){cells[r]=[];for(let c=0;c<cols;c++)cells[r][c]=(r===0||c===0||r===rows-1||c===cols-1)?1:0;}
    grid={cols,rows,tile,ox,oy,cells,vents:[],floor:[],flow:null,biome:biomeFor(room)};
    if(!boss){const mode=(Math.random()*3)|0,density=0.08+Math.random()*0.06,cc=(cols/2)|0,cr=(rows/2)|0;
      for(let r=2;r<rows-2;r++)for(let c=2;c<cols-2;c++){if(Math.abs(r-cr)<=2&&Math.abs(c-cc)<=2)continue;if(Math.random()<density)mirror(r,c,mode);}}
    floodFill();genVents(boss);
  }
  function mirror(r,c,mode){const {cols,rows,cells}=grid;cells[r][c]=1;if(mode===0||mode===2)cells[r][cols-1-c]=1;if(mode===1||mode===2)cells[rows-1-r][c]=1;if(mode===2)cells[rows-1-r][cols-1-c]=1;}
  function floodFill(){const {cols,rows,cells}=grid,cc=(cols/2)|0,cr=(rows/2)|0;cells[cr][cc]=0;
    const seen=Array.from({length:rows},()=>new Array(cols).fill(false)),st=[[cr,cc]];seen[cr][cc]=true;const fl=[];
    while(st.length){const [r,c]=st.pop();fl.push({r,c});[[r-1,c],[r+1,c],[r,c-1],[r,c+1]].forEach(([nr,nc])=>{if(nr>=0&&nc>=0&&nr<rows&&nc<cols&&!seen[nr][nc]&&cells[nr][nc]===0){seen[nr][nc]=true;st.push([nr,nc]);}});}
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)if(cells[r][c]===0&&!seen[r][c])cells[r][c]=1;grid.floor=fl;}
  function genVents(boss){let n=boss?2:(Math.random()<0.55?1+((Math.random()*2)|0):0);n=Math.round(n*(grid.biome.ventMul||1));const cc=(grid.cols/2)|0,cr=(grid.rows/2)|0;let tr=0;
    while(grid.vents.length<n&&tr++<60){const t=grid.floor[(Math.random()*grid.floor.length)|0];if(Math.abs(t.r-cr)<=1&&Math.abs(t.c-cc)<=1)continue;grid.vents.push({c:t.c,r:t.r,phase:Math.random()*6,x:grid.ox+(t.c+0.5)*grid.tile,y:grid.oy+(t.r+0.5)*grid.tile});}}
  const ventActive=(v,now)=>Math.sin(now*0.0015+v.phase)>0.45;
  const tileCenter=t=>({x:grid.ox+(t.c+0.5)*grid.tile,y:grid.oy+(t.r+0.5)*grid.tile});
  function isWallW(x,y){const c=Math.floor((x-grid.ox)/grid.tile),r=Math.floor((y-grid.oy)/grid.tile);if(r<0||c<0||r>=grid.rows||c>=grid.cols)return true;return grid.cells[r][c]===1;}
  function circRect(cx,cy,r,rx,ry,rw,rh){const nx=Math.max(rx,Math.min(cx,rx+rw)),ny=Math.max(ry,Math.min(cy,ry+rh));return (cx-nx)**2+(cy-ny)**2<r*r;}
  function canBeAt(x,y,rad){const t=grid.tile,c0=Math.floor((x-rad-grid.ox)/t),c1=Math.floor((x+rad-grid.ox)/t),r0=Math.floor((y-rad-grid.oy)/t),r1=Math.floor((y+rad-grid.oy)/t);
    for(let r=r0;r<=r1;r++)for(let c=c0;c<=c1;c++){if(r<0||c<0||r>=grid.rows||c>=grid.cols)return false;if(grid.cells[r][c]===1&&circRect(x,y,rad,grid.ox+c*t,grid.oy+r*t,t,t))return false;}return true;}
  function moveSlide(e,vx,vy,f){const nx=e.x+vx*f;if(canBeAt(nx,e.y,e.r))e.x=nx;const ny=e.y+vy*f;if(canBeAt(e.x,ny,e.r))e.y=ny;}
  // Verhindert dass Gegner im Spieler stecken: schiebt sie sanft heraus
  function pushOutOfPlayer(e){if(!player||e.type==='boss')return;const dx=e.x-player.x,dy=e.y-player.y,dd=dx*dx+dy*dy,rad=e.r+player.r;if(dd<rad*rad&&dd>0.0001){const d=Math.sqrt(dd),ux=dx/d,uy=dy/d,push=rad-d+0.5;const nx=e.x+ux*push,ny=e.y+uy*push;if(canBeAt(nx,ny,e.r)){e.x=nx;e.y=ny;}else if(canBeAt(e.x+ux*push,e.y,e.r))e.x+=ux*push;else if(canBeAt(e.x,e.y+uy*push,e.r))e.y+=uy*push;}}
  function clampArena(e){const t=grid.tile;e.x=Math.max(grid.ox+e.r,Math.min(grid.ox+grid.cols*t-e.r,e.x));e.y=Math.max(grid.oy+e.r,Math.min(grid.oy+grid.rows*t-e.r,e.y));}

  function los(x1,y1,x2,y2){const dx=x2-x1,dy=y2-y1,d=Math.hypot(dx,dy),steps=Math.ceil(d/(grid.tile*0.4));for(let i=1;i<steps;i++){const t=i/steps;if(isWallW(x1+dx*t,y1+dy*t))return false;}return true;}
  function computeFlow(){const {cols,rows,cells}=grid;const dist=grid.flow=Array.from({length:rows},()=>new Array(cols).fill(-1));
    let pc=Math.floor((player.x-grid.ox)/grid.tile),pr=Math.floor((player.y-grid.oy)/grid.tile);
    pc=Math.max(0,Math.min(cols-1,pc));pr=Math.max(0,Math.min(rows-1,pr));if(cells[pr][pc]===1)return;
    const q=[[pr,pc]];dist[pr][pc]=0;let h=0;
    while(h<q.length){const [r,c]=q[h++],d=dist[r][c];[[r-1,c],[r+1,c],[r,c-1],[r,c+1]].forEach(([nr,nc])=>{if(nr>=0&&nc>=0&&nr<rows&&nc<cols&&cells[nr][nc]===0&&dist[nr][nc]<0){dist[nr][nc]=d+1;q.push([nr,nc]);}});}}
  function flowVec(e){if(!grid.flow)return null;const c=Math.floor((e.x-grid.ox)/grid.tile),r=Math.floor((e.y-grid.oy)/grid.tile);
    if(r<0||c<0||r>=grid.rows||c>=grid.cols)return null;let bd=grid.flow[r][c];if(bd<0)bd=1e9;let best=null;
    [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].forEach(([nr,nc])=>{if(nr<0||nc<0||nr>=grid.rows||nc>=grid.cols)return;const d=grid.flow[nr][nc];if(d>=0&&d<bd){bd=d;best=[nr,nc];}});
    if(!best)return null;const tx=grid.ox+(best[1]+0.5)*grid.tile,ty=grid.oy+(best[0]+0.5)*grid.tile,dx=tx-e.x,dy=ty-e.y,m=Math.hypot(dx,dy)||1;return [dx/m,dy/m];}
  function separation(e){let sx=0,sy=0;for(const o of enemies){if(o===e||o.type==='boss')continue;const dx=e.x-o.x,dy=e.y-o.y,dd=dx*dx+dy*dy,rad=e.r+o.r+4;if(dd>0&&dd<rad*rad){const dm=Math.sqrt(dd);sx+=dx/dm;sy+=dy/dm;}}const sl=Math.hypot(sx,sy);if(sl>0){sx/=sl;sy/=sl;}return [sx,sy];}
  function navigate(e,ux,uy,ss,f){let dx,dy;if(los(e.x,e.y,player.x,player.y)){dx=ux;dy=uy;}else{const fv=flowVec(e);if(fv){dx=fv[0];dy=fv[1];}else{dx=ux;dy=uy;}}const [sx,sy]=separation(e);moveSlide(e,dx*e.speed*ss+sx*0.7,dy*e.speed*ss+sy*0.7,f);}
  function angDiff(a,b){let d=a-b;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;return d;}

  function newRun(){
    const m=challengeMode?CH_BASE:meta;
    player=makePlayer();bullets=[];ebullets=[];enemies=[];pickups=[];parts=[];shocks=[];chains=[];hazards=[];oilZones=[];pets=[];
    if(m.pets&&m.pets.falke)pets.push({kind:'falke',x:0,y:0,a:0,t:0});
    if(m.pets&&m.pets.hund)pets.push({kind:'hund',x:0,y:0,a:0,t:0});
    room=0;cogsRun=0;shake=0;rerollsLeft=m.reroll||0;endless=false;
    runPress=m.lastPress||0;pressHpMul=1+runPress*0.12;pressDmgMul=1+runPress*0.08;pressBossMul=1+runPress*0.18;pressCogMul=1+runPress*0.18;
    if(!challengeMode){meta.stats.runs++;meta.stats.bestPress=Math.max(meta.stats.bestPress,runPress);saveMeta(meta);}
    decoGears=Array.from({length:6},()=>({x:Math.random()*W,y:Math.random()*H,r:60+Math.random()*120,teeth:8+((Math.random()*6)|0),rot:Math.random()*7,spin:(Math.random()-0.5)*0.0015}));
    if(m.auftakt){const r=RELICS[(Math.random()*RELICS.length)|0];player.relics.add(r.id);if(r.onGain)r.onGain(player);computeSyn();toast('Auftakt: '+r.name);}
    renderTray();paused=false;enterRoom();
  }
  function enterRoom(){nextRoom();if(grid.isWerkstatt)openWerkstatt();else{state='play';show(null);}}
  function spawnPos(minD){const need=Math.max(minD,grid.tile*4);for(let i=0;i<60;i++){const t=grid.floor[(Math.random()*grid.floor.length)|0],p=tileCenter(t);if((p.x-player.x)**2+(p.y-player.y)**2<need*need)continue;return p;}return tileCenter(grid.floor[(Math.random()*grid.floor.length)|0]);}
  function pickType(){const R=room,opts=['crawler','crawler','swarmling'];if(R>=2)opts.push('spitter','spitter');if(R>=3)opts.push('charger','bomber','drohne');if(R>=4)opts.push('brute','turret','waechter');if(R>=5)opts.push('mechaniker','moerser','verstaerker');if(R>=7)opts.push('charger','brute','waechter','drohne');return opts[(Math.random()*opts.length)|0];}
  function nextRoom(){
    room++;let boss=room%5===0,werk=!boss&&room>4&&room%6===0;if(endless){boss=false;werk=false;}
    if(!endless||!grid)genArena(boss);
    const ctr=tileCenter({c:(grid.cols/2)|0,r:(grid.rows/2)|0});player.x=ctr.x;player.y=ctr.y;player.lastX=player.x;player.lastY=player.y;player.vx=0;player.vy=0;
    if(player.healPerRoom)player.hp=Math.min(player.maxHp,player.hp+player.healPerRoom);
    bullets.length=0;ebullets.length=0;pickups.length=0;shocks.length=0;chains.length=0;hazards.length=0;oilZones.length=0;
    if(pets)pets.forEach(pt=>{pt.x=player.x;pt.y=player.y;});
    grid.isBoss=boss;grid.isEndboss=room%25===0;grid.isWerkstatt=werk;grid.reserve=0;grid.spawnTimer=2.4;grid.maxAlive=18;grid.bzTimer=3;
    if((room-1)%5===0)toast('Biom: '+grid.biome.name+(grid.biome.fxDesc?' — '+grid.biome.fxDesc:''));
    if(werk){/* nichts spawnen */}
    else if(boss){spawnBoss();Audio.boss();}
    else{const total=Math.min(26,5+Math.floor(room*1.3));grid.maxAlive=Math.min(18,9+Math.floor(room*0.5));
      let initial=room<4?total:Math.min(total,6+Math.floor(room*0.3));grid.reserve=total-initial;
      let placed=0;while(placed<initial){const t=pickType();if(t==='swarmling'){const n=Math.min(3,initial-placed);for(let k=0;k<n;k++)spawnEnemy('swarmling',false);placed+=n;}else{spawnEnemy(t,false);placed++;}}}
    clearTimer=-1;saveRunSnapshot();
  }
  function hpScale(){return 1+(room-1)*0.22;}
  function bossHpScale(){const extra=room>25?1+(room-25)*0.05:1;return extra;}
  function bossDmgScale(){return 1+Math.max(0,room-5)*0.08;}
  function spawnEnemy(type,tele){const T=TYPES[type],p=spawnPos(grid.tile*3.2);
    let hp=T.hp*hpScale()*pressHpMul,r=T.r,speed=T.speed,contact=T.contact,fireEvery=T.fireEvery||0,elite=null,armor=0,explodes=false;
    if(type!=='swarmling'&&room>=3){const ch=Math.min(0.40,0.05+room*0.018+runPress*0.03);if(Math.random()<ch){elite=['gepanzert','rasend','explosiv'][(Math.random()*3)|0];
      if(elite==='gepanzert'){hp*=1.9;armor=0.45;r*=1.1;contact*=1.2;}else if(elite==='rasend'){speed*=1.4;if(fireEvery)fireEvery*=0.6;}else explodes=true;}}
    enemies.push({type,x:p.x,y:p.y,r,hp,maxHp:hp,speed,contact,drop:T.drop,fly:!!T.fly,
      fireTimer:fireEvery?(400+Math.random()*900):((type==='mechaniker'||type==='verstaerker')?2000:0),fireEvery,range:T.range||0,
      dashCd:1200+Math.random()*800,dashing:0,windup:0,eye:Math.random()*6,burnT:0,burnDps:0,shield:0,slow:0,boost:0,
      face:Math.atan2(player.y-p.y,player.x-p.x),spawning:tele?0.55:0,t1:type==='moerser'?2400:2200,elite,armor,explodes});
    if(tele)burst(p.x,p.y,10,'steam');}
  function spawnBoss(){const V=bossVariantFor(room),C=BOSSCFG[V],hp=(290+room*68)*C.hpMul*pressBossMul*bossHpScale(),p=tileCenter({c:(grid.cols/2)|0,r:2});
    enemies.push({type:'boss',variant:V,name:C.name,x:p.x,y:p.y,r:C.r,hp,maxHp:hp,speed:C.speed,contact:24*bossDmgScale(),drop:[18,28],dmgScale:bossDmgScale(),
      t1:800,t2:2200,t3:0,spiralA:0,handA:0,rot:0,shield:0,dashCd:1800,dashT:0,dvx:0,dvy:0,burnT:0,burnDps:0,eye:0,slow:0,spawning:0});}

  function fire(now){
    const p=player;p.lastShot=now;p.shotCount++;Audio.shoot();
    const flyMult=hasR('schwungrad')?(1+Math.min(0.6,p.flywheel*0.5)):1,dmg=p.damage*flyMult;
    const n=p.projectiles,base=p.aim,spread=p.noSpread?0:p.spread;
    for(let i=0;i<n;i++){const a=n>1?base-spread/2+spread*(i/(n-1)):base;mkBullet(a,dmg,5,p.pierce,false);}
    if(p.twin)mkBullet(base+Math.PI,dmg,5,p.pierce,false);
    if(hasR('resonanz')&&p.shotCount%6===0)mkBullet(base,dmg*2.2,11,5,true);
    p.heat+=p.heatPerShot;
    if(p.heat>=p.maxHeat){p.heat=p.maxHeat;if(!p.overheated){p.overheated=true;onOverheat();}}
    burst(p.x+Math.cos(base)*20,p.y+Math.sin(base)*20,2,'spark',base);
  }
  function mkBullet(a,dmg,r,pierce,big){bullets.push({x:player.x+Math.cos(a)*18,y:player.y+Math.sin(a)*18,vx:Math.cos(a)*player.bulletSpeed*(big?1.1:1),vy:Math.sin(a)*player.bulletSpeed*(big?1.1:1),r,damage:dmg,pierce,life:big?1.8:1.3,burns:hasR('brennkammer'),big:!!big});}
  function onOverheat(){burst(player.x,player.y,8,'steam');Audio.over();if(hasR('ueberdruck'))aoe(player.x,player.y,150,28+player.damage*0.6,'#9be0ff',player.syn.blutdruck?10:(player.syn.dampfmaschine?5:0),false,false);}
  function aoe(x,y,rad,dmg,col,heal,slow,burn){shocks.push({x,y,r:rad*0.25,max:rad,life:0.4,col});shake=Math.min(16,shake+6);burst(x,y,8,'steam');
    for(const e of enemies){if(e.shield>0)continue;if((x-e.x)**2+(y-e.y)**2<(rad+e.r)**2){let d=dmg;if(e.armor)d*=(1-e.armor);e.hp-=d;e.hit=0.08;if(slow)e.slow=Math.max(e.slow,1.2);if(burn)applyBurn(e);if(heal>0)player.hp=Math.min(player.maxHp,player.hp+heal);}}}
  function bomb(){const p=player;Audio.bomb();shake=Math.min(20,shake+14);aoe(p.x,p.y,185,p.damage*1.8*p.bombDmgMul,'#ffd089',0,false,false);
    for(const e of enemies)if(e.type==='waechter'&&(e.x-p.x)**2+(e.y-p.y)**2<185*185)e.shieldBroken=3;
    for(let i=ebullets.length-1;i>=0;i--)if((ebullets[i].x-p.x)**2+(ebullets[i].y-p.y)**2<185*185)ebullets.splice(i,1);
    for(const e of enemies){if(e.type==='boss')continue;const dx=e.x-p.x,dy=e.y-p.y,d=Math.hypot(dx,dy)||1;if(d<185){moveSlide(e,dx/d*40,dy/d*40,1);clampArena(e);}}
    for(let k=0;k<26;k++){const a=k/26*Math.PI*2;parts.push({x:p.x,y:p.y,vx:Math.cos(a)*4,vy:Math.sin(a)*4,life:0.6,max:0.6,kind:'steam',r:5});}}
  function applyBurn(e){e.burnT=Math.max(e.burnT,2.6);e.burnDps=Math.max(e.burnDps,6+player.damage*0.35);}
  function chainFrom(e,dmg){const dealt=new Set([e]);let src=e,j=2;
    while(j-->0){let best=null,bd=180*180;for(const o of enemies){if(dealt.has(o))continue;const d=(o.x-src.x)**2+(o.y-src.y)**2;if(d<bd){bd=d;best=o;}}
      if(!best)break;chains.push({x1:src.x,y1:src.y,x2:best.x,y2:best.y,life:0.16,col:'#aef4f8'});dmgEnemy(best,dmg*0.55);if(player.syn.kettenbrand)applyBurn(best);if(hasR('frost'))best.slow=Math.max(best.slow,1.2);dealt.add(best);src=best;}}
  function steer(b,turn){let best=null,bd=400*400;for(const e of enemies){const d=(e.x-b.x)**2+(e.y-b.y)**2;if(d<bd){bd=d;best=e;}}if(!best)return;const cur=Math.atan2(b.vy,b.vx),diff=angDiff(Math.atan2(best.y-b.y,best.x-b.x),cur),na=cur+Math.max(-turn,Math.min(turn,diff)),sp=Math.hypot(b.vx,b.vy);b.vx=Math.cos(na)*sp;b.vy=Math.sin(na)*sp;}
  function burst(x,y,n,kind,dir){for(let i=0;i<n;i++){const a=dir!=null?dir+(Math.random()-0.5):Math.random()*7,sp=kind==='spark'?(2+Math.random()*3):(0.3+Math.random()*1.2);
    parts.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-(kind==='steam'?0.6:0),life:kind==='steam'?0.7:0.45,max:kind==='steam'?0.7:0.45,kind,r:kind==='steam'?(4+Math.random()*5):(1.5+Math.random()*2)});}}

  function updatePets(dt,f){if(!pets)return;
    for(const pet of pets){
      if(pet.kind==='falke'){pet.a+=0.05*f;const ox=Math.cos(pet.a)*46,oy=Math.sin(pet.a)*46;pet.x+=((player.x+ox)-pet.x)*0.2*f;pet.y+=((player.y+oy)-pet.y)*0.2*f;
        pet.t-=dt;if(pet.t<=0){let best=null,bd=330*330;for(const e of enemies){if(e.spawning>0)continue;const d=(e.x-pet.x)**2+(e.y-pet.y)**2;if(d<bd){bd=d;best=e;}}
          if(best){pet.t=0.7;const a=Math.atan2(best.y-pet.y,best.x-pet.x);bullets.push({x:pet.x,y:pet.y,vx:Math.cos(a)*8,vy:Math.sin(a)*8,r:4,damage:Math.max(5,player.damage*0.5),pierce:0,life:1.0,burns:false,big:false});burst(pet.x,pet.y,2,'spark',a);}else pet.t=0.2;}}
      else{const tx=player.x-Math.cos(player.aim)*30,ty=player.y-Math.sin(player.aim)*30;pet.x+=(tx-pet.x)*0.12*f;pet.y+=(ty-pet.y)*0.12*f;
        pet.t-=dt;if(pet.t<=0){let bit=false;for(const e of enemies){if(e.spawning>0)continue;if((e.x-pet.x)**2+(e.y-pet.y)**2<(e.r+22)**2){dmgEnemy(e,Math.max(7,player.damage*0.8));e.hit=0.08;burst(pet.x,pet.y,3,'spark');pet.t=0.6;bit=true;break;}}if(!bit)pet.t=0.12;}
        for(const pk of pickups){if(pk.kind==='cog'){const dx=pet.x-pk.x,dy=pet.y-pk.y,dd=dx*dx+dy*dy;if(dd<140*140){const dm=Math.sqrt(dd)||1;pk.x+=dx/dm*4*f;pk.y+=dy/dm*4*f;}}}}}
  }

  function ebShot(e,a,sp,r,dmg){const d=e.type==='boss'?dmg*(e.dmgScale||1):dmg;ebullets.push({x:e.x,y:e.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r,dmg:d,life:6});}
  function fan(e,aim,cnt,spr,sp,r,dmg){for(let i=0;i<cnt;i++)ebShot(e,aim+(i-(cnt-1)/2)*spr,sp,r,dmg);}
  function radial(e,cnt,off,sp,r,dmg){for(let i=0;i<cnt;i++)ebShot(e,off+i/cnt*Math.PI*2,sp,r,dmg);}
  function updateBoss(e,dt,p,ux,uy,dist,f){
    e.rot+=0.01*f;const aim=Math.atan2(p.y-e.y,p.x-e.x),V=e.variant,ss=e.slow>0?0.5:1;
    if(e.shield>0)e.shield-=dt;
    if(V==='kessel'){if(dist>180)moveSlide(e,ux*e.speed*ss,uy*e.speed*ss,f);if((e.t1-=dt*1000)<=0){e.t1=950;fan(e,aim,3,0.18,3.2,7,12);}if((e.t2-=dt*1000)<=0){e.t2=2800;radial(e,12,e.rot,2.6,6,10);if(enemies.length<9){spawnEnemy('crawler',false);spawnEnemy('crawler',false);}}}
    else if(V==='spindel'){if(e.dashT>0){e.dashT-=dt;moveSlide(e,e.dvx,e.dvy,f);}else{moveSlide(e,ux*e.speed*ss,uy*e.speed*ss,f);if((e.dashCd-=dt*1000)<=0&&dist<420){e.dashT=0.3;e.dvx=ux*6.5;e.dvy=uy*6.5;e.dashCd=2400;}}if((e.t1-=dt*1000)<=0){e.t1=110;e.spiralA+=0.5;ebShot(e,e.spiralA,3.0,6,9);ebShot(e,e.spiralA+Math.PI,3.0,6,9);}}
    else if(V==='fabrik'){moveSlide(e,ux*e.speed*0.5*ss,uy*e.speed*0.5*ss,f);if((e.t1-=dt*1000)<=0){e.t1=1300;ebShot(e,aim,2.4,11,18);}if((e.t2-=dt*1000)<=0){e.t2=2600;e.shield=1.4;for(let k=0;k<3;k++)spawnEnemy(Math.random()<0.4?'charger':'crawler',false);}}
    else if(V==='uhrturm'){if(dist>240)moveSlide(e,ux*e.speed*ss,uy*e.speed*ss,f);if((e.t1-=dt*1000)<=0){e.t1=120;e.handA+=0.3;ebShot(e,e.handA,2.8,6,10);ebShot(e,e.handA+Math.PI,2.8,6,10);}if((e.t2-=dt*1000)<=0){e.t2=3800;radial(e,16,0,2.4,6,9);}}
    else if(V==='koloss'){if(dist>150)moveSlide(e,ux*e.speed*ss,uy*e.speed*ss,f);if((e.t1-=dt*1000)<=0){e.t1=2400;radial(e,22,e.rot,2.3,7,12);radial(e,22,e.rot+0.14,1.6,7,12);shake=Math.min(18,shake+10);}if((e.t2-=dt*1000)<=0){e.t2=1500;fan(e,aim,4,0.16,3.0,7,11);}}
    else if(V==='schwarm'){moveSlide(e,ux*e.speed*ss,uy*e.speed*ss,f);if((e.t1-=dt*1000)<=0){e.t1=1600;for(let k=0;k<3;k++)spawnEnemy('swarmling',false);}if((e.t2-=dt*1000)<=0){e.t2=900;fan(e,aim,6,0.22,2.8,6,9);}}
    else if(V==='brenner'){if(dist>200)moveSlide(e,ux*e.speed*ss,uy*e.speed*ss,f);if((e.t1-=dt*1000)<=0){e.t1=60;e.handA+=0.05;fan(e,aim+Math.sin(e.handA)*0.5,3,0.12,3.0,6,9);}if((e.t2-=dt*1000)<=0){e.t2=3000;radial(e,14,e.rot,2.2,7,10);}}
    else if(V==='zerleger'){if(e.dashT>0){e.dashT-=dt;moveSlide(e,e.dvx,e.dvy,f);}else{moveSlide(e,ux*e.speed*ss,uy*e.speed*ss,f);if((e.dashCd-=dt*1000)<=0&&dist<480){e.dashT=0.32;e.dvx=ux*7.2;e.dvy=uy*7.2;e.dashCd=1900;radial(e,6,e.rot,3.0,7,12);}}
      if((e.t1-=dt*1000)<=0){e.t1=820;e.rot+=0.5;radial(e,4,e.rot,3.2,6,11);radial(e,4,e.rot+0.785,2.3,6,11);}
      if((e.t2-=dt*1000)<=0){e.t2=2800;if(enemies.length<10){for(let k=0;k<3;k++)spawnEnemy('swarmling',false);}fan(e,aim,5,0.16,3.0,7,12);}}
    else if(V==='herzwerk'){const fr=e.hp/e.maxHp,ph=fr>0.66?1:fr>0.33?2:3;moveSlide(e,ux*e.speed*(ph===3?1.4:1)*ss,uy*e.speed*(ph===3?1.4:1)*ss,f);
      if(ph===1){if((e.t1-=dt*1000)<=0){e.t1=850;fan(e,aim,5,0.14,3.0,6,11);}if((e.t2-=dt*1000)<=0){e.t2=2500;radial(e,14,e.rot,2.6,6,10);}}
      else if(ph===2){if((e.t1-=dt*1000)<=0){e.t1=110;e.spiralA+=0.42;ebShot(e,e.spiralA,3.0,6,10);ebShot(e,e.spiralA+2.09,3.0,6,10);ebShot(e,e.spiralA+4.18,3.0,6,10);}if((e.t2-=dt*1000)<=0){e.t2=2800;spawnEnemy('charger',false);spawnEnemy('bomber',false);}}
      else{if((e.t1-=dt*1000)<=0){e.t1=85;e.spiralA+=0.5;ebShot(e,e.spiralA,3.4,6,11);ebShot(e,e.spiralA+Math.PI,3.4,6,11);}if((e.t2-=dt*1000)<=0){e.t2=1500;radial(e,20,e.rot,3.0,6,11);}if((e.t3-=dt*1000)<=0){e.t3=2200;fan(e,aim,7,0.12,3.6,7,12);}}}
    clampArena(e);
  }

  // ---------- Update ----------
  function update(dt){
    if(paused)return;const f=dt*60,now=performance.now(),p=player;
    let ix=(keys['d']?1:0)-(keys['a']?1:0),iy=(keys['s']?1:0)-(keys['w']?1:0);
    // Pad-Bewegung
    if(inputMode==='pad'){ix=Pad.lx;iy=Pad.ly;}
    const ml=Math.hypot(ix,iy)||1;const moveMag=Math.min(1,Math.hypot(ix,iy));
    if(p.dashT>0){p.dashT-=dt;moveSlide(p,p.dvx,p.dvy,f);parts.push({x:p.x,y:p.y,vx:0,vy:0,life:0.3,max:0.3,kind:'trail',r:p.r*0.9});
      if(p.oiltrail&&(oilZones.length===0||(p.x-oilZones[oilZones.length-1].x)**2+(p.y-oilZones[oilZones.length-1].y)**2>16*16))oilZones.push({x:p.x,y:p.y,r:26,life:2.2,max:2.2});}
    else{moveSlide(p,(ix/ml)*p.speed*moveMag,(iy/ml)*p.speed*moveMag,f);if(p.dashCd>0)p.dashCd-=dt;
      if(dashReq&&p.dashCd<=0){let dx,dy;if(moveMag>0.1){dx=ix/ml;dy=iy/ml;}else{dx=Math.cos(p.aim);dy=Math.sin(p.aim);}p.dashT=0.18;p.dvx=dx*9;p.dvy=dy*9;p.iframe=Math.max(p.iframe,0.3);p.dashCd=p.dashMax;Audio.dash();}}
    dashReq=false;
    // Zielen
    if(inputMode==='pad'){const rm=Math.hypot(Pad.rx,Pad.ry);if(rm>0.25)p.aim=Math.atan2(Pad.ry,Pad.rx);else if(moveMag>0.2)p.aim=Math.atan2(iy,ix);}
    else p.aim=Math.atan2(my-p.y,mx-p.x);
    p.vx=(p.x-p.lastX)/Math.max(dt,0.001);p.vy=(p.y-p.lastY)/Math.max(dt,0.001);p.lastX=p.x;p.lastY=p.y;
    p.charge=Math.min(1,p.charge+p.chargeRate*dt);
    if(specialReq){if(p.charge>=1){bomb();p.charge=0;}}specialReq=false;
    p.heat=Math.max(0,p.heat-p.coolRate*dt);if(p.overheated&&p.heat<=0)p.overheated=false;
    const padFire=inputMode==='pad'&&(Math.hypot(Pad.rx,Pad.ry)>0.5||Pad.rt>0.4);
    const firing=(mdown||padFire)&&!p.overheated;
    if(firing)p.flywheel=Math.min(1.4,p.flywheel+dt);else if(!(p.overheated&&p.syn.perpetuum))p.flywheel=Math.max(0,p.flywheel-dt*2);
    if(firing&&now-p.lastShot>p.fireRate)fire(now);
    if(p.iframe>0)p.iframe-=dt;
    if(hasR('herz')){p.heartTimer-=dt;if(p.heartTimer<=0){p.heartTimer=5;p.hp=Math.min(p.maxHp,p.hp+12);burst(p.x,p.y,8,'steam');}}
    if(hasR('schild')&&!p.shielded){p.shieldCd-=dt;if(p.shieldCd<=0)p.shielded=true;}
    for(const v of grid.vents)if(ventActive(v,now)&&(v.x-p.x)**2+(v.y-p.y)**2<(grid.tile*0.55)**2&&p.iframe<=0)p.hp-=16*dt;

    if(!grid.isBoss&&grid.reserve>0){grid.spawnTimer-=dt;if(grid.spawnTimer<=0&&enemies.length<grid.maxAlive){const batch=Math.min(grid.reserve,1+Math.floor(room/6));for(let k=0;k<batch;k++){const t=pickType();spawnEnemy(t,true);}grid.reserve-=batch;grid.spawnTimer=Math.max(1.3,3.0-room*0.05);}}

    // Biom-Hazard: Schmelzkammer wirft Lava-Pfützen
    if(grid.biome&&grid.biome.hazardType==='lava'&&!grid.isWerkstatt){grid.bzTimer=(grid.bzTimer==null?3:grid.bzTimer)-dt;if(grid.bzTimer<=0){grid.bzTimer=2.5+Math.random()*2;const t=grid.floor[(Math.random()*grid.floor.length)|0],c=tileCenter(t);hazards.push({x:c.x,y:c.y,r:62,timer:1.4,max:1.4,dmg:18});}}
    // Biom-Mechanik
    const fx=grid.biome?grid.biome.fx:null;
    if(fx&&!grid.isWerkstatt){
      if(fx==='kessel')p.charge=Math.min(1,p.charge+0.02*dt);
      else if(fx==='frost')p.heat=Math.max(0,p.heat-p.coolRate*0.5*dt);
      else if(fx==='aether'){const dr=Math.pow(0.55,dt);for(const b of ebullets){b.vx*=dr;b.vy*=dr;}}
      else if(fx==='rost'){for(const e of enemies){if(e.type==='boss'||e.spawning>0||e.shield>0)continue;e.hp-=(2+room*0.3)*dt;}}
      else if(fx==='saeure'){for(const e of enemies){if(e.type==='boss'||e.spawning>0||e.shield>0)continue;e.hp-=(4+room*0.5)*dt;if(Math.random()<0.05*f)burst(e.x,e.y,1,'spark');}}
      else if(fx==='dampf'){grid.fxTimer=(grid.fxTimer==null?3:grid.fxTimer)-dt;if(grid.fxTimer<=0){grid.fxTimer=3.5;for(const e of enemies){if(e.type==='boss')continue;const dx=e.x-p.x,dy=e.y-p.y,d=Math.hypot(dx,dy)||1;if(d<260){moveSlide(e,dx/d*46,dy/d*46,1);clampArena(e);}}burst(p.x,p.y,16,'steam');shake=Math.min(12,shake+5);}}
      else if(fx==='glut'){grid.fxTimer=(grid.fxTimer==null?2:grid.fxTimer)-dt;if(grid.fxTimer<=0){grid.fxTimer=1.6+Math.random();const t=grid.floor[(Math.random()*grid.floor.length)|0],c=tileCenter(t);hazards.push({x:c.x,y:c.y,r:78,timer:1.2,max:1.2,dmg:24});}}
      else if(fx==='kristall'){grid.fxTimer=(grid.fxTimer==null?8:grid.fxTimer)-dt;if(grid.fxTimer<=0){grid.fxTimer=10;const t=grid.floor[(Math.random()*grid.floor.length)|0],c=tileCenter(t);pickups.push({x:c.x,y:c.y,r:9,kind:'hp',val:18});}}
      else if(fx==='tiefsee'){for(const pk of pickups){if(pk.kind!=='cog')continue;const dx=p.x-pk.x,dy=p.y-pk.y,d=Math.hypot(dx,dy)||1;pk.x+=dx/d*1.4*f;pk.y+=dy/d*1.4*f;}}
    }

    computeFlow();updatePets(dt,f);

    for(let i=bullets.length-1;i>=0;i--){const b=bullets[i];
      if(p.homing||(b.big&&p.syn.zielsuche))steer(b,(b.big&&p.syn.zielsuche?0.16:0.06)*f);
      b.x+=b.vx*f;b.y+=b.vy*f;b.life-=dt;
      if(b.life<=0||isWallW(b.x,b.y)){if(b.life>0)burst(b.x,b.y,2,'spark');bullets.splice(i,1);continue;}
      for(const e of enemies){if(e.spawning>0)continue;if((b.x-e.x)**2+(b.y-e.y)**2<(b.r+e.r)**2){
        if(e.type==='waechter'&&!(e.shieldBroken>0)&&Math.abs(angDiff(Math.atan2(b.y-e.y,b.x-e.x),e.face))<1.1){burst(b.x,b.y,3,'spark');bullets.splice(i,1);break;}
        let d=b.damage;const crit=p.crit>0&&Math.random()<p.crit;if(crit)d*=2;
        dmgEnemy(e,d);if(e.shield<=0)popNum(e.x,e.y-e.r,d,crit);burst(b.x,b.y,crit?5:3,'spark');
        if(e.shield<=0){if(hasR('brennkammer')||b.burns)applyBurn(e);if(hasR('aether'))chainFrom(e,b.damage);if(hasR('frost'))e.slow=Math.max(e.slow,1.2);}
        if(b.pierce>0){b.pierce--;b.damage*=0.7;}else bullets.splice(i,1);break;}}}

    for(let i=enemies.length-1;i>=0;i--){const e=enemies[i];if(e.hit>0)e.hit-=dt;e.eye+=dt;if(e.slow>0)e.slow-=dt;if(e.boost>0)e.boost-=dt;if(e.shieldBroken>0)e.shieldBroken-=dt;
      if(e.burnT>0){e.burnT-=dt;if(e.shield<=0){e.hp-=e.burnDps*dt;if(Math.random()<0.3*f)burst(e.x+(Math.random()-0.5)*e.r,e.y,1,'spark');}}
      if(e.spawning>0){e.spawning-=dt;if(e.hp<=0){killEnemy(e);enemies.splice(i,1);}continue;}
      const ss=(e.slow>0?0.5:1)*(e.boost>0?1.35:1),adx=p.x-e.x,ady=p.y-e.y,dist=Math.hypot(adx,ady)||1,ux=adx/dist,uy=ady/dist;
      if(e.type==='boss')updateBoss(e,dt,p,ux,uy,dist,f);
      else if(e.type==='spitter'){if(dist>e.range+40)navigate(e,ux,uy,ss,f);else if(dist<e.range-40)moveSlide(e,-ux*e.speed*ss,-uy*e.speed*ss,f);else moveSlide(e,-uy*e.speed*0.5*ss,ux*e.speed*0.5*ss,f);if((e.fireTimer-=dt*1000)<=0&&los(e.x,e.y,p.x,p.y)){e.fireTimer=e.fireEvery||1300;ebullets.push({x:e.x,y:e.y,vx:ux*3.3,vy:uy*3.3,r:6,dmg:11,life:3});}}
      else if(e.type==='turret'){if((e.fireTimer-=dt*1000)<=0&&los(e.x,e.y,p.x,p.y)){e.fireTimer=e.fireEvery||1000;ebullets.push({x:e.x,y:e.y,vx:ux*3.6,vy:uy*3.6,r:6,dmg:12,life:3.5});}}
      else if(e.type==='charger'){if(e.dashing>0){e.dashing-=dt;const bx=e.x,by=e.y;moveSlide(e,e.dvx,e.dvy,f);if(e.x===bx&&e.y===by){e.dashing=0;burst(e.x,e.y,4,'spark');}}else{e.dashCd-=dt*1000;if(los(e.x,e.y,p.x,p.y)&&dist<360&&e.dashCd<=0){e.windup+=dt;if(e.windup>0.45){const a=Math.atan2(p.y+p.vy*0.15-e.y,p.x+p.vx*0.15-e.x);e.dashing=0.34;e.dvx=Math.cos(a)*8;e.dvy=Math.sin(a)*8;e.windup=0;e.dashCd=1500;}}else{e.windup=0;navigate(e,ux,uy,ss,f);}}}
      else if(e.type==='drohne'){e.x+=ux*e.speed*ss*f;e.y+=uy*e.speed*ss*f;clampArena(e);}
      else if(e.type==='waechter'){e.face+=Math.max(-2.0*dt,Math.min(2.0*dt,angDiff(Math.atan2(ady,adx),e.face)));navigate(e,ux,uy,ss,f);}
      else if(e.type==='mechaniker'){if(dist>e.range+40)navigate(e,ux,uy,ss,f);else if(dist<e.range-40)moveSlide(e,-ux*e.speed*ss,-uy*e.speed*ss,f);else moveSlide(e,-uy*e.speed*0.5*ss,ux*e.speed*0.5*ss,f);
        if((e.fireTimer-=dt*1000)<=0){e.fireTimer=2200;for(const o of enemies){if(o===e||o.type==='boss'||o.spawning>0)continue;if(o.hp<o.maxHp&&(o.x-e.x)**2+(o.y-e.y)**2<160*160){o.hp=Math.min(o.maxHp,o.hp+12);chains.push({x1:e.x,y1:e.y,x2:o.x,y2:o.y,life:0.3,col:'#7ec96b'});}}burst(e.x,e.y,6,'steam');}}
      else if(e.type==='verstaerker'){if(dist>e.range+40)navigate(e,ux,uy,ss,f);else if(dist<e.range-40)moveSlide(e,-ux*e.speed*ss,-uy*e.speed*ss,f);else moveSlide(e,-uy*e.speed*0.5*ss,ux*e.speed*0.5*ss,f);
        if((e.fireTimer-=dt*1000)<=0){e.fireTimer=2600;let any=false;for(const o of enemies){if(o===e||o.type==='boss'||o.spawning>0)continue;if((o.x-e.x)**2+(o.y-e.y)**2<200*200){o.boost=Math.max(o.boost||0,3.0);if(o.fireEvery)o.fireTimer=Math.min(o.fireTimer,250);chains.push({x1:e.x,y1:e.y,x2:o.x,y2:o.y,life:0.3,col:'#ff9a3c'});any=true;}}if(any)burst(e.x,e.y,6,'spark');}}
      else if(e.type==='moerser'){if(dist>e.range+50)navigate(e,ux,uy,ss,f);else if(dist<e.range-50)moveSlide(e,-ux*e.speed*ss,-uy*e.speed*ss,f);
        if((e.t1-=dt*1000)<=0){e.t1=3000;const tx=p.x+p.vx*0.5,ty=p.y+p.vy*0.5;hazards.push({x:tx,y:ty,r:72,timer:1.1,max:1.1,dmg:22});}}
      else navigate(e,ux,uy,ss,f);
      pushOutOfPlayer(e);
      for(const v of grid.vents)if(ventActive(v,now)&&(v.x-e.x)**2+(v.y-e.y)**2<(grid.tile*0.55)**2&&e.shield<=0)e.hp-=16*dt;
      if(p.iframe<=0&&(e.x-p.x)**2+(e.y-p.y)**2<(e.r+p.r)**2){hurt(e.contact);if(hasR('dornen')){const td=18+p.damage*0.8;dmgEnemy(e,td);if(p.syn.igelpresse)aoe(p.x,p.y,80,td*0.6,'#9be0ff',0,false,false);}}
      if(e.hp<=0){killEnemy(e);enemies.splice(i,1);}}

    // Ölspur-Zonen: kontinuierlicher Schaden, mit Synergien
    for(let i=oilZones.length-1;i>=0;i--){const z=oilZones[i];z.life-=dt;if(z.life<=0){oilZones.splice(i,1);continue;}
      for(const e of enemies){if(e.spawning>0||e.shield>0)continue;if((e.x-z.x)**2+(e.y-z.y)**2<(z.r+e.r)**2){e.hp-=(8+p.damage*0.4)*dt;e.hit=Math.max(e.hit||0,0.05);
        if(hasR('brennkammer')||p.syn.brandspur)applyBurn(e);if(p.syn.frostspur||hasR('frost'))e.slow=Math.max(e.slow,p.syn.frostspur?1.4:1.0);}}}

    for(let i=ebullets.length-1;i>=0;i--){const b=ebullets[i];b.x+=b.vx*f;b.y+=b.vy*f;b.life-=dt;
      if(b.life<=0||isWallW(b.x,b.y)){ebullets.splice(i,1);continue;}
      if(p.iframe<=0&&(b.x-p.x)**2+(b.y-p.y)**2<(b.r+p.r)**2){hurt(b.dmg);ebullets.splice(i,1);}}

    for(let i=hazards.length-1;i>=0;i--){const hz=hazards[i];hz.timer-=dt;if(hz.timer<=0){if(p.iframe<=0&&(hz.x-p.x)**2+(hz.y-p.y)**2<hz.r*hz.r)hurt(hz.dmg);burst(hz.x,hz.y,16,'spark');Audio.explo();shake=Math.min(14,shake+6);hazards.splice(i,1);}}

    for(let i=pickups.length-1;i>=0;i--){const pk=pickups[i],ddx=p.x-pk.x,ddy=p.y-pk.y,d=Math.hypot(ddx,ddy)||1;
      if(d<p.magnet){pk.x+=ddx/d*Math.min(6,d)*f*0.5;pk.y+=ddy/d*Math.min(6,d)*f*0.5;}
      if(d<p.r+pk.r+4){if(pk.kind==='cog'){cogsRun+=pk.val;Audio.cog();if(p.cogHeal)p.hp=Math.min(p.maxHp,p.hp+1);}else{p.hp=Math.min(p.maxHp,p.hp+pk.val);burst(pk.x,pk.y,6,'steam');}pickups.splice(i,1);}}

    for(let i=shocks.length-1;i>=0;i--){const s=shocks[i];s.r+=(s.max-s.r)*0.25;s.life-=dt;if(s.life<=0)shocks.splice(i,1);}
    for(let i=chains.length-1;i>=0;i--){chains[i].life-=dt;if(chains[i].life<=0)chains.splice(i,1);}
    for(let i=parts.length-1;i>=0;i--){const q=parts[i];q.x+=q.vx*f;q.y+=q.vy*f;q.vx*=0.94;q.vy*=0.94;q.life-=dt;if(q.kind==='steam'){q.vy-=0.02*f;q.r+=0.15*f;}if(q.life<=0)parts.splice(i,1);}
    if(shake>0)shake-=dt*40;for(const g of decoGears)g.rot+=g.spin*f;
    if(p.hp<=0){if(p.revives>0){p.revives--;p.hp=p.maxHp*0.5;p.iframe=1.5;enemies.length=0;grid.reserve=0;burst(p.x,p.y,20,'steam');openChoice();}else die();return;}
    if(enemies.length===0&&(grid.isBoss||grid.reserve<=0)){if(clearTimer<0)clearTimer=0.55;else{clearTimer-=dt;if(clearTimer<=0){if(grid.isEndboss)victory();else openChoice();}}}
  }
  function hurt(dmg){const p=player;dmg*=pressDmgMul*(1+(room-1)*0.08);if(p.shielded){p.shielded=false;p.shieldCd=10;p.iframe=0.6+p.iframeBonus;burst(p.x,p.y,12,'steam');if(p.syn.stachelschild)aoe(p.x,p.y,120,20+p.damage*0.5,'#9be0ff',0,false,false);return;}
    p.hp-=dmg;p.iframe=0.65+p.iframeBonus;shake=Math.min(14,shake+7);burst(p.x,p.y,5,'spark');Audio.hurt();}
  function killEnemy(e){if(!challengeMode){meta.stats.kills++;if(e.type==='boss'){meta.stats.bosses++;if(grid.isEndboss)meta.stats.endboss=1;}}if(e.type==='boss')Audio.explo();else Audio.kill();
    hitstop=Math.max(hitstop,e.type==='boss'?0.12:0.04);
    burst(e.x,e.y,e.type==='boss'?30:8,'spark');shake=Math.min(16,shake+(e.type==='boss'?12:2));
    if(hasR('kuehlkreis')){player.heat=Math.max(0,player.heat-14);if(player.overheated&&player.heat<=0)player.overheated=false;}
    if(hasR('vampir'))player.hp=Math.min(player.maxHp,player.hp+3);
    player.charge=Math.min(1,player.charge+0.025);
    if(hasR('explosiv'))aoe(e.x,e.y,88,player.damage*1.0,'#ff9a3c',0,!!player.syn.splitterfrost,!!player.syn.brandsatz);
    if(hasR('schrapnell')){for(let k=0;k<6;k++){const a=k/6*Math.PI*2;bullets.push({x:e.x,y:e.y,vx:Math.cos(a)*5,vy:Math.sin(a)*5,r:4,damage:player.damage*0.45,pierce:0,life:0.5,burns:!!player.syn.streufeuer,big:false});}}
    if(e.explodes||e.type==='bomber'){for(let k=0;k<10;k++){const a=k/10*Math.PI*2;ebullets.push({x:e.x,y:e.y,vx:Math.cos(a)*3,vy:Math.sin(a)*3,r:6,dmg:12,life:2});}burst(e.x,e.y,14,'spark');Audio.explo();}
    const [lo,hi]=e.drop;let total=Math.round((lo+((Math.random()*(hi-lo+1))|0))*player.cogMult*pressCogMul);if(e.elite)total*=2;const k=Math.min(total,8);
    if(!endless)for(let i=0;i<k;i++)pickups.push({x:e.x+(Math.random()-0.5)*20,y:e.y+(Math.random()-0.5)*20,r:7,kind:'cog',val:Math.ceil(total/k)});
    if(Math.random()<(e.type==='boss'?1:e.elite?0.2:0.07))pickups.push({x:e.x,y:e.y,r:9,kind:'hp',val:e.type==='boss'?60:20});}

  function die(){lastBank=cogsRun;
    if(challengeMode){submitScore(room,cogsRun);}
    else{meta.cogs+=cogsRun;meta.stats.deaths++;meta.stats.bestRoom=Math.max(meta.stats.bestRoom,room);meta.stats.cogsTotal+=lastBank;saveMeta(meta);}
    clearSave();Audio.dead();state='dead';renderEnd(false);show('death');}
  function victory(){
    lastBank=cogsRun;
    const keyLvl=runPress+1;
    if(!challengeMode){
      meta.cogs+=cogsRun;
      meta.stats.bestRoom=Math.max(meta.stats.bestRoom,room);meta.stats.cogsTotal+=lastBank;meta.stats.endboss=1;
      meta.keys=meta.keys||[];meta.keys.push(keyLvl);
      saveMeta(meta);
    }
    cogsRun=0;clearSave();Audio.win();state='victory';renderEnd(true,keyLvl);show('death');
  }
  function submitScore(rm,cogs){const score=rm*1000+Math.min(cogs,999);fetch('/api/score',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({score,room:rm,cogs})}).catch(()=>{});}
  function revive(){if(challengeMode||state!=='dead')return;player.hp=Math.round(player.maxHp*0.5);player.overheated=false;player.heat=0;player.iframe=1.5;state='play';show(null);}
  function computeSyn(){player.syn={};const a=[];for(const s of SYNERGIES)if(s.req.every(r=>player.relics.has(r))){player.syn[s.id]=true;a.push(s);}return a;}
