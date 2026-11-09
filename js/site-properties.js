(function(root){
  'use strict';
  const M=root.FEMSModel,$=id=>document.getElementById(id);
  class SiteProperties{
    constructor(api){
      this.api=api;this.visible=false;this.snapshot='';this.nameDirty=false;this.sizeDirty=false;
      $('site-name-form').addEventListener('submit',event=>{event.preventDefault();this.applyName();});
      $('site-name').addEventListener('input',()=>{this.nameDirty=true;$('site-name-error').textContent='';$('site-name').removeAttribute('aria-invalid');});
      $('site-name').addEventListener('blur',()=>this.cancelName());
      $('site-name').addEventListener('keydown',event=>{
        if(event.isComposing)return;
        if(event.key==='Enter'){event.preventDefault();this.applyName();}
        if(event.key==='Escape'){event.preventDefault();this.cancelName();}
      });
      $('site-form').addEventListener('input',()=>{this.sizeDirty=true;$('site-error').textContent='';this.area();});
      $('site-form').addEventListener('submit',event=>{event.preventDefault();this.applySize();});
      $('site-form').addEventListener('keydown',event=>{if(event.key==='Escape'&&!event.isComposing){event.preventDefault();this.cancelSize();}});
      $('site-cancel').addEventListener('click',()=>this.cancelSize());
      $('site-properties').addEventListener('keydown',event=>{
        // Keep app shortcuts from rotating/deleting objects or undoing while typing.
        event.stopPropagation();
        if((event.ctrlKey||event.metaKey)&&['s','z','y'].includes(event.key.toLowerCase()))event.preventDefault();
      });
    }
    cancelName(){this.nameDirty=false;$('site-name').value=this.api.state().site.name??'대지';$('site-name').removeAttribute('aria-invalid');$('site-name-error').textContent='';}
    cancelSize(){this.sizeDirty=false;const site=this.api.state().site;$('site-width').value=M.displayCoordinate(site.width);$('site-depth').value=M.displayCoordinate(site.depth);$('site-error').textContent='';this.area();}
    sizeValue(name){const value=$('site-'+name).valueAsNumber,original=this.api.state().site[name];return value===M.displayCoordinate(original)?original:value;}
    area(){const width=this.sizeValue('width'),depth=this.sizeValue('depth');$('site-area').textContent=Number.isFinite(width)&&Number.isFinite(depth)&&width>=M.SITE_MIN&&depth>=M.SITE_MIN&&width<=M.SITE_MAX&&depth<=M.SITE_MAX?M.displayCoordinate(width*depth).toLocaleString('en-US')+' m²':'—';}
    applyName(){
      if(!this.api.selected()||!this.nameDirty)return;
      try{const next=M.renameSite(this.api.state(),$('site-name').value);if(this.api.commit(next,'대지 이름을 변경했습니다.')){this.nameDirty=false;this.render();}}
      catch(error){$('site-name').setAttribute('aria-invalid','true');$('site-name-error').textContent=error.message;}
    }
    applySize(){
      if(!this.api.selected())return;
      try{const next=M.resizeSite(this.api.state(),this.sizeValue('width'),this.sizeValue('depth'));if(this.api.commit(next,'대지 크기를 변경했습니다.')){this.sizeDirty=false;this.cancelSize();this.render();}}
      catch(error){$('site-error').textContent=error.message;}
    }
    render(){
      const visible=this.api.selected(),snapshot=JSON.stringify(this.api.state().site),changed=this.snapshot!==snapshot;
      $('site-properties').hidden=!visible;
      if(!visible||!this.visible||changed){this.cancelName();this.cancelSize();}
      if(visible)for(const id of ['properties','project-properties','spatial-properties','connection-properties','inspector-empty'])$(id).hidden=true;
      this.snapshot=snapshot;this.visible=visible;
    }
  }
  root.FEMSSiteProperties=SiteProperties;
})(window);
