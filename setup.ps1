# GemCoin — скрипт встановлення для Windows
# Запускати: правий клік → "Запустити за допомогою PowerShell"
# або через setup.bat

$Host.UI.RawUI.WindowTitle = "GemCoin — Встановлення"
$ErrorActionPreference = "Stop"

function Write-Header {
    Clear-Host
    Write-Host ""
    Write-Host "  ╔══════════════════════════════════════════╗" -ForegroundColor DarkYellow
    Write-Host "  ║        ATR NumiScan AI  —  GemCoin       ║" -ForegroundColor Yellow
    Write-Host "  ║     Нумізматичний каталог з AI-аналізом  ║" -ForegroundColor DarkYellow
    Write-Host "  ╚══════════════════════════════════════════╝" -ForegroundColor DarkYellow
    Write-Host ""
}

function Write-Step { param([string]$text)
    Write-Host "  ▶ $text" -ForegroundColor Cyan
}
function Write-Ok   { param([string]$text)
    Write-Host "  ✓ $text" -ForegroundColor Green
}
function Write-Warn { param([string]$text)
    Write-Host "  ! $text" -ForegroundColor Yellow
}
function Write-Err  { param([string]$text)
    Write-Host "  ✗ $text" -ForegroundColor Red
}

Write-Header

# ── 1. Перевірка Node.js ──────────────────────────────────────────────────────
Write-Step "Перевірка Node.js..."

$nodeOk = $false
try {
    $nodeVer = & node --version 2>$null
    if ($nodeVer -match "v(\d+)") {
        $major = [int]$Matches[1]
        if ($major -ge 18) {
            Write-Ok "Node.js $nodeVer встановлено"
            $nodeOk = $true
        } else {
            Write-Warn "Node.js $nodeVer — застаріла версія (потрібна 18+)"
        }
    }
} catch {}

if (-not $nodeOk) {
    Write-Err "Node.js не знайдено або версія застаріла."
    Write-Host ""
    Write-Host "  Зараз відкриється сторінка завантаження Node.js." -ForegroundColor White
    Write-Host "  Завантажте та встановіть версію LTS, потім запустіть цей скрипт знову." -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Натисніть Enter щоб відкрити nodejs.org..." -ForegroundColor DarkGray
    Read-Host | Out-Null
    Start-Process "https://nodejs.org/en/download"
    exit 1
}

# ── 2. Встановлення залежностей ───────────────────────────────────────────────
Write-Host ""
Write-Step "Встановлення пакетів (npm install)..."
Write-Host "  Це може зайняти 1-3 хвилини при першому запуску." -ForegroundColor DarkGray
Write-Host ""

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

try {
    & npm install --prefer-offline 2>&1 | ForEach-Object {
        if ($_ -match "^(added|updated|audited)") {
            Write-Host "  $_" -ForegroundColor DarkGray
        }
    }
    Write-Ok "Пакети встановлено"
} catch {
    Write-Err "Помилка npm install: $_"
    Write-Host ""
    Write-Host "  Перевірте підключення до інтернету та спробуйте знову." -ForegroundColor Gray
    Read-Host "  Натисніть Enter для виходу" | Out-Null
    exit 1
}

# ── 3. Налаштування .env ──────────────────────────────────────────────────────
Write-Host ""
Write-Step "Налаштування конфігурації..."

$envPath = Join-Path $scriptDir ".env"
$envExists = Test-Path $envPath
$geminiKey = ""
$numistaKey = ""

if ($envExists) {
    $envContent = Get-Content $envPath -Raw
    if ($envContent -match 'GEMINI_API_KEY=(.+)') {
        $geminiKey = $Matches[1].Trim().Trim('"')
    }
    if ($envContent -match 'NUMISTA_API_KEY=(.+)') {
        $numistaKey = $Matches[1].Trim().Trim('"')
    }
}

