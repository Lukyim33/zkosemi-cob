import {createScene} from './scene.js';
import {createInteraction} from './interaction.js';
import {Simulation,stationMap} from './simulation.js';
import {createWorkshop} from './workshop.js';
import {alignmentSample} from './alignment.js';
import {createFloor} from './floor.js';
import {createVCSEL} from './vcsel.js';
import {createCPO} from './cpo.js';
import {refs} from './sources.js';

const $=id=>document.getElementById(id);
const each=(s,fn)=>document.querySelectorAll(s).forEach(fn);
const icon=(id,name)=>$(id).querySelector('use')?.setAttribute('href','#i-'+name);
const titles={vcsel:'800G VCSEL 光引擎',cpo:'CPO 硅光引擎'};
const letters={vcsel:'A',cpo:'B'};
const sim=new Simulation(), canvas=$('viewport');
let view;
try {view=createScene(canvas);}
catch(error){$('loading').textContent='请使用支持 WebGL 2 的浏览器，并启用硬件加速后刷新。';throw error;}
const floor=createFloor(),products={vcsel:createVCSEL(),cpo:createCPO()};
const hidden=new Set();
let spread=.65,last=performance.now(),selectionTimer,sourceOpen=false;
let stationPins=[],timelineButtons=[],lastBar=-1;
const control=createInteraction(canvas,view.camera,picked,manualCamera,{
  enabled:()=>sim.phase==='align'&&shop.level==='detail'&&!sim.inspect,
  move(dx,dy){
    const size=Math.min(canvas.clientWidth,canvas.clientHeight)*.24;
    adjust(sim.offset.x+dx/size,sim.offset.z-dy/size);
  }
});
const shop=createWorkshop(floor,products,view,control,sim,caption,()=>refresh());
const current=()=>products[sim.route];
function label(id,text){if($(id).textContent!==text)$(id).textContent=text;}
function caption(text){label('transition-caption',text);$('transition-caption').hidden=!text;}
function notify(text){
  label('selection',text);$('selection').hidden=false;
  clearTimeout(selectionTimer);selectionTimer=setTimeout(()=>{$('selection').hidden=true;},2300);
}
function manualCamera(){
  if(shop.level==='flight'){shop.station(false);refresh();}
  if(sim.tour){sim.takeOver();refresh();}
  label('scene-meta','自由视角');
}
function picked({route,stationIndex,part,point}){
  if(route){
    if(route===sim.route&&shop.level==='station'&&stationIndex===shop.active.stationIndex){shop.resume();refresh();return;}
    visit(route,stationMap[route].indexOf(stationIndex));return;
  }
  const p=current()?.parts.find(p=>p.id===part);
  if(p){control.focus(point);notify(p.label);}
}
function buildPins(){
  const pins=[];
  for(const [route,stations] of Object.entries(floor.stations)){
    for(const station of stations){
      const b=document.createElement('button'),key=document.createElement('b'),name=document.createElement('span');
      b.className='pin';b.dataset.line=route;b.dataset.station=station.stationIndex;
      key.textContent=letters[route]+(station.stationIndex+1);
      name.textContent=station.title;b.append(key,name);
      b.setAttribute('aria-label',titles[route]+' · '+station.title);
      b.onclick=()=>visit(route,stationMap[route].indexOf(station.stationIndex));
      const anchor=station.anchor.clone();anchor.y+=1.27;
      pins.push({button:b,anchor});
    }
  }
  $('labels').replaceChildren(...pins.map(p=>p.button));stationPins=pins;
}
function positionPins(){
  for(const {button,anchor} of stationPins){
    const p=control.project(anchor);
    button.style.left=(canvas.offsetLeft+(p.x+1)*.5*canvas.clientWidth)+'px';
    button.style.top=(canvas.offsetTop+(1-p.y)*.5*canvas.clientHeight-5)+'px';
    button.style.visibility=Math.abs(p.x)<.96&&Math.abs(p.y)<.94?'visible':'hidden';
  }
}

