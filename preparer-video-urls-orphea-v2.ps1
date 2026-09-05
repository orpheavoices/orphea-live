# Orphea - V2 préparation des video_url
# MODE SIMULATION : NE MODIFIE PAS Supabase.
# À lancer depuis C:\Projets\orphea-live

$ErrorActionPreference = "Stop"

$root = (Get-Location).Path
$karaokeDir = Join-Path $root "public\karaoke"
$envFile = Join-Path $root ".env.local"
$outFile = Join-Path $root "video-mapping-v2-a-verifier.csv"

if (-not (Test-Path $karaokeDir)) { Write-Host "ERREUR : public\karaoke introuvable." -ForegroundColor Red; exit 1 }
if (-not (Test-Path $envFile)) { Write-Host "ERREUR : .env.local introuvable." -ForegroundColor Red; exit 1 }

$envLines = Get-Content $envFile
$supabaseUrl = ($envLines | Where-Object { $_ -match '^NEXT_PUBLIC_SUPABASE_URL=' } | Select-Object -First 1) -replace '^NEXT_PUBLIC_SUPABASE_URL=', ''
$supabaseKey = ($envLines | Where-Object { $_ -match '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' } | Select-Object -First 1) -replace '^NEXT_PUBLIC_SUPABASE_ANON_KEY=', ''

if ([string]::IsNullOrWhiteSpace($supabaseUrl) -or [string]::IsNullOrWhiteSpace($supabaseKey)) {
    Write-Host "ERREUR : variables Supabase manquantes dans .env.local." -ForegroundColor Red
    exit 1
}

$supabaseUrl = $supabaseUrl.Trim().Trim('"').Trim("'")
$supabaseKey = $supabaseKey.Trim().Trim('"').Trim("'")
$headers = @{ "apikey" = $supabaseKey; "Authorization" = "Bearer $supabaseKey" }

Write-Host "Lecture du catalogue Supabase..." -ForegroundColor Cyan
$catalogue = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/songs?select=id,title,artist,video_url" -Headers $headers -Method Get

$files = Get-ChildItem $karaokeDir -File |
    Where-Object { $_.Extension -match '^\.(mp4|webm|mov|m4v|avi)$' }

function Normaliser([string]$s) {
    if ([string]::IsNullOrWhiteSpace($s)) { return "" }

    $s = [System.IO.Path]::GetFileNameWithoutExtension($s).ToLowerInvariant().Trim()

    # Nettoyage des mentions techniques
    $s = $s -replace '\s*\(version\s*[12]\)\s*$', ''
    $s = $s -replace '\s*\(karaoke version\)\s*$', ''
    $s = $s -replace '\s*\(ch[oœ]eurs?\)\s*$', ''
    $s = $s -replace '\s*\[bdfab karaoke\]\s*$', ''
    $s = $s -replace '\s*\((480p|360p)\)\s*$', ''
    $s = $s -replace '\s+', ' '
    $s = $s.Trim()

    # Accents
    $formD = $s.Normalize([Text.NormalizationForm]::FormD)
    $sb = New-Object System.Text.StringBuilder
    foreach ($c in $formD.ToCharArray()) {
        if ([Globalization.CharUnicodeInfo]::GetUnicodeCategory($c) -ne [Globalization.UnicodeCategory]::NonSpacingMark) {
            [void]$sb.Append($c)
        }
    }
    $s = $sb.ToString().Normalize([Text.NormalizationForm]::FormC)

    # Apostrophes / ponctuation / backslashes -> espaces
    $s = $s -replace '[^a-z0-9]+', ' '
    return ($s -replace '\s+', ' ').Trim()
}

function Mots([string]$s) {
    if ([string]::IsNullOrWhiteSpace($s)) { return @() }
    return @(Normaliser $s -split ' ' | Where-Object { $_ })
}

function ScoreMatch($fileBase, $song) {
    $fileNorm = Normaliser $fileBase
    $titleNorm = Normaliser $song.title
    $artistNorm = Normaliser $song.artist

    if (-not $fileNorm -or -not $titleNorm) { return 0 }

    # Cas idéal : "Artiste - Titre"
    if ($fileNorm -eq (Normaliser ("{0} - {1}" -f $song.artist, $song.title))) { return 100 }

    # Séparation du fichier en artiste / titre
    $parts = $fileBase -split '\s+-\s+', 2
    if ($parts.Count -eq 2) {
        $fileArtist = Normaliser $parts[0]
        $fileTitle = Normaliser $parts[1]

        if ($fileArtist -eq $artistNorm -and $fileTitle -eq $titleNorm) { return 98 }
        if ($fileTitle -eq $titleNorm -and $fileArtist -like "*$artistNorm*") { return 96 }
        if ($fileArtist -eq $artistNorm -and $fileTitle -like "*$titleNorm*") { return 94 }
        if ($fileTitle -eq $titleNorm) { return 90 }
    }

    # Titre exact, même si l'artiste diffère dans le fichier
    if ($fileNorm -eq $titleNorm) { return 88 }

    # Le titre complet apparaît dans le nom du fichier
    if ($fileNorm -like "*$titleNorm*" -and $titleNorm.Length -ge 5) { return 82 }

    # Comparaison par mots du titre, utile pour apostrophes/ponctuation
    $titleWords = @(Mots $song.title)
    $fileWords = @(Mots $fileNorm)
    if ($titleWords.Count -ge 2) {
        $present = @($titleWords | Where-Object { $fileWords -contains $_ })
        $ratio = $present.Count / $titleWords.Count
        if ($ratio -eq 1) { return 80 }
        if ($ratio -ge 0.8) { return 70 }
    }

    return 0
}

