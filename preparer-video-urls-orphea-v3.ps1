# Orphea V3 - simulation uniquement, aucune écriture Supabase
$ErrorActionPreference = "Stop"
$root = (Get-Location).Path
$karaokeDir = Join-Path $root "public\karaoke"
$envFile = Join-Path $root ".env.local"
$outFile = Join-Path $root "video-mapping-v3-a-verifier.csv"

if (-not (Test-Path $karaokeDir)) { throw "public\karaoke introuvable." }
if (-not (Test-Path $envFile)) { throw ".env.local introuvable." }

$envLines = Get-Content $envFile
$supabaseUrl = (($envLines | Where-Object { $_ -match '^NEXT_PUBLIC_SUPABASE_URL=' } | Select-Object -First 1) -replace '^NEXT_PUBLIC_SUPABASE_URL=','').Trim().Trim('"').Trim("'")
$supabaseKey = (($envLines | Where-Object { $_ -match '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' } | Select-Object -First 1) -replace '^NEXT_PUBLIC_SUPABASE_ANON_KEY=','').Trim().Trim('"').Trim("'")
if (-not $supabaseUrl -or -not $supabaseKey) { throw "Variables Supabase manquantes." }

$headers = @{apikey=$supabaseKey; Authorization="Bearer $supabaseKey"}
Write-Host "Lecture du catalogue Supabase..." -ForegroundColor Cyan
$catalogue = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/songs?select=id,title,artist,video_url" -Headers $headers -Method Get
$files = Get-ChildItem $karaokeDir -File | Where-Object {$_.Extension -match '^\.(mp4|webm|mov|m4v|avi)$'}

function N([string]$s) {
    if (!$s) { return "" }
    $s = [IO.Path]::GetFileNameWithoutExtension($s).ToLowerInvariant().Trim()
    $s = $s -replace '\\',' '
    $s = $s -replace '\s*\(version\s*[12]\)\s*$',''
    $s = $s -replace '\s*\(karaoke version\)\s*$',''
    $s = $s -replace '\s*\(ch[oœ]eurs?\)\s*$',''
    $s = $s -replace '\s*\[bdfab karaoke\]\s*$',''
    $s = $s -replace '\s*\((480p|360p)\)\s*$',''
    $s = $s.Normalize([Text.NormalizationForm]::FormD)
    $sb = New-Object Text.StringBuilder
    foreach($c in $s.ToCharArray()) {
        if([Globalization.CharUnicodeInfo]::GetUnicodeCategory($c) -ne [Globalization.UnicodeCategory]::NonSpacingMark){[void]$sb.Append($c)}
    }
    $s=$sb.ToString().Normalize([Text.NormalizationForm]::FormC)
    return (($s -replace '[^a-z0-9]+',' ') -replace '\s+',' ').Trim()
}
function TitleScore([string]$a,[string]$b) {
    $a=N $a; $b=N $b
    if(!$a -or !$b){return 0}
    if($a -eq $b){return 100}
    $aw=@($a -split ' '); $bw=@($b -split ' ')
    $common=@($aw | Where-Object {$bw -contains $_})
    if($aw.Count -gt 1 -and $bw.Count -gt 1){
        $r=$common.Count/[Math]::Max($aw.Count,$bw.Count)
        if($r -eq 1){return 92}
        if($r -ge .8){return 82}
    }
    if($a -like "*$b*" -or $b -like "*$a*"){if([Math]::Min($a.Length,$b.Length)-ge 5){return 88}}
    return 0
}
function ArtistScore([string]$a,[string]$b) {
    $a=N $a; $b=N $b
    if(!$a -or !$b){return 0}
    if($a -eq $b){return 100}
    if($a -like "*$b*" -or $b -like "*$a*"){if([Math]::Min($a.Length,$b.Length)-ge 5){return 90}}
    $aw=@($a -split ' '); $bw=@($b -split ' ')
    $common=@($aw | Where-Object {$bw -contains $_})
    if($common.Count -ge [Math]::Ceiling([Math]::Max($aw.Count,$bw.Count)*.8)){return 82}
    return 0
}