function buildTimeline(){
  timelineButtons=current().steps.map((s,i)=>{
    const b=document.createElement('button'),n=document.createElement('small'),rail=document.createElement('span');
    b.className='step-btn';b.title=s.action;n.textContent=String(i+1).padStart(2,'0');
    rail.className='rail';rail.append(document.createElement('i'));b.append(n,s.title,rail);
    b.onclick=()=>seek(i);return b;
  });
  $('timeline').replaceChildren(...timelineButtons);
}
function setParts(){
  $('parts-list').replaceChildren(...current().parts.map(part=>{
    const wrap=document.createElement('label'),check=document.createElement('input');
    check.type='checkbox';check.checked=!hidden.has(part.id);
    check.onchange=()=>{if(check.checked)hidden.delete(part.id);else hidden.add(part.id);};
    wrap.append(check,part.label);return wrap;
  }));
}
function resetParts(){hidden.clear();spread=.65;$('explode').value=65;label('percent','65%');}
function renderAlignment(){
  const {x,z}=sim.modelAlignment||sim.offset;
  const {power,ready}=alignmentSample(x,z);
  const displayedPower=Math.floor(power*10)/10;
  label('align-power',displayedPower+'%');
  $('align-meter').value=power;
  $('align-marker').style.left=((x+1)*50)+'%';$('align-marker').style.top=((1-z)*50)+'%';
  $('align-pad').setAttribute('aria-label','光纤微调，方向键移动。模拟相对功率 '+displayedPower+'%');
  const fixed=sim.phase==='fix';
  $('align-panel').classList.toggle('ready',ready);
  label('align-status',fixed?'正在固定光纤阵列':ready?'已进入目标范围，可以固定':'向靶心微调，观察功率上升');
  $('align-fix').disabled=fixed||!ready;
}
function refresh(){
  const overview=sim.route==='overview',detail=shop.level==='detail',flight=shop.level==='flight';
  const align=detail&&!sim.inspect&&['align','fix'].includes(sim.phase);
  document.body.classList.toggle('inspecting',sim.inspect);
  document.body.classList.toggle('aligning',align);
  $('labels').hidden=!overview;$('overview-dock').hidden=!overview;$('process-dock').hidden=overview;
  $('start-tour').hidden=!overview;$('parts-panel').hidden=!sim.inspect;$('align-panel').hidden=!align;
  $('station-back').hidden=overview||flight;
  $('selection').hidden=true;
  each('[data-page]',b=>b.setAttribute('aria-current',b.dataset.page===sim.route?'page':'false'));
  if(overview){
    label('location','洁净装配车间');label('location-code','FLOOR 01');label('title','车间总览');
    label('description','轻触设备标记进入工位，跟随工件探索两种光引擎的装配过程。');
    label('scene-code','W–00');label('scene-meta','全景视图');$('test-readout').hidden=true;return;
  }
  const s=current().steps[sim.step],index=stationMap[sim.route][sim.step];
  const cell=floor.stations[sim.route][index],id=letters[sim.route]+(index+1),n=String(sim.step+1).padStart(2,'0');
  label('location',titles[sim.route]);label('location-code',id+' / '+cell.title);
  label('title',sim.inspect?'成品拆解':shop.level==='station'?cell.title:align?'光纤阵列对准':s.title);
  label('description',sim.inspect?'滑动分开各层，轻触零件查看名称。':shop.level==='station'?'半透明外罩内是当前工件。轻触「进入工件」继续观察。':align?'左右移动调整水平位置，上下移动调整高度。让纤芯对准芯片边缘的波导入口。':s.action+' '+s.why);
  label('counter',sim.inspect?'成品':n+' / 06');label('scene-code',id+' · '+n);
  label('scene-meta',sim.inspect?'分层视图':align?'手动微调':shop.level==='station'?'设备剖视':flight?'工位导航':'工件近景');
  $('station-back').querySelector('span').textContent=shop.level==='station'?'进入工件':'查看工位';
  $('inspect').classList.toggle('active',sim.inspect);$('inspect').setAttribute('aria-pressed',String(sim.inspect));
  $('inspect').disabled=!detail;
  $('play').disabled=sim.inspect||align||!detail;
  icon('play',sim.finished?'reset':sim.playing?'pause':'play');
  const playLabel=sim.finished?'重播本线':sim.playing?'暂停':'继续播放';
  $('play').setAttribute('aria-label',playLabel);$('play').title=playLabel;
  label('play-status',sim.inspect?'拆解观察':flight?'进出工位':shop.level==='station'?'剖视观察':align?'等待操作':sim.finished?'本线完成':sim.playing?sim.tour?'自动导览':'正在装配':'已暂停');
  $('step-scrub').disabled=!detail||align||sim.inspect;
  timelineButtons.forEach((b,i)=>{
    b.disabled=sim.phase!=='run'&&i>sim.step;
    b.classList.toggle('done',sim.inspect||i<sim.step);
    b.classList.toggle('current',!sim.inspect&&i===sim.step);
    b.setAttribute('aria-current',i===sim.step&&!sim.inspect?'step':'false');
    b.querySelector('i').style.width=sim.inspect||i<sim.step?'100%':'0%';
  });
  lastBar=-1;
  if(align)renderAlignment();
}
function home(){sim.home();shop.home();resetParts();refresh();}
function visit(route,step=0,tour=false){
  if(shop.level!=='overview' && sim.route!==route)shop.home();
  sim.open(route,tour);sim.seek(step);resetParts();buildTimeline();shop.enter();refresh();
}
function seek(i){
  if(sim.phase!=='run'&&i>sim.step)return;
  const same=shop.level==='detail'&&stationMap[sim.route][sim.step]===stationMap[sim.route][i];
  sim.seek(i);sim.playing=true;sim.tour=false;resetParts();
  if(same)shop.micro();else shop.enter();
  refresh();
}
function toggleInspection(){
  if(shop.level!=='detail')return;
  sim.inspect=!sim.inspect;
  if(sim.inspect){resetParts();setParts();}
  refresh();shop.micro();
}
function adjust(x,z){sim.move(x,z);renderAlignment();}
function padInput(event){
  const r=$('align-pad').getBoundingClientRect();
  adjust((event.clientX-r.left)/r.width*2-1,1-(event.clientY-r.top)/r.height*2);
}
let padPointer=null;
$('align-pad').onpointerdown=e=>{
  if(sim.phase!=='align'||padPointer!==null)return;
  e.preventDefault();padPointer=e.pointerId;$('align-pad').setPointerCapture(e.pointerId);padInput(e);
};
$('align-pad').onpointermove=e=>{if(padPointer===e.pointerId)padInput(e);};
$('align-pad').onlostpointercapture=()=>{padPointer=null;};
$('align-pad').onkeydown=e=>{
  const dir={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,1],ArrowDown:[0,-1]}[e.key];
  if(!dir)return;e.preventDefault();adjust(sim.offset.x+dir[0]*.05,sim.offset.z+dir[1]*.05);
};
$('align-fix').onclick=()=>{if(sim.fix())refresh();};
$('station-back').onclick=()=>{
  if(shop.level==='station')shop.resume();
  else{sim.inspect=false;shop.station();}
  refresh();
};
$('step-scrub').oninput=e=>{sim.scrub(Number(e.target.value)/1000);refresh();if(sim.phase==='align')shop.micro();};
each('[data-page]',b=>b.onclick=()=>b.dataset.page==='overview'?home():visit(b.dataset.page));
each('[data-route]',b=>b.onclick=()=>visit(b.dataset.route));
$('brand').onclick=home;$('start-tour').onclick=()=>visit('vcsel',0,true);
$('play').onclick=()=>{if(sim.finished){visit(sim.route);return;}sim.toggle();refresh();};
$('inspect').onclick=toggleInspection;$('close-parts').onclick=toggleInspection;
$('explode').oninput=e=>{spread=Number(e.target.value)/100;label('percent',e.target.value+'%');};
$('reset').onclick=()=>shop.reset();$('zoom-in').onclick=()=>control.zoom(1.22);$('zoom-out').onclick=()=>control.zoom(1/1.22);
for(const [key,links] of Object.entries(refs))for(const [title,url] of links){
  const a=document.createElement('a');a.href=url;a.textContent=title+' ↗';a.target='_blank';a.rel='noopener noreferrer';$('refs-'+key).append(a);
}
const dialog=$('source-dialog');
$('sources').onclick=()=>{sourceOpen=true;dialog.showModal();};
$('close-sources').onclick=()=>dialog.close();
dialog.addEventListener('close',()=>{sourceOpen=false;last=performance.now();});
dialog.onclick=e=>{if(e.target===dialog){const b=dialog.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)dialog.close();}};
$('fullscreen').onclick=async()=>{
  try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}
  catch{notify('请在浏览器中打开预览，使用全屏展示。');}
};
if(!document.fullscreenEnabled)$('fullscreen').hidden=true;
document.addEventListener('visibilitychange',()=>{last=performance.now();});
new ResizeObserver(()=>{
  view.renderer.setSize(canvas.clientWidth,canvas.clientHeight,false);control.resize();
}).observe(canvas);
buildPins();home();view.renderer.setSize(canvas.clientWidth,canvas.clientHeight,false);

