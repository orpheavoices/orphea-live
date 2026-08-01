"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function DemandePage() {
  const searchParams = useSearchParams();

  const titre = searchParams.get("titre") || "";
  const artiste = searchParams.get("artiste") || "";

  const [prenom, setPrenom] = useState("");
  const [dedicace, setDedicace] = useState("");
  const [message, setMessage] = useState("");
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  async function envoyerDemande() {
    if (!prenom.trim()) {
      alert("Veuillez indiquer votre prénom.");
      return;
    }

    setEnvoiEnCours(true);

    // Recherche de la soirée ouverte
    const { data: soiree, error: erreurSoiree } = await supabase
      .from("soirees")
      .select("id")
      .eq("statut", "ouverte")
      .maybeSingle();

    if (erreurSoiree || !soiree) {
      setEnvoiEnCours(false);
      alert("Aucune soirée n'est actuellement ouverte.");
      return;
    }

    // Enregistrement de la demande
    const { error } = await supabase.from("demandes").insert({
      titre,
      artiste,
      prenom,
      dedicace,
      message,
      statut: "En attente",
      soiree_id: soiree.id,
    });

    setEnvoiEnCours(false);

    if (error) {
      console.error(error);
      alert("Une erreur est survenue.");
      return;
    }

    alert("🎉 Votre demande a bien été envoyée !");

    setPrenom("");
    setDedicace("");
    setMessage("");
  }

  return (
    <main className="min-h-screen bg-slate-900 flex justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl p-10 w-full max-w-2xl">

        <h1 className="text-4xl font-bold text-slate-900 mb-2">
          🎤 Demande de chanson
        </h1>

        <div className="mb-8">
          <h2 className="text-2xl font-bold">{titre}</h2>
          <p className="text-gray-600">🎤 {artiste}</p>
        </div>

        <div className="space-y-6">

          <div>
            <label className="block font-semibold mb-2">
              Votre prénom <span className="text-red-600">*</span>
            </label>

            <input
              type="text"
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              className="w-full border border-gray-300 rounded-xl p-3"
              placeholder="Votre prénom"
            />
          </div>

          <div>
            <label className="block font-semibold mb-2">
              Dédicace (facultatif)
            </label>

            <input
              type="text"
              value={dedicace}
              onChange={(e) => setDedicace(e.target.value)}
              className="w-full border border-gray-300 rounded-xl p-3"
              placeholder="À qui souhaitez-vous dédier cette chanson ?"
            />
          </div>

          <div>
            <label className="block font-semibold mb-2">
              Votre message (facultatif)
            </label>

            <textarea
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full border border-gray-300 rounded-xl p-3"
              placeholder="Ex. Joyeux anniversaire ! Passe une excellente soirée..."
            />
          </div>

          <button
            onClick={envoyerDemande}
            disabled={envoiEnCours}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-bold py-4 rounded-xl"
          >
            {envoiEnCours ? "Envoi..." : "❤️ Envoyer la demande"}
          </button>

        </div>

      </div>
    </main>
  );
}