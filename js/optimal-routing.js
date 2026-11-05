(function(root,factory){
  const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FEMSOptimalRouting=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const eps=1e-6,near=(a,b)=>Math.abs(a-b)<eps;
  const distance=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.z-b.z);
  const round=n=>Math.round(n*1e6)/1e6;
  function box(item,margin=0){
    const angle=(item.rotation||0)*Math.PI/180,c=Math.abs(Math.cos(angle)),s=Math.abs(Math.sin(angle));
    const x=((item.width||0)*c+(item.depth||0)*s)/2+margin,z=((item.width||0)*s+(item.depth||0)*c)/2+margin;
    return {id:item.id,left:round(item.x-x),right:round(item.x+x),top:round(item.z-z),bottom:round(item.z+z)};
  }
  function inside(p,r){return p.x>r.left+eps&&p.x<r.right-eps&&p.z>r.top+eps&&p.z<r.bottom-eps;}
  function intersects(a,b,r){
    return near(a.z,b.z)?a.z>r.top+eps&&a.z<r.bottom-eps&&Math.max(a.x,b.x)>r.left+eps&&Math.min(a.x,b.x)<r.right-eps:
      a.x>r.left+eps&&a.x<r.right-eps&&Math.max(a.z,b.z)>r.top+eps&&Math.min(a.z,b.z)<r.bottom-eps;
  }
  function simplify(points){
    const result=[];for(const p of points){if(result.length&&distance(result.at(-1),p)<eps)continue;result.push({...p});
      while(result.length>2){const [a,b,c]=result.slice(-3);if((near(a.x,b.x)&&near(b.x,c.x)||near(a.z,b.z)&&near(b.z,c.z))&&(b.x-a.x)*(c.x-b.x)+(b.z-a.z)*(c.z-b.z)>=0)result.splice(-2,1);else break;}}
    return result;
  }
  class Heap{
    constructor(){this.a=[];}
    push(v){let i=this.a.length;this.a.push(v);while(i){const p=(i-1)>>1;if(this.a[p].cost<=v.cost)break;this.a[i]=this.a[p];i=p;}this.a[i]=v;}
    pop(){const first=this.a[0],last=this.a.pop();if(this.a.length){let i=0;while(i*2+1<this.a.length){let c=i*2+1;if(c+1<this.a.length&&this.a[c+1].cost<this.a[c].cost)c++;if(this.a[c].cost>=last.cost)break;this.a[i]=this.a[c];i=c;}this.a[i]=last;}return first;}
  }
  // Remap each original color/diameter band by its relative distance, retaining boundaries.
  function restyle(old,points){
    const bands=[];let total=0;
    for(let i=0;i<old.points.length-1;i++){
      const size=distance(old.points[i],old.points[i+1]);if(size<eps)continue;
      const color=old.segmentColors[i],diameter=old.segmentDiameters?.[i]||old.diameter;
      total+=size;if(bands.length&&bands.at(-1).color===color&&bands.at(-1).diameter===diameter)bands.at(-1).end=total;else bands.push({end:total,color,diameter});
    }
    if(!bands.length)bands.push({end:1,color:old.color,diameter:old.diameter}),total=1;
    const length=points.slice(1).reduce((sum,p,i)=>sum+distance(points[i],p),0),result=[points[0]],colors=[],diameters=[];
    let cursor=0,band=0;
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i],size=distance(a,b);if(size<eps)continue;
      const end=cursor+size;
      while(band<bands.length-1&&bands[band].end/total*length<end-eps){
        const at=bands[band].end/total*length;
        if(at>cursor+eps){const t=(at-cursor)/size;result.push({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t});colors.push(bands[band].color);diameters.push(bands[band].diameter);}
        band++;
      }
      result.push(b);colors.push(bands[band].color);diameters.push(bands[band].diameter);cursor=end;
      if(band<bands.length-1&&near(cursor,bands[band].end/total*length))band++;
    }
    return {...old,points:result,segmentColors:colors,segmentDiameters:diameters};
  }
  function plan({source,targets,items,buildings=[],site,otherLines=[]}){
    const diameter=Math.max(.02,...targets.flatMap(t=>t.line.segmentDiameters||[t.line.diameter]));
    const gap=Math.max(.3,diameter/2),margin=diameter/2+gap;
    const obstacles=[...items,...buildings].map(item=>box(item,margin)),byId=new Map(obstacles.map(r=>[r.id,r]));
    const bounds={left:-site.width/2+diameter/2,right:site.width/2-diameter/2,top:-site.depth/2+diameter/2,bottom:site.depth/2-diameter/2};
    const inBounds=p=>p.x>=bounds.left-eps&&p.x<=bounds.right+eps&&p.z>=bounds.top-eps&&p.z<=bounds.bottom+eps;
    const xs=new Set([round(bounds.left),round(bounds.right)]),zs=new Set([round(bounds.top),round(bounds.bottom)]);
    const add=p=>{if(inBounds(p)){xs.add(round(p.x));zs.add(round(p.z));}};
    for(const r of obstacles){for(const x of [r.left,r.right])if(x>=bounds.left&&x<=bounds.right)xs.add(x);for(const z of [r.top,r.bottom])if(z>=bounds.top&&z<=bounds.bottom)zs.add(z);}
    const ports=(item,p)=>{const r=byId.get(item.id);return [{x:r.left,z:p.z},{x:r.right,z:p.z},{x:p.x,z:r.top},{x:p.x,z:r.bottom}].filter(q=>inBounds(q)&&!obstacles.some(o=>o.id!==item.id&&intersects(p,q,o)));};
    const start=targets[0].line.points[0],sourcePorts=ports(source,start);
    for(const p of sourcePorts)add(p);
    for(const target of targets){target.ports=ports(target.item,target.line.points.at(-1));target.ports.forEach(add);}
    // Treat existing wires as lanes. Their width and clearance contribute candidate detours.
    const occupied=[];
    function segments(line,group=null){return line.points.slice(1).map((b,i)=>({a:line.points[i],b,diameter:line.diameter,group})).filter(s=>distance(s.a,s.b)>eps);}
    for(const line of otherLines)for(let i=1;i<line.points.length;i++){
      const a=line.points[i-1],b=line.points[i];if(distance(a,b)<eps)continue;
      occupied.push({a,b,diameter:line.diameter,group:null});const separation=(diameter+line.diameter)/2+gap;
      for(const p of [a,b])for(const dx of [-separation,0,separation])for(const dz of [-separation,0,separation])add({x:p.x+dx,z:p.z+dz});
    }
    const X=[...xs].sort((a,b)=>a-b),Z=[...zs].sort((a,b)=>a-b),width=X.length,count=width*Z.length;
    if(count>350000)throw new Error('경로 계산 대상이 너무 복잡합니다. 연결망을 나누거나 일부 경로를 직접 편집해 주세요.');
    const xIndex=new Map(X.map((x,i)=>[x,i])),zIndex=new Map(Z.map((z,i)=>[z,i]));
    const index=p=>zIndex.get(round(p.z))*width+xIndex.get(round(p.x)),point=i=>({x:X[i%width],z:Z[Math.floor(i/width)]});
    const blocked=new Uint8Array(count),horizontal=new Uint8Array(count),vertical=new Uint8Array(count);
    for(const r of obstacles){
      for(let z=0;z<Z.length;z++){if(Z[z]<r.top-eps||Z[z]>r.bottom+eps)continue;
        for(let x=0;x<X.length;x++){if(X[x]<r.left-eps||X[x]>r.right+eps)continue;const i=z*width+x,p={x:X[x],z:Z[z]};
          if(inside(p,r))blocked[i]=1;if(x+1<X.length&&intersects(p,{x:X[x+1],z:Z[z]},r))horizontal[i]=1;if(z+1<Z.length&&intersects(p,{x:X[x],z:Z[z+1]},r))vertical[i]=1;
        }
      }
    }
    const trees=new Map(),result=[];
    // Uniform branches can share a trunk. Differently styled bands keep independent lanes.
    for(const target of targets){const colors=[...new Set(target.line.segmentColors)],sizes=[...new Set(target.line.segmentDiameters||[target.line.diameter])];target.group=colors.length===1&&sizes.length===1?colors[0]+'/'+sizes[0]:'private:'+target.item.id;}
    const sorted=[...targets].sort((a,b)=>distance(start,a.line.points.at(-1))-distance(start,b.line.points.at(-1))||a.item.id.localeCompare(b.item.id));
    for(const target of sorted){
      let tree=trees.get(target.group);if(!tree){tree=new Map(sourcePorts.filter(p=>!blocked[index(p)]).map(p=>[index(p),[start,p]]));trees.set(target.group,tree);}
      const terminal=target.line.points.at(-1),endPorts=target.ports.filter(p=>!blocked[index(p)]),costCache=new Map();
      const exemptions=[byId.get(source.id),byId.get(target.item.id)];
      function laneCost(a,b){
        let crossings=0;const h=near(a.z,b.z),lo=h?Math.min(a.x,b.x):Math.min(a.z,b.z),hi=h?Math.max(a.x,b.x):Math.max(a.z,b.z);
        for(const line of occupied){
          // Joining the same equipment is allowed inside its footprint, never as a through route.
          const oh=near(line.a.z,line.b.z),sep=(diameter+line.diameter)/2+gap;
          if(line.group===target.group&&(h!==oh||near(h?a.z:a.x,h?line.a.z:line.a.x)))continue;
          if(h===oh){
            const fixed=h?a.z:a.x,other=h?line.a.z:line.a.x,low=Math.max(lo,h?Math.min(line.a.x,line.b.x):Math.min(line.a.z,line.b.z)),high=Math.min(hi,h?Math.max(line.a.x,line.b.x):Math.max(line.a.z,line.b.z));
            if(Math.abs(fixed-other)<sep-eps&&high>low+eps){const mid=h?{x:(low+high)/2,z:fixed}:{x:fixed,z:(low+high)/2};if(!exemptions.some(r=>inside(mid,r)))return Infinity;}
          }else{
            const cross=h?{x:line.a.x,z:a.z}:{x:a.x,z:line.a.z};
            if((h?cross.x:cross.z)>=lo-eps&&(h?cross.x:cross.z)<=hi+eps&&(h?cross.z:cross.x)>=Math.min(h?line.a.z:line.a.x,h?line.b.z:line.b.x)-eps&&(h?cross.z:cross.x)<=Math.max(h?line.a.z:line.a.x,h?line.b.z:line.b.x)+eps&&!exemptions.some(r=>inside(cross,r)))crossings++;
          }
        }
        return crossings;
      }
      function search(allowCrossings){
        const costs=new Float64Array(count*3).fill(Infinity),previous=new Int32Array(count*3).fill(-1),heap=new Heap();
        for(const p of endPorts){const id=index(p)*3;costs[id]=distance(p,terminal);heap.push({id,cost:costs[id]});}
        let found=-1,visited=0;
        while(heap.a.length){const current=heap.pop();if(current.cost!==costs[current.id])continue;if(++visited>750000)break;
          const node=Math.floor(current.id/3),axis=current.id%3;
          if(tree.has(node)){found=current.id;break;}
          const x=node%width,z=Math.floor(node/width),a=point(node);
          for(const [next,direction,closed] of [[x?node-1:-1,1,x?horizontal[node-1]:1],[x+1<width?node+1:-1,1,horizontal[node]],[z?node-width:-1,2,z?vertical[node-width]:1],[z+1<Z.length?node+width:-1,2,vertical[node]]]){
            if(next<0||closed||blocked[next])continue;
            const key=Math.min(node,next)+':'+Math.max(node,next);let cross=costCache.get(key);if(cross==null){cross=laneCost(a,point(next));costCache.set(key,cross);}
            if(!Number.isFinite(cross)||cross&&!allowCrossings)continue;
            const id=next*3+direction,value=current.cost+distance(a,point(next))+(axis&&axis!==direction?gap*3:0)+cross*10000;
            if(value<costs[id]){costs[id]=value;previous[id]=current.id;heap.push({id,cost:value});}
          }
        }
        if(found<0)return null;
        const prefix=tree.get(Math.floor(found/3)),path=[...prefix];let cursor=previous[found];
        while(cursor>=0){path.push(point(Math.floor(cursor/3)));cursor=previous[cursor];}
        path.push(terminal);return path;
      }
      const path=search(false)||search(true);
      if(!path)throw new Error(target.item.name+': 겹치지 않는 경로를 만들 공간이 부족합니다. 설비 간격을 넓힌 뒤 다시 시도해 주세요.');
      // Only exposed grid points become branch candidates. Never branch through a terminal.
      for(let i=1;i<path.length-1;i++){const id=index(path[i]);if(Number.isInteger(id)&&!blocked[id]&&!tree.has(id))tree.set(id,path.slice(0,i+1));}
      const clean=simplify(path);occupied.push(...segments({points:clean,diameter},target.group));result.push(restyle(target.line,clean));
    }
    return result;
  }
  return {plan,box,intersects,restyle};
});
