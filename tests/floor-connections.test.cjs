const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../js/model'),S=require('../js/spatial'),L=require('../js/connections'),P=require('../js/project-file');
function fixture(){let s=S.upgrade(L.enableShared(M.empty()));s.site={width:100,depth:100};s.floors=[{id:'f',name:'1F',x:10,z:5,rotation:30,width:20,depth:16,height:.2,elevation:3},{id:'roof',name:'옥상',x:10,z:5,rotation:30,width:20,depth:16,height:.2,elevation:9}];s.equipment=[{...M.create('panel',s,-20,0),id:'out'},{...M.create('panel',s,-4,0),id:'a',floorId:'f'},{...M.create('panel',s,4,4),id:'b',floorId:'f'},{...M.create('panel',s,2,2),id:'r',floorId:'roof'}];s=L.upgradePower(s);for(const [a,b] of [['out','a'],['a','b'],['a','r']])s=L.changePowerLink(s,a,b);return M.validate(s);}
const id=L.floor.idFor('out','a','f'),up=L.floor.idFor('a','r','f'),down=L.floor.idFor('a','r','roof');
function orthogonal(line){for(let i=1;i<line.points.length;i++)assert.ok(Math.abs(line.points[i].x-line.points[i-1].x)<1e-6||Math.abs(line.points[i].z-line.points[i-1].z)<1e-6);assert.equal(line.segmentColors.length,line.points.length-1);}
test('층 내부 외부선은 로컬 좌표·전력 방향·이름표를 보존하고 다른 경로와 독립적으로 편집한다',()=>{
 const s=fixture(),original=JSON.stringify(s),line=L.route(s,id),networks=JSON.stringify(s.networks),world=JSON.stringify(L.route(s,L.external.idFor('out','a')));
 assert.equal(line.externalFloor,true);assert.equal(line.readOnly,undefined);assert.deepEqual(line.points.at(-1),{x:-4,z:0});assert.equal(Math.max(Math.abs(line.portal.point.x)-10,Math.abs(line.portal.point.z)-8),3);
 const r=L.moveSegment(s,id,0,{x:-8,z:2},{corner:true}),next=M.validate(r.state),edited=L.route(next,id);orthogonal(edited);assert.ok(edited.points.length>line.points.length);assert.deepEqual(edited.points[0],line.points[0]);assert.deepEqual(edited.points.at(-1),line.points.at(-1));assert.equal(JSON.stringify(next.networks),networks);assert.equal(JSON.stringify(L.route(next,L.external.idFor('out','a'))),world);assert.equal(JSON.stringify(s),original);
 assert.throws(()=>L.movePoint(next,id,edited.points.length-1,{x:1,z:1}));
});
test('층별 색상·포인트 삭제·최적화·복원은 선택 층과 연결선에만 적용한다',()=>{
 let s=fixture();s=L.setSegmentColor(s,down,0,L.palette[3][1]);s=L.setSegmentColor(s,up,0,L.palette[7][1]);const other=JSON.stringify(L.route(s,down));
 const added=L.addPoint(s,up,0);s=L.setSegmentColor(added.state,up,0,L.palette[1][1]);const count=L.route(s,up).points.length;s=L.optimize(s,up);assert.ok(L.route(s,up).points.length<count);
 const p=L.addPoint(s,up,0);s=L.deletePoint(p.state,up,p.index);orthogonal(L.route(s,up));s=L.resetScope(s,up);assert.equal(L.route(s,up).manual,undefined);assert.equal(JSON.stringify(L.route(s,down)),other);
});
test('지름은 동일 외부 연결선 양쪽 층·3D에 공통 적용하고 층별 경로 색상은 유지한다',()=>{
 let s=fixture();s=L.setSegmentColor(s,up,0,L.palette[7][1]);const before=L.route(s,up);s=L.setStyle(s,up,{diameter:.6});assert.equal(L.route(s,up).diameter,.6);assert.equal(L.route(s,down).diameter,.6);assert.equal(L.route(s,L.external.idFor('a','r')).diameter,.6);assert.deepEqual(L.route(s,up).points,before.points);assert.deepEqual(L.route(s,up).segmentColors,before.segmentColors);
});
test('층별 경로 저장·불러오기와 이동 실행 취소·취소는 데이터를 보존한다',async()=>{
 const s=fixture(),h=new M.History(s),r=L.moveSegment(s,id,0,{x:-8,z:2},{corner:true});h.preview(r.state);h.finishEdit(false);assert.deepEqual(h.current,s);
 h.preview(r.state);h.finishEdit(true);assert.equal(h.past.length,1);h.undo();assert.deepEqual(h.current,s);h.redo();const encoded=await P.encode(h.current),decoded=await P.decode(encoded.bytes);assert.deepEqual(decoded.drawing.floorRoutes,h.current.floorRoutes);
 const removed=M.validate(L.changePowerLink(h.current,'out','a',false));assert.deepEqual(removed.floorRoutes,[]);
});
test('층별 경로 첫 편집 백업과 잘못된 좌표·색상·중복 방어',()=>{
 const s=fixture(),next=L.addPoint(s,id,0).state,data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};L.floor.backupBeforeEdit(s,next,storage,'test');L.floor.backupBeforeEdit(s,next,storage,'test');assert.equal(data.size,1);assert.deepEqual(JSON.parse([...data.values()][0]),s);
 assert.throws(()=>L.floor.backupBeforeEdit(s,next,{getItem(){return null},setItem(){throw Error('full')}},'test'),/full/);
 for(const mutate of [s=>s.floorRoutes[0].points[1].x=Infinity,s=>s.floorRoutes[0].segmentColors[0]='bad',s=>s.floorRoutes.push(s.floorRoutes[0])]){const bad=M.clone(next);mutate(bad);assert.throws(()=>M.validate(bad));}
});
test('층 설비 이동·회전 이후 접속점과 외부 이름표를 재연결하며 다른 층으로 옮기면 이전 경로를 정리한다',()=>{
 let s=L.moveSegment(fixture(),id,0,{x:-8,z:2},{corner:true}).state;s.equipment.find(e=>e.id==='a').x+=1;s.floors[0].rotation=90;const line=L.route(s,id);orthogonal(line);assert.deepEqual(line.points.at(-1),{x:-3,z:0});s=S.moveEquipment(s,['a'],'roof');assert.ok(!M.validate(s).floorRoutes.some(r=>r.floorId==='f'));
});

