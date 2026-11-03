(function (root) {
  'use strict';
  const T = root.THREE;
  function make(type) {
    const group = new T.Group(), materials = new Map();
    function material(color, metal = 0.2) { const key = color + ':' + metal; if (!materials.has(key)) materials.set(key, new T.MeshStandardMaterial({color, roughness:0.65, metalness:metal})); return materials.get(key); }
    function box(x,y,z,w,h,d,color,parent=group) { const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),material(color));mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh; }
    function cylinder(x,y,z,r,h,color) { const mesh=new T.Mesh(new T.CylinderGeometry(r,r,h,10),material(color));mesh.position.set(x,y,z);mesh.castShadow=true;group.add(mesh);return mesh; }
    function beam(a,b,r,color) { const start=new T.Vector3(...a), end=new T.Vector3(...b), delta=end.clone().sub(start);const mesh=new T.Mesh(new T.CylinderGeometry(r,r,delta.length(),6),material(color));mesh.position.copy(start.add(end).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());mesh.castShadow=true;group.add(mesh);return mesh; }
    const steel='#82959b', pale='#d7dfdf', dark='#304448', green='#3c937b', base='#a4b4b6';
    if(type==='tower') {
      const tiers=[[0,.46],[.3,.30],[.6,.14],[.84,.075],[1,.02]];
      for(let side=0;side<4;side++) {
        const corners=[[-1,-1],[1,-1],[1,1],[-1,1]], c=corners[side], n=corners[(side+1)%4];
        box(c[0]*.43,.018,c[1]*.43,.13,.036,.13,base);
        for(let k=0;k<tiers.length-1;k++) {
          const [y,r]=tiers[k], [yy,rr]=tiers[k+1];
          beam([c[0]*r,y,c[1]*r],[c[0]*rr,yy,c[1]*rr],.012,steel);
          beam([c[0]*r,y,c[1]*r],[n[0]*rr,yy,n[1]*rr],.006,steel);
          beam([n[0]*r,y,n[1]*r],[c[0]*rr,yy,c[1]*rr],.006,steel);
          beam([c[0]*r,y,c[1]*r],[n[0]*r,y,n[1]*r],.009,steel);
        }
      }
      [.64,.8,.92].forEach((y,i)=>{
        const w=.49-i*.055;
        beam([-w,y,0],[w,y,0],.014,steel);
        beam([-w,y,0],[0,y+.065,0],.009,steel);beam([w,y,0],[0,y+.065,0],.009,steel);
        [-w,w].forEach(x=>{cylinder(x,y-.025,0,.017,.05,'#8d7864');for(let j=0;j<4;j++)cylinder(x,y-.005-j*.014,0,.028,.005,'#b5c7bf');});
      });
    } else if(type==='transformer') {
      box(0,.045,0,.96,.09,.96,base);box(0,.45,0,.66,.69,.68,'#91a7a6');
      [-1,1].forEach(side=>{for(let i=0;i<9;i++)box(side*.4,.4,-.32+i*.08,.12,.52,.025,'#718e91');});
      box(0,.82,0,.73,.06,.75,'#6f8989');
      [-.23,0,.23].forEach(x=>{cylinder(x,.9,0,.034,.16,'#b09064');for(let i=0;i<5;i++)cylinder(x,.85+i*.025,0,.052,.014,'#cfb68d');});
      box(0,.44,.347,.23,.15,.015,'#d2ac4d');box(0,.44,.359,.025,.09,.007,dark);
      box(.22,.3,.36,.1,.17,.06,dark);
    } else if(type==='solar') {
      box(0,.025,0,.98,.05,.98,'#b3c3c3');
      [-.36,.36].forEach(x=>{beam([x,.05,.35],[x,.39,.35],.014,steel);beam([x,.05,-.35],[x,.88,-.35],.014,steel);beam([x,.15,.35],[x,.7,-.35],.011,steel);});
      const panels=new T.Group();panels.position.y=.64;panels.rotation.x=.56;group.add(panels);
      box(0,0,0,1,.045,.81,'#b8cccf',panels);
      for(let x=0;x<6;x++)for(let z=0;z<4;z++){
        box(-.415+x*.166,.027,-.302+z*.201,.153,.012,.187,(x+z)%2?'#285b83':'#245479',panels);
        box(-.415+x*.166,.034,-.302+z*.201,.003,.002,.185,'#5887a4',panels);
      }
    } else if(type==='ess') {
      box(0,.035,0,1,.07,1,base);box(0,.5,0,.97,.88,.95,'#d9e3dd');box(0,.965,0,1,.07,1,'#f1f5ed');
      for(let i=0;i<4;i++){
        const x=-.36+i*.24;box(x,.51,.48,.224,.8,.015,'#cbd9d2');box(x+.075,.52,.496,.013,.10,.017,dark);
        for(let j=0;j<6;j++)box(x,.24+j*.025,.493,.14,.011,.012,'#97aea3');
        box(x,.81,.496,.12,.045,.012,green);
      }
      box(-.489,.53,0,.012,.55,.7,'#bccfc3');for(let j=0;j<9;j++)box(-.498,.32+j*.05,0,.012,.018,.57,'#839d91');
      box(0,.64,.497,.13,.14,.02,'#447e63');box(0,.64,.51,.025,.09,.009,'#e6f2dd');
    } else {
      const isUPS=type==='ups', isPanel=type==='panel';
      const body=isUPS?'#48566b':type==='mcc'?'#a5bbc7':type==='distribution'?'#c1d2d4':isPanel?'#d3ded9':'#abbcc9';
      box(0,.035,0,1,.07,1,base);box(0,.52,0,.96,.94,.94,body);
      const columns=isPanel||isUPS?1:3, rows=type==='mcc'?4:1;
      for(let c=0;c<columns;c++)for(let r=0;r<rows;r++){
        const w=.9/columns, h=.87/rows, x=-.45+w*(c+.5), y=.09+h*(r+.5);
        box(x,y,.476,w-.015,h-.015,.016,body);box(x+w*.32,y,.495,.015,h*.16,.02,dark);
        if(type==='mcc'){box(x-w*.12,y+h*.2,.495,w*.35,h*.23,.018,dark);box(x-w*.2,y-h*.17,.495,.025,.025,.015,green);box(x,y-h*.17,.495,.025,.025,.015,'#cc8976');}
        else {box(x,y+h*.23,.492,w*.52,h*.18,.025,dark);box(x,y+h*.23,.507,w*.35,h*.09,.008,isUPS?'#79b9b4':'#b5d6cd');
          for(let i=0;i<6;i++)box(x,y-h*.28+i*h*.025,.492,w*.6,.009,.012,isUPS?'#253745':'#7f979c');
          box(x-w*.15,y,.497,.025,.025,.015,green);box(x+w*.06,y,.497,.025,.025,.015,'#d69d62');}
      }
      box(0,.988,0,.99,.025,.98,pale);
      if(type==='receiving')for(let i=0;i<3;i++)box(-.3+i*.3,.44,.501,.09,.085,.01,'#d6b45c');
      if(isPanel)box(0,.4,.502,.08,.11,.015,'#d1ad55');
    }
    // Fit every detailed model to its declared physical envelope.
    const bounds=new T.Box3().setFromObject(group), size=bounds.getSize(new T.Vector3()), center=bounds.getCenter(new T.Vector3());
    const normalized=new T.Group();group.position.set(-center.x,-bounds.min.y,-center.z);normalized.add(group);normalized.scale.set(1/size.x,1/size.y,1/size.z);
    const outer=new T.Group();outer.add(normalized);return outer;
  }
  function dispose(group) {
    const geometries=new Set(),materials=new Set();
    group.traverse(object=>{if(object.geometry)geometries.add(object.geometry);if(object.material)(Array.isArray(object.material)?object.material:[object.material]).forEach(m=>materials.add(m));});
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
  }
  root.FEMSEquipment = { make, dispose };
})(window);
