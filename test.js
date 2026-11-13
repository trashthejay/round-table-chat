const assert = require('assert');
const { Room } = require('./room');
const { mockAdapter } = require('./adapters');

(async () => {
  const log = [];
  const names = ['Claude', 'Gemini', 'Muse'];
  const room = new Room({
    agents: names.map(name => ({ name })),
    adapters: Object.fromEntries(names.map(n => [n, mockAdapter(n, log)])),
  });

  await room.ask('Research topic X', names, 2);

  // Round 1 is parallel: nobody has seen another agent yet.
  const r1 = log.filter(l => l.name === 'Gemini')[0].prompt;
  assert(r1.includes('[You]: Research topic X'));
  assert(!r1.includes('[Claude]:'), 'parallel round must not leak replies');

  // Round 2 is sequential: Gemini must see Claude's AND Muse's round-1 replies.
  const r2 = log.filter(l => l.name === 'Gemini')[1].prompt;
  assert(r2.includes('[Claude]: Claude mock reply #1'), 'Gemini should see Claude');
  assert(r2.includes('[Muse]: Muse mock reply #1'), 'Gemini should see Muse');

  // Muse in round 2 sees Gemini's round-2 reply (sequential order Claude -> Gemini -> Muse).
  const m2 = log.filter(l => l.name === 'Muse')[1].prompt;
  assert(m2.includes('[Gemini]: Gemini mock reply #2'));

  // Failures are shown, not thrown.
  const bad = new Room({ agents: [{ name: 'A' }], adapters: { A: async () => { throw new Error('boom'); } } });
  await bad.ask('hi', ['A']);
  assert(bad.messages.some(m => m.role === 'system' && m.text.includes('boom')));

  // Round cap.
  const cap = []; const c = new Room({ agents: [{ name: 'A' }], adapters: { A: mockAdapter('A', cap) } });
  await c.ask('x', ['A'], 99);
  assert.strictEqual(cap.length, 5);

  console.log('All tests passed.');
})().catch(e => { console.error(e); process.exit(1); });
