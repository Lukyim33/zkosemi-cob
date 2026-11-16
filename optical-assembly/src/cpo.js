// Representative external-laser CPO architecture. Geometry and handling distances are enlarged.
import * as THREE from 'three';
import { alignmentSample, initialOffset } from './alignment.js';

const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const roundGeo = new THREE.CylinderGeometry(1, 1, 1, 20);
const matrix = new THREE.Matrix4();
const identity = new THREE.Quaternion();
const point = new THREE.Vector3();
const size = new THREE.Vector3();
const paint = (color, metalness = .2, roughness = .42) =>
  new THREE.MeshStandardMaterial({color, metalness, roughness});
const m = {
  pcb: paint(0x24534d), carrier: paint(0x224441), copper: paint(0xad7546,.62),
  gold: paint(0xe6b76d,.62,.3), ceramic: paint(0xf0e4c7,.18),
  pic: paint(0x344669,.5,.23), eic: paint(0x25424e,.55,.2),
  dark: paint(0x273138,.5), metal: paint(0xb8c2c6,.67,.32), silver: paint(0xdfddd2,.6),
  white: paint(0xe7e7de,.29), orange: paint(0xff7836,.28), ink: paint(0xa3c5ba),
  feed: paint(0xe3af49,.25), fiber: paint(0xb6d6dd,.2,.33), lens: paint(0x80bcc4,.5,.19),
  pass: new THREE.MeshStandardMaterial({color:0x50d9a0,emissive:0x135b35,roughness:.3}),
};
function group(parent) {
  const g = new THREE.Group();
  parent.add(g);
  return g;
}
function solid(parent, geometry, material, x,y,z, a,b,c) {
  const obj = new THREE.Mesh(geometry, material);
  obj.position.set(x,y,z); obj.scale.set(a,b,c);
  obj.castShadow = true; obj.receiveShadow = true;
  parent.add(obj);
  return obj;
}
const box = (g,mat,...dims) => solid(g,boxGeo,mat,...dims);
const disc = (g,mat,x,y,z,r,h) => solid(g,roundGeo,mat,x,y,z,r,h,r);
function blocks(parent,material,items,geom=boxGeo) {
  if (!items.length) return;
  const obj = new THREE.InstancedMesh(geom,material,items.length);
  items.forEach(([x,y,z,w,h,d],i)=>{
    matrix.compose(point.set(x,y,z),identity,size.set(w,h,d));
    obj.setMatrixAt(i,matrix);
  });
  obj.receiveShadow=true; parent.add(obj);
}
function label(parent,word,x,y,z,width,depth,color='#e0e8dc') {
  if(typeof document==='undefined') return;
  const canvas = document.createElement('canvas');
  canvas.width=640; canvas.height=128;
  const ctx=canvas.getContext('2d');
  if (!ctx) return;
  ctx.fillStyle=color; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.font='600 72px ui-monospace, Menlo, monospace';
  ctx.fillText(word,320,69,615);
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,depth),
    new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));
  mesh.rotation.x=-Math.PI/2; mesh.position.set(x,y,z); parent.add(mesh);
}
const stages = [
  {title:'贴装光子芯片',action:'吸嘴将硅光芯片放到引擎载板上。',why:'芯片边缘的光耦合区需要朝向将要接入的光纤。',part:'pic',focus:[-0.69, 0.33, -0.07],frameWidth:6.7},
  {title:'贴合电子芯片',action:'电子芯片以触点朝下的姿态落到光子芯片的互连区。',why:'短距离电连接把驱动、接收电路接到光子器件。',part:'eic',focus:[-0.69, 0.4, -0.05],frameWidth:6.5},
  {title:'对准光纤阵列',action:'夹具沿芯片边缘微调光纤阵列，再将它固定。',why:'每根光纤的端面都要对准相应的波导入口。',part:'fau',focus:[0.22, 0.43, 0.36],frameWidth:3.85},
  {title:'集成到交换封装',action:'观察尺度拉远，已装好的光引擎落到交换芯片旁。',why:'多个引擎共用封装基板，缩短高速电信号的传输距离。',part:'package',focus:[0, 0.36, 0.32],frameWidth:7.0},
  {title:'连接外置光源',action:'供光尾纤插入独立的激光源端口。',why:'外置激光源通过光纤向引擎提供调制所需的连续光。',part:'laser',focus:[1.09, 0.24, 1.47],frameWidth:5.25},
  {title:'联通并测试',action:'探针接触测试焊盘，光电通路完成模拟检测。',why:'测试确认光源、引擎和交换芯片能够协同传输信号。',part:'asic',focus:[-0.36, 0.34, 0.22],frameWidth:7.35},
];
const partList=[
  {id:'carrier',label:'引擎载板'}, {id:'pic',label:'光子芯片 PIC'}, {id:'eic',label:'电子芯片 EIC'},
  {id:'fau',label:'光纤阵列 FAU'}, {id:'package',label:'公共封装基板'}, {id:'asic',label:'交换 ASIC'},
  {id:'peers',label:'相邻光引擎'}, {id:'laser',label:'外置光源及尾纤'},
];
function engineCarrier(g) {
  // A recessed nose leaves clearance below the FAU throughout its transverse travel.
  box(g,m.carrier,0,.065,-.1225,2.45,.13,1.275);
  box(g,m.copper,0,.043,-.1225,2.453,.018,1.277);
  box(g,m.carrier,0,.008,.6365,2.45,.016,.243);
  const bond=box(g,m.ceramic,0,.016,.617,1.84,.1305,.17);
  const pads=[],tracks=[];
  for(let i=0;i<22;i++){
    const x=-1.04+i*.099;
    pads.push([x,.133,-.677,.061,.011,.105]);
    tracks.push([x,.134,-.514,.014,.008,.22]);
  }
  for(const s of [-1,1]) {
    for(let i=0;i<8;i++) pads.push([s*1.12,.134,-.53+i*.131,.106,.011,.054]);
    for(const z of [-.65,.425]) disc(g,m.gold,s*1.15,.138,z,.036,.013);
  }
  blocks(g,m.gold,pads); blocks(g,m.copper,tracks);
  return bond;
}
function picDie(g) {
  box(g,m.pic,0,.067,0,1.92,.134,1.04);
  const traces=[],pads=[];
  for(let i=0;i<12;i++){
    const x=-.787+i*.143;
    traces.push([x,.138,.342,.015,.008,.356]);
  }
  for(let i=0;i<15;i++) for(const dz of [-.219,.219]){
    pads.push([-.66+i*.094,.139,-.153+dz,.055,.011,.052]);
  }
  blocks(g,m.gold,pads); blocks(g,m.ink,traces);
  label(g,'Si PHOTONICS',0,.142,.19,.85,.11);
}
function eicDie(g) {
  box(g,m.eic,0,.077,0,1.5,.12,.57);
  const pads=[], islands=[];
  for(let i=0;i<15;i++) for(const z of [-.219,.219]) pads.push([-.66+i*.094,.015,z,.045,.03,.042]);
  for(let i=0;i<6;i++) islands.push([-.55+i*.22,.139,-.14,.155,.006,.125]);
  blocks(g,m.gold,pads); blocks(g,m.pic,islands);
  label(g,'EIC  /  I·O',0,.143,.07,.87,.14);
}
function fiberArray(g) {
  box(g,m.ceramic,0,.012,.191,1.91,.115,.38);
  box(g,m.lens,0,.105,.155,1.79,.08,.29);
  const ribbons=[],tips=[];
  for(let i=0;i<12;i++){
    const x=-.787+i*.143;
    ribbons.push([x,.078,.365,.046,.043,.52]);
    tips.push([x,.076,.01,.042,.038,.018]);
  }
  blocks(g,m.fiber,ribbons); blocks(g,m.gold,tips);
  box(g,m.white,0,.072,.55,1.81,.104,.095);
}
function vacuumHead(g) {
  disc(g,m.dark,0,.026,0,.115,.052);
  disc(g,m.silver,0,.13,0,.066,.158);
  disc(g,m.dark,0,.245,0,.124,.089);
  box(g,m.metal,0,.42,0,.38,.26,.34);
  box(g,m.orange,0,.568,0,.385,.045,.346);
  box(g,m.dark,0,.69,0,.23,.2,.18);
  const screws=[];
  for(const x of [-.128,.128]) for(const z of [-.1,.1]) screws.push([x,.552,z,.022,.014,.022]);
  blocks(g,m.dark,screws,roundGeo);
}
function mainBoard(g) {
  box(g,m.pcb,0,.095,0,4.7,.19,3.94);
  box(g,m.copper,0,.052,0,4.704,.018,3.944);
  const caps=[],tracks=[],pads=[],vias=[];
  for(let i=0;i<4;i++) for(const side of [-1,1]){
    const x=(i-1.5)*1.08;
    for(let j=0;j<8;j++) {
      const xp=x+(j-3.5)*.063;
      tracks.push([xp,.192,side*1.07,.013,.005,.43]);
      pads.push([xp,.196,side*1.40,.032,.01,.065]);
    }
  }
  for (const s of [-1,1]){
    for(let i=0;i<13;i++){
      caps.push([s*1.20,.225,-.97+i*.158,.12,.062,.075]);
      vias.push([s*2.21,.194,-1.72+i*.29,.018,.006,.018]);
    }
    for(const z of [-1.8,1.8]) {
      disc(g,m.gold,s*2.15,.193,z,.102,.011);
      disc(g,m.dark,s*2.15,.201,z,.048,.008);
    }
  }
  blocks(g,m.silver,caps); blocks(g,m.copper,tracks); blocks(g,m.gold,pads);
  blocks(g,m.gold,vias,roundGeo);
  const testPads=[];
  for(let i=0;i<6;i++) testPads.push([-1.91,.198,-.34+i*.131,.22,.014,.09]);
  blocks(g,m.gold,testPads);
  label(g,'OPTICAL I/O',1.73,.201,-.76,.78,.13);
}
function switchDie(g) {
  box(g,m.dark,0,.07,0,1.86,.14,1.69);
  box(g,m.gold,0,.159,0,1.62,.038,1.43);
  box(g,m.metal,0,.241,0,1.59,.13,1.4);
  box(g,m.pic,0,.313,0,1.39,.014,1.21);
  const islands=[];
  for(let i=0;i<5;i++) {
    islands.push([-.52+i*.26,.325,-.45,.207,.008,.12]);
    islands.push([-.52+i*.26,.325,.41,.207,.008,.16]);
  }
  blocks(g,m.eic,islands);
  label(g,'SWITCH ASIC',0,.326,-.02,1.09,.22);
}
function adjacentEngines(g) {
  const stacks=[],dies=[],tops=[],arrival=[],ends=[];
  for(let i=0;i<4;i++) for(const side of [-1,1]){
    if(side===1 && i===2) continue;
    const x=(i-1.5)*1.08, z=side*1.39;
    stacks.push([x,.026,z,.93,.052,.58]);
    dies.push([x,.078,z,.73,.05,.40]);
    tops.push([x,.124,z-side*.075,.565,.048,.215]);
    arrival.push([x,.077,z+side*.258,.70,.066,.13]);
    for(let j=0;j<8;j++) ends.push([x+(j-3.5)*.082,.08,z+side*.365,.03,.026,.19]);
  }
  blocks(g,m.carrier,stacks);blocks(g,m.pic,dies);blocks(g,m.eic,tops);blocks(g,m.lens,arrival);blocks(g,m.fiber,ends);
}
function buildLaser(g) {
  box(g,m.dark,0,.066,0,.68,.13,1.6);
  box(g,m.metal,0,.256,0,.64,.27,1.52);
  box(g,m.dark,0,.245,.819,.55,.234,.11);
  box(g,m.ceramic,0,.245,.879,.24,.148,.024);
  box(g,m.dark,0,.246,.897,.16,.104,.018);
  const fins=[];
  for(let i=0;i<10;i++) fins.push([0,.43,-.648+i*.095,.54,.079,.04]);
  blocks(g,m.silver,fins);
  label(g,'ELS',0,.396,.50,.43,.22,'#283338');
}
const smooth = u => { const t=THREE.MathUtils.clamp(u,0,1);return t*t*(3-2*t); };
const phase = (t,a,b) => smooth((t-a)/(b-a));
function frame(t,keys,out) {
  for(let i=1;i<keys.length;i++) {
    if(t<=keys[i][0]) {
      const a=keys[i-1], b=keys[i], f=phase(t,a[0],b[0]);
      return out.set(...[1,2,3].map(j=>THREE.MathUtils.lerp(a[j],b[j],f)));
    }
  }
  return out.set(...keys.at(-1).slice(1));
}

