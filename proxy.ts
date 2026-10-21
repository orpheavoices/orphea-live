
import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // La page et l'API de connexion doivent rester accessibles.
  if (
    pathname === "/regie/connexion" ||
    pathname === "/api/regie-login"
  ) {
    return NextResponse.next();
  }

  const pagesProtegees =
    pathname === "/regie" ||
    pathname.startsWith("/regie/") ||
    pathname === "/api/enregistrer-interpretation";

  if (!pagesProtegees) {
    return NextResponse.next();
  }

  const session = request.cookies.get("regie_session")?.value;
  const secret = process.env.REGIE_SESSION_SECRET;

  if (!session || !secret) {
    return refuser(request);
  }

  const [expiration, signature] = session.split(".");
  const expirationNombre = Number(expiration);

  if (
    !expiration ||
    !signature ||
    !Number.isFinite(expirationNombre) ||
    expirationNombre <= Date.now()
  ) {
    return refuser(request);
  }

  const signatureAttendue = createHmac("sha256", secret)
    .update(expiration)
    .digest();

  const signatureRecue = Buffer.from(signature, "hex");

  if (
    signatureRecue.length !== signatureAttendue.length ||
    !timingSafeEqual(signatureRecue, signatureAttendue)
  ) {
    return refuser(request);
  }

  return NextResponse.next();
}

function refuser(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Accès non autorisé." },
      { status: 401 }
    );
  }

  return NextResponse.redirect(
    new URL("/regie/connexion", request.url)
  );
}

export const config = {
  matcher: ["/regie/:path*", "/api/enregistrer-interpretation"],
};
