$ErrorActionPreference = "Stop"
$buildDirectory = Join-Path ([System.IO.Path]::GetTempPath()) "SAP-Interview-Practice-$([guid]::NewGuid().ToString('N'))"
$installerName = "SAP-Interview-Practice-Setup-1.0.0.exe"

try {
    Push-Location -LiteralPath $PSScriptRoot
    & npx electron-builder --win nsis "--config.directories.output=$buildDirectory"
    $buildExitCode = $LASTEXITCODE
    if ($buildExitCode -ne 0) {
        throw "Windows installer build failed with exit code $buildExitCode."
    }

    $builtInstaller = Join-Path $buildDirectory $installerName
    if (-not (Test-Path -LiteralPath $builtInstaller)) {
        throw "The build completed without creating $installerName."
    }

    $downloadDirectory = Join-Path $PSScriptRoot "dist"
    New-Item -ItemType Directory -Path $downloadDirectory -Force | Out-Null
    Copy-Item -LiteralPath $builtInstaller -Destination (Join-Path $downloadDirectory $installerName) -Force
    Write-Host "Windows installer created: $(Join-Path $downloadDirectory $installerName)"
} finally {
    Pop-Location
    if (Test-Path -LiteralPath $buildDirectory) {
        Remove-Item -LiteralPath $buildDirectory -Recurse -Force
    }
}
