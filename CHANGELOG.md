# Changelog

## [0.1.7] - 2026-11-15
### Added
- assets/icon-1024.png: the app icon (1024x1024 PNG, transparent corners).
- scripts/make-mac-app.sh: converts the icon to applet.icns (sips/iconutil) and removes osacompile's default icon asset catalog so the app uses it.

## [0.1.6] - 2026-11-15
### Added
- scripts/make-mac-app.sh: builds ~/Applications/Round Table Chat.app, which starts the server, opens the browser, and stops the server on Cmd+Q (skips starting a second server if port 3737 is in use).
- README.md: "Launch like a Mac app" section.

## [0.1.5] - 2026-11-13
### Changed
- README.md: documents the Codex/ChatGPT agent, warns that Gemini is blocked on free personal Google accounts and that Muse makes the room wait for a paste, and updates usage notes.

## [0.1.4] - 2026-11-13
### Changed
- public/index.html: in the question box, Enter now sends the message and Shift+Enter inserts a newline (Cmd/Ctrl+Enter still sends; IME composition is ignored); placeholder updated.

## [0.1.3] - 2026-11-13
### Added
- config.json: new "Codex" CLI agent (`codex exec -s read-only --skip-git-repo-check --ephemeral -`, prompt via stdin).

### Changed
- public/index.html: the "Rounds" dropdown is now "How many turns?" with plain-language options (values still 1/2/3), reworded hint, and a placeholder that no longer hardcodes agent names.

## [0.1.2] - 2026-11-13
### Added
- Header now shows "v<version> · updated <date>"; server.js reads the version from package.json and the date from the latest CHANGELOG.md heading, and /api/state returns `version` and `updated`.

## [0.1.1] - 2026-11-13
### Fixed
- adapters.js: on non-zero exit, the rejection message now falls back stderr -> stdout -> "exit code N", so CLI errors printed to stdout (e.g. claude "Not logged in") are shown.

## [0.1.0]
- Initial release.
