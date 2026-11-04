(function(root){
  'use strict';
  const $=id=>document.getElementById(id),C=root.FEMSCatalog,A=root.FEMSAssets,F=root.FEMSAssetFormat;
  const imageKey=def=>def.custom?[def.type,def.sha256||'',def.width,def.depth,def.height].join(':'):def.type;
  class Library{
    constructor(handlers){
      this.handlers=handlers;this.filter='builtin';this.signature='';this.images={};this.imageJobs=new Set();this.queue=Promise.resolve();this.token=0;
      try{this.images=root.FEMSThumbnails();}catch{}
      for(const kind of ['builtin','custom'])$('catalog-'+kind).addEventListener('click',()=>{this.filter=kind;handlers.arm(null);this.render(null);});
      $('catalog').addEventListener('scroll',()=>this.hideTip());window.addEventListener('resize',()=>this.hideTip());
      $('asset-open').addEventListener('click',()=>this.open());
      $('asset-cancel').addEventListener('click',()=>$('asset-dialog').close());
      $('asset-dialog').addEventListener('cancel',event=>{if(this.saving)event.preventDefault();});
      // Keep editor shortcuts (Delete, undo, rotation) inside this modal.
      $('asset-dialog').addEventListener('keydown',event=>event.stopPropagation());
      $('asset-dialog').addEventListener('close',()=>{++this.token;this.clearPreview();});
      $('asset-file').addEventListener('change',()=>this.choose());
      for(const name of ['width','depth','height']){
        const input=$('asset-'+name);
        input.addEventListener('input',()=>this.resize(input));
        input.addEventListener('change',()=>this.finishResize());
        input.addEventListener('blur',()=>this.finishResize());
      }
      $('asset-lock-ratio').addEventListener('change',()=>this.finishResize());
      $('asset-form').addEventListener('number-scrub-start',()=>this.finishResize());
      $('asset-form').addEventListener('number-scrub-end',event=>this.finishResize(event.detail.commit));
      root.FEMSNumberScrub.install($('asset-form'));
      $('asset-form').addEventListener('submit',event=>{event.preventDefault();this.register();});
      $('asset-delete-cancel').addEventListener('click',()=>$('asset-delete-dialog').close());
      $('asset-delete-confirm').addEventListener('click',()=>this.confirmRemove());
      $('asset-delete-dialog').addEventListener('keydown',event=>event.stopPropagation());
      $('asset-delete-dialog').addEventListener('close',()=>{this.pendingRemove=null;});
    }
    hideTip(){$('catalog-tooltip').hidden=true;}
    buttons(){return [...$('catalog').children].map(tile=>tile.className==='equipment-thumbnail-item'?tile.children[0]:tile);}
    askRemove(def){
      const state=this.handlers.state(),entry=state.project?.assets.find(asset=>asset.type===def.type);
      if(!entry)return;
      this.hideTip();this.handlers.arm(null);
      this.pendingRemove={type:entry.type,projectId:state.project.id,sha256:entry.sha256};
      const count=state.equipment.filter(item=>item.type===entry.type).length;
      $('asset-delete-title').textContent='추가 설비를 삭제할까요?';
      $('asset-delete-name').textContent=entry.name;
      $('asset-delete-message').textContent=count?`배치된 설비 ${count}개도 함께 삭제됩니다.\n원본 파일은 보관됩니다.\n실행 취소로 복원할 수 있습니다.`:'현재 프로젝트의 추가 설비 목록에서 삭제합니다.\n원본 파일은 보관됩니다.\n실행 취소로 복원할 수 있습니다.';
      $('asset-delete-error').textContent='';$('asset-delete-confirm').hidden=false;
      $('asset-delete-cancel').textContent='취소';
      $('asset-delete-dialog').showModal();
    }
    confirmRemove(){
      const pending=this.pendingRemove;if(!pending)return;
      const state=this.handlers.state(),entry=state.project?.assets.find(asset=>asset.type===pending.type);
      if(state.project?.id!==pending.projectId||!entry||entry.sha256!==pending.sha256){$('asset-delete-error').textContent='목록이 변경되었습니다. 닫고 다시 선택하세요.';return;}
      try{
        if(!this.handlers.remove(pending.type))throw new Error('추가 설비를 삭제하지 못했습니다.');
        $('asset-delete-dialog').close();this.handlers.toast('추가 설비를 삭제했습니다. 실행 취소로 복원할 수 있습니다.');
      }catch(error){$('asset-delete-error').textContent=error.message;}
    }
    render(armed){
      for(const kind of ['builtin','custom'])$('catalog-'+kind).setAttribute('aria-pressed',String(this.filter===kind));
      const entries=C.catalog.filter(def=>!!def.custom===(this.filter==='custom'));
      const signature=this.filter+entries.map(def=>imageKey(def)+':'+def.name+':'+def.en).join('|');
      if(signature!==this.signature){
        this.signature=signature;this.hideTip();$('catalog').replaceChildren();
        for(const def of entries){
          const button=document.createElement('button');button.className='equipment-thumbnail';button.dataset.type=def.type;
          button.draggable=true;
          button.addEventListener('dragstart',event=>{
            if(button.disabled){event.preventDefault();return;}
            this.hideTip();event.dataTransfer.setData('application/x-fems-equipment',def.type);event.dataTransfer.effectAllowed='copy';
            this.handlers.arm(def.type);
          });
          button.addEventListener('dragend',()=>{this.hideTip();this.handlers.arm(null);});
          button.setAttribute('aria-label',def.name+' 배치');button.setAttribute('aria-describedby','catalog-tooltip');button.title=def.name+(def.en?' · '+def.en:'');
          button.innerHTML=this.handlers.icon(def.type);
          const show=()=>{const tip=$('catalog-tooltip'),rect=button.getBoundingClientRect();tip.querySelector('strong').textContent=def.name;tip.querySelector('span').textContent=def.en;tip.hidden=false;const width=tip.getBoundingClientRect().width;tip.style.left=Math.max(width/2+10,Math.min(innerWidth-width/2-10,rect.left+rect.width/2))+'px';tip.style.top=rect.top-10+'px';};
          button.addEventListener('pointerenter',show);button.addEventListener('focus',show);button.addEventListener('pointerleave',()=>this.hideTip());button.addEventListener('blur',()=>this.hideTip());
          button.addEventListener('click',()=>{this.hideTip();this.handlers.arm(this.armed===def.type?null:def.type);});
          if(def.custom){
            const tile=document.createElement('div');tile.className='equipment-thumbnail-item';
            const remove=document.createElement('button');remove.type='button';remove.className='asset-remove';remove.textContent='×';
            remove.title=def.name+' 삭제';remove.setAttribute('aria-label',def.name+' 추가 설비 삭제');
            remove.addEventListener('pointerenter',()=>this.hideTip());remove.addEventListener('focus',()=>this.hideTip());
            remove.addEventListener('click',event=>{event.stopPropagation();this.askRemove(def);});
            tile.append(button);tile.append(remove);$('catalog').append(tile);
          }else $('catalog').append(button);
          const key=imageKey(def);
          if(def.custom&&!this.imageJobs.has(key)){
            this.imageJobs.add(key);
            this.queue=this.queue.then(async()=>{try{if(C.get(def.type)?.sha256!==def.sha256||C.get(def.type)?.missing){this.imageJobs.delete(key);return;}const {object}=await A.load(def.type);this.images[key]=A.picture(object,def);}
              catch(error){this.images[key]=null;if(C.get(def.type)?.sha256===def.sha256&&!C.get(def.type)?.missing)this.showStatus(def.name+': '+error.message);}
              this.paint(def.type);
            });
          }
          this.paint(def.type);
        }
        $('asset-library-status').hidden=entries.length>0;
        if(!entries.length)$('asset-library-status').textContent='에셋 등록으로 GLB 설비를 추가하세요.';
      }
      this.armed=armed;for(const button of this.buttons())button.setAttribute('aria-pressed',String(armed===button.dataset.type));
    }
    showStatus(message){$('asset-library-status').hidden=false;$('asset-library-status').textContent=message;}
    paint(type){
      const button=this.buttons().find(b=>b.dataset.type===type);if(!button)return;
      const key=imageKey(C.get(type));
      if(this.images[key]){const image=document.createElement('img');image.src=this.images[key];image.alt='';image.draggable=false;button.replaceChildren(image);}
      else if(this.images[key]===null){button.disabled=true;button.title='에셋 파일을 확인하세요: '+C.get(type).model;}
    }
    clearPreview(){clearTimeout(this.pictureTimer);this.finishResize(false);this.dimensions=null;if(this.preview)A.release(this.preview.object);this.preview=null;this.file=null;$('asset-preview').hidden=true;$('asset-preview').removeAttribute('src');$('asset-preview-note').hidden=false;$('asset-register').disabled=true;}
    async open(){
      this.clearPreview();$('asset-form').reset();$('asset-error').textContent='';$('asset-preview-note').textContent='GLB 파일을 선택하세요.';
      this.canRegister=false;$('asset-dialog').showModal();
      try{const response=await fetch('api/assets');this.canRegister=response.ok&&(await response.json()).canRegister===true;}catch{}
      if(!this.canRegister)$('asset-error').textContent='등록은 새 로컬 서버에서 가능합니다. npm run dev로 실행한 화면을 사용하세요.';
      $('asset-register').disabled=!this.canRegister||!this.preview;
    }
    async choose(){
      const token=++this.token,file=$('asset-file').files[0];this.clearPreview();$('asset-error').textContent='';if(!file)return;
      $('asset-preview-note').textContent='모델을 확인하는 중…';
      try{
        if(!/\.glb$/i.test(file.name)||file.size>F.MAX_BYTES)throw new Error('25 MB 이하의 GLB 파일을 선택하세요.');
        const preview=await A.parse(await file.arrayBuffer());
        if(token!==this.token){A.release(preview.object);return;}
        this.preview=preview;this.file=file;$('asset-name').value=file.name.replace(/\.glb$/i,'').slice(0,60);
        let adjusted=false;
        for(const key of ['width','depth','height']){const value=Math.max(.2,Math.min(key==='height'?40:30,preview.size[key]));adjusted||=Math.abs(value-preview.size[key])>.0001;$('asset-'+key).value=Number(value.toFixed(4));}
        this.dimensions=this.values();this.updatePicture();$('asset-register').disabled=!this.canRegister;
        if(adjusted)$('asset-error').textContent='모델 치수가 편집 범위를 벗어나 조정했습니다. 실제 치수(m)를 확인하세요.';
        if(!this.canRegister)$('asset-error').textContent='미리보기만 가능합니다. 등록하려면 최신 로컬 서버(npm run dev)를 실행하세요.';
      }catch(error){if(token!==this.token)return;this.clearPreview();$('asset-preview-note').textContent='파일을 다시 선택하세요.';$('asset-error').textContent=error.message;}
    }
    values(){return {name:$('asset-name').value,en:$('asset-en').value,...Object.fromEntries(['width','depth','height'].map(key=>[key,$('asset-'+key).valueAsNumber]))};}
    resize(input){
      if(!this.dimensions)return;
      if(this.sizeEdit?.input!==input)this.finishResize();
      this.sizeEdit??={input,baseline:{...this.dimensions},lock:$('asset-lock-ratio').checked};
      try{
        const next={...this.dimensions,...root.FEMSModel.resizeDimensions(this.sizeEdit.baseline,input.name,input.valueAsNumber,this.sizeEdit.lock)};
        for(const key of ['width','depth','height']){
          const field=$('asset-'+key);
          if(!Number.isFinite(next[key])||next[key]<Number(field.min)||next[key]>Number(field.max))throw new Error('가로·세로 0.2~30 m, 높이 0.2~40 m 범위로 입력하세요.');
        }
        this.dimensions=next;
        for(const key of ['width','depth','height'])if($('asset-'+key)!==input)$('asset-'+key).value=next[key];
        input.setCustomValidity('');input.removeAttribute('aria-invalid');$('asset-size-error').textContent='';
        clearTimeout(this.pictureTimer);this.pictureTimer=setTimeout(()=>this.updatePicture(),80);
      }catch(error){input.setCustomValidity(error.message);input.setAttribute('aria-invalid','true');$('asset-size-error').textContent=error.message;}
    }
    finishResize(commit=true){
      if(!this.sizeEdit)return;
      clearTimeout(this.pictureTimer);
      if(!commit)this.dimensions=this.sizeEdit.baseline;
      for(const key of ['width','depth','height']){
        const input=$('asset-'+key);input.value=this.dimensions[key];input.setCustomValidity('');input.removeAttribute('aria-invalid');
      }
      this.sizeEdit=null;$('asset-size-error').textContent='';this.updatePicture();
    }
    updatePicture(){
      if(!this.preview)return;
      const values=this.values();if(!['width','depth','height'].every(k=>Number.isFinite(values[k])&&values[k]>0))return;
      try{$('asset-preview').src=A.picture(this.preview.object,values);$('asset-preview').hidden=false;$('asset-preview-note').hidden=true;}
      catch{$('asset-preview-note').textContent='미리보기를 표시할 수 없습니다.';}
    }
    async register(){
      if(this.saving||!this.preview||!this.file||!this.canRegister)return;
      const values=this.values();
      try{F.metadata({...values,type:'asset-preview'});}catch(error){$('asset-error').textContent=error.message;return;}
      this.saving=true;for(const control of $('asset-form').elements)control.disabled=true;
      $('asset-error').textContent='';$('asset-register').textContent='등록 중…';
      try{
        const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(new Error('파일을 읽지 못했습니다.'));reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(this.file);});
        const response=await fetch('api/assets',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...values,glb:data})});
        if(!response.ok)throw new Error(await response.text());
        const def=F.metadata(await response.json());
        if(!this.handlers.register(def))throw new Error('현재 도면에 에셋을 추가하지 못했습니다.');
        try{const key=imageKey(def);this.images[key]=A.picture(this.preview.object,def);this.imageJobs.add(key);}catch{}
        this.filter='custom';this.handlers.arm(null);this.render(null);$('asset-dialog').close();this.handlers.toast(def.name+' 에셋을 등록했습니다.');
      }catch(error){$('asset-error').textContent='등록하지 못했습니다. '+error.message;}
      finally{this.saving=false;for(const control of $('asset-form').elements)control.disabled=false;$('asset-register').textContent='등록';$('asset-register').disabled=!this.preview||!this.canRegister;}
    }
  }
  root.FEMSAssetLibrary=Library;
})(window);
