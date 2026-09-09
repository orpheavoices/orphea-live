"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Genre = {
  id: number;
  nom: string;
};

type Chanson = {
  id: number;
  title: string;
  artist: string;
  year: number | null;
  duration: number | null;
  difficulty: string | null;
  status: string | null;
  favorite: boolean | null;
  notes: string | null;
  langue: string | null;
  presentation: string | null;
  interpretation: string | null;
  karaoke_url: string | null;
  decade: string | null;
  video_url: string | null;
  verification_statut: string | null;
verification_date: string | null;
  genres: number[];
};

export default function VerificationPage() {
  const [chansons, setChansons] = useState<Chanson[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [totalChansons, setTotalChansons] = useState(0);
const [chansonsVerifiees, setChansonsVerifiees] = useState(0);
  const [index, setIndex] = useState(0);
  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState(false);
  const [message, setMessage] = useState("");
  const [videosLocales, setVideosLocales] = useState<string[]>([]);

  useEffect(() => {
    chargerCatalogue();
  }, []);
useEffect(() => {
  async function chargerVideos() {
    const response = await fetch("/api/videos");
    const result = await response.json();

    if (response.ok) {
      setVideosLocales(result.fichiers ?? []);
    }
  }

  chargerVideos();
}, []);
  async function chargerCatalogue() {
    setChargement(true);

    const response = await fetch("/api/catalogue");
    const result = await response.json();

    if (!response.ok) {
      alert(result.error || "Impossible de charger le catalogue.");
      setChargement(false);
      return;
    }

    const songs = result.songs ?? [];
    const genresData = result.genres ?? [];
    const songGenres = result.songGenres ?? [];

    const genresParChanson = new Map<number, number[]>();

    songGenres.forEach(
      (relation: { song_id: number; genre_id: number }) => {
        const liste = genresParChanson.get(relation.song_id) ?? [];
        liste.push(relation.genre_id);
        genresParChanson.set(relation.song_id, liste);
      }
    );

    const chansonsAvecGenres: Chanson[] = songs.map(
      (chanson: Omit<Chanson, "genres">) => ({
        ...chanson,
        genres: genresParChanson.get(chanson.id) ?? [],
      })
    );
setTotalChansons(chansonsAvecGenres.length);

setChansonsVerifiees(
  chansonsAvecGenres.filter(
    (chanson) => chanson.verification_statut === "Vérifiée"
  ).length
);
    const chansonsAverifier = chansonsAvecGenres.filter(
   
  (chanson) => chanson.verification_statut !== "Vérifiée"
);
    setChansons(chansonsAverifier);
    setGenres(genresData);
    setChargement(false);
  }

  function modifierChamp(
    champ: keyof Chanson,
    valeur: string | number | boolean | null
  ) {
    setChansons((anciennes) =>
      anciennes.map((chanson, i) =>
        i === index
          ? {
              ...chanson,
              [champ]: valeur,
            }
          : chanson
      )
    );
  }

  function modifierGenre(genreId: number) {
    setChansons((anciennes) =>
      anciennes.map((chanson, i) => {
        if (i !== index) return chanson;

        const dejaSelectionne = chanson.genres.includes(genreId);

        return {
          ...chanson,
          genres: dejaSelectionne
            ? chanson.genres.filter((id) => id !== genreId)
            : [...chanson.genres, genreId],
        };
      })
    );
  }

  async function enregistrerEtPasser() {
    const chanson = chansons[index];

    if (!chanson) return;

    setEnregistrement(true);
    setMessage("");

    const { error: chansonError } = await supabase
      .from("songs")
      .update({
        title: chanson.title,
        artist: chanson.artist,
        year: chanson.year,
        duration: chanson.duration,
        difficulty: chanson.difficulty,
        status: chanson.status,
        favorite: chanson.favorite,
        notes: chanson.notes,
        langue: chanson.langue,
        presentation: chanson.presentation,
        interpretation: chanson.interpretation,
        karaoke_url: chanson.karaoke_url,
        decade: chanson.decade,
        video_url: chanson.video_url,
        verification_statut: "Vérifiée",
verification_date: new Date().toISOString(),
      })
      .eq("id", chanson.id);

    if (chansonError) {
      alert(
        "Erreur lors de l'enregistrement de la chanson : " +
          chansonError.message
      );
      setEnregistrement(false);
      return;
    }

    const { error: deleteError } = await supabase
      .from("song_genres")
      .delete()
      .eq("song_id", chanson.id);

    if (deleteError) {
      alert(
        "La chanson a été enregistrée, mais les genres n'ont pas pu être mis à jour : " +
          deleteError.message
      );
      setEnregistrement(false);
      return;
    }

    if (chanson.genres.length > 0) {
      const relations = chanson.genres.map((genreId) => ({
        song_id: chanson.id,
        genre_id: genreId,
      }));

      const { error: insertError } = await supabase
        .from("song_genres")
        .insert(relations);

      if (insertError) {
        alert(
          "La chanson a été enregistrée, mais les genres n'ont pas pu être enregistrés : " +
            insertError.message
        );
        setEnregistrement(false);
        return;
      }
    }

    setMessage("Enregistré");

    if (index < chansons.length - 1) {
      setTimeout(() => {
        setIndex(index + 1);
        setMessage("");
        setEnregistrement(false);
      }, 300);
    } else {
      setEnregistrement(false);
      alert("Toutes les chansons ont été vérifiées.");
    }
  }

  function passerSansEnregistrer() {
    if (index < chansons.length - 1) {
      setIndex(index + 1);
      setMessage("");
    }
  }

  function chansonPrecedente() {
    if (index > 0) {
      setIndex(index - 1);
      setMessage("");
    }
  }

  if (chargement) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-5xl">
          <p className="text-slate-600">Chargement du catalogue...</p>
        </div>
      </main>
    );
  }

  if (chansons.length === 0) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-5xl">
          <p className="text-slate-600">
            Aucune chanson trouvée dans le catalogue.
          </p>
        </div>
      </main>
    );
  }

  const chanson = chansons[index];

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <div className="mb-4">
            <button
              onClick={() => (window.location.href = "/regie")}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              ← Retour à la régie
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Vérification du catalogue
              </h1>
              <p className="mt-2 text-lg font-medium text-slate-600">
  ✅ {chansonsVerifiees} / {totalChansons} vérifiées
  <span className="ml-3 text-slate-400">
    · {totalChansons - chansonsVerifiees} restantes
  </span>
