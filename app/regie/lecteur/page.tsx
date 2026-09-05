"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { supabase } from "@/lib/supabase";

function Lecteur() {
  const searchParams = useSearchParams();

  const titre = searchParams.get("titre") || "Chanson";
  const artiste = searchParams.get("artiste") || "";
  const video = searchParams.get("video") || "";
  const karaoke = searchParams.get("karaoke") || "";
  const demandeId = searchParams.get("demandeId") || "";

  const [terminaisonEnCours, setTerminaisonEnCours] = useState(false);

  /*
   * Détermine si le lien est un lien YouTube
   */
  function estYouTube(url: string) {
    return (
      url.includes("youtube.com") ||
      url.includes("youtu.be")
    );
  }

  /*
   * Transforme un lien YouTube en URL utilisable
   * dans une iframe YouTube.
   */
  function obtenirYouTubeEmbed(url: string) {
    try {
      const urlObj = new URL(url);

      // youtube.com/watch?v=XXXXXXXX
      const videoId = urlObj.searchParams.get("v");

      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
      }

      // youtu.be/XXXXXXXX
      if (urlObj.hostname === "youtu.be") {
        const videoIdCourt = urlObj.pathname.replace("/", "");

        if (videoIdCourt) {
          return `https://www.youtube.com/embed/${videoIdCourt}?autoplay=1&rel=0`;
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /*
   * Priorité :
   * 1. vidéo locale
   * 2. YouTube
   * 3. autre URL
   */
  const source = video || karaoke;

  const youtubeEmbed =
    !video && karaoke && estYouTube(karaoke)
      ? obtenirYouTubeEmbed(karaoke)
      : null;

  async function terminer() {
    if (!demandeId) {
      alert("Impossible d'identifier la demande.");
      return;
    }

    setTerminaisonEnCours(true);

    const { error } = await supabase
      .from("demandes")
      .update({
        statut: "Terminée",
      })
      .eq("id", demandeId);

    if (error) {
      console.error("Erreur lors de la clôture :", error);

      setTerminaisonEnCours(false);

      alert(
        `Impossible de terminer la demande.\n\n${error.message}`
      );

      return;
    }

    window.location.href = "/regie";
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white">

      <div className="min-h-screen border border-[#c9a227]">

        {/* HEADER */}
        <header className="bg-black border-b border-[#c9a227]/40">
          <div className="max-w-7xl mx-auto px-5 py-5">

            <div className="flex justify-center">
              <img
                src="/images/orphea-logo.png"
                alt="Orphea Live"
                className="h-24 md:h-28 w-auto object-contain"
              />
            </div>

          </div>
        </header>

        {/* CONTENU */}
        <div className="max-w-7xl mx-auto px-5 py-8">

          {/* TITRE */}
          <div className="text-center mb-7">

            <p className="text-[#d4af37] uppercase tracking-[0.3em] text-sm mb-3">
              En direct
            </p>

            <h1 className="text-3xl md:text-5xl font-bold text-[#f0d36b]">
              {titre}
            </h1>

            <p className="text-gray-300 text-xl mt-2">
              {artiste}
            </p>

          </div>

          {/* LECTEUR */}
          {youtubeEmbed ? (

            /* YOUTUBE */
            <div className="max-w-6xl mx-auto">

              <div className="bg-black border border-[#333] rounded-2xl overflow-hidden shadow-2xl">

                <iframe
                  src={youtubeEmbed}
                  title={`${titre} - ${artiste}`}
                  className="w-full aspect-video"
                  allow="autoplay; encrypted-media; fullscreen"
                  allowFullScreen
                />

              </div>

              <div className="text-center mt-4">

                <p className="text-red-400 text-sm">
                  ▶️ Karaoké YouTube
                </p>

              </div>

              <div className="flex justify-center mt-7">

                <button
                  onClick={terminer}
                  disabled={terminaisonEnCours}
                  className="bg-green-700 hover:bg-green-600 disabled:bg-gray-600 text-white font-bold text-lg px-10 py-4 rounded-xl transition"
                >
                  {terminaisonEnCours
                    ? "⏳ Clôture en cours..."
                    : "✓ TERMINER LA CHANSON"}
                </button>

              </div>

            </div>

          ) : source ? (

            /* VIDÉO LOCALE OU URL DIRECTE */
            <div className="max-w-6xl mx-auto">

              <div className="bg-black border border-[#333] rounded-2xl overflow-hidden shadow-2xl">

                <video
                  src={source}
                  controls
                  autoPlay
                  playsInline
                  className="w-full max-h-[70vh] bg-black"
                />

              </div>

              <div className="text-center mt-4">

                {video ? (
                  <p className="text-green-400 text-sm">
                    🎬 Vidéo locale
                  </p>
                ) : (
                  <p className="text-gray-500 text-sm">
                    🔗 Karaoké en ligne
                  </p>
                )}

              </div>

              <div className="flex justify-center mt-7">

                <button
                  onClick={terminer}
                  disabled={terminaisonEnCours}
                  className="bg-green-700 hover:bg-green-600 disabled:bg-gray-600 text-white font-bold text-lg px-10 py-4 rounded-xl transition"
                >
                  {terminaisonEnCours
                    ? "⏳ Clôture en cours..."
                    : "✓ TERMINER LA CHANSON"}
                </button>

              </div>

            </div>

          ) : (

            /* AUCUNE SOURCE */
            <div className="max-w-xl mx-auto text-center">

              <div className="bg-[#1a1212] border border-[#8f1d24] rounded-2xl p-8">

                <p className="text-red-300 text-lg">
                  Aucun karaoké disponible pour cette chanson.
                </p>

              </div>

              <button
                onClick={terminer}
                disabled={terminaisonEnCours}
                className="mt-6 bg-[#222] hover:bg-[#333] border border-[#555] text-white font-bold px-8 py-4 rounded-xl transition"
              >
                ← Retour à la régie
              </button>

            </div>

          )}

        </div>

      </div>

    </main>
  );
}

export default function LecteurPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
          <p className="text-gray-400">
            Chargement du lecteur...
          </p>
        </main>
      }
    >
      <Lecteur />
    </Suspense>
  );
}