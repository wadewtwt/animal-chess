@echo off
echo ==================================================
echo 1/2 Setting environment variables for Linux...
echo ==================================================
set CGO_ENABLED=0
set GOOS=linux
set GOARCH=amd64

echo 2/2 Compiling animal-chess-server...
go build -ldflags="-w -s" -o animal-chess-server .

if %ERRORLEVEL% equ 0 (
    echo ==================================================
    echo Build success! Generated Linux binary: animal-chess-server
    echo Please upload it, Dockerfile and docker-compose.yml to CentOS.
    echo ==================================================
) else (
    echo ==================================================
    echo Build failed! Please check your Go environment.
    echo ==================================================
)
pause
