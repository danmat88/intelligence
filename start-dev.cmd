@echo off
title IntelliMath dev launcher
cd /d C:\dev\intelligence

echo.
echo  ============================================
echo   Starting IntelliMath dev environment
echo  ============================================
echo.

REM 1) Open Metro in its own window (leave it running).
start "IntelliMath Metro" cmd /k "cd /d C:\dev\intelligence && npm run dev:client"

REM 2) Wait until Metro answers on 8081 (up to ~120s; cold start is slow).
echo  Waiting for Metro to come up...
powershell -NoProfile -Command "for($i=0;$i -lt 60;$i++){try{if((Invoke-WebRequest 'http://localhost:8081/status' -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200){Write-Host '  Metro is up.' -ForegroundColor Green; exit 0}}catch{}; Start-Sleep -Seconds 2}; Write-Host '  Metro did not respond in time.' -ForegroundColor Yellow; exit 1"

REM 3) Connect the phone (tunnel + launch the app).
echo.
echo  Connecting phone...
start "IntelliMath Reconnect" powershell -NoExit -ExecutionPolicy Bypass -File "C:\dev\intelligence\reconnect.ps1"

echo.
echo  Done. Watch your phone - it should bundle and open.
echo  (Keep the Metro window open while you work.)
echo.
timeout /t 6 >nul
