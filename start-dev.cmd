@echo off
title Rezolvo dev launcher
cd /d C:\dev\intelligence

echo.
echo  ============================================
echo   Starting Rezolvo dev environment
echo  ============================================
echo.

REM Reuse a live Metro: if 8081 already answers, DON'T start a second one
REM (a second "expo start" hops to another port, and the dev client is
REM pinned to 8081 - nothing would connect).
REM NOTE: no if(...) blocks around these lines - cmd chokes on the ')' inside
REM the PowerShell command when it sits inside a parenthesized block.
powershell -NoProfile -Command "try{ if((Invoke-WebRequest 'http://localhost:8081/status' -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200){ exit 0 } }catch{}; exit 1"
if %errorlevel%==0 goto metro_ok

echo  Starting Metro...
start "Rezolvo Metro" cmd /k "cd /d C:\dev\intelligence && npm run dev:client"

echo  Waiting for Metro to come up...
powershell -NoProfile -Command "for($i=0;$i -lt 60;$i++){try{if((Invoke-WebRequest 'http://localhost:8081/status' -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200){Write-Host '  Metro is up.' -ForegroundColor Green; exit 0}}catch{}; Start-Sleep -Seconds 2}; Write-Host '  Metro did not respond in time.' -ForegroundColor Yellow; exit 1"
goto connect

:metro_ok
echo  Metro already running on 8081 - reusing it.

:connect
echo.
echo  Connecting phone...
start "Rezolvo Reconnect" powershell -NoExit -ExecutionPolicy Bypass -File "C:\dev\intelligence\reconnect.ps1"

echo.
echo  Done. Watch your phone - it should bundle and open.
echo  (Keep the Metro window open while you work.)
echo.
ping -n 7 127.0.0.1 >nul
