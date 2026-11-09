(function(){
  const I=window.FEMSI18n,original=I.language,$=id=>document.getElementById(id);
  document.getElementById('run').onclick=async()=>{
    const checks=[],check=(value,name)=>{if(!value)throw new Error(name);checks.push('PASS '+name);},tick=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    try{
      I.setLanguage('ko');$('draft').focus();$('draft').setSelectionRange(2,5);
      const names=[...document.querySelectorAll('#project-name,.tree-name,.object-label,.schematic-node-name,.power-node,#asset-delete-name,[data-i18n-skip]')].filter(e=>e.id!=='results').map(e=>[e,e.textContent]);
      for(const locale of ['en','ja','ko','ja','en']){
        I.setLanguage(locale);await tick();
        check(document.documentElement.lang===locale,locale+' document language');
        check($('copy').textContent===I.translate('설정'),locale+' static text');
        check($('hint').title===I.translate('빌보드 표시 켜기/끄기'),locale+' tooltip');
        check($('choose-file').textContent===I.translate('파일 선택'),locale+' file button');
        check($('picked-name').textContent===I.translate('선택된 파일 없음'),locale+' empty filename');
        check($('junction-label').textContent===I.translate('분기점 · 3개 설비')&&$('connection-title').querySelector('[data-i18n-skip]').textContent==='분기점',locale+' junction label and equipment name');
        check($('cycle-warning').textContent===I.translate('순환 연결 포함')&&$('cycle-warning').previousElementSibling.textContent==='순환 연결 포함',locale+' cycle warning and name');
        check($('site-node').getAttribute('aria-label')==='대지 · '+I.translate('대지')+' / 설정',locale+' default site accessibility label preserves names');
        check(names.every(([e,name])=>e.textContent===name),locale+' names unchanged');
        check($('draft').value==='편집 중인 프로젝트 이름'&&$('draft').selectionStart===2&&$('draft').selectionEnd===5&&document.activeElement===$('draft'),locale+' draft/focus preserved');
        $('dynamic').innerHTML='<span>검색 결과가 없습니다.</span><input placeholder="설비 이름"><button title="설정">닫기</button>';
        await tick();check($('dynamic').querySelector('span').textContent===I.translate('검색 결과가 없습니다.'),locale+' newly opened popup');
        check($('dynamic').querySelector('input').placeholder===I.translate('설비 이름'),locale+' dynamic placeholder');
        $('dynamic').querySelector('span').textContent='프로젝트 파일이 손상되었습니다.';await tick();check($('dynamic').querySelector('span').textContent===I.translate('프로젝트 파일이 손상되었습니다.'),locale+' new error');
      }
      check(localStorage.getItem(I.storageKey)==='en','language persisted separately');
      check(I.setLanguage('unsupported')===false&&I.language==='en','invalid locale rejected');
      I.setValidity($('draft'),'프로젝트 파일이 손상되었습니다.');I.setLanguage('ja');
      check($('draft').validationMessage===I.translate('프로젝트 파일이 손상되었습니다.'),'validation language switches');
      $('draft').setCustomValidity('');I.setLanguage('en');
      check(!$('draft').validity.customError,'cleared validation stays cleared');
      $('dynamic').innerHTML='<span data-i18n-site-path>대지 > 설정</span><span data-i18n-skip>설정</span>';
      await tick();check($('dynamic').querySelector('[data-i18n-site-path]').textContent===I.translate('대지')+' > 설정','site prefix translated without renaming floor');
      check($('dynamic').querySelector('[data-i18n-skip]').textContent==='설정','name matching UI copy stays unchanged');
      for(const locale of ['ko','en','ja']){
        I.setLanguage(locale);$('file-form').reset();await tick();
        $('picked-file').checkValidity();check($('picked-file').validationMessage===I.translate('파일을 선택하세요.'),locale+' required file message');
        $('required-number').checkValidity();check($('required-number').validationMessage===I.translate('값을 입력하거나 선택하세요.'),locale+' required number message');
        $('required-number').value='11';$('required-number').dispatchEvent(new Event('input',{bubbles:true}));$('required-number').checkValidity();
        check($('required-number').validationMessage===I.translate('10 이하의 값을 입력하세요.'),locale+' numeric bound message');
        $('required-number').value='5';$('required-number').dispatchEvent(new Event('input',{bubbles:true}));check($('required-number').checkValidity(),locale+' validation clears after correction');
        const transfer=new DataTransfer();transfer.items.add(new File(['fixture'],'선택된 파일 없음.glb'));$('picked-file').files=transfer.files;$('picked-file').dispatchEvent(new Event('change',{bubbles:true}));await tick();
        check($('picked-name').textContent==='선택된 파일 없음.glb'&&$('picked-file').checkValidity(),locale+' selected filename preserved');
        I.setLanguage(locale==='ja'?'en':'ja');await tick();check($('picked-name').textContent==='선택된 파일 없음.glb','filename unchanged on language switch');
        $('file-form').reset();await tick();check($('picked-name').textContent===I.translate('선택된 파일 없음')&&!$('picked-file').validity.customError,'reset restores empty file label and clears error');
      }
      $('results').textContent=checks.join('\n')+'\nALL '+checks.length+' PASSED';
    }catch(error){$('results').textContent=checks.join('\n')+'\nFAIL '+error.stack;}finally{I.setLanguage(original);}
  };
})();
