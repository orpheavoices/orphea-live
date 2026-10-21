
"use client";

import { useState } from "react";

export default function ConnexionRegie() {
  const [password, setPassword] = useState("");
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(false);

  async function seConnecter(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur("");
    setChargement(true);

    try {
      const reponse = await fetch("/api/regie-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (reponse.ok) {
        window.location.href = "/regie";
      } else {
        setErreur(
          reponse.status === 401
            ? "Mot de passe incorrect."
            : "Impossible de se connecter. Réessaie."
        );
      }
    } catch {
      setErreur("Erreur de connexion. Vérifie ta connexion Internet.");
    } finally {
      setChargement(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <form
        onSubmit={seConnecter}
        className="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900 p-8 space-y-5"
      >
        <h1 className="text-2xl font-bold text-center">
          Accès à la régie
        </h1>

        <label className="block space-y-2">
          <span>Mot de passe</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-600 bg-black px-4 py-3 text-white"
          />
        </label>

        {erreur && (
          <p role="alert" className="text-red-400">
            {erreur}
          </p>
        )}

        <button
          type="submit"
          disabled={chargement}
          className="w-full rounded-lg bg-green-500 px-4 py-3 font-bold text-black disabled:opacity-50"
        >
          {chargement ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </main>
  );
}
