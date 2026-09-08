# Compose numbered contact-sheet grids from an icloud-contact-sheet.ps1 run,
# so a reviewer (human or model) can classify 30 clips per image instead of
# opening thumbnails one by one.
#
#   powershell -ExecutionPolicy Bypass -File scripts/footage/icloud-compose-sheets.ps1 -Dir "C:\Users\kentb\Videos\icloud-review\2021-01-01_2026-09-09" [-MinSeconds 6] [-CameraOnly]
#
# Writes <Dir>\sheets\sheet-NNN.jpg (6 x 5 cells, index label top-left) and
# sheet-NNN.json ({ "1": "<file name>", ... }) so a classification result of
# "keep 3, 7, 12" maps straight back to files. -CameraOnly keeps iPhone camera
# originals (IMG_*.MOV/.MP4 and *__<UUID>.MOV) and drops WeChat/download names.
param(
  [Parameter(Mandatory = $true)][string]$Dir,
  [int]$MinSeconds = 6,
  [switch]$CameraOnly,
  [int]$Cols = 6,
  [int]$Rows = 5,
  [int]$CellW = 180,
  [int]$CellH = 300
)
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing
$manifest = Get-Content (Join-Path $Dir "manifest.json") -Raw -Encoding UTF8 | ConvertFrom-Json
$clips = @($manifest | Where-Object { $_.seconds -ge $MinSeconds -and $_.thumb })
if ($CameraOnly) {
  $clips = @($clips | Where-Object { $_.name -match "^IMG_\d+" -or $_.name -match "__[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}\." })
}
$clips = @($clips | Sort-Object date -Descending)
$sheetDir = Join-Path $Dir "sheets"
New-Item -ItemType Directory -Force $sheetDir | Out-Null
Get-ChildItem $sheetDir -File | Remove-Item -Force
$per = $Cols * $Rows
$sheets = [math]::Ceiling($clips.Count / $per)
Write-Host ("{0} clips -> {1} sheets of {2}" -f $clips.Count, $sheets, $per)
$font = New-Object System.Drawing.Font("Arial", 16, [System.Drawing.FontStyle]::Bold)
$labelBg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(230, 0, 0, 0))
$labelFg = [System.Drawing.Brushes]::Yellow
$jpgCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
$encParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 80L)
for ($s = 0; $s -lt $sheets; $s++) {
  $bmp = New-Object System.Drawing.Bitmap ($Cols * $CellW), ($Rows * $CellH)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::FromArgb(24, 24, 24))
  $map = [ordered]@{}
  for ($i = 0; $i -lt $per; $i++) {
    $idx = $s * $per + $i
    if ($idx -ge $clips.Count) { break }
    $r = $clips[$idx]
    $x = ($i % $Cols) * $CellW; $y = [math]::Floor($i / $Cols) * $CellH
    $thumbPath = Join-Path $Dir ($r.thumb -replace "/", "\")
    try {
      $img = [System.Drawing.Image]::FromFile($thumbPath)
      $scale = [math]::Min(($CellW - 4) / $img.Width, ($CellH - 24) / $img.Height)
      $w = [int]($img.Width * $scale); $h = [int]($img.Height * $scale)
      $g.DrawImage($img, $x + [int](($CellW - $w) / 2), $y + 20 + [int](($CellH - 24 - $h) / 2), $w, $h)
      $img.Dispose()
    } catch { }
    $label = "{0}  {1}s" -f ($i + 1), $r.seconds
    $g.FillRectangle($labelBg, $x, $y, $CellW, 20)
    $g.DrawString($label, $font, $labelFg, $x + 3, $y - 1)
    $map[[string]($i + 1)] = $r.name
  }
  $g.Dispose()
  $name = "sheet-{0:D3}" -f ($s + 1)
  $bmp.Save((Join-Path $sheetDir "$name.jpg"), $jpgCodec, $encParams)
  $bmp.Dispose()
  $map | ConvertTo-Json | Set-Content -Encoding UTF8 (Join-Path $sheetDir "$name.json")
}
Write-Host ("wrote {0} sheets to {1}" -f $sheets, $sheetDir)
