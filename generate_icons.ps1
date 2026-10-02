# ============================================================
# Generate Android Launcher Icons from Trinetra logo
# ============================================================

Add-Type -AssemblyName System.Drawing

# Path to the source logo image (the uploaded Trinetra logo)
$sourcePath = ".\public\trinetra-icon.jpg"

# Android mipmap icon sizes (in pixels) for each density
$sizes = @{
    "mipmap-mdpi"    = 48
    "mipmap-hdpi"    = 72
    "mipmap-xhdpi"   = 96
    "mipmap-xxhdpi"  = 144
    "mipmap-xxxhdpi" = 192
}

$baseResPath = ".\android\app\src\main\res"

# Load the source image
if (-not (Test-Path $sourcePath)) {
    Write-Error "Source icon not found at: $sourcePath"
    Write-Host "Please make sure trinetra-icon.png is placed in the public folder."
    exit 1
}

$srcImage = [System.Drawing.Image]::FromFile((Resolve-Path $sourcePath).Path)

foreach ($density in $sizes.Keys) {
    $size = $sizes[$density]
    $outDir = Join-Path $baseResPath $density

    # Create directory if not exists
    if (-not (Test-Path $outDir)) {
        New-Item -ItemType Directory -Path $outDir | Out-Null
    }

    # Create resized bitmap
    $bitmap = New-Object System.Drawing.Bitmap($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.DrawImage($srcImage, 0, 0, $size, $size)

    # Save ic_launcher.png, ic_launcher_foreground.png, ic_launcher_round.png
    foreach ($iconName in @("ic_launcher.png", "ic_launcher_foreground.png", "ic_launcher_round.png")) {
        $outPath = Join-Path $outDir $iconName
        $bitmap.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
        Write-Host "  Created: $density\$iconName ($size x $size px)"
    }

    $graphics.Dispose()
    $bitmap.Dispose()
}

$srcImage.Dispose()

Write-Host ""
Write-Host "All Android launcher icons generated successfully!" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Run: npx cap sync android" -ForegroundColor Yellow
Write-Host "  2. Then build the APK from Android Studio, or run:" -ForegroundColor Yellow
Write-Host "     cd android && .\gradlew assembleRelease" -ForegroundColor Yellow
