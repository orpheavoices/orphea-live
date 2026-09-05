"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function DemandeForm() {
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
    <main className="min-h-screen bg-[#080808] text-white">

      {/* CADRE OR */}
      <div className="min-h-screen border border-[#c9a227]">

        {/* HEADER */}
        <header className="border-b border-[#c9a227]/40 bg-black">
          <div className="max-w-3xl mx-auto px-5 py-5">

            <div className="flex justify-center">
              <img
                src="/images/orphea-logo.png"
                alt="Orphea Live"
                className="h-28 md:h-36 w-auto object-contain"
              />
            </div>

          </div>
        </header>

        {/* CONTENU */}
        <div className="max-w-2xl mx-auto px-5 py-8 md:py-12">

          {/* TITRE */}
          <div className="text-center mb-8">

            <p className="text-[#d4af37] uppercase tracking-[0.3em] text-sm mb-3">
              Votre choix
            </p>

            <h1 className="text-3xl md:text-4xl font-bold text-white">
              Demandez votre chanson
            </h1>

            <div className="flex justify-center items-center gap-4 mt-4">
              <span className="h-px w-14 bg-[#d4af37]" />
              <span className="text-[#d4af37] text-xl">♪</span>
              <span className="h-px w-14 bg-[#d4af37]" />
            </div>

          </div>

          {/* CHANSON CHOISIE */}
          <section className="bg-[#111111] border border-[#c9a227]/70 rounded-2xl p-6 mb-6 shadow-xl">

            <p className="text-[#d4af37] uppercase tracking-widest text-xs font-semibold mb-3">
              Vous avez choisi
            </p>

            <h2 className="text-2xl md:text-3xl font-bold text-[#f0d36b]">
              {titre}
            </h2>

            <p className="text-gray-300 text-lg mt-2">
              🎤 {artiste}
            </p>

          </section>

          {/* FORMULAIRE */}
          <section className="bg-[#111111] border border-[#333] rounded-2xl p-6 md:p-7 shadow-xl">

            <h2 className="text-xl font-bold text-[#d4af37] mb-6">
              Personnalisez votre demande
            </h2>

            <div className="space-y-6">

              {/* PRÉNOM */}
              <div>

                <label className="block font-semibold text-gray-200 mb-2">
                  Votre prénom{" "}
                  <span className="text-red-500">*</span>
                </label>

                <input
                  type="text"
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  className="w-full bg-[#080808] border border-[#555] focus:border-[#d4af37] rounded-xl p-3.5 text-white placeholder-gray-500 outline-none transition"
                  placeholder="Votre prénom"
                />

              </div>

              {/* DÉDICACE */}
              <div>

                <label className="block font-semibold text-gray-200 mb-2">
                  Dédicace{" "}
                  <span className="text-gray-500 font-normal">
                    (facultatif)
                  </span>
                </label>

                <input
                  type="text"
                  value={dedicace}
                  onChange={(e) => setDedicace(e.target.value)}
                  className="w-full bg-[#080808] border border-[#555] focus:border-[#d4af37] rounded-xl p-3.5 text-white placeholder-gray-500 outline-none transition"
                  placeholder="À qui souhaitez-vous dédier cette chanson ?"
                />

              </div>

              {/* MESSAGE */}
              <div>

                <label className="block font-semibold text-gray-200 mb-2">
                  Votre message{" "}
                  <span className="text-gray-500 font-normal">
                    (facultatif)
                  </span>
                </label>

                <textarea
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-[#080808] border border-[#555] focus:border-[#d4af37] rounded-xl p-3.5 text-white placeholder-gray-500 outline-none transition resize-none"
                  placeholder="Ex. Joyeux anniversaire ! Passe une excellente soirée..."
                />

              </div>

              {/* INFO */}
              <div className="bg-[#1a1212] border border-[#6e1c22] rounded-xl p-4">

                <p className="text-gray-300 text-sm leading-relaxed">
                  ❤️ Votre demande est gratuite.
                  <br />
                  Votre dédicace sera lue lors de la prestation.
                </p>

              </div>

              {/* BOUTON ENVOI */}
              <button
                onClick={envoyerDemande}
                disabled={envoiEnCours}
                className="w-full bg-[#d4af37] hover:bg-[#f0d36b] disabled:bg-[#555] disabled:text-gray-300 text-black font-bold py-4 rounded-xl transition text-lg"
              >
                {envoiEnCours
                  ? "Envoi en cours..."
                  : "🎤 Envoyer ma demande"}
              </button>

              {/* RETOUR RECHERCHE */}
              <Link
                href="/recherche"
                className="block w-full text-center border border-[#555] hover:border-[#d4af37] text-gray-300 hover:text-[#d4af37] font-semibold py-3 rounded-xl transition"
              >
                ← Retour au choix des chansons
              </Link>

            </div>

          </section>

          {/* FOOTER */}
          <footer className="text-center mt-12 pb-6">

            <div className="flex justify-center items-center gap-4 mb-4">
              <span className="h-px w-14 bg-[#c9a227]" />
              <span className="text-[#d4af37] text-xl">♪</span>
              <span className="h-px w-14 bg-[#c9a227]" />
            </div>

            <p className="text-gray-500 text-sm">
              Orphea Live
            </p>

          </footer>

        </div>
      </div>
    </main>
  );
}

export default function DemandePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#080808] text-white flex items-center justify-center">
          <p className="text-[#d4af37]">
            Chargement...
          </p>
        </main>
      }
    >
      <DemandeForm />
    </Suspense>
  );
}