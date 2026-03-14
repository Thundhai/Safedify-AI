@echo off
REM Automated authentication test for Safedify-AI backend
curl -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" --data-binary @data.json
pause
