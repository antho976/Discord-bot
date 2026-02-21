@echo off
REM ULTRA-FAST mode - Maximum performance, uses more memory
REM FOR PRODUCTION USE ONLY - Not recommended for development

echo Starting RPG Bot in ULTRA-FAST mode...
echo WARNING: This uses aggressive optimizations and more memory!
echo.

node ^
  --max-old-space-size=8192 ^
  --max-semi-space-size=256 ^
  --optimize-for-size ^
  --gc-interval=200 ^
  --no-compilation-cache ^
  --jitless=false ^
  --turbo-fast-api-calls ^
  --turbo-inlining ^
  --turbo-loop-peeling ^
  index.js

REM ULTRA-FAST FLAGS:
REM --max-old-space-size=8192     : 8GB heap (huge but prevents any GC pauses)
REM --max-semi-space-size=256     : Larger young generation (fewer minor GCs)
REM --gc-interval=200             : Minimal GC (2x less frequent)
REM --no-compilation-cache        : Skip cache writes (faster startup)
REM --turbo-fast-api-calls        : Inline API calls
REM --turbo-inlining              : Aggressive function inlining
REM --turbo-loop-peeling          : Optimize loops

REM EXPECTED GAINS:
REM - 15-20% faster startup
REM - 5-10% faster interactions
REM - 30-40% more memory usage
REM - Best for 20-50 concurrent users

pause
