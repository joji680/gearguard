"use strict";
  // ---------- Rendering ----------
  function gear(x,y,r,teeth,rot,fill,stroke,hole){ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.beginPath();const n=teeth*2;
    for(let i=0;i<=n;i++){const a=i/n*Math.PI*2,rr=i%2?r*0.78:r;ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}ctx.closePath();
    if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.lineWidth=2;ctx.strokeStyle=stroke;ctx.stroke();}if(hole){ctx.beginPath();ctx.arc(0,0,r*0.32,0,7);ctx.fillStyle=hole;ctx.fill();}ctx.restore();}
  function drawArena(now){const {cols,rows,tile,ox,oy,cells,biome}=grid;ctx.fillStyle=biome.floor;ctx.fillRect(ox,oy,cols*tile,rows*tile);
    for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const x=ox+c*tile,y=oy+r*tile;
      if(cells[r][c]===1){ctx.fillStyle=biome.wall;ctx.fillRect(x,y,tile,tile);ctx.fillStyle=biome.wtop;ctx.fillRect(x+2,y+2,tile-4,4);ctx.strokeStyle='#0c0805';ctx.lineWidth=2;ctx.strokeRect(x+1,y+1,tile-2,tile-2);
        ctx.fillStyle='rgba(232,193,112,.30)';[[6,6],[tile-8,6],[6,tile-8],[tile-8,tile-8]].forEach(([rx,ry])=>{ctx.beginPath();ctx.arc(x+rx,y+ry,1.6,0,7);ctx.fill();});}
      else{ctx.fillStyle=(r+c)%2?'rgba(255,230,180,.020)':'rgba(0,0,0,.10)';ctx.fillRect(x,y,tile,tile);}}
    for(const v of grid.vents){const act=ventActive(v,now);ctx.save();ctx.translate(v.x,v.y);ctx.strokeStyle='#6b4f2a';ctx.lineWidth=2;for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(i*7,-tile*0.32);ctx.lineTo(i*7,tile*0.32);ctx.stroke();}
      if(act){const g=ctx.createLinearGradient(0,0,0,-tile*1.6);g.addColorStop(0,'rgba(220,210,200,.5)');g.addColorStop(1,'rgba(220,210,200,0)');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(-tile*0.3,0);ctx.lineTo(tile*0.3,0);ctx.lineTo(tile*0.18,-tile*1.6);ctx.lineTo(-tile*0.18,-tile*1.6);ctx.fill();ctx.fillStyle='rgba(255,154,60,.5)';ctx.beginPath();ctx.arc(0,0,5,0,7);ctx.fill();}ctx.restore();}
    ctx.strokeStyle='#7a5a2c';ctx.lineWidth=4;ctx.strokeRect(ox,oy,cols*tile,rows*tile);}
  function drawBoss(e,now){const V=e.variant;ctx.save();ctx.translate(e.x,e.y);
    if(V==='spindel'){ctx.rotate(e.rot*4);ctx.strokeStyle='#c89b5a';ctx.lineWidth=5;for(let k=0;k<6;k++){const a=k/6*Math.PI*2;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*e.r,Math.sin(a)*e.r);ctx.stroke();ctx.beginPath();ctx.arc(Math.cos(a)*e.r,Math.sin(a)*e.r,5,0,7);ctx.fillStyle='#5a4326';ctx.fill();}ctx.rotate(-e.rot*4);}
    else if(V==='fabrik'){ctx.fillStyle='#2e2117';ctx.fillRect(-e.r,-e.r*0.7,e.r*2,e.r*1.4);ctx.fillStyle='#3a2a1a';ctx.fillRect(-e.r*0.6,-e.r*1.1,e.r*0.35,e.r*0.5);ctx.fillRect(e.r*0.25,-e.r*1.1,e.r*0.35,e.r*0.5);ctx.strokeStyle='#c89b5a';ctx.lineWidth=2;ctx.strokeRect(-e.r,-e.r*0.7,e.r*2,e.r*1.4);}
    else if(V==='koloss'){ctx.beginPath();for(let k=0;k<=6;k++){const a=k/6*Math.PI*2+e.rot*0.3;ctx.lineTo(Math.cos(a)*e.r,Math.sin(a)*e.r);}ctx.closePath();ctx.fillStyle='#3a3026';ctx.fill();ctx.strokeStyle='#c89b5a';ctx.lineWidth=4;ctx.stroke();ctx.fillStyle='#5a4326';for(let k=0;k<6;k++){const a=k/6*Math.PI*2+e.rot*0.3;ctx.beginPath();ctx.arc(Math.cos(a)*e.r*0.6,Math.sin(a)*e.r*0.6,4,0,7);ctx.fill();}}
    else if(V==='schwarm'){for(let k=0;k<6;k++){const a=e.rot*3+k/6*Math.PI*2,rr=e.r*0.85;ctx.save();ctx.translate(Math.cos(a)*rr,Math.sin(a)*rr);gear(0,0,e.r*0.28,7,a*3,'#4a3526','#9c7637');ctx.restore();}gear(0,0,e.r*0.5,8,e.rot*2,'#5a3a1a','#c89b5a','#1a120b');}
    else if(V==='brenner'){gear(0,0,e.r,10,e.rot,'#3a2218','#c89b5a','#1a120b');const g=ctx.createRadialGradient(0,0,3,0,0,e.r*0.6);g.addColorStop(0,'#ffd089');g.addColorStop(1,'rgba(255,90,30,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,e.r*0.6,0,7);ctx.fill();}
    else{gear(0,0,e.r,12,e.rot,V==='herzwerk'?'#5a1f1f':(V==='uhrturm'?'#3a3020':'#4a3526'),'#c89b5a','#1a120b');gear(0,0,e.r*0.55,8,-e.rot*1.6,'#5a3a1a','#9c7637');}
    if(V==='uhrturm'){ctx.strokeStyle='rgba(232,193,112,.6)';ctx.lineWidth=2;for(let k=0;k<12;k++){const a=k/12*Math.PI*2;ctx.beginPath();ctx.moveTo(Math.cos(a)*e.r*0.8,Math.sin(a)*e.r*0.8);ctx.lineTo(Math.cos(a)*e.r*0.95,Math.sin(a)*e.r*0.95);ctx.stroke();}ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(e.handA)*e.r*0.7,Math.sin(e.handA)*e.r*0.7);ctx.moveTo(0,0);ctx.lineTo(Math.cos(e.handA*0.5)*e.r*0.5,Math.sin(e.handA*0.5)*e.r*0.5);ctx.stroke();}
    if(V==='herzwerk'){const fr=e.hp/e.maxHp;ctx.beginPath();ctx.arc(0,0,8,0,7);ctx.fillStyle=fr>0.66?'#ff8a5a':fr>0.33?'#ff5a3a':'#ff2a1a';ctx.fill();}
    const eyes=V==='herzwerk'?4:(V==='fabrik'||V==='koloss'?2:V==='spindel'?0:3);for(let k=0;k<eyes;k++){const a=e.rot*2+k/Math.max(1,eyes)*Math.PI*2;ctx.beginPath();ctx.arc(Math.cos(a)*e.r*0.5,Math.sin(a)*e.r*0.5,4,0,7);ctx.fillStyle='#ff5a2e';ctx.fill();}
    ctx.restore();
    if(e.shield>0){ctx.strokeStyle='rgba(86,216,224,.7)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(e.x,e.y,e.r+8,0,7);ctx.stroke();}
    if(e.slow>0){ctx.globalAlpha=.25;ctx.fillStyle='#6cc6ff';ctx.beginPath();ctx.arc(e.x,e.y,e.r,0,7);ctx.fill();ctx.globalAlpha=1;}
    const bw=Math.min(W*0.62,440),x=(W-bw)/2,y=18;ctx.fillStyle='#0c0805';ctx.fillRect(x,y,bw,12);ctx.fillStyle=grid.isEndboss?'#ff3a2e':'#d2452f';ctx.fillRect(x,y,bw*Math.max(0,e.hp/e.maxHp),12);ctx.strokeStyle='#9c7637';ctx.lineWidth=2;ctx.strokeRect(x,y,bw,12);
    ctx.fillStyle='#e8c170';ctx.font='bold 14px Georgia';ctx.textAlign='center';ctx.textBaseline='bottom';ctx.fillText(e.name+(grid.isEndboss?' — ENDBOSS':''),W/2,y-2);}
  function drawPet(pet,now){if(pet.kind==='falke'){ctx.save();ctx.translate(pet.x,pet.y);ctx.fillStyle='rgba(180,200,210,.4)';for(let s=-1;s<=1;s+=2){ctx.beginPath();ctx.ellipse(s*8,0,7,3,0,0,7);ctx.fill();}ctx.restore();gear(pet.x,pet.y,7,6,now*0.02,'#c89b5a','#6b4f2a');ctx.beginPath();ctx.arc(pet.x,pet.y,2,0,7);ctx.fillStyle='#56d8e0';ctx.fill();}
    else{gear(pet.x,pet.y,9,7,now*0.006,'#9c7637','#5a3a1a','#2e2117');ctx.beginPath();ctx.arc(pet.x,pet.y,2.5,0,7);ctx.fillStyle='#7ec96b';ctx.fill();}}
  function render(){const now=performance.now();
    const bg=state!=='menu'&&grid?grid.biome:BIOMES[0];
    const grd=ctx.createRadialGradient(W/2,H*0.4,0,W/2,H*0.5,Math.max(W,H));grd.addColorStop(0,bg.bg1);grd.addColorStop(1,bg.bg2);ctx.fillStyle=grd;ctx.fillRect(0,0,W,H);
    ctx.save();if(shake>0)ctx.translate((Math.random()-0.5)*shake,(Math.random()-0.5)*shake);
    if(decoGears)for(const g of decoGears)gear(g.x,g.y,g.r,g.teeth,g.rot,'rgba(120,92,52,0.05)','rgba(160,120,70,0.06)');
    if(state!=='menu'&&grid){drawArena(now);
      for(const z of oilZones){ctx.globalAlpha=Math.min(0.5,z.life/z.max*0.5);ctx.fillStyle=player&&player.syn.frostspur?'#6cc6ff':((player&&(hasR('brennkammer')||player.syn.brandspur))?'#ff7a3a':'#3a2a1a');ctx.beginPath();ctx.arc(z.x,z.y,z.r,0,7);ctx.fill();ctx.globalAlpha=1;}
      for(const hz of hazards){const t=1-hz.timer/hz.max;ctx.strokeStyle='rgba(255,80,40,.85)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(hz.x,hz.y,hz.r,0,7);ctx.stroke();ctx.fillStyle=`rgba(255,80,40,${0.1+0.22*t})`;ctx.beginPath();ctx.arc(hz.x,hz.y,hz.r*t,0,7);ctx.fill();}
      for(const pk of pickups){if(pk.kind==='cog')gear(pk.x,pk.y,pk.r,8,now*0.004+pk.x,'#e8c170','#9c7637','#33261a');else{ctx.beginPath();ctx.arc(pk.x,pk.y,pk.r,0,7);ctx.fillStyle='#7ec96b';ctx.fill();ctx.strokeStyle='#2f5a25';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#1a3a14';ctx.font='bold 11px Georgia';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('+',pk.x,pk.y);}}
      for(const q of parts){if(q.kind==='dmgnum'){const a=Math.max(0,q.life/q.max);ctx.globalAlpha=a;ctx.fillStyle=q.crit?'#ffd089':'#e8ddcf';ctx.font=`bold ${q.crit?16:12}px Georgia`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(q.val,q.x,q.y);continue;}ctx.globalAlpha=Math.max(0,q.life/q.max)*(q.kind==='steam'?0.5:q.kind==='trail'?0.3:1);ctx.fillStyle=q.kind==='steam'?'#d8cfc4':q.kind==='trail'?'#aef4f8':'#ff9a3c';ctx.beginPath();ctx.arc(q.x,q.y,q.r,0,7);ctx.fill();}ctx.globalAlpha=1;
      for(const b of ebullets){ctx.beginPath();ctx.arc(b.x,b.y,b.r+2,0,7);ctx.fillStyle='rgba(255,120,60,.3)';ctx.fill();ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,7);ctx.fillStyle='#ff6a2e';ctx.fill();}
      if(pets)for(const pet of pets)drawPet(pet,now);
      for(const e of enemies){if(e.type==='boss')drawBoss(e,now);else drawEnemy(e,now);}
      for(const s of shocks){ctx.globalAlpha=Math.max(0,s.life/0.4);ctx.strokeStyle=s.col||'#9be0ff';ctx.lineWidth=4;ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,7);ctx.stroke();ctx.globalAlpha=1;}
      for(const ch of chains){ctx.globalAlpha=Math.max(0,ch.life/(ch.col==='#7ec96b'?0.3:0.16));ctx.strokeStyle=ch.col||'#aef4f8';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(ch.x1,ch.y1);ctx.lineTo(ch.x2,ch.y2);ctx.stroke();ctx.globalAlpha=1;}
      const bcol=player?(hasR('frost')?'#9bd6ff':hasR('brennkammer')?'#ffb56a':'#aef4f8'):'#aef4f8';
      for(const b of bullets){const col=b.big?'#d6b3ff':bcol;ctx.beginPath();ctx.arc(b.x,b.y,b.r+3,0,7);ctx.fillStyle='rgba(86,216,224,.3)';ctx.fill();ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,7);ctx.fillStyle=col;ctx.fill();}
      if(player)drawPlayer(now);}
    ctx.restore();
    if(player&&state==='play'){const fr=player.hp/player.maxHp;if(fr<0.35){const a=(0.35-fr)/0.35*(0.5+0.2*Math.sin(now*0.008)),g=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.3,W/2,H/2,Math.max(W,H)*0.7);g.addColorStop(0,'rgba(210,40,20,0)');g.addColorStop(1,`rgba(180,20,10,${a})`);ctx.fillStyle=g;ctx.fillRect(0,0,W,H);}}
    if(state==='play'&&!paused)updateHUD();}
  function drawPlayer(now){const p=player,sk=p.skin||{body:'#c89b5a',stroke:'#6b4f2a',hole:'#2e2117'};const syn=Object.values(p.syn).filter(Boolean).length;
    if(syn>0){ctx.globalAlpha=0.1+0.04*Math.sin(now*0.005);ctx.fillStyle='#56d8e0';ctx.beginPath();ctx.arc(p.x,p.y,p.r+9+syn*1.5,0,7);ctx.fill();ctx.globalAlpha=1;}
    if(p.shielded){ctx.strokeStyle='rgba(86,216,224,.8)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x,p.y,p.r+7,0,7);ctx.stroke();}
    if(p.iframe>0&&Math.floor(p.iframe*20)%2===0)ctx.globalAlpha=0.4;
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.aim);ctx.fillStyle=sk.stroke;ctx.fillRect(0,-4,26,8);ctx.fillStyle=sk.body;ctx.fillRect(20,-5,7,10);ctx.restore();
    gear(p.x,p.y,p.r,9,now*0.002,sk.body,sk.stroke,sk.hole);const hr=p.heat/p.maxHeat;ctx.beginPath();ctx.arc(p.x,p.y,5,0,7);ctx.fillStyle=p.overheated?'#ff5a3a':`rgb(${86+hr*160|0},${216-hr*120|0},${224-hr*120|0})`;ctx.fill();ctx.globalAlpha=1;}
  function drawEnemy(e,now){
    if(e.elite){const col=e.elite==='gepanzert'?'rgba(232,193,112,.5)':e.elite==='rasend'?'rgba(255,80,60,.5)':'rgba(255,150,40,.5)';ctx.globalAlpha=0.4+0.2*Math.sin(now*0.006);ctx.strokeStyle=col;ctx.lineWidth=2;ctx.beginPath();ctx.arc(e.x,e.y,e.r+5,0,7);ctx.stroke();ctx.globalAlpha=1;}
    if(e.boost>0){ctx.globalAlpha=0.3+0.2*Math.sin(now*0.012);ctx.strokeStyle='#ff9a3c';ctx.lineWidth=2;ctx.beginPath();ctx.arc(e.x,e.y,e.r+8,0,7);ctx.stroke();ctx.globalAlpha=1;}
    if(e.spawning>0){const t=1-e.spawning/0.55;ctx.globalAlpha=t;ctx.strokeStyle='rgba(86,216,224,.6)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(e.x,e.y,e.r+8*(1-t),0,7);ctx.stroke();}
    const fl=e.hit>0||(e.burnT>0&&Math.floor(now*0.02)%2===0);
    if(e.type==='spitter')gear(e.x,e.y,e.r,6,now*0.001,fl?'#fff':'#8a6a3a','#5a3a1a','#2e2117');
    else if(e.type==='swarmling'){gear(e.x,e.y,e.r,5,now*0.006,fl?'#fff':'#6a4a2a','#3a2a1a');ctx.beginPath();ctx.arc(e.x,e.y,2.5,0,7);ctx.fillStyle='#ff5a2e';ctx.fill();}
    else if(e.type==='charger'){ctx.save();ctx.translate(e.x,e.y);ctx.rotate(Math.atan2(player.y-e.y,player.x-e.x));ctx.fillStyle=e.windup>0?'#ff7a3a':(fl?'#fff':'#b5651d');ctx.fillRect(-e.r,-7,e.r*2,14);ctx.strokeStyle='#5a3a1a';ctx.lineWidth=2;ctx.strokeRect(-e.r,-7,e.r*2,14);ctx.beginPath();ctx.arc(e.r-3,0,3,0,7);ctx.fillStyle='#ff3a1a';ctx.fill();ctx.restore();}
    else if(e.type==='bomber'){const near=player&&(e.x-player.x)**2+(e.y-player.y)**2<150*150,blink=Math.floor(now*(near?0.02:0.006))%2===0;gear(e.x,e.y,e.r,8,now*0.002,fl?'#fff':'#6b2a1a','#3a1a10','#1a120b');ctx.beginPath();ctx.arc(e.x,e.y,4,0,7);ctx.fillStyle=blink?'#ff3a1a':'#7a2a1a';ctx.fill();}
    else if(e.type==='brute'){gear(e.x,e.y,e.r,10,now*0.0012,fl?'#fff':'#332620','#c89b5a','#1a120b');gear(e.x,e.y,e.r*0.5,8,-now*0.002,'#4a3526','#9c7637');for(let k=0;k<2;k++){const a=now*0.002+k*Math.PI;ctx.beginPath();ctx.arc(e.x+Math.cos(a)*e.r*0.4,e.y+Math.sin(a)*e.r*0.4,3.5,0,7);ctx.fillStyle='#ff5a2e';ctx.fill();}}
    else if(e.type==='turret'){ctx.beginPath();for(let k=0;k<=6;k++){const a=k/6*Math.PI*2;ctx.lineTo(e.x+Math.cos(a)*e.r,e.y+Math.sin(a)*e.r);}ctx.closePath();ctx.fillStyle=fl?'#fff':'#4a3a2a';ctx.fill();ctx.strokeStyle='#9c7637';ctx.lineWidth=2;ctx.stroke();ctx.save();ctx.translate(e.x,e.y);ctx.rotate(Math.atan2(player.y-e.y,player.x-e.x));ctx.fillStyle='#7a5a2c';ctx.fillRect(0,-4,e.r+6,8);ctx.restore();ctx.beginPath();ctx.arc(e.x,e.y,3,0,7);ctx.fillStyle='#ff3a1a';ctx.fill();}
    else if(e.type==='drohne'){ctx.save();ctx.translate(e.x,e.y);ctx.rotate(now*0.01);for(let k=0;k<3;k++){const a=k/3*Math.PI*2;ctx.beginPath();ctx.ellipse(Math.cos(a)*e.r,Math.sin(a)*e.r,e.r*0.5,e.r*0.2,a,0,7);ctx.fillStyle='rgba(180,200,210,.4)';ctx.fill();}ctx.restore();gear(e.x,e.y,e.r*0.7,6,now*0.004,fl?'#fff':'#5a5a4a','#9c7637');ctx.beginPath();ctx.arc(e.x,e.y,3,0,7);ctx.fillStyle='#3fd6e0';ctx.fill();}
    else if(e.type==='waechter'){gear(e.x,e.y,e.r,9,now*0.001,fl?'#fff':'#3a3a4a','#9c7637','#1a120b');ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.face);ctx.strokeStyle='#a9c6e0';ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,0,e.r+5,-1.0,1.0);ctx.stroke();ctx.restore();ctx.beginPath();ctx.arc(e.x,e.y,3.5,0,7);ctx.fillStyle='#ff3a1a';ctx.fill();}
    else if(e.type==='mechaniker'){gear(e.x,e.y,e.r,7,now*0.002,fl?'#fff':'#2a4a2e','#7ec96b','#163018');ctx.strokeStyle='#9be0a0';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(e.x-5,e.y);ctx.lineTo(e.x+5,e.y);ctx.moveTo(e.x,e.y-5);ctx.lineTo(e.x,e.y+5);ctx.stroke();ctx.globalAlpha=0.3+0.2*Math.sin(now*0.005);ctx.strokeStyle='#7ec96b';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(e.x,e.y,e.r+6,0,7);ctx.stroke();ctx.globalAlpha=1;}
    else if(e.type==='verstaerker'){gear(e.x,e.y,e.r,7,now*0.002,fl?'#fff':'#4a3520','#ff9a3c','#2a1808');ctx.strokeStyle='#ffd089';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(e.x-5,e.y-4);ctx.lineTo(e.x,e.y+5);ctx.lineTo(e.x+5,e.y-4);ctx.stroke();ctx.globalAlpha=0.3+0.2*Math.sin(now*0.005);ctx.strokeStyle='#ff9a3c';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(e.x,e.y,e.r+6,0,7);ctx.stroke();ctx.globalAlpha=1;}
    else if(e.type==='moerser'){gear(e.x,e.y,e.r,8,now*0.0015,fl?'#fff':'#4a3a2a','#c89b5a','#1a120b');ctx.save();ctx.translate(e.x,e.y);ctx.rotate(Math.atan2(player.y-e.y,player.x-e.x)-Math.PI/2);ctx.fillStyle='#2e2117';ctx.fillRect(-4,-e.r-6,8,e.r*0.7);ctx.restore();ctx.beginPath();ctx.arc(e.x,e.y,3,0,7);ctx.fillStyle='#ff8a3a';ctx.fill();}
    else{gear(e.x,e.y,e.r,7,now*0.003,fl?'#fff':'#4a3526','#2e2117','#1a120b');ctx.beginPath();ctx.arc(e.x,e.y,3.5,0,7);ctx.fillStyle='#ff3a1a';ctx.fill();}
    if(e.slow>0){ctx.globalAlpha=.28;ctx.fillStyle='#6cc6ff';ctx.beginPath();ctx.arc(e.x,e.y,e.r,0,7);ctx.fill();ctx.globalAlpha=1;}
    ctx.globalAlpha=1;}
  function updateHUD(){const p=player;$('hpfill').style.width=Math.max(0,p.hp/p.maxHp*100)+'%';const hf=$('heatfill');hf.style.width=(p.heat/p.maxHeat*100)+'%';hf.classList.toggle('over',p.overheated);$('heatlbl').textContent=p.overheated?'ÜBERHITZT':'HITZE';
    const bf=$('bombfill');bf.style.width=(p.charge*100)+'%';bf.classList.toggle('ready',p.charge>=1);
    const dp=$('dashpip');dp.classList.toggle('ready',p.dashCd<=0);$('roomnum').textContent=room;
    const boss=enemies.some(e=>e.type==='boss'),alive=enemies.filter(e=>e.type!=='boss').length;$('enemynum').textContent=boss?'BOSS':(alive+(grid&&grid.reserve>0?' +'+grid.reserve:''));$('cogsrun').textContent=cogsRun;}

