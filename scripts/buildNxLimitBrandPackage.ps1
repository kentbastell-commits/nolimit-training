$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$sourceRoot = Join-Path $repoRoot 'branding\Final Winners\NX LIMIT'
$packageRoot = Join-Path $sourceRoot 'NX LIMIT Complete Brand Package'
$zipPath = Join-Path $sourceRoot 'NX LIMIT Complete Brand Package.zip'
$edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'

if (Test-Path -LiteralPath $packageRoot) { Remove-Item -LiteralPath $packageRoot -Recurse -Force }
if (Test-Path -LiteralPath $zipPath) { Remove-Item -LiteralPath $zipPath -Force }

$folders = @(
  '01 Editable Masters',
  '02 Digital\Monogram',
  '02 Digital\Wordmark',
  '03 Clothing\Monogram',
  '03 Clothing\Wordmark',
  '04 Visible Proofs'
)
foreach ($folder in $folders) { New-Item -ItemType Directory -Path (Join-Path $packageRoot $folder) -Force | Out-Null }

$monoProduction = Join-Path $sourceRoot 'NXL Monogram Production'
Copy-Item -LiteralPath (Join-Path $monoProduction '01 Editable Masters\NXL Monogram - Editable Centered - Black.svg') -Destination (Join-Path $packageRoot '01 Editable Masters\NX LIMIT Monogram Master - Black.svg')
Copy-Item -LiteralPath (Join-Path $monoProduction '01 Editable Masters\NXL Monogram - Editable Centered - White.svg') -Destination (Join-Path $packageRoot '01 Editable Masters\NX LIMIT Monogram Master - White.svg')
Copy-Item -LiteralPath (Join-Path $sourceRoot 'Black\NX LIMIT Wordmark 48 - Black.svg') -Destination (Join-Path $packageRoot '01 Editable Masters\NX LIMIT Wordmark Master - Black.svg')
Copy-Item -LiteralPath (Join-Path $sourceRoot 'White\NX LIMIT Wordmark 48 - White.svg') -Destination (Join-Path $packageRoot '01 Editable Masters\NX LIMIT Wordmark Master - White.svg')

Copy-Item -LiteralPath (Join-Path $monoProduction '02 Digital\NXL Monogram - Digital Transparent - Black.svg') -Destination (Join-Path $packageRoot '02 Digital\Monogram\NX LIMIT Monogram - Black Transparent.svg')
Copy-Item -LiteralPath (Join-Path $monoProduction '02 Digital\NXL Monogram - Digital Transparent - White.svg') -Destination (Join-Path $packageRoot '02 Digital\Monogram\NX LIMIT Monogram - White Transparent.svg')
Copy-Item -LiteralPath (Join-Path $monoProduction '02 Digital\NXL Monogram - Digital Transparent - Black 2400px.png') -Destination (Join-Path $packageRoot '02 Digital\Monogram\NX LIMIT Monogram - Black Transparent 2400px.png')
Copy-Item -LiteralPath (Join-Path $monoProduction '02 Digital\NXL Monogram - Digital Transparent - White 2400px.png') -Destination (Join-Path $packageRoot '02 Digital\Monogram\NX LIMIT Monogram - White Transparent 2400px.png')
Copy-Item -LiteralPath (Join-Path $sourceRoot 'Black\NX LIMIT Wordmark 48 - Black.svg') -Destination (Join-Path $packageRoot '02 Digital\Wordmark\NX LIMIT Wordmark - Black Transparent.svg')
Copy-Item -LiteralPath (Join-Path $sourceRoot 'White\NX LIMIT Wordmark 48 - White.svg') -Destination (Join-Path $packageRoot '02 Digital\Wordmark\NX LIMIT Wordmark - White Transparent.svg')
Copy-Item -LiteralPath (Join-Path $sourceRoot 'Black\NX LIMIT Wordmark 48 - Black.png') -Destination (Join-Path $packageRoot '02 Digital\Wordmark\NX LIMIT Wordmark - Black Transparent 3000px.png')
Copy-Item -LiteralPath (Join-Path $sourceRoot 'White\NX LIMIT Wordmark 48 - White.png') -Destination (Join-Path $packageRoot '02 Digital\Wordmark\NX LIMIT Wordmark - White Transparent 3000px.png')

