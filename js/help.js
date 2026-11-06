(function(){
  'use strict';
  const dialog=document.getElementById('help-dialog'),open=document.getElementById('help-open'),content=dialog.querySelector('.help-content');
  open.addEventListener('click',()=>{if(dialog.open)return;dialog.showModal();content.scrollTop=0;});
  for(const id of ['help-close','help-done'])document.getElementById(id).addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>open.focus({preventScroll:true}));
  const imageDialog=document.getElementById('help-image-dialog'),fullImage=document.getElementById('help-image-full');
  let imageTrigger=null;
  const isolateKeys=event=>{
    // Keep editing shortcuts away from the drawing while this modal owns focus.
    event.stopPropagation();
    if((event.ctrlKey||event.metaKey)&&['s','z','y'].includes(event.key.toLowerCase()))event.preventDefault();
  };
  dialog.addEventListener('keydown',isolateKeys);
  imageDialog.addEventListener('keydown',isolateKeys);
  document.getElementById('help-image-close').addEventListener('click',()=>imageDialog.close());
  imageDialog.addEventListener('close',()=>{if(dialog.open)imageTrigger?.focus({preventScroll:true});});
  dialog.addEventListener('close',()=>{if(imageDialog.open)imageDialog.close();});
  for(const button of dialog.querySelectorAll('.help-image-open'))button.addEventListener('click',()=>{
    const source=button.querySelector('img');imageTrigger=button;
    fullImage.src=source.src;fullImage.alt=source.alt;
    fullImage.style.width=((source.naturalWidth||Number(source.getAttribute('width')))*2)+'px';
    document.getElementById('help-image-caption').textContent=source.alt;
    imageDialog.showModal();
    const stage=imageDialog.querySelector('.help-image-stage');stage.scrollTop=0;stage.scrollLeft=0;
  });
  for(const button of dialog.querySelectorAll('[data-help-target]'))button.addEventListener('click',()=>{
    const heading=document.getElementById(button.dataset.helpTarget);
    heading.scrollIntoView({block:'start'});heading.focus({preventScroll:true});
  });
})();
