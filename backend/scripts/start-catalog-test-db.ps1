param([int]$Port = 33307)
$ErrorActionPreference = 'Stop'
$testingRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../storage/framework/testing'))
New-Item -ItemType Directory -Path $testingRoot -Force | Out-Null
$dataPath = Join-Path $testingRoot ('catalog-mariadb-' + [guid]::NewGuid().ToString('N'))
if (-not $dataPath.StartsWith($testingRoot + [IO.Path]::DirectorySeparatorChar)) { throw 'Unsafe test data directory.' }
if (Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue) { throw "Test port $Port is occupied." }
& 'D:/xampp/mysql/bin/mariadb-install-db.exe' "--datadir=$dataPath" "--port=$Port" --silent
if ($LASTEXITCODE -ne 0) { throw 'MariaDB test installation failed.' }
$serverArgs = @('--no-defaults', '--basedir=D:/xampp/mysql', "--datadir=$dataPath", '--bind-address=127.0.0.1', "--port=$Port", '--skip-name-resolve', '--innodb-buffer-pool-size=32M', "--log-error=$dataPath/server.log", "--pid-file=$dataPath/server.pid")
$serverProcess = Start-Process -FilePath 'D:/xampp/mysql/bin/mysqld.exe' -ArgumentList $serverArgs -WindowStyle Hidden -PassThru
$metadata = @{ port = $Port; pid = $serverProcess.Id; datadir = $dataPath }
$metadata | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $testingRoot 'catalog-test-server.json') -Encoding UTF8
Start-Sleep -Seconds 2
if ($serverProcess.HasExited) { throw 'MariaDB test server exited; inspect its testing log.' }
$metadata | ConvertTo-Json
