(function(root,factory){
  'use strict';
  if(typeof module!=='undefined'&&module.exports)module.exports=factory;
  else root.FEMSConnections.installShared(factory);
})(typeof globalThis!=='undefined'?globalThis:this,function(L){
  'use strict';
  const copy=value=>JSON.parse(JSON.stringify(value)),eps=1e-6;
  const same=(a,b)=>Math.abs(a.x-b.x)<eps&&Math.abs(a.z-b.z)<eps;
  const length=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
  const color=value=>L.palette.some(([,c])=>c===value);
  function children(state,parentId){const ids=new Set(L.powerLinks(state).filter(link=>link.from===parentId).map(link=>link.to));return state.equipment.filter(e=>ids.has(e.id));}
  function position(state,node){
    const item=node.equipmentId&&state.equipment.find(e=>e.id===node.equipmentId);
    return item?{x:item.x+(node.offset?.x||0),z:item.z+(node.offset?.z||0)}:{x:node.x,z:node.z};
  }
  function find(state,id){
    for(const network of state.networks||[]){const edge=network.edges.find(e=>e.id===id);if(edge)return {network,edge};}
    return null;
  }
  function geometry(state,network,edge){
    const from=network.nodes.find(n=>n.id===edge.from),to=network.nodes.find(n=>n.id===edge.to);
    const raw=[position(state,from),...edge.bends,position(state,to)],points=[raw[0]],colors=[];
    for(let i=1;i<raw.length;i++)for(const p of L.orthogonal([points.at(-1),raw[i]],null,true).slice(1)){points.push(p);colors.push(edge.segmentColors[i-1]);}
    return {points,segmentColors:colors,from,to};
  }
  function routes(state){
    const result=[];
    for(const network of state.networks||[]){
      const nodes=new Map(network.nodes.map(n=>[n.id,n])),out=new Map(),distance=new Map([[network.root,0]]),descendants=new Map();
      for(const edge of network.edges){if(!out.has(edge.from))out.set(edge.from,[]);out.get(edge.from).push(edge);}
      const queue=[network.root],order=[];
      for(let i=0;i<queue.length;i++){const id=queue[i];order.push(id);for(const edge of out.get(id)||[]){const g=geometry(state,network,edge);distance.set(edge.to,(distance.get(id)||0)+g.points.slice(1).reduce((sum,p,j)=>sum+length(g.points[j],p),0));queue.push(edge.to);}}
      for(const id of order.reverse()){const node=nodes.get(id);descendants.set(id,node.equipmentId&&id!==network.root?[node.equipmentId]:(out.get(id)||[]).flatMap(e=>descendants.get(e.to)||[]));}
      for(const edge of network.edges){
        const g=geometry(state,network,edge),names=descendants.get(edge.to)||[];
        const fromName=g.from.equipmentId?state.equipment.find(e=>e.id===g.from.equipmentId)?.name:'분기점';
        const toName=g.to.equipmentId?state.equipment.find(e=>e.id===g.to.equipmentId)?.name:`분기점 · ${names.length}개 설비`;
        result.push({id:edge.id,parentId:network.parentId,childIds:names,label:`${fromName} → ${toName}`,labelParts:[{text:fromName,ui:!g.from.equipmentId},{text:' → ',ui:false},{text:toName,ui:!g.to.equipmentId}],points:g.points,segmentColors:g.segmentColors,
          diameter:edge.diameter,color:edge.color,manual:true,distanceOffset:distance.get(edge.from)||0,
          nodeIds:g.points.map((_,i)=>i===0?network.parentId+'/'+edge.from:i===g.points.length-1?network.parentId+'/'+edge.to:null),
          pointKinds:g.points.map((_,i)=>i===0?(g.from.equipmentId?'equipment':'junction'):i===g.points.length-1?(g.to.equipmentId?'equipment':'junction'):'bend')});
      }
    }
    return result;
  }
  function route(state,id){return routes(state).find(line=>line.id===id)||null;}
  function fullPath(state,network,childId){
    let node=network.nodes.find(n=>n.equipmentId===childId);if(!node)return null;
    const incoming=new Map(network.edges.map(e=>[e.to,e])),edges=[];
    while(node.id!==network.root){const edge=incoming.get(node.id);if(!edge)return null;edges.unshift(edge);node=network.nodes.find(n=>n.id===edge.from);}
    const points=[],segmentColors=[],segmentDiameters=[];
    for(const edge of edges){const g=geometry(state,network,edge);points.push(...g.points.slice(points.length?1:0));segmentColors.push(...g.segmentColors);segmentDiameters.push(...g.segmentColors.map(()=>edge.diameter));}
    return {id:childId,points,segmentColors,segmentDiameters,color:edges[0]?.color||L.palette[0][1],diameter:edges[0]?.diameter||.2};
  }
  function automatic(state,child,parentId){
    if(state.version>=4){child={...child,parentId};delete child.connection;state={...state,equipment:state.equipment.map(e=>e.id===child.id?child:e)};}
    const old=L.route(state,child.id),parent=state.equipment.find(e=>e.id===child.parentId);
    // Opposite vertical children leave the equipment upward/downward independently.
    if(!child.connection?.bends&&Math.abs(child.z-parent.z)>=Math.abs(child.x-parent.x)){
      const a=old.points[0],b=old.points.at(-1);old.points=L.orthogonal([a,{x:a.x,z:b.z},b]);old.segmentColors=old.points.slice(1).map(()=>old.color);
    }
    return old;
  }
  function build(state,parentId,previous=null,planned=null){
    const parent=state.equipment.find(e=>e.id===parentId),items=children(state,parentId);
    const inputs=items.map(child=>planned?.get(child.id)||previous&&fullPath(state,previous,child.id)||automatic(state,child,parentId));
    for(const line of inputs)if(line.points.length===1){line.points.push({...line.points[0]});line.segmentColors=[line.color];}
    const start=inputs[0]?.points[0]||{x:parent.x,z:parent.z};
    const network={parentId,root:'n0',nodes:[{id:'n0',equipmentId:parentId,offset:{x:start.x-parent.x,z:start.z-parent.z}}],edges:[]};
    let serial=1;const coordinates=new Map([['n0',start]]),all=inputs.flatMap(line=>line.points);
    for(const input of inputs){
      let current=network.root;
      for(let i=0;i<input.points.length-1;i++){
        const a=input.points[i],b=input.points[i+1],distance=length(a,b);
        const cuts=distance<eps?[b]:all.filter(p=>!same(p,a)&&((Math.abs(a.x-b.x)<eps&&Math.abs(p.x-a.x)<eps&&p.z>=Math.min(a.z,b.z)-eps&&p.z<=Math.max(a.z,b.z)+eps)||(Math.abs(a.z-b.z)<eps&&Math.abs(p.z-a.z)<eps&&p.x>=Math.min(a.x,b.x)-eps&&p.x<=Math.max(a.x,b.x)+eps))).sort((p,q)=>length(a,p)-length(a,q)).filter((p,j,array)=>!j||!same(p,array[j-1]));
        for(const p of cuts){
          let edge=network.edges.find(e=>e.from===current&&!network.nodes.find(n=>n.id===e.to).equipmentId&&same(coordinates.get(e.to),p));
          if(!edge){
            const id='n'+serial++;
            network.nodes.push({id,x:p.x,z:p.z});coordinates.set(id,{...p});
            edge={id:`net:${parentId}:${id}`,from:current,to:id,bends:[],color:input.color,diameter:input.segmentDiameters?.[i]||input.diameter,segmentColors:[input.segmentColors[i]]};network.edges.push(edge);
          }else{
            // Later rendered routes won the old overlapping appearance; keep that style.
            edge.color=input.color;edge.diameter=input.segmentDiameters?.[i]||input.diameter;edge.segmentColors=[input.segmentColors[i]];
          }
          current=edge.to;
        }
      }
      const item=items.find(e=>e.id===input.id),p=coordinates.get(current),terminal='n'+serial++;
      network.nodes.push({id:terminal,equipmentId:item.id,offset:{x:p.x-item.x,z:p.z-item.z}});
      network.edges.push({id:`net:${parentId}:${terminal}`,from:current,to:terminal,bends:[],color:input.color,diameter:input.segmentDiameters?.at(-1)||input.diameter,segmentColors:[input.segmentColors.at(-1)||input.color]});
    }
    // Degree-two route points remain editable bends, not duplicate branch nodes.
    for(let changed=true;changed;){changed=false;for(const node of network.nodes){
      if(node.equipmentId)continue;
      const before=network.edges.filter(e=>e.to===node.id),after=network.edges.filter(e=>e.from===node.id);
      if(before.length!==1||after.length!==1||before[0].diameter!==after[0].diameter||before[0].bends.length+after[0].bends.length+1>64)continue;
      const a=before[0],b=after[0],target=network.nodes.find(n=>n.id===b.to);
      if(b.bends.length||!same(node,position(state,target))){a.bends.push({x:node.x,z:node.z},...b.bends);a.segmentColors.push(...b.segmentColors);}a.to=b.to;
      network.edges=network.edges.filter(e=>e!==b);network.nodes=network.nodes.filter(n=>n!==node);changed=true;break;
    }}
    return network;
  }
  function reconcile(state){
    if(state.version<2)return state;
    const next=copy(state);
    if(next.version>=4){const ids=new Set(next.equipment.map(e=>e.id));next.powerLinks=next.powerLinks.filter(link=>ids.has(link.from)&&ids.has(link.to));}
    const parents=[...new Set(L.powerLinks(next).map(link=>link.from))];
    next.networks=parents.map(parentId=>{
      const previous=next.networks?.find(n=>n.parentId===parentId),expected=children(next,parentId).map(e=>e.id).sort();
      const actual=previous?.nodes.filter(n=>n.equipmentId&&n.equipmentId!==parentId).map(n=>n.equipmentId).sort();
      if(previous&&JSON.stringify(expected)===JSON.stringify(actual))return previous;
      // Rebuild only a changed hierarchy, retaining the surviving children's edited paths.
      return build(next,parentId,previous);
    });return next;
  }
  function enableShared(state){
    if(state.version>=2)return reconcile(state);
    const next=copy(state);next.version=2;next.networks=[];return reconcile(next);
  }
  function validate(raw,state){
    if(!Array.isArray(raw.networks)||raw.networks.length>300)throw new Error('공유 연결선 데이터가 올바르지 않습니다.');
    const networks=copy(raw.networks),parents=new Set(),edgeIds=new Set();
    const validId=id=>typeof id==='string'&&id.length>0&&id.length<=240;
    const validPoint=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&Math.abs(p.x)<=(state.version>=3?100000:state.site.width)&&Math.abs(p.z)<=(state.version>=3?100000:state.site.depth);
    for(const net of networks){
      if(parents.has(net.parentId)||!state.equipment.some(e=>e.id===net.parentId)||!Array.isArray(net.nodes)||!Array.isArray(net.edges)||net.nodes.length>20000||net.edges.length!==net.nodes.length-1)throw new Error('분기 연결 구조가 올바르지 않습니다.');
      parents.add(net.parentId);const ids=new Set(),equipment=new Set(),incoming=new Map(),out=new Map();
      for(const node of net.nodes){
        if(!validId(node.id)||ids.has(node.id))throw new Error('분기점 ID가 중복되거나 잘못되었습니다.');ids.add(node.id);
        if(node.equipmentId){
          if(equipment.has(node.equipmentId)||!(node.equipmentId===net.parentId||children(state,net.parentId).some(e=>e.id===node.equipmentId))||!validPoint(node.offset))throw new Error('설비 접속점이 올바르지 않습니다.');equipment.add(node.equipmentId);
        }else if(!validPoint(node))throw new Error('분기점 좌표가 올바르지 않습니다.');
      }
      if(!net.nodes.some(n=>n.id===net.root&&n.equipmentId===net.parentId)||equipment.size!==children(state,net.parentId).length+1)throw new Error('설비와 분기 연결이 일치하지 않습니다.');
      for(const edge of net.edges){
        if(!validId(edge.id)||edgeIds.has(edge.id)||!ids.has(edge.from)||!ids.has(edge.to)||edge.from===edge.to||!color(edge.color)||!Number.isFinite(edge.diameter)||edge.diameter<.02||edge.diameter>2||!Array.isArray(edge.bends)||edge.bends.length>64||edge.bends.some(p=>!validPoint(p))||!Array.isArray(edge.segmentColors)||edge.segmentColors.length!==edge.bends.length+1||edge.segmentColors.some(c=>!color(c)))throw new Error('공유 선분 정보가 올바르지 않습니다.');
        edgeIds.add(edge.id);incoming.set(edge.to,(incoming.get(edge.to)||0)+1);if(!out.has(edge.from))out.set(edge.from,[]);out.get(edge.from).push(edge.to);
      }
      for(const node of net.nodes)if((incoming.get(node.id)||0)!==(node.id===net.root?0:1)||(node.equipmentId&&node.id!==net.root&&out.has(node.id))||(!node.equipmentId&&!out.has(node.id)))throw new Error('분기점 연결이 끊어졌거나 순환합니다.');
      const seen=new Set(),queue=[net.root];for(let i=0;i<queue.length;i++){const id=queue[i];if(seen.has(id))throw new Error('순환 연결은 지원하지 않습니다.');seen.add(id);queue.push(...out.get(id)||[]);}
      if(seen.size!==net.nodes.length)throw new Error('접속점과 연결되지 않은 분기점입니다.');
    }
    if(L.powerLinks(state).some(link=>!parents.has(link.from)))throw new Error('설비의 연결선이 누락되었습니다.');
    return networks;
  }
  function editingSite(state,id){
    const line=route(state,id),parent=state.equipment.find(e=>e.id===line?.parentId);
    return state.floors?.find(f=>f.id===parent?.floorId)||state.site;
  }
  function sandbox(state,id){
    const line=route(state,id);if(!line)throw new Error('연결선을 선택하세요.');
    const a=line.points[0],b=line.points.at(-1);
    return {line,state:{site:editingSite(state,id),equipment:[{id:'from',x:a.x,z:a.z},{id:'to',parentId:'from',x:b.x,z:b.z,connection:{diameter:line.diameter,color:line.color,bends:line.points.slice(1,-1),end:{x:0,z:0},segmentColors:line.segmentColors}}]}};
  }
  function storeRoute(state,id,points,colors){
    if(points.length<2||points.length>66)throw new Error('연결선 중간 포인트는 최대 64개입니다.');
    const site=editingSite(state,id);
    if(points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.z)||Math.abs(p.x)>site.width/2||Math.abs(p.z)>site.depth/2))throw new Error('연결선 포인트는 현재 공간 안에 놓으세요.');
    const next=copy(state),found=find(next,id);if(!found)throw new Error('연결선을 찾을 수 없습니다.');
    const line=route(state,id),assigned=colors||line.segmentColors;
    if(!same(points[0],line.points[0])||!same(points.at(-1),line.points.at(-1)))throw new Error('공유 분기점은 포인트 이동으로 변경하세요.');
    found.edge.bends=points.slice(1,-1);found.edge.segmentColors=[...assigned];return next;
  }
  function applyLegacy(state,id,name,args,returnsResult=false){
    const box=sandbox(state,id),result=L[name](box.state,'to',...args),edited=returnsResult?result.state:result;
    if(name==='optimize'&&JSON.stringify(edited)===JSON.stringify(box.state))return copy(state);
    const line=L.route(edited,'to'),next=storeRoute(state,id,line.points,line.segmentColors);
    return returnsResult?{...result,state:next}:next;
  }
  function movePoint(state,id,index,p){
    const line=route(state,id);if(!line?.points[index])throw new Error('이동할 포인트를 선택하세요.');
    if(L.isLocked(line,index))throw new Error('설비 접속점은 이동할 수 없습니다.');
    if(line.nodeIds[index]){
      const site=editingSite(state,id);
      if(!Number.isFinite(p.x)||!Number.isFinite(p.z)||Math.abs(p.x)>site.width/2||Math.abs(p.z)>site.depth/2)throw new Error('분기점은 현재 공간 안에 놓으세요.');
      const next=copy(state),{network,edge}=find(next,id),node=network.nodes.find(n=>n.id===(index===0?edge.from:edge.to));
      // Keep each incident leg's direction at the junction. Move its first corner
      // with the junction instead of inserting an elbow that retraces that leg.
      for(const adjacent of network.edges.filter(e=>e.from===node.id||e.to===node.id)){
        const original=geometry(state,network,adjacent),reverse=adjacent.to===node.id;
        const points=copy(reverse?[...original.points].reverse():original.points),colors=reverse?[...original.segmentColors].reverse():[...original.segmentColors];
        const origin=points[0],first=points.find(q=>!same(q,origin));
        if(first){
          const axis=Math.abs(first.x-origin.x)<eps?'x':'z';
          for(let i=1;i<points.length;i++){
            if(Math.abs(points[i][axis]-origin[axis])>eps)break;
            if(i===points.length-1){
              const elbow={...points[i],[axis]:p[axis]};
              if(!same(elbow,points[i])){points.splice(i,0,elbow);colors.splice(i,0,colors[i-1]);}
              break;
            }
            points[i][axis]=p[axis];
          }
        }
        points[0]={...p};
        if(reverse){points.reverse();colors.reverse();}
        if(points.length>66)throw new Error('분기점 이동에 필요한 코너가 64개 제한을 넘습니다. 포인트를 최적화하세요.');
        const cleaned=L.compactPath(points,colors);
        adjacent.bends=cleaned.points.slice(1,-1);adjacent.segmentColors=cleaned.segmentColors;
      }
      node.x=p.x;node.z=p.z;
      return {state:next,index:index===0?0:route(next,id).points.length-1,generated:[]};
    }
    return applyLegacy(state,id,'movePoint',[index,p],true);
  }
  function setStyle(state,id,changes){const next=copy(state),found=find(next,id);if(!found)throw new Error('연결선을 선택하세요.');Object.assign(found.edge,changes);return next;}
  function setSegmentColor(state,id,index,value){return applyLegacy(state,id,'setSegmentColor',[index,value]);}
  function finishMove(result,id,kind){
    if(!result)return result;
    const box=sandbox(result.state,id),cleaned=L.finishMove({...result,state:box.state},'to',kind),line=L.route(cleaned.state,'to');
    if(JSON.stringify(cleaned.state)===JSON.stringify(box.state))return {...result,index:cleaned.index,kind:cleaned.kind};
    return {...cleaned,state:storeRoute(result.state,id,line.points,line.segmentColors)};
  }
  function followEquipment(previous,state){
    const next=copy(state);
    for(const network of next.networks||[]){
      const before=previous.networks?.find(n=>n.id===network.id&&n.parentId===network.parentId);if(!before)continue;
      const anchors=before.nodes.filter(n=>n.equipmentId),parent=next.equipment.find(e=>e.id===network.parentId);
      const deltas=anchors.map(n=>{
        const oldItem=previous.equipment.find(e=>e.id===n.equipmentId),item=next.equipment.find(e=>e.id===n.equipmentId);
        if(!oldItem||!item||(oldItem.floorId||null)!==(item.floorId||null)||(item.floorId||null)!==(parent.floorId||null))return null;
        const old=position(previous,n),p=position(next,n);return {x:p.x-old.x,z:p.z-old.z};
      });
      const shift=deltas[0],together=shift&&deltas.every(d=>d&&same(d,shift));
      if(together&&!same(shift,{x:0,z:0}))for(const n of network.nodes)if(!n.equipmentId){n.x+=shift.x;n.z+=shift.z;}
      for(const edge of network.edges){
        const oldEdge=before.edges.find(e=>e.id===edge.id);if(!oldEdge)continue;
        const old=geometry(previous,before,oldEdge),from=network.nodes.find(n=>n.id===edge.from),to=network.nodes.find(n=>n.id===edge.to);
        if([from,to].some(n=>n.equipmentId&&(next.equipment.find(e=>e.id===n.equipmentId)?.floorId||null)!==(parent.floorId||null)))continue;
        const start=position(next,from),end=position(next,to);
        if(same(start,old.points[0])&&same(end,old.points.at(-1)))continue;
        const moved=L.followPath(old.points,old.segmentColors,start,end),rebuilt=L.coloredPath(moved.points,moved.segmentColors),cleaned=L.compactPath(rebuilt.points,rebuilt.segmentColors);
        if(cleaned.points.length>66)throw new Error('설비 이동에 필요한 연결선 포인트가 64개 제한을 넘습니다.');
        edge.bends=cleaned.points.slice(1,-1);edge.segmentColors=cleaned.segmentColors;
      }
    }
    return next;
  }
  function reset(state,id){return applyLegacy(state,id,'reset',[]);}
  function optimal(state,id){
    const found=find(state,id);if(!found)throw new Error('연결선을 선택하세요.');
    const Routing=typeof module!=='undefined'&&module.exports?require('./optimal-routing.js'):globalThis.FEMSOptimalRouting;
    const parent=state.equipment.find(e=>e.id===found.network.parentId),floorId=parent.floorId||null;
    const items=state.equipment.filter(e=>(e.floorId||null)===floorId);
    const targets=children(state,parent.id).filter(e=>(e.floorId||null)===floorId).map(item=>({item,line:fullPath(state,found.network,item.id)}));
    if(!targets.length)throw new Error('현재 공간 안의 연결선을 선택하세요.');
    const otherLines=routes(state).filter(r=>r.parentId!==parent.id&&(state.equipment.find(e=>e.id===r.parentId)?.floorId||null)===floorId&&r.childIds.some(id=>items.some(e=>e.id===id)));
    const site=state.floors?.find(f=>f.id===floorId)||state.site;
    const planned=Routing.plan({source:parent,targets,items,site,buildings:floorId?[]:state.buildings||[],otherLines});
    const next=copy(state),network=build(next,parent.id,found.network,new Map(planned.map(line=>[line.id,line])));
    next.networks=next.networks.map(n=>n.parentId===parent.id?network:n);validate(next,next);return next;
  }
  function snapCandidates(state,id){const line=route(state,id);return routes(state).filter(r=>r.parentId===line?.parentId).flatMap(r=>r.points);}
  return {enableShared,reconcile,validate,route,routes,storeRoute,setStyle,setSegmentColor,movePoint,finishMove,followEquipment,reset,optimal,snapCandidates,
    moveSegment:(state,id,...args)=>applyLegacy(state,id,'moveSegment',args,true),addPoint:(state,id,...args)=>applyLegacy(state,id,'addPoint',args,true),
    deletePoint:(state,id,index)=>{const line=route(state,id);if(!L.canDeletePoint(line,index))throw new Error('공유 분기점은 이동할 수 있지만 삭제할 수 없습니다.');return applyLegacy(state,id,'deletePoint',[index]);},
    optimize:(state,id)=>applyLegacy(state,id,'optimize',[])};
});
