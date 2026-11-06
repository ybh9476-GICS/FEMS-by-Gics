const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../js/model.js'),L=require('../js/connections.js'),S=require('../js/spatial.js');
function fixture(){let state=M.demo();state.equipment[1].parentId=state.equipment[0].id;state.equipment[1].z=4;return M.validate(L.enableShared(state));}
test('수평·수직 정렬은 중심 좌표만 바꾸며 원본·미선택 설비·계층·연결 설정을 보존한다',()=>{
 for(const [direction,axis] of [['horizontal','z'],['vertical','x']]){
 const state=fixture(),before=M.clone(state),ids=state.equipment.slice(0,2).map(e=>e.id),expected=(state.equipment[0][axis]+state.equipment[1][axis])/2;
 const next=M.alignEquipment(state,ids,direction);
 for(let i=0;i<state.equipment.length;i++){const item=M.clone(state.equipment[i]);if(i<2)item[axis]=expected;assert.deepEqual(next.equipment[i],item);}
 assert.deepEqual(state,before);assert.deepEqual(next.networks,state.networks);
 const old=L.routes(state)[0],route=L.routes(next)[0];
 assert.ok(route.points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.z)));
 assert.notDeepEqual(route.points,old.points);
 assert.deepEqual(M.validate(JSON.parse(JSON.stringify(next))),next);
 const h=new M.History(state);h.commit(next);assert.equal(h.past.length,1);h.undo();assert.deepEqual(h.current,state);h.redo();assert.deepEqual(h.current,next);
 assert.equal(h.commit(M.alignEquipment(next,ids,direction)),false);
 }
});
test('회전한 큰 설비도 공간 경계를 넘지 않는 공통 좌표로 맞춘다',()=>{
 const s=M.empty();s.site={width:20,depth:20};s.equipment=[{...M.create('panel',s),id:'a',x:0,z:0,width:18,depth:2,rotation:90},{...M.create('panel',s),id:'b',x:4,z:9,width:1,depth:1}];
 const next=M.alignEquipment(M.validate(s),['a','b'],'horizontal');
 assert.ok(Math.abs(next.equipment[0].z-1)<1e-8);assert.equal(next.equipment[0].z,next.equipment[1].z);
});
test('층 로컬 좌표 정렬은 공간 소속·높이를 유지하고 다른 공간이나 잘못된 선택은 거부한다',()=>{
 const s=S.upgrade(fixture());s.floors=[{id:'f',name:'층',x:10,z:10,rotation:35,width:30,depth:20,height:1,elevation:7}];
 s.equipment[0].floorId='f';s.equipment[1].floorId='f';
 const state=M.validate(s),ids=state.equipment.slice(0,2).map(e=>e.id),next=M.alignEquipment(state,ids,'horizontal');
 assert.deepEqual(next.floors,state.floors);assert.ok(next.equipment.slice(0,2).every(e=>e.floorId==='f'&&e.z===-1));
 assert.throws(()=>M.alignEquipment(state,[ids[0],state.equipment[2].id],'horizontal'),/같은 공간/);
 assert.throws(()=>M.alignEquipment(state,[ids[0]],'horizontal'));
 assert.throws(()=>M.alignEquipment(state,[ids[0],'missing'],'vertical'));
 assert.throws(()=>M.alignEquipment(state,ids,'bad'));
});


test('정렬 후 fems 저장·불러오기는 좌표와 기본·추가 전력 연결을 보존한다',async()=>{
 const P=require('../js/project-file.js');let s=P.attach(L.upgradePower(fixture()),[]);
 s=L.changePowerLink(s,s.equipment[2].id,s.equipment[0].id);
 s=M.validate(s);const next=M.alignEquipment(s,s.equipment.slice(0,2).map(e=>e.id),'vertical');
 const packed=await P.encode(next,()=>{throw new Error('기본 설비만 사용');}),restored=(await P.decode(packed.bytes)).drawing;
 assert.deepEqual(restored.equipment,next.equipment);assert.deepEqual(restored.powerLinks,s.powerLinks);assert.deepEqual(restored.networks,s.networks);
});

