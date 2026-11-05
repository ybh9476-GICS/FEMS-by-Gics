(function(root,factory){
  if(typeof module!=='undefined'&&module.exports)module.exports=factory;
  else factory(root.FEMSConnections,()=>root.FEMSSpatial);
})(typeof globalThis!=='undefined'?globalThis:this,function(L,spatial){
  'use strict';
  const base={...L},copy=v=>JSON.parse(JSON.stringify(v)),axes=['x','y','z'],epsilon=1e-6;
  const S=()=>spatial?spatial():require('./spatial.js');
  const idFor=(from,to)=>'space:'+JSON.stringify([from,to]);
  const isExternal=id=>typeof id==='string'&&id.startsWith('space:');
  const same=(a,b)=>axes.every(k=>Math.abs(a[k]-b[k])<epsilon);
  const direction=(a,b)=>axes.find(k=>Math.abs(a[k]-b[k])>=epsilon);
  const colorOK=color=>L.palette.some(([,c])=>c===color);
  function links(state){const byId=new Map(state.equipment.map(e=>[e.id,e]));return L.powerLinks(state).filter(l=>byId.has(l.from)&&byId.has(l.to)&&(byId.get(l.from).floorId||null)!==(byId.get(l.to).floorId||null));}
  function anchor(state,item,diameter){
    const f=state.floors?.find(f=>f.id===item.floorId),frame=S().worldFrame(state,item.floorId),p=S().transform(item,frame);
    return {x:p.x,y:(frame.elevation||0)+(f&&(!f.type||f.type==='space-floor')?f.height*.08:0)+.08+diameter/2,z:p.z};
  }
  // Route each leg on world X/Y/Z axes. Preserve explicit collinear points and colors.
  function path(raw,colors,preferred=[]){
    const points=[{...raw[0]}],segmentColors=[],indices=[0];
    for(let i=1;i<raw.length;i++){
      const target=raw[i],order=[...new Set([preferred[i-1],...axes].filter(Boolean))];
      for(const axis of order){const prev=points.at(-1);if(Math.abs(prev[axis]-target[axis])<epsilon)continue;points.push({...prev,[axis]:target[axis]});segmentColors.push(colors[i-1]);}
      indices.push(points.length-1);
    }
    // Coincident endpoints still form a selectable, valid route.
    if(points.length===1){points.push({...raw.at(-1)});segmentColors.push(colors[0]);indices[indices.length-1]=1;}
    return {points,segmentColors,indices};
  }
  function autoPath(state,parent,child,start,end){
    const f=state.floors?.find(f=>f.id===(child.floorId||parent.floorId));
    const frame=f?S().worldFrame(state,f.id):{x:0,z:0,rotation:0};
    const angle=frame.rotation*Math.PI/180,c=Math.abs(Math.cos(angle)),s=Math.abs(Math.sin(angle));
    const bounds=f?.buildingId?S().view(state,{buildingId:f.buildingId}).focusBounds:{x:frame.x,z:frame.z,width:c*(f?.width||state.site.width)+s*(f?.depth||state.site.depth),depth:s*(f?.width||state.site.width)+c*(f?.depth||state.site.depth)};
    const candidates=[['x',bounds.x-bounds.width/2-.5],['x',bounds.x+bounds.width/2+.5],['z',bounds.z-bounds.depth/2-.5],['z',bounds.z+bounds.depth/2+.5]];
    candidates.sort(([a,v],[b,w])=>(Math.abs(start[a]-v)+Math.abs(end[a]-v))-(Math.abs(start[b]-w)+Math.abs(end[b]-w)));
    const [axis,value]=candidates[0],across=axis==='x'?'z':'x',p={...start,[axis]:value},q={...p,y:end.y},r={...q,[across]:end[across]};
    return [start,p,q,r,end];
  }
  function route(state,id){
    const link=links(state).find(l=>idFor(l.from,l.to)===id);if(!link)return null;
    const parent=state.equipment.find(e=>e.id===link.from),child=state.equipment.find(e=>e.id===link.to);
    const saved=state.externalRoutes?.find(r=>r.from===link.from&&r.to===link.to);
    const edge=!saved&&base.routes(state).find(r=>r.parentId===parent.id&&(r.childIds||[r.id]).includes(child.id)),style=saved||edge||L.style(child);
    const start=anchor(state,parent,style.diameter),end=anchor(state,child,style.diameter);
    let result;
    if(saved){
      const first=saved.points[0],last=saved.points.at(-1),delta=Object.fromEntries(axes.map(k=>[k,start[k]-first[k]]));
      const together=axes.every(k=>Math.abs(end[k]-last[k]-delta[k])<epsilon);
      const raw=copy(saved.points);
      if(together)for(const p of raw)for(const k of axes)p[k]+=delta[k];
      raw[0]=start;raw[raw.length-1]=end;
      result=path(raw,saved.segmentColors,saved.points.slice(1).map((p,i)=>direction(saved.points[i],p)));
    }else{const raw=autoPath(state,parent,child,start,end);result=path(raw,raw.slice(1).map(()=>style.color));}
    return {id,parentId:parent.id,childIds:[child.id],rootId:id,label:parent.name+' → '+child.name,points:result.points,segmentColors:result.segmentColors,diameter:style.diameter,color:style.color,elevation:0,crossSpace:true,manual:!!saved};
  }
  function validate(raw,state){
    if(raw==null)return undefined;
    if(!Array.isArray(raw)||raw.length>10000)throw new Error('외부 연결선 목록이 올바르지 않습니다.');
    const valid=new Set(links(state).map(l=>idFor(l.from,l.to))),seen=new Set(),result=[];
    for(const r of raw){
      if(!r||typeof r.from!=='string'||typeof r.to!=='string')throw new Error('외부 연결선의 설비 정보가 올바르지 않습니다.');
      const id=idFor(r.from,r.to);if(seen.has(id))throw new Error('외부 연결선이 중복되었습니다.');seen.add(id);
      if(!Number.isFinite(r.diameter)||r.diameter<.02||r.diameter>2||!colorOK(r.color))throw new Error('외부 연결선 지름 또는 색상이 올바르지 않습니다.');
      if(!Array.isArray(r.points)||r.points.length<2||r.points.length>130)throw new Error('외부 연결선 포인트는 2~130개까지 지원합니다.');
      const points=r.points.map(p=>{if(!p||axes.some(k=>!Number.isFinite(p[k])||Math.abs(p[k])>1000000))throw new Error('외부 연결선 좌표가 올바르지 않습니다.');return {x:p.x,y:p.y,z:p.z};});
      for(let i=1;i<points.length;i++)if(axes.filter(k=>Math.abs(points[i][k]-points[i-1][k])>epsilon).length>1)throw new Error('외부 연결선은 수평·수직으로 연결하세요.');
      if(!Array.isArray(r.segmentColors)||r.segmentColors.length!==points.length-1||r.segmentColors.some(c=>!colorOK(c)))throw new Error('외부 선분의 색상 정보가 올바르지 않습니다.');
      // Removing a power link, equipment, or a floor also removes its obsolete path.
      if(valid.has(id))result.push({from:r.from,to:r.to,diameter:r.diameter,color:r.color,points,segmentColors:[...r.segmentColors]});
    }
    return result;
  }
  function store(state,id,points,colors,changes={}){
    const line=route(state,id);if(!line)throw new Error('외부 연결선을 찾을 수 없습니다.');
    const next=copy(state),entry={from:line.parentId,to:line.childIds[0],diameter:line.diameter,color:line.color,points:copy(points),segmentColors:[...colors],...changes};
    next.externalRoutes=[...(next.externalRoutes||[]).filter(r=>idFor(r.from,r.to)!==id),entry];
    next.externalRoutes=validate(next.externalRoutes,next);return next;
  }
  function setStyle(state,id,changes){
    const line=route(state,id),next=store(state,id,line.points,line.segmentColors,changes);
    // Re-anchor thickness changes without losing the edited bends.
    const updated=route(next,id);return store(next,id,updated.points,updated.segmentColors);
  }
  function setSegmentColor(state,id,index,color){const line=route(state,id);if(!line?.points[index+1]||!colorOK(color))throw new Error('색상을 변경할 선분을 선택하세요.');const colors=[...line.segmentColors];colors[index]=color;return store(state,id,line.points,colors);}
  function edited(state,id,raw,colors,index,preferred){const result=path(raw,colors,preferred);return {state:store(state,id,result.points,result.segmentColors),index:result.indices[index]};}
  function movePoint(state,id,index,position){
    const line=route(state,id);if(!line||index<=0||index>=line.points.length-1)throw new Error('설비 고정점은 이동할 수 없습니다.');
    const raw=copy(line.points),preferred=raw.slice(1).map((p,i)=>direction(raw[i],p)),target={...raw[index],...position};
    if(axes.some(k=>!Number.isFinite(target[k])))throw new Error('포인트 좌표를 숫자로 입력하세요.');
    // Slide the neighboring legs where possible; fixed endpoints get short orthogonal joins.
    for(const neighbor of [index-1,index+1])if(neighbor>0&&neighbor<raw.length-1){const axis=direction(line.points[index],line.points[neighbor]);for(const k of axes)if(k!==axis)raw[neighbor][k]=target[k];}
    raw[index]=target;return edited(state,id,raw,line.segmentColors,index,preferred);
  }
  function moveSegment(state,id,index,position,{corner=false}={}){
    const line=route(state,id),a=line?.points[index],b=line?.points[index+1];if(!b)throw new Error('선분을 선택하세요.');
    const axis=direction(a,b),middle=Object.fromEntries(axes.map(k=>[k,(a[k]+b[k])/2])),delta=Object.fromEntries(axes.map(k=>[k,k===axis?0:(position[k]??middle[k])-middle[k]]));
    if(axes.every(k=>Math.abs(delta[k])<epsilon))return {state:copy(state),index};
    const shift=p=>Object.fromEntries(axes.map(k=>[k,p[k]+delta[k]])),raw=copy(line.points),colors=[...line.segmentColors];let selected;
    if(corner){
      const p=Object.fromEntries(axes.map(k=>[k,a[k]+(b[k]-a[k])/3])),q=Object.fromEntries(axes.map(k=>[k,a[k]+(b[k]-a[k])*2/3]));
      raw.splice(index+1,0,p,shift(p),shift(q),q);colors.splice(index,1,...Array(5).fill(colors[index]));selected=index+2;
    }else{
      raw[index]=shift(a);raw[index+1]=shift(b);selected=index;
      if(index===0){raw.unshift({...a});colors.unshift(colors[0]);selected++;}
      if(index+1===line.points.length-1){raw.push({...b});colors.push(colors.at(-1));}
    }
    const preferred=raw.slice(1).map((p,i)=>i===selected?axis:undefined);
    return edited(state,id,raw,colors,selected,preferred);
  }
  function addPoint(state,id,index){const line=route(state,id),a=line?.points[index],b=line?.points[index+1];if(!b)throw new Error('선분을 선택하세요.');const points=copy(line.points),colors=[...line.segmentColors];points.splice(index+1,0,Object.fromEntries(axes.map(k=>[k,(a[k]+b[k])/2])));colors.splice(index,0,colors[index]);return {state:store(state,id,points,colors),index:index+1};}
  function deletePoint(state,id,index){const line=route(state,id);if(index<=0||index>=line.points.length-1)throw new Error('설비 고정점은 삭제할 수 없습니다.');const points=copy(line.points),colors=[...line.segmentColors];points.splice(index,1);colors.splice(index,1);const result=path(points,colors);return store(state,id,result.points,result.segmentColors);}
  function optimize(state,id){const line=route(state,id),points=copy(line.points),colors=[...line.segmentColors];let i=1;while(i<points.length-1){const a=points[i-1],b=points[i],c=points[i+1],axis=direction(a,b),straight=axes.every(k=>k===axis||Math.abs(c[k]-a[k])<epsilon),forward=axes.reduce((sum,k)=>sum+(b[k]-a[k])*(c[k]-b[k]),0)>=0;if(same(a,b)||same(b,c)||straight&&forward){colors.splice(same(a,b)?i-1:i,1);points.splice(i,1);i=Math.max(1,i-1);}else i++;}return store(state,id,points,colors);}
  function reset(state,id){const line=route(state,id),next=copy(state);next.externalRoutes=(next.externalRoutes||[]).filter(r=>idFor(r.from,r.to)!==id);const fresh=route(next,id);return store(next,id,fresh.points,fresh.points.slice(1).map(()=>line.color),{diameter:line.diameter,color:line.color});}
  function backupBeforeEdit(previous,next,storage,key){
    if(!next.externalRoutes?.length||previous.externalRoutes?.length)return;
    const backupKey=key+'-before-external-routes-'+(previous.project?.id||'drawing');
    if(!storage.getItem(backupKey))storage.setItem(backupKey,JSON.stringify(previous));
  }
  const external={backupBeforeEdit,idFor,isExternal,route,links,validate,store,setStyle,setSegmentColor,movePoint,moveSegment,addPoint,deletePoint,optimize,reset,path};
  L.external=external;
  for(const name of ['route','setStyle','setSegmentColor','movePoint','moveSegment','addPoint','deletePoint','optimize','reset'])L[name]=(state,id,...args)=>isExternal(id)?external[name](state,id,...args):base[name](state,id,...args);
  L.finishMove=(result,id,...args)=>isExternal(id)?result:base.finishMove(result,id,...args);
  L.editScope=(state,id)=>isExternal(id)?{rootId:id,name:route(state,id)?.label||'',ids:[id]}:base.editScope(state,id);
  L.resetScope=(state,id)=>isExternal(id)?reset(state,id):base.resetScope(state,id);
  return external;
});
