param([string]$AppPath)
$ErrorActionPreference = 'Stop'
if (-not $AppPath) {
    $AppPath = Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'Qlik\Sense\Apps\BI_Agent_Investigator.qvf'
}
if (-not (Test-Path -LiteralPath $AppPath -PathType Leaf)) {
    throw 'Application introuvable. Relancer avec -AppPath suivi du chemin du fichier QVF.'
}
$nodeVersion = & node --version
if ($LASTEXITCODE -ne 0 -or [int]($nodeVersion.TrimStart('v').Split('.')[0]) -lt 22) {
    throw 'Node.js 22 ou plus recent est requis.'
}
$configPath = Join-Path $PSScriptRoot 'config.local.json'
@{ appPath = $AppPath; url = 'ws://localhost:4848/app/' } |
    ConvertTo-Json | Set-Content -LiteralPath $configPath -Encoding UTF8
Push-Location $PSScriptRoot
try {
    & npm.cmd ci --ignore-scripts --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw 'Installation npm incomplete.' }
    & node check.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Le test Qlik a echoue. Copier le message affiche.' }
} finally { Pop-Location }
