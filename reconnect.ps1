# reconnect.ps1 — reconnect the phone to Metro after unplug/replug.
# Assumes Metro is already running (npm run dev:client). If not, start that first.
$pkg    = "com.danielmatei.intelligence"
$scheme = "exp+intelligence"
$url    = "http://localhost:8081"

Write-Host "1) adb devices:" -ForegroundColor Cyan
adb devices

Write-Host "2) restoring reverse tunnel (8081)..." -ForegroundColor Cyan
adb reverse tcp:8081 tcp:8081 | Out-Null
adb reverse --list

Write-Host "3) is Metro up?" -ForegroundColor Cyan
$metro = try { (Invoke-WebRequest "http://localhost:8081/status" -UseBasicParsing -TimeoutSec 3).StatusCode } catch { 0 }
if ($metro -ne 200) {
  Write-Host "   Metro NOT running. Open a terminal in C:\dev\intelligence and run:  npm run dev:client" -ForegroundColor Yellow
  Write-Host "   Then re-run this script." -ForegroundColor Yellow
  exit 1
}
Write-Host "   Metro OK." -ForegroundColor Green

Write-Host "4) relaunching app pointed at localhost..." -ForegroundColor Cyan
adb shell am force-stop $pkg
$deep = "$scheme`://expo-development-client/?url=$([uri]::EscapeDataString($url))"
adb shell am start -a android.intent.action.VIEW -d $deep | Out-Null
Write-Host "Done. Watch the phone — it should bundle and open." -ForegroundColor Green
