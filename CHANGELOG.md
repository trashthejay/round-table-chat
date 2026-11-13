# Changelog

## [0.1.2] - 2026-11-13
### Added
- Header now shows "v<version> · updated <date>"; server.js reads the version from package.json and the date from the latest CHANGELOG.md heading, and /api/state returns `version` and `updated`.

## [0.1.1] - 2026-11-13
### Fixed
- adapters.js: on non-zero exit, the rejection message now falls back stderr -> stdout -> "exit code N", so CLI errors printed to stdout (e.g. claude "Not logged in") are shown.

## [0.1.0]
- Initial release.
