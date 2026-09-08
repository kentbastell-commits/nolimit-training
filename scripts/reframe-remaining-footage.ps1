param(
  [ValidateSet('Render', 'List')]
  [string]$Mode = 'Render',
  [int[]]$Only = @(),
  [switch]$Force
)

$ErrorActionPreference = 'Stop'

$footageRoot = 'C:\Users\kentb\Videos\nolimit-footage'
$sourceRoot = Join-Path $footageRoot '2026-08-08'
$outputRoot = Join-Path $footageRoot 'reframed-remaining\final'

function Get-CanonicalOutputBase([string]$File) {
  $sourceBase = [System.IO.Path]::GetFileNameWithoutExtension($File)
  switch ($sourceBase) {
    'Cable Tricep Extension Lateral Bias__0154' { return 'DB Rear Foot Elevated Split Squat__0154' }
    'DB Rear Foot Elevated Split Squat__0196' { return 'Cable Tricep Extension Lateral Bias__0196' }
    default { return $sourceBase }
  }
}

$recipes = @(
  [pscustomobject]@{ Index = 0;  File = '2 up 1 Down Stability Ball Hamstring Curl__0203.MP4'; Treatment = 'solid'; Scale = 1240; X = 0;    Y = 220; Previous = 'Review' },
  [pscustomobject]@{ Index = 5;  File = 'BB Bench Press Explanation 2__0138.MP4';                Treatment = 'solid'; Scale = 1320; X = 0;    Y = 180; Previous = 'Fail' },
  [pscustomobject]@{ Index = 6;  File = 'BB Bench Press Explanation__0137.MP4';                  Treatment = 'solid'; Scale = 1320; X = 0;    Y = 180; Previous = 'Fail' },
  [pscustomobject]@{ Index = 7;  File = 'BB Bench Press__0136.MP4';                              Treatment = 'solid'; Scale = 1320; X = 0;    Y = 180; Previous = 'Fail' },
  [pscustomobject]@{ Index = 9;  File = 'BB Rear Foot Elevated Split Squat__0156.MP4';          Treatment = 'solid'; Scale = 1240; X = 0;    Y = 220; Previous = 'Correction' },
  [pscustomobject]@{ Index = 10; File = 'BB Reverse Lunge__0148.MP4';                            Treatment = 'solid'; Scale = 1240; X = 0;    Y = 220; Previous = 'Correction' },
  [pscustomobject]@{ Index = 12; File = 'BB Split Squat__0147.MP4';                             Treatment = 'solid'; Scale = 1080; X = 0;    Y = 360; Previous = 'Correction' },
  [pscustomobject]@{ Index = 13; File = 'BB Split Squat Explanation__0149.MP4';                 Treatment = 'solid'; Scale = 1240; X = -60;  Y = 220; Previous = 'Correction' },
  [pscustomobject]@{ Index = 17; File = 'Broad Jump__0181.MP4';                                  Treatment = 'solid'; Scale = 1240; X = 0;    Y = 220; Previous = 'Review' },
  [pscustomobject]@{ Index = 18; File = 'Burpee Broad Jump__0110.MP4';                           Treatment = 'solid'; Scale = 1240; X = 0;    Y = 220; Previous = 'Fail' },
  [pscustomobject]@{ Index = 19; File = 'Cable Cross Tricep Extension__0195.MP4';                Treatment = 'static'; Scale = 0;    X = 1050; Y = 0;   Previous = 'Fail' },
  [pscustomobject]@{ Index = 20; File = 'Cable Tricep Extension Lateral Bias__0154.MP4';         Treatment = 'solid'; Scale = 1240; X = 0;    Y = 220; Previous = 'Correction' },
  [pscustomobject]@{ Index = 21; File = 'Chinups__0179.MP4';                                    Treatment = 'static'; Scale = 0;    X = 650;  Y = 0;   Previous = 'Review' },
  [pscustomobject]@{ Index = 23; File = 'DB Bench Press Explanation 2__0140.MP4';                Treatment = 'solid'; Scale = 1320; X = 0;    Y = 180; Previous = 'Fail' },
  [pscustomobject]@{ Index = 24; File = 'DB Bench Press Explanation__0139.MP4';                  Treatment = 'solid'; Scale = 1320; X = 0;    Y = 180; Previous = 'Fail' },
  [pscustomobject]@{ Index = 26; File = 'DB Continuous Squat Jumps__0192.MP4';                   Treatment = 'static'; Scale = 0;    X = 520;  Y = 0;   Previous = 'Fail' },
  [pscustomobject]@{ Index = 28; File = 'DB Forward Lunge__0152.MP4';                            Treatment = 'solid'; Scale = 1240; X = 0;    Y = 220; Previous = 'Correction' },
  [pscustomobject]@{ Index = 29; File = 'DB Rear Foot Elevated Split Squat__0196.MP4';          Treatment = 'static'; Scale = 0;    X = 900;  Y = 0;   Previous = 'Fail' },
  [pscustomobject]@{ Index = 30; File = 'DB Reverse Lunge__0151.MP4';                            Treatment = 'solid'; Scale = 1240; X = 0;    Y = 220; Previous = 'Correction' },
  [pscustomobject]@{ Index = 34; File = 'DB Squat Jump__0186.MP4';                              Treatment = 'static'; Scale = 0;    X = 800;  Y = 0;   Previous = 'Correction' },
  [pscustomobject]@{ Index = 41; File = 'Farmer Carry__0111.MP4';                                Treatment = 'solid'; Scale = 1240; X = 0;    Y = 220; Previous = 'Fail' },
  [pscustomobject]@{ Index = 44; File = 'Glute Dominant Back Extension__0211.MP4';               Treatment = 'solid'; Scale = 1080; X = 0;    Y = 360; Previous = 'Correction' },
  [pscustomobject]@{ Index = 46; File = 'High Incline DB Bench Press__0142.MP4';                 Treatment = 'solid'; Scale = 1320; X = -110; Y = 180; Previous = 'Correction' },
  [pscustomobject]@{ Index = 49; File = 'KB Side Bend__0185.MP4';                                Treatment = 'static'; Scale = 0;    X = 650;  Y = 0;   Previous = 'Correction' },
  [pscustomobject]@{ Index = 50; File = 'KB Swing Explanation__0172.MP4';                         Treatment = 'static'; Scale = 0;    X = 820;  Y = 0;   Previous = 'Correction' },
  [pscustomobject]@{ Index = 53; File = 'Pullups__0178.MP4';                                    Treatment = 'static'; Scale = 0;    X = 600;  Y = 0;   Previous = 'Fail' },
  [pscustomobject]@{ Index = 54; File = 'Rope Tricep Extension__0198.MP4';                       Treatment = 'static'; Scale = 0;    X = 900;  Y = 0;   Previous = 'Correction' },
  [pscustomobject]@{ Index = 55; File = 'Row Erg Explanation__0117.MP4';                        Treatment = 'solid'; Scale = 1240; X = 0;    Y = 220; Previous = 'Fail' },
  [pscustomobject]@{ Index = 58; File = 'Sandbag Lunges__0104.MP4';                              Treatment = 'solid'; Scale = 1080; X = 0;    Y = 360; Previous = 'Correction' },
  [pscustomobject]@{ Index = 59; File = 'Scap Pullups Rear View__0128.MP4';                       Treatment = 'static'; Scale = 0;    X = 820;  Y = 0;   Previous = 'Correction' },
  [pscustomobject]@{ Index = 60; File = 'Scap Pullups Side View__0129.MP4';                       Treatment = 'static'; Scale = 0;    X = 850;  Y = 0;   Previous = 'Correction' },
  [pscustomobject]@{ Index = 65; File = 'Single Arm DB Row Explanation__0145.MP4';                Treatment = 'solid'; Scale = 1240; X = 0;    Y = 220; Previous = 'Correction' },
  [pscustomobject]@{ Index = 66; File = 'Single Arm DB Row__0146.MP4';                            Treatment = 'solid'; Scale = 1240; X = 0;    Y = 220; Previous = 'Correction' },
  [pscustomobject]@{ Index = 67; File = 'Single Leg Back Extension ISO__0210.MP4';                Treatment = 'solid'; Scale = 1080; X = 0;    Y = 360; Previous = 'Correction' },
  [pscustomobject]@{ Index = 68; File = 'Single Leg Back Extension__0209.MP4';                    Treatment = 'solid'; Scale = 1080; X = 0;    Y = 360; Previous = 'Correction' },
  [pscustomobject]@{ Index = 69; File = 'Single Leg DB Hip Thrust__0217.MP4';                    Treatment = 'solid'; Scale = 1240; X = 0;    Y = 220; Previous = 'Review' },
  [pscustomobject]@{ Index = 70; File = 'Single Leg Squat 1__0173.MP4';                          Treatment = 'static'; Scale = 0;    X = 1100; Y = 0;   Previous = 'Correction' },
  [pscustomobject]@{ Index = 73; File = 'Single Leg Stability Ball Hamstring Curl__0202.MP4';   Treatment = 'solid'; Scale = 1240; X = 0;    Y = 220; Previous = 'Review' },
  [pscustomobject]@{ Index = 74; File = 'Ski Erg Explanation__0114.MP4';                         Treatment = 'trackedSki'; Scale = 0; X = 0;  Y = 0;   Previous = 'Correction' },
  [pscustomobject]@{ Index = 78; File = 'Sled Push Explanation__0120.MP4';                       Treatment = 'solid'; Scale = 1080; X = 0;    Y = 360; Previous = 'Correction' },
  [pscustomobject]@{ Index = 79; File = 'Sled Push__0107.MP4';                                  Treatment = 'tracked'; Scale = 0;    X = 0;    Y = 0;   Previous = 'Fail' },
  [pscustomobject]@{ Index = 80; File = 'Stability Ball Hamstring Curl__0201.MP4';               Treatment = 'solid'; Scale = 1240; X = 0;    Y = 220; Previous = 'Review' },
  [pscustomobject]@{ Index = 83; File = 'Stability Ball Plank Rollouts__0207.MP4';               Treatment = 'solid'; Scale = 1240; X = 0;    Y = 220; Previous = 'Fail' },
  [pscustomobject]@{ Index = 84; File = 'Stability Ball Stir the Pot__0208.MP4';                 Treatment = 'solid'; Scale = 1240; X = 0;    Y = 220; Previous = 'Fail' },
  [pscustomobject]@{ Index = 85; File = 'Stability Ball Toe Touches__0204.MP4';                  Treatment = 'solid'; Scale = 1240; X = 0;    Y = 220; Previous = 'Review' },
  [pscustomobject]@{ Index = 93; File = 'Zombie Squat__0165.MP4';                                Treatment = 'static'; Scale = 0;    X = 700;  Y = 0;   Previous = 'Correction' }
)

