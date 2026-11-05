const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../js/model.js'),S=require('../js/spatial.js'),L=require('../js/connections.js'),P=require('../js/project-file.js');
function fixture(){
 let state=S.upgrade(L.enableShared(M.empty()));state.site={width:100,depth:100};
 state.floors=[{id:'f',name:'층',x:10,z:0,rotation:0,width:20,depth:20,height:1,elevation:8}];
 state.equipment=[{...M.create('panel',state,-20,0),id:'a'},{...M.create('panel',state,2,3),id:'b',floorId:'f'},{...M.create('panel',state,-20,8),id:'c'},{...M.create('panel',state,5,-3),id:'d',floorId:'f'}];
 state=L.upgradePower(state);state=L.changePowerLink(state,'a','b');state=L.changePowerLink(state,'c','d');return M.validate(state);
}
const id=L.external.idFor('a','b'),other=L.external.idFor('c','d');
function valid(state){M.validate(state);const line=L.route(state,id);assert.equal(line.points.length-1,line.segmentColors.length);for(let i=1;i<line.points.length;i++)assert.ok(['x','y','z'].filter(k=>Math.abs(line.points[i][k]-line.points[i-1][k])>1e-6).length<=1);return line;}
test('외부 경로 XYZ 편집과 고정 끝점, 수직 선분 이동, 코너 추가',()=>{
 const state=fixture(),before=JSON.stringify(state),initial=valid(state);assert.ok(initial.points.some(p=>p.y>8));assert.equal(initial.manual,false);
 assert.throws(()=>L.movePoint(state,id,0,{x:9}),/고정점/);
 for(const axis of ['x','y','z']){
  const result=L.movePoint(state,id,1,{[axis]:initial.points[1][axis]+2}),line=valid(result.state);
  assert.equal(line.points[result.index][axis],initial.points[1][axis]+2);assert.deepEqual(line.points[0],initial.points[0]);assert.deepEqual(line.points.at(-1),initial.points.at(-1));
 }
 const vertical=initial.points.findIndex((p,i)=>initial.points[i+1]&&Math.abs(p.y-initial.points[i+1].y)>1e-6);
 for(const corner of [false,true]){const r=L.moveSegment(state,id,vertical,{x:initial.points[vertical].x+2,z:initial.points[vertical].z+1},{corner}),line=valid(r.state);assert.deepEqual(line.points[0],initial.points[0]);assert.deepEqual(line.points.at(-1),initial.points.at(-1));assert.ok(line.points.length>=initial.points.length);}
 assert.equal(JSON.stringify(state),before);
});
test('외부 색상·지름·포인트 편집, 최적화와 선택한 연결선만 복원',()=>{
 let state=fixture();state=L.setSegmentColor(state,other,0,L.palette[3][1]);const unrelated=JSON.stringify(L.route(state,other)),internal=JSON.stringify(L.routes(state));
 state=L.setStyle(state,id,{diameter:.6});let line=valid(state);assert.equal(line.diameter,.6);assert.equal(line.points[0].y,.38);
 const added=L.addPoint(state,id,0);state=added.state;const count=valid(state).points.length;
 state=L.setSegmentColor(state,id,0,L.palette[7][1]);state=L.optimize(state,id);assert.ok(valid(state).points.length<count);
 const add=L.addPoint(state,id,0);state=L.deletePoint(add.state,id,add.index);valid(state);
 state=L.resetScope(state,id);valid(state);assert.equal(L.route(state,id).diameter,.6);assert.equal(JSON.stringify(L.route(state,other)),unrelated);assert.equal(JSON.stringify(L.routes(state)),internal);
});
test('외부 편집은 저장·열기·실행 취소·취소를 지원하고 삭제된 관계만 정리한다',async()=>{
 const before=fixture(),history=new M.History(before),next=L.movePoint(before,id,1,{y:4}).state;
 history.preview(next);history.finishEdit(false);assert.deepEqual(history.current,before);
 history.preview(next);history.preview(L.setStyle(next,id,{diameter:.5}));history.finishEdit(true);assert.equal(history.past.length,1);history.undo();assert.deepEqual(history.current,before);history.redo();
 const encoded=await P.encode(history.current),decoded=await P.decode(encoded.bytes);assert.deepEqual(decoded.drawing.externalRoutes,history.current.externalRoutes);
 const detached=L.changePowerLink(history.current,'a','b',false);assert.deepEqual(M.validate(detached).externalRoutes,[]);
});
test('외부 경로 첫 편집 전 백업은 한 번만 저장하고 실패를 알린다',()=>{
 const before=fixture(),next=L.setStyle(before,id,{diameter:.4}),data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
 L.external.backupBeforeEdit(before,next,storage,'test');L.external.backupBeforeEdit(before,next,storage,'test');assert.equal(data.size,1);assert.deepEqual(JSON.parse([...data.values()][0]),before);
 assert.throws(()=>L.external.backupBeforeEdit(before,next,{getItem(){return null;},setItem(){throw Error('quota');}},'test'),/quota/);
});
test('외부 잘못된 좌표·대각선·색상은 거부, 끝점 이동은 다시 직각 연결',()=>{
 const state=L.setStyle(fixture(),id,{diameter:.4});for(const mutate of [s=>s.externalRoutes[0].points[1].x=NaN,s=>s.externalRoutes[0].segmentColors[0]='invalid',s=>s.externalRoutes[0].points[1].y+=1]){const bad=M.clone(state);mutate(bad);assert.throws(()=>M.validate(bad));}
 state.floors[0].elevation+=3;const line=valid(state);assert.equal(line.points.at(-1).y,11+.08+.08+.2);
});
