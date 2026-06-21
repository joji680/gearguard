"use strict";
  const cv=document.getElementById('game'),ctx=cv.getContext('2d');
  let W=0,H=0;
  function resize(){const r=cv.getBoundingClientRect();W=cv.width=Math.max(1,Math.floor(r.width));H=cv.height=Math.max(1,Math.floor(r.height));}
  addEventListener('resize',resize);resize();
  const $=id=>document.getElementById(id);
  const OVL=['menu','upgrade','death','werkstatt','settings','shoponly'];
  function show(name){OVL.forEach(k=>$(k).classList.toggle('hidden',k!==name));['pause','steamdex','stats'].forEach(k=>$(k).classList.add('hidden'));$('hud').classList.toggle('hidden',name!=null);refreshFocusList();}
