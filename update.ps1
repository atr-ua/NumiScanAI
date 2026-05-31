# GemCoin — скрипт оновлення
$Host.UI.RawUI.WindowTitle = "GemCoin — Оновлення"
$ErrorActionPreference = "SilentlyContinue"

function Write-Header {
    Clear-Host
    Write-Host ""
    Write-Host "  ╔══════════════════════════════════════════╗" -ForegroundColor DarkYellow
    Write-Host "  ║   ATR NumiScan AI — GemCoin  │  Оновлення ║" -ForegroundColor Yellow
    Write-Host "  ╚══════════════════════════════════════════╝" -ForegroundColor DarkYellow
    Write-Host ""
}

function Write-Step { param([string]$t) Write-Host "  ▶ $t" -ForegroundColor Cyan }
function Write-Ok   { param([string]$t) Write-Host "  ✓ $t" -ForegroundColor Green }
function Write-Warn { param([string]$t) Write-Host "  ! $t" -ForegroundColor Yellow }
function Write-Err  { param([string]$t) Write-Host "  ✗ $t" -ForegroundColor Red }

Write-Header

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# ── 1. Перевірка Git ──────────────────────────────────────────────────────────
Write-Step "Перевірка Git..."

$gitOk = $false
try {
    $gitVer = & git --version 2>$null
    if ($gitVer) { Write-Ok $gitVer; $gitOk = $true }
} catch {}

if (-not $gitOk) {
    Write-Err "Git не знайдено."
    Write-Host ""
    Write-Host "  Git необхідний для отримання оновлень." -ForegroundColor White
    Write-Host "  Спробуємо встановити через winget..." -ForegroundColor DarkGray
    Write-Host ""
    try {
        & winget install --id Git.Git -e --source winget --silent
        $gitVer = & git --version 2>$null
        if ($gitVer) { Write-Ok "Git встановлено: $gitVer"; $gitOk = $true }
    } catch {}

    if (-not $gitOk) {
        Write-Err "Не вдалося встановити Git автоматично."
        Write-Host ""
        Write-Host "  Завантажте Git вручну з https://git-scm.com/download/win" -ForegroundColor Gray
        Write-Host "  Після встановлення запустіть цей скрипт знову." -ForegroundColor Gray
        Write-Host ""
        Write-Host "  Відкрити сторінку завантаження? [Y/N]: " -ForegroundColor White -NoNewline
        if ((Read-Host) -match "^[Yy]") { Start-Process "https://git-scm.com/download/win" }
        Read-Host "  Натисніть Enter для виходу" | Out-Null
        exit 1
    }
}

# ── 2. Перевірка git-репозиторію ──────────────────────────────────────────────
Write-Host ""
Write-Step "Перевірка репозиторію..."

$isRepo = (& git rev-parse --is-inside-work-tree 2>$null) -eq "true"
if (-not $isRepo) {
    Write-Err "Ця папка не є git-репозиторієм."
    Write-Host "  Завантажте проект через: git clone https://github.com/atr-ua/CoinBase" -ForegroundColor Gray
    Read-Host "  Натисніть Enter для виходу" | Out-Null
    exit 1
}

$currentBranch = & git rev-parse --abbrev-ref HEAD 2>$null
$currentHash   = & git rev-parse --short HEAD 2>$null
Write-Ok "Гілка: $currentBranch  │  Поточний коміт: $currentHash"

# ── 3. Отримання інформації про оновлення ─────────────────────────────────────
Write-Host ""
Write-Step "Перевірка оновлень на GitHub..."

& git fetch origin 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Warn "Не вдалося підключитися до GitHub. Перевірте інтернет-з'єднання."
    Read-Host "  Натисніть Enter для виходу" | Out-Null
    exit 1
}

$behind = & git rev-list --count HEAD..origin/$currentBranch 2>$null
$ahead  = & git rev-list --count origin/$currentBranch..HEAD 2>$null

if ([int]$behind -eq 0) {
    Write-Ok "У вас вже встановлена остання версія GemCoin!"
    Write-Host ""
    Read-Host "  Натисніть Enter для виходу" | Out-Null
    exit 0
}

Write-Ok "Доступно $behind нових оновлень"

# ── 4. Показати що змінилось ──────────────────────────────────────────────────
Write-Host ""
Write-Host "  Нові зміни:" -ForegroundColor White
$newCommits = & git log HEAD..origin/$currentBranch --oneline --no-merges 2>$null
$newCommits | ForEach-Object { Write-Host "    • $_" -ForegroundColor DarkGray }

Write-Host ""

# ── 5. Підтвердження ──────────────────────────────────────────────────────────
Write-Host "  Встановити оновлення? [Y/N]: " -ForegroundColor Yellow -NoNewline
$confirm = Read-Host
if ($confirm -notmatch "^[Yy]") {
    Write-Warn "Оновлення скасовано."
    Read-Host "  Натисніть Enter для виходу" | Out-Null
    exit 0
}

# ── 6. Збереження локальних змін (safety) ────────────────────────────────────
Write-Host ""
Write-Step "Збереження локальних змін..."

$hasChanges = (& git status --porcelain 2>$null | Where-Object { $_ -notmatch "^\?\?" }).Count -gt 0
if ($hasChanges) {
    & git stash push -m "auto-stash before GemCoin update $(Get-Date -Format 'yyyy-MM-dd HH:mm')" 2>$null
    Write-Ok "Локальні зміни збережено (git stash)"
} else {
    Write-Ok "Локальних змін немає"
}

# ── 7. Оновлення ──────────────────────────────────────────────────────────────
Write-Host ""
Write-Step "Завантаження та застосування оновлень..."

& git pull origin $currentBranch 2>&1 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }

if ($LASTEXITCODE -ne 0) {
    Write-Err "Помилка при оновленні. Спробуйте запустити скрипт знову."
    Read-Host "  Натисніть Enter для виходу" | Out-Null
    exit 1
}

$newHash = & git rev-parse --short HEAD 2>$null
Write-Ok "Оновлено до коміту: $newHash"

# ── 8. Оновлення npm пакетів (якщо package.json змінився) ────────────────────
$pkgChanged = & git diff "$currentHash..$newHash" --name-only 2>$null | Where-Object { $_ -eq "package.json" }
if ($pkgChanged) {
    Write-Host ""
    Write-Step "Оновлення пакетів (npm install)..."
    & npm install --prefer-offline 2>&1 | Out-Null
    Write-Ok "Пакети оновлено"
}

# ── 9. Готово ─────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  ═══════════════════════════════════════════════" -ForegroundColor DarkGreen
Write-Host "  ✓  GemCoin успішно оновлено!" -ForegroundColor Green
Write-Host "  ═══════════════════════════════════════════════" -ForegroundColor DarkGreen
Write-Host ""
Write-Host "  Запустити GemCoin зараз? [Y/N]: " -ForegroundColor Yellow -NoNewline
if ((Read-Host) -match "^[Yy]") {
    Start-Process (Join-Path $scriptDir "start.bat")
}

Write-Host ""
Read-Host "  Натисніть Enter для виходу" | Out-Null