const travelX=.20, travelY=.116;
const referenceX=-.787+11*.143;
const faceY=.268, faceZ=.520;

// A magnified end-face sight picks out the same channel on both parts.
// Its moving mark is translated with the FAU; the PIC mark remains fixed.
function facetSight(parent) {
  const root=group(parent);
  root.name='通道对准示意';
  const reference=new THREE.MeshBasicMaterial({color:0x269cac});
  const movingInk=new THREE.MeshBasicMaterial({color:0xff7c37});
  const coupledInk=new THREE.MeshBasicMaterial({color:0x34c6c4});
  const guide=new THREE.MeshBasicMaterial({color:0x668a8c});
  const px=1.47, py=.70, pz=.55;
  const marker=group(root);
  marker.position.set(px,py,pz);
  const stationary=group(root);
  stationary.position.copy(marker.position);
  function circle(g,mat,inner,outer,z) {
    const mesh=new THREE.Mesh(new THREE.RingGeometry(inner,outer,48),mat);
    mat.side=THREE.DoubleSide;
    mesh.position.z=z;
    g.add(mesh);
  }
  circle(stationary,reference,.074,.087,0);
  for(const side of [-1,1]) {
    box(stationary,reference,side*.128,0,0,.057,.012,.008);
    box(stationary,reference,0,side*.128,0,.012,.057,.008);
  }
  circle(marker,movingInk,.039,.060,.006);
  box(marker,movingInk,0,0,.006,.022,.022,.009);
  const chipPath=box(root,coupledInk,referenceX,.276,.357,.032,.011,.32);
  const sourceDot=box(root,movingInk,0,0,0,.038,.038,.014);
  const fiberTrace=box(root,movingInk,0,0,0,.027,.006,.26);
  const targetStem=box(root,guide,0,0,0,.009,1,.009);
  const sourceStem=box(root,movingInk,0,0,0,.009,1,.009);
  const start=new THREE.Vector3(), end=new THREE.Vector3(), axis=new THREE.Vector3(0,1,0);
  function leader(mesh,a,b) {
    mesh.position.copy(a).lerp(b,.5);
    end.subVectors(b,a);
    mesh.scale.y=end.length();
    mesh.quaternion.setFromUnitVectors(axis,end.normalize());
  }
  const settledColor=new THREE.Color(0x168365);
  const guidingColor=new THREE.Color(0xef702b);
  function update(x,y,gap,amount) {
    const {power,ready}=alignmentSample(x/travelX,y/travelY);
    marker.position.set(px+x,py+y,pz+.011);
    movingInk.color.copy(ready?settledColor:guidingColor);
    // The received trace brightens only as the two selected cores coincide.
    coupledInk.color.setRGB(.028,.068+.71*power/100,.077+.57*power/100);
    chipPath.visible=amount>0;
    sourceDot.position.set(referenceX+x,faceY+y,faceZ+gap+.008);
    fiberTrace.position.set(referenceX+x,.343+y,.675+gap);
    start.set(referenceX,faceY,faceZ);
    leader(targetStem,start,stationary.position);
    leader(sourceStem,sourceDot.position,marker.position);
    root.visible=amount>0;
  }
  root.visible=false;
  return {root,update};
}

