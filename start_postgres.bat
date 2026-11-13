@echo off
echo ===================================================
echo Starting PostgreSQL Service (Administrator mode)...
echo ===================================================

:: Try starting PostgreSQL 16
net start postgresql-x64-16 2>nul
if %errorlevel% equ 0 (
    echo.
    echo [SUCCESS] PostgreSQL 16 service is now RUNNING on port 5433!
    goto done
)

:: Try starting PostgreSQL 18
net start postgresql-x64-18 2>nul
if %errorlevel% equ 0 (
    echo.
    echo [SUCCESS] PostgreSQL 18 service is now RUNNING on port 5432!
    goto done
)

echo.
echo [ACCESS DENIED / NOT STARTED]
echo Windows requires Administrator rights to start services.
echo.
echo Please do ONE of the following:
echo   1. Right-click this file ("start_postgres.bat") and choose "Run as administrator".
echo   2. Press Win + R, type "services.msc", find "postgresql-x64-16" or "18", right-click and click "Start".
echo.

:done
echo ===================================================
pause

