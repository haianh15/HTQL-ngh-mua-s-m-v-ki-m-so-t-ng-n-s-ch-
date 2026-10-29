$ErrorActionPreference = "Stop"
$repoUrl = 'https://github.com/haianh15/HTQL-ngh-mua-s-m-v-ki-m-so-t-ng-n-s-ch-.git'
$src = Join-Path $PSScriptRoot 'src'
$target = Join-Path $PSScriptRoot '_git_temp'
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Write-Host 'Chua cai Git for Windows. Su dung huong dan GitHub Upload files.' -ForegroundColor Yellow; exit 1 }
if (Test-Path $target) { Write-Host 'Thu muc _git_temp da ton tai. Hay xoa thu muc nay sau khi luu thay doi can thiet, roi chay lai.' -ForegroundColor Yellow; exit 1 }
git clone --branch main --single-branch $repoUrl $target
if ($LASTEXITCODE -ne 0) { throw 'Khong clone duoc repository. Kiem tra quyen truy cap GitHub.' }
Get-ChildItem -Path $src -Recurse -File | ForEach-Object {
    $relative = $_.FullName.Substring($PSScriptRoot.Length+1)
    $dest = Join-Path $target $relative
    New-Item -ItemType Directory -Path (Split-Path $dest -Parent) -Force | Out-Null
    Copy-Item -LiteralPath $_.FullName -Destination $dest -Force
}
Push-Location $target
try {
    git status --short
    git diff --stat
    $answer = Read-Host 'Ban da kiem tra. Day 12 file giao dien len GitHub main? (Y/N)'
    if ($answer -notin @('Y','y')) { Write-Host 'Da huy. Khong push.'; exit 0 }
    git add src
    git diff --cached --quiet
    if ($LASTEXITCODE -eq 0) { Write-Host 'Khong co thay doi nao can cap nhat.'; exit 0 }
    git commit -m 'Polish Procure UI copy and remove demo-only controls'
    if ($LASTEXITCODE -ne 0) { throw 'Khong commit duoc.' }
    git push origin main
    if ($LASTEXITCODE -ne 0) { throw 'Khong push duoc; kiem tra quyen ghi repository.' }
    Write-Host 'Da day len GitHub. Kiem tra Vercel Deployments.' -ForegroundColor Green
} finally { Pop-Location }
