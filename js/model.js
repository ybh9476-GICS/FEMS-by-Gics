(function (root) {
  'use strict';
  const C = typeof module !== 'undefined' && module.exports ? require('./catalog.js') : root.FEMSCatalog;
  const L = typeof module !== 'undefined' && module.exports ? require('./connections.js') : root.FEMSConnections;
  const STORAGE_KEY = 'gics-fems-workspace-v1';
  const FORMAT = 'gics-fems';
  const LIMIT = 300;
  const SITE_MIN = 0.1, SITE_MAX = 100000;
  function siteGridStep(site) { return Math.max(1, 10 ** Math.ceil(Math.log10(Math.max(site.width, site.depth) / 1000))); }
  const clone = value => JSON.parse(JSON.stringify(value));
  function text(value, label, max = 80) {
    if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(`${label}: 1~${max}자로 입력하세요.`);
    return value.trim();
  }
  function number(value, min, max, label) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error(`${label}: ${min}~${max} 범위의 숫자가 필요합니다.`);
    return value;
  }
  function equipmentCode(value) {
    if(value==null)return '';
    if(typeof value!=='string'||value.length>32)throw new Error('설비 코드: 32자 이하의 문자열이 필요합니다.');
    return value.trim();
  }
  function extents(item) {
    const a = item.rotation * Math.PI / 180;
    return { x: (Math.abs(Math.cos(a)) * item.width + Math.abs(Math.sin(a)) * item.depth) / 2,
      z: (Math.abs(Math.sin(a)) * item.width + Math.abs(Math.cos(a)) * item.depth) / 2 };
  }
  function clampPosition(item, x, z, site) {
    const e = extents(item);
    return { x: Math.round(Math.max(-site.width / 2 + e.x, Math.min(site.width / 2 - e.x, x)) * 1000) / 1000,
      z: Math.round(Math.max(-site.depth / 2 + e.z, Math.min(site.depth / 2 - e.z, z)) * 1000) / 1000 };
  }
  function resizeSite(state, width, depth) {
    const site = { width: number(width, SITE_MIN, SITE_MAX, '바닥 가로'), depth: number(depth, SITE_MIN, SITE_MAX, '바닥 세로') };
    for (const item of state.equipment) {
      const e = extents(item);
      if (Math.abs(item.x) + e.x > width / 2 + .002 || Math.abs(item.z) + e.z > depth / 2 + .002)
        throw new Error(`${item.name}이(가) 바닥 밖으로 벗어납니다. 크기를 늘려주세요.`);
    }
    if (L.routes(state).some(line => line.points.some(p => Math.abs(p.x) > width / 2 + .002 || Math.abs(p.z) > depth / 2 + .002)))
      throw new Error('연결선이 바닥 밖으로 벗어납니다. 크기를 늘려주세요.');
    const next = clone(state);
    next.site = site;
    return validate(next);
  }
  function validate(raw) {
    if (!raw || raw.format !== FORMAT || ![1,2].includes(raw.version)) throw new Error('FEMS v1/v2 도면(.fems)만 열 수 있습니다. WMS 도면은 호환되지 않습니다.');
    const result = { format: FORMAT, version: raw.version, name: text(raw.name, '도면 이름'), site: {
      width: number(raw.site?.width, SITE_MIN, SITE_MAX, '부지 가로'), depth: number(raw.site?.depth, SITE_MIN, SITE_MAX, '부지 세로') }, equipment: [] };
    if (!Array.isArray(raw.equipment) || raw.equipment.length > LIMIT) throw new Error(`설비는 최대 ${LIMIT}개까지 지원합니다.`);
    const ids = new Set(), codes = new Set();
    for (const item of raw.equipment) {
      if (!item || !C.get(item.type)) throw new Error('알 수 없는 설비 종류가 포함되어 있습니다.');
      const clean = { id: text(item.id, '설비 ID'), type: item.type, code: equipmentCode(item.code), name: text(item.name, '설비 이름'),
        x: number(item.x, -result.site.width / 2, result.site.width / 2, 'X 좌표'), z: number(item.z, -result.site.depth / 2, result.site.depth / 2, 'Z 좌표'),
        rotation: number(item.rotation, 0, 359.999, '회전'), width: number(item.width, 0.2, 30, '가로'),
        depth: number(item.depth, 0.2, 30, '세로'), height: number(item.height, 0.2, 40, '높이') };
      if (ids.has(clean.id) || (clean.code && codes.has(clean.code.toUpperCase()))) throw new Error('설비 ID와 지정된 코드는 중복될 수 없습니다.');
      if (item.parentId != null) clean.parentId = text(item.parentId, '상위 설비 ID');
      Object.assign(clean,L.clean(item,result.site));
      ids.add(clean.id); if(clean.code)codes.add(clean.code.toUpperCase());
      const e = extents(clean);
      if (Math.abs(clean.x) + e.x > result.site.width / 2 + 0.002 || Math.abs(clean.z) + e.z > result.site.depth / 2 + 0.002) throw new Error(`${clean.code || clean.name}: 설비가 부지 경계를 벗어납니다.`);
      result.equipment.push(clean);
    }
    const byId = new Map(result.equipment.map(item => [item.id, item]));
    for (const item of result.equipment) {
      const seen = new Set([item.id]);
      let parent = item.parentId;
      while (parent != null) {
        if (!byId.has(parent)) throw new Error(`${item.code || item.name}: 상위 설비를 찾을 수 없습니다.`);
        if (seen.has(parent)) throw new Error('자기 자신이나 하위 설비 안으로 이동할 수 없습니다.');
        seen.add(parent);parent = byId.get(parent).parentId;
      }
    }
    if(raw.version===2)result.networks=L.validateNetworks(raw,result);
    return result;
  }
  function reparent(state, id, parentId = null) {
    const next = clone(state), item = next.equipment.find(e => e.id === id);
    if (!item) throw new Error('이동할 설비를 찾을 수 없습니다.');
    if ((item.parentId || null) !== parentId) delete item.connection;
    if (parentId == null) delete item.parentId;
    else item.parentId = parentId;
    return validate(L.reconcileNetworks(next));
  }
  function removeEquipment(state, id) {
    const next = clone(state), item = next.equipment.find(e => e.id === id);
    if (!item) return next;
    for (const child of next.equipment) if (child.parentId === id) {
      delete child.connection;
      if (item.parentId) child.parentId = item.parentId;
      else delete child.parentId;
    }
    next.equipment = next.equipment.filter(e => e.id !== id);
    return validate(L.reconcileNetworks(next));
  }
  function moveEquipment(state, id, parentId = null, referenceId = null, position = 'inside') {
    if (!['inside', 'before', 'after'].includes(position)) throw new Error('올바르지 않은 이동 위치입니다.');
    const next = reparent(state, id, parentId);
    const item = next.equipment.find(e => e.id === id);
    if (position !== 'inside') {
      const reference = next.equipment.find(e => e.id === referenceId);
      if (!reference || (reference.parentId || null) !== (parentId || null)) throw new Error('같은 단계의 이동 기준 설비를 찾을 수 없습니다.');
      if (referenceId === id) return next;
    }
    next.equipment = next.equipment.filter(e => e.id !== id);
    const index = position === 'inside' ? next.equipment.length : next.equipment.findIndex(e => e.id === referenceId) + (position === 'after' ? 1 : 0);
    next.equipment.splice(index, 0, item);
    return next;
  }
  function moveEquipmentGroup(state, ids, parentId = null, referenceId = null, position = 'inside') {
    if(!['inside','before','after'].includes(position))throw new Error('올바르지 않은 이동 위치입니다.');
    const chosen=new Set(ids),byId=new Map(state.equipment.map(e=>[e.id,e]));
    if(!chosen.size||[...chosen].some(id=>!byId.has(id)))throw new Error('이동할 설비를 찾을 수 없습니다.');
    if(parentId!=null&&!byId.has(parentId))throw new Error('상위 설비를 찾을 수 없습니다.');
    for(let id=parentId;id;id=byId.get(id)?.parentId)if(chosen.has(id))throw new Error('자기 자신이나 하위 설비 안으로 이동할 수 없습니다.');
    const reference=byId.get(referenceId);
    if(position!=='inside'&&(!reference||(reference.parentId||null)!==parentId))throw new Error('같은 단계의 이동 기준 설비를 찾을 수 없습니다.');
    // Traverse in tree order, moving only the highest selected ancestor of each subtree.
    const children=new Map();for(const item of state.equipment){const key=item.parentId||null;if(!children.has(key))children.set(key,[]);children.get(key).push(item);}
    const roots=[];
    const visit=parent=>{for(const item of children.get(parent)||[]){if(chosen.has(item.id))roots.push(item.id);else visit(item.id);}};visit(null);
    if(position!=='inside'&&roots.includes(referenceId))return clone(state);
    const next=clone(state),rootIds=new Set(roots),moving=roots.map(id=>next.equipment.find(e=>e.id===id));
    for(const item of moving){
      if((item.parentId||null)!==parentId)delete item.connection;
      if(parentId==null)delete item.parentId;else item.parentId=parentId;
    }
    next.equipment=next.equipment.filter(e=>!rootIds.has(e.id));
    const index=position==='inside'?next.equipment.length:next.equipment.findIndex(e=>e.id===referenceId)+(position==='after'?1:0);
    next.equipment.splice(index,0,...moving);
    // Reconcile once after the complete move, so no intermediate hierarchy is saved.
    return validate(L.reconcileNetworks(next));
  }
  function empty() { return { format: FORMAT, version: 1, name: '새 FEMS 배치도', site: { width: 60, depth: 40 }, equipment: [] }; }
  function duplicateName(state, originalName) {
    const original=text(originalName,'설비 이름');
    const base=original.replace(/\(\d+\)$/,'').trim()||original;
    const names=new Set(state.equipment.map(item=>item.name.trim()));
    for(let index=1;;index++){
      const suffix=`(${index})`,candidate=base.slice(0,80-suffix.length).trimEnd()+suffix;
      if(!names.has(candidate))return candidate;
    }
  }
  function create(type, state, x = 0, z = 0) {
    const def = C.get(type);
    if (!def) throw new Error('지원하지 않는 설비입니다.');
    if (state.equipment.length >= LIMIT) throw new Error(`설비는 최대 ${LIMIT}개까지 배치할 수 있습니다.`);
    const names = new Set(state.equipment.map(item => item.name.trim()));
    let name = def.name, suffix = 1;
    while (names.has(name)) name = `${def.name}(${suffix++})`;
    const item = { id: 'eq-' + (root.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`),
      type, code: '', name,
      width: def.width, depth: def.depth, height: def.height, rotation: 0, x: 0, z: 0 };
    return Object.assign(item, clampPosition(item, x, z, state.site));
  }
  function demo() {
    const state = empty(); state.name = 'FEMS 설비 배치 예시';
    const positions = [[-15,-6],[-7,-6],[0,-6],[7,-6],[-7,5],[0,5],[7,5],[-15,6],[15,4]];
    C.builtin.forEach((def, i) => state.equipment.push(create(def.type, state, ...positions[i])));
    return validate(state);
  }
  function resizeDimensions(item, field, value, lockRatio = true) {
    const dimensions = ['width', 'depth', 'height'];
    if (!dimensions.includes(field)) throw new Error('설비 크기 항목이 아닙니다.');
    if (!Number.isFinite(value) || value <= 0) throw new Error('설비 크기는 0보다 큰 숫자를 입력하세요.');
    if (!lockRatio) return { [field]: value };
    const ratio = value / item[field];
    return Object.fromEntries(dimensions.map(key => [key, key === field ? value :
      ratio === 1 ? item[key] : Number((item[key] * ratio).toPrecision(12))]));
  }
  function groupBounds(state, ids, frame = null) {
    const items=state.equipment.filter(e=>ids.includes(e.id));
    if(!items.length)throw new Error('선택한 설비가 없습니다.');
    const angle=(frame?.rotation||0)*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
    const bounds=items.map(item=>{const e=extents({...item,rotation:item.rotation-(frame?.rotation||0)});
      const x=c*item.x-s*item.z,z=s*item.x+c*item.z;return {left:x-e.x,right:x+e.x,top:z-e.z,bottom:z+e.z};});
    const left=Math.min(...bounds.map(b=>b.left)),right=Math.max(...bounds.map(b=>b.right)),top=Math.min(...bounds.map(b=>b.top)),bottom=Math.max(...bounds.map(b=>b.bottom));
    const x=(left+right)/2,z=(top+bottom)/2;
    return {x:frame?.x??c*x+s*z,z:frame?.z??-s*x+c*z,rotation:frame?.rotation||0,width:right-left,depth:bottom-top,height:Math.max(...items.map(e=>e.height))};
  }
  function transformGroup(state, ids, frame, field, value) {
    if(!Number.isFinite(value))throw new Error('유효한 숫자를 입력하세요.');
    const bounds=groupBounds(state,ids,frame),next=clone(state),pivot={x:bounds.x,z:bounds.z,rotation:bounds.rotation};
    if(!['x','z','rotation','width','depth','height'].includes(field))throw new Error('지원하지 않는 그룹 속성입니다.');
    if(value===bounds[field])return {state:validate(next),frame:pivot};
    const dimensions=['width','depth','height'],scale=dimensions.includes(field)?value/bounds[field]:1;
    if(scale<=0)throw new Error('크기는 0보다 커야 합니다.');
    if(field==='rotation'&&(value<0||value>359.999))throw new Error('회전은 0~359.999°로 입력하세요.');
    const angle=(field==='rotation'?value-bounds.rotation:0)*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
    for(const item of next.equipment)if(ids.includes(item.id)){
      const x=item.x-bounds.x,z=item.z-bounds.z;
      item.x=bounds.x+(c*x+s*z)*scale+(field==='x'?value-bounds.x:0);
      item.z=bounds.z+(-s*x+c*z)*scale+(field==='z'?value-bounds.z:0);
      if(field==='rotation')item.rotation=((item.rotation+value-bounds.rotation)%360+360)%360;
      for(const key of dimensions)item[key]*=scale;
    }
    if(field==='x'||field==='z'||field==='rotation')pivot[field]=value;
    return {state:validate(next),frame:pivot};
  }
  function removeEquipmentGroup(state, ids) {
    const next=clone(state),removed=new Set(ids),byId=new Map(state.equipment.map(e=>[e.id,e]));
    next.equipment=next.equipment.filter(e=>!removed.has(e.id));
    for(const item of next.equipment){let parent=item.parentId;while(parent&&removed.has(parent))parent=byId.get(parent)?.parentId;
      if(parent!==item.parentId){delete item.connection;if(parent)item.parentId=parent;else delete item.parentId;}
    }
    return validate(L.reconcileNetworks(next));
  }
  function overlaps(state) {
    // Separating axis theorem: use rotated footprints, including edge-touch tolerance.
    function corners(item) {
      const a = -item.rotation * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
      return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,z]) => ({x:item.x+x*item.width/2*c-z*item.depth/2*s, z:item.z+x*item.width/2*s+z*item.depth/2*c}));
    }
    const collisions = new Set();
    for (let i=0; i<state.equipment.length; i++) for (let j=i+1; j<state.equipment.length; j++) {
      const a = corners(state.equipment[i]), b = corners(state.equipment[j]);
      const separated = [a,b].some(poly => [0,1].some(k => {
        const axis = {x:poly[k+1].z-poly[k].z, z:poly[k].x-poly[k+1].x};
        const pa=a.map(p=>p.x*axis.x+p.z*axis.z), pb=b.map(p=>p.x*axis.x+p.z*axis.z);
        return Math.max(...pa) <= Math.min(...pb)+0.001 || Math.max(...pb) <= Math.min(...pa)+0.001;
      }));
      if (!separated) { collisions.add(state.equipment[i].id); collisions.add(state.equipment[j].id); }
    }
    return collisions;
  }
  class History {
    constructor(state) { this.current = validate(state); this.past = []; this.future = []; this.editStart = null; }
    get editingChanged() { return this.editStart !== null && JSON.stringify(this.current) !== JSON.stringify(this.editStart); }
    preview(next) {
      const valid = validate(next);
      if (JSON.stringify(valid) === JSON.stringify(this.current)) return false;
      if (this.editStart === null) this.editStart = clone(this.current);
      this.current = valid;
      return true;
    }
    finishEdit(commit = true) {
      if (this.editStart === null) return false;
      const start = this.editStart, changed = this.editingChanged;
      this.editStart = null;
      if (!commit) this.current = start;
      else if (changed) {
        this.past.push(start);
        if (this.past.length > 60) this.past.shift();
        this.future = [];
      }
      return changed;
    }
    commit(next) { const valid = validate(next); this.finishEdit(); if (JSON.stringify(valid) === JSON.stringify(this.current)) return false;
      this.past.push(clone(this.current)); if (this.past.length > 60) this.past.shift(); this.current = valid; this.future = []; return true; }
    undo() { this.finishEdit(); if (!this.past.length) return false; this.future.push(this.current); this.current = this.past.pop(); return true; }
    redo() { this.finishEdit(); if (!this.future.length) return false; this.past.push(this.current); this.current = this.future.pop(); return true; }
  }
  const api = { STORAGE_KEY, FORMAT, LIMIT, SITE_MIN, SITE_MAX, siteGridStep, clone, validate, empty, create, duplicateName, demo, extents, clampPosition, resizeDimensions, resizeSite, groupBounds, transformGroup, removeEquipmentGroup, reparent, moveEquipment, moveEquipmentGroup, removeEquipment, overlaps, History };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FEMSModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
