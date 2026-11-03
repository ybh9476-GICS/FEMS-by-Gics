(function(root){
  'use strict';
  const L=root.FEMSConnections,$=id=>document.getElementById(id);
  class ConnectionEditor {
    constructor(api){
      this.api=api;this.selection=null;this.edit=null;this.numeric=null;
      for(const [name,color] of L.palette){const button=document.createElement('button');button.type='button';button.title=name;button.setAttribute('aria-label',name);button.dataset.color=color;button.style.setProperty('--swatch',color);button.addEventListener('click',()=>this.changeStyle({color}));$('connection-palette').append(button);}
      for(const id of ['connection-diameter','connection-x','connection-z']){
        const input=$(id);input.addEventListener('input',()=>this.previewNumeric(input));
        input.addEventListener('focusout',()=>{if(!document.body.dataset.numberScrubbing)this.finishNumeric(true);});
      }
      $('connection-properties').addEventListener('number-scrub-start',()=>this.finishNumeric(true));
      $('connection-properties').addEventListener('number-scrub-end',event=>this.finishNumeric(event.detail.commit));
      $('connection-properties').addEventListener('keydown',event=>{if(event.key==='Escape'&&this.numeric){event.preventDefault();event.stopPropagation();this.finishNumeric(false);}});
      root.addEventListener('blur',()=>{if(!document.body.dataset.numberScrubbing)this.finishNumeric(true);});
      $('connection-add').addEventListener('click',()=>this.add());
      $('connection-corner').addEventListener('click',()=>{this.finishNumeric(true);this.corner=!this.corner;this.api.guides({},this.corner);this.render('plan');});
      $('connection-delete').addEventListener('click',()=>this.remove());
      $('connection-optimize').addEventListener('click',()=>this.apply(()=>{const next=L.optimize(this.api.state(),this.selection.id);this.selection={id:this.selection.id,kind:'segment',index:0};return next;}));
      const dialog=$('connection-reset-dialog');
      $('connection-reset').addEventListener('click',()=>{
        if(!this.selection)return;
        this.finishNumeric(true);this.resetId=this.selection.id;dialog.returnValue='';dialog.showModal();
      });
      // Modal keyboard actions must not trigger editor shortcuts behind the popup.
      dialog.addEventListener('keydown',event=>event.stopPropagation());
      dialog.addEventListener('close',()=>{
        const id=this.resetId;this.resetId=null;
        if(dialog.returnValue==='restore'&&this.selection?.id===id)this.apply(()=>{
          const next=L.reset(this.api.state(),id);this.selection={id,kind:'segment',index:0};return next;
        });
      });
    }
    select(selection){this.finishNumeric(true);this.finish(true);if(this.selection?.id!==selection.id||this.selection?.index!==selection.index||selection.kind!=='segment')this.cancelCorner();this.selection=selection;}
    cancelCorner(){this.corner=false;this.api.guides({},false);}
    clear(){this.finishNumeric(true);this.finish(true);this.cancelCorner();this.selection=null;}
    apply(build){
      if(!this.selection)return;
      this.finishNumeric(true);
      this.cancelCorner();
      try{this.api.commit(build());$('connection-error').textContent='';}
      catch(error){$('connection-error').textContent=error.message;}
    }
    changeStyle(changes){this.apply(()=>L.setStyle(this.api.state(),this.selection.id,changes));}
    previewNumeric(input){
      if(!this.selection)return;
      if(this.numeric?.input!==input)this.finishNumeric(true);
      if(!this.numeric)this.numeric={input,state:JSON.parse(JSON.stringify(this.api.state())),selection:{...this.selection}};
      try{
        const {state,selection}=this.numeric;let next;
        if(input.id==='connection-diameter')next=L.setStyle(state,selection.id,{diameter:input.valueAsNumber});
        else{const p={...L.route(state,selection.id).points[selection.index]};p[input.id==='connection-x'?'x':'z']=input.valueAsNumber;const result=L.movePoint(state,selection.id,selection.index,p);this.numeric.result=result;next=result.state;this.selection.index=result.index;}
        this.api.preview(next);input.removeAttribute('aria-invalid');$('connection-error').textContent='';
      }catch(error){input.setAttribute('aria-invalid','true');$('connection-error').textContent=error.message;}
    }
    finishNumeric(commit){
      if(!this.numeric)return;const {input,selection,result}=this.numeric;this.numeric=null;
      if(commit&&result){const cleaned=L.finishMove(result,selection.id);this.selection.index=cleaned.index;this.api.preview(cleaned.state);}
      if(!commit)this.selection=selection;this.api.finish(commit);
      const line=this.selection?L.route(this.api.state(),this.selection.id):null;
      if(line)input.value=input.id==='connection-diameter'?line.diameter:line.points[this.selection.index]?.[input.id==='connection-x'?'x':'z']??'';
      input.removeAttribute('aria-invalid');$('connection-error').textContent='';
    }
    add(){if(this.selection?.kind!=='segment')return;this.apply(()=>{const result=L.addPoint(this.api.state(),this.selection.id,this.selection.index);this.selection={id:this.selection.id,kind:'point',index:result.index};return result.state;});}
    remove(){if(this.selection?.kind!=='point')return;this.apply(()=>{const next=L.deletePoint(this.api.state(),this.selection.id,this.selection.index);this.selection={id:this.selection.id,kind:'segment',index:0};return next;});}
    start(hit){this.finishNumeric(true);this.edit={state:JSON.parse(JSON.stringify(this.api.state())),selection:{...hit},corner:this.corner,snap:{}};}
    preview(position,options={}){
      if(!this.edit||this.edit.selection.locked)return;
      try{
        const {state,selection,corner}=this.edit,line=L.route(state,selection.id),isPoint=selection.kind==='point';
        if(!isPoint&&!selection.handle)return;
        const axes=isPoint?['x','z']:[line.points[selection.index].z===line.points[selection.index+1].z?'z':'x'];
        // Quantize free dragging before snapping, so alignment to fractional corners stays exact.
        const rounded={x:Math.round(position.x*100)/100,z:Math.round(position.z*100)/100};
        const snapped=L.snapPosition(line.points,isPoint?[selection.index]:[selection.index,selection.index+1],rounded,options.tolerance,this.edit.snap,axes);
        this.edit.snap=snapped.guides;
        const result=isPoint?L.movePoint(state,selection.id,selection.index,snapped.position):L.moveSegment(state,selection.id,selection.index,snapped.position,{corner});
        this.edit.result=result;this.selection={...selection,index:result.index};this.api.guides(snapped.guides,corner);this.api.preview(result.state);$('connection-error').textContent='';
      }
      catch(error){$('connection-error').textContent=error.message;}
    }
    finish(commit){
      if(!this.edit)return;const {selection:original,result}=this.edit;this.edit=null;
      if(commit&&result){const cleaned=L.finishMove(result,original.id,original.kind);this.selection={...original,index:cleaned.index};this.api.preview(cleaned.state);}
      if(!commit)this.selection=original;
      if(result||!commit)this.cancelCorner();else this.api.guides({},this.corner);
      this.api.finish(commit);
    }
    render(view){
      const state=this.api.state(),line=this.selection?L.route(state,this.selection.id):null;
      if(!line)this.selection=null;
      const visible=view==='plan'&&!!line;$('connection-properties').hidden=!visible;
      if(!visible)return false;
      $('properties').hidden=true;$('inspector-empty').hidden=true;
      const parent=state.equipment.find(e=>e.id===line.parentId),child=state.equipment.find(e=>e.id===line.id);
      $('connection-title').textContent=`${parent.name} → ${child.name}`;
      if(document.activeElement!==$('connection-diameter'))$('connection-diameter').value=line.diameter;
      for(const button of $('connection-palette').children)button.setAttribute('aria-pressed',String(button.dataset.color===line.color));
      const point=this.selection.kind==='point'?line.points[this.selection.index]:null;
      const locked=!!point&&(this.selection.index===0||this.selection.index===line.points.length-1);
      $('connection-selection').textContent=point?`포인트 ${this.selection.index+1} / ${line.points.length}${locked?' · 설비 고정점 (이동·삭제 불가)':''}`:`선분 ${this.selection.index+1} · 부모 → 자식`;
      $('connection-point-fields').hidden=!point;
      for(const axis of ['x','z'])$('connection-'+axis).disabled=locked;
      if(point)for(const axis of ['x','z'])if(document.activeElement!==$('connection-'+axis))$('connection-'+axis).value=point[axis];
      $('connection-add').disabled=this.selection.kind!=='segment'||!line.points[this.selection.index+1];
      $('connection-corner').disabled=$('connection-add').disabled;
      $('connection-corner').setAttribute('aria-pressed',String(!!this.corner));
      $('connection-corner').textContent=this.corner?'코너 추가 취소':'코너 추가';
      $('connection-edit-hint').textContent=this.corner?'초록 네모를 드래그해 꺾임을 만드세요. Esc: 취소':point?'흰색 포인트 드래그: 이동 · Shift: 정렬 해제':'중앙 네모 드래그: 선분 이동 · Shift: 정렬 해제';
      $('connection-delete').disabled=!point||locked;
      return true;
    }
  }
  root.FEMSConnectionEditor=ConnectionEditor;
})(window);
