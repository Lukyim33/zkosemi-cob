import * as THREE from 'three';

const ink = {
  white: 0xe8ebea, satin: 0xc8d0d1, shell: 0xf6f6f1, metal: 0xa5b2b8,
  dark: 0x39474b, rubber: 0x293639, rail: 0x75888e, orange: 0xec6428,
  orangeL: 0xfca455, slate: 0x50686e, glass: 0x9dbbc1, red: 0xa75738,
  board: 0x226962, brass: 0xd1ae69, mint: 0x86d7ac, floor: 0xd6dcda,
  seam: 0xbac6c7, screen: 0x22393c, blue: 0x8cb8c4, window:0x91aeb5,
};

export function createFloor() {
  const root = new THREE.Group();
  root.name = '光引擎装配车间';
  const staticShop = new THREE.Group();
  root.add(staticShop);
  const geo = {
    box: new THREE.BoxGeometry(1, 1, 1),
    cylinder: new THREE.CylinderGeometry(1, 1, 1, 16),
    round: new THREE.CylinderGeometry(1, 1, 1, 32),
  };
  const mats = new Map();
  function finish(color) {
    if (!mats.has(color)) {
      const metallic = ['metal','rail','brass','satin'].includes(color);
      const material=new THREE.MeshStandardMaterial({
        color: ink[color], roughness: metallic ? 0.42 : 0.66,
        metalness: metallic ? 0.42 : 0.05,
        ...(color === 'mint' ? { emissive: 0x66c790, emissiveIntensity: 0.4 } : {}),
      });
      material.userData.surface=metallic?'metal':color==='mint'?'lamp':'satin';
      mats.set(color,material);
    }
    return mats.get(color);
  }
  function group(parent, x=0, y=0, z=0) {
    const item = new THREE.Group();
    item.position.set(x,y,z);
    parent.add(item);
    return item;
  }
  function mesh(parent, shape, color, x,y,z, w,h,d) {
    const item = new THREE.Mesh(geo[shape],finish(color));
    item.position.set(x,y,z);
    item.scale.set(w,h,d);
    item.castShadow = h > 0.08;
    item.receiveShadow = true;
    parent.add(item);
    return item;
  }
  function b(parent,color,x,y,z,w,h,d) {
    return mesh(parent,'box',color,x,y,z,w,h,d);
  }
  function c(parent,color,x,y,z,r,h,axis='y',smooth=false) {
    const item = mesh(parent,smooth?'round':'cylinder',color,x,y,z,r,h,r);
    if(axis==='x') item.rotation.z=Math.PI/2;
    if(axis==='z') item.rotation.x=Math.PI/2;
    return item;
  }
  function rod(parent,color,a,end,r) {
    const delta=new THREE.Vector3(...end).sub(new THREE.Vector3(...a));
    const center=new THREE.Vector3(...a).addScaledVector(delta,0.5);
    const item=c(parent,color,center.x,center.y,center.z,r,delta.length());
    item.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
    return item;
  }
  // Print the labels on the machine fascia and floor, so they scale with the model.
  function label(parent,words,x,y,z,w,h,{floor=false,bg='#39474b',fg='#fafaf5',weight=700}={}) {
    if(typeof document==='undefined') return;
    const canvas=document.createElement('canvas');
    canvas.width=640; canvas.height=128;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle=bg;ctx.fillRect(0,0,640,128);
    ctx.fillStyle=fg;ctx.font=weight+' 79px Arial, sans-serif';
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(words,320,69,598);
    const tex=new THREE.CanvasTexture(canvas);
    tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;
    const printed=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:tex,roughness:.78}));
    printed.position.set(x,y,z);
    if(floor) printed.rotation.x=-Math.PI/2;
    parent.add(printed);
  }
  // Per-instance colour keeps every instrument independently pickable without
  // adding a draw call for each cabinet finish or each piece of hardware.
  const neutralFinishes=new Map();
  const sharedShapes=new Set(Object.values(geo));
  function batch(parent) {
    parent.updateWorldMatrix(true,true);
    const inverse=parent.matrixWorld.clone().invert();
    const buckets=new Map();
    parent.traverse(o=>{
      if(!o.isMesh || o.isInstancedMesh || !sharedShapes.has(o.geometry))return;
      const key=o.geometry.uuid+(o.material.userData.surface??o.material.uuid);
      if(!buckets.has(key)) buckets.set(key,[]);
      buckets.get(key).push(o);
    });
    for (const list of buckets.values()) {
      const first=list[0];
      const surface=first.material.userData.surface;
      if(surface&&!neutralFinishes.has(surface)){
        const neutral=first.material.clone();neutral.color.set(0xffffff);
        neutralFinishes.set(surface,neutral);
      }
      const inst=new THREE.InstancedMesh(first.geometry,neutralFinishes.get(surface)??first.material,list.length);
      inst.castShadow=!first.material.transparent&&list.some(o=>o.castShadow);
      inst.receiveShadow=!first.material.transparent;
      list.forEach((o,i)=>{
        inst.setMatrixAt(i,new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld));
        if(surface) inst.setColorAt(i,o.material.color);
        o.removeFromParent();
      });
      inst.computeBoundingSphere();
      parent.add(inst);
    }
  }

  // A cutaway cleanroom sits on a low, bevel-edged plinth.
  function slab(parent,w,d,bevel,y,h,color){
    const shape=new THREE.Shape();
    const a=w/2, f=d/2;
    shape.moveTo(-a+bevel,-f); shape.lineTo(a-bevel,-f); shape.lineTo(a,-f+bevel);
    shape.lineTo(a,f-bevel);shape.lineTo(a-bevel,f);shape.lineTo(-a+bevel,f);
    shape.lineTo(-a,f-bevel);shape.lineTo(-a,-f+bevel);shape.closePath();
    const g=new THREE.ExtrudeGeometry(shape,{depth:h,bevelEnabled:false});
    g.rotateX(-Math.PI/2);
    const m=new THREE.Mesh(g,finish(color));m.position.y=y;
    m.receiveShadow=m.castShadow=true;parent.add(m);
  }
  slab(staticShop,16.7,9.9,.24,-.36,.24,'rail');
  slab(staticShop,16.64,9.84,.23,-.12,.12,'floor');
  for(let x=-7.5;x<=7.5;x+=1.5) b(staticShop,'seam',x,.002,0,.01,.004,9.55);
  for(let z=-4;z<=4;z+=1.4) b(staticShop,'seam',0,.002,z,16.35,.004,.011);
  for(const z of [-.37,.45]) b(staticShop,'white',0,.009,z,15.5,.012,.035);
  for(const x of [-6.7,-4.5,-2.3,0,2.3,4.5,6.7]){
    for(const side of [-1,1]){
      const v=b(staticShop,'white',x,.012,.04+side*.072,.25,.013,.066);
      v.rotation.y=side*.55;
    }
  }
  // Rear service spine with air-handling cartridges, doors and utility trunk.
  b(staticShop,'satin',0,.63,-4.46,15.95,1.26,.19);
  b(staticShop,'rail',0,.09,-4.34,16,.16,.08);
  b(staticShop,'white',0,1.29,-4.45,16.02,.11,.26);
  for(let x=-7.4;x<8;x+=1.25){
    b(staticShop,'shell',x,.69,-4.344,1.22,1.09,.055);
    b(staticShop,'metal',x+.47,.7,-4.302,.031,.17,.045);
  }
  rod(staticShop,'metal',[-7.77,1.5,-4.45],[7.77,1.5,-4.45],.051);
  for(const x of [-7.62,-4.8,0,4.8,7.62]){
    b(staticShop,'satin',x,1.35,-4.45,.14,.55,.21);
  }
  for(const x of [-5.75,-.05,5.65]){
    b(staticShop,'white',x,1.60,-4.45,1.86,.52,.52);
    b(staticShop,'slate',x,1.60,-4.18,1.48,.31,.035);
    for(let i=0;i<15;i++)b(staticShop,'metal',x-.69+i*.097,1.60,-4.154,.035,.28,.024);
  }

  // Two return walls and a partial ceiling reveal the room while keeping its 
  // front and right elevations open to the visitor's initial sight line.
  const rear=group(staticShop,0,0,-4.60);
  b(rear,'white',0,1.68,0,16.15,3.36,.12);
  for(let i=0;i<9;i++){
    const x=(i-4)*1.78;
    b(rear,'dark',x,2.23,.075,1.49,1.10,.05);
    b(rear,'window',x,2.23,.112,1.43,1.04,.025);
    b(rear,'metal',x,2.23,.134,.024,1.04,.022);
    b(rear,'satin',x,1.64,.13,1.54,.064,.10);
    b(rear,'satin',x+.86,1.67,.082,.021,3.26,.025);
  }
  b(rear,'satin',0,3.37,0,16.22,.15,.28);
  b(rear,'slate',0,3.18,.24,15.9,.11,.16);
  label(rear,'PHOTONICS    /    ASSEMBLY',-.04,2.98,.075,3.13,.24,{bg:'#e8ebea',fg:'#465559'});
  const side=group(staticShop,-8.02,0,-.07);
  side.rotation.y=Math.PI/2;
  b(side,'white',0,1.51,0,8.99,3.02,.13);
  b(side,'rail',0,.17,.074,8.95,.22,.044);
  for(const x of [-3.68,-2.13,1.36,2.93]){
    b(side,'satin',x,2.08,.078,1.44,1.38,.05);
    b(side,'window',x,2.08,.114,1.32,1.26,.025);
    b(side,'metal',x,2.08,.135,.03,1.26,.018);
  }
  // Stainless cleanroom access door with flush glazing and a wall interlock.
  b(side,'metal',-.35,1.23,.08,1.73,2.45,.082);
  for(const x of [-.75,.05]){
    b(side,'shell',x,1.18,.14,.77,2.28,.043);
    b(side,'rail',x,1.68,.168,.50,.61,.025);
    b(side,'window',x,1.68,.188,.44,.55,.018);
    b(side,'metal',x+Math.sign(-.35-x)*.265,1.05,.203,.043,.33,.075);
  }
  b(side,'dark',.66,1.22,.115,.16,.24,.063);
  b(side,'mint',.66,1.27,.153,.07,.036,.015);
  label(side,'AIRLOCK   01',-.35,2.62,.076,1.17,.18,{bg:'#d5dede',fg:'#405055'});
  const duct=group(staticShop,0,3.53,-3.88);
  b(duct,'satin',0,0,0,15.83,.30,.54);
  for(let x=-7.68;x<7.9;x+=1.96) b(duct,'metal',x,0,0,.045,.34,.59);
  for(const x of [-6.35,-1.68,3.18,6.97]){
    b(duct,'metal',x,-.18,-.29,.09,.17,.86);
    b(duct,'shell',x,-.18,.30,1.85,.11,.19);
    b(duct,'white',x,-.245,.30,1.76,.027,.135);
  }
  for(let x=-6.7;x<8;x+=1.33){
    b(staticShop,'rail',x,.026,4.22,.80,.028,.18);
    for(let n=0;n<10;n++)b(staticShop,'metal',x-.35+n*.078,.044,4.22,.033,.009,.159);
  }
  for(const z of [-3.9,3.61]){
    b(staticShop,'white',0,.014,z,15.6,.018,.055);
    b(staticShop,'orangeL',0,.014,z+.06,15.6,.018,.021);
  }

  function cabinet(p,width=2.65){
    for(const x of [-1,1]) for(const z of [-.59,.59])
      c(p,'rubber',x*(width/2-.18),.10,z,.085,.19);
    b(p,'dark',0,.23,0,width-.16,.18,1.43);
    b(p,'white',0,.59,0,width,.62,1.56);
    b(p,'rail',0,.92,0,width+.06,.085,1.61);
    for(const side of [-1,1]){
      const x=side*width*.245;
      b(p,'satin',x,.59,.789,width*.465,.48,.035);
      b(p,'metal',x+.15,.73,.82,.3,.043,.04);
    }
    for(let i=0;i<5;i++) b(p,'slate',width/2+.003,.48+i*.052,0,.012,.02,.7);
  }
  function stackLight(p,x,z,h){
    c(p,'rail',x,h+.104,z,.028,.208);
    c(p,'dark',x,h+.21,z,.064,.044);
    for(const [i,color] of ['orangeL','mint'].entries()) c(p,color,x,h+.279+i*.11,z,.064,.091);
    c(p,'dark',x,h+.448,z,.066,.026);
  }
  function screen(p,x,z) {
    b(p,'metal',x,1.10,z,.07,.36,.09);
    b(p,'dark',x,1.43,z,.51,.39,.115);
    b(p,'screen',x,1.43,z+.063,.442,.309,.018);
    b(p,'blue',x-.012,1.52,z+.077,.36,.022,.009);
    for(let i=0;i<5;i++){
      b(p,'mint',x-.14+i*.059,1.384+i*.014,z+.078,.035,.054+i*.02,.009);
    }
    c(p,'orange',x+.18,1.25,z+.06,.022,.018,'z');
  }
  function gantry(p){
    for(const x of [-.94,.94]) {
      b(p,'satin',x,1.52,-.25,.20,1.10,.31);
      b(p,'dark',x,1.16,-.25,.31,.34,.4);
    }
    b(p,'white',0,2.065,-.25,2.16,.35,.49);
    b(p,'rail',0,2.06,.014,1.95,.14,.055);
    b(p,'orange',-.73,2.18,.004,.29,.04,.052);
    b(p,'slate',0,.99,.05,1.76,.08,.79);
    for(let i=0;i<9;i++) b(p,'metal',-.74+i*.185,1.045,.08,.06,.034,.56);
  }
  function opticalStage(p){
    b(p,'dark',0,1.03,-.08,2.26,.15,1.21);
    for(const x of [-.78,.78]){
      b(p,'metal',x,1.22,-.04,.4,.26,.87);
      b(p,'dark',x,1.39,-.08,.29,.1,.63);
      b(p,'white',x,1.48,-.08,.25,.15,.44);
      c(p,'brass',x,1.46,.22,.075,.19,'z');
      c(p,'orange',x,1.46,.34,.08,.09,'z');
    }
    // Offset open gantry carries a microscope head and leaves the optical axis visible.
    b(p,'satin',-.19,1.78,-.53,.25,1.32,.27);
    b(p,'shell',-.19,2.39,-.19,.45,.24,.89);
    c(p,'dark',-.19,2.13,.13,.16,.34);
    c(p,'metal',-.19,1.91,.13,.115,.17);
    c(p,'blue',-.19,1.80,.13,.072,.06);
  }
  function tester(p){
    b(p,'dark',0,1.03,.07,1.92,.15,1.15);
    for(const x of [-.72,.72]){
      c(p,'metal',x,1.58,-.26,.065,1.15);
      c(p,'dark',x,1.11,-.26,.13,.12);
    }
    b(p,'white',0,2.17,-.26,1.72,.34,.57);
    b(p,'orange',0,2.19,.028,1.04,.044,.022);
  }
  function flipBonder(p) {
    b(p,'dark',0,1.02,-.04,2.15,.15,1.25);
    b(p,'white',0,1.72,-.52,1.87,1.39,.42);
    b(p,'satin',-.59,1.96,-.04,.49,.51,.77);
    c(p,'dark',-.59,1.72,.19,.14,.29);
    c(p,'metal',-.59,1.53,.19,.076,.16);
    b(p,'slate',.21,2.17,-.291,.74,.32,.032);
    for(let i=0;i<7;i++) b(p,'metal',-.05+i*.086,2.17,-.267,.037,.25,.024);
    b(p,'satin',.06,1.16,.14,1.63,.13,.74);
  }
  function opticalDock(p) {
    b(p,'dark',0,1.04,0,2.23,.18,1.12);
    b(p,'rail',0,1.17,0,1.95,.12,.87);
    b(p,'white',.91,1.42,-.03,.47,.39,.68);
    for(const z of [-.22,-.05,.12]) c(p,'metal',.61,1.42,z,.046,.13,'x');
    b(p,'satin',-.56,1.7,-.55,.21,1.4,.21);
    b(p,'white',-.42,2.35,-.32,.56,.28,.65);
    c(p,'dark',-.29,2.1,-.11,.12,.3);
  }
  function wireShelf(p) {
    b(p,'dark',0,1.04,0,2.12,.18,1.22);
    b(p,'white',-.86,1.56,-.30,.53,1.01,.72);
    for(let i=0;i<4;i++){
      b(p,'slate',-.86,1.23+i*.19,.072,.46,.13,.024);
      b(p,'mint',-1.04,1.23+i*.19,.091,.036,.034,.016);
      b(p,'metal',-.79,1.23+i*.19,.091,.21,.026,.02);
    }
    b(p,'satin',0,1.18,.09,1.12,.11,.75);
    b(p,'metal',.87,1.66,-.46,.14,1.02,.14);
    b(p,'white',.65,2.12,-.32,.62,.21,.52);
    c(p,'dark',.45,1.96,-.18,.093,.19);
  }
  function cases(p,x,z){
    for(let k=0;k<3;k++){
      b(p,'slate',x,.24+k*.23,z,.73,.20,.52);
      b(p,'metal',x,.345+k*.23,z,.77,.035,.56);
      b(p,'orangeL',x-.19,.25+k*.23,z+.263,.20,.052,.018);
    }
  }
  const deckHeight=1.2868;
  function instrumentStage(cell,line,index){
    // The detailed model's 0.12-scale jig seats on this same physical datum.
    b(cell,'dark',0,1.133,.12,.97,.154,.63);
    b(cell,'metal',0,1.2468,.12,1.1,.08,.70);
    const stock=group(cell,0,deckHeight,.12);
    b(stock,'dark',0,.025,0,.74,.05,.43);
    b(stock,'board',0,.060,0,.63,.020,.33);
    b(stock,'metal',0,.096,0,index===2?.43:.22,.052,.21);
    for(let i=0;i<6;i++)b(stock,'brass',-.239+i*.095,.075,.14,.031,.015,.046);
    if(index===1){
      for(let i=0;i<6;i++)rod(stock,'blue',[.12,.104,-.10+i*.04],[.32,.102,-.10+i*.04],.009);
    }
    batch(stock);
    return stock;
  }
  function guard(cell,line,index,name){
    const high=(line?[2.62,2.68,2.35]:[2.49,2.68,2.46])[index];
    const xEdge=1.24, zEdge=.755, bottom=.985;
    const height=high-bottom;
    // Keep a narrow structural frame visible at every cutaway depth.
    for(const x of [-xEdge,xEdge])for(const z of [-zEdge,zEdge]){
      b(cell,'metal',x,(high+bottom)/2,z,.042,height,.042);
      b(cell,'dark',x,bottom+.045,z,.078,.09,.078);
    }
    for(const z of [-zEdge,zEdge]){
      b(cell,'satin',0,high,z,2.525,.075,.066);
      b(cell,'rail',0,bottom,z,2.525,.052,.055);
    }
    for(const x of [-xEdge,xEdge]){
      b(cell,'satin',x,high,0,.064,.074,1.51);
      b(cell,'rail',x,bottom,0,.054,.052,1.51);
    }
    // A return-air bonnet at the rear leaves the process window unobstructed.
    b(cell,'shell',0,high+.055,-.56,2.45,.12,.39);
    for(let i=0;i<28;i++)b(cell,'metal',-1.13+.084*i,high+.122,-.55,.040,.013,.24);
    b(cell,'shell',-.62,high-.058,.763,1.16,.106,.038);
    label(cell,name,-.62,high-.054,.787,1.02,.083,{bg:'#f1f3ef',fg:'#374744'});
    stackLight(cell,-.98,-.54,high+.116);
    const skin=group(cell),door=group(cell);
    const glass=new THREE.MeshStandardMaterial({color:0xb7d0d1,metalness:.02,roughness:.18,
      transparent:true,opacity:.215,depthWrite:false});
    const powder=new THREE.MeshStandardMaterial({color:ink.white,metalness:.25,roughness:.51,
      transparent:true,opacity:1,depthWrite:true});
    function cover(target,material,x,y,z,w,h,d){
      const obj=new THREE.Mesh(geo.box,material); obj.scale.set(w,h,d); obj.position.set(x,y,z);
      obj.renderOrder=1;obj.castShadow=false;target.add(obj);
    }
    const center=(high+bottom)/2;
    // Side skins have a solid service skirt beneath a clear inspection window.
    for(const side of [-1,1]){
      cover(skin,powder,side*xEdge,bottom+.132,0,.031,.22,1.418);
      cover(skin,glass,side*xEdge,center+.113,0,.022,height-.32,1.417);
    }
    cover(skin,powder,0,center,-zEdge,2.41,height-.094,.033);
    cover(door,glass,0,center+.075,zEdge,2.41,height-.23,.023);
    cover(door,powder,0,bottom+.074,zEdge,2.41,.093,.035);
    // Hinges, latch and interlock stay on the frame as reference points.
    for(const yy of [bottom+.29,high-.23])c(cell,'dark',-1.209,yy,zEdge+.019,.029,.128);
    b(cell,'dark',1.10,center,zEdge+.02,.063,.22,.061);
    b(cell,'orange',1.102,center+.021,zEdge+.06,.041,.12,.029);
    return {shell:skin,glass,powder,door,high};
  }
  function loader(p,line,index){
    // A cassette elevator sits to the left of the process chamber.
    b(p,'satin',-1.54,.83,-.06,.46,.15,.88);
    b(p,'rail',-1.55,.50,-.05,.27,.52,.42);
    b(p,'dark',-1.54,.95,-.07,.42,.063,.73);
    if(index===0){
      for(let i=0;i<5;i++){
        b(p,'metal',-1.54,1.015+i*.065,-.07,.36,.025,.56);
        b(p,'dark',-1.54,1.035+i*.065,-.07,.30,.014,.47);
      }
    }else{
      b(p,line?'rail':'satin',-1.54,1.03,-.07,.36,.095,.58);
      for(let i=0;i<4;i++)b(p,'dark',-1.54,1.09,-.26+i*.13,.28,.025,.08);
    }
    // Pneumatic supply, regulator, pressure gauge and a cable tray.
    b(p,'metal',1.365,.61,-.32,.13,.33,.47);
    for(const zz of [-.44,-.23]) {
      c(p,'brass',1.39,.77,zz,.037,.11);
      rod(p,'blue',[1.39,.81,zz],[1.39,.91,zz-.10],.013);
    }
    c(p,'white',1.457,.63,-.30,.082,.04,'x');
    rod(p,'dark',[1.479,.63,-.30],[1.479,.66,-.33],.008);
    c(p,'orange',1.449,.51,-.48,.035,.04,'x');
  }
  const picks=[], movers=[], stations={vcsel:[],cpo:[]};
  const stationTitles={
    vcsel:['光电芯片贴装机','微光学与光纤对准台','模块外壳合装台'],
    cpo:['芯片倒装贴合机','光纤阵列耦合台','共封装集成测试台'],
  };
  for (const [line,route,z] of [[0,'vcsel',1.84],[1,'cpo',-2.28]]) {
    const row=group(root,0,0,z);
    row.name=route.toUpperCase();
    const transfer=group(row);
    // The two thin transfer rails run in front of each machine bank.
    const lane=1.24;
    b(transfer,'dark',0,.54,lane,14.1,.21,.47);
    b(transfer,'rail',0,.657,lane,14.04,.043,.40);
    for(const side of [-1,1]) b(transfer,'metal',0,.68,lane+side*.22,14.1,.095,.045);
    for(let i=0;i<94;i++)b(transfer,'satin',-6.97+i*.15,.688,lane,.042,.026,.35);
    for(let x=-6.7;x<=6.8;x+=1.49){
      b(transfer,'rail',x,.24,lane,.13,.43,.31);
      b(transfer,'dark',x,.073,lane,.28,.09,.50);
    }
    const xCoords=[-4.89,0,4.86];
    const names=line?['B1  /  BOND','B2  /  COUPLE','B3  /  TEST']:['A1  /  PLACE','A2  /  ALIGN','A3  /  ENCLOSE'];
    const builders=line?[flipBonder,opticalDock,wireShelf]:[gantry,opticalStage,tester];
    const liveHeads=[];
    xCoords.forEach((x,i)=>{
      const cell=group(row,x,0,0);
      cell.name=stationTitles[route][i];
      cell.userData.route=route;cell.userData.stationIndex=i;
      cabinet(cell);
      builders[i](cell);
      screen(cell,1.25,.80);
      loader(cell,line,i);
      const cover=guard(cell,line,i,names[i]);
      const stock=instrumentStage(cell,line,i);
      label(cell,names[i],-.58,.55,.821,.94,.186);
      b(cell,'orange',-1.23,.55,.809,.052,.51,.027);
      b(cell,'shell',-1.17,.55,.810,.03,.51,.027);
      // Skin and door use unique materials. Keep their meshes with their
      // owning subgroups when batching the rest of this station.
      cell.remove(cover.shell,cover.door,stock);
      batch(cell);
      batch(cover.shell);batch(cover.door);
      cell.add(cover.shell,cover.door,stock);
      // Each head is added after batching. Its shaft and payload move together.
      const moving=new THREE.Group();
      if(!line && i===0){
        b(moving,'orange',0,0,0,.34,.32,.33);
        c(moving,'dark',0,-.25,0,.10,.22);
        c(moving,'metal',0,-.41,0,.055,.12);
        liveHeads.push({moving,x,y:1.96,z:.18,dx:.61,dy:.29});
      }else if(!line && i===2){
        b(moving,'dark',0,0,0,.88,.16,.55);
        for(const px of [-.30,-.10,.10,.30]) c(moving,'brass',px,-.13,0,.018,.15);
        liveHeads.push({moving,x,y:1.94,z:.08,dx:0,dy:.38});
      }else if(line && i===0){
        b(moving,'orange',0,0,0,.23,.11,.25);
        liveHeads.push({moving,x:x-.18,y:1.39,z:.16,dx:.3,dy:0});
      }else if(i===1){
        b(moving,'satin',0,0,0,.29,.19,.37);
        c(moving,'dark',.21,0,0,.079,.16,'x');
        c(moving,'brass',.335,0,0,.043,.10,'x');
        liveHeads.push({moving,x:x-.5,y:line?1.45:1.32,z:.05,dx:.12,dy:0});
      }else{
        b(moving,'metal',0,0,0,.36,.095,.24);
        for(const px of [-.105,0,.105])c(moving,'brass',px,-.07,0,.017,.11);
        liveHeads.push({moving,x:x+.44,y:1.77,z:.1,dx:0,dy:.25});
      }
      liveHeads.at(-1).x-=x;
      cell.add(moving);
      batch(moving);
      stations[route].push({object:cell,stationIndex:i,route,title:cell.name,
        // Carrier underside is .0372 below its origin; it seats on the .7275 rail top.
        anchor:new THREE.Vector3(x,1.324,z+.12),port:new THREE.Vector3(x,.7647,z+lane),
        ...cover,stock,moving});
      picks.push({object:cell,route,stationIndex:i});
    });
    // ESD tray rests and a small loading cart mark the start and end of each row.
    cases(transfer,-6.98,-.33);
    const cart=group(transfer,6.79,0,-.18);
    for(const x of [-.40,.4])for(const zz of [-.25,.25]) c(cart,'rubber',x,.115,zz,.10,.08,'z');
    b(cart,'satin',0,.36,0,.95,.20,.68);
    b(cart,'dark',0,.50,0,.98,.10,.70);
    for(let i=0;i<3;i++) b(cart,'satin',0,.565+i*.058,0,.67,.043,.45);
    for(const zz of [-.27,.27])rod(cart,'metal',[.44,.44,zz],[.58,.90,zz],.027);
    rod(cart,'metal',[.58,.90,-.27],[.58,.90,.27],.027);
    label(row,line?'LINE B    /    CPO':'LINE A    /    VCSEL',-6.19,.02,lane+.75,2.54,.44,{floor:true,bg:'#d6dcda',fg:'#576668'});
    for(const x of [-7.28,7.28])b(transfer,'orange',x,.02,lane+.02,.045,.022,.99);
    batch(transfer);
    const pallets=[];
    for(let i=0;i<3;i++){
      const tray=group(row,0,.71,lane);
      b(tray,'rubber',0,.037,0,.67,.074,.43);
      b(tray,'satin',0,.093,0,.61,.045,.39);
      b(tray,'orange',0,.130,0,.38,.04,.25);
      b(tray,'board',0,.164,0,.26,.034,.17);
      b(tray,'brass',.03,.19,0,.095,.023,.083);
      batch(tray);pallets.push(tray);
    }
    movers.push({liveHeads,pallets,offset:line*.41,route});
  }
  batch(staticShop);
  const allStations=[...stations.vcsel,...stations.cpo];
  let activeRoute=null;
  let detailStation=null;
  function updateTooling(station){
    const show=station!==detailStation&&(station.cutAmount??0)<.34;
    station.stock.visible=show;
    station.moving.visible=show;
  }
  function setCutaway(route,index,amount,otherIndex=null,otherAmount=amount){
    for(const station of allStations){
      const selected=station.route===route;
      const level=selected&&station.stationIndex===index?amount:
        selected&&station.stationIndex===otherIndex?otherAmount:0;
      const cut=THREE.MathUtils.clamp(Number(level)||0,0,1);
      if(station.cutAmount===cut)continue;
      station.cutAmount=cut;
      station.glass.opacity=THREE.MathUtils.lerp(.215,.025,cut);
      station.powder.opacity=THREE.MathUtils.lerp(1,.04,cut);
      station.powder.depthWrite=cut===0;
      station.door.position.y=cut*.57;
      updateTooling(station);
    }
  }
  function setDetail(route,index,amount=1){
    const next=amount>0 ? stations[route]?.[index]??null : null;
    if(detailStation===next)return;
    const previous=detailStation;
    detailStation=next;
    if(previous)updateTooling(previous);
    if(next)updateTooling(next);
  }
  function setActiveRoute(route){
    activeRoute=route;
    for(const line of movers)
      for(const tray of line.pallets)tray.visible=line.route!==activeRoute&&tray.userData.onBelt;
  }
  const stops = [-7.03, -4.89, 0, 4.86, 7.03];
  function update(time){
    for(const {liveHeads,pallets,offset,route} of movers){
      const t=time*.53+offset;
      liveHeads.forEach(({moving,x,y,z,dx,dy},i)=>{
        const phase=(t*.38+i*.33)%1;
        const motion=(1-Math.cos(phase*Math.PI*2))/2;
        const press=Math.max(0,Math.sin(phase*Math.PI*2))**2;
        moving.position.set(x+dx*(motion*2-1),y-dy*press,z);
      });
      // Each cart pauses beside a machine before advancing to the next bay.
      pallets.forEach((tray,i)=>{
        const u=(time*.035 +offset+i/3)%1;
        const section=u*(stops.length-1);
        const from=Math.floor(section);
        const travel=THREE.MathUtils.smoothstep(section%1,.22,.92);
        tray.position.x=THREE.MathUtils.lerp(stops[from],stops[from+1],travel);
        // Buffer the loop at feeder/discharge ends to conceal the transfer reset.
        tray.userData.onBelt=u>.007 && u<.992;
        tray.visible=route!==activeRoute&&tray.userData.onBelt;
      });
    }
  }
  update(0);
  return {root,update,picks,stations,setCutaway,setDetail,setActiveRoute,anchors:{
    vcsel:new THREE.Vector3(-4.42,2.5,2.13),
    cpo:new THREE.Vector3(4.65,2.45,-2.5),
  }};
}
