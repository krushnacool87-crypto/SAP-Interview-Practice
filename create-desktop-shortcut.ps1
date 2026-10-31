$ErrorActionPreference = "Stop"

$launcher = Join-Path $PSScriptRoot "launch-app.bat"
$desktop = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktop "SAP Interview Practice.lnk"

if (-not (Test-Path -LiteralPath $launcher)) {
    throw "The app launcher was not found: $launcher"
}

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $launcher
$shortcut.WorkingDirectory = $PSScriptRoot
$shortcut.Description = "Start SAP Interview Practice in your browser"
$shortcut.Save()

Write-Host "Desktop shortcut created: $shortcutPath"
