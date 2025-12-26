@echo off
echo ========================================
echo   BoloPDF - Starting Development Servers
echo ========================================
echo.
echo Starting Backend (Port 5000) and Frontend (Port 5173)...
echo.

cd /d "%~dp0"

REM Check if node_modules exists in root
if not exist "node_modules\" (
    echo Installing root dependencies...
    call npm install
    echo.
)

REM Start both servers
call npm run dev

pause
