"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ChanteurPage() {
  const [demandes, setDemandes] = useState<any[]>([]);
  const [soiree, setSoiree] = useState<any>(null);

  async function chargerDemandes(soireeId: number) {
    const { data } = await supabase
      .from("demandes")
      .select("*")
      .eq("soiree_id", soireeId)
      .order("created_at", { ascending: true });

    if (data) {
      setDemandes(data);
    }
  }

  async function verifierSoiree() {
    const { data } = await supabase
      .from("soirees")
      .select("*")
      .eq("statut", "ouverte")
      .maybeSingle();

    setSoiree(data);

    if (data) {
      chargerDemandes(data.id);
    } else {
      setDemandes([]);
    }
  }

  async function demarrerSoiree() {
    const { data, error } = await supabase
      .from("soirees")
      .insert({
        statut: "ouverte",
        date_debut: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    setSoiree(data);
    chargerDemandes(data.id);
  }

  async function terminerSoiree() {
    if (!soiree) return;

    const { error } = await supabase
      .from("soirees")
      .update({
        statut: "terminee",
        date_fin: new Date().toISOString(),
      })
      .eq("id", soiree.id);

    if (error) {
      alert(error.message);
      return;
    }

    setSoiree(null);
    setDemandes([]);
  }
  async function chanter(demande: any) {
    // Cherche la chanson dans le catalogue
    const { data: chanson, error: chansonError } = await supabase
      .from("songs")
      .select("title, artist, karaoke_url, video_url")
      .eq("title", demande.titre)
      .eq("artist", demande.artiste)
      .maybeSingle();

    if (chansonError) {
      console.error("Erreur lors de la recherche de la chanson :", chansonError);
      alert("Impossible de récupérer les informations de la chanson.");
      return;
    }

    if (!chanson) {
      alert(
        `La chanson "${demande.titre}" de ${demande.artiste} n'a pas été trouvée dans le catalogue.`
      );
      return;
    }

    // Passe la demande en cours
    const { error: statutError } = await supabase
      .from("demandes")
      .update({
        statut: "En cours",
      })
      .eq("id", demande.id);

    if (statutError) {
      console.error("Erreur lors de la mise à jour de la demande :", statutError);
      alert("Impossible de démarrer la chanson.");
      return;
    }

    // Prépare l'adresse du lecteur
    const params = new URLSearchParams({
      titre: demande.titre || chanson.title || "",
      artiste: demande.artiste || chanson.artist || "",
      video: chanson.video_url || "",
      karaoke: chanson.karaoke_url || "",
      demandeId: String(demande.id),
    });

    window.location.href = `/regie/lecteur?${params.toString()}`;
  }
  useEffect(() => {
    verifierSoiree();

    const channel = supabase
      .channel("demandes-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "demandes",
        },
        () => {
          verifierSoiree();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (!soiree) {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="bg-white rounded-3xl p-10 text-center shadow-2xl w-full max-w-md">
          <h1 className="text-4xl font-bold mb-8">🎤 ORPHEA LIVE</h1>

          <p className="text-gray-600 mb-8">
            Aucune soirée en cours
          </p>

          <button
            onClick={demarrerSoiree}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold text-lg"
          >
            ▶ Démarrer une soirée
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-900 p-8">

      <div className="flex justify-between items-center mb-8">

        <h1 className="text-4xl font-bold text-white">
          🎤 Console Live
        </h1>

        <div className="flex gap-3">

          <span className="bg-green-600 text-white px-4 py-2 rounded-full">
            🟢 Soirée en cours
          </span>

          <button
            onClick={terminerSoiree}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-bold"
          >
            ⏹ Terminer la soirée
          </button>

        </div>

      </div>

      <div className="grid gap-6">

        {demandes.length === 0 && (
          <div className="bg-white rounded-2xl p-8 text-center">
            Aucune demande pour cette soirée.
          </div>
        )}

        {demandes.map((demande) => (
          <div
            key={demande.id}
            className="bg-white rounded-2xl p-6 shadow-xl"
          >
            <h2 className="text-2xl font-bold">
              {demande.titre}
            </h2>

            <p className="text-gray-600 mb-3">
              {demande.artiste}
            </p>

            <p>👤 {demande.prenom}</p>

            {demande.dedicace && (
              <p className="mt-2">
                ❤️ {demande.dedicace}
              </p>
            )}

            <button
  onClick={() => chanter(demande)}
  className="mt-6 w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold"
>
  🎤 Je chante
</button>

          </div>
        ))}

      </div>

    </main>
  );
}