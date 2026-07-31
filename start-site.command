#!/bin/zsh
# Chun Hee — Portfolio launcher
# Serves the site on localhost so it behaves exactly as it will when hosted.
#
# Don't open the .dc.html file directly — a file:// page can't load ES modules
# from a CDN (browser security rule, not a bug), which is what builds the 3D
# "Land of Hope" logo and the character carousel. Those sections come up empty.
cd "$(dirname "$0")"
PORT=8923
if ! lsof -i :$PORT >/dev/null 2>&1; then
  python3 -m http.server $PORT >/dev/null 2>&1 &
  sleep 1
fi
open "http://localhost:$PORT/Chun%20Hee%20-%20Portfolio.dc.html"
