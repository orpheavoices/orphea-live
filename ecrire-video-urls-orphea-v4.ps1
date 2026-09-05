# ecrire-video-urls-orphea-v4.ps1
# Ecrit uniquement video_url pour les 99 correspondances sÃ»res + The Pretenders (SongId 141).
# ContrÃ´les de sÃ©curitÃ© avant toute Ã©criture.

$ErrorActionPreference = "Stop"

$reportPath = Join-Path $PSScriptRoot "video-mapping-v3-a-verifier.csv"
$envPath = Join-Path $PSScriptRoot ".env.local"

if (-not (Test-Path $reportPath)) {
    throw "Rapport introuvable : $reportPath"
}
if (-not (Test-Path $envPath)) {
    throw ".env.local introuvable : $envPath"
}

# Lecture simple de .env.local
$envLines = Get-Content $envPath
foreach ($line in $envLines) {
    if ($line -match '^\s*([^#=\s]+)\s*=\s*(.*)\s*$') {
        $name = $Matches[1]
        $value = $Matches[2].Trim()
        if ($value.StartsWith('"') -and $value.EndsWith('"')) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
}

$supabaseUrl = $env:SUPABASE_URL
if (-not $supabaseUrl) { $supabaseUrl = $env:NEXT_PUBLIC_SUPABASE_URL }

$supabaseKey = $env:SUPABASE_SERVICE_ROLE_KEY
if (-not $supabaseKey) { $supabaseKey = $env:NEXT_PUBLIC_SUPABASE_ANON_KEY }

if (-not $supabaseUrl) { throw "SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL absent de .env.local" }
if (-not $supabaseKey) { throw "SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY absent de .env.local" }

$rows = @(Import-Csv $reportPath -Encoding UTF8)

# 99 sÃ»res + The Pretenders validÃ© manuellement
$sures = @($rows | Where-Object { $_.Correspondance -eq "CORRESPONDANCE SÃ›RE" })
$pretenders = @($rows | Where-Object {
    $_.SongId -eq "141" -and $_.Fichier -eq "The Pretenders - I'll Stand By You.mp4"
})

$selection = @($sures + $pretenders)

if ($sures.Count -ne 99) {
    throw "ERREUR DE SECURITE : le rapport contient $($sures.Count) correspondances sÃ»res au lieu de 99. Aucune Ã©criture."
}
if ($pretenders.Count -ne 1) {
    throw "ERREUR DE SECURITE : The Pretenders (SongId 141) n'est pas trouvÃ© exactement une fois. Aucune Ã©criture."
}
if ($selection.Count -ne 100) {
    throw "ERREUR DE SECURITE : sÃ©lection = $($selection.Count) au lieu de 100. Aucune Ã©criture."
}

$duplicateSongIds = @($selection | Group-Object SongId | Where-Object { $_.Count -gt 1 })
if ($duplicateSongIds.Count -gt 0) {
    throw "ERREUR DE SECURITE : SongId en double dans la sÃ©lection. Aucune Ã©criture."
}

# VÃ©rification des fichiers locaux et des URLs
foreach ($row in $selection) {
    $localPath = Join-Path $PSScriptRoot ("public\karaoke\" + $row.Fichier)
    if (-not (Test-Path -LiteralPath $localPath -PathType Leaf)) {
        throw "ERREUR DE SECURITE : fichier local introuvable : $($row.Fichier). Aucune Ã©criture."
    }
    if ([string]::IsNullOrWhiteSpace($row.VideoUrlProposee)) {
        throw "ERREUR DE SECURITE : VideoUrlProposee vide pour SongId $($row.SongId). Aucune Ã©criture."
    }
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "PREPARATION V4 - AUCUNE ECRITURE POUR L'INSTANT" -ForegroundColor Cyan
Write-Host "Correspondances sÃ»res : $($sures.Count)"
Write-Host "Correspondance manuelle validÃ©e : The Pretenders - I'll Stand By You (SongId 141)"
Write-Host "Total sÃ©lectionnÃ© : $($selection.Count)"
Write-Host "Colonne modifiÃ©e : video_url UNIQUEMENT"
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

$selection | Sort-Object {[int]$_.SongId} |
    Select-Object SongId,Fichier,TitreCatalogue,ArtisteCatalogue,VideoUrlProposee |
    Format-Table -Wrap

$confirmation = Read-Host "`nTaper OUI pour Ã©crire ces 100 video_url dans Supabase"

if ($confirmation -ne "OUI") {
    Write-Host "AnnulÃ©. Aucune Ã©criture n'a Ã©tÃ© effectuÃ©e." -ForegroundColor Yellow
    exit
}

$headers = @{
    "apikey"        = $supabaseKey
    "Authorization" = "Bearer $supabaseKey"
    "Content-Type"  = "application/json"
    "Prefer"        = "return=minimal"
}

$success = 0
$errors = 0

foreach ($row in ($selection | Sort-Object {[int]$_.SongId})) {
    try {
        $encodedId = [uri]::EscapeDataString([string]$row.SongId)
        $endpoint = "$($supabaseUrl.TrimEnd('/'))/rest/v1/songs?id=eq.$encodedId"
        $body = @{ video_url = [string]$row.VideoUrlProposee } | ConvertTo-Json

        Invoke-RestMethod -Method Patch -Uri $endpoint -Headers $headers -Body $body | Out-Null

        Write-Host "OK  $($row.ArtisteCatalogue) - $($row.TitreCatalogue)" -ForegroundColor Green
        $success++
    }
    catch {
        Write-Host "ERREUR  SongId $($row.SongId) : $($_.Exception.Message)" -ForegroundColor Red
        $errors++
    }
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "TERMINE"
Write-Host "Ecritures rÃ©ussies : $success / $($selection.Count)"
Write-Host "Erreurs : $errors"
Write-Host "==================================================" -ForegroundColor Cyan

if ($errors -gt 0) {
    exit 1
}


