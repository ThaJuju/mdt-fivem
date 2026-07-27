import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/session-constants";

const PUBLIC_PATHS = ["/connexion"];

/**
 * Contrôle optimiste (présence du cookie uniquement) : redirige vite les
 * visiteurs sans session. La validité réelle de la session et les
 * permissions sont vérifiées côté serveur par `getActor()`/`assertCan()`,
 * seule source de vérité — le middleware ne fait qu'économiser un aller-retour
 * base de données pour le cas évident.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname === path);

  if (!hasSession && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    url.searchParams.set("depuis", pathname);
    return NextResponse.redirect(url);
  }

  if (hasSession && isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
