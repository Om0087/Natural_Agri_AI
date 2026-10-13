@echo off
title KrushiMitra AI Assistant - Flask Server
echo ========================================================
echo 🌱 Starting KrushiMitra Natural Farming AI Assistant Server
echo ========================================================
echo.
cd /d "%~dp0"
if exist venv\Scripts\python.exe (
    venv\Scripts\python.exe app.py
) else (
    python app.py
)
pause
