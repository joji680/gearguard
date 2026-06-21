"use strict";
  async function renderLeaderboard(targetId){const el=$(targetId);if(!el)return;el.textContent='Lade…';
    try{const r=await fetch('/api/leaderboard',{credentials:'same-origin'});const j=await r.json();
      el.innerHTML=(j.entries||[]).map((e,i)=>`<div class="lbrow${e.me?' me':''}"><span>${i+1}. ${e.username}</span><span>Raum ${e.room} · ⚙${e.cogs}</span></div>`).join('')||'Noch keine Einträge.';
    }catch(ex){el.textContent='Fehler beim Laden.';}}

  function renderTray(){const t=$('tray');t.innerHTML='';player.relics.forEach(id=>{const r=RELICS.find(x=>x.id===id);const d=document.createElement('div');d.className='relicchip';d.textContent=r.icon;d.title=r.name+' — '+r.desc;t.appendChild(d);});
    SYNERGIES.forEach(s=>{if(player.syn[s.id]){const d=document.createElement('div');d.className='synchip';d.textContent='↯ '+s.name;d.title=s.desc;t.appendChild(d);}});}
  function toast(txt){const d=document.createElement('div');d.className='toastmsg';d.textContent=txt;$('toast').appendChild(d);setTimeout(()=>d.remove(),2200);}

  let choices=[],mode='upgrade';
  function openChoice(){state='choice';mdown=false;const avail=RELICS.filter(r=>!player.relics.has(r.id));mode=(grid.isBoss&&avail.length>0)?'relic':'upgrade';
    choices=mode==='relic'?shuffle(avail).slice(0,3):pick3();
    $('choiceTitle').textContent=mode==='relic'?'BOSS BESIEGT':'RAUM GESÄUBERT';
    $('choiceSub').textContent=mode==='relic'?'Wähle ein Relikt — achte auf Synergien.':'Wähle eine Verbesserung für diesen Lauf.';
    renderChoice();$('rerolls').textContent=rerollsLeft;$('rerollbtn').disabled=rerollsLeft<=0;show('upgrade');}
  function pick3(){const pool=[...UPGRADES],out=[];for(let i=0;i<3&&pool.length;i++)out.push(pool.splice((Math.random()*pool.length)|0,1)[0]);return out;}
  function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[a[i],a[j]]=[a[j],a[i]];}return a;}
  function synHintFor(id){const out=[];for(const s of SYNERGIES){if(!s.req.includes(id))continue;const missing=s.req.filter(r=>r!==id&&!player.relics.has(r));if(missing.length===0){const partners=s.req.filter(r=>r!==id).map(r=>{const x=RELICS.find(y=>y.id===r);return `${x.icon} ${x.name}`;}).join(' + ');out.push(`<div class="synhint">↯ <b>${s.name}</b> aktiv mit ${partners}</div>`);}else if(missing.length===1){const x=RELICS.find(y=>y.id===missing[0]);out.push(`<div class="synhint">↯ ${s.name} (fehlt: ${x.icon} ${x.name})</div>`);}}return out.join('');}
  function renderChoice(){const c=$('cards');c.innerHTML='';choices.forEach(u=>{const d=document.createElement('div');d.className='card'+(mode==='relic'?' relic':'');
    const hint=mode==='relic'?synHintFor(u.id):'';
    d.innerHTML=`${mode==='relic'?'<span class="tag">RELIKT</span>':''}<div class="icon">${u.icon}</div><div class="ctitle">${u.name}</div><div class="cdesc">${u.desc}</div>${hint}`;
    d.onclick=()=>choose(u);c.appendChild(d);});refreshFocusList();}
  function choose(u){if(mode==='relic'){player.relics.add(u.id);if(u.onGain)u.onGain(player);const before=new Set(Object.keys(player.syn).filter(k=>player.syn[k]));computeSyn().forEach(s=>{if(!before.has(s.id))toast('Synergie: '+s.name);});renderTray();Audio.relic();}else u.apply(player);enterRoom();}
  $('rerollbtn').onclick=()=>{if(rerollsLeft>0){rerollsLeft--;choices=mode==='relic'?shuffle(RELICS.filter(r=>!player.relics.has(r.id))).slice(0,3):pick3();renderChoice();$('rerolls').textContent=rerollsLeft;$('rerollbtn').disabled=rerollsLeft<=0;}};

  let wRelic=null,wUpgrades=null;
  function openWerkstatt(){state='werkstatt';mdown=false;const avail=RELICS.filter(r=>!player.relics.has(r.id));wRelic=avail.length?avail[(Math.random()*avail.length)|0]:null;
    wUpgrades=shuffle([...UPGRADES]).slice(0,2);show('werkstatt');renderWerkstatt();}
  function renderWerkstatt(){$('wcogs').textContent=cogsRun;const c=$('wcards');c.innerHTML='';
    const opt=(icon,title,desc,price,enabled,onClick,extra)=>{const d=document.createElement('div');d.className='card';d.innerHTML=`<div class="icon">${icon}</div><div class="ctitle">${title}</div><div class="cdesc">${desc}</div>${extra||''}<div class="synhint">⚙ ${price}</div>`;if(enabled)d.onclick=()=>{onClick();renderWerkstatt();};else d.style.opacity=.45;c.appendChild(d);};
    if(wRelic){const pr=60+room*8;const hint=synHintFor(wRelic.id);opt(wRelic.icon,wRelic.name,wRelic.desc,pr,cogsRun>=pr,()=>{cogsRun-=pr;player.relics.add(wRelic.id);if(wRelic.onGain)wRelic.onGain(player);computeSyn();renderTray();Audio.relic();wRelic=null;},hint);}
    else{const d=document.createElement('div');d.className='card';d.style.opacity=.4;d.innerHTML=`<div class="icon">🔒</div><div class="ctitle">Kein Relikt</div><div class="cdesc">Alle Relikte bereits im Besitz</div>`;c.appendChild(d);}
    wUpgrades.forEach((u,i)=>{if(!u)return;const up=40+room*5;opt(u.icon,u.name,u.desc,up,cogsRun>=up,()=>{cogsRun-=up;u.apply(player);Audio.cog();wUpgrades[i]=null;});});
    refreshFocusList();}
  $('wleave').onclick=()=>{state='play';show(null);};

  function togglePause(){paused=!paused;if(paused){renderPause();$('pause').classList.remove('hidden');refreshFocusList();}else{$('pause').classList.add('hidden');$('steamdex').classList.add('hidden');$('stats').classList.add('hidden');}}
  function renderPause(){const p=player,rows=[
    ['Raum',room],['Druckstufe',runPress],['Zahnräder (Lauf)',cogsRun],['Dampf',`${Math.ceil(p.hp)}/${p.maxHp}`],['Schaden',Math.round(p.damage)],
    ['Feuerrate',(1000/p.fireRate).toFixed(1)+' /s'],['Projektile',p.projectiles+(p.twin?' +Rücken':'')],['Durchschlag',p.pierce],
    ['Projektiltempo',p.bulletSpeed.toFixed(1)],['Lauftempo',p.speed.toFixed(2)],['Hitzelimit',Math.round(p.maxHeat)],
    ['Kühlung',Math.round(p.coolRate)],['Kritchance',Math.round(p.crit*100)+'%'],['Wiederbelebungen',p.revives]];
    $('pstats').innerHTML=rows.map(r=>`<div class="prow"><span>${r[0]}</span><b>${r[1]}</b></div>`).join('');
    const rel=[...p.relics].map(id=>{const r=RELICS.find(x=>x.id===id);return `<span class="relicchip" title="${r.name}: ${r.desc}">${r.icon}</span>`;}).join('');
    const syn=SYNERGIES.filter(s=>p.syn[s.id]).map(s=>`<span class="synchip" title="${s.desc}">↯ ${s.name}</span>`).join('');
    $('prelics').innerHTML=(rel?`<div class="plabel">RELIKTE</div><div class="prelrow">${rel}</div>`:'<div class="plabel">Noch keine Relikte</div>')+(syn?`<div class="plabel">SYNERGIEN</div><div class="prelrow">${syn}</div>`:'');}
  $('resumebtn').onclick=()=>togglePause();
  $('abandonbtn').onclick=()=>{paused=false;$('pause').classList.add('hidden');$('steamdex').classList.add('hidden');$('stats').classList.add('hidden');clearSave();die();};

  let dexFrom='menu';
  function renderDex(){const b=$('dexbody');b.innerHTML='';
    const head=t=>{const d=document.createElement('div');d.className='dexhead';d.textContent=t;return d;};
    const entry=(ic,nm,de,extra)=>{const d=document.createElement('div');d.className='dexentry';d.innerHTML=`<span class="dexicon">${ic}</span><div><div class="dexname">${nm}</div><div class="dexdesc">${de}</div>${extra||''}</div>`;return d;};
    b.appendChild(head('GEGNER'));ENEMYDEX.forEach(e=>b.appendChild(entry(e.icon,e.name,e.desc)));
    b.appendChild(head('BOSSE'));BOSSDEX.forEach(e=>b.appendChild(entry(e.icon,e.name,e.desc)));
    b.appendChild(head('RELIKTE'));RELICS.forEach(r=>b.appendChild(entry(r.icon,r.name,r.desc)));
    b.appendChild(head('SYNERGIEN'));SYNERGIES.forEach(s=>{
      const pairs=s.req.map(id=>{const r=RELICS.find(x=>x.id===id);return `<span class="pair">${r.icon} ${r.name}</span>`;}).join('<span class="plus">+</span>');
      b.appendChild(entry('↯',s.name,s.desc,`<div class="dexsyn" style="margin-top:5px;">${pairs}</div>`));});}
  function openDex(from){dexFrom=from;renderDex();if(from==='pause')$('pause').classList.add('hidden');$('steamdex').classList.remove('hidden');refreshFocusList();}
  $('dexbtn').onclick=()=>openDex('pause');
  $('menudexbtn').onclick=()=>openDex('menu');
  $('dexback').onclick=()=>{$('steamdex').classList.add('hidden');if(dexFrom==='pause')$('pause').classList.remove('hidden');refreshFocusList();};

  let statFrom='menu';
  function renderStatsView(){const s=meta.stats,b=$('statbody');
    const rows=[['Läufe gespielt',s.runs],['Gegner zerlegt',s.kills],['Bosse besiegt',s.bosses],['Tode',s.deaths],['Bester Raum',s.bestRoom],['Höchster Druck',s.bestPress],['Zahnräder gesamt',s.cogsTotal],['Herzwerk besiegt',s.endboss?'Ja':'Nein']];
    let h=`<div class="pstats">${rows.map(r=>`<div class="prow"><span>${r[0]}</span><b>${r[1]}</b></div>`).join('')}</div><div class="dex">`;
    h+=`<div class="dexhead">ERFOLGE</div>`;
    ACHIEVEMENTS.forEach(a=>{const got=a.check(s);h+=`<div class="dexentry${got?'':' locked'}"><span class="dexicon">${got?'🏅':'🔒'}</span><div><div class="dexname">${a.name}</div><div class="dexdesc">${a.desc}</div></div></div>`;});
    h+=`</div>`;b.innerHTML=h;}
  function openStats(from){statFrom=from;renderStatsView();if(from==='pause')$('pause').classList.add('hidden');$('stats').classList.remove('hidden');refreshFocusList();}
  $('statbtn').onclick=()=>openStats('pause');
  $('menustatbtn').onclick=()=>openStats('menu');
  $('statback').onclick=()=>{$('stats').classList.add('hidden');if(statFrom==='pause')$('pause').classList.remove('hidden');refreshFocusList();};
  let lbFrom=null;
  function openLeaderboard(from){lbFrom=from;renderLeaderboard('lbbody');if(from==='pause')$('pause').classList.add('hidden');$('leaderboard').classList.remove('hidden');refreshFocusList();}
  $('menulbbtn').onclick=()=>openLeaderboard('menu');
  $('lbback').onclick=()=>{$('leaderboard').classList.add('hidden');if(lbFrom==='pause')$('pause').classList.remove('hidden');refreshFocusList();};

  let resetArmed=false,resetTimer=null;
  $('resetbtn').onclick=()=>{if(!resetArmed){resetArmed=true;$('resetbtn').textContent='Sicher? Erneut tippen';resetTimer=setTimeout(()=>{resetArmed=false;$('resetbtn').textContent='Fortschritt zurücksetzen';},3000);}else{clearTimeout(resetTimer);resetArmed=false;$('resetbtn').textContent='Fortschritt zurücksetzen';meta=defaultMeta();Audio.muted=false;Audio.setMute(false);Audio.setVol(0.5);document.documentElement.style.setProperty('--uiscale',1);saveMeta(meta);clearSave();runPress=0;updatePressUI();menuMeta();toast('Fortschritt zurückgesetzt');state='menu';show('menu');}};

  function shopHead(t){const d=document.createElement('div');d.className='shophead';d.textContent=t;return d;}
  function shopItem(title,desc,sub,btn,enabled,onClick,cls,swatch){const it=document.createElement('div');it.className='item'+(cls?' '+cls:'');
    it.innerHTML=`<div>${swatch?`<span class="sw" style="background:${swatch}"></span>`:''}<span class="iname">${title}</span><div class="idesc">${desc}</div>${sub?`<div class="ilv">${sub}</div>`:''}</div><button class="buy" ${enabled?'':'disabled'}>${btn}</button>`;
    it.querySelector('.buy').onclick=onClick;return it;}
  function renderShop(){const s=$('shop');s.innerHTML='';$('totalcogs').textContent=meta.cogs;
    s.appendChild(shopHead('VERBESSERUNGEN'));
    METADEFS.forEach(m=>{const lv=meta[m.id]||0,maxed=lv>=m.max,cost=m.cost(lv),afford=meta.cogs>=cost&&!maxed;
      s.appendChild(shopItem(`${m.icon} ${m.name}`,m.desc,`STUFE ${lv}/${m.max}`,maxed?'MAX':'⚙ '+cost,afford,()=>{if(meta.cogs>=cost&&!maxed){meta.cogs-=cost;meta[m.id]=lv+1;saveMeta(meta);Audio.click();renderShop();}},maxed?'maxed':''));});
    s.appendChild(shopHead('BEGLEITER'));
    PETS.forEach(pt=>{const owned=!!(meta.pets&&meta.pets[pt.id]),afford=meta.cogs>=pt.cost&&!owned;
      s.appendChild(shopItem(`${pt.icon} ${pt.name}`,pt.desc,owned?'Aktiv in jedem Lauf':'',owned?'✓ Besitz':'⚙ '+pt.cost,afford,()=>{if(meta.cogs>=pt.cost&&!owned){meta.cogs-=pt.cost;meta.pets[pt.id]=1;saveMeta(meta);Audio.click();renderShop();}},owned?'maxed':''));});
    s.appendChild(shopHead('KOSMETIK'));
    COSMETICS.forEach(co=>{const owned=meta.cosmetics.includes(co.id),equipped=meta.skin===co.id;
      let btn,enabled,onClick;
      if(equipped){btn='Ausgerüstet';enabled=false;onClick=()=>{};}
      else if(owned){btn='Ausrüsten';enabled=true;onClick=()=>{meta.skin=co.id;saveMeta(meta);Audio.click();renderShop();};}
      else{btn='⚙ '+co.cost;enabled=meta.cogs>=co.cost;onClick=()=>{if(meta.cogs>=co.cost){meta.cogs-=co.cost;meta.cosmetics.push(co.id);meta.skin=co.id;saveMeta(meta);Audio.click();renderShop();}};}
      s.appendChild(shopItem(co.name,co.desc,equipped?'Aktiv':'',btn,enabled,onClick,equipped?'maxed':'',co.body));});
    refreshFocusList();}
  function renderEnd(win,keyLvl){$('deathtitle').textContent=win?'SIEG!':(room>=6?'EHRENVOLL ZERLEGT':'ZERLEGT');
    const keyTxt=win&&keyLvl!=null?` 🔑 Druckschlüssel Stufe ${keyLvl-1} erbeutet!`:'';
    $('deathsub').textContent=challengeMode?`Ranglisten-Modus — Raum ${room} erreicht, ⚙ ${lastBank} gesammelt.`:(win?`Das Herzwerk ist zerschlagen — zieh weiter in den Endlosmodus. (+${lastBank} ⚙)${keyTxt}`:`Du kamst bis Raum ${room}. (+${lastBank} ⚙ in dieser Runde)`);
    $('deathshopbar').classList.toggle('hidden',challengeMode);$('shop').classList.toggle('hidden',challengeMode);
    $('lbresult').classList.toggle('hidden',!challengeMode);
    if(challengeMode)renderLeaderboard('lbbody2');else renderShop();
    $('restartbtn').classList.remove('hidden');$('continuebtn').classList.toggle('hidden',!win);
    $('reviveadbtn').classList.toggle('hidden',win||!Ads.rewardedAvailable());}
  $('mutebtn').onclick=toggleMute;
  $('mutebtn').textContent=meta.muted?'🔇 Aus':'🔊 An';
  $('continuebtn').onclick=()=>{state='play';endless=true;grid=null;show(null);nextRoom();};
  $('menubtn').onclick=()=>{state='menu';show('menu');menuMeta();};
  function menuMeta(){
    const owned=METADEFS.filter(m=>meta[m.id]>0).length,p=(meta.pets&&(meta.pets.falke||meta.pets.hund))?' · Begleiter aktiv':'';
    $('menumeta').textContent=meta.cogs>0||owned>0?`⚙ ${meta.cogs} gespart · ${owned} Verbesserungen${p}`:'';
    // Resume-Knopf
    const s=loadSave();const rb=$('resumeBtn');
    if(s){rb.classList.remove('hidden');$('resumedesc').textContent=`Raum ${s.room} · Druck ${s.runPress||0} · ⚙ ${s.cogsRun||0}`;}else rb.classList.add('hidden');
    const have=(meta.keys||[]).length;
    const max=8;let html='';for(let i=0;i<=max;i++){const owned=(meta.keys||[]).includes(i);html+=`<span class="keychip${owned||i===0?'':' lock'}">🔑 ${i}</span>`;}
    $('keyline').innerHTML=have?`Druckschlüssel: ${html}`:`Bezwinge das Herzwerk auf jeder Druckstufe für einen Druckschlüssel.`;
  }
  $('resumeBtn').onclick=()=>{const s=loadSave();if(s)applyRunSnapshot(s);};
  function updatePressUI(){$('pressval').textContent=runPress;$('pressmul').textContent=`×${(1+runPress*0.18).toFixed(2)} Belohnung`;}
  function maxUnlockedPress(){return Math.max(0,meta.unlockedPress||0);}
  $('pressup').onclick=()=>{const max=maxUnlockedPress();if(runPress>=max){toast('Druck '+(runPress+1)+' nicht entsperrt — Werkstatt');return;}runPress=Math.min(8,runPress+1);meta.lastPress=runPress;saveMeta(meta);updatePressUI();};
  $('pressdown').onclick=()=>{runPress=Math.max(0,runPress-1);meta.lastPress=runPress;saveMeta(meta);updatePressUI();};
  // ---------- Hub / Settings / Standalone-Shop ----------
  function openSettings(){state='settings';show('settings');
    $('uiscale').value=meta.uiscale||1;$('uiscaleval').textContent=(meta.uiscale||1).toFixed(2)+'×';
    $('volume').value=meta.vol==null?0.5:meta.vol;$('volval').textContent=Math.round((meta.vol==null?0.5:meta.vol)*100)+'%';
    $('mutebtn').textContent=meta.muted?'🔇 Aus':'🔊 An';
    $('pressval2').textContent=runPress;$('pressmul2').textContent=`×${(1+runPress*0.18).toFixed(2)}`;
    refreshFocusList();}
  $('settingsbtn').onclick=openSettings;
  $('settingsback').onclick=()=>{state='menu';show('menu');menuMeta();};
  $('uiscale').oninput=e=>{const v=parseFloat(e.target.value);meta.uiscale=v;document.documentElement.style.setProperty('--uiscale',v);$('uiscaleval').textContent=v.toFixed(2)+'×';saveMeta(meta);};
  $('volume').oninput=e=>{const v=parseFloat(e.target.value);meta.vol=v;Audio.setVol(v);$('volval').textContent=Math.round(v*100)+'%';saveMeta(meta);};
  $('pressup2').onclick=()=>{const max=maxUnlockedPress();if(runPress>=max){toast('Druck '+(runPress+1)+' nicht entsperrt — Werkstatt');return;}runPress=Math.min(8,runPress+1);meta.lastPress=runPress;saveMeta(meta);$('pressval2').textContent=runPress;$('pressmul2').textContent=`×${(1+runPress*0.18).toFixed(2)}`;updatePressUI();};
  $('pressdown2').onclick=()=>{runPress=Math.max(0,runPress-1);meta.lastPress=runPress;saveMeta(meta);$('pressval2').textContent=runPress;$('pressmul2').textContent=`×${(1+runPress*0.18).toFixed(2)}`;updatePressUI();};

  $('shopbtn').onclick=()=>{state='shop';renderShopStandalone();show('shoponly');};
  $('shopback').onclick=()=>{state='menu';show('menu');menuMeta();};
  function renderShopStandalone(){$('totalcogs2').textContent=meta.cogs;const s=$('shop2');s.innerHTML='';
    s.appendChild(shopHead('DRUCKSTUFEN'));
    const keys=meta.keys||[];const unlocked=meta.unlockedPress||0;
    for(let lvl=1;lvl<=8;lvl++){
      const isUnlocked=lvl<=unlocked;
      const hasKey=keys.includes(lvl);
      const cost=200;
      if(isUnlocked){
        s.appendChild(shopItem(`🔓 Druckstufe ${lvl}`,`+${(lvl*0.18*100).toFixed(0)}% Belohnung, härtere Gegner`,'Entsperrt','✓ Entsperrt',false,()=>{},'maxed'));
      }else if(hasKey){
        s.appendChild(shopItem(`🔑 Druckstufe ${lvl}`,`Schlüssel Stufe ${lvl-1} einlösen`,`Verbraucht 1 Schlüssel ${lvl-1}`,'⚙ '+cost,meta.cogs>=cost,()=>{
          if(meta.cogs<cost)return;
          meta.cogs-=cost;
          const idx=keys.indexOf(lvl-1);if(idx>=0)keys.splice(idx,1);
          meta.unlockedPress=lvl;saveMeta(meta);Audio.relic();toast('Druckstufe '+lvl+' entsperrt!');renderShopStandalone();menuMeta();
        }));
      }else{
        s.appendChild(shopItem(`🔒 Druckstufe ${lvl}`,`Besiege das Herzwerk auf Druckstufe ${lvl}`,'',`🔑 ${lvl} fehlt`,false,()=>{},'maxed'));
        break;
      }
    }
    s.appendChild(shopHead('VERBESSERUNGEN'));
    METADEFS.forEach(m=>{const lv=meta[m.id]||0,maxed=lv>=m.max,cost=m.cost(lv),afford=meta.cogs>=cost&&!maxed;
      s.appendChild(shopItem(`${m.icon} ${m.name}`,m.desc,`STUFE ${lv}/${m.max}`,maxed?'MAX':'⚙ '+cost,afford,()=>{if(meta.cogs>=cost&&!maxed){meta.cogs-=cost;meta[m.id]=lv+1;saveMeta(meta);Audio.click();renderShopStandalone();}},maxed?'maxed':''));});
    s.appendChild(shopHead('BEGLEITER'));
    PETS.forEach(pt=>{const owned=!!(meta.pets&&meta.pets[pt.id]),afford=meta.cogs>=pt.cost&&!owned;
      s.appendChild(shopItem(`${pt.icon} ${pt.name}`,pt.desc,owned?'Aktiv in jedem Lauf':'',owned?'✓ Besitz':'⚙ '+pt.cost,afford,()=>{if(meta.cogs>=pt.cost&&!owned){meta.cogs-=pt.cost;meta.pets[pt.id]=1;saveMeta(meta);Audio.click();renderShopStandalone();}},owned?'maxed':''));});
    s.appendChild(shopHead('KOSMETIK'));
    COSMETICS.forEach(co=>{const owned=meta.cosmetics.includes(co.id),equipped=meta.skin===co.id;
      let btn,enabled,onClick;
      if(equipped){btn='Ausgerüstet';enabled=false;onClick=()=>{};}
      else if(owned){btn='Ausrüsten';enabled=true;onClick=()=>{meta.skin=co.id;saveMeta(meta);Audio.click();renderShopStandalone();};}
      else{btn='⚙ '+co.cost;enabled=meta.cogs>=co.cost;onClick=()=>{if(meta.cogs>=co.cost){meta.cogs-=co.cost;meta.cosmetics.push(co.id);meta.skin=co.id;saveMeta(meta);Audio.click();renderShopStandalone();}};}
      s.appendChild(shopItem(co.name,co.desc,equipped?'Aktiv':'',btn,enabled,onClick,equipped?'maxed':'',co.body));});
    refreshFocusList();}
