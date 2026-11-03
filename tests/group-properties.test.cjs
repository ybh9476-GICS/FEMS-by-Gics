const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../js/model.js'),L=require('../js/connections.js');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function fixture(){const state=M.demo(),[a,b]=state.equipment;Object.assign(a,{x:-5,z:0,width:2,depth:4,height:6,rotation:0});Object.assign(b,{x:5,z:0,width:4,depth:2,height:2,rotation:0});return {state:M.validate(state),ids:[a.id,b.id]};}
test('그룹 중심과 크기는 선택 설비의 회전한 바닥 외곽과 최대 높이로 계산한다',()=>{
  const {state,ids}=fixture();assert.deepEqual(M.groupBounds(state,ids),{x:.5,z:0,rotation:0,width:13,depth:4,height:6});
  state.equipment[1].rotation=90;const bounds=M.groupBounds(state,ids);near(bounds.x,0);near(bounds.width,12);near(bounds.depth,4);near(bounds.height,6);
});
test('중심 X·Z 이동은 선택 설비만 같은 거리로 이동시키고 치수·각도·이름·계층을 보존한다',()=>{
  const {state,ids}=fixture(),frame=M.groupBounds(state,ids),result=M.transformGroup(state,ids,frame,'x',3);
  near(result.frame.x,3);for(let i=0;i<state.equipment.length;i++){const expected=M.clone(state.equipment[i]);if(ids.includes(expected.id))expected.x+=2.5;assert.deepEqual(result.state.equipment[i],expected);}
  const z=M.transformGroup(result.state,ids,result.frame,'z',-2);for(const id of ids)near(z.state.equipment.find(e=>e.id===id).z,-2);
  assert.equal(state.equipment[0].x,-5);
});
test('그룹 회전은 중심점과 상대 각도를 유지하며 기존 설비별 회전을 더하고 원위치 복귀가 가능하다',()=>{
  const {state,ids}=fixture();state.equipment[1].rotation=30;
  const frame=M.groupBounds(state,ids),result=M.transformGroup(state,ids,frame,'rotation',90);
  for(const id of ids){const old=state.equipment.find(e=>e.id===id),item=result.state.equipment.find(e=>e.id===id);near(item.x,frame.x);near(item.z,-(old.x-frame.x));near(item.rotation,old.rotation+90);}
  const bounds=M.groupBounds(result.state,ids,result.frame);near(bounds.width,frame.width);near(bounds.depth,frame.depth);
  const restored=M.transformGroup(result.state,ids,result.frame,'rotation',0);for(let i=0;i<2;i++){near(restored.state.equipment[i].x,state.equipment[i].x);near(restored.state.equipment[i].z,state.equipment[i].z);near(restored.state.equipment[i].rotation,state.equipment[i].rotation);}
});
test('가로·세로·높이 어느 크기를 바꿔도 중심으로부터 거리와 모든 설비 치수가 같은 비율로 변한다',()=>{
  for(const field of ['width','depth','height']){const {state,ids}=fixture(),frame=M.groupBounds(state,ids),result=M.transformGroup(state,ids,frame,field,frame[field]*1.2);
    for(const id of ids){const old=state.equipment.find(e=>e.id===id),item=result.state.equipment.find(e=>e.id===id);near(item.x-frame.x,(old.x-frame.x)*1.2);near(item.z-frame.z,(old.z-frame.z)*1.2);for(const dimension of ['width','depth','height'])near(item[dimension],old[dimension]*1.2);}
    const bounds=M.groupBounds(result.state,ids,result.frame);near(bounds.width,frame.width*1.2);near(bounds.depth,frame.depth*1.2);near(bounds.height,frame.height*1.2);
    assert.deepEqual(result.state.equipment.slice(2),state.equipment.slice(2));
  }
});
test('그룹 변환의 잘못된 값·치수 한도·부지 경계 초과는 전체 변경을 거부하고 연속 입력은 하나의 실행 취소로 복원한다',()=>{
  const {state,ids}=fixture(),frame=M.groupBounds(state,ids),h=new M.History(state);
  for(const [field,value] of [['x',100],['width',1000],['height',.01],['rotation',NaN],['rotation',360],['depth',0]])assert.throws(()=>M.transformGroup(state,ids,frame,field,value));
  assert.deepEqual(M.transformGroup(state,ids,frame,'width',frame.width).state,state);
  h.preview(M.transformGroup(state,ids,frame,'width',14).state);h.preview(M.transformGroup(state,ids,frame,'width',15).state);h.finishEdit();assert.equal(h.past.length,1);h.undo();assert.deepEqual(h.current,state);h.redo();near(M.groupBounds(h.current,ids).width,15);
  h.preview(M.transformGroup(h.current,ids,M.groupBounds(h.current,ids),'x',2).state);h.finishEdit(false);near(M.groupBounds(h.current,ids).x,.5);
});
test('공유 연결선은 설비 접속점을 따라가고 수동 분기점과 선택하지 않은 설비는 유지한다',()=>{
  const {state,ids}=fixture();state.equipment[1].parentId=ids[0];const shared=M.validate(L.enableShared(state)),before=L.routes(shared)[0];
  const result=M.transformGroup(shared,ids,M.groupBounds(shared,ids),'x',2.5),line=L.routes(result.state)[0];
  near(line.points[0].x,before.points[0].x+2);near(line.points.at(-1).x,before.points.at(-1).x+2);assert.deepEqual(result.state.networks,shared.networks);
});
test('부모·자식을 함께 삭제해도 미선택 하위는 가장 가까운 남은 상위로 연결되고 한 번에 복원된다',()=>{
  let {state}=fixture();const [a,b,c,d]=state.equipment;b.parentId=a.id;c.parentId=b.id;d.parentId=c.id;state=M.validate(L.enableShared(state));const h=new M.History(state);
  const next=M.removeEquipmentGroup(state,[c.id,b.id]);assert.equal(next.equipment.length,state.equipment.length-2);assert.equal(next.equipment.find(e=>e.id===d.id).parentId,a.id);assert.deepEqual(next.equipment.find(e=>e.id===a.id),state.equipment[0]);
  h.commit(next);h.undo();assert.deepEqual(h.current,state);h.redo();assert.deepEqual(h.current,next);
  const roots=M.removeEquipmentGroup(state,[a.id,b.id]);assert.equal(roots.equipment.find(e=>e.id===c.id).parentId,undefined);M.validate(roots);
});
