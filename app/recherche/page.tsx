"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Chanson = {
  id: number;
  title: string;
  artist: string;
  year: number | null;
  duration: number | null;
  status: string | null;
  favorite: boolean | null;
  notes: string | null;
  langue: string | null;
  presentation: string | null;
  karaoke_url: string | null;
  decade: string | null;
  genres: string[];
};

type Genre = {
  id: number;
  nom: string;
};

export default function RecherchePage() {
  const [chansons, setChansons] = useState<Chanson[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);

  const [titreRecherche, setTitreRecherche] = useState("");
  const [artisteRecherche, setArtisteRecherche] = useState("");
  const [genreRecherche, setGenreRecherche] = useState("");
  const [decadeRecherche, setDecadeRecherche] = useState("");
  const [langueRecherche, setLangueRecherche] = useState("");
  const [favorisSeulement, setFavorisSeulement] = useState(false);

  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");

  async function chargerChansons() {
    setChargement(true);
    setErreur("");

    const [
      { data: songsData, error: songsError },
      { data: genresData, error: genresError },
      { data: songGenresData, error: songGenresError },
    ] = await Promise.all([
      supabase
        .from("songs")
        .select(
          "id, title, artist, year, duration, status, favorite, notes, langue, presentation, karaoke_url, decade"
        )
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
      console.error(songsError || genresError || songGenresError);
      setErreur("Impossible de charger le catalogue.");
      setChansons([]);
      setGenres([]);
      setChargement(false);
      return;
    }

    const genresParId = new Map<number, string>();

    (genresData ?? []).forEach((genre) => {
      genresParId.set(genre.id, genre.nom);
    });

    const genresParChanson = new Map<number, string[]>();

    (songGenresData ?? []).forEach((relation) => {
      const nomGenre = genresParId.get(relation.genre_id);

      if (!nomGenre) return;

      const liste = genresParChanson.get(relation.song_id) ?? [];
      liste.push(nomGenre);
      genresParChanson.set(relation.song_id, liste);
    });

    const chansonsAvecGenres: Chanson[] = (songsData ?? []).map(
      (chanson) => ({
        ...chanson,
        genres: genresParChanson.get(chanson.id) ?? [],
      })
    );

    setChansons(chansonsAvecGenres);
    setGenres(genresData ?? []);
    setChargement(false);
  }

  useEffect(() => {
    chargerChansons();
  }, []);

  const langues = Array.from(
    new Set(
      chansons
        .map((chanson) => chanson.langue)
        .filter((langue): langue is string => Boolean(langue))
    )
  ).sort();

  const decennies = Array.from(
    new Set(
      chansons
        .map((chanson) => chanson.decade)
        .filter((decade): decade is string => Boolean(decade))
    )
  ).sort();

  const chansonsFiltrees = chansons.filter((chanson) => {
    const correspondTitre = chanson.title
      .toLowerCase()
      .includes(titreRecherche.toLowerCase());

    const correspondArtiste = chanson.artist
      .toLowerCase()
      .includes(artisteRecherche.toLowerCase());

    const correspondGenre =
      !genreRecherche || chanson.genres.includes(genreRecherche);

    const correspondDecade =
      !decadeRecherche || chanson.decade === decadeRecherche;

    const correspondLangue =
      !langueRecherche || chanson.langue === langueRecherche;

    const correspondFavori =
      !favorisSeulement || chanson.favorite === true;

    return (
      correspondTitre &&
      correspondArtiste &&
      correspondGenre &&
      correspondDecade &&
      correspondLangue &&
      correspondFavori
    );
  });

  return (
    <main className="min-h-screen bg-[#080808] text-white">

      {/* CADRE OR */}
      <div className="min-h-screen border border-[#c9a227]">

        {/* HEADER */}
        <header className="border-b border-[#c9a227]/40 bg-black">
          <div className="max-w-6xl mx-auto px-5 py-5">

            <div className="flex justify-center">
              <img
                src="/images/orphea-logo.png"
                alt="Orphea Live"
                className="h-32 md:h-40 w-auto object-contain"
              />
            </div>

          </div>
        </header>

        {/* CONTENU */}
        <div className="max-w-6xl mx-auto px-5 py-8 md:py-12">

          {/* TITRE */}
          <div className="text-center mb-8">

            <p className="text-[#d4af37] uppercase tracking-[0.3em] text-sm mb-3">
              Orphea Live
            </p>

            <h1 className="text-3xl md:text-5xl font-bold text-white">
              Choisissez votre chanson
            </h1>

            <div className="flex justify-center items-center gap-4 mt-4">
              <span className="h-px w-16 bg-[#d4af37]" />
              <span className="text-[#d4af37] text-xl">♪</span>
              <span className="h-px w-16 bg-[#d4af37]" />
            </div>

          </div>

          {/* RECHERCHE */}
          <section className="bg-[#111111] border border-[#c9a227]/60 rounded-2xl p-5 md:p-7 shadow-2xl">

            <h2 className="text-xl font-bold text-[#d4af37] mb-5">
              Trouvez votre chanson
            </h2>

            <div className="grid md:grid-cols-2 gap-4">

              {/* TITRE */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Titre
                </label>

                <input
                  type="text"
                  placeholder="Ex. L'envie"
                  value={titreRecherche}
                  onChange={(e) => setTitreRecherche(e.target.value)}
                  className="w-full bg-[#080808] border border-[#555] focus:border-[#d4af37] rounded-xl p-3.5 text-white placeholder-gray-500 outline-none transition"
                />
              </div>

              {/* ARTISTE */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Artiste
                </label>

                <input
                  type="text"
                  placeholder="Ex. Johnny Hallyday"
                  value={artisteRecherche}
                  onChange={(e) => setArtisteRecherche(e.target.value)}
                  className="w-full bg-[#080808] border border-[#555] focus:border-[#d4af37] rounded-xl p-3.5 text-white placeholder-gray-500 outline-none transition"
                />
              </div>

              {/* GENRE */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Genre
                </label>

                <select
                  value={genreRecherche}
                  onChange={(e) => setGenreRecherche(e.target.value)}
                  className="w-full bg-[#080808] border border-[#555] focus:border-[#d4af37] rounded-xl p-3.5 text-white outline-none"
                >
                  <option value="">Tous les genres</option>

                  {genres.map((genre) => (
                    <option key={genre.id} value={genre.nom}>
                      {genre.nom}
                    </option>
                  ))}
                </select>
              </div>

              {/* DÉCENNIE */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Décennie
                </label>

                <select
                  value={decadeRecherche}
                  onChange={(e) => setDecadeRecherche(e.target.value)}
                  className="w-full bg-[#080808] border border-[#555] focus:border-[#d4af37] rounded-xl p-3.5 text-white outline-none"
                >
                  <option value="">Toutes les décennies</option>

                  {decennies.map((decade) => (
                    <option key={decade} value={decade}>
                      {decade}
                    </option>
                  ))}
                </select>
              </div>

              {/* LANGUE */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Langue
                </label>

                <select
                  value={langueRecherche}
                  onChange={(e) => setLangueRecherche(e.target.value)}
                  className="w-full bg-[#080808] border border-[#555] focus:border-[#d4af37] rounded-xl p-3.5 text-white outline-none"
                >
                  <option value="">Toutes les langues</option>

                  {langues.map((langue) => (
                    <option key={langue} value={langue}>
                      {langue}
                    </option>
                  ))}
                </select>
              </div>

              {/* FAVORIS */}
              <div className="flex items-end">
                <label className="flex items-center gap-3 cursor-pointer text-gray-200 bg-[#080808] border border-[#555] rounded-xl p-3.5 w-full hover:border-[#d4af37] transition">

                  <input
                    type="checkbox"
                    checked={favorisSeulement}
                    onChange={(e) =>
                      setFavorisSeulement(e.target.checked)
                    }
                    className="w-5 h-5 accent-[#d4af37]"
                  />

                  <span>
                    ❤️ Mes coups de cœur uniquement
                  </span>

                </label>
              </div>

            </div>

          </section>

          {/* RESULTATS */}
          {erreur && (
            <div className="mt-6 bg-red-950 border border-red-600 text-red-200 rounded-xl p-4">
              {erreur}
            </div>
          )}

          {chargement ? (
            <p className="text-center text-gray-400 mt-10">
              Chargement du catalogue...
            </p>
          ) : (
            <div className="mt-10">

              <div className="flex items-center justify-between mb-5">

                <h2 className="text-2xl font-bold">
                  <span className="text-[#d4af37]">
                    {chansonsFiltrees.length}
                  </span>{" "}
                  chanson{chansonsFiltrees.length !== 1 ? "s" : ""}
                </h2>

              </div>

              {chansonsFiltrees.map((chanson) => (
                <article
                  key={chanson.id}
                  className="bg-[#111111] border border-[#333] hover:border-[#c9a227] rounded-2xl p-5 md:p-6 mb-5 transition shadow-xl"
                >

                  {/* TITRE + FAVORI */}
                  <div className="flex flex-col md:flex-row md:justify-between gap-3">

                    <div>

                      <h3 className="text-2xl font-bold text-[#f0d36b]">
                        {chanson.title}
                      </h3>

                      <p className="text-gray-300 mt-1 text-lg">
                        {chanson.artist}
                      </p>

                    </div>

                    {chanson.favorite && (
                      <span className="text-[#d4af37] font-semibold">
                        ♥ Coup de cœur
                      </span>
                    )}

                  </div>

                  {/* INFOS */}
                  <div className="flex flex-wrap gap-2 mt-4">

                    {chanson.langue && (
                      <span className="bg-[#1c1c1c] border border-[#444] text-gray-300 px-3 py-1 rounded-full text-sm">
                        {chanson.langue}
                      </span>
                    )}

                    {chanson.year && (
                      <span className="bg-[#1c1c1c] border border-[#444] text-gray-300 px-3 py-1 rounded-full text-sm">
                        {chanson.year}
                      </span>
                    )}

                    {chanson.decade && (
                      <span className="bg-[#1c1c1c] border border-[#444] text-gray-300 px-3 py-1 rounded-full text-sm">
                        {chanson.decade}
                      </span>
                    )}

                    {chanson.genres.map((genre) => (
                      <span
                        key={genre}
                        className="bg-[#3b1115] border border-[#8f1d24] text-[#f0d36b] px-3 py-1 rounded-full text-sm"
                      >
                        {genre}
                      </span>
                    ))}

                  </div>

                  {/* PRESENTATION */}
                  {chanson.presentation && (
                    <p className="text-gray-400 mt-5 leading-relaxed">
                      {chanson.presentation}
                    </p>
                  )}

                  {/* ACTIONS */}
                  <div className="flex flex-wrap gap-3 mt-6">

                    <Link
                      href={`/demande?titre=${encodeURIComponent(
                        chanson.title
                      )}&artiste=${encodeURIComponent(
                        chanson.artist
                      )}`}
                      className="inline-flex items-center justify-center bg-[#d4af37] hover:bg-[#f0d36b] text-black font-bold px-6 py-3 rounded-xl transition"
                    >
                      🎤 DEMANDER
                    </Link>

                   

                  </div>

                </article>
              ))}

              {chansonsFiltrees.length === 0 && (
                <div className="text-center border border-[#333] bg-[#111111] rounded-2xl py-12 px-5">

                  <div className="text-4xl mb-4">
                    ♪
                  </div>

                  <p className="text-gray-300 text-lg">
                    Aucune chanson trouvée.
                  </p>

                  <p className="text-gray-500 mt-2">
                    Essayez de modifier vos critères de recherche.
                  </p>

                </div>
              )}

            </div>
          )}

          {/* FOOTER */}
          <footer className="text-center mt-14 pb-6">

            <div className="flex justify-center items-center gap-4 mb-4">
              <span className="h-px w-16 bg-[#c9a227]" />
              <span className="text-[#d4af37] text-xl">♪</span>
              <span className="h-px w-16 bg-[#c9a227]" />
            </div>

            <p className="text-gray-500 text-sm mt-2">
              Orphea Live
            </p>

          </footer>

        </div>
      </div>
    </main>
  );
}