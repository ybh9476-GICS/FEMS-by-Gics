const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../js/model.js');

test('연속 실시간 변경은 즉시 현재 도면에 반영되고 실행 취소 한 번으로 복원된다', () => {
  const h = new M.History(M.demo()), before = M.clone(h.current);
  for (let i = 1; i <= 40; i++) {
    const next = M.clone(h.current);
    next.equipment[2].width = 2.4 + i / 100;
    h.preview(next);
    assert.equal(h.current.equipment[2].width, next.equipment[2].width);
    assert.deepEqual(M.validate(JSON.parse(JSON.stringify(h.current))), h.current);
  }
  const after = M.clone(h.current);
  h.finishEdit();
  assert.equal(h.past.length, 1);
  h.undo(); assert.deepEqual(h.current, before);
  h.redo(); assert.deepEqual(h.current, after);
});

test('취소·시작 값으로 복귀한 드래그는 실행 취소 및 다시 실행 기록을 소모하지 않는다', () => {
  const h = new M.History(M.demo()), before = M.clone(h.current);
  const next = M.clone(before); next.equipment[2].x = 1;
  h.commit(next); h.undo();
  h.preview(next); h.finishEdit(false);
  assert.deepEqual(h.current, before);
  assert.equal(h.past.length, 0); assert.equal(h.future.length, 1);
  h.preview(next); h.preview(before); h.finishEdit();
  assert.equal(h.past.length, 0); assert.equal(h.future.length, 1);
  h.redo(); assert.deepEqual(h.current, next);
});

test('연속 편집 중 잘못된 값은 마지막 유효한 값과 복원 시작점을 보존한다', () => {
  const h = new M.History(M.demo()), before = M.clone(h.current);
  const valid = M.clone(before); valid.equipment[2].x = 2;
  h.preview(valid);
  for (const value of [NaN, Infinity, 100]) {
    const bad = M.clone(valid); bad.equipment[2].x = value;
    assert.throws(() => h.preview(bad));
    assert.deepEqual(h.current, valid);
  }
  h.undo(); assert.deepEqual(h.current, before);
  h.redo(); assert.deepEqual(h.current, valid);
});

test('숫자 편집 후 다른 동작은 별도의 실행 취소 기록으로 남는다', () => {
  const h = new M.History(M.demo()), before = M.clone(h.current);
  const changed = M.clone(before); changed.equipment[2].height = 3;
  h.preview(changed); h.commit(M.empty());
  h.undo(); assert.deepEqual(h.current, changed);
  h.undo(); assert.deepEqual(h.current, before);
});
