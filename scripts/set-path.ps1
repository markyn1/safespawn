# Adiciona ao PATH os caminhos para uvicorn (venv) e FFmpeg.
# Uso: .\scripts\set-path.ps1
# Ou, para definir o caminho do FFmpeg: $env:FFMPEG_PATH = "C:\ffmpeg\bin"; .\scripts\set-path.ps1

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not $ProjectRoot) { $ProjectRoot = (Get-Location).Path }

$VenvScripts = Join-Path $ProjectRoot "venv\Scripts"
$FfmpegPath  = $env:FFMPEG_PATH
if (-not $FfmpegPath) { $FfmpegPath = "C:\ffmpeg\bin" }

$paths = @()
if (Test-Path $VenvScripts) {
    $paths += $VenvScripts
    Write-Host "PATH: adicionado venv (uvicorn): $VenvScripts"
} else {
    Write-Warning "venv\Scripts nao encontrado em: $VenvScripts"
}
if (Test-Path $FfmpegPath) {
    $paths += $FfmpegPath
    Write-Host "PATH: adicionado FFmpeg: $FfmpegPath"
} else {
    Write-Warning "FFmpeg nao encontrado em: $FfmpegPath (defina FFMPEG_PATH se estiver em outro lugar)"
}

if ($paths.Count -gt 0) {
    $env:Path = ($paths + $env:Path) -join [System.IO.Path]::PathSeparator
    Write-Host "PATH atualizado para esta sessao."
}
