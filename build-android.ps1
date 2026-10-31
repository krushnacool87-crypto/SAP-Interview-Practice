$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$androidProject = Join-Path $projectRoot "android"
$sdkPath = Join-Path $env:LOCALAPPDATA "Android\Sdk"

if (-not $env:ANDROID_HOME -and (Test-Path $sdkPath)) {
    $env:ANDROID_HOME = $sdkPath
}

if (-not $env:ANDROID_HOME -and -not $env:ANDROID_SDK_ROOT) {
    throw "Android SDK not found. Set ANDROID_HOME or ANDROID_SDK_ROOT."
}

$gradleWrapper = Join-Path $androidProject "gradlew.bat"
if (-not (Test-Path $gradleWrapper)) {
    throw "Gradle wrapper not found. Open the android folder in Android Studio or generate the Gradle wrapper first."
}

Push-Location $androidProject
try {
    & $gradleWrapper assembleDebug
    if ($LASTEXITCODE -ne 0) {
        throw "Android APK build failed with exit code $LASTEXITCODE."
    }
} finally {
    Pop-Location
}

$apkPath = Join-Path $androidProject "app\build\outputs\apk\debug\app-debug.apk"
$distPath = Join-Path $projectRoot "dist"
New-Item -ItemType Directory -Force -Path $distPath | Out-Null
Copy-Item $apkPath (Join-Path $distPath "SAP-Interview-Practice.apk") -Force
Write-Output "APK created: $(Join-Path $distPath 'SAP-Interview-Practice.apk')"