$rows = @()
$matchedIds = @{}

foreach ($file in $files) {
    $base = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)
    $scores = @()

    foreach ($song in $catalogue) {
        $score = ScoreMatch $base $song
        if ($score -gt 0) {
            $scores += [PSCustomObject]@{ Song=$song; Score=$score }
        }
    }

    $scores = @($scores | Sort-Object Score -Descending)

    if ($scores.Count -eq 0) {
        $rows += [PSCustomObject]@{
            Fichier=$file.Name; TitreCatalogue=""; ArtisteCatalogue=""; SongId=""
            VideoUrlProposee=""; VideoUrlActuelle=""
            Score=0; Correspondance="AUCUNE CORRESPONDANCE"; Action="NE PAS ECRIRE"
            MeilleuresPistes=""
        }
        continue
    }

    $best = $scores[0]
    $second = if ($scores.Count -gt 1) { $scores[1] } else { $null }

    # Si le meilleur score est suffisamment supérieur au second, on considère la correspondance sûre.
    $safe = ($best.Score -ge 88) -and (($null -eq $second) -or (($best.Score - $second.Score) -ge 5))

    $relativeUrl = "/karaoke/" + [Uri]::EscapeDataString($file.Name)

    if ($safe) {
        $rows += [PSCustomObject]@{
            Fichier=$file.Name; TitreCatalogue=$best.Song.title; ArtisteCatalogue=$best.Song.artist
            SongId=$best.Song.id; VideoUrlProposee=$relativeUrl; VideoUrlActuelle=$best.Song.video_url
            Score=$best.Score; Correspondance="CORRESPONDANCE SÛRE"; Action="A VERIFIER PUIS ECRIRE"
            MeilleuresPistes=""
        }
        $matchedIds[[string]$best.Song.id] = $true
    } else {
        $pistes = ($scores | Select-Object -First 3 | ForEach-Object {
            "{0} / {1} (score {2})" -f $_.Song.artist, $_.Song.title, $_.Score
        }) -join " | "

        $rows += [PSCustomObject]@{
            Fichier=$file.Name; TitreCatalogue=$best.Song.title; ArtisteCatalogue=$best.Song.artist
            SongId=$best.Song.id; VideoUrlProposee=$relativeUrl; VideoUrlActuelle=$best.Song.video_url
            Score=$best.Score; Correspondance="A VERIFIER MANUELLEMENT"; Action="NE PAS ECRIRE"
            MeilleuresPistes=$pistes
        }
    }
}

foreach ($song in $catalogue) {
    if (-not $matchedIds.ContainsKey([string]$song.id)) {
        $rows += [PSCustomObject]@{
            Fichier=""; TitreCatalogue=$song.title; ArtisteCatalogue=$song.artist; SongId=$song.id
            VideoUrlProposee=""; VideoUrlActuelle=$song.video_url; Score=""
            Correspondance="CATALOGUE SANS FICHIER LOCAL"; Action="A VERIFIER"
            MeilleuresPistes=""
        }
    }
}

$rows | Export-Csv -Path $outFile -NoTypeInformation -Encoding UTF8

$safe = @($rows | Where-Object {$_.Action -eq "A VERIFIER PUIS ECRIRE"})
$manual = @($rows | Where-Object {$_.Correspondance -eq "A VERIFIER MANUELLEMENT"})
$none = @($rows | Where-Object {$_.Correspondance -eq "AUCUNE CORRESPONDANCE"})
$missing = @($rows | Where-Object {$_.Correspondance -eq "CATALOGUE SANS FICHIER LOCAL"})

Write-Host ""
Write-Host "SIMULATION V2 TERMINEE - RIEN N'A ETE MODIFIE DANS SUPABASE." -ForegroundColor Green
Write-Host "Correspondances sûres : $($safe.Count)"
Write-Host "A vérifier manuellement : $($manual.Count)"
Write-Host "Fichiers sans piste : $($none.Count)"
Write-Host "Catalogue sans fichier local : $($missing.Count)"
Write-Host ""
Write-Host "Rapport : $outFile" -ForegroundColor Cyan
Write-Host ""
Write-Host "Aucune écriture Supabase n'a été effectuée." -ForegroundColor Yellow
