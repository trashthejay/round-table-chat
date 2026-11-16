const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Room } = require('./room');
const { cliAdapter, mockAdapter } = require('./adapters');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
// Version info: single source of truth is package.json (version) and the latest CHANGELOG.md entry (date).
const VERSION = (() => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8')).version; } catch { return 'unknown'; } })();
const UPDATED = (() => {
  try {
    const m = fs.readFileSync(path.join(__dirname, 'CHANGELOG.md'), 'utf8').match(/^## \[[^\]]+\] - (\d{4}-\d{2}-\d{2})/m);
    return m ? m[1] : 'unknown';
  } catch { return 'unknown'; }
})();
const MOCK = process.argv.includes('--mock');
const clients = new Set();
const pendingManual = new Map(); // id -> resolve

function emit(evt) {
  const data = `data: ${JSON.stringify(evt)}\n\n`;
  for (const c of clients) c.write(data);
}

// Manual adapter: for agents with no CLI (e.g. Muse). The UI shows the prompt; you paste the reply back.
function manualAdapter(name) {
  return (prompt) => new Promise((resolve) => {
    const id = crypto.randomUUID();
    pendingManual.set(id, resolve);
    emit({ type: 'manual', id, name, prompt });
  });
}

const adapters = {};
for (const a of config.agents) {
  if (MOCK) adapters[a.name] = mockAdapter(a.name);
  else if (a.type === 'cli') adapters[a.name] = cliAdapter(a);
  else adapters[a.name] = manualAdapter(a.name);
}

const room = new Room({
  agents: config.agents,
  adapters,
  onEvent: emit,
  file: path.join(__dirname, 'transcript.json'),
});

function readBody(req) {
  return new Promise((resolve, reject) => {
    let s = '';
    req.on('data', d => { s += d; if (s.length > 1e6) { reject(new Error('too large')); req.destroy(); } });
    req.on('end', () => { try { resolve(s ? JSON.parse(s) : {}); } catch (e) { reject(e); } });
  });
}

const json = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(fs.readFileSync(path.join(__dirname, 'public', 'index.html')));
    }
    if (req.method === 'GET' && req.url === '/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      res.write(': connected\n\n');
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }
    if (req.method === 'GET' && req.url === '/api/state') {
      return json(res, 200, {
        agents: config.agents.map(a => ({ name: a.name, type: MOCK ? 'mock' : a.type })),
        messages: room.messages,
        busy: room.busy,
        mock: MOCK,
        version: VERSION,
        updated: UPDATED,
      });
    }
    if (req.method === 'POST') {
      // Require JSON content type: forces a CORS preflight, so other websites can't trigger this local server.
      if (!(req.headers['content-type'] || '').startsWith('application/json')) return json(res, 415, { error: 'json only' });
      const body = await readBody(req);
      if (req.url === '/api/ask') {
        let names = (body.agents || []).filter(n => adapters[n]);
        const text = String(body.text || '').trim();
        if (!text) return json(res, 400, { error: 'empty message' });
        // @mention routing: if the message names agents, only they respond.
        const mentioned = config.agents.map(a => a.name).filter(n => new RegExp(`@${n}\\b`, 'i').test(text));
        if (mentioned.length) names = mentioned;
        if (!names.length) return json(res, 400, { error: 'pick at least one agent' });
        if (room.busy) return json(res, 409, { error: 'room is busy' });
        room.ask(text, names, Number(body.rounds) || 1).catch(e => emit({ type: 'error', error: e.message }));
        return json(res, 202, { ok: true, agents: names });
      }
      if (req.url === '/api/stop') {
        room.stop();
        for (const [id, resolve] of pendingManual) { resolve(''); pendingManual.delete(id); }
        return json(res, 200, { ok: true });
      }
      if (req.url === '/api/manual') {
        const resolve = pendingManual.get(body.id);
        if (!resolve) return json(res, 404, { error: 'no such pending prompt' });
        pendingManual.delete(body.id);
        resolve(String(body.text || ''));
        return json(res, 200, { ok: true });
      }
      if (req.url === '/api/clear') {
        if (room.busy) return json(res, 409, { error: 'room is busy' });
        room.clear();
        return json(res, 200, { ok: true });
      }
    }
    json(res, 404, { error: 'not found' });
  } catch (e) {
    json(res, 500, { error: e.message });
  }
});

const port = Number(process.env.PORT) || config.port || 3737;
server.listen(port, '127.0.0.1', () => {
  console.log(`Round Table running at http://127.0.0.1:${port}${MOCK ? '  (MOCK mode: no real agents)' : ''}`);
});
