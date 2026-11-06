const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const defaults = require('../js/defaults.js');
const assetStore = require('./asset-store.cjs');

const projectRoot = path.resolve(__dirname, '..');
const host = '127.0.0.1';
const port = 4175;
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.glb': 'model/gltf-binary'
};

function createServer(root = projectRoot) {
  const readyRoot = fs.realpath(root);
  let savingDefault = false;
  let savingAsset = false;
  return http.createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    const reply = (status, text) => {
      response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end(request.method === 'HEAD' ? undefined : text);
    };
    try {
      const authority = new URL('http://' + request.headers.host);
      if (!['127.0.0.1', 'localhost'].includes(authority.hostname)) return reply(403, 'Local requests only.');
      if(request.url==='/api/assets'&&request.method==='GET'){
        response.writeHead(200,{'Content-Type':'application/json'});return response.end('{"canRegister":true}');
      }
      if(request.url==='/api/assets'&&request.method==='POST'){
        if(authority.port!==String(request.socket.localPort)||request.headers.origin!==authority.origin||
          (request.headers['sec-fetch-site']&&request.headers['sec-fetch-site']!=='same-origin'))return reply(403,'Same-origin requests only.');
        if(request.headers['content-type']!=='application/json')return reply(415,'JSON required.');
        if(savingAsset)return reply(409,'다른 에셋을 저장 중입니다. 잠시 후 다시 시도하세요.');
        savingAsset=true;
        try{
          let size=0;const chunks=[];
          for await(const chunk of request){size+=chunk.length;if(size>36*1024*1024)return reply(413,'25 MB 이하의 GLB를 선택하세요.');chunks.push(chunk);}
          const entry=await assetStore.store(await readyRoot,JSON.parse(Buffer.concat(chunks).toString('utf8')));
          response.writeHead(201,{'Content-Type':'application/json; charset=utf-8'});return response.end(JSON.stringify(entry));
        }catch(error){return reply(error.code?500:400,error.code?'에셋을 저장하지 못했습니다. 폴더 권한을 확인하세요.':error.message);}
        finally{savingAsset=false;}
      }
      if (request.url === '/api/default-layout' && request.method === 'POST') {
        // Only this app's origin may write, and only to the one fixed drawing file.
        if (authority.port !== String(request.socket.localPort) || request.headers.origin !== authority.origin ||
            (request.headers['sec-fetch-site'] && request.headers['sec-fetch-site'] !== 'same-origin')) return reply(403, 'Same-origin requests only.');
        if (request.headers['content-type'] !== 'application/json') return reply(415, 'JSON required.');
        if (savingDefault) return reply(409, 'A save is already in progress.');
        savingDefault = true;
        let temporary;
        try {
          let size = 0; const chunks = [];
          for await (const chunk of request) {
            size += chunk.length;
            if (size > 2 * 1024 * 1024) { reply(413, 'Drawing must be 2 MB or smaller.'); return; }
            chunks.push(chunk);
          }
          let contents;
          try { const state=require('../js/model.js').validate(JSON.parse(Buffer.concat(chunks).toString('utf8')));await assetStore.verifyProject(await readyRoot,state);contents = defaults.serialize(state); }
          catch(error) { return reply(400, '저장 오류: '+(error.code==='ENOENT'?'추가 에셋 파일을 찾을 수 없습니다. 에셋을 다시 등록하세요.':error.code?'추가 에셋 파일을 읽을 수 없습니다. 파일 권한을 확인하세요.':error.message)); }
          const base = await readyRoot;
          const directory = path.join(base, 'js');
          const target = path.join(directory, 'default-layout.js');
          if (await fs.realpath(directory) !== directory || await fs.realpath(target) !== target) return reply(403, 'Linked paths cannot be overwritten.');
          temporary = path.join(directory, `.default-layout-${randomUUID()}.tmp`);
          await fs.writeFile(temporary, contents, { flag: 'wx' });
          await fs.rename(temporary, target);
          temporary = null;
          return reply(200, 'Saved js/default-layout.js');
        } catch(error) {
          console.error('Default project save failed:',error);
          const reason={ENOENT:'기본 프로젝트 파일 또는 저장 폴더가 없습니다.',EACCES:'기본 프로젝트 파일의 쓰기 권한이 없습니다.',EPERM:'기본 프로젝트 파일을 변경할 권한이 없거나 파일이 사용 중입니다.',ENOSPC:'저장 공간이 부족합니다.'}[error.code]||'파일 쓰기에 실패했습니다. 로컬 서버 로그를 확인하세요.';
          return reply(500, '저장 오류: '+reason);
        } finally {
          if (temporary) await fs.unlink(temporary).catch(() => {});
          savingDefault = false;
        }
      }
      if (!['GET', 'HEAD'].includes(request.method)) {
        response.setHeader('Allow', 'GET, HEAD');
        return reply(405, 'Method not allowed.');
      }
      let pathname;
      try { pathname = decodeURIComponent(request.url.split('?')[0]); }
      catch { return reply(400, 'Invalid URL.'); }
      if (pathname === '/') pathname = '/index.html';
      if (pathname === '/favicon.ico') { response.writeHead(204); return response.end(); }
      const parts = pathname.split('/');
      if (parts.some(part => part.startsWith('.') || /[\\:\0]/.test(part))) return reply(403, 'Forbidden path.');
      if (pathname !== '/index.html' && !/^\/(js|css|data|vendor)\/.+\.(js|css|json)$/.test(pathname) &&
        !/^\/assets\/help\/[a-z0-9-]+\.png$/.test(pathname) &&
        pathname!=='/assets/equipment/index.json'&&!/^\/assets\/equipment\/asset-[a-z0-9][a-z0-9-]{0,63}\/model\.glb$/.test(pathname)) return reply(404, 'Not found.');
      const base = await readyRoot;
      const file = await fs.realpath(path.resolve(base, '.' + pathname));
      const relative = path.relative(base, file);
      if (relative.startsWith('..') || path.isAbsolute(relative)) return reply(403, 'Forbidden path.');
      if (!(await fs.stat(file)).isFile()) return reply(404, 'Not found.');
      // Read the current file for each request: no build, copy, or server restart.
      const data = await fs.readFile(file);
      response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Content-Length': data.length });
      response.end(request.method === 'HEAD' ? undefined : data);
    } catch (error) {
      reply(['ENOENT', 'ENOTDIR'].includes(error.code) ? 404 : 500, 'Could not read the requested file.');
    }
  });
}

if (require.main === module) {
  const server = createServer();
  server.on('error', error => {
    console.error(error.code === 'EADDRINUSE'
      ? 'Port 4175 is already in use. Check the existing server; no process was stopped.'
      : error.message);
    process.exitCode = 1;
  });
  server.listen(port, host, () => {
    const url = `http://${host}:${port}/`;
    console.log(`FEMS by Gics: ${url}\nFolder: ${projectRoot}\nSave code, then refresh the browser. Press Ctrl+C to stop.`);
    if (process.argv.includes('--open')) {
      execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `Start-Process '${url}'`], { windowsHide: true }, error => {
        if (error) console.error(`Open ${url} in your browser. ${error.message}`);
      });
    }
  });
  process.on('SIGINT', () => server.close());
  process.on('SIGTERM', () => server.close());
}

module.exports = { createServer };
