import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { permissionLabel } from "@/lib/permissions";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Accès refusé — MDT" };

export default async function AccesRefusePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const permission = typeof params.p === "string" ? params.p : undefined;

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex max-w-md flex-col items-center gap-3 text-center">
        <ShieldAlert className="size-8 text-muted-foreground" />
        <h1 className="text-xl font-semibold tracking-tight">Accès refusé</h1>
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
        <Button asChild variant="outline" className="mt-1">
          <Link href="/">Retour au tableau de bord</Link>
        </Button>
      </div>
    </div>
  );
}
