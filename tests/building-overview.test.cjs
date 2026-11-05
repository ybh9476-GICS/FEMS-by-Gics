const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const M=require('../js/model.js'),S=require('../js/spatial.js'),L=require('../js/connections.js');
const context={console,performance,FEMSModel:M,FEMSConnections:L};context.window=context;vm.createContext(context);
for(const file of ['vendor/three.js','js/equipment-3d.js','js/connection-view.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
const T=context.THREE;
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
test('층 외부 연결은 경계 3m 밖에서 끝나고 실제 전력 방향과 원본을 보존한다',()=>{
  const state=M.validate(L.changePowerLink(fixture(),'out','a')),before=JSON.stringify(state);
  const view=S.view(state,{floorId:'f1'}),routes=context.FEMSConnectionView.externalFloorRoutes(view);
  assert.equal(routes.length,2);
  for(const line of routes){
    const p=line.portal.point;near(Math.max(Math.abs(p.x)-view.site.width/2,Math.abs(p.z)-view.site.depth/2),3);
    const local=state.equipment.find(e=>e.id==='a'),end=line.parentId==='a'?line.points[0]:line.points.at(-1);
    near(end.x,local.x);near(end.z,local.z);assert.equal(line.readOnly,true);
    assert.ok(['out','cross'].includes(line.portal.targetId));assert.ok(line.portal.path.includes(state.equipment.find(e=>e.id===line.portal.targetId).name));
  }
  assert.equal(JSON.stringify(state),before);
  assert.equal(context.FEMSConnectionView.externalFloorRoutes(S.view(state)).length,0);
  assert.equal(context.FEMSConnectionView.externalFloorRoutes(S.view(state,{buildingId:'building'})).length,0);
  assert.equal(context.FEMSConnectionView.externalFloorRoutes({...view,hideConnections:true}).length,0);
});
test('다른 층·대지·다른 건물의 다중 연결 끝점을 분리하고 내부 연결은 계속 편집한다',()=>{
  let state=fixture();state.buildings.push({...state.buildings[0],id:'other-building'});state.floors.push({...state.floors[0],id:'other-floor',buildingId:'other-building'});
  state.equipment.push({...state.equipment[0],id:'remote',floorId:'other-floor',parentId:undefined});
  for(const [a,b] of [['out','a'],['remote','a']])state=L.changePowerLink(state,a,b);
  const display=S.view(state,{floorId:'f1'}),view=new context.FEMSConnectionView(new T.Scene());view.setState(display);
  const portals=view.lines.filter(l=>l.externalFloor);assert.equal(portals.length,3);
  assert.equal(new Set(portals.map(l=>JSON.stringify(l.portal.point))).size,3);
  assert.ok(view.lines.some(l=>!l.readOnly&&l.parentId==='a'));
  const camera=new T.OrthographicCamera(-30,30,30,-30,.1,300);camera.position.set(0,100,0);camera.up.set(0,0,-1);camera.lookAt(0,0,0);camera.updateMatrixWorld();
  view.update(camera,600,'plan',null,null);
  for(const line of portals){const p=view.project(line.portal.point,line,camera,{left:0,top:0,width:600,height:600});assert.equal(view.pick({clientX:p.x,clientY:p.y},camera,{left:0,top:0,width:600,height:600}),null);assert.ok(line.handles.every(h=>!h.dot.visible));}
  state=L.changePowerLink(state,'remote','a',false); // renderer can safely rebuild when document changes
  view.setState(S.view(state,{floorId:'f2'}));assert.ok(view.lines.filter(l=>l.portal).every(l=>l.portal.targetId!=='cross'));
});
function fixture(){
  const state=S.upgrade(L.enableShared(M.empty()));state.site={width:100,depth:100};
  state.buildings=[{id:'building',name:'건물',type:'asset-building',x:17,z:-12,rotation:37,width:30,depth:24,height:15}];
  state.floors=[{id:'f1',name:'1F',buildingId:'building',x:2,z:-1,rotation:15,width:20,depth:16,height:1,elevation:0},{id:'f2',name:'2F',buildingId:'building',x:-2,z:1,rotation:330,width:20,depth:16,height:.5,elevation:7}];
  const add=(id,floorId,x,z,parentId)=>state.equipment.push({...M.create('panel',state,x,z),id,...(floorId?{floorId}:{}),...(parentId?{parentId}:{}),rotation:20});
  add('a','f1',-3,0);add('b','f1',3,3,'a');add('c','f2',-3,0);add('d','f2',3,3,'c');add('out',null,-20,0);add('out-child',null,-15,5,'out');
  add('cross','f2',0,-3,'a');
  return M.validate(L.enableShared(state));
}
test('층 선택 화면의 내부 설비는 층·건물 회전과 높이를 반영하고 원본 배치를 보존한다',()=>{
  const state=fixture(),before=M.clone(state),view=S.view(state,{buildingId:'building'});
  for(const e of state.equipment.filter(e=>e.floorId)){
    const frame=S.worldFrame(state,e.floorId),floor=S.get(state,e.floorId),p=S.transform(e,frame),shown=view.equipment.find(v=>v.id===e.id);
    near(shown.x,p.x);near(shown.z,p.z);near(shown.y,frame.elevation+floor.height*.08);near(shown.rotation,(e.rotation+frame.rotation)%360);assert.equal(shown.noGizmo,true);
  }
  assert.deepEqual(view.equipment.find(e=>e.id==='out'),state.equipment.find(e=>e.id==='out'));
  assert.equal(view.equipment.filter(e=>e.floorSelector).length,2);assert.equal(view.equipment.find(e=>e.id==='building').buildingShell,true);
  const inside=S.view(state,{floorId:'f2'});assert.ok(inside.equipment.filter(e=>!e.backdrop).every(e=>e.floorId==='f2'&&!e.noGizmo));
  assert.equal(S.view(state).equipment.some(e=>e.id==='a'),false);assert.deepEqual(state,before);
});
test('층 선택 화면의 연결선은 각 층 좌표·높이로 표시하고 층간 연결과 편집 좌표를 섞지 않는다',()=>{
  const state=fixture(),before=M.clone(state),view=new context.FEMSConnectionView(new T.Scene());view.setState(S.view(state,{buildingId:'building'}));
  const original=L.routes(state);
  assert.ok(view.lines.some(l=>l.parentId==='a'));assert.ok(view.lines.some(l=>l.parentId==='c'));assert.ok(view.lines.some(l=>l.parentId==='out'));
  assert.equal(view.lines.filter(l=>l.crossSpace).length,1);
  for(const line of view.lines.filter(l=>!l.crossSpace)){
    const source=original.find(l=>l.id===line.id),parent=state.equipment.find(e=>e.id===line.parentId),frame=S.worldFrame(state,parent.floorId);
    if(!parent.floorId){assert.equal(line.readOnly,undefined);continue;}
    assert.equal(line.readOnly,true);near(line.height,frame.elevation+S.get(state,parent.floorId).height*.08+.08+line.diameter/2);
    source.points.forEach((p,i)=>{const world=S.transform(p,frame);near(line.points[i].x,world.x);near(line.points[i].z,world.z);});
    for(const mesh of line.segments)near(mesh.position.y,line.height);
  }
  const camera=new T.OrthographicCamera(-60,60,60,-60,.1,300);camera.position.set(0,100,0);camera.up.set(0,0,-1);camera.lookAt(0,0,0);camera.updateMatrixWorld();
  const line=view.lines.find(l=>l.parentId==='c'),rect={left:0,top:0,width:600,height:600},p=view.project(line.points[0],line,camera,rect);
  assert.equal(view.pick({clientX:p.x,clientY:p.y},camera,rect),null);
  view.setState(S.view(state,{floorId:'f2'}));assert.ok(view.lines.length);assert.ok(view.lines.filter(l=>!l.externalFloor).every(l=>!l.readOnly&&l.parentId==='c'));assert.ok(view.lines.filter(l=>l.externalFloor).every(l=>l.readOnly));
  for(const line of view.lines)near(line.height,.5*.08+.08+line.diameter/2);
  assert.deepEqual(state,before);
});
test('층간 연결은 보이는 두 설비를 외곽 수직 구간으로 연결하고 원본·층 내부 편집을 보존한다',()=>{
  const state=fixture(),before=M.clone(state),display=S.view(state,{buildingId:'building'}),view=new context.FEMSConnectionView(new T.Scene());view.setState(display);
  const line=view.lines.find(l=>l.crossSpace),a=display.equipment.find(e=>e.id==='a'),b=display.equipment.find(e=>e.id==='cross');
  assert.ok(!line.readOnly);assert.equal(line.childIds[0],'cross');
  for(const [point,e] of [[line.points[0],a],[line.points.at(-1),b]]){near(point.x,e.x);near(point.z,e.z);near(point.y,e.y+.08+line.diameter/2);}
  let vertical=0;
  for(let i=1;i<line.points.length;i++){
    const p=line.points[i-1],q=line.points[i],delta=[q.x-p.x,q.y-p.y,q.z-p.z];assert.equal(delta.filter(d=>Math.abs(d)>1e-6).length,1);
    const mesh=line.segments[i-1];near(mesh.geometry.parameters.height,Math.hypot(...delta));near(mesh.position.y,(p.y+q.y)/2);
    const ends=[new T.Vector3(0,-mesh.geometry.parameters.height/2,0),new T.Vector3(0,mesh.geometry.parameters.height/2,0)].map(v=>v.applyQuaternion(mesh.quaternion).add(mesh.position));
    for(const [end,point] of [[ends[0],p],[ends[1],q]]){near(end.x,point.x);near(end.y,point.y);near(end.z,point.z);}
    if(Math.abs(delta[1])>1e-6){vertical++;const box=display.focusBounds;assert.ok(Math.abs(p.x-box.x)>box.width/2||Math.abs(p.z-box.z)>box.depth/2);}
  }
  assert.equal(vertical,1);assert.deepEqual(state,before);
  for(const scoped of [S.view(state),S.view(state,{floorId:'f2'}),S.view(state,{buildingId:'building',preview:true})])assert.equal(context.FEMSConnectionView.crossSpaceRoutes(scoped).length,0);
  const moved=M.clone(state);moved.floors[1].elevation=10;view.setState(S.view(moved,{buildingId:'building'}));near(view.lines.find(l=>l.crossSpace).points.at(-1).y,10+.5*.08+.08+line.diameter/2);
});
test('대지와 층의 연결도 표시하며 숨겨진 다른 건물의 설비는 잘못된 위치에 그리지 않는다',()=>{
  let state=fixture();state.equipment.find(e=>e.id==='cross').parentId='out';state=L.enableShared(state);
  const view=S.view(state,{buildingId:'building'}),routes=context.FEMSConnectionView.crossSpaceRoutes(view);assert.equal(routes.length,1);assert.equal(routes[0].parentId,'out');near(routes[0].points[0].y,.08+routes[0].diameter/2);
  const hidden={...view,equipment:view.equipment.filter(e=>e.id!=='cross')};assert.equal(context.FEMSConnectionView.crossSpaceRoutes(hidden).length,0);
});
test('기본 층은 크기 범위 내 바닥·네 외벽·격자를 가지며 중앙 상부가 열려 있다',()=>{
  const model=context.FEMSEquipment.make('space-floor',null,{width:20,depth:16});model.scale.set(20,1,16);model.updateMatrixWorld(true);
  const bounds=new T.Box3().setFromObject(model),size=bounds.getSize(new T.Vector3());near(size.x,20);near(size.y,1);near(size.z,16);near(bounds.min.y,0);
  const meshes=[];let grid;model.traverse(o=>{if(o.isMesh)meshes.push(o);if(o.isLineSegments)grid=o;});assert.equal(meshes.length,5);assert.ok(grid.geometry.attributes.position.count>0);
  const ray=new T.Raycaster(new T.Vector3(0,10,0),new T.Vector3(0,-1,0));near(ray.intersectObjects(meshes)[0].point.y,.08);
  ray.ray.origin.set(9.99,10,0);near(ray.intersectObjects(meshes)[0].point.y,1);
  context.FEMSEquipment.dispose(model);
});
test('v4의 같은 설비로 들어가는 두 층간 연결은 서로 다른 선으로 표시된다',()=>{
  const state=M.validate(L.changePowerLink(fixture(),'out','cross')),before=M.clone(state),view=new context.FEMSConnectionView(new T.Scene());
  view.setState(S.view(state,{buildingId:'building'}));const lines=view.lines.filter(l=>l.crossSpace&&l.childIds.includes('cross'));
  assert.equal(lines.length,2);assert.notEqual(lines[0].id,lines[1].id);assert.deepEqual(new Set(lines.map(l=>l.parentId)),new Set(['a','out']));assert.deepEqual(state,before);
  view.setState(S.view(state,{floorId:'f2'}));assert.ok(view.lines.every(l=>!l.crossSpace));
});
