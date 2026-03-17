param(
    [string]$InstallRoot = "C:\Program Files\Mommas-Bakeshop\backend",
    [int]$Port = 8123,
    [string]$NssmPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not $NssmPath) { throw "NssmPath is required (path to nssm.exe)." }
if (-not (Test-Path $NssmPath)) { throw "nssm.exe not found at $NssmPath" }

$phpExe = Join-Path $InstallRoot "php\php.exe"
$appRoot = Join-Path $InstallRoot "app"
$mysqlExe = Join-Path $InstallRoot "mysql\bin\mysqld.exe"
$dataDir = Join-Path $InstallRoot "mysql-data"

if (-not (Test-Path $phpExe)) { throw "php.exe not found at $phpExe" }
if (-not (Test-Path $mysqlExe)) { throw "mysqld.exe not found at $mysqlExe" }
if (-not (Test-Path $appRoot)) { throw "Laravel app not found at $appRoot" }

$mysqlArgs = @(
    "--basedir=$InstallRoot\mysql",
    "--datadir=$dataDir",
    "--port=3307",
    "--bind-address=127.0.0.1",
    "--console"
)

$phpArgs = @(
    "-d", "upload_tmp_dir=$appRoot\storage\tmp",
    "-d", "sys_temp_dir=$appRoot\storage\tmp",
    "-S", "127.0.0.1:$Port",
    "-t", "$appRoot\public"
)

Write-Host "Installing MySQL service..."
& $NssmPath install "MommasBakeshop-MySQL" $mysqlExe $mysqlArgs
& $NssmPath set "MommasBakeshop-MySQL" AppDirectory $InstallRoot
& $NssmPath set "MommasBakeshop-MySQL" Start SERVICE_AUTO_START

Write-Host "Installing PHP server service..."
& $NssmPath install "MommasBakeshop-PHP" $phpExe $phpArgs
& $NssmPath set "MommasBakeshop-PHP" AppDirectory $appRoot
& $NssmPath set "MommasBakeshop-PHP" Start SERVICE_AUTO_START

Write-Host "Starting services..."
& $NssmPath start "MommasBakeshop-MySQL"
& $NssmPath start "MommasBakeshop-PHP"

Write-Host "Services installed."
