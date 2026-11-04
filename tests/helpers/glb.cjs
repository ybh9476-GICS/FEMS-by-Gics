// A textured, offset box: verifies embedded images, normalization and physical scale.
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
function glb(edit=json=>json){
  const context={window:{},console};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../../vendor/three.js'),'utf8'),context);
  const T=context.window.THREE,g=new T.BoxGeometry(2,4,6);g.translate(5,8,-3);
  const chunks=[],views=[],accessors=[];
  function add(bytes){const offset=chunks.reduce((n,b)=>n+b.length,0),padded=Buffer.alloc(Math.ceil(bytes.length/4)*4);bytes.copy(padded);chunks.push(padded);views.push({buffer:0,byteOffset:offset,byteLength:bytes.length});return views.length-1;}
  function accessor(attr,type){const array=attr.array,bufferView=add(Buffer.from(array.buffer,array.byteOffset,array.byteLength));accessors.push({bufferView,componentType:array.BYTES_PER_ELEMENT===2?5123:5126,count:attr.count,type});return accessors.length-1;}
  const position=accessor(g.attributes.position,'VEC3');accessors[position].min=[4,6,-6];accessors[position].max=[6,10,0];
  const normal=accessor(g.attributes.normal,'VEC3'),uv=accessor(g.attributes.uv,'VEC2'),indices=accessor(g.index,'SCALAR');
  function crc(bytes){let c=0xffffffff;for(const byte of bytes){c^=byte;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
  function chunk(type,bytes){const name=Buffer.from(type),result=Buffer.alloc(bytes.length+12);result.writeUInt32BE(bytes.length);name.copy(result,4);bytes.copy(result,8);result.writeUInt32BE(crc(Buffer.concat([name,bytes])),bytes.length+8);return result;}
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(2,0);ihdr.writeUInt32BE(2,4);ihdr[8]=8;ihdr[9]=6;
  const pixels=Buffer.from([0,255,0,0,255,0,255,0,255,0,0,0,255,255,255,255,0,255]);
  const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',require('node:zlib').deflateSync(pixels)),chunk('IEND',Buffer.alloc(0))]);
  const imageView=add(png),bin=Buffer.concat(chunks);
  const json=edit({asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0}],meshes:[{primitives:[{attributes:{POSITION:position,NORMAL:normal,TEXCOORD_0:uv},indices,material:0}]}],materials:[{pbrMetallicRoughness:{baseColorTexture:{index:0},metallicFactor:0,roughnessFactor:1}}],textures:[{source:0}],images:[{bufferView:imageView,mimeType:'image/png'}],buffers:[{byteLength:bin.length}],bufferViews:views,accessors});
  const source=Buffer.from(JSON.stringify(json)),jsonBuffer=Buffer.alloc(Math.ceil(source.length/4)*4,32);source.copy(jsonBuffer);
  const result=Buffer.alloc(12+8+jsonBuffer.length+8+bin.length);result.writeUInt32LE(0x46546c67,0);result.writeUInt32LE(2,4);result.writeUInt32LE(result.length,8);result.writeUInt32LE(jsonBuffer.length,12);result.writeUInt32LE(0x4e4f534a,16);jsonBuffer.copy(result,20);const offset=20+jsonBuffer.length;result.writeUInt32LE(bin.length,offset);result.writeUInt32LE(0x004e4942,offset+4);bin.copy(result,offset+8);return result;
}
module.exports={glb};
