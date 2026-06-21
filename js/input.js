"use strict";
  // ---------- Input ----------
  const keys={};let mx=0,my=0,mdown=false,paused=false,dashReq=false,specialReq=false,audioStarted=false,inputMode='kbm';
  function setInput(m){if(inputMode!==m){inputMode=m;$('inputline').textContent='Eingabe: '+(m==='pad'?'Gamepad':'Tastatur & Maus');$('padpip').classList.toggle('hidden',m!=='pad');}}
  function startAudio(){if(!audioStarted){audioStarted=true;Audio.init();}Audio.resume();}
  addEventListener('keydown',e=>{const k=e.key.toLowerCase();keys[k]=true;startAudio();setInput('kbm');
    if(k===' '){if(state==='play'){dashReq=true;e.preventDefault();}}
    if(k==='e'&&state==='play')specialReq=true;
    if(k==='p'&&state==='play')togglePause();
    if(k==='m')toggleMute();});
  addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false;});
  cv.addEventListener('mousemove',e=>{const r=cv.getBoundingClientRect();mx=e.clientX-r.left;my=e.clientY-r.top;setInput('kbm');});
  cv.addEventListener('mousedown',e=>{startAudio();setInput('kbm');if(e.button===0)mdown=true;if(e.button===2&&state==='play')specialReq=true;});
  addEventListener('mouseup',()=>mdown=false);
  cv.addEventListener('contextmenu',e=>e.preventDefault());
  cv.addEventListener('touchstart',e=>{startAudio();setInput('kbm');const r=cv.getBoundingClientRect(),t=e.touches[0];mx=t.clientX-r.left;my=t.clientY-r.top;mdown=true;e.preventDefault();},{passive:false});
  cv.addEventListener('touchmove',e=>{const r=cv.getBoundingClientRect(),t=e.touches[0];mx=t.clientX-r.left;my=t.clientY-r.top;e.preventDefault();},{passive:false});
  cv.addEventListener('touchend',()=>mdown=false);

  // Touch-Steuerung (Twin-Stick) — speist die Pad-Felder, daher keine Änderung an update()
  (function(){
    let touchUsed=matchMedia('(pointer:coarse)').matches;
    const T=$('touch'),sL=$('tstickL'),sR=$('tstickR'),R=52;let lid=null,rid=null,lx0=0,ly0=0,rx0=0,ry0=0;
    function updateTouchVis(){T.classList.toggle('hidden',!(touchUsed&&state==='play'&&!paused));}
    document.addEventListener('touchstart',()=>{touchUsed=true;updateTouchVis();},{passive:true});
    function setStick(s,ox,oy,dx,dy){s.style.left=ox+'px';s.style.top=oy+'px';s.querySelector('i').style.transform=`translate(${dx}px,${dy}px)`;s.classList.remove('hidden');}
    function clamp(dx,dy){const d=Math.hypot(dx,dy);if(d>R){dx=dx/d*R;dy=dy/d*R;}return [dx,dy];}
    T.addEventListener('touchstart',e=>{touchUsed=true;updateTouchVis();startAudio();setInput('pad');for(const t of e.changedTouches){const left=t.clientX<innerWidth/2;if(left&&lid===null){lid=t.identifier;lx0=t.clientX;ly0=t.clientY;setStick(sL,lx0,ly0,0,0);}else if(!left&&rid===null){rid=t.identifier;rx0=t.clientX;ry0=t.clientY;setStick(sR,rx0,ry0,0,0);}}e.preventDefault();},{passive:false});
    T.addEventListener('touchmove',e=>{for(const t of e.changedTouches){if(t.identifier===lid){const[dx,dy]=clamp(t.clientX-lx0,t.clientY-ly0);setStick(sL,lx0,ly0,dx,dy);Pad.lx=dx/R;Pad.ly=dy/R;}else if(t.identifier===rid){const[dx,dy]=clamp(t.clientX-rx0,t.clientY-ry0);setStick(sR,rx0,ry0,dx,dy);Pad.rx=dx/R;Pad.ry=dy/R;}}e.preventDefault();},{passive:false});
    function end(e){for(const t of e.changedTouches){if(t.identifier===lid){lid=null;Pad.lx=0;Pad.ly=0;sL.classList.add('hidden');}else if(t.identifier===rid){rid=null;Pad.rx=0;Pad.ry=0;sR.classList.add('hidden');}}e.preventDefault();}
    T.addEventListener('touchend',end,{passive:false});T.addEventListener('touchcancel',end,{passive:false});
    $('tdash').addEventListener('touchstart',e=>{e.preventDefault();e.stopPropagation();touchUsed=true;updateTouchVis();if(state==='play')dashReq=true;},{passive:false});
    $('tbomb').addEventListener('touchstart',e=>{e.preventDefault();e.stopPropagation();touchUsed=true;updateTouchVis();if(state==='play')specialReq=true;},{passive:false});
    $('tpause').addEventListener('touchstart',e=>{e.preventDefault();e.stopPropagation();touchUsed=true;updateTouchVis();if(state==='play')togglePause();updateTouchVis();},{passive:false});
    setInterval(updateTouchVis,150);
  })();

  // Gamepad
  const Pad={lx:0,ly:0,rx:0,ry:0,lt:0,rt:0,btns:[],prev:[],connected:false,name:'',navCool:0,
    poll(){const list=navigator.getGamepads?navigator.getGamepads():[];let gp=null;for(const g of list)if(g&&g.connected){gp=g;break;}
      if(!gp){if(this.connected){this.connected=false;}return;}
      if(!this.connected){this.connected=true;this.name=gp.id.split('(')[0].trim().slice(0,28);startAudio();toast('🎮 '+this.name);}
      const dz=0.22;
      const ax=v=>Math.abs(v)<dz?0:(v-Math.sign(v)*dz)/(1-dz);
      this.lx=ax(gp.axes[0]||0);this.ly=ax(gp.axes[1]||0);
      this.rx=ax(gp.axes[2]||0);this.ry=ax(gp.axes[3]||0);
      this.lt=gp.buttons[6]?gp.buttons[6].value:0;this.rt=gp.buttons[7]?gp.buttons[7].value:0;
      this.prev=this.btns;this.btns=gp.buttons.map(b=>b.pressed||b.value>0.5);
      const active=Math.abs(this.lx)>0.1||Math.abs(this.ly)>0.1||Math.abs(this.rx)>0.1||Math.abs(this.ry)>0.1||this.btns.some(Boolean)||this.lt>0.2||this.rt>0.2;
      if(active)setInput('pad');},
    p(i){return this.btns[i]&&!this.prev[i];},
  };
  setInterval(()=>{try{Pad.poll();}catch(e){}},16);
  addEventListener('gamepadconnected',e=>{Pad.connected=true;});

  // Menu-Navigation per Pad
  let focusList=[],focusIdx=0;
  function visiblePanel(){for(const id of [...OVL,'pause','steamdex','stats'])if(!$(id).classList.contains('hidden'))return $(id);return null;}
  function refreshFocusList(){focusList=[];const p=visiblePanel();if(!p)return;p.querySelectorAll('.focusable, .card, .item .buy').forEach(el=>{if(!el.disabled&&el.offsetParent!==null)focusList.push(el);});focusIdx=Math.min(focusIdx,focusList.length-1);if(focusIdx<0)focusIdx=0;applyFocus();}
  function applyFocus(){focusList.forEach((el,i)=>el.classList.toggle('padfocus',i===focusIdx&&inputMode==='pad'));}
  function moveFocus(d){if(!focusList.length)return;focusIdx=(focusIdx+d+focusList.length)%focusList.length;applyFocus();const el=focusList[focusIdx];if(el&&el.scrollIntoView)el.scrollIntoView({block:'nearest'});}
  function activateFocus(){if(focusList[focusIdx])focusList[focusIdx].click();}
  // Pad-Navigation pro Frame
  function padNav(dt){if(!Pad.connected)return;Pad.navCool-=dt;
    if(state==='play'){
      if(Pad.p(0)){dashReq=true;}
      if(Pad.p(2)){specialReq=true;}
      if(Pad.p(1)){togglePause();}
      if(Pad.p(3)){toggleMute();}
      if(Pad.lt>0.7&&!Pad._ltOld)dashReq=true;Pad._ltOld=Pad.lt>0.7;
    }else{
      if(Pad.navCool<=0){const ay=Pad.ly,ax=Pad.lx;
        if(Pad.btns[12]||ay<-0.5){moveFocus(-1);Pad.navCool=0.18;}
        else if(Pad.btns[13]||ay>0.5){moveFocus(1);Pad.navCool=0.18;}
        else if(Pad.btns[14]||ax<-0.5){moveFocus(-1);Pad.navCool=0.18;}
        else if(Pad.btns[15]||ax>0.5){moveFocus(1);Pad.navCool=0.18;}}
      if(Pad.p(0))activateFocus();
      if(Pad.p(1)){if(!$('steamdex').classList.contains('hidden'))$('dexback').click();else if(!$('stats').classList.contains('hidden'))$('statback').click();else if(!$('pause').classList.contains('hidden'))togglePause();}
    }}

