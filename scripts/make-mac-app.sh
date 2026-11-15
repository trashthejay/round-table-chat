#!/bin/bash
# Builds ~/Applications/Round Table Chat.app (AppleScript applet, stays open in the Dock).
# Re-run after moving the project folder or changing your node install.
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NODE_BIN="$(command -v node || true)"
APP_DIR="$HOME/Applications"
APP="$APP_DIR/Round Table Chat.app"

[ -n "$NODE_BIN" ] || { echo "node not found in PATH" >&2; exit 1; }
[ -f "$PROJECT_DIR/server.js" ] || { echo "server.js not found in $PROJECT_DIR" >&2; exit 1; }
command -v osacompile >/dev/null || { echo "osacompile not found (macOS only)" >&2; exit 1; }

# Escape for use inside an AppleScript string literal.
esc() { printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'; }
P_ESC="$(esc "$PROJECT_DIR")"
N_ESC="$(esc "$NODE_BIN")"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
SRC="$TMP/RoundTableChat.applescript"

cat > "$SRC" <<APPLESCRIPT
property projectDir : "$P_ESC"
property nodeBin : "$N_ESC"
property appURL : "http://127.0.0.1:3737"
property serverPID : ""

on pathPrefix()
	return "export PATH=" & quoted form of ((do shell script "dirname " & quoted form of nodeBin) & ":/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin") & "; "
end pathPrefix

on portUp()
	try
		do shell script pathPrefix() & "/usr/bin/nc -z -w 1 127.0.0.1 3737 >/dev/null 2>&1"
		return true
	on error
		return false
	end try
end portUp

on run
	if not portUp() then
		try
			set serverPID to do shell script pathPrefix() & "mkdir -p ~/Library/Logs; ( cd " & quoted form of projectDir & " && exec " & quoted form of nodeBin & " server.js ) </dev/null >>~/Library/Logs/RoundTableChat.log 2>&1 & echo \$!"
		on error errMsg
			set serverPID to ""
		end try
		set tries to 0
		repeat while (not portUp()) and tries < 50
			delay 0.2
			set tries to tries + 1
		end repeat
		if serverPID is not "" then
			-- If our server already exited (e.g. EADDRINUSE because one was running), do not keep its PID.
			try
				do shell script "/bin/kill -0 " & serverPID & " 2>/dev/null"
			on error
				set serverPID to ""
			end try
		end if
		if not portUp() then
			if serverPID is not "" then
				try
					do shell script "kill " & serverPID & " 2>/dev/null; true"
				end try
				set serverPID to ""
			end if
			display dialog "Round Table Chat could not start the server. See the log at ~/Library/Logs/RoundTableChat.log" buttons {"OK"} default button "OK" with icon stop
			quit
			return
		end if
	end if
	open location appURL
end run

on reopen
	open location appURL
end reopen

on quit
	if serverPID is not "" then
		try
			do shell script "pkill -P " & serverPID & " 2>/dev/null; kill " & serverPID & " 2>/dev/null; true"
		end try
		set serverPID to ""
	end if
	continue quit
end quit
APPLESCRIPT

mkdir -p "$APP_DIR"
rm -rf "$APP"
osacompile -s -o "$APP" "$SRC"
# Make it stay open (so it lives in the Dock and receives quit/reopen events).
/usr/libexec/PlistBuddy -c "Delete :OSAAppletStayOpen" "$APP/Contents/Info.plist" 2>/dev/null || true
/usr/libexec/PlistBuddy -c "Add :OSAAppletStayOpen bool true" "$APP/Contents/Info.plist"
codesign --force --deep -s - "$APP" >/dev/null 2>&1 || true
touch "$APP"

echo "Built: $APP"
echo "  project: $PROJECT_DIR"
echo "  node:    $NODE_BIN"
echo "  log:     ~/Library/Logs/RoundTableChat.log"
