# 포함 라이브러리

Three.js 0.185.1을 WMS-by-Gics의 독립 브라우저용 빌드에서 복사했습니다.
그래픽 엔진은 수정하지 않았으며 `three.LICENSE`의 MIT 라이선스를 유지합니다.
출처: https://www.npmjs.com/package/three/v/0.185.1
실행 중 외부 다운로드는 발생하지 않습니다.

`gltf/`에는 Three.js r185의 공식 GLTFLoader, BufferGeometryUtils,
SkeletonUtils가 포함됩니다. `three` import만 기존 전역 THREE를 참조하는
`three-bridge.js`로 연결했습니다. 동일한 MIT 라이선스가 적용됩니다.
재생성: `node scripts/vendor-gltf.cjs` (다운로드 시에만 네트워크 필요).
출처: https://github.com/mrdoob/three.js/tree/r185/examples/jsm
