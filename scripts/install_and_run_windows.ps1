param(
  [string]$SourcePath,
  [string]$InstallPath = "$env:LOCALAPPDATA\ReadingPlanOptimizer"
)

$ErrorActionPreference = 'Stop'
if (-not $SourcePath) { throw "Pass -SourcePath (Windows path to project root)." }
if (-not (Test-Path $SourcePath)) { throw "Source path not found: $SourcePath" }

Write-Host "Installing to $InstallPath"
New-Item -ItemType Directory -Force -Path $InstallPath | Out-Null

$exclude = @('.git', '.venv', 'node_modules', '__pycache__', '.pytest_cache', 'dist', 'build')
$excludeArgs = $exclude | ForEach-Object { @('/XD', "$_") }
& robocopy $SourcePath $InstallPath /MIR /NFL /NDL /NJH /NJS /NP @excludeArgs | Out-Null

Push-Location $InstallPath
if (-not (Test-Path ".venv\Scripts\python.exe")) { py -3 -m venv .venv }
& .\.venv\Scripts\python.exe -m pip install --upgrade pip | Out-Null
& .\.venv\Scripts\python.exe -m pip install -e . | Out-Null

Push-Location .\electron
npm install --include=dev
$env:PYTHON_BIN = (Resolve-Path ..\.venv\Scripts\python.exe).Path
$env:UI_SCALE = "1.65"
npm run start
Pop-Location
Pop-Location
