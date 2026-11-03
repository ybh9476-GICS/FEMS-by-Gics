const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../js/model.js');
const dims = item => [item.width, item.depth, item.height];

test('비율 고정은 기본이며 어느 크기를 편집해도 세 치수를 같은 비율로 변경한다', () => {
  const item = { width: 2.4, depth: 1.8, height: 3 };
  for (const field of ['width', 'depth', 'height']) {
    const enlarged = dims(M.resizeDimensions(item, field, item[field] * 1.5));
    [3.6, 2.7, 4.5].forEach((value, i) => assert.ok(Math.abs(enlarged[i] - value) < 1e-10));
    assert.deepEqual(dims(M.resizeDimensions(item, field, item[field] / 2)), [1.2, .9, 1.5]);
    assert.deepEqual(dims(item), [2.4, 1.8, 3]);
  }
});

test('비율 고정을 해제하면 한 치수만 변경하고 다시 켜면 현재 비율을 사용한다', () => {
  const item = { width: 2.4, depth: 1.8, height: 3 };
  Object.assign(item, M.resizeDimensions(item, 'width', 4, false));
  assert.deepEqual(dims(item), [4, 1.8, 3]);
  Object.assign(item, M.resizeDimensions(item, 'height', 6));
  assert.deepEqual(dims(item), [8, 3.6, 6]);
});

test('연속 비례 변경은 시작 치수를 기준으로 계산하고 전체 크기를 한 번에 취소·복원한다', () => {
  const h = new M.History(M.demo()), before = M.clone(h.current), base = before.equipment[2];
  for (const width of [2.41, 2.56, 2.93, 3.2]) {
    const next = M.clone(h.current);
    Object.assign(next.equipment[2], M.resizeDimensions(base, 'width', width));
    h.preview(next);
    assert.ok(Math.abs(next.equipment[2].depth / width - base.depth / base.width) < 1e-10);
  }
  const after = M.clone(h.current);
  h.finishEdit();assert.equal(h.past.length, 1);
  h.undo();assert.deepEqual(h.current, before);
  h.redo();assert.deepEqual(h.current, after);
  h.preview(before);h.finishEdit(false);assert.deepEqual(h.current, after);
  assert.deepEqual(dims(M.resizeDimensions(base, 'width', base.width)), dims(base));
});

test('연동 치수의 상한·하한·부지 경계를 넘으면 세 치수 모두 마지막 유효값을 유지한다', () => {
  for (const [item, field, value] of [
    [{ width: 2, depth: 2, height: 30, x: 0, z: 0 }, 'width', 3],
    [{ width: 4, depth: .2, height: 2, x: 0, z: 0 }, 'width', 2],
    [{ width: 2, depth: 2, height: 2, x: 28, z: 0 }, 'height', 6]
  ]) {
    const state = M.demo();Object.assign(state.equipment[2], item);
    const h = new M.History(state), before = M.clone(h.current), next = M.clone(before);
    Object.assign(next.equipment[2], M.resizeDimensions(item, field, value));
    assert.throws(() => h.preview(next));assert.deepEqual(h.current, before);
    assert.equal(h.editStart, null);
  }
});
