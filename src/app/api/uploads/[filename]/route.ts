import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getActor } from "@/lib/auth";
import { UPLOAD_DIR, isSafeUploadName, mimeForExtension } from "@/lib/uploads";

/**
 * Sert les images envoyées par les agents.
 *
 * Les fichiers vivent hors de `public/` : ils ne sont donc jamais servis
 * comme des ressources statiques, et chaque lecture passe par ce contrôle de
 * session. Le nom demandé est validé contre un motif strict avant toute
 * lecture disque, ce qui interdit la traversée de chemin.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ filename: string }> }) {
  const actor = await getActor();
  if (!actor) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  const { filename } = await params;
  if (!isSafeUploadName(filename)) {
    return NextResponse.json({ error: "Nom de fichier invalide." }, { status: 400 });
  }

  try {
    const bytes = await readFile(path.join(UPLOAD_DIR, filename));
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": mimeForExtension(filename),
        // Le nom est aléatoire et le contenu immuable : on peut cacher long,
        // mais en privé — ces images ne doivent pas finir dans un cache partagé.
        "Cache-Control": "private, max-age=31536000, immutable",
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Image introuvable." }, { status: 404 });
  }
}
