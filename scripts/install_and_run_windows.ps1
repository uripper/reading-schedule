param(
  [string]$SourcePath,
  [string]$InstallPath = "$env:LOCALAPPDATA\ReadingPlanOptimizer",
  [switch]$Hot
)

$ErrorActionPreference = 'Stop'
if (-not $SourcePath) { throw "Pass -SourcePath (Windows path to project root)." }
if (-not (Test-Path $SourcePath)) { throw "Source path not found: $SourcePath" }

function Write-Step {
  param(
    [string]$Message
  )
  $timestamp = Get-Date -Format 'HH:mm:ss.fff'
  Write-Host "[$timestamp] $Message"
}

function Format-Duration {
  param(
    [timespan]$Duration
  )
  return '{0:mm\:ss\.fff}' -f $Duration
}

function Invoke-TimedStep {
  param(
    [string]$Name,
    [scriptblock]$Action
  )
  Write-Step "$Name started."
  $startedAt = Get-Date
  try {
    & $Action
  } finally {
    $elapsed = Format-Duration ((Get-Date) - $startedAt)
    Write-Step "$Name finished after $elapsed."
  }
}

function Sync-SourceTree {
  param(
    [string]$From,
    [string]$To,
    [array]$ExcludedDirs
  )
  $excludeArgs = $ExcludedDirs | ForEach-Object { @('/XD', "$_") }
  Write-Step "robocopy from $From"
  Write-Step "robocopy to $To"
  Write-Step "robocopy excluded dirs: $($ExcludedDirs -join ', ')"
  & robocopy $From $To /MIR /MT:16 /BYTES /ETA /R:2 /W:2 @excludeArgs
  $robocopyExitCode = $LASTEXITCODE
  Write-Step "robocopy exit code $robocopyExitCode."
  if ($robocopyExitCode -ge 8) {
    throw "robocopy failed with exit code $robocopyExitCode"
  }
}

function Invoke-Pnpm {
  param(
    [string[]]$Arguments
  )

  $pnpmVersion = "10.30.3"

  $pnpmCmd = Get-Command pnpm.cmd -ErrorAction SilentlyContinue
  if ($null -ne $pnpmCmd) {
    Write-Step "Running pnpm.cmd $($Arguments -join ' ')"
    & $pnpmCmd.Source @Arguments
    if ($LASTEXITCODE -ne 0) {
      throw "pnpm failed with exit code $LASTEXITCODE"
    }
    return
  }

  $pnpm = Get-Command pnpm -ErrorAction SilentlyContinue
  if ($null -ne $pnpm) {
    Write-Step "Running pnpm $($Arguments -join ' ')"
    & $pnpm.Source @Arguments
    if ($LASTEXITCODE -ne 0) {
      throw "pnpm failed with exit code $LASTEXITCODE"
    }
    return
  }

  $corepackCmd = Get-Command corepack.cmd -ErrorAction SilentlyContinue
  $npmCmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
  if ($null -ne $npmCmd) {
    Write-Step "Running npm.cmd exec pnpm@$pnpmVersion $($Arguments -join ' ')"
    & $npmCmd.Source exec --yes "pnpm@$pnpmVersion" -- @Arguments
    if ($LASTEXITCODE -ne 0) {
      throw "npm exec pnpm failed with exit code $LASTEXITCODE"
    }
    return
  }

  $npm = Get-Command npm -ErrorAction SilentlyContinue
  if ($null -ne $npm) {
    Write-Step "Running npm exec pnpm@$pnpmVersion $($Arguments -join ' ')"
    & $npm.Source exec --yes "pnpm@$pnpmVersion" -- @Arguments
    if ($LASTEXITCODE -ne 0) {
      throw "npm exec pnpm failed with exit code $LASTEXITCODE"
    }
    return
  }

  if ($null -ne $corepackCmd) {
    Write-Step "Running corepack.cmd pnpm $($Arguments -join ' ')"
    & $corepackCmd.Source pnpm @Arguments
    if ($LASTEXITCODE -ne 0) {
      throw "corepack pnpm failed with exit code $LASTEXITCODE"
    }
    return
  }

  $corepack = Get-Command corepack -ErrorAction SilentlyContinue
  if ($null -ne $corepack) {
    Write-Step "Running corepack pnpm $($Arguments -join ' ')"
    & $corepack.Source pnpm @Arguments
    if ($LASTEXITCODE -ne 0) {
      throw "corepack pnpm failed with exit code $LASTEXITCODE"
    }
    return
  }

  throw "pnpm was not found. Install pnpm globally or enable Corepack in Windows Node.js."
}

