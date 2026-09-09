import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const [
    { data: songs, error: songsError },
    { data: genres, error: genresError },
    { data: songGenres, error: songGenresError },
  ] = await Promise.all([
    supabase
      .from("songs")
      .select("id, title, artist, year, duration, difficulty, status, favorite, notes, langue, presentation, interpretation, karaoke_url, decade, video_url, verification_statut, verification_date")
     .eq("actif", true)
      .order("title", { ascending: true }),

    supabase
      .from("genres")
      .select("id, nom")
      .order("nom", { ascending: true }),

    supabase
      .from("song_genres")
      .select("song_id, genre_id"),
  ]);

  if (songsError || genresError || songGenresError) {
    return NextResponse.json(
      {
        error: songsError?.message || genresError?.message || songGenresError?.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    songs: songs ?? [],
    genres: genres ?? [],
    songGenres: songGenres ?? [],
  });
}
