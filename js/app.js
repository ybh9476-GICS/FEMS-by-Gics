(function () {
  'use strict';
  const C=window.FEMSCatalog, M=window.FEMSModel, $=id=>document.getElementById(id);
  const assetStartupMessage=window.FEMSAssetStartupMessage;
  const P=window.FEMSProjectFile,defaultAssets=window.FEMSDefaultAssets;
  let defaultRevision=window.FEMSDefaultRevision;
  const defaultBackupKey=M.STORAGE_KEY+'-before-default-update';
  const defaultAppliedKey=M.STORAGE_KEY+'-applied-default';
  const S=window.FEMSSpatial;
  let library,spaces;
  let bundled=P.attach(window.FEMSDefaults.seed(window.FEMSDefaultLayout),defaultAssets,'new',defaultRevision);
  bundled.project.kind='new';bundled.project.baseRevision=defaultRevision;
  let initial=M.clone(bundled), startupMessage='', autosaveAllowed=true, storageFailed=false;
  let savedWork=null,previousDefaultWork=null,defaultLoaded=false;
  try {savedWork=localStorage.getItem(M.STORAGE_KEY);if(savedWork)initial=M.validate(JSON.parse(savedWork));}
  catch(error){autosaveAllowed=false;startupMessage='이전 작업을 읽지 못했습니다. 원본 보존을 위해 자동 저장을 중지했습니다. 파일 열기·프로젝트 저장은 사용할 수 있습니다.';}
  initial=P.attach(initial,defaultAssets);
  if(autosaveAllowed&&initial.project.kind==='new'){
    try{
      // Older versions recorded acknowledgement, including "keep work", as baseRevision.
      // Track actual default application separately so those browsers receive the default once.
      if(localStorage.getItem(defaultAppliedKey)!==defaultRevision){
        if(savedWork){
          const previous=localStorage.getItem(defaultBackupKey);
          if(previous&&previous!==savedWork){
            let archive=defaultBackupKey+'-'+Date.now();
            while(localStorage.getItem(archive))archive+='-1';
            localStorage.setItem(archive,previous);
          }
          localStorage.setItem(defaultBackupKey,savedWork);
        }
        localStorage.setItem(M.STORAGE_KEY,JSON.stringify(bundled));
        previousDefaultWork=savedWork?M.clone(initial):null;
        initial=M.clone(bundled);defaultLoaded=!!savedWork;
        localStorage.setItem(defaultAppliedKey,defaultRevision);
      }
    }catch(error){
      autosaveAllowed=false;
      startupMessage=defaultLoaded?'새 기본 프로젝트를 불러왔지만 자동 저장을 중지했습니다. 이전 작업은 백업되어 있습니다.':'기본 프로젝트 갱신을 저장하지 못해 현재 작업을 유지합니다. 자동 저장을 중지했습니다.';
    }
  }
  C.replace(initial.project.assets);
  const history=new M.History(previousDefaultWork||initial);
  if(previousDefaultWork)history.commit(initial);
  let selected=null,selectedIds=[],armed=null,view='3d',scene=null,tree=null,links=null,toastTimer,schematic=null;
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
  if(S&&autosaveAllowed&&history.current.version<3){
    try{const key=M.STORAGE_KEY+'-before-spatial-v3',raw=localStorage.getItem(M.STORAGE_KEY)||JSON.stringify(history.current),upgraded=M.validate(S.upgrade(history.current));if(localStorage.getItem(key)&&localStorage.getItem(key)!==raw)localStorage.setItem(key+'-'+Date.now(),localStorage.getItem(key));localStorage.setItem(key,raw);localStorage.setItem(M.STORAGE_KEY,JSON.stringify(upgraded));history.current=upgraded;}
    catch(error){autosaveAllowed=false;startupMessage='공간 구조 변환을 완료하지 못해 원본을 유지합니다. 자동 저장을 중지했습니다. '+error.message;}
  }
  if(autosaveAllowed&&history.current.version<4){
    try{
      const key=M.STORAGE_KEY+'-before-power-v4',raw=JSON.stringify(history.current),upgraded=M.validate(window.FEMSConnections.upgradePower(history.current));
      const previous=localStorage.getItem(key);if(previous&&previous!==raw)localStorage.setItem(key+'-'+Date.now(),previous);
      localStorage.setItem(key,raw);localStorage.setItem(M.STORAGE_KEY,JSON.stringify(upgraded));history.current=upgraded;
    }catch(error){autosaveAllowed=false;startupMessage='전력 연결 구조 변환을 완료하지 못해 원본을 유지합니다. 자동 저장을 중지했습니다. '+error.message;}
  }
  let groupGizmoEdit=null;
  let propertyEdit = null,groupFrame=null,groupRatioLock=null,nameDraft=null,projectSelected=false,projectNameDraft=false;
  function cancelProjectNameEdit(){
    if(!projectNameDraft)return;projectNameDraft=false;
    $('project-title').value=history.current.name;$('project-title').removeAttribute('aria-invalid');$('project-error').textContent='';
  }
  function applyProjectNameEdit(){
    if(!projectSelected||!projectNameDraft)return;
    const input=$('project-title'),next=M.clone(history.current);next.name=input.value.trim();
    try{M.validate(next);projectNameDraft=false;commit(next);input.value=history.current.name;input.removeAttribute('aria-invalid');$('project-error').textContent='';}
    catch(error){input.setAttribute('aria-invalid','true');$('project-error').textContent=error.message;}
  }
  function cancelNameEdit() {
    if(!nameDraft)return;
    const {input,id}=nameDraft;nameDraft=null;
    const item=history.current.equipment.find(item=>item.id===id);
    if(item)input.value=item.name;
    input.removeAttribute('aria-invalid');$('property-error').textContent='';
  }
  function applyNameEdit() {
    if(!nameDraft)return;
    const {input,id}=nameDraft;
    if(id!==selected){cancelNameEdit();return;}
    try {
      const next=M.clone(history.current),item=next.equipment.find(item=>item.id===id);
      item.name=input.value.trim();M.validate(next);
      if(commit(next)){nameDraft=null;input.value=item.name;input.removeAttribute('aria-invalid');$('property-error').textContent='';}
    } catch(error) {input.setAttribute('aria-invalid','true');$('property-error').textContent=error.message;}
  }
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
    cancelProjectNameEdit();cancelNameEdit();
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
    if(isName){
      if(!nameDraft){finishPropertyEdit();nameDraft={input,id:selected};}
      input.removeAttribute('aria-invalid');$('property-error').textContent='';return;
    }
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
      if (!Number.isFinite(input.valueAsNumber)) throw new Error('숫자를 입력하세요. 마지막 유효한 값을 유지합니다.');
      const next = M.clone(history.current);
      const item = next.equipment.find(item => item.id === selected);
      if (dimensionFields.includes(input.name)) {
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
  function icon(type){const def=C.get(type);return `<span class="equipment-icon"><svg viewBox="0 0 32 32" fill="none" stroke="${def.color}" stroke-width="1.25" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="${icons[type]||(type.startsWith('solar-')?icons.solar:null)||'M4 9 16 3 28 9v15l-12 6L4 24zM4 9l12 6 12-6M16 15v15'}"/></svg></span>`;}
  function toast(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,1250);}
  function hideCatalogTooltip(){$('catalog-tooltip').hidden=true;}
  function renderCatalog(){library?.render(armed);}
  function syncProject(){C.replace(history.current.project?.assets||[]);$('export-default').disabled=false;renderCatalog();}
  function arm(type){if(type&&view==='schematic'){toast('설비 배치는 3D View 또는 평면도에서 진행하세요.');return;}if(type&&spaces?.draft){toast('층 등록을 완료하거나 취소하세요.');return;}if(type){projectSelected=false;links?.clear();if(spaces&&['building','floor'].includes(C.get(type)?.kind)&&(spaces.context.buildingId||spaces.context.floorId)){spaces.context={};render();scene?.fit();}renderInspector();links?.render(view);spaces?.render();if(scene)scene.connectionSelection=null;}if(type&&!scene){toast('3D 그래픽을 사용할 수 없습니다. 기존 설비는 좌측 계층에서 선택해 편집할 수 있습니다.');return;}armed=type;scene?.setArmed(type);renderCatalog();}
  function saveLocal(){if(!autosaveAllowed){$('save-status').textContent='자동 저장 중지 · 파일로 보관';return;}
    try{localStorage.setItem(M.STORAGE_KEY,JSON.stringify(history.current));storageFailed=false;$('save-status').textContent='브라우저에 자동 저장됨';}
    catch(error){storageFailed=true;$('save-status').textContent='자동 저장 실패 · 파일로 보관';toast('브라우저 자동 저장에 실패했습니다. 프로젝트 저장으로 작업을 보관하세요.');}}
  function commit(next,message){try{window.FEMSConnections.external.backupBeforeEdit(history.current,next,localStorage,M.STORAGE_KEY);window.FEMSConnections.floor.backupBeforeEdit(history.current,next,localStorage,M.STORAGE_KEY);if(history.commit(window.FEMSConnections.upgradePower(next))){saveLocal();render();if(message)toast(message);}return true;}catch(error){toast(error.message);scene?.setState(spaces?spaces.display(history.current):history.current,selected,M.overlaps(history.current),selectedIds);return false;}}
  function select(id,ids=id?[id]:[],isProject=false,billboard=false,preserveSpace=false){if(!preserveSpace&&!id&&!ids.length&&!isProject&&spaces?.keepSelection())return;if(!preserveSpace&&spaces?.choose(id,{billboard}))return;spaces?.clear();ids=ids.filter(id=>history.current.equipment.some(e=>e.id===id));if(spaces){const chosen=history.current.equipment.filter(e=>ids.includes(e.id));if(chosen.some(e=>(e.floorId||null)!==(chosen[0]?.floorId||null))){toast('같은 공간의 설비끼리 다중 선택하세요.');ids=id?[id]:[];}const item=history.current.equipment.find(e=>e.id===id),floor=history.current.floors?.find(f=>f.id===item?.floorId);if(item&&!preserveSpace)spaces.focusFloor(floor?.id);}links?.clear();finishPropertyEdit();if(armed)arm(null);projectSelected=isProject;selectedIds=[...ids];selected=ids.length===1?ids[0]:null;groupFrame=null;render();}
  function reparent(id,parentId,referenceId,position='inside'){
    if(spaces?.draft){toast('층 등록을 완료하거나 취소하세요.');return;}
    if(spaces?.reparent(id,parentId,referenceId,position))return;
    projectSelected=false;
    links?.clear();
    finishPropertyEdit();
    try{
      const ids=Array.isArray(id)?id:[id],previous={selected,selectedIds,groupFrame};
      const next=ids.length>1?M.moveEquipmentGroup(history.current,ids,parentId,referenceId,position):M.moveEquipment(history.current,ids[0],parentId,referenceId,position);
      selectedIds=[...ids];selected=ids.length===1?ids[0]:null;groupFrame=null;
      if(!commit(next,position!=='inside'?'설비의 계층과 순서를 변경했습니다.':parentId?'하위 설비로 연결했습니다.':'최상위 목록 끝으로 이동했습니다.')){selected=previous.selected;selectedIds=previous.selectedIds;groupFrame=previous.groupFrame;}render();
    }catch(error){toast(error.message);}
  }
  function add(type,x,z){if(view==='schematic')return;if(spaces?.place(type,x,z))return;if(spaces?.context.buildingId&&!spaces.context.floorId){toast('설비를 배치할 층으로 먼저 진입하세요.');return;}projectSelected=false;try{const next=M.clone(history.current),floor=next.floors?.find(f=>f.id===spaces?.context.floorId),item=M.create(type,floor?{...next,site:{width:floor.width,depth:floor.depth}}:next,x,z);if(floor)item.floorId=floor.id;next.equipment.push(item);spaces?.clear();const previous=selected;selected=item.id;if(commit(next,`${item.name}을(를) 배치했습니다.`))arm(null);else selected=previous;}catch(error){toast(error.message);}}
  function changeSelected(changes,message){if(!selected)return;const next=M.clone(history.current);Object.assign(next.equipment.find(item=>item.id===selected),changes);return commit(next,message);}
  function renderInspector(){
    cancelProjectNameEdit();cancelNameEdit();
    $('project-properties').hidden=!projectSelected;
    if(projectSelected)$('project-title').value=history.current.name;
    const multiple=selectedIds.length>1,item=history.current.equipment.find(e=>e.id===selected),form=$('properties');
    form.hidden=!item&&!multiple;$('inspector-empty').hidden=!!item||multiple||projectSelected;$('property-error').textContent='';
    for(const name of ['name','code'])form.elements.namedItem(name).disabled=multiple;
    $('duplicate').disabled=multiple;$('delete').disabled=!item&&!multiple;
    $('equipment-code-connect').disabled=multiple||!item;
    $('equipment-code-connect').textContent=!multiple&&item?.code?.trim()?'변경':'연결';
    if(multiple&&groupRatioLock===null){groupRatioLock=$('lock-ratio').checked;$('lock-ratio').checked=true;}
    if(!multiple&&groupRatioLock!==null){$('lock-ratio').checked=groupRatioLock;groupRatioLock=null;}
    $('lock-ratio').disabled=multiple;
    for(const name of ['width','depth'])form.elements.namedItem(name).max=multiple?200:30;
    $('transform-note').textContent=multiple?'선택 영역의 중심 기준 이동·회전 · 회전은 선택 시작 상태가 0°':'화살표: 축 이동 · 사각형: X·Z 동시 이동 · ↻ 90°: 회전';
    $('dimension-note').textContent=multiple?'선택 영역의 크기입니다. 중심점 기준으로 설비 간 간격과 모든 치수를 같은 비율로 조절합니다.':'기본 치수는 배치용 예시입니다. 실제 설비 규격에 맞게 변경하세요.';
    if(multiple){
      $('selection-type').textContent=selectedIds.length+'개 설비 선택됨';$('selection-en').textContent='-';$('selection-icon').textContent='◇';
      $('selection-description').textContent='선택한 설비를 함께 편집합니다. 변경과 삭제는 한 번의 실행 취소로 복원할 수 있습니다.';
      for(const name of ['name','code'])form.elements.namedItem(name).value='-';syncGroup();return;
    }
    if(!item)return;const def=C.get(item.type);$('selection-type').textContent=def.name;$('selection-en').textContent=def.en;$('selection-icon').innerHTML=icon(item.type);$('selection-description').textContent=def.description;
    for(const name of ['name','code','x','z','rotation','width','depth','height'])form.elements.namedItem(name).value=item[name];
  }
  function render(preserveInputs=false){
    syncProject();const state=history.current;
    if(!state.equipment.some(e=>e.id===selected))selected=null;
    selectedIds=selected?[selected]:selectedIds.filter(id=>state.equipment.some(e=>e.id===id));if(selectedIds.length===1)selected=selectedIds[0];
    const warnings=M.overlaps(state),display=spaces?spaces.display(state):state;
    const alignItems=state.equipment.filter(e=>selectedIds.includes(e.id));
    const canAlign=view!=='schematic'&&!spaces?.selected&&alignItems.length>1&&alignItems.every(e=>(e.floorId||null)===(alignItems[0].floorId||null));
    for(const direction of ['horizontal','vertical'])$('align-'+direction).disabled=!canAlign;
    $('grid-size').textContent=view==='schematic'?'연결 관계':M.siteGridStep(display.site)+' m 그리드';$('equipment-count').textContent=state.equipment.length;
    $('site-size').textContent=state.site.width+' × '+state.site.depth+' m';
    $('empty-state').hidden=display.equipment.length>0||!!armed;
    $('empty-state').querySelector('strong').textContent=spaces?.context.buildingId?'층을 등록하세요':'첫 번째 오브젝트를 배치해 보세요';$('empty-state').querySelector('span').textContent=spaces?.context.buildingId?'우측 층 등록·수정에서 층을 구성하세요.':'하단 썸네일에서 설비·건물·층을 선택하세요.';$('undo').disabled=!history.past.length&&!history.editingChanged;$('redo').disabled=!history.future.length||history.editingChanged;
    $('overlap-status').textContent=warnings.size?'배치 겹침 '+warnings.size+'개 확인':'';
    if(!preserveInputs)renderInspector();
    if(tree){tree.projectSelected=projectSelected;tree.render(S?S.treeState(state):state,spaces?.selected||selected,false,spaces?.selected?[spaces.selected]:selectedIds);}
    links?.render(view);spaces?.render(preserveInputs);
    if(scene&&view!=='schematic'){scene.groupPivot=!spaces?.selected&&selectedIds.length>1?currentGroup():null;scene.connectionSelection=links?.selection;scene.setState(display,spaces?.selected||selected,warnings,spaces?.selected?[spaces.selected]:selectedIds.filter(id=>display.equipment.some(e=>e.id===id)));}
    schematic?.setState(state,selected);
  }
  function setView(next){if(next===view)return;finishPropertyEdit();spaces?.finish();if(scene?.drag)scene.cancelDrag();links?.clear();arm(null);view=next;document.querySelector('.editor').classList.toggle('schematic-mode',view==='schematic');for(const key of ['3d','plan','schematic'])$('view-'+key).setAttribute('aria-selected',String(key===view));if(scene)scene.connectionSelection=null;render();schematic?.setActive(view==='schematic');if(view!=='schematic'){if(scene?.mode!==view)scene?.setMode(view);else scene?.resize();$('scene').setAttribute('aria-label',view==='plan'?'평면 설비 배치도':'3D 설비 배치도');}}
  function alignSelection(direction){
    if(view==='schematic'||spaces?.selected||selectedIds.length<2)return;
    finishPropertyEdit();spaces?.finish();links?.clear();
    try{const next=M.alignEquipment(history.current,selectedIds,direction);groupFrame=null;commit(next,direction==='horizontal'?'수평으로 정렬했습니다.':'수직으로 정렬했습니다.');}catch(error){toast(error.message);}
  }
  function selectInScene(id,event,billboard=false){
    if(id&&(event?.ctrlKey||event?.metaKey)&&history.current.equipment.some(e=>e.id===id)){
      const ids=selectedIds.includes(id)?selectedIds.filter(key=>key!==id):[...selectedIds,id];
      select(id,ids,false,false);
    }else select(id,undefined,false,billboard);
  }
  function fitView(){if(view==='schematic')schematic?.fit();else scene?.fit();}
  function travel(direction){if(spaces?.draft){toast('층 등록을 완료하거나 취소하세요.');return;}spaces?.finish();if(scene?.drag?.connection)scene.cancelDrag();links?.clear();if(history[direction]()){history.current=M.validate(window.FEMSConnections.upgradePower(history.current));projectSelected=false;selected=null;selectedIds=[];groupFrame=null;arm(null);saveLocal();render();toast(direction==='undo'?'실행을 취소했습니다.':'다시 실행했습니다.');}}
  function rotate(){if(spaces?.rotate())return;finishPropertyEdit();if(selectedIds.length>1){try{const frame=currentGroup(),result=M.transformGroup(history.current,selectedIds,frame,'rotation',(frame.rotation+90)%360);groupFrame=result.frame;commit(result.state,'선택한 설비를 중심점 기준으로 90° 회전했습니다.');}catch(error){$('property-error').textContent=error.message;}return;}const item=history.current.equipment.find(e=>e.id===selected);if(item)changeSelected({rotation:(item.rotation+90)%360},'90° 회전했습니다.');}
  function remove(){if(spaces?.selected){spaces.remove();return;}if(links?.selection){links.remove();return;}finishPropertyEdit();if(selectedIds.length>1){try{const count=selectedIds.length;commit(M.removeEquipmentGroup(history.current,selectedIds),count+'개 설비를 삭제했습니다. 실행 취소로 복원할 수 있습니다.');groupFrame=null;}catch(error){$('property-error').textContent=error.message;}return;}if(!selected)return;const hasChildren=history.current.equipment.some(e=>e.parentId===selected);commit(M.removeEquipment(history.current,selected),hasChildren?'설비를 삭제하고 하위 설비는 한 단계 위로 옮겼습니다. 실행 취소할 수 있습니다.':'설비를 삭제했습니다. 실행 취소로 복원할 수 있습니다.');}
  function duplicate(){const item=history.current.equipment.find(e=>e.id===selected);if(!item)return;try{const next=M.clone(history.current),copy=M.create(item.type,next);const id=copy.id,code=copy.code,name=M.duplicateName(next,item.name);Object.assign(copy,item,{id,code,name});Object.assign(copy,M.clampPosition(copy,item.x+item.width+1,item.z,next.floors?.find(f=>f.id===item.floorId)||next.site));next.equipment.push(copy);selected=copy.id;commit(next,'설비를 복제했습니다. 위치와 겹침을 확인하세요.');}catch(error){toast(error.message);}}
  function graphicsError(message){$('graphics-error').textContent=message;$('graphics-error').hidden=false;}
  function startGizmo(){
    finishPropertyEdit();spaces?.finish();
    groupGizmoEdit=!spaces?.selected&&selectedIds.length>1?{state:M.clone(history.current),ids:[...selectedIds],frame:{...currentGroup()}}:null;
  }
  function previewGizmo(id, pos) {
    if(id==='@selection'&&groupGizmoEdit){
      const edit=groupGizmoEdit;
      try{
        const movedX=M.transformGroup(edit.state,edit.ids,edit.frame,'x',pos.x);
        const result=M.transformGroup(movedX.state,edit.ids,movedX.frame,'z',pos.z);
        if(history.preview(result.state)){groupFrame=result.frame;syncGroup();saveLocal();render(true);}
      }catch(error){$('property-error').textContent=error.message;}
      return;
    }
    if(spaces?.gizmo(id,pos))return;
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
    if(groupGizmoEdit){
      const edit=groupGizmoEdit;groupGizmoEdit=null;
      const changed=history.finishEdit(commit);if(!commit)groupFrame=edit.frame;
      syncGroup();if(changed)saveLocal();render(true);
      if(changed)toast(commit?'선택한 설비를 함께 이동했습니다.':'설비 이동을 취소했습니다.');
      return;
    }
    if(spaces?.selected){const changed=history.finishEdit(commit);if(changed)saveLocal();render();return;}
    const changed=history.finishEdit(commit);
    const item=history.current.equipment.find(e=>e.id===selected);
    if(item)for(const name of ['x','z'])$('properties').elements.namedItem(name).value=item[name];
    if(changed)saveLocal();
    render(true);
    if(changed)toast(commit?'설비 위치를 변경했습니다.':'설비 이동을 취소했습니다.');
  }
  $('gizmo-rotate').addEventListener('click',rotate);
  try{scene=new window.FEMSScene($('scene'),$('labels'),{select:selectInScene,navigateEquipment:id=>{const target=history.current.equipment.find(e=>e.id===id),floor=history.current.floors?.find(f=>f.id===target?.floorId);if(!target)return;if(spaces)spaces.context=floor?{floorId:floor.id,buildingId:floor.buildingId}:{};select(id);scene?.fit();const item=scene?.state?.equipment.find(e=>e.id===id);if(item){scene.target.set(item.x,(item.y||0)+item.height/2,item.z);scene.updateCamera();}},selectLabel:(id,event)=>selectInScene(id,event,true),place:add,move:(id,pos)=>{selected=id;changeSelected(pos,'설비 위치를 변경했습니다.');},gizmoStart:startGizmo,gizmoPreview:previewGizmo,gizmoEnd:finishGizmo,connectionSelect:hit=>{spaces?.clear();finishPropertyEdit();projectSelected=false;selected=null;selectedIds=[];links.select(hit);render();},connectionStart:hit=>links.start(hit),connectionPreview:(pos,options)=>links.preview(pos,options),connectionEnd:ok=>links.finish(ok),error:graphicsError},$('gizmo-rotate'));}
  catch(error){graphicsError('3D 화면을 시작할 수 없습니다. WebGL 2를 지원하는 Edge 또는 Chrome에서 그래픽 가속을 확인하세요. 설비 목록과 속성 편집·파일 저장은 계속 사용할 수 있습니다.');}
  tree=new window.FEMSEquipmentTree($('equipment-tree'),$('equipment-search'),{select:(id,ids)=>select(id,ids,false,false,view==='schematic'&&history.current.equipment.some(e=>e.id===id)),selectProject:()=>select(null,[],true),reparent,error:toast,dropInfo:(ids,parentId)=>spaces?.dropInfo(ids,parentId)});
  schematic=new window.FEMSSchematic($('schematic'),{select:id=>select(id,id?[id]:[],false,false,true),locate:id=>{const item=history.current.equipment.find(e=>e.id===id);if(!item)return;spaces?.focusFloor(item.floorId);setView('3d');select(id,[id],false,false,true);scene?.fit({preserveAngle:true});}});
  for(const key of ['3d','plan','schematic'])$('view-'+key).addEventListener('click',()=>setView(key));
  for(const direction of ['horizontal','vertical'])$('align-'+direction).addEventListener('click',()=>alignSelection(direction));
  $('fit').addEventListener('click',fitView);$('zoom-in').addEventListener('click',()=>view==='schematic'?schematic?.zoom(1/.85):scene?.zoom(.85));$('zoom-out').addEventListener('click',()=>view==='schematic'?schematic?.zoom(1/1.18):scene?.zoom(1.18));
  $('labels-toggle').addEventListener('click',()=>{if(!scene)return;scene.showLabels=!scene.showLabels;$('labels-toggle').setAttribute('aria-pressed',String(scene.showLabels));scene.invalidate();});
  $('site-edit').addEventListener('click',()=>{
    finishPropertyEdit();arm(null);
    $('site-width').value=history.current.site.width;$('site-depth').value=history.current.site.depth;
    $('site-error').textContent='';$('site-dialog').showModal();
  });
  $('site-cancel').addEventListener('click',()=>$('site-dialog').close());
  $('site-dialog').addEventListener('keydown',event=>event.stopPropagation());
  $('site-form').addEventListener('input',()=>$('site-error').textContent='');
  $('site-form').addEventListener('submit',event=>{
    event.preventDefault();
    try {
      const next=M.resizeSite(history.current,$('site-width').valueAsNumber,$('site-depth').valueAsNumber);
      if(commit(next,'대지 크기를 변경했습니다.')){$('site-dialog').close();scene?.fit();}
    } catch(error) {$('site-error').textContent=error.message;}
  });
  $('undo').addEventListener('click',()=>travel('undo'));$('redo').addEventListener('click',()=>travel('redo'));
  $('rotate').addEventListener('click',rotate);$('delete').addEventListener('click',remove);$('duplicate').addEventListener('click',duplicate);
  $('properties').addEventListener('input', event => updateProperty(event.target));
  $('equipment-code-connect').addEventListener('click',()=>toast('서버 연결 준비 중입니다. API 연결 후 설비 코드를 지정할 수 있습니다.'));
  $('lock-ratio').addEventListener('change', () => finishPropertyEdit());
  $('properties').addEventListener('focusout', event => {
    if(nameDraft?.input===event.target)cancelNameEdit();
    if (propertyEdit?.input === event.target && !document.body.dataset.numberScrubbing) finishPropertyEdit();
  });
  $('properties').addEventListener('number-scrub-start', () => finishPropertyEdit());
  $('properties').addEventListener('number-scrub-end', event => finishPropertyEdit(event.detail.commit));
  $('properties').addEventListener('keydown', event => {
    if(event.isComposing||event.keyCode===229)return;
    if(event.target.name==='name'&&(event.key==='Enter'||event.key==='Escape')){
      event.preventDefault();event.stopPropagation();
      if(event.key==='Enter')applyNameEdit();else cancelNameEdit();return;
    }
    if (event.key === 'Escape' && propertyEdit) {
      event.preventDefault();
      event.stopPropagation();
      finishPropertyEdit(false);
    }
  });
  window.addEventListener('blur', () => {
    cancelNameEdit();
    if (!document.body.dataset.numberScrubbing) finishPropertyEdit();
  });
  $('properties').addEventListener('submit',event=>{event.preventDefault();finishPropertyEdit();});
  $('project-properties').addEventListener('input',()=>{projectNameDraft=true;$('project-title').removeAttribute('aria-invalid');$('project-error').textContent='';});
  $('project-properties').addEventListener('submit',event=>event.preventDefault());
  $('project-title').addEventListener('blur',cancelProjectNameEdit);
  $('project-title').addEventListener('keydown',event=>{
    event.stopPropagation();if(event.isComposing||event.keyCode===229)return;
    if(event.key==='Enter'){event.preventDefault();applyProjectNameEdit();}
    else if(event.key==='Escape'){event.preventDefault();cancelProjectNameEdit();}
  });
  document.addEventListener('pointerdown',event=>{if(event.target!==$('project-title'))cancelProjectNameEdit();},true);
  document.addEventListener('pointerdown',event=>{if(nameDraft&&event.target!==nameDraft.input)cancelNameEdit();},true);
  function switchProject(next,message){spaces?.reset();projectSelected=false;if(library)library.filter='builtin';finishPropertyEdit();links?.clear();scene?.cancelDrag();arm(null);selected=null;selectedIds=[];groupFrame=null;const ok=commit(next,message);if(ok){if(schematic){schematic.search.value='';schematic.neighbors.checked=false;schematic.key=null;schematic.fitted=false;schematic.setState(history.current,null);}fitView();}return ok;}
  $('new').addEventListener('click',()=>switchProject(P.attach({...M.empty(),name:'새 FEMS 프로젝트'},[],'new',defaultRevision),'새 프로젝트 · 추가 에셋 목록을 초기화했습니다. 실행 취소로 복구할 수 있습니다.'));
  let defaultSnapshot=null,defaultSaving=false;
  $('export-default').addEventListener('click',()=>{
    spaces?.finish();finishPropertyEdit();links?.finishNumeric(true);
    defaultSnapshot=M.clone(history.current);
    const contents=window.FEMSDefaults.serialize(defaultSnapshot);
    $('default-source').value=contents;$('default-summary').textContent=`${history.current.name} · 설비 ${history.current.equipment.length}개 · 연결선 ${window.FEMSConnections.routes(history.current).length}개`;
    $('default-error').textContent='';$('default-dialog').showModal();
    const choices=$('project-backup-kind');choices.replaceChildren();
    for(const [key,label] of [[defaultBackupKey,'기본값 갱신 전'],[branchBackupKey,'공유 분기점 변환 전'],[M.STORAGE_KEY+'-before-spatial-v3','건물·층 구조 변경 전']]){
      try{if(localStorage.getItem(key)){const option=document.createElement('option');option.value=key;option.textContent=label;choices.append(option);}}catch{}
    }
    $('project-backups').hidden=!choices.options.length;
  });
  $('default-close').addEventListener('click',()=>$('default-dialog').close());
  $('default-dialog').addEventListener('keydown',event=>event.stopPropagation());
  $('default-dialog').addEventListener('cancel',event=>{if(defaultSaving)event.preventDefault();});
  $('default-dialog').addEventListener('close',()=>{defaultSnapshot=null;});
  $('default-overwrite').addEventListener('click',async()=>{
    if(defaultSaving||!defaultSnapshot)return;
    if(!['127.0.0.1','localhost'].includes(location.hostname)||location.protocol!=='http:'){
      $('default-error').textContent='프로젝트의 로컬 서버(http://127.0.0.1:4175)에서만 기본 프로젝트를 덮어쓸 수 있습니다.';return;
    }
    defaultSaving=true;$('default-overwrite').disabled=true;$('default-close').disabled=true;
    $('default-overwrite').textContent='저장 중…';$('default-error').textContent='';
    try{
      defaultSnapshot=await P.prepareDefault(defaultSnapshot,window.FEMSAssets.readBytes,window.FEMSAssets.ensureLocal);
      const response=await fetch('/api/default-layout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(defaultSnapshot)});
      if(!response.ok)throw new Error(window.FEMSDefaults.saveError(response.status,await response.text()));
      defaultRevision=await P.revision(defaultSnapshot,defaultSnapshot.project.assets);bundled=M.clone(defaultSnapshot);bundled.project.baseRevision=defaultRevision;history.current.project.baseRevision=defaultRevision;saveLocal();try{localStorage.setItem(defaultAppliedKey,defaultRevision);}catch{storageFailed=true;$('save-status').textContent='자동 저장 실패 · 파일로 보관';}$('default-dialog').close();toast('도면과 추가 에셋 목록을 기본값으로 저장했습니다.');
    }catch(error){$('default-error').textContent='기본 프로젝트를 저장하지 못했습니다. '+error.message;}
    finally{defaultSaving=false;$('default-overwrite').disabled=false;$('default-close').disabled=false;$('default-overwrite').textContent='덮어쓰기';}
  });
  let fileBusy=false;
  $('save').addEventListener('click',async()=>{
    if(fileBusy)return;fileBusy=true;$('save').disabled=true;
    finishPropertyEdit();links?.finishNumeric(true);const snapshot=M.clone(history.current);
    try{const result=await window.FEMSFiles.save(snapshot,window.showSaveFilePicker?.bind(window),window.FEMSAssets.readBytes);
      for(const state of [history.current,...history.past,...history.future])if(state.project?.id===snapshot.project.id)state.project.kind='file';
      saveLocal();render();toast(`프로젝트 저장 완료 · ${(result.bytes.length/1024/1024).toFixed(1)} MB · 추가 에셋 ${result.assetCount}개`);}
    catch(error){if(error.name==='AbortError')toast('파일 저장을 취소했습니다.');else toast('파일을 저장하지 못했습니다: '+error.message);}
    finally{fileBusy=false;$('save').disabled=false;}
  });
  $('open').addEventListener('click',()=>$('file').click());
  $('file').addEventListener('change',async()=>{const file=$('file').files[0];$('file').value='';if(!file||fileBusy)return;fileBusy=true;$('open').disabled=true;const beforeOpen=history.current;
    try{if(file.size>P.MAX_BYTES)throw new Error('256 MB 이하의 프로젝트를 선택하세요.');
      const result=await P.decode(await file.arrayBuffer()),used=new Set([...result.drawing.equipment,...result.drawing.buildings||[],...result.drawing.floors||[]].map(e=>e.type));
      const next=P.attach(result.drawing,C.catalog.filter(a=>a.custom&&used.has(a.type)),'file',defaultRevision);
      next.project.kind='file';next.project.id=crypto.randomUUID();
      await window.FEMSAssets.importBlobs(result.blobs);
      if(history.current!==beforeOpen)throw new Error('불러오는 중 작업이 변경되어 열기를 취소했습니다. 다시 열어주세요.');
      switchProject(next,file.name+'을(를) 열었습니다. 실행 취소로 이전 작업을 복원할 수 있습니다.');
    }catch(error){toast('파일을 열지 못했습니다: '+error.message);}finally{fileBusy=false;$('open').disabled=false;}});
  document.addEventListener('keydown',event=>{if(scene?.drag?.axis||scene?.drag?.connection){if(event.key==='Escape'){event.preventDefault();scene.cancelDrag();}return;}const editing=event.target.matches('input,textarea,select,[contenteditable=true]');if(event.key==='Escape'){if(spaces?.draft){event.preventDefault();spaces.cancelRegistration();return;}links?.cancelCorner();links?.render(view);arm(null);return;}if(editing||event.isComposing)return;if(spaces?.draft){if(event.key==='Escape')spaces.cancelRegistration();return;}
    const key=event.key.toLowerCase();if((event.ctrlKey||event.metaKey)&&key==='z'){event.preventDefault();travel(event.shiftKey?'redo':'undo');}else if((event.ctrlKey||event.metaKey)&&key==='y'){event.preventDefault();travel('redo');}else if((event.ctrlKey||event.metaKey)&&key==='s'){event.preventDefault();$('save').click();}else if(!event.ctrlKey&&!event.metaKey&&!event.altKey){if(key==='r'&&view!=='schematic')rotate();else if(key==='f')fitView();else if(key==='delete')remove();else if(key==='/'){event.preventDefault();$('equipment-search').focus();}}});
  window.addEventListener('beforeunload',event=>{if((storageFailed||!autosaveAllowed)&&history.past.length){event.preventDefault();event.returnValue='';}});
  links=new window.FEMSConnectionEditor({guides:(guides,corner)=>{if(scene){scene.connectionGuides=guides;scene.cornerMode=corner;scene.invalidate();}},state:()=>history.current,commit:next=>{if(!commit(next))throw new Error('연결선 변경을 적용하지 못했습니다.');},preview:next=>{window.FEMSConnections.external.backupBeforeEdit(history.current,next,localStorage,M.STORAGE_KEY);window.FEMSConnections.floor.backupBeforeEdit(history.current,next,localStorage,M.STORAGE_KEY);if(history.preview(next)){saveLocal();render();}},finish:ok=>{if(history.finishEdit(ok))saveLocal();render();}});
  window.FEMSNumberScrub.install($('properties'));
  window.FEMSNumberScrub.install($('site-form'));
  window.FEMSNumberScrub.install($('connection-properties'));
  library=new window.FEMSAssetLibrary({icon,arm,toast,state:()=>history.current,remove:type=>{finishPropertyEdit();return commit(M.removeAsset(history.current,type));},register:def=>{const next=M.clone(history.current);next.project.assets.push(def);return commit(next);}});
  spaces=new window.FEMSSpatialUI({
    state:()=>history.current,selectedIds:()=>selectedIds,commit,toast,refresh:()=>render(),fit:options=>{if(view!=='schematic')scene?.fit(options);},
    preview:next=>{if(history.preview(next)){saveLocal();render(true);}},finish:ok=>{if(history.finishEdit(ok))saveLocal();render(true);},
    clearEquipment:()=>{links?.clear();finishPropertyEdit();projectSelected=false;selected=null;selectedIds=[];groupFrame=null;},
    disarm:()=>arm(null),selectEquipment:(id,ids,options)=>select(id,ids,false,false,!!options?.preserveSpace),registerAsset:(kind,callback)=>library.open(kind,callback),finishEquipmentEdit:finishPropertyEdit,
  });
  renderCatalog();render();scene?.fit();
  if(assetStartupMessage)library.showStatus(assetStartupMessage);
  if(startupMessage){$('save-status').textContent='복원 실패 · 자동 저장 중지';toast(startupMessage);}else{$('save-status').textContent='로컬 작업 공간 · 자동 저장';if(branchMigrationMessage)toast(branchMigrationMessage);}
  $('project-backup-save').addEventListener('click',async()=>{
    try{
      const key=$('project-backup-kind').value,raw=localStorage.getItem(key);
      if(!raw)throw new Error('선택한 백업을 찾을 수 없습니다.');
      if(key===branchBackupKey){
        const url=URL.createObjectURL(new Blob([raw],{type:'application/json'})),link=document.createElement('a');
        link.href=url;link.download='공유분기-변환전-백업.fems';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      }else await window.FEMSFiles.save(M.validate(JSON.parse(raw)),window.showSaveFilePicker?.bind(window),window.FEMSAssets.readBytes);
      toast('선택한 이전 작업 백업을 저장했습니다.');
    }
    catch(error){if(error.name!=='AbortError')$('default-error').textContent=error.message;}
  });
  if(defaultLoaded&&!startupMessage)toast('새 기본 프로젝트를 불러왔습니다. 이전 작업은 백업했습니다.');
})();
