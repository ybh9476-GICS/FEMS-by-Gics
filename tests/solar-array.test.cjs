const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../js/catalog.js'),M=require('../js/model.js'),P=require('../js/project-file.js');
const context={console};context.window=context;vm.createContext(context);
for(const file of ['vendor/three.js','js/equipment-3d.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
const T=context.THREE;
for(const def of C.builtin.filter(d=>d.type.startsWith('solar-'))){
  test(`${def.name}: 기존 패널의 형상과 크기를 유지한 배열`,()=>{
    const [columns,rows]=def.type.slice(6).split('x').map(Number),model=context.FEMSEquipment.make(def.type),original=context.FEMSEquipment.make('solar');
    model.scale.set(def.width,def.height,def.depth);model.updateMatrixWorld(true);
    const units=model.children[0].children[0].children;assert.equal(units.length,columns*rows);
    let parts=0;original.traverse(p=>{if(p.isMesh)parts++;});
    for(const unit of units){let meshes=0;unit.traverse(p=>{if(p.isMesh)meshes++;});assert.equal(meshes,parts);
      const bounds=new T.Box3().setFromObject(unit),size=bounds.getSize(new T.Vector3());
      for(const [axis,expected] of [['x',5],['y',1.8],['z',3]])assert.ok(Math.abs(size[axis]-expected)<1e-6);
      assert.ok(Math.abs(bounds.min.y)<1e-6);
    }
    const bounds=new T.Box3().setFromObject(model);assert.ok(Math.abs(bounds.min.x+def.width/2)<1e-6);assert.ok(Math.abs(bounds.min.z+def.depth/2)<1e-6);
    context.FEMSEquipment.dispose(model);context.FEMSEquipment.dispose(original);
  });
  test(`${def.name}: 하나의 설비로 크기 조절·회전·복제·저장 복원`,async()=>{
    const state=P.attach(M.empty(),[]),item=M.create(def.type,state);state.equipment.push(item);
    Object.assign(item,M.resizeDimensions(item,'width',item.width*1.2,true));item.rotation=90;
    const copy=M.create(def.type,state,15,0);state.equipment.push(copy);assert.notEqual(item.name,copy.name);
    const history=new M.History(M.validate(state));history.commit(M.removeEquipment(history.current,item.id));history.undo();assert.equal(history.current.equipment.length,2);
    const saved=await P.encode(history.current),opened=await P.decode(saved.bytes);assert.deepEqual(opened.drawing.equipment,history.current.equipment);
  });
}
