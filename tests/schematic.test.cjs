const test=require('node:test'),assert=require('node:assert/strict');
const L=require('../js/schematic-layout.js');
const node=(id,parentId=null,extra={})=>({id,name:id,code:'',type:'panel',parentId,x:3,z:7,...extra});
test('계층 기본 연결과 추가 연결을 중복 없이 합치고 소속 공간을 표시한다',()=>{
  const state={equipment:[node('grid'),node('ess','grid'),node('panel',null,{floorId:'f'})],floors:[{id:'f',name:'4F',buildingId:'b'}],buildings:[{id:'b',name:'생산동'}],powerLinks:[{from:'grid',to:'ess'},{from:'ess',to:'panel'}]};
  const before=JSON.stringify(state),g=L.graph(state);assert.equal(g.edges.length,2);assert.equal(g.edges[0].kind,'hierarchy');assert.equal(g.edges[1].kind,'extra');assert.equal(g.nodes[2].space,'생산동 / 4F');assert.equal(g.nodes[0].space,'대지');L.layout(g);assert.equal(JSON.stringify(state),before);
});
test('분기와 다중 상위 연결을 계층 변경 없이 왼쪽에서 오른쪽으로 정렬한다',()=>{
  const state={equipment:[node('grid'),node('a','grid'),node('b','grid'),node('c','grid'),node('d','a')],powerLinks:[{from:'b',to:'d'}]},g=L.graph(state),layout=L.layout(g),byId=new Map(layout.nodes.map(n=>[n.id,n]));
  assert.equal(layout.edges.length,5);for(const e of layout.edges)assert.ok(byId.get(e.from).x<byId.get(e.to).x);assert.equal(byId.get('a').x,byId.get('b').x);assert.equal(byId.get('b').x,byId.get('c').x);assert.notEqual(byId.get('a').y,byId.get('b').y);
  const branches=layout.edges.filter(e=>e.from==='grid');assert.equal(new Set(branches.map(e=>e.points[0][1])).size,3);assert.equal(new Set(branches.map(e=>e.points[1][0])).size,3);
});
test('역방향·순환 연결 입력도 각 방향을 보존하며 유한한 레이아웃을 생성한다',()=>{
  const g=L.graph({equipment:[node('grid'),node('ess'),node('load')],powerLinks:[{from:'grid',to:'ess'},{from:'ess',to:'grid'},{from:'ess',to:'load'}]});const result=L.layout(g);
  assert.equal(result.edges.length,3);assert.equal(result.nodes.filter(n=>n.cycle).length,2);for(const e of result.edges){assert.ok(e.points.flat().every(Number.isFinite));assert.ok(!e.path.includes('NaN'));}assert.notEqual(result.edges[0].path,result.edges[1].path);
});
test('검색과 직접 연결 필터가 양쪽 끝이 보이는 연결만 남긴다',()=>{
  const g=L.graph({equipment:[node('grid'),node('ess','grid',{code:'BAT-01'}),node('load','ess'),node('far','load'),node('alone')],powerLinks:[]});
  assert.deepEqual(L.filter(g,'', 'ess',true).nodes.map(n=>n.id),['grid','ess','load']);assert.equal(L.filter(g,'', 'ess',true).edges.length,2);assert.equal(L.filter(g,'BAT-01').nodes[0].id,'ess');assert.equal(L.filter(g,'BAT-01').edges.length,0);assert.equal(L.filter(g,'없는 설비').nodes.length,0);
});
test('건너뛰는 연결선은 중간 설비 카드를 관통하지 않고 별도 경로로 우회한다',()=>{
  const result=L.layout(L.graph({equipment:[node('a'),node('b','a'),node('c','b')],powerLinks:[{from:'a',to:'c'}]}));
  const edge=result.edges.find(e=>e.from==='a'&&e.to==='c'),middle=result.nodes.find(n=>n.id==='b');assert.equal(edge.points.length,6);assert.ok(edge.points[2][1]<middle.y);for(const e of result.edges)for(let i=1;i<e.points.length;i++)assert.ok(e.points[i][0]===e.points[i-1][0]||e.points[i][1]===e.points[i-1][1]);
});
test('빈 프로젝트·미연결 설비·큰 연쇄와 반복 계산이 안정적으로 처리된다',()=>{
  assert.deepEqual(L.layout(L.graph({equipment:[]})).nodes,[]);const state={equipment:Array.from({length:600},(_,i)=>node('n'+i,i?'n'+(i-1):null))};const g=L.graph(state),a=L.layout(g);assert.equal(a.nodes.length,600);assert.equal(a.edges.length,599);assert.deepEqual(a,L.layout(g));const disconnected=L.layout(L.graph({equipment:[node('a'),node('b')]}));assert.equal(disconnected.edges.length,0);assert.notEqual(disconnected.nodes[0].y,disconnected.nodes[1].y);
});
test('계통도 계산은 기존 프로젝트 저장·불러오기 결과를 바꾸지 않는다',()=>{
  const M=require('../js/model.js'),C=require('../js/connections.js'),S=require('../js/spatial.js');let state=S.upgrade(C.enableShared(M.empty()));state.equipment.push(M.create('panel',state,1,2));state=M.validate(C.upgradePower(state));const saved=JSON.stringify(state);L.layout(L.graph(state));assert.equal(JSON.stringify(M.validate(JSON.parse(saved))),JSON.stringify(M.validate(state)));assert.equal(JSON.stringify(state),saved);
});

