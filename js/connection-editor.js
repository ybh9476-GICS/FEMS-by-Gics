(function(root){
  'use strict';
  const L=root.FEMSConnections,$=id=>document.getElementById(id);
  class ConnectionEditor {
    constructor(api){
      this.api=api;this.selection=null;this.edit=null;this.numeric=null;
      for(const [name,color] of L.palette){const button=document.createElement('button');button.type='button';button.title=name;button.setAttribute('aria-label',name);button.dataset.color=color;button.style.setProperty('--swatch',color);button.addEventListener('click',()=>this.changeStyle({color}));$('connection-palette').append(button);}
      for(const id of ['connection-diameter','connection-x','connection-y','connection-z']){
        const input=$(id);input.addEventListener('input',()=>this.previewNumeric(input));
        input.addEventListener('focusout',()=>{if(!document.body.dataset.numberScrubbing)this.finishNumeric(true);});
      }
      $('connection-properties').addEventListener('number-scrub-start',()=>this.finishNumeric(true));
      $('connection-properties').addEventListener('number-scrub-end',event=>this.finishNumeric(event.detail.commit));
      $('connection-properties').addEventListener('keydown',event=>{if(event.key==='Escape'&&this.numeric){event.preventDefault();event.stopPropagation();this.finishNumeric(false);}});
      root.addEventListener('blur',()=>{if(!document.body.dataset.numberScrubbing)this.finishNumeric(true);});
      $('connection-add').addEventListener('click',()=>this.add());
      $('connection-corner').addEventListener('click',()=>{this.finishNumeric(true);this.corner=!this.corner;this.api.guides({},this.corner);this.render(this.view||'plan');});
      $('connection-delete').addEventListener('click',()=>this.remove());
      const optimizeDialog=$('connection-optimize-dialog');
      $('connection-optimize').addEventListener('click',()=>{
        if(!this.selection)return;
        this.finishNumeric(true);
        const state=this.api.state(),line=L.route(state,this.selection.id);if(!line)return;
        this.optimizeId=line.id;
        const parent=state.equipment.find(e=>e.id===line.parentId),child=state.equipment.find(e=>e.id===line.id);
        $('connection-optimize-target').textContent=`대상 구간: ${line.label||`${parent.name} → ${child.name}`}`;
        optimizeDialog.returnValue='';optimizeDialog.showModal();
      });
      optimizeDialog.addEventListener('keydown',event=>event.stopPropagation());
      optimizeDialog.addEventListener('close',()=>{
        const id=this.optimizeId;this.optimizeId=null;
        if(optimizeDialog.returnValue==='optimize'&&this.selection?.id===id)this.optimize();
      });
      const dialog=$('connection-reset-dialog');
      $('connection-reset').addEventListener('click',()=>{
        if(!this.selection)return;
        this.finishNumeric(true);this.resetId=this.selection.id;
        const scope=L.editScope(this.api.state(),this.resetId);if(!scope)return;
        const external=(L.external.isExternal(this.resetId)||L.floor.isPortal(this.resetId));
        $('connection-reset-target').textContent=`대상: ${scope.name}${external?' (선택한 외부 연결선)':' 연결망 전체'}`;
        $('connection-reset-description').hidden=external;
        $('connection-reset-external-description').hidden=!external;
        dialog.returnValue='';dialog.showModal();
      });
      // Modal keyboard actions must not trigger editor shortcuts behind the popup.
      dialog.addEventListener('keydown',event=>event.stopPropagation());
      dialog.addEventListener('close',()=>{
        const id=this.resetId;this.resetId=null;
        if(dialog.returnValue==='restore'&&this.selection?.id===id)this.apply(()=>{
          const state=this.api.state(),parentId=L.route(state,id).parentId,next=L.resetScope(state,id);
          const replacement=(L.external.isExternal(id)||L.floor.isPortal(id))?L.route(next,id):L.routes(next).find(r=>r.parentId===parentId);this.selection={id:replacement?.id||id,kind:'segment',index:0};return next;
        });
      });
    }
    select(selection){$('connection-feedback').textContent='';this.finishNumeric(true);this.finish(true);if(this.added&&(selection.id!==this.selection?.id||selection.index!==this.selection?.index||selection.kind!==this.selection?.kind))selection=this.finishAdded(selection);if(this.selection?.id!==selection.id||this.selection?.index!==selection.index||selection.kind!=='segment')this.cancelCorner();this.selection=selection;return selection;}
    cancelCorner(){this.corner=false;this.api.guides({},false);}
    clear(){$('connection-feedback').textContent='';this.finishNumeric(true);this.finish(true);this.finishAdded();this.cancelCorner();this.selection=null;}
    apply(build){
      if(!this.selection)return;
      this.finishNumeric(true);
      // Explicit actions (delete, color, optimize) consume a newly added handle.
      if(this.added){this.added=null;this.api.finish(true);}
      this.cancelCorner();
      $('connection-feedback').textContent='';
      try{this.api.commit(build());$('connection-error').textContent='';return true;}
      catch(error){$('connection-error').textContent=error.message;return false;}
    }
    optimize(){
      let removed=0;
      const applied=this.apply(()=>{
        const state=this.api.state(),id=this.selection.id,before=L.route(state,id),next=L.optimize(state,id);
        removed=before.points.length-L.route(next,id).points.length;
        if(removed)this.selection={id,kind:'segment',index:0};
        return next;
      });
      if(applied)$('connection-feedback').textContent=removed?`불필요한 포인트 ${removed}개를 제거했습니다.`:'정리할 포인트가 없습니다. 코너·분기점과 되돌아가는 경로는 유지됩니다.';
    }
    changeStyle(changes){
      if(changes.color){if(this.selection?.kind!=='segment')return;this.apply(()=>{const next=L.setSegmentColor(this.api.state(),this.selection.id,this.selection.index,changes.color),cleaned=L.finishMove({state:next,index:this.selection.index},this.selection.id,'segment');this.selection={...this.selection,index:cleaned.index,kind:cleaned.kind||'segment'};return cleaned.state;});}
      else this.apply(()=>L.setStyle(this.api.state(),this.selection.id,changes));
    }
    previewNumeric(input){
      if(!this.selection)return;
      $('connection-feedback').textContent='';
      if(this.numeric?.input!==input)this.finishNumeric(true);
      if(!this.numeric)this.numeric={input,state:JSON.parse(JSON.stringify(this.api.state())),selection:{...this.selection}};
      try{
        const {state,selection}=this.numeric;let next;
        if(input.id==='connection-diameter')next=L.setStyle(state,selection.id,{diameter:input.valueAsNumber});
        else{const p={...L.route(state,selection.id).points[selection.index]};p[input.id.slice('connection-'.length)]=input.valueAsNumber;const result=L.movePoint(state,selection.id,selection.index,p);this.numeric.result=result;next=result.state;this.selection.index=result.index;}
        this.api.preview(next);input.removeAttribute('aria-invalid');$('connection-error').textContent='';
      }catch(error){input.setAttribute('aria-invalid','true');$('connection-error').textContent=error.message;}
    }
    finishNumeric(commit){
      if(!this.numeric)return;const {input,selection,result}=this.numeric;this.numeric=null;
      if(commit&&result){const cleaned=L.finishMove(result,selection.id);this.selection={...selection,index:cleaned.index,kind:cleaned.kind||selection.kind};this.api.preview(cleaned.state);}
      if(!commit)this.selection=this.added||selection;
      if(result||!commit)this.added=null;
      if(this.added&&commit&&!result)this.finishAdded();else this.api.finish(commit);
      const line=this.selection?L.route(this.api.state(),this.selection.id):null;
      if(line)input.value=input.id==='connection-diameter'?line.diameter:line.points[this.selection.index]?.[input.id.slice('connection-'.length)]??'';
      input.removeAttribute('aria-invalid');$('connection-error').textContent='';
    }
    add(){
      if(this.selection?.kind!=='segment')return;
      this.finishNumeric(true);this.finishAdded();this.cancelCorner();
      try{const result=L.addPoint(this.api.state(),this.selection.id,this.selection.index);this.added={...this.selection};this.selection={id:this.selection.id,kind:'point',index:result.index};this.api.preview(result.state);$('connection-error').textContent='';}
      catch(error){$('connection-error').textContent=error.message;}
    }
    finishAdded(incoming){
      if(!this.added)return incoming;
      this.added=null;
      const target=incoming?.id===this.selection.id?incoming:this.selection;
      const cleaned=L.finishMove({state:this.api.state(),index:target.index},this.selection.id,target.kind);
      this.selection={...this.selection,index:cleaned.index,kind:cleaned.kind||'point'};this.api.preview(cleaned.state);this.api.finish(true);
      return incoming?.id===this.selection.id?{...incoming,index:cleaned.index,kind:cleaned.kind||incoming.kind}:incoming;
    }
    cancelAdded(){if(!this.added)return;this.selection=this.added;this.added=null;this.api.finish(false);}
    remove(){if(this.selection?.kind!=='point')return;this.apply(()=>{const next=L.deletePoint(this.api.state(),this.selection.id,this.selection.index),cleaned=L.finishMove({state:next,index:0},this.selection.id,'segment');this.selection={id:this.selection.id,kind:'segment',index:0};return cleaned.state;});}
    start(hit){this.finishNumeric(true);this.edit={state:JSON.parse(JSON.stringify(this.api.state())),selection:{...hit},corner:this.corner,snap:{}};}
    preview(position,options={}){
      if(!this.edit||this.edit.selection.locked)return;
      try{
        const {state,selection,corner}=this.edit,line=L.route(state,selection.id),isPoint=selection.kind==='point';
        if(!isPoint&&!selection.handle)return;
        if(line.crossSpace){
          const rounded={...position},moving=options.axis==='xz'?['x','z']:options.axis?[options.axis]:['x','z'];
          for(const axis of moving)rounded[axis]=Math.round(position[axis]*100)/100;
          const candidates=[...line.points,...(options.snapPoints||[])],excluded=isPoint?[selection.index]:[selection.index,selection.index+1];
          const snapped=L.snapPosition(candidates,excluded,rounded,options.tolerance,this.edit.snap,moving);
          this.edit.snap=snapped.guides;
          const result=isPoint?L.movePoint(state,selection.id,selection.index,snapped.position):L.moveSegment(state,selection.id,selection.index,snapped.position,{corner});
          this.edit.result=result;this.selection={...selection,index:result.index};this.api.guides({},corner);this.api.preview(result.state);$('connection-error').textContent='';return;
        }
        const axes=isPoint?['x','z']:[Math.abs(line.points[selection.index].z-line.points[selection.index+1].z)<1e-6?'z':'x'];
        // Quantize free dragging before snapping, so alignment to fractional corners stays exact.
        const rounded={x:Math.round(position.x*100)/100,z:Math.round(position.z*100)/100};
        const extra=(line.externalFloor&&options.snapPoints?options.snapPoints:state.version>=2?L.snapCandidates(state,selection.id):[]).filter(p=>!line.points.some(q=>Math.abs(q.x-p.x)<1e-6&&Math.abs(q.z-p.z)<1e-6));
        const snapped=L.snapPosition([...line.points,...extra],isPoint?[selection.index]:[selection.index,selection.index+1],rounded,options.tolerance,this.edit.snap,axes);
        this.edit.snap=snapped.guides;
        const result=isPoint?L.movePoint(state,selection.id,selection.index,snapped.position):L.moveSegment(state,selection.id,selection.index,snapped.position,{corner});
        this.edit.result=result;this.selection={...selection,index:result.index};this.api.guides(snapped.guides,corner);this.api.preview(result.state);$('connection-error').textContent='';
      }
      catch(error){$('connection-error').textContent=error.message;}
    }
    finish(commit){
      if(!this.edit)return;const {selection:original,result}=this.edit;this.edit=null;
      if(commit&&result){const cleaned=L.finishMove(result,original.id,original.kind);this.selection={...original,index:cleaned.index,kind:cleaned.kind||original.kind};this.api.preview(cleaned.state);}
      if(!commit)this.selection=original;
      if(this.added&&(result||!commit)){if(!commit)this.selection=this.added;this.added=null;}
      if(result||!commit)this.cancelCorner();else this.api.guides({},this.corner);
      if(!(this.added&&commit&&!result))this.api.finish(commit);
    }
    render(view){
      this.view=view;
      const state=this.api.state(),line=this.selection?L.route(state,this.selection.id):null;
      if(!line)this.selection=null;
      const visible=(view==='plan'||view==='3d')&&!!line;$('connection-properties').hidden=!visible;
      $('inspector-title').textContent='PROPERTIES';
      if(!visible)return false;
      $('properties').hidden=true;$('inspector-empty').hidden=true;
      for(const action of ['corner','add','delete','optimize','reset'])$('connection-'+action).hidden=false;
      const parent=state.equipment.find(e=>e.id===line.parentId),child=state.equipment.find(e=>e.id===line.id);
      $('connection-scope').textContent=`편집 대상: ${L.editScope(state,line.id).name}${line.externalFloor?' (층별 외부 연결선)':line.crossSpace?' (외부 연결선)':' 연결망 전체'}`;
      $('connection-title').textContent=line.label||`${parent.name} → ${child.name}`;
      if(document.activeElement!==$('connection-diameter'))$('connection-diameter').value=line.diameter;
      const selectedColor=this.selection.kind==='segment'?line.segmentColors[this.selection.index]:null;
      for(const button of $('connection-palette').children){button.disabled=!selectedColor;button.setAttribute('aria-pressed',String(button.dataset.color===selectedColor));}
      const point=this.selection.kind==='point'?line.points[this.selection.index]:null;
      const locked=!!point&&L.isLocked(line,this.selection.index),junction=!!point&&line.pointKinds?.[this.selection.index]==='junction';
      $('connection-selection').textContent=point?junction?'공유 분기점 · 연결된 가지와 함께 이동':`포인트 ${this.selection.index+1} / ${line.points.length}${locked?' · 설비 고정점 (이동·삭제 불가)':line.pointKinds?.[this.selection.index]==='portal'?' · 외부 빌보드 (이동 가능)':''}`:`선분 ${this.selection.index+1} · 부모 → 자식`;
      $('connection-point-fields').hidden=!point;
      $('connection-y-field').hidden=!line.crossSpace;
      for(const axis of ['x','y','z'])$('connection-'+axis).disabled=locked;
      if(point)for(const axis of ['x','y','z'])if(document.activeElement!==$('connection-'+axis))$('connection-'+axis).value=point[axis];
      $('connection-add').disabled=this.selection.kind!=='segment'||!line.points[this.selection.index+1];
      $('connection-corner').disabled=$('connection-add').disabled;
      $('connection-corner').setAttribute('aria-pressed',String(!!this.corner));
      $('connection-corner').textContent=this.corner?'코너 추가 취소':'코너 추가';
      $('connection-edit-hint').textContent=line.crossSpace?(this.corner?'네모 드래그: 코너 추가 · Esc: 취소':point?'화살표: 축 이동 · Y 높이: 속성에서 입력':'중앙 네모 드래그: 선분 이동'):this.corner?'초록 네모를 드래그해 꺾임을 만드세요. Esc: 취소':point?'흰색 포인트 드래그: X·Z 이동 · Shift: 정렬 해제':'중앙 네모 드래그: 선분 이동 · Shift: 정렬 해제';
      $('connection-delete').disabled=!point||!L.canDeletePoint(line,this.selection.index);
      return true;
    }
  }
  root.FEMSConnectionEditor=ConnectionEditor;
})(window);
