@echo off
REM One-click: push the portfolio to github.com/willhoop/willhoop.github.io (the live site).
cd /d "%~dp0"
echo Pushing portfolio to github.com/willhoop/willhoop.github.io ...
git push origin main
echo.
echo Done. If it asked you to sign in, approve it and re-run this file.
pause
