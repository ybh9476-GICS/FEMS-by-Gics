(function () {
  'use strict';
  const C=window.FEMSCatalog, M=window.FEMSModel, $=id=>document.getElementById(id);
  let initial=window.FEMSDefaults.seed(window.FEMSDefaultLayout), startupMessage='', autosaveAllowed=true, storageFailed=false;
  try {const saved=localStorage.getItem(M.STORAGE_KEY);if(saved)initial=M.validate(JSON.parse(saved));}
  catch(error){autosaveAllowed=false;startupMessage='이전 작업을 읽지 못했습니다. 원본 보존을 위해 자동 저장을 중지했습니다. 파일 열기·도면 저장은 사용할 수 있습니다.';}
  const history=new M.History(initial);let selected=null,armed=null,view='3d',scene=null,tree=null,links=null,toastTimer;
  let numericEdit = null;
  const dimensionFields = ['width', 'depth', 'height'];
  function syncDimensions(item, exceptInput = null) {
    for (const name of dimensionFields) {
      const input = $('properties').elements.namedItem(name);
      if (input !== exceptInput) input.value = item[name];
    }
  }
  function finishNumeric(commit = true) {
    if (!numericEdit) return;
    const { input, id } = numericEdit;
    numericEdit = null;
    const changed = history.finishEdit(commit);
    const item = history.current.equipment.find(e => e.id === id);
    if (item) { input.value = item[input.name]; syncDimensions(item); }
    input.removeAttribute('aria-invalid');
    $('property-error').textContent = '';
    if (changed) saveLocal();
    if (!commit && changed) render(true);
    $('undo').disabled = !history.past.length;
    $('redo').disabled = !history.future.length;
  }
  function updateNumeric(input) {
    if (!selected || !input.matches('input[type=number]')) return;
    if (numericEdit && numericEdit.input !== input) finishNumeric();
    if (!numericEdit) numericEdit = { input, id: selected,
      baseline: M.clone(history.current.equipment.find(item => item.id === selected)),
      lockRatio: $('lock-ratio').checked };
    try {
      if (!Number.isFinite(input.valueAsNumber)) throw new Error('숫자를 입력하세요. 마지막 유효한 값을 유지합니다.');
      const next = M.clone(history.current);
      const item = next.equipment.find(item => item.id === selected);
      if (dimensionFields.includes(input.name)) {
        Object.assign(item, M.resizeDimensions(numericEdit.baseline, input.name, input.valueAsNumber, numericEdit.lockRatio));
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
  function toast(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,5500);}
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
  function commit(next,message){try{if(history.commit(next)){saveLocal();render();if(message)toast(message);}return true;}catch(error){toast(error.message);scene?.setState(history.current,selected,M.overlaps(history.current));return false;}}
  function select(id){links?.clear();finishNumeric();if(armed)arm(null);selected=id;render();}
  function reparent(id,parentId,referenceId,position='inside'){
    links?.clear();
    finishNumeric();
    try{
      const next=M.moveEquipment(history.current,id,parentId,referenceId,position);selected=id;
      commit(next,position!=='inside'?'설비의 계층과 순서를 변경했습니다.':parentId?'하위 설비로 연결했습니다.':'최상위 목록 끝으로 이동했습니다.');render();
    }catch(error){toast(error.message);}
  }
  function add(type,x,z){try{const next=M.clone(history.current),item=M.create(type,next,x,z);next.equipment.push(item);const previous=selected;selected=item.id;if(commit(next,`${item.code} ${item.name}을(를) 배치했습니다.`))arm(null);else selected=previous;}catch(error){toast(error.message);}}
  function changeSelected(changes,message){if(!selected)return;const next=M.clone(history.current);Object.assign(next.equipment.find(item=>item.id===selected),changes);return commit(next,message);}
  function renderInspector(){const item=history.current.equipment.find(e=>e.id===selected);$('properties').hidden=!item;$('inspector-empty').hidden=!!item;$('property-error').textContent='';if(!item)return;const def=C.get(item.type);$('selection-type').textContent=def.name;$('selection-en').textContent=def.en;$('selection-icon').innerHTML=icon(item.type);$('selection-description').textContent=def.description;
    for(const name of ['name','code','x','z','rotation','width','depth','height'])$('properties').elements.namedItem(name).value=item[name];}
  function renderTable(){const body=$('equipment-table');body.replaceChildren();for(const item of history.current.equipment){const row=document.createElement('tr');row.dataset.id=item.id;row.setAttribute('aria-selected',String(selected===item.id));const values=[item.code,item.name,C.get(item.type).name,`${item.x} / ${item.z}`,`${item.width} × ${item.depth} × ${item.height}`,`${item.rotation}°`];values.forEach((value,index)=>{const td=document.createElement('td');if(index===0){const button=document.createElement('button');button.textContent=value;button.setAttribute('aria-label',`${item.code} 선택`);td.appendChild(button);}else td.textContent=value;row.appendChild(td);});row.addEventListener('click',()=>select(item.id));body.appendChild(row);}$('table-empty').hidden=history.current.equipment.length>0;}
  function render(preserveInputs=false){const state=history.current;if(!state.equipment.some(e=>e.id===selected))selected=null;const warnings=M.overlaps(state);$('equipment-count').textContent=state.equipment.length;$('tree-count').textContent=state.equipment.length;$('project-name').textContent=state.name;$('site-size').textContent=`${state.site.width} × ${state.site.depth} m`;$('empty-state').hidden=state.equipment.length>0||!!armed;$('undo').disabled=!history.past.length&&!history.editingChanged;$('redo').disabled=!history.future.length||history.editingChanged;$('overlap-status').textContent=warnings.size?`배치 겹침 ${warnings.size}개 확인`:'';if(!preserveInputs)renderInspector();renderTable();tree?.render(state,selected);links?.render(view);if(scene)scene.connectionSelection=links?.selection;scene?.setState(state,selected,warnings);}
  function setView(next){if(scene?.drag?.connection)scene.cancelDrag();links?.clear();view=next;renderInspector();links?.render(view);if(scene)scene.connectionSelection=null;for(const key of ['3d','plan','list'])$('view-'+key).setAttribute('aria-selected',String(key===view));$('viewport').hidden=view==='list';$('table-view').hidden=view!=='list';$('fit').disabled=view==='list';if(view==='list'){arm(null);}else{scene?.setMode(view);$('scene').setAttribute('aria-label',view==='plan'?'평면 설비 배치도':'3D 설비 배치도');}}
  function travel(direction){if(scene?.drag?.connection)scene.cancelDrag();links?.clear();if(history[direction]()){selected=null;arm(null);saveLocal();render();toast(direction==='undo'?'실행을 취소했습니다.':'다시 실행했습니다.');}}
  function rotate(){finishNumeric();const item=history.current.equipment.find(e=>e.id===selected);if(item)changeSelected({rotation:(item.rotation+90)%360},'90° 회전했습니다.');}
  function remove(){if(links?.selection){links.remove();return;}if(!selected)return;const hasChildren=history.current.equipment.some(e=>e.parentId===selected);commit(M.removeEquipment(history.current,selected),hasChildren?'설비를 삭제하고 하위 설비는 한 단계 위로 옮겼습니다. 실행 취소할 수 있습니다.':'설비를 삭제했습니다. 실행 취소로 복원할 수 있습니다.');}
  function duplicate(){const item=history.current.equipment.find(e=>e.id===selected);if(!item)return;try{const next=M.clone(history.current),copy=M.create(item.type,next);const id=copy.id,code=copy.code;Object.assign(copy,item,{id,code});Object.assign(copy,M.clampPosition(copy,item.x+item.width+1,item.z, next.site));next.equipment.push(copy);selected=copy.id;commit(next,'설비를 복제했습니다. 위치와 겹침을 확인하세요.');}catch(error){toast(error.message);}}
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
  try{scene=new window.FEMSScene($('scene'),$('labels'),{select,place:add,move:(id,pos)=>{selected=id;changeSelected(pos,'설비 위치를 변경했습니다.');},gizmoStart:()=>finishNumeric(),gizmoPreview:previewGizmo,gizmoEnd:finishGizmo,connectionSelect:hit=>{finishNumeric();selected=null;links.select(hit);render();},connectionStart:hit=>links.start(hit),connectionPreview:(pos,options)=>links.preview(pos,options),connectionEnd:ok=>links.finish(ok),error:graphicsError},$('gizmo-rotate'));}
  catch(error){graphicsError('3D 화면을 시작할 수 없습니다. WebGL 2를 지원하는 Edge 또는 Chrome에서 그래픽 가속을 확인하세요. 설비 목록과 속성 편집·파일 저장은 계속 사용할 수 있습니다.');}
  tree=new window.FEMSEquipmentTree($('equipment-tree'),$('equipment-search'),{select,reparent,error:toast});
  $('cancel-placement').addEventListener('click',()=>arm(null));
  for(const key of ['3d','plan','list'])$('view-'+key).addEventListener('click',()=>setView(key));
  $('fit').addEventListener('click',()=>scene?.fit());$('zoom-in').addEventListener('click',()=>scene?.zoom(.85));$('zoom-out').addEventListener('click',()=>scene?.zoom(1.18));
  $('labels-toggle').addEventListener('click',()=>{if(!scene)return;scene.showLabels=!scene.showLabels;$('labels-toggle').setAttribute('aria-pressed',String(scene.showLabels));scene.invalidate();});
  $('undo').addEventListener('click',()=>travel('undo'));$('redo').addEventListener('click',()=>travel('redo'));
  $('rotate').addEventListener('click',rotate);$('delete').addEventListener('click',remove);$('duplicate').addEventListener('click',duplicate);
  $('properties').addEventListener('input', event => updateNumeric(event.target));
  $('lock-ratio').addEventListener('change', () => finishNumeric());
  $('properties').addEventListener('focusout', event => {
    if (numericEdit?.input === event.target && !document.body.dataset.numberScrubbing) finishNumeric();
  });
  $('properties').addEventListener('number-scrub-start', () => finishNumeric());
  $('properties').addEventListener('number-scrub-end', event => finishNumeric(event.detail.commit));
  $('properties').addEventListener('keydown', event => {
    if (event.key === 'Escape' && numericEdit) {
      event.preventDefault();
      event.stopPropagation();
      finishNumeric(false);
    }
  });
  window.addEventListener('blur', () => {
    if (!document.body.dataset.numberScrubbing) finishNumeric();
  });
  $('properties').addEventListener('submit',event=>{event.preventDefault();if(!selected)return;const next=M.clone(history.current),item=next.equipment.find(e=>e.id===selected);for(const key of ['name','code','x','z','rotation','width','depth','height']){const value=$('properties').elements.namedItem(key).value;item[key]=['name','code'].includes(key)?value.trim():Number(value);}
    try{M.validate(next);commit(next,'설비 속성을 적용했습니다.');}catch(error){$('property-error').textContent=error.message;}});
  $('new').addEventListener('click',()=>{arm(null);commit(M.empty(),'빈 도면을 만들었습니다. 실행 취소로 이전 배치를 복원할 수 있습니다.');scene?.fit();});
  let defaultExportUrl=null;
  $('export-default').addEventListener('click',()=>{
    finishNumeric();links?.finishNumeric(true);
    const contents=window.FEMSDefaults.serialize(history.current);
    $('default-source').value=contents;$('default-summary').textContent=`${history.current.name} · 설비 ${history.current.equipment.length}개 · 연결선 ${window.FEMSConnections.routes(history.current).length}개`;
    if(defaultExportUrl)URL.revokeObjectURL(defaultExportUrl);
    defaultExportUrl=URL.createObjectURL(new Blob([contents],{type:'text/javascript;charset=utf-8'}));$('default-download').href=defaultExportUrl;$('default-dialog').showModal();
  });
  $('default-close').addEventListener('click',()=>$('default-dialog').close());
  $('default-dialog').addEventListener('keydown',event=>event.stopPropagation());
  $('default-dialog').addEventListener('close',()=>{if(defaultExportUrl)URL.revokeObjectURL(defaultExportUrl);defaultExportUrl=null;});
  $('save').addEventListener('click',async()=>{
    try{await window.FEMSFiles.save(history.current,window.showSaveFilePicker?.bind(window));toast('선택한 파일에 도면을 저장했습니다.');}
    catch(error){if(error.name==='AbortError')toast('파일 저장을 취소했습니다.');else toast('파일을 저장하지 못했습니다: '+error.message);}
  });
  $('open').addEventListener('click',()=>$('file').click());
  $('file').addEventListener('change',async()=>{const file=$('file').files[0];$('file').value='';if(!file)return;try{if(file.size>2*1024*1024)throw new Error('2 MB 이하의 FEMS 도면을 선택하세요.');const next=M.validate(JSON.parse(await file.text()));arm(null);commit(next,`${file.name}을(를) 열었습니다. 실행 취소로 이전 배치를 복원할 수 있습니다.`);scene?.fit();}catch(error){toast('파일을 열지 못했습니다. '+error.message);}});
  document.addEventListener('keydown',event=>{if(scene?.drag?.axis||scene?.drag?.connection){if(event.key==='Escape'){event.preventDefault();scene.cancelDrag();}return;}const editing=event.target.matches('input,textarea,select,[contenteditable=true]');if(event.key==='Escape'){links?.cancelCorner();links?.render(view);arm(null);return;}if(editing||event.isComposing)return;
    const key=event.key.toLowerCase();if((event.ctrlKey||event.metaKey)&&key==='z'){event.preventDefault();travel(event.shiftKey?'redo':'undo');}else if((event.ctrlKey||event.metaKey)&&key==='y'){event.preventDefault();travel('redo');}else if((event.ctrlKey||event.metaKey)&&key==='s'){event.preventDefault();$('save').click();}else if(!event.ctrlKey&&!event.metaKey&&!event.altKey){if(key==='r')rotate();else if(key==='f')scene?.fit();else if(key==='delete')remove();else if(key==='/'){event.preventDefault();$('equipment-search').focus();}}});
  window.addEventListener('beforeunload',event=>{if((storageFailed||!autosaveAllowed)&&history.past.length){event.preventDefault();event.returnValue='';}});
  links=new window.FEMSConnectionEditor({guides:(guides,corner)=>{if(scene){scene.connectionGuides=guides;scene.cornerMode=corner;scene.invalidate();}},state:()=>history.current,commit:next=>{if(!commit(next))throw new Error('연결선 변경을 적용하지 못했습니다.');},preview:next=>{if(history.preview(next)){saveLocal();render();}},finish:ok=>{if(history.finishEdit(ok))saveLocal();render();}});
  window.FEMSNumberScrub.install($('properties'));
  window.FEMSNumberScrub.install($('connection-properties'));
  renderCatalog();render();scene?.fit();
  if(startupMessage){$('save-status').textContent='복원 실패 · 자동 저장 중지';toast(startupMessage);}else $('save-status').textContent='로컬 작업 공간 · 자동 저장';
})();
