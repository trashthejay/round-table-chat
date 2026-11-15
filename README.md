# Round Table

One window where Claude, ChatGPT (via Codex) and other AI models see each other's replies. Free to run: no API keys, no dependencies (Node 18+).

## Run
```
cd round-table
npm test          # offline check that every agent sees the others' replies
npm run demo      # try the UI with fake agents
npm start         # real agents, then open http://127.0.0.1:3737
```

## Launch like a Mac app
- Run `bash scripts/make-mac-app.sh`. It builds `~/Applications/Round Table Chat.app`.
- Double-click the app. It shows in the Dock, starts the server and opens http://127.0.0.1:3737. Clicking the Dock icon again reopens the page.
- Cmd+Q stops the server. If a server was already running on port 3737, the app just opens the page and leaves that server alone.
- Server output goes to `~/Library/Logs/RoundTableChat.log`.
- The first time, macOS may ask permission to access the Desktop folder (the project lives under `~/Desktop`). Click Allow.
- If you move the project folder or node, run the script again.
- The app icon comes from `assets/icon-1024.png` and is applied when you run the script.

## Before you send your first message
Agents start **all ticked**. Un-tick any you aren't using, or the room will wait on them:
- Un-tick **Gemini** unless you have a working Gemini login (see the warning below).
- Un-tick **Muse (paste)** unless you plan to paste a reply by hand (see the warning below).

## How agents connect (config.json)
- **Claude**: `claude -p` (Claude Code headless, uses your existing login). Run `claude` once to log in.
- **Codex (ChatGPT)**: `codex exec` (OpenAI Codex CLI, sign in with your ChatGPT account). Install with `npm i -g @openai/codex`, then run `codex` once to log in. It runs with `-s read-only`, so it can't change files or run write commands from the chat room. Tested with a free ChatGPT account; your plan's usage limits still apply.
- **Gemini**: `gemini -p` (Gemini CLI). See the warning below. It is not working with free personal Google accounts right now.
- **Muse**: no CLI, so it uses paste mode. See the warning below.
- To add another agent, add an entry to `config.json`. `"type": "cli"` runs any command that takes a prompt; `"type": "manual"` uses paste mode.

## Warnings

### Gemini is currently blocked for free personal Google accounts
Signing in with a free personal Google account fails with `IneligibleTierError: This client is no longer supported for Gemini Code Assist for individuals` (seen with Gemini CLI 0.68.0). Google asks users to move to its Antigravity products. This is on Google's side, and nothing in Round Table can fix it.
- If you leave Gemini ticked, the room shows a red "Gemini failed" message and carries on with the other agents.
- It may work with a paid or Workspace tier. Run `gemini`, then `/auth`, and try that account.
- If you get it working: Round Table runs the CLI from your system temp folder, which Gemini treats as untrusted in headless mode. Add `"--skip-trust"` before `"-p"` in Gemini's `args` in `config.json`. Note this makes Gemini trust whatever is in the temp folder.

### Muse makes the room wait for you
Muse has no CLI, so the room cannot get its reply by itself. When Muse is ticked, a yellow box appears **below the transcript, above the question box**, with a prompt for you to copy into another chat (ChatGPT, Perplexity, anything) and a place to paste the reply back.
- Nothing else can run until you press **Send reply to room** or **Skip**. If the page looks stuck, scroll down to find the yellow box, or press **Stop**.
- If you only want the CLI agents, un-tick Muse.
- Free-plan chats such as Perplexity have no command-line tool for this, so Muse is the way to include them.

## Using it
- Enter sends your question. Shift+Enter adds a new line.
- "How many turns?" has three choices: everyone answers once; answer, then react to each other; answer, react, then react again. In the first turn everyone answers in parallel. In later turns each agent in turn sees the whole transcript and responds to the others (capped at 5).
- `@Claude`, `@Codex`, `@Muse` in a message sends it only to those agents.
- Stop cancels remaining turns. The transcript is saved to `transcript.json`. Clear resets it.

## Notes
- The server listens on 127.0.0.1 only and rejects non-JSON POSTs, so other websites can't drive it.
- CLI flags can differ by version. If an agent errors, run its command by hand (e.g. `echo hi | claude -p`) and adjust `config.json`.
- Not built yet: browser automation for Muse (fragile, and may conflict with the site's terms) and a Telegram bridge.
