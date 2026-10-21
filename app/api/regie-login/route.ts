import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

export async function POST(request: Request) {
  const { password } = await request.json().catch(() => ({}));
  const expectedPassword = process.env.REGIE_PASSWORD;
  const secret = process.env.REGIE_SESSION_SECRET;

  if (!expectedPassword || !secret) {
    return NextResponse.json(
      { error: "Configuration serveur manquante." },
      { status: 500 }
    );
  }

  if (typeof password !== "string" || password !== expectedPassword) {
    return NextResponse.json(
      { error: "Mot de passe incorrect." },
      { status: 401 }
    );
  }

  const expires = Date.now() + 8 * 60 * 60 * 1000;
  const payload = String(expires);
  const signature = createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  const cookieStore = await cookies();
  cookieStore.set("regie_session", `${payload}.${signature}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: new Date(expires),
  });

  return NextResponse.json({ ok: true });
}