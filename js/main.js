"use strict";
  function loop(now){let dt=Math.min((now-(last||now))/1000,0.05);last=now;if(hitstop>0){hitstop-=dt;dt*=0.15;}padNav(dt);if(state==='play')update(dt);render();requestAnimationFrame(loop);}
  let last=performance.now();
  requestAnimationFrame(loop);
  $('startbtn').onclick=()=>{challengeMode=false;newRun();};$('challengebtn').onclick=()=>{challengeMode=true;newRun();};$('restartbtn').onclick=()=>newRun();menuMeta();updatePressUI();refreshFocusList();
  $('logoutbtn').onclick=async()=>{await fetch('/api/logout',{method:'POST',credentials:'same-origin'}).catch(()=>{});location.href='/';};
  fetch('/api/me',{credentials:'same-origin'}).then(r=>r.ok?r.json():null).then(j=>{if(j){const u=$('userline');if(u)u.textContent='👤 '+j.username;}}).catch(()=>{});