function Test-RequiredPath {
  param(
    [string]$Path,
    [string]$Label
  )
  if (Test-Path $Path) {
    Write-Step "Found $Label at $Path"
    return $true
  }
  Write-Step "Missing $Label at $Path"
  return $false
}

function Test-DevToolchain {
  param(
    [string]$Root
  )
  $checks = @(
    @{
      Label = 'TypeScript compiler package'
      Path = Join-Path $Root 'node_modules\typescript\bin\tsc'
    },
    @{
      Label = 'Bartleby Vite command'
      Path = Join-Path $Root 'apps\bartleby\node_modules\.bin\vite.cmd'
    },
    @{
      Label = 'Bartleby Tauri command'
      Path = Join-Path $Root 'apps\bartleby\node_modules\.bin\tauri.cmd'
    },
    @{
      Label = 'frontend token builder dependencies'
      Path = Join-Path $Root 'packages\frontend\node_modules\flatpickr'
    }
  )
  $allFound = $true
  foreach ($check in $checks) {
    $found = Test-RequiredPath -Path $check.Path -Label $check.Label
    if (-not $found) {
      $allFound = $false
    }
  }
  return $allFound
}

function Install-WorkspaceDependencies {
  param(
    [string]$Root
  )
  Invoke-Pnpm @(
    "install",
    "-r",
    "--include-workspace-root",
    "--ignore-scripts=false",
    "--prod=false"
  )
  if (Test-DevToolchain -Root $Root) {
    return
  }
  Write-Step "Dependency install left required dev tools missing; retrying with --force."
  Invoke-Pnpm @(
    "install",
    "-r",
    "--include-workspace-root",
    "--ignore-scripts=false",
    "--prod=false",
    "--force"
  )
  if (-not (Test-DevToolchain -Root $Root)) {
    throw "Dependency install completed, but required Windows dev tools are still missing."
  }
}

Write-Step "PowerShell $($PSVersionTable.PSVersion) on $env:COMPUTERNAME"
Write-Step "Source path: $SourcePath"
Write-Step "Installing to $InstallPath"
New-Item -ItemType Directory -Force -Path $InstallPath | Out-Null

$exclude = @(
  '.git',
  '.tmp-pycompat',
  '.venv',
  'node_modules',
  'dist',
  'build',
  'target'
)
Invoke-TimedStep "Initial source sync" {
  Sync-SourceTree -From $SourcePath -To $InstallPath -ExcludedDirs $exclude
}

$syncJob = $null
if ($Hot) {
  Write-Step "Starting background sync for hot mode."
  $syncJob = Start-Job -ScriptBlock {
    param($from, $to, $excluded)
    function Write-Step {
      param([string]$Message)
      $timestamp = Get-Date -Format 'HH:mm:ss.fff'
      Write-Host "[$timestamp] [hot-sync] $Message"
    }
    while ($true) {
      $excludeArgs = $excluded | ForEach-Object { @('/XD', "$_") }
      & robocopy $from $to /MIR /MT:8 /NFL /NDL /NJH /NJS /NP /R:1 /W:1 @excludeArgs | Out-Null
      Write-Step "robocopy exit code $LASTEXITCODE"
      Start-Sleep -Milliseconds 750
    }
  } -ArgumentList @($SourcePath, $InstallPath, $exclude)
}

Push-Location $InstallPath
try {
  # Install all workspace dependencies so shared packages
  # (e.g. packages/contracts) have their own node_modules available.
  Invoke-TimedStep "Dependency install" {
    Install-WorkspaceDependencies -Root $InstallPath
  }
  Invoke-TimedStep "Desktop dev server" {
    Invoke-Pnpm @("run", "dev:desktop")
  }
} finally {
  Pop-Location
  if ($null -ne $syncJob) {
    Write-Step "Stopping background sync job."
    Stop-Job -Job $syncJob | Out-Null
    Remove-Job -Job $syncJob | Out-Null
  }
}
