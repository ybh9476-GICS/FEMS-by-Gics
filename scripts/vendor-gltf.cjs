// Reproduce the local GLTFLoader module tree, sharing the existing THREE instance.
const fs = require('node:fs/promises');
const path = require('node:path');
async function main() {
  const root = path.resolve(__dirname, '../vendor/gltf');
  const symbols = new Set();
  for (const file of ['loaders/GLTFLoader.js', 'utils/BufferGeometryUtils.js', 'utils/SkeletonUtils.js']) {
    const response = await fetch('https://raw.githubusercontent.com/mrdoob/three.js/r185/examples/jsm/' + file);
    if (!response.ok) throw new Error('Download failed: ' + response.status);
    let source = await response.text();
    source = source.replace(/import\s*\{([\s\S]*?)\}\s*from 'three';/g, (_, names) => {
      names.split(',').map(s => s.trim()).filter(Boolean).forEach(s => symbols.add(s));
      return `import {${names}} from '../three-bridge.js';`;
    });
    const target = path.join(root, file);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, source);
  }
  await fs.writeFile(path.join(root, 'three-bridge.js'), '// Uses the same Three.js instance as the FEMS editor.\n' + [...symbols].sort().map(s => `export const ${s} = window.THREE.${s};`).join('\n') + '\n');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
