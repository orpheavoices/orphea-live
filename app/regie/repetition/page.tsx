
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Chanson = {
  id: number;
  title: string;
  artist: string | null;
  nombre_repetitions: number | null;
  video_url: string | null;
  karaoke_url: string | null;
};

type Statut = "maitrisee" | "a_revoir";

export default function RepetitionPage() {
  const [chansons, setChansons] = useState<Chanson[]>([]);
  const [statuts, setStatuts] = useState<Record<number, Statut>>({});
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche] = useState("");
  const [sauvegardeEnCours, setSauvegardeEnCours] = useState<number | null>(null);

  useEffect(() => {
    async function chargerDonnees() {
      const [resultatChansons, resultatStatuts] = await Promise.all([
        supabase
          .from("songs")
          .select("id, title, artist, nombre_repetitions, video_url, karaoke_url")
          .eq("actif", true)
          .order("nombre_repetitions", {
            ascending: true,
            nullsFirst: true,
          })
          .order("title", { ascending: true }),

        supabase
          .from("statut_repetitions")
          .select("song_id, statut"),
      ]);

      if (resultatChansons.error) {
        console.error("Erreur de chargement des chansons :", resultatChansons.error);
      } else {
        setChansons((resultatChansons.data ?? []) as Chanson[]);
      }

      if (resultatStatuts.error) {
        console.error("Erreur de chargement des statuts :", resultatStatuts.error);
      } else {
        const statutsCharges: Record<number, Statut> = {};

        for (const ligne of resultatStatuts.data ?? []) {
          if (
            ligne.statut === "maitrisee" ||
            ligne.statut === "a_revoir"
          ) {
            statutsCharges[Number(ligne.song_id)] = ligne.statut;
          }
        }

        setStatuts(statutsCharges);
      }

      setChargement(false);
    }

    void chargerDonnees();
  }, []);

  async function changerStatut(chansonId: number, nouveauStatut: Statut) {
    setSauvegardeEnCours(chansonId);

    const { error } = await supabase
      .from("statut_repetitions")
      .upsert(
        {
          song_id: chansonId,
          statut: nouveauStatut,
          modifie_le: new Date().toISOString(),
        },
        { onConflict: "song_id" }
      );

    if (error) {
      console.error("Erreur de sauvegarde du statut :", error);
      alert("Impossible d'enregistrer le statut. Vérifie la connexion et réessaie.");
    } else {
      setStatuts((precedents) => ({
        ...precedents,
        [chansonId]: nouveauStatut,
      }));
    }

    setSauvegardeEnCours(null);
  }

  
const chansonsFiltrees = chansons
  .filter((chanson) =>
    `${chanson.title} ${chanson.artist ?? ""}`
      .toLowerCase()
      .includes(recherche.toLowerCase())
  )
  .sort((a, b) => {
    const statutA = statuts[a.id] ?? "a_revoir";
    const statutB = statuts[b.id] ?? "a_revoir";

    if (statutA !== statutB) {
      return statutA === "maitrisee" ? 1 : -1;
    }

    return (
      (a.nombre_repetitions ?? 0) - (b.nombre_repetitions ?? 0) ||
      a.title.localeCompare(b.title)
    );
  });


  function lancerChanson(chanson: Chanson) {
    const params = new URLSearchParams();

    params.set("titre", chanson.title);
    params.set("artiste", chanson.artist ?? "");
    params.set("songId", chanson.id.toString());
    params.set("launchId", crypto.randomUUID());

    if (chanson.video_url) {
      params.set("video", chanson.video_url);
    }

    if (chanson.karaoke_url) {
      params.set("karaoke", chanson.karaoke_url);
    }

    window.location.href = `/regie/lecteur?${params.toString()}`;
  }

  return (
    <main className="min-h-screen bg-black text-white p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => (window.location.href = "/regie")}
          className="text-gray-400 hover:text-white mb-6"
        >
          ← Retour à la régie
        </button>

        <h1 className="text-3xl font-bold text-green-400 mb-2">
          🎤 Répétition
        </h1>

        <p className="text-gray-400 mb-6">
          Les chansons les moins répétées apparaissent en premier.
        </p>

        <input
          type="text"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher une chanson ou un artiste..."
          className="w-full bg-[#111] border border-gray-700 rounded-xl p-3 mb-6 text-white"
        />

        {chargement ? (
          <p className="text-gray-400">Chargement du catalogue...</p>
        ) : chansonsFiltrees.length === 0 ? (
          <p className="text-gray-400">Aucune chanson trouvée.</p>
        ) : (
          <div className="space-y-3">
            {chansonsFiltrees.map((chanson) => {
              const statut = statuts[chanson.id] ?? "a_revoir";
              const enSauvegarde = sauvegardeEnCours === chanson.id;

              return (
                <div
                  key={chanson.id}
                  className="bg-[#111] border border-gray-800 rounded-xl p-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="font-bold text-lg">{chanson.title}</h2>
                      <p className="text-gray-400 text-sm">
                        {chanson.artist ?? "Artiste inconnu"}
                      </p>
                      <p className="text-green-400 text-sm mt-1">
                        {chanson.nombre_repetitions ?? 0} répétition(s)
                      </p>
                    </div>

                    <button
                      onClick={() => lancerChanson(chanson)}
                      disabled={!chanson.video_url && !chanson.karaoke_url}
                      className="bg-green-900/40 border border-green-700 text-green-300 hover:bg-green-800 disabled:opacity-40 px-4 py-2 rounded-lg"
                    >
                      ▶️ Répéter
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-4">
                    <button
                      onClick={() => void changerStatut(chanson.id, "maitrisee")}
                      disabled={enSauvegarde}
                      className={`px-3 py-2 rounded-lg border text-sm ${
                        statut === "maitrisee"
                          ? "bg-green-700 border-green-500 text-white"
                          : "border-gray-700 text-gray-300 hover:border-green-500"
                      } disabled:opacity-50`}
                    >
                      ✅ Maîtrisée
                    </button>

                    <button
                      onClick={() => void changerStatut(chanson.id, "a_revoir")}
                      disabled={enSauvegarde}
                      className={`px-3 py-2 rounded-lg border text-sm ${
                        statut === "a_revoir"
                          ? "bg-amber-800 border-amber-500 text-white"
                          : "border-gray-700 text-gray-300 hover:border-amber-500"
                      } disabled:opacity-50`}
                    >
                      🔄 À revoir
                    </button>

                    <span className="text-xs text-gray-500">
                      {enSauvegarde
                        ? "Enregistrement..."
                        : statut === "maitrisee"
                          ? "Chanson maîtrisée"
                          : "À travailler"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