export function createCPO(){
  const root=new THREE.Group();
  root.name='CPO · 外置激光硅光引擎';
  const engine=group(root), carrier=group(engine),pic=group(engine),eic=group(engine),fau=group(engine);
  const bond=engineCarrier(carrier);
  picDie(pic); eicDie(eic); fiberArray(fau);
  const system=group(root), board=group(system), asic=group(system), peers=group(system);
  mainBoard(board);switchDie(asic);adjacentEngines(peers);
  const laser=group(root); buildLaser(laser);
  const plug=group(root);
  box(plug,m.orange,0,0,0,.205,.143,.26);
  box(plug,m.white,0,0,-.15,.122,.084,.062);
  box(plug,m.dark,0,0,.185,.12,.089,.116);
  const head=group(root);vacuumHead(head);
  const chuck=group(root);
  // Two vacuum pads hold the rigid glass lid. The beam sits above the lid and never contacts the fibers.
  for(const x of [-.43,.43]) {
    disc(chuck,m.dark,x,.025,0,.085,.05);
    disc(chuck,m.silver,x,.125,0,.053,.152);
  }
  box(chuck,m.silver,0,.228,0,1.00,.07,.17);
  box(chuck,m.dark,0,.326,0,.25,.13,.17);
  box(chuck,m.orange,0,.419,0,.36,.056,.22);
  disc(chuck,m.silver,0,.525,0,.087,.16);
  const sight=facetSight(root);
  const tester=group(root);
  box(tester,m.dark,0,.38,0,.35,.21,.88);
  box(tester,m.orange,0,.502,0,.29,.044,.79);
  for(let i=0;i<6;i++) {
    const z=-.34+i*.131;
    disc(tester,m.silver,0,.183,z,.026,.19);
    solid(tester,roundGeo,m.gold,0,.048,z,.011,.096,.011);
  }
  const signal=disc(tester,m.pass,.088,.533,.28,.043,.014);
  const status=disc(laser,m.pass,.207,.399,.63,.036,.013);
  const inputNest=group(root);
  box(inputNest,m.metal.clone(),0,.025,0,2.02,.05,1.12);
  box(inputNest,m.dark.clone(),0,.055,0,1.91,.01,1.01);
  for(const plate of inputNest.children) plate.material.transparent=true;
  const cable=group(root);
  // The curved strain relief ends at the plug. Morph targets interpolate its free loop during mating.
  const cablePath = (dy,dz)=>new THREE.CatmullRomCurve3([
    new THREE.Vector3(.117,.2926,1.825),new THREE.Vector3(.15,.30,2.17),
    new THREE.Vector3(.61,.26,2.49),new THREE.Vector3(1.72,.27,2.61),
    new THREE.Vector3(2.39,.28+dy*.54,2.49+dz),
    new THREE.Vector3(2.50,.245+dy,1.864+dz)]);
  const fixed=new THREE.TubeGeometry(cablePath(0,0),40,.032,8,false);
  const free=new THREE.TubeGeometry(cablePath(.20,.46),40,.032,8,false);
  fixed.morphAttributes.position=[free.attributes.position];
  fixed.morphAttributes.normal=[free.attributes.normal];
  const cord=new THREE.Mesh(fixed,m.feed);cable.add(cord);
  const heroParts=[pic,eic,fau];
  const ids=['pic','eic','fau'];
  // PIC edge: y=.13+.138, z=.342+.356/2. The FAU termini share both planes.
  const offsets=[[0,.13,0],[0,.2745,-.153],[0,.192,.519]];
  // Incoming dies start on a separate indexed input nest; all positions are evaluated from the same clock.
  const input=[[-2.47,.06,-.58],[-2.47,.06,-.58],[0,.207,1.53]];
  const cups=[.134,.137,.145];
  for(const [id,g] of Object.entries({carrier,pic,eic,fau,package:board,asic,peers,laser})) {
    g.userData.part=id;
    g.name=partList.find(part=>part.id===id).label;
    g.traverse(node=>{node.userData.part=id;});
  }
  for(const g of [plug,cable]) g.traverse(node=>{node.userData.part='laser';});
  function update(index,t,explode=0,hidden=new Set(),alignment=null) {
    const stage=THREE.MathUtils.clamp(Math.trunc(index),0,5);
    const p=THREE.MathUtils.clamp(t,0,1), exp=THREE.MathUtils.clamp(explode,0,1);
    const presenting=exp>0.0001;
    const keep=id=>!hidden.has(id);
    const integrated=stage>3?1:(stage===3?phase(p,.27,.78):0);
    const finalScale=.38;
    engine.scale.setScalar(1+(finalScale-1)*integrated);
    engine.position.set(.09*integrated, .19*integrated,1.39*integrated);
    if(stage===3) engine.position.y+=.92*(phase(p,.10,.28)-phase(p,.66,.87));
    engine.position.y+=exp*.22;
    system.visible=integrated>.001;
    system.scale.setScalar(integrated);
    system.position.set(-.45*integrated,0,0);
    board.visible=keep('package');
    asic.visible=keep('asic');asic.position.y=.19+exp*.98;
    peers.visible=keep('peers');peers.position.y=.19+exp*.4;
    carrier.visible=keep('carrier');
    const manualAlignment=stage===2 && alignment && !presenting;
    const blend=manualAlignment?THREE.MathUtils.clamp(alignment.blend??1,0,1):0;
    // Lay down the support fillet after positioning. While the chuck is adjusting,
    // the recess under the hovering array provides travel in both vertical directions.
    const cured=stage>2?1:stage===2?phase(p,.87,.95)*(1-blend):0;
    bond.visible=cured>.001;
    bond.scale.y=.1305*cured;
    bond.position.y=.016+bond.scale.y/2;
    head.visible=false;chuck.visible=false;sight.root.visible=false;inputNest.visible=false;
    for(let j=0;j<3;j++) {
      const dest=offsets[j],part=heroParts[j];
      part.visible=stage>=j && keep(ids[j]);
      part.position.set(...dest);
      if(stage===j) {
        const start=input[j], [x,y,z]=dest;
        if (j<2) {
          frame(p,[[0,...start],[.18,...start],[.33,start[0],.90,start[2]],[.61,x,.90,z],[.80,...dest],[1,...dest]],part.position);
          inputNest.position.set(start[0],0,start[2]);
        } else {
          const startX=initialOffset.x*travelX, startY=initialOffset.z*travelY;
          frame(p,[[0,...start],[.18,...start],[.37,0,.40,1.23],
            [.62,startX,y+startY,z+.06],[.83,...dest],[1,...dest]],part.position);
          if (manualAlignment) {
            const dx=THREE.MathUtils.clamp(alignment.x,-1,1);
            const dy=THREE.MathUtils.clamp(alignment.z,-1,1);
            // Axial clearance closes at the center. Never push a displaced fiber behind the chip edge.
            const gap=.06*Math.min(1,Math.hypot(dx,dy)/Math.hypot(initialOffset.x,initialOffset.z));
            part.position.x=THREE.MathUtils.lerp(part.position.x,x+dx*travelX,blend);
            part.position.y=THREE.MathUtils.lerp(part.position.y,y+dy*travelY,blend);
            part.position.z=THREE.MathUtils.lerp(part.position.z,z+gap,blend);
          }
          const sightVisible=!presenting && part.visible && keep('pic') && (manualAlignment||p>=.52&&p<.94);
          sight.update(part.position.x-x,part.position.y-y,part.position.z-z,sightVisible?1:0);
          inputNest.position.set(start[0],.10,start[2]+.2);
          inputNest.scale.z=.46;
        }
        if (j<2) inputNest.scale.z=1;
        // Remove the empty feeder from the teaching view once the workpiece clears it.
        const trayOpacity=1-phase(p,.38,.56);
        inputNest.visible=!presenting && trayOpacity>0;
        if(inputNest.visible) for(const plate of inputNest.children) {
          plate.material.opacity=trayOpacity;
          plate.material.depthWrite=trayOpacity===1;
          plate.castShadow=trayOpacity===1;
        }
        const tool=j===2?chuck:head;
        tool.visible=part.visible&&!presenting&&(p<.995||blend>0);
        tool.position.copy(part.position);
        const retract=phase(p,j===2?.87:.84,1);
        const lift=.78*(1-phase(p,0,.14))+.85*retract;
        tool.position.y+=cups[j]+lift*(1-blend);
        if (j===2) tool.position.z+=.155;
      }
      part.position.y+=exp*(j===0?.57:j===1?1.45:.57);
      if(j===2)part.position.z+=exp*.88;
    }
    if(stage===3&&!presenting&&p<.995) {
      head.visible=true;
      head.scale.setScalar(engine.scale.x);
      head.position.copy(engine.position);
      head.position.y+=.4115*engine.scale.x+.75*(1-phase(p,0,.10))+.78*phase(p,.87,1);
      head.position.z-=.153*engine.scale.x;
    } else head.scale.setScalar(1);
    laser.visible=keep('laser')&&stage>=4;
    laser.position.set(2.50,0,.60);
    cable.visible=plug.visible=laser.visible&&keep('fau');
    const loose=stage===4?1-phase(p,.37,.80):0;
    cord.morphTargetInfluences[0]=loose;
    plug.position.set(2.50,.245+.20*loose,1.621+.46*loose);
    if(stage===4&&!presenting&&p<.995&&plug.visible) {
      head.visible=true;head.scale.setScalar(.62);
      head.position.copy(plug.position);
      head.position.y+=.0715+.45*(1-phase(p,0,.26))+.58*phase(p,.82,1);
    }
    tester.visible=stage===5&&!presenting&&keep('package')&&p<.995;
    tester.position.set(-2.36,.205+.72*(1-phase(p,.05,.34))+.80*phase(p,.86,1),0);
    signal.visible=stage===5&&p>=.68;
    status.visible=stage===5&&p>=.68;
    // In the exploded diagram the flexible tether is disconnected to expose the individual subassemblies.
    if(presenting) cable.visible=plug.visible=false;
  }
  update(0,0);
  return {root,steps:stages,parts:partList,update};
}
