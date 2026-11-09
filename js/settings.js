(function(){
  'use strict';
  const dialog=document.getElementById('settings-dialog'),open=document.getElementById('settings-open');
  open.addEventListener('click',()=>{if(!dialog.open)dialog.showModal();});
  for(const id of ['settings-close','settings-done'])document.getElementById(id).addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>open.focus({preventScroll:true}));
  dialog.addEventListener('keydown',event=>{
    event.stopPropagation();
    if((event.ctrlKey||event.metaKey)&&['s','z','y'].includes(event.key.toLowerCase()))event.preventDefault();
  });
  // Language is live; editor and theme controls remain preview selections.
  for(const group of dialog.querySelectorAll('.settings-options')){
    const buttons=group.querySelectorAll('button');
    for(const button of buttons)button.addEventListener('click',()=>{
      if(button.dataset.language){window.FEMSI18n.setLanguage(button.dataset.language);return;}
      for(const option of buttons)option.setAttribute('aria-pressed',String(option===button));
    });
  }
})();
