"use strict";
  function syncToServer(){const meta=JSON.parse(localStorage.getItem('steamguard_meta')||'null');const run=JSON.parse(localStorage.getItem('steamguard_run')||'null');fetch('/api/save',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:{meta,run}})}).catch(()=>{});}
(async()=>{
  try{
    const r=await fetch('/api/save',{credentials:'same-origin'});
    if(r.ok){
      const j=await r.json();
      if(j&&j.data){
        if(j.data.meta)localStorage.setItem('steamguard_meta',JSON.stringify(j.data.meta));
        if(j.data.run)localStorage.setItem('steamguard_run',JSON.stringify(j.data.run));else localStorage.removeItem('steamguard_run');
      }
    }
  }catch(e){}
})();
  function defaultMeta(){return{cogs:0,vit:0,pow:0,ign:0,cool:0,coll:0,reroll:0,phoenix:0,pierceM:0,bspeed:0,critM:0,heatcap:0,magnetM:0,auftakt:0,dash:0,tank:0,pets:{falke:0,hund:0},cosmetics:['messing'],skin:'messing',muted:0,vol:0.5,uiscale:1,lastPress:0,keys:[],unlockedPress:0,stats:{kills:0,runs:0,deaths:0,bestRoom:0,bestPress:0,bosses:0,endboss:0,cogsTotal:0}};}
  let _mem={};
  function loadMeta(){try{const v=localStorage.getItem('steamguard_meta')||localStorage.getItem('zahnwerk_meta');const m=Object.assign(defaultMeta(),v?JSON.parse(v):{});if(!m.pets)m.pets={falke:0,hund:0};if(!m.cosmetics)m.cosmetics=['messing'];if(!m.skin)m.skin='messing';if(!m.keys)m.keys=[];if(m.unlockedPress==null)m.unlockedPress=0;m.stats=Object.assign({kills:0,runs:0,deaths:0,bestRoom:0,bestPress:0,bosses:0,endboss:0,cogsTotal:0},m.stats||{});return m;}catch(e){return Object.assign(defaultMeta(),_mem.meta||{});}}
  function saveMeta(m){try{localStorage.setItem('steamguard_meta',JSON.stringify(m));}catch(e){_mem.meta=m;}syncToServer();}
  function hasSave(){try{return !!localStorage.getItem('steamguard_run');}catch(e){return !!_mem.run;}}
  function loadSave(){try{const v=localStorage.getItem('steamguard_run');return v?JSON.parse(v):null;}catch(e){return _mem.run||null;}}
  function writeSave(o){try{localStorage.setItem('steamguard_run',JSON.stringify(o));}catch(e){_mem.run=o;}syncToServer();}
  function clearSave(){try{localStorage.removeItem('steamguard_run');}catch(e){_mem.run=null;}syncToServer();}
  function saveRunSnapshot(){
    if(!player||!grid)return;
    const s={
      challengeMode,room,cogsRun,runPress,rerollsLeft,
      cells:grid.cells.map(r=>r.slice()),cols:grid.cols,rows:grid.rows,tile:grid.tile,ox:grid.ox,oy:grid.oy,
      vents:grid.vents.map(v=>({c:v.c,r:v.r,phase:v.phase,x:v.x,y:v.y})),
      isBoss:!!grid.isBoss,isEndboss:!!grid.isEndboss,isWerkstatt:!!grid.isWerkstatt,reserve:grid.reserve,maxAlive:grid.maxAlive,
      biome:BIOMES.indexOf(grid.biome),
      p:{x:player.x,y:player.y,r:player.r,speed:player.speed,hp:player.hp,maxHp:player.maxHp,damage:player.damage,
         fireRate:player.fireRate,projectiles:player.projectiles,spread:player.spread,pierce:player.pierce,bulletSpeed:player.bulletSpeed,
         heat:player.heat,maxHeat:player.maxHeat,heatPerShot:player.heatPerShot,coolRate:player.coolRate,
         cogMult:player.cogMult,healPerRoom:player.healPerRoom,revives:player.revives,iframeBonus:player.iframeBonus,
         relics:[...player.relics],twin:!!player.twin,magnet:player.magnet,cogHeal:!!player.cogHeal,noSpread:!!player.noSpread,
         crit:player.crit,homing:!!player.homing,heartTimer:player.heartTimer,charge:player.charge,oiltrail:!!player.oiltrail,
         chargeRate:player.chargeRate,bombDmgMul:player.bombDmgMul,dashMax:player.dashMax}
    };
    writeSave(s);
  }
  function applyRunSnapshot(s){
    challengeMode=!!s.challengeMode;
    player=makePlayer();
    // Vollständige Spielerzustände aus Save übernehmen
    Object.assign(player,s.p);
    player.relics=new Set(s.p.relics||[]);
    player.skin=COSMETICS.find(c=>c.id===meta.skin)||COSMETICS[0];
    player.lastX=player.x;player.lastY=player.y;player.vx=0;player.vy=0;player.aim=0;
    player.iframe=0;player.flywheel=0;player.shotCount=0;
    player.shielded=false;player.shieldCd=10;player.dashT=0;player.dashCd=0;player.dvx=0;player.dvy=0;
    player.overheated=false;player.lastShot=0;
    computeSyn();
    runPress=s.runPress||0;pressHpMul=1+runPress*0.12;pressDmgMul=1+runPress*0.08;pressBossMul=1+runPress*0.18;pressCogMul=1+runPress*0.18;
    room=s.room;cogsRun=s.cogsRun||0;rerollsLeft=s.rerollsLeft||0;
    bullets=[];ebullets=[];enemies=[];pickups=[];parts=[];shocks=[];chains=[];hazards=[];oilZones=[];pets=[];shake=0;
    {const m=challengeMode?CH_BASE:meta;
    if(m.pets&&m.pets.falke)pets.push({kind:'falke',x:player.x,y:player.y,a:0,t:0});
    if(m.pets&&m.pets.hund)pets.push({kind:'hund',x:player.x,y:player.y,a:0,t:0});}
    decoGears=Array.from({length:6},()=>({x:Math.random()*W,y:Math.random()*H,r:60+Math.random()*120,teeth:8+((Math.random()*6)|0),rot:Math.random()*7,spin:(Math.random()-0.5)*0.0015}));
    grid={cols:s.cols,rows:s.rows,tile:s.tile,ox:s.ox,oy:s.oy,cells:s.cells.map(r=>r.slice()),vents:s.vents.map(v=>({...v})),floor:[],flow:null,biome:BIOMES[s.biome]||BIOMES[0],isBoss:s.isBoss,isEndboss:s.isEndboss,isWerkstatt:s.isWerkstatt,reserve:0,maxAlive:s.maxAlive||18,spawnTimer:2.4};
    for(let r=0;r<grid.rows;r++)for(let c=0;c<grid.cols;c++)if(grid.cells[r][c]===0)grid.floor.push({r,c});
    // Werkstatt wird nicht via Save reaktiviert (sie ist transient) — als Kampfraum re-populieren
    if(grid.isWerkstatt){grid.isWerkstatt=false;}
    if(grid.isBoss)spawnBoss();
    else{const total=Math.min(26,5+Math.floor(room*1.3));const initial=Math.min(total,6+Math.floor(room*0.3));grid.reserve=total-initial;
      let placed=0,guard=0;while(placed<initial&&guard++<200){const t=pickType();if(t==='swarmling'){const n=Math.min(3,initial-placed);for(let k=0;k<n;k++)spawnEnemy('swarmling',false);placed+=n;}else{spawnEnemy(t,false);placed++;}}}
    clearTimer=-1;renderTray();paused=false;state='play';show(null);
  }
  function resumeRun(){const s=loadSave();if(!s)return;applyRunSnapshot(s);}
