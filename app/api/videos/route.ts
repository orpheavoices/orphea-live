import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const dossier = path.join(process.cwd(), "public", "karaoke");

    const fichiers = fs
      .readdirSync(dossier)
      .filter((fichier) => /\.(mp4|webm|mov|m4v)$/i.test(fichier))
      .sort((a, b) => a.localeCompare(b));

    return NextResponse.json({ fichiers });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Impossible de lire le dossier des vidéos." },
      { status: 500 }
    );
  }
}