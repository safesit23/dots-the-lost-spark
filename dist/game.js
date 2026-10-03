/* DOTS: The Lost Spark. All artwork and audio are generated locally. */
'use strict';
(() => {
const $ = id => document.getElementById(id);
const canvas=$('game'), ctx=canvas.getContext('2d'), overlay=$('overlay');
ctx.imageSmoothingEnabled=false;
const W=320,H=288,KEY='dots.lost-spark.v1';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const rectHit=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const characters=[
 ['Blue Beret','#5788e7','#3557a6','beret'],['Cloud White','#eff4e9','#b9c5d3','cloud'],
 ['Orange Blossom','#f3a069','#cb674d','flower'],['Purple Antenna','#b495dc','#765ba8','antenna'],
 ['Mint Cap','#95d7bc','#4caa91','cap'],['Lime Lookout','#bed982','#88ad53','lookout'],
 ['Golden Scholar','#f2d77d','#c3a259','scholar'],['Pink Bow','#edb1c4','#c377a0','bow'],
 ['Violet Star','#aa95da','#765ca7','star'],['Magenta Shades','#dc86bb','#a95194','shades']
];
const worlds=[
 {name:'Dewdrop Meadow',subtitle:'A seed of something good',sky:'#7585b9',low:'#b2b9cc',grass:'#abdbad',earth:'#777f94',accent:'#f3d99b',width:1920,boss:'Brambleback',types:['seed','seed'],restore:'The gardens unfurl. A little green returns.',story:'The village gardens have gone quiet. Maybe a seed can wake them.',hint:'B inhales a seed. Release B, then spit it into the soil.'},
 {name:'Whisperwind Mills',subtitle:'Follow the gentle breeze',sky:'#697fa9',low:'#bdd0d5',grass:'#b6dabc',earth:'#7c889e',accent:'#d4e9d9',width:2060,boss:'Galecrest',types:['wind','wind'],restore:'The mills turn again. Warm bread fills the village.',story:'Without the mills, the islands drift apart. A breeze could bring them home.',hint:'Spit wind into the mill. Moving platforms follow its song.'},
 {name:'Lantern Caverns',subtitle:'Even a small light is enough',sky:'#29375e',low:'#52628a',grass:'#9bc9bd',earth:'#596083',accent:'#efcd80',width:2000,boss:'Umbra Moth',types:['spark','spark'],restore:'The cave lanterns glow. No one walks home alone.',story:'The caverns remember the stars. Their lanterns only need a spark.',hint:'Spit sparks into lanterns to reveal the hidden stone bridges.'},
 {name:'Clockwork Orchard',subtitle:'Things work better together',sky:'#807997',low:'#d0b9bd',grass:'#b6cf9c',earth:'#847c93',accent:'#f3c587',width:2220,boss:'Ticktock Crab',types:['seed','wind','spark'],restore:'The orchard chimes. Fruit and laughter return.',story:'The orchard has stopped ticking. Roots, wind, and light must work together.',hint:'Grow the root, turn the gear, and light the clock lantern.'},
 {name:'Quiet Observatory',subtitle:'A light is meant to be shared',sky:'#202b50',low:'#56658e',grass:'#a6bcc5',earth:'#646d89',accent:'#f3d695',width:2380,boss:'The Keeper',types:['seed','wind','spark'],restore:'The sparks fly home. The islands shine again.',story:'The Keeper hid the sparks after an old storm. Perhaps it has forgotten how to trust.',hint:'The Keeper asks for SEED, WIND, then SPARK. Watch its core.'}
];
let saveWarning='';
function freshSave(){return {version:1,character:0,completed:[false,false,false,false,false],collectibles:[],best:[null,null,null,null,null],stage:0,checkpoint:36,activated:[],settings:{mute:true,assist:false,reduced:!!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches},started:false,ending:false,lanterns:[]};}
function readSave(){
 const fallback=freshSave();
 try{
  const raw=localStorage.getItem(KEY);if(!raw)return fallback;
  const s=JSON.parse(raw);if(!s||s.version!==1||!Array.isArray(s.completed)||s.completed.length!==5||!s.completed.every(v=>typeof v==='boolean'))throw Error('Invalid save');
  fallback.completed=s.completed;fallback.character=Number.isInteger(s.character)&&s.character>=0&&s.character<10?s.character:0;
  fallback.stage=Number.isInteger(s.stage)&&s.stage>=0&&s.stage<5?s.stage:0;
  const highest=fallback.completed.findIndex(v=>!v);fallback.stage=Math.min(fallback.stage,highest<0?4:highest);
  fallback.checkpoint=[36,worlds[fallback.stage].width-405].includes(s.checkpoint)?s.checkpoint:36;
  fallback.activated=Array.isArray(s.activated)?s.activated.filter(v=>Number.isInteger(v)&&v>=0&&v<3):[];
  fallback.collectibles=Array.isArray(s.collectibles)?[...new Set(s.collectibles.filter(v=>typeof v==='string'&&/^[0-4]:[0-4]$/.test(v)))]:[];
  fallback.best=Array.isArray(s.best)?fallback.best.map((_,i)=>Number.isFinite(s.best[i])&&s.best[i]>0?s.best[i]:null):fallback.best;
  for(const k of ['mute','assist','reduced'])if(typeof s.settings?.[k]==='boolean')fallback.settings[k]=s.settings[k];
  fallback.started=s.started===true;fallback.ending=s.ending===true&&fallback.completed.every(Boolean);
  fallback.lanterns=Array.isArray(s.lanterns)?[...new Set(s.lanterns.filter(v=>Number.isInteger(v)&&v>=0&&v<5))]:[];
  return fallback;
 }catch(e){saveWarning='That save was unreadable. A fresh adventure is ready.';return fallback;}
}
let data=readSave(),mode='title',stage=null,player=null,camera=0,tick=0,playFrames=0,timed=false,chooseReturn='new',mapReturn='title',settingsReturn='title',pausedReturn='play',village=false,toastTime=0,dialogNext=null,selected=data.character;
let particles=[],shots=[],danger=[],coyote=0,jumpBuffer=0,bNeedsRelease=false,winPending=false,celebrationShown=false;
const heldInput=new Map(),pressed=new Set();
const input=k=>[...heldInput.values()].includes(k);
function setInput(source,key,down){const had=input(key);if(down){heldInput.set(source,key);if(!had)pressed.add(key);}else{heldInput.delete(source);if(key==='b'&&!input('b'))bNeedsRelease=false;}syncControls();}
function clearInput(){heldInput.clear();pressed.clear();bNeedsRelease=false;syncControls();}
function syncControls(){document.querySelectorAll('[data-input]').forEach(b=>b.classList.toggle('pressed',input(b.dataset.input)));}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(data));return true;}catch(e){saveWarning='Storage is unavailable. Keep this tab open to retain progress.';toast(saveWarning,300);return false;}}
function checkpointSave(){if(!stage||village||winPending)return;data.stage=stage.index;data.checkpoint=stage.checkpoint;data.activated=stage.puzzles.filter(p=>p.active).map(p=>p.id);persist();}
function toast(message,frames=180){$('toast').textContent=message;toastTime=frames;$('toast').classList.add('visible');}
function screenMode(next,html='',className=''){clearInput();mode=next;overlay.className='overlay '+className;overlay.innerHTML=html;if(next!=='title'){overlay.querySelector('button:not(:disabled)')?.focus({preventScroll:true});document.querySelector?.('.console')?.scrollIntoView?.({block:'center',behavior:'instant'});}if(['play','village'].includes(next))canvas.focus({preventScroll:true});}
function button(label,action,cls=''){return `<button class="${cls}" data-action="${action}">${label}</button>`;}
function title(){village=false;screenMode('title',`<span class="title-kicker">A LITTLE SKY STUDIO ADVENTURE</span><div class="title-logo">dots</div><div class="title-sub">THE LOST SPARK</div><p class="title-copy">A tiny dot. A very big sky.</p><div class="title-actions">${button(data.started?'New adventure':'Find your spark','new','primary')}${data.started?button('Continue','continue'):''}${button('⚙','settings')}</div>`);if(saveWarning)toast(saveWarning,300);}
function choose(returnTo='new'){
 chooseReturn=returnTo;selected=data.character;screenMode('choose',`<div class="kicker">TEN FRIENDS · ONE ADVENTURE</div><h2>Choose your dot</h2><p>A different look. The same little courage.</p><div class="character-grid">${characters.map((c,i)=>`<button class="character ${i===selected?'selected':''}" data-character="${i}" aria-label="${c[0]}" aria-pressed="${i===selected}"><canvas width="40" height="40"></canvas><span>${c[0]}</span></button>`).join('')}</div><div class="choice-footer">${button(returnTo==='new'?'Let’s go →':'Keep wandering →','chosen','primary')} ${button('Back','choose-back')}</div>`,'panel');
 overlay.querySelectorAll('.character').forEach((b,i)=>drawDot(b.querySelector('canvas').getContext('2d'),i,20,34,1,0));
}
function newAdventure(){if(data.started){screenMode('confirm',`<div class="kicker">A FRESH PAGE</div><h2>Start over?</h2><p>This will replace your adventure progress.<br>Your character and settings will stay.</p><div class="menu-buttons">${button('Keep my adventure','title','primary')}${button('Start a new adventure','reset')}</div>`,'panel');}else choose('new');}
function resetProgress(){const settings=data.settings,character=data.character;data=freshSave();data.settings=settings;data.character=character;persist();choose('new');}
function story(text,next,speaker='A little light'){
 dialogNext=next;screenMode('dialog',`<div class="dialog-card"><h2>${speaker}</h2><p>${text}</p>${button('Continue / A →','dialog-next','primary')}</div>`,'dialog');
}
function startAdventure(){data.started=true;persist();makeStage(0);story('You fix little things for the village. In secret, you built a lantern to watch the stars.<br>Tonight, every spark has vanished into the distant observatory.',()=>story(worlds[0].story,()=>resumePlay(),'Dewdrop Meadow'),'The night the lights went out');}
function continueAdventure(){if(data.completed.every(Boolean)){enterVillage();return;}makeStage(data.stage,true);resumePlay();toast('Welcome back. Your checkpoint is safe.');}
function resumePlay(){screenMode(village?'village':'play');}
function pause(){if(mode==='pause'){resumePlay();return;}if(!['play','village'].includes(mode))return;pausedReturn=mode;checkpointSave();screenMode('pause',`<div class="kicker">TAKE A LITTLE BREATHER</div><h2>Cloudside pause</h2><p>${village?'Lantern Village':worlds[stage.index].name}<br>Progress is saved at your last safe flag.</p><div class="menu-buttons">${button('Keep going','resume','primary')}${button('World map','map')}${button('Change dot','change-dot')}${button('Settings','settings')}${button('Visit village','village')}${button('Title screen','title')}</div><p class="small">Down + B drops an object.<br>Hold A in the air to float as long as you like.</p>`,'panel');}
function showSettings(){settingsReturn=mode==='pause'?'pause':mode==='map'?'map':'title';screenMode('settings',`<div class="kicker">MAKE YOURSELF AT HOME</div><h2>Little adjustments</h2><label class="setting"><span>Sound<small>Original, gentle chiptunes</small></span><input type="checkbox" data-setting="sound" ${!data.settings.mute?'checked':''}></label><label class="setting"><span>Assist mode<small>More hearts, gentler hazards, slower bosses</small></span><input type="checkbox" data-setting="assist" ${data.settings.assist?'checked':''}></label><label class="setting"><span>Reduced motion<small>No screen shake or drifting decorations</small></span><input type="checkbox" data-setting="reduced" ${data.settings.reduced?'checked':''}></label><p class="small">Everyone can float without a time limit.<br>There’s no wrong way to get home.</p>${button('Done','settings-back','primary')}`,'panel');}
function formatTime(frames){const sec=Math.floor(frames/60);return `${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;}
function map(){if(mode!=='map')mapReturn=['play','village','pause'].includes(mode)?(village?'village':'play'):'title';checkpointSave();screenMode('map',`<div class="kicker">THE FLOATING ISLANDS</div><h2>A sky to come home to</h2><div class="map-list">${worlds.map((w,i)=>{const open=i===0||data.completed[i-1],done=data.completed[i];return `<button class="world-card" data-world="${i}" ${!open?'disabled':''}><span class="world-num">0${i+1}</span><span>${w.name}<small>${done?'Replay · '+data.collectibles.filter(c=>c.startsWith(i+':')).length+'/5 starlings':open?'Ready to explore':'Restore the previous island'}${data.best[i]?' · best '+formatTime(data.best[i]):''}</small></span><span class="world-status">${done?'✦':open?'→':'⌑'}</span></button>`;}).join('')}</div><label class="setting"><span>Timed replay<small>Completed islands · deaths keep the clock running</small></span><input id="timed-mode" type="checkbox" ${timed?'checked':''}></label><div class="menu-buttons">${button('Village','village')}${button('Back','map-back')}</div>`,'panel');}
function mapStart(index){data.started=true;const replay=data.completed[index];timed=replay&&!!$('timed-mode')?.checked;makeStage(index,false);checkpointSave();story(worlds[index].story,()=>resumePlay(),worlds[index].name);}
function restoration(){
 if(winPending)return;winPending=true;const i=stage.index;data.completed[i]=true;data.started=true;
 if(timed&&(data.best[i]===null||playFrames<data.best[i]))data.best[i]=playFrames;
 data.stage=Math.min(i+1,4);data.checkpoint=36;data.activated=[];persist();
 const done=()=>{screenMode('restore',`<div class="kicker">ISLAND 0${i+1} RESTORED</div><div class="restoration-icon">✦</div><h2>${i===4?'Let the lights go home.':'A little brighter.'}</h2><p>${worlds[i].restore}</p><span class="badge">${data.completed.filter(Boolean).length} / 5 islands shining${timed?' · '+formatTime(playFrames):''}</span><p class="small">${i===4?'The Keeper is coming to the celebration, too.':'Your village is growing with every light.'}</p><div class="menu-buttons">${button(i===4?'Go home →':'Next island →',i===4?'ending-village':'next-world','primary')}${button('Visit village','village')}${button('World map','map')}</div>`,'panel');};
 if(i===4)story('“I thought if I hid the sparks, the storm could never take them.”<br>You lift your little lantern. “A light is safer when we share it.”',done,'The Keeper');else done();
}
function dispatch(action){unlockAudio();switch(action){
 case 'new':newAdventure();break;case 'reset':resetProgress();break;case 'title':checkpointSave();title();break;case 'continue':continueAdventure();break;
 case 'chosen':data.character=selected;persist();if(chooseReturn==='new')startAdventure();else resumePlay();break;
 case 'choose-back':chooseReturn==='new'?title():resumePlay();break;
 case 'dialog-next':{const fn=dialogNext;dialogNext=null;if(fn)fn();break;}
 case 'resume':resumePlay();break;case 'map':map();break;case 'change-dot':choose('resume');break;case 'settings':showSettings();break;
 case 'settings-back':if(settingsReturn==='pause'){mode='play';pause();}else if(settingsReturn==='map')map();else title();break;
 case 'map-back':if(mapReturn==='title')title();else resumePlay();break;
 case 'village':enterVillage();break;case 'ending-village':enterVillage();story('Home, at last. Walk to each lantern and press UP to share a spark.<br>Tonight, everyone gets to see the stars.',()=>resumePlay(),'Lantern Village');break;
 case 'next-world':mapStart(Math.min(stage.index+1,4));break;case 'celebrate-close':resumePlay();break;
 }}
overlay.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;if(b.dataset.action)dispatch(b.dataset.action);if(b.dataset.character!==undefined){selected=Number(b.dataset.character);overlay.querySelectorAll('.character').forEach((el,i)=>{el.classList.toggle('selected',i===selected);el.setAttribute('aria-pressed',i===selected);});}if(b.dataset.world!==undefined)mapStart(Number(b.dataset.world));});
overlay.addEventListener('change',e=>{const k=e.target.dataset.setting;if(!k)return;if(k==='sound'){data.settings.mute=!e.target.checked;unlockAudio();updateSound();}else{data.settings[k]=e.target.checked;if(k==='assist'&&player)player.hp=player.maxHp=data.settings.assist?8:5;}persist();});
const keyMap={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',Space:'a',KeyZ:'a',KeyX:'b',KeyJ:'b'};
window.addEventListener('keydown',e=>{
 const gameKey=keyMap[e.code];if(['Tab','Escape','Enter'].includes(e.code)){if(e.code==='Tab'&&mode==='title')return;if(e.code==='Tab'){e.preventDefault();if(!e.repeat){if(mode==='map')dispatch('map-back');else if(['play','village','pause'].includes(mode))map();}return;}
 if(['play','village','pause'].includes(mode)){e.preventDefault();if(!e.repeat)pause();return;}
 if(mode==='dialog'&&!e.repeat){e.preventDefault();dispatch('dialog-next');return;}return;}
 if(gameKey&&['play','village','dialog'].includes(mode)){e.preventDefault();unlockAudio();if(mode==='dialog'){if(gameKey==='a'&&!e.repeat)dispatch('dialog-next');return;}setInput('key:'+e.code,gameKey,true);}
});
window.addEventListener('keyup',e=>{if(keyMap[e.code])setInput('key:'+e.code,keyMap[e.code],false);});
document.querySelectorAll('[data-input]').forEach(b=>{
 b.addEventListener('pointerdown',e=>{e.preventDefault();unlockAudio();if(mode==='dialog'&&b.dataset.input==='a'){dispatch('dialog-next');return;}if(!['play','village'].includes(mode))return;b.setPointerCapture(e.pointerId);setInput('ptr:'+e.pointerId,b.dataset.input,true);});
 const release=e=>{e.preventDefault();setInput('ptr:'+e.pointerId,b.dataset.input,false);};b.addEventListener('pointerup',release);b.addEventListener('pointercancel',release);b.addEventListener('lostpointercapture',release);b.addEventListener('contextmenu',e=>e.preventDefault());
});
$('start-button').onclick=()=>{unlockAudio();pause();};$('map-button').onclick=()=>{unlockAudio();if(mode==='map')dispatch('map-back');else if(['play','village','pause','title'].includes(mode))map();};
window.addEventListener('blur',()=>{clearInput();if(['play','village'].includes(mode))pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();if(['play','village'].includes(mode))pause();}});
window.addEventListener('pagehide',checkpointSave);
// A small original pentatonic score, synthesized after the first gesture.
let audio=null,master=null,musicClock=0,noteIndex=0;
function unlockAudio(){if(!audio){try{audio=new (window.AudioContext||window.webkitAudioContext)();master=audio.createGain();master.gain.value=data.settings.mute?0:.15;master.connect(audio.destination);}catch(e){return;}}if(audio.state==='suspended')audio.resume().catch(()=>{});}
function updateSound(){if(master)master.gain.setTargetAtTime(data.settings.mute?0:.15,audio.currentTime,.05);$('sound').innerHTML='♪ <span>Sound '+(data.settings.mute?'off':'on')+'</span>';$('sound').setAttribute('aria-label',data.settings.mute?'Unmute sound':'Mute sound');}
$('sound').onclick=()=>{data.settings.mute=!data.settings.mute;unlockAudio();updateSound();persist();};
function tone(freq,duration=.12,type='square',volume=.2,slide=0){if(!audio||data.settings.mute)return;const osc=audio.createOscillator(),gain=audio.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,audio.currentTime);if(slide)osc.frequency.exponentialRampToValueAtTime(slide,audio.currentTime+duration);gain.gain.setValueAtTime(volume,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);osc.connect(gain);gain.connect(master);osc.start();osc.stop(audio.currentTime+duration);}
function sound(name){const notes={jump:[330,.14,'square',.3,620],inhale:[180,.13,'triangle',.4,280],spit:[650,.13,'square',.25,180],hit:[130,.2,'sawtooth',.23,70],collect:[880,.18,'triangle',.45,1320],light:[523,.35,'triangle',.4,1046],win:[784,.6,'triangle',.5,1568]};if(notes[name])tone(...notes[name]);}
function music(){if(!audio||data.settings.mute||['pause','settings','choose','map','confirm'].includes(mode))return;if(++musicClock<19)return;musicClock=0;const melody=[0,7,12,7,4,7,9,7,0,4,7,12,9,7,4,2,0,7,9,12,14,12,7,4,2,4,7,9,7,4,2,0];const base=village?196:stage?174+stage.index*6:196;const n=melody[noteIndex%melody.length];tone(base*Math.pow(2,n/12),.21,'triangle',.23);if(noteIndex%4===0)tone(base/2*Math.pow(2,(noteIndex<16?0:5)/12),.5,'square',.1);noteIndex++;}
// Pixel drawing primitives: scanline ellipses keep the artwork crisp.
function box(x,y,w,h,color,g=ctx){g.fillStyle=color;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function ellipse(x,y,rx,ry,color,g=ctx){g.fillStyle=color;for(let j=-Math.ceil(ry);j<=ry;j++){const s=1-j*j/(ry*ry);if(s<0)continue;const width=Math.floor(rx*Math.sqrt(s));g.fillRect(Math.round(x-width),Math.round(y+j),width*2+1,1);}}
function pixelPoly(points,color,g=ctx){const ys=points.map(p=>p[1]);for(let y=Math.ceil(Math.min(...ys));y<=Math.max(...ys);y++){const xs=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y))xs.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]));}xs.sort((a,b)=>a-b);for(let i=0;i<xs.length;i+=2)box(xs[i],y,xs[i+1]-xs[i]+1,1,color,g);}}
const spriteCache=new Map();
function dotSprite(index,expression=0){const key=index+':'+expression;if(spriteCache.has(key))return spriteCache.get(key);const c=document.createElement('canvas');c.width=40;c.height=40;const g=c.getContext('2d');g.imageSmoothingEnabled=false;const [,color,shade,kind]=characters[index],outline='#303651';
 function shape(col,expand=0){if(kind==='scholar')pixelPoly([[19,8-expand],[8-expand,30+expand],[31+expand,30+expand]],col,g);else if(kind==='shades'){ellipse(14,19,8+expand,9+expand,col,g);ellipse(26,19,8+expand,9+expand,col,g);pixelPoly([[6-expand,21],[34+expand,21],[20,34+expand]],col,g);}else{ellipse(20,24,13+expand,9+expand,col,g);ellipse(12,20,7+expand,7+expand,col,g);ellipse(24,16,8+expand,8+expand,col,g);ellipse(29,23,7+expand,7+expand,col,g);}}
 if(kind==='bow'){ellipse(11,10,4,9,outline,g);ellipse(27,9,4,9,outline,g);ellipse(11,10,3,8,color,g);ellipse(27,9,3,8,color,g);box(10,5,2,7,'#fae2d5',g);box(26,4,2,7,'#fae2d5',g);}
 if(kind==='antenna'){box(12,3,3,16,shade,g);box(27,3,3,16,shade,g);}
 if(kind==='lookout'){ellipse(12,13,5,7,outline,g);ellipse(28,13,5,7,outline,g);ellipse(12,13,4,6,color,g);ellipse(28,13,4,6,color,g);}
 shape(outline,1);shape(shade);shape(color,-1);ellipse(15,17,4,2,index===1?'#ffffff':colorBlend(color,.2),g);
 if(kind==='beret'){pixelPoly([[7,9],[11,5],[25,3],[31,6],[31,10],[23,12],[7,13]],'#242638',g);box(18,1,3,4,'#242638',g);box(12,6,10,2,'#3d3e50',g);}
 if(kind==='cap'){ellipse(21,10,9,5,'#4b79c8',g);box(14,11,19,3,'#365996',g);box(21,7,3,4,'#90bbef',g);}
 if(kind==='flower'){for(const [dx,dy] of [[0,-4],[4,0],[0,4],[-4,0]])ellipse(11+dx,12+dy,3,3,'#fff4df',g);box(9,10,4,4,'#e4c465',g);}
 if(kind==='bow'){pixelPoly([[23,7],[23,1],[29,4],[35,1],[35,8],[29,6]],'#dc638f',g);box(27,3,4,3,'#f4d49d',g);}
 if(kind==='star')star(29,13,6,'#f6d279',g);
 const eyeY=(kind==='lookout'?12:kind==='antenna'?4:21);const eyeX=kind==='antenna'?[13,28]:kind==='lookout'?[12,28]:[15,25];
 for(const x of eyeX){if(['antenna','lookout'].includes(kind))ellipse(x,eyeY,4,5,'#f4f0db',g);if(expression===1)box(x-1,eyeY+1,3,1,outline,g);else ellipse(x,eyeY,1.5,3,'#202236',g);}
 if(kind==='scholar'){ellipse(13,21,5,6,outline,g);ellipse(26,21,5,6,outline,g);ellipse(13,21,4,5,color,g);ellipse(26,21,4,5,color,g);box(18,20,4,1,outline,g);ellipse(13,21,1,2,outline,g);ellipse(26,21,1,2,outline,g);pixelPoly([[15,30],[15,26],[20,28],[25,26],[25,30],[20,28]],'#685684',g);}
 if(kind==='shades'){ellipse(13,21,5,5,'#26253a',g);ellipse(27,21,5,5,'#26253a',g);box(17,20,6,2,'#26253a',g);box(10,18,3,1,'#5d5375',g);box(24,18,3,1,'#5d5375',g);}
 if(expression===2){ellipse(32,25,3,4,outline,g);ellipse(32,25,2,3,'#725275',g);}else if(expression===3){box(18,26,5,1,outline,g);box(19,27,3,1,outline,g);}
 spriteCache.set(key,c);return c;}
function colorBlend(hex,amount){const n=parseInt(hex.slice(1),16);return '#'+[n>>16,(n>>8)&255,n&255].map(x=>Math.round(x+(255-x)*amount).toString(16).padStart(2,'0')).join('');}
function drawDot(g,index,x,feet,scale=1,expression=0,squash=1,face=1){const sp=dotSprite(index,expression);g.save();g.imageSmoothingEnabled=false;g.translate(Math.round(x),Math.round(feet));g.scale(face,1);g.drawImage(sp,Math.round(-20*scale/squash),Math.round(-34*scale*squash),Math.round(40*scale/squash),Math.round(40*scale*squash));g.restore();}
function star(x,y,r,color,g=ctx){pixelPoly([[x,y-r],[x+2,y-2],[x+r,y],[x+2,y+2],[x,y+r],[x-2,y+2],[x-r,y],[x-2,y-2]],color,g);}
function text(str,x,y,color='#f5ebca',size=8,align='left'){ctx.font=`${size}px monospace`;ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline='top';ctx.fillText(str,Math.round(x),Math.round(y));ctx.textAlign='left';}
function objectIcon(type,x,y,g=ctx){if(type==='seed'){ellipse(x,y,4,5,'#ead995',g);box(x-1,y-3,2,6,'#b39459',g);pixelPoly([[x,y-5],[x+1,y-10],[x+7,y-9],[x+4,y-5]],'#a9d79c',g);}if(type==='wind'){for(let i=0;i<3;i++){box(x-6,y-4+i*4,10-i,1,'#bedfea',g);box(x+4-i,y-5+i*4,2,2,'#bedfea',g);}}if(type==='spark'){star(x,y,6,'#efd587',g);box(x-1,y-1,3,3,'#fff6c8',g);}}
// Hand-authored compact stages; one-way islands and secrets above the main route.
function makeStage(index,restore=false){
 village=false;winPending=false;timed=restore?false:timed;const w=worlds[index];playFrames=0;particles=[];shots=[];danger=[];camera=0;
 const ground=[[0,270,242],[345,230,242],[650,260,242],[995,210,242],[1280,250,242],[1600,w.width-1600,242]];
 if(index===1){ground[1]=[350,220,222];ground[2]=[650,240,242];ground[3]=[980,225,222];}
 if(index===2){ground[1]=[350,210,242];ground[3]=[1005,220,242];}
 if(index>=3){ground[4]=[1280,240,230];ground[5]=[1610,w.width-1610,242];}
 const platforms=ground.map(([x,width,y])=>({x,y,w:width,h:65,kind:'ground'}));
 [[155,187,67],[260,151,55],[442,155,65],[565,185,70],[740,144,65],[880,180,57],[1080,151,70],[1200,185,85],[1390,145,67],[1500,182,63]].forEach(([x,y,width])=>platforms.push({x,y,w:width,h:10,kind:'island'}));
 if(index===1)platforms.push({x:585,y:204,w:54,h:10,kind:'moving',baseX:585,baseY:204,dx:0});
 if(index===3)platforms.push({x:930,y:191,w:56,h:10,kind:'moving',baseX:930,baseY:191,dx:0});
 const puzzleXs=index>=3?[475,850,1395]:[470,1100];
 const puzzles=w.types.map((type,id)=>({id,type,x:puzzleXs[id],y:ground.find(([x,width])=>puzzleXs[id]>=x&&puzzleXs[id]<x+width)?.[2]-17||225,w:18,h:22,active:restore&&data.activated.includes(id)}));
 for(const p of puzzles){if(p.type==='spark')platforms.push({x:p.x+125,y:215,w:105,h:10,kind:'light',puzzle:p.id});if(p.type==='seed')platforms.push({x:p.x+38,y:172,w:65,h:10,kind:'plant',puzzle:p.id});}
 const sources=[];const addSource=(x,y,type)=>sources.push({x,y,w:12,h:14,type,cooldown:0});
 puzzles.forEach(p=>addSource(p.x-60,p.y+5,p.type));addSource(100,228,'seed');
 const arena=w.width-315;
 const types=index===4?['seed','wind','spark']:index===3?['seed','spark','wind']:[w.types[0]];
 types.forEach((type,i)=>addSource(arena+20+i*35,228,type));
 const enemies=[{x:200,y:226,w:16,h:16,home:200,type:'seed',dir:1,dead:false},{x:730,y:226,w:16,h:16,home:730,type:index===0?'seed':index===1?'wind':'spark',dir:-1,dead:false},{x:1310,y:214,w:16,h:16,home:1310,type:w.types[0],dir:1,dead:false}];
 const hazards=[{x:805,y:235,w:38,h:7},{x:1320,y:ground[4][2]-7,w:28,h:7}];
 const collectibles=[[210,153],[470,120],[760,108],[1140,115],[1450,111]].map(([x,y],i)=>({x,y,w:10,h:10,id:index+':'+i,collected:data.collectibles.includes(index+':'+i)}));
 stage={index,...w,platforms,puzzles,sources,enemies,hazards,collectibles,checkpoint:restore?data.checkpoint:36,checkpointSeen:restore&&data.checkpoint>36,arena,boss:{x:w.width-95,y:207,w:40,h:35,hp:index===4?6:4,maxHp:index===4?6:4,active:false,phase:0,timer:0,inv:0,shield:index===3,baseX:w.width-95,attack:0,dead:false,weakness:types[0]},flagX:w.width-405};
 player={x:stage.checkpoint,y:202,w:18,h:20,vx:0,vy:0,face:1,hp:data.settings.assist?8:5,maxHp:data.settings.assist?8:5,held:null,inv:0,ground:false,air:0,squash:1,inhale:false};
 // A safe checkpoint beyond puzzles restores their solved state even if a save was truncated.
 if(stage.checkpoint>stage.flagX-20)stage.puzzles.forEach(p=>p.active=true);
 coyote=0;jumpBuffer=0;clearInput();
}
function enterVillage(){checkpointSave();village=true;winPending=false;particles=[];shots=[];danger=[];camera=0;celebrationShown=data.ending;stage={index:-1,width:960,sky:'#485c85',low:'#879bb5',grass:'#a9cfa5',earth:'#747e8c',accent:'#f0d28a',platforms:[{x:0,y:242,w:960,h:65,kind:'ground'},{x:190,y:180,w:60,h:10,kind:'island'},{x:630,y:169,w:65,h:10,kind:'island'}],puzzles:[],sources:[],enemies:[],hazards:[],collectibles:[],checkpoint:36};player={x:60,y:218,w:18,h:20,vx:0,vy:0,face:1,hp:5,maxHp:5,held:null,inv:0,ground:false,air:0,squash:1,inhale:false};resumePlay();toast(data.completed.every(Boolean)?'UP near lanterns: share the light · MAP: replay islands':'UP near the sign: change dot · MAP: explore islands',240);}
function emit(x,y,color,count=10){if(data.settings.reduced)count=Math.min(count,4);for(let i=0;i<count;i++)particles.push({x,y,vx:(Math.random()-.5)*2.6,vy:-Math.random()*2.2,life:28+Math.random()*15,color});}
function hurt(fall=false){if(player.inv&&!fall)return;player.hp-=data.settings.assist&&!fall?.5:1;player.inv=90;sound('hit');emit(player.x+9,player.y+10,'#ebaaa3');player.vy=-2.7;player.vx=-player.face*1.8;
 if(fall||player.hp<=0){const depleted=player.hp<=0;player.x=stage.checkpoint;player.y=200;player.vx=0;player.vy=0;player.held=null;danger=[];shots=[];if(depleted)player.hp=player.maxHp;
 if(stage.boss){stage.boss.active=false;stage.boss.timer=0;stage.boss.phase=0;stage.boss.hp=stage.boss.maxHp;stage.boss.shield=stage.index===3;stage.boss.inv=0;stage.boss.x=stage.boss.baseX;stage.boss.y=207;}
 toast(depleted?'A fresh breath. Your checkpoint is waiting.':'Caught by a cloud. Try that jump again.');}}
function activate(p){if(p.active)return;p.active=true;sound('light');emit(p.x+8,p.y+6,'#f2d58c',20);toast(p.type==='seed'?'A seed becomes a way forward.':p.type==='wind'?'A breeze sets the island in motion.':'The light reveals a hidden path.');checkpointSave();}
function usablePlatform(pl){return !pl.puzzle&&pl.puzzle!==0||stage.puzzles[pl.puzzle]?.active;}
function fire(){const type=player.held;if(!type)return;player.held=null;bNeedsRelease=true;sound('spit');player.squash=.82;shots.push({x:player.x+9+player.face*13,y:player.y+9,w:10,h:10,vx:player.face*(type==='wind'?4.5:3.7),vy:type==='seed'?-.45:0,type,life:90});}
function inhale(){const px=player.x+9,py=player.y+10;
 const grab=o=>{const ox=o.x+(o.w||12)/2,oy=o.y+(o.h||14)/2,dx=ox-px,dy=oy-py;return dx*player.face>-12&&dx*player.face<67&&Math.abs(dy)<24;};
 for(const source of stage.sources){if(source.cooldown<=0&&grab(source)){source.cooldown=150;player.held=source.type;sound('inhale');emit(source.x,source.y,'#dfefd5',5);return;}}
 for(const e of stage.enemies){if(!e.dead&&grab(e)){e.x-=player.face*2;if(Math.abs(e.x-px)<24){e.dead=true;player.held=e.type;sound('inhale');emit(e.x,e.y,'#dceec7',5);}return;}}
}
function bossUpdate(){const b=stage.boss;if(!b||b.dead)return;if(player.x>stage.arena-10&&!b.active){if(!stage.puzzles.every(p=>p.active)){toast('The island needs its '+stage.puzzles.filter(p=>!p.active).map(p=>p.type).join(' + ')+' first.');player.x=stage.arena-30;return;}b.active=true;b.timer=0;toast(stage.index===4?'The Keeper: match the glowing core.':'A guardian appears. Dodge its tell, then spit!',210);}
 if(!b.active)return;b.inv=Math.max(0,b.inv-1);const speed=data.settings.assist?.65:1;b.timer+=speed;
 const total=stage.index===4?210:stage.index===1?175:190;const time=b.timer%total;
 b.phase=time<65?0:time<115?1:2;
 b.weakness=stage.index===4?['seed','wind','spark'][(b.maxHp-b.hp)%3]:stage.index===3&&b.shield?'spark':worlds[stage.index].types[0];
 if(b.phase===0){b.y=stage.index===2?202+Math.sin(b.timer*.04)*10:207;b.x=b.baseX;}
 if(b.phase===1){b.y=stage.index===2?194:207;if(Math.floor(time)===66){b.target=player.x;b.attack++;}}
 if(b.phase===2){
 const just=time-speed<115;
 if(stage.index===0){b.y=207-Math.sin((time-115)/(total-115)*Math.PI)*48;b.x=b.baseX-Math.sin((time-115)/(total-115)*Math.PI)*100;}
 if(stage.index===1){b.x=b.baseX-Math.sin((time-115)/(total-115)*Math.PI)*160;b.y=203-Math.sin((time-115)/(total-115)*Math.PI)*18;}
 if(stage.index===2){b.y=193;if(just)for(const dy of [-.75,0,.75])danger.push({x:b.x,y:b.y+12,w:8,h:8,vx:-1.9*speed,vy:dy*speed,life:230,type:'shadow'});}
 if(stage.index===3){b.x=b.baseX-Math.sin((time-115)/(total-115)*Math.PI)*145;if(just)danger.push({x:b.x,y:232,w:12,h:8,vx:-2.2*speed,vy:0,life:140,type:'gear'});}
 if(stage.index===4){b.x=b.baseX-20*Math.sin((time-115)*.04);if(just){for(let i=0;i<3;i++)danger.push({x:b.x-8,y:209+i*10,w:9,h:9,vx:-1.7*speed,vy:(i-1)*.35,life:180,type:'star'});}}
 }
 if(rectHit(player,b))hurt();
}
function hitBoss(shot){const b=stage.boss;if(!b?.active||b.dead||b.inv>0)return false;
 if(!rectHit(shot,b))return false;
 if(stage.index===4&&shot.type!==b.weakness){toast('Its core is asking for '+b.weakness.toUpperCase()+'.',90);sound('hit');return true;}
 if(stage.index===3&&b.shield){if(shot.type==='spark'){b.shield=false;sound('light');toast('Its shield is open! Any object can help.',120);}else toast('SPARK weakens the shield.',90);return true;}
 b.hp--;b.inv=48;sound('collect');emit(b.x+20,b.y+16,'#f3d99b',18);if(stage.index===3&&b.hp>0)b.shield=true;
 if(b.hp<=0){b.dead=true;danger=[];sound('win');restoration();}return true;
}
function update(){tick++;if(toastTime>0&&--toastTime===0)$('toast').classList.remove('visible');music();
 if(!['play','village'].includes(mode)){pressed.clear();return;}
 if(!village)playFrames++;const p=player;
 p.inv=Math.max(0,p.inv-1);p.inhale=false;p.squash+=(1-p.squash)*.16;
 const jump=pressed.has('a'),bPress=pressed.has('b'),upPress=pressed.has('up');
 if(jump)jumpBuffer=9;else jumpBuffer=Math.max(0,jumpBuffer-1);
 coyote=p.ground?7:Math.max(0,coyote-1);
 const direction=(input('right')?1:0)-(input('left')?1:0);const crouch=input('down')&&p.ground;
 const target=direction*(crouch?.6:1.65);p.vx+=(target-p.vx)*(p.ground?.3:.17);if(direction)p.face=direction;
 if(jumpBuffer&&coyote){p.vy=-4.7;p.ground=false;coyote=0;jumpBuffer=0;p.air=0;p.squash=1.12;sound('jump');}
 p.air++;const floating=input('a')&&!p.ground&&p.air>12;
 if(floating){p.vy=Math.max(-.75,p.vy-.3);p.vy=Math.min(p.vy,.55);if(tick%12===0)emit(p.x+9,p.y+20,'#c4d9e1',1);}else p.vy=Math.min(4.7,p.vy+.25);
 if(input('down')&&!p.ground)p.vy=Math.min(5,p.vy+.1);
 if(bPress&&p.held){if(input('down')){const type=p.held;p.held=null;bNeedsRelease=true;stage.sources.push({x:p.x+p.face*24,y:p.y+5,w:12,h:14,type,cooldown:15,dropped:true});toast('Object dropped. The wells always refill.',100);}else fire();}
 else if(input('b')&&!p.held&&!bNeedsRelease&&!input('down')){p.inhale=true;inhale();}
 for(const pl of stage.platforms){if(pl.kind==='moving'){const active=stage.puzzles.some(q=>q.type==='wind'&&q.active);const old=pl.x;pl.x=pl.baseX+(active?Math.sin(tick*.015)*36:0);pl.y=pl.baseY-(active?(1+Math.sin(tick*.015))*18:0);pl.dx=pl.x-old;if(p.ground&&p.standing===pl)p.x+=pl.dx;}}
 p.x=clamp(p.x+p.vx,0,stage.width-p.w);const oldY=p.y;p.y+=p.vy;if(p.y<30){p.y=30;p.vy=0;}p.ground=false;p.standing=null;
 for(const pl of stage.platforms){if(!usablePlatform(pl))continue;if(p.vy>=0&&oldY+p.h<=pl.y+5&&p.y+p.h>=pl.y&&p.x+p.w>pl.x&&p.x<pl.x+pl.w){if(p.vy>1.5)p.squash=.82;p.y=pl.y-p.h;p.vy=0;p.ground=true;p.air=0;p.standing=pl;}}
 if(!village){
 for(const q of stage.puzzles){if(q.active)continue;const gx=q.x+75;if(p.x+p.w>gx&&p.x<gx+12){p.x=p.vx>=0?gx-p.w:gx+12;p.vx=0;if(tick%90===0)toast('Spit '+q.type.toUpperCase()+' into the '+(q.type==='seed'?'soil':q.type==='wind'?'mill':'lantern')+'.',130);}}
 if(p.y>310)hurt(true);
 for(const h of stage.hazards)if(rectHit(p,h))hurt();
 for(const e of stage.enemies){if(e.dead)continue;e.x+=e.dir*.38;if(Math.abs(e.x-e.home)>35)e.dir*=-1;e.y=(stage.platforms.find(pl=>pl.kind==='ground'&&e.x>=pl.x&&e.x<pl.x+pl.w)?.y||242)-16;if(rectHit(p,e))hurt();}
 for(const c of stage.collectibles)if(!c.collected&&rectHit(p,c)){c.collected=true;data.collectibles.push(c.id);persist();sound('collect');emit(c.x,c.y,'#f3d888');toast('A starling! '+data.collectibles.filter(s=>s.startsWith(stage.index+':')).length+' / 5 in this island.',90);}
 if(!stage.checkpointSeen&&p.x>stage.flagX-10){stage.checkpointSeen=true;stage.checkpoint=stage.flagX;p.hp=p.maxHp;checkpointSave();sound('light');toast('Checkpoint lit. Hearts restored.',180);}
 bossUpdate();
 }else if(upPress){
 if(Math.abs(p.x-70)<35)choose('resume');
 for(let i=0;i<5;i++)if(Math.abs(p.x-(215+i*140))<32){if(data.completed.every(Boolean)){if(!data.lanterns.includes(i)){data.lanterns.push(i);persist();sound('light');emit(215+i*140,199,'#f5dc8f',22);toast('A lantern for '+['gardens','mills','caverns','orchard','the Keeper'][i]+'.',130);}}else toast(['Gardens','Mills','Caverns','Orchard','Observatory'][i]+(data.completed[i]?' are shining again.':' are waiting for your light.'),130);}
 }
 if(village&&data.lanterns.length===5&&!celebrationShown){celebrationShown=true;data.ending=true;persist();sound('win');story('Every lantern holds a little star. The Keeper learns to look up again.<br>And your secret little lantern? It has the best view of all.<br><br>Thank you for bringing the light home. You can keep wandering or replay any island.',()=>resumePlay(),'The Lost Spark · The end');}
 for(const s of stage.sources){s.cooldown=Math.max(0,s.cooldown-1);}
 for(const s of shots){s.x+=s.vx;s.y+=s.vy;if(s.type==='seed')s.vy+=.015;s.life--;for(const q of stage.puzzles)if(!q.active&&s.type===q.type&&rectHit(s,{x:q.x-4,y:q.y-9,w:28,h:36})){activate(q);s.life=0;}
 for(const e of stage.enemies)if(!e.dead&&rectHit(s,e)){e.dead=true;s.life=0;sound('collect');emit(e.x,e.y,'#d9dcb2');}
 if(s.type==='wind')for(const d of danger)if(rectHit({x:s.x-10,y:s.y-12,w:35,h:35},d)){d.vx=Math.abs(d.vx)+1;d.friendly=true;emit(d.x,d.y,'#c8e6e8',5);}
 if(s.life>0&&hitBoss(s))s.life=0;
 }
 shots=shots.filter(s=>s.life>0);
 for(const d of danger){d.x+=d.vx;d.y+=d.vy;d.life--;if(!d.friendly&&rectHit(p,d)){hurt();d.life=0;}if(d.friendly&&stage.boss&&rectHit(d,stage.boss)&&stage.index!==4&&!stage.boss.shield){if(hitBoss({...d,type:'wind'}))d.life=0;}}
 danger=danger.filter(d=>d.life>0);
 for(const part of particles){part.x+=part.vx;part.y+=part.vy;part.vy+=.05;part.life--;}particles=particles.filter(a=>a.life>0);
 camera=clamp(p.x-110,0,stage.width-W);pressed.clear();
}
function cloud(x,y,scale=1,color='#c8d0de'){ellipse(x,y,22*scale,6*scale,color);ellipse(x-9*scale,y-5*scale,9*scale,7*scale,color);ellipse(x+7*scale,y-8*scale,12*scale,9*scale,color);}
function backdrop(theme,offset=0){
 box(0,0,W,H,theme.sky);for(let y=100;y<246;y+=16)box(0,y,W,16,colorBlend(theme.sky,(y-80)/430));
 const drift=data.settings.reduced?0:tick*.025;
 if(theme.sky==='#29375e'||theme.sky==='#202b50'||theme.sky==='#485c85'){for(let i=0;i<42;i++){let x=(i*53+17-offset*.13)%336;if(x<0)x+=336;const y=20+(i*29)%133;box(x,y,i%7===0?2:1,1,i%3?'#93a7c5':'#f2d99c');}ellipse(269-offset*.02,47,17,17,'#dedabb');ellipse(276-offset*.02,43,16,16,theme.sky);}
 else{ellipse(266-offset*.035,52,16,16,'#f3ddba');ellipse(266-offset*.035,52,20,20,'#f3ddba33');}
 for(let i=0;i<6;i++){const x=((i*89-offset*.18+drift)%530+530)%530-65;cloud(x,65+i%3*23,.7+(i%3)*.25,colorBlend(theme.sky,.45));}
 for(let i=0;i<5;i++){const x=((i*103-offset*.28)%540+540)%540-85,y=172+i%2*25;pixelPoly([[x,y],[x+25,y-13],[x+74,y-9],[x+92,y+4],[x+68,y+39],[x+37,y+52],[x+18,y+27]],colorBlend(theme.sky,.21));box(x+21,y-11,55,3,colorBlend(theme.sky,.4));for(let j=0;j<3;j++)box(x+35+j*9,y+20+j*4,3,7,theme.sky);}
 cloud(40-offset*.06,262,2.1,colorBlend(theme.sky,.54));cloud(205-offset*.07,269,2.5,colorBlend(theme.sky,.47));cloud(330-offset*.06,254,1.6,colorBlend(theme.sky,.6));
 if(theme.name==='Lantern Caverns'){for(let i=0;i<13;i++){const x=i*29-(offset*.45)%29;pixelPoly([[x,28],[x+22,28],[x+9,50+(i%3)*10]],'#202b4d');}for(let i=0;i<8;i++){const x=i*49-(offset*.25)%49;pixelPoly([[x,280],[x+15,235],[x+29,280]],'#354566');}}
 if(theme.name==='Quiet Observatory'){const x=theme.width-170-offset;box(x,65,100,177,'#485778');ellipse(x+50,65,51,29,'#63718c');box(x+12,112,14,29,'#283753');box(x+40,99,20,46,'#edd693');box(x+76,112,14,29,'#283753');box(x+5,174,90,3,'#8392a2');box(x+45,28,8,20,'#b2bec9');pixelPoly([[x+40,26],[x+60,21],[x+71,34],[x+50,40]],'#9aabc3');}
}
function platformArt(pl,theme){if(!usablePlatform(pl)){if(pl.kind==='light')for(let x=pl.x;x<pl.x+pl.w;x+=14)box(x-camera,pl.y,4,1,'#7c8c9b');return;}const x=Math.round(pl.x-camera),y=pl.y;if(x>330||x+pl.w<-10)return;
 if(pl.kind==='plant'){box(x+pl.w/2-3,y+9,5,70,'#5e947d');for(let n=0;n<3;n++){ellipse(x+pl.w/2+(n%2?-9:9),y+24+n*17,9,3,'#a8ce98');}box(x,y,pl.w,5,'#badd99');box(x+4,y+5,pl.w-8,5,'#709f7b');return;}
 if(pl.kind==='light'){box(x,y,pl.w,4,'#d6d3af');box(x+2,y+4,pl.w-4,7,'#8d9baf');for(let n=8;n<pl.w;n+=18)box(x+n,y+3,1,7,'#667691');return;}
 if(pl.kind==='moving'){box(x,y,pl.w,4,'#d4bd94');box(x+3,y+4,pl.w-6,7,'#82989e');box(x+pl.w/2-2,y+10,4,10,'#c5b99a');ellipse(x+pl.w/2,y+22,8,8,'#5d7188');ellipse(x+pl.w/2,y+22,4,4,'#cbd8d1');return;}
 const h=pl.kind==='ground'?55:27;box(x+3,y+5,pl.w-6,h,theme.earth);box(x+8,y+h,pl.w-16,6,theme.earth);if(pl.kind!=='ground')pixelPoly([[x+8,y+h],[x+pl.w-8,y+h],[x+pl.w*.55,y+h+25]],theme.earth);
 box(x,y,pl.w,5,theme.grass);box(x+1,y+5,pl.w-2,3,colorBlend(theme.grass,-.2));
 for(let n=6;n<pl.w-3;n+=11){box(x+n,y-2,2,4,theme.grass);if(n%3)box(x+n+3,y-3,1,3,theme.grass);}
 for(let n=8;n<pl.w-5;n+=18){box(x+n,y+16+(n%4)*6,5,2,colorBlend(theme.earth,.15));box(x+n+3,y+31,2,4,colorBlend(theme.earth,.13));}
 if(pl.kind==='ground')for(let n=26;n<pl.w-15;n+=64){const cx=x+n;box(cx,y-6,1,6,'#76a28c');box(cx-2,y-7,5,2,n%3?'#eee1ba':'#d5add0');box(cx,y-8,1,4,'#f6d695');}
}
function mill(x,y,active,small=false){const scale=small?.65:1;box(x-8*scale,y-12*scale,16*scale,27*scale,'#d4cbb0');box(x-10*scale,y+14*scale,20*scale,3*scale,'#64748a');pixelPoly([[x-12*scale,y-12*scale],[x,y-27*scale],[x+12*scale,y-12*scale]],'#798796');box(x-2,y+3,5,11,'#63718b');const angle=active&&!data.settings.reduced?tick*.025:Math.PI/4;for(let i=0;i<4;i++){const a=angle+i*Math.PI/2;for(let j=3;j<23*scale;j++)box(x+Math.cos(a)*j-2,y-14*scale+Math.sin(a)*j-2,4,4,'#dce2cb');}ellipse(x,y-14*scale,3,3,'#f0ce8c');}
function lantern(x,y,lit,large=false){const r=large?8:5;if(lit){ellipse(x,y,r+6,r+7,'#efd58b22');star(x,y,r+2,'#f4db9a22');}box(x-r,y-r,r*2,2,'#a59780');box(x-r,y+r,r*2,2,'#a59780');box(x-r,y-r,1,r*2+1,'#a59780');box(x+r-1,y-r,1,r*2+1,'#a59780');box(x-r+1,y-r+2,r*2-2,r*2-2,lit?'#f5d890':'#52647f');if(lit)box(x-1,y-2,2,5,'#fff1b5');box(x-2,y-r-4,4,3,'#a59780');}
function puzzleArt(q){const x=q.x-camera,y=q.y;
 if(q.type==='seed'){box(x-5,y+17,28,5,'#b78e7b');box(x-2,y+12,22,8,'#8a736d');box(x+3,y+11,12,1,'#c8a88b');if(q.active){box(x+8,y-7,2,23,'#8cbe88');ellipse(x+4,y+1,5,2,'#b5d59a');ellipse(x+13,y-4,5,2,'#b5d59a');}else objectIcon('seed',x+9,y+3);}
 if(q.type==='wind')mill(x+9,y+4,q.active,true);
 if(q.type==='spark'){box(x+8,y+8,2,14,'#a1a5aa');lantern(x+9,y,q.active,true);}
 if(!q.active){const gx=x+75;box(gx,29,12,213,'#53657da8');for(let j=32;j<241;j+=12){box(gx+2,j,8,2,'#b7c4c2');}objectIcon(q.type,gx+6,126);text(q.type.toUpperCase(),x+9,y-24,'#f4e3b1',7,'center');}
 else if(q.type==='wind'&&!data.settings.reduced)for(let i=0;i<4;i++)box(x+25+((tick+i*21)%80),y-12+i*8,12,1,'#b5dbe0');
}
function enemyArt(e){const x=e.x-camera,y=e.y;const colors={seed:['#b9cb86','#799469'],wind:['#c1d7dd','#7ca5b2'],spark:['#c7acda','#8c76ac']};const [c,s]=colors[e.type];ellipse(x+8,y+9,8,6,'#3c4658');ellipse(x+8,y+8,7,6,s);ellipse(x+8,y+6,6,4,c);box(x+4,y+6,2,3,'#29364a');box(x+10,y+6,2,3,'#29364a');if(e.type==='seed'){box(x+7,y-3,2,5,'#739968');ellipse(x+11,y-3,4,2,'#c9dd98');}if(e.type==='wind'){box(x-3,y+3,5,2,c);box(x+14,y+3,5,2,c);}if(e.type==='spark')star(x+8,y-3,3,'#e9d395');}
function bossArt(b){const x=b.x-camera,y=b.y;if(b.inv>0&&tick%6<3)return;const i=stage.index;
 if(i===0){ellipse(x+22,y+17,20,16,'#394955');ellipse(x+22,y+16,18,15,'#79987b');ellipse(x+23,y+13,13,11,'#a8ba84');ellipse(x+23,y+13,8,7,'#7e956e');ellipse(x+23,y+13,4,3,'#c7d19a');ellipse(x+4,y+25,10,8,'#bacc91');box(x-1,y+12,2,11,'#829576');box(x+8,y+10,2,13,'#829576');box(x-2,y+11,3,4,'#253b4c');box(x+7,y+9,3,4,'#253b4c');for(let k=0;k<4;k++)pixelPoly([[x+12+k*7,y+3],[x+14+k*7,y-4],[x+17+k*7,y+4]],'#d3c9a0');}
 if(i===1){const flap=b.phase===1?2:Math.sin(tick*.16)*4;pixelPoly([[x+8,y+15],[x-12,y+2+flap],[x-20,y+15],[x+5,y+26]],'#96b5c8');pixelPoly([[x+30,y+15],[x+55,y+2+flap],[x+60,y+15],[x+33,y+26]],'#96b5c8');ellipse(x+20,y+18,16,17,'#dde1c2');pixelPoly([[x+3,y+6],[x+6,y-5],[x+14,y+5]],'#8aabbd');pixelPoly([[x+25,y+5],[x+33,y-5],[x+36,y+6]],'#8aabbd');ellipse(x+13,y+12,6,7,'#6b849f');ellipse(x+27,y+12,6,7,'#6b849f');box(x+12,y+11,2,4,'#f0dc99');box(x+26,y+11,2,4,'#f0dc99');pixelPoly([[x+17,y+18],[x+23,y+18],[x+20,y+24]],'#d7ac6d');}
 if(i===2){const flap=Math.sin(tick*.11)*6;ellipse(x-1,y+11,19,13+flap,'#9c91ba');ellipse(x+40,y+11,19,13-flap,'#9c91ba');ellipse(x-1,y+11,12,8,'#54678c');ellipse(x+40,y+11,12,8,'#54678c');star(x-1,y+11,5,'#d9c895');star(x+40,y+11,5,'#d9c895');ellipse(x+20,y+17,7,18,'#cac1cd');ellipse(x+20,y+7,9,8,'#e0d1cd');box(x+15,y+6,2,4,'#313452');box(x+24,y+6,2,4,'#313452');box(x+15,y-7,1,8,'#cfbcae');box(x+24,y-7,1,8,'#cfbcae');}
 if(i===3){for(let k=0;k<3;k++){box(x+5+k*12,y+28,4,9,'#d9b57e');box(x+2+k*12,y+35,9,3,'#d9b57e');}box(x-12,y+9,10,14,'#b89470');box(x+42,y+9,10,14,'#b89470');ellipse(x+20,y+17,23,17,'#505675');ellipse(x+20,y+16,21,15,b.shield?'#aab8ba':'#d1a685');ellipse(x+20,y+16,11,11,'#5b6580');box(x+19,y+7,2,10,'#efcf90');box(x+19,y+15,8,2,'#efcf90');ellipse(x+8,y+4,4,5,'#ecdba5');ellipse(x+32,y+4,4,5,'#ecdba5');box(x+7,y+3,2,3,'#39445d');box(x+31,y+3,2,3,'#39445d');if(b.shield){for(let k=0;k<5;k++)star(x-3+k*11,y+32+(k%2?3:0),2,'#d4ddda');}}
 if(i===4){box(x+3,y-15,34,40,'#b7b3b2');box(x+6,y-12,28,34,'#73809a');pixelPoly([[x+3,y-15],[x+20,y-26],[x+37,y-15]],'#d2c7ab');box(x+12,y-6,5,3,'#e8d5a0');box(x+24,y-6,5,3,'#e8d5a0');box(x-8,y+6,11,13,'#a4a7ad');box(x+37,y+6,11,13,'#a4a7ad');box(x+7,y+26,8,9,'#c0b39b');box(x+26,y+26,8,9,'#c0b39b');ellipse(x+20,y+11,10,10,'#364c6b');objectIcon(b.weakness,x+20,y+11);box(x+2,y-14,36,2,'#e3cea0');}
 if(b.phase===1){text('!',x+20,y-39,'#ffd498',14,'center');box(x-8,y+37,60,2,'#edb08d');}
}
function hut(x,y,lit,color){box(x,y,49,42,'#c6c1ac');box(x+4,y+5,41,36,'#a8b4ac');pixelPoly([[x-8,y+1],[x+24,y-28],[x+58,y+1]],color);box(x-7,y,64,4,'#7b8491');box(x+18,y+17,14,25,'#586b7c');box(x+5,y+10,9,11,lit?'#f0d798':'#6f8294');box(x+36,y+10,9,11,lit?'#f0d798':'#6f8294');box(x+19,y+19,12,2,'#859397');if(lit)lantern(x+25,y+9,true);box(x+42,y-24,6,16,'#b1b6a9');}
function villageArt(){if(data.completed[0]){for(let j=0;j<5;j++){box(111+j*9-camera,226,2,16,'#8cb58b');ellipse(112+j*9-camera,224,4,2,'#c6dba5');}}if(data.completed[1])mill(365-camera,162,true,true);if(data.completed[2]){lantern(510-camera,174,true);lantern(544-camera,169,true);}if(data.completed[3]){box(690-camera,176,4,66,'#8c9b86');ellipse(692-camera,172,20,18,'#b0c694');ellipse(685-camera,172,4,4,'#e6b486');ellipse(705-camera,165,4,4,'#e6b486');}drawDot(ctx,2,132-camera,240,.7,3);drawDot(ctx,4,450-camera,242,.7,3);drawDot(ctx,6,730-camera,242,.7,3);for(let i=0;i<5;i++){const wx=210+i*140,x=wx-camera,lit=data.completed[i];hut(x-25,183,lit,['#98b693','#b6af92','#959bb7','#c5a98c','#8c9fae'][i]);lantern(x+5,206,data.completed.every(Boolean)?data.lanterns.includes(i):lit);drawDot(ctx,(i*2+1)%10,x+34,240,.8,lit?3:0,1);if(data.completed.every(Boolean)&&!data.lanterns.includes(i))text('↑ LIGHT',x,155,'#f0d99d',7,'center');}
 const x=70-camera;box(x-2,212,4,29,'#a2a694');box(x-23,198,45,17,'#e0d4b3');text('↑ DOTS',x,203,'#5a6575',7,'center');drawDot(ctx,0,840-camera,223,.72,3);drawDot(ctx,8,887-camera,241,.8,3);if(data.completed.every(Boolean)){box(924-camera,207,18,31,'#8794a5');ellipse(933-camera,204,12,11,'#b2baaf');box(929-camera,202,2,3,'#f5d792');box(936-camera,202,2,3,'#f5d792');}for(let i=0;i<12;i++){const x=(i*91+20)-camera;box(x,175+i%3*9,2,1,data.completed[i%5]?'#ecd29a':'#7288a1');}}
function drawTitle(){const theme={...worlds[0],sky:'#384c78'};backdrop(theme,0);pixelPoly([[30,203],[51,186],[247,186],[287,204],[247,229],[164,267],[70,235]],'#637591');box(48,184,211,5,'#b5d5b2');box(62,189,188,7,'#82aa92');for(let i=0;i<14;i++)box(58+i*13,181-(i%3)*2,2,4,'#b5d5b2');hut(83,149,true,'#839c9f');box(233,145,3,41,'#aab8aa');lantern(234,143,true,true);drawDot(ctx,data.character,178,190,1.55,tick%240>232?1:3,1+(data.settings.reduced?0:Math.sin(tick*.045)*.025));drawDot(ctx,5,222,190,.75,0);for(let i=0;i<6;i++)star(53+i*41,29+(i*17)%100,2,'#edd596');}
function render(){ctx.clearRect(0,0,W,H);if(mode==='title'||mode==='confirm'||(!stage&&mode!=='play')){drawTitle();return;}if(!stage){drawTitle();return;}
 backdrop(stage,camera);
 if(village)villageArt();
 if(!village){if(stage.index===1){for(let i=0;i<4;i++)mill(170+i*410-camera,191,true);}if(stage.index===3){for(let i=0;i<7;i++){const x=180+i*270-camera;box(x,167,6,75,'#899787');ellipse(x+3,159,23,22,'#b4c795');ellipse(x-9,148,8,8,'#cbd3a5');ellipse(x+13,165,3,4,'#e6b981');}}}
 stage.platforms.forEach(pl=>platformArt(pl,stage));
 for(const q of stage.puzzles)puzzleArt(q);
 for(const h of stage.hazards){for(let x=h.x;x<h.x+h.w;x+=8)pixelPoly([[x-camera,h.y+7],[x+4-camera,h.y-2],[x+8-camera,h.y+7]],'#e3aa96');}
 for(const s of stage.sources){const x=s.x-camera;if(x<-25||x>335)continue;box(x-3,s.y+12,20,4,'#84979c');box(x,s.y+15,14,3,'#596d83');if(s.cooldown<=0)objectIcon(s.type,x+6,s.y+4+(data.settings.reduced?0:Math.round(Math.sin(tick*.07)*2)));else{box(x+4,s.y+7,4,2,'#9eaeb6');if(s.cooldown<35)star(x+6,s.y+2,2,'#d9d8a5');}}
 for(const c of stage.collectibles)if(!c.collected){star(c.x-camera+5,c.y+5+(data.settings.reduced?0:Math.round(Math.sin(tick*.045)*2)),5,'#f0d79b');box(c.x-camera+5,c.y+3,1,3,'#fff3bd');}
 for(const e of stage.enemies)if(!e.dead)enemyArt(e);
 if(stage.flagX!==undefined){const x=stage.flagX-camera;box(x,203,2,39,'#c8cdbb');pixelPoly([[x+2,204],[x+20,210],[x+2,216]],stage.checkpointSeen?'#f0d39a':'#a8c2cd');lantern(x+1,200,stage.checkpointSeen);text('SAFE',x+1,188,'#e3e7d0',6,'center');}
 if(stage.boss&&!stage.boss.dead)bossArt(stage.boss);
 for(const s of shots)objectIcon(s.type,s.x-camera+5,s.y+5);
 for(const d of danger){const x=d.x-camera;if(d.type==='gear'){ellipse(x+5,d.y+4,6,6,d.friendly?'#b8dcdb':'#d4b292');ellipse(x+5,d.y+4,2,2,'#556d88');}else star(x+4,d.y+4,5,d.friendly?'#b3dfdd':d.type==='shadow'?'#ba9dc5':'#e5b18e');}
 if(player){const p=player;if(!p.inv||tick%8>3){const crouch=input('down')&&p.ground;drawDot(ctx,data.character,p.x+9-camera,p.y+20, .85,p.inhale?2:tick%220>212?1:p.held?3:0,crouch?.7:p.squash,p.face);if(p.held){objectIcon(p.held,p.x+9-camera,p.y-8);star(p.x+9-camera,p.y-8,9,'#fff3bf22');}}
 if(p.inhale){for(let i=0;i<5;i++){const f=(tick*2+i*11)%55;box(p.x+9-camera+p.face*(64-f),p.y+3+i*3,2,1,'#e2ead8');}}
 if(village&&data.ending)lantern(p.x+9-camera+p.face*17,p.y+14,true);
 }
 for(const a of particles)box(a.x-camera,a.y,2,2,a.color);
 // The HUD occupies its own band, above the action.
 box(0,0,W,27,'#24314eea');box(0,26,W,1,'#b8c8bd44');if(player){for(let i=0;i<player.maxHp;i++){const x=8+i*9;box(x,9,3,2,i<Math.ceil(player.hp)?'#edb6ad':'#53627d');box(x+4,9,3,2,i<Math.ceil(player.hp)?'#edb6ad':'#53627d');box(x,11,7,3,i<Math.ceil(player.hp)?'#edb6ad':'#53627d');box(x+1,14,5,2,i<Math.ceil(player.hp)?'#edb6ad':'#53627d');box(x+2,16,3,1,i<Math.ceil(player.hp)?'#edb6ad':'#53627d');}
 const hx=data.settings.assist?87:60;box(hx,4,50,18,'#374561');if(player.held)objectIcon(player.held,hx+9,13);else text('—',hx+6,9,'#8498b5',9);text(player.held?.toUpperCase()||'EMPTY',hx+19,10,'#e7dcb9',6);
 text(village?'VILLAGE':('0'+(stage.index+1)+' / '+stage.name.toUpperCase()),W-8,7,'#d5ddd4',6,'right');
 text(timed&&!village?formatTime(playFrames):village?(data.completed.every(Boolean)?data.lanterns.length+'/5 LANTERNS':data.completed.filter(Boolean).length+'/5 RESTORED'):data.collectibles.filter(c=>c.startsWith(stage.index+':')).length+'/5 STARLINGS',W-8,16,'#e4cd94',6,'right');
 }
 if(stage.boss?.active&&!stage.boss.dead){const b=stage.boss;box(45,267,230,16,'#283653ee');text(worlds[stage.index].boss,52,271,'#f3ddb3',7);for(let i=0;i<b.maxHp;i++)box(220+i*7,272,5,5,i<b.hp?'#e8b093':'#56637e');if(stage.index===4)text('CORE: '+b.weakness.toUpperCase(),160,257,'#f1d392',7,'center');else if(b.shield)text('SPARK → SHIELD',160,257,'#f1d392',7,'center');}
 else if(village){box(71,271,178,12,'#283653b0');text(data.ending?'HOME IS A LITTLE BRIGHTER.':data.completed.every(Boolean)?'UP: LIGHT A LANTERN · MAP: REPLAY':'UP: TALK · MAP: THE ISLANDS',160,274,'#e7d8b2',6,'center');}
 else if(player.x<170){box(32,270,256,13,'#283653b0');text('A: JUMP / HOLD TO FLOAT   B: INHALE / SPIT',160,274,'#dedcbd',6,'center');}
}
let last=0,accumulator=0;
function frame(now){if(!last)last=now;accumulator+=Math.min(now-last,100);last=now;let steps=0;while(accumulator>=1000/60&&steps++<6){update();accumulator-=1000/60;}render();requestAnimationFrame(frame);}
updateSound();title();requestAnimationFrame(frame);
// Deterministic hooks are available only in an explicitly requested test build.
if(new URLSearchParams(location.search).has('test'))window.DOTS_TEST={
 snapshot:()=>({mode,data:JSON.parse(JSON.stringify(data)),stage:stage&&{index:stage.index,width:stage.width,puzzles:stage.puzzles.map(q=>({...q})),sources:stage.sources.map(s=>({...s})),checkpoint:stage.checkpoint,boss:stage.boss&&{...stage.boss}},player:player&&{...player,standing:undefined},playFrames,input:[...heldInput.values()],bNeedsRelease,shots:shots.map(s=>({...s})),village}),
 start:(i,restore=false)=>{makeStage(i,restore);resumePlay();},step:(frames=1)=>{for(let i=0;i<frames;i++)update();render();},setPlayer:props=>Object.assign(player,props),setBoss:props=>Object.assign(stage.boss,props),setInput,clearInput,dispatch,activate:id=>activate(stage.puzzles[id]),enterVillage,readSave,save:()=>checkpointSave(),characters:()=>characters.map(c=>c[0]),sourceGrab:inhale,fire,hitBoss,formatTime
};
})();
