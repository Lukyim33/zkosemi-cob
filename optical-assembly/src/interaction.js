import * as THREE from 'three';
import { OrbitControls } from '../vendor/OrbitControls.js';

export function createInteraction(canvas, camera, onSelect, onManual, onDrag) {
  const controls=new OrbitControls(camera,canvas);
  controls.enableDamping=true;controls.dampingFactor=.14;
  controls.minPolarAngle=.08;controls.maxPolarAngle=Math.PI*.482;
  controls.minZoom=.5;controls.maxZoom=4;controls.rotateSpeed=.7;
  const ray=new THREE.Raycaster(), cursor=new THREE.Vector2(), projected=new THREE.Vector3();
  const pointerIds=new Set();
  let down=null,drag=null,pending=null,manual=false,candidates=[];
  let field={width:21,height:13,hx:.52,hy:.59};
  function resize(){
    const aspect=canvas.clientWidth/Math.max(1,canvas.clientHeight);
    const h=Math.max(field.height,field.width/aspect),w=h*aspect;
    Object.assign(camera,{left:-w*field.hx,right:w*(1-field.hx),top:h*field.hy,bottom:-h*(1-field.hy)});
    camera.updateProjectionMatrix();
  }
  function manualCamera(){
    pending=null;
    if(!manual){manual=true;onManual();}
  }
  function hitAt(e){
    const rect=canvas.getBoundingClientRect();
    cursor.set((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2);
    ray.setFromCamera(cursor,camera);
    const hits=ray.intersectObjects(candidates.map(c=>c.object),true);
    for(const hit of hits){
      let obj=hit.object,part,selection,visible=true;
      while(obj){
        visible&&=obj.visible;
        part||=obj.userData.part;
        selection||=candidates.find(c=>c.object===obj);
        obj=obj.parent;
      }
      if(visible&&selection&&(part||selection.route))return {...selection,part,point:hit.point};
    }
    return null;
  }
  canvas.addEventListener('pointerdown',e=>{
    pointerIds.add(e.pointerId);
    if(pointerIds.size!==1){down=null;return;}
    down=[e.clientX,e.clientY];
    if(e.button===0 && onDrag.enabled() && hitAt(e)?.part==='fau'){
      drag={id:e.pointerId,x:e.clientX,y:e.clientY};
      canvas.setPointerCapture(e.pointerId);
      e.stopImmediatePropagation();e.preventDefault();down=null;
    }
  },true);
  canvas.addEventListener('pointermove',e=>{
    if(drag?.id===e.pointerId){
      onDrag.move(e.clientX-drag.x,e.clientY-drag.y);
      drag.x=e.clientX;drag.y=e.clientY;e.stopImmediatePropagation();
    }else if(down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])>5){
      down=null;manualCamera();
    }else if(pointerIds.size>1)manualCamera();
  },true);
  function release(e){
    pointerIds.delete(e.pointerId);
    if(drag?.id===e.pointerId){drag=null;down=null;e.stopImmediatePropagation();return;}
    if(e.type==='pointerup'&&down&&e.button===0&&Math.hypot(e.clientX-down[0],e.clientY-down[1])<6){
      const hit=hitAt(e);if(hit)onSelect(hit);
    }
    down=null;
  }
  canvas.addEventListener('pointerup',release,true);
  canvas.addEventListener('pointercancel',release,true);
  canvas.addEventListener('wheel',manualCamera,{passive:true});
  function fly({target, direction, width, height, hx=.52, hy=.58},duration=.8,zoom=1){
    const to=new THREE.Vector3(...target),pos=new THREE.Vector3(...direction).add(to);
    controls.enableDamping=false;controls.update();controls.enableDamping=true;manual=false;
    const endField={width,height,hx,hy};
    pending={from:controls.target.clone(),to,pos0:camera.position.clone(),pos,field0:{...field},endField,
      z0:camera.zoom,zoom,t:0,duration:Math.max(.001,duration)};
    if(!duration)update(1);
  }
  function update(dt){
    if(pending){
      const a=pending;a.t=Math.min(1,a.t+dt/a.duration);
      const k=a.t*a.t*(3-2*a.t);
      camera.position.lerpVectors(a.pos0,a.pos,k);
      controls.target.lerpVectors(a.from,a.to,k);
      for(const key of ['width','height'])field[key]=a.field0[key]*(a.endField[key]/a.field0[key])**k;
      for(const key of ['hx','hy'])field[key]=THREE.MathUtils.lerp(a.field0[key],a.endField[key],k);
      camera.zoom=a.z0*(a.zoom/a.z0)**k;resize();
      if(a.t===1)pending=null;
    }
    controls.update();
  }
  return {fly,resize,update,get manual(){return manual;},setCandidates(list){candidates=list;},
    focus(point){
      const direction=camera.position.clone().sub(controls.target);
      fly({target:point.toArray(),direction:direction.toArray(),...field},.55,Math.min(2.6,camera.zoom*1.16));manual=true;onManual();
    },
    zoom(mult){manualCamera();camera.zoom=THREE.MathUtils.clamp(camera.zoom*mult,controls.minZoom,controls.maxZoom);camera.updateProjectionMatrix();},
    project(p){return projected.copy(p).project(camera);},
  };
}
