"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { io, type Socket } from "socket.io-client";

const DISPATCH_CHANNEL = "dispatch:update";

/**
 * Se connecte au canal temps réel et rafraîchit le rendu serveur dès qu'un
 * autre poste modifie le dispatch. Le socket ne transporte aucune donnée :
 * il déclenche un `router.refresh()`, donc les permissions restent
 * appliquées côté serveur.
 *
 * Retourne l'état de la connexion, affiché dans le bandeau pour que le
 * dispatcheur sache s'il regarde des données synchronisées ou figées.
 */
export function useDispatchSync(): { connected: boolean } {
  const router = useRouter();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket: Socket = io({ path: "/api/socket" });

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", () => setConnected(false));
    socket.on(DISPATCH_CHANNEL, () => router.refresh());

    return () => {
      socket.disconnect();
    };
  }, [router]);

  return { connected };
}
