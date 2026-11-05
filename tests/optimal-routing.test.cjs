const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const M=require('../js/model.js'),L=require('../js/connections.js'),R=require('../js/optimal-routing.js'),P=require('../js/project-file.js');
function fixture(positions=[['source',0,-12],['a',0,5],['b',0,12],['c',6,5]]){
 const state=L.upgradePower(M.empty());state.site={width:80,depth:80};
 for(const [id,x,z] of positions)state.equipment.push({...M.create('panel',state,x,z),id,name:id,width:2,depth:2});
 state.powerLinks=positions.slice(1).map(([to])=>({from:'source',to}));return M.validate(L.reconcileNetworks(state));
}
const segments=state=>L.routes(state).flatMap(r=>r.points.slice(1).map((b,i)=>({a:r.points[i],b,route:r}))).filter(s=>Math.hypot(s.a.x-s.b.x,s.a.z-s.b.z)>1e-6);
function noOverlap(state,parent='source'){
 const lines=segments(state).filter(s=>s.route.parentId===parent);
 for(let i=0;i<lines.length;i++)for(let j=i+1;j<lines.length;j++){
  const p=lines[i],q=lines[j];
  for(const [axis,other] of [['x','z'],['z','x']])if(Math.abs(p.a[axis]-p.b[axis])<1e-6&&Math.abs(q.a[axis]-q.b[axis])<1e-6&&Math.abs(p.a[axis]-q.a[axis])<1e-6){
   const overlap=Math.min(Math.max(p.a[other],p.b[other]),Math.max(q.a[other],q.b[other]))-Math.max(Math.min(p.a[other],p.b[other]),Math.min(q.a[other],q.b[other]));assert.ok(overlap<1e-6,'중복/역방향 구간: '+JSON.stringify([p,q]));
  }
 }
}
function noThroughEquipment(state){
 for(const s of segments(state))for(const item of state.equipment){
  const endpoints=s.route.pointKinds,first=s.route.points[0],last=s.route.points.at(-1);
  if((endpoints[0]==='equipment'&&Math.hypot(first.x-item.x,first.z-item.z)<1e-6)||(endpoints.at(-1)==='equipment'&&Math.hypot(last.x-item.x,last.z-item.z)<1e-6))continue;
  assert.equal(R.intersects(s.a,s.b,R.box(item,.2)),false,'다른 설비 관통: '+item.id);
 }
}
test('일직선 하위 설비를 관통하지 않고 설비 바깥 분기에서 세 독립 단자로 연결한다',()=>{
 const state=fixture(),before=M.clone(state),next=L.resetScope(state,L.routes(state)[0].id);
 assert.deepEqual(state,before);assert.deepEqual(next.equipment,state.equipment);assert.deepEqual(next.powerLinks,state.powerLinks);assert.deepEqual(M.validate(next),next);
 noOverlap(next);noThroughEquipment(next);
 const net=next.networks[0];assert.ok(net.nodes.some(n=>!n.equipmentId));
 for(const n of net.nodes.filter(n=>n.equipmentId&&n.id!==net.root))assert.ok(!net.edges.some(e=>e.from===n.id));
 for(const n of net.nodes.filter(n=>!n.equipmentId))for(const item of state.equipment)assert.equal(R.intersects(n,{x:n.x+.00001,z:n.z},R.box(item,.2)),false);
 assert.deepEqual(L.resetScope(next,L.routes(next)[0].id),next);
});
test('GRID의 세 가지를 되돌아 겹치는 기존 경로와 무관하게 일방향 분기로 재구성한다',()=>{
 let state=fixture([['source',-15,-10],['a',10,0],['b',-8,10],['c',15,15]]);
 for(const line of L.routes(state)){const a=line.points[0],b=line.points.at(-1),points=L.orthogonal([a,{x:20,z:a.z},{x:-10,z:a.z},b],null,true);state=L.storeRoute(state,line.id,points,points.slice(1).map(()=>line.color));}
 const next=L.resetScope(state,L.routes(state)[0].id);noOverlap(next);noThroughEquipment(next);assert.deepEqual(next.powerLinks,state.powerLinks);
});
test('회전한 장애물·건물 및 다른 회로를 우회하고 다른 연결망은 그대로 보존한다',()=>{
 let state=fixture([['source',-15,0],['a',15,0]]);
 for(const [id,x,z] of [['obstacle',0,0],['other',5,-8],['end',5,8]])state.equipment.push({...M.create('panel',state,x,z),id,name:id,width:id==='obstacle'?7:2,depth:3,rotation:45});
 state.powerLinks.push({from:'other',to:'end'});state=L.reconcileNetworks(state);
 const previous=M.clone(state.networks.find(n=>n.parentId==='other')),next=L.resetScope(state,L.routes(state).find(r=>r.parentId==='source').id);
 assert.deepEqual(next.networks.find(n=>n.parentId==='other'),previous);noThroughEquipment(next);noOverlap(next);
 const own=segments(next).filter(s=>s.route.parentId==='source'),other=segments(next).filter(s=>s.route.parentId==='other');
 for(const p of own)for(const q of other){const r={left:Math.min(q.a.x,q.b.x)-.15,right:Math.max(q.a.x,q.b.x)+.15,top:Math.min(q.a.z,q.b.z)-.15,bottom:Math.max(q.a.z,q.b.z)+.15};assert.equal(R.intersects(p.a,p.b,r),false);}
 const withBuilding=M.clone(state);withBuilding.buildings=[{id:'building',x:-7,z:0,width:3,depth:15,height:10,rotation:20}];
 const around=L.resetScope(withBuilding,L.routes(state)[0].id),building=R.box(withBuilding.buildings[0],.2);
 for(const s of segments(around).filter(s=>s.route.parentId==='source'))assert.equal(R.intersects(s.a,s.b,building),false);
});
test('다색·다른 지름의 구간은 새 길이에 비례해 보존하고 실행 취소·fems 왕복이 가능하다',async()=>{
 let state=fixture([['source',-10,0],['a',10,0]]),line=L.routes(state)[0];
 state=L.storeRoute(state,line.id,[{x:-10,z:0},{x:-5,z:0},{x:-5,z:10},{x:10,z:10},{x:10,z:0}],['#2563eb','#dc2626','#dc2626','#eab308']);state=L.setStyle(state,line.id,{diameter:.5});
 const h=new M.History(state),next=L.resetScope(state,line.id);h.commit(next);
 const colors=L.routes(next).flatMap(r=>r.segmentColors);assert.deepEqual([...new Set(colors)],['#2563eb','#dc2626','#eab308']);assert.ok(L.routes(next).every(r=>r.diameter===.5));
 const packed=await P.encode(next),decoded=await P.decode(packed.bytes);assert.deepEqual(decoded.drawing.networks,next.networks);assert.deepEqual(decoded.drawing.powerLinks,next.powerLinks);assert.deepEqual(decoded.drawing.equipment,next.equipment);
 h.undo();assert.deepEqual(h.current,state);h.redo();assert.deepEqual(h.current,next);
});
test('동일 좌표의 다른 층 설비는 장애물이 아니며 층간 연결 경로는 보존한다',()=>{
 let state=fixture();state.floors=[{id:'floor',width:40,depth:40}];state.equipment.push({...M.create('panel',state,0,0),id:'foreign',name:'foreign',floorId:'floor',width:35,depth:35});state.powerLinks.push({from:'source',to:'foreign'});state=L.reconcileNetworks(state);
 const old=L.routes(state).filter(r=>r.childIds.includes('foreign')),next=L.resetScope(state,L.routes(state).find(r=>r.childIds.includes('a')).id);
 assert.deepEqual(next.powerLinks,state.powerLinks);assert.deepEqual(next.equipment,state.equipment);
 const path=lines=>lines.flatMap((r,i)=>r.points.slice(i?1:0));assert.deepEqual(path(L.routes(next).filter(r=>r.childIds.includes('foreign'))),path(old));
});
test('공간이 막혀 계산 실패하면 원본과 실행 취소 기록을 변경하지 않는다',()=>{
 const state=fixture([['source',-10,0],['a',10,0]]);state.site.depth=30;state.equipment.push({...M.create('panel',state,0,0),id:'wall',name:'wall',width:10,depth:30});const before=M.clone(state),h=new M.History(state);
 assert.throws(()=>h.commit(L.resetScope(state,L.routes(state)[0].id)),/공간이 부족/);assert.deepEqual(state,before);assert.equal(h.past.length,0);
});
test('연결점 없는 교차는 틈으로 표시하고 실제 분기점과 다른 층은 끊지 않는다',()=>{
 const context={FEMSConnections:L,performance:{now:()=>1000}};context.window=context;vm.createContext(context);
 for(const f of ['vendor/three.js','js/connection-view.js'])vm.runInContext(fs.readFileSync(f,'utf8'),context);
 const a={parentId:'a',points:[{x:-5,z:0},{x:5,z:0}],diameter:.2},b={parentId:'b',points:[{x:0,z:-5},{x:0,z:5}],diameter:.3};
 const View=context.FEMSConnectionView,gaps=View.crossingGaps([a,b]);assert.equal(gaps.size,1);assert.ok(gaps.get('1:0')[0][0]<.5&&gaps.get('1:0')[0][1]>.5);
 assert.equal(View.crossingGaps([a,{...b,parentId:'a'}]).size,1);
 assert.equal(View.crossingGaps([a,{...b,parentId:'a',points:[{x:0,z:0},{x:0,z:5}]}]).size,0);assert.equal(View.crossingGaps([a,{...b,elevation:3}]).size,0);
 let state=fixture([['source',-8,0],['a',8,0]]);
 for(const [id,z] of [['other',-8],['end',8]])state.equipment.push({...M.create('panel',state,0,z),id,name:id});
 state.powerLinks.push({from:'other',to:'end'});state=L.reconcileNetworks(state);const before=M.clone(state),view=new View(new context.THREE.Scene());view.setState(state);
 const cut=view.lines.find(l=>l.parentId==='other');assert.equal(cut.segments.length,2);assert.ok(cut.segments.every(m=>m.userData.segmentIndex===0));assert.deepEqual(state,before);
 const camera=new context.THREE.OrthographicCamera(-20,20,20,-20,.1,200);camera.position.set(0,100,0);camera.up.set(0,0,-1);camera.lookAt(0,0,0);camera.updateMatrixWorld();
 view.update(camera,400,'plan',false,{id:cut.id,kind:'segment',index:0});assert.equal(view.selectedSegment.children[0].scale.y,16);view.clear();assert.equal(view.lines.length,0);
});
test('실제 컨트롤러는 v4 분기 재구성 후 유효한 구간을 선택하고 취소·실행 취소를 보존한다',()=>{
 const state=fixture(),h=new M.History(state),elements=new Map();
 const element=()=>({children:[],dataset:{},style:{setProperty(){}},listeners:{},addEventListener(n,fn){this.listeners[n]=fn;},setAttribute(){},removeAttribute(){},append(e){this.children.push(e);},showModal(){}});
 const document={body:{dataset:{}},createElement:element,getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);}};
 const context={FEMSConnections:L,document,addEventListener(){}};context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync('js/connection-editor.js','utf8'),context);
 const editor=new context.FEMSConnectionEditor({state:()=>h.current,commit:s=>h.commit(s),preview:s=>h.preview(s),finish:ok=>h.finishEdit(ok),guides(){}}),id=L.routes(state).at(-1).id;
 editor.select({id,kind:'segment',index:0});editor.render('plan');elements.get('connection-reset').listeners.click();
 const dialog=elements.get('connection-reset-dialog');dialog.returnValue='cancel';dialog.listeners.close();assert.deepEqual(h.current,state);
 elements.get('connection-reset').listeners.click();dialog.returnValue='restore';dialog.listeners.close();assert.ok(L.route(h.current,editor.selection.id));assert.equal(h.past.length,1);noOverlap(h.current);h.undo();assert.deepEqual(h.current,state);
});
