"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Demande = {
  id: number;
  titre: string;
  artiste: string;
  prenom: string;
  dedicace: string;
  message: string;
  statut: string;
  created_at: string;
};

export default function RegiePage() {
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [chargement, setChargement] = useState(true);

  async function chargerDemandes() {
    const { data, error } = await supabase
      .from("demandes")
      .select("*")
      .eq("statut", "En attente")
      .order("created_at", { ascending: true });

    if (!error && data) {
      setDemandes(data);
    }

    setChargement(false);
  }

  useEffect(() => {
    chargerDemandes();
  }, []);

  return (
    <main className="min-h-screen bg-slate-900 p-8">

      <div className="max-w-5xl mx-auto">

        <h1 className="text-4xl font-bold text-white mb-2">
          🎤 ORPHEA LIVE
        </h1>

        <p className="text-slate-300 mb-8">
          Régie - Demandes en attente
        </p>

        {chargement ? (
          <div className="text-white">
            Chargement...
          </div>
        ) : demandes.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center">
            Aucune demande.
          </div>
        ) : (
          <div className="space-y-4">

            {demandes.map((demande) => (

              <div
                key={demande.id}
                className="bg-white rounded-2xl p-6 shadow-lg"
              >

                <h2 className="text-2xl font-bold">
                  {demande.titre}
                </h2>

                <p className="text-gray-600 mb-4">
                  🎤 {demande.artiste}
                </p>

                <p>
                  <strong>Demandé par :</strong> {demande.prenom}
                </p>

                {demande.dedicace && (
                  <p>
                    ❤️ {demande.dedicace}
                  </p>
                )}

                {demande.message && (
                  <p className="italic text-gray-600 mt-2">
                    {demande.message}
                  </p>
                )}

              </div>

            ))}

          </div>
        )}

      </div>

    </main>
  );
}