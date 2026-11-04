(function (root) {
  'use strict';
  root.FEMSThumbnails = function () {
    const T = root.THREE, images = {};
    const renderer = new T.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(240, 184);renderer.setClearColor(0, 0);renderer.outputColorSpace = T.SRGBColorSpace;
    const scene = new T.Scene();
    scene.add(new T.HemisphereLight('#ffffff', '#758f88', 3));
    const light = new T.DirectionalLight('#fff4e4', 3);light.position.set(-3, 6, 5);scene.add(light);
    const camera = new T.OrthographicCamera(-2.15, 2.15, 1.65, -1.65, .1, 40);
    camera.position.set(6, 4, 6);camera.lookAt(0, 0, 0);
    try {
      for (const def of root.FEMSCatalog.builtin) {
        const model = root.FEMSEquipment.make(def.type);
        const scale = 2.6 / Math.max(def.width, def.height, def.depth);
        model.scale.set(def.width * scale, def.height * scale, def.depth * scale);
        model.position.y = -def.height * scale / 2;
        scene.add(model);renderer.render(scene, camera);
        images[def.type] = renderer.domElement.toDataURL('image/png');
        scene.remove(model);root.FEMSEquipment.dispose(model);
      }
    } finally { renderer.dispose();renderer.forceContextLoss(); }
    return images;
  };
})(window);
