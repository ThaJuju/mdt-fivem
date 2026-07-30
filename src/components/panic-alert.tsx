"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { io, type Socket } from "socket.io-client";
import { AlertTriangle, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";

const PANIC_CHANNEL = "dispatch:panic";
const SOUND_PREFERENCE_KEY = "mdt:10-99-son";

export type PanicUnit = {
  unitId: string;
  callsign: string;
  officers: string[];
  callNumber: number | null;
  callCode: string | null;
  callLocation: string | null;
};

/**
 * Bandeau 10-99, monté par le gabarit de l'application donc présent sur tous
 * les modules.
 *
 * C'est le signal le plus urgent du MDT, et c'était le seul qui n'arrivait
 * pas à destination : le statut d'unité ne s'affichait que pour sa propre
 * unité, et l'abonnement temps réel vivait dans le seul tableau de dispatch.
 * Un agent en train de rédiger un rapport n'apprenait rien.
 *
 * Volontairement non masquable : tant qu'un collègue est en danger, le bandeau
 * reste. Seul le son se coupe.
 */
export function PanicAlert({ panics }: { panics: PanicUnit[] }) {
  const router = useRouter();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const knownUnits = useRef<string[]>(panics.map((panic) => panic.unitId));

  useEffect(() => {
    try {
      setSoundEnabled(window.localStorage.getItem(SOUND_PREFERENCE_KEY) !== "off");
    } catch {
      /* stockage indisponible : le son reste actif */
    }
  }, []);

  // Le socket ne transporte que l'identifiant de l'unité : c'est le rendu
  // serveur qui fournit les détails, donc les permissions restent la seule
  // source de vérité sur ce que cet agent a le droit de voir.
  useEffect(() => {
    /**
     * `forceNew` n'est pas décoratif : sans lui, socket.io-client rend la même
     * instance à deux appels `io()` de mêmes options, et quitter le tableau de
     * dispatch — qui appelle `socket.disconnect()` en se démontant — fermerait
     * aussi le canal d'alerte de ce bandeau, silencieusement. Une connexion
     * dédiée coûte moins cher qu'un 10-99 qui n'arrive pas.
     */
    const socket: Socket = io({ path: "/api/socket", forceNew: true });
    socket.on(PANIC_CHANNEL, () => router.refresh());
    return () => {
      socket.disconnect();
    };
  }, [router]);

  // Un 10-99 qui apparaît pendant qu'on regarde ailleurs doit s'entendre.
  useEffect(() => {
    const previous = knownUnits.current;
    const isNew = panics.some((panic) => !previous.includes(panic.unitId));
    knownUnits.current = panics.map((panic) => panic.unitId);
    if (isNew && soundEnabled) playAlertTone();
  }, [panics, soundEnabled]);

  if (panics.length === 0) return null;

  function toggleSound() {
    setSoundEnabled((enabled) => {
      const next = !enabled;
      try {
        window.localStorage.setItem(SOUND_PREFERENCE_KEY, next ? "on" : "off");
      } catch {
        /* préférence non mémorisée : sans gravité */
      }
      return next;
    });
  }

  return (
    <div role="alert" aria-live="assertive" className="flex flex-col">
      {panics.map((panic) => (
        <div
          key={panic.unitId}
          className="flex items-start gap-3 border-b border-alert bg-alert/15 px-4 py-3"
        >
          <AlertTriangle className="mt-0.5 size-5 shrink-0 animate-pulse text-alert" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded border border-alert bg-alert/20 px-1.5 py-0.5 font-mono text-xs font-semibold tracking-[0.12em] text-alert">
                10-99
              </span>
              <span className="font-mono text-sm font-semibold text-alert">{panic.callsign}</span>
              {panic.officers.length > 0 ? (
                <span className="text-sm text-foreground">{panic.officers.join(", ")}</span>
              ) : (
                <span className="text-sm text-muted-foreground">Unité sans agent déclaré</span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {panic.callNumber
                ? `Dernier appel #${panic.callNumber}${panic.callCode ? ` (${panic.callCode})` : ""}${
                    panic.callLocation ? ` — ${panic.callLocation}` : ""
                  }`
                : "Aucun appel en cours pour cette unité."}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-7"
              onClick={toggleSound}
              title={soundEnabled ? "Couper le son des alertes" : "Rétablir le son des alertes"}
            >
              {soundEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
            </Button>
            <Button asChild size="sm" variant="outline" className="border-alert text-alert">
              <Link href="/dispatch">Ouvrir le dispatch</Link>
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Deux notes courtes, synthétisées : pas de fichier à servir, et rien à
 * précharger. Les navigateurs refusent de jouer un son avant toute
 * interaction de l'utilisateur (`Autoplay policy`) — l'appel échoue alors
 * silencieusement, le bandeau visuel reste le signal de repli.
 */
function playAlertTone(): void {
  try {
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const context = new AudioCtx();
    const now = context.currentTime;

    for (const [index, frequency] of [880, 660].entries()) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "square";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, now + index * 0.25);
      gain.gain.exponentialRampToValueAtTime(0.12, now + index * 0.25 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.25 + 0.2);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(now + index * 0.25);
      oscillator.stop(now + index * 0.25 + 0.22);
    }

    window.setTimeout(() => void context.close(), 1000);
  } catch {
    /* audio indisponible : le bandeau suffit */
  }
}