if ($Only.Count -gt 0) {
  $recipes = @($recipes | Where-Object { $Only -contains $_.Index })
}

if ($Mode -eq 'List') {
  $recipes | Format-Table Index, Previous, Treatment, File -AutoSize
  exit 0
}

New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null

foreach ($recipe in $recipes) {
  $source = Join-Path $sourceRoot $recipe.File
  if (-not (Test-Path -LiteralPath $source)) {
    throw "Missing source file: $source"
  }

  $baseName = Get-CanonicalOutputBase $recipe.File
  $output = Join-Path $outputRoot ($baseName + '_9x16_REFRAMED.mp4')
  if ((Test-Path -LiteralPath $output) -and -not $Force) {
    Write-Host "Skipping existing output: $output"
    continue
  }

  Write-Host ("Rendering {0:D2} [{1}] {2}" -f $recipe.Index, $recipe.Treatment, $recipe.File)

  $commonOutput = @(
    '-map', '0:a:0?',
    '-c:v', 'h264_nvenc',
    '-preset', 'p5',
    '-tune', 'hq',
    '-b:v', '8M',
    '-maxrate', '12M',
    '-bufsize', '16M',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-color_primaries', 'bt709',
    '-color_trc', 'bt709',
    '-colorspace', 'bt709',
    '-map_metadata', '-1',
    '-write_tmcd', '0',
    '-movflags', '+faststart',
    $output
  )

  if ($recipe.Treatment -eq 'solid') {
    # X is an optional horizontal subject-centering adjustment. Zero retains
    # the centered square; negative values move right-positioned subjects left.
    $left = [int](($recipe.Scale - 1080) / -2) + $recipe.X
    $filter = "[0:v]scale_cuda=$($recipe.Scale):$($recipe.Scale):format=yuv420p,hwdownload,format=yuv420p[fg];color=c=0x111214:s=1080x1920:r=60000/1001[bg];[bg][fg]overlay=x=$left`:y=$($recipe.Y):shortest=1,format=yuv420p[v]"
    $arguments = @(
      '-y', '-hide_banner', '-loglevel', 'warning', '-stats',
      '-hwaccel', 'cuda', '-hwaccel_output_format', 'cuda',
      '-i', $source,
      '-filter_complex', $filter,
      '-map', '[v]'
    ) + $commonOutput
  } elseif ($recipe.Treatment -eq 'trackedSki') {
    # Full-bleed SkiErg explanation: hold the machine-plus-athlete framing,
    # then pan right during the closing explanation so the speaker remains
    # complete without restoring the former black square boundary.
    $filter = "hwdownload,format=p010le,crop=w=1728:h=3072:x='if(lt(t,80),650,if(lt(t,84),650+62.5*(t-80),900))':y=0,scale=1080:1920:flags=lanczos,format=yuv420p"
    $arguments = @(
      '-y', '-hide_banner', '-loglevel', 'warning', '-stats',
      '-hwaccel', 'cuda', '-hwaccel_output_format', 'cuda',
      '-i', $source,
      '-vf', $filter,
      '-map', '0:v:0'
    ) + $commonOutput
  } elseif ($recipe.Treatment -eq 'tracked') {
    # Recovered from the approved 2026-08-17 Sled Push render: hold on the
    # athlete, pan left with the active sled, then hold the finishing frame.
    $filter = "hwdownload,format=p010le,crop=w=1728:h=3072:x='if(lt(t,4),600,if(lt(t,8),600-120*(t-4),120))':y=0,scale=1080:1920:flags=lanczos,format=yuv420p"
    $arguments = @(
      '-y', '-hide_banner', '-loglevel', 'warning', '-stats',
      '-hwaccel', 'cuda', '-hwaccel_output_format', 'cuda',
      '-i', $source,
      '-vf', $filter,
      '-map', '0:v:0'
    ) + $commonOutput
  } else {
    $filter = "hwdownload,format=p010le,crop=1728:3072:$($recipe.X):0,scale=1080:1920:flags=lanczos,format=yuv420p"
    $arguments = @(
      '-y', '-hide_banner', '-loglevel', 'warning', '-stats',
      '-hwaccel', 'cuda', '-hwaccel_output_format', 'cuda',
      '-i', $source,
      '-vf', $filter,
      '-map', '0:v:0'
    ) + $commonOutput
  }

  & ffmpeg @arguments
  if ($LASTEXITCODE -ne 0) {
    throw "ffmpeg failed for $($recipe.File)"
  }
}

Write-Host "Finished. Outputs: $outputRoot"
