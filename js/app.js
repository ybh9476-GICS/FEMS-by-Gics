(function () {
  'use strict';
  const C=window.FEMSCatalog, M=window.FEMSModel, $=id=>document.getElementById(id);
  let initial=window.FEMSDefaults.seed(window.FEMSDefaultLayout), startupMessage='', autosaveAllowed=true, storageFailed=false;
  try {const saved=localStorage.getItem(M.STORAGE_KEY);if(saved)initial=M.validate(JSON.parse(saved));}
  catch(error){autosaveAllowed=false;startupMessage='이전 작업을 읽지 못했습니다. 원본 보존을 위해 자동 저장을 중지했습니다. 파일 열기·도면 저장은 사용할 수 있습니다.';}
  const history=new M.History(initial);let selected=null,selectedIds=[],armed=null,view='3d',scene=null,tree=null,links=null,toastTimer;
  const branchBackupKey=M.STORAGE_KEY+'-before-shared-branches';
  let branchMigrationMessage='';
  if(autosaveAllowed&&history.current.version===1){
    try{
      const upgraded=M.validate(window.FEMSConnections.enableShared(history.current)),backup=localStorage.getItem(M.STORAGE_KEY)||JSON.stringify(history.current);
      const previous=localStorage.getItem(branchBackupKey);
      if(previous&&previous!==backup)localStorage.setItem(branchBackupKey+'-'+Date.now(),previous);
      localStorage.setItem(branchBackupKey,backup);
      localStorage.setItem(M.STORAGE_KEY,JSON.stringify(upgraded));
      history.current=upgraded;branchMigrationMessage='기존 도면을 백업하고 공유 분기점 구조로 변환했습니다.';
    }catch(error){autosaveAllowed=false;startupMessage='공유 분기점 변환을 완료하지 못해 원본을 유지합니다. '+error.message;}
  }
  let propertyEdit = null,groupFrame=null,groupRatioLock=null;
  function currentGroup(){if(!groupFrame)groupFrame=M.groupBounds(history.current,selectedIds);return M.groupBounds(history.current,selectedIds,groupFrame);}
  function syncGroup(exceptInput=null){const values=currentGroup();for(const name of ['x','z','rotation','width','depth','height']){const input=$('properties').elements.namedItem(name);if(input!==exceptInput)input.value=Number(values[name].toFixed(6));}}

  const dimensionFields = ['width', 'depth', 'height'];
  function syncDimensions(item, exceptInput = null) {
    for (const name of dimensionFields) {
      const input = $('properties').elements.namedItem(name);
      if (input !== exceptInput) input.value = item[name];
    }
  }
  function finishPropertyEdit(commit = true) {
    if (!propertyEdit) return;
    const { input, id, group, frame } = propertyEdit;
    propertyEdit = null;
    const changed = history.finishEdit(commit);
    if(group){if(!commit)groupFrame=frame;syncGroup();}
    const item = history.current.equipment.find(e => e.id === id);
    if (item) { input.value = item[input.name]; syncDimensions(item); }
    input.removeAttribute('aria-invalid');
    $('property-error').textContent = '';
    if (changed) saveLocal();
    if (!commit && changed) render(true);
    $('undo').disabled = !history.past.length;
    $('redo').disabled = !history.future.length;
  }
  function updateProperty(input) {
    const isName=input.name==='name';
    if (input.disabled || (!selected && selectedIds.length<2) || (!isName&&!input.matches('input[type=number]'))) return;
    if(selectedIds.length>1){
      if(propertyEdit&&propertyEdit.input!==input)finishPropertyEdit();
      if(!propertyEdit)propertyEdit={input,group:true,ids:[...selectedIds],state:M.clone(history.current),frame:{...currentGroup()}};
      try{const result=M.transformGroup(propertyEdit.state,propertyEdit.ids,propertyEdit.frame,input.name,input.valueAsNumber);
        const changed=history.preview(result.state);groupFrame=result.frame;syncGroup(input);input.removeAttribute('aria-invalid');$('property-error').textContent='';
        if(changed){saveLocal();render(true);}
      }catch(error){input.setAttribute('aria-invalid','true');$('property-error').textContent=error.message;}
      return;
    }
    if (propertyEdit && propertyEdit.input !== input) finishPropertyEdit();
    if (!propertyEdit) propertyEdit = { input, id: selected,
      baseline: M.clone(history.current.equipment.find(item => item.id === selected)),
      lockRatio: $('lock-ratio').checked };
    try {
      if (!isName&&!Number.isFinite(input.valueAsNumber)) throw new Error('숫자를 입력하세요. 마지막 유효한 값을 유지합니다.');
      if (isName&&!input.value.trim()) throw new Error('설비 이름을 입력하세요. 마지막 유효한 이름을 유지합니다.');
      const next = M.clone(history.current);
      const item = next.equipment.find(item => item.id === selected);
      if (isName) item.name=input.value.trim();
      else if (dimensionFields.includes(input.name)) {
        Object.assign(item, M.resizeDimensions(propertyEdit.baseline, input.name, input.valueAsNumber, propertyEdit.lockRatio));
      } else item[input.name] = input.valueAsNumber;
      const changed = history.preview(next);
      syncDimensions(item, input);
      input.removeAttribute('aria-invalid');
      $('property-error').textContent = '';
      if (changed) { saveLocal(); render(true); }
    } catch (error) {
      input.setAttribute('aria-invalid', 'true');
      $('property-error').textContent = error.message;
    }
  }
  const icons={
    tower:'M8 27 14 3h4l6 24M10 18h12M12 10h8M4 10h24M7 17h18M10 26l12-8M22 26 10 18M12 17l8-7M20 17l-8-7',
    receiving:'M5 5h22v23H5zM12 5v23M20 5v23M7 9h3v4H7zM14 9h4v4h-4zM22 9h3v4h-3zM9 19v3M17 19v3M24 19v3',
    transformer:'M8 10h16v16H8zM5 14v10M3 14v10M27 14v10M29 14v10M11 10V5M16 10V3M21 10V5M5 28h22M12 16h8v5h-8z',
    distribution:'M5 4h22v24H5zM16 4v24M8 8h5v5H8zM19 8h5v5h-5zM11 18v3M22 18v3M8 25h5M19 25h5',
    mcc:'M5 4h22v24H5zM16 4v24M5 12h22M5 20h22M8 8h4M20 8h4M8 16h4M20 16h4M8 24h4M20 24h4',
    panel:'M8 4h16v24H8zM11 8h10v5H11zM20 17v5M12 24h5',
    ups:'M8 3h16v26H8zM11 7h10v5H11zM11 18h10M11 21h10M11 24h10M14 15h4',
    solar:'M6 5h21l-4 16H2zM5 10h21M4 16h20M13 5 9 21M20 5l-4 16M7 21v6M21 21v6M4 28h20',
    ess:'M3 7h26v21H3zM3 11h26M11 11v17M21 11v17M6 16h2M6 20h2M24 16h2M24 20h2M15 15h3v8h-3zM16 13v2'
  };
  function icon(type){const def=C.get(type);return `<span class="equipment-icon"><svg viewBox="0 0 32 32" fill="none" stroke="${def.color}" stroke-width="1.25" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="${icons[type]}"/></svg></span>`;}
  function toast(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,1250);}
  function hideCatalogTooltip(){$('catalog-tooltip').hidden=true;}
  function renderCatalog(){
    if(!$('catalog').children.length){
      let images={};try{images=window.FEMSThumbnails();}catch(error){/* Icons remain available without WebGL. */}
      for(const def of C.catalog){
        const button=document.createElement('button');button.className='equipment-thumbnail';button.dataset.type=def.type;
        button.setAttribute('aria-label',`${def.name} 배치`);button.setAttribute('aria-describedby','catalog-tooltip');button.title=`${def.name} · ${def.en}`;
        if(images[def.type]){const image=document.createElement('img');image.src=images[def.type];image.alt='';image.draggable=false;button.append(image);}else button.innerHTML=icon(def.type);
        const show=()=>{const tip=$('catalog-tooltip'),rect=button.getBoundingClientRect();tip.querySelector('strong').textContent=def.name;tip.querySelector('span').textContent=def.en;tip.hidden=false;const width=tip.getBoundingClientRect().width;tip.style.left=Math.max(width/2+10,Math.min(innerWidth-width/2-10,rect.left+rect.width/2))+'px';tip.style.top=rect.top-10+'px';};
        button.addEventListener('pointerenter',show);button.addEventListener('focus',show);
        button.addEventListener('pointerleave',hideCatalogTooltip);button.addEventListener('blur',hideCatalogTooltip);
        button.addEventListener('click',()=>{hideCatalogTooltip();arm(armed===def.type?null:def.type);});$('catalog').appendChild(button);
      }
      $('catalog').addEventListener('scroll',hideCatalogTooltip);window.addEventListener('resize',hideCatalogTooltip);
    }
    for(const button of $('catalog').children)button.setAttribute('aria-pressed',String(armed===button.dataset.type));
  }
  function arm(type){if(type){links?.clear();renderInspector();links?.render(view);if(scene)scene.connectionSelection=null;}if(type&&!scene){toast('3D 그래픽을 사용할 수 없습니다. 기존 설비는 목록에서 편집할 수 있습니다.');return;}armed=type;if(type&&view==='list')setView('3d');scene?.setArmed(type);$('placement').hidden=!type;$('placement-text').textContent=type?`${C.get(type).name} · 바닥을 클릭하여 배치`:'';renderCatalog();}
  function saveLocal(){if(!autosaveAllowed){$('save-status').textContent='자동 저장 중지 · 파일로 보관';return;}
    try{localStorage.setItem(M.STORAGE_KEY,JSON.stringify(history.current));storageFailed=false;$('save-status').textContent='브라우저에 자동 저장됨';}
    catch(error){storageFailed=true;$('save-status').textContent='자동 저장 실패 · 파일로 보관';toast('브라우저 자동 저장에 실패했습니다. 도면 저장으로 작업을 보관하세요.');}}
  function commit(next,message){try{if(history.commit(window.FEMSConnections.enableShared(next))){saveLocal();render();if(message)toast(message);}return true;}catch(error){toast(error.message);scene?.setState(history.current,selected,M.overlaps(history.current),selectedIds);return false;}}
  function select(id,ids=id?[id]:[]){links?.clear();finishPropertyEdit();if(armed)arm(null);selectedIds=[...ids];selected=ids.length===1?ids[0]:null;groupFrame=null;render();}
  function reparent(id,parentId,referenceId,position='inside'){
    links?.clear();
    finishPropertyEdit();
    try{
      const ids=Array.isArray(id)?id:[id],previous={selected,selectedIds,groupFrame};
      const next=ids.length>1?M.moveEquipmentGroup(history.current,ids,parentId,referenceId,position):M.moveEquipment(history.current,ids[0],parentId,referenceId,position);
      selectedIds=[...ids];selected=ids.length===1?ids[0]:null;groupFrame=null;
      if(!commit(next,position!=='inside'?'설비의 계층과 순서를 변경했습니다.':parentId?'하위 설비로 연결했습니다.':'최상위 목록 끝으로 이동했습니다.')){selected=previous.selected;selectedIds=previous.selectedIds;groupFrame=previous.groupFrame;}render();
    }catch(error){toast(error.message);}
  }
  function add(type,x,z){try{const next=M.clone(history.current),item=M.create(type,next,x,z);next.equipment.push(item);const previous=selected;selected=item.id;if(commit(next,`${item.name}을(를) 배치했습니다.`))arm(null);else selected=previous;}catch(error){toast(error.message);}}
  function changeSelected(changes,message){if(!selected)return;const next=M.clone(history.current);Object.assign(next.equipment.find(item=>item.id===selected),changes);return commit(next,message);}
  function renderInspector(){
    const multiple=selectedIds.length>1,item=history.current.equipment.find(e=>e.id===selected),form=$('properties');
    form.hidden=!item&&!multiple;$('inspector-empty').hidden=!!item||multiple;$('property-error').textContent='';
    for(const name of ['name','code'])form.elements.namedItem(name).disabled=multiple;
    $('duplicate').disabled=multiple;$('delete').disabled=!item&&!multiple;
    $('equipment-code-connect').disabled=multiple||!item;
    $('equipment-code-connect').textContent=!multiple&&item?.code?.trim()?'변경':'연결';
    if(multiple&&groupRatioLock===null){groupRatioLock=$('lock-ratio').checked;$('lock-ratio').checked=true;}
    if(!multiple&&groupRatioLock!==null){$('lock-ratio').checked=groupRatioLock;groupRatioLock=null;}
    $('lock-ratio').disabled=multiple;
    for(const name of ['width','depth'])form.elements.namedItem(name).max=multiple?200:30;
    $('transform-note').textContent=multiple?'선택 영역의 중심 기준 이동·회전 · 회전은 선택 시작 상태가 0°':'3D·평면도의 X·Z 화살표로 이동 · ↻ 90° 버튼으로 회전';
    $('dimension-note').textContent=multiple?'선택 영역의 크기입니다. 중심점 기준으로 설비 간 간격과 모든 치수를 같은 비율로 조절합니다.':'기본 치수는 배치용 예시입니다. 실제 설비 규격에 맞게 변경하세요.';
    if(multiple){
      $('selection-type').textContent=selectedIds.length+'개 설비 선택됨';$('selection-en').textContent='-';$('selection-icon').textContent='◇';
      $('selection-description').textContent='선택한 설비를 함께 편집합니다. 변경과 삭제는 한 번의 실행 취소로 복원할 수 있습니다.';
      for(const name of ['name','code'])form.elements.namedItem(name).value='-';syncGroup();return;
    }
    if(!item)return;const def=C.get(item.type);$('selection-type').textContent=def.name;$('selection-en').textContent=def.en;$('selection-icon').innerHTML=icon(item.type);$('selection-description').textContent=def.description;
    for(const name of ['name','code','x','z','rotation','width','depth','height'])form.elements.namedItem(name).value=item[name];
  }
  function renderTable(){const body=$('equipment-table');body.replaceChildren();for(const item of history.current.equipment){const row=document.createElement('tr');row.dataset.id=item.id;row.setAttribute('aria-selected',String(selectedIds.includes(item.id)));const values=[item.code,item.name,C.get(item.type).name,`${item.x} / ${item.z}`,`${item.width} × ${item.depth} × ${item.height}`,`${item.rotation}°`];values.forEach((value,index)=>{const td=document.createElement('td');if(index===0){const button=document.createElement('button');button.textContent=value||'—';button.setAttribute('aria-label',`${item.code||item.name} 선택`);td.appendChild(button);}else td.textContent=value;row.appendChild(td);});row.addEventListener('click',()=>select(item.id));body.appendChild(row);}$('table-empty').hidden=history.current.equipment.length>0;}
  function render(preserveInputs=false){const state=history.current;if(!state.equipment.some(e=>e.id===selected))selected=null;selectedIds=selected?[selected]:selectedIds.filter(id=>state.equipment.some(e=>e.id===id));if(selectedIds.length===1)selected=selectedIds[0];const warnings=M.overlaps(state);$('equipment-count').textContent=state.equipment.length;$('tree-count').textContent=state.equipment.length;$('project-name').textContent=state.name;$('site-size').textContent=`${state.site.width} × ${state.site.depth} m`;$('empty-state').hidden=state.equipment.length>0||!!armed;$('undo').disabled=!history.past.length&&!history.editingChanged;$('redo').disabled=!history.future.length||history.editingChanged;$('overlap-status').textContent=warnings.size?`배치 겹침 ${warnings.size}개 확인`:'';if(!preserveInputs)renderInspector();renderTable();tree?.render(state,selected,false,selectedIds);links?.render(view);if(scene)scene.connectionSelection=links?.selection;scene?.setState(state,selected,warnings,selectedIds);}
  function setView(next){if(scene?.drag?.connection)scene.cancelDrag();links?.clear();view=next;renderInspector();links?.render(view);if(scene)scene.connectionSelection=null;for(const key of ['3d','plan','list'])$('view-'+key).setAttribute('aria-selected',String(key===view));$('viewport').hidden=view==='list';$('table-view').hidden=view!=='list';$('fit').disabled=view==='list';if(view==='list'){arm(null);}else{scene?.setMode(view);$('scene').setAttribute('aria-label',view==='plan'?'평면 설비 배치도':'3D 설비 배치도');}}
  function travel(direction){if(scene?.drag?.connection)scene.cancelDrag();links?.clear();if(history[direction]()){selected=null;selectedIds=[];groupFrame=null;arm(null);saveLocal();render();toast(direction==='undo'?'실행을 취소했습니다.':'다시 실행했습니다.');}}
  function rotate(){finishPropertyEdit();if(selectedIds.length>1){try{const frame=currentGroup(),result=M.transformGroup(history.current,selectedIds,frame,'rotation',(frame.rotation+90)%360);groupFrame=result.frame;commit(result.state,'선택한 설비를 중심점 기준으로 90° 회전했습니다.');}catch(error){$('property-error').textContent=error.message;}return;}const item=history.current.equipment.find(e=>e.id===selected);if(item)changeSelected({rotation:(item.rotation+90)%360},'90° 회전했습니다.');}
  function remove(){if(links?.selection){links.remove();return;}finishPropertyEdit();if(selectedIds.length>1){try{const count=selectedIds.length;commit(M.removeEquipmentGroup(history.current,selectedIds),count+'개 설비를 삭제했습니다. 실행 취소로 복원할 수 있습니다.');groupFrame=null;}catch(error){$('property-error').textContent=error.message;}return;}if(!selected)return;const hasChildren=history.current.equipment.some(e=>e.parentId===selected);commit(M.removeEquipment(history.current,selected),hasChildren?'설비를 삭제하고 하위 설비는 한 단계 위로 옮겼습니다. 실행 취소할 수 있습니다.':'설비를 삭제했습니다. 실행 취소로 복원할 수 있습니다.');}
  function duplicate(){const item=history.current.equipment.find(e=>e.id===selected);if(!item)return;try{const next=M.clone(history.current),copy=M.create(item.type,next);const id=copy.id,code=copy.code,name=M.duplicateName(next,item.name);Object.assign(copy,item,{id,code,name});Object.assign(copy,M.clampPosition(copy,item.x+item.width+1,item.z, next.site));next.equipment.push(copy);selected=copy.id;commit(next,'설비를 복제했습니다. 위치와 겹침을 확인하세요.');}catch(error){toast(error.message);}}
  function graphicsError(message){$('graphics-error').textContent=message;$('graphics-error').hidden=false;}
  function previewGizmo(id, pos) {
    const next=M.clone(history.current), item=next.equipment.find(e=>e.id===id);
    if(!item)return;
    Object.assign(item,pos);
    try {
      if(history.preview(next)){
        for(const name of ['x','z'])$('properties').elements.namedItem(name).value=item[name];
        saveLocal();render(true);
      }
    }catch(error){$('property-error').textContent=error.message;}
  }
  function finishGizmo(commit) {
    const changed=history.finishEdit(commit);
    const item=history.current.equipment.find(e=>e.id===selected);
    if(item)for(const name of ['x','z'])$('properties').elements.namedItem(name).value=item[name];
    if(changed)saveLocal();
    render(true);
    if(changed)toast(commit?'설비 위치를 변경했습니다.':'설비 이동을 취소했습니다.');
  }
  $('gizmo-rotate').addEventListener('click',rotate);
  try{scene=new window.FEMSScene($('scene'),$('labels'),{select,place:add,move:(id,pos)=>{selected=id;changeSelected(pos,'설비 위치를 변경했습니다.');},gizmoStart:()=>finishPropertyEdit(),gizmoPreview:previewGizmo,gizmoEnd:finishGizmo,connectionSelect:hit=>{finishPropertyEdit();selected=null;selectedIds=[];links.select(hit);render();},connectionStart:hit=>links.start(hit),connectionPreview:(pos,options)=>links.preview(pos,options),connectionEnd:ok=>links.finish(ok),error:graphicsError},$('gizmo-rotate'));}
  catch(error){graphicsError('3D 화면을 시작할 수 없습니다. WebGL 2를 지원하는 Edge 또는 Chrome에서 그래픽 가속을 확인하세요. 설비 목록과 속성 편집·파일 저장은 계속 사용할 수 있습니다.');}
  tree=new window.FEMSEquipmentTree($('equipment-tree'),$('equipment-search'),{select,reparent,error:toast});
  $('cancel-placement').addEventListener('click',()=>arm(null));
  for(const key of ['3d','plan','list'])$('view-'+key).addEventListener('click',()=>setView(key));
  $('fit').addEventListener('click',()=>scene?.fit());$('zoom-in').addEventListener('click',()=>scene?.zoom(.85));$('zoom-out').addEventListener('click',()=>scene?.zoom(1.18));
  $('labels-toggle').addEventListener('click',()=>{if(!scene)return;scene.showLabels=!scene.showLabels;$('labels-toggle').setAttribute('aria-pressed',String(scene.showLabels));scene.invalidate();});
  $('undo').addEventListener('click',()=>travel('undo'));$('redo').addEventListener('click',()=>travel('redo'));
  $('rotate').addEventListener('click',rotate);$('delete').addEventListener('click',remove);$('duplicate').addEventListener('click',duplicate);
  $('properties').addEventListener('input', event => updateProperty(event.target));
  $('equipment-code-connect').addEventListener('click',()=>toast('서버 연결 준비 중입니다. API 연결 후 설비 코드를 지정할 수 있습니다.'));
  $('lock-ratio').addEventListener('change', () => finishPropertyEdit());
  $('properties').addEventListener('focusout', event => {
    if (propertyEdit?.input === event.target && !document.body.dataset.numberScrubbing) finishPropertyEdit();
  });
  $('properties').addEventListener('number-scrub-start', () => finishPropertyEdit());
  $('properties').addEventListener('number-scrub-end', event => finishPropertyEdit(event.detail.commit));
  $('properties').addEventListener('keydown', event => {
    if(event.isComposing)return;
    if(event.key==='Enter'&&event.target.name==='name'){event.preventDefault();finishPropertyEdit();return;}
    if (event.key === 'Escape' && propertyEdit) {
      event.preventDefault();
      event.stopPropagation();
      finishPropertyEdit(false);
    }
  });
  window.addEventListener('blur', () => {
    if (!document.body.dataset.numberScrubbing) finishPropertyEdit();
  });
  $('properties').addEventListener('submit',event=>{event.preventDefault();finishPropertyEdit();});
  $('new').addEventListener('click',()=>{arm(null);commit(M.empty(),'빈 도면을 만들었습니다. 실행 취소로 이전 배치를 복원할 수 있습니다.');scene?.fit();});
  let defaultSnapshot=null,defaultSaving=false;
  $('export-default').addEventListener('click',()=>{
    finishPropertyEdit();links?.finishNumeric(true);
    defaultSnapshot=M.clone(history.current);
    const contents=window.FEMSDefaults.serialize(defaultSnapshot);
    $('default-source').value=contents;$('default-summary').textContent=`${history.current.name} · 설비 ${history.current.equipment.length}개 · 연결선 ${window.FEMSConnections.routes(history.current).length}개`;
    $('default-error').textContent='';$('default-dialog').showModal();
    try{const backup=localStorage.getItem(branchBackupKey);$('branch-backup').hidden=!backup;if(backup){if(branchBackupUrl)URL.revokeObjectURL(branchBackupUrl);branchBackupUrl=URL.createObjectURL(new Blob([backup],{type:'application/json'}));$('branch-backup').href=branchBackupUrl;}}catch{$('branch-backup').hidden=true;}
  });
  $('default-close').addEventListener('click',()=>$('default-dialog').close());
  $('default-dialog').addEventListener('keydown',event=>event.stopPropagation());
  $('default-dialog').addEventListener('cancel',event=>{if(defaultSaving)event.preventDefault();});
  let branchBackupUrl=null;
  $('default-dialog').addEventListener('close',()=>{defaultSnapshot=null;if(branchBackupUrl)URL.revokeObjectURL(branchBackupUrl);branchBackupUrl=null;});
  $('default-overwrite').addEventListener('click',async()=>{
    if(defaultSaving||!defaultSnapshot)return;
    if(!['127.0.0.1','localhost'].includes(location.hostname)||location.protocol!=='http:'){
      $('default-error').textContent='프로젝트의 로컬 서버(http://127.0.0.1:4175)에서만 기본 도면을 덮어쓸 수 있습니다.';return;
    }
    defaultSaving=true;$('default-overwrite').disabled=true;$('default-close').disabled=true;
    $('default-overwrite').textContent='저장 중…';$('default-error').textContent='';
    try{
      const response=await fetch('/api/default-layout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(defaultSnapshot)});
      if(!response.ok)throw new Error([404,405].includes(response.status)?'로컬 서버를 다시 시작한 뒤 시도하세요.':'파일 쓰기 권한과 로컬 서버 상태를 확인한 뒤 다시 시도하세요.');
      $('default-dialog').close();toast('js/default-layout.js에 기본 도면을 저장했습니다.');
    }catch(error){$('default-error').textContent='기본 도면을 저장하지 못했습니다. '+error.message;}
    finally{defaultSaving=false;$('default-overwrite').disabled=false;$('default-close').disabled=false;$('default-overwrite').textContent='덮어쓰기';}
  });
  $('save').addEventListener('click',async()=>{
    try{await window.FEMSFiles.save(history.current,window.showSaveFilePicker?.bind(window));toast('선택한 파일에 도면을 저장했습니다.');}
    catch(error){if(error.name==='AbortError')toast('파일 저장을 취소했습니다.');else toast('파일을 저장하지 못했습니다: '+error.message);}
  });
  $('open').addEventListener('click',()=>$('file').click());
  $('file').addEventListener('change',async()=>{const file=$('file').files[0];$('file').value='';if(!file)return;try{if(file.size>2*1024*1024)throw new Error('2 MB 이하의 FEMS 도면을 선택하세요.');const next=M.validate(JSON.parse(await file.text()));arm(null);selected=null;selectedIds=[];commit(next,`${file.name}을(를) 열었습니다. 실행 취소로 이전 배치를 복원할 수 있습니다.`);scene?.fit();}catch(error){toast('파일을 열지 못했습니다. '+error.message);}});
  document.addEventListener('keydown',event=>{if(scene?.drag?.axis||scene?.drag?.connection){if(event.key==='Escape'){event.preventDefault();scene.cancelDrag();}return;}const editing=event.target.matches('input,textarea,select,[contenteditable=true]');if(event.key==='Escape'){links?.cancelCorner();links?.render(view);arm(null);return;}if(editing||event.isComposing)return;
    const key=event.key.toLowerCase();if((event.ctrlKey||event.metaKey)&&key==='z'){event.preventDefault();travel(event.shiftKey?'redo':'undo');}else if((event.ctrlKey||event.metaKey)&&key==='y'){event.preventDefault();travel('redo');}else if((event.ctrlKey||event.metaKey)&&key==='s'){event.preventDefault();$('save').click();}else if(!event.ctrlKey&&!event.metaKey&&!event.altKey){if(key==='r')rotate();else if(key==='f')scene?.fit();else if(key==='delete')remove();else if(key==='/'){event.preventDefault();$('equipment-search').focus();}}});
  window.addEventListener('beforeunload',event=>{if((storageFailed||!autosaveAllowed)&&history.past.length){event.preventDefault();event.returnValue='';}});
  links=new window.FEMSConnectionEditor({guides:(guides,corner)=>{if(scene){scene.connectionGuides=guides;scene.cornerMode=corner;scene.invalidate();}},state:()=>history.current,commit:next=>{if(!commit(next))throw new Error('연결선 변경을 적용하지 못했습니다.');},preview:next=>{if(history.preview(next)){saveLocal();render();}},finish:ok=>{if(history.finishEdit(ok))saveLocal();render();}});
  window.FEMSNumberScrub.install($('properties'));
  window.FEMSNumberScrub.install($('connection-properties'));
  renderCatalog();render();scene?.fit();
  if(startupMessage){$('save-status').textContent='복원 실패 · 자동 저장 중지';toast(startupMessage);}else{$('save-status').textContent='로컬 작업 공간 · 자동 저장';if(branchMigrationMessage)toast(branchMigrationMessage);}
})();