# Gemini API ключ
if ($geminiKey -and $geminiKey -ne "MY_GEMINI_API_KEY" -and $geminiKey.Length -gt 10) {
    Write-Ok "Gemini API ключ вже налаштовано"
} else {
    Write-Host ""
    Write-Host "  ┌─────────────────────────────────────────────────┐" -ForegroundColor DarkCyan
    Write-Host "  │  Потрібен безкоштовний ключ Google Gemini API   │" -ForegroundColor Cyan
    Write-Host "  │  Отримайте на: https://aistudio.google.com      │" -ForegroundColor Cyan
    Write-Host "  └─────────────────────────────────────────────────┘" -ForegroundColor DarkCyan
    Write-Host ""
    Write-Host "  Відкрити Google AI Studio зараз? [Y/N]: " -ForegroundColor White -NoNewline
    $open = Read-Host
    if ($open -match "^[Yy]") {
        Start-Process "https://aistudio.google.com/apikey"
        Write-Host "  Після отримання ключа поверніться сюди." -ForegroundColor DarkGray
        Write-Host ""
    }
    do {
        Write-Host "  Вставте ваш Gemini API ключ: " -ForegroundColor White -NoNewline
        $geminiKey = Read-Host
        $geminiKey = $geminiKey.Trim().Trim('"')
    } while ($geminiKey.Length -lt 10)
    Write-Ok "Gemini API ключ збережено"
}

# Numista API ключ (необов'язково)
Write-Host ""
if ($numistaKey -and $numistaKey -ne "MY_NUMISTA_API_KEY" -and $numistaKey.Length -gt 5) {
    Write-Ok "Numista API ключ вже налаштовано"
} else {
    Write-Host "  Numista API ключ (необов'язково, для збагачення даних монет)." -ForegroundColor DarkGray
    Write-Host "  Залиште порожнім якщо не маєте: " -ForegroundColor DarkGray -NoNewline
    $numistaKey = Read-Host
    $numistaKey = $numistaKey.Trim().Trim('"')
    if ($numistaKey.Length -gt 5) {
        Write-Ok "Numista API ключ збережено"
    } else {
        $numistaKey = ""
        Write-Warn "Numista ключ пропущено (можна додати пізніше у файлі .env)"
    }
}

# Запис .env
$envText = "GEMINI_API_KEY=$geminiKey"
if ($numistaKey) { $envText += "`nNUMISTA_API_KEY=$numistaKey" }
[System.IO.File]::WriteAllText($envPath, $envText, [System.Text.Encoding]::UTF8)

# ── 4. Ярлик на робочому столі ────────────────────────────────────────────────
Write-Host ""
Write-Step "Створення ярлика на робочому столі..."

try {
    $startBat  = Join-Path $scriptDir "start.bat"
    $iconPath  = Join-Path $scriptDir "public\favicon.ico"
    $desktop   = [Environment]::GetFolderPath("Desktop")
    $shortcut  = Join-Path $desktop "GemCoin.lnk"

    $wsh    = New-Object -ComObject WScript.Shell
    $lnk    = $wsh.CreateShortcut($shortcut)
    $lnk.TargetPath       = $startBat
    $lnk.WorkingDirectory = $scriptDir
    $lnk.Description      = "ATR NumiScan AI — GemCoin"
    if (Test-Path $iconPath) { $lnk.IconLocation = $iconPath }
    $lnk.Save()
    Write-Ok "Ярлик 'GemCoin' створено на робочому столі"
} catch {
    Write-Warn "Не вдалося створити ярлик: $_"
}

# ── 5. Готово ─────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  ═══════════════════════════════════════════════" -ForegroundColor DarkGreen
Write-Host "  ✓  Встановлення завершено успішно!" -ForegroundColor Green
Write-Host "  ═══════════════════════════════════════════════" -ForegroundColor DarkGreen
Write-Host ""
Write-Host "  Щоб запустити GemCoin:" -ForegroundColor White
Write-Host "    • Двічі клікніть ярлик 'GemCoin' на робочому столі" -ForegroundColor Gray
Write-Host "    • Або запустіть файл  start.bat  у цій папці" -ForegroundColor Gray
Write-Host ""
Write-Host "  Запустити зараз? [Y/N]: " -ForegroundColor Yellow -NoNewline
$startNow = Read-Host

if ($startNow -match "^[Yy]") {
    Write-Host ""
    Write-Host "  Запуск сервера..." -ForegroundColor Cyan
    Start-Sleep -Seconds 2
    Start-Process (Join-Path $scriptDir "start.bat")
}

Write-Host ""
Read-Host "  Натисніть Enter для виходу" | Out-Null
