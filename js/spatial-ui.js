(function(root){
  'use strict';
  const S=root.FEMSSpatial,M=root.FEMSModel,C=root.FEMSCatalog,$=id=>document.getElementById(id);
  const button=(text,action)=>{const el=document.createElement('button');el.type='button';el.textContent=text;el.addEventListener('click',action);return el;};
  class SpatialUI{
    constructor(api){
      this.api=api;this.context={};this.selected=null;this.draft=null;
      this.host=document.createElement('form');this.host.id='spatial-properties';this.host.className='property-sections';this.host.hidden=true;
      this.host.innerHTML=`<div class="property-section"><div class="selection-card"><span id="space-selection-icon"></span><div><strong id="space-selection-type"></strong><small id="space-selection-en"></small></div></div><p id="space-selection-description" class="description"></p></div>
        <fieldset><legend>기본 정보</legend><div class="property-section"><label><span id="space-name-label" class="field-caption">이름</span><input id="space-name" maxlength="80" title="Enter로 적용 · Esc 또는 다른 곳 클릭으로 취소"></label></div></fieldset>
        <fieldset><legend>위치 <span>m</span></legend><div class="property-section"><div class="field-row"><label>X<input name="x" type="number" min="-100000" max="100000" step="any"></label><label>Z<input name="z" type="number" min="-100000" max="100000" step="any"></label></div><label>회전 <span>°</span><div class="rotation-input"><input name="rotation" type="number" min="0" max="359.999" step="any"><button id="space-rotate" type="button" title="90도 회전 (R)">↻ 90°</button></div></label><label id="space-elevation-label">층 배치 높이 <span>m</span><input name="elevation" type="number" min="-100000" max="100000" step="any"></label><p class="live-edit-note">화살표: 축 이동 · 사각형: X·Z 동시 이동<br>↻ 90°: 회전 · Esc: 이동 취소</p></div></fieldset>
        <fieldset><legend><span id="space-size-label" class="field-caption">크기</span> <span>m</span></legend><div class="property-section"><label class="ratio-lock"><input id="space-lock" type="checkbox" checked>비율 고정</label><div class="field-row three"><label>가로<input name="width" type="number" min="0.01" max="100000" step="any"></label><label>세로<input name="depth" type="number" min="0.01" max="100000" step="any"></label><label>높이<input name="height" type="number" min="0.01" max="100000" step="any"></label></div></div></fieldset>
        <div class="property-section"><p class="live-edit-note">이름: Enter로 적용 · Esc 또는 다른 곳 클릭으로 취소<br>위치·회전·크기는 즉시 반영됩니다.</p><p id="space-error" class="error-message" role="alert"></p>
        <div id="space-building-actions" class="property-section"><button type="button" id="space-floor-config">층 등록·수정</button></div>
        <div id="space-floor-actions" class="property-section"><button type="button" id="space-replace-model">층 GLB 교체</button><button type="button" id="space-detach">건물에서 연결 해제</button></div>
        <div class="object-actions"><button id="space-delete" type="button" class="danger">삭제</button></div>
        <p class="dimension-note">내부 설비의 크기와 배치는 유지됩니다.</p><p id="space-warning" class="dimension-note"></p></div>`;
      document.querySelector('.inspector').append(this.host);
      this.registration=document.createElement('dialog');this.registration.id='floor-registration';this.registration.setAttribute('aria-labelledby','floor-registration-title');
      this.registration.innerHTML=`<fieldset><legend>층 등록</legend><div class="property-section"><div class="field-row"><label>지상층 수<input id="floors-above" type="text" inputmode="numeric" pattern="[0-9]+" maxlength="3" value="1"></label><label>지하층 수<input id="floors-below" type="text" inputmode="numeric" pattern="[0-9]+" maxlength="3" value="0"></label></div><label class="ratio-lock"><input id="floors-roof" type="checkbox">옥상 사용</label><p class="dimension-note">옥상은 지상층 수에 포함됩니다. (지상 2층 이상)</p><div class="floor-spacing">층간 높이 <output id="floors-spacing" aria-live="polite"></output><span>자동 계산</span></div></div></fieldset><div id="floor-slots" class="property-section"></div><p id="floor-register-error" class="error-message" role="alert"></p>`;
      const controls=document.createElement('div');controls.className='floor-dialog-controls property-sections';
      while(this.registration.firstChild)controls.append(this.registration.firstChild);
      const position=document.createElement('fieldset');position.id='floors-position';
      position.innerHTML='<legend>전체 층 위치 <span>m</span></legend><div class="property-section"><div class="field-row"><label>X<input id="floors-x" name="x" type="number" min="-100000" max="100000" step="any"></label><label>Z<input id="floors-z" name="z" type="number" min="-100000" max="100000" step="any"></label></div><p class="dimension-note">건물 중심 기준 · 모든 층을 함께 이동합니다.</p></div>';
      controls.prepend(position);
      const actions=document.createElement('footer');actions.className='floor-dialog-actions';actions.innerHTML='<button id="floors-cancel" type="button">취소</button><button id="floors-apply" type="button" class="primary">층 등록 완료</button>';
      this.registration.innerHTML='<header><div><h2 id="floor-registration-title">층 등록·수정</h2><p id="floor-registration-building"></p></div><button id="floors-close" type="button" aria-label="층 등록 닫기">×</button></header><div class="floor-dialog-body"><section class="floor-dialog-preview"><div class="floor-preview-toolbar"><span>배치 미리보기</span><button id="floors-preview" type="button">미리보기 갱신</button></div><div id="floor-preview-scene"><div id="floor-preview-labels" class="equipment-labels"></div></div><p id="floor-preview-note">드래그: 이동 · 우클릭 드래그: 회전 · 휠: 확대/축소</p></section></div>';
      this.registration.querySelector('.floor-dialog-body').append(controls);this.registration.append(actions);document.body.append(this.registration);
      const showBuilding=document.createElement('label');showBuilding.className='ratio-lock floor-preview-toggle';
      showBuilding.innerHTML='<input id="floors-show-building" type="checkbox" checked>반투명 건물 표시';
      this.registration.querySelector('.floor-preview-toolbar').after(showBuilding);
      $('floors-show-building').onchange=()=>this.previewRegistration(false);
      this.bindFloorPosition(position);
      this.registration.addEventListener('keydown',event=>event.stopPropagation());
      this.registration.addEventListener('cancel',event=>{event.preventDefault();this.cancelRegistration();});
      $('floors-close').onclick=()=>this.cancelRegistration();
      this.crumb=document.createElement('nav');this.crumb.className='space-breadcrumb';this.crumb.setAttribute('aria-label','공간 이동');document.querySelector('.history-tools').before(this.crumb);
      this.membership=document.createElement('fieldset');this.membership.innerHTML='<legend>소속 공간</legend><p id="equipment-space-path" class="space-membership-path"></p>';
      $('properties').append(this.membership);
      const power=document.createElement('fieldset');$('properties').append(power);this.powerPicker=new root.FEMSPowerPicker(power,{...api,finish:()=>{this.finish();api.finishEquipmentEdit?.();}});
      this.host.addEventListener('submit',e=>e.preventDefault());
      this.host.addEventListener('input',e=>{if(e.target.type==='number')this.resize(e.target);});
      this.host.addEventListener('focusout',e=>{if(e.target.id==='space-name')this.cancelName();if(!document.body.dataset.numberScrubbing)this.finish();});
      this.host.addEventListener('number-scrub-start',()=>this.finish());
      this.host.addEventListener('number-scrub-end',e=>this.finish(e.detail.commit));
      this.host.addEventListener('keydown',e=>{e.stopPropagation();if(e.isComposing)return;if(e.key==='Escape'){e.preventDefault();this.cancelName();this.finish(false);}if(e.key==='Enter'&&e.target.id==='space-name'){e.preventDefault();this.update({name:e.target.value.trim()});}});
      root.FEMSNumberScrub.install(this.host);
      $('space-rotate').onclick=()=>{this.finish();this.rotate();};
      $('space-floor-config').onclick=()=>this.configure();
      $('space-detach').onclick=()=>this.attempt(()=>{api.commit(S.detachFloor(api.state(),this.selected),'층과 내부 설비를 대지로 이동했습니다.');this.context={};api.refresh();api.fit();});
      $('space-replace-model').onclick=()=>{const id=this.selected;api.registerAsset('floor',def=>{const next=M.clone(api.state()),floor=next.floors.find(f=>f.id===id);if(!floor)return;Object.assign(floor,{type:def.type,width:def.width,depth:def.depth,height:def.height});api.commit(next,'층 GLB를 교체했습니다. 내부 설비는 유지됩니다.');});};
      $('space-delete').onclick=()=>this.remove();
      for(const id of ['floors-above','floors-below']){
        const input=$(id);input.oninput=()=>this.changeCount(input);
        input.onblur=()=>{if(!input.value){input.value='0';this.changeCount(input);}};
      }
      $('floors-roof').onchange=()=>this.generate();$('floors-cancel').onclick=()=>this.cancelRegistration();
      $('floors-preview').onclick=()=>this.previewRegistration();
      $('floors-apply').onclick=()=>this.attempt(()=>{const id=this.draft.buildingId,next=S.registerFloors(api.state(),id,this.draft.slots);if(api.commit(next,'층을 등록했습니다. 실행 취소로 복원할 수 있습니다.')){this.draft=null;this.closeRegistration();this.selected=id;api.refresh();api.fit();}});
    }
    attempt(fn){try{return fn();}catch(error){if(this.draft)$('floor-register-error').textContent=error.message;else $('space-error').textContent=error.message;this.api.toast(error.message);}}
    focusFloor(floorId){
      if(floorId&&this.context.floorId===floorId)return;
      const floor=this.api.state().floors.find(f=>f.id===floorId);
      this.context=floor?.buildingId?{buildingId:floor.buildingId}:{};
    }
    enter(id,billboard=false){const leavingFloor=!!this.context.floorId;this.finish();const state=this.api.state(),k=S.kind(state,id),n=S.get(state,id);if(!k)return;this.selected=id;if(k==='building')this.context={buildingId:id};else if(billboard)this.context={buildingId:n.buildingId,floorId:id};else this.focusFloor(id);this.api.refresh();this.api.fit(this.context.buildingId&&!this.context.floorId?{preserveAngle:true,zoomInOnly:!leavingFloor}:undefined);}
    choose(id,{billboard=false}={}){
      if(this.draft){this.api.toast('층 등록을 완료하거나 취소하세요.');return true;}
      if(id==='@site'){this.finish();this.selected=null;this.context={};this.api.clearEquipment();this.api.disarm();this.api.refresh();this.api.fit();return true;}
      if(!S.get(this.api.state(),id))return false;
      this.api.clearEquipment();this.api.disarm();this.enter(id,billboard);
      return true;
    }
    back(){
      if(this.context.floorId&&this.context.buildingId)this.choose(this.context.buildingId);
      else this.choose('@site');
    }
    clear(){this.finish();this.selected=null;}
    keepSelection(){
      const state=this.api.state();
      if(S.get(state,this.selected)){this.finish();return true;}
      const id=this.context.floorId||this.context.buildingId;
      if(!S.get(state,id))return false;
      this.finish();this.api.clearEquipment();this.selected=id;this.api.disarm();this.api.refresh();return true;
    }
    moveEquipment(ids,floorId,hierarchy=null){
      this.finish();const state=this.api.state(),moving=new Set(ids);
      // Carry the visible equipment subtree, but preserve links to other spaces.
      if(hierarchy){
        const byId=new Map(state.equipment.map(e=>[e.id,e]));
        for(const id of moving)for(const child of state.equipment)if(child.parentId===id&&(child.floorId||null)===(byId.get(id)?.floorId||null))moving.add(child.id);
      }
      let next=S.moveEquipment(state,[...moving],floorId,true);
      if(hierarchy)next=M.moveEquipmentGroup(next,ids,hierarchy.parentId,hierarchy.referenceId,hierarchy.position);
      this.api.clearEquipment();
      if(this.api.commit(next,hierarchy?'설비의 계층과 소속 공간을 변경했습니다.':'설비의 소속 공간을 변경했습니다.')){
        this.focusFloor(floorId);this.selected=null;this.api.selectEquipment?.(ids[0],ids);this.api.refresh();this.api.fit();
      }
    }
    cancelName(){const item=S.get(this.api.state(),this.selected);if(item)$('space-name').value=item.name;}
    update(changes){this.attempt(()=>{const next=M.clone(this.api.state()),item=S.get(next,this.selected);if(!item)return;Object.assign(item,changes);if(this.api.commit(next))this.cancelName();});}
    buildingSizeLocked(){const state=this.api.state();return S.kind(state,this.selected)==='building'&&state.floors.some(f=>f.buildingId===this.selected);}
    syncSizeAvailability(){
      const locked=this.buildingSizeLocked(),hint=locked?'등록된 층이 있는 건물은 크기를 변경할 수 없습니다.':'';
      for(const name of ['width','depth','height']){const input=this.host.elements.namedItem(name);input.disabled=locked;input.title=hint;}
      $('space-lock').disabled=locked;$('space-lock').title=hint;
    }
    resize(input){
      if(this.edit?.input!==input)this.finish();const item=S.get(this.api.state(),this.selected);if(!item)return;
      if(['width','depth','height'].includes(input.name)&&this.buildingSizeLocked()){input.value=item[input.name];return;}
      this.edit??={input,baseline:M.clone(item),state:M.clone(this.api.state()),lock:$('space-lock').checked};
      this.attempt(()=>{const next=M.clone(this.edit.state),target=S.get(next,item.id);Object.assign(target,['width','depth','height'].includes(input.name)?M.resizeDimensions(this.edit.baseline,input.name,input.valueAsNumber,this.edit.lock):{[input.name]:input.valueAsNumber});this.api.preview(next);for(const name of ['width','depth','height'])if(this.host.elements.namedItem(name)!==input)this.host.elements.namedItem(name).value=target[name];$('space-error').textContent='';});
    }
    finish(ok=true){if(!this.edit)return;this.edit=null;this.api.finish(ok);this.fill();}
    remove(){if(!this.selected)return;this.finish();this.attempt(()=>{const next=S.remove(this.api.state(),this.selected);this.selected=null;this.context={};this.api.commit(next,'오브젝트를 삭제했습니다. 하위 항목은 보존되며 실행 취소할 수 있습니다.');});}
    rotate(){const item=S.get(this.api.state(),this.selected);if(item){this.update({rotation:(item.rotation+90)%360});return true;}return false;}
    gizmo(id,pos){const next=M.clone(this.api.state()),item=S.get(next,id);if(!item)return false;Object.assign(item,pos);this.attempt(()=>this.api.preview(next));this.fill();return true;}
    place(type,x,z){const def=C.get(type);if(!['building','floor'].includes(def.kind))return false;this.attempt(()=>{const next=S.upgrade(this.api.state()),item=S.create(next,def,x,z);next[def.kind==='building'?'buildings':'floors'].push(item);this.context={};this.selected=item.id;this.api.clearEquipment();this.api.commit(next,def.name+'을(를) 대지에 배치했습니다.');this.api.disarm();});return true;}
    dropInfo(ids,parentId){
      const state=this.api.state(),list=Array.isArray(ids)?ids:[ids],kinds=list.map(id=>S.kind(state,id)),target=S.kind(state,parentId),site=!parentId||parentId==='@site';
      const invalid=label=>({valid:false,label});
      if(this.draft)return invalid('층 등록을 완료하거나 취소하세요.');
      if(list.includes('@site'))return invalid('대지는 이동할 수 없습니다.');
      if(kinds.some(Boolean)){
        if(list.length!==1)return invalid('건물과 층은 하나씩 이동하세요.');
        if(list[0]===parentId)return invalid('자기 자신으로 이동할 수 없습니다.');
        if(kinds[0]==='building')return site?{valid:true,label:'대지에 유지'}:invalid('건물은 대지에 배치하세요.');
        if(site)return {valid:true,label:'대지로 이동'};
        if(target==='building'){
          const floor=S.get(state,list[0]);if(floor.buildingId&&floor.buildingId!==parentId)return invalid('기존 건물에서 연결을 해제한 뒤 등록하세요.');
          return {valid:true,label:S.get(state,parentId).name+' · 등록할 층 선택'};
        }
        return invalid('층은 건물 또는 대지로 이동하세요.');
      }
      if(site)return {valid:true,label:'대지로 이동'};
      if(target==='floor')return {valid:true,label:this.spacePath(parentId)+'로 이동'};
      if(target==='building')return invalid('설비를 배치할 층을 선택하세요.');
      const equipment=state.equipment.find(e=>e.id===parentId);
      if(equipment){
        const byId=new Map(state.equipment.map(e=>[e.id,e]));
        for(let id=parentId;id;id=byId.get(id)?.parentId)if(list.includes(id))return invalid('자기 자신이나 하위 설비 안으로 이동할 수 없습니다.');
        return {valid:true,label:this.spacePath(equipment.floorId)+' · '+equipment.name+' 하위로 이동'};
      }
      return null;
    }
    spacePath(floorId){const state=this.api.state(),floor=state.floors.find(f=>f.id===floorId),building=state.buildings.find(b=>b.id===floor?.buildingId);return floor?(building?building.name+' > ':'대지 > ')+floor.name:'대지';}
    membershipText(ids){const paths=[...new Set(this.api.state().equipment.filter(e=>ids.includes(e.id)).map(e=>this.spacePath(e.floorId)))];return paths.length>1?'여러 공간 ('+paths.length+'곳)':paths[0]||'대지';}
    reparent(ids,parentId,referenceId=null,position='inside'){
      const state=this.api.state(),list=Array.isArray(ids)?ids:[ids],target=S.get(state,parentId),spatial=list.some(id=>S.kind(state,id));
      const info=this.dropInfo(list,parentId);if(info&&!info.valid){this.api.toast(info.label);return true;}
      const equipment=state.equipment.find(e=>e.id===parentId);
      if(!spatial&&equipment){this.attempt(()=>this.moveEquipment(list,equipment.floorId||null,{parentId,referenceId,position}));return true;}
      if(!spatial&&parentId&&parentId!=='@site'&&!target)return false;
      this.attempt(()=>{
        if(spatial){
          if(list.length!==1)throw new Error('건물과 층은 하나씩 이동하세요.');const id=list[0],k=S.kind(state,id);
          if(k==='building'){if(parentId&&parentId!=='@site')throw new Error('건물은 대지에 배치하세요.');return;}
          if(S.kind(state,parentId)==='building'){this.selected=parentId;this.configure(S.get(state,id).buildingId===parentId?null:id);return;}
          if(parentId&&parentId!=='@site')throw new Error('층은 건물 또는 대지에 배치하세요.');this.api.commit(S.detachFloor(state,id));
        }else{if(target&&S.kind(state,parentId)!=='floor')throw new Error('설비를 배치할 층을 선택하세요.');this.moveEquipment(list,target?.id||null);}
      });return true;
    }
    configure(pendingFloorId=null){
      this.finish();this.api.disarm();const state=this.api.state(),id=this.selected,old=state.floors.filter(f=>f.buildingId===id);if(!state.buildings.some(b=>b.id===id))return;
      const roof=old.some(f=>f.level==='R'),above=Math.max(0,...old.map(f=>Number(/^(\d+)F$/.exec(f.level)?.[1]||0)))+(roof?1:0);
      this.draft={buildingId:id,slots:old.map(f=>({level:f.level||f.name,name:f.name,elevation:f.elevation,floorId:f.id,targetId:f.id,position:{x:f.x,z:f.z},size:{width:f.width,depth:f.depth,height:f.height}})),cache:new Map(),above:old.length?above:1,roof,position:{x:old.length?(Math.min(...old.map(f=>f.x))+Math.max(...old.map(f=>f.x)))/2:0,z:old.length?(Math.min(...old.map(f=>f.z))+Math.max(...old.map(f=>f.z)))/2:0}};
      this.syncFloorPosition();
      this.draft.pendingFloorId=pendingFloorId;
      $('floors-show-building').checked=true;
      $('floors-above').value=String(this.draft.above);$('floors-below').value=String(Math.max(0,...old.map(f=>/^B(\d+)$/.exec(f.level)?.[1]||0)));$('floors-roof').checked=roof;
      for(const name of ['floors-above','floors-below'])$(name).dataset.integerValue=$(name).value;
      $('floor-registration-building').textContent=S.get(state,id).name;
      this.registration.showModal();this.registration.querySelector('.floor-dialog-controls').scrollTop=0;this.generate();this.api.refresh();
    }
    changeCount(input){
      if(!/^\d*$/.test(input.value)){input.value=input.dataset.integerValue||'0';return;}
      if(input.value)input.value=String(Number(input.value));input.dataset.integerValue=input.value;
      this.generate();
    }
    generate(){
      $('floors-apply').disabled=true;
      $('floors-spacing').textContent='—';
      if(!$('floors-above').value||!$('floors-below').value){$('floors-spacing').textContent='—';return;}
      this.attempt(()=>{
        const above=+$('floors-above').value,below=+$('floors-below').value,building=S.get(this.api.state(),this.draft.buildingId);
        $('floors-roof').disabled=above<2;if(above<2)$('floors-roof').checked=false;
        const roof=$('floors-roof').checked,list=S.slots(above,below,roof,building.height),cache=this.draft.cache;
        for(const slot of this.draft.slots)cache.set(slot.level,{...slot});
        // Changing the top floor into a roof must retain its assigned model and equipment.
        if(roof!==this.draft.roof&&above===this.draft.above){
          const from=roof?above+'F':'R',to=roof?'R':above+'F',prior=cache.get(from);
          if(prior){cache.set(to,{...prior,name:prior.name===from||prior.name==='옥상'?(roof?'옥상':to):prior.name});cache.delete(from);}
        }
        const entries=list.map(slot=>{const prior=cache.get(slot.level);return {...slot,position:{...this.draft.position},...(prior?{name:prior.name,floorId:prior.floorId,targetId:prior.targetId,model:prior.model,size:prior.size,locked:prior.locked,position:prior.position||{...this.draft.position}}:{})};});
        this.draft.slots=S.fitFloorSlots(this.api.state(),this.draft.buildingId,entries);
        this.positionEditReset?.();
        this.draft.above=above;this.draft.roof=roof;
        const spacing=building.height/Math.max(1,above-(roof?1:0));
        $('floors-spacing').textContent=Number(spacing.toFixed(4))+' m';
        this.renderSlots();this.previewRegistration();
      });
    }
    renderSlots(){
      this.slotScrubCleanup?.();
      const state=this.api.state(),host=$('floor-slots');host.replaceChildren();$('floor-register-error').textContent='';
      if(this.draft.pendingFloorId){const note=document.createElement('p');note.className='dimension-note';note.textContent=S.get(state,this.draft.pendingFloorId).name+'을 등록할 층을 선택하세요. 기존 층이 있으면 대지로 분리하여 보존합니다.';host.append(note);}
      this.draft.slots.forEach(slot=>{
        const row=document.createElement('div');row.className='floor-slot';
        const title=document.createElement('strong');title.textContent=slot.level==='R'?this.draft.above+'F · 옥상':slot.level;
        const name=document.createElement('input');name.value=slot.name;name.maxLength=80;name.placeholder='층 이름';name.setAttribute('aria-label',slot.level+' 이름');name.oninput=()=>{slot.name=name.value;this.previewRegistration(false);};
        const select=document.createElement('select');select.setAttribute('aria-label',slot.level+' 층 모델');select.add(new Option('기본 층', ''));
        const assets=this.floorAssets(),type=slot.floorId===null&&!slot.model?'':slot.model?.type||S.floorDraftItem(state,this.draft.buildingId,slot).type||'';
        for(const asset of assets)select.add(new Option(asset.name,asset.type));
        if(type&&!assets.some(a=>a.type===type)){const missing=new Option('현재 에셋 (목록 없음)',type);missing.disabled=true;select.add(missing);}select.value=type;
        select.onfocus=()=>{this.draft.selectedLevel=slot.level;this.previewRegistration(false);};
        select.onchange=()=>this.setFloorAsset(slot,select.value);
        select.disabled=!!this.draft.pendingFloorId&&slot.floorId===this.draft.pendingFloorId;
        row.append(title,name,select);
        if(this.draft.pendingFloorId){const assign=button(slot.floorId===this.draft.pendingFloorId?'등록 대상 선택됨':'이 층에 등록',()=>this.assignDroppedFloor(slot));assign.className='floor-assign';row.append(assign);}
        const dimensions=document.createElement('div');dimensions.className='floor-slot-dimensions property-section';
        dimensions.innerHTML='<label class="ratio-lock"><input type="checkbox">비율 고정</label><div class="field-row three"><label>가로 <span>m</span><input name="width" type="number" min="0.01" step="any"></label><label>세로 <span>m</span><input name="depth" type="number" min="0.01" step="any"></label><label>높이 <span>m</span><input name="height" type="number" min="0.01" step="any"></label></div><p class="dimension-note floor-size-limit"></p>';
        const lock=dimensions.querySelector('[type="checkbox"]');lock.checked=slot.locked!==false;lock.setAttribute('aria-label',slot.level+' 비율 고정');lock.onchange=()=>{slot.locked=lock.checked;};
        let baseline=null;
        const sync=()=>{const limits=S.floorSizeLimits(state,this.draft.buildingId,this.draft.slots,slot);for(const input of dimensions.querySelectorAll('[type="number"]')){input.value=Number(slot.size[input.name].toFixed(6));input.max='100000';}dimensions.querySelector('.floor-size-limit').textContent='높이 최대 '+Number(limits.height.toFixed(4))+' m · 건물·층간격 내에서 조절';};
        for(const input of dimensions.querySelectorAll('[type="number"]')){
          input.setAttribute('aria-label',slot.level+' '+({width:'가로',depth:'세로',height:'높이'}[input.name]));
          input.onfocus=()=>{baseline={...slot.size};};
          input.oninput=()=>{
            $('floors-apply').disabled=true;
            this.attempt(()=>{const value=input.valueAsNumber,limits=S.floorSizeLimits(state,this.draft.buildingId,this.draft.slots,slot),next=S.fitFloorSize(baseline||slot.size,limits,input.name,value,lock.checked);slot.size=next;
              for(const other of dimensions.querySelectorAll('[type="number"]'))if(other!==input)other.value=Number(next[other.name].toFixed(6));
              if(Math.abs(next[input.name]-value)>1e-8)input.value=next[input.name];
              this.previewRegistration(false);this.updateSizeLimits();
            });
          };
          input.onblur=()=>{baseline=null;sync();this.previewRegistration(false);};
        }
        dimensions.addEventListener('number-scrub-start',()=>{baseline={...slot.size};});
        dimensions.addEventListener('number-scrub-end',e=>{if(!e.detail.commit&&baseline)slot.size={...baseline};baseline=null;sync();this.previewRegistration(false);this.updateSizeLimits();});
        dimensions.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();e.target.blur();}if(e.key==='Escape'&&baseline){e.preventDefault();slot.size={...baseline};sync();this.previewRegistration(false);}});
        row.append(dimensions);sync();
        host.append(row);
      });
      this.slotScrubCleanup=root.FEMSNumberScrub.install(host);
    }
    updateSizeLimits(){
      const rows=$('floor-slots').querySelectorAll('.floor-slot');this.draft.slots.forEach((slot,i)=>{const limits=S.floorSizeLimits(this.api.state(),this.draft.buildingId,this.draft.slots,slot);rows[i].querySelector('.floor-size-limit').textContent='높이 최대 '+Number(limits.height.toFixed(4))+' m · 건물·층간격 내에서 조절';});
    }
    assignDroppedFloor(slot){this.attempt(()=>{
      const source=S.get(this.api.state(),this.draft.pendingFloorId);if(!source)return;
      if(slot.floorId===source.id)return;
      const restore=s=>s.floorId===source.id&&this.draft.assignmentOriginal?{...M.clone(this.draft.assignmentOriginal),level:s.level,elevation:s.elevation}:s;
      const entries=M.clone(this.draft.slots).map(restore),target=entries.find(s=>s.level===slot.level);if(!target)throw new Error('등록할 층을 다시 선택하세요.');
      const original=M.clone(target),cache=new Map([...this.draft.cache].map(([key,value])=>[key,restore(value)]));
      Object.assign(target,{floorId:source.id,targetId:source.id,name:source.name,position:{...this.draft.position},size:{width:source.width,depth:source.depth,height:source.height}});delete target.model;
      this.draft.slots=S.fitFloorSlots(this.api.state(),this.draft.buildingId,entries);this.draft.assignmentOriginal=original;this.draft.cache=cache;this.renderSlots();this.previewRegistration(false);
    });}
    floorAssets(){return (this.api.state().project?.assets||[]).filter(a=>a.kind==='floor');}
    setFloorAsset(slot,type){
      this.attempt(()=>{
        const def=type?this.floorAssets().find(a=>a.type===type):null;
        if(type&&!def)throw new Error('하단 패널에서 층 에셋을 먼저 등록하세요.');
        const candidate={...slot,floorId:null};delete candidate.size;delete candidate.model;
        if(def)candidate.model={type:def.type,name:def.name,width:def.width,depth:def.depth,height:def.height};
        const entries=this.draft.slots.map(s=>s===slot?candidate:s);
        this.draft.slots=S.fitFloorSlots(this.api.state(),this.draft.buildingId,entries);this.renderSlots();this.previewRegistration(false);
      });
    }
    syncFloorPosition(){if(this.draft)for(const axis of ['x','z'])$('floors-'+axis).value=Number(this.draft.position[axis].toFixed(6));}
    bindFloorPosition(host){
      let baseline=null;
      this.positionEditReset=()=>{baseline=null;};
      const start=()=>{baseline={slots:M.clone(this.draft.slots),position:{...this.draft.position},cache:new Map([...this.draft.cache].map(([k,v])=>[k,M.clone(v)]))};};
      const restore=()=>{if(baseline){this.draft.slots=baseline.slots;this.draft.position=baseline.position;this.draft.cache=baseline.cache;}baseline=null;this.syncFloorPosition();this.renderSlots();this.previewRegistration(false);};
      for(const axis of ['x','z']){
        const input=$('floors-'+axis);input.onfocus=start;
        input.oninput=()=>{if(!baseline)start();$('floors-apply').disabled=true;this.attempt(()=>{
          const result=S.moveFloorSlots(this.api.state(),this.draft.buildingId,baseline.slots,axis,input.valueAsNumber-baseline.position[axis]);
          this.draft.slots=result.slots;this.draft.position={...baseline.position,[axis]:baseline.position[axis]+result.delta};
          this.draft.cache=new Map([...baseline.cache].map(([key,slot])=>{const item=S.floorDraftItem(this.api.state(),this.draft.buildingId,slot);return [key,{...slot,position:{x:item.x,z:item.z,[axis]:item[axis]+result.delta}}];}));
          if(Math.abs(input.valueAsNumber-this.draft.position[axis])>1e-8)input.value=this.draft.position[axis];
          this.renderSlots();this.previewRegistration(false);
        });};
        input.onblur=()=>{baseline=null;this.syncFloorPosition();this.previewRegistration(false);};
        input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();input.blur();}if(e.key==='Escape'&&baseline){e.preventDefault();restore();}};
      }
      host.addEventListener('number-scrub-start',start);host.addEventListener('number-scrub-end',e=>{if(!e.detail.commit)restore();else{baseline=null;this.syncFloorPosition();}});
      root.FEMSNumberScrub.install(host);
    }
    refitSlots(){
      $('floors-apply').disabled=true;this.attempt(()=>{this.draft.slots=S.fitFloorSlots(this.api.state(),this.draft.buildingId,this.draft.slots);this.renderSlots();this.previewRegistration(false);});
    }
    previewRegistration(fit=true){
      $('floors-apply').disabled=true;
      if(!$('floors-above').value||!$('floors-below').value)return;
      this.attempt(()=>{
        $('floor-register-error').textContent='';
        S.slots(+$('floors-above').value,+$('floors-below').value,$('floors-roof').checked,S.get(this.api.state(),this.draft.buildingId).height);
        const next=M.validate(S.registerFloors(this.api.state(),this.draft.buildingId,this.draft.slots)),view=S.view(next,{buildingId:this.draft.buildingId,preview:true});
        view.hideGround=true;view.equipment=view.equipment.filter(e=>$('floors-show-building').checked||!e.buildingShell).map(e=>({...e,noGizmo:true}));
        if(!this.previewScene){const noop=()=>{};this.previewScene=new root.FEMSScene($('floor-preview-scene'),$('floor-preview-labels'),{select:noop,place:noop,move:noop,gizmoStart:noop,gizmoPreview:noop,gizmoEnd:noop,error:message=>{$('floor-preview-note').textContent=message;}});}
        const selected=next.floors.find(f=>f.buildingId===this.draft.buildingId&&f.level===this.draft.selectedLevel)?.id||null;
        this.previewScene.setState(view,selected,new Set());this.previewScene.resize();if(fit)this.previewScene.fit();$('floor-register-error').textContent='';
        $('floors-apply').disabled=!$('floors-above').value||!$('floors-below').value||+$('floors-above').value>100||+$('floors-below').value>100||!!this.draft.pendingFloorId&&!this.draft.slots.some(s=>s.floorId===this.draft.pendingFloorId);
      });
    }
    closeRegistration(){this.registration.close();if(this.previewScene)this.previewScene.setState({...S.view(this.api.state(),{}),equipment:[],hideConnections:true},null,new Set());}
    cancelRegistration(){if(!this.draft)return;this.draft=null;this.closeRegistration();this.api.refresh();}
    reset(){this.finish();this.powerPicker?.close();this.selected=null;this.context={};this.draft=null;this.closeRegistration();}
    display(state){return S.view(state,this.context);}
    fill(){const item=S.get(this.api.state(),this.selected);if(!item)return;for(const name of ['x','z','rotation','width','depth','height','elevation']){const input=this.host.elements.namedItem(name);if(input!==document.activeElement)input.value=item[name]??0;}if(document.activeElement!==$('space-name'))$('space-name').value=item.name;}
    render(preserve=false){
      const state=this.api.state();if(this.selected&&!S.get(state,this.selected))this.selected=null;
      if(this.context.floorId&&!state.floors?.some(f=>f.id===this.context.floorId))this.context={};if(this.context.buildingId&&!state.buildings?.some(b=>b.id===this.context.buildingId))this.context={};
      if(this.draft||this.locked){for(const id of ['new','open','save','export-default','site-edit','asset-open'])$(id).disabled=!!this.draft;this.locked=!!this.draft;}
      if(this.draft){$('undo').disabled=$('redo').disabled=true;}
      const item=S.get(state,this.selected),k=S.kind(state,this.selected);this.host.hidden=!item;
      if(item||this.draft){$('properties').hidden=$('project-properties').hidden=$('inspector-empty').hidden=$('connection-properties').hidden=true;}
      if(item){
        this.syncSizeAvailability();
        const def=C.get(item.type),building=k==='building';
        $('space-selection-type').textContent=building?'건물':'층';
        $('space-selection-en').textContent=building?'Building':'Floor';
        $('space-selection-description').textContent=def?.missing?def.description:building?'층과 설비가 배치되는 건물입니다. 층 이름표를 선택하여 해당 층으로 이동합니다.':'건물 내부의 설비를 배치하는 공간입니다. 이 층에 배치된 설비를 관리합니다.';
        $('space-selection-icon').innerHTML='<span class="equipment-icon"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="'+(building?'M6 29V5h20v24M3 29h26M11 29v-7h10v7M11 10h2m6 0h2M11 15h2m6 0h2':'M3 13 16 6l13 7-13 7zM3 18l13 7 13-7M3 23l13 7 13-7')+'"/></svg></span>';
        $('space-name-label').textContent=k==='building'?'건물 이름':'층 이름';$('space-size-label').textContent=k==='building'?'건물 크기':'층 크기';$('space-elevation-label').hidden=k!=='floor';$('space-building-actions').hidden=k!=='building';$('space-floor-actions').hidden=k!=='floor';$('space-detach').disabled=!item.buildingId;
        $('space-warning').textContent=S.warnings(state).join('\n');if(!preserve&&!this.edit)this.fill();
      }
      const navigation=button('',()=>this.back()),inside=!!(this.context.buildingId||this.context.floorId);
      navigation.className='space-navigation';navigation.disabled=!inside;navigation.setAttribute('aria-label',inside?'뒤로가기':'홈');navigation.title=inside?'상위 씬으로 이동':'대지';
      navigation.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+(inside?'M19 12H5m7-7-7 7 7 7':'m3 10 9-7 9 7M5 9v12h14V9M9 21v-8h6v8')+'"/></svg>';
      this.crumb.replaceChildren(navigation,button('대지',()=>this.choose('@site')));
      const b=state.buildings?.find(b=>b.id===this.context.buildingId),f=state.floors?.find(f=>f.id===this.context.floorId);
      if(b)this.crumb.append(document.createTextNode(' › '),button(b.name,()=>this.enter(b.id)));
      if(f)this.crumb.append(document.createTextNode(' › '),button(f.name,()=>this.choose(f.id)));
      for(const item of this.crumb.querySelectorAll('button:not(.space-navigation)'))item.title=item.textContent;
      this.crumb.lastElementChild.setAttribute('aria-current','location');
      if(!preserve){
        const ids=this.api.selectedIds();$('equipment-space-path').textContent=this.membershipText(ids);
        this.powerPicker?.update();
      }
    }
  }
  root.FEMSSpatialUI=SpatialUI;
})(window);
