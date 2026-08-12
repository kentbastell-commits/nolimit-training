# Installs Tencent Cloud COS credentials into .env.local (git-ignored).
# Run:  powershell -ExecutionPolicy Bypass -File scripts\install-cos-key.ps1
# Paste the SecretId and SecretKey when prompted — they are written straight
# to .env.local and never echoed, logged, or committed.
$envFile = Join-Path $PSScriptRoot "..\.env.local"
$secretId = Read-Host "Paste the COS SecretId (starts with AKID)"
$secretKeyPlain = Read-Host "Paste the COS SecretKey" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secretKeyPlain)
$secretKey = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)

if (-not $secretId.StartsWith("AKID") -or $secretKey.Length -lt 20) {
  Write-Host "That doesn't look like a valid key pair - nothing written." -ForegroundColor Red
  exit 1
}

$lines = @()
if (Test-Path $envFile) {
  $lines = Get-Content $envFile | Where-Object { $_ -notmatch "^COS_SECRET_(ID|KEY)=" }
}
$lines += "COS_SECRET_ID=$secretId"
$lines += "COS_SECRET_KEY=$secretKey"
Set-Content -Path $envFile -Value $lines -Encoding utf8
Write-Host "COS credentials installed into .env.local" -ForegroundColor Green
