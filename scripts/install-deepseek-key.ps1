$ErrorActionPreference = "Stop"

$secureKey = Read-Host "Paste the NEW DeepSeek API key (input is hidden)" -AsSecureString
$keyPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)

try {
    $plainKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($keyPtr)
    if ($plainKey -notmatch '^sk-[A-Za-z0-9_-]{16,}$') {
        throw "That does not look like a DeepSeek API key. Nothing was changed."
    }

    # Send the complete installer over SSH stdin. The key never appears in a
    # process argument, local file, repository, or terminal output.
    $remoteScript = @"
set -eu
export DEEPSEEK_KEY='$plainKey'
python3 <<'PY'
import os
import pathlib
import re

p = pathlib.Path("/opt/nolimit-training/.env")
s = p.read_text()
values = {
    "AI_API_KEY": os.environ["DEEPSEEK_KEY"],
    "AI_BASE_URL": "https://api.deepseek.com",
    "AI_MODEL": "deepseek-chat",
}
for key, value in values.items():
    pattern = rf"(?m)^{re.escape(key)}=.*$"
    if re.search(pattern, s):
        s = re.sub(pattern, f"{key}={value}", s)
    else:
        s = s.rstrip() + f"\n{key}={value}\n"
p.write_text(s)
PY
unset DEEPSEEK_KEY
cd /opt/nolimit-training
pm2 restart nolimit-training nolimit-training-2 >/dev/null
set -a
. ./.env
set +a
status=`$(curl -sS -o /dev/null -w '%{http_code}' -H "Authorization: Bearer `$AI_API_KEY" https://api.deepseek.com/models)
echo "DeepSeek API status: `$status"
echo "nolimit-training: `$(pm2 pid nolimit-training | grep -qv '^0`$' && echo online || echo offline)"
echo "nolimit-training-2: `$(pm2 pid nolimit-training-2 | grep -qv '^0`$' && echo online || echo offline)"
test "`$status" = "200"
"@

    $output = $remoteScript | & ssh nolimit "bash -s"
    $exitCode = $LASTEXITCODE

    if ($output) { Write-Host ($output -join [Environment]::NewLine) }
    if ($exitCode -ne 0) {
        throw "Installation or verification failed."
    }

    Write-Host "DeepSeek is installed and verified. The key was not saved locally." -ForegroundColor Green
}
finally {
    if ($keyPtr -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($keyPtr)
    }
    $plainKey = $null
    $secureKey.Dispose()
}
