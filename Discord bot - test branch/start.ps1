# Stop any running node processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Wait a moment for processes to fully terminate
Start-Sleep -Milliseconds 500

# Start the Discord bot
Write-Host "Starting Discord bot..." -ForegroundColor Green
node index.js
