@echo off
echo ================================
echo SQL Playground - Quick Start
echo ================================
echo.

echo Installing backend dependencies...
cd backend
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)
call venv\Scripts\activate.bat
pip install -r requirements.txt --quiet
cd ..

echo Installing frontend dependencies...
cd frontend
npm install --silent
cd ..

echo.
echo Starting Backend...
start "SQL Playground Backend" cmd /k "cd backend && venv\Scripts\activate.bat && python -m uvicorn app.main:app --reload"

timeout /t 3 /nobreak >nul

echo Starting Frontend...
cd frontend
npm run dev

pause