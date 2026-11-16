import * as THREE from 'three';

const parts = [
  { id: 'pcb', label: '载板与电接口' },
  { id: 'ic', label: '驱动器与 TIA' },
  { id: 'array', label: 'VCSEL 与 PIN 阵列' },
  { id: 'lens', label: '转向微光学块' },
  { id: 'fiber', label: '多模光纤与插芯' },
  { id: 'housing', label: '金属外壳' },
];

const steps = [
  { title: '载板定位', action: '吸嘴放下预装 DSP 的载板，露出光电器件的安装焊盘。', why: '金手指连接主机，板上的走线通往收发电路。', part: 'pcb', focus: [-0.12, 0.46, 0], frameWidth: 7.4 },
  { title: '贴装收发电路', action: '贴片头依次放下激光驱动器和跨阻放大器。', why: '驱动器控制发光，跨阻放大器放大接收端的微弱电流。', part: 'ic', focus: [0.02, 0.55, -0.1], frameWidth: 4.2 },
  { title: '贴装光电阵列', action: '分别贴装 VCSEL 发射阵列与 PIN 接收阵列，完成电连接。', why: '八路发射和八路接收并排布置，构成 SR8 的并行光接口。', part: 'array', focus: [0.65, 0.54, 0], frameWidth: 3.6 },
  { title: '对准微光学块', action: '将微光学块移到阵列上方，微调位置后固定。', why: '透镜与转向面把芯片上方的光路折向模块前端。', part: 'lens', focus: [0.93, 0.7, 0], frameWidth: 3.8 },
  { title: '对接多模光纤', action: '夹具沿光轴推入光纤组件，使纤芯与光学通道逐一对准。', why: '前端插芯把发射和接收通道引到可插拔的光接口。', part: 'fiber', focus: [2.02, 0.71, 0], frameWidth: 5.1 },
  { title: '装入模块外壳', action: '将装好的光引擎落入下壳，再合上带散热鳍片的上盖。', why: '外壳保护光路并传导热量，两端分别保留光口和电口。', part: 'housing', focus: [0.05, 0.73, 0], frameWidth: 7.4 },
];

const smooth = (v) => { const x = THREE.MathUtils.clamp(v, 0, 1); return x * x * (3 - 2 * x); };
const phase = (t, a, b) => smooth((t - a) / (b - a));

