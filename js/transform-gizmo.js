(function (root) {
  'use strict';
  const T = root.THREE, M = root.FEMSModel;
  class TransformGizmo {
    constructor(scene, labelHost, rotateButton = null, options = {}) {
      this.rotateButton = rotateButton;
      this.rotateArc = rotateButton?.parentElement?.querySelector('.gizmo-rotate-arc');
      if(this.rotateArc)this.rotateArc.addEventListener('click',()=>{if(!this.rotateButton.disabled)this.rotateButton.click();});
      this.group = new T.Group();
      this.group.visible = false;
      scene.add(this.group);
      this.axes = new Map();
      for (const [axis, color] of [['x', '#d94b4b'], ...(options.vertical?[['y','#249b62']]:[]), ['z', '#337fe5']]) {
        const direction = new T.Vector3(axis === 'x' ? 1 : 0, axis === 'y' ? 1 : 0, axis === 'z' ? 1 : 0);
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
        this.axes.set(axis, { direction, material, hit, label, color, arrow });
      }
      const planeGeometry = new T.PlaneGeometry(.3, .3);
      planeGeometry.rotateX(-Math.PI / 2);
      this.planeColor = '#45a879';
      this.planeHandle = new T.Mesh(planeGeometry, new T.MeshBasicMaterial({
        color: this.planeColor, transparent: true, opacity: .45, side: T.DoubleSide, depthTest: false, depthWrite: false
      }));
      // The .3-wide handle starts at the pivot, with its edges touching X and Z.
      this.planeHandle.position.set(.15, 0, .15);
      this.planeHandle.userData.axis = 'xz';this.planeHandle.renderOrder = 1001;
      this.planeBorder = new T.LineSegments(new T.EdgesGeometry(planeGeometry),
        new T.LineBasicMaterial({color: this.planeColor, depthTest: false, depthWrite: false}));
      this.planeBorder.renderOrder = 1002;
      this.planeHandle.add(this.planeBorder);this.group.add(this.planeHandle);
    }
    update(item, position, camera, height, visible) {
      this.group.visible = !!item && visible;
      if (!this.group.visible) {
        for (const axis of this.axes.values()) axis.label.hidden = true;
        if (this.rotateButton) this.rotateButton.hidden = true;
        if (this.rotateArc) this.rotateArc.style.display = 'none';
        return;
      }
      this.group.position.set(position.x, position.y||0, position.z);
      const depth = this.group.position.clone().sub(camera.position).dot(camera.getWorldDirection(new T.Vector3()));
      const worldHeight = camera.isOrthographicCamera ? (camera.top - camera.bottom) / camera.zoom :
        2 * Math.max(.1, depth) * Math.tan(camera.fov * Math.PI / 360);
      this.group.scale.setScalar(worldHeight / Math.max(1, height) * 90);
      this.group.updateMatrixWorld(true);
    }
    updateLabels(camera, width, height) {
      if (this.rotateButton) {
        const layout=this.rotationLayout(camera,width,height);
        this.rotateButton.hidden = !layout.visible;
        this.rotateButton.style.left = layout.center.x + 'px';
        this.rotateButton.style.top = layout.center.y + 'px';
        this.rotateButton.style.width = layout.buttonWidth + 'px';
        this.rotateButton.style.height = layout.buttonHeight + 'px';
        if(this.rotateArc){
          this.rotateArc.style.display=layout.visible?'':'none';
          this.rotateArc.setAttribute('viewBox',`0 0 ${width} ${height}`);
          this.rotateArc.classList.toggle('disabled',!!this.rotateButton.disabled);
          this.rotateArc.querySelector('.rotation-curve').setAttribute('d',layout.path);
          this.rotateArc.querySelector('.rotation-arrow').setAttribute('d',layout.arrow);
        }
      }
      for (const axis of this.axes.values()) {
        const p = axis.direction.clone().multiplyScalar(1.17).applyMatrix4(this.group.matrixWorld).project(camera);
        axis.label.hidden = !this.group.visible || !axis.arrow.visible || p.z < -1 || p.z > 1 || Math.abs(p.x) > 1 || Math.abs(p.y) > 1;
        axis.label.style.left = (p.x + 1) / 2 * width + 'px';
        axis.label.style.top = (1 - p.y) / 2 * height + 'px';
      }
    }
    rotationLayout(camera,width,height){
      const project=(x,z)=>{const p=new T.Vector3(x,0,z).applyMatrix4(this.group.matrixWorld).project(camera);return {x:(p.x+1)*width/2,y:(1-p.y)*height/2,depth:p.z};};
      const points=Array.from({length:25},(_,i)=>{const angle=(12+i*66/24)*Math.PI/180;return project(.82*Math.cos(angle),.82*Math.sin(angle));});
      const outline=[project(0,0),project(1,0),project(0,1),...points];
      const bounds={left:Math.min(...outline.map(p=>p.x)),right:Math.max(...outline.map(p=>p.x)),top:Math.min(...outline.map(p=>p.y)),bottom:Math.max(...outline.map(p=>p.y))};
      const buttonWidth=Math.min(32,bounds.right-bounds.left),buttonHeight=Math.min(20,bounds.bottom-bounds.top);
      const middle=points[12],center={x:Math.max(bounds.left+buttonWidth/2,Math.min(bounds.right-buttonWidth/2,middle.x)),y:Math.max(bounds.top+buttonHeight/2,Math.min(bounds.bottom-buttonHeight/2,middle.y))};
      const end=points.at(-1),previous=points.at(-2),length=Math.hypot(end.x-previous.x,end.y-previous.y)||1,dx=(end.x-previous.x)/length,dy=(end.y-previous.y)/length;
      // The short arc lives outside the XZ move square and inside the axis tips.
      const visible=this.group.visible&&buttonWidth>=24&&buttonHeight>=14&&outline.every(p=>p.depth>=-1&&p.depth<=1)&&center.x>=buttonWidth/2&&center.x<=width-buttonWidth/2&&center.y>=buttonHeight/2&&center.y<=height-buttonHeight/2;
      return {visible,center,bounds,buttonWidth,buttonHeight,path:points.map((p,i)=>`${i?'L':'M'}${p.x},${p.y}`).join(' '),arrow:`M${end.x-dx*5-dy*3},${end.y-dy*5+dx*3} L${end.x},${end.y} L${end.x-dx*5+dy*3},${end.y-dy*5-dx*3}`};
    }
    highlight(active) {
      for (const [name, axis] of this.axes) axis.material.color.set(name === active ? '#e6ad26' : axis.color);
      this.planeHandle.material.color.set(active === 'xz' ? '#e6ad26' : this.planeColor);
      this.planeBorder.material.color.copy(this.planeHandle.material.color);
      this.planeHandle.material.opacity = active === 'xz' ? .75 : .45;
    }
    pick(raycaster) {
      if (!this.group.visible) return null;
      if (raycaster.intersectObject(this.planeHandle, false).length) return 'xz';
      return raycaster.intersectObjects(Array.from(this.axes.values()).filter(axis=>axis.arrow.visible).map(axis=>axis.hit), false)[0]?.object.userData.axis || null;
    }
    begin(axis, ray, camera, item) {
      if (axis === 'xz') {
        const plane = new T.Plane().setFromNormalAndCoplanarPoint(new T.Vector3(0, 1, 0), this.group.position);
        const start = ray.intersectPlane(plane, new T.Vector3());
        return start ? { axis, plane, start, item: M.clone(item) } : null;
      }
      const direction = this.axes.get(axis).direction;
      const normal = camera.position.clone().sub(this.group.position);
      normal.addScaledVector(direction, -normal.dot(direction));
      if (normal.lengthSq() < 1e-8) return null;
      const plane = new T.Plane().setFromNormalAndCoplanarPoint(normal.normalize(), this.group.position);
      const start = ray.intersectPlane(plane, new T.Vector3());
      return start ? { axis, plane, start, item: M.clone(item) } : null;
    }
    positionForPoint(drag, ray) {
      const point=ray.intersectPlane(drag.plane,new T.Vector3());if(!point)return null;
      const result={...drag.item};
      for(const axis of drag.axis==='xz'?['x','z']:[drag.axis])result[axis]=Math.round((drag.item[axis]+point[axis]-drag.start[axis])*100)/100;
      return {x:result.x,y:result.y,z:result.z};
    }
    positionFor(drag, ray, site) {
      const point = ray.intersectPlane(drag.plane, new T.Vector3());
      if (!point) return null;
      const axis = drag.axis, item = drag.item;
      if(item.moveLimits){
        const result={x:item.x,z:item.z};
        for(const key of axis==='xz'?['x','z']:[axis]){
          const limit=item.moveLimits[key],value=item[key]+Math.round((point[key]-drag.start[key])*100)/100;
          result[key]=limit.min>limit.max?item[key]:Math.max(limit.min,Math.min(limit.max,value));
        }
        return result;
      }
      if (axis === 'xz') return M.clampPosition(item,
        Math.round((item.x + point.x - drag.start.x) * 100) / 100,
        Math.round((item.z + point.z - drag.start.z) * 100) / 100, site);
      const value = Math.round((item[axis] + point[axis] - drag.start[axis]) * 100) / 100;
      const clamped = M.clampPosition(item, axis === 'x' ? value : item.x, axis === 'z' ? value : item.z, site);
      // Preserve the untouched coordinate exactly, including imported precision.
      return axis === 'x' ? { x: clamped.x, z: item.z } : { x: item.x, z: clamped.z };
    }
  }
  root.FEMSTransformGizmo = TransformGizmo;
})(window);
