param(
  [string]$SourcePath,
  [string]$InstallPath = "$env:LOCALAPPDATA\ReadingPlanOptimizer",
  [string]$PythonSpec = "3",
  [int]$PollSeconds = 2
)

$ErrorActionPreference = 'Stop'
if (-not $SourcePath) { throw "Pass -SourcePath (Windows path to project root)." }
if (-not (Test-Path $SourcePath)) { throw "Source path not found: $SourcePath" }
if ($PollSeconds -lt 1) { throw "PollSeconds must be >= 1." }

function Get-PythonMajorMinor([string]$pythonExe) {
  return (& $pythonExe -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')").Trim()
}

function Get-LauncherMajorMinor([string]$spec) {
  return (& py -$spec -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')").Trim()
}

$exclude = @(
  '.git',
  '.venv',
  '.venv-py311-backup',
  '.tmp-pycompat',
  'node_modules',
  '__pycache__',
  '.pytest_cache',
  'dist',
  'build',
  'electron\styles\generated',
  'electron\tokens\dist',
  'electron\dist'
)
$excludeArgs = $exclude | ForEach-Object { @('/XD', "$_") }
$ignoredFileNames = @(
  'tokens.css',
  'dependency_links.txt',
  'entry_points.txt',
  'PKG-INFO',
  'requires.txt',
  'SOURCES.txt',
  'top_level.txt'
)
$excludeFileArgs = $ignoredFileNames | ForEach-Object { @('/XF', "$_") }

function Get-CopiedPaths([string[]]$syncOutput) {
  $paths = @()
  foreach ($line in $syncOutput) {
    $trimmed = $line.Trim()
    if (-not $trimmed) {
      continue
    }

    if ($trimmed -match '^(New File|Newer|Older|Changed|Tweaked)\s+\S+\s+(.+)$') {
      $paths += $matches[2].Trim()
      continue
    }

    if ($trimmed -match '^(New Dir)\s+\S+\s+(.+)$') {
      $paths += "$($matches[2].Trim())\"
      continue
    }
  }
  return $paths
}

function Sync-SourceTree {
  $syncOutput = @(
    & robocopy $SourcePath $InstallPath /MIR /FFT /DST /NJH /NJS /NP /R:2 /W:2 @excludeArgs @excludeFileArgs
  )
  $robocopyExitCode = $LASTEXITCODE
  if ($robocopyExitCode -ge 8) {
    throw "robocopy failed with exit code $robocopyExitCode"
  }
  return [pscustomobject]@{
    ExitCode = $robocopyExitCode
    CopiedPaths = @(Get-CopiedPaths $syncOutput)
  }
}

function Sync-IndicatesSourceChange([int]$robocopyExitCode) {
  $copiedFiles = ($robocopyExitCode -band 1) -ne 0
  return $copiedFiles
}

function Get-MeaningfulCopiedPaths([string[]]$paths) {
  $meaningful = @()
  foreach ($path in $paths) {
    $normalized = [string]$path
    $normalized = $normalized.Trim()
    if (-not $normalized) {
      continue
    }
    if ($normalized -like '*.egg-info*') {
      continue
    }
    $fileName = [System.IO.Path]::GetFileName($normalized.TrimEnd('\'))
    if ($ignoredFileNames -contains $fileName) {
      continue
    }
    $meaningful += $normalized
  }
  return $meaningful
}

function Write-ChangedPaths([string[]]$paths) {
  if (-not $paths -or $paths.Count -eq 0) {
    return
  }

  $limit = 30
  Write-Host "Files synced from source:"
  $paths | Select-Object -First $limit | ForEach-Object {
    Write-Host "  - $_"
  }
  if ($paths.Count -gt $limit) {
    Write-Host "  ... and $($paths.Count - $limit) more"
  }
}

function Ensure-Venv([string]$targetVersion) {
  $venvPython = ".venv\Scripts\python.exe"
  $needsCreate = -not (Test-Path $venvPython)

  if (-not $needsCreate) {
    $currentVersion = Get-PythonMajorMinor $venvPython
    if ($currentVersion -ne $targetVersion) {
      Write-Host "Recreating .venv: current Python $currentVersion, requested $targetVersion"
      Remove-Item -Recurse -Force ".venv"
      $needsCreate = $true
    }
  }

  if ($needsCreate) {
    Write-Host "Creating .venv with py -$PythonSpec"
    & py -$PythonSpec -m venv .venv
  }
}

function Install-PythonDeps {
  & .\.venv\Scripts\python.exe -m pip install --upgrade pip | Out-Null
  & .\.venv\Scripts\python.exe -m pip install -e . | Out-Null
}

function Ensure-ElectronDeps {
  Push-Location .\electron
  npm install --include=dev
  Pop-Location
}

function Build-Electron {
  Push-Location .\electron
  npm run build
  Pop-Location
}

function Start-ElectronProcess {
  $electronCommand = (Resolve-Path ".\electron\node_modules\electron\dist\electron.exe").Path
  $electronWorkingDir = (Resolve-Path ".\electron").Path
  return Start-Process -FilePath $electronCommand -ArgumentList "." -WorkingDirectory $electronWorkingDir -PassThru
}

function Stop-ElectronProcess([System.Diagnostics.Process]$process) {
  if (-not $process) {
    return
  }
  if ($process.HasExited) {
    return
  }
  $process.Kill()
  $process.WaitForExit()
}

Write-Host "Installing to $InstallPath"
New-Item -ItemType Directory -Force -Path $InstallPath | Out-Null

Write-Host "Syncing source tree with robocopy..."
$null = Sync-SourceTree

Push-Location $InstallPath
$targetVersion = Get-LauncherMajorMinor $PythonSpec
Ensure-Venv $targetVersion
Install-PythonDeps
Ensure-ElectronDeps

Write-Host "Building Electron app..."
Build-Electron

$env:PYTHON_BIN = (Resolve-Path .\.venv\Scripts\python.exe).Path
$env:UI_SCALE = "1.65"

$electronProcess = Start-ElectronProcess
$lastIgnoredSignature = ''
Write-Host "Electron started (PID $($electronProcess.Id)). Polling every $PollSeconds second(s)."

try {
  while ($true) {
    Start-Sleep -Seconds $PollSeconds
    $syncResult = Sync-SourceTree
    $meaningfulPaths = @(Get-MeaningfulCopiedPaths $syncResult.CopiedPaths)

    if (Sync-IndicatesSourceChange $syncResult.ExitCode -and $meaningfulPaths.Count -gt 0) {
      Write-Host "Changes detected. Rebuilding and restarting Electron..."
      Write-ChangedPaths $meaningfulPaths
      try {
        Build-Electron
        Stop-ElectronProcess $electronProcess
        $electronProcess = Start-ElectronProcess
        Write-Host "Electron restarted (PID $($electronProcess.Id))."
      } catch {
        Write-Warning "Rebuild/restart failed: $($_.Exception.Message)"
      }
      continue
    }

    if (Sync-IndicatesSourceChange $syncResult.ExitCode -and $syncResult.CopiedPaths.Count -gt 0) {
      $signature = ($syncResult.CopiedPaths | Sort-Object) -join '|'
      if ($signature -ne $lastIgnoredSignature) {
        Write-Host "Ignoring generated sync changes (no restart):"
        Write-ChangedPaths $syncResult.CopiedPaths
        $lastIgnoredSignature = $signature
      }
      continue
    }

    $lastIgnoredSignature = ''

    if ($electronProcess.HasExited) {
      Write-Host "Electron exited; restarting..."
      $electronProcess = Start-ElectronProcess
      Write-Host "Electron restarted (PID $($electronProcess.Id))."
    }
  }
} finally {
  Stop-ElectronProcess $electronProcess
  Pop-Location
}
