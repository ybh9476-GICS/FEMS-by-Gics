(function(root){
  'use strict';
  // Keep the native file control for keyboard access and picking files. Only its visible copy is replaced.
  for(const input of document.querySelectorAll('input[type=file][data-file-label]')){
    const label=document.getElementById(input.dataset.fileLabel);
    const sync=()=>{
      const name=input.files?.[0]?.name;
      root.FEMSI18n?.protect(label,!!name);
      label.textContent=name||'선택된 파일 없음';
      if(name)label.title=name;else label.removeAttribute('title');
    };
    input.addEventListener('change',sync);
    input.form?.addEventListener('reset',()=>queueMicrotask(sync));
    sync();
  }
})(window);
