(function (root) {
  'use strict';
  class EquipmentTree {
    constructor(host, search, handlers) {
      this.host=host;this.search=search;this.handlers=handlers;
      this.insertLine=host.ownerDocument.createElement('div');this.insertLine.className='tree-insert-line';this.insertLine.hidden=true;this.insertLine.setAttribute('aria-hidden','true');host.ownerDocument.body.append(this.insertLine);
      this.dropHint=host.ownerDocument.createElement('div');this.dropHint.className='tree-drop-hint';this.dropHint.hidden=true;this.dropHint.setAttribute('role','status');host.ownerDocument.body.append(this.dropHint);
      this.collapsed=new Set();this.dragged=null;
      this.selectedIds=[];this.anchor=null;
      host.setAttribute('aria-multiselectable','true');
      search.addEventListener('input',()=>this.render(this.state,this.selected,true,this.selectedIds));
      root.addEventListener('blur',()=>this.clearDrag());
      host.ownerDocument.addEventListener('keydown',event=>{if(event.key==='Escape'&&this.pointer){event.preventDefault();this.clearDrag();}});
    }
    static nextSelection(current,anchor,visible,id,event){
      const additive=event.ctrlKey||event.metaKey;
      if(event.shiftKey&&visible.includes(anchor)){
        const a=visible.indexOf(anchor),b=visible.indexOf(id),range=visible.slice(Math.min(a,b),Math.max(a,b)+1);
        return {ids:[...new Set(additive?[...current,...range]:range)],anchor};
      }
      return {ids:additive?(current.includes(id)?current.filter(key=>key!==id):[...current,id]):[id],anchor:id};
    }
    choose(id,event){
      const visible=[...this.host.querySelectorAll('[role=treeitem]')].map(row=>row.dataset.id).filter(Boolean);
      const next=EquipmentTree.nextSelection(this.selectedIds,this.anchor,visible,id,event);this.anchor=next.anchor;
      this.selecting=true;try{this.handlers.select(id,next.ids);}finally{this.selecting=false;}
      this.focus(id);
    }
    clearDrag(){const pointer=this.pointer;this.pointer=null;this.dragged=null;this.draggedIds=null;this.clearTarget();this.host.querySelectorAll('.drag-source').forEach(e=>e.classList.remove('drag-source'));if(pointer?.row.hasPointerCapture(pointer.id))pointer.row.releasePointerCapture(pointer.id);}
    clearTarget(){this.host.querySelectorAll('.drop-target,.drop-invalid').forEach(e=>e.classList.remove('drop-target','drop-invalid'));this.insertLine.hidden=true;if(this.dropHint)this.dropHint.hidden=true;}
    allowed(parentId,referenceId){
      if(!this.dragged)return false;
      if(this.handlers?.dropInfo?.(this.draggedIds||[this.dragged],parentId)?.valid===false)return false;
      const moving=new Set(this.draggedIds||[this.dragged]);
      if(referenceId&&moving.has(referenceId))return false;
      const byId=new Map(this.state.equipment.map(e=>[e.id,e]));
      let id=parentId;
      while(id){if(moving.has(id))return false;id=byId.get(id)?.parentId;}
      return true;
    }
    dropTarget(event){
      const scroll=this.host.parentElement,bounds=scroll.getBoundingClientRect();
      if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)return null;
      if(this.documentRow){const rect=this.documentRow.getBoundingClientRect();if(event.clientY>=rect.top&&event.clientY<=rect.bottom)return {element:this.documentRow,parentId:null,position:'inside'};}
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
      const valid=this.allowed(target.parentId,target.referenceId);
      if(target.line){const line=target.line;this.insertLine.hidden=false;this.insertLine.style.left=line.left+'px';this.insertLine.style.top=(line.y-1)+'px';this.insertLine.style.width=(line.right-line.left)+'px';this.insertLine.classList.toggle('invalid',!valid);}
      else target.element.classList.add(valid?'drop-target':'drop-invalid');
      if(this.dropHint){const info=this.handlers.dropInfo?.(this.draggedIds||[this.dragged],target.parentId),rect=target.element.getBoundingClientRect();this.dropHint.textContent=valid?(info?.label||(target.parentId?'전력 계층 변경':'최상위로 이동')):info?.valid===false?info.label:'자기 자신이나 하위 항목으로 이동할 수 없습니다.';this.dropHint.hidden=false;this.dropHint.classList.toggle('invalid',!valid);this.dropHint.style.left=Math.max(8,rect.left)+'px';this.dropHint.style.top=Math.max(8,Math.min(rect.bottom+4,this.host.ownerDocument.documentElement.clientHeight-48))+'px';}
    }
    bindDrag(row,id){
      row.addEventListener('pointerdown',event=>{
        if(event.button!==0||event.target.closest('button')||event.ctrlKey||event.metaKey||event.shiftKey)return;
        this.skipClick=false;this.pointer={id:event.pointerId,row,itemId:id,ids:this.selectedIds.includes(id)?[...this.selectedIds]:[id],x:event.clientX,y:event.clientY};
        row.setPointerCapture(event.pointerId);
      });
      row.addEventListener('pointermove',event=>{
        const p=this.pointer;if(!p||event.pointerId!==p.id)return;
        if(!this.dragged&&Math.hypot(event.clientX-p.x,event.clientY-p.y)<5)return;
        event.preventDefault();this.dragged=p.itemId;this.draggedIds=p.ids;
        this.host.querySelectorAll('.tree-row').forEach(source=>source.classList.toggle('drag-source',p.ids.includes(source.dataset.id)));
        const scroll=this.host.parentElement,rect=scroll.getBoundingClientRect();
        if(event.clientY>rect.top&&event.clientY<rect.top+24)scroll.scrollTop-=18;
        else if(event.clientY<rect.bottom&&event.clientY>rect.bottom-24)scroll.scrollTop+=18;
        this.clearTarget();const target=this.dropTarget(event);
        if(target)this.showTarget(target);
      });
      row.addEventListener('pointerup',event=>{
        if(!this.pointer||event.pointerId!==this.pointer.id)return;
        const dragged=this.dragged,ids=this.draggedIds,target=this.dropTarget(event),valid=target&&this.allowed(target.parentId,target.referenceId),info=target&&this.handlers.dropInfo?.(ids||[dragged],target.parentId);
        this.skipClick=!!dragged;this.clearDrag();
        if(!dragged||!target)return;
        if(valid){if(target.parentId)(this.searchQuery?this.searchCollapsed:this.collapsed).delete(target.parentId);this.handlers.reparent(ids.length>1?ids:dragged,target.parentId,target.referenceId,target.position);}
        else this.handlers.error(info?.valid===false?info.label:'자기 자신이나 하위 설비 안으로 이동할 수 없습니다.');
      });
      row.addEventListener('pointercancel',()=>this.clearDrag());
      row.addEventListener('lostpointercapture',()=>{if(this.pointer)this.clearDrag();});
    }
    render(state,selected,force=false,selectedIds=selected?[selected]:[]){
      if(!state)return;
      const query=this.search.value.trim().toLowerCase();
      if(query!==this.searchQuery){this.searchCollapsed=new Set();this.searchDocumentCollapsed=false;this.searchQuery=query;}
      const collapsed=query?this.searchCollapsed:this.collapsed;
      const key=JSON.stringify([!!this.projectSelected,state.name,state.equipment.map(e=>[e.id,e.parentId,e.name,e.code,e.type]),selected,selectedIds,query]);
      if(!force&&key===this.key)return;
      const selectionChanged=selected!==this.selected||JSON.stringify(selectedIds)!==JSON.stringify(this.selectedIds);
      this.state=state;this.selected=selected;this.selectedIds=[...selectedIds];this.key=key;
      if(!this.selecting&&selectionChanged)this.anchor=selected;
      const byId=new Map(state.equipment.map(e=>[e.id,e])),children=new Map();
      for(const item of state.equipment){const parent=item.parentId||null;if(!children.has(parent))children.set(parent,[]);children.get(parent).push(item);}
      if(selectionChanged){if(selectedIds.length){if(query)this.searchDocumentCollapsed=false;else this.documentCollapsed=false;}let parent=byId.get(selected)?.parentId;while(parent){collapsed.delete(parent);parent=byId.get(parent)?.parentId;}}
      const shown=new Set();
      for(const item of state.equipment){
        const def=root.FEMSCatalog.get(item.type);
        if(!query||`${item.name} ${item.code} ${def.name} ${def.en}`.toLowerCase().includes(query)){
          shown.add(item.id);
          if(query){let parent=item.parentId;while(parent&&!shown.has(parent)){shown.add(parent);parent=byId.get(parent)?.parentId;}}
        }
      }
      if(query){
        // Keep each matching item's ancestry; omit unrelated branches without changing the document.
        for(const [parent,items] of children){const visible=items.filter(item=>shown.has(item.id));if(visible.length)children.set(parent,visible);else children.delete(parent);}
      }
      const focusId=this.host.ownerDocument.activeElement?.closest('[role=treeitem]')?.dataset.id;
      this.host.replaceChildren();
      this.documentRow=null;this.documentNode=null;
      const build=(parent,container,depth)=>{
        for(const item of children.get(parent)||[]){
          if(!shown.has(item.id))continue;
          const li=document.createElement('li');li.setAttribute('role','treeitem');li.dataset.id=item.id;
          li.setAttribute('aria-label',[item.code,item.name].filter(Boolean).join(' '));li.setAttribute('aria-selected',String(selectedIds.includes(item.id)));
          li.setAttribute('aria-level',String(depth));li.tabIndex=item.id===selected||(!selected&&this.host.childElementCount===0)?0:-1;
          const hasChildren=children.has(item.id),expanded=!collapsed.has(item.id);
          if(hasChildren)li.setAttribute('aria-expanded',String(expanded));
          const row=document.createElement('div');row.className='tree-row';row.dataset.id=item.id;
          const spaceKind=item.id==='@site'?'site':state.buildings?.some(b=>b.id===item.id)?'building':state.floors?.some(f=>f.id===item.id)?'floor':null;
          if(spaceKind)row.dataset.spaceKind=spaceKind;
          const toggle=document.createElement('button');toggle.type='button';toggle.className='tree-toggle';toggle.tabIndex=-1;
          toggle.textContent=hasChildren?(expanded?'▾':'▸'):'·';toggle.disabled=!hasChildren;
          toggle.setAttribute('aria-label',`${item.code||item.name} ${expanded?'접기':'펼치기'}`);
          toggle.addEventListener('click',event=>{event.stopPropagation();if(collapsed.has(item.id))collapsed.delete(item.id);else collapsed.add(item.id);this.render(state,this.selected,true,this.selectedIds);});
          const label=document.createElement('span');label.className='tree-name';
          const name=document.createElement('strong');name.textContent=item.name;label.append(name);
          row.append(toggle,label);row.title=item.name;
          if(hasChildren){const count=document.createElement('span');count.className='tree-count';count.textContent=children.get(item.id).length;row.append(count);}
          row.addEventListener('click',event=>{if(this.skipClick){this.skipClick=false;return;}this.choose(item.id,event);});
          this.bindDrag(row,item.id);li.append(row);container.append(li);
          if(hasChildren&&expanded){const group=document.createElement('ul');group.setAttribute('role','group');li.append(group);build(item.id,group,depth+1);}
          li.addEventListener('keydown',event=>{
            if(event.target!==li)return;
            const list=[...this.host.querySelectorAll('[role=treeitem]')],index=list.indexOf(li);
            let target;
            if(event.key==='ArrowDown')target=list[Math.min(index+1,list.length-1)];
            else if(event.key==='ArrowUp')target=list[Math.max(0,index-1)];
            else if(event.key==='Home')target=list[0];else if(event.key==='End')target=list.at(-1);
            else if(event.key==='ArrowRight'&&hasChildren){collapsed.delete(item.id);this.render(state,this.selected,true,this.selectedIds);this.focus(item.id);}
            else if(event.key==='ArrowLeft'){if(hasChildren&&expanded){collapsed.add(item.id);this.render(state,this.selected,true,this.selectedIds);this.focus(item.id);}else if(item.parentId)this.focus(item.parentId);else this.documentNode?.focus();}
            else if(event.key==='Enter'||event.key===' '){this.choose(item.id,event);}
            else return;
            event.preventDefault();event.stopPropagation();if(target?.dataset.id&&event.shiftKey)this.choose(target.dataset.id,event);else target?.focus();
          });
        }
      };
      if(!query||shown.size){
        const documentCollapsed=query?this.searchDocumentCollapsed:this.documentCollapsed;
        const node=document.createElement('li');node.className='tree-document';node.setAttribute('role','treeitem');node.setAttribute('aria-label',state.name);node.setAttribute('aria-selected',String(!!this.projectSelected));node.setAttribute('aria-level','1');node.setAttribute('aria-expanded',String(!documentCollapsed));node.tabIndex=selectedIds.length?-1:0;
        const row=document.createElement('div');row.className='tree-document-row';row.title=state.name+' · 드래그하여 최상위로 이동';
        const toggle=document.createElement('button');toggle.type='button';toggle.className='tree-toggle';toggle.tabIndex=-1;toggle.textContent=documentCollapsed?'▸':'▾';toggle.setAttribute('aria-label','프로젝트 '+(documentCollapsed?'펼치기':'접기'));
        const name=document.createElement('strong');name.id='project-name';name.textContent=state.name;
        row.append(toggle,name);node.append(row);this.host.append(node);this.documentNode=node;this.documentRow=row;
        const expand=value=>{if(query)this.searchDocumentCollapsed=!value;else this.documentCollapsed=!value;this.render(this.state,this.selected,true,this.selectedIds);this.documentNode.focus();};
        toggle.addEventListener('click',event=>{event.stopPropagation();expand(documentCollapsed);});
        const selectProject=()=>{if(this.handlers.selectProject)this.handlers.selectProject();else this.handlers.select(null,[]);this.documentNode?.focus();};
        row.addEventListener('click',selectProject);
        node.addEventListener('keydown',event=>{
          if(event.target!==node)return;
          if(event.key==='ArrowRight'){if(documentCollapsed)expand(true);else this.host.querySelector('[role=treeitem][data-id]')?.focus();}
          else if(event.key==='ArrowLeft')expand(false);
          else if(event.key==='ArrowDown')this.host.querySelector('[role=treeitem][data-id]')?.focus();
          else if(event.key==='End'){const items=this.host.querySelectorAll('[role=treeitem][data-id]');items[items.length-1]?.focus();}
          else if(event.key==='Enter'||event.key===' ')selectProject();
          else return;
          event.preventDefault();event.stopPropagation();
        });
        if(!documentCollapsed){const group=document.createElement('ul');group.setAttribute('role','group');node.append(group);build(null,group,2);}
      }
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
