param(
  [string]$SourcePath,
  [string]$InstallPath = "$env:LOCALAPPDATA\ReadingPlanOptimizer",
  [string]$PythonSpec = "3",
  [switch]$Hot
)

$ErrorActionPreference = 'Stop'
if (-not $SourcePath) { throw "Pass -SourcePath (Windows path to project root)." }
if (-not (Test-Path $SourcePath)) { throw "Source path not found: $SourcePath" }

function Sync-SourceTree {
  param(
    [string]$From,
    [string]$To,
    [array]$ExcludedDirs
  )
  $excludeArgs = $ExcludedDirs | ForEach-Object { @('/XD', "$_") }
  & robocopy $From $To /MIR /NFL /NDL /NJH /NJS /NP /R:2 /W:2 @excludeArgs | Out-Null
  $robocopyExitCode = $LASTEXITCODE
  if ($robocopyExitCode -ge 8) {
    throw "robocopy failed with exit code $robocopyExitCode"
  }
}

function Get-PythonMajorMinor([string]$pythonExe) {
  return (& $pythonExe -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')").Trim()
}

function Get-LauncherMajorMinor([string]$spec) {
  return (& py -$spec -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')").Trim()
}

function Invoke-Pnpm {
  param(
    [string[]]$Arguments
  )

  $pnpmVersion = "10.30.3"

  $pnpmCmd = Get-Command pnpm.cmd -ErrorAction SilentlyContinue
  if ($null -ne $pnpmCmd) {
    & $pnpmCmd.Source @Arguments
    if ($LASTEXITCODE -ne 0) {
      throw "pnpm failed with exit code $LASTEXITCODE"
    }
    return
  }

  $pnpm = Get-Command pnpm -ErrorAction SilentlyContinue
  if ($null -ne $pnpm) {
    & $pnpm.Source @Arguments
    if ($LASTEXITCODE -ne 0) {
      throw "pnpm failed with exit code $LASTEXITCODE"
    }
    return
  }

  $corepackCmd = Get-Command corepack.cmd -ErrorAction SilentlyContinue
  $npmCmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
  if ($null -ne $npmCmd) {
    & $npmCmd.Source exec --yes "pnpm@$pnpmVersion" -- @Arguments
    if ($LASTEXITCODE -ne 0) {
      throw "npm exec pnpm failed with exit code $LASTEXITCODE"
    }
    return
  }

  $npm = Get-Command npm -ErrorAction SilentlyContinue
  if ($null -ne $npm) {
    & $npm.Source exec --yes "pnpm@$pnpmVersion" -- @Arguments
    if ($LASTEXITCODE -ne 0) {
      throw "npm exec pnpm failed with exit code $LASTEXITCODE"
    }
    return
  }

  if ($null -ne $corepackCmd) {
    & $corepackCmd.Source pnpm @Arguments
    if ($LASTEXITCODE -ne 0) {
      throw "corepack pnpm failed with exit code $LASTEXITCODE"
    }
    return
  }

  $corepack = Get-Command corepack -ErrorAction SilentlyContinue
  if ($null -ne $corepack) {
    & $corepack.Source pnpm @Arguments
    if ($LASTEXITCODE -ne 0) {
      throw "corepack pnpm failed with exit code $LASTEXITCODE"
    }
    return
  }

  throw "pnpm was not found. Install pnpm globally or enable Corepack in Windows Node.js."
}

Write-Host "Installing to $InstallPath"
New-Item -ItemType Directory -Force -Path $InstallPath | Out-Null

$exclude = @(
  '.git',
  '.venv',
  '.venv-py311-backup',
  '.tmp-pycompat',
  'node_modules',
  '__pycache__',
  '.pytest_cache',
  'dist',
  'build'
)
Write-Host "Syncing source tree with robocopy..."
Sync-SourceTree -From $SourcePath -To $InstallPath -ExcludedDirs $exclude

$syncJob = $null
if ($Hot) {
  Write-Host "Starting background sync for hot mode..."
  $syncJob = Start-Job -ScriptBlock {
    param($from, $to, $excluded)
    while ($true) {
      $excludeArgs = $excluded | ForEach-Object { @('/XD', "$_") }
      & robocopy $from $to /MIR /NFL /NDL /NJH /NJS /NP /R:1 /W:1 @excludeArgs | Out-Null
      Start-Sleep -Milliseconds 750
    }
  } -ArgumentList @($SourcePath, $InstallPath, $exclude)
}

Push-Location $InstallPath
try {
  $venvPython = ".venv\Scripts\python.exe"
  $targetVersion = Get-LauncherMajorMinor $PythonSpec
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

  # Install all workspace dependencies so shared packages
  # (e.g. packages/contracts) have their own node_modules available.
  Invoke-Pnpm @("install", "-r", "--include-workspace-root", "--ignore-scripts=false")
  Invoke-Pnpm @("-C", "packages/contracts", "run", "build")

  & .\.venv\Scripts\python.exe -m pip install --upgrade pip | Out-Null
  & .\.venv\Scripts\python.exe -m pip install -e . | Out-Null

  Push-Location .\electron
  try {
    $env:PYTHON_BIN = (Resolve-Path ..\.venv\Scripts\python.exe).Path
    $env:UI_SCALE = "1.65"
    if ($Hot) {
      Invoke-Pnpm @("run", "dev")
    } else {
      Invoke-Pnpm @("run", "start")
    }
  } finally {
    Pop-Location
  }
} finally {
  Pop-Location
  if ($null -ne $syncJob) {
    Stop-Job -Job $syncJob | Out-Null
    Remove-Job -Job $syncJob | Out-Null
  }
}