Copy-Item -LiteralPath (Join-Path $monoProduction '04 Clothing\NXL Monogram - Clothing Outlined - Black.svg') -Destination (Join-Path $packageRoot '03 Clothing\Monogram\NX LIMIT Monogram - Clothing - Black.svg')
Copy-Item -LiteralPath (Join-Path $monoProduction '04 Clothing\NXL Monogram - Clothing Outlined - White.svg') -Destination (Join-Path $packageRoot '03 Clothing\Monogram\NX LIMIT Monogram - Clothing - White.svg')
Copy-Item -LiteralPath (Join-Path $monoProduction '04 Clothing\NXL Monogram - Clothing Outlined - Black 4500px.png') -Destination (Join-Path $packageRoot '03 Clothing\Monogram\NX LIMIT Monogram - Clothing - Black 4500px.png')
Copy-Item -LiteralPath (Join-Path $monoProduction '04 Clothing\NXL Monogram - Clothing Outlined - White 4500px.png') -Destination (Join-Path $packageRoot '03 Clothing\Monogram\NX LIMIT Monogram - Clothing - White 4500px.png')
Copy-Item -LiteralPath (Join-Path $sourceRoot 'Black\NX LIMIT Wordmark 48 - Black.svg') -Destination (Join-Path $packageRoot '03 Clothing\Wordmark\NX LIMIT Wordmark - Clothing - Black.svg')
Copy-Item -LiteralPath (Join-Path $sourceRoot 'White\NX LIMIT Wordmark 48 - White.svg') -Destination (Join-Path $packageRoot '03 Clothing\Wordmark\NX LIMIT Wordmark - Clothing - White.svg')
Copy-Item -LiteralPath (Join-Path $sourceRoot 'Black\NX LIMIT Wordmark 48 - Black.png') -Destination (Join-Path $packageRoot '03 Clothing\Wordmark\NX LIMIT Wordmark - Clothing - Black 3000px.png')
Copy-Item -LiteralPath (Join-Path $sourceRoot 'White\NX LIMIT Wordmark 48 - White.png') -Destination (Join-Path $packageRoot '03 Clothing\Wordmark\NX LIMIT Wordmark - Clothing - White 3000px.png')

function New-VisibleProof([string]$source, [string]$destination, [string]$background, [string]$viewBox) {
  $svg = Get-Content -LiteralPath $source -Raw
  $svgStart = $svg.IndexOf('>') + 1
  $parts = $viewBox.Split(' ')
  $rect = "<rect x='$($parts[0])' y='$($parts[1])' width='$($parts[2])' height='$($parts[3])' fill='$background'/><g>"
  $svg = $svg.Insert($svgStart, $rect).Replace('</svg>', '</g></svg>')
  Set-Content -LiteralPath $destination -Value $svg -Encoding utf8
}

$monoWhiteProof = Join-Path $packageRoot '04 Visible Proofs\NX LIMIT Monogram - White on Black Proof.svg'
$wordWhiteProof = Join-Path $packageRoot '04 Visible Proofs\NX LIMIT Wordmark - White on Black Proof.svg'
$monoBlackProof = Join-Path $packageRoot '04 Visible Proofs\NX LIMIT Monogram - Black on White Proof.svg'
$wordBlackProof = Join-Path $packageRoot '04 Visible Proofs\NX LIMIT Wordmark - Black on White Proof.svg'
New-VisibleProof (Join-Path $monoProduction '04 Clothing\NXL Monogram - Clothing Outlined - White.svg') $monoWhiteProof '#111111' '0 0 1125 700'
New-VisibleProof (Join-Path $sourceRoot 'White\NX LIMIT Wordmark 48 - White.svg') $wordWhiteProof '#111111' '70 60 920 150'
New-VisibleProof (Join-Path $monoProduction '04 Clothing\NXL Monogram - Clothing Outlined - Black.svg') $monoBlackProof '#ffffff' '0 0 1125 700'
New-VisibleProof (Join-Path $sourceRoot 'Black\NX LIMIT Wordmark 48 - Black.svg') $wordBlackProof '#ffffff' '70 60 920 150'

if (Test-Path -LiteralPath $edge) {
  $proofs = @(
    @($monoWhiteProof, 'NX LIMIT Monogram - White on Black Proof.png', '1125,700'),
    @($wordWhiteProof, 'NX LIMIT Wordmark - White on Black Proof.png', '920,150'),
    @($monoBlackProof, 'NX LIMIT Monogram - Black on White Proof.png', '1125,700'),
    @($wordBlackProof, 'NX LIMIT Wordmark - Black on White Proof.png', '920,150')
  )
  foreach ($proof in $proofs) {
    $png = Join-Path $packageRoot "04 Visible Proofs\$($proof[1])"
    $uri = ([uri]$proof[0]).AbsoluteUri
    & $edge --headless --disable-gpu --hide-scrollbars --window-size=$($proof[2]) --screenshot=$png $uri | Out-Null
  }
}

$readme = @'
# NX //LIMIT complete brand package

This package contains both approved brand marks: the full NX //LIMIT wordmark and the NXL monogram.

## Clothing vendor files

- Black or light garment: use the **black** SVG from `03 Clothing`.
- Black or dark garment: use the **white** SVG from `03 Clothing`.
- SVG is the preferred production file: artwork is vector, monochrome and contains no live fonts or linked images.
- High-resolution transparent PNG files are included for vendors that cannot accept SVG.
- Always tell the vendor the final physical width and request a production proof before the full run.

## Why a white logo may look blank

White production files have a transparent background and can appear empty in viewers that use a white canvas. The artwork is present. Open the matching black-background PNG in `04 Visible Proofs` to verify it visually. Do not send the proof PNG as the print master; send the transparent SVG from `03 Clothing`.

## Folder guide

- `01 Editable Masters`: approved black and white vector masters.
- `02 Digital`: transparent SVG and PNG exports for websites, documents and social use.
- `03 Clothing`: printer-ready black and white assets for both marks.
- `04 Visible Proofs`: contrast-backed previews showing exactly what each mark looks like.

Do not stretch, rotate, recolor, add outlines or change the spacing/cut geometry.
'@
Set-Content -LiteralPath (Join-Path $packageRoot 'README.md') -Value $readme -Encoding utf8

Compress-Archive -Path (Join-Path $packageRoot '*') -DestinationPath $zipPath -CompressionLevel Optimal
Write-Output $zipPath
