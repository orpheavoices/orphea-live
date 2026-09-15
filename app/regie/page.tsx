"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Demande = {
  id: number;
  titre: string;
  artiste: string;
  prenom: string;
  dedicace: string | null;
  message: string | null;
  statut: string | null;
  soiree_id: number;
  karaoke_url: string | null;
  video_url: string | null;
  presentation: string | null;
};

type Chanson = {
  id: number;
  title: string;
  artist: string;
  year: number | null;
  duration: number | null;
  difficulty: number | null;
  status: string | null;
  favorite: boolean | null;
  notes: string | null;
  langue: string | null;
  presentation: string | null;
  interpretation: string | null;
  karaoke_url: string | null;
  video_url: string | null;
  decade: string | null;
  derniere_repetition: string | null;
nombre_repetitions: number | null;
  actif: boolean;
};

export default function RegiePage() {
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [chansons, setChansons] = useState<Chanson[]>([]);

  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [soireeId, setSoireeId] = useState<number | null>(null);
  const [soireeDateDebut, setSoireeDateDebut] = useState<string | null>(null);
  const [gestionSoireeEnCours, setGestionSoireeEnCours] = useState(false);

  const [rechercheCatalogue, setRechercheCatalogue] = useState("");
  const [afficherFormulaire, setAfficherFormulaire] = useState(false);
  const [chansonEnEdition, setChansonEnEdition] =
    useState<Chanson | null>(null);

  const [titre, setTitre] = useState("");
  const [artiste, setArtiste] = useState("");
  const [annee, setAnnee] = useState("");
  const [duree, setDuree] = useState("");
  const [difficulte, setDifficulte] = useState("");
  const [statutChanson, setStatutChanson] = useState("");
  const [favorite, setFavorite] = useState(false);
  const [notes, setNotes] = useState("");
  const [langue, setLangue] = useState("");
  const [presentation, setPresentation] = useState("");
  const [interpretation, setInterpretation] = useState("");
  const [karaokeUrl, setKaraokeUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [decade, setDecade] = useState("");

  const [enregistrementEnCours, setEnregistrementEnCours] =
    useState(false);

  async function chargerDemandes() {
    setChargement(true);
    setErreur("");

    const { data: soiree, error: erreurSoiree } = await supabase
      .from("soirees")
      .select("id, date_debut")
      .eq("statut", "ouverte")
      .order("date_debut", { ascending: false })
      .limit(1)
      .maybeSingle();
      

    if (erreurSoiree) {
      setErreur("ERREUR SOIREE : " + erreurSoiree.message + " | Code : " + erreurSoiree.code + " | Details : " + erreurSoiree.details + " | Hint : " + erreurSoiree.hint);
      setErreur("Impossible de rechercher la soirée ouverte.");
      setDemandes([]);
      setChargement(false);
      return;
    }

    if (!soiree) {
      setSoireeId(null);
      setSoireeDateDebut(null);
      setDemandes([]);
      setChargement(false);
      return;
    }

    setSoireeId(soiree.id);
setSoireeDateDebut(soiree.date_debut ?? null);
    const { data: demandesData, error: demandesError } = await supabase
      .from("demandes")
      .select(
  "id, titre, artiste, prenom, dedicace, message, statut, soiree_id")
      .eq("soiree_id", soiree.id)
      .order("id", { ascending: true });

    if (demandesError) {
      console.error(demandesError);
      setErreur("Impossible de charger les demandes.");
      setDemandes([]);
      setChargement(false);
      return;
    }

    const { data: chansonsData, error: chansonsError } = await supabase
      .from("songs")
      .select("title, artist, karaoke_url, video_url, presentation");

    if (chansonsError) {
      console.error(chansonsError);
      setErreur(
        "ERREUR CATALOGUE : " + chansonsError.message + " | Code : " + chansonsError.code + " | Details : " + chansonsError.details + " | Hint : " + chansonsError.hint
      );
    }

    const demandesAvecKaraoke: Demande[] = (demandesData ?? []).map(
      (demande) => {
        const chanson = (chansonsData ?? []).find(
          (song) =>
            song.title.toLowerCase().trim() ===
              demande.titre.toLowerCase().trim() &&
            song.artist.toLowerCase().trim() ===
              demande.artiste.toLowerCase().trim()
        );

        return {
          ...demande,
          karaoke_url: chanson?.karaoke_url ?? null,
          video_url: chanson?.video_url ?? null,
          presentation: chanson?.presentation ?? null,
        };
        
      }
    );

    setDemandes(demandesAvecKaraoke);
    setChargement(false);
  }
async function basculerActif(chanson: Chanson) {
  const nouvelEtat = !chanson.actif;

  const { error } = await supabase
    .from("songs")
    .update({ actif: nouvelEtat })
    .eq("id", chanson.id);

  if (error) {
    setErreur("Impossible de modifier le statut de la chanson.");
    return;
  }

  setChansons(anciennes =>
    anciennes.map(c =>
      c.id === chanson.id
        ? { ...c, actif: nouvelEtat }
        : c
    )
  );
}
  async function chargerCatalogue() {
    const { data, error } = await supabase
      .from("songs")
      .select(
        "id, title, artist, year, duration, difficulty, status, favorite, notes, langue, presentation, interpretation, karaoke_url, video_url, decade,actif,derniere_repetition,nombre_repetitions"
      )
      .order("title", { ascending: true });

    if (error) {
      setErreur("ERREUR CATALOGUE : " + error.message + " | Code : " + error.code + " | Details : " + error.details + " | Hint : " + error.hint);
      setErreur("Impossible de charger le catalogue.");
      return;
    }

    setChansons(data ?? []);
  }

   async function chargerTout() {
  await Promise.all([chargerDemandes(), chargerCatalogue()]);
}

async function demarrerSoiree() {
  setGestionSoireeEnCours(true);
  setErreur("");

  // Fermer toute ancienne soirée encore ouverte
  const { error: erreurFermeture } = await supabase
    .from("soirees")
    .update({
      statut: "terminee",
      date_fin: new Date().toISOString(),
    })
    .eq("statut", "ouverte");

  if (erreurFermeture) {
    console.error("ERREUR FERMETURE SOIREE :", erreurFermeture);
    setErreur("Impossible de fermer l'ancienne soirée.");
    setGestionSoireeEnCours(false);
    return;
  }

  const { data, error } = await supabase
    .from("soirees")
    .insert({
      statut: "ouverte",
      date_debut: new Date().toISOString(),
    })
    .select("id, date_debut")
    .single();

  if (error) {
    console.error("ERREUR SOIREE :", { message: error.message, code: error.code, details: error.details, hint: error.hint });
    setErreur("ERREUR SUPABASE : " + error.message + " | Code : " + error.code + " | Details : " + error.details + " | Hint : " + error.hint);
    setGestionSoireeEnCours(false);
    return;
  }

  setSoireeId(data.id);
  setSoireeDateDebut(data.date_debut ?? null);
  setDemandes([]);

  setGestionSoireeEnCours(false);

  await chargerDemandes();
}

async function terminerSoiree() {
  if (!soireeId) return;

  setGestionSoireeEnCours(true);
  setErreur("");

  const { error } = await supabase
    .from("soirees")
    .update({
      statut: "terminee",
      date_fin: new Date().toISOString(),
    })
    .eq("id", soireeId);

  if (error) {
    console.error(error);
    setErreur("Impossible de terminer la soirée.");
    setGestionSoireeEnCours(false);
    return;
  }

  setSoireeId(null);
  setSoireeDateDebut(null);
  setDemandes([]);

  setGestionSoireeEnCours(false);
}

async function terminerEtDemarrerNouvelleSoiree() {
  if (!soireeId) {
    await demarrerSoiree();
    return;
  }

  setGestionSoireeEnCours(true);
  setErreur("");

  const { error: erreurFin } = await supabase
    .from("soirees")
    .update({
      statut: "terminee",
      date_fin: new Date().toISOString(),
    })
    .eq("id", soireeId);

  if (erreurFin) {
    console.error(erreurFin);
    setErreur("Impossible de terminer l'ancienne soirée.");
    setGestionSoireeEnCours(false);
    return;
  }

  const { data, error: erreurNouvelle } = await supabase
    .from("soirees")
    .insert({
      statut: "ouverte",
      date_debut: new Date().toISOString(),
    })
    .select("id, date_debut")
    .single();

  if (erreurNouvelle) {
    console.error(erreurNouvelle);
    setErreur(
      "L'ancienne soirée a été terminée, mais la nouvelle n'a pas pu être créée."
    );
    setSoireeId(null);
    setSoireeDateDebut(null);
    setDemandes([]);
    setGestionSoireeEnCours(false);
    return;
  }

  setSoireeId(data.id);
  setSoireeDateDebut(data.date_debut ?? null);
  setDemandes([]);

  setGestionSoireeEnCours(false);

  await chargerDemandes();
}

useEffect(() => {
  chargerTout();
}, []);
  

  async function changerStatut(id: number, nouveauStatut: string) {
    const { error } = await supabase
      .from("demandes")
      .update({
        statut: nouveauStatut,
      })
      .eq("id", id);

    if (error) {
      console.error(error);
      alert("Impossible de modifier le statut de la demande.");
      return;
    }

    setDemandes((anciennes) =>
      anciennes.map((demande) =>
        demande.id === id
          ? { ...demande, statut: nouveauStatut }
          : demande
      )
    );
  }

 async function chanter(demande: Demande) {
  if (!demande.video_url && !demande.karaoke_url) {
    alert(
      `Aucun karaoké n'est enregistré pour « ${demande.titre} ».`
    );
    return;
  }
      changerStatut(demande.id, "En cours");
  const params = new URLSearchParams();

  params.set("titre", demande.titre);
  params.set("artiste", demande.artiste);
  params.set("demandeId", demande.id.toString());

  if (demande.video_url) {
    params.set("video", demande.video_url);
  }

  if (demande.karaoke_url) {
    params.set("karaoke", demande.karaoke_url);
  }

  window.location.href = `/regie/lecteur?${params.toString()}`;
}

  function nouveauFormulaire() {
    setChansonEnEdition(null);

    setTitre("");
    setArtiste("");
    setAnnee("");
    setDuree("");
    setDifficulte("");
    setStatutChanson("");
    setFavorite(false);
    setNotes("");
    setLangue("");
    setPresentation("");
    setInterpretation("");
    setKaraokeUrl("");
    setVideoUrl("");
    setDecade("");

   setAfficherFormulaire(true);
  }

  function modifierChanson(chanson: Chanson) {
    setChansonEnEdition(chanson);

    setTitre(chanson.title ?? "");
    setArtiste(chanson.artist ?? "");
    setAnnee(chanson.year?.toString() ?? "");
    setDuree(chanson.duration?.toString() ?? "");
    setDifficulte(chanson.difficulty?.toString() ?? "");
    setStatutChanson(chanson.status ?? "");
    setFavorite(chanson.favorite ?? false);
    setNotes(chanson.notes ?? "");
    setLangue(chanson.langue ?? "");
    setPresentation(chanson.presentation ?? "");
    setInterpretation(chanson.interpretation ?? "");
    setKaraokeUrl(chanson.karaoke_url ?? "");
    setVideoUrl(chanson.video_url ?? "");
    setDecade(chanson.decade ?? "");

   setAfficherFormulaire(true);

setTimeout(() => {
  document
    .getElementById("formulaire-chanson")
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}, 100);
  }

  function fermerFormulaire() {
    setAfficherFormulaire(false);
    setChansonEnEdition(null);
  }
  async function enregistrerRepetition(chanson: Chanson) {
  const nouvelleDate = new Date().toISOString().split("T")[0];
  const nouveauNombre = (chanson.nombre_repetitions ?? 0) + 1;

  const { data, error } = await supabase
    .from("songs")
    .update({
      derniere_repetition: nouvelleDate,
      nombre_repetitions: nouveauNombre,
    })
    .eq("id", chanson.id)
    .select("id, derniere_repetition, nombre_repetitions")
    .single();

  if (error) {
    console.error("Erreur enregistrement répétition :", error);
    alert("ERREUR : " + error.message);
    return;
  }

  console.log("Répétition enregistrée :", data);

  setChansons((anciennes) =>
    anciennes.map((c) =>
      c.id === chanson.id
        ? {
            ...c,
            derniere_repetition: nouvelleDate,
            nombre_repetitions: nouveauNombre,
          }
        : c
    )
  );
}
async function supprimerChanson(chanson: Chanson) {
  const confirmation = window.confirm(
    `Voulez-vous vraiment supprimer « ${chanson.title} » de ${chanson.artist} ?\n\nCette action est définitive.`
  );

  if (!confirmation) return;

  const { error } = await supabase
    .from("songs")
    .delete()
    .eq("id", chanson.id);

  if (error) {
    console.error("Erreur suppression :", error);
    alert(`Impossible de supprimer la chanson.\n\n${error.message}`);
    return;
  }

  setChansons((anciennes) =>
    anciennes.filter((c) => c.id !== chanson.id)
  );

  if (chansonEnEdition?.id === chanson.id) {
    fermerFormulaire();
  }

  alert(`« ${chanson.title} » a été supprimée du catalogue.`);
}
  async function enregistrerChanson() {
    if (!titre.trim() || !artiste.trim()) {
      alert("Le titre et l'artiste sont obligatoires.");
      return;
    }

    setEnregistrementEnCours(true);

    const donnees = {
      title: titre.trim(),
      artist: artiste.trim(),
      year: annee ? Number(annee) : null,
      duration: duree ? Number(duree) : null,
      difficulty: difficulte ? Number(difficulte) : null,
      status: statutChanson.trim() || null,
      favorite,
      notes: notes.trim() || null,
      langue: langue.trim() || null,
      presentation: presentation.trim() || null,
      interpretation: interpretation.trim() || null,
      karaoke_url: karaokeUrl.trim() || null,
      video_url: videoUrl.trim() || null,
      decade: decade.trim() || null,
    };

    let error;

    if (chansonEnEdition) {
      const resultat = await supabase
        .from("songs")
        .update(donnees)
        .eq("id", chansonEnEdition.id);

      error = resultat.error;
    } else {
      const resultat = await supabase
        .from("songs")
        .insert(donnees);

      error = resultat.error;
    }

    setEnregistrementEnCours(false);

  if (error) {
  console.error("Erreur Supabase :", error);

  alert(
    `Erreur Supabase :\n\n${error.message}\n\nCode : ${error.code || "inconnu"}`
  );

  return;
}

    alert(
      chansonEnEdition
        ? "La chanson a été modifiée."
        : "La chanson a été ajoutée."
    );

    fermerFormulaire();

    await chargerCatalogue();
    await chargerDemandes();
  }

  const demandesEnAttente = demandes.filter(
    (demande) => demande.statut === "En attente"
  );

  const demandesEnCours = demandes.filter(
    (demande) => demande.statut === "En cours"
  );

  const demandesTerminees = demandes.filter(
    (demande) => demande.statut === "Terminée"
  );

  const chansonsFiltrees = chansons.filter((chanson) => {
    const recherche = rechercheCatalogue.toLowerCase().trim();

    if (!recherche) return true;

    return (
      chanson.title.toLowerCase().includes(recherche) ||
      chanson.artist.toLowerCase().includes(recherche)
    );
  });

  return (
    <main className="min-h-screen bg-[#080808] text-white">
          {/* GESTION DE LA SOIRÉE */}
      <section className="mx-auto max-w-7xl px-6 pt-6">
        <div className="rounded-2xl border border-[#c9a227]/40 bg-black p-5 shadow-xl">

          {!soireeId ? (
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  ⚫ Aucune soirée en cours
                </h2>
                <p className="mt-1 text-gray-400">
                  Prêt à démarrer une nouvelle soirée.
                </p>
              </div>

              <button
                onClick={demarrerSoiree}
                disabled={gestionSoireeEnCours}
                className="rounded-xl bg-green-600 px-6 py-3 font-bold hover:bg-green-700 disabled:opacity-50"
              >
                🎤 Démarrer une nouvelle soirée
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-bold">
                    🟢 Une soirée est ouverte
                  </h2>

                  {soireeDateDebut && (
                    <p className="mt-1 text-gray-400">
                      Début :{" "}
                      {new Date(soireeDateDebut).toLocaleString("fr-BE")}
                    </p>
                  )}
                </div>

                <span className="rounded-full bg-green-600 px-4 py-2 text-sm font-bold">
                  SOIRÉE EN COURS
                </span>
              </div>

              <div className="flex flex-col gap-3 md:flex-row">
                <button
                  onClick={() => chargerDemandes()}
                  disabled={gestionSoireeEnCours}
                  className="rounded-xl bg-blue-600 px-6 py-3 font-bold hover:bg-blue-700 disabled:opacity-50"
                >
                  ▶️ Reprendre cette soirée
                </button>

                <button
                  onClick={terminerEtDemarrerNouvelleSoiree}
                  disabled={gestionSoireeEnCours}
                  className="rounded-xl bg-red-600 px-6 py-3 font-bold hover:bg-red-700 disabled:opacity-50"
                >
                  🔄 Terminer et démarrer une nouvelle soirée
                </button>

                <button
                  onClick={terminerSoiree}
                  disabled={gestionSoireeEnCours}
                  className="rounded-xl border border-gray-500 px-6 py-3 font-bold hover:bg-gray-800 disabled:opacity-50"
                >
                  ⏹️ Terminer la soirée
                </button>
              </div>
            </div>
          )}

        </div>
      </section>

      <div className="min-h-screen border border-[#c9a227]">

        {/* HEADER */}
        <header className="bg-black border-b border-[#c9a227]/40">
          <div className="max-w-7xl mx-auto px-5 py-6">

            <div className="flex flex-col items-center">

              <img
                src="/images/orphea-logo.png"
                alt="Orphea Live"
                className="h-28 md:h-36 w-auto object-contain"
              />

              <p className="text-[#d4af37] uppercase tracking-[0.3em] text-sm mt-3">
                Console de régie
              </p>

            </div>

          </div>
        </header>

        <div className="max-w-7xl mx-auto px-5 py-8 md:py-10">

          {/* TITRE */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-8">

            <div>

              <p className="text-[#d4af37] uppercase tracking-[0.3em] text-sm mb-2">
                Orphea Live
              </p>

              <h1 className="text-3xl md:text-5xl font-bold">
                Console de régie
              </h1>

            </div>

            <button
              onClick={chargerTout}
              className="bg-[#111111] border border-[#555] hover:border-[#d4af37] text-gray-200 font-semibold px-5 py-3 rounded-xl transition"
            >
              ↻ Actualiser
            </button>

          </div>

          {/* STATUT SOIRÉE */}
          <div className="mb-8">

            {soireeId ? (
              <div className="inline-flex items-center gap-3 bg-[#102414] border border-green-700 text-green-300 rounded-xl px-5 py-3">
                <span className="w-3 h-3 bg-green-500 rounded-full" />
                Soirée ouverte
              </div>
            ) : (
              <div className="inline-flex items-center gap-3 bg-[#241010] border border-red-700 text-red-300 rounded-xl px-5 py-3">
                <span className="w-3 h-3 bg-red-500 rounded-full" />
                Aucune soirée ouverte
              </div>
            )}

          </div>

          {/* ERREUR */}
          {erreur && (
            <div className="mb-8 bg-red-950 border border-red-600 text-red-200 rounded-xl p-4">
              {erreur}
            </div>
          )}

          {/* DEMANDES */}
          {chargement ? (
            <div className="text-center py-20 text-gray-400">
              Chargement des demandes...
            </div>
          ) : (
            <>

              {/* EN ATTENTE */}
              <section className="mb-10">

                <div className="flex items-center gap-3 mb-5">

                  <h2 className="text-2xl font-bold">
                    🎤 En attente
                  </h2>

                  <span className="bg-[#d4af37] text-black font-bold px-3 py-1 rounded-full">
                    {demandesEnAttente.length}
                  </span>

                </div>

                {demandesEnAttente.length === 0 ? (
                  <div className="bg-[#111111] border border-[#333] rounded-2xl p-8 text-center text-gray-500">
                    Aucune demande en attente.
                  </div>
                ) : (
                  <div className="space-y-4">

                    {demandesEnAttente.map((demande) => (
                      <article
                        key={demande.id}
                        className="bg-[#111111] border border-[#333] hover:border-[#c9a227] rounded-2xl p-5 md:p-6 shadow-xl"
                      >

                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">

                          <div className="flex-1">

                            <div className="flex flex-wrap items-center gap-3 mb-2">

                              <h3 className="text-2xl font-bold text-[#f0d36b]">
                                {demande.titre}
                              </h3>

                              <span className="bg-[#3b1115] border border-[#8f1d24] text-[#f0d36b] px-3 py-1 rounded-full text-sm">
                                En attente
                              </span>

                            </div>

                            <p className="text-gray-300 text-lg">
                              {demande.artiste}
                            </p>
{demande.presentation && (
  <p className="text-gray-400 mt-2 italic">
    {demande.presentation}
  </p>
)}
                            <p className="text-[#d4af37] font-semibold mt-3">
                              👤 {demande.prenom}
                            </p>

                            {demande.dedicace && (
                              <p className="text-gray-300 mt-3">
                                <span className="text-[#d4af37]">
                                  ❤️ Dédicace :
                                </span>{" "}
                                {demande.dedicace}
                              </p>
                            )}

                            {demande.message && (
                              <p className="text-gray-400 mt-2">
                                <span className="text-[#d4af37]">
                                  💬 Message :
                                </span>{" "}
                                {demande.message}
                              </p>
                            )}

                          </div>

                          <div className="flex flex-col sm:flex-row gap-3">

                            <button
                              onClick={() => chanter(demande)}
                              className="bg-[#d4af37] hover:bg-[#f0d36b] text-black font-bold px-7 py-4 rounded-xl transition text-lg"
                            >
                              🎤 CHANTER
                            </button>

                            <button
                              onClick={() =>
                                changerStatut(demande.id, "Terminée")
                              }
                              className="bg-[#222] hover:bg-[#333] border border-[#555] text-white font-bold px-6 py-4 rounded-xl transition"
                            >
                              ✓ Ignorer
                            </button>

                          </div>

                        </div>

                      </article>
                    ))}

                  </div>
                )}

              </section>

              {/* EN COURS */}
              <section className="mb-10">

                <div className="flex items-center gap-3 mb-5">

                  <h2 className="text-2xl font-bold">
                    🎵 En cours
                  </h2>

                  <span className="bg-[#3b1115] border border-[#8f1d24] text-[#f0d36b] font-bold px-3 py-1 rounded-full">
                    {demandesEnCours.length}
                  </span>

                </div>

                {demandesEnCours.length === 0 ? (
                  <div className="bg-[#111111] border border-[#333] rounded-2xl p-8 text-center text-gray-500">
                    Aucune chanson en cours.
                  </div>
                ) : (
                  <div className="space-y-4">

                    {demandesEnCours.map((demande) => (
                      <article
                        key={demande.id}
                        className="bg-[#1a1212] border border-[#8f1d24] rounded-2xl p-5 md:p-6 shadow-xl"
                      >

                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">

                          <div>

                            <p className="text-[#d4af37] uppercase tracking-widest text-xs font-semibold mb-2">
                              En cours
                            </p>

                            <h3 className="text-2xl font-bold text-white">
                              {demande.titre}
                            </h3>

                            <p className="text-gray-300 mt-1">
                              {demande.artiste}
                            </p>

                            <p className="text-[#d4af37] mt-3">
                              👤 {demande.prenom}
                            </p>

                          </div>

                          <button
                            onClick={() =>
                              changerStatut(demande.id, "Terminée")
                            }
                            className="bg-green-700 hover:bg-green-600 text-white font-bold px-7 py-4 rounded-xl transition"
                          >
                            ✓ TERMINER
                          </button>

                        </div>

                      </article>
                    ))}

                  </div>
                )}

              </section>

              {/* TERMINÉES */}
              <section className="mb-14">

                <div className="flex items-center gap-3 mb-5">

                  <h2 className="text-2xl font-bold">
                    ✓ Terminées
                  </h2>

                  <span className="bg-[#222] border border-[#444] text-gray-300 font-bold px-3 py-1 rounded-full">
                    {demandesTerminees.length}
                  </span>

                </div>

                {demandesTerminees.length === 0 ? (
                  <div className="bg-[#111111] border border-[#333] rounded-2xl p-8 text-center text-gray-500">
                    Aucune demande terminée.
                  </div>
                ) : (
                  <div className="space-y-3">

                    {demandesTerminees.map((demande) => (
                      <div
                        key={demande.id}
                        className="bg-[#0e0e0e] border border-[#222] rounded-xl p-4 opacity-70"
                      >

                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">

                          <div>

                            <span className="font-semibold text-gray-300">
                              {demande.titre}
                            </span>

                            <span className="text-gray-500">
                              {" "}
                              — {demande.artiste}
                            </span>

                          </div>

                          <span className="text-gray-500 text-sm">
                            {demande.prenom}
                          </span>

                        </div>

                      </div>
                    ))}

                  </div>
                )}

              </section>

              {/* GESTION DU CATALOGUE */}
              <section className="border-t border-[#333] pt-10">

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-6">

                  <div>

                    <p className="text-[#d4af37] uppercase tracking-[0.25em] text-sm mb-2">
                      Administration
                    </p>

                    <h2 className="text-3xl font-bold">
                      🎵 Gestion du catalogue
                    </h2>

                  </div>

                  <button
                    onClick={nouveauFormulaire}
                    className="bg-[#d4af37] hover:bg-[#f0d36b] text-black font-bold px-6 py-3 rounded-xl transition"
                  >
                    ＋ Ajouter une chanson
                  </button>
<button
  onClick={() => (window.location.href = "/regie/verification")}
  className="border border-[#d4af37] text-[#d4af37] hover:bg-[#d4af37] hover:text-black font-bold px-6 py-3 rounded-xl transition"
>
  🎬 Vérifier le catalogue
</button>
                </div>

                {/* FORMULAIRE */}
                {afficherFormulaire && (
                  <section id="formulaire-chanson" className="bg-[#111111] border border-[#c9a227]/70 rounded-2xl p-6 md:p-8 mb-8">

                    <div className="flex items-center justify-between gap-4 mb-7">

                      <h3 className="text-2xl font-bold text-[#f0d36b]">
                        {chansonEnEdition
                          ? "✏️ Modifier la chanson"
                          : "➕ Ajouter une chanson"}
                      </h3>

                      <button
                        onClick={fermerFormulaire}
                        className="text-gray-400 hover:text-white text-2xl"
                      >
                        ×
                      </button>

                    </div>

                    <div className="grid md:grid-cols-2 gap-5">

                      {/* TITRE */}
                      <div>
                        <label className="block text-gray-200 font-semibold mb-2">
                          Titre *
                        </label>

                        <input
                          value={titre}
                          onChange={(e) => setTitre(e.target.value)}
                          className="w-full bg-[#080808] border border-[#555] focus:border-[#d4af37] rounded-xl p-3 text-white outline-none"
                        />
                      </div>

                      {/* ARTISTE */}
                      <div>
                        <label className="block text-gray-200 font-semibold mb-2">
                          Artiste *
                        </label>

                        <input
                          value={artiste}
                          onChange={(e) => setArtiste(e.target.value)}
                          className="w-full bg-[#080808] border border-[#555] focus:border-[#d4af37] rounded-xl p-3 text-white outline-none"
                        />
                      </div>

                      {/* ANNÉE */}
                      <div>
                        <label className="block text-gray-200 font-semibold mb-2">
                          Année
                        </label>

                        <input
                          type="number"
                          value={annee}
                          onChange={(e) => setAnnee(e.target.value)}
                          className="w-full bg-[#080808] border border-[#555] rounded-xl p-3 text-white outline-none"
                        />
                      </div>

                      {/* DÉCENNIE */}
                      <div>
                        <label className="block text-gray-200 font-semibold mb-2">
                          Décennie
                        </label>

                        <input
                          value={decade}
                          onChange={(e) => setDecade(e.target.value)}
                          placeholder="Ex. 80, 90, 00, 10"
                          className="w-full bg-[#080808] border border-[#555] rounded-xl p-3 text-white outline-none"
                        />
                      </div>

                      {/* DURÉE */}
                      <div>
                        <label className="block text-gray-200 font-semibold mb-2">
                          Durée
                        </label>

                        <input
                          type="number"
                          value={duree}
                          onChange={(e) => setDuree(e.target.value)}
                          placeholder="En secondes"
                          className="w-full bg-[#080808] border border-[#555] rounded-xl p-3 text-white outline-none"
                        />
                      </div>

                      {/* DIFFICULTÉ */}
                      <div>
                        <label className="block text-gray-200 font-semibold mb-2">
                          Difficulté
                        </label>

                        <input
                          type="number"
                          value={difficulte}
                          onChange={(e) => setDifficulte(e.target.value)}
                          placeholder="1 à 5"
                          className="w-full bg-[#080808] border border-[#555] rounded-xl p-3 text-white outline-none"
                        />
                      </div>

                      {/* LANGUE */}
                      <div>
                        <label className="block text-gray-200 font-semibold mb-2">
                          Langue
                        </label>

                        <input
                          value={langue}
                          onChange={(e) => setLangue(e.target.value)}
                          placeholder="Français, Anglais..."
                          className="w-full bg-[#080808] border border-[#555] rounded-xl p-3 text-white outline-none"
                        />
                      </div>

                      {/* STATUT */}
                      <div>
                        <label className="block text-gray-200 font-semibold mb-2">
                          Statut
                        </label>

                        <input
                          value={statutChanson}
                          onChange={(e) =>
                            setStatutChanson(e.target.value)
                          }
                          className="w-full bg-[#080808] border border-[#555] rounded-xl p-3 text-white outline-none"
                        />
                      </div>

                    </div>

                    {/* PRÉSENTATION */}
                    <div className="mt-5">

                      <label className="block text-gray-200 font-semibold mb-2">
                        Présentation
                      </label>

                      <textarea
                        rows={3}
                        value={presentation}
                        onChange={(e) =>
                          setPresentation(e.target.value)
                        }
                        className="w-full bg-[#080808] border border-[#555] rounded-xl p-3 text-white outline-none resize-none"
                      />

                    </div>

                    {/* INTERPRÉTATION */}
                    <div className="mt-5">

                      <label className="block text-gray-200 font-semibold mb-2">
                        Interprétation
                      </label>

                      <textarea
                        rows={3}
                        value={interpretation}
                        onChange={(e) =>
                          setInterpretation(e.target.value)
                        }
                        className="w-full bg-[#080808] border border-[#555] rounded-xl p-3 text-white outline-none resize-none"
                      />

                    </div>

                    {/* NOTES */}
                    <div className="mt-5">

                      <label className="block text-gray-200 font-semibold mb-2">
                        Notes
                      </label>

                      <textarea
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full bg-[#080808] border border-[#555] rounded-xl p-3 text-white outline-none resize-none"
                      />

                    </div>

                    {/* LIENS */}
                    <div className="grid md:grid-cols-2 gap-5 mt-5">

                      <div>

                        <label className="block text-gray-200 font-semibold mb-2">
                          🔗 Lien karaoké
                        </label>

                        <input
                          type="text"
                          value={karaokeUrl}
                          onChange={(e) =>
                            setKaraokeUrl(e.target.value)
                          }
                          placeholder="https://..."
                          className="w-full bg-[#080808] border border-[#555] focus:border-[#d4af37] rounded-xl p-3 text-white outline-none"
                        />

                      </div>

                      <div>

                        <label className="block text-gray-200 font-semibold mb-2">
                          🎬 Vidéo locale
                        </label>

                        <input
                          type="text"
                          value={videoUrl}
                          onChange={(e) =>
                            setVideoUrl(e.target.value)
                          }
                          placeholder="/karaoke/nom-du-fichier.mp4"
                          className="w-full bg-[#080808] border border-[#555] focus:border-[#d4af37] rounded-xl p-3 text-white outline-none"
                        />

                        <p className="text-gray-500 text-xs mt-2">
                          Exemple : /karaoke/A-Thousand-Years.mp4
                        </p>

                      </div>

                    </div>

                    {/* FAVORI */}
                    <label className="flex items-center gap-3 mt-6 cursor-pointer">

                      <input
                        type="checkbox"
                        checked={favorite}
                        onChange={(e) =>
                          setFavorite(e.target.checked)
                        }
                        className="w-5 h-5 accent-[#d4af37]"
                      />

                      <span className="text-gray-200">
                        ❤️ Coup de cœur Orphea
                      </span>

                    </label>

                    {/* ACTIONS */}
                    <div className="flex flex-col sm:flex-row gap-3 mt-8">

                      <button
                        onClick={enregistrerChanson}
                        disabled={enregistrementEnCours}
                        className="bg-[#d4af37] hover:bg-[#f0d36b] disabled:bg-[#555] text-black font-bold px-7 py-4 rounded-xl transition"
                      >
                        {enregistrementEnCours
                          ? "Enregistrement..."
                          : "💾 Enregistrer"}
                      </button>

                      <button
                        onClick={fermerFormulaire}
                        className="bg-[#222] hover:bg-[#333] border border-[#555] text-white font-bold px-7 py-4 rounded-xl transition"
                      >
                        Annuler
                      </button>

                    </div>

                  </section>
                )}

                {/* RECHERCHE CATALOGUE */}
                <div className="mb-6">

                  <input
                    type="text"
                    value={rechercheCatalogue}
                    onChange={(e) =>
                      setRechercheCatalogue(e.target.value)
                    }
                    placeholder="🔎 Rechercher une chanson ou un artiste..."
                    className="w-full bg-[#111111] border border-[#555] focus:border-[#d4af37] rounded-xl p-4 text-white placeholder-gray-500 outline-none"
                  />

                </div>

                {/* LISTE CATALOGUE */}
                <div className="space-y-3">

                  {chansonsFiltrees.map((chanson) => (
                    <article
                      key={chanson.id}
                      className="bg-[#111111] border border-[#333] rounded-xl p-4 md:p-5"
                    >

                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

                        <div>

                          <h3 className="text-xl font-bold text-[#f0d36b]">
                            {chanson.title}
                          </h3>

                          <p className="text-gray-300 mt-1">
                            {chanson.artist}
                          </p>

                          <div className="flex flex-wrap gap-2 mt-3">

                            {chanson.year && (
                              <span className="bg-[#222] border border-[#444] px-3 py-1 rounded-full text-xs text-gray-300">
                                {chanson.year}
                              </span>
                            )}

                            {chanson.langue && (
                              <span className="bg-[#222] border border-[#444] px-3 py-1 rounded-full text-xs text-gray-300">
                                {chanson.langue}
                              </span>
                            )}

                            {chanson.favorite && (
                              <span className="bg-[#3b1115] border border-[#8f1d24] px-3 py-1 rounded-full text-xs text-[#f0d36b]">
                                ❤️ Coup de cœur
                              </span>
                            )}

                            {chanson.video_url && (
  <button
    onClick={() => window.open(chanson.video_url!, "_blank")}
    className="bg-[#102414] border border-green-700 px-3 py-1 rounded-full text-xs text-green-400 hover:bg-green-900/50 transition"
  >
    ▶️ Lancer la vidéo
  </button>
)}

                            {chanson.karaoke_url && (
                              <span className="bg-[#222] border border-[#555] px-3 py-1 rounded-full text-xs text-gray-400">
                                🔗 Karaoké
                              </span>
                            )}

                          </div>

                        </div>
{chanson.video_url && (
  <button
   onClick={() => {
  void enregistrerRepetition(chanson);
  window.open(chanson.video_url!, "_blank");
}}
    className="bg-green-900/40 hover:bg-green-800/60 border border-green-500 text-green-400 rounded-lg px-4 py-2 font-semibold"
  >
    ▶️ Vidéo
  </button>
)}
<button
  onClick={() => modifierChanson(chanson)}
  className="bg-[#222] hover:bg-[#333] border border-[#555] hover:border-[#d4af37] text-white font-bold px-5 py-3 rounded-xl transition"
>
  ✏️ Modifier
</button>
<button
  onClick={() => supprimerChanson(chanson)}
  className="bg-red-900/40 hover:bg-red-800/60 border border-red-500 text-red-400 font-bold px-5 py-3 rounded-xl transition"
>
  🗑️ Supprimer
</button>
<button
  onClick={() => basculerActif(chanson)}
  className={`border rounded-lg px-4 py-2 font-semibold ${
    chanson.actif
      ? "bg-green-900/40 border-green-500 text-green-400"
      : "bg-red-900/40 border-red-500 text-red-400"
  }`}
>
  {chanson.actif ? "🟢 Désactiver" : "⚪ Réactiver"}
</button>
                      </div>

                    </article>
                  ))}

                </div>

                {chansonsFiltrees.length === 0 && (
                  <div className="text-center bg-[#111111] border border-[#333] rounded-xl p-8 text-gray-500">
                    Aucune chanson trouvée.
                  </div>
                )}

              </section>

            </>
          )}

          {/* FOOTER */}
          <footer className="text-center mt-14 pb-6">

            <div className="flex justify-center items-center gap-4 mb-4">

              <span className="h-px w-16 bg-[#c9a227]" />

              <span className="text-[#d4af37] text-xl">
                ♪
              </span>

              <span className="h-px w-16 bg-[#c9a227]" />

            </div>

            <p className="text-gray-500 text-sm">
              Orphea Live — Console de régie
            </p>

          </footer>

        </div>
      </div>
    </main>
  );
}
