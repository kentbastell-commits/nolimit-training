# iCloud contact sheet - sort through phone videos BEFORE downloading them.
#
# iCloud for Windows keeps the whole Photos library as cloud-only placeholders
# (verified 2026-09-08: 9,273 videos / 1.46 TB, none on disk). The Windows
# shell can still hand us a real frame thumbnail plus duration, resolution and
# capture date for each placeholder WITHOUT hydrating it (the iCloud provider
# supplies them), so we can build a review sheet, tick the actual exercise
# clips, and download only those.
#
#   powershell -ExecutionPolicy Bypass -File scripts/footage/icloud-contact-sheet.ps1 -From 2026-08-01 [-To 2026-09-30] [-MinSeconds 3] [-MaxSeconds 600]
#
# Output (in C:\Users\kentb\Videos\icloud-review\<from>_<to>\):
#   thumbs\<name>.jpg      one frame per video, 320px, no download
#   manifest.json          name, date, duration, width, height, bytes
#   review.html            open it, tick the exercise clips, click "Save selection"
#                          -> selected.txt lands in your Downloads folder; then:
#   node scripts/footage/icloud-fetch-selected.mjs "<path to selected.txt>"
#
# Safe: never reads video bytes, never changes the iCloud folder. Re-runnable:
# existing thumbs are skipped, so a second run only fills gaps.
param(
  [string]$From = (Get-Date).AddDays(-45).ToString("yyyy-MM-dd"),
  [string]$To = (Get-Date).AddDays(1).ToString("yyyy-MM-dd"),
  [int]$MinSeconds = 2,
  [int]$MaxSeconds = 900,
  [switch]$CameraOnly,   # iPhone camera originals only: IMG_*.MOV/.MP4 and *__<UUID>.MOV (skips WeChat/downloads)
  [string]$Root = "C:\Users\kentb\iCloudPhotos\Photos",
  [string]$OutRoot = "C:\Users\kentb\Videos\icloud-review"
)
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [Text.Encoding]::UTF8

