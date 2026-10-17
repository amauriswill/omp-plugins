# install.ps1 - Instalador de plugins y configuración omp-plugins para OMP
$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Instalando suite omp-plugins para OMP   " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$marketPath = $PSScriptRoot
Write-Host "`n1. Registrando marketplace local ($marketPath)..." -ForegroundColor Yellow
omp plugin marketplace add "$marketPath"

$plugins = @(
    "commit",
    "think-hard",
    "use-smol",
    "token-meter",
    "sub-meter",
    "after",
    "image-preview"
)

Write-Host "`n2. Instalando plugins..." -ForegroundColor Yellow
foreach ($p in $plugins) {
    Write-Host "   -> Instalando ${p}@omp-plugins..." -ForegroundColor Green
    try {
        omp plugin install "${p}@omp-plugins"
    } catch {
        Write-Warning "Fallo al instalar ${p}, intentando enlace directo..."
        omp plugin link "$marketPath\plugins\$p"
    }
}

Write-Host "`n3. Instalando tema visual Alacritty..." -ForegroundColor Yellow
$themesDir = Join-Path $HOME ".omp\agent\themes"
if (-not (Test-Path $themesDir)) {
    New-Item -ItemType Directory -Path $themesDir -Force | Out-Null
}
Copy-Item "$marketPath\themes\alacritty.json" "$themesDir\alacritty.json" -Force
Write-Host "   -> Tema alacritty instalado en $themesDir\alacritty.json" -ForegroundColor Green

Write-Host "`n4. Estado actual de plugins instalados:" -ForegroundColor Yellow
omp plugin list

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "  ¡Plugins y tema instalados con éxito!   " -ForegroundColor Green
Write-Host "  Reinicia omp o ejecuta /reload-plugins  " -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
