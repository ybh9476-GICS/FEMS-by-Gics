// Read-only, loopback-only server for the isolated language DOM regression fixture.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),files=new Set(['/tests/i18n-browser.html','/tests/i18n-browser.js','/js/locales.js','/js/i18n.js','/js/file-input.js']);
const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://127.0.0.1');if(req.method!=='GET'||!files.has(url.pathname)){res.writeHead(404);res.end('Not found');return;}res.setHeader('Content-Type',url.pathname.endsWith('.html')?'text/html; charset=utf-8':'text/javascript; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(fs.readFileSync(path.join(root,url.pathname)));});
server.listen(4182,'127.0.0.1',()=>console.log('Language fixture: http://127.0.0.1:4182/tests/i18n-browser.html'));
