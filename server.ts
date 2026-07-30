/**
 * Serveur HTTP maison : Next.js + Socket.io sur le même port.
 *
 * App Router ne peut pas héberger un serveur WebSocket, d'où ce point
 * d'entrée. L'instance `io` est déposée sur `globalThis` pour que les server
 * actions (qui tournent dans ce même processus) puissent diffuser un signal
 * de rafraîchissement — voir `src/lib/realtime.ts`.
 */
import { createServer } from "node:http";
import { parse } from "node:url";
import { createHash } from "node:crypto";
import next from "next";
import { Server as SocketServer } from "socket.io";
import { PrismaClient } from "@prisma/client";
import { runMaintenance } from "./src/lib/maintenance";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT ?? 3000);
const hostname = process.env.HOSTNAME ?? "0.0.0.0";

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();
const prisma = new PrismaClient();

const SESSION_COOKIE_NAME = "mdt_session";

/**
 * Ménage : sessions périmées et images qu'aucune fiche ne référence plus.
 * Toutes les six heures plutôt qu'à chaque requête — c'est un balayage de
 * tables entières, il n'a rien à faire dans le rendu d'une page.
 */
const MAINTENANCE_INTERVAL_MS = 6 * 60 * 60 * 1000;

async function maintenanceTick() {
  try {
    const report = await runMaintenance(prisma);
    const total =
      report.expiredSessions +
      report.orphanUploads +
      report.expiredDocuments +
      report.oldLoginAttempts +
      report.autoClosedShifts;
    if (total > 0) {
      console.log(
        `> ménage : ${report.expiredSessions} session(s) périmée(s), ` +
          `${report.orphanUploads} image(s) orpheline(s) supprimée(s), ` +
          `${report.expiredDocuments} document(s) expiré(s), ` +
          `${report.oldLoginAttempts} tentative(s) de connexion oubliée(s), ` +
          `${report.autoClosedShifts} vacation(s) fermée(s) automatiquement`,
      );
    }
  } catch (error) {
    // Le ménage ne doit jamais faire tomber le serveur : au pire il attend
    // le prochain passage.
    console.error("> échec du ménage périodique :", error);
  }
}

function readCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res, parse(req.url ?? "/", true));
  });

  const io = new SocketServer(httpServer, {
    path: "/api/socket",
    serveClient: false,
  });

  // Seule une session valide peut ouvrir un canal. Les événements ne portent
  // aucune donnée métier, mais autant ne pas laisser le canal ouvert à tous.
  io.use(async (socket, nextFn) => {
    try {
      const token = readCookie(socket.handshake.headers.cookie, SESSION_COOKIE_NAME);
      if (!token) return nextFn(new Error("non authentifié"));

      const tokenHash = createHash("sha256").update(token).digest("hex");
      const session = await prisma.session.findUnique({
        where: { tokenHash },
        select: { expiresAt: true, user: { select: { isActive: true } } },
      });
      if (!session || session.expiresAt < new Date() || !session.user.isActive) {
        return nextFn(new Error("session invalide"));
      }
      return nextFn();
    } catch {
      return nextFn(new Error("erreur d'authentification"));
    }
  });

  const globalWithIo = globalThis as typeof globalThis & { __mdtIo?: SocketServer };
  globalWithIo.__mdtIo = io;

  httpServer.listen(port, hostname, () => {
    console.log(`> MDT prêt sur http://${hostname}:${port}`);

    void maintenanceTick();
    // `unref()` : ce minuteur ne doit pas à lui seul maintenir le processus en
    // vie au moment de l'arrêt.
    setInterval(() => void maintenanceTick(), MAINTENANCE_INTERVAL_MS).unref();
  });
});
