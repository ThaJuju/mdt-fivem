import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/session-constants";

const PUBLIC_PATHS = ["/connexion"];

/**
 * Contrôle optimiste (présence du cookie uniquement) : redirige vite les
 * visiteurs sans cookie. La validité réelle de la session et les permissions
 * sont vérifiées côté serveur par `getActor()`/`assertCan()`, seule source de
 * vérité — le middleware ne fait qu'économiser un aller-retour base de
 * données pour le cas évident.
 *
 * Le middleware ne redirige JAMAIS *depuis* /connexion. Il ne peut pas
 * valider la session (runtime Edge, pas de Prisma) : s'il renvoyait vers /
 * sur simple présence du cookie, un cookie périmé provoquerait une boucle
 * infinie — le middleware renvoyant vers /, et `getActor()` renvoyant vers
 * /connexion faute de session en base. C'est la page /connexion elle-même
 * qui redirige un visiteur réellement authentifié, en interrogeant la base.
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

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
