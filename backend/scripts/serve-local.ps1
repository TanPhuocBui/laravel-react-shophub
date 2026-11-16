param([ValidateRange(1024, 65535)][int]$Port = 8000)
$ErrorActionPreference = 'Stop'
$backendRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$phpBinary = (Get-Command php -ErrorAction Stop).Source
$modules = & $phpBinary -m
$phpArguments = @()
if (-not ($modules -contains 'Zend OPcache')) {
    $extensionPath = Join-Path (Split-Path $phpBinary) 'ext/php_opcache.dll'
    if (-not (Test-Path -LiteralPath $extensionPath)) {
        throw 'OPcache not found for selected PHP. Use php artisan serve or check PHP; this script does not edit php.ini.'
    }
    $phpArguments += @('-d', "zend_extension=$extensionPath")
}
$phpArguments += @('-d', 'opcache.enable_cli=1', '-d', 'opcache.validate_timestamps=1', '-d', 'opcache.revalidate_freq=0')
$phpArguments += @('-d', 'upload_max_filesize=5M', '-d', 'post_max_size=60M')
$router = Join-Path $backendRoot 'vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php'
$phpArguments += @('-S', "localhost:$Port", '-t', (Join-Path $backendRoot 'public'), $router)
Write-Host "ShopHub local: http://localhost:$Port - OPcache CLI; checks file changes on every request. Ctrl+C to stop."
Push-Location $backendRoot
try { & $phpBinary @phpArguments }
finally { Pop-Location }
