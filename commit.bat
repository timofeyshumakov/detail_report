@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

cd /d %~dp0

where git >nul 2>nul
if errorlevel 1 (
    echo git не найден в PATH
    pause
    exit /b 1
)

git add -A

set "COMMENT="
set /p "COMMENT=Введите комментарий к коммиту (Enter = comment): "

if "!COMMENT!"=="" set "COMMENT=comment"

git diff --cached --quiet
if !errorlevel! equ 0 (
    git diff --quiet
    if !errorlevel! equ 0 (
        echo Нет изменений для коммита.
        goto :push
    )
)

git commit -m "!COMMENT!"
if errorlevel 1 (
    echo Ошибка при создании коммита!
    pause
    exit /b 1
)
echo Коммит выполнен: "!COMMENT!"

:push
git remote get-url origin >nul 2>nul
if errorlevel 1 (
    echo Remote origin не настроен. Создаём репозиторий на GitHub...
    where gh >nul 2>nul
    if errorlevel 1 (
        echo Установите GitHub CLI и выполните: gh auth login
        pause
        exit /b 1
    )
    for %%I in ("%~dp0.") do set "REPO_NAME=%%~nxI"
    gh repo create "!REPO_NAME!" --private --source=. --remote=origin --push
    if errorlevel 1 (
        echo Ошибка создания репозитория на GitHub
        pause
        exit /b 1
    )
    goto :done
)

for /f "tokens=*" %%B in ('git rev-parse --abbrev-ref HEAD') do set "BRANCH=%%B"
git push -u origin "!BRANCH!"
if errorlevel 1 (
    echo Ошибка push!
    pause
    exit /b 1
)

:done
echo Готово!
pause
