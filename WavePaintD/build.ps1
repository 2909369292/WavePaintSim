$ErrorActionPreference = 'Stop'
$csc = Join-Path $env:WINDIR "Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (-not (Test-Path $csc)) { $csc = Join-Path $env:WINDIR "Microsoft.NET\Framework\v4.0.30319\csc.exe" }
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = (Resolve-Path $root).Path
$cwd = (Get-Location).Path
$buildRoot = Join-Path $env:TEMP "WavePaintD_build"
if (Test-Path $buildRoot) { Remove-Item -Recurse -Force $buildRoot }
New-Item -ItemType Directory -Path $buildRoot | Out-Null
Copy-Item -Recurse -Force (Join-Path $root "*") $buildRoot
$ivlSource = Join-Path (Split-Path -Parent $root) "WavePaintSim\ivl.zip"
if (Test-Path $ivlSource) { Copy-Item -Force $ivlSource (Join-Path $buildRoot "ivl.zip") }
Set-Location $buildRoot
$resArgs = @()
$specs = @(
  @("index.html", "root_"),
  @("css\*", "css_"),
  @("js\*", "js_"),
  @("img\*", "img_"),
  @("lib\*", "lib_")
)
foreach ($sp in $specs) {
  $pat = $sp[0]; $prefix = $sp[1]
  foreach ($f in Get-ChildItem -File $pat) {
    $rel = $f.FullName.Substring($buildRoot.Length + 1)
    $resArgs += ("/resource:" + $rel + "," + $prefix + $f.Name)
  }
}
if (Test-Path "ivl.zip") { $resArgs += "/resource:ivl.zip,ivl.zip" }
& $csc /nologo /target:winexe /r:System.Windows.Forms.dll /r:System.IO.Compression.dll /r:System.IO.Compression.FileSystem.dll /out:WavePaint.exe $resArgs WavePaintLauncher.cs
Write-Host "csc exit: $LASTEXITCODE"
if (Test-Path "WavePaint.exe") {
  $sourceExe = Join-Path $buildRoot "WavePaint.exe"
  $destinationExe = Join-Path $root "WavePaint.exe"
  [IO.File]::Copy($sourceExe, $destinationExe, $true)
  Write-Host ("WavePaint.exe size: " + (Get-Item "WavePaint.exe").Length)
}
Set-Location $cwd
