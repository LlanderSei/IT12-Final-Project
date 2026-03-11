param(
    [Parameter(Mandatory = $true)]
    [string]$PhpRoot,
    [Parameter(Mandatory = $true)]
    [string]$MysqlRoot
)

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..\\..")
$phpDest = Join-Path $projectRoot "desktop\runtime\php"
$mysqlDest = Join-Path $projectRoot "desktop\runtime\mysql"

$phpExe = Join-Path $PhpRoot "php.exe"
if (-not (Test-Path $phpExe)) {
    throw "php.exe not found at $phpExe"
}

$mysqldExe = Join-Path $MysqlRoot "bin\mysqld.exe"
if (-not (Test-Path $mysqldExe)) {
    $mysqldExe = Join-Path $MysqlRoot "mysqld.exe"
}
if (-not (Test-Path $mysqldExe)) {
    throw "mysqld.exe not found under $MysqlRoot"
}

New-Item -ItemType Directory -Force -Path $phpDest | Out-Null
New-Item -ItemType Directory -Force -Path $mysqlDest | Out-Null

Write-Host "Copying PHP runtime from $PhpRoot to $phpDest"
Copy-Item -Path (Join-Path $PhpRoot "*") -Destination $phpDest -Recurse -Force

Write-Host "Copying MySQL runtime from $MysqlRoot to $mysqlDest"
Copy-Item -Path (Join-Path $MysqlRoot "*") -Destination $mysqlDest -Recurse -Force

Write-Host "Runtime bundle complete."
