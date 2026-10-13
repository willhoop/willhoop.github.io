@echo off
REM One-click: push the portfolio to github.com/willhoop/willhoop.github.io (the live site).
cd /d "%~dp0"
echo Refreshing the agent-readable files ...
node build\build_agent_files.js --check >nul
if errorlevel 1 (
  echo The agent-readable files were stale. They are now rebuilt.
  echo Commit them, then run this file again.
  node build\build_agent_files.js
  pause
  exit /b 1
)
echo Pushing portfolio to github.com/willhoop/willhoop.github.io ...
git push origin main
echo.
echo Done. If it asked you to sign in, approve it and re-run this file.
pause
