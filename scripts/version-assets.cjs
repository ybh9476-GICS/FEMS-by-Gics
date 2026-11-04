const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const resourcePattern=/((?:src|href)=")((?:js|css|vendor)\/[^"?]+\.(?:js|css))(?:\?v=[a-f0-9]+)?(")/g;
function stamp(html,version){return html.replace(resourcePattern,(_,prefix,file,quote)=>`${prefix}${file}?v=${version}${quote}`);}
function version(){
  const hash=crypto.createHash('sha256');
  hash.update(stamp(fs.readFileSync(path.join(root,'index.html'),'utf8'),'').replace(/\r\n/g,'\n'));
  function scan(directory){
    for(const entry of fs.readdirSync(path.join(root,directory),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en'))){
      const file=directory+'/'+entry.name;
      if(entry.isDirectory())scan(file);
      else if(/\.(js|css)$/.test(file))hash.update(file+'\0').update(fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n'));
    }
  }
  for(const directory of ['js','css','vendor'])scan(directory);
  return hash.digest('hex').slice(0,16);
}
function expected(){return stamp(fs.readFileSync(path.join(root,'index.html'),'utf8'),version());}
if(require.main===module){
  fs.writeFileSync(path.join(root,'index.html'),expected());
  console.log('화면 파일 버전을 갱신했습니다: '+version());
}
module.exports={stamp,version,expected};
