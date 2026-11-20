@echo off
title Fusion Reactor Laboratory - Local Multiplayer Server
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 20 or later is required to run this game.
  echo Install Node.js from https://nodejs.org/ and try again.
  pause
  exit /b 1
)
echo.
echo FUSION REACTOR LABORATORY
echo The Experiment Continues
echo.
echo Open http://localhost:5173 in Chrome or Edge.
echo Leave this window running while you play.
echo.
node server.mjs
pause
