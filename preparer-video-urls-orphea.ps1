# Orphea - préparation du raccordement des vidéos locales
# MODE SIMULATION : ce script NE MODIFIE PAS Supabase.

$ErrorActionPreference = "Stop"
$root = (Get-Location).Path
$karaokeDir = Join-Path $root "public\karaoke"
$envFile = Join-Path $root ".env.local"
$outFile = Join-Path $root "video-mapping-a-verifier.csv"

if (-not (Test-Path $karaokeDir)) { Write-Host "ERREUR : public\karaoke introuvable." -ForegroundColor Red; exit 1 }
if (-not (Test-Path $envFile)) { Write-Host "ERREUR : .env.local introuvable." -ForegroundColor Red; exit 1 }

$envLines = Get-Content $envFile
$supabaseUrl = ($envLines | Where-Object { $_ -match '^NEXT_PUBLIC_SUPABASE_URL=' } | Select-Object -First 1) -replace '^NEXT_PUBLIC_SUPABASE_URL=', ''
$supabaseKey = ($envLines | Where-Object { $_ -match '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' } | Select-Object -First 1) -replace '^NEXT_PUBLIC_SUPABASE_ANON_KEY=', ''
if ([string]::IsNullOrWhiteSpace($supabaseUrl) -or [string]::IsNullOrWhiteSpace($supabaseKey)) { Write-Host "ERREUR : variables Supabase manquantes dans .env.local." -ForegroundColor Red; exit 1 }

$supabaseUrl = $supabaseUrl.Trim().Trim('"').Trim("'")
$supabaseKey = $supabaseKey.Trim().Trim('"').Trim("'")
$headers = @{ "apikey" = $supabaseKey; "Authorization" = "Bearer $supabaseKey" }

Write-Host "Lecture du catalogue Supabase..." -ForegroundColor Cyan
$catalogue = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/songs?select=id,title,artist,video_url" -Headers $headers -Method Get

$files = Get-ChildItem $karaokeDir -File | Where-Object { $_.Extension -match '^\.(mp4|webm|mov|m4v|avi)$' }

function Normaliser([string]$s) {
    if ([string]::IsNullOrWhiteSpace($s)) { return "" }
    $s = [System.IO.Path]::GetFileNameWithoutExtension($s).ToLowerInvariant().Trim()
    $s = $s -replace '\s*\(version\s*[12]\)\s*$', ''
    $s = $s -replace '\s*\(karaoke version\)\s*$', ''
    $s = $s -replace '\s*\[bdfab karaoke\]\s*$', ''
    $s = $s -replace '\s*\((480p|360p)\)\s*$', ''
    $s = $s -replace '\s+', ' '
    $formD = $s.Normalize([Text.NormalizationForm]::FormD)
    $sb = New-Object System.Text.StringBuilder
    foreach ($c in $formD.ToCharArray()) {
        if ([Globalization.CharUnicodeInfo]::GetUnicodeCategory($c) -ne [Globalization.UnicodeCategory]::NonSpacingMark) { [void]$sb.Append($c) }
    }
    $s = $sb.ToString().Normalize([Text.NormalizationForm]::FormC)
    $s = $s -replace '[^a-z0-9]+', ' '
    return ($s -replace '\s+', ' ').Trim()
}

$rows = @()
$matchedIds = @{}

foreach ($file in $files) {
    $fileNorm = Normaliser $file.Name
    $best = $null
    $matchType = ""

    foreach ($song in $catalogue) {
        if ($fileNorm -eq (Normaliser ("{0} - {1}" -f $song.artist, $song.title))) {
            $best = $song; $matchType = "EXACT artiste - titre"; break
        }
    }

    if (-not $best) {
        $candidates = @($catalogue | Where-Object { (Normaliser $_.title) -eq $fileNorm })
        if ($candidates.Count -eq 1) { $best = $candidates[0]; $matchType = "EXACT titre seul" }
        elseif ($candidates.Count -gt 1) { $matchType = "AMBIGU titre multiple" }
    }

    if ($best) {
        $relativeUrl = "/karaoke/" + [Uri]::EscapeDataString($file.Name)
        $rows += [PSCustomObject]@{
            Fichier=$file.Name; TitreCatalogue=$best.title; ArtisteCatalogue=$best.artist
            SongId=$best.id; VideoUrlProposee=$relativeUrl; VideoUrlActuelle=$best.video_url
            Correspondance=$matchType; Action="A VERIFIER PUIS ECRIRE"
        }
        $matchedIds[[string]$best.id] = $true
    } else {
        $rows += [PSCustomObject]@{
            Fichier=$file.Name; TitreCatalogue=""; ArtisteCatalogue=""; SongId=""
            VideoUrlProposee=""; VideoUrlActuelle=""; Correspondance=$(if ($matchType) {$matchType} else {"AUCUNE CORRESPONDANCE"})
            Action="NE PAS ECRIRE"
        }
    }
}

foreach ($song in $catalogue) {
    if (-not $matchedIds.ContainsKey([string]$song.id)) {
        $rows += [PSCustomObject]@{
            Fichier=""; TitreCatalogue=$song.title; ArtisteCatalogue=$song.artist; SongId=$song.id
            VideoUrlProposee=""; VideoUrlActuelle=$song.video_url
            Correspondance="CATALOGUE SANS FICHIER LOCAL"; Action="A VERIFIER"
        }
    }
}

$rows | Export-Csv -Path $outFile -NoTypeInformation -Encoding UTF8

$ok=@($rows | Where-Object {$_.Action -eq "A VERIFIER PUIS ECRIRE"})
$no=@($rows | Where-Object {$_.Correspondance -eq "AUCUNE CORRESPONDANCE"})
$missing=@($rows | Where-Object {$_.Correspondance -eq "CATALOGUE SANS FICHIER LOCAL"})
$amb=@($rows | Where-Object {$_.Correspondance -eq "AMBIGU titre multiple"})

Write-Host ""
Write-Host "SIMULATION TERMINEE - RIEN N'A ETE MODIFIE DANS SUPABASE." -ForegroundColor Green
Write-Host "Correspondances proposées : $($ok.Count)"
Write-Host "Fichiers sans correspondance : $($no.Count)"
Write-Host "Catalogue sans fichier local : $($missing.Count)"
Write-Host "Correspondances ambiguës : $($amb.Count)"
Write-Host "Rapport : $outFile" -ForegroundColor Cyan