export function createVCSEL() {
  const root = new THREE.Group();
  root.name = '800G SR8 · VCSEL';
  const boardAssembly = new THREE.Group();
  root.add(boardAssembly);
  const box = new THREE.BoxGeometry(1, 1, 1);
  const cylinder = new THREE.CylinderGeometry(.5, .5, 1, 18);
  const dome = new THREE.SphereGeometry(.5, 16, 10);
  const toolTip = new THREE.CylinderGeometry(.5, .29, 1, 16);
  const bevel = new THREE.Shape();
  const cut = .07;
  bevel.moveTo(-.5 + cut, -.5);
  for (const [x,y] of [[.5-cut,-.5],[.5,-.5+cut],[.5,.5-cut],[.5-cut,.5],[-.5+cut,.5],[-.5,.5-cut],[-.5,-.5+cut]]) bevel.lineTo(x,y);
  bevel.closePath();
  const plate = new THREE.ExtrudeGeometry(bevel, { depth: 1, bevelEnabled: false, curveSegments: 1 });
  plate.rotateX(-Math.PI/2);
  plate.translate(0,-.5,0);

  const mat = (color,metalness=.1,roughness=.46) => new THREE.MeshStandardMaterial({color,metalness,roughness});
  const pcb = mat(0x18534b,.25), edge = mat(0x244b41,.25), mask = mat(0x438c72,.27);
  const gold = mat(0xe4b153,.65,.30), solder = mat(0xb7c3c0,.62);
  const silicon = mat(0x23313e,.34,.32), ceramic = mat(0x272723,.2), trace = mat(0x498276,.35);
  const ink = mat(0xe9eee7,0,.65), dark = mat(0x263642,.4);
  const aluminum = mat(0x97a9b0,.7,.34), bright = mat(0xd6e0de,.65,.29);
  const orange = mat(0xf5732a,.27), glass = mat(0x8ac6cb,.25,.23);
  const clear = new THREE.MeshStandardMaterial({color:0x9fdde2,metalness:.12,roughness:.2,transparent:true,opacity:.59,depthWrite:false});
  const rx = mat(0x4788a6,.4), tx = mat(0xae5351,.45);
  const cyan = mat(0x55bfc9,.25,.36), aqua = mat(0x8ecbc1,.28);
  const scratch = new THREE.Object3D(), batches = new Map();
  function piece(parent, id, name, x=0, y=0, z=0) {
    const g = new THREE.Group();
    g.name=name; g.userData.part=id;
    g.position.set(x,y,z); parent.add(g);
    g.userData.home=g.position.clone();
    return g;
  }
  function draw(g, geom, material, x,y,z,w,h,d,ax=0,ay=0,az=0) {
    if (!batches.has(g)) batches.set(g,new Map());
    const key=geom.uuid+material.uuid, bucket=batches.get(g);
    if (!bucket.has(key)) bucket.set(key,{geom,material,matrices:[]});
    scratch.position.set(x,y,z); scratch.rotation.set(ax,ay,az); scratch.scale.set(w,h,d);
    scratch.updateMatrix(); bucket.get(key).matrices.push(scratch.matrix.clone());
  }
  const slab=(g,m,x,y,z,w,h,d)=>draw(g,plate,m,x,y,z,w,h,d);
  const rect=(g,m,x,y,z,w,h,d)=>draw(g,box,m,x,y,z,w,h,d);
  const cyl=(g,m,x,y,z,w,h,d=w)=>draw(g,cylinder,m,x,y,z,w,h,d);
  const alongX=(g,m,x,y,z,len,diam)=>draw(g,cylinder,m,x,y,z,diam,len,diam,0,0,Math.PI/2);
  function label(g,caption,x,y,z,w,d,bg,fg, size=60) {
    // Ink is printed on the horizontal surface. Geometric detail remains available offscreen.
    if(typeof document==='undefined') return;
    const canvas=document.createElement('canvas'); canvas.width=512; canvas.height=128;
    const c=canvas.getContext('2d'); if(!c) return;
    c.fillStyle=bg; c.fillRect(0,0,512,128); c.fillStyle=fg;
    c.font='600 '+size+'px monospace'; c.textAlign='center'; c.textBaseline='middle';
    c.fillText(caption,256,64,494);
    const texture=new THREE.CanvasTexture(canvas); texture.colorSpace=THREE.SRGBColorSpace;
    const m=new THREE.MeshBasicMaterial({map:texture});
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,d),m);
    mesh.rotation.x=-Math.PI/2; mesh.position.set(x,y,z); mesh.userData.part=g.userData.part; g.add(mesh);
  }
  const board=piece(boardAssembly,'pcb','多层载板');
  slab(board,edge,-.17,.183,0,5.56,.105,2.03); slab(board,pcb,-.17,.256,0,5.56,.052,2.03);
  // Two ground-reference holes and via rows frame the copper routing.
  for(const x of [-2.39,1.97]) for(const z of [-.84,.84]){
    cyl(board,gold,x,.285,z,.13,.008); cyl(board,dark,x,.293,z,.064,.009);
  }
  for(let i=0;i<28;i++){
    const z=(i-13.5)*.064;
    rect(board,gold,-2.70,.287,z,.49,.012,.041);
    rect(board,mask,-2.25,.284,z,.34,.002,.014);
  }
  for(let i=0;i<8;i++)for(const side of [-1,1]){
    const z=side*(.23+i*.077);
    rect(board,trace,-1.93,.284,z,.29,.003,.017);
    draw(board,box,trace,-1.64,.284,z+side*.032,.31,.003,.017,0,-side*.2);
    rect(board,trace,-1.38,.284,z+side*.064,.23,.003,.017);
    rect(board,gold,.12,.286,z,.78,.009,.029);
    rect(board,gold,1.04,.286,z,.33,.009,.032);
  }
  for(let i=0;i<24;i++) for(const side of [-1,1])
    cyl(board,gold,-2.19+i*.17,.288,side*.944,.022,.010);
  slab(board,ceramic,-.94,.328,0,1.04,.09,1.04);
  slab(board,silicon,-.94,.386,0,.91,.035,.92);
  label(board,'PAM4  DSP',-.94,.405,0,.72,.22,'#273944','#c2ccc8');
  label(board,'SR8    REV A',-1.82,.288,-.82,.71,.17,'#23554a','#d6ddbf');
  for(let i=0;i<10;i++) for(const side of [-1,1]){
    const x=-2.1+i*.21,z=side*(.76+(i%2)*.07);
    rect(board,solder,x,.31,z,.122,.046,.065);
    rect(board,ceramic,x,.338,z,.068,.018,.067);
  }
  const ICs=[], arrays=[], bonds=[];
  for(const side of [-1,1]){
    const z=side*.455, driver=side<0;
    const ic=piece(boardAssembly,'ic',driver?'VCSEL 驱动器':'跨阻放大器',.03,.285,z);
    slab(ic,gold,0,.026,0,.74,.052,.73);
    slab(ic,silicon,0,.096,0,.69,.088,.69);
    label(ic,driver?'DRIVER':'TIA',0,.142,0,.52,.19,'#283642','#dfe8dc');
    for(let j=0;j<8;j++) for(const end of [-1,1])
      rect(ic,gold,end*.32,.142,(j-3.5)*.079,.026,.008,.038);
    ICs.push(ic);
    const a=piece(boardAssembly,'array',driver?'八路 VCSEL':'八路 PIN',.87,.285,z);
    rect(a,gold,0,.026,0,.29,.05,.80);
    rect(a,driver?tx:rx,0,.089,0,.25,.076,.77);
    for(let j=0;j<8;j++){
      const lane=(j-3.5)*.095;
      cyl(a,bright,.025,.135,lane,.073,.013);
      cyl(a,driver?tx:silicon,.025,.144,lane,.046,.009);
      rect(a,gold,-.091,.131,lane,.042,.008,.041);
    }
    arrays.push(a);
    const wire=piece(boardAssembly,'array','金丝互连',0,0,0);
    const positions=[];
    for(let j=0;j<8;j++){
      const z0=z+(j-3.5)*.079, z1=z+(j-3.5)*.095;
      for(let k=0;k<8;k++){
        for(const s of [k/8,(k+1)/8])
          positions.push(.35+.429*s,.429+.127*Math.sin(Math.PI*s)-.012*s,z0+(z1-z0)*s);
      }
    }
    const wireGeo=new THREE.BufferGeometry(); wireGeo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    const wires=new THREE.LineSegments(wireGeo,new THREE.LineBasicMaterial({color:0xdbb266}));
    wires.userData.part='array'; wire.add(wires); bonds.push(wire);
  }
  const lens=piece(boardAssembly,'lens','折转透镜块',.91,.285,0);
  for(const z of [-.923,.923]) {rect(lens,bright,.045,.158,z,.67,.314,.09);rect(lens,gold,.045,.326,z,.67,.022,.11);}
  rect(lens,clear,.055,.347,0,.65,.20,1.87);
  draw(lens,box,glass,.015,.36,0,.021,.18,1.75,0,0,-Math.PI/4);
  for(const side of [-1,1])for(let j=0;j<8;j++) {
    const z=side*.455+(j-3.5)*.095;
    draw(lens,dome,glass,-.015,.215,z,.105,.11,.089);
    draw(lens,dome,glass,.389,.342,z,.045,.083,.083);
  }
  const fiber=piece(boardAssembly,'fiber','双向多模光纤组件',1.32,.625,0);
  for(const side of [-1,1]) for(let j=0;j<8;j++) {
    const z=side*.455+(j-3.5)*.095;
    alongX(fiber,side>0?cyan:aqua,.525,0,z,1.05,.052);
  }
  rect(fiber,aluminum,.55,-.10,0,.20,.08,1.87);
  rect(fiber,dark,1.14,0,0,.36,.36,1.95);
  for(const z of [-.91,.91])alongX(fiber,bright,1.33,0,z,.26,.09);
  rect(fiber,ceramic,1.33,0,0,.08,.25,1.72);
  for(const side of [-1,1])for(let j=0;j<8;j++)
    alongX(fiber,glass,1.379,0,side*.455+(j-3.5)*.095,.02,.058);
  const tray=piece(root,'housing','金属下壳');
  slab(tray,aluminum,.12,.06,0,5.51,.12,2.30);
  for(const x of [-1.91,1.91]) for(const z of [-.75,.75])
    cyl(tray,dark,x,.12525,z,.21,.0105);
  for(const z of [-1.105,1.105]){
    rect(tray,bright,.12,.396,z,5.37,.56,.09);
    rect(tray,dark,-1.26,.376,z*1.052,1.63,.078,.018);
  }
  const lid=piece(root,'housing','散热上盖',.12,.91,0);
  slab(lid,bright,0,0,0,5.49,.109,2.29);
  for(const z of [-1.095,1.095]){
    rect(lid,aluminum,0,-.092,z,5.37,.18,.092);
    rect(lid,dark,1.72,-.25,z*1.046,.85,.105,.04);
  }
  // Longitudinal fins leave a recessed manufacturer marking on the connector side.
  for(let k=0;k<12;k++)rect(lid,aluminum,-.45,.128,(k-5.5)*.16,3.62,.19,.068);
  slab(lid,ink,1.91,.064,0,1.11,.016,1.61);
  label(lid,'800G',1.91,.076,-.25,.92,.32,'#e6eeeb','#2c4148',84);
  label(lid,'SR8  |  MMF',1.91,.076,.18,.94,.20,'#e6eeeb','#354d56');
  for(let i=0;i<15;i++)rect(lid,dark,1.48+.056*i,.077,.50,.018+(i%3)*.006,.006,.19);
  for(const x of [-2.49,2.48])for(const z of [-.96,.96]){
    cyl(lid,aluminum,x,.069,z,.125,.03);
    draw(lid,box,dark,x,.086,z,.076,.006,.013,0,.65);
  }
  // Latch loop remains clear of the optical connector face.
  for(const z of [-1.12,1.12])rect(tray,orange,2.69,.35,z,1.03,.12,.105);
  rect(tray,orange,3.15,.35,0,.14,.12,2.30);

  const head=piece(root,'','真空取放头');
  cyl(head,ceramic,0,.043,0,.126,.086);
  draw(head,toolTip,bright,0,.155,0,.19,.15,.19);
  cyl(head,dark,0,.29,0,.24,.14);
  cyl(head,aluminum,0,.424,0,.39,.16);
  cyl(head,orange,0,.483,0,.405,.057);
  slab(head,bright,0,.697,0,.42,.35,.40);
  for(const x of [-.13,.13]) cyl(head,dark,x,.98,0,.091,.24);

  const supports=piece(root,'','载板定位支撑');
  for(const x of [-1.91,1.91]) for(const z of [-.75,.75]){
    cyl(supports,aluminum,x,.04,z,.24,.08);
    cyl(supports,dark,x,.10525,z,.19,.0505);
  }
  // The input carrier supports the loose part until the vacuum head has made contact.
  const feeder = piece(root,'','供料托台');
  slab(feeder,aluminum,0,-.061,0,1,.122,1);
  slab(feeder,dark,0,-.137,0,.83,.036,.85);
  const feederWidth=[5.60,.77,.37,.78,1.42];
  const feederDepth=[2.04,.83,.89,2.02,2.03];
  const feederFloor=[.131,0,0,0,-.18];
  const feederCenter=[-.17,0,0,.05,.72];

  for(const [group, sets] of batches) for(const {geom,material,matrices} of sets.values()){
    const mesh=new THREE.InstancedMesh(geom,material,matrices.length);
    matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));
    mesh.instanceMatrix.needsUpdate=true;
    mesh.userData.part=group.userData.part;
    mesh.castShadow=!material.transparent && matrices.length<12;
    mesh.receiveShadow=!material.transparent;
    group.add(mesh);
  }

  // The cover has a second pickup head, allowing the carrier head to retract clear.
  const coverHead=head.clone(true);
  coverHead.name='上盖取放头';
  root.add(coverHead);
  const homes=[board,...ICs,...arrays,...bonds,lens,fiber,tray,lid];
  const byStep=[[board],ICs,arrays,[lens],[fiber],[tray,lid]];
  const top=[.352,.146,.157,.449,.187,0];
  function reset(group,visible) {
    group.position.copy(group.userData.home);
    group.visible=visible;
  }
  const h=new THREE.Vector3();
  // A part and its tooling are sampled from the same clock, so a seek or pause is exact.
  function place(target,index,t,hidden) {
    const home=target.userData.home;
    const approach=phase(t,.07,.26), transfer=phase(t,.32,.61), settle=phase(t,.61,.83);
    const peripheral=index===4;
    const wide=index===0;
    const originX=peripheral?.82:(wide?-.42:-.58);
    const originZ=peripheral?0:(wide?-.24:-.65);
    const originY=wide?.63:peripheral?.40:.85;
    const lift=wide?.11:peripheral?.06:.22;
    const motion=peripheral?phase(t,.34,.82):transfer;
    feeder.visible=t<.50&&!hidden.has(target.userData.part);
    feeder.position.set(home.x+originX+feederCenter[index],home.y+originY+feederFloor[index],
      home.z+originZ-3.45*phase(t,.31,.50));
    feeder.scale.set(feederWidth[index],1,feederDepth[index]);
    target.position.x+=originX*(1-motion);
    target.position.z+=originZ*(1-motion);
    target.position.y+=originY*(1-(peripheral?phase(t,.36,.63):settle))
      +lift*phase(t,.26,.36)*(1-settle);
    if(index===3){
      const scan=Math.sin(phase(t,.63,.82)*Math.PI*4);
      target.position.z+=.055*scan;
    }
    const gap=.40*(1-approach)+.61*phase(t,.84,.97);
    h.copy(target.position);
    if(index===0){h.x-=1.85;h.z+=.28;h.y-=.065;}
    if(index===4)h.x+=1.14;
    h.y+=top[index]+gap;
    head.position.copy(h);
    head.visible=t<.97&&!hidden.has(target.userData.part);
  }
  function update(stepIndex,t,explode=0,hidden=new Set()) {
    const i=Math.min(5,Math.max(0,stepIndex|0));
    t=THREE.MathUtils.clamp(t,0,1); explode=THREE.MathUtils.clamp(explode,0,1);
    boardAssembly.position.set(0,0,0); head.visible=false; feeder.visible=false; coverHead.visible=false;
    const supportHeight=i===5?1-phase(t,.11,.175):1;
    supports.scale.y=supportHeight;
    supports.visible=supportHeight>0&&explode===0&&!hidden.has('pcb');
    byStep.forEach((list,idx)=>list.forEach(g=>reset(g,idx<=i)));
    bonds.forEach(g=>reset(g,i>2));
    if(i<5){
      const seq=byStep[i], scaled=t*seq.length;
      const at=Math.min(seq.length-1,Math.floor(scaled)), local=scaled-at;
      seq.forEach((g,j)=>{g.visible=j<=at;});
      place(seq[at],i,local,hidden);
      if(i===2)bonds.forEach((g,j)=>{g.visible=j<at||(j===at&&local>.93);});
    } else {
      const lift=.84*phase(t,.07,.19)*(1-phase(t,.38,.59));
      boardAssembly.position.y=lift;
      tray.visible=t>.18; tray.position.z=-2.75*(1-phase(t,.18,.37));
      // Grip first, lift clear of the locating pins, then release after landing on the shell bosses.
      const boardGap=.42*(1-phase(t,0,.07))+1.28*phase(t,.59,.69);
      head.position.set(-1.85,.282+lift+boardGap,.28);
      head.visible=t<.69&&!hidden.has('pcb');
      lid.visible=t>.65;
      const lidDrop=1-phase(t,.79,.91);
      lid.position.y+=.97*lidDrop;
      lid.position.z-=2.58*(1-phase(t,.65,.79));
      coverHead.position.set(lid.position.x+.45,lid.position.y+.223+.64*phase(t,.92,.99),lid.position.z+.24);
      coverHead.visible=lid.visible&&t<.99&&!hidden.has('housing');
    }
    if(explode>0){
      head.visible=false; feeder.visible=false; coverHead.visible=false;
      board.position.y+=explode*.24;
      ICs.forEach(g=>{g.position.y+=explode*.65;});
      arrays.forEach(g=>{g.position.y+=explode*.80;});
      bonds.forEach(g=>{g.visible=false;});
      lens.position.y+=explode*1.28; fiber.position.y+=explode*.86;
      fiber.position.x+=explode*.48;
      lid.position.y+=explode*1.97;lid.position.z-=explode*1.7;
    }
    homes.forEach(g=>{if(hidden.has(g.userData.part))g.visible=false;});
  }
  update(0,0);
  return {root,steps,parts,update};
}
