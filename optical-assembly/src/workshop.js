import * as THREE from 'three';
import {stationMap} from './simulation.js';

const scale=.12;
const mix=(t,a,b)=>THREE.MathUtils.smoothstep(t,a,b);
const frame=(target,direction,width,height,extra={})=>({target:target.toArray(),direction,width,height,...extra});
const empty=new Set();

// Both the microscope and room cameras inspect the same physical carrier.
// A visit consists of finite camera and handling phases, interruptible by visitors.
export function createWorkshop(floor,products,view,control,sim,onCaption,onArrival){
  const rig=new THREE.Group();rig.scale.setScalar(scale);
  rig.add(view.mount,...Object.values(products).map(p=>p.root));view.scene.add(rig,floor.root);
  let active=null,level='overview',queue=[],elapsed=0,displayStep=0,carrying=false;
  function home(duration=0){
    queue=[];level='overview';active=null;carrying=false;rig.visible=false;
    floor.setActiveRoute(null);floor.setCutaway(null,0,0);floor.setDetail(null,0,0);
    control.setCandidates(floor.picks);
    view.lightRegion();onCaption('');
    control.fly(frame(new THREE.Vector3(0,.67,0),[11,12,18],22,12.9),duration);
  }
  function cellCamera(cell,duration){
    control.fly(frame(cell.anchor,[1.45,1.35,2.65],5.25,3.5,{hy:.57}),duration);
  }
  function micro(duration=.8){
    const model=products[sim.route],s=model.steps[sim.step],isA=sim.route==='vcsel';
    const adjust=sim.phase==='align'||sim.phase==='fix';
    let focus=s.focus,w=s.frameWidth,dir=isA?[3.4,5.8,8.6]:[4,7.5,8.7];
    if(adjust){focus=[.22,.43,.36];w=3.85;dir=[1.05,1.95,3.88];}
    if(sim.inspect){focus=isA?[0,1.15,-.45]:[0,.56,.25];w=isA?9.3:8.2;dir=isA?[4,5.6,8]:[4,7,8];}
    const target=new THREE.Vector3(...focus).multiplyScalar(scale).add(active.anchor);
    const sidePanel=adjust||sim.inspect;
    const sidebar=sidePanel&&view.renderer.domElement.clientWidth>=780;
    const width=w*scale*(sidebar?1.53:1.16);
    const height=Math.max(3.5,w*.60)*scale;
    control.fly(frame(target,dir.map(v=>v*scale),width,height,{hx:sidebar?.40:.52,hy:.57}),duration);
  }
  function dock(cell){
    active=cell;
    rig.position.copy(cell.anchor);rig.visible=true;
    Object.entries(products).forEach(([r,p])=>p.root.visible=r===sim.route);
    floor.setActiveRoute(sim.route);
    floor.setDetail(sim.route,cell.stationIndex,1);
  }
  function startPhase(){
    elapsed=0;
    if(queue.length){queue[0].start();return;}
    level='detail';carrying=false;
    control.setCandidates([{object:products[sim.route].root}]);
    onCaption('');onArrival();
  }
  function step(dt){
    if(!queue.length)return;
    const phase=queue[0];elapsed=Math.min(phase.duration,elapsed+dt);
    phase.sample?.(elapsed/phase.duration);
    if(elapsed>=phase.duration){queue.shift();startPhase();}
  }
  function arrivalPhases(cell,route,index){
    return [
      {duration:.9,start(){
        dock(cell);floor.setCutaway(route,index,0);
        onCaption('定位工位 · '+cell.title);cellCamera(cell,.85);
      }},
      {duration:.82,start(){onCaption('剖视设备 · 打开观察视野');},
       sample(t){floor.setCutaway(route,index,mix(t,0,1));}},
      {duration:1.02,start(){
        floor.setCutaway(route,index,1);displayStep=sim.step;carrying=false;
        onCaption('进入工件 · '+products[route].steps[sim.step].title);
        view.lightRegion(cell.anchor,1.15);micro(1);
      }},
    ];
  }
  function transfer(from,to,route,previousStep){
    const fromTop=from.port.clone();fromTop.y=from.anchor.y;
    const toTop=to.port.clone();toTop.y=to.anchor.y;
    const path=[from.anchor,fromTop,from.port,to.port,toTop,to.anchor];
    const times=[0,.18,.27,.72,.82,1];
    return [
      {duration:.8,start(){
        carrying=true;displayStep=previousStep;
        onCaption('工件转运 · 移出载台');view.lightRegion();
        cellCamera(from,.74);floor.setCutaway(route,from.stationIndex,1);
      }},
      {duration:2.2,start(){
        const center=from.anchor.clone().lerp(to.anchor,.5);center.z+=.65;
        const span=Math.abs(from.anchor.x-to.anchor.x);
        control.fly(frame(center,[1.3,3.5,4.7],span+4.2,4.4),.64);
        onCaption('工件转运 · '+from.title+' → '+to.title);
      },sample(t){
        const i=Math.min(4,times.findIndex((x,j)=>j>0&&t<=x)-1);
        rig.position.lerpVectors(path[i],path[i+1],mix(t,times[i],times[i+1]));
        floor.setCutaway(route,from.stationIndex,1-mix(t,.3,.62),to.stationIndex,mix(t,.53,.78));
        if(t>=.56) floor.setDetail(route,to.stationIndex,1);
      }},
    ];
  }
  function enter(previous=null){
    const route=sim.route,index=stationMap[route][sim.step],cell=floor.stations[route][index];
    queue=[];control.setCandidates([]);level='flight';carrying=false;
    view.lightRegion();displayStep=sim.step;
    const phases=arrivalPhases(cell,route,index);
    if(previous && active && previous.route===route && previous.step+1===sim.step && active!==cell){
      queue=transfer(active,cell,route,previous.step);
      // The carrier reaches an already-open load port on this route.
      queue.push({duration:.65,start(){dock(cell);displayStep=sim.step;carrying=false;
        floor.setCutaway(route,index,1);cellCamera(cell,.6);onCaption('工件到站 · '+cell.title);}},phases[2]);
    }else{
      floor.setCutaway(null,0,0);queue=phases;
    }
    startPhase();return cell;
  }
  function station(reframe=true){
    queue=[];carrying=false;displayStep=sim.step;level='station';
    dock(floor.stations[sim.route][stationMap[sim.route][sim.step]]);
    floor.setCutaway(sim.route,active.stationIndex,.78);
    control.setCandidates(floor.picks);view.lightRegion();
    if(reframe)cellCamera(active,.7);
    onCaption('');
  }
  function resume(){
    control.setCandidates([]);level='flight';
    queue=[arrivalPhases(active,sim.route,active.stationIndex)[2]];startPhase();
  }
  function render(spread,hidden){
    if(!active)return;
    const i=carrying?displayStep:sim.inspect?5:sim.step;
    const p=carrying||sim.inspect?1:sim.progress;
    products[sim.route].update(i,p,sim.inspect?spread:0,sim.inspect?hidden:empty,sim.inspect||carrying?null:sim.modelAlignment);
  }
  return {home,enter,step,micro,render,station,resume,get level(){return level;},get active(){return active;},
    selectStepCamera(){if(!control.manual)micro();},
    reset(){if(level==='overview')home(.75);else if(level==='station')cellCamera(active,.75);else if(level==='detail')micro();},
  };
}
