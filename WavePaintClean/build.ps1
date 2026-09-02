$ErrorActionPreference = 'Stop'
# 强制在脚本所在目录执行（避免外层 shell cwd 漂移导致相对路径/中文路径解析错误）
Set-Location -LiteralPath $PSScriptRoot

# 1) Generate resource manifest with Node (cross-platform, handles js/ subdirs)
node "tools\gen-resources.mjs"
if ($LASTEXITCODE -ne 0) { throw "gen-resources.mjs failed" }

$csc = Join-Path $env:WINDIR "Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (-not (Test-Path $csc)) { $csc = Join-Path $env:WINDIR "Microsoft.NET\Framework\v4.0.30319\csc.exe" }

$resArgs = @()
Get-Content "resources.txt" | ForEach-Object {
  $t = $_.Trim()
  if ($t.Length -gt 0) { $resArgs += ("/resource:" + $t) }
}

$iconArg = ""
if (Test-Path "img\app.ico") { $iconArg = "/win32icon:img\app.ico" }

& $csc /nologo /target:winexe $iconArg /r:System.Windows.Forms.dll /r:System.IO.Compression.dll /r:System.IO.Compression.FileSystem.dll /out:WavePaintClean.exe $resArgs WavePaintLauncher.cs
Write-Host "csc exit: $LASTEXITCODE"
Write-Host ("res count: " + $resArgs.Count)
if (Test-Path "WavePaintClean.exe") { Write-Host ("WavePaintClean.exe size: " + (Get-Item "WavePaintClean.exe").Length) }
