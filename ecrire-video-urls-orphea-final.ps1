# Orphea - ECRITURE FINALE des video_url
# IMPORTANT :
# - Modifie UNIQUEMENT la colonne video_url des 74 chansons validées.
# - Ne modifie aucun autre champ.
# - N'associe PAS Bourvil ni Jean-Jacques Goldman.
# - Demande une confirmation avant toute écriture.

$ErrorActionPreference = "Stop"

$root = (Get-Location).Path
$csvPath = Join-Path $root "video-mapping-v2-a-verifier.csv"
$envFile = Join-Path $root ".env.local"

if (-not (Test-Path $csvPath)) { throw "CSV V2 introuvable : $csvPath" }
if (-not (Test-Path $envFile)) { throw ".env.local introuvable." }

$envLines = Get-Content $envFile
$supabaseUrl = (($envLines | Where-Object { $_ -match '^NEXT_PUBLIC_SUPABASE_URL=' } | Select-Object -First 1) -replace '^NEXT_PUBLIC_SUPABASE_URL=','').Trim().Trim('"').Trim("'")
$supabaseKey = (($envLines | Where-Object { $_ -match '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' } | Select-Object -First 1) -replace '^NEXT_PUBLIC_SUPABASE_ANON_KEY=','').Trim().Trim('"').Trim("'")

if (-not $supabaseUrl -or -not $supabaseKey) { throw "Variables Supabase manquantes." }

$headers = @{
    "apikey" = $supabaseKey
    "Authorization" = "Bearer $supabaseKey"
    "Content-Type" = "application/json"
    "Prefer" = "return=minimal"
}

$rows = @(Import-Csv $csvPath)

# 72 correspondances sûres issues de la V2.
$valides = @(
    $rows | Where-Object {
        $_.Correspondance -eq "CORRESPONDANCE SÛRE" -and
        $_.Fichier -ne "bourvil-la-tendresse.mp4" -and
        $_.Fichier -ne "Jean-Jacques Goldman - Quand la musique est bonne.mp4"
    }
)

# Ajout des 2 correspondances validées manuellement.
$manuelles = @(
    $rows | Where-Object {
        $_.Correspondance -eq "A VERIFIER MANUELLEMENT" -and
        (
            $_.Fichier -eq "The Pretenders - I'll Stand By You.mp4" -or
            $_.Fichier -eq "Véronique Sanson & Vianney - Chanson sur ma drôle de vie.mp4"
        )
    }
)

$selection = @($valides + $manuelles)

# Déduplication par SongId pour éviter toute double écriture.
$selection = @($selection | Group-Object SongId | ForEach-Object { $_.Group[0] })

if ($selection.Count -ne 74) {
    Write-Host "ERREUR DE SECURITE : la sélection contient $($selection.Count) chansons au lieu de 74." -ForegroundColor Red
    Write-Host "Aucune écriture n'a été effectuée." -ForegroundColor Yellow
    exit 1
}

# Vérification que les fichiers locaux existent encore.
$missingFiles = @()
foreach ($row in $selection) {
    $localPath = Join-Path $root ("public\karaoke\" + $row.Fichier)
    if (-not (Test-Path $localPath)) {
        $missingFiles += $row.Fichier
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Host "ERREUR DE SECURITE : fichiers locaux introuvables :" -ForegroundColor Red
    $missingFiles | ForEach-Object { Write-Host " - $_" }
    Write-Host "Aucune écriture n'a été effectuée." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "ECRITURE DES VIDEO_URL ORPHEA" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Nombre de chansons : $($selection.Count)"
Write-Host "Colonnes modifiées : video_url UNIQUEMENT"
Write-Host "Autres colonnes : AUCUNE"
Write-Host ""
Write-Host "Exclusions explicites :" -ForegroundColor Yellow
Write-Host " - bourvil-la-tendresse.mp4"
Write-Host " - Jean-Jacques Goldman - Quand la musique est bonne.mp4"
Write-Host ""

$selection | Sort-Object Fichier | Select-Object Fichier,TitreCatalogue,ArtisteCatalogue,SongId,VideoUrlProposee |
    Format-Table -Wrap

Write-Host ""
$confirmation = Read-Host "Taper OUI pour écrire ces 74 video_url dans Supabase"

if ($confirmation -ne "OUI") {
    Write-Host ""
    Write-Host "ANNULATION : aucune modification effectuée." -ForegroundColor Yellow
    exit 0
}

$ok = 0
$errors = @()

foreach ($row in $selection) {
    try {
        # Protection supplémentaire : mise à jour par ID et uniquement video_url.
        $body = @{ video_url = [string]$row.VideoUrlProposee } | ConvertTo-Json -Compress
        $uri = "$supabaseUrl/rest/v1/songs?id=eq.$($row.SongId)"

        Invoke-RestMethod -Uri $uri -Headers $headers -Method Patch -Body $body | Out-Null

        $ok++
        Write-Host "OK  $($row.ArtisteCatalogue) - $($row.TitreCatalogue)" -ForegroundColor Green
    }
    catch {
        $errors += [PSCustomObject]@{
            SongId = $row.SongId
            Fichier = $row.Fichier
            Erreur = $_.Exception.Message
        }
        Write-Host "ERREUR  $($row.Fichier)" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "TERMINE"
Write-Host "Ecritures réussies : $ok / 74"
Write-Host "Erreurs : $($errors.Count)"
Write-Host "==================================================" -ForegroundColor Cyan

if ($errors.Count -gt 0) {
    Write-Host ""
    Write-Host "Les erreurs n'ont pas été réessayées automatiquement." -ForegroundColor Yellow
    $errors | Format-Table -AutoSize
}
