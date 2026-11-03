(function (root) {
  'use strict';
  const T = root.THREE, M = root.FEMSModel;
  class TransformGizmo {
    constructor(scene, labelHost, rotateButton = null) {
      this.rotateButton = rotateButton;
      this.group = new T.Group();
      this.group.visible = false;
      scene.add(this.group);
      this.axes = new Map();
      for (const [axis, color] of [['x', '#d94b4b'], ['z', '#337fe5']]) {
        const direction = new T.Vector3(axis === 'x' ? 1 : 0, 0, axis === 'z' ? 1 : 0);
        const arrow = new T.Group();
        arrow.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), direction);
        const material = new T.MeshBasicMaterial({ color, depthTest: false, depthWrite: false });
        const shaft = new T.Mesh(new T.CylinderGeometry(.022, .022, .76, 12), material);
        shaft.position.y = .38;
        const head = new T.Mesh(new T.ConeGeometry(.085, .24, 16), material);
        head.position.y = .88;
        const hit = new T.Mesh(new T.CylinderGeometry(.1, .1, 1, 12),
          new T.MeshBasicMaterial({ visible: false }));
        hit.position.y = .5;hit.userData.axis = axis;
        shaft.renderOrder = head.renderOrder = 1000;
        arrow.add(shaft, head, hit);this.group.add(arrow);
        const label = labelHost.ownerDocument.createElement('span');
        label.className = 'gizmo-axis-label';label.dataset.axis = axis;
        label.textContent = axis.toUpperCase();label.style.color = color;label.hidden = true;
        labelHost.appendChild(label);
        this.axes.set(axis, { direction, material, hit, label, color });
      }
    }
    update(item, position, camera, height, visible) {
      this.group.visible = !!item && visible;
      if (!this.group.visible) {
        for (const axis of this.axes.values()) axis.label.hidden = true;
        if (this.rotateButton) this.rotateButton.hidden = true;
        return;
      }
      this.group.position.set(position.x, 0, position.z);
      const depth = this.group.position.clone().sub(camera.position).dot(camera.getWorldDirection(new T.Vector3()));
      const worldHeight = camera.isOrthographicCamera ? (camera.top - camera.bottom) / camera.zoom :
        2 * Math.max(.1, depth) * Math.tan(camera.fov * Math.PI / 360);
      this.group.scale.setScalar(worldHeight / Math.max(1, height) * 90);
      this.group.updateMatrixWorld(true);
    }
    updateLabels(camera, width, height) {
      if (this.rotateButton) {
        const p = this.group.position.clone().project(camera);
        this.rotateButton.hidden = !this.group.visible || p.z < -1 || p.z > 1 || Math.abs(p.x) > 1 || Math.abs(p.y) > 1;
        this.rotateButton.style.left = Math.max(8, Math.min(width - 80, (p.x + 1) / 2 * width - 80)) + 'px';
        this.rotateButton.style.top = Math.max(8, Math.min(height - 40, (1 - p.y) / 2 * height - 50)) + 'px';
      }
      for (const axis of this.axes.values()) {
        const p = axis.direction.clone().multiplyScalar(1.17).applyMatrix4(this.group.matrixWorld).project(camera);
        axis.label.hidden = !this.group.visible || p.z < -1 || p.z > 1 || Math.abs(p.x) > 1 || Math.abs(p.y) > 1;
        axis.label.style.left = (p.x + 1) / 2 * width + 'px';
        axis.label.style.top = (1 - p.y) / 2 * height + 'px';
      }
    }
    highlight(active) {
      for (const [name, axis] of this.axes) axis.material.color.set(name === active ? '#e6ad26' : axis.color);
    }
    pick(raycaster) {
      if (!this.group.visible) return null;
      return raycaster.intersectObjects(Array.from(this.axes.values(), axis => axis.hit), false)[0]?.object.userData.axis || null;
    }
    begin(axis, ray, camera, item) {
      const direction = this.axes.get(axis).direction;
      const normal = camera.position.clone().sub(this.group.position);
      normal.addScaledVector(direction, -normal.dot(direction));
      if (normal.lengthSq() < 1e-8) return null;
      const plane = new T.Plane().setFromNormalAndCoplanarPoint(normal.normalize(), this.group.position);
      const start = ray.intersectPlane(plane, new T.Vector3());
      return start ? { axis, plane, start, item: M.clone(item) } : null;
    }
    positionFor(drag, ray, site) {
      const point = ray.intersectPlane(drag.plane, new T.Vector3());
      if (!point) return null;
      const axis = drag.axis, item = drag.item;
      const value = Math.round((item[axis] + point[axis] - drag.start[axis]) * 100) / 100;
      const clamped = M.clampPosition(item, axis === 'x' ? value : item.x, axis === 'z' ? value : item.z, site);
      // Preserve the untouched coordinate exactly, including imported precision.
      return axis === 'x' ? { x: clamped.x, z: item.z } : { x: item.x, z: clamped.z };
    }
  }
  root.FEMSTransformGizmo = TransformGizmo;
})(window);
