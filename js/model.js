(function (root) {
  'use strict';
  const C = typeof module !== 'undefined' && module.exports ? require('./catalog.js') : root.FEMSCatalog;
  const L = typeof module !== 'undefined' && module.exports ? require('./connections.js') : root.FEMSConnections;
  const STORAGE_KEY = 'gics-fems-workspace-v1';
  const FORMAT = 'gics-fems';
  const LIMIT = 300;
  const clone = value => JSON.parse(JSON.stringify(value));
  function text(value, label, max = 80) {
    if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(`${label}: 1~${max}자로 입력하세요.`);
    return value.trim();
  }
  function number(value, min, max, label) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error(`${label}: ${min}~${max} 범위의 숫자가 필요합니다.`);
    return value;
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
  function validate(raw) {
    if (!raw || raw.format !== FORMAT || raw.version !== 1) throw new Error('FEMS v1 도면(.fems)만 열 수 있습니다. WMS 도면은 호환되지 않습니다.');
    const result = { format: FORMAT, version: 1, name: text(raw.name, '도면 이름'), site: {
      width: number(raw.site?.width, 20, 200, '부지 가로'), depth: number(raw.site?.depth, 20, 200, '부지 세로') }, equipment: [] };
    if (!Array.isArray(raw.equipment) || raw.equipment.length > LIMIT) throw new Error(`설비는 최대 ${LIMIT}개까지 지원합니다.`);
    const ids = new Set(), codes = new Set();
    for (const item of raw.equipment) {
      if (!item || !C.get(item.type)) throw new Error('알 수 없는 설비 종류가 포함되어 있습니다.');
      const clean = { id: text(item.id, '설비 ID'), type: item.type, code: text(item.code, '설비 코드', 32), name: text(item.name, '설비 이름'),
        x: number(item.x, -100, 100, 'X 좌표'), z: number(item.z, -100, 100, 'Z 좌표'),
        rotation: number(item.rotation, 0, 359.999, '회전'), width: number(item.width, 0.2, 30, '가로'),
        depth: number(item.depth, 0.2, 30, '세로'), height: number(item.height, 0.2, 40, '높이') };
      if (ids.has(clean.id) || codes.has(clean.code.toUpperCase())) throw new Error('설비 ID와 코드는 중복될 수 없습니다.');
      if (item.parentId != null) clean.parentId = text(item.parentId, '상위 설비 ID');
      Object.assign(clean,L.clean(item,result.site));
      ids.add(clean.id); codes.add(clean.code.toUpperCase());
      const e = extents(clean);
      if (Math.abs(clean.x) + e.x > result.site.width / 2 + 0.002 || Math.abs(clean.z) + e.z > result.site.depth / 2 + 0.002) throw new Error(`${clean.code}: 설비가 부지 경계를 벗어납니다.`);
      result.equipment.push(clean);
    }
    const byId = new Map(result.equipment.map(item => [item.id, item]));
    for (const item of result.equipment) {
      const seen = new Set([item.id]);
      let parent = item.parentId;
      while (parent != null) {
        if (!byId.has(parent)) throw new Error(`${item.code}: 상위 설비를 찾을 수 없습니다.`);
        if (seen.has(parent)) throw new Error('자기 자신이나 하위 설비 안으로 이동할 수 없습니다.');
        seen.add(parent);parent = byId.get(parent).parentId;
      }
    }
    return result;
  }
  function reparent(state, id, parentId = null) {
    const next = clone(state), item = next.equipment.find(e => e.id === id);
    if (!item) throw new Error('이동할 설비를 찾을 수 없습니다.');
    if ((item.parentId || null) !== parentId) delete item.connection;
    if (parentId == null) delete item.parentId;
    else item.parentId = parentId;
    return validate(next);
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
    return validate(next);
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
  function empty() { return { format: FORMAT, version: 1, name: '새 FEMS 배치도', site: { width: 60, depth: 40 }, equipment: [] }; }
  function create(type, state, x = 0, z = 0) {
    const def = C.get(type);
    if (!def) throw new Error('지원하지 않는 설비입니다.');
    if (state.equipment.length >= LIMIT) throw new Error(`설비는 최대 ${LIMIT}개까지 배치할 수 있습니다.`);
    let index = 1;
    const used = new Set(state.equipment.map(item => item.code.toUpperCase()));
    while (used.has(`${def.code}-${String(index).padStart(2, '0')}`)) index++;
    const item = { id: 'eq-' + (root.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`),
      type, code: `${def.code}-${String(index).padStart(2, '0')}`, name: def.name,
      width: def.width, depth: def.depth, height: def.height, rotation: 0, x: 0, z: 0 };
    return Object.assign(item, clampPosition(item, x, z, state.site));
  }
  function demo() {
    const state = empty(); state.name = 'FEMS 설비 배치 예시';
    const positions = [[-15,-6],[-7,-6],[0,-6],[7,-6],[-7,5],[0,5],[7,5],[-15,6],[15,4]];
    C.catalog.forEach((def, i) => state.equipment.push(create(def.type, state, ...positions[i])));
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
  const api = { STORAGE_KEY, FORMAT, LIMIT, clone, validate, empty, create, demo, extents, clampPosition, resizeDimensions, reparent, moveEquipment, removeEquipment, overlaps, History };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FEMSModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
