param(
  [switch]$ForceFrames
)

$ErrorActionPreference = 'Stop'

$footageRoot = 'C:\Users\kentb\Videos\nolimit-footage'
$currentFramesRoot = Join-Path $footageRoot 'audit-9x16-current'
$finalRoot = Join-Path $footageRoot 'reframed-remaining\final'
$reviewRoot = Join-Path $footageRoot 'reframed-remaining\review-final'
$clipsPath = Join-Path $footageRoot 'analysis\clips.json'
$targetIndices = @(0, 5, 6, 7, 12, 17, 18, 19, 21, 23, 24, 26, 29, 34, 41, 44, 46, 49, 50, 53, 54, 55, 58, 59, 60, 65, 66, 67, 68, 69, 70, 73, 74, 78, 79, 80, 83, 84, 85, 93)
$fractions = @(0.15, 0.38, 0.62, 0.85)

function Get-CanonicalOutputBase([string]$File) {
  $sourceBase = [System.IO.Path]::GetFileNameWithoutExtension($File)
  switch ($sourceBase) {
    'Cable Tricep Extension Lateral Bias__0154' { return 'DB Rear Foot Elevated Split Squat__0154' }
    'DB Rear Foot Elevated Split Squat__0196' { return 'Cable Tricep Extension Lateral Bias__0196' }
    default { return $sourceBase }
  }
}

New-Item -ItemType Directory -Force -Path $reviewRoot | Out-Null
$clips = Get-Content -Raw -LiteralPath $clipsPath | ConvertFrom-Json

$rows = @()
foreach ($index in $targetIndices) {
  $clip = $clips | Where-Object { $_.index -eq $index } | Select-Object -First 1
  if (-not $clip) {
    throw "Missing clip metadata for index $index"
  }

  $baseName = Get-CanonicalOutputBase $clip.clip
  $finalVideo = Join-Path $finalRoot ($baseName + '_9x16_REFRAMED.mp4')
  if (-not (Test-Path -LiteralPath $finalVideo)) {
    throw "Missing reframed video: $finalVideo"
  }

  $inputs = @()
  for ($j = 0; $j -lt 4; $j++) {
    $before = Join-Path $currentFramesRoot ("{0:D2}_{1}.png" -f $index, $j)
    $after = Join-Path $reviewRoot ("{0:D2}_after_{1}.jpg" -f $index, $j)
    if ($ForceFrames -or -not (Test-Path -LiteralPath $after)) {
      $time = [double]$clip.duration * $fractions[$j]
      & ffmpeg -y -hide_banner -loglevel error -ss $time -i $finalVideo -frames:v 1 -vf 'scale=270:480' $after
      if ($LASTEXITCODE -ne 0) {
        throw "Could not extract review frame for index $index at $time seconds"
      }
    }
    $inputs += '-i', $before, '-i', $after
  }

  $row = Join-Path $reviewRoot ("{0:D2}_comparison-row.jpg" -f $index)
  & ffmpeg -y -hide_banner -loglevel error @inputs -filter_complex 'hstack=inputs=8,scale=1080:240' -frames:v 1 $row
  if ($LASTEXITCODE -ne 0) {
    throw "Could not build comparison row for index $index"
  }
  $rows += $row
}

for ($sheetIndex = 0; $sheetIndex * 5 -lt $rows.Count; $sheetIndex++) {
  $start = $sheetIndex * 5
  $group = @($rows | Select-Object -Skip $start -First 5)
  $sheetInputs = @()
  foreach ($row in $group) {
    $sheetInputs += '-i', $row
  }
  $sheet = Join-Path $reviewRoot ("comparison-sheet-{0:D2}.jpg" -f $sheetIndex)
  if ($group.Count -eq 1) {
    Copy-Item -LiteralPath $group[0] -Destination $sheet -Force
    continue
  }
  & ffmpeg -y -hide_banner -loglevel error @sheetInputs -filter_complex ("vstack=inputs={0}" -f $group.Count) -frames:v 1 $sheet
  if ($LASTEXITCODE -ne 0) {
    throw "Could not build comparison sheet $sheetIndex"
  }
}

Write-Host "Comparison sheets written to $reviewRoot"
