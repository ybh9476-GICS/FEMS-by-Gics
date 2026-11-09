const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),items=new Set();
function add(s){s=s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&quot;/g,'"').trim();if(/[가-힣]/.test(s))items.add(s);}
function html(s){for(const m of s.matchAll(/>([^<>]+)</g))add(m[1]);for(const m of s.matchAll(/(?:title|aria-label|placeholder|alt)="([^"]+)"/g))add(m[1]);}
html(fs.readFileSync(path.join(root,'index.html'),'utf8'));
for(const file of fs.readdirSync(path.join(root,'js')).filter(f=>f.endsWith('.js')&&!/^(default-layout|i18n|locales)/.test(f))){
 const source=fs.readFileSync(path.join(root,'js',file),'utf8');
 for(const m of source.matchAll(/'((?:\\.|[^'\\])*)'|"((?:\\.|[^"\\])*)"/g)){
  const s=(m[1]??m[2]).replace(/\\n/g,'\n').replace(/\\'/g,"'");if(s.includes('<')&&s.includes('>'))html(s);else add(s);
 }
}
const result=[...items].sort();
if(require.main===module){fs.mkdirSync(path.join(root,'output'),{recursive:true});fs.writeFileSync(path.join(root,'output/i18n-inventory.json'),JSON.stringify(result,null,2));console.log(result.length+' source phrases');}
module.exports=result;
