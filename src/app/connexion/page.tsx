import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getActor } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Connexion — MDT",
};

export default async function ConnexionPage() {
  const actor = await getActor();
  if (actor) {
    redirect(actor.mustChangePassword ? "/changer-mot-de-passe" : "/");
  }

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-8">
        <div className="mb-8 flex flex-col items-center gap-1 text-center">
          <span className="font-mono text-xs tracking-[0.3em] text-muted-foreground uppercase">
            Los Santos
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">MDT</h1>
          <p className="text-sm text-muted-foreground">Connectez-vous avec votre identifiant.</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
