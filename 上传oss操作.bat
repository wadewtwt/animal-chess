@echo off
cd /d "%~dp0"
title 部署 Remote 资源到 OSS

echo ====================================
echo 正在检查并准备执行环境...
echo ====================================

where node >nul 2>nul
if errorlevel 1 (
    echo [错误] 未检测到 Node.js 环境，请先安装 Node.js！
    goto END
)

if exist node_modules goto RUN_SCRIPT
echo [提示] 首次运行，正在安装依赖包 (ali-oss, dotenv)...
call npm install --no-fund --no-audit
if errorlevel 1 (
    echo [错误] 依赖包安装失败，请检查网络或 npm 环境！
    goto END
)

:RUN_SCRIPT
echo [提示] 正在运行 OSS 部署脚本...
echo.
node deploy-remote.js

if errorlevel 1 (
    echo.
    echo [错误] 部署失败，请检查上方报错信息！
) else (
    echo.
    echo [成功] 所有操作已顺利完成。
)

:END
echo.
pause
