import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Monitor, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  revokeOtherUserSessions,
  revokeSession,
} from "@/app/(app)/mon-compte/session-actions";

export type SessionRow = {
  id: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
};

function deviceLabel(userAgent: string | null): { label: string; mobile: boolean } {
  if (!userAgent) return { label: "Appareil inconnu", mobile: false };
  const mobile = /Mobile|Android|iPhone|iPad/i.test(userAgent);
  const browser = /Firefox\//.test(userAgent)
    ? "Firefox"
    : /Edg\//.test(userAgent)
      ? "Edge"
      : /Chrome\//.test(userAgent)
        ? "Chrome"
        : /Safari\//.test(userAgent)
          ? "Safari"
          : "Navigateur";
  const os = /Windows/i.test(userAgent)
    ? "Windows"
    : /Android/i.test(userAgent)
      ? "Android"
      : /iPhone|iPad/i.test(userAgent)
        ? "iOS"
        : /Mac OS/i.test(userAgent)
          ? "macOS"
          : /Linux/i.test(userAgent)
            ? "Linux"
            : "appareil inconnu";
  return { label: `${browser} sur ${os}`, mobile };
}

export function SessionsSection({
  userId,
  sessions,
  currentSessionId,
  admin = false,
}: {
  userId: string;
  sessions: SessionRow[];
  currentSessionId: string | null;
  admin?: boolean;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-medium">Sessions ouvertes</h2>
          <p className="text-sm text-muted-foreground">
            Dernière activité rafraîchie au maximum une fois par heure.
          </p>
        </div>
        {sessions.length > (admin ? 0 : 1) ? (
          <form action={revokeOtherUserSessions}>
            <input type="hidden" name="userId" value={userId} />
            <Button type="submit" variant="outline" size="sm">
              {admin ? "Fermer toutes les sessions" : "Fermer toutes les autres"}
            </Button>
          </form>
        ) : null}
      </div>

      {sessions.length === 0 ? (
        <p className="rounded-md border border-dashed p-5 text-sm text-muted-foreground">
          Aucune session ouverte.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {sessions.map((session) => {
            const device = deviceLabel(session.userAgent);
            const isCurrent = session.id === currentSessionId;
            const Icon = device.mobile ? Smartphone : Monitor;
            return (
              <div key={session.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
                <div className="flex items-start gap-3">
                  <Icon className="mt-0.5 size-4 text-muted-foreground" />
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{device.label}</span>
                      {isCurrent ? <Badge variant="secondary">Session actuelle</Badge> : null}
                    </div>
                    <span className="font-mono text-xs text-muted-foreground">
                      IP {session.ip ?? "inconnue"} · créée le{" "}
                      {format(session.createdAt, "dd/MM/yyyy HH:mm", { locale: fr })}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Activité : {format(session.lastSeenAt, "dd/MM/yyyy HH:mm", { locale: fr })} · expire le{" "}
                      {format(session.expiresAt, "dd/MM/yyyy HH:mm", { locale: fr })}
                    </span>
                  </div>
                </div>
                <form action={revokeSession}>
                  <input type="hidden" name="sessionId" value={session.id} />
                  <Button type="submit" variant="ghost" size="sm">Fermer cette session</Button>
                </form>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