test('공유 분기점의 공통 색상과 각 설비로 이어지는 색상을 경로 순서대로 읽는다',()=>{
  const state={version:2,equipment:[node('a',null,{x:0,z:0}),node('b','a',{x:10,z:0}),node('c','a',{x:4,z:6})],networks:[{parentId:'a',root:'r',nodes:[{id:'r',equipmentId:'a'},{id:'j',x:4,z:0},{id:'b',equipmentId:'b'},{id:'c',equipmentId:'c'}],edges:[
    {id:'tailB',from:'j',to:'b',bends:[],color:'#2563eb',segmentColors:['#eab308'],diameter:.2},
    {id:'common',from:'r',to:'j',bends:[],color:'#2563eb',segmentColors:['#dc2626'],diameter:.2},
    {id:'tailC',from:'j',to:'c',bends:[],color:'#2563eb',segmentColors:['#16a34a'],diameter:.2}
  ]}]};
  const before=JSON.stringify(state),g=L.graph(state);assert.deepEqual(g.edges.find(e=>e.to==='b').bands,[{end:.4,color:'#dc2626'},{end:1,color:'#eab308'}]);assert.deepEqual(g.edges.find(e=>e.to==='c').bands,[{end:.4,color:'#dc2626'},{end:1,color:'#16a34a'}]);assert.equal(JSON.stringify(state),before);
});
test('공간을 넘는 추가 연결은 실제 외부 연결선의 선분 색상을 사용한다',()=>{
  const M=require('../js/model.js'),C=require('../js/connections.js'),S=require('../js/spatial.js');let state=S.upgrade(C.enableShared(M.empty()));
  state.floors=[{id:'f',name:'층',x:0,z:0,rotation:0,width:20,depth:20,height:1,elevation:8}];
  state.equipment=[{...M.create('panel',state,-20,0),id:'a'},{...M.create('panel',state,2,3),id:'b',floorId:'f'}];
  state=C.changePowerLink(C.upgradePower(state),'a','b');const id=C.external.idFor('a','b');state=C.setSegmentColor(state,id,0,'#9333ea');
  const before=JSON.stringify(state),edge=L.graph(state).edges[0],line=C.external.route(state,id);assert.equal(edge.kind,'extra');assert.deepEqual(edge.bands,L.colorBands([line]));assert.equal(edge.bands[0].color,'#9333ea');assert.equal(edge.bands.at(-1).color,'#2563eb');assert.equal(JSON.stringify(state),before);
});
test('계통도 꺾임과 무관하게 원본 색상 길이 비율·종점 색상·점선 진행 거리를 보존한다',()=>{
  const parts=L.coloredSegments([[0,0],[100,0],[100,100]],[{end:.25,color:'#dc2626'},{end:1,color:'#2563eb'}]);
  assert.deepEqual(parts,[{path:'M0 0 L50 0',color:'#dc2626',offset:0},{path:'M50 0 L100 0',color:'#2563eb',offset:50},{path:'M100 0 L100 100',color:'#2563eb',offset:100}]);
  assert.deepEqual(L.colorBands([{points:[{x:0,z:0},{x:0,z:0}],segmentColors:['#eab308']}]),[{end:1,color:'#eab308'}]);
});

