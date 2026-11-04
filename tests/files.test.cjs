const test=require('node:test'),assert=require('node:assert/strict');
const M=require('../js/model.js'),F=require('../js/files.js');
test('저장은 매번 위치 선택을 요청하고 9종 도면을 온전히 출력한다',async()=>{
  const state=M.demo();state.name='FEMS/검증';let calls=0,closed=0;const saved=[];
  const picker=async options=>{calls++;assert.equal(options.suggestedName,'FEMS_검증.fems');return{createWritable:async()=>({write:async text=>saved.push(text),close:async()=>closed++})};};
  await F.save(state,picker);await F.save(state,picker);assert.equal(calls,2);assert.equal(closed,2);
  const restored=(await require('../js/project-file.js').decode(saved[0])).drawing;assert.equal(restored.project.kind,'file');delete restored.project;assert.deepEqual(restored,state);
});
test('저장 취소·미지원은 파일을 기록하지 않고 기존 도면을 유지한다',async()=>{
  const state=M.demo(),original=M.clone(state);await assert.rejects(()=>F.save(state,async()=>{const error=new Error('취소');error.name='AbortError';throw error;}),{name:'AbortError'});
  await assert.rejects(()=>F.save(state,undefined),/Edge/);assert.deepEqual(state,original);
});
test('기록 중 오류가 나면 쓰기를 중단하며 성공으로 보고하지 않는다',async()=>{
  let aborted=0,closed=0;await assert.rejects(()=>F.save(M.demo(),async()=>({createWritable:async()=>({write:async()=>{throw new Error('disk full');},close:async()=>closed++,abort:async()=>aborted++})})),/disk full/);
  assert.equal(aborted,1);assert.equal(closed,0);
});
