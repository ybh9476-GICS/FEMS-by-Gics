(function(root){
  'use strict';
  const WIDTH=218,HEIGHT=86,GAP=128,ROW=120;
  function colorBands(lines,fallback='#2563eb'){
    const bands=[];let total=0;
    for(const line of lines)for(let i=1;i<line.points.length;i++){
      const a=line.points[i-1],b=line.points[i],length=Math.hypot(b.x-a.x,(b.y||0)-(a.y||0),b.z-a.z),color=line.segmentColors?.[i-1]||line.color||fallback;
      if(!Number.isFinite(length)||length<1e-6)continue;total+=length;
      if(bands.at(-1)?.color===color)bands.at(-1).end=total;else bands.push({end:total,color});
    }
    return total?bands.map(b=>({...b,end:b.end/total})):[{end:1,color:lines.at(-1)?.segmentColors?.at(-1)||lines.at(-1)?.color||fallback}];
  }
  // Preserve source colour order and distance proportions on the independent diagram path.
  function coloredSegments(points,bands){
    const lengths=points.slice(1).map((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1])),total=lengths.reduce((a,b)=>a+b,0),parts=[];let cursor=0;
    for(let i=1;i<points.length;i++){
      const length=lengths[i-1],start=cursor,end=start+length;cursor=end;if(length<1e-6)continue;
      const cuts=[start,...bands.map(b=>b.end*total).filter(v=>v>start+1e-6&&v<end-1e-6),end];
      const at=d=>points[i-1].map((v,k)=>v+(points[i][k]-v)*(d-start)/length);
      for(let j=1;j<cuts.length;j++){const a=cuts[j-1],b=cuts[j],color=bands.find(band=>(a+b)/2<=band.end*total+1e-6)?.color||bands.at(-1).color;parts.push({path:'M'+at(a).join(' ')+' L'+at(b).join(' '),color,offset:a});}
    }
    return parts;
  }
  function graph(state){
    const floors=new Map((state.floors||[]).map(f=>[f.id,f])),buildings=new Map((state.buildings||[]).map(b=>[b.id,b]));
    const siteName=state.site?.name??'대지';
    const nodes=state.equipment.map(e=>{const floor=floors.get(e.floorId),building=buildings.get(floor?.buildingId);return {id:e.id,name:e.name,code:e.code||'',type:e.type,space:floor?(building?building.name+' / ':siteName+' / ')+floor.name:siteName};});
    const byId=new Map(state.equipment.map(e=>[e.id,e])),unique=new Map();
    for(const link of [...(state.powerLinks||[]),...state.equipment.filter(e=>e.parentId).map(e=>({from:e.parentId,to:e.id}))]){
      if(!byId.has(link.from)||!byId.has(link.to)||link.from===link.to)continue;
      const id=JSON.stringify([link.from,link.to]);unique.set(id,{id,from:link.from,to:link.to,kind:byId.get(link.to).parentId===link.from?'hierarchy':'extra'});
    }
    const C=root.FEMSConnections||(typeof require==='function'?require('./connections.js'):null),routes=C?.routes(state)||[],byParent=new Map();
    for(const line of routes){if(!line)continue;if(!byParent.has(line.parentId))byParent.set(line.parentId,[]);byParent.get(line.parentId).push(line);}
    for(const edge of unique.values()){
      const child=byId.get(edge.to),parent=byId.get(edge.from),external=state.version>=3&&(parent.floorId||null)!==(child.floorId||null)?C?.external.route(state,C.external.idFor(edge.from,edge.to)):null;
      const lines=external?[external]:(byParent.get(edge.from)||[]).filter(r=>(r.childIds||[r.id]).includes(edge.to)).sort((a,b)=>(a.distanceOffset||0)-(b.distanceOffset||0));
      edge.bands=colorBands(lines,child.connection?.color||C?.palette[0][1]||'#2563eb');
    }
    return {nodes,edges:[...unique.values()]};
  }
  function filter(graph,query='',selected=null,neighborsOnly=false){
    const terms=query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    let ids=new Set(graph.nodes.filter(n=>terms.every(t=>(n.name+' '+n.code+' '+n.space).toLocaleLowerCase().includes(t))).map(n=>n.id));
    if(neighborsOnly&&selected){const near=new Set([selected]);for(const e of graph.edges){if(e.from===selected)near.add(e.to);if(e.to===selected)near.add(e.from);}ids=new Set([...ids].filter(id=>near.has(id)));}
    return {nodes:graph.nodes.filter(n=>ids.has(n.id)),edges:graph.edges.filter(e=>ids.has(e.from)&&ids.has(e.to))};
  }
  function layout(graph){
    // Condense strongly connected components before ranking. Display remains safe for
    // reciprocal/cyclic input without changing the editor's connection validation.
    const nodes=graph.nodes.map(n=>({...n})),byId=new Map(nodes.map(n=>[n.id,n])),out=new Map(nodes.map(n=>[n.id,[]])),back=new Map(nodes.map(n=>[n.id,[]]));
    const edges=graph.edges.filter(e=>byId.has(e.from)&&byId.has(e.to)).map(e=>({...e}));
    for(const e of edges){out.get(e.from).push(e.to);back.get(e.to).push(e.from);}
    const seen=new Set(),order=[];
    for(const n of nodes){if(seen.has(n.id))continue;seen.add(n.id);const stack=[[n.id,0]];while(stack.length){const current=stack.at(-1),next=out.get(current[0]);if(current[1]<next.length){const id=next[current[1]++];if(!seen.has(id)){seen.add(id);stack.push([id,0]);}}else{order.push(current[0]);stack.pop();}}}
    const components=[],component=new Map();
    for(const id of order.reverse()){if(component.has(id))continue;const members=[],index=components.length,stack=[id];component.set(id,index);while(stack.length){const next=stack.pop();members.push(next);for(const prev of back.get(next))if(!component.has(prev)){component.set(prev,index);stack.push(prev);}}components.push(members);}
    const successors=components.map(()=>new Set()),degree=components.map(()=>0),rank=components.map(()=>0);
    for(const e of edges){const a=component.get(e.from),b=component.get(e.to);if(a!==b&&!successors[a].has(b)){successors[a].add(b);degree[b]++;}}
    const queue=degree.flatMap((v,i)=>v===0?[i]:[]);for(let i=0;i<queue.length;i++){const a=queue[i];for(const b of successors[a]){rank[b]=Math.max(rank[b],rank[a]+1);if(--degree[b]===0)queue.push(b);}}
    const columns=[];
    for(const n of nodes){n.rank=rank[component.get(n.id)];n.cycle=components[component.get(n.id)].length>1;(columns[n.rank]??=[]).push(n);}
    const compare=(a,b)=>a.space.localeCompare(b.space)||a.name.localeCompare(b.name)||a.id.localeCompare(b.id);
    const incoming=new Map(nodes.map(n=>[n.id,[]])),outgoing=new Map(nodes.map(n=>[n.id,[]]));
    for(const e of edges){incoming.get(e.to).push(e);outgoing.get(e.from).push(e);}
    // Keep hierarchy families together; supplemental parents do not reparent cards.
    const children=new Map(nodes.map(n=>[n.id,[]])),roots=[];
    for(const n of nodes){
      const candidates=incoming.get(n.id).filter(e=>byId.get(e.from).rank<n.rank).sort((a,b)=>Number(b.kind==='hierarchy')-Number(a.kind==='hierarchy')||byId.get(b.from).rank-byId.get(a.from).rank||compare(byId.get(a.from),byId.get(b.from)));
      if(candidates.length)children.get(candidates[0].from).push(n);else roots.push(n);
    }
    for(const list of children.values())list.sort(compare);roots.sort(compare);
    // Pack using the occupied rows in each column, rather than reserving a full
    // rectangle for every descendant. A short branch can use the empty columns
    // beside a deep family while sibling order and first-child alignment remain.
    const contours=new Map(),offsets=new Map();
    function pack(list){
      const occupied=new Map(),placements=[];let previous=-1;
      for(const n of list){const contour=contours.get(n.id);let shift=previous+1;
        for(const [column,range] of contour)if(occupied.has(column))shift=Math.max(shift,occupied.get(column).max+1-range.min);
        placements.push([n,shift]);previous=shift;
        for(const [column,range] of contour){const existing=occupied.get(column);occupied.set(column,{min:Math.min(existing?.min??Infinity,range.min+shift),max:Math.max(existing?.max??-Infinity,range.max+shift)});}
      }
      return {occupied,placements};
    }
    for(const n of [...nodes].sort((a,b)=>b.rank-a.rank)){
      const {occupied,placements}=pack(children.get(n.id));occupied.set(n.rank,{min:0,max:0});contours.set(n.id,occupied);offsets.set(n.id,placements);
    }
    const rows=new Map(),pending=pack(roots).placements;let row=0;
    while(pending.length){const [n,start]=pending.pop();rows.set(n.id,start);row=Math.max(row,start+1);for(const [child,offset] of offsets.get(n.id))pending.push([child,start+offset]);}
    // Align the ports for level cards instead of creating a tiny detour solely
    // because the two cards have different numbers of incoming/outgoing links.
    // Skipped columns are safe only when the horizontal corridor is empty.
    const straight=new Set(edges.filter(e=>{
      const a=byId.get(e.from),b=byId.get(e.to),row=rows.get(a.id);
      return b.rank>a.rank&&rows.get(b.id)===row&&!nodes.some(n=>n.rank>a.rank&&n.rank<b.rank&&rows.get(n.id)===row);
    }).map(e=>e.id));
    const routed=edges.filter(e=>!straight.has(e.id)&&byId.get(e.to).rank!==byId.get(e.from).rank+1),top=48+routed.length*14;
    for(const n of nodes){n.x=32+n.rank*(WIDTH+GAP);n.y=top+rows.get(n.id)*ROW;n.width=WIDTH;n.height=HEIGHT;}
    for(const list of outgoing.values())list.sort((a,b)=>byId.get(a.to).y-byId.get(b.to).y||a.id.localeCompare(b.id));
    for(const list of incoming.values())list.sort((a,b)=>byId.get(a.from).y-byId.get(b.from).y||a.id.localeCompare(b.id));
    function port(list,e){
      const index=list.indexOf(e),anchor=list.findIndex(link=>straight.has(link.id)),center=HEIGHT/2;
      if(anchor<0)return 22+(index+1)*46/(list.length+1);
      if(index===anchor)return center;
      return index<anchor?22+(index+1)*(center-22)/(anchor+1):center+(index-anchor)*(68-center)/(list.length-anchor);
    }
    let outer=0;const lanes=new Map();
    for(const e of edges){const a=byId.get(e.from),b=byId.get(e.to),outs=outgoing.get(a.id),ins=incoming.get(b.id),sy=a.y+port(outs,e),ty=b.y+port(ins,e),sx=a.x+WIDTH,tx=b.x;
      if(straight.has(e.id))e.points=[[sx,sy],[tx,ty]];
      else if(b.rank===a.rank+1){const lane=lanes.get(a.rank)||0;lanes.set(a.rank,lane+1);const count=edges.filter(e=>byId.get(e.from).rank===a.rank&&byId.get(e.to).rank===a.rank+1).length,x=sx+24+(lane+1)*80/(count+1);e.points=[[sx,sy],[x,sy],[x,ty],[tx,ty]];}
      else{const y=24+outer++*14,left=sx+12+(outs.indexOf(e)+1)*80/(outs.length+1),right=tx-12-(ins.indexOf(e)+1)*80/(ins.length+1);e.points=[[sx,sy],[left,sy],[left,y],[right,y],[right,ty],[tx,ty]];}
      e.path=e.points.map((p,i)=>(i?'L':'M')+p.join(' ')).join(' ');
    }
    return {nodes,edges,width:Math.max(320,32+columns.length*(WIDTH+GAP)-GAP+32),height:Math.max(220,top+row*ROW+24),columns:columns.length};
  }
  const api={graph,filter,layout,colorBands,coloredSegments};if(typeof module==='object'&&module.exports)module.exports=api;else root.FEMSSchematicLayout=api;
})(typeof window==='object'?window:globalThis);
