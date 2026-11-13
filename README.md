# Round Table

One window where Claude, Gemini and Muse see each other's replies. No API keys, no dependencies (Node 18+).

## Run
```
cd round-table
npm test          # offline check that every agent sees the others' replies
npm run demo      # try the UI with fake agents
npm start         # real agents, then open http://127.0.0.1:3737
```

## How agents connect (config.json)
- **Claude**: `claude -p` (Claude Code headless, uses your existing login). Run `claude` once to log in.
- **Gemini**: `gemini -p` (Gemini CLI, sign in with your Google account). Run `gemini` once to log in.
- **Muse**: no CLI, so it uses paste mode. The UI shows the full prompt, you paste it into Muse, then paste Muse's reply back. It still sees everyone else, and they see it.
- To add another agent, add an entry to `config.json`. `"type": "cli"` runs any command that takes a prompt; `"type": "manual"` uses paste mode.

## Using it
- Round 1: everyone answers your question in parallel.
- Rounds 2-3: each agent in turn sees the whole transcript and responds to the others (capped at 5).
- `@Claude`, `@Gemini`, `@Muse` in a message sends it only to those agents.
- Stop cancels remaining turns. The transcript is saved to `transcript.json`.

## Notes
- The server listens on 127.0.0.1 only and rejects non-JSON POSTs, so other websites can't drive it.
- CLI flags can differ by version. If an agent errors, run its command by hand (e.g. `echo hi | claude -p`) and adjust `config.json`.
- Not built yet: browser automation for Muse (fragile, and may conflict with the site's terms) and a Telegram bridge.
