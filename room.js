// Core logic: shared transcript + turn orchestration. No HTTP, no I/O except optional persistence.
const fs = require('fs');

const MAX_CONTEXT_CHARS = 24000;

class Room {
  // agents: [{name}], adapters: { [name]: async (prompt) => string }, onEvent(evt), file (optional)
  constructor({ agents, adapters, onEvent = () => {}, file = null }) {
    this.agents = agents;
    this.adapters = adapters;
    this.onEvent = onEvent;
    this.file = file;
    this.messages = [];
    this.stopped = false;
    this.busy = false;
    this.nextId = 1;
    if (file && fs.existsSync(file)) {
      try {
        this.messages = JSON.parse(fs.readFileSync(file, 'utf8'));
        this.nextId = this.messages.reduce((m, x) => Math.max(m, x.id), 0) + 1;
      } catch { /* start fresh on a corrupt file */ }
    }
  }

  add(author, role, text) {
    const msg = { id: this.nextId++, author, role, text, ts: Date.now() };
    this.messages.push(msg);
    if (this.file) fs.writeFileSync(this.file, JSON.stringify(this.messages, null, 2));
    this.onEvent({ type: 'message', message: msg });
    return msg;
  }

  buildPrompt(name) {
    const others = this.agents.map(a => a.name).filter(n => n !== name);
    let body = this.messages
      .filter(m => m.role !== 'system')
      .map(m => `[${m.author}]: ${m.text}`)
      .join('\n\n');
    if (body.length > MAX_CONTEXT_CHARS) body = '(earlier messages omitted)\n' + body.slice(-MAX_CONTEXT_CHARS);
    return [
      `You are ${name}, one participant in a shared room with the user and these other AI agents: ${others.join(', ') || '(none)'}.`,
      `Everyone sees the full transcript below. Reply ONLY as ${name}, without prefixing your name.`,
      `Build on, correct, or respectfully challenge what others said. Be concise and do not repeat points already made.`,
      '',
      '--- TRANSCRIPT ---',
      body,
      '--- END TRANSCRIPT ---',
      '',
      `Now write ${name}'s next message.`,
    ].join('\n');
  }

  // The prompt is built synchronously, so parallel turns all see the same snapshot.
  async turn(name) {
    const prompt = this.buildPrompt(name);
    this.onEvent({ type: 'typing', name, on: true });
    try {
      const text = await this.adapters[name](prompt, { name });
      if (text && text.trim() && !this.stopped) this.add(name, 'agent', text.trim());
    } catch (e) {
      this.add('system', 'system', `${name} failed: ${e.message}`);
    } finally {
      this.onEvent({ type: 'typing', name, on: false });
    }
  }

  // names: agents in the room; rounds: round 1 is parallel, later rounds are sequential and see everything.
  async ask(text, names, rounds = 1) {
    if (this.busy) throw new Error('Room is busy');
    this.busy = true;
    this.stopped = false;
    try {
      this.add('You', 'user', text);
      const maxRounds = Math.min(Math.max(rounds, 1), 5); // hard cap against runaway loops
      for (let r = 0; r < maxRounds && !this.stopped; r++) {
        if (r === 0) await Promise.all(names.map(n => this.turn(n)));
        else for (const n of names) { if (this.stopped) break; await this.turn(n); }
      }
    } finally {
      this.busy = false;
      this.onEvent({ type: 'idle' });
    }
  }

  stop() { this.stopped = true; }

  clear() {
    this.messages = [];
    if (this.file) fs.writeFileSync(this.file, '[]');
    this.onEvent({ type: 'cleared' });
  }
}

module.exports = { Room };