test('양방향 외부 이름표 끝점 이동은 직각·색상·설비 고정과 저장을 유지한다',async()=>{
 for(const key of [id,up,down]){
  const original=fixture(),before=JSON.stringify(original),line=L.route(original,key),i=line.pointKinds.indexOf('portal'),fixed=i===0?line.points.length-1:0;
  assert.equal(L.isLocked(line,i),false);assert.equal(L.isLocked(line,fixed),true);assert.equal(L.canDeletePoint(line,i),false);
  const position={x:line.points[i].x*.7,z:line.points[i].z*.7+1};
  const colored=L.setSegmentColor(original,key,0,L.palette[7][1]),r=L.movePoint(colored,key,i,position),next=M.validate(L.finishMove(r,key,'point').state),edited=L.route(next,key);
  orthogonal(edited);assert.deepEqual(edited.points[r.index],position);assert.deepEqual(edited.portal.point,position);assert.deepEqual(i===0?edited.points.at(-1):edited.points[0],line.points[fixed]);assert.ok(edited.segmentColors.includes(L.palette[7][1]));
  assert.throws(()=>L.deletePoint(next,key,r.index));assert.throws(()=>L.movePoint(next,key,r.index,{x:1000,z:0}));assert.throws(()=>L.movePoint(next,key,r.index,{x:NaN,z:0}));
  const saved=await P.decode((await P.encode(next)).bytes);assert.deepEqual(L.route(saved.drawing,key).portal.point,position);
  const h=new M.History(colored);h.preview(next);h.finishEdit(false);assert.deepEqual(h.current,colored);h.preview(next);h.finishEdit(true);h.undo();assert.deepEqual(h.current,colored);h.redo();assert.deepEqual(L.route(h.current,key).portal.point,position);
  const local=next.equipment.find(e=>e.floorId===line.floorId&&[line.parentId,...line.childIds].includes(e.id));local.x+=.5;const anchored=L.route(next,key);orthogonal(anchored);assert.deepEqual(anchored.portal.point,position);
  assert.deepEqual(L.route(L.resetScope(next,key),key).portal.point,L.route({...next,floorRoutes:[]},key).portal.point);assert.equal(JSON.stringify(original),before);
 }
});

test('층 외부 이름표 스냅 후보는 같은 층 내부선을 포함하고 다른 층 좌표를 제외한다',()=>{
 const state=fixture(),points=L.snapCandidates(state,id);
 assert.ok(points.some(p=>p.x===4&&p.z===4));
 assert.ok(!points.some(p=>p.x===2&&p.z===2));
 const line=L.route(state,id),i=line.pointKinds.indexOf('portal'),target=L.snapPosition([...line.points,...points],[i],{x:4.13,z:3.89},.3).position;
 const result=L.movePoint(state,id,i,target);assert.deepEqual(L.route(result.state,id).portal.point,{x:4,z:4});
});