$code = @'
using System; using System.Runtime.InteropServices; using System.Drawing; using System.Drawing.Imaging;
public static class ShellThumb {
  [ComImport, Guid("bcc18b79-ba16-442f-80c4-8a59c30c463b"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IShellItemImageFactory { [PreserveSig] int GetImage([In, MarshalAs(UnmanagedType.Struct)] SIZE size, [In] int flags, out IntPtr phbm); }
  [StructLayout(LayoutKind.Sequential)] struct SIZE { public int cx; public int cy; public SIZE(int x, int y){cx=x;cy=y;} }
  [DllImport("shell32.dll", CharSet = CharSet.Unicode, PreserveSig = false)]
  static extern void SHCreateItemFromParsingName([In] string path, IntPtr pbc, [In] ref Guid riid, [Out, MarshalAs(UnmanagedType.Interface)] out IShellItemImageFactory factory);
  [DllImport("gdi32.dll")] static extern bool DeleteObject(IntPtr h);
  // flags: 0x08 = THUMBNAILONLY (never fall back to a generic icon)
  public static string Get(string path, string outJpg, int px) {
    var iid = new Guid("bcc18b79-ba16-442f-80c4-8a59c30c463b"); IShellItemImageFactory f;
    SHCreateItemFromParsingName(path, IntPtr.Zero, ref iid, out f);
    IntPtr h; int hr = f.GetImage(new SIZE(px, px), 0x08, out h);
    if (hr != 0) return "hr=0x" + hr.ToString("X8");
    try {
      using (var bmp = Image.FromHbitmap(h)) {
        var enc = ImageCodecInfo.GetImageEncoders(); ImageCodecInfo jpg = null;
        foreach (var e in enc) if (e.MimeType == "image/jpeg") jpg = e;
        var p = new EncoderParameters(1); p.Param[0] = new EncoderParameter(Encoder.Quality, 82L);
        bmp.Save(outJpg, jpg, p);
      }
    } finally { DeleteObject(h); }
    return "ok";
  }
}
'@
if (-not ("ShellThumb" -as [type])) { Add-Type -TypeDefinition $code -ReferencedAssemblies System.Drawing }

$fromDate = [datetime]::ParseExact($From, "yyyy-MM-dd", $null)
$toDate = [datetime]::ParseExact($To, "yyyy-MM-dd", $null).AddDays(1)
$outDir = Join-Path $OutRoot "$From`_$To"
$thumbDir = Join-Path $outDir "thumbs"
New-Item -ItemType Directory -Force $thumbDir | Out-Null

$shell = New-Object -ComObject Shell.Application
$folder = $shell.Namespace($Root)
$col = @{}
for ($i = 0; $i -lt 400; $i++) { $n = $folder.GetDetailsOf($null, $i); if ($n -and -not $col.ContainsKey($n)) { $col[$n] = $i } }
foreach ($need in @("Length", "Frame width", "Frame height")) {
  if (-not $col.ContainsKey($need)) { throw "Shell column '$need' not found - Windows locale changed? Columns: $($col.Keys -join ', ')" }
}

$files = Get-ChildItem $Root -File | Where-Object {
  $_.Extension -match "^\.(mov|mp4|m4v)$" -and $_.LastWriteTime -ge $fromDate -and $_.LastWriteTime -lt $toDate
} | Sort-Object LastWriteTime
if ($CameraOnly) {
  $files = @($files | Where-Object { $_.Name -match "^IMG_\d+" -or $_.Name -match "__[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}\." })
}
Write-Host ("{0} videos between {1} and {2}" -f $files.Count, $From, $To)

$rows = New-Object System.Collections.Generic.List[object]
$done = 0; $skipped = 0; $noThumb = 0
foreach ($f in $files) {
  $done++
  $item = $folder.ParseName($f.Name)
  $len = $folder.GetDetailsOf($item, $col["Length"])   # "00:01:12"
  $secs = 0
  if ($len -match "^(\d+):(\d+):(\d+)$") { $secs = [int]$Matches[1] * 3600 + [int]$Matches[2] * 60 + [int]$Matches[3] }
  if ($secs -lt $MinSeconds -or $secs -gt $MaxSeconds) { $skipped++; continue }
  $w = [int]($folder.GetDetailsOf($item, $col["Frame width"]) -replace "[^\d]", "")
  $h = [int]($folder.GetDetailsOf($item, $col["Frame height"]) -replace "[^\d]", "")
  $thumb = Join-Path $thumbDir ($f.BaseName + ".jpg")
  if (-not (Test-Path $thumb)) {
    $r = [ShellThumb]::Get($f.FullName, $thumb, 320)
    if ($r -ne "ok") { $noThumb++ }
  }
  $rows.Add([ordered]@{
    name = $f.Name
    date = $f.LastWriteTime.ToString("yyyy-MM-dd HH:mm")
    seconds = $secs
    width = $w
    height = $h
    bytes = $f.Length
    thumb = if (Test-Path $thumb) { "thumbs/" + $f.BaseName + ".jpg" } else { "" }
  })
  if ($done % 50 -eq 0) { Write-Host ("  {0}/{1}  ({2} outside {3}-{4}s, {5} without thumbnail)" -f $done, $files.Count, $skipped, $MinSeconds, $MaxSeconds, $noThumb) }
}
$rows | ConvertTo-Json -Depth 3 | Set-Content -Encoding UTF8 (Join-Path $outDir "manifest.json")

# --- review.html: plain, local, no network. Ticks persist in localStorage. ---
$json = ($rows | ConvertTo-Json -Depth 3 -Compress)
if ($rows.Count -eq 1) { $json = "[$json]" }
$html = @"
<!doctype html><html><head><meta charset="utf-8"><title>iCloud review $From to $To</title>
<style>
body{margin:0;font:14px system-ui,sans-serif;background:#111;color:#eee}
header{position:sticky;top:0;background:#1b1b1b;padding:10px 16px;display:flex;gap:14px;align-items:center;flex-wrap:wrap;border-bottom:1px solid #333;z-index:2}
header b{font-size:16px}
button{padding:7px 12px;border:0;border-radius:6px;background:#c9a84c;color:#111;font-weight:700;cursor:pointer}
button.quiet{background:#333;color:#eee}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px;padding:12px}
.card{position:relative;background:#1e1e1e;border:2px solid transparent;border-radius:8px;overflow:hidden;cursor:pointer;user-select:none}
.card img{display:block;width:100%;aspect-ratio:9/16;object-fit:cover;background:#000}
.card.wide img{aspect-ratio:16/9}
.card.on{border-color:#c9a84c}
.card.on::after{content:"\2713";position:absolute;top:6px;right:6px;width:26px;height:26px;border-radius:50%;background:#c9a84c;color:#111;font-weight:900;display:flex;align-items:center;justify-content:center}
.meta{padding:6px 8px;font-size:12px;color:#bbb;display:flex;justify-content:space-between;gap:6px}
.meta span:first-child{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nothumb{aspect-ratio:9/16;display:flex;align-items:center;justify-content:center;color:#666}
label{display:flex;gap:6px;align-items:center;color:#bbb}
input[type=range]{width:120px}
</style></head><body>
<header>
  <b>$From - $To</b>
  <span id="count"></span>
  <label>Min length <input type="range" id="min" min="0" max="120" value="0"><span id="minv">0s</span></label>
  <label><input type="checkbox" id="portraitOnly"> portrait only</label>
  <button class="quiet" id="all">Select all shown</button>
  <button class="quiet" id="none">Clear</button>
  <button id="save">Save selection</button>
  <span id="hint" style="color:#888">click a thumbnail to tick it; ticks are remembered in this browser</span>
</header>
<div class="grid" id="grid"></div>
<script>
const rows = $json;
const KEY = "icloud-review:${From}:${To}";
let picked = new Set(JSON.parse(localStorage.getItem(KEY) || "[]"));
const grid = document.getElementById("grid");
const fmt = s => s >= 60 ? Math.floor(s/60) + "m" + String(s%60).padStart(2,"0") + "s" : s + "s";
function visible(r){ const min = +document.getElementById("min").value; if (r.seconds < min) return false; if (document.getElementById("portraitOnly").checked && r.width > r.height) return false; return true; }
function render(){
  grid.innerHTML = "";
  let shown = 0;
  for (const r of rows) {
    if (!visible(r)) continue; shown++;
    const card = document.createElement("div");
    card.className = "card" + (r.width > r.height ? " wide" : "") + (picked.has(r.name) ? " on" : "");
    card.title = r.name;
    card.innerHTML = (r.thumb ? '<img loading="lazy" src="' + r.thumb + '">' : '<div class="nothumb">no thumbnail</div>') +
      '<div class="meta"><span>' + r.date + '</span><span>' + fmt(r.seconds) + ' | ' + (r.bytes/1048576).toFixed(0) + 'MB</span></div>';
    card.onclick = () => { if (picked.has(r.name)) picked.delete(r.name); else picked.add(r.name); localStorage.setItem(KEY, JSON.stringify([...picked])); card.classList.toggle("on"); count(shown); };
    grid.appendChild(card);
  }
  count(shown);
}
function count(shown){ document.getElementById("count").textContent = shown + " shown | " + picked.size + " ticked | " + (rows.filter(r => picked.has(r.name)).reduce((a, r) => a + r.bytes, 0)/1073741824).toFixed(1) + " GB to download"; }
document.getElementById("min").oninput = e => { document.getElementById("minv").textContent = e.target.value + "s"; render(); };
document.getElementById("portraitOnly").onchange = render;
document.getElementById("all").onclick = () => { for (const r of rows) if (visible(r)) picked.add(r.name); localStorage.setItem(KEY, JSON.stringify([...picked])); render(); };
document.getElementById("none").onclick = () => { picked = new Set(); localStorage.setItem(KEY, "[]"); render(); };
document.getElementById("save").onclick = () => {
  const names = rows.filter(r => picked.has(r.name)).map(r => r.name);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([names.join("\n") + "\n"], { type: "text/plain" }));
  a.download = "selected.txt"; a.click();
  document.getElementById("hint").textContent = "selected.txt saved (" + names.length + " files) - now run: node scripts/footage/icloud-fetch-selected.mjs <path-to-selected.txt>";
};
render();
</script></body></html>
"@
$html | Set-Content -Encoding UTF8 (Join-Path $outDir "review.html")
Write-Host ("done: {0} clips on the sheet ({1} outside the length window, {2} without a thumbnail)" -f $rows.Count, $skipped, $noThumb)
Write-Host ("open: " + (Join-Path $outDir "review.html"))
