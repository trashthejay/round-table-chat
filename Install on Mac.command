#!/bin/bash
# Double-click this file to install "Round Table Chat" as a Mac app.
# (First time only: if macOS says it cannot verify the file, right-click it and choose Open.)

cd "$(dirname "$0")" || exit 1

pause() { [ -n "$RTC_NO_PAUSE" ] || read -n 1 -s -r -p "Press any key to close this window."; echo; }

echo "=== Round Table Chat: Mac installer ==="
echo

# Make sure the usual install locations are searched (Finder-launched shells can miss them).
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

# 1. Node.js 18 or newer is required.
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed yet."
  echo "Install the LTS version from https://nodejs.org, then double-click this file again."
  [ -n "$RTC_NO_OPEN" ] || open "https://nodejs.org"
  pause
  exit 1
fi
if ! node -e 'process.exit(parseInt(process.versions.node, 10) >= 18 ? 0 : 1)'; then
  echo "Your Node.js is too old (found $(node -v)). Please install version 18 or newer from https://nodejs.org."
  pause
  exit 1
fi
echo "Node.js $(node -v): OK"

# 2. Build the app.
echo
echo "Building the app..."
if ! bash scripts/make-mac-app.sh; then
  echo
  echo "The install did not finish. Please copy the messages above if you need help."
  pause
  exit 1
fi

# 3. Tell the user what is still missing (the app works with whichever agents are installed).
echo
for tool in claude codex; do
  if command -v "$tool" >/dev/null 2>&1; then
    echo "$tool: found"
  else
    echo "$tool: not found (optional, but that agent will not work until you install it and log in)"
  fi
done

echo
echo "Done! Open 'Round Table Chat' from the folder that just opened."
echo "Tip: drag it to your Dock. Press Cmd+Q on the app to stop it."
[ -n "$RTC_NO_OPEN" ] || open "$HOME/Applications"
pause
