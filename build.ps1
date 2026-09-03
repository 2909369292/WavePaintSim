$ErrorActionPreference = 'Stop'
# 强制在脚本所在目录执行（避免外层 shell cwd 漂移导致相对路径/中文路径解析错误）
Set-Location -LiteralPath $PSScriptRoot

# 1) Generate resource manifest with Node (cross-platform, handles js/ subdirs)
node "tools\gen-resources.mjs"
if ($LASTEXITCODE -ne 0) { throw "gen-resources.mjs failed" }

# 1.5) 版本戳记（批次10）：version.txt 内嵌进 exe 并由 /version.txt 提供，
# 前端在仿真面板显示 —— 用户可自查「是不是旧 exe」（历史事故：误启旧副本
# 表现为「修复没生效」）。内容 = 主版本 + 构建时间 + git 短哈希。
$gitHash = ""
try { $gitHash = (git rev-parse --short HEAD) 2>$null } catch {}
if (-not $gitHash) { $gitHash = "nogit" }
$versionText = "v0.4.0 build " + (Get-Date -Format "yyyy-MM-dd HH:mm:ss") + " " + $gitHash
# 无 BOM 写入（PS5.1 的 -Encoding UTF8 会带 BOM，前端展示会多出 \uFEFF）
[IO.File]::WriteAllText((Join-Path $PSScriptRoot "version.txt"), $versionText, (New-Object System.Text.UTF8Encoding($false)))
Add-Content -Path "resources.txt" -Value "version.txt,root_version.txt"

$csc = Join-Path $env:WINDIR "Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (-not (Test-Path $csc)) { $csc = Join-Path $env:WINDIR "Microsoft.NET\Framework\v4.0.30319\csc.exe" }

$resArgs = @()
Get-Content "resources.txt" | ForEach-Object {
  $t = $_.Trim()
  if ($t.Length -gt 0) { $resArgs += ("/resource:" + $t) }
}

$iconArg = ""
if (Test-Path "img\app.ico") { $iconArg = "/win32icon:img\app.ico" }

# 产物路径用脚本所在目录的绝对路径：即使 Set-Location 被外层策略/权限干扰，
# 也不会把 exe 写到别的目录（历史事故：产物落到 WavePaintSim/ 生成同名旧副本，
# 用户误启动旧副本，表现为「修复没生效」）。
$exeOut = Join-Path $PSScriptRoot "WavePaintClean.exe"
$stampBefore = (Get-Item $exeOut -ErrorAction SilentlyContinue).LastWriteTimeUtc

& $csc /nologo /target:winexe $iconArg /r:System.Windows.Forms.dll /r:System.IO.Compression.dll /r:System.IO.Compression.FileSystem.dll /out:$exeOut $resArgs WavePaintLauncher.cs
Write-Host "csc exit: $LASTEXITCODE"
Write-Host ("res count: " + $resArgs.Count)
Write-Host ("exe out: " + $exeOut)

# 编译失败必须让外层看到非零退出码（历史坑：只 Write-Host 会导致「假成功」，
# 开发者以为构建好了，实际跑的还是旧 exe）。
if ($LASTEXITCODE -ne 0) { throw "csc failed with exit $LASTEXITCODE" }
if (-not (Test-Path $exeOut)) { throw "exe not produced: $exeOut" }
$stampAfter = (Get-Item $exeOut).LastWriteTimeUtc
if ($stampBefore -and $stampAfter -le $stampBefore) {
  Write-Host "WARNING: exe 时间戳未变化，可能未重新链接（请确认源码确有改动或清理后重试）"
}
Write-Host ("WavePaintClean.exe size: " + (Get-Item $exeOut).Length)
