(function(root){
  'use strict';
  const supported=['ko','en','ja'],storageKey='fems-ui-language',entries=typeof module!=='undefined'&&module.exports?require('./locales.js'):root.FEMSLocaleEntries||[],dictionary=new Map(entries.map(row=>[row[0],row])),patterns=[];
  const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  for(const row of entries){if(!/\{\d+\}/.test(row[0]))continue;const keys=[];let last=0,source='^';for(const match of row[0].matchAll(/\{(\d+)\}/g)){source+=escape(row[0].slice(last,match.index))+'([\\s\\S]*?)';keys.push(match[1]);last=match.index+match[0].length;}source+=escape(row[0].slice(last))+'$';patterns.push({row,keys,re:new RegExp(source)});}
  // Prefer a known field prefix over a generic "{name}: ..." rule, which preserves names verbatim.
  patterns.sort((a,b)=>b.row[0].split('{')[0].length-a.row[0].split('{')[0].length||b.row[0].replace(/\{\d+\}/g,'').length-a.row[0].replace(/\{\d+\}/g,'').length);
  let language='ko';try{const saved=root.localStorage?.getItem(storageKey);if(supported.includes(saved))language=saved;}catch{}
  const errorPrefixes=[
    ['파일을 열지 못했습니다:','Unable to open file:','ファイルを開けません:'],
    ['파일을 저장하지 못했습니다:','Unable to save file:','ファイルを保存できません:'],
    ['저장 오류:','Save error:','保存エラー:'],
    ...entries.filter(row=>['기본 프로젝트를 저장하지 못했습니다.','등록하지 못했습니다.','공간 구조 변환을 완료하지 못해 원본을 유지합니다. 자동 저장을 중지했습니다.','공유 분기점 변환을 완료하지 못해 원본을 유지합니다.','전력 연결 구조 변환을 완료하지 못해 원본을 유지합니다. 자동 저장을 중지했습니다.'].includes(row[0]))
  ];
  function translate(source,locale=language,opaque=false){
    if(typeof source!=='string'||locale==='ko')return source;
    const text=source.trim(),index=locale==='ja'?2:1;let output=opaque?undefined:dictionary.get(text)?.[index];
    if(output==null)for(const prefix of errorPrefixes)if(text.startsWith(prefix[0])){output=prefix[index]+translate(text.slice(prefix[0].length),locale);break;}
    if(output==null)for(const pattern of patterns){const match=text.match(pattern.re);if(match){
      if(/^\{0\} (이름|층 모델|비율 고정|가로|세로|높이)$/.test(pattern.row[0])&&!/^(?:B?\d+F?|R)$/.test(match[1]))continue;
      const values={};pattern.keys.forEach((key,i)=>values[key]=match[i+1]);output=pattern.row[index].replace(/\{(\d+)\}/g,(_,key)=>values[key]);break;}}
    if(output==null&&text.includes('\n'))output=text.split('\n').map(line=>translate(line,locale)).join('\n');
    return output==null?source:source.slice(0,source.indexOf(text))+output+source.slice(source.indexOf(text)+text.length);
  }
  const api={translate,get language(){return language;},supported,storageKey};
  if(typeof module!=='undefined'&&module.exports){module.exports=api;return;}
  root.FEMSI18n=api;
  api.protect=(element,enabled=true)=>{if(element)enabled?element.setAttribute('data-i18n-skip',''):element.removeAttribute('data-i18n-skip');};
  const validity=new Map();
  api.setValidity=(input,message)=>{if(message)validity.set(input,message);else validity.delete(input);input.setCustomValidity(translate(message));};
  // Browser-owned validation bubbles otherwise follow the OS/browser language.
  const nativeValidity=new WeakSet();
  document.addEventListener('invalid',event=>{
    const input=event.target,v=input.validity;if(!v||v.customError)return;
    const message=v.valueMissing?(input.type==='file'?'파일을 선택하세요.':'값을 입력하거나 선택하세요.'):
      v.badInput?'올바른 숫자를 입력하세요.':v.rangeUnderflow?`${input.min} 이상의 값을 입력하세요.`:
      v.rangeOverflow?`${input.max} 이하의 값을 입력하세요.`:v.stepMismatch?'입력 간격에 맞는 값을 입력하세요.':
      v.patternMismatch||v.typeMismatch?'요청된 형식으로 입력하세요.':v.tooLong||v.tooShort?'입력값의 길이를 확인하세요.':'';
    if(message){api.setValidity(input,message);nativeValidity.add(input);}
  },true);
  const clearNative=event=>{if(nativeValidity.has(event.target)){api.setValidity(event.target,'');nativeValidity.delete(event.target);}};
  document.addEventListener('input',clearNative,true);document.addEventListener('change',clearNative,true);
  document.addEventListener('reset',event=>{for(const input of event.target.elements||[])clearNative({target:input});},true);
  const records=new WeakMap(),attributes=['title','aria-label','placeholder','alt'];
  // These are document data, not UI copy. Never translate names, paths, codes or editable values.
  const rawText='.brand,[data-i18n-skip],#project-name,.tree-name:not([data-i18n-ui]),.object-label,.power-node:not([data-i18n-ui]),.power-current-list li>span,.schematic-node-name,.schematic-node-space,.schematic-node title,#equipment-space-path:not([data-i18n-ui]),#asset-delete-name,#floor-delete-name,#connection-title,.space-breadcrumb button:not(.space-navigation):not([data-i18n-ui]),input,textarea,script,style,noscript';
  const rawAttrs='[role=treeitem],.tree-row,.power-node,.schematic-node,.power-current-list li>span,.space-breadcrumb button:not(.space-navigation):not([data-i18n-ui]),#connection-title';
  function write(node,key,source){
    let state=records.get(node);if(!state){state=new Map();records.set(node,state);}const old=state.get(key);
    if(old&&source===old.output)source=old.source;
    const path=key==='text'&&node.parentElement?.closest('[data-i18n-site-path]');
    let output=path&&source.startsWith('대지')?translate('대지')+source.slice(2):translate(source,language,node.matches?.('[data-i18n-opaque]')||false);
    if(key!=='text'&&node.matches('[data-i18n-site-label]'))output=output.replace('대지',translate('대지'));
    const siteSuffix=key!=='text'&&node.getAttribute('data-i18n-site-suffix');
    if(siteSuffix&&source.endsWith(siteSuffix))output=source.slice(0,-siteSuffix.length)+translate('대지')+siteSuffix.slice(2);
    state.set(key,{source,output});
    if(key==='text'){if(node.nodeValue!==output)node.nodeValue=output;}else if(node.getAttribute(key)!==output)node.setAttribute(key,output);
  }
  function visit(node){
    if(node.nodeType===3){if(node.parentElement&&(!node.parentElement.closest(rawText)||node.parentElement.closest('[data-i18n-site-path],[data-i18n-ui]')))write(node,'text',node.nodeValue);return;}
    if(node.nodeType!==1)return;
    if(!node.closest('.brand,[data-i18n-skip]')&&(!node.matches(rawAttrs)||node.matches('[data-i18n-site-label],[data-i18n-site-suffix]')))for(const key of attributes)if(node.hasAttribute(key)&&!(key==='title'&&node.matches('[data-i18n-opaque],[data-i18n-raw-title]')))write(node,key,node.getAttribute(key));
    if(node.matches('script,style,textarea,noscript'))return;
    for(const child of node.childNodes)visit(child);
  }
  const observer=new MutationObserver(changes=>{
    observer.disconnect();
    const nodes=new Set();for(const change of changes){if(change.type==='childList')for(const node of change.addedNodes)nodes.add(node);else nodes.add(change.target);}
    for(const node of nodes)if(node.isConnected)visit(node);observe();
  });
  function observe(){observer.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:attributes});}
  function refresh(){observer.disconnect();document.documentElement.lang=language;visit(document.body);for(const [input,message] of validity){if(input.isConnected&&input.validity.customError)input.setCustomValidity(translate(message));else validity.delete(input);}for(const button of document.querySelectorAll('[data-language]'))button.setAttribute('aria-pressed',String(button.dataset.language===language));observe();}
  api.setLanguage=locale=>{if(!supported.includes(locale))return false;language=locale;try{localStorage.setItem(storageKey,locale);}catch{}refresh();root.dispatchEvent(new CustomEvent('fems-language-change',{detail:{language}}));return true;};
  api.refresh=refresh;
  refresh();
})(typeof globalThis!=='undefined'?globalThis:this);
