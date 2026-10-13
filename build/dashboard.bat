@echo off
REM  Double-click this. It opens the live agent/memory dashboard in this window.
REM
REM    1 / 2 / 3   whose machine it is:  mine / shared / overnight
REM    q           quit
REM
REM  The mode is written to portfolio\data\agent-budget.json, which is the same file the web
REM  version writes and the same file Claude reads before starting any job. Advisory only —
REM  nothing here kills a running process, deliberately: a monitor that kills things will
REM  eventually kill a measurement mid-flight, which is the exact accident it exists to prevent.
REM
REM  Tip: in Windows Terminal, right-click the tab -> "Always on top" to pin it in a corner.
title Who's using the box
cd /d "%~dp0..\.."
node portfolio\build\agent_dashboard.js --watch
