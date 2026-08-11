# Installs WeChat Pay merchant credentials onto the production server.
# Run this ON KENT'S MACHINE in PowerShell:
#   powershell -ExecutionPolicy Bypass -File scripts\install-wechatpay-creds.ps1
#
# It never prints the private key, and nothing is committed to git — files go
# straight to the server over SSH and land in /opt/nolimit-training/.env plus
# a secrets directory readable only by the app user.

$ErrorActionPreference = "Stop"
$mchId = "1749290194"
$serverAlias = "nolimit-cn"
$serverDir = "/opt/nolimit-training"
$secretsDir = "$serverDir/secrets/wechatpay"

Write-Host ""
Write-Host "WeChat Pay credential installer  (merchant $mchId)" -ForegroundColor Cyan
Write-Host "----------------------------------------------------"

# ---- 1. APIv3 key ----------------------------------------------------------
$reply = Read-Host "Have you already set an APIv3 key in the merchant platform? (y/n)"
if ($reply -match "^[Yy]") {
  $apiV3Key = Read-Host "Paste the 32-character APIv3 key"
} else {
  $chars = ([char[]]"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789")
  $builder = ""
  for ($i = 0; $i -lt 32; $i++) {
    $builder += $chars[(Get-Random -Maximum $chars.Length)]
  }
  $apiV3Key = $builder
  Write-Host ""
  Write-Host "Generated APIv3 key (paste this into: Account Center -> API Security" -ForegroundColor Yellow
  Write-Host "-> Merchant APIv3 key -> Setup):" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "  $apiV3Key" -ForegroundColor Green
  Write-Host ""
  Read-Host "Press Enter AFTER you have saved it in the merchant platform"
}
if ($apiV3Key.Length -ne 32) {
  Write-Host "APIv3 key must be exactly 32 characters (got $($apiV3Key.Length)). Aborting." -ForegroundColor Red
  exit 1
}
if ($apiV3Key -notmatch "^[0-9A-Za-z]{32}$") {
  Write-Host "Use only letters and digits in the APIv3 key (quotes/symbols break the install). Aborting." -ForegroundColor Red
  exit 1
}

# ---- 2. Merchant certificate ----------------------------------------------
$keyPath = Read-Host "Full path to apiclient_key.pem (from the certificate tool)"
if (-not (Test-Path $keyPath)) {
  Write-Host "File not found: $keyPath" -ForegroundColor Red
  exit 1
}
$certSerial = Read-Host "Certificate serial number (shown on the API Security page)"
$certSerial = $certSerial.Trim().ToUpper()
if ($certSerial -notmatch "^[0-9A-F]{8,64}$") {
  Write-Host "That does not look like a certificate serial (hex string). Aborting." -ForegroundColor Red
  exit 1
}

# ---- 3. WeChat Pay public key (callback verification) ----------------------
$pubKeyPath = Read-Host "Full path to the WeChat Pay public key .pem (Enter to skip for now)"
$pubKeyId = ""
if ($pubKeyPath) {
  if (-not (Test-Path $pubKeyPath)) {
    Write-Host "File not found: $pubKeyPath" -ForegroundColor Red
    exit 1
  }
  $pubKeyId = Read-Host "WeChat Pay public key ID (starts with PUB_KEY_ID_)"
}

# ---- 4. Ship to the server -------------------------------------------------
Write-Host ""
Write-Host "Uploading to $serverAlias ..." -ForegroundColor Cyan
ssh $serverAlias "mkdir -p $secretsDir"
scp $keyPath "${serverAlias}:$secretsDir/apiclient_key.pem"
if ($pubKeyPath) {
  scp $pubKeyPath "${serverAlias}:$secretsDir/wechatpay_public_key.pem"
}
ssh $serverAlias "chmod 700 $secretsDir; chmod 600 $secretsDir/*.pem"

# Append env vars, replacing any previous WXPAY_ block so the script is
# re-runnable. The heredoc runs remotely; the key never touches the repo.
$envLines = @(
  "WXPAY_MCH_ID=$mchId",
  "WXPAY_APIV3_KEY=$apiV3Key",
  "WXPAY_CERT_SERIAL=$certSerial",
  "WXPAY_PRIVATE_KEY_PATH=$secretsDir/apiclient_key.pem"
)
if ($pubKeyId) {
  $envLines += "WXPAY_PUBLIC_KEY_PATH=$secretsDir/wechatpay_public_key.pem"
  $envLines += "WXPAY_PUBLIC_KEY_ID=$pubKeyId"
}
$joined = ($envLines -join "`n")
$remote = "cd $serverDir && test -s .env && cp .env .env.bak-wxpay && (grep -v '^WXPAY_' .env > .env.tmp || true) && test -s .env.tmp && mv .env.tmp .env && printf '%s\n' '$joined' >> .env && grep -c '^WXPAY_' .env"
ssh $serverAlias $remote

Write-Host ""
Write-Host "Done. WXPAY_* variables installed on the server." -ForegroundColor Green
Write-Host "NOTE: the app has NOT been restarted and no payment code is live yet -"
Write-Host "tell Claude the credentials are installed and it will take it from there."
