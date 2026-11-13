const { spawn } = require('child_process');
const os = require('os');

// CLI adapter: runs a locally logged-in CLI (no API key). Uses spawn without a shell, so prompt text can't inject commands.
function cliAdapter(cfg) {
  return (prompt) => new Promise((resolve, reject) => {
    const args = [...(cfg.args || [])];
    const viaArg = cfg.promptVia === 'arg';
    if (viaArg) args.push(prompt);
    const p = spawn(cfg.command, args, { stdio: ['pipe', 'pipe', 'pipe'], cwd: os.tmpdir() });
    let out = '', err = '';
    const timer = setTimeout(() => { p.kill(); reject(new Error('timed out')); }, cfg.timeoutMs || 180000);
    p.stdout.on('data', d => (out += d));
    p.stderr.on('data', d => (err += d));
    p.stdin.on('error', () => {});
    p.on('error', e => { clearTimeout(timer); reject(new Error(`cannot run "${cfg.command}" (${e.code || e.message}). Is it installed and logged in?`)); });
    p.on('close', code => {
      clearTimeout(timer);
      if (code === 0 && out.trim()) resolve(out.trim());
      else reject(new Error((err.trim() || out.trim() || `exit code ${code}`).slice(0, 400)));
    });
    if (!viaArg) p.stdin.write(prompt);
    p.stdin.end();
  });
}

// Mock adapter for offline testing.
function mockAdapter(name, log = []) {
  let n = 0;
  return async (prompt) => {
    log.push({ name, prompt });
    n++;
    const seen = [...new Set([...prompt.matchAll(/^\[([^\]]+)\]:/gm)].map(m => m[1]))];
    return `${name} mock reply #${n}. I can see messages from: ${seen.join(', ') || 'nobody'}.`;
  };
}

module.exports = { cliAdapter, mockAdapter };
