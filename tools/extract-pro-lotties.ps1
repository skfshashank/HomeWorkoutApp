# Extract .lottie files into animations/ folder
# Usage: Run this script, then provide the mapping below
# .lottie files should be in Downloads folder

$mappings = @{
    "jumping-jacks" = "Jumping Jack"
    # Add more as you download from LottieFiles.com:
    # "push-ups" = "Push Ups"
    # "squats" = "Squats"  
    # "burpees" = "Burpees"
    # "crunches" = "Crunches"
    # "plank-hold" = "Plank"
    # "lunges" = "Lunges"
    # "mountain-climbers" = "Mountain Climber"
}

$downloadDir = "$env:USERPROFILE\Downloads"
$animDir = "$PSScriptRoot\..\animations"
$tempDir = "$env:TEMP\lottie-extract-temp"

Add-Type -AssemblyName System.IO.Compression.FileSystem

foreach ($entry in $mappings.GetEnumerator()) {
    $exerciseId = $entry.Key
    $filename = $entry.Value
    $lottieFile = Join-Path $downloadDir "$filename.lottie"
    
    if (Test-Path $lottieFile) {
        if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
        
        $zipCopy = "$env:TEMP\temp-lottie.zip"
        Copy-Item $lottieFile $zipCopy -Force
        [System.IO.Compression.ZipFile]::ExtractToDirectory($zipCopy, $tempDir)
        
        $jsonFile = Get-ChildItem "$tempDir\animations\*.json" -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($jsonFile) {
            Copy-Item $jsonFile.FullName (Join-Path $animDir "$exerciseId.json") -Force
            $size = [math]::Round((Get-Item (Join-Path $animDir "$exerciseId.json")).Length / 1024, 1)
            Write-Host "OK $exerciseId.json ($size KB) from '$filename.lottie'"
        } else {
            Write-Host "SKIP $exerciseId - no JSON found in archive"
        }
        
        Remove-Item $zipCopy -Force -ErrorAction SilentlyContinue
        Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    } else {
        Write-Host "MISS $exerciseId - '$filename.lottie' not in Downloads"
    }
}
