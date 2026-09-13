# ============================================================================
# WavePaint 原型（prototype/ui-mockup.html）→ WavePaintMockup.exe
# ----------------------------------------------------------------------------
# 用途：把 UI 原型打成双击即用的 exe，供用户 review（不再依赖 node dev-server）。
# 产物：WavePaintMockup.exe（仓库根，已进 .gitignore）+ mockup-version.txt（构建戳）
#
# ⚠ 与 build.ps1 完全独立：
#   · 不写 resources.txt、不动 version.txt、不碰 WavePaintClean.exe；
#   · 内嵌范围 prototype/ + img/ + css/ + js/ + lib/ + mockup-version.txt（后三者是
#     真机骨架 ../css ../js ../lib 的 ESM/样式依赖，原型页 1:1 复用；img 同理）；
#   · 因此构建本 exe **不触发 C1**（C1 只管 js/ index.html css/ img/ lib/
#     WavePaintLauncher.cs build.ps1 的改动 —— 本脚本只「读取」prototype/img）。
#   · 改 prototype/ 后必须重跑本脚本，否则 exe 里还是旧快照。
# ============================================================================
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

$homePage = Join-Path $PSScriptRoot "prototype\ui-mockup.html"
if (-not (Test-Path -LiteralPath $homePage)) { throw "原型首页缺失: $homePage" }

# 1) 构建戳（前端顶部横条显示，便于确认「看到的是不是最新构建」；无 BOM）
$gitHash = ""
try { $gitHash = (git rev-parse --short HEAD) 2>$null } catch { }
if (-not $gitHash) { $gitHash = "nogit" }
$stamp = "v0.4.0-mock build " + (Get-Date -Format "yyyy-MM-dd HH:mm:ss") + " " + $gitHash
$stampPath = Join-Path $PSScriptRoot "mockup-version.txt"
[IO.File]::WriteAllText($stampPath, $stamp, (New-Object System.Text.UTF8Encoding($false)))

# 2) 资源清单（内嵌资源的逻辑名 = 与 URL 路径一致，launcher 直接按路径取流）
$resArgs = @("/resource:mockup-version.txt,mockup-version.txt")
$pairs = @()
foreach ($dir in @("prototype", "img", "css", "js", "lib")) {
  $base = Join-Path $PSScriptRoot $dir
  if (-not (Test-Path -LiteralPath $base)) { continue }
  Get-ChildItem -LiteralPath $base -File -Recurse | ForEach-Object {
    $rel = $_.FullName.Substring($PSScriptRoot.Length + 1)          # prototype\ui-mockup.html
    $logical = $rel.Replace('\', '/')                                # prototype/ui-mockup.html
    $pairs += ($rel + " -> " + $logical)
    $resArgs += ("/resource:" + $rel + "," + $logical)
  }
}

$csc = Join-Path $env:WINDIR "Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (-not (Test-Path $csc)) { $csc = Join-Path $env:WINDIR "Microsoft.NET\Framework\v4.0.30319\csc.exe" }

$iconArg = ""
if (Test-Path "img\app.ico") { $iconArg = "/win32icon:img\app.ico" }

$exeOut = Join-Path $PSScriptRoot "WavePaintMockup.exe"
$stampBefore = (Get-Item $exeOut -ErrorAction SilentlyContinue).LastWriteTimeUtc

& $csc /nologo /target:winexe $iconArg /r:System.Windows.Forms.dll /out:$exeOut $resArgs MockupLauncher.cs
Write-Host "csc exit: $LASTEXITCODE"
Write-Host ("res count: " + $resArgs.Count)
$pairs | ForEach-Object { Write-Host ("  " + $_) }
Write-Host ("exe out: " + $exeOut)
if ($LASTEXITCODE -ne 0) { throw "csc failed with exit $LASTEXITCODE" }
if (-not (Test-Path $exeOut)) { throw "exe not produced: $exeOut" }
$stampAfter = (Get-Item $exeOut).LastWriteTimeUtc
if ($stampBefore -and $stampAfter -le $stampBefore) {
  Write-Host "WARNING: exe 时间戳未变化，可能未重新链接（清理后重试）"
}
Write-Host ("stamp: " + $stamp)
Write-Host ("WavePaintMockup.exe size: " + (Get-Item $exeOut).Length)
