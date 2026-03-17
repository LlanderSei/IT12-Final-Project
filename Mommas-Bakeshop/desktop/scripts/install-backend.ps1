param(
    [string]$InstallRoot = "C:\Program Files\Mommas-Bakeshop\backend",
    [string]$AppRoot,
    [string]$PhpRoot,
    [string]$MysqlRoot,
    [int]$Port = 8123,
    [string]$DbName = "mommas_bakeshop",
    [string]$DbUser = "mommas",
    [string]$DbPass = "mommas_password",
    [switch]$RunMigrations = $true,
    [switch]$RunSeeds = $true,
    [string]$NssmPath = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Assert-Path($Path, $Label) {
    if (-not (Test-Path $Path)) {
        throw "$Label not found at $Path"
    }
}

function Ensure-Directory($Path) {
    New-Item -ItemType Directory -Force -Path $Path | Out-Null
}

function Write-DesktopConfig($Url) {
    $configPath = Join-Path $env:APPDATA "Momma's Bakeshop\desktop-config.json"
    Ensure-Directory (Split-Path $configPath)
    $payload = @{
        DESKTOP_APP_URL = $Url
        DESKTOP_SKIP_HEALTH_CHECK = "false"
    }
    $payload | ConvertTo-Json -Depth 2 | Set-Content -Path $configPath -Encoding UTF8
    Write-Host "Desktop config written to $configPath"
}

function Wait-Port($Host, $Port, $TimeoutSec = 30) {
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    while ((Get-Date) -lt $deadline) {
        try {
            $client = New-Object System.Net.Sockets.TcpClient
            $client.Connect($Host, $Port)
            $client.Close()
            return $true
        } catch {
            Start-Sleep -Milliseconds 500
        }
    }
    return $false
}

if (-not $AppRoot) { throw "AppRoot is required (Laravel app root)." }
if (-not $PhpRoot) { throw "PhpRoot is required (portable PHP root)." }
if (-not $MysqlRoot) { throw "MysqlRoot is required (portable MySQL root)." }

Assert-Path $AppRoot "Laravel app root"
Assert-Path $PhpRoot "PHP root"
Assert-Path $MysqlRoot "MySQL root"

$appDest = Join-Path $InstallRoot "app"
$phpDest = Join-Path $InstallRoot "php"
$mysqlDest = Join-Path $InstallRoot "mysql"
$dataDir = Join-Path $InstallRoot "mysql-data"

Ensure-Directory $InstallRoot
Ensure-Directory $appDest
Ensure-Directory $phpDest
Ensure-Directory $mysqlDest
Ensure-Directory $dataDir

Write-Host "Copying Laravel app..."
Copy-Item -Path (Join-Path $AppRoot "*") -Destination $appDest -Recurse -Force

Write-Host "Copying PHP runtime..."
Copy-Item -Path (Join-Path $PhpRoot "*") -Destination $phpDest -Recurse -Force

Write-Host "Copying MySQL runtime..."
Copy-Item -Path (Join-Path $MysqlRoot "*") -Destination $mysqlDest -Recurse -Force

$phpExe = Join-Path $phpDest "php.exe"
$mysqldExe = Join-Path $mysqlDest "bin\mysqld.exe"
$mysqlExe = Join-Path $mysqlDest "bin\mysql.exe"

Assert-Path $phpExe "php.exe"
Assert-Path $mysqldExe "mysqld.exe"
Assert-Path $mysqlExe "mysql.exe"

Write-Host "Initializing MySQL data directory..."
& $mysqldExe --initialize-insecure --basedir="$mysqlDest" --datadir="$dataDir" | Out-Null

Write-Host "Starting MySQL for initial setup..."
$mysqlProc = Start-Process -FilePath $mysqldExe -ArgumentList @(
    "--basedir=$mysqlDest",
    "--datadir=$dataDir",
    "--port=3307",
    "--bind-address=127.0.0.1",
    "--console"
) -PassThru -WindowStyle Hidden

if (-not (Wait-Port "127.0.0.1" 3307 30)) {
    throw "MySQL failed to start on port 3307."
}

Write-Host "Creating database and user..."
& $mysqlExe -h 127.0.0.1 -P 3307 -u root -e `
    "CREATE DATABASE IF NOT EXISTS $DbName; `
     CREATE USER IF NOT EXISTS '$DbUser'@'127.0.0.1' IDENTIFIED BY '$DbPass'; `
     GRANT ALL PRIVILEGES ON $DbName.* TO '$DbUser'@'127.0.0.1'; `
     FLUSH PRIVILEGES;" | Out-Null

Write-Host "Stopping MySQL..."
Stop-Process -Id $mysqlProc.Id -Force

$envPath = Join-Path $appDest ".env"
if (-not (Test-Path $envPath)) {
    Copy-Item -Path (Join-Path $appDest ".env.example") -Destination $envPath -Force
}

Write-Host "Writing .env values..."
(Get-Content $envPath) `
    -replace '^APP_ENV=.*$', 'APP_ENV=production' `
    -replace '^APP_DEBUG=.*$', 'APP_DEBUG=false' `
    -replace '^APP_URL=.*$', "APP_URL=http://127.0.0.1:$Port" `
    -replace '^DB_CONNECTION=.*$', 'DB_CONNECTION=mysql' `
    -replace '^DB_HOST=.*$', 'DB_HOST=127.0.0.1' `
    -replace '^DB_PORT=.*$', 'DB_PORT=3307' `
    -replace '^DB_DATABASE=.*$', "DB_DATABASE=$DbName" `
    -replace '^DB_USERNAME=.*$', "DB_USERNAME=$DbUser" `
    -replace '^DB_PASSWORD=.*$', "DB_PASSWORD=$DbPass" `
    | Set-Content -Path $envPath -Encoding UTF8

Write-Host "Generating APP_KEY..."
& $phpExe $appDest\artisan key:generate --force | Out-Null

if ($RunMigrations) {
    Write-Host "Running migrations..."
    & $phpExe $appDest\artisan migrate --force | Out-Null
}

if ($RunSeeds) {
    Write-Host "Running seeds..."
    & $phpExe $appDest\artisan db:seed --force | Out-Null
}

Write-Host "Writing desktop config..."
Write-DesktopConfig "http://127.0.0.1:$Port"

if ($NssmPath) {
    Write-Host "Installing services via NSSM..."
    & $PSScriptRoot\install-services.ps1 -InstallRoot $InstallRoot -Port $Port -NssmPath $NssmPath
} else {
    Write-Host "Skipping service install (NssmPath not provided)."
}

Write-Host "Backend install complete."
