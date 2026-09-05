# ecrire-video-urls-orphea-v5.ps1
# Sélectionne les 100 lignes du rapport V3 ayant SongId + VideoUrlProposee.
# Contrôles stricts avant toute écriture. Modifie uniquement video_url.

$ErrorActionPreference = "Stop"

$reportPath = Join-Path $PSScriptRoot "video-mapping-v3-a-verifier.csv"
$envPath = Join-Path $PSScriptRoot ".env.local"

if (-not (Test-Path -LiteralPath $reportPath)) {
    throw "ERREUR : rapport introuvable : $reportPath"
}
if (-not (Test-Path -LiteralPath $envPath)) {
    throw "ERREUR : .env.local introuvable."
}

# Charger .env.local sans dépendre des accents
foreach ($line in Get-Content -LiteralPath $envPath) {
    if ($line -match '^\s*([^#=\s]+)\s*=\s*(.*)\s*$') {
        $name = $Matches[1]
        $value = $Matches[2].Trim()
        if ($value.Length -ge 2 -and $value.StartsWith('"') -and $value.EndsWith('"')) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
}

$supabaseUrl = $env:SUPABASE_URL
if (-not $supabaseUrl) { $supabaseUrl = $env:NEXT_PUBLIC_SUPABASE_URL }

$supabaseKey = $env:SUPABASE_SERVICE_ROLE_KEY
if (-not $supabaseKey) { $supabaseKey = $env:NEXT_PUBLIC_SUPABASE_ANON_KEY }

if (-not $supabaseUrl) {
    throw "ERREUR : SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_URL absent de .env.local."
}
if (-not $supabaseKey) {
    throw "ERREUR : clé Supabase absente de .env.local."
}

$rows = @(Import-Csv -LiteralPath $reportPath -Encoding UTF8)

# Sélection indépendante de la colonne Correspondance :
# les lignes retenues ont un SongId et une VideoUrlProposee.
$selection = @(
    $rows | Where-Object {
        -not [string]::IsNullOrWhiteSpace($_.SongId) -and
        -not [string]::IsNullOrWhiteSpace($_.VideoUrlProposee)
    }
)

# Contrôle : exactement 100 associations
if ($selection.Count -ne 100) {
    throw "ERREUR DE SECURITE : la sélection contient $($selection.Count) associations au lieu de 100. Aucune écriture."
}

# Contrôle : SongId tous uniques
$duplicates = @(
    $selection |
    Group-Object SongId |
    Where-Object { $_.Count -gt 1 }
)

if ($duplicates.Count -gt 0) {
    $ids = ($duplicates | ForEach-Object { $_.Name }) -join ", "
    throw "ERREUR DE SECURITE : SongId en double : $ids. Aucune écriture."
}

# Contrôle : chaque fichier local existe
foreach ($row in $selection) {
    $localPath = Join-Path $PSScriptRoot ("public\karaoke\" + $row.Fichier)

    if (-not (Test-Path -LiteralPath $localPath -PathType Leaf)) {
        throw "ERREUR DE SECURITE : fichier local introuvable : $($row.Fichier). Aucune écriture."
    }

    if ([string]::IsNullOrWhiteSpace($row.VideoUrlProposee)) {
        throw "ERREUR DE SECURITE : VideoUrlProposee vide pour SongId $($row.SongId). Aucune écriture."
    }
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "PREPARATION V5 - AUCUNE ECRITURE POUR L'INSTANT" -ForegroundColor Cyan
Write-Host "Associations sélectionnées : $($selection.Count)"
Write-Host "SongId uniques : OUI"
Write-Host "Fichiers locaux vérifiés : OUI"
Write-Host "Colonne qui sera modifiée : video_url UNIQUEMENT"
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

$selection |
    Sort-Object {[int]$_.SongId} |
    Select-Object SongId,Fichier,TitreCatalogue,ArtisteCatalogue,VideoUrlProposee |
    Format-Table -Wrap

$confirmation = Read-Host "`nTaper OUI pour écrire ces 100 video_url dans Supabase"

if ($confirmation -ne "OUI") {
    Write-Host "ANNULÉ - aucune écriture effectuée." -ForegroundColor Yellow
    exit
}

$headers = @{
    "apikey"         = $supabaseKey
    "Authorization" = "Bearer $supabaseKey"
    "Content-Type"   = "application/json"
    "Prefer"         = "return=minimal"
}

$success = 0
$errors = 0

foreach ($row in ($selection | Sort-Object {[int]$_.SongId})) {
    try {
        $endpoint = "$($supabaseUrl.TrimEnd('/'))/rest/v1/songs?id=eq.$([uri]::EscapeDataString([string]$row.SongId))"
        $body = @{ video_url = [string]$row.VideoUrlProposee } | ConvertTo-Json

        Invoke-RestMethod `
            -Method Patch `
            -Uri $endpoint `
            -Headers $headers `
            -Body $body | Out-Null

        Write-Host "OK  $($row.ArtisteCatalogue) - $($row.TitreCatalogue)" -ForegroundColor Green
        $success++
    }
    catch {
        Write-Host "ERREUR SongId $($row.SongId) : $($_.Exception.Message)" -ForegroundColor Red
        $errors++
    }
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "TERMINE"
Write-Host "Ecritures réussies : $success / 100"
Write-Host "Erreurs : $errors"
Write-Host "==================================================" -ForegroundColor Cyan

if ($errors -gt 0) {
    exit 1
}
