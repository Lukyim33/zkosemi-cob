import * as THREE from 'three';
import { RoomEnvironment } from '../vendor/RoomEnvironment.js';

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({canvas, antialias:true, powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe9ece5);
  const camera = new THREE.OrthographicCamera(-10,10,7,-7,.004,140);
  const generator = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  scene.environment = generator.fromScene(room,.04).texture;
  scene.environmentIntensity = .66;
  room.dispose();
  generator.dispose();
  scene.add(new THREE.HemisphereLight(0xfaffff,0xa8a69b,1.28));
  const light = new THREE.DirectionalLight(0xfff5e1,2.05);
  light.position.set(-9,16,8);
  light.castShadow = true;
  light.shadow.mapSize.set(1024,1024);
  Object.assign(light.shadow.camera,{left:-12,right:12,top:12,bottom:-12,near:1,far:48});
  light.shadow.normalBias = .018;
  light.shadow.bias = -.00018;
  scene.add(light, light.target);
  const fill = new THREE.DirectionalLight(0xe8f3ff,1.1);
  fill.position.set(4,6,-7);
  scene.add(fill);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(150,150),new THREE.ShadowMaterial({color:0x40534a,opacity:.22}));
  ground.rotation.x = -Math.PI/2;
  ground.position.y = -.37;
  ground.receiveShadow = true;
  scene.add(ground);
  const grid = new THREE.GridHelper(48,48,0x929d91,0x9fa89c);
  grid.position.y = -.375;
  grid.material.transparent=true;
  grid.material.opacity=.14;
  grid.material.depthWrite=false;
  scene.add(grid);

  // A low workholder gives the magnified product a common datum through all six stations.
  const mount = new THREE.Group();
  const unit = new THREE.BoxGeometry();
  const plate = new THREE.MeshStandardMaterial({color:0xcdcfc6,metalness:.42,roughness:.55});
  const base = new THREE.Mesh(unit,plate);
  base.scale.set(7.8,.22,4.5);
  base.position.y=-.20;
  base.castShadow=true; base.receiveShadow=true; mount.add(base);
  const top = new THREE.Mesh(unit,new THREE.MeshStandardMaterial({color:0xe1e4da,metalness:.2,roughness:.65}));
  top.scale.set(7.7,.105,4.4);
  top.position.y=-.055;top.receiveShadow=true;mount.add(top);
  const steel = new THREE.MeshStandardMaterial({color:0x858b85,metalness:.73,roughness:.35});
  const holes = new THREE.InstancedMesh(new THREE.CylinderGeometry(.038,.038,.004,12),steel,64);
  const matrix = new THREE.Matrix4();
  for(let i=0;i<32;i++) for(let j=0;j<2;j++) {
    holes.setMatrixAt(i*2+j,matrix.makeTranslation(-3.55+i*.23,0,j?1.95:-1.95));
  }
  mount.add(holes);
  scene.add(mount);
  const offset=light.position.clone();
  function lightRegion(point=null,size=13) {
    if(point) light.target.position.copy(point);
    else light.target.position.set(0,0,0);
    light.position.copy(light.target.position).add(offset);
    Object.assign(light.shadow.camera,{left:-size,right:size,top:size,bottom:-size});
    light.shadow.camera.updateProjectionMatrix();
    light.shadow.normalBias=size*.0014;
  }
  let slowSeconds=0, warmup=1.5;
  function adaptResolution(seconds){
    if(seconds<=0)return;
    if(warmup>0){warmup-=seconds;return;}
    slowSeconds=seconds>1/24 ? slowSeconds+seconds : Math.max(0,slowSeconds-seconds*2);
    if(slowSeconds<1.5)return;
    const ratio=renderer.getPixelRatio();
    if(ratio>.70)renderer.setPixelRatio(Math.max(.70,ratio*.83));
    slowSeconds=0;
  }
  return {renderer,scene,camera,mount,lightRegion,adaptResolution};
}
