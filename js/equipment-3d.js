(function (root) {
  'use strict';
  const T = root.THREE;
  function make(type,onReady,dimensions={width:1,depth:1}) {
    if(root.FEMSCatalog?.get(type)?.custom)return root.FEMSAssets.make(type,onReady);
    const group = new T.Group(), materials = new Map();
    function material(color, metal = 0.2) { const key = color + ':' + metal; if (!materials.has(key)) materials.set(key, new T.MeshStandardMaterial({color, roughness:0.65, metalness:metal})); return materials.get(key); }
    function box(x,y,z,w,h,d,color,parent=group) { const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),material(color));mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh; }
    function cylinder(x,y,z,r,h,color) { const mesh=new T.Mesh(new T.CylinderGeometry(r,r,h,10),material(color));mesh.position.set(x,y,z);mesh.castShadow=true;group.add(mesh);return mesh; }
    function beam(a,b,r,color) { const start=new T.Vector3(...a), end=new T.Vector3(...b), delta=end.clone().sub(start);const mesh=new T.Mesh(new T.CylinderGeometry(r,r,delta.length(),6),material(color));mesh.position.copy(start.add(end).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());mesh.castShadow=true;group.add(mesh);return mesh; }
    const steel='#82959b', pale='#d7dfdf', dark='#304448', green='#3c937b', base='#a4b4b6';
    const solarGrid=/^solar-([23])x([23])$/.exec(type);
    if(solarGrid){
      const columns=Number(solarGrid[1]),rows=Number(solarGrid[2]),panel=make('solar');
      for(let z=0;z<rows;z++)for(let x=0;x<columns;x++){
        const unit=x===0&&z===0?panel:panel.clone(true);
        unit.position.set(x-(columns-1)/2,0,z-(rows-1)/2);group.add(unit);
      }
    } else if(type==='tower') {
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
    } else if(type==='space-floor') {
      // Open floor: a thin slab and four low perimeter walls, without a ceiling.
      box(0,.04,0,1,.08,1,'#edf3f0');
      const tx=Math.min(.08,.12/dimensions.width),tz=Math.min(.08,.12/dimensions.depth);
      for(const side of [-1,1]){
        box(side*(.5-tx/2),.54,0,tx,.92,1,'#d6e2df');
        box(0,.54,side*(.5-tz/2),1,.92,tz,'#d6e2df');
      }
      const points=[],step=root.FEMSModel?.siteGridStep(dimensions)||Math.max(1,Math.ceil(Math.max(dimensions.width,dimensions.depth)/200));
      for(let x=-dimensions.width/2+step;x<dimensions.width/2;x+=step)points.push(x/dimensions.width,.081,-.5,x/dimensions.width,.081,.5);
      for(let z=-dimensions.depth/2+step;z<dimensions.depth/2;z+=step)points.push(-.5,.081,z/dimensions.depth,.5,.081,z/dimensions.depth);
      group.add(new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(points,3)),new T.LineBasicMaterial({color:'#c4d3d1'})));
    } else if(type==='ess') {
      const shell='#e8ebec',frame='#cdd4d7',seam='#bdc7cb',blue='#087eb4',orange='#f49a22';
      box(0,.5,0,.94,.9,.9,shell);
      // Container perimeter rails, corner posts and lifting blocks.
      for(const y of [.055,.945]){
        for(const z of [-.475,.475])box(0,y,z,1,.055,.05,frame);
        for(const x of [-.475,.475])box(x,y,0,.05,.055,1,frame);
      }
      for(const x of [-.475,.475])for(const z of [-.475,.475]){
        box(x,.5,z,.035,.89,.035,frame);
        for(const y of [.025,.975]){
          box(x,y,z,.05,.05,.05,'#dce1e3');
          box(x,y,z+Math.sign(z)*.026,.019,.018,.002,'#6b7d84');
        }
      }
      // Recessed seams on both long walls and roof ribs.
      for(let i=0;i<13;i++){
        const x=-.432+i*.072;
        for(const side of [-1,1])box(x,.5,side*.454,.006,.82,.008,seam);
        box(x,.954,0,.008,.008,.88,'#d6dddf');
      }
      // Geometry lettering stays crisp at any zoom and needs no external texture.
      for(const side of [-1,1]){
        const sign=new T.Group();sign.position.set(-.1,.56,side*.467);if(side<0)sign.rotation.y=Math.PI;group.add(sign);
        box(0,0,0,.39,.3,.008,shell,sign);
        for(let letter=0;letter<3;letter++){
          const x=-.13+letter*.13,color=letter?blue:orange;
          for(const y of [-.105,0,.105])box(x,y,.008,.095,.026,.008,color,sign);
          if(!letter)box(x-.035,0,.008,.025,.21,.008,color,sign);
          else {box(x-.035,.052,.008,.025,.105,.008,color,sign);box(x+.035,-.052,.008,.025,.105,.008,color,sign);}
        }
        for(const [x,color] of [[.36,orange],[.4,blue]])box(x,.5,side*.46,.032,.8,.012,color);
      }
      // Service doors at one end, cooling unit and fan grille at the other.
      for(const z of [-.215,.215]){
        box(-.477,.5,z,.016,.8,.408,'#dce2e4');
        box(-.49,.5,z,.012,.71,.014,'#9eacb2');
        box(-.499,.45,z+.045,.014,.025,.09,dark);
      }
      box(.477,.5,0,.02,.81,.85,'#d9e0e3');
      box(.5,.43,0,.08,.4,.7,'#d1d9dc');
      box(.544,.43,0,.012,.34,.64,'#edf0f0');
      const fan=cylinder(.554,.44,-.14,.137,.014,'#495c64');fan.rotation.z=Math.PI/2;
      const hub=cylinder(.565,.44,-.14,.031,.018,'#91a0a5');hub.rotation.z=Math.PI/2;
      for(let i=-4;i<=4;i++){
        const offset=i*.028,span=2*Math.sqrt(.13*.13-offset*offset);
        box(.567,.44+offset,-.14,.006,.008,span,'#a9b5ba');
      }
      box(.554,.49,.2,.013,.1,.16,dark);box(.563,.5,.2,.006,.045,.11,'#7abac6');
      for(let i=0;i<6;i++)box(.554,.335+i*.016,.2,.01,.006,.16,'#899aA2');
      box(.49,.18,0,.04,.035,.74,frame);
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
    if(group.userData.assetInstance){root.FEMSAssets.disposeInstance(group);return;}
    const geometries=new Set(),materials=new Set();
    group.traverse(object=>{if(object.geometry)geometries.add(object.geometry);if(object.material)(Array.isArray(object.material)?object.material:[object.material]).forEach(m=>materials.add(m));});
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
  }
  root.FEMSEquipment = { make, dispose };
})(window);
