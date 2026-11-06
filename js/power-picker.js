(function(root){
  'use strict';
  const M=root.FEMSModel,S=root.FEMSSpatial,L=root.FEMSConnections;
  class PowerPicker{
    static links(state,ids,direction='up'){
      const chosen=new Set(ids);return L.powerLinks(state).filter(link=>chosen.has(direction==='up'?link.to:link.from));
    }
    static nodes(state,ids,query='',direction='up'){
      const equipment=new Map(state.equipment.map(e=>[e.id,e])),links=L.powerLinks(state);
      const nodes=S.treeState(state).equipment.map(e=>{
        let reason='';
        if(ids.includes(e.id))reason='현재 설비';
        else if(equipment.has(e.id)&&ids.length){
          const proposed=ids.map(id=>direction==='up'?{from:e.id,to:id}:{from:id,to:e.id});
          if(proposed.every(p=>links.some(l=>l.from===p.from&&l.to===p.to)))reason='이미 연결됨';
          else try{L.validatePowerLinks([...links,...proposed.filter(p=>!links.some(l=>l.from===p.from&&l.to===p.to))],state.equipment);}catch{reason='순환 연결';}
        }
        return {...e,isEquipment:equipment.has(e.id),blocked:!!reason,reason};
      }),byId=new Map(nodes.map(n=>[n.id,n]));
      for(const node of nodes){const names=[];for(let n=node;n;n=byId.get(n.parentId))names.unshift(n.name);node.path=names.join(' > ');}
      const q=query.trim().toLocaleLowerCase();if(!q)return nodes;
      const visible=new Set();for(const n of nodes)if(n.isEquipment&&(n.name+' '+(n.code||'')+' '+n.path).toLocaleLowerCase().includes(q)){
        for(let item=n;item&&!visible.has(item.id);item=byId.get(item.parentId))visible.add(item.id);
      }
      return nodes.filter(n=>visible.has(n.id));
    }
    static current(state,ids,direction='up'){
      const paths=new Map(PowerPicker.nodes(state,[]).map(n=>[n.id,n.path]));
      const names=[...new Set(PowerPicker.links(state,ids,direction).map(l=>paths.get(direction==='up'?l.from:l.to)))];return names.join('\n')||'연결 없음';
    }
    static change(state,ids,target,direction='up',connect=true){
      if(!ids.length||ids.some(id=>!state.equipment.some(e=>e.id===id))||!state.equipment.some(e=>e.id===target))throw new Error('연결할 설비를 선택하세요.');
      let next=L.upgradePower(state);
      for(const id of ids){const from=direction==='up'?target:id,to=direction==='up'?id:target;next=L.changePowerLink(next,from,to,connect);}
      return M.validate(next);
    }
    constructor(host,api){
      this.api=api;this.draft=null;this.collapsed=new Set();this.lists={};this.buttons={};
      host.innerHTML='<legend>전력 연결</legend>';
      for(const [direction,label] of [['up','상위 연결'],['down','하위 연결']]){
        const section=document.createElement('div');section.className='power-section';
        section.innerHTML='<span class="power-caption">'+label+'</span><ul class="power-current-list"></ul><button type="button">'+label+' 추가</button>';
        const list=section.querySelector('ul'),button=section.querySelector('button');list.id='equipment-power-'+direction+'-list';button.id=direction==='up'?'equipment-power-select':'equipment-power-down-select';button.onclick=()=>this.open(direction);
        this.lists[direction]=list;this.buttons[direction]=button;host.append(section);
      }
      const dialog=this.dialog=document.createElement('dialog');dialog.id='power-picker';dialog.setAttribute('aria-labelledby','power-picker-title');
      dialog.innerHTML='<header><h2 id="power-picker-title">전력 연결 대상 선택</h2><button type="button" aria-label="연결 대상 선택 닫기">×</button></header><p class="power-source"></p><p class="power-help">계층구조·위치·기존 연결을 유지하고 연결을 추가합니다.</p><input type="search" aria-label="연결할 설비 검색" placeholder="설비 이름, 코드 또는 공간 검색"><div class="power-tree-scroll"><ul class="power-tree" aria-label="연결 대상 계층"></ul><p class="power-empty" hidden>검색 결과가 없습니다.</p></div><div class="power-choice" aria-live="polite"></div><p class="error-message" role="alert"></p><footer><button type="button" class="power-cancel">취소</button><button type="button" class="primary power-apply" disabled>연결 추가</button></footer>';
      document.body.append(dialog);this.search=dialog.querySelector('input');this.tree=dialog.querySelector('.power-tree');this.choice=dialog.querySelector('.power-choice');this.error=dialog.querySelector('[role=alert]');this.applyButton=dialog.querySelector('.power-apply');
      dialog.querySelector('header button').onclick=dialog.querySelector('.power-cancel').onclick=()=>this.close();
      dialog.addEventListener('cancel',e=>{e.preventDefault();this.close();});dialog.addEventListener('keydown',e=>e.stopPropagation());
      this.search.oninput=()=>this.renderTree();this.applyButton.onclick=()=>this.apply(this.draft?.target,this.draft?.ids,this.draft?.direction);
    }
    update(){
      const state=this.api.state(),ids=this.api.selectedIds(),paths=new Map(PowerPicker.nodes(state,[]).map(n=>[n.id,n.path]));
      for(const direction of ['up','down']){
        const list=this.lists[direction],links=PowerPicker.links(state,ids,direction);list.replaceChildren();this.buttons[direction].disabled=!ids.length;
        if(!links.length){const li=document.createElement('li');li.className='power-none';li.textContent='연결 없음';list.append(li);}
        for(const link of links){
          const li=document.createElement('li'),path=document.createElement('span'),remove=document.createElement('button');
          path.textContent=ids.length>1?paths.get(link.from)+' → '+paths.get(link.to):paths.get(direction==='up'?link.from:link.to);path.title=paths.get(link.from)+' → '+paths.get(link.to);
          remove.type='button';remove.textContent='해제';remove.setAttribute('aria-label',path.title+' 연결 해제');
          if(state.equipment.some(e=>e.id===link.to&&e.parentId===link.from)){remove.disabled=true;remove.textContent='계층 연결';remove.title='계층구조에서 상위 설비를 변경하면 기본 연결도 변경됩니다.';}
          remove.onclick=()=>this.apply(link.to,[link.from],'down',false);li.append(path,remove);list.append(li);
        }
      }
    }
    open(direction='up'){
      this.api.finish?.();const state=this.api.state(),ids=[...this.api.selectedIds()];if(!ids.length)return;
      this.draft={ids,target:null,direction};this.collapsed.clear();this.search.value='';this.error.textContent='';
      this.dialog.querySelector('h2').textContent=direction==='up'?'상위 연결 추가':'하위 연결 추가';
      const names=state.equipment.filter(e=>ids.includes(e.id)).map(e=>e.name).join(', ');this.dialog.querySelector('.power-source').textContent=direction==='up'?'선택한 대상 → '+names:names+' → 선택한 대상';
      this.renderTree();this.dialog.showModal();this.search.focus();
    }
    close(){this.dialog.close();this.draft=null;}
    apply(target,ids,direction='up',connect=true){
      if(!ids?.length||!target)return;
      try{
        this.api.finish?.();const next=PowerPicker.change(this.api.state(),ids,target,direction,connect);
        if(this.api.commit(next,connect?'전력 연결을 추가했습니다.':'전력 연결을 해제했습니다.')){if(this.dialog.open)this.close();this.update();}
        else if(this.dialog.open)this.error.textContent='연결 변경을 적용하지 못했습니다.';
      }catch(error){if(this.dialog.open)this.error.textContent=error.message;this.api.toast(error.message);}
    }
    renderTree(){
      if(!this.draft)return;const nodes=PowerPicker.nodes(this.api.state(),this.draft.ids,this.search.value,this.draft.direction),children=new Map();
      for(const n of nodes){const key=n.parentId||null;if(!children.has(key))children.set(key,[]);children.get(key).push(n);}this.tree.replaceChildren();
      const append=(parent,host)=>{for(const n of children.get(parent)||[]){
        const li=document.createElement('li'),row=document.createElement('div');row.className='power-tree-row';
        const nested=children.has(n.id),expanded=!!this.search.value||!this.collapsed.has(n.id),toggle=document.createElement('button');toggle.type='button';toggle.className='power-toggle';toggle.textContent=nested?(expanded?'▾':'▸'):'·';toggle.disabled=!nested||!!this.search.value;toggle.setAttribute('aria-label',n.name+(expanded?' 접기':' 펼치기'));
        if(nested)toggle.setAttribute('aria-expanded',String(expanded));toggle.onclick=()=>{expanded?this.collapsed.add(n.id):this.collapsed.delete(n.id);this.renderTree();};row.append(toggle);
        const name=document.createElement(n.isEquipment?'button':'span');name.textContent=n.name;name.title=n.path;name.className='power-node';
        if(n.isEquipment){name.type='button';name.disabled=n.blocked;name.setAttribute('aria-pressed',String(this.draft.target===n.id));name.onclick=()=>{this.draft.target=n.id;this.error.textContent='';this.renderTree();};}
        row.append(name);if(n.blocked){const reason=document.createElement('small');reason.textContent=n.reason;row.append(reason);}li.append(row);host.append(li);
        if(nested&&expanded){const group=document.createElement('ul');li.append(group);append(n.id,group);}
      }};append(null,this.tree);this.dialog.querySelector('.power-empty').hidden=nodes.length>0;
      const target=PowerPicker.nodes(this.api.state(),this.draft.ids,'',this.draft.direction).find(n=>n.id===this.draft.target);
      this.choice.textContent=target?(this.draft.direction==='up'?'상위 설비: ':'하위 설비: ')+target.path:'연결할 설비를 선택하세요.';this.applyButton.disabled=!target?.isEquipment||target.blocked;
    }
  }
  root.FEMSPowerPicker=PowerPicker;
})(window);
