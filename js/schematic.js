(function(root){
  'use strict';
  const L=root.FEMSSchematicLayout,NS='http://www.w3.org/2000/svg';
  const svg=(tag,attrs={},text)=>{const e=document.createElementNS(NS,tag);for(const [key,value] of Object.entries(attrs))e.setAttribute(key,String(value));if(text!=null)e.textContent=text;return e;};
  class Schematic {
    constructor(host,api){
      this.host=host;this.api=api;this.scale=1;this.offset={x:0,y:0};this.active=false;
      host.innerHTML='<div class="schematic-tools"><div><strong>전력 계통도</strong><span class="schematic-count" aria-live="polite"></span></div><div class="schematic-filters"><input type="search" aria-label="계통도 설비 검색" placeholder="설비 이름 · 코드 · 공간 검색"><label><input type="checkbox">선택 설비의 직접 연결만</label><button type="button" class="schematic-locate" disabled>배치에서 보기 ↗</button></div></div><div class="schematic-canvas"><svg role="group" aria-label="설비 전력 연결 관계도" tabindex="0"></svg><div class="schematic-empty" hidden></div></div>';
      this.search=host.querySelector('input[type=search]');this.neighbors=host.querySelector('input[type=checkbox]');this.locate=host.querySelector('.schematic-locate');this.canvas=host.querySelector('.schematic-canvas');this.svg=host.querySelector('svg');this.empty=host.querySelector('.schematic-empty');
      this.search.addEventListener('input',()=>{this.key=null;this.draw();this.fit(true);});this.neighbors.addEventListener('change',()=>{this.key=null;this.draw();this.fit(true);});
      this.locate.addEventListener('click',()=>{if(this.selected)this.api.locate(this.selected);});
      this.svg.addEventListener('wheel',e=>{e.preventDefault();const r=this.svg.getBoundingClientRect();this.zoom(Math.exp(-e.deltaY*.0015),{x:e.clientX-r.left,y:e.clientY-r.top});},{passive:false});
      this.svg.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('[data-node]'))return;this.drag={id:e.pointerId,x:e.clientX,y:e.clientY,offset:{...this.offset}};this.moved=false;});
      this.svg.addEventListener('pointermove',e=>{const d=this.drag;if(!d||d.id!==e.pointerId)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;if(!this.moved&&Math.hypot(dx,dy)>3){this.moved=true;this.svg.setPointerCapture(e.pointerId);}if(this.moved){this.offset={x:d.offset.x+dx,y:d.offset.y+dy};this.transform();}});
      const end=()=>{this.drag=null;};this.svg.addEventListener('pointerup',end);this.svg.addEventListener('pointercancel',end);this.svg.addEventListener('lostpointercapture',end);
      this.svg.addEventListener('click',e=>{if(e.target.closest('[data-node],[data-edge]'))return;if(this.moved){this.moved=false;return;}this.edge=null;this.api.select(null);});
      this.svg.addEventListener('keydown',e=>{if(e.target!==this.svg||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();e.stopPropagation();this.offset.x+=e.key==='ArrowLeft'?40:e.key==='ArrowRight'?-40:0;this.offset.y+=e.key==='ArrowUp'?40:e.key==='ArrowDown'?-40:0;this.transform();});
      new ResizeObserver(()=>{if(this.active){if(!this.fitted)this.fit(true);else this.transform();}}).observe(this.canvas);
    }
    setActive(active){this.active=active;this.host.hidden=!active;if(active){this.draw();if(!this.fitted)this.fit(true);}}
    setState(state,selected){this.state=state;const changed=this.selected!==selected;if(changed)this.edge=null;this.selected=selected;if(this.active){this.draw();if(changed)this.reveal();}}
    draw(){
      if(!this.state)return;const graph=L.graph(this.state),valid=graph.nodes.some(n=>n.id===this.selected);this.neighbors.disabled=!valid;this.locate.disabled=!valid;
      if(!valid)this.neighbors.checked=false;
      const filtered=L.filter(graph,this.search.value,this.selected,this.neighbors.checked),key=JSON.stringify(filtered);
      if(key!==this.key){this.key=key;this.layout=L.layout(filtered);this.svg.replaceChildren();const defs=svg('defs');for(const color of new Set(this.layout.edges.flatMap(e=>e.bands.map(b=>b.color)))){const marker=svg('marker',{id:'schematic-arrow-'+color.slice(1),viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:7,markerHeight:7,orient:'auto-start-reverse',markerUnits:'userSpaceOnUse'});marker.append(svg('path',{d:'M 0 0 L 10 5 L 0 10 z',fill:color}));defs.append(marker);}this.svg.append(defs);this.world=svg('g');this.svg.append(this.world);this.edgeElements=new Map();this.nodeElements=new Map();
        for(let rank=0;rank<this.layout.columns;rank++)this.world.append(svg('text',{x:32+rank*346,y:Math.min(...this.layout.nodes.filter(n=>n.rank===rank).map(n=>n.y))-16,class:'schematic-column'},'연결 단계 '+(rank+1)));
        const names=new Map(graph.nodes.map(n=>[n.id,n.name]));
        for(const e of this.layout.edges){const group=svg('g',{'data-edge':e.id,class:'schematic-edge '+e.kind,tabindex:0,role:'button','aria-label':names.get(e.from)+' → '+names.get(e.to)+' · '+(e.kind==='hierarchy'?'계층 연결':'추가 연결')});group.append(svg('title',{},group.getAttribute('aria-label')),svg('path',{d:e.path,class:'schematic-edge-hit'}));const parts=L.coloredSegments(e.points,e.bands);parts.forEach((part,index)=>group.append(svg('path',{d:part.path,class:'schematic-edge-line',stroke:part.color,'stroke-dashoffset':-part.offset,...(index===parts.length-1?{'marker-end':'url(#schematic-arrow-'+part.color.slice(1)+')'}:{})})));
          const choose=()=>{if(this.moved){this.moved=false;return;}this.edge=e.id;this.highlight();};group.addEventListener('click',choose);group.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();event.stopPropagation();this.moved=false;choose();}});this.world.append(group);this.edgeElements.set(e.id,group);}
        for(const n of this.layout.nodes){const g=svg('g',{transform:`translate(${n.x} ${n.y})`,'data-node':n.id,'data-stage':n.rank+1,'data-tone':n.rank%8,class:'schematic-node',tabindex:0,role:'button','aria-label':n.name+' · '+n.space});g.append(svg('title',{},[n.name,n.code,n.space,n.cycle?'순환 연결 포함':''].filter(Boolean).join('\n')),svg('rect',{class:'schematic-card',width:n.width,height:n.height,rx:10}),svg('rect',{class:'schematic-card-accent',x:6,y:10,width:4,height:n.height-20,rx:2,'aria-hidden':true}),svg('text',{x:18,y:25,class:'schematic-node-name'},this.shorten(n.name,22)),svg('text',{x:18,y:47,class:'schematic-node-code'},this.shorten(n.code||root.FEMSCatalog.get(n.type).name,29)),svg('text',{x:18,y:69,class:'schematic-node-space'},this.shorten(n.space,28)));
          const choose=()=>{this.edge=null;this.api.select(n.id);this.nodeElements.get(n.id)?.focus({preventScroll:true});};g.addEventListener('click',choose);g.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();e.stopPropagation();choose();}});this.world.append(g);this.nodeElements.set(n.id,g);}
        this.transform();
      }
      this.empty.hidden=filtered.nodes.length>0;this.empty.textContent=graph.nodes.length?'검색 조건에 맞는 설비가 없습니다. 검색어를 바꾸거나 직접 연결 필터를 해제하세요.':'등록된 설비가 없습니다. 3D View 또는 평면도에서 설비를 배치하세요.';
      this.host.querySelector('.schematic-count').textContent=`설비 ${filtered.nodes.length} / ${graph.nodes.length} · 연결 ${filtered.edges.length} / ${graph.edges.length}`;
      if(!this.layout.edges.some(e=>e.id===this.edge))this.edge=null;
      this.highlight();
    }
    shorten(text,max){let result='',width=0;for(const char of Array.from(text)){width+=char.codePointAt(0)>255?2:1;if(width>max)return result+'…';result+=char;}return result;}
    highlight(){
      if(!this.layout)return;const selected=this.layout.nodes.some(n=>n.id===this.selected)?this.selected:null,near=new Set(selected?[selected]:[]);
      for(const e of this.layout.edges){const active=e.id===this.edge||e.from===selected||e.to===selected,group=this.edgeElements.get(e.id);if(active){near.add(e.from);near.add(e.to);}group.classList.toggle('active',active);group.classList.toggle('muted',!!selected&&!active);}
      for(const n of this.layout.nodes){const g=this.nodeElements.get(n.id);g.classList.toggle('selected',n.id===selected);g.classList.toggle('neighbor',n.id!==selected&&near.has(n.id));g.classList.toggle('muted',!!selected&&!near.has(n.id));g.setAttribute('aria-pressed',String(n.id===selected));}
    }
    transform(){if(this.world)this.world.setAttribute('transform',`translate(${this.offset.x} ${this.offset.y}) scale(${this.scale})`);}
    reveal(){const n=this.layout?.nodes.find(n=>n.id===this.selected);if(!n)return;const {width,height}=this.canvas.getBoundingClientRect(),left=n.x*this.scale+this.offset.x,top=n.y*this.scale+this.offset.y;if(left<16||left+n.width*this.scale>width-16||top<16||top+n.height*this.scale>height-16){this.offset={x:width/2-(n.x+n.width/2)*this.scale,y:height/2-(n.y+n.height/2)*this.scale};this.transform();}}
    fit(readable=false){if(!this.layout||!this.active)return;const {width,height}=this.canvas.getBoundingClientRect();if(!width||!height)return;const fitted=Math.max(.05,Math.min(1.2,(width-32)/this.layout.width,(height-32)/this.layout.height));this.scale=readable?Math.max(.85,fitted):fitted;const selected=this.layout.nodes.find(n=>n.id===this.selected);this.offset=this.scale===fitted?{x:(width-this.layout.width*this.scale)/2,y:(height-this.layout.height*this.scale)/2}:selected?{x:width/2-(selected.x+selected.width/2)*this.scale,y:height/2-(selected.y+selected.height/2)*this.scale}:{x:24,y:Math.max(24,(height-this.layout.height*this.scale)/2)};this.fitted=true;this.transform();}
    zoom(factor,point){if(!this.active)return;const r=this.canvas.getBoundingClientRect(),p=point||{x:r.width/2,y:r.height/2},next=Math.max(.05,Math.min(3,this.scale*factor)),ratio=next/this.scale;this.offset={x:p.x-(p.x-this.offset.x)*ratio,y:p.y-(p.y-this.offset.y)*ratio};this.scale=next;this.transform();}
  }
  root.FEMSSchematic=Schematic;
})(window);
