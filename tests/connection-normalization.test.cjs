const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../js/model.js'),L=require('../js/connections.js'),S=require('../js/spatial.js'),P=require('../js/project-file.js');
const blue='#2563eb',red='#dc2626';
function fixture(shared=true){
  let state=M.empty();
  for(const [x,z] of [[-10,10],[0,0],[10,10]])state.equipment.push(M.create('receiving',state,x,z));
  const [a,b,c]=state.equipment;
  state=M.reparent(M.reparent(state,b.id,a.id),c.id,b.id);
  state=L.storeRoute(state,c.id,[{x:0,z:0},{x:2,z:0},{x:2,z:10},{x:10,z:10}]);
  if(shared)state=M.validate(L.upgradePower(L.enableShared(state)));
  const id=L.routes(state).find(r=>r.parentId===b.id).id;
  return {state,id,a:a.id,b:b.id,c:c.id};
}
function move(state,id,x,z){const next=M.clone(state);Object.assign(next.equipment.find(e=>e.id===id),{x,z});return M.validate(L.followEquipment(state,next));}
function orthogonal(line,axes=['x','z']){
  assert.equal(line.segmentColors.length,line.points.length-1);
  for(let i=1;i<line.points.length;i++)assert.ok(axes.filter(k=>Math.abs(line.points[i][k]-line.points[i-1][k])>1e-6).length<=1);
}
test('이미지 재현: 선분 스냅으로 끝점과 겹친 기존 코너를 제거하고 반복 설비 이동은 ㄱ자를 유지한다',()=>{
  for(const shared of [false,true]){
    let {state,id,c}=fixture(shared);const original=M.clone(state),line=L.route(state,id);
    const snapped=L.snapPosition(line.points,[1,2],{x:9.9,z:5},.3,{},['x']);
    const result=L.moveSegment(state,id,1,snapped.position);assert.deepEqual(result.generated,[]);
    state=L.finishMove(result,id,'segment').state;
    assert.deepEqual(L.route(state,id).points,[{x:0,z:0},{x:10,z:0},{x:10,z:10}]);
    for(let i=0;i<10;i++)for(const [x,z] of [[14,15],[5,4],[-5,10],[10,-5],[10,10]]){
      state=move(state,c,x,z);const line=L.route(state,id);orthogonal(line);
      assert.deepEqual(line.points,[{x:0,z:0},{x,z:0},{x,z}]);
    }
    assert.deepEqual(L.route(original,id).points,line.points);
  }
});
test('시작 설비 이동도 인접 코너를 따라가고 다른 연결망과 입력 원본은 보존한다',()=>{
  let {state,id,b}=fixture();state=L.finishMove(L.moveSegment(state,id,1,{x:10}),id,'segment').state;
  const before=M.clone(state),next=move(state,b,3,-4);
  assert.deepEqual(L.route(next,id).points,[{x:3,z:-4},{x:10,z:-4},{x:10,z:10}]);assert.deepEqual(state,before);
});
test('색상 경계와 되꺾임은 유지하고 길이 없는 선분의 색상만 버린다',()=>{
  const points=[{x:0,z:0},{x:0,z:0},{x:4,z:0},{x:8,z:0},{x:8,z:0}];
  const clean=L.compactPath(points,[red,blue,red,blue]);
  assert.deepEqual(clean.points,[points[0],points[2],points[4]]);assert.deepEqual(clean.segmentColors,[blue,red]);
  const reversal=[{x:0,z:0},{x:5,z:0},{x:2,z:0}];assert.deepEqual(L.compactPath(reversal,[blue,blue]).points,reversal);
  const coincident=L.compactPath(Array.from({length:5},()=>({x:0,z:0})),Array(4).fill(blue));assert.equal(coincident.points.length,2);
});
test('색상 경계가 있는 직선의 설비를 대각선으로 옮겨도 계단이 생기지 않는다',()=>{
  const source=[{x:0,z:0},{x:0,z:5},{x:0,z:10}];
  const moved=L.followPath(source,[red,blue],source[0],{x:5,z:15}),clean=L.compactPath(moved.points,moved.segmentColors);
  orthogonal(clean);assert.deepEqual(clean.segmentColors,[red,blue,blue]);
  assert.deepEqual(clean.points,[{x:0,z:0},{x:0,z:10},{x:0,z:15},{x:5,z:15}]);
});
test('멀리 있는 코너·다른 가지·분기점 ID를 보존하고 끝부분만 조정한다',()=>{
  let state=M.demo();const [parent,a,b]=state.equipment;
  Object.assign(parent,{x:-15,z:0});Object.assign(a,{x:0,z:-10});Object.assign(b,{x:12,z:10});
  state=M.reparent(M.reparent(state,a.id,parent.id),b.id,parent.id);
  state=L.storeRoute(state,a.id,[{x:-15,z:0},{x:0,z:0},{x:0,z:-10}]);
  state=L.storeRoute(state,b.id,[{x:-15,z:0},{x:0,z:0},{x:5,z:0},{x:5,z:10},{x:12,z:10}]);
  state=M.validate(L.upgradePower(L.enableShared(state)));
  const branch=L.routes(state).find(r=>r.childIds.length===1&&r.childIds[0]===b.id),next=move(state,b.id,15,12);
  assert.deepEqual(next.networks[0].nodes,state.networks[0].nodes);
  for(const line of L.routes(state).filter(r=>r.id!==branch.id))assert.deepEqual(L.route(next,line.id),line);
  assert.deepEqual(L.route(next,branch.id).points,[{x:0,z:0},{x:5,z:0},{x:5,z:12},{x:15,z:12}]);
  const ids=state.equipment.map(e=>e.id),frame=M.groupBounds(state,ids),together=M.transformGroup(state,ids,frame,'x',frame.x+1).state;
  for(const line of L.routes(state))assert.deepEqual(L.route(together,line.id).points,line.points.map(p=>({...p,x:p.x+1})));
});
test('이동·자동 정리는 단일 실행 취소로 복원되고 원위치 복귀·Esc·파일 저장을 보존한다',async()=>{
  let {state,id,c}=fixture();state=L.finishMove(L.moveSegment(state,id,1,{x:10}),id,'segment').state;
  const h=new M.History(state),next=move(state,c,15,14);
  h.preview(next);h.preview(move(state,c,0,10));h.preview(move(state,c,10,10));h.finishEdit();assert.equal(h.past.length,0);assert.deepEqual(h.current,state);
  h.preview(next);h.finishEdit(false);assert.deepEqual(h.current,state);
  h.preview(next);h.finishEdit();assert.equal(h.past.length,1);h.undo();assert.deepEqual(h.current,state);h.redo();assert.deepEqual(h.current,next);
  const decoded=await P.decode((await P.encode(next)).bytes);assert.deepEqual(L.route(decoded.drawing,id),L.route(next,id));
});
test('일반 읽기·검증·이름 변경은 저장된 기존 포인트를 자동 변경하지 않는다',()=>{
  const {state}=fixture(),before=JSON.stringify(state),next=M.clone(state);next.equipment[2].name='이름 변경';
  assert.deepEqual(L.followEquipment(state,next).networks,state.networks);M.validate(state);L.routes(state);assert.equal(JSON.stringify(state),before);
});
test('층 외부·3차원 외부 편집의 직선점도 정리하고 설비 이동 후 색상·끝점을 보존한다',()=>{
  let state=S.upgrade(L.enableShared(M.empty()));state.site={width:100,depth:100};
  state.floors=[{id:'f',name:'층',x:0,z:0,rotation:0,width:20,depth:20,height:1,elevation:8}];
  state.equipment=[{...M.create('panel',state,-20,0),id:'a'},{...M.create('panel',state,2,3),id:'b',floorId:'f'}];
  state=L.changePowerLink(L.upgradePower(state),'a','b');
  for(const id of [L.external.idFor('a','b'),L.floor.idFor('a','b','f')]){
    const original=L.route(state,id),added=L.addPoint(state,id,0),cleaned=L.finishMove(added,id),line=L.route(cleaned.state,id);
    assert.deepEqual(line.points,original.points);assert.equal(cleaned.kind,'segment');
    const colored=L.setSegmentColor(added.state,id,0,red),moved=move(colored,'b',5,6),after=L.route(moved,id);
    orthogonal(after,id.startsWith('space:')?['x','y','z']:['x','z']);assert.ok(after.segmentColors.includes(red));
    assert.deepEqual(after.points.at(-1),L.route({...moved,externalRoutes:[],floorRoutes:[]},id).points.at(-1));
    assert.deepEqual(M.validate(moved),moved);
  }
});
