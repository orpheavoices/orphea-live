"use client";

import Link from "next/link";
import { useState } from "react";
import { chansons } from "@/data/chansons";

export default function RecherchePage() {
  const [titreRecherche, setTitreRecherche] = useState("");
  const [artisteRecherche, setArtisteRecherche] = useState("");

  const chansonsFiltrees = chansons.filter((chanson) => {
    const correspondTitre = chanson.titre
      .toLowerCase()
      .includes(titreRecherche.toLowerCase());

    const correspondArtiste = chanson.artiste
      .toLowerCase()
      .includes(artisteRecherche.toLowerCase());

    return correspondTitre && correspondArtiste;
  });

  return (
    <main className="min-h-screen bg-slate-900 flex justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl p-10 w-full max-w-3xl">
        <h1 className="text-4xl font-bold text-slate-900 mb-8">
          🔍 Rechercher une chanson
        </h1>

        <div className="space-y-6">
          <div>
            <label className="block font-semibold mb-2">
              Titre
            </label>

            <input
              type="text"
              placeholder="Ex. L'envie"
              value={titreRecherche}
              onChange={(e) => setTitreRecherche(e.target.value)}
              className="w-full border border-gray-300 rounded-xl p-3 text-slate-900"
            />
          </div>

          <div>
            <label className="block font-semibold mb-2">
              Artiste
            </label>

            <input
              type="text"
              placeholder="Ex. Johnny Hallyday"
              value={artisteRecherche}
              onChange={(e) => setArtisteRecherche(e.target.value)}
              className="w-full border border-gray-300 rounded-xl p-3 text-slate-900"
            />
          </div>

          <button
            type="button"
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl"
          >
            Rechercher
          </button>
        </div>

        <div className="mt-10">
          <h2 className="text-2xl font-bold mb-4">
            Résultats ({chansonsFiltrees.length})
          </h2>

          {chansonsFiltrees.map((chanson) => (
            <div
              key={`${chanson.titre}-${chanson.artiste}`}
              className="border rounded-xl p-4 mb-4"
            >
              <h3 className="text-xl font-bold">
                {chanson.titre}
              </h3>

              <p>🎤 {chanson.artiste}</p>

              <div className="mt-4">
                <Link
                  href={`/demande?titre=${encodeURIComponent(
                    chanson.titre
                  )}&artiste=${encodeURIComponent(
                    chanson.artiste
                  )}`}
                  className="inline-block bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-3 rounded-xl"
                >
                  ❤️ Demander
                </Link>
              </div>
            </div>
          ))}

          {chansonsFiltrees.length === 0 && (
            <p className="text-center text-gray-500 mt-8">
              Aucune chanson trouvée.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}