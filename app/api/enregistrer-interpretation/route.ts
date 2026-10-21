
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Configuration serveur manquante." },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { songId, launchId, demandeId, contexte } = body;

    if (
      !Number.isSafeInteger(songId) ||
      typeof launchId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(launchId) ||
      !["repetition", "public"].includes(contexte)
    ) {
      return NextResponse.json(
        { error: "Informations invalides." },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data, error } = await supabase.rpc(
      "enregistrer_interpretation",
      {
        p_song_id: songId,
        p_launch_id: launchId,
        p_demande_id: demandeId ?? null,
        p_contexte: contexte,
      }
    );

    if (error) {
      console.error("Erreur d'enregistrement d'interprétation :", error.message);
      return NextResponse.json(
        { error: "Impossible d'enregistrer l'interprétation." },
        { status: 500 }
      );
    }

    return NextResponse.json({ enregistre: data === true });
  } catch {
    return NextResponse.json(
      { error: "Requête invalide." },
      { status: 400 }
    );
  }
}
