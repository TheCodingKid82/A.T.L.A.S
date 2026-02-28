#!/bin/bash
# Start the virtual display stack for computer-use mode
# Xvfb → openbox → x11vnc → noVNC

set -e

DISPLAY_NUM="${DISPLAY:-:1}"
WIDTH="${DISPLAY_WIDTH:-1024}"
HEIGHT="${DISPLAY_HEIGHT:-768}"
VNC_PORT="${VNC_PORT:-5901}"
NOVNC_PORT="${NOVNC_PORT:-6080}"

echo "[display] Starting Xvfb ${DISPLAY_NUM} at ${WIDTH}x${HEIGHT}x24..."
Xvfb ${DISPLAY_NUM} -screen 0 ${WIDTH}x${HEIGHT}x24 -ac +render -noreset &
sleep 1

echo "[display] Starting openbox window manager..."
DISPLAY=${DISPLAY_NUM} openbox &
sleep 0.5

echo "[display] Starting x11vnc on port ${VNC_PORT}..."
x11vnc -display ${DISPLAY_NUM} -nopw -listen 0.0.0.0 -rfbport ${VNC_PORT} -forever -shared -bg -noxdamage
sleep 0.5

echo "[display] Starting noVNC proxy on port ${NOVNC_PORT}..."
/opt/noVNC/utils/novnc_proxy --vnc localhost:${VNC_PORT} --listen ${NOVNC_PORT} &
sleep 0.5

# Verify the display is working
if DISPLAY=${DISPLAY_NUM} xdotool getdisplaygeometry 2>/dev/null; then
  echo "[display] Display stack ready: $(DISPLAY=${DISPLAY_NUM} xdotool getdisplaygeometry)"
else
  echo "[display] WARNING: Display verification failed"
fi