</p>
              <p className="mt-1 text-slate-500">
                Vérifiez la vidéo et corrigez les informations de la chanson.
              </p>
            </div>

            <div className="rounded-xl bg-white px-5 py-3 text-center shadow-sm">
              <div className="text-2xl font-bold text-slate-900">
                {index + 1} / {chansons.length}
              </div>
              <div className="text-xs text-slate-500">chansons</div>
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          {/* VIDEO */}
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="mb-1 text-xl font-bold text-slate-900">
              {chanson.title}
            </h2>

            <p className="mb-5 text-slate-500">{chanson.artist}</p>

            {chanson.video_url ? (
              <video
                key={chanson.video_url}
                src={chanson.video_url}
                controls
                className="w-full rounded-xl bg-black"
              />
            ) : (
              <div className="flex aspect-video items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                Aucune vidéo locale
              </div>
            )}

            <div className="mt-5 flex items-center justify-between">
              <button
                onClick={chansonPrecedente}
                disabled={index === 0}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
              >
                ← Précédente
              </button>

              <button
                onClick={passerSansEnregistrer}
                disabled={index === chansons.length - 1}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
              >
                Passer sans enregistrer →
              </button>
            </div>
          </section>

          {/* INFORMATIONS */}
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="mb-5 text-xl font-bold text-slate-900">
              Informations
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Titre
                </label>
                <input
                  value={chanson.title}
                  onChange={(e) => modifierChamp("title", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Artiste
                </label>
                <input
                  value={chanson.artist}
                  onChange={(e) => modifierChamp("artist", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Année
                  </label>
                  <input
                    type="number"
                    value={chanson.year ?? ""}
                    onChange={(e) =>
                      modifierChamp(
                        "year",
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Décennie
                  </label>
                  <input
                    value={chanson.decade ?? ""}
                    onChange={(e) => modifierChamp("decade", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    placeholder="Années 80"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Langue
                </label>
                <input
                  value={chanson.langue ?? ""}
                  onChange={(e) => modifierChamp("langue", e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Genres
                </label>

                <div className="flex flex-wrap gap-2 rounded-lg border border-slate-300 p-3">
                  {genres.map((genre) => {
                    const selectionne = chanson.genres.includes(genre.id);

                    return (
                      <button
                        key={genre.id}
                        type="button"
                        onClick={() => modifierGenre(genre.id)}
                        className={`rounded-full border px-3 py-1.5 text-sm ${
                          selectionne
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {genre.nom}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Présentation
                </label>
                <textarea
                  value={chanson.presentation ?? ""}
                  onChange={(e) =>
                    modifierChamp("presentation", e.target.value)
                  }
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Interprétation
                </label>
                <textarea
                  value={chanson.interpretation ?? ""}
                  onChange={(e) =>
                    modifierChamp("interpretation", e.target.value)
                  }
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Difficulté
                  </label>
                  <input
                    value={chanson.difficulty ?? ""}
                    onChange={(e) =>
                      modifierChamp("difficulty", e.target.value)
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Statut
                  </label>
                  <input
                    value={chanson.status ?? ""}
                    onChange={(e) => modifierChamp("status", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                <input
                  type="checkbox"
                  checked={chanson.favorite ?? false}
                  onChange={(e) =>
                    modifierChamp("favorite", e.target.checked)
                  }
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium text-slate-700">
                  Chanson favorite
                </span>
              </label>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Notes
                </label>
                <textarea
                  value={chanson.notes ?? ""}
                  onChange={(e) => modifierChamp("notes", e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                <div>
  <label className="mb-1 block text-sm font-medium text-slate-700">
    Vidéo locale
  </label>

  <select
    value={chanson.video_url ?? ""}
    onChange={(e) =>
      modifierChamp("video_url", e.target.value || null)
    }
    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
  >
    <option value="">Aucune vidéo</option>

    {videosLocales.map((fichier) => {
      const chemin = `/karaoke/${encodeURIComponent(fichier)}`;

      return (
        <option key={fichier} value={chemin}>
          {fichier}
        </option>
      );
    })}
  </select>

  <p className="mt-1 text-xs text-slate-500">
    Sélectionne la vidéo correspondant à cette chanson.
  </p>
</div>
                </label>
                <input
                  value={chanson.video_url ?? ""}
                  onChange={(e) =>
                    modifierChamp("video_url", e.target.value || null)
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  URL karaoké
                </label>
                <input
                  value={chanson.karaoke_url ?? ""}
                  onChange={(e) =>
                    modifierChamp("karaoke_url", e.target.value || null)
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              {message && (
                <p className="text-center text-sm font-medium text-green-600">
                  {message}
                </p>
              )}

              <button
                onClick={enregistrerEtPasser}
                disabled={enregistrement}
                className="w-full rounded-xl bg-slate-900 px-5 py-3 font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {enregistrement
                  ? "Enregistrement..."
                  : index === chansons.length - 1
                    ? "ENREGISTRER"
                    : "ENREGISTRER ET PASSER À LA SUIVANTE →"}
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}