@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

cd /d %~dp0

git add .

:: Нет изменений — коммитить нечего
git diff --cached --quiet
if !errorlevel! equ 0 (
    echo Нет изменений для коммита.
    pause
    exit /b 0
)

set "MSG_FILE=%TEMP%\detail-report-commit-msg.txt"

echo Введите комментарий к коммиту и нажмите Enter (пустой Enter - "comment").
echo Если ничего не нажать в течение 10 секунд, будет использован "comment".

:: Ввод с таймаутом: в cmd set /p не умеет таймаут, поэтому через PowerShell.
:: Текст пишется в файл в UTF-8 — так кириллица не ломается.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\read-commit-message.ps1" -OutFile "%MSG_FILE%" -Timeout 10 -Default "comment"
if !errorlevel! equ 2 echo Используется комментарий по умолчанию: "comment"

if not exist "%MSG_FILE%" (
    echo Не удалось получить комментарий к коммиту!
    pause
    exit /b 1
)

:: Выполняем коммит
git commit -F "%MSG_FILE%"
set "COMMIT_RESULT=!errorlevel!"
del /q "%MSG_FILE%" > nul 2>&1

if !COMMIT_RESULT! neq 0 (
    echo Ошибка при создании коммита!
    pause
    exit /b !COMMIT_RESULT!
)

echo Коммит выполнен:
git log -1 --oneline

:: Пушим текущую ветку (в репозитории ветка master, не main)
git push origin HEAD
if !errorlevel! neq 0 (
    echo Ошибка при push!
    pause
    exit /b 1
)

echo Готово!
pause