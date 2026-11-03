(function (root) {
  'use strict';
  class EquipmentTree {
    constructor(host, search, handlers) {
      this.host=host;this.search=search;this.handlers=handlers;
      this.insertLine=host.ownerDocument.createElement('div');this.insertLine.className='tree-insert-line';this.insertLine.hidden=true;this.insertLine.setAttribute('aria-hidden','true');host.ownerDocument.body.append(this.insertLine);
      this.collapsed=new Set();this.dragged=null;
      search.addEventListener('input',()=>this.render(this.state,this.selected,true));
      root.addEventListener('blur',()=>this.clearDrag());
      host.ownerDocument.addEventListener('keydown',event=>{if(event.key==='Escape'&&this.pointer){event.preventDefault();this.clearDrag();}});
    }
    clearDrag(){const pointer=this.pointer;this.pointer=null;this.dragged=null;this.clearTarget();this.host.querySelectorAll('.drag-source').forEach(e=>e.classList.remove('drag-source'));if(pointer?.row.hasPointerCapture(pointer.id))pointer.row.releasePointerCapture(pointer.id);}
    clearTarget(){this.host.querySelectorAll('.drop-target,.drop-invalid').forEach(e=>e.classList.remove('drop-target','drop-invalid'));this.insertLine.hidden=true;}
    allowed(parentId){
      if(!this.dragged)return false;
      const byId=new Map(this.state.equipment.map(e=>[e.id,e]));
      let id=parentId;
      while(id){if(id===this.dragged)return false;id=byId.get(id)?.parentId;}
      return true;
    }
    dropTarget(event){
      const scroll=this.host.parentElement,bounds=scroll.getBoundingClientRect();
      if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)return null;
      const rows=[...this.host.querySelectorAll('.tree-row')];if(!rows.length)return null;
      const last=rows.at(-1).getBoundingClientRect();
      if(event.clientY>last.bottom+3)return {element:this.host,parentId:null,position:'inside',line:{left:this.host.getBoundingClientRect().left,right:bounds.right-10,y:last.bottom+3}};
      const row=rows.find(e=>event.clientY<=e.getBoundingClientRect().bottom+1.5)||rows.at(-1);
      const rect=row.getBoundingClientRect(),item=this.state.equipment.find(e=>e.id===row.dataset.id);
      const edge=Math.min(8,rect.height/4);
      const position=event.clientY<rect.top+edge?'before':event.clientY>rect.bottom-edge?'after':'inside';
      if(position==='inside')return {element:row,parentId:item.id,position};
      // An insertion line uses the target item's level; after a parent means after its entire subtree.
      return {element:row,parentId:item.parentId||null,referenceId:item.id,position,line:{left:rect.left,right:rect.right,y:position==='before'?rect.top:row.parentElement.getBoundingClientRect().bottom}};
    }
    showTarget(target){
      const valid=this.allowed(target.parentId);
      if(target.line){const line=target.line;this.insertLine.hidden=false;this.insertLine.style.left=line.left+'px';this.insertLine.style.top=(line.y-1)+'px';this.insertLine.style.width=(line.right-line.left)+'px';this.insertLine.classList.toggle('invalid',!valid);}
      else target.element.classList.add(valid?'drop-target':'drop-invalid');
    }
    bindDrag(row,id){
      row.addEventListener('pointerdown',event=>{
        if(event.button!==0||event.target.closest('button'))return;
        this.skipClick=false;this.pointer={id:event.pointerId,row,itemId:id,x:event.clientX,y:event.clientY};
        row.setPointerCapture(event.pointerId);
      });
      row.addEventListener('pointermove',event=>{
        const p=this.pointer;if(!p||event.pointerId!==p.id)return;
        if(!this.dragged&&Math.hypot(event.clientX-p.x,event.clientY-p.y)<5)return;
        event.preventDefault();this.dragged=p.itemId;row.classList.add('drag-source');
        const scroll=this.host.parentElement,rect=scroll.getBoundingClientRect();
        if(event.clientY>rect.top&&event.clientY<rect.top+24)scroll.scrollTop-=18;
        else if(event.clientY<rect.bottom&&event.clientY>rect.bottom-24)scroll.scrollTop+=18;
        this.clearTarget();const target=this.dropTarget(event);
        if(target)this.showTarget(target);
      });
      row.addEventListener('pointerup',event=>{
        if(!this.pointer||event.pointerId!==this.pointer.id)return;
        const dragged=this.dragged,target=this.dropTarget(event),valid=target&&this.allowed(target.parentId);
        this.skipClick=!!dragged;this.clearDrag();
        if(!dragged||!target)return;
        if(valid){if(target.parentId)this.collapsed.delete(target.parentId);this.handlers.reparent(dragged,target.parentId,target.referenceId,target.position);}
        else this.handlers.error('자기 자신이나 하위 설비 안으로 이동할 수 없습니다.');
      });
      row.addEventListener('pointercancel',()=>this.clearDrag());
      row.addEventListener('lostpointercapture',()=>{if(this.pointer)this.clearDrag();});
    }
    render(state,selected,force=false){
      if(!state)return;
      const query=this.search.value.trim().toLowerCase();
      const key=JSON.stringify([state.equipment.map(e=>[e.id,e.parentId,e.name,e.code,e.type]),selected,query]);
      if(!force&&key===this.key)return;
      const selectionChanged=selected!==this.selected;
      this.state=state;this.selected=selected;this.key=key;
      const byId=new Map(state.equipment.map(e=>[e.id,e])),children=new Map();
      for(const item of state.equipment){const parent=item.parentId||null;if(!children.has(parent))children.set(parent,[]);children.get(parent).push(item);}
      if(selectionChanged){let parent=byId.get(selected)?.parentId;while(parent){this.collapsed.delete(parent);parent=byId.get(parent)?.parentId;}}
      const shown=new Set();
      for(const item of state.equipment){
        const def=root.FEMSCatalog.get(item.type);
        if(!query||`${item.name} ${item.code} ${def.name} ${def.en}`.toLowerCase().includes(query)){
          let current=item;while(current){shown.add(current.id);current=byId.get(current.parentId);}
        }
      }
      const focusId=this.host.ownerDocument.activeElement?.closest('[role=treeitem]')?.dataset.id;
      this.host.replaceChildren();
      const build=(parent,container,depth)=>{
        for(const item of children.get(parent)||[]){
          if(!shown.has(item.id))continue;
          const li=document.createElement('li');li.setAttribute('role','treeitem');li.dataset.id=item.id;
          li.setAttribute('aria-label',`${item.code} ${item.name}`);li.setAttribute('aria-selected',String(item.id===selected));
          li.setAttribute('aria-level',String(depth));li.tabIndex=item.id===selected||(!selected&&this.host.childElementCount===0)?0:-1;
          const hasChildren=children.has(item.id),expanded=!!query||!this.collapsed.has(item.id);
          if(hasChildren)li.setAttribute('aria-expanded',String(expanded));
          const row=document.createElement('div');row.className='tree-row';row.dataset.id=item.id;
          const toggle=document.createElement('button');toggle.type='button';toggle.className='tree-toggle';toggle.tabIndex=-1;
          toggle.textContent=hasChildren?(expanded?'▾':'▸'):'·';toggle.disabled=!hasChildren;
          toggle.setAttribute('aria-label',`${item.code} ${expanded?'접기':'펼치기'}`);
          toggle.addEventListener('click',event=>{event.stopPropagation();if(this.collapsed.has(item.id))this.collapsed.delete(item.id);else this.collapsed.add(item.id);this.render(state,this.selected,true);});
          const marker=document.createElement('span');marker.className='tree-marker';marker.style.background=root.FEMSCatalog.get(item.type).color;
          const label=document.createElement('span');label.className='tree-name';
          const name=document.createElement('strong');name.textContent=item.name;label.append(name);
          row.append(toggle,marker,label);row.title=item.name;
          if(hasChildren){const count=document.createElement('span');count.className='tree-count';count.textContent=children.get(item.id).length;row.append(count);}
          row.addEventListener('click',()=>{if(this.skipClick){this.skipClick=false;return;}this.handlers.select(item.id);this.focus(item.id);});
          this.bindDrag(row,item.id);li.append(row);container.append(li);
          if(hasChildren&&expanded){const group=document.createElement('ul');group.setAttribute('role','group');li.append(group);build(item.id,group,depth+1);}
          li.addEventListener('keydown',event=>{
            if(event.target!==li)return;
            const list=[...this.host.querySelectorAll('[role=treeitem]')],index=list.indexOf(li);
            let target;
            if(event.key==='ArrowDown')target=list[Math.min(index+1,list.length-1)];
            else if(event.key==='ArrowUp')target=list[Math.max(0,index-1)];
            else if(event.key==='Home')target=list[0];else if(event.key==='End')target=list.at(-1);
            else if(event.key==='ArrowRight'&&hasChildren){this.collapsed.delete(item.id);this.render(state,this.selected,true);this.focus(item.id);}
            else if(event.key==='ArrowLeft'){if(hasChildren&&expanded){this.collapsed.add(item.id);this.render(state,this.selected,true);this.focus(item.id);}else if(item.parentId)this.focus(item.parentId);}
            else if(event.key==='Enter'||event.key===' '){this.handlers.select(item.id);this.focus(item.id);}
            else return;
            event.preventDefault();event.stopPropagation();target?.focus();
          });
        }
      };
      build(null,this.host,1);
      if(!this.host.querySelector('[tabindex="0"]')){const first=this.host.querySelector('[role=treeitem]');if(first)first.tabIndex=0;}
      if(focusId)this.focus(focusId);
      const selectedNode=[...this.host.querySelectorAll('[role=treeitem]')].find(e=>e.dataset.id===selected);
      if(selectionChanged)selectedNode?.scrollIntoView({block:'nearest'});
      this.host.parentElement.querySelector('.tree-empty').hidden=shown.size>0;
      this.host.parentElement.querySelector('.tree-empty').textContent=query?'검색 결과가 없습니다.':'하단 썸네일로 설비를 배치하세요.';
    }
    focus(id){const node=[...this.host.querySelectorAll('[role=treeitem]')].find(e=>e.dataset.id===id);if(node){this.host.querySelectorAll('[role=treeitem]').forEach(e=>e.tabIndex=-1);node.tabIndex=0;node.focus({preventScroll:true});}}
  }
  root.FEMSEquipmentTree=EquipmentTree;
})(window);
