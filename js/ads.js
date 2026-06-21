"use strict";
const Ads = {
  adsenseClientId:'', // TODO: nach AdSense-Freischaltung eintragen, z.B. 'ca-pub-1234567890123456'
  slots:{menu:'',hud:'',upgrade:''}, // TODO: data-ad-slot IDs je Platzierung aus AdSense eintragen
  rewardedProvider:null, // TODO: Funktion eines Rewarded-Video-Anbieters eintragen, Signatur: fn(onReward)

  bannerReady(){return !!this.adsenseClientId;},

  loadScript(){
    if(!this.bannerReady()||document.getElementById('adsbygoogle-js'))return;
    const s=document.createElement('script');
    s.id='adsbygoogle-js';s.async=true;s.crossOrigin='anonymous';
    s.src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client='+encodeURIComponent(this.adsenseClientId);
    document.head.appendChild(s);
  },

  initBanner(containerId,slotKey){
    const el=$(containerId);
    if(!el)return;
    if(!this.bannerReady()||!this.slots[slotKey]){el.classList.add('hidden');return;}
    el.classList.remove('hidden');
    el.innerHTML=`<ins class="adsbygoogle" style="display:block" data-ad-client="${this.adsenseClientId}" data-ad-slot="${this.slots[slotKey]}" data-ad-format="auto" data-full-width-responsive="true"></ins>`;
    try{(window.adsbygoogle=window.adsbygoogle||[]).push({});}catch(e){}
  },

  rewardedAvailable(){return !challengeMode&&typeof this.rewardedProvider==='function';},
  showRewarded(onReward){if(this.rewardedAvailable())this.rewardedProvider(onReward);},
};

Ads.loadScript();
Ads.initBanner('admenu','menu');
Ads.initBanner('adhud','hud');
Ads.initBanner('adupgrade','upgrade');
$('reviveadbtn').onclick=()=>Ads.showRewarded(()=>revive());
