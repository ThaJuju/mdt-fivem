import type { Metadata } from "next";
import { requireActor } from "@/lib/auth";
import { logout } from "@/app/actions";
import { ChangePasswordForm } from "./change-password-form";

export const metadata: Metadata = {
  title: "Changer le mot de passe — MDT",
};

export default async function ChangerMotDePassePage() {
  const actor = await requireActor();

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-8">
        <div className="mb-8 flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Nouveau mot de passe</h1>
          <p className="text-sm text-muted-foreground">
            {actor.mustChangePassword
              ? "Votre mot de passe doit être changé avant de continuer."
              : "Choisissez un nouveau mot de passe pour votre compte."}
          </p>
        </div>
        <ChangePasswordForm />
        <form action={logout} className="mt-6 border-t border-border pt-4">
          <button type="submit" className="text-sm text-muted-foreground hover:text-foreground">
            Se déconnecter
          </button>
        </form>
      </div>
    </div>
  );
}
