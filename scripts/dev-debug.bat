@echo off
REM Development script with DEBUG logging enabled for Windows
REM This script sets REACT_APP_LOG_LEVEL=3 (DEBUG) for enhanced development logging

echo 🚀 Starting development server with DEBUG logging enabled...
echo 📊 Log Level: DEBUG (3)
echo 🔍 All logs will be visible including detailed debugging information
echo.

REM Set environment variable for DEBUG logging
set REACT_APP_LOG_LEVEL=3

REM Start the React development server
npm start