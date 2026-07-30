import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { isValidPermission, permissionLabel } from "@/lib/permissions";
import { accessDeniedMessage } from "@/lib/access-denied";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Accès refusé — MDT" };

export default async function AccesRefusePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const reason = accessDeniedMessage(typeof params.motif === "string" ? params.motif : undefined);
  /**
   * On ne nomme une permission que si le catalogue la connaît. Le paramètre
   * vient de l'URL : sans ce filtre, la page affichait telle quelle la chaîne
   * reçue — c'est ce qui mettait « __department.report » sous les yeux de
   * l'agent, et cela laissait afficher n'importe quel texte tiers.
   */
  const rawPermission = typeof params.p === "string" ? params.p : undefined;
  const permission = rawPermission && isValidPermission(rawPermission) ? rawPermission : undefined;

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex max-w-md flex-col items-center gap-3 text-center">
        <ShieldAlert className="size-8 text-muted-foreground" />
        <h1 className="text-xl font-semibold tracking-tight">Accès refusé</h1>
        {reason ? (
          // Un refus de cloisonnement ne se corrige pas en réclamant un droit :
          // le conseil « demandez à un supérieur » n'a rien à faire ici.
          <p className="text-muted-foreground">{reason}</p>
        ) : (
          <p className="text-muted-foreground">
            Votre grade ne vous donne pas accès à cette page.
            {permission ? (
              <>
                {" "}
                Elle demande la permission{" "}
                <span className="text-foreground">{permissionLabel(permission)}</span>.
              </>
            ) : null}{" "}
            Demandez à un supérieur de vous l&apos;attribuer si vous en avez besoin.
          </p>
        )}
        <Button asChild variant="outline" className="mt-1">
          <Link href="/">Retour au tableau de bord</Link>
        </Button>
      </div>
    </div>
  );
}