$rows=@(); $matched=@{}
foreach($file in $files){
    $base=[IO.Path]::GetFileNameWithoutExtension($file.Name)
    $parts=$base -split '\s+-\s+',2
    $fa=""; $ft=$base
    if($parts.Count -eq 2){$fa=$parts[0];$ft=$parts[1]}
    $cand=@()
    foreach($song in $catalogue){
        $ts=TitleScore $ft $song.title
        if($ts -le 0){continue}
        if($fa){
            $as=ArtistScore $fa $song.artist
            if($as -ge 80 -and $ts -ge 82){$cand += [PSCustomObject]@{Song=$song;Score=[int](($ts*.6)+($as*.4));Detail="Titre $ts / Artiste $as"}}
        } elseif($ts -eq 100){
            $cand += [PSCustomObject]@{Song=$song;Score=100;Detail="Titre seul exact"}
        }
    }
    $cand=@($cand|Sort-Object Score -Descending)
    if(!$cand.Count){
        $rows += [PSCustomObject]@{Fichier=$file.Name;TitreCatalogue="";ArtisteCatalogue="";SongId="";VideoUrlProposee="";VideoUrlActuelle="";Score=0;Correspondance="AUCUNE CORRESPONDANCE";Action="NE PAS ECRIRE";Details=""}
        continue
    }
    $best=$cand[0]; $second=if($cand.Count -gt 1){$cand[1]}else{$null}
    $safe=($best.Score -ge 88) -and (($null -eq $second) -or (($best.Score-$second.Score) -ge 5))
    $url="/karaoke/"+[Uri]::EscapeDataString($file.Name)
    if($safe){
        $rows += [PSCustomObject]@{Fichier=$file.Name;TitreCatalogue=$best.Song.title;ArtisteCatalogue=$best.Song.artist;SongId=$best.Song.id;VideoUrlProposee=$url;VideoUrlActuelle=$best.Song.video_url;Score=$best.Score;Correspondance="CORRESPONDANCE SÛRE";Action="A VERIFIER PUIS ECRIRE";Details=$best.Detail}
        $matched[[string]$best.Song.id]=$true
    } else {
        $pistes=($cand|Select-Object -First 3|ForEach-Object{"$($_.Song.artist) / $($_.Song.title) (score $($_.Score); $($_.Detail))"}) -join " | "
        $rows += [PSCustomObject]@{Fichier=$file.Name;TitreCatalogue=$best.Song.title;ArtisteCatalogue=$best.Song.artist;SongId=$best.Song.id;VideoUrlProposee=$url;VideoUrlActuelle=$best.Song.video_url;Score=$best.Score;Correspondance="A VERIFIER MANUELLEMENT";Action="NE PAS ECRIRE";Details=$pistes}
    }
}
foreach($song in $catalogue){
    if(!$matched.ContainsKey([string]$song.id)){
        $rows += [PSCustomObject]@{Fichier="";TitreCatalogue=$song.title;ArtisteCatalogue=$song.artist;SongId=$song.id;VideoUrlProposee="";VideoUrlActuelle=$song.video_url;Score="";Correspondance="CATALOGUE SANS FICHIER LOCAL";Action="A VERIFIER";Details=""}
    }
}
$rows|Export-Csv $outFile -NoTypeInformation -Encoding UTF8
Write-Host ""
Write-Host "SIMULATION V3 TERMINEE - RIEN N'A ETE MODIFIE DANS SUPABASE." -ForegroundColor Green
Write-Host "Correspondances sûres : $(@($rows|?{$_.Action -eq 'A VERIFIER PUIS ECRIRE'}).Count)"
Write-Host "A vérifier manuellement : $(@($rows|?{$_.Correspondance -eq 'A VERIFIER MANUELLEMENT'}).Count)"
Write-Host "Fichiers sans piste : $(@($rows|?{$_.Correspondance -eq 'AUCUNE CORRESPONDANCE'}).Count)"
Write-Host "Catalogue sans fichier local : $(@($rows|?{$_.Correspondance -eq 'CATALOGUE SANS FICHIER LOCAL'}).Count)"
Write-Host "Rapport : $outFile" -ForegroundColor Cyan
