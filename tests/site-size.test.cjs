const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../js/model.js'),L=require('../js/connections.js');

test('100km 대지과 원점에서 먼 설비·연결선을 저장하고 다시 읽을 수 있다',()=>{
  let state=M.resizeSite(M.empty(),100000,100000);
  state.equipment.push(M.create('receiving',state,40000,40000));
  state.equipment.push(M.create('transformer',state,41000,41000));
  state=M.validate(L.enableShared(M.reparent(state,state.equipment[1].id,state.equipment[0].id)));
  assert.deepEqual(M.validate(JSON.parse(JSON.stringify(state))),state);
  assert.equal(state.equipment[0].x,40000);
  for(const width of [.1,20,200,1000,10000,100000]) {
    const site={width,depth:width},step=M.siteGridStep(site);
    assert.ok(width/step<=1000);assert.ok(Number.isFinite(step));
  }
});

test('대지 확대는 배치·연결선 정보를 보존하고 저장 및 실행 취소·다시 실행을 지원한다',()=>{
  const before=M.validate(L.enableShared(M.demo())),h=new M.History(before);
  const next=M.resizeSite(before,100.5,80);
  assert.deepEqual(next.equipment,before.equipment);assert.deepEqual(next.networks,before.networks);
  assert.deepEqual(before.site,{width:60,depth:40});
  h.commit(next);assert.deepEqual(M.validate(JSON.parse(JSON.stringify(h.current))),next);
  h.undo();assert.deepEqual(h.current,before);h.redo();assert.deepEqual(h.current,next);
});
test('범위 밖 및 유효하지 않은 크기는 거부하고 빈 대지은 최소 크기까지 축소한다',()=>{
  for(const value of [0,-1,100001,NaN,Infinity])assert.throws(()=>M.resizeSite(M.empty(),value,40),/대지 가로/);
  assert.throws(()=>M.resizeSite(M.empty(),60,0),/대지 세로/);
  assert.deepEqual(M.resizeSite(M.empty(),.1,.1).site,{width:.1,depth:.1});
});
test('회전된 설비 외곽이 잘리는 축소는 원본을 변경하지 않고 거부한다',()=>{
  const state=M.empty(),item=M.create('receiving',state,8,0);
  Object.assign(item,{width:6,depth:2,rotation:45});state.equipment.push(item);
  const original=M.clone(state);assert.throws(()=>M.resizeSite(state,20,20),/대지 밖/);
  assert.deepEqual(state,original);
});
test('설비가 안쪽이어도 바깥으로 우회하는 연결선이 잘리면 구형·공유 도면 모두 축소를 거부한다',()=>{
  let state=M.empty();state.equipment.push(M.create('receiving',state,0,0));
  state.equipment.push(M.create('transformer',state,5,0));
  state=M.reparent(state,state.equipment[1].id,state.equipment[0].id);
  state=L.storeRoute(state,state.equipment[1].id,[{x:0,z:0},{x:0,z:15},{x:5,z:15},{x:5,z:0}]);
  for(const version of [state,L.enableShared(state)]) {
    const original=M.clone(version);assert.throws(()=>M.resizeSite(version,20,20),/연결선/);
    assert.deepEqual(version,original);
  }
});