test('상위 카드를 하위 묶음 첫 행에 맞추고 다음 묶음을 자손 전체 아래에 배치한다',()=>{
  const state={equipment:[node('root'),node('A','root'),node('B','root'),node('UPS1','A'),node('UPS2','A'),node('UPS3','A'),node('panel1','B'),node('panel2','B'),node('panel3','B'),node('pump1','panel2'),node('pump2','panel2'),node('compressor','panel3')]};
  const graph=L.graph(state),before=JSON.stringify(graph),result=L.layout(graph),by=new Map(result.nodes.map(n=>[n.id,n]));
  assert.equal(by.get('A').y,by.get('UPS1').y);assert.ok(by.get('B').y>=by.get('UPS3').y+120);assert.equal(by.get('B').y,by.get('panel1').y);
  assert.equal(by.get('panel2').y,by.get('pump1').y);assert.ok(by.get('panel3').y>=by.get('pump2').y+120);assert.equal(by.get('panel3').y,by.get('compressor').y);
  for(const a of result.nodes){assert.ok(a.y+a.height<result.height);for(const b of result.nodes)if(a.id!==b.id&&a.rank===b.rank)assert.ok(Math.abs(a.y-b.y)>=120);}
  assert.equal(JSON.stringify(graph),before);
});
test('추가 상위 연결은 기존 계층 묶음을 바꾸거나 카드를 중복 배치하지 않는다',()=>{
  const state={equipment:[node('root'),node('A','root'),node('B','root'),node('a1','A'),node('a2','A'),node('b1','B')],powerLinks:[{from:'A',to:'b1'}]};
  const result=L.layout(L.graph(state)),by=new Map(result.nodes.map(n=>[n.id,n]));assert.equal(by.get('B').y,by.get('b1').y);assert.ok(by.get('B').y>by.get('a2').y);assert.equal(result.nodes.length,state.equipment.length);assert.ok(result.edges.some(e=>e.from==='A'&&e.to==='b1'&&e.kind==='extra'));
  const filtered=L.layout(L.filter(L.graph(state),'','B',true));assert.ok(filtered.nodes.every(n=>Number.isFinite(n.y)&&n.y+n.height<filtered.height));
});

test('깊은 하위 묶음 옆 빈 열에 ESS와 태양광을 가까이 배치한다',()=>{
  const equipment=[node('grid',null,{name:'A GRID'}),node('receiver','grid',{name:'A 수전반'}),node('ess','grid',{name:'B ESS'}),node('solar',null,{name:'B 태양광'}),node('transformer','receiver'),node('panel','transformer'),...Array.from({length:8},(_,i)=>node('load'+i,'panel'))];
  const g=L.graph({equipment,powerLinks:[{from:'solar',to:'ess'},{from:'ess',to:'panel'}]}),before=JSON.stringify(g),result=L.layout(g),by=new Map(result.nodes.map(n=>[n.id,n]));
  assert.equal(by.get('ess').y,by.get('receiver').y+120);
  assert.equal(by.get('solar').y,by.get('ess').y);
  assert.equal(by.get('panel').y,by.get('receiver').y);
  for(const a of result.nodes)for(const b of result.nodes)if(a.id!==b.id&&a.rank===b.rank)assert.ok(Math.abs(a.y-b.y)>=120);
  // Compaction must not route a line through unrelated cards.
  for(const e of result.edges)for(let i=1;i<e.points.length;i++){
    const [x1,y1]=e.points[i-1],[x2,y2]=e.points[i];
    for(const n of result.nodes){if(n.id===e.from||n.id===e.to)continue;
      const crosses=x1===x2?x1>n.x&&x1<n.x+n.width&&Math.max(y1,y2)>n.y&&Math.min(y1,y2)<n.y+n.height:y1>n.y&&y1<n.y+n.height&&Math.max(x1,x2)>n.x&&Math.min(x1,x2)<n.x+n.width;
      assert.equal(crosses,false,`${e.from} → ${e.to} crosses ${n.id}`);
    }
  }
  assert.equal(JSON.stringify(g),before);assert.deepEqual(L.layout(g),result);
});

test('같은 행은 분기 수와 무관하게 직선으로 연결하고 다른 가지의 접점을 분리한다',()=>{
  const g=L.graph({equipment:[node('a'),node('b','a'),node('c','a'),node('d','a'),node('z')],powerLinks:[{from:'z',to:'b'}]}),before=JSON.stringify(g),result=L.layout(g),edge=result.edges.find(e=>e.from==='a'&&e.to==='b');
  assert.equal(edge.points.length,2);assert.equal(edge.points[0][1],edge.points[1][1]);
  for(const id of ['a','b']){
    const outgoing=result.edges.filter(e=>e.from===id).map(e=>e.points[0][1]),incoming=result.edges.filter(e=>e.to===id).map(e=>e.points.at(-1)[1]);
    assert.equal(new Set(outgoing).size,outgoing.length);assert.equal(new Set(incoming).size,incoming.length);
  }
  assert.equal(JSON.stringify(g),before);
});

test('열을 건너뛰어도 빈 통로는 직선으로 연결하고 카드가 있으면 우회한다',()=>{
  const g=L.graph({equipment:[node('a'),node('b','a'),node('c','b'),node('z'),node('target','z')],powerLinks:[{from:'b',to:'target'},{from:'a',to:'c'}]}),result=L.layout(g),clear=result.edges.find(e=>e.from==='z'&&e.to==='target'),blocked=result.edges.find(e=>e.from==='a'&&e.to==='c');
  assert.equal(clear.points.length,2);assert.equal(clear.points[0][1],clear.points[1][1]);assert.equal(blocked.points.length,6);
  assert.equal(result.edges.length,g.edges.length);
});
