@echo off
chcp 65001 > nul
cd /d "%~dp0"
echo.
echo  기출 목록 새로 받기 (EBSi)
echo  ---------------------------------------------
echo  최근 3개년 기출을 다시 훑어서 assets\exam-catalog.json 을 새로 씁니다.
echo  파일이 실제로 열리는지까지 확인하느라 몇 분 걸립니다.
echo  (목록만 빨리 받으려면 이 창을 닫고 명령창에서
echo   node scripts\update-exam-catalog.js --skip-verify )
echo.
node scripts\update-exam-catalog.js %*
echo.
if errorlevel 1 (
  echo  * 열리지 않는 파일이 있었습니다. 위 숫자를 확인하세요.
) else (
  echo  * 끝났습니다. 자료실을 새로고침하면 새 기출이 보입니다.
)
echo.
pause