function updateTime(dt){
  const route=sim.route,step=sim.step,phase=sim.phase;
  if(!sim.advance(dt))return;
  if(route!==sim.route){shop.home();resetParts();buildTimeline();shop.enter();}
  else if(step!==sim.step&&stationMap[route][step]!==stationMap[route][sim.step]){
    shop.enter({route,step});
  }else if(step!==sim.step||phase!==sim.phase){shop.selectStepCamera();}
  refresh();
}
function draw(now){
  const dt=document.hidden||sourceOpen?0:Math.min(.5,Math.max(0,(now-last)/1000));
  last=now;
  view.adaptResolution(dt);
  if(shop.level==='flight')shop.step(dt);
  else if(shop.level==='detail')updateTime(dt);
  if(shop.level!=='detail'){sim.floorTime+=dt;floor.update(sim.floorTime);}
  shop.render(spread,hidden);
  control.update(dt);
  if(shop.level==='overview')positionPins();
  else{
    const tick=Math.round(sim.progress*1000);
    if(tick!==lastBar&&!sim.inspect){
      timelineButtons[sim.step].querySelector('i').style.width=tick/10+'%';
      $('step-scrub').value=tick;lastBar=tick;
    }
    if(sim.phase==='fix')renderAlignment();
  }
  const testing=sim.route==='cpo'&&sim.step===5&&!sim.inspect&&shop.level==='detail';
  $('test-readout').hidden=!testing;
  if(testing){
    label('test-state',sim.progress<.34?'探针就位中':sim.progress<.68?'已接触 · 检测中':'通路通过');
    $('test-readout').classList.toggle('passed',sim.progress>=.68);
  }
  view.renderer.render(view.scene,view.camera);$('loading').hidden=true;
  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
