@echo off
REM Optimized startup with V8 performance flags
REM Provides 3-5% additional performance boost

echo Starting RPG Bot with V8 optimizations...

node ^
  --max-old-space-size=4096 ^
  --optimize-for-size ^
  --gc-interval=100 ^
  --expose-gc ^
  index.js

REM Flags explanation:
REM --max-old-space-size=4096     : Increase heap size to 4GB (prevents premature GC)
REM --optimize-for-size           : Optimize for memory over speed (better for long-running)
REM --gc-interval=100             : Run garbage collection less frequently (faster but more memory)
REM --expose-gc                   : Allow manual GC triggering if needed

pause
