$ErrorActionPreference = 'Stop'
$csc = Join-Path $env:WINDIR "Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (-not (Test-Path $csc)) { $csc = Join-Path $env:WINDIR "Microsoft.NET\Framework\v4.0.30319\csc.exe" }
$root = (Get-Location).Path
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
    $rel = $f.FullName.Substring($root.Length + 1)
    $resArgs += ("/resource:" + $rel + "," + $prefix + $f.Name)
  }
}
# 内嵌 iverilog 便携包（运行时用 .NET 解压）
if (Test-Path "ivl.zip") { $resArgs += "/resource:ivl.zip,ivl.zip" }
& $csc /nologo /target:winexe /r:System.Windows.Forms.dll /r:System.IO.Compression.dll /r:System.IO.Compression.FileSystem.dll /out:WavePaint.exe $resArgs WavePaintLauncher.cs
Write-Host "csc exit: $LASTEXITCODE"
if (Test-Path "WavePaint.exe") { Write-Host ("WavePaint.exe size: " + (Get-Item "WavePaint.exe").Length) }